---
title: "Arcee AI"
summary: "Configuración de Arcee AI (autenticación + selección de modelo)"
read_when:
  - You want to use Arcee AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Arcee AI

[Arcee AI](https://arcee.ai) proporciona acceso a la familia de modelos de mezcla de expertos Trinity a través de una API compatible con OpenAI. Todos los modelos Trinity tienen licencia Apache 2.0.

Los modelos de Arcee AI se puede acceder directamente a través de la plataforma Arcee o mediante [OpenRouter](/en/providers/openrouter).

- Proveedor: `arcee`
- Autenticación: `ARCEEAI_API_KEY` (directo) o `OPENROUTER_API_KEY` (vía OpenRouter)
- API: Compatible con OpenAI
- URL base: `https://api.arcee.ai/api/v1` (directo) o `https://openrouter.ai/api/v1` (OpenRouter)

## Inicio rápido

1. Obtenga una clave de API de [Arcee AI](https://chat.arcee.ai/) o [OpenRouter](https://openrouter.ai/keys).

2. Establezca la clave de API (recomendado: guárdela para el Gateway):

```bash
# Direct (Arcee platform)
openclaw onboard --auth-choice arceeai-api-key

# Via OpenRouter
openclaw onboard --auth-choice arceeai-openrouter
```

3. Establezca un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "arcee/trinity-large-thinking" },
    },
  },
}
```

## Ejemplo no interactivo

```bash
# Direct (Arcee platform)
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice arceeai-api-key \
  --arceeai-api-key "$ARCEEAI_API_KEY"

# Via OpenRouter
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice arceeai-openrouter \
  --openrouter-api-key "$OPENROUTER_API_KEY"
```

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `ARCEEAI_API_KEY`
(o `OPENROUTER_API_KEY`) esté disponible para ese proceso (por ejemplo, en
`~/.openclaw/.env` o mediante `env.shellEnv`).

## Catálogo integrado

OpenClaw incluye actualmente este catálogo de Arcee:

| Ref. del modelo                | Nombre                 | Entrada | Contexto | Coste (entrada/salida por 1M) | Notas                                        |
| ------------------------------ | ---------------------- | ------- | -------- | ----------------------------- | -------------------------------------------- |
| `arcee/trinity-large-thinking` | Trinity Large Thinking | texto   | 256K     | $0.25 / $0.90                 | Modelo predeterminado; razonamiento activado |
| `arcee/trinity-large-preview`  | Trinity Large Preview  | texto   | 128K     | $0.25 / $1.00                 | De uso general; 400B parámetros, 13B activos |
| `arcee/trinity-mini`           | Trinity Mini 26B       | texto   | 128K     | $0.045 / $0.15                | Rápido y rentable; llamadas a funciones      |

Las mismas referencias de modelo funcionan tanto para configuraciones directas como de OpenRouter (por ejemplo, `arcee/trinity-large-thinking`).

El preajuste de incorporación establece `arcee/trinity-large-thinking` como modelo predeterminado.

## Características compatibles

- Transmisión (Streaming)
- Uso de herramientas / llamadas a funciones
- Salida estructurada (modo JSON y esquema JSON)
- Pensamiento extendido (Trinity Large Thinking)
