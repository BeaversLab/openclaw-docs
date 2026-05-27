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

Esta es una página general y de enrutamiento. Para obtener información exhaustiva sobre la política de herramientas, los valores predeterminados, la pertenencia a grupos, las restricciones de proveedores y los campos de configuración, utilice [Herramientas y proveedores personalizados](/es/gateway/config-tools).

## Comience aquí

Para la mayoría de los agentes, comience con las categorías de herramientas integradas y luego ajuste la política únicamente cuando el agente deba ver menos herramientas o necesite acceso explícito al host.

| Si necesita...                                                   | Use esto primero                                            | Luego lea                                                                                   |
| ---------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Permitir que un agente actúe con capacidades existentes          | [Herramientas integradas](#built-in-tool-categories)        | [Categorías de herramientas](#built-in-tool-categories)                                     |
| Controlar lo que un agente puede llamar                          | [Política de herramientas](#configure-access-and-approvals) | [Herramientas y proveedores personalizados](/es/gateway/config-tools)                       |
| Enseñar un flujo de trabajo a un agente                          | [Habilidades](#choose-tools-skills-or-plugins)              | [Habilidades](/es/tools/skills) y [Creación de habilidades](/es/tools/creating-skills)      |
| Añadir una nueva integración o superficie de tiempo de ejecución | [Complementos](#extend-capabilities)                        | [Complementos](/es/tools/plugin) y [Creación de complementos](/es/plugins/building-plugins) |
| Ejecutar trabajo más tarde o en segundo plano                    | [Automatización](/es/automation)                            | [Descripción general de la automatización](/es/automation)                                  |
| Coordinar múltiples agentes o arneses                            | [Subagentes](/es/tools/subagents)                           | [Agentes ACP](/es/tools/acp-agents) y [Envío de agente](/es/tools/agent-send)               |
| Buscar un catálogo grande de herramientas de PI                  | [Búsqueda de herramientas](/es/tools/tool-search)           | [Búsqueda de herramientas](/es/tools/tool-search)                                           |

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

  <Step title="Usar una habilidad cuando el agente necesite instrucciones">
    Una habilidad es un paquete de instrucciones `SKILL.md` cargado en el mensaje del agente. Use una
    habilidad cuando el agente ya tenga las herramientas que necesita, pero necesite un flujo de
    trabajo repetible, una rúbrica de revisión, una secuencia de comandos o una restricción de
    operación.

    Las habilidades pueden vivir en un espacio de trabajo, un directorio de habilidades compartidas,
    una raíz de habilidades gestionada de OpenClaw o un paquete de complementos.

    [Habilidades](/es/tools/skills) | [Crear habilidades](/es/tools/creating-skills) | [Configuración de habilidades](/es/tools/skills-config)

  </Step>

  <Step title="Usar un complemento cuando OpenClaw necesite una nueva capacidad">
    Un complemento puede agregar herramientas, habilidades, canales, proveedores de modelos, voz,
    voz en tiempo real, generación de medios, búsqueda web, obtención web, enlaces y otras
    capacidades de tiempo de ejecución. Use un complemento cuando la capacidad tenga código,
    credenciales, enlaces de ciclo de vida, metadatos de manifiesto o empaquetado instalable. Los
    complementos existentes se pueden instalar desde ClawHub, npm, git, directorios locales o
    archivos.

    [Instalar y configurar complementos](/es/tools/plugin) | [Construir complementos](/es/plugins/building-plugins) | [SDK de complementos](/es/plugins/sdk-overview)

  </Step>
</Steps>

## Categorías de herramientas integradas

La tabla enumera herramientas representativas para que pueda reconocer la superficie. No es
la referencia completa de la política. Para obtener grupos exactos, valores predeterminados y
semánticas de permitir/denegar, use [Herramientas y proveedores personalizados](/es/gateway/config-tools).

| Categoría                | Usar cuando el agente necesite...                                                       | Herramientas representativas                                         | Leer siguiente                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Tiempo de ejecución      | Ejecute comandos, gestione procesos o use análisis de Python respaldado por proveedores | `exec`, `process`, `code_execution`                                  | [Exec](/es/tools/exec), [Ejecución de código](/es/tools/code-execution)                |
| Archivos                 | Leer y cambiar archivos del espacio de trabajo                                          | `read`, `write`, `edit`, `apply_patch`                               | [Aplicar parche](/es/tools/apply-patch)                                                |
| Web                      | Buscar en la web, buscar publicaciones en X u obtener contenido de página legible       | `web_search`, `x_search`, `web_fetch`                                | [Herramientas web](/es/tools/web), [Obtención web](/es/tools/web-fetch)                |
| Navegador                | Operar una sesión de navegador                                                          | `browser`                                                            | [Navegador](/es/tools/browser)                                                         |
| Mensajería y canales     | Enviar respuestas o acciones de canal                                                   | `message`                                                            | [Envío de agente](/es/tools/agent-send)                                                |
| Sesiones y agentes       | Inspeccionar sesiones, delegar trabajo, dirigir otra ejecución o reportar estado        | `sessions_*`, `subagents`, `agents_list`, `session_status`           | [Sub-agentes](/es/tools/subagents), [Herramienta de sesión](/es/concepts/session-tool) |
| Automatización           | Programar trabajo o responder a eventos en segundo plano                                | `cron`, `heartbeat_respond`                                          | [Automatización](/es/automation)                                                       |
| Puerta de enlace y nodos | Inspeccionar el estado de la puerta de enlace o los dispositivos de destino emparejados | `gateway`, `nodes`                                                   | [Configuración de la puerta de enlace](/es/gateway/configuration), [Nodos](/es/nodes)  |
| Medios                   | Analizar, generar o reproducir medios                                                   | `image`, `image_generate`, `music_generate`, `video_generate`, `tts` | [Descripción general de medios](/es/tools/media-overview)                              |
| Grandes catálogos de PI  | Buscar y llamar a muchas herramientas elegibles sin enviar cada esquema al modelo       | `tool_search_code`, `tool_search`, `tool_describe`                   | [Búsqueda de herramientas](/es/tools/tool-search)                                      |

<Note>La Búsqueda de herramientas es una superficie experimental de agente PI. Las ejecuciones de arnés de Codex utilizan el modo de código nativo de Codex, la búsqueda de herramientas nativa, herramientas dinámicas diferidas y llamadas a herramientas anidadas en lugar de `tools.toolSearch`.</Note>

## Herramientas proporcionadas por complementos

Los complementos pueden registrar herramientas adicionales. Los autores de complementos conectan las herramientas a través de
`api.registerTool(...)` y el `contracts.tools` del manifiesto; utilice el
[Plugin SDK](/es/plugins/sdk-overview) y el [Manifiesto de complementos](/es/plugins/manifest)
para obtener detalles del contrato.

Las herramientas comunes proporcionadas por complementos incluyen:

- [Diffs](/es/tools/diffs) para representar diferencias de archivos y markdown
- [Tarea LLM](/es/tools/llm-task) para pasos de flujo de trabajo solo JSON
- [Lobster](/es/tools/lobster) para flujos de trabajo tipados con aprobaciones reanudables
- [Tokenjuice](/es/tools/tokenjuice) para compactar el ruidoso `exec` y el `bash` herramienta
  salida
- [Búsqueda de herramientas](/es/tools/tool-search) para descubrir y llamar a catálogos de herramientas grandes
  sin poner cada esquema en el mensaje
- [Canvas](/es/plugins/reference/canvas) para el control de Canvas de nodo y la representación A2UI
  rendering

## Configurar el acceso y las aprobaciones

La política de herramientas se aplica antes de la llamada al modelo. Si la política elimina una herramienta, el modelo no recibe el esquema de esa herramienta para el turno. Una ejecución puede perder herramientas debido a la configuración global, la configuración por agente, la política del canal, las restricciones del proveedor, las reglas del entorno sandbox, la política del canal/tiempo de ejecución o la disponibilidad de complementos.

- [Herramientas y proveedores personalizados](/es/gateway/config-tools) documenta los perfiles de herramientas,
  listas de permitidos/denegados, restricciones específicas del proveedor, detección de bucles y
  configuración de herramientas respaldadas por el proveedor.
- [Aprobaciones de ejecución](/es/tools/exec-approvals) documenta la política de aprobación de
  comandos del host.
- [Ejecución elevada](/es/tools/elevated) documenta la ejecución controlada fuera del
  sandbox.
- [Sandbox vs política de herramientas vs elevado](/es/gateway/sandbox-vs-tool-policy-vs-elevated) explica qué capa controla el acceso a archivos y procesos.
- [Sandbox y restricciones de herramientas por agente](/es/tools/multi-agent-sandbox-tools)
  documentan las restricciones específicas del agente para ejecuciones delegadas.

## Ampliar capacidades

Elija la ruta de extensión según la tarea que necesite que realice OpenClaw:

- Instale o gestione un complemento existente con [Complementos](/es/tools/plugin).
- Construya una nueva integración, proveedor, canal, herramienta o enlace con
  [Compilar complementos](/es/plugins/building-plugins).
- Agregue o ajuste instrucciones reutilizables del agente con [Habilidades](/es/tools/skills) y
  [Crear habilidades](/es/tools/creating-skills).
- Empaquete material de flujo de trabajo reutilizable con
  [Taller de habilidades](/es/plugins/skill-workshop) cuando el flujo de trabajo pertenezca a un
  paquete de habilidades distribuido por complemento.
- Use el [SDK de complementos](/es/plugins/sdk-overview) y el [Manifiesto de complementos](/es/plugins/manifest) cuando necesite contratos de implementación.

## Solucionar problemas de herramientas faltantes

Si el modelo no puede ver o llamar a una herramienta, comience con la política efectiva para el
turno actual:

1. Verifique el perfil activo, `tools.allow` y `tools.deny` en
   [Herramientas y proveedores personalizados](/es/gateway/config-tools).
2. Verifique las restricciones específicas del proveedor en
   [Herramientas y proveedores personalizados](/es/gateway/config-tools) y confirme que el
   [proveedor de modelos](/es/concepts/model-providers) seleccionado admite la forma de la herramienta.
3. Verifique los permisos del canal, el estado del sandbox y el acceso elevado con
   [Sandbox vs política de herramientas vs elevado](/es/gateway/sandbox-vs-tool-policy-vs-elevated) y [Exec elevado](/es/tools/elevated).
4. Verifique si el complemento propietario está instalado y habilitado en
   [Complementos](/es/tools/plugin).
5. Para ejecuciones delegadas, verifique las restricciones por agente en
   [Sandbox y restricciones de herramientas por agente](/es/tools/multi-agent-sandbox-tools).
6. Para catálogos grandes de PI, confirme si la ejecución usa exposición directa de herramientas o
   [Búsqueda de herramientas](/es/tools/tool-search).

## Relacionado

- [Automatización](/es/automation) para cron, tareas, latido, compromisos, enlaces, órdenes permanentes y Flujo de tareas
- [Agentes](/es/concepts/agent) para el modelo de agente, sesiones, memoria y coordinación multiagente
- [Herramientas y proveedores personalizados](/es/gateway/config-tools) para la referencia canónica de la política de herramientas
- [Plugins](/es/tools/plugin) para la instalación y gestión de plugins
- [Plugin SDK](/es/plugins/sdk-overview) para la referencia del autor de plugins
- [Habilidades](/es/tools/skills) para el orden de carga, activación y configuración de habilidades
- [Búsqueda de herramientas](/es/tools/tool-search) para el descubrimiento compacto del catálogo de herramientas de PI
