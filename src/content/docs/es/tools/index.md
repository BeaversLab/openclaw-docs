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
    usar herramientas de manera efectiva. Las habilidades residen en tu espacio de trabajo, en carpetas compartidas
    o se distribuyen dentro de complementos.

    [Referencia de habilidades](/en/tools/skills) | [Crear habilidades](/en/tools/creating-skills)

  </Step>

  <Step title="Los complementos empaquetan todo junto">
    Un complemento es un paquete que puede registrar cualquier combinación de capacidades:
    canales, proveedores de modelos, herramientas, habilidades, voz, generación de imágenes y más.
    Algunos complementos son **centrales** (incluidos con OpenClaw), otros son **externos**
    (publicados en npm por la comunidad).

    [Instalar y configurar complementos](/en/tools/plugin) | [Construir el tuyo propio](/en/plugins/building-plugins)

  </Step>
</Steps>

## Herramientas integradas

Estas herramientas se incluyen con OpenClaw y están disponibles sin instalar ningún complemento:

| Herramienta                             | Lo que hace                                                                 | Página                                          |
| --------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| `exec` / `process`                      | Ejecutar comandos de shell, gestionar procesos en segundo plano             | [Exec](/en/tools/exec)                          |
| `code_execution`                        | Ejecutar análisis remoto de Python en sandbox                               | [Ejecución de código](/en/tools/code-execution) |
| `browser`                               | Controlar un navegador Chromium (navegar, hacer clic, captura de pantalla)  | [Navegador](/en/tools/browser)                  |
| `web_search` / `x_search` / `web_fetch` | Buscar en la web, buscar publicaciones de X, obtener contenido de la página | [Web](/en/tools/web)                            |
| `read` / `write` / `edit`               | Entrada/Salida de archivos en el espacio de trabajo                         |                                                 |
| `apply_patch`                           | Parches de archivos de múltiples partes                                     | [Aplicar parche](/en/tools/apply-patch)         |
| `message`                               | Enviar mensajes a través de todos los canales                               | [Envío de agente](/en/tools/agent-send)         |
| `canvas`                                | Controlar node Canvas (presentar, evaluar, instantánea)                     |                                                 |
| `nodes`                                 | Descubrir y apuntar a dispositivos emparejados                              |                                                 |
| `cron` / `gateway`                      | Administrar trabajos programados, reiniciar puerta de enlace                |                                                 |
| `image` / `image_generate`              | Analizar o generar imágenes                                                 |                                                 |
| `sessions_*` / `agents_list`            | Gestión de sesiones, sub-agentes                                            | [Sub-agentes](/en/tools/subagents)              |

Para trabajar con imágenes, use `image` para el análisis y `image_generate` para la generación o edición. Si apunta a `openai/*`, `google/*`, `fal/*` u otro proveedor de imágenes no predeterminado, configure primero la clave de autenticación/API de ese proveedor.

### Herramientas proporcionadas por complementos

Los complementos pueden registrar herramientas adicionales. Algunos ejemplos:

- [Lobster](/en/tools/lobster%) — tiempo de ejecución de flujo de trabajo tipado con aprobaciones reanudables
- [LLM Task](/en/tools/llm-task) — paso de LLM solo JSON para salida estructurada
- [Diffs](/en/tools/diffs) — visor y renderizador de diferencias
- [OpenProse](/en/prose) — orquestación de flujo de trabajo con prioridad en markdown

## Configuración de herramientas

### Listas de permitidos y denegados

Controle qué herramientas puede llamar el agente a través de `tools.allow` / `tools.deny` en la
configuración. Denegar siempre gana a permitir.

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

| Perfil      | Lo que incluye                                                  |
| ----------- | --------------------------------------------------------------- |
| `full`      | Todas las herramientas (predeterminado)                         |
| `coding`    | E/S de archivos, tiempo de ejecución, sesiones, memoria, imagen |
| `messaging` | Mensajería, lista/historial/envío/estado de sesiones            |
| `minimal`   | Solo `session_status`                                           |

### Grupos de herramientas

Use abreviaturas `group:*` en listas de permitidos/denegados:

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
