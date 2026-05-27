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
El personal de Anthropic nos informó que el uso de la CLI de Claude al estilo OpenClaw está permitido nuevamente, por lo que
OpenClaw considera el reuso de la CLI de Claude y el uso de `claude -p` como sancionado a menos que
Anthropic publique una nueva política.

Para hosts de puerta de enlace de larga duración, las claves de API de Anthropic siguen siendo la ruta de producción más clara y
predecible.

La documentación pública actual de Anthropic:

- [Referencia de la CLI de Claude Code](https://code.claude.com/docs/en/cli-reference)
- [Descripción general del SDK de Claude Agent](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Uso de Claude Code con tu plan Pro o Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Uso de Claude Code con tu plan Team o Enterprise](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

</Warning>

## Para empezar

<Tabs>
  <Tab title="Clave de API">
    **Mejor para:** acceso estándar a la API y facturación basada en el uso.

    <Steps>
      <Step title="Obtén tu clave de API">
        Crea una clave de API en la [Consola de Anthropic](https://console.anthropic.com/).
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
      env: { ANTHROPIC_API_KEY: "example-anthropic-key-not-real" },
      agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
    }
    ```

  </Tab>

  <Tab title="Claude CLI">
    **Lo mejor para:** reutilizar un inicio de sesión existente de Claude CLI sin una clave API separada.

    <Steps>
      <Step title="Asegurarse de que Claude CLI esté instalado y con sesión iniciada">
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
    Los detalles de configuración y ejecución para el backend de Claude CLI se encuentran en [CLI Backends](/es/gateway/cli-backends).
    </Note>

    ### Ejemplo de configuración

    Prefiera la referencia del modelo canónico de Anthropic más una anulación del runtime de CLI:

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-7" },
          models: {
            "anthropic/claude-opus-4-7": {
              agentRuntime: { id: "claude-cli" },
            },
          },
        },
      },
    }
    ```

    Las referencias de modelos heredadas `claude-cli/claude-opus-4-7` todavía funcionan por compatibilidad, pero la nueva configuración debe mantener la selección de proveedor/modelo como `anthropic/*` y colocar el backend de ejecución en la política de runtime de proveedor/modelo.

    <Tip>
    Si desea la ruta de facturación más clara, utilice una clave API de Anthropic en su lugar. OpenClaw también admite opciones de estilo de suscripción de [OpenAI Codex](/es/providers/openai), [Qwen Cloud](/es/providers/qwen), [MiniMax](/es/providers/minimax) y [Z.AI / GLM](/es/providers/zai).
    </Tip>

  </Tab>
</Tabs>

## Valores predeterminados de pensamiento (Claude 4.6)

Los modelos Claude 4.6 tienen por defecto el pensamiento `adaptive` en OpenClaw cuando no se establece un nivel de pensamiento explícito.

Anule por mensaje con `/think:<level>` o en los parámetros del modelo:

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

<Note>
Documentación relacionada de Anthropic:
- [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

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
    Utilice los parámetros a nivel de modelo como línea base y luego anule agentes específicos a través de `agents.list[].params`:

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
    2. `agents.list[].params` (que coincide con `id`, anula por clave)

    Esto permite que un agente mantenga una caché de larga duración mientras que otro agente en el mismo modelo desactiva el almacenamiento en caché para el tráfico de ráfagas/baja reutilización.

  </Accordion>

  <Accordion title="Notas de Claude en Bedrock">
    - Los modelos Anthropic Claude en Bedrock (`amazon-bedrock/*anthropic.claude*`) aceptan el paso a través de `cacheRetention` cuando están configurados.
    - Los modelos de Bedrock que no son de Anthropic se ven obligados a `cacheRetention: "none"` en tiempo de ejecución.
    - Los valores predeterminados inteligentes de clave de API también proporcionan `cacheRetention: "short"` para las referencias de Claude en Bedrock cuando no se establece ningún valor explícito.

  </Accordion>
</AccordionGroup>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Modo rápido">
    El interruptor compartido `/fast` de OpenClaw admite el tráfico directo de Anthropic (clave de API y OAuth hacia `api.anthropic.com`).

    | Comando | Se asigna a |
    |---------|------------|
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
    - Solo se inyecta para solicitudes directas de `api.anthropic.com`. Las rutas de proxy dejan `service_tier` sin cambios.
    - Los parámetros explícitos `serviceTier` o `service_tier` anulan `/fast` cuando ambos están establecidos.
    - En cuentas sin capacidad de nivel de prioridad, `service_tier: "auto"` puede resolverse a `standard`.

    </Note>

  </Accordion>

  <Accordion title="Comprensión de medios (imagen y PDF)">
    El complemento Anthropic incluido registra la comprensión de imágenes y PDF. OpenClaw
    resuelve automáticamente las capacidades de medios desde la autenticación de Anthropic configurada — no
    se necesita configuración adicional.

    | Propiedad       | Valor                 |
    | --------------- | --------------------- |
    | Modelo por defecto | `claude-opus-4-7`     |
    | Entrada admitida | Imágenes, documentos PDF |

    Cuando se adjunta una imagen o PDF a una conversación, OpenClaw
    la enruta automáticamente a través del proveedor de comprensión de medios de Anthropic.

  </Accordion>

  <Accordion title="1M contexto de ventana">
    La ventana de contexto de 1M de Anthropic está disponible en los modelos Claude 4.x con capacidad GA
    como Opus 4.6, Opus 4.7 y Sonnet 4.6. OpenClaw dimensiona esos modelos en
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

    Las configuraciones antiguas pueden conservar `params.context1m: true`, pero OpenClaw ya no envía
    el encabezado beta retirado `context-1m-2025-08-07`. Las entradas de configuración `anthropicBeta` más antiguas
    con ese valor se ignoran durante la resolución del encabezado de la solicitud y
    los modelos Claude antiguos no compatibles se mantienen en su ventana de contexto normal.

    `params.context1m: true` también se aplica al backend de Claude CLI
    (`claude-cli/*`) para los modelos Opus y Sonnet con capacidad GA elegibles, preservando
    la ventana de contexto en tiempo de ejecución para esas sesiones de CLI para que coincida con el comportamiento de la API directa.

    <Warning>
    Requiere acceso de contexto largo en sus credenciales de Anthropic. La autenticación por token de OAuth/suscripción mantiene sus encabezados beta necesarios de Anthropic, pero OpenClaw elimina el encabezado beta de 1M retirado si permanece en la configuración antigua.
    </Warning>

  </Accordion>

  <Accordion title="Claude Opus 4.7 1M context">
    `anthropic/claude-opus-4-7` y su variante `claude-cli` tienen una ventana de contexto de 1M
    de forma predeterminada; no se necesita `params.context1m: true`.
  </Accordion>
</AccordionGroup>

## Solución de problemas

<AccordionGroup>
  <Accordion title="Errores 401 / token inválido de repente">
    La autenticación de token de Anthropic expira y puede ser revocada. Para nuevas configuraciones, use una clave de API de Anthropic en su lugar.
  </Accordion>

<Accordion title='No API key found for provider "anthropic"'>La autenticación de Anthropic es **por agente**: los nuevos agentes no heredan las claves del agente principal. Vuelva a ejecutar el proceso de incorporación para ese agente (o configure una clave de API en el host de la puerta de enlace) y luego verifíquelo con `openclaw models status`.</Accordion>

<Accordion title='No credentials found for profile "anthropic:default"'>Ejecute `openclaw models status` para ver qué perfil de autenticación está activo. Vuelva a ejecutar el proceso de incorporación o configure una clave de API para esa ruta de perfil.</Accordion>

  <Accordion title="No disponible perfil de autenticación (todos en período de enfriamiento)">
    Consulta `openclaw models status --json` para ver `auth.unusableProfiles`. Los períodos de enfriamiento de los límites de velocidad de Anthropic pueden estar limitados al modelo, por lo que un modelo hermano de Anthropic aún podría estar disponible. Añade otro perfil de Anthropic o espera a que termine el período de enfriamiento.
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
