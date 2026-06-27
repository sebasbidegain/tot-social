import client from '../api/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const { data } = await client.get<{ vapidPublicKey: string }>('/push/vapid-key');
    if (!data.vapidPublicKey) return;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey),
    });

    await client.post('/push/subscribe', { subscription: subscription.toJSON() });
  } catch { /* push not available */ }
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;

    await client.post('/push/unsubscribe', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  } catch { /* */ }
}
