import multer from 'multer';
import path from 'path';

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

export const upload = multer({ storage: diskStorage });

// Memory storage — necessário para uploads diretos ao S3 (file.buffer disponível)
export const uploadMemory = multer({ storage: multer.memoryStorage() });
