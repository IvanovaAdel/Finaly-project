(function(){
  const status = document.getElementById('status');
  const scoreEl = document.getElementById('score');
  const buttons = document.querySelectorAll('[data-move]');
  const reset = document.getElementById('reset');
  const modeSel = document.getElementById('mode');
  const netBox = document.getElementById('netBox');
  const offerOut = document.getElementById('offerOut');
  const answerIn = document.getElementById('answerIn');
  const offerIn = document.getElementById('offerIn');
  const answerOut = document.getElementById('answerOut');
  const createOfferBtn = document.getElementById('createOffer');
  const useOfferBtn = document.getElementById('useOffer');
  const acceptAnswerBtn = document.getElementById('acceptAnswer');
  const makeAnswerBtn = document.getElementById('makeAnswer');
  let you = 0, bot = 0;
  const beats = { rock:'scissors', paper:'rock', scissors:'paper' };
  const icons = { rock:'✊', paper:'✋', scissors:'✌️' };
  let net, myMove=null, theirMove=null;

  function botMove(){
    return ['rock','paper','scissors'][Math.floor(Math.random()*3)];
  }

  function updateScore(){
    scoreEl.textContent = `${you} : ${bot}`;
  }

  function play(player){
    if(modeSel && modeSel.value === 'net'){
      if(!net || !net.isConnected){ status.textContent = 'Сеть не подключена'; return; }
      myMove = player; status.textContent = 'Ожидание соперника…';
      net.send({t:'move', v:player});
      tryResolveRound();
      return;
    }
    const b = botMove();
    resolveRound(player, b);
  }

  function resolveRound(a, b){
    if(a === b){
      status.textContent = `${icons[a]} = ${icons[b]} · Ничья`;
      PrePlayUI?.addStat('rps','draw');
      PrePlayUI?.showResult('Ничья', 'Попробуй сменить темп и элемент неожиданности.', [{label:'Ещё раз', primary:true}]);
      return;
    }
    if(beats[a] === b){
      you++; status.textContent = `${icons[a]} > ${icons[b]} · Победа!`;
      PrePlayUI?.addStat('rps','win');
      PrePlayUI?.showResult('Победа', 'Не повторяй один и тот же ход слишком часто.', [{label:'Ок', primary:true}]);
    } else {
      bot++; status.textContent = `${icons[a]} < ${icons[b]} · Поражение`;
      PrePlayUI?.addStat('rps','loss');
      PrePlayUI?.showResult('Поражение', 'Чередуй ходы: камень → бумага → ножницы.', [{label:'Понял', primary:true}]);
    }
    updateScore();
  }

  function tryResolveRound(){
    if(myMove && theirMove){
      const a = myMove, b = theirMove; myMove=null; theirMove=null;
      resolveRound(a,b);
    }
  }

  buttons.forEach(btn => btn.addEventListener('click', () => play(btn.dataset.move)));
  reset.addEventListener('click', () => { you = 0; bot = 0; updateScore(); status.textContent = 'Сделай выбор'; });
  if(modeSel){
    modeSel.addEventListener('change', ()=>{
      const netMode = modeSel.value==='net';
      netBox.open = netMode; netBox.style.display = netMode? 'block':'none';
      status.textContent = netMode? 'Подключись и сделай выбор' : 'Сделай выбор';
    });
    netBox.style.display = 'none';
  }

  // Network UI
  function showStep(which){
    document.getElementById('netStepOffer').style.display = which==='offer'? 'block':'none';
    document.getElementById('netStepAnswer').style.display = which==='answer'? 'block':'none';
  }
  createOfferBtn?.addEventListener('click', async ()=>{
    net = await Net.create(true);
    const offer = await net.createOffer();
    offerOut.value = offer; showStep('offer');
    net.onMessage = onNetMsg;
    status.textContent = 'Отправьте код. Ожидание подключения соперника…';
  });
  // Enable guest connect only when code provided; focus input on open
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
    net = await Net.create(false);
    const ans = await net.acceptOffer(offerIn.value.trim());
    answerOut.value = ans; net.onMessage = onNetMsg; status.textContent='Подключаемся… Ждите подтверждения.';
  });
  acceptAnswerBtn?.addEventListener('click', async ()=>{
    if(!net) return; await net.acceptAnswer(answerIn.value.trim()); status.textContent='Ожидание подключения соперника…';
  });

  function onNetMsg(msg){
    if(msg && msg.sys==='ready'){ status.textContent='Подключено. Сделай ход.'; return; }
    if(msg.t==='move'){ theirMove = msg.v; tryResolveRound(); }
  }
})();
