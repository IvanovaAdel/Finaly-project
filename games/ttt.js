(function(){
  const boardEl = document.getElementById('board');
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

  let board, turn, over, net, isNet=false, isHost=false, myTurn=false;

  function setStatus(text){ status.textContent = text; }

  function init(){
    board = Array(9).fill('');
    over = false;
    isNet = modeSel?.value==='net';
    if(isNet){
      // host starts as X
      turn = 'X';
      // myTurn will be set upon creating/accepting connection
      netBox.style.display='block';
      setStatus('Онлайн режим. Подключитесь к сопернику.');
    } else {
      turn = 'X';
      myTurn = true;
      netBox && (netBox.style.display='none');
      setStatus('Твой ход (X)');
    }
    render();
  }

  function render(){
    boardEl.innerHTML='';
    board.forEach((v,i)=>{
      const c=document.createElement('button');
      c.className='cell';
      c.textContent=v; c.dataset.i=i;
      c.addEventListener('click',()=>play(i));
      if(over || v){ c.disabled = true; }
      else if(isNet && !myTurn){ c.disabled = true; }
      boardEl.appendChild(c);
    });
  }

  const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function winner(b){
    for(const [a,c,d] of lines){ if(b[a] && b[a]===b[c] && b[a]===b[d]) return b[a]; }
    if(b.every(Boolean)) return 'draw';
    return null;
  }

  function play(i){
    if(over || board[i]) return;
    if(isNet){
      const mySymbol = isHost ? 'X' : 'O';
      if(!myTurn) return;
      if(turn !== mySymbol) return; // safety
      board[i] = mySymbol; render();
      const w = winner(board);
      if(w){ finish(w); net?.send({t:'move', i}); return; }
      // send move and pass turn
      net?.send({t:'move', i});
      turn = mySymbol==='X' ? 'O' : 'X';
      myTurn = false; setStatus('Ход соперника…');
      return;
    }
    // vs AI
    board[i]=turn; render();
    const w=winner(board);
    if(w){ finish(w); return; }
    // AI move (smart)
    turn='O';
    ai();
  }

  function ai(){
    const pick = bestMove();
    if(pick===undefined){ finish('draw'); return; }
    board[pick]='O'; render();
    const w=winner(board);
    if(w){ finish(w); return; }
    turn='X'; status.textContent='Твой ход (X)';
  }

  function bestMove(){
    const empties = board.map((v,i)=>v?null:i).filter(v=>v!==null);
    // try to win
    for(const i of empties){ const b=[...board]; b[i]='O'; if(winner(b)==='O') return i; }
    // try to block X
    for(const i of empties){ const b=[...board]; b[i]='X'; if(winner(b)==='X') return i; }
    // center
    if(empties.includes(4)) return 4;
    // corners
    for(const i of [0,2,6,8]) if(empties.includes(i)) return i;
    // sides
    return empties[0];
  }

  function finish(w){
    over=true;
    status.textContent = w==='draw' ? 'Ничья' : `Победил ${w}`;
    if(w==='X'){ PrePlayUI?.addStat('ttt','win'); PrePlayUI?.showResult('Победа', 'Совет: контролируй центр поля.', [{label:'Ещё раз', primary:true, onClick:init}]); }
    else if(w==='O'){ PrePlayUI?.addStat('ttt','loss'); PrePlayUI?.showResult('Поражение', 'Ставь X в центр и занимай углы.', [{label:'Переиграть', primary:true, onClick:init}]); }
    else { PrePlayUI?.addStat('ttt','draw'); PrePlayUI?.showResult('Ничья', 'Попробуй агрессивнее занимать углы.', [{label:'Ещё раз', primary:true, onClick:init}]); }
  }

  // Networking helpers (manual signaling like in Battleship)
  function showStep(which){
    const a = document.getElementById('netStepOffer');
    const b = document.getElementById('netStepAnswer');
    if(a) a.style.display = which==='offer'? 'block':'none';
    if(b) b.style.display = which==='answer'? 'block':'none';
  }

  createOfferBtn?.addEventListener('click', async ()=>{
    net = await Net.create(true); isHost=true; myTurn=true; turn='X';
    offerOut.value = await net.createOffer(); showStep('offer');
    net.onMessage = onNetMsg; setStatus('Отправьте приглашение. Ожидаем ответ…');
  });
  // Enable guest connect button only when code provided; focus input
  if(makeAnswerBtn && offerIn){
    makeAnswerBtn.disabled = true;
    offerIn.addEventListener('input', ()=>{
      makeAnswerBtn.disabled = offerIn.value.trim().length === 0;
    });
  }
  useOfferBtn?.addEventListener('click', ()=>{
    showStep('answer');
    if(offerIn) offerIn.focus();
  });
  makeAnswerBtn?.addEventListener('click', async ()=>{
    net = await Net.create(false); isHost=false; myTurn=false; turn='X'; // гость ходит вторым, первый — X
    answerOut.value = await net.acceptOffer(offerIn.value.trim());
    net.onMessage = onNetMsg; setStatus('Подключено. Ход соперника.');
  });
  acceptAnswerBtn?.addEventListener('click', async ()=>{
    await net.acceptAnswer(answerIn.value.trim()); setStatus('Подключено. Ваш ход.');
  });

  function onNetMsg(msg){
    if(msg && msg.sys==='ready'){
      // Host starts as X, guest is O
      turn = 'X';
      myTurn = isHost; // host moves first
      setStatus(isHost ? 'Ваш ход (X)' : 'Ход соперника (X)');
      render();
      return;
    }
    if(msg.t==='move'){
      if(over) return;
      const oppSymbol = isHost ? 'O' : 'X';
      const i = msg.i;
      if(i==null || board[i]) return;
      if(turn !== oppSymbol) return; // safety
      board[i] = oppSymbol; render();
      const w = winner(board);
      if(w){ finish(w); return; }
      turn = oppSymbol==='X' ? 'O' : 'X';
      myTurn = true; setStatus('Ваш ход');
    } else if(msg.t==='reset'){
      init();
    }
  }

  modeSel?.addEventListener('change', ()=>{ init(); });
  reset.addEventListener('click', ()=>{
    if(isNet && net?.isConnected){ net.send({t:'reset'}); }
    init();
  });
  init();
})();
