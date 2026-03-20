---
summary: "Ejecutar OpenClaw con vLLM (servidor local compatible con OpenAI)"
read_when:
  - Quieres ejecutar OpenClaw contra un servidor vLLM local
  - Quieres endpoints /v1 compatibles con OpenAI con tus propios modelos
title: "vLLM"
---

# vLLM

vLLM puede servir modelos de código abierto (y algunos personalizados) a través de una API HTTP **compatible con OpenAI**. OpenClaw puede conectarse a vLLM utilizando la API `openai-completions`.

OpenClaw también puede **descubrir automáticamente** los modelos disponibles en vLLM cuando te suscribes con `VLLM_API_KEY` (cualquier valor funciona si tu servidor no aplica autenticación) y no defines una entrada `models.providers.vllm` explícita.

## Inicio rápido

1. Inicie vLLM con un servidor compatible con OpenAI.

Su URL base debe exponer endpoints `/v1` (por ejemplo, `/v1/models`, `/v1/chat/completions`). vLLM comúnmente se ejecuta en:

- `http://127.0.0.1:8000/v1`

2. Suscribirse (cualquier valor funciona si no hay autenticación configurada):

```bash
export VLLM_API_KEY="vllm-local"
```

3. Seleccione un modelo (reemplazar con uno de sus IDs de modelos vLLM):

```json5
{
  agents: {
    defaults: {
      model: { primary: "vllm/your-model-id" },
    },
  },
}
```

## Descubrimiento de modelos (proveedor implícito)

Cuando `VLLM_API_KEY` está configurado (o existe un perfil de autenticación) y **no** defines `models.providers.vllm`, OpenClaw consultará:

- `GET http://127.0.0.1:8000/v1/models`

...y convertirá los IDs devueltos en entradas de modelos.

Si configuras `models.providers.vllm` explícitamente, el descubrimiento automático se omite y debes definir los modelos manualmente.

## Configuración explícita (modelos manuales)

Use configuración explícita cuando:

- vLLM se ejecuta en un host/puerto diferente.
- Quieres fijar los valores `contextWindow`/`maxTokens`.
- Su servidor requiere una clave de API real (o quieres controlar los encabezados).

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
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
curl http://127.0.0.1:8000/v1/models
```

- Si las solicitudes fallan con errores de autenticación, configure una `VLLM_API_KEY` real que coincida con la configuración de su servidor, o configure el proveedor explícitamente bajo `models.providers.vllm`.

import es from "/components/footer/es.mdx";

<es />
