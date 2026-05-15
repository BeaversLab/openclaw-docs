---
summary: "Diseño de referencia para la API pública del SDK de OpenClaw App, taxonomía de eventos, artefactos, aprobaciones y estructura del paquete"
title: "Diseño de la API del SDK de OpenClaw App"
sidebarTitle: "Diseño de la API del SDK de App"
read_when:
  - You are implementing the proposed public OpenClaw app SDK
  - You need the draft namespace, event, result, artifact, approval, or security contract for the app SDK
  - You are comparing Gateway protocol resources with the high-level OpenClaw App SDK wrapper
---

Esta página es el diseño de referencia detallado de la API para el público
[OpenClaw App SDK](/es/concepts/openclaw-sdk). Está intencionalmente separado del
[Plugin SDK](/es/plugins/sdk-overview).

<Note>`@openclaw/sdk` es el paquete externo de aplicación/cliente para hablar con el Gateway. `openclaw/plugin-sdk/*` es el contrato de creación de plugins en proceso. No importe subrutas del Plugin SDK desde aplicaciones que solo necesitan ejecutar agentes.</Note>

El SDK de aplicación público debe construirse en dos capas:

1. Un cliente de Gateway generado de bajo nivel.
2. Un envoltorio ergonómico de alto nivel con objetos `OpenClaw`, `Agent`, `Session`, `Run`,
   `Task`, `Artifact`, `Approval` y `Environment`.

## Diseño del espacio de nombres

Los espacios de nombres de bajo nivel deben seguir de cerca los recursos del Gateway:

```typescript
oc.agents.list();
oc.agents.get("main");
oc.agents.create(...);
oc.agents.update(...);

oc.sessions.list();
oc.sessions.create(...);
oc.sessions.resolve(...);
oc.sessions.send(...);
oc.sessions.messages(...);
oc.sessions.fork(...);
oc.sessions.compact(...);
oc.sessions.abort(...);

oc.runs.create(...);
oc.runs.get(runId);
oc.runs.events(runId, { after });
oc.runs.wait(runId);
oc.runs.cancel(runId);

oc.tasks.list({ status: "running" });
oc.tasks.get(taskId);
oc.tasks.cancel(taskId, { reason });
oc.tasks.events(taskId, { after }); // future API

oc.models.list();
oc.models.status(); // Gateway models.authStatus

oc.tools.list();
oc.tools.invoke("tool-name", { sessionKey, idempotencyKey });

oc.artifacts.list({ runId });
oc.artifacts.get(artifactId, { runId });
oc.artifacts.download(artifactId, { runId });

oc.approvals.list();
oc.approvals.respond(approvalId, ...);

oc.environments.list();
oc.environments.create(...); // future API: current SDK throws unsupported
oc.environments.status(environmentId);
oc.environments.delete(environmentId); // future API: current SDK throws unsupported
```

Los envoltorios de alto nivel deben devolver objetos que hagan que los flujos comunes sean agradables:

```typescript
const run = await agent.run(inputOrParams);
await run.cancel();
await run.wait();

for await (const event of run.events()) {
  // normalized event stream
}

const artifacts = await run.artifacts.list();
const session = await run.session();
```

## Contrato de eventos

El SDK público debe exponer eventos versionados, reproducibles y normalizados.

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
  raw?: unknown;
};
```

`id` es un cursor de reproducción. Los consumidores deben poder volver a conectarse con
`events({ after: id })` y recibir los eventos perdidos cuando la retención lo permita.

Familias de eventos normalizadas recomendadas:

| Evento                | Significado                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ |
| `run.created`         | Ejecución aceptada.                                                                  |
| `run.queued`          | La ejecución está esperando un carril de sesión, tiempo de ejecución o entorno.      |
| `run.started`         | El tiempo de ejecución inició la ejecución.                                          |
| `run.completed`       | La ejecución finalizó con éxito.                                                     |
| `run.failed`          | La ejecución finalizó con un error.                                                  |
| `run.cancelled`       | La ejecución fue cancelada.                                                          |
| `run.timed_out`       | La ejecución excedió su tiempo de espera.                                            |
| `assistant.delta`     | Delta de texto del asistente.                                                        |
| `assistant.message`   | Mensaje completo del asistente o reemplazo.                                          |
| `thinking.delta`      | Razonamiento o delta del plan, cuando la política permite la exposición.             |
| `tool.call.started`   | La llamada a la herramienta comenzó.                                                 |
| `tool.call.delta`     | Progreso transmitido o salida parcial de la llamada a la herramienta.                |
| `tool.call.completed` | La llamada a la herramienta se devolvió correctamente.                               |
| `tool.call.failed`    | La llamada a la herramienta falló.                                                   |
| `approval.requested`  | Una ejecución o herramienta necesita aprobación.                                     |
| `approval.resolved`   | La aprobación fue otorgada, denegada, expiró o fue cancelada.                        |
| `question.requested`  | El tiempo de ejecución solicita al usuario o a la aplicación anfitriona una entrada. |
| `question.answered`   | La aplicación anfitriona proporcionó una respuesta.                                  |
| `artifact.created`    | Nuevo artefacto disponible.                                                          |
| `artifact.updated`    | Artefacto existente modificado.                                                      |
| `session.created`     | Sesión creada.                                                                       |
| `session.updated`     | Metadatos de la sesión cambiados.                                                    |
| `session.compacted`   | Ocurrió una compactación de la sesión.                                               |
| `task.updated`        | Estado de la tarea en segundo plano cambiado.                                        |
| `git.branch`          | El tiempo de ejecución observó o cambió el estado de la rama.                        |
| `git.diff`            | El tiempo de ejecución produjo o modificó un diff.                                   |
| `git.pr`              | El tiempo de ejecución abrió, actualizó o vinculó una solicitud de extracción.       |

Las cargas útiles nativas del tiempo de ejecución deberían estar disponibles a través de `raw`, pero las aplicaciones no deberían
tener que analizar `raw` para la interfaz de usuario normal.

## Contrato de resultado

`Run.wait()` debería devolver un sobre de resultado estable:

```typescript
type RunResult = {
  runId: string;
  status: "accepted" | "completed" | "failed" | "cancelled" | "timed_out";
  sessionId?: string;
  sessionKey?: string;
  taskId?: string;
  startedAt?: string | number;
  endedAt?: string | number;
  output?: {
    text?: string;
    messages?: SDKMessage[];
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    costUsd?: number;
  };
  artifacts?: ArtifactSummary[];
  error?: SDKError;
};
```

El resultado debe ser aburrido y estable. Los valores de marca de tiempo preservan la forma de Gateway,
por lo que las ejecuciones actuales respaldadas por el ciclo de vida generalmente reportan números de milisegundos de época
mientras que los adaptadores aún pueden mostrar cadenas ISO. La interfaz de usuario enriquecida, los rastros de herramientas y los
detalles nativos del tiempo de ejecución pertenecen a eventos y artefactos.

`accepted` es un resultado de espera no terminal: significa que el plazo de espera de Gateway
expiró antes de que la ejecución produjera un final/error de ciclo de vida. No debe tratarse como
`timed_out`; `timed_out` está reservado para una ejecución que excedió su propio tiempo de espera
de tiempo de ejecución.

## Aprobaciones y preguntas

Las aprobaciones deben ser de primera clase porque los agentes de codificación cruzan constantemente los límites de seguridad.

```typescript
run.onApproval(async (request) => {
  if (request.kind === "tool" && request.toolName === "exec") {
    return request.approveOnce({ reason: "CI command allowed by policy" });
  }

  return request.askUser();
});
```

Los eventos de aprobación deben incluir:

- id de aprobación
- id de ejecución e id de sesión
- tipo de solicitud
- resumen de la acción solicitada
- nombre de la herramienta o acción del entorno
- nivel de riesgo
- decisiones disponibles
- expiración
- si la decisión se puede reutilizar

Las preguntas son independientes de las aprobaciones. Una pregunta solicita al usuario o a la aplicación anfitriona información. Una aprobación solicita permiso para realizar una acción.

## Modelo de ToolSpace

Las aplicaciones necesitan comprender la superficie de herramientas sin importar elementos internos de los complementos.

```typescript
const tools = await run.toolSpace();

for (const tool of tools.list()) {
  console.log(tool.name, tool.source, tool.requiresApproval);
}
```

El SDK debería exponer:

- metadatos de herramienta normalizados
- origen: OpenClaw, MCP, complemento, canal, tiempo de ejecución o aplicación
- resumen del esquema
- política de aprobación
- compatibilidad de tiempo de ejecución
- si una herramienta está oculta, es de solo lectura, tiene capacidad de escritura o es capaz de ser anfitriona

La invocación de herramientas a través del SDK debe ser explícita y tener un ámbito definido. La mayoría de las aplicaciones deberían ejecutar agentes, no llamar a herramientas arbitrarias directamente.

## Modelo de artefacto

Los artefactos deben cubrir más que solo archivos.

```typescript
type ArtifactSummary = {
  id: string;
  runId?: string;
  sessionId?: string;
  type: "file" | "patch" | "diff" | "log" | "media" | "screenshot" | "trajectory" | "pull_request" | "workspace";
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  expiresAt?: string;
};
```

Ejemplos comunes:

- ediciones de archivos y archivos generados
- paquetes de parches
- comparaciones de VCS
- capturas de pantalla y salidas de medios
- registros y paquetes de seguimientos
- enlaces a solicitudes de extracción (pull requests)
- trayectorias de tiempo de ejecución
- instantáneas del espacio de trabajo del entorno administrado

El acceso a artefactos debería admitir redacción, retención y URL de descarga sin asumir que cada artefacto es un archivo local normal.

## Modelo de seguridad

El SDK de la aplicación debe ser explícito con respecto a la autoridad.

Ámbitos de token recomendados:

| Ámbito              | Permite                                                     |
| ------------------- | ----------------------------------------------------------- |
| `agent.read`        | Listar e inspeccionar agentes.                              |
| `agent.run`         | Iniciar ejecuciones.                                        |
| `session.read`      | Leer metadatos de sesión y mensajes.                        |
| `session.write`     | Crear, enviar a, bifurcar, compactar y abortar sesiones.    |
| `task.read`         | Leer el estado de tareas en segundo plano.                  |
| `task.write`        | Cancelar o modificar la política de notificación de tareas. |
| `approval.respond`  | Aprobar o denegar solicitudes.                              |
| `tools.invoke`      | Invocar herramientas expuestas directamente.                |
| `artifacts.read`    | Listar y descargar artefactos.                              |
| `environment.write` | Crear o destruir entornos administrados.                    |
| `admin`             | Operaciones administrativas.                                |

Valores predeterminados:

- sin reenvío de secretos de manera predeterminada
- sin paso a través sin restricciones de variables de entorno
- referencias a secretos en lugar de valores de secretos
- política explícita de espacio aislado (sandbox) y red
- retención explícita del entorno remoto
- aprobaciones para la ejecución en el host a menos que la política indique lo contrario
- eventos de ejecución sin procesar redactados antes de salir de Gateway a menos que la persona que llama tenga un ámbito de diagnóstico más sólido

## Proveedor de entorno administrado

Los agentes administrados deben implementarse como proveedores de entorno.

```typescript
type EnvironmentProvider = {
  id: string;
  capabilities: {
    checkout?: boolean;
    sandbox?: boolean;
    networkPolicy?: boolean;
    secrets?: boolean;
    artifacts?: boolean;
    logs?: boolean;
    pullRequests?: boolean;
    longRunning?: boolean;
  };
};
```

La primera implementación no necesita ser un SaaS alojado. Puede apuntar a hosts de nodos existentes, espacios de trabajo efímeros, ejecutores estilo CI o entornos estilo Testbox. El contrato importante es:

1. preparar espacio de trabajo
2. vincular entorno seguro y secretos
3. iniciar ejecución
4. transmitir eventos
5. recopilar artefactos
6. limpiar o retener según la política

Una vez que esto sea estable, un servicio en la nube alojado puede implementar el mismo contrato de proveedor.

## Estructura del paquete

Paquetes recomendados:

| Paquete                 | Propósito                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `@openclaw/sdk`         | SDK público de alto nivel y cliente de Gateway de bajo nivel generado.               |
| `@openclaw/sdk-react`   | Hooks de React opcionales para paneles y creadores de aplicaciones.                  |
| `@openclaw/sdk-testing` | Auxiliares de prueba y servidor falso de Gateway para integraciones de aplicaciones. |

El repositorio ya tiene `openclaw/plugin-sdk/*` para complementos. Mantenga ese espacio de nombres separado para evitar confundir a los autores de complementos con los desarrolladores de aplicaciones.

## Estrategia de cliente generado

El cliente de bajo nivel debe generarse a partir de esquemas de protocolo de Gateway con versiones, y luego envolverse por clases ergonómicas escritas a mano.

Capas:

1. Esquema de Gateway como fuente de verdad.
2. Cliente de TypeScript de bajo nivel generado.
3. Validadores en tiempo de ejecución para entradas externas y cargas útiles de eventos.
4. Envoltorios de alto nivel `OpenClaw`, `Agent`, `Session`, `Run`, `Task` y `Artifact`.
5. Ejemplos de recetario y pruebas de integración.

Beneficios:

- la deriva del protocolo es visible
- las pruebas pueden comparar los métodos generados con las exportaciones de Gateway
- El SDK de la aplicación se mantiene independiente de los aspectos internos del SDK del complemento
- los consumidores de bajo nivel siguen teniendo acceso completo al protocolo
- los consumidores de alto nivel obtienen la pequeña API del producto

## Relacionado

- [OpenClaw App SDK](/es/concepts/openclaw-sdk)
- [Referencia de RPC de Gateway](/es/reference/rpc)
- [Bucle del agente](/es/concepts/agent-loop)
- [Runtimes de agentes](/es/concepts/agent-runtimes)
- [Tareas en segundo plano](/es/automation/tasks)
- [Agentes ACP](/es/tools/acp-agents)
- [Resumen del Plugin SDK](/es/plugins/sdk-overview)
