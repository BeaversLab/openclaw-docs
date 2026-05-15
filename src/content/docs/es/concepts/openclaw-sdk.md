---
summary: "OpenClaw App SDK público para aplicaciones externas, scripts, paneles, trabajos de CI y extensiones de IDE"
title: "OpenClaw App SDK"
sidebarTitle: "App SDK"
read_when:
  - You are building an external app, script, dashboard, CI job, or IDE extension that talks to OpenClaw
  - You are choosing between the App SDK and the Plugin SDK
  - You are integrating with Gateway agent runs, sessions, events, approvals, models, or tools
---

El **OpenClaw App SDK** es la API pública del cliente para aplicaciones fuera del proceso de OpenClaw. Use `@openclaw/sdk` cuando un script, panel, trabajo de CI, extensión de IDE u otra aplicación externa desee conectarse al Gateway, iniciar ejecuciones de agentes, transmitir eventos, esperar resultados, cancelar trabajo o inspeccionar recursos del Gateway.

<Note>El App SDK es diferente del [Plugin SDK](/es/plugins/sdk-overview). `@openclaw/sdk` se comunica con el Gateway desde fuera de OpenClaw. `openclaw/plugin-sdk/*` es solo para complementos que se ejecutan dentro de OpenClaw y registran proveedores, canales, herramientas, ganchos o tiempos de ejecución de confianza.</Note>

## Lo que se incluye hoy

`@openclaw/sdk` incluye:

| Superficie                | Estado  | Lo que hace                                                                                              |
| ------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `OpenClaw`                | Listo   | Punto de entrada principal del cliente. Posee el transporte, la conexión, las solicitudes y los eventos. |
| `GatewayClientTransport`  | Listo   | Transporte WebSocket respaldado por el cliente Gateway.                                                  |
| `oc.agents`               | Listo   | Lista, crea, actualiza, elimina y obtiene identificadores de agentes.                                    |
| `Agent.run()`             | Listo   | Inicia una ejecución de `agent` del Gateway y devuelve un `Run`.                                         |
| `oc.runs`                 | Listo   | Crea, obtiene, espera, cancela y transmite ejecuciones.                                                  |
| `Run.events()`            | Listo   | Transmite eventos normalizados por ejecución con repetición para ejecuciones rápidas.                    |
| `Run.wait()`              | Listo   | Llama a `agent.wait` y devuelve un `RunResult` estable.                                                  |
| `Run.cancel()`            | Listo   | Llama a `sessions.abort` por id de ejecución, con clave de sesión cuando está disponible.                |
| `oc.sessions`             | Listo   | Crea, resuelve, envía a, parcha, compacta y obtiene identificadores de sesión.                           |
| `Session.send()`          | Listo   | Llama a `sessions.send` y devuelve un `Run`.                                                             |
| `oc.tasks`                | Listo   | Lista, lee y cancela las entradas del libro mayor de tareas del Gateway.                                 |
| `oc.models`               | Listo   | Llama a `models.list` y al RPC de estado `models.authStatus` actual.                                     |
| `oc.tools`                | Listo   | Lista, delimita e invoca herramientas del Gateway a través de la canalización de políticas.              |
| `oc.artifacts`            | Listo   | Lista, obtiene y descarga artefactos de transcripciones del Gateway.                                     |
| `oc.approvals`            | Listo   | Lista y resuelve aprobaciones de ejecución a través de los RPC de aprobación del Gateway.                |
| `oc.environments`         | Parcial | Lista los candidatos de entorno local del Gateway y de nodo; crear/eliminar no están conectados.         |
| `oc.rawEvents()`          | Listo   | Expone eventos sin procesar del Gateway para consumidores avanzados.                                     |
| `normalizeGatewayEvent()` | Listo   | Convierte eventos sin procesar del Gateway a la forma de evento estable del SDK.                         |

El SDK también exporta los tipos principales utilizados por esas superficies:
`AgentRunParams`, `RunResult`, `RunStatus`, `OpenClawEvent`,
`OpenClawEventType`, `GatewayEvent`, `OpenClawTransport`,
`GatewayRequestOptions`, `SessionCreateParams`, `SessionSendParams`,
`ArtifactSummary`, `ArtifactQuery`, `ArtifactsListResult`,
`ArtifactsGetResult`, `ArtifactsDownloadResult`,
`TaskSummary`, `TaskStatus`, `TasksListParams`, `TasksListResult`,
`TasksGetResult`, `TasksCancelResult`, `RuntimeSelection`,
`EnvironmentSelection`, `WorkspaceSelection`, `ApprovalMode` y tipos de
resultado relacionados.

## Conectarse a un Gateway

Cree un cliente con una URL de Gateway explícita, o inyecte un transporte personalizado para
pruebas y tiempos de ejecución de aplicaciones integradas.

```typescript
import { OpenClaw } from "@openclaw/sdk";

const oc = new OpenClaw({
  url: "ws://127.0.0.1:18789",
  token: process.env.OPENCLAW_GATEWAY_TOKEN,
  requestTimeoutMs: 30_000,
});

await oc.connect();
```

`new OpenClaw({ gateway: "ws://..." })` es equivalente a `url`. La
opción `gateway: "auto"` es aceptada por el constructor, pero el descubrimiento automático del Gateway
aún no es una función separada del SDK; pase `url` cuando la aplicación aún no
sepa cómo descubrir el Gateway.

Para las pruebas, pasa un objeto que implemente `OpenClawTransport`:

```typescript
const oc = new OpenClaw({
  transport: {
    async request(method, params) {
      return { method, params };
    },
    async *events() {},
  },
});
```

## Ejecutar un agente

Usa `oc.agents.get(id)` cuando la aplicación quiera un identificador de agente y luego llama a
`agent.run()`.

```typescript
const agent = await oc.agents.get("main");

const run = await agent.run({
  input: "Review this pull request and suggest the smallest safe fix.",
  model: "openai/gpt-5.5",
  sessionKey: "main",
  timeoutMs: 30_000,
});

for await (const event of run.events()) {
  const data = event.data as { delta?: unknown };
  if (event.type === "assistant.delta" && typeof data.delta === "string") {
    process.stdout.write(data.delta);
  }
}

const result = await run.wait({ timeoutMs: 120_000 });
console.log(result.status);
```

Las referencias de modelo calificadas por proveedor, como `openai/gpt-5.5`, se dividen en las
sobreescrituras `provider` y `model` del Gateway. `timeoutMs` se mantiene en milisegundos en el SDK y
se convierte en segundos de tiempo de espera del Gateway para la llamada RPC `agent`.

`run.wait()` usa la llamada RPC `agent.wait` del Gateway. Un plazo de espera que expira
mientras la ejecución aún está activa devuelve `status: "accepted"` en lugar de fingir
que la ejecución en sí misma expiró. Los tiempos de espera de ejecución, las ejecuciones abortadas y las ejecuciones canceladas se
normalizan en `timed_out` o `cancelled`.

## Crear y reutilizar sesiones

Usa sesiones cuando la aplicación quiera un estado de transcripción duradero.

```typescript
const session = await oc.sessions.create({
  agentId: "main",
  label: "release-review",
});

const run = await session.send("Prepare release notes from the current diff.");
await run.wait();
```

`Session.send()` llama a `sessions.send` y devuelve un `Run`. Los identificadores de sesión también
admiten:

```typescript
await session.abort(run.id);
await session.patch({ label: "renamed-session" });
await session.compact({ maxLines: 200 });
```

## Transmitir eventos

El SDK normaliza los eventos sin procesar del Gateway en un envoltorio `OpenClawEvent` estable:

```typescript
type OpenClawEvent = {
  version: 1;
  id: string;
  ts: number;
  type: OpenClawEventType;
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
  taskId?: string;
  agentId?: string;
  data: unknown;
  raw?: GatewayEvent;
};
```

Los tipos de eventos comunes incluyen:

| Tipo de evento        | Evento del Gateway de origen                                       |
| --------------------- | ------------------------------------------------------------------ |
| `run.started`         | inicio del ciclo de vida `agent`                                   |
| `run.completed`       | fin del ciclo de vida `agent`                                      |
| `run.failed`          | error del ciclo de vida `agent`                                    |
| `run.cancelled`       | fin del ciclo de vida abortado/cancelado                           |
| `run.timed_out`       | fin del ciclo de vida de tiempo de espera agotado                  |
| `assistant.delta`     | Diferencia de streaming del asistente                              |
| `assistant.message`   | Mensaje del asistente                                              |
| `thinking.delta`      | Flujo de pensamiento o plan                                        |
| `tool.call.started`   | Inicio de herramienta/elemento/comando                             |
| `tool.call.delta`     | Actualización de herramienta/elemento/comando                      |
| `tool.call.completed` | Finalización de herramienta/elemento/comando                       |
| `tool.call.failed`    | Estado de falla o bloqueo de herramienta/elemento/comando          |
| `approval.requested`  | Solicitud de aprobación de ejecución o complemento                 |
| `approval.resolved`   | Resolución de aprobaciones de exec o plugin                        |
| `session.created`     | creación de `sessions.changed`                                     |
| `session.updated`     | actualización de `sessions.changed`                                |
| `session.compacted`   | compactación de `sessions.changed`                                 |
| `task.updated`        | Eventos de actualización de tareas                                 |
| `artifact.updated`    | Eventos de flujo de parches (Patch stream)                         |
| `raw`                 | Cualquier evento que aún no tenga una asignación estable en el SDK |

`Run.events()` filtra los eventos a un ID de ejecución y reproduce eventos ya vistos para
execuciones rápidas. Eso significa que el flujo documentado es seguro:

```typescript
const run = await agent.run("Summarize the latest session.");

for await (const event of run.events()) {
  if (event.type === "run.completed") {
    break;
  }
}
```

Para flujos en toda la aplicación, use `oc.events()`. Para tramas sin procesar del Gateway, use
`oc.rawEvents()`.

## Modelos, herramientas, artefactos y aprobaciones

Los auxiliares de modelos se asignan a los métodos actuales del Gateway:

```typescript
await oc.models.list();
await oc.models.status({ probe: false }); // calls models.authStatus
```

Los auxiliares de herramientas exponen el catálogo del Gateway, la vista efectiva de herramientas y la invocación
directa de herramientas del Gateway. `oc.tools.invoke()` devuelve un sobre con tipo en lugar
de lanzar un error para rechazos de política o aprobación.

```typescript
await oc.tools.list();
await oc.tools.effective({ sessionKey: "main" });
await oc.tools.invoke("tool-name", {
  args: { input: "value" },
  sessionKey: "main",
  confirm: false,
  idempotencyKey: "tool-call-1",
});
```

Los auxiliares de artefactos exponen la proyección de artefactos del Gateway para el contexto de sesión, ejecución o
tarea. Cada llamada requiere un alcance `sessionKey`, `runId` o
`taskId` explícito:

```typescript
const { artifacts } = await oc.artifacts.list({ sessionKey: "main" });
const first = artifacts[0];

if (first) {
  const { artifact } = await oc.artifacts.get(first.id, { sessionKey: "main" });
  const download = await oc.artifacts.download(artifact.id, { sessionKey: "main" });
  console.log(download.encoding, download.url);
}
```

Los auxiliares de aprobación utilizan los RPC de aprobación de exec:

```typescript
const approvals = await oc.approvals.list();
await oc.approvals.respond("approval-id", { decision: "approve" });
```

Los auxiliares de tareas utilizan el libro mayor de tareas durables que también respalda `openclaw tasks`:

```typescript
const tasks = await oc.tasks.list({ status: "running", sessionKey: "agent:main:main" });
const task = await oc.tasks.get(tasks.tasks[0].id);
await oc.tasks.cancel(task.task.id, { reason: "user stopped task" });
```

Los auxiliares de entorno exponen la lectura exclusiva local del Gateway y el descubrimiento de nodos:

```typescript
const { environments } = await oc.environments.list();
await oc.environments.status(environments[0].id);
```

## Explícitamente no soportado hoy

El SDK incluye nombres para el modelo de producto que queremos, pero no finge
silenciosamente que existen los RPC del Gateway. Estas llamadas actualmente lanzan errores explícitos de no soportado:

```typescript
await oc.environments.create({});
await oc.environments.delete("environment-id");
```

Los campos `workspace`, `runtime`, `environment` y `approvals` por ejecución están tipificados
como forma futura, pero el Gateway actual no admite esas anulaciones en
el RPC `agent`. Si los llamadores los pasan, el SDK lanza un error antes de enviar la ejecución
para que el trabajo no se ejecute accidentalmente con el comportamiento predeterminado del espacio de trabajo, tiempo de ejecución,
entorno o aprobación.

## App SDK frente a Plugin SDK

Use el App SDK cuando el código resida fuera de OpenClaw:

- Scripts de Node que inician u observan ejecuciones de agentes
- Trabajos de CI que llaman a un Gateway
- paneles de control y paneles de administración
- Extensiones de IDE
- puentes externos que no necesitan convertirse en complementos de canal
- pruebas de integración con transportes de Gateway falsos o reales

Use el Plugin SDK cuando el código se ejecuta dentro de OpenClaw:

- complementos de proveedor
- complementos de canal
- herramientas o ganchos de ciclo de vida
- complementos de arnés de agente
- asistentes de entorno de ejecución de confianza

El código del App SDK debe importar desde `@openclaw/sdk`. El código de los complementos debe importar desde
subrutas documentadas de `openclaw/plugin-sdk/*`. No mezcle los dos contratos.

## Relacionado

- [Diseño de la API del SDK de aplicaciones de OpenClaw](/es/reference/openclaw-sdk-api-design)
- [Referencia de RPC de Gateway](/es/reference/rpc)
- [Bucle de agente](/es/concepts/agent-loop)
- [Entornos de ejecución de agente](/es/concepts/agent-runtimes)
- [Sesiones](/es/concepts/session)
- [Tareas en segundo plano](/es/automation/tasks)
- [Agentes ACP](/es/tools/acp-agents)
- [Descripción general del Plugin SDK](/es/plugins/sdk-overview)
