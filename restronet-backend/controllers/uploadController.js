/**
 * @desc    Upload restaurant logo
 * @route   POST /api/upload/logo
 * @access  Private (Admin)
 */
const uploadLogoImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const filePath = `/uploads/logos/${req.file.filename}`;
    res.json({
      success: true,
      url: filePath,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload restaurant gallery images
 * @route   POST /api/upload/gallery
 * @access  Private (Admin)
 */
const uploadGalleryImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least one image' });
    }

    const filePaths = req.files.map(file => `/uploads/gallery/${file.filename}`);
    res.json({
      success: true,
      urls: filePaths,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadLogoImage,
  uploadGalleryImages,
};
