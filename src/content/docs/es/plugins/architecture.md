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
  Esta es la **referencia de arquitectura profunda**. Para guías prácticas, consulte: - [Instalar y usar complementos](/en/tools/plugin) — guía de usuario - [Cómo empezar](/en/plugins/building-plugins) — primer tutorial de complementos - [Complementos de canal](/en/plugins/sdk-channel-plugins) — construir un canal de mensajería - [Complementos de proveedor](/en/plugins/sdk-provider-plugins) —
  construir un proveedor de modelos - [Descripción general del SDK](/en/plugins/sdk-overview) — mapa de importación y API de registro
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
| Comprensión multimedia       | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| Generación de imágenes       | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Búsqueda web                 | `api.registerWebSearchProvider(...)`          | `google`                  |
| Canal / mensajería           | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

Un complemento que registra cero capacidades pero proporciona enlaces, herramientas o
servicios es un complemento **solo de enlaces heredados**. Ese patrón todavía tiene soporte completo.

### Postura de compatibilidad externa

El modelo de capacidades está integrado en el núcleo y es utilizado por los complementos incluidos/nativos
hoy en día, pero la compatibilidad de complementos externos aún necesita un estándar más estricto que "se
exporta, por lo tanto está congelado".

Guía actual:

- **complementos externos existentes:** mantener funcionando las integraciones basadas en enlaces; tratar
  esto como la línea base de compatibilidad
- **nuevos complementos incluidos/nativos:** preferir el registro explícito de capacidades sobre
  accesos específicos del proveedor o nuevos diseños solo de enlaces
- **plugins externos que adopten el registro de capacidades:** permitido, pero trate las superficies de ayuda específicas de la capacidad como en evolución a menos que los documentos marquen explícitamente un contrato como estable

Regla práctica:

- las API de registro de capacidades son la dirección prevista
- los hooks heredados siguen siendo la ruta más segura sin rupturas para los plugins externos durante la transición
- las subrutas de ayuda exportadas no son todas iguales; prefiera el contrato documentado estrecho, no las exportaciones de ayuda incidentales

### Formas de plugins

OpenClaw clasifica cada complemento cargado en una forma según su comportamiento de registro real (no solo metadatos estáticos):

- **plain-capability** -- registra exactamente un tipo de capacidad (por ejemplo, un complemento solo de proveedor como `mistral`)
- **hybrid-capability** -- registra múltiples tipos de capacidades (por ejemplo, `openai` posee inferencia de texto, voz, comprensión multimedia y generación de imágenes)
- **hook-only** -- registra solo hooks (tipados o personalizados), sin capacidades, herramientas, comandos o servicios
- **non-capability** -- registra herramientas, comandos, servicios o rutas, pero ninguna capacidad

Use `openclaw plugins inspect <id>` para ver la forma de un complemento y el desglose de capacidades. Consulte [CLI reference](/en/cli/plugins#inspect) para obtener más detalles.

### Hooks heredados

El hook `before_agent_start` sigue siendo compatible como una ruta de compatibilidad para los complementos solo de hook. Los complementos heredados del mundo real aún dependen de él.

Dirección:

- mantenerlo funcionando
- documentarlo como heredado
- preferir `before_model_resolve` para el trabajo de anulación de modelo/proveedor
- preferir `before_prompt_build` para el trabajo de mutación de prompt
- eliminar solo después de que el uso real disminuya y la cobertura de dispositivos demuestre la seguridad de la migración

### Señales de compatibilidad

Cuando ejecute `openclaw doctor` o `openclaw plugins inspect <id>`, puede ver una de estas etiquetas:

| Señal                      | Significado                                                            |
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
   OpenClaw encuentra complementos candidatos desde rutas configuradas, raíces del espacio de trabajo,
   raíces de extensiones globales y extensiones incluidas. El descubrimiento lee los manifiestos nativos
   `openclaw.plugin.json` además de los manifiestros de paquetes compatibles primero.
2. **Habilitación + validación**
   Core decide si un complemento descubierto está habilitado, deshabilitado, bloqueado o
   seleccionado para un espacio exclusivo como la memoria.
3. **Carga en tiempo de ejecución**
   Los complementos nativos de OpenClaw se cargan en proceso mediante jiti y registran
   capacidades en un registro central. Los paquetes compatibles se normalizan en
   registros del sistema sin importar código de tiempo de ejecución.
4. **Consumo de superficie**
   El resto de OpenClaw lee el registro para exponer herramientas, canales, configuración
   de proveedores, ganchos, rutas HTTP, comandos CLI y servicios.

Específicamente para la CLI de complementos, el descubrimiento de comandos raíz se divide en dos fases:

- los metadatos en tiempo de análisis provienen de `registerCli(..., { descriptors: [...] })`
- el módulo real de la CLI del complemento puede mantenerse diferido y registrarse en la primera invocación

Eso mantiene el código CLI propiedad del complemento dentro del complemento mientras aún permite que OpenClaw
reserve nombres de comandos raíz antes del análisis.

El límite de diseño importante:

- el descubrimiento + validación de configuración debe funcionar desde **metadatos de manifiesto/esquema**
  sin ejecutar código del complemento
- el comportamiento nativo en tiempo de ejecución proviene de la ruta `register(api)` del módulo del complemento

Esa división permite a OpenClaw validar la configuración, explicar complementos faltantes/deshabilitados y
construir sugerencias de UI/esquema antes de que el tiempo de ejecución completo esté activo.

### Complementos de canal y la herramienta de mensaje compartido

Los complementos de canal no necesitan registrar una herramienta separada de enviar/editar/reaccionar para
las acciones de chat normales. OpenClaw mantiene una herramienta `message` compartida en el núcleo, y
los complementos de canal son propietarios del descubrimiento y ejecución específicos del canal detrás de ella.

El límite actual es:

- el núcleo es propietario del host de la herramienta `message` compartida, el cableado del prompt, el mantenimiento de libros de sesión/hilo y el envío de la ejecución
- los complementos del canal son propietarios del descubrimiento de acciones con alcance, el descubrimiento de capacidades y cualquier fragmento de esquema específico del canal
- los complementos del canal son propietarios de la gramática de conversación de sesión específica del proveedor, como la forma en que los identificadores de conversación codifican los identificadores de hilo o heredan de las conversaciones principales
- los complementos del canal ejecutan la acción final a través de su adaptador de acción

Para los complementos del canal, la superficie del SDK es `ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento unificada permite que un complemento devuelva sus acciones visibles, capacidades y contribuciones de esquema juntas para que esas piezas no se separen.

El núcleo pasa el alcance de tiempo de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- `requesterSenderId` entrante de confianza

Eso es importante para los complementos sensibles al contexto. Un canal puede ocultar o exponer acciones de mensajes basándose en la cuenta activa, la sala/hilo/mensaje actual o la identidad del solicitante de confianza sin codificar ramas específicas del canal en la herramienta `message` del núcleo.

Por eso los cambios de enrutamiento del ejecutor integrado siguen siendo trabajo del complemento: el ejecutor es responsable de reenviar la identidad de chat/sesión actual al límite de descubrimiento del complemento para que la herramienta `message` compartida exponga la superficie propiedad del canal correcta para el turno actual.

Para los asistentes de ejecución propiedad del canal, los complementos empaquetados deben mantener el tiempo de ejecución de ejecución dentro de sus propios módulos de extensión. El núcleo ya no posee los tiempos de ejecución de acciones de mensajes de Discord, Slack, Telegram o WhatsApp bajo `src/agents/tools`. No publicamos subrutas `plugin-sdk/*-action-runtime` separadas, y los complementos empaquetados deben importar su propio código de tiempo de ejecución local directamente desde sus módulos propiedad de la extensión.

Para las encuestas específicamente, hay dos rutas de ejecución:

- `outbound.sendPoll` es la línea base compartida para los canales que se ajustan al modelo de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para la semántica de
  encuesta específica del canal o parámetros de encuesta adicionales

El núcleo ahora difiere el análisis compartido de encuestas hasta que el despacho de encuestas del plugin rechace
la acción, de modo que los manejadores de encuestas propiedad del plugin puedan aceptar campos de encuesta
específicos del canal sin ser bloqueados primero por el analizador genérico de encuestas.

Consulte [Load pipeline](#load-pipeline) para ver la secuencia completa de inicio.

## Modelo de propiedad de capacidades

OpenClaw trata un plugin nativo como el límite de propiedad para una **empresa** o una
**característica**, no como una bolsa de integraciones no relacionadas.

Esto significa:

- un plugin de empresa generalmente debería ser propietario de todas las superficies orientadas a OpenClaw
  de esa empresa
- un plugin de característica generalmente debería ser propietario de la superficie completa de la característica que introduce
- los canales deben consumir capacidades centrales compartidas en lugar de volver a implementar
  el comportamiento del proveedor ad hoc

Ejemplos:

- el plugin incluido `openai` es propietario del comportamiento del proveedor de modelos de OpenAI y del comportamiento de voz + comprensión de medios + generación de imágenes de OpenAI
- el plugin incluido `elevenlabs` es propietario del comportamiento de voz de ElevenLabs
- el plugin incluido `microsoft` es propietario del comportamiento de voz de Microsoft
- el plugin incluido `google` es propietario del comportamiento del proveedor de modelos de Google además del comportamiento de comprensión de medios + generación de imágenes + búsqueda web de Google
- los plugins incluidos `minimax`, `mistral`, `moonshot` y `zai` son propietarios de sus
  backends de comprensión de medios
- el plugin `voice-call` es un plugin de características: es propietario del transporte de llamadas, herramientas,
  CLI, rutas y tiempo de ejecución, pero consume la capacidad central de TTS/STT en lugar de
  inventar una segunda pila de voz

El estado final deseado es:

- OpenAI vive en un solo plugin incluso si abarca modelos de texto, voz, imágenes y
  video futuro
- otro proveedor puede hacer lo mismo con su propia superficie
- a los canales no les importa qué plugin de proveedor es propietario del proveedor; consumen el
  contrato de capacidad compartida expuesto por el núcleo

Esta es la distinción clave:

- **plugin** = límite de propiedad
- **capacidad** = contrato central que múltiples plugins pueden implementar o consumir

Así que si OpenClaw añade un nuevo dominio como el video, la primera pregunta no es
"¿qué proveedor debería codificar el manejo de video?". La primera pregunta es "¿cuál es
el contrato principal de la capacidad de video?". Una vez que existe ese contrato, los complementos del proveedor
pueden registrarse en él y los complementos de canal/característica pueden consumirlo.

Si la capacidad aún no existe, el movimiento correcto generalmente es:

1. definir la capacidad faltante en el núcleo
2. exponerla a través de la API/entorno de ejecución del complemento de una manera tipada
3. conectar canales/características contra esa capacidad
4. permitir que los complementos del proveedor registren implementaciones

Esto mantiene la propiedad explícita mientras se evita un comportamiento central que dependa de un
solo proveedor o una ruta de código específica de un complemento de un solo uso.

### Capas de capacidad

Use este modelo mental al decidir a dónde pertenece el código:

- **capa de capacidad principal**: orquestación compartida, políticas, alternativas, reglas de
  combinación de configuración, semántica de entrega y contratos tipados
- **capa de complemento del proveedor**: APIs específicas del proveedor, autenticación, catálogos de modelos, síntesis
  de voz, generación de imágenes, backends de video futuros, puntos finales de uso
- **capa de complemento de canal/característica**: integración Slack/Discord/llamada de voz/etc.
  que consume capacidades principales y las presenta en una superficie

Por ejemplo, TTS sigue esta forma:

- el núcleo es propietario de la política de TTS en el momento de la respuesta, el orden de las alternativas, las preferencias y la entrega del canal
- `openai`, `elevenlabs` y `microsoft` son propietarios de las implementaciones de síntesis
- `voice-call` consume el asistente de ejecución TTS de telefonía

Ese mismo patrón debe preferirse para capacidades futuras.

### Ejemplo de complemento de empresa con múltiples capacidades

Un complemento de empresa debe parecer cohesivo desde el exterior. Si OpenClaw tiene contratos
compartidos para modelos, voz, comprensión de medios y búsqueda web, un proveedor puede
ser propietario de todas sus superficies en un solo lugar:

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

- un complemento es propietario de la superficie del proveedor
- el núcleo sigue siendo el propietario de los contratos de capacidad
- los canales y los complementos de características consumen asistentes `api.runtime.*`, no código del proveedor
- las pruebas de contrato pueden afirmar que el complemento registró las capacidades que
  reclama poseer

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad
compartida. El mismo modelo de propiedad se aplica allí:

1. el núcleo define el contrato de comprensión de medios
2. los complementos de proveedores registran `describeImage`, `transcribeAudio` y
   `describeVideo` según corresponda
3. los canales y los complementos de características consumen el comportamiento central compartido en lugar de
   conectarse directamente al código del proveedor

Eso evita incorporar los supuestos de video de un proveedor en el núcleo. El complemento es dueño
de la superficie del proveedor; el núcleo es dueño del contrato de capacidad y el comportamiento alternativo.

Si OpenClaw agrega un nuevo dominio más tarde, como la generación de video, use la misma
secuencia nuevamente: defina primero la capacidad central, luego permita que los complementos de proveedores
registre implementaciones contra ella.

¿Necesita una lista de verificación de implementación concreta? Consulte
[Capability Cookbook](/en/tools/capability-cookbook).

## Contratos y cumplimiento

La superficie de la API del complemento está intencionalmente tipada y centralizada en
`OpenClawPluginApi`. Ese contrato define los puntos de registro admitidos y
las asistentes de tiempo de ejecución en las que un complemento puede confiar.

Por qué esto importa:

- los autores de complementos obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos complementos registrando el mismo
  id de proveedor
- el inicio puede mostrar diagnósticos procesables para registros malformados
- las pruebas de contrato pueden hacer cumplir la propiedad de los complementos empaquetados y evitar la deriva silenciosa

Hay dos niveles de cumplimiento:

1. **cumplimiento del registro en tiempo de ejecución**
   El registro de complementos valida los registros a medida que se cargan los complementos. Ejemplos:
   los ID de proveedor duplicados, los ID de proveedor de voz duplicados y los registros
   malformados producen diagnósticos de complementos en lugar de un comportamiento indefinido.
2. **pruebas de contrato**
   Los complementos empaquetados se capturan en registros de contratos durante las ejecuciones de pruebas para que
   OpenClaw pueda afirmar la propiedad explícitamente. Hoy en día, esto se utiliza para proveedores
   de modelos, proveedores de voz, proveedores de búsqueda web y propiedad de registro
   empaquetada.

El efecto práctico es que OpenClaw sabe, por adelantado, qué complemento posee qué
superficie. Eso permite que el núcleo y los canales se compongan perfectamente porque la propiedad está
declarada, tipificada y es comprobable en lugar de implícita.

### Qué pertenece a un contrato

Los buenos contratos de complementos son:

- tipificados
- pequeños
- específicos de la capacidad
- poseídos por el núcleo
- reutilizables por múltiples complementos
- consumibles por canales/características sin conocimiento del proveedor

Los malos contratos de complementos son:

- políticas específicas del proveedor ocultas en el núcleo
- mecanismos de escape de plugin únicos que omiten el registro
- código de canal que accede directamente a una implementación de proveedor
- objetos de tiempo de ejecución ad hoc que no forman parte de `OpenClawPluginApi` o
  `api.runtime`

En caso de duda, sube el nivel de abstracción: define primero la capacidad y luego
permite que los complementos se conecten a ella.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en el mismo proceso** que la Gateway. No están
aislados (sandboxed). Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que
el código central.

Implicaciones:

- un complemento nativo puede registrar herramientas, controladores de red, hooks y servicios
- un error en un complemento nativo puede bloquear o desestabilizar la puerta de enlace (gateway)
- un complemento nativo malicioso es equivalente a la ejecución de código arbitrario dentro
  del proceso de OpenClaw

Los paquetes (bundles) compatibles son más seguros de forma predeterminada porque OpenClaw actualmente los trata
como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades (skills)
agrupadas.

Utiliza listas de permitidos (allowlists) y rutas de instalación/carga explícitas para los complementos no agrupados. Trata
los complementos del espacio de trabajo (workspace) como código en tiempo de desarrollo, no como valores predeterminados de producción.

Para los nombres de paquetes del espacio de trabajo agrupados, mantén el ID del complemento anclado en el nombre
npm: `@openclaw/<id>` de forma predeterminada, o un sufijo de tipo aprobado como
`-provider`, `-plugin`, `-speech`, `-sandbox` o `-media-understanding` cuando
el paquete expone intencionalmente un rol de complemento más estrecho.

Nota importante de confianza:

- `plugins.allow` confía en los **ID de complemento**, no en el origen de la fuente.
- Un complemento del espacio de trabajo con el mismo ID que un complemento agrupado oculta intencionalmente
  la copia agrupada cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, las pruebas de parches (patch testing) y las correcciones urgentes (hotfixes).

## Límite de exportación

OpenClaw exporta capacidades, no conveniencias de implementación.

Mantén el registro de capacidades público. Reduce las exportaciones auxiliares que no son parte del contrato:

- subrutas auxiliares específicas de complementos agrupados
- subrutas de conexión (plumbing) en tiempo de ejecución no destinadas a ser API pública
- ayudantes de conveniencia específicos del proveedor
- ayudantes de configuración/incorporación que son detalles de implementación

## Canal de carga

Al iniciarse, OpenClaw hace aproximadamente esto:

1. descubrir raíces de complementos candidatas
2. leer manifiestos de paquetes nativos o compatibles y metadatos de paquetes
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación de cada candidato
6. cargar módulos nativos habilitados a través de jiti
7. llamar a los ganchos nativos `register(api)` (o `activate(api)` — un alias heredado) y recopilar los registros en el registro de complementos
8. exponer el registro a las superficies de comandos/tiempo de ejecución

<Note>`activate` es un alias heredado de `register` — el cargador resuelve cualquiera que esté presente (`def.register ?? def.activate`) y lo llama en el mismo punto. Todos los complementos empaquetados usan `register`; prefiera `register` para nuevos complementos.</Note>

Los portones de seguridad ocurren **antes** de la ejecución del tiempo de ejecución. Los candidatos se bloquean
cuando la entrada escapa de la raíz del complemento, la ruta es de escritura mundial, o la propiedad
de la ruta parece sospechosa para complementos no empaquetados.

### Comportamiento primero en el manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo utiliza para:

- identificar el complemento
- descubrir canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- aumentar etiquetas/marcadores de posición de la interfaz de usuario de Control
- mostrar metadatos de instalación/catálogo

Para complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra
el comportamiento real, como ganchos, herramientas, comandos o flujos de proveedores.

### Lo que almacena en caché el cargador

OpenClaw mantiene cachés cortos en el proceso para:

- resultados de descubrimiento
- datos del registro de manifiestos
- registros de complementos cargados

Estas cachés reducen la carga de inicio repentino y la sobrecarga de comandos repetidos. Es seguro
considerarlas como cachés de rendimiento a corto plazo, no como persistencia.

Nota de rendimiento:

- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para deshabilitar estas cachés.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modelo de registro

Los complementos cargados no mutan directamente las globales principales aleatorias. Se registran en un
registro central de complementos.

El registro rastrea:

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

Las funciones principales luego leen de ese registro en lugar de comunicarse con los módulos de los complementos directamente. Esto mantiene la carga en una sola dirección:

- módulo de complemento -> registro de registro
- tiempo de ejecución principal -> consumo del registro

Esa separación es importante para la mantenibilidad. Significa que la mayoría de las superficies principales solo necesitan un punto de integración: "leer el registro", en lugar de "casos especiales para cada módulo de complemento".

## Devoluciones de llamada de enlace de conversación

Los complementos que enlazan una conversación pueden reaccionar cuando se resuelve una aprobación.

Use `api.onConversationBindingResolved(...)` para recibir una devolución de llamada después de que una solicitud de enlace sea aprobada o denegada:

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
- `request`: el resumen de la solicitud original, sugerencia de desvinculación, id. del remitente y metadatos de la conversación

Esta devolución de llamada es solo de notificación. No cambia quién tiene permiso para vincular una conversación y se ejecuta después de que finaliza el manejo de aprobación principal.

## Ganchos de tiempo de ejecución del proveedor

Los complementos de proveedor ahora tienen dos capas:

- metadatos del manifiesto: `providerAuthEnvVars` para una búsqueda de autenticación de entorno económica antes de la carga del tiempo de ejecución, además de `providerAuthChoices` para etiquetas económicas de incorporación/elección de autenticación y metadatos de indicadores de CLI antes de la carga del tiempo de ejecución
- ganchos de tiempo de configuración: `catalog` / heredado `discovery`
- runtime hooks: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw sigue siendo propietario del bucle de agente genérico, la conmutación por error, el manejo de transcripciones y la política de herramientas. Estos hooks son la superficie de extensión para comportamientos específicos del proveedor sin necesidad de un transporte de inferencia personalizado completo.

Use el manifiesto `providerAuthEnvVars` cuando el proveedor tenga credenciales basadas en variables de entorno que las rutas genéricas de auth/status/model-picker deberían ver sin cargar el runtime del plugin. Use el manifiesto `providerAuthChoices` cuando las superficies de CLI de onboarding/auth-choice deban conocer el id de elección del proveedor, las etiquetas de grupo y el cableado de autenticación simple de una sola bandera sin cargar el runtime del proveedor. Mantenga el runtime del proveedor `envVars` para pistas orientadas al operador, como etiquetas de incorporación o variables de configuración de client-id/client-secret de OAuth.

### Orden y uso de los Hooks

Para los plugins de modelo/proveedor, OpenClaw llama a los hooks en este orden aproximado. La columna "Cuándo usar" es la guía de decisión rápida.

| #   | Hook                             | Lo que hace                                                                                                              | Cuándo usar                                                                                                                     |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                        | Publicar la configuración del proveedor en `models.providers` durante la generación de `models.json`                     | El proveedor posee un catálogo o valores predeterminados de URL base                                                            |
| --  | _(búsqueda de modelo integrada)_ | OpenClaw intenta primero la ruta normal de registro/catálogo                                                             | _(no es un hook de plugin)_                                                                                                     |
| 2   | `resolveDynamicModel`            | Respaldo síncrono para IDs de modelo propiedad del proveedor que aún no están en el registro local                       | El proveedor acepta IDs de modelo upstream arbitrarios                                                                          |
| 3   | `prepareDynamicModel`            | Calentamiento asíncrono, luego `resolveDynamicModel` se ejecuta nuevamente                                               | El proveedor necesita metadatos de red antes de resolver identificadores desconocidos                                           |
| 4   | `normalizeResolvedModel`         | Reescritura final antes de que el ejecutor integrado use el modelo resuelto                                              | El proveedor necesita reescrituras de transporte pero aún usa un transporte central                                             |
| 5   | `capabilities`                   | Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida              | El proveedor necesita peculiaridades de la transcripción/familia del proveedor                                                  |
| 6   | `prepareExtraParams`             | Normalización de parámetros de solicitud antes de los contenedores de opciones de transmisión genéricas                  | El proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor                            |
| 7   | `wrapStreamFn`                   | Contenedor de transmisión después de aplicar los contenedores genéricos                                                  | El proveedor necesita contenedores de compatibilidad de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado  |
| 8   | `formatApiKey`                   | Formateador de perfil de autenticación: el perfil almacenado se convierte en la cadena de tiempo de ejecución `apiKey`   | El proveedor almacena metadatos de autenticación adicionales y necesita una forma de token de tiempo de ejecución personalizada |
| 9   | `refreshOAuth`                   | Anulación de actualización de OAuth para endpoints de actualización personalizados o política de fallos de actualización | El proveedor no se ajusta a los actualizadores `pi-ai` compartidos                                                              |
| 10  | `buildAuthDoctorHint`            | Sugerencia de reparación agregada cuando falla la actualización de OAuth                                                 | El proveedor necesita orientación de reparación de autenticación propiedad del proveedor después de un fallo de actualización   |
| 11  | `isCacheTtlEligible`             | Política de caché de indicaciones para proveedores de proxy/backhaul                                                     | El proveedor necesita control de TTL de caché específico del proxy                                                              |
| 12  | `buildMissingAuthMessage`        | Reemplazo del mensaje genérico de recuperación de autenticación faltante                                                 | El proveedor necesita una sugerencia de recuperación de autenticación faltante específica del proveedor                         |
| 13  | `suppressBuiltInModel`           | Supresión de modelo ascendente obsoleto más sugerencia de error opcional para el usuario                                 | El proveedor necesita ocultar filas ascendentes obsoletas o reemplazarlas con una sugerencia del proveedor                      |
| 14  | `augmentModelCatalog`            | Filas sintéticas/finales del catálogo agregadas después del descubrimiento                                               | El proveedor necesita filas de compatibilidad futura sintéticas en `models list` y selectores                                   |
| 15  | `isBinaryThinking`               | Interruptor de razonado activado/desactivado para proveedores de pensamiento binario                                     | El proveedor expone solo el pensamiento binario activado/desactivado                                                            |
| 16  | `supportsXHighThinking`          | Soporte de razonado `xhigh` para modelos seleccionados                                                                   | El proveedor quiere `xhigh` solo en un subconjunto de modelos                                                                   |
| 17  | `resolveDefaultThinkingLevel`    | Nivel `/think` predeterminado para una familia de modelos específica                                                     | El proveedor es propietario de la política `/think` predeterminada para una familia de modelos                                  |
| 18  | `isModernModelRef`               | Comparador de modelos modernos para filtros de perfiles en vivo y selección de pruebas (smoke selection)                 | El proveedor es propietario de la coincidencia del modelo preferido en vivo/pruebas                                             |
| 19  | `prepareRuntimeAuth`             | Intercambiar una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia      | El proveedor necesita un intercambio de tokens o una credencial de solicitud de corta duración                                  |
| 20  | `resolveUsageAuth`               | Resolver credenciales de uso/facturación para `/usage` y superficies de estado relacionadas                              | El proveedor necesita un análisis personalizado de tokens de uso/cuota o una credencial de uso diferente                        |
| 21  | `fetchUsageSnapshot`             | Obtener y normalizar instantáneas de uso/cuota específicas del proveedor después de resolver la autenticación            | El proveedor necesita un punto final de uso específico del proveedor o un analizador de carga útil                              |

Si el proveedor necesita un protocolo de cable completamente personalizado o un ejecutor de solicitudes personalizado,
eso es una clase diferente de extensión. Estos enlaces son para el comportamiento del proveedor
que todavía se ejecuta en el bucle de inferencia normal de OpenClaw.

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
  `resolveDefaultThinkingLevel` y `isModernModelRef` porque es propietario de la compatibilidad
  hacia adelante de Claude 4.6, sugerencias de familia de proveedores, orientación de reparación de autenticación, integración
  del punto final de uso, elegibilidad de caché de avisos y política de pensamiento
  predeterminada/adaptativa de Claude.
- OpenAI usa `resolveDynamicModel`, `normalizeResolvedModel` y
  `capabilities` además de `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` y `isModernModelRef`
  porque posee la compatibilidad hacia adelante de GPT-5.4, la normalización directa
  `openai-completions` -> `openai-responses` de OpenAI, sugerencias de autenticación
  compatibles con Codex, supresión de Spark, filas de lista sintéticas de OpenAI y la política de
  pensamiento GPT-5 / modelo en vivo.
- OpenRouter usa `catalog` además de `resolveDynamicModel` y
  `prepareDynamicModel` porque el proveedor es de paso y puede exponer nuevos
  ids de modelo antes de que se actualice el catálogo estático de OpenClaw; también usa
  `capabilities`, `wrapStreamFn` y `isCacheTtlEligible` para mantener
  los encabezados de solicitud específicos del proveedor, los metadatos de enrutamiento, los parches de razonamiento y la
  política de caché de solicitudes fuera del núcleo.
- GitHub Copilot usa `catalog`, `auth`, `resolveDynamicModel` y
  `capabilities` además de `prepareRuntimeAuth` y `fetchUsageSnapshot` porque
  necesita inicio de sesión de dispositivo propiedad del proveedor, comportamiento de respaldo de modelo,
  peculiaridades de las transcripciones de Claude, un intercambio de token de GitHub -> token de Copilot y un
  endpoint de uso propiedad del proveedor.
- OpenAI Codex usa `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` y `augmentModelCatalog` además de
  `prepareExtraParams`, `resolveUsageAuth` y `fetchUsageSnapshot` porque
  todavía se ejecuta en los transportes principales de OpenAI pero posee su normalización de transporte/URL base,
  política de respaldo de actualización de OAuth, elección de transporte predeterminada,
  filas de catálogo sintéticas de Codex y la integración con el endpoint de uso de ChatGPT.
- Google AI Studio y Gemini CLI OAuth usan `resolveDynamicModel` y
  `isModernModelRef` porque son propietarios del mecanismo de reserva de compatibilidad futura de Gemini 3.1 y
  la coincidencia de modelos modernos; Gemini CLI OAuth también usa `formatApiKey`,
  `resolveUsageAuth` y `fetchUsageSnapshot` para el formato de token, análisis
  de token y conexión del endpoint de cuota.
- Moonshot usa `catalog` más `wrapStreamFn` porque todavía usa el transporte
  compartido de OpenAI pero necesita una normalización de carga útil de pensamiento (thinking) propiedad del proveedor.
- Kilocode usa `catalog`, `capabilities`, `wrapStreamFn` y
  `isCacheTtlEligible` porque necesita encabezados de solicitud propiedad del proveedor,
  normalización de carga útil de razonamiento, sugerencias de transcripción de Gemini y control de puerta de caché-TTL de Anthropic.
- Z.AI usa `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` y `fetchUsageSnapshot` porque es propietario de la reserva de GLM-5,
  valores predeterminados de `tool_stream`, experiencia de usuario de pensamiento binario, coincidencia de modelos modernos, y tanto
  la autenticación de uso como la obtención de cuotas.
- Mistral, OpenCode Zen y OpenCode Go usan solo `capabilities` para mantener
  las peculiaridades de transcripción/herramientas fuera del núcleo.
- Los proveedores incluidos solo en el catálogo, como `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` usan
  solo `catalog`.
- MiniMax y Xiaomi usan `catalog` además de ganchos de uso porque su comportamiento de `/usage`
  es propiedad del complemento aunque la inferencia aún se ejecuta a través de los transportes
  compartidos.

## Asistentes de tiempo de ejecución

Los complementos pueden acceder a ciertos asistentes principales mediante `api.runtime`. Para TTS:

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
- Utiliza la configuración principal de `messages.tts` y la selección de proveedores.
- Devuelve el búfer de audio PCM + la frecuencia de muestreo. Los complementos deben volver a muestrear/codificar para los proveedores.
- `listVoices` es opcional por proveedor. Úselo para selectores de voz propiedad del proveedor o flujos de configuración.
- Las listas de voces pueden incluir metadatos más enriquecidos, como configuración regional, género y etiquetas de personalidad, para selectores con conocimiento del proveedor.
- OpenAI y ElevenLabs admiten telefonía hoy en día. Microsoft no.

Los complementos también pueden registrar proveedores de voz mediante `api.registerSpeechProvider(...)`.

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
- La entrada `edge` de Microsoft heredada se normaliza al id del proveedor `microsoft`.
- El modelo de propiedad preferido está orientado a la empresa: un complemento de proveedor puede ser propietario de proveedores de texto, voz, imagen y medios futuros a medida que OpenClaw añada esos contratos de capacidad.

Para la comprensión de imagen/audio/video, los complementos registran un proveedor de comprensión de medios con tipo en lugar de un bolsa genérica de clave/valor:

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

- Mantenga la orquestación, la alternativa, la configuración y el cableado del canal en el núcleo.
- Mantenga el comportamiento del proveedor en el complemento del proveedor.
- La expansión aditiva debe permanecer tipada: nuevos métodos opcionales, nuevos campos de resultados opcionales, nuevas capacidades opcionales.
- Si OpenClaw añade una nueva capacidad, como la generación de video, más adelante, defina primero el contrato de capacidad central y luego permita que los complementos del proveedor se registren en él.

Para los asistentes de tiempo de ejecución de comprensión de medios, los complementos pueden llamar a:

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

Para la transcripción de audio, los complementos pueden utilizar el tiempo de ejecución de comprensión de medios o el alias STT anterior:

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
- Utiliza la configuración de audio de comprensión de medios central (`tools.media.audio`) y el orden de alternativa de proveedores.
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
- OpenClaw solo honra esos campos de anulación para llamadores de confianza.
- Para las ejecuciones de reserva propiedad del complemento, los operadores deben optar por participar con `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Use `plugins.entries.<id>.subagent.allowedModels` para restringir los complementos de confianza a objetivos canónicos `provider/model` específicos, o `"*"` para permitir cualquier objetivo explícitamente.
- Las ejecuciones de subagentes de complementos que no son de confianza aún funcionan, pero las solicitudes de anulación se rechazan en lugar de volver silenciosamente al mecanismo de reserva.

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

- `generate(...)`: genera una imagen utilizando la cadena de proveedores de generación de imágenes configurada.
- `listProviders(...)`: lista los proveedores de generación de imágenes disponibles y sus capacidades.

## Rutas HTTP de Gateway

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

- `path`: ruta de acceso bajo el servidor HTTP de gateway.
- `auth`: obligatorio. Use `"gateway"` para requerir autenticación normal de gateway, o `"plugin"` para autenticación administrada por el complemento/verificación de webhook.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelve `true` cuando la ruta manejó la solicitud.

Notas:

- `api.registerHttpHandler(...)` se eliminó y causará un error de carga del complemento. Use `api.registerHttpRoute(...)` en su lugar.
- Las rutas del complemento deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un complemento no puede reemplazar la ruta de otro complemento.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantenga las cadenas de reserva `exact`/`prefix` solo en el mismo nivel de autenticación.

## Rutas de importación del SDK de complementos

Use las subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` al
crear complementos:

- `openclaw/plugin-sdk/plugin-entry` para primitivas de registro de complementos.
- `openclaw/plugin-sdk/core` para el contrato genérico compartido orientado al complemento.
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
  `channel-inbound` es el hogar compartido para la eliminación de rebote, la coincidencia de menciones,
  el formato de sobres y los asistentes de contexto de sobre entrante.
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
  `openclaw/plugin-sdk/directory-runtime` para asistentes compartidos de tiempo de ejecución/configuración.
- `openclaw/plugin-sdk/channel-runtime` permanece solo como un shim de compatibilidad.
  El nuevo código debe importar las primitivas más específicas en su lugar.
- Los internos de las extensiones empaquetadas siguen siendo privados. Los plugins externos deben usar únicamente subrutas `openclaw/plugin-sdk/*`. El código principal/prueba de OpenClaw puede usar los puntos de entrada públicos del repositorio bajo la raíz de un paquete de plugin, tales como `index.js`, `api.js`, `runtime-api.js`, `setup-entry.js`, y archivos de alcance limitado como `login-qr-api.js`. Nunca importes un `src/*` de un paquete de plugin desde el núcleo o desde otra extensión.
- División del punto de entrada del repositorio: `<plugin-package-root>/api.js` es el barril de ayudas/tipos, `<plugin-package-root>/runtime-api.js` es el barril solo de tiempo de ejecución, `<plugin-package-root>/index.js` es el punto de entrada del plugin empaquetado, y `<plugin-package-root>/setup-entry.js` es el punto de entrada del plugin de configuración.
- No quedan subrutas públicas con marca de canal empaquetadas. Las ayudas específicas del canal y las costuras de tiempo de ejecución viven bajo `<plugin-package-root>/api.js` y `<plugin-package-root>/runtime-api.js`; el contrato público del SDK son en su lugar las primitivas compartidas genéricas.

Nota de compatibilidad:

- Evita el barril raíz `openclaw/plugin-sdk` para código nuevo.
- Prefiere primero las primitivas estrechas y estables. Las subrutas más nuevas de setup/pairing/reply/feedback/contract/inbound/threading/command/secret-input/webhook/infra/allowlist/status/message-tool son el contrato previsto para el nuevo trabajo de plugins empaquetados y externos. El análisis/emparejamiento de objetivos pertenece a `openclaw/plugin-sdk/channel-targets`. Las compuertas de acciones de mensaje y las ayuntas de ID de mensaje de reacción pertenecen a `openclaw/plugin-sdk/channel-actions`.
- Los barriles de ayudas específicos de extensiones empaquetadas no son estables por defecto. Si una ayuda solo es necesaria para una extensión empaquetada, manténla detrás de la costura local `api.js` o `runtime-api.js` de la extensión en lugar de promoverla a `openclaw/plugin-sdk/<extension>`.
- Las nuevas costuras de ayudas compartidas deben ser genéricas, no con marca de canal. El análisis de objetivos compartidos pertenece a `openclaw/plugin-sdk/channel-targets`; los internos específicos del canal se mantienen detrás de la costura local `api.js` o `runtime-api.js` del plugin propietario.
- Las subrutas específicas de capacidades, como `image-generation`,
  `media-understanding` y `speech`, existen porque los complementos integrados/nativos las
  utilizan hoy en día. Su presencia no significa por sí sola que cada asistente exportado sea un
  contrato externo congelado a largo plazo.

## Esquemas de herramientas de mensajes

Los complementos deben ser propietarios de las contribuciones del esquema `describeMessageTool(...)` específicas del canal. Mantenga los campos específicos del proveedor en el complemento, no en el núcleo compartido.

Para fragmentos de esquemas portátiles compartidos, reutilice los asistentes genéricos exportados a través de
`openclaw/plugin-sdk/channel-actions`:

- `createMessageToolButtonsSchema()` para cargas útiles de estilo de cuadrícula de botones
- `createMessageToolCardSchema()` para cargas útiles de tarjetas estructuradas

Si una forma de esquema solo tiene sentido para un proveedor, defínala en el código fuente de ese complemento
en lugar de promoverla al SDK compartido.

## Resolución de objetivos del canal

Los complementos del canal deben ser propietarios de la semántica de los objetivos específicos del canal. Mantenga el host
saliente compartido genérico y use la superficie del adaptador de mensajería para las reglas del proveedor:

- `messaging.inferTargetChatType({ to })` decide si un objetivo normalizado
  debe tratarse como `direct`, `group` o `channel` antes de la búsqueda en el directorio.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indica al núcleo si una
  entrada debe saltar directamente a la resolución similar a un id en lugar de a la búsqueda en el directorio.
- `messaging.targetResolver.resolveTarget(...)` es el respaldo del complemento cuando
  el núcleo necesita una resolución final propiedad del proveedor después de la normalización o después de
  un fallo en el directorio.
- `messaging.resolveOutboundSessionRoute(...)` es propietario de la construcción de la ruta de sesión específica del proveedor
  una vez que se resuelve un objetivo.

División recomendada:

- Use `inferTargetChatType` para decisiones de categoría que deben suceder antes
  de buscar pares/grupos.
- Use `looksLikeId` para comprobaciones de "tratar esto como un id de objetivo explícito/nativo".
- Use `resolveTarget` para el respaldo de normalización específico del proveedor, no para
  una búsqueda amplia en el directorio.
- Mantenga los ids nativos del proveedor como ids de chat, ids de hilos, JIDs, identificadores e ids
  de sala dentro de los valores `target` o parámetros específicos del proveedor, no en campos genéricos del SDK.

## Directorios respaldados por configuración

Los complementos que derivan entradas de directorio desde la configuración deben mantener esa lógica en el
complemento y reutilizar los asistentes compartidos de
`openclaw/plugin-sdk/directory-runtime`.

Use esto cuando un canal necesite pares/grupos respaldados por configuración, tales como:

- pares de MD impulsados por lista de permitidos
- mapas de canal/grupo configurados
- retiros de directorio estáticos con ámbito de cuenta

Los asistentes compartidos en `directory-runtime` solo manejan operaciones genéricas:

- filtrado de consultas
- aplicación de límites
- asistentes de deduplicación/normalización
- construcción de `ChannelDirectoryEntry[]`

La inspección de cuentas específicas del canal y la normalización de identificadores deben permanecer en la
implementación del complemento.

## Catálogos de proveedores

Los complementos de proveedor pueden definir catálogos de modelos para inferencia con
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma forma que OpenClaw escribe en
`models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento posee identificadores de modelo específicos del proveedor, valores predeterminados de URL base
o metadatos de modelo restringidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los
proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores simples de clave API o impulsados por entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedor relacionadas
- `late`: última pasada, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de claves, por lo que los complementos pueden anular intencionalmente una
entrada de proveedor integrada con el mismo id de proveedor.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado
- si se registran tanto `catalog` como `discovery`, OpenClaw usa `catalog`

## Inspección de canal de solo lectura

Si su complemento registra un canal, prefiera implementar
`plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de ejecución (runtime). Se permite asumir que las credenciales
  están totalmente materializadas y puede fallar rápidamente cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura como `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve` y los flujos de reparación
  de doctor/config no deberían necesitar materializar credenciales de ejecución solo para
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
  coincidente) es suficiente para los comandos de estilo estado.
- Use `configured_unavailable` cuando una credencial está configurada vía SecretRef pero
  no disponible en la ruta de comando actual.

Esto permite que los comandos de solo lectura reporten "configurado pero no disponible en esta ruta
de comando" en lugar de fallar o reportar erróneamente la cuenta como no configurada.

## Paquetes de paquetes

Un directorio de plugins puede incluir un `package.json` con `openclaw.extensions`:

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

Cada entrada se convierte en un plugin. Si el paquete lista múltiples extensiones, el id del plugin
se convierte en `name/<fileBase>`.

Si su plugin importa dependencias npm, instálelas en ese directorio para que
`node_modules` esté disponible (`npm install` / `pnpm install`).

Salvaguarda de seguridad: cada entrada `openclaw.extensions` debe permanecer dentro del directorio del plugin
después de la resolución de enlaces simbólicos. Las entradas que escapan del directorio del paquete son
rechazadas.

Nota de seguridad: `openclaw plugins install` instala las dependencias de los complementos con
`npm install --omit=dev --ignore-scripts` (sin scripts de ciclo de vida, sin dependencias de desarrollo en tiempo de ejecución). Mantenga los árboles de dependencias de los complementos como "JS/TS puro" y evite paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración.
Cuando OpenClaw necesita superficies de configuración para un complemento de canal deshabilitado, o
cuando un complemento de canal está habilitado pero aún sin configurar, carga `setupEntry`
en lugar de la entrada completa del complemento. Esto hace que el inicio y la configuración sean más ligeros
cuando la entrada principal de su complemento también conecta herramientas, enlaces u otro código exclusivo del tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
puede optar por que un complemento de canal siga la misma ruta `setupEntry` durante la fase de inicio previa a la escucha del gateway,
incluso cuando el canal ya está configurado.

Use esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir
antes de que el gateway comience a escuchar. En la práctica, esto significa que la entrada de configuración
debe registrar cada capacidad propiedad del canal de la cual depende el inicio, tales como:

- el registro del canal en sí
- cualquier ruta HTTP que debe estar disponible antes de que el gateway comience a escuchar
- cualquier método, herramienta o servicio del gateway que deba existir durante esa misma ventana

Si su entrada completa todavía posee alguna capacidad de inicio requerida, no habilite
esta opción. Mantenga el complemento en el comportamiento predeterminado y deje que OpenClaw cargue la
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

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación
del registro MPM). Coloque un archivo JSON en una de las siguientes ubicaciones:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas/punto y coma/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`. El analizador también acepta `"packages"` o `"plugins"` como alias heredados para la clave `"entries"`.

## Plugins del motor de contexto

Los plugins del motor de contexto poseen la orquestación del contexto de sesión para ingestión, ensamblaje
y compactación. Regístrelos desde su plugin con
`api.registerContextEngine(id, factory)`, luego seleccione el motor activo con
`plugins.slots.contextEngine`.

Use esto cuando su plugin necesite reemplazar o extender la canalización de contexto predeterminada en lugar de simplemente agregar búsqueda de memoria o enlaces.

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
   Decida qué comportamiento compartido debe poseer el núcleo: política, reserva, combinación de configuración,
   ciclo de vida, semántica orientada al canal y forma de ayuda en tiempo de ejecución.
2. agregar superficies de registro/tiempo de ejecución de plugin tipadas
   Extienda `OpenClawPluginApi` y/o `api.runtime` con la superficie de capacidad tipada
   más pequeña y útil.
3. conectar núcleo + consumidores de canal/características
   Los canales y plugins de características deben consumir la nueva capacidad a través del núcleo,
   no importando directamente una implementación de proveedor.
4. registrar implementaciones de proveedores
   Los plugins de proveedores luego registran sus servidores backend frente a la capacidad.
5. agregar cobertura de contrato
   Agregue pruebas para que la propiedad y la forma de registro permanezcan explícitas con el tiempo.

Así es como OpenClaw se mantiene con criterio sin volverse rígido a la visión del mundo de un
proveedor. Vea el [Libro de recetas de capacidades](/en/tools/capability-cookbook)
para una lista de verificación de archivos concreta y un ejemplo trabajado.

### Lista de verificación de capacidades

Cuando agrega una nueva capacidad, la implementación generalmente debe tocar estas
superfices juntas:

- tipos de contrato principal en `src/<capability>/types.ts`
- ayuda de ejecución/ejecutor principal en `src/<capability>/runtime.ts`
- superficie de registro de la API del plugin en `src/plugins/types.ts`
- cableado del registro de plugins en `src/plugins/registry.ts`
- exposición del runtime del plugin en `src/plugins/runtime/*` cuando los plugins de características/canales
  necesitan consumirlo
- ayudas de captura/prueba en `src/test-utils/plugin-registration.ts`
- aserciones de propiedad/contrato en `src/plugins/contracts/registry.ts`
- documentación del operador/plugin en `docs/`

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

- el núcleo es propietario del contrato de capacidad + orquestación
- los plugins de proveedores son propietarios de las implementaciones del proveedor
- los plugins de características/canales consumen las ayudas de tiempo de ejecución
- las pruebas de contrato mantienen la propiedad explícita
