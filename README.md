# QyrexAI Local 2.0 — Render / sin APIs

IA experimental 100% local para desplegar como sitio estático en Render.

## Núcleo
- 8,388,608 parámetros reales en `Float32Array`.
- Embeddings de 256 dimensiones.
- 6 bloques neuronales locales.
- Clasificación neural y similitud semántica.
- Entrenamiento incremental en el navegador.
- Memoria persistente con localStorage.
- Sin OpenAI, Claude, Gemini ni APIs de inferencia.

## Render
1. Sube este directorio a GitHub.
2. En Render crea **Static Site**.
3. Selecciona el repositorio.
4. Build Command: vacío.
5. Publish Directory: `.`

También se incluye `render.yaml` para configuración declarativa.

## Nota técnica
Millones de parámetros no garantizan por sí solos la inteligencia de un LLM de frontera. QyrexAI usa un núcleo neuronal local real combinado con memoria, herramientas deterministas y un dataset inicial. Para aumentar la calidad conversacional hace falta entrenar pesos con un corpus grande y datos de calidad.
