import { MongoClient } from 'mongodb';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { Hub, HubStatus } from '../models/hubAttendant';

async function performBackup() {
  // MongoDB connection URI
  const uri = 'mongodb://localhost:27017';
  const dbName = 'm360';

  // Backup directory
  const backupDir = path.join(__dirname, '..', '..', 'backups');

  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${timestamp}`);

  const command = `mongodump --uri="${uri}" --db=${dbName} --out=${backupPath} --quiet`;

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

// For 3 minutes testing:
// setInterval(performBackup, 3 * 60 * 1000);

console.log('MongoDB backup script is running. Backups will be performed every 24 hours.');

// Clean up files older than 24 hours every day at 3 AM
cron.schedule('0 3 * * *', () => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  fs.readdir('temp/', (err: any, files: any[]) => {
    if (err) {
      return console.log('Error cleaning: ', err);
    }
    console.log('Files: ', files);

    files.forEach((file) => {
      const filePath = path.join('temp/', file);
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
      }
    });
  });
});

async function createDefaultHub() {
  const hubExist = await Hub.findOne();
  if (!hubExist) {
    const newHub = new Hub({
      name: 'Default Hub',
      state: 'Oyo',
      city: 'Ibadan',
      address: 'UI Ibadan, Oojo',
      status: HubStatus.ACTIVE,
    });

    await newHub.save();
  }
}
createDefaultHub();
