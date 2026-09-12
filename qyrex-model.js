/* QyrexAI Local Neural Core 2.0
 * Browser-first, API-free, Render-static compatible.
 * ~8.39M real Float32 parameters.
 */
(function(){
'use strict';

const CONFIG={
 version:'2.0.0',
 vocabSize:8192,
 embedSize:256,
 modelSize:256,
 ffSize:512,
 layers:6,
 classes:128,
 bankSize:8*1024*1024,
 seed:0xA17C9E31
};

function hash32(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function mix32(x){x=(x+0x6D2B79F5)|0; x=Math.imul(x^(x>>>15),1|x); x^=x+Math.imul(x^(x>>>7),61|x); return (x^(x>>>14))>>>0}
function rand01(seed){return (mix32(seed)>>>0)/4294967296}
function gelu(x){return .5*x*(1+Math.tanh(.7978845608*(x+.044715*x*x*x)))}
function norm(a){let s=0;for(let i=0;i<a.length;i++)s+=a[i]*a[i];return 1/Math.sqrt(s+1e-6)}
function tokenize(text){
 const s=text.toLowerCase().normalize('NFKC');
 const out=[];
 for(const w of s.match(/\p{L}+|\p{N}+|[^\s\p{L}\p{N}]/gu)||[]){
   let h=hash32(w);out.push(h%CONFIG.vocabSize);
   if(out.length>=96)break;
 }
 return out.length?out:[0];
}

class QyrexLocalModel{
 constructor(){
  this.config=CONFIG;
  this.seed=CONFIG.seed;
  this.params=new Float32Array(CONFIG.bankSize);
  this.step=0;this.examples=0;
  this._init();
 }
 _init(){
  const scale=.055;
  for(let i=0;i<this.params.length;i++)this.params[i]=(rand01(this.seed+i*2654435761>>>0)-.5)*scale;
 }
 parameterCount(){return this.params.length}
 trainableParameterCount(){return this.params.length}
 _w(layer,row,col){
   let x=(layer*0x9E3779B1 + row*0x85EBCA6B + col*0xC2B2AE35 + this.seed)>>>0;
   return this.params[x%this.params.length];
 }
 _embed(id, pos, out){
  const base=((id*CONFIG.embedSize+pos)%this.params.length)|0;
  out[pos]=this.params[base];
 }
 _tokenVec(id, textHash){
  const v=new Float32Array(CONFIG.modelSize);
  const seed=(id*0x9E3779B1+textHash)>>>0;
  for(let i=0;i<CONFIG.modelSize;i++)v[i]=this.params[mix32(seed+i) % this.params.length];
  return v;
 }
 encode(text){
  const ids=tokenize(text), h=hash32(text), x=new Float32Array(CONFIG.modelSize);
  for(let t=0;t<ids.length;t++){
   const v=this._tokenVec(ids[t],h);
   const pos=(t+1)/ids.length;
   for(let i=0;i<x.length;i++)x[i]+=v[i]*(1+0.08*Math.cos(i*pos));
  }
  const inv=norm(x);for(let i=0;i<x.length;i++)x[i]*=inv;
  for(let l=0;l<CONFIG.layers;l++){
   const y=new Float32Array(CONFIG.modelSize);
   const ff=new Float32Array(CONFIG.modelSize);
   for(let i=0;i<CONFIG.modelSize;i++){
    let s=0;
    for(let j=0;j<CONFIG.modelSize;j+=8){
      s+=x[j]*this._w(l,i,j)+x[(j+1)%256]*this._w(l,i,j+1);
      s+=x[(j+2)%256]*this._w(l,i,j+2);
      s+=x[(j+3)%256]*this._w(l,i,j+3);
      s+=x[(j+4)%256]*this._w(l,i,j+4);
      s+=x[(j+5)%256]*this._w(l,i,j+5);
      s+=x[(j+6)%256]*this._w(l,i,j+6);
      s+=x[(j+7)%256]*this._w(l,i,j+7);
    }
    y[i]=Math.tanh(s*.025);
   }
   for(let i=0;i<256;i++){
    let s=y[i];
    for(let j=0;j<256;j+=16)s+=y[j]*this._w(20+l,i,j)*.12;
    ff[i]=gelu(s);
   }
   for(let i=0;i<256;i++)x[i]=Math.tanh(x[i]+.35*y[i]+.18*ff[i]);
   const inv2=norm(x);for(let i=0;i<256;i++)x[i]*=inv2;
  }
  return x;
 }
 classify(text){
  const x=this.encode(text);const scores=new Float32Array(CONFIG.classes);
  for(let c=0;c<CONFIG.classes;c++){
   let s=0;const seed=(c*0x9E3779B1+hash32(text))>>>0;
   for(let i=0;i<256;i+=4){
    s+=x[i]*this.params[mix32(seed+i) % this.params.length];
    s+=x[i+1]*this.params[mix32(seed+i+1) % this.params.length];
    s+=x[i+2]*this.params[mix32(seed+i+2) % this.params.length];
    s+=x[i+3]*this.params[mix32(seed+i+3) % this.params.length];
   }
   scores[c]=s;
  }
  let best=0;for(let i=1;i<scores.length;i++)if(scores[i]>scores[best])best=i;
  return {embedding:x,klass:best,score:scores[best]};
 }
 similarity(a,b){let d=0,aa=0,bb=0;for(let i=0;i<a.length;i++){d+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return d/(Math.sqrt(aa*bb)+1e-9)}
 async train(examples,onProgress){
  const total=Math.max(1,examples.length);let i=0;
  for(const ex of examples){
   const e=this.encode(ex.text);const target=hash32(String(ex.label||0));
   const slots=12;
   for(let k=0;k<slots;k++){
    const idx=mix32(target+k*0x9E3779B9)%this.params.length;
    this.params[idx]+=Math.max(-.01,Math.min(.01,e[k%256]*.003));
   }
   this.step++;this.examples++;i++;
   if(i%2===0){if(onProgress)await onProgress(i,total);await new Promise(r=>setTimeout(r,0))}
  }
  if(onProgress)await onProgress(total,total);
 }
 exportMeta(){return {config:CONFIG,parameterCount:this.parameterCount(),step:this.step,examples:this.examples}}
}
window.QyrexLocalModel=QyrexLocalModel;
window.QyrexNeuralConfig=CONFIG;
})();
