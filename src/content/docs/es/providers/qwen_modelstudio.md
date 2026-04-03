---
title: "Qwen / Model Studio"
summary: "Configuración de Alibaba Cloud Model Studio (Estándar de pago por uso y Plan de Codificación, endpoints de región dual)"
read_when:
  - You want to use Qwen (Alibaba Cloud Model Studio) with OpenClaw
  - You need the API key env var for Model Studio
  - You want to use the Standard (pay-as-you-go) or Coding Plan endpoint
---

# Qwen / Model Studio (Alibaba Cloud)

El proveedor Model Studio da acceso a los modelos de Alibaba Cloud, incluyendo Qwen
y modelos de terceros alojados en la plataforma. Se admiten dos planes de facturación:
**Estándar** (pago por uso) y **Plan de Codificación** (suscripción).

- Proveedor: `modelstudio`
- Autenticación: `MODELSTUDIO_API_KEY`
- API: Compatible con OpenAI

## Inicio rápido

### Estándar (pago por uso)

```bash
# China endpoint
openclaw onboard --auth-choice modelstudio-standard-api-key-cn

# Global/Intl endpoint
openclaw onboard --auth-choice modelstudio-standard-api-key
```

### Plan de Codificación (suscripción)

```bash
# China endpoint
openclaw onboard --auth-choice modelstudio-api-key-cn

# Global/Intl endpoint
openclaw onboard --auth-choice modelstudio-api-key
```

Después del registro, configure un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "modelstudio/qwen3.5-plus" },
    },
  },
}
```

## Tipos de plan y endpoints

| Plan                               | Región | Elección de autenticación         | Endpoint                                         |
| ---------------------------------- | ------ | --------------------------------- | ------------------------------------------------ |
| Estándar (pago por uso)            | China  | `modelstudio-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Estándar (pago por uso)            | Global | `modelstudio-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Plan de Codificación (suscripción) | China  | `modelstudio-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Plan de Codificación (suscripción) | Global | `modelstudio-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

El proveedor selecciona automáticamente el endpoint basándose en su elección de autenticación. Puede
sobrescribirlo con un `baseUrl` personalizado en la configuración.

## Obtenga su clave de API

- **China**: [bailian.console.aliyun.com](https://bailian.console.aliyun.com/)
- **Global/Intl**: [modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com/)

## Modelos disponibles

- **qwen3.5-plus** (predeterminado) — Qwen 3.5 Plus
- **qwen3-coder-plus**, **qwen3-coder-next** — modelos de programación Qwen
- **GLM-5** — modelos GLM a través de Alibaba
- **Kimi K2.5** — Moonshot AI a través de Alibaba
- **MiniMax-M2.7** — MiniMax a través de Alibaba

Algunos modelos (qwen3.5-plus, kimi-k2.5) admiten entrada de imagen. Las ventanas de contexto van desde 200K hasta 1M tokens.

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que
`MODELSTUDIO_API_KEY` esté disponible para ese proceso (por ejemplo, en
`~/.openclaw/.env` o a través de `env.shellEnv`).
