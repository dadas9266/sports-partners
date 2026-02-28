// src/pages/api/ws.ts
// Basit WebSocket sunucu örneği (dev/test için, prod için ayrı bir sunucu önerilir)
import { NextApiRequest } from 'next';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WebSocketServer } = require('ws');
type WebSocketClientType = { readyState: number; send: (data: unknown) => void };

const wss = new WebSocketServer({ noServer: true }) as {
  on: (event: string, cb: (ws: WebSocketClientType) => void) => void;
  clients: Set<WebSocketClientType>;
};

wss.on('connection', (ws: WebSocketClientType) => {
  (ws as unknown as { on: (e: string, cb: (msg: unknown) => void) => void }).on('message', (message: unknown) => {
    wss.clients.forEach((client: WebSocketClientType) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  });
});

export default function handler(req: NextApiRequest, res: any) {
  if (res.socket.server.wss) {
    res.end();
    return;
  }
  res.socket.server.wss = wss;
  res.end();
}
