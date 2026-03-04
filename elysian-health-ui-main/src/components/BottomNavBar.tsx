import { Home, Search, Bell, Clock, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const tabs = [
    { icon: Home, label: t('nav.home'), path: "/dashboard" },
    { icon: Search, label: t('nav.search'), path: "/search" },
    { icon: Bell, label: t('nav.reminders'), path: "/reminders" },
    { icon: Clock, label: t('nav.history'), path: "/history" },
    { icon: User, label: t('nav.profile'), path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-card rounded-none border-t border-x-0 border-b-0">
      <div className="flex items-center justify-around py-2 px-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-300 min-w-[56px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className={cn("w-5 h-5 transition-all", active && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {active && (
                <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
