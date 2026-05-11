---
summary: "Qué contiene el sistema de OpenClaw y cómo se ensambla"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System prompt"
---

OpenClaw construye un sistema de indicaciones personalizado (system prompt) para cada ejecución del agente. La indicación es de **propiedad de OpenClaw** y no utiliza la indicación predeterminada de pi-coding-agent.

La indicación es ensamblada por OpenClaw e inyectada en cada ejecución del agente.

Los complementos del proveedor pueden contribuir con orientación de indicaciones consciente de la caché sin reemplazar
la indicación completa propiedad de OpenClaw. El tiempo de ejecución del proveedor puede:

- reemplazar un pequeño conjunto de secciones principales con nombre (`interaction_style`,
  `tool_call_style`, `execution_bias`)
- inyectar un **prefijo estable** por encima del límite de la caché de la indicación
- inyectar un **sufijo dinámico** por debajo del límite de la caché de la indicación

Utilice las contribuciones propiedad del proveedor para el ajuste específico de la familia del modelo. Mantenga la mutación
legacy `before_prompt_build` de la indicación para compatibilidad o cambios de indicación verdaderamente globales,
no para el comportamiento normal del proveedor.

La superposición (overlay) de la familia OpenAI GPT-5 mantiene la regla de ejecución principal pequeña y añade
orientación específica del modelo para el enganche de personalidad, salida concisa, disciplina de herramientas,
búsqueda en paralelo, cobertura de entregables, verificación, contexto faltante e
higiene de herramientas de terminal.

## Estructura

El prompt es intencionalmente compacto y utiliza secciones fijas:

- **Herramientas**: recordatorio de la fuente de verdad de la herramienta estructurada más la guía de uso de herramientas en tiempo de ejecución.
- **Sesgo de ejecución (Execution Bias)**: orientación compacta de seguimiento: actuar por turno en
  solicitudes accionables, continuar hasta terminar o bloquearse, recuperarse de resultados de herramientas
  débiles, verificar el estado mutable en vivo y verificar antes de finalizar.
- **Seguridad**: recordatorio breve de guardarraíles para evitar el comportamiento de búsqueda de poder o eludir la supervisión.
- **Habilidades (Skills)** (cuando estén disponibles): indica al modelo cómo cargar las instrucciones de habilidades bajo demanda.
- **Autoactualización de OpenClaw**: cómo inspeccionar la configuración de manera segura con
  `config.schema.lookup`, parchear la configuración con `config.patch`, reemplazar la configuración
  completa con `config.apply`, y ejecutar `update.run` solo bajo solicitud explícita del
  usuario. La herramienta `gateway` solo para propietarios también se niega a reescribir
  `tools.exec.ask` / `tools.exec.security`, incluidos los alias `tools.bash.*`
  legacy que se normalizan a esas rutas de ejecución protegidas.
- **Espacio de trabajo (Workspace)**: directorio de trabajo (`agents.defaults.workspace`).
- **Documentación**: ruta local a los documentos de OpenClaw (repositorio o paquete npm) y cuándo leerlos.
- **Archivos del espacio de trabajo (inyectados)**: indica que los archivos de inicio se incluyen a continuación.
- **Sandbox** (cuando está habilitado): indica el tiempo de ejecución en sandbox, las rutas del sandbox y si la ejecución elevada está disponible.
- **Fecha y hora actuales**: hora local del usuario, zona horaria y formato de hora.
- **Etiquetas de respuesta**: sintaxis opcional de etiquetas de respuesta para los proveedores compatibles.
- **Latidos (Heartbeats)**: comportamiento del aviso de latido y de reconocimiento, cuando los latidos están habilitados para el agente predeterminado.
- **Tiempo de ejecución**: host, sistema operativo, nodo, modelo, raíz del repositorio (cuando se detecta), nivel de pensamiento (una línea).
- **Razonamiento**: nivel de visibilidad actual + sugerencia de alternancia /reasoning.

La sección Herramientas también incluye orientación de tiempo de ejecución para trabajos de larga duración:

- use cron para el seguimiento futuro (`check back later`, recordatorios, trabajo recurrente)
  en lugar de bucles de suspensión `exec`, trucos de retraso `yieldMs` o sondeo `process`
  repetido
- use `exec` / `process` solo para comandos que comienzan ahora y siguen ejecutándose
  en segundo plano
- cuando la activación automática por finalización está habilitada, inicie el comando una vez y confíe en
  la ruta de activación basada en eventos cuando emite salida o falla
- use `process` para registros, estado, entrada o intervención cuando necesite
  inspeccionar un comando en ejecución
- si la tarea es más grande, prefiera `sessions_spawn`; la finalización del subagente es
  basada en eventos y se anuncia automáticamente al solicitante
- no sondee `subagents list` / `sessions_list` en un bucle solo para esperar
  la finalización

Cuando la herramienta experimental `update_plan` está habilitada, Herramientas también le indica al
modelo que la use solo para trabajo de varios pasos no trivial, mantenga exactamente un
paso `in_progress` y evite repetir el plan completo después de cada actualización.

Las barreras de seguridad en el aviso del sistema son advisory. Guían el comportamiento del modelo pero no aplican la política. Utilice la política de herramientas, aprobaciones de ejecución, sandboxing y listas de permitidos de canales para una aplicación estricta; los operadores pueden deshabilitar estas por diseño.

En los canales con tarjetas/botones de aprobación nativos, el mensaje de ejecución ahora le indica al agente que confíe primero en esa interfaz de usuario de aprobación nativa. Solo debe incluir un comando manual `/approve` cuando el resultado de la herramienta indique que las aprobaciones por chat no están disponibles o que la aprobación manual es la única opción.

## Modos de mensaje

OpenClaw puede representar mensajes del sistema más pequeños para subagentes. El tiempo de ejecución establece un `promptMode` para cada ejecución (no es una configuración visible para el usuario):

- `full` (predeterminado): incluye todas las secciones anteriores.
- `minimal`: se utiliza para subagentes; omite **Habilidades**, **Recuerdo de memoria**, **Actualización automática de OpenClaw**, **Alias de modelo**, **Identidad de usuario**, **Etiquetas de respuesta**, **Mensajería**, **Respuestas silenciosas** y **Latidos**. Las herramientas, **Seguridad**, Espacio de trabajo, Sandbox, Fecha y hora actual (cuando se conoce), Tiempo de ejecución y el contexto inyectado siguen disponibles.
- `none`: devuelve solo la línea de identidad base.

Cuando es `promptMode=minimal`, los mensajes adicionales inyectados se etiquetan como **Contexto de subagente** en lugar de **Contexto de chat grupal**.

## Inyección de arranque del espacio de trabajo

Los archivos de arranque se recortan y añaden bajo **Contexto del proyecto** para que el modelo vea el contexto de identidad y perfil sin necesidad de lecturas explícitas:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (solo en espacios de trabajo totalmente nuevos)
- `MEMORY.md` cuando está presente

Todos estos archivos se **inyectan en la ventana de contexto** en cada turno a menos que se aplique una puerta específica del archivo. `HEARTBEAT.md` se omite en ejecuciones normales cuando los latidos están deshabilitados para el agente predeterminado o `agents.defaults.heartbeat.includeSystemPromptSection` es falso. Mantenga los archivos inyectados concisos, especialmente `MEMORY.md`, que puede crecer con el tiempo y provocar un uso del contexto inesperadamente alto y una compactación más frecuente.

<Note>
  `memory/*.md` Los archivos diarios **no** son parte del Contexto del Proyecto de arranque normal. En turnos ordinarios se accede a ellos bajo demanda a través de las herramientas `memory_search` y `memory_get`, por lo que no cuentan contra la ventana de contexto a menos que el modelo los lea explícitamente. Los turnos `/new` y `/reset` simples son la excepción: el tiempo de ejecución puede
  anteponer la memoria diaria reciente como un bloque de contexto de inicio único para ese primer turno.
</Note>

Los archivos grandes se truncarán con un marcador. El tamaño máximo por archivo está controlado por
`agents.defaults.bootstrapMaxChars` (predeterminado: 12000). El contenido total de arranque inyectado
entre archivos está limitado por `agents.defaults.bootstrapTotalMaxChars`
(predeterminado: 60000). Los archivos faltantes inyectan un marcador corto de archivo faltante. Cuando ocurre la
truncación, OpenClaw puede inyectar un bloque de advertencia en el Contexto del Proyecto; controle esto con
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always`;
predeterminado: `once`).

Las sesiones de subagentes solo inyectan `AGENTS.md` y `TOOLS.md` (otros archivos de arranque
se filtran para mantener el contexto del subagente pequeño).

Los ganchos internos pueden interceptar este paso a través de `agent:bootstrap` para mutar o reemplazar
los archivos de arranque inyectados (por ejemplo, intercambiar `SOUL.md` por una personalidad alternativa).

Si quieres que el agente suene menos genérico, empieza con
[Guía de personalidad SOUL.md](/es/concepts/soul).

Para inspeccionar cuánto contribuye cada archivo inyectado (bruto vs. inyectado, truncación, más la sobrecarga del esquema de herramientas), usa `/context list` o `/context detail`. Consulte [Contexto](/es/concepts/context).

## Manejo del tiempo

El sistema de prompt incluye una sección dedicada **Fecha y hora actual** cuando la
zona horaria del usuario es conocida. Para mantener el caché del prompt estable, ahora solo incluye
la **zona horaria** (sin reloj dinámico o formato de hora).

Use `session_status` cuando el agente necesite la hora actual; la tarjeta de estado
incluye una línea de marca de tiempo. La misma herramienta puede establecer opcionalmente una anulación de modelo por sesión
(`model=default` la borra).

Configurar con:

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Consulte [Fecha y hora](/es/date-time) para obtener detalles completos del comportamiento.

## Habilidades

Cuando existen habilidades elegibles, OpenClaw inyecta una **lista de habilidades disponibles** compacta
(`formatSkillsForPrompt`) que incluye la **ruta de archivo** para cada habilidad. El
mensaje instruye al modelo a usar `read` para cargar el SKILL.md en la ubicación
listada (espacio de trabajo, gestionada o empaquetada). Si no hay habilidades elegibles, la
sección Habilidades se omite.

La elegibilidad incluye puertas de metadatos de habilidades, verificaciones de entorno/configuración en tiempo de ejecución,
y la lista blanca efectiva de habilidades del agente cuando `agents.defaults.skills` o
`agents.list[].skills` están configurados.

Las habilidades empaquetadas por complementos solo son elegibles cuando el complemento propietario está habilitado.
Esto permite que los complementos de herramientas expongan guías de operación más profundas sin incrustar toda
dicha guía directamente en cada descripción de herramienta.

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

Esto mantiene el prompt base pequeño mientras permite el uso específico de habilidades.

El presupuesto de la lista de habilidades es propiedad del subsistema de habilidades:

- Valor predeterminado global: `skills.limits.maxSkillsPromptChars`
- Anulación por agente: `agents.list[].skillsLimits.maxSkillsPromptChars`

Los extractos de tiempo de ejecución delimitados genéricos usan una superficie diferente:

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

Esa división mantiene el tamaño de las habilidades separado del tamaño de lectura/inyección en tiempo de ejecución, como
`memory_get`, resultados de herramientas en vivo y actualizaciones de AGENTS.md posteriores a la compactación.

## Documentación

El mensaje del sistema incluye una sección **Documentación**. Cuando hay documentación local disponible, esta
apunta al directorio de documentación local de OpenClaw (`docs/` en una copia de Git o los documentos
del paquete npm empaquetado). Si la documentación local no está disponible, se recurre a
[https://docs.openclaw.ai](https://docs.openclaw.ai).

La misma sección también incluye la ubicación de la fuente de OpenClaw. Las extracciones de Git exponen la raíz de la fuente local para que el agente pueda inspeccionar el código directamente. Las instalaciones de paquetes incluyen la URL de la fuente de GitHub e indican al agente que revise la fuente allí siempre que la documentación esté incompleta o desactualizada. El prompt también señala el espejo de la documentación pública, el Discord de la comunidad y ClawHub ([https://clawhub.ai](https://clawhub.ai)) para el descubrimiento de habilidades. Indica al modelo que consulte primero la documentación sobre el comportamiento, los comandos, la configuración o la arquitectura de OpenClaw, y que ejecute `openclaw status` por sí mismo cuando sea posible (solicitando al usuario solo cuando no tenga acceso). Para la configuración específicamente, dirige a los agentes a la acción de herramienta `gateway` `config.schema.lookup` para obtener documentación y restricciones exactas a nivel de campo, y luego a `docs/gateway/configuration.md` y `docs/gateway/configuration-reference.md` para obtener una orientación más amplia.

## Relacionado

- [Tiempo de ejecución del agente](/es/concepts/agent)
- [Espacio de trabajo del agente](/es/concepts/agent-workspace)
- [Motor de contexto](/es/concepts/context-engine)
