"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeProductStatus = exports.addProducts = exports.fetchProducts = void 0;
const responseService_1 = require("../../utils/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../utils/validationSchema"));
const product_1 = require("../../models/product");
const aiService_1 = require("../../utils/aiService");
const aiService = new aiService_1.AIService();
const fetchProducts = async (req, res) => {
    try {
        const allProducts = await product_1.Product.find();
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, allProducts);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching products!');
    }
};
exports.fetchProducts = fetchProducts;
const addProducts = async (req, res) => {
    try {
        const { name, noOfSlots, totalValue, quantity, category, emoji, description, patner } = req.body;
        const { error } = joi_1.default.object({
            name: validationSchema_1.default.strings,
            noOfSlots: validationSchema_1.default.number.required(),
            totalValue: validationSchema_1.default.number.required(),
            quantity: validationSchema_1.default.number.required(),
            category: validationSchema_1.default.strings,
            emoji: validationSchema_1.default.text,
            description: validationSchema_1.default.text,
            patner: validationSchema_1.default.text,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const newProduct = new product_1.Product({
            name,
            noOfSlots,
            totalValue,
            quantity,
            category,
            description,
            emoji,
            patner,
            pricePerSlot: totalValue / noOfSlots,
        });
        await newProduct.save();
        const aiProductCopy = await aiService.generateProductMarketingCopy({
            name,
            category,
            description,
            emoji,
            noOfSlots,
            totalValue,
            quantity,
        });
        return (0, responseService_1.resSender)(res, 201, 'success', 'Product added!', null, {
            product: newProduct,
            aiProductCopy,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error adding product!');
    }
};
exports.addProducts = addProducts;
const changeProductStatus = async (req, res) => {
    try {
        const { productId, status } = req.body;
        const { error } = joi_1.default.object({
            productId: validationSchema_1.default.objectId,
            status: validationSchema_1.default.strings.valid('Active', 'Inactive'),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        // Find the product
        const product = await product_1.Product.findById(productId);
        if (!product)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Product not found!');
        if (product.status === status)
            return (0, responseService_1.resSender)(res, 403, 'fail', `Product status is already ${product.status}`);
        product.status = status;
        return (0, responseService_1.resSender)(res, 200, 'success', 'Product status changed!');
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(Error, res, 'Error changing status!');
    }
};
exports.changeProductStatus = changeProductStatus;
