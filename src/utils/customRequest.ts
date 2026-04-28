import { Request as ExpressRequest, RequestHandler } from 'express';
import { IAccount, IAdmin } from '../models/account';
import { IAttendant } from '../models/hubAttendant';

export interface Request extends ExpressRequest {
  user?: IAccount | IAttendant | IAdmin;
  userRole?: string;
}

// export type CustomRequestHandler = RequestHandler<
//   any, // Params
//   any, // ResBody
//   any, // ReqBody
//   any, // ReqQuery
//   Record<string, any>
// >;
