---
summary: "OpenProse: flujos de trabajo .prose, comandos de barra y estado en OpenClaw"
read_when:
  - You want to run or write .prose workflows
  - You want to enable the OpenProse plugin
  - You need to understand state storage
title: "OpenProse"
---

OpenProse es un formato de flujo de trabajo portable y con prioridad en markdown para orquestar sesiones de IA. En OpenClaw se distribuye como un complemento que instala un paquete de habilidades OpenProse además de un comando de barra `/prose`. Los programas residen en archivos `.prose` y pueden generar múltiples subagentes con un flujo de control explícito.

Sitio oficial: [https://www.prose.md](https://www.prose.md)

## Lo que puede hacer

- Investigación y síntesis multiagente con paralelismo explícito.
- Flujos de trabajo repetibles y seguros para aprobaciones (revisión de código, triaje de incidentes, canalizaciones de contenido).
- Programas `.prose` reutilizables que puedes ejecutar en los tiempos de ejecución de agentes compatibles.

## Instalar + habilitar

Los complementos incluidos están deshabilitados de forma predeterminada. Habilita OpenProse:

```bash
openclaw plugins enable open-prose
```

Reinicia la puerta de enlace (Gateway) después de habilitar el complemento.

Desarrollo/checkout local: `openclaw plugins install ./path/to/local/open-prose-plugin`

Documentación relacionada: [Complementos](/es/tools/plugin), [Manifiesto del complemento](/es/plugins/manifest), [Habilidades](/es/tools/skills).

## Comando de barra

OpenProse registra `/prose` como un comando de habilidad invocable por el usuario. Enruta a las instrucciones de la máquina virtual de OpenProse y utiliza herramientas de OpenClaw entre bastidores.

Comandos comunes:

```
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

## Ejemplo: un archivo `.prose` simple

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

## Ubicaciones de archivos

OpenProse mantiene el estado en `.prose/` en tu espacio de trabajo:

```
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

```
~/.prose/agents/
```

## Modos de estado

OpenProse admite múltiples backends de estado:

- **sistema de archivos** (predeterminado): `.prose/runs/...`
- **en contexto** (in-context): transitorio, para programas pequeños
- **sqlite** (experimental): requiere el binario `sqlite3`
- **postgres** (experimental): requiere `psql` y una cadena de conexión

Notas:

- sqlite/postgres son opcionales y experimentales.
- las credenciales de postgres fluyen hacia los registros del subagente; utiliza una base de datos dedicada con privilegios mínimos.

## Programas remotos

`/prose run <handle/slug>` se resuelve en `https://p.prose.md/<handle>/<slug>`.
Las URL directas se obtienen tal cual. Esto utiliza la herramienta `web_fetch` (o `exec` para POST).

## Asignación del tiempo de ejecución de OpenClaw

Los programas OpenProse se asignan a primitivas de OpenClaw:

| Concepto de OpenProse                  | Herramienta de OpenClaw |
| -------------------------------------- | ----------------------- |
| Generar sesión / Herramienta de tareas | `sessions_spawn`        |
| Lectura/escritura de archivos          | `read` / `write`        |
| Obtención web                          | `web_fetch`             |

Si su lista blanca de herramientas bloquea estas herramientas, los programas de OpenProse fallarán. Consulte [Configuración de habilidades](/es/tools/skills-config).

## Seguridad + aprobaciones

Trate los archivos `.prose` como código. Revíselos antes de ejecutarlos. Use las listas blancas de herramientas de OpenClaw y los puertas de aprobación para controlar los efectos secundarios.

Para flujos de trabajo deterministas con puertas de aprobación, compare con [Lobster](/es/tools/lobster).

## Relacionado

- [Texto a voz](/es/tools/tts)
- [Formato Markdown](/es/concepts/markdown-formatting)
