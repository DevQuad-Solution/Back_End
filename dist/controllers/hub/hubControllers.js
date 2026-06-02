"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateHub = exports.fetchHubRatings = exports.fetchHubsByStateAndCity = exports.fetchCitiesByState = exports.fetchStates = void 0;
const responseService_1 = require("../../utils/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../utils/validationSchema"));
const hubAttendant_1 = require("../../models/hubAttendant");
const hubAttendant_2 = require("../../models/hubAttendant");
const fetchStates = async (req, res) => {
    try {
        const statesWithCityCount = await hubAttendant_1.Hub.aggregate([
            { $group: { _id: '$state', cities: { $addToSet: '$city' } } },
            { $project: { state: '$_id', cityCount: { $size: '$cities' }, _id: 0 } },
        ]);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, statesWithCityCount);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching states');
    }
};
exports.fetchStates = fetchStates;
const fetchCitiesByState = async (req, res) => {
    try {
        const { state } = req.params;
        const citiesWithHubCount = await hubAttendant_1.Hub.aggregate([
            { $match: { state } },
            { $group: { _id: '$city', hubCount: { $sum: 1 } } },
            { $project: { city: '$_id', hubCount: 1, _id: 0 } },
        ]);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, citiesWithHubCount);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching cities');
    }
};
exports.fetchCitiesByState = fetchCitiesByState;
const fetchHubsByStateAndCity = async (req, res) => {
    try {
        const { state, city } = req.params;
        const hubs = await hubAttendant_1.Hub.find({ state, city }).populate('attendant', 'name');
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched!', null, hubs);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching hubs');
    }
};
exports.fetchHubsByStateAndCity = fetchHubsByStateAndCity;
const fetchHubRatings = async (req, res) => {
    try {
        const { hubId } = req.params;
        const { error } = joi_1.default.object({
            hubId: validationSchema_1.default.objectId.required(),
        }).validate(req.params);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const hubExists = await hubAttendant_1.Hub.findById(hubId);
        if (!hubExists)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Hub not found');
        const ratings = await hubAttendant_2.HubRating.find({ hub: hubId })
            .populate('user', 'name')
            .sort({ createdAt: -1 });
        const totalRatings = ratings.length;
        const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let sum = 0;
        const reviews = ratings.map((ratingDoc) => {
            const rating = ratingDoc;
            const user = rating.user;
            const score = Number(rating.rating);
            if (score >= 1 && score <= 5) {
                starCounts[score] += 1;
            }
            sum += score;
            return {
                id: rating._id,
                userName: user?.name || 'Anonymous',
                rating: score,
                comment: rating.comment,
                slashId: rating.slash?.toString?.() ?? null,
                createdAt: rating.createdAt,
            };
        });
        const averageRating = totalRatings ? Number((sum / totalRatings).toFixed(1)) : 0;
        const fiveStarPercent = totalRatings ? Math.round((starCounts[5] / totalRatings) * 100) : 0;
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fetched hub ratings', null, {
            statistics: {
                totalRatings,
                averageRating,
                fiveStarPercent,
                starCounts,
            },
            reviews,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching hub ratings');
    }
};
exports.fetchHubRatings = fetchHubRatings;
const rateHub = async (req, res) => {
    try {
        const { hubId } = req.params;
        const { rating, comment, slashId } = req.body;
        const { error: paramError } = joi_1.default.object({
            hubId: validationSchema_1.default.objectId.required(),
        }).validate(req.params);
        if (paramError)
            return (0, responseService_1.resSender)(res, 400, 'fail', paramError.details[0].message);
        const { error } = joi_1.default.object({
            rating: validationSchema_1.default.number.min(1).max(5).required(),
            comment: validationSchema_1.default.strings.optional(),
            slashId: validationSchema_1.default.objectId.optional(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        if (!req.user || !req.user._id) {
            return (0, responseService_1.resSender)(res, 401, 'fail', 'Unauthorized');
        }
        const hubExists = await hubAttendant_1.Hub.findById(hubId);
        if (!hubExists)
            return (0, responseService_1.resSender)(res, 404, 'fail', 'Hub not found');
        const findQuery = { hub: hubId, user: req.user._id };
        if (slashId)
            findQuery.slash = slashId;
        const ratingDoc = await hubAttendant_2.HubRating.findOneAndUpdate(findQuery, {
            hub: hubId,
            user: req.user._id,
            rating,
            comment,
            slash: slashId,
        }, {
            returnDocument: 'after',
            upsert: true,
            setDefaultsOnInsert: true,
        });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Rating saved successfully', null, ratingDoc);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error saving hub rating');
    }
};
exports.rateHub = rateHub;
