---
summary: "Contiene el mensaje del sistema de OpenClaw y cómo se ensambla"
read_when:
  - Editando el texto del mensaje del sistema, la lista de herramientas o las secciones de tiempo/latido
  - Cambiando el arranque del espacio de trabajo o el comportamiento de inyección de habilidades
title: "Mensaje del sistema"
---

# Mensaje del sistema

OpenClaw crea un mensaje del sistema personalizado para cada ejecución del agente. El mensaje es **propiedad de OpenClaw** y no utiliza el mensaje predeterminado de pi-coding-agent.

El mensaje es ensamblado por OpenClaw e inyectado en cada ejecución del agente.

## Estructura

El mensaje es intencionalmente compacto y utiliza secciones fijas:

- **Herramientas**: lista actual de herramientas + descripciones breves.
- **Seguridad**: recordatorio breve de las barreras de seguridad para evitar el comportamiento de búsqueda de poder o eludir la supervisión.
- **Habilidades** (cuando están disponibles): indica al modelo cómo cargar las instrucciones de habilidades bajo demanda.
- **Autoactualización de OpenClaw**: cómo ejecutar `config.apply` y `update.run`.
- **Espacio de trabajo**: directorio de trabajo (`agents.defaults.workspace`).
- **Documentación**: ruta local a la documentación de OpenClaw (repositorio o paquete npm) y cuándo leerla.
- **Archivos del espacio de trabajo (inyectados)**: indica que los archivos de arranque se incluyen a continuación.
- **Sandbox** (cuando está activado): indica el entorno sandbox, rutas de sandbox y si la ejecución elevada está disponible.
- **Fecha y hora actual**: hora local del usuario, zona horaria y formato de hora.
- **Etiquetas de respuesta**: sintaxis opcional de etiquetas de respuesta para proveedores compatibles.
- **Latidos**: mensaje de latido y comportamiento de ack.
- **Tiempo de ejecución**: host, sistema operativo, nodo, modelo, raíz del repositorio (cuando se detecta), nivel de pensamiento (una línea).
- **Razonamiento**: nivel de visibilidad actual + pista de alternancia /reasoning.

Las barreras de seguridad en el mensaje del sistema son consultivas. Guían el comportamiento del modelo pero no hacen cumplir la política. Utilice la política de herramientas, aprobaciones de ejecución, sandboxing y listas de permitidos de canales para hacer cumplir estrictamente; los operadores pueden desactivarlos por diseño.

## Modos de mensaje

OpenClaw puede representar mensajes del sistema más pequeños para subagentes. El tiempo de ejecución establece un
`promptMode` para cada ejecución (no una configuración visible para el usuario):

- `full` (predeterminado): incluye todas las secciones anteriores.
- `minimal`: se usa para sub-agentes; omite **Skills**, **Memory Recall**, **OpenClaw
  Self-Update**, **Model Aliases**, **User Identity**, **Reply Tags**,
  **Messaging**, **Silent Replies** y **Heartbeats**. Las herramientas, **Safety**,
  Workspace, Sandbox, Fecha y hora actual (cuando se conoce), Runtime y el contexto
  inyectado permanecen disponibles.
- `none`: devuelve solo la línea de identidad base.

Cuando `promptMode=minimal`, los prompts inyectados adicionales se etiquetan como **Subagent
Context** en lugar de **Group Chat Context**.

## Inyección de inicialización del espacio de trabajo

Los archivos de inicialización se recortan y agregan en **Project Context** para que el modelo vea el contexto de identidad y perfil sin necesidad de lecturas explícitas:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (solo en espacios de trabajo completamente nuevos)
- `MEMORY.md` cuando está presente, de lo contrario `memory.md` como alternativa en minúsculas

Todos estos archivos se **inyectan en la ventana de contexto** en cada turno, lo
que significa que consumen tokens. Manténlos concisos, especialmente `MEMORY.md`, que puede
crecer con el tiempo y provocar un uso del contexto inesperadamente alto y una compactación
más frecuente.

> **Nota:** Los archivos diarios `memory/*.md` **no** se inyectan automáticamente. Se
> acceden a ellos bajo demanda mediante las herramientas `memory_search` y `memory_get`, por lo que
> no cuentan contra la ventana de contexto a menos que el modelo los lea explícitamente.

Los archivos grandes se truncan con un marcador. El tamaño máximo por archivo se controla mediante
`agents.defaults.bootstrapMaxChars` (predeterminado: 20000). El contenido total de inicialización inyectado
entre archivos se limita mediante `agents.defaults.bootstrapTotalMaxChars`
(predeterminado: 150000). Los archivos faltantes inyectan un marcador corto de archivo faltante. Cuando se produce
el truncamiento, OpenClaw puede inyectar un bloque de advertencia en Project Context; controle esto con
`agents.defaults.bootstrapPromptTruncationWarning` (`off`, `once`, `always`;
predeterminado: `once`).

Las sesiones de subagentes solo inyectan `AGENTS.md` y `TOOLS.md` (otros archivos de arranque
se filtran para mantener el contexto del subagente pequeño).

Los ganchos internos pueden interceptar este paso a través de `agent:bootstrap` para modificar o reemplazar
los archivos de arranque inyectados (por ejemplo, intercambiando `SOUL.md` por una personalidad alternativa).

Para inspeccionar cuánto contribuye cada archivo inyectado (sin procesar vs inyectado, truncamiento, más la sobrecarga del esquema de herramientas), use `/context list` o `/context detail`. Consulte [Context](/es/concepts/context).

## Gestión del tiempo

El mensaje del sistema incluye una sección dedicada de **Fecha y hora actual** cuando la
zona horaria del usuario es conocida. Para mantener el caché del mensaje estable, ahora solo incluye
la **zona horaria** (sin reloj dinámico o formato de hora).

Use `session_status` cuando el agente necesite la hora actual; la tarjeta de estado
incluye una línea de marca de tiempo.

Configurar con:

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat` (`auto` | `12` | `24`)

Consulte [Fecha y hora](/es/date-time) para obtener detalles completos del comportamiento.

## Habilidades

Cuando existen habilidades elegibles, OpenClaw inyecta una **lista de habilidades disponibles** compacta
(`formatSkillsForPrompt`) que incluye la **ruta de archivo** para cada habilidad. El
mensaje instruye al modelo a usar `read` para cargar el SKILL.md en la ubicación
listada (espacio de trabajo, administrado o empaquetado). Si no hay habilidades elegibles, la
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

Esto mantiene el mensaje base pequeño mientras permite el uso específico de habilidades.

## Documentación

Cuando está disponible, el mensaje del sistema incluye una sección de **Documentación** que apunta al
directorio de documentos local de OpenClaw (ya sea `docs/` en el espacio de trabajo del repositorio o los documentos del paquete npm
empaquetado) y también nota el espejo público, repositorio fuente, Discord de la comunidad y
ClawHub ([https://clawhub.com](https://clawhub.com)) para el descubrimiento de habilidades. El mensaje instruye al modelo a consultar los documentos locales primero
para el comportamiento, comandos, configuración o arquitectura de OpenClaw, y ejecutar
`openclaw status` por sí mismo cuando sea posible (solicitando al usuario solo cuando no tenga acceso).

import es from "/components/footer/es.mdx";

<es />
