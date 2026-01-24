import { useState, useEffect } from "react";
import { Search, Plus, ChevronRight, Clock, AlertCircle, Check, Trash2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Issue {
  _id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  status: "pending" | "live" | "rejected";
  upvotes: number;
  createdAt: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  aiValidation?: {
    validated: boolean;
    confidence: number;
  };
}

const TicketsScreen = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    live: 0,
    rejected: 0
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchMyIssues();
  }, []);

  const fetchMyIssues = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${getApiUrl()}/issues/my-issues`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setIssues(data.data.issues);
        
        // Calculate counts
        const allIssues = data.data.issues;
        setCounts({
          all: allIssues.length,
          pending: allIssues.filter((i: Issue) => i.status === "pending").length,
          live: allIssues.filter((i: Issue) => i.status === "live").length,
          rejected: allIssues.filter((i: Issue) => i.status === "rejected").length
        });
      }
    } catch (error) {
      // Error fetching issues
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (issueId: string) => {
    setIssueToDelete(issueId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!issueToDelete) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${getApiUrl()}/issues/${issueToDelete}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Issue Closed",
          description: "Your issue has been successfully closed and removed.",
        });
        
        // Remove issue from local state
        setIssues(prev => prev.filter(issue => issue._id !== issueToDelete));
        
        // Update counts
        const updatedIssues = issues.filter(issue => issue._id !== issueToDelete);
        setCounts({
          all: updatedIssues.length,
          pending: updatedIssues.filter((i: Issue) => i.status === "pending").length,
          live: updatedIssues.filter((i: Issue) => i.status === "live").length,
          rejected: updatedIssues.filter((i: Issue) => i.status === "rejected").length
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to close issue. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close issue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setIssueToDelete(null);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    if (activeTab === "all") return true;
    return issue.status === activeTab;
  });

  const tabs = [
    { id: "all", label: "All", count: counts.all },
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "live", label: "Live", count: counts.live },
    { id: "rejected", label: "Rejected", count: counts.rejected },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "badge-open";
      case "live":
        return "badge-resolved";
      case "rejected":
        return "bg-destructive text-destructive-foreground";
      default:
        return "badge-open";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Validating";
      case "live":
        return "Live";
      case "rejected":
        return "Rejected";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="px-4 py-4">
          {/* Header skeleton */}
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>

          {/* Tabs skeleton */}
          <div className="flex gap-2 mb-6">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>

          {/* Ticket cards skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-civic">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-4 py-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl text-foreground mb-1">My Tickets</h1>
          <p className="text-muted-foreground">
            Track and manage your reported urban issues across the city.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-civic ${activeTab === tab.id ? "active" : ""}`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredIssues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle size={48} className="text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No issues found</h3>
            <p className="text-muted-foreground mb-6">
              {activeTab === "all" 
                ? "You haven't reported any issues yet."
                : `No ${activeTab} issues found.`}
            </p>
            <button
              onClick={() => navigate("/report")}
              className="btn-civic-primary px-6 py-3 gap-2"
            >
              <Plus size={18} />
              Report an Issue
            </button>
          </div>
        )}

        {/* Tickets List */}
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <div
              key={issue._id}
              className="card-civic-elevated overflow-hidden animate-fade-in"
            >
              {/* Image */}
              <div className="relative -mx-4 -mt-4 mb-3">
                <img
                  src={issue.imageUrl}
                  alt={issue.title}
                  className="w-full h-40 object-cover"
                />
                <span className={`absolute top-3 left-3 ${getStatusBadge(issue.status)} uppercase text-[10px] tracking-wider font-semibold px-2 py-1 rounded`}>
                  {getStatusLabel(issue.status)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(issue._id);
                  }}
                  className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-destructive rounded-full text-white transition-all hover:scale-110"
                  title="Close Issue"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Content */}
              <div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {issue.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {issue.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="font-medium capitalize">{issue.category}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Upvotes:</span>
                    <span className="font-medium">{issue.upvotes}</span>
                  </div>
                </div>

                {/* AI Validation Status */}
                {issue.status === "pending" && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-warning">
                      <Clock size={16} />
                      <span className="text-sm font-medium">AI Validation in Progress</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your issue is being validated and will be live soon.
                    </p>
                  </div>
                )}

                {issue.status === "rejected" && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle size={16} />
                      <span className="text-sm font-medium">Issue Rejected</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This issue did not pass AI validation. Please ensure images match the description.
                    </p>
                  </div>
                )}

                {issue.status === "live" && issue.aiValidation && (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-success">
                      <Check size={16} className="text-success" />
                      <span className="text-sm font-medium">Validated & Live</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence: {Math.round(issue.aiValidation.confidence * 100)}%
                    </p>
                  </div>
                )}

                {/* Latest Update */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Reported:</p>
                    <p className="text-sm text-foreground">{formatDate(issue.createdAt)}</p>
                  </div>
                  {issue.location.address && (
                    <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {issue.location.address}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAB */}
        <button
          onClick={() => navigate("/report")}
          className="fixed bottom-28 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-civic-fab flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this issue?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this issue from your tickets. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Closing..." : "Close Issue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
};

export default TicketsScreen;
