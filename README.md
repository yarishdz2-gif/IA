# QyrexAI Real — Render

Asistente conversacional con LLM generativo local en tu propio servidor Node. La interfaz muestra la respuesta mientras el modelo la genera, en lugar de esperar a que termine toda la inferencia.

## Qué usa
- Node.js + `server.js`
- Transformers.js
- `onnx-community/Qwen2.5-0.5B-Instruct` por defecto
- `TextStreamer` para streaming token a token
- Memoria/contexto en el navegador mediante `localStorage`
- Sin OpenAI/Gemini/Claude ni API de inferencia externa

El modelo ONNX de Qwen3 está publicado para Transformers.js y soporta `TextStreamer`; la variante `q4f16` está cuantizada para reducir memoria. Consulta el modelo configurado en `QYREX_MODEL` si quieres cambiarlo.

## Render
Build Command:
```text
npm install
```
Start Command:
```text
node server.js
```

Health check:
```text
/health
```

## Variables opcionales
```text
QYREX_MODEL=onnx-community/Qwen2.5-0.5B-Instruct
QYREX_DTYPE=q4f16
QYREX_MAX_NEW_TOKENS=768
QYREX_MAX_HISTORY=12
QYREX_MODEL_CACHE=./.qcache
```

## Flujo
1. Render inicia `server.js`.
2. La web consulta `/api/status` y comienza el precalentamiento en `/api/warmup`.
3. Al enviar un mensaje, el navegador abre `/api/chat-stream`.
4. El servidor usa `TextStreamer` y envía eventos SSE conforme genera tokens.
5. La interfaz pinta el texto inmediatamente y guarda el turno en memoria local.

La primera carga es más lenta porque el modelo debe descargarse y entrar en caché. Las siguientes peticiones reutilizan el modelo mientras el proceso de Render siga vivo.


El servidor prueba automáticamente `onnx-community/Qwen2.5-0.5B-Instruct` y `onnx-community/Qwen3-0.6B-ONNX`, primero con `q4f16` y después con `q4`. Puedes cambiarlo con `QYREX_MODELS` y `QYREX_DTYPES`.
