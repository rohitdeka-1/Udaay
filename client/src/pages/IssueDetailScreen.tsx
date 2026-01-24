import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Calendar, ArrowLeft, AlertTriangle, Trash2, Droplet, Zap, FileText } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getApiUrl } from "@/lib/utils";

const IssueDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (issue && mapRef.current && !googleMapRef.current) {
      initMap();
    }
  }, [issue]);

  const initMap = () => {
    if (!mapRef.current || !issue) return;
    
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        createMap();
        return;
      }

      if (!(window as any).initMapCallback) {
        (window as any).initMapCallback = () => {
          if (mapRef.current && issue) {
            createMap();
          }
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMapCallback&loading=async`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    };

    const createMap = () => {
      if (!mapRef.current || !window.google || !window.google.maps) return;

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: issue.location.lat, lng: issue.location.lng },
        zoom: 15,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
      });

      googleMapRef.current = map;

       
      const marker = new google.maps.Marker({
        position: { lat: issue.location.lat, lng: issue.location.lng },
        map,
        title: issue.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 15,
          fillColor: getCategoryColorHex(issue.category),
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 4,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="padding: 12px; font-family: system-ui;">
          <h3 style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${issue.title}</h3>
          <p style="font-size: 12px; color: #666; text-transform: capitalize;">${issue.category}</p>
        </div>`
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      
      infoWindow.open(map, marker);
    };

    loadGoogleMaps();
  };

  const getCategoryColorHex = (category: string) => {
    switch (category) {
      case "roads": return '#ef4444';
      case "garbage": return '#22c55e';
      case "water": return '#3b82f6';
      case "electricity": return '#eab308';
      default: return '#a855f7';
    }
  };

  useEffect(() => {
    const fetchIssueDetail = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${getApiUrl()}/issues/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (data.success) {
          setIssue(data.data.issue);
        }
      } catch (error) {
        // Error fetching issue
      } finally {
        setLoading(false);
      }
    };

    fetchIssueDetail();
  }, [id]);

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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "roads":
        return <AlertTriangle size={48} className="text-white" />;
      case "garbage":
        return <Trash2 size={48} className="text-white" />;
      case "water":
        return <Droplet size={48} className="text-white" />;
      case "electricity":
        return <Zap size={48} className="text-white" />;
      default:
        return <FileText size={48} className="text-white" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "roads":
        return "bg-red-500";
      case "garbage":
        return "bg-green-500";
      case "water":
        return "bg-blue-500";
      case "electricity":
        return "bg-yellow-500";
      default:
        return "bg-purple-500";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </MobileLayout>
    );
  }

  if (!issue) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center h-full px-4">
          <p className="text-lg font-semibold text-foreground mb-2">Issue not found</p>
          <button onClick={() => navigate(-1)} className="btn-civic">
            Go Back
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col h-full">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Issue image/icon with close button overlay */}
          <div className="relative">
            {issue.imageUrl && issue.imageUrl.startsWith("http") ? (
              <img
                src={issue.imageUrl}
                alt={issue.title}
                className="w-full h-80 object-cover"
              />
            ) : (
              <div className={`w-full h-80 flex items-center justify-center ${getCategoryColor(issue.category)}`}>
                {getCategoryIcon(issue.category)}
              </div>
            )}
            {/* Back button overlay */}
            <button
              onClick={() => navigate(-1)}
              className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all"
            >
              <ArrowLeft size={24} />
            </button>
          </div>

          {/* Issue details */}
          <div className="px-4 py-6 space-y-6">
            {/* Title and status */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="font-display font-bold text-2xl text-foreground">{issue.title}</h2>
                <span className={getStatusBadge(issue.status)}>{issue.status}</span>
              </div>
              <p className="text-sm text-muted-foreground capitalize">
                Category: <span className="font-semibold">{issue.category}</span>
              </p>
            </div>

            {/* Date */}
            <div className="card-civic flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar size={24} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reported on</p>
                <p className="font-semibold text-foreground">{formatDate(issue.createdAt)}</p>
              </div>
            </div>

            {/* Description */}
            {issue.description && (
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{issue.description}</p>
              </div>
            )}

            {/* AI Validation */}
            {issue.aiValidation?.validated && (
              <div className="card-civic bg-primary/5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">✓</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">AI Validated</p>
                    <p className="text-sm text-muted-foreground">
                      {issue.aiValidation.aiResponse}
                    </p>
                    {issue.aiValidation.confidence && (
                      <p className="text-xs text-primary font-semibold mt-2">
                        Confidence: {(issue.aiValidation.confidence * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <h3 className="font-semibold text-lg text-foreground mb-3">Location</h3>
              <div className="card-civic">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <MapPin size={24} className="text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground mb-1">
                      {issue.location.city}, {issue.location.state}
                    </p>
                    {issue.location.address && (
                      <p className="text-sm text-muted-foreground">{issue.location.address}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {issue.location.lat.toFixed(6)}, {issue.location.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
                
                {/* Interactive Map */}
                <div 
                  ref={mapRef}
                  className="w-full h-48 bg-accent rounded-lg overflow-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default IssueDetailScreen;
