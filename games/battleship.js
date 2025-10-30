(function(){
  const N=10;9
  const boardMe = document.getElementById('boardMe');
  const boardAi = document.getElementById('boardAi');
  const status = document.getElementById('status');
  const reset = document.getElementById('reset');
  const modeSel = document.getElementById('mode');
  const netBox = document.getElementById('netBox');
  const createOfferBtn = document.getElementById('createOffer');
  const useOfferBtn = document.getElementById('useOffer');
  const offerOut = document.getElementById('offerOut');
  const answerIn = document.getElementById('answerIn');
  const offerIn = document.getElementById('offerIn');
  const answerOut = document.getElementById('answerOut');
  const acceptAnswerBtn = document.getElementById('acceptAnswer');
  const makeAnswerBtn = document.getElementById('makeAnswer');

  // Enable guest connect button only when code is provided
  if(makeAnswerBtn && offerIn){
    makeAnswerBtn.disabled = true;
    offerIn.addEventListener('input', ()=>{
      makeAnswerBtn.disabled = offerIn.value.trim().length === 0;
    });
  }
  const axisXMe = document.getElementById('axisXMe');
  const axisYMe = document.getElementById('axisYMe');
  const axisXAi = document.getElementById('axisXAi');
  const axisYAi = document.getElementById('axisYAi');

  let fieldMe, fieldAi, over, myTurn, net, isNet=false, isHost=false, aiPool=[];
  let remainMe, remainAi;
  let shipsMe = [], shipsAi = [];

  function emptyField(){ return Array.from({length:N},()=>Array(N).fill(0)); }

  function placeShips(field){
    // Classic fleet: 1x4, 2x3, 3x2, 4x1
    const lens = [4,3,3,2,2,2,1,1,1,1];
    let id=1;
    const ships=[];
    function canPlace(x,y,len,dx,dy){
      for(let k=0;k<len;k++){
        const i=x+k*dx, j=y+k*dy;
        if(i<0||j<0||i>=N||j>=N) return false;
        if(field[i][j]!==0) return false;
        for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++){
          const ii=i+a, jj=j+b; if(ii<0||jj<0||ii>=N||jj>=N) continue; if(field[ii][jj]!==0) return false;
        }
      }
      return true;
    }
    function place(len){
      let placed=false, tries=0;
      while(!placed && tries++<1000){
        const dx = Math.random()<0.5?1:0; const dy = dx?0:1;
        const x = Math.floor(Math.random()*N), y=Math.floor(Math.random()*N);
        if(canPlace(x,y,len,dx,dy)){
          for(let k=0;k<len;k++) field[x+k*dx][y+k*dy]=id;
          ships.push({ id, len, left:len });
          id++;
          placed=true;
        }
      }
    }
    lens.forEach(place);
    const total = lens.reduce((a,b)=>a+b,0);
    return { total, ships };
  }

  function renderBoards(){
    boardMe.innerHTML=''; boardAi.innerHTML='';
    for(let i=0;i<N;i++){
      for(let j=0;j<N;j++){
        const m=document.createElement('button'); m.className='cell'; m.dataset.i=i; m.dataset.j=j;
        // subtly show own ships
        if(fieldMe[i][j]>0){ m.style.background='rgba(255,255,255,0.10)'; }
        m.disabled=true; // player board not clickable
        boardMe.appendChild(m);

        const a=document.createElement('button'); a.className='cell'; a.dataset.i=i; a.dataset.j=j;
        a.addEventListener('click', ()=> shootAtAi(i,j,a));
        boardAi.appendChild(a);
      }
    }
  }

  function renderAxes(){
    const letters = 'ABCDEFGHIJ'.split('');
    const nums = Array.from({length:10}, (_,k)=>k+1);
    function fill(el, arr){ if(!el) return; el.innerHTML = arr.map(x=>`<div class="label">${x}</div>`).join(''); }
    fill(axisXMe, letters); fill(axisXAi, letters);
    fill(axisYMe, nums); fill(axisYAi, nums);
  }

  function setStatus(text){ status.textContent = text; }

  function init(){
    fieldMe = emptyField(); fieldAi = emptyField();
    const pm = placeShips(fieldMe); const pa = placeShips(fieldAi);
    shipsMe = pm.ships; shipsAi = pa.ships;
    remainMe = pm.total; remainAi = pa.total;
    over=false; myTurn=true; isNet = modeSel?.value==='net';
    aiPool = [];
    for(let i=0;i<N;i++) for(let j=0;j<N;j++) aiPool.push({i,j});
    renderBoards(); renderAxes();
    if(isNet){ netBox.style.display='block'; setStatus('Онлайн режим. Подключитесь к сопернику.'); }
    else { netBox.style.display='none'; setStatus('Ваш ход. Кликайте по правой сетке.'); }
  }

  function victory(meWon){
    over=true;
    if(meWon){
      PrePlayUI?.addStat('battleship','win');
      PrePlayUI?.showResult('Победа', 'Совет: добивай корабли по периметру попаданий.', [{label:'Новая игра', primary:true, onClick:init}]);
    } else {
      PrePlayUI?.addStat('battleship','loss');
      PrePlayUI?.showResult('Поражение', 'Совет: стреляй «шахматкой», чтобы покрыть поле.', [{label:'Переиграть', primary:true, onClick:init}]);
    }
  }

  function mark(btn, hit){
    if(hit){ btn.textContent='💥'; btn.style.borderColor='rgba(255,255,255,0.5)'; }
    else { btn.textContent='•'; btn.style.opacity='0.5'; }
    // mark cell as already shot for both boards
    btn.dataset.shot = '1';
    // also disable to block clicks on AI board cells after shot
    btn.disabled=true;
  }

  function shootAtAi(i,j,btn){
    if(over) return;
    if(btn.disabled) return;
    if(isNet){
      if(!net || !net.isConnected){ setStatus('Сеть не подключена'); return; }
      if(!myTurn){ setStatus('Ход соперника…'); return; }
      myTurn=false; // wait for result
      net.send({t:'shot', i,j});
      setStatus('Выстрел отправлен. Ждём ответ…');
      return;
    }
    // vs AI
    const sid = fieldAi[i][j];
    const hit = sid>0;
    mark(btn, hit);
    if(hit){
      remainAi--;
      const ship = shipsAi.find(s=>s.id===sid); if(ship){ ship.left--; if(ship.left===0){ setStatus(`Потоплен ${ship.len}-палубный! Стреляй ещё.`); } else { setStatus('Попала! Стреляй ещё.'); } }
      if(remainAi<=0) return victory(true);
    }
    else { setStatus('Мимо. Ход противника…'); aiTurn(); }
  }

  function aiTurn(){
    if(over) return;
    // choose from remaining unshot cells to avoid long loops near endgame
    while(true){
      if(aiPool.length===0){ setStatus('Противник завершил ходы.'); return; }
      const r = Math.floor(Math.random()*aiPool.length);
      const {i,j} = aiPool.splice(r,1)[0];
      const idx = i*N+j; const btn = boardMe.children[idx];
      if(!btn || btn.dataset.shot==='1') { continue; }
      const sid = fieldMe[i][j];
      const hit = sid>0;
      mark(btn, hit);
      if(hit){
        remainMe--;
        const ship = shipsMe.find(s=>s.id===sid); if(ship){ ship.left--; if(ship.left===0){ setStatus('Противник потопил наш корабль!'); } else { setStatus('Противник попал!'); } }
        if(remainMe<=0) { victory(false); return; }
      }
      else { setStatus('Противник промахнулся. Ваш ход.'); break; }
    }
  }

  // Networking
  function showStep(which){
    document.getElementById('netStepOffer').style.display = which==='offer'? 'block':'none';
    document.getElementById('netStepAnswer').style.display = which==='answer'? 'block':'none';
  }
  createOfferBtn?.addEventListener('click', async ()=>{
    net = await Net.create(true); isHost=true; myTurn=true;
    offerOut.value = await net.createOffer(); showStep('offer');
    net.onMessage = onNetMsg; setStatus('Отправьте приглашение. Ожидаем ответ…');
  });
  useOfferBtn?.addEventListener('click', ()=>{
    showStep('answer');
    if(makeAnswerBtn) makeAnswerBtn.disabled = false;
    if(offerIn){ offerIn.focus(); }
  });
  makeAnswerBtn?.addEventListener('click', async ()=>{
    net = await Net.create(false); isHost=false; myTurn=false; // гость ходит вторым
    answerOut.value = await net.acceptOffer(offerIn.value.trim());
    net.onMessage = onNetMsg; setStatus('Подключено. Ход соперника.');
  });
  acceptAnswerBtn?.addEventListener('click', async ()=>{
    await net.acceptAnswer(answerIn.value.trim()); setStatus('Подключено. Ваш ход.');
  });

  function onNetMsg(msg){
    if(msg && msg.sys==='ready'){
      setStatus(isHost ? 'Подключено. Ваш ход.' : 'Подключено. Ход соперника.');
      return;
    }
    if(msg.t==='shot'){
      // opponent shot at our board
      const {i,j} = msg; const idx=i*N+j; const btn = boardMe.children[idx];
      if(btn && btn.dataset.shot!=='1'){
        const sid = fieldMe[i][j]; const hit = sid>0; mark(btn, hit);
        let sunk=false, len=0;
        if(hit){
          remainMe--; const ship = shipsMe.find(s=>s.id===sid); if(ship){ ship.left--; len=ship.len; if(ship.left===0){ sunk=true; } }
        }
        net.send({t:'result', i,j, hit, sunk, len});
        if(remainMe<=0){ victory(false); }
        myTurn = !hit; // if opponent hit, he shoots again; otherwise our turn
        setStatus(hit? (sunk? 'Противник потопил наш корабль!' : 'Противник попал!') : 'Противник промахнулся. Ваш ход.');
      }
    } else if(msg.t==='result'){
      // result of our shot at enemy board
      const {i,j,hit,sunk,len} = msg; const idx=i*N+j; const btn = boardAi.children[idx]; if(btn) mark(btn, hit);
      if(hit){
        remainAi--; const sid=fieldAi[i][j]; const ship=shipsAi.find(s=>s.id===sid); if(ship){ ship.left--; }
        if(sunk && len){ setStatus(`Потоплен ${len}-палубный! Стреляй ещё.`); }
        else setStatus('Попала! Стреляй ещё.');
        if(remainAi<=0){ victory(true); } else { myTurn=true; }
      }
      else { setStatus('Мимо. Ход соперника…'); myTurn=false; }
    }
  }

  modeSel?.addEventListener('change', ()=>{ init(); });
  reset.addEventListener('click', init);
  init();
})();
