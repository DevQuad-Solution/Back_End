"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNotificationForUser = exports.fetchAllNotifications = void 0;
const responseService_1 = require("../../utils/responseService");
const transaction_1 = require("../../models/transaction");
const notificationService_1 = require("../../utils/notificationService");
const fetchAllNotifications = async (req, res) => {
    try {
        const notifications = await transaction_1.Notification.find();
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched successfully!', null, notifications);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching all notifications!');
    }
};
exports.fetchAllNotifications = fetchAllNotifications;
const fetchNotificationForUser = async (req, res) => {
    try {
        const userId = req.user?._id;
        const notifications = await (0, notificationService_1.getNotificationsForUser)(userId);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, notifications);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching notifications');
    }
};
exports.fetchNotificationForUser = fetchNotificationForUser;
