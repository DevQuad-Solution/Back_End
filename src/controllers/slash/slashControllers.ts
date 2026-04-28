import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { modifyUserResponse } from '../../utils/modifyResponse';
import Joi from 'joi';
import validationSchema from '../../utils/validationSchema';
import { Schema } from 'mongoose';
import { Account, AppRole, IAccount } from '../../models/account';
import { Slash, SlashStatus } from '../../models/slash';
import { IProduct, Product } from '../../models/product';
import qrService from '../../utils/qrService';
import { toBase64, base64ToString } from '../../utils/encryption';
import { addNotification } from '../../utils/notificationService';

const generateClaimCode = (slashId: string, userId: string) => {
  const slashPart = slashId.toString().slice(-4).toUpperCase();
  const userPart = userId.toString().slice(-4).toUpperCase();
  const suffix = Math.floor(10 + Math.random() * 90);
  return `SL${slashPart}-${userPart}-${suffix}`;
};

const rawAmt = process.env.AMT_PER_TRX ?? '100';
const AMT_PER_TRX = Number(rawAmt.trim().replace(/[^0-9.-]/g, ''));
if (Number.isNaN(AMT_PER_TRX)) {
  throw new Error('Invalid AMT_PER_TRX env variable');
}

export const createSlash = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id!;
    const { productId, timeLimit, hubId } = req.body;
    const { error } = Joi.object({
      productId: validationSchema.objectId,
      timeLimit: validationSchema.strings,
      hubId: validationSchema.objectId,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!req.user?.emailVerified)
      return resSender(res, 400, 'fail', 'Please verify your account to proceed!');

    // Calculate & deduct price of one slot for the slash
    const product = await Product.findById(productId);
    if (!product) return resSender(res, 404, 'fail', 'Product not found!');
    let price = product.pricePerSlot + AMT_PER_TRX;
    console.log('SLot price: ', price);

    // Check balance and deduct atomically
    const user = await Account.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: price } },
      { $inc: { walletBalance: -price, joined: 1, totalSPend: price } },
      { returnDocument: 'after' },
    );
    if (!user) return resSender(res, 400, 'fail', 'Insufficient wallet balance!');

    let newSlash = new Slash({
      product: productId,
      timeLimit,
      hub: hubId,
      status: SlashStatus.OPEN,
      joined: [
        {
          user: userId,
          claimed: false,
          qrCode: '',
          claimCode: '',
        },
      ],
      createdBy: userId,
    });
    await newSlash.save();

    const claimCode = generateClaimCode(newSlash._id.toString(), userId.toString());
    const qrCode = await qrService.generateQR(toBase64(`${userId}:${newSlash._id}`));
    console.log('QR: ', qrCode);

    const updatedSlash = await Slash.findByIdAndUpdate(
      newSlash._id,
      {
        $set: {
          'joined.$[elem].qrCode': qrCode,
          'joined.$[elem].claimCode': claimCode,
        },
      },
      {
        arrayFilters: [{ 'elem.user': userId }],
        returnDocument: 'after',
      },
    ).populate([
      { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity emoji' },
      { path: 'hub', select: 'name city state address' },
    ]);

    await addNotification(
      'Joined Slash',
      `Joined Slash ${updatedSlash?._id.toString().substring(20)} - ${(updatedSlash?.product as any).name}`,
      [userId],
    );

    return resSender(res, 200, 'success', 'Slash created successfully!', null, updatedSlash);
  } catch (error: any) {
    return errorHandler(error, res, 'Error creating slash!');
  }
};

export const fetchSlashes = async (req: Request, res: Response) => {
  try {
    let { category = 'all', page = 1, limit = 20 } = req.query;
    const { error } = Joi.object({
      category: validationSchema.strings.optional(), //.valid()
      page: validationSchema.number,
      limit: validationSchema.number,
    }).validate(req.query);
    if (error) return resSender(res, 400, 'fail', error?.details[0].message);

    page = Number(page) || 1;
    limit = Number(limit) || 20;

    let query: any = { status: SlashStatus.OPEN };
    if (category !== 'all') {
      query['product.category'] = category;
    }
    const populateQuery = [
      { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity emoji' },
      { path: 'hub', select: 'name city state address' },
      // { path: 'createdBy', select: 'name' },
    ];
    const slashes = await Slash.find(query)
      .populate(populateQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Slash.countDocuments(query);

    return resSender(res, 200, 'success', 'Fetched!', null, {
      slashes,
      page,
      total: total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching slashes');
  }
};

export const fetchSlash = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const populateQuery = [
      { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity emoji' },
      { path: 'hub', select: 'name city state address' },
      { path: 'createdBy', select: 'name' },
    ];
    const slash = await Slash.findById(id).populate(populateQuery);

    return resSender(res, 200, 'success', 'Fetched slash!', null, slash);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching slash details');
  }
};

export const searchSlash = async (req: Request, res: Response) => {
  try {
    let {
      query,
      category = 'all',
      page,
      limit,
    } = req.query as unknown as {
      query: string;
      category: string;
      page: number;
      limit: number;
    };

    const { error } = Joi.object({
      query: validationSchema.strings.required(), // Make query required for search
      category: validationSchema.strings.optional(),
      page: validationSchema.number,
      limit: validationSchema.number,
    }).validate(req.query);

    if (error) return resSender(res, 400, 'fail', error?.details[0].message);

    page = Number(page) || 1;
    limit = Number(limit) || 20;

    // Build match conditions
    const matchConditions: any = {
      status: SlashStatus.OPEN,
    };

    // Only add search conditions if query exists
    if (query && query.trim()) {
      matchConditions.$or = [
        { 'product.name': { $regex: query, $options: 'i' } },
        { 'hub.name': { $regex: query, $options: 'i' } },
        { 'hub.city': { $regex: query, $options: 'i' } },
      ];
    }

    if (category !== 'all') {
      matchConditions['product.category'] = category;
    }

    const aggregation = [
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $lookup: {
          from: 'hubs',
          localField: 'hub',
          foreignField: '_id',
          as: 'hub',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$hub', preserveNullAndEmptyArrays: false } },
      { $match: matchConditions },
      {
        $project: {
          product: {
            name: 1,
            pricePerSlot: 1,
            totalValue: 1,
            category: 1,
            noOfSlots: 1,
            quantity: 1,
            emoji: 1,
          },
          hub: {
            name: 1,
            city: 1,
            state: 1,
            address: 1,
          },
          timeLimit: 1,
          status: 1,
          joined: 1,
          createdBy: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'totalCount' }],
          slashes: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        },
      },
    ];

    const result = await Slash.aggregate(aggregation as any);
    const total = result[0]?.metadata[0]?.totalCount || 0;
    const slashes = result[0]?.slashes || [];

    if (slashes.length === 0) {
      return resSender(res, 200, 'success', 'No slashes found', null, {
        slashes: [],
        page,
        total: 0,
        totalPages: 0,
      });
    }

    return resSender(res, 200, 'success', 'Fetched!', null, {
      slashes,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error searching!');
  }
};

export const joinSlash = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id!;
    const { id } = req.params;
    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const slash = await Slash.findById(id).populate('product');
    if (!slash) return resSender(res, 404, 'fail', 'Slash not found!');

    if (slash.joined.some((j) => j.user.toString() === userId.toString())) {
      return resSender(res, 400, 'fail', 'You have already joined this slash!');
    }

    const product = await Product.findById(slash.product);
    if (!product) return resSender(res, 404, 'fail', 'Product not found!');

    const price = product.pricePerSlot + AMT_PER_TRX;
    const user = await Account.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: price } },
      { $inc: { walletBalance: -price, joined: 1, totalSPend: price } },
      { returnDocument: 'after' },
    );
    if (!user) return resSender(res, 400, 'fail', 'Insufficient wallet balance!');

    const claimCode = generateClaimCode(id as string, userId.toString());
    const qrCode = await qrService.generateQR(toBase64(`${userId}:${id}`));
    console.log('QR: ', qrCode);

    const updatedSlash = await Slash.findByIdAndUpdate(
      id,
      {
        $push: { joined: { user: userId, qrCode, claimCode, claimed: false } },
      },
      { returnDocument: 'after' },
    );

    return resSender(res, 200, 'success', 'Slash joined!', null, updatedSlash);
  } catch (error: any) {
    return errorHandler(error, res, 'Error joining slash');
  }
};

export const editSlash = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id!;
    const { id } = req.params;
    const { timeLimit } = req.body;

    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    // Check if user is the creator
    const slash = await Slash.findById(id);
    if (!slash) return resSender(res, 404, 'fail', 'Slash not found!');
    if (slash.createdBy.toString() !== userId.toString()) {
      return resSender(res, 403, 'fail', 'You can only edit your own slash!');
    }

    // Update only editable fields
    const updatedSlash = await Slash.findByIdAndUpdate(
      id,
      { timeLimit },
      { returnDocument: 'after' },
    ).populate([
      { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity emoji' },
      { path: 'hub', select: 'name city state address' },
    ]);

    return resSender(res, 200, 'success', 'Slash updated successfully!', null, updatedSlash);
  } catch (error: any) {
    return errorHandler(error, res, 'Error editing slash');
  }
};

export const leaveSlash = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id!;
    const { id } = req.params;

    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    // Check if slash exist and user has joined before
    const slash = await Slash.findById(id).populate('product');
    if (!slash) return resSender(res, 404, 'fail', 'Slash not found!');

    const userSlash = slash.joined.find((j) => j.user.toString() === userId.toString());
    if (!userSlash) return resSender(res, 404, 'fail', 'You have not joined this slash!');

    const product = slash.product as unknown as IProduct;
    if (!product) return resSender(res, 404, 'fail', 'Product not found!');

    const price = product.pricePerSlot;
    const user = await Account.findOneAndUpdate(
      { _id: userId },
      { $inc: { walletBalance: price, joined: -1, totalSPend: -price } },
      { returnDocument: 'after' },
    );
    if (!user) return resSender(res, 400, 'fail', 'User not found!');

    const updatedSlash = await Slash.findByIdAndUpdate(
      id,
      {
        $pull: { joined: userSlash },
      },
      { returnDocument: 'after' },
    );

    return resSender(res, 200, 'success', 'Slash left successfully!', null, updatedSlash);
  } catch (error: any) {
    return errorHandler(error, res, 'Error leaving slash');
  }
};

export const deleteSlash = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id!;
    const { id } = req.params;

    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    // Check if user is the creator
    const slash = await Slash.findById(id);
    if (!slash) return resSender(res, 404, 'fail', 'Slash not found!');
    if (slash.createdBy.toString() !== userId.toString()) {
      return resSender(res, 403, 'fail', 'You can only delete your own slash!');
    }

    // Optional: Check if slash is not started (no one has joined except creator)
    if (slash.joined.length > 1) {
      return resSender(res, 400, 'fail', 'Cannot delete a slash that has other members!');
    }

    await Slash.findByIdAndDelete(id);
    return resSender(res, 200, 'success', 'Slash deleted successfully!');
  } catch (error: any) {
    return errorHandler(error, res, 'Error deleting slash');
  }
};

export const getQrForSlash = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id!;
    const { id } = req.params;

    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    // Find the slash and get the QR code for the user
    const slash = await Slash.findById(id);
    if (!slash) return resSender(res, 404, 'fail', 'Slash not found!');

    // Find the user in the joined array
    const userSlash = slash.joined.find((j) => j.user.toString() === userId.toString());
    if (!userSlash) return resSender(res, 404, 'fail', 'You have not joined this slash!');

    return resSender(res, 200, 'success', 'QR retrieved!', null, {
      qrCode: userSlash.qrCode,
      claimCode: userSlash.claimCode,
      claimed: userSlash.claimed,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error getting QR for slash');
  }
};

export const verifyQr = async (req: Request, res: Response) => {
  try {
    const { qrCode, code } = req.body;
    const { error } = Joi.object({
      qrCode: validationSchema.strings.optional(),
      code: validationSchema.strings.optional(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!qrCode && !code) {
      return resSender(res, 400, 'fail', 'QR code or claim code is required!');
    }

    let slash;
    let matchedEntry;

    if (qrCode) {
      const verified = await qrService.verifyQR(qrCode);
      if (!verified) return resSender(res, 403, 'fail', 'Invalid QR data');

      const decodedQr = base64ToString(verified.data);
      const [userIdStr, slashId] = decodedQr.split(':');

      if (!userIdStr || !slashId) {
        return resSender(res, 400, 'fail', 'Invalid QR code format!');
      }

      slash = await Slash.findByIdAndUpdate(
        slashId,
        {
          $set: {
            'joined.$[elem].claimed': true,
          },
        },
        {
          arrayFilters: [{ 'elem.user': userIdStr }],
          returnDocument: 'after',
        },
      ).populate([
        {
          path: 'product',
          select: 'name pricePerSlot totalValue category noOfSlots quantity emoji',
        },
        { path: 'hub', select: 'name city state address' },
      ]);

      if (!slash) return resSender(res, 404, 'fail', 'Slash not found!');
      matchedEntry = slash.joined.find((j) => j.user.toString() === userIdStr);
    } else {
      const normalizedCode = (code as string).trim();

      slash = await Slash.findOneAndUpdate(
        { 'joined.claimCode': normalizedCode },
        {
          $set: {
            'joined.$[elem].claimed': true,
          },
        },
        {
          arrayFilters: [{ 'elem.claimCode': normalizedCode }],
          returnDocument: 'after',
        },
      ).populate([
        {
          path: 'product',
          select: 'name pricePerSlot totalValue category noOfSlots quantity emoji',
        },
        { path: 'hub', select: 'name city state address' },
      ]);

      if (!slash) return resSender(res, 404, 'fail', 'Invalid claim code or slash not found!');
      matchedEntry = slash.joined.find((j) => j.claimCode === normalizedCode);
    }

    if (!matchedEntry) {
      return resSender(res, 400, 'fail', 'No matching slash member found for this code!');
    }

    return resSender(res, 200, 'success', 'QR/code verified! Marked as claimed.', null, {
      slash,
      claimed: true,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error verifying QR');
  }
};
