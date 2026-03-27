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
  Esta es la **referencia de arquitectura profunda**. Para guías prácticas, consulte: - [Instalar y
  usar plugins](/es/tools/plugin) — guía de usuario - [Primeros pasos](/es/plugins/building-plugins)
  — primer tutorial de plugins - [Plugins de canal](/es/plugins/sdk-channel-plugins) — crear un
  canal de mensajería - [Plugins de proveedor](/es/plugins/sdk-provider-plugins) — crear un
  proveedor de modelos - [Resumen del SDK](/es/plugins/sdk-overview) — mapa de importación y API de
  registro
</Info>

Esta página cubre la arquitectura interna del sistema de plugins de OpenClaw.

## Modelo de capacidad pública

Las capacidades son el modelo de **plugin nativo** público dentro de OpenClaw. Cada
plugin nativo de OpenClaw se registra contra uno o más tipos de capacidad:

| Capacidad              | Método de registro                            | Plugins de ejemplo        |
| ---------------------- | --------------------------------------------- | ------------------------- |
| Inferencia de texto    | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| Voz                    | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| Comprensión de medios  | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| Generación de imágenes | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Búsqueda web           | `api.registerWebSearchProvider(...)`          | `google`                  |
| Canal / mensajería     | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

Un plugin que registra cero capacidades pero proporciona hooks, herramientas o
servicios es un plugin **legacy hook-only**. Ese patrón todavía es totalmente compatible.

### Postura de compatibilidad externa

El modelo de capacidades está establecido en el núcleo y es utilizado por los plugins empaquetados/nativos
hoy, pero la compatibilidad de plugins externos todavía necesita un estándar más estricto que "está
exportado, por lo tanto está congelado".

Orientación actual:

- **existing external plugins:** keep hook-based integrations working; treat
  this as the compatibility baseline
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
breakdown. See [CLI reference](/es/cli/plugins#inspect) for details.

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

| Signal                     | Meaning                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| **config valid**           | Config parses fine and plugins resolve                                        |
| **compatibility advisory** | El complemento utiliza un patrón compatible pero antiguo (p. ej. `hook-only`) |
| **advertencia de legado**  | El complemento utiliza `before_agent_start`, que está obsoleto                |
| **error grave**            | La configuración no es válida o el complemento no se pudo cargar              |

Ni `hook-only` ni `before_agent_start` romperán tu complemento hoy --
`hook-only` es solo advisory, y `before_agent_start` solo activa una advertencia. Estas
señales también aparecen en `openclaw status --all` y `openclaw plugins doctor`.

## Resumen de la arquitectura

El sistema de complementos de OpenClaw tiene cuatro capas:

1. **Manifiesto + descubrimiento**
   OpenClaw encuentra complementos candidatos desde las rutas configuradas, raíces del espacio de trabajo,
   raíces de extensiones globales y extensiones agrupadas. El descubrimiento lee los manifiestos nativos
   `openclaw.plugin.json` además de los manifiestos de paquetes compatibles primero.
2. **Habilitación + validación**
   Core decide si un complemento descubierto está habilitado, deshabilitado, bloqueado, o
   seleccionado para un espacio exclusivo como la memoria.
3. **Carga en tiempo de ejecución**
   Los complementos nativos de OpenClaw se cargan en proceso a través de jiti y registran
   capacidades en un registro central. Los paquetes compatibles se normalizan en
   registros del sistema sin importar código de tiempo de ejecución.
4. **Consumo superficial**
   El resto de OpenClaw lee el registro para exponer herramientas, canales, configuración
   de proveedores, ganchos, rutas HTTP, comandos CLI y servicios.

El límite de diseño importante:

- el descubrimiento + validación de configuración debería funcionar desde **metadatos de manifiesto/esquema**
  sin ejecutar código del complemento
- el comportamiento nativo en tiempo de ejecución proviene de la ruta `register(api)` del módulo del complemento

Esa división permite a OpenClaw validar la configuración, explicar complementos faltantes/deshabilitados y
construir sugerencias de interfaz/esquema antes de que el tiempo de ejecución completo esté activo.

### Complementos de canal y la herramienta de mensaje compartida

Los complementos de canal no necesitan registrar una herramienta de envío/edición/reacción separada para
las acciones de chat normales. OpenClaw mantiene una herramienta `message` compartida en core, y
los complementos de canal son propietarios del descubrimiento y ejecución específicos del canal detrás de ella.

El límite actual es:

- core posee el host de la herramienta `message` compartida, cableado de indicaciones, contabilidad de
  sesión/hilo y despacho de ejecución
- los complementos del canal son propietarios del descubrimiento de acciones con alcance, el descubrimiento de capacidades y cualquier fragmento de esquema específico del canal
- los complementos del canal ejecutan la acción final a través de su adaptador de acción

Para los complementos del canal, la superficie del SDK es `ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento unificada permite que un complemento devuelva sus acciones visibles, capacidades y contribuciones de esquema juntas para que esas piezas no se separen.

Core pasa el alcance de tiempo de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- entrada confiable `requesterSenderId`

Esto es importante para los complementos sensibles al contexto. Un canal puede ocultar o exponer acciones de mensajes basándose en la cuenta activa, la sala/hilo/mensaje actual o la identidad del solicitante de confianza sin codificar ramas específicas del canal en la herramienta `message` de Core.

Por eso los cambios de enrutamiento del ejecutor integrado siguen siendo trabajo del complemento: el ejecutor es responsable de reenviar la identidad del chat/sesión actual al límite de descubrimiento del complemento para que la herramienta compartida `message` exponga la superficie propiedad del canal correcta para el turno actual.

Para los asistentes de ejecución propiedad del canal, los complementos empaquetados deben mantener el tiempo de ejecución de ejecución dentro de sus propios módulos de extensión. Core ya no posee los tiempos de ejecución de acciones de mensajes de Discord, Slack, Telegram o WhatsApp bajo `src/agents/tools`. No publicamos subrutas `plugin-sdk/*-action-runtime` separadas, y los complementos empaquetados deben importar su propio código de tiempo de ejecución local directamente desde sus módulos propiedad de la extensión.

Para las encuestas específicamente, hay dos rutas de ejecución:

- `outbound.sendPoll` es la base compartida para los canales que se ajustan al modelo de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para la semántica de encuesta específica del canal o parámetros de encuesta adicionales

Core ahora difiere el análisis compartido de encuestas hasta después de que el despacho de encuestas del complemento decline la acción, para que los controladores de encuestas propiedad del complemento puedan aceptar campos de encuesta específicos del canal sin ser bloqueados primero por el analizador de encuestas genérico.

Consulte [Canalización de carga](#load-pipeline) para obtener la secuencia de inicio completa.

## Modelo de propiedad de capacidades

OpenClaw trata un complemento nativo como el límite de propiedad de una **empresa** o una **característica**, no como un cajón de sastre de integraciones no relacionadas.

Esto significa:

- un complemento de empresa generalmente debe ser propietario de todas las superficies orientadas a OpenClaw de esa empresa
- un complemento de características generalmente debe ser propietario de la superficie completa de la característica que introduce
- los canales deben consumir capacidades centrales compartidas en lugar de volver a implementar el comportamiento del proveedor ad hoc

Ejemplos:

- el complemento incluido `openai` es propietario del comportamiento del proveedor de modelos de OpenAI y el comportamiento de voz + comprensión de medios + generación de imágenes de OpenAI
- el complemento incluido `elevenlabs` es propietario del comportamiento de voz de ElevenLabs
- el complemento incluido `microsoft` es propietario del comportamiento de voz de Microsoft
- el complemento incluido `google` es propietario del comportamiento del proveedor de modelos de Google, además del comportamiento de comprensión de medios + generación de imágenes + búsqueda web de Google
- los complementos incluidos `minimax`, `mistral`, `moonshot` y `zai` son propietarios de sus respectivos backends de comprensión de medios
- el complemento `voice-call` es un complemento de características: es propietario del transporte de llamadas, herramientas, CLI, rutas y tiempo de ejecución, pero consume la capacidad central TTS/STT en lugar de inventar una segunda pila de voz

El estado final previsto es:

- OpenAI vive en un solo complemento incluso si abarca modelos de texto, voz, imágenes y video futuro
- otro proveedor puede hacer lo mismo con su propia área de superficie
- a los canales no les importa qué complemento de proveedor es el propietario del proveedor; ellos consumen el contrato de capacidad compartida expuesto por el núcleo

Esta es la distinción clave:

- **complemento** = límite de propiedad
- **capacidad** = contrato central que varios complementos pueden implementar o consumir

Por lo tanto, si OpenClaw agrega un nuevo dominio como el video, la primera pregunta no es "¿qué proveedor debería codificar el manejo de video?". La primera pregunta es "¿cuál es el contrato de capacidad de video central?". Una vez que ese contrato existe, los complementos de proveedores pueden registrarse en él y los complementos de canal/características pueden consumirlo.

Si la capacidad aún no existe, la medida correcta suele ser:

1. definir la capacidad que falta en el núcleo
2. exponerla a través de la API/tiempo de ejecución del complemento de forma tipada
3. conectar canales/características contra esa capacidad
4. permitir que los complementos de proveedores registren implementaciones

Esto mantiene la propiedad explícita evitando al mismo tiempo un comportamiento central que dependa de un solo proveedor o una ruta de código específica de un complemento única.

### Capas de capacidad

Use este modelo mental al decidir a dónde pertenece el código:

- **capa de capacidad central**: orquestación compartida, políticas, mecanismos de reserva, reglas de fusión de configuración, semántica de entrega y contratos tipados
- **capa de complemento de proveedor**: APIs específicas del proveedor, autenticación, catálogos de modelos, síntesis de voz, generación de imágenes, backends de video futuros, puntos de conexión de uso
- **capa de complemento de canal/característica**: integración Slack/Discord/llamada de voz/etc. que consume capacidades centrales y las presenta en una superficie

Por ejemplo, TTS sigue esta forma:

- el núcleo posee la política de TTS en el momento de la respuesta, el orden de reserva, las preferencias y la entrega por canal
- `openai`, `elevenlabs` y `microsoft` son propietarios de las implementaciones de síntesis
- `voice-call` consume el asistente de tiempo de ejecución de TTS de telefonía

Ese mismo patrón debe preferirse para capacidades futuras.

### Ejemplo de complemento de empresa con múltiples capacidades

Un complemento de empresa debe sentirse cohesivo desde el exterior. Si OpenClaw tiene contratos compartidos para modelos, voz, comprensión de medios y búsqueda web, un proveedor puede ser propietario de todas sus superficies en un solo lugar:

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

Lo que importa no son los nombres exactos de los asistentes. La forma importa:

- un complemento posee la superficie del proveedor
- el núcleo sigue siendo propietario de los contratos de capacidad
- los canales y los complementos de características consumen asistentes `api.runtime.*`, no código de proveedor
- las pruebas de contrato pueden afirmar que el complemento registró las capacidades que afirma poseer

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad compartida. El mismo modelo de propiedad se aplica allí:

1. el núcleo define el contrato de comprensión de medios
2. los complementos de proveedores registran `describeImage`, `transcribeAudio` y `describeVideo` según corresponda
3. los canales y los complementos de características consumen el comportamiento central compartido en lugar de conectarse directamente al código del proveedor

Eso evita incorporar los supuestos de vídeo de un proveedor en el núcleo. El complemento posee la superficie del proveedor; el núcleo posee el contrato de capacidad y el comportamiento de reserva.

Si OpenClaw añade un nuevo dominio más adelante, como la generación de vídeo, use la misma secuencia nuevamente: defina primero la capacidad central y luego deje que los complementos de proveedores registren implementaciones contra ella.

¿Necesita una lista de verificación de implementación concreta? Vea [Capability Cookbook](/es/tools/capability-cookbook).

## Contratos y cumplimiento

La superficie de la API del complemento se escribe y centraliza intencionalmente en `OpenClawPluginApi`. Ese contrato define los puntos de registro admitidos y las herramientas de ejecución en las que un complemento puede confiar.

Por qué esto importa:

- los autores de complementos obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos complementos registrando la misma id de proveedor
- el inicio puede mostrar diagnósticos procesables para registros con formato incorrecto
- las pruebas de contrato pueden hacer cumplir la propiedad del complemento empaquetado y evitar desviaciones silenciosas

Hay dos capas de cumplimiento:

1. **cumplimiento del registro en tiempo de ejecución**
   El registro de complementos valida los registros a medida que se cargan los complementos. Ejemplos:
   las id de proveedor duplicadas, las id de proveedor de voz duplicadas y los registros con formato incorrecto producen diagnósticos de complementos en lugar de un comportamiento indefinido.
2. **pruebas de contrato**
   Los complementos empaquetados se capturan en registros de contratos durante las ejecuciones de pruebas para que OpenClaw pueda afirmar la propiedad explícitamente. Hoy se usa para proveedores de modelos, proveedores de voz, proveedores de búsqueda web y propiedad de registros empaquetados.

El efecto práctico es que OpenClaw sabe, de antemano, qué complemento posee qué superficie. Eso permite que el núcleo y los canales se componan perfectamente porque la propiedad se declara, se escribe y es comprobable en lugar de implícita.

### Qué pertenece a un contrato

Los buenos contratos de complementos son:

- escritos
- pequeños
- específicos de la capacidad
- propiedad del núcleo
- reutilizables por múltiples complementos
- consumibles por canales/características sin conocimiento del proveedor

Los malos contratos de complementos son:

- política específica del proveedor oculta en el núcleo
- escapadas de complementos únicas que omiten el registro
- código de canal que accede directamente a una implementación de proveedor
- objetos de ejecución ad hoc que no forman parte de `OpenClawPluginApi` o
  `api.runtime`

En caso de duda, eleve el nivel de abstracción: defina primero la capacidad y luego
permita que los complementos se conecten a ella.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en el mismo proceso** que la Gateway. No están
en sandbox. Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que
el código central.

Implicaciones:

- un complemento nativo puede registrar herramientas, controladores de red, enlaces y servicios
- un error en un complemento nativo puede bloquear o desestabilizar la puerta de enlace
- un complemento nativo malicioso es equivalente a la ejecución de código arbitrario dentro
  del proceso OpenClaw

Los paquetes compatibles son más seguros de forma predeterminada porque OpenClaw actualmente los trata
como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades
incluidas (bundled skills).

Use listas de permitidos (allowlists) y rutas de instalación/carga explícitas para complementos no incluidos. Trate
los complementos del espacio de trabajo como código en tiempo de desarrollo, no como valores predeterminados de producción.

Para los nombres de paquetes del espacio de trabajo incluidos, mantenga el identificador del complemento anclado al nombre
npm: `@openclaw/<id>` de forma predeterminada, o un sufijo de tipo aprobado como
`-provider`, `-plugin`, `-speech`, `-sandbox`, o `-media-understanding` cuando
el paquete expone intencionalmente un rol de complemento más estrecho.

Nota importante de confianza:

- `plugins.allow` confía en los **identificadores de complemento**, no en el origen del código.
- Un complemento del espacio de trabajo con el mismo identificador que un complemento incluido oculta intencionalmente
  la copia incluida cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, las pruebas de parches y las revisiones urgentes.

## Límite de exportación

OpenClaw exporta capacidades, no conveniencias de implementación.

Mantenga el registro de capacidades público. Elimine las exportaciones auxiliares que no sean parte del contrato:

- subrutas auxiliares específicas del complemento incluido
- subrutas de conexión (plumbing) en tiempo de ejecución no destinadas a ser API pública
- ayudantes de conveniencia específicos del proveedor
- ayudantes de configuración/integración que son detalles de implementación

## Canal de carga

Al iniciar, OpenClaw hace aproximadamente esto:

1. descubrir raíces de complementos candidatas
2. leer manifiestos nativos o de paquetes compatibles y metadatos de paquetes
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación para cada candidato
6. cargar módulos nativos habilitados a través de jiti
7. llamar a los ganchos `register(api)` nativos y recopilar los registros en el registro de complementos
8. exponer el registro a las superficies de comandos/tiempo de ejecución

Los mecanismos de seguridad ocurren **antes** de la ejecución del tiempo de ejecución. Los candidatos se bloquean
cuando la entrada escapa de la raíz del complemento, la ruta es de escritura mundial, o la propiedad
de la ruta parece sospechosa para complementos no empaquetados.

### Comportamiento basado primero en el manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo utiliza para:

- identificar el complemento
- descubrir canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- mejorar las etiquetas/marcadores de posición de la Interfaz de Control
- mostrar metadatos de instalación/catálogo

Para los complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra
el comportamiento real, como ganchos, herramientas, comandos o flujos de proveedor.

### Lo que almacena en caché el cargador

OpenClaw mantiene cachés cortos en el proceso para:

- resultados del descubrimiento
- datos del registro de manifiestos
- registros de complementos cargados

Estos cachés reducen la carga de inicio intermitente y la sobrecarga de comandos repetidos. Es seguro
considerarlos como cachés de rendimiento a corto plazo, no como persistencia.

Nota de rendimiento:

- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o
  `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para deshabilitar estos cachés.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y
  `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Modelo de registro

Los complementos cargados no mutan directamente globales centrales aleatorios. Se registran en un
registro central de complementos.

El registro realiza un seguimiento de:

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

Las funciones centrales luego leen de ese registro en lugar de comunicarse con los módulos del complemento
directamente. Esto mantiene la carga en una sola dirección:

- módulo del complemento -> registro de registro
- tiempo de ejecución central -> consumo del registro

Esa separación es importante para el mantenimiento. Significa que la mayoría de las superficies principales solo necesitan un punto de integración: "leer el registro", en lugar de "casos especiales para cada módulo de complemento".

## Devoluciones de llamada de vinculación de conversación

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
- `request`: el resumen de la solicitud original, pista de separación, identificador del remitente y metadatos de la conversación

Esta devolución de llamada es solo de notificación. No cambia quién tiene permiso para vincular una conversación y se ejecuta después de que finaliza el manejo de aprobaciones principales.

## Ganchos de tiempo de ejecución del proveedor

Los complementos del proveedor ahora tienen dos capas:

- metadatos del manifiesto: `providerAuthEnvVars` para una búsqueda barata de autenticación de entorno antes de la carga en tiempo de ejecución, más `providerAuthChoices` para etiquetas baratas de incorporación/elección de autenticación y metadatos de indicadores de CLI antes de la carga en tiempo de ejecución
- ganchos de tiempo de configuración: `catalog` / `discovery` heredados
- ganchos de tiempo de ejecución: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw sigue siendo propietario del bucle de agente genérico, la conmutación por error, el manejo de transcripciones y la política de herramientas. Estos hooks son la superficie de extensión para comportamientos específicos del proveedor sin necesidad de un transporte de inferencia personalizado completo.

Use el manifiesto `providerAuthEnvVars` cuando el proveedor tenga credenciales basadas en variables de entorno que las rutas genéricas de auth/status/model-picker deban ver sin cargar el runtime del complemento. Use el manifiesto `providerAuthChoices` cuando las superficies de CLI de onboarding/auth-choice deban conocer el id de elección del proveedor, las etiquetas de grupo y el cableado de autenticación de un solo indicador simple sin cargar el runtime del proveedor. Mantenga el runtime del proveedor `envVars` para sugerencias orientadas al operador, como etiquetas de incorporación o variables de configuración de client-id/client-secret de OAuth.

### Orden y uso de los hooks

Para los complementos de modelo/proveedor, OpenClaw llama a los hooks en este orden aproximado. La columna "Cuándo usar" es la guía de decisión rápida.

| #   | Hook                             | Lo que hace                                                                                                                 | Cuándo usar                                                                                                                     |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                        | Publicar la configuración del proveedor en `models.providers` durante la generación de `models.json`                        | El proveedor posee un catálogo o valores predeterminados de URL base                                                            |
| --  | _(búsqueda de modelo integrada)_ | OpenClaw intenta primero la ruta normal de registro/catálogo                                                                | _(no es un hook de complemento)_                                                                                                |
| 2   | `resolveDynamicModel`            | Respaldo síncrono para ids de modelo propiedad del proveedor que aún no están en el registro local                          | El proveedor acepta ids de modelo ascendentes arbitrarios                                                                       |
| 3   | `prepareDynamicModel`            | Calentamiento asíncrono, luego `resolveDynamicModel` se ejecuta nuevamente                                                  | El proveedor necesita metadatos de red antes de resolver ids desconocidos                                                       |
| 4   | `normalizeResolvedModel`         | Reescritura final antes de que el ejecutor integrado use el modelo resuelto                                                 | El proveedor necesita reescrituras de transporte pero aún usa un transporte central                                             |
| 5   | `capabilities`                   | Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida                 | El proveedor necesita peculiaridades de transcripción/familia de proveedores                                                    |
| 6   | `prepareExtraParams`             | Normalización de parámetros de solicitud antes de los contenedores de opciones de secuencia genéricos                       | El proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor                            |
| 7   | `wrapStreamFn`                   | Contenedor de secuencia después de que se aplican los contenedores genéricos                                                | El proveedor necesita contenedores de compatibilidad de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado  |
| 8   | `formatApiKey`                   | Formateador de perfil de autenticación: el perfil almacenado se convierte en la cadena `apiKey` en tiempo de ejecución      | El proveedor almacena metadatos de autenticación adicionales y necesita una forma de token de tiempo de ejecución personalizada |
| 9   | `refreshOAuth`                   | Invalidación de actualización de OAuth para endpoints de actualización personalizados o política de fallas de actualización | El proveedor no se ajusta a los actualizadores `pi-ai` compartidos                                                              |
| 10  | `buildAuthDoctorHint`            | Sugerencia de reparación añadida cuando falla la actualización de OAuth                                                     | El proveedor necesita orientación de reparación de autenticación propiedad del proveedor después de una falla de actualización  |
| 11  | `isCacheTtlEligible`             | Política de caché de aviso para proveedores de proxy/backhaul                                                               | El proveedor necesita una compuerta TTL de caché específica del proxy                                                           |
| 12  | `buildMissingAuthMessage`        | Reemplazo del mensaje genérico de recuperación de autenticación faltante                                                    | El proveedor necesita una sugerencia de recuperación de autenticación faltante específica del proveedor                         |
| 13  | `suppressBuiltInModel`           | Supresión de modelo obsoleto ascendente más sugerencia opcional de error para el usuario                                    | El proveedor necesita ocultar filas obsoletas ascendentes o reemplazarlas con una sugerencia del proveedor                      |
| 14  | `augmentModelCatalog`            | Filas sintéticas/finales del catálogo añadidas después del descubrimiento                                                   | El proveedor necesita filas de compatibilidad hacia adelante sintéticas en `models list` y selectores                           |
| 15  | `isBinaryThinking`               | Interruptor de razonado activado/desactivado para proveedores de pensamiento binario                                        | El proveedor expone solo el pensamiento binario activado/desactivado                                                            |
| 16  | `supportsXHighThinking`          | Soporte de razonado `xhigh` para modelos seleccionados                                                                      | El proveedor desea `xhigh` solo en un subconjunto de modelos                                                                    |
| 17  | `resolveDefaultThinkingLevel`    | Nivel `/think` predeterminado para una familia de modelos específica                                                        | El proveedor posee la política `/think` predeterminada para una familia de modelos                                              |
| 18  | `isModernModelRef`               | Comparador de modelos modernos para filtros de perfil en vivo y selección de humo                                           | El proveedor posee la coincidencia del modelo preferido en vivo/de humo                                                         |
| 19  | `prepareRuntimeAuth`             | Intercambiar una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia         | El proveedor necesita un intercambio de token o una credencial de solicitud de corta duración                                   |
| 20  | `resolveUsageAuth`               | Resolver las credenciales de uso/facturación para `/usage` y las superficies de estado relacionadas                         | El proveedor necesita un análisis personalizado de tokens de uso/cuota o una credencial de uso diferente                        |
| 21  | `fetchUsageSnapshot`             | Obtener y normalizar las instantáneas de uso/cuota específicas del proveedor después de resolver la autenticación           | El proveedor necesita un punto final de uso o un analizador de carga útil específico del proveedor                              |

Si el proveedor necesita un protocolo de cable completamente personalizado o un ejecutor de solicitudes personalizado,
esa es una clase diferente de extensión. Estos ganchos son para el comportamiento del proveedor
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
  hacia adelante de Claude 4.6, sugerencias de familia de proveedores, orientación de reparación de autenticación, integración
  del punto final de uso, elegibilidad de caché de indicaciones y la política de pensamiento
  predeterminada/adaptativa de Claude.
- OpenAI usa `resolveDynamicModel`, `normalizeResolvedModel` y
  `capabilities` además de `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` y `isModernModelRef`
  porque posee la compatibilidad hacia adelante de GPT-5.4, la normalización directa de OpenAI
  `openai-completions` -> `openai-responses`, sugerencias de autenticación
  conscientes de Codex, supresión de Spark, filas de lista sintéticas de OpenAI y la política de pensamiento
  de GPT-5 / modelo en vivo.
- OpenRouter usa `catalog` además de `resolveDynamicModel` y
  `prepareDynamicModel` porque el proveedor es de paso y puede exponer nuevos
  ids de modelo antes de las actualizaciones del catálogo estático de OpenClaw; también usa
  `capabilities`, `wrapStreamFn` y `isCacheTtlEligible` para mantener
  los encabezados de solicitud específicos del proveedor, metadatos de enrutamiento, parches de razonamiento y la
  política de caché de indicaciones fuera del núcleo.
- GitHub Copilot utiliza `catalog`, `auth`, `resolveDynamicModel` y
  `capabilities` además de `prepareRuntimeAuth` y `fetchUsageSnapshot` porque
  necesita inicio de sesión de dispositivo propiedad del proveedor, comportamiento de respaldo del modelo,
  particularidades de las transcripciones de Claude, un intercambio de token de GitHub -> token de Copilot
  y un endpoint de uso propiedad del proveedor.
- OpenAI Codex utiliza `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` y `augmentModelCatalog` además de
  `prepareExtraParams`, `resolveUsageAuth` y `fetchUsageSnapshot` porque
  todavía se ejecuta en transportes principales de OpenAI pero posee su propia normalización de transporte
  / URL base, política de respaldo de actualización de OAuth, elección de transporte predeterminado,
  filas sintéticas del catálogo de Codex e integración del endpoint de uso de ChatGPT.
- Google AI Studio y Gemini CLI OAuth utilizan `resolveDynamicModel` y
  `isModernModelRef` porque son propietarios del respaldo de compatibilidad futura de Gemini 3.1
  y la coincidencia de modelos modernos; Gemini CLI OAuth también utiliza `formatApiKey`,
  `resolveUsageAuth` y `fetchUsageSnapshot` para el formato de token, el análisis
  de token y la conexión del endpoint de cuota.
- Moonshot utiliza `catalog` además de `wrapStreamFn` porque todavía utiliza el
  transporte compartido de OpenAI pero necesita normalización de carga útil de pensamiento propiedad del
  proveedor.
- Kilocode utiliza `catalog`, `capabilities`, `wrapStreamFn` y
  `isCacheTtlEligible` porque necesita encabezados de solicitud propiedad del proveedor,
  normalización de carga útil de razonamiento, sugerencias de transcripción de Gemini y control de
  caché-TTL de Anthropic.
- Z.AI usa `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` y `fetchUsageSnapshot` porque posee el respaldo de GLM-5,
  los valores predeterminados de `tool_stream`, la UX de pensamiento binario, la coincidencia de modelos modernos y tanto la autenticación de uso como la obtención de cuotas.
- Mistral, OpenCode Zen y OpenCode Go usan `capabilities` únicamente para mantener
  las peculiaridades de transcripción/herramientas fuera del núcleo.
- Los proveedores integrados solo en el catálogo, como `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` usan
  solo `catalog`.
- El portal de Qwen usa `catalog`, `auth` y `refreshOAuth`.
- MiniMax y Xiaomi usan `catalog` además de hooks de uso porque su comportamiento `/usage`
  es propiedad del complemento aunque la inferencia aún se ejecuta a través de los
  transportes compartidos.

## Ayudantes de tiempo de ejecución

Los complementos pueden acceder a ciertos ayudantes del núcleo a través de `api.runtime`. Para TTS:

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

- `textToSpeech` devuelve la carga útil de salida TTS del núcleo normal para superficies de archivo/nota de voz.
- Usa la configuración `messages.tts` del núcleo y la selección de proveedor.
- Devuelve el búfer de audio PCM + la frecuencia de muestreo. Los complementos deben volver a muestrear/codificar para los proveedores.
- `listVoices` es opcional por proveedor. Úselo para selectores de voz o flujos de configuración propiedad del proveedor.
- Las listas de voces pueden incluir metadatos más ricos, como configuración regional, género y etiquetas de personalidad, para selectores con conocimiento del proveedor.
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

- Mantenga la política de TTS, la reserva y la entrega de respuestas en el núcleo.
- Use proveedores de voz para el comportamiento de síntesis propiedad del proveedor.
- La entrada `edge` de Microsoft heredada se normaliza al id de proveedor `microsoft`.
- El modelo de propiedad preferido está orientado a la empresa: un complemento de proveedor puede ser propietario de proveedores de texto, voz, imagen y medios futuros a medida que OpenClaw agregue esos contratos de capacidad.

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

- Mantenga la orquestación, la reserva, la configuración y el cableado del canal en el núcleo.
- Mantenga el comportamiento del proveedor en el complemento del proveedor.
- La expansión aditiva debe permanecer tipada: nuevos métodos opcionales, nuevos campos de resultados opcionales, nuevas capacidades opcionales.
- Si OpenClaw agrega una nueva capacidad como la generación de video más adelante, defina primero el contrato de capacidad central y luego permita que los complementos de proveedores se registren contra él.

Para los asistentes de ejecución de comprensión de medios, los complementos pueden llamar:

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
  la comprensión de imagen/audio/video.
- Usa la configuración de audio de comprensión de medios central (`tools.media.audio`) y el orden de reserva del proveedor.
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

- `provider` y `model` son anulaciones opcionales por ejecución, no cambios de sesión persistentes.
- OpenClaw solo honra esos campos de anulación para llamadores de confianza.
- Para las ejecuciones de reserva propiedad del complemento, los operadores deben optar con `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Use `plugins.entries.<id>.subagent.allowedModels` para restringir los complementos de confianza a objetivos `provider/model` canónicos específicos, o `"*"` para permitir cualquier objetivo explícitamente.
- Las ejecuciones de subagentes de complementos que no son de confianza aún funcionan, pero las solicitudes de anulación se rechazan en lugar de realizar una reserva silenciosa.

Para la búsqueda web, los plugins pueden consumir el asistente de tiempo de ejecución compartido en lugar de acceder al cableado de herramientas del agente:

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

- Mantenga la selección del proveedor, la resolución de credenciales y la semántica de solicitud compartida en el núcleo.
- Use proveedores de búsqueda web para transportes de búsqueda específicos del proveedor.
- `api.runtime.webSearch.*` es la superficie compartida preferida para los plugins de características/canales que necesitan comportamiento de búsqueda sin depender del contenedor de herramientas del agente.

## Rutas HTTP de la puerta de enlace

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

- `path`: ruta de acceso bajo el servidor HTTP de la puerta de enlace.
- `auth`: obligatorio. Use `"gateway"` para requerir la autenticación normal de la puerta de enlace, o `"plugin"` para la autenticación administrada por el plugin/verificación de webhooks.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo plugin reemplace su propio registro de ruta existente.
- `handler`: devuelva `true` cuando la ruta haya manejado la solicitud.

Notas:

- `api.registerHttpHandler(...)` está obsoleto. Use `api.registerHttpRoute(...)`.
- Las rutas de los plugins deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un plugin no puede reemplazar la ruta de otro plugin.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantenga las cadenas de paso a través de `exact`/`prefix` solo en el mismo nivel de autenticación.

## Rutas de importación del SDK de plugins

Use subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` al crear plugins:

- `openclaw/plugin-sdk/plugin-entry` para primitivas de registro de plugins.
- `openclaw/plugin-sdk/core` para el contrato compartido genérico orientado al plugin.
- Primitivas de canal estables como `openclaw/plugin-sdk/channel-setup`,
  `openclaw/plugin-sdk/channel-pairing`,
  `openclaw/plugin-sdk/channel-contract`,
  `openclaw/plugin-sdk/channel-feedback`,
  `openclaw/plugin-sdk/channel-inbound`,
  `openclaw/plugin-sdk/channel-lifecycle`,
  `openclaw/plugin-sdk/channel-reply-pipeline`,
  `openclaw/plugin-sdk/command-auth`,
  `openclaw/plugin-sdk/secret-input` y
  `openclaw/plugin-sdk/webhook-ingress` para la configuración compartida/autenticación/respuesta/webhook
  wiring. `channel-inbound` es el hogar compartido para debounce, coincidencia de menciones,
  formato de sobres y asistentes de contexto de sobres entrantes.
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
  El código nuevo debe importar las primitivas más estrechas en su lugar.
- Los internos de las extensiones empaquetadas permanecen privados. Los plugins externos deben usar solo
  `openclaw/plugin-sdk/*` subrutas. El código principal/prueba de OpenClaw puede usar los puntos de entrada
  públicos del repositorio bajo `extensions/<id>/index.js`, `api.js`, `runtime-api.js`,
  `setup-entry.js` y archivos de alcance estrecho como `login-qr-api.js`. Nunca
  importar `extensions/<id>/src/*` desde el núcleo o desde otra extensión.
- División del punto de entrada del repositorio:
  `extensions/<id>/api.js` es el barril de tipos/asistentes,
  `extensions/<id>/runtime-api.js` es el barril de solo tiempo de ejecución,
  `extensions/<id>/index.js` es la entrada del plugin empaquetado,
  y `extensions/<id>/setup-entry.js` es la entrada del plugin de configuración.
- No quedan subrutas públicas con marca de canal empaquetadas. Los asistentes específicos del canal y
  costuras de tiempo de ejecución viven bajo `extensions/<id>/api.js` y `extensions/<id>/runtime-api.js`;
  el contrato público del SDK son las primitivas compartidas genéricas en su lugar.

Nota de compatibilidad:

- Evite el barril raíz `openclaw/plugin-sdk` para código nuevo.
- Prefiera primero las primitivas estrechas y estables. Las nuevas subrutas setup/pairing/reply/
  feedback/contract/inbound/threading/command/secret-input/webhook/infra/
  allowlist/status/message-tool son el contrato previsto para nuevo
  trabajo de complementos empaquetados y externos.
  El análisis/emparejamiento de objetivos pertenece a `openclaw/plugin-sdk/channel-targets`.
  Las puertas de acción de mensaje y los auxiliares de ID de mensaje de reacción pertenecen a
  `openclaw/plugin-sdk/channel-actions`.
- Los barriles auxiliares específicos de extensiones empaquetadas no son estables por defecto. Si un
  auxiliar solo es necesario para una extensión empaquetada, manténgalo detrás de la costura local `api.js` o `runtime-api.js` de la extensión en lugar de promoverlo a
  `openclaw/plugin-sdk/<extension>`.
- Las barras empaquetadas con marca de canal permanecen privadas a menos que se agreguen explícitamente
  de nuevo al contrato público.
- Las subrutas específicas de capacidades como `image-generation`,
  `media-understanding` y `speech` existen porque los complementos empaquetados/nativos las usan
  hoy. Su presencia no significa por sí misma que cada auxiliar exportado sea un
  contrato externo congelado a largo plazo.

## Esquemas de herramientas de mensaje

Los complementos deben ser propietarios de las contribuciones del esquema `describeMessageTool(...)` específicas del canal.
Mantenga los campos específicos del proveedor en el complemento, no en el núcleo compartido.

Para fragmentos de esquemas portátiles compartidos, reutilice los auxiliares genéricos exportados a través de
`openclaw/plugin-sdk/channel-actions`:

- `createMessageToolButtonsSchema()` para cargas útiles estilo cuadrícula de botones
- `createMessageToolCardSchema()` para cargas útiles de tarjetas estructuradas

Si una forma de esquema solo tiene sentido para un proveedor, defínala en el código fuente de ese complemento
en lugar de promoverla al SDK compartido.

## Resolución de objetivos de canal

Los complementos de canal deben ser propietarios de la semántica de objetivos específicos del canal. Mantenga el host
de salida compartido genérico y use la superficie del adaptador de mensajería para las reglas del proveedor:

- `messaging.inferTargetChatType({ to })` decide si un objetivo normalizado
  debe tratarse como `direct`, `group` o `channel` antes de la búsqueda en el directorio.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indica al núcleo si una entrada debe saltar directamente a la resolución similar a un ID en lugar de la búsqueda en el directorio.
- `messaging.targetResolver.resolveTarget(...)` es el recurso alternativo del complemento cuando el núcleo necesita una resolución final propiedad del proveedor después de la normalización o después de un fallo en el directorio.
- `messaging.resolveOutboundSessionRoute(...)` es propietario de la construcción de la ruta de sesión específica del proveedor una vez que se resuelve un destino.

División recomendada:

- Use `inferTargetChatType` para decisiones de categoría que deben ocurrir antes de buscar pares/grupos.
- Use `looksLikeId` para las comprobaciones de "tratar esto como un ID de destino explícito/nativo".
- Use `resolveTarget` para el recurso alternativo de normalización específico del proveedor, no para una búsqueda amplia en el directorio.
- Mantenga los IDs nativos del proveedor, como los IDs de chat, IDs de hilo, JIDs, identificadores e IDs de sala, dentro de los valores de `target` o parámetros específicos del proveedor, no en campos genéricos del SDK.

## Directorios respaldados por configuración

Los complementos que derivan entradas de directorio de la configuración deben mantener esa lógica en el complemento y reutilizar los asistentes compartidos de `openclaw/plugin-sdk/directory-runtime`.

Use esto cuando un canal necesite pares/grupos respaldados por configuración, tales como:

- pares de DM impulsados por una lista de permitidos
- mapas de canal/grupo configurados
- recursos alternativos de directorio estático con alcance de cuenta

Los asistentes compartidos en `directory-runtime` solo manejan operaciones genéricas:

- filtrado de consultas
- aplicación de límites
- asistentes de deduplicación/normalización
- construcción de `ChannelDirectoryEntry[]`

La inspección de cuenta específica del canal y la normalización de ID deben permanecer en la implementación del complemento.

## Catálogos de proveedores

Los complementos del proveedor pueden definir catálogos de modelos para inferencia con `registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma forma que OpenClaw escribe en `models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento posee IDs de modelos específicos del proveedor, valores predeterminados de URL base o metadatos de modelo restringidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores basados en API key simple o variables de entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedor relacionadas
- `late`: última pasada, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de claves, por lo que los complementos pueden anular intencionalmente una entrada de proveedor integrada con el mismo id de proveedor.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado
- si se registran tanto `catalog` como `discovery`, OpenClaw usa `catalog`

## Inspección de canal de solo lectura

Si su complemento registra un canal, se prefieren implementar `plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de tiempo de ejecución. Se permite asumir que las credenciales están completamente materializadas y puede fallar rápido cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura como `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, y los flujos de reparación doctor/config no deberían necesitar materializar credenciales de tiempo de ejecución solo para describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devuelva solo el estado descriptivo de la cuenta.
- Conserve `enabled` y `configured`.
- Incluya campos de origen/estado de credenciales cuando sea relevante, tales como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No necesita devolver valores de token sin procesar solo para reportar disponibilidad de solo lectura. Devolver `tokenStatus: "available"` (y el campo de origen coincidente) es suficiente para los comandos de estilo de estado.
- Use `configured_unavailable` cuando una credencial esté configurada a través de SecretRef pero no disponible en la ruta de comando actual.

Esto permite que los comandos de solo lectura informen "configurado pero no disponible en esta ruta de comando" en lugar de bloquearse o informar erróneamente que la cuenta no está configurada.

## Paquetes de complementos

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

Cada entrada se convierte en un complemento. Si el paquete enumera múltiples extensiones, el id del complemento se convierte en `name/<fileBase>`.

Si su complemento importa dependencias de npm, instálelas en ese directorio para que `node_modules` esté disponible (`npm install` / `pnpm install`).

Salvaguarda de seguridad: cada entrada `openclaw.extensions` debe permanecer dentro del directorio del complemento después de resolver los enlaces simbólicos. Se rechazan las entradas que salen del directorio del paquete.

Nota de seguridad: `openclaw plugins install` instala las dependencias del complemento con `npm install --ignore-scripts` (sin scripts de ciclo de vida). Mantenga los árboles de dependencias del complemento como "JS/TS puro" y evite paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración. Cuando OpenClaw necesita superficies de configuración para un complemento de canal deshabilitado, o cuando un complemento de canal está habilitado pero aún no configurado, carga `setupEntry` en lugar de la entrada completa del complemento. Esto hace que el inicio y la configuración sean más ligeros cuando su entrada principal del complemento también conecta herramientas, ganchos u otro código solo de tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` puede hacer que un complemento de canal opte por la misma ruta `setupEntry` durante la fase de inicio previa a la escucha del puerta de enlace, incluso cuando el canal ya está configurado.

Use esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir antes de que el puerta de enlace comience a escuchar. En la práctica, esto significa que la entrada de configuración debe registrar cada capacidad propiedad del canal de la cual depende el inicio, tal como:

- el registro del canal en sí
- cualquier ruta HTTP que debe estar disponible antes de que el puerta de enlace comience a escuchar
- cualquier método, herramienta o servicio del puerta de enlace que deba existir durante esa misma ventana

Si su entrada completa todavía posee alguna capacidad de inicio requerida, no habilite esta bandera. Mantenga el complemento en el comportamiento predeterminado y deje que OpenClaw cargue la entrada completa durante el inicio.

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
sugerencias de instalación a través de `openclaw.install`. Esto mantiene el catálogo principal libre de datos.

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

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación
del registro MPM). Coloque un archivo JSON en uno de:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunte `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas, punto y coma o `PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## Complementos del motor de contexto

Los complementos del motor de contexto son propietarios de la orquestación del contexto de sesión para ingestión,
ensamblaje y compactación. Regístrelos desde su complemento con
`api.registerContextEngine(id, factory)`, luego seleccione el motor activo con
`plugins.slots.contextEngine`.

Use esto cuando su complemento necesite reemplazar o extender la canalización de contexto predeterminada
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

Cuando un complemento necesita un comportamiento que no se ajusta a la API actual, no eluda
el sistema de complementos con un acceso privado. Agregue la capacidad faltante.

Secuencia recomendada:

1. definir el contrato principal
   Decida qué comportamiento compartido debe ser propiedad del núcleo: política, respaldo, combinación de configuración,
   ciclo de vida, semántica orientada al canal y la forma del asistente de tiempo de ejecución.
2. agregar superficies de registro/tiempo de ejecución de complementos tipadas
   Extienda `OpenClawPluginApi` y/o `api.runtime` con la superficie de capacidad
   tipada más pequeña y útil.
3. conectar núcleo + consumidores de canal/características
   Los complementos de canal y características deben consumir la nueva capacidad a través del núcleo,
   no importando directamente una implementación de proveedor.
4. registrar implementaciones de proveedores
   Los complementos de proveedores registran sus backends frente a la capacidad.
5. agregar cobertura de contrato
   Agregue pruebas para que la propiedad y la forma de registro sigan siendo explícitas con el tiempo.

Así es como OpenClaw mantiene sus opiniones sin volverse rígido con la visión del mundo de un proveedor. Consulte el [Cookbook de capacidades](/es/tools/capability-cookbook) para obtener una lista de verificación de archivos concreta y un ejemplo práctico.

### Lista de verificación de capacidades

Cuando agrega una nueva capacidad, la implementación generalmente debe tocar estas superficies juntas:

- tipos de contrato principal en `src/<capability>/types.ts`
- asistente de ejecución/runtime principal en `src/<capability>/runtime.ts`
- superficie de registro de la API de complementos en `src/plugins/types.ts`
- cableado del registro de complementos en `src/plugins/registry.ts`
- exposición del runtime de complementos en `src/plugins/runtime/*` cuando los complementos de características/canales necesitan consumirlo
- asistentes de captura/prueba en `src/test-utils/plugin-registration.ts`
- afirmaciones de propiedad/contrato en `src/plugins/contracts/registry.ts`
- documentos del operador/complemento en `docs/`

Si falta una de esas superficies, generalmente es una señal de que la capacidad aún no está completamente integrada.

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
- los complementos de proveedores poseen las implementaciones de proveedores
- los complementos de características/canales consumen los asistentes de runtime
- las pruebas de contrato mantienen la propiedad explícita

import es from "/components/footer/es.mdx";

<es />
