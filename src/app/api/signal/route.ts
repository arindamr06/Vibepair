import { NextRequest, NextResponse } from 'next/server';

// In-memory ephemeral signaling broker keyed by roomCode
// Messages expire automatically after 60 seconds
interface SignalPacket {
  id: string;
  senderId: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

const rooms = new Map<string, SignalPacket[]>();

// Cleanup stale signals periodically
function cleanupOldSignals() {
  const now = Date.now();
  for (const [room, signals] of rooms.entries()) {
    const valid = signals.filter(s => now - s.timestamp < 45000);
    if (valid.length === 0) {
      rooms.delete(room);
    } else {
      rooms.set(room, valid);
    }
  }
}

export async function POST(req: NextRequest) {
  cleanupOldSignals();
  try {
    const body = await req.json();
    const { roomCode, senderId, type, payload } = body;

    if (!roomCode || !senderId || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, []);
    }

    const packet: SignalPacket = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId,
      type,
      payload,
      timestamp: Date.now(),
    };

    const roomList = rooms.get(roomCode)!;
    roomList.push(packet);

    // Limit memory per room to latest 100 packets
    if (roomList.length > 100) {
      roomList.shift();
    }

    return NextResponse.json({ success: true, packetId: packet.id });
  } catch (err) {
    return NextResponse.json({ error: 'Internal signal error', details: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  cleanupOldSignals();
  const { searchParams } = new URL(req.url);
  const roomCode = searchParams.get('roomCode');
  const senderId = searchParams.get('senderId');
  const since = parseInt(searchParams.get('since') || '0', 10);

  if (!roomCode || !senderId) {
    return NextResponse.json({ error: 'Missing roomCode or senderId' }, { status: 400 });
  }

  const roomList = rooms.get(roomCode) || [];
  // Return all packets for this room NOT sent by the requester, newer than `since`
  const incoming = roomList.filter(s => s.senderId !== senderId && s.timestamp > since);

  return NextResponse.json({
    signals: incoming,
    timestamp: Date.now(),
  });
}
