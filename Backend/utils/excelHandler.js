const XLSX = require('xlsx');
const Lead = require('../models/Lead');
const ActivityLog = require('../models/ActivityLog');

exports.importLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file'
      });
    }

    // Read the Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const leads = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        if (!row.name || !row.email || !row.phone || !row.source) {
          errors.push({
            row: i + 2, // +2 because Excel rows start at 1 and first row is header
            error: 'Missing required fields (name, email, phone, source)'
          });
          continue;
        }

        // Create lead object
        const leadData = {
          name: row.name,
          email: row.email,
          phone: row.phone,
          source: row.source,
          status: row.status || 'New',
          tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : [],
          createdBy: req.user._id
        };

        leads.push(leadData);
      } catch (error) {
        errors.push({
          row: i + 2,
          error: error.message
        });
      }
    }

    // Insert valid leads
    let insertedLeads = [];
    if (leads.length > 0) {
      insertedLeads = await Lead.insertMany(leads);
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'IMPORT_LEADS',
      resource: 'lead',
      details: `Imported ${insertedLeads.length} leads from Excel`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Successfully imported ${insertedLeads.length} leads`,
      data: {
        imported: insertedLeads.length,
        failed: errors.length,
        errors: errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.exportLeads = async (req, res) => {
  try {
    const {
      status,
      tags,
      assignedTo,
      dateFrom,
      dateTo
    } = req.query;

    let query = {};

    if (req.user.role === 'agent') {
      query.assignedTo = req.user._id;
    }

    if (status) query.status = status;
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    if (assignedTo && req.user.role !== 'agent') {
      query.assignedTo = assignedTo;
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Fetch leads
    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Prepare data for Excel
    const excelData = leads.map(lead => ({
      'Name': lead.name,
      'Email': lead.email,
      'Phone': lead.phone,
      'Source': lead.source,
      'Status': lead.status,
      'Tags': lead.tags.join(', '),
      'Assigned To': lead.assignedTo ? lead.assignedTo.name : 'Unassigned',
      'Created By': lead.createdBy ? lead.createdBy.name : 'N/A',
      'Created At': new Date(lead.createdAt).toLocaleString(),
      'Updated At': new Date(lead.updatedAt).toLocaleString()
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'EXPORT_LEADS',
      resource: 'lead',
      details: `Exported ${leads.length} leads to Excel`,
      ipAddress: req.ip
    });

    // Set headers and send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=leads_export_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};