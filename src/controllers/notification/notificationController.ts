import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { modifyUserResponse } from '../../utils/modifyResponse';
import Joi from 'joi';
import validationSchema from '../../utils/validationSchema';
import { Schema } from 'mongoose';
import { Notification } from '../../models/transaction';
import { getNotificationsForUser } from '../../utils/notificationService';

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
