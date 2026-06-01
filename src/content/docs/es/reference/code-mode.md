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

Esta página documenta el modo de código de OpenClaw. No es el modo de código de Codex. Las dos características comparten un nombre, pero están implementadas por diferentes runtimes y exponen diferentes contratos `exec`:

- El modo de código de Codex está habilitado para los hilos del servidor de aplicaciones de Codex a menos que una política de herramientas restringida deshabilite el modo de código nativo. Se ejecuta en el arnés de codificación de Codex, donde el modelo escribe comandos de shell a través de un contrato `exec.command`.
- El modo de código de OpenClaw está deshabilitado a menos que se configure `tools.codeMode.enabled: true`. Se ejecuta en el runtime de agente genérico de OpenClaw, donde el modelo escribe programas de JavaScript o TypeScript a través de un contrato `exec.code`.

El modo de código de Codex y la búsqueda dinámica de herramientas nativa de Codex son superficies estables del arnés de Codex. El modo de código de OpenClaw es un adaptador de superficie de herramientas experimental propiedad de OpenClaw para ejecuciones genéricas de OpenClaw. Utiliza `quickjs-wasi`, un catálogo de herramientas oculto de OpenClaw y el ejecutor de herramientas normal de OpenClaw.

## ¿Qué es esto?

El modo de código de OpenClaw permite que el modelo escriba un pequeño programa de JavaScript o TypeScript en lugar de elegir directamente de una larga lista de herramientas.

Cuando el modo de código está activo:

- La lista de herramientas visibles para el modelo es exactamente `exec` y `wait`.
- `exec` evalúa JavaScript o TypeScript generado por el modelo en un trabajador QuickJS-WASI restringido.
- Las herramientas normales de OpenClaw están ocultas en el prompt del modelo y se exponen dentro del programa invitado a través de `ALL_TOOLS` y `tools`.
- El código invitado puede buscar el catálogo oculto, describir una herramienta y llamar a una herramienta a través de la misma ruta de ejecución de OpenClaw utilizada por los turnos normales del agente.
- `wait` reanuda una ejecución en modo de código suspendida cuando las llamadas a herramientas anidadas aún están pendientes.

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

Con el modo de código activo, los nombres de herramientas registrados orientados al modelo deberían ser `exec` y `wait`. Si necesita el payload del proveedor redactado, añada `OPENCLAW_DEBUG_MODEL_PAYLOAD=full-redacted` para una breve sesión de depuración.

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

Las herramientas propiedad del proveedor, como los entornos limitados de Python remotos, siguen siendo herramientas separadas. Consulte
[Ejecución de código](/es/tools/code-execution).

## Términos

**Modo de código** es el modo de ejecución de OpenClaw que oculta las herramientas normales del modelo y
expone solo `exec` y `wait`.

**Tiempo de ejecución invitado** es la máquina virtual JavaScript QuickJS-WASI que evalúa el código del modelo.

**Puente anfitrión** es la superficie de devolución de llamada compatible con JSON y estrecha desde el código invitado
de vuelta a OpenClaw.

**Catálogo** es la lista de herramientas efectivas con alcance de ejecución después de la política de herramientas normal,
plugin, MCP y resolución de herramientas de cliente.

**Llamada a herramienta anidada** es una llamada a herramienta realizada desde el código invitado a través del puente anfitrión.

**Instantánea** es el estado serializado de la máquina virtual QuickJS-WASI guardado para que `wait` pueda continuar una
ejecución en modo de código suspendida.

## Configuración

`tools.codeMode.enabled` es el puerto de activación. Configurar otros campos del modo de código
no habilita la función.

Campos admitidos:

- `enabled`: booleano. Predeterminado `false`. Habilita el modo de código solo cuando `true`.
- `runtime`: `"quickjs-wasi"`. Único tiempo de ejecución admitido.
- `mode`: `"only"`. Expone `exec` y `wait`, oculta las herramientas normales del modelo.
- `languages`: matriz de `"javascript"` y `"typescript"`. El valor predeterminado incluye
  ambos.
- `timeoutMs`: límite de tiempo de reloj para una `exec` o `wait`. Predeterminado `10000`.
  Límite de tiempo de ejecución: `100` a `60000`.
- `memoryLimitBytes`: límite del heap de QuickJS. Predeterminado `67108864`. Límite de tiempo de ejecución:
  `1048576` a `1073741824`.
- `maxOutputBytes`: límite para el texto, JSON y registros devueltos. Predeterminado `65536`.
  Límite de tiempo de ejecución: `1024` a `10485760`.
- `maxSnapshotBytes`: límite para las instantáneas serializadas de la VM. Predeterminado `10485760`.
  Límite de tiempo de ejecución: `1024` a `268435456`.
- `maxPendingToolCalls`: límite para llamadas a herramientas anidadas simultáneas. Predeterminado `16`.
  Límite de tiempo de ejecución: `1` a `128`.
- `snapshotTtlSeconds`: cuánto tiempo se puede reanudar una VM suspendida. Predeterminado `900`.
  Límite de tiempo de ejecución: `1` a `86400`.
- `searchDefaultLimit`: recuento predeterminado de resultados de búsqueda de catálogo oculto. Predeterminado `8`.
  El tiempo de ejecución limita esto a `maxSearchLimit`.
- `maxSearchLimit`: recuento máximo de resultados de búsqueda de catálogo oculto. Predeterminado `50`.
  Límite de tiempo de ejecución: `1` a `50`.

Si el modo de código está habilitado pero QuickJS-WASI no puede cargarse, OpenClaw falla de forma cerrada para esa ejecución. No expone silenciosamente las herramientas normales como alternativa.

## Activación

El modo de código se evalúa después de que se conoce la política de herramientas efectiva y antes de que se ensamble la solicitud final del modelo.

Orden de activación:

1. Resolver el agente, el modelo, el proveedor, el sandbox, el canal, el remitente y la política de ejecución.
2. Construir la lista efectiva de herramientas de OpenClaw.
3. Añadir herramientas de complementos, MCP y cliente elegibles.
4. Aplicar la política de permitir y denegar.
5. Si `tools.codeMode.enabled` es falso, continuar con la exposición normal de herramientas.
6. Si está habilitado y las herramientas están activas para la ejecución, registrar las herramientas efectivas en el catálogo de modo de código.
7. Eliminar todas las herramientas normales de la lista de herramientas visibles para el modelo.
8. Añadir `exec` y `wait` del modo de código.

Las ejecuciones que intencionalmente no tienen herramientas, como las llamadas directas al modelo, `disableTools`, o una lista de permitidos vacía, no activan la superficie del modo de código incluso si la configuración contiene `tools.codeMode.enabled: true`.

El catálogo de modo de código tiene el ámbito de la ejecución. No debe filtrar herramientas de otro agente, sesión, remitente o ejecución.

## Herramientas visibles para el modelo

Cuando el modo de código está activo, el modelo ve exactamente estas herramientas de nivel superior:

- `exec`
- `wait`

Todas las demás herramientas habilitadas se ocultan de la lista de herramientas orientadas al modelo y se registran en el catálogo de modo de código.

El modelo debe usar `exec` para la orquestación de herramientas, la unión de datos, bucles, llamadas anidadas en paralelo y transformaciones estructuradas. El modelo debe usar `wait` solo cuando `exec` devuelve un resultado `waiting` reanudable.

## `exec`

`exec` inicia una celda de modo de código y devuelve un resultado. El código de entrada es generado por el modelo y debe tratarse como hostil.

Entrada:

```typescript
type CodeModeExecInput = {
  code?: string;
  command?: string;
  language?: "javascript" | "typescript";
};
```

Reglas de entrada:

- Uno de `code` o `command` debe no estar vacío.
- `code` es el campo documentado orientado al modelo.
- `command` se acepta como un alias compatible con exec para políticas de enlace y reescrituras de confianza; cuando ambos están presentes, los valores deben coincidir.
- Los eventos de enlace `exec` del modo de código externo incluyen `toolKind: "code_mode_exec"` e incluyen `toolInputKind: "javascript" | "typescript"` cuando se conoce el idioma de entrada, por lo que las políticas pueden distinguir las celdas de modo de código de las llamadas `exec` de estilo de shell que comparten el mismo nombre de herramienta.
- `language` tiene como valor predeterminado `"javascript"`.
- Si `language` es `"typescript"`, OpenClaw transpila antes de la evaluación.
- `exec` rechaza `import`, `require`, importaciones dinámicas y patrones de cargador de módulos
  en v1.
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

`exec` devuelve `waiting` cuando la VM QuickJS se suspende con un estado reanudable. El
resultado incluye un `runId` para `wait`.

`exec` devuelve `completed` solo cuando la VM invitada no tiene trabajo pendiente y el
valor final es compatible con JSON después de que se ejecuta el adaptador de salida de OpenClaw.

## `wait`

`wait` continúa una VM en modo de código suspendida.

Entrada:

```typescript
type CodeModeWaitInput = {
  runId: string;
};
```

La salida es la misma unión `CodeModeResult` devuelta por `exec`.

`wait` existe porque las herramientas anidadas de OpenClaw pueden ser lentas, interactivas, con aprobación
gobernada o transmitir actualizaciones parciales. El modelo no debería necesitar mantener una larga
llamada `exec` abierta mientras el host espera trabajo externo.

La instantánea y restauración de QuickJS-WASI es el mecanismo de reanudación v1:

1. `exec` evalúa el código hasta completarse, fallar o suspenderse.
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

## API de salida

`text(value)` agrega una salida legible por humanos al array `output`.

`json(value)` agrega un elemento de salida estructurado después de la serialización compatible con JSON.

El valor final devuelto por el código invitado se convierte en `value` en un resultado `completed`.

Elemento de salida:

```typescript
type CodeModeOutput = { type: "text"; text: string } | { type: "json"; value: unknown };
```

Reglas de salida:

- el orden de salida coincide con las llamadas del invitado
- la salida está limitada por `maxOutputBytes`
- los valores no serializables se convierten en cadenas simples o errores
- los valores binarios no son compatibles con v1
- las imágenes y los archivos viajan a través de las herramientas ordinarias de OpenClaw, no a través del puente de modo código

## Catálogo de herramientas

El catálogo oculto incluye herramientas después del filtrado efectivo de políticas:

1. Herramientas principales de OpenClaw.
2. Herramientas de complementos agrupados.
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

Esto evita la recursividad y mantiene el contrato orientado al modelo estrecho.

## Interacción con Tool Search

El modo de código reemplaza la superficie del modelo de búsqueda de herramientas de OpenClaw para las ejecuciones en las que está activo.

Cuando `tools.codeMode.enabled` es verdadero y se activa el modo código:

- OpenClaw no expone `tool_search_code`, `tool_search`, `tool_describe`,
  o `tool_call` como herramientas visibles para el modelo.
- La misma idea de catalogación se mueve dentro del runtime invitado.
- El runtime invitado recibe metadatos compactos `ALL_TOOLS` y asistentes de búsqueda, descripción y llamada.
- Las llamadas anidadas se envían a través de la misma ruta de ejecución de OpenClaw que usa Tool Search.

La página existente de [búsqueda de herramientas](/es/tools/tool-search) describe el puente de catálogo compacto de OpenClaw. El modo de código es la alternativa genérica de OpenClaw para las ejecuciones que pueden usar `exec` y `wait`.

## Nombres de herramientas y colisiones

La herramienta `exec` visible para el modelo es la herramienta de code mode. Si la herramienta normal de shell `exec` de OpenClaw está habilitada, se oculta del modelo y se cataloga como cualquier otra herramienta.

Dentro del runtime invitado:

- `tools.call("openclaw:core:exec", input)` puede llamar a la herramienta de ejecución de shell si la política lo permite.
- `tools.exec(...)` se instala solo si la entrada del catálogo de ejecución de shell tiene un nombre seguro inequívoco.
- la herramienta `exec` de code mode nunca está disponible de forma recursiva a través de `tools`.

Si dos herramientas se normalizan al mismo nombre seguro de conveniencia, OpenClaw omite la función de conveniencia y requiere `tools.call(id, input)`.

## Ejecución de herramientas anidadas

Cada llamada a herramienta anidada cruza el puente del host y vuelve a entrar en OpenClaw.

La ejecución anidada preserva:

- id de agente activo
- id de sesión y clave de sesión
- contexto de remitente y canal
- política de sandbox
- política de aprobación
- ganchos `before_tool_call` de complementos
- señal de aborto
- actualizaciones de transmisión donde estén disponibles
- eventos de trayectoria y auditoría

Las llamadas anidadas se proyectan en la transcripción como llamadas a herramientas reales para que los paquetes de so puedan mostrar lo que sucedió. La proyección identifica la llamada a la herramienta de code mode principal y el id de la herramienta anidada.

Se permiten llamadas anidadas paralelas hasta `maxPendingToolCalls`.

## Estado de ejecución

Cada ejecución en code mode tiene una máquina de estados:

- `running`: la VM se está ejecutando o las llamadas anidadas están en vuelo.
- `waiting`: existe una instantánea de la VM y se puede reanudar con `wait`.
- `completed`: valor final devuelto; instantánea eliminada.
- `failed`: error devuelto; instantánea eliminada.
- `expired`: snapshot o estado pendiente excedió la retención; no se puede reanudar.
- `aborted`: ejecución/sesión principal cancelada; instantánea eliminada.

El estado tiene ámbito por ejecución del agente, sesión e id de llamada de herramienta. Una llamada `wait` desde una ejecución o sesión diferente falla.

El almacenamiento de instantáneas está limitado:

- máximo de bytes de instantánea por ejecución
- máximo de instantáneas en vivo por proceso
- TTL de instantánea
- limpieza al finalizar la ejecución
- limpieza al apagar Gateway cuando no se admite persistencia

## Runtime de QuickJS-WASI

OpenClaw carga `quickjs-wasi` como una dependencia directa en el paquete propietario. El runtime no se basa en una copia transitiva instalada para proxy, PAC u otras dependencias no relacionadas.

Responsabilidades del runtime:

- compilar o cargar el módulo WebAssembly QuickJS-WASI
- crear una VM aislada por cada ejecución o reanudación en modo código
- registrar callbacks del host mediante nombres estables
- establecer límites de memoria e interrupción
- evaluar JavaScript
- drenar trabajos pendientes
- instantánea del estado de la VM suspendida
- restaurar instantáneas para `wait`
- eliminar manejadores de VM e instantáneas después de estados terminales

El runtime se ejecuta fuera del bucle de eventos principal de OpenClaw en un trabajador. Un bucle infinito del invitado no debe bloquear el proceso Gateway indefinidamente.

## TypeScript

La compatibilidad con TypeScript es solo una transformación de origen:

- entrada aceptada: una cadena de código TypeScript
- salida: cadena JavaScript evaluada por QuickJS-WASI
- sin verificación de tipos
- sin resolución de módulos
- sin `import` o `require` en v1
- los diagnósticos se devuelven como resultados `failed`

El compilador de TypeScript se carga de forma diferida solo para celdas TypeScript. Las celdas JavaScript simples y el modo de código deshabilitado no cargan el compilador.

La transformación debe conservar números de línea útiles cuando sea factible.

## Límite de seguridad

El código del modelo es hostil. El runtime utiliza defensa en profundidad:

- ejecutar QuickJS-WASI fuera del bucle de eventos principal
- cargar `quickjs-wasi` como una dependencia directa, no a través de Codex o un paquete transitivo
- sin sistema de archivos, red, subproceso, importación de módulos, variables de entorno u objetos globales del host en el invitado
- usar límites de memoria e interrupción de QuickJS
- forzar tiempo de espera de reloj de pared del proceso principal
- hacer cumplir los límites de salida, instantánea, registro y llamadas pendientes
- serializar los valores del puente del host a través de un adaptador JSON estrecho
- convertir los errores del host en errores simples del huésped, nunca objetos del reino del host
- descartar instantáneas en caso de tiempo de espera, aborto, fin de sesión o caducidad
- rechazar el acceso recursivo a `exec`, `wait` y las herramientas de control de búsqueda de herramientas
- evitar que las colisiones de nombres de convenencia oculten los asistentes del catálogo

El sandbox es una capa de seguridad. Los operadores aún pueden necesitar endurecimiento a nivel de sistema operativo
para implementaciones de alto riesgo.

## Códigos de error

```typescript
type CodeModeErrorCode = "runtime_unavailable" | "invalid_config" | "invalid_input" | "unsupported_language" | "typescript_transform_failed" | "module_access_denied" | "timeout" | "memory_limit_exceeded" | "output_limit_exceeded" | "snapshot_limit_exceeded" | "snapshot_expired" | "snapshot_restore_failed" | "too_many_pending_tool_calls" | "nested_tool_failed" | "aborted" | "internal_error";
```

Los errores devueltos al huésped son datos simples. Las instancias del host `Error`, los objetos de pila,
los prototipos y las funciones del host no cruzan hacia QuickJS.

## Telemetría

El modo de código informa:

- nombres de herramientas visibles enviados al modelo
- tamaño del catálogo oculto y desglose de fuentes
- recuentos de `exec` y `wait`
- recuentos de búsqueda, descripción y llamadas anidadas
- ids de herramientas anidadas llamadas
- fallos de tiempo de espera, memoria, instantánea y límite de salida
- eventos del ciclo de vida de la instantánea

La telemetría no debe incluir secretos, valores de entorno sin procesar o entradas de herramientas sin redactar
más allá de la política de trayectoria existente de OpenClaw.

## Depuración

Utilice el registro de transporte del modelo dirigido cuando el modo de código se comporte de manera diferente a una
ejecución normal de herramientas:

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

Para la depuración del flujo, use `OPENCLAW_DEBUG_SSE=peek` para registrar los primeros cinco
eventos SSE redactados. El modo de código también falla de forma cerrada si el payload final del proveedor
no contiene exactamente `exec` y `wait` después de que se haya
activado la superficie del modo de código.

## Diseño de implementación

Unidades de implementación:

- contrato de configuración: `tools.codeMode`
- constructor del catálogo: herramientas efectivas para entradas compactas y mapa de ids
- adaptador de superficie del modelo: reemplazar herramientas visibles con `exec` y `wait`
- adaptador de tiempo de ejecución QuickJS-WASI: cargar, evaluar, instantánea, restaurar, eliminar
- supervisor del trabajador: tiempo de espera, aborto, aislamiento de fallos
- adaptador de puente: devoluciones de llamada del host seguras para JSON y entrega de resultados
- adaptador de transformación de TypeScript
- almacén de instantáneas: TTL, límites de tamaño, ámbito de ejecución/sesión
- proyección de trayectoria para llamadas a herramientas anidadas
- contadores de telemetría y diagnósticos

La implementación reutiliza los conceptos de catálogo y ejecutor de Tool Search, pero
no utiliza el hijo `node:vm` como el sandbox.

## Lista de verificación de validación

La cobertura del modo de código debe demostrar:

- la configuración deshabilitada deja la exposición de herramientas existente sin cambios
- la configuración de objeto sin `enabled: true` deja el modo de código deshabilitado
- la configuración habilitada expone solo `exec` y `wait` al modelo cuando las herramientas están
  activas para la ejecución
- las ejecuciones sin herramientas sin procesar, `disableTools` y las listas de permitidos vacías no activan la aplicación de carga
  del modo de código
- todas las herramientas efectivas aparecen en `ALL_TOOLS`
- las herramientas denegadas no aparecen en `ALL_TOOLS`
- `tools.search`, `tools.describe` y `tools.call` funcionan para las herramientas de OpenClaw
- las herramientas de control de Tool Search están ocultas tanto de la superficie del modelo como del catálogo
  oculto
- las llamadas anidadas conservan el comportamiento de aprobación y enlace
- el shell `exec` está oculto para el modelo pero se puede invocar mediante el ID del catálogo cuando se permite
- el modo de código recursivo `exec` y `wait` no se pueden invocar desde el código invitado
- la entrada de TypeScript se transforma y evalúa sin cargar TypeScript en
  rutas deshabilitadas o solo de JavaScript
- el acceso a `import`, `require`, sistema de archivos, red y entorno falla
- los bucles infinitos agotan el tiempo de espera y no pueden bloquear el Gateway
- los fallos de límite de memoria terminan la VM invitada
- los límites de salida e instantánea se aplican para las llamadas completadas y suspendidas
- `wait` reanuda una instantánea suspendida y devuelve el valor final
- los valores caducados, abortados, de sesión incorrecta y desconocidos de `runId` fallan
- la repetición y persistencia de la transcripción conservan las llamadas de control del modo de código
- la transcripción y la telemetría muestran claramente las llamadas a herramientas anidadas

## Plan de pruebas de extremo a extremo

Ejecute estas como pruebas de integración o de extremo a extremo al cambiar el tiempo de ejecución:

1. Inicie un Gateway con `tools.codeMode.enabled: false`.
2. Envíe un turno de agente con un conjunto de herramientas directo pequeño.
3. Afirmar que las herramientas visibles para el modelo no han cambiado.
4. Reiniciar con `tools.codeMode.enabled: true`.
5. Envíe un turno de agente con herramientas de prueba de OpenClaw, complemento, MCP y cliente.
6. Afirmar que la lista de herramientas visibles para el modelo es exactamente `exec`, `wait`.
7. En `exec`, lea `ALL_TOOLS` y afirme que las herramientas de prueba efectivas están presentes.
8. En `exec`, llame a `tools.search`, `tools.describe` y `tools.call`.
9. Afirmar que las herramientas denegadas están ausentes y no se pueden llamar mediante un ID adivinado.
10. Inicie una llamada a herramienta anidada que se resuelva después de que `exec` devuelva `waiting`.
11. Llame a `wait` y afirme que la VM restaurada recibe el resultado de la herramienta.
12. Afirmar que la respuesta final contiene el resultado producido después de la restauración.
13. Afirmar que el tiempo de espera, la interrupción y la caducidad de la instantánea limpian el estado de tiempo de ejecución.
14. Exporte la trayectoria y afirme que las llamadas anidadas son visibles bajo la llamada
    en modo de código principal.

Los cambios solo de documentación en esta página aún deben ejecutar `pnpm check:docs`.

## Relacionado

- [Búsqueda de herramientas](/es/tools/tool-search)
- [Tiempos de ejecución del agente](/es/concepts/agent-runtimes)
- [Herramienta Exec](/es/tools/exec)
- [Ejecución de código](/es/tools/code-execution)
