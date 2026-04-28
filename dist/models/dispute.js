"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dispute = void 0;
const mongoose_1 = require("mongoose");
const disputeSchema = new mongoose_1.Schema({
    productName: { type: String, required: true },
    description: { type: String, required: true },
    filedBy: { type: mongoose_1.Types.ObjectId, ref: 'Attendant', required: true },
    slash: { type: mongoose_1.Types.ObjectId, ref: 'Slash', required: true },
    hub: { type: mongoose_1.Types.ObjectId, ref: 'Hub', required: true },
    estimatedLoss: { type: Number, required: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Low' },
    status: {
        type: String,
        enum: ['Open', 'Under Review', 'Resolved - Refunded'],
        default: 'Open',
    },
}, { timestamps: true });
const Dispute = (0, mongoose_1.model)('Dispute', disputeSchema);
exports.Dispute = Dispute;
