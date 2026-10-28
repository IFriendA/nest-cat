// 小貓的窩：遊戲核心（模擬、繪製、互動、介面）
import {clamp,lerp,rnd,pick,TAU,$,reduceMotion,DEV} from './utils.js';
import {COATS,NAMES,ARCH,TRAITS,BAD_PAIRS,STAGES,TASKS,BEH_LABEL,MIN_T,POSE,LERP_KEYS,MEM_TXT} from './data.js';
import {INK,PAPER,INKC,hsh,inkSeed,inkTick,jit,spath,lpath,ellPts,segPts,lineSeg,ink,inkL,box4,limbPts,torsoPts,earPts,headPts,INKW,inkPart,fillPart,offCv,offX} from './ink.js';
import {GUIDE} from './guide.js';

const cv=document.getElementById('nest'),stage=document.getElementById('stage');
let ctx=cv.getContext('2d');
let W=1000,H=600,DPR=1,cssW=1,cssH=1,PORTRAIT=false;
let FT=330,FB=590;
const floorY=y=>clamp(y,FT+14,FB);
const scaleAt=y=>0.66+0.48*clamp((y-FT)/(FB-FT),0,1);
let CATK=1.15; // overall cat size; larger in portrait so it reads on a phone

/* ================= world ================= */
const G={t:0,gmin:8*60,speed:10,tool:'hand',ptr:{x:-999,y:-999,in:false,down:false,speed:0,stillT:0,lx:null,ly:null,petCat:null,type:'mouse',downT:0,dx:0,dy:0,moved:0,grabBall:false,vx:0,vy:0,target:null},
 toy:{nodes:[],visible:false,speed:0,ax:0,ay:0,x:0,y:0},bug:null,bird:null,ball:{x:500,y:470,vx:0,vy:0,z:0,vz:0,spin:0},
 food:.7,water:.9,dirt:0,puddles:[],treats:3,
 door:{k:0,state:'open',until:0,knocks:[],snack:false,shake:0,paw:0},
 fx:{scratch:null,ripples:[],puffs:[],pours:[],bubbles:[],rake:0,trail:[],floaters:[],dust:[],heartT:0,dustT:0},
 care:{neglect:0,warn:0,streak:0,badToday:false},journal:[],cat:null,revoked:false,ff:false,L:{},lastInteract:-9999,lastDay:1,pokes:[]};
const hour=()=>((G.gmin/60)%24+24)%24;
const dayNo=()=>Math.floor(G.gmin/1440)+1;
const fmtT=g=>{const h=Math.floor((g/60)%24),m=Math.floor(g%60);return `第 ${Math.floor(g/1440)+1} 天 ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;};
const daypart=h=>h<5?'深夜':h<10?'早上':h<14?'中午':h<18?'下午':h<21?'傍晚':'晚上';

function layout(){const L=G.L;
  if(PORTRAIT){const fl=FB-FT;
    L.win={x:W*.64,y:Math.max(FT*.55,200),r:62};
    L.shelf={x:W*.24,y:Math.max(FT*.78,230)};
    L.box={x:W*.25,y:FT+118,w:112,h:44,d:32};
    L.litter={x:W*.78,y:FT+104,w:120,h:20,d:38};
    L.rug={x:W*.5,y:FT+fl*.5,rw:W*.42,rh:86};
    L.scr={x:W*.76,y:FT+fl*.62,w:96};
    L.bed={x:W*.27,y:FT+fl*.76,rx:88,ry:30};
    L.food={x:W*.62,y:FB-26};L.water={x:W*.83,y:FB-20};
    L.sun={x:L.win.x-24,y:FT+62};
  }else{
    L.win={x:W*.6,y:150,r:68};
    L.shelf={x:Math.min(W*.2,190),y:196};
    L.bed={x:Math.max(112,W*.16),y:500,rx:92,ry:32};
    L.box={x:Math.max(200,W*.36),y:402,w:118,h:46,d:34};
    L.scr={x:Math.max(95,W*.1),y:392,w:100};
    L.rug={x:W*.5,y:468,rw:Math.min(W*.3,300),rh:62};
    L.food={x:W*.755,y:526};L.water={x:W*.86,y:534};
    L.litter={x:W*.84,y:404,w:128,h:20,d:40};
    L.sun={x:L.win.x-36,y:462};}
  L.lights=[];const n=Math.max(6,Math.round(W/90));for(let i=0;i<n;i++){const q=(i+.5)/n;L.lights.push({x:40+q*(W-80),y:58+Math.sin(q*Math.PI*3)*7+Math.pow(Math.abs(q-.5)*2,2)*40,c:['#ffcf7a','#ff9e8a','#f9e3a1','#a7d8c9'][i%4]});}
  const b=G.ball;b.x=clamp(b.x,40,W-40);b.y=floorY(b.y);
}

/* ================= cat ================= */
class Cat{
  constructor(d){
    Object.assign(this,{name:d.name,coatId:d.coat,coat:COATS[d.coat],arch:d.arch,p:{...d.p},traits:d.traits,revealed:d.revealed||{},born:d.born,
      mem:d.mem||[],litter:d.litter||{skill:.35,ok:0},counts:Object.assign({petGood:0,play:0,pick:0,feeds:0,dayNaps:0,follow:0},d.counts||{}),tasks:d.tasks||{},feedHours:d.feedHours||new Array(24).fill(0),
      stageIdx:d.stageIdx||0,notes:d.notes||[],trustBase:d.trustBase||0});
    this.x=d.x||W*.4;this.y=d.y||480;this.vx=0;this.vy=0;this.speed=0;this.facing=1;this.face=1;this.phase=0;this.air=0;this.jump=null;
    this.pose={};this.pv={};for(const k in POSE){this.pose[k]=POSE[k];this.pv[k]=0;}this.pose.sit=1;
    this.yaw=.4;this.yawV=0;this.look={x:this.x,y:this.y-100};this.lookJ={x:0,y:0};this.lookJT=0;this.faceCam=false;
    this.tailA=new Array(10).fill(Math.PI+.3);this.tph=0;this.flickT=1;this.flick=0;
    this.beh='sit';this.behT=0;this.bd={};this.decideT=0;this.scores=[];
    this.attn={kind:'room',x:this.x,y:200,dwell:0};this.roomLook={x:this.x,y:200,t:0};
    this.blinkT=2;this.blink=0;this.slowBlink=0;this.earTw=[0,0];this.earTwT=2;
    this.petting=false;this.petRegion='back';this.aware=0;this.novelty=0;this.handWasIn=false;this.ignoreUntil=0;
    this.groomUrge=.1;this.habit=0;this.approachCD=0;this.playUrge=.3;this.glanceT=0;this.scratchUrge=.2;this.boredT=0;this.sound=null;this.eyeO=1;this.turnT=0;this.inside=false;this.held=false;this.heldT=0;this.squirm=0;
    this.m=d.m||{trust:clamp(.22+.45*d.p.soc+.15*d.p.bold,0,1),fear:0,annoy:0,play:.3,fatigue:.25,petBudget:3};
    this.nd=d.nd||{full:.7,hydra:.8,bladder:.2};
    this.lastSelfApproach=-99;this.calcStage();this.updateQ();this.skeleton();
  }
  save(){const k=['name','coatId','arch','p','traits','revealed','born','mem','litter','counts','tasks','feedHours','stageIdx','notes','trustBase','m','nd','x','y'];const o={};for(const x of k)o[x]=this[x];o.coat=this.coatId;return o;}
  has(t){return this.traits.includes(t);}
  reveal(t){if(!this.has(t)||this.revealed[t])return;this.revealed[t]=G.gmin;toast('發現性格',`${this.name}原來是「${TRAITS[t].n}」的貓。`);log(`發現${this.name}的性格：${TRAITS[t].n}`,true);uiDirty=true;}
  get ageDays(){return (G.gmin-this.born)/1440;}
  calcStage(){const a=this.ageDays;let s=0;for(let i=0;i<STAGES.length;i++)if(a>=STAGES[i].from)s=i;this.stage=s;
    const st=STAGES[s],f=clamp((a-st.from)/(st.to-st.from),0,1);
    this.size=s===0?lerp(.6,.72,f):s===1?lerp(.78,.93,f):1;this.headS=s===0?1.3:s===1?1.12:1;this.legS=s===0?.8:s===1?.93:1;}
  updateQ(){const p=this.p,s=this.stage,q={...p};
    if(s===0){q.energy=clamp(p.energy+.15,0,1);q.bold=clamp(p.bold+.12,0,1);q.tol=clamp(p.tol+.18,0,1);}
    if(s===3){q.energy*=.55;q.play*=.7;}
        if(this.has('clingy'))q.soc=Math.min(1,q.soc+.1);
    this.q=q;}
  petCap(){return (1.4+this.q.tol*9)*(this.stage===0?1.2:1);}
  get U(){return 40*this.S;}
  /* memory */
  remember(k,v,s=.6){const e=this.mem.find(e=>e.k===k);if(e){e.s=Math.min(1.4,e.s+s*.6);e.t=G.gmin;e.h=Math.floor(hour());}else this.mem.push({k,v,s,t:G.gmin,h:Math.floor(hour())});
    if(this.mem.length>40){this.mem.sort((a,b)=>b.s-a.s);this.mem.length=30;}uiDirty=true;}
  decayMem(gdt){for(const e of this.mem){const tau=(e.v<0?(this.has('grudge')?60:12):30)*60;e.s*=Math.exp(-gdt/tau);}this.mem=this.mem.filter(e=>e.s>.05);}
  grudge(){let g=0;for(const e of this.mem)if(e.v<0)g+=e.s*-e.v;return clamp(g*(this.has('grudge')?1.4:1),0,1);}
  warmth(){let g=0;for(const e of this.mem)if(e.v>0)g+=e.s*e.v;return clamp(g,0,1);}
  te(){return clamp(this.m.trust+this.trustBase+.2*this.warmth()-.55*this.grudge(),0,1);}
  meow(){if(G.ff)return;G.fx.bubbles.push({c:this,t:0,txt:pick(['喵','喵～','喵？','咪'])});this.kick({mouth:6});}
  setBeh(b){if(this.beh!==b){if((this.beh==='approach'||this.beh==='rub')&&b!=='rub'&&b!=='petted')this.approachCD=G.t+rnd(8,16)*(1.3-this.q.soc);this.beh=b;this.behT=0;this.bd={};}}
  wantDist(){const p=this.q;let w=lerp(4.4,.5,p.soc)*(1-.6*this.te())+.35;if(this.has('tsun'))w=Math.max(w,1.6);return w;}
  kick(o){for(const k in o)this.pv[k]+=o[k];}
  get asleep(){return this.beh==='nap'&&(this.bd.at||0)>2.4&&this.eyeO<.2;}

  hit(px,py,sl){const sk=this.sk,S=this.S,sx=this.sxs;if(!sk||this.inside)return false;
    const cx=this.x+((sk.Sx+sk.Hx)/2)*sx,cy=this.y-this.air+((sk.Sy+sk.Hy)/2)*S;
    const rx=50*S*sl,ry=30*S*sl,a=(px-cx)/rx,b=(py-cy)/ry;if(a*a+b*b<1)return true;return Math.hypot(px-this.head.x,py-this.head.y)<28*S*sl*this.headS;}
  region(px,py){if(Math.hypot(px-this.head.x,py-this.head.y)<26*this.S*this.headS)return 'head';const u=(px-this.x)/this.sxs;if(u>-22)return 'back';if(u>-42)return 'rear';return 'tail';}

  hear(x,y,loud=1){const p=this.q,d=Math.hypot(x-this.x,y-this.y)/this.U;this.sound={x,y,t:G.t};this.soundDone=false;this.kick({earUp:6});
    if(this.asleep){if(loud>.6&&d<5){this.bd.done=true;this.m.annoy+=.15;}return;}
    if(d<3.2){let f=(1-p.bold)*(1-d/3.2)*loud;if(this.has('curious'))f*=.6;this.m.fear+=f*.75;if(f>.3&&this.beh!=='flee'&&!this.held)this.setBeh('startle');else this.kick({crouch:3*(1-p.bold)});}}

  playTarget(){const k=this.attn.kind,S=this.S,U=this.U,h=this.head;
    if(k==='toy'&&G.tool==='wand'&&G.toy.visible){const t=G.toy;return {kind:'toy',x:t.x,y:t.y,gy:floorY(t.y+46*S),speed:t.speed,motion:clamp(t.speed/300,0,1.5),dist:Math.hypot(t.x-h.x,t.y-h.y)/U,reach:t.y>this.y-230*S};}
    if(k==='ball'){const b=G.ball,sp=Math.hypot(b.vx,b.vy);return {kind:'ball',x:b.x,y:b.y-b.z-8,gy:floorY(b.y),speed:sp,motion:clamp(sp/250,0,1.5),dist:Math.hypot(b.x-h.x,(b.y-10)-h.y)/U,reach:true};}
    if(k==='bug'&&G.bug&&G.bug.mode!=='leave'){const b=G.bug,landed=b.mode==='land';return {kind:'bug',x:b.x,y:b.y,gy:landed?floorY(b.y):floorY(b.y+46*S),speed:Math.hypot(b.vx,b.vy),motion:landed?.3:.8,dist:Math.hypot(b.x-h.x,b.y-h.y)/U,reach:landed||b.y>this.y-120*S};}
    if(k==='bird'&&G.bird){return {kind:'bird',x:G.bird.x,y:G.bird.y,gy:this.y,speed:100,motion:.6,dist:Math.hypot(G.bird.x-h.x,G.bird.y-h.y)/U,reach:false};}
    return null;}

  update(dt,gdt){
    const ptr=G.ptr,m=this.m,nd=this.nd;
    this.calcStage();this.updateQ();const p=this.q;
    this.S=scaleAt(this.y)*1.28*CATK*this.size;const S=this.S,U=40*S,head=this.head;
    /* needs (game time) */
    const kit=this.stage===0;
    nd.full=clamp(nd.full-gdt/(11*60)*(kit?1.25:1)*(this.has('greedy')?1.15:1),0,1);
    nd.hydra=clamp(nd.hydra-gdt/(9*60),0,1);
    if(this.beh!=='potty')nd.bladder=clamp(nd.bladder+gdt/((kit?6:8)*60),0,1.2);
    const h=hour(),night=this.has('night');
    const circ=night?((h>9&&h<17)?.25:(h>21||h<4)?-.15:0):((h>12&&h<15)||(h>0&&h<5)?.2:(h>5&&h<8)||(h>18&&h<21)?-.15:0);
    const asleep=this.asleep;
    m.fatigue=clamp(m.fatigue+(asleep?-gdt/(1.4*60):gdt/(30*60)*(kit?1.25:this.stage===3?1.4:1)*(1.6-p.energy)*(1+circ))+dt*this.speed/(160+160*p.energy)*.012,0,1);
    this.decayMem(gdt);
    if(this.inside){this.updateInside(dt,gdt);return;}
    /* perception */
    const handOn=(G.tool==='hand'||G.tool==='treat')&&ptr.in&&!G.ptr.grabBall;
    const hd=handOn?Math.hypot(ptr.x-head.x,ptr.y-head.y)/U:99;this.hd=hd;
    const lat=.15+(1-p.bold)*.8+(1-p.soc)*.5;
    if(handOn&&!this.handWasIn)this.novelty=1;this.handWasIn=handOn;this.novelty=Math.max(0,this.novelty-dt*.35);
    if(handOn)this.aware=Math.min(1.3,this.aware+dt/lat*(hd<9?1:.35)*(asleep?.05:1));else this.aware=Math.max(0,this.aware-dt*.5);
    /* touch */
    const pet=G.tool==='hand'&&ptr.down&&ptr.petCat===this&&!this.held&&this.hit(ptr.x,ptr.y,1.3)&&!['flee','startle','swat','door'].includes(this.beh);
    const petStart=pet&&!this.petting;this.petting=pet;
    if(pet){this.petRegion=this.region(ptr.x,ptr.y);G.lastInteract=G.gmin;}
    if(petStart){this.onPetStart();buzz(8);}
    if(this.petting&&!this.sleepPetOK){
      const stroke=clamp(ptr.speed/170,.2,1.2),reg=this.petRegion;
      const like=reg==='head'?1.15:reg==='back'?(.55+.6*p.soc):reg==='rear'?(p.energy>.7?.9:.15+.4*p.soc):-.6;
      const rough=clamp((ptr.speed-750)/700,0,1);
      if(reg==='tail'&&!this.bd.tailMem){this.bd.tailMem=1;this.remember('tail',-.3,.5);}
      if(like>0&&rough<.5){m.petBudget-=dt*stroke*(1.3-like*.4)*(1+rough*2);
        if(m.petBudget>0){m.trust=Math.min(1,m.trust+dt*.03*like);if(!this.bd.pg&&this.behT>1.2){this.bd.pg=1;this.event('petGood');}}}
      else{m.petBudget-=dt*2.2;m.annoy+=dt*.7;}
      if(m.petBudget<0){m.annoy+=dt*(.3+.45*(1-p.tol))*stroke;if(!this.bd.op&&m.annoy>.5){this.bd.op=1;this.remember('overpet',-.4,.6);}}
    }else if(!this.petting)m.petBudget=Math.min(this.petCap()*(.6+.6*this.te()),m.petBudget+dt*(.25+.45*p.tol));
    if(!this.petting)this.sleepPetOK=false;
    /* threat & mood */
    let threat=0;
    if(handOn&&!this.petting&&!this.held){const near=clamp(1-(hd-.8)/5,0,1),fast=clamp((ptr.speed-260)/900,0,1);threat=near*fast*(this.aware>.3?1:.4);}
    this.threat=threat;
    if(G.tool==='broom'&&ptr.down&&Math.hypot(ptr.x-this.x,ptr.y-this.y)<2.2*U)m.fear+=dt*.35*(1-p.bold);
    const fs=1;
    m.fear+=threat*dt*2.6*(1.35-p.bold)*fs;
    if(threat>.4&&!this.bd.scm){this.bd.scm=1;this.remember('scared',-.5,.5);}
    m.fear=Math.max(0,m.fear-dt*(.08+.35*p.bold)*(threat>.05?.15:1));
    m.trust=clamp(m.trust-threat*dt*.2*(1.25-p.bold),0,1);
    if(handOn&&hd<3.5&&threat<.03&&!this.petting&&m.fear<.2)m.trust=Math.min(1,m.trust+dt*(this.stage===0?.02:.012)*(.4+p.soc));
    if(!this.petting)m.annoy=Math.max(0,m.annoy-dt*.07);
    if(this.attn.kind==='toy'||this.attn.kind==='ball'){const T=this.playTarget();m.play=Math.min(1,m.play+dt*(T?T.motion:0)*.4*(.3+p.play));}
    else if(this.attn.kind==='bug'||this.attn.kind==='bird')m.play=Math.min(1,m.play+dt*.12*(.3+p.play));
    else m.play=Math.max(.1*p.play,m.play-dt*.04);
    if(m.fear<.15&&this.beh!=='groom')this.groomUrge+=gdt/(60*(this.has('tidy')?2:4));
    this.scratchUrge+=gdt/(60*5);this.playUrge=Math.min(1,this.playUrge+gdt/(60*12)*(.4+p.play));
    if(this.attn.kind==='ball'&&['stalk','pounce','bat','chase'].includes(this.beh)){this.ballT=(this.ballT||0)+dt;if(this.ballT>12+18*p.play){this.ballT=0;this.playUrge=0;this.ballCD=G.t+rnd(25,50);}}
    this.boredT=this.speed<5?this.boredT+dt:0;
    if(handOn&&!this.petting&&threat<.1&&p.soc<.4&&G.t>this.ignoreUntil&&Math.random()<dt*.18*(1-p.soc)*(1-this.te()))this.ignoreUntil=G.t+rnd(2,5);
    /* held */
    if(this.held){this.updateHeld(dt);return;}
    this.chooseAttention(dt,handOn,hd,threat);
    this.behT+=dt;this.decideT-=dt;
    if(this.decideT<=0){this.decide();this.decideT=.2;}
    const tp={...POSE};this.faceCam=false;this.arrived=false;
    this.run(dt,tp);
    this.overlay(dt,tp);
    this.locomote(dt);
    this.animate(dt,tp);
    this.skeleton();
  }

  onPetStart(){
    const p=this.q,m=this.m;
    if(this.asleep){
      const gentle=p.tol>.55&&!this.has('grudge')&&this.grudge()<.3;
      if(gentle){this.sleepPetOK=true;this.remember('petsleep',.25,.3);this.kick({earUp:3});this.slowBlink=1.1;
        if(this.stage===3)this.event('lap');if(this.stage===3&&this.bd.sunny)this.event('sun');return;}
      const knows=this.mem.some(e=>e.k==='woke'&&e.s>.12);
      this.remember('woke',-.7,.9);m.annoy+=.45;
      if(knows&&(this.has('grudge')||p.tol<.4)){this.reveal('grudge');this.setBeh('swat');log(`${this.name}還記得上次被吵醒，直接拍了你一下。`);}
      else{this.setBeh('wake');log(`${this.name}被你摸醒了。`);}
      return;}
    const th=.14+(1-p.bold)*.1;
    if(this.te()<th){m.fear+=.22+(1-p.bold)*.2;this.petting=false;G.ptr.petCat=null;this.lastReject=G.t;this.setBeh('startle');return;}
    if(this.grudge()>.45&&this.has('grudge')){m.annoy+=.35;this.reveal('grudge');}
    if(this.has('tsun')){const self=G.t-this.lastSelfApproach<12;m.petBudget*=self?1.5:.45;if(!self){m.annoy+=.25;if(m.annoy>.3)this.reveal('tsun');}}
    this.kick({crouch:3*(1-p.bold),earUp:-4*(1-p.bold)});m.fear+=.06*(1-p.bold);this.aware=1.2;
  }

  pickUp(){buzz(18);const p=this.q;this.held=true;this.heldT=0;this.squirm=0;this.setBeh('held');this.jump=null;this.counts.pick++;G.lastInteract=G.gmin;
    const tol=this.stage===0?.8:(p.tol*.6+this.te()*.6-.2);this.heldTol=clamp(tol,0,1)*6+.6;
    if(this.te()<.3){this.m.fear+=.4;}
    this.wasPottySeek=this.bd.pseek||this.pottyPending;}
  drop(px,py){this.held=false;this.air=0;const L=G.L.litter;this.x=clamp(px,45,W-45);this.y=floorY(py);
    const inLit=Math.abs(px-L.x)<L.w/2&&py>L.y-L.d-30&&py<L.y+16;
    if(inLit&&this.nd.bladder>.55){this.y=L.y-12;this.x=clamp(this.x,L.x-L.w/2+30,L.x+L.w/2-30);this.setBeh('potty');this.bd.phase='box';this.bd.helped=true;this.bd.t=0;return;}
    if(this.squirm>.7)this.setBeh('avoid');else this.setBeh('sit');this.kick({crouch:4});}
  updateHeld(dt){
    const ptr=G.ptr,p=this.q,S=this.S;this.heldT+=dt;
    if(this.heldT>this.heldTol)this.squirm=Math.min(1,this.squirm+dt*.8);
    this.x=clamp(ptr.x,45,W-45);this.y=floorY(ptr.y+70*S);this.air=Math.max(0,this.y-(ptr.y+46*S));
    const tp={...POSE};tp.stretch=.35;tp.crouch=-.25;tp.tailUp=-1.25;tp.tailCurl=.05;tp.tailAmp=.08+this.squirm*.5;tp.tailFreq=1+this.squirm*4;tp.earUp=.3-this.squirm*1.2;tp.headUp=.2;tp.eyeOpen=1;tp.pupil=.5+this.squirm*.4;
    if(this.squirm>.2){tp.paw=Math.abs(Math.sin(G.t*9))*this.squirm;tp.mouth=this.squirm>.6?.6:0;this.m.annoy+=dt*.25*this.squirm;}
    if(this.squirm>=1){this.remember('carried',-.3,.6);G.ptr.petCat=null;this.drop(this.x,this.y);this.m.annoy=Math.max(this.m.annoy,.5);this.kick({crouch:6});log(`${this.name}掙扎著跳下去了。`);return;}
    this.attn.x=ptr.x;this.attn.y=ptr.y+200;this.attn.kind='hand';
    this.animate(dt,tp);this.skeleton();}

  updateInside(dt,gdt){const nd=this.nd;
    if(nd.full<.4&&G.food>.05){const t=Math.min(G.food,gdt*.02);G.food-=t;nd.full+=t;}
    if(nd.hydra<.4&&G.water>.05){const t=Math.min(G.water,gdt*.02);G.water-=t;nd.hydra+=t;}
    if(nd.bladder>.95){nd.bladder=0;if(Math.random()<this.litter.skill)G.dirt++;else G.puddles.push({x:rnd(80,W-80),y:rnd(FT+40,FB-20),t:G.gmin});}
    this.m.annoy=Math.max(0,this.m.annoy-gdt*.004);}

  chooseAttention(dt,handOn,hd,threat){
    const ptr=G.ptr,p=this.q,m=this.m,U=this.U,head=this.head,c=[],te=this.te();
    {const eng=['approach','rub','petted','swat','treat'].includes(this.beh);if(this.attn.kind==='hand'&&!eng)this.habit=Math.min(1,this.habit+dt/(this.beh==='observe'?7:2.5+2.5*p.soc));else this.habit=Math.max(0,this.habit-dt*.12);this.habit=Math.max(0,this.habit-threat*dt*3-this.novelty*dt);}
    if(handOn){let s=(.3+clamp(ptr.speed/U/15,0,.6)+clamp(1-hd/6,0,1)*.5)*(.3+.7*(p.soc*.6+te*.4));
      if(G.tool==='treat')s+=.4+(this.has('greedy')?.5:0)+(1-this.nd.full)*.4;
      if(G.t<this.ignoreUntil)s*=.25;s*=(1-this.habit*.85);s+=threat*2+(this.petting?2.5:0)+this.novelty*.4*(1.3-p.bold);if(this.aware<.3)s*=.5;c.push(['hand',s,ptr.x,ptr.y]);}
    if(G.tool==='wand'&&G.toy.visible){const t=G.toy,td=Math.hypot(t.x-head.x,t.y-head.y)/U,mo=clamp(t.speed/300,0,1.5);
      c.push(['toy',(.3+mo*1.4)*(.35+p.play*.6+m.play*.5)*clamp(1.4-td/12,.2,1.2)+(['stalk','pounce','bat'].includes(this.beh)?.6:0),t.x,t.y]);}
    {const b=G.ball,mo=clamp(Math.hypot(b.vx,b.vy)/250,0,1.5),bd=Math.hypot(b.x-this.x,b.y-this.y)/U;
      c.push(['ball',(G.t<(this.ballCD||0)?.2:1)*(.04+mo*1.1)*(.3+p.play*.6+m.play*.5)*clamp(1.3-bd/12,.2,1.2)+(['stalk','pounce','bat','chase'].includes(this.beh)&&this.attn.kind==='ball'?.6:0)+(this.boredT>6&&p.play>.5?.25:0)+(this.playUrge>.35?.6:0),b.x,b.y-10]);}
    if(G.bug&&G.bug.mode!=='leave'){const b=G.bug,bd=Math.hypot(b.x-head.x,b.y-head.y)/U;c.push(['bug',(.5+p.play*.55)*clamp(1.3-bd/14,.3,1)+(this.beh==='stalk'?.5:0),b.x,b.y]);}
    if(G.bird)c.push(['bird',.45+p.play*.35,G.bird.x,G.bird.y]);
    if(G.ftreat)c.push(['treat',1.3+(this.has('greedy')?.5:0),G.ftreat.x,G.ftreat.y]);
    if(this.sound&&G.t-this.sound.t<2.5)c.push(['sound',1.5*(1-(G.t-this.sound.t)/2.5),this.sound.x,this.sound.y]);
    this.roomLook.t-=dt;
    if(this.roomLook.t<=0){this.roomLook.t=rnd(1.4,5)/(.5+p.energy);const r=Math.random(),L=G.L;
      if(r<.25){this.roomLook.x=L.win.x+rnd(-40,40);this.roomLook.y=L.win.y+rnd(-30,30);}else if(r<.4){this.roomLook.x=L.food.x;this.roomLook.y=L.food.y;}
      else{this.roomLook.x=clamp(this.x+rnd(-320,320),20,W-20);this.roomLook.y=rnd(140,FB);}}
    c.push(['room',.28,this.roomLook.x,this.roomLook.y]);
    const a=this.attn;a.dwell+=dt;let best=null,bv=-1,cur=null;
    for(const e of c){let v=e[1];if(e[0]===a.kind){v+=.25;cur=e;}if(v>bv){bv=v;best=e;}}
    const minDwell=.45+(1-p.energy)*1.1;
    if(best[0]!==a.kind&&(a.dwell>minDwell||!cur||best[1]>(cur?cur[1]:0)+.6)){a.kind=best[0];a.dwell=0;cur=best;}
    if(!cur)cur=best;a.x=cur[2];a.y=cur[3];}

  decide(){
    const p=this.q,m=this.m,nd=this.nd,ptr=G.ptr,b=this.beh,te=this.te();
    if({startle:1,pounce:1,swat:1,bat:1,door:1,wake:1,stumble:1,held:1}[b])return;
    if(b==='potty'&&!this.bd.done)return;
    if(this.petting&&!this.sleepPetOK&&b!=='flee'){this.setBeh('petted');return;}
    const handOn=(G.tool==='hand'||G.tool==='treat')&&ptr.in,aware=this.aware>=1,hd=this.hd,want=this.wantDist(),calm=m.fear<.25;
    const sad=G.care.warn>0,h=hour();
    const sc={};
    sc.sit=.18;
    sc.wander=(.1+(1-m.fatigue)*.24*p.energy+clamp(this.boredT/25,0,.22))*(sad?.4:1);
    if(calm&&!sad){sc.explore=.15+(this.has('curious')?.15:0)+p.bold*.08+clamp(this.boredT/20,0,.15);sc.stretch=G.t-(this.lastStretch||-99)>45?.11:0;
      if((this.stage<=1||p.play>.7)&&m.fatigue<.55)sc.tailchase=.06+p.play*.12;sc.window=daylight()>.3?.09+(G.bird?.45:0):.04;if(m.fatigue>.3)sc.loaf=.12+m.fatigue*.1;}
    if(calm)sc.groom=clamp(this.groomUrge,0,.6);
    if(calm)sc.scratch=clamp(this.scratchUrge-.6,0,.5);
    if(calm){const sleepy=m.fatigue+(this.stage===0?.08:0);sc.nap=(sleepy-.62)*1.7;if(b==='nap'&&!this.bd.done)sc.nap=Math.max(sc.nap,.7);}
    const hungry=1-nd.full,thirsty=1-nd.hydra;
    if(hungry>.35&&G.food>.04)sc.eat=hungry*1.25+(this.has('greedy')?.3:0);
    if(hungry>.45&&G.food<=.04)sc.beg=hungry*.95+(this.has('greedy')?.3:0);
    const fh=this.feedHabit();if(fh!==null&&Math.abs(fh-h)<1.2&&G.food<=.04&&hungry>.25)sc.beg=Math.max(sc.beg||0,.6);
    if(thirsty>.4&&G.water>.04)sc.drink=thirsty*1.15;
    if(nd.bladder>.78)sc.potty=.9+(nd.bladder-.78)*3;
    if(this.has('boxy')&&calm)sc.hide=.12+(this.boredT>5?.15:0)+(b==='hide'?.25:0);
    if(m.fear>.25&&(this.has('boxy')||p.bold<.3))sc.hide=Math.max(sc.hide||0,.5+m.fear);
    if(handOn&&aware){
      const stillNeed=this.has('clingy')?.5:1+(1-p.bold)*2.4*(1-te);
      const tsunOK=!this.has('tsun')||ptr.stillT>3;
      if(hd>want+.7&&ptr.stillT>stillNeed&&tsunOK&&G.t>this.approachCD)sc.approach=(.2+(1-m.fatigue)*.2+p.soc*.4)*(.25+te)*(G.t<this.ignoreUntil?.15:1)*(this.has('clingy')?1.6:1);
      if(hd<want*.7)sc.avoid=(1-hd/(want*.7))*(1.25-te)*.95+.15+(this.has('tsun')&&ptr.speed>40?.4:0);
      sc.observe=(this.novelty*.7+(1-p.bold)*(1-te)*.8+(ptr.speed>140?.25:0))*clamp(1.3-hd/8,0,1);
      if(hd<2.8&&ptr.stillT>1&&G.t>this.approachCD&&te>.5+(1-p.bold)*.22&&p.soc>.45&&!this.has('tsun'))sc.rub=.35+p.soc*.5;
    }
    if(b==='petted'&&!this.petting){sc.sit=.4;if(m.annoy>.3)sc.avoid=Math.max(sc.avoid||0,.5+m.annoy);if(m.petBudget>0&&p.soc>.6)sc.knead=.45;}
    if(m.annoy>.5)sc.avoid=Math.max(sc.avoid||0,m.annoy*.95);
    if(m.fear>.42||(b==='flee'&&m.fear>.22))sc.flee=.6+m.fear;
    if(m.fear>.18&&m.fear<=.42)sc.observe=Math.max(sc.observe||0,.45+m.fear);
    const T=this.playTarget();
    if(T&&!sad){const pa=(.25+p.play*.7+m.play*.5)*(1-m.fatigue*.4);
      if(T.reach&&calm){if(T.motion>.05||b==='stalk'||(T.kind==='ball'&&this.boredT>6))sc.stalk=pa*(T.dist<10?1:.5)*(T.kind==='bug'?1.1:1);
        if(T.speed>200&&T.dist>3.2)sc.chase=pa*p.energy*1.15;}
      if(T.kind!=='ball'||T.motion>.05)sc.watch=(.3+.25*(1-p.play))*clamp(1.2-T.dist/12,.25,1)*(T.motion>.02||T.kind==='bug'||T.kind==='bird'?1:.4);}
    if(G.ftreat&&m.fear<.5)sc.treat=(te<.3?.75:1.15)+(this.has('greedy')?.4:0);
    if(this.playUrge>.35&&calm&&!sad&&!G.ftreat&&this.attn.kind==='ball')sc.stalk=Math.max(sc.stalk||0,.45+this.playUrge*.5);
    if(this.sound&&G.t-this.sound.t<3.5&&calm&&!this.soundDone)sc.investigate=.25+p.bold*.45+p.play*.2+(this.has('curious')?.35:0);
    if(p.energy>.65&&m.fatigue<.35&&calm&&!sad&&Math.random()<.003*p.play*(this.has('night')&&(h>20||h<4)?3:1))sc.zoom=1.3;
    if(b==='zoom'&&!this.bd.done)sc.zoom=1;
    if(b==='proud'&&!this.bd.done)sc.proud=.9;
    if(b==='greet'&&!this.bd.done)sc.greet=1;
    if(b==='knead'&&!this.bd.done)sc.knead=Math.max(sc.knead||0,.6);
    if(m.annoy>.8&&(this.grudge()>.25||m.annoy>.95)&&G.door.state==='open'&&!this.held)sc.door=1.8;
    if(this.asleep){for(const k of ['eat','drink','beg','wander','groom','scratch','stalk','watch','investigate','approach'])if(sc[k]!==undefined)sc[k]*=.45;}
    if(sc[b]!==undefined)sc[b]+=.15;
    if(this.bd.done)delete sc[b];
    const arr=Object.entries(sc).sort((a,b)=>b[1]-a[1]);this.scores=arr.slice(0,5);
    const best=arr.length?arr[0][0]:'sit';
    if(best===b)return;
    if(sc[b]!==undefined&&this.behT<(MIN_T[b]||.8)&&best!=='flee'&&best!=='potty')return;
    this.setBeh(best);}

  feedHabit(){let best=-1,bi=null;for(let i=0;i<24;i++){const c=this.feedHours[i]+.5*(this.feedHours[(i+1)%24]+this.feedHours[(i+23)%24]);if(c>best){best=c;bi=i;}}return best>=2?bi+.5:null;}
  faceTo(x){if(Math.abs(x-this.x)>14*this.S)this.facing=Math.sign(x-this.x);}

  event(k){
    const s=this.stage,T=this.tasks,done=id=>{const key=s+':'+id;if(T[key])return;const def=TASKS[s].find(t=>t[0]===id);if(!def)return;T[key]=G.gmin;toast('成長',`${this.name}：${def[1]}`);log(`成長紀錄：${def[1]}`,true);uiDirty=true;};
    switch(k){
      case 'petGood':this.counts.petGood++;this.remember('petgood',.3,.4);if(s===0)done('pet');break;
      case 'finishBowl':if(s===0)done('bowl');break;
      case 'playHit':this.counts.play++;this.playUrge=Math.max(0,this.playUrge-.2);this.remember('play',.3,.35);if(s===0)done('toy');if(s===1&&this.counts.play-(this.counts.play1||0)>=5)done('play5');if(s===3)done('still');break;
      case 'approach':if(s===1)done('approach');break;
      case 'sleepNear':if(s===1)done('sleepnear');break;
      case 'scratch':if(s===1)done('scratch');break;
      case 'blink':if(s>=2)done('blink');break;
      case 'rub':if(s>=2)done('rub');break;
      case 'knead':if(s>=2)done('knead');break;
      case 'litter':if(s===0)done('litter');break;
      case 'care3':if(s===2)done('care3');break;
      case 'sun':if(s===3)done('sun');break;
      case 'lap':if(s===3)done('lap');break;
    }}

  run(dt,tp){
    const b=this.beh,bd=this.bd,p=this.q,m=this.m,nd=this.nd,ptr=G.ptr,S=this.S,U=40*S,A=this.attn,head=this.head,L=G.L;
    const sadF=G.care.warn>0?.7:1;
    const walk=(42+50*p.energy)*sadF,runS=(165+165*p.energy)*sadF;this.mv=null;
    const handGY=floorY(ptr.y+52*S);
    switch(b){
    case 'sit':{tp.sit=1;tp.tailUp=-.3;tp.tailCurl=-.17;tp.tailAmp=.05+.08*p.energy;tp.tailFreq=.6;tp.earUp=.45;tp.headUp=.25+.2*(1-p.soc);
      if(A.kind!=='room')tp.tipFlick=.4;
      if(this.has('tsun')&&bd.back===undefined&&G.t-this.lastSelfApproach<3)bd.back=true;
      if(bd.back){this.facing=Math.sign(this.x-ptr.x)||1;if(ptr.in&&this.hd<4)this.reveal('tsun');}else this.stationaryTurn(dt);break;}
    case 'wander':{
      if(bd.tx===undefined){let n=0;do{bd.tx=rnd(70,W-70);bd.ty=rnd(FT+25,FB-10);n++;}while(Math.abs(bd.tx-this.x)<120&&n<6);}
      this.mv={x:bd.tx,y:bd.ty,spd:walk*(.6+.2*p.energy),r:10*S};
      tp.tailUp=.4+.7*p.soc;tp.tailCurl=.07;tp.tailAmp=.1;tp.tailFreq=1;tp.earUp=.5;tp.headUp=.05;
      if(this.stage===0&&this.speed>80&&Math.random()<dt*.15){this.setBeh('stumble');return;}
      if(Math.hypot(bd.tx-this.x,bd.ty-this.y)<14*S)bd.done=true;break;}
    case 'observe':{const hes=(1-p.bold)*(1-this.te()*.7);
      tp.crouch=.15+.65*hes+m.fear*.3;tp.sit=p.bold>.6&&m.fear<.1?.8:0;tp.earUp=1;tp.eyeOpen=1.05;tp.pupil=.5+.3*hes;
      tp.headUp=-.35*tp.crouch+.1;tp.headFwd=.25*hes;tp.tailUp=-.1-.3*hes;tp.tailCurl=.02;tp.tailAmp=.04;tp.tipFlick=.8;
      bd.tilt=(bd.tilt||0)-dt;if(bd.tilt<=0){bd.tilt=rnd(1,3);bd.tv=Math.random()<.5?rnd(-.3,.3):0;}tp.headTilt=bd.tv||0;tp.headFwd+=Math.sin(G.t*2.4)*.12*hes;
      this.faceTo(A.x);break;}
    case 'approach':{const hes=(1-p.bold)*(1-this.te()*.8);const side=Math.sign(this.x-ptr.x)||-this.facing;
      let tx=ptr.x+side*(this.wantDist()*U+44*S),ty=handGY;
      if(p.soc<.35){bd.lat=bd.lat||(Math.random()<.5?-1:1);ty=floorY(ty+bd.lat*U*1.1);}
      if(hes>.32){bd.gt=(bd.gt??0)-dt;if(bd.gt<=0){bd.go=!bd.go;bd.gt=bd.go?rnd(.35,.8)*(1.25-hes):rnd(.5,1.4)*hes*1.7;}}else bd.go=true;
      if(bd.go)this.mv={x:tx,y:ty,spd:walk*(.55+.6*p.soc)*(1-hes*.45)*(this.has('clingy')?1.3:1),r:8*S};
      tp.crouch=hes*.6;tp.headUp=.2*p.soc-hes*.45;tp.headFwd=hes*.55;tp.earUp=.85;
      tp.tailUp=lerp(-.15,1.58,clamp(p.soc*.85+this.te()*.25-hes*.7,0,1));tp.tailCurl=p.soc>.7?.14:.05;tp.tailAmp=.05+.08*p.energy;tp.tailFreq=1.2;
      if(p.soc>.7){tp.tailFreq=6;tp.tailAmp=.035;}
      if(!bd.go){tp.paw=hes>.55?.55:0;tp.tipFlick=.6;}
      if(!bd.go||Math.abs(tx-this.x)<10*S)this.faceTo(ptr.x);
      if(Math.abs(tx-this.x)<14*S&&Math.abs(ty-this.y)<14*S&&!bd.arr){bd.arr=1;this.lastSelfApproach=G.t;this.event('approach');if(this.has('clingy')&&this.counts.follow>2)this.reveal('clingy');this.counts.follow=(this.counts.follow||0)+1;if(this.has('tsun')){this.setBeh('sit');this.bd.back=true;}}
      break;}
    case 'avoid':{
      if(bd.tx===undefined||Math.random()<dt*.5){const away=Math.sign(this.x-ptr.x)||1;let tx=this.x+away*U*3.2;
        if(tx<60||tx>W-60){tx=clamp(this.x-away*U*3.2,60,W-60);bd.ty=floorY(ptr.y>FB-130?FT+40:FB-20);}else bd.ty=floorY(this.y+(Math.sign(this.y-handGY)||1)*U*1.2);bd.tx=clamp(tx,60,W-60);}
      this.mv={x:bd.tx,y:bd.ty,spd:walk*(.75+m.fear*1.5+m.annoy*.3),r:10*S};
      tp.earUp=-.2-.5*m.annoy;tp.tailUp=p.soc<.35?.75:-.15;tp.tailAmp=.15+.45*m.annoy;tp.tailFreq=1.3+2.5*m.annoy;tp.headUp=p.soc<.35?.35:0;
      if(this.grudge()>.4&&this.has('grudge')&&ptr.in)this.reveal('grudge');
      if(Math.hypot(bd.tx-this.x,bd.ty-this.y)<16*S){bd.done=true;this.faceTo(ptr.x);}break;}
    case 'flee':{
      if(bd.tx===undefined){const from=ptr.in?ptr.x:(this.sound?this.sound.x:this.x);bd.tx=from<W/2?W-70:70;bd.ty=rnd(FT+30,FT+110);}
      const d=Math.hypot(bd.tx-this.x,bd.ty-this.y);
      if(d>20*S)this.mv={x:bd.tx,y:bd.ty,spd:runS*1.05,r:12*S};else{this.faceTo(ptr.in?ptr.x:W/2);tp.crouch=.85;}
      tp.crouch=Math.max(tp.crouch,.45);tp.earUp=-1;tp.tailUp=-.65;tp.pupil=1;tp.headUp=-.2;break;}
    case 'rub':{
      if(bd.side===undefined)bd.side=Math.sign(this.x-ptr.x)||1;
      if(!bd.pass){const tx=ptr.x+bd.side*42*S;this.mv={x:tx,y:handGY,spd:walk*(.75+.3*p.energy),r:5*S};
        if(Math.abs(tx-this.x)<18*S)this.facing=-bd.side;
        if(this.hd<1.25){bd.rt=(bd.rt||0)+dt;tp.lean=.5+Math.sin(G.t*3)*.5;tp.headTilt=-bd.side*this.facing*(.25+Math.sin(G.t*2.6)*.25);
          tp.eyeOpen=.35;tp.purr=1;tp.headFwd=.6;tp.headUp=-.05+Math.sin(G.t*3)*.15;this.lastSelfApproach=G.t;
          if(!bd.ev&&bd.rt>.8){bd.ev=1;this.event('rub');m.trust=Math.min(1,m.trust+.02);}
          if(bd.rt>(bd.rlen||(bd.rlen=rnd(1.3,2.6)))){bd.pass=true;bd.px=clamp(ptr.x-bd.side*U*1.7,60,W-60);}}}
      else{this.mv={x:bd.px,y:handGY,spd:walk*.65,r:7*S};tp.lean=.4;tp.purr=.8;if(Math.abs(this.x-bd.px)<12*S){bd.pass=false;bd.side=-bd.side;bd.rt=0;bd.rlen=rnd(1.2,2.4);}}
      tp.tailUp=1.52;tp.tailCurl=.15;tp.tailAmp=.035;tp.tailFreq=6;tp.earUp=.3;
      if(this.hd>3.4||!ptr.in)bd.done=true;break;}
    case 'petted':{const content=m.petBudget>0&&m.annoy<.35,reg=this.petRegion;
      if(content){tp.eyeOpen=.32-.2*p.soc;tp.purr=.55+.45*p.soc;tp.earUp=.1;
        tp.headUp=reg==='head'?.45:.1;tp.headTilt=reg==='head'?Math.sin(G.t*1.4)*.3*(.5+p.soc):.08;tp.lean=reg==='head'?.6:-.1;
        tp.sit=p.soc>.6?0:.6;if(p.soc>.8&&this.behT>4.5){tp.lie=.85;tp.sit=0;}
        if(reg==='rear')tp.rearUp=p.energy>.6||p.soc>.8?1:.3;if(reg==='back')tp.arch=.15;
        tp.tailUp=.8+.65*p.soc;tp.tailAmp=.05;tp.tailFreq=1;
        if(!this.petting){tp.purr*=.6;tp.eyeOpen=.6;}
        if(Math.random()<dt*.25*p.soc&&this.slowBlink<=0){this.slowBlink=1.1;this.event('blink');}}
      else{tp.earUp=-.45-.5*m.annoy;tp.eyeOpen=.85;tp.purr=0;tp.tailUp=.1;tp.tailAmp=.3+.5*m.annoy;tp.tailFreq=2.5+3*m.annoy;tp.crouch=.2;
        tp.lean=Math.sin(G.t*31)*.2*m.annoy;tp.headTilt=-.15;
        if(m.annoy>.72&&this.petting&&!bd.sw){bd.sw=true;this.setBeh('swat');return;}}
      break;}
    case 'swat':{this.faceTo(ptr.x);const k=this.behT/.55;tp.paw=Math.sin(clamp(k,0,1)*Math.PI)*1.15;tp.earUp=-1;tp.crouch=.35;tp.mouth=p.tol<.4?.9:.3;tp.tailAmp=.5;tp.tailFreq=4;tp.pupil=.8;
      if(this.behT>.15&&this.behT<.3){ptr.petCat=null;this.petting=false;}
      if(this.behT>.6){m.annoy=Math.max(m.annoy,.55);this.setBeh('avoid');}break;}
    case 'stalk':{const T=this.playTarget();if(!T){bd.done=true;break;}
      const side=Math.sign(this.x-T.x)||-this.facing,want=2.2;
      if(T.dist>3.0||Math.abs(T.gy-this.y)>34*S){const off=want*U+40*S;const tx=Math.abs(this.x-T.x)>off?T.x+side*off:this.x;if(tx===this.x)this.faceTo(T.x);
        this.mv={x:clamp(tx,45,W-45),y:T.gy,spd:walk*(.45+.4*p.energy),r:8*S};bd.wig=0;}
      else{this.faceTo(T.x);bd.wig=(bd.wig||0)+dt;tp.wiggle=1;if(bd.wl===undefined)bd.wl=rnd(.2,.5)+(1-p.energy)*.7+(1-p.play)*.4;
        if(bd.wig>bd.wl&&(T.motion>.08||T.kind!=='toy'||bd.wig>bd.wl+1.5)){this.startPounce(T);return;}}
      tp.crouch=.95;tp.headUp=-.75;tp.headFwd=.75;tp.tailUp=-.25;tp.tailAmp=.18;tp.tailFreq=2.2;tp.tipFlick=1;tp.pupil=1;tp.earUp=1;break;}
    case 'pounce':{tp.stretch=1;tp.paw=1;tp.earUp=1;tp.tailUp=.15;tp.pupil=1;tp.headUp=-.1;tp.headFwd=.6;if(!this.jump)this.land();break;}
    case 'bat':{{const b=G.ball;if(this.attn.kind==='ball'&&!bd.hit&&this.behT>.15&&Math.hypot(b.x-(this.x+this.facing*34*S),b.y-this.y)<34*S){bd.hit=1;b.vx+=this.facing*rnd(140,260);b.vy+=rnd(-60,60);b.vz=rnd(40,100);}}tp.paw=Math.abs(Math.sin(this.behT*11))*.9;tp.crouch=.55;tp.pupil=1;tp.earUp=1;tp.tailAmp=.25;tp.tailFreq=3;tp.headUp=-.4;tp.headFwd=.5;
      if(this.behT>.8)this.setBeh(this.attn.kind==='toy'||this.attn.kind==='ball'?'stalk':'sit');break;}
    case 'chase':{const T=this.playTarget();if(!T){bd.done=true;break;}const side=Math.sign(this.x-T.x)||-this.facing;
      this.mv={x:clamp(T.x+side*2.2*U,45,W-45),y:T.gy,spd:runS,r:10*S};tp.crouch=.25;tp.earUp=1;tp.tailUp=.5;tp.pupil=1;tp.headFwd=.4;if(T.dist<3.2)this.setBeh('stalk');break;}
    case 'watch':{const T=this.playTarget();if(!T){bd.done=true;break;}
      tp.sit=p.play>.5?.3:1;tp.crouch=p.play>.5?.5:0;tp.earUp=1;tp.pupil=.7+.3*p.play;tp.tipFlick=1;tp.tailUp=-.2;tp.tailCurl=-.1;tp.tailAmp=.06;tp.headUp=T.kind==='bird'?.9:.2;
      if((T.kind==='bug'&&T.dist<6)||T.kind==='bird')tp.mouth=Math.abs(Math.sin(G.t*24))*.45;
      this.faceTo(T.x);break;}
    case 'investigate':{const s=this.sound;if(!s){bd.done=true;break;}const tx=clamp(s.x+(Math.sign(this.x-s.x)||1)*40*S,45,W-45);
      if(Math.hypot(tx-this.x,s.y-this.y)>14*S&&!bd.at)this.mv={x:tx,y:floorY(s.y),spd:walk*(.55+.4*p.bold),r:8*S};
      else{bd.at=(bd.at||0)+dt;this.faceTo(s.x);tp.headUp=-.75;tp.headFwd=.7;tp.crouch=.3;if(bd.at>1.8){bd.done=true;this.soundDone=true;if(this.has('curious')&&p.bold<.5)this.reveal('curious');}}
      tp.earUp=1;tp.tailUp=.55;tp.tailCurl=.14;tp.tailAmp=.05;break;}
    case 'groom':{bd.len=bd.len||rnd(3,5.5);tp.sit=1;tp.lick=1;tp.headUp=-.25;tp.eyeOpen=.45;tp.headTilt=.18;tp.earUp=.25;tp.tailUp=-.3;tp.tailCurl=-.17;tp.tailAmp=.03;
      tp.mouth=Math.max(0,Math.sin(G.t*9))*.4;if(this.behT>bd.len){bd.done=true;this.groomUrge=0;if(this.has('tidy')&&Math.random()<.3)this.reveal('tidy');}break;}
    case 'nap':{
      if(!bd.spot){const h=hour(),day=h>7&&h<17;let spot={x:L.bed.x+rnd(-20,20),y:L.bed.y-4,k:'bed'};
        if(this.has('sunny')&&day)spot={x:L.sun.x+rnd(-30,30),y:floorY(L.sun.y+rnd(-10,10)),k:'sun'};
        else if(this.has('boxy')||(p.bold<.3&&Math.random()<.4))spot={x:L.box.x+rnd(-15,15),y:L.box.y-12,k:'box'};
        else if(day&&Math.random()<.25)spot={x:L.sun.x+rnd(-30,30),y:floorY(L.sun.y+rnd(-10,10)),k:'sun'};
        else if(Math.random()<.15)spot={x:this.x,y:this.y,k:'here'};bd.spot=spot;bd.sunny=spot.k==='sun';}
      const d=Math.hypot(bd.spot.x-this.x,bd.spot.y-this.y);
      if(d>14*S&&!bd.at){this.mv={x:bd.spot.x,y:bd.spot.y,spd:walk*.55,r:10*S};tp.earUp=.2;tp.headUp=-.1;tp.tailUp=.1;}
      else{bd.at=(bd.at||0)+dt;tp.lie=1;tp.headUp=-.55;tp.eyeOpen=Math.max(0,1-bd.at/2.2);tp.earUp=0;tp.tailUp=-.2;tp.tailCurl=-.21;tp.tailAmp=.02;tp.tailFreq=.4;tp.crouch=Math.sin(G.t*1.6)*.04;
        if(bd.spot.k==='box')tp.lie=.7;
        if(this.sleepPetOK){tp.purr=.6;tp.eyeOpen=.08;}
        if(bd.at>2.5&&!bd.ev){bd.ev=1;if(ptr.in||G.gmin-G.lastInteract<90)this.event('sleepNear');
          if(bd.spot.k==='sun'&&this.has('sunny'))this.reveal('sunny');if(bd.spot.k==='box'&&this.has('boxy'))this.reveal('boxy');
          if(this.has('night')&&hour()>9&&hour()<16&&this.counts.dayNaps++>1)this.reveal('night');}
        if(bd.at>3&&this.aware>1.1&&this.hd<2.4&&ptr.speed>260){m.fatigue-=.15;m.annoy+=.15;bd.done=true;}
        if(m.fatigue<.06)bd.done=true;}
      break;}
    case 'zoom':{if(bd.n===undefined){bd.n=0;bd.tx=null;}
      if(!bd.tx||Math.hypot(bd.tx-this.x,bd.ty-this.y)<20*S){bd.n++;if(bd.n>3){bd.done=true;if(this.has('night')&&(hour()>20||hour()<4))this.reveal('night');break;}bd.tx=this.x<W/2?rnd(W*.65,W-60):rnd(60,W*.35);bd.ty=rnd(FT+25,FB-10);}
      this.mv={x:bd.tx,y:bd.ty,spd:runS*1.15,r:12*S};tp.earUp=-.3;tp.tailUp=.9;tp.puff=.35;tp.pupil=1;tp.crouch=.2;m.fatigue+=dt*.01;
      if(this.stage===0&&Math.random()<dt*.25){this.setBeh('stumble');return;}break;}
    case 'startle':{if(!bd.j){bd.j=true;this.jump={t:0,dur:.32,sx:this.x,sy:this.y,ex:clamp(this.x-this.facing*16*S,50,W-50),ey:this.y,h:(16+26*(1-p.bold))*S};}
      tp.arch=1;tp.puff=1;tp.earUp=-1;tp.pupil=1;tp.tailUp=.6;tp.mouth=p.bold<.4?.8:.2;if(this.behT>.75)this.setBeh(m.fear>.42?(this.has('boxy')||p.bold<.3?'hide':'flee'):'observe');break;}
    case 'explore':{if(!bd.tg){const opts=[[L.bed.x+50,L.bed.y+6],[L.box.x+70,L.box.y+8],[L.scr.x-40,L.scr.y-4],[L.food.x-60,L.food.y-4],[L.litter.x-80,L.litter.y+10],[L.win.x,FT+40],[Math.min(W*.2,190),FT+30],[rnd(80,W-80),rnd(FT+30,H-30)]];const o=pick(opts);bd.tg={x:clamp(o[0],50,W-50),y:floorY(o[1])};}
      if(!bd.at&&Math.hypot(bd.tg.x-this.x,bd.tg.y-this.y)>12*S){this.mv={x:bd.tg.x,y:bd.tg.y,spd:walk*.75,r:8*S};tp.tailUp=.6+.5*p.soc;tp.tailCurl=.1;tp.earUp=.7;tp.headUp=-.1;}
      else{bd.at=(bd.at||0)+dt;tp.headUp=-.8;tp.headFwd=.6+Math.sin(G.t*6)*.15;tp.crouch=.25;tp.earUp=.9;tp.tailUp=.5;if(!bd.mw&&bd.at>1&&Math.random()<.25){bd.mw=1;this.meow();}if(bd.at>1.8)bd.done=true;}break;}
    case 'stretch':{const a=this.behT<1.3,y=this.behT>1.4&&this.behT<2.2;tp.stretch=a?1:0;tp.crouch=a?.35:0;tp.rearUp=a?.8:0;tp.headUp=a?-.3:.4;tp.mouth=y?1:0;tp.eyeOpen=y?.2:.9;tp.tailUp=.8;if(this.behT>2.6){bd.done=true;this.lastStretch=G.t;}break;}
    case 'tailchase':{bd.ft=(bd.ft??.3)-dt;if(bd.ft<=0){bd.ft=rnd(.22,.38);this.facing*=-1;this.kick({crouch:2});}tp.crouch=.55;tp.pupil=1;tp.earUp=.8;tp.tailUp=.4;tp.tailAmp=.5;tp.tailFreq=4;tp.headFwd=.3;tp.headUp=-.3;
      if(this.behT>2.6){bd.done=true;if(this.stage===0&&Math.random()<.5){this.setBeh('stumble');return;}}break;}
    case 'window':{if(!bd.tg)bd.tg={x:clamp(L.win.x+rnd(-40,40),50,W-50),y:FT+28};
      if(!bd.at&&Math.hypot(bd.tg.x-this.x,bd.tg.y-this.y)>12*S){this.mv={x:bd.tg.x,y:bd.tg.y,spd:walk*.8,r:8*S};tp.tailUp=.6;}
      else{bd.at=(bd.at||0)+dt;tp.sit=1;tp.headUp=1;tp.earUp=1;tp.tailUp=-.2;tp.tailCurl=-.1;tp.tipFlick=.8;this.attn.x=G.bird?G.bird.x:L.win.x+Math.sin(G.t*.7)*30;this.attn.y=G.bird?G.bird.y:L.win.y;if(G.bird)tp.mouth=Math.abs(Math.sin(G.t*24))*.45;if(bd.at>5)bd.done=true;}break;}
    case 'loaf':{tp.lie=.9;tp.headUp=.15;tp.eyeOpen=.55;tp.earUp=.3;tp.tailUp=-.2;tp.tailCurl=-.18;tp.tailAmp=.03;if(Math.random()<dt*.15&&this.slowBlink<=0)this.slowBlink=1.1;if(this.behT>6)bd.done=true;break;}
    case 'proud':{tp.sit=1;tp.headUp=.7;tp.eyeOpen=.6;tp.tailUp=1.4;tp.tailCurl=.12;tp.earUp=.6;if(this.behT>2.2)bd.done=true;break;}
    case 'eat':case 'drink':{const B=b==='eat'?L.food:L.water;const tx=B.x-48*S,ty=floorY(B.y-3);
      if(Math.hypot(tx-this.x,ty-this.y)>10*S&&!bd.at){this.mv={x:tx,y:ty,spd:walk*(b==='eat'&&this.has('greedy')?1.7:1),r:6*S};tp.tailUp=.9;tp.tailCurl=.1;
        if(b==='eat'&&this.has('greedy')&&this.speed>120&&G.t-(this.lastFill||-9)<4)this.reveal('greedy');}
      else{bd.at=(bd.at||0)+dt;this.facing=1;tp.headUp=-1;tp.headFwd=.9;tp.crouch=.45;tp.mouth=Math.max(0,Math.sin(G.t*(b==='eat'?11:16)))*.35;tp.tailUp=.15;tp.earUp=.5;tp.tailCurl=-.05;
        if(b==='eat'){const t=Math.min(G.food,dt*(this.has('greedy')?.2:.13));G.food-=t;nd.full=Math.min(1,nd.full+t*1.15);if(nd.full>.97||G.food<=.005){bd.done=true;if(nd.full>.9)this.event('finishBowl');}}
        else{const t=Math.min(G.water,dt*.12);G.water-=t;nd.hydra=Math.min(1,nd.hydra+t*1.3);if(nd.hydra>.97||G.water<=.005)bd.done=true;}}
      break;}
    case 'beg':{const B=L.food,tx=B.x-60*S;if(Math.hypot(tx-this.x,B.y-6-this.y)>14*S&&!bd.at)this.mv={x:tx,y:floorY(B.y-6),spd:walk*1.1,r:8*S};
      else{bd.at=(bd.at||0)+dt;tp.sit=1;tp.headUp=.5;tp.earUp=.6;tp.tailUp=.2;tp.tailCurl=-.1;tp.tipFlick=.6;this.faceCam=true;
        bd.mt=(bd.mt??.5)-dt;if(bd.mt<=0){bd.mt=rnd(1.6,3.4)/(this.has('greedy')?1.6:1);this.meow();if(this.has('greedy')&&(bd.mc=(bd.mc||0)+1)>2)this.reveal('greedy');}}
      if(G.food>.04)bd.done=true;break;}
    case 'potty':{this.potty(dt,tp,walk);break;}
    case 'hide':{const B=L.box,tx=B.x+(bd.ox??(bd.ox=rnd(-20,20))),ty=B.y-12;
      if(Math.hypot(tx-this.x,ty-this.y)>8*S&&!bd.at)this.mv={x:tx,y:ty,spd:walk*(m.fear>.3?2:1),r:5*S};
      else{bd.at=(bd.at||0)+dt;this.x=lerp(this.x,tx,dt*4);this.y=lerp(this.y,ty,dt*4);tp.crouch=.8;tp.sit=.3;tp.headUp=-.2;tp.earUp=m.fear>.3?-.3:.8;tp.pupil=.7;tp.tailAmp=.02;this.faceTo(ptr.in?ptr.x:W/2);
        if(bd.at>6&&m.fear<.15)bd.done=true;if(this.has('boxy')&&bd.at>3)this.reveal('boxy');}break;}
    case 'scratch':{const B=L.scr,tx=B.x-34*S,ty=floorY(B.y-4);
      if(Math.hypot(tx-this.x,ty-this.y)>10*S&&!bd.at)this.mv={x:tx,y:ty,spd:walk,r:6*S};
      else{bd.at=(bd.at||0)+dt;this.facing=1;tp.stretch=1;tp.paw=Math.abs(Math.sin(G.t*9))*.55;tp.headUp=.2;tp.tailUp=.9;tp.earUp=.6;tp.crouch=.1;
        if(bd.at>2.8){bd.done=true;this.scratchUrge=0;this.event('scratch');}}break;}
    case 'knead':{tp.sit=.1;tp.lie=.35;tp.knead=1;tp.eyeOpen=.25;tp.purr=1;tp.earUp=.2;tp.tailUp=.3;tp.headUp=.2;if(this.behT>1.5&&!bd.ev){bd.ev=1;this.event('knead');}if(this.behT>4.5)bd.done=true;break;}
    case 'greet':{const tx=clamp(W/2+(bd.ox??(bd.ox=rnd(-80,80))),60,W-60),ty=FB-24;
      if(p.soc<.35){tp.sit=1;this.faceCam=Math.random()<.2;tp.headUp=.4;if(this.behT>1.2)bd.done=true;break;}
      if(Math.hypot(tx-this.x,ty-this.y)>16*S&&!bd.at){this.mv={x:tx,y:ty,spd:walk*(1+p.soc*.5),r:10*S};tp.tailUp=1.5;tp.tailFreq=6;tp.tailAmp=.04;}
      else{bd.at=(bd.at||0)+dt;this.faceCam=true;tp.sit=.8;tp.tailUp=1.4;tp.headUp=.5;tp.earUp=.8;if(!bd.mw){bd.mw=1;this.meow();}if(bd.at>2.4)bd.done=true;}break;}
    case 'door':{const tx=W/2,ty=FB-16;
      if(Math.hypot(tx-this.x,ty-this.y)>18*S&&!bd.at){this.mv={x:tx,y:ty,spd:walk*1.1,r:12*S};tp.earUp=-.6;tp.tailUp=.4;tp.tailAmp=.4;tp.tailFreq=3;}
      else{bd.at=(bd.at||0)+dt;this.faceCam=true;tp.sit=1;tp.earUp=-.8;tp.headUp=.5;tp.eyeOpen=.75;tp.tailAmp=.4;tp.tailFreq=3;if(bd.at>1&&!bd.closed){bd.closed=1;closeDoor(this);}}break;}
    case 'stumble':{tp.lie=.7;tp.headTilt=.5;tp.earUp=.2;tp.eyeOpen=1;if(this.behT>.8)this.setBeh('sit');break;}
    case 'wake':{tp.stretch=this.behT<1?1:0;tp.mouth=this.behT>.2&&this.behT<1.1?1:0;tp.eyeOpen=.6;tp.earUp=-.3;tp.tailAmp=.3;tp.tailFreq=2;
      if(this.behT>1.6){if(this.q.tol>.55&&!this.has('grudge'))this.setBeh('nap');else{m.annoy=Math.max(m.annoy,.45);this.setBeh('avoid');}}break;}
    case 'treat':{const ft=G.ftreat;if(!ft){bd.done=true;break;}
      const side=Math.sign(this.x-ft.x)||-this.facing,tx=clamp(ft.x+side*44*S,45,W-45),ty=floorY(ft.y-2),hdT=Math.hypot(this.head.x-ft.x,(this.head.y+20*S)-ft.y);
      if(!bd.eat&&(Math.abs(tx-this.x)>8*S||Math.abs(ty-this.y)>8*S)&&hdT>26*S){this.mv={x:tx,y:ty,spd:walk*(this.has('greedy')?1.7:1)*(.6+this.te()*.6),r:5*S};tp.tailUp=lerp(0,1.3,this.te());tp.earUp=.9;tp.crouch=(1-this.te())*.5;tp.headFwd=.4;}
      else{this.faceTo(ft.x);bd.eat=(bd.eat||0)+dt;tp.headUp=-1;tp.headFwd=.9;tp.crouch=.45;tp.mouth=Math.max(0,Math.sin(G.t*12))*.4;
        if(bd.eat>.9){G.ftreat=null;G.lastInteract=G.gmin;this.nd.full=Math.min(1,this.nd.full+.08);m.trust=Math.min(1,m.trust+.05);this.remember('treat',.4,.6);G.fx.puffs.push({x:ft.x,y:ft.y-4,t:0,crumb:1});
          if(this.has('greedy'))this.reveal('greedy');
          if(this.te()<.4){m.fear+=.25;this.setBeh('flee');log(`${this.name}叼走零食就跑。`);}else{this.setBeh('sit');this.kick({purr:4});if(this.q.soc>.5)this.slowBlink=1.1;log(`${this.name}吃掉了零食。`);}}}
      break;}
    }
  }

  potty(dt,tp,walk){
    const bd=this.bd,nd=this.nd,L=G.L.litter,S=this.S;
    if(!bd.phase){bd.phase='seek';bd.t=0;this.pottyPending=true;
      const dirty=G.dirt>=3&&this.has('tidy')||G.dirt>=6;const willBox=!dirty&&Math.random()<this.litter.skill;bd.plan=willBox?'box':'floor';if(dirty&&this.has('tidy'))bd.refuse=true;}
    bd.t+=dt;
    if(bd.phase==='seek'){tp.headUp=-.85;tp.headFwd=.6;tp.crouch=.3;tp.tailUp=1;tp.tailAmp=.08;tp.earUp=.4;
      bd.ct=(bd.ct??.6)-dt;if(bd.ct<=0){bd.ct=rnd(.5,.9);this.facing*=-1;this.mv=null;}
      this.mv={x:clamp(this.x+this.facing*30*S,45,W-45),y:this.y,spd:28,r:2};
      if(bd.t>(bd.plan==='box'?1.5:3.6)){bd.phase=bd.plan==='box'?'go':'squatF';bd.t=0;if(bd.refuse){this.reveal('tidy');log(`貓砂盆太髒了，${this.name}不肯進去。`);}}}
    else if(bd.phase==='go'){const tx=clamp(L.x+rnd(-1,1),L.x-30,L.x+30),ty=L.y-12;this.mv={x:tx,y:ty,spd:walk,r:6*S};tp.tailUp=.6;if(Math.hypot(tx-this.x,ty-this.y)<10*S){bd.phase='box';bd.t=0;}}
    else if(bd.phase==='box'){this.x=lerp(this.x,clamp(this.x,L.x-L.w/2+30,L.x+L.w/2-30),dt*4);tp.sit=.55;tp.crouch=.6;tp.tailUp=.5;tp.tailCurl=0;tp.headUp=.1;tp.eyeOpen=.7;tp.earUp=.2;
      if(bd.t>2.6){tp.paw=Math.abs(Math.sin(G.t*12))*.4;}
      if(bd.t>3.6){nd.bladder=0;G.dirt=Math.min(8,G.dirt+1);this.pottyPending=false;this.litter.ok++;
        const gain=bd.helped?.3:.15;this.litter.skill=clamp(this.litter.skill+gain,0,1);
        if(bd.helped){this.remember('helped',.25,.5);this.m.trust=Math.min(1,this.m.trust+.04);log(`你把${this.name}抱進貓砂盆，牠在裡面上了廁所。`);}
        if(this.litter.skill>=.8&&this.stage===0)this.event('litter');bd.done=true;}}
    else if(bd.phase==='squatF'){tp.sit=.55;tp.crouch=.6;tp.tailUp=.5;tp.eyeOpen=.7;
      if(bd.t>2.8){nd.bladder=0;this.pottyPending=false;G.puddles.push({x:this.x-this.facing*18*S,y:this.y+2,t:G.gmin,s:S});log(`${this.name}尿在外面了。`);if((this.counts.pud=(this.counts.pud||0)+1)<=2)toast('地上髒了','選「清潔」在水漬上抹一下。下次牠低頭繞圈時，長按抱進貓砂盆。');bd.done=true;
        if(this.has('tidy'))this.m.annoy+=.2;}}}

  stationaryTurn(dt){const A=this.attn;if(A.kind==='room'&&Math.random()>dt*.3)return;
    if(Math.sign(A.x-this.x)!==this.facing&&Math.abs(A.x-this.x)>80*this.S){this.turnT+=dt;if(this.turnT>.8+(1-this.q.energy)*1.2){this.faceTo(A.x);this.turnT=0;}}else this.turnT=0;}
  startPounce(T){const p=this.q,S=this.S,side=Math.sign(this.x-T.x)||-this.facing;
    const ex=clamp(T.x+side*36*S,50,W-50),ey=T.gy,dist=Math.hypot(ex-this.x,ey-this.y)/this.U;
    this.setBeh('pounce');this.facing=-side;const lift=T.kind==='toy'?Math.max(0,(this.y-48*S)-T.y)*.6:0;
    this.jump={t:0,dur:.3+dist*.045,sx:this.x,sy:this.y,ex,ey,h:(22+30*p.energy)*S+lift};this.kick({crouch:-6,stretch:5});}
  land(){const m=this.m,head=this.head,U=this.U;m.fatigue=Math.min(1,m.fatigue+.02);this.kick({crouch:5});
    if(G.bug&&G.bug.mode!=='leave'&&Math.hypot(G.bug.x-head.x,G.bug.y-head.y)<1.4*U&&(G.bug.mode==='land'||Math.random()<.45)){
      G.bug=null;m.play=Math.max(0,m.play-.3);G.fx.puffs.push({x:head.x+this.facing*10,y:head.y+10,t:0});this.event('playHit');log(`${this.name}抓到一隻小蟲。`);this.setBeh('proud');return;}
    if(G.bug&&G.bug.mode!=='leave'&&Math.hypot(G.bug.x-head.x,G.bug.y-head.y)<2.5*U){G.bug.mode='fly';G.bug.vy=-200;G.bug.vx=rnd(-150,150);}
    if(G.tool==='wand'&&G.toy.visible&&Math.hypot(G.toy.x-head.x,G.toy.y-head.y)<1.8*U){
      const n=G.toy.nodes[G.toy.nodes.length-1];n.ox=n.x-this.facing*rnd(6,14);n.oy=n.y+rnd(4,10);m.play=Math.max(0,m.play-.08);this.event('playHit');this.setBeh('bat');return;}
    const b=G.ball;if(Math.hypot(b.x-(this.x+this.facing*30*this.S),b.y-this.y)<1.6*U){b.vx+=this.facing*rnd(160,320);b.vy+=rnd(-80,80);b.vz=rnd(60,140);m.play=Math.max(0,m.play-.06);this.event('playHit');this.setBeh('bat');return;}
    this.setBeh('sit');}

  overlay(dt,tp){const p=this.q,m=this.m,f=clamp(m.fear,0,1);
    if(f>.12){tp.earUp=Math.min(tp.earUp,.6-1.6*f);tp.pupil=Math.max(tp.pupil,.5+.5*f);tp.crouch=Math.max(tp.crouch,f*.6);
      tp.puff=Math.max(tp.puff,(f-.45)*1.7);if(f>.62&&this.speed<25)tp.arch=Math.max(tp.arch,(f-.62)*2.4);tp.tailUp=lerp(tp.tailUp,-.75,f);tp.purr=0;}
    if(m.annoy>.2&&this.beh!=='petted'){tp.earUp=Math.min(tp.earUp,.45-1.2*m.annoy);tp.tailAmp=Math.max(tp.tailAmp,.1+.3*m.annoy);tp.tailFreq=Math.max(tp.tailFreq,2+2*m.annoy);}
    const k=this.attn.kind;if(k==='toy'||k==='bug'||k==='ball')tp.pupil=Math.max(tp.pupil,.55+.45*m.play);
    if(this.hd<4&&G.ptr.in&&G.tool==='hand'&&this.beh!=='petted')tp.crouch+=(1-p.bold)*(1-this.te())*.25;
    if(this.chinOn){tp.headUp+=.6;tp.eyeOpen=Math.min(tp.eyeOpen,.28);tp.purr=Math.max(tp.purr,.85);tp.earUp+=.25;tp.crouch=0;}
    if(G.care.warn>0){tp.earUp-=.45;tp.tailUp-=.5;tp.eyeOpen=Math.min(tp.eyeOpen,.75);tp.headUp-=.3;}
    tp.headUp+=.15*(1-p.soc)*(1-tp.crouch);tp.tailAmp*=(.6+.7*p.energy);tp.headTilt*=(.6+.8*p.play);}

  locomote(dt){const S=this.S,p=this.q;let tvx=0,tvy=0;
    if(this.jump){const j=this.jump;j.t+=dt;const k=clamp(j.t/j.dur,0,1);this.x=lerp(j.sx,j.ex,k);this.y=lerp(j.sy,j.ey,k);this.air=Math.sin(Math.PI*k)*j.h;this.vx=(j.ex-j.sx)/j.dur;this.vy=0;this.speed=0;
      if(k>=1){this.jump=null;this.air=0;this.vx=0;}return;}
    if(this.mv){const dx=this.mv.x-this.x,dy=this.mv.y-this.y,d=Math.hypot(dx,dy*1.3);
      if(d>(this.mv.r||6)){const sp=this.mv.spd*S*clamp(d/(34*S),.3,1);tvx=dx/d*sp;tvy=dy/d*sp*.7;if(Math.abs(dx)>6*S)this.facing=Math.sign(dx);}else this.arrived=true;}
    const acc=(260+950*p.energy)*S*(1+this.m.fear),ax=tvx-this.vx,ay=tvy-this.vy,al=Math.hypot(ax,ay),mx=acc*dt;
    if(al>mx){this.vx+=ax/al*mx;this.vy+=ay/al*mx;}else{this.vx=tvx;this.vy=tvy;}
    this.x=clamp(this.x+this.vx*dt,45,W-45);this.y=floorY(this.y+this.vy*dt);this.speed=Math.hypot(this.vx,this.vy)/S;
    if(Math.abs(this.vx)>18*S)this.facing=Math.sign(this.vx);this.phase+=this.speed/36*dt*TAU*.5/this.legS;}

  animate(dt,tp){const p=this.q,P=this.pose,V=this.pv;
    if(G.ff){for(const k in POSE)P[k]=tp[k];this.face=this.facing;this.eyeO=P.eyeOpen;return;}
    const k=(32+115*p.energy)*(1+this.m.fear*.8),c=2*Math.sqrt(k)*(1.22-.5*p.play);
    for(const key in POSE){if(LERP_KEYS[key]){P[key]+=(tp[key]-P[key])*Math.min(1,dt*LERP_KEYS[key]);continue;}V[key]+=((tp[key]-P[key])*k-V[key]*c)*dt;P[key]+=V[key]*dt;}
    this.lookJT-=dt;if(this.lookJT<=0){this.lookJT=rnd(.25,1.4)/(.5+p.play);const a=24*(.4+p.play);this.lookJ.x=rnd(-a,a);this.lookJ.y=rnd(-a,a)*.6;}
    const lr=Math.min(1,dt*(5+11*p.energy));this.glanceT-=dt;if(this.attn.kind==='hand'&&!['approach','rub','petted','treat','swat'].includes(this.beh)&&this.glanceT<=0&&Math.random()<dt*.35){this.glanceT=rnd(.8,2);this.roomLook.x=clamp(this.x+rnd(-300,300),20,W-20);this.roomLook.y=rnd(150,H-30);}
    const lgx=this.glanceT>0?this.roomLook.x:this.attn.x,lgy=this.glanceT>0?this.roomLook.y:this.attn.y;
    this.look.x+=(lgx+this.lookJ.x-this.look.x)*lr;this.look.y+=(lgy+this.lookJ.y-this.look.y)*lr;
    const sg=Math.sign(this.face)||1,S=this.S;let yt=clamp(sg*.42+(this.look.x-this.head.x)/(95*S)*.85,-1,1);
    if(this.faceCam)yt=0;if(this.beh==='nap'&&this.bd.at)yt=sg*.25;
    const ky=50+90*p.energy;this.yawV+=((yt-this.yaw)*ky-this.yawV*2*Math.sqrt(ky)*.9)*dt;this.yaw=clamp(this.yaw+this.yawV*dt,-1.1,1.1);
    this.pup=this.faceCam?{x:0,y:.2}:{x:clamp((this.look.x-this.head.x)/(130*S),-1,1),y:clamp((this.look.y-this.head.y)/(130*S),-1,1)};
    this.face+=(this.facing-this.face)*Math.min(1,dt*(5+9*p.energy));
    this.blinkT-=dt;if(this.blinkT<=0){this.blink=.15;this.blinkT=rnd(2,6)*(1.4-p.energy*.5);}
    let close=0;if(this.blink>0){this.blink-=dt;close=Math.sin(Math.PI*clamp(1-this.blink/.15,0,1));}
    let sb=1;if(this.slowBlink>0){this.slowBlink-=dt;sb=1-Math.sin(Math.PI*clamp(1-this.slowBlink/1.1,0,1))*.95;}
    if((this.beh==='approach'||this.beh==='sit')&&this.hd<4&&p.soc>.55&&this.te()>.6&&this.slowBlink<=0&&Math.random()<dt*.08){this.slowBlink=1.1;this.event('blink');}
    this.eyeO=clamp(P.eyeOpen,0,1.1)*(1-close)*sb;
    this.earTwT-=dt;if(this.earTwT<=0){this.earTwT=rnd(1.5,5)/(.6+p.energy);this.earTw[Math.random()<.5?0:1]=-.9;}
    this.earTw[0]*=Math.exp(-dt*7);this.earTw[1]*=Math.exp(-dt*7);
    this.tph+=dt*P.tailFreq*TAU;this.flickT-=dt;if(this.flickT<=0){this.flickT=rnd(.4,2.2)/(.3+P.tipFlick+.3*p.energy);if(P.tipFlick>.1||Math.random()<.3)this.flick=1;}
    this.flick*=Math.exp(-dt*6);
    const N=this.tailA.length;let a=Math.PI+P.tailUp;
    for(let i=0;i<N;i++){const q=i/N;a+=(i?P.tailCurl:0)+P.tailAmp*Math.sin(this.tph-i*.55)*(.25+q)*.5;const tgt=a+(i>N-4?this.flick*Math.sin(G.t*30)*.35*(i-N+4):0);
      this.tailA[i]+=(tgt-this.tailA[i])*Math.min(1,dt*(18-i*1.3));}}

  skeleton(){const P=this.pose,t=G.t,S=this.S||scaleAt(this.y)*1.28*CATK*this.size;this.S=S;
    const crouch=clamp(P.crouch,-.3,1.2),sit=clamp(P.sit,0,1),lie=clamp(P.lie,0,1),arch=clamp(P.arch,0,1.2);
    const run=clamp((this.speed-90)/150,0,1),mov=clamp(this.speed/60,0,1),bob=Math.sin(this.phase*2)*(1+3*run)*mov;
    const L=30*this.legS;
    const hf=Math.max(5,L*(1-.45*crouch-.83*lie)+4+5*sit*(1-lie)+7*arch-2*P.stretch);
    const hb=Math.max(4,L*(1-.5*crouch-.8*sit-.83*lie)+4+8*arch+P.wiggle*(3+Math.sin(t*19)*2.5)+P.rearUp*9-2*P.stretch);
    const lean=P.lean*5+(P.knead>.1?Math.sin(t*5)*1.2:0);const bl=this.stage===0?.86:1;
    const Sx=(24-4*sit+P.stretch*8)*bl+lean,Sy=-(hf+14)+bob*.6,Hx=(-26+12*sit*(1-lie)-P.stretch*6)*bl+lean*.5,Hy=-(hb+14)+bob*.35;
    const hx=Sx+13+11*P.headFwd-3*sit+lean*.4,hy=Sy-19-11*P.headUp+6*lie+bob*.3+P.lick*7-(this.headS-1)*8;
    this.sk={hf,hb,Sx,Sy,Hx,Hy,hx,hy,sit,lie,run,mov,crouch,arch};
    const sg=Math.sign(this.face)||1;this.sxs=sg*(.3+.7*Math.abs(this.face))*S;this.head={x:this.x+hx*this.sxs,y:this.y-this.air+hy*S};}

  /* drawing (hand-drawn ink) */
  legPts(l,amp,lift){const P=this.pose,sk=this.sk,ph=this.phase+l.o*TAU;
    let px=l.base+Math.sin(ph)*amp,py=-Math.max(0,Math.cos(ph))*lift;
    if(l.front&&!l.far){if(P.paw>.02){px+=P.paw*14;py-=P.paw*22;}if(P.lick>.02){px=lerp(px,sk.hx+2,P.lick);py=lerp(py,sk.hy+14,P.lick);}}
    if(l.front&&P.knead>.1)py-=Math.max(0,Math.sin(G.t*5+(l.far?Math.PI:0)))*6*P.knead;
    if(l.front&&P.stretch>.1){px+=P.stretch*10;py-=P.stretch*6;}if(!l.front&&P.stretch>.1)px-=P.stretch*10;
    if(this.held){py+=8;px+=l.front?-2:2;}
    return limbPts(l.j,[px,py-2],(l.front?22:24.5)*this.legS,l.front?1:-1);}
  draw(){if(this.inside)return;
    const P=this.pose,S=this.S,sk=this.sk,ic=INKC[this.coatId]||INKC.cream,t=G.t,sg=Math.sign(this.face)||1,vx=DPR*cssW/W,vy=DPR*cssH/H;
    ctx.setTransform(vx,0,0,vy,0,0);
    ctx.fillStyle='rgba(44,39,35,.13)';ctx.beginPath();ctx.ellipse(this.x,this.y,Math.max(8,(46-this.air*.12))*S,Math.max(3,(7-this.air*.03))*S,0,0,TAU);ctx.fill();
    const pj=P.purr>.05?Math.sin(t*95)*.45*P.purr:0;
    let base=new DOMMatrix([vx,0,0,vy,0,0]).translate(this.x,this.y-this.air+pj);
    if(this.held)base=base.rotate((Math.sin(t*11)*.12*this.squirm+.05*sg)*180/Math.PI);
    base=base.scale(this.sxs,S);
    const {Sx,Sy,Hx,Hy,hx,hy,sit,lie,run,mov}=sk,arch=clamp(P.arch,0,1.2);
    const headM=base.translate(hx,hy).scale(sg*this.headS,this.headS).rotate(P.headTilt*sg*180/Math.PI);
    const off=[0,.5,.75,.25].map((v,i)=>lerp(v,[0,.1,.5,.6][i],run)),amp=mov*(9+9*run)*(1-lie)*this.legS,lift=(5+6*run)*mov;
    const legW=this.stage===0?.88:1;
    const far=[],main=[];
    if(lie<.6){far.push({k:'line',pts:this.legPts({j:[Sx-7,Sy+5],base:Sx-5,o:off[1],front:true,far:true},amp,lift),w:8.5*legW,m:base,sd:11});
      far.push({k:'line',pts:this.legPts({j:[Hx-3,Hy+5],base:Hx+2+16*sit,o:off[3],front:false,far:true},amp,lift),w:10*legW,m:base,sd:12});}
    {const N=this.tailA.length,seg=5.6*(this.stage===0?.8:1);let x=Hx-12,y=Hy-5;const C=[[x,y]];
      for(let i=0;i<N;i++){x+=Math.cos(this.tailA[i])*seg;y+=Math.sin(this.tailA[i])*seg;if(!this.held)y=Math.min(-3,y);C.push([x,y]);}
      const puff=1+clamp(P.puff,0,1)*1.4,Lp=[],Rp=[];
      for(let i=0;i<C.length;i++){const a=this.tailA[Math.min(i,N-1)],w=(6.8-2.6*i/N)*puff*.5,nx=-Math.sin(a),ny=Math.cos(a);Lp.push([C[i][0]+nx*w,C[i][1]+ny*w]);Rp.push([C[i][0]-nx*w,C[i][1]-ny*w]);}
      const tip=C.at(-1),pv=C.at(-2),tw=4.1*puff*.5+.6,ta=Math.atan2(tip[1]-pv[1],tip[0]-pv[0]),cap=[];for(let k=1;k<6;k++){const a=ta+Math.PI/2-k/6*Math.PI;cap.push([tip[0]+Math.cos(a)*tw,tip[1]+Math.sin(a)*tw]);}
      main.push({k:'poly',pts:Lp.concat(cap.reverse(),Rp.reverse()),m:base,sd:2});}
    main.push({k:'poly',pts:torsoPts(sk),m:base,sd:3});
    main.push({k:'poly',pts:ellPts(Hx+2*sit,Hy+2*sit,15+8*sit,15+6*sit,22),m:base,sd:4});
    if(lie<.6){main.push({k:'line',pts:this.legPts({j:[Hx+2,Hy+6],base:Hx+6+18*sit,o:off[2],front:false,far:false},amp,lift),w:10*legW,m:base,sd:5});
      main.push({k:'line',pts:this.legPts({j:[Sx-2,Sy+6],base:Sx,o:off[0],front:true,far:false},amp,lift),w:8.5*legW,m:base,sd:6});}
    else{const kn=P.knead>.1;[[Sx+6,0],[Sx+14,1]].forEach(([x,i])=>{const up=kn?Math.max(0,Math.sin(t*5+i*Math.PI))*5:0;main.push({k:'poly',pts:ellPts(x,-4-up,7,4.5,12),m:base,sd:7+i});});}
    main.push({k:'line',pts:[[Sx-1,Sy+2],[(Sx+hx)/2,(Sy+hy)/2+4],[hx-2,hy+6+(this.headS-1)*8]],w:21,m:base,sd:9});
    const yaw=this.yaw;
    main.push({k:'poly',pts:earPts(-1,yaw,P.earUp+this.earTw[0],this.stage===0),m:headM,sd:13});
    main.push({k:'poly',pts:earPts(1,yaw,P.earUp+this.earTw[1],this.stage===0),m:headM,sd:14});
    main.push({k:'poly',pts:headPts(yaw),m:headM,sd:15});
    for(const p of far){inkPart(ctx,p,1);fillPart(ctx,p,ic.far);}
    for(const p of main)inkPart(ctx,p,1);
    offX.setTransform(1,0,0,1,0,0);offX.clearRect(0,0,offCv.width,offCv.height);for(const p of main)fillPart(offX,p,ic.fill);
    offX.globalCompositeOperation='source-atop';
    offX.setTransform(base);const ang=Math.atan2(Sy-Hy,Sx-Hx),nx=Math.sin(ang),ny=-Math.cos(ang);
    if(ic.wash){offX.fillStyle=ic.wash;for(const [x,y,rx,ry] of [[(Sx+Hx)/2,(Sy+Hy)/2-8,26,12],[Hx-4,Hy-6,14,12],[Hx-34,Hy-30,40,26]]){offX.beginPath();offX.ellipse(x,y,rx,ry,0,0,TAU);offX.fill();}}
    if(ic.chest){offX.fillStyle=ic.chest;offX.beginPath();offX.ellipse(Sx+8,Sy+6,10,13,-.25,0,TAU);offX.fill();offX.beginPath();offX.ellipse((Sx+Hx)/2,(Sy+Hy)/2+12,22,7,ang,0,TAU);offX.fill();}
    if(ic.stripe){offX.strokeStyle=ic.stripe;offX.lineWidth=2.6;offX.lineCap='round';for(let i=0;i<4;i++){const q=.2+i*.2,px=lerp(Hx,Sx,q)+nx*18,py=lerp(Hy,Sy,q)+ny*18;spath(offX,jit([[px,py],[px-nx*9,py-ny*9],[px-nx*15-Math.cos(ang)*2,py-ny*15-Math.sin(ang)*2]],30+i,.5),false);offX.stroke();}}
    offX.setTransform(headM);
    if(ic.wash){offX.fillStyle=ic.wash;offX.beginPath();offX.ellipse(-8+yaw*4,-10,15,9,0,0,TAU);offX.fill();}
    if(ic.muzzle){offX.fillStyle=ic.muzzle;offX.beginPath();offX.ellipse(yaw*9-3.5,9,7.5,6.5,0,0,TAU);offX.ellipse(yaw*9+3.5,9,7.5,6.5,0,0,TAU);offX.fill();}
    if(this.stage===3){offX.fillStyle='rgba(255,255,255,.35)';offX.beginPath();offX.ellipse(yaw*9,9,11,8,0,0,TAU);offX.fill();}
    offX.globalCompositeOperation='source-over';
    ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(offCv,0,0);
    if(P.puff>.4){ctx.setTransform(base);ctx.strokeStyle=INK;ctx.lineWidth=1.4;ctx.lineCap='round';const tp=torsoPts(sk).slice(1,10);tp.forEach((q,i)=>{if(i%2)return;spath(ctx,jit([[q[0]-2,q[1]+1],[q[0]+(hsh(i,7)-.5)*4,q[1]-5*P.puff],[q[0]+3,q[1]+1]],120+i,.5),false);ctx.stroke();});}
    this.drawFaceInk(headM,P,ic);
    ctx.setTransform(vx,0,0,vy,0,0);
    if(P.purr>.15&&!G.ff){ctx.strokeStyle=INK;ctx.lineWidth=1.5;ctx.lineCap='round';for(let i=0;i<3;i++){const ph=(t*1.4+i/3)%1;ctx.globalAlpha=(1-ph)*P.purr*.75;const x=this.head.x-this.facing*(38+ph*12)*S,y=this.head.y+(28-i*11)*S;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-this.facing*9*S,y+3*S);ctx.stroke();}ctx.globalAlpha=1;}
    if(this.beh==='nap'&&this.eyeO<.1){ctx.fillStyle=INK;ctx.font=`700 ${Math.round(15*S)}px LXGW WenKai TC, serif`;for(let i=0;i<3;i++){const ph=(t*.45+i/3)%1;ctx.globalAlpha=Math.sin(ph*Math.PI)*.75;ctx.fillText('z',this.head.x+(10+ph*22)*S*this.facing,this.head.y-(16+ph*34)*S);}ctx.globalAlpha=1;}}
  drawFaceInk(m,P,ic){ctx.setTransform(m);const yaw=this.yaw,nx=yaw*10,eo=this.eyeO,big=this.stage===0?1.18:1,lineC=ic.dark?'#efe7dc':INK;
    ctx.fillStyle='rgba(238,130,140,.5)';for(const s of [-1,1]){const ep=earPts(s,yaw,P.earUp+this.earTw[s<0?0:1],this.stage===0),c=ep.reduce((a,p)=>[a[0]+p[0]/ep.length,a[1]+p[1]/ep.length],[0,0]);ctx.save();ctx.translate(c[0],c[1]+2);ctx.scale(.45,.55);ctx.translate(-c[0],-c[1]);spath(ctx,ep);ctx.fill();ctx.restore();}
    if(P.purr>.1||this.stage===0){ctx.fillStyle='rgba(238,130,140,.55)';ctx.globalAlpha=Math.max(P.purr*.8,this.stage===0?.45:0);for(const s of [-1,1]){ctx.beginPath();ctx.ellipse(s*12.5+yaw*7.5,7,5,2.6,0,0,TAU);ctx.fill();}ctx.globalAlpha=1;}
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const e of [-1,1]){const ex=e*9.5+yaw*7.5,ey=-2,farF=Math.max(0,-e*yaw),ew=(1-.4*farF)*big;
      if(eo<.2){ctx.strokeStyle=lineC;ctx.lineWidth=1.8;const happy=P.purr>.2&&this.beh!=='nap';spath(ctx,jit(happy?[[ex-5*ew,ey+1.5],[ex,ey-3],[ex+5*ew,ey+1.5]]:[[ex-5*ew,ey],[ex,ey+3],[ex+5*ew,ey]],40+e,.35),false);ctx.stroke();continue;}
      const px=this.pup.x*1.6,py=this.pup.y*1.2;
      if(ic.dark){ctx.fillStyle=ic.eye;ctx.beginPath();ctx.ellipse(ex,ey,5*ew,5.6*eo*big,0,0,TAU);ctx.fill();ctx.fillStyle=INK;ctx.beginPath();ctx.ellipse(ex+px,ey+py,(1+P.pupil*2.6)*ew,5*eo*big,0,0,TAU);ctx.fill();}
      else{ctx.fillStyle=INK;ctx.beginPath();ctx.ellipse(ex+px*.6,ey+py*.6,(2+P.pupil*1.8)*ew,(3.8*eo+.3)*big,0,0,TAU);ctx.fill();}
      ctx.fillStyle=PAPER;ctx.beginPath();ctx.arc(ex-.9+px*.4,ey-1.7*eo*big,.85*big,0,TAU);ctx.fill();
      if(P.earUp<-.45){ctx.strokeStyle=lineC;ctx.lineWidth=1.6;spath(ctx,jit([[ex-e*5,ey-8.5],[ex+e*3,ey-6]],50+e,.35),false);ctx.stroke();}}
    ctx.fillStyle=ic.dark?'#e2a0a6':INK;spath(ctx,jit([[nx-2.4,4.6],[nx+2.4,4.6],[nx,7]],60,.25));ctx.fill();
    ctx.strokeStyle=lineC;const mo=clamp(P.mouth,0,1);
    if(mo>.1){ctx.fillStyle='rgba(120,40,50,.75)';spath(ctx,jit(ellPts(nx,11.5+mo,1.8+mo*2.4,1+mo*3,12),61,.3));ctx.fill();ctx.lineWidth=1.2;ctx.stroke();}
    else{ctx.lineWidth=1.2;spath(ctx,jit([[nx-3.8,10.4],[nx-1.9,12],[nx,9],[nx+1.9,12],[nx+3.8,10.4]],62,.25),false);ctx.stroke();}
    ctx.lineWidth=.9;const wf=clamp(P.earUp,-1,1)*1.5;for(const s of [-1,1])for(let i=0;i<3;i++){spath(ctx,jit([[nx+s*6,8.5+i*1.5],[nx+s*15,6.5+i*2.4-wf],[nx+s*25,5+i*4.3-wf*2]],64+i+s*5,.45),false);ctx.stroke();}
    if(ic.stripe){ctx.strokeStyle=ic.stripe;ctx.lineWidth=1.6;for(const dx of [-5,0,5]){spath(ctx,jit([[yaw*7+dx*.9,-17.5],[yaw*7+dx*.7,-12]],80+dx,.35),false);ctx.stroke();}}}
}

/* ================= game systems ================= */
function log(text,big){G.journal.unshift({g:G.gmin,text,big:!!big});if(G.journal.length>80)G.journal.length=80;uiDirty=true;}
const toastQ=[];
function toast(title,text){if(G.ff){return;}const el=document.createElement('div');el.className='toast';el.innerHTML=`<b>${title}</b>${text}`;$('toasts').appendChild(el);setTimeout(()=>el.remove(),3800);while($('toasts').children.length>3)$('toasts').firstChild.remove();}

function closeDoor(cat){const D=G.door;D.state='closing';D.knocks=[];D.snack=false;
  const g=cat.grudge();D.until=G.gmin+(50+160*clamp(g+cat.m.annoy*.5,0,1.4))*(1.2-cat.q.soc*.5)*(cat.has('grudge')?1.5:1);
  log(`${cat.name}走到門口，把門關上了。`,true);toast('破次元',`${cat.name}不想見你，把門關起來了。`);}
function openDoor(){const D=G.door,c=G.cat;D.state='opening';c.inside=false;c.x=W/2;c.y=FB-20;c.m.annoy=Math.min(c.m.annoy,.2);c.setBeh(c.q.soc>.4||D.snack?'greet':'sit');log(`${c.name}把門打開了。`);}
function updateDoor(dt){const D=G.door;
  if(D.state==='closing'){D.k=Math.min(1,D.k+dt*2.2);if(D.k>=1){D.state='closed';D.shake=.4;if(G.cat){G.cat.inside=true;}}}
  else if(D.state==='opening'){D.k=Math.max(0,D.k-dt*1.4);if(D.k<=0)D.state='open';}
  else if(D.state==='closed'&&G.gmin>=D.until)openDoor();
  D.shake=Math.max(0,D.shake-dt);D.paw=Math.max(0,D.paw-dt);}
function knock(x,y){const D=G.door,c=G.cat;D.shake=.25;D.knocks=D.knocks.filter(t=>G.t-t<4);D.knocks.push(G.t);G.fx.ripples.push({x,y,t:0,door:1});
  if(D.knocks.length>=3){D.until+=25;D.paw=.7;c.remember('knock',-.4,.5);c.m.annoy=Math.min(1,c.m.annoy+.15);}
  if(D.knocks.length>=5){screenSwipe();D.until+=40;D.knocks=[];log(`你一直敲門，${c.name}隔著門拍了你。`);}}
function leaveSnack(){const D=G.door,c=G.cat;if(G.treats<=0||D.snack)return;G.treats--;D.snack=true;c.remember('treat',.35,.5);
  D.until=G.gmin+Math.max(8,(D.until-G.gmin)*.35);log(`你在門口放了零食。`);}
function screenSwipe(){G.fx.scratch={t:0,dir:Math.random()<.5?1:-1};if(!reduceMotion)stage.animate([{transform:'translate(0,0)'},{transform:'translate(-8px,4px)'},{transform:'translate(7px,-3px)'},{transform:'translate(-4px,2px)'},{transform:'translate(0,0)'}],{duration:380});}

function advanceGame(gdt){
  const c=G.cat;if(!c||G.revoked)return;
  const prevDay=dayNo();G.gmin+=gdt;
  if(dayNo()!==prevDay){G.treats=3;if(!G.care.badToday){G.care.streak++;if(G.care.streak>=3)c.event('care3');}else G.care.streak=0;G.care.badToday=false;log(`第 ${dayNo()} 天開始了。零食補到 3 個。`);}
  const bad=c.nd.full<.08||c.nd.hydra<.08||G.dirt>=6||G.puddles.length>=6;
  if(bad){G.care.neglect+=gdt/60;G.care.badToday=true;if(c.nd.full<.08&&Math.random()<gdt/180)c.remember('neglect',-.5,.4);}
  else G.care.neglect=Math.max(0,G.care.neglect-gdt/60*3);
  const nw=G.care.neglect>36?3:G.care.neglect>20?2:G.care.neglect>8?1:0;
  if(nw!==G.care.warn){if(nw>G.care.warn){if(nw===1)log(`${c.name}很久沒有被好好照顧了。`,true);if(nw===2)log(`警告：再這樣下去，${c.name}會被接走。`,true);}G.care.warn=nw;uiDirty=true;}
  if(nw===3){revoke();return;}
  const st=c.stage;c.calcStage();if(c.stage!==st)growUp(c,st);
  if(!G.bird&&hour()>6&&hour()<18&&Math.random()<gdt/90)G.bird={x:G.L.win.x-G.L.win.r-20,y:G.L.win.y+rnd(-30,20),t:0,vx:rnd(60,110)};
  if(!G.bug&&Math.random()<gdt/600)spawnBug();
}
function growUp(c,from){const to=c.stage,notes=[];
  if(from===0){if(c.litter.skill>=.8)notes.push('已經會用貓砂盆了。');else{notes.push('還沒學會用貓砂盆，之後偶爾還是會尿在外面。');}
    if(c.counts.petGood>=4){c.trustBase+=.08;notes.push('幼貓時常被你摸，長大後比較不怕手。');}else if(c.counts.petGood===0){c.trustBase-=.05;notes.push('小時候很少被摸，對手還是有點陌生。');}
    c.counts.play1=c.counts.play;}
  if(from===1){if(c.counts.play>=8){c.p.play=clamp(c.p.play+.06,0,1);notes.push('愛玩的習慣留了下來。');}
    if(c.tasks['1:sleepnear']){c.trustBase+=.05;notes.push('在你面前睡過覺，對你更安心了。');}}
  if(from===2){notes.push('動作慢了下來，但更常找你待在一起。');c.p.soc=clamp(c.p.soc+.05,0,1);}
  const n=`${c.name}長大了，現在是${STAGES[to].n}。`+notes.join('');c.notes.unshift({g:G.gmin,stage:to,text:notes.join('')||'平平安安地長大了。'});
  log(n,true);toast('長大了',`${c.name}現在是${STAGES[to].n}。`);uiDirty=true;}
function revoke(){if(G.revoked)return;G.revoked=true;const c=G.cat;log(`救助站的人把${c.name}接走了。`,true);save();showRevoked();}

/* ================= toys, ball, bug, bird ================= */
function initToy(x,y){const t=G.toy;t.nodes=[];for(let i=0;i<8;i++)t.nodes.push({x,y:y+i*13,ox:x,oy:y+i*13});t.x=x;t.y=y+91;}
function updateToy(dt){const t=G.toy,ptr=G.ptr;if(G.tool!=='wand'){t.visible=false;return;}
  if(ptr.in){t.ax=ptr.x;t.ay=ptr.y;if(!t.visible){initToy(ptr.x,ptr.y);t.visible=true;}}if(!t.visible)return;
  const n=t.nodes,g=1100,seg=13;n[0].x=t.ax;n[0].y=t.ay;n[0].ox=t.ax;n[0].oy=t.ay;
  for(let i=1;i<n.length;i++){const q=n[i],vx=(q.x-q.ox)*.985,vy=(q.y-q.oy)*.985;q.ox=q.x;q.oy=q.y;q.x+=vx;q.y+=vy+g*dt*dt;}
  for(let it=0;it<8;it++){for(let i=1;i<n.length;i++){const a=n[i-1],b=n[i],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01,df=(d-seg)/d;
    if(i===1){b.x-=dx*df;b.y-=dy*df;}else{a.x+=dx*df*.5;a.y+=dy*df*.5;b.x-=dx*df*.5;b.y-=dy*df*.5;}}for(let i=1;i<n.length;i++)if(n[i].y>FB)n[i].y=FB;}
  const e=n[n.length-1],sp=Math.hypot(e.x-t.x,e.y-t.y)/Math.max(dt,1e-3);t.speed=lerp(t.speed,sp,.3);t.x=e.x;t.y=e.y;}
function updateBall(dt){const b=G.ball,ptr=G.ptr;
  if(ptr.grabBall){const nx=clamp(ptr.x,40,W-40),ny=floorY(ptr.y);b.vx=lerp(b.vx,(nx-b.x)/Math.max(dt,1e-3),.4);b.vy=lerp(b.vy,(ny-b.y)/Math.max(dt,1e-3),.4);b.x=nx;b.y=ny;b.z=0;b.vz=0;return;}
  b.x+=b.vx*dt;b.y+=b.vy*dt*.7;b.vz-=900*dt;b.z=Math.max(0,b.z+b.vz*dt);if(b.z===0&&b.vz<0)b.vz=-b.vz*.4;if(Math.abs(b.vz)<20&&b.z<1)b.vz=0;
  const f=Math.exp(-dt*1.4);b.vx*=f;b.vy*=f;b.spin+=b.vx*dt*.08;
  if(b.x<40){b.x=40;b.vx=Math.abs(b.vx)*.6;}if(b.x>W-40){b.x=W-40;b.vx=-Math.abs(b.vx)*.6;}
  if(b.y<FT+16){b.y=FT+16;b.vy=Math.abs(b.vy)*.6;}if(b.y>FB){b.y=FB;b.vy=-Math.abs(b.vy)*.6;}}
function spawnBug(){G.bug={x:Math.random()<.5?-10:W+10,y:rnd(FT*.35,FT*.75),vx:0,vy:0,t:0,life:rnd(16,24),seed:rnd(0,50),mode:'fly',mt:rnd(3,6),lx:0,ly:0};}
function updateBug(dt){const b=G.bug;if(!b)return;b.t+=dt;b.mt-=dt;let tx,ty,sp=4;
  if(b.mode==='fly'){tx=W/2+Math.sin(b.t*.33+b.seed)*W*.38+Math.sin(b.t*1.7)*50;ty=FT*.7+Math.sin(b.t*.5+b.seed*2)*FT*.3+Math.sin(b.t*2.3)*28;if(b.mt<=0){b.mode='dive';b.lx=clamp(b.x+rnd(-150,150),60,W-60);b.ly=rnd(FT+40,FB-30);}}
  else if(b.mode==='dive'){tx=b.lx;ty=b.ly-2;sp=3;if(Math.hypot(b.x-tx,b.y-ty)<4){b.mode='land';b.mt=rnd(1.5,3.2);}}
  else if(b.mode==='land'){tx=b.x;ty=b.y;b.vx=0;b.vy=0;if(b.mt<=0){b.mode='fly';b.mt=rnd(4,7);b.vy=-160;}}
  if(b.t>b.life&&b.mode!=='land')b.mode='leave';if(b.mode==='leave'){tx=b.x<W/2?-60:W+60;ty=60;sp=2.5;}
  if(b.mode!=='land'){b.vx+=((tx-b.x)*sp-b.vx*2.2)*dt*3;b.vy+=((ty-b.y)*sp-b.vy*2.2)*dt*3;b.vx+=rnd(-1,1)*900*dt;b.vy+=rnd(-1,1)*900*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;}
  if(b.mode==='leave'&&(b.x<-50||b.x>W+50))G.bug=null;}
function updateBird(dt){const b=G.bird;if(!b)return;b.t+=dt;b.x+=b.vx*dt;b.y+=Math.sin(b.t*6)*12*dt;if(b.x>G.L.win.x+G.L.win.r+30)G.bird=null;}

/* ================= drawing: nest (hand-drawn) ================= */
let bgCv=null,bgDirty=true;
function archPts(){const ix=14,iy=10,iw=W-28,rad=Math.min(170,W*.2),p=[[ix,H+5]];
  for(let y=H;y>iy+rad;y-=40)p.push([ix,y]);for(let i=0;i<=10;i++){const a=Math.PI+i/10*Math.PI/2;p.push([ix+rad+Math.cos(a)*rad,iy+rad+Math.sin(a)*rad]);}
  for(let x=ix+rad+40;x<ix+iw-rad;x+=40)p.push([x,iy]);for(let i=0;i<=10;i++){const a=-Math.PI/2+i/10*Math.PI/2;p.push([ix+iw-rad+Math.cos(a)*rad,iy+rad+Math.sin(a)*rad]);}
  for(let y=iy+rad+40;y<H;y+=40)p.push([ix+iw,y]);p.push([ix+iw,H+5]);return p;}
function drawBgInk(){const c=ctx,L=G.L;
  c.fillStyle='#f6eee2';c.fillRect(0,0,W,H);
  c.fillStyle='rgba(242,206,172,.5)';c.fillRect(0,0,W,FT);
  c.strokeStyle='rgba(44,39,35,.16)';c.lineWidth=1.2;c.lineCap='round';
  for(let y=46,r=0;y<FT-24;y+=48,r++)for(let x=40+(r%2)*36;x<W-30;x+=72){const s=hsh(x,y)*2;c.beginPath();c.moveTo(x-3,y-3+s);c.lineTo(x+3,y+3+s);c.moveTo(x+3,y-3+s);c.lineTo(x-3,y+3+s);c.stroke();}
  c.fillStyle='rgba(214,170,128,.42)';c.fillRect(0,FT,W,H-FT);
  for(let i=1;i<8;i++){const y=FT+(H-FT)*Math.pow(i/8,1.4);inkL(c,lineSeg([[0,y],[W,y]],Math.ceil(W/80)),400+i,1.1,.9,.32);}
  for(let k=0;k<14;k++){const i=k%7,y0=FT+(H-FT)*Math.pow(i/8,1.4),y1=FT+(H-FT)*Math.pow((i+1)/8,1.4),x=(k*173+i*97)%W;inkL(c,[[x,y0],[x+(y1-y0)*.1,y1]],420+k,1,.6,.28);}
  inkL(c,lineSeg([[0,FT],[W,FT]],Math.ceil(W/60)),450,2,.9);
  const rx=L.rug.x,ry=L.rug.y,rw=L.rug.rw,rh=L.rug.rh;c.fillStyle='rgba(160,186,140,.55)';c.beginPath();c.ellipse(rx,ry,rw,rh,0,0,TAU);c.fill();ink(c,ellPts(rx,ry,rw,rh,40),460,{lw:1.8});
  c.strokeStyle='rgba(44,39,35,.45)';c.lineWidth=1.3;for(let i=0;i<34;i++){const a=i/34*TAU,x=rx+Math.cos(a)*(rw-14),y=ry+Math.sin(a)*(rh-14);c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a+1.57)*4,y+Math.sin(a+1.57)*2);c.stroke();}
  const sx=L.shelf.x,y0=L.shelf.y;ink(c,box4(sx-70,y0,sx+70,y0+9),470,{fill:'rgba(160,110,75,.6)',smooth:false,lw:1.6});
  ink(c,[[sx-55,y0],[sx-50,y0-24],[sx-28,y0-24],[sx-23,y0]],471,{fill:'rgba(214,120,90,.55)',smooth:false,lw:1.6});
  for(const [dx,dy,a,i] of [[-46,-33,-.5,0],[-38,-41,0,1],[-30,-33,.5,2],[-40,-50,-.2,3],[-33,-50,.25,4]]){const pts=ellPts(0,0,5,13,12).map(([x,y])=>[sx+dx+x*Math.cos(a)-y*Math.sin(a),y0+dy+x*Math.sin(a)+y*Math.cos(a)]);ink(c,pts,480+i,{fill:'rgba(110,160,100,.6)',lw:1.3});}
  ink(c,ellPts(sx+20,y0-8,22,10,18),490,{fill:'rgba(230,200,150,.6)',lw:1.4});ink(c,ellPts(sx+12,y0-16,8,8,12),491,{fill:'rgba(208,86,107,.6)',lw:1.3});ink(c,ellPts(sx+27,y0-15,7,7,12),492,{fill:'rgba(93,143,179,.6)',lw:1.3});
  ink(c,box4(sx+42,y0-36,sx+68,y0-2),493,{fill:PAPER,smooth:false,lw:1.4});ink(c,ellPts(sx+55,y0-19,6,6,12),494,{fill:'rgba(213,138,106,.6)',lw:1.1});
  inkL(c,L.lights.map(p=>[p.x,p.y-6]),495,1.2,.6,.7);
  const a=archPts();c.fillStyle='#d6b691';c.beginPath();c.rect(-5,-5,W+10,H+10);a.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill('evenodd');
  c.strokeStyle='rgba(44,39,35,.25)';c.lineWidth=1;for(let i=0;i<40;i++){const x=hsh(i,3)*W,y=hsh(i,4)*H;if(y>40&&x>30&&x<W-30)continue;c.beginPath();c.moveTo(x,y);c.lineTo(x+6,y+2);c.stroke();}
  inkL(c,a,500,2.6,1);}
function daylight(){const h=hour();if(h<5)return 0;if(h<7.5)return (h-5)/2.5;if(h<17)return 1;if(h<19.5)return 1-(h-17)/2.5;return 0;}
function drawWindow(){const w=G.L.win,d=daylight(),h=hour(),c=ctx;const dusk=(h>16&&h<20)||(h>5&&h<8);
  c.save();c.beginPath();c.arc(w.x,w.y,w.r,0,TAU);c.clip();
  c.fillStyle=d>.6?'#cfe6ef':dusk&&d>.05?'#f3c4a0':'#3d4672';c.fillRect(w.x-w.r,w.y-w.r,w.r*2,w.r*2);
  if(dusk&&d>.05&&d<=.6){c.fillStyle='rgba(150,130,190,.5)';c.fillRect(w.x-w.r,w.y-w.r,w.r*2,w.r*.9);}
  if(d<.4){c.fillStyle='rgba(255,250,230,.9)';for(let i=0;i<10;i++){const sx=w.x+Math.sin(i*12.9)*w.r*.8,sy=w.y+Math.cos(i*7.3)*w.r*.8;c.globalAlpha=(.4+.6*Math.abs(Math.sin(G.t*1.5+i)))*(1-d*2.5);inkL(c,[[sx-3,sy],[sx+3,sy]],600+i,1,.3);inkL(c,[[sx,sy-3],[sx,sy+3]],610+i,1,.3);}c.globalAlpha=1;
    const mx=w.x+w.r*.35,my=w.y-w.r*.35;ink(c,ellPts(mx,my,13,13,16),620,{fill:'#fff3cf',lw:1.4});c.fillStyle=d<.05?'#3d4672':'#5a5f8a';c.beginPath();c.arc(mx+6,my-3,11,0,TAU);c.fill();}
  if(d>.3){const cx=((G.gmin*.6)%(w.r*3))-w.r*1.5;for(const [dx,dy,s,i] of [[0,10,1,0],[30,-25,.7,1]]){const pts=ellPts(w.x+cx+dx,w.y+dy,22*s,9*s,16);ink(c,pts,630+i,{fill:'rgba(255,255,255,.9)',lw:1.2});}
    ink(c,ellPts(w.x-20,w.y+w.r+10,w.r*.9,34,24),640,{fill:'rgba(140,180,110,.75)',lw:1.4});ink(c,ellPts(w.x+40,w.y+w.r+18,w.r*.8,30,24),641,{fill:'rgba(120,165,100,.75)',lw:1.4});}
  if(G.bird){const b=G.bird,f=Math.sin(b.t*14)*5;inkL(c,[[b.x-8,b.y-f],[b.x-3,b.y-3],[b.x,b.y],[b.x+3,b.y-3],[b.x+8,b.y-f]],650,2,.3);}
  c.restore();
  c.fillStyle='rgba(168,116,82,.65)';c.beginPath();c.arc(w.x,w.y,w.r+11,0,TAU);c.arc(w.x,w.y,w.r,0,TAU,true);c.fill();
  ink(c,ellPts(w.x,w.y,w.r,w.r,36),660,{lw:2});ink(c,ellPts(w.x,w.y,w.r+11,w.r+11,40),661,{lw:2.2});
  inkL(c,[[w.x-w.r,w.y],[w.x,w.y+1],[w.x+w.r,w.y]],662,2.6,.6);inkL(c,[[w.x,w.y-w.r],[w.x+1,w.y],[w.x,w.y+w.r]],663,2.6,.6);
  ink(c,box4(w.x-w.r-18,w.y+w.r+4,w.x+w.r+18,w.y+w.r+14),664,{fill:'rgba(168,116,82,.75)',smooth:false,lw:1.8});
  for(const s of [-1,1]){const x0=w.x+s*(w.r+14),pts=[[x0,w.y-w.r-4],[x0+s*10,w.y-20],[x0+s*2,w.y+w.r+2],[x0+s*20,w.y+w.r+2],[x0+s*28,w.y-10],[x0+s*18,w.y-w.r-4]];ink(c,pts,670+s,{fill:'rgba(240,200,200,.75)',lw:1.6});}}
function drawBedBack(){const b=G.L.bed;ink(ctx,ellPts(b.x,b.y,b.rx,b.ry,36),700,{fill:'rgba(214,140,130,.75)',lw:2});ink(ctx,ellPts(b.x,b.y-3,b.rx-14,b.ry-9,32),701,{fill:'#f6e3d2',lw:1.6});
  ink(ctx,ellPts(b.x+b.rx*.45,b.y-10,22,10,16),702,{fill:'#fdf3ea',lw:1.4});}
function drawBedFront(){const b=G.L.bed,o=ellPts(b.x,b.y,b.rx,b.ry,20,0,Math.PI),i=ellPts(b.x,b.y-4,b.rx-12,b.ry-11,18,0,Math.PI).reverse();ink(ctx,o.concat(i),703,{fill:'rgba(214,140,130,.95)',lw:2});
  ctx.strokeStyle='rgba(44,39,35,.4)';ctx.lineWidth=1.2;for(let k=0;k<10;k++){const a=.3+k/10*(Math.PI-.6),x=b.x+Math.cos(a)*(b.rx-6),y=b.y+Math.sin(a)*(b.ry-5);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+3);ctx.stroke();}}
function drawBoxBack(){const B=G.L.box,x0=B.x-B.w/2,yb=B.y-B.d;
  ink(ctx,segPts([[x0+10,yb-B.h],[x0+B.w-10,yb-B.h],[x0+B.w-10,yb],[x0+10,yb]],3),710,{fill:'rgba(170,120,70,.75)',smooth:false,lw:1.8});
  ink(ctx,segPts([[x0+10,yb],[x0+B.w-10,yb],[x0+B.w,B.y-B.h+2],[x0,B.y-B.h+2]],3),711,{fill:'rgba(140,95,55,.8)',smooth:false,lw:1.6});
  ink(ctx,[[x0+10,yb-B.h],[x0-14,yb-B.h-16],[x0-6,yb-B.h+4]],712,{fill:'rgba(200,150,95,.8)',smooth:false,lw:1.6});ink(ctx,[[x0+B.w-10,yb-B.h],[x0+B.w+16,yb-B.h-14],[x0+B.w+6,yb-B.h+4]],713,{fill:'rgba(200,150,95,.8)',smooth:false,lw:1.6});}
function drawBoxFront(){const B=G.L.box,x0=B.x-B.w/2,yb=B.y-B.d;
  ink(ctx,[[x0,B.y-B.h],[x0+10,yb-B.h],[x0+10,yb],[x0,B.y]],714,{fill:'rgba(190,140,88,.95)',smooth:false,lw:1.6});ink(ctx,[[x0+B.w,B.y-B.h],[x0+B.w-10,yb-B.h],[x0+B.w-10,yb],[x0+B.w,B.y]],715,{fill:'rgba(190,140,88,.95)',smooth:false,lw:1.6});
  ink(ctx,box4(x0,B.y-B.h,x0+B.w,B.y),716,{fill:'#e0b680',smooth:false,lw:2});ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(B.x-12,B.y-B.h+2,24,B.h-4);
  ink(ctx,[[x0,B.y-B.h],[x0-12,B.y-B.h-22],[x0+B.w*.42,B.y-B.h-22],[x0+B.w*.45,B.y-B.h]],717,{fill:'#d6a46c',smooth:false,lw:1.8});
  inkL(ctx,[[x0+B.w-32,B.y-12],[x0+B.w-26,B.y-20],[x0+B.w-20,B.y-12]],718,1.3,.4,.6);inkL(ctx,[[x0+B.w-26,B.y-20],[x0+B.w-26,B.y-6]],719,1.3,.4,.6);}
function drawLitterBack(){const B=G.L.litter,x0=B.x-B.w/2,yb=B.y-B.d;
  ink(ctx,segPts([[x0+8,yb-8],[x0+B.w-8,yb-8],[x0+B.w,B.y-B.h],[x0,B.y-B.h]],3),720,{fill:'rgba(95,150,142,.85)',smooth:false,lw:1.8});
  ink(ctx,segPts([[x0+12,yb-2],[x0+B.w-12,yb-2],[x0+B.w-6,B.y-B.h+2],[x0+6,B.y-B.h+2]],3),721,{fill:'#efe1c3',smooth:false,lw:1.4});
  for(let i=0;i<G.dirt;i++){const a=i*2.39;ink(ctx,ellPts(B.x+Math.cos(a)*(18+i*5)*.9,yb+12+Math.sin(a)*6,5,3,10),730+i,{fill:'rgba(170,135,85,.85)',lw:1.1});}
  if(G.dirt>=3){for(let i=0;i<3;i++){const x=B.x-16+i*16,o=Math.sin(G.t*2+i)*3;inkL(ctx,[[x,yb-6],[x+5+o,yb-12],[x-2,yb-18],[x+4-o,yb-26]],740+i,1.4,.4,.55);}}}
function drawLitterFront(){const B=G.L.litter,x0=B.x-B.w/2;ink(ctx,box4(x0,B.y-B.h,x0+B.w,B.y),722,{fill:'rgba(120,172,165,.95)',smooth:false,lw:2});inkL(ctx,[[x0+10,B.y-B.h+6],[x0+B.w-10,B.y-B.h+6]],723,1,.5,.4);
  if(G.fx.rake>0){const k=1-G.fx.rake/.8;ctx.save();ctx.translate(B.x-40+k*80,B.y-B.h-24);ctx.rotate(-.5);ink(ctx,box4(-4,-30,4,4),724,{fill:'#ecd08a',smooth:false,lw:1.4});ink(ctx,box4(-12,2,12,12),725,{fill:'#ecd08a',smooth:false,lw:1.4});ctx.restore();}}
function drawBowl(B,kind){const lvl=kind==='food'?G.food:G.water;ctx.fillStyle='rgba(44,39,35,.12)';ctx.beginPath();ctx.ellipse(B.x,B.y+2,30,7,0,0,TAU);ctx.fill();
  const col=kind==='food'?'rgba(228,125,95,.9)':'rgba(100,145,195,.9)',sd=kind==='food'?750:760;
  ink(ctx,lineSeg([[B.x-26,B.y-14],[B.x+26,B.y-14],[B.x+20,B.y],[B.x-20,B.y]],2).slice(0,-1),sd,{fill:col,smooth:false,lw:1.8});
  ink(ctx,ellPts(B.x,B.y-14,26,7,20),sd+1,{fill:kind==='food'?'rgba(200,100,75,.95)':'rgba(80,120,170,.95)',lw:1.6});
  if(lvl>.02){if(kind==='food'){for(let i=0;i<Math.ceil(lvl*12);i++){const a=i*2.4,r=(i%5)*4;ink(ctx,ellPts(B.x+Math.cos(a)*r*1.3,B.y-15-lvl*3+Math.sin(a)*r*.35,3.2,2.2,8),sd+5+i,{fill:'#9a6a40',lw:.9,amp:.3});}}
    else ink(ctx,ellPts(B.x,B.y-14,22*lvl+3,5.5*lvl+1,16),sd+3,{fill:'rgba(190,225,245,.95)',lw:1,amp:.4});}
  if(kind==='food'){inkL(ctx,[[B.x-12,B.y-6],[B.x-6,B.y-7]],sd+2,1,.3,.6);}}
function drawScratcher(){const B=G.L.scr;ink(ctx,segPts([[B.x-B.w/2+10,B.y-16],[B.x+B.w/2+10,B.y-16],[B.x+B.w/2,B.y],[B.x-B.w/2,B.y]],3),770,{fill:'rgba(200,155,100,.9)',smooth:false,lw:1.8});
  for(let i=0;i<11;i++){const x=B.x-B.w/2+10+i*(B.w-20)/10;inkL(ctx,[[x+9,B.y-14],[x,B.y-2]],771+i,1,.3,.55);}}
function drawBall(){const b=G.ball,s=scaleAt(b.y)*1.2;ctx.fillStyle='rgba(44,39,35,.14)';ctx.beginPath();ctx.ellipse(b.x,b.y,11*s*(1-b.z/200),3.5*s,0,0,TAU);ctx.fill();
  const y=b.y-b.z-10*s;ink(ctx,ellPts(b.x,y,10*s,10*s,16),790,{fill:'rgba(215,95,115,.85)',lw:1.8});
  ctx.strokeStyle='rgba(44,39,35,.55)';ctx.lineWidth=1.1;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(b.x,y,10*s*.85,(3+i*2.4)*s,b.spin+i*.9,0,Math.PI);ctx.stroke();}
  inkL(ctx,[[b.x+8*s,y+4*s],[b.x+16*s,y+11*s],[b.x+24*s,b.y-1]],791,1.3,.4);}
function drawPuddles(){for(const p of G.puddles){const s=p.s||1;ink(ctx,ellPts(p.x,p.y,18*s,5.5*s,18),800+Math.round(p.x)%50,{fill:'rgba(238,212,95,.6)',lw:1.2,amp:.6});ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.ellipse(p.x-6*s,p.y-1.5*s,4*s,1.2*s,0,0,TAU);ctx.fill();}}
function drawBug(){const b=G.bug;if(!b)return;if(b.mode==='land'){ctx.fillStyle='rgba(44,39,35,.15)';ctx.beginPath();ctx.ellipse(b.x,b.y+2,4,1.5,0,0,TAU);ctx.fill();}
  ctx.fillStyle=INK;ctx.beginPath();ctx.ellipse(b.x,b.y,3.2,2.4,0,0,TAU);ctx.fill();const fl=b.mode==='land'?.2:Math.abs(Math.sin(G.t*60));
  ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.fillStyle='rgba(255,255,255,.8)';for(const s of [-1,1]){ctx.beginPath();ctx.ellipse(b.x+s*2,b.y-2.5,3.2,1.6*fl+.4,s*.6,0,TAU);ctx.fill();ctx.stroke();}}
function drawLighting(){const d=daylight(),n=1-d,L=G.L;
  ctx.save();ctx.globalCompositeOperation='multiply';const h=hour(),dusk=(h>16&&h<20)||(h>5&&h<8);
  const r=Math.round(lerp(255,dusk?160:100,n)),g=Math.round(lerp(255,dusk?130:96,n)),b=Math.round(lerp(255,dusk?150:150,n));ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fillRect(0,0,W,H);ctx.restore();
  ctx.save();ctx.globalCompositeOperation='lighter';
  if(n>.05){for(const p of L.lights){const gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,70);gr.addColorStop(0,`rgba(255,190,110,${.3*n})`);gr.addColorStop(1,'rgba(255,190,110,0)');ctx.fillStyle=gr;ctx.fillRect(p.x-70,p.y-70,140,140);}
    const gl=ctx.createRadialGradient(L.bed.x,L.bed.y-60,0,L.bed.x,L.bed.y-60,240);gl.addColorStop(0,`rgba(255,170,90,${.16*n})`);gl.addColorStop(1,'rgba(255,170,90,0)');ctx.fillStyle=gl;ctx.fillRect(0,0,W,H);}
  if(d>.05){const s=L.sun;const gs=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,130);gs.addColorStop(0,`rgba(255,225,160,${.22*d})`);gs.addColorStop(1,'rgba(255,225,160,0)');ctx.save();ctx.translate(s.x,s.y);ctx.scale(1,.38);ctx.translate(-s.x,-s.y);ctx.fillStyle=gs;ctx.fillRect(s.x-130,s.y-130,260,260);ctx.restore();}
  ctx.restore();
  for(const [i,p] of L.lights.entries()){ctx.globalAlpha=.6+.4*n;ink(ctx,ellPts(p.x,p.y,4.2,5.5,10),900+i,{fill:p.c,lw:1.1,amp:.3});}ctx.globalAlpha=1;}
function drawDoor(){const D=G.door;if(D.k<=0)return;const k=1-Math.pow(1-D.k,3),sh=D.shake>0?Math.sin(G.t*80)*D.shake*10:0,hw=W/2+2;
  for(const side of [-1,1]){ctx.save();const x0=side<0?-hw*(1-k):W-hw*k;ctx.translate(x0+sh,0);
    ctx.fillStyle='#c09272';ctx.fillRect(0,0,hw,H);
    for(let i=0;i<6;i++)ink(ctx,box4(i*hw/6+2,4,(i+1)*hw/6-2,H-4),1000+i+side*10,{fill:i%2?'#c79a78':'#bd8f6c',smooth:false,lw:1.8});
    for(const yy of [H*.22,H*.7])ink(ctx,box4(0,yy,hw,yy+18),1020+side+yy|0,{fill:'#a87756',smooth:false,lw:1.8});
    if(side<0){ink(ctx,ellPts(hw-34,H*.6,10,10,14),1030,{fill:'#e3c07a',lw:1.6});inkL(ctx,ellPts(hw-34,H*.6+14,10,10,10,.2,Math.PI-.2),1031,2.2,.4);
      const fx=hw-120,fy=FB-165;ink(ctx,box4(fx,fy,fx+86,fy+78),1032,{fill:'#7a5238',smooth:false,lw:2});
      if(D.state==='closed'&&D.until-G.gmin<20){ctx.fillStyle=G.cat?(INKC[G.cat.coatId]||INKC.cream).eye:'#e2b03a';for(const ex of [fx+30,fx+56]){ctx.beginPath();ctx.ellipse(ex,fy+40,6,5,0,0,TAU);ctx.fill();}ctx.fillStyle=INK;for(const ex of [fx+30,fx+56]){ctx.beginPath();ctx.ellipse(ex,fy+40,1.8,4.5,0,0,TAU);ctx.fill();}}
      if(D.paw>0){const pk=Math.sin(Math.PI*clamp(1-D.paw/.7,0,1)),ic=G.cat?(INKC[G.cat.coatId]||INKC.cream):INKC.cream;ink(ctx,ellPts(fx+43,fy+60+pk*30,16,12+pk*16,16),1033,{fill:ic.fill,lw:2});for(const dx of [-8,0,8]){ctx.fillStyle='rgba(238,130,140,.7)';ctx.beginPath();ctx.arc(fx+43+dx,fy+68+pk*44,3,0,TAU);ctx.fill();}}}
    else{ctx.save();ctx.translate(Math.min(hw*.55,220),H*.2);ctx.rotate(.05*Math.sin(G.t*1.5));inkL(ctx,[[-20,-30],[0,-50],[20,-30]],1040,1.6,.4);ink(ctx,box4(-34,-30,34,16),1041,{fill:PAPER,smooth:false,lw:1.8});
      ctx.fillStyle=INK;ctx.beginPath();ctx.ellipse(0,-2,8,7,0,0,TAU);ctx.fill();for(const [dx,dy] of [[-11,-14],[-4,-19],[4,-19],[11,-14]]){ctx.beginPath();ctx.ellipse(dx,dy,3.2,4,0,0,TAU);ctx.fill();}
      ctx.strokeStyle='#c45353';ctx.lineWidth=3;ctx.lineCap='round';spath(ctx,jit([[-26,10],[0,-7],[26,-24]],1042,.6),false);ctx.stroke();ctx.restore();}
    ctx.restore();}
  if(D.snack&&k>.9){ink(ctx,ellPts(W/2-80,FB-16,26,7,16),1050,{fill:PAPER,lw:1.4});drawTreatIcon(W/2-80,FB-24,1);}
  if(D.state==='closed'){ctx.fillStyle='rgba(44,39,35,.86)';ctx.font=`700 ${Math.round(Math.min(26,W/26))}px LXGW WenKai TC, serif`;ctx.textAlign='center';
    ctx.fillStyle=PAPER;ctx.globalAlpha=.85;const tw=Math.min(W*.8,420);ctx.fillRect(W/2-tw/2,H*.42-34,tw,64);ctx.globalAlpha=1;ink(ctx,box4(W/2-tw/2,H*.42-34,W/2+tw/2,H*.42+30),1060,{lw:1.6,smooth:false});
    ctx.fillStyle=INK;ctx.fillText(`${G.cat?G.cat.name:''}把門關上了`,W/2,H*.42);
    ctx.font=`500 ${Math.round(Math.min(15,W/42))}px Noto Sans TC, sans-serif`;ctx.fillStyle='rgba(44,39,35,.8)';ctx.fillText(G.tool==='treat'?'點門口，放一個零食':'點門會敲門，敲太多次牠會更生氣',W/2,H*.42+22);ctx.textAlign='left';}}
function drawTreatIcon(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ink(ctx,ellPts(0,0,11,6,14),1100,{fill:'rgba(236,160,90,.95)',lw:1.4,amp:.4});ink(ctx,[[9,0],[17,-6],[17,6]],1101,{fill:'rgba(236,160,90,.95)',lw:1.4,amp:.3,smooth:false});ctx.fillStyle=INK;ctx.beginPath();ctx.arc(-5,-1.5,1.4,0,TAU);ctx.fill();ctx.restore();}
/* ---- touch feedback: make every touch visibly do something ---- */
function buzz(p){try{if(G.ptr.type!=='mouse'&&navigator.vibrate)navigator.vibrate(p);}catch(_){}}
const REG_TXT={head:'摸頭',back:'摸背',rear:'摸屁股',tail:'摸尾巴'};
function touchFx(dt){const F=G.fx,ptr=G.ptr,c=G.cat;
  for(const t of F.trail)t.a-=dt*1.6;while(F.trail.length&&F.trail[0].a<=0)F.trail.shift();
  if(!c||G.ff)return;
  if(c.petting){const l=F.trail[F.trail.length-1];if(!l||Math.hypot(l.x-ptr.x,l.y-ptr.y)>3)F.trail.push({x:ptr.x,y:ptr.y,a:1});if(F.trail.length>40)F.trail.shift();
    const m=c.m,happy=m.petBudget>0&&m.annoy<.35&&!c.sleepPetOK,cross=m.annoy>.4;F.heartT-=dt;
    if(F.heartT<=0){F.heartT=happy?.32:cross?.45:.6;const hx=c.head.x+rnd(-14,14)*c.S,hy=c.head.y-24*c.S;
      if(happy)F.floaters.push({k:'heart',x:hx,y:hy,vx:rnd(-12,12),t:0,life:1.3,s:rnd(.8,1.15)});
      else if(cross){F.floaters.push({k:'anger',x:c.head.x+c.facing*18*c.S,y:c.head.y-30*c.S,vx:0,t:0,life:.9,s:1});buzz(12);}
      else if(c.sleepPetOK)F.floaters.push({k:'z',x:hx,y:hy,vx:6,t:0,life:1.6,s:1});}
    if(happy&&Math.random()<dt*1.2)buzz(6);}
  else F.heartT=0;
  if(ptr.down&&G.tool==='broom'&&ptr.speed>80){F.dustT-=dt;if(F.dustT<=0){F.dustT=.05;F.dust.push({x:ptr.x+rnd(-14,14),y:ptr.y+rnd(0,8),vx:rnd(-30,30),vy:rnd(-40,-10),t:0});}}}
function heartPts(x,y,s){const p=[];for(let i=0;i<24;i++){const a=i/24*TAU,hx=16*Math.sin(a)**3,hy=-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a));p.push([x+hx*s*.55,y+hy*s*.55]);}return p;}
function drawTouchFx(dt){const F=G.fx,ptr=G.ptr,c=G.cat;
  if(F.trail.length>2){for(let i=1;i<F.trail.length;i++){const a=F.trail[i-1],b=F.trail[i];ctx.globalAlpha=Math.max(0,b.a)*.5;inkL(ctx,[[a.x,a.y],[b.x,b.y]],1400+i,3.2,.5);}ctx.globalAlpha=1;}
  for(let i=F.floaters.length-1;i>=0;i--){const f=F.floaters[i];f.t+=dt;if(f.t>f.life){F.floaters.splice(i,1);continue;}const k=f.t/f.life,x=f.x+f.vx*f.t,y=f.y-f.t*(f.k==='anger'?6:38);
    ctx.globalAlpha=Math.min(1,(1-k)*2.2,f.t*8);const pop=f.s*(.6+Math.min(1,f.t*6)*.4);
    if(f.k==='heart')ink(ctx,heartPts(x,y,pop),1420+i%7,{fill:'rgba(232,120,136,.92)',lw:1.6,amp:.4});
    else if(f.k==='anger'){ctx.save();ctx.translate(x,y);ctx.scale(pop,pop);for(let q=0;q<4;q++){ctx.rotate(Math.PI/2);inkL(ctx,[[3,-3],[9,-3],[9,-9]],1440+q,2.4,.4);}ctx.restore();}
    else{ctx.fillStyle=INK;ctx.font='700 16px LXGW WenKai TC, serif';ctx.fillText('z',x,y);}}
  ctx.globalAlpha=1;
  for(let i=F.dust.length-1;i>=0;i--){const d=F.dust[i];d.t+=dt;if(d.t>.6){F.dust.splice(i,1);continue;}ctx.globalAlpha=(1-d.t/.6)*.6;ctx.fillStyle='#b59a78';ctx.beginPath();ctx.arc(d.x+d.vx*d.t,d.y+d.vy*d.t,2+d.t*5,0,TAU);ctx.fill();}
  ctx.globalAlpha=1;
  if(!ptr.in||!ptr.down||ptr.type==='mouse'||G.tool==='wand')return;
  // finger halo: shows exactly where the touch landed, since the finger hides the spot
  const pet=c&&c.petting;ctx.globalAlpha=.85;
  inkL(ctx,ellPts(ptr.x,ptr.y,pet?30:24,pet?30:24,20).concat([[ptr.x+(pet?30:24),ptr.y]]),1460,1.8,.8);
  ctx.globalAlpha=.16;ctx.fillStyle=pet?'#e87888':'#3d7564';ctx.beginPath();ctx.arc(ptr.x,ptr.y,pet?30:24,0,TAU);ctx.fill();ctx.globalAlpha=1;
  // long-press ring: "hold to pick up"
  if(G.tool==='hand'&&ptr.petCat===c&&c&&!c.held&&ptr.moved<8&&ptr.downT>.12&&ptr.downT<.6){const k=(ptr.downT-.12)/.48;
    ctx.strokeStyle='#3d7564';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.arc(ptr.x,ptr.y,38,-Math.PI/2,-Math.PI/2+TAU*k);ctx.stroke();}
  else if(G.tool==='broom')label(ptr.x,ptr.y-100,'來回擦');}
/* ---- loupe: a magnifier beside the finger, showing the cat's face the finger is covering ---- */
const loupeCv=document.createElement('canvas'),loupeX=loupeCv.getContext('2d');
const LP={a:0,x:0,y:0,sx:0,sy:0,on:false};
function loupeWanted(){const ptr=G.ptr,c=G.cat;return !!(c&&ptr.in&&ptr.down&&ptr.type!=='mouse'&&G.tool==='hand'&&ptr.petCat===c&&!c.held&&G.door.state==='open');}
function snapLoupe(){LP.on=loupeWanted();if(!LP.on&&LP.a<=0)return;const c=G.cat;if(!c)return;
  // what to magnify: the face, nudged toward the finger so the stroked spot stays in view
  const ptr=G.ptr,tx=lerp(c.head.x,ptr.x,.3),ty=lerp(c.head.y,ptr.y,.3)-4*c.S;
  if(LP.on){LP.sx=LP.a<=0?tx:lerp(LP.sx,tx,.35);LP.sy=LP.a<=0?ty:lerp(LP.sy,ty,.35);}
  const ps=cv.width/W,sr=LOUPE_R/LOUPE_Z,sz=Math.ceil(sr*2*ps);
  if(loupeCv.width!==sz){loupeCv.width=sz;loupeCv.height=sz;}
  loupeX.clearRect(0,0,sz,sz);loupeX.drawImage(cv,(LP.sx-sr)*ps,(LP.sy-sr)*(cv.height/H),sr*2*ps,sr*2*(cv.height/H),0,0,sz,sz);}
const LOUPE_R=62,LOUPE_Z=1.9;
function drawLoupe(dt){const ptr=G.ptr,c=G.cat;LP.a=clamp(LP.a+(LP.on?dt*7:-dt*6),0,1);if(LP.a<=0||!c)return;
  // place it above the finger, flipping sideways near the top edge
  let tx=ptr.x,ty=ptr.y-LOUPE_R-78;if(ty<LOUPE_R+70){ty=ptr.y-20;tx=ptr.x+(ptr.x<W/2?1:-1)*(LOUPE_R+70);}
  tx=clamp(tx,LOUPE_R+8,W-LOUPE_R-8);
  if(LP.on){LP.x=LP.a<.05?tx:lerp(LP.x,tx,.25);LP.y=LP.a<.05?ty:lerp(LP.y,ty,.25);}
  const R=LOUPE_R*(.75+.25*LP.a),x=LP.x,y=LP.y;ctx.save();ctx.globalAlpha=LP.a;
  ctx.fillStyle='rgba(44,39,35,.18)';ctx.beginPath();ctx.arc(x+3,y+5,R,0,TAU);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(x,y,R,0,TAU);ctx.clip();ctx.fillStyle=PAPER;ctx.fillRect(x-R,y-R,R*2,R*2);ctx.drawImage(loupeCv,x-R,y-R,R*2,R*2);ctx.restore();
  ink(ctx,ellPts(x,y,R,R,30),1480,{lw:2.6,amp:.7});
  // where the finger is, inside the loupe
  const fx=x+(ptr.x-LP.sx)*LOUPE_Z,fy=y+(ptr.y-LP.sy)*LOUPE_Z;if(Math.hypot(fx-x,fy-y)<R-8){ctx.globalAlpha=LP.a*.7;inkL(ctx,ellPts(fx,fy,9,9,12).concat([[fx+9,fy]]),1481,1.6,.4);ctx.globalAlpha=LP.a;}
  // reaction caption under the loupe
  const reg=c.petting&&c.petRegion?REG_TXT[c.petRegion]:(ptr.downT<.6&&ptr.moved<8?'按住抱起':'');const cap=caption(c),mood=c.m.annoy>.4?'不太高興':cap?cap[0]:'';
  const t=[reg,mood].filter(Boolean).join(' · ');if(t)label(x,y+R+18,t);
  ctx.restore();}
/* ---- moments: tap the cat, see what you can do right now ----
   Each row: when(cat) → up to 3 choices. A choice is [label, react(cat) → result line]. Add moments by adding rows. */
const MOMENTS=[
 {when:c=>c.beh==='nap',opts:[
  ['偷摸肉墊',c=>{if(c.q.tol<.35){startAnim('paw',c,{pull:1});return '牠把腳收進身體底下，皺了皺眉，繼續睡。';}startAnim('paw',c);c.m.trust=Math.min(1,c.m.trust+.01);return '牠的腳趾張開又縮回去，沒醒，咂咂嘴繼續睡。';}],
  ['輕摸頭',c=>{if(c.grudge()>.4){c.kick({earUp:-3});return '牠半睜開眼瞪了你一下，又閉上了。';}c.kick({earUp:3});c.remember('petsleep',.25,.3);return '耳朵抖了一下，發出一聲短短的呼嚕。';}],
  ['讓牠睡',c=>{c.m.trust=Math.min(1,c.m.trust+.01);return '你沒有吵牠。牠睡得很沉，肚子一起一伏。';}]]},
 {when:c=>c.beh==='hide',opts:[
  ['戳戳箱子',c=>{if(c.q.bold<.4){c.m.fear+=.1;return '牠往箱子裡面縮得更深了。';}c.kick({paw:6});return '箱子的洞裡伸出一隻爪子，拍了你一下又縮回去。';}],
  ['往裡面看',c=>{c.kick({earUp:-2});return '黑暗裡兩隻眼睛瞪得圓圓的，看著你。';}],
  ['不打擾',c=>{c.m.fear=Math.max(0,c.m.fear-.1);return '過了一會，牠從箱子邊探出半顆頭。';}]]},
 {when:c=>c.beh==='window'||c.beh==='watch',opts:[
  ['摸背',c=>{c.kick({tailAmp:2});return c.q.soc>.6?'牠回頭看了你一眼，又轉回去看窗外。':'尾巴甩了一下，不理你。';}],
  ['陪牠一起看',c=>{c.m.trust=Math.min(1,c.m.trust+.01);return '你們一起看著外面。牠的尾巴尖輕輕晃著。';}],
  ['叫牠',c=>{c.kick({earUp:2});return '牠一隻耳朵轉向你，身體沒動。';}]]},
 {when:c=>c.beh==='eat'||c.beh==='drink',opts:[
  ['摸背',c=>{c.kick({crouch:2});return c.q.tol<.45?'牠壓低身子護著碗，邊吃邊瞄你。':'牠邊吃邊發出小小的呼嚕聲。';}],
  ['蹲在旁邊看',c=>'牠吃得很專心，鬍鬚一抖一抖的。'],
  ['把碗挪近一點',c=>{c.kick({headUp:-2});return '牠跟著碗往前挪了一步，繼續吃。';}]]},
 {when:c=>c.beh==='groom',opts:[
  ['摸牠',c=>{c.kick({headTilt:2});return c.q.soc>.5?'牠停下來舔了你的手一下，又繼續舔自己。':'牠換了一邊繼續舔，當你不存在。';}],
  ['看牠舔毛',c=>'牠把爪子舔濕，認真地洗了一遍臉。'],
  ['不打擾',c=>'牠舔完了，滿意地坐著。']]},
 {when:c=>['approach','rub','greet'].includes(c.beh),opts:[
  ['摸摸牠',c=>{c.setBeh('rub');return '牠用頭頂著你的手，蹭了一圈。';}],
  ['慢慢眨眼',c=>{if(c.te()>.5){c.slowBlink=1.1;c.m.trust=Math.min(1,c.m.trust+.02);return '牠也慢慢眨了一下眼睛。這是貓在說「我信任你」。';}return '牠盯著你，沒有眨眼。還需要一點時間。';}],
  ['就這樣待著',c=>{c.setBeh('sit');c.m.trust=Math.min(1,c.m.trust+.01);return '牠在你旁邊坐下，尾巴繞住了腳。';}]]},
 {when:c=>true,opts:[
  ['摸下巴',c=>{if(c.te()<.3){c.kick({earUp:-2});return '牠往後躲了一下。還不夠信任你。';}startAnim('chin',c);return '牠把頭抬高，瞇起眼睛，把下巴送到你手上。';}],
  ['慢慢眨眼',c=>{if(c.te()>.5){c.slowBlink=1.1;c.m.trust=Math.min(1,c.m.trust+.02);return '牠也慢慢眨了一下眼睛。這是貓在說「我信任你」。';}return '牠看著你，沒有眨眼。';}],
  ['叫牠的名字',c=>{c.kick({earUp:3});if(c.te()>.5&&c.q.soc>.4){c.decideT=0;return '牠「喵」了一聲，朝你走過來。';}return '牠的耳朵動了一下，沒有過來。';}]]},
];
let momentFor=null,momentT=0;
function openMoments(c){if(!c||c.held||c.inside)return;const row=MOMENTS.find(r=>r.when(c));const box=$('moments');
  box.innerHTML=row.opts.map(([l],i)=>`<button type="button" class="btn" data-i="${i}">${l}</button>`).join('');
  box.style.left=clamp(c.head.x*cssW/W,90,cssW-90)+'px';box.style.top=Math.max(120,c.head.y*cssH/H-36*c.S*cssH/H)+'px';box.hidden=false;momentFor=c.beh;momentT=G.t;
  box.querySelectorAll('button').forEach(b=>b.onclick=e=>{e.stopPropagation();const [l,fn]=row.opts[+b.dataset.i];const txt=fn(c);closeMoments();G.lastInteract=G.gmin;if(txt){log(`你${l}。${txt}`);if(G.anim&&G.anim.t===0)G.anim.after=[l,txt];else toast(l,txt);}});}
function closeMoments(){const b=$('moments');if(b)b.hidden=true;momentFor=null;}
/* ---- ghost hand + moment animations ----
   The hand is never a real hand: a wobbly ink outline over a faint paper wash, fading in and out. */
const HAND=[[0,-1],[-4,2],[-4.6,14],[-5,25],[-12,26.5],[-19,30],[-24,35],[-22.5,40],[-16,39.5],[-15.5,47],[-14,58],[-8,66],[6,66],[14,58],[17.5,46],[17.5,36],[15,31],[11,29],[7,28.5],[4.6,14],[4,2]];
function ghostHand(x,y,rot,sc,a){if(a<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(sc,sc);ctx.globalAlpha=a;
  ctx.fillStyle='rgba(255,252,245,.42)';spath(ctx,HAND);ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=1.7/sc;ctx.lineJoin='round';spath(ctx,jit(HAND,1500,.7/sc*1.2));ctx.stroke();
  ctx.globalAlpha=a*.5;ctx.lineWidth=1.2/sc;for(const [x0,y0,x1,y1] of [[5,30,11,33],[9,40,15,41]]){ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();}
  ctx.restore();ctx.globalAlpha=1;}
function startAnim(kind,c,opt={}){G.anim={kind,c,t:0,dur:kind==='paw'?2.7:2.5,...opt};if(kind==='chin'){c.setBeh('sit');c.mv=null;c.decideT=3;}}
const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);
function drawAnim(dt){const A=G.anim;if(!A)return;A.t+=dt;const t=A.t,c=A.c;
  if(t>=A.dur||!c){c&&(c.chinOn=false);if(A.after)toast(A.after[0],A.after[1]);G.anim=null;return;}
  if(A.kind==='chin'){c.chinOn=t>.45&&t<2.05;const k=c.S*(.3+.7*Math.abs(c.face)),cx=c.head.x+c.yaw*9*k,cy=c.head.y+17*c.S;
    const inK=ease(t/.55),outK=ease((t-2)/.45),sx=cx+c.facing*(26*c.S)*(1-inK)+c.facing*30*c.S*outK,sy=cy+70*c.S*(1-inK)+60*c.S*outK;
    const rub=t>.55&&t<2?Math.sin((t-.55)*10)*5*c.S:0;
    if(c.chinOn){ctx.globalAlpha=.5;for(let i=0;i<3;i++)inkL(ctx,[[cx-8*c.S+i*6*c.S+rub*.4,cy+2*c.S],[cx-6*c.S+i*6*c.S+rub*.6,cy+6*c.S]],1520+i,1.1,.3);ctx.globalAlpha=1;}
    ghostHand(sx+rub,sy+2*c.S,c.facing*-.15,.62*c.S,Math.min(1,t/.3)*(1-outK)*.95);return;}
  if(A.kind==='paw'){const fade=Math.min(1,t/.25)*(1-ease((t-2.35)/.35)),pw=Math.min(W*.86,400),ph=pw*.72,px=W/2,py=Math.max(FT*.75,ph/2+70),k=pw/320;
    ctx.globalAlpha=fade*.28;ctx.fillStyle=INK;ctx.fillRect(0,0,W,H);ctx.globalAlpha=fade;
    const x0=px-pw/2,y0=py-ph/2;ctx.fillStyle='#efe2cd';ctx.fillRect(x0,y0,pw,ph);
    ctx.save();ctx.beginPath();ctx.rect(x0,y0,pw,ph);ctx.clip();
    const ic=INKC[c.coatId]||INKC.cream,pull=A.pull?ease((t-.85)/.45)*150*k:0,sp=A.pull?0:ease((t-.8)/.25)*(1-ease((t-1.4)/.35));
    const fx=px+10*k,fy=py+18*k+pull,toe=ic.dark?'#c98189':'#f0a3ab';
    ink(ctx,[[fx-46*k,fy+20*k],[x0-30,y0+ph+40],[x0+40*k,y0+ph+60],[fx+30*k,fy+44*k]],1530,{fill:ic.fill,lw:2.2});
    ink(ctx,ellPts(fx,fy,72*k,60*k,30),1531,{fill:ic.fill,lw:2.4,amp:.8});
    ink(ctx,[[fx-26*k,fy+30*k],[fx-30*k,fy+8*k],[fx-12*k,fy-6*k],[fx+12*k,fy-6*k],[fx+30*k,fy+8*k],[fx+26*k,fy+30*k],[fx,fy+40*k]],1532,{fill:toe,lw:1.8,amp:.6});
    const T=[[-44,-22],[-17,-40],[15,-40],[42,-22]];T.forEach(([tx,ty],i)=>{const out=1+sp*.28,ang=(i-1.5)*.12*sp,r=(A.pull?1-ease((t-.85)/.4)*.35:1)*k;
      const bx=fx+(tx*out)*k*Math.cos(ang)-(ty*out)*k*Math.sin(ang),by=fy+(tx*out)*k*Math.sin(ang)+(ty*out)*k*Math.cos(ang);ink(ctx,ellPts(bx,by,12*r,13.5*r,16),1540+i,{fill:toe,lw:1.7,amp:.5});});
    if(sp>.5){ctx.globalAlpha=fade*(sp-.5)*1.6;for(let i=0;i<4;i++){const a=-2.4+i*.55;inkL(ctx,[[fx+Math.cos(a)*84*k,fy+Math.sin(a)*72*k],[fx+Math.cos(a)*96*k,fy+Math.sin(a)*82*k]],1550+i,1.6,.3);}ctx.globalAlpha=fade;}
    // ghost finger comes in from the lower right, touches the big pad, leaves
    const inK=ease((t-.2)/.55),outK=ease((t-1.55)/.5),tx=fx+6*k,ty=fy+22*k,hx=lerp(px+pw*.55,tx,inK)+(px+pw*.6-tx)*outK,hy=lerp(py+ph*.8,ty,inK)+(py+ph*.85-ty)*outK;
    ghostHand(hx,hy,-.55,1.25*k,(1-outK)*.95);
    ctx.restore();ctx.globalAlpha=fade;ink(ctx,box4(x0,y0,x0+pw,y0+ph),1560,{lw:2.4,smooth:false,amp:1});
    ctx.fillStyle=INK;ctx.font=`700 ${Math.round(14*k+4)}px LXGW WenKai TC, serif`;ctx.textAlign='left';ctx.fillText(A.pull?'……':'（偷偷地）',x0+12,y0+26*k+6);ctx.globalAlpha=1;}}
function label(x,y,t){ctx.font='700 14px LXGW WenKai TC, serif';const w=ctx.measureText(t).width+18;x=clamp(x,w/2+6,W-w/2-6);
  ctx.globalAlpha=.94;ink(ctx,box4(x-w/2,y-13,x+w/2,y+10),1470,{fill:PAPER,lw:1.4,amp:.5});ctx.fillStyle=INK;ctx.textAlign='center';ctx.fillText(t,x,y+3);ctx.textAlign='left';ctx.globalAlpha=1;}
function drawCursor(){const ptr=G.ptr;if(!ptr.in||G.door.state==='closed'&&G.tool==='wand')return;
  if(G.tool==='wand'){drawToy();return;}
  if(G.tool==='broom'){ctx.save();ctx.translate(ptr.x,ptr.y);ctx.rotate(-.5+(ptr.down?Math.sin(G.t*16)*.3:0));inkL(ctx,[[0,-80],[0,-16]],1110,4,.4);ctx.strokeStyle='#a87756';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-78);ctx.lineTo(0,-18);ctx.stroke();
    ink(ctx,[[-12,-18],[12,-18],[20,8],[-20,8]],1111,{fill:'#ecd08a',smooth:false,lw:1.8});for(let k=-3;k<=3;k++)inkL(ctx,[[k*3,-16],[k*5.5,7]],1112+k,1,.3,.6);ink(ctx,box4(-13,-22,13,-17),1120,{fill:'#d96b6b',smooth:false,lw:1.4});ctx.restore();return;}
  if(ptr.type==='touch'&&G.tool!=='treat')return;
  ctx.save();ctx.translate(ptr.x,ptr.y);const d=ptr.down?.9:1;ctx.scale(d,d);ctx.rotate(-.25);
  const pts=[];for(let i=0;i<36;i++){const a=i/36*TAU;const fing=Math.sin(a)<-.15?Math.abs(Math.sin(a*4.5))*10:0;pts.push([Math.cos(a)*(14+fing*.25),Math.sin(a)*(13+fing)-4]);}
  ink(ctx,pts,1130,{fill:PAPER,lw:1.8,amp:.6});ctx.restore();if(G.tool==='treat'&&G.treats>0)drawTreatIcon(ptr.x-2,ptr.y-32,1.1);}
function drawToy(){const t=G.toy;if(!t.visible)return;const n=t.nodes;inkL(ctx,[[n[0].x+240,n[0].y-300],[n[0].x,n[0].y]],1140,2.6,.6);
  inkL(ctx,n.map(q=>[q.x,q.y]),1141,1.1,.4);
  const e=n[n.length-1],p=n[n.length-2],a=Math.atan2(e.y-p.y,e.x-p.x);ctx.save();ctx.translate(e.x,e.y);ctx.rotate(a-Math.PI/2);const cols=['rgba(227,104,79,.7)','rgba(242,181,68,.7)','rgba(79,154,168,.7)','rgba(227,104,79,.7)'];
  for(let i=0;i<4;i++){ctx.save();ctx.rotate((i-1.5)*.32+Math.sin(G.t*9+i)*.08);ink(ctx,ellPts(0,15,3.6,15,14),1150+i,{fill:cols[i],lw:1.2,amp:.4});ctx.restore();}ink(ctx,ellPts(0,0,4.6,4.6,10),1160,{fill:'#ecc35a',lw:1.2,amp:.3});ctx.restore();}
function drawFx(dt){const F=G.fx;
  for(let i=F.ripples.length-1;i>=0;i--){const r=F.ripples[i];r.t+=dt;if(r.t>.8){F.ripples.splice(i,1);continue;}ctx.globalAlpha=1-r.t/.8;for(const k of [1,.6]){const pts=r.door?ellPts(r.x,r.y,r.t*60*k+4,r.t*60*k+4,18):ellPts(r.x,r.y,r.t*70*k+4,r.t*20*k+2,18);inkL(ctx,pts.concat([pts[0]]),1200+k*10,1.6,.6);}ctx.globalAlpha=1;}
  for(let i=F.puffs.length-1;i>=0;i--){const p=F.puffs[i];p.t+=dt;if(p.t>.6){F.puffs.splice(i,1);continue;}ctx.globalAlpha=(1-p.t/.6)*.8;for(let k=0;k<6;k++){const a=k/6*TAU,r0=p.t*18,r1=p.t*34,dy=p.crumb?p.t*40:0;inkL(ctx,[[p.x+Math.cos(a)*r0,p.y+Math.sin(a)*r0*.6+dy],[p.x+Math.cos(a)*r1,p.y+Math.sin(a)*r1*.6+dy]],1220+k,1.4,.3);}ctx.globalAlpha=1;}
  for(let i=F.pours.length-1;i>=0;i--){const p=F.pours[i];p.t+=dt;if(p.t>.7){F.pours.splice(i,1);continue;}for(let k=0;k<8;k++){const q=(p.t*2+k/8)%1;ink(ctx,ellPts(p.x+Math.sin(k*3)*5,p.y-60+q*45,p.water?2:3,p.water?4:2.4,8),1240+k,{fill:p.water?'rgba(170,215,240,.9)':'#9a6a40',lw:.9,amp:.2});}}
  for(let i=F.bubbles.length-1;i>=0;i--){const b=F.bubbles[i];b.t+=dt;if(b.t>1.3||b.c.inside){F.bubbles.splice(i,1);continue;}const x=b.c.head.x+b.c.facing*20*b.c.S,y=b.c.head.y-34*b.c.S-b.t*12;
    ctx.globalAlpha=Math.min(1,(1.3-b.t)*3);const pts=ellPts(x,y,24,15,20);ink(ctx,pts,1260,{fill:PAPER,lw:1.6,amp:.6});inkL(ctx,[[x-b.c.facing*8,y+13],[x-b.c.facing*14,y+22],[x-b.c.facing*2,y+14]],1261,1.4,.4);
    ctx.fillStyle=INK;ctx.font='700 15px LXGW WenKai TC, serif';ctx.textAlign='center';ctx.fillText(b.txt,x,y+5);ctx.textAlign='left';ctx.globalAlpha=1;}
  if(F.rake>0)F.rake-=dt;
  const S=F.scratch;if(S){S.t+=dt;if(S.t>2.6){F.scratch=null;}else{
    if(S.t<.3){const k=S.t/.3,ic=G.cat?(INKC[G.cat.coatId]||INKC.cream):INKC.cream;const px=S.dir>0?lerp(-120,W+120,k):lerp(W+120,-120,k),py=lerp(H*.15,H*.85,k);
      ink(ctx,ellPts(px,py,110,90,30),1300,{fill:ic.fill,lw:3.5,amp:2});ink(ctx,ellPts(px,py+20,34,28,18),1301,{fill:'rgba(238,140,150,.8)',lw:2.4,amp:1.4});for(const [dx,dy,i] of [[-48,-30,0],[-18,-52,1],[18,-52,2],[48,-30,3]])ink(ctx,ellPts(px+dx,py+dy,14,17,14),1302+i,{fill:'rgba(238,140,150,.8)',lw:2.2,amp:1.2});}
    const a=S.t<.15?0:clamp(1-(S.t-.6)/2,0,1);ctx.globalAlpha=a;
    for(let i=0;i<3;i++){const ox=W*.32+i*W*.12,len=Math.min(H*.8,560);ctx.save();ctx.translate(ox,H*.1);ctx.rotate(S.dir>0?-.45:.45);
      const L=[[0,0],[10,len*.25],[13,len*.5],[9,len*.75],[0,len]],R=[[0,len],[3,len*.75],[4,len*.5],[2,len*.25],[0,0]];ink(ctx,L.concat(R),1320+i,{fill:'rgba(90,40,40,.8)',lw:2.2,amp:1.5});ctx.restore();}ctx.globalAlpha=1;}}}
function drawPortraitInk(canvas,coatId,stage=0){const c=canvas.getContext('2d'),ic=INKC[coatId]||INKC.cream,s=canvas.width/64*(stage===0?1.06:1);
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);const m=new DOMMatrix().translate(canvas.width/2,canvas.height*.6).scale(s,s);
  const save=ctx;ctx=c;
  const kit=stage===0,parts=[{k:'poly',pts:earPts(-1,0,.6,kit),m,sd:13},{k:'poly',pts:earPts(1,0,.6,kit),m,sd:14},{k:'poly',pts:headPts(0),m,sd:15}];
  for(const p of parts)inkPart(c,p);for(const p of parts)fillPart(c,p,ic.fill);
  const dummy=Object.create(Cat.prototype);Object.assign(dummy,{yaw:0,eyeO:1,earTw:[0,0],pup:{x:0,y:.15},beh:'sit',stage,coatId});
  c.setTransform(m);if(ic.muzzle){c.fillStyle=ic.muzzle;c.beginPath();c.ellipse(-3.5,9,7.5,6.5,0,0,TAU);c.ellipse(3.5,9,7.5,6.5,0,0,TAU);c.fill();}
  if(ic.wash){c.fillStyle=ic.wash;c.beginPath();c.ellipse(-8,-10,15,9,0,0,TAU);c.fill();}
  dummy.drawFaceInk(m,{...POSE,earUp:.6,pupil:.55,purr:0,mouth:0},ic);ctx=save;}

/* ================= loop ================= */
function resize(){const r=stage.getBoundingClientRect();cssW=Math.max(1,r.width);cssH=Math.max(1,r.height);DPR=Math.min(2,window.devicePixelRatio||1);
  PORTRAIT=cssH>cssW*1.05;CATK=PORTRAIT?1.38:1.15;
  if(PORTRAIT){W=470;H=Math.round(470*cssH/cssW);}else{H=600;W=Math.max(560,Math.round(600*cssW/cssH));}
  const k=W/cssW,dock=$('tools')?$('tools').getBoundingClientRect().height:60;
  FT=PORTRAIT?Math.round(Math.max(320,H*.3)):330;
  FB=PORTRAIT?Math.round(H-(dock+30)*k-10):H-10;
  cv.width=Math.round(cssW*DPR);cv.height=Math.round(cssH*DPR);offCv.width=cv.width;offCv.height=cv.height;layout();
  if(G.cat){G.cat.x=clamp(G.cat.x,45,W-45);G.cat.y=floorY(G.cat.y);}
  for(const p of G.puddles){p.x=clamp(p.x,40,W-40);p.y=floorY(p.y);}}
let last=performance.now(),uiT=0,saveT=0,uiDirty=true;
function frame(now){const dt=Math.min(1/30,Math.max(0,(now-last)/1000));last=now;G.t+=dt;step(dt);render(dt);
  uiT-=dt;if(uiT<=0){uiT=.15;renderHUD();if(uiDirty){renderPanels();uiDirty=false;}renderDev();}
  saveT-=dt;if(saveT<=0){saveT=5;save();}
  requestAnimationFrame(frame);}
function step(dt){const ptr=G.ptr;touchFx(dt);
  if(ptr.lx!==null&&ptr.in){const v=Math.hypot(ptr.x-ptr.lx,ptr.y-ptr.ly)/Math.max(dt,1e-3);ptr.speed=lerp(ptr.speed,v,.3);}else ptr.speed=lerp(ptr.speed,0,.3);
  ptr.lx=ptr.x;ptr.ly=ptr.y;ptr.stillT=ptr.speed<55?ptr.stillT+dt:0;
  const c=G.cat;
  if(ptr.down){ptr.downT+=dt;if(c&&ptr.petCat===c&&!c.held&&ptr.downT>.6&&ptr.moved<8&&G.tool==='hand'&&!['flee','startle','swat','door'].includes(c.beh)){c.petting=false;c.pickUp();}}
  if(ptr.down&&G.tool==='broom'&&c&&G.adopted&&!G.revoked&&G.door.state==='open'){const L=G.L;for(let i=G.puddles.length-1;i>=0;i--){const pd=G.puddles[i];if(Math.hypot(ptr.x-pd.x,(ptr.y-pd.y)*1.6)<52){G.puddles.splice(i,1);G.fx.puffs.push({x:pd.x,y:pd.y,t:0});log('你把地上的尿擦乾淨了。');}}
    if(G.dirt>0&&inRect(ptr.x,ptr.y,L.litter.x,L.litter.y-L.litter.d/2,L.litter.w/2+12,L.litter.d+12)){G.dirt=0;G.fx.rake=.8;log('你清好了貓砂盆。');}}
  if(!c||G.revoked||!G.adopted||G.paused)return;
  advanceGame(dt*G.speed);if(G.revoked)return;
  updateToy(dt);updateBall(dt);updateBug(dt);updateBird(dt);updateDoor(dt);
  c.update(dt,dt*G.speed);}
function render(dt){
  inkTick(dt);ctx.setTransform(DPR*cssW/W,0,0,DPR*cssH/H,0,0);drawBgInk();
  drawWindow();drawPuddles();
  const L=G.L,items=[{y:L.bed.y-L.bed.ry,f:drawBedBack},{y:L.bed.y+L.bed.ry*.7,f:drawBedFront},{y:L.box.y-L.box.d-1,f:drawBoxBack},{y:L.box.y,f:drawBoxFront},
    {y:L.litter.y-L.litter.d,f:drawLitterBack},{y:L.litter.y,f:drawLitterFront},{y:L.scr.y-20,f:drawScratcher},{y:L.food.y,f:()=>drawBowl(L.food,'food')},{y:L.water.y,f:()=>drawBowl(L.water,'water')},{y:G.ball.y,f:drawBall}];
  if(G.cat&&G.adopted&&!G.revoked)items.push({y:G.cat.held?H+1:G.cat.y,f:()=>{G.cat.draw();ctx.setTransform(DPR*cssW/W,0,0,DPR*cssH/H,0,0);}});
  if(G.bug&&G.bug.mode==='land')items.push({y:G.bug.y,f:drawBug});
  if(G.ftreat&&G.adopted)items.push({y:G.ftreat.y,f:()=>{const t=G.ftreat;ctx.fillStyle='rgba(60,30,20,.2)';ctx.beginPath();ctx.ellipse(t.x,t.y,12,3.5,0,0,TAU);ctx.fill();drawTreatIcon(t.x-3,t.y-6,.9);}});
  items.sort((a,b)=>a.y-b.y).forEach(i=>i.f());
  if(G.bug&&G.bug.mode!=='land')drawBug();
  drawLighting();drawFx(dt);snapLoupe();drawTouchFx(dt);drawAnim(dt);drawDoor();drawCursor();drawLoupe(dt);}

/* ================= input ================= */
function toLocal(e){const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
const inRect=(x,y,cx,cy,hw,hh)=>Math.abs(x-cx)<hw&&Math.abs(y-cy)<hh;
cv.addEventListener('pointermove',e=>{const q=toLocal(e),p=G.ptr;p.type=e.pointerType;if(e.pointerType==='mouse'||p.down){if(p.down)p.moved+=Math.hypot(q.x-p.x,q.y-p.y);p.x=q.x;p.y=q.y;p.in=true;if(p.lx===null){p.lx=q.x;p.ly=q.y;}}});
cv.addEventListener('pointerdown',e=>{closeMoments();if(!G.adopted||G.revoked)return;const q=toLocal(e),p=G.ptr,c=G.cat,L=G.L;p.type=e.pointerType;p.x=q.x;p.y=q.y;p.lx=q.x;p.ly=q.y;p.in=true;p.down=true;p.downT=0;p.moved=0;
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
  if(G.door.state==='closed'||G.door.state==='closing'){if(G.tool==='treat')leaveSnack();else knock(q.x,q.y);return;}
  if(G.tool==='wand'||G.tool==='broom')return;
  if(G.tool==='treat'){if(G.treats<=0){toast('零食沒了','每天會補 3 個。');return;}if(G.ftreat){toast('地上還有零食','先等牠吃掉那個。');return;}
    let tx=q.x,ty=floorY(q.y);if(c&&c.hit(q.x,q.y,1.4)){tx=clamp(c.head.x+c.facing*8*c.S,45,W-45);ty=floorY(c.y+3);}
    G.treats--;G.ftreat={x:tx,y:ty};c.decideT=0;log('你放了一個零食。');return;}
  if(G.tool==='hand'&&c&&c.hit(q.x,q.y,1.25)){p.petCat=c;
    if(c.m.annoy>.5){G.pokes=G.pokes.filter(t=>G.t-t<3);G.pokes.push(G.t);if(G.pokes.length>=3){G.pokes=[];buzz([30,40,30]);screenSwipe();c.m.annoy=Math.min(1,c.m.annoy+.25);c.remember('overpet',-.5,.6);log(`${c.name}受夠了，隔著螢幕拍了你一掌。`,true);p.petCat=null;}}
    return;}
  const b=G.ball;if(Math.hypot(q.x-b.x,q.y-(b.y-12))<26){p.grabBall=true;return;}
  if(inRect(q.x,q.y,L.food.x,L.food.y-12,34,26)){G.food=1;G.fx.pours.push({x:L.food.x,y:L.food.y-16,t:0});c.hear(L.food.x,L.food.y,.3);c.lastFill=G.t;c.feedHours[Math.floor(hour())]++;c.counts.feeds++;c.remember('fed',.3,.4);c.m.trust=Math.min(1,c.m.trust+.02);log('你倒了一碗飼料。');G.lastInteract=G.gmin;return;}
  if(inRect(q.x,q.y,L.water.x,L.water.y-12,32,24)){G.water=1;G.fx.pours.push({x:L.water.x,y:L.water.y-16,t:0,water:1});log('你換了一碗乾淨的水。');return;}
  if(inRect(q.x,q.y,L.litter.x,L.litter.y-L.litter.d/2,L.litter.w/2,L.litter.d)){if(G.dirt>0){G.dirt=0;G.fx.rake=.8;log('你鏟了貓砂。');}return;}
  for(let i=G.puddles.length-1;i>=0;i--){const pd=G.puddles[i];if(Math.hypot(q.x-pd.x,(q.y-pd.y)*2)<44){G.puddles.splice(i,1);G.fx.puffs.push({x:pd.x,y:pd.y,t:0});log('你擦掉了地上的尿。');return;}}
  if(inRect(q.x,q.y,L.box.x,L.box.y-L.box.h/2,L.box.w/2,L.box.h)){G.fx.ripples.push({x:q.x,y:L.box.y,t:0});c.hear(q.x,L.box.y,.6);if(c.beh==='hide'){c.m.fear+=.2*(1-c.q.bold);c.kick({mouth:4});}return;}
  if(q.y>FT-10){G.fx.ripples.push({x:q.x,y:floorY(q.y),t:0});c.hear(q.x,floorY(q.y));}});
const up=e=>{const p=G.ptr,c=G.cat;
  if(G.tool==='hand'&&c&&p.petCat===c&&!c.held&&p.downT<.3&&p.moved<8&&G.door.state==='open')openMoments(c);
  if(p.grabBall){p.grabBall=false;const b=G.ball;b.vx=clamp(b.vx,-900,900);b.vy=clamp(b.vy,-700,700);b.vz=Math.min(260,Math.hypot(b.vx,b.vy)*.25);}
  if(c&&c.held){c.drop(p.x,p.y+60*c.S);}
  p.down=false;p.petCat=null;if(e.pointerType!=='mouse')p.in=false;};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'){const p=G.ptr;if(G.cat&&G.cat.held)G.cat.drop(p.x,p.y+60);p.in=false;p.down=false;p.petCat=null;p.grabBall=false;}});

/* ================= UI ================= */
const ICON={
 hand:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5"/><path d="M14 11.5V5.5a1.5 1.5 0 0 1 3 0V14"/><path d="M8 12.5 6.6 11a1.6 1.6 0 0 0-2.4 2.1l3.3 4.4A6 6 0 0 0 12.3 20H14a5 5 0 0 0 5-5v-3.5a1.5 1.5 0 0 0-3 0"/></svg>',
 treat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 12c3-5 9-6 13-2l5-3v10l-5-3c-4 4-10 3-13-2z"/><circle cx="8" cy="11" r=".9" fill="currentColor"/></svg>',
 wand:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 3 9 14"/><path d="M9 14c-1 3-1 5 1 7M9 14c-3 1-5 1-7-1M9 14c-2 2-4 4-4 7"/></svg>',
 bowl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 11h18l-2 7H5z"/><path d="M8 8c1-2 3-2 4 0 1-2 3-2 4 0"/></svg>',
 drop:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
 sand:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 11h18v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="8" cy="14.5" r=".8" fill="currentColor"/><circle cx="12" cy="15" r=".8" fill="currentColor"/><circle cx="16" cy="14.3" r=".8" fill="currentColor"/></svg>',
 broom:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 3l-8 8"/><path d="M12 11c-3-.5-6.5 1.5-8 5.5l3.5 1 1 3.5c4-1.5 6-5 5.5-8z"/><path d="M7.5 17.5 10 15"/></svg>',
 moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
};
function buildTools(){$('tools').innerHTML=[['hand','摸摸'],['treat','零食'],['wand','逗貓棒'],['broom','清潔']].map(([k,l])=>`<button class="tool" data-t="${k}" aria-pressed="${G.tool===k}">${ICON[k]}<span>${l}</span>${k==='treat'?'<span class="cnt" id="trCnt"></span>':''}</button>`).join('');
  $('tools').querySelectorAll('.tool').forEach(b=>b.onclick=()=>{G.tool=b.dataset.t;G.toy.visible=false;$('tools').querySelectorAll('.tool').forEach(x=>x.setAttribute('aria-pressed',x.dataset.t===G.tool));});
  $('needs').innerHTML=[['full','飽足','bowl'],['hydra','水分','drop'],['clean','貓砂','sand'],['energy','精神','moon']].map(([k,l,i])=>`<div class="need" id="n_${k}">${ICON[i]}<span>${l}</span><i><b></b></i></div>`).join('');}
let capHTML='',capAt=0;
function renderHUD(){const c=G.cat;
  if(momentFor&&(!c||c.beh!==momentFor||G.t-momentT>7))closeMoments();
  $('clock').textContent=fmtT(G.gmin)+(cssW>480?`（${daypart(hour())}）`:'');
  if(!c)return;
  const vals={full:c.nd.full,hydra:c.nd.hydra,clean:clamp(1-G.dirt/6-G.puddles.length*.15,0,1),energy:1-c.m.fatigue};
  for(const k in vals){const el=$('n_'+k);if(!el)continue;el.querySelector('b').style.width=Math.round(vals[k]*100)+'%';el.classList.toggle('low',vals[k]<.35&&vals[k]>=.12);el.classList.toggle('crit',vals[k]<.12);}
  const tc=$('trCnt');if(tc)tc.textContent=`×${G.treats}`;
  const bn=$('banner');if(G.care.warn>0&&!G.revoked){bn.hidden=false;bn.className='banner'+(G.care.warn>=2?' crit':'');{const nt=needText(c);bn.textContent=nt?(G.care.warn>=2?`再不照顧，${c.name}會被接走：`:'')+nt:`照顧得很好，正在恢復中（還差約 ${Math.ceil(Math.max(0,G.care.neglect-8)/3)} 個遊戲小時）`;bn.className='banner'+(nt&&G.care.warn>=2?' crit':'')+(nt?'':' ok');}}else bn.hidden=true;
  const cap=caption(c),ce=$('caption');if(cap){const h=`<b>${cap[0]}</b>${cap[1]}`;if(h!==capHTML){capHTML=h;capAt=performance.now();ce.innerHTML=h;}ce.hidden=false;ce.classList.toggle('fade',performance.now()-capAt>6500);}else{ce.hidden=true;capHTML='';}
  $('stageChip').textContent=STAGES[c.stage].n;
  const ge=$('growEta');if(ge){const st=STAGES[c.stage];ge.textContent=c.stage<3?`再過約 ${Math.max(1,Math.ceil((st.to-c.ageDays)*24))} 個遊戲小時長成${STAGES[c.stage+1].n}。任務是選做的，不會卡住長大。`:'已經是老貓了。';}
  const gb=$('growBtn');if(gb)gb.hidden=c.stage>=3;}
function needText(c){const a=[];if(c.nd.full<.15)a.push('肚子餓，點紅色飯碗');if(c.nd.hydra<.15)a.push('沒水喝，點藍色水碗');if(G.dirt>=5)a.push('貓砂太髒，用「清潔」抹貓砂盆');if(G.puddles.length>=3)a.push('地上有尿，用「清潔」抹掉');return a.join('；');}
function caption(c){if(!G.adopted||G.revoked)return null;const b=c.beh,m=c.m,P=c.pose;
  if(G.door.state==='closed')return ['門關著','牠在裡面生悶氣。等一等，或在門口放個零食。'];
  if(c.lastReject&&G.t-c.lastReject<4)return ['還不讓你摸','牠還不夠信任你。把手停在牠附近不動，或用零食餵牠，等牠自己走過來再摸。'];
  if(G.puddles.length&&G.t%12<4)return ['地上有尿','選「清潔」在水漬上抹一下就乾淨了。看到牠低頭繞圈時，長按抱去貓砂盆。'];
  if(c.held)return c.squirm>.3?['想下來','腳一直蹬、耳朵往後：快放牠下來。']:['被抱著','身體放鬆、尾巴垂著：還能接受。'];
  if(b==='potty'&&c.bd.phase==='seek')return ['想上廁所','低頭聞地板、原地繞圈。長按抱牠去貓砂盆，可以幫牠學會。'];
  if(b==='potty'&&c.bd.phase==='squatF')return ['尿在外面了','還沒學會貓砂盆。下次看到牠繞圈就抱過去。'];
  if(b==='petted'&&!(m.petBudget>0&&m.annoy<.35))return ['摸夠了','耳朵壓向兩側、尾巴用力甩：快停手。'];
  if(b==='petted')return ['很舒服','眼睛瞇起來、喉嚨呼嚕呼嚕。'];
  if(c.slowBlink>0)return ['慢慢眨眼','貓用這個表示「我信任你」。'];
  if(b==='stalk'&&P.wiggle>.3)return ['要撲了','身體壓低、屁股左右扭。'];
  if(m.fear>.4)return ['嚇到了','耳朵往後、身體壓低、尾巴膨起來。'];
  if(b==='door')return ['生氣了','牠正走向門口……'];
  if(b==='beg')return ['肚子餓','坐在空碗旁邊叫你。點飯碗就能倒飼料。'];
  if(b==='hide')return ['躲起來','窩在紙箱裡，只露出眼睛。'];
  if(b==='nap'&&c.eyeO<.1)return [c.bd.spot&&c.bd.spot.k==='sun'?'曬著太陽睡':'睡著了','輕輕摸，或讓牠好好睡。有些貓被吵醒會記仇。'];
  if(b==='knead')return ['踩踩','前腳一踩一踩：放鬆又滿足，像小時候喝奶。'];
  if(b==='rub')return ['蹭你','用臉頰蹭你的手：把味道留在你身上，代表你是自己人。'];
  if(b==='approach'&&P.tailUp>1.2)return ['打招呼','尾巴豎直走過來：友善又開心。'];
  if(b==='approach'&&c.bd.go===false)return ['小心靠近','走走停停、抬著一隻腳：想靠近又有點怕。'];
  if(b==='observe')return ['觀察你','耳朵朝前、眼睛盯著：還在判斷你安不安全。'];
  if(b==='avoid')return ['保持距離','牠需要自己的空間，別追。'];
  if(b==='sit'&&c.bd.back)return ['背對你坐著','坐在旁邊卻不看你。這是傲嬌的親近。'];
  if(b==='watch'&&c.attn.kind==='bird')return ['看窗外的鳥','下巴微微發抖、發出喀喀聲：獵人本能。'];
  if(b==='greet')return ['迎接你','跑過來叫一聲。'];
  if(b==='tailchase')return ['追自己的尾巴','精力太多的小貓最愛玩這個。'];
  if(b==='loaf')return ['母雞蹲','前腳收在身體下面：放鬆，但還醒著。'];
  if(b==='stretch')return ['伸懶腰','先伸前腳、翹屁股，再打個大哈欠。'];
  if(b==='explore')return ['到處聞聞','巡視自己的地盤，確認一切都好。'];
  if(b==='window')return ['看窗外',G.bird?'有鳥！下巴在發抖、發出喀喀聲。':'看外面的天空和樹。'];
  if(b==='scratch')return ['磨爪子','伸長身體磨爪：保養爪子，也在宣示地盤。'];
  return null;}
function renderPanels(){const c=G.cat;if(!c)return;
  $('catName').textContent=c.name;drawPortrait($('avatar'),c.coatId,c.stage);
  const a=c.ageDays;$('ageTxt').textContent=`出生第 ${Math.floor(a)+1} 天`;
  $('lifebar').innerHTML=STAGES.map((s,i)=>{const f=i<c.stage?1:i>c.stage?0:clamp((a-s.from)/(s.to-s.from),0,1);return `<div class="${i===c.stage?'cur':''}"><i><b style="width:${Math.round(f*100)}%"></b></i>${s.n}</div>`;}).join('');
  $('tasks').innerHTML=TASKS[c.stage].map(([id,l])=>{const d=c.tasks[c.stage+':'+id];return `<li class="${d?'done':''}"><span class="ck">${d?'✓':''}</span><span>${l}</span></li>`;}).join('');
  $('growNotes').innerHTML=c.notes.slice(0,3).map(n=>`<div class="note">長成${STAGES[n.stage].n}：${n.text}</div>`).join('')||`<div class="note">${['幼貓還不會用貓砂盆。看到牠低頭繞圈時，長按把牠抱過去。','少年貓精力旺盛，多陪牠玩。','成貓的性格已經定型，你們之間的習慣會留在牠的記憶裡。','老貓喜歡安靜，陪牠曬太陽就好。'][c.stage]}</div>`;
  $('firstImp').textContent=`第一印象：${ARCH.find(x=>x.id===c.arch).hint}。`;
  $('traits').innerHTML=c.traits.map(t=>c.revealed[t]?`<div class="trait on"><b>${TRAITS[t].n}</b><span>${TRAITS[t].d}</span></div>`:`<div class="trait"><b>？？？</b><span>還沒發現。多觀察牠在不同情況下的反應。</span></div>`).join('');
  const mem=[...c.mem].sort((x,y)=>y.s-x.s).slice(0,6);
  $('mems').innerHTML=mem.length?mem.map(e=>{const t=MEM_TXT[e.k]||['',''];let s=t[0].replace('{h}',daypart(e.h));if(t[1]&&(e.v>0||c.has('grudge')||e.s>.6))s+=t[1];
    return `<li style="opacity:${(.35+.65*clamp(e.s,0,1)).toFixed(2)}"><span class="dot" style="background:var(${e.v<0?'--m-annoy':'--m-trust'})"></span>${s}<small>${fmtAgo(e.t)}</small></li>`;}).join(''):'<li class="empty">還沒有特別記住的事。</li>';
  const fh=c.feedHabit();if(fh!==null)$('mems').insertAdjacentHTML('beforeend',`<li><span class="dot" style="background:var(--m-play)"></span>知道你通常在${daypart(fh)}倒飯。<small>習慣</small></li>`);
  $('log').innerHTML=G.journal.slice(0,40).map(j=>`<li class="${j.big?'big':''}"><time>${fmtShort(j.g)}</time><span>${j.text}</span></li>`).join('');}
const fmtShort=g=>`D${Math.floor(g/1440)+1} ${String(Math.floor((g/60)%24)).padStart(2,'0')}:${String(Math.floor(g%60)).padStart(2,'0')}`;
function fmtAgo(t){const d=G.gmin-t;if(d<60)return '剛剛';if(d<1440)return `${Math.floor(d/60)} 小時前`;return `${Math.floor(d/1440)} 天前`;}
const DEVB=[['trust','信任','--m-trust',c=>c.m.trust],['te','實際信任','--m-trust',c=>c.te()],['grudge','積怨','--m-grudge',c=>c.grudge()],['fear','警戒','--m-fear',c=>c.m.fear],['annoy','煩躁','--m-annoy',c=>c.m.annoy],['play','玩興','--m-play',c=>c.m.play],['fatigue','疲倦','--m-tired',c=>c.m.fatigue],['bladder','尿意','--m-fear',c=>c.nd.bladder],['litter','砂盆技能','--m-play',c=>c.litter.skill],['neglect','照顧欠缺','--m-annoy',()=>G.care.neglect/36]];
const AX=[['soc','親人'],['bold','膽量'],['energy','活力'],['play','玩心'],['tol','耐摸度']];
function buildDev(){$('devBars').innerHTML=DEVB.map(([k,l,v])=>`<div class="bar"><span>${l}</span><i><b id="db_${k}" style="background:var(${v})"></b></i><output id="dv_${k}"></output></div>`).join('');
  $('devSliders').innerHTML=AX.map(([k,l])=>`<div class="sl"><label for="ax_${k}">${l}</label><input type="range" id="ax_${k}" min="0" max="100"><output id="axo_${k}"></output></div>`).join('');
  for(const [k] of AX)$('ax_'+k).addEventListener('input',e=>{if(G.cat){G.cat.p[k]=e.target.value/100;$('axo_'+k).textContent=e.target.value;}});
  $('dNext').onclick=()=>{const c=G.cat;if(!c)return;const nx=STAGES[Math.min(3,c.stage+1)].from;c.born=G.gmin-nx*1440-1;};
  $('dDoor').onclick=()=>{const c=G.cat;if(!c||G.door.state!=='open')return;c.m.annoy=1;c.remember('overpet',-.6,.8);c.decideT=0;};
  $('dBug').onclick=()=>spawnBug();
  $('dHungry').onclick=()=>{fastForward(24,true);};
  $('dNew').onclick=()=>{G.adopted=false;showAdopt();};}
function syncDevSliders(){const c=G.cat;if(!c)return;for(const [k] of AX){$('ax_'+k).value=Math.round(c.p[k]*100);$('axo_'+k).textContent=Math.round(c.p[k]*100);}}
function renderDev(){if(!DEV||bookTab!=='dev'||$('book').hidden||!G.cat)return;const c=G.cat;
  for(const [k,,,f] of DEVB){const v=clamp(f(c),0,1);$('db_'+k).style.width=Math.round(v*100)+'%';$('dv_'+k).textContent=v.toFixed(2);}
  $('devScores').innerHTML=c.scores.map(([k,v],i)=>`<div class="${k===c.beh?'w':''}"><span>${BEH_LABEL[k]||k}</span><span>${v.toFixed(2)}</span></div>`).join('')||'<div><span>等待中</span></div>';
  $('devBeh').textContent=`目前：${BEH_LABEL[c.beh]||c.beh}　注意力：${({hand:'你的手',toy:'逗貓棒',ball:'毛線球',bug:'小蟲',bird:'窗外的鳥',sound:'聲音',room:'四處張望'})[c.attn.kind]||c.attn.kind}`;}

/* ================= portraits, adoption ================= */
function drawPortrait(canvas,coatId,stage=0){drawPortraitInk(canvas,coatId,stage);}
function makeCatData(arch,coat){const a=ARCH.find(x=>x.id===arch);const p={};for(const k in a.p)p[k]=clamp(a.p[k]+rnd(-.08,.08),0,1);
  const keys=Object.keys(TRAITS);let tr;for(let n=0;n<30;n++){tr=[pick(keys),pick(keys)];if(tr[0]===tr[1])continue;if(BAD_PAIRS.some(([x,y])=>tr.includes(x)&&tr.includes(y)))continue;if(arch==='cool'&&tr.includes('clingy'))continue;break;}
  return {name:pick(NAMES[coat]),coat,arch,p,traits:tr,born:G.gmin-.3*1440,x:W*.45,y:470};}
let adoptOpts=[];
function showAdopt(){const ov=$('overlay');ov.hidden=false;const archs=[...ARCH].sort(()=>Math.random()-.5).slice(0,3),coats=Object.keys(COATS).sort(()=>Math.random()-.5);
  adoptOpts=archs.map((a,i)=>makeCatData(a.id,coats[i]));
  ov.innerHTML=`<div class="sheet"><h2>選一隻小貓，帶回牠的窩</h2><p>你看不到牠們的性格，只看得到牠們現在在做什麼。性格是天生的，要靠你慢慢發現。</p>
  <div class="adopt">${adoptOpts.map((o,i)=>`<button class="kit" data-i="${i}"><canvas width="192" height="192"></canvas><span class="nm">${o.name}</span><span class="hint">${ARCH.find(x=>x.id===o.arch).hint}</span></button>`).join('')}</div></div>`;
  ov.querySelectorAll('.kit').forEach((b,i)=>{drawPortrait(b.querySelector('canvas'),adoptOpts[i].coat,0);b.onclick=()=>adopt(adoptOpts[i]);});}
function adopt(d){G.gmin=8*60;d.born=G.gmin-.3*1440;Object.assign(G,{food:.8,water:1,dirt:0,puddles:[],treats:3,ftreat:null,journal:[],revoked:false,adopted:true,lastInteract:-9999});
  G.care={neglect:0,warn:0,streak:0,badToday:false};G.door={k:0,state:'open',until:0,knocks:[],snack:false,shake:0,paw:0};
  G.cat=new Cat(d);G.cat.x=W*.3;G.cat.y=480;$('overlay').hidden=true;log(`${d.name}來到了牠的窩。`,true);toast('新家',`${d.name}來了。牠還小，還不會用貓砂盆。`);
  uiDirty=true;syncDevSliders();save();let seen=false;try{seen=!!localStorage.getItem('nest-guide-seen');}catch(_){}if(!seen)setTimeout(()=>openGuide(0),600);}
function showRevoked(){const c=G.cat,ov=$('overlay');ov.hidden=false;
  ov.innerHTML=`<div class="sheet"><h2>${c.name}被接走了</h2><p>${c.name}太久沒有被好好照顧（${needText(c)}），救助站的人把牠帶走了。你的養貓權限被收回。</p>
  <p>牠在你這裡住了 ${Math.max(1,Math.floor(c.ageDays-.3)+1)} 天，最後記得的事：「${(MEM_TXT[(c.mem.sort((a,b)=>b.s-a.s)[0]||{k:'neglect'}).k]||MEM_TXT.neglect)[0].replace('{h}','')}」</p>
  <div><button class="btn primary" id="reAdopt">重新申請領養</button></div></div>`;$('reAdopt').onclick=()=>{G.adopted=false;showAdopt();};}


/* ================= guide ================= */
let gIdx=0;
function openGuide(i){const g=$('guide');if(typeof i==='number')gIdx=i;G.paused=true;g.hidden=false;
  g.innerHTML=`<div class="gbox"><div class="ghead"><div><h2 id="gTitle" style="display:inline">怎麼玩</h2><span class="sub">閱讀時時間會暫停</span></div><button class="btn primary" id="gClose">回到窩裡</button></div>
  <nav class="gnav" aria-label="教程章節">${GUIDE.map((s,k)=>`<button data-k="${k}" aria-current="${k===gIdx}"><i>${k+1}</i>${s[1]}</button>`).join('')}</nav>
  <div class="gbody" id="gBody"></div></div>`;
  g.querySelectorAll('.gnav button').forEach(b=>b.onclick=()=>showGuide(+b.dataset.k));
  $('gClose').onclick=closeGuide;g.onclick=e=>{if(e.target===g)closeGuide();};
  showGuide(gIdx);$('gClose').focus();}
function showGuide(k){gIdx=k;const sec=GUIDE[k];
  $('gBody').innerHTML=`<section class="gsec"><h3>${sec[1]}</h3>${sec[2]}<div class="gfoot">${k>0?`<button class="btn" id="gPrev">← ${GUIDE[k-1][1]}</button>`:'<span></span>'}${k<GUIDE.length-1?`<button class="btn primary" id="gNext">${GUIDE[k+1][1]} →</button>`:'<button class="btn primary" id="gDone">開始玩</button>'}</div></section>`;
  $('gBody').scrollTop=0;
  document.querySelectorAll('.gnav button').forEach(b=>{const on=+b.dataset.k===k;b.setAttribute('aria-current',on);if(on)b.scrollIntoView({block:'nearest',inline:'nearest'});});
  const pv=$('gPrev'),nx=$('gNext'),dn=$('gDone');if(pv)pv.onclick=()=>showGuide(k-1);if(nx)nx.onclick=()=>showGuide(k+1);if(dn)dn.onclick=closeGuide;}
function closeGuide(){$('guide').hidden=true;G.paused=false;last=performance.now();try{localStorage.setItem('nest-guide-seen','1');}catch(_){}}
document.addEventListener('keydown',e=>{if($('guide').hidden)return;if(e.key==='Escape')closeGuide();if(e.key==='ArrowRight'&&gIdx<GUIDE.length-1)showGuide(gIdx+1);if(e.key==='ArrowLeft'&&gIdx>0)showGuide(gIdx-1);});

/* ================= fast forward & persistence ================= */
function fastForward(hours,noCare){const c=G.cat;if(!c||G.revoked)return;const steps=Math.round(hours*60/.5),tally={},ptr=G.ptr,pin=ptr.in,ptool=G.tool;ptr.in=false;G.ff=true;G.tool='hand';
  if(noCare){G.food=0;G.water=0;c.nd.full=Math.min(c.nd.full,.1);}
  const startG=G.gmin;
  for(let i=0;i<steps&&!G.revoked;i++){G.t+=.25;advanceGame(.5);if(G.revoked)break;updateBall(.25);updateDoor(.25);c.update(.25,.5);const k=c.inside?'door':c.beh;tally[k]=(tally[k]||0)+.5;}
  G.ff=false;ptr.in=pin;G.tool=ptool;if(G.revoked)return;
  if(G.door.state==='closing'){G.door.k=1;G.door.state='closed';c.inside=true;}
  const label={nap:'睡覺',eat:'吃飯',drink:'喝水',wander:'閒晃',groom:'理毛',hide:'躲在紙箱',potty:'上廁所',scratch:'磨爪子',stalk:'玩毛線球',bat:'玩毛線球',pounce:'玩毛線球',beg:'在空碗旁等飯',sit:'發呆',watch:'看窗外',zoom:'暴衝',door:'關著門',explore:'到處聞聞',window:'看窗外',loaf:'窩著休息',tailchase:'追尾巴'};
  const agg={};for(const k in tally){const l=label[k];if(l)agg[l]=(agg[l]||0)+tally[k];}
  const top=Object.entries(agg).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([l,m])=>`${l}約 ${m>=60?(m/60).toFixed(1)+' 小時':Math.round(m)+' 分鐘'}`);
  log(`你不在的 ${Math.round((G.gmin-startG)/60)} 小時裡，${c.name}${top.join('、')}。`,true);
  if(!c.inside){c.setBeh(c.q.soc>.5&&c.te()>.4&&c.beh!=='nap'?'greet':c.beh);}
  uiDirty=true;}
const SKEY='nest-cat-v2';
function save(){if(!G.cat)return;try{localStorage.setItem(SKEY,JSON.stringify({at:Date.now(),gmin:G.gmin,speed:G.speed,food:G.food,water:G.water,dirt:G.dirt,puddles:G.puddles,treats:G.treats,care:G.care,journal:G.journal.slice(0,60),revoked:G.revoked,cat:G.cat.save(),door:{until:G.door.until,state:G.door.state==='closed'||G.door.state==='closing'?'closed':'open'}}));}catch(_){}}
function load(){let s=null;try{s=JSON.parse(localStorage.getItem(SKEY)||'null');}catch(_){s=null;}if(!s||!s.cat)return false;
  Object.assign(G,{gmin:s.gmin,speed:s.speed||10,food:s.food,water:s.water,dirt:s.dirt,puddles:s.puddles||[],treats:s.treats??3,care:s.care,journal:s.journal||[],revoked:s.revoked,adopted:true});
  G.cat=new Cat(s.cat);G.cat.x=clamp(G.cat.x,45,W-45);
  if(s.door&&s.door.state==='closed'){G.door.state='closed';G.door.k=1;G.door.until=s.door.until;G.cat.inside=true;}
  document.querySelectorAll('.seg button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.sp===G.speed));
  if(G.revoked){showRevoked();return true;}
  const away=Math.min(12,(Date.now()-s.at)/1000*G.speed/60);if(away>.25)fastForward(away);
  return true;}

/* ================= boot ================= */
document.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{G.speed=+b.dataset.sp;document.querySelectorAll('.seg button').forEach(x=>x.setAttribute('aria-pressed',x===b));});
$('ffBtn').onclick=()=>fastForward(3);
$('growBtn').onclick=()=>{const c=G.cat;if(!c||c.stage>=3)return;c.born=G.gmin-STAGES[c.stage+1].from*1440-1;uiDirty=true;};
$('helpBtn').onclick=()=>{closeMenu();openGuide();};
/* ---- notebook (drawer on wide screens, bottom sheet on phones) & menu ---- */
let bookTab='grow';
function setTab(t){bookTab=t;document.querySelectorAll('#book [role=tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));document.querySelectorAll('#book .tabp').forEach(p=>p.hidden=p.dataset.p!==t);if(t==='dev')syncDevSliders();uiDirty=true;}
function openBook(t){closeMenu();if(t)setTab(t);$('book').hidden=false;$('scrim').hidden=false;uiDirty=true;}
function closeBook(){$('book').hidden=true;if($('menu').hidden)$('scrim').hidden=true;}
function closeMenu(){$('menu').hidden=true;if($('book').hidden)$('scrim').hidden=true;}
$('devTab').hidden=!DEV;
document.querySelectorAll('#book [role=tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$('bookBtn').onclick=()=>$('book').hidden?openBook():closeBook();
$('whoBtn').onclick=()=>openBook('grow');
$('bookClose').onclick=closeBook;
$('menuBtn').onclick=()=>{if($('menu').hidden){closeBook();$('menu').hidden=false;$('scrim').hidden=false;}else closeMenu();};
$('scrim').onclick=()=>{closeBook();closeMenu();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('guide').hidden){closeBook();closeMenu();}});
$('ffBtn').addEventListener('click',closeMenu);
{let sy=null;const bk=$('book');bk.addEventListener('touchstart',e=>{const t=e.target.closest('.bookhd,.tabs');sy=t||e.target===bk?e.touches[0].clientY:null;},{passive:true});
 bk.addEventListener('touchend',e=>{if(sy!=null&&e.changedTouches[0].clientY-sy>70)closeBook();sy=null;},{passive:true});}
resize();buildTools();buildDev();
if(!load())showAdopt();else{syncDevSliders();toast('回到窩裡',`${G.cat.name}在家等你。`);}
uiDirty=true;
new ResizeObserver(resize).observe(stage);

document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
document.fonts&&document.fonts.ready.then(()=>{bgDirty=true;});
if(DEV){window.__G=G;window.__W=()=>W;}
requestAnimationFrame(frame);

