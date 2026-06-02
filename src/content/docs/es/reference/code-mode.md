---
summary: "Modo de código de OpenClaw: una superficie de herramienta exec/wait opcional respaldada por QuickJS-WASI y un catálogo de herramientas con ámbito de ejecución oculto"
title: "Modo de código"
sidebarTitle: "Modo de código"
read_when:
  - You want to enable OpenClaw code mode for an agent run
  - You need to explain why code mode is different from Codex Code mode
  - You are reviewing the exec/wait contract, QuickJS-WASI sandbox, TypeScript transform, or hidden tool-catalog bridge
  - You are adding or reviewing an internal code-mode namespace registry integration
---

El modo de código es una característica experimental del tiempo de ejecución del agente OpenClaw. Está desactivado por
defecto. Cuando lo activas, OpenClaw cambia lo que el modelo ve en una ejecución:
en lugar de exponer directamente el esquema de cada herramienta habilitada, el modelo ve solo
`exec` y `wait`.

Esta página documenta el modo de código de OpenClaw. No es el modo de código de Codex. Las dos
características comparten un nombre, pero están implementadas por diferentes tiempos de ejecución y exponen
diferentes `exec` contratos:

- El modo de código de Codex está habilitado para los subprocesos del servidor de aplicaciones de Codex a menos que una
  política de herramientas restringida desactive el modo de código nativo. Se ejecuta en el arnés de codificación de Codex,
  donde el modelo escribe comandos de shell a través de un contrato `exec.command`.
- El modo de código de OpenClaw está desactivado a menos que `tools.codeMode.enabled: true` esté
  configurado. Se ejecuta en el tiempo de ejecución del agente genérico de OpenClaw, donde el modelo
  escribe programas JavaScript o TypeScript a través de un contrato `exec.code`.

El modo de código de Codex y la búsqueda dinámica de herramientas nativa de Codex son superficies estables del arnés de Codex.
El modo de código de OpenClaw es un adaptador de superficie de herramienta experimental propiedad de OpenClaw
para ejecuciones genéricas de OpenClaw. Utiliza `quickjs-wasi`, un catálogo de herramientas oculto de OpenClaw
y el ejecutor de herramientas normal de OpenClaw.

## ¿Qué es esto?

El modo de código de OpenClaw permite que el modelo escriba un pequeño programa de JavaScript o TypeScript en lugar de elegir directamente de una larga lista de herramientas.

Cuando el modo de código está activo:

- La lista de herramientas visible para el modelo es exactamente `exec` y `wait`.
- `exec` evalúa JavaScript o TypeScript generado por el modelo en un
  trabajador QuickJS-WASI restringido.
- Las herramientas normales de OpenClaw están ocultas para el prompt del modelo y se exponen dentro del
  programa huésped a través de `ALL_TOOLS` y `tools`.
- El código invitado puede buscar el catálogo oculto, describir una herramienta y llamar a una herramienta a través de la misma ruta de ejecución de OpenClaw utilizada por los turnos normales del agente.
- `wait` reanuda una ejecución en modo de código suspendida cuando las llamadas a herramientas anidadas todavía están
  pendientes.

La distinción importante: el modo de código cambia la superficie de orquestación orientada al modelo. No reemplaza las herramientas de OpenClaw, las herramientas de complementos, las herramientas MCP, la autenticación, la política de aprobación, el comportamiento del canal o la selección del modelo.

## ¿Por qué esto es bueno?

El modo de código hace que los catálogos de herramientas grandes sean más fáciles de usar para los modelos.

- Superficie de prompt más pequeña: los proveedores reciben dos herramientas de control en lugar de docenas o cientos de esquemas de herramientas completos.
- Mejor orquestación: el modelo puede usar bucles, uniones, pequeñas transformaciones, lógica condicional y llamadas a herramientas anidadas en paralelo dentro de una sola celda de código.
- Neutral respecto al proveedor: funciona para herramientas de OpenClaw, complementos, MCP y clientes sin depender de la ejecución de código nativa del proveedor.
- Las políticas existentes siguen vigentes: las llamadas anidadas a herramientas aún pasan por las políticas, aprobaciones, enlaces, contexto de sesión y rutas de auditoría de OpenClaw.
- Modo de fallo claro: cuando el modo de código está explícitamente habilitado y el tiempo de ejecución no está disponible, OpenClaw falla de forma segura (cerrada) en lugar de recurrir a una exposición directa amplia de herramientas.

El modo de código es especialmente útil para agentes con un catálogo de herramientas habilitadas grande o para flujos de trabajo donde el modelo necesita repetidamente buscar, combinar y llamar herramientas antes de producir una respuesta.

## Cómo habilitarlo

Agrega `tools.codeMode.enabled: true` a la configuración del agente o del tiempo de ejecución:

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

El modo de código permanece desactivado cuando se omite `tools.codeMode`, es `false` o un objeto sin `enabled: true`.

Use límites explícitos cuando desee restricciones más estrictas:

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

Para confirmar la forma del payload del modelo mientras depura, ejecute el Gateway con registro dirigido:

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

Con el modo de código activo, los nombres de herramientas registrados orientados al modelo deben ser `exec` y `wait`. Si necesitas la carga del proveedor redactada, añade `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` para una breve sesión de depuración.

## Tour técnico

El resto de esta página describe el contrato de tiempo de ejecución y los detalles de implementación. Está destinado a mantenedores, autores de complementos que depuran la exposición de herramientas y operadores que validan implementaciones de alto riesgo.

## Estado del tiempo de ejecución

- Tiempo de ejecución: [`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi).
- Estado predeterminado: deshabilitado.
- Estabilidad: superficie experimental de OpenClaw; el modo de código de Codex es una superficie separada y estable del arnés de Codex.
- Superficie objetivo: ejecuciones de agentes genéricos de OpenClaw.
- Postura de seguridad: el código del modelo es hostil.
- Promesa para el usuario: habilitar el modo de código nunca recurre silenciosamente a una exposición directa amplia de herramientas.

## Alcance

El modo de código es el propietario de la forma de orquestación orientada al modelo para una ejecución preparada. No es propietario de la selección del modelo, el comportamiento del canal, la autenticación, la política de herramientas ni las implementaciones de herramientas.

Dentro del alcance:

- definiciones de herramientas `exec` y `wait` visibles para el modelo
- construcción del catálogo de herramientas ocultas
- ejecución de invitados JavaScript y TypeScript
- tiempo de ejecución del trabajador QuickJS-WASI
- devoluciones de llamada del host para búsqueda de catálogo, descripción de esquema y llamada a herramienta
- estado reanudable para programas invitados suspendidos
- límites de salida, tiempo de espera, memoria, llamadas pendientes y instantáneas
- telemetría y proyección de trayectoria para llamadas a herramientas anidadas

Fuera del alcance:

- ejecución de código remoto nativa del proveedor
- semántica de ejecución de shell
- cambio de la autorización de herramientas existentes
- scripts persistentes creados por el usuario
- acceso al administrador de paquetes, archivos, red o módulos en el código invitado
- reutilización directa de los internos del modo de código Codex

Las herramientas propiedad del proveedor, como los entornos de prueba (sandboxes) de Python remotos, siguen siendo herramientas separadas. Consulte [Code execution](/es/tools/code-execution).

## Términos

**Code mode** es el modo de tiempo de ejecución de OpenClaw que oculta las herramientas normales del modelo y expone solo `exec` y `wait`.

**Tiempo de ejecución invitado** es la máquina virtual JavaScript QuickJS-WASI que evalúa el código del modelo.

**Puente anfitrión** es la superficie de devolución de llamada compatible con JSON y estrecha desde el código invitado
de vuelta a OpenClaw.

**Catálogo** es la lista de herramientas efectivas con alcance de ejecución después de la política de herramientas normal,
plugin, MCP y resolución de herramientas de cliente.

**Llamada a herramienta anidada** es una llamada a herramienta realizada desde el código invitado a través del puente anfitrión.

**Snapshot** es el estado serializado de la máquina virtual QuickJS-WASI guardado para que `wait` pueda continuar una ejecución en modo de código suspendida.

## Configuración

`tools.codeMode.enabled` es el puerto de activación. Establecer otros campos del modo de código no habilita la función.

Campos admitidos:

- `enabled`: booleano. Valor predeterminado `false`. Habilita el modo de código solo cuando `true`.
- `runtime`: `"quickjs-wasi"`. Tiempo de ejecución compatible.
- `mode`: `"only"`. Expone `exec` y `wait`, oculta las herramientas normales del modelo.
- `languages`: matriz de `"javascript"` y `"typescript"`. El valor predeterminado incluye ambas.
- `timeoutMs`: límite de tiempo de reloj para un `exec` o `wait`. Valor predeterminado `10000`. Límite del tiempo de ejecución: de `100` a `60000`.
- `memoryLimitBytes`: límite del montón de QuickJS. Valor predeterminado `67108864`. Límite del tiempo de ejecución: de `1048576` a `1073741824`.
- `maxOutputBytes`: límite para el texto, JSON y registros devueltos. Predeterminado `65536`.
  Restricción de tiempo de ejecución: `1024` a `10485760`.
- `maxSnapshotBytes`: límite para las instantáneas de VM serializadas. Predeterminado `10485760`.
  Restricción de tiempo de ejecución: `1024` a `268435456`.
- `maxPendingToolCalls`: límite para llamadas a herramientas anidadas simultáneas. Predeterminado `16`.
  Restricción de tiempo de ejecución: `1` a `128`.
- `snapshotTtlSeconds`: cuánto tiempo se puede reanudar una VM suspendida. Predeterminado `900`.
  Restricción de tiempo de ejecución: `1` a `86400`.
- `searchDefaultLimit`: recuento de resultados de búsqueda de catálogo oculto predeterminado. Predeterminado `8`.
  El tiempo de ejecución lo restringe a `maxSearchLimit`.
- `maxSearchLimit`: recuento máximo de resultados de búsqueda de catálogo oculto. Predeterminado `50`.
  Restricción de tiempo de ejecución: `1` a `50`.

Si el modo de código está habilitado pero QuickJS-WASI no puede cargarse, OpenClaw falla de forma cerrada para esa ejecución. No expone silenciosamente las herramientas normales como alternativa.

## Activación

El modo de código se evalúa después de que se conoce la política de herramientas efectiva y antes de que se ensamble la solicitud final del modelo.

Orden de activación:

1. Resolver el agente, el modelo, el proveedor, el sandbox, el canal, el remitente y la política de ejecución.
2. Construir la lista efectiva de herramientas de OpenClaw.
3. Añadir herramientas de complementos, MCP y cliente elegibles.
4. Aplicar la política de permitir y denegar.
5. Si `tools.codeMode.enabled` es falso, continúe con la exposición normal de herramientas.
6. Si está habilitado y las herramientas están activas para la ejecución, registrar las herramientas efectivas en el catálogo de modo de código.
7. Eliminar todas las herramientas normales de la lista de herramientas visibles para el modelo.
8. Agregue `exec` y `wait` en modo código.

Las ejecuciones que intencionalmente no tienen herramientas, como las llamadas directas al modelo, `disableTools`,
o una lista de permitidos vacía, no activan la superficie del modo código incluso si la configuración
contiene `tools.codeMode.enabled: true`.

El catálogo de modo de código tiene el ámbito de la ejecución. No debe filtrar herramientas de otro agente, sesión, remitente o ejecución.

## Herramientas visibles para el modelo

Cuando el modo de código está activo, el modelo ve exactamente estas herramientas de nivel superior:

- `exec`
- `wait`

Todas las demás herramientas habilitadas se ocultan de la lista de herramientas orientadas al modelo y se registran en el catálogo de modo de código.

El modelo debe usar `exec` para la orquestación de herramientas, unión de datos, bucles,
llamadas anidadas en paralelo y transformaciones estructuradas. El modelo debe usar
`wait` solo cuando `exec` devuelve un resultado reanudable `waiting`.

## `exec`

`exec` inicia una celda en modo código y devuelve un resultado. El código de entrada es generado
por el modelo y debe tratarse como hostil.

Entrada:

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

Reglas de entrada:

- Uno de `code` o `command` debe ser no vacío.
- `code` es el campo documentado orientado al modelo.
- `command` se acepta como un alias compatible con exec para las políticas de enlace y
  reescrituras de confianza; cuando ambos están presentes, los valores deben coincidir.
- Los eventos de enlace de `exec` del modo de código externo incluyen `toolKind: "code_mode_exec"` y
  incluyen `toolInputKind: "javascript" | "typescript"` cuando se conoce el idioma de entrada,
  por lo que las políticas pueden distinguir las celdas del modo de código de las llamadas de `exec`
  estilo shell que comparten el mismo nombre de herramienta.
- `language` tiene como valor predeterminado `"javascript"`.
- Si `language` es `"typescript"`, OpenClaw transpila antes de la evaluación.
- `exec` rechaza `import`, `require`, importación dinámica y patrones de cargador de módulos
  en v1.
- `exec` no expone la implementación normal de `exec` de shell de forma recursiva.

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

`exec` devuelve `waiting` cuando la VM de QuickJS se suspende con un estado resumible. El
resultado incluye un `runId` para `wait`.

`exec` devuelve `completed` solo cuando la VM huésped no tiene trabajo pendiente y el
valor final es compatible con JSON después de que se ejecuta el adaptador de salida de OpenClaw.

## `wait`

`wait` continúa una VM de modo de código suspendida.

Entrada:

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

La salida es la misma unión `CodeModeResult` devuelta por `exec`.

`wait` existe porque las herramientas anidadas de OpenClaw pueden ser lentas, interactivas, con puerta de aprobación
o transmitir actualizaciones parciales. El modelo no debería necesitar mantener una llamada larga de
`exec` abierta mientras el host espera trabajo externo.

La instantánea y restauración de QuickJS-WASI es el mecanismo de reanudación v1:

1. `exec` evalúa el código hasta su finalización, fallo o suspensión.
2. En la suspensión, OpenClaw toma una instantánea de la VM QuickJS y registra el trabajo
   pendiente del host.
3. Cuando el trabajo pendiente se resuelve, `wait` restaura la instantánea de la VM.
4. OpenClaw vuelve a registrar las devoluciones de llamada del host mediante nombres estables.
5. OpenClaw entrega los resultados de herramientas anidadas en la VM restaurada.
6. OpenClaw drena los trabajos pendientes de QuickJS.
7. `wait` devuelve `completed`, `failed` u otro resultado `waiting`.

Las instantáneas son el estado de tiempo de ejecución, no artefactos de usuario. Tienen un límite de tamaño, caducan
y están limitadas a la ejecución y sesión que las crearon.

`wait` falla cuando:

- `runId` es desconocido.
- la instantánea caducó.
- la ejecución o sesión principal se abortó.
- el llamador no está en el mismo ámbito de ejecución/sesión.
- La restauración de QuickJS-WASI falla.
- la restauración excedería los límites configurados.

## API del runtime invitado

El runtime invitado expone una API global pequeña:

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;
declare const namespaces: Record<string, unknown>;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` son metadatos compactos para el catálogo con ámbito de ejecución. No contiene
esquemas completos de manera predeterminada.

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

El esquema completo solo se carga bajo demanda:

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

Las funciones de herramientas de conveniencia se instalan solo para nombres seguros inequívocos:

```typescript
const files = await tools.search("read local file");
const fileRead = await tools.describe(files[0].id);
const content = await tools.call(fileRead.id, { path: "README.md" });

// If the hidden catalog has an unambiguous `web_search` entry:
const hits = await tools.web_search({ query: "OpenClaw code mode" });
```

El runtime invitado no debe exponer objetos del host directamente. Las entradas y salidas cruzan el puente como valores compatibles con JSON con límites de tamaño explícitos.

## Espacios de nombres internos

Los espacios de nombres internos proporcionan a code mode una API de dominio concisa sin añadir más
herramientas visibles para el modelo. Una integración propiedad del cargador puede registrar un espacio de nombres como
`Issues`, `Fictions` o `Calendar`; el código invitado luego llama a ese espacio de nombres
dentro del programa QuickJS mientras OpenClaw aún muestra solo `exec` y `wait` a
el modelo.

Los espacios de nombres son internos por ahora. No hay una API pública de espacio de nombres del SDK de complementos:
los espacios de nombres de complementos externos necesitan un contrato propiedad del cargador para que la identidad del complemento,
manifiestos instalados, estado de autenticación y descriptores de catálogo en caché no puedan derivarse
de las herramientas del complemento que respaldan el espacio de nombres. El modo de código central solo posee el
sandbox, la serialización, el control del catálogo y el despacho del puente.

El código invitado puede usar entonces el global directo o el mapa `namespaces`:

```javascript
const open = await Issues.list({ state: "open" });
const alsoOpen = await namespaces.Issues.list({ state: "open" });
return { count: open.length, alsoCount: alsoOpen.length };
```

### Ciclo de vida del registro

El registro de espacios de nombres es local al proceso y clave por id de espacio de nombres. Una ejecución
típica sigue esta ruta:

1. Un cargador confiable llama a `registerCodeModeNamespaceForPlugin(pluginId, registration)`.
2. El modo de código crea el `ToolSearchRuntime` oculto para la ejecución y lee su
   catálogo con ámbito de ejecución.
3. `createCodeModeNamespaceRuntime(ctx, catalog)` mantiene solo los registros
   cuyos `requiredToolNames` son todos visibles y propiedad del mismo `pluginId`.
4. Cada espacio de nombres visible llama a `createScope(ctx)` para la ejecución actual. El
   ámbito recibe contexto de ejecución como `agentId`, `sessionKey`, `sessionId`,
   `runId`, configuración y estado de aborto.
5. Los datos del ámbito se serializan en un descriptor simple y se inyectan en QuickJS como
   globales directos y `namespaces.<globalName>`.
6. Las llamadas de invitado se suspenden a través del puente del trabajador, resuelven la ruta del espacio de nombres en el host, asignan la llamada a una herramienta de catálogo propiedad de un complemento declarado y ejecutan esa herramienta a través de `ToolSearchRuntime.call`.
7. `wait` reanuda el mismo tiempo de ejecución del espacio de nombres cuando una ejecución en modo de código se suspendió en el trabajo de una herramienta anidada.
8. La reversión o desinstalación del complemento llama a `clearCodeModeNamespacesForPlugin(pluginId)`
   para que las globales obsoletas no sobrevivan a una carga fallida del complemento.

El invariante importante: las llamadas de espacio de nombres son llamadas a herramientas de catálogo. Utilizan los mismos enlaces de políticas, aprobaciones, manejo de abortos, telemetría, proyección de transcripción y comportamiento de suspensión/reanudación que `tools.call(...)`.

### Forma de registro

Registre espacios de nombres desde la integración que posee las herramientas de respaldo. Mantenga el alcance pequeño y solo exponga verbos de dominio que se asignen a herramientas de catálogo declaradas.

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

`createCodeModeNamespaceTool(toolName, inputMapper)` marca un miembro del alcance como una función de espacio de nombres invocable. El `inputMapper` opcional recibe los argumentos del invitado y devuelve el objeto de entrada para la herramienta de catálogo de respaldo. Sin un mapeador de entrada, se usa el primer argumento del invitado, o `{}` cuando se omite.

Las funciones de host sin procesar se rechazan antes de que se ejecute el código del invitado:

```typescript
createScope: () => ({
  // Wrong: this bypasses the catalog tool lifecycle and will be rejected.
  list: async () => githubClient.listIssues(),
});
```

### Propiedad y visibilidad

La propiedad del espacio de nombres está vinculada a `pluginId` del solicitante de registro.
`requiredToolNames` es tanto una puerta de visibilidad como una verificación de propiedad:

- cada herramienta requerida debe existir en el catálogo de ejecución
- cada herramienta requerida debe tener `sourceName === pluginId`
- el espacio de nombres está oculto cuando falta alguna herramienta requerida o es propiedad de otro
  complemento
- cada ruta invocable puede apuntar solo a una herramienta nombrada en `requiredToolNames`

Esto evita que otro complemento exponga un espacio de nombres registrando una herramienta con el mismo nombre. También mantiene los espacios de nombres alineados con la política ordinaria del agente: si la ejecución no puede ver las herramientas de respaldo, no puede ver el espacio de nombres.

Por ejemplo, un espacio de nombres de GitHub debería vivir detrás de una extensión propiedad de GitHub que posea la autenticación de GitHub, los clientes REST o GraphQL, los límites de velocidad, las aprobaciones de escritura y las pruebas. El modo de código central no debería incrustar API específicas de GitHub, manejo de tokens o políticas del proveedor.

### Reglas de serialización del alcance

`createScope(ctx)` puede devolver un objeto plano que contenga valores compatibles con JSON,
matrices, objetos anidados y marcadores de llamadas `createCodeModeNamespaceTool(...)`.
Los objetos del host nunca entran directamente en QuickJS.

El serializador rechaza:

- funciones sin procesar (raw functions)
- gráficos de objetos circulares
- segmentos de ruta inseguros: `__proto__`, `constructor`, `prototype`, claves vacías o
  claves que contengan el separador de ruta interno
- valores `globalName` que no sean identificadores de JavaScript
- colisiones `globalName` con globales integrados del modo de código, como `tools`,
  `namespaces`, `text`, `json`, `yield_control` o `__openclaw*`

Los valores que no se pueden serializar en JSON se convierten en valores de reserva seguros para JSON (JSON-safe)
antes de cruzar el puente. Los datos binarios, los identificadores, los sockets, los clientes y las
instancias de clases deben permanecer tras las herramientas de catálogo ordinarias.

### Prompts

El espacio de nombres `description` y el `prompt` opcional se añaden al esquema
`exec` visible para el modelo solo cuando el espacio de nombres es visible para esa ejecución. Úselos
para enseñar la superficie más pequeña útil:

```typescript
{
  description: "Fiction production service helpers.",
  prompt:
    "Use Fictions.riskAudit(), Fictions.promoteIfReady(id, status), and Fictions.unpaidOver(amount).",
}
```

Mantenga los prompts sobre el contrato del espacio de nombres, no sobre la configuración de autenticación, el historial de implementación
o el comportamiento de complementos no relacionados.

### Limpieza

Los espacios de nombres son registros locales del proceso. Elimínelos cuando el complemento propietario
esté deshabilitado, desinstalado o revertido:

```typescript
clearCodeModeNamespacesForPlugin(pluginId);
```

Use `unregisterCodeModeNamespace(namespaceId)` solo al eliminar un espacio de nombres
conocido. Las pruebas pueden llamar a `clearCodeModeNamespacesForTest()` para evitar filtrar
registros entre casos.

### Lista de verificación de pruebas

Los cambios en el espacio de nombres deben cubrir el límite de seguridad y el comportamiento del huésped:

- el texto del prompt del espacio de nombres aparece solo cuando las herramientas de respaldo son visibles
- las herramientas con el mismo nombre de otro `sourceName` no exponen el espacio de nombres
- las funciones de ámbito sin procesar son rechazadas
- los identificadores de espacios de nombres falsificados y las rutas falsificadas son rechazados
- las rutas invocables no pueden apuntar a herramientas no declaradas
- los objetos anidados y las referencias compartidas se serializan correctamente
- las llamadas al espacio de nombres se ejecutan a través de herramientas de catálogo y devuelven detalles seguros para JSON
- los fallos pueden ser detectados por el código huésped
- las llamadas a espacios de nombres suspendidas se reanudan a través de `wait`
- la reversión del complemento borra los registros de los espacios de nombres propietarios

Los espacios de nombres complementan el catálogo genérico `tools.search` / `tools.call`. Use
el catálogo para herramientas arbitrarias habilitadas; use espacios de nombres para APIs de dominio
documentadas y propiedad de complementos, donde el código conciso es más confiable que las búsquedas
repetidas de esquemas.

## API de salida

`text(value)` agrega salida legible por humanos al arreglo `output`.

`json(value)` agrega un elemento de salida estructurado después de la serialización
compatible con JSON.

El valor final devuelto por el código huésped se convierte en `value` en un resultado `completed`.

Elemento de salida:

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

Reglas de salida:

- el orden de salida coincide con las llamadas del huésped
- la salida está limitada por `maxOutputBytes`
- los valores no serializables se convierten en cadenas simples o errores
- los valores binarios no son compatibles con la v1
- las imágenes y los archivos viajan a través de las herramientas ordinarias de OpenClaw, no a través del
  puente de modo de código

## Catálogo de herramientas

El catálogo oculto incluye herramientas después del filtrado efectivo de políticas:

1. Herramientas principales de OpenClaw.
2. Herramientas de complementos incluidos.
3. Herramientas de complementos externos.
4. Herramientas MCP.
5. Herramientas proporcionadas por el cliente para la ejecución actual.

Los ids del catálogo son estables dentro de una ejecución y deterministas entre conjuntos de herramientas
equivalentes cuando sea posible.

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

Esto evita la recursividad y mantiene el contrato orientado al modelo limitado.

## Interacción con la búsqueda de herramientas

El modo de código reemplaza la superficie del modelo de búsqueda de herramientas de OpenClaw para las ejecuciones donde está
activo.

Cuando `tools.codeMode.enabled` es verdadero y se activa el modo de código:

- OpenClaw no expone `tool_search_code`, `tool_search`, `tool_describe`,
  o `tool_call` como herramientas visibles para el modelo.
- La misma idea de catalogación se mueve dentro del tiempo de ejecución huésped.
- El tiempo de ejecución del huésped recibe metadatos compactos `ALL_TOOLS` y ayudantes de búsqueda, descripción
  y llamada.
- Las llamadas anidadas se envían a través de la misma ruta de ejecución de OpenClaw que usa la búsqueda de herramientas.

La página existente [Tool Search](/es/tools/tool-search) describe el puente de catálogo compacto de OpenClaw. El modo de código es la alternativa genérica de OpenClaw para ejecuciones que pueden
usar `exec` y `wait`.

## Nombres de herramientas y colisiones

La herramienta `exec` visible para el modelo es la herramienta de modo de código. Si la herramienta de shell normal `exec` de OpenClaw
está habilitada, se oculta del modelo y se cataloga como cualquier
otra herramienta.

Dentro del tiempo de ejecución del huésped:

- `tools.call("openclaw:core:exec", input)` puede llamar a la herramienta de ejecución de shell si
  la política lo permite.
- `tools.exec(...)` se instala solo si la entrada del catálogo de ejecución de shell tiene un
  nombre seguro inequívoco.
- la herramienta de modo de código `exec` nunca está disponible recursivamente a través de `tools`.

Si dos herramientas se normalizan al mismo nombre seguro de conveniencia, OpenClaw omite la
función de conveniencia y requiere `tools.call(id, input)`.

## Ejecución anidada de herramientas

Cada llamada anidada a una herramienta cruza el puente del host y vuelve a entrar en OpenClaw.

La ejecución anidada conserva:

- id de agente activo
- id de sesión y clave de sesión
- remitente y contexto del canal
- política de sandbox
- política de aprobación
- ganchos de complemento `before_tool_call`
- señal de aborto
- actualizaciones de streaming cuando estén disponibles
- eventos de trayectoria y auditoría

Las llamadas anidadas se proyectan en la transcripción como llamadas a herramientas reales para que los paquetes de soporte
puedan mostrar qué sucedió. La proyección identifica la llamada a la herramienta de modo de código principal
y el id de la herramienta anidada.

Se permiten llamadas anidadas en paralelo hasta `maxPendingToolCalls`.

## Estado de tiempo de ejecución

Cada ejecución en modo de código tiene una máquina de estados:

- `running`: la VM se está ejecutando o las llamadas anidadas están en curso.
- `waiting`: existe una instantánea de la VM y se puede reanudar con `wait`.
- `completed`: valor final devuelto; instantánea eliminada.
- `failed`: error devuelto; instantánea eliminada.
- `expired`: snapshot or pending state exceeded retention; cannot resume.
- `aborted`: parent run/session cancelled; snapshot deleted.

El estado está limitado por la ejecución del agente, la sesión y el ID de la llamada a la herramienta. Una llamada `wait` de una ejecución o sesión diferente falla.

El almacenamiento de instantáneas está limitado:

- máximo de bytes de instantánea por ejecución
- máximo de instantáneas en vivo por proceso
- TTL de la instantánea
- limpieza al finalizar la ejecución
- limpieza al apagar el Gateway cuando no se admite persistencia

## Tiempo de ejecución QuickJS-WASI

OpenClaw carga `quickjs-wasi` como una dependencia directa en el paquete propietario. El tiempo de ejecución no se basa en una copia transitiva instalada para el proxy, PAC u otras dependencias no relacionadas.

Responsabilidades del tiempo de ejecución:

- compilar o cargar el módulo WebAssembly QuickJS-WASI
- crear una VM aislada por cada ejecución o reanudación en modo de código
- registrar devoluciones de llamada del host por nombres estables
- establecer límites de memoria e interrupción
- evaluar JavaScript
- drenar trabajos pendientes
- guardar el estado suspendido de la VM en una instantánea
- restaurar instantáneas para `wait`
- eliminar identificadores de VM e instantáneas después de los estados terminales

El tiempo de ejecución se ejecuta fuera del bucle de eventos principal de OpenClaw en un trabajador. Un bucle infinito de invitado no debe bloquear el proceso Gateway indefinidamente.

## TypeScript

La compatibilidad con TypeScript es solo una transformación de origen:

- entrada aceptada: una cadena de código TypeScript
- salida: cadena de JavaScript evaluada por QuickJS-WASI
- sin verificación de tipos
- sin resolución de módulos
- sin `import` o `require` en v1
- los diagnósticos se devuelven como resultados `failed`

El compilador de TypeScript se carga de forma diferida solo para celdas de TypeScript. Las celdas de JavaScript simple y el modo de código desactivado no cargan el compilador.

La transformación debe preservar los números de línea útiles cuando sea factible.

## Límite de seguridad

El código del modelo es hostil. El tiempo de ejecución utiliza defensa en profundidad:

- ejecutar QuickJS-WASI fuera del bucle de eventos principal
- cargar `quickjs-wasi` como una dependencia directa, no a través de Codex o un paquete transitivo
- sin sistema de archivos, red, subproceso, importación de módulos, variables de entorno u objetos globales del host en el invitado
- usar límites de memoria e interrupción de QuickJS
- hacer cumplir el tiempo de espera del reloj de pared del proceso principal
- hacer cumplir los límites de salida, instantánea, registro y llamadas pendientes
- serializar los valores del puente del host a través de un adaptador JSON estrecho
- convertir los errores del host en errores simples del huésped, nunca objetos del reino del host
- descartar las instantáneas en caso de tiempo de espera, aborto, fin de sesión o caducidad
- rechazar el acceso recursivo a `exec`, `wait` y herramientas de control de búsqueda de herramientas
- evitar que las colisiones de nombres de conveniencia oculten los asistentes del catálogo

El sandbox es una capa de seguridad. Los operadores aún pueden necesitar un endurecimiento a nivel de sistema operativo
para implementaciones de alto riesgo.

## Códigos de error

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

Los errores devueltos al huésped son datos simples. Las instancias de `Error` del host, objetos de pila,
prototipos y funciones del host no cruzan hacia QuickJS.

## Telemetría

El modo de código informa:

- nombres de herramientas visibles enviados al modelo
- tamaño del catálogo oculto y desglose de fuentes
- recuentos de `exec` y `wait`
- recuentos de búsqueda, descripción y llamadas anidadas
- ids de herramientas anidadas llamadas
- fallos de límite de tiempo de espera, memoria, instantánea y salida
- eventos del ciclo de vida de las instantáneas

La telemetría no debe incluir secretos, valores de entorno sin procesar o entradas de herramientas sin redactar
más allá de la política de trayectoria existente de OpenClaw.

## Depuración

Use el registro de transporte del modelo dirigido cuando el modo de código se comporte de manera diferente a una
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
usarse durante la depuración porque los avisos y el texto de los mensajes aún pueden aparecer.

Para la depuración de flujo, use `OPENCLAW_DEBUG_SSE=peek` para registrar los primeros cinco
eventos SSE redactados. El modo de código también falla de forma cerrada si el payload final del proveedor
no contiene exactamente `exec` y `wait` después de que se ha
activado la superficie del modo de código.

## Disposición de la implementación

Unidades de implementación:

- contrato de configuración: `tools.codeMode`
- generador de catálogo: herramientas efectivas para entradas compactas y mapa de ids
- adaptador de superficie del modelo: reemplazar herramientas visibles con `exec` y `wait`
- adaptador de tiempo de ejecución QuickJS-WASI: cargar, evaluar, instantánea, restaurar, eliminar
- supervisor de trabajador: tiempo de espera, aborto, aislamiento de fallos
- adaptador de puente: devoluciones de llamada del host seguras para JSON y entrega de resultados
- adaptador de transformación de TypeScript
- almacén de instantáneas: TTL, límites de tamaño, alcance de ejecución/sesión
- proyección de trayectoria para llamadas a herramientas anidadas
- contadores de telemetría y diagnósticos

La implementación reutiliza conceptos de catálogo y ejecutor de Tool Search, pero
no utiliza el hijo `node:vm` como el sandbox.

## Lista de verificación de validación

La cobertura del modo de código debe demostrar:

- la configuración deshabilitada deja la exposición de herramientas existente sin cambios
- la configuración de objeto sin `enabled: true` deja el modo de código deshabilitado
- la configuración habilitada expone solo `exec` y `wait` al modelo cuando las herramientas están
  activas para la ejecución
- las ejecuciones sin herramientas en bruto, `disableTools` y las listas de permitidos vacías no activan la aplicación del payload del
  modo de código
- todas las herramientas efectivas aparecen en `ALL_TOOLS`
- las herramientas denegadas no aparecen en `ALL_TOOLS`
- `tools.search`, `tools.describe` y `tools.call` funcionan para herramientas de OpenClaw
- las herramientas de control de Tool Search están ocultas tanto de la superficie del modelo como del catálogo
  oculto
- las llamadas anidadas conservan el comportamiento de aprobación y enlace
- el shell `exec` está oculto para el modelo pero se puede llamar mediante el ID del catálogo cuando se permite
- el modo de código recursivo `exec` y `wait` no se pueden llamar desde el código invitado
- la entrada de TypeScript se transforma y evalúa sin cargar TypeScript en
  rutas deshabilitadas o solo de JavaScript
- el acceso a `import`, `require`, sistema de archivos, red y entorno falla
- los bucles infinitos agotan el tiempo de espera y no pueden bloquear el Gateway
- los fallos del límite de memoria terminan la VM invitada
- se aplican los límites de salida e instantáneas para las llamadas completadas y suspendidas
- `wait` reanuda una instantánea suspendida y devuelve el valor final
- los valores caducados, abortados, de sesión incorrecta y desconocidos de `runId` fallan
- la repetición y persistencia de la transcripción preservan las llamadas de control del modo de código
- la transcripción y la telemetría muestran claramente las llamadas a herramientas anidadas

## Plan de pruebas E2E

Ejecute estas como pruebas de integración o de extremo a extremo al cambiar el tiempo de ejecución:

1. Inicie un Gateway con `tools.codeMode.enabled: false`.
2. Envíe un turno de agente con un conjunto de herramientas directo pequeño.
3. Afirmar que las herramientas visibles para el modelo no han cambiado.
4. Reinicie con `tools.codeMode.enabled: true`.
5. Envíe un turno de agente con herramientas de prueba de OpenClaw, complemento, MCP y cliente.
6. Afirmar que la lista de herramientas visible para el modelo es exactamente `exec`, `wait`.
7. En `exec`, lea `ALL_TOOLS` y afirme que las herramientas de prueba efectivas están presentes.
8. En `exec`, llame a `tools.search`, `tools.describe` y `tools.call`.
9. Afirmar que las herramientas denegadas están ausentes y no se pueden llamar mediante un ID supuesto.
10. Inicie una llamada a herramienta anidada que se resuelva después de que `exec` devuelva `waiting`.
11. Llame a `wait` y afirme que la VM restaurada recibe el resultado de la herramienta.
12. Afirmar que la respuesta final contiene la salida producida después de la restauración.
13. Afirmar que el tiempo de espera, la interrupción y la caducidad de la instantánea limpian el estado de ejecución.
14. Exporte la trayectoria y afirme que las llamadas anidadas son visibles bajo la llamada en modo de código principal.

Los cambios solo de documentación en esta página aún deben ejecutar `pnpm check:docs`.

## Relacionado

- [Búsqueda de herramientas](/es/tools/tool-search)
- [Runtimes de agente](/es/concepts/agent-runtimes)
- [Herramienta Exec](/es/tools/exec)
- [Ejecución de código](/es/tools/code-execution)
