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

## Estructura

El prompt es intencionalmente compacto y utiliza secciones fijas:

- **Tooling**: lista de herramientas actual + descripciones breves.
- **Safety**: recordatorio breve de las barreras de seguridad para evitar conductas de búsqueda de poder o eludir la supervisión.
- **Skills** (cuando están disponibles): indica al modelo cómo cargar las instrucciones de habilidades bajo demanda.
- **OpenClaw Self-Update**: cómo ejecutar `config.apply` y `update.run`.
- **Workspace**: directorio de trabajo (`agents.defaults.workspace`).
- **Documentation**: ruta local a la documentación de OpenClaw (repositorio o paquete npm) y cuándo leerla.
- **Workspace Files (injected)**: indica que los archivos de arranque se incluyen a continuación.
- **Sandbox** (cuando está habilitado): indica el entorno de prueba aislado, las rutas del sandbox y si la ejecución elevada está disponible.
- **Current Date & Time**: hora local del usuario, zona horaria y formato de hora.
- **Reply Tags**: sintaxis opcional de etiquetas de respuesta para los proveedores compatibles.
- **Heartbeats**: prompt de latido y comportamiento de ack.
- **Runtime**: host, sistema operativo, nodo, modelo, raíz del repositorio (cuando se detecta), nivel de pensamiento (una línea).
- **Reasoning**: nivel de visibilidad actual + pista de alternancia /reasoning.

Las barreras de seguridad en el system prompt son consultivas. Guían el comportamiento del modelo pero no hacen cumplir la política. Utilice la política de herramientas, aprobaciones de ejecución, sandboxing y listas de permitidos de canales para un cumplimiento estricto; los operadores pueden desactivarlos por diseño.

## Modos de prompt

OpenClaw puede renderizar system prompts más pequeños para subagentes. El tiempo de ejecución establece un
`promptMode` para cada ejecución (no una configuración visible para el usuario):

- `full` (predeterminado): incluye todas las secciones anteriores.
- `minimal`: se utiliza para sub-agentes; omite **Skills**, **Memory Recall**, **OpenClaw
  Self-Update**, **Model Aliases**, **User Identity**, **Reply Tags**,
  **Messaging**, **Silent Replies** y **Heartbeats**. Las herramientas, **Safety**,
  Workspace, Sandbox, Current Date & Time (cuando se conocen), Runtime y el contexto
  inyectado permanecen disponibles.
- `none`: devuelve solo la línea de identidad base.

Cuando `promptMode=minimal`, los prompts adicionales inyectados se etiquetan como **Subagent
Context** en lugar de **Group Chat Context**.

## Inyección de arranque del espacio de trabajo

Los archivos de arranque se recortan y añaden bajo **Project Context** para que el modelo vea el contexto de identidad y perfil sin necesidad de lecturas explícitas:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (solo en espacios de trabajo nuevos)
- `MEMORY.md` cuando está presente, de lo contrario `memory.md` como alternativa en minúsculas

Todos estos archivos se **inyectan en la ventana de contexto** en cada turno, lo que
significa que consumen tokens. Mantenlos concisos, especialmente `MEMORY.md`, que puede
crecer con el tiempo y llevar a un uso del contexto inesperadamente alto y a una compactación
más frecuente.

> **Nota:** Los archivos diarios `memory/*.md` **no** se inyectan automáticamente. Se
> acceden a pedido a través de las herramientas `memory_search` y `memory_get`, por lo que
> no cuentan para la ventana de contexto a menos que el modelo los lea explícitamente.

Los archivos grandes se truncan con un marcador. El tamaño máximo por archivo se controla mediante
`agents.defaults.bootstrapMaxChars` (por defecto: 20000). El contenido total de arranque
inyectado entre archivos se limita mediante `agents.defaults.bootstrapTotalMaxChars`
(por defecto: 150000). Los archivos que faltan inyectan un marcador corto de archivo faltante. Cuando se produce el truncamiento,
OpenClaw puede inyectar un bloque de advertencia en Project Context; controla esto con
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always`;
por defecto: `once`).

Las sesiones de subagentes solo inyectan `AGENTS.md` y `TOOLS.md` (otros archivos de inicialización
se filtran para mantener el contexto del subagente pequeño).

Los ganchos internos pueden interceptar este paso a través de `agent:bootstrap` para modificar o reemplazar
los archivos de inicialización inyectados (por ejemplo, intercambiar `SOUL.md` por una personalidad alternativa).

Para inspeccionar cuánto contribuye cada archivo inyectado (sin procesar vs inyectado, truncación, más sobrecarga del esquema de herramientas), use `/context list` o `/context detail`. Consulte [Contexto](/en/concepts/context).

## Manejo del tiempo

El sistema de prompt incluye una sección dedicada de **Fecha y hora actual** cuando la
zona horaria del usuario es conocida. Para mantener el caché del prompt estable, ahora solo incluye
la **zona horaria** (sin reloj dinámico o formato de hora).

Use `session_status` cuando el agente necesite la hora actual; la tarjeta de estado
incluye una línea de marca de tiempo.

Configurar con:

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Consulte [Fecha y hora](/en/date-time) para obtener detalles completos del comportamiento.

## Habilidades

Cuando existen habilidades elegibles, OpenClaw inyecta una **lista de habilidades disponibles** compacta
(`formatSkillsForPrompt`) que incluye la **ruta de archivo** para cada habilidad. El
prompt instruye al modelo a usar `read` para cargar el SKILL.md en la ubicación
listada (espacio de trabajo, administrada o empaquetada). Si no hay habilidades elegibles, la
sección de Habilidades se omite.

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

Esto mantiene el prompt base pequeño pero aun permite el uso dirigido de habilidades.

## Documentación

Cuando está disponible, el prompt del sistema incluye una sección de **Documentación** que apunta al
directorio de documentos local de OpenClaw (ya sea `docs/` en el espacio de trabajo del repositorio o los documentos del paquete npm
empaquetado) y también nota el espejo público, repositorio fuente, Discord de la comunidad y
ClawHub ([https://clawhub.com](https://clawhub.com)) para el descubrimiento de habilidades. El prompt instruye al modelo a consultar los documentos locales primero
para el comportamiento, comandos, configuración o arquitectura de OpenClaw, y ejecutar
`openclaw status` por sí mismo cuando sea posible (solicitando al usuario solo cuando no tenga acceso).
