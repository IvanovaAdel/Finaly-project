// PrePlay UI utilities: modal + profile avatar
(function(){
  const UI = {};

  function ensureModal(){
    let backdrop = document.getElementById('ppModalBackdrop');
    if(backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.id = 'ppModalBackdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ppModalTitle">
        <h3 id="ppModalTitle"></h3>
        <div class="tip" id="ppModalTip"></div>
        <div class="actions" id="ppModalActions"></div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e)=>{ if(e.target===backdrop) UI.hideModal(); });
    return backdrop;
  }

  UI.showResult = function(title, tip, actions){
    const backdrop = ensureModal();
    document.getElementById('ppModalTitle').textContent = title;
    document.getElementById('ppModalTip').textContent = tip || '';
    const act = document.getElementById('ppModalActions');
    act.innerHTML = '';
    (actions || [{label:'OK', primary:true}]).forEach(a=>{
      const b = document.createElement('button');
      b.className = 'btn' + (a.primary? '' : ' ghost');
      b.textContent = a.label || 'OK';
      b.addEventListener('click', ()=>{
        if(a.onClick) a.onClick();
        UI.hideModal();
      });
      act.appendChild(b);
    });
    backdrop.style.display = 'flex';
  }

  UI.hideModal = function(){
    const backdrop = document.getElementById('ppModalBackdrop');
    if(backdrop) backdrop.style.display = 'none';
  }

  // Profile/avatar helpers
  UI.getUser = function(){
    try{ return JSON.parse(localStorage.getItem('preplay_user')||'null'); }catch(e){ return null; }
  }
  UI.setUser = function(u){
    localStorage.setItem('preplay_user', JSON.stringify(u));
  }
  UI.logout = function(){ localStorage.removeItem('preplay_user'); }

  // Stats
  function statsKey(){
    const u = UI.getUser();
    const emailL = ((u && u.email)||'').trim().toLowerCase();
    const nameL = ((u && u.name)||'').trim().toLowerCase();
    const id = emailL ? ('email:'+emailL) : ('name:'+nameL);
    return 'preplay_stats__'+id;
  }
  UI.getStats = function(){
    const key = statsKey();
    try{ return JSON.parse(localStorage.getItem(key)||'{}'); }catch(e){ return {}; }
  }
  UI.clearStats = function(){
    const key = statsKey();
    localStorage.setItem(key,'{}');
  }
  UI.addStat = function(game, result){
    // result: 'win' | 'loss' | 'draw'
    const key = statsKey();
    const s = UI.getStats();
    s[game] = s[game] || {win:0, loss:0, draw:0};
    s[game][result] = (s[game][result]||0) + 1;
    localStorage.setItem(key, JSON.stringify(s));
  }

  // Leaderboard (per game). mode: 'high' (default) or 'low'
  UI.submitScore = function(game, value, mode='high'){
    const u = UI.getUser() || { name: 'Гость' };
    const key = 'preplay_leaderboard';
    let lb = {};
    try{ lb = JSON.parse(localStorage.getItem(key)||'{}'); }catch(e){ lb = {}; }
    lb[game] = Array.isArray(lb[game]) ? lb[game] : [];
    // Update existing user's best if better
    const idx = lb[game].findIndex(e=>e.name===u.name);
    const better = (a,b)=> mode==='low' ? (a<b) : (a>b);
    if(idx>=0){ if(better(value, lb[game][idx].value)) lb[game][idx] = { name:u.name, value, ts:Date.now() }; }
    else lb[game].push({ name:u.name, value, ts:Date.now() });
    // Keep top 10
    lb[game].sort((a,b)=> mode==='low' ? a.value-b.value : b.value-a.value);
    lb[game] = lb[game].slice(0,10);
    localStorage.setItem(key, JSON.stringify(lb));
  }
  UI.getLeaderboard = function(){
    try{ return JSON.parse(localStorage.getItem('preplay_leaderboard')||'{}'); }catch(e){ return {}; }
  }

  function initAvatar(){
    const link = document.getElementById('profileLink');
    if(!link) return;
    const user = UI.getUser() || null;
    const span = document.getElementById('avatarInitial');
    // Clean text content; we render graphic background
    if(span) span.textContent = '';
    // Reset styles first
    link.style.backgroundImage = '';
    link.style.backgroundColor = '';
    // If user uploaded photo, use it; otherwise gradient by hue
    if(user && user.avatar){
      link.style.backgroundImage = 'url("'+user.avatar+'")';
      link.style.backgroundSize = 'cover';
      link.style.backgroundPosition = 'center';
      link.style.backgroundColor = 'transparent';
    } else if(user && user.hue!=null){
      const h = Number(user.hue)||200;
      const g = `linear-gradient(135deg, hsl(${h} 95% 65%), hsl(${(h+60)%360} 95% 65%))`;
      link.style.background = g;
    }
    link.title = (user && user.name) ? `Профиль • ${user.name}` : 'Профиль';
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initAvatar();
    initBackground();
  });

  // Update avatar when localStorage user changes in another tab/page
  window.addEventListener('storage', function(e){
    if(e && e.key === 'preplay_user') initAvatar();
  });
  // Also refresh on page show (bfcache / back navigation)
  window.addEventListener('pageshow', function(){ initAvatar(); });

  // Animated background (battleship cannons, snake, tic-tac-toe corners)
  function initBackground(){
    if(document.getElementById('bgCanvas')) return;
    const cvs = document.createElement('canvas');
    cvs.id = 'bgCanvas'; cvs.width = innerWidth; cvs.height = innerHeight;
    Object.assign(cvs.style, {position:'fixed', inset:'0', zIndex:'-1'});
    document.body.appendChild(cvs);
    const ctx = cvs.getContext('2d');

    // Dynamic grid across full viewport
    let cell = 12; // px per cell
    let gridX = Math.max(10, Math.floor(cvs.width / cell) - 2);
    let gridY = Math.max(10, Math.floor(cvs.height / cell) - 2);

    const state = {
      shots: [],
      lastSpawn: 0,
      snake: { body: [], dir:{x:1,y:0}, t:0, max: 24 },
      ttt: { t:0, interval: 1.8, marks: [] },
      cannons: { left: { recoil: 0 }, right: { recoil: 0 } },
      time: 0
    };

    function initSnake(){
      const startX = Math.floor(gridX/3) + Math.floor(Math.random()*Math.floor(gridX/3));
      const startY = Math.floor(gridY/3) + Math.floor(Math.random()*Math.floor(gridY/3));
      state.snake.dir = Math.random()<0.5 ? {x:1,y:0} : {x:0,y:1};
      state.snake.body = [];
      for(let k=0;k<10;k++){
        state.snake.body.push({ x: startX - k*state.snake.dir.x, y: startY - k*state.snake.dir.y });
      }
      state.snake.t = 0;
    }

    function onResize(){
      cvs.width = innerWidth; cvs.height = innerHeight;
      gridX = Math.max(10, Math.floor(cvs.width / cell) - 2);
      gridY = Math.max(10, Math.floor(cvs.height / cell) - 2);
      const h = state.snake.body[0];
      if(!h || h.x<0 || h.y<0 || h.x>gridX || h.y>gridY) initSnake();
    }
    addEventListener('resize', onResize);
    initSnake();

    function spawnTTTMark(){
      const sign = Math.random() < 0.5 ? 'X' : 'O';
      const cell = [Math.floor(Math.random()*3), Math.floor(Math.random()*3)];
      state.ttt.marks.push({ sign, cell, life: 0, ttl: 3 + Math.random()*3 });
    }

    function getDeckY(){ return cvs.height * 0.5; }

    function spawnShot(){
      const baseY = getDeckY() - 6; // a bit above deck
      // dynamic slight sway
      const swayL = Math.sin(state.time*0.8)*0.03;
      const swayR = Math.cos(state.time*0.9)*0.03;
      const angleL = -0.08 + swayL; // left cannon slight tilt
      const angleR = Math.PI - (0.18 + swayR); // right cannon aimed higher inward
      const L = 56; // barrel length
      const xL = 120, xR = cvs.width-120;
      const tipL = { x: xL + Math.cos(angleL)*L, y: baseY + Math.sin(angleL)*L };
      const tipR = { x: xR + Math.cos(angleR)*L, y: baseY + Math.sin(angleR)*L };
      const vL = 3 + Math.random()*2, vR = 3 + Math.random()*2;
      state.shots.push({ x: tipL.x, y: tipL.y, vx: vL, life: 0 });
      state.shots.push({ x: tipR.x, y: tipR.y, vx: -vR, life: 0 });
      state.cannons.left.recoil = 1;
      state.cannons.right.recoil = 1;
    }

    function stepSnake(dt){
      state.snake.t += dt; if(state.snake.t<0.12) return; state.snake.t=0;
      const cur = state.snake.body[0] || {x:1,y:1};
      let nx = cur.x + state.snake.dir.x;
      let ny = cur.y + state.snake.dir.y;
      // bounce on edges
      if(nx<0 || nx>gridX){ state.snake.dir.x *= -1; nx = cur.x + state.snake.dir.x; }
      if(ny<0 || ny>gridY){ state.snake.dir.y *= -1; ny = cur.y + state.snake.dir.y; }
      // occasional random gentle turn
      if(Math.random()<0.08){
        if(state.snake.dir.x!==0){ state.snake.dir = Math.random()<0.5? {x:0,y:1} : {x:0,y:-1}; }
        else { state.snake.dir = Math.random()<0.5? {x:1,y:0} : {x:-1,y:0}; }
        nx = cur.x + state.snake.dir.x; ny = cur.y + state.snake.dir.y;
        if(nx<0||nx>gridX||ny<0||ny>gridY){ // revert if turn would exit
          state.snake.dir = { x: -state.snake.dir.x, y: -state.snake.dir.y };
          nx = cur.x + state.snake.dir.x; ny = cur.y + state.snake.dir.y;
        }
      }
      const head = { x: nx, y: ny };
      state.snake.body.unshift(head);
      while(state.snake.body.length > state.snake.max) state.snake.body.pop();
    }

    function drawSnake(){
      ctx.fillStyle = 'rgba(110,231,255,0.8)';
      for(const p of state.snake.body){
        ctx.fillRect(p.x*cell, p.y*cell, cell-1, cell-1);
      }
    }

    function drawTTT(){
      const w = 150, h=150, x = cvs.width - w - 16, y = cvs.height - h - 16;
      // Grid
      ctx.strokeStyle='rgba(184,192,217,0.3)'; ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(x+w/3,y); ctx.lineTo(x+w/3,y+h);
      ctx.moveTo(x+2*w/3,y); ctx.lineTo(x+2*w/3,y+h);
      ctx.moveTo(x,y+h/3); ctx.lineTo(x+w,y+h/3);
      ctx.moveTo(x,y+2*h/3); ctx.lineTo(x+w,y+2*h/3);
      ctx.stroke();
      // Draw multiple marks
      for(const m of state.ttt.marks){
        const [cx, cy] = m.cell;
        const cxp = x + cx*w/3 + w/6, cyp = y + cy*h/3 + h/6;
        if(m.sign==='X'){
          const s = w*0.12;
          ctx.strokeStyle='rgba(255,255,255,0.65)'; ctx.lineWidth=3;
          ctx.beginPath(); ctx.moveTo(cxp-s,cyp-s); ctx.lineTo(cxp+s,cyp+s); ctx.moveTo(cxp-s,cyp+s); ctx.lineTo(cxp+s,cyp-s); ctx.stroke();
        } else {
          const r = w*0.12;
          ctx.strokeStyle='rgba(255,255,255,0.65)'; ctx.lineWidth=3;
          ctx.beginPath(); ctx.arc(cxp,cyp,r,0,Math.PI*2); ctx.stroke();
        }
      }
    }

    // Hangman (Виселица) in the bottom-left corner
    function drawHangmanBG(){
      const margin = 16;
      const w = Math.min(180, Math.max(140, cvs.width * 0.18));
      const h = w * 1.1;
      const x = margin; // left
      const y = cvs.height - margin; // bottom baseline

      // Gallows
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(184,192,217,0.35)';
      ctx.beginPath();
      // base
      ctx.moveTo(x, y); ctx.lineTo(x + w * 0.6, y);
      // post
      const px = x + w * 0.12, py = y; const topY = y - h * 0.9;
      ctx.moveTo(px, py); ctx.lineTo(px, topY);
      // beam
      const beamEndX = px + w * 0.5; const beamY = topY;
      ctx.moveTo(px, beamY); ctx.lineTo(beamEndX, beamY);
      // brace
      ctx.moveTo(px + w*0.12, beamY); ctx.lineTo(px, beamY + h*0.12);
      ctx.stroke();

      // Rope with slight sway
      const sway = Math.sin(state.time * 1.1) * 2;
      const ropeTopX = beamEndX, ropeTopY = beamY;
      const ropeLen = h * 0.18; const ropeBotX = ropeTopX + sway, ropeBotY = ropeTopY + ropeLen;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(184,192,217,0.5)';
      ctx.beginPath(); ctx.moveTo(ropeTopX, ropeTopY); ctx.lineTo(ropeBotX, ropeBotY); ctx.stroke();

      // Person (slight sway)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      const r = w * 0.08;
      const swing = Math.sin(state.time * 1.1) * 0.1; // ~±5.7°
      const bodyLen = h * 0.32;
      const span = w * 0.18;
      const legSpan = w * 0.2;

      ctx.save();
      ctx.translate(ropeBotX, ropeBotY);
      ctx.rotate(swing);
      // head
      ctx.beginPath(); ctx.arc(0, r, r, 0, Math.PI * 2); ctx.stroke();
      // body
      ctx.beginPath(); ctx.moveTo(0, r*2); ctx.lineTo(0, r*2 + bodyLen); ctx.stroke();
      // arms
      const armY = r*2 + bodyLen * 0.35;
      ctx.beginPath(); ctx.moveTo(0, armY); ctx.lineTo(-span, armY - span*0.25); ctx.moveTo(0, armY); ctx.lineTo(span, armY - span*0.25); ctx.stroke();
      // legs
      const legY = r*2 + bodyLen;
      ctx.beginPath(); ctx.moveTo(0, legY); ctx.lineTo(-legSpan, legY + legSpan); ctx.moveTo(0, legY); ctx.lineTo(legSpan, legY + legSpan); ctx.stroke();
      ctx.restore();
    }

    function drawShipsAndShots(dt){
      // decks
      const deckY = getDeckY();
      ctx.fillStyle='rgba(183,136,255,0.15)';
      ctx.fillRect(0, deckY, 140, 12); // left deck
      ctx.fillRect(cvs.width-140, deckY, 140, 12); // right deck

      // cannons
      const baseY = deckY - 6; // mount slightly above deck
      const swayL = Math.sin(state.time*0.8)*0.03;
      const swayR = Math.cos(state.time*0.9)*0.03;
      const angleL = -0.08 + swayL; // left aiming right
      const angleR = Math.PI - (0.18 + swayR); // right aiming left, higher

      function drawCannon(x, angle, recoilState){
        const rec = recoilState.recoil||0;
        // carriage
        ctx.fillStyle='rgba(110,231,255,0.25)';
        ctx.fillRect(x-22, baseY-8, 44, 16);
        // wheels
        ctx.fillStyle='rgba(110,231,255,0.35)';
        ctx.beginPath(); ctx.arc(x-12, baseY+10, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+12, baseY+10, 6, 0, Math.PI*2); ctx.fill();
        // barrel
        const L = 56 * (1 - 0.25*rec);
        const H = 8;
        const back = 6 * rec; // recoil offset
        ctx.save();
        ctx.translate(x, baseY-10);
        ctx.rotate(angle);
        ctx.translate(-back, 0);
        ctx.fillStyle='rgba(110,231,255,0.6)';
        ctx.fillRect(0, -H/2, L, H);
        // muzzle ring
        ctx.fillStyle='rgba(255,255,255,0.5)';
        ctx.fillRect(L-3, -H/2, 3, H);
        // muzzle flash at the beginning of recoil
        if(rec>0.85){
          ctx.fillStyle='rgba(255,230,150,0.8)';
          ctx.beginPath(); ctx.arc(L+3, 0, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
      }

      drawCannon(120, angleL, state.cannons.left);
      drawCannon(cvs.width-120, angleR, state.cannons.right);

      // shots
      state.lastSpawn += dt; if(state.lastSpawn>1.6){ state.lastSpawn=0; spawnShot(); }
      for(let s of state.shots){
        s.x += s.vx; s.life += dt; const y = s.y - Math.sin(s.life*3)*6;
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(s.x,y,2,0,Math.PI*2); ctx.fill();
      }
      // recoil decay
      state.cannons.left.recoil = Math.max(0, state.cannons.left.recoil - dt*2.5);
      state.cannons.right.recoil = Math.max(0, state.cannons.right.recoil - dt*2.5);
      // remove offscreen
      state.shots = state.shots.filter(s=> s.x>-40 && s.x<cvs.width+40);
    }

    let prev=0;
    function frame(ts){
      const dt = prev? (ts-prev)/1000 : 0; prev=ts; state.time += dt;
      // Manage TTT marks (ensure 2–3 visible)
      state.ttt.t += dt;
      for(const m of state.ttt.marks) m.life += dt;
      state.ttt.marks = state.ttt.marks.filter(m=>m.life <= m.ttl);
      while(state.ttt.marks.length < 2) spawnTTTMark();
      if(state.ttt.t > state.ttt.interval){
        state.ttt.t = 0;
        if(state.ttt.marks.length < 3) spawnTTTMark();
        else { state.ttt.marks.shift(); spawnTTTMark(); }
      }
      ctx.clearRect(0,0,cvs.width,cvs.height);
      drawShipsAndShots(dt);
      stepSnake(dt); drawSnake();
      drawTTT();
      drawHangmanBG();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  UI.refreshAvatar = initAvatar;
  window.PrePlayUI = UI;
})();
