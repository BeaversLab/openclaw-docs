---
summary: "Ejecutar OpenClaw con SGLang (servidor autohospedado compatible con OpenAI)"
read_when:
  - You want to run OpenClaw against a local SGLang server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "SGLang"
---

# SGLang

SGLang puede servir modelos de código abierto a través de una API HTTP **compatible con OpenAI**.
OpenClaw puede conectarse a SGLang utilizando la API `openai-completions`.

OpenClaw también puede **detectar automáticamente** los modelos disponibles de SGLang cuando activas
la opción con `SGLANG_API_KEY` (cualquier valor funciona si su servidor no impone autenticación)
y no define una entrada explícita `models.providers.sglang`.

## Inicio rápido

1. Inicie SGLang con un servidor compatible con OpenAI.

Su URL base debe exponer endpoints `/v1` (por ejemplo `/v1/models`,
`/v1/chat/completions`). SGLang comúnmente se ejecuta en:

- `http://127.0.0.1:30000/v1`

2. Actívelo (cualquier valor funciona si no hay autenticación configurada):

```bash
export SGLANG_API_KEY="sglang-local"
```

3. Ejecute la incorporación y elija `SGLang`, o configure un modelo directamente:

```bash
openclaw onboard
```

```json5
{
  agents: {
    defaults: {
      model: { primary: "sglang/your-model-id" },
    },
  },
}
```

## Descubrimiento de modelos (proveedor implícito)

Cuando `SGLANG_API_KEY` está configurado (o existe un perfil de autenticación) y usted **no**
define `models.providers.sglang`, OpenClaw consultará:

- `GET http://127.0.0.1:30000/v1/models`

y convertirá los IDs devueltos en entradas de modelos.

Si configura `models.providers.sglang` explícitamente, el autodescubrimiento se omite y
debe definir los modelos manualmente.

## Configuración explícita (modelos manuales)

Use configuración explícita cuando:

- SGLang se ejecuta en un host/puerto diferente.
- Desea fijar los valores `contextWindow`/`maxTokens`.
- Su servidor requiere una clave de API real (o desea controlar los encabezados).

```json5
{
  models: {
    providers: {
      sglang: {
        baseUrl: "http://127.0.0.1:30000/v1",
        apiKey: "${SGLANG_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local SGLang Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Solución de problemas

- Compruebe que el servidor sea accesible:

```bash
curl http://127.0.0.1:30000/v1/models
```

- Si las solicitudes fallan con errores de autenticación, configure una `SGLANG_API_KEY` real que coincida
  con la configuración de su servidor, o configure el proveedor explícitamente bajo
  `models.providers.sglang`.
