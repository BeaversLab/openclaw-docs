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

Proveedor general (`volcengine`):

| Ref. de modelo                               | Nombre                          | Entrada       | Contexto |
| -------------------------------------------- | ------------------------------- | ------------- | -------- |
| `volcengine/doubao-seed-1-8-251228`          | Doubao Seed 1.8                 | texto, imagen | 256.000  |
| `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | texto, imagen | 256.000  |
| `volcengine/kimi-k2-5-260127`                | Kimi K2.5                       | texto, imagen | 256.000  |
| `volcengine/glm-4-7-251222`                  | GLM 4.7                         | texto, imagen | 200.000  |
| `volcengine/deepseek-v3-2-251201`            | DeepSeek V3.2                   | texto, imagen | 128.000  |

Proveedor de codificación (`volcengine-plan`):

| Ref. de modelo                                    | Nombre                   | Entrada | Contexto |
| ------------------------------------------------- | ------------------------ | ------- | -------- |
| `volcengine-plan/ark-code-latest`                 | Ark Coding Plan          | texto   | 256.000  |
| `volcengine-plan/doubao-seed-code`                | Doubao Seed Code         | texto   | 256.000  |
| `volcengine-plan/glm-4.7`                         | GLM 4.7 Coding           | texto   | 200.000  |
| `volcengine-plan/kimi-k2-thinking`                | Kimi K2 Thinking         | texto   | 256.000  |
| `volcengine-plan/kimi-k2.5`                       | Kimi K2.5 Coding         | texto   | 256.000  |
| `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | texto   | 256.000  |

`openclaw onboard --auth-choice volcengine-api-key` actualmente establece
`volcengine-plan/ark-code-latest` como el modelo predeterminado y también registra
el catálogo general `volcengine`.

Durante la incorporación/configuración de la selección de modelos, la opción de autenticación de Volcengine prefiere
tanto las filas `volcengine/*` como `volcengine-plan/*`. Si esos modelos aún no
se han cargado, OpenClaw vuelve al catálogo sin filtrar en lugar de mostrar un
selector vacío con ámbito de proveedor.

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que
`VOLCANO_ENGINE_API_KEY` esté disponible para ese proceso (por ejemplo, en
`~/.openclaw/.env` o mediante `env.shellEnv`).
