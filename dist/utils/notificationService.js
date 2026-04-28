"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationsForUser = exports.addNotification = void 0;
const transaction_1 = require("../models/transaction");
const addNotification = async (title, details, receivers) => {
    try {
        let notification = await transaction_1.Notification.findOne({ title });
        if (notification) {
            // Add new receivers, avoiding duplicates
            const newReceivers = receivers.map((userId) => ({ user: userId, read: false }));
            const existingUserIds = notification.receivers.map((r) => r.user.toString());
            const filteredNewReceivers = newReceivers.filter((nr) => !existingUserIds.includes(nr.user.toString()));
            notification.receivers.push(...filteredNewReceivers);
            await notification.save();
            return notification;
        }
        else {
            // Create new notification
            const newReceivers = receivers.map((userId) => ({ user: userId, read: false }));
            const newNotification = new transaction_1.Notification({
                title,
                details,
                receivers: newReceivers,
            });
            await newNotification.save();
            return newNotification;
        }
    }
    catch (error) {
        throw error;
    }
};
exports.addNotification = addNotification;
const getNotificationsForUser = async (userId) => {
    try {
        const notifications = await transaction_1.Notification.find({
            'receivers.user': userId,
        });
        return notifications;
    }
    catch (error) {
        throw error;
    }
};
exports.getNotificationsForUser = getNotificationsForUser;
