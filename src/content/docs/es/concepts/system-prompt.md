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

La superposición de la familia OpenAI GPT-5 mantiene la regla de ejecución principal pequeña y añade orientación específica del modelo para el anclaje de personalidad, salida concisa, disciplina de herramientas, búsqueda paralela, cobertura de entregables, verificación, contexto faltante e higiene de herramientas de terminal.

## Estructura

El prompt es intencionalmente compacto y utiliza secciones fijas:

- **Tooling** (Herramientas): recordatorio de la fuente de verdad de la herramienta estructurada más orientación de uso de herramientas en tiempo de ejecución.
- **Execution Bias** (Sesgo de ejecución): orientación compacta de seguimiento: actuar por turno en solicitudes accionables, continuar hasta terminar o bloquearse, recuperarse de resultados de herramientas débiles, verificar el estado mutable en vivo y verificar antes de finalizar.
- **Safety** (Seguridad): recordatorio breve de las barreras de seguridad para evitar la búsqueda de poder o eludir la supervisión.
- **Skills** (Habilidades, cuando están disponibles): indica al modelo cómo cargar las instrucciones de habilidades bajo demanda.
- **OpenClaw Self-Update** (Autoactualización de OpenClaw): cómo inspeccionar la configuración de forma segura con `config.schema.lookup`, parchear la configuración con `config.patch`, reemplazar la configuración completa con `config.apply` y ejecutar `update.run` solo bajo solicitud explícita del usuario. La herramienta `gateway` solo para propietarios también se niega a reescribir `tools.exec.ask` / `tools.exec.security`, incluidos los alias heredados `tools.bash.*` que se normalizan a esas rutas de ejecución protegidas.
- **Workspace** (Espacio de trabajo): directorio de trabajo (`agents.defaults.workspace`).
- **Documentation** (Documentación): ruta local a los documentos de OpenClaw (repositorio o paquete npm) y cuándo leerlos.
- **Workspace Files (injected)** (Archivos del espacio de trabajo inyectados): indica que los archivos de arranque se incluyen a continuación.
- **Sandbox** (SandBox, cuando está habilitado): indica el tiempo de ejecución encajonado, las rutas de la sandbox y si la ejecución elevada está disponible.
- **Current Date & Time** (Fecha y hora actual): hora local del usuario, zona horaria y formato de hora.
- **Reply Tags** (Etiquetas de respuesta): sintaxis opcional de etiqueta de respuesta para proveedores compatibles.
- **Heartbeats** (Latidos): prompt de latido y comportamiento de reconocimiento, cuando los latidos están habilitados para el agente predeterminado.
- **Runtime** (Tiempo de ejecución): host, sistema operativo, nodo, modelo, raíz del repositorio (cuando se detecta), nivel de pensamiento (una línea).
- **Reasoning** (Razonamiento): nivel de visibilidad actual + sugerencia de alternancia /reasoning.

La sección Tooling también incluye orientación de tiempo de ejecución para trabajos de larga duración:

- usar cron para futuros seguimientos (`check back later`, recordatorios, trabajo recurrente)
  en lugar de `exec` bucles de espera, `yieldMs` trucos de retardo o `process`
  sondeo repetido
- usar `exec` / `process` solo para comandos que comienzan ahora y continúan ejecutándose
  en segundo plano
- cuando está habilitado el despertar automático al completarse, inicie el comando una vez y confíe en
  la ruta de despertar basada en empuje (push) cuando emite salida o falla
- usar `process` para registros, estado, entrada o intervención cuando necesite
  inspeccionar un comando en ejecución
- si la tarea es más grande, preferir `sessions_spawn`; la finalización del sub-agente es
  basada en empuje y se anuncia automáticamente al solicitante
- no sondear `subagents list` / `sessions_list` en un bucle solo para esperar
  la finalización

Cuando la herramienta experimental `update_plan` está habilitada, Tooling también le indica
al modelo que la use solo para trabajo de varios pasos no trivial, mantener exactamente un
paso `in_progress` y evitar repetir todo el plan después de cada actualización.

Las barreras de seguridad en el prompt del sistema son consultivas. Guían el comportamiento del modelo pero no hacen cumplir la política. Utilice la política de herramientas, aprobaciones de ejecución, sandboxing y listas de permitidos de canales para el cumplimiento estricto; los operadores pueden deshabilitarlos por diseño.

En los canales con tarjetas/botones de aprobación nativos, el prompt de tiempo de ejecución ahora le indica
al agente que confíe primero en esa interfaz de usuario de aprobación nativa. Solo debe incluir un comando manual
`/approve` cuando el resultado de la herramienta indica que las aprobaciones de chat no están disponibles o
la aprobación manual es la única ruta.

## Modos de prompt

OpenClaw puede renderizar prompts del sistema más pequeños para sub-agentes. El tiempo de ejecución establece un
`promptMode` para cada ejecución (no una configuración visible para el usuario):

- `full` (predeterminado): incluye todas las secciones anteriores.
- `minimal`: se usa para sub-agentes; omite **Habilidades**, **Recuerdo de memoria**, **OpenClaw
  Self-Update**, **Alias de modelo**, **Identidad de usuario**, **Etiquetas de respuesta**,
  **Mensajería**, **Respuestas silenciosas** y **Latidos**. Herramientas, **Seguridad**,
  Espacio de trabajo, Sandbox, Fecha y hora actual (cuando se conoce), Tiempo de ejecución y contexto inyectado
  permanecen disponibles.
- `none`: devuelve solo la línea de identidad base.

Cuando `promptMode=minimal`, los prompts adicionales inyectados se etiquetan como **Subagent
Context** en lugar de **Group Chat Context**.

## Inyección de inicialización del espacio de trabajo

Los archivos de inicialización se recortan y añaden bajo **Project Context** para que el modelo vea el contexto de identidad y perfil sin necesidad de lecturas explícitas:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (solo en espacios de trabajo totalmente nuevos)
- `MEMORY.md` cuando está presente, de lo contrario `memory.md` como alternativa en minúsculas

Todos estos archivos se **inyectan en la ventana de contexto** en cada turno a menos que
se aplique una puerta de enlace específica del archivo. `HEARTBEAT.md` se omite en ejecuciones normales cuando
los latidos están deshabilitados para el agente predeterminado o
`agents.defaults.heartbeat.includeSystemPromptSection` es falso. Mantenga los archivos
inyectados concisos — especialmente `MEMORY.md`, que puede crecer con el tiempo y provocar
un uso del contexto inesperadamente alto y una compactación más frecuente.

> **Nota:** Los archivos diarios `memory/*.md` **no** son parte de la inicialización
> normal del Project Context. En turnos ordinarios se acceden a ellos bajo demanda a través de las
> herramientas `memory_search` y `memory_get`, por lo que no cuentan contra la
> ventana de contexto a menos que el modelo los lea explícitamente. Los turnos `/new` y
> `/reset` simples son la excepción: el tiempo de ejecución puede anteponer la memoria diaria reciente
> como un bloque de contexto de inicio único para ese primer turno.

Los archivos grandes se truncarán con un marcador. El tamaño máximo por archivo se controla mediante
`agents.defaults.bootstrapMaxChars` (por defecto: 12000). El contenido total de arranque inyectado
entre archivos se limita mediante `agents.defaults.bootstrapTotalMaxChars`
(por defecto: 60000). Los archivos faltantes inyectan un marcador breve de archivo faltante. Cuando se produce
el truncamiento, OpenClaw puede inyectar un bloque de advertencia en el contexto del proyecto; controlarlo con
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always`;
por defecto: `once`).

Las sesiones de subagentes solo inyectan `AGENTS.md` y `TOOLS.md` (otros archivos de arranque
se filtran para mantener el contexto del subagente reducido).

Los enlaces internos pueden interceptar este paso a través de `agent:bootstrap` para mutar o reemplazar
los archivos de arranque inyectados (por ejemplo, cambiar `SOUL.md` por una personalidad alternativa).

Si desea que el agente suene menos genérico, comience con la
[Guía de personalidad SOUL.md](/es/concepts/soul).

Para inspeccionar cuánto contribuye cada archivo inyectado (bruto frente a inyectado, truncamiento, más sobrecarga del esquema de herramientas), use `/context list` o `/context detail`. Consulte [Contexto](/es/concepts/context).

## Gestión del tiempo

El sistema del mensaje incluye una sección dedicada de **Fecha y hora actual** cuando la
zona horaria del usuario es conocida. Para mantener el caché del mensaje estable, ahora solo incluye
la **zona horaria** (sin reloj dinámico ni formato de hora).

Use `session_status` cuando el agente necesite la hora actual; la tarjeta de estado
incluye una línea de marca de tiempo. La misma herramienta puede establecer opcionalmente una anulación del modelo por sesión
(`model=default` la borra).

Configurar con:

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Consulte [Fecha y hora](/es/date-time) para obtener detalles completos del comportamiento.

## Habilidades

Cuando existen habilidades elegibles, OpenClaw inyecta una **lista de habilidades disponibles** compacta
(`formatSkillsForPrompt`) que incluye la **ruta de archivo** para cada habilidad. El
prompt le indica al modelo que use `read` para cargar el SKILL.md en la ubicación
listada (workspace, gestionada o empaquetada). Si no hay habilidades elegibles, la
sección de Habilidades se omite.

La elegibilidad incluye puertas de metadatos de habilidades, verificaciones de entorno/configuración en tiempo de ejecución,
y la lista blanca efectiva de habilidades del agente cuando `agents.defaults.skills` o
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

Esto mantiene el prompt base pequeño mientras permite el uso específico de habilidades.

El presupuesto de la lista de habilidades es propiedad del subsistema de habilidades:

- Valor predeterminado global: `skills.limits.maxSkillsPromptChars`
- Anulación por agente: `agents.list[].skillsLimits.maxSkillsPromptChars`

Los extractos de tiempo de ejecución delimitados genéricos usan una superficie diferente:

- `agents.defaults.contextLimits.*`
- `agents.list[].contextLimits.*`

Esa división mantiene el tamaño de las habilidades separado del tamaño de lectura/inyección en tiempo de ejecución, como
`memory_get`, resultados en vivo de herramientas y actualizaciones de AGENTS.md después de la compactación.

## Documentación

Cuando está disponible, el prompt del sistema incluye una sección de **Documentación** que apunta al
directorio de documentos local de OpenClaw (ya sea `docs/` en el espacio de trabajo del repositorio o los documentos del paquete npm
empaquetados) y también señala el espejo público, repositorio fuente, Discord de la comunidad y
ClawHub ([https://clawhub.ai](https://clawhub.ai)) para el descubrimiento de habilidades. El prompt le indica al modelo que consulte primero los documentos locales
sobre el comportamiento, comandos, configuración o arquitectura de OpenClaw, y que ejecute
`openclaw status` por sí mismo cuando sea posible (solicitando al usuario solo cuando no tenga acceso).
