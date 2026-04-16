import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { modifyUserResponse } from '../../utils/modifyResponse';
import Joi from 'joi';
import validationSchema from '../../utils/validationSchema';
import { Schema } from 'mongoose';
import { Hub } from '../../models/hubAttendant';

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
