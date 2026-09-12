# QyrexAI Pro Max 6.0

QyrexAI Pro Max usa un LLM de **7B parámetros** con pesos preentrenados, ejecutado localmente dentro de tu propio proceso Node mediante `node-llama-cpp`. El modelo se resuelve desde Hugging Face con la URI `hf:Qwen/Qwen2.5-7B-Instruct-GGUF:Q4_K_M` y queda en el caché/modelos persistente del servicio.

El proyecto guarda en servidor:
- conversaciones y mensajes
- chats abiertos/cerrados
- archivos e imágenes subidos
- perfiles de modelos
- preferencias básicas

La API de inferencia es **local al propio servidor**: no se llama a OpenAI, Gemini, Claude ni Grok para generar la respuesta.

## Render

Build: `npm install`

Start: `node server.js`

Health: `/health`

Para que chats, archivos e imágenes persistan después de reinicios/redeploys, usa el disco persistente incluido en `render.yaml`.

### Modelo

Predeterminado: `Qwen/Qwen2.5-7B-Instruct`, cuantización `Q4_K_M`. Qwen publica el modelo GGUF y documenta su uso con llama.cpp; `node-llama-cpp` puede resolver modelos Hugging Face usando la URI `hf:<user>/<model>:<quant>`.

### Nota de capacidad

7B > 5B parámetros reales, pero el número de parámetros no garantiza superar modelos comerciales de frontera. La calidad depende de los pesos, entrenamiento, contexto, herramientas y hardware de inferencia.
