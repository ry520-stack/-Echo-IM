import { getPlus, is5Plus } from './env';

export interface NativePushPayload {
  chatId: string;
}

export function createNativeMessage(title: string, body: string, payload: NativePushPayload) {
  if (!is5Plus()) return false;
  const plus = getPlus();
  if (!plus?.push?.createMessage) return false;
  try {
    plus.push.createMessage(body, JSON.stringify(payload), {
      title,
      sound: 'system',
      cover: false,
    });
    return true;
  } catch {
    return false;
  }
}

export function bindNativePushClick() {
  if (!is5Plus()) return () => {};
  const plus = getPlus();
  if (!plus?.push?.addEventListener) return () => {};

  const handler = (msg: any) => {
    try {
      const rawPayload = msg?.payload || msg?.payloadString || msg?.content;
      const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
      if (payload?.chatId) {
        window.location.hash = `#/chat/${payload.chatId}`;
      }
    } catch {
      // Ignore malformed payloads from older local notifications.
    }
  };

  plus.push.addEventListener('click', handler, false);
  return () => {
    try {
      plus.push.removeEventListener?.('click', handler);
    } catch {
      // Some 5+ runtimes do not expose removeEventListener for push.
    }
  };
}
