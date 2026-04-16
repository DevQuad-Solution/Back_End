import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { modifyUserResponse } from '../../utils/modifyResponse';
import Joi from 'joi';
import validationSchema from '../../utils/validationSchema';
import { Schema } from 'mongoose';
import { Account, AppRole, IAccount } from '../../models/account';
import { Slash, SlashStatus } from '../../models/slash';
import { Product } from '../../models/product';
import qrService from '../../utils/qrService';
import { toBase64, base64ToString } from '../../utils/encryption';
import { addNotification } from '../../utils/notificationService';

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

    // Calculate & deduct price of one slot for the slash
    const product = await Product.findById(productId);
    if (!product) return resSender(res, 404, 'fail', 'Product not found!');
    let price = product.pricePerSlot;
    price = price + Number(process.env.AMT_PER_TRX!);

    // Check balance and deduct atomically
    const user = await Account.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: price } },
      { $inc: { walletBalance: -price } },
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
        },
      ],
      createdBy: userId,
    });
    await newSlash.save();

    // Generate QR code and update it in the database
    const qrCode = await qrService.generateQR(toBase64(`${userId}:${newSlash._id}`));
    console.log('QR: ', qrCode);

    const updatedSlash = await Slash.findByIdAndUpdate(
      newSlash._id,
      {
        $set: {
          'joined.$[elem].qrCode': qrCode,
        },
      },
      {
        arrayFilters: [{ 'elem.user': userId }],
        returnDocument: 'after',
      },
    ).populate([
      { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity image' },
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
      category: validationSchema.strings, //.valid()
      page: validationSchema.number,
      limit: validationSchema.number,
    }).validate(req.query);
    if (error) return resSender(res, 400, 'fail', error?.details[0].message);

    page = Number(page) || 1;
    limit = Number(limit) || 20;

    const query = { status: SlashStatus.OPEN, 'product.category': category };
    const populateQuery = [
      { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity image' },
      { path: 'hub', select: 'name city state address' },
      // { path: 'createdBy', select: 'name' },
    ];
    const slashes = await Slash.find(query)
      .populate(populateQuery)
      .sort({ createdAt: -1 })
      .skip(page - 1 * limit)
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
      { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity image' },
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
    let { query, category, page, limit } = req.query as unknown as {
      query: string;
      category: string;
      page: number;
      limit: number;
    };
    const { error } = Joi.object({
      query: validationSchema.strings,
      category: validationSchema.strings, //.valid()
      page: validationSchema.number,
      limit: validationSchema.number,
    }).validate(req.query);
    if (error) return resSender(res, 400, 'fail', error?.details[0].message);

    page = Number(page) || 1;
    limit = Number(limit) || 20;
    const slashQuery: any = {
      $or: [
        { product: { $regex: query, $options: 'i' } },
        { hub: { $regex: query, $options: 'i' } },
        { 'hub.city': { $regex: query, $options: 'i' } },
      ],
      'product.category': category,
    };
    const populateQuery = [
      { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity image' },
      { path: 'hub', select: 'name city state address' },
    ];

    const slashes = await Slash.find(slashQuery)
      .populate(populateQuery)
      .sort({ createdAt: -1 })
      .skip(page - 1 * limit)
      .limit(limit);
    const total = await Slash.countDocuments(slashQuery);

    return resSender(res, 200, 'success', 'Fetched!', null, {
      slashes,
      page,
      total: total,
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

    const price = product.pricePerSlot + Number(process.env.AMT_PER_TRX!);
    const user = await Account.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: price } },
      { $inc: { walletBalance: -price } },
      { returnDocument: 'after' },
    );
    if (!user) return resSender(res, 400, 'fail', 'Insufficient wallet balance!');

    const qrCode = await qrService.generateQR(toBase64(`${userId}:${id}`));
    console.log('QR: ', qrCode);

    const updatedSlash = await Slash.findByIdAndUpdate(
      id,
      {
        $push: { joined: { user: userId, qrCode, claimed: false } },
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
      { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity image' },
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

    const product = await Product.findById(slash.product);
    if (!product) return resSender(res, 404, 'fail', 'Product not found!');

    const price = product.pricePerSlot;
    const user = await Account.findOneAndUpdate(
      { _id: userId },
      { $inc: { walletBalance: price } },
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
      claimed: userSlash.claimed,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error getting QR for slash');
  }
};

export const verifyQr = async (req: Request, res: Response) => {
  try {
    const { qrCode } = req.body;
    const { error } = Joi.object({
      qrCode: validationSchema.strings,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!qrCode) return resSender(res, 400, 'fail', 'QR code is required!');

    // Decode the QR code to get userId and slashId
    const verified = qrService.verifyQR(qrCode);
    if (!verified) return resSender(res, 403, 'fail', 'Invalid Qr data');
    const decodedQr = base64ToString(qrCode);
    const [userIdStr, slashId] = decodedQr.split(':');

    if (!userIdStr || !slashId) {
      return resSender(res, 400, 'fail', 'Invalid QR code format!');
    }

    // Find the slash and verify/mark the user as claimed
    const slash = await Slash.findByIdAndUpdate(
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
      { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity image' },
      { path: 'hub', select: 'name city state address' },
    ]);

    if (!slash) return resSender(res, 404, 'fail', 'Slash not found!');

    // Verify that the user was actually in the slash
    const userInSlash = slash.joined.find((j) => j.user.toString() === userIdStr);
    if (!userInSlash) {
      return resSender(res, 400, 'fail', 'User not found in this slash!');
    }

    return resSender(res, 200, 'success', 'QR verified! Marked as claimed.', null, {
      slash,
      claimed: true,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error verifying QR');
  }
};
