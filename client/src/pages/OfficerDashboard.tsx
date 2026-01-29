import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Clock, MapPin, TrendingUp, ChevronRight, Play, LayoutDashboard, FileText, BarChart3, User, AlertCircle, Filter, X, Download } from "lucide-react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "live" | "in-progress" | "awaiting-verification" | "resolved" | "rejected";
  location: {
    address?: string;
    city?: string;
    lat: number;
    lng: number;
  };
  createdAt: string;
  upvotes: number;
  imageUrl: string;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dash" },
  { icon: FileText, label: "Tasks" },
  { icon: BarChart3, label: "Stats" },
];

const getPriorityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return {
        badge: "bg-red-500 text-white",
        icon: "bg-red-500/10 text-red-500",
      };
    case "high":
      return {
        badge: "bg-orange-500 text-white",
        icon: "bg-orange-500/10 text-orange-500",
      };
    case "medium":
      return {
        badge: "bg-yellow-500 text-white",
        icon: "bg-yellow-500/10 text-yellow-500",
      };
    case "low":
      return {
        badge: "bg-green-500 text-white",
        icon: "bg-green-500/10 text-green-500",
      };
    default:
      return {
        badge: "bg-gray-500 text-white",
        icon: "bg-gray-500/10 text-gray-500",
      };
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "roads":
      return "🛣️";
    case "garbage":
      return "🗑️";
    case "water":
      return "💧";
    case "electricity":
      return "⚡";
    default:
      return "📋";
  }
};

const OfficerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [activeNav, setActiveNav] = useState("Dash");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    resolved: 0,
    efficiency: 92,
  });
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchIssues();
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (filter === "all") {
      setFilteredIssues(issues);
    } else {
      setFilteredIssues(issues.filter(issue => issue.severity === filter));
    }
  }, [filter, issues]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/issues/live?includeAll=true`);
      const allIssues = response.data.data?.issues || response.data.issues || [];

      // Filter for live, pending, in-progress and awaiting-verification issues (exclude resolved)
      const activeIssues = allIssues.filter(
        (issue: Issue) => issue.status === "live" || issue.status === "pending" || issue.status === "in-progress" || issue.status === "awaiting-verification"
      );

      // Sort by severity: critical > high > medium > low
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      activeIssues.sort((a: Issue, b: Issue) => {
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      setIssues(activeIssues);
      setFilteredIssues(activeIssues);

      // Get recent issues (last 24 hours) for notifications
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recent = allIssues
        .filter((i: Issue) => new Date(i.createdAt) > oneDayAgo && (i.status === "live" || i.status === "pending"))
        .sort((a: Issue, b: Issue) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
      setRecentIssues(recent);

      // Calculate stats
      const pendingCount = allIssues.filter((i: Issue) => i.status === "pending" || i.status === "live").length;
      const inProgressCount = allIssues.filter((i: Issue) => i.status === "in-progress").length;
      const resolvedCount = allIssues.filter((i: Issue) =>
        i.status === "resolved" || i.status === "awaiting-verification"
      ).length;
      const total = pendingCount + inProgressCount + resolvedCount;
      const efficiency = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

      setStats({
        pending: pendingCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        efficiency,
      });

      // Calculate category stats
      const catStats: Record<string, number> = {};
      allIssues.forEach((issue: Issue) => {
        catStats[issue.category] = (catStats[issue.category] || 0) + 1;
      });
      setCategoryStats(catStats);
    } catch (error) {
      console.error("Error fetching issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = async (issueId: string) => {
    try {
      // Update issue status to in-progress
      await axios.patch(`${API_URL}/issues/${issueId}`, {
        status: "in-progress"
      });

      // Refresh issues to update the UI
      await fetchIssues();

      // Switch to Tasks tab to show the in-progress issue
      setActiveNav("Tasks");
    } catch (error) {
      console.error("Error starting work:", error);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const downloadReport = async () => {
    let loadingToast: HTMLDivElement | null = null;

    try {
      // Show loading toast
      loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 bg-primary text-primary-foreground px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      loadingToast.innerHTML = `
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Generating CSV Report...</span>
      `;
      document.body.appendChild(loadingToast);

      // Call backend API to generate CSV
      const response = await axios.post(`${API_URL}/officer/generate-report`, {
        officerName: user?.name || 'Municipal Officer'
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob' // Important for file download
      });

      // Remove loading toast
      if (loadingToast && document.body.contains(loadingToast)) {
        document.body.removeChild(loadingToast);
        loadingToast = null;
      }

      // Create download link for CSV
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Udaay_Issue_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success toast
      const successToast = document.createElement('div');
      successToast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      successToast.innerHTML = `
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span class="font-medium">CSV Report Downloaded Successfully!</span>
      `;
      document.body.appendChild(successToast);

      // Auto-remove toast after 5 seconds
      setTimeout(() => {
        if (document.body.contains(successToast)) {
          document.body.removeChild(successToast);
        }
      }, 5000);
    } catch (error: any) {
      console.error('Error generating report:', error);

      // Ensure loading toast is removed on error
      try {
        if (loadingToast && document.body.contains(loadingToast)) {
          document.body.removeChild(loadingToast);
          loadingToast = null;
        }
      } catch (removeError) {
        console.error('Error removing loading toast:', removeError);
      }

      // Show error toast
      const errorToast = document.createElement('div');
      errorToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      errorToast.innerHTML = `
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <span>Failed to generate report. Please try again.</span>
      `;
      document.body.appendChild(errorToast);

      setTimeout(() => {
        if (document.body.contains(errorToast)) {
          document.body.removeChild(errorToast);
        }
      }, 7000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo_png.png"
              alt="Udaay"
              className="h-10 w-10 object-contain"
            />
            <span className="font-display font-semibold">Udaay Officer</span>
          </div>
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Bell size={22} className="text-muted-foreground" />
              {recentIssues.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">New Issues</h3>
                    <p className="text-xs text-muted-foreground">{recentIssues.length} new in last 24h</p>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X size={16} className="text-muted-foreground" />
                  </button>
                </div>

                {recentIssues.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={32} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No new issues</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentIssues.map((issue) => {
                      const priorityColors = getPriorityColor(issue.severity);
                      return (
                        <div
                          key={issue._id}
                          onClick={() => {
                            setShowNotifications(false);
                            setSelectedIssue(issue);
                          }}
                          className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${priorityColors.icon}`}>
                              <span className="text-lg">{getCategoryIcon(issue.category)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded ${priorityColors.badge}`}>
                                  {issue.severity}
                                </span>
                                <span className="text-xs text-muted-foreground">{getTimeAgo(issue.createdAt)}</span>
                              </div>
                              <h4 className="text-sm font-semibold text-foreground line-clamp-1 mb-1">{issue.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{issue.description}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin size={12} />
                                <span className="line-clamp-1">{issue.location.address || issue.location.city || 'Location'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pb-24">
        {activeNav === "Dash" && (
          <>
            {/* Welcome Section */}
            <div className="mb-6">
              <h1 className="font-display font-bold text-2xl text-foreground mb-1">
                Officer Dashboard
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.name || "Officer"}. Review and act on pending infrastructure requests.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="card-civic-elevated">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
                    <Clock size={20} className="text-yellow-500" />
                  </div>
                  <p className="font-display font-bold text-2xl text-foreground">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pending</p>
                </div>
              </div>

              <div className="card-civic-elevated">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                    <Play size={20} className="text-blue-500" />
                  </div>
                  <p className="font-display font-bold text-2xl text-foreground">{stats.inProgress}</p>
                  <p className="text-xs text-muted-foreground mt-1">In Progress</p>
                </div>
              </div>

              <div className="card-civic-elevated">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 size={20} className="text-green-500" />
                  </div>
                  <p className="font-display font-bold text-2xl text-foreground">{stats.resolved}</p>
                  <p className="text-xs text-muted-foreground mt-1">Resolved</p>
                </div>
              </div>
            </div>

            {/* Priority Filter */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-lg">Active Issues</h2>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-muted-foreground" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="card-civic-elevated text-center py-12">
                  <CheckCircle2 size={48} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No {filter !== "all" ? filter + " priority" : ""} issues found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIssues.map((issue) => {
                    const priorityColors = getPriorityColor(issue.severity);
                    return (
                      <div
                        key={issue._id}
                        className="card-civic-elevated hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setSelectedIssue(issue)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${priorityColors.icon}`}>
                            <span className="text-2xl">{getCategoryIcon(issue.category)}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded ${priorityColors.badge}`}>
                                {issue.severity}
                              </span>
                              <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground uppercase">
                                {issue.category}
                              </span>
                              {issue.status === "in-progress" && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-500 uppercase flex items-center gap-1">
                                  <Play size={12} />
                                  In Progress
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-foreground mb-1 line-clamp-2">{issue.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{issue.description}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin size={14} />
                              <span className="line-clamp-1">{issue.location.address || `${issue.location.city || 'Location'}`}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Reported {getTimeAgo(issue.createdAt)}</span>
                            <span className="flex items-center gap-1">
                              <TrendingUp size={14} />
                              {issue.upvotes} upvotes
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartWork(issue._id);
                            }}
                            className="btn-civic-primary px-4 py-2 text-sm gap-2"
                          >
                            <Play size={14} />
                            {issue.status === "in-progress" ? "Continue" : "Start"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeNav === "Stats" && (
          <>
            {/* Stats Header with Download Button */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="font-display font-bold text-2xl text-foreground mb-1">
                  Performance Statistics
                </h1>
                <p className="text-muted-foreground">
                  Detailed insights and analytics for your department
                </p>
              </div>
            </div>

            {/* Download Report Card */}
            <div className="mb-6">
              <div className="card-civic-elevated bg-gradient-to-br from-primary/5 to-success/5 border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BarChart3 size={24} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Download Full Report</p>
                      <p className="text-xs text-muted-foreground">Export all statistics as CSV file</p>
                    </div>
                  </div>
                  <button
                    onClick={downloadReport}
                    className="btn-civic-primary py-2 px-4 gap-2"
                  >
                    <Download size={18} />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {/* Overall Performance */}
            <div className="mb-6">
              <h2 className="font-display font-semibold text-lg mb-3">Overall Performance</h2>
              <div className="card-civic-elevated">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted-foreground">Resolution Rate</span>
                  <span className="font-display font-bold text-2xl text-foreground">{stats.efficiency}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-success transition-all duration-300"
                    style={{ width: `${stats.efficiency}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{stats.pending + stats.inProgress + stats.resolved}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Issues</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
                    <p className="text-xs text-muted-foreground mt-1">Resolved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground mt-1">Active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="mb-6">
              <h2 className="font-display font-semibold text-lg mb-3">Issues by Category</h2>
              <div className="space-y-3">
                {Object.entries(categoryStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => {
                    const total = Object.values(categoryStats).reduce((a, b) => a + b, 0);
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={category} className="card-civic-elevated">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getCategoryIcon(category)}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-foreground capitalize">{category}</span>
                              <span className="text-sm text-muted-foreground">{count} issues ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Priority Distribution */}
            <div className="mb-6">
              <h2 className="font-display font-semibold text-lg mb-3">Priority Distribution</h2>
              <div className="grid grid-cols-2 gap-3">
                {["critical", "high", "medium", "low"].map((severity) => {
                  const count = issues.filter(i => i.severity === severity).length;
                  const priorityColors = getPriorityColor(severity);
                  return (
                    <div key={severity} className="card-civic-elevated">
                      <div className="text-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 ${priorityColors.icon}`}>
                          <AlertCircle size={24} />
                        </div>
                        <p className="font-display font-bold text-2xl text-foreground">{count}</p>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{severity}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="mb-6">
              <h2 className="font-display font-semibold text-lg mb-3">Status Overview</h2>
              <div className="card-civic-elevated space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-500/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <Clock size={20} className="text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Pending Review</p>
                      <p className="text-xs text-muted-foreground">Awaiting action</p>
                    </div>
                  </div>
                  <span className="font-display font-bold text-xl text-foreground">{stats.pending}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-500/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Play size={20} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">In Progress</p>
                      <p className="text-xs text-muted-foreground">Being worked on</p>
                    </div>
                  </div>
                  <span className="font-display font-bold text-xl text-foreground">{stats.inProgress}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-500/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Resolved</p>
                      <p className="text-xs text-muted-foreground">Successfully completed</p>
                    </div>
                  </div>
                  <span className="font-display font-bold text-xl text-foreground">{stats.resolved}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeNav === "Tasks" && (
          <>
            {/* Tasks Header */}
            <div className="mb-6">
              <h1 className="font-display font-bold text-2xl text-foreground mb-1">
                My Tasks
              </h1>
              <p className="text-muted-foreground">
                Issues currently assigned to you
              </p>
            </div>

            {/* In Progress Issues */}
            <div className="mb-6">
              <h2 className="font-display font-semibold text-lg mb-3">In Progress ({stats.inProgress})</h2>
              {issues.filter(i => i.status === "in-progress").length === 0 ? (
                <div className="card-civic-elevated text-center py-12">
                  <Play size={48} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No tasks in progress</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.filter(i => i.status === "in-progress").map((issue) => {
                    const priorityColors = getPriorityColor(issue.severity);
                    return (
                      <div
                        key={issue._id}
                        onClick={() => setSelectedIssue(issue)}
                        className="card-civic-elevated hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${priorityColors.icon}`}>
                            <span className="text-xl">{getCategoryIcon(issue.category)}</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground line-clamp-1">{issue.title}</h3>
                            <p className="text-xs text-muted-foreground">{issue.category} • {getTimeAgo(issue.createdAt)}</p>
                          </div>
                          <ChevronRight size={20} className="text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Awaiting Verification Issues */}
            <div className="mb-6">
              <h2 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-amber-500" />
                Awaiting Verification ({issues.filter(i => i.status === "awaiting-verification").length})
              </h2>
              {issues.filter(i => i.status === "awaiting-verification").length === 0 ? (
                <div className="card-civic-elevated text-center py-12">
                  <CheckCircle2 size={48} className="mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No issues awaiting verification</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.filter(i => i.status === "awaiting-verification").map((issue) => {
                    const priorityColors = getPriorityColor(issue.severity);
                    return (
                      <div
                        key={issue._id}
                        onClick={() => setSelectedIssue(issue)}
                        className="card-civic-elevated hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-amber-500"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${priorityColors.icon}`}>
                            <span className="text-xl">{getCategoryIcon(issue.category)}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground line-clamp-1">{issue.title}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground">{issue.category} • Waiting for citizen confirmation</p>
                          </div>
                          <ChevronRight size={20} className="text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = activeNav === item.label;
            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                className={`bottom-nav-item ${isActive ? "active" : ""}`}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-background w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg">Issue Details</h2>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Priority and Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded ${getPriorityColor(selectedIssue.severity).badge}`}>
                  {selectedIssue.severity}
                </span>
                <span className="text-xs px-3 py-1.5 rounded bg-muted text-muted-foreground uppercase">
                  {selectedIssue.category}
                </span>
                <span className={`text-xs px-3 py-1.5 rounded uppercase flex items-center gap-1 ${selectedIssue.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500' :
                  selectedIssue.status === 'resolved' || selectedIssue.status === 'awaiting-verification' ? 'bg-green-500/10 text-green-500' :
                    'bg-yellow-500/10 text-yellow-500'
                  }`}>
                  {selectedIssue.status === 'in-progress' && <Play size={12} />}
                  {(selectedIssue.status === 'resolved' || selectedIssue.status === 'awaiting-verification') && <CheckCircle2 size={12} />}
                  {selectedIssue.status === 'pending' && <Clock size={12} />}
                  {selectedIssue.status}
                </span>
              </div>

              {/* Title */}
              <div>
                <h3 className="font-display font-bold text-xl text-foreground mb-2">{selectedIssue.title}</h3>
                <p className="text-muted-foreground">{selectedIssue.description}</p>
              </div>

              {/* Image */}
              {selectedIssue.imageUrl && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={selectedIssue.imageUrl}
                    alt={selectedIssue.title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}

              {/* Location */}
              <div className="card-civic-elevated">
                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-primary mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">Location</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedIssue.location.address || selectedIssue.location.city || 'Location not specified'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Coordinates: {selectedIssue.location.lat.toFixed(6)}, {selectedIssue.location.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card-civic-elevated">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={16} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Reported</span>
                  </div>
                  <p className="font-semibold text-foreground">{getTimeAgo(selectedIssue.createdAt)}</p>
                </div>
                <div className="card-civic-elevated">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={16} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Support</span>
                  </div>
                  <p className="font-semibold text-foreground">{selectedIssue.upvotes} upvotes</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                {selectedIssue.status !== 'in-progress' && selectedIssue.status !== 'awaiting-verification' && selectedIssue.status !== 'resolved' && (
                  <button
                    onClick={async () => {
                      await handleStartWork(selectedIssue._id);
                      setSelectedIssue(null);
                    }}
                    className="btn-civic-primary flex-1 py-3 gap-2"
                  >
                    <Play size={16} />
                    Start Working
                  </button>
                )}
                {selectedIssue.status === 'in-progress' && (
                  <button
                    onClick={async () => {
                      try {
                        await axios.patch(`${API_URL}/issues/${selectedIssue._id}`, {
                          status: "awaiting-verification"
                        });
                        await fetchIssues();
                        setSelectedIssue(null);
                      } catch (error) {
                        console.error("Error marking issue for verification:", error);
                      }
                    }}
                    className="btn-civic-primary flex-1 py-3 gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Mark as Resolved
                  </button>
                )}
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="px-6 py-3 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerDashboard;
