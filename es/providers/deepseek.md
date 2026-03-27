---
summary: "Configuración de DeepSeek (auth + selección de modelo)"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) proporciona modelos de IA potentes con una API compatible con OpenAI.

- Proveedor: `deepseek`
- Autenticación: `DEEPSEEK_API_KEY`
- API: Compatible con OpenAI

## Inicio rápido

Establezca la clave API (recomendado: guárdela para el Gateway):

```bash
openclaw onboard --auth-choice deepseek-api-key
```

Esto le pedirá su clave API y establecerá `deepseek/deepseek-chat` como el modelo predeterminado.

## Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice deepseek-api-key \
  --deepseek-api-key "$DEEPSEEK_API_KEY" \
  --skip-health \
  --accept-risk
```

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `DEEPSEEK_API_KEY`
esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
`env.shellEnv`).

## Modelos disponibles

| ID del modelo       | Nombre                   | Tipo         | Contexto |
| ------------------- | ------------------------ | ------------ | -------- |
| `deepseek-chat`     | DeepSeek Chat (V3.2)     | General      | 128K     |
| `deepseek-reasoner` | DeepSeek Reasoner (V3.2) | Razonamiento | 128K     |

- **deepseek-chat** corresponde a DeepSeek-V3.2 en modo sin pensamiento.
- **deepseek-reasoner** corresponde a DeepSeek-V3.2 en modo de pensamiento con razonamiento cadena de pensamiento.

Obtenga su clave API en [platform.deepseek.com](https://platform.deepseek.com/api_keys).

import es from "/components/footer/es.mdx";

<es />
