---
summary: "Usar OpenAI mediante claves de API o suscripción Codex en OpenClaw"
read_when:
  - You want to use OpenAI models in OpenClaw
  - You want Codex subscription auth instead of API keys
  - You need stricter GPT-5 agent execution behavior
title: "OpenAI"
---

OpenAI proporciona API de desarrollador para modelos GPT, y Codex también está disponible como agente de codificación con plan ChatGPT a través de los clientes de Codex de OpenAI. OpenClaw mantiene esas superficies separadas para que la configuración sea predecible.

OpenClaw utiliza `openai/*` como la ruta canónica del modelo de OpenAI. El agente integrado
activa los modelos de OpenAI que se ejecutan a través del runtime nativo del servidor de aplicaciones de Codex de forma predeterminada; la autenticación directa con clave de API de OpenAI sigue disponible para superficies de OpenAI no agenticadas como imágenes, incrustaciones, voz y tiempo real.

- **Modelos de agente** - modelos `openai/*` a través del runtime de Codex; inicie sesión con
  autenticación `openai-codex` para el uso de suscripción ChatGPT/Codex, o configure un
  perfil de clave de API `openai-codex` cuando desee intencionalmente la autenticación con clave de API.
- **APIs de OpenAI no agenticadas** - acceso directo a la plataforma OpenAI con facturación
  basada en uso a través de `OPENAI_API_KEY` o incorporación de clave de API de OpenAI.
- **Configuración heredada** - las referencias de modelo `openai-codex/*` se reparan mediante
  `openclaw doctor --fix` a `openai/*` además del runtime de Codex.

OpenAI admite explícitamente el uso de OAuth de suscripción en herramientas y flujos de trabajo externos como OpenClaw.

El proveedor, el modelo, el runtime y el canal son capas separadas. Si esas etiquetas se
están mezclando, lea [Runtimes de agente](/es/concepts/agent-runtimes) antes de
cambiar la configuración.

## Elección rápida

| Objetivo                                                            | Uso                                                           | Notas                                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Suscripción ChatGPT/Codex con runtime nativo de Codex               | `openai/gpt-5.5`                                              | Configuración predeterminada del agente OpenAI. Inicie sesión con autenticación `openai-codex`. |
| Facturación directa con clave de API para modelos de agente         | `openai/gpt-5.5` más un perfil de clave de API `openai-codex` | Use `auth.order.openai-codex` para preferir ese perfil.                                         |
| Facturación directa con clave de API a través de PI explícito       | `openai/gpt-5.5` más runtime de proveedor/modelo `pi`         | Seleccione un perfil de clave de API `openai` normal.                                           |
| Alias de la API Instant más reciente de ChatGPT                     | `openai/chat-latest`                                          | Solo clave de API directa. Alias móvil para experimentos, no el predeterminado.                 |
| Autenticación de suscripción ChatGPT/Codex a través de PI explícito | `openai/gpt-5.5` más runtime de proveedor/modelo `pi`         | Seleccione un perfil de autenticación `openai-codex` para la ruta de compatibilidad.            |
| Generación o edición de imágenes                                    | `openai/gpt-image-2`                                          | Funciona con `OPENAI_API_KEY` u OpenAI Codex OAuth.                                             |
| Imágenes con fondo transparente                                     | `openai/gpt-image-1.5`                                        | Use `outputFormat=png` o `webp` y `openai.background=transparent`.                              |

## Mapa de nombres

Los nombres son similares pero no intercambiables:

| Nombre que ves                            | Capa                            | Significado                                                                                                                                        |
| ----------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openai`                                  | Prefijo del proveedor           | Ruta canónica del modelo de OpenAI; los turnos del agente usan el tiempo de ejecución de Codex.                                                    |
| `openai-codex`                            | Prefijo de autenticación/perfil | Proveedor de perfil de autenticación de suscripción/OAuth de OpenAI Codex.                                                                         |
| plugin `codex`                            | Complemento                     | Complemento incluido en OpenClaw que proporciona el tiempo de ejecución nativo del servidor de aplicaciones de Codex y controles de chat `/codex`. |
| proveedor/modelo `agentRuntime.id: codex` | Tiempo de ejecución del agente  | Forzar el arnés nativo del servidor de aplicaciones de Codex para los turnos integrados coincidentes.                                              |
| `/codex ...`                              | Conjunto de comandos de chat    | Vincular/Controlar hilos del servidor de aplicaciones de Codex desde una conversación.                                                             |
| `runtime: "acp", agentId: "codex"`        | Ruta de sesión ACP              | Ruta de reserva explícita que ejecuta Codex a través de ACP/acpx.                                                                                  |

Esto significa que una configuración puede contener intencionalmente tanto referencias de modelos `openai/*` como
perfiles de autenticación `openai-codex`. `openclaw doctor --fix` reescribe las
referencias de modelos heredadas `openai-codex/*` a la ruta canónica del modelo de OpenAI.

<Note>
  GPT-5.5 está disponible tanto a través del acceso directo con clave de API de la plataforma OpenAI como a través de rutas de suscripción/OAuth. Para la suscripción a ChatGPT/Codex más la ejecución nativa de Codex, use `openai/gpt-5.5`; la configuración de tiempo de ejecución sin establecer ahora selecciona el arnés de Codex para los turnos del agente OpenAI. Use perfiles de clave de API de
  OpenAI solo cuando desee autenticación directa con clave de API para un modelo de agente OpenAI.
</Note>

<Note>
  Los turnos del modelo de agente de OpenAI requieren el complemento incluido Codex app-server. La configuración explícita del tiempo de ejecución de PI permanece disponible como una ruta de compatibilidad opcional. Cuando PI se selecciona explícitamente con un perfil de autenticación `openai-codex`, OpenClaw mantiene la referencia pública del modelo como `openai/*` y enruta PI internamente a
  través del transporte de autenticación Codex heredado. Ejecute `openclaw doctor --fix` para reparar referencias obsoletas de modelos `openai-codex/*` o pines de sesión PI antiguos que no provienen de configuración explícita del tiempo de ejecución.
</Note>

## Cobertura de funciones de OpenClaw

| Capacidad de OpenAI                   | Superficie de OpenClaw                                                                       | Estado                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Chat / Respuestas                     | proveedor de modelo `openai/<model>`                                                         | Sí                                                                        |
| Modelos de suscripción Codex          | `openai/<model>` con OAuth `openai-codex`                                                    | Sí                                                                        |
| Referencias de modelo Codex heredadas | `openai-codex/<model>`                                                                       | Reparado por doctor a `openai/<model>`                                    |
| Arnés de Codex app-server             | `openai/<model>` con tiempo de ejecución o proveedor/modelo `agentRuntime.id: codex` omitido | Sí                                                                        |
| Búsqueda web en el lado del servidor  | Herramienta nativa OpenAI Responses                                                          | Sí, cuando la búsqueda web está habilitada y ningún proveedor está fijado |
| Imágenes                              | `image_generate`                                                                             | Sí                                                                        |
| Videos                                | `video_generate`                                                                             | Sí                                                                        |
| Texto a voz                           | `messages.tts.provider: "openai"` / `tts`                                                    | Sí                                                                        |
| Voz a texto por lotes                 | `tools.media.audio` / comprensión de medios                                                  | Sí                                                                        |
| Voz a texto en streaming              | Llamada de voz `streaming.provider: "openai"`                                                | Sí                                                                        |
| Voz en tiempo real                    | Llamada de voz `realtime.provider: "openai"` / Hablar en la interfaz de control              | Sí                                                                        |
| Incrustaciones                        | proveedor de incrustación de memoria                                                         | Sí                                                                        |

## Incrustaciones de memoria

OpenClaw puede usar OpenAI, o un punto final de incrustación compatible con OpenAI, para
indexación `memory_search` e incrustaciones de consulta:

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

Para puntos de conexión compatibles con OpenAI que requieren etiquetas de incrustación asimétricas, establezca
`queryInputType` y `documentInputType` bajo `memorySearch`. OpenClaw reenvía
esos como campos de solicitud `input_type` específicos del proveedor: las incrustaciones de consultas usan
`queryInputType`; los fragmentos de memoria indexados y la indexación por lotes usan
`documentInputType`. Consulte la [referencia de configuración de memoria](/es/reference/memory-config#provider-specific-config) para el ejemplo completo.

## Comenzando

Elija su método de autenticación preferido y siga los pasos de configuración.

<Tabs>
  <Tab title="Clave de API (plataforma de OpenAI)">
    **Ideal para:** acceso directo a la API y facturación basada en el uso.

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

    ### Resumen de la ruta

    | Ref. de modelo        | Configuración de tiempo de ejecución | Ruta                        | Autenticación   |
    | --------------------- | ------------------------------------ | --------------------------- | --------------- |
    | `openai/gpt-5.5`      | omitido / proveedor/modelo `agentRuntime.id: "codex"` | arnés del servidor de aplicaciones de Codex | perfil `openai-codex` |
    | `openai/gpt-5.4-mini` | omitido / proveedor/modelo `agentRuntime.id: "codex"` | arnés del servidor de aplicaciones de Codex | perfil `openai-codex` |
    | `openai/gpt-5.5`      | proveedor/modelo `agentRuntime.id: "pi"`              | tiempo de ejecución integrado de PI      | perfil `openai` o perfil `openai-codex` seleccionado |

    <Note>
    Los modelos de agente `openai/*` usan el arnés del servidor de aplicaciones de Codex. Para usar la autenticación con clave de API
    para un modelo de agente, crea un perfil de clave de API `openai-codex` y ordénalo
    con `auth.order.openai-codex`; `OPENAI_API_KEY` sigue siendo la alternativa
    directa para superficies de API de OpenAI que no son de agente.
    </Note>

    ### Ejemplo de configuración

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    Para probar el modelo Instant actual de ChatGPT desde la API de OpenAI, establece el modelo
    en `openai/chat-latest`:

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest` es un alias dinámico. OpenAI lo documenta como el último modelo Instant
    utilizado en ChatGPT y recomienda `gpt-5.5` para el uso de API en producción, por lo que
    mantén `openai/gpt-5.5` como el predeterminado estable a menos que quieras explícitamente ese
    comportamiento de alias. Actualmente, el alias solo acepta `medium` de verbosidad de texto, por lo que
    OpenClaw normaliza las anulaciones de verbosidad de texto de OpenAI incompatibles para este
    modelo.

    <Warning>
    OpenClaw **no** expone `openai/gpt-5.3-codex-spark`. Las solicitudes en vivo a la API de OpenAI rechazan ese modelo, y el catálogo actual de Codex tampoco lo expone.
    </Warning>

  </Tab>

  <Tab title="Suscripción Codex">
    **Mejor para:** usar tu suscripción a ChatGPT/Codex con la ejecución nativa del servidor de aplicaciones (app-server) de Codex en lugar de una clave de API por separado. La nube de Codex requiere iniciar sesión en ChatGPT.

    <Steps>
      <Step title="Ejecutar Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        O ejecuta OAuth directamente:

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        Para configuraciones sin interfaz gráfica (headless) o hostiles a las devoluciones de llamada, añade `--device-code` para iniciar sesión con un flujo de código de dispositivo de ChatGPT en lugar de la devolución de llamada del navegador localhost:

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="Usar la ruta canónica del modelo OpenAI">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        No se requiere configuración de tiempo de ejecución para la ruta predeterminada. Los turnos del agente OpenAI
        seleccionan automáticamente el tiempo de ejecución nativo del servidor de aplicaciones Codex, y OpenClaw
        instala o repara el complemento Codex incluido cuando se elige esta ruta.
      </Step>
      <Step title="Verificar que la autenticación Codex esté disponible">
        ```bash
        openclaw models list --provider openai-codex
        ```

        Después de que la puerta de enlace se esté ejecutando, envía `/codex status` o `/codex models`
        en el chat para verificar el tiempo de ejecución del servidor de aplicaciones nativo.
      </Step>
    </Steps>

    ### Resumen de rutas

    | Ref. de modelo | Config. de tiempo de ejecución | Ruta | Autenticación |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | omitido / provider/model `agentRuntime.id: "codex"` | Arnés nativo del servidor de aplicaciones Codex | Inicio de sesión Codex o perfil `openai-codex` seleccionado |
    | `openai/gpt-5.5` | provider/model `agentRuntime.id: "pi"` | Tiempo de ejecución incrustado PI con transporte de autenticación Codex interno | Perfil `openai-codex` seleccionado |
    | `openai-codex/gpt-5.5` | reparado por doctor | Ruta heredada reescrita a `openai/gpt-5.5` | Perfil `openai-codex` existente |

    <Warning>
    No configure referencias de modelo antiguas como `openai-codex/gpt-5.1*`, `openai-codex/gpt-5.2*` o
    `openai-codex/gpt-5.3*`. Las cuentas OAuth de ChatGPT/Codex ahora rechazan
    esos modelos. Use `openai/gpt-5.5`; los turnos del agente OpenAI ahora seleccionan el tiempo de ejecución
    Codex de manera predeterminada.
    </Warning>

    <Note>
    Siga usando el id del proveedor `openai-codex` para comandos de autenticación/perfil. El
    prefijo de modelo `openai-codex/*` es una configuración heredada reparada por doctor. Para la
    configuración común de suscripción más tiempo de ejecución nativo, inicie sesión con `openai-codex`
    pero mantenga la referencia del modelo como `openai/gpt-5.5`.
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

    <Note>
    La integración ya no importa material OAuth de `~/.codex`. Inicie sesión con OAuth del navegador (predeterminado) o el flujo de código de dispositivo anterior — OpenClaw administra las credenciales resultantes en su propio almacén de autenticación de agentes.
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

    Si una configuración antigua todavía tiene `openai-codex/gpt-*` o una fijación de sesión de OpenAI PI
    obsoleta sin una configuración de tiempo de ejecución explícita, repárela:

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

    `openai-codex` sigue siendo el id del proveedor de autenticación/perfil. `openai/*` es la
    ruta del modelo para los turnos del agente OpenAI a través de Codex.

    ### Indicador de estado

    El chat `/status` muestra qué tiempo de ejecución del modelo está activo para la sesión actual.
    El arnés del servidor de aplicaciones Codex incluido aparece como `Runtime: OpenAI Codex` para
    los turnos del modelo del agente OpenAI. Las fijaciones de sesión PI obsoletas se reparan a Codex a menos que
    la configuración fije explícitamente PI.

    ### Advertencia del doctor

    Si las rutas `openai-codex/*` o las fijaciones de sesión PI de OpenAI obsoletas permanecen en la configuración o
    en el estado de la sesión, `openclaw doctor --fix` las reescribe a `openai/*` con el
    tiempo de ejecución Codex a menos que PI esté configurado explícitamente.

    ### Límite de la ventana de contexto

    OpenClaw trata los metadatos del modelo y el límite de contexto del tiempo de ejecución como valores separados.

    Para `openai/gpt-5.5` a través del catálogo OAuth de Codex:

    - `contextWindow` nativo: `1000000`
    - Límite `contextTokens` del tiempo de ejecución predeterminado: `272000`

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
    Use `contextWindow` para declarar los metadatos del modelo nativo. Use `contextTokens` para limitar el presupuesto del contexto del tiempo de ejecución.
    </Note>

    ### Recuperación del catálogo

    OpenClaw usa los metadatos del catálogo Codex upstream para `gpt-5.5` cuando está
    presente. Si el descubrimiento en vivo de Codex omite la fila `gpt-5.5` mientras
    la cuenta está autenticada, OpenClaw sintetiza esa fila del modelo OAuth para que
    las ejecuciones de cron, sub-agente y modelo predeterminado configurado no fallen con
    `Unknown model`.

  </Tab>
</Tabs>

## Autenticación nativa del servidor de aplicaciones Codex

El arnés nativo del servidor de aplicaciones Codex utiliza referencias de modelos `openai/*` más configuración de tiempo de ejecución omitida o proveedor/modelo `agentRuntime.id: "codex"`, pero su autenticación sigue siendo basada en la cuenta. OpenClaw selecciona la autenticación en este orden:

1. Un perfil de autenticación `openai-codex` explícito de OpenClaw vinculado al agente.
2. La cuenta existente del servidor de aplicaciones, como un inicio de sesión local de Codex CLI ChatGPT.
3. Solo para lanzamientos locales del servidor de aplicaciones stdio, `CODEX_API_KEY`, luego
   `OPENAI_API_KEY`, cuando el servidor de aplicaciones reporta ninguna cuenta y aún requiere
   autenticación de OpenAI.

Eso significa que un inicio de sesión de suscripción local ChatGPT/Codex no se reemplaza solo porque el proceso de puerta de enlace también tenga `OPENAI_API_KEY` para modelos directos de OpenAI o incrustaciones. La alternativa de clave de API de entorno es solo la ruta local stdio sin cuenta; no se envía a conexiones del servidor de aplicaciones WebSocket. Cuando se selecciona un perfil Codex de tipo suscripción, OpenClaw también mantiene `CODEX_API_KEY` y `OPENAI_API_KEY` fuera del proceso secundario del servidor de aplicaciones stdio generado y envía las credenciales seleccionadas a través del RPC de inicio de sesión del servidor de aplicaciones.

## Generación de imágenes

El complemento `openai` incluido registra la generación de imágenes a través de la herramienta `image_generate`.
Admite tanto la generación de imágenes con clave de API de OpenAI como la generación de imágenes OAuth de Codex a través de la misma referencia de modelo `openai/gpt-image-2`.

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

<Note>Consulte [Generación de imágenes](/es/tools/image-generation) para ver los parámetros compartidos de la herramienta, la selección del proveedor y el comportamiento de conmutación por error.</Note>

`gpt-image-2` es el valor predeterminado tanto para la generación de texto a imagen de OpenAI como para la edición de imágenes. `gpt-image-1.5`, `gpt-image-1` y `gpt-image-1-mini` siguen siendo utilizables como anulaciones explícitas del modelo. Use `openai/gpt-image-1.5` para una salida PNG/WebP con fondo transparente; la API actual de `gpt-image-2` rechaza `background: "transparent"`.

Para una solicitud con fondo transparente, los agentes deben llamar a `image_generate` con `model: "openai/gpt-image-1.5"`, `outputFormat: "png"` o `"webp"`, y `background: "transparent"`; la opción del proveedor más antigua `openai.background` todavía se acepta. OpenClaw también protege las rutas OAuth públicas de OpenAI y OpenAI Codex reescribiendo las solicitudes transparentes predeterminadas de `openai/gpt-image-2` a `gpt-image-1.5`; los puntos finales de Azure y los personalizados compatibles con OpenAI mantienen sus nombres de implementación/modelo configurados.

La misma configuración está expuesta para ejecuciones de CLI sin interfaz gráfica:

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "A simple red circle sticker on a transparent background" \
  --json
```

Use las mismas marcas `--output-format` y `--background` con `openclaw infer image edit` al iniciar desde un archivo de entrada. `--openai-background` permanece disponible como un alias específico de OpenAI.

Para las instalaciones de Codex OAuth, mantenga la misma referencia `openai/gpt-image-2`. Cuando se configura un perfil OAuth `openai-codex`, OpenClaw resuelve ese token de acceso OAuth almacenado y envía solicitudes de imágenes a través del backend de Respuestas de Codex. No intenta primero `OPENAI_API_KEY` ni recurre silenciosamente a una clave API para esa solicitud. Configure `models.providers.openai` explícitamente con una clave API, URL base personalizada o punto final de Azure cuando desee la ruta directa de la API de Imágenes de OpenAI en su lugar. Si ese punto final de imagen personalizado está en una dirección LAN/privada de confianza, también establezca `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`; OpenClaw mantiene los puntos finales de imagen compatibles con OpenAI privados/internos bloqueados a menos que esta opción de participación esté presente.

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

El complemento incluido `openai` registra la generación de video a través de la herramienta `video_generate`.

| Capacidad              | Valor                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Modelo predeterminado  | `openai/sora-2`                                                                                    |
| Modos                  | Texto a video, imagen a video, edición de video único                                              |
| Entradas de referencia | 1 imagen o 1 video                                                                                 |
| anulaciones de tamaño  | Soportado                                                                                          |
| Otras anulaciones      | `aspectRatio`, `resolution`, `audio`, `watermark` se ignoran con una advertencia de la herramienta |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>Consulte [Generación de video](/es/tools/video-generation) para conocer los parámetros de herramientas compartidas, la selección de proveedores y el comportamiento de conmutación por error.</Note>

## Contribución del prompt GPT-5

OpenClaw añade una contribución de prompt GPT-5 compartida para ejecuciones de la familia GPT-5 en todos los proveedores. Se aplica por identificador de modelo, por lo que `openai/gpt-5.5`, referencias heredadas previas a la reparación como `openai-codex/gpt-5.5`, `openrouter/openai/gpt-5.5`, `opencode/gpt-5.5` y otras referencias compatibles con GPT-5 reciben la misma superposición. Los modelos más antiguos de GPT-4.x no la reciben.

El arnés nativo de Codex incluido utiliza el mismo comportamiento GPT-5 y la superposición de latidos a través de las instrucciones del desarrollador del servidor de aplicaciones Codex, por lo que las sesiones `openai/gpt-5.x` enrutadas a través de Codex mantienen la misma guía de seguimiento y latidos proactivos, aunque Codex posee el resto del prompt del arnés.

La contribución GPT-5 añade un contrato de comportamiento etiquetado para la persistencia de la personalidad, la seguridad de ejecución, la disciplina de herramientas, la forma de salida, las comprobaciones de finalización y la verificación. El comportamiento de respuesta específico del canal y de mensajes silenciosos permanece en el prompt del sistema OpenClaw compartido y la política de entrega saliente. La guía GPT-5 siempre está habilitada para los modelos coincidentes. La capa de estilo de interacción amigable es independiente y configurable.

| Valor                         | Efecto                                              |
| ----------------------------- | --------------------------------------------------- |
| `"friendly"` (predeterminado) | Habilitar la capa de estilo de interacción amigable |
| `"on"`                        | Alias para `"friendly"`                             |
| `"off"`                       | Deshabilitar solo la capa de estilo amigable        |

<Tabs>
  <Tab title="Configuración">
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

<Tip>Los valores no distinguen entre mayúsculas y minúsculas en tiempo de ejecución, por lo que tanto `"Off"` como `"off"` desactivan la capa de estilo amigable.</Tip>

<Note>El `plugins.entries.openai.config.personality` heredado aún se lee como una alternativa de compatibilidad cuando no se establece la configuración compartida `agents.defaults.promptOverlays.gpt5.personality`.</Note>

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
    | Clave API | `messages.tts.providers.openai.apiKey` | Recurre a `OPENAI_API_KEY` |
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
    Establezca `OPENAI_TTS_BASE_URL` para anular la URL base de TTS sin afectar el punto final de la API de chat. OpenAI TTS todavía se configura a través de una clave API; para una conversación en vivo solo con OAuth, use la ruta de voz en tiempo real en lugar del habla modo agente STT -> TTS.
    </Note>

  </Accordion>

  <Accordion title="Speech-to-text">
    El complemento incluido `openai` registra la conversión de voz a texto por lotes a través de
    la superficie de transcripción de comprensión de medios de OpenClaw.

    - Modelo predeterminado: `gpt-4o-transcribe`
    - Endpoint: OpenAI REST `/v1/audio/transcriptions`
    - Ruta de entrada: carga de archivo de audio multiparte
    - Compatible con OpenClaw donde sea que la transcripción de audio entrante use
      `tools.media.audio`, incluyendo segmentos de canales de voz de Discord y archivos de
      audio de canales

    Para forzar OpenAI para la transcripción de audio entrante:

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

    Las sugerencias de idioma y prompt se reenvían a OpenAI cuando son suministradas por la
    configuración de medios de audio compartida o por solicitud de transcripción por llamada.

  </Accordion>

  <Accordion title="Realtime transcription">
    El complemento incluido `openai` registra la transcripción en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Idioma | `...openai.language` | (sin establecer) |
    | Prompt | `...openai.prompt` | (sin establecer) |
    | Duración del silencio | `...openai.silenceDurationMs` | `800` |
    | Umbral VAD | `...openai.vadThreshold` | `0.5` |
    | Auth | `...openai.apiKey`, `OPENAI_API_KEY`, o `openai-codex` OAuth | Las claves API se conectan directamente; OAuth genera un secreto de cliente de transcripción en tiempo real |

    <Note>
    Usa una conexión WebSocket a `wss://api.openai.com/v1/realtime` con audio G.711 u-law (`g711_ulaw` / `audio/pcmu`). Cuando solo se configura `openai-codex` OAuth, el Gateway genera un secreto de cliente de transcripción en tiempo real efímero antes de abrir el WebSocket. Este proveedor de streaming es para la ruta de transcripción en tiempo real de Voice Call; la voz de Discord actualmente graba segmentos cortos y usa la ruta de transcripción por lotes `tools.media.audio` en su lugar.
    </Note>

  </Accordion>

  <Accordion title="Voz en tiempo real">
    El complemento incluido `openai` registra la voz en tiempo real para el complemento Voice Call.

    | Configuración | Ruta de configuración | Predeterminado |
    |---------|------------|---------|
    | Modelo | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | Voz | `...openai.voice` | `alloy` |
    | Temperatura (puente de despliegue de Azure) | `...openai.temperature` | `0.8` |
    | Umbral de VAD | `...openai.vadThreshold` | `0.5` |
    | Duración del silencio | `...openai.silenceDurationMs` | `500` |
    | Relleno de prefijo | `...openai.prefixPaddingMs` | `300` |
    | Esfuerzo de razonamiento | `...openai.reasoningEffort` | (sin establecer) |
    | Autenticación | `...openai.apiKey`, `OPENAI_API_KEY`, o `openai-codex` OAuth | Browser Talk y los puentes de backend que no son de Azure pueden usar Codex OAuth |

    Voces en tiempo real integradas disponibles para `gpt-realtime-2`: `alloy`, `ash`,
    `ballad`, `coral`, `echo`, `sage`, `shimmer`, `verse`, `marin`, `cedar`.
    OpenAI recomienda `marin` y `cedar` para la mejor calidad en tiempo real. Esto
    es un conjunto separado de las voces de texto a voz anteriores; no asuma que una voz de TTS
    como `fable`, `nova`, o `onyx` es válida para sesiones en tiempo real.

    <Note>
    Los puentes en tiempo real de backend de OpenAI utilizan la forma de sesión WebSocket de GA Realtime, que no acepta `session.temperature`. Los despliegues de Azure OpenAI siguen disponibles a través de `azureEndpoint` y `azureDeployment` y mantienen la forma de sesión compatible con el despliegue. Soporta llamadas a herramientas bidireccionales y audio G.711 u-law.
    </Note>

    <Note>
    La voz en tiempo real se selecciona cuando se crea la sesión. OpenAI permite que la mayoría
    de los campos de la sesión cambien más tarde, pero la voz no se puede cambiar después de que
    el modelo ha emitido audio en esa sesión. OpenClaw actualmente expone los
    ids de voz en tiempo real integrados como cadenas.
    </Note>

    <Note>
    Control UI Talk utiliza sesiones en tiempo real del navegador de OpenAI con un secreto de cliente efímero
    creado por Gateway y un intercambio SDP WebRTC directo del navegador contra la
    API en tiempo real de OpenAI. Cuando no se configura ninguna clave de API de OpenAI directa,
    Gateway puede crear ese secreto de cliente con el perfil OAuth `openai-codex` seleccionado.
    El relevo de Gateway y los puentes WebSocket en tiempo real del backend de Voice Call utilizan
    el mismo respaldo OAuth para los puntos finales nativos de OpenAI. La verificación en vivo
    del mantenedor está disponible con
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`;
    las patas de OpenAI verifican tanto el puente WebSocket del backend como el intercambio
    SDP WebRTC del navegador sin registrar secretos.
    </Note>

  </Accordion>
</AccordionGroup>

## Puntos de conexión de Azure OpenAI

El proveedor `openai` incluido puede apuntar a un recurso de Azure OpenAI para la generación de imágenes anulando la URL base. En la ruta de generación de imágenes, OpenClaw detecta nombres de host de Azure en `models.providers.openai.baseUrl` y cambia automáticamente a la forma de solicitud de Azure.

<Note>La voz en tiempo real utiliza una ruta de configuración separada (`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`) y no se ve afectada por `models.providers.openai.baseUrl`. Consulte el acordeón **Voz en tiempo real** en [Voz y habla](#voice-and-speech) para obtener su configuración de Azure.</Note>

Use Azure OpenAI cuando:

- Ya tenga una suscripción, cuota o contrato empresarial de Azure OpenAI
- Necesite controles de residencia de datos regionales o cumplimiento que Azure proporciona
- Quiera mantener el tráfico dentro de un inquilino de Azure existente

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

OpenClaw reconoce estos sufijos de host de Azure para la ruta de generación de imágenes de Azure:

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

Para las solicitudes de generación de imágenes en un host de Azure reconocido, OpenClaw:

- Envía el encabezado `api-key` en lugar de `Authorization: Bearer`
- Usa rutas con ámbito de implementación (`/openai/deployments/{deployment}/...`)
- Agrega `?api-version=...` a cada solicitud
- Usa un tiempo de espera de solicitud predeterminado de 600 segundos para las llamadas de generación de imágenes de Azure.
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

Azure OpenAI vincula los modelos a las implementaciones. Para las solicitudes de generación de imágenes de Azure enrutadas a través del proveedor incluido `openai`, el campo `model` en OpenClaw debe ser el **nombre de la implementación de Azure** que configuró en el portal de Azure, no el id. del modelo público de OpenAI.

Si crea una implementación llamada `gpt-image-2-prod` que sirve `gpt-image-2`:

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

La misma regla de nombre de implementación se aplica a las llamadas de generación de imágenes enrutadas a través del proveedor incluido `openai`.

### Disponibilidad regional

La generación de imágenes de Azure actualmente está disponible solo en un subconjunto de regiones (por ejemplo `eastus2`, `swedencentral`, `polandcentral`, `westus3`, `uaenorth`). Verifique la lista actual de regiones de Microsoft antes de crear una implementación y confirme que el modelo específico se ofrece en su región.

### Diferencias de parámetros

Azure OpenAI y la OpenAI pública no siempre aceptan los mismos parámetros de imagen. Azure puede rechazar opciones que la OpenAI pública permite (por ejemplo, ciertos valores de `background` en `gpt-image-2`) o exponerlos solo en versiones específicas del modelo. Estas diferencias provienen de Azure y del modelo subyacente, no de OpenClaw. Si una solicitud de Azure falla con un error de validación, verifique el conjunto de parámetros compatibles con su implementación y versión de API específicas en el portal de Azure.

<Note>
Azure OpenAI usa transporte y comportamiento de compatibilidad nativos, pero no recibe los encabezados de atribución ocultos de OpenClaw; consulte el acordeón **Rutas nativas vs. compatibles con OpenAI** en [Configuración avanzada](#advanced-configuration).

Para el tráfico de chat o Responses en Azure (más allá de la generación de imágenes), use el flujo de incorporación o una configuración dedicada del proveedor de Azure: `openai.baseUrl` por sí solo no adopta la forma de API/autenticación de Azure. Existe un proveedor `azure-openai-responses/*` separado; consulte el acordeón Compactación del lado del servidor a continuación.

</Note>

## Configuración avanzada

<AccordionGroup>
  <Accordion title="Transporte (WebSocket vs SSE)">
    OpenClaw usa WebSocket primero con respaldo SSE (`"auto"`) para `openai/*`.

    En modo `"auto"`, OpenClaw:
    - Reintenta un fallo temprano de WebSocket antes de recurrir a SSE
    - Después de un fallo, marca WebSocket como degradado durante ~60 segundos y usa SSE durante el enfriamiento
    - Adjunta encabezados estables de sesión e identidad de turno para reintentos y reconexiones
    - Normaliza los contadores de uso (`input_tokens` / `prompt_tokens`) en todas las variantes de transporte

    | Valor | Comportamiento |
    |-------|----------|
    | `"auto"` (predeterminado) | WebSocket primero, respaldo SSE |
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
    - [API en tiempo real con WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)
    - [Respuestas de API de transmisión (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="Modo rápido">
    OpenClaw expone un interruptor compartido de modo rápido para `openai/*`:

    - **Chat/UI:** `/fast status|on|off`
    - **Configuración:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    Cuando está habilitado, OpenClaw asigna el modo rápido al procesamiento prioritario de OpenAI (`service_tier = "priority"`). Los valores existentes de `service_tier` se conservan, y el modo rápido no reescribe `reasoning` ni `text.verbosity`.

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
    `serviceTier` solo se reenvía a los puntos de conexión nativos de OpenAI (`api.openai.com`) y a los puntos de conexión nativos de Codex (`chatgpt.com/backend-api`). Si enruta cualquiera de los proveedores a través de un proxy, OpenClaw deja `service_tier` sin tocar.
    </Warning>

  </Accordion>

  <Accordion title="Compactación del lado del servidor (API de Responses)">
    Para modelos directos de OpenAI Responses (`openai/*` en `api.openai.com`), el contenedor de flujo Pi-harness del complemento OpenAI habilita automáticamente la compactación del lado del servidor:

    - Fuerza `store: true` (a menos que la compatibilidad del modelo establezca `supportsStore: false`)
    - Inyecta `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - `compact_threshold` predeterminado: 70% de `contextWindow` (o `80000` cuando no esté disponible)

    Esto se aplica a la ruta integrada de Pi harness y a los enganches del proveedor OpenAI utilizados por ejecuciones integradas. El arnés nativo del servidor de aplicaciones Codex gestiona su propio contexto a través de Codex y se configura mediante la ruta de agente predeterminada de OpenAI o la política de tiempo de ejecución del proveedor/modelo.

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
    Para ejecuciones de la familia GPT-5 en `openai/*`, OpenClaw puede utilizar un contrato de ejecución integrado más estricto:

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
    - Ya no trata un turno de solo planificación como un progreso exitoso cuando hay disponible una acción de herramienta
    - Reintenta el turno con una dirección de actuación inmediata
    - Habilita automáticamente `update_plan` para trabajos sustanciales
    - Muestra un estado de bloqueo explícito si el modelo sigue planificando sin actuar

    <Note>
    Limitado solo a ejecuciones de la familia GPT-5 de OpenAI y Codex. Otros proveedores y familias de modelos más antiguas mantienen el comportamiento predeterminado.
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw trata los puntos de conexión directos de OpenAI, Codex y Azure OpenAI de manera diferente a los proxies genéricos compatibles con OpenAI `/v1`:

    **Rutas nativas** (`openai/*`, Azure OpenAI):
    - Mantienen `reasoning: { effort: "none" }` solo para modelos que admiten el esfuerzo `none` de OpenAI
    - Omite el razonamiento deshabilitado para modelos o proxies que rechazan `reasoning.effort: "none"`
    - Establece los esquemas de herramientas en modo estricto de forma predeterminada
    - Adjunta encabezados de atribución ocultos solo en hosts nativos verificados
    - Mantiene la configuración de solicitudes exclusiva de OpenAI (`service_tier`, `store`, reasoning-compat, prompt-cache hints)

    **Rutas de proxy/compatibles:**
    - Utilizan un comportamiento de compatibilidad más flexible
    - Eliminan `store` de Completions de cargas útiles `openai-completions` no nativas
    - Aceptan JSON de paso avanzado `params.extra_body`/`params.extraBody` para proxies de Completions compatibles con OpenAI
    - Aceptan `params.chat_template_kwargs` para proxies de Completions compatibles con OpenAI como vLLM
    - No fuerzan esquemas de herramientas estrictos ni encabezados exclusivos de nativos

    Azure OpenAI utiliza transporte nativo y comportamiento de compatibilidad, pero no recibe los encabezados de atribución ocultos.

  </Accordion>
</AccordionGroup>

## Relacionado

<CardGroup cols={2}>
  <Card title="Model selection" href="/es/concepts/model-providers" icon="layers">
    Selección de proveedores, referencias de modelos y comportamiento de conmutación por error.
  </Card>
  <Card title="Image generation" href="/es/tools/image-generation" icon="image">
    Parámetros compartidos de la herramienta de imágenes y selección de proveedores.
  </Card>
  <Card title="Video generation" href="/es/tools/video-generation" icon="video">
    Parámetros compartidos de la herramienta de video y selección de proveedores.
  </Card>
  <Card title="OAuth y auth" href="/es/gateway/authentication" icon="key">
    Detalles de autenticación y reglas de reutilización de credenciales.
  </Card>
</CardGroup>
