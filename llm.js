import path from 'node:path';
import fs from 'node:fs/promises';
import { getLlama, resolveModelFile, LlamaChatSession } from 'node-llama-cpp';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname);
const MODELS_DIR = path.join(ROOT, 'models');
const DATA_DIR = path.join(ROOT, 'data');
const MODEL_URI = process.env.QYREX_MODEL_URI || 'hf:Qwen/Qwen2.5-7B-Instruct-GGUF:Q4_K_M';
const CONTEXT_SIZE = Number(process.env.QYREX_CONTEXT || 8192);
const MAX_TOKENS = Number(process.env.QYREX_MAX_TOKENS || 1200);

let llamaPromise;
let modelPromise;
let modelPath;
let model;
let warnings = [];
let startedAt = null;

const SYSTEM_PROMPT = `You are QyrexAI, a high-quality general assistant.
Answer naturally and directly. Be useful before being verbose. Understand Spanish, English, slang, typos and mixed-language messages.
Maintain continuity from the conversation. Do not repeat yourself without a reason.
Never claim to have used a tool, searched the web, opened a file, executed code, or verified something unless the application actually did it.
When you do not know something, say so and give the best next step.
When asked for code, provide complete code when that is what the user needs.
When debugging, identify the root cause first and then give a complete corrected solution.
For math, calculate carefully and show the essential work.
For explanations, adapt to the user's level.
Do not reveal private chain-of-thought. Give concise conclusions and useful reasoning summaries instead.
Do not use filler status messages such as “I'm processing”, “wait”, or “let me think”.
You are QyrexAI, not ChatGPT, Claude, Gemini or Grok.`;

async function ensureDirs(){
  await fs.mkdir(MODELS_DIR,{recursive:true});
  await fs.mkdir(DATA_DIR,{recursive:true});
  await fs.mkdir(path.join(DATA_DIR,'files'),{recursive:true});
}

async function getModel(){
  if(model) return model;
  if(modelPromise) return modelPromise;
  modelPromise=(async()=>{
    await ensureDirs();
    modelPath=await resolveModelFile(MODEL_URI,MODELS_DIR);
    const llama=await getLlama();
    const loaded=await llama.loadModel({modelPath});
    warnings=loaded.getWarnings?.() || [];
    startedAt=new Date().toISOString();
    model=loaded;
    return loaded;
  })().catch(err=>{modelPromise=null;throw err;});
  return modelPromise;
}

function serializableHistory(messages){
  return (Array.isArray(messages)?messages:[]).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-40).map(m=>({type:m.role==='user'?'user':'model',text:m.content}));
}

function createSession(history=[]){
  return getModel().then(async loaded=>{
    const context=await loaded.createContext({contextSize:{min:2048,max:CONTEXT_SIZE}});
    const session=new LlamaChatSession({
      contextSequence:context.getSequence(),
      systemPrompt:SYSTEM_PROMPT
    });
    const clean=history.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-20);
    if(clean.length){
      const initial=session.getChatHistory();
      for(const m of clean){
        initial.push(m.role==='user'?{type:'user',text:m.content}:{type:'model',response:[m.content]});
      }
      session.setChatHistory(initial);
    }
    return session;
  });
}

export async function streamAnswer(history,onChunk,options={}){
  const session=await createSession(history.slice(0,-1));
  const last=history.at(-1)?.content || '';
  let full='';
  const response=await session.prompt(last,{
    maxTokens:Math.min(MAX_TOKENS,Number(options.maxTokens||MAX_TOKENS)),
    temperature:typeof options.temperature==='number'?options.temperature:.72,
    topP:typeof options.topP==='number'?options.topP:.92,
    topK:typeof options.topK==='number'?options.topK:40,
    repeatPenalty:1.08,
    onTextChunk(chunk){full+=chunk;onChunk(chunk);}
  });
  if(!full) full=typeof response==='string'?response:response?.responseText||response?.completion||'';
  return {text:full.trim(),model:MODEL_URI,parameters:7000000000,modelPath};
}

export async function warmup(){await getModel();}
export function llmStatus(){return {ready:!!model,loading:!!modelPromise,model:MODEL_URI,parameters:7000000000,context:CONTEXT_SIZE,maxTokens:MAX_TOKENS,loadedAt:startedAt,warnings};}
