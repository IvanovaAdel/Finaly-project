(function(){
  const THEMES = {
    classic: ['КОМПЬЮТЕР','ПРОГРАММА','АЛГОРИТМ','ИНТЕРНЕТ','ИГРОК','КОДЕКС','КНИГА','СОЛНЦЕ','ШКОЛА','ГОРОД'],
    animals: ['ТИГР','ЁЖ','КОАЛА','ЛЕОПАРД','КИТ','СОБАКА','КОШКА','ПИНГВИН','ОРЁЛ','МЕДВЕДЬ'],
    tech: ['ПРОЦЕССОР','БРАУЗЕР','СЕРВЕР','ДАННЫЕ','БАЗА','АЛГЕБРА','РОБОТ','СИСТЕМА','ЭКРАН','СЕТЬ'],
    food: ['МОЛОКО','СЫР','СУП','КАРРИ','ПИЦЦА','ХЛЕБ','САЛАТ','ШОКОЛАД','ЙОГУРТ','МАНГО']
  };
  const alphabet = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
  const wordEl = document.getElementById('word');
  const status = document.getElementById('status');
  const missEl = document.getElementById('miss');
  const kb = document.getElementById('kb');
  const reset = document.getElementById('reset');
  const themeSel = document.getElementById('theme');
  const cvs = document.getElementById('canvas');
  const ctx = cvs.getContext('2d');
  let secret, open, miss, over;

  function pickWord(){
    const theme = (themeSel?.value)||'classic';
    const list = THEMES[theme] || THEMES.classic;
    return list[Math.floor(Math.random()*list.length)];
  }

  function init(){
    secret = pickWord();
    open = Array(secret.length).fill(false);
    miss = 0; over=false; missEl.textContent='0';
    draw(0); renderWord(); renderKb(); status.textContent='Отгадай слово';
  }

  function draw(step){
    ctx.clearRect(0,0,cvs.width,cvs.height);
    ctx.strokeStyle = '#e9ecf1'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    // base
    ctx.beginPath(); ctx.moveTo(40,200); ctx.lineTo(200,200); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(80,200); ctx.lineTo(80,40); ctx.lineTo(220,40); ctx.lineTo(220,70); ctx.stroke();
    if(step>0){ ctx.beginPath(); ctx.arc(220,95,20,0,Math.PI*2); ctx.stroke(); }
    if(step>1){ ctx.beginPath(); ctx.moveTo(220,115); ctx.lineTo(220,160); ctx.stroke(); }
    if(step>2){ ctx.beginPath(); ctx.moveTo(220,125); ctx.lineTo(200,140); ctx.stroke(); }
    if(step>3){ ctx.beginPath(); ctx.moveTo(220,125); ctx.lineTo(240,140); ctx.stroke(); }
    if(step>4){ ctx.beginPath(); ctx.moveTo(220,160); ctx.lineTo(200,185); ctx.stroke(); }
    if(step>5){ ctx.beginPath(); ctx.moveTo(220,160); ctx.lineTo(240,185); ctx.stroke(); }
    // step 7 is final
  }

  function renderWord(){
    wordEl.textContent = secret.split('').map((ch,i)=> open[i]? ch : '•').join(' ');
  }

  function renderKb(){
    kb.innerHTML='';
    alphabet.forEach((ch)=>{
      const b=document.createElement('button');
      b.className='key'; b.textContent=ch;
      b.addEventListener('click',()=>press(ch,b));
      kb.appendChild(b);
    });
  }

  function press(ch, btn){
    if(over) return;
    btn.disabled=true;
    let any=false;
    secret.split('').forEach((c,i)=>{ if(c===ch){ open[i]=true; any=true; } });
    if(!any){ miss++; missEl.textContent=String(miss); draw(miss); }
    renderWord();
    const win = open.every(Boolean);
    if(win){ status.textContent='Победа!'; over=true; PrePlayUI?.addStat('hangman','win'); PrePlayUI?.showResult('Победа', 'Частые буквы: О, А, И, Е. Начинай с них.', [{label:'Ещё раз', primary:true, onClick:init}]); }
    else if(miss>=7){ status.textContent=`Поражение. Было слово: ${secret}`; over=true; PrePlayUI?.addStat('hangman','loss'); PrePlayUI?.showResult('Поражение', 'Пробуй сначала гласные, затем согласные.', [{label:'Переиграть', primary:true, onClick:init}]); }
  }

  reset.addEventListener('click', init);
  themeSel?.addEventListener('change', init);
  init();
})();
