"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailActivation = exports.welcomeEmail = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const welcomeEmail = ({ firstName }) => {
    // Read the HTML template
    const htmlTemplate = fs_1.default.readFileSync(path_1.default.join(__dirname, "..", "public", "mail", "welcomeMail.html"), "utf-8");
    // Compile the template
    const template = handlebars_1.default.compile(htmlTemplate);
    // Generate the final HTML content
    const htmlContent = template({ firstName });
    return htmlContent;
};
exports.welcomeEmail = welcomeEmail;
const emailActivation = ({ firstName, activationUrl, }) => {
    // Read the HTML template
    const htmlTemplate = fs_1.default.readFileSync(path_1.default.join(__dirname, "..", "public", "mail", "emailActivation.html"), "utf-8");
    // Compile the template
    const template = handlebars_1.default.compile(htmlTemplate);
    // Generate the final HTML content
    const htmlContent = template({ firstName, activationUrl });
    return htmlContent;
};
exports.emailActivation = emailActivation;
