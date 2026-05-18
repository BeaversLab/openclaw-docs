---
summary: "Ejecutar OpenClaw a través de ds4, un servidor local compatible con OpenAI para DeepSeek V4 Flash"
read_when:
  - You want to run OpenClaw against antirez/ds4
  - You want a local DeepSeek V4 Flash backend with tool calls
  - You need the OpenClaw config for ds4-server
title: "ds4"
---

[ds4](https://github.com/antirez/ds4) sirve DeepSeek V4 Flash desde un backend
local de Metal con una API compatible con OpenAI `/v1`. OpenClaw se conecta a ds4
a través de la familia de proveedores genérica `openai-completions`.

ds4 no es un complemento de proveedor OpenClaw incluido. Configúrelo en
`models.providers.ds4`, luego seleccione `ds4/deepseek-v4-flash`.

- ID del proveedor: `ds4`
- Complemento: ninguno
- API: Completaciones de Chat compatibles con OpenAI (`openai-completions`)
- URL base sugerida: `http://127.0.0.1:18000/v1`
- ID del modelo: `deepseek-v4-flash`
- Llamadas a herramientas: admitidas mediante estilo OpenAI `tools` y `tool_calls`
- Razonamiento: estilo DeepSeek `thinking` y `reasoning_effort`

## Requisitos

- macOS con soporte Metal.
- Una copia de trabajo de ds4 con `ds4-server` y el archivo GGUF de DeepSeek V4 Flash.
- Suficiente memoria para el contexto que elija. Los valores `--ctx` más grandes asignan más
  memoria KV cuando se inicia el servidor.

<Warning>
  Los turnos del agente OpenClaw incluyen esquemas de herramientas y contexto del espacio de trabajo. Un contexto diminuto tal como `--ctx 4096` puede pasar pruebas directas de curl pero fallar ejecuciones completas de agente con `500 prompt exceeds context`. Use al menos `--ctx 32768` para pruebas de humo de agente y herramienta. Use `--ctx 393216` solo cuando tenga suficiente memoria y desee el
  comportamiento ds4 Think Max.
</Warning>

## Inicio rápido

<Steps>
  <Step title="Iniciar ds4-server">
    Reemplace `<DS4_DIR>` con la ruta de su copia de ds4.

    ```bash
    <DS4_DIR>/ds4-server \
      --model <DS4_DIR>/ds4flash.gguf \
      --host 127.0.0.1 \
      --port 18000 \
      --ctx 32768 \
      --tokens 128
    ```

  </Step>
  <Step title="Verificar el punto final compatible con OpenAI">
    ```bash
    curl http://127.0.0.1:18000/v1/models
    ```

    La respuesta debe incluir `deepseek-v4-flash`.

  </Step>
  <Step title="Añade la configuración del proveedor OpenClaw">
    Añade la configuración de [Configuración completa](#full-config) y luego ejecuta una verificación
    del modelo de un solo disparo:

    ```bash
    openclaw infer model run \
      --local \
      --model ds4/deepseek-v4-flash \
      --thinking off \
      --prompt "Reply with exactly: openclaw-ds4-ok" \
      --json
    ```

  </Step>
</Steps>

## Configuración completa

Usa esta configuración cuando ds4 ya se esté ejecutando en `127.0.0.1:18000`.

```json5
{
  agents: {
    defaults: {
      model: { primary: "ds4/deepseek-v4-flash" },
      models: {
        "ds4/deepseek-v4-flash": {
          alias: "DS4 local",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      ds4: {
        baseUrl: "http://127.0.0.1:18000/v1",
        apiKey: "ds4-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "deepseek-v4-flash",
            name: "DeepSeek V4 Flash (ds4)",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32768,
            maxTokens: 128,
            compat: {
              supportsUsageInStreaming: true,
              supportsReasoningEffort: true,
              maxTokensField: "max_tokens",
              supportsStrictMode: false,
              thinkingFormat: "deepseek",
              supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
            },
          },
        ],
      },
    },
  },
}
```

Mantén `contextWindow` alineado con el valor de `ds4-server --ctx`. Mantén `maxTokens`
alineado con `--tokens` a menos que intencionalmente quieras que OpenClaw solicite menos
salida que la predeterminada del servidor.

## Inicio bajo demanda

OpenClaw puede iniciar ds4 solo cuando se selecciona un modelo `ds4/...`. Añade
`localService` a la misma entrada de proveedor:

```json5
{
  models: {
    providers: {
      ds4: {
        baseUrl: "http://127.0.0.1:18000/v1",
        apiKey: "ds4-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "<DS4_DIR>/ds4-server",
          args: ["--model", "<DS4_DIR>/ds4flash.gguf", "--host", "127.0.0.1", "--port", "18000", "--ctx", "32768", "--tokens", "128"],
          cwd: "<DS4_DIR>",
          healthUrl: "http://127.0.0.1:18000/v1/models",
          readyTimeoutMs: 300000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "deepseek-v4-flash",
            name: "DeepSeek V4 Flash (ds4)",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32768,
            maxTokens: 128,
            compat: {
              supportsUsageInStreaming: true,
              supportsReasoningEffort: true,
              maxTokensField: "max_tokens",
              supportsStrictMode: false,
              thinkingFormat: "deepseek",
              supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
            },
          },
        ],
      },
    },
  },
}
```

`command` debe ser una ruta absoluta al ejecutable. No se utiliza la búsqueda en el shell ni la expansión de `~`.
Consulta [Servicios de modelos locales](/es/gateway/local-model-services) para cada campo
de `localService`.

## Think Max

ds4 aplica Think Max solo cuando se cumplen ambas condiciones:

- `ds4-server` comienza con `--ctx 393216` o superior.
- La solicitud utiliza `reasoning_effort: "max"` o el campo de esfuerzo equivalente de ds4.

Si ejecutas ese contexto grande, actualiza tanto los indicadores del servidor como los metadatos
del modelo de OpenClaw:

```json5
{
  contextWindow: 393216,
  maxTokens: 384000,
  compat: {
    supportsUsageInStreaming: true,
    supportsReasoningEffort: true,
    maxTokensField: "max_tokens",
    supportsStrictMode: false,
    thinkingFormat: "deepseek",
    supportedReasoningEfforts: ["low", "medium", "high", "xhigh", "max"],
  },
}
```

## Probar

Comienza con una verificación HTTP directa:

```bash
curl http://127.0.0.1:18000/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"Reply with exactly: ds4-ok"}],"max_tokens":16,"stream":false,"thinking":{"type":"disabled"}}'
```

Luego prueba el enrutamiento del modelo OpenClaw:

```bash
openclaw infer model run \
  --local \
  --model ds4/deepseek-v4-flash \
  --thinking off \
  --prompt "Reply with exactly: openclaw-ds4-ok" \
  --json
```

Para una prueba completa de agente y llamada a herramientas, usa un contexto de al menos 32768:

```bash
openclaw agent \
  --local \
  --session-id ds4-tool-smoke \
  --model ds4/deepseek-v4-flash \
  --thinking off \
  --message "Use the shell command pwd once, then reply exactly: tool-ok <output>" \
  --json \
  --timeout 240
```

Resultado esperado:

- `executionTrace.winnerProvider` es `ds4`
- `executionTrace.winnerModel` es `deepseek-v4-flash`
- `toolSummary.calls` es al menos `1`
- `finalAssistantVisibleText` comienza con `tool-ok`

## Solución de problemas

<AccordionGroup>
  <Accordion title="curl /v1/models no puede conectar">
    ds4 no se está ejecutando o no está vinculado al host y puerto en `baseUrl`. Inicia
    `ds4-server` y luego reintenta:

    ```bash
    curl http://127.0.0.1:18000/v1/models
    ```

  </Accordion>

<Accordion title="500 prompt excede el contexto">El `--ctx` configurado es demasiado pequeño para el turno de OpenClaw. Aumente `ds4-server --ctx` y luego actualice `models.providers.ds4.models[].contextWindow` para que coincida. Los turnos completos del agente con herramientas necesitan sustancialmente más contexto que una solicitud curl directa de un solo mensaje.</Accordion>

<Accordion title="Think Max no se activa">ds4 solo usa Think Max cuando `--ctx` es al menos `393216` y la solicitud pide `reasoning_effort: "max"`. Los contextos más pequeños recurren a un razonamiento alto.</Accordion>

  <Accordion title="La primera solicitud es lenta">
    ds4 tiene una residencia en Metal fría y una fase de calentamiento del modelo. Use
    `localService.readyTimeoutMs: 300000` cuando OpenClaw inicie el servidor bajo
    demanda.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Servicios de modelos locales" href="/es/gateway/local-model-services" icon="play">
    Inicie servidores de modelos locales bajo demanda antes de las solicitudes del modelo.
  </Card>
  <Card title="Modelos locales" href="/es/gateway/local-models" icon="server">
    Elija y opere backends de modelos locales.
  </Card>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Configure refs de proveedores, autenticación y conmutación por error.
  </Card>
  <Card title="DeepSeek" href="/es/providers/deepseek" icon="brain">
    Comportamiento nativo del proveedor DeepSeek y controles de pensamiento.
  </Card>
</CardGroup>
