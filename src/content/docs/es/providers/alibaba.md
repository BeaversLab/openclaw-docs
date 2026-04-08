---
title: "Alibaba Model Studio"
summary: "Generación de video Wan de Alibaba Model Studio en OpenClaw"
read_when:
  - You want to use Alibaba Wan video generation in OpenClaw
  - You need Model Studio or DashScope API key setup for video generation
---

# Alibaba Model Studio

OpenClaw incluye un proveedor de `alibaba` generación de video para modelos Wan en
Alibaba Model Studio / DashScope.

- Proveedor: `alibaba`
- Autenticación preferida: `MODELSTUDIO_API_KEY`
- También aceptado: `DASHSCOPE_API_KEY`, `QWEN_API_KEY`
- API: Generación de video asíncrona de DashScope / Model Studio

## Inicio rápido

1. Establezca una clave de API:

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

2. Establezca un modelo de video predeterminado:

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "alibaba/wan2.6-t2v",
      },
    },
  },
}
```

## Modelos Wan integrados

El proveedor `alibaba` incluido actualmente registra:

- `alibaba/wan2.6-t2v`
- `alibaba/wan2.6-i2v`
- `alibaba/wan2.6-r2v`
- `alibaba/wan2.6-r2v-flash`
- `alibaba/wan2.7-r2v`

## Límites actuales

- Hasta **1** video de salida por solicitud
- Hasta **1** imagen de entrada
- Hasta **4** videos de entrada
- Hasta **10 segundos** de duración
- Soporta `size`, `aspectRatio`, `resolution`, `audio` y `watermark`
- El modo de imagen/video de referencia actualmente requiere **URLs http(s) remotas**

## Relación con Qwen

El proveedor `qwen` incluido también utiliza los endpoints de DashScope alojados por Alibaba para
la generación de video Wan. Use:

- `qwen/...` cuando desea la superficie del proveedor Qwen canónico
- `alibaba/...` cuando desea la superficie de video Wan propiedad directa del proveedor

## Relacionado

- [Generación de Video](/en/tools/video-generation)
- [Qwen](/en/providers/qwen)
- [Referencia de Configuración](/en/gateway/configuration-reference#agent-defaults)
