(function(){
  const nameI = document.getElementById('name');
  const emailI = document.getElementById('email');
  const saveB = document.getElementById('save');
  const logoutB = document.getElementById('logout');
  const authBox = document.getElementById('authBox');
  const profileBox = document.getElementById('profileBox');
  const pName = document.getElementById('pName');
  const statsPre = document.getElementById('stats');
  const badge = document.getElementById('badge');
  const minus = document.getElementById('hueMinus');
  const plus = document.getElementById('huePlus');
  const haveAccount = document.getElementById('haveAccount');
  const formTitle = document.getElementById('formTitle');
  const lbBox = document.getElementById('leaderboards');
  const ratingBox = document.getElementById('accountRating');
  const gameStatsBox = document.getElementById('gameStats');
  const deleteBtn = document.getElementById('deleteAccount');
  const avatarInput = document.getElementById('avatarFile');
  const avatarRemove = document.getElementById('avatarRemove');
  const profAvatarChange = document.getElementById('profileAvatarChange');
  const profAvatarRemove = document.getElementById('profileAvatarRemove');
  const profAvatarFile = document.getElementById('profileAvatarFile');

  let hue = 200; // default
  let avatarData = null; // data URL for uploaded avatar

  function gradient(h){
    return `linear-gradient(135deg, hsl(${h} 95% 65%), hsl(${(h+60)%360} 95% 65%))`;
  }

  function updateBadge(){
    var first = ((nameI.value||'PP').trim().charAt(0) || 'P').toUpperCase();
    badge.textContent = first + (first ? '' : 'P');
    // if a photo is selected, show it; else gradient
    if(avatarData){
      badge.style.backgroundImage = 'url("'+avatarData+'")';
      badge.style.backgroundSize = 'cover';
      badge.style.backgroundPosition = 'center';
      badge.style.backgroundColor = 'transparent';
    } else {
      badge.style.backgroundImage = '';
      badge.style.background = gradient(hue);
    }
  }

  function render(){
    const u = PrePlayUI.getUser();
    if(u){
      authBox.style.display='none';
      profileBox.style.display='block';
      pName.textContent = u.name;
      // Ensure stats belong to the current user; if not, reset them
      try{
        const ownerRaw = localStorage.getItem('preplay_stats_owner')||'null';
        let owner = null; try{ owner = JSON.parse(ownerRaw); }catch(e){ owner = null; }
        const emailL = ((u.email||'').trim().toLowerCase());
        const nameL = ((u.name||'').trim().toLowerCase());
        const ownerEmail = (owner && (owner.emailL || (owner.email||'').trim().toLowerCase())) || '';
        const ownerName = (owner && (owner.nameL || (owner.name||'').trim().toLowerCase())) || '';
        const same = (emailL && ownerEmail) ? (emailL === ownerEmail)
                    : (!emailL && !ownerEmail && nameL === ownerName);
        if(!same){
          localStorage.setItem('preplay_stats','{}');
          localStorage.setItem('preplay_stats_owner', JSON.stringify({ nameL, emailL }));
        }
      }catch(e){}
      // Profile avatar badge
      const bp = document.getElementById('badgeProfile');
      if(bp){
        var initial = ((u.name||'P').trim().charAt(0) || 'P').toUpperCase();
        const h = (u.hue!=null) ? Number(u.hue) : 200;
        // If user has avatar photo, show it; otherwise gradient + initial
        if(u.avatar){
          bp.textContent = '';
          bp.style.backgroundImage = 'url("'+u.avatar+'")';
          bp.style.backgroundSize = 'cover';
          bp.style.backgroundPosition = 'center';
          bp.style.backgroundColor = 'transparent';
        } else {
          bp.textContent = initial;
          bp.style.backgroundImage = '';
          bp.style.background = gradient(h);
        }
      }
      const s = PrePlayUI.getStats();
      const lines = Object.entries(s).map(([game,v])=>`${game}: победы ${v.win||0}, поражения ${v.loss||0}, ничьи ${v.draw||0}`);
      statsPre.textContent = lines.length? lines.join('\n') : 'Пока нет игр. Сыграйте что-нибудь!';
      renderAccountRating(s);
      renderGameStats(s);
      renderLeaderboards();
    } else {
      authBox.style.display='block';
      profileBox.style.display='none';
      // Prefill last entered values if any
      hue = 200;
      updateBadge();
    }
  }

  function getMeta(){
    return {
      snake: { title: 'Змейка', hint: 'больше — лучше' },
      guess: { title: 'Угадай число', hint: 'меньше — лучше' },
      ttt:   { title: 'Крестики‑нолики', hint: 'серии побед (планируется)' },
      battleship: { title: 'Морской бой', hint: 'победы (планируется)' },
      rps: { title: 'Камень‑Ножницы‑Бумага', hint: 'победы (планируется)' },
      hangman: { title: 'Виселица', hint: 'меньше ошибок (планируется)' }
    };
  }

  function renderLeaderboards(){
    if(!lbBox) return;
    const lb = PrePlayUI.getLeaderboard();
    const meta = getMeta();
    const games = Object.keys(lb);
    if(!games.length){ lbBox.innerHTML = '<div class="status">Пока нет записей рейтинга. Сыграйте в Змейку или Угадай число.</div>'; return; }
    lbBox.innerHTML = games.map(g=>{
      const rows = (lb[g]||[]).map(r=>`<div class="lb-row"><span class="lb-name">${r.name}</span><span class="lb-score">${r.value}</span></div>`).join('');
      const m = meta[g]||{title:g, hint:''};
      return `<div class="lb-game"><div class="lb-title"><span>${m.title}</span><span>${m.hint}</span></div>${rows||'<div class="status">Пока пусто</div>'}</div>`;
    }).join('');
  }

  function renderAccountRating(stats){
    if(!ratingBox) return;
    const meta = getMeta();
    const entries = Object.entries(stats||{}).map(([game,v])=>({
      game,
      plays: (v.win||0)+(v.loss||0)+(v.draw||0)
    })).filter(e=>e.plays>0);
    if(entries.length===0){
      ratingBox.innerHTML = '<div class="status">Ещё не играли. Сыграйте любую игру!</div>';
      return;
    }
    entries.sort((a,b)=> b.plays - a.plays);
    const top = entries.slice(0,3);
    ratingBox.innerHTML = top.map(({game,plays})=>{
      const m = meta[game]||{title:game};
      return `<div class="lb-row"><span class="lb-name">${m.title}</span><span class="lb-score">${plays} игр</span></div>`;
    }).join('');
  }

  function renderGameStats(stats){
    if(!gameStatsBox) return;
    const meta = getMeta();
    const games = Object.keys(stats||{});
    if(!games.length){ gameStatsBox.innerHTML = '<div class="status">Нет данных</div>'; return; }
    gameStatsBox.innerHTML = games.map(g=>{
      const v = stats[g]||{};
      const m = meta[g]||{title:g};
      const win = v.win||0, loss=v.loss||0, draw=v.draw||0;
      return `<div class="lb-row"><span class="lb-name">${m.title}</span><span class="lb-score">${win}W / ${loss}L${draw?` / ${draw}D`:''}</span></div>`;
    }).join('');
  }

  saveB.addEventListener('click', ()=>{
    const name = (nameI.value||'').trim();
    const email = (emailI.value||'').trim();
    if(!name){ alert('Введите имя'); return; }
    const prev = PrePlayUI.getUser();
    const isNew = !prev || ( (prev.email||'') !== email || (!prev.email && (prev.name||'') !== name) );
    const isLoginMode = (formTitle.textContent||'').trim() === 'Вход';
    if(isNew || isLoginMode){
      try{
        // purge all per-user stats to avoid cross-account leakage (leaderboards untouched)
        const keys = [];
        for(let i=0;i<localStorage.length;i++){
          const k = localStorage.key(i);
          if(k && (k==='preplay_stats' || k.startsWith('preplay_stats__') || k==='preplay_stats_owner')) keys.push(k);
        }
        keys.forEach(k=> localStorage.removeItem(k));
      }catch(e){}
      try{ PrePlayUI.clearStats && PrePlayUI.clearStats(); }catch(e){}
    }
    PrePlayUI.setUser({ name, email, hue, avatar: avatarData || (PrePlayUI.getUser() && PrePlayUI.getUser().avatar) || null });
    PrePlayUI.refreshAvatar && PrePlayUI.refreshAvatar();
    render();
  });
  logoutB.addEventListener('click', ()=>{ PrePlayUI.logout(); render(); });
  function onDeleteAccount(){
    if(!confirm('Удалить аккаунт и все локальные данные статистики?')) return;
    try{ PrePlayUI.logout(); }catch(e){}
    try{ localStorage.removeItem('preplay_user'); }catch(e){}
    // remove all per-user stats keys (keep leaderboards if desired)
    try{
      const keys = [];
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if(k && (k==='preplay_stats' || k.startsWith('preplay_stats__') || k==='preplay_stats_owner')) keys.push(k);
      }
      keys.forEach(k=> localStorage.removeItem(k));
    }catch(e){}
    try{ localStorage.removeItem('preplay_leaderboard'); }catch(e){}
    render();
    alert('Аккаунт и локальная статистика удалены.');
  }
  // Bind immediately if button is already in DOM
  (function(){
    const btnNow = document.getElementById('deleteAccount');
    if(btnNow && !btnNow.dataset.bound){ btnNow.addEventListener('click', onDeleteAccount); btnNow.dataset.bound='1'; }
  })();
  // Fallback: also bind after DOM is ready
  document.addEventListener('DOMContentLoaded', function(){
    const btn = document.getElementById('deleteAccount');
    if(btn && !btn.dataset.bound){ btn.addEventListener('click', onDeleteAccount); btn.dataset.bound='1'; }
  });
  nameI.addEventListener('input', updateBadge);
  minus.addEventListener('click', ()=>{ hue = (hue+330)%360; updateBadge(); });
  plus.addEventListener('click', ()=>{ hue = (hue+30)%360; updateBadge(); });
  haveAccount.addEventListener('click', ()=>{
    // Toggle between Registration and Login UI texts (local mode keeps same behavior)
    const nowLogin = formTitle.textContent.trim() !== 'Вход';
    formTitle.textContent = nowLogin ? 'Вход' : 'Регистрация';
    if(saveB) saveB.textContent = nowLogin ? 'Войти' : 'Зарегистрироваться';
    if(haveAccount) haveAccount.textContent = nowLogin ? 'Создать новый аккаунт' : 'У меня уже есть аккаунт';
  });

  document.addEventListener('DOMContentLoaded', ()=>{ updateBadge(); render(); });

  // Helpers to read and resize image to square data URL
  function readFileAsDataURL(file){
    return new Promise(function(res, rej){
      var fr = new FileReader();
      fr.onload = function(){ res(fr.result); };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  function resizeToSquare(dataUrl, size){
    size = size || 128;
    return new Promise(function(res){
      var img = new Image();
      img.onload = function(){
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        // cover strategy: crop center square
        var s = Math.min(img.width, img.height);
        var sx = (img.width - s)/2, sy = (img.height - s)/2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        try{ res(canvas.toDataURL('image/jpeg', 0.9)); }
        catch(e){ res(canvas.toDataURL()); }
      };
      img.src = dataUrl;
    });
  }
  function handleAvatarFile(file){
    if(!file) return;
    readFileAsDataURL(file)
      .then(function(url){ return resizeToSquare(url, 128); })
      .then(function(url){ avatarData = url; updateBadge(); })
      .catch(function(){ alert('Не удалось прочитать файл изображения'); });
  }
  if(avatarInput){
    avatarInput.addEventListener('change', function(){
      var f = avatarInput.files && avatarInput.files[0];
      handleAvatarFile(f);
    });
  }
  if(avatarRemove){
    avatarRemove.addEventListener('click', function(){
      avatarData = null; if(avatarInput) avatarInput.value = '';
      updateBadge();
    });
  }

  // Profile view: change/remove avatar
  function handleAvatarFileForUser(file){
    if(!file) return;
    readFileAsDataURL(file)
      .then(function(url){ return resizeToSquare(url, 128); })
      .then(function(url){
        var u = PrePlayUI.getUser() || {};
        u.avatar = url;
        PrePlayUI.setUser(u);
        PrePlayUI.refreshAvatar && PrePlayUI.refreshAvatar();
        render();
      })
      .catch(function(){ alert('Не удалось прочитать файл изображения'); });
  }
  if(profAvatarChange && profAvatarFile){
    profAvatarChange.addEventListener('click', function(){ profAvatarFile.click(); });
    profAvatarFile.addEventListener('change', function(){
      var f = profAvatarFile.files && profAvatarFile.files[0];
      handleAvatarFileForUser(f);
      // reset value so selecting same file again re-triggers change
      profAvatarFile.value='';
    });
  }
  if(profAvatarRemove){
    profAvatarRemove.addEventListener('click', function(){
      var u = PrePlayUI.getUser();
      if(!u) return;
      u.avatar = null;
      PrePlayUI.setUser(u);
      PrePlayUI.refreshAvatar && PrePlayUI.refreshAvatar();
      render();
    });
  }
})();
