const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getLeadStatusDistribution,
  getAgentPerformance,
  getRecentActivity,
  getLeadsOverTime,
  getTopTags
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleCheck');

// All routes require authentication
router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/lead-status-distribution', getLeadStatusDistribution);
router.get('/agent-performance', isAdmin, getAgentPerformance);
router.get('/recent-activity', getRecentActivity);
router.get('/leads-over-time', getLeadsOverTime);
router.get('/top-tags', getTopTags);

module.exports = router;
