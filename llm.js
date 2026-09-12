import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getLlama, resolveModelFile, LlamaChatSession } from 'node-llama-cpp';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(ROOT, 'data');
const MODELS_DIR = path.join(DATA_DIR, 'models');

// Default: strong open model. Override with QYREX_MODEL_URI
// Recommended strong locals (2026): Qwen3.x 27B, Qwen2.5-32B, Gemma-4, etc.
const MODEL_URI = process.env.QYREX_MODEL_URI || 'hf:Qwen/Qwen2.5-14B-Instruct-GGUF:Q4_K_M';
const MAX_TOKENS = Math.max(64, Number(process.env.QYREX_MAX_TOKENS || 2048));
const CONTEXT_MAX = Math.max(2048, Number(process.env.QYREX_CONTEXT_MAX || 16384));
const CONTEXT_MIN = Math.max(1024, Number(process.env.QYREX_CONTEXT_MIN || 4096));

let llamaPromise = null;
let modelPromise = null;
let model = null;
let modelPath = null;
let modelInfo = null;
let lastError = null;
let loadedAt = null;

// Absorbed best practices from top open models (Qwen3/3.x, DeepSeek-R1 distill, Llama-4, GLM, Gemma-4):
// - Strong instruction following & multilingual
// - Explicit problem-solving over meta-talk
// - Coding with complete, runnable solutions
// - Careful math + reasoning summaries
// - Honesty about knowledge cut-off / local limits
const SYSTEM_PROMPT = `Eres QyrexAI Pro Max, un asistente de propósito general extremadamente capaz, preciso y útil. Funcionas 100% en local.

Principios (inspirados en los mejores modelos open-weight 2025-2026: Qwen3.x, DeepSeek-R1, Llama 4, GLM-5, Gemma 4):

1. Resuelve el problema real del usuario. No describas lo que podrías hacer; hazlo.
2. Habla de forma natural en el idioma del usuario (español, inglés, mixto, slang, con typos). Sé directo y claro.
3. Para código: entrega soluciones completas, ejecutables y bien estructuradas. Explica la causa raíz de errores cuando se te den logs o síntomas.
4. Para matemáticas y razonamiento: calcula con cuidado, muestra los pasos esenciales y llega a una conclusión clara.
5. Para escritura: entrega texto pulido y listo para usar.
6. Para comparaciones: explica trade-offs y da una recomendación concreta cuando sea posible.
7. Usa el contexto de la conversación. No repitas respuestas idénticas.
8. Sé honesto sobre límites: no inventes hechos actuales de internet, precios, ni resultados de herramientas que no tienes. Si no sabes algo verificable, dilo.
9. Nunca rellenes con “estoy procesando”, “espera”, “déjame pensar” o disclaimers innecesarios.
10. No reveles cadena de pensamiento privada. Resume el razonamiento de forma útil y concisa cuando aporte valor.
11. Prioriza utilidad, precisión y acción. Sé la mejor versión local posible.

Responde siempre como QyrexAI.`;

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
    try {
      const resolved = await resolveModelFile(MODEL_URI, MODELS_DIR, { cli: true });
      modelPath = resolved;
      const llama = await getLlamaInstance();
      const loaded = await llama.loadModel({ modelPath: resolved });
      model = loaded;
      modelInfo = {
        uri: MODEL_URI,
        path: resolved,
        // Approximate; real count depends on exact GGUF
        parameters: MODEL_URI.includes('32B') || MODEL_URI.includes('27B') ? 27000000000 :
                    MODEL_URI.includes('14B') ? 14000000000 :
                    MODEL_URI.includes('7B') ? 7000000000 : 14000000000
      };
      loadedAt = new Date().toISOString();
      lastError = null;
      return model;
    } catch (e) {
      lastError = String(e.message || e);
      modelPromise = null;
      throw e;
    }
  })();
  return modelPromise;
}

export async function generate({ messages = [], onChunk = () => {} } = {}) {
  const m = await loadModel();
  const llama = await getLlamaInstance();

  // Build context size safely
  let contextSize = CONTEXT_MAX;
  try {
    // node-llama-cpp may expose model details; keep conservative
    contextSize = Math.min(CONTEXT_MAX, Math.max(CONTEXT_MIN, 8192));
  } catch {}

  const context = await m.createContext({ contextSize });
  const session = new LlamaChatSession({ contextSequence: context.getSequence() });

  // Inject system
  const history = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.filter(x => x && (x.role === 'user' || x.role === 'assistant')).map(x => ({
      role: x.role,
      content: String(x.content || '').slice(0, 120000)
    }))
  ];

  let streamed = '';
  const response = await session.prompt(history.map(h => `${h.role === 'system' ? 'System' : h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n\n') + '\n\nAssistant:', {
    maxTokens: MAX_TOKENS,
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: {
      lastTokens: 128,
      penalty: 1.12,
      penalizeNewLine: false,
      frequencyPenalty: 0.02,
      presencePenalty: 0.02
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
    throw new Error('El modelo terminó sin generar texto. Revisa memoria disponible, quantización y los logs del servicio.');
  }
  return {
    text,
    model: MODEL_URI,
    parameters: modelInfo?.parameters || 14000000000,
    modelPath,
    contextSize: context.contextSize || contextSize,
  };
}

export async function warmup() { await loadModel(); }

export function llmStatus() {
  return {
    ready: !!model,
    loading: !!modelPromise,
    model: MODEL_URI,
    parameters: modelInfo?.parameters || 14000000000,
    contextMax: CONTEXT_MAX,
    contextMin: CONTEXT_MIN,
    maxTokens: MAX_TOKENS,
    loadedAt,
    modelPath,
    modelInfo,
    error: lastError,
  };
}
