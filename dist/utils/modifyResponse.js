"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modifyUserResponse = void 0;
const modifyUserResponse = (user) => {
    user.password = 'undefined';
    return user;
};
exports.modifyUserResponse = modifyUserResponse;
