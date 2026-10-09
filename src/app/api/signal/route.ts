import { NextRequest, NextResponse } from 'next/server';

// Ephemeral signaling broker keyed by roomCode
// Messages expire automatically after 60 seconds
interface SignalPacket {
  id: string;
  senderId: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

const rooms = new Map<string, SignalPacket[]>();

function cleanupOldSignals() {
  const now = Date.now();
  for (const [room, signals] of rooms.entries()) {
    // Retain packets for 2 hours (7,200,000 ms) so active rooms don't lose chat history
    const valid = signals.filter(s => now - s.timestamp < 7200000);
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
    let { roomCode, senderId, type, payload } = body;

    if (!roomCode || !senderId || !type) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Normalize room code to uppercase & trim
    const normalizedRoom = String(roomCode).trim().toUpperCase();

    if (!rooms.has(normalizedRoom)) {
      rooms.set(normalizedRoom, []);
    }

    const packet: SignalPacket = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      senderId: String(senderId),
      type,
      payload,
      timestamp: Date.now(),
    };

    const roomList = rooms.get(normalizedRoom)!;
    roomList.push(packet);

    // Limit memory per room to latest 300 packets
    if (roomList.length > 300) {
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
  const rawRoom = searchParams.get('roomCode');
  const senderId = searchParams.get('senderId');
  const since = parseInt(searchParams.get('since') || '0', 10);

  if (!rawRoom || !senderId) {
    return NextResponse.json({ error: 'Missing roomCode or senderId' }, { status: 400 });
  }

  const normalizedRoom = rawRoom.trim().toUpperCase();
  const roomList = rooms.get(normalizedRoom) || [];

  // Return all packets for this room NOT sent by the requester, newer than `since`
  const incoming = roomList.filter(s => s.senderId !== senderId && s.timestamp >= since);

  return NextResponse.json({
    signals: incoming,
    timestamp: Date.now(),
  });
}
