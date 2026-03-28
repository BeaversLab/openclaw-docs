---
title: "Volcengine (Doubao)"
summary: "Configuración de Volcano Engine (modelos Doubao, endpoints generales y de codificación)"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
---

# Volcengine (Doubao)

El proveedor Volcengine da acceso a los modelos Doubao y a modelos de terceros
hospedados en Volcano Engine, con endpoints separados para cargas de trabajo
generales y de codificación.

- Proveedores: `volcengine` (general) + `volcengine-plan` (codificación)
- Auth: `VOLCANO_ENGINE_API_KEY`
- API: Compatible con OpenAI

## Inicio rápido

1. Establezca la clave API:

```bash
openclaw onboard --auth-choice volcengine-api-key
```

2. Establezca un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "volcengine-plan/ark-code-latest" },
    },
  },
}
```

## Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

## Proveedores y endpoints

| Proveedor         | Endpoint                                  | Caso de uso             |
| ----------------- | ----------------------------------------- | ----------------------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | Modelos generales       |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | Modelos de codificación |

Ambos proveedores se configuran con una sola clave API. La configuración registra
ambos automáticamente.

## Modelos disponibles

- **doubao-seed-1-8** - Doubao Seed 1.8 (general, predeterminado)
- **doubao-seed-code-preview** - Modelo de codificación Doubao
- **ark-code-latest** - Predeterminado del plan de codificación
- **Kimi K2.5** - Moonshot AI a través de Volcano Engine
- **GLM-4.7** - GLM a través de Volcano Engine
- **DeepSeek V3.2** - DeepSeek a través de Volcano Engine

La mayoría de los modelos admiten entrada de texto + imagen. Las ventanas de contexto
varían desde 128K hasta 256K tokens.

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que
`VOLCANO_ENGINE_API_KEY` esté disponible para ese proceso (por ejemplo, en
`~/.openclaw/.env` o a través de `env.shellEnv`).
