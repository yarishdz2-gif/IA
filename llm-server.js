'use strict';

const MODEL_CANDIDATES = (process.env.QYREX_MODELS || [
  'onnx-community/Qwen2.5-0.5B-Instruct',
  'onnx-community/Qwen3-0.6B-ONNX'
].join(',')).split(',').map(s => s.trim()).filter(Boolean);
const DTYPE_CANDIDATES = (process.env.QYREX_DTYPES || 'q4f16,q4').split(',').map(s => s.trim()).filter(Boolean);
const MAX_NEW_TOKENS = Number(process.env.QYREX_MAX_NEW_TOKENS || 768);
const MAX_HISTORY = Number(process.env.QYREX_MAX_HISTORY || 10);

let generatorPromise = null;
let generator = null;
let generatorError = null;
let activeModel = null;
let activeDtype = null;
let loadAttempts = [];

const SYSTEM = [
  'Eres QyrexAI, un asistente general inteligente, útil, natural y directo.',
  'Responde en el mismo idioma del usuario salvo que pida otro.',
  'Mantén el contexto de la conversación y usa la información de mensajes anteriores cuando sea relevante.',
  'Si el usuario escribe poco, informalmente o con errores, interpreta la intención y responde de forma útil.',
  'No inventes hechos, búsquedas, ejecuciones, archivos o herramientas que no hayas realizado.',
  'Si no sabes algo, dilo claramente y da la mejor orientación posible sin fingir certeza.',
  'Cuando des código, prioriza soluciones completas, ejecutables y coherentes con el lenguaje pedido.',
  'Da explicaciones claras y prácticas. No expongas cadenas internas de razonamiento privado.',
  'Nunca respondas con frases de estado como "estoy procesando", "espere" o "déjame pensar".',
  'Tu nombre es QyrexAI.'
].join(' ');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function loadOne(modelId, dtype, progressCallback) {
  const { pipeline, env } = await import('@huggingface/transformers');
  env.useFSCache = true;
  env.cacheDir = process.env.QYREX_MODEL_CACHE || './.qcache';
  env.allowRemoteModels = true;
  return pipeline('text-generation', modelId, {
    dtype,
    progress_callback: progressCallback || undefined
  });
}

async function getGenerator(progressCallback) {
  if (generator) return generator;
  if (generatorPromise) return generatorPromise;

  generatorPromise = (async () => {
    loadAttempts = [];
    generatorError = null;

    for (const modelId of MODEL_CANDIDATES) {
      for (const dtype of DTYPE_CANDIDATES) {
        try {
          const pipe = await loadOne(modelId, dtype, progressCallback);
          generator = pipe;
          activeModel = modelId;
          activeDtype = dtype;
          return pipe;
        } catch (error) {
          loadAttempts.push({
            model: modelId,
            dtype,
            error: String(error?.message || error)
          });
          await sleep(150);
        }
      }
    }

    const details = loadAttempts.map(x => `${x.model} [${x.dtype}]: ${x.error}`).join(' | ');
    generatorError = new Error(`No se pudo cargar ningún modelo compatible. ${details}`);
    generatorPromise = null;
    throw generatorError;
  })().catch(error => {
    generatorPromise = null;
    generatorError = error;
    throw error;
  });

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

function cleanText(text) {
  let s = String(text || '');
  s = s.replace(/<\|im_end\|>/g, '').replace(/<\|endoftext\|>/g, '');
  s = s.replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '').trim();
  return s;
}

function generationOptions(options, streamer) {
  const temperature = typeof options.temperature === 'number' ? options.temperature : 0.7;
  const topP = typeof options.top_p === 'number' ? options.top_p : 0.9;
  return {
    max_new_tokens: Math.max(32, Math.min(MAX_NEW_TOKENS, Number(options.max_new_tokens || MAX_NEW_TOKENS))),
    temperature,
    top_p: topP,
    top_k: 50,
    repetition_penalty: 1.05,
    do_sample: true,
    ...(streamer ? { streamer } : {})
  };
}

async function chat(messages, options = {}) {
  const pipe = await getGenerator(options.progressCallback);
  const output = await pipe(normalizeMessages(messages), generationOptions(options));
  const generated = output?.[0]?.generated_text;
  if (Array.isArray(generated)) {
    const last = generated[generated.length - 1];
    if (last && typeof last.content === 'string') return cleanText(last.content);
  }
  if (typeof generated === 'string') return cleanText(generated);
  return '';
}

async function streamChat(messages, options = {}, onToken = () => {}) {
  const pipe = await getGenerator(options.progressCallback);
  const { TextStreamer } = await import('@huggingface/transformers');
  let full = '';
  const streamer = new TextStreamer(pipe.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: text => {
      if (!text) return;
      full += text;
      onToken(text);
    }
  });
  const output = await pipe(normalizeMessages(messages), generationOptions(options, streamer));

  if (!full) {
    const generated = output?.[0]?.generated_text;
    if (Array.isArray(generated)) {
      const last = generated[generated.length - 1];
      if (last && typeof last.content === 'string') full = last.content;
    } else if (typeof generated === 'string') {
      full = generated;
    }
  }
  return cleanText(full);
}

function status() {
  return {
    ready: !!generator,
    loading: !!generatorPromise,
    model: activeModel || MODEL_CANDIDATES[0],
    dtype: activeDtype || null,
    candidates: MODEL_CANDIDATES,
    maxNewTokens: MAX_NEW_TOKENS,
    error: generatorError ? String(generatorError.message || generatorError) : null,
    attempts: loadAttempts
  };
}

module.exports = {
  chat,
  streamChat,
  getGenerator,
  status,
  MODEL_ID: activeModel || MODEL_CANDIDATES[0],
  normalizeMessages
};
