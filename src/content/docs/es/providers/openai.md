---
summary: "Usar OpenAI mediante claves de API o suscripción a Codex en OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI proporciona API de desarrollador para modelos GPT, y Codex también está disponible como un agente de codificación con plan ChatGPT a través de los clientes de Codex de OpenAI. OpenClaw utiliza un id de proveedor, `openai`, para ambas formas de autenticación.

OpenClaw usa `openai/*` como la ruta canónica del modelo de OpenAI. El agente integrado activa los modelos de OpenAI que se ejecutan a través del tiempo de ejecución nativo del servidor de aplicaciones Codex de forma predeterminada; la autenticación directa con clave de API de OpenAI sigue disponible para superficies de OpenAI no relacionadas con agentes, como imágenes, incrustaciones, voz y tiempo real.

- **Modelos de agente** - modelos `openai/*` a través del tiempo de ejecución de Codex; inicie sesión con autenticación Codex para uso de suscripción ChatGPT/Codex, o configure una copia de seguridad de clave de API de OpenAI compatible con Codex cuando intencionalmente desee autenticación con clave de API.
- **API de OpenAI no agente** - acceso directo a la plataforma OpenAI con facturación basada en el uso a través de `OPENAI_API_KEY` o incorporación de clave de API de OpenAI.
- **Configuración heredada** - las referencias de modelo heredadas de Codex se reparan mediante `openclaw doctor --fix` a `openai/*` más el tiempo de ejecución de Codex.

OpenAI admite explícitamente el uso de OAuth de suscripción en herramientas y flujos de trabajo externos como OpenClaw.

El proveedor, el modelo, el tiempo de ejecución y el canal son capas separadas. Si esas etiquetas se están mezclando, lea [Runtimes de agente](/es/concepts/agent-runtimes) antes de cambiar la configuración.

## Elección rápida

| Objetivo                                                                 | Uso                                                                         | Notas                                                                                        |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Suscripción ChatGPT/Codex con runtime nativo de Codex                    | `openai/gpt-5.5`                                                            | Configuración predeterminada del agente OpenAI. Inicie sesión con la autenticación de Codex. |
| Facturación directa con clave de API para modelos de agente              | `openai/gpt-5.5` más un perfil de clave de API compatible con Codex         | Use `auth.order.openai` para colocar el respaldo después de la autenticación de suscripción. |
| Facturación directa mediante clave de API a través de OpenClaw explícito | `openai/gpt-5.5` más el tiempo de ejecución del proveedor/modelo `openclaw` | Seleccione un perfil de clave de API `openai` normal.                                        |
| Alias de la API Instant más reciente de ChatGPT                          | `openai/chat-latest`                                                        | Solo clave de API directa. Alias móvil para experimentos, no el predeterminado.              |
| Autenticación de suscripción ChatGPT/Codex a través de OpenClaw          | `openai/gpt-5.5` más el tiempo de ejecución del proveedor/modelo `openclaw` | Seleccione un perfil OAuth de `openai` para la ruta de compatibilidad.                       |
| Generación o edición de imágenes                                         | `openai/gpt-image-2`                                                        | Funciona con `OPENAI_API_KEY` u OpenAI Codex OAuth.                                          |
| Imágenes con fondo transparente                                          | `openai/gpt-image-1.5`                                                      | Use `outputFormat=png` o `webp` y `openai.background=transparent`.                           |

## Mapa de nombres

Los nombres son similares pero no intercambiables:

| Nombre que ves                            | Capa                           | Significado                                                                                                                                      |
| ----------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openai`                                  | Prefijo del proveedor          | Ruta canónica del modelo de OpenAI; los turnos del agente usan el tiempo de ejecución de Codex.                                                  |
| prefijo heredado de OpenAI Codex          | Prefijo heredado               | Espacio de nombres de modelo/perfil anterior. `openclaw doctor --fix` lo migra a `openai`.                                                       |
| complemento `codex`                       | Complemento                    | Complemento incluido con OpenClaw que proporciona el tiempo de ejecución del servidor de aplicaciones Codex nativo y controles de chat `/codex`. |
| proveedor/modelo `agentRuntime.id: codex` | Tiempo de ejecución del agente | Forzar el arnés nativo del servidor de aplicaciones de Codex para los turnos integrados coincidentes.                                            |
| `/codex ...`                              | Conjunto de comandos de chat   | Vincular/Controlar hilos del servidor de aplicaciones de Codex desde una conversación.                                                           |
| `runtime: "acp", agentId: "codex"`        | Ruta de sesión ACP             | Ruta de reserva explícita que ejecuta Codex a través de ACP/acpx.                                                                                |

Esto significa que una configuración puede contener intencionalmente referencias de modelo `openai/*` mientras los perfiles de autenticación apuntan a credenciales de clave de API u OAuth de ChatGPT/Codex. Use `auth.order.openai` para la configuración; `openclaw doctor --fix` reescribe las referencias de modelo heredadas de Codex, los IDs de perfil de autenticación heredados de Codex y el orden de autenticación heredado de Codex a la ruta canónica de OpenAI.

<Note>
  GPT-5.5 está disponible a través de acceso directo con clave de API de la plataforma OpenAI y rutas de suscripción/OAuth. Para suscripción ChatGPT/Codex más ejecución nativa de Codex, use `openai/gpt-5.5`; la configuración de tiempo de ejecución sin establecer ahora selecciona el arnés de Codex para los turnos de agente de OpenAI. Use perfiles de clave de API de OpenAI solo cuando desee
  autenticación directa con clave de API para un modelo de agente de OpenAI.
</Note>

<Note>
  Las ejecuciones de modelos de agente de OpenAI requieren el complemento de servidor de aplicaciones Codex incluido. La configuración explícita del tiempo de ejecución de OpenClaw sigue disponible como una ruta de compatibilidad opcional. Cuando se selecciona explícitamente OpenClaw con un perfil OAuth `openai`, OpenClaw mantiene la referencia del modelo público como `openai/*` y enruta
  internamente a través del transporte de autenticación Codex. Ejecute `openclaw doctor --fix` para reparar referencias de modelos antiguas de Codex, `codex-cli/*`, o pines de sesión de tiempo de ejecución antiguos que no provienen de una configuración de tiempo de ejecución explícita.
</Note>

## Cobertura de funciones de OpenClaw

| Capacidad de OpenAI                   | Superficie de OpenClaw                                                                            | Estado                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Chat / Respuestas                     | proveedor del modelo `openai/<model>`                                                             | Sí                                                                             |
| Modelos de suscripción Codex          | `openai/<model>` con OpenAI OAuth                                                                 | Sí                                                                             |
| Referencias de modelo Codex heredadas | referencias de modelos antiguas de Codex o `codex-cli/<model>`                                    | Reparado por doctor a `openai/<model>`                                         |
| Arnés de Codex app-server             | `openai/<model>` con tiempo de ejecución omitido o proveedor/modelo `agentRuntime.id: codex`      | Sí                                                                             |
| Búsqueda web en el lado del servidor  | Herramienta nativa OpenAI Responses                                                               | Sí, cuando la búsqueda web está habilitada y ningún proveedor está fijado      |
| Imágenes                              | `image_generate`                                                                                  | Sí                                                                             |
| Videos                                | `video_generate`                                                                                  | Sí                                                                             |
| Texto a voz                           | `messages.tts.provider: "openai"` / `tts`                                                         | Sí                                                                             |
| Voz a texto por lotes                 | `tools.media.audio` / comprensión de medios                                                       | Sí                                                                             |
| Voz a texto en streaming              | Llamada de voz `streaming.provider: "openai"`                                                     | Sí                                                                             |
| Voz en tiempo real                    | Llamada de voz `realtime.provider: "openai"` / Control UI Talk `talk.realtime.provider: "openai"` | Sí (requiere créditos de la plataforma OpenAI, no suscripción a Codex/ChatGPT) |
| Incrustaciones                        | proveedor de incrustación de memoria                                                              | Sí                                                                             |

<Note>
  La voz en tiempo real de OpenAI (utilizada por `realtime.provider: "openai"` de Voice Call y
  Talk with `talk.realtime.provider: "openai"` del Control UI) pasa a través de la
  **API en tiempo real de OpenAI Platform** pública, la cual se factura contra los créditos de
  OpenAI Platform en lugar de la cuota de suscripción de Codex/ChatGPT. Una cuenta
  con OAuth de OpenAI saludable que ejecute modelos de chat respaldados por Codex sin
  problemas aún puede encontrar `insufficient_quota` / "Has excedido tu cuota
  actual" en el primer turno de tiempo real si la misma organización de OpenAI no tiene
  configurada la facturación de Platform.

Solución: recarga los créditos de Platform en
[platform.openai.com/account/billing](https://platform.openai.com/account/billing)
para la organización que respalda tus credenciales en tiempo real. Realtime acepta
un `OPENAI_API_KEY` de Platform (configurado vía `talk.realtime.providers.openai.apiKey`
para Talk del Control UI, o `plugins.entries.voice-call.config.realtime.providers.openai.apiKey`
para Voice Call) o un perfil OAuth `openai` cuya organización
subyacente tenga facturación de Platform — ambas rutas generan secretos de cliente de Realtime
a través de la API de Platform, por lo que de cualquier manera la organización necesita créditos de Platform
financiados. Para los turnos de chat aún puedes usar modelos `openai/*` respaldados por Codex contra la misma
instalación de OpenClaw; Realtime es la única ruta que necesita facturación de Platform.

</Note>

## Incrustaciones de memoria

OpenClaw puede usar OpenAI, o un punto final de integración compatible con OpenAI, para
la indexación `memory_search` y las integraciones de consulta:

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
    },
  },
}
```

Para puntos finales compatibles con OpenAI que requieren etiquetas de integración asimétricas, establece
`queryInputType` y `documentInputType` bajo `memorySearch`. OpenClaw reenvía
esos como campos de solicitud `input_type` específicos del proveedor: las integraciones de consulta usan
`queryInputType`; los fragmentos de memoria indexados y la indexación por lotes usan
`documentInputType`. Consulta la [referencia de configuración de Memory](/es/reference/memory-config#provider-specific-config) para el ejemplo completo.

## Introducción

Elige tu método de autenticación preferido y sigue los pasos de configuración.

<Tabs>
  <Tab title="API key (OpenAI Platform)">
    **Mejor para:** acceso directo a la API y facturación basada en el uso.

    <Steps>
      <Step title="Obtén tu clave de API">
        Crea o copia una clave de API desde el [panel de la plataforma de OpenAI](https://platform.openai.com/api-keys).
      </Step>
      <Step title="Ejecuta el onboarding">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        O pasa la clave directamente:

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="Verifica que el modelo esté disponible">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### Resumen de rutas

    | Ref. de modelo             | Config. de runtime               | Ruta                        | Auth             |
    | -------------------------- | -------------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | omitido / provider/model `agentRuntime.id: "codex"` | Arnés del servidor de aplicaciones Codex | Perfil OpenAI compatible con Codex |
    | `openai/gpt-5.4-mini` | omitido / provider/model `agentRuntime.id: "codex"` | Arnés del servidor de aplicaciones Codex | Perfil OpenAI compatible con Codex |
    | `openai/gpt-5.5`      | provider/model `agentRuntime.id: "openclaw"`              | Runtime incrustado de OpenClaw      | Perfil `openai` seleccionado |

    <Note>
    Los modelos de agente `openai/*` utilizan el arnés del servidor de aplicaciones Codex. Para usar la autenticación con clave de API para un modelo de agente, crea un perfil de clave de API compatible con Codex y ordénalo con `auth.order.openai`; `OPENAI_API_KEY` sigue siendo la reserva directa para superficies de la API de OpenAI que no son de agente. Ejecuta `openclaw doctor --fix` para migrar entradas de orden de autenticación de Codex heredadas más antiguas.
    </Note>

    ### Ejemplo de configuración

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    Para probar el modelo Instant actual de ChatGPT desde la API de OpenAI, establece el modelo
    en `openai/chat-latest`:

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest` es un alias móvil. OpenAI lo documenta como el último modelo Instant
    utilizado en ChatGPT y recomienda `gpt-5.5` para el uso de la API en producción, así que
    mantén `openai/gpt-5.5` como el predeterminado estable a menos que desees explícitamente ese
    comportamiento de alias. El alias actualmente acepta solo la verbosidad de texto `medium`, por lo que
    OpenClaw normaliza las anulaciones de verbosidad de texto de OpenAI incompatibles para este
    modelo.

    <Warning>
    OpenClaw **no** expone `gpt-5.3-codex-spark` en la ruta directa de clave de API de OpenAI. Solo está disponible a través de entradas del catálogo de suscripción de Codex cuando tu cuenta conectada la expone.
    </Warning>

  </Tab>

  <Tab title="Suscripción Codex">
    **Ideal para:** usar tu suscripción ChatGPT/Codex con la ejecución nativa del servidor de aplicaciones Codex en lugar de una clave de API separada. La nube Codex requiere iniciar sesión en ChatGPT.

    <Steps>
      <Step title="Ejecutar Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai
        ```

        O ejecute OAuth directamente:

        ```bash
        openclaw models auth login --provider openai
        ```

        Para configuraciones sin interfaz gráfica o hostiles a las devoluciones de llamada, añada `--device-code` para iniciar sesión con un flujo de código de dispositivo de ChatGPT en lugar de la devolución de llamada del navegador localhost:

        ```bash
        openclaw models auth login --provider openai --device-code
        ```
      </Step>
      <Step title="Usar la ruta canónica del modelo OpenAI">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        No se requiere configuración de tiempo de ejecución para la ruta predeterminada. Las ejecuciones del agente OpenAI
        seleccionan automáticamente el tiempo de ejecución nativo del servidor de aplicaciones Codex, y OpenClaw
        instala o repara el complemento Codex incluido cuando se elige esta ruta.
      </Step>
      <Step title="Verificar que la autenticación Codex esté disponible">
        ```bash
        openclaw models list --provider openai
        ```

        Una vez que la puerta de enlace se esté ejecutando, envíe `/codex status` o `/codex models`
        en el chat para verificar el tiempo de ejecución nativo del servidor de aplicaciones.
      </Step>
    </Steps>

    ### Resumen de rutas

    | Referencia de modelo | Config. de tiempo de ejecución | Ruta | Autenticación |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | omitido / proveedor/modelo `agentRuntime.id: "codex"` | Arnés nativo del servidor de aplicaciones Codex | Inicio de sesión Codex o perfil de autenticación `openai` ordenado |
    | `openai/gpt-5.5` | proveedor/modelo `agentRuntime.id: "openclaw"` | Tiempo de ejecución incrustado OpenClaw con transporte de autenticación Codex interna | Perfil OAuth `openai` seleccionado |
    | referencia heredada de Codex GPT-5.5 | reparado por doctor | Ruta heredada reescrita a `openai/gpt-5.5` | Perfil OAuth OpenAI migrado |
    | `codex-cli/gpt-5.5` | reparado por doctor | Ruta heredada de CLI reescrita a `openai/gpt-5.5` | Autenticación del servidor de aplicaciones Codex |

    <Warning>
    Prefiera `openai/gpt-5.5` para nuevas configuraciones de agente respaldadas por suscripción. Las
    referencias heredadas de GPT de Codex más antiguas son rutas heredadas de OpenClaw, no la ruta del tiempo de ejecución
    nativo de Codex; ejecute `openclaw doctor --fix` cuando desee migrarlas a referencias canónicas
    `openai/*`. `gpt-5.3-codex-spark` permanece limitado a cuentas cuyo
    catálogo de suscripción Codex anuncia ese modelo; las referencias directas de clave de API OpenAI y
    Azure para el mismo siguen suprimidas.
    </Warning>

    <Note>
    El prefijo de modelo Codex heredado es una configuración heredada reparada por doctor. Para
    la configuración común de suscripción más tiempo de ejecución nativo, inicie sesión con autenticación Codex
    pero mantenga la referencia del modelo como `openai/gpt-5.5`. La nueva configuración debe colocar el orden de autenticación del agente OpenAI
    bajo `auth.order.openai`; doctor migra las entradas de orden de autenticación Codex heredadas más antiguas.
    </Note>

    ### Ejemplo de configuración

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.5" },
        },
      },
    }
    ```

    Con una copia de seguridad de clave de API, mantenga el modelo en `openai/gpt-5.5` y coloque el
    orden de autenticación bajo `openai`. OpenClaw intentará la suscripción primero y luego
    la clave de API, mientras permanece en el arnés Codex:

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.5" },
        },
      },
      auth: {
        order: {
          openai: [
            "openai:user@example.com",
            "openai:api-key-backup",
          ],
        },
      },
    }
    ```

    <Note>
    La incorporación ya no importa material OAuth desde `~/.codex`. Inicie sesión con OAuth del navegador (predeterminado) o el flujo de código de dispositivo anterior — OpenClaw gestiona las credenciales resultantes en su propio almacén de autenticación de agentes.
    </Note>

    ### Verificar y recuperar el enrutamiento OAuth de Codex

    Use estos comandos para ver qué modelo, tiempo de ejecución y ruta de autenticación está usando su agente
    predeterminado:

    ```bash
    openclaw models status
    openclaw models auth list --provider openai
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    Para un agente específico, añada `--agent <id>`:

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai
    ```

    Si una configuración antigua todavía tiene referencias heredadas de GPT de Codex o un anclaje de sesión de tiempo de ejecución OpenAI obsoleto
    sin una configuración de tiempo de ejecución explícita, repárela:

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    Si `models auth list --provider openai` no muestra ningún perfil utilizable, inicie
    sesión de nuevo:

    ```bash
    openclaw models auth login --provider openai
    openclaw models status --probe --probe-provider openai
    ```

    Use `--profile-id` cuando desee múltiples inicios de sesión OAuth de Codex en el mismo
    agente y luego desee controlarlos mediante el orden de autenticación o `/model ...@<profileId>`:

    ```bash
    openclaw models auth login --provider openai --profile-id openai:ritsuko
    openclaw models auth login --provider openai --profile-id openai:lain
    ```

    `openai/*` es la ruta del modelo para las ejecuciones del agente OpenAI a través de Codex. Ejecute
    `openclaw doctor --fix` para migrar los ids de perfil de prefijo heredados de OpenAI Codex más antiguos y
    las entradas de orden antes de confiar en el ordenamiento de perfiles.

    ### Indicador de estado

    El chat `/status` muestra qué tiempo de ejecución del modelo está activo para la sesión actual.
    El arnés incluido del servidor de aplicaciones Codex aparece como `Runtime: OpenAI Codex` para
    las ejecuciones del modelo de agente OpenAI. Los anclajes de sesión de tiempo de ejecución OpenAI obsoletos se reparan a Codex a menos que
    la configuración ancle explícitamente OpenClaw.

    ### Advertencia del doctor

    Si las referencias de modelo Codex heredadas o los anclajes de tiempo de ejecución OpenAI obsoletos permanecen en la configuración o
    el estado de la sesión, `openclaw doctor --fix` los reescribe a `openai/*` con el
    tiempo de ejecución Codex a menos que OpenClaw esté configurado explícitamente.

    ### Límite de la ventana de contexto

    OpenClaw trata los metadatos del modelo y el límite de contexto de tiempo de ejecución como valores separados.

    Para `openai/gpt-5.5` a través del catálogo OAuth Codex:

    - `contextWindow` nativo: `1000000`
    - Límite de tiempo de ejecución `contextTokens` predeterminado: `272000`

    El límite predeterminado más pequeño tiene mejores características de latencia y calidad en la práctica. Anúlelo con `contextTokens`:

    ```json5
    {
      models: {
        providers: {
          openai: {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    Use `contextWindow` para declarar metadatos de modelo nativos. Use `contextTokens` para limitar el presupuesto de contexto de tiempo de ejecución.
    </Note>

    ### Recuperación del catálogo

    OpenClaw utiliza los metadatos del catálogo Codex aguas arriba para `gpt-5.5` cuando están
    presentes. Si el descubrimiento en vivo de Codex omite la fila `gpt-5.5` mientras
    la cuenta está autenticada, OpenClaw sintetiza esa fila de modelo OAuth para que
    las ejecuciones de cron, subagente y modelo predeterminado configurado no fallen con
    `Unknown model`.

  </Tab>
</Tabs>

## Autenticación nativa del servidor de aplicaciones Codex

El arnés nativo del servidor de aplicaciones Codex utiliza referencias de modelo `openai/*` más configuración de tiempo de ejecución omitida o proveedor/modelo `agentRuntime.id: "codex"`, pero su autenticación sigue siendo basada en cuenta. OpenClaw selecciona la autenticación en este orden:

1. Perfiles de autenticación de OpenAI ordenados para el agente, preferiblemente bajo `auth.order.openai`. Ejecute `openclaw doctor --fix` para migrar los ids de perfil de autenticación heredados de Codex más antiguos y el orden de autenticación heredado de Codex.
2. La cuenta existente del servidor de aplicaciones, como un inicio de sesión local de Codex CLI ChatGPT.
3. Solo para inicios locales del servidor de aplicaciones stdio, `CODEX_API_KEY`, luego `OPENAI_API_KEY`, cuando el servidor de aplicaciones informa que no hay cuenta y aún requiere autenticación de OpenAI.

Eso significa que un inicio de sesión de suscripción local de ChatGPT/Codex no se reemplaza solo porque el proceso de puerta de enlace también tenga `OPENAI_API_KEY` para modelos directos de OpenAI o incrustaciones. La alternativa de clave de API del entorno es solo la ruta local stdio sin cuenta; no se envía a conexiones de servidor de aplicaciones WebSocket. Cuando se selecciona un perfil de Codex tipo suscripción, OpenClaw también mantiene `CODEX_API_KEY` y `OPENAI_API_KEY` fuera del proceso hijo del servidor de aplicaciones stdio generado y envía las credenciales seleccionadas a través del RPC de inicio de sesión del servidor de aplicaciones. Cuando ese perfil de suscripción está bloqueado por un límite de uso de Codex, OpenClaw puede rotar al siguiente perfil de clave de API `openai:*` ordenado sin cambiar el modelo seleccionado ni salir del arnés de Codex. Una vez que pasa la hora de restablecimiento de la suscripción, el perfil de suscripción es elegible nuevamente.

## Generación de imágenes

El complemento `openai` incluido registra la generación de imágenes a través de la herramienta `image_generate`. Soporta tanto la generación de imágenes con clave de API de OpenAI como la generación de imágenes con OAuth de Codex a través de la misma referencia de modelo `openai/gpt-image-2`.

| Capacidad                        | Clave de API de OpenAI                      | OAuth de Codex                                |
| -------------------------------- | ------------------------------------------- | --------------------------------------------- |
| Referencia de modelo             | `openai/gpt-image-2`                        | `openai/gpt-image-2`                          |
| Autenticación                    | `OPENAI_API_KEY`                            | Inicio de sesión OAuth de OpenAI Codex        |
| Transporte                       | API de Imágenes de OpenAI                   | Backend de Respuestas de Codex                |
| Máximo de imágenes por solicitud | 4                                           | 4                                             |
| Modo de edición                  | Habilitado (hasta 5 imágenes de referencia) | Habilitado (hasta 5 imágenes de referencia)   |
| Anulaciones de tamaño            | Soportado, incluyendo tamaños 2K/4K         | Admitido, incluidos tamaños 2K/4K             |
| Relación de aspecto / resolución | No reenviado a la API de OpenAI Images      | Mapeado a un tamaño admitido cuando es seguro |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>Vea [Generación de imágenes](/es/tools/image-generation) para parámetros de herramientas compartidas, selección de proveedor y comportamiento de conmutación por error.</Note>

`gpt-image-2` es el predeterminado tanto para la generación de texto a imagen de OpenAI como para la edición de imágenes. `gpt-image-1.5`, `gpt-image-1` y `gpt-image-1-mini` siguen siendo utilizables como anulaciones explícitas de modelo. Use `openai/gpt-image-1.5` para una salida PNG/WebP con fondo transparente; la API actual de `gpt-image-2` rechaza `background: "transparent"`.

Para una solicitud con fondo transparente, los agentes deben llamar a `image_generate` con `model: "openai/gpt-image-1.5"`, `outputFormat: "png"` o `"webp"`, y `background: "transparent"`; todavía se acepta la opción de proveedor más antigua `openai.background`. OpenClaw también protege las rutas OAuth públicas de OpenAI y OpenAI Codex reescribiendo las solicitudes `openai/gpt-image-2` transparentes predeterminadas a `gpt-image-1.5`; los puntos de conexión de Azure y los personalizados compatibles con OpenAI mantienen sus nombres de implementación/modelo configurados.

La misma configuración está expuesta para ejecuciones de CLI sin interfaz gráfica:

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

Use las mismas marcas `--output-format` y `--background` con `openclaw infer image edit` cuando comience desde un archivo de entrada. `--openai-background` permanece disponible como un alias específico de OpenAI.

Para las instalaciones de ChatGPT/Codex OAuth, mantenga la misma referencia `openai/gpt-image-2`. Cuando se configura un perfil OAuth `openai`, OpenClaw resuelve ese token de acceso OAuth almacenado y envía solicitudes de imagen a través del backend de Codex Responses. Primero no intenta `OPENAI_API_KEY` ni recurre silenciosamente a una clave API para esa solicitud. Configure `models.providers.openai` explícitamente con una clave API, URL base personalizada o punto de conexión de Azure cuando desee la ruta directa de la API de OpenAI Images.
Si ese punto de conexión de imagen personalizado está en una dirección LAN/privada de confianza, también configure `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`; OpenClaw mantiene bloqueados los puntos de conexión de imagen compatibles con OpenAI privados/internos a menos que esta participación voluntaria esté presente.

Generar:

```
/tool image_generate model=openai/gpt-image-2 prompt="A polished launch poster for OpenClaw on macOS" size=3840x2160 count=1
```

Generar un PNG transparente:

```
/tool image_generate model=openai/gpt-image-1.5 prompt="A simple red circle sticker on a transparent background" outputFormat=png background=transparent
```

Editar:

```
/tool image_generate model=openai/gpt-image-2 prompt="Preserve the object shape, change the material to translucent glass" image=/path/to/reference.png size=1024x1536
```

## Generación de video

El complemento `openai` incluido registra la generación de video a través de la herramienta `video_generate`.

| Capacidad              | Valor                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Modelo predeterminado  | `openai/sora-2`                                                                                    |
| Modos                  | Texto a video, imagen a video, edición de video único                                              |
| Entradas de referencia | 1 imagen o 1 video                                                                                 |
| Anulaciones de tamaño  | Compatible con texto a video e imagen a video                                                      |
| Otras anulaciones      | `aspectRatio`, `resolution`, `audio`, `watermark` se ignoran con una advertencia de la herramienta |

Las solicitudes de imagen a video de OpenAI usan `POST /v1/videos` con una imagen
`input_reference`. Las ediciones de video único usan `POST /v1/videos/edits` con el
video cargado en el campo `video`.

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>Consulte [Video Generation](/es/tools/video-generation) para ver los parámetros de la herramienta compartida, la selección del proveedor y el comportamiento de conmutación por error.</Note>

## Contribución del prompt GPT-5

OpenClaw añade una contribución de prompt GPT-5 compartida para las ejecuciones de la familia GPT-5 en las superficies de prompt ensambladas por OpenClaw. Se aplica por ID de modelo, por lo que las rutas de OpenClaw/proveedor, como las referencias previas a la reparación heredadas (referencia GPT-5.5 de Codex heredada), `openrouter/openai/gpt-5.5`, `opencode/gpt-5.5` y otras referencias GPT-5 compatibles, reciben la misma superposición. Los modelos GPT-4.x más antiguos no.

El arnés nativo de Codex incluido no recibe esta superposición de GPT-5 de OpenClaw a través de las instrucciones de desarrollador del servidor de aplicaciones de Codex. Codex nativo conserva el comportamiento base, de modelo y de documentación del proyecto propiedad de Codex, mientras que OpenClaw deshabilita la personalidad integrada de Codex para los hilos nativos para que los archivos de personalidad del espacio de trabajo del agente sigan siendo autorizados. OpenClaw contribuye solo con contexto de tiempo de ejecución, como la entrega del canal, las herramientas dinámicas de OpenClaw, la delegación de ACP, el contexto del espacio de trabajo y las habilidades de OpenClaw.

La contribución de GPT-5 añade un contrato de comportamiento etiquetado para la persistencia de la personalidad, la seguridad de ejecución, la disciplina de herramientas, la forma de salida, las comprobaciones de finalización y la verificación en los mensajes ensamblados por OpenClaw coincidentes. El comportamiento de respuesta específico del canal y de mensajes silenciosos permanece en el mensaje del sistema compartido de OpenClaw y en la política de entrega saliente. La capa de estilo de interacción amigable es independiente y configurable.

| Valor                         | Efecto                                            |
| ----------------------------- | ------------------------------------------------- |
| `"friendly"` (predeterminado) | Activar la capa de estilo de interacción amigable |
| `"on"`                        | Alias para `"friendly"`                           |
| `"off"`                       | Deshabilitar solo la capa de estilo amigable      |

<Tabs>
  <Tab title="Config">
    ```json5
    {
      agents: {
        defaults: {
          promptOverlays: {
            gpt5: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>Los valores no distinguen entre mayúsculas y minúsculas en tiempo de ejecución, por lo que `"Off"` y `"off"` ambos deshabilitan la capa de estilo amigable.</Tip>

<Note>El `plugins.entries.openai.config.personality` heredado todavía se lee como una alternativa de compatibilidad cuando no se establece la configuración compartida `agents.defaults.promptOverlays.gpt5.personality`.</Note>

## Voz y habla

<AccordionGroup>
  <Accordion title="Síntesis de voz (TTS)">
    El complemento `openai` incluido registra la síntesis de voz para la superficie `messages.tts`.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | Voz | `messages.tts.providers.openai.speakerVoice` | `coral` |
    | Velocidad | `messages.tts.providers.openai.speed` | (sin establecer) |
    | Instrucciones | `messages.tts.providers.openai.instructions` | (sin establecer, solo `gpt-4o-mini-tts`) |
    | Formato | `messages.tts.providers.openai.responseFormat` | `opus` para notas de voz, `mp3` para archivos |
    | Clave API | `messages.tts.providers.openai.apiKey` | Recurre a `OPENAI_API_KEY` |
    | URL base | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | Cuerpo adicional | `messages.tts.providers.openai.extraBody` / `extra_body` | (sin establecer) |

    Modelos disponibles: `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`. Voces disponibles: `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `juniper`, `marin`, `onyx`, `nova`, `sage`, `shimmer`, `verse`.

    `extraBody` se fusiona en el JSON de solicitud `/audio/speech` después de los campos generados por OpenClaw, así que úselo para puntos finales compatibles con OpenAI que requieran claves adicionales como `lang`. Se ignoran las claves de prototipo.

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", speakerVoice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    Establezca `OPENAI_TTS_BASE_URL` para anular la URL base de TTS sin afectar el punto final de la API de chat. El TTS de OpenAI aún se configura a través de una clave API; para una respuesta en vivo solo con OAuth, use la ruta de voz en tiempo real en lugar del habla de modo agente STT -> TTS.
    </Note>

  </Accordion>

  <Accordion title="Conversión de voz a texto">
    El complemento incluido `openai` registra la conversión de voz a texto por lotes a través de
    la superficie de transcripción de comprensión de medios de OpenClaw.

    - Modelo predeterminado: `gpt-4o-transcribe`
    - Endpoint: OpenAI REST `/v1/audio/transcriptions`
    - Ruta de entrada: carga de archivo de audio multiparte
    - Compatible con OpenClaw donde sea que la transcripción de audio entrante utilice
      `tools.media.audio`, incluyendo segmentos de canales de voz de Discord y
      adjuntos de audio de canal

    Para forzar el uso de OpenAI para la transcripción de audio entrante:

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "openai",
                model: "gpt-4o-transcribe",
              },
            ],
          },
        },
      },
    }
    ```

    Las sugerencias de idioma y prompt se reenvían a OpenAI cuando se proporcionan mediante la
    configuración de medios de audio compartida o la solicitud de transcripción por llamada.

  </Accordion>

  <Accordion title="Transcripción en tiempo real">
    El complemento incluido `openai` registra la transcripción en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Idioma | `...openai.language` | (sin establecer) |
    | Prompt | `...openai.prompt` | (sin establecer) |
    | Duración del silencio | `...openai.silenceDurationMs` | `800` |
    | Umbral VAD | `...openai.vadThreshold` | `0.5` |
    | Autenticación | `...openai.apiKey`, `OPENAI_API_KEY`, o `openai` OAuth | Las claves de API se conectan directamente; OAuth genera un secreto de cliente de transcripción en tiempo real |

    <Note>
    Utiliza una conexión WebSocket a `wss://api.openai.com/v1/realtime` con audio G.711 u-law (`g711_ulaw` / `audio/pcmu`). Cuando solo se configura `openai` OAuth, la Gateway genera un secreto de cliente de transcripción en tiempo real efímero antes de abrir el WebSocket. Este proveedor de streaming es para la ruta de transcripción en tiempo real de Voice Call; la voz de Discord actualmente graba segmentos cortos y utiliza la ruta de transcripción por lotes `tools.media.audio` en su lugar.
    </Note>

  </Accordion>

  <Accordion title="Voz en tiempo real">
    El complemento `openai` incluido registra la voz en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | Voz | `...openai.voice` | `alloy` |
    | Temperatura (puente de implementación de Azure) | `...openai.temperature` | `0.8` |
    | Umbral de VAD | `...openai.vadThreshold` | `0.5` |
    | Duración del silencio | `...openai.silenceDurationMs` | `500` |
    | Relleno de prefijo | `...openai.prefixPaddingMs` | `300` |
    | Esfuerzo de razonamiento | `...openai.reasoningEffort` | (sin establecer) |
    | Autenticación | `...openai.apiKey`, `OPENAI_API_KEY` o `openai` OAuth | Browser Talk y los puentes de backend que no son de Azure pueden usar OpenAI OAuth |

    Voces en tiempo real integradas disponibles para `gpt-realtime-2`: `alloy`, `ash`,
    `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`.
    OpenAI recomienda `marin` y `cedar` para obtener la mejor calidad en tiempo real. Este
    es un conjunto separado de las voces de texto a voz anteriores; no asuma que una voz de
    texto a voz como `fable`, `nova` o `onyx` es válida para sesiones en tiempo real.

    <Note>
    Los puentes de tiempo real de backend de OpenAI utilizan la forma de sesión de WebSocket de tiempo real de GA, que no acepta `session.temperature`. Las implementaciones de Azure OpenAI siguen disponibles a través de `azureEndpoint` y `azureDeployment` y mantienen la forma de sesión compatible con la implementación. Admite llamadas a herramientas bidireccionales y audio G.711 u-law.
    </Note>

    <Note>
    La voz en tiempo real se selecciona cuando se crea la sesión. OpenAI permite que la mayoría
    de los campos de la sesión cambien más tarde, pero la voz no se puede cambiar después de que
    el modelo haya emitido audio en esa sesión. OpenClaw actualmente expone los
    ids de voz en tiempo real integrados como cadenas.
    </Note>

    <Note>
    Control UI Talk utiliza sesiones en tiempo real del navegador de OpenAI con un secreto de cliente efímero
    creado por Gateway y un intercambio SDP WebRTC de navegador directo contra la
    API en tiempo real de OpenAI. Cuando no se configura ninguna clave de API de OpenAI directa,
    Gateway puede crear ese secreto de cliente con el perfil OAuth `openai` seleccionado.
    Los puentes de WebSocket en tiempo real de backend de Voice Call y el relé de Gateway utilizan
    el mismo respaldo de OAuth para puntos de conexión nativos de OpenAI. La verificación en vivo del mantenedor está disponible con
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`;
    los tramos de OpenAI verifican tanto el puente WebSocket de backend como el intercambio
    SDP WebRTC del navegador sin registrar secretos.
    </Note>

  </Accordion>
</AccordionGroup>

## Puntos de conexión de Azure OpenAI

El proveedor `openai` incluido puede apuntar a un recurso de Azure OpenAI para la
generación de imágenes anulando la URL base. En la ruta de generación de imágenes, OpenClaw
detecta los nombres de host de Azure en `models.providers.openai.baseUrl` y cambia a
la forma de solicitud de Azure automáticamente.

<Note>La voz en tiempo real utiliza una ruta de configuración separada (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) y no se ve afectada por `models.providers.openai.baseUrl`. Consulte el acordeón **Voz en tiempo real** en [Voz y habla](#voice-and-speech) para su configuración de Azure.</Note>

Use Azure OpenAI cuando:

- Ya tenga una suscripción, cuota o contrato empresarial de Azure OpenAI
- Necesite residencia de datos regionales o controles de cumplimiento que Azure proporciona
- Desea mantener el tráfico dentro de un inquilino de Azure existente

### Configuración

Para la generación de imágenes de Azure a través del proveedor `openai` incluido, apunte
`models.providers.openai.baseUrl` a su recurso de Azure y configure `apiKey` con
la clave de Azure OpenAI (no una clave de la plataforma OpenAI):

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://<your-resource>.openai.azure.com",
        apiKey: "<azure-openai-api-key>",
      },
    },
  },
}
```

OpenClaw reconoce estos sufijos de host de Azure para la ruta de
generación de imágenes de Azure:

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

Para las solicitudes de generación de imágenes en un host de Azure reconocido, OpenClaw:

- Envía el encabezado `api-key` en lugar de `Authorization: Bearer`
- Usa rutas con ámbito de implementación (`/openai/deployments/{deployment}/...`)
- Agrega `?api-version=...` a cada solicitud
- Usa un tiempo de espera de solicitud predeterminado de 600 s para las llamadas de generación de imágenes de Azure.
  Los valores `timeoutMs` por llamada aún anulan este valor predeterminado.

Otras URL base (OpenAI pública, proxies compatibles con OpenAI) mantienen el formato de solicitud de
imagen estándar de OpenAI.

<Note>El enrutamiento de Azure para la ruta de generación de imágenes del proveedor `openai` requiere OpenClaw 2026.4.22 o posterior. Las versiones anteriores tratan cualquier `openai.baseUrl` personalizado como el punto de conexión público de OpenAI y fallarán ante las implementaciones de imágenes de Azure.</Note>

### Versión de la API

Configure `AZURE_OPENAI_API_VERSION` para fijar una versión de vista previa o GA de Azure específica
para la ruta de generación de imágenes de Azure:

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

El valor predeterminado es `2024-12-01-preview` cuando la variable no está configurada.

### Los nombres de modelo son nombres de implementación

Azure OpenAI vincula los modelos a las implementaciones. Para las solicitudes de generación de imágenes de Azure
enrutadas a través del proveedor `openai` incluido, el campo `model` en OpenClaw
debe ser el **nombre de la implementación de Azure** que configuró en el portal de Azure, no
el ID del modelo público de OpenAI.

Si crea una implementación llamada `gpt-image-2-prod` que sirve `gpt-image-2`:

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

La misma regla de nombre de implementación se aplica a las llamadas de generación de imágenes enrutadas a través del proveedor integrado `openai`.

### Disponibilidad regional

La generación de imágenes de Azure actualmente está disponible solo en un subconjunto de regiones (por ejemplo `eastus2`, `swedencentral`, `polandcentral`, `westus3`, `uaenorth`). Consulte la lista actual de regiones de Microsoft antes de crear una implementación y confirme que el modelo específico se ofrece en su región.

### Diferencias de parámetros

Azure OpenAI y OpenAI público no siempre aceptan los mismos parámetros de imagen. Azure puede rechazar opciones que OpenAI público permite (por ejemplo, ciertos valores de `background` en `gpt-image-2`) o exponerlas solo en versiones específicas del modelo. Estas diferencias provienen de Azure y del modelo subyacente, no de OpenClaw. Si una solicitud de Azure falla con un error de validación, verifique el conjunto de parámetros admitido por su implementación específica y versión de API en el portal de Azure.

<Note>
Azure OpenAI utiliza el transporte y el comportamiento de compatibilidad nativos, pero no recibe los encabezados de atribución ocultos de OpenClaw; consulte el acordeón **Rutas nativas vs compatibles con OpenAI** en [Configuración avanzada](#advanced-configuration).

Para el tráfico de chat o Responses en Azure (más allá de la generación de imágenes), use el flujo de incorporación o una configuración de proveedor dedicada de Azure; `openai.baseUrl` por sí solo no recupera la forma de API/autenticación de Azure. Existe un proveedor `azure-openai-responses/*` separado; consulte el acordeón Compresión del lado del servidor a continuación.

</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Transporte (WebSocket vs SSE)">
    OpenClaw usa WebSocket primero con SSE como alternativa (`"auto"`) para `openai/*`.

    En modo `"auto"`, OpenClaw:
    - Reintenta un fallo temprano de WebSocket antes de pasar a SSE
    - Después de un fallo, marca WebSocket como degradado durante ~60 segundos y usa SSE durante el enfriamiento
    - Adjunta encabezados de identidad de sesión y turno estables para reintentos y reconexiones
    - Normaliza los contadores de uso (`input_tokens` / `prompt_tokens`) entre variantes de transporte

    | Valor | Comportamiento |
    |-------|----------|
    | `"auto"` (predeterminado) | WebSocket primero, alternativa SSE |
    | `"sse"` | Forzar solo SSE |
    | `"websocket"` | Forzar solo WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    Documentación relacionada de OpenAI:
    - [Realtime API con WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Respuestas de API de streaming (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="Modo rápido">
    OpenClaw expone un interruptor de modo rápido compartido para `openai/*`:

    - **Chat/Interfaz de usuario:** `/fast status|on|off`
    - **Configuración:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    Cuando está habilitado, OpenClaw asigna el modo rápido al procesamiento prioritario de OpenAI (`service_tier = "priority"`). Los valores existentes de `service_tier` se conservan, y el modo rápido no reescribe `reasoning` o `text.verbosity`.

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    Las anulaciones de sesión tienen prioridad sobre la configuración. Al borrar la anulación de sesión en la interfaz de usuario de Sesiones, la sesión vuelve al valor predeterminado configurado.
    </Note>

  </Accordion>

  <Accordion title="Procesamiento prioritario (service_tier)">
    La API de OpenAI expone el procesamiento prioritario a través de `service_tier`. Establézcalo por modelo en OpenClaw:

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    Valores admitidos: `auto`, `default`, `flex`, `priority`.

    <Warning>
    `serviceTier` solo se reenvía a los puntos finales nativos de OpenAI (`api.openai.com`) y a los puntos finales nativos de Codex (`chatgpt.com/backend-api`). Si enruta cualquier proveedor a través de un proxy, OpenClaw deja `service_tier` sin modificar.
    </Warning>

  </Accordion>

  <Accordion title="Compactación del lado del servidor (API de respuestas)">
    Para modelos directos de OpenAI Responses (`openai/*` en `api.openai.com`), el contenedor de flujo OpenClaw del complemento OpenAI habilita automáticamente la compactación del lado del servidor:

    - Fuerza `store: true` (a menos que la compatibilidad del modelo establezca `supportsStore: false`)
    - Inyecta `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` predeterminado: 70% de `contextWindow` (o `80000` cuando no está disponible)

    Esto se aplica a la ruta de ejecución integrada de OpenClaw y a los enlaces del proveedor OpenAI utilizados por ejecuciones integradas. El arnés nativo del servidor de aplicaciones Codex gestiona su propio contexto a través de Codex y se configura mediante la ruta de agente predeterminada de OpenAI o la política de tiempo de ejecución del proveedor/modelo.

    <Tabs>
      <Tab title="Habilitar explícitamente">
        Útil para puntos de conexión compatibles como Azure OpenAI Responses:

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.5": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="Umbral personalizado">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: {
                    responsesServerCompaction: true,
                    responsesCompactThreshold: 120000,
                  },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="Deshabilitar">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    `responsesServerCompaction` solo controla la inyección de `context_management`. Los modelos directos de OpenAI Responses siguen forzando `store: true` a menos que la compatibilidad establezca `supportsStore: false`.
    </Note>

  </Accordion>

  <Accordion title="Modo GPT agente estricto">
    Para ejecuciones de la familia GPT-5 en `openai/*`, OpenClaw puede utilizar un contrato de ejecución integrada más estricto:

    ```json5
    {
      agents: {
        defaults: {
          embeddedAgent: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    Con `strict-agentic`, OpenClaw:
    - Ya no trata un turno de solo planificación como un progreso exitoso cuando hay una acción de herramienta disponible
    - Reintenta el turno con una dirección de actuación inmediata
    - Habilita automáticamente `update_plan` para trabajos sustanciales
    - Muestra un estado bloqueado explícito si el modelo sigue planificando sin actuar

    <Note>
    Limitado solo a ejecuciones de la familia GPT-5 de OpenAI y Codex. Otros proveedores y familias de modelos más antiguas mantienen el comportamiento predeterminado.
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw trata los puntos finales directos de OpenAI, Codex y Azure OpenAI de manera diferente a los proxies genéricos compatibles con OpenAI `/v1`:

    **Rutas nativas** (`openai/*`, Azure OpenAI):
    - Mantiene `reasoning: { effort: "none" }` solo para modelos que admiten el esfuerzo de `none` de OpenAI
    - Omite el razonamiento deshabilitado para modelos o proxies que rechazan `reasoning.effort: "none"`
    - Establece de forma predeterminada los esquemas de herramientas en modo estricto
    - Adjunta encabezados de atribución ocultos solo en hosts nativos verificados
    - Mantiene el modelado de solicitudes exclusivo de OpenAI (`service_tier`, `store`, reasoning-compat, sugerencias de prompt-cache)

    **Rutas de proxy/compatibles:**
    - Utiliza un comportamiento de compatibilidad más flexible
    - Elimina `store` de Completions de las cargas útiles de `openai-completions` no nativas
    - Acepta JSON de avance avanzado `params.extra_body`/`params.extraBody` para proxies de Completions compatibles con OpenAI
    - Acepta `params.chat_template_kwargs` para proxies de Completions compatibles con OpenAI como vLLM
    - No fuerza esquemas de herramientas estrictos ni encabezados exclusivos de nativos

    Azure OpenAI utiliza transporte nativo y comportamiento de compatibilidad, pero no recibe los encabezados de atribución ocultos.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Parámetros de la herramienta de imágenes compartida y selección de proveedor.
  </Card>
  <Card title="Generación de videos" href="/es/tools/video-generation" icon="video">
    Parámetros de la herramienta de videos compartida y selección de proveedor.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
