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

| Capacidad                          | Método de registro                               | Complementos de ejemplo                          |
| ---------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| Inferencia de texto                | `api.registerProvider(...)`                      | `openai`, `anthropic`                            |
| Backend de inferencia CLI          | `api.registerCliBackend(...)`                    | `openai`, `anthropic`                            |
| Incrustaciones                     | `api.registerEmbeddingProvider(...)`             | Complementos vectoriales propiedad del proveedor |
| Voz                                | `api.registerSpeechProvider(...)`                | `elevenlabs`, `microsoft`                        |
| Transcripción en tiempo real       | `api.registerRealtimeTranscriptionProvider(...)` | `openai`                                         |
| Voz en tiempo real                 | `api.registerRealtimeVoiceProvider(...)`         | `openai`                                         |
| Comprensión de medios              | `api.registerMediaUnderstandingProvider(...)`    | `openai`, `google`                               |
| Fuente de notas de reunión         | `api.registerMeetingNotesSourceProvider(...)`    | `discord`, `meeting-notes`                       |
| Generación de imágenes             | `api.registerImageGenerationProvider(...)`       | `openai`, `google`, `fal`, `minimax`             |
| Generación de música               | `api.registerMusicGenerationProvider(...)`       | `google`, `minimax`                              |
| Generación de video                | `api.registerVideoGenerationProvider(...)`       | `qwen`                                           |
| Recuperación web                   | `api.registerWebFetchProvider(...)`              | `firecrawl`                                      |
| Búsqueda web                       | `api.registerWebSearchProvider(...)`             | `google`                                         |
| Canal / mensajería                 | `api.registerChannel(...)`                       | `msteams`, `matrix`                              |
| Descubrimiento de puerta de enlace | `api.registerGatewayDiscoveryService(...)`       | `bonjour`                                        |

<Note>Un complemento que registra cero capacidades pero proporciona ganchos, herramientas, servicios de descubrimiento o servicios en segundo plano es un complemento de **solo ganchos heredado**. Ese patrón sigue totalmente soportado.</Note>

### Postura de compatibilidad externa

El modelo de capacidades está implementado en el núcleo y es utilizado hoy por los complementos incluidos/nativos, pero la compatibilidad de los complementos externos aún necesita una barrera más estricta que "está exportado, por lo tanto está congelado".

| Situación del complemento                                    | Guía                                                                                                                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complementos externos existentes                             | Mantener las integraciones basadas en ganchos funcionando; esta es la línea base de compatibilidad.                                                  |
| Nuevos complementos incluidos/nativos                        | Preferir el registro explícito de capacidades sobre los accesos específicos del proveedor o nuevos diseños de solo ganchos.                          |
| Complementos externos que adoptan el registro de capacidades | Permitido, pero trata las superficies auxiliares específicas de la capacidad como en evolución a menos que los documentos las marquen como estables. |

El registro de capacidades es la dirección prevista. Los hooks heredados siguen siendo la ruta más segura sin interrupciones para los complementos externos durante la transición. Las subrutas auxiliares exportadas no son todas iguales: prefiere los contratos documentados estrechos sobre las exportaciones auxiliares incidentales.

### Formas de complementos

OpenClaw clasifica cada complemento cargado en una forma según su comportamiento de registro real (no solo metadatos estáticos):

<AccordionGroup>
  <Accordion title="plain-capability">Registra exactamente un tipo de capacidad (por ejemplo, un complemento solo de proveedor como `mistral`).</Accordion>
  <Accordion title="hybrid-capability">Registra múltiples tipos de capacidades (por ejemplo, `openai` posee inferencia de texto, voz, comprensión multimedia y generación de imágenes).</Accordion>
  <Accordion title="hook-only">Registra solo hooks (tipados o personalizados), sin capacidades, herramientas, comandos o servicios.</Accordion>
  <Accordion title="non-capability">Registra herramientas, comandos, servicios o rutas, pero no capacidades.</Accordion>
</AccordionGroup>

Usa `openclaw plugins inspect <id>` para ver la forma de un complemento y el desglose de capacidades. Consulta [CLI reference](/es/cli/plugins#inspect) para obtener más detalles.

### Hooks heredados

El hook `before_agent_start` sigue siendo compatible como ruta de compatibilidad para complementos solo de hook. Los complementos heredados del mundo real todavía dependen de él.

Dirección:

- mantenerlo funcionando
- documentarlo como heredado
- preferir `before_model_resolve` para el trabajo de anulación de modelo/proveedor
- preferir `before_prompt_build` para el trabajo de mutación de mensajes
- eliminar solo después de que el uso real disminuya y la cobertura de dispositivos demuestre la seguridad de la migración

### Señales de compatibilidad

Al ejecutar `openclaw doctor` o `openclaw plugins inspect <id>`, es posible que veas una de estas etiquetas:

| Señal                       | Significado                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| **config válida**           | La configuración se analiza bien y los complementos se resuelven              |
| **aviso de compatibilidad** | El complemento usa un patrón admitido pero antiguo (por ejemplo, `hook-only`) |
| **advertencia de legado**   | El complemento usa `before_agent_start`, que está obsoleto                    |
| **error grave**             | La configuración no es válida o el complemento falló al cargarse              |

Ni `hook-only` ni `before_agent_start` romperán su complemento hoy: `hook-only` es consultivo y `before_agent_start` solo activa una advertencia. Estas señales también aparecen en `openclaw status --all` y `openclaw plugins doctor`.

## Resumen de arquitectura

El sistema de complementos de OpenClaw tiene cuatro capas:

<Steps>
  <Step title="Manifiesto + descubrimiento">OpenClaw encuentra complementos candidatos desde las rutas configuradas, raíces del espacio de trabajo, raíces globales de complementos y complementos empaquetados. El descubrimiento lee primero los manifiestos nativos `openclaw.plugin.json` además de los manifiestos de paquetes compatibles.</Step>
  <Step title="Habilitación + validación">Core decide si un complemento descubierto está habilitado, deshabilitado, bloqueado o seleccionado para un espacio exclusivo como la memoria.</Step>
  <Step title="Carga en tiempo de ejecución">
    Los complementos nativos de OpenClaw se cargan en proceso y registran capacidades en un registro central. El JavaScript empaquetado se carga a través de `require` nativo; el TypeScript de fuente local de terceros es el respaldo de emergencia de Jiti. Los paquetes compatibles se normalizan en registros del registro sin importar código de tiempo de ejecución.
  </Step>
  <Step title="Consumo superficial">El resto de OpenClaw lee el registro para exponer herramientas, canales, configuración de proveedores, ganchos, rutas HTTP, comandos CLI y servicios.</Step>
</Steps>

Específicamente para la CLI de complementos, el descubrimiento de comandos raíz se divide en dos fases:

- los metadatos en tiempo de análisis provienen de `registerCli(..., { descriptors: [...] })`
- el módulo CLI real del complemento puede mantenerse diferido y registrarse en la primera invocación

Eso mantiene el código CLI propiedad del complemento dentro del complemento, al mismo tiempo que permite a OpenClaw reservar nombres de comandos raíz antes del análisis.

El límite de diseño importante:

- la validación de manifiesto/configuración debería funcionar desde **metadatos de manifiesto/esquema** sin ejecutar código del complemento
- el descubrimiento de capacidades nativas puede cargar código de entrada de complemento de confianza para crear una instantánea de registro no activante
- el comportamiento del tiempo de ejecución nativo proviene de la ruta `register(api)` del módulo del complemento con `api.registrationMode === "full"`

Esa división permite que OpenClaw valide la configuración, explique los complementos faltantes/desactivados y construya sugerencias de interfaz de usuario/esquema antes de que el tiempo de ejecución completo esté activo.

### Instantánea y tabla de búsqueda de metadatos del complemento

El inicio de Gateway crea una `PluginMetadataSnapshot` para la instantánea de configuración actual. La instantánea es solo de metadatos: almacena el índice de complementos instalados, el registro de manifiestos, el diagnóstico de manifiestos, los mapas de propietarios, un normalizador de ID de complemento y registros de manifiestos. No contiene módulos de complemento cargados, SDK de proveedores, contenidos de paquetes o exportaciones de tiempo de ejecución.

La validación de configuración compatible con complementos, la activación automática en el inicio y el arranque de complementos de Gateway consumen esa instantánea en lugar de reconstruir los metadatos de manifiesto/índice de forma independiente. `PluginLookUpTable` se deriva de la misma instantánea y agrega el plan de complementos de inicio para la configuración de tiempo de ejecución actual.

Después del inicio, Gateway mantiene la instantánea de metadatos actual como un producto de tiempo de ejecución reemplazable. El descubrimiento repetido de proveedores en tiempo de ejecución puede tomar prestada esa instantánea en lugar de reconstruir el índice instalado y el registro de manifiestos para cada paso del catálogo de proveedores. La instantánea se borra o reemplaza al cerrar Gateway, cambiar el inventario de configuración/complementos y escribir en el índice instalado; los llamadores recurren a la ruta de manifiesto/índice en frío cuando no existe una instantánea actual compatible. Las verificaciones de compatibilidad deben incluir raíces de descubrimiento de complementos como `plugins.load.paths` y el espacio de trabajo del agente predeterminado, porque los complementos del espacio de trabajo son parte del alcance de los metadatos.

La instantánea y la tabla de búsqueda mantienen las decisiones de inicio repetidas en la ruta rápida:

- propiedad del canal
- inicio diferido del canal
- ids de complementos de inicio
- propiedad del backend del proveedor y la CLI
- configuración del proveedor, alias de comando, proveedor del catálogo de modelos y propiedad del contrato de manifiesto
- validación del esquema de configuración del complemento y del esquema de configuración del canal
- decisiones de activación automática en el inicio

El límite de seguridad es el reemplazo de la instantánea, no la mutación. Reconstruya la instantánea cuando cambie la configuración, el inventario de complementos, los registros de instalación o la política de índice persistente. No lo trate como un registro global mutable amplio y no mantenga instantáneas históricas ilimitadas. La carga de complementos en tiempo de ejecución permanece separada de las instantáneas de metadatos, por lo que el estado obsoleto del tiempo de ejecución no puede ocultarse detrás de una memoria caché de metadatos.

La regla de la memoria caché está documentada en [Plugin architecture internals](/es/plugins/architecture-internals#plugin-cache-boundary): los metadatos de manifiesto y descubrimiento están actualizados a menos que quien llama mantenga una instantánea explícita, una tabla de búsqueda o un registro de manifiesto para el flujo actual. Las memorias caché de metadatos ocultas y los TTL de reloj de pared no son parte de la carga de complementos. Solo las memorias caché del cargador de tiempo de ejecución, el módulo y los artefactos de dependencia pueden persistir después de que el código o los artefactos instalados se carguen realmente.

Algunos llamadores de ruta de acceso en frío todavía reconstruyen los registros de manifiesto directamente desde el índice persistente de complementos instalados en lugar de recibir un Gateway `PluginLookUpTable`. Esa ruta ahora reconstruye el registro bajo demanda; se prefieren pasar la tabla de búsqueda actual o un registro de manifiesto explícito a través de los flujos de tiempo de ejecución cuando quien llama ya tiene uno.

### Planificación de la activación

La planificación de la activación es parte del plano de control. Los llamadores pueden preguntar qué complementos son relevantes para un comando concreto, proveedor, canal, ruta, arnés de agente o capacidad antes de cargar registros de tiempo de ejecución más amplios.

El planificador mantiene el comportamiento del manifiesto actual compatible:

- los campos `activation.*` son sugerencias explícitas del planificador
- `providers`, `channels`, `commandAliases`, `setup.providers`, `contracts.tools` y los ganchos siguen siendo el respaldo de propiedad del manifiesto
- la API del planificador solo de IDs permanece disponible para los llamadores existentes
- la API del plan informa etiquetas de razón para que los diagnósticos puedan distinguir las sugerencias explícitas del respaldo de propiedad

<Warning>No trate `activation` como un gancho del ciclo de vida ni un reemplazo de `register(...)`. Son metadatos utilizados para limitar la carga. Prefiera los campos de propiedad cuando ya describan la relación; use `activation` solo para sugerencias adicionales del planificador.</Warning>

### Complementos de canal y la herramienta de mensajes compartidos

Los complementos de canal no necesitan registrar una herramienta de envío/edición/reacción separada para las acciones de chat normales. OpenClaw mantiene una herramienta `message` compartida en el núcleo, y los complementos de canal son propietarios del descubrimiento y ejecución específicos del canal detrás de ella.

El límite actual es:

- el núcleo es propietario del host de la herramienta `message` compartida, el cableado del prompt, la contabilidad de la sesión/hilo y el despacho de ejecución
- los complementos de canal son propietarios del descubrimiento de acciones con ámbito, el descubrimiento de capacidades y cualquier fragmento de esquema específico del canal
- los complementos de canal son propietarios de la gramática de conversación de sesión específica del proveedor, tal como cómo los IDs de conversación codifican los IDs de hilo o se heredan de conversaciones principales
- los complementos de canal ejecutan la acción final a través de su adaptador de acción

Para los complementos de canal, la superficie del SDK es `ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento unificada permite que un complemento devuelva sus acciones visibles, capacidades y contribuciones de esquema juntas para que esas piezas no se separen.

Cuando un parámetro de herramienta de mensaje específico del canal lleva una fuente de medios, como una ruta local o una URL de medios remota, el complemento también debe devolver `mediaSourceParams` de `describeMessageTool(...)`. El núcleo usa esa lista explícita para aplicar la normalización de ruta de sandbox y sugerencias de acceso a medios salientes sin codificar nombres de parámetros propiedad del complemento. Se prefieren mapas con ámbito de acción allí, no una lista plana para todo el canal, de modo que un parámetro de media solo para perfil no se normalice en acciones no relacionadas como `send`.

El núcleo pasa el ámbito de tiempo de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- entrada confiable `requesterSenderId`

Esto es importante para los complementos sensibles al contexto. Un canal puede ocultar o exponer acciones de mensaje basándose en la cuenta activa, la sala/hilo/mensaje actual, o la identidad del solicitante confiable sin codificar ramas específicas del canal en la herramienta `message` del núcleo.

Esta es la razón por la que los cambios de enrutamiento del ejecutor integrado (embedded-runner) siguen siendo trabajo del complemento: el ejecutor es responsable de reenviar la identidad actual del chat/sesión al límite de descubrimiento del complemento para que la herramienta compartida `message` exponga la superficie propiedad del canal correcta para el turno actual.

Para los asistentes de ejecución propiedad del canal, los complementos integrados deben mantener el tiempo de ejecución de ejecución dentro de sus propios módulos de extensión. Core ya no es propietario de los tiempos de ejecución de acciones de mensaje de Discord, Slack, Telegram o WhatsApp en `src/agents/tools`. No publicamos subrutas `plugin-sdk/*-action-runtime` separadas, y los complementos integrados deben importar su propio código de tiempo de ejecución local directamente desde sus módulos propiedad de la extensión.

El mismo límite se aplica a las costuras del SDK nombradas por el proveedor en general: core no debe importar barriles de convenencia específicos del canal para Slack, Discord, Signal, WhatsApp o extensiones similares. Si core necesita un comportamiento, consuma el barril `api.ts` / `runtime-api.ts` del propio complemento integrado o promueva la necesidad a una capacidad genérica estrecha en el SDK compartido.

Los complementos integrados siguen la misma regla. El `runtime-api.ts` de un complemento integrado no debe volver a exportar su propia fachada `openclaw/plugin-sdk/<plugin-id>` con marca. Esas fachadas con marca siguen siendo shims de compatibilidad para complementos externos y consumidores más antiguos, pero los complementos integrados deben usar exportaciones locales más subrutas de SDK genéricas estrechas como `openclaw/plugin-sdk/channel-policy`, `openclaw/plugin-sdk/runtime-store` o `openclaw/plugin-sdk/webhook-ingress`. El código nuevo no debe agregar fachadas de SDK específicas del ID del complemento a menos que el límite de compatibilidad para un ecosistema externo existente lo requiera.

Para las encuestas específicamente, hay dos rutas de ejecución:

- `outbound.sendPoll` es la línea base compartida para los canales que se ajustan al modelo de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para la semántica de encuesta específica del canal o parámetros de encuesta adicionales

Core ahora difiere el análisis compartido de encuestas hasta después de que el envío de encuestas del complemento decline la acción, para que los controladores de encuesta propiedad del complemento puedan aceptar campos de encuesta específicos del canal sin ser bloqueados primero por el analizador de encuestas genérico.

Consulte [Elementos internos de la arquitectura de complementos](/es/plugins/architecture-internals) para conocer la secuencia de inicio completa.

## Modelo de propiedad de capacidades

OpenClaw trata un complemento nativo como el límite de propiedad para una **empresa** o una **característica**, no como un conjunto de integraciones no relacionadas.

Esto significa:

- un complemento de empresa generalmente debe ser propietario de todas las superficies de esa empresa orientadas a OpenClaw
- un complemento de característica generalmente debe ser propietario de la superficie completa de la característica que introduce
- los canales deben consumir capacidades centrales compartidas en lugar de volver a implementar el comportamiento del proveedor ad hoc

<AccordionGroup>
  <Accordion title="Proveedor de múltiples capacidades">
    `openai` es propietario de la inferencia de texto, voz, voz en tiempo real, comprensión de medios y generación de imágenes. `google` es propietario de la inferencia de texto, además de la comprensión de medios, la generación de imágenes y la búsqueda web. `qwen` es propietario de la inferencia de texto, además de la comprensión de medios y la generación de video.
  </Accordion>
  <Accordion title="Proveedor de capacidad única">`elevenlabs` y `microsoft` son propietarios de la voz; `firecrawl` es propietario de la obtención web; `minimax` / `mistral` / `moonshot` / `zai` son propietarios de los backends de comprensión de medios.</Accordion>
  <Accordion title="Complemento de característica">`voice-call` es propietario del transporte de llamadas, herramientas, CLI, rutas y puente de flujo de medios de Twilio, pero consume capacidades compartidas de voz, transcripción en tiempo real y voz en tiempo real en lugar de importar complementos de proveedor directamente.</Accordion>
</AccordionGroup>

El estado final deseado es:

- OpenAI reside en un solo complemento incluso si abarca modelos de texto, voz, imágenes y video futuro
- otro proveedor puede hacer lo mismo con su propia superficie
- a los canales no les importa qué complemento de proveedor es propietario del proveedor; consumen el contrato de capacidad compartida expuesto por el núcleo

Esta es la distinción clave:

- **complemento** = límite de propiedad
- **capacidad** = contrato principal que varios complementos pueden implementar o consumir

Por lo tanto, si OpenClaw añade un nuevo dominio como el video, la primera pregunta no es "¿qué proveedor debería codificar el manejo de video?". La primera pregunta es "¿cuál es el contrato principal de capacidad de video?". Una vez que existe ese contrato, los complementos del proveedor pueden registrarse en él y los complementos de canal/característica pueden consumirlo.

Si la capacidad aún no existe, el movimiento correcto suele ser:

<Steps>
  <Step title="Definir la capacidad">Definir la capacidad faltante en el núcleo.</Step>
  <Step title="Exponer a través del SDK">Exponerla a través de la API/tiempo de ejecución del complemento de una manera tipada.</Step>
  <Step title="Conectar consumidores">Conectar canales/características contra esa capacidad.</Step>
  <Step title="Implementaciones de proveedor">Permitir que los complementos del proveedor registren implementaciones.</Step>
</Steps>

Esto mantiene la propiedad explícita mientras se evita un comportamiento central que dependa de un solo proveedor o una ruta de código específica de un complemento de una sola vez.

### Capas de capacidad

Use este modelo mental al decidir a dónde pertenece el código:

<Tabs>
  <Tab title="Capa de capacidad central">Orquestación compartida, políticas, respaldo, reglas de fusión de configuración, semántica de entrega y contratos tipados.</Tab>
  <Tab title="Capa de complemento de proveedor">APIs específicas del proveedor, autenticación, catálogos de modelos, síntesis de voz, generación de imágenes, backends de video futuros, puntos finales de uso.</Tab>
  <Tab title="Capa de complemento de canal/característica">Integración de Slack/Discord/llamada de voz/etc. que consume capacidades centrales y las presenta en una superficie.</Tab>
</Tabs>

Por ejemplo, TTS sigue esta forma:

- el núcleo posee la política de TTS en el momento de la respuesta, el orden de respaldo, las preferencias y la entrega del canal
- `openai`, `elevenlabs` y `microsoft` poseen implementaciones de síntesis
- `voice-call` consume el asistente de tiempo de ejecución de TTS de telefonía

Ese mismo patrón debe preferirse para futuras capacidades.

### Ejemplo de complemento de empresa con múltiples capacidades

Un complemento de la empresa debe parecer cohesivo desde el exterior. Si OpenClaw tiene contratos compartidos para modelos, voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de video, obtención web y búsqueda web, un proveedor puede ser propietario de todas sus superficies en un solo lugar:

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

Lo que importa no son los nombres exactos de los auxiliares. Lo que importa es la forma:

- un complemento posee la superficie del proveedor
- el núcleo sigue siendo el propietario de los contratos de capacidad
- los canales y los complementos de funciones consumen los auxiliares `api.runtime.*`, no el código del proveedor
- las pruebas de contrato pueden asegurar que el complemento registró las capacidades que afirma poseer

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad compartida. El mismo modelo de propiedad se aplica allí:

<Steps>
  <Step title="Core defines the contract">El núcleo define el contrato de comprensión de medios.</Step>
  <Step title="Vendor plugins register">Los complementos del proveedor registran `describeImage`, `transcribeAudio` y `describeVideo` según corresponda.</Step>
  <Step title="Consumers use the shared behavior">Los canales y los complementos de funciones consumen el comportamiento central compartido en lugar de conectarse directamente al código del proveedor.</Step>
</Steps>

Eso evita incorporar los supuestos de video de un proveedor en el núcleo. El complemento posee la superficie del proveedor; el núcleo posee el contrato de capacidad y el comportamiento de reserva.

La generación de video ya usa esa misma secuencia: el núcleo posee el contrato de capacidad tipificado y el auxiliar de tiempo de ejecución, y los complementos del proveedor registran implementaciones `api.registerVideoGenerationProvider(...)` contra él.

¿Necesita una lista de verificación de implementación concreta? Consulte el [Libro de recetas de capacidades](/es/tools/capability-cookbook).

## Contratos y cumplimiento

La superficie de la API del complemento está tipificada intencionalmente y centralizada en `OpenClawPluginApi`. Ese contrato define los puntos de registro admitidos y los auxiliares de tiempo de ejecución en los que un complemento puede confiar.

Por qué esto importa:

- los autores de complementos obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos complementos que registran el mismo ID de proveedor
- el inicio puede proporcionar diagnósticos accionables para registros con formato incorrecto
- las pruebas de contrato pueden hacer cumplir la propiedad del complemento incluido y evitar la deriva silenciosa

Hay dos capas de cumplimiento:

<AccordionGroup>
  <Accordion title="Cumplimiento del registro en tiempo de ejecución">El registro de complementos valida los registros a medida que se cargan los complementos. Ejemplos: los identificadores de proveedor duplicados, los identificadores de proveedor de voz duplicados y los registros con formato incorrecto generan diagnósticos de complementos en lugar de un comportamiento indefinido.</Accordion>
  <Accordion title="Pruebas de contrato">Los complementos incluidos se capturan en registros de contratos durante las ejecuciones de pruebas para que OpenClaw pueda afirmar la propiedad de manera explícita. Hoy esto se utiliza para proveedores de modelos, proveedores de voz, proveedores de búsqueda web y propiedad de registros incluidos.</Accordion>
</AccordionGroup>

El efecto práctico es que OpenClaw sabe, de antemano, qué complemento posee qué superficie. Eso permite que el núcleo y los canales se compongan sin problemas porque la propiedad se declara, se tipifica y se puede probar en lugar de ser implícita.

### Qué pertenece a un contrato

<Tabs>
  <Tab title="Buenos contratos">
    - tipificados
    - pequeños
    - específicos de la capacidad
    - propiedad del núcleo
    - reutilizables por múltiples complementos
    - consumibles por canales/características sin conocimiento del proveedor

  </Tab>
  <Tab title="Malos contratos">
    - política específica del proveedor oculta en el núcleo
    - salidas de emergencia de complementos únicas que evitan el registro
    - código de canal que llega directamente a una implementación de proveedor
    - objetos de tiempo de ejecución ad hoc que no forman parte de `OpenClawPluginApi` o `api.runtime`

  </Tab>
</Tabs>

En caso de duda, eleve el nivel de abstracción: defina primero la capacidad y luego permita que los complementos se conecten a ella.

## Modelo de ejecución

Los complementos nativos de OpenClaw se ejecutan **en el mismo proceso** que la puerta de enlace. No están aislados. Un complemento nativo cargado tiene el mismo límite de confianza a nivel de proceso que el código principal.

<Warning>Implicaciones de los complementos nativos: un complemento puede registrar herramientas, controladores de red, enlaces y servicios; un error en un complemento puede bloquear o desestabilizar la puerta de enlace; y un complemento nativo malicioso es equivalente a la ejecución de código arbitrario dentro del proceso de OpenClaw.</Warning>

Los paquetes compatibles son más seguros de manera predeterminada porque OpenClaw actualmente los trata como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades (skills) agrupadas.

Utilice listas de permitidos (allowlists) y rutas de instalación/carga explícitas para complementos no agrupados. Trate los complementos del espacio de trabajo como código de tiempo de desarrollo, no como valores predeterminados de producción.

Para los nombres de paquetes del espacio de trabajo agrupados, mantenga el identificador del complemento anclado en el nombre de npm: `@openclaw/<id>` de manera predeterminada, o un sufijo de tipo aprobado como `-provider`, `-plugin`, `-speech`, `-sandbox`, o `-media-understanding` cuando el paquete expone intencionalmente una función de complemento más estrecha.

<Note>
  **Nota de confianza:** `plugins.allow` confía en los **identificadores de complementos**, no en el origen de la fuente. Un complemento del espacio de trabajo con el mismo identificador que un complemento agrupado oculta intencionalmente la copia agrupada cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos. Esto es normal y útil para el desarrollo local, las
  pruebas de parches y las revisiones urgentes. La confianza de los complementos agrupados se resuelve a partir de la instantánea de la fuente (el manifiesto y el código en el disco en el momento de la carga) en lugar de los metadatos de instalación. Un registro de instalación corrupto o sustituido no puede ampliar silenciosamente la superficie de confianza de un complemento agrupado más allá de
  lo que reclama la fuente real.
</Note>

## Límite de exportación

OpenClaw exporta capacidades, no conveniencias de implementación.

Mantenga el registro de capacidades público. Reduzca las exportaciones de ayuda auxiliares no contractuales:

- subrutas de ayuda auxiliares específicas de complementos agrupados
- subrutas de infraestructura (plumbing) de tiempo de ejecución no destinadas a ser una API pública
- ayudas auxiliares de conveniencia específicas del proveedor
- ayudas auxiliares de configuración/incorporación que son detalles de implementación

Las subrutas de ayuda auxiliares reservadas para complementos agrupados se han retirado del mapa de exportación del SDK generado. Mantenga las ayudas auxiliares específicas del propietario dentro del paquete del complemento propietario; promueva solo el comportamiento reutilizable del host a contratos genéricos del SDK como `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` y `plugin-sdk/plugin-config-runtime`.

## Interno y referencia

Para la canalización de carga, el modelo de registro, los enlaces de tiempo de ejecución del proveedor, las rutas HTTP de Gateway, los esquemas de herramientas de mensajes, la resolución de objetivos de canal, los catálogos de proveedores, los complementos del motor de contexto y la guía para agregar una nueva capacidad, consulte [Plugin architecture internals](/es/plugins/architecture-internals).

## Relacionado

- [Building plugins](/es/plugins/building-plugins)
- [Plugin manifest](/es/plugins/manifest)
- [Plugin SDK setup](/es/plugins/sdk-setup)
