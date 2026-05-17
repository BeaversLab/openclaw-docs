---
summary: "Iniciar servidores de modelos locales a pedido antes de las solicitudes de modelos de OpenClaw"
read_when:
  - You want OpenClaw to start a local model server only when its model is selected
  - You run ds4, inferrs, vLLM, llama.cpp, MLX, or another OpenAI-compatible local server
  - You need to control cold start, readiness, and idle shutdown for local providers
title: "Servicios de modelos locales"
---

`models.providers.<id>.localService` permite que OpenClaw inicie un servidor de modelos
local propiedad del proveedor a pedido. Es una configuración a nivel de proveedor: cuando el modelo seleccionado
pertenece a ese proveedor, OpenClaw sondea el servicio, inicia el proceso si el
punto final está caído, espera a que esté listo y luego envía la solicitud del modelo.

Úselo para servidores locales que son costosos de mantener en ejecución todo el día, o para
configuraciones manuales donde la selección del modelo debería ser suficiente para iniciar el backend.

## Cómo funciona

1. Una solicitud de modelo se resuelve en un proveedor configurado.
2. Si ese proveedor tiene `localService`, OpenClaw sondea `healthUrl`.
3. Si el sondeo tiene éxito, OpenClaw usa el servidor existente.
4. Si el sondeo falla, OpenClaw inicia `command` con `args`.
5. OpenClaw sondea la preparación hasta que `readyTimeoutMs` expire.
6. La solicitud del modelo se envía a través del transporte normal del proveedor.
7. Si OpenClaw inició el proceso y `idleStopMs` es positivo, el proceso se
   detiene después de que la última solicitud en vuelo haya estado inactiva durante ese tiempo.

OpenClaw no instala launchd, systemd, Docker ni un demonio para esto. El
servidor es un proceso secundario del proceso OpenClaw que primero lo necesitó.

## Forma de la configuración

```json5
{
  models: {
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "local-model",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/absolute/path/to/server",
          args: ["--host", "127.0.0.1", "--port", "8000"],
          cwd: "/absolute/path/to/working-dir",
          env: { LOCAL_MODEL_CACHE: "/absolute/path/to/cache" },
          healthUrl: "http://127.0.0.1:8000/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "my-local-model",
            name: "My Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Campos

- `command`: ruta absoluta al ejecutable. No se usa la búsqueda de shell.
- `args`: argumentos del proceso. No se aplica expansión de shell, tuberías, globalización ni reglas
  de comillas.
- `cwd`: directorio de trabajo opcional para el proceso.
- `env`: variables de entorno opcionales combinadas sobre el entorno del proceso
  OpenClaw.
- `healthUrl`: URL de preparación. Si se omite, OpenClaw añade `/models` a
  `baseUrl`, por lo que `http://127.0.0.1:8000/v1` se convierte en
  `http://127.0.0.1:8000/v1/models`.
- `readyTimeoutMs`: fecha límite de preparación de inicio. Predeterminado: `120000`.
- `idleStopMs`: retraso de apagado por inactividad para los procesos iniciados por OpenClaw. `0` o
  omitido mantiene el proceso vivo hasta que OpenClaw se cierre.

## Ejemplo de Inferrs

Inferrs es un backend `/v1` compatible con OpenAI personalizado, por lo que la misma API de
servicio local funciona con la entrada del proveedor `inferrs`.

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/google/gemma-4-E2B-it" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/opt/homebrew/bin/inferrs",
          args: ["serve", "google/gemma-4-E2B-it", "--host", "127.0.0.1", "--port", "8080", "--device", "metal"],
          healthUrl: "http://127.0.0.1:8080/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "google/gemma-4-E2B-it",
            name: "Gemma 4 E2B (inferrs)",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 4096,
            compat: {
              requiresStringContent: true,
            },
          },
        ],
      },
    },
  },
}
```

Reemplace `command` con el resultado de `which inferrs` en la máquina donde se ejecuta
OpenClaw.

## Ejemplo de ds4

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
          command: "/Users/you/Projects/oss/ds4/ds4-server",
          args: ["--model", "/Users/you/Projects/oss/ds4/ds4flash.gguf", "--host", "127.0.0.1", "--port", "18000", "--ctx", "393216"],
          cwd: "/Users/you/Projects/oss/ds4",
          healthUrl: "http://127.0.0.1:18000/v1/models",
          readyTimeoutMs: 300000,
          idleStopMs: 0,
        },
        models: [],
      },
    },
  },
}
```

## Notas operacionales

- Un proceso de OpenClaw gestiona el hijo que inició. Otro proceso de OpenClaw
  que ve la misma URL de salud ya activa la reutilizará sin adoptarla.
- El inicio se serializa por comando y conjunto de argumentos del proveedor, por lo que las
  solicitudes concurrentes no generan servidores duplicados para la misma configuración.
- Las respuestas de transmisión activas mantienen una concesión; el apagado por inactividad espera hasta que el
  manejo del cuerpo de la respuesta se complete.
- Use `timeoutSeconds` en proveedores locales lentos para que los inicios en frío y las generaciones
  largas no alcancen el tiempo de espera de solicitud de modelo predeterminado.
- Use un `healthUrl` explícito si su servidor expone la disponibilidad en algún lugar distinto
  de `/v1/models`.

## Relacionado

<CardGroup cols={2}>
  <Card title="Modelos locales" href="/es/gateway/local-models" icon="servidor">
    Configuración de modelos locales, opciones de proveedor y guía de seguridad.
  </Card>
  <Card title="Inferrs" href="/es/providers/inferrs" icon="cpu">
    Ejecute OpenClaw a través del servidor local compatible con OpenAI de inferrs.
  </Card>
</CardGroup>
