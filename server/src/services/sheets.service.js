import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account credentials
const getAuth = () => {
  try {
    // Use the Sheets-specific service account in server config
    const keyPath = path.join(__dirname, '../config/sheets-service-account.json');
    
    console.log('Loading service account from:', keyPath);
    
    // Verify file exists
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Service account key file not found at: ${keyPath}`);
    }
    
    // Read and log the service account email (for debugging)
    const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    console.log('Using service account:', keyData.client_email);
    console.log('Project ID:', keyData.project_id);
    
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });
    return auth;
  } catch (error) {
    console.error('Error loading service account:', error);
    throw error;
  }
};

export const generateOfficerReport = async (issues, stats, categoryStats, officerName) => {
  try {
    const auth = await getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Create a new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `Udaay Issue Report - ${new Date().toLocaleDateString()}`,
          locale: 'en_US',
        },
        sheets: [
          { properties: { title: 'Dashboard', gridProperties: { rowCount: 100, columnCount: 10 } } },
          { properties: { title: 'Issues List', gridProperties: { rowCount: 1000, columnCount: 10 } } },
          { properties: { title: 'Category Analysis', gridProperties: { rowCount: 50, columnCount: 5 } } },
          { properties: { title: 'Priority Breakdown', gridProperties: { rowCount: 50, columnCount: 5 } } },
        ],
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    const sheetIds = spreadsheet.data.sheets.map(s => s.properties.sheetId);

    // Prepare data for all sheets
    const total = stats.pending + stats.inProgress + stats.resolved;
    const resolutionRate = total > 0 ? ((stats.resolved / total) * 100).toFixed(1) : '0';

    // === DASHBOARD TAB ===
    const dashboardData = [
      ['UDAAY - Municipal Issue Management System'],
      ['Officer Report Dashboard'],
      [''],
      ['Generated:', new Date().toLocaleString()],
      ['Officer:', officerName || 'Municipal Officer'],
      [''],
      ['=== KEY METRICS ==='],
      ['Metric', 'Value'],
      ['Total Issues', total],
      ['Pending Review', stats.pending],
      ['In Progress', stats.inProgress],
      ['Resolved', stats.resolved],
      ['Resolution Rate', `${resolutionRate}%`],
      [''],
      ['=== QUICK SUMMARY ==='],
      ['Active Issues (Pending + In Progress)', stats.pending + stats.inProgress],
      ['Completion Status', `${stats.resolved} of ${total} resolved`],
    ];

    // === ISSUES LIST TAB ===
    const issuesData = [
      ['Issue ID', 'Title', 'Category', 'Priority', 'Status', 'Upvotes', 'Location', 'Created Date', 'Address'],
    ];
    issues.forEach(issue => {
      issuesData.push([
        issue._id.substring(0, 8),
        issue.title,
        issue.category.charAt(0).toUpperCase() + issue.category.slice(1),
        issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1),
        issue.status.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        issue.upvotes || 0,
        issue.location.city || 'N/A',
        new Date(issue.createdAt).toLocaleDateString(),
        issue.location.address || 'N/A',
      ]);
    });

    // === CATEGORY ANALYSIS TAB ===
    const categoryData = [
      ['Category', 'Count', 'Percentage'],
    ];
    const totalCat = Object.values(categoryStats).reduce((a, b) => a + b, 0);
    Object.entries(categoryStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        const percentage = totalCat > 0 ? ((count / totalCat) * 100).toFixed(1) : '0';
        categoryData.push([
          category.charAt(0).toUpperCase() + category.slice(1),
          count,
          parseFloat(percentage),
        ]);
      });

    // === PRIORITY BREAKDOWN TAB ===
    const priorityData = [
      ['Priority', 'Count'],
    ];
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const count = issues.filter(i => i.severity === severity).length;
      priorityData.push([
        severity.charAt(0).toUpperCase() + severity.slice(1),
        count,
      ]);
    });

    // Write data to sheets
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        data: [
          { range: 'Dashboard!A1', values: dashboardData },
          { range: 'Issues List!A1', values: issuesData },
          { range: 'Category Analysis!A1', values: categoryData },
          { range: 'Priority Breakdown!A1', values: priorityData },
        ],
        valueInputOption: 'USER_ENTERED',
      },
    });

    // Format the spreadsheet
    const requests = [
      // === DASHBOARD FORMATTING ===
      // Title row - merge and style
      {
        mergeCells: {
          range: { sheetId: sheetIds[0], startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        repeatCell: {
          range: { sheetId: sheetIds[0], startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 5 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
              textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 18, bold: true },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
            },
          },
          fields: 'userEnteredFormat',
        },
      },
      // Subtitle
      {
        mergeCells: {
          range: { sheetId: sheetIds[0], startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 5 },
          mergeType: 'MERGE_ALL',
        },
      },
      {
        repeatCell: {
          range: { sheetId: sheetIds[0], startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 5 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 },
              textFormat: { fontSize: 14, bold: true },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat',
        },
      },
      // Headers bold
      {
        repeatCell: {
          range: { sheetId: sheetIds[0], startRowIndex: 7, endRowIndex: 8, startColumnIndex: 0, endColumnIndex: 2 },
          cell: { userEnteredFormat: { textFormat: { bold: true } } },
          fields: 'userEnteredFormat.textFormat.bold',
        },
      },
      
      // === ISSUES LIST FORMATTING ===
      // Header row
      {
        repeatCell: {
          range: { sheetId: sheetIds[1], startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 9 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
              textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat',
        },
      },
      // Freeze header row
      {
        updateSheetProperties: {
          properties: { sheetId: sheetIds[1], gridProperties: { frozenRowCount: 1 } },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      // Auto-resize columns
      {
        autoResizeDimensions: {
          dimensions: { sheetId: sheetIds[1], dimension: 'COLUMNS', startIndex: 0, endIndex: 9 },
        },
      },

      // === CATEGORY ANALYSIS FORMATTING ===
      {
        repeatCell: {
          range: { sheetId: sheetIds[2], startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 3 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
              textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat',
        },
      },

      // === PRIORITY BREAKDOWN FORMATTING ===
      {
        repeatCell: {
          range: { sheetId: sheetIds[3], startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
              textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat',
        },
      },
    ];

    // Add pie chart for categories
    if (categoryData.length > 1) {
      requests.push({
        addChart: {
          chart: {
            spec: {
              title: 'Issues by Category',
              pieChart: {
                legendPosition: 'RIGHT_LEGEND',
                domain: { sourceRange: { sources: [{ sheetId: sheetIds[2], startRowIndex: 1, endRowIndex: categoryData.length, startColumnIndex: 0, endColumnIndex: 1 }] } },
                series: { sourceRange: { sources: [{ sheetId: sheetIds[2], startRowIndex: 1, endRowIndex: categoryData.length, startColumnIndex: 1, endColumnIndex: 2 }] } },
              },
            },
            position: { overlayPosition: { anchorCell: { sheetId: sheetIds[2], rowIndex: 1, columnIndex: 4 } } },
          },
        },
      });
    }

    // Add bar chart for priorities
    if (priorityData.length > 1) {
      requests.push({
        addChart: {
          chart: {
            spec: {
              title: 'Issues by Priority',
              basicChart: {
                chartType: 'COLUMN',
                legendPosition: 'BOTTOM_LEGEND',
                axis: [
                  { position: 'BOTTOM_AXIS', title: 'Priority Level' },
                  { position: 'LEFT_AXIS', title: 'Number of Issues' },
                ],
                domains: [{ domain: { sourceRange: { sources: [{ sheetId: sheetIds[3], startRowIndex: 1, endRowIndex: priorityData.length, startColumnIndex: 0, endColumnIndex: 1 }] } } }],
                series: [{ series: { sourceRange: { sources: [{ sheetId: sheetIds[3], startRowIndex: 1, endRowIndex: priorityData.length, startColumnIndex: 1, endColumnIndex: 2 }] } } }],
              },
            },
            position: { overlayPosition: { anchorCell: { sheetId: sheetIds[3], rowIndex: 1, columnIndex: 3 } } },
          },
        },
      });
    }

    // Apply all formatting
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });

    // Make the spreadsheet publicly accessible (anyone with link can view)
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    
    return {
      success: true,
      spreadsheetId,
      url: spreadsheetUrl,
    };

  } catch (error) {
    console.error('Error generating Google Sheet report:', error);
    throw error;
  }
};
