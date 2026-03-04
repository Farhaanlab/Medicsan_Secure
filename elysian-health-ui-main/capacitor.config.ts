import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.mediscan.secure',
    appName: 'MediScan Secure',
    webDir: 'dist',
    server: {
        androidScheme: 'http',
        cleartext: true,
    },
    plugins: {
        Camera: {
            permissions: ['camera', 'photos'],
        },
    },
    android: {
        allowMixedContent: true,
    },
};

export default config;

