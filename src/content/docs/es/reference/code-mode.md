---
summary: "modo de código de OpenClaw: una superficie de herramientas exec/wait opcional respaldada por QuickJS-WASI y un catálogo de herramientas con ámbito de ejecución oculto"
title: "Modo de código"
sidebarTitle: "Modo de código"
read_when:
  - You want to enable OpenClaw code mode for an agent run
  - You need to explain why code mode is different from Codex Code mode
  - You are reviewing the exec/wait contract, QuickJS-WASI sandbox, TypeScript transform, or hidden tool-catalog bridge
---

El modo de código es una característica experimental del tiempo de ejecución del agente OpenClaw. Está desactivado de forma predeterminada. Cuando lo activa, OpenClaw cambia lo que el modelo ve en una ejecución: en lugar de exponer directamente cada esquema de herramienta activada, el modelo solo ve `exec` y `wait`.

Esta página documenta el modo de código de OpenClaw. No es el modo de código de Codex. El modo de código de Codex es parte del arnés de codificación Codex y tiene su propio espacio de trabajo del proyecto, tiempo de ejecución, herramientas y semántica de ejecución. El modo de código de Codex y la búsqueda dinámica de herramientas nativa de Codex son superficies estables del arnés Codex. El modo de código de OpenClaw es un adaptador de superficie de herramientas experimental propiedad de OpenClaw para ejecuciones genéricas de OpenClaw. Utiliza `quickjs-wasi`, un catálogo de herramientas oculto de OpenClaw y el ejecutor de herramientas normal de OpenClaw.

## ¿Qué es esto?

El modo de código de OpenClaw permite al modelo escribir un programa pequeño de JavaScript o TypeScript en lugar de elegir directamente de una lista larga de herramientas.

Cuando el modo de código está activo:

- La lista de herramientas visible para el modelo es exactamente `exec` y `wait`.
- `exec` evalúa JavaScript o TypeScript generado por el modelo en un trabajador QuickJS-WASI restringido.
- Las herramientas normales de OpenClaw están ocultas del mensaje del modelo y se exponen dentro del programa invitado a través de `ALL_TOOLS` y `tools`.
- El código invitado puede buscar en el catálogo oculto, describir una herramienta y llamar a una herramienta a través de la misma ruta de ejecución de OpenClaw que utilizan los turnos normales del agente.
- `wait` reanuda una ejecución en modo de código suspendida cuando las llamadas a herramientas anidadas aún están pendientes.

La distinción importante: el modo de código cambia la superficie de orquestación orientada al modelo. No reemplaza las herramientas de OpenClaw, las herramientas de complemento, las herramientas MCP, la autenticación, la política de aprobación, el comportamiento del canal o la selección del modelo.

## ¿Por qué esto es bueno?

El modo de código facilita el uso de catálogos de herramientas grandes para los modelos.

- Superficie de prompt más pequeña: los proveedores reciben dos herramientas de control en lugar de docenas
  o cientos de esquemas completos de herramientas.
- Mejor orquestación: el modelo puede usar bucles, uniones, pequeñas transformaciones,
  lógica condicional y llamadas a herramientas anidadas en paralelo dentro de una celda de código.
- Neutral respecto al proveedor: funciona para herramientas de OpenClaw, plugins, MCP y clientes sin
  depender de la ejecución de código nativa del proveedor.
- Las políticas existentes siguen vigentes: las llamadas a herramientas anidadas aún pasan por las políticas,
  aprobaciones, hooks, contexto de sesión y rutas de auditoría de OpenClaw.
- Modo de fallo claro: cuando el modo de código está explícitamente habilitado y el runtime no está
  disponible, OpenClaw falla de forma cerrada (closed) en lugar de volver a una amplia exposición directa
  de herramientas.

El modo de código es especialmente útil para agentes con un catálogo grande de herramientas habilitadas o
para flujos de trabajo donde el modelo necesita repetidamente buscar, combinar y llamar
herramientas antes de producir una respuesta.

## Cómo habilitarlo

Añada `tools.codeMode.enabled: true` a la configuración del agente o del runtime:

```json5
{
  tools: {
    codeMode: {
      enabled: true,
    },
  },
}
```

La forma abreviada también se acepta:

```json5
{
  tools: {
    codeMode: true,
  },
}
```

El modo de código permanece desactivado cuando se omite `tools.codeMode`, `false`, o un objeto
sin `enabled: true`.

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

Para confirmar la forma del payload del modelo mientras depura, ejecute el Gateway con
registro específico:

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
openclaw gateway
```

Con el modo de código activo, los nombres de herramientas registrados orientados al modelo deben ser `exec` y
`wait`. Si necesita el payload redactado del proveedor, añada
`OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` para una sesión breve de depuración.

## Tour técnico

El resto de esta página describe el contrato del runtime y los detalles de implementación.
Está destinado a mantenedores, autores de plugins que depuran la exposición de herramientas y
operadores que validan despliegues de alto riesgo.

## Estado del runtime

- Runtime: [`quickjs-wasi`](https://github.com/vercel-labs/quickjs-wasi).
- Estado predeterminado: deshabilitado.
- Estabilidad: superficie experimental de OpenClaw; El modo de código de Codex es una superficie estable
  separada del harness de Codex.
- Superficie objetivo: ejecuciones genéricas de agentes de OpenClaw.
- Postura de seguridad: el código del modelo es hostil.
- Promesa para el usuario: habilitar el modo de código nunca vuelve silenciosamente a una amplia
  exposición directa de herramientas.

## Alcance

Code mode posee la forma de orquestación orientada al modelo para una ejecución preparada. No posee la selección del modelo, el comportamiento del canal, la autenticación, la política de herramientas ni las implementaciones de herramientas.

En el alcance:

- definiciones de herramientas `exec` y `wait` visibles para el modelo
- construcción del catálogo de herramientas oculto
- ejecución de invitados JavaScript y TypeScript
- tiempo de ejecución del trabajador QuickJS-WASI
- devoluciones de llamada del host para búsqueda en el catálogo, descripción del esquema y llamada a herramienta
- estado reanudable para programas invitados suspendidos
- límites de salida, tiempo de espera, memoria, llamadas pendientes y instantáneas
- telemetría y proyección de trayectoria para llamadas a herramientas anidadas

Fuera del alcance:

- ejecución de código remoto nativa del proveedor
- semántica de ejecución de shell
- cambiar la autorización de herramientas existentes
- scripts persistentes creados por el usuario
- acceso al administrador de paquetes, archivos, red o módulos en el código invitado
- reutilización directa de los internos del modo de código de Codex

Las herramientas propiedad del proveedor, como los entornos limitados (sandboxes) de Python remotos, siguen siendo herramientas separadas. Consulte [Code execution](/es/tools/code-execution).

## Términos

**Code mode** es el modo de tiempo de ejecución de OpenClaw que oculta las herramientas normales del modelo y expone solo `exec` y `wait`.

**Guest runtime** es la máquina virtual JavaScript QuickJS-WASI que evalúa el código del modelo.

**Host bridge** es la superficie de devolución de llamada compatible con JSON y estrecha desde el código invitado de vuelta a OpenClaw.

**Catalog** es la lista de herramientas efectivas con alcance de ejecución después de la política normal de herramientas, complementos, MCP y resolución de herramientas de cliente.

**Nested tool call** es una llamada a herramienta realizada desde el código invitado a través del puente del host.

**Snapshot** es el estado serializado de la máquina virtual QuickJS-WASI guardado para que `wait` pueda continuar una ejecución en modo de código suspendida.

## Configuración

`tools.codeMode.enabled` es el puerto de activación. Establecer otros campos del modo de código no habilita la función.

Campos admitidos:

- `enabled`: booleano. Por defecto `false`. Habilita el modo de código solo cuando `true`.
- `runtime`: `"quickjs-wasi"`. Único tiempo de ejecución admitido.
- `mode`: `"only"`. Expone `exec` y `wait`, oculta las herramientas normales del modelo.
- `languages`: array de `"javascript"` y `"typescript"`. De forma predeterminada incluye
  ambos.
- `timeoutMs`: límite de tiempo de reloj para una `exec` o `wait`. De forma predeterminada `10000`.
  Limitación en tiempo de ejecución: `100` a `60000`.
- `memoryLimitBytes`: límite del montón de QuickJS. De forma predeterminada `67108864`. Limitación en tiempo de ejecución:
  `1048576` a `1073741824`.
- `maxOutputBytes`: límite para el texto, JSON y registros devueltos. De forma predeterminada `65536`.
  Limitación en tiempo de ejecución: `1024` a `10485760`.
- `maxSnapshotBytes`: límite para las instantáneas serializadas de la VM. De forma predeterminada `10485760`.
  Limitación en tiempo de ejecución: `1024` a `268435456`.
- `maxPendingToolCalls`: límite para llamadas a herramientas anidadas simultáneas. De forma predeterminada `16`.
  Limitación en tiempo de ejecución: `1` a `128`.
- `snapshotTtlSeconds`: cuánto tiempo se puede reanudar una VM suspendida. De forma predeterminada `900`.
  Limitación en tiempo de ejecución: `1` a `86400`.
- `searchDefaultLimit`: recuento predeterminado de resultados de búsqueda de catálogo oculto. De forma predeterminada `8`.
  El tiempo de ejecución limita esto a `maxSearchLimit`.
- `maxSearchLimit`: recuento máximo de resultados de búsqueda de catálogo oculto. De forma predeterminada `50`.
  Limitación en tiempo de ejecución: `1` a `50`.

Si el modo de código está habilitado pero QuickJS-WASI no se puede cargar, OpenClaw falla de forma cerrada para
esa ejecución. No expone silenciosamente las herramientas normales como alternativa.

## Activación

El modo de código se evalúa después de que se conoce la política de herramientas efectiva y antes de que se
ensamble la solicitud final del modelo.

Orden de activación:

1. Resolver el agente, el modelo, el proveedor, el entorno seguro, el canal, el remitente y la política de ejecución.
2. Construir la lista de herramientas efectiva de OpenClaw.
3. Agregar herramientas de complementos, MCP y de cliente elegibles.
4. Aplicar la política de permitir y denegar.
5. Si `tools.codeMode.enabled` es false, continúe con la exposición normal de herramientas.
6. Si está habilitado y las herramientas están activas para la ejecución, registre las herramientas efectivas en el catálogo de modo código.
7. Elimine todas las herramientas normales de la lista de herramientas visibles para el modelo.
8. Añada `exec` y `wait` del modo código.

Las ejecuciones que intencionalmente no tienen herramientas, como las llamadas sin procesar al modelo, `disableTools`, o una lista de permitidos vacía, no activan la superficie del modo código incluso si la configuración contiene `tools.codeMode.enabled: true`.

El catálogo de modo código tiene el ámbito de la ejecución. No debe filtrar herramientas de otro agente, sesión, remitente o ejecución.

## Herramientas visibles para el modelo

Cuando el modo código está activo, el modelo ve exactamente estas herramientas de nivel superior:

- `exec`
- `wait`

Todas las demás herramientas habilitadas se ocultan de la lista de herramientas orientadas al modelo y se registran en el catálogo de modo código.

El modelo debe usar `exec` para la orquestación de herramientas, unión de datos, bucles, llamadas anidadas en paralelo y transformaciones estructuradas. El modelo debe usar `wait` solo cuando `exec` devuelve un resultado reanudable `waiting`.

## `exec`

`exec` inicia una celda de modo código y devuelve un resultado. El código de entrada es generado por el modelo y debe tratarse como hostil.

Entrada:

```typescript
type CodeModeExecInput = {
  code: string;
  language?: "javascript" | "typescript";
};
```

Reglas de entrada:

- `code` es obligatorio y no debe estar vacío.
- `language` es `"javascript"` por defecto.
- Si `language` es `"typescript"`, OpenClaw transpila antes de la evaluación.
- `exec` rechaza `import`, `require`, importación dinámica y patrones de cargador de módulos en v1.
- `exec` no expone la implementación normal de shell `exec` de forma recursiva.

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

`exec` devuelve `waiting` cuando la máquina virtual QuickJS se suspende con un estado reanudable. El resultado incluye un `runId` para `wait`.

`exec` devuelve `completed` solo cuando la VM huésped no tiene trabajo pendiente y el valor final es compatible con JSON después de que se ejecuta el adaptador de salida de OpenClaw.

## `wait`

`wait` continúa una VM en modo de código suspendida.

Entrada:

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

La salida es la misma unión `CodeModeResult` devuelta por `exec`.

`wait` existe porque las herramientas anidadas de OpenClaw pueden ser lentas, interactivas, con puerta de aprobación o transmitir actualizaciones parciales. El modelo no debería necesitar mantener una llamada larga `exec` abierta mientras el host espera trabajo externo.

La instantánea y restauración de QuickJS-WASI es el mecanismo de reanudación v1:

1. `exec` evalúa el código hasta su finalización, fallo o suspensión.
2. En suspensión, OpenClaw guarda una instantánea de la VM QuickJS y registra el trabajo pendiente del host.
3. Cuando el trabajo pendiente se resuelve, `wait` restaura la instantánea de la VM.
4. OpenClaw vuelve a registrar las devoluciones de llamada del host por nombres estables.
5. OpenClaw entrega los resultados de herramientas anidadas en la VM restaurada.
6. OpenClaw drena los trabajos pendientes de QuickJS.
7. `wait` devuelve `completed`, `failed` u otro resultado `waiting`.

Las instantáneas son el estado de tiempo de ejecución, no artefactos de usuario. Tienen un límite de tamaño, caducan y están limitadas a la ejecución y sesión que las crearon.

`wait` falla cuando:

- `runId` es desconocido.
- la instantánea caducó.
- la ejecución o sesión principal se abortó.
- el solicitante no está en el mismo ámbito de ejecución/sesión.
- La restauración de QuickJS-WASI falla.
- la restauración excedería los límites configurados.

## API del tiempo de ejecución del huésped

El tiempo de ejecución del huésped expone una pequeña API global:

```typescript
declare const ALL_TOOLS: ToolCatalogEntry[];
declare const tools: ToolCatalog;

declare function text(value: unknown): void;
declare function json(value: unknown): void;
declare function yield_control(reason?: string): Promise<void>;
```

`ALL_TOOLS` son metadatos compactos para el catálogo con ámbito de ejecución. No contiene esquemas completos de forma predeterminada.

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

El esquema completo se carga solo bajo demanda:

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

El tiempo de ejecución del huésped no debe exponer objetos del host directamente. Las entradas y salidas cruzan el puente como valores compatibles con JSON con límites de tamaño explícitos.

## API de salida

`text(value)` agrega salida legible por humanos al arreglo `output`.

`json(value)` agrega un elemento de salida estructurada después de la serialización compatible con JSON.

El valor final devuelto por el código huésped se convierte en `value` en un resultado `completed`.

Elemento de salida:

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

Reglas de salida:

- el orden de salida coincide con las llamadas del huésped
- la salida está limitada por `maxOutputBytes`
- los valores no serializables se convierten en cadenas planas o errores
- los valores binarios no son compatibles en la v1
- las imágenes y los archivos viajan a través de las herramientas ordinarias de OpenClaw, no a través del puente del modo código

## Catálogo de herramientas

El catálogo oculto incluye herramientas después del filtrado efectivo de políticas:

1. Herramientas principales de OpenClaw.
2. Herramientas de complementos incluidos.
3. Herramientas de complementos externos.
4. Herramientas MCP.
5. Herramientas proporcionadas por el cliente para la ejecución actual.

Los ids del catálogo son estables dentro de una ejecución y deterministas en conjuntos de herramientas equivalentes cuando es posible.

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

El catálogo omite las herramientas de control del modo código:

- `exec`
- `wait`
- `tool_search_code`
- `tool_search`
- `tool_describe`
- `tool_call`

Esto evita la recursión y mantiene el contrato orientado al modelo reducido.

## Interacción con la búsqueda de herramientas

El modo código reemplaza la superficie del modelo de búsqueda de herramientas PI para las ejecuciones donde está activo.

Cuando `tools.codeMode.enabled` es verdadero y se activa el modo código:

- OpenClaw no expone `tool_search_code`, `tool_search`, `tool_describe` o `tool_call` como herramientas visibles para el modelo.
- La misma idea de catalogación se mueve dentro del tiempo de ejecución del huésped.
- El tiempo de ejecución del huésped recibe metadatos compactos `ALL_TOOLS` y auxiliares de búsqueda, descripción y llamada.
- Las llamadas anidadas se despachan a través de la misma ruta de ejecución de OpenClaw que usa la búsqueda de herramientas.

La página existente [Tool Search](/es/tools/tool-search) describe el puente de catálogo compacto de PI. El modo código es la alternativa genérica de OpenClaw para ejecuciones que pueden usar `exec` y `wait`.

## Nombres de herramientas y colisiones

La herramienta `exec` visible para el modelo es la herramienta de modo de código. Si la herramienta de shell normal de OpenClaw `exec` está habilitada, se oculta del modelo y se cataloga como cualquier otra herramienta.

Dentro del runtime de invitado:

- `tools.call("openclaw:core:exec", input)` puede llamar a la herramienta de ejecución de shell si la política lo permite.
- `tools.exec(...)` se instala solo si la entrada del catálogo de ejecución de shell tiene un nombre seguro inequívoco.
- la herramienta de modo de código `exec` nunca está disponible de forma recursiva a través de `tools`.

Si dos herramientas se normalizan al mismo nombre seguro de conveniencia, OpenClaw omite la función de conveniencia y requiere `tools.call(id, input)`.

## Ejecución de herramientas anidadas

Cada llamada a herramienta anidada cruza el puente del host y vuelve a entrar en OpenClaw.

La ejecución anidada preserva:

- id de agente activo
- id de sesión y clave de sesión
- contexto de remitente y canal
- política de sandbox
- política de aprobación
- enlaces `before_tool_call` del complemento
- señal de aborto
- actualizaciones de transmisión donde estén disponibles
- eventos de trayectoria y auditoría

Las llamadas anidadas se proyectan en la transcripción como llamadas a herramientas reales para que los paquetes de soporte puedan mostrar qué sucedió. La proyección identifica la llamada a la herramienta de modo de código principal y el id de la herramienta anidada.

Se permiten llamadas anidadas en paralelo hasta `maxPendingToolCalls`.

## Estado de tiempo de ejecución

Cada ejecución en modo de código tiene una máquina de estados:

- `running`: la VM se está ejecutando o las llamadas anidadas están en curso.
- `waiting`: existe una instantánea de la VM y se puede reanudar con `wait`.
- `completed`: valor final devuelto; instantánea eliminada.
- `failed`: error devuelto; instantánea eliminada.
- `expired`: la instantánea o el estado pendiente excedieron la retención; no se puede reanudar.
- `aborted`: ejecución/sesión principal cancelada; instantánea eliminada.

El estado está limitado por la ejecución del agente, la sesión y el id de la llamada a la herramienta. Una llamada `wait` desde una ejecución o sesión diferente falla.

El almacenamiento de instantáneas está limitado:

- bytes máximos de instantánea por ejecución
- instantáneas vivas máximas por proceso
- TTL de instantánea
- limpieza al final de la ejecución
- limpieza al apagar el Gateway donde no se admite la persistencia

## Tiempo de ejecución QuickJS-WASI

OpenClaw carga `quickjs-wasi` como una dependencia directa en el paquete propietario. El tiempo de ejecución no depende de una copia transitiva instalada para proxy, PAC u otras dependencias no relacionadas.

Responsabilidades del tiempo de ejecución:

- compilar o cargar el módulo WebAssembly de QuickJS-WASI
- crear una VM aislada por cada ejecución o reanudación en modo de código
- registrar devoluciones de llamada del host mediante nombres estables
- establecer límites de memoria e interrupción
- evaluar JavaScript
- drenar trabajos pendientes
- instantánea del estado suspendido de la VM
- restaurar instantáneas para `wait`
- eliminar identificadores de VM e instantáneas después de los estados terminales

El tiempo de ejecución se ejecuta fuera del bucle de eventos principal de OpenClaw en un trabajador. Un bucle infinito del huésped no debe bloquear el proceso Gateway indefinidamente.

## TypeScript

La compatibilidad con TypeScript es solo una transformación de origen:

- entrada aceptada: una cadena de código TypeScript
- salida: cadena de JavaScript evaluada por QuickJS-WASI
- sin verificación de tipos
- sin resolución de módulos
- sin `import` o `require` en v1
- los diagnósticos se devuelven como resultados `failed`

El compilador de TypeScript se carga de forma diferida solo para las celdas de TypeScript. Las celdas de JavaScript simple y el modo de código deshabilitado no cargan el compilador.

La transformación debe preservar los números de línea útiles cuando sea factible.

## Límite de seguridad

El código del modelo es hostil. El tiempo de ejecución utiliza defensa en profundidad:

- ejecutar QuickJS-WASI fuera del bucle de eventos principal
- cargar `quickjs-wasi` como una dependencia directa, no a través de Codex o un paquete transitorio
- sin sistema de archivos, red, subproceso, importación de módulos, variables de entorno u objetos globales del host en el huésped
- usar límites de memoria e interrupción de QuickJS
- imponer el tiempo de espera del reloj de pared del proceso principal
- imponer límites de salida, instantánea, registro y llamadas pendientes
- serializar los valores del puente del host a través de un adaptador JSON estrecho
- convertir errores del host en errores simples del huésped, nunca objetos del reino del host
- descartar instantáneas en tiempo de espera, aborto, finalización de sesión o caducidad
- rechazar el acceso recursivo a `exec`, `wait` y herramientas de control de búsqueda de herramientas
- evitar colisiones de nombres de conveniencia que oculten los auxiliares del catálogo

El sandbox es una capa de seguridad. Los operadores aún pueden necesitar endurecimiento a nivel de sistema operativo para implementaciones de alto riesgo.

## Códigos de error

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

Los errores devueltos al invitado son datos sin procesar. Las instancias `Error` del host, objetos de pila, prototipos y funciones del host no cruzan hacia QuickJS.

## Telemetría

El modo de código informa:

- nombres de herramientas visibles enviados al modelo
- tamaño del catálogo oculto y desglose de fuentes
- recuentos de `exec` y `wait`
- recuentos de búsqueda, descripción y llamada anidados
- ids de herramientas anidadas llamadas
- fallos de tiempo de espera, memoria, instantánea y límite de salida
- eventos del ciclo de vida de la instantánea

La telemetría no debe incluir secretos, valores de entorno sin procesar o entradas de herramientas no redactadas más allá de la política de trayectoria existente de OpenClaw.

## Depuración

Use el registro de transporte del modelo específico cuando el modo de código se comporte de manera diferente a una ejecución normal de una herramienta:

```bash
OPENCLAW_DEBUG_CODE_MODE=1 \
OPENCLAW_DEBUG_MODEL_TRANSPORT=1 \
OPENCLAW_DEBUG_MODEL_PAYLOAD=tools \
OPENCLAW_DEBUG_SSE=events \
openclaw gateway
```

Para la depuración de la forma del payload, use `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted`.
Esto registra una instantánea JSON limitada y redactada de la solicitud del modelo; solo debe usarse durante la depuración porque los prompts y el texto de los mensajes aún pueden aparecer.

Para la depuración del flujo, use `OPENCLAW_DEBUG_SSE=peek` para registrar los primeros cinco
eventos SSE redactados. El modo de código también falla de forma cerrada si la carga útil final del proveedor
no contiene exactamente `exec` y `wait` después de que se haya
activado la superficie del modo de código.

## Diseño de la implementación

Unidades de implementación:

- contrato de configuración: `tools.codeMode`
- constructor de catálogos: herramientas efectivas para entradas compactas y mapa de ids
- adaptador de superficie del modelo: reemplazar herramientas visibles con `exec` y `wait`
- adaptador de tiempo de ejecución QuickJS-WASI: cargar, evaluar, instantánea, restaurar, eliminar
- supervisor de trabajador: tiempo de espera, abortar, aislamiento de fallos
- adaptador de puente: devoluciones de llamada del host seguras para JSON y entrega de resultados
- adaptador de transformación de TypeScript
- almacén de instantáneas: TTL, límites de tamaño, alcance de ejecución/sesión
- proyección de trayectoria para llamadas a herramientas anidadas
- contadores de telemetría y diagnósticos

La implementación reutiliza conceptos de catálogo y ejecutor de Tool Search, pero
no usa el hijo `node:vm` como el sandbox.

## Lista de verificación de validación

La cobertura del modo de código debe demostrar:

- la configuración deshabilitada deja la exposición de herramientas existente sin cambios
- la configuración del objeto sin `enabled: true` deja el modo de código deshabilitado
- la configuración habilitada expone solo `exec` y `wait` al modelo cuando las herramientas están
  activas para la ejecución
- las ejecuciones sin herramientas, `disableTools`, y las listas de permitidos vacías no activan la aplicación forzosa
  de la carga útil del modo código
- todas las herramientas efectivas aparecen en `ALL_TOOLS`
- las herramientas denegadas no aparecen en `ALL_TOOLS`
- `tools.search`, `tools.describe` y `tools.call` funcionan para las herramientas de OpenClaw
- las herramientas de control de búsqueda de herramientas (Tool Search) están ocultas tanto de la superficie del modelo como del catálogo
  oculto
- las llamadas anidadas preservan el comportamiento de aprobación y de enlace (hook)
- el shell `exec` está oculto para el modelo pero puede ser invocado por el ID del catálogo cuando se permite
- el modo código recursivo `exec` y `wait` no pueden ser invocados desde el código invitado
- la entrada de TypeScript se transforma y evalúa sin cargar TypeScript en
  las rutas deshabilitadas o solo de JavaScript
- `import`, `require`, el acceso al sistema de archivos, a la red y al entorno fallan
- los bucles infinitos agotan el tiempo de espera y no pueden bloquear la puerta de enlace (Gateway)
- los fallos del límite de memoria terminan la máquina virtual invitada
- se aplican los límites de salida y de instantáneas para las llamadas completadas y suspendidas
- `wait` reanuda una instantánea suspendida y devuelve el valor final
- los valores caducados, abortados, de sesión incorrecta y desconocidos de `runId` fallan
- la repetición y persistencia de la transcripción preservan las llamadas de control del modo código
- la transcripción y la telemetría muestran claramente las llamadas a herramientas anidadas

## Plan de pruebas de extremo a extremo

Ejecute estas como pruebas de integración o de extremo a extremo al cambiar el tiempo de ejecución:

1. Inicie una puerta de enlace (Gateway) con `tools.codeMode.enabled: false`.
2. Envíe un turno de agente con un conjunto de herramientas directo pequeño.
3. Afirmar que las herramientas visibles para el modelo no han cambiado.
4. Reinicie con `tools.codeMode.enabled: true`.
5. Envíe un turno de agente con herramientas de prueba de OpenClaw, complemento, MCP y cliente.
6. Afirmar que la lista de herramientas visibles para el modelo es exactamente `exec`, `wait`.
7. En `exec`, lea `ALL_TOOLS` y afirme que las herramientas de prueba efectivas están presentes.
8. En `exec`, llame a `tools.search`, `tools.describe` y `tools.call`.
9. Afirmar que las herramientas denegadas están ausentes y no se pueden llamar mediante id. deducido.
10. Iniciar una llamada de herramienta anidada que se resuelve después de que `exec` devuelve `waiting`.
11. Llamar a `wait` y afirmar que la VM restaurada recibe el resultado de la herramienta.
12. Afirmar que la respuesta final contiene el resultado producido después de la restauración.
13. Afirmar que el tiempo de espera, la interrupción y la caducidad de la instantánea limpian el estado de tiempo de ejecución.
14. Exportar la trayectoria y afirmar que las llamadas anidadas son visibles bajo la llamada
    principal de modo de código.

Los cambios exclusivamente de documentación en esta página aún deben ejecutar `pnpm check:docs`.

## Relacionado

- [Búsqueda de herramientas](/es/tools/tool-search)
- [Tiempos de ejecución del agente](/es/concepts/agent-runtimes)
- [Herramienta Exec](/es/tools/exec)
- [Ejecución de código](/es/tools/code-execution)
