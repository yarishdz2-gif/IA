# QyrexAI Pro Max 7.0

Versión centrada en que el modelo **sí genere texto** de forma fiable y rápida dentro de Render.

## Motor

Primario: `bartowski/Qwen_Qwen3-4B-Instruct-2507-GGUF:Q4_K_M` (~4B parámetros). Qwen3-4B-Instruct-2507 en Q4_K_M es una opción local relativamente compacta; el repositorio cuantizado publica un archivo de ~2.50 GB y recomienda Q4_K_M como opción equilibrada. citehttps://huggingface.co/bartowski/Qwen_Qwen3-4B-Instruct-2507-GGUF

Fallbacks automáticos:
1. Qwen3-4B-Instruct-2507
2. Qwen2.5-3B-Instruct
3. Qwen2.5-1.5B-Instruct
4. Qwen2.5-0.5B-Instruct

## Correcciones clave

- Se usa `model.createContext()` sin forzar una estructura de `contextSize` incompatible.
- `LlamaChatSession` recibe el contexto mediante `contextSequence`.
- El system prompt se inserta como `ChatHistoryItem` tipo `system`.
- El historial de modelo usa `{type:'model', response:[...]}`.
- Se usa `onTextChunk` para streaming.
- Si un modelo no carga, se prueba el siguiente.
- `/api/test` ejecuta una generación mínima real y permite comprobar el modelo antes de usar el chat.

La documentación actual de `node-llama-cpp` muestra `LlamaChatSession` con `model.createContext()` y `context.getSequence()`, además de `onTextChunk` para streaming. citehttps://node-llama-cpp.withcat.ai/guide/chat-session

## Render

Build: `npm install`

Start: `node server.js`

Health: `/health`

Diagnóstico del LLM: `/api/test`

El disco persistente se monta en `/opt/render/project/src/data` para chats, archivos e imágenes.
