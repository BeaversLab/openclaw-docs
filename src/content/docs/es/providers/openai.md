---
summary: "Usa OpenAI mediante claves de API o suscripción a Codex en OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI proporciona API de desarrollador para modelos GPT, y Codex también está disponible como agente de codificación con plan ChatGPT a través de los clientes de Codex de OpenAI. OpenClaw mantiene esas superficies separadas para que la configuración sea predecible.

OpenClaw utiliza `openai/*` como la ruta de modelo canónica de OpenAI. El agente integrado activa los modelos de OpenAI que se ejecutan a través del tiempo de ejecución del servidor de aplicaciones nativo de Codex de forma predeterminada; la autenticación directa con clave de API de OpenAI sigue disponible para superficies de OpenAI que no son de agentes, como imágenes, incrustaciones, voz y tiempo real.

- **Modelos de agente** - modelos `openai/*` a través del tiempo de ejecución de Codex; inicie sesión con la autenticación de Codex para el uso de suscripción a ChatGPT/Codex, o configure una copia de seguridad de clave de API de OpenAI compatible con Codex cuando desee intencionalmente la autenticación con clave de API.
- **APIs de OpenAI sin agente** - acceso directo a la plataforma OpenAI con facturación basada en el uso a través de `OPENAI_API_KEY` o incorporación de clave de API de OpenAI.
- **Configuración heredada** - las referencias de modelo `openai-codex/*` se reparan mediante `openclaw doctor --fix` a `openai/*` además del tiempo de ejecución de Codex.

OpenAI admite explícitamente el uso de OAuth de suscripción en herramientas y flujos de trabajo externos como OpenClaw.

El proveedor, el modelo, el tiempo de ejecución y el canal son capas separadas. Si esas etiquetas se están mezclando, lea [Agent runtimes](/es/concepts/agent-runtimes) antes de cambiar la configuración.

## Elección rápida

| Objetivo                                                            | Uso                                                                   | Notas                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Suscripción ChatGPT/Codex con runtime nativo de Codex               | `openai/gpt-5.5`                                                      | Configuración predeterminada del agente OpenAI. Inicie sesión con la autenticación de Codex.           |
| Facturación directa con clave de API para modelos de agente         | `openai/gpt-5.5` más un perfil de clave de API compatible con Codex   | Use `auth.order.openai` para colocar la copia de seguridad después de la autenticación de suscripción. |
| Facturación directa con clave de API a través de PI explícito       | `openai/gpt-5.5` más el tiempo de ejecución del proveedor/modelo `pi` | Seleccione un perfil de clave de API normal `openai`.                                                  |
| Alias de la API Instant más reciente de ChatGPT                     | `openai/chat-latest`                                                  | Solo clave de API directa. Alias móvil para experimentos, no el predeterminado.                        |
| Autenticación de suscripción ChatGPT/Codex a través de PI explícito | `openai/gpt-5.5` más el tiempo de ejecución del proveedor/modelo `pi` | Seleccione un perfil de autenticación `openai-codex` para la ruta de compatibilidad.                   |
| Generación o edición de imágenes                                    | `openai/gpt-image-2`                                                  | Funciona con `OPENAI_API_KEY` u OAuth de OpenAI Codex.                                                 |
| Imágenes con fondo transparente                                     | `openai/gpt-image-1.5`                                                | Use `outputFormat=png` o `webp` y `openai.background=transparent`.                                     |

## Mapa de nombres

Los nombres son similares pero no intercambiables:

| Nombre que ves                            | Capa                                     | Significado                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai`                                  | Prefijo del proveedor                    | Ruta canónica del modelo de OpenAI; los turnos del agente usan el tiempo de ejecución de Codex.                                                    |
| `openai-codex`                            | Prefijo de autenticación/perfil heredado | Espacio de nombres del perfil de OAuth/suscripción antiguo de OpenAI Codex. Los perfiles existentes y `auth.order.openai-codex` todavía funcionan. |
| complemento `codex`                       | Complemento                              | Complemento incluido en OpenClaw que proporciona el tiempo de ejecución nativo del servidor de aplicaciones Codex y controles de chat `/codex`.    |
| proveedor/modelo `agentRuntime.id: codex` | Tiempo de ejecución del agente           | Forzar el arnés nativo del servidor de aplicaciones de Codex para los turnos integrados coincidentes.                                              |
| `/codex ...`                              | Conjunto de comandos de chat             | Vincular/Controlar hilos del servidor de aplicaciones de Codex desde una conversación.                                                             |
| `runtime: "acp", agentId: "codex"`        | Ruta de sesión ACP                       | Ruta de reserva explícita que ejecuta Codex a través de ACP/acpx.                                                                                  |

Esto significa que una configuración puede contener intencionalmente referencias de modelos `openai/*` mientras los perfiles de autenticación siguen apuntando a credenciales compatibles con Codex. Prefiera `auth.order.openai` para nuevas configuraciones; los perfiles `openai-codex:*` existentes y `auth.order.openai-codex` siguen siendo compatibles. `openclaw doctor --fix` reescribe las referencias de modelos `openai-codex/*` heredadas a la ruta canónica del modelo OpenAI.

<Note>
  GPT-5.5 está disponible tanto a través del acceso directo con clave de API de la plataforma OpenAI como a través de rutas de suscripción/OAuth. Para la suscripción a ChatGPT/Codex más la ejecución nativa de Codex, use `openai/gpt-5.5`; la configuración de tiempo de ejecución sin establecer ahora selecciona el arnés de Codex para los turnos del agente OpenAI. Use perfiles de clave de API de
  OpenAI solo cuando desee autenticación directa con clave de API para un modelo de agente OpenAI.
</Note>

<Note>
  Las ejecuciones del modelo de agente de OpenAI requieren el complemento del servidor de aplicaciones Codex incluido. La configuración explícita del tiempo de ejecución de PI sigue disponible como una ruta de compatibilidad opcional. Cuando se selecciona explícitamente PI con un perfil de autenticación `openai-codex`, OpenClaw mantiene la referencia del modelo público como `openai/*` y enruta PI
  internamente a través del transporte de autenticación Codex heredado. Ejecute `openclaw doctor --fix` para reparar `openai-codex/*` obsoletos, `codex-cli/*` o pines de sesión PI antiguos que no provienen de una configuración de tiempo de ejecución explícita.
</Note>

## Cobertura de funciones de OpenClaw

| Capacidad de OpenAI                   | Superficie de OpenClaw                                                                       | Estado                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Chat / Respuestas                     | proveedor del modelo `openai/<model>`                                                        | Sí                                                                        |
| Modelos de suscripción Codex          | `openai/<model>` con OAuth `openai-codex`                                                    | Sí                                                                        |
| Referencias de modelo Codex heredadas | `openai-codex/<model>` o `codex-cli/<model>`                                                 | Reparado por doctor a `openai/<model>`                                    |
| Arnés de Codex app-server             | `openai/<model>` con tiempo de ejecución omitido o proveedor/modelo `agentRuntime.id: codex` | Sí                                                                        |
| Búsqueda web en el lado del servidor  | Herramienta nativa OpenAI Responses                                                          | Sí, cuando la búsqueda web está habilitada y ningún proveedor está fijado |
| Imágenes                              | `image_generate`                                                                             | Sí                                                                        |
| Videos                                | `video_generate`                                                                             | Sí                                                                        |
| Texto a voz                           | `messages.tts.provider: "openai"` / `tts`                                                    | Sí                                                                        |
| Voz a texto por lotes                 | `tools.media.audio` / comprensión de medios                                                  | Sí                                                                        |
| Voz a texto en streaming              | Llamada de voz `streaming.provider: "openai"`                                                | Sí                                                                        |
| Voz en tiempo real                    | Llamada de voz `realtime.provider: "openai"` / Talk de interfaz de control                   | Sí                                                                        |
| Incrustaciones                        | proveedor de incrustación de memoria                                                         | Sí                                                                        |

## Incrustaciones de memoria

OpenClaw puede usar OpenAI, o un punto final de incrustación compatible con OpenAI, para incrustaciones de indexación y consultas de `memory_search`:

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

Para puntos finales compatibles con OpenAI que requieren etiquetas de incrustación asimétricas, establezca `queryInputType` y `documentInputType` en `memorySearch`. OpenClaw reenvía esos como campos de solicitud `input_type` específicos del proveedor: las incrustaciones de consultas usan `queryInputType`; los fragmentos de memoria indexados y la indexación por lotes usan `documentInputType`. Consulte la [referencia de configuración de memoria](/es/reference/memory-config#provider-specific-config) para ver el ejemplo completo.

## Comenzando

Elija su método de autenticación preferido y siga los pasos de configuración.

<Tabs>
  <Tab title="Clave de API (plataforma de OpenAI)">
    **Lo mejor para:** acceso directo a la API y facturación basada en el uso.

    <Steps>
      <Step title="Obtén tu clave de API">
        Crea o copia una clave de API desde el [panel de la plataforma de OpenAI](https://platform.openai.com/api-keys).
      </Step>
      <Step title="Ejecuta la incorporación">
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

    | Referencia del modelo              | Configuración de tiempo de ejecución             | Ruta                       | Autenticación             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | omitido / proveedor/modelo `agentRuntime.id: "codex"` | arnés del servidor de aplicaciones Codex | perfil de OpenAI compatible con Codex |
    | `openai/gpt-5.4-mini` | omitido / proveedor/modelo `agentRuntime.id: "codex"` | arnés del servidor de aplicaciones Codex | perfil de OpenAI compatible con Codex |
    | `openai/gpt-5.5`      | proveedor/modelo `agentRuntime.id: "pi"`              | tiempo de ejecución integrado de PI      | perfil `openai` o perfil `openai-codex` seleccionado |

    <Note>
    Los modelos de agente `openai/*` utilizan el arnés del servidor de aplicaciones Codex. Para utilizar la autenticación con clave de API para un modelo de agente, cree un perfil de clave de API compatible con Codex y ordénelo con `auth.order.openai`; `OPENAI_API_KEY` sigue siendo la alternativa directa para las superficies de la API de OpenAI que no son de agente. Las entradas antiguas `auth.order.openai-codex` todavía funcionan.
    </Note>

    ### Ejemplo de configuración

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    Para probar el modelo Instant actual de ChatGPT desde la API de OpenAI, establezca el modelo
    en `openai/chat-latest`:

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest` es un alias móvil. OpenAI lo documenta como el último modelo Instant
    utilizado en ChatGPT y recomienda `gpt-5.5` para el uso de la API en producción, así que
    mantenga `openai/gpt-5.5` como el valor predeterminado establecido a menos que desee explícitamente ese
    comportamiento de alias. El alias actualmente acepta solo verbosidad de texto `medium`, por lo que
    OpenClaw normaliza las anulaciones de verbosidad de texto incompatibles de OpenAI para este
    modelo.

    <Warning>
    OpenClaw **no** expone `openai/gpt-5.3-codex-spark`. Las solicitudes en vivo a la API de OpenAI rechazan ese modelo, y el catálogo actual de Codex tampoco lo expone.
    </Warning>

  </Tab>

  <Tab title="Suscripción Codex">
    **Mejor para:** usar tu suscripción ChatGPT/Codex con ejecución nativa del servidor de aplicaciones Codex en lugar de una clave API separada. La nube Codex requiere inicio de sesión en ChatGPT.

    <Steps>
      <Step title="Ejecutar Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        O ejecute OAuth directamente:

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        Para configuraciones sin cabeza o hostiles a las devoluciones de llamada, añada `--device-code` para iniciar sesión con un flujo de código de dispositivo de ChatGPT en lugar de la devolución de llamada del navegador en localhost:

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="Usar la ruta canónica del modelo OpenAI">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        No se requiere configuración de tiempo de ejecución para la ruta predeterminada. Los turnos del agente OpenAI
        seleccionarán automáticamente el tiempo de ejecución nativo del servidor de aplicaciones Codex, y OpenClaw
        instalará o reparará el complemento Codex incluido cuando se elija esta ruta.
      </Step>
      <Step title="Verificar que la autenticación Codex esté disponible">
        ```bash
        openclaw models list --provider openai-codex
        ```

        Después de que la puerta de enlace se esté ejecutando, envíe `/codex status` o `/codex models`
        en el chat para verificar el tiempo de ejecución nativo del servidor de aplicaciones.
      </Step>
    </Steps>

    ### Resumen de rutas

    | Ref. de modelo | Config. de tiempo de ejecución | Ruta | Autenticación |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | omitido / proveedor/modelo `agentRuntime.id: "codex"` | Arnés nativo del servidor de aplicaciones Codex | Inicio de sesión Codex o perfil de autenticación `openai` ordenado |
    | `openai/gpt-5.5` | proveedor/modelo `agentRuntime.id: "pi"` | Tiempo de ejecución integrado PI con transporte de autenticación Codex interna | Perfil `openai-codex` seleccionado |
    | `openai-codex/gpt-5.5` | reparado por doctor | Ruta heredada reescrita a `openai/gpt-5.5` | Perfil `openai-codex` existente |
    | `codex-cli/gpt-5.5` | reparado por doctor | Ruta de línea de comandos heredada reescrita a `openai/gpt-5.5` | Autenticación del servidor de aplicaciones Codex |

    <Warning>
    No configure referencias de modelos antiguas `openai-codex/gpt-5.1*`, `openai-codex/gpt-5.2*`, o
    `openai-codex/gpt-5.3*`. Las cuentas ChatGPT/Codex OAuth ahora rechazan
    esos modelos. Use `openai/gpt-5.5`; los turnos del agente OpenAI ahora seleccionarán el tiempo de ejecución
    Codex de manera predeterminada.
    </Warning>

    <Note>
    El prefijo de modelo `openai-codex/*` es configuración heredada reparada por doctor. Para
    la configuración común de suscripción más tiempo de ejecución nativo, inicie sesión con autenticación Codex
    pero mantenga la referencia del modelo como `openai/gpt-5.5`. La nueva configuración debe colocar el orden de autenticación del agente OpenAI bajo `auth.order.openai`; las entradas antiguas `auth.order.openai-codex`
    siguen siendo válidas.
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

    Con una copia de seguridad de clave API, mantenga el modelo en `openai/gpt-5.5` y ponga el
    orden de autenticación bajo `openai`. OpenClaw intentará primero la suscripción, luego
    la clave API, mientras se mantiene en el arnés Codex:

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
            "openai-codex:user@example.com",
            "openai:api-key-backup",
          ],
        },
      },
    }
    ```

    <Note>
    La incorporación ya no importa material OAuth de `~/.codex`. Inicie sesión con OAuth del navegador (predeterminado) o el flujo de código de dispositivo anterior; OpenClaw gestiona las credenciales resultantes en su propio almacén de autenticación de agentes.
    </Note>

    ### Verificar y recuperar el enrutamiento OAuth de Codex

    Use estos comandos para ver qué modelo, tiempo de ejecución y ruta de autenticación está usando su agente
    predeterminado:

    ```bash
    openclaw models status
    openclaw models auth list --provider openai-codex
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    Para un agente específico, añada `--agent <id>`:

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai-codex
    ```

    Si una configuración antigua todavía tiene `openai-codex/gpt-*` o un pin de sesión PI de OpenAI obsoleto
    sin una configuración explícita de tiempo de ejecución, repárelo:

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    Si `models auth list --provider openai-codex` no muestra ningún perfil utilizable, inicie
    sesión de nuevo:

    ```bash
    openclaw models auth login --provider openai-codex
    openclaw models status --probe --probe-provider openai-codex
    ```

    `openai/*` es la ruta del modelo para los turnos del agente OpenAI a través de Codex. El
    id del proveedor de autenticación/perfil `openai-codex` sigue siendo aceptado para perfiles
    existentes y listados de línea de comandos.

    ### Indicador de estado

    El chat `/status` muestra qué tiempo de ejecución del modelo está activo para la sesión actual.
    El arnés incluido del servidor de aplicaciones Codex aparece como `Runtime: OpenAI Codex` para
    los turnos del modelo del agente OpenAI. Los pines de sesión PI obsoletos se reparan a Codex a menos que
    la configuración fije explícitamente PI.

    ### Advertencia del doctor

    Si las rutas `openai-codex/*` o los pines PI de OpenAI obsoletos permanecen en la configuración o
    el estado de la sesión, `openclaw doctor --fix` los reescribe a `openai/*` con el
    tiempo de ejecución Codex a menos que PI esté configurado explícitamente.

    ### Límite de la ventana de contexto

    OpenClaw trata los metadatos del modelo y el límite de contexto del tiempo de ejecución como valores separados.

    Para `openai/gpt-5.5` a través del catálogo OAuth de Codex:

    - `contextWindow` nativo: `1000000`
    - Límite de `contextTokens` del tiempo de ejecución predeterminado: `272000`

    El límite predeterminado más pequeño tiene mejores características de latencia y calidad en la práctica. Anúlelo con `contextTokens`:

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    Use `contextWindow` para declarar metadatos del modelo nativo. Use `contextTokens` para limitar el presupuesto del contexto de tiempo de ejecución.
    </Note>

    ### Recuperación del catálogo

    OpenClaw utiliza los metadatos del catálogo Codex anterior para `gpt-5.5` cuando están
    presentes. Si el descubrimiento en vivo de Codex omite la fila `gpt-5.5` mientras
    la cuenta está autenticada, OpenClaw sintetiza esa fila del modelo OAuth para que
    las ejecuciones de cron, subagente y modelo predeterminado configurado no fallen con
    `Unknown model`.

  </Tab>
</Tabs>

## Autenticación nativa del servidor de aplicaciones Codex

El arnés de la aplicación nativa de Codex utiliza referencias de modelo `openai/*` más configuración de tiempo de ejecución omitida o proveedor/modelo `agentRuntime.id: "codex"`, pero su autenticación sigue basándose en la cuenta. OpenClaw selecciona la autenticación en este orden:

1. Perfiles de autenticación de OpenAI ordenados para el agente, preferiblemente bajo `auth.order.openai`. Los perfiles `openai-codex:*` existentes y `auth.order.openai-codex` siguen siendo válidos para instalaciones antiguas.
2. La cuenta existente del servidor de aplicaciones, como un inicio de sesión local de Codex CLI ChatGPT.
3. Solo para inicios locales de la aplicación-servidor stdio, `CODEX_API_KEY`, luego `OPENAI_API_KEY`, cuando la aplicación-servidor no informa de ninguna cuenta y aún requiere autenticación de OpenAI.

Eso significa que un inicio de sesión de suscripción local de ChatGPT/Codex no se reemplaza solo porque el proceso de puerta de enlace también tiene `OPENAI_API_KEY` para modelos directos de OpenAI o incrustaciones. La alternativa de clave de API de entorno es solo la ruta local stdio sin cuenta; no se envía a conexiones de aplicación-servidor WebSocket. Cuando se selecciona un perfil de Codex estilo suscripción, OpenClaw también mantiene `CODEX_API_KEY` y `OPENAI_API_KEY` fuera del hijo de la aplicación-servidor stdio generado y envía las credenciales seleccionadas a través del RPC de inicio de sesión de la aplicación-servidor. Cuando ese perfil de suscripción está bloqueado por un límite de uso de Codex, OpenClaw puede rotar al siguiente perfil de clave de API `openai:*` ordenado sin cambiar el modelo seleccionado ni salir del arnés de Codex. Una vez que pasa el tiempo de restablecimiento de la suscripción, el perfil de suscripción vuelve a ser elegible.

## Generación de imágenes

El complemento incluido `openai` registra la generación de imágenes a través de la herramienta `image_generate`. Soporta tanto la generación de imágenes con clave de API de OpenAI como la generación de imágenes OAuth de Codex a través de la misma referencia de modelo `openai/gpt-image-2`.

| Capacidad                        | Clave de API de OpenAI                      | Codex OAuth                                      |
| -------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| Referencia de modelo             | `openai/gpt-image-2`                        | `openai/gpt-image-2`                             |
| Autenticación                    | `OPENAI_API_KEY`                            | Inicio de sesión OAuth de OpenAI Codex           |
| Transporte                       | API de OpenAI Images                        | Backend de Codex Responses                       |
| Máximo de imágenes por solicitud | 4                                           | 4                                                |
| Modo de edición                  | Habilitado (hasta 5 imágenes de referencia) | Habilitado (hasta 5 imágenes de referencia)      |
| Anulaciones de tamaño            | Soportado, incluyendo tamaños 2K/4K         | Soportado, incluyendo tamaños 2K/4K              |
| Relación de aspecto / resolución | No reenviado a la API de OpenAI Images      | Mapeado a un tamaño compatible cuando sea seguro |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>Consulte [Generación de imágenes](/es/tools/image-generation) para ver los parámetros de herramientas compartidas, la selección de proveedores y el comportamiento de conmutación por error.</Note>

`gpt-image-2` es el valor predeterminado tanto para la generación de texto a imagen de OpenAI como para la edición de imágenes. `gpt-image-1.5`, `gpt-image-1` y `gpt-image-1-mini` siguen siendo utilizables como anulaciones explícitas de modelo. Use `openai/gpt-image-1.5` para la salida PNG/WebP con fondo transparente; la API actual de `gpt-image-2` rechaza `background: "transparent"`.

Para una solicitud con fondo transparente, los agentes deben llamar a `image_generate` con `model: "openai/gpt-image-1.5"`, `outputFormat: "png"` o `"webp"`, y `background: "transparent"`; la opción de proveedor anterior `openai.background` todavía se acepta. OpenClaw también protege las rutas públicas de OAuth de OpenAI y OpenAI Codex reescribiendo las solicitudes transparentes predeterminadas de `openai/gpt-image-2` a `gpt-image-1.5`; los puntos finales de Azure y los personalizados compatibles con OpenAI conservan sus nombres de implementación/modelo configurados.

La misma configuración está expuesta para ejecuciones de CLI sin interfaz gráfica:

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

Use las mismas marcas `--output-format` y `--background` con `openclaw infer image edit` cuando comience desde un archivo de entrada. `--openai-background` sigue disponible como un alias específico de OpenAI.

Para las instalaciones de OAuth de Codex, mantenga la misma referencia de `openai/gpt-image-2`. Cuando se configura un perfil de OAuth `openai-codex`, OpenClaw resuelve ese token de acceso OAuth almacenado y envía solicitudes de imágenes a través del backend de Respuestas de Codex. No intenta primero `OPENAI_API_KEY` ni recurre silenciosamente a una clave API para esa solicitud. Configure `models.providers.openai` explícitamente con una clave API, URL base personalizada o punto final de Azure cuando desee la ruta directa de la API de Imágenes de OpenAI en su lugar.
Si ese punto final de imagen personalizado está en una dirección LAN/privada de confianza, también configure `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`; OpenClaw mantiene bloqueados los puntos finales de imagen compatibles con OpenAI privados/internos a menos que esta opción de participación esté presente.

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

| Capacidad              | Valor                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Modelo predeterminado  | `openai/sora-2`                                                                                 |
| Modos                  | Texto a video, imagen a video, edición de video único                                           |
| Entradas de referencia | 1 imagen o 1 video                                                                              |
| anulaciones de tamaño  | Soportado                                                                                       |
| Otras anulaciones      | `aspectRatio`, `resolution`, `audio`, `watermark` se ignoran con una advertencia de herramienta |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>Consulte [Generación de video](/es/tools/video-generation) para conocer los parámetros compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.</Note>

## Contribución del prompt GPT-5

OpenClaw añade una contribución de prompt compartida de GPT-5 para ejecuciones de la familia GPT-5 en todos los proveedores. Se aplica por ID de modelo, por lo que `openai/gpt-5.5`, referencias heredadas previas a la reparación como `openai-codex/gpt-5.5`, `openrouter/openai/gpt-5.5`, `opencode/gpt-5.5` y otras referencias compatibles de GPT-5 reciben la misma superposición. Los modelos más antiguos de GPT-4.x no.

El arnés nativo de Codex incluido utiliza el mismo comportamiento y superposición de latido de GPT-5 a través de las instrucciones para desarrolladores del servidor de aplicaciones de Codex, por lo que las sesiones de `openai/gpt-5.x` enrutadas a través de Codex mantienen la misma orientación de seguimiento y latido proactivo, aunque Codex sea el propietario del resto del prompt del arnés.

La contribución GPT-5 añade un contrato de comportamiento etiquetado para la persistencia de la personalidad, la seguridad de ejecución, la disciplina de herramientas, la forma de salida, las comprobaciones de finalización y la verificación. El comportamiento de respuesta específico del canal y de mensajes silenciosos permanece en el prompt del sistema OpenClaw compartido y la política de entrega saliente. La guía GPT-5 siempre está habilitada para los modelos coincidentes. La capa de estilo de interacción amigable es independiente y configurable.

| Valor                         | Efecto                                              |
| ----------------------------- | --------------------------------------------------- |
| `"friendly"` (predeterminado) | Habilitar la capa de estilo de interacción amigable |
| `"on"`                        | Alias para `"friendly"`                             |
| `"off"`                       | Deshabilitar solo la capa de estilo amigable        |

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

<Tip>Los valores no distinguen entre mayúsculas y minúsculas en tiempo de ejecución, por lo que `"Off"` y `"off"` desactivan la capa de estilo amigable.</Tip>

<Note>El `plugins.entries.openai.config.personality` heredado todavía se lee como alternativa de compatibilidad cuando no se establece la configuración compartida `agents.defaults.promptOverlays.gpt5.personality`.</Note>

## Voz y habla

<AccordionGroup>
  <Accordion title="Síntesis de voz (TTS)">
    El complemento incluido `openai` registra la síntesis de voz para la superficie `messages.tts`.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | Voz | `messages.tts.providers.openai.voice` | `coral` |
    | Velocidad | `messages.tts.providers.openai.speed` | (sin establecer) |
    | Instrucciones | `messages.tts.providers.openai.instructions` | (sin establecer, solo `gpt-4o-mini-tts`) |
    | Formato | `messages.tts.providers.openai.responseFormat` | `opus` para notas de voz, `mp3` para archivos |
    | Clave de API | `messages.tts.providers.openai.apiKey` | Recurre a `OPENAI_API_KEY` |
    | URL base | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | Cuerpo adicional | `messages.tts.providers.openai.extraBody` / `extra_body` | (sin establecer) |

    Modelos disponibles: `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`. Voces disponibles: `alloy`, `ash`, `ballad`, `cedar`, `coral`, `echo`, `fable`, `juniper`, `marin`, `onyx`, `nova`, `sage`, `shimmer`, `verse`.

    `extraBody` se fusiona en el JSON de solicitud `/audio/speech` después de los campos generados por OpenClaw, así que úselo para puntos de conexión compatibles con OpenAI que requieren claves adicionales como `lang`. Se ignoran las claves de prototipo.

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", voice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    Establezca `OPENAI_TTS_BASE_URL` para anular la URL base de TTS sin afectar el punto de conexión de la API de chat. El TTS de OpenAI todavía se configura a través de una clave de API; para una respuesta conversacional en vivo solo con OAuth, utilice la ruta de voz en tiempo real en lugar del modo agente STT -> TTS de voz.
    </Note>

  </Accordion>

  <Accordion title="Conversión de voz a texto">
    El complemento `openai` incluido registra la conversión de voz a texto por lotes a través de
    la superficie de transcripción de comprensión de medios de OpenClaw.

    - Modelo predeterminado: `gpt-4o-transcribe`
    - Endpoint: OpenAI REST `/v1/audio/transcriptions`
    - Ruta de entrada: carga de archivo de audio multiparte
    - Compatible con OpenClaw donde la transcripción de audio entrante utiliza
      `tools.media.audio`, incluyendo segmentos de canales de voz de Discord y archivos adjuntos
      de audio de canal

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
    El complemento `openai` incluido registra la transcripción en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Idioma | `...openai.language` | (sin establecer) |
    | Prompt | `...openai.prompt` | (sin establecer) |
    | Duración del silencio | `...openai.silenceDurationMs` | `800` |
    | Umbral VAD | `...openai.vadThreshold` | `0.5` |
    | Autenticación | `...openai.apiKey`, `OPENAI_API_KEY`, o `openai-codex` OAuth | Las claves de API se conectan directamente; OAuth genera un secreto de cliente de transcripción en tiempo real |

    <Note>
    Utiliza una conexión WebSocket a `wss://api.openai.com/v1/realtime` con audio G.711 u-law (`g711_ulaw` / `audio/pcmu`). Cuando solo se configura `openai-codex` OAuth, el Gateway genera un secreto de cliente de transcripción en tiempo real efímero antes de abrir el WebSocket. Este proveedor de streaming es para la ruta de transcripción en tiempo real de Voice Call; la voz de Discord actualmente graba segmentos cortos y utiliza la ruta de transcripción por lotes `tools.media.audio` en su lugar.
    </Note>

  </Accordion>

  <Accordion title="Voz en tiempo real">
    El complemento incluido `openai` registra la voz en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | Voz | `...openai.voice` | `alloy` |
    | Temperatura (puente de implementación de Azure) | `...openai.temperature` | `0.8` |
    | Umbral VAD | `...openai.vadThreshold` | `0.5` |
    | Duración del silencio | `...openai.silenceDurationMs` | `500` |
    | Relleno de prefijo | `...openai.prefixPaddingMs` | `300` |
    | Esfuerzo de razonamiento | `...openai.reasoningEffort` | (sin establecer) |
    | Autenticación | `...openai.apiKey`, `OPENAI_API_KEY`, o `openai-codex` OAuth | Browser Talk y los puentes de backend que no sean de Azure pueden usar Codex OAuth |

    Voces en tiempo real integradas disponibles para `gpt-realtime-2`: `alloy`, `ash`,
    `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`.
    OpenAI recomienda `marin` y `cedar` para la mejor calidad en tiempo real. Esto
    es un conjunto separado de las voces de texto a voz anteriores; no asuma que una voz
    TTS como `fable`, `nova`, o `onyx` es válida para sesiones en tiempo real.

    <Note>
    Los puentes en tiempo real de backend de OpenAI utilizan la forma de sesión WebSocket Realtime GA, la cual no acepta `session.temperature`. Las implementaciones de Azure OpenAI siguen disponibles a través de `azureEndpoint` y `azureDeployment` y mantienen la forma de sesión compatible con la implementación. Soporta llamadas a herramientas bidireccionales y audio G.711 u-law.
    </Note>

    <Note>
    La voz en tiempo real se selecciona cuando se crea la sesión. OpenAI permite que la mayoría
    de los campos de sesión cambien más tarde, pero la voz no se puede cambiar después de que
    el modelo haya emitido audio en esa sesión. OpenClaw actualmente expone los
    ids de voz en tiempo real integrados como cadenas de texto.
    </Note>

    <Note>
    Control UI Talk utiliza sesiones en tiempo real del navegador de OpenAI con un secreto de cliente efímero
    emitido por Gateway y un intercambio directo SDP WebRTC del navegador contra la
    API Realtime de OpenAI. Cuando no se configura ninguna clave de API de OpenAI directa,
    Gateway puede emitir ese secreto de cliente con el perfil OAuth `openai-codex` seleccionado.
    El relevo de Gateway y los puentes WebSocket en tiempo real del backend de Voice Call utilizan
    el mismo respaldo OAuth para los endpoints nativos de OpenAI. La verificación en vivo
    del mantenedor está disponible con
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`;
    los legs de OpenAI verifican tanto el puente WebSocket del backend como el intercambio
    SDP WebRTC del navegador sin registrar secretos.
    </Note>

  </Accordion>
</AccordionGroup>

## Puntos de conexión de Azure OpenAI

El proveedor incluido `openai` puede apuntar a un recurso de Azure OpenAI para la generación de imágenes anulando la URL base. En la ruta de generación de imágenes, OpenClaw detecta nombres de host de Azure en `models.providers.openai.baseUrl` y cambia automáticamente al formato de solicitud de Azure.

<Note>La voz en tiempo real utiliza una ruta de configuración separada (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) y no se ve afectada por `models.providers.openai.baseUrl`. Consulte el acordeón **Realtime voice** en [Voice and speech](#voice-and-speech) para ver su configuración de Azure.</Note>

Use Azure OpenAI cuando:

- Ya tenga una suscripción, cuota o contrato empresarial de Azure OpenAI
- Necesite controles de residencia de datos regionales o cumplimiento que Azure proporciona
- Quiera mantener el tráfico dentro de un inquilino de Azure existente

### Configuración

Para la generación de imágenes de Azure a través del proveedor incluido `openai`, apunte
`models.providers.openai.baseUrl` a su recurso de Azure y establezca `apiKey` en
la clave de Azure OpenAI (no una clave de OpenAI Platform):

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

OpenClaw reconoce estos sufijos de host de Azure para la ruta de generación de imágenes de Azure:

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

Para las solicitudes de generación de imágenes en un host de Azure reconocido, OpenClaw:

- Envía el encabezado `api-key` en lugar de `Authorization: Bearer`
- Usa rutas con ámbito de implementación (`/openai/deployments/{deployment}/...`)
- Agrega `?api-version=...` a cada solicitud
- Utiliza un tiempo de espera de solicitud predeterminado de 600 s para las llamadas de generación de imágenes de Azure.
  Los valores de `timeoutMs` por llamada siguen anulando este valor predeterminado.

Otras URL base (OpenAI pública, proxies compatibles con OpenAI) mantienen la forma de solicitud de imagen estándar de OpenAI.

<Note>El enrutamiento de Azure para la ruta de generación de imágenes del proveedor `openai` requiere OpenClaw 2026.4.22 o posterior. Las versiones anteriores tratan cualquier `openai.baseUrl` personalizado como el punto de conexión público de OpenAI y fallarán con las implementaciones de imágenes de Azure.</Note>

### Versión de la API

Establezca `AZURE_OPENAI_API_VERSION` para fijar una versión específica de vista previa o GA de Azure
para la ruta de generación de imágenes de Azure:

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

El valor predeterminado es `2024-12-01-preview` cuando la variable no está establecida.

### Los nombres de los modelos son los nombres de las implementaciones

Azure OpenAI vincula los modelos a las implementaciones. Para las solicitudes de generación de imágenes de Azure
enrutadas a través del proveedor incluido `openai`, el campo `model` en OpenClaw
debe ser el **nombre de la implementación de Azure** que configuró en Azure Portal, no
el ID del modelo público de OpenAI.

Si crea una implementación llamada `gpt-image-2-prod` que sirve `gpt-image-2`:

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

Se aplica la misma regla de nombre de implementación a las llamadas de generación de imágenes
enrutadas a través del proveedor integrado `openai`.

### Disponibilidad regional

La generación de imágenes de Azure está disponible actualmente solo en un subconjunto de regiones
(por ejemplo, `eastus2`, `swedencentral`, `polandcentral`, `westus3`,
`uaenorth`). Consulte la lista de regiones actual de Microsoft antes de crear una
implementación y confirme que el modelo específico se ofrece en su región.

### Diferencias de parámetros

Azure OpenAI y la OpenAI pública no siempre aceptan los mismos parámetros de imagen.
Azure puede rechazar opciones que la OpenAI pública permite (por ejemplo, ciertos
valores de `background` en `gpt-image-2`) o exponerlos solo en versiones específicas del
modelo. Estas diferencias provienen de Azure y del modelo subyacente, no de
OpenClaw. Si una solicitud de Azure falla con un error de validación, verifique
el conjunto de parámetros admitido por su implementación y versión de API específicas en el
portal de Azure.

<Note>
Azure OpenAI utiliza el transporte nativo y el comportamiento de compatibilidad, pero no recibe
los encabezados de atribución ocultos de OpenClaw; consulte el acordeón **Rutas nativas frente a compatibles con OpenAI**
 en [Configuración avanzada](#advanced-configuration).

Para el tráfico de chat o Responses en Azure (más allá de la generación de imágenes), use el
flujo de incorporación o una configuración de proveedor dedicada de Azure; `openai.baseUrl` por sí solo
no detecta la forma de API/autenticación de Azure. Existe un proveedor
separado `azure-openai-responses/*`; consulte
el acordeón Compactación del lado del servidor a continuación.

</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Transporte (WebSocket vs SSE)">
    OpenClaw usa WebSocket con preferencia y SSE como alternativa (`"auto"`) para `openai/*`.

    En modo `"auto"`, OpenClaw:
    - Reintenta un fallo temprano de WebSocket antes de recurrir a SSE
    - Tras un fallo, marca WebSocket como degradado durante ~60 segundos y usa SSE durante el enfriamiento
    - Adjunta cabeceras de identidad de sesión y turno estables para reintentos y reconexiones
    - Normaliza los contadores de uso (`input_tokens` / `prompt_tokens`) en todas las variantes de transporte

    | Valor | Comportamiento |
    |-------|----------|
    | `"auto"` (predeterminado) | WebSocket primero, SSE como alternativa |
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

    - **Chat/UI:** `/fast status|on|off`
    - **Configuración:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    Cuando está activado, OpenClaw asigna el modo rápido al procesamiento prioritario de OpenAI (`service_tier = "priority"`). Los valores existentes de `service_tier` se conservan, y el modo rápido no reescribe `reasoning` o `text.verbosity`.

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
    Las anulaciones de sesión tienen prioridad sobre la configuración. Borrar la anulación de sesión en la UI de Sesiones devuelve la sesión al valor predeterminado configurado.
    </Note>

  </Accordion>

  <Accordion title="Procesamiento con prioridad (service_tier)">
    La API de OpenAI expone el procesamiento con prioridad a través de `service_tier`. Establézcalo por modelo en OpenClaw:

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
    `serviceTier` solo se reenvía a los puntos de conexión nativos de OpenAI (`api.openai.com`) y a los puntos de conexión nativos de Codex (`chatgpt.com/backend-api`). Si enruta cualquiera de los proveedores a través de un proxy, OpenClaw deja `service_tier` sin modificar.
    </Warning>

  </Accordion>

  <Accordion title="Compactación del lado del servidor (API de Responses)">
    Para modelos directos de OpenAI Responses (`openai/*` en `api.openai.com`), el contenedor de flujo Pi-harness del complemento OpenAI habilita automáticamente la compactación del lado del servidor:

    - Fuerza `store: true` (a menos que la compatibilidad del modelo establezca `supportsStore: false`)
    - Inyecta `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` predeterminado: 70% de `contextWindow` (o `80000` cuando no esté disponible)

    Esto se aplica a la ruta integrada de Pi harness y a los enlaces del proveedor OpenAI utilizados por ejecuciones integradas. El harness nativo del servidor de aplicaciones Codex gestiona su propio contexto a través de Codex y se configura mediante la ruta del agente predeterminado de OpenAI o la política de tiempo de ejecución del proveedor/modelo.

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
    `responsesServerCompaction` solo controla la inyección de `context_management`. Los modelos directos de OpenAI Responses aún fuerzan `store: true` a menos que la compatibilidad establezca `supportsStore: false`.
    </Note>

  </Accordion>

  <Accordion title="Modo GPT de agente estricto">
    Para ejecuciones de la familia GPT-5 en `openai/*`, OpenClaw puede utilizar un contrato de ejecución integrada más estricto:

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    Con `strict-agentic`, OpenClaw:
    - Ya no trata un turno de solo planificación como un progreso exitoso cuando hay una acción de herramienta disponible
    - Reintenta el turno con una dirección de actuar ahora
    - Habilita automáticamente `update_plan` para trabajo sustancial
    - Muestra un estado bloqueado explícito si el modelo sigue planeando sin actuar

    <Note>
    Limitado solo a ejecuciones de la familia GPT-5 de OpenAI y Codex. Otros proveedores y familias de modelos más antiguas mantienen el comportamiento predeterminado.
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw trata los puntos finales de OpenAI, Codex y Azure OpenAI de manera diferente a los proxies compatibles con OpenAI genéricos `/v1`:

    **Rutas nativas** (`openai/*`, Azure OpenAI):
    - Mantiene `reasoning: { effort: "none" }` solo para modelos que soportan el esfuerzo de OpenAI `none`
    - Omite el razonamiento deshabilitado para modelos o proxies que rechazan `reasoning.effort: "none"`
    - Predetermina los esquemas de herramientas al modo estricto
    - Adjunta encabezados de atribución ocultos solo en hosts nativos verificados
    - Mantiene el modelado de solicitudes exclusivo de OpenAI (`service_tier`, `store`, reasoning-compat, prompt-cache hints)

    **Rutas de proxy/compatibles:**
    - Utiliza un comportamiento de compatibilidad más laxo
    - Elimina los `store` de Completions de las cargas útiles `openai-completions` no nativas
    - Acepta JSON de paso avanzado `params.extra_body`/`params.extraBody` para proxies de Completions compatibles con OpenAI
    - Acepta `params.chat_template_kwargs` para proxies de Completions compatibles con OpenAI como vLLM
    - No fuerza esquemas de herramientas estrictos ni encabezados solo nativos

    Azure OpenAI utiliza transporte nativo y comportamiento de compatibilidad, pero no recibe los encabezados de atribución ocultos.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Selección de modelo" href="/es/concepts/model-providers" icon="layers">
    Elección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Generación de imágenes" href="/es/tools/image-generation" icon="image">
    Parámetros compartidos de la herramienta de imágenes y selección de proveedor.
  </Card>
  <Card title="Generación de videos" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección de proveedor.
  </Card>
  <Card title="OAuth y autenticación" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
