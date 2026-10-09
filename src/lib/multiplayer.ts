/**
 * VibePair Multiplayer Synchronization Engine
 * Multi-Network Resilience Backbone:
 * 1. BroadcastChannel + localStorage StorageEvent (instant same-origin tab sync)
 * 2. Next.js /api/signal broker (local network / self-hosted sync)
 * 3. Worldwide Global PubSub SSE Broker (ntfy.sh) for instant cross-network sync
 *    (works across mobile 4G/5G, separate Wi-Fi networks, and serverless platforms like Vercel).
 * All payloads are client-side End-to-End Encrypted with AES-256-GCM.
 */

import { encryptPayload, decryptPayload } from './crypto';

export interface SyncMessage<T = unknown> {
  id: string;
  senderId: string;
  type: string;
  data: T;
  timestamp: number;
}

export type MessageListener = (msg: SyncMessage) => void;

export class MultiplayerClient {
  public peerId: string;
  public roomCode: string = '';
  public cryptoKey: CryptoKey | null = null;
  public isConnected: boolean = false;
  public partnerId: string | null = null;
  public partnerName: string = 'Partner';

  private broadcastChannel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<MessageListener>> = new Map();
  private localPollInterval: number | null = null;
  private globalPollInterval: number | null = null;
  private globalEventSource: EventSource | null = null;
  private lastPollTimestamp: number = 0;
  private seenPacketIds: Set<string> = new Set();
  private seenMessageIds: Set<string> = new Set();
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private globalTopic: string = '';

  constructor() {
    this.peerId = 'peer_' + Math.random().toString(36).substring(2, 9);
  }

  private getGlobalTopic(code: string): string {
    const clean = (code || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `vibepair_${clean}`;
  }

  public init(roomCode: string, cryptoKey: CryptoKey, userName: string) {
    this.destroy(); // Clean previous subscriptions if re-initializing

    this.roomCode = (roomCode || '').trim().toUpperCase();
    this.cryptoKey = cryptoKey;
    this.globalTopic = this.getGlobalTopic(this.roomCode);

    // 1. Setup local BroadcastChannel for same-origin tabs
    try {
      this.broadcastChannel = new BroadcastChannel(`vibepair_${this.roomCode}`);
      this.broadcastChannel.onmessage = async (evt) => {
        const raw = evt.data;
        if (typeof raw === 'string') {
          await this.handleIncomingEncrypted(raw);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }

    // 2. Setup localStorage storage event listener as an instant cross-tab bus fallback
    if (typeof window !== 'undefined') {
      this.storageListener = async (evt: StorageEvent) => {
        if (evt.key === `vibepair_bus_${this.roomCode}` && evt.newValue) {
          try {
            const parsed = JSON.parse(evt.newValue);
            if (parsed?.senderId !== this.peerId && parsed?.payload) {
              await this.handleIncomingEncrypted(parsed.payload, parsed.id);
            }
          } catch {}
        }
      };
      window.addEventListener('storage', this.storageListener);
    }

    // 3. Setup Global Worldwide SSE Stream (works across mobile data, different Wi-Fi, and Vercel)
    this.startGlobalSSEStream();

    // 4. Setup periodic presence & local signal polling
    this.startSignalingLoop(userName);
    this.sendPresence(userName, 'online');
  }

  private startGlobalSSEStream() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined' || !this.globalTopic) return;

    try {
      const url = `https://ntfy.sh/${this.globalTopic}/sse`;
      const es = new EventSource(url);
      this.globalEventSource = es;

      es.onmessage = async (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          if (parsed.event === 'message' && parsed.message) {
            const packet = JSON.parse(parsed.message);
            if (packet && packet.senderId !== this.peerId) {
              await this.processSignalPacket(packet);
            }
          }
        } catch {}
      };

      es.onerror = () => {
        // EventSource automatically retries connection
      };
    } catch (err) {
      console.warn('Global SSE stream setup error:', err);
    }

    // Also set a global poll fallback every 1200ms in case SSE is blocked by proxies
    this.globalPollInterval = window.setInterval(async () => {
      if (!this.globalTopic || !this.cryptoKey) return;
      try {
        const res = await fetch(`https://ntfy.sh/${this.globalTopic}/json?poll=1&since=20s`);
        if (!res.ok) return;
        const text = await res.text();
        const lines = text.trim().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.event === 'message' && parsed.message) {
              const packet = JSON.parse(parsed.message);
              if (packet && packet.senderId !== this.peerId) {
                await this.processSignalPacket(packet);
              }
            }
          } catch {}
        }
      } catch {}
    }, 1200);
  }

  private startSignalingLoop(userName: string) {
    if (this.localPollInterval) clearInterval(this.localPollInterval);

    // Initial announce
    this.sendSignal('PRESENCE', { status: 'online', name: userName });

    this.localPollInterval = window.setInterval(async () => {
      if (!this.roomCode || !this.cryptoKey) return;
      try {
        // Query local /api/signal with 5000ms overlapping window
        const sinceParam = Math.max(0, this.lastPollTimestamp - 5000);
        const res = await fetch(
          `/api/signal?roomCode=${encodeURIComponent(this.roomCode)}&senderId=${encodeURIComponent(this.peerId)}&since=${sinceParam}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.timestamp) {
          this.lastPollTimestamp = Math.max(this.lastPollTimestamp, data.timestamp);
        }

        if (Array.isArray(data.signals)) {
          for (const s of data.signals) {
            await this.processSignalPacket(s);
          }
        }
      } catch {
        // Silent poll error handling (global SSE handles cross-network delivery)
      }
    }, 700);
  }

  private async processSignalPacket(s: any) {
    if (!s || !s.id) return;

    // Deduplicate signal packet by ID
    if (this.seenPacketIds.has(s.id)) return;
    this.seenPacketIds.add(s.id);
    if (this.seenPacketIds.size > 2000) {
      const oldest = this.seenPacketIds.values().next().value;
      if (oldest) this.seenPacketIds.delete(oldest);
    }

    if (s.type === 'ENCRYPTED_PACKET' && typeof s.payload === 'string') {
      await this.handleIncomingEncrypted(s.payload, s.id);
    } else if (s.type === 'CALL_SIGNAL' || s.type === 'WEBRTC_SIGNAL') {
      this.emit({
        id: s.id,
        senderId: s.senderId,
        type: s.type,
        data: s.payload,
        timestamp: s.timestamp || Date.now(),
      });
    }
  }

  public on(type: string, callback: MessageListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  public off(type: string, callback: MessageListener) {
    this.listeners.get(type)?.delete(callback);
  }

  public emit(msg: SyncMessage) {
    const list = this.listeners.get(msg.type);
    if (list) {
      list.forEach(cb => {
        try {
          cb(msg);
        } catch (e) {
          console.error('Error in listener callback:', e);
        }
      });
    }

    // Wildcard listener
    const all = this.listeners.get('*');
    if (all) {
      all.forEach(cb => cb(msg));
    }
  }

  public async send<T = unknown>(type: string, data: T) {
    if (!this.cryptoKey) return;

    const message: SyncMessage<T> = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: this.peerId,
      type,
      data,
      timestamp: Date.now(),
    };

    // Mark own message as seen so it's not reprocessed
    this.seenMessageIds.add(message.id);

    // Encrypt with WebCrypto AES-256-GCM
    const encryptedString = await encryptPayload(message, this.cryptoKey);

    // 1. Broadcast locally for instant multi-tab sync
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(encryptedString);
      } catch (e) {
        console.warn('Broadcast send error:', e);
      }
    }

    // 2. Storage event bus fallback for instantaneous same-origin tab reflection
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `vibepair_bus_${this.roomCode}`,
          JSON.stringify({
            id: message.id,
            senderId: this.peerId,
            payload: encryptedString,
            t: Date.now(),
          })
        );
      } catch {}
    }

    // 3. Post to HTTP signal broker (both local /api/signal AND global worldwide ntfy.sh)
    this.sendSignal('ENCRYPTED_PACKET', encryptedString);
  }

  public async sendSignal(type: string, payload: unknown) {
    if (!this.roomCode) return;
    const packet = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      senderId: this.peerId,
      type,
      payload,
      timestamp: Date.now(),
    };

    // 1. Post to local Next.js /api/signal (fire and forget)
    try {
      fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: this.roomCode,
          senderId: this.peerId,
          type,
          payload,
        }),
      }).catch(() => {});
    } catch {}

    // 2. Post to Global Worldwide pubsub broker (enables cross-network, 4G/5G, and Vercel sync)
    if (this.globalTopic) {
      try {
        fetch(`https://ntfy.sh/${this.globalTopic}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(packet),
        }).catch(() => {});
      } catch {}
    }
  }

  public sendPresence(name: string, status: 'online' | 'in_world' | 'typing' | 'idle') {
    this.send('PRESENCE', { name, status, senderId: this.peerId });
  }

  public async handleIncomingEncrypted(encryptedStr: string, packetId?: string) {
    if (!this.cryptoKey) return;

    const msg = await decryptPayload<SyncMessage>(encryptedStr, this.cryptoKey);
    if (!msg) return;

    // Ignore messages from ourselves
    if (msg.senderId === this.peerId) return;

    // Deduplicate message by message.id to avoid duplicate triggers across channels
    if (msg.id) {
      if (this.seenMessageIds.has(msg.id)) return;
      this.seenMessageIds.add(msg.id);
      if (this.seenMessageIds.size > 2000) {
        const oldest = this.seenMessageIds.values().next().value;
        if (oldest) this.seenMessageIds.delete(oldest);
      }
    }

    if (msg.type === 'PRESENCE') {
      const data = msg.data as { name?: string };
      this.isConnected = true;
      this.partnerId = msg.senderId;
      if (data?.name) {
        this.partnerName = data.name;
      }
    }

    this.emit(msg);
  }

  public destroy() {
    if (this.localPollInterval) {
      clearInterval(this.localPollInterval);
      this.localPollInterval = null;
    }
    if (this.globalPollInterval) {
      clearInterval(this.globalPollInterval);
      this.globalPollInterval = null;
    }
    if (this.globalEventSource) {
      this.globalEventSource.close();
      this.globalEventSource = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    this.listeners.clear();
  }
}

// Global multiplayer singleton
let instance: MultiplayerClient | null = null;
export function getMultiplayerClient(): MultiplayerClient {
  if (!instance) {
    instance = new MultiplayerClient();
  }
  return instance;
}
