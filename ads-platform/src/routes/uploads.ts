import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { requireAuth } from '../auth';

export const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, uuid() + path.extname(file.originalname).toLowerCase()),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => cb(null, ALLOWED.has(file.mimetype)),
});

const router = Router();

/** POST /api/uploads — رفع صورة إعلان (png/jpeg/webp/gif حتى 2MB)، يعيد رابطها */
router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'تعذّر الرفع — الحد 2MB ونوع مدعوم فقط' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'ملف صورة غير صالح (png/jpeg/webp/gif)' });
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
