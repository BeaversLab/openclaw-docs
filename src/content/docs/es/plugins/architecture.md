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
  Esta es la **referencia de arquitectura profunda**. Para guías prácticas, consulte: - [Install and use plugins](/en/tools/plugin) — guía de usuario - [Getting Started](/en/plugins/building-plugins) — primer tutorial de plugins - [Channel Plugins](/en/plugins/sdk-channel-plugins) — crear un canal de mensajería - [Provider Plugins](/en/plugins/sdk-provider-plugins) — crear un proveedor de modelos
  - [SDK Overview](/en/plugins/sdk-overview) — mapa de importación y API de registro
</Info>

Esta página cubre la arquitectura interna del sistema de plugins de OpenClaw.

## Modelo de capacidad pública

Las capacidades son el modelo de **plugin nativo** público dentro de OpenClaw. Cada
plugin nativo de OpenClaw se registra contra uno o más tipos de capacidad:

| Capacidad                    | Método de registro                               | Plugins de ejemplo                   |
| ---------------------------- | ------------------------------------------------ | ------------------------------------ |
| Inferencia de texto          | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| Backend de inferencia de CLI | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
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
servicios es un plugin **solo de hooks heredados** (legacy hook-only). Ese patrón todavía es totalmente compatible.

### Postura de compatibilidad externa

El modelo de capacidades está consolidado en el núcleo y es utilizado por los plugins incluidos/nativos
en la actualidad, pero la compatibilidad de los plugins externos aún necesita un estándar más estricto que "está
exportado, por lo tanto está congelado".

Orientación actual:

- **plugins externos existentes:** mantener funcionando las integraciones basadas en hooks; tratar
  esto como la línea base de compatibilidad
- **nuevos plugins incluidos/nativos:** preferir el registro explícito de capacidades antes que
  extensiones específicas del proveedor o nuevos diseños solo de hooks
- **external plugins adopting capability registration:** permitido, pero trate las
  superficies auxiliares específicas de la capacidad como en evolución a menos que los documentos marquen explícitamente un
  contrato como estable

Regla práctica:

- las APIs de registro de capacidades son la dirección prevista
- los hooks heredados siguen siendo la ruta más segura sin interrupciones para complementos externos durante
  la transición
- las subrutas auxiliares exportadas no son todas iguales; prefiera el contrato documentado
  estrecho, no las exportaciones auxiliares incidentales

### Plugin shapes

OpenClaw clasifica cada complemento cargado en una forma basada en su comportamiento real
de registro (no solo metadatos estáticos):

- **plain-capability** -- registra exactamente un tipo de capacidad (por ejemplo, un
  complemento solo de proveedor como `mistral`)
- **hybrid-capability** -- registra múltiples tipos de capacidades (por ejemplo,
  `openai` posee inferencia de texto, voz, comprensión multimedia y generación
  de imágenes)
- **hook-only** -- registra solo hooks (tipados o personalizados), sin capacidades,
  herramientas, comandos o servicios
- **non-capability** -- registra herramientas, comandos, servicios o rutas, pero sin
  capacidades

Use `openclaw plugins inspect <id>` para ver la forma y el desglose de capacidades
de un plugin. Consulte [CLI reference](/en/cli/plugins#inspect) para obtener detalles.

### Legacy hooks

El hook `before_agent_start` sigue siendo compatible como una ruta de compatibilidad para
complementos solo de hook. Los complementos heredados del mundo real aún dependen de él.

Dirección:

- mantenerlo funcionando
- documentarlo como heredado
- preferir `before_model_resolve` para el trabajo de anulación de modelo/proveedor
- preferir `before_prompt_build` para el trabajo de mutación de mensajes
- eliminar solo después de que el uso real disminuya y la cobertura de dispositivos demuestre la seguridad de la migración

### Compatibility signals

Cuando ejecuta `openclaw doctor` o `openclaw plugins inspect <id>`, puede ver
una de estas etiquetas:

| Signal                     | Meaning                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| **config valid**           | La configuración se analiza bien y los complementos se resuelven       |
| **compatibility advisory** | El complemento usa un patrón compatible pero antiguo (ej. `hook-only`) |
| **legacy warning**         | El complemento usa `before_agent_start`, que está obsoleto             |
| **hard error**             | La configuración no es válida o el complemento no se pudo cargar       |

Ni `hook-only` ni `before_agent_start` romperán tu complemento hoy --
`hook-only` es consultivo, y `before_agent_start` solo activa una advertencia. Estas
señales también aparecen en `openclaw status --all` y `openclaw plugins doctor`.

## Resumen de la arquitectura

El sistema de complementos de OpenClaw tiene cuatro capas:

1. **Manifiesto + descubrimiento**
   OpenClaw encuentra complementos candidatos desde las rutas configuradas, raíces del espacio de trabajo,
   raíces de extensiones globales y extensiones empaquetadas. El descubrimiento lee los manifiestos nativos
   `openclaw.plugin.json` además de los manifiestos de paquetes compatibles primero.
2. **Habilitación + validación**
   El núcleo decide si un complemento descubierto está habilitado, deshabilitado, bloqueado o
   seleccionado para un espacio exclusivo como la memoria.
3. **Carga en tiempo de ejecución**
   Los complementos nativos de OpenClaw se cargan en proceso a través de jiti y registran
   capacidades en un registro central. Los paquetes compatibles se normalizan en
   registros del sistema sin importar código de tiempo de ejecución.
4. **Consumo de la superficie**
   El resto de OpenClaw lee el registro para exponer herramientas, canales, configuración
   del proveedor, ganchos, rutas HTTP, comandos CLI y servicios.

Para la CLI de complementos específicamente, el descubrimiento de comandos raíz se divide en dos fases:

- los metadatos en tiempo de análisis provienen de `registerCli(..., { descriptors: [...] })`
- el módulo real de la CLI del complemento puede mantenerse diferido y registrarse en la primera invocación

Eso mantiene el código CLI propiedad del complemento dentro del complemento mientras aún permite a OpenClaw
reservar nombres de comandos raíz antes del análisis.

El límite de diseño importante:

- el descubrimiento + validación de configuración debería funcionar desde **metadatos de manifiesto/esquema**
  sin ejecutar código del complemento
- el comportamiento del tiempo de ejecución nativo proviene de la ruta `register(api)` del módulo del complemento

Esa división permite a OpenClaw validar la configuración, explicar complementos faltantes/deshabilitados y
construir sugerencias de interfaz/esquema antes de que el tiempo de ejecución completo esté activo.

### Complementos de canal y la herramienta de mensaje compartida

Los complementos de canal no necesitan registrar una herramienta separada de enviar/editar/reaccionar para
las acciones de chat normales. OpenClaw mantiene una herramienta `message` compartida en el núcleo, y
los complementos de canal son dueños del descubrimiento y ejecución específicos del canal detrás de ella.

El límite actual es:

- el núcleo es propietario del host de la herramienta compartida `message`, el cableado de los prompts, la contabilidad de sesiones/hilos y el despacho de ejecución
- los plugins de canal son propietarios del descubrimiento de acciones con alcance, el descubrimiento de capacidades y cualquier fragmento de esquema específico del canal
- los plugins de canal son propietarios de la gramática de conversación de sesión específica del proveedor, tal como cómo los ids de conversación codifican los ids de hilo o heredan de las conversaciones principales
- los plugins de canal ejecutan la acción final a través de su adaptador de acciones

Para los plugins de canal, la superficie del SDK es `ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento unificada permite que un plugin devuelva sus acciones visibles, capacidades y contribuciones de esquema juntas para que esas piezas no se separen.

El núcleo pasa el alcance de tiempo de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- `requesterSenderId` entrante confiable

Eso es importante para los plugins sensibles al contexto. Un canal puede ocultar o exponer acciones de mensajes basándose en la cuenta activa, la sala/hilo/mensaje actual o la identidad del solicitante de confianza sin codificar ramas específicas del canal en la herramienta central `message`.

Esta es la razón por la que los cambios de enrutamiento del ejecutor integrado (embedded-runner) siguen siendo trabajo de plugins: el ejecutor es responsable de reenviar la identidad actual del chat/sesión hacia el límite de descubrimiento del plugin para que la herramienta compartida `message` exponga la superficie adecuada propiedad del canal para el turno actual.

Para los asistentes de ejecución propiedad del canal, los plugins empaquetados deben mantener el tiempo de ejecución de ejecución dentro de sus propios módulos de extensión. El núcleo ya no posee los tiempos de ejecución de acciones de mensajes de Discord, Slack, Telegram o WhatsApp bajo `src/agents/tools`. No publicamos subrutas `plugin-sdk/*-action-runtime` separadas, y los plugins empaquetados deben importar su propio código de tiempo de ejecución local directamente desde sus módulos propiedad de la extensión.

El mismo límite se aplica a las costuras del SDK nombradas por el proveedor en general: el núcleo no debe importar barriles de convenencia específicos del canal para Slack, Discord, Signal, WhatsApp o extensiones similares. Si el núcleo necesita un comportamiento, consuma el propio barril `api.ts` / `runtime-api.ts` del complemento incluido o promueva la necesidad a una capacidad genérica estrecha en el SDK compartido.

Para las encuestas específicamente, hay dos rutas de ejecución:

- `outbound.sendPoll` es la base compartida para los canales que se ajustan al modelo de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para semánticas de encuesta específicas del canal o parámetros de encuesta adicionales

El núcleo ahora difiere el análisis compartido de encuestas hasta que el despacho de encuestas del complemento decline la acción, para que los manejadores de encuestas propiedad del complemento puedan aceptar campos de encuesta específicos del canal sin ser bloqueados primero por el analizador genérico de encuestas.

Consulte [Load pipeline](#load-pipeline) para ver la secuencia completa de inicio.

## Modelo de propiedad de capacidades

OpenClaw trata un complemento nativo como el límite de propiedad para una **empresa** o una **característica**, no como una bolsa de integraciones no relacionadas.

Eso significa:

- un complemento de empresa generalmente debería ser propietario de todas las superficies de esa empresa orientadas a OpenClaw
- un complemento de características generalmente debería ser propietario de la superficie completa de la característica que introduce
- los canales deben consumir capacidades centrales compartidas en lugar de volver a implementar el comportamiento del proveedor ad hoc

Ejemplos:

- el complemento incluido `openai` es propietario del comportamiento del proveedor de modelos de OpenAI y el comportamiento de voz + voz en tiempo real + comprensión de medios + generación de imágenes de OpenAI
- el complemento incluido `elevenlabs` es propietario del comportamiento de voz de ElevenLabs
- el complemento incluido `microsoft` es propietario del comportamiento de voz de Microsoft
- el complemento incluido `google` es propietario del comportamiento del proveedor de modelos de Google más el comportamiento de comprensión de medios + generación de imágenes + búsqueda web de Google
- el complemento incluido `firecrawl` es propietario del comportamiento de recuperación web de Firecrawl
- los complementos incluidos `minimax`, `mistral`, `moonshot` y `zai` son propietarios de sus backends de comprensión de medios
- el plugin incluido `qwen` posee el comportamiento del proveedor de texto Qwen más
  el comportamiento de comprensión de medios y generación de video
- el plugin `voice-call` es un plugin de características: posee el transporte de llamadas, herramientas,
  CLI, rutas y puente de transmisión de medios de Twilio, pero consume capacidades de voz compartida
  más transcripción en tiempo real y voz en tiempo real en lugar de
  importar plugins de proveedores directamente

El estado final deseado es:

- OpenAI vive en un solo plugin incluso si abarca modelos de texto, voz, imágenes y
  video futuro
- otro proveedor puede hacer lo mismo con su propia área de superficie
- los canales no les importa qué plugin de proveedor posee el proveedor; ellos consumen el
  contrato de capacidad compartida expuesto por el núcleo

Esta es la distinción clave:

- **plugin** = límite de propiedad
- **capacidad** = contrato principal que múltiples plugins pueden implementar o consumir

Entonces, si OpenClaw agrega un nuevo dominio como el video, la primera pregunta no es
"¿qué proveedor debería codificar el manejo de video?". La primera pregunta es "¿cuál es
el contrato de capacidad de video principal?". Una vez que existe ese contrato, los plugins de proveedores
pueden registrarse en él y los plugins de canal/características pueden consumirlo.

Si la capacidad aún no existe, el movimiento correcto suele ser:

1. definir la capacidad faltante en el núcleo
2. exponerla a través de la API/runtime del plugin de una manera tipada
3. conectar canales/características contra esa capacidad
4. permitir que los plugins de proveedores registren implementaciones

Esto mantiene la propiedad explícita y evita el comportamiento del núcleo que depende de un
solo proveedor o una ruta de código específica de un plugin ad-hoc.

### Capas de capacidades

Use este modelo mental al decidir dónde pertenece el código:

- **capa de capacidad principal**: orquestación compartida, políticas, alternativas, reglas de combinación de configuración,
  semántica de entrega y contratos tipados
- **capa de plugin de proveedor**: APIs específicas del proveedor, autenticación, catálogos de modelos,
  síntesis de voz, generación de imágenes, backends de video futuros, puntos finales de uso
- **capa de plugin de canal/características**: integración Slack/Discord/llamada de voz/etc.
  que consume capacidades principales y las presenta en una superficie

Por ejemplo, TTS sigue esta forma:

- el núcleo posee la política TTS en el momento de la respuesta, orden de alternativas, preferencias y entrega del canal
- `openai`, `elevenlabs` y `microsoft` poseen implementaciones de síntesis
- `voice-call` consume el asistente de ejecución de TTS de telefonía

Se debería preferir ese mismo patrón para futuras capacidades.

### Ejemplo de plugin de empresa con múltiples capacidades

Un plugin de empresa debería parecer cohesivo desde el exterior. Si OpenClaw tiene contratos compartidos para modelos, voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de video, obtención web y búsqueda web, un proveedor puede ser propietario de todas sus superficies en un solo lugar:

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
- los canales y los plugins de características consumen asistentes `api.runtime.*`, no código de proveedor
- las pruebas de contrato pueden asegurar que el plugin registró las capacidades que afirma ser propietario

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad compartida. El mismo modelo de propiedad se aplica allí:

1. el núcleo define el contrato de comprensión de medios
2. los plugins de proveedor registran `describeImage`, `transcribeAudio` y `describeVideo` según corresponda
3. los canales y los plugins de características consumen el comportamiento central compartido en lugar de conectarse directamente al código del proveedor

Eso evita incorporar los supuestos de video de un proveedor en el núcleo. El plugin es propietario de la superficie del proveedor; el núcleo es propietario del contrato de capacidad y el comportamiento de reserva.

La generación de video ya usa esa misma secuencia: el núcleo es propietario del contrato de capacidad tipado y el asistente de ejecución, y los plugins de proveedor registran implementaciones `api.registerVideoGenerationProvider(...)` sobre él.

¿Necesita una lista de verificación de implementación concreta? Consulte
[Capability Cookbook](/en/tools/capability-cookbook).

## Contratos y cumplimiento

La superficie de la API del plugin está intencionalmente tipificada y centralizada en `OpenClawPluginApi`. Ese contrato define los puntos de registro compatibles y los asistentes de ejecución en los que un plugin puede basarse.

Por qué esto importa:

- los autores de plugins obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos plugins que registran el mismo id de proveedor
- el inicio puede mostrar diagnósticos procesables para registros con formato incorrecto
- las pruebas de contrato pueden hacer cumplir la propiedad del plugin empaquetado y evitar la deriva silenciosa

Hay dos capas de cumplimiento:

1. **cumplimiento del registro en tiempo de ejecución**
   El registro de complementos valida los registros a medida que se cargan los complementos. Ejemplos:
   identificadores de proveedor duplicados, identificadores de proveedor de voz duplicados y registros
   con formato incorrecto producen diagnósticos del complemento en lugar de un comportamiento indefinido.
2. **pruebas de contrato**
   Los complementos empaquetados se capturan en registros de contrato durante las ejecuciones de pruebas para que
   OpenClaw pueda afirmar la propiedad explícitamente. Hoy en día se utiliza para proveedores
   de modelos, proveedores de voz, proveedores de búsqueda web y propiedad de registro
   empaquetada.

El efecto práctico es que OpenClaw sabe, de antemano, qué complemento posee qué
superficie. Eso permite que el núcleo y los canales se compongan perfectamente porque la propiedad
se declara, se tipifica y se puede probar, en lugar de ser implícita.

### Qué pertenece a un contrato

Los buenos contratos de complementos son:

- tipificados
- pequeños
- específicos de la capacidad
- propiedad del núcleo
- reutilizables por múltiples complementos
- consumibles por canales/funcionalidades sin conocimiento del proveedor

Los malos contratos de complementos son:

- política específica del proveedor oculta en el núcleo
- escapatorias de complementos de un solo uso que omiten el registro
- código de canal que accede directamente a una implementación de proveedor
- objetos de tiempo de ejecución ad hoc que no forman parte de `OpenClawPluginApi` o
  `api.runtime`

En caso de duda, eleve el nivel de abstracción: defina primero la capacidad y luego
permita que los complementos se conecten a ella.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en proceso** con la puerta de enlace (Gateway). No están
enjaulados. Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que
el código del núcleo.

Implicaciones:

- un complemento nativo puede registrar herramientas, controladores de red, ganchos y servicios
- un error en un complemento nativo puede bloquear o desestabilizar la puerta de enlace
- un complemento nativo malintencionado es equivalente a la ejecución de código arbitrario dentro
  del proceso OpenClaw

Los paquetes compatibles son más seguros de forma predeterminada porque OpenClaw actualmente los trata
como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades
empaquetadas.

Use listas de permitidos y rutas de instalación/carga explícitas para complementos no empaquetados. Trate
los complementos del espacio de trabajo como código en tiempo de desarrollo, no como valores predeterminados de producción.

Para los nombres de paquetes de espacio de trabajo incluidos (bundled), mantenga el id del complemento anclado en el nombre de npm: `@openclaw/<id>` por defecto, o un sufijo tipado aprobado como `-provider`, `-plugin`, `-speech`, `-sandbox` o `-media-understanding` cuando el paquete expone intencionalmente un rol de complemento más estrecho.

Nota de confianza importante:

- `plugins.allow` confía en los **ids de complementos**, no en el origen de la fuente.
- Un complemento de espacio de trabajo con el mismo id que un complemento incluido (bundled) oscurece intencionalmente la copia incluida cuando ese complemento de espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, las pruebas de parches (patches) y las revisiones urgentes (hotfixes).

## Límite de exportación (Export boundary)

OpenClaw exporta capacidades, no conveniencias de implementación.

Mantenga el registro de capacidades público. Elimine las exportaciones auxiliares que no son parte del contrato:

- subrutas auxiliares específicas de complementos incluidos (bundled)
- subrutas de infraestructura (plumbing) en tiempo de ejecución no destinadas a ser API pública
- asistentes de conveniencia específicos del proveedor
- asistentes de configuración/incorporación que son detalles de implementación

Algunas subrutas auxiliares de complementos incluidos (bundled) aún permanecen en el mapa de exportación del SDK generado por compatibilidad y mantenimiento de complementos incluidos. Los ejemplos actuales incluyen `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` y varias costuras `plugin-sdk/matrix*`. Trátelas como exportaciones reservadas de detalles de implementación, no como el patrón de SDK recomendado para nuevos complementos de terceros.

## Canal de carga (Load pipeline)

Al iniciar, OpenClaw hace aproximadamente esto:

1. descubrir raíces de complementos candidatas
2. leer manifiestos de paquetes nativos o compatibles y metadatos de paquetes
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`, `slots`, `load.paths`)
5. decidir la habilitación para cada candidato
6. cargar módulos nativos habilitados a través de jiti
7. llamar a los ganchos nativos `register(api)` (o `activate(api)` — un alias heredado) y recopilar los registros en el registro de complementos
8. exponer el registro a las superficies de comandos/tiempo de ejecución

<Note>`activate` es un alias heredado de `register` — el cargador resuelve cualquiera que esté presente (`def.register ?? def.activate`) y lo llama en el mismo punto. Todos los plugins empaquetados usan `register`; prefiera `register` para nuevos plugins.</Note>

Los mecanismos de seguridad ocurren **antes** de la ejecución del tiempo de ejecución. Los candidatos se bloquean
Cuando la entrada escapa de la raíz del plugin, la ruta es de escritura mundial, o la propiedad
De la ruta parece sospechosa para plugins no empaquetados.

### Comportamiento primero del manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo usa para:

- identificar el plugin
- descubrir canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- aumentar etiquetas/marcadores de posición de la interfaz de usuario de control
- mostrar metadatos de instalación/catálogo

Para plugins nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra
El comportamiento real, como hooks, herramientas, comandos o flujos de proveedores.

### Lo que el cargador almacena en caché

OpenClaw mantiene cachés en proceso cortos para:

- resultados de descubrimiento
- datos del registro de manifiestos
- registros de plugins cargados

Estos cachés reducen la sobrecarga de inicio intermitente y comandos repetidos. Es seguro
Pensar en ellos como cachés de rendimiento de corta duración, no persistencia.

Nota de rendimiento:

- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para deshabilitar estos cachés.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modelo de registro

Los plugins cargados no mutan directamente globales centrales aleatorios. Se registran en un
Registro de plugins central.

El registro rastrea:

- registros de plugins (identidad, fuente, origen, estado, diagnósticos)
- herramientas
- hooks heredados y hooks tipados
- canales
- proveedores
- manejadores RPC de puerta de enlace
- rutas HTTP
- registradores de CLI
- servicios en segundo plano
- comandos propiedad del plugin

Luego, las características principales leen de ese registro en lugar de hablar con módulos de plugin
Directamente. Esto mantiene la carga unidireccional:

- módulo de plugin -> registro de registro
- tiempo de ejecución central -> consumo del registro

Esa separación es importante para la mantenibilidad. Significa que la mayoría de las superficies centrales solo
Necesitan un punto de integración: "leer el registro", no "casos especiales para cada módulo de
Plugin".

## Callbacks de vinculación de conversación

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
- `decision`: `"allow-once"`, `"allow-always"`, o `"deny"`
- `binding`: el enlace resuelto para solicitudes aprobadas
- `request`: el resumen de la solicitud original, pista de separación, id del remitente y metadatos de la conversación

Esta devolución de llamada es solo de notificación. No cambia quién tiene permiso para vincular una conversación y se ejecuta después de que finaliza el manejo principal de aprobaciones.

## Ganchos de tiempo de ejecución del proveedor

Los complementos del proveedor ahora tienen dos capas:

- metadatos del manifiesto: `providerAuthEnvVars` para una búsqueda barata de autenticación de entorno del proveedor
  antes de la carga en tiempo de ejecución, `providerAuthAliases` para variantes de proveedor que comparten
  autenticación, `channelEnvVars` para una búsqueda barata de entorno/configuración de canal antes de la carga en tiempo de ejecución,
  además de `providerAuthChoices` para etiquetas baratas de incorporación/elección de autenticación y
  metadatos de indicadores de CLI antes de la carga en tiempo de ejecución
- ganchos de tiempo de configuración: `catalog` / legacy `discovery` más `applyConfigDefaults`
- ganchos de tiempo de ejecución: `normalizeModelId`, `normalizeTransport`,
  `normalizeConfig`,
  `applyNativeStreamingUsageCompat`, `resolveConfigApiKey`,
  `resolveSyntheticAuth`, `resolveExternalAuthProfiles`,
  `shouldDeferSyntheticProfileAuth`,
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

OpenClaw todavía posee el bucle genérico del agente, la conmutación por error, el manejo de transcripciones y la política de herramientas. Estos ganchos son la superficie de extensión para un comportamiento específico del proveedor sin necesidad de un transporte de inferencia personalizado completo.

Use el manifiesto `providerAuthEnvVars` cuando el proveedor tenga credenciales basadas en variables de entorno
que las rutas genéricas de autenticación/estado/selección de modelo deban ver sin cargar el tiempo de ejecución
del complemento. Use el manifiesto `providerAuthAliases` cuando un id de proveedor deba reutilizar
las variables de entorno del id de otro proveedor, perfiles de autenticación, autenticación respaldada por configuración y la elección de
incorporación de clave de API. Use el manifiesto `providerAuthChoices` cuando las superficies de la CLI de
incorporación/elección de autenticación deban conocer el id de elección del proveedor, etiquetas de grupo y el cableado simple de
autenticación de una sola bandera sin cargar el tiempo de ejecución del proveedor. Mantenga el tiempo de ejecución del proveedor
`envVars` para sugerencias orientadas al operador, como etiquetas de incorporación o variables de configuración
de client-id/client-secret de OAuth.

Use manifiesto `channelEnvVars` cuando un canal tiene autenticación o configuración controlada por variables de entorno que el respaldo genérico de shell-env, las verificaciones de config/status o los mensajes de configuración deberían ver sin cargar el tiempo de ejecución del canal.

### Hook order and usage

For model/provider plugins, OpenClaw calls hooks in this rough order.
The "When to use" column is the quick decision guide.

| #   | Hook                              | What it does                                                                                                                                                           | When to use                                                                                                                                                                       |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | Publicar configuración del proveedor en `models.providers` durante la generación de `models.json`                                                                      | Provider owns a catalog or base URL defaults                                                                                                                                      |
| 2   | `applyConfigDefaults`             | Apply provider-owned global config defaults during config materialization                                                                                              | Defaults depend on auth mode, env, or provider model-family semantics                                                                                                             |
| --  | _(built-in model lookup)_         | OpenClaw tries the normal registry/catalog path first                                                                                                                  | _(not a plugin hook)_                                                                                                                                                             |
| 3   | `normalizeModelId`                | Normalize legacy or preview model-id aliases before lookup                                                                                                             | Provider owns alias cleanup before canonical model resolution                                                                                                                     |
| 4   | `normalizeTransport`              | Normalizar `api` / `baseUrl` de la familia del proveedor antes del ensamblaje del modelo genérico                                                                      | Provider owns transport cleanup for custom provider ids in the same transport family                                                                                              |
| 5   | `normalizeConfig`                 | Normalizar `models.providers.<id>` antes de la resolución de tiempo de ejecución/proveedor                                                                             | Provider needs config cleanup that should live with the plugin; bundled Google-family helpers also backstop supported Google config entries                                       |
| 6   | `applyNativeStreamingUsageCompat` | Apply native streaming-usage compat rewrites to config providers                                                                                                       | El proveedor necesita correcciones de metadatos de uso de transmisión nativa controlada por endpoint                                                                              |
| 7   | `resolveConfigApiKey`             | Resolver la autenticación de marcadores de entorno para proveedores de configuración antes de la carga de autenticación en tiempo de ejecución                         | El proveedor tiene resolución de clave API de marcador de entorno propiedad del proveedor; `amazon-bedrock` también tiene un resolvedor de marcador de entorno AWS integrado aquí |
| 8   | `resolveSyntheticAuth`            | Exponer autenticación local/autohospedada o respaldada por configuración sin persistir texto plano                                                                     | El proveedor puede operar con un marcador de credencial sintético/local                                                                                                           |
| 9   | `resolveExternalAuthProfiles`     | Superponer perfiles de autenticación externos propiedad del proveedor; el `persistence` por defecto es `runtime-only` para credenciales propiedad de la CLI/aplicación | El proveedor reutiliza las credenciales de autenticación externa sin persistir tokens de actualización copiados                                                                   |
| 10  | `shouldDeferSyntheticProfileAuth` | Reducir los marcadores de posición de perfil sintético almacenados detrás de la autenticación respaldada por entorno/configuración                                     | El proveedor almacena perfiles de marcador de posición sintéticos que no deben ganar precedencia                                                                                  |
| 11  | `resolveDynamicModel`             | Alternativa de sincronización para ID de modelos propiedad del proveedor que aún no están en el registro local                                                         | El proveedor acepta ID de modelos ascendentes arbitrarios                                                                                                                         |
| 12  | `prepareDynamicModel`             | Calentamiento asíncrono, luego `resolveDynamicModel` se ejecuta nuevamente                                                                                             | El proveedor necesita metadatos de red antes de resolver ID desconocidos                                                                                                          |
| 13  | `normalizeResolvedModel`          | Reescritura final antes de que el ejecutor integrado use el modelo resuelto                                                                                            | El proveedor necesita reescrituras de transporte pero aún usa un transporte central                                                                                               |
| 14  | `contributeResolvedModelCompat`   | Contribuir con banderas de compatibilidad para modelos de proveedores detrás de otro transporte compatible                                                             | El proveedor reconoce sus propios modelos en transportes de proxy sin asumir el control del proveedor                                                                             |
| 15  | `capabilities`                    | Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida                                                            | El proveedor necesita peculiaridades de transcripción/familia de proveedores                                                                                                      |
| 16  | `normalizeToolSchemas`            | Normalizar esquemas de herramientas antes de que el ejecutor integrado los vea                                                                                         | El proveedor necesita limpieza de esquema de familia de transporte                                                                                                                |
| 17  | `inspectToolSchemas`              | Exponer diagnósticos de esquema propiedad del proveedor después de la normalización                                                                                    | El proveedor quiere advertencias de palabras clave sin enseñar reglas específicas del proveedor al núcleo                                                                         |
| 18  | `resolveReasoningOutputMode`      | Seleccionar contrato de salida de razonamiento nativo frente a etiquetado                                                                                              | El proveedor necesita salida de razonamiento/final etiquetada en lugar de campos nativos                                                                                          |
| 19  | `prepareExtraParams`              | Normalización de parámetros de solicitud antes de los contenedores de opciones de flujo genérico                                                                       | El proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor                                                                              |
| 20  | `createStreamFn`                  | Reemplazar completamente la ruta de flujo normal con un transporte personalizado                                                                                       | El proveedor necesita un protocolo de cable personalizado, no solo un contenedor                                                                                                  |
| 21  | `wrapStreamFn`                    | Contenedor de flujo después de aplicar los contenedores genéricos                                                                                                      | El proveedor necesita contenedores de compatibilidad de encabezados/cuerpo/modelo de solicitud sin transporte personalizado                                                       |
| 22  | `resolveTransportTurnState`       | Adjuntar encabezados o metadatos de transporte por turno nativos                                                                                                       | El proveedor quiere que los transportes genéricos envíen la identidad de turno nativa del proveedor                                                                               |
| 23  | `resolveWebSocketSessionPolicy`   | Adjuntar encabezados de WebSocket nativos o política de enfriamiento de sesión                                                                                         | El proveedor quiere que los transportes WS genéricos ajusten los encabezados de sesión o la política de reserva                                                                   |
| 24  | `formatApiKey`                    | Formateador de perfil de autenticación: el perfil almacenado se convierte en la cadena `apiKey` en tiempo de ejecución                                                 | El proveedor almacena metadatos de autenticación adicionales y necesita una forma de token de tiempo de ejecución personalizada                                                   |
| 25  | `refreshOAuth`                    | Invalidación de actualización de OAuth para puntos finales de actualización personalizados o política de fallas de actualización                                       | El proveedor no se ajusta a los actualizadores `pi-ai` compartidos                                                                                                                |
| 26  | `buildAuthDoctorHint`             | Sugerencia de reparación añadida cuando falla la actualización de OAuth                                                                                                | El proveedor necesita orientación de reparación de autenticación propiedad del proveedor después de una falla de actualización                                                    |
| 27  | `matchesContextOverflowError`     | Comparador de desbordamiento de ventana de contexto propiedad del proveedor                                                                                            | El proveedor tiene errores de desbordamiento sin procesar que las heurísticas genéricas pasarían por alto                                                                         |
| 28  | `classifyFailoverReason`          | Clasificación de motivo de conmutación por error propiedad del proveedor                                                                                               | El proveedor puede asignar errores de API/transporte sin procesar a límite de tasa/sobrecarga/etc.                                                                                |
| 29  | `isCacheTtlEligible`              | Política de caché de aviso para proveedores de proxy/backhaul                                                                                                          | El proveedor necesita bloqueo de TTL de caché específico del proxy                                                                                                                |
| 30  | `buildMissingAuthMessage`         | Reemplazo del mensaje genérico de recuperación de autenticación faltante                                                                                               | El proveedor necesita una sugerencia de recuperación de autenticación faltante específica del proveedor                                                                           |
| 31  | `suppressBuiltInModel`            | Supresión de modelo upstream obsoleto más sugerencia opcional de error para el usuario                                                                                 | El proveedor necesita ocultar las filas upstream obsoletas o reemplazarlas con una sugerencia del proveedor                                                                       |
| 32  | `augmentModelCatalog`             | Filas sintéticas/finales del catálogo añadidas después del descubrimiento                                                                                              | El proveedor necesita filas sintéticas de compatibilidad hacia adelante en `models list` y selectores                                                                             |
| 33  | `isBinaryThinking`                | Interruptor de razonado activado/desactivado para proveedores de pensamiento binario                                                                                   | El proveedor expone solo el pensamiento binario activado/desactivado                                                                                                              |
| 34  | `supportsXHighThinking`           | `xhigh` soporte de razonamiento para los modelos seleccionados                                                                                                         | El proveedor quiere `xhigh` solo en un subconjunto de modelos                                                                                                                     |
| 35  | `resolveDefaultThinkingLevel`     | Nivel `/think` predeterminado para una familia de modelos específica                                                                                                   | El proveedor posee la política `/think` predeterminada para una familia de modelos                                                                                                |
| 36  | `isModernModelRef`                | Comparador de modelos modernos para filtros de perfil en vivo y selección de prueba                                                                                    | El proveedor posee la coincidencia del modelo preferido en vivo/prueba                                                                                                            |
| 37  | `prepareRuntimeAuth`              | Intercambiar una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia                                                    | El proveedor necesita un intercambio de tokens o una credencial de solicitud de corta duración                                                                                    |
| 38  | `resolveUsageAuth`                | Resolver credenciales de uso/facturación para `/usage` y superficies de estado relacionadas                                                                            | El proveedor necesita análisis personalizado de tokens de uso/cuota o una credencial de uso diferente                                                                             |
| 39  | `fetchUsageSnapshot`              | Obtener y normalizar instantáneas de uso/cuota específicas del proveedor después de resolver la autenticación                                                          | El proveedor necesita un endpoint de uso específico del proveedor o un analizador de carga útil                                                                                   |
| 40  | `createEmbeddingProvider`         | Construir un adaptador de incrustaciones propiedad del proveedor para memoria/búsqueda                                                                                 | El comportamiento de incrustación de memoria pertenece al complemento del proveedor                                                                                               |
| 41  | `buildReplayPolicy`               | Devolver una política de reproducción que controle el manejo de transcripciones para el proveedor                                                                      | El proveedor necesita una política de transcripción personalizada (por ejemplo, eliminación de bloques de pensamiento)                                                            |
| 42  | `sanitizeReplayHistory`           | Reescribir el historial de reproducción después de la limpieza genérica de transcripciones                                                                             | El proveedor necesita reescrituras de reproducción específicas del proveedor más allá de los ayudantes de compactación compartidos                                                |
| 43  | `validateReplayTurns`             | Validación o reestructuración final del turno de repetición antes del ejecutor integrado                                                                               | El transporte del proveedor necesita una validación de turno más estricta después de la desinfección genérica                                                                     |
| 44  | `onModelSelected`                 | Ejecutar efectos secundarios posteriores a la selección propiedad del proveedor                                                                                        | El proveedor necesita telemetría o estado propiedad del proveedor cuando un modelo se activa                                                                                      |

`normalizeModelId`, `normalizeTransport` y `normalizeConfig` primero verifican el
proveedor de complementos coincidente y luego pasan a otros proveedores de complementos con capacidades de enlace
hasta que uno realmente cambie el ID del modelo o el transporte/configuración. Eso mantiene
funcionando los shims de alias/compat del proveedor sin requerir que la persona que llama sepa qué
complemento integrado posee la reescritura. Si ningún enlace de proveedor reescribe una entrada de configuración
compatible con la familia de Google, el normalizador de configuración de Google integrado todavía aplica
esa limpieza de compatibilidad.

Si el proveedor necesita un protocolo de cable completamente personalizado o un ejecutor de solicitudes personalizado,
esa es una clase diferente de extensión. Estos enlaces son para el comportamiento del proveedor
que aún se ejecuta en el bucle de inferencia normal de OpenClaw.

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

- Anthropic usa `resolveDynamicModel`, `capabilities`, `buildAuthDoctorHint`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `isCacheTtlEligible`,
  `resolveDefaultThinkingLevel`, `applyConfigDefaults`, `isModernModelRef`,
  y `wrapStreamFn` porque posee la compatibilidad hacia adelante de Claude 4.6,
  sugerencias de familia de proveedores, guía de reparación de autenticación, integración de endpoint de uso,
  elegibilidad de caché de avisos, valores predeterminados de configuración conscientes de autenticación, política
  predeterminada/adaptativa de pensamiento de Claude y modelado de flujo específico de Anthropic para
  encabezados beta, `/fast` / `serviceTier` y `context1m`.
- Los auxiliares de transmisión específicos de Claude de Anthropic permanecen, por ahora, en la interfaz pública `api.ts` / `contract-api.ts` del propio plugin empaquetado. Esa superficie del paquete exporta `wrapAnthropicProviderStream`, `resolveAnthropicBetas`, `resolveAnthropicFastMode`, `resolveAnthropicServiceTier` y los constructores de envoltorios de Anthropic de nivel inferior en lugar de ampliar el SDK genérico en torno a las reglas de encabezados beta de un proveedor.
- OpenAI utiliza `resolveDynamicModel`, `normalizeResolvedModel` y `capabilities` además de `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `supportsXHighThinking` y `isModernModelRef` porque es propietaria de la compatibilidad futura de GPT-5.4, la normalización directa de `openai-completions` -> `openai-responses` de OpenAI, las sugerencias de autenticación conscientes de Codex, la supresión de Spark, las filas de lista sintéticas de OpenAI y la política de pensamiento / modelo en vivo de GPT-5; la familia de transmisión `openai-responses-defaults` posee los envoltorios nativos compartidos de OpenAI Responses para los encabezados de atribución, `/fast`/`serviceTier`, verbosidad del texto, búsqueda web nativa de Codex, configuración de carga compatible con razonamiento y gestión de contexto de Responses.
- OpenRouter utiliza `catalog` además de `resolveDynamicModel` y `prepareDynamicModel` porque el proveedor es de paso y puede exponer nuevos identificadores de modelo antes de que se actualice el catálogo estático de OpenClaw; también utiliza `capabilities`, `wrapStreamFn` y `isCacheTtlEligible` para mantener los encabezados de solicitud específicos del proveedor, los metadatos de enrutamiento, los parches de razonamiento y la política de caché de indicaciones fuera del núcleo. Su política de repetición proviene de la familia `passthrough-gemini`, mientras que la familia de transmisión `openrouter-thinking` posee la inyección de razonamiento proxy y las omisiones de modelos no admitidos / `auto`.
- GitHub Copilot usa `catalog`, `auth`, `resolveDynamicModel` y
  `capabilities` más `prepareRuntimeAuth` y `fetchUsageSnapshot` porque
  necesita inicio de sesión de dispositivo propiedad del proveedor, comportamiento de reserva del modelo,
  peculiaridades de las transcripciones de Claude, un intercambio de token de GitHub -> token de Copilot
  y un endpoint de uso propiedad del proveedor.
- OpenAI Codex usa `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` y `augmentModelCatalog` más
  `prepareExtraParams`, `resolveUsageAuth` y `fetchUsageSnapshot` porque
  aún se ejecuta en los transportes principales de OpenAI, pero posee la normalización de su transporte/URL base,
  la política de reserva de actualización de OAuth, la elección de transporte predeterminada,
  las filas sintéticas del catálogo de Codex y la integración del endpoint de uso de ChatGPT;
  comparte la misma familia de flujos `openai-responses-defaults` que OpenAI directo.
- Google AI Studio y Gemini CLI OAuth usan `resolveDynamicModel`,
  `buildReplayPolicy`, `sanitizeReplayHistory`,
  `resolveReasoningOutputMode`, `wrapStreamFn` y `isModernModelRef` porque la
  familia de repetición `google-gemini` posee la reserva de compatibilidad futura de Gemini 3.1,
  la validación nativa de repetición de Gemini, la saneamiento de repetición de arranque,
  el modo de salida de razonamiento etiquetado y la coincidencia de modelos modernos,
  mientras que la familia de flujos `google-thinking` posee la normalización de carga útil
  de pensamiento de Gemini; Gemini CLI OAuth también usa `formatApiKey`, `resolveUsageAuth` y
  `fetchUsageSnapshot` para el formateo de tokens, el análisis de tokens y la conexión
  del endpoint de cuota.
- Anthropic Vertex usa `buildReplayPolicy` a través de la
  familia de repetición `anthropic-by-model` para que la limpieza de repetición específica de Claude
  permanezca limitada a los ids de Claude en lugar de a cada transporte `anthropic-messages`.
- Amazon Bedrock usa `buildReplayPolicy`, `matchesContextOverflowError`,
  `classifyFailoverReason` y `resolveDefaultThinkingLevel` porque posee
  la clasificación de errores de limitación/no listo/desbordamiento de contexto
  específica de Bedrock para el tráfico de Anthropic en Bedrock; su política de
  reintento todavía comparte el mismo guardia `anthropic-by-model` solo para Claude.
- OpenRouter, Kilocode, Opencode y Opencode Go usan `buildReplayPolicy`
  a través de la familia de reintento `passthrough-gemini` porque actúan como
  proxy de modelos Gemini a través de transportes compatibles con OpenAI y
  necesitan la saneamiento de firmas de pensamiento de Gemini sin validación
  nativa de reintento de Gemini o reescrituras de inicio (bootstrap).
- MiniMax usa `buildReplayPolicy` a través de la familia de
  reintento `hybrid-anthropic-openai` porque un proveedor posee tanto la
  semántica de mensajes de Anthropic como la compatible con OpenAI; mantiene la
  eliminación de bloques de pensamiento solo para Claude en el lado de Anthropic
  mientras sobrescribe el modo de salida de razonamiento de vuelta a nativo, y
  la familia de flujo `minimax-fast-mode` posee las reescrituras de
  modelos en modo rápido en la ruta de flujo compartida.
- Moonshot usa `catalog` más `wrapStreamFn` porque todavía
  usa el transporte OpenAI compartido pero necesita una normalización de carga
  útil de pensamiento propiedad del proveedor; la familia de flujo
  `moonshot-thinking` mapea la configuración más el estado
  `/think` a su carga útil de pensamiento binaria nativa.
- Kilocode usa `catalog`, `capabilities`,
  `wrapStreamFn` y `isCacheTtlEligible` porque necesita encabezados
  de solicitud propiedad del proveedor, normalización de carga útil de
  razonamiento, sugerencias de transcripción de Gemini y control de TTL de caché
  de Anthropic; la familia de flujo `kilocode-thinking` mantiene la
  inyección de pensamiento de Kilo en la ruta de flujo de proxy compartida
  mientras omite `kilo/auto` y otros ids de modelos proxy que
  no soportan cargas útiles de razonamiento explícitas.
- Z.AI usa `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` y `fetchUsageSnapshot` porque posee la alternativa GLM-5,
  valores predeterminados `tool_stream`, UX de pensamiento binario, coincidencia de modelos modernos y tanto
  la autenticación de uso + obtención de cuotas; la familia de flujos `tool-stream-default-on` mantiene
  el contenedor `tool_stream` activado por defecto fuera del pegamento escrito a mano por proveedor.
- xAI usa `normalizeResolvedModel`, `normalizeTransport`,
  `contributeResolvedModelCompat`, `prepareExtraParams`, `wrapStreamFn`,
  `resolveSyntheticAuth`, `resolveDynamicModel` y `isModernModelRef`
  porque posee la normalización del transporte nativo de xAI Responses, reescrituras de alias
  de modo rápido Grok, `tool_stream` predeterminado, limpieza de herramientas estrictas / carga útil de razonamiento,
  reutilización de autenticación alternativa para herramientas propiedad del complemento, resolución de modelo Grok
  con compatibilidad futura y parches de compatibilidad propiedad del proveedor, como el perfil de esquema de herramientas xAI,
  palabras clave de esquema no admitidas, `web_search` nativo
  y decodificación de argumentos de llamada a herramienta de entidad HTML.
- Mistral, OpenCode Zen y OpenCode Go usan `capabilities` solo para mantener
  las peculiaridades de transcripción/herramientas fuera del núcleo.
- Los proveedores empaquetados solo de catálogo, como `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` usan
  solo `catalog`.
- Qwen usa `catalog` para su proveedor de texto además de registros compartidos de comprensión de medios
  y generación de video para sus superficies multimodales.
- MiniMax y Xiaomi usan `catalog` más hooks de uso porque su comportamiento `/usage` es propiedad del plugin aunque la inferencia aún se ejecute a través de los transportes compartidos.

## Asistentes de tiempo de ejecución

Los plugins pueden acceder a ciertos asistentes principales a través de `api.runtime`. Para TTS:

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

- `textToSpeech` devuelve la carga de salida de TTS principal normal para superficies de archivo/nota de voz.
- Usa la configuración `messages.tts` principal y la selección del proveedor.
- Devuelve el búfer de audio PCM + la frecuencia de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
- `listVoices` es opcional por proveedor. Úselo para selectores de voz propiedad del proveedor o flujos de configuración.
- Las listas de voces pueden incluir metadatos más ricos, como configuración regional, género y etiquetas de personalidad para selectores con conocimiento del proveedor.
- OpenAI y ElevenLabs admiten telefonía hoy en día. Microsoft no.

Los plugins también pueden registrar proveedores de voz a través de `api.registerSpeechProvider(...)`.

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

- Mantenga la política, el respaldo y la entrega de respuestas de TTS en el núcleo.
- Utilice proveedores de voz para el comportamiento de síntesis propiedad del proveedor.
- La entrada `edge` heredada de Microsoft se normaliza al id de proveedor `microsoft`.
- El modelo de propiedad preferido está orientado a la empresa: un complemento de proveedor puede ser propietario de proveedores de texto, voz, imagen y futuros medios a medida que OpenClaw añada esos contratos de capacidad.

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

- Mantenga la orquestación, el respaldo, la configuración y el cableado del canal en el núcleo.
- Mantenga el comportamiento del proveedor en el complemento del proveedor.
- La expansión aditiva debe mantenerse tipada: nuevos métodos opcionales, nuevos campos de resultado opcionales, nuevas capacidades opcionales.
- La generación de video ya sigue el mismo patrón:
  - el núcleo posee el contrato de capacidad y el asistente de tiempo de ejecución
  - los plugins del proveedor registran `api.registerVideoGenerationProvider(...)`
  - los plugins de características/canales consumen `api.runtime.videoGeneration.*`

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

Para la transcripción de audio, los complementos pueden usar el tiempo de ejecución de comprensión de medios o el alias STT anterior:

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
- Usa la configuración de audio de comprensión de medios principal (`tools.media.audio`) y el orden de reserva del proveedor.
- Devuelve `{ text: undefined }` cuando no se produce ninguna salida de transcripción (por ejemplo, entrada omitida/no admitida).
- `api.runtime.stt.transcribeAudioFile(...)` permanece como un alias de compatibilidad.

Los plugins también pueden iniciar ejecuciones de subagentes en segundo plano a través de `api.runtime.subagent`:

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
- OpenClaw solo respeta esos campos de anulación para las llamadas de confianza.
- Para las ejecuciones de reserva propiedad del plugin, los operadores deben optar con `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Use `plugins.entries.<id>.subagent.allowedModels` para restringir los plugins de confianza a objetivos `provider/model` canónicos específicos, o `"*"` para permitir cualquier objetivo explícitamente.
- Las ejecuciones de subagentes de complementos que no son de confianza aún funcionan, pero las solicitudes de anulación se rechazan en lugar de recurrir silenciosamente.

Para la búsqueda web, los complementos pueden consumir el asistente de tiempo de ejecución compartido en lugar de
acceder al cableado de la herramienta del agente:

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

Los plugins también pueden registrar proveedores de búsqueda web a través de `api.registerWebSearchProvider(...)`.

Notas:

- Mantenga la selección del proveedor, la resolución de credenciales y la semántica de solicitudes compartidas en el núcleo.
- Use proveedores de búsqueda web para transportes de búsqueda específicos del proveedor.
- `api.runtime.webSearch.*` es la superficie compartida preferida para los plugins de características/canales que necesitan comportamiento de búsqueda sin depender del contenedor de herramientas del agente.

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

- `generate(...)`: genera una imagen utilizando la cadena de proveedores de generación de imágenes configurada.
- `listProviders(...)`: enumera los proveedores de generación de imágenes disponibles y sus capacidades.

## Rutas HTTP de Gateway

Los complementos pueden exponer endpoints HTTP con `api.registerHttpRoute(...)`.

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

- `path`: ruta bajo el servidor HTTP de la puerta de enlace.
- `auth`: obligatorio. Usa `"gateway"` para requerir la autenticación normal de la puerta de enlace, o `"plugin"` para la autenticación administrada por el complemento/verificación de webhooks.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelve `true` cuando la ruta manejó la solicitud.

Notas:

- `api.registerHttpHandler(...)` se eliminó y causará un error de carga del complemento. Usa `api.registerHttpRoute(...)` en su lugar.
- Las rutas de los complementos deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un complemento no puede reemplazar la ruta de otro complemento.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantén las cadenas de fallthrough de `exact`/`prefix` solo en el mismo nivel de autenticación.
- Las rutas `auth: "plugin"` **no** reciben automáticamente los ámbitos de tiempo de ejecución del operador. Están destinadas a la verificación de webhooks/firmas administrada por el complemento, no a llamadas con privilegios de asistentes de la puerta de enlace.
- Las rutas `auth: "gateway"` se ejecutan dentro de un ámbito de tiempo de ejecución de solicitud de la puerta de enlace, pero ese ámbito es intencionalmente conservador:
  - la autenticación de portador de secreto compartido (`gateway.auth.mode = "token"` / `"password"`) mantiene los ámbitos de tiempo de ejecución de la ruta del complemento fijados a `operator.write`, incluso si el remitente envía `x-openclaw-scopes`
  - los modos HTTP de confianza que portan identidad (por ejemplo `trusted-proxy` o `gateway.auth.mode = "none"` en un ingress privado) respetan `x-openclaw-scopes` solo cuando el encabezado está explícitamente presente
  - si `x-openclaw-scopes` está ausente en esas solicitudes de ruta de complemento que portan identidad, el ámbito de ejecución vuelve a `operator.write`
- Regla práctica: no asuma que una ruta de complemento con autenticación de gateway es una superficie de administrador implícita. Si su ruta necesita un comportamiento solo para administradores, exija un modo de autenticación que porten identidad y documente el contrato explícito del encabezado `x-openclaw-scopes`.

## Rutas de importación del SDK de complementos

Use subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` cuando
escriba complementos:

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
  `openclaw/plugin-sdk/webhook-ingress` para la configuración compartida, autenticación, respuesta y webhooks.
  `channel-inbound` es el hogar compartido para el rebote (debounce), la coincidencia de menciones,
  los ayudantes de política de menciones entrantes, el formateo de sobres y los ayudantes
  de contexto de sobres entrantes.
  `channel-setup` es el punto de unión de configuración estrecho e instalable opcionalmente.
  `setup-runtime` es la superficie de configuración segura en tiempo de ejecución utilizada por `setupEntry` /
  el inicio diferido, incluidos los adaptadores de parches de configuración seguros para importaciones.
  `setup-adapter-runtime` es el punto de unión del adaptador de configuración de cuentas consciente del entorno.
  `setup-tools` es el pequeño punto de unión de ayudantes para CLI, archivos y documentos (`formatCliCommand`,
  `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`,
  `CONFIG_DIR`).
- Las subrutas de dominio como `openclaw/plugin-sdk/channel-config-helpers`,
  `openclaw/plugin-sdk/allow-from`,
  `openclaw/plugin-sdk/channel-config-schema`,
  `openclaw/plugin-sdk/telegram-command-config`,
  `openclaw/plugin-sdk/channel-policy`,
  `openclaw/plugin-sdk/approval-gateway-runtime`,
  `openclaw/plugin-sdk/approval-handler-adapter-runtime`,
  `openclaw/plugin-sdk/approval-handler-runtime`,
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
  `openclaw/plugin-sdk/directory-runtime` para asistentes compartidos de tiempo de ejecución/configuración.
  `telegram-command-config` es la costura pública estrecha para la normalización/validación
  de comandos personalizados de Telegram y permanece disponible incluso si la superficie
  del contrato incluido de Telegram está temporalmente no disponible.
  `text-runtime` es la costura compartida de texto/markdown/registro, incluyendo
  la eliminación de texto visible para el asistente, asistentes de renderizado/fraccionamiento de markdown,
  asistentes de redacción, asistentes de etiquetas de directivas y utilidades de texto seguro.
- Las costuras del canal específicas de aprobación deben preferir un contrato
  `approvalCapability` en el complemento. Luego, el núcleo lee la autenticación,
  entrega, renderizado, enrutamiento nativo y comportamiento del controlador nativo diferido
  a través de esa única capacidad en lugar de mezclar el comportamiento de aprobación en campos
  de complementos no relacionados.
- `openclaw/plugin-sdk/channel-runtime` está obsoleto y permanece solo como
  una capa de compatibilidad para complementos más antiguos. El código nuevo debe importar
  los primitivos genéricos más estrechos en su lugar, y el código del repositorio no debe agregar
  nuevas importaciones de la capa.
- Los internos de las extensiones incluidas permanecen privados. Los complementos externos deben usar
  solo subrutas `openclaw/plugin-sdk/*`. El código principal/de prueba de OpenClaw puede usar los
  puntos de entrada públicos del repositorio bajo una raíz de paquete de complemento como `index.js`, `api.js`,
  `runtime-api.js`, `setup-entry.js` y archivos de alcance estrecho como
  `login-qr-api.js`. Nunca importe un `src/*` de un paquete de complementos
  desde el núcleo o desde otra extensión.
- División del punto de entrada del repositorio:
  `<plugin-package-root>/api.js` es el barril de tipos/ayudantes,
  `<plugin-package-root>/runtime-api.js` es el barril solo de tiempo de ejecución,
  `<plugin-package-root>/index.js` es el punto de entrada del complemento empaquetado,
  y `<plugin-package-root>/setup-entry.js` es el punto de entrada del complemento de configuración.
- Ejemplos de proveedores empaquetados actuales:
  - Anthropic usa `api.js` / `contract-api.js` para los ayudantes de flujo de Claude tales
    como `wrapAnthropicProviderStream`, ayudantes de encabezados beta, y el análisis de
    `service_tier`.
  - OpenAI usa `api.js` para los constructores de proveedores, ayudantes de modelo predeterminado y
    constructores de proveedores en tiempo real.
  - OpenRouter usa `api.js` para su constructor de proveedores además de los ayudantes de incorporación/configuración,
    mientras que `register.runtime.js` aún puede reexportar ayudantes genéricos de
    `plugin-sdk/provider-stream` para uso local en el repositorio.
- Los puntos de entrada públicos cargados por fachada prefieren la instantánea activa de configuración de tiempo de ejecución
  cuando existe una, luego recurren al archivo de configuración resuelto en disco cuando
  OpenClaw aún no está sirviendo una instantánea de tiempo de ejecución.
- Las primitivas compartidas genéricas siguen siendo el contrato público preferido del SDK. Existe
  un pequeño conjunto reservado de compatibilidad de costuras de ayudantes con marca de canal empaquetado.
  Trátelas como costuras de mantenimiento/compatibilidad empaquetadas, no como nuevos
  objetivos de importación para terceros; los nuevos contratos multi-canal deben ubicarse aún en
  subrutas genéricas de `plugin-sdk/*` o en los barriles locales del complemento `api.js` /
  `runtime-api.js`.

Nota de compatibilidad:

- Evite el barril raíz `openclaw/plugin-sdk` para código nuevo.
- Prefiera primero las primitivas estrechas y estables. Las subrutas más nuevas de configuración/emparejamiento/respuesta/
  comentarios/contrato/entrada/hilos/comando/entrada-secreta/webhook/infra/
  lista-permitida/estado/herramienta-mensaje son el contrato previsto para el nuevo trabajo
  de complementos empaquetados y externos.
  El análisis/coincidencia de objetivos pertenece a `openclaw/plugin-sdk/channel-targets`.
  Las puertas de acción de mensaje y los ayudantes de ID de mensaje de reacción pertenecen a
  `openclaw/plugin-sdk/channel-actions`.
- Los barriles de ayudantes específicos de extensiones empaquetadas no son estables por defecto. Si un
  ayudante solo es necesario para una extensión empaquetada, manténgalo detrás de la costura local
  `api.js` o `runtime-api.js` de la extensión en lugar de promoverlo hacia
  `openclaw/plugin-sdk/<extension>`.
- Los nuevos puntos de unión de ayudantes compartidos deben ser genéricos, no de marca del canal. El análisis compartido de objetivos pertenece a `openclaw/plugin-sdk/channel-targets`; los aspectos internos específicos del canal se mantienen detrás del punto de unión local `api.js` o `runtime-api.js` del complemento propietario.
- Las subrutas específicas de capacidades, como `image-generation`, `media-understanding` y `speech`, existen porque los complementos integrados/nativos las usan hoy. Su presencia no significa por sí misma que cada ayudante exportado sea un contrato externo congelado a largo plazo.

## Esquemas de herramientas de mensajes

Los complementos deben ser propietarios de las contribuciones de esquema `describeMessageTool(...)` específicas del canal. Mantenga los campos específicos del proveedor en el complemento, no en el núcleo compartido.

Para fragmentos de esquema portátiles compartidos, reutilice los ayudantes genéricos exportados a través de `openclaw/plugin-sdk/channel-actions`:

- `createMessageToolButtonsSchema()` para cargas útiles de estilo de cuadrícula de botones
- `createMessageToolCardSchema()` para cargas útiles de tarjetas estructuradas

Si una forma de esquema solo tiene sentido para un proveedor, defínala en la propia fuente de ese complemento en lugar de promoverla al SDK compartido.

## Resolución de objetivos del canal

Los complementos del canal deben ser propietarios de la semántica específica del canal de objetivos. Mantenga el host de salida compartido genérico y use la superficie del adaptador de mensajería para las reglas del proveedor:

- `messaging.inferTargetChatType({ to })` decide si un objetivo normalizado debe tratarse como `direct`, `group` o `channel` antes de la búsqueda en el directorio.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indica al núcleo si una entrada debe saltar directamente a la resolución similar a un ID en lugar de la búsqueda en el directorio.
- `messaging.targetResolver.resolveTarget(...)` es el respaldo del complemento cuando el núcleo necesita una resolución final propiedad del proveedor después de la normalización o después de un fallo en el directorio.
- `messaging.resolveOutboundSessionRoute(...)` es propietario de la construcción de rutas de sesión específicas del proveedor una vez que se resuelve un objetivo.

División recomendada:

- Use `inferTargetChatType` para decisiones de categoría que deben suceder antes de buscar pares/grupos.
- Use `looksLikeId` para comprobaciones de "tratar esto como un ID de objetivo explícito/nativo".
- Use `resolveTarget` como respaldo de normalización específico del proveedor, no para una búsqueda amplia en el directorio.
- Mantenga los IDs nativos del proveedor, como IDs de chat, IDs de hilos, JIDs, identificadores y IDs de sala, dentro de los valores `target` o parámetros específicos del proveedor, no en campos genéricos del SDK.

## Directorios respaldados por configuración

Los complementos que derivan entradas de directorio desde la configuración deben mantener esa lógica en el
complemento y reutilizar los ayudantes compartidos desde
`openclaw/plugin-sdk/directory-runtime`.

Use esto cuando un canal necesita pares/grupos respaldados por configuración, tales como:

- pares de MD impulsados por lista blanca
- mapas de canal/grupo configurados
- respaldos de directorio estático con alcance de cuenta

Los ayudantes compartidos en `directory-runtime` solo manejan operaciones genéricas:

- filtrado de consultas
- aplicación de límites
- asistentes de desduplicación/normalización
- construyendo `ChannelDirectoryEntry[]`

La inspección de cuenta específica del canal y la normalización de id deben permanecer en la implementación del complemento.

## Catálogos de proveedores

Los complementos de proveedor pueden definir catálogos de modelos para inferencia con
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma forma que OpenClaw escribe en
`models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento posee ids de modelo específicos del proveedor, valores predeterminados de URL base
o metadatos de modelo restringidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los
proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores de API-key simples o impulsados por variables de entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedor relacionadas
- `late`: última pasada, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de clave, por lo que los complementos pueden anular intencionalmente una entrada de proveedor integrada con el mismo id de proveedor.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado
- si se registran tanto `catalog` como `discovery`, OpenClaw usa `catalog`

## Inspección de canal de solo lectura

Si su complemento registra un canal, se prefiere implementar
`plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de ejecución. Se le permite asumir que las credenciales
  están completamente materializadas y puede fallar rápido cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura como `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, y los flujos de reparación de doctor/config
  no deberían necesitar materializar credenciales de ejecución solo para
  describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devuelva solo el estado descriptivo de la cuenta.
- Conservar `enabled` y `configured`.
- Incluya campos de origen/estado de credenciales cuando sea relevante, tales como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No es necesario devolver valores de token sin procesar solo para informar la disponibilidad de solo lectura. Devolver `tokenStatus: "available"` (y el campo fuente coincidente) es suficiente para los comandos de estado.
- Use `configured_unavailable` cuando una credencial está configurada a través de SecretRef pero no disponible en la ruta de comando actual.

Esto permite que los comandos de solo lectura informen "configurado pero no disponible en esta ruta de
decomando" en lugar de bloquearse o informar erróneamente que la cuenta no está configurada.

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

Cada entrada se convierte en un complemento. Si el paquete lista múltiples extensiones, el ID del complemento se convierte en `name/<fileBase>`.

Si su complemento importa dependencias npm, instálelas en ese directorio para que `node_modules` esté disponible (`npm install` / `pnpm install`).

Barrera de seguridad: cada entrada `openclaw.extensions` debe permanecer dentro del directorio del complemento después de la resolución de enlaces simbólicos. Se rechazan las entradas que salen del directorio del paquete.

Nota de seguridad: `openclaw plugins install` instala las dependencias del complemento con `npm install --omit=dev --ignore-scripts` (sin scripts de ciclo de vida, sin dependencias de desarrollo en tiempo de ejecución). Mantenga los árboles de dependencias del complemento como "JS/TS puro" y evite paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración. Cuando OpenClaw necesita superficies de configuración para un complemento de canal deshabilitado, o cuando un complemento de canal está habilitado pero aún sin configurar, carga `setupEntry` en lugar de la entrada completa del complemento. Esto mantiene el inicio y la configuración más ligeros cuando su entrada principal del complemento también conecta herramientas, ganchos u otro código solo de tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` puede optar por que un complemento de canal use la misma ruta `setupEntry` durante la fase de inicio previa a la escucha de la puerta de enlace, incluso cuando el canal ya está configurado.

Use esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir
antes de que la puerta de enlace comience a escuchar. En la práctica, eso significa que la entrada de configuración
debe registrar cada capacidad propiedad del canal de la cual depende el inicio, como:

- el registro del canal en sí
- cualquier ruta HTTP que deba estar disponible antes de que la puerta de enlace comience a escuchar
- cualquier método, herramienta o servicio de la puerta de enlace que deba existir durante esa misma ventana

Si tu entrada completa aún posee alguna capacidad de inicio requerida, no habilites
esta bandera. Mantén el complemento con el comportamiento predeterminado y deja que OpenClaw cargue la
entrada completa durante el inicio.

Los canales empaquetados también pueden publicar auxiliares de superficie de contrato de solo configuración que el núcleo
pueda consultar antes de que se cargue el tiempo de ejecución completo del canal. La superficie actual de
promoción de configuración es:

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Core usa esa superficie cuando necesita promocionar una configuración de canal de cuenta única heredada
en `channels.<id>.accounts.*` sin cargar la entrada completa del complemento.
Matrix es el ejemplo incluido actual: mueve solo las claves de autenticación/inicio a una
cuenta promovida con nombre cuando ya existen cuentas con nombre, y puede preservar una
clave de cuenta predeterminada no canónica configurada en lugar de siempre crear
`accounts.default`.

Esos adaptadores de parches de configuración mantienen el descubrimiento de la superficie del contrato incluido diferido. El tiempo de importación se mantiene ligero; la superficie de promoción se carga solo en el primer uso en lugar de volver a ingresar al inicio del canal incluido al importar el módulo.

Cuando esas superficies de inicio incluyen métodos RPC de puerta de enlace, manténgalos en un
prefijo específico del complemento. Los espacios de nombres de administrador de Core (`config.*`,
`exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre se resuelven
a `operator.admin`, incluso si un complemento solicita un alcance más estrecho.

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

Los complementos de canal pueden anunciar metadatos de configuración/descubrimiento a través de `openclaw.channel` y
sugerencias de instalación a través de `openclaw.install`. Esto mantiene el catálogo central libre de datos.

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

Campos `openclaw.channel` útiles más allá del ejemplo mínimo:

- `detailLabel`: etiqueta secundaria para superficies de catálogo/estado más ricas
- `docsLabel`: anular el texto del enlace para el enlace de documentación
- `preferOver`: IDs de complemento/canal de menor prioridad que esta entrada de catálogo debería superar
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras`: controles de copia de la superficie de selección
- `markdownCapable`: marca el canal como capaz de usar markdown para decisiones de formato saliente
- `exposure.configured`: oculta el canal de las superficies de listado de canales configurados cuando se establece en `false`
- `exposure.setup`: oculta el canal de los selectores de configuración/configuración interactiva cuando se establece en `false`
- `exposure.docs`: marca el canal como interno/privado para las superficies de navegación de la documentación
- `showConfigured` / `showInSetup`: alias heredados aún aceptados por compatibilidad; se prefiere `exposure`
- `quickstartAllowFrom`: incluye el canal en el flujo de inicio rápido estándar `allowFrom`
- `forceAccountBinding`: requiere vinculación explícita de la cuenta incluso cuando solo existe una cuenta
- `preferSessionLookupForAnnounceTarget`: prefiere la búsqueda de sesión al resolver objetivos de anuncio

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación de registro MPM). Coloque un archivo JSON en una de estas ubicaciones:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas/puntos y comas/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. El analizador también acepta `"packages"` o `"plugins"` como alias heredados para la clave `"entries"`.

## Complementos del motor de contexto

Los complementos del motor de contexto son propietarios de la orquestación del contexto de sesión para ingestión, ensamblaje
y compactación. Regístrelos desde su complemento con
`api.registerContextEngine(id, factory)`, luego seleccione el motor activo con
`plugins.slots.contextEngine`.

Use esto cuando su complemento necesite reemplazar o extender la canalización de contexto predeterminada en lugar de simplemente agregar búsqueda de memoria o ganchos.

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

Si su motor **no** es propietario del algoritmo de compactación, mantenga `compact()`
implementado y delegúelo explícitamente:

```ts
import { buildMemorySystemPromptAddition, delegateCompactionToRuntime } from "openclaw/plugin-sdk/core";

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
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## Agregar una nueva capacidad

Cuando un complemento necesita un comportamiento que no se ajusta a la API actual, no omita
el sistema de complementos con un alcance privado. Agregue la capacidad faltante.

Secuencia recomendada:

1. definir el contrato principal
   Decida qué comportamiento compartido debe poseer el núcleo: política, reserva, fusión de configuración,
   ciclo de vida, semántica orientada al canal y forma del asistente de tiempo de ejecución.
2. agregar superficies de registro/ejecución de complementos tipadas
   Extienda `OpenClawPluginApi` y/o `api.runtime` con la superficie de
   capacidad tipada más pequeña y útil.
3. conectar el núcleo + los consumidores de canal/característica
   Los complementos de canales y características deben consumir la nueva capacidad a través del núcleo,
   no importando directamente una implementación de proveedor.
4. registrar implementaciones de proveedores
   Los complementos de proveedores luego registran sus backends contra la capacidad.
5. agregar cobertura del contrato
   Agregue pruebas para que la propiedad y la forma del registro se mantengan explícitas con el tiempo.

Así es como OpenClaw se mantiene con opiniones sin volverse rígido ante la
visión del mundo de un proveedor. Consulte el [Libro de recetas de capacidades](/en/tools/capability-cookbook)
para obtener una lista de verificación de archivos concreta y un ejemplo práctico.

### Lista de verificación de capacidades

Cuando agrega una nueva capacidad, la implementación generalmente debe tocar estas
superficies juntas:

- tipos de contrato principales en `src/<capability>/types.ts`
- ayudante principal de ejecución/ejecución en `src/<capability>/runtime.ts`
- superficie de registro de API de complementos en `src/plugins/types.ts`
- cableado del registro de complementos en `src/plugins/registry.ts`
- exposición en tiempo de ejecución del complemento en `src/plugins/runtime/*` cuando los complementos de
  características/canales necesitan consumirlo
- asistentes de captura/prueba en `src/test-utils/plugin-registration.ts`
- afirmaciones de propiedad/contrato en `src/plugins/contracts/registry.ts`
- documentación del operador/plugin en `docs/`

Si falta una de esas superficies, eso suele ser una señal de que la capacidad aún
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
- los complementos de características/canales consumen los ayudantes de tiempo de ejecución
- las pruebas de contrato mantienen la propiedad explícita
