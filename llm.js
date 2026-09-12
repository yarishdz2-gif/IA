import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { getLlama, resolveModelFile, LlamaChatSession } from 'node-llama-cpp';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const MODELS_DIR = path.join(ROOT, 'models');
const DATA_DIR = path.join(ROOT, 'data');

const FAST_MODEL = process.env.QYREX_MODEL_URI || 'hf:bartowski/Qwen_Qwen3-4B-Instruct-2507-GGUF:Q4_K_M';
const FALLBACKS = [
  FAST_MODEL,
  'hf:Qwen/Qwen2.5-3B-Instruct-GGUF:Q4_K_M',
  'hf:Qwen/Qwen2.5-1.5B-Instruct-GGUF:Q4_K_M',
  'hf:Qwen/Qwen2.5-0.5B-Instruct-GGUF:Q4_K_M'
].filter((v, i, a) => v && a.indexOf(v) === i);

const CONTEXT_SIZE = Math.max(2048, Number(process.env.QYREX_CONTEXT || 8192));
const MAX_TOKENS = Math.max(128, Number(process.env.QYREX_MAX_TOKENS || 900));

let llamaPromise;
let active = null;
let loadingModel = null;
const attempts = [];

const SYSTEM_PROMPT = `Eres QyrexAI, un asistente general de alta calidad.
Responde de forma natural, útil y directa en el idioma del usuario.
Entiende español, inglés, errores de escritura, slang y mensajes cortos.
Mantén el contexto de la conversación y no repitas respuestas sin motivo.
Cuando te pidan código, entrega código completo y ejecutable cuando corresponda.
Cuando depures, encuentra primero la causa y después da una solución completa.
Para matemáticas, calcula con cuidado y muestra el procedimiento esencial.
No inventes datos, herramientas, búsquedas ni archivos que no hayas usado realmente.
No digas frases de estado como "estoy procesando" o "espérame".
No reveles cadenas privadas de razonamiento interno; da conclusiones y explicaciones útiles.
Sé creativo cuando el usuario pida creatividad y preciso cuando pida exactitud.`;

async function ensureDirs() {
  await fs.mkdir(MODELS_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(path.join(DATA_DIR, 'files'), { recursive: true });
}

async function getLlamaInstance() {
  if (!llamaPromise) llamaPromise = getLlama();
  return llamaPromise;
}

function totalMemoryGB() {
  return os.totalmem() / 1024 / 1024 / 1024;
}

async function loadOne(uri) {
  const llama = await getLlamaInstance();
  const modelPath = await resolveModelFile(uri, MODELS_DIR);
  const loaded = await llama.loadModel({ modelPath });
  return { loaded, modelPath, uri };
}

async function getModel() {
  if (active) return active;
  if (loadingModel) return loadingModel;

  loadingModel = (async () => {
    await ensureDirs();
    const maxCandidates = process.env.QYREX_ALLOW_ALL_MODELS === '1' ? FALLBACKS : FALLBACKS.slice(0, 4);
    attempts.length = 0;

    for (const uri of maxCandidates) {
      try {
        attempts.push({ uri, state: 'loading', at: new Date().toISOString() });
        const result = await loadOne(uri);
        active = {
          ...result,
          parameters: uri.includes('Qwen_Qwen3-4B') ? 4000000000 : uri.includes('3B') ? 3000000000 : uri.includes('1.5B') ? 1500000000 : 500000000
        };
        attempts[attempts.length - 1].state = 'ready';
        attempts[attempts.length - 1].at = new Date().toISOString();
        return active;
      } catch (error) {
        attempts[attempts.length - 1].state = 'failed';
        attempts[attempts.length - 1].error = String(error?.message || error);
        attempts[attempts.length - 1].at = new Date().toISOString();
      }
    }
    throw new Error('No se pudo cargar ningún modelo compatible. Revisa la RAM disponible y los logs del servicio.');
  })().finally(() => { loadingModel = null; });

  return loadingModel;
}

function toHistory(messages) {
  const clean = Array.isArray(messages)
    ? messages.filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    : [];

  const trimmed = clean.slice(-18);
  const history = [{ type: 'system', text: SYSTEM_PROMPT }];
  for (const m of trimmed) {
    history.push(m.role === 'user'
      ? { type: 'user', text: m.content }
      : { type: 'model', response: [m.content] });
  }
  return history;
}

async function createSession(history) {
  const bundle = await getModel();
  const context = await bundle.loaded.createContext();
  const session = new LlamaChatSession({ contextSequence: context.getSequence() });
  session.setChatHistory(toHistory(history));
  return { session, bundle };
}

export async function streamAnswer(history, onChunk, options = {}) {
  const safeHistory = Array.isArray(history) ? history : [];
  const last = safeHistory.at(-1);
  if (!last || last.role !== 'user' || !String(last.content || '').trim()) {
    throw new Error('Falta un mensaje de usuario válido.');
  }

  const { session, bundle } = await createSession(safeHistory.slice(0, -1));
  const prompt = last.content.trim();
  let full = '';

  const result = await session.prompt(prompt, {
    maxTokens: Math.min(MAX_TOKENS, Number(options.maxTokens || MAX_TOKENS)),
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.72,
    topP: typeof options.topP === 'number' ? options.topP : 0.92,
    topK: typeof options.topK === 'number' ? options.topK : 40,
    repeatPenalty: { lastTokens: 96, penalty: 1.10, penalizeNewLine: false },
    onTextChunk(chunk) {
      if (!chunk) return;
      full += chunk;
      onChunk(chunk);
    }
  });

  const finalText = String(result || full || '').trim();
  if (!finalText) {
    throw new Error('El modelo terminó sin texto. Revisa el modelo cargado y la RAM del servicio.');
  }

  return {
    text: finalText,
    model: bundle.uri,
    modelPath: bundle.modelPath,
    parameters: bundle.parameters,
    totalMemoryGB: totalMemoryGB()
  };
}

export async function warmup() {
  const bundle = await getModel();
  const context = await bundle.loaded.createContext();
  const session = new LlamaChatSession({ contextSequence: context.getSequence() });
  session.setChatHistory([{ type: 'system', text: SYSTEM_PROMPT }]);
  let out = '';
  await session.prompt('Responde únicamente: OK', {
    maxTokens: 8,
    temperature: 0,
    onTextChunk(chunk) { out += chunk; }
  });
  if (!out.trim()) throw new Error('El warmup no produjo texto.');
  return out.trim();
}

export function llmStatus() {
  return {
    ready: !!active,
    loading: !!loadingModel,
    model: active?.uri || FAST_MODEL,
    parameters: active?.parameters || (FAST_MODEL.includes('4B') ? 4000000000 : 0),
    context: CONTEXT_SIZE,
    maxTokens: MAX_TOKENS,
    totalMemoryGB: Number(totalMemoryGB().toFixed(2)),
    attempts: attempts.slice(-6)
  };
}
