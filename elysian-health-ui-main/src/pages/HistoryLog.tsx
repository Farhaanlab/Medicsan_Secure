import { useState, useEffect } from "react";
import { CheckCircle2, MinusCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { format, isToday, isYesterday } from "date-fns";
import { useTranslation } from "@/lib/i18n";

interface HistoryEntry {
  id: string;
  medicineName: string;
  status: string;
  takenAt: string;
}

const HistoryLog = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const timeStr = format(date, "hh:mm a");
    if (isToday(date)) return `${t('hist.today')}, ${timeStr}`;
    if (isYesterday(date)) return `${t('hist.yesterday')}, ${timeStr}`;
    return format(date, "MMM d, hh:mm a");
  }

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await api.getHistory();
        setHistory(data);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title={t('hist.title')} backTo="/dashboard" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title={t('hist.title')} backTo="/dashboard" />

      {history.length === 0 ? (
        <div className="glass-card p-6 text-center max-w-2xl">
          <p className="text-sm text-muted-foreground">{t('hist.noHistory')}</p>
        </div>
      ) : (
        <div className="relative max-w-2xl">
          <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-1">
            {history.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-start gap-4 py-3 pl-1"
              >
                <div className="relative z-10 mt-0.5">
                  {entry.status === "TAKEN" ? (
                    <CheckCircle2 className="w-[18px] h-[18px] text-success" />
                  ) : (
                    <MinusCircle className="w-[18px] h-[18px] text-warning" />
                  )}
                </div>
                <div className="flex-1 glass-card p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{entry.medicineName}</p>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-md",
                        entry.status === "TAKEN"
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      )}
                    >
                      {entry.status === "TAKEN" ? t('dash.taken') : t('rem.skip')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{formatTime(entry.takenAt)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default HistoryLog;
