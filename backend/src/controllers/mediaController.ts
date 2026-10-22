import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { db } from '../db.js';
import { StorageService } from '../services/storage.js';

// Setup multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.storage.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${uuidv4().substring(0, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 } // 150MB limit
}).single('file');

export async function uploadMedia(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded.' });
    return;
  }

  try {
    const file = req.file;
    const publicUrl = StorageService.getPublicUrl(file.filename);
    const user = await db.getDefaultUser();

    const mediaAsset = await db.createMediaAsset({
      user_id: user.id,
      file_url: publicUrl,
      file_type: file.mimetype,
      file_size: file.size,
      thumbnail_url: file.mimetype.startsWith('image/') ? publicUrl : undefined
    });

    res.status(201).json({
      success: true,
      media: mediaAsset
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Media upload failed' });
  }
}
