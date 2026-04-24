---
summary: "Resumen de las herramientas y complementos de OpenClaw: lo que el agente puede hacer y cómo extenderlo"
read_when:
  - You want to understand what tools OpenClaw provides
  - You need to configure, allow, or deny tools
  - You are deciding between built-in tools, skills, and plugins
title: "Herramientas y complementos"
---

# Herramientas y complementos

Todo lo que hace el agente más allá de generar texto ocurre a través de **herramientas**.
Las herramientas son como el agente lee archivos, ejecuta comandos, navega por la web, envía
mensajes e interactúa con dispositivos.

## Herramientas, habilidades y complementos

OpenClaw tiene tres capas que trabajan juntas:

<Steps>
  <Step title="Las herramientas son lo que llama el agente">
    Una herramienta es una función tipificada que el agente puede invocar (por ejemplo, `exec`, `browser`,
    `web_search`, `message`). OpenClaw incluye un conjunto de **herramientas integradas** y
    los complementos pueden registrar otras adicionales.

    El agente ve las herramientas como definiciones de funciones estructuradas enviadas a la API del modelo.

  </Step>

  <Step title="Las habilidades enseñan al agente cuándo y cómo">
    Una habilidad es un archivo markdown (`SKILL.md`) inyectado en el prompt del sistema.
    Las habilidades proporcionan al agente contexto, restricciones y guía paso a paso para
    usar las herramientas de forma efectiva. Las habilidades residen en tu espacio de trabajo, en carpetas compartidas,
    o se incluyen dentro de los plugins.

    [Referencia de habilidades](/es/tools/skills) | [Creación de habilidades](/es/tools/creating-skills)

  </Step>

  <Step title="Los plugins empaquetan todo junto">
    Un plugin es un paquete que puede registrar cualquier combinación de capacidades:
    canales, proveedores de modelos, herramientas, habilidades, voz, transcripción en tiempo real,
    voz en tiempo real, comprensión de medios, generación de imágenes, generación de video,
    obtención web, búsqueda web y más. Algunos plugins son **centrales** (incluidos con
    OpenClaw), otros son **externos** (publicados en npm por la comunidad).

    [Instalar y configurar plugins](/es/tools/plugin) | [Construir el tuyo propio](/es/plugins/building-plugins)

  </Step>
</Steps>

## Herramientas integradas

Estas herramientas se incluyen con OpenClaw y están disponibles sin instalar ningún complemento:

| Herramienta                                | Lo que hace                                                                                        | Página                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `exec` / `process`                         | Ejecutar comandos de shell, gestionar procesos en segundo plano                                    | [Exec](/es/tools/exec), [Aprobaciones Exec](/es/tools/exec-approvals) |
| `code_execution`                           | Ejecutar análisis remoto de Python en sandbox                                                      | [Ejecución de código](/es/tools/code-execution)                       |
| `browser`                                  | Controlar un navegador Chromium (navegar, hacer clic, captura de pantalla)                         | [Navegador](/es/tools/browser)                                        |
| `web_search` / `x_search` / `web_fetch`    | Buscar en la web, buscar publicaciones de X, obtener contenido de la página                        | [Web](/es/tools/web), [Obtención Web](/es/tools/web-fetch)            |
| `read` / `write` / `edit`                  | Entrada/Salida de archivos en el espacio de trabajo                                                |                                                                       |
| `apply_patch`                              | Parches de archivos de múltiples partes                                                            | [Aplicar Parche](/es/tools/apply-patch)                               |
| `message`                                  | Enviar mensajes a través de todos los canales                                                      | [Envío de Agente](/es/tools/agent-send)                               |
| `canvas`                                   | Controlar node Canvas (presentar, evaluar, instantánea)                                            |                                                                       |
| `nodes`                                    | Descubrir y apuntar a dispositivos emparejados                                                     |                                                                       |
| `cron` / `gateway`                         | Gestionar trabajos programados; inspeccionar, parchear, reiniciar o actualizar la puerta de enlace |                                                                       |
| `image` / `image_generate`                 | Analizar o generar imágenes                                                                        | [Generación de Imágenes](/es/tools/image-generation)                  |
| `music_generate`                           | Generar pistas de música                                                                           | [Generación de Música](/es/tools/music-generation)                    |
| `video_generate`                           | Generar videos                                                                                     | [Generación de Video](/es/tools/video-generation)                     |
| `tts`                                      | Conversión de texto a voz de un solo paso                                                          | [TTS](/es/tools/tts)                                                  |
| `sessions_*` / `subagents` / `agents_list` | Gestión de sesiones, estado y orquestación de sub-agentes                                          | [Sub-agentes](/es/tools/subagents)                                    |
| `session_status`                           | Lectura de estilo `/status` ligera y anulación del modelo de sesión                                | [Herramientas de Sesión](/es/concepts/session-tool)                   |

Para trabajos de imagen, use `image` para el análisis y `image_generate` para la generación o edición. Si apunta a `openai/*`, `google/*`, `fal/*` u otro proveedor de imágenes que no sea el predeterminado, configure primero la clave de autenticación/API de ese proveedor.

Para trabajos de música, use `music_generate`. Si apunta a `google/*`, `minimax/*` u otro proveedor de música que no sea el predeterminado, configure primero la clave de autenticación/API de ese proveedor.

Para trabajos de video, use `video_generate`. Si apunta a `qwen/*` u otro proveedor de video que no sea el predeterminado, configure primero la clave de autenticación/API de ese proveedor.

Para la generación de audio impulsada por flujos de trabajo, use `music_generate` cuando un complemento como ComfyUI lo registre. Esto es independiente de `tts`, que es texto a voz.

`session_status` es la herramienta ligera de estado/lectura en el grupo de sesiones. Responde preguntas de estilo `/status` sobre la sesión actual y opcionalmente puede establecer una anulación de modelo por sesión; `model=default` borra esa anulación. Al igual que `/status`, puede rellenar contadores dispersos de tokens/caché y la etiqueta del modelo de tiempo de ejecución activo desde la entrada de uso de la transcripción más reciente.

`gateway` es la herramienta de tiempo de ejecución solo para propietarios para operaciones de puerta de enlace:

- `config.schema.lookup` para un subárbol de configuración con ámbito de ruta antes de las ediciones
- `config.get` para la instantánea + hash de la configuración actual
- `config.patch` para actualizaciones parciales de configuración con reinicio
- `config.apply` solo para el reemplazo de configuración completa
- `update.run` para actualización explícita + reinicio

Para cambios parciales, prefiera `config.schema.lookup` y luego `config.patch`. Use `config.apply` solo cuando intencionalmente reemplace toda la configuración. La herramienta también se niega a cambiar `tools.exec.ask` o `tools.exec.security`; los alias `tools.bash.*` heredados se normalizan a las mismas rutas de ejecución protegidas.

### Herramientas proporcionadas por complementos

Los complementos pueden registrar herramientas adicionales. Algunos ejemplos:

- [Diffs](/es/tools/diffs) — visor y renderizador de diffs
- [Tarea LLM](/es/tools/llm-task) — paso LLM solo JSON para salida estructurada
- [Lobster](/es/tools/lobster) — tiempo de ejecución de flujo de trabajo tipado con aprobaciones reanudables
- [Generación de Música](/es/tools/music-generation) — herramienta compartida `music_generate` con proveedores respaldados por flujos de trabajo
- [OpenProse](/es/prose) — orquestación de flujos de trabajo con prioridad en markdown
- [Tokenjuice](/es/tools/tokenjuice) — resultados de herramientas `exec` y `bash` compactos y ruidosos

## Configuración de herramientas

### Listas de permitidos y denegados

Controle qué herramientas puede llamar el agente mediante `tools.allow` / `tools.deny` en
la configuración. Denegar siempre gana a permitir.

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

### Perfiles de herramientas

`tools.profile` establece una lista de permitidos base antes de que se aplique `allow`/`deny`.
Anulación por agente: `agents.list[].tools.profile`.

| Perfil      | Lo que incluye                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | Sin restricción (igual que sin establecer)                                                                                                        |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | Solo `session_status`                                                                                                                             |

Los perfiles `coding` y `messaging` también permiten herramientas MCP de paquete configuradas
bajo la clave de complemento `bundle-mcp`. Añada `tools.deny: ["bundle-mcp"]` cuando
quiera que un perfil mantenga sus herramientas integradas normales pero oculte todas las herramientas MCP configuradas.
El perfil `minimal` no incluye herramientas MCP de paquete.

### Grupos de herramientas

Use abreviaturas de `group:*` en las listas de permitidos/denegados:

| Grupo              | Herramientas                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, process, code_execution (`bash` se acepta como un alias para `exec`)                                |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas                                                                                           |
| `group:automation` | cron, gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list                                                                                               |
| `group:media`      | image, image_generate, music_generate, video_generate, tts                                                |
| `group:openclaw`   | Todas las herramientas integradas de OpenClaw (excluye herramientas de complementos)                      |

`sessions_history` devuelve una vista de recuperación limitada y filtrada por seguridad. Elimina etiquetas de pensamiento, andamiaje `<relevant-memories>`, cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`,
`<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
`<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados), andamiaje de llamadas a herramientas degradados, tokens de control de modelo ASCII/ancho completo filtrados y XML de llamadas a herramientas de MiniMax con formato incorrecto del texto del asistente, y luego aplica redacción/truncamiento y posibles marcadores de posición de fila sobredimensionados en lugar de actuar como un volcado de transcripción sin procesar.

### Restricciones específicas del proveedor

Use `tools.byProvider` para restringir herramientas para proveedores específicos sin cambiar los valores predeterminados globales:

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```
