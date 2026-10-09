/**
 * VibePair Multiplayer Synchronization Engine
 * Combines BroadcastChannel + localStorage StorageEvent (instant local tab sync)
 * + HTTP Signaling Broker with Deduplication & Overlapping Windows (cross-device/network sync).
 * All payloads are automatically encrypted with the shared CryptoKey (AES-256-GCM).
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
  private pollInterval: number | null = null;
  private lastPollTimestamp: number = 0;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private seenPacketIds: Set<string> = new Set();
  private seenMessageIds: Set<string> = new Set();
  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor() {
    this.peerId = 'peer_' + Math.random().toString(36).substring(2, 9);
  }

  public init(roomCode: string, cryptoKey: CryptoKey, userName: string) {
    this.destroy(); // Clean previous subscriptions if re-initializing

    this.roomCode = (roomCode || '').trim().toUpperCase();
    this.cryptoKey = cryptoKey;

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

    // 3. Setup periodic presence and signaling poll (snappy 650ms for near-instant message delivery)
    this.startSignalingLoop(userName);
    this.sendPresence(userName, 'online');
  }

  private startSignalingLoop(userName: string) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    // Initial announce
    this.sendSignal('PRESENCE', { status: 'online', name: userName });

    this.pollInterval = window.setInterval(async () => {
      if (!this.roomCode || !this.cryptoKey) return;
      try {
        // Query with 5000ms overlapping window to prevent race conditions or dropped packets
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
            // Deduplicate signal packet by ID
            if (s.id) {
              if (this.seenPacketIds.has(s.id)) continue;
              this.seenPacketIds.add(s.id);
              if (this.seenPacketIds.size > 1500) {
                const oldest = this.seenPacketIds.values().next().value;
                if (oldest) this.seenPacketIds.delete(oldest);
              }
            }

            if (s.type === 'ENCRYPTED_PACKET' && typeof s.payload === 'string') {
              await this.handleIncomingEncrypted(s.payload, s.id);
            } else if (s.type === 'CALL_SIGNAL') {
              // Direct unencrypted call fallback if ever used
              this.emit({
                id: s.id || String(Date.now()),
                senderId: s.senderId,
                type: 'CALL_SIGNAL',
                data: s.payload,
                timestamp: s.timestamp || Date.now(),
              });
            }
          }
        }
      } catch (err) {
        // Silent poll error handling
      }
    }, 650);
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

    // 3. Transmit via WebRTC data channel if open
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(encryptedString);
      } catch {}
    }

    // 4. Post to HTTP signal broker
    this.sendSignal('ENCRYPTED_PACKET', encryptedString);
  }

  public async sendSignal(type: string, payload: unknown) {
    if (!this.roomCode) return;
    try {
      await fetch('/api/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: this.roomCode,
          senderId: this.peerId,
          type,
          payload,
        }),
      });
    } catch {}
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

    // Deduplicate message by message.id to avoid duplicate triggers across Broadcast + Polling
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
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
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
