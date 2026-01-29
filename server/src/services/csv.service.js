// CSV Generation Service - No Google APIs needed!

export const generateOfficerReportCSV = (issues, stats, categoryStats, officerName) => {
    try {
        const csvRows = [];

        // Add header with report info
        csvRows.push(['UDAAY - Municipal Issue Management System']);
        csvRows.push(['Officer Report']);
        csvRows.push([]);
        csvRows.push(['Generated:', new Date().toLocaleString()]);
        csvRows.push(['Officer:', officerName || 'Municipal Officer']);
        csvRows.push([]);

        // Key Metrics Section
        csvRows.push(['=== KEY METRICS ===']);
        const total = stats.pending + stats.inProgress + stats.resolved;
        const resolutionRate = total > 0 ? ((stats.resolved / total) * 100).toFixed(1) : '0';

        csvRows.push(['Metric', 'Value']);
        csvRows.push(['Total Issues', total]);
        csvRows.push(['Pending Review', stats.pending]);
        csvRows.push(['In Progress', stats.inProgress]);
        csvRows.push(['Resolved', stats.resolved]);
        csvRows.push(['Resolution Rate', `${resolutionRate}%`]);
        csvRows.push([]);

        // Category Breakdown
        csvRows.push(['=== CATEGORY BREAKDOWN ===']);
        csvRows.push(['Category', 'Count', 'Percentage']);
        const totalCat = Object.values(categoryStats).reduce((a, b) => a + b, 0);
        Object.entries(categoryStats)
            .sort(([, a], [, b]) => b - a)
            .forEach(([category, count]) => {
                const percentage = totalCat > 0 ? ((count / totalCat) * 100).toFixed(1) : '0';
                csvRows.push([
                    category.charAt(0).toUpperCase() + category.slice(1),
                    count,
                    `${percentage}%`
                ]);
            });
        csvRows.push([]);

        // Priority Distribution
        csvRows.push(['=== PRIORITY DISTRIBUTION ===']);
        csvRows.push(['Priority', 'Count']);
        ['critical', 'high', 'medium', 'low'].forEach(severity => {
            const count = issues.filter(i => i.severity === severity).length;
            csvRows.push([
                severity.charAt(0).toUpperCase() + severity.slice(1),
                count
            ]);
        });
        csvRows.push([]);

        // Issues List
        csvRows.push(['=== DETAILED ISSUES LIST ===']);
        csvRows.push([
            'Issue ID',
            'Title',
            'Category',
            'Priority',
            'Status',
            'Upvotes',
            'Location',
            'Created Date',
            'Address'
        ]);

        issues.forEach(issue => {
            csvRows.push([
                String(issue._id).substring(0, 8),
                issue.title,
                issue.category.charAt(0).toUpperCase() + issue.category.slice(1),
                issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1),
                issue.status.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                issue.upvotes || 0,
                issue.location.city || 'N/A',
                new Date(issue.createdAt).toLocaleDateString(),
                issue.location.address || 'N/A'
            ]);
        });

        // Convert to CSV string
        const csvContent = csvRows.map(row =>
            row.map(cell => {
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                const cellStr = String(cell || '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',')
        ).join('\n');

        return csvContent;
    } catch (error) {
        console.error('Error generating CSV:', error);
        throw error;
    }
};
