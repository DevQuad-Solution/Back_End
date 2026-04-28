// import { IEmployee } from "../models/employee";
import { IAccount, IAdmin } from '../models/account';
import { IAttendant } from '../models/hubAttendant';

export const modifyUserResponse = (user: IAccount | IAttendant | IAdmin) => {
  user.password = 'undefined';
  return user;
};
