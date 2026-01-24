import { useState, useMemo, useEffect } from "react";
import { Search, MapPin, AlertTriangle, Droplet, Trash2, Zap, FileText, X } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getApiUrl } from "@/lib/utils";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "live":
      return "badge-open";
    case "in-progress":
      return "badge-progress";
    case "resolved":
      return "badge-resolved";
    default:
      return "badge-open";
  }
};

const HomeScreen = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [liveIssues, setLiveIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

   
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const url = `${getApiUrl()}/issues/live`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          setLiveIssues(data.data.issues);
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
          const url = `${getApiUrl()}/issues/live?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=10000`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.success) {
            setLiveIssues(data.data.issues);
          }
        } catch (error) {
          console.error("Error fetching nearby issues:", error);
        }
      };

      fetchNearbyIssues();
    }
  }, [userLocation, hasInitialLoad]);

  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) {
      return liveIssues;
    }

    const query = searchQuery.toLowerCase();
    return liveIssues.filter((issue: any) =>
      issue.title.toLowerCase().includes(query) ||
      issue.category.toLowerCase().includes(query) ||
      issue.status.toLowerCase().includes(query)
    );
  }, [searchQuery, liveIssues]);

  const handleClearSearch = () => {
    setSearchQuery("");
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
      <div className="px-4 py-6 space-y-6 overflow-y-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues or locations..."
            className="input-civic pl-12 pr-12"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div>
          <h2 className="font-display font-bold text-xl text-foreground mb-4">
            {searchQuery ? `Search Results (${filteredIssues.length})` : "Active Issues"}
          </h2>
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
            <div className="card-civic py-12 text-center">
              <Search size={48} className="mx-auto mb-3 text-muted-foreground" />
              <p className="font-semibold text-foreground mb-1">No issues found</p>
              <p className="text-sm text-muted-foreground">
                Try searching with different keywords
              </p>
              <button
                onClick={handleClearSearch}
                className="mt-4 btn-civic-outline px-4 py-2 text-sm"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default HomeScreen;
