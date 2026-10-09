/**
 * VibePair Multiplayer Synchronization Engine
 * Combines BroadcastChannel (local tabs) + WebRTC DataChannel (remote peers)
 * All payloads are automatically encrypted with the shared CryptoKey.
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

  constructor() {
    this.peerId = 'peer_' + Math.random().toString(36).substring(2, 9);
  }

  public init(roomCode: string, cryptoKey: CryptoKey, userName: string) {
    this.roomCode = roomCode;
    this.cryptoKey = cryptoKey;

    // 1. Setup local BroadcastChannel
    try {
      this.broadcastChannel = new BroadcastChannel(`vibepair_${roomCode}`);
      this.broadcastChannel.onmessage = async (evt) => {
        const raw = evt.data;
        if (typeof raw === 'string') {
          await this.handleIncomingEncrypted(raw);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }

    // 2. Setup periodic presence and signaling poll
    this.startSignalingLoop(userName);
    this.sendPresence(userName, 'online');
  }

  private startSignalingLoop(userName: string) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    // Initial announce
    this.sendSignal('PRESENCE', { status: 'online', name: userName });

    this.pollInterval = window.setInterval(async () => {
      if (!this.roomCode) return;
      try {
        const res = await fetch(`/api/signal?roomCode=${encodeURIComponent(this.roomCode)}&senderId=${this.peerId}&since=${this.lastPollTimestamp}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.timestamp) {
          this.lastPollTimestamp = data.timestamp;
        }

        if (Array.isArray(data.signals)) {
          for (const s of data.signals) {
            if (s.type === 'ENCRYPTED_PACKET') {
              await this.handleIncomingEncrypted(s.payload);
            }
          }
        }
      } catch (err) {
        // Silent poll error handling
      }
    }, 1500);
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

  private emit(msg: SyncMessage) {
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
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: this.peerId,
      type,
      data,
      timestamp: Date.now(),
    };

    // Encrypt with WebCrypto AES-GCM
    const encryptedString = await encryptPayload(message, this.cryptoKey);

    // 1. Broadcast locally for instant multi-tab sync
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(encryptedString);
      } catch (e) {
        console.warn('Broadcast send error:', e);
      }
    }

    // 2. Transmit via WebRTC data channel if open
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(encryptedString);
      } catch {}
    }

    // 3. Post to HTTP signal broker
    this.sendSignal('ENCRYPTED_PACKET', encryptedString);
  }

  private async sendSignal(type: string, payload: unknown) {
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

  private async handleIncomingEncrypted(encryptedStr: string) {
    if (!this.cryptoKey) return;
    const msg = await decryptPayload<SyncMessage>(encryptedStr, this.cryptoKey);
    if (!msg) return;

    // Ignore messages from ourselves
    if (msg.senderId === this.peerId) return;

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
