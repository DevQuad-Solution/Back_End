import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { modifyUserResponse } from '../../utils/modifyResponse';
import Joi from 'joi';
import validationSchema from '../../utils/validationSchema';
import { Schema } from 'mongoose';
import { Product } from '../../models/product';

export const fetchProducts = async (req: Request, res: Response) => {
  try {
    const allProducts = Product.find();
    return resSender(res, 200, 'success', 'Fetched!', null, allProducts);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching products!');
  }
};
