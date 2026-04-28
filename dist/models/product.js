"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = void 0;
const mongoose_1 = require("mongoose");
const productSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    patner: { type: String },
    totalValue: { type: Number, required: true },
    pricePerSlot: { type: Number, required: true },
    noOfSlots: { type: Number, required: true },
    quantity: { type: Number, required: true },
    category: { type: String, required: true },
    emoji: { type: String },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Inactive' },
    createdBy: { type: mongoose_1.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });
const Product = (0, mongoose_1.model)('Product', productSchema);
exports.Product = Product;
