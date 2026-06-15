---
title: "OpenProse"
sidebarTitle: "OpenProse"
summary: "OpenProse es un formato de flujo de trabajo con prioridad en Markdown para sesiones de IA multiagente. En OpenClaw se distribuye como un complemento con un comando de barra /prose y un paquete de habilidades."
read_when:
  - You want to run or write .prose workflow files
  - You want to enable the OpenProse plugin
  - You need to understand how OpenProse maps to OpenClaw primitives
---

OpenProse es un formato de flujo de trabajo portable con prioridad en Markdown para orquestar sesiones
de IA. En OpenClaw se distribuye como un complemento que instala un paquete de habilidades OpenProse
y un comando de barra `/prose`. Los programas residen en archivos `.prose` y pueden
generar múltiples subagentes con un flujo de control explícito.

<CardGroup cols={3}>
  <Card title="Install" icon="download" href="#install">
    Habilite el complemento OpenProse y reinicie el Gateway.
  </Card>
  <Card title="Run a program" icon="play" href="#slash-command">
    Use `/prose run` para ejecutar un archivo `.prose` o un programa remoto.
  </Card>
  <Card title="Write programs" icon="pencil" href="#example">
    Cree flujos de trabajo multiagente con pasos paralelos y secuenciales.
  </Card>
</CardGroup>

## Instalación

<Steps>
  <Step title="Enable the plugin">
    Los complementos incluidos están deshabilitados de forma predeterminada. Habilite OpenProse:

    ```bash
    openclaw plugins enable open-prose
    ```

  </Step>
  <Step title="Restart the Gateway">
    ```bash
    openclaw gateway restart
    ```
  </Step>
  <Step title="Verify">
    ```bash
    openclaw plugins list | grep prose
    ```

    Debería ver `open-prose` como habilitado. El comando de habilidad `/prose` ahora está
    disponible en el chat.

  </Step>
</Steps>

Para un registro local: `openclaw plugins install ./path/to/local/open-prose-plugin`

## Comando de barra

OpenProse registra `/prose` como un comando de habilidad invocable por el usuario:

```text
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

`/prose run <handle/slug>` se resuelve a `https://p.prose.md/<handle>/<slug>`.
Las URL directas se obtienen tal cual usando la herramienta `web_fetch`.

## Lo que puede hacer

- Investigación y síntesis multiagente con paralelismo explícito.
- Flujos de trabajo repetibles y seguros para aprobaciones (revisión de código, triaje de incidentes, canalizaciones de contenido).
- Programas `.prose` reutilizables que puedes ejecutar en los runtimes de agentes compatibles.

## Ejemplo: investigación y síntesis en paralelo

```prose
# Research + synthesis with two agents running in parallel.

input topic: "What should we research?"

agent researcher:
  model: sonnet
  prompt: "You research thoroughly and cite sources."

agent writer:
  model: opus
  prompt: "You write a concise summary."

parallel:
  findings = session: researcher
    prompt: "Research {topic}."
  draft = session: writer
    prompt: "Summarize {topic}."

session "Merge the findings + draft into a final answer."
context: { findings, draft }
```

## Mapeo del runtime de OpenClaw

Los programas de OpenProse se asignan a primitivas de OpenClaw:

| Concepto de OpenProse                  | Herramienta de OpenClaw |
| -------------------------------------- | ----------------------- |
| Generar sesión / Herramienta de tareas | `sessions_spawn`        |
| Lectura / escritura de archivos        | `read` / `write`        |
| Recuperación web                       | `web_fetch`             |

<Warning>Si tu lista blanca de herramientas bloquea `sessions_spawn`, `read`, `write`, o `web_fetch`, los programas de OpenProse fallarán. Revisa tu [configuración de lista blanca de herramientas](/es/gateway/config-tools).</Warning>

## Ubicaciones de archivos

OpenProse mantiene el estado en `.prose/` en tu espacio de trabajo:

```text
.prose/
├── .env
├── runs/
│   └── {YYYYMMDD}-{HHMMSS}-{random}/
│       ├── program.prose
│       ├── state.md
│       ├── bindings/
│       └── agents/
└── agents/
```

Los agentes persistentes a nivel de usuario residen en:

```text
~/.prose/agents/
```

## Backends de estado

<AccordionGroup>
  <Accordion title="sistema de archivos (predeterminado)">
    El estado se escribe en `.prose/runs/...` en el espacio de trabajo. No se requieren
    dependencias adicionales.
  </Accordion>
  <Accordion title="en contexto">
    Estado transitorio mantenido en la ventana de contexto. Adecuado para programas
    pequeños y de corta duración.
  </Accordion>
  <Accordion title="sqlite (experimental)">
    Requiere el binario `sqlite3` en `PATH`.
  </Accordion>
  <Accordion title="postgres (experimental)">
    Requiere `psql` y una cadena de conexión.

    <Warning>
      Las credenciales de Postgres fluyen hacia los registros de sub-agentes. Utiliza una base de datos
      dedicada con privilegios mínimos.
    </Warning>

  </Accordion>
</AccordionGroup>

## Seguridad

Trate los archivos `.prose` como código. Revíselos antes de ejecutarlos. Use las listas de permitidos y puertas de aprobación de herramientas de OpenClaw para controlar los efectos secundarios. Para flujos de trabajo deterministas con puertas de aprobación, compare con [Lobster](/es/tools/lobster).

## Relacionado

<CardGroup cols={2}>
  <Card title="Referencia de habilidades" href="/es/tools/skills" icon="puzzle-piece">
    Cómo se carga el paquete de habilidades de OpenProse y qué puertas se aplican.
  </Card>
  <Card title="Subagentes" href="/es/tools/subagents" icon="users">
    La capa nativa de coordinación multiagente de OpenClaw.
  </Card>
  <Card title="Texto a voz" href="/es/tools/tts" icon="volume-high">
    Añada salida de audio a sus flujos de trabajo.
  </Card>
  <Card title="Comandos de barra" href="/es/tools/slash-commands" icon="terminal">
    Todos los comandos de chat disponibles, incluyendo /prose.
  </Card>
</CardGroup>

Sitio oficial: [https://www.prose.md](https://www.prose.md)
