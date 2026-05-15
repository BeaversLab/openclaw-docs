---
summary: "Motor de contexto: ensamblaje de contexto conectable, compactación y ciclo de vida de subagentes"
read_when:
  - You want to understand how OpenClaw assembles model context
  - You are switching between the legacy engine and a plugin engine
  - You are building a context engine plugin
title: "Motor de contexto"
sidebarTitle: "Motor de contexto"
---

Un **motor de contexto** controla cómo OpenClaw construye el contexto del modelo para cada ejecución: qué mensajes incluir, cómo resumir el historial anterior y cómo gestionar el contexto a través de los límites de los subagentes.

OpenClaw incluye un motor `legacy` integrado y lo usa de forma predeterminada; la mayoría de los usuarios nunca necesitan cambiar esto. Instale y seleccione un motor complementario solo cuando desee un comportamiento diferente de ensamblaje, compactación o recuerdo entre sesiones.

## Quick start

<Steps>
  <Step title="Verifique qué motor está activo">
    ```bash
    openclaw doctor
    # or inspect config directly:
    cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
    ```
  </Step>
  <Step title="Instalar un motor complementario">
    Los complementos del motor de contexto se instalan como cualquier otro complemento de OpenClaw.

    <Tabs>
      <Tab title="Desde npm">
        ```bash
        openclaw plugins install @martian-engineering/lossless-claw
        ```
      </Tab>
      <Tab title="Desde una ruta local">
        ```bash
        openclaw plugins install -l ./my-context-engine
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="Habilitar y seleccionar el motor">
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

    Reinicie la puerta de enlace después de instalar y configurar.

  </Step>
  <Step title="Volver al heredado (opcional)">
    Establezca `contextEngine` en `"legacy"` (o elimine la clave por completo: `"legacy"` es el valor predeterminado).
  </Step>
</Steps>

## Cómo funciona

Cada vez que OpenClaw ejecuta un prompt de modelo, el motor de contexto participa en cuatro puntos del ciclo de vida:

<AccordionGroup>
  <Accordion title="1. Ingerir">Se llama cuando se agrega un nuevo mensaje a la sesión. El motor puede almacenar o indexar el mensaje en su propio almacén de datos.</Accordion>
  <Accordion title="2. Ensamblar">Se llama antes de cada ejecución del modelo. El motor devuelve un conjunto ordenado de mensajes (y un `systemPromptAddition` opcional) que caben dentro del presupuesto de tokens.</Accordion>
  <Accordion title="3. Compactar">Se llama cuando la ventana de contexto está llena o cuando el usuario ejecuta `/compact`. El motor resume el historial antiguo para liberar espacio.</Accordion>
  <Accordion title="4. Después del turno">Se llama después de que se completa una ejecución. El motor puede persistir el estado, activar la compactación en segundo plano o actualizar los índices.</Accordion>
</AccordionGroup>

Para el arnés de Codex no ACP incluido, OpenClaw aplica el mismo ciclo de vida al proyectar el contexto ensamblado en las instrucciones del desarrollador de Codex y el mensaje del turno actual. Codex sigue siendo dueño de su historial de subprocesos nativo y su compactador nativo.

### Ciclo de vida del subagente (opcional)

OpenClaw llama a dos ganchos opcionales del ciclo de vida del subagente:

<ParamField path="prepareSubagentSpawn" type="method">
  Prepare el estado de contexto compartido antes de que comience una ejecución secundaria. El enlace recibe las claves de sesión principal/secundaria, `contextMode` (`isolated` o `fork`), los ids/archivos de transcripción disponibles y un TTL opcional. Si devuelve un identificador de reversión, OpenClaw lo llama cuando la generación falla después de que la preparación tiene éxito.
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  Limpie cuando se complete o se elimine una sesión de subagente.
</ParamField>

### Adición del prompt del sistema

El método `assemble` puede devolver una cadena `systemPromptAddition`. OpenClaw antepone esto al mensaje del sistema para la ejecución. Esto permite a los motores inyectar orientación de recuerdo dinámico, instrucciones de recuperación o pistas conscientes del contexto sin requerir archivos de espacio de trabajo estáticos.

## El motor heredado

El motor `legacy` integrado conserva el comportamiento original de OpenClaw:

- **Ingesta**: no-op (el gestor de sesiones maneja la persistencia de mensajes directamente).
- **Ensamblar**: paso a través (la canalización existente de saneamiento → validación → límite en el tiempo de ejecución maneja el ensamblaje del contexto).
- **Compact**: delega en la compactación de resumen integrada, que crea un único resumen de los mensajes antiguos y mantiene los mensajes recientes intactos.
- **After turn**: no-op.

El motor heredado no registra herramientas ni proporciona un `systemPromptAddition`.

Cuando no se establece ningún `plugins.slots.contextEngine` (o está establecido en `"legacy"`), este motor se usa automáticamente.

## Motores de complementos

Un complemento puede registrar un motor de contexto utilizando la API de complementos:

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function register(api) {
  api.registerContextEngine("my-engine", (ctx) => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // Store the message in your data store
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget, availableTools, citationsMode }) {
      // Return messages that fit the budget
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },

    async compact({ sessionId, force }) {
      // Summarize older context
      return { ok: true, compacted: true };
    },
  }));
}
```

La fábrica `ctx` incluye valores opcionales `config`, `agentDir` y `workspaceDir` para que los complementos puedan inicializar el estado por agente o por espacio de trabajo antes de que se ejecute el primer enlace de ciclo de vida.

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

| Miembro            | Tipo      | Propósito                                                                    |
| ------------------ | --------- | ---------------------------------------------------------------------------- |
| `info`             | Propiedad | ID del motor, nombre, versión y si es propietario de la compactación         |
| `ingest(params)`   | Método    | Almacenar un solo mensaje                                                    |
| `assemble(params)` | Método    | Construir contexto para una ejecución del modelo (devuelve `AssembleResult`) |
| `compact(params)`  | Método    | Resumir/reducir contexto                                                     |

`assemble` devuelve un `AssembleResult` con:

<ParamField path="messages" type="Message[]" required>
  Los mensajes ordenados para enviar al modelo.
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  La estimación del motor del total de tokens en el contexto ensamblado. OpenClaw lo utiliza para decisiones de umbral de compactación e informes de diagnóstico.
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  Antepuesto al prompt del sistema.
</ParamField>
<ParamField path="promptAuthority" type='"assembled" | "preassembly_may_overflow"'>
  Controla qué estimación de tokens utiliza el ejecutor para las comprobaciones preventivas de desbordamiento. Por defecto es `"assembled"`, lo que significa que solo se verifica la estimación del prompt ensamblado, apropiado para motores que devuelven un contexto con ventana y autónomo. Establézcalo en `"preassembly_may_overflow"` solo cuando su vista ensamblada pueda ocultar el riesgo de
  desbordamiento en la transcripción subyacente; el ejecutor entonces toma el máximo de la estimación ensamblada y la estimación del historial de sesión pre-ensamblaje (sin ventana) al decidir si compactar preventivamente. De cualquier manera, los mensajes que devuelve son lo que el modelo ve: `promptAuthority` solo afecta la precomprobación.
</ParamField>

`compact` devuelve un `CompactResult`. Cuando la compactación rota la transcripción activa, `result.sessionId` y `result.sessionFile` identifican la sesión sucesora que el siguiente reintento o turno debe usar.

Miembros opcionales:

| Miembro                        | Tipo   | Propósito                                                                                                                                          |
| ------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | Método | Inicializar el estado del motor para una sesión. Se llama una vez cuando el motor ve una sesión por primera vez (por ejemplo, importar historial). |
| `ingestBatch(params)`          | Método | Ingerir un turno completado como un lote. Se llama después de que se completa una ejecución, con todos los mensajes de ese turno a la vez.         |
| `afterTurn(params)`            | Método | Trabajo del ciclo de vida posterior a la ejecución (persistir el estado, activar la compactación en segundo plano).                                |
| `prepareSubagentSpawn(params)` | Método | Configurar el estado compartido para una sesión secundaria antes de que comience.                                                                  |
| `onSubagentEnded(params)`      | Método | Limpiar después de que termina un subagente.                                                                                                       |
| `dispose()`                    | Método | Liberar recursos. Se llama durante el apagado de la puerta de enlace o la recarga del complemento; no por sesión.                                  |

### ownsCompaction

`ownsCompaction` controla si la compactación automática integrada de Pi dentro del intento permanece habilitada para la ejecución:

<AccordionGroup>
  <Accordion title="ownsCompaction: true">
    El motor es propietario del comportamiento de compactación. OpenClaw deshabilita la auto-compactación integrada de Pi para esa ejecución, y la implementación `compact()` del motor es responsable de `/compact`, la compactación de recuperación de desbordamiento y cualquier compactación proactiva que desee realizar en `afterTurn()`. OpenClaw aún puede ejecutar la salvaguarda de desbordamiento
    previa al aviso; cuando predice que la transcripción completa se desbordará, la ruta de recuperación llama al `compact()` del motor activo antes de enviar otro aviso.
  </Accordion>
  <Accordion title="ownsCompaction: false or unset">La auto-compactación integrada de Pi aún puede ejecutarse durante la ejecución del aviso, pero el método `compact()` del motor activo aún se llama para `/compact` y la recuperación de desbordamiento.</Accordion>
</AccordionGroup>

<Warning>`ownsCompaction: false` **no** significa que OpenClaw vuelva automáticamente a la ruta de compactación del motor heredado.</Warning>

Eso significa que hay dos patrones de complemento válidos:

<Tabs>
  <Tab title="Modo propietario">Implemente su propio algoritmo de compactación y configure `ownsCompaction: true`.</Tab>
  <Tab title="Modo de delegación">Configure `ownsCompaction: false` y haga que `compact()` llame a `delegateCompactionToRuntime(...)` de `openclaw/plugin-sdk/core` para utilizar el comportamiento de compactación integrado de OpenClaw.</Tab>
</Tabs>

Una operación nula `compact()` no es segura para un motor activo no propietario porque deshabilita el normal `/compact` y la ruta de compactación de recuperación de desbordamiento para esa ranura de motor.

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

<Note>
  La ranura es exclusiva en tiempo de ejecución; solo se resuelve un motor de contexto registrado para una ejecución u operación de compactación determinada. Otros complementos `kind: "context-engine"` habilitados aún pueden cargar y ejecutar su código de registro; `plugins.slots.contextEngine` solo selecciona qué ID de motor registrado resuelve OpenClaw cuando necesita un motor de contexto.
</Note>

<Note>**Desinstalación del complemento:** cuando desinstala el complemento seleccionado actualmente como `plugins.slots.contextEngine`, OpenClaw restablece la ranura al valor predeterminado (`legacy`). El mismo comportamiento de restablecimiento se aplica a `plugins.slots.memory`. No se requiere ninguna edición manual de la configuración.</Note>

## Relación con la compactación y la memoria

<AccordionGroup>
  <Accordion title="Compactación">La compactación es una de las responsabilidades del motor de contexto. El motor heredado delega en el resumen integrado de OpenClaw. Los motores de complemento pueden implementar cualquier estrategia de compactación (resúmenes DAG, recuperación vectorial, etc.).</Accordion>
  <Accordion title="Plugins de memoria">
    Los plugins de memoria (`plugins.slots.memory`) son independientes de los motores de contexto. Los plugins de memoria proporcionan búsqueda/recuperación; los motores de contexto controlan lo que ve el modelo. Pueden trabajar juntos: un motor de contexto podría usar datos de plugins de memoria durante el ensamblaje. Los motores de plugins que deseen la ruta del mensaje de memoria activa deben
    preferir `buildMemorySystemPromptAddition(...)` de `openclaw/plugin-sdk/core`, que convierte las secciones del mensaje de memoria activa en un `systemPromptAddition` listo para anteponer. Si un motor necesita un control de menor nivel, aún puede extraer líneas sin procesar de `openclaw/plugin-sdk/memory-host-core` a través de `buildActiveMemoryPromptSection(...)`.
  </Accordion>
  <Accordion title="Poda de sesión">El recorte de resultados de herramientas antiguos en memoria se sigue ejecutando independientemente de qué motor de contexto esté activo.</Accordion>
</AccordionGroup>

## Consejos

- Use `openclaw doctor` para verificar que su motor se esté cargando correctamente.
- Si cambia de motor, las sesiones existentes continúan con su historial actual. El nuevo motor se hace cargo de las ejecuciones futuras.
- Los errores del motor se registran y muestran en los diagnósticos. Si un motor de plugin falla al registrarse o no se puede resolver el id del motor seleccionado, OpenClaw no retrocede automáticamente; las ejecuciones fallan hasta que arregle el plugin o cambie `plugins.slots.contextEngine` de vuelta a `"legacy"`.
- Para el desarrollo, use `openclaw plugins install -l ./my-engine` para vincular un directorio de plugin local sin copiar.

## Relacionado

- [Compactación](/es/concepts/compaction) - resumiendo conversaciones largas
- [Contexto](/es/concepts/context) - cómo se construye el contexto para los turnos del agente
- [Arquitectura de plugins](/es/plugins/architecture) - registrando plugins de motor de contexto
- [Manifiesto del plugin](/es/plugins/manifest) - campos del manifiesto del plugin
- [Plugins](/es/tools/plugin) - descripción general de plugins
