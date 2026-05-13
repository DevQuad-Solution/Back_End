"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ensend_1 = require("ensend");
const ensendSecretKey = process.env.ENSEND_SECRET;
if (!ensendSecretKey) {
    throw new Error('Ensend config data missing!');
}
const ensend = new ensend_1.Client({
    secret: ensendSecretKey,
});
exports.default = ensend;
