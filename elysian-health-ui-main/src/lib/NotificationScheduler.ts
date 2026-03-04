import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface GroupedReminder {
    medicineName: string;
    dosage?: string;
    ids: string[];
    times: string[];
    days: string;
    foodTiming: string;
}

export class NotificationScheduler {
    static async requestPermissions() {
        if (!Capacitor.isNativePlatform()) return true;

        try {
            const check = await LocalNotifications.checkPermissions();
            if (check.display !== 'granted') {
                const request = await LocalNotifications.requestPermissions();
                return request.display === 'granted';
            }
            return true;
        } catch (e) {
            console.error('Permission request failed', e);
            return false;
        }
    }

    static async sync(reminders: any[]) {
        if (!Capacitor.isNativePlatform()) return;

        const hasPerms = await this.requestPermissions();
        if (!hasPerms) return;

        await LocalNotifications.cancel({ notifications: (await LocalNotifications.getPending()).notifications });

        // Group by HH:MM exact time
        const timeMap = new Map<string, string[]>();

        reminders.forEach(r => {
            if (!r.isActive) return;
            const times = r.time.split(',').map((t: string) => t.trim());
            times.forEach((t: string) => {
                if (!timeMap.has(t)) timeMap.set(t, []);
                timeMap.get(t)!.push(r.medicineName);
            });
        });

        // Register action types
        await LocalNotifications.registerActionTypes({
            types: [
                {
                    id: 'REMINDER_ACTIONS',
                    actions: [
                        { id: 'TAKEN', title: 'Mark Taken' },
                        { id: 'SKIP', title: 'Skip' },
                        { id: 'SNOOZE', title: 'Snooze (5m)' },
                    ]
                }
            ]
        });

        const scheduledNotifications = [];
        let idCounter = 1;

        // Note: Capacitor Local Notifications can be scheduled by Hour and Minute on daily/weekly repeating.
        // We will schedule a daily repeating alarm for each active time.
        // If the user wants specific days, we would use 'schedule: { on: { weekday: X, hour: Y, minute: Z } }' 
        // For simplicity, we schedule it daily and logic could skip if not right day.

        for (const [timeStr, meds] of Array.from(timeMap.entries())) {
            const match = timeStr.match(/^(\d{2}):(\d{2})$/);
            if (!match) continue;

            const hour = parseInt(match[1]);
            const minute = parseInt(match[2]);

            // Add display friendly time format for notification body if desired, 
            // but just passing it native uses 24h which is fine.

            scheduledNotifications.push({
                id: idCounter++,
                title: 'Medicine Reminder',
                body: `Time to take: ${meds.join(', ')}`,
                schedule: { on: { hour, minute }, allowWhileIdle: true }, // iOS/Android repeating
                sound: 'alert.mp3', // points to res/raw/alert.mp3
                actionTypeId: 'REMINDER_ACTIONS',
                extra: { timeStr, meds }
            });
        }

        if (scheduledNotifications.length > 0) {
            await LocalNotifications.schedule({ notifications: scheduledNotifications });
        }
    }
}
