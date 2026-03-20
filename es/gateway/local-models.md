---
summary: "Ejecuta OpenClaw en LLM locales (LM Studio, vLLM, LiteLLM, endpoints personalizados de OpenAI)"
read_when:
  - Quieres servir modelos desde tu propia caja GPU
  - Estás conectando LM Studio o un proxy compatible con OpenAI
  - Necesitas la guía más segura para modelos locales
title: "Modelos locales"
---

# Modelos locales

Lo local es factible, pero OpenClaw espera un contexto grande + defensas fuertes contra la inyección de prompts. Las tarjetas pequeñas truncan el contexto y filtran la seguridad. Apunta alto: **≥2 Mac Studios al máximo o un equipo GPU equivalente (~$30k+)**. Una sola GPU de **24 GB** solo funciona para prompts más ligeros con mayor latencia. Usa la **variante del modelo más grande / de tamaño completo que puedas ejecutar**; los puntos de control agresivamente cuantificados o “pequeños” aumentan el riesgo de inyección de prompts (consulte [Seguridad](/es/gateway/security)).

Si quieres la configuración local con menos fricción, empieza con [Ollama](/es/providers/ollama) y `openclaw onboard`. Esta página es la guía con opiniones para stacks locales de alta gama y servidores locales personalizados compatibles con OpenAI.

## Recomendado: LM Studio + MiniMax M2.5 (Responses API, tamaño completo)

El mejor stack local actual. Carga MiniMax M2.5 en LM Studio, habilita el servidor local (predeterminado `http://127.0.0.1:1234`) y usa Responses API para mantener el razonamiento separado del texto final.

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

- Instala LM Studio: [https://lmstudio.ai](https://lmstudio.ai)
- En LM Studio, descarga la **compilación más grande de MiniMax M2.5 disponible** (evita las variantes “pequeñas”/muy cuantificadas), inicia el servidor, confirma que `http://127.0.0.1:1234/v1/models` la liste.
- Mantén el modelo cargado; la carga en frío añade latencia de inicio.
- Ajusta `contextWindow`/`maxTokens` si tu compilación de LM Studio difiere.
- Para WhatsApp, mantente en Responses API para que solo se envíe el texto final.

Mantén los modelos alojados configurados incluso cuando ejecutes localmente; usa `models.mode: "merge"` para que los respaldos sigan disponibles.

### Configuración híbrida: alojado principal, respaldo local

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-5",
        fallbacks: ["lmstudio/minimax-m2.5-gs32", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
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

### Prioridad local con red de seguridad alojada

Intercambia el orden principal y de respaldo; mantén el mismo bloque de proveedores y `models.mode: "merge"` para que puedas recurrir a Sonnet u Opus cuando la caja local esté caída.

### Alojamiento regional / enrutamiento de datos

- También existen variantes alojadas de MiniMax/Kimi/GLM en OpenRouter con endpoints anclados por región (p. ej., alojados en EE. UU.). Elija la variante regional allí para mantener el tráfico en su jurisdicción elegida mientras sigue usando `models.mode: "merge"` para recursos de Anthropic/OpenAI.
- Solo local sigue siendo la ruta de privacidad más sólida; el enrutamiento regional alojado es el término medio cuando necesita funciones del proveedor pero desea control sobre el flujo de datos.

## Otros servidores proxy locales compatibles con OpenAI

vLLM, LiteLLM, OAI-proxy o gateways personalizados funcionan si exponen un endpoint `/v1` de estilo OpenAI. Reemplace el bloque de proveedor anterior con su endpoint e ID de modelo:

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

Mantenga `models.mode: "merge"` para que los modelos alojados sigan disponibles como recursos.

## Solución de problemas

- ¿Puede el Gateway alcanzar el proxy? `curl http://127.0.0.1:1234/v1/models`.
- ¿Modelo de LM Studio descargado? Recárguelo; el inicio en frío es una causa común de "bloqueo".
- ¿Errores de contexto? Disminuya `contextWindow` o aumente el límite de su servidor.
- Seguridad: los modelos locales omiten los filtros del lado del proveedor; mantenga los agentes limitados y la compactación activada para limitar el radio de explosión de la inyección de prompts.

import en from "/components/footer/en.mdx";

<en />
