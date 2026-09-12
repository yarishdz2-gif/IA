# QyrexAI Real 3.0

QyrexAI Real is a Render-ready Node application with a web UI, persistent browser memory, a local neural utility core, and a real generative LLM executed by your own Node process through Transformers.js.

## Render

Runtime: Node
Build command: `npm install`
Start command: `node server.js`

The server listens on `0.0.0.0` and `process.env.PORT`.

## Real LLM

Default model:
`onnx-community/Qwen3-0.6B-DQ-ONNX`

The model is quantized and is fetched/cached automatically by Transformers.js on the first model load. No OpenAI/Gemini/Claude inference API is used.

Environment variables:
- `QYREX_MODEL` to select another compatible Transformers.js text-generation model.
- `QYREX_MAX_NEW_TOKENS` to change the generation limit.
- `QYREX_MODEL_CACHE` to change the model cache directory.

## Important

This is now an actual generative assistant, but it is not honest to call it "better than Gemini" simply from the UI or parameter count. The included 0.6B model is a real pretrained model and is far more capable than the previous rule-only fallback, but frontier models are much larger and trained on much more data.

The old local neural core is retained as a fallback when the generative model is unavailable.
