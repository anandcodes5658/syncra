import { Request, Response } from 'express';
import { AIService } from '../services/aiService.js';

export async function generateCaptions(req: Request, res: Response): Promise<void> {
  try {
    const { master_caption, tone } = req.body;
    if (!master_caption || typeof master_caption !== 'string' || !master_caption.trim()) {
      res.status(400).json({ error: 'master_caption string is required.' });
      return;
    }

    const platformCaptions = await AIService.generatePlatformCaptions(master_caption, tone);

    res.json({
      success: true,
      data: platformCaptions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate platform captions' });
  }
}
