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
    Una habilidad es un archivo markdown (`SKILL.md`) inyectado en el mensaje del sistema.
    Las habilidades dan al agente contexto, restricciones y guía paso a paso para
    usar las herramientas de manera efectiva. Las habilidades residen en su espacio de trabajo, en carpetas compartidas,
    o se incluyen dentro de los complementos.

    [Referencia de habilidades](/es/tools/skills) | [Creación de habilidades](/es/tools/creating-skills)

  </Step>

  <Step title="Los complementos empaquetan todo junto">
    Un complemento es un paquete que puede registrar cualquier combinación de capacidades:
    canales, proveedores de modelos, herramientas, habilidades, voz, generación de imágenes y más.
    Algunos complementos son **core** (incluidos con OpenClaw), otros son **externos**
    (publicados en npm por la comunidad).

    [Instalar y configurar complementos](/es/tools/plugin) | [Construir el suyo propio](/es/plugins/building-plugins)

  </Step>
</Steps>

## Herramientas integradas

Estas herramientas se incluyen con OpenClaw y están disponibles sin instalar ningún complemento:

| Herramienta                  | Lo que hace                                                                | Página                                  |
| ---------------------------- | -------------------------------------------------------------------------- | --------------------------------------- |
| `exec` / `process`           | Ejecutar comandos de shell, gestionar procesos en segundo plano            | [Exec](/es/tools/exec)                  |
| `browser`                    | Controlar un navegador Chromium (navegar, hacer clic, captura de pantalla) | [Navegador](/es/tools/browser)          |
| `web_search` / `web_fetch`   | Buscar en la web, obtener el contenido de la página                        | [Web](/es/tools/web)                    |
| `read` / `write` / `edit`    | E/S de archivos en el espacio de trabajo                                   |                                         |
| `apply_patch`                | Parches de archivos de múltiples fragmentos                                | [Aplicar parche](/es/tools/apply-patch) |
| `message`                    | Enviar mensajes a través de todos los canales                              | [Envío de agente](/es/tools/agent-send) |
| `canvas`                     | Controlar node Canvas (presentar, evaluar, captura instantánea)            |                                         |
| `nodes`                      | Descubrir y apuntar a dispositivos emparejados                             |                                         |
| `cron` / `gateway`           | Gestionar trabajos programados, reiniciar puerta de enlace                 |                                         |
| `image` / `image_generate`   | Analizar o generar imágenes                                                |                                         |
| `sessions_*` / `agents_list` | Gestión de sesiones, subagentes                                            | [Subagentes](/es/tools/subagents)       |

Para trabajar con imágenes, use `image` para el análisis y `image_generate` para la generación o edición. Si apunta a `openai/*`, `google/*`, `fal/*` u otro proveedor de imágenes que no sea el predeterminado, configure primero la clave de autenticación/API de ese proveedor.

### Herramientas proporcionadas por complementos

Los complementos pueden registrar herramientas adicionales. Algunos ejemplos:

- [Lobster](/es/tools/lobster) — tiempo de ejecución de flujo de trabajo con tipos y aprobaciones reanudables
- [Tarea LLM](/es/tools/llm-task) — paso de LLM solo JSON para salida estructurada
- [Diffs](/es/tools/diffs) — visor y renderizador de diferencias
- [OpenProse](/es/prose) — orquestación de flujos de trabajo con prioridad de markdown

## Configuración de herramientas

### Listas de permitidos y denegados

Controle qué herramientas puede llamar el agente mediante `tools.allow` / `tools.deny` en la configuración. Denegar siempre gana a permitir.

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

### Perfiles de herramientas

`tools.profile` establece una lista de permitidos (allowlist) base antes de que se aplique `allow`/`deny`.
Anulación por agente: `agents.list[].tools.profile`.

| Perfil      | Lo que incluye                                                  |
| ----------- | --------------------------------------------------------------- |
| `full`      | Todas las herramientas (predeterminado)                         |
| `coding`    | E/S de archivos, tiempo de ejecución, sesiones, memoria, imagen |
| `messaging` | Mensajería, lista/historial/envío/estado de sesiones            |
| `minimal`   | Solo `session_status`                                           |

### Grupos de herramientas

Use atajos `group:*` en las listas de permitir/denegar:

| Grupo              | Herramientas                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, bash, proceso                                                                                       |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, web_fetch                                                                                     |
| `group:ui`         | navegador, lienzo                                                                                         |
| `group:automation` | cron, puerta de enlace                                                                                    |
| `group:messaging`  | mensaje                                                                                                   |
| `group:nodes`      | nodos                                                                                                     |
| `group:openclaw`   | Todas las herramientas integradas de OpenClaw (excluye herramientas de complementos)                      |

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

import es from "/components/footer/es.mdx";

<es />
