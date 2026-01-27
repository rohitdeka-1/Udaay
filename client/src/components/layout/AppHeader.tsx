import { ChevronDown, Bell, X, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "@/lib/auth";
import { getApiUrl } from "@/lib/utils";

interface AppHeaderProps {
  showCitySelector?: boolean;
  title?: string;
}

export const AppHeader = ({ showCitySelector = false, title }: AppHeaderProps) => {
  const [city, setCity] = useState("fetching...");
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
   
    const storedUser = getStoredUser();
    setUser(storedUser);

    // Listen for storage changes (when profile is updated)
    const handleStorageChange = () => {
      const updatedUser = getStoredUser();
      setUser(updatedUser);
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for a custom event for same-tab updates
    window.addEventListener('userUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleStorageChange);
    };
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
    
    // Poll for new notifications every 30 seconds
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

  useEffect(() => {
    if (showCitySelector && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            const cityName = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "Unknown";
            setCity(cityName);
          } catch (error) {
            console.error("Error getting city:", error);
            setCity("Location unavailable");
          }
        },
        (error) => {
          // Silently handle location permission denial
          if (error.code === 1) {
            setCity("Enable location");
          } else {
            setCity("Location unavailable");
          }
        },
        { timeout: 5000 }
      );
    }
  }, [showCitySelector]);

  return (
    <header className="sticky top-0 z-50 glass-effect border-b border-border/60 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-end gap-3">
          <img 
            src="/logo_png.png" 
            alt="Udaay" 
            className="h-8 w-auto object-contain"
          />
          <h1 className="font-display font-bold text-xl text-black">
            Udaay
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {showCitySelector && (
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted/70 hover:bg-muted text-sm font-semibold text-foreground transition-all hover:scale-105 active:scale-95">
              <span>{city}</span>
              <ChevronDown size={16} />
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Bell size={22} className="text-muted-foreground" />
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
            className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-success/20 p-0.5 hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/30 to-success/30 flex items-center justify-center">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user?.name || 'User'}
                  className="w-9 h-9 rounded-full object-cover border-2 border-background"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center border-2 border-background text-white font-bold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
