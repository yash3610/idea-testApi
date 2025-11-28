const Lead = require('../models/Lead');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const xlsx = require('xlsx');
const fs = require('fs');

exports.getLeads = async (req, res) => {
  try {
    const {
      status,
      tags,
      assignedTo,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = {};

    // For agents, only show their assigned leads
    if (req.user.role === 'agent') {
      query.assignedTo = req.user._id;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Filter by assigned agent
    if (assignedTo && req.user.role !== 'agent') {
      query.assignedTo = assignedTo;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Search by name, email, or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Lead.countDocuments(query);

    res.json({
      success: true,
      count: leads.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: leads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('notes.createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    if (req.user.role === 'agent' && 
        lead.assignedTo && 
        lead.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this lead'
      });
    }

    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.createLead = async (req, res) => {
  try {
    const { name, email, phone, source, status, tags, assignedTo } = req.body;

    const lead = await Lead.create({
      name,
      email,
      phone,
      source,
      status: status || 'New',
      tags: tags || [],
      assignedTo,
      createdBy: req.user._id
    });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'CREATE_LEAD',
      resource: 'lead',
      resourceId: lead._id,
      details: `Created lead: ${name}`,
      ipAddress: req.ip
    });

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: populatedLead
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateLead = async (req, res) => {
  try {
    let lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check if agent is authorized to update this lead
    if (req.user.role === 'agent' && 
        lead.assignedTo && 
        lead.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lead'
      });
    }

    const { name, email, phone, source, status, tags, assignedTo } = req.body;

    // Update fields
    if (name) lead.name = name;
    if (email) lead.email = email;
    if (phone) lead.phone = phone;
    if (source) lead.source = source;
    if (status) lead.status = status;
    if (tags) lead.tags = tags;
    
    // Only admins can reassign leads
    if (assignedTo && (req.user.role === 'superadmin' || req.user.role === 'subadmin')) {
      lead.assignedTo = assignedTo;
    }

    await lead.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'UPDATE_LEAD',
      resource: 'lead',
      resourceId: lead._id,
      details: `Updated lead: ${lead.name}`,
      ipAddress: req.ip
    });

    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email');

    res.json({
      success: true,
      data: updatedLead
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    await lead.deleteOne();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'DELETE_LEAD',
      resource: 'lead',
      resourceId: lead._id,
      details: `Deleted lead: ${lead.name}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.addNote = async (req, res) => {
  try {
    const { content } = req.body;

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Check authorization for agents
    if (req.user.role === 'agent' && 
        lead.assignedTo && 
        lead.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add notes to this lead'
      });
    }

    lead.notes.push({
      content,
      createdBy: req.user._id
    });

    await lead.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'ADD_NOTE',
      resource: 'lead',
      resourceId: lead._id,
      details: `Added note to lead: ${lead.name}`,
      ipAddress: req.ip
    });

    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('notes.createdBy', 'name email');

    res.json({
      success: true,
      data: updatedLead
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { content } = req.body;

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const note = lead.notes.id(req.params.noteId);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Only the creator can update the note
    if (note.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this note'
      });
    }

    note.content = content;
    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate('notes.createdBy', 'name email');

    res.json({
      success: true,
      data: updatedLead
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const note = lead.notes.id(req.params.noteId);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Only the creator or admin can delete the note
    if (note.createdBy.toString() !== req.user._id.toString() && 
        req.user.role === 'agent') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this note'
      });
    }

    lead.notes.pull(req.params.noteId);
    await lead.save();

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getAllTags = async (req, res) => {
  try {
    const tags = await Lead.distinct('tags');

    res.json({
      success: true,
      count: tags.length,
      data: tags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Import leads from Excel
exports.importLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const leads = [];
    const errors = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Validate required fields
        if (!row.name || !row.email || !row.phone) {
          errors.push({
            row: i + 2,
            error: 'Missing required fields (name, email, phone)',
            data: row
          });
          errorCount++;
          continue;
        }

        // Check if lead already exists
        const existingLead = await Lead.findOne({ 
          $or: [
            { email: row.email.toLowerCase() },
            { phone: row.phone }
          ]
        });

        if (existingLead) {
          errors.push({
            row: i + 2,
            error: 'Lead already exists with this email or phone',
            data: row
          });
          errorCount++;
          continue;
        }

        // Create lead object
        const leadData = {
          name: row.name,
          email: row.email.toLowerCase(),
          phone: row.phone,
          source: row.source || 'Import',
          status: row.status || 'New',
          tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : [],
          createdBy: req.user._id
        };

        // Assign to agent if specified
        if (row.assignedTo) {
          const agent = await User.findOne({ 
            email: row.assignedTo.toLowerCase(),
            role: 'agent',
            isActive: true 
          });
          if (agent) {
            leadData.assignedTo = agent._id;
          }
        }

        const lead = await Lead.create(leadData);
        leads.push(lead);
        successCount++;

      } catch (error) {
        errors.push({
          row: i + 2,
          error: error.message,
          data: row
        });
        errorCount++;
      }
    }

    // Delete uploaded file
    fs.unlinkSync(filePath);

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'IMPORT_LEADS',
      resource: 'lead',
      details: `Imported ${successCount} leads successfully, ${errorCount} failed`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Import completed. ${successCount} leads imported successfully, ${errorCount} failed.`,
      successCount,
      errorCount,
      leads,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Import leads error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export leads to Excel
exports.exportLeads = async (req, res) => {
  try {
    const filter = {};
    
    // Apply filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.tags) filter.tags = { $in: req.query.tags.split(',') };
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.source) filter.source = req.query.source;
    
    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
    }

    // Search filter
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Role-based filtering
    if (req.user.role === 'agent') {
      filter.assignedTo = req.user._id;
    }

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Format data for Excel
    const excelData = leads.map(lead => ({
      'Lead ID': lead._id.toString(),
      'Name': lead.name,
      'Email': lead.email,
      'Phone': lead.phone,
      'Source': lead.source,
      'Status': lead.status,
      'Tags': lead.tags.join(', '),
      'Assigned To': lead.assignedTo ? lead.assignedTo.name : 'Unassigned',
      'Assigned To Email': lead.assignedTo ? lead.assignedTo.email : '',
      'Created By': lead.createdBy ? lead.createdBy.name : '',
      'Created Date': new Date(lead.createdAt).toLocaleDateString(),
      'Last Updated': new Date(lead.updatedAt).toLocaleDateString(),
      'Notes Count': lead.notes.length
    }));

    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 30 }, { wch: 20 },
      { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
    ];

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');

    // Generate buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=leads_export_${Date.now()}.xlsx`);

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'EXPORT_LEADS',
      resource: 'lead',
      details: `Exported ${leads.length} leads`,
      ipAddress: req.ip
    });

    res.send(buffer);

  } catch (error) {
    console.error('Export leads error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
