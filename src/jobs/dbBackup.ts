import { MongoClient } from 'mongodb';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
// import cron from 'node-cron';
import { Attendant, Hub, HubStatus } from '../models/hubAttendant';
import { Product } from '../models/product';
import { Admin } from '../models/account';
import bcrypt from 'bcryptjs';
import { generatePin } from '../controllers/admin/adminControllers';

async function performBackup() {
  // MongoDB connection URI
  const dbUri =
    'mongodb+srv://kolawoleakintayok_db_user:sFIVa6RgRnnGRlDm@slashit.hxy7wad.mongodb.net/?appName=slashit';
  // process.env.NODE_ENV === 'production' ? process.env.LIVE_MONGO_URI! : process.env.MONGODB_URI!;
  // console.log('URI: ', dbUri);
  if (!dbUri) {
    throw new Error('MongoDB URI is not defined');
  }
  const dbName = 'm360';

  // Backup directory
  const backupDir = path.join(__dirname, '..', '..', 'backups');

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${timestamp}`);

  const command = `mongodump --uri="${dbUri}" --out=${backupPath} --quiet`;

  exec(command, (error: any, stdout: any, stderr: any) => {
    if (error) {
      console.error(`Backup failed with exit code ${error.code}: ${error.message}`);
      if (stderr) console.error(`Error details: ${stderr}`);
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
  const hubExist = await Hub.findOne();
  const productExist = await Product.findOne();
  const admin = await Admin.findOne();
  const att = await Attendant.findOne();
  if (!hubExist) {
    await Hub.create({
      name: 'Default Hub',
      state: 'Oyo',
      city: 'Ibadan',
      address: 'UI Ibadan, Oojo',
      status: HubStatus.ACTIVE,
    });
  }
  if (!productExist) {
    await Product.create({
      name: '50kg bad of rice',
      totalValue: 100000,
      pricePerSlot: 10000,
      noOfSlots: 10,
      quantity: 1,
      category: 'Grains',
    });
  }
  if (!att) {
    let { hashedPin, pin } = generatePin();
    // console.log('Att Pin: ', pin);
    await Attendant.create({
      name: 'Attendant 1',
      email: 'attendant@slashit.com',
      phone: '09159048727',
      emailVerified: true,
      password: hashedPin,
      joinedAt: new Date(),
    });
  }
  if (!admin) {
    const password = process.env.ADMIN_PWD!;
    const password2 = process.env.ADMIN_PWD2!;
    await Admin.create({
      name: 'Kolawole Akintayo',
      email: 'kolawoleakintayok@gmail.com',
      emailVerified: true,
      password: bcrypt.hashSync(password, bcrypt.genSaltSync(15)),
      phone: '09076889241',
      role: 'admin',
    });
    await Admin.create({
      name: 'Slashit Admin',
      email: 'admin@slashit.com',
      emailVerified: true,
      password: bcrypt.hashSync(password2, bcrypt.genSaltSync(15)),
      phone: '08159875674',
      role: 'admin',
    });
  }
}
seedData();
