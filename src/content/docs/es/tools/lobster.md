---
summary: "Tiempo de ejecución de flujos de trabajo tipados para OpenClaw con puertas de aprobación reanudables."
title: Lobster
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

Lobster es un shell de flujo de trabajo que permite a OpenClaw ejecutar secuencias de herramientas de varios pasos como una única operación determinista con puntos de control de aprobación explícitos.

Lobster es una capa de creación por encima del trabajo en segundo plano separado. Para la orquestación del flujo por encima de tareas individuales, consulte [Task Flow](/es/automation/taskflow) (`openclaw tasks flow`). Para el libro mayor de actividad de tareas, consulte [`openclaw tasks`](/es/automation/tasks).

## Hook

Tu asistente puede construir las herramientas que gestionan a sí mismas. Pide un flujo de trabajo y, 30 minutos después, tienes una CLI más canalizaciones que se ejecutan en una sola llamada. Lobster es la pieza que faltaba: canalizaciones deterministas, aprobaciones explícitas y estado reanudable.

## Por qué

Hoy en día, los flujos de trabajo complejos requieren muchas llamadas a herramientas de ida y vuelta. Cada llamada cuesta tokens y el LLM tiene que orquestar cada paso. Lobster mueve esa orquestación a un tiempo de ejecución tipado:

- **Una llamada en lugar de muchas**: OpenClaw ejecuta una única llamada a la herramienta Lobster y obtiene un resultado estructurado.
- **Aprobaciones integradas**: Los efectos secundarios (enviar correo, publicar comentario) detienen el flujo de trabajo hasta que se aprueban explícitamente.
- **Reanudable**: Los flujos de trabajo detenidos devuelven un token; apruebe y reanude sin volver a ejecutar todo.

## ¿Por qué un DSL en lugar de programas simples?

Lobster es intencionalmente pequeño. El objetivo no es "un nuevo lenguaje", es una especificación de canalización predecible y amigable para la IA con aprobaciones de primera clase y tokens de reanudación.

- **Aprobar/reanudar está integrado**: Un programa normal puede solicitar a un humano, pero no puede _pausar y reanudar_ con un token duradero sin que invente ese tiempo de ejecución usted mismo.
- **Determinismo + auditoría**: Las canalizaciones son datos, por lo que son fáciles de registrar, comparar, reproducir y revisar.
- **Superficie restringida para la IA**: Una gramática diminuta + canalización JSON reduce las rutas de código "creativas" y hace que la validación sea realista.
- **Política de seguridad integrada**: Los tiempos de espera, los límites de salida, las comprobaciones de espacio aislado y las listas de permitidos son impuestos por el tiempo de ejecución, no por cada script.
- **Todavía programable**: Cada paso puede invocar cualquier CLI o script. Si desea JS/TS, genere archivos `.lobster` a partir del código.

## Cómo funciona

OpenClaw ejecuta flujos de trabajo de Lobster **en proceso** utilizando un ejecutor integrado. No se genera ningún subproceso CLI externo; el motor del flujo de trabajo se ejecuta dentro del proceso de la puerta de enlace y devuelve un sobre JSON directamente.
Si la canalización se pausa para su aprobación, la herramienta devuelve un `resumeToken` para que pueda continuar más tarde.

## Patrón: pequeña CLI + tuberías JSON + aprobaciones

Construya comandos diminutos que hablen JSON, luego encadénelos en una sola llamada de Lobster. (Nombres de comandos de ejemplo a continuación: cámbielos por los suyos).

```bash
inbox list --json
inbox categorize --json
inbox apply --json
```

```json
{
  "action": "run",
  "pipeline": "exec --json --shell 'inbox list --json' | exec --stdin json --shell 'inbox categorize --json' | exec --stdin json --shell 'inbox apply --json' | approve --preview-from-stdin --limit 5 --prompt 'Apply changes?'",
  "timeoutMs": 30000
}
```

Si la canalización solicita aprobación, reanude con el token:

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

La IA desencadena el flujo de trabajo; Lobster ejecuta los pasos. Los controles de aprobación mantienen los efectos secundarios explícitos y auditables.

Ejemplo: mapear elementos de entrada en llamadas a herramientas:

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## Pasos de LLM solo JSON (llm-task)

Para los flujos de trabajo que necesitan un **paso LLM estructurado**, habilite la herramienta de complemento opcional
`llm-task` e invóquela desde Lobster. Esto mantiene el flujo de trabajo
determinista mientras le permite clasificar/resumir/borrar con un modelo.

Active la herramienta:

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "alsoAllow": ["llm-task"] }
      }
    ]
  }
}
```

### Limitación importante: Lobster integrado frente a `openclaw.invoke`

El complemento Lobster incluido ejecuta flujos de trabajo **en proceso** dentro de la puerta de enlace. En ese modo integrado, `openclaw.invoke` **no** hereda automáticamente un contexto de URL/autenticación de la puerta de enlace para llamadas a herramientas CLI de OpenClaw anidadas.

Eso significa que este patrón **no es actualmente confiable en el ejecutor integrado**:

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

Use el ejemplo a continuación solo cuando ejecute el **Lobster CLI independiente** en un entorno donde `openclaw.invoke` ya esté configurado con el contexto de puerta de enlace/autenticación correcto.

Úselo en una canalización CLI de Lobster independiente:

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": { "subject": "Hello", "body": "Can you help?" },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

Si hoy estás utilizando el complemento Lobster integrado, prefiere cualquiera de:

- una llamada a la herramienta `llm-task` directa fuera de Lobster, o
- pasos que no sean `openclaw.invoke` dentro de la canalización de Lobster hasta que se agregue un puente integrado compatible.

Consulta [LLM Task](/es/tools/llm-task) para obtener detalles y opciones de configuración.

## Archivos de flujo de trabajo (.lobster)

Lobster puede ejecutar archivos de flujo de trabajo YAML/JSON con campos `name`, `args`, `steps`, `env`, `condition` y `approval`. En las llamadas a herramientas de OpenClaw, establece `pipeline` en la ruta del archivo.

```yaml
name: inbox-triage
args:
  tag:
    default: "family"
steps:
  - id: collect
    command: inbox list --json
  - id: categorize
    command: inbox categorize --json
    stdin: $collect.stdout
  - id: approve
    command: inbox apply --approve
    stdin: $categorize.stdout
    approval: required
  - id: execute
    command: inbox apply --execute
    stdin: $categorize.stdout
    condition: $approve.approved
```

Notas:

- `stdin: $step.stdout` y `stdin: $step.json` pasan la salida de un paso anterior.
- `condition` (o `when`) puede condicionar los pasos en `$step.approved`.

## Instalar Lobster

Los flujos de trabajo de Lobster integrados se ejecutan en proceso; no se requiere un binario `lobster` separado. El ejecutor integrado se incluye con el complemento Lobster.

Si necesitas la CLI independiente de Lobster para desarrollo o canalizaciones externas, instálala desde el [repositorio de Lobster](https://github.com/openclaw/lobster) y asegúrate de que `lobster` esté en `PATH`.

## Habilitar la herramienta

Lobster es una herramienta de complemento **opcional** (no habilitada de forma predeterminada).

Recomendado (aditivo, seguro):

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

O por agente:

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "alsoAllow": ["lobster"]
        }
      }
    ]
  }
}
```

Evita usar `tools.allow: ["lobster"]` a menos que tengas la intención de ejecutar en modo de lista de permitidos restrictiva.

<Note>Las listas de permitidos son optativas para complementos opcionales. `alsoAllow` habilita solo las herramientas de complementos opcionales nombradas mientras preserva el conjunto normal de herramientas principales. Para restringir las herramientas principales, usa `tools.allow` con las herramientas o grupos principales que desees.</Note>

## Ejemplo: triaje de correo electrónico

Sin Lobster:

```
User: "Check my email and draft replies"
→ openclaw calls gmail.list
→ LLM summarizes
→ User: "draft replies to #2 and #5"
→ LLM drafts
→ User: "send #2"
→ openclaw calls gmail.send
(repeat daily, no memory of what was triaged)
```

Con Lobster:

```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

Devuelve un sobre JSON (truncado):

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 need replies, 2 need action" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "Send 2 draft replies?",
    "items": [],
    "resumeToken": "..."
  }
}
```

Usuario aprueba → reanudar:

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

Un flujo de trabajo. Determinista. Seguro.

## Parámetros de la herramienta

### `run`

Ejecuta una canalización en modo de herramienta.

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

Ejecuta un archivo de flujo de trabajo con argumentos:

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.lobster",
  "argsJson": "{\"tag\":\"family\"}"
}
```

### `resume`

Continúa un flujo de trabajo detenido después de la aprobación.

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### Entradas opcionales

- `cwd`: Directorio de trabajo relativo para la canalización (debe mantenerse dentro del directorio de trabajo de la puerta de enlace).
- `timeoutMs`: Cancelar el flujo de trabajo si excede esta duración (predeterminado: 20000).
- `maxStdoutBytes`: Cancelar el flujo de trabajo si la salida excede este tamaño (predeterminado: 512000).
- `argsJson`: Cadena JSON pasada a `lobster run --args-json` (solo archivos de flujo de trabajo).

## Sobreenvoltura de salida

Lobster devuelve una sobreenvoltura JSON con uno de tres estados:

- `ok` → finalizado correctamente
- `needs_approval` → en pausa; se requiere `requiresApproval.resumeToken` para reanudar
- `cancelled` → denegado explícitamente o cancelado

La herramienta expone la sobreenvoltura tanto en `content` (JSON bonito) como en `details` (objeto sin formato).

## Aprobaciones

Si `requiresApproval` está presente, inspeccione el mensaje y decida:

- `approve: true` → reanudar y continuar los efectos secundarios
- `approve: false` → cancelar y finalizar el flujo de trabajo

Use `approve --preview-from-stdin --limit N` para adjuntar una vista previa JSON a las solicitudes de aprobación sin pegamento personalizado de jq/heredoc. Los tokens de reanudación ahora son compactos: Lobster almacena el estado de reanudación del flujo de trabajo en su directorio de estado y devuelve una pequeña clave de token.

## OpenProse

OpenProse combina bien con Lobster: use `/prose` para orquestar la preparación multiagente, luego ejecute una canalización Lobster para aprobaciones deterministas. Si un programa Prose necesita Lobster, permita la herramienta `lobster` para subagentes a través de `tools.subagents.tools`. Consulte [OpenProse](/es/prose).

## Seguridad

- **Solo local en proceso** - los flujos de trabajo se ejecutan dentro del proceso de la puerta de enlace; no hay llamadas de red desde el complemento en sí.
- **Sin secretos** - Lobster no gestiona OAuth; llama a herramientas de OpenClaw que sí lo hacen.
- **Consciente del sandbox** - deshabilitado cuando el contexto de la herramienta está en sandbox.
- **Endurecido** - tiempos de espera y límites de salida aplicados por el ejecutor integrado.

## Solución de problemas

- **`lobster timed out`** → aumente `timeoutMs` o divida una canalización larga.
- **`lobster output exceeded maxStdoutBytes`** → aumente `maxStdoutBytes` o reduzca el tamaño de la salida.
- **`lobster returned invalid JSON`** → asegúrese de que la canalización se ejecute en modo de herramienta e imprima solo JSON.
- **`lobster failed`** → consulte los registros de la puerta de enlace para obtener los detalles del error del ejecutor integrado.

## Más información

- [Complementos](/es/tools/plugin)
- [Creación de herramientas de complemento](/es/plugins/building-plugins#registering-agent-tools)

## Estudio de caso: flujos de trabajo de la comunidad

Un ejemplo público: una CLI de "segundo cerebro" + canalizaciones de Lobster que administran tres bóvedas de Markdown (personal, pareja, compartida). La CLI emite JSON para estadísticas, listas de bandeja de entrada y escaneos de obsolescencia; Lobster encadena esos comandos en flujos de trabajo como `weekly-review`, `inbox-triage`, `memory-consolidation` y `shared-task-sync`, cada uno con puertas de aprobación. La IA maneja el juicio (categorización) cuando está disponible y recurre a reglas deterministas cuando no.

- Hilo: [https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- Repositorio: [https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## Relacionado

- [Automatización](/es/automation) - programación de flujos de trabajo de Lobster
- [Descripción general de automatización](/es/automation) - todos los mecanismos de automatización
- [Descripción general de herramientas](/es/tools) - todas las herramientas de agente disponibles
