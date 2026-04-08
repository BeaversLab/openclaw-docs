---
summary: "Use Qianfan's unified API to access many models in OpenClaw"
read_when:
  - You want a single API key for many LLMs
  - You need Baidu Qianfan setup guidance
title: "Qianfan"
---

# Guía del proveedor Qianfan

Qianfan es la plataforma MaaS de Baidu, que proporciona una **API unificada** que enruta las solicitudes a muchos modelos detrás de un único punto de conexión y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan cambiando la URL base.

## Requisitos previos

1. Una cuenta de Baidu Cloud con acceso a la API de Qianfan
2. Una clave de API desde la consola de Qianfan
3. OpenClaw instalado en su sistema

## Obtener su clave de API

1. Visite la [Consola de Qianfan](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. Cree una nueva aplicación o seleccione una existente
3. Genere una clave API (formato: `bce-v3/ALTAK-...`)
4. Copie la clave de API para usarla con OpenClaw

## Configuración de CLI

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## Fragmento de configuración

```json5
{
  env: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." },
  agents: {
    defaults: {
      model: { primary: "qianfan/deepseek-v3.2" },
      models: {
        "qianfan/deepseek-v3.2": { alias: "QIANFAN" },
      },
    },
  },
  models: {
    providers: {
      qianfan: {
        baseUrl: "https://qianfan.baidubce.com/v2",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-v3.2",
            name: "DEEPSEEK V3.2",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 98304,
            maxTokens: 32768,
          },
          {
            id: "ernie-5.0-thinking-preview",
            name: "ERNIE-5.0-Thinking-Preview",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 119000,
            maxTokens: 64000,
          },
        ],
      },
    },
  },
}
```

## Notas

- Referencia de modelo incluido por defecto: `qianfan/deepseek-v3.2`
- URL base predeterminada: `https://qianfan.baidubce.com/v2`
- El catálogo incluido actualmente contiene `deepseek-v3.2` y `ernie-5.0-thinking-preview`
- Agregue o anule `models.providers.qianfan` solo cuando necesite una URL base personalizada o metadatos del modelo
- Qianfan se ejecuta a través de la ruta de transporte compatible con OpenAI, no mediante la configuración de solicitudes nativa de OpenAI

## Documentación relacionada

- [Configuración de OpenClaw](/en/gateway/configuration)
- [Proveedores de modelos](/en/concepts/model-providers)
- [Configuración del agente](/en/concepts/agent)
- [Documentación de la API de Qianfan](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)
