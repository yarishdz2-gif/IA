# QyrexAI Ultra

Asistente generativo local para Render/Node.js, sin proveedor de inferencia de IA externo.

## Motor

El motor principal usa `opalitestudios/Qwen2.5-3B-Instruct-ONNX` con cuantización `q4f16`. Si ese modelo no puede cargarse, el servidor baja automáticamente a Qwen3 1.7B, Qwen2.5 1.5B y finalmente 0.5B.

El modelo principal tiene ~3B parámetros, por lo que supera ampliamente el aumento de 500M solicitado respecto al modelo anterior de 1.5B.

## Render

- Build Command: `npm install`
- Start Command: `node server.js`
- Health Check: `/health`

## Variables opcionales

- `QYREX_MODELS` para personalizar el orden de modelos.
- `QYREX_DTYPES` para personalizar cuantización; normalmente `q4f16,q4`.
- `QYREX_MAX_NEW_TOKENS` para limitar salida.
- `QYREX_MAX_HISTORY` para el contexto conversacional.
- `QYREX_MODEL_CACHE` para el directorio de cache.

## Endpoints

- `GET /health`
- `GET /api/status`
- `POST /api/warmup`
- `POST /api/chat`
- `POST /api/chat-stream`

## Importante

El primer arranque puede ser lento porque Render debe descargar los pesos del modelo. La app muestra el estado de carga y después transmite la respuesta progresivamente.

El rendimiento real depende de CPU, RAM y almacenamiento del plan de Render. Un modelo de 3B requiere bastante más memoria que uno de 0.5B/1.5B.
