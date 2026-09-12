# QyrexAI Pro Max 7.0 — Absorbed Open Models

QyrexAI Pro Max ejecuta un **LLM open-weight real** (por defecto Qwen2.5-14B Instruct GGUF Q4_K_M) **100% local** dentro del proceso Node mediante `node-llama-cpp`.

No llama a OpenAI, Gemini, Claude ni Grok para generar texto. Todo corre en tu máquina / servidor.

## Qué se absorbió de los mejores modelos open-source (2025-2026)

- **Qwen3.x / Qwen3.8 27B** y familia Qwen2.5 → excelente instrucción, coding, multilingüe y razonamiento.
- **DeepSeek-R1 / V3 distillados** → patrones de razonamiento fuerte y math.
- **Llama 4 / Gemma 4 / GLM-5** → buenas prácticas de system prompt, honestidad sobre límites y utilidad directa.

El system prompt está diseñado para que QyrexAI se comporte como un asistente de alto nivel: resuelve, no solo describe; da código completo; calcula con cuidado; habla natural en español/inglés.

## Modelos recomendados (cambia con env)

```bash
# Por defecto (buen balance calidad/memoria)
export QYREX_MODEL_URI="hf:Qwen/Qwen2.5-14B-Instruct-GGUF:Q4_K_M"

# Más potente (necesita más RAM/VRAM)
export QYREX_MODEL_URI="hf:Qwen/Qwen2.5-32B-Instruct-GGUF:Q4_K_M"
# o (si está disponible en HF)
export QYREX_MODEL_URI="hf:unsloth/Qwen3.8-27B-GGUF:Q4_K_M"

# Más ligero
export QYREX_MODEL_URI="hf:Qwen/Qwen2.5-7B-Instruct-GGUF:Q4_K_M"
```

El modelo se descarga y cachea automáticamente en `data/models/` la primera vez.

## Arranque

```bash
npm install
node server.js
```

- Health: `/health` o `/api/status`
- Chat stream: `POST /api/chat-stream`
- Conversaciones, archivos e imágenes persistentes en disco

## Render / producción

Build: `npm install`  
Start: `node server.js`  

Usa el disco persistente de `render.yaml` para que chats, archivos y el caché del modelo sobrevivan a redeploys.

## Límites honestos

- Es un modelo open-weight real (14B+), no un motor de reglas.
- La calidad depende del modelo elegido, la cuantización, el hardware y el contexto.
- No supera automáticamente a los modelos de frontera propietarios de 2026, pero es de lo mejor que puedes correr 100% local sin APIs de terceros.
- Para “más de 20.000 parámetros”: los modelos reales tienen **miles de millones**. El número de parámetros del modelo activo se reporta en `/api/status`.

## Estructura

- `llm.js` — carga del modelo + system prompt absorbido
- `server.js` — API HTTP + streaming
- `store.js` — persistencia de chats, archivos y perfiles de modelos
- `public/index.html` — UI
- `model-config.json` — metadatos
