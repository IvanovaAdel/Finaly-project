import asyncio
import json
import argparse
from typing import Dict, Set

import websockets
from websockets.server import WebSocketServerProtocol

# Simple LAN WebSocket relay with room codes (2 peers per room)
# - Client sends: {"t":"join", "room":"ABC123"}
# - Server replies "ready" to both peers when two are in the room
# - Any other JSON message is forwarded to the other peer(s) in the room
# Run: python server/lan_ws.py --host 0.0.0.0 --port 8765

rooms: Dict[str, Set[WebSocketServerProtocol]] = {}
conn_room: Dict[WebSocketServerProtocol, str] = {}

async def handle_client(ws: WebSocketServerProtocol):
    try:
        async for message in ws:
            try:
                data = json.loads(message)
            except Exception:
                continue

            # Join logic
            if isinstance(data, dict) and data.get("t") == "join":
                room = str(data.get("room", "")).strip()
                if not room:
                    await safe_send(ws, json.dumps({"sys": "error", "error": "bad_room"}))
                    continue
                # Put ws in room
                if room not in rooms:
                    rooms[room] = set()
                peers = rooms[room]
                if ws not in peers:
                    if len(peers) >= 2:
                        await safe_send(ws, json.dumps({"sys": "full"}))
                        await ws.close()
                        continue
                    peers.add(ws)
                    conn_room[ws] = room
                    # If we have 2 peers now, notify both
                    if len(peers) == 2:
                        await broadcast(room, {"sys": "ready"})
                continue

            # Forward gameplay messages to other peers in the same room
            room = conn_room.get(ws)
            if not room:
                continue
            await broadcast(room, data, exclude=ws)

    except websockets.ConnectionClosed:
        pass
    finally:
        # Cleanup on disconnect
        room = conn_room.pop(ws, None)
        if room:
            peers = rooms.get(room)
            if peers and ws in peers:
                peers.remove(ws)
                # Notify remaining peer that partner left
                if peers:
                    await broadcast(room, {"sys": "left"})
            if peers is not None and len(peers) == 0:
                rooms.pop(room, None)

async def broadcast(room: str, obj, exclude: WebSocketServerProtocol = None):
    peers = rooms.get(room, set())
    msg = obj if isinstance(obj, str) else json.dumps(obj)
    await asyncio.gather(*(safe_send(p, msg) for p in peers if p is not exclude))

async def safe_send(ws: WebSocketServerProtocol, msg: str):
    try:
        await ws.send(msg)
    except Exception:
        pass

async def main(host: str, port: int):
    async with websockets.serve(handle_client, host, port, ping_interval=30, ping_timeout=30):
        print(f"LAN WebSocket relay listening on ws://{host}:{port}")
        print("Rooms will form when two clients join the same room code.")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    asyncio.run(main(args.host, args.port))
