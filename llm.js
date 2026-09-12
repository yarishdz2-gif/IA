import os from 'node:os';
import path from 'node:path';
import { env, pipeline, TextStreamer } from '@huggingface/transformers';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname);
const CACHE_DIR = path.join(ROOT, 'data', 'transformers-cache');
env.cacheDir = CACHE_DIR;
env.allowRemoteModels = true;
env.allowLocalModels = false;
env.useFSCache = true;
env.useWasmCache = true;

env.backends.onnx.wasm.numThreads = Math.max(1, Math.min(Number(process.env.QYREX_THREADS || 4), Math.max(1, (os.cpus()?.length || 2) - 1)));

const RAM_GB = os.totalmem() / 1024 / 1024 / 1024;
const FORCE_MODEL = process.env.QYREX_MODEL_ID?.trim();
const MODEL_CANDIDATES = FORCE_MODEL ? [FORCE_MODEL] : (RAM_GB >= 6 ? [
  'onnx-community/Qwen2.5-1.5B-Instruct',
  'onnx-community/Qwen2.5-0.5B-Instruct'
] : [
  'onnx-community/Qwen2.5-0.5B-Instruct',
  'onnx-community/Qwen2.5-1.5B-Instruct'
]);

const DTYPE = process.env.QYREX_DTYPE || 'q4';
const MAX_NEW_TOKENS = Math.min(768, Math.max(64, Number(process.env.QYREX_MAX_TOKENS || 384)));
const HISTORY_LIMIT = Math.min(20, Math.max(4, Number(process.env.QYREX_HISTORY || 12)));
const SYSTEM = `Eres QyrexAI, un asistente general experto y conversacional.
Responde directamente a la pregunta del usuario. No describas que estás procesando ni inventes estados internos.
Usa el idioma del usuario y entiende español informal, errores de escritura y mensajes cortos.
Mantén el contexto. No repitas la misma respuesta salvo que sea necesario.
Cuando pidan código, entrega código completo y funcional; no des fragmentos parciales si no los piden.
Cuando depures, identifica la causa y luego entrega una solución concreta.
Para matemáticas, calcula con precisión.
No inventes fuentes, acciones, archivos, imágenes ni búsquedas que no hayas realizado.
No reveles razonamiento interno privado; ofrece una explicación útil y verificable.`;

let generatorPromise = null;
let activeModel = null;
let loadStartedAt = 0;
let lastError = null;
let generationQueue = Promise.resolve();

function queue(task) {
  const run = generationQueue.then(task, task);
  generationQueue = run.catch(() => {});
  return run;
}

function cleanMessages(messages) {
  const out = [];
  for (const m of Array.isArray(messages) ? messages : []) {
    if (!m || !['user','assistant'].includes(m.role)) continue;
    const content = String(m.content ?? '').trim();
    if (!content) continue;
    out.push({ role: m.role, content });
  }
  return out.slice(-HISTORY_LIMIT);
}

async function getGenerator(progress_callback = undefined) {
  if (generatorPromise) return generatorPromise;
  generatorPromise = (async () => {
    loadStartedAt = Date.now();
    let last = null;
    for (const modelId of MODEL_CANDIDATES) {
      try {
        const pipe = await pipeline('text-generation', modelId, {
          dtype: DTYPE,
          device: 'wasm',
          progress_callback
        });
        activeModel = modelId;
        lastError = null;
        return pipe;
      } catch (err) {
        last = err;
        lastError = String(err?.message || err);
        console.error('[QyrexAI] model failed:', modelId, lastError);
      }
    }
    throw last || new Error('No fue posible cargar ningún modelo ONNX.');
  })().finally(() => {
    generatorPromise = null;
  });
  return generatorPromise;
}

function extractText(result) {
  const item = Array.isArray(result) ? result[0] : result;
  let generated = item?.generated_text;
  if (Array.isArray(generated)) {
    const assistant = [...generated].reverse().find(x => x?.role === 'assistant');
    if (assistant?.content) return String(assistant.content).trim();
    const last = generated.at(-1);
    if (typeof last === 'string') return last.trim();
  }
  if (typeof generated === 'string') return generated.trim();
  return '';
}

export async function streamAnswer(history, onChunk, options = {}) {
  return queue(async () => {
    const clean = cleanMessages(history);
    const last = clean.at(-1);
    if (!last || last.role !== 'user') throw new Error('Falta un mensaje de usuario válido.');

    const messages = [
      { role: 'system', content: SYSTEM },
      ...clean
    ];

    const generator = await getGenerator();
    let streamed = '';
    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function(text) {
        if (!text) return;
        streamed += text;
        onChunk(text);
      }
    });

    const result = await generator(messages, {
      max_new_tokens: Math.min(MAX_NEW_TOKENS, Number(options.maxTokens || MAX_NEW_TOKENS)),
      do_sample: options.doSample ?? true,
      temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
      top_p: typeof options.topP === 'number' ? options.topP : 0.9,
      repetition_penalty: 1.08,
      no_repeat_ngram_size: 3,
      streamer
    });

    const text = (streamed || extractText(result)).trim();
    if (!text) throw new Error(`El modelo terminó sin texto. Modelo=${activeModel}; dtype=${DTYPE}; RAM=${RAM_GB.toFixed(1)}GB.`);

    return {
      text,
      model: activeModel,
      parameters: activeModel?.includes('1.5B') ? 1500000000 : 500000000,
      dtype: DTYPE,
      elapsedMs: Date.now() - loadStartedAt
    };
  });
}

export async function warmup() {
  return streamAnswer([{ role: 'user', content: 'Di exactamente OK' }], () => {}, {
    maxTokens: 4,
    temperature: 0,
    doSample: false
  }).then(r => r.text);
}

export function llmStatus() {
  return {
    ready: !!activeModel,
    loading: !!generatorPromise,
    model: activeModel || MODEL_CANDIDATES[0],
    candidates: MODEL_CANDIDATES,
    dtype: DTYPE,
    parameters: activeModel?.includes('1.5B') ? 1500000000 : 500000000,
    ramGB: Number(RAM_GB.toFixed(2)),
    threads: env.backends.onnx.wasm.numThreads,
    maxNewTokens: MAX_NEW_TOKENS,
    historyLimit: HISTORY_LIMIT,
    cacheDir: CACHE_DIR,
    lastError
  };
}
