// src/lib/ws-client.ts
// Basit WebSocket istemci helper (bildirimler için)
import { useEffect, useRef } from 'react';

export function useWebSocket(url: string, onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        // ignore
      }
    };
    ws.onerror = (e) => {
      // TODO: log error
    };
    return () => {
      ws.close();
    };
  }, [url, onMessage]);

  return wsRef;
}
