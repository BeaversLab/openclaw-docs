---
title: "Tencent Cloud (TokenHub)"
summary: "Configuración de Tencent Cloud TokenHub"
read_when:
  - You want to use Tencent Hy models with OpenClaw
  - You need the TokenHub API key setup
---

# Tencent Cloud (TokenHub)

Tencent Cloud se distribuye como un **complemento de proveedor incluido** en OpenClaw. Ofrece acceso a los modelos Tencent Hy a través del punto de conexión TokenHub (`tencent-tokenhub`).

El proveedor utiliza una API compatible con OpenAI.

## Inicio rápido

```bash
openclaw onboard --auth-choice tokenhub-api-key
```

## Ejemplo no interactivo

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## Proveedores y puntos de conexión

| Proveedor          | Punto de conexión             | Caso de uso                     |
| ------------------ | ----------------------------- | ------------------------------- |
| `tencent-tokenhub` | `tokenhub.tencentmaas.com/v1` | Hy a través de Tencent TokenHub |

## Modelos disponibles

### tencent-tokenhub

- **hy3-preview** — Hy3 vista previa (256K contexto, razonamiento, predeterminado)

## Notas

- Las referencias de modelos TokenHub usan `tencent-tokenhub/<modelId>`.
- El complemento incluye metadatos de precios escalonados de Hy3 integrados, por lo que las estimaciones de costos se completan sin necesidad de anular manualmente los precios.
- Anule los metadatos de precios y contexto en `models.providers` si es necesario.

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `TOKENHUB_API_KEY`
esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
`env.shellEnv`).

## Documentación relacionada

- [Configuración de OpenClaw](/es/gateway/configuration)
- [Proveedores de modelos](/es/concepts/model-providers)
- [Tencent TokenHub](https://cloud.tencent.com/document/product/1823/130050)
