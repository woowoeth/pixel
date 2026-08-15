/* PIXELDEX 交互层：画布、动画、导出、事件 */
/* ---------- 画布 ---------- */
const cv=$('#cv'), ctx=cv.getContext('2d'); ctx.imageSmoothingEnabled=false;
const S=cv.width/N;
let current=null, anim=null;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LAYERS=['剪影','描边','细节'];

function drawCells(list,upto){
  ctx.clearRect(0,0,cv.width,cv.height);
  const n=upto===undefined?list.length:upto;
  for(let i=0;i<n;i++){
    const c=list[i];
    ctx.fillStyle=current.pal[c.ch];
    ctx.fillRect(c.x*S,c.y*S,S,S);
  }
}

function render(word,variant){
  const m=resolve(word), sp=m&&m.sp;
  let grid,pal,seed;
  if(sp){
    grid=sp.px.map(r=>r.split('')); pal=sp.pal; seed=fnv1a(sp.k);
  }else{
    const f=forge(norm(word)||'?',variant); grid=f.grid; pal=f.pal; seed=f.seed;
  }
  current={word,grid,pal,seed,sp};
  const info=analyse(grid,pal);
  current.info=info;

  $('#meta').textContent=`种子 ${seed.toString(16).slice(0,4).toUpperCase()} · 16×16 · ${info.colors.length} 色`;
  $('#ramp').innerHTML=info.colors.map(c=>`<div style="background:${c}" data-hex="${c.toUpperCase()}"></div>`).join('');
  cv.setAttribute('aria-label',`「${word}」的 16×16 像素图`);

  const note=$('#note');
  if(m&&m.via==='exact')
    note.innerHTML=`<span class="tag">图鉴收录</span> <b>${esc(sp.cn)} / ${esc(sp.en)}</b> · 手绘图样`;
  else if(m)
    note.innerHTML=`<span class="tag">取词中的「${esc(m.hit)}」</span> 画成 <b>${esc(sp.cn)} / ${esc(sp.en)}</b>`;
  else
    note.innerHTML=`<span class="tag new">印记</span> 图鉴里没有对得上 <b>${esc(word)}</b> 的东西。这枚图案由字形推出，<b>它不描述这个词</b>，只是这个词的专属记号。`;

  if(anim)cancelAnimationFrame(anim);
  if(reduced){ drawCells(info.order); $('#step').textContent='完成'; shelfAdd(); return; }
  const total=560, t0=performance.now();
  (function tick(now){
    const p=Math.min(1,(now-t0)/total), e=1-Math.pow(1-p,2);
    const upto=Math.round(e*info.order.length);
    drawCells(info.order,upto);
    const last=info.order[Math.max(0,upto-1)];
    $('#step').textContent = p>=1 ? '完成' : LAYERS[last?info.layerOf(last):0];
    if(p<1) anim=requestAnimationFrame(tick); else shelfAdd();
  })(t0);
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

/* ---------- 画过的 ---------- */
let shelf=[];
try{ const s=localStorage.getItem('pixeldex.shelf'); if(s)shelf=JSON.parse(s).slice(0,24); }catch(e){}
function shelfSave(){ try{ localStorage.setItem('pixeldex.shelf',JSON.stringify(shelf.slice(0,24))); }catch(e){} }
function shelfAdd(){
  if(!current)return;
  const w=current.word;
  shelf=[{w,v:variant}].concat(shelf.filter(i=>i.w!==w)).slice(0,24);
  shelfSave(); shelfDraw();
}
function shelfDraw(){
  const host=$('#shelf'); host.innerHTML='';
  $('#shelfEmpty').style.display=shelf.length?'none':'block';
  shelf.forEach(item=>{
    const sp=lookup(item.w);
    let grid,pal;
    if(sp){grid=sp.px.map(r=>r.split(''));pal=sp.pal;}
    else{const f=forge(norm(item.w)||'?',item.v||0);grid=f.grid;pal=f.pal;}
    const b=document.createElement('button');
    b.className='slot'; b.title=item.w;
    const c=document.createElement('canvas'); c.width=c.height=128;
    const g=c.getContext('2d'); g.imageSmoothingEnabled=false;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const ch=grid[y][x]; if(ch==='.'||!pal[ch])continue;
      g.fillStyle=pal[ch]; g.fillRect(x*8,y*8,8,8);
    }
    const em=document.createElement('em'); em.textContent=item.w;
    b.appendChild(c); b.appendChild(em);
    b.onclick=()=>{ $('#word').value=item.w; variant=item.v||0; go(); };
    host.appendChild(b);
  });
}

/* ---------- 导出 ---------- */
function toCanvas(scale,bg){
  const c=document.createElement('canvas'); c.width=c.height=N*scale;
  const g=c.getContext('2d'); g.imageSmoothingEnabled=false;
  if(bg==='paper'){ g.fillStyle='#FFFFFF'; g.fillRect(0,0,c.width,c.height); }
  current.info.cells.forEach(p=>{ g.fillStyle=current.pal[p.ch]; g.fillRect(p.x*scale,p.y*scale,scale,scale); });
  return c;
}
function filename(){
  const a=(current.sp?current.sp.k:'').replace(/[^a-z0-9]/g,'');
  const ascii=current.word.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const stem=a||ascii||current.seed.toString(16).slice(0,6);
  return `pixeldex-${stem}-16x16.png`;
}
$('#dl').onclick=()=>{
  if(!current)return;
  toCanvas(+$('#scale').value,$('#bg').value).toBlob(b=>{
    const u=URL.createObjectURL(b),a=document.createElement('a');
    a.href=u;a.download=filename();a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);
  });
};
$('#cp').onclick=async()=>{
  if(!current)return;
  const btn=$('#cp'), old=btn.textContent;
  try{
    const blob=await new Promise(r=>toCanvas(+$('#scale').value,$('#bg').value).toBlob(r));
    await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
    btn.textContent='已复制';
  }catch(e){ btn.textContent='复制不了，请用下载'; }
  setTimeout(()=>btn.textContent=old,1600);
};

/* ---------- 交互 ---------- */
let variant=0;
function go(){
  const w=$('#word').value.trim();
  if(!w){ $('#note').textContent='先敲一个词，什么词都行。'; $('#word').focus(); return; }
  render(w,variant);
  const u=new URL(location.href); u.searchParams.set('w',w);
  if(variant)u.searchParams.set('v',variant); else u.searchParams.delete('v');
  history.replaceState(null,'',u);
}
$('#go').onclick=()=>{variant=0;go();};
$('#word').addEventListener('keydown',e=>{ if(e.key==='Enter'){variant=0;go();} });
$('#tGrid').onclick=e=>{
  const on=$('#frame').classList.toggle('grid');
  e.currentTarget.setAttribute('aria-pressed',String(on));
};
$('#tVar').onclick=()=>{
  if(!current)return;
  if(current.sp){ $('#note').innerHTML='<span class="tag">图鉴收录</span> 手绘图样只有这一版。「换一版」只对印记有效。'; return; }
  variant++; go();
};
const RANDOM=['深夜加班','多巴胺','早八','摸鱼','年终奖','焦虑','自由','算法','灵感','奶茶','离职','充电','倒计时','行情','萌芽','熬夜','面试','运气'];
$('#tRand').onclick=()=>{ $('#word').value=RANDOM[Math.floor(Math.random()*RANDOM.length)]; variant=0; go(); };

const CHIPS=['猫','深夜加班','早八','年终奖','焦虑','算法','自由','运气','摸鱼','offer','熬夜','赛博菩萨'];
$('#chips').innerHTML=CHIPS.map(c=>`<button class="chip-b">${c}</button>`).join('');
$('#chips').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  $('#word').value=b.textContent; variant=0; go();
});

$('#libn').textContent=LIB.length;
$('#count').textContent=LIB.length+' 词 · 16×16';
shelfDraw();

const q=new URLSearchParams(location.search);
const start=q.get('w')||['猫','火箭','蘑菇','幽灵','宝石'][Math.floor(Math.random()*5)];
variant=parseInt(q.get('v')||'0',10)||0;
$('#word').value=start;
render(start,variant);

