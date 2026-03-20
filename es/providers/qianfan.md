---
summary: "Use la API unificada de Qianfan para acceder a muchos modelos en OpenClaw"
read_when:
  - Desea una sola clave de API para muchos LLM
  - Necesita orientación sobre la configuración de Baidu Qianfan
title: "Qianfan"
---

# Guía del proveedor Qianfan

Qianfan es la plataforma MaaS de Baidu, proporciona una **API unificada** que enruta las solicitudes a muchos modelos detrás de un solo punto de conexión (endpoint) y clave de API. Es compatible con OpenAI, por lo que la mayoría de los SDK de OpenAI funcionan cambiando la URL base.

## Requisitos previos

1. Una cuenta de Baidu Cloud con acceso a la API de Qianfan
2. Una clave de API de la consola de Qianfan
3. OpenClaw instalado en su sistema

## Obtener su clave de API

1. Visite la [Consola de Qianfan](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. Cree una nueva aplicación o seleccione una existente
3. Genere una clave de API (formato: `bce-v3/ALTAK-...`)
4. Copie la clave de API para usarla con OpenClaw

## Configuración de CLI

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## Documentación relacionada

- [Configuración de OpenClaw](/es/gateway/configuration)
- [Proveedores de modelos](/es/concepts/model-providers)
- [Configuración del agente](/es/concepts/agent)
- [Documentación de la API de Qianfan](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)

import es from "/components/footer/es.mdx";

<es />
