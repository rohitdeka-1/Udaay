import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "@/lib/auth";

interface AppHeaderProps {
  showCitySelector?: boolean;
  title?: string;
}

export const AppHeader = ({ showCitySelector = false, title }: AppHeaderProps) => {
  const [city, setCity] = useState("Getting location...");
  const [user, setUser] = useState<any>(null);
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
