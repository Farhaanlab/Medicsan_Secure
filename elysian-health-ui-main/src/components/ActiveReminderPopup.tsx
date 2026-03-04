import { useState, useEffect, useRef } from "react";
import { X, CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, getStoredUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { NotificationScheduler } from "@/lib/NotificationScheduler";

export default function ActiveReminderPopup() {
    const [reminders, setReminders] = useState<any[]>([]);
    const remindersRef = useRef<any[]>([]);
    const [activeMeds, setActiveMeds] = useState<string[]>([]);
    const [activeTime, setActiveTime] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { toast } = useToast();

    // Track which times we've already alarmed for today
    const lastAlarmedTime = useRef<string | null>(null);

    useEffect(() => {
        // Load reminders
        const fetchReminders = async () => {
            try {
                const data = await api.getReminders();
                setReminders(data);
                remindersRef.current = data;
                NotificationScheduler.sync(data); // Sync background too
            } catch (e) {
                console.error("Failed to load reminders for alarms", e);
            }
        };
        fetchReminders();

        window.addEventListener('remindersUpdated', fetchReminders);

        // Check every minute
        const interval = setInterval(() => {
            checkTime(remindersRef.current);
        }, 10000); // Check every 10 seconds to not miss the minute mark

        // Handle Native Background App wakeup logic
        if (Capacitor.isNativePlatform()) {
            App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    fetchReminders(); // Refresh on wake
                    checkTime(remindersRef.current);
                }
            });
        }

        return () => {
            clearInterval(interval);
            window.removeEventListener('remindersUpdated', fetchReminders);
            if (Capacitor.isNativePlatform()) {
                App.removeAllListeners();
            }
        };
    }, []);

    const checkTime = (currentReminders: any[]) => {
        if (activeMeds.length > 0) return; // Already showing an alarm

        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        const timeString = `${hours}:${minutes}`;

        if (lastAlarmedTime.current === timeString) return; // Already alarmed for this minute

        // Find all meds matching this exact time string
        const medsForNow: string[] = [];
        currentReminders.forEach((r) => {
            if (!r.isActive) return;
            const times = r.time.split(',').map((t: string) => t.trim());
            if (times.includes(timeString)) {
                medsForNow.push(r.medicineName);
            }
        });

        if (medsForNow.length > 0) {
            setActiveMeds(medsForNow);
            setActiveTime(timeString);
            lastAlarmedTime.current = timeString;
            playRingtone();
        }
    };

    const playRingtone = () => {
        try {
            const user = getStoredUser();
            let src = '/alert.mp3';

            // If web or if native but they have a custom tone, try custom tone.
            // (Native can only play custom if foregrounded, which is the case since this React component is running)
            if (user?.ringtoneUrl) {
                src = `http://localhost:3001${user.ringtoneUrl}`;
            }

            if (!audioRef.current) {
                audioRef.current = new Audio(src);
                audioRef.current.loop = true;
            } else {
                audioRef.current.src = src;
            }
            audioRef.current.play().catch(e => console.log('Audio autoplay blocked', e));
        } catch (e) { }
    };

    const stopRingtone = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const handleAction = async (status: 'TAKEN' | 'SKIPPED') => {
        stopRingtone();
        setActiveMeds([]);
        setActiveTime(null);
        toast({ title: "Logged", description: `Medicines marked as ${status.toLowerCase()}` });

        // Log to backend
        for (const med of activeMeds) {
            try {
                await api.logIntake(med, status);
            } catch (e) {
                // failed to log one
            }
        }
    };

    const handleSnooze = () => {
        stopRingtone();
        setActiveMeds([]);
        setActiveTime(null);
        toast({ title: "Snoozed", description: "We will remind you again in 5 minutes" });

        // Simple Snooze: Schedule a fake reminder check in 5 minutes
        setTimeout(() => {
            setActiveMeds(activeMeds);
            setActiveTime(activeTime);
            playRingtone();
        }, 5 * 60 * 1000);
    };

    if (activeMeds.length === 0) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-destructive/30 overflow-hidden"
                >
                    <div className="bg-destructive/10 p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4 animate-pulse">
                            <Clock className="w-8 h-8 text-destructive" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">Time for Medicine</h2>
                        <p className="text-muted-foreground mt-1">
                            {(() => {
                                if (!activeTime) return "";
                                // Format 24h back to 12h for display
                                const [h, m] = activeTime.split(':');
                                let hour = parseInt(h);
                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                hour = hour % 12 || 12;
                                return `${hour}:${m} ${ampm}`;
                            })()}
                        </p>
                    </div>

                    <div className="p-6">
                        <ul className="space-y-3 mb-6">
                            {activeMeds.map((med, idx) => (
                                <li key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30">
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                    <span className="font-medium text-lg text-foreground">{med}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleAction('TAKEN')}
                                className="col-span-2 btn-gradient py-3 flex items-center justify-center gap-2 text-lg font-medium"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Mark as Taken
                            </button>

                            <button
                                onClick={handleSnooze}
                                className="py-3 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                            >
                                Snooze 5m
                            </button>

                            <button
                                onClick={() => handleAction('SKIPPED')}
                                className="py-3 px-4 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 font-medium transition-colors"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
