const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadPath = process.env.UPLOAD_PATH || './uploads';
console.log('Upload path:', uploadPath);
console.log('Upload path exists:', fs.existsSync(uploadPath));

if (!fs.existsSync(uploadPath)) {
  console.log('Creating upload directory...');
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log('Upload directory created');
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Saving file to:', uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    console.log('File accepted:', file.originalname);
    return cb(null, true);
  } else {
    console.log('File rejected:', file.originalname, 'Mimetype:', file.mimetype);
    cb(new Error('Only images are allowed!'));
  }
};

// Maximum file size (5MB)
const maxSize = process.env.MAX_FILE_SIZE || 5242880;
console.log('Max file size:', maxSize);

// Create upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: maxSize },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  console.error('Multer error:', error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files uploaded.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + error.message });
  } else if (error) {
    return res.status(400).json({ message: error.message });
  }
  next();
};

module.exports = {
  upload,
  handleMulterError
};