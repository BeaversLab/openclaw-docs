---
summary: "Internals del complemento: modelo de capacidades, propiedad, contratos, canalización de carga y asistentes de tiempo de ejecución"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Internos del complemento"
sidebarTitle: "Internos"
---

# Internals del Plugin

<Info>
  Esta es la **referencia de arquitectura profunda**. Para guías prácticas, consulte: - [Instalar y usar plugins](/en/tools/plugin) — guía de usuario - [Primeros pasos](/en/plugins/building-plugins) — primer tutorial de plugins - [Plugins de canal](/en/plugins/sdk-channel-plugins) — crear un canal de mensajería - [Plugins de proveedor](/en/plugins/sdk-provider-plugins) — crear un proveedor de
  modelos - [Resumen del SDK](/en/plugins/sdk-overview) — mapa de importación y API de registro
</Info>

Esta página cubre la arquitectura interna del sistema de plugins de OpenClaw.

## Modelo de capacidad pública

Las capacidades son el modelo de **plugin nativo** público dentro de OpenClaw. Cada
plugin nativo de OpenClaw se registra contra uno o más tipos de capacidad:

| Capacidad                    | Método de registro                               | Plugins de ejemplo                   |
| ---------------------------- | ------------------------------------------------ | ------------------------------------ |
| Inferencia de texto          | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| Voz                          | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| Transcripción en tiempo real | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| Voz en tiempo real           | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| Comprensión de medios        | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| Generación de imágenes       | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| Generación de música         | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| Generación de video          | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Recuperación web             | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Búsqueda web                 | `api.registerWebSearchProvider(...)`             | `google`                             |
| Canal / mensajería           | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |

Un plugin que registra cero capacidades pero proporciona hooks, herramientas o
servicios es un plugin **solo de hooks heredados**. Ese patrón todavía es totalmente compatible.

### Postura de compatibilidad externa

El modelo de capacidades está integrado en el núcleo y es utilizado por los plugins empaquetados/nativos
hoy, pero la compatibilidad de plugins externos aún necesita un estándar más estricto que "está
exportado, por lo tanto está congelado".

Orientación actual:

- **plugins externos existentes:** mantener funcionando las integraciones basadas en hooks; tratar
  esto como la línea base de compatibilidad
- **new bundled/native plugins:** prefer explicit capability registration over
  vendor-specific reach-ins or new hook-only designs
- **external plugins adopting capability registration:** allowed, but treat the
  capability-specific helper surfaces as evolving unless docs explicitly mark a
  contract as stable

Practical rule:

- capability registration APIs are the intended direction
- legacy hooks remain the safest no-breakage path for external plugins during
  the transition
- exported helper subpaths are not all equal; prefer the narrow documented
  contract, not incidental helper exports

### Plugin shapes

OpenClaw classifies every loaded plugin into a shape based on its actual
registration behavior (not just static metadata):

- **plain-capability** -- registers exactly one capability type (for example a
  provider-only plugin like `mistral`)
- **hybrid-capability** -- registers multiple capability types (for example
  `openai` owns text inference, speech, media understanding, and image
  generation)
- **hook-only** -- registers only hooks (typed or custom), no capabilities,
  tools, commands, or services
- **non-capability** -- registers tools, commands, services, or routes but no
  capabilities

Use `openclaw plugins inspect <id>` to see a plugin's shape and capability
breakdown. See [CLI reference](/en/cli/plugins#inspect) for details.

### Legacy hooks

The `before_agent_start` hook remains supported as a compatibility path for
hook-only plugins. Legacy real-world plugins still depend on it.

Direction:

- keep it working
- document it as legacy
- prefer `before_model_resolve` for model/provider override work
- prefer `before_prompt_build` for prompt mutation work
- remove only after real usage drops and fixture coverage proves migration safety

### Compatibility signals

When you run `openclaw doctor` or `openclaw plugins inspect <id>`, you may see
one of these labels:

| Signal                     | Meaning                                                        |
| -------------------------- | -------------------------------------------------------------- |
| **config valid**           | Config parses fine and plugins resolve                         |
| **compatibility advisory** | Plugin uses a supported-but-older pattern (e.g. `hook-only`)   |
| **legacy warning**         | Plugin uses `before_agent_start`, which is deprecated          |
| **error grave**            | La configuración no es válida o el complemento falló al cargar |

Ni `hook-only` ni `before_agent_start` romperán tu complemento hoy --
`hook-only` es consultivo, y `before_agent_start` solo activa una advertencia. Estas
señales también aparecen en `openclaw status --all` y `openclaw plugins doctor`.

## Descripción general de la arquitectura

El sistema de complementos de OpenClaw tiene cuatro capas:

1. **Manifiesto + descubrimiento**
   OpenClaw encuentra complementos candidatos desde rutas configuradas, raíces del espacio de trabajo,
   raíces de extensiones globales y extensiones incluidas. El descubrimiento lee los manifiestos nativos
   `openclaw.plugin.json` más los manifiestros de paquetes compatibles primero.
2. **Habilitación + validación**
   Core decide si un complemento descubierto está habilitado, deshabilitado, bloqueado o
   seleccionado para un espacio exclusivo como la memoria.
3. **Carga en tiempo de ejecución**
   Los complementos nativos de OpenClaw se cargan dentro del proceso vía jiti y registran
   capacidades en un registro central. Los paquetes compatibles se normalizan en
   registros del registro sin importar código de tiempo de ejecución.
4. **Consumo de superficie**
   El resto de OpenClaw lee el registro para exponer herramientas, canales, configuración
   de proveedores, hooks, rutas HTTP, comandos CLI y servicios.

Específicamente para el CLI de complementos, el descubrimiento de comandos raíz se divide en dos fases:

- los metadatos en tiempo de análisis provienen de `registerCli(..., { descriptors: [...] })`
- el módulo real del CLI del complemento puede mantenerse diferido y registrarse en la primera invocación

Eso mantiene el código CLI propiedad del complemento dentro del complemento mientras aún permite a OpenClaw
reservar nombres de comandos raíz antes del análisis.

El límite de diseño importante:

- el descubrimiento + validación de configuración debería funcionar desde **metadatos de manifiesto/esquema**
  sin ejecutar código del complemento
- el comportamiento de tiempo de ejecución nativo proviene de la ruta `register(api)` del módulo del complemento

Esa división permite a OpenClaw validar la configuración, explicar complementos faltantes/deshabilitados y
construir sugerencias de UI/esquema antes de que el tiempo de ejecución completo esté activo.

### Complementos de canal y la herramienta de mensaje compartida

Los complementos de canal no necesitan registrar una herramienta separada de enviar/editar/reaccionar para
acciones normales de chat. OpenClaw mantiene una herramienta compartida `message` en el núcleo, y
los complementos de canal son dueños del descubrimiento y ejecución específicos del canal detrás de ella.

El límite actual es:

- el núcleo posee el host de la herramienta compartida `message`, el cableado del prompt, la contabilidad de sesión/subproceso y el despacho de ejecución
- los complementos del canal poseen el descubrimiento de acciones con alcance, el descubrimiento de capacidades y cualquier fragmento de esquema específico del canal
- los complementos del canal poseen la gramática de conversación de sesión específica del proveedor, como cómo los IDs de conversación codifican los IDs de subproceso o heredan de conversaciones principales
- los complementos del canal ejecutan la acción final a través de su adaptador de acción

Para los complementos del canal, la superficie del SDK es `ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento unificada permite que un complemento devuelva sus acciones visibles, capacidades y contribuciones de esquema juntas para que esas piezas no se separen.

El núcleo pasa el ámbito de tiempo de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- entrada confiable `requesterSenderId`

Eso importa para los complementos sensibles al contexto. Un canal puede ocultar o exponer acciones de mensaje basándose en la cuenta activa, la sala/subproceso/mensaje actual, o la identidad del solicitante de confianza sin codificar ramas específicas del canal en la herramienta `message` del núcleo.

Esta es la razón por la que los cambios de enrutamiento del ejecutor integrado siguen siendo trabajo del complemento: el ejecutor es responsable de reenviar la identidad de chat/sesión actual al límite de descubrimiento del complemento para que la herramienta compartida `message` exponga la superficie adecuada propiedad del canal para el turno actual.

Para los auxiliares de ejecución propiedad del canal, los complementos empaquetados deben mantener el tiempo de ejecución de ejecución dentro de sus propios módulos de extensión. El núcleo ya no posee los tiempos de ejecución de acción de mensaje de Discord, Slack, Telegram o WhatsApp bajo `src/agents/tools`. No publicamos subrutas `plugin-sdk/*-action-runtime` separadas, y los complementos empaquetados deben importar su propio código de tiempo de ejecución local directamente desde sus módulos propiedad de la extensión.

El mismo límite se aplica a las costuras del SDK nombradas por el proveedor en general: el núcleo no debe importar barriles de conveniencia específicos del canal para Slack, Discord, Signal, WhatsApp o extensiones similares. Si el núcleo necesita un comportamiento, consuma el barril `api.ts` / `runtime-api.ts` del complemento incluido o promueva la necesidad a una capacidad genérica estrecha en el SDK compartido.

Para las encuestas específicamente, hay dos rutas de ejecución:

- `outbound.sendPoll` es la línea base compartida para los canales que se ajustan al modelo de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para la semántica de encuesta específica del canal o parámetros de encuesta adicionales

El núcleo ahora difiere el análisis compartido de encuestas hasta después de que el despacho de encuestas del complemento decline la acción, por lo que los manejadores de encuesta propiedad del complemento pueden aceptar campos de encuesta específicos del canal sin ser bloqueados primero por el analizador de encuestas genérico.

Consulte [Load pipeline](#load-pipeline) para obtener la secuencia de inicio completa.

## Modelo de propiedad de capacidades

OpenClaw trata un complemento nativo como el límite de propiedad para una **empresa** o una **característica**, no como una bolsa de integraciones no relacionadas.

Esto significa:

- un complemento de empresa generalmente debería ser propietario de todas las superficies de esa empresa orientadas a OpenClaw
- un complemento de características generalmente debería ser propietario de la superficie completa de características que introduce
- los canales deben consumir capacidades centrales compartidas en lugar de volver a implementar el comportamiento del proveedor ad hoc

Ejemplos:

- el complemento incluido `openai` es propietario del comportamiento del proveedor de modelos de OpenAI y el comportamiento de voz + voz en tiempo real + comprensión de medios + generación de imágenes de OpenAI
- el complemento incluido `elevenlabs` es propietario del comportamiento de voz de ElevenLabs
- el complemento incluido `microsoft` es propietario del comportamiento de voz de Microsoft
- el complemento incluido `google` es propietario del comportamiento del proveedor de modelos de Google además del comportamiento de comprensión de medios + generación de imágenes + búsqueda web de Google
- el complemento incluido `firecrawl` es propietario del comportamiento de recuperación web de Firecrawl
- los complementos incluidos `minimax`, `mistral`, `moonshot` y `zai` son propietarios de sus backends de comprensión de medios
- el plugin agrupado `qwen` posee el comportamiento del proveedor de texto Qwen más
  el comportamiento de comprensión de medios y generación de video
- el plugin `voice-call` es un plugin de características: posee el transporte de llamadas, herramientas,
  CLI, rutas y puente de flujo de medios de Twilio, pero consume capacidades de voz compartida
  más transcripción en tiempo real y voz en tiempo real en lugar de
  importar directamente plugins de proveedores

El estado final previsto es:

- OpenAI vive en un solo plugin incluso si abarca modelos de texto, voz, imágenes y
  video futuro
- otro proveedor puede hacer lo mismo con su propia área de superficie
- los canales no les importa qué plugin de proveedor posee el proveedor; consumen el
  contrato de capacidad compartida expuesta por core

Esta es la distinción clave:

- **plugin** = límite de propiedad
- **capacidad** = contrato principal que múltiples plugins pueden implementar o consumir

Entonces, si OpenClaw añade un nuevo dominio como el video, la primera pregunta no es
"¿qué proveedor debería codificar el manejo de video?". La primera pregunta es "¿cuál es
el contrato principal de capacidad de video?". Una vez que existe ese contrato, los plugins de proveedores
pueden registrarse en él y los plugins de canal/características pueden consumirlo.

Si la capacidad aún no existe, el movimiento correcto suele ser:

1. definir la capacidad faltante en core
2. exponerla a través de la API/runtime del plugin de una manera tipada
3. conectar canales/características contra esa capacidad
4. permitir que los plugins de proveedores registren implementaciones

Esto mantiene la propiedad explícita mientras se evita el comportamiento principal que depende de un
solo proveedor o una ruta de código específica de un plugin única.

### Capas de capacidad

Use este modelo mental al decidir a dónde pertenece el código:

- **capa de capacidad principal**: orquestación compartida, política, respaldo, configuración
  reglas de fusión, semántica de entrega y contratos tipados
- **capa de plugin de proveedor**: APIs específicas del proveedor, autenticación, catálogos de modelos, voz
  síntesis, generación de imágenes, backends de video futuros, puntos de conexión de uso
- **capa de plugin de canal/características**: Slack/Discord/llamada de voz/etc. integración
  que consume capacidades principales y las presenta en una superficie

Por ejemplo, TTS sigue esta forma:

- core posee la política TTS en tiempo de respuesta, orden de respaldo, preferencias y entrega del canal
- `openai`, `elevenlabs` y `microsoft` poseen implementaciones de síntesis
- `voice-call` consume el asistente de tiempo de ejecución de TTS de telefonía

Se debe preferir ese mismo patrón para capacidades futuras.

### Ejemplo de plugin de empresa con múltiples capacidades

Un plugin de empresa debe parecer cohesivo desde el exterior. Si OpenClaw tiene contratos
compartidos para modelos, voz, transcripción en tiempo real, voz en tiempo real,
comprensión de medios, generación de imágenes, generación de video, obtención web y búsqueda web,
un proveedor puede ser propietario de todas sus superficies en un solo lugar:

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk/plugin-entry";
import { describeImageWithModel, transcribeOpenAiCompatibleAudio } from "openclaw/plugin-sdk/media-understanding";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // auth/model catalog/runtime hooks
    });

    api.registerSpeechProvider({
      id: "exampleai",
      // vendor speech config — implement the SpeechProviderPlugin interface directly
    });

    api.registerMediaUnderstandingProvider({
      id: "exampleai",
      capabilities: ["image", "audio", "video"],
      async describeImage(req) {
        return describeImageWithModel({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
      async transcribeAudio(req) {
        return transcribeOpenAiCompatibleAudio({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
    });

    api.registerWebSearchProvider(
      createPluginBackedWebSearchProvider({
        id: "exampleai-search",
        // credential + fetch logic
      }),
    );
  },
};

export default plugin;
```

Lo que importa no son los nombres exactos de los asistentes. La forma importa:

- un plugin es propietario de la superficie del proveedor
- el núcleo sigue siendo propietario de los contratos de capacidades
- los canales y los plugins de funciones consumen asistentes `api.runtime.*`, no código de proveedor
- las pruebas de contrato pueden afirmar que el plugin registró las capacidades que
  reclama poseer

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad
compartida. El mismo modelo de propiedad se aplica allí:

1. el núcleo define el contrato de comprensión de medios
2. los plugins de proveedores registran `describeImage`, `transcribeAudio` y
   `describeVideo` según corresponda
3. los canales y los plugins de funciones consumen el comportamiento central compartido en lugar de
   conectarse directamente al código del proveedor

Eso evita incorporar los supuestos de video de un proveedor en el núcleo. El plugin es propietario
de la superficie del proveedor; el núcleo es propietario del contrato de capacidad y el comportamiento de reserva.

La generación de video ya usa esa misma secuencia: el núcleo es propietario del contrato de capacidad
tipado y el asistente de tiempo de ejecución, y los plugins de proveedores registran
implementaciones `api.registerVideoGenerationProvider(...)` contra él.

¿Necesita una lista de verificación de implementación concreta? Vea
[Capability Cookbook](/en/tools/capability-cookbook).

## Contratos y cumplimiento

La superficie de la API del plugin está intencionalmente tipificada y centralizada en
`OpenClawPluginApi`. Ese contrato define los puntos de registro compatibles y
los asistentes de tiempo de ejecución en los que un plugin puede confiar.

Por qué esto importa:

- los autores de plugins obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos plugins registrando el mismo
  id de proveedor
- el inicio puede mostrar diagnósticos procesables para el registro con formato incorrecto
- las pruebas de contrato pueden hacer cumplir la propiedad del plugin agrupado y evitar la deriva silenciosa

Hay dos capas de cumplimiento:

1. **imposición de registro en tiempo de ejecución**
   El registro de complementos valida los registros a medida que se cargan los complementos. Ejemplos:
   los identificadores de proveedor duplicados, los identificadores de proveedor de voz duplicados y los registros
   malformados producen diagnósticos de complementos en lugar de un comportamiento indefinido.
2. **pruebas de contrato**
   Los complementos incluidos se capturan en registros de contratos durante las ejecuciones de pruebas para que
   OpenClaw pueda afirmar la propiedad explícitamente. Hoy en día, esto se utiliza para proveedores
   de modelos, proveedores de voz, proveedores de búsqueda web y propiedad de registro
   incluido.

El efecto práctico es que OpenClaw sabe, de antemano, qué complemento posee qué
superficie. Eso permite que el núcleo y los canales se compongan sin problemas porque la propiedad está
declarada, tipificada y es comprobable en lugar de implícita.

### Qué pertenece a un contrato

Los buenos contratos de complementos son:

- tipificados
- pequeños
- específicos de la capacidad
- propiedad del núcleo
- reutilizables por múltiples complementos
- consumibles por canales/funcionalidades sin conocimiento del proveedor

Los malos contratos de complementos son:

- políticas específicas del proveedor ocultas en el núcleo
- escotillas de escape de complementos de un solo uso que omiten el registro
- código de canal que llega directamente a una implementación de proveedor
- objetos de tiempo de ejecución ad hoc que no son parte de `OpenClawPluginApi` o
  `api.runtime`

En caso de duda, eleve el nivel de abstracción: defina primero la capacidad y luego
permita que los complementos se conecten a ella.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en el mismo proceso** que la Gateway. No están
en sandbox. Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que
el código del núcleo.

Implicaciones:

- un complemento nativo puede registrar herramientas, controladores de red, enlaces y servicios
- un error en un complemento nativo puede bloquear o desestabilizar la puerta de enlace
- un complemento nativo malicioso es equivalente a la ejecución de código arbitrario dentro
  del proceso OpenClaw

Los paquetes compatibles son más seguros por defecto porque OpenClaw actualmente los trata
como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades
incluidas.

Use listas de permitidos y rutas de instalación/carga explícitas para complementos no incluidos. Trate
los complementos del espacio de trabajo como código en tiempo de desarrollo, no como valores predeterminados de producción.

Para los nombres de paquetes del espacio de trabajo agrupados, mantenga el id del complemento anclado en el nombre
npm: `@openclaw/<id>` de forma predeterminada, o un sufijo de tipo aprobado como
`-provider`, `-plugin`, `-speech`, `-sandbox`, o `-media-understanding` cuando
el paquete intencionalmente expone un rol de complemento más estrecho.

Nota importante de confianza:

- `plugins.allow` confía en los **ids de complementos**, no en el origen de la fuente.
- Un complemento del espacio de trabajo con el mismo id que un complemento agrupado intencionalmente ensombrece
  la copia agrupada cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, las pruebas de parches y las revisiones rápidas.

## Límite de exportación

OpenClaw exporta capacidades, no conveniencias de implementación.

Mantenga el registro de capacidades público. Elimine las exportaciones auxiliares que no sean parte del contrato:

- subrutas auxiliares específicas del complemento agrupado
- subrutas de infraestructura de tiempo de ejecución no destinadas a ser una API pública
- ayudantes de conveniencia específicos del proveedor
- ayudantes de configuración/incorporación que son detalles de implementación

Algunas subrutas auxiliares de complementos agrupados todavía permanecen en el mapa de exportación del SDK generado
por compatibilidad y mantenimiento de complementos agrupados. Los ejemplos actuales incluyen
`plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`,
`plugin-sdk/zalo-setup` y varias costuras `plugin-sdk/matrix*`. Trátese como
exportaciones reservadas de detalles de implementación, no como el patrón SDK recomendado para
nuevos complementos de terceros.

## Canalización de carga

Al iniciarse, OpenClaw hace aproximadamente esto:

1. descubrir raíces de complementos candidatas
2. leer manifiestos nativos o de paquetes agrupados compatibles y metadatos de paquetes
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación para cada candidato
6. cargar módulos nativos habilitados a través de jiti
7. llamar a los ganchos nativos `register(api)` (o `activate(api)` — un alias heredado) y recopilar los registros en el registro de complementos
8. exponer el registro a las superficies de comandos/tiempo de ejecución

<Note>`activate` es un alias heredado de `register` — el cargador resuelve el que esté presente (`def.register ?? def.activate`) y lo llama en el mismo punto. Todos los complementos empaquetados usan `register`; prefiera `register` para complementos nuevos.</Note>

Los filtros de seguridad ocurren **antes** de la ejecución del tiempo de ejecución. Los candidatos se bloquean
cuando la entrada escapa de la raíz del complemento, la ruta es de escritura mundial, o la propiedad
de la ruta parece sospechosa para complementos no empaquetados.

### Comportamiento primero en el manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo usa para:

- identificar el complemento
- descubrir canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- aumentar las etiquetas/marcadores de posición de la Interfaz de Usuario de Control
- mostrar metadatos de instalación/catálogo

Para complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra
el comportamiento real, como ganchos, herramientas, comandos o flujos de proveedor.

### Lo que el cargador almacena en caché

OpenClaw mantiene cachés cortos en el proceso para:

- resultados de descubrimiento
- datos del registro de manifiestos
- registros de complementos cargados

Estos cachés reducen la sobrecarga de inicio intermitente y comandos repetidos. Es seguro
considerarlos como cachés de rendimiento de corta duración, no persistencia.

Nota de rendimiento:

- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para deshabilitar estos cachés.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modelo de registro

Los complementos cargados no mutan directamente globales centrales aleatorios. Se registran en un
registro central de complementos.

El registro rastrea:

- registros de complementos (identidad, fuente, origen, estado, diagnósticos)
- herramientas
- ganchos heredados y ganchos tipados
- canales
- proveedores
- manejadores RPC de puerta de enlace
- rutas HTTP
- registradores CLI
- servicios en segundo plano
- comandos propiedad del complemento

Las características principales luego leen de ese registro en lugar de comunicarse con los módulos del complemento
directamente. Esto mantiene la carga en una sola dirección:

- módulo de complemento -> registro de registro
- tiempo de ejecución central -> consumo del registro

Esa separación es importante para la mantenibilidad. Significa que la mayoría de las superficies centrales solo
necesitan un punto de integración: "leer el registro", en lugar de "casos especiales para cada módulo
de complemento".

## Devoluciones de llamada de enlace de conversación

Los complementos que vinculan una conversación pueden reaccionar cuando se resuelve una aprobación.

Use `api.onConversationBindingResolved(...)` para recibir una devolución de llamada después de que una solicitud de vinculación sea aprobada o denegada:

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // A binding now exists for this plugin + conversation.
        console.log(event.binding?.conversationId);
        return;
      }

      // The request was denied; clear any local pending state.
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

Campos de la carga útil de la devolución de llamada:

- `status`: `"approved"` o `"denied"`
- `decision`: `"allow-once"`, `"allow-always"` o `"deny"`
- `binding`: el vínculo resuelto para las solicitudes aprobadas
- `request`: el resumen de la solicitud original, la sugerencia de desvinculación, el id. del remitente y los metadatos de la conversación

Esta devolución de llamada es solo de notificación. No cambia quién tiene permiso para vincular una conversación y se ejecuta después de que finaliza el manejo principal de aprobaciones.

## Ganchos de tiempo de ejecución del proveedor

Los complementos del proveedor ahora tienen dos capas:

- metadatos del manifiesto: `providerAuthEnvVars` para una búsqueda rápida de autenticación de entorno antes de la carga en tiempo de ejecución, además de `providerAuthChoices` para etiquetas rápidas de incorporación/elección de autenticación y metadatos de indicadores de CLI antes de la carga en tiempo de ejecución
- ganchos en tiempo de configuración: `catalog` / `discovery` heredado más `applyConfigDefaults`
- runtime hooks: `normalizeModelId`, `normalizeTransport`,
  `normalizeConfig`,
  `applyNativeStreamingUsageCompat`, `resolveConfigApiKey`,
  `resolveSyntheticAuth`, `shouldDeferSyntheticProfileAuth`,
  `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`,
  `contributeResolvedModelCompat`, `capabilities`,
  `normalizeToolSchemas`, `inspectToolSchemas`,
  `resolveReasoningOutputMode`, `prepareExtraParams`, `createStreamFn`,
  `wrapStreamFn`, `resolveTransportTurnState`,
  `resolveWebSocketSessionPolicy`, `formatApiKey`, `refreshOAuth`,
  `buildAuthDoctorHint`, `matchesContextOverflowError`,
  `classifyFailoverReason`, `isCacheTtlEligible`,
  `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`,
  `isBinaryThinking`, `supportsXHighThinking`,
  `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `createEmbeddingProvider`,
  `buildReplayPolicy`,
  `sanitizeReplayHistory`, `validateReplayTurns`, `onModelSelected`

OpenClaw sigue siendo el propietario del bucle de agente genérico, la conmutación por error, el manejo de transcripciones y la política de herramientas. Estos hooks son la superficie de extensión para comportamientos específicos del proveedor sin necesidad de un transporte de inferencia personalizado completo.

Use el manifiesto `providerAuthEnvVars` cuando el proveedor tenga credenciales basadas en entorno que las rutas genéricas de autenticación/estado/selector de modelos deberían ver sin cargar el tiempo de ejecución del plugin. Use el manifiesto `providerAuthChoices` cuando las superficies de CLI de incorporación/elección de autenticación deban conocer el id de elección del proveedor, las etiquetas de grupo y el cableado simple de autenticación de una bandera sin cargar el tiempo de ejecución del proveedor. Mantenga el tiempo de ejecución del proveedor `envVars` para las pistas orientadas al operador, como las etiquetas de incorporación o las variables de configuración de id de cliente/secreto de cliente de OAuth.

### Orden y uso de los hooks

Para los complementos de modelo/proveedor, OpenClaw llama a los enlaces (hooks) en este orden aproximado.
La columna "Cuándo usar" es la guía de decisión rápida.

| #   | Enlace (Hook)                     | Lo que hace                                                                                                                                    | Cuándo usar                                                                                                                                                                                                 |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | Publica la configuración del proveedor en `models.providers` durante la generación de `models.json`                                            | El proveedor posee un catálogo o valores predeterminados de URL base                                                                                                                                        |
| 2   | `applyConfigDefaults`             | Aplica los valores predeterminados de configuración global propiedad del proveedor durante la materialización de la configuración              | Los valores predeterminados dependen del modo de autenticación, el entorno o la semántica de la familia de modelos del proveedor                                                                            |
| --  | _(búsqueda de modelo integrada)_  | OpenClaw intenta primero la ruta normal de registro/catálogo                                                                                   | _(no es un enlace de complemento)_                                                                                                                                                                          |
| 3   | `normalizeModelId`                | Normaliza los alias de ID de modelo heredados o de vista previa antes de la búsqueda                                                           | El proveedor posee la limpieza de alias antes de la resolución del modelo canónico                                                                                                                          |
| 4   | `normalizeTransport`              | Normaliza `api` / `baseUrl` de familia de proveedores antes del ensamblaje de modelo genérico                                                  | El proveedor posee la limpieza de transporte para IDs de proveedores personalizados en la misma familia de transporte                                                                                       |
| 5   | `normalizeConfig`                 | Normaliza `models.providers.<id>` antes de la resolución de tiempo de ejecución/proveedor                                                      | El proveedor necesita una limpieza de configuración que debe residir en el complemento; los asistentes de la familia Google incluidos también respaldan las entradas de configuración de Google compatibles |
| 6   | `applyNativeStreamingUsageCompat` | Aplica reescrituras de compatibilidad de uso de transmisión nativa a los proveedores de configuración                                          | El proveedor necesita correcciones de metadatos de uso de transmisión nativa impulsadas por el endpoint                                                                                                     |
| 7   | `resolveConfigApiKey`             | Resuelve la autenticación de marcadores de entorno para proveedores de configuración antes de la carga de autenticación en tiempo de ejecución | El proveedor tiene una resolución de clave API de marcador de entorno propia del proveedor; `amazon-bedrock` también tiene un resolutor de marcadores de entorno AWS integrado aquí                         |
| 8   | `resolveSyntheticAuth`            | Expone la autenticación local/autohospedada o respaldada por configuración sin persistir texto sin formato                                     | El proveedor puede operar con un marcador de credencial sintético/local                                                                                                                                     |
| 9   | `shouldDeferSyntheticProfileAuth` | Reduce los marcadores de posición de perfil sintético almacenados detrás de la autenticación respaldada por entorno/configuración              | El proveedor almacena perfiles de marcador de posición sintéticos que no deben ganar precedencia                                                                                                            |
| 10  | `resolveDynamicModel`             | Respaldo síncrono para IDs de modelo propiedad del proveedor que aún no están en el registro local                                             | El proveedor acepta IDs de modelos upstream arbitrarios                                                                                                                                                     |
| 11  | `prepareDynamicModel`             | Calentamiento asíncrono, luego `resolveDynamicModel` se ejecuta de nuevo                                                                       | El proveedor necesita metadatos de red antes de resolver IDs desconocidos                                                                                                                                   |
| 12  | `normalizeResolvedModel`          | Reescritura final antes de que el ejecutor integrado use el modelo resuelto                                                                    | El proveedor necesita reescrituras de transporte pero aún usa un transporte central                                                                                                                         |
| 13  | `contributeResolvedModelCompat`   | Contribuir con banderas de compatibilidad para modelos de proveedores detrás de otro transporte compatible                                     | El proveedor reconoce sus propios modelos en transportes proxy sin tomar el control del proveedor                                                                                                           |
| 14  | `capabilities`                    | Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida                                    | El proveedor necesita peculiaridades de transcripción/familia de proveedores                                                                                                                                |
| 15  | `normalizeToolSchemas`            | Normalizar esquemas de herramientas antes de que el ejecutor integrado los vea                                                                 | El proveedor necesita limpieza de esquema de familia de transporte                                                                                                                                          |
| 16  | `inspectToolSchemas`              | Exponer diagnósticos de esquema propiedad del proveedor después de la normalización                                                            | El proveedor quiere advertencias de palabras clave sin enseñar reglas específicas del proveedor al núcleo                                                                                                   |
| 17  | `resolveReasoningOutputMode`      | Seleccionar contrato de salida de razonamiento nativo vs. etiquetado                                                                           | El proveedor necesita salida de razonamiento/final etiquetada en lugar de campos nativos                                                                                                                    |
| 18  | `prepareExtraParams`              | Normalización de parámetros de solicitud antes de los contenedores de opciones de transmisión genéricos                                        | El proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor                                                                                                        |
| 19  | `createStreamFn`                  | Reemplazar completamente la ruta de transmisión normal con un transporte personalizado                                                         | El proveedor necesita un protocolo de cable personalizado, no solo un contenedor                                                                                                                            |
| 20  | `wrapStreamFn`                    | Contenedor de transmisión después de que se aplican los contenedores genéricos                                                                 | El proveedor necesita contenedores de compatibilidad de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado                                                                              |
| 21  | `resolveTransportTurnState`       | Adjuntar encabezados o metadatos de transporte nativos por turno                                                                               | El proveedor quiere que los transportes genéricos envíen identidad de turno nativa del proveedor                                                                                                            |
| 22  | `resolveWebSocketSessionPolicy`   | Adjuntar encabezados nativos de WebSocket o política de enfriamiento de sesión                                                                 | El proveedor quiere que los transportes WS genéricos ajusten los encabezados de sesión o la política de reserva                                                                                             |
| 23  | `formatApiKey`                    | Formateador de perfil de autenticación: el perfil almacenado se convierte en la cadena de tiempo de ejecución `apiKey`                         | El proveedor almacena metadatos de autenticación adicionales y necesita una forma de token de tiempo de ejecución personalizada                                                                             |
| 24  | `refreshOAuth`                    | Invalidación de actualización de OAuth para puntos de conexión de actualización personalizados o política de fallas de actualización           | El proveedor no se ajusta a los actualizadores compartidos `pi-ai`                                                                                                                                          |
| 25  | `buildAuthDoctorHint`             | Sugerencia de reparación añadida cuando falla la actualización de OAuth                                                                        | El proveedor necesita una guía de reparación de autenticación propiedad del proveedor después de un fallo de actualización                                                                                  |
| 26  | `matchesContextOverflowError`     | Emparejador de desbordamiento de ventana de contexto propiedad del proveedor                                                                   | El proveedor tiene errores de desbordamiento sin procesar que las heurísticas genéricas pasarían por alto                                                                                                   |
| 27  | `classifyFailoverReason`          | Clasificación de motivo de conmutación por error propiedad del proveedor                                                                       | El proveedor puede asignar errores de API/transporte sin procesar a límite de tasa/sobrecarga/etc.                                                                                                          |
| 28  | `isCacheTtlEligible`              | Política de caché de solicitudes para proveedores de proxy/backhaul                                                                            | El proveedor necesita una puerta de TTL de caché específica para el proxy                                                                                                                                   |
| 29  | `buildMissingAuthMessage`         | Reemplazo del mensaje genérico de recuperación de autenticación faltante                                                                       | El proveedor necesita una sugerencia de recuperación de autenticación faltante específica del proveedor                                                                                                     |
| 30  | `suppressBuiltInModel`            | Supresión de modelo ascendente obsoleto más sugerencia de error opcional para el usuario                                                       | El proveedor necesita ocultar filas ascendentes obsoletas o reemplazarlas con una sugerencia del proveedor                                                                                                  |
| 31  | `augmentModelCatalog`             | Filas de catálogo sintéticas/finales añadidas después del descubrimiento                                                                       | El proveedor necesita filas de compatibilidad hacia adelante sintéticas en `models list` y selectores                                                                                                       |
| 32  | `isBinaryThinking`                | Interruptor de razonado activado/desactivado para proveedores de pensamiento binario                                                           | El proveedor expone solo el pensamiento binario activado/desactivado                                                                                                                                        |
| 33  | `supportsXHighThinking`           | Soporte de razonado `xhigh` para modelos seleccionados                                                                                         | El proveedor desea `xhigh` solo en un subconjunto de modelos                                                                                                                                                |
| 34  | `resolveDefaultThinkingLevel`     | Nivel `/think` predeterminado para una familia de modelos específica                                                                           | El proveedor es propietario de la política `/think` predeterminada para una familia de modelos                                                                                                              |
| 35  | `isModernModelRef`                | Emparejador de modelo moderno para filtros de perfil en vivo y selección de pruebas                                                            | El proveedor es propietario del emparejamiento de modelo preferido en vivo/pruebas                                                                                                                          |
| 36  | `prepareRuntimeAuth`              | Intercambiar una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia                            | El proveedor necesita un intercambio de tokens o credenciales de solicitud de corta duración                                                                                                                |
| 37  | `resolveUsageAuth`                | Resolver las credenciales de uso/facturación para `/usage` y las superficies de estado relacionadas                                            | El proveedor necesita análisis personalizado de tokens de uso/cuota o una credencial de uso diferente                                                                                                       |
| 38  | `fetchUsageSnapshot`              | Obtener y normalizar instantáneas específicas del proveedor de uso/cuota después de que se resuelve la autenticación                           | El proveedor necesita un endpoint de uso específico del proveedor o un analizador de carga útil                                                                                                             |
| 39  | `createEmbeddingProvider`         | Construir un adaptador de incrustación propiedad del proveedor para memoria/búsqueda                                                           | El comportamiento de incrustación de memoria pertenece al complemento del proveedor                                                                                                                         |
| 40  | `buildReplayPolicy`               | Devolver una política de repetición que controle el manejo de transcripciones para el proveedor                                                | El proveedor necesita una política de transcripción personalizada (por ejemplo, eliminación de bloques de pensamiento)                                                                                      |
| 41  | `sanitizeReplayHistory`           | Reescribir el historial de repetición después de la limpieza genérica de la transcripción                                                      | El proveedor necesita reescrituras de repetición específicas del proveedor más allá de los asistentes de compactación compartidos                                                                           |
| 42  | `validateReplayTurns`             | Validación o remodelación final del turno de repetición antes del ejecutor integrado                                                           | El transporte del proveedor necesita una validación de turno más estricta después de la saneamiento genérico                                                                                                |
| 43  | `onModelSelected`                 | Ejecutar efectos secundarios posteriores a la selección propiedad del proveedor                                                                | El proveedor necesita telemetría o estado propiedad del proveedor cuando un modelo se activa                                                                                                                |

`normalizeModelId`, `normalizeTransport` y `normalizeConfig` primero verifican el complemento del proveedor coincidente, luego pasan a otros complementos del proveedor con capacidad de enlace hasta que uno realmente cambia el id del modelo o el transporte/configuración. Esto mantiene funcionando los shims de alias/compat del proveedor sin requerir que la persona que llama sepa qué complemento incluido posee la reescritura. Si ningún enlace del proveedor reescribe una entrada de configuración de la familia de Google compatible, el normalizador de configuración de Google incluido todavía aplica esa limpieza de compatibilidad.

Si el proveedor necesita un protocolo de cable completamente personalizado o un ejecutor de solicitudes personalizado, esa es una clase diferente de extensión. Estos enlaces son para el comportamiento del proveedor que todavía se ejecuta en el bucle de inferencia normal de OpenClaw.

### Ejemplo de proveedor

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "Auto" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### Ejemplos integrados

- Anthropic utiliza `resolveDynamicModel`, `capabilities`, `buildAuthDoctorHint`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `isCacheTtlEligible`,
  `resolveDefaultThinkingLevel`, `applyConfigDefaults`, `isModernModelRef`,
  y `wrapStreamFn` porque es propietaria de la compatibilidad hacia adelante de Claude 4.6,
  las sugerencias de familia de proveedores, la guía de reparación de autenticación,
  la integración del endpoint de uso, la elegibilidad de caché de solicitudes,
  los valores predeterminados de configuración con conocimiento de autenticación,
  la política de pensamiento predeterminada/adaptativa de Claude y el modelado de
  transmisión específico de Anthropic para encabezados beta, `/fast` / `serviceTier` y `context1m`.
- Los asistentes de transmisión específicos de Claude de Anthropic se mantienen en la propia
  costura pública `api.ts` / `contract-api.ts` del complemento incluido por ahora.
  Esa superficie del paquete exporta `wrapAnthropicProviderStream`, `resolveAnthropicBetas`,
  `resolveAnthropicFastMode`, `resolveAnthropicServiceTier` y los constructores de
  envoltorios de nivel inferior de Anthropic en lugar de ampliar el SDK genérico
  alrededor de las reglas de encabezados beta de un solo proveedor.
- OpenAI utiliza `resolveDynamicModel`, `normalizeResolvedModel` y
  `capabilities` además de `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` y `isModernModelRef`
  porque es propietaria de la compatibilidad hacia adelante de GPT-5.4, la normalización
  directa de `openai-completions` -> `openai-responses` de OpenAI,
  sugerencias de autenticación con conocimiento de Codex, supresión de Spark,
  filas de lista sintéticas de OpenAI y la política de pensamiento / modelo en vivo
  de GPT-5; la familia de transmisiones `openai-responses-defaults` posee los
  envoltorios de respuestas nativas de OpenAI compartidos para encabezados de atribución,
  `/fast`/`serviceTier`, verbosidad de texto,
  búsqueda web nativa de Codex, modelado de carga útil compatible con razonamiento
  y gestión de contexto de respuestas.
- OpenRouter usa `catalog` más `resolveDynamicModel` y
  `prepareDynamicModel` porque el proveedor es de paso y puede exponer nuevos
  identificadores de modelo antes de que se actualice el catálogo estático de OpenClaw; también usa
  `capabilities`, `wrapStreamFn` y `isCacheTtlEligible` para mantener
  los encabezados de solicitud específicos del proveedor, los metadatos de enrutamiento, los parches de razonamiento y la
  política de caché de solicitudes fuera del núcleo. Su política de repetición proviene de la
  familia `passthrough-gemini`, mientras que la familia de flujo `openrouter-thinking`
  posee la inyección de razonamiento de proxy y los saltos de modelos no compatibles / `auto`.
- GitHub Copilot usa `catalog`, `auth`, `resolveDynamicModel` y
  `capabilities` más `prepareRuntimeAuth` y `fetchUsageSnapshot` porque
  necesita inicio de sesión de dispositivo propiedad del proveedor, comportamiento de reserva del modelo,
  peculiaridades de las transcripciones de Claude, un intercambio de token de GitHub -> token de Copilot
  y un endpoint de uso propiedad del proveedor.
- OpenAI Codex usa `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` y `augmentModelCatalog` más
  `prepareExtraParams`, `resolveUsageAuth` y `fetchUsageSnapshot` porque
  todavía se ejecuta en transportes principales de OpenAI pero posee su propia normalización de transporte/URL base,
  política de reserva de actualización de OAuth, elección de transporte predeterminada,
  filas sintéticas del catálogo de Codex e integración del endpoint de uso de ChatGPT; comparte
  la misma familia de flujo `openai-responses-defaults` que OpenAI directo.
- Google AI Studio y Gemini CLI OAuth usan `resolveDynamicModel`,
  `buildReplayPolicy`, `sanitizeReplayHistory`,
  `resolveReasoningOutputMode`, `wrapStreamFn` y `isModernModelRef` porque la
  familia de replay `google-gemini` posee la reserva de compatibilidad hacia adelante de Gemini 3.1,
  la validación de replay nativa de Gemini, la saneación de replay de arranque,
  el modo de salida de razonamiento etiquetado y la coincidencia de modelos modernos,
  mientras que la familia de stream `google-thinking` posee la normalización de
  payloads de pensamiento de Gemini; Gemini CLI OAuth también usa `formatApiKey`,
  `resolveUsageAuth` y `fetchUsageSnapshot` para el formateo de tokens,
  el análisis de tokens y el cableado del endpoint de cuota.
- Anthropic Vertex usa `buildReplayPolicy` a través de la
  familia de replay `anthropic-by-model` para que la limpieza de replay específica de Claude
  permanezca limitada a los ids de Claude en lugar de cada transporte `anthropic-messages`.
- Amazon Bedrock usa `buildReplayPolicy`, `matchesContextOverflowError`,
  `classifyFailoverReason` y `resolveDefaultThinkingLevel` porque posee la clasificación
  de errores de limitación/no listo/desbordamiento de contexto específicos de Bedrock
  para el tráfico de Anthropic-on-Bedrock; su política de replay aún comparte el mismo
  guardia `anthropic-by-model` solo de Claude.
- OpenRouter, Kilocode, Opencode y Opencode Go usan `buildReplayPolicy`
  a través de la familia de replay `passthrough-gemini` porque actúan como proxy de modelos
  Gemini a través de transportes compatibles con OpenAI y necesitan la saneación de
  firmas de pensamiento de Gemini sin validación de replay nativa de Gemini o
  reescrituras de arranque.
- MiniMax usa `buildReplayPolicy` a través de la
  familia de replay `hybrid-anthropic-openai` porque un proveedor posee tanto la
  semántica de mensajes de Anthropic como la compatible con OpenAI; mantiene la eliminación
  de bloques de pensamiento solo de Claude en el lado de Anthropic mientras sobrescribe
  el modo de salida de razonamiento de vuelta a nativo, y la familia de stream
  `minimax-fast-mode` posee las reescrituras de modelos en modo rápido en la
  ruta de stream compartida.
- Moonshot usa `catalog` más `wrapStreamFn` porque todavía usa el transporte
  OpenAI compartido pero necesita normalización de carga útil de pensamiento propiedad del proveedor; la familia de
  flujos `moonshot-thinking` asigna la configuración más el estado `/think` a su
  carga útil de pensamiento binaria nativa.
- Kilocode usa `catalog`, `capabilities`, `wrapStreamFn` y
  `isCacheTtlEligible` porque necesita encabezados de solicitud propiedad del proveedor,
  normalización de carga útil de razonamiento, pistas de transcripción Gemini y control de
  caché-TTL de Anthropic; la familia de flujos `kilocode-thinking` mantiene la inyección de pensamiento
  de Kilo en la ruta del flujo de proxy compartido mientras omite `kilo/auto` y
  otros IDs de modelos proxy que no soportan cargas útiles de razonamiento explícitas.
- Z.AI usa `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` y `fetchUsageSnapshot` porque posee el respaldo GLM-5,
  valores predeterminados `tool_stream`, UX de pensamiento binario, coincidencia de modelos modernos y tanto la
  autenticación de uso como la obtención de cuotas; la familia de flujos `tool-stream-default-on` mantiene
  el contenedor `tool_stream` activado por defecto fuera del "glue" (pegamento) escrito a mano por proveedor.
- xAI usa `normalizeResolvedModel`, `normalizeTransport`,
  `contributeResolvedModelCompat`, `prepareExtraParams`, `wrapStreamFn`,
  `resolveSyntheticAuth`, `resolveDynamicModel` y `isModernModelRef`
  porque posee la normalización de transporte de respuestas xAI nativa, reescrituras de alias del modo rápido
  de Grok, `tool_stream` predeterminado, limpieza de herramientas estrictas / cargas útiles de razonamiento,
  reutilización de autenticación de respaldo para herramientas propiedad del plugin, resolución de modelo Grok con
  compatibilidad futura y parches de compatibilidad propiedad del proveedor tales como el perfil de esquema de herramientas xAI,
  palabras clave de esquema no soportadas, `web_search` nativo
  y decodificación de argumentos de llamada a herramienta de entidades HTML.
- Mistral, OpenCode Zen y OpenCode Go usan `capabilities` solo para mantener
  las peculiaridades de la transcripción/herramientas fuera del núcleo.
- Los proveedores empaquetados solo de catálogo como `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` usan
  solo `catalog`.
- Qwen usa `catalog` para su proveedor de texto, además de registros compartidos de comprensión de medios
  y generación de video para sus superficies multimodales.
- MiniMax y Xiaomi usan `catalog` además de ganchos de uso porque su comportamiento `/usage`
  es propiedad del complemento, aunque la inferencia aún se ejecuta a través de los
  transportes compartidos.

## Asistentes de tiempo de ejecución

Los complementos pueden acceder a ciertos asistentes principales a través de `api.runtime`. Para TTS:

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

Notas:

- `textToSpeech` devuelve la carga útil de salida de TTS del núcleo normal para superficies de archivo/nota de voz.
- Utiliza la configuración principal `messages.tts` y la selección de proveedor.
- Devuelve el búfer de audio PCM + la tasa de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
- `listVoices` es opcional por proveedor. Úselo para selectores de voz o flujos de configuración propiedad del proveedor.
- Las listas de voces pueden incluir metadatos más enriquecidos, como configuración regional, género y etiquetas de personalidad para selectores que reconocen el proveedor.
- OpenAI y ElevenLabs admiten telefonía hoy en día. Microsoft no.

Los complementos también pueden registrar proveedores de voz a través de `api.registerSpeechProvider(...)`.

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

Notas:

- Mantenga la política, la reserva y la entrega de respuestas de TTS en el núcleo.
- Use proveedores de voz para el comportamiento de síntesis propiedad del proveedor.
- La entrada `edge` heredada de Microsoft se normaliza al id. de proveedor `microsoft`.
- El modelo de propiedad preferido está orientado a la empresa: un complemento de proveedor puede ser propietario
  de proveedores de texto, voz, imagen y medios futuros a medida que OpenClaw añada esos
  contratos de capacidad.

Para la comprensión de imagen/audio/video, los complementos registran un proveedor de comprensión de medios con tipo en lugar de una bolsa genérica de clave/valor:

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

Notas:

- Mantenga la orquestación, la reserva (fallback), la configuración y el cableado del canal en el núcleo (core).
- Mantenga el comportamiento del proveedor en el complemento del proveedor.
- La expansión aditiva debe permanecer tipada: nuevos métodos opcionales, nuevos campos de resultados opcionales, nuevas capacidades opcionales.
- La generación de video ya sigue el mismo patrón:
  - el núcleo posee el contrato de capacidad y el asistente de tiempo de ejecución
  - los complementos de proveedores registran `api.registerVideoGenerationProvider(...)`
  - los complementos de características/canales consumen `api.runtime.videoGeneration.*`

Para los asistentes de tiempo de ejecución de comprensión de medios, los complementos pueden llamar:

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});
```

Para la transcripción de audio, los complementos pueden usar tanto el tiempo de ejecución de comprensión de medios como el alias STT anterior:

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notas:

- `api.runtime.mediaUnderstanding.*` es la superficie compartida preferida para la comprensión de imagen/audio/video.
- Usa la configuración de audio de comprensión de medios del núcleo (`tools.media.audio`) y el orden de reserva de proveedores.
- Devuelve `{ text: undefined }` cuando no se produce ninguna salida de transcripción (por ejemplo, entrada omitida/no admitida).
- `api.runtime.stt.transcribeAudioFile(...)` permanece como un alias de compatibilidad.

Los complementos también pueden iniciar ejecuciones de subagentes en segundo plano a través de `api.runtime.subagent`:

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

Notas:

- `provider` y `model` son anulaciones opcionales por ejecución, no cambios persistentes de sesión.
- OpenClaw solo respeta esos campos de anulación para llamadores confiables.
- Para las ejecuciones de reserva propiedad del complemento, los operadores deben aceptar explícitamente con `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Use `plugins.entries.<id>.subagent.allowedModels` para restringir los complementos de confianza a objetivos `provider/model` canónicos específicos, o `"*"` para permitir cualquier objetivo explícitamente.
- Las ejecuciones de subagentes de complementos no confiables aún funcionan, pero las solicitudes de anulación se rechazan en lugar de realizar una reserva silenciosa.

Para la búsqueda web, los complementos pueden consumir el asistente de tiempo de ejecución compartido en lugar de acceder al cableado de la herramienta del agente:

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

Los complementos también pueden registrar proveedores de búsqueda web a través de `api.registerWebSearchProvider(...)`.

Notas:

- Mantenga la selección del proveedor, la resolución de credenciales y la semántica de solicitud compartida en el núcleo (core).
- Use proveedores de búsqueda web para transportes de búsqueda específicos del proveedor.
- `api.runtime.webSearch.*` es la superficie compartida preferida para los plugins de características/canales que necesitan comportamiento de búsqueda sin depender del wrapper de herramientas del agente.

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)`: genera una imagen usando la cadena de proveedores de generación de imágenes configurada.
- `listProviders(...)`: lista los proveedores de generación de imágenes disponibles y sus capacidades.

## Rutas HTTP del Gateway

Los plugins pueden exponer endpoints HTTP con `api.registerHttpRoute(...)`.

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

Campos de ruta:

- `path`: ruta de acceso bajo el servidor HTTP del gateway.
- `auth`: obligatorio. Usa `"gateway"` para requerir la autenticación normal del gateway, o `"plugin"` para la autenticación/verificación de webhooks gestionada por el plugin.
- `match`: opcional. `"exact"` (por defecto) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo plugin reemplace su propio registro de ruta existente.
- `handler`: devuelve `true` cuando la ruta manejó la solicitud.

Notas:

- `api.registerHttpHandler(...)` se eliminó y causará un error de carga del plugin. Usa `api.registerHttpRoute(...)` en su lugar.
- Las rutas de los plugins deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un plugin no puede reemplazar la ruta de otro plugin.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantén las cadenas de reserva de `exact`/`prefix` solo en el mismo nivel de autenticación.
- Las rutas `auth: "plugin"` **no** reciben automáticamente los alcances de ejecución del operador. Son para la verificación de webhooks/firmas gestionada por el plugin, no para llamadas privilegiadas a los asistentes del Gateway.
- Las rutas `auth: "gateway"` se ejecutan dentro de un alcance de ejecución de solicitud del Gateway, pero ese alcance es intencionalmente conservador:
  - la autenticación portadora de secreto compartido (`gateway.auth.mode = "token"` / `"password"`) mantiene los ámbitos de tiempo de ejecución de la ruta del plugin fijados a `operator.write`, incluso si el llamador envía `x-openclaw-scopes`
  - los modos HTTP de identidad de confianza (por ejemplo `trusted-proxy` o `gateway.auth.mode = "none"` en un ingreso privado) respetan `x-openclaw-scopes` solo cuando el encabezado está explícitamente presente
  - si `x-openclaw-scopes` está ausente en esas solicitudes de ruta de plugin con identidad, el ámbito de tiempo de ejecución vuelve a `operator.write`
- Regla práctica: no asuma que una ruta de plugin con autenticación de puerta de enlace es una superficie de administrador implícita. Si su ruta necesita un comportamiento exclusivo de administrador, requiera un modo de autenticación con identidad y documente el contrato explícito del encabezado `x-openclaw-scopes`.

## Rutas de importación del SDK de complementos

Use las subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` al
crear complementos:

- `openclaw/plugin-sdk/plugin-entry` para primitivas de registro de complementos.
- `openclaw/plugin-sdk/core` para el contrato genérico compartido orientado al complemento.
- `openclaw/plugin-sdk/config-schema` para la exportación del esquema Zod `openclaw.json` raíz
  (`OpenClawSchema`).
- Primitivas de canal estables como `openclaw/plugin-sdk/channel-setup`,
  `openclaw/plugin-sdk/setup-runtime`,
  `openclaw/plugin-sdk/setup-adapter-runtime`,
  `openclaw/plugin-sdk/setup-tools`,
  `openclaw/plugin-sdk/channel-pairing`,
  `openclaw/plugin-sdk/channel-contract`,
  `openclaw/plugin-sdk/channel-feedback`,
  `openclaw/plugin-sdk/channel-inbound`,
  `openclaw/plugin-sdk/channel-lifecycle`,
  `openclaw/plugin-sdk/channel-reply-pipeline`,
  `openclaw/plugin-sdk/command-auth`,
  `openclaw/plugin-sdk/secret-input` y
  `openclaw/plugin-sdk/webhook-ingress` para el cableado compartido de configuración/autenticación/respuesta/webhook.
  `channel-inbound` es el hogar compartido para la eliminación de rebote (debounce), la coincidencia de menciones,
  el formateo de sobres y los asistentes de contexto de sobres entrantes.
  `channel-setup` es la costura (seam) de configuración de instalación opcional estrecha.
  `setup-runtime` es la superficie de configuración segura en tiempo de ejecución utilizada por `setupEntry` /
  el inicio diferido, que incluye los adaptadores de parches de configuración seguros para la importación.
  `setup-adapter-runtime` es la costura del adaptador de configuración de cuenta consciente del entorno.
  `setup-tools` es la pequeña costura de asistentes de CLI/archivo/docs (`formatCliCommand`,
  `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`,
  `CONFIG_DIR`).
- Subrutas de dominio como `openclaw/plugin-sdk/channel-config-helpers`,
  `openclaw/plugin-sdk/allow-from`,
  `openclaw/plugin-sdk/channel-config-schema`,
  `openclaw/plugin-sdk/telegram-command-config`,
  `openclaw/plugin-sdk/channel-policy`,
  `openclaw/plugin-sdk/approval-runtime`,
  `openclaw/plugin-sdk/config-runtime`,
  `openclaw/plugin-sdk/infra-runtime`,
  `openclaw/plugin-sdk/agent-runtime`,
  `openclaw/plugin-sdk/lazy-runtime`,
  `openclaw/plugin-sdk/reply-history`,
  `openclaw/plugin-sdk/routing`,
  `openclaw/plugin-sdk/status-helpers`,
  `openclaw/plugin-sdk/text-runtime`,
  `openclaw/plugin-sdk/runtime-store` y
  `openclaw/plugin-sdk/directory-runtime` para asistentes de configuración/ejecución compartida.
  `telegram-command-config` es la costura pública estrecha para la normalización/validación
  de comandos personalizados de Telegram y permanece disponible incluso si la
  superficie del contrato de Telegram incluido no está disponible temporalmente.
  `text-runtime` es la costura compartida de texto/markdown/registro, que incluye
  el despojo de texto visible para el asistente, asistentes de representación/fragmentación de markdown,
  asistentes de redacción, asistentes de etiquetas de directiva y utilidades de texto seguro.
- Las costuras del canal específicas de aprobación deben preferir un contrato `approvalCapability`
  en el complemento. El núcleo luego lee la autenticación, entrega, representación y comportamiento de
  enrutamiento nativo de la aprobación a través de esa única capacidad en lugar de mezclar
  el comportamiento de aprobación en campos de complementos no relacionados.
- `openclaw/plugin-sdk/channel-runtime` está obsoleto y permanece solo como una
  capa de compatibilidad para complementos más antiguos. El código nuevo debe importar las primitivas
  genéricas más estrechas en su lugar, y el código del repositorio no debe agregar nuevas importaciones de la
  capa.
- Los internos de las extensiones incluidas permanecen privados. Los complementos externos deben usar solo
  subrutas `openclaw/plugin-sdk/*`. El código principal/prueba de OpenClaw puede usar los puntos de entrada
  públicos del repositorio bajo una raíz de paquete de complemento como `index.js`, `api.js`,
  `runtime-api.js`, `setup-entry.js` y archivos de alcance limitado como
  `login-qr-api.js`. Nunca importe un `src/*` de un paquete de complementos desde el núcleo o desde
  otra extensión.
- División del punto de entrada del repositorio:
  `<plugin-package-root>/api.js` es el barril de ayudantes/tipos,
  `<plugin-package-root>/runtime-api.js` es el barril solo de tiempo de ejecución,
  `<plugin-package-root>/index.js` es el punto de entrada del complemento empaquetado,
  y `<plugin-package-root>/setup-entry.js` es el punto de entrada del complemento de configuración.
- Ejemplos actuales de proveedores empaquetados:
  - Anthropic usa `api.js` / `contract-api.js` para ayudantes de flujo de Claude como
    `wrapAnthropicProviderStream`, ayudantes de encabezados beta, y análisis de
    `service_tier`.
  - OpenAI usa `api.js` para constructores de proveedores, ayudantes de modelo por
    defecto, y constructores de proveedores en tiempo real.
  - OpenRouter usa `api.js` para su constructor de proveedores más ayudantes de
    incorporación/configuración, mientras que `register.runtime.js` aún puede reexportar
    ayudantes genéricos `plugin-sdk/provider-stream` para uso local en el repositorio.
- Los puntos de entrada públicos cargados por fachada prefieren la instantánea de configuración
  de tiempo de ejecución activa cuando existe una, luego recurren al archivo de configuración
  resuelto en disco cuando OpenClaw aún no está sirviendo una instantánea de tiempo de ejecución.
- Las primitivas compartidas genéricas siguen siendo el contrato público del SDK preferido.
  Aún existe un pequeño conjunto de compatibilidad reservado de costuras de ayudantes
  con marca de canal empaquetado. Trate esas como costuras de mantenimiento/compatibilidad
  empaquetados, no como nuevos objetivos de importación de terceros; los nuevos contratos
  entre canales aún deben aterrizar en subrutas genéricas `plugin-sdk/*` o en
  los barriles locales del complemento `api.js` / `runtime-api.js`.

Nota de compatibilidad:

- Evite el barril raíz `openclaw/plugin-sdk` para código nuevo.
- Prefiera primero las primitivas estables estrechas. Las subrutas más nuevas de
  configuración/emparejamiento/respuesta/comentarios/contrato/entrada/hilos/comando/
  entrada-secreta/webhook/infra/lista-permitida/estado/herramienta-mensaje son el contrato
  previsto para el nuevo trabajo de complementos empaquetados y externos.
  El análisis/emparejamiento de objetivos pertenece a `openclaw/plugin-sdk/channel-targets`.
  Las compuertas de acción de mensaje y los ayudantes de id de mensaje de reacción
  pertenecen a `openclaw/plugin-sdk/channel-actions`.
- Los barriles de ayudantes específicos de extensiones empaquetadas no son estables por defecto. Si un ayudante solo es necesario para una extensión empaquetada, manténgalo detrás de la costura local `api.js` o `runtime-api.js` de la extensión en lugar de promoverlo a `openclaw/plugin-sdk/<extension>`.
- Las nuevas costuras de ayudantes compartidos deben ser genéricas, no con marca de canal. El análisis compartido de objetivos pertenece a `openclaw/plugin-sdk/channel-targets`; los internos específicos del canal se mantienen detrás de la costura local `api.js` o `runtime-api.js` del propietario del complemento.
- Las subrutas específicas de capacidades como `image-generation`, `media-understanding` y `speech` existen porque los complementos empaquetados/nativos las usan hoy. Su presencia no significa por sí sola que cada ayudante exportado sea un contrato externo congelado a largo plazo.

## Esquemas de herramientas de mensajes

Los complementos deben ser propietarios de las contribuciones de esquema `describeMessageTool(...)` específicas del canal. Mantenga los campos específicos del proveedor en el complemento, no en el núcleo compartido.

Para fragmentos de esquemas portátiles compartidos, reutilice los ayudantes genéricos exportados a través de `openclaw/plugin-sdk/channel-actions`:

- `createMessageToolButtonsSchema()` para cargas útiles estilo cuadrícula de botones
- `createMessageToolCardSchema()` para cargas útiles de tarjetas estructuradas

Si una forma de esquema solo tiene sentido para un proveedor, defínala en la fuente propia de ese complemento en lugar de promoverla al SDK compartido.

## Resolución de objetivos del canal

Los complementos del canal deben ser propietarios de la semántica de objetivo específica del canal. Mantenga el host de salida compartido genérico y use la superficie del adaptador de mensajería para las reglas del proveedor:

- `messaging.inferTargetChatType({ to })` decide si un objetivo normalizado debe tratarse como `direct`, `group` o `channel` antes de la búsqueda en el directorio.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indica al núcleo si una entrada debe saltar directamente a la resolución tipo id en lugar de la búsqueda en el directorio.
- `messaging.targetResolver.resolveTarget(...)` es el respaldo del complemento cuando el núcleo necesita una resolución final propiedad del proveedor después de la normalización o después de una falta en el directorio.
- `messaging.resolveOutboundSessionRoute(...)` posee la construcción de rutas de sesión específicas del proveedor una vez que se resuelve un objetivo.

División recomendada:

- Use `inferTargetChatType` para las decisiones de categoría que deben ocurrir antes de buscar pares/grupos.
- Use `looksLikeId` para las comprobaciones de "tratar esto como un id de destino explícito/nativo".
- Use `resolveTarget` para la alternativa de normalización específica del proveedor, no para una búsqueda amplia en el directorio.
- Mantenga los ids nativos del proveedor, como ids de chat, ids de hilos, JIDs, identificadores (handles) e ids de sala, dentro de los valores `target` o parámetros específicos del proveedor, no en campos genéricos del SDK.

## Directorios respaldados por configuración

Los complementos que derivan entradas de directorio de la configuración deben mantener esa lógica en el complemento y reutilizar los asistentes compartidos de `openclaw/plugin-sdk/directory-runtime`.

Use esto cuando un canal necesite pares/grupos respaldados por configuración, tales como:

- pares de MD impulsados por lista de permitidos
- mapas de canal/grupo configurados
- alternativas de directorio estático con alcance de cuenta

Los asistentes compartidos en `directory-runtime` solo manejan operaciones genéricas:

- filtrado de consultas
- aplicación de límites
- asistentes de deduplicación/normalización
- construcción de `ChannelDirectoryEntry[]`

La inspección de cuenta específica del canal y la normalización de ids deben permanecer en la implementación del complemento.

## Catálogos de proveedores

Los complementos de proveedores pueden definir catálogos de modelos para inferencia con `registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma estructura que OpenClaw escribe en `models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento sea propietario de ids de modelo específicos del proveedor, valores predeterminados de URL base o metadatos de modelo restringidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores de clave API simple o impulsados por entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedor relacionadas
- `late`: última pasada, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de claves, por lo que los complementos pueden anular intencionalmente una entrada de proveedor integrada con el mismo id de proveedor.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado
- si tanto `catalog` como `discovery` están registrados, OpenClaw usa `catalog`

## Inspección de canal de solo lectura

Si su complemento registra un canal, prefiera implementar
`plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de ejecución. Se permite asumir que las credenciales
  están totalmente materializadas y puede fallar rápido cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura como `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, y los flujos de reparación
  de doctor/config no deberían necesitar materializar credenciales de tiempo de ejecución solo para
  describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devolver solo el estado descriptivo de la cuenta.
- Conservar `enabled` y `configured`.
- Incluir campos de origen/estado de credenciales cuando sea relevante, tales como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No necesita devolver valores de token sin procesar solo para reportar disponibilidad
  de solo lectura. Devolver `tokenStatus: "available"` (y el campo de origen
  coincidente) es suficiente para comandos de estilo de estado.
- Use `configured_unavailable` cuando una credencial esté configurada a través de SecretRef pero
  no esté disponible en la ruta de comando actual.

Esto permite que los comandos de solo lectura reporten "configurado pero no disponible en esta ruta
de comando" en lugar de fallar o reportar erróneamente la cuenta como no configurada.

## Paquetes de paquetes

Un directorio de complementos puede incluir un `package.json` con `openclaw.extensions`:

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

Cada entrada se convierte en un complemento. Si el paquete enumera múltiples extensiones, el id del complemento
se convierte en `name/<fileBase>`.

Si tu complemento importa dependencias de npm, instálalas en ese directorio para que
`node_modules` esté disponible (`npm install` / `pnpm install`).

Guardrail de seguridad: cada entrada `openclaw.extensions` debe permanecer dentro del directorio del
complemento después de la resolución de enlaces simbólicos. Las entradas que salen del directorio del paquete son
rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias del complemento con
`npm install --omit=dev --ignore-scripts` (sin scripts de ciclo de vida, sin dependencias de desarrollo en tiempo de ejecución). Mantén los árboles de dependencias
del complemento como "JS/TS puro" y evita paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración.
Cuando OpenClaw necesita superficies de configuración para un complemento de canal deshabilitado, o
cuando un complemento de canal está habilitado pero aún no configurado, carga `setupEntry`
en lugar de la entrada completa del complemento. Esto mantiene el inicio y la configuración más ligeros
cuando tu entrada principal del complemento también conecta herramientas, ganchos u otro código
exclusivo del tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
puede optar a un complemento de canal por la misma ruta `setupEntry` durante la fase de inicio
previo a la escucha del gateway, incluso cuando el canal ya está configurado.

Usa esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir
antes de que el gateway comience a escuchar. En la práctica, eso significa que la entrada de configuración
debe registrar cada capacidad propiedad del canal de la cual depende el inicio, tales como:

- el registro del canal en sí mismo
- cualquier ruta HTTP que deba estar disponible antes de que el gateway comience a escuchar
- cualquier método, herramienta o servicio del gateway que deba existir durante esa misma ventana

Si tu entrada completa todavía posee alguna capacidad de inicio requerida, no habilites
este indicador. Mantén el complemento con el comportamiento predeterminado y deja que OpenClaw cargue la
entrada completa durante el inicio.

Los canales agrupados también pueden publicar auxiliares de superficie de contrato solo de configuración que el núcleo
puede consultar antes de que se cargue el tiempo de ejecución completo del canal. La superficie actual de
promoción de configuración es:

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Core usa esa superficie cuando necesita promover una configuración de canal de cuenta única heredada a `channels.<id>.accounts.*` sin cargar la entrada completa del complemento. Matrix es el ejemplo empaquetado actual: mueve solo las claves de autenticación/inicialización a una cuenta promovida con nombre cuando las cuentas con nombre ya existen, y puede preservar una clave de cuenta predeterminada configurada no canónica en lugar de siempre crear `accounts.default`.

Esos adaptadores de parches de configuración mantienen el descubrimiento de superficie de contrato empaquetado de forma diferida. El tiempo de importación se mantiene ligero; la superficie de promoción se carga solo en el primer uso en lugar de volver a entrar en el inicio del canal empaquetado al importar el módulo.

Cuando esas superficies de inicio incluyen métodos RPC de puerta de enlace, manténgalas en un prefijo específico del complemento. Los espacios de nombres de administración de Core (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre se resuelven en `operator.admin`, incluso si un complemento solicita un alcance más estrecho.

Ejemplo:

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### Metadatos del catálogo de canales

Los complementos de canal pueden anunciar metadatos de configuración/descubrimiento a través de `openclaw.channel` e indicaciones de instalación a través de `openclaw.install`. Esto mantiene los datos del catálogo principal libres.

Ejemplo:

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

Campos `openclaw.channel` útiles además del ejemplo mínimo:

- `detailLabel`: etiqueta secundaria para superficies de catálogo/estado más ricas
- `docsLabel`: anular el texto del enlace para el enlace de documentación
- `preferOver`: ids de complemento/canal de menor prioridad que esta entrada de catálogo debería superar
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras`: controles de copia de la superficie de selección
- `markdownCapable`: marca el canal como capaz de usar markdown para decisiones de formato de salida
- `exposure.configured`: oculta el canal de las superficies de listado de canales configurados cuando se establece en `false`
- `exposure.setup`: oculta el canal de los selectores de configuración/configuración interactiva cuando se establece en `false`
- `exposure.docs`: marca el canal como interno/privado para las superficies de navegación de la documentación
- `showConfigured` / `showInSetup`: alias heredados aún aceptados por compatibilidad; se prefiere `exposure`
- `quickstartAllowFrom`: incluir el canal en el flujo de inicio rápido estándar `allowFrom`
- `forceAccountBinding`: requerir vinculación explícita de la cuenta incluso cuando solo existe una cuenta
- `preferSessionLookupForAnnounceTarget`: preferir la búsqueda de sesión al resolver los objetivos de anuncio

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación del registro MPM). Coloque un archivo JSON en una de las siguientes ubicaciones:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas, punto y coma o `PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. El analizador también acepta `"packages"` o `"plugins"` como alias heredados para la clave `"entries"`.

## Plugins del motor de contexto

Los plugins del motor de contexto poseen la orquestación del contexto de sesión para ingesta, ensamblaje
y compactación. Regístrelos desde su plugin con
`api.registerContextEngine(id, factory)`, luego seleccione el motor activo con
`plugins.slots.contextEngine`.

Use esto cuando su plugin necesite reemplazar o extender la canalización de contexto predeterminada
en lugar de simplemente agregar búsqueda de memoria o ganchos.

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

Si su motor **no** posee el algoritmo de compactación, mantenga `compact()`
implementado y delegúelo explícitamente:

```ts
import { delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", () => ({
    info: {
      id: "my-memory-engine",
      name: "My Memory Engine",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## Agregar una nueva capacidad

Cuando un plugin necesita un comportamiento que no se ajusta a la API actual, no omita
el sistema de plugins con un acceso privado. Agregue la capacidad faltante.

Secuencia recomendada:

1. definir el contrato principal
   Decida qué comportamiento compartido debe poseer el núcleo: política, respaldo, fusión de configuración,
   ciclo de vida, semántica orientada al canal y forma del asistente de tiempo de ejecución.
2. agregar superficies de registro/tiempo de ejecución de plugins tipadas
   Extienda `OpenClawPluginApi` y/o `api.runtime` con la superficie de capacidad tipada
   más pequeña y útil.
3. conectar el núcleo + consumidores de canal/característica
   Los canales y los complementos de características deben consumir la nueva capacidad a través del núcleo,
   no importando directamente una implementación de proveedor.
4. registrar implementaciones de proveedores
   Los complementos de proveedores luego registran sus backends contra la capacidad.
5. agregar cobertura del contrato
   Agregue pruebas para que la propiedad y la forma del registro permanezcan explícitas con el tiempo.

Así es como OpenClaw mantiene su criterio sin volverse rígido a la visión del mundo de un
proveedor. Consulte el [Cookbook de capacidades](/en/tools/capability-cookbook)
para obtener una lista de verificación de archivos concreta y un ejemplo práctico.

### Lista de verificación de capacidades

Cuando agrega una nueva capacidad, la implementación generalmente debe tocar estas
superfices juntas:

- tipos de contrato central en `src/<capability>/types.ts`
- asistente de ejecución/ejecución central en `src/<capability>/runtime.ts`
- superficie de registro de API de complementos en `src/plugins/types.ts`
- cableado del registro de complementos en `src/plugins/registry.ts`
- exposición del tiempo de ejecución del complemento en `src/plugins/runtime/*` cuando los complementos de
  características/canal necesitan consumirlo
- asistentes de captura/prueba en `src/test-utils/plugin-registration.ts`
- afirmaciones de propiedad/contrato en `src/plugins/contracts/registry.ts`
- documentación del operador/complemento en `docs/`

Si falta una de esas superficies, eso generalmente es una señal de que la capacidad aún
no está completamente integrada.

### Plantilla de capacidad

Patrón mínimo:

```ts
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

Patrón de prueba de contrato:

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

Eso mantiene la regla simple:

- el núcleo posee el contrato de capacidad + la orquestación
- los complementos de proveedores poseen las implementaciones de proveedores
- los complementos de características/canal consumen asistentes de tiempo de ejecución
- las pruebas de contrato mantienen la propiedad explícita
