// ---------------------------------------------------------------
// server.js  –  QyrexAI Workspace (OpenRouter proxy)
// Listo para producción en Render / Railway / etc.
// ---------------------------------------------------------------

require('dotenv').config(); // Solo en desarrollo local
const express = require('express');
const path = require('path');

// ---------------------------------------------------------------
// 0️⃣  FETCH (nativo en Node ≥ 18)
// ---------------------------------------------------------------
let fetchFn;
if (typeof fetch === 'function') {
  fetchFn = fetch;
} else {
  try {
    fetchFn = require('node-fetch');
  } catch (e) {
    console.error('❌ No hay fetch nativo ni node-fetch. Usa Node ≥ 18 o instala node-fetch@2');
    process.exit(1);
  }
}

// ---------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------
// 1️⃣  CONFIGURACIÓN BÁSICA
// ---------------------------------------------------------------
app.use(express.json({ limit: '25mb' })); // Imágenes base64
app.use(express.static(path.join(__dirname))); // Sirve index.html y assets

// ---------------------------------------------------------------
// 2️⃣  HELPERS
// ---------------------------------------------------------------

/**
 * Valida que messages sea un array de objetos con role + content.
 * content puede ser string O array (multimodal / imágenes).
 */
function isValidMessagesArray(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  return messages.every((msg) => {
    if (typeof msg !== 'object' || msg === null) return false;
    if (typeof msg.role !== 'string') return false;
    // content puede ser string o array de partes
    return (
      typeof msg.content === 'string' ||
      Array.isArray(msg.content)
    );
  });
}

/**
 * Formatea errores. En producción solo se envía el mensaje limpio.
 */
function formatErrorResponse(message, extra = {}) {
  const base = { error: message };
  if (process.env.NODE_ENV !== 'production') {
    return { ...base, ...extra };
  }
  return base;
}

// ---------------------------------------------------------------
// 3️⃣  ENDPOINT PRINCIPAL /api/chat
// ---------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    // ---------------------------------------------------------
    // 3.1  API Key
    // ---------------------------------------------------------
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json(
          formatErrorResponse(
            'OPENROUTER_API_KEY no está configurada. Añádela en las Environment Variables de Render.'
          )
        );
    }

    // ---------------------------------------------------------
    // 3.2  Extraer y normalizar body
    // ---------------------------------------------------------
    let {
      model = 'meta-llama/llama-3.3-70b-instruct',
      messages,
      temperature = 0.7,
      max_tokens,
      top_p,
      stream = false,
    } = req.body;

    // Limpieza básica del modelo
    if (typeof model !== 'string' || !model.trim()) {
      model = 'meta-llama/llama-3.3-70b-instruct';
    }
    model = model.trim();

    // ---------------------------------------------------------
    // 3.3  Validar mensajes
    // ---------------------------------------------------------
    if (!isValidMessagesArray(messages)) {
      return res.status(400).json(
        formatErrorResponse(
          'El campo "messages" debe ser un array de objetos con "role" y "content" (string o array multimodal).'
        )
      );
    }

    // ---------------------------------------------------------
    // 3.4  Payload para OpenRouter
    // ---------------------------------------------------------
    const payload = {
      model,
      messages,
      temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 2) : 0.7,
      ...(typeof max_tokens === 'number' && { max_tokens }),
      ...(typeof top_p === 'number' && { top_p }),
      stream: Boolean(stream),
    };

    // ---------------------------------------------------------
    // 3.5  Headers recomendados por OpenRouter
    // ---------------------------------------------------------
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://qyrexai-workspace.onrender.com',
      'X-Title': process.env.OPENROUTER_SITE_NAME || 'QyrexAI Workspace',
    };

    // ---------------------------------------------------------
    // 3.6  Llamada a OpenRouter
    // ---------------------------------------------------------
    const response = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';

    // ---------------------------------------------------------
    // 3.7  Procesar respuesta
    // ---------------------------------------------------------
    let data;
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonErr) {
        const raw = await response.text();
        console.error('❌ Error parseando JSON de OpenRouter:', jsonErr.message);
        console.error('Raw body:', raw.slice(0, 500));
        return res
          .status(502)
          .json(formatErrorResponse('Respuesta inválida de OpenRouter (JSON).', { raw: raw.slice(0, 300) }));
      }
    } else {
      const raw = await response.text();
      console.warn('⚠️ OpenRouter devolvió Content-Type no JSON:', contentType);
      return res
        .status(response.status || 502)
        .json(formatErrorResponse('Respuesta no JSON de OpenRouter.', { contentType, raw: raw.slice(0, 300) }));
    }

    // Error de la API (4xx / 5xx)
    if (!response.ok) {
      const msg =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        `Error de OpenRouter (HTTP ${response.status})`;
      console.error('❌ OpenRouter error:', response.status, msg);
      return res.status(response.status).json(formatErrorResponse(msg, { openrouter: data }));
    }

    // ---------------------------------------------------------
    // 3.8  Éxito → devolver tal cual (formato OpenAI compatible)
    // ---------------------------------------------------------
    res.json(data);
  } catch (err) {
    console.error('💥 Error interno en /api/chat:', err);
    res
      .status(500)
      .json(
        formatErrorResponse(
          err.message || 'Error interno del servidor',
          process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}
        )
      );
  }
});

// ---------------------------------------------------------------
// 4️⃣  Health check (útil en Render)
// ---------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'QyrexAI Workspace',
    provider: 'OpenRouter',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------
// 5️⃣  SPA fallback (por si se usa routing del frontend)
// ---------------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------------
// 6️⃣  Arranque
// ---------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 QyrexAI Workspace (OpenRouter) escuchando en puerto ${PORT}`);
  console.log(`   OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? '✅ configurada' : '❌ FALTA'}`);
});
