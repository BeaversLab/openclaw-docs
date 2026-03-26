---
title: "Model Studio"
summary: "Configuración de Model Studio de Alibaba Cloud (Coding Plan, puntos de conexión de doble región)"
read_when:
  - You want to use Alibaba Cloud Model Studio with OpenClaw
  - You need the API key env var for Model Studio
---

# Model Studio (Alibaba Cloud)

El proveedor Model Studio da acceso a los modelos Coding Plan de Alibaba Cloud,
incluyendo Qwen y modelos de terceros alojados en la plataforma.

- Proveedor: `modelstudio`
- Autenticación: `MODELSTUDIO_API_KEY`
- API: Compatible con OpenAI

## Inicio rápido

1. Configure la clave de API:

```bash
openclaw onboard --auth-choice modelstudio-api-key
```

2. Configure un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "modelstudio/qwen3.5-plus" },
    },
  },
}
```

## Puntos de conexión de región

Model Studio tiene dos puntos de conexión basados en la región:

| Región     | Punto de conexión                    |
| ---------- | ------------------------------------ |
| China (CN) | `coding.dashscope.aliyuncs.com`      |
| Global     | `coding-intl.dashscope.aliyuncs.com` |

El proveedor selecciona automáticamente según la elección de autenticación (`modelstudio-api-key` para
lo global, `modelstudio-api-key-cn` para China). Puede anular esto con un
`baseUrl` personalizado en la configuración.

## Modelos disponibles

- **qwen3.5-plus** (predeterminado) - Qwen 3.5 Plus
- **qwen3-max** - Qwen 3 Max
- **serie qwen3-coder** - modelos de codificación Qwen
- **GLM-5**, **GLM-4.7** - modelos GLM a través de Alibaba
- **Kimi K2.5** - Moonshot AI a través de Alibaba
- **MiniMax-M2.5** - MiniMax a través de Alibaba

La mayoría de los modelos admiten entrada de imágenes. Las ventanas de contexto oscilan entre 200K y 1M tokens.

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que
`MODELSTUDIO_API_KEY` esté disponible para ese proceso (por ejemplo, en
`~/.openclaw/.env` o a través de `env.shellEnv`).

import es from "/components/footer/es.mdx";

<es />
