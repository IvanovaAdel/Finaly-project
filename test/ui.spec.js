/* global describe,it,beforeEach,afterEach,expect,PrePlayUI */

describe('UI module', function(){
  beforeEach(function(){
    // Clean modal & storage
    const m = document.getElementById('ppModalBackdrop');
    if(m && m.parentNode) m.parentNode.removeChild(m);
    localStorage.clear();
  });

  it('showResult/hideModal create and toggle modal', function(){
    expect(document.getElementById('ppModalBackdrop')).to.equal(null);
    PrePlayUI.showResult('Title','Tip',[{label:'OK', primary:true}]);
    const backdrop = document.getElementById('ppModalBackdrop');
    expect(backdrop).to.not.equal(null);
    expect(backdrop.style.display).to.equal('flex');
    PrePlayUI.hideModal();
    expect(backdrop.style.display).to.equal('none');
  });

  it('setUser/getUser/logout works', function(){
    const u = { name:'Alice', hue: 210 };
    PrePlayUI.setUser(u);
    const got = PrePlayUI.getUser();
    expect(got).to.deep.equal(u);
    PrePlayUI.logout();
    expect(PrePlayUI.getUser()).to.equal(null);
  });

  it('addStat/getStats increments per game', function(){
    PrePlayUI.addStat('rps','win');
    PrePlayUI.addStat('rps','win');
    PrePlayUI.addStat('rps','draw');
    const s = PrePlayUI.getStats();
    expect(s.rps.win).to.equal(2);
    expect(s.rps.draw).to.equal(1);
  });

  it('leaderboard submitScore keeps top and mode', function(){
    // high mode (default): bigger is better
    PrePlayUI.submitScore('rps', 10);
    PrePlayUI.submitScore('rps', 5);
    let lb = PrePlayUI.getLeaderboard();
    expect(lb.rps[0].value).to.equal(10);

    // low mode: lower is better
    PrePlayUI.submitScore('ttt', 30, 'low');
    PrePlayUI.submitScore('ttt', 20, 'low');
    lb = PrePlayUI.getLeaderboard();
    expect(lb.ttt[0].value).to.equal(20);
  });

  it('initBackground attaches a canvas', function(){
    // background starts on DOMContentLoaded in ui.js; ensure canvas exists
    const cvs = document.getElementById('bgCanvas');
    expect(!!cvs).to.equal(true);
  });
});
