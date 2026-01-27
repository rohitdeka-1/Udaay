import { useState, useMemo, useEffect } from "react";
import { Search, MapPin, AlertTriangle, Droplet, Trash2, Zap, FileText, X, CheckCircle2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getApiUrl } from "@/lib/utils";

const categoryFilters = [
  { value: "garbage", label: "Garbage" },
  { value: "roads", label: "Roads" },
  { value: "water", label: "Water" },
  { value: "electricity", label: "Electricity" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "live":
      return "bg-green-500 text-white";
    case "in-progress":
      return "badge-progress";
    case "awaiting-verification":
      return "bg-amber-500 text-white";
    case "resolved":
      return "badge-resolved";
    default:
      return "badge-open";
  }
};

const HomeScreen = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [liveIssues, setLiveIssues] = useState<any[]>([]);
  const [resolvedIssues, setResolvedIssues] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

   
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const url = `${getApiUrl()}/issues/live?includeAll=true`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          // Filter to show live, in-progress, and awaiting-verification issues (exclude resolved)
          const activeIssues = data.data.issues.filter(
            (issue: any) => issue.status === "live" || issue.status === "in-progress" || issue.status === "awaiting-verification"
          );
          const resolved = data.data.issues.filter(
            (issue: any) => issue.status === "resolved"
          );
          setLiveIssues(activeIssues);
          setResolvedIssues(resolved);
          setHasInitialLoad(true);
        }
      } catch (error) {
        console.error("Error fetching issues:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, []);

   useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          // Silently handle location permission denial - app works without location
          console.log("Location access:", error.code === 1 ? "denied" : "unavailable");
        },
        { timeout: 5000, maximumAge: 60000 }  
      );
    }
  }, []);

   useEffect(() => {
    if (userLocation && hasInitialLoad) {
      const fetchNearbyIssues = async () => {
        try {
          const url = `${getApiUrl()}/issues/live?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=10000&includeAll=true`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.success) {
            // Filter to show live, in-progress, and awaiting-verification issues (exclude resolved)
            const activeIssues = data.data.issues.filter(
              (issue: any) => issue.status === "live" || issue.status === "in-progress" || issue.status === "awaiting-verification"
            );
            const resolved = data.data.issues.filter(
              (issue: any) => issue.status === "resolved"
            );
            setLiveIssues(activeIssues);
            setResolvedIssues(resolved);
          }
        } catch (error) {
          console.error("Error fetching nearby issues:", error);
        }
      };

      fetchNearbyIssues();
    }
  }, [userLocation, hasInitialLoad]);

  const filteredIssues = useMemo(() => {
    let filtered = liveIssues;

    // Apply category filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter((issue: any) =>
        activeFilters.includes(issue.category)
      );
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((issue: any) =>
        issue.title.toLowerCase().includes(query) ||
        issue.category.toLowerCase().includes(query) ||
        issue.status.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, liveIssues, activeFilters]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveFilters([]);
  };

  const toggleFilter = (category: string) => {
    setActiveFilters((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
     const R = 6371;  
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  if (loading) {
    return (
      <MobileLayout showCitySelector>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showCitySelector>
      <div className="px-4 py-4 space-y-4 overflow-y-auto h-full">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues or locations..."
            className="w-full pl-12 pr-4 py-3 bg-muted/50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === "active"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active Issues ({liveIssues.length})
            {activeTab === "active" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
              activeTab === "history"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            History ({resolvedIssues.length})
            {activeTab === "history" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Active Issues Section */}
        {activeTab === "active" && (
          <div>
            <h2 className="font-semibold text-lg text-foreground mb-3">
              Active Issues
            </h2>

          {/* Filter Chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {activeFilters.map((filter) => (
                <div
                  key={filter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm"
                >
                  <span className="capitalize">{filter}</span>
                  <button
                    onClick={() => toggleFilter(filter)}
                    className="hover:bg-background/50 rounded-full p-0.5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Issues List or Empty State */}
          {filteredIssues.length > 0 ? (
            <div className="space-y-3 max-w-md mx-auto">
              {filteredIssues.map((issue: any) => (
                <div
                  key={issue._id}
                  onClick={() => navigate(`/issues/${issue._id}`)}
                  className="card-civic-elevated overflow-hidden cursor-pointer hover:border-primary/40 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                >
                
                  <div className="relative -mx-4 -mt-4 mb-2">
                    {issue.imageUrl ? (
                      <img
                        src={issue.imageUrl}
                        alt={issue.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className={`w-full h-48 flex items-center justify-center text-white ${
                        issue.category === 'roads' ? 'bg-red-500' :
                        issue.category === 'garbage' ? 'bg-green-500' :
                        issue.category === 'water' ? 'bg-blue-500' :
                        issue.category === 'electricity' ? 'bg-yellow-500' :
                        'bg-purple-500'
                      }`}>
                        {issue.category === 'roads' && <AlertTriangle size={48} />}
                        {issue.category === 'garbage' && <Trash2 size={48} />}
                        {issue.category === 'water' && <Droplet size={48} />}
                        {issue.category === 'electricity' && <Zap size={48} />}
                        {!['roads', 'garbage', 'water', 'electricity'].includes(issue.category) && <FileText size={48} />}
                      </div>
                    )}
                    <span className={`absolute top-3 left-3 ${getStatusBadge(issue.status)}`}>{issue.status}</span>
                  </div>

                  {/* Content */}
                  <div className="px-1">
                    <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2 mb-1">{issue.title}</h3>
                    <p className="text-xs font-medium text-muted-foreground capitalize mb-1.5">{issue.category}</p>
                    <div className="flex items-center gap-3 pb-1">
                      {userLocation && (
                        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <MapPin size={13} strokeWidth={2.5} />
                          {calculateDistance(userLocation.lat, userLocation.lng, issue.location.lat, issue.location.lng)} km
                        </span>
                      )}
                      <p className="text-xs font-medium text-muted-foreground/80">{getTimeAgo(issue.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              {/* Empty State Illustration */}
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                  <Search size={40} className="text-primary/40" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-bold">?</span>
                </div>
              </div>

              <h3 className="font-semibold text-lg text-foreground mb-2">No active issues found</h3>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-[250px]">
                Try searching with different keywords or check back later.
              </p>

              {(searchQuery || activeFilters.length > 0) && (
                <button
                  onClick={handleClearSearch}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
          </div>
        )}

        {/* History Section */}
        {activeTab === "history" && (
          <div>
            <h2 className="font-semibold text-lg text-foreground mb-3">
              Resolved Issues
            </h2>

            {resolvedIssues.length > 0 ? (
              <div className="space-y-3">
                {resolvedIssues.map((issue: any) => (
                  <div
                    key={issue._id}
                    onClick={() => navigate(`/issues/${issue._id}`)}
                    className="card-civic hover:shadow-md transition-all cursor-pointer active:scale-[0.98] border-l-4 border-l-green-500"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`${getStatusBadge(issue.status)} uppercase text-[10px] tracking-wider font-semibold px-2 py-1 rounded`}>
                        {issue.status}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="px-1 mt-2">
                      <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2 mb-1">{issue.title}</h3>
                      <p className="text-xs font-medium text-muted-foreground capitalize mb-1.5">{issue.category}</p>
                      <div className="flex items-center gap-3 pb-1">
                        {userLocation && (
                          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <MapPin size={13} strokeWidth={2.5} />
                            {calculateDistance(userLocation.lat, userLocation.lng, issue.location.lat, issue.location.lng)} km
                          </span>
                        )}
                        <p className="text-xs font-medium text-muted-foreground/80">{getTimeAgo(issue.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="relative mb-6">
                  <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={40} className="text-green-500/40" />
                  </div>
                </div>

                <h3 className="font-semibold text-lg text-foreground mb-2">No resolved issues</h3>
                <p className="text-sm text-muted-foreground text-center max-w-[250px]">
                  Resolved issues will appear here once they are verified and completed.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default HomeScreen;
