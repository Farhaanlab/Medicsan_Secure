import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, Loader2, SkipForward, Pencil, Package } from "lucide-react";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { NotificationScheduler } from "@/lib/NotificationScheduler";

interface Reminder {
  id: string;
  medicineName: string;
  dosage?: string;
  time: string;
  days: string;
  foodTiming: string;
  isActive: boolean;
}

interface GroupedReminder {
  medicineName: string;
  dosage?: string;
  ids: string[];
  times: string[];
  days: string;
  foodTiming: string;
}

interface InventoryItem {
  id: string;
  medicineName: string;
  quantity: number;
}

function parseStripQty(packSizeLabel?: string): number {
  if (!packSizeLabel) return 10;
  const match = packSizeLabel.match(/(\d+)/);
  return match ? parseInt(match[1]) : 10;
}

const Reminders = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [medicineDetails, setMedicineDetails] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const groupedReminders = useMemo<GroupedReminder[]>(() => {
    const map = new Map<string, GroupedReminder>();
    for (const r of reminders) {
      const key = r.medicineName.toLowerCase().trim();
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.ids.push(r.id);
        const newTimes = r.time.split(",").map((t) => t.trim()).filter(Boolean);
        for (const t of newTimes) {
          if (!existing.times.includes(t)) existing.times.push(t);
        }
        if (!existing.dosage && r.dosage) existing.dosage = r.dosage;
      } else {
        map.set(key, {
          medicineName: r.medicineName,
          dosage: r.dosage,
          ids: [r.id],
          times: r.time.split(",").map((t) => t.trim()).filter(Boolean),
          days: r.days,
          foodTiming: r.foodTiming,
        });
      }
    }
    return Array.from(map.values());
  }, [reminders]);

  const loadData = useCallback(async () => {
    try {
      const [remData, invData] = await Promise.all([
        api.getReminders().catch(() => []),
        api.getInventory().catch(() => []),
      ]);
      setReminders(remData);
      setInventory(invData);

      // Sync native background notifications
      NotificationScheduler.sync(remData);

      const uniqueNames = [...new Set(remData.map((r: Reminder) => r.medicineName))];
      const details: Record<string, any> = {};
      await Promise.all(
        uniqueNames.map(async (name: string) => {
          try {
            const results = await api.searchMedicines(name);
            if (results.length > 0) details[name] = results[0];
          } catch { /* skip */ }
        })
      );
      setMedicineDetails(details);
    } catch { /* keep defaults */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getStock = (medicineName: string): { id: string; quantity: number } | null => {
    const item = inventory.find((inv) => inv.medicineName === medicineName);
    return item ? { id: item.id, quantity: item.quantity } : null;
  };

  const updateStock = async (medicineName: string, delta: number) => {
    const item = getStock(medicineName);
    if (item) {
      const newQty = Math.max(0, item.quantity + delta);
      try {
        await api.updateInventory(item.id, { quantity: newQty });
        setInventory((prev) => prev.map((inv) => (inv.id === item.id ? { ...inv, quantity: newQty } : inv)));
      } catch {
        toast({ title: t('common.error'), description: "Failed to update stock", variant: "destructive" });
      }
    } else if (delta > 0) {
      try {
        const newItem = await api.addToInventory({ medicineName, quantity: delta });
        setInventory((prev) => [...prev, newItem]);
      } catch {
        toast({ title: t('common.error'), description: "Failed to add stock", variant: "destructive" });
      }
    }
  };

  const deleteGroupedReminder = async (ids: string[], medicineName: string) => {
    try {
      await Promise.all(ids.map((id) => api.deleteReminder(id)));
      setReminders((prev) => prev.filter((r) => !ids.includes(r.id)));
      window.dispatchEvent(new Event('remindersUpdated'));
      toast({ title: t('rem.deleted'), description: t('rem.allRemoved', { name: medicineName }) });
    } catch {
      toast({ title: t('common.error'), description: "Failed to delete reminders", variant: "destructive" });
    }
  };

  const logIntake = async (medicineName: string, status: string) => {
    try {
      await api.logIntake(medicineName, status);
      toast({ title: status === "TAKEN" ? `✓ ${t('rem.taken')}` : t('rem.skip'), description: medicineName });
      if (status === "TAKEN") await updateStock(medicineName, -1);
    } catch {
      toast({ title: t('common.error'), description: "Failed to log intake", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title={t('rem.title')} backTo="/dashboard" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title={t('rem.title')} backTo="/dashboard" />

      {groupedReminders.length === 0 ? (
        <GlassCard delay={0.1} className="text-center py-12">
          <p className="text-sm text-muted-foreground">{t('rem.noReminders')}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groupedReminders.map((group, i) => {
            const stock = getStock(group.medicineName);
            const medInfo = medicineDetails[group.medicineName];
            const stripQty = parseStripQty(medInfo?.packSizeLabel);
            const stripLabel = medInfo?.packSizeLabel ? `+1 Strip (${stripQty})` : `+${stripQty}`;

            return (
              <GlassCard key={group.medicineName} delay={i * 0.1}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-sm text-foreground">
                    {group.medicineName}{group.dosage ? ` ${group.dosage}` : ""}
                  </h3>
                  <button onClick={() => deleteGroupedReminder(group.ids, group.medicineName)} className="p-1 text-destructive/70 hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Stock Controls */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs text-muted-foreground">{t('rem.stock')}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateStock(group.medicineName, -1)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center text-foreground">{stock?.quantity ?? 0}</span>
                    <button onClick={() => updateStock(group.medicineName, 1)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => updateStock(group.medicineName, stripQty)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
                    title={`Add 1 strip (${stripQty} units)`}
                  >
                    <Package className="w-3 h-3 text-primary" />
                    <span className="text-[11px] font-medium text-primary">{stripLabel}</span>
                  </button>
                </div>

                {/* Time Pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {group.times.map((time) => (
                    <span key={time} className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium">{time}</span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => logIntake(group.medicineName, "TAKEN")}
                    className="flex-1 py-2 rounded-xl bg-success/20 text-success text-xs font-semibold hover:bg-success/30 transition-colors"
                  >
                    {t('rem.taken')}
                  </button>
                  <button
                    onClick={() => logIntake(group.medicineName, "SKIPPED")}
                    className="flex-1 py-2 rounded-xl border border-warning/30 text-warning text-xs font-semibold hover:bg-warning/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    {t('rem.skip')}
                  </button>
                </div>

                {/* Edit Reminder */}
                <button
                  onClick={() => {
                    if (medInfo?.id) navigate(`/medicine/${medInfo.id}`);
                    else navigate(`/search`);
                  }}
                  className="w-full mt-3 py-2 rounded-xl border border-primary/20 text-xs font-medium text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t('rem.editReminder')}
                </button>
              </GlassCard>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default Reminders;
