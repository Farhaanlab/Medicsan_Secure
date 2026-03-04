import { Home, Search, Bell, Clock, User, Shield } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const SideNav = () => {
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
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 z-40 glass-card rounded-none border-l-0 border-t-0 border-b-0 p-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_20px_hsla(var(--glow-primary))]">
          <Shield className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-display font-bold gradient-text">{t('brand.name')}</h1>
          <p className="text-[10px] text-muted-foreground -mt-0.5">{t('brand.tagline')}</p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 flex-1">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                active
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_hsla(var(--glow-primary))]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <tab.icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_6px_hsl(var(--primary))]")} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom branding */}
      <div className="text-[10px] text-muted-foreground/50 text-center">
        {t('brand.version')}
      </div>
    </aside>
  );
};

export default SideNav;
