---
summary: "Configuración de DeepSeek (auth + selección de modelo)"
read_when:
  - You want to use DeepSeek with OpenClaw
  - You need the API key env var or CLI auth choice
---

# DeepSeek

[DeepSeek](https://www.deepseek.com) proporciona potentes modelos de IA con una API compatible con OpenAI.

- Proveedor: `deepseek`
- Autenticación: `DEEPSEEK_API_KEY`
- API: Compatible con OpenAI
- URL base: `https://api.deepseek.com`

## Inicio rápido

Configure la clave API (recomendado: guárdela para el Gateway):

```bash
openclaw onboard --auth-choice deepseek-api-key
```

Esto solicitará su clave API y establecerá `deepseek/deepseek-chat` como el modelo predeterminado.

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

## Catálogo integrado

| Ref. de modelo               | Nombre            | Entrada | Contexto | Salida máxima | Notas                                                       |
| ---------------------------- | ----------------- | ------- | -------- | ------------- | ----------------------------------------------------------- |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | texto   | 131,072  | 8,192         | Modelo predeterminado; superficie DeepSeek V3.2 no pensante |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | texto   | 131,072  | 65,536        | Superficie V3.2 con capacidad de razonamiento               |

Ambos modelos incluidos actualmente anuncian compatibilidad de uso de transmisión en el origen.

Obtenga su clave API en [platform.deepseek.com](https://platform.deepseek.com/api_keys).
