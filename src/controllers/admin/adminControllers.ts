import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { modifyUserResponse } from '../../utils/modifyResponse';
import Joi from 'joi';
import validationSchema from '../../utils/validationSchema';
import { Schema, Types } from 'mongoose';
import { Account, KycStatus, UserStatus } from '../../models/account';
import { Slash, SlashStatus } from '../../models/slash';
import { IProduct } from '../../models/product';
import bcrypt from 'bcryptjs';
import { Attendant, Hub, HubRating, HubStatus, IAttendant, IHub } from '../../models/hubAttendant';
import { Waitlist } from '../../models/waitlist';

export const fetchAllUsers = async (req: Request, res: Response) => {
  try {
    let { page = 1, limit = 20 } = req.query;
    const { error } = Joi.object({
      page: validationSchema.number,
      limit: validationSchema.number,
    }).validate(req.query);
    if (error) return resSender(res, 400, 'fail', error?.details[0].message);

    page = Number(page) || 1;
    limit = Number(limit) || 20;
    const users = await Account.find({ role: 'user' })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Account.countDocuments({ role: 'user' });
    const maskedUsers = users.flatMap((user) => modifyUserResponse(user));
    return resSender(res, 200, 'success', 'Users fetched', null, {
      users: maskedUsers,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching all users');
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    let {
      query,
      status = 'All',
      page,
      limit,
    } = req.query as unknown as {
      query: string;
      status: string;
      page: number;
      limit: number;
    };

    const { error } = Joi.object({
      query: validationSchema.strings.required(), // Make query required for search
      status: validationSchema.strings
        .optional()
        .valid('All', 'Verified', 'Unverified', 'Pending', 'Rejected'),
      page: validationSchema.number,
      limit: validationSchema.number,
    }).validate(req.query);

    if (error) return resSender(res, 400, 'fail', error?.details[0].message);

    page = Number(page) || 1;
    limit = Number(limit) || 20;

    // Build match conditions
    const matchConditions: any = {
      //   status: SlashStatus.OPEN,
    };

    // Only add search conditions if query exists
    if (query && query.trim()) {
      matchConditions.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ];
    }

    if (status !== 'All') {
      matchConditions['kyc.status'] = status;
    }

    const users = await Account.find(matchConditions);
    const total = await Account.countDocuments(matchConditions);

    if (users.length === 0) {
      return resSender(res, 200, 'success', 'No user found', null, {
        users: [],
        page,
        total: 0,
        totalPages: 0,
      });
    }

    return resSender(res, 200, 'success', 'Fetched!', null, {
      users,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error searching user');
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const user = await Account.findById(id).populate('hub', 'name');
    if (!user) return resSender(res, 404, 'fail', 'User not found!');
    return resSender(res, 200, 'success', 'User fetched!', null, modifyUserResponse(user));
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching user!');
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const [total, verified, unverified, pending, suspended] = await Promise.all([
      Account.countDocuments(),
      Account.countDocuments({ 'kyc.status': KycStatus.VERIFIED }),
      Account.countDocuments({ 'kyc.status': KycStatus.UNVERIFIED }),
      Account.countDocuments({ 'kyc.status': KycStatus.PENDING }),
      Account.countDocuments({ status: UserStatus.SUSPENDED }),
    ]);

    return resSender(res, 200, 'success', 'Stats fetched!', null, {
      total,
      verified,
      unverified,
      pending,
      suspended,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching data!');
  }
};

export const searchSlash = async (req: Request, res: Response) => {
  try {
    let {
      query,
      hubId,
      status = 'all',
      page,
      limit,
    } = req.query as unknown as {
      query: string;
      hubId: Types.ObjectId;
      status: string;
      page: number;
      limit: number;
    };

    const { error } = Joi.object({
      query: validationSchema.text,
      hubId: validationSchema.objectId.optional(),
      status: validationSchema.strings.optional().valid(...Object.values(SlashStatus), 'all'),
      page: validationSchema.number,
      limit: validationSchema.number,
    }).validate(req.query);

    if (error) return resSender(res, 400, 'fail', error?.details[0].message);

    page = Number(page) || 1;
    limit = Number(limit) || 20;

    // Build match conditions
    const matchConditions: any = {};

    // Only add search conditions if query exists
    if (query && query.trim()) {
      matchConditions.$or = [
        { 'product.name': { $regex: query, $options: 'i' } },
        { 'hub.name': { $regex: query, $options: 'i' } },
        { 'createdBy.name': { $regex: query, $options: 'i' } },
        { _id: { $regex: query, $options: 'i' } },
      ];
    }

    if (status !== 'all') {
      matchConditions.status = status;
    }
    if (hubId) {
      matchConditions.hub = hubId;
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
            status: 1,
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

export const dissolveSlash = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    // Check if slash exist and refund all joined users
    let slash = await Slash.findById(id).populate('product');
    if (!slash) return resSender(res, 404, 'fail', 'Slash not found!');

    const joinedUsers = slash.joined;
    if (joinedUsers.length < 1) return resSender(res, 403, 'fail', 'This slash has no user!');

    const product = slash.product as unknown as IProduct;
    if (!product) return resSender(res, 404, 'fail', 'Product not found!');

    const price = product.pricePerSlot;
    for (const user of joinedUsers) {
      await Account.findOneAndUpdate(
        { _id: user.user },
        { $inc: { walletBalance: price } },
        { returnDocument: 'after' },
      );
    }

    slash = await Slash.findByIdAndUpdate(id, {
      $set: { status: SlashStatus.DISSOLVED },
    });

    return resSender(res, 200, 'success', 'Slash dissolved!', null, slash);
  } catch (error: any) {
    return errorHandler(error, res, 'Error dissolving slash!');
  }
};

export const suspendUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    await Account.findByIdAndUpdate(
      id,
      {
        $set: { status: UserStatus.SUSPENDED },
      },
      { returnDocument: 'after' },
    );

    return resSender(res, 200, 'success', 'User suspended!');
  } catch (error: any) {
    return errorHandler(error, res, 'Unable to suspend user, try again!');
  }
};

export const fetchHubs = async (req: Request, res: Response) => {
  try {
    let {
      query,
      status = 'all',
      page,
      limit,
    } = req.query as unknown as {
      query: string;
      status: string;
      page: number;
      limit: number;
    };

    const { error } = Joi.object({
      query: validationSchema.text,
      status: validationSchema.strings.optional().valid('all', 'active', 'inactive', 'suspended'),
      page: validationSchema.number,
      limit: validationSchema.number,
    }).validate(req.query);

    if (error) return resSender(res, 400, 'fail', error?.details[0].message);

    page = Number(page) || 1;
    limit = Number(limit) || 20;

    // Build match conditions
    const matchConditions: any = {
      //   status: SlashStatus.OPEN,
    };

    // Only add search conditions if query exists
    if (query && query.trim()) {
      matchConditions.$or = [
        { name: { $regex: query, $options: 'i' } },
        { city: { $regex: query, $options: 'i' } },
        { state: { $regex: query, $options: 'i' } },
      ];
    }

    if (status !== 'all') {
      matchConditions.status = status;
    }

    const hubs = await Hub.find(matchConditions);
    const total = await Hub.countDocuments(matchConditions);

    if (hubs.length === 0) {
      return resSender(res, 200, 'success', 'No hub found', null, {
        hubs: [],
        page,
        total: 0,
        totalPages: 0,
      });
    }

    return resSender(res, 200, 'success', 'Fetched!', null, {
      hubs,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching hubs!');
  }
};

export const changeHubStatus = async (req: Request, res: Response) => {
  try {
    const { hubId, status } = req.body;
    const { error } = Joi.object({
      hubId: validationSchema.objectId,
      status: validationSchema.strings.valid(...Object.values(HubStatus)),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    // Find the hub
    const hub = await Hub.findById(hubId);
    if (!hub) return resSender(res, 404, 'fail', 'Hub not found!');
    console.log('Hub found!');
    if (hub.status === (status as HubStatus))
      return resSender(res, 403, 'fail', `Hub status is already ${hub.status}`);
    console.log('Not matched!');
    hub.status = status as HubStatus;
    console.log('assigned!');
    await hub.save();

    return resSender(res, 200, 'success', 'Status changed!');
  } catch (error: any) {
    return errorHandler(error, res, 'Error changing status!');
  }
};

export const createHub = async (req: Request, res: Response) => {
  try {
    const { name, city, state, address, transportCost, attendantId, active } = req.body;
    const { error } = Joi.object({
      name: validationSchema.strings,
      city: validationSchema.strings,
      state: validationSchema.strings,
      address: validationSchema.strings,
      transportCost: validationSchema.number,
      attendantId: validationSchema.objectId.optional(),
      active: validationSchema.boolean,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let att: IAttendant | null = null;
    // Validate attendantId
    if (attendantId) {
      att = await Attendant.findById(attendantId);
      if (!att) return resSender(res, 404, 'fail', 'Invalid attendant Id');
    }

    const newHub = new Hub({
      name,
      city,
      state,
      address,
      transportCost,
      attendant: att?._id ?? undefined,
      status: active ? HubStatus.ACTIVE : HubStatus.INACTIVE,
    });
    await newHub.save();

    return resSender(res, 201, 'success', 'Hub created!', null, newHub);
  } catch (error: any) {
    return errorHandler(error, res, 'Error creating hub!');
  }
};

export const fetchHubById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    let sum = 0;
    const hub = await Hub.findById(id).populate('attendant', 'name');
    if (!hub) return resSender(res, 404, 'fail', 'Hub not found!');

    const hubRating = await HubRating.find({ hub: id });
    const totalRatings = hubRating.length;
    hubRating.map((rating) => {
      const score = rating.rating;
      if (score >= 1 && score <= 5) {
        sum += score;
      }
    });
    console.log('Hub total score: ', sum);
    const averageRating = totalRatings ? Number((sum / totalRatings).toFixed(1)) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slashes = await Slash.find({ hub: id });
    const slashToday = slashes.filter((slash) => {
      return slash.createdAt && slash.createdAt >= today;
    });

    return resSender(res, 200, 'success', 'Hub fetched!', null, {
      hub: {
        ...(hub as any)._doc,
        averageRating,
        totalReviews: totalRatings,
        slashToday,
        totalSlashes: slashes.length ?? 0,
      },
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching hub!');
  }
};

export const asignAttendantToHub = async (req: Request, res: Response) => {
  try {
    const { hubId, attendantId } = req.body;
    const { error } = Joi.object({
      hubId: validationSchema.objectId,
      attendantId: validationSchema.objectId,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const hub = await Hub.findById(hubId);
    if (!hub) return resSender(res, 404, 'fail', 'Hub not found!');
    const attendant = await Attendant.findById(attendantId);
    if (!attendant) return resSender(res, 404, 'fail', 'Attendant not found or does not exist!');
    if (hub.attendant && hub.attendant.toString() !== attendantId.toString())
      return resSender(res, 403, 'fail', 'Hub already has an attendant, please unassign first!');
    if (attendant.hub && attendant.hub.toString() !== hubId.toString())
      return resSender(
        res,
        403,
        'fail',
        'Attendant is already assigned to a hub, please unassign first!',
      );
    hub.attendant = attendant._id;
    attendant.hub = hub._id;
    await attendant.save();
    await hub.save();

    return resSender(res, 200, 'success', 'Attendant assigned to hub');
  } catch (error: any) {
    return errorHandler(error, res, 'Cant assign attendant');
  }
};

export const createAttendant = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, hubId, active } = req.body;
    const { error } = Joi.object({
      hubId: validationSchema.objectId.optional(),
      active: validationSchema.boolean,
      name: validationSchema.strings,
      phone: validationSchema.phoneNumber,
      email: validationSchema.email,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);
    console.log('Validation DOne');

    const { hashedPin, pin } = generatePin();
    let hub: IHub | null = null;

    // Find/validate hub
    if (hubId) {
      hub = await Hub.findById(hubId);
      if (!hub) return resSender(res, 404, 'fail', 'Hub not found!');
    }

    console.log('Got here!');

    const newAttendant = new Attendant({
      name,
      phone,
      email,
      emailVerified: true,
      password: hashedPin,
      hub: hub?._id ?? undefined,
      joinedAt: new Date(),
      status: active ? HubStatus.ACTIVE : HubStatus.INACTIVE,
    });
    await newAttendant.save();

    // hub?.attendant = newAttendant._id;
    // await hub.save();
    console.log('Saved');

    return resSender(res, 201, 'success', 'Attendant created!', null, {
      attendant: modifyUserResponse(newAttendant),
      pin,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error creating attendant!');
  }
};

export const fetchAttendants = async (req: Request, res: Response) => {
  try {
    const attendants = await Attendant.find().populate('hub', 'name');

    return resSender(res, 200, 'success', 'Fetched!', null, attendants);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching attendants!');
  }
};

export const resetAttendantPin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = Joi.object({
      id: validationSchema.objectId,
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const { hashedPin, pin } = generatePin();
    const attendant = await Attendant.findByIdAndUpdate(id, {
      $set: { password: hashedPin },
    });
    if (!attendant) return resSender(res, 400, 'fail', 'Operation failed, try again!');
    return resSender(res, 200, 'success', 'Pin reset!', null, pin);
  } catch (error: any) {
    return errorHandler(error, res, 'Unable to reset pin!');
  }
};

export const changeAttendantStatus = async (req: Request, res: Response) => {
  try {
    const { attendantId, status } = req.body;
    const { error } = Joi.object({
      attendantId: validationSchema.objectId,
      status: validationSchema.strings.valid(...Object.values(HubStatus)),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    // Find the attendant
    const attendant = await Attendant.findById(attendantId);
    if (!attendant) return resSender(res, 404, 'fail', 'Attendant not found!');
    if (attendant.status === (status as HubStatus))
      return resSender(res, 403, 'fail', `Attendant status is already ${attendant.status}`);
    attendant.status = status as HubStatus;
    await attendant.save();

    return resSender(res, 200, 'success', 'Attendant status changed!');
  } catch (error: any) {
    return errorHandler(Error, res, 'Error changing status!');
  }
};

export const fetchAllWaitlist = async (req: Request, res: Response) => {
  try {
    const waitlists = await Waitlist.find();

    return resSender(res, 200, 'success', 'Waitlists fetched', null, waitlists);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching waitlists!');
  }
};

export const generatePin = () => {
  let pin = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedPin = bcrypt.hashSync(pin, bcrypt.genSaltSync(15));
  return { hashedPin, pin };
};
