"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// import cron from 'node-cron';
const hubAttendant_1 = require("../models/hubAttendant");
const product_1 = require("../models/product");
const account_1 = require("../models/account");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function performBackup() {
    // MongoDB connection URI
    const dbUri = 'mongodb+srv://kolawoleakintayok_db_user:sFIVa6RgRnnGRlDm@slashit.hxy7wad.mongodb.net/?appName=slashit';
    // process.env.NODE_ENV === 'production' ? process.env.LIVE_MONGO_URI! : process.env.MONGODB_URI!;
    console.log('URI: ', dbUri);
    if (!dbUri) {
        throw new Error('MongoDB URI is not defined');
    }
    const dbName = 'm360';
    // Backup directory
    const backupDir = path_1.default.join(__dirname, '..', '..', 'backups');
    // Ensure backup directory exists
    if (!fs_1.default.existsSync(backupDir)) {
        fs_1.default.mkdirSync(backupDir);
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path_1.default.join(backupDir, `backup-${timestamp}`);
    const command = `mongodump --uri="${dbUri}" --out=${backupPath} --quiet`;
    (0, child_process_1.exec)(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Backup failed with exit code ${error.code}: ${error.message}`);
            if (stderr)
                console.error(`Error details: ${stderr}`);
            return;
        }
        console.log(`Backup completed successfully at ${timestamp}`);
        console.log(`Backup location: ${backupPath}`);
        // Optional: Log any warnings that might appear in stderr
        if (stderr) {
            console.warn(`Backup warnings: ${stderr}`);
        }
    });
}
// // Perform initial backup
// performBackup();
// // Schedule backup every 24 hours
// setInterval(performBackup, 24 * 60 * 60 * 1000);
// // For 3 minutes testing:
// setInterval(performBackup, 3 * 60 * 1000);
// console.log('MongoDB backup script is running. Backups will be performed every 24 hours.');
// Clean up files older than 24 hours every day at 3 AM
// cron.schedule('0 3 * * *', () => {
//   const cutoff = Date.now() - 24 * 60 * 60 * 1000;
//   fs.readdir('temp/', (err: any, files: any[]) => {
//     if (err) {
//       return console.log('Error cleaning: ', err);
//     }
//     console.log('Files: ', files);
//     files.forEach((file) => {
//       const filePath = path.join('temp/', file);
//       const stats = fs.statSync(filePath);
//       if (stats.mtimeMs < cutoff) {
//         fs.unlinkSync(filePath);
//       }
//     });
//   });
// });
async function seedData() {
    const hubExist = await hubAttendant_1.Hub.findOne();
    const productExist = await product_1.Product.findOne();
    const admin = await account_1.Admin.findOne({ email: 'kolawoleakintayok@gmail.com' });
    if (!hubExist) {
        await hubAttendant_1.Hub.create({
            name: 'Default Hub',
            state: 'Oyo',
            city: 'Ibadan',
            address: 'UI Ibadan, Oojo',
            status: hubAttendant_1.HubStatus.ACTIVE,
        });
    }
    if (!productExist) {
        await product_1.Product.create({
            name: '50kg bad of rice',
            totalValue: 100000,
            pricePerSlot: 10000,
            noOfSlots: 10,
            quantity: 1,
            category: 'Grains',
        });
    }
    if (!admin) {
        const password = process.env.ADMIN_PWD;
        await account_1.Admin.create({
            name: 'Kolawole Akintayo',
            email: 'kolawoleakintayok@gmail.com',
            emailVerified: true,
            password: bcryptjs_1.default.hashSync(password, bcryptjs_1.default.genSaltSync(15)),
            phone: '09076889241',
            role: 'super admin',
        });
    }
}
seedData();
