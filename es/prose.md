---
summary: "OpenProse: flujos de trabajo .prose, comandos de barra y estado en OpenClaw"
read_when:
  - Quieres ejecutar o escribir flujos de trabajo .prose
  - Quieres habilitar el complemento OpenProse
  - Necesitas entender el almacenamiento de estado
title: "OpenProse"
---

# OpenProse

OpenProse es un formato de flujo de trabajo portable, con prioridad en markdown, para orquestar sesiones de IA. En OpenClaw se distribuye como un complemento que instala un paquete de habilidades OpenProse más un comando de barra `/prose`. Los programas residen en archivos `.prose` y pueden generar múltiples subagentes con un flujo de control explícito.

Sitio oficial: [https://www.prose.md](https://www.prose.md)

## Lo que puede hacer

- Investigación y síntesis multiagente con paralelismo explícito.
- Flujos de trabajo repetibles y seguros para aprobaciones (revisión de código, triaje de incidentes, canalizaciones de contenido).
- Programas `.prose` reutilizables que puedes ejecutar en los tiempos de ejecución de agentes compatibles.

## Instalar + habilitar

Los complementos incluidos están deshabilitados por defecto. Habilita OpenProse:

```bash
openclaw plugins enable open-prose
```

Reinicia la Pasarela (Gateway) después de habilitar el complemento.

Desarrollo/checkout local: `openclaw plugins install ./extensions/open-prose`

Documentación relacionada: [Complementos](/es/tools/plugin), [Manifiesto de complementos](/es/plugins/manifest), [Habilidades](/es/tools/skills).

## Comando de barra

OpenProse registra `/prose` como un comando de habilidad invocable por el usuario. Se enruta a las instrucciones de la máquina virtual OpenProse y utiliza herramientas de OpenClaw bajo el capó.

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

- **sistema de archivos** (por defecto): `.prose/runs/...`
- **en contexto** (in-context): transitorio, para programas pequeños
- **sqlite** (experimental): requiere el binario `sqlite3`
- **postgres** (experimental): requiere `psql` y una cadena de conexión

Notas:

- sqlite/postgres son opcionales y experimentales.
- las credenciales de postgres fluyen hacia los registros del subagente; utiliza una base de datos dedicada con los privilegios mínimos necesarios.

## Programas remotos

`/prose run <handle/slug>` se resuelve en `https://p.prose.md/<handle>/<slug>`.
Las URLs directas se obtienen tal cual. Esto utiliza la herramienta `web_fetch` (o `exec` para POST).

## Asignación de tiempo de ejecución de OpenClaw

Los programas de OpenProse se asignan a primitivas de OpenClaw:

| Concepto de OpenProse         | Herramienta de OpenClaw    |
| ------------------------- | ---------------- |
| Generar sesión / Herramienta de tareas | `sessions_spawn` |
| Lectura/escritura de archivos           | `read` / `write` |
| Recuperación web                 | `web_fetch`      |

Si su lista blanca de herramientas bloquea estas herramientas, los programas de OpenProse fallarán. Consulte [Configuración de habilidades](/es/tools/skills-config).

## Seguridad + aprobaciones

Trate los archivos `.prose` como código. Revíselos antes de ejecutarlos. Use las listas blanca y las puertas de aprobación de herramientas de OpenClaw para controlar los efectos secundarios.

Para flujos de trabajo deterministas con puertas de aprobación, compárese con [Lobster](/es/tools/lobster).

import en from "/components/footer/en.mdx";

<en />
