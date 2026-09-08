# QyrexAI Workspace v3.0 (OpenRouter)

Chat workspace moderno con proxy seguro a **OpenRouter**.

## Despliegue en Render

1. Crea un nuevo **Web Service** y conecta este repositorio (o sube los archivos).
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. En **Environment** agrega la variable:

   ```
   OPENROUTER_API_KEY = sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx
   ```

   (Opcional)
   ```
   OPENROUTER_SITE_URL = https://tu-app.onrender.com
   OPENROUTER_SITE_NAME = QyrexAI Workspace
   NODE_ENV = production
   ```

5. Deploy.

## Variables de entorno

| Variable                | Requerida | Descripción                                      |
|-------------------------|-----------|--------------------------------------------------|
| `OPENROUTER_API_KEY`    | ✅ Sí     | Tu API Key de https://openrouter.ai/settings/keys |
| `OPENROUTER_SITE_URL`   | No        | URL de tu app (para rankings de OpenRouter)      |
| `OPENROUTER_SITE_NAME`  | No        | Nombre de tu app                                 |
| `PORT`                  | No        | Render lo pone automáticamente                   |
| `NODE_ENV`              | No        | `production` recomendado                         |

## Modelos incluidos

- **🔥 El Mejor** → `meta-llama/llama-3.3-70b-instruct`
- **⚡ El Fast** → `google/gemini-2.5-flash`
- **🧠 DeepSeek Chat** → `deepseek/deepseek-chat`
- **⚖️ El Medio** → `mistralai/mixtral-8x7b-instruct`
- **💻 GPT-4o Mini** → `openai/gpt-4o-mini`
- **🆓 Free Models Router** → `openrouter/free` (elige automáticamente un modelo gratis disponible)

Puedes cambiar o añadir más modelos editando el `<select id="model-select">` en `index.html`.

## Desarrollo local

```bash
cp .env.example .env   # crea el archivo y pon tu key
npm install
npm start
```

Luego abre http://localhost:3000

## Características

- Proxy seguro (la API key nunca sale del servidor)
- Soporte de imágenes y archivos adjuntos (multimodal)
- Historial de chats en localStorage
- Scratchpad, export JSON, temperature y system prompt configurables
- UI dark moderna con Tailwind + Highlight.js + Marked
- Health check: `GET /api/health`
