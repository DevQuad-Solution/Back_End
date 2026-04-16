// import { IEmployee } from "../models/employee";
import { IAccount } from '../models/account';

export const modifyUserResponse = (user: IAccount) => {
  user.password = 'undefined';
  return user;
};
