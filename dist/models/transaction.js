"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionHistory = exports.Notification = exports.TrxType = void 0;
const mongoose_1 = require("mongoose");
var TrxType;
(function (TrxType) {
    TrxType["TRANSFER"] = "Bank Transfer";
    TrxType["JOIN"] = "Joined Slash";
    TrxType["FEE"] = "Processing Fee";
    TrxType["REFUND"] = "Refund";
})(TrxType || (exports.TrxType = TrxType = {}));
const trxSchema = new mongoose_1.Schema({
    type: { type: String, enum: Object.values(TrxType) },
    user: { type: mongoose_1.Types.ObjectId, ref: 'Account', required: true },
    amount: { type: Number },
    trxReference: { type: String },
    trxDate: { type: Date },
}, { timestamps: true });
const notificationSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    details: { type: String, required: true },
    receivers: [{ user: { type: mongoose_1.Types.ObjectId, ref: 'Account' }, read: Boolean }],
});
const TransactionHistory = (0, mongoose_1.model)('TransactionHistory', trxSchema);
exports.TransactionHistory = TransactionHistory;
const Notification = (0, mongoose_1.model)('Notification', notificationSchema);
exports.Notification = Notification;
