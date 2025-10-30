/* global describe,it,before,after,expect,Net */

describe('Net (LAN WebSocket)', function(){
  it('connects two peers with room code and exchanges messages', async function(){
    this.timeout(3000);
    const host = await Net.create(true);
    const guest = await Net.create(false);

    const code = await host.createOffer();
    await guest.acceptOffer(code);
    await host.acceptAnswer('OK');

    // Wait until both mark connected via 'ready'
    await new Promise(res=>{
      const start = Date.now();
      const timer = setInterval(()=>{
        if(host.isConnected && guest.isConnected){ clearInterval(timer); res(); }
        if(Date.now()-start>2000){ clearInterval(timer); res(); }
      }, 20);
    });

    let received = null;
    guest.onMessage = (m)=>{ received = m; };
    host.send({ t:'ping', v:123 });

    await new Promise(r=>setTimeout(r, 50));
    expect(received).to.deep.equal({ t:'ping', v:123 });
  });
});
