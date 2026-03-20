---
summary: "Ejecutar OpenClaw con SGLang (servidor autohospedado compatible con OpenAI)"
read_when:
  - Deseas ejecutar OpenClaw contra un servidor SGLang local
  - Deseas endpoints /v1 compatibles con OpenAI con tus propios modelos
title: "SGLang"
---

# SGLang

SGLang puede servir modelos de código abierto a través de una API HTTP **compatible con OpenAI**.
OpenClaw puede conectarse a SGLang utilizando la API `openai-completions`.

OpenClaw también puede **detectar automáticamente** los modelos disponibles en SGLang cuando optas
por participar con `SGLANG_API_KEY` (cualquier valor funciona si tu servidor no exige autenticación)
y no defines una entrada explícita de `models.providers.sglang`.

## Inicio rápido

1. Inicie SGLang con un servidor compatible con OpenAI.

Su URL base debe exponer endpoints `/v1` (por ejemplo `/v1/models`,
`/v1/chat/completions`). SGLang comúnmente se ejecuta en:

- `http://127.0.0.1:30000/v1`

2. Optar por participar (cualquier valor funciona si no hay autenticación configurada):

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

Cuando se establece `SGLANG_API_KEY` (o existe un perfil de autenticación) y **no**
define `models.providers.sglang`, OpenClaw consultará:

- `GET http://127.0.0.1:30000/v1/models`

y convertirá los IDs devueltos en entradas de modelos.

Si establece `models.providers.sglang` explícitamente, se omite el descubrimiento automático y
debe definir modelos manualmente.

## Configuración explícita (modelos manuales)

Use configuración explícita cuando:

- SGLang se ejecuta en un host/puerto diferente.
- Desea fijar los valores de `contextWindow`/`maxTokens`.
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

- Verifique que el servidor sea accesible:

```bash
curl http://127.0.0.1:30000/v1/models
```

- Si las solicitudes fallan con errores de autenticación, establezca una `SGLANG_API_KEY` real que coincida
  con la configuración de su servidor, o configure el proveedor explícitamente bajo
  `models.providers.sglang`.

import en from "/components/footer/en.mdx";

<en />
