---
title: "Google (Gemini)"
summary: "Configuración de Google Gemini (clave de API + OAuth, generación de imágenes, comprensión de medios, búsqueda web)"
read_when:
  - You want to use Google Gemini models with OpenClaw
  - You need the API key or OAuth auth flow
---

# Google (Gemini)

El complemento de Google proporciona acceso a los modelos Gemini a través de Google AI Studio, además de generación de imágenes, comprensión de medios (imagen/audio/video) y búsqueda web mediante Gemini Grounding.

- Proveedor: `google`
- Autenticación: `GEMINI_API_KEY` o `GOOGLE_API_KEY`
- API: API de Google Gemini
- Proveedor alternativo: `google-gemini-cli` (OAuth)

## Inicio rápido

1. Establezca la clave de API:

```bash
openclaw onboard --auth-choice google-api-key
```

2. Establezca un modelo predeterminado:

```json5
{
  agents: {
    defaults: {
      model: { primary: "google/gemini-3.1-pro-preview" },
    },
  },
}
```

## Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice google-api-key \
  --gemini-api-key "$GEMINI_API_KEY"
```

## OAuth (CLI de Gemini)

Un proveedor alternativo `google-gemini-cli` utiliza OAuth PKCE en lugar de una clave de API. Esta es una integración no oficial; algunos usuarios informan restricciones en la cuenta. Úselo bajo su propia responsabilidad.

Variables de entorno:

- `OPENCLAW_GEMINI_OAUTH_CLIENT_ID`
- `OPENCLAW_GEMINI_OAUTH_CLIENT_SECRET`

(O las variantes `GEMINI_CLI_*`.)

## Capacidades

| Capacidad                | Soportado        |
| ------------------------ | ---------------- |
| Completados de chat      | Sí               |
| Generación de imágenes   | Sí               |
| Comprensión de imágenes  | Sí               |
| Transcripción de audio   | Sí               |
| Comprensión de video     | Sí               |
| Búsqueda web (Grounding) | Sí               |
| Pensamiento/Razonamiento | Sí (Gemini 3.1+) |

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `GEMINI_API_KEY` esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de `env.shellEnv`).

import es from "/components/footer/es.mdx";

<es />
