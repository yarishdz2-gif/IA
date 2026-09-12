const http = require('http');
const fs = require('fs');
const path = require('path');
const { chat, getGenerator, status: llmStatus, MODEL_ID } = require('./llm-server');

const PORT = Number(process.env.PORT) || 10000;
const HOST = '0.0.0.0';
const ROOT = __dirname;
const MAX_BODY = 128 * 1024;
const MIME = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'
};

function safePath(urlPath){
  let decoded; try{decoded=decodeURIComponent((urlPath||'/').split('?')[0]);}catch{return null;}
  const normalized=path.normalize(decoded).replace(/^([/\\])+/, '');
  const full=path.resolve(ROOT, normalized || 'index.html');
  if(full!==ROOT && !full.startsWith(ROOT+path.sep)) return null;
  return full;
}
function send(res,status,body,type='text/plain; charset=utf-8'){
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  res.end(body);
}
function readJson(req){
  return new Promise((resolve,reject)=>{
    let data='';
    req.on('data',chunk=>{data+=chunk;if(Buffer.byteLength(data)>MAX_BODY){reject(new Error('body too large'));req.destroy();}});
    req.on('end',()=>{try{resolve(data?JSON.parse(data):{});}catch{reject(new Error('invalid json'));}});
    req.on('error',reject);
  });
}

const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='OPTIONS'){
      res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});return res.end();
    }
    if(req.url==='/health' || req.url==='/healthz'){
      return send(res,200,JSON.stringify({ok:true,service:'QyrexAI Real Local',localInference:true,externalInferenceApi:false,model:MODEL_ID,llm:llmStatus(),uptime:process.uptime()}),MIME['.json']);
    }
    if(req.url==='/api/status' && req.method==='GET'){
      return send(res,200,JSON.stringify({ok:true,llm:llmStatus()}),MIME['.json']);
    }
    if(req.url==='/api/warmup' && req.method==='POST'){
      getGenerator().then(()=>send(res,200,JSON.stringify({ok:true,llm:llmStatus()}),MIME['.json'])).catch(e=>send(res,503,JSON.stringify({ok:false,error:e.message,llm:llmStatus()}),MIME['.json']));
      return;
    }
    if(req.url==='/api/chat' && req.method==='POST'){
      const body=await readJson(req);
      if(!Array.isArray(body.messages)) return send(res,400,JSON.stringify({ok:false,error:'messages must be an array'}),MIME['.json']);
      const started=Date.now();
      const answer=await chat(body.messages,{max_new_tokens:body.max_new_tokens,temperature:body.temperature,top_p:body.top_p});
      if(!answer) throw new Error('The model returned an empty response.');
      return send(res,200,JSON.stringify({ok:true,answer,ms:Date.now()-started,model:MODEL_ID}),MIME['.json']);
    }
    if(req.method!=='GET' && req.method!=='HEAD') return send(res,405,'Method Not Allowed');
    const requested=safePath(req.url);
    if(!requested) return send(res,403,'Forbidden');
    let file=requested;
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()) file=path.join(ROOT,'index.html');
    fs.readFile(file,(err,data)=>{
      if(err) return send(res,500,'QyrexAI server error');
      const ext=path.extname(file).toLowerCase();
      res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD') return res.end(); res.end(data);
    });
  }catch(error){
    send(res,500,JSON.stringify({ok:false,error:String(error.message||error)}),MIME['.json']);
  }
});
server.listen(PORT,HOST,()=>console.log(`QyrexAI Real listening on http://${HOST}:${PORT} using ${MODEL_ID}`));
