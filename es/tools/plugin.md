---
summary: "Plugins (Extensiones) de OpenClaw: descubrimiento, configuración y seguridad"
read_when:
  - Agregar o modificar plugins/extensiones
  - Documentar las reglas de instalación o carga de plugins
  - Trabajar con bundles de plugins compatibles con Codex/Claude
title: "Plugins"
---

# Plugins (Extensiones)

## Inicio rápido (¿nuevo en los plugins?)

Un plugin es:

- un **plugin nativo de OpenClaw** (`openclaw.plugin.json` + módulo de tiempo de ejecución), o
- un **bundle** compatible (`.codex-plugin/plugin.json` o `.claude-plugin/plugin.json`)

Ambos aparecen en `openclaw plugins`, pero solo los plugins nativos de OpenClaw ejecutan
código de tiempo de ejecución dentro del proceso.

La mayor parte del tiempo, usarás plugins cuando quieras una función que aún no esté integrada
en el núcleo de OpenClaw (o cuando quieras mantener las funciones opcionales fuera de tu instalación
principal).

Ruta rápida:

1. Ver qué ya está cargado:

```bash
openclaw plugins list
```

2. Instalar un plugin oficial (ejemplo: Llamada de voz):

```bash
openclaw plugins install @openclaw/voice-call
```

Las especificaciones de npm son solo de registro. Consulta [reglas de instalación](/es/cli/plugins#install) para
detalles sobre el fijado de versiones, el control de versiones preliminares y los formatos de especificación admitidos.

3. Reinicia el Gateway y luego configura en `plugins.entries.<id>.config`.

Consulta [Llamada de voz](/es/plugins/voice-call) para ver un ejemplo de plugin concreto.
¿Buscas listados de terceros? Consulta [Plugins de la comunidad](/es/plugins/community).
¿Necesitas los detalles de compatibilidad de los bundles? Consulta [Bundles de plugins](/es/plugins/bundles).

Para bundles compatibles, instala desde un directorio local o un archivo:

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

Para las instalaciones del marketplace de Claude, lista el marketplace primero y luego instala por
nombre de entrada del marketplace:

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw resuelve los nombres conocidos del marketplace de Claude desde
`~/.claude/plugins/known_marketplaces.json`. También puedes pasar una fuente explícita
del marketplace con `--marketplace`.

## Retrollamadas de vinculación de conversación

Los plugins que vinculan una conversación ahora pueden reaccionar cuando se resuelve una aprobación.

Usa `api.onConversationBindingResolved(...)` para recibir una retrollamada después de que una solicitud de vinculación
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

Campos de carga útil de la retrollamada:

- `status`: `"approved"` o `"denied"`
- `decision`: `"allow-once"`, `"allow-always"`, o `"deny"`
- `binding`: el enlace resuelto para las solicitudes aprobadas
- `request`: el resumen de la solicitud original, pista de separación, id. del remitente y
  metadatos de la conversación

Esta devolución de llamada es solo de notificación. No cambia quién tiene permiso para vincular una
conversación y se ejecuta después de que finaliza el manejo de la aprobación principal.

## Modelo de capacidad pública

Las capacidades son el modelo de **complemento nativo** público dentro de OpenClaw. Cada
complemento nativo de OpenClaw se registra en uno o más tipos de capacidad:

| Capacidad              | Método de registro                            | Complementos de ejemplo   |
| ---------------------- | --------------------------------------------- | ------------------------- |
| Inferencia de texto    | `api.registerProvider(...)`                   | `openai`, `anthropic`     |
| Voz                    | `api.registerSpeechProvider(...)`             | `elevenlabs`, `microsoft` |
| Comprensión multimedia | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google`        |
| Generación de imágenes | `api.registerImageGenerationProvider(...)`    | `openai`, `google`        |
| Búsqueda web           | `api.registerWebSearchProvider(...)`          | `google`                  |
| Canal / mensajería     | `api.registerChannel(...)`                    | `msteams`, `matrix`       |

Un complemento que registra cero capacidades pero proporciona enlaces, herramientas o
servicios es un complemento **solo de enlace heredado**. Ese patrón todavía es totalmente compatible.

### Postura de compatibilidad externa

El modelo de capacidad está integrado en el núcleo y es utilizado por los complementos integrados/nativos
hoy, pero la compatibilidad de complementos externos aún necesita un estándar más estricto que "está
exportado, por lo tanto está congelado".

Orientación actual:

- **complementos externos existentes:** mantener funcionando las integraciones basadas en enlaces; tratar
  esto como la línea base de compatibilidad
- **nuevos complementos integrados/nativos:** preferir el registro explícito de capacidades en lugar de
  extensiones específicas del proveedor o nuevos diseños solo de enlace
- **complementos externos que adopten el registro de capacidades:** permitido, pero tratar las
  superficies auxiliares específicas de la capacidad como en evolución a menos que los documentos marquen explícitamente un
  contrato como estable

Regla práctica:

- las API de registro de capacidades son la dirección prevista
- los enlaces heredados siguen siendo la ruta más segura sin interrupciones para los complementos externos durante
  la transición
- las subrutas de ayuda exportadas no son todas iguales; prefiera el contrato documentado específico, no las exportaciones de ayuda incidentales

### Formas de complemento (Plugin shapes)

OpenClaw clasifica cada complemento cargado en una forma basada en su comportamiento de registro real (no solo en metadatos estáticos):

- **plain-capability** — registra exactamente un tipo de capacidad (por ejemplo, un complemento solo de proveedor como `mistral`)
- **hybrid-capability** — registra múltiples tipos de capacidades (por ejemplo,
  `openai` posee inferencia de texto, voz, comprensión multimedia y generación
  de imágenes)
- **hook-only** — registra solo hooks (tipados o personalizados), sin capacidades,
  herramientas, comandos o servicios
- **non-capability** — registra herramientas, comandos, servicios o rutas, pero sin
  capacidades

Use `openclaw plugins inspect <id>` para ver la forma de un complemento y el desglose de su capacidad.
Vea [Referencia de CLI](/es/cli/plugins#inspect) para más detalles.

### Hooks heredados (Legacy hooks)

El hook `before_agent_start` sigue siendo compatible como una ruta de compatibilidad para
complementos solo de hooks. Los complementos heredados del mundo real todavía dependen de él.

Dirección:

- mantenerlo funcionando
- documentarlo como heredado
- preferir `before_model_resolve` para el trabajo de anulación de modelo/proveedor
- preferir `before_prompt_build` para el trabajo de mutación de indicaciones (prompt)
- eliminar solo después de que el uso real disminuya y la cobertura de pruebas demuestre la seguridad de la migración

### Señales de compatibilidad

Cuando ejecute `openclaw doctor` o `openclaw plugins inspect <id>`, puede ver
una de estas etiquetas:

| Señal                       | Significado                                                                |
| --------------------------- | -------------------------------------------------------------------------- |
| **config válida**           | La configuración se analiza bien y los complementos se resuelven           |
| **aviso de compatibilidad** | El complemento usa un patrón compatible pero antiguo (p. ej., `hook-only`) |
| **advertencia heredada**    | El complemento usa `before_agent_start`, que está obsoleto                 |
| **error grave**             | La configuración no es válida o el complemento falló al cargar             |

Ni `hook-only` ni `before_agent_start` romperán su complemento hoy —
`hook-only` es un aviso y `before_agent_start` solo activa una advertencia. Estas
señales también aparecen en `openclaw status --all` y `openclaw plugins doctor`.

## Arquitectura

El sistema de complementos de OpenClaw tiene cuatro capas:

1. **Manifiesto + descubrimiento**
   OpenClaw encuentra complementos candidatos desde rutas configuradas, raíces del espacio de trabajo,
   raíces de extensiones globales y extensiones empaquetadas. El descubrimiento lee manifiestos nativos de
   `openclaw.plugin.json` además de los manifiestos de paquetes compatibles primero.
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

El límite de diseño importante:

- el descubrimiento + validación de configuración debe funcionar desde **metadatos de manifiesto/esquema**
  sin ejecutar código del complemento
- el comportamiento de tiempo de ejecución nativo proviene de la ruta `register(api)` del módulo del complemento

Esa división permite a OpenClaw validar la configuración, explicar complementos faltantes/deshabilitados y
construir sugerencias de interfaz/esquema antes de que el tiempo de ejecución completo esté activo.

### Complementos de canal y la herramienta de mensajes compartida

Los complementos de canal no necesitan registrar una herramienta de enviar/editar/reaccionar separada para
las acciones de chat normales. OpenClaw mantiene una herramienta `message` compartida en el núcleo, y
los complementos de canal poseen el descubrimiento y ejecución específicos del canal detrás de ella.

El límite actual es:

- el núcleo posee el host de la herramienta `message` compartida, cableado de prompts, contabilidad
  de sesión/hilo y despacho de ejecución
- los complementos de canal poseen el descubrimiento de acciones con alcance, el descubrimiento de capacidades y cualquier
  fragmento de esquema específico del canal
- los complementos de canal ejecutan la acción final a través de su adaptador de acción

Para los complementos de canal, la superficie del SDK es
`ChannelMessageActionAdapter.describeMessageTool(...)`. Esa llamada de descubrimiento
unificada permite que un complemento devuelva sus acciones visibles, capacidades y contribuciones de esquema
juntas para que esas piezas no se separen.

Core pasa el ámbito de tiempo de ejecución a ese paso de descubrimiento. Los campos importantes incluyen:

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- `requesterSenderId` de entrada confiable

Esto es importante para los plugins sensibles al contexto. Un canal puede ocultar o exponer
acciones de mensajes basándose en la cuenta activa, la sala/hilo/mensaje actual, o
la identidad del solicitante de confianza sin codificar ramas específicas del canal en la
herramienta `message` principal.

Es por esto que los cambios de enrutamiento del ejecutor integrado siguen siendo trabajo de plugins: el ejecutor es
responsable de reenviar la identidad del chat/sesión actual hacia el límite de descubrimiento del plugin
para que la herramienta `message` compartida exponga la superficie
propiedad del canal correcta para el turno actual.

Para los auxiliares de ejecución propiedad del canal, los plugins empaquetados deben mantener el tiempo de ejecución
dentro de sus propios módulos de extensión. El núcleo ya no es propietario de los tiempos de ejecución
de acciones de mensajes de Discord,
Slack, Telegram o WhatsApp bajo `src/agents/tools`.
No publicamos subrutas `plugin-sdk/*-action-runtime` separadas, y los plugins
empaquetados deben importar su propio código de tiempo de ejecución local directamente desde sus
módulos propiedad de la extensión.

Para las encuestas específicamente, hay dos rutas de ejecución:

- `outbound.sendPoll` es la línea base compartida para canales que se ajustan al modelo
  de encuesta común
- `actions.handleAction("poll")` es la ruta preferida para semánticas
  de encuestas específicas del canal o parámetros de encuesta adicionales

El núcleo ahora difiere el análisis compartido de encuestas hasta después de que el despacho de encuestas del plugin rechace
la acción, de modo que los manejadores de encuestas propiedad del plugin pueden aceptar campos de encuesta
específicos del canal sin ser bloqueados primero por el analizador genérico de encuestas.

Consulte [Load pipeline](#load-pipeline) para la secuencia de inicio completa.

## Modelo de propiedad de capacidades

OpenClaw trata un plugin nativo como el límite de propiedad para una **empresa** o una
**característica**, y no como una bolsa de integraciones no relacionadas.

Eso significa:

- un plugin de empresa generalmente debería ser propietario de todas las superficies de esa empresa orientadas a OpenClaw
- un plugin de características generalmente debería ser propietario de la superficie completa de características que introduce
- los canales deben consumir capacidades principales compartidas en lugar de volver a implementar
  el comportamiento del proveedor ad hoc

Ejemplos:

- el complemento incluido `openai` posee el comportamiento del proveedor de modelos de OpenAI y el comportamiento de voz + comprensión de medios + generación de imágenes de OpenAI
- el complemento incluido `elevenlabs` posee el comportamiento de voz de ElevenLabs
- el complemento incluido `microsoft` posee el comportamiento de voz de Microsoft
- el complemento incluido `google` posee el comportamiento del proveedor de modelos de Google, además del comportamiento de comprensión de medios + generación de imágenes + búsqueda web de Google
- los complementos incluidos `minimax`, `mistral`, `moonshot` y `zai` poseen sus backends de comprensión de medios
- el complemento `voice-call` es un complemento de características: posee el transporte de llamadas, las herramientas, la CLI, las rutas y el tiempo de ejecución, pero consume la capacidad principal TTS/STT en lugar de inventar una segunda pila de voz

El estado final deseado es:

- OpenAI vive en un solo complemento incluso si abarca modelos de texto, voz, imágenes y video futuro
- otro proveedor puede hacer lo mismo con su propia área de superficie
- los canales no les importa qué complemento de proveedor posee el proveedor; consumen el contrato de capacidad compartida expuesto por el núcleo

Esta es la distinción clave:

- **complemento** = límite de propiedad
- **capacidad** = contrato principal que múltiples complementos pueden implementar o consumir

Por lo tanto, si OpenClaw agrega un nuevo dominio como video, la primera pregunta no es "qué proveedor debe codificar el manejo de video?". La primera pregunta es "cuál es el contrato de capacidad de video principal?". Una vez que existe ese contrato, los complementos de proveedores pueden registrarse en él y los complementos de canal/características pueden consumirlo.

Si la capacidad aún no existe, el movimiento correcto generalmente es:

1. definir la capacidad faltante en el núcleo
2. exponerla a través de la API/tiempo de ejecución del complemento de una manera tipada
3. conectar canales/características con esa capacidad
4. permitir que los complementos de proveedores registren implementaciones

Esto mantiene la propiedad explícita mientras se evita el comportamiento del núcleo que depende de un solo proveedor o una ruta de código específica de un complemento única.

### Capas de capacidad

Use este modelo mental al decidir a dónde pertenece el código:

- **capa de capacidad principal**: orquestación compartida, políticas, alternativas, reglas de fusión de configuración, semántica de entrega y contratos tipados
- **capa de complemento de proveedor**: API específicas del proveedor, autenticación, catálogos de modelos, síntesis de voz, generación de imágenes, backends de video futuros, puntos de conexión de uso
- **capa de complemento de canal/característica**: integración con Slack/Discord/llamada de voz/etc. que consume capacidades principales y las presenta en una superficie

Por ejemplo, TTS sigue esta forma:

- core posee la política de TTS en el momento de la respuesta, el orden de reserva, las preferencias y la entrega por canal
- `openai`, `elevenlabs` y `microsoft` poseen las implementaciones de síntesis
- `voice-call` consume el asistente de ejecución de TTS de telefonía

Ese mismo patrón debe preferirse para futuras capacidades.

### Ejemplo de complemento de empresa con múltiples capacidades

Un complemento de empresa debe parecer cohesivo desde el exterior. Si OpenClaw tiene contratos compartidos para modelos, voz, comprensión de medios y búsqueda web, un proveedor puede poseer todas sus superficies en un solo lugar:

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
- core sigue poseyendo los contratos de capacidad
- los canales y los complementos de características consumen los asistentes de `api.runtime.*`, no el código del proveedor
- las pruebas de contrato pueden afirmar que el complemento registró las capacidades que afirma poseer

### Ejemplo de capacidad: comprensión de video

OpenClaw ya trata la comprensión de imagen/audio/video como una capacidad compartida. El mismo modelo de propiedad se aplica allí:

1. core define el contrato de comprensión de medios
2. los complementos del proveedor registran `describeImage`, `transcribeAudio` y `describeVideo` según corresponda
3. los canales y los complementos de características consumen el comportamiento principal compartido en lugar de conectarse directamente al código del proveedor

Eso evita incorporar los supuestos de video de un proveedor en core. El complemento posee la superficie del proveedor; core posee el contrato de capacidad y el comportamiento de reserva.

Si OpenClaw agrega un nuevo dominio más tarde, como la generación de video, use la misma secuencia nuevamente: defina primero la capacidad principal y luego deje que los complementos del proveedor registren implementaciones contra ella.

¿Necesita una lista de verificación de implementación concreta? Consulte [Capability Cookbook](/es/tools/capability-cookbook).

## Paquetes compatibles

OpenClaw también reconoce dos diseños de paquetes externos compatibles:

- Paquetes estilo Codex: `.codex-plugin/plugin.json`
- Paquetes estilo Claude: `.claude-plugin/plugin.json` o el diseño de componentes
  Claude predeterminado sin manifiesto
- Paquetes estilo Cursor: `.cursor-plugin/plugin.json`

Las entradas del marketplace de Claude pueden apuntar a cualquiera de estos paquetes
compatibles, o a fuentes de plugins nativos de OpenClaw. OpenClaw resuelve primero
la entrada del marketplace y luego ejecuta la ruta de instalación normal para la
fuente resuelta.

Se muestran en la lista de plugins como `format=bundle`, con un subtipo de
`codex`, `claude` o `cursor` en la salida detallada/de inspección.

Consulte [Plugin bundles](/es/plugins/bundles) para conocer las reglas exactas
de detección, el comportamiento de mapeo y la matriz de soporte actual.

Hoy en día, OpenClaw los trata como **paquetes de capacidades**, no como plugins
de tiempo de ejecución nativos:

- soportado ahora: `skills` agrupados
- soportado ahora: raíces markdown `commands/` de Claude, mapeadas en el
  cargador de habilidades normal de OpenClaw
- soportado ahora: valores predeterminados `settings.json` del paquete Claude para
  la configuración del agente Pi integrado (con las claves de anulación de shell
  saneadas)
- soportado ahora: configuración MCP del paquete, fusionada en la configuración del
  agente Pi integrado como `mcpServers`, con las herramientas MCP del paquete
  stdio compatibles expuestas durante los turnos del agente Pi integrado
- soportado ahora: raíces `.cursor/commands/*.md` de Cursor, mapeadas en el cargador
  de habilidades normal de OpenClaw
- soportado ahora: directorios de hooks de paquete Codex que usan el diseño de paquete
  de hooks de OpenClaw (`HOOK.md` + `handler.ts`/`handler.js`)
- detectado pero aún no conectado: otras capacidades declaradas del paquete, como
  agentes, automatización de hooks de Claude, metadatos de reglas/hooks de Cursor,
  metadatos de aplicación/LSP, estilos de salida

Eso significa que la instalación/descubrimiento/lista/información/habilitación del paquete
funcionan, y las habilidades del paquete, habilidades de comandos de Claude, valores
predeterminados de configuración del paquete Claude y directorios de hooks de Codex
compatibles se cargan cuando el paquete está habilitado. Los servidores MCP del paquete
compatibles también pueden ejecutarse como subprocesos para llamadas a herramientas
Pi integradas cuando usan transporte stdio compatible, pero los módulos de tiempo de
ejecución del paquete no se cargan en el proceso.

La compatibilidad con los hooks de Bundle se limita al formato de directorio de hooks normal de OpenClaw
(`HOOK.md` más `handler.ts`/`handler.js` bajo las raíces de hooks declaradas).
Los tiempos de ejecución de hooks de shell/JSON específicos del proveedor, incluidos los de Claude `hooks.json`,
solo se detectan hoy y no se ejecutan directamente.

## Modelo de ejecución

Los plugins nativos de OpenClaw se ejecutan **en proceso** con el Gateway. No están
en sandbox. Un plugin nativo cargado tiene el mismo límite de confianza a nivel de proceso que
el código central.

Implicaciones:

- un plugin nativo puede registrar herramientas, controladores de red, hooks y servicios
- un error en un plugin nativo puede bloquear o desestabilizar el gateway
- un plugin nativo malicioso equivale a la ejecución de código arbitrario dentro
  del proceso OpenClaw

Los bundles compatibles son más seguros de forma predeterminada porque OpenClaw actualmente los trata
como paquetes de metadatos/contenido. En las versiones actuales, eso significa principalmente
habilidades empaquetadas.

Utilice listas de permitidos y rutas de instalación/carga explícitas para plugins no empaquetados. Trate
los plugins del espacio de trabajo como código de tiempo de desarrollo, no como valores predeterminados de producción.

Nota importante de confianza:

- `plugins.allow` confía en los **ids de plugin**, no en el origen de la fuente.
- Un plugin del espacio de trabajo con el mismo id que un plugin empaquetado oculta intencionalmente
  la copia empaquetada cuando ese plugin del espacio de trabajo está habilitado/en la lista de permitidos.
- Esto es normal y útil para el desarrollo local, las pruebas de parches y las correcciones urgentes.

## Plugins disponibles (oficiales)

- Microsoft Teams es solo para plugins a partir del 15.01.2026; instale `@openclaw/msteams` si usa Teams.
- Memoria (Core) — plugin de búsqueda de memoria empaquetado (habilitado de forma predeterminada a través de `plugins.slots.memory`)
- Memoria (LanceDB) — plugin de memoria a largo plazo empaquetado (recuperación/captura automática; establezca `plugins.slots.memory = "memory-lancedb"`)
- [Llamada de voz](/es/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/es/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/es/channels/matrix) — `@openclaw/matrix`
- [Nostr](/es/channels/nostr) — `@openclaw/nostr`
- [Zalo](/es/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/es/channels/msteams) — `@openclaw/msteams`
- Tiempo de ejecución del proveedor Anthropic — incluido como `anthropic` (habilitado de forma predeterminada)
- Catálogo de proveedores BytePlus — incluido como `byteplus` (habilitado de forma predeterminada)
- Catálogo de proveedores Cloudflare AI Gateway — incluido como `cloudflare-ai-gateway` (habilitado de forma predeterminada)
- Búsqueda web de Google + OAuth de CLI Gemini — incluido como `google` (la búsqueda web lo carga automáticamente; la autenticación del proveedor sigue siendo opcional)
- Tiempo de ejecución del proveedor GitHub Copilot — incluido como `github-copilot` (habilitado de forma predeterminada)
- Catálogo de proveedores Hugging Face — incluido como `huggingface` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor Kilo Gateway — incluido como `kilocode` (habilitado de forma predeterminada)
- Catálogo de proveedores Kimi Coding — incluido como `kimi-coding` (habilitado de forma predeterminada)
- Catálogo de proveedores MiniMax + uso + OAuth — incluido como `minimax` (habilitado de forma predeterminada; posee `minimax` y `minimax-portal`)
- Capacidades del proveedor Mistral — incluidas como `mistral` (habilitadas de forma predeterminada)
- Catálogo de proveedores Model Studio — incluido como `modelstudio` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor Moonshot — incluido como `moonshot` (habilitado de forma predeterminada)
- Catálogo de proveedores NVIDIA — incluido como `nvidia` (habilitado de forma predeterminada)
- Proveedor de voz ElevenLabs — incluido como `elevenlabs` (habilitado de forma predeterminada)
- Proveedor de voz Microsoft — incluido como `microsoft` (habilitado de forma predeterminada; la entrada `edge` heredada se asigna aquí)
- Tiempo de ejecución del proveedor OpenAI — incluido como `openai` (habilitado de forma predeterminada; posee tanto `openai` como `openai-codex`)
- Capacidades del proveedor OpenCode Go — incluidas como `opencode-go` (habilitadas de forma predeterminada)
- Capacidades del proveedor OpenCode Zen — incluidas como `opencode` (habilitadas de forma predeterminada)
- Tiempo de ejecución del proveedor OpenRouter — incluido como `openrouter` (habilitado de forma predeterminada)
- Catálogo de proveedores Qianfan: empaquetado como `qianfan` (habilitado de forma predeterminada)
- Qwen OAuth (autenticación y catálogo de proveedores): empaquetado como `qwen-portal-auth` (habilitado de forma predeterminada)
- Catálogo de proveedores sintéticos: empaquetado como `synthetic` (habilitado de forma predeterminada)
- Catálogo de proveedores Together: empaquetado como `together` (habilitado de forma predeterminada)
- Catálogo de proveedores Venice: empaquetado como `venice` (habilitado de forma predeterminada)
- Catálogo de proveedores Vercel AI Gateway: empaquetado como `vercel-ai-gateway` (habilitado de forma predeterminada)
- Catálogo de proveedores Volcengine: empaquetado como `volcengine` (habilitado de forma predeterminada)
- Catálogo de proveedores + uso de Xiaomi: empaquetado como `xiaomi` (habilitado de forma predeterminada)
- Tiempo de ejecución del proveedor Z.AI: empaquetado como `zai` (habilitado de forma predeterminada)
- Copilot Proxy (autenticación de proveedor): puente local de VS Code Copilot Proxy; distinto del inicio de sesión del dispositivo integrado `github-copilot` (empaquetado, deshabilitado de forma predeterminada)

Los complementos nativos de OpenClaw son **módulos TypeScript** cargados en tiempo de ejecución a través de jiti.
**La validación de configuración no ejecuta el código del complemento**; en su lugar, utiliza el manifiesto del complemento
y JSON Schema. Consulte [Manifiesto del complemento](/es/plugins/manifest).

Los complementos nativos de OpenClaw pueden registrar capacidades y superficies:

**Capacidades** (modelo de complemento público):

- Proveedores de inferencia de texto (catálogos de modelos, autenticación, enlaces de tiempo de ejecución)
- Proveedores de voz
- Proveedores de comprensión de medios
- Proveedores de generación de imágenes
- Proveedores de búsqueda web
- Conectores de canal/mensajería

**Superficies** (infraestructura de soporte):

- Métodos RPC de Gateway y rutas HTTP
- Herramientas de agente
- Comandos CLI
- Servicios en segundo plano
- Motores de contexto
- Validación opcional de configuración
- **Habilidades** (mediante la lista de directorios `skills` en el manifiesto del complemento)
- **Comandos de respuesta automática** (se ejecutan sin invocar al agente de IA)

Los complementos nativos de OpenClaw se ejecutan en proceso con el Gateway (consulte
[Modelo de ejecución](#execution-model) para conocer las implicaciones de confianza).
Guía de creación de herramientas: [Herramientas de agente de complemento](/es/plugins/agent-tools).

Piense en estos registros como **reclamos de capacidad**. Se supone que un complemento no debe acceder a partes internas aleatorias y "simplemente hacerlo funcionar". Debe registrarse en superficies explícitas que OpenClaw entiende, valida y puede exponer de manera consistente a través de la configuración, el incorporamiento, el estado, la documentación y el comportamiento en tiempo de ejecución.

## Contratos y aplicación

La superficie de la API de complementos está escrita intencionalmente y centralizada en `OpenClawPluginApi`. Ese contrato define los puntos de registro compatibles y las funciones auxiliares de tiempo de ejecución en las que un complemento puede basarse.

Por qué esto es importante:

- los autores de complementos obtienen un estándar interno estable
- el núcleo puede rechazar la propiedad duplicada, como dos complementos registrando el mismo id de proveedor
- el inicio puede mostrar diagnósticos procesables para registros mal formados
- las pruebas de contrato pueden hacer cumplir la propiedad del complemento incluido y evitar desviaciones silenciosas

Hay dos niveles de aplicación:

1. **aplicación del registro en tiempo de ejecución**
   El registro de complementos valida los registros a medida que se cargan los complementos. Ejemplos:
   los ids de proveedor duplicados, los ids de proveedor de voz duplicados y los registros
   malformados producen diagnósticos de complementos en lugar de un comportamiento indefinido.
2. **pruebas de contrato**
   Los complementos incluidos se capturan en registros de contrato durante las ejecuciones de pruebas para que
   OpenClaw pueda afirmar la propiedad explícitamente. Hoy se utiliza para proveedores
   de modelos, proveedores de voz, proveedores de búsqueda web y propiedad de registro incluido.

El efecto práctico es que OpenClaw sabe, de antemano, qué complemento posee qué
superficie. Eso permite que el núcleo y los canales se compongan sin problemas porque la propiedad está
declarada, escrita y es comprobable en lugar de implícita.

### Qué pertenece a un contrato

Los buenos contratos de complementos son:

- escritos
- pequeños
- específicos de la capacidad
- propiedad del núcleo
- reutilizables por múltiples complementos
- consumibles por canales/características sin conocimiento del proveedor

Los malos contratos de complementos son:

- políticas específicas del proveedor ocultas en el núcleo
- escotillas de escape de complementos de un solo uso que omiten el registro
- código de canal que accede directamente a una implementación de proveedor
- objetos de tiempo de ejecución ad hoc que no son parte de `OpenClawPluginApi` o
  `api.runtime`

En caso de duda, eleve el nivel de abstracción: defina primero la capacidad y luego
permita que los complementos se conecten a ella.

## Límite de exportación

OpenClaw exporta capacidades, no conveniencia de implementación.

Mantenga el registro de capacidades público. Recorte las exportaciones auxiliares no contractuales:

- subrutas auxiliares específicas del complemento empaquetado
- subrutas de infraestructura de ejecución no destinadas a ser API pública
- auxiliares de conveniencia específicos del proveedor
- auxiliares de configuración/incorporación que son detalles de implementación

## Inspección de complementos

Use `openclaw plugins inspect <id>` para una introspección profunda del complemento. Este es el comando canónico para comprender la forma de un complemento y su comportamiento de registro.

```bash
openclaw plugins inspect openai
openclaw plugins inspect openai --json
```

El informe de inspección muestra:

- identidad, estado de carga, fuente y raíz
- forma del complemento (plain-capability, hybrid-capability, hook-only, non-capability)
- modo de capacidad y capacidades registradas
- hooks (tipados y personalizados), herramientas, comandos, servicios
- registro de canal
- indicadores de política de configuración
- diagnósticos
- si el complemento utiliza el hook heredado `before_agent_start`
- metadatos de instalación

La clasificación proviene del comportamiento de registro real, no solo de metadatos estáticos.

Los comandos de resumen siguen centrados en el resumen:

- `plugins list` — inventario compacto
- `plugins status` — resumen operativo
- `doctor` — diagnósticos centrados en problemas
- `plugins inspect` — detalle profundo

## Hooks de tiempo de ejecución del proveedor

Los complementos del proveedor ahora tienen dos capas:

- metadatos del manifiesto: `providerAuthEnvVars` para una búsqueda rápida de autenticación de entorno antes de la carga en tiempo de ejecución, más `providerAuthChoices` para etiquetas rápidas de incorporación/elección de autenticación y metadatos de indicadores de CLI antes de la carga en tiempo de ejecución
- hooks en tiempo de configuración: `catalog` / heredado `discovery`
- runtime hooks: `resolveDynamicModel`, `prepareDynamicModel`, `normalizeResolvedModel`, `capabilities`, `prepareExtraParams`, `wrapStreamFn`, `formatApiKey`, `refreshOAuth`, `buildAuthDoctorHint`, `isCacheTtlEligible`, `buildMissingAuthMessage`, `suppressBuiltInModel`, `augmentModelCatalog`, `isBinaryThinking`, `supportsXHighThinking`, `resolveDefaultThinkingLevel`, `isModernModelRef`, `prepareRuntimeAuth`, `resolveUsageAuth`, `fetchUsageSnapshot`

OpenClaw todavía posee el bucle de agente genérico, la conmutación por error, el manejo de transcripciones y la política de herramientas. Estos hooks son la superficie de extensión para comportamientos específicos del proveedor sin necesidad de un transporte de inferencia personalizado completo.

Use el manifiesto `providerAuthEnvVars` cuando el proveedor tenga credenciales basadas en entorno que las rutas genéricas de auth/status/model-picker deberían ver sin cargar el runtime del plugin. Use el manifiesto `providerAuthChoices` cuando las superficies de CLI de onboarding/auth-choice deban conocer el choice id del proveedor, las etiquetas de grupo y el cableado simple de auth de una sola bandera sin cargar el runtime del proveedor. Mantenga el runtime del proveedor `envVars` para pistas orientadas al operador, como etiquetas de incorporación o variables de configuración de client-id/client-secret de OAuth.

### Orden y uso de los hooks

Para los plugins de modelo/proveedor, OpenClaw llama a los hooks en este orden aproximado. La columna "Cuándo usar" es la guía de decisión rápida.

| #   | Hook                             | Lo que hace                                                                                                                 | Cuándo usar                                                                                                                     |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog`                        | Publicar configuración del proveedor en `models.providers` durante la generación de `models.json`                           | El proveedor posee un catálogo o valores predeterminados de URL base                                                            |
| —   | _(búsqueda de modelo integrada)_ | OpenClaw prueba primero la ruta normal de registro/catálogo                                                                 | _(no es un hook de plugin)_                                                                                                     |
| 2   | `resolveDynamicModel`            | Respaldo síncrono para IDs de modelos propiedad del proveedor que aún no están en el registro local                         | El proveedor acepta IDs de modelos de flujo ascendente arbitrarios                                                              |
| 3   | `prepareDynamicModel`            | Calentamiento asíncrono, luego `resolveDynamicModel` se ejecuta nuevamente                                                  | El proveedor necesita metadatos de red antes de resolver identificadores desconocidos                                           |
| 4   | `normalizeResolvedModel`         | Reescritura final antes de que el ejecutor integrado use el modelo resuelto                                                 | El proveedor necesita reescrituras de transporte pero aún usa un transporte central                                             |
| 5   | `capabilities`                   | Metadatos de transcripción/herramientas propiedad del proveedor utilizados por la lógica central compartida                 | El proveedor necesita peculiaridades de transcripción/familia de proveedores                                                    |
| 6   | `prepareExtraParams`             | Normalización de parámetros de solicitud antes de los contenedores de opciones de transmisión genéricos                     | El proveedor necesita parámetros de solicitud predeterminados o limpieza de parámetros por proveedor                            |
| 7   | `wrapStreamFn`                   | Contenedor de transmisión después de aplicar los contenedores genéricos                                                     | El proveedor necesita contenedores de compatibilidad de encabezados/cuerpo/modelo de solicitud sin un transporte personalizado  |
| 8   | `formatApiKey`                   | Formateador de perfil de autenticación: el perfil almacenado se convierte en la cadena `apiKey` en tiempo de ejecución      | El proveedor almacena metadatos de autenticación adicionales y necesita una forma de token de tiempo de ejecución personalizada |
| 9   | `refreshOAuth`                   | Invalidación de actualización de OAuth para endpoints de actualización personalizados o política de fallas de actualización | El proveedor no se ajusta a los actualizadores `pi-ai` compartidos                                                              |
| 10  | `buildAuthDoctorHint`            | Sugerencia de reparación añadida cuando falla la actualización de OAuth                                                     | El proveedor necesita orientación de reparación de autenticación propiedad del proveedor después de una falla de actualización  |
| 11  | `isCacheTtlEligible`             | Política de caché de solicitudes para proveedores de proxy/backhaul                                                         | El proveedor necesita control de TTL de caché específico para proxy                                                             |
| 12  | `buildMissingAuthMessage`        | Reemplazo del mensaje genérico de recuperación de autenticación faltante                                                    | El proveedor necesita una sugerencia de recuperación de autenticación faltante específica del proveedor                         |
| 13  | `suppressBuiltInModel`           | Supresión de modelo upstream obsoleto más sugerencia opcional de error orientada al usuario                                 | El proveedor necesita ocultar filas upstream obsoletas o reemplazarlas con una sugerencia del proveedor                         |
| 14  | `augmentModelCatalog`            | Filas sintéticas/finales del catálogo añadidas después del descubrimiento                                                   | El proveedor necesita filas sintéticas de compatibilidad futura en `models list` y selectores                                   |
| 15  | `isBinaryThinking`               | Interruptor de razonado activado/desactivado para proveedores de pensamiento binario                                        | El proveedor expone solo el pensamiento binario activado/desactivado                                                            |
| 16  | `supportsXHighThinking`          | Soporte de razonado `xhigh` para modelos seleccionados                                                                      | El proveedor quiere `xhigh` solo en un subconjunto de modelos                                                                   |
| 17  | `resolveDefaultThinkingLevel`    | Nivel `/think` predeterminado para una familia de modelos específica                                                        | El proveedor es propietario de la política `/think` predeterminada para una familia de modelos                                  |
| 18  | `isModernModelRef`               | Comparador de modelos moderno para filtros de perfiles en vivo y selección de pruebas (smoke)                               | El proveedor posee la coincidencia del modelo preferido para pruebas/en vivo                                                    |
| 19  | `prepareRuntimeAuth`             | Intercambiar una credencial configurada por el token/clave de tiempo de ejecución real justo antes de la inferencia         | El proveedor necesita un intercambio de tokens o una credencial de solicitud de corta duración                                  |
| 20  | `resolveUsageAuth`               | Resolver las credenciales de uso/facturación para `/usage` y las superficies de estado relacionadas                         | El proveedor necesita un análisis personalizado de tokens de uso/cuota o una credencial de uso diferente                        |
| 21  | `fetchUsageSnapshot`             | Obtener y normalizar instantáneas de uso/cuota específicas del proveedor después de resolver la autenticación               | El proveedor necesita un endpoint de uso específico del proveedor o un analizador de cargas útiles                              |

Si el proveedor necesita un protocolo de cable totalmente personalizado o un ejecutor de solicitudes personalizado,
eso es una clase diferente de extensión. Estos enlaces son para el comportamiento del proveedor
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
  `resolveDefaultThinkingLevel` y `isModernModelRef` porque es propietario de la compatibilidad futura
  de Claude 4.6, sugerencias de familia de proveedores, guía de reparación de autenticación, integración del
  endpoint de uso, elegibilidad de caché de avisos, y política de pensamiento predeterminada/adaptativa
  de Claude.
- OpenAI usa `resolveDynamicModel`, `normalizeResolvedModel` y
  `capabilities` además de `buildMissingAuthMessage`, `suppressBuiltInModel`,
  `augmentModelCatalog`, `supportsXHighThinking` y `isModernModelRef`
  porque posee la compatibilidad hacia adelante de GPT-5.4, la normalización directa
  de `openai-completions` -> `openai-responses` de OpenAI, sugerencias de autenticación
  compatibles con Codex, supresión de Spark, filas de lista sintéticas de OpenAI y la política de
  pensamiento GPT-5 / modelo en vivo.
- OpenRouter usa `catalog` además de `resolveDynamicModel` y
  `prepareDynamicModel` porque el proveedor es de paso (pass-through) y puede exponer
  nuevos identificadores de modelo antes de que se actualice el catálogo estático de OpenClaw.
- GitHub Copilot usa `catalog`, `auth`, `resolveDynamicModel` y
  `capabilities` además de `prepareRuntimeAuth` y `fetchUsageSnapshot` porque
  necesita el inicio de sesión del dispositivo propiedad del proveedor, el comportamiento de reserva del
  modelo, las peculiaridades de las transcripciones de Claude, un intercambio de token de GitHub ->
  token de Copilot y un punto de conexión de uso propiedad del proveedor.
- OpenAI Codex usa `catalog`, `resolveDynamicModel`,
  `normalizeResolvedModel`, `refreshOAuth` y `augmentModelCatalog` además
  de `prepareExtraParams`, `resolveUsageAuth` y `fetchUsageSnapshot` porque
  todavía se ejecuta en los transportes principales de OpenAI pero posee su propia normalización de
  transporte/URL base, la política de reserva de actualización de OAuth, la elección de transporte predeterminada,
  las filas de catálogo sintéticas de Codex y la integración con el punto de conexión de uso de ChatGPT.
- Google AI Studio y Gemini CLI OAuth usan `resolveDynamicModel` y
  `isModernModelRef` porque poseen la reserva de compatibilidad hacia adelante de Gemini 3.1
  y la coincidencia de modelos modernos; Gemini CLI OAuth también usa `formatApiKey`,
  `resolveUsageAuth` y `fetchUsageSnapshot` para el formato de token, el análisis
  de token y la conexión del punto de conexión de cuota.
- OpenRouter usa `capabilities`, `wrapStreamFn` y `isCacheTtlEligible`
  para mantener los encabezados de solicitud específicos del proveedor, los metadatos de enrutamiento, los parches de razonamiento
  y la política de caché de solicitudes fuera del núcleo.
- Moonshot usa `catalog` más `wrapStreamFn` porque todavía usa el transporte compartido
  de OpenAI pero necesita una normalización de carga útil de pensamiento propiedad del proveedor.
- Kilocode usa `catalog`, `capabilities`, `wrapStreamFn` y
  `isCacheTtlEligible` porque necesita encabezados de solicitud propiedad del proveedor,
  normalización de carga útil de razonamiento, sugerencias de transcripción de Gemini y control
  de TTL de caché de Anthropic.
- Z.AI usa `resolveDynamicModel`, `prepareExtraParams`, `wrapStreamFn`,
  `isCacheTtlEligible`, `isBinaryThinking`, `isModernModelRef`,
  `resolveUsageAuth` y `fetchUsageSnapshot` porque posee la reserva de GLM-5,
  los valores predeterminados de `tool_stream`, la UX de pensamiento binario, la coincidencia de modelos modernos y tanto
  la autenticación de uso como la obtención de cuotas.
- Mistral, OpenCode Zen y OpenCode Go usan `capabilities` únicamente para mantener
  las peculiaridades de transcripción/herramientas fuera del núcleo.
- Los proveedores empaquetados solo de catálogo como `byteplus`, `cloudflare-ai-gateway`,
  `huggingface`, `kimi-coding`, `modelstudio`, `nvidia`, `qianfan`,
  `synthetic`, `together`, `venice`, `vercel-ai-gateway` y `volcengine` usan
  solo `catalog`.
- El portal de Qwen usa `catalog`, `auth` y `refreshOAuth`.
- MiniMax y Xiaomi usan `catalog` más ganchos de uso porque su comportamiento de `/usage`
  es propiedad del complemento aunque la inferencia todavía se ejecuta a través de los transportes
  compartidos.

## Canal de carga

Al inicio, OpenClaw hace aproximadamente esto:

1. descubrir las raíces de los complementos candidatos
2. leer los manifiastos de los paquetes nativos o compatibles y los metadatos del paquete
3. rechazar candidatos no seguros
4. normalizar la configuración del complemento (`plugins.enabled`, `allow`, `deny`, `entries`,
   `slots`, `load.paths`)
5. decidir la habilitación de cada candidato
6. cargar módulos nativos habilitados a través de jiti
7. llamar a los ganchos `register(api)` nativos y recopilar los registros en el registro de complementos
8. exponer el registro a las superficies de comandos/tiempo de ejecución

Las puertas de seguridad ocurren **antes** de la ejecución del tiempo de ejecución. Los candidatos se bloquean
cuando la entrada sale de la raíz del complemento, la ruta es de escritura mundial, o la propiedad
de la ruta parece sospechosa para complementos no empaquetados.

### Comportamiento primero con manifiesto

El manifiesto es la fuente de verdad del plano de control. OpenClaw lo utiliza para:

- identificar el complemento
- descubrir canales/habilidades/esquema de configuración declarados o capacidades del paquete
- validar `plugins.entries.<id>.config`
- aumentar las etiquetas/marcadores de posición de la Interfaz de Control
- mostrar metadatos de instalación/catálogo

Para los complementos nativos, el módulo de tiempo de ejecución es la parte del plano de datos. Registra
el comportamiento real, como ganchos, herramientas, comandos o flujos de proveedor.

### Lo que almacena en caché el cargador

OpenClaw mantiene cachés cortos en proceso para:

- resultados del descubrimiento
- datos del registro de manifiestos
- registros de complementos cargados

Estas cachés reducen la sobrecarga de inicio intermitente y comandos repetidos. Es seguro
pensar en ellas como cachés de rendimiento a corto plazo, no como persistencia.

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
- Utiliza la configuración `messages.tts` central y la selección del proveedor.
- Devuelve el búfer de audio PCM + la frecuencia de muestreo. Los complementos deben remuestrear/codificar para los proveedores.
- `listVoices` es opcional por proveedor. Úselo para selectores de voz propiedad del proveedor o flujos de configuración.
- Las listas de voces pueden incluir metadatos más enriquecidos, como configuración regional, género y etiquetas de personalidad para selectores compatibles con el proveedor.
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

- Mantenga la política, el respaldo (fallback) y la entrega de respuestas de TTS en el núcleo (core).
- Use proveedores de voz para el comportamiento de síntesis propiedad del proveedor.
- La entrada `edge` heredada de Microsoft se normaliza al id de proveedor `microsoft`.
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

- Mantenga la orquestación, el respaldo (fallback), la configuración y el cableado del canal en el núcleo (core).
- Mantenga el comportamiento del proveedor en el complemento del proveedor.
- La expansión aditiva debe permanecer tipada: nuevos métodos opcionales, nuevos campos de resultados opcionales, nuevas capacidades opcionales.
- Si OpenClaw agrega una nueva capacidad como la generación de video más adelante, defina primero el contrato de capacidad central (core), luego permita que los complementos del proveedor se registren en él.

Para asistentes de tiempo de ejecución de comprensión de medios, los complementos pueden llamar:

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
- Usa la configuración de audio de comprensión de medios del núcleo (`tools.media.audio`) y el orden de respaldo (fallback) del proveedor.
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

- `provider` y `model` son anulaciones opcionales por ejecución, no cambios de sesión persistentes.
- OpenClaw solo respeta esos campos de anulación para las llamadas de confianza.
- Para las ejecuciones de respaldo (fallback) propiedad del complemento, los operadores deben aceptar explícitamente con `plugins.entries.<id>.subagent.allowModelOverride: true`.
- Use `plugins.entries.<id>.subagent.allowedModels` para restringir los complementos de confianza a objetivos `provider/model` canónicos específicos, o `"*"` para permitir cualquier objetivo explícitamente.
- Las ejecuciones de subagentes de complementos no confiables aún funcionan, pero las solicitudes de anulación se rechazan en lugar de volver silenciosamente al comportamiento predeterminado.

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

- Mantenga la selección del proveedor, la resolución de credenciales y la semántica de solicitudes compartidas en el núcleo.
- Use proveedores de búsqueda web para transportes de búsqueda específicos del proveedor.
- `api.runtime.webSearch.*` es la superficie compartida preferida para complementos de características/canales que necesitan comportamiento de búsqueda sin depender del contenedor de herramientas del agente.

## Rutas HTTP de la puerta de enlace

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

- `path`: ruta de acceso bajo el servidor HTTP de la puerta de enlace.
- `auth`: obligatorio. Use `"gateway"` para requerir la autenticación normal de la puerta de enlace, o `"plugin"` para la autenticación/verificación de webhooks administrada por el complemento.
- `match`: opcional. `"exact"` (predeterminado) o `"prefix"`.
- `replaceExisting`: opcional. Permite que el mismo complemento reemplace su propio registro de ruta existente.
- `handler`: devuelve `true` cuando la ruta manejó la solicitud.

Notas:

- `api.registerHttpHandler(...)` está obsoleto. Use `api.registerHttpRoute(...)`.
- Las rutas de complementos deben declarar `auth` explícitamente.
- Los conflictos exactos de `path + match` se rechazan a menos que `replaceExisting: true`, y un complemento no puede reemplazar la ruta de otro complemento.
- Las rutas superpuestas con diferentes niveles de `auth` se rechazan. Mantenga las cadenas de falla de `exact`/`prefix` solo en el mismo nivel de autenticación.

## Rutas de importación del SDK de complementos

Use las subrutas del SDK en lugar de la importación monolítica `openclaw/plugin-sdk` al crear complementos:

- `openclaw/plugin-sdk/core` para el contrato genérico más pequeño orientado a complementos.
  También lleva pequeños asistentes de ensamblaje tales como
  `definePluginEntry`, `defineChannelPluginEntry`, `defineSetupPluginEntry`,
  y `createChannelPluginBase` para el cableado de entrada de complementos integrados o de terceros.
- Subrutas de dominio tales como `openclaw/plugin-sdk/channel-config-helpers`,
  `openclaw/plugin-sdk/channel-config-schema`,
  `openclaw/plugin-sdk/channel-policy`,
  `openclaw/plugin-sdk/channel-runtime`,
  `openclaw/plugin-sdk/config-runtime`,
  `openclaw/plugin-sdk/agent-runtime`,
  `openclaw/plugin-sdk/lazy-runtime`,
  `openclaw/plugin-sdk/reply-history`,
  `openclaw/plugin-sdk/routing`,
  `openclaw/plugin-sdk/runtime-store` y
  `openclaw/plugin-sdk/directory-runtime` para asistentes compartidos de tiempo de ejecución/configuración.
- Subrutas estrechas de núcleo de canal tales como `openclaw/plugin-sdk/discord-core`,
  `openclaw/plugin-sdk/telegram-core`, `openclaw/plugin-sdk/whatsapp-core`,
  y `openclaw/plugin-sdk/line-core` para primitivas específicas del canal que
  deben mantenerse más pequeñas que los barriles completos de asistentes de canal.
- `openclaw/plugin-sdk/compat` permanece como una superficie de migración heredada para complementos externos más antiguos. Los complementos integrados no deben usarlo, y las importaciones que no sean de prueba emiten una advertencia de obsolescencia única fuera de los entornos de prueba.
- Los elementos internos de las extensiones integradas permanecen privados. Los complementos externos deben usar solo subrutas `openclaw/plugin-sdk/*`. El código central/de prueba de OpenClaw puede usar los puntos de entrada públicos del repositorio bajo `extensions/<id>/index.js`, `api.js`, `runtime-api.js`,
  `setup-entry.js` y archivos de alcance estrecho tales como `login-qr-api.js`. Nunca
  importe `extensions/<id>/src/*` desde el núcleo o desde otra extensión.
- División del punto de entrada del repositorio:
  `extensions/<id>/api.js` es el barril de asistentes/tipos,
  `extensions/<id>/runtime-api.js` es el barril solo de tiempo de ejecución,
  `extensions/<id>/index.js` es el punto de entrada del complemento integrado,
  y `extensions/<id>/setup-entry.js` es el punto de entrada del complemento de configuración.
- `openclaw/plugin-sdk/telegram` para los tipos de complementos del canal de Telegram y los asistentes compartidos orientados al canal. Los elementos internos de la implementación integrada de Telegram permanecen privados para la extensión integrada.
- `openclaw/plugin-sdk/discord` para los tipos de complementos del canal de Discord y asistentes compartidos orientados al canal. Los aspectos internos de la implementación integrada de Discord siguen siendo privados para la extensión agrupada.
- `openclaw/plugin-sdk/slack` para los tipos de complementos del canal de Slack y asistentes compartidos orientados al canal. Los aspectos internos de la implementación integrada de Slack siguen siendo privados para la extensión agrupada.
- `openclaw/plugin-sdk/signal` para los tipos de complementos del canal de Signal y asistentes compartidos orientados al canal. Los aspectos internos de la implementación integrada de Signal siguen siendo privados para la extensión agrupada.
- `openclaw/plugin-sdk/imessage` para los tipos de complementos del canal de iMessage y asistentes compartidos orientados al canal. Los aspectos internos de la implementación integrada de iMessage siguen siendo privados para la extensión agrupada.
- `openclaw/plugin-sdk/whatsapp` para los tipos de complementos del canal de WhatsApp y asistentes compartidos orientados al canal. Los aspectos internos de la implementación integrada de WhatsApp siguen siendo privados para la extensión agrupada.
- `openclaw/plugin-sdk/line` para complementos del canal LINE.
- `openclaw/plugin-sdk/msteams` para la superficie del complemento de Microsoft Teams agrupado.
- Subrutas adicionales específicas de la extensión agrupada siguen disponibles donde OpenClaw expone intencionalmente asistentes orientados a la extensión:
  `openclaw/plugin-sdk/acpx`, `openclaw/plugin-sdk/bluebubbles`,
  `openclaw/plugin-sdk/feishu`, `openclaw/plugin-sdk/googlechat`,
  `openclaw/plugin-sdk/irc`, `openclaw/plugin-sdk/lobster`,
  `openclaw/plugin-sdk/matrix`,
  `openclaw/plugin-sdk/mattermost`, `openclaw/plugin-sdk/memory-core`,
  `openclaw/plugin-sdk/minimax-portal-auth`,
  `openclaw/plugin-sdk/nextcloud-talk`, `openclaw/plugin-sdk/nostr`,
  `openclaw/plugin-sdk/synology-chat`, `openclaw/plugin-sdk/test-utils`,
  `openclaw/plugin-sdk/tlon`, `openclaw/plugin-sdk/twitch`,
  `openclaw/plugin-sdk/voice-call`,
  `openclaw/plugin-sdk/zalo`, y `openclaw/plugin-sdk/zalouser`.

## Resolución de objetivos del canal

Los complementos del canal deben ser propietarios de la semántica específica del canal. Mantenga el host de salida compartido genérico y use la superficie del adaptador de mensajería para las reglas del proveedor:

- `messaging.inferTargetChatType({ to })` decide si un destino normalizado
  debe tratarse como `direct`, `group` o `channel` antes de la búsqueda en el directorio.
- `messaging.targetResolver.looksLikeId(raw, normalized)` indica al núcleo si
  una entrada debe saltar directamente a la resolución tipo id en lugar de la búsqueda en el directorio.
- `messaging.targetResolver.resolveTarget(...)` es el respaldo (fallback) del complemento cuando
  el núcleo necesita una resolución final propiedad del proveedor después de la normalización o después de un
  fallo en el directorio.
- `messaging.resolveOutboundSessionRoute(...)` se encarga de la construcción
  de la ruta de sesión específica del proveedor una vez que se resuelve un destino.

División recomendada:

- Use `inferTargetChatType` para las decisiones de categoría que deben ocurrir antes
  de buscar pares/grupos.
- Use `looksLikeId` para verificaciones de "tratar esto como un id de destino explícito/nativo".
- Use `resolveTarget` para el respaldo de normalización específico del proveedor, no para
  una búsqueda amplia en el directorio.
- Mantenga los ids nativos del proveedor como ids de chat, ids de hilo, JIDs, identificadores (handles) e ids
  de sala dentro de los valores `target` o parámetros específicos del proveedor, no en campos genéricos del
  SDK.

## Directorios respaldados por configuración

Los complementos que derivan entradas de directorio de la configuración deben mantener esa lógica en el
complemento y reutilizar los asistentes compartidos de
`openclaw/plugin-sdk/directory-runtime`.

Use esto cuando un canal necesite pares/grupos respaldados por configuración, tales como:

- pares de MD impulsados por listas de permitidos (allowlist)
- mapas de canal/grupo configurados
- respaldos de directorio estáticos con alcance de cuenta

Los asistentes compartidos en `directory-runtime` solo manejan operaciones genéricas:

- filtrado de consultas
- aplicación de límites
- asistentes de deduplicación/normalización
- construcción de `ChannelDirectoryEntry[]`

La inspección de cuenta específica del canal y la normalización de ids deben permanecer en la
implementación del complemento.

## Catálogos de proveedores

Los complementos del proveedor pueden definir catálogos de modelos para inferencia con
`registerProvider({ catalog: { run(...) { ... } } })`.

`catalog.run(...)` devuelve la misma forma que OpenClaw escribe en
`models.providers`:

- `{ provider }` para una entrada de proveedor
- `{ providers }` para múltiples entradas de proveedor

Use `catalog` cuando el complemento es propietario de ids de modelos específicos del proveedor, valores predeterminados de URL base o metadatos de modelos restringidos por autenticación.

`catalog.order` controla cuándo se fusiona el catálogo de un complemento en relación con los proveedores implícitos integrados de OpenClaw:

- `simple`: proveedores de API key simple o impulsados por variables de entorno
- `profile`: proveedores que aparecen cuando existen perfiles de autenticación
- `paired`: proveedores que sintetizan múltiples entradas de proveedores relacionadas
- `late`: última pasada, después de otros proveedores implícitos

Los proveedores posteriores ganan en caso de colisión de claves, por lo que los complementos pueden anular intencionalmente una entrada de proveedor integrada con el mismo id de proveedor.

Compatibilidad:

- `discovery` todavía funciona como un alias heredado
- si se registran tanto `catalog` como `discovery`, OpenClaw usa `catalog`

Nota de compatibilidad:

- `openclaw/plugin-sdk` sigue siendo compatible con los complementos externos existentes.
- Los complementos nuevos y migrados integrados deben usar subrutas específicas del canal o de la extensión; use `core` más subrutas explícitas de dominio para superficies genéricas, y trate `compat` como solo para migración.
- Las subrutas específicas de capacidades como `image-generation`,
  `media-understanding` y `speech` existen porque los complementos integrados/nativos las usan hoy. Su presencia no significa por sí sola que cada asistente exportado sea un contrato externo congelado a largo plazo.

## Inspección de canal de solo lectura

Si su complemento registra un canal, prefiera implementar
`plugin.config.inspectAccount(cfg, accountId)` junto con `resolveAccount(...)`.

Por qué:

- `resolveAccount(...)` es la ruta de tiempo de ejecución. Se permite asumir que las credenciales
  están completamente materializadas y puede fallar rápidamente cuando faltan los secretos requeridos.
- Las rutas de comandos de solo lectura como `openclaw status`, `openclaw status --all`,
  `openclaw channels status`, `openclaw channels resolve` y los flujos de
  reparación de doctor/config no deberían necesitar materializar credenciales de tiempo de ejecución solo para
  describir la configuración.

Comportamiento recomendado de `inspectAccount(...)`:

- Devuelve solo el estado descriptivo de la cuenta.
- Conserva `enabled` y `configured`.
- Incluya campos de origen/estado de credenciales cuando sea relevante, tales como:
  - `tokenSource`, `tokenStatus`
  - `botTokenSource`, `botTokenStatus`
  - `appTokenSource`, `appTokenStatus`
  - `signingSecretSource`, `signingSecretStatus`
- No es necesario devolver valores brutos de tokens solo para informar la disponibilidad de solo lectura. Devolver `tokenStatus: "available"` (y el campo de origen coincidente) es suficiente para comandos de estilo de estado.
- Use `configured_unavailable` cuando una credencial esté configurada a través de SecretRef pero no esté disponible en la ruta del comando actual.

Esto permite que los comandos de solo lectura informen "configurado pero no disponible en esta ruta de comando" en lugar de fallar o informar erróneamente que la cuenta no está configurada.

Nota de rendimiento:

- El descubrimiento de complementos y los metadatos del manifiesto utilizan cachés cortos en proceso para reducir el trabajo de inicio/recarga repentino.
- Establezca `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` o `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` para desactivar estas cachés.
- Ajuste las ventanas de caché con `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` y `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS`.

## Descubrimiento y precedencia

OpenClaw escanea, en orden:

1. Rutas de configuración

- `plugins.load.paths` (archivo o directorio)

2. Extensiones del espacio de trabajo

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. Extensiones globales

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. Extensiones incluidas (enviadas con OpenClaw; activadas por defecto/desactivadas por defecto mixtas)

- `<openclaw>/extensions/*`

Muchos complementos de proveedor incluidos están activados por defecto para que los catálogos de modelos/ganchos de tiempo de ejecución sigan disponibles sin configuración adicional. Otros aún requieren activación explícita a través de `plugins.entries.<id>.enabled` o `openclaw plugins enable <id>`.

Ejemplos de complementos incluidos activados por defecto:

- `byteplus`
- `cloudflare-ai-gateway`
- `device-pair`
- `github-copilot`
- `huggingface`
- `kilocode`
- `kimi-coding`
- `minimax`
- `minimax`
- `modelstudio`
- `moonshot`
- `nvidia`
- `ollama`
- `openai`
- `openrouter`
- `phone-control`
- `qianfan`
- `qwen-portal-auth`
- `sglang`
- `synthetic`
- `talk-voice`
- `together`
- `venice`
- `vercel-ai-gateway`
- `vllm`
- `volcengine`
- `xiaomi`
- complemento de ranura de memoria activa (ranura predeterminada: `memory-core`)

Los complementos instalados están habilitados de forma predeterminada, pero se pueden deshabilitar de la misma manera.

Los complementos del espacio de trabajo están **deshabilitados de forma predeterminada** a menos que los habilite explícitamente
o los agregue a una lista de permitidos. Esto es intencional: un repositorio descargado no debería convertirse silenciosamente
en código de puerta de enlace de producción.

Notas de endurecimiento:

- Si `plugins.allow` está vacío y los complementos no agrupados son detectables, OpenClaw registra una advertencia de inicio con los ids y las fuentes de los complementos.
- Las rutas candidatas se verifican de seguridad antes de la admisión de detección. OpenClaw bloquea candidatos cuando:
  - la entrada de la extensión se resuelve fuera de la raíz del complemento (incluidos escapes de enlace simbólico/recorrido de ruta),
  - la ruta raíz/fuente del complemento es escribible por cualquier usuario,
  - la propiedad de la ruta es sospechosa para complementos no agrupados (el propietario POSIX no es el uid actual ni root).
- Los complementos no agrupados cargados sin procedencia de instalación/ruta de carga emiten una advertencia para que pueda fijar la confianza (`plugins.allow`) o el seguimiento de instalación (`plugins.installs`).

Cada complemento nativo de OpenClaw debe incluir un archivo `openclaw.plugin.json` en su
raíz. Si una ruta apunta a un archivo, la raíz del complemento es el directorio del archivo y
debe contener el manifiesto.

Los paquetes compatibles pueden proporcionar en su lugar uno de:

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`
- `.cursor-plugin/plugin.json`

Los directorios de paquetes se descubren desde las mismas raíces que los complementos nativos.

Si varios complementos se resuelven al mismo id, la primera coincidencia en el orden anterior
gana y se ignoran las copias de menor precedencia.

Esto significa:

- los complementos del espacio de trabajo ocultan intencionadamente a los complementos agrupados con el mismo id
- `plugins.allow: ["foo"]` autoriza el complemento `foo` activo por id, incluso cuando
  la copia activa proviene del espacio de trabajo en lugar de la raíz de la extensión agrupada
- si necesita un control de procedencia más estricto, use rutas de instalación/carga explícitas e
  inspeccione el origen del complemento resuelto antes de habilitarlo

### Reglas de habilitación

La habilitación se resuelve después del descubrimiento:

- `plugins.enabled: false` deshabilita todos los complementos
- `plugins.deny` siempre gana
- `plugins.entries.<id>.enabled: false` deshabilita ese complemento
- los complementos de origen del espacio de trabajo están deshabilitados por defecto
- las listas de permitidos restringen el conjunto activo cuando `plugins.allow` no está vacío
- las listas de permitidos se basan en **id**, no en el origen
- los complementos agrupados están deshabilitados por defecto a menos que:
  - el id agrupado esté en el conjunto de activados por defecto integrado, o
  - lo habilite explícitamente, o
  - la configuración del canal habilite implícitamente el complemento del canal agrupado
- las ranuras exclusivas pueden forzar la habilitación del complemento seleccionado para esa ranura

En el núcleo actual, los ids agrupados activados por defecto incluyen los asistentes locales/de proveedor
mencionados anteriormente más el complemento de ranura de memoria activo.

### Paquetes de paquetes

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

Cada entrada se convierte en un complemento. Si el paquete enumera varias extensiones, el id del complemento
se convierte en `name/<fileBase>`.

Si su complemento importa dependencias de npm, instálelas en ese directorio para que
`node_modules` esté disponible (`npm install` / `pnpm install`).

Salvaguarda de seguridad: cada entrada `openclaw.extensions` debe permanecer dentro del directorio del complemento
después de la resolución de enlaces simbólicos. Se rechazan las entradas que escapan del directorio del paquete.

Nota de seguridad: `openclaw plugins install` instala las dependencias del complemento con
`npm install --ignore-scripts` (sin scripts de ciclo de vida). Mantenga los árboles de dependencias del complemento
"JS/TS puro" y evite paquetes que requieran compilaciones `postinstall`.

Opcional: `openclaw.setupEntry` puede apuntar a un módulo ligero solo de configuración.
Cuando OpenClaw necesita superficies de configuración para un complemento de canal deshabilitado, o
cuando un complemento de canal está habilitado pero aún sin configurar, carga `setupEntry`
en lugar de la entrada completa del complemento. Esto mantiene el inicio y la configuración más ligeros
cuando la entrada principal de tu complemento también conecta herramientas, enlaces u otro código
solo de tiempo de ejecución.

Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
puede optar a un complemento de canal por la misma ruta `setupEntry` durante la fase
de inicio previa a la escucha del gateway, incluso cuando el canal ya está configurado.

Usa esto solo cuando `setupEntry` cubra completamente la superficie de inicio que debe existir
antes de que el gateway comience a escuchar. En la práctica, esto significa que la entrada de configuración
debe registrar cada capacidad propiedad del canal de la cual depende el inicio, tales como:

- el registro del canal en sí mismo
- cualquier ruta HTTP que debe estar disponible antes de que el gateway comience a escuchar
- cualquier método, herramienta o servicio del gateway que deba existir durante esa misma ventana

Si tu entrada completa aún posee alguna capacidad de inicio requerida, no habilites
esta bandera. Mantén el complemento en el comportamiento predeterminado y deja que OpenClaw cargue la
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
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw también puede fusionar **catálogos de canales externos** (por ejemplo, una exportación
del registro MPM). Coloca un archivo JSON en uno de:

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

O apunta `OPENCLAW_PLUGIN_CATALOG_PATHS` (o `OPENCLAW_MPM_CATALOG_PATHS`) a
uno o más archivos JSON (delimitados por comas/puntos y comas/`PATH`). Cada archivo debe
contener `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`.

## IDs de complementos

IDs de complementos predeterminados:

- Paquetes de paquetes: `package.json` `name`
- Archivo independiente: nombre base del archivo (`~/.../voice-call.ts` → `voice-call`)

Si un complemento exporta `id`, OpenClaw lo usa pero advierte cuando no coincide con el
id configurado.

## Modelo de registro

Los plugins cargados no mutan directamente las globales del núcleo aleatorias. Se registran en un
registro central de plugins.

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

Las características del núcleo luego leen de ese registro en lugar de comunicarse con los módulos del plugin
directamente. Esto mantiene la carga en una sola dirección:

- módulo del plugin -> registro de registro
- tiempo de ejecución del núcleo -> consumo del registro

Esa separación es importante para la mantenibilidad. Significa que la mayoría de las superficies del núcleo solo
necesitan un punto de integración: "leer el registro", no "casos especiales para cada módulo del plugin
módulo".

## Configuración

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

Campos:

- `enabled`: interruptor maestro (predeterminado: true)
- `allow`: lista blanca (opcional)
- `deny`: lista negra (opcional; denegar gana)
- `load.paths`: archivos/directorios de plugins adicionales
- `slots`: selectores de ranura exclusivos como `memory` y `contextEngine`
- `entries.<id>`: interruptores por plugin + configuración

Los cambios de configuración **requieren un reinicio de la puerta de enlace**. Consulte
[Referencia de configuración](/es/configuration) para el esquema de configuración completo.

Reglas de validación (estrictas):

- Los IDs de plugin desconocidos en `entries`, `allow`, `deny` o `slots` son **errores**.
- Las claves `channels.<id>` desconocidas son **errores** a menos que un manifiesto del plugin declare
  el ID del canal.
- La configuración del plugin nativo se valida utilizando el esquema JSON incrustado en
  `openclaw.plugin.json` (`configSchema`).
- Los paquetes compatibles actualmente no exponen esquemas de configuración nativos de OpenClaw.
- Si un plugin está deshabilitado, su configuración se conserva y se emite una **advertencia**.

### Deshabilitado vs. faltante vs. no válido

Estos estados son intencionalmente diferentes:

- **deshabilitado**: el plugin existe, pero las reglas de habilitación lo desactivaron
- **faltante**: la configuración hace referencia a un ID de plugin que el descubrimiento no encontró
- **no válido**: el plugin existe, pero su configuración no coincide con el esquema declarado

OpenClaw conserva la configuración de los complementos deshabilitados, por lo que volver a activarlos no es destructivo.

## Slots de complementos (categorías exclusivas)

Algunas categorías de complementos son **exclusivas** (solo una activa a la vez). Use
`plugins.slots` para seleccionar qué complemento posee el slot:

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // or "none" to disable memory plugins
      contextEngine: "legacy", // or a plugin id such as "lossless-claw"
    },
  },
}
```

Slots exclusivos compatibles:

- `memory`: complemento de memoria activo (`"none"` deshabilita los complementos de memoria)
- `contextEngine`: complemento de motor de contexto activo (`"legacy"` es el predeterminado integrado)

Si varios complementos declaran `kind: "memory"` o `kind: "context-engine"`, solo
se carga el complemento seleccionado para ese slot. Los demás se deshabilitan con diagnósticos.
Declare `kind` en su [manifiesto del complemento](/es/plugins/manifest).

### Complementos del motor de contexto

Los complementos del motor de contexto poseen la orquestación del contexto de sesión para ingestión, ensamblaje
y compactación. Regístrelos desde su complemento con
`api.registerContextEngine(id, factory)` y luego seleccione el motor activo con
`plugins.slots.contextEngine`.

Use esto cuando su complemento necesite reemplazar o extender la canalización de contexto predeterminada en lugar de simplemente agregar búsqueda de memoria o hooks.

## Interfaz de control (esquema + etiquetas)

La interfaz de control usa `config.schema` (JSON Schema + `uiHints`) para renderizar mejores formularios.

OpenClaw aumenta `uiHints` en tiempo de ejecución basándose en los complementos descubiertos:

- Agrega etiquetas por complemento para `plugins.entries.<id>` / `.enabled` / `.config`
- Fusiona pistas opcionales de campos de configuración proporcionadas por el complemento bajo:
  `plugins.entries.<id>.config.<field>`

Si desea que los campos de configuración de su complemento muestren buenas etiquetas/marcadores de posición (y marcar los secretos como sensibles),
proporcione `uiHints` junto con su JSON Schema en el manifiesto del complemento.

Ejemplo:

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins inspect <id>
openclaw plugins install <path>                 # copy a local file/dir into ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # relative path ok
openclaw plugins install ./plugin.tgz           # install from a local tarball
openclaw plugins install ./plugin.zip           # install from a local zip
openclaw plugins install -l ./extensions/voice-call # link (no copy) for dev
openclaw plugins install @openclaw/voice-call   # install from npm
openclaw plugins install @openclaw/voice-call --pin # store exact resolved name@version
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

Consulte la [referencia de la CLI `openclaw plugins`](/es/cli/plugins) para obtener detalles completos sobre cada
comando (reglas de instalación, inspeccionar salida, instalaciones del mercado, desinstalación).

Los complementos también pueden registrar sus propios comandos de nivel superior (ejemplo:
`openclaw voicecall`).

## API de complementos (descripción general)

Los complementos exportan:

- Una función: `(api) => { ... }`
- Un objeto: `{ id, name, configSchema, register(api) { ... } }`

`register(api)` es donde los complementos adjuntan comportamiento. Los registros comunes incluyen:

- `registerTool`
- `registerHook`
- `on(...)` para enlaces de ciclo de vida tipados
- `registerChannel`
- `registerProvider`
- `registerSpeechProvider`
- `registerMediaUnderstandingProvider`
- `registerWebSearchProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

En la práctica, `register(api)` también es donde un complemento declara **propiedad**.
Esa propiedad debe asignarse claramente a:

- una superficie de proveedor como OpenAI, ElevenLabs o Microsoft
- una superficie de características como Llamada de voz

Evite dividir las capacidades de un proveedor en complementos no relacionados a menos que haya una razón fuerte del producto para hacerlo. El valor predeterminado debe ser un complemento por proveedor/característica, con contratos de capacidad central separando la orquestación compartida del comportamiento específico del proveedor.

## Agregar una nueva capacidad

Cuando un complemento necesita un comportamiento que no se ajusta a la API actual, no omita el sistema de complementos con un acceso privado. Agregue la capacidad faltante.

Secuencia recomendada:

1. definir el contrato central
   Decida qué comportamiento compartido debe poseer el núcleo: política, reserva, fusión de configuración,
   ciclo de vida, semántica orientada al canal y forma del asistente de tiempo de ejecución.
2. agregar superficies de registro/tiempo de ejecución de complementos tipados
   Extienda `OpenClawPluginApi` y/o `api.runtime` con la superficie de capacidad tipada más útil pequeña.
3. conectar núcleo + consumidores de canal/característica
   Los canales y los complementos de características deben consumir la nueva capacidad a través del núcleo,
   no importando una implementación de proveedor directamente.
4. registrar implementaciones de proveedores
   Luego, los complementos de proveedores registran sus backends contra la capacidad.
5. agregar cobertura de contrato
   Agregue pruebas para que la propiedad y la forma de registro sigan siendo explícitas con el tiempo.

Así es como OpenClaw mantiene su criterio sin volverse rígido con la visión
del mundo de un proveedor. Consulte el [Libro de recetas de capacidades](/es/tools/capability-cookbook)
para obtener una lista de verificación de archivos concreta y un ejemplo práctico.

### Lista de verificación de capacidades

Cuando agrega una nueva capacidad, la implementación generalmente debe tocar estas
superficies juntas:

- tipos de contrato principales en `src/<capability>/types.ts`
- asistente de ejecución/ejecución principal en `src/<capability>/runtime.ts`
- superficie de registro de API de complemento en `src/plugins/types.ts`
- cableado del registro de complementos en `src/plugins/registry.ts`
- exposición en tiempo de ejecución del complemento en `src/plugins/runtime/*` cuando los complementos
  de función/canal necesitan consumirla
- asistentes de captura/prueba en `src/test-utils/plugin-registration.ts`
- afirmaciones de propiedad/contrato en `src/plugins/contracts/registry.ts`
- documentación del operador/complemento en `docs/`

Si falta una de esas superficies, generalmente es una señal de que la capacidad
aún no está completamente integrada.

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

- core posee el contrato de capacidad + orquestación
- los complementos de proveedores poseen las implementaciones de proveedor
- los complementos de función/canal consumen asistentes de tiempo de ejecución
- las pruebas de contrato mantienen la propiedad explícita

Los complementos del motor de contexto también pueden registrar un administrador de contexto propiedad del tiempo de ejecución:

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

`ownsCompaction: false` no vuelve automáticamente a la compactación heredada.
Si su motor está activo, su método `compact()` todavía maneja `/compact` y
la recuperación de desbordamiento.

Luego habilítelo en la configuración:

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## Ganchos de complementos

Los complementos pueden registrar ganchos en tiempo de ejecución. Esto permite que un complemento incluya automatización
impulsada por eventos sin una instalación separada de un paquete de ganchos.

### Ejemplo

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // Hook logic here.
    },
    {
      name: "my-plugin.command-new",
      description: "Runs when /new is invoked",
    },
  );
}
```

Notas:

- Registre los ganchos explícitamente a través de `api.registerHook(...)`.
- Las reglas de elegibilidad de ganchos todavía se aplican (requisitos de SO/bins/env/config).
- Los ganchos gestionados por complementos aparecen en `openclaw hooks list` con `plugin:<id>`.
- No puede habilitar/deshabilitar los ganchos gestionados por complementos a través de `openclaw hooks`; en su lugar, habilite/deshabilite el complemento.

### Ganchos del ciclo de vida del agente (`api.on`)

Para los ganchos del ciclo de vida del tiempo de ejecución tipados, use `api.on(...)`:

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "Follow company style guide.",
      };
    },
    { priority: 10 },
  );
}
```

Ganchos importantes para la construcción del prompt:

- `before_model_resolve`: se ejecuta antes de cargar la sesión (`messages` no están disponibles). Úselo para anular de manera determinista `modelOverride` o `providerOverride`.
- `before_prompt_build`: se ejecuta después de cargar la sesión (`messages` están disponibles). Úselo para dar forma a la entrada del prompt.
- `before_agent_start`: gancho de compatibilidad heredada. Prefiera los dos ganchos explícitos anteriores.

Política de ganchos aplicada por el núcleo:

- Los operadores pueden deshabilitar los ganchos de mutación del prompt por complemento a través de `plugins.entries.<id>.hooks.allowPromptInjection: false`.
- Cuando se deshabilitan, OpenClaw bloquea `before_prompt_build` e ignora los campos de mutación del prompt devueltos por el `before_agent_start` heredado, mientras conserva los `modelOverride` y `providerOverride` heredados.

Campos de resultado de `before_prompt_build`:

- `prependContext`: antepone texto al prompt del usuario para esta ejecución. Es lo mejor para contenido específico del turno o dinámico.
- `systemPrompt`: anulación completa del prompt del sistema.
- `prependSystemContext`: antepone texto al prompt del sistema actual.
- `appendSystemContext`: añade texto al prompt del sistema actual.

Orden de construcción del prompt en el tiempo de ejecución integrado:

1. Aplicar `prependContext` al prompt del usuario.
2. Aplicar la anulación de `systemPrompt` cuando se proporcione.
3. Aplicar `prependSystemContext + current system prompt + appendSystemContext`.

Notas de combinación y precedencia:

- Los controladores de gancho se ejecutan por prioridad (primero los más altos).
- Para los campos de contexto combinados, los valores se concatenan en orden de ejecución.
- Los valores de `before_prompt_build` se aplican antes que los valores de reserva heredados de `before_agent_start`.

Guía de migración:

- Mueva la guía estática de `prependContext` a `prependSystemContext` (o `appendSystemContext`) para que los proveedores puedan cachear el contenido estable del prefijo del sistema.
- Mantenga `prependContext` para el contexto dinámico por turno que debe permanecer vinculado al mensaje del usuario.

## Complementos de proveedores (autenticación de modelo)

Los complementos pueden registrar **proveedores de modelos** para que los usuarios puedan ejecutar la configuración de OAuth o de claves de API dentro de OpenClaw, mostrar la configuración del proveedor en la incorporación/selectores de modelos y contribuir al descubrimiento implícito de proveedores.

Los complementos de proveedor son la superficie de extensión modular para la configuración de proveedores de modelos.
Ya no son solo "ayudantes de OAuth".

### Ciclo de vida del complemento de proveedor

Un complemento de proveedor puede participar en cinco fases distintas:

1. **Auth**
   `auth[].run(ctx)` realiza OAuth, captura de clave de API, código de dispositivo o configuración personalizada
   y devuelve perfiles de autenticación más parches de configuración opcionales.
2. **Configuración no interactiva**
   `auth[].runNonInteractive(ctx)` maneja `openclaw onboard --non-interactive`
   sin indicaciones. Use esto cuando el proveedor necesita una configuración personalizada sin interfaz
   más allá de las rutas simples de clave de API integradas.
3. **Integración con el asistente**
   `wizard.setup` agrega una entrada a `openclaw onboard`.
   `wizard.modelPicker` agrega una entrada de configuración al selector de modelos.
4. **Descubrimiento implícito**
   `discovery.run(ctx)` puede contribuir con la configuración del proveedor automáticamente durante
   la resolución/listado de modelos.
5. **Seguimiento posterior a la selección**
   `onModelSelected(ctx)` se ejecuta después de elegir un modelo. Úselo para trabajos
   específicos del proveedor, como descargar un modelo local.

Esta es la división recomendada porque estas fases tienen diferentes requisitos
de ciclo de vida:

- la autenticación es interactiva y escribe credenciales/configuración
- la configuración no interactiva se basa en indicadores/entorno y no debe solicitar indicaciones
- los metadatos del asistente son estáticos y orientados a la interfaz de usuario
- el descubrimiento debe ser seguro, rápido y tolerante a fallos
- los enlaces post-selección son efectos secundarios vinculados al modelo elegido

### Contrato de autenticación del proveedor

`auth[].run(ctx)` devuelve:

- `profiles`: perfiles de autenticación para escribir
- `configPatch`: cambios `openclaw.json` opcionales
- `defaultModel`: ref `provider/model` opcional
- `notes`: notas opcionales orientadas al usuario

El núcleo entonces:

1. escribe los perfiles de autenticación devueltos
2. aplica el cableado de configuración del perfil de autenticación
3. fusiona el parche de configuración
4. aplica opcionalmente el modelo predeterminado
5. ejecuta el enlace `onModelSelected` del proveedor cuando corresponda

Eso significa que un complemento de proveedor es propietario de la lógica de configuración específica del proveedor, mientras que el núcleo es propietario de la ruta genérica de persistencia y combinación de configuración.

### Contrato no interactivo del proveedor

`auth[].runNonInteractive(ctx)` es opcional. Implementarlo cuando el proveedor necesita una configuración sin interfaz que no se puede expresar a través de los flujos genéricos integrados de claves de API.

El contexto no interactivo incluye:

- la configuración actual y base
- opciones de CLI de incorporación analizadas
- asistentes de registro/errores en tiempo de ejecución
- directorios de agente/espacio de trabajo para que el proveedor pueda persistir la autenticación en el mismo almacén con ámbito que usa el resto de la incorporación
- `resolveApiKey(...)` para leer claves de proveedor desde indicadores, variables de entorno o perfiles de autenticación existentes, respetando `--secret-input-mode`
- `toApiKeyCredential(...)` para convertir una clave resuelta en una credencial de perfil de autenticación con el almacenamiento correcto de texto plano frente a referencia secreta

Use esta superficie para proveedores tales como:

- tiempos de ejecución compatibles con OpenAI autohospedados que necesitan `--custom-base-url` + `--custom-model-id`
- verificación no interactiva específica del proveedor o síntesis de configuración

No solicite desde `runNonInteractive`. Rechace las entradas faltantes con errores accionables en su lugar.

### Metadatos del asistente del proveedor

Los metadatos de autenticación/incorporación del proveedor pueden residir en dos capas:

- manifiesto `providerAuthChoices`: etiquetas económicas, agrupación, ids `--auth-choice` y metadatos simples de indicadores de CLI disponibles antes de la carga en tiempo de ejecución
- tiempo de ejecución `wizard.setup` / `auth[].wizard`: comportamiento más rico que depende del código del proveedor cargado

Use metadatos de manifiesto para etiquetas/indicadores estáticos. Use metadatos del asistente en tiempo de ejecución cuando la configuración dependa de métodos de autenticación dinámicos, método alternativo o validación en tiempo de ejecución.

`wizard.setup` controla cómo aparece el proveedor en la incorporación agrupada:

- `choiceId`: valor de elección de autenticación
- `choiceLabel`: etiqueta de opción
- `choiceHint`: pista corta
- `groupId`: id de cubo de grupo
- `groupLabel`: etiqueta de grupo
- `groupHint`: pista de grupo
- `methodId`: método de autenticación a ejecutar
- `modelAllowlist`: política de lista de permitidos posterior a la autenticación opcional (`allowedKeys`, `initialSelections`, `message`)

`wizard.modelPicker` controla cómo aparece un proveedor como una entrada de "configura esto ahora"
en la selección de modelo:

- `label`
- `hint`
- `methodId`

Cuando un proveedor tiene múltiples métodos de autenticación, el asistente puede apuntar a un método explícito o permitir que OpenClaw sintetice elecciones por método.

OpenClaw valida los metadatos del asistente del proveedor cuando el complemento se registra:

- los IDs de método de autenticación duplicados o en blanco se rechazan
- los metadatos del asistente se ignoran cuando el proveedor no tiene métodos de autenticación
- los enlaces `methodId` no válidos se degradan a advertencias y recurren a los
  métodos de autenticación restantes del proveedor

### Contrato de descubrimiento de proveedores

`discovery.run(ctx)` devuelve uno de:

- `{ provider }`
- `{ providers }`
- `null`

Use `{ provider }` para el caso común en el que el complemento posee un ID de proveedor.
Use `{ providers }` cuando un complemento descubra múltiples entradas de proveedor.

El contexto de descubrimiento incluye:

- la configuración actual
- directorios de agente/espacio de trabajo
- entorno de proceso
- un auxiliar para resolver la clave API del proveedor y un valor de clave API seguro para el descubrimiento

El descubrimiento debe ser:

- rápido
- mejor esfuerzo posible
- seguro de omitir en caso de fallo
- cuidadoso con los efectos secundarios

No debe depender de indicaciones ni de configuraciones de larga duración.

### Orden de descubrimiento

El descubrimiento de proveedores se ejecuta en fases ordenadas:

- `simple`
- `profile`
- `paired`
- `late`

Use:

- `simple` para el descubrimiento económico solo de entorno
- `profile` cuando el descubrimiento depende de perfiles de autenticación
- `paired` para proveedores que necesitan coordinarse con otro paso de descubrimiento
- `late` para sondeos costosos o de red local

La mayoría de los proveedores autohospedados deben usar `late`.

### Buenos límites de complementos de proveedor

Adecuado para complementos de proveedor:

- proveedores locales/autohospedados con flujos de configuración personalizados
- inicio de sesión OAuth/código de dispositivo específico del proveedor
- descubrimiento implícito de servidores de modelos locales
- efectos secundarios posteriores a la selección, como las extracciones de modelos

Ajuste menos convincente:

- proveedores triviales solo de clave de API que solo difieren por la variable de entorno, la URL base y un modelo predeterminado

Esos aún pueden convertirse en complementos, pero el principal beneficio de modularidad proviene de extraer primero los proveedores con comportamientos ricos.

Registre un proveedor mediante `api.registerProvider(...)`. Cada proveedor expone uno o más métodos de autenticación (OAuth, clave de API, código de dispositivo, etc.). Esos métodos pueden impulsar:

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- entradas de configuración de "proveedor personalizado" del selector de modelos
- descubrimiento implícito de proveedores durante la resolución/listado de modelos

Ejemplo:

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // Run OAuth flow and return auth profiles.
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
  wizard: {
    setup: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

Notas:

- `run` recibe un `ProviderAuthContext` con `prompter`, `runtime`, `openUrl`, `oauth.createVpsAwareHandlers`, `secretInputMode` y `allowSecretRefPrompt` de ayuda/estado. Los flujos de incorporación/configuración pueden usar estos para respetar `--secret-input-mode` u ofrecer captura de secret-ref de env/arch/exec, mientras que `openclaw models auth` mantiene una superficie de solicitud más ajustada.
- `runNonInteractive` recibe un `ProviderAuthMethodNonInteractiveContext` con `opts`, `agentDir`, `resolveApiKey` y `toApiKeyCredential` de ayuda para la incorporación sin interfaz gráfica.
- Devuelva `configPatch` cuando necesite agregar modelos predeterminados o configuración del proveedor.
- Devuelva `defaultModel` para que `--set-default` pueda actualizar los valores predeterminados del agente.
- `wizard.setup` añade una elección de proveedor a las superficies de incorporación, como `openclaw onboard` / `openclaw setup --wizard`.
- `wizard.setup.modelAllowlist` permite que el proveedor reduzca la solicitud de lista de permitidos del modelo de seguimiento durante la incorporación/configuración.
- `wizard.modelPicker` añade una entrada "configurar este proveedor" al selector de modelos.
- `deprecatedProfileIds` permite que el proveedor sea responsable de la limpieza de `openclaw doctor` para
  los ids de perfiles de autenticación retirados.
- `discovery.run` devuelve `{ provider }` para el id del propio proveedor del complemento
  o `{ providers }` para el descubrimiento multiproveedor.
- `discovery.order` controla cuándo se ejecuta el proveedor en relación con las
  fases de descubrimiento integradas: `simple`, `profile`, `paired` o `late`.
- `onModelSelected` es el enlace posterior a la selección para el trabajo de
  seguimiento específico del proveedor, como extraer un modelo local.

### Registrar un canal de mensajería

Los complementos pueden registrar **complementos de canal** que se comportan como canales integrados
(WhatsApp, Telegram, etc.). La configuración del canal reside en `channels.<id>` y es
validada por el código de tu complemento de canal.

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "demo channel plugin.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

Notas:

- Pon la configuración bajo `channels.<id>` (no `plugins.entries`).
- `meta.label` se usa para etiquetas en listas de CLI/interfaz de usuario.
- `meta.aliases` añade ids alternativos para normalización y entradas de CLI.
- `meta.preferOver` lista los ids de canal para omitir el habilitado automático cuando ambos están configurados.
- `meta.detailLabel` y `meta.systemImage` permiten que las interfaces de usuario muestren etiquetas/iconos de canal más enriquecidos.

### Enlaces de configuración del canal

División de configuración preferida:

- `plugin.setup` se encarga de la normalización del id de cuenta, la validación y la escritura de la configuración.
- `plugin.setupWizard` permite al anfitrión ejecutar el flujo común del asistente mientras que el canal solo proporciona descriptores de estado, credenciales, lista de permitidos de MD y acceso al canal.

`plugin.setupWizard` es mejor para los canales que se ajustan al patrón compartido:

- un selector de cuenta impulsado por `plugin.config.listAccountIds`
- paso opcional de verificación previa/preparación antes de la solicitud (por ejemplo, trabajo de instalador/inicialización)
- solicitud opcional de acceso directo de entorno para conjuntos de credenciales agrupadas (por ejemplo, tokens de bot/aplicación emparejados)
- una o más solicitudes de credenciales, donde cada paso escribe a través de `plugin.setup.applyAccountConfig` o un parche parcial propiedad del canal
- prompts de texto opcionales no secretos (por ejemplo, rutas de CLI, URLs base, identificadores de cuenta)
- prompts opcionales de lista de permitidos de acceso a canal/grupo resueltos por el host
- resolución opcional de lista de permitidos de MD (por ejemplo, `@username` -> id numérico)
- nota de finalización opcional después de que finalice la configuración

### Escribir un nuevo canal de mensajería (paso a paso)

Use esto cuando desee una **nueva superficie de chat** (un "canal de mensajería"), no un proveedor de modelos.
La documentación del proveedor de modelos se encuentra en `/providers/*`.

1. Elija un id + forma de configuración

- Toda la configuración del canal se encuentra en `channels.<id>`.
- Prefiera `channels.<id>.accounts.<accountId>` para configuraciones de múltiples cuentas.

2. Definir los metadatos del canal

- `meta.label`, `meta.selectionLabel`, `meta.docsPath`, `meta.blurb` controlan las listas de CLI/UI.
- `meta.docsPath` debe apuntar a una página de documentación como `/channels/<id>`.
- `meta.preferOver` permite que un complemento reemplace otro canal (la activación automática lo prefiere).
- `meta.detailLabel` y `meta.systemImage` son utilizados por las interfaces de usuario para texto/iconos de detalles.

3. Implementar los adaptadores requeridos

- `config.listAccountIds` + `config.resolveAccount`
- `capabilities` (tipos de chat, medios, hilos, etc.)
- `outbound.deliveryMode` + `outbound.sendText` (para envío básico)

4. Añadir adaptadores opcionales según sea necesario

- `setup` (validación + escrituras de configuración), `setupWizard` (asistente propiedad del host), `security` (política de MD), `status` (salud/diagnóstico)
- `gateway` (iniciar/detener/iniciar sesión), `mentions`, `threading`, `streaming`
- `actions` (acciones de mensaje), `commands` (comportamiento de comando nativo)

5. Registrar el canal en su complemento

- `api.registerChannel({ plugin })`

Ejemplo de configuración mínima:

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

Complemento de canal mínimo (solo salida):

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat messaging channel.",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // deliver `text` to your channel here
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

Cargue el complemento (directorio de extensiones o `plugins.load.paths`), reinicie la puerta de enlace,
luego configure `channels.<id>` en su configuración.

### Herramientas de agente

Vea la guía dedicada: [Herramientas de agente de complemento](/es/plugins/agent-tools).

### Registrar un método RPC de puerta de enlace

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### Registrar comandos de CLI

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### Registrar comandos de autorespuesta

Los complementos pueden registrar comandos de barra personalizados que se ejecuten **sin invocar al
agente de IA**. Esto es útil para comandos de activación, comprobaciones de estado o acciones rápidas
que no necesitan procesamiento de LLM.

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "Show plugin status",
    handler: (ctx) => ({
      text: `Plugin is running! Channel: ${ctx.channel}`,
    }),
  });
}
```

Contexto del manejador de comandos:

- `senderId`: El ID del remitente (si está disponible)
- `channel`: El canal donde se envió el comando
- `isAuthorizedSender`: Si el remitente es un usuario autorizado
- `args`: Argumentos pasados después del comando (si `acceptsArgs: true`)
- `commandBody`: El texto completo del comando
- `config`: La configuración actual de OpenClaw

Opciones de comando:

- `name`: Nombre del comando (sin el `/`) inicial
- `nativeNames`: Alias de comandos nativos opcionales para superficies de barra/menú. Use `default` para todos los proveedores nativos, o claves específicas del proveedor como `discord`
- `description`: Texto de ayuda mostrado en las listas de comandos
- `acceptsArgs`: Si el comando acepta argumentos (predeterminado: false). Si es falso y se proporcionan argumentos, el comando no coincidirá y el mensaje pasará a otros manejadores
- `requireAuth`: Si se requiere un remitente autorizado (predeterminado: true)
- `handler`: Función que devuelve `{ text: string }` (puede ser asíncrona)

Ejemplo con autorización y argumentos:

```ts
api.registerCommand({
  name: "setmode",
  description: "Set plugin mode",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `Mode set to: ${mode}` };
  },
});
```

Notas:

- Los comandos de complemento se procesan **antes** que los comandos integrados y el agente de IA
- Los comandos se registran globalmente y funcionan en todos los canales
- Los nombres de los comandos no distinguen entre mayúsculas y minúsculas (`/MyStatus` coincide con `/mystatus`)
- Los nombres de los comandos deben comenzar con una letra y contener solo letras, números, guiones y guiones bajos
- Los nombres de comandos reservados (como `help`, `status`, `reset`, etc.) no pueden ser anulados por los complementos
- El registro de comandos duplicados en los complementos fallará con un error de diagnóstico

### Registrar servicios en segundo plano

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("ready"),
    stop: () => api.logger.info("bye"),
  });
}
```

## Convenciones de nomenclatura

- Métodos de la puerta de enlace: `pluginId.action` (ejemplo: `voicecall.status`)
- Herramientas: `snake_case` (ejemplo: `voice_call`)
- Comandos de CLI: kebab o camel, pero evitar conflictos con los comandos principales

## Habilidades

Los complementos pueden incluir una habilidad en el repositorio (`skills/<name>/SKILL.md`).
Actívela con `plugins.entries.<id>.enabled` (u otras puertas de configuración) y asegúrese
de que esté presente en sus ubicaciones de habilidades administradas/espacio de trabajo.

## Distribución (npm)

Empaquetado recomendado:

- Paquete principal: `openclaw` (este repositorio)
- Complementos: paquetes npm separados bajo `@openclaw/*` (ejemplo: `@openclaw/voice-call`)

Contrato de publicación:

- El complemento `package.json` debe incluir `openclaw.extensions` con uno o más archivos de entrada.
- Opcional: `openclaw.setupEntry` puede apuntar a una entrada ligera solo de configuración para la configuración del canal deshabilitado o aún no configurado.
- Opcional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` puede optar a que un complemento de canal use `setupEntry` durante el inicio de la puerta de enlace de preescucha, pero solo cuando esa entrada de configuración cubra completamente la superficie crítica para el inicio del complemento.
- Los archivos de entrada pueden ser `.js` o `.ts` (jiti carga TS en tiempo de ejecución).
- `openclaw plugins install <npm-spec>` usa `npm pack`, extrae en `~/.openclaw/extensions/<id>/` y lo habilita en la configuración.
- Estabilidad de la clave de configuración: los paquetes con ámbito se normalizan al id **sin ámbito** para `plugins.entries.*`.

## Complemento de ejemplo: Llamada de voz

Este repositorio incluye un complemento de llamada de voz (Twilio o respaldo de registro):

- Fuente: `extensions/voice-call`
- Habilidad: `skills/voice-call`
- CLI: `openclaw voicecall start|status`
- Herramienta: `voice_call`
- RPC: `voicecall.start`, `voicecall.status`
- Config (twilio): `provider: "twilio"` + `twilio.accountSid/authToken/from` (`statusCallbackUrl` opcional, `twimlUrl`)
- Config (dev): `provider: "log"` (sin red)

Consulte [Voice Call](/es/plugins/voice-call) y `extensions/voice-call/README.md` para la configuración y el uso.

## Notas de seguridad

Los complementos se ejecutan en proceso con el Gateway (consulte [Execution model](#execution-model)):

- Solo instale complementos en los que confíe.
- Prefiera listas de permitidos `plugins.allow`.
- Recuerde que `plugins.allow` se basa en ID, por lo que un complemento de espacio de trabajo habilitado puede
  sobrescribir intencionalmente un complemento incluido con el mismo ID.
- Reinicie el Gateway después de realizar cambios.

## Pruebas de complementos

Los complementos pueden (y deben) incluir pruebas:

- Los complementos en el repositorio pueden mantener las pruebas de Vitest en `src/**` (ejemplo: `src/plugins/voice-call.plugin.test.ts`).
- Los complementos publicados por separado deben ejecutar su propio CI (lint/build/test) y validar que `openclaw.extensions` apunte al punto de entrada compilado (`dist/index.js`).

import es from "/components/footer/es.mdx";

<es />
