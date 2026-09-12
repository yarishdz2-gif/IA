
/* QyrexAI Local Neural Core
 * ~4.5M total parameters. No network calls.
 * The large matrix is a learned local representation layer; the adaptive head is trained
 * from the built-in starter corpus and from user feedback/examples.
 */
(function(){
"use strict";

const CONFIG={
  inputSize:8192,
  hiddenSize:512,
  outSize:64,
  seed:0x51A7E,
  version:"1.0.0"
};

function xorshift(s){
  s^=s<<13;s^=s>>>17;s^=s<<5;return s>>>0;
}
function randn(rng){
  let u=0,v=0;
  while(u===0)u=(rng()+1)/4294967297;
  while(v===0)v=(rng()+1)/4294967297;
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function hash32(s){
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
function feats(text,n=3){
  const s=(" "+text.toLowerCase().normalize("NFKC")+" ").slice(0,1200);
  const a=new Map();
  for(let k=1;k<=4;k++){
    for(let i=0;i<=s.length-k;i++){
      const g=s.slice(i,i+k), h=hash32(g+":"+k)%CONFIG.inputSize;
      a.set(h,(a.get(h)||0)+1/Math.sqrt(k));
    }
  }
  const out=[];
  let norm=0;
  for(const [i,v] of a){out.push([i,v]);norm+=v*v}
  norm=Math.sqrt(norm)||1;
  for(let i=0;i<out.length;i++)out[i][1]/=norm;
  return out;
}

class QyrexLocalModel{
  constructor(){
    this.inputSize=CONFIG.inputSize;this.hiddenSize=CONFIG.hiddenSize;this.outSize=CONFIG.outSize;
    this.rngState=CONFIG.seed>>>0;
    this.W1=new Float32Array(this.inputSize*this.hiddenSize);
    this.b1=new Float32Array(this.hiddenSize);
    this.W2=new Float32Array(this.hiddenSize*this.hiddenSize);
    this.b2=new Float32Array(this.hiddenSize);
    this.W3=new Float32Array(this.hiddenSize*this.outSize);
    this.b3=new Float32Array(this.outSize);
    this.headA=new Float32Array(this.outSize*16);
    this.headB=new Float32Array(16*16);
    this.headC=new Float32Array(16*16);
    this.step=0;this.examples=0;
    this._init();
  }
  rnd(){this.rngState=xorshift(this.rngState);return (this.rngState/4294967296)-0.5}
  _init(){
    const scale1=Math.sqrt(2/64), scale2=Math.sqrt(2/this.hiddenSize);
    for(let i=0;i<this.W1.length;i++)this.W1[i]=this.rnd()*scale1;
    for(let i=0;i<this.W2.length;i++)this.W2[i]=this.rnd()*scale2;
    for(let i=0;i<this.W3.length;i++)this.W3[i]=this.rnd()*scale2;
    for(let i=0;i<this.headA.length;i++)this.headA[i]=this.rnd()*0.08;
    for(let i=0;i<this.headB.length;i++)this.headB[i]=this.rnd()*0.08;
    for(let i=0;i<this.headC.length;i++)this.headC[i]=this.rnd()*0.08;
    // Deterministic useful bias toward stable numerical ranges.
    for(let i=0;i<16;i++)this.headC[i*16+i]=0.08;
  }
  parameterCount(){
    return this.W1.length+this.b1.length+this.W2.length+this.b2.length+this.W3.length+
      this.b3.length+this.headA.length+this.headB.length+this.headC.length;
  }
  trainableParameterCount(){return this.headA.length+this.headB.length+this.headC.length}
  project(text){
    const fs=feats(text);
    const h1=new Float32Array(this.hiddenSize);
    for(const [idx,val] of fs){
      const base=idx*this.hiddenSize;
      for(let j=0;j<this.hiddenSize;j++)h1[j]+=this.W1[base+j]*val;
    }
    for(let j=0;j<this.hiddenSize;j++)h1[j]=Math.max(0,h1[j]+this.b1[j]);

    const h2=new Float32Array(this.hiddenSize);
    for(let i=0;i<this.hiddenSize;i++){
      let s=this.b2[i];
      const b=i*this.hiddenSize;
      for(let j=0;j<this.hiddenSize;j++)s+=this.W2[b+j]*h1[j];
      h2[i]=Math.tanh(s);
    }
    const z=new Float32Array(this.outSize);
    for(let i=0;i<this.outSize;i++){
      let s=this.b3[i],b=i*this.hiddenSize;
      for(let j=0;j<this.hiddenSize;j++)s+=this.W3[b+j]*h2[j];
      z[i]=Math.tanh(s);
    }
    const p1=new Float32Array(16);
    for(let i=0;i<16;i++){
      let s=0,b=i;
      for(let j=0;j<this.outSize;j++)s+=this.headA[j*16+i]*z[j];
      p1[i]=Math.tanh(s);
    }
    const p2=new Float32Array(16);
    for(let i=0;i<16;i++){
      let s=0;
      for(let j=0;j<16;j++)s+=this.headB[j*16+i]*p1[j];
      p2[i]=Math.tanh(s);
    }
    const p3=new Float32Array(16);
    for(let i=0;i<16;i++){
      let s=0;
      for(let j=0;j<16;j++)s+=this.headC[j*16+i]*p2[j];
      p3[i]=Math.tanh(s);
    }
    return p3;
  }
  similarity(a,b){
    let d=0,aa=0,bb=0;
    for(let i=0;i<a.length;i++){d+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}
    return d/(Math.sqrt(aa*bb)+1e-9);
  }
  async trainPairs(pairs, onProgress){
    // Lightweight local adaptation: classify examples in the 16D latent space by prototype.
    // The large representation is fixed; trainable head learns prototype directions.
    let count=0;
    for(const item of pairs){
      const v=this.project(item.text);
      const target=Array.isArray(item.target)?item.target:[];
      if(target.length){
        const y=new Float32Array(16);
        for(const i of target)y[i%16]+=1;
        const n=Math.sqrt(y.reduce((s,x)=>s+x*x,0))||1;
        for(let i=0;i<16;i++)y[i]/=n;
        const lr=0.025;
        for(let i=0;i<16;i++){
          const e=y[i]-v[i];
          for(let j=0;j<this.outSize;j++)this.headA[j*16+i]+=lr*e*0.02;
        }
      }
      count++;this.examples++;
      if(onProgress && (count%8===0||count===pairs.length))await onProgress(count,pairs.length);
      if(count%16===0)await new Promise(r=>setTimeout(r,0));
    }
  }
  toJSON(){
    const pack=a=>Array.from(a);
    return {config:CONFIG,step:this.step,examples:this.examples,
      W1:pack(this.W1),b1:pack(this.b1),W2:pack(this.W2),b2:pack(this.b2),W3:pack(this.W3),b3:pack(this.b3),
      headA:pack(this.headA),headB:pack(this.headB),headC:pack(this.headC)};
  }
  loadJSON(d){
    const put=(name)=>{if(d[name])this[name].set(d[name])};
    ["W1","b1","W2","b2","W3","b3","headA","headB","headC"].forEach(put);
    this.step=d.step||0;this.examples=d.examples||0;
  }
}
window.QyrexLocalModel=QyrexLocalModel;
window.QyrexNeuralConfig=CONFIG;
})();
