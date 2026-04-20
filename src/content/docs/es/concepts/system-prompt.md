---
summary: "Qué contiene el sistema de OpenClaw y cómo se ensambla"
read_when:
  - Editing system prompt text, tools list, or time/heartbeat sections
  - Changing workspace bootstrap or skills injection behavior
title: "System Prompt"
---

# System Prompt

OpenClaw construye un system prompt personalizado para cada ejecución del agente. El prompt es **propiedad de OpenClaw** y no utiliza el prompt predeterminado de pi-coding-agent.

El prompt es ensamblado por OpenClaw e inyectado en cada ejecución del agente.

Los complementos del proveedor pueden aportar directrices de prompt conscientes de la caché sin reemplazar
el prompt completo propiedad de OpenClaw. El tiempo de ejecución del proveedor puede:

- reemplazar un pequeño conjunto de secciones centrales con nombre (`interaction_style`,
  `tool_call_style`, `execution_bias`)
- inyectar un **prefijo estable** por encima del límite de la caché del prompt
- inyectar un **sufijo dinámico** por debajo del límite de la caché del prompt

Utilice las contribuciones propiedad del proveedor para el ajuste específico de la familia de modelos. Mantenga la mutación del prompt
`before_prompt_build` heredada para compatibilidad o cambios de prompt realmente globales,
no para el comportamiento normal del proveedor.

## Estructura

El prompt es intencionalmente compacto y utiliza secciones fijas:

- **Herramientas**: recordatorio de la fuente de verdad de la herramienta estructurada más la guía de uso de herramientas en tiempo de ejecución.
- **Seguridad**: recordatorio breve de las barreras de seguridad para evitar conductas de búsqueda de poder o eludir la supervisión.
- **Habilidades** (cuando están disponibles): indica al modelo cómo cargar las instrucciones de habilidades bajo demanda.
- **Autoactualización de OpenClaw**: cómo inspeccionar la configuración de manera segura con
  `config.schema.lookup`, parchear la configuración con `config.patch`, reemplazar la configuración
  completa con `config.apply` y ejecutar `update.run` solo bajo solicitud explícita del
  usuario. La herramienta `gateway` de solo propietario también se niega a reescribir
  `tools.exec.ask` / `tools.exec.security`, incluidos los alias `tools.bash.*`
  heredados que se normalizan a esas rutas de ejecución protegidas.
- **Espacio de trabajo**: directorio de trabajo (`agents.defaults.workspace`).
- **Documentación**: ruta local a los documentos de OpenClaw (repositorio o paquete npm) y cuándo leerlos.
- **Archivos del espacio de trabajo (inyectados)**: indica que los archivos de arranque se incluyen a continuación.
- **Sandbox** (cuando está habilitado): indica el tiempo de ejecución en sandbox, las rutas de sandbox y si la ejecución elevada está disponible.
- **Fecha y hora actuales**: hora local del usuario, zona horaria y formato de hora.
- **Etiquetas de respuesta**: sintaxis opcional de etiquetas de respuesta para proveedores compatibles.
- **Latidos**: comportamiento del aviso de latido y reconocimiento, cuando los latidos están habilitados para el agente predeterminado.
- **Tiempo de ejecución**: host, sistema operativo, nodo, modelo, raíz del repositorio (cuando se detecta), nivel de pensamiento (una línea).
- **Razonamiento**: nivel de visibilidad actual + sugerencia de alternancia /reasoning.

La sección Herramientas también incluye directrices de tiempo de ejecución para el trabajo de larga duración:

- use cron para seguimientos futuros (`check back later`, recordatorios, trabajo recurrente)
  en lugar de `exec` bucles de espera, `yieldMs` trucos de retraso o `process`
  sondeo repetido
- use `exec` / `process` solo para comandos que comienzan ahora y continúan ejecutándose
  en segundo plano
- cuando el despertar de finalización automática está habilitado, inicie el comando una vez y confíe en
  la ruta de despertar basada en empuje (push) cuando emite salida o falla
- use `process` para registros, estado, entrada o intervención cuando necesite
  inspeccionar un comando en ejecución
- si la tarea es más grande, prefiera `sessions_spawn`; la finalización del subagente es
  basada en empuje (push) y se anuncia automáticamente al solicitante
- no sondee `subagents list` / `sessions_list` en un bucle solo para esperar la
  finalización

Cuando la herramienta experimental `update_plan` está habilitada, Tooling también le indica al
modelo que la use solo para trabajo de varios pasos no trivial, mantenga exactamente un paso
`in_progress`, y evite repetir el plan completo después de cada actualización.

Las guardias de seguridad (guardrails) en el prompt del sistema son asesoras. Guían el comportamiento del modelo pero no hacen cumplir la política. Use la política de herramientas, aprobaciones de ejecución, sandboxing (sandbox) y listas de permitidos de canales para el cumplimiento estricto; los operadores pueden deshabilitarlos por diseño.

En canales con tarjetas/botones de aprobación nativos, el prompt de ejecución ahora le indica al
agente que confíe primero en esa UI de aprobación nativa. Solo debe incluir un comando manual
`/approve` cuando el resultado de la herramienta dice que las aprobaciones de chat no están disponibles o
la aprobación manual es la única ruta.

## Modos de prompt

OpenClaw puede representar prompts del sistema más pequeños para subagentes. El tiempo de ejecución establece un
`promptMode` para cada ejecución (no una configuración visible para el usuario):

- `full` (predeterminado): incluye todas las secciones anteriores.
- `minimal`: se usa para subagentes; omite **Habilidades (Skills)**, **Recuerdo de memoria**, **Autoactualización de OpenClaw**,
  **Alias de modelo**, **Identidad de usuario**, **Etiquetas de respuesta**,
  **Mensajería**, **Respuestas silenciosas** y **Latidos (Heartbeats)**. Tooling, **Seguridad**,
  Workspace, Sandbox, Fecha y hora actual (cuando se conoce), Runtime y el contexto
  inyectado siguen disponibles.
- `none`: devuelve solo la línea de identidad base.

Cuando `promptMode=minimal`, los prompts adicionales inyectados se etiquetan como **Contexto del subagente**
en lugar de **Contexto del chat grupal**.

## Inyección de arranque del espacio de trabajo

Los archivos de arranque se recortan y añaden bajo **Contexto del proyecto** para que el modelo vea el contexto de identidad y perfil sin necesidad de lecturas explícitas:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (solo en espacios de trabajo totalmente nuevos)
- `MEMORY.md` cuando está presente, de lo contrario `memory.md` como alternativa en minúsculas

Todos estos archivos se **inyectan en la ventana de contexto** en cada turno a menos que se aplique una puerta específica del archivo. `HEARTBEAT.md` se omite en ejecuciones normales cuando los latidos están deshabilitados para el agente predeterminado o `agents.defaults.heartbeat.includeSystemPromptSection` es falso. Mantenga los archivos inyectados concisos, especialmente `MEMORY.md`, que puede crecer con el tiempo y llevar a un uso del contexto inesperadamente alto y a una compactación más frecuente.

> **Nota:** `memory/*.md` archivos diarios **no** son parte del bootstrap normal
> del Contexto del Proyecto. En turnos ordinarios se accede a ellos bajo demanda a través de las
> herramientas `memory_search` y `memory_get`, por lo que no cuentan contra la
> ventana de contexto a menos que el modelo los lea explícitamente. Los turnos `/new` y
> `/reset` simples son la excepción: el tiempo de ejecución puede anteponer la memoria diaria reciente
> como un bloque de contexto de inicio único para ese primer turno.

Los archivos grandes se truncán con un marcador. El tamaño máximo por archivo se controla mediante
`agents.defaults.bootstrapMaxChars` (predeterminado: 20000). El contenido total de bootstrap inyectado
entre archivos se limita mediante `agents.defaults.bootstrapTotalMaxChars`
(predeterminado: 150000). Los archivos faltantes inyectan un marcador corto de archivo faltante. Cuando se produce el truncamiento,
OpenClaw puede inyectar un bloque de advertencia en el Contexto del Proyecto; controle esto con
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always`;
predeterminado: `once`).

Las sesiones de subagentes solo inyectan `AGENTS.md` y `TOOLS.md` (otros archivos de bootstrap
se filtran para mantener el contexto del subagente pequeño).

Los ganchos internos pueden interceptar este paso mediante `agent:bootstrap` para modificar o reemplazar
los archivos de bootstrap inyectados (por ejemplo, intercambiando `SOUL.md` por una personalidad alternativa).

Si desea que el agente suene menos genérico, comience con
[Guía de personalidad SOUL.md](/en/concepts/soul).

Para inspeccionar cuánto aporta cada archivo inyectado (sin procesar vs. inyectado, truncamiento, más sobrecarga del esquema de herramientas), use `/context list` o `/context detail`. Consulte [Contexto](/en/concepts/context).

## Manejo del tiempo

El mensaje del sistema incluye una sección dedicada **Fecha y hora actual** cuando la
zona horaria del usuario es conocida. Para mantener la caché del mensaje estable, ahora solo incluye
la **zona horaria** (sin reloj dinámico o formato de hora).

Use `session_status` cuando el agente necesite la hora actual; la tarjeta de estado
incluye una línea de marca de tiempo. La misma herramienta puede establecer opcionalmente una sobrescritura
de modelo por sesión (`model=default` la borra).

Configure con:

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Consulte [Fecha y hora](/en/date-time) para obtener detalles completos del comportamiento.

## Habilidades

Cuando existen habilidades elegibles, OpenClaw inyecta una **lista de habilidades disponibles** compacta
(`formatSkillsForPrompt`) que incluye la **ruta de archivo** para cada habilidad. El
prompt instruye al modelo a usar `read` para cargar el SKILL.md en la ubicación
listada (espacio de trabajo, administrada o empaquetada). Si no hay habilidades elegibles, la
sección de Habilidades se omite.

La elegibilidad incluye puertas de metadatos de habilidades, comprobaciones de entorno/configuración en tiempo de ejecución,
y la lista de permitidos efectiva de habilidades del agente cuando `agents.defaults.skills` o
`agents.list[].skills` están configurados.

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

Esto mantiene el mensaje base pequeño mientras sigue permitiendo el uso específico de habilidades.

El presupuesto de la lista de habilidades es propiedad del subsistema de habilidades:

- Predeterminado global: `skills.limits.maxSkillsPromptChars`
- Invalidación por agente: `agents.list[].skillsLimits.maxSkillsPromptChars`

Los extractos de tiempo de ejecución acotados genéricos utilizan una superficie diferente:

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

Esa división mantiene el tamaño de las habilidades separado del tamaño de lectura/inyección en tiempo de ejecución, tales
como `memory_get`, resultados de herramientas en vivo y actualizaciones de AGENTS.md posteriores a la compactación.

## Documentación

Cuando está disponible, el prompt del sistema incluye una sección **Documentación** que apunta al
directorio de documentación local de OpenClaw (ya sea `docs/` en el espacio de trabajo del repositorio o la documentación del
paquete npm incluido) y también señala el espejo público, repositorio fuente, comunidad de Discord y
ClawHub ([https://clawhub.ai](https://clawhub.ai)) para el descubrimiento de habilidades. El prompt instruye al modelo a consultar primero la documentación local
sobre el comportamiento, comandos, configuración o arquitectura de OpenClaw, y ejecutar
`openclaw status` por sí mismo cuando sea posible (preguntando al usuario solo cuando no tenga acceso).
