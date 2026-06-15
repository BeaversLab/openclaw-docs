---
doc-schema-version: 1
summary: "Descripción general de las herramientas, habilidades y complementos de OpenClaw: lo que pueden llamar los agentes y cómo ampliarlos"
read_when:
  - You want to understand what tools OpenClaw provides
  - You are deciding between built-in tools, skills, and plugins
  - You need the right docs entry point for tool policy, automation, or agent coordination
title: "Descripción general"
---

Utilice esta página para elegir la superficie de Capacidades adecuada. Las **herramientas** son acciones invocables, las **habilidades** enseñan a los agentes cómo trabajar y los **complementos** añaden capacidades de tiempo de ejecución, como herramientas, proveedores, canales, ganchos y habilidades empaquetadas.

Esta es una página de resumen y enrutamiento. Para obtener una política de herramientas exhaustiva, valores predeterminados,
membresía de grupo, restricciones de proveedor y campos de configuración, utilice
[Herramientas y proveedores personalizados](/es/gateway/config-tools).

## Comience aquí

Para la mayoría de los agentes, comience con las categorías de herramientas integradas y luego ajuste la política únicamente cuando el agente deba ver menos herramientas o necesite acceso explícito al host.

| Si necesita...                                                   | Use esto primero                                            | Luego lea                                                                                                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Permitir que un agente actúe con capacidades existentes          | [Herramientas integradas](#built-in-tool-categories)        | [Categorías de herramientas](#built-in-tool-categories)                                                                             |
| Controlar lo que un agente puede llamar                          | [Política de herramientas](#configure-access-and-approvals) | [Herramientas y proveedores personalizados](/es/gateway/config-tools)                                                               |
| Enseñar un flujo de trabajo a un agente                          | [Habilidades](#choose-tools-skills-or-plugins)              | [Habilidades](/es/tools/skills), [Crear habilidades](/es/tools/creating-skills) y [Taller de habilidades](/es/tools/skill-workshop) |
| Añadir una nueva integración o superficie de tiempo de ejecución | [Plugins](#extend-capabilities)                             | [Plugins](/es/tools/plugin) y [Compilar plugins](/es/plugins/building-plugins)                                                      |
| Ejecutar trabajo más tarde o en segundo plano                    | [Automatización](/es/automation)                            | [Descripción general de automatización](/es/automation)                                                                             |
| Coordinar múltiples agentes o arneses                            | [Subagentes](/es/tools/subagents)                           | [Agentes ACP](/es/tools/acp-agents) y [Envío de agente](/es/tools/agent-send)                                                       |
| Buscar en un catálogo grande de herramientas de OpenClaw         | [Búsqueda de herramientas](/es/tools/tool-search)           | [Búsqueda de herramientas](/es/tools/tool-search)                                                                                   |

## Elegir herramientas, habilidades o complementos

<Steps>
  <Step title="Usar una herramienta cuando el agente necesite actuar">
    Una herramienta es una función tipada que el agente puede llamar, como `exec`, `browser`,
    `web_search`, `message` o `image_generate`. Use herramientas cuando el agente
    necesite leer datos, cambiar archivos, enviar mensajes, llamar a un proveedor u operar
    otro sistema. Las herramientas visibles se envían al modelo como definiciones de funciones
    estructuradas.

    El modelo solo ve las herramientas que sobreviven al perfil activo, la política de
    permitir/denegar, las restricciones del proveedor, el estado del sandbox, los permisos del
    canal y la disponibilidad del complemento.

  </Step>

  <Step title="Use una habilidad cuando el agente necesite instrucciones">
    Una habilidad es un paquete de instrucciones `SKILL.md` cargado en el mensaje del agente. Use una
    habilidad cuando el agente ya tenga las herramientas que necesita, pero necesite un flujo de trabajo
    repetible, una rúbrica de revisión, una secuencia de comandos o una restricción operativa.

    Las habilidades pueden residir en un espacio de trabajo, un directorio de habilidades compartidas, una raíz de habilidades de OpenClaw administrada o un paquete de plugins.

    [Habilidades](/es/tools/skills) | [Taller de habilidades](/es/tools/skill-workshop) | [Crear habilidades](/es/tools/creating-skills) | [Configuración de habilidades](/es/tools/skills-config)

  </Step>

  <Step title="Use un plugin cuando OpenClaw necesite una nueva capacidad">
    Un plugin puede añadir herramientas, habilidades, canales, proveedores de modelos, voz, voz en tiempo real,
    generación de medios, búsqueda web, obtención web, enlaces y otras capacidades
    de tiempo de ejecución. Use un plugin cuando la capacidad tenga código, credenciales,
    enlaces de ciclo de vida, metadatos de manifiesto o empaquetado instalable. Los plugins
    existentes se pueden instalar desde ClawHub, npm, git, directorios locales o
    archivos.

    [Instalar y configurar plugins](/es/tools/plugin) | [Compilar plugins](/es/plugins/building-plugins) | [SDK de plugins](/es/plugins/sdk-overview)

  </Step>
</Steps>

## Categorías de herramientas integradas

La tabla enumera herramientas representativas para que pueda reconocer la superficie. No
es la referencia completa de la política. Para grupos exactos, valores predeterminados y semánticas de permitir/denegar,
use [Herramientas y proveedores personalizados](/es/gateway/config-tools).

| Categoría                     | Usar cuando el agente necesite...                                                       | Herramientas representativas                                         | Leer siguiente                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Tiempo de ejecución           | Ejecute comandos, gestione procesos o use análisis de Python respaldado por proveedores | `exec`, `process`, `code_execution`                                  | [Exec](/es/tools/exec), [Code execution](/es/tools/code-execution)                                   |
| Archivos                      | Leer y cambiar archivos del espacio de trabajo                                          | `read`, `write`, `edit`, `apply_patch`                               | [Apply patch](/es/tools/apply-patch)                                                                 |
| Web                           | Buscar en la web, buscar publicaciones en X u obtener contenido de página legible       | `web_search`, `x_search`, `web_fetch`                                | [Web tools](/es/tools/web), [Web fetch](/es/tools/web-fetch)                                         |
| Navegador                     | Operar una sesión de navegador                                                          | `browser`                                                            | [Browser](/es/tools/browser)                                                                         |
| Mensajería y canales          | Enviar respuestas o acciones de canal                                                   | `message`                                                            | [Agent send](/es/tools/agent-send)                                                                   |
| Sesiones y agentes            | Inspeccionar sesiones, delegar trabajo, dirigir otra ejecución o reportar estado        | `sessions_*`, `subagents`, `agents_list`, `session_status`, `goal`   | [Goal](/es/tools/goal), [Sub-agents](/es/tools/subagents), [Session tool](/es/concepts/session-tool) |
| Automatización                | Programar trabajo o responder a eventos en segundo plano                                | `cron`, `heartbeat_respond`                                          | [Automation](/es/automation)                                                                         |
| Puerta de enlace y nodos      | Inspeccionar el estado de la puerta de enlace o los dispositivos de destino emparejados | `gateway`, `nodes`                                                   | [Gateway configuration](/es/gateway/configuration), [Nodes](/es/nodes)                               |
| Medios                        | Analizar, generar o reproducir medios                                                   | `image`, `image_generate`, `music_generate`, `video_generate`, `tts` | [Media overview](/es/tools/media-overview)                                                           |
| Catálogos grandes de OpenClaw | Buscar y llamar a muchas herramientas elegibles sin enviar cada esquema al modelo       | `tool_search_code`, `tool_search`, `tool_describe`                   | [Tool Search](/es/tools/tool-search)                                                                 |

<Note>Tool Search es una superficie experimental de agente de OpenClaw. Las ejecuciones del arnés Codex utilizan modo de código nativo de Codex, búsqueda de herramientas nativa, herramientas dinámicas diferidas y llamadas a herramientas anidadas en lugar de `tools.toolSearch`.</Note>

## Herramientas proporcionadas por complementos

Los plugins pueden registrar herramientas adicionales. Los autores de plugins conectan las herramientas a través de
`api.registerTool(...)` y el `contracts.tools` del manifiesto; utilice
[Plugin SDK](/es/plugins/sdk-overview) y [Plugin manifest](/es/plugins/manifest)
para obtener detalles del contrato.

Las herramientas comunes proporcionadas por complementos incluyen:

- [Diffs](/es/tools/diffs) para renderizar diffs de archivos y markdown
- [LLM Task](/es/tools/llm-task) para pasos de flujo de trabajo solo JSON
- [Lobster](/es/tools/lobster) para flujos de trabajo tipados con aprobaciones reanudables
- [Tokenjuice](/es/tools/tokenjuice) para compactar la ruidosa salida de la herramienta
  `exec` y `bash`
- [Tool Search](/es/tools/tool-search) para descubrir y llamar a catálogos de herramientas
  grandes sin poner cada esquema en el prompt
- [Canvas](/es/plugins/reference/canvas) para el control de Canvas de nodos y el renderizado
  de A2UI

## Configurar el acceso y las aprobaciones

La política de herramientas se aplica antes de la llamada al modelo. Si la política elimina una herramienta, el modelo no recibe el esquema de esa herramienta para el turno. Una ejecución puede perder herramientas debido a la configuración global, la configuración por agente, la política del canal, las restricciones del proveedor, las reglas del entorno sandbox, la política del canal/tiempo de ejecución o la disponibilidad de complementos.

- [Tools and custom providers](/es/gateway/config-tools) documenta los perfiles de herramientas,
  listas de permiso/denegación, restricciones específicas del proveedor, detección de bucles y
  configuraciones de herramientas respaldadas por el proveedor.
- [Exec approvals](/es/tools/exec-approvals) documenta la política de aprobación
  de comandos del host.
- [Elevated exec](/es/tools/elevated) documenta la ejecución controlada fuera del
  sandbox.
- [Sandbox vs tool policy vs elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) explica qué capa controla el acceso a archivos y procesos.
- [Per-agent sandbox and tool restrictions](/es/tools/multi-agent-sandbox-tools)
  documenta las restricciones específicas del agente para ejecuciones delegadas.

## Ampliar capacidades

Elija la ruta de extensión según la tarea que necesite que realice OpenClaw:

- Instale o administre un complemento existente con [Plugins](/es/tools/plugin).
- Cree una nueva integración, proveedor, canal, herramienta o enlace con
  [Build plugins](/es/plugins/building-plugins).
- Añada o ajuste las instrucciones reutilizables del agente con [Skills](/es/tools/skills) y
  [Creating skills](/es/tools/creating-skills).
- Use [Plugin SDK](/es/plugins/sdk-overview) y [Plugin manifest](/es/plugins/manifest) cuando necesite contratos de implementación.

## Solucionar problemas de herramientas que faltan

Si el modelo no puede ver o llamar a una herramienta, comienza con la política efectiva para el turno actual:

1. Verifique el perfil activo, `tools.allow`, y `tools.deny` en
   [Tools and custom providers](/es/gateway/config-tools).
2. Verifique las restricciones específicas del proveedor en
   [Tools and custom providers](/es/gateway/config-tools) y confirme que el
   [model provider](/es/concepts/model-providers) seleccionado admite la forma de la herramienta.
3. Verifique los permisos del canal, el estado del sandbox y el acceso elevado con
   [Sandbox vs tool policy vs elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated) y [Elevated exec](/es/tools/elevated).
4. Verifique si el complemento propietario está instalado y habilitado en
   [Plugins](/es/tools/plugin).
5. Para ejecuciones delegadas, verifique las restricciones por agente en
   [Per-agent sandbox and tool restrictions](/es/tools/multi-agent-sandbox-tools).
6. Para catálogos grandes de OpenClaw, confirme si la ejecución usa exposición directa de herramientas o
   [Tool Search](/es/tools/tool-search).

## Relacionado

- [Automation](/es/automation) para cron, tareas, heartbeat, compromisos, hooks, órdenes permanentes y Task Flow
- [Agents](/es/concepts/agent) para el modelo de agente, sesiones, memoria y coordinación multiagente
- [Tools and custom providers](/es/gateway/config-tools) para la referencia canónica de la política de herramientas
- [Plugins](/es/tools/plugin) para la instalación y gestión de complementos
- [Plugin SDK](/es/plugins/sdk-overview) para la referencia del autor de complementos
- [Skills](/es/tools/skills) para el orden de carga, restricciones y configuración de habilidades
- [Skill Workshop](/es/tools/skill-workshop) para la creación y revisión de habilidades
- [Tool Search](/es/tools/tool-search) para el descubrimiento compacto del catálogo de herramientas de OpenClaw
