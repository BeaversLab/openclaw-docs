---
summary: "Usa Anthropic Claude mediante claves API o Claude CLI en OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

Anthropic desarrolla la familia de modelos **Claude**. OpenClaw admite dos rutas de autenticación:

- **Clave API** — acceso directo a la API de Anthropic con facturación basada en el uso (modelos `anthropic/*`)
- **Claude CLI** — reutiliza un inicio de sesión existente de Claude CLI en el mismo host

<Warning>
El personal de Anthropic nos informó que el uso de Claude CLI al estilo de OpenClaw vuelve a estar permitido, por lo que
OpenClaw considera el uso de Claude CLI y el uso de `claude -p` como sancionados a menos que
Anthropic publique una nueva política.

Para hosts de puerta de enlace de larga duración, las claves API de Anthropic siguen siendo la ruta de producción
más clara y predecible.

La documentación pública actual de Anthropic:

- [Referencia de la CLI de Claude Code](https://code.claude.com/docs/en/cli-reference)
- [Descripción general del SDK de Claude Agent](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Uso de Claude Code con tu plan Pro o Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Uso de Claude Code con tu plan Team o Enterprise](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## Para empezar

<Tabs>
  <Tab title="Clave API">
    **Lo mejor para:** acceso estándar a la API y facturación basada en el uso.

    <Steps>
      <Step title="Obtén tu clave API">
        Crea una clave API en la [Consola de Anthropic](https://console.anthropic.com/).
      </Step>
      <Step title="Ejecuta la incorporación">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        O pasa la clave directamente:

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="Verifica que el modelo esté disponible">
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
    **Mejor para:** reutilizar un inicio de sesión existente de Claude CLI sin una clave de API separada.

    <Steps>
      <Step title="Asegurarse de que Claude CLI esté instalado y haya iniciado sesión">
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

    ### Ejemplo de configuración

    Se prefiere la referencia del modelo canónico de Anthropic más una anulación del runtime de CLI:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-7" },
          agentRuntime: { id: "claude-cli" },
        },
      },
    }
    ```

    Las referencias de modelo `claude-cli/claude-opus-4-7` heredadas aún funcionan para
    compatibilidad, pero la nueva configuración debe mantener la selección del proveedor/modelo como
    `anthropic/*` y colocar el backend de ejecución en `agentRuntime.id`.

    <Tip>
    Si desea la ruta de facturación más clara, utilice una clave de API de Anthropic en su lugar. OpenClaw también admite opciones de tipo suscripción de [OpenAI Codex](/es/providers/openai), [Qwen Cloud](/es/providers/qwen), [MiniMax](/es/providers/minimax) y [Z.AI / GLM](/es/providers/glm).
    </Tip>

  </Tab>
</Tabs>

## Valores predeterminados de pensamiento (Claude 4.6)

Los modelos Claude 4.6 usan por defecto el pensamiento `adaptive` en OpenClaw cuando no se establece un nivel de pensamiento explícito.

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

## Almacenamiento en caché del prompt

OpenClaw admite la función de almacenamiento en caché del prompt de Anthropic para la autenticación con clave de API.

| Valor                      | Duración de la caché        | Descripción                                                      |
| -------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `"short"` (predeterminado) | 5 minutos                   | Se aplica automáticamente para la autenticación con clave de API |
| `"long"`                   | 1 hora                      | Caché extendida                                                  |
| `"none"`                   | Sin almacenamiento en caché | Desactivar el almacenamiento en caché del prompt                 |

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
    Utilice los parámetros a nivel de modelo como su base, luego anule agentes específicos a través de `agents.list[].params`:

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

    Orden de combinación de configuración:

    1. `agents.defaults.models["provider/model"].params`
    2. `agents.list[].params` (coincidencia `id`, anulaciones por clave)

    Esto permite que un agente mantenga un caché de larga duración mientras que otro agente en el mismo modelo deshabilita el almacenamiento en caché para el tráfico de ráfagas/baja reutilización.

  </Accordion>

  <Accordion title="Notas sobre Claude en Bedrock">
    - Los modelos Anthropic Claude en Bedrock (`amazon-bedrock/*anthropic.claude*`) aceptan el paso a través (pass-through) de `cacheRetention` cuando están configurados.
    - Los modelos de Bedrock que no son de Anthropic se fuerzan a `cacheRetention: "none"` en tiempo de ejecución.
    - Los valores predeterminados inteligentes de clave de API también inicializan `cacheRetention: "short"` para referencias de Claude-en-Bedrock cuando no se establece ningún valor explícito.
  </Accordion>
</AccordionGroup>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Modo rápido">
    El interruptor compartido `/fast` de OpenClaw admite el tráfico directo de Anthropic (clave de API y OAuth hacia `api.anthropic.com`).

    | Comando | Asigna a |
    |---------|---------|
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
    - Solo se inyecta para solicitudes directas a `api.anthropic.com`. Las rutas de proxy dejan `service_tier` sin cambios.
    - Los parámetros explícitos `serviceTier` o `service_tier` anulan `/fast` cuando ambos están establecidos.
    - En cuentas sin capacidad de Priority Tier, `service_tier: "auto"` puede resolverse a `standard`.
    </Note>

  </Accordion>

  <Accordion title="Comprensión de medios (imagen y PDF)">
    El complemento Anthropic incluido registra la comprensión de imágenes y PDF. OpenClaw
    resuelve automáticamente las capacidades de medios desde la autenticación de Anthropic configurada — no
    se necesita configuración adicional.

    | Propiedad       | Valor                |
    | -------------- | -------------------- |
    | Modelo predeterminado  | `claude-opus-4-6`    |
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

    `params.context1m: true` también se aplica al backend de Claude CLI
    (`claude-cli/*`) para los modelos Opus y Sonnet elegibles, expandiendo la ventana de contexto
    en tiempo de ejecución para esas sesiones de CLI para que coincida con el comportamiento de la API directa.

    <Warning>
    Requiere acceso de contexto largo en sus credenciales de Anthropic. La autenticación de token heredada (`sk-ant-oat-*`) se rechaza para las solicitudes de contexto de 1M — OpenClaw registra una advertencia y vuelve a la ventana de contexto estándar.
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 contexto de 1M">
    `anthropic/claude-opus-4.7` y su variante `claude-cli` tienen una ventana de contexto
    de 1M de manera predeterminada — no se necesita `params.context1m: true`.
  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Errores 401 / token inválido de repente">
    La autenticación de token de Anthropic expira y puede ser revocada. Para nuevas configuraciones, use una clave de API de Anthropic en su lugar.
  </Accordion>

<Accordion title='No se encontró ninguna clave de API para el proveedor "anthropic"'>La autenticación de Anthropic es **por agente** — los agentes nuevos no heredan las claves del agente principal. Vuelva a ejecutar la incorporación para ese agente (o configure una clave de API en el host de la puerta de enlace), luego verifique con `openclaw models status`.</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>Ejecuta `openclaw models status` para ver qué perfil de autenticación está activo. Vuelve a ejecutar el onboarding o configura una clave API para esa ruta de perfil.</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    Verifica `openclaw models status --json` para `auth.unusableProfiles`. Los períodos de espera de límites de tasa de Anthropic pueden estar limitados al modelo, por lo que un modelo hermano de Anthropic aún puede ser utilizable. Agrega otro perfil de Anthropic o espera el período de espera.
  </Accordion>
</AccordionGroup>

<Note>Más ayuda: [Solución de problemas](/es/help/troubleshooting) y [Preguntas frecuentes](/es/help/faq).</Note>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="CLI backends" href="/es/gateway/cli-backends" icon="terminal">
    Configuración y detalles de tiempo de ejecución del backend de Claude CLI.
  </Card>
  <Card title="Prompt caching" href="/es/reference/prompt-caching" icon="database">
    Cómo funciona el almacenamiento en caché de prompts en los diferentes proveedores.
  </Card>
  <Card title="OAuth and auth" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
