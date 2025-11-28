const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /xlsx|xls|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.includes('spreadsheet') || 
                   file.mimetype.includes('excel') || 
                   file.mimetype.includes('csv');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

module.exports = upload;
