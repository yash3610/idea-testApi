const express = require('express');
const router = express.Router();
const {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  addNote,
  updateNote,
  deleteNote,
  getAllTags,
  importLeads,
  exportLeads
} = require('../controllers/leadController');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleAuth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(protect);

// Get all tags (accessible to all authenticated users)
router.get('/tags/all', getAllTags);

// Import/Export routes (admin only)
router.post('/import', isAdmin, upload.single('file'), importLeads);
router.get('/export', exportLeads);

// CRUD routes
router.route('/')
  .get(getLeads)
  .post(isAdmin, createLead);

router.route('/:id')
  .get(getLead)
  .put(updateLead)
  .delete(isAdmin, deleteLead);

// Notes routes
router.post('/:id/notes', addNote);
router.put('/:id/notes/:noteId', updateNote);
router.delete('/:id/notes/:noteId', deleteNote);

module.exports = router;
