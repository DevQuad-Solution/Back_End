import cron from 'node-cron';
import { runFoodRadar } from '../utils/ai/radar';
import { AISettings } from '../models/ai/AISettings';

export const startRadarJob = () => {
  // Run every 4 hours: 0 */4 * * *
  cron.schedule('0 */4 * * *', async () => {
    console.log('[Radar Job] Starting scheduled run at', new Date().toISOString());
    try {
      await runFoodRadar();
      console.log('[Radar Job] Completed successfully');
    } catch (err: any) {
      console.error('[Radar Job] Failed:', err.message);
    }
  });

  // Reset AI budget pause at midnight every day
  cron.schedule('0 0 * * *', async () => {
    await AISettings.findOneAndUpdate({}, { pausedForBudget: false });
    console.log('[AI Guard] Daily budget reset');
  });

  console.log('[Radar Job] Cron scheduled --- runs every 4 hours');
};

export const stopRadarJob = () => {
  // For testing purposes - get all tasks and stop them
  const tasks = cron.getTasks();
  tasks.forEach((task) => task.stop());
};
