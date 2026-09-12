# QyrexAI Pro Max 8.0

Versión orientada a Render CPU y a evitar el problema anterior de "se queda respondiendo".

## Motor
- Transformers.js + ONNX.
- Modelo por defecto: `Mozilla/Qwen2.5-0.5B-Instruct`.
- Cuantización `q4`.
- Streaming con `TextStreamer`.
- Cola de inferencia de una petición para evitar carreras de memoria.
- Límite temporal de generación mediante `max_time`.

Transformers.js documenta `text-generation` con `TextStreamer` y modelos ONNX en Node.

## Render
Build Command: `npm install`
Start Command: `node server.js`
Health: `/health`

## Comprobación
Después de desplegar: `GET /api/test` debe devolver texto `OK` generado por el modelo.

## Variables opcionales
- `QYREX_MODEL_ID` (por defecto `Mozilla/Qwen2.5-0.5B-Instruct`)
- `QYREX_DTYPE` (por defecto `q4`)
- `QYREX_MAX_TOKENS` (64-512)
- `QYREX_MAX_TIME` (5-30 segundos)
- `QYREX_CONTEXT_MESSAGES` (4-16)

El primer arranque necesita descargar el modelo y puede tardar; el modelo queda en caché en `models/`.
