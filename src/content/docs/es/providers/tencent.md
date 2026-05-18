---
summary: "Configuración de TokenHub de Tencent Cloud para Hy3 preview"
title: "Tencent Cloud (TokenHub)"
read_when:
  - You want to use Tencent Hy3 preview with OpenClaw
  - You need the TokenHub API key setup
---

Tencent Cloud se distribuye como un complemento de proveedor incluido en OpenClaw. Ofrece acceso a Tencent Hy3 preview a través del endpoint TokenHub (`tencent-tokenhub`) utilizando una API compatible con OpenAI.

| Propiedad                            | Valor                                               |
| ------------------------------------ | --------------------------------------------------- |
| ID del proveedor                     | `tencent-tokenhub`                                  |
| Complemento                          | incluido, `enabledByDefault: true`                  |
| Variable de entorno de autenticación | `TOKENHUB_API_KEY`                                  |
| Indicador de incorporación           | `--auth-choice tokenhub-api-key`                    |
| Indicador directo de CLI             | `--tokenhub-api-key <key>`                          |
| API                                  | Compatible con OpenAI (`openai-completions`)        |
| URL base predeterminada              | `https://tokenhub.tencentmaas.com/v1`               |
| URL base global                      | `https://tokenhub-intl.tencentmaas.com/v1` (anular) |
| Modelo predeterminado                | `tencent-tokenhub/hy3-preview`                      |

## Inicio rápido

<Steps>
  <Step title="Crear una clave de API de TokenHub">
    Cree una clave de API en Tencent Cloud TokenHub. Si elige un ámbito de acceso limitado para la clave, incluya **Hy3 preview** en los modelos permitidos.
  </Step>
  <Step title="Ejecutar la incorporación">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice tokenhub-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY"
```

```bash Env only
export TOKENHUB_API_KEY=...
```

    </CodeGroup>

  </Step>
  <Step title="Verify the model">
    ```bash
    openclaw models list --provider tencent-tokenhub
    ```
  </Step>
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

| Referencia del modelo          | Nombre                 | Entrada | Contexto | Salida máxima | Notas                            |
| ------------------------------ | ---------------------- | ------- | -------- | ------------- | -------------------------------- |
| `tencent-tokenhub/hy3-preview` | Hy3 preview (TokenHub) | texto   | 256,000  | 64,000        | Predeterminado; con razonamiento |

Hy3 preview es el modelo de lenguaje MoE grande de Tencent Hunyuan para razonamiento, seguimiento de instrucciones de contexto largo, código y flujos trabajo de agentes. Los ejemplos compatibles con OpenAI de Tencent usan `hy3-preview` como ID del modelo y soportan la llamada estándar a herramientas de chat-completions más `reasoning_effort`.

<Tip>El ID del modelo es `hy3-preview`. No lo confunda con los modelos `HY-3D-*` de Tencent, que son API de generación 3D y no son el modelo de chat de OpenClaw configurado por este proveedor.</Tip>

## Precios por niveles

El catálogo incluido distribuye metadatos de costos por niveles que escalan con la longitud de la ventana de entrada, por lo que las estimaciones de costos se completan sin anulaciones manuales.

| Rango de tokens de entrada | Tarifa de entrada | Tarifa de salida | Lectura de caché |
| -------------------------- | ----------------- | ---------------- | ---------------- |
| 0 - 16,000                 | 0.176             | 0.587            | 0.059            |
| 16,000 - 32,000            | 0.235             | 0.939            | 0.088            |
| 32,000+                    | 0.293             | 1.173            | 0.117            |

Las tarifas son por millón de tokens en USD según lo anunciado por Tencent. Anule la definición de precios en `models.providers.tencent-tokenhub` solo cuando necesite una superficie diferente.

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Anulación del punto de conexión">
    OpenClaw usa por defecto el punto de conexión `https://tokenhub.tencentmaas.com/v1` de Tencent Cloud. Tencent también documenta un punto de conexión internacional de TokenHub:

    ```bash
    openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
    ```

    Solo anule el punto de conexión cuando su cuenta o región de TokenHub lo requiera.

  </Accordion>

  <Accordion title="Disponibilidad de entorno para el demonio">
    Si el Gateway se ejecuta como un servicio administrado (launchd, systemd, Docker), `TOKENHUB_API_KEY` debe ser visible para ese proceso. Establézcalo en `~/.openclaw/.env` o a través de `env.shellEnv` para que los entornos de ejecución de launchd, systemd o Docker puedan leerlo.

    <Warning>
      Las claves exportadas solo en un shell interactivo no son visibles para los procesos de gateway administrados. Utilice el archivo env o el config seam para disponibilidad persistente.
    </Warning>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Proveedores de modelos" href="/es/concepts/model-providers" icon="layers">
    Elegir proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Referencia de configuración" href="/es/gateway/configuration" icon="gear">
    Esquema de configuración completo, incluida la configuración del proveedor.
  </Card>
  <Card title="TokenHub de Tencent" href="https://cloud.tencent.com/product/tokenhub" icon="arrow-up-right-from-square">
    Página del producto TokenHub de Tencent Cloud.
  </Card>
  <Card title="Ficha del modelo Hy3 preview" href="https://huggingface.co/tencent/Hy3-preview" icon="square-poll-horizontal">
    Detalles y puntos de referencia de Tencent Hunyuan Hy3 preview.
  </Card>
</CardGroup>
