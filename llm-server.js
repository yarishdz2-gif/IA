'use strict';

const MODEL_ID = process.env.QYREX_MODEL || 'onnx-community/Qwen3-0.6B-DQ-ONNX';
const MAX_NEW_TOKENS = Number(process.env.QYREX_MAX_NEW_TOKENS || 512);
const MAX_HISTORY = Number(process.env.QYREX_MAX_HISTORY || 12);

let generatorPromise = null;
let generator = null;
let generatorError = null;

const SYSTEM = [
  'Eres QyrexAI, un asistente útil, claro y preciso.',
  'Responde en el idioma del usuario salvo que pida otro idioma.',
  'No inventes hechos ni afirmes haber usado herramientas que no usaste.',
  'Cuando una pregunta necesite precisión, explica el razonamiento de forma breve y verificable.',
  'Cuando entregues código, procura que sea completo, ejecutable y coherente con lo que pidió el usuario.',
  'Evita respuestas vacías, meta-comentarios sobre que estás procesando y disculpas innecesarias.',
  'Si la petición es ambigua pero puedes hacer una suposición razonable, hazla y dilo claramente.',
  'No digas que eres Gemini, Claude o ChatGPT. Eres QyrexAI.'
].join(' ');

async function getGenerator(progressCallback) {
  if (generator) return generator;
  if (!generatorPromise) {
    generatorPromise = (async () => {
      try {
        const { pipeline, env } = await import('@huggingface/transformers');
        env.useFSCache = true;
        env.cacheDir = process.env.QYREX_MODEL_CACHE || './.qcache';
        env.allowRemoteModels = true;
        if (progressCallback) env.progress_callback = progressCallback;
        const pipe = await pipeline('text-generation', MODEL_ID, {
          dtype: 'q4f16'
        });
        generator = pipe;
        generatorError = null;
        return pipe;
      } catch (error) {
        generatorError = error;
        generatorPromise = null;
        throw error;
      }
    })();
  }
  return generatorPromise;
}

function normalizeMessages(messages) {
  const safe = Array.isArray(messages) ? messages : [];
  const out = [{ role: 'system', content: SYSTEM }];
  for (const item of safe.slice(-MAX_HISTORY)) {
    if (!item || typeof item.content !== 'string') continue;
    const role = item.role === 'assistant' ? 'assistant' : 'user';
    const content = item.content.trim().slice(0, 10000);
    if (content) out.push({ role, content });
  }
  return out;
}

async function chat(messages, options = {}) {
  const pipe = await getGenerator(options.progressCallback);
  const prompt = normalizeMessages(messages);
  const output = await pipe(prompt, {
    max_new_tokens: Math.max(32, Math.min(MAX_NEW_TOKENS, Number(options.max_new_tokens || MAX_NEW_TOKENS))),
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.7,
    top_p: typeof options.top_p === 'number' ? options.top_p : 0.9,
    repetition_penalty: 1.05,
    do_sample: true,
  });
  const generated = output?.[0]?.generated_text;
  if (Array.isArray(generated)) {
    const last = generated[generated.length - 1];
    if (last && typeof last.content === 'string') return last.content.trim();
  }
  if (typeof generated === 'string') {
    const last = generated.slice(-12000);
    return last.trim();
  }
  return '';
}

function status() {
  return {
    ready: !!generator,
    loading: !!generatorPromise,
    model: MODEL_ID,
    maxNewTokens: MAX_NEW_TOKENS,
    error: generatorError ? String(generatorError.message || generatorError) : null
  };
}

module.exports = { chat, getGenerator, status, MODEL_ID };
