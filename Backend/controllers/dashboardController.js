const Lead = require('../models/Lead');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let filter = {};
    
    // Support agents can only see their assigned leads
    if (userRole === 'agent') {
      filter.assignedTo = userId;
    }

    // Total leads
    const totalLeads = await Lead.countDocuments(filter);

    // Lead status distribution
    const statusDistribution = await Lead.aggregate([
      { $match: filter },
      { 
        $group: { 
          _id: '$status', 
          count: { $sum: 1 } 
        } 
      }
    ]);

    // Leads by source
    const leadsBySource = await Lead.aggregate([
      { $match: filter },
      { 
        $group: { 
          _id: '$source', 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Recent leads
    const recentLeads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    // Leads created in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLeadsCount = await Lead.countDocuments({
      ...filter,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Agent performance (Admin only)
    let agentPerformance = null;
    if (userRole !== 'agent') {
      agentPerformance = await Lead.aggregate([
        { 
          $match: { 
            assignedTo: { $exists: true, $ne: null } 
          } 
        },
        {
          $group: {
            _id: '$assignedTo',
            totalLeads: { $sum: 1 },
            wonLeads: {
              $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] }
            },
            lostLeads: {
              $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] }
            },
            qualifiedLeads: {
              $sum: { $cond: [{ $eq: ['$status', 'Qualified'] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'agent'
          }
        },
        { $unwind: '$agent' },
        {
          $project: {
            agentId: '$_id',
            agentName: '$agent.name',
            agentEmail: '$agent.email',
            totalLeads: 1,
            wonLeads: 1,
            lostLeads: 1,
            qualifiedLeads: 1,
            conversionRate: {
              $multiply: [
                { $divide: ['$wonLeads', '$totalLeads'] },
                100
              ]
            }
          }
        },
        { $sort: { totalLeads: -1 } }
      ]);
    }

    // Recent activities
    const recentActivities = await ActivityLog.find(
      userRole === 'agent' ? { user: userId } : {}
    )
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('user', 'name email role');

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await Lead.aggregate([
      { 
        $match: { 
          ...filter,
          createdAt: { $gte: sixMonthsAgo } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          won: {
            $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // User statistics (Admin only)
    let userStats = null;
    if (userRole !== 'agent') {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const usersByRole = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]);

      userStats = {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        byRole: usersByRole
      };
    }

    res.json({
      success: true,
      overview: {
        totalLeads,
        recentLeadsCount,
        statusDistribution,
        leadsBySource
      },
      recentLeads,
      agentPerformance,
      recentActivities,
      monthlyTrend,
      userStats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get lead statistics
exports.getLeadStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let filter = {};
    
    if (userRole === 'agent') {
      filter.assignedTo = userId;
    }

    const stats = await Lead.aggregate([
      { $match: filter },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          bySource: [
            { $group: { _id: '$source', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          byMonth: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0]
    });

  } catch (error) {
    console.error('Lead stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Functions are already exported above using exports.getDashboardStats and exports.getLeadStats
