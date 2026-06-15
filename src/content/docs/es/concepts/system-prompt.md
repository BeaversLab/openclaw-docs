---
summary: "Qué contiene el sistema de OpenClaw y cómo se ensambla"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System prompt"
---

OpenClaw genera un mensaje del sistema personalizado para cada ejecución del agente. El mensaje es **propiedad de OpenClaw** y no utiliza un mensaje predeterminado en tiempo de ejecución.

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
- **Control de OpenClaw**: indica al modelo que prefiera la herramienta `gateway` para
  el trabajo de configuración/reinicio y que evite inventar comandos de CLI.
- **Actualización automática de OpenClaw**: cómo inspeccionar la configuración de forma segura con
  `config.schema.lookup`, aplicar parches a la configuración con `config.patch`, reemplazar la
  configuración completa con `config.apply` y ejecutar `update.run` solo bajo solicitud
  explícita del usuario. La herramienta `gateway` orientada al agente también se niega a reescribir
  `tools.exec.ask` / `tools.exec.security`, incluidos los alias `tools.bash.*`
  heredados que se normalizan a esas rutas de ejecución protegidas.
- **Espacio de trabajo**: directorio de trabajo (`agents.defaults.workspace`).
- **Documentación**: ruta local a los documentos/fuente de OpenClaw y cuándo leerlos.
- **Archivos del espacio de trabajo (inyectados)**: indica que los archivos de arranque se incluyen a continuación.
- **Sandbox** (cuando está habilitado): indica el tiempo de ejecución en sandbox, las rutas del sandbox y si la ejecución elevada está disponible.
- **Fecha y hora actuales**: solo la zona horaria (estable en caché; el reloj en vivo proviene de `session_status`).
- **Directivas de salida del asistente**: sintaxis de etiquetas de archivo adjunto compacto, nota de voz y respuesta.
- **Latidos**: comportamiento del aviso y reconocimiento de latidos, cuando los latidos están habilitados para el agente predeterminado.
- **Tiempo de ejecución**: host, SO, nodo, modelo, raíz del repositorio (cuando se detecta), nivel de pensamiento (una línea).
- **Razonamiento**: nivel de visibilidad actual + sugerencia de activación /reasoning.

OpenClaw mantiene contenido grande y estable, incluyendo **Contexto del proyecto**, por encima del
límite de la caché del aviso interno. Las secciones volátiles de canal/sesión, como la guía incrustada
de la Interfaz de Usuario de Control, **Mensajería**, **Voz**, **Contexto de chat grupal**,
**Reacciones**, **Latidos** y **Tiempo de ejecución**, se anexan debajo de ese límite
para que los backends locales con cachés de prefijo puedan reutilizar el prefijo estable del espacio de trabajo
a través de los turnos del canal. Las descripciones de las herramientas también deben evitar incrustar nombres
de canal actuales cuando el esquema aceptado ya lleva ese detalle de tiempo de ejecución.

La sección de Herramientas también incluye orientación de tiempo de ejecución para trabajos de larga duración:

- use cron para seguimientos futuros (`check back later`, recordatorios, trabajo recurrente)
  en lugar de `exec` bucles de suspensión, `yieldMs` trucos de retraso o `process`
  sondeo repetido
- use `exec` / `process` solo para comandos que comienzan ahora y continúan ejecutándose
  en segundo plano
- cuando la activación automática por finalización está habilitada, inicie el comando una vez y confíe en
  la ruta de activación basada en push cuando emita salida o falle
- use `process` para registros, estado, entrada o intervención cuando necesite
  inspeccionar un comando en ejecución
- si la tarea es más grande, prefiera `sessions_spawn`; la finalización del subagente es
  basada en push y se anuncia automáticamente al solicitante
- no sondee `subagents list` / `sessions_list` en un bucle solo para esperar
  la finalización

`agents.defaults.subagents.delegationMode` puede reforzar esta orientación. El modo `suggest` predeterminado mantiene el empuje de línea base. `prefer` añade una sección dedicada **Delegación de Subagente** indicando al agente principal que actúe como un coordinador receptivo y envíe cualquier cosa más compleja que una respuesta directa a través de `sessions_spawn`. Esto es solo en el mensaje; la política de herramientas todavía controla si `sessions_spawn` está disponible.

Cuando la herramienta experimental `update_plan` está habilitada, Tooling también indica al modelo que la use solo para trabajo de múltiples pasos no trivial, mantenga exactamente un paso `in_progress` y evite repetir el plan completo después de cada actualización.

Las salvaguardas de seguridad en el sistema de instrucciones son consultivas. Guían el comportamiento del modelo pero no hacen cumplir la política. Utilice la política de herramientas, aprobaciones de ejecución, sandboxing y listas de permitidos de canales para el cumplimiento estricto; los operadores pueden deshabilitarlos por diseño.

En canales con tarjetas/botones de aprobación nativos, el mensaje en tiempo de ejecución ahora indica al agente que confíe primero en esa interfaz de usuario de aprobación nativa. Solo debe incluir un comando `/approve` manual cuando el resultado de la herramienta indique que las aprobaciones de chat no están disponibles o la aprobación manual es la única ruta.

## Modos de instrucciones

OpenClaw puede representar mensajes del sistema más pequeños para subagentes. El tiempo de ejecución establece un
`promptMode` para cada ejecución (no es una configuración visible para el usuario):

- `full` (predeterminado): incluye todas las secciones anteriores.
- `minimal`: se utiliza para subagentes; omite **Memory Recall** (Recuperación de memoria), **OpenClaw
  Self-Update** (OpenClaw Autoactualización), **Model Aliases** (Alias de modelo), **User Identity** (Identidad de usuario), **Assistant Output Directives**
  (Directivas de salida del asistente), **Messaging** (Mensajería), **Silent Replies** (Respuestas silenciosas) y **Heartbeats** (Latidos). Herramientas, **Safety** (Seguridad),
  **Skills** (Habilidades) cuando se proporcionan, Espacio de trabajo, Sandbox, Fecha y hora actual (cuando
  se conoce), Tiempo de ejecución y contexto inyectado permanecen disponibles.
- `none`: devuelve solo la línea de identidad base.

Cuando `promptMode=minimal`, los mensajes inyectados adicionales se etiquetan como **Subagent
Context** (Contexto de subagente) en lugar de **Group Chat Context** (Contexto de chat grupal).

Para ejecuciones de auto-respuesta de canal, OpenClaw omite la sección genérica de **Respuestas silenciosas** cuando el contexto directo, de grupo o solo de herramienta de mensajes posee el contrato de respuesta visible. Solo el modo automático antiguo de grupo/canal debería mostrar `NO_REPLY`; los chats directos y las respuestas de solo herramienta de mensajes no reciben orientación de token silencioso.

## Instantáneas del mensaje del sistema

OpenClaw guarda instantáneas confirmadas del mensaje del sistema para la ruta feliz (happy path) del tiempo de ejecución de Codex en
`test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/`. Representan
los parámetros seleccionados de hilo/turno del servidor de aplicaciones más una pila reconstruida de capas de mensajes vinculadas al modelo
para turnos directos de Telegram, grupos de Discord y latidos. Esa pila
incluye un dispositivo de mensaje de modelo `gpt-5.5` de Codex anclado generado a partir de la forma del catálogo/caché de modelos de Codex,
el texto de permiso para desarrolladores de la ruta feliz de Codex,
las instrucciones de desarrollador de OpenClaw, instrucciones del modo de colaboración por turno
cuando OpenClaw las proporciona, la entrada de turno del usuario y referencias a las especificaciones dinámicas de las herramientas.

Actualice el fixture del mensaje del modelo Codex anclado con
`pnpm prompt:snapshots:sync-codex-model`. De forma predeterminada, el script busca
la caché de tiempo de ejecución de Codex en `$CODEX_HOME/models_cache.json`, luego
`~/.codex/models_cache.json`, y solo luego recurre a la convención de checkout del
mantenedor de Codex en `~/code/codex/codex-rs/models-manager/models.json`. Si
ninguna de esas fuentes existe, el comando sale sin cambiar el fixture
confirmado. Pase `--catalog <path>` para actualizar desde un `models_cache.json`
específico o un archivo `models.json`.

Estas instantáneas todavía no son una captura de solicitud sin procesar de OpenAI byte por byte. Codex
puede agregar contexto del espacio de trabajo propio del tiempo de ejecución, como `AGENTS.md`, contexto
del entorno, memorias, instrucciones de aplicaciones/complementos e instrucciones integradas
predeterminadas del modo de colaboración dentro del tiempo de ejecución de Codex después de que OpenClaw envíe
los parámetros de hilo y turno.

Regenérelos con `pnpm prompt:snapshots:gen` y verifique la deriva con
`pnpm prompt:snapshots:check`. La CI ejecuta la verificación de deriva en el fragmento
límite adicional para que los cambios en el mensaje y las actualizaciones de las instantáneas permanezcan adjuntos al mismo
PR.

## Inyección de inicialización del espacio de trabajo

Los archivos de arranque se resuelven desde el espacio de trabajo activo y luego se enrutan a la
superficie del mensaje que coincida con su vida útil:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (solo en espacios de trabajo totalmente nuevos)
- `MEMORY.md` cuando está presente

En el arnés nativo de Codex, OpenClaw evita repetir archivos estables del espacio de trabajo
cada turno de usuario. Codex carga `AGENTS.md` a través de su propio descubrimiento de
documentos del proyecto. `SOUL.md`, `IDENTITY.md`, `TOOLS.md` y `USER.md` se reenvían como
instrucciones de desarrollador de Codex. La lista compacta de habilidades de OpenClaw también se reenvía
como instrucciones de desarrollador de colaboración con ámbito de turno. El contenido de `HEARTBEAT.md` no
se inyecta; los turnos de latido reciben una nota en modo de colaboración que apunta al archivo
cuando existe y no está vacío. El contenido de `MEMORY.md` del espacio de trabajo del agente
configurado no se pega en cada turno nativo de Codex; cuando las herramientas de memoria están
disponibles para ese espacio de trabajo, los turnos de Codex reciben una pequeña nota de memoria del espacio de trabajo en
las instrucciones de desarrollador de colaboración con ámbito de turno y deben usar `memory_search`
o `memory_get` cuando la memoria duradera sea relevante. Si las herramientas están deshabilitadas, la búsqueda
de memoria no está disponible, o el espacio de trabajo activo difiere del espacio de trabajo de memoria del agente,
`MEMORY.md` vuelve a la ruta normal de contexto de turno delimitado. El contenido activo de
`BOOTSTRAP.md` mantiene por ahora el rol normal de contexto de turno.

En arneses que no son Codex, los archivos de arranque continúan componiéndose en el
mensaje de OpenClaw según sus compuertas existentes. `HEARTBEAT.md` se omite en
las ejecuciones normales cuando los latidos están desactivados para el agente predeterminado o
`agents.defaults.heartbeat.includeSystemPromptSection` es falso. Mantenga los archivos inyectados
concisos, especialmente el `MEMORY.md` que no sea de Codex. `MEMORY.md` está destinado a mantenerse
como un resumen a largo plazo curado; las notas diarias detalladas pertenecen a `memory/*.md` donde
`memory_search` y `memory_get` pueden recuperarlas bajo demanda. Los archivos
`MEMORY.md` que no sean de Codex y de tamaño excesivo aumentan el uso del mensaje y pueden inyectarse parcialmente
debido a los límites de archivos de arranque a continuación.

<Note>
  `memory/*.md` Los archivos diarios **no** son parte del contexto de Proyecto de arranque normal. En turnos ordinarios, se accede a ellos bajo demanda mediante las herramientas `memory_search` y `memory_get`, por lo que no cuentan contra la ventana de contexto a menos que el modelo los lea explícitamente. Los turnos `/new` y `/reset` básicos son la excepción: el tiempo de ejecución puede
  anteponer la memoria diaria reciente como un bloque de contexto de inicio de uso único para ese primer turno.
</Note>

Los archivos grandes se truncan con un marcador. El tamaño máximo por archivo está controlado por
`agents.defaults.bootstrapMaxChars` (predeterminado: 20000). El contenido total de arranque inyectado
entre archivos está limitado por `agents.defaults.bootstrapTotalMaxChars`
(predeterminado: 60000). Los archivos faltantes inyectan un marcador corto de archivo faltante. Cuando se produce
el truncamiento, OpenClaw puede inyectar un aviso de advertencia conciso del sistema; controle esto con
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always`;
predeterminado: `always`). Los conteos detallados brutos/inyectados permanecen en diagnósticos como
`/context`, `/status`, doctor y registros.

Para los archivos de memoria, el truncamiento no es una pérdida de datos: el archivo permanece intacto en el disco.
En Codex nativo, `MEMORY.md` se lee bajo demanda a través de herramientas de memoria cuando
está disponible, con retroceso al mensaje acotado cuando las herramientas no pueden ejecutarse. En otros
arneses, el modelo solo ve la copia inyectada y acortada hasta que lee o
busca en la memoria directamente. Si `MEMORY.md` se trunca repetidamente allí, destile
lo en un resumen duradero más breve y mueva el historial detallado a `memory/*.md`,
o aumente intencionalmente los límites de arranque.

Las sesiones de subagentes solo inyectan `AGENTS.md` y `TOOLS.md` (otros archivos de arranque
se filtran para mantener el contexto del subagente pequeño).

Los enlaces internos pueden interceptar este paso mediante `agent:bootstrap` para modificar o reemplazar
los archivos de arranque inyectados (por ejemplo, intercambiar `SOUL.md` por una personalidad alternativa).

Si quieres que el agente suene menos genérico, comienza con
[Guía de personalidad SOUL.md](/es/concepts/soul).

Para inspeccionar cuánto contribuye cada archivo inyectado (sin procesar vs inyectado, truncamiento, más la sobrecarga del esquema de herramientas), usa `/context list` o `/context detail`. Consulta [Contexto](/es/concepts/context).

## Manejo del tiempo

El sistema de instrucciones incluye una sección dedicada de **Fecha y hora actual** cuando la
zona horaria del usuario es conocida. Para mantener el caché del sistema estable, ahora solo incluye
la **zona horaria** (sin reloj dinámico ni formato de hora).

Usa `session_status` cuando el agente necesita la hora actual; la tarjeta de estado
incluye una línea de marca de tiempo. La misma herramienta opcionalmente puede establecer una
anulación de modelo por sesión (`model=default` la borra).

Configurar con:

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Consulta [Fecha y hora](/es/date-time) para detalles completos del comportamiento.

## Habilidades

Cuando existen habilidades elegibles, OpenClaw inyecta una **lista de habilidades disponibles**
compacta (`formatSkillsForPrompt`) que incluye la **ruta de archivo** para cada habilidad. El
prompt instruye al modelo a usar `read` para cargar el SKILL.md en la ubicación
listada (espacio de trabajo, gestionada o empaquetada). Si no hay habilidades elegibles, la
sección de Habilidades se omite.

Los turnos nativos de Codex reciben esta lista como instrucciones de desarrollador de colaboración
con ámbito de turno en lugar de entrada de usuario por turno, excepto los turnos ligeros de cron que
conservan el mensaje programado exacto. Otros arneses mantienen la sección normal
del mensaje.

La ubicación puede apuntar a una habilidad anidada, tal como
`skills/personal/foo/SKILL.md`. El anidamiento es solo organizativo; el mensaje todavía
usa el nombre plano de la habilidad del frontmatter `SKILL.md`.

La elegibilidad incluye puertas de metadatos de habilidades, verificaciones de entorno/configuración en tiempo de ejecución,
y la lista blanca efectiva de habilidades del agente cuando `agents.defaults.skills` o
`agents.list[].skills` están configurados.

Las habilidades agrupadas en complementos solo son elegibles cuando el complemento propietario está habilitado.
Esto permite que los complementos de herramientas expongan guías operativas más profundas sin incrustar toda\esa guía directamente en cada descripción de herramienta.

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

Esto mantiene el mensaje base pequeño mientras permite el uso dirigido de habilidades.

El presupuesto de la lista de habilidades es propiedad del subsistema de habilidades:

- Predeterminado global: `skills.limits.maxSkillsPromptChars`
- Invalidación por agente: `agents.list[].skillsLimits.maxSkillsPromptChars`

Los fragmentos acotados genéricos en tiempo de ejecución utilizan una superficie diferente:

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

Esa división mantiene el tamaño de las habilidades separado del tamaño de lectura/inyección en tiempo de ejecución, como `memory_get`, resultados de herramientas en vivo y actualizaciones de AGENTS.md posteriores a la compactación.

## Documentación

El mensaje del sistema incluye una sección **Documentación**. Cuando hay documentación local disponible, apunta al directorio de documentación local de OpenClaw (`docs/` en una extracción de Git o la documentación del paquete npm incluido). Si la documentación local no está disponible, recurre a [https://docs.openclaw.ai](https://docs.openclaw.ai).

La misma sección también incluye la ubicación del código fuente de OpenClaw. Las extracciones de Git exponen la raíz del código fuente local para que el agente pueda inspeccionar el código directamente. Las instalaciones del paquete incluyen la URL del código fuente de GitHub e indican al agente que revise el código fuente allí siempre que la documentación esté incompleta o obsoleta. El mensaje también indica el espejo de la documentación pública, el Discord de la comunidad y ClawHub ([https://clawhub.ai](https://clawhub.ai)) para el descubrimiento de habilidades. Indica al modelo que consulte primero la documentación sobre el comportamiento, los comandos, la configuración o la arquitectura de OpenClaw, y que ejecute `openclaw status` por sí mismo cuando sea posible (solicitando al usuario solo cuando no tenga acceso). Para la configuración específicamente, señala a los agentes a la acción de herramienta `gateway` `config.schema.lookup` para obtener documentación y restricciones exactas a nivel de campo, y luego a `docs/gateway/configuration.md` y `docs/gateway/configuration-reference.md` para obtener orientación más amplia.

## Relacionado

- [Tiempo de ejecución del agente](/es/concepts/agent)
- [Espacio de trabajo del agente](/es/concepts/agent-workspace)
- [Motor de contexto](/es/concepts/context-engine)
