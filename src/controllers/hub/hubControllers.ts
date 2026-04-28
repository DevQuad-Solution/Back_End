import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import Joi from 'joi';
import validationSchema from '../../utils/validationSchema';
import { Hub } from '../../models/hubAttendant';
import { HubRating } from '../../models/hubAttendant';

export const fetchStates = async (req: Request, res: Response) => {
  try {
    const statesWithCityCount = await Hub.aggregate([
      { $group: { _id: '$state', cities: { $addToSet: '$city' } } },
      { $project: { state: '$_id', cityCount: { $size: '$cities' }, _id: 0 } },
    ]);

    return resSender(res, 200, 'success', 'Fetched!', null, statesWithCityCount);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching states');
  }
};

export const fetchCitiesByState = async (req: Request, res: Response) => {
  try {
    const { state } = req.params;
    const citiesWithHubCount = await Hub.aggregate([
      { $match: { state } },
      { $group: { _id: '$city', hubCount: { $sum: 1 } } },
      { $project: { city: '$_id', hubCount: 1, _id: 0 } },
    ]);

    return resSender(res, 200, 'success', 'Fetched!', null, citiesWithHubCount);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching cities');
  }
};

export const fetchHubsByStateAndCity = async (req: Request, res: Response) => {
  try {
    const { state, city } = req.params;
    const hubs = await Hub.find({ state, city }).populate('attendant', 'name');

    return resSender(res, 200, 'success', 'Fetched!', null, hubs);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching hubs');
  }
};

export const fetchHubRatings = async (req: Request, res: Response) => {
  try {
    const { hubId } = req.params;
    const { error } = Joi.object({
      hubId: validationSchema.objectId.required(),
    }).validate(req.params);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const hubExists = await Hub.findById(hubId);
    if (!hubExists) return resSender(res, 404, 'fail', 'Hub not found');

    const ratings = await HubRating.find({ hub: hubId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    const totalRatings = ratings.length;
    const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    const reviews = ratings.map((ratingDoc) => {
      const rating = ratingDoc as any;
      const user = rating.user as any;
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

    return resSender(res, 200, 'success', 'Fetched hub ratings', null, {
      statistics: {
        totalRatings,
        averageRating,
        fiveStarPercent,
        starCounts,
      },
      reviews,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching hub ratings');
  }
};

export const rateHub = async (req: Request, res: Response) => {
  try {
    const { hubId } = req.params;
    const { rating, comment, slashId } = req.body;
    const { error: paramError } = Joi.object({
      hubId: validationSchema.objectId.required(),
    }).validate(req.params);
    if (paramError) return resSender(res, 400, 'fail', paramError.details[0].message);

    const { error } = Joi.object({
      rating: validationSchema.number.min(1).max(5).required(),
      comment: validationSchema.strings.optional(),
      slashId: validationSchema.objectId.optional(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    if (!req.user || !req.user._id) {
      return resSender(res, 401, 'fail', 'Unauthorized');
    }

    const hubExists = await Hub.findById(hubId);
    if (!hubExists) return resSender(res, 404, 'fail', 'Hub not found');

    const findQuery: any = { hub: hubId, user: req.user._id };
    if (slashId) findQuery.slash = slashId;

    const ratingDoc = await HubRating.findOneAndUpdate(
      findQuery,
      {
        hub: hubId,
        user: req.user._id,
        rating,
        comment,
        slash: slashId,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return resSender(res, 200, 'success', 'Rating saved successfully', null, ratingDoc);
  } catch (error: any) {
    return errorHandler(error, res, 'Error saving hub rating');
  }
};
