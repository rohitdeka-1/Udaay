import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Filter, Trash2, AlertTriangle, Droplet, Zap, ChevronUp, X, Search, Layers, Map, Globe, Mountain, Bell, CheckCircle2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "@/lib/auth";
import { getApiUrl } from "@/lib/utils";

const filters = [
  { id: "garbage", icon: Trash2, label: "Garbage", color: "bg-success text-success-foreground", active: true },
  { id: "roads", icon: AlertTriangle, label: "Roads", color: "bg-warning text-warning-foreground", active: false },
  { id: "water", icon: Droplet, label: "Water", color: "bg-primary text-primary-foreground", active: false },
  { id: "electricity", icon: Zap, label: "Electricity", color: "bg-warning text-warning-foreground", active: false },
];

const stats = [
  { label: "IN VIEW", value: "128", trend: "↑ 12%", trendColor: "text-success" },
  { label: "RESOLVED", value: "1.2k", subtext: "Total" },
  { label: "CRITICAL", value: "", icon: "moon", subtext: "High Priority" },
  { label: "AVG TIME", value: "4.2d", subtext: "Resolution" },
];

const MapScreen = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState(["garbage", "roads", "water", "electricity"]);
  const [showPanel, setShowPanel] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "terrain">("satellite");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveIssues, setLiveIssues] = useState<any[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Helper function to get marker color by type
  const getMarkerColor = (type: string) => {
    const colors: Record<string, string> = {
      garbage: '#16a34a',    // Green
      roads: '#f59e0b',      // Orange
      water: '#2563eb',      // Blue
      electricity: '#eab308' // Yellow
    };
    return colors[type] || '#f59e0b';
  };

  // Load user data
  useEffect(() => {
    const storedUser = getStoredUser();
    setUser(storedUser);

    // Listen for user updates
    const handleUserUpdate = () => {
      const updatedUser = getStoredUser();
      setUser(updatedUser);
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?._id) return;

      try {
        const response = await fetch(`${getApiUrl()}/notifications?userId=${user._id}`);
        const data = await response.json();

        if (data.success) {
          setNotifications(data.data.notifications);
          const unread = data.data.notifications.filter((n: any) => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

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

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`${getApiUrl()}/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?._id) return;
    
    try {
      await fetch(`${getApiUrl()}/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Fetch live issues from API
  const fetchLiveIssues = async (lat?: number, lng?: number) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const baseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;
      let url = `${baseUrl}/issues/live?includeAll=true`;
      if (lat && lng) {
        url += `&lat=${lat}&lng=${lng}&radius=10000`; // 10km radius
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Filter to show live, in-progress, and awaiting-verification issues (not fully resolved)
        const activeIssues = data.data.issues.filter(
          (issue: any) => issue.status === 'live' || issue.status === 'in-progress' || issue.status === 'awaiting-verification'
        );
        setLiveIssues(activeIssues);
        return activeIssues;
      }
    } catch (error) {
      console.error("Error fetching live issues:", error);
    }
    return [];
  };

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  // Filter markers based on active filters
  useEffect(() => {
    if (markersRef.current.length > 0) {
      markersRef.current.forEach((marker) => {
        const markerType = (marker as any).issueType;
        // Don't hide user location marker
        if (marker.getTitle() === "Your Location") {
          marker.setMap(googleMapRef.current);
          return;
        }
        // Show/hide marker based on active filters
        if (markerType && activeFilters.includes(markerType)) {
          marker.setMap(googleMapRef.current);
        } else if (markerType) {
          marker.setMap(null);
        }
      });
    }
  }, [activeFilters]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setMapError(true);
      return;
    }

    // Helper function to create issue markers
    const createIssueMarkers = async (map: google.maps.Map, location?: { lat: number; lng: number }) => {
      // Fetch live issues from API
      const issues = await fetchLiveIssues(location?.lat, location?.lng);

      if (issues.length === 0) {
        // Fallback to sample data if no live issues found
        const sampleIssues = location
          ? [
              { lat: location.lat + 0.005, lng: location.lng + 0.005, title: "Pothole nearby", type: "roads" },
              { lat: location.lat - 0.005, lng: location.lng + 0.007, title: "Garbage Overflow", type: "garbage" },
              { lat: location.lat + 0.003, lng: location.lng - 0.005, title: "Street Light Issue", type: "electricity" },
              { lat: location.lat - 0.007, lng: location.lng - 0.003, title: "Water Leakage", type: "water" },
            ]
          : [
              { lat: 23.2599, lng: 77.4126, title: "Pothole on Main Road", type: "roads" },
              { lat: 23.2650, lng: 77.4200, title: "Garbage Overflow", type: "garbage" },
              { lat: 23.2550, lng: 77.4050, title: "Street Light Issue", type: "electricity" },
              { lat: 23.2500, lng: 77.4150, title: "Water Leakage", type: "water" },
            ];

        sampleIssues.forEach((issue, index) => {
          setTimeout(() => {
            const marker = new google.maps.Marker({
              position: { lat: issue.lat, lng: issue.lng },
              map,
              title: issue.title,
              animation: google.maps.Animation.DROP,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: getMarkerColor(issue.type),
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
            });

            (marker as any).issueType = issue.type;
            markersRef.current.push(marker);

            const infoWindow = new google.maps.InfoWindow({
              content: `<div style="padding: 12px; font-family: system-ui;">
                <h3 style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${issue.title}</h3>
                <p style="font-size: 12px; color: #666; text-transform: capitalize;">${issue.type}</p>
              </div>`
            });

            marker.addListener('click', () => {
              marker.setAnimation(google.maps.Animation.BOUNCE);
              setTimeout(() => marker.setAnimation(null), 700);
              infoWindow.open(map, marker);
            });
          }, index * 150);
        });
        return;
      }

      // Create markers for live issues from API
      issues.forEach((issue: any, index: number) => {
        setTimeout(() => {
          // Use http/https image URL as marker icon if available (base64 won't work as marker icons)
          const markerIcon = issue.imageUrl && (issue.imageUrl.startsWith('http://') || issue.imageUrl.startsWith('https://'))
            ? {
                url: issue.imageUrl,
                scaledSize: new google.maps.Size(40, 40),
                anchor: new google.maps.Point(20, 20),
              }
            : {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: getMarkerColor(issue.category),
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              };

          const marker = new google.maps.Marker({
            position: { lat: issue.location.lat, lng: issue.location.lng },
            map,
            title: issue.title,
            animation: google.maps.Animation.DROP,
            icon: markerIcon,
          });

          (marker as any).issueType = issue.category;
          (marker as any).issueData = issue;
          markersRef.current.push(marker);

          let infoWindow: google.maps.InfoWindow | null = null;

          marker.addListener('click', async () => {
            marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => marker.setAnimation(null), 700);
            
            let imageHtml = '';
            if (issue.imageUrl) {
              imageHtml = `<img src="${issue.imageUrl}" alt="${issue.title}" 
                style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; display: block;" 
                onerror="this.style.display='none';" />`;
            }
            
            const content = `<div style="padding: 8px; font-family: system-ui; max-width: 240px;">
              ${imageHtml}
              <h3 style="font-weight: 600; margin-bottom: 6px; font-size: 15px; color: #1a1a1a;">${issue.title}</h3>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="display: inline-block; padding: 3px 7px; background: ${getMarkerColor(issue.category)}; color: white; border-radius: 5px; font-size: 10px; font-weight: 500; text-transform: capitalize;">${issue.category}</span>
                <span style="font-size: 11px; color: #666;">${issue.status}</span>
              </div>
              <p style="font-size: 11px; color: #666; line-height: 1.3; margin: 0;">${issue.description || issue.location?.address || 'Location tagged'}</p>
            </div>`;
            
            if (infoWindow) {
              infoWindow.close();
            }
            
            infoWindow = new google.maps.InfoWindow({ content });
            infoWindow.open(map, marker);
          });
        }, index * 150);
      });
    };

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      // Define the callback globally before loading the script
      (window as any).initMapCallback = initMap;

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMapCallback&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = () => setMapError(true);
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current) return;
      if (!window.google || !window.google.maps) {
        console.error('Google Maps not loaded yet');
        return;
      }

      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 23.2599, lng: 77.4126 }, // Bhopal fallback
        zoom: 13,
        mapTypeId: mapType === 'satellite' ? 'hybrid' : mapType,
        disableDefaultUI: false,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
      });

      googleMapRef.current = map;

      // Try to get user's location on load
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
            setUserLocation(userLoc);
            map.setCenter(userLoc);
            map.setZoom(15);
            
            // Add user location marker
            markersRef.current.push(new google.maps.Marker({
              position: userLoc,
              map,
              animation: google.maps.Animation.DROP,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#2563eb',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
              title: "Your Location",
            }));
            
            // Add nearby live issues from API
            createIssueMarkers(map, userLoc);
          },
          (error) => {
            // Silently handle location permission denial - app works without location
            console.log("Location access:", error.code === 1 ? "denied" : "unavailable");
            // Fallback - load issues without location filter
            createIssueMarkers(map);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        // Fallback - load issues without location filter
        createIssueMarkers(map);
      }

      setMapLoaded(true);
    };

    loadGoogleMaps();
  }, []);

  const handleZoomIn = () => {
    if (googleMapRef.current) {
      const currentZoom = googleMapRef.current.getZoom() || 13;
      googleMapRef.current.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (googleMapRef.current) {
      const currentZoom = googleMapRef.current.getZoom() || 13;
      googleMapRef.current.setZoom(currentZoom - 1);
    }
  };

  const handleRecenter = () => {
    if (googleMapRef.current) {
      googleMapRef.current.setCenter({ lat: 23.2599, lng: 77.4126 }); // Bhopal, MP
      googleMapRef.current.setZoom(13);
    }
  };

  const handleMapTypeChange = (type: "roadmap" | "satellite" | "terrain") => {
    setMapType(type);
    if (googleMapRef.current) {
      // Use string values instead of MapTypeId constants to avoid undefined errors
      const mapTypeId = type === "roadmap" ? "roadmap" :
                        type === "satellite" ? "hybrid" :
                        "terrain";
      googleMapRef.current.setMapTypeId(mapTypeId);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      alert("Please enter a location to search");
      return;
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        if (googleMapRef.current) {
          googleMapRef.current.setCenter(location);
          googleMapRef.current.setZoom(13);
          
          // Add a marker at searched location
          const searchMarker = new google.maps.Marker({
            position: location,
            map: googleMapRef.current,
            animation: google.maps.Animation.DROP,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            title: searchQuery,
          });
          
          markersRef.current.push(searchMarker);
        }
      } else {
        alert("Location not found. Please try a different search.");
      }
    });
  };

  const handleGetCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(location);
        
        if (googleMapRef.current) {
          googleMapRef.current.setCenter(location);
          googleMapRef.current.setZoom(15);
          
          // Remove existing user marker
          markersRef.current = markersRef.current.filter(m => {
            if (m.getTitle() === "Your Location") {
              m.setMap(null);
              return false;
            }
            return true;
          });
          
          // Add user location marker
          markersRef.current.push(new google.maps.Marker({
            position: location,
            map: googleMapRef.current,
            animation: google.maps.Animation.DROP,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            title: "Your Location",
          }));
          
          // Add nearby issues using same helper function pattern
          const nearbyIssues = [
            { lat: location.lat + 0.005, lng: location.lng + 0.005, title: "Pothole nearby", type: "roads" },
            { lat: location.lat - 0.005, lng: location.lng + 0.007, title: "Garbage Overflow", type: "garbage" },
            { lat: location.lat + 0.003, lng: location.lng - 0.005, title: "Street Light Issue", type: "electricity" },
            { lat: location.lat - 0.007, lng: location.lng - 0.003, title: "Water Leakage", type: "water" },
          ];
          
          nearbyIssues.forEach((issue, index) => {
            setTimeout(() => {
              const marker = new google.maps.Marker({
                position: { lat: issue.lat, lng: issue.lng },
                map: googleMapRef.current,
                title: issue.title,
                animation: google.maps.Animation.DROP,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: getMarkerColor(issue.type),
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                },
              });
              
              (marker as any).issueType = issue.type;
              markersRef.current.push(marker);
              
              const infoWindow = new google.maps.InfoWindow({
                content: `<div style="padding: 12px; font-family: system-ui;">
                  <h3 style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">${issue.title}</h3>
                  <p style="font-size: 12px; color: #666; text-transform: capitalize;">${issue.type}</p>
                </div>`
              });
              
              marker.addListener('click', () => {
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => marker.setAnimation(null), 700);
                infoWindow.open(googleMapRef.current, marker);
              });
            }, index * 150);
          });
        }
      },
      (error) => {
        // Silently handle location permission denial - don't show alert
        console.log("Location access:", error.code === 1 ? "denied" : "unavailable");
        // App continues to work without location
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <MobileLayout showHeader={false} showNav={true}>
      <div className="relative w-full h-full bg-muted overflow-hidden">
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src="/logo_png.png" 
                alt="Udaay" 
                className="h-10 w-10 object-contain bg-white rounded-full p-1"
              />
              <span className={`font-display font-semibold text-lg ${
                mapType === 'satellite' ? 'text-white drop-shadow-lg' : 'text-foreground'
              }`}>Udaay</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-10 h-10 rounded-full bg-background shadow-md flex items-center justify-center relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-background border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                    <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">Notifications</h3>
                        {unreadCount > 0 && (
                          <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-primary hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1 hover:bg-muted rounded-full transition-colors"
                        >
                          <X size={16} className="text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell size={32} className="mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifications.map((notification) => (
                          <div
                            key={notification._id}
                            onClick={() => {
                              markAsRead(notification._id);
                              if (notification.issueId?._id) {
                                setShowNotifications(false);
                                navigate(`/issues/${notification.issueId._id}`);
                              }
                            }}
                            className={`px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                              !notification.isRead ? 'bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                notification.type === 'RESOLVED' 
                                  ? 'bg-green-500/10' 
                                  : 'bg-primary/10'
                              }`}>
                                {notification.type === 'RESOLVED' ? (
                                  <CheckCircle2 size={20} className="text-green-500" />
                                ) : (
                                  <Bell size={20} className="text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                                    notification.type === 'RESOLVED'
                                      ? 'bg-green-500/10 text-green-600'
                                      : 'bg-primary/10 text-primary'
                                  }`}>
                                    {notification.type}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {getTimeAgo(notification.createdAt)}
                                  </span>
                                  {!notification.isRead && (
                                    <span className="w-2 h-2 bg-primary rounded-full ml-auto"></span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground mb-1">{notification.message}</p>
                                {notification.issueId && (
                                  <p className="text-xs text-muted-foreground">
                                    Issue: {notification.issueId.title}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => navigate('/profile')}
                className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-success/20 p-0.5 shadow-md hover:shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/30 to-success/30 flex items-center justify-center">
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user?.name || 'User'}
                      className="w-9 h-9 rounded-full object-cover border-2 border-background"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center border-2 border-background text-white font-bold text-xs">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 bg-background rounded-xl shadow-md flex items-center gap-3 px-4 py-3 border border-transparent focus-within:border-primary/30 transition-colors">
            <Search size={18} className="text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search location or issue..."
              className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground focus:ring-0"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            )}
            <button 
              onClick={handleSearch}
              className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <Navigation size={14} />
            </button>
          </div>

          {/* Map Type Toggle */}
          <div className="mt-3 inline-flex bg-background rounded-xl shadow-md p-1.5">
            <div className="flex gap-1">
              {[
                { label: "Default", type: "roadmap" as const, icon: Map },
                { label: "Satellite", type: "satellite" as const, icon: Globe },
                { label: "Terrain", type: "terrain" as const, icon: Mountain }
              ].map((item) => {
                const isActive = mapType === item.type;
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleMapTypeChange(item.type)}
                    className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md scale-105"
                        : "bg-transparent text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon size={14} className={isActive ? "" : "opacity-70"} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
 
        <div ref={mapRef} className="absolute inset-0" />
 
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-10">
            <LoadingSpinner size="lg" text="Loading map..." />
          </div>
        )}
 
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center text-muted-foreground p-6">
              <MapPin size={48} className="mx-auto mb-3 text-destructive" />
              <p className="font-semibold text-lg mb-2">Map Loading Failed</p>
              <p className="text-sm">Please check your internet connection</p>
            </div>
          </div>
        )}

 
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
          <button 
            onClick={handleZoomIn}
            className="w-10 h-10 rounded-lg bg-background shadow-md flex items-center justify-center text-lg font-bold hover:bg-muted transition-colors"
          >
            +
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-10 h-10 rounded-lg bg-background shadow-md flex items-center justify-center text-lg font-bold hover:bg-muted transition-colors"
          >
            −
          </button>
          <button 
            onClick={handleGetCurrentLocation}
            className="w-10 h-10 rounded-lg bg-background shadow-md flex items-center justify-center mt-2 hover:bg-muted transition-colors"
          >
            <Navigation size={18} className="text-primary" />
          </button>
        </div>

 
        <button
          onClick={() => setShowPanel(!showPanel)}
          className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-30 shadow-lg flex items-center justify-center font-semibold transition-all ${
            showPanel 
              ? "w-12 h-12 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 hover:scale-110 active:scale-95" 
              : "bg-primary text-primary-foreground px-6 py-3 rounded-full gap-2 text-sm hover:bg-primary/90 hover:scale-105 active:scale-95"
          }`}
        >
          {showPanel ? <X size={20} /> : (
            <>
              <Layers size={18} />
              Explore Issues
            </>
          )}
        </button>
 
        {showPanel && (
          <div className="fixed bottom-[180px] left-6 right-6 max-w-md mx-auto z-20 bg-background rounded-3xl shadow-2xl border border-border/50 overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
            <div className="px-5 py-4">
 
              <div className="mb-3">
                <h2 className="font-display font-semibold text-base">Explore Issues</h2>
                <p className="text-xs text-muted-foreground">128 active issues found</p>
              </div>

 
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                {filters.map((filter) => {
                  const isActive = activeFilters.includes(filter.id);
                  return (
                    <button
                      key={filter.id}
                      onClick={() => toggleFilter(filter.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? filter.color
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <filter.icon size={14} />
                      {filter.label}
                      {isActive && (
                        <X size={12} className="ml-0.5 opacity-70" />
                      )}
                    </button>
                  );
                })}
              </div>

 
              <div className="grid grid-cols-4 gap-2 mt-3">
                <div className="card-civic py-2 px-2">
                  <p className="text-[10px] text-muted-foreground tracking-wide">IN VIEW</p>
                  <p className="font-display font-bold text-lg text-foreground">128</p>
                </div>
                <div className="card-civic py-2 px-2">
                  <p className="text-[10px] text-muted-foreground tracking-wide">RESOLVED</p>
                  <p className="font-display font-bold text-lg text-foreground">1.2k</p>
                </div>
                <div className="card-civic py-2 px-2">
                  <p className="text-[10px] text-muted-foreground tracking-wide">CRITICAL</p>
                  <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center mt-1">
                    <AlertTriangle size={12} className="text-destructive" />
                  </div>
                </div>
                <div className="card-civic py-2 px-2">
                  <p className="text-[10px] text-muted-foreground tracking-wide">AVG TIME</p>
                  <p className="font-display font-bold text-lg text-foreground">4.2d</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default MapScreen;
