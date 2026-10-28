// 手繪線條工具與貓的幾何形狀
import {clamp,TAU,reduceMotion} from './utils.js';
/* ================= ink toolkit ================= */
export const INK='#2c2723',PAPER='#fbf6ec';
export const INKC={
 cream:{fill:'#f8e4cc',far:'#ecd0b0',wash:'rgba(240,160,90,.42)',stripe:'rgba(120,70,35,.55)',eye:'#c99f24'},
 blue:{fill:'#e1e4ea',far:'#c9ced8',wash:'rgba(110,125,150,.32)',eye:'#e2b03a'},
 tux:{fill:'#4a4651',far:'#38343e',chest:'rgba(251,246,236,.97)',muzzle:'rgba(251,246,236,.97)',dark:true,eye:'#a5d65e'},
 tabby:{fill:'#ead6bc',far:'#d8bf9f',wash:'rgba(150,100,60,.38)',stripe:'rgba(70,45,25,.62)',eye:'#bad04e'},
 black:{fill:'#47434d',far:'#37333c',dark:true,eye:'#efb93c'},
 snow:{fill:'#fffdf9',far:'#efe8df',wash:'rgba(170,185,210,.22)',eye:'#7fb2d9'},
};
export const hsh=(i,s)=>{const x=Math.sin(i*12.9898+s*78.233)*43758.5453;return x-Math.floor(x);};
export let inkSeed=0,inkClock=0;
export function inkTick(dt){if(reduceMotion)return;inkClock+=dt;if(inkClock>1/8){inkClock=0;inkSeed=(inkSeed+1)%997;}}
export function jit(pts,sd,amp=1){if(amp<=0)return pts;return pts.map((p,i)=>[p[0]+(hsh(i,sd+inkSeed)-.5)*2*amp,p[1]+(hsh(i+97,sd+inkSeed)-.5)*2*amp]);}
export function spath(c,pts,close=true){c.beginPath();const n=pts.length;
  if(close){for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(i===0)c.moveTo((pts[n-1][0]+a[0])/2,(pts[n-1][1]+a[1])/2);c.quadraticCurveTo(a[0],a[1],m[0],m[1]);}c.closePath();}
  else{c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<n-1;i++){const m=[(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2];c.quadraticCurveTo(pts[i][0],pts[i][1],m[0],m[1]);}c.lineTo(pts.at(-1)[0],pts.at(-1)[1]);}}
export function lpath(c,pts,close=true){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(close)c.closePath();}
export const ellPts=(cx,cy,rx,ry,n=26,a0=0,a1=TAU)=>{const p=[];const full=a1-a0>=TAU-1e-6;const cnt=full?n:n+1;for(let i=0;i<cnt;i++){const a=a0+(a1-a0)*i/(full?n:n);p.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}return p;};
export const segPts=(pts,per=4)=>{const o=[];for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];for(let k=0;k<per;k++){const t=k/per;o.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}return o;};
export const lineSeg=(pts,per=4)=>{const o=[];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];for(let k=0;k<per;k++){const t=k/per;o.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}o.push(pts.at(-1));return o;};
/* shape = filled + inked; polygon corners stay crisp-ish via segmenting */
export function ink(c,pts,sd,{fill=null,lw=1.8,amp=1,close=true,smooth=true,alpha=1}={}){
  if(fill){c.fillStyle=fill;(smooth?spath:lpath)(c,pts,close);c.fill();}
  c.globalAlpha=alpha;c.strokeStyle=INK;c.lineWidth=lw;c.lineJoin='round';c.lineCap='round';(smooth?spath:lpath)(c,jit(pts,sd,amp),close);c.stroke();c.globalAlpha=1;}
export function inkL(c,pts,sd,lw=1.6,amp=.8,alpha=1){ink(c,pts,sd,{lw,amp,close:false,alpha});}
export const box4=(x0,y0,x1,y1)=>segPts([[x0,y0],[x1,y0],[x1,y1],[x0,y1]],4);
/* cat geometry */
export function limbPts(j,p,L,bend){const dx=p[0]-j[0],dy=p[1]-j[1],d=Math.max(.01,Math.hypot(dx,dy)),dd=Math.min(d,2*L-.01),h=Math.sqrt(Math.max(0,L*L-(dd/2)**2));
  const k=[j[0]+dx/2+(-dy/d)*h*bend,j[1]+dy/2+(dx/d)*h*bend];const pts=[];for(let i=0;i<=6;i++){const t=i/6;pts.push([(1-t)*(1-t)*j[0]+2*(1-t)*t*k[0]+t*t*p[0],(1-t)*(1-t)*j[1]+2*(1-t)*t*k[1]+t*t*p[1]]);}return pts;}
export function torsoPts(sk){const {Sx,Sy,Hx,Hy,sit}=sk,arch=clamp(sk.arch,0,1.2),r1=17+3*sit,r2=15,ang=Math.atan2(Sy-Hy,Sx-Hx),nx=Math.sin(ang),ny=-Math.cos(ang),mx=(Hx+Sx)/2,my=(Hy+Sy)/2,top=(r1+r2)/2*1.12+arch*20,bot=(r1+r2)/2*1.08;
  const q=(a,c,b,t)=>[(1-t)*(1-t)*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*c[1]+t*t*b[1]];const P=[];
  const A=[Hx+nx*r1,Hy+ny*r1],B=[Sx+nx*r2,Sy+ny*r2],C=[Sx-nx*r2,Sy-ny*r2],D=[Hx-nx*r1,Hy-ny*r1];
  for(let i=0;i<10;i++)P.push(q(A,[mx+nx*top,my+ny*top],B,i/10));
  for(let i=0;i<10;i++){const a=ang-Math.PI/2+i/10*Math.PI;P.push([Sx+Math.cos(a)*r2,Sy+Math.sin(a)*r2]);}
  for(let i=0;i<10;i++)P.push(q(C,[mx-nx*bot,my-ny*bot],D,i/10));
  for(let i=0;i<10;i++){const a=ang+Math.PI/2+i/10*Math.PI;P.push([Hx+Math.cos(a)*r1,Hy+Math.sin(a)*r1]);}
  return P;}
export function earPts(side,yaw,up,kit){const bx=side*12.5+yaw*5,by=-12,flat=clamp(-up,0,1.2),rot=side*(.16+(1-clamp(up,-1,1))*.52),h=18.5*(1-.42*flat)*(1-.15*Math.max(0,-side*yaw))*(kit?1.1:1);
  const pts=[[-9,3],[-6.5,-h*.5],[side*1.5,-h],[6.5,-h*.5],[9,3]],c=Math.cos(rot),s=Math.sin(rot),out=[];
  for(let i=0;i<pts.length-1;i++)for(let k=0;k<3;k++){const t=k/3,a=pts[i],b=pts[i+1];out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}out.push(pts.at(-1));
  return out.map(([x,y])=>[bx+x*c-y*s,by+x*s+y*c]);}
export function headPts(yaw){const p=[];for(let i=0;i<32;i++){const a=i/32*TAU,s=Math.sin(a);p.push([Math.cos(a)*(23+Math.max(0,s)*3)+yaw*Math.max(0,s)*2,s*19.5+Math.max(0,s)*2]);}return p;}
export const INKW=1.5;
export function inkPart(c,p){c.setTransform(p.m);c.lineJoin='round';c.lineCap='round';c.strokeStyle=INK;c.fillStyle=INK;const pts=jit(p.pts,p.sd,.9);
  if(p.k==='poly'){spath(c,pts);c.lineWidth=INKW*2*(1+(hsh(p.sd,inkSeed)-.5)*.4);c.stroke();c.fill();}else{spath(c,pts,false);c.lineWidth=p.w+INKW*2;c.stroke();}}
export function fillPart(c,p,col){c.setTransform(p.m);c.lineJoin='round';c.lineCap='round';c.fillStyle=col;c.strokeStyle=col;
  if(p.k==='poly'){spath(c,p.pts);c.fill();}else{spath(c,p.pts,false);c.lineWidth=p.w;c.stroke();}}
export const offCv=document.createElement('canvas'),offX=offCv.getContext('2d');

