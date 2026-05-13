"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveWaitList = exports.fetchNotificationForUser = exports.fetchAllNotifications = void 0;
const responseService_1 = require("../../utils/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../utils/validationSchema"));
const transaction_1 = require("../../models/transaction");
const notificationService_1 = require("../../utils/notificationService");
const waitlist_1 = require("../../models/waitlist");
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
const saveWaitList = async (req, res) => {
    try {
        let waitlistToken = req.headers['waitlist-token'];
        waitlistToken = waitlistToken.split(' ')[1];
        console.log('Token: ', waitlistToken);
        if (!waitlistToken)
            return (0, responseService_1.resSender)(res, 401, 'fail', 'No token');
        if (waitlistToken !== process.env.WAITLIST_TOKEN)
            return (0, responseService_1.resSender)(res, 401, 'fail', 'Unauthorized request!');
        const { name, email, phone, campus } = req.body;
        const { error } = joi_1.default.object({
            name: validationSchema_1.default.strings,
            email: validationSchema_1.default.email,
            phone: validationSchema_1.default.phoneNumber,
            campus: validationSchema_1.default.strings,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error?.details[0].message);
        const exists = await waitlist_1.Waitlist.findOne({ email });
        if (exists)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'You have been added already!');
        const newWait = new waitlist_1.Waitlist({
            name,
            email,
            phone,
            campus,
        });
        await newWait.save();
        return (0, responseService_1.resSender)(res, 201, 'success', 'You have been added to the waitlist');
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error saving waitlist!');
    }
};
exports.saveWaitList = saveWaitList;
