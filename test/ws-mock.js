// Minimal Mock WebSocket for tests (supports two peers per room)
(function(){
  const CONNECTING = 0, OPEN = 1, CLOSING = 2, CLOSED = 3;
  const rooms = new Map(); // room -> Set of sockets

  class MockWebSocket {
    constructor(url){
      this.url = url;
      this.readyState = CONNECTING;
      this._listeners = { open: [], message: [], close: [] };
      setTimeout(()=>{
        this.readyState = OPEN;
        this._emit('open');
      }, 0);
    }
    addEventListener(type, cb, opts){
      if(!this._listeners[type]) this._listeners[type] = [];
      if(opts && opts.once){
        const once = (ev)=>{ this.removeEventListener(type, once); cb(ev); };
        this._listeners[type].push(once);
      } else {
        this._listeners[type].push(cb);
      }
    }
    removeEventListener(type, cb){
      const arr = this._listeners[type]; if(!arr) return;
      const i = arr.indexOf(cb); if(i>=0) arr.splice(i,1);
    }
    _emit(type, data){
      const arr = this._listeners[type]||[];
      for(const cb of [...arr]) cb(data);
    }
    send(data){
      try{
        const msg = JSON.parse(data);
        if(msg && msg.t === 'join'){
          const room = String(msg.room||'').trim();
          if(!rooms.has(room)) rooms.set(room, new Set());
          const peers = rooms.get(room);
          peers.add(this);
          this._room = room;
          if(peers.size === 2){
            for(const s of peers){
              s._emit('message', { data: JSON.stringify({ sys: 'ready' }) });
            }
          }
          return;
        }
        // forward to others in room
        const room = this._room;
        if(!room) return;
        const peers = rooms.get(room) || new Set();
        for(const s of peers){ if(s!==this) s._emit('message', { data }); }
      }catch(e){}
    }
    close(){
      this.readyState = CLOSED;
      this._emit('close');
      const room = this._room; if(!room) return;
      const peers = rooms.get(room); if(peers){ peers.delete(this); if(peers.size===0) rooms.delete(room); }
    }
  }

  // Replace global WebSocket in test pages only
  if(typeof window !== 'undefined'){
    window.WebSocket = MockWebSocket;
  }
})();
