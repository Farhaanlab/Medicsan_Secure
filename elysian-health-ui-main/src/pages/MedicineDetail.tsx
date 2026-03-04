import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Pill, Loader2, Plus, X, Check } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const DAYS_OF_WEEK = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface Medicine {
    id: string;
    name: string;
    manufacturer?: string;
    composition?: string;
    price?: string;
    dosageForm?: string;
    packSizeLabel?: string;
    description?: string;
}

const MedicineDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t } = useTranslation();

    const FOOD_TIMING_OPTIONS = [
        { value: "BEFORE_FOOD", label: t('med.beforeFood'), icon: "🍽️", desc: t('med.beforeFoodDesc') },
        { value: "AFTER_FOOD", label: t('med.afterFood'), icon: "✅", desc: t('med.afterFoodDesc') },
        { value: "WITH_FOOD", label: t('med.withFood'), icon: "🥄", desc: t('med.withFoodDesc') },
        { value: "ANY", label: t('med.anyTime'), icon: "⏰", desc: t('med.anyTimeDesc') },
    ];

    const TIME_PRESETS = [
        { label: t('med.morning'), time: "08:00", icon: "🌅" },
        { label: t('med.afternoon'), time: "14:00", icon: "☀️" },
        { label: t('med.evening'), time: "18:00", icon: "🌇" },
        { label: t('med.night'), time: "22:00", icon: "🌙" },
    ];

    const [medicine, setMedicine] = useState<Medicine | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [stockQty, setStockQty] = useState("10");
    const [dosage, setDosage] = useState("1 tablet");
    const [foodTiming, setFoodTiming] = useState("BEFORE_FOOD");
    const [reminderTimes, setReminderTimes] = useState<string[]>(["08:00"]);
    const [selectedDays, setSelectedDays] = useState<string[]>([...DAYS_OF_WEEK]);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!id) return;
        api.getMedicine(id)
            .then((data) => setMedicine(data))
            .catch((err) => setError(err.message || "Failed to load medicine"))
            .finally(() => setLoading(false));
    }, [id]);

    const addTimeSlot = () => setReminderTimes((prev) => [...prev, "12:00"]);
    const removeTimeSlot = (index: number) => {
        if (reminderTimes.length <= 1) return;
        setReminderTimes((prev) => prev.filter((_, i) => i !== index));
    };
    const updateTimeSlot = (index: number, value: string) => {
        setReminderTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
    };
    const selectTimePreset = (time: string) => {
        if (reminderTimes.includes(time)) return;
        if (reminderTimes.length === 1 && reminderTimes[0] === "08:00") {
            setReminderTimes([time]);
        } else {
            setReminderTimes((prev) => [...prev, time]);
        }
    };
    const toggleDay = (day: string) => {
        setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
    };

    const handleSave = async () => {
        if (!medicine) return;
        setIsSaving(true);
        try {
            await api.addToInventory({ medicineName: medicine.name, quantity: parseInt(stockQty) || 10 });
            for (const time of reminderTimes) {
                await api.createReminder({ medicineName: medicine.name, dosage, time, days: JSON.stringify(selectedDays), foodTiming });
            }
            window.dispatchEvent(new Event('remindersUpdated'));
            setSaved(true);
            toast({ title: "✓ " + t('prof.saved'), description: `${medicine.name} added with reminders` });
        } catch (err: any) {
            toast({ title: t('common.error'), description: err.message || "Failed to save", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <PageHeader title={t('med.title')} backTo="/search" />
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            </AppLayout>
        );
    }

    if (error || !medicine) {
        return (
            <AppLayout>
                <PageHeader title={t('med.title')} backTo="/search" />
                <GlassCard className="text-center py-10">
                    <p className="text-sm text-destructive">{error || t('med.notFound')}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 text-sm text-primary hover:underline">{t('med.goBack')}</button>
                </GlassCard>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <PageHeader title={t('med.title')} backTo="/search" />

            {/* Medicine Info Card */}
            <GlassCard delay={0.05} className="mb-4">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-display font-bold text-foreground">{medicine.name}</h2>
                        {medicine.manufacturer && (
                            <p className="text-xs text-muted-foreground mt-0.5">{medicine.manufacturer}</p>
                        )}
                    </div>
                </div>

                {medicine.composition && (
                    <div className="mb-4">
                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('med.composition')}</h3>
                        <p className="text-sm text-foreground">{medicine.composition}</p>
                    </div>
                )}

                {medicine.description && (
                    <div className="mb-4">
                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('med.description')}</h3>
                        <p className="text-sm text-foreground">{medicine.description}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-success/10 p-3 border border-success/20">
                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('med.price')}</h3>
                        <p className="text-lg font-bold text-success">₹{medicine.price || "N/A"}</p>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-3 border border-primary/20">
                        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('med.packSize')}</h3>
                        <p className="text-sm font-medium text-primary">{medicine.packSizeLabel || medicine.dosageForm || "N/A"}</p>
                    </div>
                </div>
            </GlassCard>

            {/* Add & Set Reminder Button */}
            {!showForm && !saved && (
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    onClick={() => setShowForm(true)}
                    className="btn-gradient w-full py-4 text-sm font-semibold flex items-center justify-center gap-2 mb-4"
                >
                    <Plus className="w-5 h-5" /> {t('med.addToBox')}
                </motion.button>
            )}

            {saved && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full py-4 rounded-xl bg-success/20 text-success text-sm font-semibold flex items-center justify-center gap-2 mb-4"
                >
                    <Check className="w-5 h-5" /> {t('med.addedReminder')}
                </motion.div>
            )}

            {/* Reminder Setup Form */}
            {showForm && !saved && (
                <GlassCard delay={0.1} className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground mb-4">{t('med.setupReminder')}</h3>

                    <div className="space-y-5">
                        {/* Stock Quantity */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{t('med.stockQty')}</label>
                            <input type="number" min="1" value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="glass-input w-full" placeholder="10" />
                            <p className="text-[10px] text-muted-foreground mt-1">{t('med.howMany')}</p>
                        </div>

                        {/* Dosage */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{t('med.dosage')}</label>
                            <input value={dosage} onChange={(e) => setDosage(e.target.value)} className="glass-input w-full" placeholder="e.g. 1 tablet, 5ml" />
                        </div>

                        {/* Food Timing */}
                        <div>
                            <label className="text-xs text-muted-foreground mb-2 block font-medium">{t('med.whenToTake')}</label>
                            <div className="grid grid-cols-2 gap-2">
                                {FOOD_TIMING_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setFoodTiming(opt.value)}
                                        className={cn(
                                            "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center",
                                            foodTiming === opt.value
                                                ? "border-primary bg-primary/10 shadow-[0_0_12px_hsla(var(--glow-primary))]"
                                                : "border-border bg-secondary/30 hover:border-muted-foreground/30"
                                        )}
                                    >
                                        <span className="text-lg">{opt.icon}</span>
                                        <span className={cn("text-[11px] font-medium", foodTiming === opt.value ? "text-primary" : "text-foreground")}>{opt.label}</span>
                                        <span className="text-[9px] text-muted-foreground">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time Presets */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs text-muted-foreground font-medium">{t('med.timeOfDay')}</label>
                                <button type="button" onClick={addTimeSlot} className="text-[11px] text-primary hover:underline font-medium">{t('med.addTime')}</button>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {TIME_PRESETS.map((preset) => (
                                    <button
                                        key={preset.time}
                                        type="button"
                                        onClick={() => selectTimePreset(preset.time)}
                                        className={cn(
                                            "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all",
                                            reminderTimes.includes(preset.time)
                                                ? "border-primary bg-primary/10"
                                                : "border-border bg-secondary/30 hover:border-muted-foreground/30"
                                        )}
                                    >
                                        <span className="text-base">{preset.icon}</span>
                                        <span className="text-[10px] font-medium text-muted-foreground">{preset.label}</span>
                                    </button>
                                ))}
                            </div>
                            {reminderTimes.map((time, idx) => (
                                <div key={idx} className="flex items-center gap-2 mb-2">
                                    <span className="text-[11px] text-muted-foreground w-14">{t('med.dose')} {idx + 1}</span>
                                    <input type="time" value={time} onChange={(e) => updateTimeSlot(idx, e.target.value)} className="glass-input flex-1" />
                                    {reminderTimes.length > 1 && (
                                        <button onClick={() => removeTimeSlot(idx)} className="p-1.5 text-destructive/60 hover:text-destructive transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Days of Week */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs text-muted-foreground font-medium">{t('med.days')}</label>
                                <button type="button" onClick={() => setSelectedDays(selectedDays.length === 7 ? [] : [...DAYS_OF_WEEK])} className="text-[11px] text-primary hover:underline">
                                    {selectedDays.length === 7 ? t('med.deselectAll') : t('med.selectAll')}
                                </button>
                            </div>
                            <div className="flex gap-1.5">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className={cn(
                                            "flex-1 py-2 rounded-lg text-[11px] font-medium transition-all",
                                            selectedDays.includes(day)
                                                ? "bg-gradient-to-r from-primary to-accent text-foreground shadow-[0_0_8px_hsla(var(--glow-primary))]"
                                                : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                                        )}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSave}
                            className="btn-gradient w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
                            disabled={isSaving}
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isSaving ? t('med.saving') : t('med.saveReminder')}
                        </button>
                    </div>
                </GlassCard>
            )}
        </AppLayout>
    );
};

export default MedicineDetail;
