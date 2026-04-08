---
summary: "Configuración de Fireworks (autenticación + selección de modelo)"
read_when:
  - You want to use Fireworks with OpenClaw
  - You need the Fireworks API key env var or default model id
---

# Fireworks

[Fireworks](https://fireworks.ai) expone modelos de pesos abiertos y enrutados a través de una API compatible con OpenAI. OpenClaw ahora incluye un plugin de proveedor de Fireworks incluido.

- Proveedor: `fireworks`
- Autenticación: `FIREWORKS_API_KEY`
- API: chat/completions compatible con OpenAI
- URL base: `https://api.fireworks.ai/inference/v1`
- Modelo predeterminado: `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo`

## Inicio rápido

Configure la autenticación de Fireworks a través de la incorporación:

```bash
openclaw onboard --auth-choice fireworks-api-key
```

Esto guarda su clave de Fireworks en la configuración de OpenClaw y establece el modelo de inicio Fire Pass como el predeterminado.

## Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice fireworks-api-key \
  --fireworks-api-key "$FIREWORKS_API_KEY" \
  --skip-health \
  --accept-risk
```

## Nota sobre el entorno

Si el Gateway se ejecuta fuera de su shell interactivo, asegúrese de que `FIREWORKS_API_KEY`
esté disponible también para ese proceso. Una clave que solo esté en `~/.profile` no ayudará
a un demonio launchd/systemd a menos que ese entorno también se importe allí.

## Catálogo incorporado

| Ref. del modelo                                        | Nombre                      | Entrada      | Contexto | Salida máxima | Notas                                                 |
| ------------------------------------------------------ | --------------------------- | ------------ | -------- | ------------- | ----------------------------------------------------- |
| `fireworks/accounts/fireworks/routers/kimi-k2p5-turbo` | Kimi K2.5 Turbo (Fire Pass) | texto,imagen | 256,000  | 256,000       | Modelo de inicio incluido predeterminado en Fireworks |

## Ids de modelos personalizados de Fireworks

OpenClaw también acepta ids de modelos dinámicos de Fireworks. Use el id exacto del modelo o enrutador que muestra Fireworks y prefíjelo con `fireworks/`.

Ejemplo:

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "fireworks/accounts/fireworks/routers/kimi-k2p5-turbo",
      },
    },
  },
}
```

Si Fireworks publica un modelo más reciente, como un nuevo lanzamiento de Qwen o Gemma, puede cambiar a él directamente usando su id de modelo de Fireworks sin esperar una actualización del catálogo incluido.
