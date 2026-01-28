import { Home, Plus, AlertCircle, User, Map, FileText } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: AlertCircle, label: "Issues", path: "/issues" },
  { icon: Plus, label: "Report", path: "/report", isFab: true },
  { icon: FileText, label: "Tickets", path: "/tickets" },
  { icon: User, label: "Profile", path: "/profile" },
];

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav safe-area-inset-bottom">
      <div className="flex items-center justify-around w-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          if (item.isFab) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="bottom-nav-fab"
                aria-label={item.label}
              >
                <item.icon size={26} strokeWidth={2.5} />
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
              aria-label={item.label}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
