---
summary: "Ejecutar OpenClaw con vLLM (servidor local compatible con OpenAI)"
read_when:
  - You want to run OpenClaw against a local vLLM server
  - You want OpenAI-compatible /v1 endpoints with your own models
title: "vLLM"
---

# vLLM

vLLM puede servir modelos de código abierto (y algunos personalizados) a través de una API HTTP **compatible con OpenAI**. OpenClaw puede conectarse a vLLM utilizando la API `openai-completions`.

OpenClaw también puede **detectar automáticamente** los modelos disponibles en vLLM cuando se habilita con `VLLM_API_KEY` (cualquier valor funciona si su servidor no exige autenticación) y no define una entrada `models.providers.vllm` explícita.

## Inicio rápido

1. Inicie vLLM con un servidor compatible con OpenAI.

Su URL base debe exponer endpoints `/v1` (por ejemplo, `/v1/models`, `/v1/chat/completions`). vLLM se ejecuta comúnmente en:

- `http://127.0.0.1:8000/v1`

2. Optar por participar (cualquier valor funciona si no se ha configurado autenticación):

```bash
export VLLM_API_KEY="vllm-local"
```

3. Seleccione un modelo (reemplácelo con uno de sus IDs de modelos vLLM):

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

Cuando se establece `VLLM_API_KEY` (o existe un perfil de autenticación) y **no** define `models.providers.vllm`, OpenClaw consultará:

- `GET http://127.0.0.1:8000/v1/models`

...y convertirá los IDs devueltos en entradas de modelo.

Si establece `models.providers.vllm` explícitamente, se omitirá el descubrimiento automático y deberá definir los modelos manualmente.

## Configuración explícita (modelos manuales)

Use configuración explícita cuando:

- vLLM se ejecuta en un host/puerto diferente.
- Desea fijar los valores de `contextWindow`/`maxTokens`.
- Su servidor requiere una clave de API real (o desea controlar los encabezados).

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

- Compruebe que el servidor es accesible:

```bash
curl http://127.0.0.1:8000/v1/models
```

- Si las solicitudes fallan con errores de autenticación, establezca una `VLLM_API_KEY` real que coincida con la configuración de su servidor, o configure el proveedor explícitamente bajo `models.providers.vllm`.

## Comportamiento de tipo proxy

vLLM se trata como un backend `/v1` compatible con OpenAI de tipo proxy, no como un punto de conexión nativo de OpenAI.

- el moldeado de solicitudes nativo solo para OpenAI no se aplica aquí
- sin `service_tier`, sin Responses `store`, sin sugerencias de caché de prompts y sin moldeado de payload de compatibilidad de razonamiento de OpenAI
- los encabezados de atribución ocultos de OpenClaw (`originator`, `version`, `User-Agent`)
  no se inyectan en las URL base personalizadas de vLLM
