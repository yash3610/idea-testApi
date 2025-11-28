const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// Get lead statistics
router.get('/lead-stats', dashboardController.getLeadStats);

module.exports = router;
