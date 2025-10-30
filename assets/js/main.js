// Theme toggle (light hint only)
(function(){
  const toggle = document.getElementById('themeToggle');
  if(!toggle) return;
  let light = false;
  toggle.addEventListener('click', () => {
    light = !light;
    document.body.style.filter = light ? 'invert(1) hue-rotate(180deg)' : 'none';
    toggle.textContent = light ? '🌙' : '☀️';
  });
})();

// Subtle card hover tilt
(function(){
  const cards = document.querySelectorAll('.game-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const rx = ((y / r.height) - 0.5) * -6;
      const ry = ((x / r.width) - 0.5) * 6;
      card.style.transform = `translateY(-4px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();
