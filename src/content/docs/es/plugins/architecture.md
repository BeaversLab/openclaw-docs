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

Use `openclaw plugins inspect <id>` para ver la forma y el desglose de capacidades de un complemento. Consulte [Referencia de la CLI](/es/cli/plugins#inspect) para obtener más detalles.

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
  <Step title="Runtime loading">
    Los complementos nativos de OpenClaw se cargan en el proceso y registran capacidades en un registro central. El JavaScript empaquetado se carga a través del `require` nativo; el TypeScript de código fuente local de terceros es la alternativa de emergencia de Jiti. Los paquetes compatibles se normalizan en registros del registro sin importar el código de tiempo de ejecución.
  </Step>
  <Step title="Consumo de la superficie">El resto de OpenClaw lee el registro para exponer herramientas, canales, configuración de proveedores, ganchos, rutas HTTP, comandos CLI y servicios.</Step>
</Steps>

Para la CLI de complementos específicamente, el descubrimiento de comandos raíz se divide en dos fases:

- los metadatos del tiempo de análisis provienen de `registerCli(..., { descriptors: [...] })`
- el módulo real de la CLI del complemento puede permanecer diferido y registrarse en la primera invocación

Eso mantiene el código de la CLI propiedad del complemento dentro del complemento, al mismo tiempo que permite a OpenClaw reservar nombres de comandos raíz antes del análisis.

El límite de diseño importante:

- la validación de manifiesto/configuración debería funcionar desde **metadatos de manifiesto/esquema** sin ejecutar código del complemento
- el descubrimiento de capacidades nativas puede cargar código de entrada de complemento confiable para construir una instantánea de registro no activadora
- el comportamiento del tiempo de ejecución nativo proviene de la ruta `register(api)` del módulo del complemento con `api.registrationMode === "full"`

Esa división permite a OpenClaw validar la configuración, explicar los complementos faltantes/deshabilitados y crear sugerencias de interfaz de usuario/esquema antes de que el tiempo de ejecución completo esté activo.

### Instantánea de metadatos del complemento y tabla de búsqueda

El inicio de Gateway construye un `PluginMetadataSnapshot` para la instantánea de configuración actual. La instantánea es solo de metadatos: almacena el índice de complementos instalados, el registro de manifiestos, el diagnóstico de manifiestos, los mapas de propietarios, un normalizador de ID de complemento y los registros de manifiesto. No contiene módulos de complemento cargados, SDKs de proveedores, contenidos de paquetes ni exportaciones en tiempo de ejecución.

La validación de configuración con conocimiento de complementos, la activación automática al inicio y el arranque de complementos de Gateway consumen esa instantánea en lugar de reconstruir los metadatos de manifiesto/índice de forma independiente. `PluginLookUpTable` se deriva de la misma instantánea y añade el plan de inicio de complementos para la configuración en tiempo de ejecución actual.

Tras el inicio, Gateway mantiene la instantánea de metadatos actual como un producto reemplazable en tiempo de ejecución. El descubrimiento repetido del proveedor en tiempo de ejecución puede tomar prestada esa instantánea en lugar de reconstruir el índice instalado y el registro de manifiestos para cada paso del catálogo de proveedores. La instantánea se borra o reemplaza al apagar Gateway, cambiar el inventario de configuración/complementos y escribir en el índice instalado; los llamadores vuelven a la ruta en frío de manifiesto/índice cuando no existe una instantánea actual compatible. Las comprobaciones de compatibilidad deben incluir raíces de descubrimiento de complementos como `plugins.load.paths` y el espacio de trabajo del agente predeterminado, porque los complementos del espacio de trabajo forman parte del ámbito de metadatos.

La instantánea y la tabla de búsqueda mantienen las decisiones de inicio repetidas en la ruta rápida:

- propiedad del canal
- inicio diferido del canal
- ids de complementos de inicio
- propiedad del proveedor y del backend de CLI
- configuración del proveedor, alias de comando, proveedor del catálogo de modelos y propiedad del contrato de manifiesto
- validación del esquema de configuración del complemento y del esquema de configuración del canal
- decisiones de habilitación automática al inicio

El límite de seguridad es el reemplazo de la instantánea, no la mutación. Reconstruya la instantánea cuando cambie la configuración, el inventario de complementos, los registros de instalación o la política de índice persistente. No la trate como un registro global mutable amplio y no mantenga instantáneas históricas ilimitadas. La carga de complementos en tiempo de ejecución permanece separada de las instantáneas de metadatos para que el estado de tiempo de ejecución obsoleto no pueda ocultarse detrás de un caché de metadatos.

La regla de la caché está documentada en [Plugin architecture internals](/es/plugins/architecture-internals#plugin-cache-boundary): los metadatos de manifiesto y descubrimiento están actualizados a menos que quien llama mantenga una instantánea explícita, una tabla de búsqueda o un registro de manifiesto para el flujo actual. Las cachés de metadatos ocultos y los TTL de reloj de pared no forman parte de la carga de complementos. Solo las cachés del cargador de tiempo de ejecución, de módulos y de artefactos de dependencia pueden persistir después de que se cargue realmente el código o los artefactos instalados.

Algunos llamadores de ruta en frío todavía reconstruyen los registros de manifiestos directamente desde el índice persistente de complementos instalados en lugar de recibir un Gateway `PluginLookUpTable`. Esa ruta ahora reconstruye el registro bajo demanda; se prefiere pasar la tabla de búsqueda actual o un registro de manifiestos explícito a través de los flujos de tiempo de ejecución cuando quien llama ya tiene uno.

### Planificación de la activación

La planificación de activación es parte del plano de control. Los solicitantes pueden preguntar qué complementos son relevantes para un comando, proveedor, canal, ruta, arnés de agente o capacidad concretos antes de cargar registros de tiempo de ejecución más amplios.

El planificador mantiene compatible el comportamiento del manifiesto actual:

- Los campos `activation.*` son sugerencias explícitas del planificador
- `providers`, `channels`, `commandAliases`, `setup.providers`, `contracts.tools` y los ganchos siguen siendo un respaldo de propiedad del manifiesto
- la API del planificador de solo identificadores permanece disponible para los solicitantes existentes
- la API de plan informa etiquetas de motivo para que los diagnósticos puedan distinguir sugerencias explícitas del respaldo de propiedad

<Warning>No trate `activation` como un enlace de ciclo de vida o un reemplazo para `register(...)`. Son metadatos utilizados para reducir la carga. Prefiera los campos de propiedad cuando ya describan la relación; use `activation` solo para sugerencias adicionales del planificador.</Warning>

### Complementos de canal y la herramienta de mensajes compartidos

Los complementos de canal no necesitan registrar una herramienta separada de enviar/editar/reaccionar para las acciones normales de chat. OpenClaw mantiene una herramienta compartida `message` en el núcleo, y los complementos de canal son propietarios del descubrimiento y ejecución específicos del canal detrás de ella.

El límite actual es:

- el núcleo es propietario del host de la herramienta compartida `message`, el cableado del prompt, el mantenimiento de registros de sesión/hilo y el envío de la ejecución
- los complementos de canal son propietarios del descubrimiento de acciones con ámbito, el descubrimiento de capacidades y cualquier fragmento de esquema específico del canal
- los complementos de canal poseen la gramática de conversación de sesión específica del proveedor, como los identificadores de conversación codifican los identificadores de hilo o heredan de conversaciones principales
- los complementos de canal ejecutan la acción final a través de su adaptador de acción

Para los complementos de canal, la superficie del SDK es `ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento unificada permite que un complemento devuelva sus acciones visibles, capacidades y contribuciones de esquema juntas para que esas piezas no se separen.

Cuando un parámetro de herramienta de mensajes específico del canal lleva una fuente de medios, como una ruta local o una URL de medios remota, el complemento también debe devolver `mediaSourceParams` desde `describeMessageTool(...)`. Core usa esa lista explícita para aplicar la normalización de rutas del sandbox e indicaciones de acceso a medios salientes sin codificar los nombres de parámetros propiedad del complemento. Se prefieren mapas con ámbito de acción allí, no una lista plana para todo el canal, de modo que un parámetro de medios solo para el perfil no se normalice en acciones no relacionadas como `send`.

Core pasa el ámbito de tiempo de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- entrada confiable `requesterSenderId`

Eso es importante para los complementos sensibles al contexto. Un canal puede ocultar o exponer acciones de mensajes basándose en la cuenta activa, la sala/hilo/mensaje actual o la identidad solicitante de confianza sin codificar de forma rígida ramas específicas del canal en la herramienta principal `message`.

Por eso los cambios de enrutamiento del ejecutor integrado siguen siendo trabajo del complemento: el ejecutor es responsable de reenviar la identidad del chat/sesión actual al límite de descubrimiento del complemento para que la herramienta compartida `message` exponga la superficie propiedad del canal correcta para el turno actual.

Para los asistentes de ejecución propiedad del canal, los complementos empaquetados deben mantener el tiempo de ejecución de ejecución dentro de sus propios módulos de extensión. Core ya no es propietario de los tiempos de ejecución de acciones de mensajes de Discord, Slack, Telegram o WhatsApp bajo `src/agents/tools`. No publicamos subrutas `plugin-sdk/*-action-runtime` separadas, y los complementos empaquetados deben importar su propio código de tiempo de ejecución local directamente desde sus módulos propiedad de la extensión.

El mismo límite se aplica a las costuras del SDK nombradas por el proveedor en general: core no debe importar barriles de convenencia específicos del canal para Slack, Discord, Signal, WhatsApp o extensiones similares. Si core necesita un comportamiento, consuma el barril `api.ts` / `runtime-api.ts` del propio complemento empaquetado o promueva la necesidad a una capacidad genérica estrecha en el SDK compartido.

Los complementos agrupados siguen la misma regla. El `runtime-api.ts` de un complemento agrupado no debe reexportar su propia fachada `openclaw/plugin-sdk/<plugin-id>` con marca. Esas fachadas con marca siguen siendo caparazones de compatibilidad para complementos externos y consumidores antiguos, pero los complementos agrupados deben usar exportaciones locales más subrutas genéricas y estrechas del SDK como `openclaw/plugin-sdk/channel-policy`, `openclaw/plugin-sdk/runtime-store` o `openclaw/plugin-sdk/webhook-ingress`. El código nuevo no debe agregar fachadas del SDK específicas del ID del complemento a menos que el límite de compatibilidad para un ecosistema externo existente lo requiera.

Para las encuestas específicamente, hay dos rutas de ejecución:

- `outbound.sendPoll` es la línea base compartida para los canales que se ajustan al modelo de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para semánticas de encuesta específicas del canal o parámetros de encuesta adicionales

Core ahora difiere el análisis compartido de encuestas hasta que el envío de encuestas del complemento decline la acción, de modo que los controladores de encuestas propiedad del complemento puedan aceptar campos de encuesta específicos del canal sin ser bloqueados primero por el analizador de encuestas genérico.

Consulte [Plugin architecture internals](/es/plugins/architecture-internals) para obtener la secuencia completa de inicio.

## Modelo de propiedad de capacidades

OpenClaw trata un complemento nativo como el límite de propiedad para una **compañía** o una **característica**, no como una bolsa de integraciones no relacionadas.

Esto significa:

- un complemento de empresa generalmente debería ser propietario de todas las superficies de esa empresa orientadas a OpenClaw
- un complemento de características generalmente debería ser propietario de la superficie completa de la característica que introduce
- los canales deben consumir capacidades centrales compartidas en lugar de reimplementar el comportamiento del proveedor ad hoc

<AccordionGroup>
  <Accordion title="Proveedor con múltiples capacidades">
    `openai` es propietario de la inferencia de texto, voz, voz en tiempo real, comprensión de medios y generación de imágenes. `google` es propietario de la inferencia de texto más comprensión de medios, generación de imágenes y búsqueda web. `qwen` es propietario de la inferencia de texto más comprensión de medios y generación de video.
  </Accordion>
  <Accordion title="Proveedor con capacidad única">`elevenlabs` y `microsoft` son propietarios de la voz; `firecrawl` es propietario de la captura web; `minimax` / `mistral` / `moonshot` / `zai` son propietarios de los motores de comprensión de medios.</Accordion>
  <Accordion title="Feature plugin">`voice-call` posee el transporte de llamadas, las herramientas, la CLI, las rutas y el puente de transmisión de medios de Twilio, pero consume capacidades compartidas de voz, transcripción en tiempo real y voz en tiempo real en lugar de importar complementos de proveedores directamente.</Accordion>
</AccordionGroup>

El estado final previsto es:

- OpenAI vive en un solo complemento incluso si abarca modelos de texto, voz, imágenes y video futuro
- otro proveedor puede hacer lo mismo con su propia superficie
- los canales no les importa qué complemento de proveedor posee el proveedor; consumen el contrato de capacidad compartida expuesto por core

Esta es la distinción clave:

- **complemento** = límite de propiedad
- **capacidad** = contrato central que varios complementos pueden implementar o consumir

Así que si OpenClaw añade un nuevo dominio como video, la primera pregunta no es "¿qué proveedor debería codificar el manejo de video?". La primera pregunta es "¿cuál es el contrato de capacidad de video central?". Una vez que existe ese contrato, los complementos del proveedor pueden registrarse en él y los complementos de canal/características pueden consumirlo.

Si la capacidad aún no existe, el movimiento correcto suele ser:

<Steps>
  <Step title="Define la capacidad">Define la capacidad que falta en el núcleo.</Step>
  <Step title="Exponer a través del SDK">Expónla a través de la API/tiempo de ejecución del complemento de una manera tipada.</Step>
  <Step title="Conectar consumidores">Conecta canales/características contra esa capacidad.</Step>
  <Step title="Implementaciones de proveedores">Permite que los complementos de proveedores registren implementaciones.</Step>
</Steps>

Esto mantiene la propiedad explícita y evita el comportamiento central que dependa de un único proveedor o una ruta de código específica de un complemento ad hoc.

### Capas de capacidades

Use este modelo mental al decidir dónde pertenece el código:

<Tabs>
  <Tab title="Capa de capacidad central">Orquestación compartida, políticas, reserva, reglas de combinación de configuración, semántica de entrega y contratos tipados.</Tab>
  <Tab title="Capa de complementos de proveedores">APIs específicas del proveedor, autenticación, catálogos de modelos, síntesis de voz, generación de imágenes, backends de video futuros, puntos de conexión de uso.</Tab>
  <Tab title="Channel/feature plugin layer">Integración de Slack/Discord/llamada de voz/etc. que consume capacidades principales y las presenta en una superficie.</Tab>
</Tabs>

Por ejemplo, TTS sigue esta forma:

- core posee la política de TTS en el momento de la respuesta, el orden de reserva, las preferencias y la entrega del canal
- `openai`, `elevenlabs` y `microsoft` poseen implementaciones de síntesis
- `voice-call` consume el asistente de ejecución de TTS de telefonía

Ese mismo patrón debe preferirse para capacidades futuras.

### Ejemplo de complemento de empresa con múltiples capacidades

Un complemento de empresa debe parecer cohesivo desde el exterior. Si OpenClaw tiene contratos compartidos para modelos, voz, transcripción en tiempo real, voz en tiempo real, comprensión de medios, generación de imágenes, generación de video, obtención web y búsqueda web, un proveedor puede ser propietario de todas sus superficies en un solo lugar:

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

Lo que importa no son los nombres exactos de los auxiliares. Lo importante es la forma:

- un complemento posee la superficie del proveedor
- core sigue siendo el propietario de los contratos de capacidades
- los canales y los complementos de características consumen los auxiliares `api.runtime.*`, no el código del proveedor
- las pruebas de contrato pueden afirmar que el complemento registró las capacidades que dice poseer

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad compartida. El mismo modelo de propiedad se aplica allí:

<Steps>
  <Step title="Core defines the contract">Core define el contrato de comprensión de medios.</Step>
  <Step title="Registro de complementos de proveedor">Los complementos de proveedor registran `describeImage`, `transcribeAudio` y `describeVideo` según corresponda.</Step>
  <Step title="Los consumidores utilizan el comportamiento compartido">Los canales y los complementos de funciones consumen el comportamiento principal compartido en lugar de conectarse directamente al código del proveedor.</Step>
</Steps>

Eso evita incorporar las suposiciones de video de un proveedor en el núcleo. El complemento posee la superficie del proveedor; el núcleo posee el contrato de capacidad y el comportamiento de reserva.

La generación de video ya utiliza esa misma secuencia: el núcleo posee el contrato de capacidad tipificado y el asistente de tiempo de ejecución, y los complementos de proveedor registran implementaciones `api.registerVideoGenerationProvider(...)` contra él.

¿Necesitas una lista de verificación de implementación concreta? Consulta [Libro de recetas de capacidades](/es/tools/capability-cookbook).

## Contratos y cumplimiento

La superficie de la API del complemento está tipificada intencionalmente y centralizada en `OpenClawPluginApi`. Ese contrato define los puntos de registro admitidos y las asistentes de tiempo de ejecución en los que un complemento puede confiar.

Por qué esto es importante:

- los autores de complementos obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos complementos registrando el mismo id de proveedor
- el inicio puede mostrar diagnósticos procesables para registros malformados
- las pruebas de contrato pueden hacer cumplir la propiedad del complemento empaquetado y prevenir desviaciones silenciosas

Hay dos niveles de cumplimiento:

<AccordionGroup>
  <Accordion title="Runtime registration enforcement">El registro de complementos valida los registros a medida que se cargan los complementos. Ejemplos: los ID de proveedor duplicados, los ID de proveedor de voz duplicados y los registros con formato incorrecto generan diagnósticos de complementos en lugar de un comportamiento indefinido.</Accordion>
  <Accordion title="Contract tests">Los complementos empaquetados se capturan en registros de contratos durante las ejecuciones de pruebas para que OpenClaw pueda afirmar la propiedad explícitamente. Hoy en día, esto se utiliza para proveedores de modelos, proveedores de voz, proveedores de búsqueda web y la propiedad de registros empaquetados.</Accordion>
</AccordionGroup>

El efecto práctico es que OpenClaw sabe, de antemano, qué complemento posee qué superficie. Esto permite que el núcleo y los canales se compongan perfectamente porque la propiedad se declara, se tipifica y se puede probar, en lugar de ser implícita.

### Qué pertenece a un contrato

<Tabs>
  <Tab title="Buenos contratos">
    - con tipo
    - pequeño
    - específico de la capacidad
    - propiedad del núcleo
    - reutilizable por múltiples plugins
    - consumible por canales/características sin conocimiento del proveedor

  </Tab>
  <Tab title="Malos contratos">
    - política específica del proveedor oculta en el núcleo
    - escapes de plugin únicos que omiten el registro
    - código de canal que accede directamente a una implementación de proveedor
    - objetos de tiempo de ejecución ad hoc que no forman parte de `OpenClawPluginApi` o `api.runtime`

  </Tab>
</Tabs>

En caso de duda, eleva el nivel de abstracción: define primero la capacidad y luego deja que los plugins se conecten a ella.

## Modelo de ejecución

Los plugins nativos de OpenClaw se ejecutan **en proceso** con el Gateway. No están aislados. Un plugin nativo cargado tiene el mismo límite de confianza a nivel de proceso que el código principal.

<Warning>Implicaciones del plugin nativo: un plugin puede registrar herramientas, controladores de red, ganchos y servicios; un error en un plugin puede bloquear o desestabilizar la pasarela; y un plugin nativo malicioso equivale a la ejecución de código arbitrario dentro del proceso de OpenClaw.</Warning>

Los paquetes compatibles son más seguros de forma predeterminada porque OpenClaw actualmente los trata como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente habilidades empaquetadas.

Utiliza listas de permitidos y rutas de instalación/carga explícitas para los complementos no agrupados. Trata los complementos del espacio de trabajo como código de tiempo de desarrollo, no como valores predeterminados de producción.

Para los nombres de paquetes del espacio de trabajo agrupados, mantén el id del complemento anclado en el nombre de npm: `@openclaw/<id>` de forma predeterminada, o un sufijo de tipo aprobado como `-provider`, `-plugin`, `-speech`, `-sandbox`, o `-media-understanding` cuando el paquete expone intencionalmente un rol de complemento más limitado.

<Note>
  **Nota de confianza:** `plugins.allow` confía en los **ids de los complementos**, no en el origen del código fuente. Un complemento del espacio de trabajo con el mismo id que un complemento agrupado oculta intencionalmente la copia agrupada cuando ese complemento del espacio de trabajo está habilitado/en la lista de permitidos. Esto es normal y útil para el desarrollo local, las pruebas de
  parches y las revisiones urgentes. La confianza de los complementos agrupados se resuelve a partir de la instantánea del origen: el manifiesto y el código en el disco en el momento de la carga, en lugar de los metadatos de instalación. Un registro de instalación corrupto o sustituido no puede ampliar silenciosamente la superficie de confianza de un complemento agrupado más allá de lo que reclama
  el origen real.
</Note>

## Límite de exportación

OpenClaw exporta capacidades, no facilidades de implementación.

Mantén el registro de capacidades público. Elimina las exportaciones de ayuda que no son parte del contrato:

- subrutas de ayuda específicas de complementos agrupados
- subrutas de conexión interna (plumbing) en tiempo de ejecución no destinadas a ser una API pública
- ayudas de convenencia específicas del proveedor
- ayudas de configuración/incorporación que son detalles de implementación

Las subrutas de ayuda reservadas para complementos agrupados se han retirado del mapa de exportación del SDK generado. Mantén las ayudas específicas del propietario dentro del paquete del complemento propietario; promueve solo el comportamiento reutilizable del host a contratos genéricos del SDK como `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime` y `plugin-sdk/plugin-config-runtime`.

## Aspectos internos y referencia

Para conocer la canalización de carga, el modelo de registro, los enlaces de tiempo de ejecución del proveedor, las rutas HTTP de la puerta de enlace, los esquemas de herramientas de mensajes, la resolución de objetivos del canal, los catálogos de proveedores, los complementos del motor de contexto y la guía para agregar una nueva capacidad, consulta [Aspectos internos de la arquitectura de complementos](/es/plugins/architecture-internals).

## Relacionado

- [Creación de complementos](/es/plugins/building-plugins)
- [Manifiesto de plugin](/es/plugins/manifest)
- [Configuración del SDK de plugins](/es/plugins/sdk-setup)
