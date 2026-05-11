---
summary: "Configuración de Tencent Cloud TokenHub para Hy3 preview"
title: "Tencent Cloud (TokenHub)"
read_when:
  - You want to use Tencent Hy3 preview with OpenClaw
  - You need the TokenHub API key setup
---

# Tencent Cloud TokenHub

Tencent Cloud se distribuye como un **complemento de proveedor integrado** en OpenClaw. Proporciona acceso a Tencent Hy3 preview a través del endpoint de TokenHub (`tencent-tokenhub`).

El proveedor utiliza una API compatible con OpenAI.

| Propiedad             | Valor                                         |
| --------------------- | --------------------------------------------- |
| Proveedor             | `tencent-tokenhub`                            |
| Modelo predeterminado | `tencent-tokenhub/hy3-preview`                |
| Autenticación         | `TOKENHUB_API_KEY`                            |
| API                   | Completaciones de chat compatibles con OpenAI |
| URL base              | `https://tokenhub.tencentmaas.com/v1`         |
| URL global            | `https://tokenhub-intl.tencentmaas.com/v1`    |

## Inicio rápido

<Steps>
  <Step title="Crear una clave de API de TokenHub">Cree una clave de API en Tencent Cloud TokenHub. Si elige un alcance de acceso limitado para la clave, incluya **Hy3 preview** en los modelos permitidos.</Step>
  <Step title="Ejecutar el onboarding">```bash openclaw onboard --auth-choice tokenhub-api-key ```</Step>
  <Step title="Verificar el modelo">```bash openclaw models list --provider tencent-tokenhub ```</Step>
</Steps>

## Configuración no interactiva

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## Catálogo integrado

| Ref. de modelo                 | Nombre                 | Entrada | Contexto | Salida máxima | Notas                            |
| ------------------------------ | ---------------------- | ------- | -------- | ------------- | -------------------------------- |
| `tencent-tokenhub/hy3-preview` | Hy3 preview (TokenHub) | texto   | 256,000  | 64,000        | Predeterminado; con razonamiento |

Hy3 preview es el gran modelo de lenguaje MoE de Tencent Hunyuan para razonamiento, seguimiento de instrucciones de contexto largo, código y flujos de trabajo de agentes. Los ejemplos compatibles con OpenAI de Tencent utilizan `hy3-preview` como id. de modelo y admiten la llamada a herramientas de chat-completions estándar además de `reasoning_effort`.

<Tip>El id. del modelo es `hy3-preview`. No lo confunda con los modelos `HY-3D-*` de Tencent, que son API de generación 3D y no son el modelo de chat de OpenClaw configurado por este proveedor.</Tip>

## Anulación de endpoint

OpenClaw utiliza por defecto el endpoint `https://tokenhub.tencentmaas.com/v1` de Tencent Cloud. Tencent también documenta un endpoint internacional de TokenHub:

```bash
openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
```

Anule el endpoint solo cuando su cuenta o región de TokenHub lo requieran.

## Notas

- Las referencias de modelos de TokenHub usan `tencent-tokenhub/<modelId>`.
- El catálogo incluido actualmente contiene `hy3-preview`.
- El complemento marca Hy3 preview como con capacidad de razonamiento y con capacidad de uso en streaming.
- El complemento incluye metadatos de precios escalonados de Hy3, por lo que las estimaciones de costo se completan sin necesidad de anular manualmente los precios.
- Anule los precios, el contexto o los metadatos del punto de conexión en `models.providers` solo cuando sea necesario.

## Nota sobre el entorno

Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `TOKENHUB_API_KEY`
esté disponible para ese proceso (por ejemplo, en `~/.openclaw/.env` o a través de
`env.shellEnv`).

## Documentación relacionada

- [Configuración de OpenClaw](/es/gateway/configuration)
- [Proveedores de modelos](/es/concepts/model-providers)
- [Página del producto Tencent TokenHub](https://cloud.tencent.com/product/tokenhub)
- [Generación de texto de Tencent TokenHub](https://cloud.tencent.com/document/product/1823/130079)
- [Configuración de Tencent TokenHub Cline para Hy3 preview](https://cloud.tencent.com/document/product/1823/130932)
- [Ficha del modelo Tencent Hy3 preview](https://huggingface.co/tencent/Hy3-preview)
