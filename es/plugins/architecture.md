---
summary: "Interno de la arquitectura de plugins: modelo de capacidades, propiedad, contratos, canalización de carga, asistentes de tiempo de ejecución"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Arquitectura de plugins"
---

# Arquitectura de plugins

Esta página cubre la arquitectura interna del sistema de plugins de OpenClaw. Para la configuración, descubrimiento y configuración orientados al usuario, consulte [Plugins](/es/tools/plugin).

## Modelo de capacidades público

Las capacidades son el modelo público de **plugin nativo** dentro de OpenClaw. Cada plugin nativo de OpenClaw se registra contra uno o más tipos de capacidades:

| Capacidad              | Método de registro                            | Plugins de ejemplo        |
| ---------------------- | --------------------------------------------- | ------------------------- |
| Inferencia de texto    | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| Voz                    | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| Comprensión de medios  | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| Generación de imágenes | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Búsqueda web           | `api.registerWebSearchProvider(...)`          | `google`                  |
| Canal / mensajería     | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

Un plugin que registra cero capacidades pero proporciona hooks, herramientas o servicios es un plugin **solo con hooks heredados**. Ese patrón todavía es totalmente compatible.

### Postura de compatibilidad externa

El modelo de capacidades está integrado en el núcleo y lo utilizan los plugins empaquetados/nativos hoy en día, pero la compatibilidad de los plugins externos aún necesita un estándar más estricto que "está exportado, por lo tanto está congelado".

Orientación actual:

- **plugins externos existentes:** mantener funcionando las integraciones basadas en hooks; tratar esto como la línea base de compatibilidad
- **nuevos plugins empaquetados/nativos:** preferir el registro explícito de capacidades en lugar de extensiones específicas del proveedor o nuevos diseños solo con hooks
- **plugins externos que adopten el registro de capacidades:** permitido, pero tratar las superficies auxiliares específicas de la capacidad como en evolución a menos que los documentos marquen explícitamente un contrato como estable

Regla práctica:

- las API de registro de capacidades son la dirección prevista
- los hooks heredados siguen siendo la ruta más segura sin interrupciones para los complementos externos durante la transición
- las subrutas de ayuda exportadas no son todas iguales; prefiera el contrato documentado y limitado, no las exportaciones de ayuda incidentales

### Formas de complementos

OpenClaw clasifica cada complemento cargado en una forma basada en su comportamiento de registro real (no solo en metadatos estáticos):

- **plain-capability** -- registra exactamente un tipo de capacidad (por ejemplo, un complemento solo de proveedor como `mistral`)
- **hybrid-capability** -- registra múltiples tipos de capacidades (por ejemplo, `openai` posee inferencia de texto, voz, comprensión multimedia y generación de imágenes)
- **hook-only** -- registra solo hooks (tipados o personalizados), sin capacidades, herramientas, comandos o servicios
- **non-capability** -- registra herramientas, comandos, servicios o rutas pero sin capacidades

Use `openclaw plugins inspect <id>` para ver la forma de un complemento y su desglose de capacidades. Consulte [referencia de CLI](/es/cli/plugins#inspect) para obtener más detalles.

### Hooks heredados

El hook `before_agent_start` sigue siendo compatible como una ruta de compatibilidad para complementos solo de hook. Los complementos heredados del mundo real todavía dependen de él.

Dirección:

- mantenerlo funcionando
- documentarlo como heredado
- preferir `before_model_resolve` para el trabajo de anulación de modelo/proveedor
- preferir `before_prompt_build` para el trabajo de mutación de prompts
- eliminar solo cuando el uso real disminuya y la cobertura de pruebas demuestre la seguridad de la migración

### Señales de compatibilidad

Cuando ejecuta `openclaw doctor` o `openclaw plugins inspect <id>`, puede ver una de estas etiquetas:

| Señal                             | Significado                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------- |
| **config válida**                 | La configuración se analiza bien y los complementos se resuelven                |
| **advertencia de compatibilidad** | El complemento usa un patrón compatible pero antiguo (por ejemplo, `hook-only`) |
| **advertencia heredada**          | El complemento usa `before_agent_start`, que está obsoleto                      |
| **error grave**                   | La configuración no es válida o el complemento no pudo cargar                   |

Ni `hook-only` ni `before_agent_start` romperán tu complemento hoy --
`hook-only` es consultivo, y `before_agent_start` solo activa una advertencia. Estas
señales también aparecen en `openclaw status --all` y `openclaw plugins doctor`.

## Resumen de la arquitectura

El sistema de complementos de OpenClaw tiene cuatro capas:

1. **Manifiesto + descubrimiento**
   OpenClaw encuentra complementos candidatos desde rutas configuradas, raíces del espacio de trabajo,
   raíces de extensiones globales y extensiones empaquetadas. El descubrimiento lee manifiestos nativos
   `openclaw.plugin.json` además de los manifiestos de paquetes soportados primero.
2. **Habilitación + validación**
   Core decide si un complemento descubierto está habilitado, deshabilitado, bloqueado, o
   seleccionado para un espacio exclusivo como la memoria.
3. **Carga en tiempo de ejecución**
   Los complementos nativos de OpenClaw se cargan en proceso a través de jiti y registran
   capacidades en un registro central. Los paquetes compatibles se normalizan en
   registros del registro sin importar código de tiempo de ejecución.
4. **Consumo de superficie**
   El resto de OpenClaw lee el registro para exponer herramientas, canales, configuración
   de proveedores, ganchos, rutas HTTP, comandos CLI y servicios.

El límite de diseño importante:

- el descubrimiento + validación de configuración debería funcionar desde **metadatos de manifiesto/esquema**
  sin ejecutar código del complemento
- el comportamiento nativo en tiempo de ejecución proviene de la ruta `register(api)` del módulo del complemento

Esa división permite a OpenClaw validar la configuración, explicar complementos faltantes/deshabilitados y
construir sugerencias de interfaz/esquema antes de que el tiempo de ejecución completo esté activo.

### Complementos de canal y la herramienta de mensajes compartida

Los complementos de canal no necesitan registrar una herramienta de envío/edición/reacción separada para
las acciones de chat normales. OpenClaw mantiene una herramienta compartida `message` en el núcleo, y
los complementos de canal son dueños del descubrimiento y ejecución específicos del canal detrás de ella.

El límite actual es:

- el núcleo es dueño del host de la herramienta compartida `message`, cableado de prompts, contabilidad
  de sesión/hilo y despacho de ejecución
- los complementos de canal son dueños del descubrimiento de acciones con ámbito, descubrimiento de capacidades y cualquier
  fragmento de esquema específico del canal
- los complementos de canal ejecutan la acción final a través de su adaptador de acción

Para los complementos de canal, la superficie del SDK es
`ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento unificado
permite que un complemento devuelva sus acciones visibles, capacidades y contribuciones de esquema
juntas para que esas piezas no se separen.

Core pasa el ámbito de tiempo de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- entrada confiable de `requesterSenderId`

Eso es importante para los complementos sensibles al contexto. Un canal puede ocultar o exponer
acciones de mensajes basándose en la cuenta activa, la sala/hilo/mensaje actual, o la
identidad del solicitante de confianza sin codificar ramas específicas del canal en la
herramienta `message` de Core.

Es por eso que los cambios de enrutamiento del ejecutor integrado siguen siendo trabajo del complemento: el ejecutor es
responsable de reenviar la identidad del chat/sesión actual al límite de
descubrimiento del complemento para que la herramienta compartida `message` exponga la superficie correcta
propia del canal para el turno actual.

Para los asistentes de ejecución propios del canal, los complementos empaquetados deben mantener el tiempo de ejecución
dentro de sus propios módulos de extensión. Core ya no posee los tiempos de ejecución de acciones de mensajes de
Discord, Slack, Telegram o WhatsApp bajo `src/agents/tools`.
No publicamos subrutas separadas de `plugin-sdk/*-action-runtime`, y los complementos
empaquetados deben importar su propio código de tiempo de ejecución local directamente desde sus
módulos propiedad de la extensión.

Específicamente para las encuestas, hay dos rutas de ejecución:

- `outbound.sendPoll` es la base compartida para los canales que se ajustan al
  modelo de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para semánticas
  de encuesta específicas del canal o parámetros de encuesta adicionales

Core ahora difiere el análisis compartido de encuestas hasta después de que el despacho de encuestas del complemento rechace
la acción, de modo que los manejadores de encuesta propiedad del complemento pueden aceptar campos de encuesta
específicos del canal sin ser bloqueados primero por el analizador de encuestas genérico.

Consulte [Load pipeline](#load-pipeline) para obtener la secuencia de inicio completa.

## Modelo de propiedad de capacidades

OpenClaw trata un complemento nativo como el límite de propiedad de una **empresa** o una
**característica**, no como una bolsa de integraciones no relacionadas.

Esto significa:

- un complemento de empresa generalmente debe ser propietario de todas las superficies
  dicha empresa que enfrenta OpenClaw
- un complemento de característica generalmente debe ser propietario de toda la superficie de la característica que introduce
- los canales deben consumir capacidades centrales compartidas en lugar de volver a implementar
  el comportamiento del proveedor ad hoc

Ejemplos:

- el complemento incluido `openai` es propietario del comportamiento del proveedor de modelos de OpenAI y del comportamiento de
  voz + comprensión de medios + generación de imágenes de OpenAI
- el complemento incluido `elevenlabs` es propietario del comportamiento de voz de ElevenLabs
- el complemento incluido `microsoft` es propietario del comportamiento de voz de Microsoft
- el complemento incluido `google` es propietario del comportamiento del proveedor de modelos de Google más el comportamiento de
  comprensión de medios + generación de imágenes + búsqueda web de Google
- los complementos incluidos `minimax`, `mistral`, `moonshot` y `zai` son propietarios de sus
  backends de comprensión de medios
- el complemento `voice-call` es un complemento de característica: es propietario del transporte de llamadas, herramientas,
  CLI, rutas y tiempo de ejecución, pero consume la capacidad central de TTS/STT en lugar de
  inventar una segunda pila de voz

El estado final deseado es:

- OpenAI vive en un solo complemento incluso si abarca modelos de texto, voz, imágenes y
  video futuro
- otro proveedor puede hacer lo mismo con su propia superficie
- a los canales no les importa qué complemento de proveedor es propietario del proveedor; ellos consumen el
  contrato de capacidad compartida expuesta por el núcleo

Esta es la distinción clave:

- **complemento** = límite de propiedad
- **capacidad** = contrato central que múltiples complementos pueden implementar o consumir

Por lo tanto, si OpenClaw agrega un nuevo dominio como el video, la primera pregunta no es
"¿qué proveedor debe codificar el manejo de video?". La primera pregunta es "¿cuál es
el contrato de capacidad de video central?". Una vez que ese contrato existe, los complementos del proveedor
pueden registrarse en él y los complementos de canal/característica pueden consumirlo.

Si la capacidad aún no existe, el movimiento correcto suele ser:

1. definir la capacidad faltante en el núcleo
2. exponerla a través de la API/tiempo de ejecución del complemento de una manera tipada
3. conectar canales/características contra esa capacidad
4. permite que los complementos de proveedores registren implementaciones

Esto mantiene la propiedad explícita evitando al mismo tiempo un comportamiento central que dependa de un único proveedor o de una ruta de código específica de un complemento de un solo uso.

### Capas de capacidades

Use este modelo mental al decidir dónde pertenece el código:

- **capa de capacidad central**: orquestación compartida, políticas, respaldos, reglas de combinación de configuración, semántica de entrega y contratos tipados
- **capa de complemento de proveedor**: API específicas del proveedor, autenticación, catálogos de modelos, síntesis de voz, generación de imágenes, backends de video futuros, puntos de conexión de uso
- **capa de complemento de canal/característica**: integración de Slack/Discord/llamada de voz/etc. que consume capacidades centrales y las presenta en una superficie

Por ejemplo, TTS sigue esta forma:

- el núcleo posee la política de TTS en el momento de la respuesta, el orden de respaldo, las preferencias y la entrega al canal
- `openai`, `elevenlabs` y `microsoft` poseen implementaciones de síntesis
- `voice-call` consume el auxiliar de tiempo de ejecución de TTS de telefonía

Se debe preferir ese mismo patrón para capacidades futuras.

### Ejemplo de complemento de empresa con múltiples capacidades

Un complemento de empresa debe parecer cohesivo desde el exterior. Si OpenClaw tiene contratos compartidos para modelos, voz, comprensión de medios y búsqueda web, un proveedor puede ser propietario de todas sus superficies en un solo lugar:

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk";
import {
  buildOpenAISpeechProvider,
  createPluginBackedWebSearchProvider,
  describeImageWithModel,
  transcribeOpenAiCompatibleAudio,
} from "openclaw/plugin-sdk";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // auth/model catalog/runtime hooks
    });

    api.registerSpeechProvider(
      buildOpenAISpeechProvider({
        id: "exampleai",
        // vendor speech config
      }),
    );

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

Lo que importa no son los nombres exactos de los auxiliares. La forma importa:

- un complemento posee la superficie del proveedor
- el núcleo sigue siendo propietario de los contratos de capacidad
- los canales y los complementos de características consumen auxiliares `api.runtime.*`, no código de proveedor
- las pruebas de contrato pueden afirmar que el complemento registró las capacidades que reclama poseer

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad compartida. El mismo modelo de propiedad se aplica allí:

1. el núcleo define el contrato de comprensión de medios
2. los complementos de proveedores registran `describeImage`, `transcribeAudio` y `describeVideo` según corresponda
3. los canales y los complementos de características consumen el comportamiento central compartido en lugar de conectarse directamente al código del proveedor

Eso evita incorporar los supuestos de video de un proveedor en el núcleo. El complemento posee la superficie del proveedor; el núcleo posee el contrato de capacidad y el comportamiento de respaldo.

Si OpenClaw añade un nuevo dominio más adelante, como la generación de vídeo, use la misma
secuencia de nuevo: defina primero la capacidad principal y luego deje que los complementos del proveedor
registren implementaciones contra ella.

¿Necesita una lista de verificación de implementación concreta? Consulte
[Capability Cookbook](/es/tools/capability-cookbook).

## Contratos y cumplimiento

La superficie de la API del complemento está intencionalmente tipada y centralizada en
`OpenClawPluginApi`. Ese contrato define los puntos de registro compatibles y
los asistentes de tiempo de ejecución en los que un complemento puede confiar.

Por qué esto es importante:

- los autores de complementos obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos complementos registrando el mismo
  id de proveedor
- el inicio puede mostrar diagnósticos accionables para registros malformados
- las pruebas de contrato pueden hacer cumplir la propiedad del complemento incluido y evitar la deriva silenciosa

Hay dos niveles de cumplimiento:

1. **cumplimiento del registro en tiempo de ejecución**
   El registro de complementos valida los registros a medida que se cargan los complementos. Ejemplos:
   ids de proveedor duplicados, ids de proveedor de voz duplicados y registros
   malformados producen diagnósticos de complementos en lugar de un comportamiento indefinido.
2. **pruebas de contrato**
   Los complementos incluidos se capturan en registros de contrato durante las ejecuciones de pruebas para que
   OpenClaw pueda afirmar la propiedad explícitamente. Hoy esto se usa para proveedores
   de modelos, proveedores de voz, proveedores de búsqueda web y propiedad de
   registro incluido.

El efecto práctico es que OpenClaw sabe, de antemano, qué complemento posee qué
superficie. Esto permite que el núcleo y los canales se componan perfectamente porque la propiedad es
declarada, tipificada y comprobable en lugar de implícita.

### Qué pertenece a un contrato

Los buenos contratos de complementos son:

- tipificados
- pequeños
- específicos de la capacidad
- propiedad del núcleo
- reutilizables por múltiples complementos
- consumibles por canales/características sin conocimiento del proveedor

Los malos contratos de complementos son:

- política específica del proveedor oculta en el núcleo
- escapes de complementos únicos que omiten el registro
- código de canal que accede directamente a una implementación del proveedor
- objetos de tiempo de ejecución ad hoc que no son parte de `OpenClawPluginApi` o
  `api.runtime`

En caso de duda, eleve el nivel de abstracción: defina primero la capacidad y luego
permita que los complementos se conecten a ella.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en el mismo proceso** que el Gateway. No están en un sandbox. Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que el código central.

Implicaciones:

- un complemento nativo puede registrar herramientas, controladores de red, hooks y servicios
- un error en un complemento nativo puede bloquear o desestabilizar el gateway
- un complemento nativo malicioso es equivalente a la ejecución de código arbitrario dentro del proceso de OpenClaw

Los paquetes compatibles son más seguros por defecto porque OpenClaw actualmente los trata como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades agrupadas (bundled skills).

Use listas de permitidos (allowlists) y rutas de instalación/carga explícitas para complementos no agrupados. Trate los complementos del espacio de trabajo (workspace) como código de tiempo de desarrollo, no como valores predeterminados de producción.

Nota importante de confianza:

- `plugins.allow` confía en los **ids de los complementos**, no en el origen de la fuente.
- Un complemento del espacio de trabajo con el mismo id que un complemento agrupado intencionalmente oculta la copia agrupada cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, pruebas de parches y revisiones rápidas (hotfixes).

## Límite de exportación

OpenClaw exporta capacidades, no facilidades de implementación.

Mantenga el registro de capacidades público. Elimine las exportaciones auxiliares que no sean parte del contrato:

- subrutas auxiliares específicas del complemento agrupado
- subrutas de conexión (plumbing) en tiempo de ejecución no destinadas a ser API pública
- asistentes de comodidad específicos del proveedor
- asistentes de configuración/incorporación que son detalles de implementación

## Canalización de carga (Load pipeline)

Al inicio, OpenClaw hace aproximadamente esto:

1. descubrir las raíces de los complementos candidatos
2. leer los manifiestos de paquetes nativos o compatibles y los metadatos del paquete
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación para cada candidato
6. cargar módulos nativos habilitados a través de jiti
7. llamar a los hooks nativos `register(api)` y recopilar los registros en el registro de complementos
8. exponer el registro a las superficies de comandos/tiempo de ejecución

Los puertas de seguridad ocurren **antes** de la ejecución del tiempo de ejecución. Los candidatos se bloquean cuando la entrada escapa de la raíz del complemento, la ruta es escribible por todos (world-writable), o la propiedad de la ruta parece sospechosa para complementos no agrupados.

### Comportamiento primero en el manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo utiliza para:

- identificar el complemento
- descubrir canales/habilidades/esquemas de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- aumentar las etiquetas/marcadores de posición de la interfaz de usuario de control
- mostrar metadatos de instalación/catálogo

Para los complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra
el comportamiento real, como hooks, herramientas, comandos o flujos de proveedor.

### Lo que el cargador almacena en caché

OpenClaw mantiene cachés breves en el proceso para:

- resultados de descubrimiento
- datos del registro de manifiestos
- registros de complementos cargados

Estas cachés reducen la sobrecarga de inicio repentino y comandos repetidos. Es seguro
considerarlas como cachés de rendimiento de corta duración, no persistencia.

Nota de rendimiento:

- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para desactivar estas cachés.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modelo de registro

Los complementos cargados no mutan directamente los globales centrales aleatorios. Se registran en un
registro central de complementos.

El registro rastrea:

- registros de complementos (identidad, fuente, origen, estado, diagnósticos)
- herramientas
- hooks heredados y hooks tipados
- canales
- proveedores
- manejadores RPC de puerta de enlace
- rutas HTTP
- registradores de CLI
- servicios en segundo plano
- comandos propiedad del complemento

Las características centrales luego leen de ese registro en lugar de comunicarse con los módulos del complemento
directamente. Esto mantiene la carga unidireccional:

- módulo de complemento -> registro de registro
- tiempo de ejecución central -> consumo del registro

Esa separación es importante para la mantenibilidad. Significa que la mayoría de las superficies centrales solo
necesitan un punto de integración: "leer el registro", no "casos especiales para cada módulo de complemento".

## Devoluciones de llamada de vinculación de conversación

Los complementos que vinculan una conversación pueden reaccionar cuando se resuelve una aprobación.

Use `api.onConversationBindingResolved(...)` para recibir una devolución de llamada después de que una solicitud de vinculación
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

Campos de carga útil de devolución de llamada:

- `status`: `"approved"` o `"denied"`
- `decision`: `"allow-once"`, `"allow-always"`, o `"deny"`
- `binding`: el vínculo resuelto para solicitudes aprobadas
- `request`: el resumen de la solicitud original, pista de desvinculación (detach hint), id del remitente y metadatos de la conversación

Esta devolución de llamada es solo de notificación. No cambia quién tiene permiso para vincular una conversación y se ejecuta después de que finaliza el manejo de la aprobación principal.

## Ganchos de tiempo de ejecución del proveedor

Los complementos del proveedor ahora tienen dos capas:

- metadatos del manifiesto: `providerAuthEnvVars` para una búsqueda económica de autenticación por entorno antes de la carga en tiempo de ejecución, más `providerAuthChoices` para etiquetas económicas de incorporación/elección de autenticación y metadatos de banderas de CLI antes de la carga en tiempo de ejecución
- ganchos de tiempo de configuración: `catalog` / heredado `discovery`
- ganchos de tiempo de ejecución: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw sigue siendo dueño del bucle de agente genérico, la conmutación por error, el manejo de transcripciones y la política de herramientas. Estos ganchos son la superficie de extensión para el comportamiento específico del proveedor sin necesidad de un transporte de inferencia personalizado completo.

Use el manifiesto `providerAuthEnvVars` cuando el proveedor tenga credenciales basadas en entorno que las rutas genéricas de autenticación/estado/selector de modelos deban ver sin cargar el tiempo de ejecución del complemento. Use el manifiesto `providerAuthChoices` cuando las superficies de CLI de incorporación/elección de autenticación deban conocer el id de elección del proveedor, etiquetas de grupo y cableado simple de autenticación de una sola bandera sin cargar el tiempo de ejecución del proveedor. Mantenga el tiempo de ejecución del proveedor `envVars` para pistas orientadas al operador, como etiquetas de incorporación o variables de configuración de id de cliente/secreto de cliente de OAuth.

### Orden y uso de los ganchos

Para los complementos de modelo/proveedor, OpenClaw llama a los ganchos en este orden aproximado. La columna "Cuándo usar" es la guía de decisión rápida.

| #   | Hook                             | Qué hace                                                                                                                 | Cuándo usar                                                                                                                     |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                        | Publica la configuración del proveedor en `models.providers` durante la generación de `models.json`                      | El proveedor posee un catálogo o valores predeterminados de URL base                                                            |
| --  | _(búsqueda de modelo integrada)_ | OpenClaw intenta primero la ruta normal de registro/catálogo                                                             | _(no es un hook de plugin)_                                                                                                     |
| 2   | `resolveDynamicModel`            | Respaldo síncrono para IDs de modelos propiedad del proveedor que aún no están en el registro local                      | El proveedor acepta IDs de modelos ascendentes arbitrarios                                                                      |
| 3   | `prepareDynamicModel`            | Calentamiento asíncrono, luego `resolveDynamicModel` se ejecuta nuevamente                                               | El proveedor necesita metadatos de red antes de resolver IDs desconocidos                                                       |
| 4   | `normalizeResolvedModel`         | Reescritura final antes de que el ejecutor integrado use el modelo resuelto                                              | El proveedor necesita reescrituras de transporte pero aún usa un transporte central                                             |
| 5   | `capabilities`                   | Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida              | El proveedor necesita peculiaridades de transcripción/familia del proveedor                                                     |
| 6   | `prepareExtraParams`             | Normalización de parámetros de solicitud antes de los envoltorios genéricos de opciones de flujo                         | El proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor                            |
| 7   | `wrapStreamFn`                   | Envoltorio de flujo después de que se aplican los envoltorios genéricos                                                  | El proveedor necesita envoltorios de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado                     |
| 8   | `formatApiKey`                   | Formateador de perfil de autenticación: el perfil almacenado se convierte en la cadena de tiempo de ejecución `apiKey`   | El proveedor almacena metadatos de autenticación adicionales y necesita una forma de token de tiempo de ejecución personalizada |
| 9   | `refreshOAuth`                   | Anulación de actualización de OAuth para endpoints de actualización personalizados o política de fallas de actualización | El proveedor no se ajusta a los actualizadores `pi-ai` compartidos                                                              |
| 10  | `buildAuthDoctorHint`            | Sugerencia de reparación agregada cuando falla la actualización de OAuth                                                 | El proveedor necesita orientación de reparación de autenticación propia del proveedor después de una falla de actualización     |
| 11  | `isCacheTtlEligible`             | Política de caché de mensajes para proveedores de proxy/backhaul                                                         | El proveedor necesita control de TTL de caché específico para proxy                                                             |
| 12  | `buildMissingAuthMessage`        | Reemplazo del mensaje genérico de recuperación de autenticación faltante                                                 | El proveedor necesita una sugerencia de recuperación de autenticación faltante específica del proveedor                         |
| 13  | `suppressBuiltInModel`           | Supresión de modelo upstream obsoleto más sugerencia opcional de error visible para el usuario                           | El proveedor necesita ocultar filas upstream obsoletas o reemplazarlas con una sugerencia del proveedor                         |
| 14  | `augmentModelCatalog`            | Filas de catálogo sintéticas/finales agregadas después del descubrimiento                                                | El proveedor necesita filas de compatibilidad hacia adelante sintéticas en `models list` y selectores                           |
| 15  | `isBinaryThinking`               | Interruptor de razonamiento activado/desactivado para proveedores de pensamiento binario                                 | El proveedor expone solo el pensamiento binario activado/desactivado                                                            |
| 16  | `supportsXHighThinking`          | `xhigh` soporte de razonamiento para modelos seleccionados                                                               | El proveedor quiere `xhigh` solo en un subconjunto de modelos                                                                   |
| 17  | `resolveDefaultThinkingLevel`    | Nivel `/think` predeterminado para una familia de modelos específica                                                     | El proveedor posee la política `/think` predeterminada para una familia de modelos                                              |
| 18  | `isModernModelRef`               | Comparador de modelos modernos para filtros de perfil en vivo y selección de prueba                                      | El proveedor posee la coincidencia de modelo preferido en vivo/prueba                                                           |
| 19  | `prepareRuntimeAuth`             | Intercambiar una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia      | El proveedor necesita un intercambio de tokens o una credencial de solicitud de corta duración                                  |
| 20  | `resolveUsageAuth`               | Resolver credenciales de uso/facturación para `/usage` y superficies de estado relacionadas                              | El proveedor necesita análisis personalizado de tokens de uso/cuota o una credencial de uso diferente                           |
| 21  | `fetchUsageSnapshot`             | Obtener y normalizar instantáneas de uso/cuota específicas del proveedor después de resolver la autenticación            | El proveedor necesita un punto final de uso específico del proveedor o un analizador de carga útil                              |

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
  `resolveDefaultThinkingLevel` y `isModernModelRef` porque es el propietario de la compatibilidad futura de Claude
  4.6, las sugerencias de familia de proveedores, la guía de reparación de autenticación, la integración del punto de conexión de uso,
  la elegibilidad de caché de solicitudes y la política de pensamiento predeterminada/adaptativa de Claude.
- OpenAI usa `resolveDynamicModel`, `normalizeResolvedModel` y
  `capabilities`, además de `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` y `isModernModelRef`
  porque es el propietario de la compatibilidad futura de GPT-5.4, la normalización directa de OpenAI
  `openai-completions` -> `openai-responses`, sugerencias de autenticación con reconocimiento de Codex,
  la supresión de Spark, filas de lista sintéticas de OpenAI y la política de pensamiento /
  modelo en vivo de GPT-5.
- OpenRouter usa `catalog` además de `resolveDynamicModel` y
  `prepareDynamicModel` porque el proveedor es de paso y puede exponer nuevos
  id de modelo antes de que se actualice el catálogo estático de OpenClaw; también usa
  `capabilities`, `wrapStreamFn` y `isCacheTtlEligible` para mantener
  los encabezados de solicitud específicos del proveedor, los metadatos de enrutamiento, los parches de razonamiento y la
  política de caché de solicitudes fuera del núcleo.
- GitHub Copilot usa `catalog`, `auth`, `resolveDynamicModel` y
  `capabilities`, además de `prepareRuntimeAuth` y `fetchUsageSnapshot` porque
  necesita un inicio de sesión de dispositivo propiedad del proveedor, el comportamiento de reserva del modelo,
  peculiaridades de las transcripciones de Claude, un intercambio de token de GitHub -> token de Copilot
  y un punto de conexión de uso propiedad del proveedor.
- OpenAI Codex usa `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` y `augmentModelCatalog`, además de
  `prepareExtraParams`, `resolveUsageAuth` y `fetchUsageSnapshot` porque aún
  se ejecuta en los transportes principales de OpenAI, pero posee la normalización del transporte/URL base,
  la política de respaldo de actualización de OAuth, la elección del transporte predeterminado,
  las filas sintéticas del catálogo de Codex y la integración con el punto de conexión de uso de ChatGPT.
- Google AI Studio y Gemini CLI OAuth usan `resolveDynamicModel` y
  `isModernModelRef` porque poseen la compatibilidad futura de Gemini 3.1 y el
  emparejamiento de modelos modernos; Gemini CLI OAuth también usa `formatApiKey`,
  `resolveUsageAuth` y `fetchUsageSnapshot` para el formato de token, el
  análisis de token y la conexión del punto de conexión de cuota.
- Moonshot usa `catalog` más `wrapStreamFn` porque aún usa el transporte
  compartido de OpenAI, pero necesita la normalización de la carga útil de pensamiento propiedad del proveedor.
- Kilocode usa `catalog`, `capabilities`, `wrapStreamFn` y
  `isCacheTtlEligible` porque necesita encabezados de solicitud propiedad del proveedor,
  normalización de la carga útil de razonamiento, pistas de transcripción de Gemini y control de
  tiempo de vida (TTL) de caché de Anthropic.
- Z.AI usa `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` y `fetchUsageSnapshot` porque posee el respaldo de GLM-5,
  los valores predeterminados de `tool_stream`, la experiencia de usuario de pensamiento binario, el emparejamiento de modelos modernos y tanto
  la autenticación de uso como la obtención de cuotas.
- Mistral, OpenCode Zen y OpenCode Go usan `capabilities` únicamente para mantener
  las peculiaridades de la transcripción/herramientas fuera del núcleo.
- Los proveedores agrupados solo de catálogo, como `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` usan
  solo `catalog`.
- El portal de Qwen usa `catalog`, `auth` y `refreshOAuth`.
- MiniMax y Xiaomi usan `catalog` más hooks de uso porque su comportamiento `/usage`
  es propiedad del complemento aunque la inferencia todavía se ejecuta a través de los
  transportes compartidos.

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

- `textToSpeech` devuelve la carga útil de salida TTS central normal para superficies de archivo/nota de voz.
- Usa la configuración central `messages.tts` y la selección del proveedor.
- Devuelve el búfer de audio PCM + frecuencia de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
- `listVoices` es opcional por proveedor. Úselo para selectores de voz propiedad del proveedor o flujos de configuración.
- Las listas de voces pueden incluir metadatos más ricos, como configuración regional, género y etiquetas de personalidad para selectores con conocimiento del proveedor.
- OpenAI y ElevenLabs admiten telefonía hoy. Microsoft no.

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
- El modelo de propiedad preferido está orientado a la empresa: un complemento de proveedor puede ser propietario de
  proveedores de texto, voz, imagen y futuros medios a medida que OpenClaw agregue esos
  contratos de capacidad.

Para la comprensión de imagen/audio/video, los complementos registran un proveedor de
comprensión de medios con tipo en lugar de una bolsa genérica de clave/valor:

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
- La expansión aditiva debe permanecer tipada: nuevos métodos opcionales, nuevos campos de resultados opcionales, nuevas capacidades opcionales.
- Si OpenClaw añade una nueva capacidad como la generación de video más adelante, defina primero el contrato de capacidad central y luego permita que los complementos del proveedor se registren contra él.

Para los asistentes de ejecución de comprensión de medios, los complementos pueden llamar a:

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
- Usa la configuración de audio de comprensión de medios central (`tools.media.audio`) y el orden de reserva del proveedor.
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
- OpenClaw solo respeta esos campos de anulación para las llamadas de confianza.
- Para las ejecuciones de reserva propiedad del complemento, los operadores deben optar por participar con `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Use `plugins.entries.<id>.subagent.allowedModels` para restringir los complementos de confianza a objetivos `provider/model` canónicos específicos, o `"*"` para permitir cualquier objetivo explícitamente.
- Las ejecuciones de subagentes de complementos que no son de confianza aún funcionan, pero las solicitudes de anulación se rechazan en lugar de volver a reservar silenciosamente.

Para la búsqueda web, los complementos pueden consumir el asistente de ejecución compartido en lugar de acceder al cableado de la herramienta del agente:

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

- Mantenga la selección del proveedor, la resolución de credenciales y la semántica de solicitud compartida en el núcleo.
- Use proveedores de búsqueda web para transportes de búsqueda específicos del proveedor.
- `api.runtime.webSearch.*` es la superficie compartida preferida para los complementos de características/canales que necesitan comportamiento de búsqueda sin depender del contenedor de herramientas del agente.

## Rutas HTTP de puerta de enlace

Los complementos pueden exponer puntos finales HTTP con `api.registerHttpRoute(...)`.

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
- `auth`: obligatorio. Use `"gateway"` para requerir la autenticación normal de la puerta de enlace, o `"plugin"` para la autenticación/verificación de webhook administrada por el complemento.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelve `true` cuando la ruta manejó la solicitud.

Notas:

- `api.registerHttpHandler(...)` está obsoleto. Use `api.registerHttpRoute(...)`.
- Las rutas de los complementos deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un complemento no puede reemplazar la ruta de otro complemento.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantenga las cadenas de reserva `exact`/`prefix` solo en el mismo nivel de autenticación.

## Rutas de importación del SDK de complementos

Use subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` al
crear complementos:

- `openclaw/plugin-sdk/plugin-entry` para primitivas de registro de complementos.
- `openclaw/plugin-sdk/core` para el contrato compartido genérico orientado al complemento.
- Primitivas de canal estables como `openclaw/plugin-sdk/channel-setup`,
  `openclaw/plugin-sdk/channel-pairing`,
  `openclaw/plugin-sdk/channel-reply-pipeline`,
  `openclaw/plugin-sdk/secret-input` y
  `openclaw/plugin-sdk/webhook-ingress` para la configuración/autenticación/respuesta/webhook
  compartida.
- Subrutas de dominio como `openclaw/plugin-sdk/channel-config-helpers`,
  `openclaw/plugin-sdk/channel-config-schema`,
  `openclaw/plugin-sdk/channel-policy`,
  `openclaw/plugin-sdk/channel-runtime`,
  `openclaw/plugin-sdk/config-runtime`,
  `openclaw/plugin-sdk/agent-runtime`,
  `openclaw/plugin-sdk/lazy-runtime`,
  `openclaw/plugin-sdk/reply-history`,
  `openclaw/plugin-sdk/routing`,
  `openclaw/plugin-sdk/runtime-store` y
  `openclaw/plugin-sdk/directory-runtime` para auxiliares de configuración/ejecución compartidos.
- Restringe las subrutas channel-core como `openclaw/plugin-sdk/discord-core`,
  `openclaw/plugin-sdk/telegram-core` y `openclaw/plugin-sdk/whatsapp-core`
  para primitivos específicos del canal que deben mantenerse más pequeños que los
  barriles auxiliares completos del canal.
- Los aspectos internos de las extensiones empaquetadas permanecen privados. Los plugins externos deben usar únicamente
  subrutas de `openclaw/plugin-sdk/*`. El código principal y de pruebas de OpenClaw puede usar los puntos de entrada
  públicos del repositorio bajo `extensions/<id>/index.js`, `api.js`, `runtime-api.js`,
  `setup-entry.js` y archivos con alcance limitado como `login-qr-api.js`. Nunca
  importes `extensions/<id>/src/*` desde el código principal o desde otra extensión.
- División del punto de entrada del repositorio:
  `extensions/<id>/api.js` es el barril de auxiliares/tipos,
  `extensions/<id>/runtime-api.js` es el barril de solo tiempo de ejecución,
  `extensions/<id>/index.js` es el punto de entrada del plugin empaquetado,
  y `extensions/<id>/setup-entry.js` es el punto de entrada del plugin de configuración.
- `openclaw/plugin-sdk/telegram` para los tipos de plugins del canal de Telegram y los auxiliares compartidos orientados al canal. Los aspectos internos de la implementación integrada de Telegram permanecen privados de la extensión empaquetada.
- `openclaw/plugin-sdk/discord` para los tipos de plugins del canal de Discord y los auxiliares compartidos orientados al canal. Los aspectos internos de la implementación integrada de Discord permanecen privados de la extensión empaquetada.
- `openclaw/plugin-sdk/slack` para los tipos de plugins del canal de Slack y los auxiliares compartidos orientados al canal. Los aspectos internos de la implementación integrada de Slack permanecen privados de la extensión empaquetada.
- `openclaw/plugin-sdk/imessage` para los tipos de plugins del canal de iMessage y los auxiliares compartidos orientados al canal. Los aspectos internos de la implementación integrada de iMessage permanecen privados de la extensión empaquetada.
- `openclaw/plugin-sdk/whatsapp` para los tipos de plugins del canal de WhatsApp y los auxiliares compartidos orientados al canal. Los aspectos internos de la implementación integrada de WhatsApp permanecen privados de la extensión empaquetada.
- `openclaw/plugin-sdk/bluebubbles` permanece público porque transporta una superficie auxiliar
  pequeña y enfocada que se comparte intencionalmente.

Nota de compatibilidad:

- Evita el barril raíz `openclaw/plugin-sdk` para el código nuevo.
- Prefiera primero las primitivas estrechas y estables. Las nuevas subrutas setup/pairing/reply/
  secret-input/webhook son el contrato previsto para los nuevos trabajos de complementos
  integrados y externos.
- Los barriles auxiliares específicos de extensiones integradas no son estables por defecto. Si un
  auxiliar solo es necesario para una extensión integrada, manténgalo detrás de la costura `api.js` o `runtime-api.js` local de la extensión en lugar de promoverlo a
  `openclaw/plugin-sdk/<extension>`.
- Las subrutas específicas de capacidades como `image-generation`,
  `media-understanding` y `speech` existen porque los complementos integrados/nativos las
  usan hoy. Su presencia no significa por sí sola que cada auxiliar exportado sea un
  contrato externo congelado a largo plazo.

## Esquemas de herramientas de mensajes

Los complementos deben ser dueños de las contribuciones de esquema `describeMessageTool(...)` específicas del canal.
Mantenga los campos específicos del proveedor en el complemento, no en el núcleo compartido.

Para fragmentos de esquema portátiles compartidos, reutilice los auxiliares genéricos exportados a través de
`openclaw/plugin-sdk/channel-runtime`:

- `createMessageToolButtonsSchema()` para cargas útiles de estilo de cuadrícula de botones
- `createMessageToolCardSchema()` para cargas útiles de tarjetas estructuradas

Si una forma de esquema solo tiene sentido para un proveedor, defínala en el código fuente
de ese complemento en lugar de promoverla al SDK compartido.

## Resolución de objetivos del canal

Los complementos del canal deben ser dueños de la semántica de objetivo específica del canal. Mantenga el host
saliente compartido genérico y use la superficie del adaptador de mensajería para las reglas del proveedor:

- `messaging.inferTargetChatType({ to })` decide si un objetivo normalizado
  debe tratarse como `direct`, `group` o `channel` antes de la búsqueda en el directorio.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indica al núcleo si una
  entrada debe saltar directamente a la resolución tipo id en lugar de la búsqueda en el directorio.
- `messaging.targetResolver.resolveTarget(...)` es el respaldo del complemento cuando
  el núcleo necesita una resolución final propiedad del proveedor después de la normalización o después de
  un fallo en el directorio.
- `messaging.resolveOutboundSessionRoute(...)` es dueño de la construcción de rutas de
  sesión específicas del proveedor una vez que se resuelve un objetivo.

División recomendada:

- Use `inferTargetChatType` para decisiones de categoría que deben suceder antes de
  buscar pares/grupos.
- Use `looksLikeId` para comprobaciones de "tratar esto como un id de destino explícito/nativo".
- Use `resolveTarget` para el respaldo de normalización específico del proveedor, no para
  una búsqueda amplia de directorio.
- Mantenga los ids nativos del proveedor como ids de chat, ids de hilos, JIDs, identificadores y ids
  de sala dentro de los valores `target` o parámetros específicos del proveedor, no en campos
  genéricos del SDK.

## Directorios respaldados por configuración

Los complementos que derivan entradas de directorio de la configuración deben mantener esa lógica en el
complemento y reutilizar los ayudantes compartidos de
`openclaw/plugin-sdk/directory-runtime`.

Use esto cuando un canal necesite pares/grupos respaldados por configuración, tales como:

- pares de MD impulsados por lista blanca
- mapas de canal/grupo configurados
- respaldos de directorio estáticos con ámbito de cuenta

Los ayudantes compartidos en `directory-runtime` solo manejan operaciones genéricas:

- filtrado de consultas
- aplicación de límites
- ayudantes de deduplicación/normalización
- construyendo `ChannelDirectoryEntry[]`

La inspección de cuenta específica del canal y la normalización de ids deben permanecer en la
implementación del complemento.

## Catálogos de proveedores

Los complementos del proveedor pueden definir catálogos de modelos para inferencia con
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma forma que OpenClaw escribe en
`models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento posea ids de modelo específicos del proveedor, valores predeterminados de URL base
o metadatos de modelo protegidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los
proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores simples de clave API o impulsados por entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedor relacionadas
- `late`: último paso, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de clave, por lo que los complementos pueden anular intencionalmente una
entrada de proveedor integrada con el mismo id de proveedor.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado
- si tanto `catalog` como `discovery` están registrados, OpenClaw usa `catalog`

## Inspección de canal de solo lectura

Si tu complemento registra un canal, prefiere implementar
`plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de ejecución. Se permite asumir que las credenciales
  están completamente materializadas y puede fallar rápido cuando faltan secretos requeridos.
- Las rutas de comandos de solo lectura como `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve`, y los flujos de reparación
  de doctor/config no deberían necesitar materializar credenciales de ejecución solo para
  describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devolver solo el estado descriptivo de la cuenta.
- Preservar `enabled` y `configured`.
- Incluir campos de origen/estado de las credenciales cuando sea relevante, tales como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No es necesario devolver valores de token sin procesar solo para reportar la disponibilidad
  de solo lectura. Devolver `tokenStatus: "available"` (y el campo de origen
  coincidente) es suficiente para comandos de estilo de estado.
- Usa `configured_unavailable` cuando una credencial está configurada vía SecretRef pero
  no disponible en la ruta de comando actual.

Esto permite que los comandos de solo lectura reporten "configurado pero no disponible en esta ruta
de comando" en lugar de fallar o reportar incorrectamente que la cuenta no está configurada.

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

Cada entrada se convierte en un complemento. Si el paquete lista múltiples extensiones, el id del complemento
se convierte en `name/<fileBase>`.

Si tu complemento importa dependencias de npm, instálalas en ese directorio para que
`node_modules` esté disponible (`npm install` / `pnpm install`).

Guardia de seguridad: cada entrada `openclaw.extensions` debe permanecer dentro del directorio del plugin después de resolver los enlaces simbólicos. Las entradas que escapan del directorio del paquete son rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias del plugin con `npm install --ignore-scripts` (sin scripts de ciclo de vida). Mantenga los árboles de dependencias del plugin como "JS/TS puro" y evite paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración. Cuando OpenClaw necesita superficies de configuración para un plugin de canal deshabilitado, o cuando un plugin de canal está habilitado pero aún no configurado, carga `setupEntry` en lugar de la entrada completa del plugin. Esto hace que el inicio y la configuración sean más ligeros cuando su entrada principal del plugin también conecta herramientas, ganchos u otro código solo de tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` puede optar a un plugin de canal por la misma ruta `setupEntry` durante la fase de inicio previa a la escucha de la pasarela, incluso cuando el canal ya está configurado.

Use esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir antes de que la pasarela comience a escuchar. En la práctica, eso significa que la entrada de configuración debe registrar cada capacidad propiedad del canal de la cual depende el inicio, tales como:

- el registro del canal en sí
- cualquier ruta HTTP que debe estar disponible antes de que la pasarela comience a escuchar
- cualquier método, herramienta o servicio de pasarela que deba existir durante esa misma ventana

Si su entrada completa aún posee alguna capacidad de inicio requerida, no habilite este indicador. Mantenga el plugin con el comportamiento predeterminado y deje que OpenClaw cargue la entrada completa durante el inicio.

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

Los plugins de canal pueden anunciar metadatos de configuración/descubrimiento a través de `openclaw.channel` e indicaciones de instalación a través de `openclaw.install`. Esto mantiene el catálogo principal libre de datos.

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
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación del registro MPM). Coloque un archivo JSON en una de:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas/puntos y comas/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Plugins del motor de contexto

Los plugins del motor de contexto son propietarios de la orquestación del contexto de sesión para la ingesta, el ensamblaje
y la compactación. Regístrelos desde su plugin con
`api.registerContextEngine(id, factory)` y luego seleccione el motor activo con
`plugins.slots.contextEngine`.

Use esto cuando su plugin necesite reemplazar o extender la canalización de contexto predeterminada
en lugar de simplemente agregar búsqueda de memoria o enlaces.

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

Si su motor **no** es propietario del algoritmo de compactación, mantenga `compact()`
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
el sistema de plugins con un alcance privado. Agregue la capacidad que falta.

Secuencia recomendada:

1. definir el contrato principal
   Decida qué comportamiento compartido debe ser propiedad del núcleo (core): política, respaldo, fusión de configuración,
   ciclo de vida, semántica orientada al canal y la forma del asistente de tiempo de ejecución.
2. agregar superficies de registro/ejecución de plugin tipadas
   Extienda `OpenClawPluginApi` y/o `api.runtime` con la superficie de capacidad
   tipada más pequeña y útil.
3. conectar núcleo + consumidores de canal/características
   Los canales y los plugins de características deben consumir la nueva capacidad a través del núcleo,
   no importando directamente una implementación de proveedor.
4. registrar implementaciones de proveedor
   Los plugins de proveedor luego registran sus backends contra la capacidad.
5. agregar cobertura de contrato
   Agregue pruebas para que la propiedad y la forma de registro se mantengan explícitas con el tiempo.

Así es como OpenClaw se mantiene opinante sin volverse rígido a la visión del mundo
de un solo proveedor. Consulte el [Cookbook de capacidades](/es/tools/capability-cookbook)
para obtener una lista de verificación de archivos concreta y un ejemplo práctico.

### Lista de verificación de capacidades

Cuando agrega una nueva capacidad, la implementación generalmente debe tocar estas
superficies juntas:

- tipos de contrato principal en `src/<capability>/types.ts`
- asistente de ejecución/tiempo de ejecución principal en `src/<capability>/runtime.ts`
- superficie de registro de API de plugin en `src/plugins/types.ts`
- cableado del registro de plugin en `src/plugins/registry.ts`
- exposición del runtime del complemento en `src/plugins/runtime/*` cuando los complementos de características/canales necesitan consumirlo
- asistentes de captura/prueba en `src/test-utils/plugin-registration.ts`
- afirmaciones de propiedad/contrato en `src/plugins/contracts/registry.ts`
- documentos del operador/complemento en `docs/`

Si falta alguna de esas superficies, generalmente es una señal de que la capacidad aún no está completamente integrada.

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
const clip = await api.runtime.videoGeneration.generateFile({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

Patrón de prueba de contrato:

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

Eso mantiene la regla simple:

- core es propietario del contrato de capacidad + orquestación
- los complementos de proveedores son propietarios de las implementaciones del proveedor
- los complementos de características/canales consumen asistentes de runtime
- las pruebas de contrato mantienen la propiedad explícita

import es from "/components/footer/es.mdx";

<es />
