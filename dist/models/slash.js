"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Slash = exports.Qr = exports.SlashStatus = void 0;
const mongoose_1 = require("mongoose");
var SlashStatus;
(function (SlashStatus) {
    SlashStatus["FULL"] = "full";
    SlashStatus["OPEN"] = "open";
    SlashStatus["PURCHASING"] = "purchasing";
    SlashStatus["PICKUP"] = "pickup";
    SlashStatus["COMPLETED"] = "completed";
    SlashStatus["DISSOLVED"] = "dissolved";
})(SlashStatus || (exports.SlashStatus = SlashStatus = {}));
const slashSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Types.ObjectId, ref: 'Product', required: true },
    hub: { type: mongoose_1.Types.ObjectId, ref: 'Hub', required: true },
    timeLimit: { type: String, required: true },
    status: { type: String, enum: Object.values(SlashStatus) },
    joined: [
        {
            user: { type: mongoose_1.Types.ObjectId, ref: 'Account', required: true },
            qrCode: String,
            claimCode: String,
            claimed: { type: Boolean, default: false },
        },
    ],
    createdBy: { type: mongoose_1.Types.ObjectId, ref: 'Account', required: true },
}, { timestamps: true });
const qrSchema = new mongoose_1.Schema({
    id: String,
    data: String,
    timestamp: Number,
    hash: String,
});
const Slash = (0, mongoose_1.model)('Slash', slashSchema);
exports.Slash = Slash;
const Qr = (0, mongoose_1.model)('Qr', qrSchema);
exports.Qr = Qr;
