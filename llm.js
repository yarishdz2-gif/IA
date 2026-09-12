import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getLlama, resolveModelFile, LlamaChatSession } from 'node-llama-cpp';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, 'data');
const MODELS_DIR = path.join(DATA_DIR, 'models');
const MODEL_URI = process.env.QYREX_MODEL_URI || 'hf:Qwen/Qwen2.5-7B-Instruct-GGUF:Q4_K_M';
const MAX_TOKENS = Math.max(64, Number(process.env.QYREX_MAX_TOKENS || 1200));
const CONTEXT_MAX = Math.max(2048, Number(process.env.QYREX_CONTEXT_MAX || 8192));
const CONTEXT_MIN = Math.max(1024, Number(process.env.QYREX_CONTEXT_MIN || 2048));

let llamaPromise = null;
let modelPromise = null;
let model = null;
let modelPath = null;
let modelInfo = null;
let lastError = null;
let loadedAt = null;

const SYSTEM_PROMPT = `You are QyrexAI, a capable general-purpose assistant.
Speak naturally in the user's language. Understand Spanish, English, slang, typos and mixed language.
Solve the user's actual problem instead of merely describing what an assistant could do.
Be accurate. When current or external information is unavailable locally, say what you know and what you cannot verify.
For programming and debugging, give complete working code when appropriate and explain the actual cause of errors.
For math, calculate carefully and show essential steps.
For writing, provide polished usable text.
For comparisons, explain the tradeoffs and give a clear recommendation when possible.
Use conversation context and do not repeat the same response.
Never output status filler such as “I'm processing”, “wait”, or “let me think”.
Do not claim to have browsed the web, opened a file, executed code, or used a tool unless the server actually did so.
Do not reveal private chain-of-thought. Provide concise conclusions and useful reasoning summaries instead.`;

async function ensureDirs() {
  await fs.mkdir(MODELS_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function getLlamaInstance() {
  if (!llamaPromise) llamaPromise = getLlama();
  return llamaPromise;
}

async function loadModel() {
  if (model) return model;
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    await ensureDirs();
    const resolved = await resolveModelFile(MODEL_URI, MODELS_DIR, { cli: true });
    modelPath = resolved;
    const llama = await getLlamaInstance();
    const loaded = await llama.loadModel({ modelPath: resolved });
    modelInfo = {
      architecture: loaded.configuration?.architecture || loaded.architecture || 'auto',
      trainContextSize: loaded.trainContextSize,
      vocabSize: loaded.vocabSize,
      size: loaded.size,
    };
    model = loaded;
    loadedAt = new Date().toISOString();
    lastError = null;
    return loaded;
  })().catch(err => {
    lastError = { message: err?.message || String(err), stack: err?.stack || null, at: new Date().toISOString() };
    modelPromise = null;
    throw err;
  });
  return modelPromise;
}

function normalizeHistory(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-24)
    .map(m => m.role === 'user'
      ? { type: 'user', text: m.content }
      : { type: 'model', response: [m.content] });
}

async function makeSession(history) {
  const loaded = await loadModel();
  const context = await loaded.createContext({
    contextSize: { min: CONTEXT_MIN, max: CONTEXT_MAX },
    failedCreationRemedy: { retries: 6, autoContextSizeShrink: 0.16 }
  });
  const session = new LlamaChatSession({
    contextSequence: context.getSequence(),
    systemPrompt: SYSTEM_PROMPT
  });
  const initial = session.getChatHistory();
  const normalized = normalizeHistory(history);
  if (normalized.length) session.setChatHistory([...initial, ...normalized]);
  return { session, context };
}

export async function streamAnswer(history, onChunk, options = {}) {
  const clean = Array.isArray(history) ? history : [];
  const last = clean.at(-1);
  if (!last || last.role !== 'user' || !String(last.content || '').trim()) {
    throw new Error('No se recibió un mensaje de usuario válido.');
  }

  const { session, context } = await makeSession(clean.slice(0, -1));
  let streamed = '';
  const response = await session.prompt(String(last.content), {
    maxTokens: Math.min(MAX_TOKENS, Math.max(64, Number(options.maxTokens || MAX_TOKENS))),
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
    topP: typeof options.topP === 'number' ? options.topP : 0.92,
    topK: typeof options.topK === 'number' ? options.topK : 40,
    minP: 0.05,
    repeatPenalty: {
      lastTokens: 128,
      penalty: 1.10,
      penalizeNewLine: false,
      frequencyPenalty: 0.01,
      presencePenalty: 0.01
    },
    onTextChunk(chunk) {
      const s = String(chunk || '');
      if (!s) return;
      streamed += s;
      onChunk(s);
    }
  });

  const text = streamed.trim() || (typeof response === 'string' ? response.trim() : String(response?.response ?? response?.responseText ?? response?.completion ?? '').trim());
  if (!text) {
    throw new Error('El modelo terminó sin generar texto. Revisa memoria disponible y los logs del servicio.');
  }
  return {
    text,
    model: MODEL_URI,
    parameters: 7000000000,
    modelPath,
    contextSize: context.contextSize,
  };
}

export async function warmup() { await loadModel(); }

export function llmStatus() {
  return {
    ready: !!model,
    loading: !!modelPromise,
    model: MODEL_URI,
    parameters: 7000000000,
    contextMax: CONTEXT_MAX,
    contextMin: CONTEXT_MIN,
    maxTokens: MAX_TOKENS,
    loadedAt,
    modelPath,
    modelInfo,
    error: lastError,
  };
}
