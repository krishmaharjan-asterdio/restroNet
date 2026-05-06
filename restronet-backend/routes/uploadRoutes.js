const express = require('express');
const { uploadLogoImage, uploadGalleryImages } = require('../controllers/uploadController');
const { protectAdmin } = require('../middleware/authMiddleware');
const { uploadLogo, uploadGallery, handleUpload } = require('../config/multer');

const router = express.Router();

router.post('/logo', protectAdmin, handleUpload(uploadLogo), uploadLogoImage);
router.post('/gallery', protectAdmin, handleUpload(uploadGallery), uploadGalleryImages);

module.exports = router;
