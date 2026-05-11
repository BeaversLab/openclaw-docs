---
summary: "Plugin internals: capability model, ownership, contracts, load pipeline, and runtime helpers"
read_when:
  - Building or debugging native OpenClaw plugins
  - Understanding the plugin capability model or ownership boundaries
  - Working on the plugin load pipeline or registry
  - Implementing provider runtime hooks or channel plugins
title: "Plugin internals"
sidebarTitle: "Internals"
---

Esta es la **referencia de arquitectura profunda** para el sistema de complementos de OpenClaw. Para guías prácticas, comience con una de las páginas enfocadas a continuación.

<CardGroup cols={2}>
  <Card title="Install and use plugins" icon="plug" href="/es/tools/plugin">
    Guía de usuario final para agregar, habilitar y solucionar problemas de complementos.
  </Card>
  <Card title="Building plugins" icon="rocket" href="/es/plugins/building-plugins">
    Tutorial del primer complemento con el manifiesto funcional más pequeño.
  </Card>
  <Card title="Channel plugins" icon="comments" href="/es/plugins/sdk-channel-plugins">
    Cree un complemento de canal de mensajería.
  </Card>
  <Card title="Provider plugins" icon="microchip" href="/es/plugins/sdk-provider-plugins">
    Cree un complemento de proveedor de modelos.
  </Card>
  <Card title="SDK overview" icon="book" href="/es/plugins/sdk-overview">
    Referencia de API de mapa de importación y registro.
  </Card>
</CardGroup>

## Modelo de capacidad pública

Las capacidades son el modelo de **complemento nativo** público dentro de OpenClaw. Cada complemento nativo de OpenClaw se registra contra uno o más tipos de capacidad:

| Capacidad                          | Método de registro                               | Complementos de ejemplo              |
| ---------------------------------- | ------------------------------------------------ | ------------------------------------ |
| Inferencia de texto                | `api.registerProvider(...)`                      | `openai`, `anthropic`                |
| Backend de inferencia CLI          | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                |
| Voz                                | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`            |
| Transcripción en tiempo real       | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                             |
| Voz en tiempo real                 | `api.registerRealtimeVoiceProvider(...)`         | `openai`                             |
| Comprensión de medios              | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                   |
| Generación de imágenes             | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax` |
| Generación de música               | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                  |
| Generación de video                | `api.registerVideoGenerationProvider(...)`       | `qwen`                               |
| Recuperación web                   | `api.registerWebFetchProvider(...)`              | `firecrawl`                          |
| Búsqueda web                       | `api.registerWebSearchProvider(...)`             | `google`                             |
| Canal / mensajería                 | `api.registerChannel(...)`                       | `msteams`, `matrix`                  |
| Descubrimiento de puerta de enlace | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                            |

<Note>Un complemento que registra cero capacidades pero proporciona hooks, herramientas, servicios de descubrimiento o servicios en segundo plano es un complemento **solo de hook heredado**. Ese patrón todavía es totalmente compatible.</Note>

### Postura de compatibilidad externa

El modelo de capacidades está implementado en el núcleo y lo utilizan hoy los complementos incluidos/nativos, pero la compatibilidad de los complementos externos aún necesita un estándar más estricto que "se exporta, por lo tanto está congelado".

| Situación del complemento                                    | Guía                                                                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complementos externos existentes                             | Mantenga funcionando las integraciones basadas en hooks; esta es la línea base de compatibilidad.                                                   |
| Nuevos complementos incluidos/nativos                        | Prefiera el registro explícito de capacidades sobre los accesos específicos del proveedor o nuevos diseños solo de hooks.                           |
| Complementos externos que adoptan el registro de capacidades | Permitido, pero trate las superficies de ayuda específicas de la capacidad como en evolución a menos que la documentación las marque como estables. |

El registro de capacidades es la dirección prevista. Los hooks heredados siguen siendo la ruta más segura sin interrupciones para los complementos externos durante la transición. Las subrutas de ayuda exportadas no son todas iguales: prefiera contratos documentados estrechos sobre exportaciones de ayuda incidentales.

### Formas de complemento

OpenClaw clasifica cada complemento cargado en una forma basada en su comportamiento de registro real (no solo en los metadatos estáticos):

<AccordionGroup>
  <Accordion title="plain-capability">Registra exactamente un tipo de capacidad (por ejemplo, un complemento solo de proveedor como `mistral`).</Accordion>
  <Accordion title="hybrid-capability">Registra múltiples tipos de capacidades (por ejemplo, `openai` posee inferencia de texto, voz, comprensión de medios y generación de imágenes).</Accordion>
  <Accordion title="hook-only">Registra solo enlaces (con tipo o personalizados), sin capacidades, herramientas, comandos o servicios.</Accordion>
  <Accordion title="non-capability">Registra herramientas, comandos, servicios o rutas, pero no capacidades.</Accordion>
</AccordionGroup>

Use `openclaw plugins inspect <id>` para ver la forma de un complemento y el desglose de sus capacidades. Consulte [Referencia de CLI](/es/cli/plugins#inspect) para obtener más detalles.

### Enlaces heredados

El enlace `before_agent_start` sigue siendo compatible como una ruta de compatibilidad para complementos que solo usan enlaces. Los complementos reales heredados aún dependen de él.

Dirección:

- mantenerlo funcionando
- documentarlo como heredado
- preferir `before_model_resolve` para el trabajo de anulación de modelo/proveedor
- preferir `before_prompt_build` para el trabajo de mutación de indicaciones (prompts)
- eliminarlo solo cuando el uso real disminuya y la cobertura de dispositivos de prueba (fixtures) demuestre la seguridad de la migración

### Señales de compatibilidad

Al ejecutar `openclaw doctor` o `openclaw plugins inspect <id>`, es posible que vea una de estas etiquetas:

| Señal                             | Significado                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------- |
| **config válida**                 | La configuración se analiza correctamente y los complementos se resuelven       |
| **advertencia de compatibilidad** | El complemento usa un patrón compatible pero antiguo (por ejemplo, `hook-only`) |
| **advertencia heredada**          | El complemento usa `before_agent_start`, que está obsoleto                      |
| **error grave**                   | La configuración no es válida o el complemento falló al cargarse                |

Ni `hook-only` ni `before_agent_start` romperán tu complemento hoy: `hook-only` es consultivo y `before_agent_start` solo activa una advertencia. Estas señales también aparecen en `openclaw status --all` y `openclaw plugins doctor`.

## Descripción general de la arquitectura

El sistema de complementos de OpenClaw tiene cuatro capas:

<Steps>
  <Step title="Manifiesto + descubrimiento">OpenClaw encuentra complementos candidatos desde rutas configuradas, raíces del espacio de trabajo, raíces globales de complementos y complementos empaquetados. El descubrimiento lee manifiestos nativos de `openclaw.plugin.json` además de los manifiestos de paquetes compatibles primero.</Step>
  <Step title="Habilitación + validación">Core decide si un complemento descubierto está habilitado, deshabilitado, bloqueado o seleccionado para un espacio exclusivo como la memoria.</Step>
  <Step title="Carga en tiempo de ejecución">Los complementos nativos de OpenClaw se cargan en proceso mediante jiti y registran capacidades en un registro central. Los paquetes compatibles se normalizan en registros del sistema sin importar código en tiempo de ejecución.</Step>
  <Step title="Consumo de la superficie">El resto de OpenClaw lee el registro para exponer herramientas, canales, configuración de proveedores, ganchos, rutas HTTP, comandos CLI y servicios.</Step>
</Steps>

Para la CLI de complementos específicamente, el descubrimiento de comandos raíz se divide en dos fases:

- los metadatos en tiempo de análisis provienen de `registerCli(..., { descriptors: [...] })`
- el módulo real de la CLI del complemento puede permanecer diferido y registrarse en la primera invocación

Eso mantiene el código de la CLI propiedad del complemento dentro del complemento, al mismo tiempo que permite a OpenClaw reservar nombres de comandos raíz antes del análisis.

El límite de diseño importante:

- la validación de manifiesto/configuración debería funcionar desde **metadatos de manifiesto/esquema** sin ejecutar código del complemento
- el descubrimiento de capacidades nativas puede cargar código de entrada de complemento confiable para construir una instantánea de registro no activadora
- el comportamiento del tiempo de ejecución nativo proviene de la ruta `register(api)` del módulo del complemento con `api.registrationMode === "full"`

Esa división permite a OpenClaw validar la configuración, explicar los complementos faltantes/deshabilitados y crear sugerencias de interfaz de usuario/esquema antes de que el tiempo de ejecución completo esté activo.

### Instantánea de metadatos del complemento y tabla de búsqueda

El inicio de Gateway construye un `PluginMetadataSnapshot` para la instantánea de configuración actual. La instantánea es solo de metadatos: almacena el índice de complementos instalados, el registro de manifiestos, el diagnóstico de manifiestos, los mapas de propietarios, un normalizador de ID de complemento y registros de manifiestos. No contiene módulos de complementos cargados, SDK de proveedores, contenidos de paquetes o exportaciones de tiempo de ejecución.

La validación de configuración conocedora de complementos, la habilitación automática al inicio y el arranque de complementos de Gateway consumen esa instantánea en lugar de reconstruir independientemente los metadatos de manifiesto/índice. `PluginLookUpTable` se deriva de la misma instantánea y añade el plan de complementos de inicio para la configuración de tiempo de ejecución actual.

Después del inicio, Gateway mantiene la instantánea de metadatos actual como un producto de tiempo de ejecución reemplazable. El descubrimiento repetido del proveedor en tiempo de ejecución puede tomar prestada esa instantánea en lugar de reconstruir el índice instalado y el registro de manifiestos para cada pase del catálogo de proveedores. La instantánea se borra o reemplaza al apagar Gateway, cambiar el inventario de configuración/complementos y escribir en el índice instalado; los solicitantes recurren a la ruta de manifiesto/índice en frío cuando no existe una instantánea actual compatible. Las comprobaciones de compatibilidad deben incluir raíces de descubrimiento de complementos como `plugins.load.paths` y el espacio de trabajo del agente predeterminado, porque los complementos del espacio de trabajo son parte del alcance de los metadatos.

La instantánea y la tabla de búsqueda mantienen las decisiones de inicio repetidas en la ruta rápida:

- propiedad del canal
- inicio diferido del canal
- ids de complementos de inicio
- propiedad del proveedor y del backend de CLI
- configuración del proveedor, alias de comando, proveedor del catálogo de modelos y propiedad del contrato de manifiesto
- validación del esquema de configuración del complemento y del esquema de configuración del canal
- decisiones de habilitación automática al inicio

El límite de seguridad es el reemplazo de la instantánea, no la mutación. Reconstruya la instantánea cuando cambie la configuración, el inventario de complementos, los registros de instalación o la política de índice persistente. No la trate como un registro global mutable amplio y no mantenga instantáneas históricas ilimitadas. La carga de complementos en tiempo de ejecución permanece separada de las instantáneas de metadatos para que el estado de tiempo de ejecución obsoleto no pueda ocultarse detrás de un caché de metadatos.

Algunos llamadores de ruta fría (cold-path) todavía reconstruyen los registros de manifiestos directamente desde el índice persistente de complementos instalados en lugar de recibir un Gateway `PluginLookUpTable`. Esa ruta de respaldo mantiene una pequeña caché en memoria delimitada con clave por el índice instalado, la forma de solicitud, la política de configuración, las raíces de tiempo de ejecución y las firmas de archivos de manifiesto/paquete. Es una red de seguridad de respaldo para la reconstrucción repetida del índice, no la ruta caliente (hot path) preferida del Gateway. Se prefiera pasar la tabla de búsqueda actual o un registro de manifiesto explícito a través de los flujos de tiempo de ejecución cuando un llamador ya tiene uno.

### Planificación de la activación

La planificación de la activación es parte del plano de control. Los llamadores pueden preguntar qué complementos son relevantes para un comando concreto, proveedor, canal, ruta, arnés de agente o capacidad antes de cargar registros de tiempo de ejecución más amplios.

El planificador mantiene el comportamiento del manifiesto actual compatible:

- los campos `activation.*` son sugerencias explícitas del planificador
- `providers`, `channels`, `commandAliases`, `setup.providers`, `contracts.tools` y los hooks siguen siendo una alternativa de propiedad del manifiesto
- la API del planificador de solo IDs permanece disponible para los llamadores existentes
- la API del plan informa de etiquetas de motivo para que los diagnósticos puedan distinguir las sugerencias explícitas de la alternativa de propiedad

<Warning>No trate `activation` como un enlace de ciclo de vida (lifecycle hook) ni un reemplazo de `register(...)`. Son metadatos utilizados para restringir la carga. Prefiera los campos de propiedad cuando ya describan la relación; use `activation` solo para sugerencias adicionales del planificador.</Warning>

### Complementos de canal y la herramienta de mensaje compartida

Los complementos de canal no necesitan registrar una herramienta de enviar/editar/reaccionar separada para las acciones de chat normales. OpenClaw mantiene una herramienta compartida `message` en el núcleo, y los complementos de canal son propietarios del descubrimiento y ejecución específicos del canal detrás de ella.

El límite actual es:

- el núcleo es propietario del host de la herramienta compartida `message`, el cableado del prompt, el mantenimiento de libros de sesión/hilo y el despacho de ejecución
- los complementos de canal son propietarios del descubrimiento de acciones con ámbito, el descubrimiento de capacidades y cualquier fragmento de esquema específico del canal
- los complementos del canal poseen la gramática de conversación de sesión específica del proveedor, como cómo los identificadores de conversación codifican los identificadores de hilo o heredan de las conversaciones principales
- los complementos del canal ejecutan la acción final a través de su adaptador de acción

Para los complementos del canal, la superficie del SDK es `ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento unificada permite que un complemento devuelva sus acciones visibles, capacidades y contribuciones de esquema juntas para que esas piezas no se separen.

Cuando un parámetro de herramienta de mensaje específico del canal lleva una fuente de medios como una ruta local o una URL de medios remota, el complemento también debe devolver `mediaSourceParams` de `describeMessageTool(...)`. Core usa esa lista explícita para aplicar la normalización de rutas de sandbox y pistas de acceso a medios salientes sin codificar nombres de parámetros propiedad del complemento. Allí se prefieren mapas con alcance de acción, no una lista plana para todo el canal, para que un parámetro de medios solo para perfil no se normalice en acciones no relacionadas como `send`.

Core pasa el alcance de tiempo de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- entrada confiable `requesterSenderId`

Esto es importante para los complementos sensibles al contexto. Un canal puede ocultar o exponer acciones de mensaje basándose en la cuenta activa, la sala/hilo/mensaje actual, o la identidad del solicitante de confianza sin codificar ramas específicas del canal en la herramienta principal `message`.

Es por eso que los cambios de enrutamiento del ejecutor integrado siguen siendo trabajo del complemento: el ejecutor es responsable de reenviar la identidad de chat/sesión actual al límite de descubrimiento del complemento para que la herramienta compartida `message` exponga la superficie adecuada propiedad del canal para el turno actual.

Para los asistentes de ejecución propiedad del canal, los plugins empaquetados deben mantener el tiempo de ejecución de ejecución dentro de sus propios módulos de extensión. Core ya no posee los tiempos de ejecución de acciones de mensaje de Discord, Slack, Telegram o WhatsApp bajo `src/agents/tools`. No publicamos subrutas `plugin-sdk/*-action-runtime` separadas, y los plugins empaquetados deben importar su propio código de tiempo de ejecución local directamente desde sus módulos propiedad de la extensión.

El mismo límite se aplica a las costuras del SDK nombradas por el proveedor en general: core no debe importar barriles de conveniencia específicos del canal para Slack, Discord, Signal, WhatsApp o extensiones similares. Si core necesita un comportamiento, consuma el barril `api.ts` / `runtime-api.ts` del propio plugin empaquetado o promueva la necesidad a una capacidad genérica estrecha en el SDK compartido.

Los plugins empaquetados siguen la misma regla. Un `runtime-api.ts` de un plugin empaquetado no debe reexportar su propia fachada `openclaw/plugin-sdk/<plugin-id>` de marca. Esas fachadas de marca siguen siendo shims de compatibilidad para plugins externos y consumidores antiguos, pero los plugins empaquetados deben usar exportaciones locales más subrutas genéricas estrechas del SDK como `openclaw/plugin-sdk/channel-policy`, `openclaw/plugin-sdk/runtime-store` o `openclaw/plugin-sdk/webhook-ingress`. El código nuevo no debe agregar fachadas del SDK específicas del ID del plugin a menos que el límite de compatibilidad para un ecosistema externo existente lo requiera.

Específicamente para las encuestas, hay dos rutas de ejecución:

- `outbound.sendPoll` es la línea base compartida para los canales que se ajustan al modelo de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para semánticas de encuesta específicas del canal o parámetros de encuesta adicionales

Core ahora difiere el análisis compartido de encuestas hasta después de que el despacho de encuestas del plugin decline la acción, para que los manejadores de encuestas propiedad del plugin puedan aceptar campos de encuesta específicos del canal sin ser bloqueados primero por el analizador de encuestas genérico.

Consulte [Aspectos internos de la arquitectura de plugins](/es/plugins/architecture-internals) para obtener la secuencia de inicio completa.

## Modelo de propiedad de capacidades

OpenClaw trata un plugin nativo como el límite de propiedad para una **empresa** o una **característica**, no como una bolsa de cosas de integraciones no relacionadas.

Eso significa:

- un plugin de empresa generalmente debería ser propietario de todas las superficies de esa empresa orientadas a OpenClaw
- un complemento de características (feature plugin) generalmente debe ser propietario de toda la superficie de características que introduce
- los canales deben consumir capacidades básicas compartidas en lugar de reimplementar el comportamiento del proveedor ad hoc

<AccordionGroup>
  <Accordion title="Proveedor con múltiples capacidades">`openai` posee la inferencia de texto, voz, voz en tiempo real, comprensión multimedia y generación de imágenes. `google` posee la inferencia de texto más comprensión multimedia, generación de imágenes y búsqueda web. `qwen` posee la inferencia de texto más comprensión multimedia y generación de video.</Accordion>
  <Accordion title="Proveedor con capacidad única">`elevenlabs` y `microsoft` poseen voz; `firecrawl` posee recuperación web (web-fetch); `minimax` / `mistral` / `moonshot` / `zai` poseen backends de comprensión multimedia.</Accordion>
  <Accordion title="Complemento de características">`voice-call` posee el transporte de llamadas, herramientas, CLI, rutas y puente de flujo de medios de Twilio, pero consume capacidades compartidas de voz, transcripción en tiempo real y voz en tiempo real en lugar de importar complementos de proveedores directamente.</Accordion>
</AccordionGroup>

El estado final deseado es:

- OpenAI reside en un solo complemento incluso si abarca modelos de texto, voz, imágenes y video futuro
- otro proveedor puede hacer lo mismo para su propia superficie de área
- a los canales no les importa qué complemento de proveedor posee el proveedor; ellos consumen el contrato de capacidad compartida expuesto por el núcleo (core)

Esta es la distinción clave:

- **complemento** (plugin) = límite de propiedad
- **capacidad** = contrato principal que múltiples complementos pueden implementar o consumir

Por lo tanto, si OpenClaw añade un nuevo dominio como el video, la primera pregunta no es "qué proveedor debería codificar el manejo de video?". La primera pregunta es "cuál es el contrato de capacidad de video principal?". Una vez que ese contrato existe, los complementos de proveedores pueden registrarse en él y los complementos de canal/características pueden consumirlo.

Si la capacidad aún no existe, la medida correcta suele ser:

<Steps>
  <Step title="Definir la capacidad">Definir la capacidad que falta en el núcleo.</Step>
  <Step title="Exponer a través del SDK">Exponerla a través de la API/tiempo de ejecución del complemento de una manera tipada.</Step>
  <Step title="Conectar consumidores">Conectar canales/características contra esa capacidad.</Step>
  <Step title="Implementaciones de proveedores">Permitir que los complementos de proveedores registren implementaciones.</Step>
</Steps>

Esto mantiene la propiedad explícita mientras se evita el comportamiento del núcleo que depende de un solo proveedor o una ruta de código específica de un complemento de una sola vez.

### Capas de capacidad

Use este modelo mental al decidir dónde pertenece el código:

<Tabs>
  <Tab title="Capa de capacidad central">Orquestación compartida, políticas, respaldo, reglas de fusión de configuración, semántica de entrega y contratos tipados.</Tab>
  <Tab title="Capa de complementos de proveedor">APIs específicas del proveedor, autenticación, catálogos de modelos, síntesis de voz, generación de imágenes, backends de video futuros, endpoints de uso.</Tab>
  <Tab title="Capa de complementos de canal/característica">Integración de Slack/Discord/llamada de voz/etc. que consume capacidades centrales y las presenta en una superficie.</Tab>
</Tabs>

Por ejemplo, el TTS sigue esta forma:

- el núcleo posee la política de TTS en el momento de la respuesta, el orden de respaldo, las preferencias y la entrega del canal
- `openai`, `elevenlabs` y `microsoft` son propietarios de las implementaciones de síntesis
- `voice-call` consume el asistente de tiempo de ejecución de TTS de telefonía

Ese mismo patrón debe preferirse para capacidades futuras.

### Ejemplo de complemento de empresa con múltiples capacidades

Un complemento de empresa debe parecer cohesivo desde el exterior. Si OpenClaw tiene contratos compartidos para modelos, voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de video, obtención web y búsqueda web, un proveedor puede poseer todas sus superficies en un solo lugar:

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
- el núcleo sigue siendo propietario de los contratos de capacidad
- los canales y los complementos de características consumen asistentes `api.runtime.*`, no código de proveedor
- las pruebas de contrato pueden asegurar que el complemento registró las capacidades que dice poseer

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad compartida. El mismo modelo de propiedad se aplica allí:

<Steps>
  <Step title="Core defines the contract">Core define el contrato de comprensión de medios.</Step>
  <Step title="Vendor plugins register">Los complementos de proveedor registran `describeImage`, `transcribeAudio` y `describeVideo` según corresponda.</Step>
  <Step title="Consumers use the shared behavior">Los canales y los complementos de características consumen el comportamiento central compartido en lugar de conectarse directamente al código del proveedor.</Step>
</Steps>

Eso evita incorporar los supuestos de video de un proveedor en el núcleo. El complemento posee la superficie del proveedor; el núcleo posee el contrato de capacidad y el comportamiento de reserva.

La generación de video ya usa esa misma secuencia: el núcleo posee el contrato de capacidad tipificado y el asistente de tiempo de ejecución, y los complementos de proveedor registran implementaciones `api.registerVideoGenerationProvider(...)` contra él.

¿Necesita una lista de verificación de implementación concreta? Consulte [Capability Cookbook](/es/tools/capability-cookbook).

## Contratos y cumplimiento

La superficie de la API del complemento está tipificada intencionalmente y centralizada en `OpenClawPluginApi`. Ese contrato define los puntos de registro admitidos y los asistentes de tiempo de ejecución en los que un complemento puede confiar.

Por qué esto importa:

- los autores de complementos obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos complementos registrando el mismo id de proveedor
- el inicio puede mostrar diagnósticos procesables para registros malformados
- las pruebas de contrato pueden hacer cumplir la propiedad del complemento incluido y evitar la deriva silenciosa

Hay dos capas de cumplimiento:

<AccordionGroup>
  <Accordion title="Runtime registration enforcement">El registro de complementos valida los registros a medida que se cargan los complementos. Ejemplos: los identificadores de proveedor duplicados, los identificadores de proveedor de voz duplicados y los registros con formato incorrecto generan diagnósticos de complementos en lugar de un comportamiento indefinido.</Accordion>
  <Accordion title="Contract tests">Los complementos empaquetados se capturan en registros de contratos durante las ejecuciones de pruebas para que OpenClaw pueda afirmar la propiedad explícitamente. Hoy en día, esto se utiliza para proveedores de modelos, proveedores de voz, proveedores de búsqueda web y la propiedad de registros empaquetados.</Accordion>
</AccordionGroup>

El efecto práctico es que OpenClaw sabe, de antemano, qué complemento posee qué superficie. Esto permite que el núcleo y los canales se compongan perfectamente porque la propiedad se declara, se escribe y es comprobable en lugar de implícita.

### Qué pertenece a un contrato

<Tabs>
  <Tab title="Good contracts">- con tipo - pequeño - específico de la capacidad - propiedad del núcleo - reutilizable por múltiples complementos - consumible por canales/características sin conocimiento del proveedor</Tab>
  <Tab title="Bad contracts">- política específica del proveedor oculta en el núcleo - salidas de emergencia de complementos de una sola vez que omiten el registro - código de canal que accede directamente a una implementación de proveedor - objetos de tiempo de ejecución ad hoc que no son parte de `OpenClawPluginApi` o `api.runtime`</Tab>
</Tabs>

En caso de duda, aumente el nivel de abstracción: defina primero la capacidad y luego permita que los complementos se conecten a ella.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en proceso** con el Gateway. No están en sandbox. Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que el código central.

<Warning>
Implicaciones:

- un complemento nativo puede registrar herramientas, controladores de red, ganchos y servicios
- un error en un complemento nativo puede bloquear o desestabilizar la puerta de enlace
- un complemento nativo malicioso es equivalente a la ejecución de código arbitrario dentro del proceso de OpenClaw
  </Warning>

Los paquetes compatibles son más seguros por defecto porque OpenClaw actualmente los trata como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades empaquetadas.

Use listas de permitidos y rutas de instalación/carga explícitas para los plugins no incluidos. Trate los plugins del espacio de trabajo como código de tiempo de desarrollo, no como valores predeterminados de producción.

Para los nombres de paquetes del espacio de trabajo incluidos, mantenga el id del plugin anclado en el nombre de npm: `@openclaw/<id>` de forma predeterminada, o un sufijo de tipo aprobado como `-provider`, `-plugin`, `-speech`, `-sandbox`, o `-media-understanding` cuando el paquete intencionalmente expone un rol de plugin más estrecho.

<Note>
**Nota de confianza:**

- `plugins.allow` confía en los **ids de plugin**, no en el origen de la fuente.
- Un plugin del espacio de trabajo con el mismo id que un plugin incluido sombreo intencionalmente la copia incluida cuando ese plugin del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, las pruebas de parches y las revisiones urgentes.
- La confianza del plugin incluido se resuelve a partir de la instantánea de la fuente — el manifiesto y el código en el disco en el momento de la carga — en lugar de los metadatos de instalación. Un registro de instalación corrupto o sustituido no puede ampliar silenciosamente la superficie de confianza de un plugin incluido más allá de lo que la fuente real reclama.
  </Note>

## Límite de exportación

OpenClaw exporta capacidades, no conveniencias de implementación.

Mantenga el registro de capacidades público. Elimine las exportaciones auxiliares que no son parte del contrato:

- subrutas auxiliares específicas del plugin incluido
- subrutas de infraestructura (plumbing) de tiempo de ejecución no destinadas a ser API pública
- auxiliares de convenencia específicos del proveedor
- auxiliares de configuración/incorporación que son detalles de implementación

Algunas subrutas auxiliares de plugins incluidos todavía permanecen en el mapa de exportación del SDK generado por compatibilidad y mantenimiento de plugins incluidos. Los ejemplos actuales incluyen `plugin-sdk/feishu`, `plugin-sdk/feishu-setup`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup`, `plugin-sdk/channel-config-schema-legacy`, y varias `plugin-sdk/matrix*` costuras. Trátelos como exportaciones reservadas en desuso, no como el patrón de SDK recomendado para nuevos plugins de terceros.

## Aspectos internos y referencia

Para la canalización de carga, el modelo de registro, los enlaces de tiempo de ejecución del proveedor, las rutas HTTP de Gateway, los esquemas de herramientas de mensajes, la resolución de objetivos de canal, los catálogos de proveedores, los complementos del motor de contexto y la guía para agregar una nueva capacidad, consulte [Plugin architecture internals](/es/plugins/architecture-internals).

## Relacionado

- [Building plugins](/es/plugins/building-plugins)
- [Plugin manifest](/es/plugins/manifest)
- [Plugin SDK setup](/es/plugins/sdk-setup)
