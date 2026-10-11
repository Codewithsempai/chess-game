(() => {
'use strict';
const G = {wK:'♚',wQ:'♛',wR:'♜',wB:'♝',wN:'♞',wP:'♟',bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟'};
const VAL = {P:100,N:320,B:330,R:500,Q:900,K:0};
const $ = id => document.getElementById(id);
const ok = (r,c) => r>=0&&r<8&&c>=0&&c<8;
const opp = c => c==='w'?'b':'w';
const alg = (r,c) => 'abcdefgh'[c]+(8-r);

function start(){
  const back='RNBQKBNR'.split('');
  const b=Array.from({length:8},()=>Array(8).fill(null));
  back.forEach((p,c)=>{b[0][c]='b'+p;b[7][c]='w'+p;b[1][c]='bP';b[6][c]='wP';});
  return {b,turn:'w',cas:{wK:1,wQ:1,bK:1,bQ:1},ep:null,half:0,full:1};
}
const clone = s => ({b:s.b.map(r=>r.slice()),turn:s.turn,cas:{...s.cas},ep:s.ep&&[...s.ep],half:s.half,full:s.full});

const KN=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
const KG=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const DG=[[1,1],[1,-1],[-1,1],[-1,-1]], OR=[[1,0],[-1,0],[0,1],[0,-1]];

function attacked(s,r,c,by){
  const b=s.b, d=by==='w'?1:-1; // white pawns attack upward (r-1)
  for(const dc of [-1,1]){const pr=r+d,pc=c+dc; if(ok(pr,pc)&&b[pr][pc]===by+'P')return true;}
  for(const [dr,dc] of KN){const rr=r+dr,cc=c+dc; if(ok(rr,cc)&&b[rr][cc]===by+'N')return true;}
  for(const [dr,dc] of KG){const rr=r+dr,cc=c+dc; if(ok(rr,cc)&&b[rr][cc]===by+'K')return true;}
  for(const [dirs,t] of [[DG,'B'],[OR,'R']])for(const [dr,dc] of dirs){
    let rr=r+dr,cc=c+dc;
    while(ok(rr,cc)){const p=b[rr][cc]; if(p){if(p[0]===by&&(p[1]===t||p[1]==='Q'))return true;break;} rr+=dr;cc+=dc;}
  }
  return false;
}
const findK=(s,col)=>{for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(s.b[r][c]===col+'K')return [r,c];};
const inCheck=(s,col)=>{const k=findK(s,col);return attacked(s,k[0],k[1],opp(col));};

function pseudo(s,r,c){
  const p=s.b[r][c], col=p[0], t=p[1], out=[], b=s.b;
  const add=(tr,tc,x={})=>out.push({fr:r,fc:c,tr,tc,...x});
  if(t==='P'){
    const d=col==='w'?-1:1, home=col==='w'?6:1, last=col==='w'?0:7;
    const push=(tr,tc,x)=>{ if(tr===last)'QRBN'.split('').forEach(q=>add(tr,tc,{...x,promo:q})); else add(tr,tc,x); };
    if(ok(r+d,c)&&!b[r+d][c]){push(r+d,c,{}); if(r===home&&!b[r+2*d][c])add(r+2*d,c,{dbl:1});}
    for(const dc of [-1,1]){const tr=r+d,tc=c+dc; if(!ok(tr,tc))continue;
      if(b[tr][tc]&&b[tr][tc][0]!==col)push(tr,tc,{cap:1});
      else if(s.ep&&s.ep[0]===tr&&s.ep[1]===tc)add(tr,tc,{cap:1,ep:1});}
  } else if(t==='N'||t==='K'){
    for(const [dr,dc] of (t==='N'?KN:KG)){const tr=r+dr,tc=c+dc; if(!ok(tr,tc))continue;
      const q=b[tr][tc]; if(!q)add(tr,tc); else if(q[0]!==col)add(tr,tc,{cap:1});}
    if(t==='K'){
      const row=col==='w'?7:0, e=opp(col);
      if(r===row&&c===4&&!attacked(s,row,4,e)){
        if(s.cas[col+'K']&&!b[row][5]&&!b[row][6]&&b[row][7]===col+'R'&&!attacked(s,row,5,e)&&!attacked(s,row,6,e))add(row,6,{castle:'K'});
        if(s.cas[col+'Q']&&!b[row][1]&&!b[row][2]&&!b[row][3]&&b[row][0]===col+'R'&&!attacked(s,row,3,e)&&!attacked(s,row,2,e))add(row,2,{castle:'Q'});
      }
    }
  } else {
    const dirs=t==='B'?DG:t==='R'?OR:[...DG,...OR];
    for(const [dr,dc] of dirs){let tr=r+dr,tc=c+dc;
      while(ok(tr,tc)){const q=b[tr][tc]; if(!q)add(tr,tc); else{if(q[0]!==col)add(tr,tc,{cap:1});break;} tr+=dr;tc+=dc;}}
  }
  return out;
}

function apply(s,m){
  const n=clone(s), b=n.b, p=b[m.fr][m.fc], col=p[0];
  const captured=b[m.tr][m.tc]||(m.ep?b[m.fr][m.tc]:null);
  b[m.tr][m.tc]=m.promo?col+m.promo:p; b[m.fr][m.fc]=null;
  if(m.ep)b[m.fr][m.tc]=null;
  if(m.castle){const row=m.tr; if(m.castle==='K'){b[row][5]=b[row][7];b[row][7]=null;}else{b[row][3]=b[row][0];b[row][0]=null;}}
  if(p[1]==='K'){n.cas[col+'K']=0;n.cas[col+'Q']=0;}
  const sqs={'7,0':'wQ','7,7':'wK','0,0':'bQ','0,7':'bK'};
  for(const k of [m.fr+','+m.fc,m.tr+','+m.tc])if(sqs[k])n.cas[sqs[k]]=0;
  n.ep=m.dbl?[(m.fr+m.tr)/2,m.fc]:null;
  n.half=(p[1]==='P'||captured)?0:n.half+1;
  if(col==='b')n.full++;
  n.turn=opp(col);
  return {n,captured};
}

function legal(s){
  const out=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=s.b[r][c]; if(!p||p[0]!==s.turn)continue;
    for(const m of pseudo(s,r,c)) if(!inCheck(apply(s,m).n,s.turn))out.push(m);
  }
  return out;
}

const key=s=>s.b.map(r=>r.map(p=>p||'-').join('')).join('/')+s.turn+JSON.stringify(s.cas)+(s.ep?alg(...s.ep):'');

function san(s,m,moves,nxt){
  const p=s.b[m.fr][m.fc]; let t;
  if(m.castle)t=m.castle==='K'?'O-O':'O-O-O';
  else{
    t=p[1]==='P'?(m.cap?'abcdefgh'[m.fc]:''):p[1];
    if(p[1]!=='P'){
      const o=moves.filter(x=>x!==m&&x.tr===m.tr&&x.tc===m.tc&&s.b[x.fr][x.fc]===p);
      if(o.length){ if(!o.some(x=>x.fc===m.fc))t+='abcdefgh'[m.fc]; else if(!o.some(x=>x.fr===m.fr))t+=(8-m.fr); else t+=alg(m.fr,m.fc); }
    }
    if(m.cap)t+='x'; t+=alg(m.tr,m.tc); if(m.promo)t+='='+m.promo;
  }
  if(inCheck(nxt,nxt.turn))t+=legal(nxt).length?'+':'#';
  return t;
}

/* ---------- AI ---------- */
function evalS(s){
  let v=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=s.b[r][c]; if(!p)continue;
    const cen=(3.5-Math.abs(3.5-r))+(3.5-Math.abs(3.5-c));
    let x=VAL[p[1]]+(p[1]==='K'?0:cen*(p[1]==='P'?4:6));
    if(p[1]==='P')x+=(p[0]==='w'?6-r:r-1)*6;
    v+=p[0]==='w'?x:-x;
  }
  return v;
}
function order(s,ms){
  return ms.map(m=>({m,k:(m.cap?10*VAL[(s.b[m.tr][m.tc]||'wP')[1]]-VAL[s.b[m.fr][m.fc][1]]:0)+(m.promo?800:0)})).sort((a,b)=>b.k-a.k).map(x=>x.m);
}
let useQ=false;
function qs(s,a,b,qd){
  const stand=(s.turn==='w'?1:-1)*evalS(s);
  if(qd===0||stand>=b)return stand;
  if(stand>a)a=stand;
  for(const m of order(s,legal(s).filter(x=>x.cap||x.promo))){
    const v=-qs(apply(s,m).n,-b,-a,qd-1);
    if(v>=b)return v; if(v>a)a=v;
  }
  return a;
}
function search(s,d,a,b){
  const ms=legal(s);
  if(!ms.length)return inCheck(s,s.turn)?-99999-d:0;
  if(d===0)return useQ?qs(s,a,b,4):(s.turn==='w'?1:-1)*evalS(s);
  let best=-Infinity;
  for(const m of order(s,ms)){
    const v=-search(apply(s,m).n,d-1,-b,-a);
    if(v>best)best=v; if(best>a)a=best; if(a>=b)break;
  }
  return best;
}
function pick(s,lvl){
  useQ=lvl>=4; if(lvl>=4)lvl=3;
  const ms=legal(s); let best=null,bv=-Infinity;
  for(const m of order(s,ms)){
    const v=-search(apply(s,m).n,lvl,-Infinity,Infinity)+(lvl===1?Math.random()*150:useQ?0:Math.random()*8);
    if(v>bv){bv=v;best=m;}
  }
  return best;
}

/* ---------- UI ---------- */
let S, hist, moves, sel=null, flipped=false, last=null, over=false, busy=false;
const boardEl=$('board');

function newGame(){
  S=start(); hist=[]; moves=legal(S); sel=null; last=null; over=false; busy=false; $('end').hidden=true;
  flipped=false; if($('mode').value==='ai')flipped=false;
  render(); maybeAI();
}

function render(){
  boardEl.innerHTML='';
  const chk=inCheck(S,S.turn)?findK(S,S.turn):null;
  const targets=sel?moves.filter(m=>m.fr===sel[0]&&m.fc===sel[1]):[];
  for(let i=0;i<8;i++)for(let j=0;j<8;j++){
    const r=flipped?7-i:i, c=flipped?7-j:j, p=S.b[r][c];
    const d=document.createElement('div');
    d.className='sq '+((r+c)%2?'d':'l');
    if(last&&((last.fr===r&&last.fc===c)||(last.tr===r&&last.tc===c)))d.classList.add('last');
    if(sel&&sel[0]===r&&sel[1]===c)d.classList.add('sel');
    if(chk&&chk[0]===r&&chk[1]===c)d.classList.add('chk');
    const t=targets.find(m=>m.tr===r&&m.tc===c);
    if(t)d.classList.add(t.cap?'cap':'mv');
    if(last&&last.cap&&last.tr===r&&last.tc===c)d.classList.add('took');
    if(p){const e=document.createElement('span');e.className='p '+p[0];e.textContent=G[p];d.appendChild(e);}
    if(j===0){const e=document.createElement('i');e.className='co r';e.textContent=8-r;d.appendChild(e);}
    if(i===7){const e=document.createElement('i');e.className='co f';e.textContent='abcdefgh'[c];d.appendChild(e);}
    d.onclick=()=>click(r,c);
    boardEl.appendChild(d);
  }
  renderPanel();
}

function renderPanel(){
  const ml=$('moves'); ml.innerHTML='';
  hist.forEach((h,i)=>{
    if(i%2===0){const n=document.createElement('span');n.className='n';n.textContent=(i/2+1)+'.';ml.appendChild(n);}
    const m=document.createElement('span');m.className='m'+(i===hist.length-1?' cur':'');m.textContent=h.san;ml.appendChild(m);
  });
  ml.scrollTop=ml.scrollHeight;
  const names={w:'White',b:'Black'}, ai=$('mode').value==='ai';
  $('topName').textContent=flipped?(ai?'You (White)':'White'):(ai?'Computer':'Black');
  $('botName').textContent=flipped?(ai?'Computer':'Black'):(ai?'You (White)':'White');
  $('topAv').textContent=flipped?'♔':'♚'; $('botAv').textContent=flipped?'♚':'♔';
  const caps={w:[],b:[]}; hist.forEach(h=>{if(h.cap)caps[h.by].push(h.cap);});
  const fmt=a=>a.sort((x,y)=>VAL[y[1]]-VAL[x[1]]).map(p=>G[p]).join('');
  const topCol=flipped?'w':'b'; // top player's captures are pieces of opposite colour
  $('topCaps').textContent=fmt(caps[topCol]); $('botCaps').textContent=fmt(caps[opp(topCol)]);
  const topCol2=flipped?'w':'b';
  $('topTurn').parentElement.classList.toggle('active',!over&&S.turn===topCol2);
  $('botTurn').parentElement.classList.toggle('active',!over&&S.turn!==topCol2);
  if(!over){
    const chk=inCheck(S,S.turn);
    $('status').textContent=(busy?'Computer is thinking…':names[S.turn]+' to move')+(chk?' — Check!':'');
  }
}

function click(r,c){
  if(over||busy)return;
  if($('mode').value==='ai'&&S.turn==='b')return;
  const p=S.b[r][c];
  if(sel){
    const cand=moves.filter(m=>m.fr===sel[0]&&m.fc===sel[1]&&m.tr===r&&m.tc===c);
    if(cand.length){
      if(cand[0].promo)return promote(cand);
      return play(cand[0]);
    }
  }
  sel=(p&&p[0]===S.turn&&(sel?.[0]!==r||sel?.[1]!==c))?[r,c]:null;
  render();
}

function promote(cand){
  const box=$('promoBox'); box.innerHTML=''; const col=S.turn;
  for(const m of cand){const b=document.createElement('button');b.textContent=G[col+m.promo];
    b.onclick=()=>{$('promo').hidden=true;play(m);};box.appendChild(b);}
  $('promo').hidden=false;
}

function play(m){
  const s=S, {n,captured}=apply(s,m);
  const nm=legal(n);
  hist.push({s,san:san(s,m,moves,n),cap:captured,by:s.turn,key:key(n),m});
  S=n; moves=nm; sel=null; last=m;
  checkEnd(); render();
  if(!over)maybeAI();
}

function checkEnd(){
  const chk=inCheck(S,S.turn);
  let t=null,msg='';
  if(!moves.length){ if(chk){t='Checkmate!';msg=(S.turn==='w'?'Black':'White')+' wins.';}else{t='Stalemate';msg='Draw — no legal moves.';} }
  else if(S.half>=100){t='Draw';msg='Fifty-move rule.';}
  else if(hist.filter(h=>h.key===key(S)).length>=3){t='Draw';msg='Threefold repetition.';}
  else{
    const ps=S.b.flat().filter(p=>p&&p[1]!=='K');
    if(!ps.length||(ps.length===1&&'BN'.includes(ps[0][1]))){t='Draw';msg='Insufficient material.';}
  }
  if(t){over=true;$('status').textContent=t+' '+msg;$('endTitle').textContent=t;$('endMsg').textContent=msg;setTimeout(()=>{$('end').hidden=false;},500);}
}

function maybeAI(){
  if($('mode').value!=='ai'||S.turn!=='b'||over)return;
  busy=true; renderPanel();
  setTimeout(()=>{const m=pick(S,+$('level').value); busy=false; if(m)play(m);},350);
}

function undo(){
  if(busy||!hist.length)return;
  let k=$('mode').value==='ai'?(S.turn==='w'?2:1):1;
  k=Math.min(k,hist.length);
  while(k--){S=hist.pop().s;}
  moves=legal(S); sel=null; over=false; $('end').hidden=true;
  last=hist.length?hist[hist.length-1].m:null; render();
}

function fen(){
  const rows=S.b.map(r=>{let s='',e=0;for(const p of r){if(!p)e++;else{if(e){s+=e;e=0;}s+=p[0]==='w'?p[1]:p[1].toLowerCase();}}return s+(e||'');});
  const c=(S.cas.wK?'K':'')+(S.cas.wQ?'Q':'')+(S.cas.bK?'k':'')+(S.cas.bQ?'q':'')||'-';
  return `${rows.join('/')} ${S.turn} ${c} ${S.ep?alg(...S.ep):'-'} ${S.half} ${S.full}`;
}

$('bNew').onclick=newGame; $('bUndo').onclick=undo;
$('endBtn').onclick=newGame;
$('bFlip').onclick=()=>{flipped=!flipped;render();};
$('bFen').onclick=()=>{const f=fen();(navigator.clipboard?navigator.clipboard.writeText(f):Promise.reject()).then(()=>flash('FEN copied'),()=>prompt('FEN',f));};
$('mode').onchange=()=>{$('lvlWrap').hidden=$('mode').value!=='ai';newGame();};
$('level').onchange=newGame;
function flash(t){const o=$('status').textContent;$('status').textContent=t;setTimeout(()=>renderPanel(),1000);}
newGame();
})();
