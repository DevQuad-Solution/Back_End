import { Response } from 'express';

/**
 * Function to send a standardized response
 * @param res - Express response object
 * @param code - HTTP status code
 * @param status - Status of the response (success/fail/error)
 * @param message - Message to be sent in the response
 * @param description - Full message explanation
 * @param data - Data to be sent in the response (optional)
 */
export const resSender = (
  res: Response,
  code: number,
  status: 'success' | 'fail' | 'error',
  message: string,
  description?: string | null,
  data: any = null,
) => {
  return res.status(code).json({
    status,
    message,
    description,
    data,
  });
};

export const errorHandler = (error: any, res: Response, message: string) => {
  console.log('Error occured: ', error.message);
  return resSender(res, 500, 'error', error.message || message);
};