---
summary: "Modo de código OpenClaw: una superficie de herramienta exec/wait opcional respaldada por QuickJS-WASI y un catálogo de herramientas con alcance de ejecución oculto"
title: "Modo de código"
sidebarTitle: "Modo de código"
read_when:
  - You want to enable OpenClaw code mode for an agent run
  - You need to explain why code mode is different from Codex Code mode
  - You are reviewing the exec/wait contract, QuickJS-WASI sandbox, TypeScript transform, or hidden tool-catalog bridge
  - You are adding or reviewing an internal code-mode namespace registry integration
---

El modo de código es una característica experimental del tiempo de ejecución del agente OpenClaw. Está desactivado de forma predeterminada. Cuando lo habilita, OpenClaw cambia lo que el modelo ve en una ejecución: en lugar de exponer cada esquema de herramienta habilitado directamente, el modelo ve solo `exec` y `wait`.

Esta página documenta el modo de código de OpenClaw. No es el modo de código de Codex. Las dos características comparten un nombre, pero están implementadas por diferentes tiempos de ejecución y exponen diferentes `exec` contratos:

- El modo de código de Codex está habilitado para los subprocesos del servidor de aplicaciones Codex a menos que una política de herramientas restringida deshabilite el modo de código nativo. Se ejecuta en el arnés de codificación de Codex, donde el modelo escribe comandos de shell a través de un contrato `exec.command`.
- El modo de código de OpenClaw está deshabilitado a menos que se configure `tools.codeMode.enabled: true`. Se ejecuta en el tiempo de ejecución del agente genérico de OpenClaw, donde el modelo escribe programas JavaScript o TypeScript a través de un contrato `exec.code`.

El modo de código de Codex y la búsqueda dinámica de herramientas nativa de Codex son superficies estables del arnés de Codex. El modo de código de OpenClaw es un adaptador de superficie de herramienta experimental propiedad de OpenClaw para ejecuciones genéricas de OpenClaw. Utiliza `quickjs-wasi`, un catálogo de herramientas oculto de OpenClaw y el ejecutor de herramientas normal de OpenClaw.

## ¿Qué es esto?

El modo de código de OpenClaw permite que el modelo escriba un pequeño programa de JavaScript o TypeScript en lugar de elegir directamente de una larga lista de herramientas.

Cuando el modo de código está activo:

- La lista de herramientas visible para el modelo es exactamente `exec` y `wait`.
- `exec` evalúa JavaScript o TypeScript generado por el modelo en un trabajador QuickJS-WASI restringido.
- Las herramientas normales de OpenClaw están ocultas para el mensaje del modelo y se exponen dentro del programa invitado a través de `ALL_TOOLS` y `tools`.
- El código invitado puede buscar el catálogo oculto, describir una herramienta y llamar a una herramienta a través de la misma ruta de ejecución de OpenClaw utilizada por los turnos normales del agente.
- Las herramientas MCP se agrupan en el espacio de nombres `MCP`. En el modo de código, este espacio de nombres es la única forma admitida de llamar a las herramientas MCP.
- `wait` reanuda una ejecución en modo de código suspendida cuando las llamadas a herramientas anidadas aún están pendientes.

La distinción importante: el modo de código cambia la superficie de orquestación orientada al modelo. No reemplaza las herramientas de OpenClaw, las herramientas de complementos, las herramientas de MCP, la autenticación, la política de aprobación, el comportamiento del canal ni la selección del modelo.

## ¿Por qué esto es bueno?

El modo de código facilita el uso de catálogos de herramientas grandes para los modelos.

- Superficie de solicitud más pequeña: los proveedores reciben dos herramientas de control en lugar de docenas o cientos de esquemas de herramientas completas.
- Mejor orquestación: el modelo puede usar bucles, uniones, pequeñas transformaciones, lógica condicional y llamadas a herramientas anidadas en paralelo dentro de una celda de código.
- Neutral al proveedor: funciona para herramientas de OpenClaw, complementos, MCP y clientes sin depender de la ejecución de código nativa del proveedor.
- La política existente permanece vigente: las llamadas a herramientas anidadas aún pasan por la política, aprobaciones, enlaces, contexto de sesión y rutas de auditoría de OpenClaw.
- Modo de fallo claro: cuando el modo de código está explícitamente habilitado y el tiempo de ejecución no está disponible, OpenClaw falla de forma cerrada en lugar de recurrir a una exposición amplia y directa de herramientas.

El modo de código es especialmente útil para agentes con un catálogo de herramientas habilitadas grande o para flujos de trabajo donde el modelo necesita repetidamente buscar, combinar y llamar herramientas antes de producir una respuesta.

## Cómo habilitarlo

Añada `tools.codeMode.enabled: true` a la configuración del agente o del tiempo de ejecución:

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

También se acepta la forma abreviada:

```json5
{
  tools: {
    codeMode: true,
  },
}
```

El modo de código permanece desactivado cuando se omite `tools.codeMode`, es `false`, o un objeto sin `enabled: true`.

Cuando use agentes en sandbox con servidores MCP configurados, asegúrese también de que la política de herramientas del sandbox permita el complemento MCP incluido, por ejemplo con `tools.sandbox.tools.alsoAllow: ["bundle-mcp"]`. Consulte [Configuration - tools and custom providers](/es/gateway/config-tools#mcp-and-plugin-tools-inside-sandbox-tool-policy).

Use límites explícitos cuando desee límites más estrictos:

```json5
{
  tools: {
    codeMode: {
      enabled: true,
      timeoutMs: 10000,
      memoryLimitBytes: 67108864,
      maxOutputBytes: 65536,
      maxSnapshotBytes: 10485760,
      maxPendingToolCalls: 16,
      snapshotTtlSeconds: 900,
      searchDefaultLimit: 8,
      maxSearchLimit: 50,
    },
  },
}
```

Para confirmar la forma del payload del modelo mientras depura, ejecute el Gateway con registro específico:

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

Con el modo de código activo, los nombres de herramientas orientadas al modelo registrados deberían ser `exec` y `wait`. Si necesita el payload del proveedor redactado, añada `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` para una breve sesión de depuración.

## Tour técnico

El resto de esta página describe el contrato de tiempo de ejecución y los detalles de implementación.
Está dirigido a mantenedores, autores de complementos que depuran la exposición de herramientas y
operadores que validan implementaciones de alto riesgo.

## Estado del tiempo de ejecución

- Tiempo de ejecución: [`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi).
- Estado predeterminado: desactivado.
- Estabilidad: superficie experimental de OpenClaw; el modo de código Codex es una superficie de
  arnés de Codex estable y separada.
- Superficie objetivo: ejecuciones genéricas de agentes de OpenClaw.
- Postura de seguridad: el código del modelo es hostil.
- Promesa para el usuario: activar el modo de código nunca retrocede silenciosamente a una
  exposición directa y amplia de herramientas.

## Alcance

El modo de código posee la forma de orquestación visible para el modelo en una ejecución preparada. No
posee la selección del modelo, el comportamiento del canal, la autenticación, la política de herramientas ni las
implementaciones de herramientas.

En el alcance:

- definiciones de herramientas `exec` y `wait` visibles para el modelo
- construcción del catálogo de herramientas oculto
- ejecución de invitados JavaScript y TypeScript
- tiempo de ejecución del trabajador QuickJS-WASI
- devoluciones de llamada del host para la búsqueda en el catálogo, la descripción del esquema y la llamada a la herramienta
- estado reanudable para programas invitados suspendidos
- límites de salida, tiempo de espera, memoria, llamadas pendientes e instantáneas
- telemetría y proyección de trayectoria para llamadas a herramientas anidadas

Fuera del alcance:

- ejecución de código remoto nativa del proveedor
- semántica de ejecución de shell
- cambiar la autorización de herramientas existentes
- scripts persistentes creados por el usuario
- acceso al administrador de paquetes, archivos, red o módulos en el código invitado
- reutilización directa de los internos del modo de código Codex

Las herramientas propiedad del proveedor, como los entornos limitados de Python remotos, siguen siendo herramientas separadas. Consulte
[Ejecución de código](/es/tools/code-execution).

## Términos

**Modo de código** es el modo de tiempo de ejecución de OpenClaw que oculta las herramientas normales del modelo y
expone solo `exec` y `wait`.

**Tiempo de ejecución invitado** es la máquina virtual JavaScript QuickJS-WASI que evalúa el código del modelo.

**Puente anfitrión** es la estrecha superficie de devolución de llamada compatible con JSON desde el código invitado
de vuelta a OpenClaw.

**Catálogo** es la lista de herramientas efectivas con ámbito de ejecución después de la política normal de herramientas,
complementos, MCP y resolución de herramientas de cliente.

**Llamada a herramienta anidada** es una llamada a herramienta realizada desde el código invitado a través del puente anfitrión.

**Snapshot** es el estado serializado de la VM QuickJS-WASI guardado para que `wait` pueda continuar una
ejecución de modo de código suspendida.

## Configuración

`tools.codeMode.enabled` es la puerta de activación. Establecer otros campos del modo de código
no habilita la función.

Campos admitidos:

- `enabled`: booleano. Por defecto `false`. Habilita el modo de código solo cuando `true`.
- `runtime`: `"quickjs-wasi"`. Único tiempo de ejecución admitido.
- `mode`: `"only"`. Expone `exec` y `wait`, oculta las herramientas normales del modelo.
- `languages`: array de `"javascript"` y `"typescript"`. El valor predeterminado incluye
  ambos.
- `timeoutMs`: límite de tiempo de reloj para un `exec` o `wait`. Por defecto `10000`.
  Límite de tiempo de ejecución: `100` a `60000`.
- `memoryLimitBytes`: límite del heap de QuickJS. Por defecto `67108864`. Límite de tiempo de ejecución:
  `1048576` a `1073741824`.
- `maxOutputBytes`: límite para el texto, JSON y registros devueltos. Por defecto `65536`.
  Límite de tiempo de ejecución: `1024` a `10485760`.
- `maxSnapshotBytes`: límite para las instantáneas serializadas de la VM. Por defecto `10485760`.
  Límite de tiempo de ejecución: `1024` a `268435456`.
- `maxPendingToolCalls`: límite para llamadas a herramientas anidadas simultáneas. Por defecto `16`.
  Límite de tiempo de ejecución: `1` a `128`.
- `snapshotTtlSeconds`: cuánto tiempo se puede reanudar una VM suspendida. Por defecto `900`.
  Límite de tiempo de ejecución: `1` a `86400`.
- `searchDefaultLimit`: recuento predeterminado de resultados de búsqueda de catálogo oculto. Predeterminado `8`.
  El tiempo de ejecución limita esto a `maxSearchLimit`.
- `maxSearchLimit`: recuento máximo de resultados de búsqueda de catálogo oculto. Predeterminado `50`.
  Límite del tiempo de ejecución: `1` a `50`.

Si el modo de código está habilitado pero QuickJS-WASI no se puede cargar, OpenClaw falla cerrado para esa ejecución. No expone silenciosamente las herramientas normales como alternativa.

## Activación

El modo de código se evalúa después de conocer la política de herramientas efectiva y antes de ensamblar la solicitud final del modelo.

Orden de activación:

1. Resolver el agente, el modelo, el proveedor, el sandbox, el canal, el remitente y la política de ejecución.
2. Construir la lista de herramientas de OpenClaw efectiva.
3. Añadir herramientas de complementos, MCP y de cliente elegibles.
4. Aplicar la política de permitir y denegar.
5. Si `tools.codeMode.enabled` es falso, continuar con la exposición normal de herramientas.
6. Si está habilitado y las herramientas están activas para la ejecución, registrar las herramientas efectivas en el catálogo de modo de código.
7. Eliminar todas las herramientas normales de la lista de herramientas visibles para el modelo.
8. Añadir `exec` y `wait` del modo de código.

Las ejecuciones que intencionalmente no tienen herramientas, como las llamadas sin procesar al modelo, `disableTools`, o una lista de permitidos vacía, no activan la superficie del modo de código incluso si la configuración contiene `tools.codeMode.enabled: true`.

El catálogo de modo de código tiene alcance de ejecución. No debe filtrar herramientas de otro agente, sesión, remitente o ejecución.

## Herramientas visibles para el modelo

Cuando el modo de código está activo, el modelo ve exactamente estas herramientas de nivel superior:

- `exec`
- `wait`

Todas las demás herramientas habilitadas se ocultan de la lista de herramientas orientada al modelo y se registran en el catálogo de modo de código.

El modelo debe usar `exec` para la orquestación de herramientas, unión de datos, bucles, llamadas anidadas en paralelo y transformaciones estructuradas. El modelo debe usar `wait` solo cuando `exec` devuelve un resultado reanudable `waiting`.

## `exec`

`exec` inicia una celda en modo de código y devuelve un resultado. El código de entrada es generado por el modelo y debe ser tratado como hostil.

Entrada:

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

Reglas de entrada:

- Uno de `code` o `command` no debe estar vacío.
- `code` es el campo documentado orientado al modelo.
- `command` se acepta como un alias compatible con exec para políticas de enlace y reescrituras de confianza; cuando ambos están presentes, los valores deben coincidir.
- Los eventos de enlace `exec` del modo de código externo incluyen `toolKind: "code_mode_exec"` e incluyen `toolInputKind: "javascript" | "typescript"` cuando se conoce el idioma de entrada, por lo que las políticas pueden distinguir las celdas en modo de código de las llamadas de estilo shell `exec` que comparten el mismo nombre de herramienta.
- `language` por defecto es `"javascript"`.
- Si `language` es `"typescript"`, OpenClaw transpila antes de la evaluación.
- `exec` rechaza `import`, `require`, importación dinámica y patrones de cargador de módulos en v1.
- `exec` no expone la implementación normal del shell `exec` de forma recursiva.

Resultado:

```typescript
type CodeModeResult = CodeModeCompletedResult | CodeModeWaitingResult | CodeModeFailedResult;

type CodeModeCompletedResult = {
  status: "completed";
  value: unknown;
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};

type CodeModeWaitingResult = {
  status: "waiting";
  runId: string;
  reason: "pending_tools" | "yield";
  pendingToolCalls?: CodeModePendingToolCall[];
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};

type CodeModeFailedResult = {
  status: "failed";
  error: string;
  code?: CodeModeErrorCode;
  output?: CodeModeOutput[];
  telemetry: CodeModeTelemetry;
};
```

`exec` devuelve `waiting` cuando la VM de QuickJS se suspende con un estado reanudable que todavía necesita una continuación visible para el modelo. El resultado incluye un `runId` para `wait`. Las llamadas al puente de espacio de nombres, incluidas las llamadas al espacio de nombres MCP, se drenan automáticamente dentro de la misma llamada `exec`/`wait` mientras están listas, por lo que un bloque de código compacto puede inspeccionar `$api()` y llamar a una herramienta MCP sin forzar una llamada de herramienta de modelo por cada espera de espacio de nombres.

`exec` devuelve `completed` solo cuando la VM invitada no tiene trabajo pendiente y el valor final es compatible con JSON después de que se ejecuta el adaptador de salida de OpenClaw.

## `wait`

`wait` continúa una VM en modo de código suspendida.

Entrada:

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

El resultado es la misma unión `CodeModeResult` devuelta por `exec`.

`wait` existe porque las herramientas anidadas de OpenClaw pueden ser lentas, interactivas, con aprobación obligatoria o transmitir actualizaciones parciales. El modelo no debería necesitar mantener una llamada `exec` larga abierta mientras el host espera trabajo externo.

La instantánea (snapshot) y restauración de QuickJS-WASI es el mecanismo de reanudación v1:

1. `exec` evalúa el código hasta su finalización, fallo o suspensión.
2. Al suspenderse, OpenClaw crea una instantánea de la VM de QuickJS y registra el trabajo pendiente del host.
3. Cuando el trabajo pendiente se resuelve, `wait` restaura la instantánea de la VM.
4. OpenClaw vuelve a registrar las devoluciones de llamada del host mediante nombres estables.
5. OpenClaw entrega los resultados de herramientas anidadas en la VM restaurada.
6. OpenClaw drena los trabajos pendientes de QuickJS.
7. `wait` devuelve `completed`, `failed` u otro resultado `waiting`.

Las instantáneas son estado de tiempo de ejecución, no artefactos de usuario. Tienen límite de tamaño, caducan y están limitadas a la ejecución y sesión que las crearon.

`wait` falla cuando:

- `runId` es desconocido.
- la instantánea ha caducado.
- la ejecución o sesión principal fue abortada.
- la persona que llama no está en el mismo alcance de ejecución/sesión.
- la restauración de QuickJS-WASI falla.
- la restauración excedería los límites configurados.

## API del tiempo de ejecución del huésped

El tiempo de ejecución del huésped expone una pequeña API global:

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;
declare const MCP: Record<string, unknown>;
declare const namespaces: Record<string, unknown>;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` son metadatos compactos para el catálogo con alcance de ejecución. No contiene esquemas completos de forma predeterminada.

```typescript
type ToolCatalogEntry = {
  id: string;
  name: string;
  label?: string;
  description: string;
  source: "openclaw" | "plugin" | "mcp" | "client";
  sourceName?: string;
};
```

El esquema completo se carga solo a pedido:

```typescript
type ToolCatalogEntryWithSchema = ToolCatalogEntry & {
  parameters: unknown;
};
```

Auxiliares del catálogo:

```typescript
type ToolCatalog = {
  search(query: string, options?: { limit?: number }): Promise<ToolCatalogEntry[]>;
  describe(id: string): Promise<ToolCatalogEntryWithSchema>;
  call(id: string, input?: unknown): Promise<unknown>;
  [safeToolName: string]: unknown;
};
```

Las funciones de herramienta de conveniencia se instalan solo para nombres seguros no ambiguos:

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// If the hidden catalog has an unambiguous `web_search` entry:
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

Las entradas del catálogo MCP no se pueden llamar a través de `tools.call(...)` ni funciones de conveniencia en modo de código. Se exponen solo a través del espacio de nombres generado `MCP`. Los archivos de declaración estilo TypeScript están disponibles a través de la superficie de archivo virtual de solo lectura `API`, para que los agentes puedan inspeccionar las firmas MCP sin agregar esquemas MCP al mensaje:

```typescript
const files = await API.list("mcp");
const githubApi = await API.read("mcp/github.d.ts");

const issue = await MCP.github.createIssue({
  owner: "openclaw",
  repo: "openclaw",
  title: "Investigate gateway logs",
});

const snapshot = await MCP.chromeDevtools.takeSnapshot({ output: "markdown" });
const resource = await MCP.docs.resources.read({ uri: "memo://one" });
const prompt = await MCP.docs.prompts.get({
  name: "brief",
  arguments: { topic: "release" },
});
```

`API.read("mcp/<server>.d.ts")` devuelve declaraciones compactas inferidas de los metadatos de la herramienta MCP:

```typescript
type McpToolResult = {
  content?: unknown[];
  structuredContent?: unknown;
  isError?: boolean;
  [key: string]: unknown;
};

declare namespace MCP.github {
  /** Return this TypeScript-style API header. */
  function $api(toolName?: string, options?: { schema?: boolean }): Promise<McpApiHeader>;

  /**
   * Create a GitHub issue.
   * @param owner Repository owner
   * @param repo Repository name
   * @param title Issue title
   */
  function createIssue(input: { owner: string; repo: string; title: string; body?: string }): Promise<McpToolResult>;
}
```

Los archivos de declaración son virtuales, no archivos escritos en el espacio de trabajo o
directorio de estado. Para cada llamada de modo de código `exec`, OpenClaw construye el catálogo de herramientas
con ámbito de ejecución, mantiene las entradas MCP visibles, renderiza `mcp/index.d.ts` más una
declaración `mcp/<server>.d.ts` por servidor visible e inyecta esa pequeña
tabla de solo lectura en el trabajador de QuickJS. El código huésped solo ve el objeto `API`:
`API.list(prefix?)` devuelve metadatos de archivo y `API.read(path)` devuelve el
contenido de la declaración seleccionada. Las rutas desconocidas y los segmentos `.` / `..` son rechazados.

Esto mantiene los esquemas MCP grandes fuera del indicador del modelo. El agente aprende que la
API virtual existe a partir de la descripción de la herramienta `exec`, lee solo el archivo de
declaración necesario y luego llama a `MCP.<server>.<tool>()` con un argumento de objeto.
`MCP.<server>.$api()` permanece disponible como respaldo en línea cuando el agente
necesita una respuesta de esquema de una sola herramienta dentro del programa.

El tiempo de ejecución huésped no debe exponer objetos del host directamente. Las entradas y salidas cruzan
el puente como valores compatibles con JSON con límites de tamaño explícitos.

## Espacios de nombres internos

Los espacios de nombres internos brindan al modo de código una API de dominio concisa sin agregar más
herramientas visibles para el modelo. Una integración propiedad del cargador puede registrar un espacio de nombres como
`Issues`, `Fictions` o `Calendar`; el código huésped luego llama a ese espacio de nombres
dentro del programa QuickJS mientras OpenClaw aún muestra solo `exec` y `wait` a
el modelo.

Los espacios de nombres son internos por ahora. No hay una API de espacio de nombres del SDK de complementos pública:
los espacios de nombres de complementos externos necesitan un contrato propiedad del cargador para que la identidad del complemento,
los manifiestos instalados, el estado de autenticación y los descriptores de catálogo en caché no puedan divergir
de las herramientas del complemento que respaldan el espacio de nombres. El modo de código principal solo posee la
zona segura, la serialización, el control del catálogo y el despacho del puente.

El código huésped puede usar entonces el global directo o el mapa `namespaces`:

```javascript
const open = await Issues.list({ state: "open" });
const alsoOpen = await namespaces.Issues.list({ state: "open" });
return { count: open.length, alsoCount: alsoOpen.length };
```

### Ciclo de vida del registro

El registro de espacios de nombres es local al proceso y se indexa por el ID del espacio de nombres. Una ejecución típica sigue esta ruta:

1. Un cargador de confianza llama a `registerCodeModeNamespaceForPlugin(pluginId, registration)`.
2. El modo de código crea el `ToolSearchRuntime` oculto para la ejecución y lee su catálogo con ámbito de ejecución.
3. `createCodeModeNamespaceRuntime(ctx, catalog)` mantiene solo los registros cuyos `requiredToolNames` son todos visibles y propiedad del mismo `pluginId`.
4. Cada espacio de nombres visible llama a `createScope(ctx)` para la ejecución actual. El alcance recibe el contexto de ejecución, como `agentId`, `sessionKey`, `sessionId`, `runId`, configuración y estado de aborto.
5. Los datos del alcance se serializan en un descriptor plano y se inyectan en QuickJS como globales directos y `namespaces.<globalName>`.
6. Las llamadas del huésped se suspenden a través del puente del trabajador, resuelven la ruta del espacio de nombres en el host, mapean la llamada a una herramienta de catálogo propiedad de un complemento declarado y ejecutan esa herramienta a través de `ToolSearchRuntime.call`.
7. OpenClaw drena automáticamente las llamadas listas al puente de espacio de nombres dentro de la llamada de herramienta activa `exec`/`wait`. Si el trabajo del espacio de nombres aún está pendiente en el tiempo de espera o el huésped cede explícitamente, `wait` reanuda el mismo tiempo de ejecución del espacio de nombres más tarde.
8. La reversión o desinstalación del complemento llama a `clearCodeModeNamespacesForPlugin(pluginId)` para que las globales obsoletas no sobrevivan a una carga fallida del complemento.

El invariante importante: las llamadas al espacio de nombres son llamadas a herramientas del catálogo. Utilizan los mismos enlaces de política, aprobaciones, manejo de abortos, telemetría, proyección de transcripción y comportamiento de suspensión/reanudación que `tools.call(...)`.

### Forma de registro

Registre espacios de nombres desde la integración que posee las herramientas de respaldo. Mantenga el alcance pequeño y exponga solo verbos de dominio que se asignen a herramientas de catálogo declaradas.

```typescript
import { createCodeModeNamespaceTool, registerCodeModeNamespaceForPlugin } from "../agents/code-mode-namespaces.js";

const pluginId = "github";

registerCodeModeNamespaceForPlugin(pluginId, {
  id: "github-issues",
  globalName: "Issues",
  description: "GitHub issue helpers for the current repository.",
  requiredToolNames: ["github_list_issues", "github_update_issue"],
  prompt: "Use Issues.list(params) and Issues.update(number, patch).",
  createScope: (ctx) => ({
    repository: ctx.config,
    list: createCodeModeNamespaceTool("github_list_issues", ([params]) => params ?? {}),
    update: createCodeModeNamespaceTool("github_update_issue", ([number, patch]) => ({
      number,
      patch,
    })),
  }),
});
```

`createCodeModeNamespaceTool(toolName, inputMapper)` marca un miembro del alcance como una función de espacio de nombres invocable. El `inputMapper` opcional recibe los argumentos del huésped y devuelve el objeto de entrada para la herramienta de catálogo de respaldo. Sin un mapeador de entrada, se usa el primer argumento del huésped, o `{}` cuando se omite.

Las funciones del host sin procesar se rechazan antes de que se ejecute el código del huésped:

```typescript
createScope: () => ({
  // Wrong: this bypasses the catalog tool lifecycle and will be rejected.
  list: async () => githubClient.listIssues(),
});
```

### Propiedad y visibilidad

La propiedad del espacio de nombres está vinculada al `pluginId` del llamador de registro.
`requiredToolNames` es tanto una puerta de visibilidad como una verificación de propiedad:

- cada herramienta requerida debe existir en el catálogo de ejecución
- cada herramienta requerida debe tener `sourceName === pluginId`
- el espacio de nombres se oculta cuando falta alguna herramienta requerida o es propiedad de otro
  complemento
- cada ruta invocable puede apuntar solo a una herramienta nombrada en `requiredToolNames`

Esto evita que otro complemento exponga un espacio de nombres registrando una
herramienta con el mismo nombre. También mantiene los espacios de nombres alineados con la política habitual del agente:
si la ejecución no puede ver las herramientas de respaldo, no puede ver el espacio de nombres.

Por ejemplo, un espacio de nombres de GitHub debería residir detrás de una extensión propiedad de GitHub que
sea propietaria de la autenticación de GitHub, clientes REST o GraphQL, límites de velocidad, aprobaciones de escritura y
pruebas. El modo de código central no debería incrustar APIs específicas de GitHub, manejo de tokens o
políticas de proveedor.

### Reglas de serialización del ámbito

`createScope(ctx)` puede devolver un objeto plano que contiene valores compatibles con JSON,
matrices, objetos anidados y marcadores de llamadas `createCodeModeNamespaceTool(...)`.
Los objetos del host nunca entran directamente en QuickJS.

El serializador rechaza:

- funciones sin procesar
- gráficos de objetos circulares
- segmentos de ruta no seguros: `__proto__`, `constructor`, `prototype`, claves vacías o
  claves que contienen el separador de ruta interno
- valores `globalName` que no son identificadores de JavaScript
- colisiones `globalName` con globales incorporados del modo de código tales como `tools`,
  `namespaces`, `text`, `json`, `yield_control` o `__openclaw*`

Los valores que no se pueden serializar en JSON se convierten a valores alternativos seguros para JSON
antes de cruzar el puente. Los datos binarios, manejadores, sockets, clientes e
instancias de clase deben permanecer detrás de las herramientas de catálogo ordinarias.

### Solicitudes

El espacio de nombres `description` y opcional `prompt` se añaden al esquema `exec` visible para el modelo solo cuando el espacio de nombres es visible para esa ejecución. Úsalos para enseñar la superficie útil más pequeña:

```typescript
{
  description: "Fiction production service helpers.",
  prompt:
    "Use Fictions.riskAudit(), Fictions.promoteIfReady(id, status), and Fictions.unpaidOver(amount).",
}
```

Mantén los prompts sobre el contrato del espacio de nombres, no sobre la configuración de autenticación, el historial de implementación o el comportamiento de complementos no relacionados.

### Limpieza

Los espacios de nombres son registros locales al proceso. Elimínalos cuando el complemento propietario esté deshabilitado, desinstalado o revertido:

```typescript
clearCodeModeNamespacesForPlugin(pluginId);
```

Usa `unregisterCodeModeNamespace(namespaceId)` solo cuando se elimine un espacio de nombres conocido. Las pruebas pueden llamar `clearCodeModeNamespacesForTest()` para evitar fugas de registros entre casos.

### Lista de comprobación de pruebas

Los cambios en los espacios de nombres deben cubrir el límite de seguridad y el comportamiento del huésped:

- el texto del prompt del espacio de nombres aparece solo cuando las herramientas de respaldo son visibles
- las herramientas con el mismo nombre de otro `sourceName` no exponen el espacio de nombres
- las funciones de ámbito sin procesar (raw scope) son rechazadas
- los ids de espacios de nombres falsificados y las rutas falsificadas son rechazadas
- las rutas invocables no pueden apuntar a herramientas no declaradas
- los objetos anidados y las referencias compartidas se serializan correctamente
- las llamadas al espacio de nombres se ejecutan a través de las herramientas del catálogo y devuelven detalles seguros para JSON
- los fallos pueden ser capturados por el código del huésped
- las llamadas al espacio de nombres suspendidas se reanudan a través de `wait`
- la reversión del complemento borra los registros de espacios de nombres propietarios

Los espacios de nombres complementan el catálogo genérico `tools.search` / `tools.call`. Usa el catálogo para herramientas habilitadas arbitrarias de OpenClaw, complementos y clientes; usa `MCP` para herramientas MCP; usa otros espacios de nombres para APIs de dominio documentadas y propiedad de complementos, donde el código conciso es más confiable que las búsquedas repetidas de esquemas.

## API de salida

`text(value)` añade salida legible por humanos al arreglo `output`.

`json(value)` añade un elemento de salida estructurada después de la serialización compatible con JSON.

El valor final devuelto por el código del huésped se convierte en `value` en un resultado `completed`.

Elemento de salida:

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

Reglas de salida:

- el orden de salida coincide con las llamadas del huésped
- la salida está limitada por `maxOutputBytes`
- los valores no serializables se convierten en cadenas simples o errores
- los valores binarios no son compatibles con la v1
- las imágenes y los archivos se transfieren a través de las herramientas ordinarias de OpenClaw, no a través del
  puente del modo de código

## Catálogo de herramientas

El catálogo oculto incluye herramientas después del filtrado efectivo de políticas:

1. Herramientas principales de OpenClaw.
2. Herramientas de complementos incluidos.
3. Herramientas de complementos externos.
4. Herramientas MCP.
5. Herramientas proporcionadas por el cliente para la ejecución actual.

Los ids del catálogo son estables dentro de una ejecución y deterministas en conjuntos de herramientas equivalentes
cuando es posible.

Forma de id recomendada:

```text
<source>:<owner>:<tool-name>
```

Ejemplos:

```text
openclaw:core:message
plugin:browser:browser_request
mcp:github:create_issue
client:app:select_file
```

El catálogo omite las herramientas de control del modo de código:

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

Esto evita la recursión y mantiene el contrato orientado al modelo limitado.

Las entradas de MCP permanecen en el catálogo con alcance de ejecución para que las políticas, aprobaciones, enlaces,
telemetría, proyección de transcripciones y los ids exactos de las herramientas se sigan compartiendo con la ejecución normal
de herramientas. Las vistas `ALL_TOOLS`, `tools.search(...)`,
`tools.describe(...)` y `tools.call(...)` orientadas al invitado omiten las entradas de MCP. El
espacio de nombres `MCP.<server>.<tool>({ ...input })` generado resuelve de vuelta al
id exacto del catálogo y luego se despacha a través de la misma ruta del ejecutor.

## Interacción con la búsqueda de herramientas

El modo de código reemplaza la superficie del modelo de búsqueda de herramientas de OpenClaw para las ejecuciones en las que está
activo.

Cuando `tools.codeMode.enabled` es verdadero y se activa el modo de código:

- OpenClaw no expone `tool_search_code`, `tool_search`, `tool_describe`
  ni `tool_call` como herramientas visibles para el modelo.
- La misma idea de catalogación se mueve dentro del tiempo de ejecución del invitado.
- El tiempo de ejecución del invitado recibe metadatos compactos de `ALL_TOOLS` y auxiliares de búsqueda, descripción
  y llamadas para herramientas que no son de MCP.
- Las llamadas MCP utilizan el espacio de nombres `MCP` generado y sus encabezados `$api()` en lugar
  de `tools.call(...)`.
- Las llamadas anidadas se despachan a través de la misma ruta del ejecutor de OpenClaw que utiliza
  la búsqueda de herramientas.

La página existente [Tool Search](/es/tools/tool-search) describe el puente de catálogo compacto de OpenClaw. Code mode es la alternativa genérica de OpenClaw para ejecuciones que pueden usar `exec` y `wait`.

## Nombres de herramientas y colisiones

La herramienta `exec` visible para el modelo es la herramienta de modo de código. Si la herramienta de shell normal de OpenClaw `exec` está habilitada, se oculta del modelo y se cataloga como cualquier otra herramienta.

Dentro del tiempo de ejecución invitado:

- `tools.call("openclaw:core:exec", input)` puede llamar a la herramienta de ejecución de shell si la política lo permite.
- `tools.exec(...)` se instala solo si la entrada del catálogo de ejecución de shell tiene un nombre seguro inequívoco.
- la herramienta `exec` de modo de código nunca está disponible recursivamente a través de `tools`.

Si dos herramientas se normalizan al mismo nombre seguro de conveniencia, OpenClaw omite la función de conveniencia y requiere `tools.call(id, input)`.

## Ejecución anidada de herramientas

Cada llamada anidada a una herramienta cruza el puente del host y vuelve a entrar en OpenClaw.

La ejecución anidada preserva:

- id del agente activo
- id de sesión y clave de sesión
- contexto de remitente y canal
- política de espacio aislado (sandbox)
- política de aprobación
- ganchos `before_tool_call` del complemento
- señal de aborto
- actualizaciones de streaming cuando están disponibles
- eventos de trayectoria y auditoría

Las llamadas anidadas se proyectan en la transcripción como llamadas a herramientas reales, de modo que los paquetes de soporte pueden mostrar lo que sucedió. La proyección identifica la llamada a la herramienta de modo de código principal y el id de la herramienta anidada.

Se permiten llamadas anidadas paralelas hasta `maxPendingToolCalls`.

## Estado de tiempo de ejecución

Cada ejecución en modo de código tiene una máquina de estados:

- `running`: La VM se está ejecutando o las llamadas anidadas están en curso.
- `waiting`: Existe una instantánea de la VM y se puede reanudar con `wait`.
- `completed`: se devolvió el valor final; instantánea eliminada.
- `failed`: se devolvió un error; instantánea eliminada.
- `expired`: la instantánea o el estado pendiente excedieron la retención; no se puede reanudar.
- `aborted`: ejecución/sesión principal cancelada; instantánea eliminada.

El estado tiene ámbito por ejecución del agente, sesión e id de llamada de herramienta. Una llamada `wait` de una
ejecución o sesión diferente falla.

El almacenamiento de instantáneas está limitado:

- bytes máximos de instantánea por ejecución
- instantáneas en vivo máximas por proceso
- TTL de la instantánea
- limpieza al finalizar la ejecución
- limpieza al apagar el Gateway cuando no se admite persistencia

## Tiempo de ejecución QuickJS-WASI

OpenClaw carga `quickjs-wasi` como una dependencia directa en el paquete propietario. El
tiempo de ejecución no se basa en una copia transitiva instalada para proxy, PAC u otras
dependencias no relacionadas.

Responsabilidades del tiempo de ejecución:

- compilar o cargar el módulo WebAssembly QuickJS-WASI
- crear una VM aislada por cada ejecución o reanudación en modo código
- registrar devoluciones de llamada del host mediante nombres estables
- establecer límites de memoria e interrupción
- evaluar JavaScript
- drenar trabajos pendientes
- instantánea del estado de la VM suspendida
- restaurar instantáneas para `wait`
- eliminar identificadores de VM e instantáneas después de los estados terminales

El tiempo de ejecución se ejecuta fuera del bucle de eventos principal de OpenClaw en un trabajador. Un bucle
infinito del invitado no debe bloquear el proceso del Gateway indefinidamente.

## TypeScript

La compatibilidad con TypeScript es solo una transformación de origen:

- entrada aceptada: una cadena de código TypeScript
- salida: cadena de JavaScript evaluada por QuickJS-WASI
- sin verificación de tipos
- sin resolución de módulos
- sin `import` ni `require` en v1
- los diagnósticos se devuelven como resultados `failed`

El compilador de TypeScript se carga de manera diferida solo para celdas TypeScript. Las
celdas de JavaScript simple y el modo de código deshabilitado no cargan el compilador.

La transformación debe conservar números de línea útiles cuando sea factible.

## Límite de seguridad

El código del modelo es hostil. El tiempo de ejecución utiliza defensa en profundidad:

- ejecutar QuickJS-WASI fuera del bucle de eventos principal
- cargar `quickjs-wasi` como una dependencia directa, no a través de Codex o un paquete
  transitivo
- sin sistema de archivos, red, subproceso, importación de módulos, variables de entorno u
  objetos globales del host en el invitado
- usar límites de memoria e interrupción de QuickJS
- hacer cumplir el tiempo de espera de reloj del proceso principal
- hacer cumplir límites de salida, instantánea, registro y llamadas pendientes
- serializar los valores del puente del host a través de un adaptador JSON estrecho
- convertir los errores del host en errores simples del invitado, nunca en objetos del reino del host
- eliminar instantáneas en tiempo de espera, cancelación, fin de sesión o expiración
- rechazar acceso recursivo a `exec`, `wait` y herramientas de control de búsqueda de herramientas
- evitar que las colisiones de nombres convenientes oculten los asistentes del catálogo

El sandbox es una capa de seguridad. Los operadores aún pueden necesitar endurecimiento a nivel de sistema operativo
para implementaciones de alto riesgo.

## Códigos de error

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

Los errores devueltos al huésped son datos planos. Las instancias de `Error` del host, objetos
de pila, prototipos y funciones del host no cruzan hacia QuickJS.

## Telemetría

El modo de código informa:

- nombres de herramientas visibles enviados al modelo
- tamaño del catálogo oculto y desglose de fuentes
- recuentos de `exec` y `wait`
- recuentos de búsqueda anidada, descripción y llamadas
- ids de herramientas anidadas llamadas
- fallos de tiempo de espera, memoria, instantánea y límite de salida
- eventos del ciclo de vida de la instantánea

La telemetría no debe incluir secretos, valores de entorno sin procesar o entradas de herramienta
sin redactar más allá de la política de trayectoria existente de OpenClaw.

## Depuración

Utilice el registro de transporte del modelo dirigido cuando el modo de código se comporte de manera diferente a una
ejecución de herramienta normal:

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

Para la depuración de la forma del payload, use `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`.
Esto registra una instantánea JSON limitada y redactada de la solicitud del modelo; solo debe
usarse durante la depuración porque los prompts y el texto de los mensajes aún pueden aparecer.

Para la depuración de secuencias, use `OPENCLAW_DEBUG_SSE=peek` para registrar los primeros cinco
eventos SSE redactados. El modo de código también falla de forma cerrada si el payload final del proveedor
no contiene exactamente `exec` y `wait` después de que la superficie del modo de código ha
se activado.

## Diseño de la implementación

Unidades de implementación:

- contrato de configuración: `tools.codeMode`
- generador de catálogo: herramientas efectivas para entradas compactas y mapa de ids
- adaptador de superficie del modelo: reemplazar herramientas visibles con `exec` y `wait`
- adaptador de tiempo de ejecución QuickJS-WASI: cargar, evaluar, instantánea, restaurar, eliminar
- supervisor de trabajo: tiempo de espera, cancelación, aislamiento de fallos
- adaptador de puente: devoluciones de llamada del host seguras para JSON y entrega de resultados
- adaptador de transformación TypeScript
- almacén de instantáneas: TTL, límites de tamaño, alcance de ejecución/sesión
- proyección de trayectoria para llamadas a herramientas anidadas
- contadores de telemetría y diagnósticos

La implementación reutiliza los conceptos de catálogo y ejecutor de Tool Search, pero
no utiliza el elemento secundario `node:vm` como el espacio aislado (sandbox).

## Lista de verificación de validación

La cobertura del modo de código debe demostrar:

- la configuración deshabilitada deja la exposición de herramientas existente sin cambios
- la configuración de objeto sin `enabled: true` deja el modo de código deshabilitado
- la configuración habilitada expone solo `exec` y `wait` al modelo cuando las herramientas están
  activas para la ejecución
- las ejecuciones sin herramientas en bruto, `disableTools`, y las listas de permitidos vacías no activan la aplicación del
  payload del modo de código
- todas las herramientas efectivas que no son de MCP aparecen en `ALL_TOOLS`
- las herramientas denegadas no aparecen en `ALL_TOOLS`
- `tools.search`, `tools.describe` y `tools.call` funcionan para herramientas de OpenClaw
- `API.list("mcp")` y `API.read("mcp/<server>.d.ts")` exponen declaraciones MCP
  de estilo TypeScript sin un puente/llamada a herramienta
- el espacio de nombres MCP `$api()` permanece disponible como alternativa en línea para los esquemas
- las llamadas al espacio de nombres MCP funcionan para herramientas MCP visibles con una entrada de objeto, mientras
  que las entradas directas del catálogo MCP están ausentes de `tools.*`
- Las herramientas de control de Tool Search están ocultas tanto de la superficie del modelo como del catálogo oculto
- las llamadas anidadas conservan el comportamiento de aprobación y enlace (hook)
- el shell `exec` está oculto para el modelo pero se puede llamar mediante el ID del catálogo cuando se permite
- el modo de código recursivo `exec` y `wait` no se pueden llamar desde el código huésped
- la entrada de TypeScript se transforma y evalúa sin cargar TypeScript en
  rutas deshabilitadas o solo de JavaScript
- `import`, `require`, el sistema de archivos, la red y el acceso al entorno fallan
- los bucles infinitos expiran y no pueden bloquear el Gateway
- los fallos de límite de memoria terminan la VM huésped
- se aplican los límites de salida e instantáneas para llamadas completadas y suspendidas
- `wait` reanuda una instantánea suspendida y devuelve el valor final
- los valores caducados, abortados, de sesión incorrecta y desconocidos de `runId` fallan
- la repetición de la transcripción y la persistencia preservan las llamadas de control del modo de código
- la transcripción y la telemetría muestran claramente las llamadas a herramientas anidadas

## Plan de pruebas de extremo a extremo

Ejecute estas como pruebas de integración o de extremo a extremo al cambiar el tiempo de ejecución:

1. Inicie una Gateway con `tools.codeMode.enabled: false`.
2. Envíe un turno de agente con un conjunto de herramientas directo pequeño.
3. Asegure que las herramientas visibles para el modelo no hayan cambiado.
4. Reinicie con `tools.codeMode.enabled: true`.
5. Envíe un turno de agente con herramientas de prueba de OpenClaw, complemento, MCP y cliente.
6. Asegure que la lista de herramientas visible para el modelo sea exactamente `exec`, `wait`.
7. En `exec`, lea `ALL_TOOLS` y asegure que las herramientas de prueba efectivas estén presentes.
8. En `exec`, llame a las herramientas de OpenClaw/complemento/cliente a través de `tools.search`,
   `tools.describe` y `tools.call`.
9. En `exec`, llame a `API.list("mcp")` y `API.read("mcp/<server>.d.ts")` y
   asegure que los archivos de declaración describen las herramientas MCP visibles.
10. En `exec`, llame a las herramientas MCP a través de `MCP.<server>.<tool>({ ...input })` y
    asegure que las entradas directas del catálogo MCP estén ausentes de `ALL_TOOLS` y `tools.*`.
11. Asegure que las herramientas denegadas estén ausentes y no puedan ser llamadas por un ID adivinado.
12. Inicie una llamada a herramienta anidada que se resuelva después de que `exec` devuelva `waiting`.
13. Llame a `wait` y asegure que la VM restaurada reciba el resultado de la herramienta.
14. Asegure que la respuesta final contenga la salida producida después de la restauración.
15. Asegure que el tiempo de espera, la interrupción y la caducidad de la instantánea limpien el estado del tiempo de ejecución.
16. Exporte la trayectoria y asegure que las llamadas anidadas sean visibles bajo la llamada
    principal del modo de código.

Los cambios solo de documentación en esta página aún deben ejecutar `pnpm check:docs`.

## Relacionado

- [Búsqueda de herramientas](/es/tools/tool-search)
- [Tiempos de ejecución del agente](/es/concepts/agent-runtimes)
- [Herramienta Exec](/es/tools/exec)
- [Ejecución de código](/es/tools/code-execution)
