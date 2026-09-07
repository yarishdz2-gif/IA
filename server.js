// ---------------------------------------------------------------
// server.js   (versión final con fallback de fetch)
// ---------------------------------------------------------------

require('dotenv').config();                 // Carga .env
const express = require('express');
const path = require('path');

// ---------------------------------------------------------------
// 0️⃣  FETCH – fallback entre nativo y node-fetch
// ---------------------------------------------------------------
let fetchFn;

// Si el runtime ya expone fetch (Node >= 18) → lo usamos directamente.
if (typeof fetch === 'function') {
  fetchFn = fetch;
} else {
  // En versiones antiguas intentamos cargar node-fetch@2 (CommonJS)
  try {
    // require funciona porque la v2 exporta la función directamente.
    fetchFn = require('node-fetch');
  } catch (e) {
    console.error('❌ No se encontró node-fetch y el runtime no tiene fetch nativo.');
    console.error('   Instala node-fetch@2 o usa Node >= 18.');
    process.exit(1); // abortamos porque no podemos continuar.
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------
// 1️⃣ CONFIGURACIÓN BÁSICA
// ---------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));         // Archivos estáticos (frontend)

// ---------------------------------------------------------------
// 2️⃣ MAPA DE SUSTITUCIÓN DE MODELOS DEPRECIADOS
// ---------------------------------------------------------------
/**
 * Si Groq deprecia un modelo, indícalo aquí y asigna el modelo que
 * debe usarse en su lugar.
 *
 * Ejemplo:
 *   'gemma2-9b-it': 'mixtral-8x7b-32768',
 */
const modelFallbackMap = {
  'gemma2-9b-it': 'mixtral-8x7b-32768',
  // 'old-model-name': 'new-model-name',
};

// ---------------------------------------------------------------
// 3️⃣ LISTA DE MODELOS PERMITIDOS (whitelist)
// ---------------------------------------------------------------
/**
 * Sólo los modelos presentes en este Set pueden ser usados por la API.
 * Añade o elimina según lo que tengas habilitado en la consola de Groq.
 */
const allowedModels = new Set([
  'mixtral-8x7b-32768',
  'llama3.1-70b-versatile',
  'llama3.1-8b',
  // 'otro-modelo-que-uses',
]);

// ---------------------------------------------------------------
// 4️⃣ HELPERS
// ---------------------------------------------------------------
/**
 * Devuelve `true` si el objeto parece ser un array de mensajes válido.
 * Cada mensaje debe tener: { role: 'system'|'assistant'|'user', content: string }
 */
function isValidMessagesArray(messages) {
  if (!Array.isArray(messages)) return false;
  return messages.every(
    (msg) =>
      typeof msg === 'object' &&
      typeof msg.role === 'string' &&
      typeof msg.content === 'string'
  );
}

/**
 * Formatea el error que vamos a enviar al cliente.
 * En producción enviamos solo lo imprescindible.
 */
function formatErrorResponse(message, extra = {}) {
  const base = { error: message };
  if (process.env.NODE_ENV !== 'production') {
    return { ...base, ...extra };
  }
  return base;
}

// ---------------------------------------------------------------
// 5️⃣ ENDPOINT /api/chat
// ---------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    // -----------------------------------------------------------
    // 5.1️⃣  VALIDAR API‑KEY
    // -----------------------------------------------------------
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json(
          formatErrorResponse(
            'GROQ_API_KEY no está configurada en las variables de entorno.'
          )
        );
    }

    // -----------------------------------------------------------
    // 5.2️⃣  VALIDAR Y NORMALIZAR EL MODELO
    // -----------------------------------------------------------
    let model = req.body.model || 'llama3.1-70b-versatile';

    // Si el modelo está deprecado → sustituir por el fallback
    if (modelFallbackMap[model]) {
      console.warn(
        `Modelo "${model}" está decommissioned. Se reemplaza por "${modelFallbackMap[model]}".`
      );
      model = modelFallbackMap[model];
    }

    // Comprobar que el modelo final está permitido
    if (!allowedModels.has(model)) {
      return res
        .status(400)
        .json(
          formatErrorResponse(
            `Modelo "${model}" no está soportado por esta API.`,
            { allowedModels: Array.from(allowedModels) }
          )
        );
    }

    // -----------------------------------------------------------
    // 5.3️⃣  VALIDAR EL CUERPO DE MENSAJES
    // -----------------------------------------------------------
    const { messages, temperature, max_tokens, top_p, stream } = req.body;

    if (!isValidMessagesArray(messages)) {
      return res
        .status(400)
        .json(
          formatErrorResponse(
            'El campo "messages" debe ser un array de objetos con "role" y "content".'
          )
        );
    }

    // -----------------------------------------------------------
    // 5.4️⃣  CONSTRUIR EL PAYLOAD PARA GROQ
    // -----------------------------------------------------------
    const payload = {
      model,
      messages,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      // Opcionales: solo se añaden si están definidos
      ...(max_tokens !== undefined && { max_tokens }),
      ...(top_p !== undefined && { top_p }),
      ...(stream !== undefined && { stream })
    };

    // -----------------------------------------------------------
    // 5.5️⃣  LLAMADA A LA API DE GROQ
    // -----------------------------------------------------------
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // -----------------------------------------------------------
    // 5.6️⃣  PROCESAR LA RESPUESTA
    // -----------------------------------------------------------
    // Primero comprobamos el Content‑Type. Groq siempre debería devolver JSON,
    // pero en caso de error 502/503 a veces devuelve HTML.
    const contentType = response.headers.get('content-type') || '';

    let data;
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonErr) {
        // JSON malformado → devolvemos texto crudo para depurar
        const raw = await response.text();
        console.error('Error al parsear JSON de Groq:', jsonErr);
        console.error('Cuerpo recibido:', raw);
        return res
          .status(502)
          .json(
            formatErrorResponse('Respuesta inesperada de Groq (JSON inválido).', {
              raw,
            })
          );
      }
    } else {
      // No es JSON → tratamos como texto plano
      const raw = await response.text();
      console.warn('Respuesta de Groq no es JSON (Content-Type:', contentType, ')');
      return res
        .status(response.status || 502)
        .json(
          formatErrorResponse('Respuesta no JSON de Groq.', {
            raw,
            contentType,
          })
        );
    }

    // Si la API devolvió un código de error (4xx/5xx) lo propagamos tal cual
    if (!response.ok) {
      console.error('Error de Groq (status:', response.status, '):', data);
      return res
        .status(response.status)
        .json(
          formatErrorResponse(
            data?.error?.message || 'Error de Groq',
            { groqError: data }
          )
        );
    }

    // -----------------------------------------------------------
    // 5.7️⃣  TODO OK → devolver respuesta de Groq al cliente
    // -----------------------------------------------------------
    res.json(data);
  } catch (err) {
    // -----------------------------------------------------------
    // 5️⃣️⃣  GESTIÓN DE EXCEPCIONES IMPREVISTAS
    // -----------------------------------------------------------
    console.error('Excepción en /api/chat →', err);
    // Si el error proviene de node‑fetch, puede contener `cause`
    const details = process.env.NODE_ENV !== 'production' ? err.message : undefined;
    res
      .status(500)
      .json(formatErrorResponse('Error interno al comunicarse con Groq.', { details }));
  }
});

// ---------------------------------------------------------------
// 6️⃣ SERVIDOR ESTÁTICO (para servir el front‑end si está en el mismo repo)
// ---------------------------------------------------------------
app.get('*', (req, res) => {
  const indexPath = path.resolve(__dirname, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
