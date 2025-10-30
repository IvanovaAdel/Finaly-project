// Simple LAN WebSocket helper with room codes (no WebRTC). Works only over local network.
// API kept compatible with old Net helper: createOffer/acceptOffer/acceptAnswer/send.

const Net = (function(){
  function roomCode(){
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s=''; for(let i=0;i<6;i++) s += alphabet[Math.floor(Math.random()*alphabet.length)];
    return s;
  }

  function wsUrl(){
    const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
    const host = location.hostname || 'localhost';
    const port = '8765';
    return `${proto}${host}:${port}`;
  }

  async function create(initiator=false){
    const ws = new WebSocket(wsUrl());
    let currentRoom = null;
    let openPromise = null;
    let isReady = false;

    const api = {
      onMessage: null,
      isConnected: false,
      async createOffer(){
        // Host creates a room and returns its code
        await ensureOpen();
        currentRoom = roomCode();
        ws.send(JSON.stringify({ t:'join', room: currentRoom }));
        return currentRoom;
      },
      async acceptOffer(code){
        // Guest joins the provided room code
        await ensureOpen();
        currentRoom = String(code||'').trim();
        if(!currentRoom) throw new Error('Bad code');
        ws.send(JSON.stringify({ t:'join', room: currentRoom }));
        return 'OK'; // kept for UI compatibility
      },
      async acceptAnswer(_ignored){
        // No-op in LAN mode; kept for UI compatibility
        return 'OK';
      },
      send(obj){
        if(!api.isConnected) return;
        try{ ws.send(JSON.stringify(obj)); }catch(e){}
      },
      close(){ try{ ws.close(); }catch(e){} }
    };

    ws.onopen = ()=>{};
    ws.onclose = ()=>{ api.isConnected = false; };
    ws.onmessage = (e)=>{
      try{
        const msg = JSON.parse(e.data);
        if(msg && msg.sys === 'ready'){
          isReady = true; api.isConnected = true; return;
        }
        // Forward gameplay messages to consumer
        api.onMessage && api.onMessage(msg);
      }catch(err){}
    };

    function ensureOpen(){
      if(ws.readyState === 1) return Promise.resolve();
      if(openPromise) return openPromise;
      openPromise = new Promise(res=>{
        ws.addEventListener('open', ()=>res(), { once:true });
      });
      return openPromise;
    }

    return api;
  }

  return { create };
})();
