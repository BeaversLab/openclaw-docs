---
title: "Cloudflare AI Gateway"
summary: "Configuración de Cloudflare AI Gateway (autenticación + selección de modelo)"
read_when:
  - You want to use Cloudflare AI Gateway with OpenClaw
  - You need the account ID, gateway ID, or API key env var
---

# Cloudflare AI Gateway

Cloudflare AI Gateway se sitúa delante de las API de los proveedores y le permite añadir análisis, almacenamiento en caché y controles. Para Anthropic, OpenClaw utiliza la Anthropic Messages API a través de su endpoint de Gateway.

| Propiedad             | Valor                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| Proveedor             | `cloudflare-ai-gateway`                                                                                  |
| URL base              | `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`                               |
| Modelo predeterminado | `cloudflare-ai-gateway/claude-sonnet-4-5`                                                                |
| Clave de API          | `CLOUDFLARE_AI_GATEWAY_API_KEY` (su clave de API del proveedor para las solicitudes a través de Gateway) |

<Note>Para los modelos de Anthropic enrutados a través de Cloudflare AI Gateway, utilice su **clave de API de Anthropic** como la clave del proveedor.</Note>

## Primeros pasos

<Steps>
  <Step title="Establecer la clave de API del proveedor y los detalles de Gateway">
    Ejecute la incorporación y elija la opción de autenticación de Cloudflare AI Gateway:

    ```bash
    openclaw onboard --auth-choice cloudflare-ai-gateway-api-key
    ```

    Esto solicita su ID de cuenta, ID de gateway y clave de API.

  </Step>
  <Step title="Establecer un modelo predeterminado">
    Agregue el modelo a su configuración de OpenClaw:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-5" },
        },
      },
    }
    ```

  </Step>
  <Step title="Verificar que el modelo esté disponible">
    ```bash
    openclaw models list --provider cloudflare-ai-gateway
    ```
  </Step>
</Steps>

## Ejemplo no interactivo

Para configuraciones con scripts o CI, pase todos los valores en la línea de comandos:

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"
```

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Gateways autenticados">
    Si habilitó la autenticación de Gateway en Cloudflare, agregue el encabezado `cf-aig-authorization`. Esto es **además de** su clave de API del proveedor.

    ```json5
    {
      models: {
        providers: {
          "cloudflare-ai-gateway": {
            headers: {
              "cf-aig-authorization": "Bearer <cloudflare-ai-gateway-token>",
            },
          },
        },
      },
    }
    ```

    <Tip>
    El encabezado `cf-aig-authorization` se autentica con el Cloudflare Gateway en sí, mientras que la clave de API del proveedor (por ejemplo, su clave de Anthropic) se autentica con el proveedor upstream.
    </Tip>

  </Accordion>

  <Accordion title="Nota sobre el entorno">
    Si el Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que `CLOUDFLARE_AI_GATEWAY_API_KEY` esté disponible para ese proceso.

    <Warning>
    Una clave que solo se encuentre en `~/.profile` no ayudará a un demonio launchd/systemd a menos que ese entorno también se importe allí. Establezca la clave en `~/.openclaw/.env` o a través de `env.shellEnv` para asegurar que el proceso del gateway pueda leerla.
    </Warning>

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Cómo elegir proveedores, referencias de modelos y el comportamiento de conmutación por error.
  </Card>
  <Card title="Solución de problemas" href="/es/help/troubleshooting" icon="wrench">
    Solución de problemas generales y preguntas frecuentes.
  </Card>
</CardGroup>
