import http from 'node:http';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { URL } from 'node:url';
import { streamAnswer, warmup, llmStatus } from './llm.js';
import { initStore, listConversations, getConversation, createConversation, saveConversation, deleteConversation, listFiles, saveFile, getFile, removeFile, listModels, saveModelProfile, FILES } from './store.js';

const ROOT=path.resolve(new URL('.',import.meta.url).pathname);
const PUBLIC=path.join(ROOT,'public');
const PORT=Number(process.env.PORT||10000);
const MAX_BODY=32*1024*1024;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.pdf':'application/pdf','.zip':'application/zip'};

await initStore();

function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*'});res.end(JSON.stringify(payload));}
function safeStatic(p){const decoded=decodeURIComponent(p.split('?')[0]||'/');const rel=path.normalize(decoded).replace(/^[/\\]+/,'');const full=path.resolve(PUBLIC,rel||'index.html');return full===PUBLIC||full.startsWith(PUBLIC+path.sep)?full:null;}
async function body(req){return new Promise((resolve,reject)=>{let size=0;const chunks=[];req.on('data',c=>{size+=c.length;if(size>MAX_BODY){reject(new Error('body too large'));req.destroy();return;}chunks.push(c)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'))}catch(e){reject(new Error('invalid json'))}});req.on('error',reject)});}
function event(res,name,data){res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`)}

const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS'});return res.end();}
    if(u.pathname==='/health')return json(res,200,{ok:true,service:'QyrexAI Pro Max',model:llmStatus(),persistentData:true,storage:'disk'});
    if(u.pathname==='/api/status'&&req.method==='GET')return json(res,200,{ok:true,llm:llmStatus()});
    if(u.pathname==='/api/test'&&req.method==='GET'){try{const t=await warmup();return json(res,200,{ok:true,test:'model-generated',text:t,llm:llmStatus()});}catch(e){return json(res,503,{ok:false,test:'failed',error:String(e.message||e),llm:llmStatus()});}}
    if(u.pathname==='/api/models'&&req.method==='GET')return json(res,200,{ok:true,models:await listModels(),llm:llmStatus()});
    if(u.pathname==='/api/models'&&req.method==='POST'){const b=await body(req);return json(res,200,{ok:true,models:await saveModelProfile(b)});}
    if(u.pathname==='/api/warmup'&&req.method==='POST'){try{await warmup();return json(res,200,{ok:true,llm:llmStatus()})}catch(e){return json(res,503,{ok:false,error:String(e.message||e),llm:llmStatus()})}}
    if(u.pathname==='/api/conversations'&&req.method==='GET')return json(res,200,{ok:true,conversations:await listConversations()});
    if(u.pathname==='/api/conversations'&&req.method==='POST'){const b=await body(req);return json(res,201,{ok:true,conversation:await createConversation(b.title||'Nueva charla')});}
    const cm=u.pathname.match(/^\/api\/conversations\/([^/]+)$/);
    if(cm&&req.method==='GET'){const c=await getConversation(cm[1]);return c?json(res,200,{ok:true,conversation:c}):json(res,404,{ok:false,error:'conversation not found'});}
    if(cm&&req.method==='DELETE')return json(res,200,{ok:await deleteConversation(cm[1])});
    if(u.pathname==='/api/files'&&req.method==='GET')return json(res,200,{ok:true,files:await listFiles()});
    if(u.pathname==='/api/files'&&req.method==='POST'){const b=await body(req);if(!b.data)throw new Error('missing data');return json(res,201,{ok:true,file:await saveFile(b)});}
    const fm=u.pathname.match(/^\/api\/files\/([^/]+)$/);
    if(fm&&req.method==='DELETE')return json(res,200,{ok:await removeFile(fm[1])});
    const fr=u.pathname.match(/^\/files\/([^/]+)$/);
    if(fr&&req.method==='GET'){const f=await getFile(fr[1]);if(!f)return json(res,404,{ok:false,error:'file not found'});const p=path.join(FILES,f.stored);if(!fsSync.existsSync(p))return json(res,404,{ok:false,error:'file missing'});res.writeHead(200,{'Content-Type':f.mime||'application/octet-stream','Cache-Control':'public,max-age=3600','Content-Length':f.size});return fsSync.createReadStream(p).pipe(res)}
    if(u.pathname==='/api/chat-stream'&&req.method==='POST'){
      const b=await body(req);let conversation=b.conversationId?await getConversation(b.conversationId):null;if(!conversation)conversation=await createConversation((b.messages?.find(m=>m.role==='user')?.content||'Nueva charla').slice(0,80));
      const incoming=Array.isArray(b.messages)?b.messages.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-30):conversation.messages;
      if(!incoming.length)return json(res,400,{ok:false,error:'messages required'});
      res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no','Access-Control-Allow-Origin':'*'});
      event(res,'start',{conversationId:conversation.id,model:llmStatus()});
      const started=Date.now();let answer='';
      try{
        const result=await streamAnswer(incoming,chunk=>{answer+=chunk;event(res,'token',{text:chunk})},{maxTokens:b.max_tokens,temperature:b.temperature,topP:b.top_p});
        answer=result.text||answer.trim();
        const lastUser=incoming.at(-1);
        conversation.messages=[...incoming.slice(0,-1),{role:'user',content:lastUser.content,createdAt:new Date().toISOString()}, {role:'assistant',content:answer,createdAt:new Date().toISOString(),model:result.model,latencyMs:Date.now()-started}].slice(-80);
        if(conversation.title==='Nueva charla'||!conversation.title)conversation.title=lastUser.content.slice(0,80)||'Nueva charla';
        await saveConversation(conversation);
        event(res,'done',{answer,conversationId:conversation.id,model:result.model,parameters:result.parameters,ms:Date.now()-started});
      }catch(e){event(res,'error',{error:String(e.message||e),llm:llmStatus()})}finally{res.end()}
      return;
    }
    if(req.method==='GET'){
      let file=safeStatic(u.pathname);if(!file||file===PUBLIC)file=path.join(PUBLIC,'index.html');
      if(!fsSync.existsSync(file)||!fsSync.statSync(file).isFile())file=path.join(PUBLIC,'index.html');
      const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':path.extname(file)==='.html'?'no-cache':'public,max-age=3600','X-Content-Type-Options':'nosniff'});return res.end(data);
    }
    return res.writeHead(405).end('Method Not Allowed');
  }catch(e){return json(res,500,{ok:false,error:String(e.message||e)})}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`[QyrexAI] http://0.0.0.0:${PORT}`));
