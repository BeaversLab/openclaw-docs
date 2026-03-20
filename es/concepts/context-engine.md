---
summary: "Context engine: pluggable context assembly, compaction, and subagent lifecycle"
read_when:
  - Quieres entender cómo OpenClaw ensambla el contexto del modelo
  - Estás cambiando entre el motor heredado y un motor de complemento
  - Estás construyendo un complemento de motor de contexto
title: "Context Engine"
---

# Context Engine

Un **context engine** controla cómo OpenClaw construye el contexto del modelo para cada ejecución.
Decide qué mensajes incluir, cómo resumir el historial antiguo y cómo
gestionar el contexto a través de los límites del subagente.

OpenClaw incluye un motor `legacy` incorporado. Los complementos pueden registrar
motores alternativos que reemplazan el ciclo de vida del motor de contexto activo.

## Quick start

Verificar qué motor está activo:

```bash
openclaw doctor
# or inspect config directly:
cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
```

### Installing a context engine plugin

Los complementos del motor de contexto se instalan como cualquier otro complemento de OpenClaw. Instala
primero, luego selecciona el motor en la ranura:

```bash
# Install from npm
openclaw plugins install @martian-engineering/lossless-claw

# Or install from a local path (for development)
openclaw plugins install -l ./my-context-engine
```

Luego habilita el complemento y selecciónalo como el motor activo en tu configuración:

```json5
// openclaw.json
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw", // must match the plugin's registered engine id
    },
    entries: {
      "lossless-claw": {
        enabled: true,
        // Plugin-specific config goes here (see the plugin's docs)
      },
    },
  },
}
```

Reinicia la puerta de enlace después de instalar y configurar.

Para volver al motor incorporado, establece `contextEngine` en `"legacy"` (o
elimina la clave por completo — `"legacy"` es el predeterminado).

## How it works

Cada vez que OpenClaw ejecuta un prompt de modelo, el motor de contexto participa en
cuatro puntos del ciclo de vida:

1. **Ingest** — se llama cuando se agrega un nuevo mensaje a la sesión. El motor
   puede almacenar o indexar el mensaje en su propio almacén de datos.
2. **Assemble** — se llama antes de cada ejecución del modelo. El motor devuelve un conjunto
   ordenado de mensajes (y un `systemPromptAddition` opcional) que caben dentro
   del presupuesto de tokens.
3. **Compact** — se llama cuando la ventana de contexto está llena, o cuando el usuario ejecuta
   `/compact`. El motor resume el historial antiguo para liberar espacio.
4. **After turn** — se llama después de que se completa una ejecución. El motor puede persistir el estado,
   activar la compactación en segundo plano o actualizar los índices.

### Subagent lifecycle (optional)

OpenClaw actualmente llama a un gancho del ciclo de vida del subagente:

- **onSubagentEnded** — limpiar cuando se completa o se elimina una sesión de subagente.

El gancho `prepareSubagentSpawn` es parte de la interfaz para uso futuro, pero
el tiempo de ejecución aún no lo invoca.

### System prompt addition

El método `assemble` puede devolver una cadena `systemPromptAddition`. OpenClaw
antepone esto al prompt del sistema para la ejecución. Esto permite a los motores inyectar
orientación de recuperación dinámica, instrucciones de recuperación o sugerencias conscientes del contexto
sin requerir archivos de espacio de trabajo estáticos.

## El motor heredado

El motor integrado `legacy` conserva el comportamiento original de OpenClaw:

- **Ingest**: no-op (el administrador de sesiones maneja la persistencia de mensajes directamente).
- **Assemble**: paso a través (la canalización de saneamiento → validación → límite existente
  en el tiempo de ejecución maneja el ensamblaje del contexto).
- **Compact**: delega en la compactación de resumen integrada, que crea
  un solo resumen de los mensajes más antiguos y mantiene los mensajes recientes intactos.
- **After turn**: no-op.

El motor heredado no registra herramientas ni proporciona un `systemPromptAddition`.

Cuando no se establece ningún `plugins.slots.contextEngine` (o se establece en `"legacy"`), este
motor se usa automáticamente.

## Motores de complementos

Un complemento puede registrar un motor de contexto usando la API de complementos:

```ts
export default function register(api) {
  api.registerContextEngine("my-engine", () => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // Store the message in your data store
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget }) {
      // Return messages that fit the budget
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: "Use lcm_grep to search history...",
      };
    },

    async compact({ sessionId, force }) {
      // Summarize older context
      return { ok: true, compacted: true };
    },
  }));
}
```

Luego habilítelo en la configuración:

```json5
{
  plugins: {
    slots: {
      contextEngine: "my-engine",
    },
    entries: {
      "my-engine": {
        enabled: true,
      },
    },
  },
}
```

### La interfaz ContextEngine

Miembros requeridos:

| Miembro             | Tipo     | Propósito                                                  |
| ------------------ | -------- | -------------------------------------------------------- |
| `info`             | Propiedad | ID del motor, nombre, versión y si posee la compactación |
| `ingest(params)`   | Método   | Almacenar un solo mensaje                                   |
| `assemble(params)` | Método   | Construir contexto para una ejecución de modelo (devuelve `AssembleResult`) |
| `compact(params)`  | Método   | Resumir/reducir contexto                                 |

`assemble` devuelve un `AssembleResult` con:

- `messages` — los mensajes ordenados para enviar al modelo.
- `estimatedTokens` (requerido, `number`) — el estimación del motor del total
  de tokens en el contexto ensamblado. OpenClaw usa esto para decisiones de umbral
  de compactación e informes de diagnóstico.
- `systemPromptAddition` (opcional, `string`) — antepuesto al prompt del sistema.

Miembros opcionales:

| Miembro                         | Tipo   | Propósito                                                                                                         |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | Método | Inicializar el estado del motor para una sesión. Se llama una vez cuando el motor ve una sesión por primera vez (p. ej., importar historial). |
| `ingestBatch(params)`          | Método | Incorporar un turno completado como un lote. Se llama después de que finaliza una ejecución, con todos los mensajes de ese turno a la vez.     |
| `afterTurn(params)`            | Método | Trabajo del ciclo de vida posterior a la ejecución (persistir el estado, activar la compactación en segundo plano).                                         |
| `prepareSubagentSpawn(params)` | Método | Configurar el estado compartido para una sesión secundaria.                                                                        |
| `onSubagentEnded(params)`      | Método | Limpiar después de que finaliza un subagente.                                                                                 |
| `dispose()`                    | Método | Liberar recursos. Se llama durante el apagado de la puerta de enlace o la recarga del complemento; no por sesión.                           |

### ownsCompaction

`ownsCompaction` controla si la autocompactación integrada en el intento de Pi permanece habilitada para la ejecución:

- `true` — el motor es propietario del comportamiento de compactación. OpenClaw deshabilita la autocompactación integrada de Pi para esa ejecución, y la implementación `compact()` del motor es responsable de `/compact`, la compactación de recuperación de desbordamiento y cualquier compactación proactiva que desee realizar en `afterTurn()`.
- `false` o sin establecer — la autocompactación integrada de Pi aún puede ejecutarse durante la ejecución del prompt, pero el método `compact()` del motor activo todavía se llama para `/compact` y la recuperación de desbordamiento.

`ownsCompaction: false` **no** significa que OpenClaw recurra automáticamente a la ruta de compactación del motor heredado.

Eso significa que hay dos patrones de complementos válidos:

- **Modo propietario** — implemente su propio algoritmo de compactación y configure `ownsCompaction: true`.
- **Modo de delegación** — configure `ownsCompaction: false` y haga que `compact()` llame a `delegateCompactionToRuntime(...)` de `openclaw/plugin-sdk/core` para usar el comportamiento de compactación integrado de OpenClaw.

Una operación nula `compact()` no es segura para un motor activo no propietario porque deshabilita la ruta de compactación normal `/compact` y de recuperación de desbordamiento para esa ranura de motor.

## Referencia de configuración

```json5
{
  plugins: {
    slots: {
      // Select the active context engine. Default: "legacy".
      // Set to a plugin id to use a plugin engine.
      contextEngine: "legacy",
    },
  },
}
```

El espacio es exclusivo en tiempo de ejecución; solo se resuelve un motor de contexto registrado para una ejecución u operación de compactación determinada. Otros complementos `kind: "context-engine"` habilitados aún pueden cargar y ejecutar su código de registro; `plugins.slots.contextEngine` solo selecciona qué ID de motor registrado resuelve OpenClaw cuando necesita un motor de contexto.

## Relación con la compactación y la memoria

- **Compactación** es una responsabilidad del motor de contexto. El motor heredado delega en el resumen integrado de OpenClaw. Los motores de complemento pueden implementar cualquier estrategia de compactación (resúmenes DAG, recuperación vectorial, etc.).
- Los **Complementos de memoria** (`plugins.slots.memory`) son independientes de los motores de contexto. Los complementos de memoria proporcionan búsqueda/recuperación; los motores de contexto controlan lo que el modelo ve. Pueden trabajar juntos: un motor de contexto podría usar datos de complementos de memoria durante el ensamblaje.
- **Poda de sesión** (recortar resultados de herramientas antiguos en memoria) todavía se ejecuta independientemente de qué motor de contexto esté activo.

## Consejos

- Use `openclaw doctor` para verificar que su motor se esté cargando correctamente.
- Si cambia de motores, las sesiones existentes continúan con su historial actual. El nuevo motor se hace cargo de ejecuciones futuras.
- Los errores del motor se registran y se muestran en los diagnósticos. Si un motor de complemento no logra registrarse o el ID del motor seleccionado no se puede resolver, OpenClaw no retrocede automáticamente; las ejecuciones fallan hasta que repare el complemento o cambie `plugins.slots.contextEngine` de nuevo a `"legacy"`.
- Para el desarrollo, use `openclaw plugins install -l ./my-engine` para vincular un directorio de complementos local sin copiar.

Vea también: [Compactación](/es/concepts/compaction), [Contexto](/es/concepts/context),
[Complementos](/es/tools/plugin), [Manifiesto de complemento](/es/plugins/manifest).

import en from "/components/footer/en.mdx";

<en />
