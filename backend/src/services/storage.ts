import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';

// Ensure upload directory exists
if (!fs.existsSync(config.storage.uploadDir)) {
  fs.mkdirSync(config.storage.uploadDir, { recursive: true });
}

export interface StoredFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  publicUrl: string;
  path: string;
}

export class StorageService {
  /**
   * Generates a relative public URL for web previews and direct browser requests
   */
  static getPublicUrl(filename: string): string {
    if (config.storage.provider === 'local') {
      return `/uploads/${filename}`;
    }
    // If S3 / R2 configured:
    return `https://${config.storage.bucket}.s3.amazonaws.com/${filename}`;
  }

  /**
   * Generates an absolute public HTTPS URL for external social media APIs (Meta, YouTube, etc.)
   */
  static getAbsolutePublicUrl(filenameOrPath: string): string {
    const filename = filenameOrPath.replace(/^\/uploads\//, '').replace(/^.*\/uploads\//, '');
    const baseUrl = process.env.RENDER_EXTERNAL_URL || config.appBaseUrl || 'https://syncra.io';
    return `${baseUrl.replace(/\/$/, '')}/uploads/${filename}`;
  }

  /**
   * Resolves the absolute local disk path for a stored upload
   */
  static getLocalFilePath(filenameOrPath: string): string {
    const filename = filenameOrPath.replace(/^\/uploads\//, '').replace(/^.*\/uploads\//, '');
    return path.join(config.storage.uploadDir, filename);
  }

  /**
   * Validates media file requirements per platform
   */
  static validatePlatformMedia(fileType: string, fileSize: number, platform: string): { valid: boolean; error?: string } {
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');

    if (platform === 'youtube' && !isVideo) {
      return { valid: false, error: 'YouTube requires a video file format (MP4, MOV, etc).' };
    }

    if (platform === 'instagram' && !isImage && !isVideo) {
      return { valid: false, error: 'Instagram requires either an image (JPEG, PNG) or video (MP4).' };
    }

    // Size checks (example 100MB max for MVP)
    if (fileSize > 100 * 1024 * 1024) {
      return { valid: false, error: 'File size exceeds maximum MVP limit of 100MB.' };
    }

    return { valid: true };
  }
}
