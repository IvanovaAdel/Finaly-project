(function(){
  const cvs = document.getElementById('canvas');
  const ctx = cvs.getContext('2d');
  const size = 20; // cell px
  const cells = cvs.width / size; // 21
  const scoreEl = document.getElementById('score');
  const reset = document.getElementById('reset');
  const speedSel = document.getElementById('speed');
  const startBtn = document.getElementById('start');

  let snake, dir, food, over, score, loopId;
  let speed = 100; // ms per step

  function rndCell(){ return Math.floor(Math.random()*cells); }
  function spawnFood(){
    let f;
    do { f = {x:rndCell(), y:rndCell()}; }
    while (snake && snake.some(p=>p.x===f.x && p.y===f.y));
    return f;
  }

  function resetGame(){
    snake = [{x:10,y:10}];
    dir = {x:1,y:0};
    food = spawnFood();
    over = false; score = 0; scoreEl.textContent='0';
    if(loopId) cancelAnimationFrame(loopId);
    loop();
  }

  function draw(){
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0,0,cvs.width,cvs.height);

    // food
    ctx.fillStyle = '#34d399';
    ctx.fillRect(food.x*size, food.y*size, size, size);

    // snake
    ctx.fillStyle = '#6ee7ff';
    snake.forEach((p,i)=>{
      ctx.fillRect(p.x*size, p.y*size, size, size);
    });
  }

  let last=0;
  function loop(ts){
    if(over) return;
    if(!last) last=ts;
    if(ts - last > speed){
      last = ts;
      // move with solid walls (no wrapping)
      const nx = snake[0].x + dir.x, ny = snake[0].y + dir.y;
      if(nx<0 || ny<0 || nx>=cells || ny>=cells){
        over=true;
        try{ PrePlayUI?.submitScore('snake', score, 'high'); }catch(e){}
        PrePlayUI?.showResult('Поражение', 'Столкновение со стеной. Нажмите «Начать» для новой игры.', [{label:'ОК', primary:true}]);
        return;
      }
      const head = {x:nx, y:ny};
      // collision with body
      if(snake.some(p=>p.x===head.x && p.y===head.y)){
        over=true;
        try{ PrePlayUI?.submitScore('snake', score, 'high'); }catch(e){}
        PrePlayUI?.showResult('Поражение', 'Совет: не режь углы на высокой скорости. Нажмите «Начать» для новой игры.', [{label:'ОК', primary:true}]);
        return;
      }
      snake.unshift(head);
      if(head.x===food.x && head.y===food.y){ score++; scoreEl.textContent=String(score); food = spawnFood(); }
      else snake.pop();
      draw();
    }
    loopId = requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', e=>{
    if(e.key==='ArrowUp' && dir.y!==1) dir={x:0,y:-1};
    if(e.key==='ArrowDown' && dir.y!==-1) dir={x:0,y:1};
    if(e.key==='ArrowLeft' && dir.x!==1) dir={x:-1,y:0};
    if(e.key==='ArrowRight' && dir.x!==-1) dir={x:1,y:0};
  });

  startBtn?.addEventListener('click', resetGame);
  reset.addEventListener('click', resetGame);
  speedSel?.addEventListener('change', ()=>{ speed = Number(speedSel.value)||100; });
  if(speedSel) speed = Number(speedSel.value)||100;
  // Do not auto-start; wait for Start button
})();
