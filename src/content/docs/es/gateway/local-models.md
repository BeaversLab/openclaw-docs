---
summary: "Ejecutar OpenClaw en LLMs locales (LM Studio, vLLM, LiteLLM, endpoints personalizados de OpenAI)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "Modelos locales"
---

# Modelos locales

Ejecutarlo localmente es posible, pero OpenClaw espera un contexto grande + defensas sólidas contra la inyección de avisos. Las tarjetas pequeñas truncan el contexto y filtran la seguridad. Apunta alto: **≥2 Mac Studios al máximo o un equipo de GPU equivalente (~$30k+)**. Una sola GPU de **24 GB** solo funciona para avisos más ligeros con mayor latencia. Utiliza la **variante del modelo más grande / de tamaño completo que puedas ejecutar**; los puntos de control cuantificados agresivamente o “pequeños” aumentan el riesgo de inyección de avisos (consulta [Seguridad](/en/gateway/security)).

Si deseas la configuración local con menos fricción, comienza con [Ollama](/en/providers/ollama) y `openclaw onboard`. Esta página es la guía con opiniones para pilas locales de gama alta y servidores locales compatibles con OpenAI personalizados.

## Recomendado: LM Studio + MiniMax M2.5 (API de respuestas, tamaño completo)

Mejor pila local actual. Carga MiniMax M2.5 en LM Studio, habilita el servidor local (por defecto `http://127.0.0.1:1234`) y usa la API de respuestas para mantener el razonamiento separado del texto final.

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

**Lista de verificación de configuración**

- Instalar LM Studio: [https://lmstudio.ai](https://lmstudio.ai)
- En LM Studio, descarga la **compilación más grande de MiniMax M2.5 disponible** (evita las variantes “pequeñas”/muy cuantificadas), inicia el servidor, confirma que `http://127.0.0.1:1234/v1/models` la liste.
- Mantén el modelo cargado; la carga en frío añade latencia de inicio.
- Ajusta `contextWindow`/`maxTokens` si tu compilación de LM Studio difiere.
- Para WhatsApp, mantente en la API de respuestas para que solo se envíe el texto final.

Mantén los modelos alojados configurados incluso cuando ejecutes localmente; usa `models.mode: "merge"` para que las alternativas sigan disponibles.

### Configuración híbrida: alojado principal, alternativa local

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/minimax-m2.5-gs32", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/minimax-m2.5-gs32": { alias: "MiniMax Local" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5 GS32",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

### Primero local con red de seguridad alojada

Intercambia el orden principal y de alternativa; mantén el mismo bloque de proveedores y `models.mode: "merge"` para que puedas recurrir a Sonnet u Opus cuando el cuadro local esté caído.

### Alojamiento regional / enrutamiento de datos

- También existen variantes alojadas de MiniMax/Kimi/GLM en OpenRouter con puntos de conexión anclados a regiones (por ejemplo, alojados en EE. UU.). Elige la variante regional allí para mantener el tráfico en tu jurisdicción elegida mientras sigues usando `models.mode: "merge"` para respaldos de Anthropic/OpenAI.
- Solo local sigue siendo la ruta de privacidad más sólida; el enrutamiento regional alojado es el término medio cuando necesitas funciones del proveedor pero deseas el control sobre el flujo de datos.

## Otros proxies locales compatibles con OpenAI

vLLM, LiteLLM, OAI-proxy o pasarelas personalizadas funcionan si exponen un punto de conexión estilo OpenAI `/v1`. Reemplaza el bloque de proveedor anterior con tu punto de conexión e ID de modelo:

```json5
{
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

Mantén `models.mode: "merge"` para que los modelos alojados sigan disponibles como respaldos.

## Solución de problemas

- ¿La pasarela puede alcanzar el proxy? `curl http://127.0.0.1:1234/v1/models`.
- ¿Modelo de LM Studio descargado? Vuelve a cargarlo; el arranque en frío es una causa común de "bloqueo".
- ¿Errores de contexto? Reduce `contextWindow` o aumenta el límite de tu servidor.
- Seguridad: los modelos locales omiten los filtros del lado del proveedor; mantén los agentes limitados y la compactación activa para limitar el radio de explosión de la inyección de prompts.
