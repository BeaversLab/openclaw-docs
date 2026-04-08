---
summary: "Ejecutar OpenClaw en LLMs locales (LM Studio, vLLM, LiteLLM, endpoints personalizados de OpenAI)"
read_when:
  - You want to serve models from your own GPU box
  - You are wiring LM Studio or an OpenAI-compatible proxy
  - You need the safest local model guidance
title: "Modelos locales"
---

# Modelos locales

Lo local es viable, pero OpenClaw espera un contexto grande + defensas sólidas contra la inyección de avisos (prompts). Las tarjetas pequeñas truncan el contexto y filtran la seguridad. Apunta alto: **≥2 Mac Studios al máximo o un equipo GPU equivalente (~$30k+)**. Una sola GPU de **24 GB** solo funciona para avisos más ligeros con mayor latencia. Usa la **variante de modelo más grande/tamaño completo que puedas ejecutar**; los puntos de control (checkpoints) cuantificados agresivamente o “pequeños” aumentan el riesgo de inyección de avisos (consulta [Security](/en/gateway/security)).

Si quieres la configuración local con menos fricción, comienza con [Ollama](/en/providers/ollama) y `openclaw onboard`. Esta página es la guía con opiniones para pilas locales de gama alta y servidores locales personalizados compatibles con OpenAI.

## Recomendado: LM Studio + modelo local grande (Responses API)

El mejor stack local actual. Carga un modelo grande en LM Studio (por ejemplo, una compilación Qwen, DeepSeek o Llama de tamaño completo), habilita el servidor local (por defecto `http://127.0.0.1:1234`) y utiliza Responses API para mantener el razonamiento separado del texto final.

```json5
{
  agents: {
    defaults: {
      model: { primary: “lmstudio/my-local-model” },
      models: {
        “anthropic/claude-opus-4-6”: { alias: “Opus” },
        “lmstudio/my-local-model”: { alias: “Local” },
      },
    },
  },
  models: {
    mode: “merge”,
    providers: {
      lmstudio: {
        baseUrl: “http://127.0.0.1:1234/v1”,
        apiKey: “lmstudio”,
        api: “openai-responses”,
        models: [
          {
            id: “my-local-model”,
            name: “Local Model”,
            reasoning: false,
            input: [“text”],
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

- Instala LM Studio: [https://lmstudio.ai](https://lmstudio.ai)
- En LM Studio, descarga la **compilación de modelo más grande disponible** (evita las variantes “pequeñas”/fuertemente cuantificadas), inicia el servidor, confirma que `http://127.0.0.1:1234/v1/models` lo enumera.
- Reemplaza `my-local-model` con el ID de modelo real que se muestra en LM Studio.
- Mantén el modelo cargado; la carga en frío añade latencia de inicio.
- Ajusta `contextWindow`/`maxTokens` si tu compilación de LM Studio difiere.
- Para WhatsApp, mantente en Responses API para que solo se envíe el texto final.

Mantén los modelos alojados configurados incluso cuando se ejecute localmente; utiliza `models.mode: "merge"` para que las alternativas de respaldo sigan disponibles.

### Configuración híbrida: alojado principal, respaldo local

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/my-local-model", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/my-local-model": { alias: "Local" },
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
            id: "my-local-model",
            name: "Local Model",
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

### Local primero con red de seguridad alojada

Intercambia el orden principal y de respaldo; mantén el mismo bloque de proveedores y `models.mode: "merge"` para que puedas volver a Sonnet u Opus cuando el equipo local esté caído.

### Alojamiento regional / enrutamiento de datos

- También existen variantes alojadas de MiniMax/Kimi/GLM en OpenRouter con endpoints anclados a regiones (por ejemplo, alojados en EE. UU.). Elige la variante regional allí para mantener el tráfico en tu jurisdicción elegida mientras sigues utilizando `models.mode: "merge"` para las alternativas de Anthropic/OpenAI.
- Solo local sigue siendo la ruta de privacidad más sólida; el enrutamiento regional alojado es el término medio cuando necesitas funciones del proveedor pero quieres controlar el flujo de datos.

## Otros servidores proxy locales compatibles con OpenAI

vLLM, LiteLLM, OAI-proxy o gateways personalizados funcionan si exponen un punto final `/v1` estilo OpenAI. Reemplaza el bloque de proveedor anterior con tu punto final e ID de modelo:

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

Mantén `models.mode: "merge"` para que los modelos alojados sigan disponibles como respaldo.

Nota de comportamiento para backends locales/proxificados `/v1`:

- OpenClaw trata estos como rutas compatibles con OpenAI de estilo proxy, no como
  endpoints nativos de OpenAI
- el modelado de solicitudes solo nativo de OpenAI no se aplica aquí: sin
  `service_tier`, sin Responses `store`, sin modelado
  de carga compatible con el razonamiento de OpenAI, y sin sugerencias de
  caché de avisos
- los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
  no se inyectan en estas URL de proxy personalizadas

## Solución de problemas

- ¿Puede el Gateway alcanzar el proxy? `curl http://127.0.0.1:1234/v1/models`.
- ¿Modelo de LM Studio descargado? Vuelve a cargarlo; el inicio en frío es una causa común de "bloqueo".
- ¿Errores de contexto? Reduce `contextWindow` o aumenta el límite de tu servidor.
- Seguridad: los modelos locales omiten los filtros del lado del proveedor; mantén los agentes limitados y la compactación activa para limitar el radio de explosión de la inyección de avisos.
