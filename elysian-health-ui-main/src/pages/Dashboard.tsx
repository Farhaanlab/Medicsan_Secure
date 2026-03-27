import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Clock, Pill, ScanLine, Bot, LogOut, CalendarDays, History, Activity, TrendingUp, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const features = [
    { icon: Search, label: t('dash.searchMeds'), desc: t('dash.findDrug'), gradient: "from-[hsl(var(--primary))] to-[hsl(var(--cyan))]", path: "/search" },
    { icon: History, label: t('dash.history'), desc: t('dash.viewLogs'), gradient: "from-[hsl(var(--violet))] to-[hsl(var(--rose))]", path: "/history" },
    { icon: Pill, label: t('dash.myMeds'), desc: t('dash.manageReminders'), gradient: "from-[hsl(var(--emerald))] to-[hsl(var(--cyan))]", path: "/reminders" },
    { icon: ScanLine, label: t('dash.scanRx'), desc: t('dash.scanPresc'), gradient: "from-[hsl(var(--amber))] to-[hsl(var(--rose))]", path: "/scan" },
    { icon: Bot, label: t('dash.aiAssistant'), desc: t('dash.askAnything'), gradient: "from-[hsl(var(--indigo))] to-[hsl(var(--violet))]", path: "/chat" },
  ];

  const [stats, setStats] = useState([
    { label: t('dash.activeMeds'), value: "—", icon: Pill, color: "text-emerald" },
    { label: t('dash.todaysDoses'), value: "—", icon: Activity, color: "text-primary" },
    { label: t('dash.adherence'), value: "—", icon: TrendingUp, color: "text-violet" },
  ]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [reminders, history] = await Promise.all([
        api.getReminders().catch(() => []),
        api.getHistory().catch(() => []),
      ]);

      const uniqueMeds = new Set(reminders.map((r: any) => r.medicineName));
      const activeMeds = uniqueMeds.size;
      
      const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const todaysDoses = new Set(
        reminders.filter((r: any) => r.days.includes(todayStr) || r.days.includes('EVERYDAY'))
                 .map((r: any) => r.medicineName)
      ).size;

      const totalLogs = history.length;
      const takenLogs = history.filter((h: any) => h.status === 'TAKEN').length;
      const adherence = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 100;

      setStats([
        { label: t('dash.activeMeds'), value: String(activeMeds), icon: Pill, color: "text-emerald" },
        { label: t('dash.todaysDoses'), value: String(todaysDoses), icon: Activity, color: "text-primary" },
        { label: t('dash.adherence'), value: `${adherence}%`, icon: TrendingUp, color: "text-violet" },
      ]);

      const today = new Date().toDateString();
      const todayHistory = history.filter((h: any) => new Date(h.takenAt).toDateString() === today);
      
      // Calculate how many times each medicine was taken/skipped today
      const takenCounts: Record<string, number> = {};
      todayHistory.forEach((h: any) => {
          if (h.status === 'TAKEN' || h.status === 'SKIPPED') {
              takenCounts[h.medicineName] = (takenCounts[h.medicineName] || 0) + 1;
          }
      });

      // Sort all reminders by time chronologically
      const sortedReminders = [...reminders].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      
      // Map logs to slots sequentially
      const markedCounts: Record<string, number> = {};
      const scheduleItems = sortedReminders.map((r: any) => {
        const medName = r.medicineName;
        const totalTaken = takenCounts[medName] || 0;
        const alreadyMarked = markedCounts[medName] || 0;
        
        let isTaken = false;
        if (alreadyMarked < totalTaken) {
            isTaken = true;
            markedCounts[medName] = alreadyMarked + 1;
        }

        return {
          name: r.medicineName + (r.dosage ? ` ${r.dosage}` : ''),
          time: r.time,
          taken: isTaken,
        };
      });

      // Slice array to up to 6 to fit nicely without scrolling
      setSchedule(scheduleItems.slice(0, 6));
    } catch {
      // Keep defaults
    } finally {
      setLoadingData(false);
    }
  }, [t]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AppLayout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <p className="text-sm text-muted-foreground">{t('dash.welcome')}</p>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">{user?.fullName || t('dash.user')}</h1>
        </div>
        <button
          onClick={handleLogout}
          className="p-2.5 rounded-xl glass-card hover:bg-secondary/50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </button>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map((s, i) => (
          <GlassCard key={s.label} delay={i * 0.06} className="text-center py-4">
            <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
            <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {features.map((f, i) => (
          <GlassCard
            key={f.label}
            delay={0.2 + i * 0.06}
            className="cursor-pointer group hover:scale-[1.03] hover:shadow-[0_0_30px_hsla(var(--glow-primary))] transition-all duration-300"
            onClick={() => navigate(f.path)}
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:shadow-xl transition-shadow`}>
              <f.icon className="w-5 h-5 text-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">{f.label}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</p>
          </GlassCard>
        ))}
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard delay={0.5}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t('dash.todaysSchedule')}</h3>
          </div>
          {loadingData ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : schedule.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('dash.noReminders')}</p>
          ) : (
            <div className="space-y-2">
              {schedule.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/40">
                  <div className={`w-2 h-2 rounded-full ${item.taken ? 'bg-emerald' : 'bg-amber'}`} />
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.time} — {item.taken ? t('dash.taken') : t('dash.upcoming')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard delay={0.6}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-violet" />
            <h3 className="text-sm font-semibold text-foreground">{t('dash.recentScans')}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t('dash.noScans')}</p>
        </GlassCard>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
