import { Request as ExpressRequest, RequestHandler } from "express";
import { IAccount } from "../models/account";

export interface Request extends ExpressRequest {
  user?: IAccount;
  userRole?: string;
}


// export type CustomRequestHandler = RequestHandler<
//   any, // Params
//   any, // ResBody
//   any, // ReqBody
//   any, // ReqQuery
//   Record<string, any>
// >;