# QyrexAI Real Gen 8.0

Motor generativo real para Render usando Transformers.js + ONNX Runtime CPU. Se eliminó node-llama-cpp porque el servicio anterior podía quedar bloqueado cargando o terminar sin texto.

## Modelo

Modo automático:
- RAM >= 6 GB: `onnx-community/Qwen2.5-1.5B-Instruct` con `q4`.
- RAM < 6 GB: `onnx-community/Qwen2.5-0.5B-Instruct` con `q4`.
- Si el principal falla, cambia al otro automáticamente.

Los modelos ONNX anteriores están publicados específicamente para Transformers.js y su README oficial muestra el uso con `pipeline('text-generation', ...)`. La variante `q4` del 0.5B ocupa ~786 MB; `q4f16` ocupa ~483 MB. La API oficial también documenta `TextStreamer` para mostrar texto progresivamente.

## Render

Build command: `npm install`
Start command: `node server.js`
Health check: `/health`

Se usa un disco persistente en `/opt/render/project/src/data` para conversaciones, archivos, imágenes y caché del modelo.

## Diagnóstico

- `/api/status` — estado del motor y último error.
- `/api/test` — genera una respuesta mínima real.
- `/api/warmup` — carga el modelo y prueba generación.

## Variables opcionales

`QYREX_MODEL_ID` puede forzar un modelo Transformers.js compatible.
`QYREX_DTYPE` puede ser `q4`, `q4f16`, `q8`, etc., si el modelo lo soporta.
`QYREX_MAX_TOKENS` controla la longitud máxima de salida.
`QYREX_THREADS` controla los hilos CPU.
