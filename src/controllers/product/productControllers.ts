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
    const allProducts = await Product.find();
    return resSender(res, 200, 'success', 'Fetched!', null, allProducts);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching products!');
  }
};

export const addProducts = async (req: Request, res: Response) => {
  try {
    const { name, noOfSlots, totalValue, quantity, category, emoji, description, patner } =
      req.body;
    const { error } = Joi.object({
      name: validationSchema.strings,
      noOfSlots: validationSchema.number.required(),
      totalValue: validationSchema.number.required(),
      quantity: validationSchema.number.required(),
      category: validationSchema.strings,
      emoji: validationSchema.text,
      description: validationSchema.text,
      patner: validationSchema.text,
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const newProduct = new Product({
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
    return resSender(res, 201, 'success', 'Product added!', null, newProduct);
  } catch (error: any) {
    return errorHandler(error, res, 'Error adding product!');
  }
};

export const changeProductStatus = async (req: Request, res: Response) => {
  try {
    const { productId, status } = req.body;
    const { error } = Joi.object({
      productId: validationSchema.objectId,
      status: validationSchema.strings.valid('Active', 'Inactive'),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    // Find the product
    const product = await Product.findById(productId);
    if (!product) return resSender(res, 404, 'fail', 'Product not found!');
    if (product.status === status)
      return resSender(res, 403, 'fail', `Product status is already ${product.status}`);
    product.status = status;

    return resSender(res, 200, 'success', 'Product status changed!');
  } catch (error: any) {
    return errorHandler(Error, res, 'Error changing status!');
  }
};
