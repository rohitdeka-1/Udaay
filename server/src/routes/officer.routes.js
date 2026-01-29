import express from 'express';
import { generateOfficerReportCSV } from '../services/csv.service.js';
import Issue from '../models/issue.model.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   POST /api/officer/generate-report
// @desc    Generate CSV report for officer dashboard
// @access  Protected (officers only)
router.post('/generate-report', protect, async (req, res) => {
  try {
    const { officerName } = req.body;

    // Fetch all issues
    const issues = await Issue.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Calculate stats
    const stats = {
      pending: issues.filter(i => i.status === 'pending-review' || i.status === 'live' || i.status === 'pending').length,
      inProgress: issues.filter(i => i.status === 'in-progress').length,
      resolved: issues.filter(i => i.status === 'resolved' || i.status === 'awaiting-verification').length,
    };

    // Calculate category stats
    const categoryStats = {};
    issues.forEach(issue => {
      const category = issue.category || 'other';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    // Generate CSV
    const csvContent = generateOfficerReportCSV(issues, stats, categoryStats, officerName);

    // Set headers for CSV download
    const filename = `Udaay_Issue_Report_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.status(200).send(csvContent);

  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message,
    });
  }
});

export default router;
