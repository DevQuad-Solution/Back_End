"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubRating = exports.Hub = exports.Attendant = exports.HubStatus = void 0;
const mongoose_1 = require("mongoose");
var HubStatus;
(function (HubStatus) {
    HubStatus["ACTIVE"] = "active";
    HubStatus["INACTIVE"] = "inactive";
    HubStatus["SUSPENDED"] = "suspended";
})(HubStatus || (exports.HubStatus = HubStatus = {}));
const hubSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    address: { type: String, required: true },
    status: {
        type: String,
        enum: Object.values(HubStatus),
        default: HubStatus.INACTIVE,
    },
    attendant: { type: mongoose_1.Types.ObjectId, ref: 'Attendant' },
    revenue: { type: Number, default: 0 },
}, { timestamps: true });
hubSchema.index({ name: 1 }, { unique: true });
const attendantSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    password: { type: String, required: true },
    hub: { type: mongoose_1.Types.ObjectId, ref: 'Hub' },
    status: { type: String, enum: Object.values(HubStatus), default: HubStatus.INACTIVE },
    role: { type: String, default: 'attendant' },
    ratings: {
        rating: { type: Number, default: 0 },
        numberofRatings: { type: Number, default: 0 },
    },
    joinedAt: Date,
    deliveries: { type: Number, default: 0 },
}, { timestamps: true });
// attendantSchema.index({})
const hubRatingSchema = new mongoose_1.Schema({
    hub: { type: mongoose_1.Types.ObjectId, ref: 'Hub', required: true },
    user: { type: mongoose_1.Types.ObjectId, ref: 'Account', required: true },
    slash: { type: mongoose_1.Types.ObjectId, ref: 'Slash' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
}, { timestamps: true });
const HubRating = (0, mongoose_1.model)('HubRating', hubRatingSchema);
exports.HubRating = HubRating;
const Hub = (0, mongoose_1.model)('Hub', hubSchema);
exports.Hub = Hub;
const Attendant = (0, mongoose_1.model)('Attendant', attendantSchema);
exports.Attendant = Attendant;
