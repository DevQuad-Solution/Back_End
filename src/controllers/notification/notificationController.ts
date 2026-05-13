import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { modifyUserResponse } from '../../utils/modifyResponse';
import Joi from 'joi';
import validationSchema from '../../utils/validationSchema';
import { Schema } from 'mongoose';
import { Notification } from '../../models/transaction';
import { getNotificationsForUser } from '../../utils/notificationService';
import { Waitlist } from '../../models/waitlist';

export const fetchAllNotifications = async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find();
    return resSender(res, 200, 'success', 'Fetched successfully!', null, notifications);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching all notifications!');
  }
};

export const fetchNotificationForUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id!;
    const notifications = await getNotificationsForUser(userId);

    return resSender(res, 200, 'success', 'Fetched!', null, notifications);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching notifications');
  }
};

export const saveWaitList = async (req: Request, res: Response) => {
  try {
    let waitlistToken = req.headers['waitlist-token'] as string;
    waitlistToken = waitlistToken.split(' ')[1];
    console.log('Token: ', waitlistToken);
    if (!waitlistToken) return resSender(res, 401, 'fail', 'No token');
    if (waitlistToken !== process.env.WAITLIST_TOKEN!)
      return resSender(res, 401, 'fail', 'Unauthorized request!');

    const { name, email, phone, campus } = req.body;
    const { error } = Joi.object({
      name: validationSchema.strings,
      email: validationSchema.email,
      phone: validationSchema.phoneNumber,
      campus: validationSchema.strings,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error?.details[0].message);

    const exists = await Waitlist.findOne({email});
    if (exists) return resSender(res, 403, 'fail', 'You have been added already!');

    const newWait = new Waitlist({
      name,
      email,
      phone,
      campus,
    });
    await newWait.save();
    return resSender(res, 201, 'success', 'You have been added to the waitlist');
  } catch (error: any) {
    return errorHandler(error, res, 'Error saving waitlist!');
  }
};
