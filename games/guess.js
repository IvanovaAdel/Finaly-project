(function(){
  const status = document.getElementById('status');
  const triesEl = document.getElementById('tries');
  const input = document.getElementById('guess');
  const tryBtn = document.getElementById('try');
  const reset = document.getElementById('reset');
  const rangeSel = document.getElementById('range');
  let secret, tries;
  let maxTries = 7;
  let gameOver = false;
  let top = 100;

  function resetGame(){
    top = Number(rangeSel?.value||100) || 100;
    secret = 1 + Math.floor(Math.random()*top);
    // attempts by range
    maxTries = (top===100) ? 7 : (top===1000 ? 12 : 17);
    tries = 0;
    gameOver = false;
    triesEl.textContent = String(maxTries);
    status.textContent = `Я загадал число от 1 до ${top}`;
    input.value = '';
    input.min = 1; input.max = top;
    input.disabled = false; tryBtn.disabled = false;
    input.focus();
  }

  function check(){
    if(gameOver) return;
    const val = Number(input.value);
    if(!val || val<1 || val>top){ status.textContent = `Введите число от 1 до ${top}`; return; }
    tries++;
    triesEl.textContent = String(Math.max(0, maxTries - tries));
    if(val === secret){
      status.textContent = `Верно! Число ${secret}. Попыток: ${tries}`;
      try{ PrePlayUI?.submitScore('guess', tries, 'low'); }catch(e){}
      PrePlayUI?.addStat('guess','win');
      gameOver = true; input.disabled = true; tryBtn.disabled = true;
      PrePlayUI?.showResult('Победа', 'Совет: сужай диапазон бинарным поиском.', [{label:'Ещё раз', primary:true, onClick: resetGame}]);
    }
    else {
      const remain = Math.max(0, maxTries - tries);
      if(val < secret){
        status.textContent = remain>0 ? `Мало, попробуй больше (осталось ${remain})` : 'Мало, попробуй больше';
      } else {
        status.textContent = remain>0 ? `Много, попробуй меньше (осталось ${remain})` : 'Много, попробуй меньше';
      }
    }
    if(!gameOver){
      if(tries >= maxTries){
        gameOver = true; input.disabled = true; tryBtn.disabled = true;
        status.textContent = `Попытки закончились! Я загадал ${secret}.`;
        PrePlayUI?.addStat('guess','loss');
        PrePlayUI?.showResult('Проигрыш', `Число было ${secret}. Попробуешь ещё раз?`, [{label:'Ещё раз', primary:true, onClick: resetGame}]);
      } else {
        input.select();
      }
    }
  }

  tryBtn.addEventListener('click', check);
  input.addEventListener('keydown', e => { if(e.key==='Enter') check(); });
  reset.addEventListener('click', resetGame);
  rangeSel?.addEventListener('change', resetGame);

  resetGame();
})();
