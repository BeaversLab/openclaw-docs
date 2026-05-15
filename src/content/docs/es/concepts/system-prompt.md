---
summary: "Qué contiene el sistema de OpenClaw y cómo se ensambla"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System prompt"
---

OpenClaw construye un sistema de indicaciones personalizado (system prompt) para cada ejecución del agente. La indicación es de **propiedad de OpenClaw** y no utiliza la indicación predeterminada de pi-coding-agent.

La indicación es ensamblada por OpenClaw e inyectada en cada ejecución del agente.

El ensamblaje del prompt tiene tres capas:

- `buildAgentSystemPrompt` renderiza el prompt a partir de entradas explícitas. Debe
  permanecer como un renderizador puro y no debe leer la configuración global directamente.
- `resolveAgentSystemPromptConfig` resuelve los controles del prompt respaldados por configuración, como
  la visualización del propietario, sugerencias de TTS, alias de modelos, modo de cita de memoria y modo de
  delegación de subagente para un agente específico.
- Los adaptadores de tiempo de ejecución (integrado, CLI, vistas previas de comando/exportación, compactación) recopilan
  datos en vivo, como herramientas, estado del sandbox, capacidades del canal, archivos de contexto
  y contribuciones de prompt del proveedor, y luego llaman a la fachada de prompt configurada.

Esto mantiene las superficies de prompt exportadas/depuradas alineadas con las ejecuciones en vivo sin
convertir cada detalle específico del tiempo de ejecución en un constructor monolítico.

Los complementos del proveedor pueden contribuir con orientación de prompt con reconocimiento de caché sin reemplazar
el prompt completo propiedad de OpenClaw. El tiempo de ejecución del proveedor puede:

- reemplazar un pequeño conjunto de secciones principales con nombre (`interaction_style`,
  `tool_call_style`, `execution_bias`)
- inyectar un **prefijo estable** por encima del límite de caché del prompt
- inyectar un **sufijo dinámico** por debajo del límite de caché del prompt

Use contribuciones propiedad del proveedor para el ajuste específico de la familia de modelos. Mantenga la mutación del
prompt `before_prompt_build` heredada para compatibilidad o cambios de prompt verdaderamente globales,
no para el comportamiento normal del proveedor.

La superposición de la familia OpenAI GPT-5 mantiene la regla de ejecución principal pequeña y añade
orientación específica del modelo para el anclaje de personalidad, salida concisa, disciplina de herramientas,
búsqueda en paralelo, cobertura de entregables, verificación, contexto faltante e
higiene de herramientas de terminal.

## Estructura

El prompt es intencionalmente compacto y utiliza secciones fijas:

- **Herramientas**: recordatorio de la fuente de verdad de la herramienta estructurada más orientación de uso de herramientas en tiempo de ejecución.
- **Sesgo de ejecución**: orientación compacta de seguimiento: actuar por turno en
  solicitudes accionables, continuar hasta terminar o bloquearse, recuperarse de resultados de herramientas
  débiles, verificar el estado mutable en vivo y verificar antes de finalizar.
- **Seguridad**: recordatorio corto de guardabareras para evitar el comportamiento de búsqueda de poder o eludir la supervisión.
- **Habilidades** (cuando están disponibles): indica al modelo cómo cargar las instrucciones de habilidades bajo demanda.
- **Autoactualización de OpenClaw**: cómo inspeccionar la configuración de forma segura con
  `config.schema.lookup`, parchear la configuración con `config.patch`, reemplazar la configuración
  completa con `config.apply` y ejecutar `update.run` solo bajo solicitud explícita del
  usuario. La herramienta `gateway` exclusiva del propietario también se niega a reescribir
  `tools.exec.ask` / `tools.exec.security`, incluidos los alias `tools.bash.*`
  heredados que se normalizan a esas rutas de ejecución protegidas.
- **Espacio de trabajo (Workspace)**: directorio de trabajo (`agents.defaults.workspace`).
- **Documentación**: ruta local a los documentos de OpenClaw (repositorio o paquete npm) y cuándo leerlos.
- **Archivos del espacio de trabajo (inyectados)**: indica que los archivos de arranque se incluyen a continuación.
- **Sandbox** (cuando está habilitado): indica el tiempo de ejecución en sandbox, las rutas del sandbox y si la ejecución elevada está disponible.
- **Fecha y hora actual**: solo la zona horaria (estable en caché; el reloj en vivo proviene de `session_status`).
- **Etiquetas de respuesta (Reply Tags)**: sintaxis opcional de etiquetas de respuesta para los proveedores compatibles.
- **Latidos (Heartbeats)**: comportamiento del aviso de latido y acuse de recibo, cuando los latidos están habilitados para el agente predeterminado.
- **Tiempo de ejecución (Runtime)**: host, sistema operativo, nodo, modelo, raíz del repositorio (cuando se detecta), nivel de pensamiento (una línea).
- **Razonamiento**: nivel de visibilidad actual + sugerencia de alternancia /reasoning.

OpenClaw mantiene contenido estable grande, incluido el **Contexto del proyecto**, por encima del
límite de caché del aviso interno. Las secciones volátiles de canal/sesión, como la
orientación integrada en la interfaz de usuario de control, **Mensajería**, **Voz**, **Contexto de chat grupal**,
**Reacciones**, **Latidos** y **Tiempo de ejecución**, se agregan debajo de ese límite
para que los backends locales con cachés de prefijo puedan reutilizar el prefijo estable del espacio de trabajo
a través de los turnos del canal. Las descripciones de las herramientas también deben evitar incrustar los nombres
de canal actuales cuando el esquema aceptado ya lleva ese detalle de tiempo de ejecución.

La sección de herramientas también incluye orientación de tiempo de ejecución para el trabajo de larga duración:

- usar cron para el seguimiento futuro (`check back later`, recordatorios, trabajo recurrente)
  en lugar de `exec` bucles de suspensión (sleep), `yieldMs` trucos de retraso o `process`
  encuestas repetidas
- use `exec` / `process` solo para comandos que comienzan ahora y continúan ejecutándose
  en segundo plano
- cuando la activación por finalización automática está habilitada, inicie el comando una vez y confíe en
  la ruta de activación basada en inserción (push) cuando emite salida o falla
- use `process` para registros, estado, entrada o intervención cuando necesite
  inspeccionar un comando en ejecución
- si la tarea es más grande, prefiera `sessions_spawn`; la finalización del subagente es
  basada en inserción (push) y se anuncia automáticamente al solicitante
- no sondee `subagents list` / `sessions_list` en un bucle solo para esperar la
  finalización

`agents.defaults.subagents.delegationMode` puede fortalecer esta guía. El
modo `suggest` predeterminado mantiene el empujón (nudge) de línea base. `prefer` añade una sección
dedicada de **Delegación de Sub-Agentes** que indica al agente principal que actúe como un
coordinador receptivo y envíe cualquier cosa más compleja que una respuesta directa a través de
`sessions_spawn`. Esto es solo del prompt; la política de herramientas todavía controla si
`sessions_spawn` está disponible.

Cuando la herramienta experimental `update_plan` está habilitada, Tooling también le dice al
modelo que la use solo para trabajo de varios pasos no trivial, mantener exactamente un
paso `in_progress` y evitar repetir el plan completo después de cada actualización.

Las salvaguardas de seguridad en el prompt del sistema son asesorias. Guían el comportamiento del modelo pero no hacen cumplir la política. Use la política de herramientas, aprobaciones de ejecución, sandboxing y listas de permitidos de canales para una aplicación estricta; los operadores pueden deshabilitarlos por diseño.

En canales con tarjetas/botones de aprobación nativos, el prompt de ejecución ahora le dice al
agente que confíe primero en esa interfaz de usuario de aprobación nativa. Solo debe incluir un comando
manual `/approve` cuando el resultado de la herramienta indica que las aprobaciones de chat no están disponibles o
la aprobación manual es la única ruta.

## Modos de prompt

OpenClaw puede renderizar prompts del sistema más pequeños para subagentes. El tiempo de ejecución establece un
`promptMode` para cada ejecución (no una configuración visible para el usuario):

- `full` (predeterminado): incluye todas las secciones anteriores.
- `minimal`: se usa para subagentes; omite **Habilidades** (**Skills**), **Recuerdo de memoria** (**Memory Recall**), **OpenClaw
  Autoactualización** (**Self-Update**), **Alias de modelo** (**Model Aliases**), **Identidad de usuario** (**User Identity**), **Etiquetas de respuesta** (**Reply Tags**),
  **Mensajería** (**Messaging**), **Respuestas silenciosas** (**Silent Replies**) y **Latidos** (**Heartbeats**). Las herramientas, **Seguridad** (**Safety**),
  Espacio de trabajo, Sandbox, Fecha y hora actual (cuando se conoce), Tiempo de ejecución y el contexto
  inyectado siguen disponibles.
- `none`: devuelve solo la línea de identidad base.

Cuando `promptMode=minimal`, los prompts adicionales inyectados se etiquetan como **Contexto de
subagente** (**Subagent Context**) en lugar de **Contexto de chat grupal** (**Group Chat Context**).

Para las ejecuciones de autorespuesta de canal, OpenClaw puede omitir la sección genérica de **Respuestas silenciosas**
(**Silent Replies**) cuando el contexto de chat directo/grupal ya incluye el comportamiento `NO_REPLY`
específico de la conversación resuelto. Esto evita repetir la mecánica de tokens
tanto en el prompt del sistema global como en el contexto del canal.

## Instantáneas del prompt

OpenClaw mantiene instantáneas confirmadas del prompt para la ruta feliz de tiempo de ejecución de Codex en
`test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/`. Estas renderizan
los parámetros seleccionados de hilo/turno del servidor de aplicaciones más una pila reconstruida de capas de prompt
vinculadas al modelo para turnos directos de Telegram, grupos de Discord y latidos. Esa pila
incluye un dispositivo de prompt de modelo de Codex `gpt-5.5` anclado, generado a partir de la forma del
catálogo/caché de modelos de Codex, el texto de permisos para desarrolladores de la ruta feliz de Codex,
instrucciones de desarrollador de OpenClaw, instrucciones de modo de colaboración con ámbito de turno
cuando OpenClaw las proporciona, la entrada del turno del usuario y referencias a las especificaciones
dinámicas de las herramientas.

Actualice el dispositivo de prompt de modelo de Codex anclado con
`pnpm prompt:snapshots:sync-codex-model`. De forma predeterminada, el script busca
la caché de tiempo de ejecución de Codex en `$CODEX_HOME/models_cache.json`, luego
`~/.codex/models_cache.json`, y solo luego recurre a la convención de checkout
del mantenedor de Codex en `~/code/codex/codex-rs/models-manager/models.json`. Si
ninguna de esas fuentes existe, el comando sale sin cambiar el dispositivo
confirmado. Pase `--catalog <path>` para actualizar desde un archivo `models_cache.json`
o `models.json` específico.

Estas instantáneas siguen sin ser una captura bruta byte por byte de la solicitud de OpenAI. Codex
puede agregar contexto del espacio de trabajo propiedad del tiempo de ejecución, como `AGENTS.md`, contexto
del entorno, recuerdos, instrucciones de la aplicación/complemento e instrucciones integradas del modo de
colaboración Predeterminado dentro del tiempo de ejecución de Codex después de que OpenClaw envía
los parámetros del hilo y del turno.

Regenérelos con `pnpm prompt:snapshots:gen` y verifique la deriva con
`pnpm prompt:snapshots:check`. La CI ejecuta la verificación de deriva en el fragmento
límite adicional para que los cambios en el mensaje y las actualizaciones de las instantáneas permanezcan adjuntos al mismo
PR.

## Inyección de arranque del espacio de trabajo

Los archivos de arranque se recortan y se añaden bajo **Contexto del proyecto** para que el modelo vea el contexto de identidad y de perfil sin necesidad de lecturas explícitas:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (solo en espacios de trabajo completamente nuevos)
- `MEMORY.md` cuando está presente

Todos estos archivos se **inyectan en la ventana de contexto** en cada turno a menos que
se aplique una puerta específica del archivo. `HEARTBEAT.md` se omite en ejecuciones normales cuando
los latidos están deshabilitados para el agente predeterminado o
`agents.defaults.heartbeat.includeSystemPromptSection` es falso. Mantenga los archivos
inyectados concisos, especialmente `MEMORY.md`. `MEMORY.md` está destinado a mantenerse como
un resumen a largo plazo curado; las notas diarias detalladas pertenecen a `memory/*.md` donde
`memory_search` y `memory_get` pueden recuperarlas bajo demanda. Los archivos
`MEMORY.md` demasiado grandes aumentan el uso del mensaje y pueden inyectarse parcialmente debido a
los límites de archivos de arranque a continuación.

Cuando se ejecuta una sesión en el arnés nativo de Codex, Codex carga `AGENTS.md`
a través de su propio descubrimiento de documentos del proyecto. OpenClaw todavía resuelve los archivos restantes
de arranque y los reenvía como instrucciones de configuración de Codex, por lo que `SOUL.md`,
`TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` y
`MEMORY.md` mantienen el mismo rol de contexto del espacio de trabajo sin duplicar
`AGENTS.md`.

<Note>
  Los archivos diarios `memory/*.md` **no** son parte del Contexto del Proyecto de arranque normal. En turnos ordinarios se accede a ellos bajo demanda a través de las herramientas `memory_search` y `memory_get`, por lo que no cuentan contra la ventana de contexto a menos que el modelo los lea explícitamente. Los turnos `/new` y `/reset` simples son la excepción: el tiempo de ejecución puede
  anteponer la memoria diaria reciente como un bloque de contexto de inicio de un solo uso para ese primer turno.
</Note>

Los archivos grandes se truncan con un marcador. El tamaño máximo por archivo se controla mediante
`agents.defaults.bootstrapMaxChars` (predeterminado: 12000). El contenido total inyectado del arranque
entre archivos está limitado por `agents.defaults.bootstrapTotalMaxChars`
(predeterminado: 60000). Los archivos faltantes inyectan un marcador corto de archivo faltante. Cuando ocurre el truncamiento,
OpenClaw puede inyectar un aviso conciso de advertencia en el prompt del sistema; controle esto con
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always`;
predeterminado: `once`). Los conteos detallados brutos/inyectados permanecen en diagnósticos como
`/context`, `/status`, doctor y registros.

Para los archivos de memoria, el truncamiento no es una pérdida de datos: el archivo permanece intacto en el disco,
pero el modelo solo ve la copia inyectada y acortada hasta que lee o busca
la memoria directamente. Si `MEMORY.md` se trunca repetidamente, destílelo en un
resumen duradero más corto y mueva el historial detallado a `memory/*.md`, o
aumente intencionalmente los límites de arranque.

Las sesiones de sub-agentes solo inyectan `AGENTS.md` y `TOOLS.md` (otros archivos de arranque
se filtran para mantener el contexto del sub-agente pequeño).

Los hooks internos pueden interceptar este paso a través de `agent:bootstrap` para mutar o reemplazar
los archivos de arranque inyectados (por ejemplo, intercambiando `SOUL.md` por una personalidad alternativa).

Si quieres que el agente suene menos genérico, comienza con
[Guía de personalidad SOUL.md](/es/concepts/soul).

Para inspeccionar cuánto contribuye cada archivo inyectado (bruto vs inyectado, truncamiento, más la sobrecarga del esquema de herramientas), usa `/context list` o `/context detail`. Consulta [Contexto](/es/concepts/context).

## Manejo del tiempo

El prompt del sistema incluye una sección dedicada de **Fecha y hora actual** cuando la
zona horaria del usuario es conocida. Para mantener el prompt estable en caché, ahora solo incluye
la **zona horaria** (sin reloj dinámico ni formato de hora).

Usa `session_status` cuando el agente necesite la hora actual; la tarjeta de estado
incluye una línea de marca de tiempo. La misma herramienta puede establecer opcionalmente una anulación
de modelo por sesión (`model=default` la borra).

Configura con:

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Consulta [Fecha y hora](/es/date-time) para detalles completos del comportamiento.

## Habilidades

Cuando existen habilidades elegibles, OpenClaw inyecta una **lista de habilidades disponibles** compacta
(`formatSkillsForPrompt`) que incluye la **ruta de archivo** para cada habilidad. El
prompt indica al modelo que use `read` para cargar el SKILL.md en la ubicación
listada (espacio de trabajo, gestionada o empaquetada). Si no hay habilidades elegibles, la
sección de Habilidades se omite.

La elegibilidad incluye las puertas de metadatos de habilidad, las comprobaciones de entorno/configuración en tiempo de ejecución,
y la lista de permitidos de habilidades del agente efectiva cuando `agents.defaults.skills` o
`agents.list[].skills` está configurado.

Las habilidades empaquetadas en complementos (plugins) solo son elegibles cuando el complemento propietario está habilitado.
Esto permite que los complementos de herramientas exponguen guías de operación más profundas sin incrustar toda
esa guía directamente en cada descripción de herramienta.

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

Esto mantiene el aviso base pequeño mientras sigue permitiendo el uso de habilidades específicas.

El presupuesto de la lista de habilidades es propiedad del subsistema de habilidades:

- Predeterminado global: `skills.limits.maxSkillsPromptChars`
- Anulación por agente: `agents.list[].skillsLimits.maxSkillsPromptChars`

Los extractos de tiempo de ejecución limitados genéricos usan una superficie diferente:

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

Esa separación mantiene el tamaño de las habilidades separado del tamaño de lectura/inyección en tiempo de ejecución, como `memory_get`, resultados de herramientas en vivo y actualizaciones de AGENTS.md después de la compactación.

## Documentación

El aviso del sistema incluye una sección de **Documentación**. Cuando hay documentación local disponible, apunta al directorio de documentos de OpenClaw local (`docs/` en una copia de trabajo de Git o los documentos del paquete npm incluidos). Si la documentación local no está disponible, recurre a [https://docs.openclaw.ai](https://docs.openclaw.ai).

La misma sección también incluye la ubicación del código fuente de OpenClaw. Las copias de trabajo de Git exponen la raíz del código fuente local para que el agente pueda inspeccionar el código directamente. Las instalaciones de paquetes incluyen la URL del código fuente de GitHub e indican al agente que revise el código allí siempre que la documentación esté incompleta o obsoleta. El aviso también indica el espejo de documentos públicos, el Discord de la comunidad y ClawHub ([https://clawhub.ai](https://clawhub.ai)) para el descubrimiento de habilidades. Indica al modelo que consulte primero la documentación sobre el comportamiento, los comandos, la configuración o la arquitectura de OpenClaw, y que ejecute `openclaw status` por sí mismo cuando sea posible (preguntando al usuario solo cuando no tenga acceso). Para la configuración específicamente, señala a los agentes a la acción de herramienta `gateway` `config.schema.lookup` para obtener documentación y restricciones exactas a nivel de campo, y luego a `docs/gateway/configuration.md` y `docs/gateway/configuration-reference.md` para obtener una orientación más amplia.

## Relacionado

- [Tiempo de ejecución del agente](/es/concepts/agent)
- [Espacio de trabajo del agente](/es/concepts/agent-workspace)
- [Motor de contexto](/es/concepts/context-engine)
