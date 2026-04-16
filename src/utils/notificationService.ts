import { Schema, Types } from 'mongoose';
import { Notification } from '../models/transaction';

export const addNotification = async (
  title: string,
  details: string,
  receivers: Types.ObjectId[],
) => {
  try {
    let notification = await Notification.findOne({ title });
    if (notification) {
      // Add new receivers, avoiding duplicates
      const newReceivers = receivers.map((userId) => ({ user: userId, read: false }));
      const existingUserIds = notification.receivers.map((r) => r.user.toString());
      const filteredNewReceivers = newReceivers.filter(
        (nr) => !existingUserIds.includes(nr.user.toString()),
      );
      notification.receivers.push(...filteredNewReceivers);
      await notification.save();
      return notification;
    } else {
      // Create new notification
      const newReceivers = receivers.map((userId) => ({ user: userId, read: false }));
      const newNotification = new Notification({
        title,
        details,
        receivers: newReceivers,
      });
      await newNotification.save();
      return newNotification;
    }
  } catch (error: any) {
    throw error;
  }
};

export const getNotificationsForUser = async (userId: Types.ObjectId) => {
  try {
    const notifications = await Notification.find({
      'receivers.user': userId,
    });
    return notifications;
  } catch (error: any) {
    throw error;
  }
};
