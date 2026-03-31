---
summary: "Internals del plugin: modelo de capacidades, propiedad, contratos, canalización de carga y asistentes de tiempo de ejecución"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Internals del Plugin"
sidebarTitle: "Internals"
---

# Internals del Plugin

<Info>
  Esta es la **referencia de arquitectura profunda**. Para guías prácticas, consulte: - [Instalar y usar complementos](/en/tools/plugin) — guía de usuario - [Primeros pasos](/en/plugins/building-plugins) — primer tutorial de complementos - [Complementos de canal](/en/plugins/sdk-channel-plugins) — crear un canal de mensajería - [Complementos de proveedor](/en/plugins/sdk-provider-plugins) — crear
  un proveedor de modelos - [Descripción general del SDK](/en/plugins/sdk-overview) — mapa de importación y API de registro
</Info>

Esta página cubre la arquitectura interna del sistema de plugins de OpenClaw.

## Modelo de capacidad pública

Las capacidades son el modelo de **plugin nativo** público dentro de OpenClaw. Cada
plugin nativo de OpenClaw se registra contra uno o más tipos de capacidad:

| Capacidad                    | Método de registro                            | Plugins de ejemplo        |
| ---------------------------- | --------------------------------------------- | ------------------------- |
| Inferencia de texto          | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| Backend de inferencia de CLI | `api.registerCliBackend(...)`                 | `openai`, `anthropic`     |
| Voz                          | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| Comprensión de medios        | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| Generación de imágenes       | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Búsqueda web                 | `api.registerWebSearchProvider(...)`          | `google`                  |
| Canal / mensajería           | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

Un complemento que registra cero capacidades pero proporciona hooks, herramientas o
servicios es un complemento **legacy hook-only**. Ese patrón sigue siendo totalmente compatible.

### Postura de compatibilidad externa

El modelo de capacidades está integrado en el núcleo y es utilizado por los complementos integrados/nativos
hoy en día, pero la compatibilidad de complementos externos todavía necesita un estándar más estricto que "está
exportado, por lo tanto está congelado".

Guía actual:

- **complementos externos existentes:** mantener las integraciones basadas en hooks funcionando; tratar
  esto como la línea de base de compatibilidad
- **nuevos complementos integrados/nativos:** preferir el registro explícito de capacidades sobre
  los alcances específicos del proveedor o nuevos diseños solo de hooks
- **complementos externos que adopten el registro de capacidades:** permitido, pero tratar las
  superficies de ayuda específicas de la capacidad como en evolución a menos que los documentos marquen explícitamente un
  contrato como estable

Regla práctica:

- las APIs de registro de capacidades son la dirección prevista
- los hooks heredados siguen siendo la ruta más segura sin rupturas para complementos externos durante
  la transición
- las subrutas de ayuda exportadas no son todas iguales; preferir el contrato documentado
  estrecho, no las exportaciones de ayuda incidentales

### Formas de complementos

OpenClaw clasifica cada complemento cargado en una forma basándose en su comportamiento de
registro real (no solo en metadatos estáticos):

- **plain-capability** -- registra exactamente un tipo de capacidad (por ejemplo, un
  plugin solo de proveedor como `mistral`)
- **hybrid-capability** -- registra múltiples tipos de capacidades (por ejemplo,
  `openai` posee inferencia de texto, voz, comprensión multimedia y generación
  de imágenes)
- **hook-only** -- registra solo hooks (tipados o personalizados), sin capacidades,
  herramientas, comandos o servicios
- **non-capability** -- registra herramientas, comandos, servicios o rutas, pero no
  capacidades

Use `openclaw plugins inspect <id>` para ver la forma de un plugin y el desglose de sus
capacidades. Consulte [CLI reference](/en/cli/plugins#inspect) para obtener más detalles.

### Legacy hooks

El hook `before_agent_start` sigue siendo compatible como ruta de compatibilidad para
plugins que solo usan hooks. Los plugins reales heredados todavía dependen de él.

Dirección:

- mantenerlo funcionando
- documentarlo como heredado
- preferir `before_model_resolve` para el trabajo de anulación de modelo/proveedor
- preferir `before_prompt_build` para el trabajo de mutación de prompts
- eliminar solo después de que el uso real disminuya y la cobertura de fixtures demuestre la seguridad de la migración

### Señales de compatibilidad

Cuando ejecuta `openclaw doctor` o `openclaw plugins inspect <id>`, puede ver
una de estas etiquetas:

| Señal                       | Significado                                                           |
| --------------------------- | --------------------------------------------------------------------- |
| **config válido**           | La configuración se analiza correctamente y los plugins se resuelven  |
| **aviso de compatibilidad** | El plugin usa un patrón compatible pero antiguo (p. ej., `hook-only`) |
| **advertencia heredada**    | El plugin usa `before_agent_start`, que está obsoleto                 |
| **error grave**             | La configuración no es válida o el plugin falló al cargarse           |

Ni `hook-only` ni `before_agent_start` romperán su plugin hoy --
`hook-only` es consultivo y `before_agent_start` solo activa una advertencia. Estas
señales también aparecen en `openclaw status --all` y `openclaw plugins doctor`.

## Resumen de arquitectura

El sistema de plugins de OpenClaw tiene cuatro capas:

1. **Manifiesto + descubrimiento**
   OpenClaw encuentra plugins candidatos desde rutas configuradas, raíces del espacio de trabajo,
   raíces de extensiones globales y extensiones incluidas. El descubrimiento lee manifiestos nativos
   de `openclaw.plugin.json` además de los manifiestos de paquetes compatibles primero.
2. **Habilitación y validación**
   Core decide si un complemento descubierto está habilitado, deshabilitado,
   bloqueado o seleccionado para un espacio exclusivo como la memoria.
3. **Carga en tiempo de ejecución**
   Los complementos nativos de OpenClaw se cargan en proceso mediante jiti y
   registran capacidades en un registro central. Los paquetes compatibles se
   normalizan en registros del sistema sin importar código en tiempo de ejecución.
4. **Consumo de superficie**
   El resto de OpenClaw lee el registro para exponer herramientas, canales,
   configuración del proveedor, ganchos, rutas HTTP, comandos de CLI y servicios.

El límite de diseño importante:

- el descubrimiento y la validación de la configuración deben funcionar a partir
  de **metadatos de manifiesto/esquema** sin ejecutar el código del complemento
- el comportamiento del tiempo de ejecución nativo proviene de la ruta
  `register(api)` del módulo del complemento

Esa división permite que OpenClaw valide la configuración, explique los
complementos que faltan o están deshabilitados y construya sugerencias de
interfaz de usuario/esquema antes de que el tiempo de ejecución completo esté
activo.

### Complementos de canal y la herramienta de mensajes compartida

Los complementos de canal no necesitan registrar una herramienta separada de envío/edición/reacción para las acciones normales de chat. OpenClaw mantiene una herramienta compartida `message` en el núcleo, y los complementos de canal son propietarios del descubrimiento y la ejecución específicos del canal detrás de ella.

El límite actual es:

- el núcleo es propietario del host de la herramienta compartida `message`, el cableado del prompt, la contabilidad de sesión/hilo y el despacho de ejecución
- los complementos de canal son propietarios del descubrimiento de acciones con ámbito, el descubrimiento de capacidades y cualquier fragmento de esquema específico del canal
- los complementos de canal ejecutan la acción final a través de su adaptador de acción

Para los complementos de canal, la superficie del SDK es `ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento unificada permite que un complemento devuelva sus acciones visibles, capacidades y contribuciones de esquema juntas para que esas piezas no se separen.

El núcleo pasa el ámbito de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- entrada confiable `requesterSenderId`

Esto es importante para los plugins sensibles al contexto. Un canal puede ocultar o exponer acciones de mensajes basándose en la cuenta activa, la sala/hilo/mensaje actual o la identidad del solicitante de confianza sin codificar ramas específicas del canal en la herramienta central `message`.

Por esto, los cambios de enrutamiento del ejecutor integrado siguen siendo trabajo de plugin: el ejecutor es responsable de reenviar la identidad de chat/sesión actual al límite de descubrimiento del plugin para que la herramienta compartida `message` exponga la superficie propiedad del canal correcta para el turno actual.

Para los asistentes de ejecución propiedad del canal, los plugins agrupados deben mantener el tiempo de ejecución dentro de sus propios módulos de extensión. Core ya no posee los tiempos de ejecución de acciones de mensajes de Discord, Slack, Telegram o WhatsApp bajo `src/agents/tools`. No publicamos subrutas `plugin-sdk/*-action-runtime` separadas, y los plugins agrupados deben importar su propio código de tiempo de ejecución local directamente desde sus módulos propiedad de la extensión.

Para las encuestas específicamente, hay dos rutas de ejecución:

- `outbound.sendPoll` es la base lineal compartida para los canales que se ajustan al modelo de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para la semántica de encuesta específica del canal o parámetros de encuesta adicionales

Core ahora difiere el análisis compartido de encuestas hasta que el envío de encuestas del plugin declina la acción, para que los controladores de encuestas propiedad del plugin puedan aceptar campos de encuestas específicos del canal sin ser bloqueados primero por el analizador de encuestas genérico.

Consulte [Load pipeline](#load-pipeline) para ver la secuencia de inicio completa.

## Modelo de propiedad de capacidades

OpenClaw trata un plugin nativo como el límite de propiedad para una **compañía** o una **característica**, no como una bolsa de integraciones no relacionadas.

Esto significa:

- un plugin de compañía generalmente debería ser propietario de todas las superficies de esa compañía orientadas a OpenClaw
- un plugin de características generalmente debería ser propietario de la superficie completa de características que introduce
- los canales deben consumir capacidades básicas compartidas en lugar de volver a implementar el comportamiento del proveedor ad hoc

Ejemplos:

- el plugin incluido `openai` es propietario del comportamiento del proveedor de modelos de OpenAI y del comportamiento de voz + comprensión de medios + generación de imágenes de OpenAI
- el plugin incluido `elevenlabs` es propietario del comportamiento de voz de ElevenLabs
- el plugin incluido `microsoft` es propietario del comportamiento de voz de Microsoft
- el plugin incluido `google` es propietario del comportamiento del proveedor de modelos de Google, además del comportamiento de comprensión de medios + generación de imágenes + búsqueda web de Google
- los plugins empaquetados `minimax`, `mistral`, `moonshot` y `zai` son propietarios de sus
  backends de comprensión de medios
- el plugin `voice-call` es un plugin de características: posee el transporte de llamadas, herramientas,
  CLI, rutas y runtime, pero consume la capacidad central TTS/STT en lugar de
  inventar una segunda pila de voz

El estado final deseado es:

- OpenAI reside en un solo plugin incluso si abarca modelos de texto, voz, imágenes y
  video futuro
- otro proveedor puede hacer lo mismo para su propia superficie
- los canales no les importa qué plugin de proveedor es propietario del proveedor; consumen el
  contrato de capacidad compartida expuesto por el core

Esta es la distinción clave:

- **plugin** = límite de propiedad
- **capacidad** = contrato central que múltiples plugins pueden implementar o consumir

Por lo tanto, si OpenClaw añade un nuevo dominio como el video, la primera pregunta no es
"¿qué proveedor debería codificar el manejo de video?". La primera pregunta es "¿cuál es
el contrato de capacidad de video central?". Una vez que existe ese contrato, los plugins de proveedores
pueden registrarse en él y los plugins de canal/características pueden consumirlo.

Si la capacidad aún no existe, el movimiento correcto generalmente es:

1. definir la capacidad faltante en el core
2. exponerla a través de la API/runtime del plugin de una manera tipada
3. conectar canales/características contra esa capacidad
4. permitir que los complementos de proveedores registren implementaciones

Esto mantiene la propiedad explícita al tiempo que evita el comportamiento central que depende de un
único proveedor o una ruta de código específica de un complemento ad hoc.

### Capas de capacidades

Use este modelo mental al decidir dónde pertenece el código:

- **capa de capacidades principales**: orquestación compartida, políticas, respaldo, reglas de
  fusión de configuración, semántica de entrega y contratos tipados
- **capa de complementos de proveedores**: APIs específicas del proveedor, autenticación, catálogos de modelos, síntesis
  de voz, generación de imágenes, backends de video futuros, puntos de conexión de uso
- **capa de complementos de canal/características**: integración con Slack/Discord/llamadas de voz/etc.
  que consume capacidades principales y las presenta en una superficie

Por ejemplo, el TTS sigue esta forma:

- el núcleo es propietario de la política de TTS en tiempo de respuesta, el orden de respaldo, las preferencias y la entrega a través de canales
- `openai`, `elevenlabs` y `microsoft` son propietarios de las implementaciones de síntesis
- `voice-call` consume el asistente de tiempo de ejecución de TTS de telefonía

Ese mismo patrón debe preferirse para capacidades futuras.

### Ejemplo de complemento de empresa con múltiples capacidades

Un complemento de empresa debe parecer cohesivo desde el exterior. Si OpenClaw tiene contratos
compartidos para modelos, voz, comprensión de medios y búsqueda web, un proveedor puede
ser propietario de todas sus superficies en un solo lugar:

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk";
import { buildOpenAISpeechProvider, createPluginBackedWebSearchProvider, describeImageWithModel, transcribeOpenAiCompatibleAudio } from "openclaw/plugin-sdk";

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

Lo que importa no son los nombres exactos de los asistentes. La forma importa:

- un complemento es propietario de la superficie del proveedor
- el núcleo sigue siendo propietario de los contratos de capacidades
- los canales y los complementos de características consumen asistentes `api.runtime.*`, no código de proveedor
- las pruebas de contrato pueden afirmar que el complemento registró las capacidades que
  reclama poseer

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad
compartida. El mismo modelo de propiedad se aplica allí:

1. el núcleo define el contrato de comprensión de medios
2. los complementos del proveedor registran `describeImage`, `transcribeAudio` y
   `describeVideo` según corresponda
3. los canales y los complementos de características consumen el comportamiento central compartido en lugar de
   conectarse directamente al código del proveedor

Eso evita incorporar los supuestos de video de un proveedor en el núcleo. El complemento posee
la superficie del proveedor; el núcleo posee el contrato de capacidad y el comportamiento alternativo.

Si OpenClaw agrega un nuevo dominio más adelante, como la generación de video, use la misma
secuencia nuevamente: defina primero la capacidad central, luego deje que los complementos del proveedor
registren implementaciones contra ella.

¿Necesita una lista de verificación de implementación concreta? Vea
[Capability Cookbook](/en/tools/capability-cookbook).

## Contratos y cumplimiento

La superficie de la API del complemento se escribe y centraliza intencionalmente en
`OpenClawPluginApi`. Ese contrato define los puntos de registro compatibles y
los asistentes de tiempo de ejecución en los que un complemento puede confiar.

Por qué esto importa:

- los autores de complementos obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos complementos registrando el mismo
  id de proveedor
- el inicio puede mostrar diagnósticos procesables para el registro malformado
- las pruebas de contrato pueden hacer cumplir la propiedad del complemento empaquetado y evitar la desviación silenciosa

Hay dos capas de cumplimiento:

1. **aplicación del registro en tiempo de ejecución**
   El registro de complementos valida los registros a medida que los complementos se cargan. Ejemplos:
   los ids de proveedor duplicados, los ids de proveedor de voz duplicados y los registros
   malformados producen diagnósticos de complementos en lugar de un comportamiento indefinido.
2. **pruebas de contrato**
   Los complementos empaquetados se capturan en registros de contratos durante las ejecuciones de pruebas para que
   OpenClaw pueda afirmar la propiedad de manera explícita. Hoy esto se utiliza para proveedores
   de modelos, proveedores de voz, proveedores de búsqueda web y propiedad de registros
   empaquetados.

El efecto práctico es que OpenClaw sabe, por adelantado, qué complemento posee qué
superficie. Eso permite que el núcleo y los canales se compongan perfectamente porque la propiedad está
declarada, tipada y es comprobable en lugar de implícita.

### Qué pertenece a un contrato

Los buenos contratos de complementos son:

- tipados
- pequeños
- específicos de la capacidad
- propiedad del núcleo
- reutilizables por múltiples complementos
- consumibles por canales/características sin conocimiento del proveedor

Los malos contratos de complementos son:

- políticas específicas del proveedor ocultas en el núcleo
- escapes de complementos únicos que omiten el registro
- código de canal que accede directamente a una implementación de proveedor
- objetos de tiempo de ejecución ad hoc que no son parte de `OpenClawPluginApi` o
  `api.runtime`

En caso de duda, eleva el nivel de abstracción: define primero la capacidad y luego
permite que los complementos se conecten a ella.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en el mismo proceso** que la Gateway. No están
aislados. Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que
el código del núcleo.

Implicaciones:

- un complemento nativo puede registrar herramientas, controladores de red, enlaces y servicios
- un error en un complemento nativo puede bloquear o desestabilizar la puerta de enlace
- un complemento nativo malicioso es equivalente a la ejecución de código arbitrario dentro
  del proceso OpenClaw

Los paquetes compatibles son más seguros de forma predeterminada porque OpenClaw actualmente los trata
como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades
incluidas (bundled skills).

Use listas de permitidos y rutas de instalación/carga explícitas para complementos no incluidos. Trate
los complementos del espacio de trabajo como código en tiempo de desarrollo, no como valores predeterminados de producción.

Para los nombres de paquetes del espacio de trabajo incluidos, mantenga el id del complemento anclado en el nombre
npm: `@openclaw/<id>` de forma predeterminada, o un sufijo de tipo aprobado como
`-provider`, `-plugin`, `-speech`, `-sandbox`, o `-media-understanding` cuando
el paquete expone intencionalmente un rol de complemento más estrecho.

Nota importante de confianza:

- `plugins.allow` confía en los **ids de los complementos**, no en el origen del código.
- Un complemento del espacio de trabajo con el mismo id que un complemento incluido intencionalmente oculta
  la copia incluida cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, las pruebas de parches y las revisiones urgentes (hotfixes).

## Límite de exportación

OpenClaw exporta capacidades, no comodidades de implementación.

Mantenga pública el registro de capacidades. Recorte las exportaciones auxiliares que no son parte del contrato:

- subrutas auxiliares específicas del complemento incluido
- subrutas de infraestructura (plumbing) de tiempo de ejecución no destinadas a ser API pública
- auxiliares de conveniencia específicos del proveedor
- auxiliares de configuración/integración que son detalles de implementación

## Canalización de carga

Al inicio, OpenClaw hace aproximadamente esto:

1. descubrir las raíces de los plugins candidatos
2. leer manifiestos de paquetes nativos o compatibles y metadatos de paquetes
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación para cada candidato
6. cargar módulos nativos habilitados a través de jiti
7. llamar a los ganchos nativos `register(api)` y recopilar los registros en el registro del complemento
8. exponer el registro a las superficies de comandos/tiempo de ejecución

Los mecanismos de seguridad ocurren **antes** de la ejecución del tiempo de ejecución. Los candidatos se bloquean
cuando la entrada sale de la raíz del complemento, la ruta es de escritura mundial, o la propiedad
de la ruta parece sospechosa para complementos no empaquetados.

### Comportamiento primero de manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo utiliza para:

- identificar el complemento
- descubrir canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- aumentar etiquetas/marcadores de posición de la interfaz de usuario de control
- mostrar metadatos de instalación/catálogo

Para los complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra
comportamientos reales como hooks, herramientas, comandos o flujos de proveedores.

### Lo que el cargador almacena en caché

OpenClaw mantiene cachés a corto plazo en el proceso para:

- resultados de descubrimiento
- datos del registro de manifiestos
- registros de complementos cargados

Estos cachés reducen la carga de inicio en ráfagas y la sobrecarga de comandos repetidos. Es seguro
considerarlos como cachés de rendimiento a corto plazo, no como persistencia.

Nota de rendimiento:

- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para deshabilitar estas cachés.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modelo de registro

Los complementos cargados no mutan directamente variables globales aleatorias del núcleo. Se registran en un
registro central de complementos.

El registro realiza un seguimiento de:

- registros de complementos (identidad, origen, fuente, estado, diagnósticos)
- herramientas
- ganchos heredados y ganchos tipados
- canales
- proveedores
- manejadores RPC de puerta de enlace
- rutas HTTP
- registradores de CLI
- servicios en segundo plano
- comandos propiedad del complemento

Luego, las funciones del núcleo leen de ese registro en lugar de comunicarse con los módulos del complemento
directamente. Esto mantiene la carga en una sola dirección:

- módulo de complemento -> registro de registro
- tiempo de ejecución del núcleo -> consumo del registro

Esa separación es importante para la facilidad de mantenimiento. Significa que la mayoría de las superficies del núcleo solo
necesitan un punto de integración: "leer el registro", en lugar de "casos especiales para cada módulo de
complemento".

## Devoluciones de llamada de vinculación de conversación

Los complementos que vinculan una conversación pueden reaccionar cuando se resuelve una aprobación.

Use `api.onConversationBindingResolved(...)` para recibir una devolución de llamada después de que se apruebe o deniegue una solicitud de enlace:

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

Campos de carga útil de la devolución de llamada:

- `status`: `"approved"` o `"denied"`
- `decision`: `"allow-once"`, `"allow-always"` o `"deny"`
- `binding`: el enlace resuelto para las solicitudes aprobadas
- `request`: el resumen de la solicitud original, sugerencia de separación, id. del remitente y metadatos de la conversación

Esta devolución de llamada es solo de notificación. No cambia quién tiene permiso para vincular una conversación y se ejecuta después de que finaliza el manejo de aprobación principal.

## Ganchos del tiempo de ejecución del proveedor

Los complementos del proveedor ahora tienen dos capas:

- metadatos del manifiesto: `providerAuthEnvVars` para una búsqueda económica de autenticación de entorno antes de la carga del tiempo de ejecución, además de `providerAuthChoices` para etiquetas económicas de incorporación/elección de autenticación y metadatos de indicadores de CLI antes de la carga del tiempo de ejecución
- ganchos de tiempo de configuración: `catalog` / `discovery` heredados
- runtime hooks: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw sigue siendo el propietario del bucle de agente genérico, la conmutación por error, el manejo de transcripciones y la política de herramientas. Estos hooks son la superficie de extensión para comportamientos específicos del proveedor sin necesidad de un transporte de inferencia personalizado completo.

Use el manifiesto `providerAuthEnvVars` cuando el proveedor tenga credenciales basadas en entorno
que las rutas genéricas de auth/status/model-picker deban ver sin cargar el tiempo de ejecución
del plugin. Use el manifiesto `providerAuthChoices` cuando las superficies de CLI de onboarding/auth-choice
deban conocer el id de elección del proveedor, las etiquetas de grupo y el cableado simple
de auth de una sola bandera sin cargar el tiempo de ejecución del proveedor. Mantenga el tiempo de ejecución del proveedor
`envVars` para las sugerencias orientadas al operador, como las etiquetas de incorporación o las variables
de configuración del client-id/client-secret de OAuth.

### Orden y uso de los hooks

Para los plugins de modelo/proveedor, OpenClaw llama a los hooks en este orden aproximado.
La columna "Cuándo usar" es la guía rápida de decisión.

| #   | Hook                             | Lo que hace                                                                                                                 | Cuándo usar                                                                                                                     |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                        | Publicar la configuración del proveedor en `models.providers` durante la generación de `models.json`                        | El proveedor posee un catálogo o valores predeterminados de URL base                                                            |
| --  | _(búsqueda de modelo integrada)_ | OpenClaw intenta primero la ruta normal de registro/catálogo                                                                | _(no es un hook de plugin)_                                                                                                     |
| 2   | `resolveDynamicModel`            | Alternativa síncrona para los IDs de modelo propiedad del proveedor que aún no están en el registro local                   | El proveedor acepta IDs de modelo de flujo ascendente arbitrarios                                                               |
| 3   | `prepareDynamicModel`            | Calentamiento asíncrono, luego `resolveDynamicModel` se ejecuta nuevamente                                                  | El proveedor necesita metadatos de red antes de resolver identificadores desconocidos                                           |
| 4   | `normalizeResolvedModel`         | Reescritura final antes de que el ejecutor integrado utilice el modelo resuelto                                             | El proveedor necesita reescrituras de transporte pero aún utiliza un transporte central                                         |
| 5   | `capabilities`                   | Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida                 | El proveedor necesita peculiaridades de la transcripción/familia del proveedor                                                  |
| 6   | `prepareExtraParams`             | Normalización de parámetros de solicitud antes de los contenedores de opciones de transmisión genéricos                     | El proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor                            |
| 7   | `wrapStreamFn`                   | Contenedor de transmisión después de aplicar los contenedores genéricos                                                     | El proveedor necesita contenedores de compatibilidad de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado  |
| 8   | `formatApiKey`                   | Formateador de perfil de autenticación: el perfil almacenado se convierte en la cadena de tiempo de ejecución `apiKey`      | El proveedor almacena metadatos de autenticación adicionales y necesita una forma de token de tiempo de ejecución personalizada |
| 9   | `refreshOAuth`                   | Invalidación de actualización de OAuth para endpoints de actualización personalizados o política de fallos de actualización | El proveedor no se ajusta a los actualizadores `pi-ai` compartidos                                                              |
| 10  | `buildAuthDoctorHint`            | Sugerencia de reparación añadida cuando falla la actualización de OAuth                                                     | El proveedor necesita orientación de reparación de autenticación propiedad del proveedor después de un fallo de actualización   |
| 11  | `isCacheTtlEligible`             | Política de caché de prompt para proveedores de proxy/backhaul                                                              | El proveedor necesita un control de TTL de caché específico para el proxy                                                       |
| 12  | `buildMissingAuthMessage`        | Reemplazo del mensaje genérico de recuperación de autenticación faltante                                                    | El proveedor necesita una pista de recuperación de autenticación faltante específica del proveedor                              |
| 13  | `suppressBuiltInModel`           | Supresión de modelo upstream obsoleto más pista de error opcional para el usuario                                           | El proveedor necesita ocultar filas upstream obsoletas o reemplazarlas con una pista del proveedor                              |
| 14  | `augmentModelCatalog`            | Filas sintéticas/finales del catálogo añadidas después del descubrimiento                                                   | El proveedor necesita filas de compatibilidad hacia adelante sintéticas en `models list` y selectores                           |
| 15  | `isBinaryThinking`               | Interruptor de razonado activado/desactivado para proveedores de pensamiento binario                                        | El proveedor expone solo el pensamiento binario activado/desactivado                                                            |
| 16  | `supportsXHighThinking`          | Soporte de razonado `xhigh` para modelos seleccionados                                                                      | El proveedor desea `xhigh` solo en un subconjunto de modelos                                                                    |
| 17  | `resolveDefaultThinkingLevel`    | Nivel `/think` predeterminado para una familia de modelos específica                                                        | El proveedor posee la política `/think` predeterminada para una familia de modelos                                              |
| 18  | `isModernModelRef`               | Comparador de modelo moderno para filtros de perfil en vivo y selección de humo                                             | El proveedor posee la coincidencia de modelo preferido en vivo/humo                                                             |
| 19  | `prepareRuntimeAuth`             | Intercambiar una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia         | El proveedor necesita un intercambio de token o credencial de solicitud de corta duración                                       |
| 20  | `resolveUsageAuth`               | Resolver credenciales de uso/facturación para `/usage` y superficies de estado relacionadas                                 | El proveedor necesita un análisis personalizado de token de uso/cuota o una credencial de uso diferente                         |
| 21  | `fetchUsageSnapshot`             | Obtener y normalizar instantáneas de uso/cuota específicas del proveedor después de resolver la autenticación               | El proveedor necesita un endpoint de uso específico del proveedor o un analizador de carga útil                                 |

Si el proveedor necesita un protocolo de cable completamente personalizado o un ejecutor de solicitudes personalizado,
eso es una clase diferente de extensión. Estos ganchos son para el comportamiento del proveedor
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
  `resolveDefaultThinkingLevel` y `isModernModelRef` porque posee la compatibilidad
  hacia adelante de Claude 4.6, sugerencias de familia de proveedores, guía de reparación de autenticación, integración
  del endpoint de uso, elegibilidad de caché de prompts, y la política de pensamiento
  predeterminada/adaptativa de Claude.
- OpenAI usa `resolveDynamicModel`, `normalizeResolvedModel` y
  `capabilities` además de `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` y `isModernModelRef`
  porque es propietaria de la compatibilidad futura de GPT-5.4, la normalización
  directa de OpenAI `openai-completions` -> `openai-responses`, sugerencias de
  autenticación compatibles con Codex, supresión de Spark, filas sintéticas de
  listas de OpenAI y la política de pensamiento GPT-5 / modelo en vivo.
- OpenRouter usa `catalog` además de `resolveDynamicModel` y
  `prepareDynamicModel` porque el proveedor es de paso y puede exponer nuevos
  identificadores de modelo antes de que se actualice el catálogo estático de
  OpenClaw; también usa `capabilities`, `wrapStreamFn` y
  `isCacheTtlEligible` para mantener los encabezados de solicitud específicos
  del proveedor, los metadatos de enrutamiento, los parches de razonamiento y
  la política de caché de indicaciones fuera del núcleo.
- GitHub Copilot usa `catalog`, `auth`, `resolveDynamicModel` y
  `capabilities` además de `prepareRuntimeAuth` y `fetchUsageSnapshot` porque
  necesita inicio de sesión de dispositivo propiedad del proveedor, comportamiento
  de respaldo del modelo, peculiaridades de las transcripciones de Claude, un
  intercambio de token de GitHub -> token de Copilot y un endpoint de uso propiedad
  del proveedor.
- OpenAI Codex usa `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` y `augmentModelCatalog` más
  `prepareExtraParams`, `resolveUsageAuth` y `fetchUsageSnapshot` porque aún
  se ejecuta en los transportes principales de OpenAI pero posee la normalización del transporte/URL base,
  la política de reserva de actualización de OAuth, la elección de transporte predeterminada,
  las filas sintéticas del catálogo de Codex y la integración del punto de conexión de uso de ChatGPT.
- Google AI Studio y Gemini CLI OAuth usan `resolveDynamicModel` y
  `isModernModelRef` porque poseen la reserva de compatibilidad con versiones futuras de Gemini 3.1 y
  la coincidencia de modelos modernos; Gemini CLI OAuth también usa `formatApiKey`,
  `resolveUsageAuth` y `fetchUsageSnapshot` para el formato de token, el análisis
  de token y la conexión del punto de conexión de cuota.
- Moonshot usa `catalog` más `wrapStreamFn` porque aún usa el transporte
  compartido de OpenAI pero necesita una normalización de carga útil de pensamiento propiedad del proveedor.
- Kilocode usa `catalog`, `capabilities`, `wrapStreamFn` y
  `isCacheTtlEligible` porque necesita encabezados de solicitud propiedad del proveedor,
  normalización de carga útil de razonamiento, pistas de transcripción de Gemini y control de paso
  de caché de Anthropic.
- Z.AI usa `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` y `fetchUsageSnapshot` porque posee el respaldo GLM-5,
  los valores predeterminados de `tool_stream`, la UX de pensamiento binario, la coincidencia de modelos modernos y tanto
  la autenticación de uso como la obtención de cuotas.
- Mistral, OpenCode Zen y OpenCode Go usan `capabilities` solo para mantener
  las peculiaridades de la transcripción/herramientas fuera del núcleo.
- Los proveedores integrados solo de catálogo, como `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` usan
  solo `catalog`.
- El portal de Qwen usa `catalog`, `auth` y `refreshOAuth`.
- MiniMax y Xiaomi usan `catalog` más hooks de uso porque su comportamiento de `/usage`
  es propiedad del complemento aunque la inferencia aún se ejecuta a través de los
  transportes compartidos.

## Asistentes de tiempo de ejecución

Los complementos pueden acceder a auxiliares principales seleccionados a través de `api.runtime`. Para TTS:

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
- Utiliza la configuración `messages.tts` del núcleo y la selección del proveedor.
- Devuelve el búfer de audio PCM + la frecuencia de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
- `listVoices` es opcional por proveedor. Úselo para selectores de voz propiedad del proveedor o flujos de configuración.
- Las listas de voces pueden incluir metadatos más enriquecidos, como configuración regional, género y etiquetas de personalidad para selectores conscientes del proveedor.
- OpenAI y ElevenLabs son compatibles con telefonía hoy. Microsoft no.

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

- Mantenga la política, la alternativa y la entrega de respuestas de TTS en el núcleo.
- Utilice proveedores de voz para el comportamiento de síntesis propiedad del proveedor.
- La entrada `edge` de Microsoft heredada se normaliza al id de proveedor `microsoft`.
- El modelo de propiedad preferido está orientado a la empresa: un complemento de proveedor puede ser propietario de proveedores de texto, voz, imagen y medios futuros a medida que OpenClaw agregue esos contratos de capacidad.

Para la comprensión de imagen/audio/vídeo, los complementos registran un
proveedor de comprensión de medios tipificado en lugar de un bolsa genérica
clave/valor:

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

- Mantenga la orquestación, el respaldo (fallback), la configuración y el cableado
  del canal en el núcleo (core).
- Mantenga el comportamiento del proveedor en el complemento del proveedor.
- La expansión aditiva debe permanecer tipificada: nuevos métodos opcionales,
  nuevos campos de resultado opcionales, nuevas capacidades opcionales.
- Si OpenClaw añade una nueva capacidad como la generación de video más adelante,
  defina primero el contrato de capacidad principal, luego permita que los
  complementos de proveedores se registren contra él.

Para los asistentes de ejecución de comprensión de medios, los complementos pueden
llamar a:

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

Para la transcripción de audio, los complementos pueden usar tanto el tiempo de
ejecución de comprensión de medios como el alias STT anterior:

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

Notas:

- `api.runtime.mediaUnderstanding.*` es la superficie compartida preferida para la
  comprensión de imagen/audio/vídeo.
- Usa la configuración de audio de comprensión de medios principal
  (`tools.media.audio`) y el orden de respaldo de proveedores.
- Devuelve `{ text: undefined }` cuando no se produce ninguna salida de
  transcripción (por ejemplo, entrada omitida/no admitida).
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
- OpenClaw solo respeta esos campos de anulación para las personas que llaman de confianza.
- Para las ejecuciones de reserva propiedad del complemento, los operadores deben optar con `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Use `plugins.entries.<id>.subagent.allowedModels` para restringir los complementos de confianza a objetivos `provider/model` canónicos específicos, o `"*"` para permitir cualquier objetivo explícitamente.
- Las ejecuciones de subagentes de complementos que no son de confianza siguen funcionando, pero las solicitudes de anulación se rechazan en lugar de recurrir silenciosamente.

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

Los complementos también pueden registrar proveedores de búsqueda web a través de
`api.registerWebSearchProvider(...)`.

Notas:

- Mantenga la selección del proveedor, la resolución de credenciales y la semántica de solicitud compartida en el núcleo.
- Use proveedores de búsqueda web para transportes de búsqueda específicos del proveedor.
- `api.runtime.webSearch.*` es la superficie compartida preferida para complementos de características/canales que necesitan comportamiento de búsqueda sin depender del contenedor de la herramienta del agente.

## Rutas HTTP del Gateway

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

- `path`: ruta de acceso bajo el servidor HTTP del gateway.
- `auth`: obligatorio. Use `"gateway"` para requerir la autenticación normal del gateway, o `"plugin"` para la autenticación/verificación de webhooks gestionada por el complemento.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelve `true` cuando la ruta manejó la solicitud.

Notas:

- `api.registerHttpHandler(...)` está obsoleto. Use `api.registerHttpRoute(...)`.
- Las rutas de los complementos deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un complemento no puede reemplazar la ruta de otro complemento.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantenga las cadenas de reserva `exact`/`prefix` solo en el mismo nivel de autenticación.

## Rutas de importación del SDK de plugins

Utilice subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` al
crear plugins:

- `openclaw/plugin-sdk/plugin-entry` para primitivas de registro de plugins.
- `openclaw/plugin-sdk/core` para el contrato genérico compartido orientado al plugin.
- Primitivas de canal estables como `openclaw/plugin-sdk/channel-setup`,
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
  el formato de sobres y los asistentes de contexto de sobres entrantes.
- Subrutas de dominio como `openclaw/plugin-sdk/channel-config-helpers`,
  `openclaw/plugin-sdk/allow-from`,
  `openclaw/plugin-sdk/channel-config-schema`,
  `openclaw/plugin-sdk/channel-policy`,
  `openclaw/plugin-sdk/config-runtime`,
  `openclaw/plugin-sdk/infra-runtime`,
  `openclaw/plugin-sdk/agent-runtime`,
  `openclaw/plugin-sdk/lazy-runtime`,
  `openclaw/plugin-sdk/reply-history`,
  `openclaw/plugin-sdk/routing`,
  `openclaw/plugin-sdk/status-helpers`,
  `openclaw/plugin-sdk/runtime-store` y
  `openclaw/plugin-sdk/directory-runtime` para asistentes compartidos de configuración/tiempo de ejecución.
- `openclaw/plugin-sdk/channel-runtime` permanece solo como una adaptación de compatibilidad.
  El código nuevo debería importar las primitivas más específicas en su lugar.
- Los elementos internos de la extensión empaquetada siguen siendo privados. Los complementos externos deben usar solo
  subrutas `openclaw/plugin-sdk/*`. El código principal/pruebas de OpenClaw puede usar los puntos de entrada
  públicos del repositorio bajo `extensions/<id>/index.js`, `api.js`, `runtime-api.js`,
  `setup-entry.js` y archivos de alcance limitado como `login-qr-api.js`. Nunca
  importes `extensions/<id>/src/*` desde el núcleo ni desde otra extensión.
- División del punto de entrada del repositorio:
  `extensions/<id>/api.js` es el paquete de asistentes/tipos,
  `extensions/<id>/runtime-api.js` es el paquete solo de tiempo de ejecución,
  `extensions/<id>/index.js` es la entrada del complemento empaquetado,
  y `extensions/<id>/setup-entry.js` es la entrada del complemento de configuración.
- No quedan subrutas públicas con marca de canal incluidas. Los asistentes específicos del canal y
  las costuras de tiempo de ejecución se encuentran bajo `extensions/<id>/api.js` y `extensions/<id>/runtime-api.js`;
  el contrato público del SDK son las primitivas compartidas genéricas en su lugar.

Nota de compatibilidad:

- Evite el barril raíz `openclaw/plugin-sdk` para código nuevo.
- Prefiera primero las primitivas estables estrechas. Las subrutas más nuevas de setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool son el contrato previsto para el trabajo
  de nuevos complementos incluidos y externos.
  El análisis/emparejamiento de objetivos pertenece a `openclaw/plugin-sdk/channel-targets`.
  Las compuertas de acción de mensajes y los asistentes de ID de mensaje de reacción pertenecen a
  `openclaw/plugin-sdk/channel-actions`.
- Los barriles de asistentes específicos de extensiones incluidas no son estables de forma predeterminada. Si un
  asistente solo lo necesita una extensión incluida, manténgalo detrás de la costura local `api.js` o `runtime-api.js` de la extensión en lugar de promoverlo a
  `openclaw/plugin-sdk/<extension>`.
- Los barriles incluidos con marca de canal permanecen privados a menos que se agreguen explícitamente
  de nuevo al contrato público.
- Las subrutas específicas de capacidades, como `image-generation`,
  `media-understanding` y `speech`, existen porque los complementos incluidos/nativos las usan
  hoy. Su presencia por sí sola no significa que cada asistente exportado sea un
  contrato externo congelado a largo plazo.

## Esquemas de herramientas de mensajes

Los complementos deben ser propietarios de las contribuciones del esquema `describeMessageTool(...)` específicas del canal. Mantenga los campos específicos del proveedor en el complemento, no en el núcleo compartido.

Para fragmentos de esquema portátiles compartidos, reutilice las funciones auxiliares genéricas exportadas a través de `openclaw/plugin-sdk/channel-actions`:

- `createMessageToolButtonsSchema()` para payloads de estilo de cuadrícula de botones
- `createMessageToolCardSchema()` para payloads de tarjetas estructuradas

Si una forma de esquema solo tiene sentido para un proveedor, defínala en el código fuente de ese complemento en lugar de promoverla al SDK compartido.

## Resolución de objetivos del canal

Los complementos del canal deben ser propietarios de la semántica de objetivos específicos del canal. Mantenga el host de salida compartido genérico y use la superficie del adaptador de mensajería para las reglas del proveedor:

- `messaging.inferTargetChatType({ to })` decide si un objetivo normalizado debe tratarse como `direct`, `group` o `channel` antes de la búsqueda en el directorio.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indica al núcleo si una entrada debe saltar directamente a la resolución tipo identificador en lugar de la búsqueda en el directorio.
- `messaging.targetResolver.resolveTarget(...)` es el respaldo del complemento cuando el núcleo necesita una resolución final propiedad del proveedor después de la normalización o después de un fallo en el directorio.
- `messaging.resolveOutboundSessionRoute(...)` es propietario de la construcción de rutas de sesión específicas del proveedor una vez que se resuelve un objetivo.

División recomendada:

- Use `inferTargetChatType` para decisiones de categoría que deben ocurrir antes de buscar pares/grupos.
- Use `looksLikeId` para comprobaciones de "tratar esto como un id de destino explícito/nativo".
- Use `resolveTarget` para la reserva de normalización específica del proveedor, no para
  una búsqueda amplia de directorios.
- Mantenga los ids nativos del proveedor como ids de chat, ids de hilo, JIDs, identificadores (handles) e ids
  de sala dentro de los valores `target` o parámetros específicos del proveedor, no en campos genéricos del
  SDK.

## Directorios respaldados por configuración

Los complementos que derivan entradas de directorio desde la configuración deben mantener esa lógica en el
complemento y reutilizar las funciones auxiliares compartidas de
`openclaw/plugin-sdk/directory-runtime`.

Use esto cuando un canal necesite pares/grupos respaldados por configuración, tales como:

- pares de MD impulsados por lista de permitidos
- mapas de canal/grupo configurados
- reservas de directorios estáticos con alcance de cuenta

Las funciones auxiliares compartidas en `directory-runtime` solo manejan operaciones genéricas:

- filtrado de consultas
- aplicación de límites
- funciones auxiliares de deduplicación/normalización
- construcción de `ChannelDirectoryEntry[]`

La inspección de cuentas específicas del canal y la normalización de ids deben permanecer en la
implementación del complemento.

## Catálogos de proveedores

Los complementos de proveedor pueden definir catálogos de modelos para inferencia con
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma forma que OpenClaw escribe en
`models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento posee identificadores de modelo específicos del proveedor, valores predeterminados de URL base o metadatos de modelo protegidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores simples de clave de API o controlados por variables de entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedores relacionadas
- `late`: última pasada, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de claves, por lo que los complementos pueden anular intencionalmente una entrada de proveedor integrada con el mismo ID de proveedor.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado
- si se registran tanto `catalog` como `discovery`, OpenClaw usa `catalog`

## Inspección de canal de solo lectura

Si su complemento registra un canal, prefiera implementar
`plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de ejecución. Se permite asumir que las credenciales
  están totalmente materializadas y puede fallar rápidamente cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura, como `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve` y los flujos de
  reparación de doctor/config no deberían necesitar materializar credenciales
  de tiempo de ejecución solo para describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devolver solo el estado descriptivo de la cuenta.
- Conservar `enabled` y `configured`.
- Incluir campos de origen/estado de las credenciales cuando sea relevante, tales como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No es necesario devolver valores de token sin procesar solo para informar la disponibilidad de solo lectura. Devolver `tokenStatus: "available"` (y el campo de origen coincidente) es suficiente para los comandos de tipo estado.
- Use `configured_unavailable` cuando una credencial se configure a través de SecretRef pero no está disponible en la ruta del comando actual.

Esto permite que los comandos de solo lectura informen "configurado pero no disponible en esta ruta de comando" en lugar de fallar o informar incorrectamente que la cuenta no está configurada.

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

Cada entrada se convierte en un complemento. Si el paquete enumera varias extensiones, el id del complemento se convierte en `name/<fileBase>`.

Si tu complemento importa dependencias de npm, instálalas en ese directorio para que
`node_modules` esté disponible (`npm install` / `pnpm install`).

Guardrail de seguridad: cada entrada `openclaw.extensions` debe permanecer dentro del directorio del
complemento después de la resolución de enlaces simbólicos. Las entradas que salen del directorio del paquete son
rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias del complemento con
`npm install --ignore-scripts` (sin scripts de ciclo de vida). Mantén los árboles de dependencias
"JS/TS puro" y evita paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración.
Cuando OpenClaw necesita superficies de configuración para un complemento de canal deshabilitado, o
cuando un complemento de canal está habilitado pero aún sin configurar, carga `setupEntry`
en lugar de la entrada completa del complemento. Esto mantiene el inicio y la configuración más ligeros
cuando tu entrada principal del complemento también conecta herramientas, hooks u otro código
de solo tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
puede optar por que un complemento de canal siga la misma ruta `setupEntry` durante la fase de
inicio previo a la escucha del gateway, incluso cuando el canal ya está configurado.

Use esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir
antes de que el gateway comience a escuchar. En la práctica, eso significa que la entrada de configuración
debe registrar cada capacidad propiedad del canal de la cual depende el inicio, tales como:

- el propio registro del canal
- cualquier ruta HTTP que debe estar disponible antes de que el gateway comience a escuchar
- cualquier método, herramienta o servicio del gateway que deba existir durante esa misma ventana

Si su entrada completa todavía posee alguna capacidad de inicio requerida, no active
esta bandera. Mantenga el complemento en el comportamiento predeterminado y deje que OpenClaw cargue la
entrada completa durante el inicio.

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

Los complementos de canal pueden anunciar metadatos de configuración/descubrimiento a través de `openclaw.channel` e
indicaciones de instalación a través de `openclaw.install`. Esto mantiene el catálogo principal libre de datos.

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

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación de registro de MPM). Suelte un archivo JSON en uno de:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por coma/punto y coma/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Plugins del motor de contexto

Los plugins del motor de contexto son propietarios de la orquestación del contexto de sesión para ingestión, ensamblaje
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
el sistema de plugins con un acceso privado. Agregue la capacidad faltante.

Secuencia recomendada:

1. definir el contrato principal
   Decide qué comportamiento compartido debería poseer el núcleo: políticas, respaldo,
   fusión de configuración, ciclo de vida, semántica orientada al canal y la forma
   del asistente de tiempo de ejecución.
2. añadir superficies de registro/tiempo de ejecución de complementos tipadas
   Extiende `OpenClawPluginApi` y/o `api.runtime` con la superficie de
   capacidad tipada más pequeña útil.
3. conectar núcleo y consumidores de canal/funcionalidad
   Los canales y los complementos de funcionalidad deben consumir la nueva capacidad
   a través del núcleo, no importando una implementación de proveedor directamente.
4. registrar implementaciones de proveedores
   Los complementos de proveedor luego registran sus backends contra la capacidad.
5. añadir cobertura de contrato
   Añade pruebas para que la propiedad y la forma de registro se mantengan explícitas
   con el tiempo.

Así es como OpenClaw se mantiene con criterios definidos sin volverse rígido a la
visión del mundo de un proveedor. Consulta el [Capability Cookbook](/en/tools/capability-cookbook)
para ver una lista de verificación de archivos concreta y un ejemplo trabajado.

### Lista de verificación de capacidades

Cuando añadas una nueva capacidad, la implementación generalmente debería tocar estas
superfices juntas:

- tipos de contrato principal en `src/<capability>/types.ts`
- asistente de ejecución/tiempo de ejecución principal en `src/<capability>/runtime.ts`
- superficie de registro de API de complementos en `src/plugins/types.ts`
- conexión del registro de complementos en `src/plugins/registry.ts`
- exposición del tiempo de ejecución del plugin en `src/plugins/runtime/*` cuando los plugins de características/canales
  necesitan consumirla
- asistentes de captura/prueba en `src/test-utils/plugin-registration.ts`
- afirmaciones de propiedad/contrato en `src/plugins/contracts/registry.ts`
- documentación del operador/plugin en `docs/`

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

- el núcleo posee el contrato de capacidad + orquestación
- los plugins de proveedores poseen las implementaciones del proveedor
- los plugins de características/canales consumen asistentes de tiempo de ejecución
- las pruebas de contrato mantienen la propiedad explícita
