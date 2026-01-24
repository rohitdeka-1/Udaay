import { useState, useEffect, useRef } from "react";
import { ChevronRight, Clock, LogOut, Shield, HelpCircle, Settings, BadgeCheck, Camera } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/utils";

const activityItems = [
  { icon: Clock, label: "My Contributions", path: "/tickets" },
];

const preferenceItems = [
  { icon: Settings, label: "Settings", path: "/settings" },
];

const supportItems = [
  { icon: HelpCircle, label: "Help & Support", path: "/help" },
  { icon: Shield, label: "Privacy Policy", path: "/privacy" },
];

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/user/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.data.user);
        // Update localStorage with fresh user data including profilePicture
        localStorage.setItem('user', JSON.stringify(data.data.user));
        // Notify other components
        window.dispatchEvent(new Event('userUpdated'));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiUrl()}/user/update-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
        // Update localStorage so other components can see the new photo
        localStorage.setItem('user', JSON.stringify(data.data.user));
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('userUpdated'));
        toast({
          title: "Success!",
          description: "Profile photo updated successfully",
        });
      } else {
        toast({
          title: "Update Failed",
          description: data.message || 'Failed to update profile photo',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating profile photo:', error);
      toast({
        title: "Error",
        description: "Failed to update profile photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="px-4 py-6">
          <div className="card-civic-elevated text-center py-8 mb-6">
            <Skeleton className="w-28 h-28 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 mx-auto mb-1" />
            <Skeleton className="h-3 w-40 mx-auto mb-6" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-4 py-6">
        {/* Profile Card */}
        <div className="card-civic-elevated text-center py-8 mb-6">
          {/* Avatar */}
          <div className="relative w-28 h-28 mx-auto mb-4">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-success/20 p-1">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/30 to-success/30 flex items-center justify-center">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-background"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center border-4 border-background text-white font-bold text-2xl">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center border-4 border-background shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Camera size={16} className="text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePhotoChange}
              className="hidden"
            />
          </div>

          {/* Name & Info */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="font-display font-bold text-xl text-foreground">{user?.name || 'Citizen'}</h2>
            <BadgeCheck size={20} className="text-primary" />
          </div>
          <p className="text-muted-foreground mb-1">{user?.phone?.startsWith('+') ? user.phone : `+91 ${user?.phone || 'N/A'}`}</p>
          <p className="text-sm text-muted-foreground/70">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}</p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="py-4 rounded-xl border border-border">
              <p className="font-display font-bold text-2xl text-primary">{user?.issuesReported || 0}</p>
              <p className="text-xs text-muted-foreground tracking-wider">REPORTS</p>
            </div>
            <div className="py-4 rounded-xl border border-border">
              <p className="font-display font-bold text-2xl text-success">{user?.issuesResolved || 0}</p>
              <p className="text-xs text-muted-foreground tracking-wider">RESOLVED</p>
            </div>
          </div>
        </div>

        {/* Your Activity */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">
            Your Activity
          </h3>
          <div className="card-civic divide-y divide-border p-0 overflow-hidden">
            {activityItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon size={18} className="text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">
            Preferences
          </h3>
          <div className="card-civic divide-y divide-border p-0 overflow-hidden">
            {preferenceItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path || "#")}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <item.icon size={18} className="text-muted-foreground" />
                  </div>
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">
            Support
          </h3>
          <div className="card-civic divide-y divide-border p-0 overflow-hidden">
            {supportItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                    <item.icon size={18} className="text-muted-foreground" />
                  </div>
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </button>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Udaay v2.4.0 • Digital India Initiative
        </p>
      </div>
    </MobileLayout>
  );
};

export default ProfileScreen;
