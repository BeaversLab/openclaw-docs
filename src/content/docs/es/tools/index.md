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
    Una habilidad es un archivo markdown (`SKILL.md`) inyectado en el indicador del sistema.
    Las habilidades proporcionan al agente contexto, restricciones y guía paso a paso para
    utilizar herramientas eficazmente. Las habilidades residen en su espacio de trabajo, en carpetas compartidas,
    o se incluyen dentro de complementos.

    [Referencia de habilidades](/en/tools/skills) | [Creación de habilidades](/en/tools/creating-skills)

  </Step>

  <Step title="Plugins package everything together">
    Un complemento es un paquete que puede registrar cualquier combinación de capacidades:
    canales, proveedores de modelos, herramientas, habilidades, voz, generación de imágenes y más.
    Algunos complementos son **principales** (incluidos con OpenClaw), otros son **externos**
    (publicados en npm por la comunidad).

    [Instalar y configurar complementos](/en/tools/plugin) | [Construir el tuyo propio](/en/plugins/building-plugins)

  </Step>
</Steps>

## Herramientas integradas

Estas herramientas se incluyen con OpenClaw y están disponibles sin instalar ningún complemento:

| Herramienta                             | Lo que hace                                                                    | Página                                          |
| --------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------- |
| `exec` / `process`                      | Ejecutar comandos de shell, gestionar procesos en segundo plano                | [Exec](/en/tools/exec)                          |
| `code_execution`                        | Ejecutar análisis remoto de Python en entorno sandbox                          | [Ejecución de código](/en/tools/code-execution) |
| `browser`                               | Controlar un navegador Chromium (navegar, hacer clic, captura de pantalla)     | [Navegador](/en/tools/browser)                  |
| `web_search` / `x_search` / `web_fetch` | Buscar en la web, buscar publicaciones de X, obtener el contenido de la página | [Web](/en/tools/web)                            |
| `read` / `write` / `edit`               | E/S de archivos en el espacio de trabajo                                       |                                                 |
| `apply_patch`                           | Parches de archivos multi-hunk                                                 | [Apply Patch](/en/tools/apply-patch)            |
| `message`                               | Enviar mensajes a través de todos los canales                                  | [Agent Send](/en/tools/agent-send)              |
| `canvas`                                | Conducir node Canvas (presentar, evaluar, instantánea)                         |                                                 |
| `nodes`                                 | Descubrir y apuntar a dispositivos emparejados                                 |                                                 |
| `cron` / `gateway`                      | Gestionar trabajos programados, reiniciar puerta de enlace                     |                                                 |
| `image` / `image_generate`              | Analizar o generar imágenes                                                    |                                                 |
| `sessions_*` / `agents_list`            | Gestión de sesiones, subagentes                                                | [Sub-agentes](/en/tools/subagents)              |

Para trabajo con imágenes, usa `image` para el análisis y `image_generate` para la generación o edición. Si apuntas a `openai/*`, `google/*`, `fal/*` u otro proveedor de imágenes no predeterminado, configura primero la clave de autenticación/API de ese proveedor.

### Herramientas proporcionadas por plugins

Los plugins pueden registrar herramientas adicionales. Algunos ejemplos:

- [Lobster](/en/tools/lobster%) — motor de flujo de trabajo tipado con aprobaciones reanudables
- [LLM Task](/en/tools/llm-task%) — paso LLM solo JSON para salida estructurada
- [Diffs](/en/tools/diffs%) — visor y renderizador de diferencias
- [OpenProse](/en/prose) — orquestación de flujos de trabajo con prioridad en markdown

## Configuración de herramientas

### Listas de permitidos y denegados

Controla qué herramientas puede llamar el agente mediante `tools.allow` / `tools.deny` en la
configuración. Denegar siempre tiene prioridad sobre permitir.

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

### Perfiles de herramientas

`tools.profile` establece una lista base de permitidos antes de que se aplique `allow`/`deny`.
Anulación por agente: `agents.list[].tools.profile`.

| Perfil      | Qué incluye                                                     |
| ----------- | --------------------------------------------------------------- |
| `full`      | Todas las herramientas (predeterminado)                         |
| `coding`    | E/S de archivos, tiempo de ejecución, sesiones, memoria, imagen |
| `messaging` | Mensajería, lista/historial/envío/estado de sesiones            |
| `minimal`   | Solo `session_status`                                           |

### Grupos de herramientas

Usa atajos `group:*` en listas de permitidos/denegados:

| Grupo              | Herramientas                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, bash, process, code_execution                                                                       |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas                                                                                           |
| `group:automation` | cron, gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:openclaw`   | Todas las herramientas integradas de OpenClaw (excluye los complementos)                                  |

### Restricciones específicas del proveedor

Use `tools.byProvider` para restringir herramientas para proveedores específicos sin
cambiar los valores predeterminados globales:

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
