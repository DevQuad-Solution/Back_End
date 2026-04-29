"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePin = exports.changeAttendantStatus = exports.resetAttendantPin = exports.fetchAttendants = exports.createAttendant = exports.asignAttendantToHub = exports.fetchHubById = exports.createHub = exports.changeHubStatus = exports.fetchHubs = exports.suspendUser = exports.dissolveSlash = exports.searchSlash = exports.getStats = exports.getUserById = exports.searchUsers = exports.fetchAllUsers = void 0;
const responseService_1 = require("../../utils/responseService");
const modifyResponse_1 = require("../../utils/modifyResponse");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../utils/validationSchema"));
const account_1 = require("../../models/account");
const slash_1 = require("../../models/slash");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const hubAttendant_1 = require("../../models/hubAttendant");
const fetchAllUsers = async (req, res) => {
    try {
        let { page = 1, limit = 20 } = req.query;
        const { error } = joi_1.default.object({
            page: validationSchema_1.default.number,
            limit: validationSchema_1.default.number,
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error?.details[0].message);
        page = Number(page) || 1;
        limit = Number(limit) || 20;
        const users = await account_1.Account.find({ role: 'user' })
            .skip((page - 1) * limit)
            .limit(limit);
        const total = await account_1.Account.countDocuments({ role: 'user' });
        const maskedUsers = users.flatMap((user) => (0, modifyResponse_1.modifyUserResponse)(user));
        return (0, responseService_1.resSender)(res, 200, 'success', 'Users fetched', null, {
            users: maskedUsers,
            page,
            total,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching all users');
    }
};
exports.fetchAllUsers = fetchAllUsers;
const searchUsers = async (req, res) => {
    try {
        let { query, status = 'All', page, limit, } = req.query;
        const { error } = joi_1.default.object({
            query: validationSchema_1.default.strings.required(), // Make query required for search
            status: validationSchema_1.default.strings
                .optional()
                .valid('All', 'Verified', 'Unverified', 'Pending', 'Rejected'),
            page: validationSchema_1.default.number,
            limit: validationSchema_1.default.number,
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error?.details[0].message);
        page = Number(page) || 1;
        limit = Number(limit) || 20;
        // Build match conditions
        const matchConditions = {
        //   status: SlashStatus.OPEN,
        };
        // Only add search conditions if query exists
        if (query && query.trim()) {
            matchConditions.$or = [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
            ];
        }
        if (status !== 'All') {
            matchConditions['kyc.status'] = status;
        }
        const users = await account_1.Account.find(matchConditions);
        const total = await account_1.Account.countDocuments(matchConditions);
        if (users.length === 0) {
            return (0, responseService_1.resSender)(res, 200, 'success', 'No user found', null, {
                users: [],
                page,
                total: 0,
                totalPages: 0,
            });
        }
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, {
            users,
            page,
            total,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error searching user');
    }
};
exports.searchUsers = searchUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const user = await account_1.Account.findById(id).populate('hub', 'name');
        if (!user)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'User not found!');
        return (0, responseService_1.resSender)(res, 200, 'success', 'User fetched!', null, (0, modifyResponse_1.modifyUserResponse)(user));
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching user!');
    }
};
exports.getUserById = getUserById;
const getStats = async (req, res) => {
    try {
        const [total, verified, unverified, pending, suspended] = await Promise.all([
            account_1.Account.countDocuments(),
            account_1.Account.countDocuments({ 'kyc.status': account_1.KycStatus.VERIFIED }),
            account_1.Account.countDocuments({ 'kyc.status': account_1.KycStatus.UNVERIFIED }),
            account_1.Account.countDocuments({ 'kyc.status': account_1.KycStatus.PENDING }),
            account_1.Account.countDocuments({ status: account_1.UserStatus.SUSPENDED }),
        ]);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Stats fetched!', null, {
            total,
            verified,
            unverified,
            pending,
            suspended,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching data!');
    }
};
exports.getStats = getStats;
const searchSlash = async (req, res) => {
    try {
        let { query, hubId, status = 'all', page, limit, } = req.query;
        const { error } = joi_1.default.object({
            query: validationSchema_1.default.text,
            hubId: validationSchema_1.default.objectId.optional(),
            status: validationSchema_1.default.strings.optional().valid(...Object.values(slash_1.SlashStatus), 'all'),
            page: validationSchema_1.default.number,
            limit: validationSchema_1.default.number,
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error?.details[0].message);
        page = Number(page) || 1;
        limit = Number(limit) || 20;
        // Build match conditions
        const matchConditions = {};
        // Only add search conditions if query exists
        if (query && query.trim()) {
            matchConditions.$or = [
                { 'product.name': { $regex: query, $options: 'i' } },
                { 'hub.name': { $regex: query, $options: 'i' } },
                { 'createdBy.name': { $regex: query, $options: 'i' } },
                { _id: { $regex: query, $options: 'i' } },
            ];
        }
        if (status !== 'all') {
            matchConditions.status = status;
        }
        if (hubId) {
            matchConditions.hub = hubId;
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
                        status: 1,
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
const dissolveSlash = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        // Check if slash exist and refund all joined users
        let slash = await slash_1.Slash.findById(id).populate('product');
        if (!slash)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Slash not found!');
        const joinedUsers = slash.joined;
        if (joinedUsers.length < 1)
            return (0, responseService_1.resSender)(res, 403, 'fail', 'This slash has no user!');
        const product = slash.product;
        if (!product)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Product not found!');
        const price = product.pricePerSlot;
        for (const user of joinedUsers) {
            await account_1.Account.findOneAndUpdate({ _id: user.user }, { $inc: { walletBalance: price } }, { returnDocument: 'after' });
        }
        slash = await slash_1.Slash.findByIdAndUpdate(id, {
            $set: { status: slash_1.SlashStatus.DISSOLVED },
        });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Slash dissolved!', null, slash);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error dissolving slash!');
    }
};
exports.dissolveSlash = dissolveSlash;
const suspendUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        await account_1.Account.findByIdAndUpdate(id, {
            $set: { status: account_1.UserStatus.SUSPENDED },
        }, { returnDocument: 'after' });
        return (0, responseService_1.resSender)(res, 200, 'success', 'User suspended!');
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Unable to suspend user, try again!');
    }
};
exports.suspendUser = suspendUser;
const fetchHubs = async (req, res) => {
    try {
        let { query, status = 'all', page, limit, } = req.query;
        const { error } = joi_1.default.object({
            query: validationSchema_1.default.strings.required(), // Make query required for search
            status: validationSchema_1.default.strings.optional().valid('all', 'active', 'inactive', 'suspended'),
            page: validationSchema_1.default.number,
            limit: validationSchema_1.default.number,
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error?.details[0].message);
        page = Number(page) || 1;
        limit = Number(limit) || 20;
        // Build match conditions
        const matchConditions = {
        //   status: SlashStatus.OPEN,
        };
        // Only add search conditions if query exists
        if (query && query.trim()) {
            matchConditions.$or = [
                { name: { $regex: query, $options: 'i' } },
                { city: { $regex: query, $options: 'i' } },
                { state: { $regex: query, $options: 'i' } },
            ];
        }
        if (status !== 'all') {
            matchConditions.status = status;
        }
        const hubs = await hubAttendant_1.Hub.find(matchConditions);
        const total = await hubAttendant_1.Hub.countDocuments(matchConditions);
        if (hubs.length === 0) {
            return (0, responseService_1.resSender)(res, 200, 'success', 'No hub found', null, {
                hubs: [],
                page,
                total: 0,
                totalPages: 0,
            });
        }
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, {
            hubs,
            page,
            total,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching hubs!');
    }
};
exports.fetchHubs = fetchHubs;
const changeHubStatus = async (req, res) => {
    try {
        const { hubId, status } = req.body;
        const { error } = joi_1.default.object({
            hubId: validationSchema_1.default.objectId,
            status: validationSchema_1.default.strings.valid(...Object.values(hubAttendant_1.HubStatus)),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        // Find the hub
        const hub = await hubAttendant_1.Hub.findById(hubId);
        if (!hub)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Hub not found!');
        if (hub.status === status)
            return (0, responseService_1.resSender)(res, 403, 'fail', `Hub status is already ${hub.status}`);
        hub.status = status;
        return (0, responseService_1.resSender)(res, 200, 'success', 'Status changed!');
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(Error, res, 'Error changing status!');
    }
};
exports.changeHubStatus = changeHubStatus;
const createHub = async (req, res) => {
    try {
        const { name, city, state, address } = req.body;
        const { error } = joi_1.default.object({
            name: validationSchema_1.default.strings,
            city: validationSchema_1.default.strings,
            state: validationSchema_1.default.strings,
            address: validationSchema_1.default.strings,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const newHub = new hubAttendant_1.Hub({
            name,
            city,
            state,
            address,
        });
        await newHub.save();
        return (0, responseService_1.resSender)(res, 201, 'success', 'Hub created!', null, newHub);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error creating hub!');
    }
};
exports.createHub = createHub;
const fetchHubById = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        let sum = 0;
        const hub = await hubAttendant_1.Hub.findById(id).populate('attendant', 'name');
        if (!hub)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Hub not found!');
        const hubRating = await hubAttendant_1.HubRating.find({ hub: id });
        const totalRatings = hubRating.length;
        hubRating.map((rating) => {
            const score = rating.rating;
            if (score >= 1 && score <= 5) {
                sum += score;
            }
        });
        console.log('Hub total score: ', sum);
        const averageRating = totalRatings ? Number((sum / totalRatings).toFixed(1)) : 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const slashes = await slash_1.Slash.find({ hub: id });
        const slashToday = slashes.filter((slash) => {
            return slash.createdAt && slash.createdAt >= today;
        });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Hub fetched!', null, {
            hub: {
                ...hub,
                averageRating,
                totalReviews: totalRatings,
                slashToday,
                totalSlashes: slashes.length ?? 0,
            },
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching hub!');
    }
};
exports.fetchHubById = fetchHubById;
const asignAttendantToHub = async (req, res) => {
    try {
        const { hubId, attendantId } = req.body;
        const { error } = joi_1.default.object({
            hubId: validationSchema_1.default.objectId,
            attendantId: validationSchema_1.default.objectId,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const hub = await hubAttendant_1.Hub.findById(hubId);
        if (!hub)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Hub not found!');
        const attendant = await hubAttendant_1.Attendant.findById(attendantId);
        if (!attendant)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Attendant not found or does not exist!');
        if (hub.attendant && hub.attendant.toString() !== attendantId.toString())
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Hub already has an attendant, please unassign first!');
        if (attendant.hub && attendant.hub.toString() !== hubId.toString())
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Attendant is already assigned to a hub, please unassign first!');
        hub.attendant = attendant._id;
        attendant.hub = hub._id;
        await attendant.save();
        await hub.save();
        return (0, responseService_1.resSender)(res, 200, 'success', 'Attendant assigned to hub');
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Cant assign attendant');
    }
};
exports.asignAttendantToHub = asignAttendantToHub;
const createAttendant = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        const { error } = joi_1.default.object({
            // hubId: validationSchema.objectId,
            name: validationSchema_1.default.strings,
            phone: validationSchema_1.default.phoneNumber,
            email: validationSchema_1.default.email,
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        console.log('Validation DOne');
        const { hashedPin, pin } = (0, exports.generatePin)();
        // let hub: IHub | null = null;
        // Find hub
        // if (hubId) {
        //   hub = await Hub.findById(hubId);
        //   if (!hub) console.log('Hub does not exist'); // return resSender(res, 404, 'fail', 'Hub not found!');
        // }
        console.log('Got here!');
        const newAttendant = new hubAttendant_1.Attendant({
            name,
            phone,
            email,
            emailVerified: true,
            password: hashedPin,
            // hub: hub?._id ?? undefined,
            joinedAt: new Date(),
        });
        await newAttendant.save();
        // hub?.attendant = newAttendant._id;
        // await hub.save();
        console.log('Saved');
        return (0, responseService_1.resSender)(res, 201, 'success', 'Attendant created!', null, {
            attendant: (0, modifyResponse_1.modifyUserResponse)(newAttendant),
            pin,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error creating attendant!');
    }
};
exports.createAttendant = createAttendant;
const fetchAttendants = async (req, res) => {
    try {
        const attendants = await hubAttendant_1.Attendant.find().populate('hub', 'name');
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, attendants);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching attendants!');
    }
};
exports.fetchAttendants = fetchAttendants;
const resetAttendantPin = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = joi_1.default.object({
            id: validationSchema_1.default.objectId,
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const { hashedPin, pin } = (0, exports.generatePin)();
        const attendant = await hubAttendant_1.Attendant.findByIdAndUpdate(id, {
            $set: { password: hashedPin },
        });
        if (!attendant)
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Operation failed, try again!');
        return (0, responseService_1.resSender)(res, 200, 'success', 'Pin reset!', null, pin);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Unable to reset pin!');
    }
};
exports.resetAttendantPin = resetAttendantPin;
const changeAttendantStatus = async (req, res) => {
    try {
        const { attendantId, status } = req.body;
        const { error } = joi_1.default.object({
            attendantId: validationSchema_1.default.objectId,
            status: validationSchema_1.default.strings.valid(...Object.values(hubAttendant_1.HubStatus)),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        // Find the attendant
        const attendant = await hubAttendant_1.Attendant.findById(attendantId);
        if (!attendant)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Attendant not found!');
        if (attendant.status === status)
            return (0, responseService_1.resSender)(res, 403, 'fail', `Attendant status is already ${attendant.status}`);
        attendant.status = status;
        return (0, responseService_1.resSender)(res, 200, 'success', 'Attendant status changed!');
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(Error, res, 'Error changing status!');
    }
};
exports.changeAttendantStatus = changeAttendantStatus;
const generatePin = () => {
    let pin = '567890'; //Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPin = bcryptjs_1.default.hashSync(pin, bcryptjs_1.default.genSaltSync(15));
    return { hashedPin, pin };
};
exports.generatePin = generatePin;
