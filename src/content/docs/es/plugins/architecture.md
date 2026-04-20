---
summary: "Plugin internals: capability model, ownership, contracts, load pipeline, and runtime helpers"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Plugin Internals"
sidebarTitle: "Internals"
---

# Plugin Internals

<Info>
  This is the **deep architecture reference**. For practical guides, see: - [Install and use plugins](/es/tools/plugin) — user guide - [Getting Started](/es/plugins/building-plugins) — first plugin tutorial - [Channel Plugins](/es/plugins/sdk-channel-plugins) — build a messaging channel - [Provider Plugins](/es/plugins/sdk-provider-plugins) — build a model provider - [SDK
  Overview](/es/plugins/sdk-overview) — import map and registration API
</Info>

This page covers the internal architecture of the OpenClaw plugin system.

## Public capability model

Capabilities are the public **native plugin** model inside OpenClaw. Every
native OpenClaw plugin registers against one or more capability types:

| Capability             | Registration method                              | Example plugins                      |
| ---------------------- | ------------------------------------------------ | ------------------------------------ |
| Text inference         | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| CLI inference backend  | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| Speech                 | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| Realtime transcription | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| Realtime voice         | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| Media understanding    | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| Image generation       | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| Music generation       | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| Video generation       | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Web fetch              | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Búsqueda web           | `api.registerWebSearchProvider(...)`             | `google`                             |
| Canal / mensajería     | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |

Un complemento que registra cero capacidades pero proporciona enlaces (hooks), herramientas o
servicios es un complemento **solo de enlace heredado** (legacy hook-only). Ese patrón sigue siendo totalmente compatible.

### Postura de compatibilidad externa

El modelo de capacidades está integrado en el núcleo y es utilizado por los complementos incluidos/nativos
hoy en día, pero la compatibilidad de complementos externos todavía requiere un estándar más estricto que "está
exportado, por lo tanto, está congelado".

Orientación actual:

- **complementos externos existentes:** mantener funcionando las integraciones basadas en enlaces (hooks); tratar
  esto como la línea base de compatibilidad
- **nuevos complementos incluidos/nativos:** preferir el registro explícito de capacidades en lugar de
  intrusiones específicas del proveedor o nuevos diseños solo de enlaces
- **complementos externos que adopten el registro de capacidades:** permitido, pero tratar las
  superficies auxiliares específicas de la capacidad como en evolución a menos que la documentación marque explícitamente un
  contrato como estable

Regla práctica:

- las API de registro de capacidades son la dirección prevista
- los enlaces heredados siguen siendo la ruta más segura sin interrupciones para los complementos externos durante
  la transición
- las subrutas auxiliares exportadas no son todas iguales; preferir el contrato documentado
  restringido, no las exportaciones auxiliares incidentales

### Formas de complemento (Plugin shapes)

OpenClaw clasifica cada complemento cargado en una forma según su comportamiento real
de registro (no solo metadatos estáticos):

- **capacidad simple** (plain-capability) -- registra exactamente un tipo de capacidad (por ejemplo, un
  complemento solo de proveedor como `mistral`)
- **capacidad híbrida** (hybrid-capability) -- registra múltiples tipos de capacidades (por ejemplo,
  `openai` posee inferencia de texto, voz, comprensión multimedia y generación
  de imágenes)
- **solo de enlace** (hook-only) -- registra solo enlaces (tipados o personalizados), sin capacidades,
  herramientas, comandos o servicios
- **sin capacidad** (non-capability) -- registra herramientas, comandos, servicios o rutas pero ninguna
  capacidad

Use `openclaw plugins inspect <id>` para ver la forma de un complemento y el desglose de sus
capacidades. Consulte [referencia de CLI](/es/cli/plugins#inspect) para obtener detalles.

### Enlaces heredados

El hook `before_agent_start` sigue siendo compatible como ruta de compatibilidad para
plugins que solo usan hooks. Los plugins reales heredados todavía dependen de él.

Dirección:

- mantenerlo funcionando
- documentarlo como heredado
- preferir `before_model_resolve` para el trabajo de anulación de modelo/proveedor
- preferir `before_prompt_build` para el trabajo de mutación de indicaciones
- eliminarlo solo después de que el uso real disminuya y la cobertura de dispositivos demuestre la seguridad de la migración

### Señales de compatibilidad

Cuando ejecutas `openclaw doctor` o `openclaw plugins inspect <id>`, puedes ver
una de estas etiquetas:

| Señal                             | Significado                                                            |
| --------------------------------- | ---------------------------------------------------------------------- |
| **config válida**                 | La configuración se analiza bien y los complementos se resuelven       |
| **advertencia de compatibilidad** | El complemento usa un patrón compatible pero antiguo (ej. `hook-only`) |
| **advertencia heredada**          | El complemento usa `before_agent_start`, el cual está obsoleto         |
| **error grave**                   | La configuración no es válida o el complemento no se pudo cargar       |

Ni `hook-only` ni `before_agent_start` romperán tu complemento hoy --
`hook-only` es solo asesoría, y `before_agent_start` solo activa una advertencia. Estas
señales también aparecen en `openclaw status --all` y `openclaw plugins doctor`.

## Descripción general de la arquitectura

El sistema de complementos de OpenClaw tiene cuatro capas:

1. **Manifiesto + descubrimiento**
   OpenClaw encuentra complementos candidatos desde rutas configuradas, raíces del espacio de trabajo,
   raíces de extensiones globales y extensiones empaquetadas. El descubrimiento lee manifiestos nativos
   `openclaw.plugin.json` más los manifiestos de paquetes compatibles primero.
2. **Habilitación + validación**
   El núcleo decide si un complemento descubierto está habilitado, deshabilitado, bloqueado o
   seleccionado para un espacio exclusivo como la memoria.
3. **Carga en tiempo de ejecución**
   Los complementos nativos de OpenClaw se cargan en proceso mediante jiti y registran
   capacidades en un registro central. Los paquetes compatibles se normalizan en
   registros del sistema sin importar código en tiempo de ejecución.
4. **Consumo superficial**
   El resto de OpenClaw lee el registro para exponer herramientas, canales, configuración
   de proveedores, hooks, rutas HTTP, comandos CLI y servicios.

Para la CLI de complementos específicamente, el descubrimiento de comandos raíz se divide en dos fases:

- los metadatos del tiempo de análisis provienen de `registerCli(..., { descriptors: [...] })`
- el módulo real de la CLI del complemento puede permanecer inactivo y registrarse en la primera invocación

Eso mantiene el código de CLI propiedad del complemento dentro del complemento, al mismo tiempo que permite a OpenClaw reservar nombres de comandos raíz antes del análisis.

El límite de diseño importante:

- el descubrimiento + la validación de configuración deben funcionar desde **metadatos de manifiesto/esquema**
  sin ejecutar código del complemento
- el comportamiento del tiempo de ejecución nativo proviene de la ruta `register(api)` del módulo del complemento

Esa división permite que OpenClaw valide la configuración, explique los complementos faltantes/deshabilitados y construya sugerencias de interfaz de usuario/esquema antes de que el tiempo de ejecución completo esté activo.

### Complementos de canal y la herramienta de mensajes compartida

Los complementos de canal no necesitan registrar una herramienta de envío/edición/reacción separada para las acciones de chat normales. OpenClaw mantiene una herramienta `message` compartida en el núcleo, y los complementos de canal son propietarios del descubrimiento y la ejecución específicos del canal detrás de ella.

El límite actual es:

- el núcleo es propietario del host de la herramienta `message` compartida, el cableado del mensaje, el mantenimiento de libros de sesión/hilo y el envío de ejecución
- los complementos de canal son propietarios del descubrimiento de acciones con ámbito, el descubrimiento de capacidades y cualquier fragmento de esquema específico del canal
- los complementos de canal son propietarios de la gramática de conversación de sesión específica del proveedor, como cómo los identificadores de conversación codifican los identificadores de hilo o heredan de conversaciones principales
- los complementos de canal ejecutan la acción final a través de su adaptador de acción

Para los complementos de canal, la superficie del SDK es
`ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento unificada permite que un complemento devuelva sus acciones visibles, capacidades y contribuciones de esquema juntas para que esas piezas no se separen.

Cuando un parámetro de herramienta de mensaje específico del canal transporta una fuente de medios, como una ruta local o una URL de medios remota, el complemento también debe devolver `mediaSourceParams` desde `describeMessageTool(...)`. El núcleo usa esa lista explícita para aplicar la normalización de ruta de espacio aislado y sugerencias de acceso a medios salientes sin codificar los nombres de parámetros propiedad del complemento.
Prefiera mapas con ámbito de acción allí, no una lista plana para todo el canal, para que un parámetro de medios solo de perfil no se normalice en acciones no relacionadas como `send`.

El núcleo pasa el alcance del tiempo de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- entrada de confianza `requesterSenderId`

Eso es importante para los plugins sensibles al contexto. Un canal puede ocultar o exponer
acciones de mensajes basándose en la cuenta activa, la sala/hilo/mensaje actual o
la identidad del solicitante de confianza sin codificar ramas específicas del canal en la
herramienta central `message`.

Por eso los cambios de enrutamiento del ejecutor integrado siguen siendo trabajo del plugin: el ejecutor es
responsable de reenviar la identidad del chat/sesión actual hacia el límite de descubrimiento del plugin
para que la herramienta compartida `message` exponga la superficie
propiedad del canal correcta para el turno actual.

Para los asistentes de ejecución propiedad del canal, los paquetes de plugins deben mantener el tiempo de ejecución
dentro de sus propios módulos de extensión. Core ya no posee los tiempos de ejecución de acciones de mensajes de
Discord, Slack, Telegram o WhatsApp bajo `src/agents/tools`.
No publicamos subrutas `plugin-sdk/*-action-runtime` separadas, y los plugins
empaquetados deben importar su propio código de tiempo de ejecución local directamente desde sus
módulos propiedad de la extensión.

El mismo límite se aplica a las costuras del SDK nombradas por el proveedor en general: core no
debe importar barriles de conveniencia específicos del canal para Slack, Discord, Signal,
WhatsApp o extensiones similares. Si core necesita un comportamiento, consuma el
barril `api.ts` / `runtime-api.ts` del propio plugin empaquetado o promueva la necesidad
a una capacidad genérica estrecha en el SDK compartido.

Específicamente para las encuestas, hay dos rutas de ejecución:

- `outbound.sendPoll` es la línea base compartida para canales que se ajustan al modelo
  de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para semánticas de encuesta
  específicas del canal o parámetros de encuesta adicionales

Core ahora difiere el análisis compartido de encuestas hasta después de que el despacho de encuestas del plugin rechace
la acción, para que los controladores de encuesta propiedad del plugin puedan aceptar campos de encuesta
específicos del canal sin ser bloqueados primero por el analizador de encuestas genérico.

Consulte [Load pipeline](#load-pipeline) para ver la secuencia completa de inicio.

## Modelo de propiedad de capacidades

OpenClaw trata un plugin nativo como el límite de propiedad para una **empresa** o una
**característica**, no como una bolsa de integraciones no relacionadas.

Eso significa:

- un complemento de empresa (company plugin) generalmente debe ser dueño de todas las superficies de esa empresa orientadas a OpenClaw
- un complemento de características (feature plugin) generalmente debe ser dueño de la superficie completa de la característica que introduce
- los canales deben consumir capacidades centrales compartidas en lugar de reimplementar el comportamiento del proveedor ad hoc

Ejemplos:

- el complemento incluido `openai` es dueño del comportamiento del proveedor de modelos de OpenAI y del comportamiento de voz + voz en tiempo real + comprensión de medios + generación de imágenes de OpenAI
- el complemento incluido `elevenlabs` es dueño del comportamiento de voz de ElevenLabs
- el complemento incluido `microsoft` es dueño del comportamiento de voz de Microsoft
- el complemento incluido `google` es dueño del comportamiento del proveedor de modelos de Google más el comportamiento de comprensión de medios + generación de imágenes + búsqueda web de Google
- el complemento incluido `firecrawl` es dueño del comportamiento de obtención web de Firecrawl
- los complementos incluidos `minimax`, `mistral`, `moonshot` y `zai` son dueños de sus backends de comprensión de medios
- el complemento incluido `qwen` es dueño del comportamiento del proveedor de texto de Qwen más el comportamiento de comprensión de medios y generación de video
- el complemento `voice-call` es un complemento de características: es dueño del transporte de llamadas, herramientas, CLI, rutas y puente de transmisión de medios de Twilio, pero consume capacidades de voz compartidas más transcripción en tiempo real y voz en tiempo real en lugar de importar complementos de proveedores directamente

El estado final deseado es:

- OpenAI vive en un solo complemento incluso si abarca modelos de texto, voz, imágenes y video futuro
- otro proveedor puede hacer lo mismo para su propia área de superficie
- los canales no les importa qué complemento de proveedor es el dueño del proveedor; ellos consumen el contrato de capacidad compartida expuesto por el núcleo (core)

Esta es la distinción clave:

- **complemento** (plugin) = límite de propiedad (ownership boundary)
- **capacidad** (capability) = contrato central que múltiples complementos pueden implementar o consumir

Entonces, si OpenClaw agrega un nuevo dominio como el video, la primera pregunta no es "qué proveedor debe codificar el manejo de video?". La primera pregunta es "cuál es el contrato de capacidad de video central?". Una vez que ese contrato existe, los complementos de proveedores pueden registrarse en él y los complementos de canal/características pueden consumirlo.

Si la capacidad aún no existe, la medida correcta suele ser:

1. definir la capacidad faltante en el núcleo (core)
2. exponerla a través de la API/tiempo de ejecución del complemento de una forma tipada
3. conectar canales/características contra esa capacidad
4. permitir que los complementos de proveedores registren implementaciones

Esto mantiene la propiedad explícita mientras se evita un comportamiento central que dependa de un
único proveedor o una ruta de código específica de un complemento única.

### Capas de capacidad

Use este modelo mental al decidir dónde pertenece el código:

- **capa de capacidad central (core)**: orquestación compartida, políticas, respaldo, reglas de
  fusión de configuración, semántica de entrega y contratos tipados
- **capa de complemento de proveedor (vendor)**: API específicas del proveedor, autenticación, catálogos de modelos, síntesis
  de voz, generación de imágenes, backends de video futuros, endpoints de uso
- **capa de complemento de canal/característica**: integración de Slack/Discord/llamada de voz/etc.
  que consume capacidades centrales y las presenta en una superficie

Por ejemplo, TTS sigue esta forma:

- el núcleo (core) posee la política TTS de tiempo de respuesta, el orden de respaldo, las preferencias y la entrega por canal
- `openai`, `elevenlabs` y `microsoft` poseen implementaciones de síntesis
- `voice-call` consume el asistente de tiempo de ejecución TTS de telefonía

Ese mismo patrón debe preferirse para capacidades futuras.

### Ejemplo de complemento de empresa con múltiples capacidades

Un complemento de empresa debe parecer cohesivo desde el exterior. Si OpenClaw tiene contratos
compartidos para modelos, voz, transcripción en tiempo real, voz en tiempo real, comprensión
de medios, generación de imágenes, generación de video, recuperación web y búsqueda web,
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

- un complemento posee la superficie del proveedor
- el núcleo (core) sigue siendo el propietario de los contratos de capacidad
- los canales y complementos de características consumen asistentes `api.runtime.*`, no código de proveedor
- las pruebas de contrato pueden afirmar que el complemento registró las capacidades que
  afirma poseer

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad
compartida. El mismo modelo de propiedad se aplica allí:

1. el núcleo (core) define el contrato de comprensión de medios
2. los complementos de proveedores registran `describeImage`, `transcribeAudio` y
   `describeVideo` según corresponda
3. los canales y los complementos de características consumen el comportamiento compartido del núcleo en lugar de
   conectarse directamente al código del proveedor

Eso evita incorporar las suposiciones de video de un proveedor en el núcleo. El complemento posee
la superficie del proveedor; el núcleo posee el contrato de capacidad y el comportamiento de respaldo.

La generación de video ya usa esa misma secuencia: el núcleo posee el contrato de
capacidad tipado y el asistente de tiempo de ejecución, y los complementos del proveedor registran
implementaciones de `api.registerVideoGenerationProvider(...)` contra él.

¿Necesita una lista de verificación concreta para el despliegue? Consulte
[Capability Cookbook](/es/tools/capability-cookbook).

## Contratos y cumplimiento

La superficie de la API de complementos está intencionalmente tipada y centralizada en
`OpenClawPluginApi`. Ese contrato define los puntos de registro admitidos y
los asistentes de tiempo de ejecución en los que un complemento puede confiar.

Por qué esto importa:

- los autores de complementos obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos complementos registrando el mismo
  id de proveedor
- el inicio puede mostrar diagnósticos procesables para registros malformados
- las pruebas de contrato pueden hacer cumplir la propiedad de los complementos agrupados y evitar la deriva silenciosa

Hay dos capas de cumplimiento:

1. **cumplimiento del registro en tiempo de ejecución**
   El registro de complementos valida los registros a medida que se cargan los complementos. Ejemplos:
   ids de proveedor duplicados, ids de proveedor de voz duplicados y registros
   malformados producen diagnósticos de complementos en lugar de un comportamiento indefinido.
2. **pruebas de contrato**
   Los complementos agrupados se capturan en registros de contratos durante las ejecuciones de pruebas para que
   OpenClaw pueda afirmar la propiedad explícitamente. Hoy se usa para proveedores
   de modelos, proveedores de voz, proveedores de búsqueda web y propiedad de
   registros agrupados.

El efecto práctico es que OpenClaw sabe, de antemano, qué complemento posee qué
superficie. Eso permite que el núcleo y los canales se compongan perfectamente porque la propiedad está
declarada, tipada y es comprobable en lugar de implícita.

### Qué pertenece a un contrato

Los buenos contratos de complementos son:

- tipados
- pequeños
- específicos de la capacidad
- poseídos por el núcleo
- reutilizables por múltiples complementos
- consumibles por canales/características sin conocimiento del proveedor

Los malos contratos de complementos son:

- política específica del proveedor oculta en el núcleo
- escapes de complementos puntuales que omiten el registro
- código de canal que llega directamente a una implementación del proveedor
- objetos de tiempo de ejecución ad hoc que no son parte de `OpenClawPluginApi` ni de
  `api.runtime`

Ante la duda, eleve el nivel de abstracción: defina primero la capacidad y luego
permite que los complementos se conecten a ella.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en proceso** con el Gateway. No están
en sandbox. Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que
el código central.

Implicaciones:

- un complemento nativo puede registrar herramientas, controladores de red, ganchos y servicios
- un error en un complemento nativo puede bloquear o desestabilizar el gateway
- un complemento nativo malicioso es equivalente a la ejecución de código arbitrario dentro
  del proceso OpenClaw

Los paquetes compatibles son más seguros por defecto porque OpenClaw actualmente los trata
como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente
habilidades empaquetadas.

Use listas de permitidos y rutas de instalación/carga explícitas para complementos no empaquetados. Trate
los complementos del espacio de trabajo como código en tiempo de desarrollo, no como valores predeterminados de producción.

Para los nombres de paquetes de espacio de trabajo empaquetados, mantenga la identificación del complemento anclada en el nombre
npm: `@openclaw/<id>` por defecto, o un sufijo de tipo aprobado tal como
`-provider`, `-plugin`, `-speech`, `-sandbox`, o `-media-understanding` cuando
el paquete intencionalmente expone un rol de complemento más estrecho.

Nota importante de confianza:

- `plugins.allow` confía en los **ids de complemento**, no en el origen de la fuente.
- Un complemento del espacio de trabajo con el mismo id que un complemento empaquetado intencionalmente oculta
  la copia empaquetada cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, pruebas de parches y revisiones urgentes.

## Límite de exportación

OpenClaw exporta capacidades, no comodidades de implementación.

Mantenga pública el registro de capacidades. Recorte las exportaciones auxiliares que no son del contrato:

- subrutas auxiliares específicas del complemento empaquetado
- subrutas de conexión interna (plumbing) en tiempo de ejecución no previstas como API pública
- ayudantes de comodidad específicos del proveedor
- ayudantes de configuración/incorporación que son detalles de implementación

Algunas subrutas de ayuda de complementos integrados aún permanecen en el mapa de exportación del SDK generado por compatibilidad y mantenimiento de complementos integrados. Los ejemplos actuales incluyen `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` y varias costuras `plugin-sdk/matrix*`. Trátalas como exportaciones reservadas de detalles de implementación, no como el patrón recomendado del SDK para nuevos complementos de terceros.

## Canal de carga (Load pipeline)

Al inicio, OpenClaw hace aproximadamente esto:

1. descubrir las raíces de los complementos candidatos
2. leer los manifiestos de paquetes nativos o compatibles y los metadatos del paquete
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación para cada candidato
6. cargar módulos nativos habilitados a través de jiti
7. llamar a los ganchos nativos `register(api)` (o `activate(api)` — un alias heredado) y recopilar los registros en el registro de complementos
8. exponer el registro a las superficies de comandos/tiempo de ejecución

<Note>`activate` es un alias heredado de `register` — el cargador resuelve el que esté presente (`def.register ?? def.activate`) y lo llama en el mismo punto. Todos los complementos integrados usan `register`; se prefiere `register` para los nuevos complementos.</Note>

Los filtros de seguridad suceden **antes** de la ejecución del tiempo de ejecución. Los candidatos se bloquean cuando la entrada sale de la raíz del complemento, la ruta es de escritura mundial o la propiedad de la ruta parece sospechosa para complementos no integrados.

### Comportamiento primero en el manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo utiliza para:

- identificar el complemento
- descubrir canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- aumentar las etiquetas/marcadores de posición de la interfaz de usuario de control
- mostrar metadatos de instalación/catálogo
- conservar descriptores de activación y configuración económicos sin cargar el tiempo de ejecución del complemento

Para los complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra el comportamiento real, como ganchos, herramientas, comandos o flujos de proveedor.

Los bloques manifiestos opcionales `activation` y `setup` permanecen en el plano de control.
Son descriptores solo de metadatos para la planificación de activación y el descubrimiento de configuración;
no reemplazan el registro en tiempo de ejecución, `register(...)` o `setupEntry`.
Los primeros consumidores de activación en vivo ahora usan sugerencias de comandos, canales y proveedores del manifiesto
para limitar la carga de complementos antes de la materialización más amplia del registro:

- La carga de la CLI se reduce a los complementos que poseen el comando primario solicitado
- la configuración del canal/resolución del complemento se reduce a los complementos que poseen el
  id de canal solicitado
- la configuración explícita del proveedor/resolución en tiempo de ejecución se reduce a los complementos que poseen el
  id de proveedor solicitado

El descubrimiento de configuración ahora prefiere los ids propiedad del descriptor, como `setup.providers` y
`setup.cliBackends`, para limitar los complementos candidatos antes de recurrir a
`setup-api` para complementos que aún necesitan hooks de tiempo de ejecución en la configuración. Si más de
un complemento descubierto reclama el mismo id de proveedor de configuración o backend de CLI
normalizado, la búsqueda de configuración rechaza al propietario ambiguo en lugar de confiar en el orden
de descubrimiento.

### Lo que el cargador almacena en caché

OpenClaw mantiene cachés cortos en proceso para:

- resultados de descubrimiento
- datos del registro de manifiesto
- registros de complementos cargados

Estas cachés reducen la sobrecarga de inicio intermitente y comandos repetidos. Es seguro
considerarlas como cachés de rendimiento de corta duración, no persistencia.

Nota de rendimiento:

- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para deshabilitar estas cachés.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modelo de registro

Los complementos cargados no mutan directamente variables globales aleatorias del núcleo. Se registran en un
registro central de complementos.

El registro rastrea:

- registros de complementos (identidad, fuente, origen, estado, diagnósticos)
- herramientas
- hooks heredados y hooks tipados
- canales
- proveedores
- manejadores RPC de puerta de enlace
- rutas HTTP
- registradores CLI
- servicios en segundo plano
- comandos propiedad del complemento

Las funciones del núcleo luego leen de ese registro en lugar de comunicarse directamente con los módulos del complemento.
Esto mantiene la carga en una sola dirección:

- módulo de complemento -> registro de registro
- tiempo de ejecución del núcleo -> consumo del registro

Esa separación es importante para la mantenibilidad. Significa que la mayoría de las superficies centrales solo
necesitan un punto de integración: "leer el registro", no "casos especiales para cada módulo de
plugin".

## Callbacks de vinculación de conversación

Los complementos que vinculan una conversación pueden reaccionar cuando se resuelve una aprobación.

Use `api.onConversationBindingResolved(...)` para recibir un callback después de que una solicitud de vinculación
sea aprobada o denegada:

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

Campos del payload del callback:

- `status`: `"approved"` o `"denied"`
- `decision`: `"allow-once"`, `"allow-always"`, o `"deny"`
- `binding`: el vínculo resuelto para solicitudes aprobadas
- `request`: el resumen de la solicitud original, sugerencia de separación, id del remitente y
  metadatos de la conversación

Este callback es solo de notificación. No cambia quién tiene permiso para vincular una
conversación y se ejecuta después de que finaliza el manejo central de aprobaciones.

## Ganchos de tiempo de ejecución del proveedor

Los complementos del proveedor ahora tienen dos capas:

- metadatos del manifiesto: `providerAuthEnvVars` para búsqueda económica de autenticación de entorno del proveedor
  antes de la carga del tiempo de ejecución, `providerAuthAliases` para variantes de proveedor que comparten
  autenticación, `channelEnvVars` para búsqueda económica de entorno/configuración del canal antes de la carga del
  tiempo de ejecución, más `providerAuthChoices` para etiquetas económicas de incorporación/elección de autenticación y
  metadatos de indicadores CLI antes de la carga del tiempo de ejecución
- ganchos de configuración: `catalog` / `discovery` heredado más `applyConfigDefaults`
- runtime hooks: `normalizeModelId`, `normalizeTransport`,
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

OpenClaw sigue siendo el propietario del bucle de agente genérico, la conmutación por error, el manejo de transcripciones y la política de herramientas. Estos hooks son la superficie de extensión para el comportamiento específico del proveedor sin necesidad de un transporte de inferencia personalizado completo.

Use manifiesto `providerAuthEnvVars` cuando el proveedor tenga credenciales basadas en env
que las rutas genéricas de auth/status/model-picker deban ver sin cargar el tiempo de ejecución
del plugin. Use manifiesto `providerAuthAliases` cuando un id de proveedor deba reutilizar
las variables de env, perfiles de autenticación, autenticación respaldada por configuración y la elección de
incorporación de clave API de otro id de proveedor. Use manifiesto `providerAuthChoices` cuando las superficies de CLI de
incorporación/elección de autenticación deban conocer el id de elección, las etiquetas de grupo y el cableado
de autenticación de una sola bandera simple del proveedor sin cargar el tiempo de ejecución del proveedor.
Mantenga el tiempo de ejecución del proveedor `envVars` para sugerencias orientadas al operador, como las etiquetas de incorporación o las
variables de configuración del client-id/client-secret de OAuth.

Use manifiesto `channelEnvVars` cuando un canal tenga autenticación o configuración impulsada por env que
la reserva genérica de shell-env, las comprobaciones de configuración/estado o los mensajes de configuración deban ver
sin cargar el tiempo de ejecución del canal.

### Orden y uso de los hooks

Para los complementos de modelo/proveedor, OpenClaw llama a los hooks en este orden aproximado.
La columna "Cuándo usar" es la guía de decisión rápida.

| #   | Hook                              | Lo que hace                                                                                                                                                                   | Cuándo usar                                                                                                                                                                                                                      |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                         | Publicar configuración del proveedor en `models.providers` durante la generación de `models.json`                                                                             | El proveedor posee un catálogo o valores predeterminados de URL base                                                                                                                                                             |
| 2   | `applyConfigDefaults`             | Aplicar valores predeterminados de configuración global propiedad del proveedor durante la materialización de la configuración                                                | Los valores predeterminados dependen del modo de autenticación, el entorno o la semántica de la familia de modelos del proveedor                                                                                                 |
| --  | _(búsqueda de modelo integrada)_  | OpenClaw intenta primero la ruta normal de registro/catálogo                                                                                                                  | _(no es un hook de plugin)_                                                                                                                                                                                                      |
| 3   | `normalizeModelId`                | Normalizar alias de id de modelo heredados o de vista previa antes de la búsqueda                                                                                             | El proveedor es propietario de la limpieza de alias antes de la resolución del modelo canónico                                                                                                                                   |
| 4   | `normalizeTransport`              | Normalizar `api` / `baseUrl` de la familia del proveedor antes del ensamblaje del modelo genérico                                                                             | El proveedor es propietario de la limpieza del transporte para ids de proveedor personalizados en la misma familia de transporte                                                                                                 |
| 5   | `normalizeConfig`                 | Normalizar `models.providers.<id>` antes de la resolución del tiempo de ejecución/proveedor                                                                                   | El proveedor necesita una limpieza de configuración que debería residir con el complemento; los auxiliares de la familia de Google incluidos también sirven de respaldo para las entradas de configuración de Google compatibles |
| 6   | `applyNativeStreamingUsageCompat` | Aplicar reescrituras de compatibilidad de uso de transmisión nativa a los proveedores de configuración                                                                        | El proveedor necesita correcciones de metadatos de uso de transmisión nativa impulsadas por el endpoint                                                                                                                          |
| 7   | `resolveConfigApiKey`             | Resolver la autenticación de marcadores de entorno para los proveedores de configuración antes de la carga de autenticación en tiempo de ejecución                            | El proveedor tiene una resolución de clave API de marcador de entorno propiedad del proveedor; `amazon-bedrock` también tiene un resolvedor de marcador de entorno de AWS incorporado aquí                                       |
| 8   | `resolveSyntheticAuth`            | Exponer autenticación local/autoalojada o respaldada por configuración sin conservar texto sin formato                                                                        | El proveedor puede operar con un marcador de credencial sintético/local                                                                                                                                                          |
| 9   | `resolveExternalAuthProfiles`     | Superponer perfiles de autenticación externos propiedad del proveedor; el `persistence` predeterminado es `runtime-only` para las credenciales propiedad de la CLI/aplicación | El proveedor reutiliza las credenciales de autenticación externa sin conservar tokens de actualización copiados                                                                                                                  |
| 10  | `shouldDeferSyntheticProfileAuth` | Reducir los marcadores de posición de perfil sintéticos almacenados detrás de la autenticación respaldada por entorno/configuración                                           | El proveedor almacena perfiles de marcadores de posición sintéticos que no deben ganar precedencia                                                                                                                               |
| 11  | `resolveDynamicModel`             | Respaldo síncrono para los identificadores de modelo propiedad del proveedor que aún no están en el registro local                                                            | El proveedor acepta identificadores de modelo de aguas arbitrarios                                                                                                                                                               |
| 12  | `prepareDynamicModel`             | Calentamiento asíncrono, luego `resolveDynamicModel` se ejecuta nuevamente                                                                                                    | El proveedor necesita metadatos de red antes de resolver identificadores desconocidos                                                                                                                                            |
| 13  | `normalizeResolvedModel`          | Reescritura final antes de que el ejecutor integrado utilice el modelo resuelto                                                                                               | El proveedor necesita reescrituras de transporte pero aún utiliza un transporte central                                                                                                                                          |
| 14  | `contributeResolvedModelCompat`   | Contribuir con banderas de compatibilidad para modelos de proveedores detrás de otro transporte compatible                                                                    | El proveedor reconoce sus propios modelos en transportes proxy sin hacerse cargo del proveedor                                                                                                                                   |
| 15  | `capabilities`                    | Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida                                                                   | El proveedor necesita peculiaridades de transcripción/familia de proveedores                                                                                                                                                     |
| 16  | `normalizeToolSchemas`            | Normalizar esquemas de herramientas antes de que el ejecutor integrado los vea                                                                                                | El proveedor necesita una limpieza de esquema de familia de transporte                                                                                                                                                           |
| 17  | `inspectToolSchemas`              | Exponer diagnósticos de esquema propiedad del proveedor después de la normalización                                                                                           | El proveedor quiere advertencias de palabras clave sin enseñar reglas específicas del núcleo del proveedor                                                                                                                       |
| 18  | `resolveReasoningOutputMode`      | Seleccionar contrato de salida de razonamiento nativo frente a etiquetado                                                                                                     | El proveedor necesita salida de razonamiento/final etiquetada en lugar de campos nativos                                                                                                                                         |
| 19  | `prepareExtraParams`              | Normalización de parámetros de solicitud antes de los contenedores de opciones de flujo genéricos                                                                             | El proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor                                                                                                                             |
| 20  | `createStreamFn`                  | Reemplazar completamente la ruta de flujo normal con un transporte personalizado                                                                                              | El proveedor necesita un protocolo de cable personalizado, no solo un contenedor                                                                                                                                                 |
| 21  | `wrapStreamFn`                    | Contenedor de flujo después de que se aplican los contenedores genéricos                                                                                                      | El proveedor necesita contenedores de compatibilidad de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado                                                                                                   |
| 22  | `resolveTransportTurnState`       | Adjuntar encabezados de transporte o metadatos nativos por turno                                                                                                              | El proveedor quiere que los transportes genéricos envíen identidad de turno nativa del proveedor                                                                                                                                 |
| 23  | `resolveWebSocketSessionPolicy`   | Adjuntar encabezados de WebSocket nativos o política de enfriamiento de sesión                                                                                                | El proveedor quiere que los transportes WS genéricos ajusten los encabezados de sesión o la política de respaldo                                                                                                                 |
| 24  | `formatApiKey`                    | Formateador de perfil de autenticación: el perfil almacenado se convierte en la cadena `apiKey` en tiempo de ejecución                                                        | El proveedor almacena metadatos de autenticación adicionales y necesita una forma de token de tiempo de ejecución personalizada                                                                                                  |
| 25  | `refreshOAuth`                    | Anulación de actualización de OAuth para endpoints de actualización personalizados o política de fallas de actualización                                                      | El proveedor no se ajusta a los actualizadores `pi-ai` compartidos                                                                                                                                                               |
| 26  | `buildAuthDoctorHint`             | Sugerencia de reparación adjunta cuando falla la actualización de OAuth                                                                                                       | El proveedor necesita orientación de reparación de autenticación propiedad del proveedor después de una falla de actualización                                                                                                   |
| 27  | `matchesContextOverflowError`     | Comparador de desbordamiento de ventana de contexto propiedad del proveedor                                                                                                   | El proveedor tiene errores de desbordamiento sin procesar que las heurísticas genéricas pasarían por alto                                                                                                                        |
| 28  | `classifyFailoverReason`          | Clasificación de motivo de conmutación por error propiedad del proveedor                                                                                                      | El proveedor puede asignar errores de API/transporte sin procesar a límite de tasa/sobrecarga/etc                                                                                                                                |
| 29  | `isCacheTtlEligible`              | Política de caché de avisos para proveedores de proxy/backhaul                                                                                                                | El proveedor necesita control de TTL de caché específico del proxy                                                                                                                                                               |
| 30  | `buildMissingAuthMessage`         | Reemplazo del mensaje genérico de recuperación de autenticación faltante                                                                                                      | El proveedor necesita una sugerencia de recuperación de autenticación faltante específica del proveedor                                                                                                                          |
| 31  | `suppressBuiltInModel`            | Supresión de modelos obsoletos ascendentes más sugerencia de error opcional para el usuario                                                                                   | El proveedor necesita ocultar filas ascendentes obsoletas o reemplazarlas con una sugerencia del proveedor                                                                                                                       |
| 32  | `augmentModelCatalog`             | Filas sintéticas/finales del catálogo añadidas después del descubrimiento                                                                                                     | El proveedor necesita filas sintéticas de compatibilidad futura en `models list` y selectores                                                                                                                                    |
| 33  | `isBinaryThinking`                | Interruptor de razonado activado/desactivado para proveedores de pensamiento binario                                                                                          | El proveedor expone solo el pensamiento binario activado/desactivado                                                                                                                                                             |
| 34  | `supportsXHighThinking`           | `xhigh` soporte de razonado para modelos seleccionados                                                                                                                        | El proveedor desea `xhigh` solo en un subconjunto de modelos                                                                                                                                                                     |
| 35  | `resolveDefaultThinkingLevel`     | Nivel `/think` predeterminado para una familia de modelos específica                                                                                                          | El proveedor posee la política `/think` predeterminada para una familia de modelos                                                                                                                                               |
| 36  | `isModernModelRef`                | Comparador de modelos modernos para filtros de perfil en vivo y selección de pruebas (smoke)                                                                                  | El proveedor posee la coincidencia de modelo preferido en vivo/pruebas                                                                                                                                                           |
| 37  | `prepareRuntimeAuth`              | Intercambiar una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia                                                           | El proveedor necesita un intercambio de tokens o una credencial de solicitud de corta duración                                                                                                                                   |
| 38  | `resolveUsageAuth`                | Resolver credenciales de uso/facturación para `/usage` y superficies de estado relacionadas                                                                                   | El proveedor necesita análisis personalizado de tokens de uso/cuota o una credencial de uso diferente                                                                                                                            |
| 39  | `fetchUsageSnapshot`              | Obtener y normalizar instantáneas de uso/cuota específicas del proveedor después de resolver la autenticación                                                                 | El proveedor necesita un punto final de uso específico del proveedor o un analizador de carga útil                                                                                                                               |
| 40  | `createEmbeddingProvider`         | Construir un adaptador de incrustaciones propiedad del proveedor para memoria/búsqueda                                                                                        | El comportamiento de incrustación de memoria pertenece al complemento del proveedor                                                                                                                                              |
| 41  | `buildReplayPolicy`               | Devolver una política de reproducción que controle el manejo de transcripciones para el proveedor                                                                             | El proveedor necesita una política de transcripción personalizada (por ejemplo, eliminación de bloques de pensamiento)                                                                                                           |
| 42  | `sanitizeReplayHistory`           | Reescribir el historial de reproducción después de la limpieza genérica de transcripciones                                                                                    | El proveedor necesita reescrituras de repetición específicas del proveedor más allá de los asistentes de compactación compartidos                                                                                                |
| 43  | `validateReplayTurns`             | Validación o reconfiguración final del turno de repetición antes del ejecutor integrado                                                                                       | El transporte del proveedor necesita una validación de turno más estricta después de la saneación genérica                                                                                                                       |
| 44  | `onModelSelected`                 | Ejecutar efectos secundarios posteriores a la selección propiedad del proveedor                                                                                               | El proveedor necesita telemetría o estado propio del proveedor cuando un modelo se vuelve activo                                                                                                                                 |

`normalizeModelId`, `normalizeTransport` y `normalizeConfig` primero comprueban el complemento del proveedor coincidente, luego pasan a otros complementos del proveedor con capacidad de enlace hasta que uno realmente cambia el ID del modelo o el transporte/configuración. Esto mantiene funcionando los shims de alias/compatibilidad del proveedor sin requerir que la persona que llama sepa qué complemento incluido es propietario de la reescritura. Si ningún enlace de proveedor reescribe una entrada de configuración de familia de Google compatible, el normalizador de configuración de Google incluido todavía aplica esa limpieza de compatibilidad.

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

- Anthropic usa `resolveDynamicModel`, `capabilities`, `buildAuthDoctorHint`,
  `resolveUsageAuth`, `fetchUsageSnapshot`, `isCacheTtlEligible`,
  `resolveDefaultThinkingLevel`, `applyConfigDefaults`, `isModernModelRef`,
  y `wrapStreamFn` porque es propietario de la compatibilidad hacia adelante de Claude 4.6,
  sugerencias de familia de proveedores, guía de reparación de autenticación, integración de punto final de uso,
  elegibilidad de caché de solicitudes, valores predeterminados de configuración conscientes de autenticación, política
  de pensamiento predeterminada/adaptable de Claude y modelado de flujo específico de Anthropic para
  n encabezados beta, `/fast` / `serviceTier` y `context1m`.
- Los auxiliares de transmisión específicos de Claude de Anthropic permanecen por ahora en la costura pública `api.ts` / `contract-api.ts` del complemento incluido. Esa superficie del paquete exporta `wrapAnthropicProviderStream`, `resolveAnthropicBetas`,
  `resolveAnthropicFastMode`, `resolveAnthropicServiceTier` y los constructores de envoltorios Anthropic de nivel inferior en lugar de ampliar el SDK genérico en torno a las reglas de beta-header de un solo proveedor.
- OpenAI usa `resolveDynamicModel`, `normalizeResolvedModel` y
  `capabilities` más `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` y `isModernModelRef`
  porque es propietaria de la compatibilidad futura de GPT-5.4, la normalización directa de OpenAI `openai-completions` -> `openai-responses`, sugerencias de autenticación compatibles con Codex, supresión de Spark, filas de lista sintéticas de OpenAI y la política de pensamiento / modelo en vivo de GPT-5; la familia de flujos `openai-responses-defaults` posee los envoltorios nativos compartidos de OpenAI Responses para los encabezados de atribución,
  `/fast`/`serviceTier`, verbosidad del texto, búsqueda web nativa de Codex, conformación de payload compatible con razonamiento y gestión del contexto de Responses.
- OpenRouter usa `catalog` más `resolveDynamicModel` y
  `prepareDynamicModel` porque el proveedor es de paso y puede exponer nuevos ids de modelo antes de que se actualice el catálogo estático de OpenClaw; también usa
  `capabilities`, `wrapStreamFn` y `isCacheTtlEligible` para mantener
  los encabezados de solicitud específicos del proveedor, los metadatos de enrutamiento, los parches de razonamiento y la política de caché de avisos fuera del núcleo. Su política de repetición proviene de la
  familia `passthrough-gemini`, mientras que la familia de flujos `openrouter-thinking`
  posee la inyección de razonamiento proxy y las omisiones de modelo no compatible / `auto`.
- GitHub Copilot usa `catalog`, `auth`, `resolveDynamicModel` y
  `capabilities` además de `prepareRuntimeAuth` y `fetchUsageSnapshot` porque
  necesita inicio de sesión de dispositivo propiedad del proveedor, comportamiento de reserva del modelo, peculiaridades
  de las transcripciones de Claude, un intercambio de token de GitHub -> token de Copilot y un punto de conexión de uso
  propiedad del proveedor.
- OpenAI Codex usa `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` y `augmentModelCatalog` además de
  `prepareExtraParams`, `resolveUsageAuth` y `fetchUsageSnapshot` porque
  aún se ejecuta en transportes principales de OpenAI pero posee su propia normalización de transporte/URL base,
  política de reserva de actualización de OAuth, elección de transporte predeterminada,
  filas sintéticas del catálogo de Codex e integración del punto de conexión de uso de ChatGPT; comparte
  la misma familia de flujos `openai-responses-defaults` que OpenAI directo.
- Google AI Studio y Gemini CLI OAuth usan `resolveDynamicModel`,
  `buildReplayPolicy`, `sanitizeReplayHistory`,
  `resolveReasoningOutputMode`, `wrapStreamFn` y `isModernModelRef` porque la
  familia de reproducción `google-gemini` posee la reserva de compatibilidad hacia adelante de Gemini 3.1,
  validación de reproducción nativa de Gemini, saneamiento de reproducción de arranque, modo de salida de razonamiento
  etiquetado y coincidencia de modelos modernos, mientras que la
  familia de flujos `google-thinking` posee la normalización de carga útil de pensamiento de Gemini;
  Gemini CLI OAuth también usa `formatApiKey`, `resolveUsageAuth` y
  `fetchUsageSnapshot` para el formato de token, el análisis de token y la conexión del punto de conexión de cuota.
- Anthropic Vertex usa `buildReplayPolicy` a través de la
  familia de reproducción `anthropic-by-model` para que la limpieza de reproducción específica de Claude
  permanezca limitada a los ids de Claude en lugar de a cada transporte `anthropic-messages`.
- Amazon Bedrock usa `buildReplayPolicy`, `matchesContextOverflowError`,
  `classifyFailoverReason` y `resolveDefaultThinkingLevel` porque posee
  la clasificación de errores de estrangulamiento/no listo/desbordamiento de contexto
  específica de Bedrock para el tráfico de Anthropic-on-Bedrock; su política de repetición
  todavía comparte el mismo guardia `anthropic-by-model` solo para Claude.
- OpenRouter, Kilocode, Opencode y Opencode Go usan `buildReplayPolicy`
  a través de la familia de repetición `passthrough-gemini` porque actúan como
  proxies de modelos Gemini a través de transportes compatibles con OpenAI y necesitan
  la limpieza de firmas de pensamiento de Gemini sin validación nativa de repetición
  Gemini o reescrituras de arranque.
- MiniMax usa `buildReplayPolicy` a través de la familia de repetición
  `hybrid-anthropic-openai` porque un proveedor es propietario tanto de la
  semántica de mensajes de Anthropic como de la compatible con OpenAI; mantiene la
  eliminación de bloques de pensamiento solo para Claude en el lado de Anthropic mientras
  que anula el modo de salida de razonamiento de vuelta a nativo, y la familia de
  transmisión `minimax-fast-mode` posee las reescrituras de modelos
  en modo rápido en la ruta de transmisión compartida.
- Moonshot usa `catalog` más `wrapStreamFn` porque todavía usa
  el transporte OpenAI compartido pero necesita la normalización de carga útil de
  pensamiento propiedad del proveedor; la familia de transmisión `moonshot-thinking`
  asigna la configuración más el estado `/think` a su carga útil
  binaria de pensamiento nativa.
- Kilocode usa `catalog`, `capabilities`, `wrapStreamFn` y
  `isCacheTtlEligible` porque necesita encabezados de solicitud propiedad del
  proveedor, normalización de carga útil de razonamiento, sugerencias de transcripción
  de Gemini y compuerta de caché-TTL de Anthropic; la familia de transmisión `kilocode-thinking`
  mantiene la inyección de pensamiento de Kilo en la ruta de transmisión de proxy
  compartida mientras omite `kilo/auto` y otros ids de modelos de
  proxy que no admiten cargas útiles de razonamiento explícitas.
- Z.AI usa `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` y `fetchUsageSnapshot` porque es propietario de la reserva de GLM-5,
  valores predeterminados de `tool_stream`, UX de pensamiento binario, coincidencia de modelos modernos y tanto la autenticación de uso + obtención de cuotas; la familia de secuencias `tool-stream-default-on` mantiene
  el contenedor `tool_stream` activado por defecto fuera del "glue" (código pegamento) escrito a mano por proveedor.
- xAI usa `normalizeResolvedModel`, `normalizeTransport`,
  `contributeResolvedModelCompat`, `prepareExtraParams`, `wrapStreamFn`,
  `resolveSyntheticAuth`, `resolveDynamicModel` y `isModernModelRef`
  porque es propietario de la normalización nativa del transporte de Respuestas de xAI, reescrituras de alias de modo rápido Grok, `tool_stream` predeterminado,
  limpieza de herramientas estrictas/payload de razonamiento, reutilización de autenticación de reserva para herramientas propiedad del complemento, resolución de modelos Grok con compatibilidad futura y parches de compatibilidad propiedad del proveedor, como el perfil de esquema de herramientas de xAI,
  palabras clave de esquema no admitidas, `web_search` nativo
  y decodificación de argumentos de llamada a herramientas de entidades HTML.
- Mistral, OpenCode Zen y OpenCode Go usan `capabilities` solo para mantener
  las peculiaridades de transcripción/herramientas fuera del núcleo.
- Los proveedores empaquetados solo de catálogo, como `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` usan
  solo `catalog`.
- Qwen usa `catalog` para su proveedor de texto más registros compartidos de comprensión de medios
  y generación de video para sus superficies multimodales.
- MiniMax y Xiaomi usan `catalog` más hooks de uso porque su comportamiento de `/usage` es propiedad del complemento aunque la inferencia aún se ejecuta a través de los transportes compartidos.

## Asistentes de tiempo de ejecución

Los complementos pueden acceder a asistentes centrales seleccionados a través de `api.runtime`. Para TTS:

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

- `textToSpeech` devuelve la carga útil de salida de TTS central normal para superficies de archivo/nota de voz.
- Usa la configuración `messages.tts` central y la selección de proveedor.
- Devuelve el búfer de audio PCM + la tasa de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
- `listVoices` es opcional por proveedor. Úselo para selectores de voz propiedad del proveedor o flujos de configuración.
- Las listas de voces pueden incluir metadatos más ricos, como configuración regional, género y etiquetas de personalidad para selectores compatibles con el proveedor.
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

- Mantenga la política de TTS, la reserva y la entrega de respuestas en el núcleo.
- Use proveedores de voz para el comportamiento de síntesis propiedad del proveedor.
- La entrada de `edge` de Microsoft heredada se normaliza al id. de proveedor `microsoft`.
- El modelo de propiedad preferido está orientado a la empresa: un complemento de proveedor puede ser propietario de proveedores de texto, voz, imagen y medios futuros a medida que OpenClaw agregue esos contratos de capacidad.

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

- Mantenga la orquestación, la reserva, la configuración y el cableado del canal en el núcleo.
- Mantenga el comportamiento del proveedor en el complemento del proveedor.
- La expansión aditiva debe permanecer tipada: nuevos métodos opcionales, nuevos campos de resultado opcionales, nuevas capacidades opcionales.
- La generación de video ya sigue el mismo patrón:
  - el núcleo es propietario del contrato de capacidad y el asistente de tiempo de ejecución
  - los complementos del proveedor registran `api.registerVideoGenerationProvider(...)`
  - los complementos de característica/canal consumen `api.runtime.videoGeneration.*`

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

- `api.runtime.mediaUnderstanding.*` es la superficie compartida preferida para
  el entendimiento de imagen/audio/video.
- Usa la configuración de audio de entendimiento de medios principal (`tools.media.audio`) y el orden de reserva del proveedor.
- Devuelve `{ text: undefined }` cuando no se produce ninguna salida de transcripción (por ejemplo, entrada omitida/no compatible).
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

- `provider` y `model` son anulaciones opcionales por ejecución, no cambios persistentes de la sesión.
- OpenClaw solo respeta esos campos de anulación para llamadores de confianza.
- Para ejecuciones de reserva propiedad del complemento, los operadores deben optar por participar con `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Use `plugins.entries.<id>.subagent.allowedModels` para restringir los complementos de confianza a objetivos `provider/model` canónicos específicos, o `"*"` para permitir cualquier objetivo explícitamente.
- Las ejecuciones de subagentes de complementos que no son de confianza aún funcionan, pero las solicitudes de anulación se rechazan en lugar de recurrir silenciosamente.

Para la búsqueda web, los complementos pueden consumir el asistente de tiempo de ejecución compartido en lugar de
acceder al cableado de herramientas del agente:

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

Los complementos también pueden registrar proveedores de búsqueda web a través de
`api.registerWebSearchProvider(...)`.

Notas:

- Mantenga la selección del proveedor, la resolución de credenciales y la semántica de solicitud compartida en el núcleo.
- Use proveedores de búsqueda web para transportes de búsqueda específicos del proveedor.
- `api.runtime.webSearch.*` es la superficie compartida preferida para complementos de características/canales que necesitan comportamiento de búsqueda sin depender del contenedor de herramientas del agente.

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

- `generate(...)`: generar una imagen utilizando la cadena de proveedores de generación de imágenes configurada.
- `listProviders(...)`: enumerar los proveedores de generación de imágenes disponibles y sus capacidades.

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

- `path`: ruta de acceso bajo el servidor HTTP gateway.
- `auth`: obligatorio. Use `"gateway"` para requerir la autenticación normal de la puerta de enlace, o `"plugin"` para la autenticación administrada por el complemento/verificación de webhook.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelve `true` cuando la ruta manejó la solicitud.

Notas:

- `api.registerHttpHandler(...)` se eliminó y causará un error de carga del complemento. Use `api.registerHttpRoute(...)` en su lugar.
- Las rutas de los complementos deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un complemento no puede reemplazar la ruta de otro complemento.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantenga las cadenas de reserva `exact`/`prefix` solo en el mismo nivel de autenticación.
- Las rutas `auth: "plugin"` **no** reciben alcances de tiempo de ejecución del operador automáticamente. Son para webhooks administrados por el complemento/verificación de firmas, no para llamadas auxiliares privilegiadas de la puerta de enlace.
- Las rutas `auth: "gateway"` se ejecutan dentro de un alcance de tiempo de ejecución de solicitud de la puerta de enlace, pero ese alcance es intencionalmente conservador:
  - la autenticación de portador de secreto compartido (`gateway.auth.mode = "token"` / `"password"`) mantiene los alcances de tiempo de ejecución de la ruta del complemento fijados a `operator.write`, incluso si el remitente envía `x-openclaw-scopes`
  - los modos HTTP de identidad confiable (por ejemplo `trusted-proxy` o `gateway.auth.mode = "none"` en un ingreso privado) respetan `x-openclaw-scopes` solo cuando el encabezado está explícitamente presente
  - si `x-openclaw-scopes` está ausente en esas solicitudes de ruta de complemento con identidad, el alcance de tiempo de ejecución vuelve a `operator.write`
- Regla práctica: no asuma que una ruta de complemento de autenticación de puerta de enlace es una superficie de administrador implícita. Si su ruta requiere un comportamiento solo para administradores, requiera un modo de autenticación con identidad y documente el contrato del encabezado `x-openclaw-scopes` explícito.

## Rutas de importación del SDK de complementos

Use las subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` al
autorizar complementos:

- `openclaw/plugin-sdk/plugin-entry` para primitivas de registro de complementos.
- `openclaw/plugin-sdk/core` para el contrato genérico compartido orientado al complemento.
- `openclaw/plugin-sdk/config-schema` para el esquema Zod `openclaw.json` raíz
  export (`OpenClawSchema`).
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
  `channel-inbound` es el hogar compartido para debounce, coincidencia de menciones,
  asistentes de políticas de menciones entrantes, formato de sobres y asistentes de contexto de
  sobres entrantes.
  `channel-setup` es la costura de configuración de instalación opcional estrecha.
  `setup-runtime` es la superficie de configuración segura en tiempo de ejecución utilizada por `setupEntry` /
  inicio diferido, incluyendo los adaptadores de parches de configuración seguros para importar.
  `setup-adapter-runtime` es la costura del adaptador de configuración de cuenta consciente del entorno.
  `setup-tools` es la pequeña costura de asistentes de CLI/archivo/documentos (`formatCliCommand`,
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
  de comandos personalizados de Telegram y permanece disponible incluso si la
  superficie del contrato incluido de Telegram está temporalmente no disponible.
  `text-runtime` es la costura compartida de texto/markdown/registro, que incluye
  el eliminado de texto visible para el asistente, asistentes de renderizado/división de markdown,
  asistentes de redacción, asistentes de etiquetas de directiva y utilidades de texto seguro.
- Las costuras del canal específicas de aprobación deben preferir un contrato `approvalCapability`
  en el complemento. Core luego lee la autenticación de aprobación, entrega, renderizado,
  enrutamiento nativo y comportamiento del controlador nativo diferido a través de esa única capacidad
  en lugar de mezclar el comportamiento de aprobación en campos de complementos no relacionados.
- `openclaw/plugin-sdk/channel-runtime` está obsoleto y permanece solo como
  una shim de compatibilidad para complementos más antiguos. El código nuevo debe importar los
  primitivos genéricos más estrechos en su lugar, y el código del repositorio no debe agregar nuevas importaciones del
  shim.
- Los internos de la extensión incluida permanecen privados. Los complementos externos deben usar solo
  subrutas `openclaw/plugin-sdk/*`. El código de prueba/core de OpenClaw puede usar los puntos
  de entrada públicos del repositorio bajo una raíz de paquete de complemento como `index.js`, `api.js`,
  `runtime-api.js`, `setup-entry.js` y archivos de alcance estrecho como
  `login-qr-api.js`. Nunca importe un `src/*` de un paquete de complementos desde core o desde
  otra extensión.
- División del punto de entrada del repositorio:
  `<plugin-package-root>/api.js` es el barril de auxiliares/tipos,
  `<plugin-package-root>/runtime-api.js` es el barril solo de tiempo de ejecución,
  `<plugin-package-root>/index.js` es el punto de entrada del complemento empaquetado,
  y `<plugin-package-root>/setup-entry.js` es el punto de entrada del complemento de configuración.
- Ejemplos actuales de proveedores empaquetados:
  - Anthropic usa `api.js` / `contract-api.js` para los auxiliares de transmisión de Claude, como
    `wrapAnthropicProviderStream`, los auxiliares de cabecera beta y el análisis de
    `service_tier`.
  - OpenAI usa `api.js` para los constructores de proveedores, los auxiliares de modelo predeterminado y
    los constructores de proveedores en tiempo real.
  - OpenRouter usa `api.js` para su constructor de proveedores, además de los auxiliares de incorporación/configuración,
    mientras que `register.runtime.js` todavía puede reexportar los auxiliares genéricos
    `plugin-sdk/provider-stream` para uso local en el repositorio.
- Los puntos de entrada públicos cargados por fachada prefieren la instantánea de configuración de tiempo de ejecución activa
  cuando existe una, y luego recurren al archivo de configuración resuelto en disco cuando
  OpenClaw aún no está sirviendo una instantánea de tiempo de ejecución.
- Las primitivas compartidas genéricas siguen siendo el contrato público del SDK preferido. Todavía
  existe un pequeño conjunto de compatibilidad reservado de costuras de auxiliares con marca de canal empaquetado.
  Trátelas como costuras de mantenimiento/compatibilidad empaquetadas, no como nuevos
  objetivos de importación para terceros; los nuevos contratos multi-canal deben ubicarse todavía en
  las subrutas genéricas de `plugin-sdk/*` o en los barriles `api.js` /
  `runtime-api.js` locales del complemento.

Nota de compatibilidad:

- Evite el barril raíz `openclaw/plugin-sdk` para el código nuevo.
- Prefiera primero las primitivas estables estrechas. Las subrutas más nuevas de configuración/emparejamiento/respuesta/
  comentarios/contrato/entrada/hilos/comando/entrada-secreta/webhook/infra/
  lista-permitida/estado/herramienta-mensaje son el contrato previsto para el nuevo trabajo
  de complementos empaquetados y externos.
  El análisis/coincidencia de objetivos pertenece a `openclaw/plugin-sdk/channel-targets`.
  Las compuertas de acción de mensaje y los auxiliares de ID de mensaje de reacción pertenecen a
  `openclaw/plugin-sdk/channel-actions`.
- Los barriles de ayuda específicos de extensiones empaquetadas no son estables por defecto. Si una ayuda solo es necesaria para una extensión empaquetada, manténgala detrás de la costura local `api.js` o `runtime-api.js` de la extensión en lugar de promoverla a `openclaw/plugin-sdk/<extension>`.
- Las nuevas costuras de ayuda compartidas deben ser genéricas, no de marca de canal. El análisis compartido de objetivos pertenece a `openclaw/plugin-sdk/channel-targets`; los internos específicos del canal se mantienen detrás de la costura local `api.js` o `runtime-api.js` del plugin propietario.
- Las subrutas específicas de capacidad como `image-generation`, `media-understanding` y `speech` existen porque los plugins empaquetados/nativos las usan hoy. Su presencia no significa por sí misma que cada ayuda exportada sea un contrato externo congelado a largo plazo.

## Esquemas de herramientas de mensajes

Los plugins deben ser propietarios de las contribuciones al esquema `describeMessageTool(...)` específicas del canal. Mantenga los campos específicos del proveedor en el plugin, no en el núcleo compartido.

Para fragmentos de esquemas portátiles compartidos, reutilice las ayudas genéricas exportadas a través de `openclaw/plugin-sdk/channel-actions`:

- `createMessageToolButtonsSchema()` para payloads estilo cuadrícula de botones
- `createMessageToolCardSchema()` para payloads de tarjetas estructuradas

Si una forma de esquema solo tiene sentido para un proveedor, defínala en la fuente propia de ese plugin en lugar de promoverla al SDK compartido.

## Resolución de objetivos de canal

Los plugins de canal deben ser propietarios de la semántica de objetivos específicos del canal. Mantenga el host saliente compartido genérico y use la superficie del adaptador de mensajería para las reglas del proveedor:

- `messaging.inferTargetChatType({ to })` decide si un objetivo normalizado debe tratarse como `direct`, `group` o `channel` antes de la búsqueda en el directorio.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indica al núcleo si una entrada debe omitir directamente la resolución tipo id en lugar de la búsqueda en el directorio.
- `messaging.targetResolver.resolveTarget(...)` es el respaldo del plugin cuando el núcleo necesita una resolución final propiedad del proveedor después de la normalización o después de un fallo en el directorio.
- `messaging.resolveOutboundSessionRoute(...)` es propietario de la construcción de rutas de sesión específicas del proveedor una vez que se resuelve un objetivo.

División recomendada:

- Use `inferTargetChatType` para las decisiones de categoría que deben ocurrir antes de buscar pares/grupos.
- Use `looksLikeId` para las comprobaciones de "tratar esto como un id de destino explícito/nativo".
- Use `resolveTarget` para la reserva de normalización específica del proveedor, no para una búsqueda amplia de directorio.
- Mantenga los ids nativos del proveedor como ids de chat, ids de hilo, JIDs, identificadores y ids de sala dentro de los valores `target` o parámetros específicos del proveedor, no en campos genéricos del SDK.

## Directorios respaldados por configuración

Los complementos que derivan entradas de directorio de la configuración deben mantener esa lógica en el complemento y reutilizar los ayudantes compartidos de `openclaw/plugin-sdk/directory-runtime`.

Use esto cuando un canal necesite pares/grupos respaldados por configuración, tales como:

- pares de MD impulsados por lista de permitidos
- mapas de canal/grupo configurados
- reservas de directorio estático con ámbito de cuenta

Los ayudantes compartidos en `directory-runtime` solo manejan operaciones genéricas:

- filtrado de consultas
- aplicación de límites
- ayudantes de deduplicación/normalización
- construcción de `ChannelDirectoryEntry[]`

La inspección de cuenta específica del canal y la normalización de ids deben permanecer en la implementación del complemento.

## Catálogos de proveedores

Los complementos de proveedor pueden definir catálogos de modelos para inferencia con `registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma forma que OpenClaw escribe en `models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento posee ids de modelo específicos del proveedor, valores predeterminados de URL base o metadatos de modelo restringidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores simples de API-key o impulsados por entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedor relacionadas
- `late`: último pase, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de claves, por lo que los complementos pueden anular intencionalmente una entrada de proveedor integrada con el mismo id de proveedor.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado
- si están registrados tanto `catalog` como `discovery`, OpenClaw usa `catalog`

## Inspección de canal de solo lectura

Si su complemento registra un canal, prefiera implementar
`plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de ejecución. Se permite asumir que las credenciales
  están completamente materializadas y puede fallar rápido cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura, como `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, y los flujos de reparación
  de doctor/config no deberían necesitar materializar las credenciales de ejecución solo para
  describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devolver solo el estado descriptivo de la cuenta.
- Conservar `enabled` y `configured`.
- Incluir campos de origen/estado de credenciales cuando sea relevante, como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No necesita devolver valores de token sin procesar solo para reportar la disponibilidad
  de solo lectura. Devolver `tokenStatus: "available"` (y el campo de origen
  coincidente) es suficiente para los comandos de estilo de estado.
- Use `configured_unavailable` cuando una credencial está configurada a través de SecretRef pero
  no disponible en la ruta de comando actual.

Esto permite que los comandos de solo lectura informen "configurado pero no disponible en esta ruta de
decomando" en lugar de bloquearse o reportar erróneamente que la cuenta no está configurada.

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

Salvaguarda de seguridad: cada entrada de `openclaw.extensions` debe permanecer dentro del directorio del
complemento después de resolver los enlaces simbólicos. Las entradas que salen del directorio del paquete son
rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias del complemento con
`npm install --omit=dev --ignore-scripts` (sin scripts de ciclo de vida, sin dependencias de desarrollo en tiempo de ejecución). Mantén los árboles de dependencias del complemento
"JS/TS puro" y evita paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración.
Cuando OpenClaw necesita superficies de configuración para un complemento de canal deshabilitado, o
cuando un complemento de canal está habilitado pero aún no configurado, carga `setupEntry`
en lugar de la entrada completa del complemento. Esto mantiene el inicio y la configuración más ligeros
cuando la entrada principal de tu complemento también conecta herramientas, hooks u otro código
de solo tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
puede optar por que un complemento de canal siga la misma ruta `setupEntry` durante la fase de inicio
previa a la escucha del gateway, incluso cuando el canal ya está configurado.

Usa esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir
antes de que el gateway comience a escuchar. En la práctica, esto significa que la entrada de configuración
debe registrar cada capacidad propiedad del canal de la cual depende el inicio, tales como:

- el propio registro del canal
- cualquier ruta HTTP que debe estar disponible antes de que el gateway comience a escuchar
- cualquier método, herramienta o servicio del gateway que deba existir durante esa misma ventana

Si tu entrada completa aún posee alguna capacidad de inicio requerida, no actives
esta bandera. Mantén el complemento en el comportamiento predeterminado y deja que OpenClaw cargue la
entrada completa durante el inicio.

Los canales empaquetados también pueden publicar asistentes de superficie de contrato solo de configuración que el núcleo
puede consultar antes de que se cargue el tiempo de ejecución completo del canal. La superficie actual de
promoción de configuración es:

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

Core utiliza esa superficie cuando necesita promocionar una configuración de canal de cuenta única heredada en `channels.<id>.accounts.*` sin cargar la entrada completa del complemento. Matrix es el ejemplo incluido actual: mueve solo las claves de autenticación/inicialización a una cuenta promovida con nombre cuando ya existen cuentas con nombre, y puede preservar una clave de cuenta predeterminada configurada no canónica en lugar de crear siempre `accounts.default`.

Esos adaptadores de parches de configuración mantienen el descubrimiento de la superficie del contrato incluido diferido. El tiempo de importación se mantiene ligero; la superficie de promoción se carga solo en el primer uso en lugar de volver a entrar en el inicio del canal incluido en la importación del módulo.

Cuando esas superficies de inicio incluyen métodos RPC de puerta de enlace, manténgalos en un prefijo específico del complemento. Los espacios de nombres de administración de Core (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) permanecen reservados y siempre se resuelven en `operator.admin`, incluso si un complemento solicita un ámbito más estrecho.

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

Los complementos de canal pueden anunciar metadatos de configuración/descubrimiento a través de `openclaw.channel` e indicaciones de instalación a través de `openclaw.install`. Esto mantiene el catálogo principal libre de datos.

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
- `preferOver`: identificadores de complemento/canal de menor prioridad que esta entrada de catálogo debería superar
- `selectionDocsPrefix`, `selectionDocsOmitLabel`, `selectionExtras`: controles de copia de la superficie de selección
- `markdownCapable`: marca el canal como capaz de usar markdown para decisiones de formato de salida
- `exposure.configured`: oculta el canal de las superficies de listado de canales configurados cuando se establece en `false`
- `exposure.setup`: oculta el canal de los selectores de configuración/configuración interactiva cuando se establece en `false`
- `exposure.docs`: marca el canal como interno/privado para las superficies de navegación de la documentación
- `showConfigured` / `showInSetup`: alias heredados aún aceptados por compatibilidad; se prefiere `exposure`
- `quickstartAllowFrom`: optar por que el canal se incluya en el flujo de `allowFrom` de inicio rápido estándar
- `forceAccountBinding`: requerir vinculación explícita de la cuenta incluso cuando solo existe una cuenta
- `preferSessionLookupForAnnounceTarget`: preferir la búsqueda de sesión al resolver objetivos de anuncio

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación del registro MPM). Coloque un archivo JSON en uno de:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas/punto y coma/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. El analizador también acepta `"packages"` o `"plugins"` como alias heredados para la clave `"entries"`.

## Plugins del motor de contexto

Los plugins del motor de contexto son propietarios de la orquestación del contexto de sesión para ingesta, ensamblaje
y compactación. Regístrelos desde su plugin con
`api.registerContextEngine(id, factory)`, luego seleccione el motor activo con
`plugins.slots.contextEngine`.

Use esto cuando su plugin necesite reemplazar o extender la canalización de contexto predeterminada
en lugar de simplemente agregar búsqueda de memoria o enlaces.

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

Cuando un plugin necesita un comportamiento que no se ajusta a la API actual, no omita
el sistema de plugins con un alcance privado. Agregue la capacidad faltante.

Secuencia recomendada:

1. definir el contrato principal
   Decida qué comportamiento compartido debe ser propiedad del núcleo: política, respaldo, fusión de configuración,
   ciclo de vida, semántica orientada al canal y forma del asistente de tiempo de ejecución.
2. agregar superficies de registro/tiempo de ejecución de plugins tipados
   Extienda `OpenClawPluginApi` y/o `api.runtime` con la superficie de capacidad tipada
   más pequeña útil.
3. conectar núcleo + consumidores de canal/características
   Los complementos de canales y características deben consumir la nueva capacidad a través del núcleo,
   no importando directamente una implementación de proveedor.
4. registrar implementaciones de proveedor
   Los complementos de proveedores luego registran sus backends contra la capacidad.
5. agregar cobertura de contrato
   Agregar pruebas para que la propiedad y la forma de registro permanezcan explícitas con el tiempo.

Así es como OpenClaw mantiene una opinión firme sin volverse rígida a la visión del mundo de un
solo proveedor. Consulte el [Capability Cookbook](/es/tools/capability-cookbook)
para obtener una lista de verificación de archivos concreta y un ejemplo práctico.

### Lista de verificación de capacidades

Cuando agrega una nueva capacidad, la implementación generalmente debe tocar estas
superficies juntas:

- tipos de contrato central en `src/<capability>/types.ts`
- asistente de ejecución/ejecución central en `src/<capability>/runtime.ts`
- superficie de registro de la API de complementos en `src/plugins/types.ts`
- cableado del registro de complementos en `src/plugins/registry.ts`
- exposición del tiempo de ejecución del complemento en `src/plugins/runtime/*` cuando los complementos de
  características/canales necesiten consumirla
- asistentes de captura/prueba en `src/test-utils/plugin-registration.ts`
- afirmaciones de propiedad/contrato en `src/plugins/contracts/registry.ts`
- documentación del operador/complemento en `docs/`

Si falta una de esas superficies, generalmente es una señal de que la capacidad aún
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

- el núcleo posee el contrato de capacidad + orquestación
- los complementos de proveedores poseen las implementaciones de proveedores
- los complementos de características/canales consumen asistentes de tiempo de ejecución
- las pruebas de contrato mantienen la propiedad explícita
