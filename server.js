// ---------------------------------------------------------------
// server.js
// ---------------------------------------------------------------
require('dotenv').config();               // carga .env (solo en desarrollo)
const express = require('express');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Configuración básica ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ---------- 1️⃣ MAPA DE SUSTITUCIÓN ----------
/**
 * Si Groq deprecia un modelo, pon aquí el nombre que debes
 * usar en su lugar. Puedes añadir tantos como necesites.
 */
const modelFallbackMap = {
    'gemma2-9b-it': 'mixtral-8x7b-32768',
    // 'old-model-name': 'new-model-name',
};

// ---------- 2️⃣ LISTA DE MODELOS PERMITIDOS ----------
/**
 * Sólo los modelos que aparecen en este Set pueden ser usados.
 * Añade o elimina según los que tengas habilitados en la consola
 * de Groq (https://console.groq.com/models).
 */
const allowedModels = new Set([
    'mixtral-8x7b-32768',
    'llama3.1-70b-versatile',
    'llama3.1-8b',
    // 'otro-modelo-que-uses',
]);

// ---------- 3️⃣ RUTA API ----------
app.post('/api/chat', async (req, res) => {
    try {
        // ---- 3.1️⃣ Obtención de la API‑Key ----
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                error: 'GROQ_API_KEY no está configurada en las variables de entorno.'
            });
        }

        // ---- 3.2️⃣ Selección y validación del modelo ----
        // Si el cliente no envía modelo, usamos uno por defecto.
        let model = req.body.model || 'llama3.1-70b-versatile';

        // 1️⃣ ¿Está el modelo en la lista de deprecados? → lo sustituimos.
        if (modelFallbackMap[model]) {
            console.warn(
                `Modelo "${model}" está decommissioned. ` +
                `Se reemplaza por "${modelFallbackMap[model]}".`
            );
            model = modelFallbackMap[model];
        }

        // 2️⃣ ¿Es el modelo resultante permitido? Si no, error 400.
        if (!allowedModels.has(model)) {
            return res.status(400).json({
                error: `Modelo "${model}" no está soportado por esta API.`,
                allowedModels: Array.from(allowedModels)
            });
        }

        // ---- 3.3️⃣ Construcción del cuerpo para Groq ----
        const payload = {
            model,
            messages: req.body.messages,
            temperature: req.body.temperature ?? 0.7,
            // Puedes añadir más opciones aquí (max_tokens, top_p, etc.)
        };

        // ---- 3.4️⃣ Llamada a la API de Groq ----
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // ---- 3.5️⃣ Propagar la respuesta (o error) ----
        const data = await response.json();

        // Si Groq responde con un código de error, lo devolvemos tal cual.
        if (!response.ok) {
            console.error('Respuesta de Groq con error:', data);
            return res.status(response.status).json(data);
        }

        // Éxito
        res.json(data);
    } catch (err) {
        console.error('Error en el proxy de Groq:', err);
        res.status(500).json({ error: 'Error interno al comunicarse con Groq.' });
    }
});

// ---------------------------------------------------------------
// Servidor estático (para servir tu front‑end si está en el mismo repo)
// ---------------------------------------------------------------
app.get('*', (req, res) => {
    // Si tienes un `index.html` en la raíz, se sirve por defecto.
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
