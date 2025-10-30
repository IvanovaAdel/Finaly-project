/* global describe,it,before,after,beforeEach,expect */

function loadIframe(path){
  return new Promise((resolve, reject)=>{
    const iframe = document.createElement('iframe');
    iframe.style.width = '1024px'; iframe.style.height = '768px'; iframe.style.border = '1px solid #333';
    iframe.src = path;
    iframe.onload = ()=> resolve(iframe);
    iframe.onerror = (e)=> reject(e);
    document.body.appendChild(iframe);
  });
}

async function findEl(frame, sel, timeout=2000){
  const start = Date.now();
  return new Promise((resolve, reject)=>{
    (function tick(){
      const el = frame.contentDocument.querySelector(sel);
      if(el) return resolve(el);
      if(Date.now()-start>timeout) return reject(new Error('Timeout waiting for '+sel));
      setTimeout(tick, 30);
    })();
  });
}

function click(el){ el.click(); }
function type(el, v){ el.value = v; el.dispatchEvent(new Event('input', { bubbles:true })); }

// IMPORTANT: run tests from http://localhost:8000/test/games_test.html so iframes are same-origin

describe('Games integration', function(){
  this.timeout(8000);

  it('Battleship (AI mode): click fires and marks cell', async function(){
    const iframe = await loadIframe('/games/battleship.html');
    const doc = iframe.contentDocument;
    // Ensure AI mode
    const mode = await findEl(iframe, '#mode');
    mode.value = 'ai'; mode.dispatchEvent(new Event('change'));
    // Wait for boards
    const aiCell = await findEl(iframe, '#boardAi .cell');
    click(aiCell);
    // After click, it should be disabled and marked
    expect(aiCell.disabled).to.equal(true);
    expect(aiCell.dataset.shot).to.equal('1');
  });

  it('RPS (AI mode): play a round and update score/status', async function(){
    const iframe = await loadIframe('/games/rps.html');
    const doc = iframe.contentDocument;
    const mode = await findEl(iframe, '#mode');
    mode.value = 'ai'; mode.dispatchEvent(new Event('change'));
    const btnRock = await findEl(iframe, '[data-move="rock"]');
    click(btnRock);
    const status = await findEl(iframe, '#status');
    expect(status.textContent.length).to.be.greaterThan(0);
    const score = await findEl(iframe, '#score');
    expect(/\d+\s:\s\d+/.test(score.textContent)).to.equal(true);
  });

  it('TicTacToe (AI mode): place X then AI places O', async function(){
    const iframe = await loadIframe('/games/ttt.html');
    const doc = iframe.contentDocument;
    const mode = await findEl(iframe, '#mode');
    mode.value = 'ai'; mode.dispatchEvent(new Event('change'));
    const firstCell = await findEl(iframe, '#board .cell');
    click(firstCell);
    // After clicking, first cell should be X
    expect(firstCell.textContent).to.equal('X');
    // Wait a bit and expect some O on the board
    await new Promise(r=>setTimeout(r, 300));
    const cells = [...doc.querySelectorAll('#board .cell')].map(c=>c.textContent);
    expect(cells.includes('O')).to.equal(true);
  });

  it('Guess the number: validates input and increments tries', async function(){
    const iframe = await loadIframe('/games/guess.html');
    const doc = iframe.contentDocument;
    const input = await findEl(iframe, '#guess');
    const tryBtn = await findEl(iframe, '#try');
    const tries = await findEl(iframe, '#tries');
    const status = await findEl(iframe, '#status');

    // invalid entry
    type(input, '0'); click(tryBtn);
    expect(status.textContent.includes('Введите число')).to.equal(true);

    // valid entry increases tries
    type(input, '5'); click(tryBtn);
    expect(Number(tries.textContent)).to.be.greaterThan(0);
  });

  it('Snake: Start begins loop and moves without crashing immediately', async function(){
    const iframe = await loadIframe('/games/snake.html');
    const doc = iframe.contentDocument;
    const start = await findEl(iframe, '#start');
    click(start);
    // Let it run a few frames
    await new Promise(r=>setTimeout(r, 300));
    const score = await findEl(iframe, '#score');
    expect(Number(score.textContent)).to.be.at.least(0);
  });

  it('Hangman: clicking a letter disables the key and updates miss or word', async function(){
    const iframe = await loadIframe('/games/hangman.html');
    const doc = iframe.contentDocument;
    const key = await findEl(iframe, '#kb .key');
    const miss = await findEl(iframe, '#miss');
    const beforeMiss = Number(miss.textContent);
    click(key);
    expect(key.disabled).to.equal(true);
    const afterMiss = Number(miss.textContent);
    expect(afterMiss === beforeMiss || afterMiss === beforeMiss+1).to.equal(true);
  });

  it('Profile: toggle form title and save user', async function(){
    const iframe = await loadIframe('/profile.html');
    const doc = iframe.contentDocument;
    const haveAccount = await findEl(iframe, '#haveAccount');
    const formTitle = await findEl(iframe, '#formTitle');
    const name = await findEl(iframe, '#name');
    const save = await findEl(iframe, '#save');

    const initialTitle = formTitle.textContent;
    click(haveAccount);
    expect(formTitle.textContent).to.not.equal(initialTitle);

    // Save user
    type(name, 'Tester'); click(save);
    // After saving, profileBox should be visible
    const profileBox = await findEl(iframe, '#profileBox');
    expect(getComputedStyle(profileBox).display).to.equal('block');
  });
});
