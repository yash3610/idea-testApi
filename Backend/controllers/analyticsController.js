const Lead = require('../models/Lead');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

exports.getDashboardStats = async (req, res) => {
  try {
    const stats = {};

    // For agents
    const isAgent = req.user.role === 'agent';
    const agentFilter = isAgent ? { assignedTo: req.user._id } : {};

    // Total leads
    stats.totalLeads = await Lead.countDocuments(agentFilter);

    // Leads by status
    const leadsByStatus = await Lead.aggregate([
      { $match: agentFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    stats.leadsByStatus = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Lost: 0,
      Won: 0
    };

    leadsByStatus.forEach(item => {
      stats.leadsByStatus[item._id] = item.count;
    });

    // Recent leads
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    stats.recentLeads = await Lead.countDocuments({
      ...agentFilter,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Conversion rate (Won / Total)
    if (stats.totalLeads > 0) {
      stats.conversionRate = ((stats.leadsByStatus.Won / stats.totalLeads) * 100).toFixed(2);
    } else {
      stats.conversionRate = 0;
    }

    // Admin-only stats
    if (!isAgent) {
      // Total users
      stats.totalUsers = await User.countDocuments();
      stats.activeUsers = await User.countDocuments({ isActive: true });

      // Users by role
      const usersByRole = await User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]);

      stats.usersByRole = {};
      usersByRole.forEach(item => {
        stats.usersByRole[item._id] = item.count;
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getLeadStatusDistribution = async (req, res) => {
  try {
    const isAgent = req.user.role === 'agent';
    const agentFilter = isAgent ? { assignedTo: req.user._id } : {};

    const distribution = await Lead.aggregate([
      { $match: agentFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      data: distribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAgentPerformance = async (req, res) => {
  try {
    const agents = await User.find({ 
      role: 'agent',
      isActive: true 
    }).select('name email');

    const performance = [];

    for (const agent of agents) {
      const totalLeads = await Lead.countDocuments({ assignedTo: agent._id });
      
      const leadsByStatus = await Lead.aggregate([
        { $match: { assignedTo: agent._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const statusCounts = {
        New: 0,
        Contacted: 0,
        Qualified: 0,
        Lost: 0,
        Won: 0
      };

      leadsByStatus.forEach(item => {
        statusCounts[item._id] = item.count;
      });

      const conversionRate = totalLeads > 0 
        ? ((statusCounts.Won / totalLeads) * 100).toFixed(2)
        : 0;

      performance.push({
        agent: {
          id: agent._id,
          name: agent.name,
          email: agent.email
        },
        totalLeads,
        statusCounts,
        conversionRate: parseFloat(conversionRate)
      });
    }

    // Sort by conversion rate
    performance.sort((a, b) => b.conversionRate - a.conversionRate);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const query = req.user.role === 'agent' 
      ? { user: req.user._id }
      : {};

    const activities = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('user', 'name email role');

    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getLeadsOverTime = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const days = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const isAgent = req.user.role === 'agent';
    const agentFilter = isAgent ? { assignedTo: req.user._id } : {};

    const leadsOverTime = await Lead.aggregate([
      {
        $match: {
          ...agentFilter,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      data: leadsOverTime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getTopTags = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const isAgent = req.user.role === 'agent';
    const agentFilter = isAgent ? { assignedTo: req.user._id } : {};

    const topTags = await Lead.aggregate([
      { $match: agentFilter },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          tag: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      data: topTags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
