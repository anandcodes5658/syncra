import { Request, Response } from 'express';
import { db } from '../db.js';
import { queueWorker } from '../services/queueWorker.js';

export async function retryJob(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const job = await db.getPublishJob(id);
    if (!job) {
      res.status(404).json({ error: 'Publish job not found' });
      return;
    }

    // Reset status and enqueue
    await db.updatePublishJob(id, {
      job_status: 'pending',
      last_error: undefined
    });

    queueWorker.enqueue(id);

    res.json({
      success: true,
      message: `Publish job ${id} re-enqueued for processing`,
      job
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Retry job failed' });
  }
}
