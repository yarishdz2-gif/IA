import path from 'node:path';
import os from 'node:os';
import { env, pipeline, TextStreamer } from '@huggingface/transformers';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname);
const MODELS_DIR = path.join(ROOT, 'models');

env.cacheDir = MODELS_DIR;
env.allowRemoteModels = true;
env.allowLocalModels = false;

const MODEL_ID = process.env.QYREX_MODEL_ID || 'Mozilla/Qwen2.5-0.5B-Instruct';
const MODEL_DTYPE = process.env.QYREX_DTYPE || 'q4';
const MAX_TOKENS = Math.max(64, Math.min(512, Number(process.env.QYREX_MAX_TOKENS || 384)));
const MAX_TIME = Math.max(5, Math.min(30, Number(process.env.QYREX_MAX_TIME || 18)));
const CONTEXT_MESSAGES = Math.max(4, Math.min(16, Number(process.env.QYREX_CONTEXT_MESSAGES || 10)));

let generatorPromise = null;
let activeError = null;
let generationQueue = Promise.resolve();
let lastLoadAt = null;
let totalGenerated = 0;

const SYSTEM_PROMPT = `Eres QyrexAI, un asistente útil y conversacional.
Responde directamente a la pregunta del usuario y evita frases de estado como "estoy procesando".
Habla naturalmente en español cuando el usuario escriba en español y cambia de idioma cuando corresponda.
Entiende faltas de ortografía, slang y mensajes cortos.
Da respuestas claras y prácticas. Cuando el usuario pida código, entrega código completo y ejecutable cuando sea razonable.
Cuando depures un problema, identifica primero la causa probable y después proporciona una solución concreta.
Para matemáticas, calcula con cuidado.
No inventes que tienes acceso a archivos, internet o herramientas que no se hayan usado realmente.
No muestres cadenas privadas de razonamiento interno; ofrece conclusiones y explicaciones útiles.`;

function memoryGB() { return Number((os.totalmem() / 1024 / 1024 / 1024).toFixed(2)); }

function normalizeMessages(messages) {
  const input = Array.isArray(messages) ? messages : [];
  const cleaned = input
    .filter(m => m && ['user','assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-CONTEXT_MESSAGES);
  return [{ role: 'system', content: SYSTEM_PROMPT }, ...cleaned.map(m => ({role:m.role, content:m.content}))];
}

async function getGenerator() {
  if (generatorPromise) return generatorPromise;
  activeError = null;
  generatorPromise = (async () => {
    await import('node:fs/promises').then(fs => fs.mkdir(MODELS_DIR, {recursive:true}));
    lastLoadAt = new Date().toISOString();
    const pipe = await pipeline('text-generation', MODEL_ID, { dtype: MODEL_DTYPE });
    return pipe;
  })().catch(err => {
    activeError = String(err?.message || err);
    generatorPromise = null;
    throw err;
  });
  return generatorPromise;
}

function extractText(result) {
  const item = result?.[0];
  if (!item) return '';
  const generated = item.generated_text;
  if (Array.isArray(generated)) {
    const last = [...generated].reverse().find(x => x?.role === 'assistant' && typeof x?.content === 'string');
    return last?.content?.trim() || '';
  }
  if (typeof generated === 'string') return generated.trim();
  return '';
}

function enqueue(task) {
  const run = generationQueue.then(task, task);
  generationQueue = run.catch(() => undefined);
  return run;
}

export async function streamAnswer(messages, onChunk, options = {}) {
  const normalized = normalizeMessages(messages);
  if (normalized.length < 2) throw new Error('Falta un mensaje de usuario válido.');

  return enqueue(async () => {
    const generator = await getGenerator();
    let full = '';
    let firstTokenAt = 0;

    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function(text) {
        if (!firstTokenAt) firstTokenAt = Date.now();
        if (!text) return;
        full += text;
        onChunk(text);
      }
    });

    const result = await generator(normalized, {
      max_new_tokens: Math.min(MAX_TOKENS, Number(options.maxTokens || MAX_TOKENS)),
      max_time: MAX_TIME,
      do_sample: options.doSample !== false,
      temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
      top_p: typeof options.topP === 'number' ? options.topP : 0.85,
      top_k: typeof options.topK === 'number' ? options.topK : 30,
      repetition_penalty: 1.08,
      no_repeat_ngram_size: 3,
      streamer
    });

    let text = full.trim() || extractText(result);
    if (!text) {
      throw new Error(`El modelo terminó sin texto. Motor=${MODEL_ID}, dtype=${MODEL_DTYPE}.`);
    }

    totalGenerated += 1;
    return {
      text,
      model: MODEL_ID,
      parameters: 500000000,
      dtype: MODEL_DTYPE,
      contextMessages: CONTEXT_MESSAGES,
      maxTokens: MAX_TOKENS,
      firstTokenMs: firstTokenAt ? firstTokenAt - (lastLoadAt ? new Date(lastLoadAt).getTime() : firstTokenAt) : null,
      memoryGB: memoryGB()
    };
  });
}

export async function warmup() {
  const result = await streamAnswer(
    [{ role: 'user', content: 'Responde únicamente con: OK' }],
    () => {},
    { maxTokens: 4, temperature: 0, doSample: false }
  );
  return result.text;
}

export function llmStatus() {
  return {
    ready: !!generatorPromise && !activeError,
    loading: !!generatorPromise && !activeError,
    model: MODEL_ID,
    parameters: 500000000,
    dtype: MODEL_DTYPE,
    maxTokens: MAX_TOKENS,
    maxTimeSeconds: MAX_TIME,
    contextMessages: CONTEXT_MESSAGES,
    memoryGB: memoryGB(),
    totalGenerations: totalGenerated,
    lastLoadAt,
    error: activeError
  };
}
