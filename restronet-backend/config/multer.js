const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Multer configuration for handling restaurant logo and gallery image uploads.
 * Files are stored on disk under /uploads/{logos|gallery}/
 */

// ─── Ensure Upload Directories Exist ─────────────────────────────────────────
const uploadDirs = [
  path.join(__dirname, '../uploads/logos'),
  path.join(__dirname, '../uploads/gallery'),
  path.join(__dirname, '../uploads/misc'),
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─── Storage Engine ───────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Choose subfolder based on fieldname
    if (file.fieldname === 'logo') {
      cb(null, path.join(__dirname, '../uploads/logos'));
    } else if (file.fieldname === 'gallery') {
      cb(null, path.join(__dirname, '../uploads/gallery'));
    } else {
      cb(null, path.join(__dirname, '../uploads/misc'));
    }
  },
  filename: (req, file, cb) => {
    // Sanitize filename: timestamp + original extension
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// ─── File Filter (Images Only) ────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
  }
};

// ─── Multer Instances ─────────────────────────────────────────────────────────
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB default

/** Single logo upload */
const uploadLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('logo');

/** Multiple gallery images (max 10) */
const uploadGallery = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).array('gallery', 10);

/** Combined: logo + gallery in one request */
const uploadRestaurantImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
]);

// ─── Multer Error Handler Wrapper ─────────────────────────────────────────────
/**
 * Wraps a multer middleware to handle MulterError and pass to next(err)
 * @param {Function} upload - multer upload function
 */
const handleUpload = (upload) => (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = {
  uploadLogo,
  uploadGallery,
  uploadRestaurantImages,
  handleUpload,
};
