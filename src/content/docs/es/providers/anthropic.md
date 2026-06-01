---
summary: "Usa Anthropic Claude mediante claves API o Claude CLI en OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

Anthropic desarrolla la familia de modelos **Claude**. OpenClaw admite dos rutas de autenticación:

- **Clave API** — acceso directo a la API de Anthropic con facturación basada en el uso (modelos `anthropic/*`)
- **Claude CLI** — reutilizar un inicio de sesión existente de Claude Code en el mismo host

<Warning>
El backend de Claude CLI de OpenClaw ejecuta la CLI de Claude Code instalada en
modo de impresión no interactivo. La documentación actual de Claude Code de Anthropic describe
`claude -p` como uso de SDK de Agente/programático. A partir del 15 de junio de 2026, Anthropic
indica que el uso del `claude -p` del plan de suscripción ya no se deduce de los límites normales del plan
de Claude; primero se deduce de un crédito mensual separado del SDK de Agente y luego de
los créditos de uso a las tarifas estándar de la API cuando esos créditos están habilitados.

Claude Code interactivo aún se deduce de los límites del plan de Claude con sesión iniciada. La autenticación
con clave de API sigue siendo facturación directa de API de pago por uso. Para hosts de puerta de enlace
de larga duración,
automatización compartida y gastos de producción predecibles, use una clave de API de Anthropic.

La documentación pública actual de Anthropic:

- [Referencia de la CLI de Claude Code](https://code.claude.com/docs/en/cli-usage)
- [Use el SDK de Agente de Claude con su plan de Claude](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan)
- [Use Claude Code con su plan Pro o Max](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan)
- [Use Claude Code con su plan de Team o Enterprise](https://support.claude.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan)
- [Gestionar los costos de Claude Code](https://code.claude.com/docs/en/costs)

</Warning>

## Para empezar

<Tabs>
  <Tab title="Clave de API">
    **Mejor para:** acceso estándar a la API y facturación basada en el uso.

    <Steps>
      <Step title="Obtenga su clave de API">
        Cree una clave de API en la [Consola de Anthropic](https://console.anthropic.com/).
      </Step>
      <Step title="Ejecutar la incorporación">
        ```bash
        openclaw onboard
        # choose: Anthropic API key
        ```

        O pase la clave directamente:

        ```bash
        openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
        ```
      </Step>
      <Step title="Verificar que el modelo esté disponible">
        ```bash
        openclaw models list --provider anthropic
        ```
      </Step>
    </Steps>

    ### Ejemplo de configuración

    ```json5
    {
      env: { ANTHROPIC_API_KEY: "example-anthropic-key-not-real" },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-8" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **Mejor para:** reutilizar un inicio de sesión existente de Claude CLI sin una clave de API separada.

    <Steps>
      <Step title="Asegurarse de que Claude CLI esté instalado y registrado">
        Verifique con:

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
    Los detalles de configuración y tiempo de ejecución del backend de Claude CLI están en [CLI Backends](/es/gateway/cli-backends).
    </Note>

    <Warning>
    La reutilización de Claude CLI espera que el proceso de OpenClaw se ejecute en el mismo host que el
    inicio de sesión de Claude CLI. Las instalaciones en contenedores como [Podman](/es/install/podman) no
    montan el host `~/.claude` en la configuración o el tiempo de ejecución; use una clave de API de Anthropic
    allí, o elija un proveedor con OAuth administrado por OpenClaw como
    [OpenAI Codex](/es/providers/openai).
    </Warning>

    ### Ejemplo de configuración

    Prefiera la referencia de modelo canónica de Anthropic más una anulación de tiempo de ejecución de CLI:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-8" },
          models: {
            "anthropic/claude-opus-4-8": {
              agentRuntime: { id: "claude-cli" },
            },
          },
        },
      },
    }
    ```

    Las referencias de modelo `claude-cli/claude-opus-4-7` heredadas todavía funcionan para
    compatibilidad, pero la nueva configuración debe mantener la selección de proveedor/modelo como
    `anthropic/*` y poner el backend de ejecución en la política de tiempo de ejecución del proveedor/modelo.

    ### Facturación y `claude -p`

    OpenClaw usa la ruta `claude -p` no interactiva de Claude Code para ejecuciones de
    Claude CLI. Anthropic actualmente trata esa ruta como uso de Agent SDK/programático:

    - Hasta el 15 de junio de 2026, el manejo del plan de suscripción sigue las reglas activas de
      Claude Code de Anthropic para la cuenta conectada.
    - A partir del 15 de junio de 2026, el uso `claude -p` del plan de suscripción se toma del
      crédito mensual de Agent SDK del usuario primero, luego de los créditos de uso a las tarifas
      estándar de API si los créditos de uso están habilitados.
    - Los inicios de sesión de consola/clave de API usan la facturación de API de pago por uso y no reciben
      el crédito de Agent SDK de suscripción.

    Anthropic puede cambiar el comportamiento de facturación y limitación de tasa de Claude Code sin un
    lanzamiento de OpenClaw. Verifique `claude auth status`, `/status`, y
    la documentación vinculada de Anthropic cuando importe la previsibilidad de la facturación.

    <Tip>
    Para automatización de producción compartida, use una clave de API de Anthropic en lugar de
    Claude CLI. OpenClaw también admite opciones estilo suscripción de
    [OpenAI Codex](/es/providers/openai), [Qwen Cloud](/es/providers/qwen),
    [MiniMax](/es/providers/minimax) y [Z.AI / GLM](/es/providers/zai).
    </Tip>

  </Tab>
</Tabs>

## Valores predeterminados de pensamiento (Claude 4.8 y 4.6)

Claude Opus 4.8 mantiene el pensamiento desactivado de forma predeterminada en OpenClaw. Cuando habilitas explícitamente el pensamiento adaptativo con `/think high|xhigh|max`, OpenClaw envía los valores de esfuerzo de Opus 4.8 de Anthropic; los modelos Claude 4.6 tienen como valor predeterminado `adaptive`.

Anular por mensaje con `/think:<level>` o en los parámetros del modelo:

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-8": {
          params: { thinking: "high" },
        },
      },
    },
  },
}
```

<Note>
Documentación relacionada de Anthropic:
- [Pensamiento adaptativo](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Pensamiento extendido](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

</Note>

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
    Usa los parámetros a nivel de modelo como base, luego anula agentes específicos a través de `agents.list[].params`:

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
    2. `agents.list[].params` (coincide con `id`, anula por clave)

    Esto permite que un agente mantenga una caché de larga duración mientras que otro agente en el mismo modelo desactiva el almacenamiento en caché para tráfico de ráfagas/baja reutilización.

  </Accordion>

  <Accordion title="Notas de Claude en Bedrock">
    - Los modelos Anthropic Claude en Bedrock (`amazon-bedrock/*anthropic.claude*`) aceptan el paso a través de `cacheRetention` cuando están configurados.
    - Los modelos de Bedrock que no son de Anthropic se fuerzan a `cacheRetention: "none"` en tiempo de ejecución.
    - Los valores predeterminados inteligentes de clave de API también inicializan `cacheRetention: "short"` para referencias de Claude en Bedrock cuando no se establece ningún valor explícito.

  </Accordion>
</AccordionGroup>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Modo rápido">
    El interruptor compartido `/fast` de OpenClaw soporta el tráfico directo de Anthropic (API key y OAuth a `api.anthropic.com`).

    | Command | Asigna a |
    |---------|----------|
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
    - En cuentas sin capacidad de Priority Tier, `service_tier: "auto"` puede resolverse como `standard`.

    </Note>

  </Accordion>

  <Accordion title="Comprensión multimedia (imagen y PDF)">
    El complemento Anthropic incluido registra la comprensión de imágenes y PDF. OpenClaw
    resuelve automáticamente las capacidades multimedia desde la autenticación de Anthropic configurada; no
    se necesita configuración adicional.

    | Property        | Valor                 |
    | --------------- | --------------------- |
    | Default model   | `claude-opus-4-8`     |
    | Supported input | Imágenes, documentos PDF |

    Cuando se adjunta una imagen o PDF a una conversación, OpenClaw automáticamente
    la enruta a través del proveedor de comprensión multimedia de Anthropic.

  </Accordion>

  <Accordion title="Ventana de contexto de 1M">
    La ventana de contexto de 1M de Anthropic está disponible en los modelos Claude 4.x con capacidad GA
    como Opus 4.8, Opus 4.7, Opus 4.6 y Sonnet 4.6. OpenClaw dimensiona esos modelos en
    1M automáticamente:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": {},
          },
        },
      },
    }
    ```

    Las configuraciones más antiguas pueden conservar `params.context1m: true`, pero OpenClaw ya no envía
    el encabezado beta retirado `context-1m-2025-08-07`. Las entradas de configuración `anthropicBeta` más antiguas
    con ese valor se ignoran durante la resolución del encabezado de la solicitud y
    los modelos Claude más antiguos no compatibles se mantienen en su ventana de contexto normal.

    `params.context1m: true` también se aplica al backend de Claude CLI
    (`claude-cli/*`) para los modelos Opus y Sonnet con capacidad GA elegibles, preservando
    la ventana de contexto en tiempo de ejecución para esas sesiones de CLI para que coincida con el comportamiento de la API directa.

    <Warning>
    Requiere acceso a contexto largo en sus credenciales de Anthropic. La autenticación con token de OAuth/suscripción mantiene sus encabezados beta requeridos de Anthropic, pero OpenClaw elimina el encabezado beta de 1M retirado si aún permanece en la configuración antigua.
    </Warning>

  </Accordion>

  <Accordion title="Contexto de 1M de Claude Opus 4.8">
    `anthropic/claude-opus-4-8` y su variante `claude-cli` tienen una ventana de contexto
    de 1M de forma predeterminada; no se necesita `params.context1m: true`.
  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Errores 401 / token inválido de repente">
    La autenticación de token de Anthropic expira y puede ser revocada. Para nuevas configuraciones, use una clave de API de Anthropic en su lugar.
  </Accordion>

<Accordion title='No se encontró ninguna clave de API para el proveedor "anthropic"'>La autenticación de Anthropic es **por agente**: los nuevos agentes no heredan las claves del agente principal. Vuelva a ejecutar la incorporación para ese agente (o configure una clave de API en el host de la puerta de enlace) y luego verifique con `openclaw models status`.</Accordion>

<Accordion title='No se encontraron credenciales para el perfil "anthropic:default"'>Ejecute `openclaw models status` para ver qué perfil de autenticación está activo. Vuelva a ejecutar la incorporación o configure una clave de API para esa ruta de perfil.</Accordion>

  <Accordion title="No available auth profile (all in cooldown)">
    Consulte `openclaw models status --json` para `auth.unusableProfiles`. Los períodos de espera de límites de tasa de Anthropic pueden estar limitados al modelo, por lo que un modelo hermano de Anthropic aún puede ser utilizable. Agregue otro perfil de Anthropic o espere el período de espera.
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
