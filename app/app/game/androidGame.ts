"use client";

type Reply = { id: number; status: number; body: unknown };
type Bridge = { postMessage(data: string): void; onmessage: ((event: MessageEvent<string>) => void) | null };

let nextId = 0;
const pending = new Map<number, (reply: Reply) => void>();

export function androidGameRequest(action: "state" | "action" | "buildings" | "signIn" | "map", body?: object) {
  const bridge = (window as Window & { DreamlyGame?: Bridge }).DreamlyGame;
  if (!bridge) return Promise.reject(new Error("Android game connection unavailable"));
  bridge.onmessage = ({ data }) => {
    const reply = JSON.parse(data) as Reply;
    pending.get(reply.id)?.(reply);
  };
  return new Promise<Response>((resolve, reject) => {
    const id = ++nextId;
    const timeout = window.setTimeout(() => {
      pending.delete(id);
      reject(new Error("Android game request timed out"));
    }, 25_000);
    pending.set(id, (reply) => {
      window.clearTimeout(timeout);
      pending.delete(id);
      resolve(Response.json(reply.body, { status: reply.status }));
    });
    try {
      bridge.postMessage(JSON.stringify({ id, action, body, path: window.location.pathname }));
    } catch (error) {
      window.clearTimeout(timeout);
      pending.delete(id);
      reject(error);
    }
  });
}
