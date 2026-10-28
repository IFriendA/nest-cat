// 共用小工具
export const clamp=(v,a,b)=>v<a?a:v>b?b:v;
export const lerp=(a,b,t)=>a+(b-a)*t;
export const rnd=(a,b)=>a+Math.random()*(b-a);
export const pick=a=>a[Math.floor(Math.random()*a.length)];
export const TAU=Math.PI*2;
export const $=id=>document.getElementById(id);
export const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
export const DEV=new URLSearchParams(location.search).has('dev');
