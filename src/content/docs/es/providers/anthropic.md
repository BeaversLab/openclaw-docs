---
summary: "Usar Anthropic Claude mediante claves API o Claude CLI en OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic desarrolla la familia de modelos **Claude**. OpenClaw admite dos rutas de autenticación:

- **API key** — acceso directo a la API de Anthropic con facturación basada en el uso (modelos `anthropic/*`)
- **Claude CLI** — reutilizar un inicio de sesión existente de Claude CLI en el mismo host

<Warning>
El personal de Anthropic nos informó que el uso de la CLI de Claude estilo OpenClaw vuelve a estar permitido, por lo que
OpenClaw trata el uso de la CLI de Claude y el uso de `claude -p` como sancionados a menos que
Anthropic publique una nueva política.

Para hosts de puerta de enlace de larga duración, las claves de API de Anthropic siguen siendo la ruta de producción más clara y
predecible.

La documentación pública actual de Anthropic:

- [Referencia de la CLI de Claude Code](https://code.claude.com/docs/en/cli-reference)
- [Descripción general del SDK de Claude Agent](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Uso de Claude Code con su plan Pro o Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Uso de Claude Code con su plan Team o Enterprise](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## Comenzar

<Tabs>
  <Tab title="API key">
    **Mejor para:** acceso estándar a la API y facturación basada en el uso.

    <Steps>
      <Step title="Obtenga su clave de API">
        Cree una clave de API en la [Consola de Anthropic](https://console.anthropic.com/).
      </Step>
      <Step title="Ejecute la incorporación">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        O pase la clave directamente:

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="Verifique que el modelo esté disponible">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### Ejemplo de configuración

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "sk-ant-..." },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **Ideal para:** reutilizar un inicio de sesión existente de Claude CLI sin una clave API separada.

    <Steps>
      <Step title="Asegurar que Claude CLI esté instalado y con sesión iniciada">
        Verificar con:

        ```bash
        claude --version
        ```
      </Step>
      <Step title="Ejecutar la incorporación">
        ```bash
        openclaw onboard
        # choose: Claude CLI
        ```

        OpenClaw detecta y reutiliza las credenciales existentes de Claude CLI.
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    <Note>
    Los detalles de configuración y ejecución del backend de Claude CLI se encuentran en [CLI Backends](/es/gateway/cli-backends).
    </Note>

    <Tip>
    Si deseas la ruta de facturación más clara, utiliza una clave API de Anthropic. OpenClaw también admite opciones de estilo de suscripción de [OpenAI Codex](/es/providers/openai), [Qwen Cloud](/es/providers/qwen), [MiniMax](/es/providers/minimax) y [Z.AI / GLM](/es/providers/glm).
    </Tip>

  </Tab>
</Tabs>

## Valores predeterminados de pensamiento (Claude 4.6)

Los modelos Claude 4.6 tienen como predeterminado el pensamiento `adaptive` en OpenClaw cuando no se establece un nivel de pensamiento explícito.

Anular por mensaje con `/think:<level>` o en los parámetros del modelo:

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { thinking: "adaptive" },
        },
      },
    },
  },
}
```

<Note>Documentación relacionada de Anthropic: - [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking) - [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)</Note>

## Caché de prompt

OpenClaw admite la función de caché de prompt de Anthropic para la autenticación con clave API.

| Valor                      | Duración de la caché | Descripción                                                   |
| -------------------------- | -------------------- | ------------------------------------------------------------- |
| `"short"` (predeterminado) | 5 minutos            | Se aplica automáticamente para la autenticación con clave API |
| `"long"`                   | 1 hora               | Caché extendida                                               |
| `"none"`                   | Sin caché            | Desactivar el caché de prompt                                 |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Anulaciones de caché por agente">
    Utiliza los parámetros a nivel de modelo como línea base y luego anula agentes específicos a través de `agents.list[].params`:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": {
              params: { cacheRetention: "long" },
            },
          },
        },
        list: [
          { id: "research", default: true },
          { id: "alerts", params: { cacheRetention: "none" } },
        ],
      },
    }
    ```

    Orden de fusión de configuración:

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.list[].params` (coincidencia `id`, anulaciones por clave)

    Esto permite que un agente mantenga una caché de larga duración mientras que otro agente en el mismo modelo desactiva el almacenamiento en caché para tráfico con ráfagas/baja reutilización.

  </Accordion>

  <Accordion title="Notas de Claude en Bedrock">
    - Los modelos Claude de Anthropic en Bedrock (`amazon-bedrock/*anthropic.claude*`) aceptan el paso a través de `cacheRetention` cuando se configuran.
    - Los modelos de Bedrock que no son de Anthropic se fuerzan a `cacheRetention: "none"` en tiempo de ejecución.
    - Los valores predeterminados inteligentes de clave de API también inicializan `cacheRetention: "short"` para las referencias de Claude en Bedrock cuando no se establece ningún valor explícito.
  </Accordion>
</AccordionGroup>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Modo rápido">
    El interruptor compartido `/fast` de OpenClaw admite el tráfico directo de Anthropic (clave de API y OAuth hacia `api.anthropic.com`).

    | Comando | Se asigna a |
    |---------|-------------|
    | `/fast on` | `service_tier: "auto"` |
    | `/fast off` | `service_tier: "standard_only"` |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-sonnet-4-6": {
              params: { fastMode: true },
            },
          },
        },
      },
    }
    ```

    <Note>
    - Solo se inyecta para solicitudes directas a `api.anthropic.com`. Las rutas de proxy dejan `service_tier` sin modificar.
    - Los parámetros explícitos `serviceTier` o `service_tier` anulan `/fast` cuando ambos están establecidos.
    - En cuentas sin capacidad de Priority Tier, `service_tier: "auto"` puede resolverse a `standard`.
    </Note>

  </Accordion>

  <Accordion title="Comprensión de medios (imagen y PDF)">
    El complemento Anthropic incluido registra la comprensión de imágenes y PDF. OpenClaw
    resuelve automáticamente las capacidades de medios desde la autenticación de Anthropic configurada; no
    se necesita configuración adicional.

    | Propiedad      | Valor                |
    | -------------- | -------------------- |
    | Modelo predeterminado | `claude-opus-4-6`    |
    | Entrada admitida | Imágenes, documentos PDF |

    Cuando se adjunta una imagen o PDF a una conversación, OpenClaw
    la enruta automáticamente a través del proveedor de comprensión de medios de Anthropic.

  </Accordion>

  <Accordion title="Ventana de contexto de 1M (beta)">
    La ventana de contexto de 1M de Anthropic está limitada a beta. Actívela por modelo:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": {
              params: { context1m: true },
            },
          },
        },
      },
    }
    ```

    OpenClaw asigna esto a `anthropic-beta: context-1m-2025-08-07` en las solicitudes.

    <Warning>
    Requiere acceso de contexto largo en sus credenciales de Anthropic. La autenticación de token heredada (`sk-ant-oat-*`) se rechaza para solicitudes de contexto de 1M; OpenClaw registra una advertencia y vuelve a la ventana de contexto estándar.
    </Warning>

  </Accordion>

  <Accordion title="Normalización de contexto de 1M de Claude Opus 4.7">
    Claude Opus 4.7 (`anthropic/claude-opus-4.7`) y su variante `claude-cli` se normalizan a una ventana de contexto de 1M en los metadatos de tiempo de ejecución resueltos y los informes de estado/contexto del agente activo. No necesita `params.context1m: true` para Opus 4.7; ya no hereda la reserva obsoleta de 200k.

    La compactación y el manejo de desbordamiento utilizan la ventana de 1M automáticamente. Otros modelos de Anthropic mantienen sus límites publicados.

  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Errores 401 / token inválido repentinamente">
    La autenticación por token de Anthropic puede caducar o ser revocada. Para nuevas configuraciones, migre a una clave de API de Anthropic.
  </Accordion>

<Accordion title='No se encontró ninguna clave de API para el proveedor "anthropic"'>La autenticación es **por agente**. Los nuevos agentes no heredan las claves del agente principal. Vuelva a ejecutar la incorporación para ese agente o configure una clave de API en el host de la puerta de enlace, luego verifique con `openclaw models status`.</Accordion>

<Accordion title='No se encontraron credenciales para el perfil "anthropic:default"'>Ejecute `openclaw models status` para ver qué perfil de autenticación está activo. Vuelva a ejecutar la incorporación o configure una clave de API para esa ruta de perfil.</Accordion>

  <Accordion title="No hay ningún perfil de autenticación disponible (todos en enfriamiento)">
    Verifique `openclaw models status --json` para `auth.unusableProfiles`. Los períodos de enfriamiento por límite de velocidad de Anthropic pueden estar limitados al modelo, por lo que un modelo hermano de Anthropic todavía puede ser utilizable. Agregue otro perfil de Anthropic o espere el enfriamiento.
  </Accordion>
</AccordionGroup>

<Note>Más ayuda: [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelos" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Backends de CLI" href="/es/gateway/cli-backends" icon="terminal">
    Configuración y detalles de ejecución del backend de Claude CLI.
  </Card>
  <Card title="Almacenamiento en caché de prompts" href="/es/reference/prompt-caching" icon="database">
    Cómo funciona el almacenamiento en caché de prompts entre diferentes proveedores.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
