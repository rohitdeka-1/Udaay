import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Clock, MapPin, TrendingUp, ChevronRight, Play, LayoutDashboard, FileText, BarChart3, User, AlertCircle, Filter } from "lucide-react";
import { useAuth } from "@/lib/auth";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "live" | "in-progress" | "resolved" | "rejected";
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
  { icon: LayoutDashboard, label: "Dash", active: true },
  { icon: FileText, label: "Tasks", active: false },
  { icon: BarChart3, label: "Stats", active: false },
  { icon: User, label: "Profile", active: false },
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
  const { user } = useAuth();
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

  useEffect(() => {
    fetchIssues();
  }, []);

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
      const response = await axios.get(`${API_URL}/issues/live`);
      const allIssues = response.data.issues || response.data || [];
      
      // Filter for pending and in-progress issues
      const activeIssues = allIssues.filter(
        (issue: Issue) => issue.status === "pending" || issue.status === "in-progress"
      );
      
      // Sort by severity: critical > high > medium > low
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      activeIssues.sort((a: Issue, b: Issue) => {
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
      
      setIssues(activeIssues);
      setFilteredIssues(activeIssues);
      
      // Calculate stats
      setStats({
        pending: allIssues.filter((i: Issue) => i.status === "pending").length,
        inProgress: allIssues.filter((i: Issue) => i.status === "in-progress").length,
        resolved: allIssues.filter((i: Issue) => i.status === "resolved").length,
        efficiency: 92,
      });
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
      
      // Navigate to issue detail
      navigate(`/issues/${issueId}`);
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
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
              <Bell size={22} className="text-muted-foreground" />
              {stats.pending > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-success/20 p-0.5 hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/30 to-success/30 flex items-center justify-center">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user?.name || 'Officer'}
                    className="w-8 h-8 rounded-full object-cover border-2 border-background"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border-2 border-background text-white font-bold text-xs">
                    {user?.name?.charAt(0)?.toUpperCase() || 'O'}
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pb-24">
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
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success" />
            </div>
          </div>
          <div className="mt-4 progress-civic">
            <div className="progress-civic-fill bg-success" style={{ width: "92%" }} />
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
                    onClick={() => navigate(`/issues/${issue._id}`)}
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
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item, index) => {
            const isCenter = index === 2;
            if (isCenter) {
              return (
                <div key={item.label} className="flex flex-col items-center">
                  <button className="bottom-nav-fab -mt-6">
                    <span className="text-2xl">+</span>
                  </button>
                </div>
              );
            }
            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                className={`bottom-nav-item ${item.active ? "active" : ""}`}
              >
                <item.icon size={22} strokeWidth={item.active ? 2.5 : 2} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default OfficerDashboard;
