# QyrexAI Local

QyrexAI Local es un proyecto de IA experimental pensado para ejecutarse sin APIs externas.

## Lo que incluye

- UI local en `index.html`.
- Núcleo neuronal local de aproximadamente 4.3 millones de parámetros.
- Motor de generación híbrido para conversación, HTML, Luau, matemáticas, conocimiento y humor.
- Memoria persistente en `localStorage`.
- Entrenamiento local con un dataset inicial.
- Exportación/importación de aprendizaje y pesos.
- Sin llamadas a OpenAI, Gemini, Claude, Hugging Face ni otros servicios externos.

## Importante

Tener millones de parámetros no significa automáticamente tener la capacidad de un LLM grande. Para que un modelo sea realmente capaz de conversar de forma abierta, esos pesos tienen que estar entrenados con un corpus grande y un proceso de entrenamiento serio. Esta versión deja el núcleo y el flujo local preparados para crecer, pero el conocimiento viene de un motor híbrido y un dataset de arranque.

## Cómo abrir

1. Extrae el ZIP.
2. Abre `index.html` directamente en el navegador.
3. En **Modelo** puedes entrenar el dataset inicial.
4. El aprendizaje se guarda localmente en ese navegador.

## Privacidad

No se realizan peticiones de red desde el código del motor.
