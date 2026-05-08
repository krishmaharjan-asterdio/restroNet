const express = require('express');
const { uploadLogoImage, uploadGalleryImages, uploadMenuImages } = require('../controllers/uploadController');
const { protectAdmin } = require('../middleware/authMiddleware');
const { uploadLogo, uploadGallery, uploadMenu, handleUpload } = require('../config/multer');

const router = express.Router();

router.post('/logo', protectAdmin, handleUpload(uploadLogo), uploadLogoImage);
router.post('/gallery', protectAdmin, handleUpload(uploadGallery), uploadGalleryImages);
router.post('/menu', protectAdmin, handleUpload(uploadMenu), uploadMenuImages);

module.exports = router;
