'use strict';

const MODEL_CANDIDATES = (process.env.QYREX_MODELS || [
  'opalitestudios/Qwen2.5-3B-Instruct-ONNX',
  'onnx-community/Qwen3-1.7B-ONNX',
  'onnx-community/Qwen2.5-1.5B-Instruct',
  'onnx-community/Qwen2.5-0.5B-Instruct'
].join(',')).split(',').map(s => s.trim()).filter(Boolean);
const DTYPE_CANDIDATES = (process.env.QYREX_DTYPES || 'q4f16,q4').split(',').map(s => s.trim()).filter(Boolean);
const MAX_NEW_TOKENS = Number(process.env.QYREX_MAX_NEW_TOKENS || 1200);
const MAX_HISTORY = Number(process.env.QYREX_MAX_HISTORY || 18);
const MAX_CONTEXT_CHARS = Number(process.env.QYREX_MAX_CONTEXT_CHARS || 60000);

let generatorPromise = null;
let generator = null;
let generatorError = null;
let activeModel = null;
let activeDtype = null;
let loadAttempts = [];
let generationCount = 0;
let lastAssistantAnswers = [];

const SYSTEM = `Eres QyrexAI, un asistente general avanzado y natural.
Tu objetivo principal es resolver lo que el usuario pide de forma útil, concreta y correcta.
Habla en el mismo idioma del usuario, salvo que pida otro.
Mantén el contexto y recuerda lo relevante de mensajes anteriores.
No repitas respuestas anteriores salvo que el usuario lo pida o sea necesario corregirlas.
Interpreta errores ortográficos, mensajes cortos y lenguaje informal sin exigir que el usuario reformule.
Cuando una petición sea ambigua pero puedas avanzar, haz una suposición razonable y dilo brevemente.
Cuando una tarea tenga varios pasos, organízala en pasos claros y ejecutables.
Cuando el usuario pida código, entrega código completo y funcional, no parches parciales, salvo que pida específicamente un fragmento.
Cuando depures, explica la causa y después entrega la solución completa.
Para matemáticas, calcula antes de contestar y muestra el procedimiento cuando sea útil.
Para temas técnicos, prioriza soluciones concretas sobre teoría innecesaria.
No inventes resultados, archivos, ejecuciones, búsquedas, citas ni acceso a servicios que no hayas usado.
No expongas cadenas privadas de razonamiento interno. Puedes dar una explicación breve de las razones y pasos de alto nivel.
No uses frases de estado como 'estoy procesando', 'espera' o 'déjame pensar' como respuesta.
No digas que eres ChatGPT, Claude, Gemini o Grok; eres QyrexAI.
Evita respuestas genéricas de relleno. Cada respuesta debe avanzar la tarea del usuario.`;

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
          await sleep(250);
        }
      }
    }

    const details = loadAttempts
      .map(x => `${x.model} [${x.dtype}]: ${x.error}`)
      .join(' | ');
    generatorError = new Error(`No se pudo cargar ningún modelo. ${details}`);
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
  let used = SYSTEM.length;

  for (const item of safe.slice(-MAX_HISTORY)) {
    if (!item || typeof item.content !== 'string') continue;
    const role = item.role === 'assistant' ? 'assistant' : 'user';
    let content = item.content.trim();
    if (!content) continue;
    content = content.slice(0, 12000);
    if (used + content.length > MAX_CONTEXT_CHARS) break;
    out.push({ role, content });
    used += content.length;
  }

  // Give the generator a little anti-repetition context without bloating the prompt.
  if (lastAssistantAnswers.length) {
    out.push({
      role: 'system',
      content: `Evita repetir literalmente estas respuestas recientes del asistente: ${lastAssistantAnswers.slice(-3).join(' || ').slice(0, 5000)}`
    });
  }
  return out;
}

function cleanText(text) {
  let s = String(text || '');
  s = s.replace(/<\|im_end\|>/g, '')
    .replace(/<\|endoftext\|>/g, '')
    .replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
  return s;
}

function extractText(output) {
  const generated = output?.[0]?.generated_text;
  if (Array.isArray(generated)) {
    const last = generated[generated.length - 1];
    return last && typeof last.content === 'string' ? last.content : '';
  }
  return typeof generated === 'string' ? generated : '';
}

function generationOptions(options, streamer, attempt = 0) {
  const temperature = typeof options.temperature === 'number'
    ? options.temperature
    : attempt ? 0.82 : 0.72;
  const topP = typeof options.top_p === 'number' ? options.top_p : 0.92;
  return {
    max_new_tokens: Math.max(48, Math.min(MAX_NEW_TOKENS, Number(options.max_new_tokens || 1000))),
    temperature,
    top_p: topP,
    top_k: attempt ? 80 : 60,
    repetition_penalty: attempt ? 1.12 : 1.08,
    do_sample: true,
    ...(streamer ? { streamer } : {})
  };
}

function rememberAnswer(text) {
  const value = cleanText(text);
  if (!value) return;
  lastAssistantAnswers.push(value.slice(0, 3500));
  if (lastAssistantAnswers.length > 6) lastAssistantAnswers.shift();
}

async function chat(messages, options = {}) {
  const pipe = await getGenerator(options.progressCallback);
  generationCount++;
  let answer = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const output = await pipe(normalizeMessages(messages), generationOptions(options, null, attempt));
    answer = cleanText(extractText(output));
    const repeated = lastAssistantAnswers.some(x => x && answer && x.trim() === answer.trim());
    if (answer && !repeated) break;
  }

  if (!answer) throw new Error('El modelo devolvió una respuesta vacía.');
  rememberAnswer(answer);
  return answer;
}

async function streamChat(messages, options = {}, onToken = () => {}) {
  const pipe = await getGenerator(options.progressCallback);
  generationCount++;
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

  const output = await pipe(normalizeMessages(messages), generationOptions(options, streamer, 0));
  if (!full) full = extractText(output);
  full = cleanText(full);

  // If a model somehow echoed a recent answer verbatim, retry once without streaming.
  const repeated = lastAssistantAnswers.some(x => x && full && x.trim() === full.trim());
  if (repeated || !full) {
    full = '';
    const retry = await pipe(normalizeMessages(messages), generationOptions({...options, temperature: 0.88}, null, 1));
    full = cleanText(extractText(retry));
    if (full) onToken(full);
  }

  if (!full) throw new Error('El modelo devolvió una respuesta vacía.');
  rememberAnswer(full);
  return full;
}

function tierFor(model) {
  if (!model) return 'unknown';
  if (model.includes('3B')) return '3B';
  if (model.includes('1.7B')) return '1.7B';
  if (model.includes('1.5B')) return '1.5B';
  if (model.includes('0.5B')) return '0.5B';
  return 'custom';
}

function status() {
  return {
    ready: !!generator,
    loading: !!generatorPromise,
    model: activeModel || MODEL_CANDIDATES[0],
    dtype: activeDtype || null,
    candidates: MODEL_CANDIDATES,
    parameterTier: tierFor(activeModel || MODEL_CANDIDATES[0]),
    maxNewTokens: MAX_NEW_TOKENS,
    generations: generationCount,
    error: generatorError ? String(generatorError.message || generatorError) : null,
    attempts: loadAttempts
  };
}

module.exports = {
  chat,
  streamChat,
  getGenerator,
  status,
  MODEL_ID: MODEL_CANDIDATES[0],
  normalizeMessages
};
