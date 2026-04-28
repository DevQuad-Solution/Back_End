"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyQr = exports.getQrForSlash = exports.deleteSlash = exports.leaveSlash = exports.editSlash = exports.joinSlash = exports.searchSlash = exports.fetchSlash = exports.fetchSlashes = exports.createSlash = void 0;
const responseService_1 = require("../../utils/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../utils/validationSchema"));
const account_1 = require("../../models/account");
const slash_1 = require("../../models/slash");
const product_1 = require("../../models/product");
const qrService_1 = __importDefault(require("../../utils/qrService"));
const encryption_1 = require("../../utils/encryption");
const notificationService_1 = require("../../utils/notificationService");
const generateClaimCode = (slashId, userId) => {
    const slashPart = slashId.toString().slice(-4).toUpperCase();
    const userPart = userId.toString().slice(-4).toUpperCase();
    const suffix = Math.floor(10 + Math.random() * 90);
    return `SL${slashPart}-${userPart}-${suffix}`;
};
const rawAmt = process.env.AMT_PER_TRX ?? '100';
const AMT_PER_TRX = Number(rawAmt.trim().replace(/[^0-9.-]/g, ''));
if (Number.isNaN(AMT_PER_TRX)) {
    throw new Error('Invalid AMT_PER_TRX env variable');
}
const createSlash = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { productId, timeLimit, hubId } = req.body;
        const { error } = joi_1.default.object({
            productId: validationSchema_1.default.objectId,
            timeLimit: validationSchema_1.default.strings,
            hubId: validationSchema_1.default.objectId,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        if (!req.user?.emailVerified)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Please verify your account to proceed!');
        // Calculate & deduct price of one slot for the slash
        const product = await product_1.Product.findById(productId);
        if (!product)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Product not found!');
        let price = product.pricePerSlot + AMT_PER_TRX;
        console.log('SLot price: ', price);
        // Check balance and deduct atomically
        const user = await account_1.Account.findOneAndUpdate({ _id: userId, walletBalance: { $gte: price } }, { $inc: { walletBalance: -price, joined: 1, totalSPend: price } }, { returnDocument: 'after' });
        if (!user)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Insufficient wallet balance!');
        let newSlash = new slash_1.Slash({
            product: productId,
            timeLimit,
            hub: hubId,
            status: slash_1.SlashStatus.OPEN,
            joined: [
                {
                    user: userId,
                    claimed: false,
                    qrCode: '',
                    claimCode: '',
                },
            ],
            createdBy: userId,
        });
        await newSlash.save();
        const claimCode = generateClaimCode(newSlash._id.toString(), userId.toString());
        const qrCode = await qrService_1.default.generateQR((0, encryption_1.toBase64)(`${userId}:${newSlash._id}`));
        console.log('QR: ', qrCode);
        const updatedSlash = await slash_1.Slash.findByIdAndUpdate(newSlash._id, {
            $set: {
                'joined.$[elem].qrCode': qrCode,
                'joined.$[elem].claimCode': claimCode,
            },
        }, {
            arrayFilters: [{ 'elem.user': userId }],
            returnDocument: 'after',
        }).populate([
            { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity emoji' },
            { path: 'hub', select: 'name city state address' },
        ]);
        await (0, notificationService_1.addNotification)('Joined Slash', `Joined Slash ${updatedSlash?._id.toString().substring(20)} - ${(updatedSlash?.product).name}`, [userId]);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Slash created successfully!', null, updatedSlash);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error creating slash!');
    }
};
exports.createSlash = createSlash;
const fetchSlashes = async (req, res) => {
    try {
        let { category = 'all', page = 1, limit = 20 } = req.query;
        const { error } = joi_1.default.object({
            category: validationSchema_1.default.strings.optional(), //.valid()
            page: validationSchema_1.default.number,
            limit: validationSchema_1.default.number,
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error?.details[0].message);
        page = Number(page) || 1;
        limit = Number(limit) || 20;
        let query = { status: slash_1.SlashStatus.OPEN };
        if (category !== 'all') {
            query['product.category'] = category;
        }
        const populateQuery = [
            { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity emoji' },
            { path: 'hub', select: 'name city state address' },
            // { path: 'createdBy', select: 'name' },
        ];
        const slashes = await slash_1.Slash.find(query)
            .populate(populateQuery)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        const total = await slash_1.Slash.countDocuments(query);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, {
            slashes,
            page,
            total: total,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching slashes');
    }
};
exports.fetchSlashes = fetchSlashes;
const fetchSlash = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const populateQuery = [
            { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity emoji' },
            { path: 'hub', select: 'name city state address' },
            { path: 'createdBy', select: 'name' },
        ];
        const slash = await slash_1.Slash.findById(id).populate(populateQuery);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched slash!', null, slash);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching slash details');
    }
};
exports.fetchSlash = fetchSlash;
const searchSlash = async (req, res) => {
    try {
        let { query, category = 'all', page, limit, } = req.query;
        const { error } = joi_1.default.object({
            query: validationSchema_1.default.strings.required(), // Make query required for search
            category: validationSchema_1.default.strings.optional(),
            page: validationSchema_1.default.number,
            limit: validationSchema_1.default.number,
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error?.details[0].message);
        page = Number(page) || 1;
        limit = Number(limit) || 20;
        // Build match conditions
        const matchConditions = {
            status: slash_1.SlashStatus.OPEN,
        };
        // Only add search conditions if query exists
        if (query && query.trim()) {
            matchConditions.$or = [
                { 'product.name': { $regex: query, $options: 'i' } },
                { 'hub.name': { $regex: query, $options: 'i' } },
                { 'hub.city': { $regex: query, $options: 'i' } },
            ];
        }
        if (category !== 'all') {
            matchConditions['product.category'] = category;
        }
        const aggregation = [
            {
                $lookup: {
                    from: 'products',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            {
                $lookup: {
                    from: 'hubs',
                    localField: 'hub',
                    foreignField: '_id',
                    as: 'hub',
                },
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: false } },
            { $unwind: { path: '$hub', preserveNullAndEmptyArrays: false } },
            { $match: matchConditions },
            {
                $project: {
                    product: {
                        name: 1,
                        pricePerSlot: 1,
                        totalValue: 1,
                        category: 1,
                        noOfSlots: 1,
                        quantity: 1,
                        emoji: 1,
                    },
                    hub: {
                        name: 1,
                        city: 1,
                        state: 1,
                        address: 1,
                    },
                    timeLimit: 1,
                    status: 1,
                    joined: 1,
                    createdBy: 1,
                    createdAt: 1,
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    metadata: [{ $count: 'totalCount' }],
                    slashes: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                },
            },
        ];
        const result = await slash_1.Slash.aggregate(aggregation);
        const total = result[0]?.metadata[0]?.totalCount || 0;
        const slashes = result[0]?.slashes || [];
        if (slashes.length === 0) {
            return (0, responseService_1.resSender)(res, 200, 'success', 'No slashes found', null, {
                slashes: [],
                page,
                total: 0,
                totalPages: 0,
            });
        }
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, {
            slashes,
            page,
            total,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error searching!');
    }
};
exports.searchSlash = searchSlash;
const joinSlash = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const slash = await slash_1.Slash.findById(id).populate('product');
        if (!slash)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Slash not found!');
        if (slash.joined.some((j) => j.user.toString() === userId.toString())) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'You have already joined this slash!');
        }
        const product = await product_1.Product.findById(slash.product);
        if (!product)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Product not found!');
        const price = product.pricePerSlot + AMT_PER_TRX;
        const user = await account_1.Account.findOneAndUpdate({ _id: userId, walletBalance: { $gte: price } }, { $inc: { walletBalance: -price, joined: 1, totalSPend: price } }, { returnDocument: 'after' });
        if (!user)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Insufficient wallet balance!');
        const claimCode = generateClaimCode(id, userId.toString());
        const qrCode = await qrService_1.default.generateQR((0, encryption_1.toBase64)(`${userId}:${id}`));
        console.log('QR: ', qrCode);
        const updatedSlash = await slash_1.Slash.findByIdAndUpdate(id, {
            $push: { joined: { user: userId, qrCode, claimCode, claimed: false } },
        }, { returnDocument: 'after' });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Slash joined!', null, updatedSlash);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error joining slash');
    }
};
exports.joinSlash = joinSlash;
const editSlash = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        const { timeLimit } = req.body;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        // Check if user is the creator
        const slash = await slash_1.Slash.findById(id);
        if (!slash)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Slash not found!');
        if (slash.createdBy.toString() !== userId.toString()) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'You can only edit your own slash!');
        }
        // Update only editable fields
        const updatedSlash = await slash_1.Slash.findByIdAndUpdate(id, { timeLimit }, { returnDocument: 'after' }).populate([
            { path: 'product', select: 'name pricePerSlot totalValue category noOfSlots quantity emoji' },
            { path: 'hub', select: 'name city state address' },
        ]);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Slash updated successfully!', null, updatedSlash);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error editing slash');
    }
};
exports.editSlash = editSlash;
const leaveSlash = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        // Check if slash exist and user has joined before
        const slash = await slash_1.Slash.findById(id).populate('product');
        if (!slash)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Slash not found!');
        const userSlash = slash.joined.find((j) => j.user.toString() === userId.toString());
        if (!userSlash)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'You have not joined this slash!');
        const product = slash.product;
        if (!product)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Product not found!');
        const price = product.pricePerSlot;
        const user = await account_1.Account.findOneAndUpdate({ _id: userId }, { $inc: { walletBalance: price, joined: -1, totalSPend: -price } }, { returnDocument: 'after' });
        if (!user)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'User not found!');
        const updatedSlash = await slash_1.Slash.findByIdAndUpdate(id, {
            $pull: { joined: userSlash },
        }, { returnDocument: 'after' });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Slash left successfully!', null, updatedSlash);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error leaving slash');
    }
};
exports.leaveSlash = leaveSlash;
const deleteSlash = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        // Check if user is the creator
        const slash = await slash_1.Slash.findById(id);
        if (!slash)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Slash not found!');
        if (slash.createdBy.toString() !== userId.toString()) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'You can only delete your own slash!');
        }
        // Optional: Check if slash is not started (no one has joined except creator)
        if (slash.joined.length > 1) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Cannot delete a slash that has other members!');
        }
        await slash_1.Slash.findByIdAndDelete(id);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Slash deleted successfully!');
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error deleting slash');
    }
};
exports.deleteSlash = deleteSlash;
const getQrForSlash = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        // Find the slash and get the QR code for the user
        const slash = await slash_1.Slash.findById(id);
        if (!slash)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Slash not found!');
        // Find the user in the joined array
        const userSlash = slash.joined.find((j) => j.user.toString() === userId.toString());
        if (!userSlash)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'You have not joined this slash!');
        return (0, responseService_1.resSender)(res, 200, 'success', 'QR retrieved!', null, {
            qrCode: userSlash.qrCode,
            claimCode: userSlash.claimCode,
            claimed: userSlash.claimed,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error getting QR for slash');
    }
};
exports.getQrForSlash = getQrForSlash;
const verifyQr = async (req, res) => {
    try {
        const { qrCode, code } = req.body;
        const { error } = joi_1.default.object({
            qrCode: validationSchema_1.default.strings.optional(),
            code: validationSchema_1.default.strings.optional(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        if (!qrCode && !code) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'QR code or claim code is required!');
        }
        let slash;
        let matchedEntry;
        if (qrCode) {
            const verified = await qrService_1.default.verifyQR(qrCode);
            if (!verified)
                return (0, responseService_1.resSender)(res, 403, 'fail', 'Invalid QR data');
            const decodedQr = (0, encryption_1.base64ToString)(verified.data);
            const [userIdStr, slashId] = decodedQr.split(':');
            if (!userIdStr || !slashId) {
                return (0, responseService_1.resSender)(res, 400, 'fail', 'Invalid QR code format!');
            }
            slash = await slash_1.Slash.findByIdAndUpdate(slashId, {
                $set: {
                    'joined.$[elem].claimed': true,
                },
            }, {
                arrayFilters: [{ 'elem.user': userIdStr }],
                returnDocument: 'after',
            }).populate([
                {
                    path: 'product',
                    select: 'name pricePerSlot totalValue category noOfSlots quantity emoji',
                },
                { path: 'hub', select: 'name city state address' },
            ]);
            if (!slash)
                return (0, responseService_1.resSender)(res, 404, 'fail', 'Slash not found!');
            matchedEntry = slash.joined.find((j) => j.user.toString() === userIdStr);
        }
        else {
            const normalizedCode = code.trim();
            slash = await slash_1.Slash.findOneAndUpdate({ 'joined.claimCode': normalizedCode }, {
                $set: {
                    'joined.$[elem].claimed': true,
                },
            }, {
                arrayFilters: [{ 'elem.claimCode': normalizedCode }],
                returnDocument: 'after',
            }).populate([
                {
                    path: 'product',
                    select: 'name pricePerSlot totalValue category noOfSlots quantity emoji',
                },
                { path: 'hub', select: 'name city state address' },
            ]);
            if (!slash)
                return (0, responseService_1.resSender)(res, 404, 'fail', 'Invalid claim code or slash not found!');
            matchedEntry = slash.joined.find((j) => j.claimCode === normalizedCode);
        }
        if (!matchedEntry) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'No matching slash member found for this code!');
        }
        return (0, responseService_1.resSender)(res, 200, 'success', 'QR/code verified! Marked as claimed.', null, {
            slash,
            claimed: true,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error verifying QR');
    }
};
exports.verifyQr = verifyQr;
