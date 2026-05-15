---
summary: "Configuración de Vercel AI Gateway (autenticación + selección de modelo)"
title: "Vercel AI gateway"
read_when:
  - You want to use Vercel AI Gateway with OpenClaw
  - You need the API key env var or CLI auth choice
---

El [Vercel AI Gateway](https://vercel.com/ai-gateway) proporciona una API unificada para
acceder a cientos de modelos a través de un único punto de conexión.

| Propiedad           | Valor                                                |
| ------------------- | ---------------------------------------------------- |
| Proveedor           | `vercel-ai-gateway`                                  |
| Autenticación       | `AI_GATEWAY_API_KEY`                                 |
| API                 | Compatible con Anthropic Messages                    |
| Catálogo de modelos | Descubierto automáticamente a través de `/v1/models` |

<Tip>OpenClaw descubre automáticamente el catálogo del Gateway `/v1/models`, por lo que `/models vercel-ai-gateway` incluye referencias de modelos actuales como `vercel-ai-gateway/openai/gpt-5.5` y `vercel-ai-gateway/moonshotai/kimi-k2.6`.</Tip>

## Para comenzar

<Steps>
  <Step title="Establecer la clave de API">
    Ejecute el onboarding y elija la opción de autenticación de AI Gateway:

    ```bash
    openclaw onboard --auth-choice ai-gateway-api-key
    ```

  </Step>
  <Step title="Establecer un modelo predeterminado">
    Agregue el modelo a su configuración de OpenClaw:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
        },
      },
    }
    ```

  </Step>
  <Step title="Verificar que el modelo esté disponible">
    ```bash
    openclaw models list --provider vercel-ai-gateway
    ```
  </Step>
</Steps>

## Ejemplo no interactivo

Para configuraciones programáticas o de CI, pase todos los valores en la línea de comandos:

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"
```

## Abreviatura de ID de modelo

OpenClaw acepta referencias de modelo abreviadas de Vercel Claude y las normaliza en
tiempo de ejecución:

| Entrada abreviada                   | Referencia de modelo normalizada              |
| ----------------------------------- | --------------------------------------------- |
| `vercel-ai-gateway/claude-opus-4.6` | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| `vercel-ai-gateway/opus-4.6`        | `vercel-ai-gateway/anthropic/claude-opus-4-6` |

<Tip>Puede usar la abreviatura o la referencia de modelo totalmente calificada en su configuración. OpenClaw resuelve la forma canónica automáticamente.</Tip>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Variable de entorno para procesos demonio">
    Si el OpenClaw Gateway se ejecuta como un demonio (launchd/systemd), asegúrese de que
    `AI_GATEWAY_API_KEY` esté disponible para ese proceso.

    <Warning>
    Una clave establecida solo en `~/.profile` no será visible para un demonio
    launchd/systemd a menos que ese entorno se importe explícitamente. Establezca la clave en
    `~/.openclaw/.env` o a través de `env.shellEnv` para garantizar que el proceso de la puerta de enlace pueda
    leerla.
    </Warning>

  </Accordion>

  <Accordion title="Enrutamiento del proveedor">
    Vercel AI Gateway enruta las solicitudes al proveedor ascendente basándose en el prefijo de
    referencia del modelo. Por ejemplo, `vercel-ai-gateway/anthropic/claude-opus-4.6` se enruta
    a través de Anthropic, mientras que `vercel-ai-gateway/openai/gpt-5.5` se enruta a través de
    OpenAI y `vercel-ai-gateway/moonshotai/kimi-k2.6` se enruta a través de
    MoonshotAI. Su único `AI_GATEWAY_API_KEY` maneja la autenticación para todos
    los proveedores ascendentes.
  </Accordion>
  <Accordion title="Thinking levels">
    Las opciones de `/think` siguen los prefijos de modelos upstream de confianza cuando OpenClaw conoce
    el contrato del proveedor upstream. `vercel-ai-gateway/anthropic/...` usa el
    perfil de pensamiento de Claude, incluyendo valores predeterminados adaptativos para modelos Claude 4.6.
    Las referencias estilo `vercel-ai-gateway/openai/gpt-5.4`, `gpt-5.5` y Codex exponen
    `/think xhigh` igual que los proveedores directos de OpenAI/OpenAI Codex. Otras
    referencias con espacio de nombres mantienen los niveles normales de razonamiento a menos que sus metadatos
    de catálogo declaren más.
  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Troubleshooting" href="/es/help/troubleshooting" icon="wrench">
    Solución de problemas general y preguntas frecuentes.
  </Card>
</CardGroup>
