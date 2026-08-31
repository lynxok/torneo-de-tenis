import { supabase } from './supabaseClient';

export interface PushSubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export type PushPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported' | 'ios_pwa_required';

export const pushNotificationService = {
    /**
     * Checks whether the current browser and platform support Web Push Notifications
     */
    getPermissionStatus(): PushPermissionStatus {
        if (typeof window === 'undefined') return 'unsupported';

        const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone === true;

        // Apple iOS requires standalone PWA installed to Home Screen
        if (isIos && !isStandalone) {
            return 'ios_pwa_required';
        }

        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            return 'unsupported';
        }

        return Notification.permission as PushPermissionStatus;
    },

    /**
     * Requests push notification permissions from the user
     */
    async requestPermission(): Promise<boolean> {
        const status = this.getPermissionStatus();
        if (status === 'ios_pwa_required' || status === 'unsupported') {
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    },

    /**
     * Subscribes the current device to Web Push and saves subscription in Supabase
     */
    async subscribeUser(userId?: string): Promise<PushSubscription | null> {
        try {
            if (!('serviceWorker' in navigator)) return null;

            const registration = await navigator.serviceWorker.ready;
            if (!registration.pushManager) {
                console.warn('PushManager not available on this browser');
                return null;
            }

            // Check existing subscription
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // VAPID Public Key - standard fallback
                const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
                const convertedVapidKey = this.urlBase64ToUint8Array(vapidPublicKey);

                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
            }

            if (subscription && userId) {
                await this.saveSubscriptionToSupabase(userId, subscription);
            }

            return subscription;
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            return null;
        }
    },

    /**
     * Unsubscribes current device from push notifications
     */
    async unsubscribeUser(userId?: string): Promise<boolean> {
        try {
            if (!('serviceWorker' in navigator)) return false;

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
            }

            if (userId) {
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('user_id', userId);
            }

            return true;
        } catch (error) {
            console.error('Error unsubscribing from push:', error);
            return false;
        }
    },

    /**
     * Saves subscription details in Supabase for targeted pushes
     */
    async saveSubscriptionToSupabase(userId: string, subscription: PushSubscription) {
        try {
            const rawSub = subscription.toJSON();
            const payload = {
                user_id: userId,
                endpoint: subscription.endpoint,
                p256dh_key: rawSub.keys?.p256dh || '',
                auth_key: rawSub.keys?.auth || '',
                user_agent: navigator.userAgent,
                updated_at: new Date().toISOString()
            };

            await supabase
                .from('push_subscriptions')
                .upsert(payload, { onConflict: 'endpoint' });
        } catch (e) {
            // If table does not exist or network fails, keep subscription active in local device
            console.warn('Notice: push_subscriptions sync fallback (offline or local session)', e);
        }
    },

    /**
     * Triggers a local test push notification to verify sound, badge, and vibration on device
     */
    async sendTestNotification(customTitle?: string, customBody?: string): Promise<boolean> {
        const title = customTitle || '🎾 Smash Tenis — Notificación de Prueba';
        const options: NotificationOptions = {
            body: customBody || '¡Las notificaciones Push están funcionando perfectamente en tu dispositivo!',
            icon: '/Smash.png',
            badge: '/favicon.png',
            tag: 'smash-test-notification',
            vibrate: [200, 100, 200],
            data: {
                url: window.location.origin
            }
        };

        try {
            if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready;
                await reg.showNotification(title, options);
                return true;
            } else if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, options);
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error sending local test notification:', err);
            return false;
        }
    },

    /**
     * Helper to convert VAPID public key
     */
    urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
};
