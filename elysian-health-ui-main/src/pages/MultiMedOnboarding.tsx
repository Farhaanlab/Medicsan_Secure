import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pill, Loader2, Plus, X, Check, Clock, Package, Minus, Calendar } from "lucide-react";
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
    medicine_name: string;
    medicineName?: string;
    name?: string;
    manufacturer?: string;
    composition?: string;
    price?: string;
    dosageForm?: string;
    packSizeLabel?: string;
}

const MultiMedOnboarding = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { t } = useTranslation();

    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [configuredMeds, setConfiguredMeds] = useState<Set<string>>(new Set());
    const [selectedForConfig, setSelectedForConfig] = useState<Set<string>>(new Set());

    // Individual stock states
    const [stocks, setStocks] = useState<Record<string, string>>({});

    // Schedule state (common for the current batch)
    const [dosage, setDosage] = useState("1 tablet");
    const [foodTiming, setFoodTiming] = useState("BEFORE_FOOD");
    const [reminderTimes, setReminderTimes] = useState<string[]>(["08:00"]);
    const [selectedDays, setSelectedDays] = useState<string[]>([...DAYS_OF_WEEK]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const stateMeds = location.state?.medicines;
        if (!stateMeds || stateMeds.length === 0) {
            navigate("/scan");
            return;
        }
        setMedicines(stateMeds);

        // Initialize stocks
        const initialStocks: Record<string, string> = {};
        stateMeds.forEach((m: any) => {
            initialStocks[m.medicine_name || m.name] = "10";
        });
        setStocks(initialStocks);

        // Initially select all that aren't configured
        setSelectedForConfig(new Set(stateMeds.map((m: any) => m.medicine_name || m.name)));
    }, [location.state, navigate]);

    const remainingMeds = medicines.filter(m => !configuredMeds.has(m.medicine_name || m.name || ""));

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

    const toggleMedSelection = (name: string) => {
        const next = new Set(selectedForConfig);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        setSelectedForConfig(next);
    };

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
        if (reminderTimes.length === 1 && reminderTimes[0] === "08:00") setReminderTimes([time]);
        else setReminderTimes((prev) => [...prev, time]);
    };
    const toggleDay = (day: string) => {
        setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
    };

    const parseStripQty = (label?: string) => {
        if (!label) return 10;
        const match = label.match(/(\d+)/);
        return match ? parseInt(match[1]) : 10;
    };

    const updateStock = (name: string, val: string) => {
        setStocks(prev => ({ ...prev, [name]: val }));
    };

    const handleConfirmSelection = async () => {
        if (selectedForConfig.size === 0) return;
        setIsSaving(true);
        try {
            const selectedMedsData = medicines.filter(m => selectedForConfig.has(m.medicine_name || m.name || ""));

            for (const med of selectedMedsData) {
                const name = med.medicine_name || med.name || "";
                const qty = parseInt(stocks[name]) || 10;

                // Add to inventory
                await api.addToInventory({ medicineName: name, quantity: qty });

                // Create reminders
                for (const time of reminderTimes) {
                    await api.createReminder({
                        medicineName: name,
                        dosage,
                        time,
                        days: JSON.stringify(selectedDays),
                        foodTiming
                    });
                }
            }

            toast({ title: "Reminders Set", description: `Configured ${selectedForConfig.size} medicines.` });

            const nextConfigured = new Set(configuredMeds);
            selectedForConfig.forEach(name => nextConfigured.add(name));
            setConfiguredMeds(nextConfigured);
            setSelectedForConfig(new Set());

            if (nextConfigured.size === medicines.length) {
                navigate("/reminders");
            }
        } catch (err: any) {
            toast({ title: t('common.error'), description: err.message || "Failed to save", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (medicines.length === 0) return null;

    return (
        <AppLayout>
            <PageHeader title="Complete Setup" backTo="/scan" />

            <div className="space-y-4 pb-24">
                {/* 1. Medicine Picker */}
                <GlassCard delay={0.05}>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                        1. Select medicines to configure
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {medicines.map((med, idx) => {
                            const name = med.medicine_name || med.name || "";
                            const isConfigured = configuredMeds.has(name);
                            const isSelected = selectedForConfig.has(name);

                            return (
                                <button
                                    key={idx}
                                    disabled={isConfigured}
                                    onClick={() => toggleMedSelection(name)}
                                    className={cn(
                                        "px-3 py-2 rounded-xl text-[11px] font-medium transition-all border flex items-center gap-2",
                                        isConfigured
                                            ? "bg-success/10 border-success/20 text-success opacity-60"
                                            : isSelected
                                                ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
                                                : "bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground/30"
                                    )}
                                >
                                    {isConfigured ? <Check className="w-3 h-3" /> : isSelected ? <div className="w-2 h-2 rounded-full bg-primary" /> : null}
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                </GlassCard>

                <AnimatePresence>
                    {selectedForConfig.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="space-y-4"
                        >
                            {/* 2. Individual Stock Management */}
                            <GlassCard delay={0.08}>
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-primary" /> 2. Inventory Management
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {medicines.filter(m => selectedForConfig.has(m.medicine_name || m.name || "")).map((med, idx) => {
                                        const name = med.medicine_name || med.name || "";
                                        const stripSize = parseStripQty(med.packSizeLabel);

                                        return (
                                            <div key={idx} className="p-3.5 rounded-2xl bg-secondary/30 border border-border/50">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Pill className="w-4 h-4 text-primary/60" />
                                                    <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 flex items-center justify-between glass-input px-3 h-10">
                                                        <button
                                                            onClick={() => updateStock(name, Math.max(0, (parseInt(stocks[name]) || 0) - 1).toString())}
                                                            className="p-1 hover:text-primary transition-colors"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            className="bg-transparent border-none focus:ring-0 w-full text-center text-xs font-medium"
                                                            value={stocks[name]}
                                                            onChange={(e) => updateStock(name, e.target.value)}
                                                        />
                                                        <button
                                                            onClick={() => updateStock(name, ((parseInt(stocks[name]) || 0) + 1).toString())}
                                                            className="p-1 hover:text-primary transition-colors"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            updateStock(name, ((parseInt(stocks[name]) || 0) + stripSize).toString());
                                                            toast({ title: `Added ${stripSize} ${med.dosageForm || 'Units'}`, description: `Based on strip size for ${name}` });
                                                        }}
                                                        className="px-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold hover:bg-primary/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" /> Strip
                                                    </button>
                                                </div>
                                                <p className="text-[9px] text-muted-foreground mt-2 px-1">Current Stock: {stocks[name]} units</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </GlassCard>

                            {/* 3. Batch Schedule Form */}
                            <GlassCard delay={0.12}>
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" /> 3. Schedule Settings
                                </h3>
                                <div className="space-y-5">
                                    {/* Dosage */}
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1.5 block font-medium">{t('med.dosage')}</label>
                                        <input value={dosage} onChange={(e) => setDosage(e.target.value)} className="glass-input w-full h-11" placeholder="e.g. 1 tablet, 5ml" />
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

                                    {/* Days */}
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

                                    {/* Action Button */}
                                    <button
                                        onClick={handleConfirmSelection}
                                        className="btn-gradient w-full py-4 text-sm font-semibold flex items-center justify-center gap-2 mt-4"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                        {isSaving ? "Saving..." : `Confirm scheduling for ${selectedForConfig.size} Items`}
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                {configuredMeds.size > 0 && remainingMeds.length > 0 && (
                    <p className="text-center text-[10px] text-muted-foreground italic">
                        {configuredMeds.size} configured, {remainingMeds.length} remaining.
                    </p>
                )}

                {remainingMeds.length === 0 && (
                    <GlassCard delay={0.2} className="text-center py-6 border-success/30">
                        <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="w-6 h-6 text-success" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">All medicines scheduled!</h3>
                        <p className="text-[11px] text-muted-foreground mt-1 mb-4">You have set reminders for all recognized medicines from the scan.</p>
                        <button onClick={() => navigate("/reminders")} className="btn-gradient w-full py-3 text-xs font-semibold">
                            View My Reminders
                        </button>
                    </GlassCard>
                )}
            </div>
        </AppLayout>
    );
};

export default MultiMedOnboarding;
