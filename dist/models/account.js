"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Admin = exports.Account = exports.AppRole = exports.UserStatus = exports.KycStatus = void 0;
const mongoose_1 = require("mongoose");
var KycStatus;
(function (KycStatus) {
    KycStatus["VERIFIED"] = "Verified";
    KycStatus["UNVERIFIED"] = "Unverified";
    KycStatus["PENDING"] = "Pending";
    KycStatus["REJECTED"] = "Rejected";
})(KycStatus || (exports.KycStatus = KycStatus = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "Active";
    UserStatus["SUSPENDED"] = "Suspended";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var AppRole;
(function (AppRole) {
    AppRole["USER"] = "user";
    AppRole["ATTENDANT"] = "attendant";
    AppRole["ADMIN"] = "admin";
})(AppRole || (exports.AppRole = AppRole = {}));
const userAccountSchema = new mongoose_1.Schema({
    name: String,
    email: { type: String, required: false },
    emailVerified: { type: Boolean, default: false },
    password: String,
    phone: String,
    role: { type: String, enum: Object.values(AppRole), default: 'user' },
    hub: { type: mongoose_1.Types.ObjectId, ref: 'Hub' },
    kyc: {
        nin: String,
        status: { type: String, enum: Object.values(KycStatus), default: KycStatus.UNVERIFIED },
    },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
    joined: { type: Number, default: 0 },
    totalSPend: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    userAccountDetails: {
        bankName: String,
        accountName: String,
        accountNumber: String,
        accountRef: String,
    },
}, { timestamps: true });
userAccountSchema.index({ email: 1 });
const adminSchema = new mongoose_1.Schema({
    name: String,
    email: { type: String, required: false },
    emailVerified: { type: Boolean, default: false },
    password: String,
    phone: String,
    role: { type: String, enum: ['admin', 'super admin'], default: 'admin' },
});
const Account = (0, mongoose_1.model)('Account', userAccountSchema);
exports.Account = Account;
const Admin = (0, mongoose_1.model)('Admin', adminSchema);
exports.Admin = Admin;
