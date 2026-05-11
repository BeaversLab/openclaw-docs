---
summary: "Superficie experimental del SDK para complementos que reemplazan el ejecutor de nivel bajo del agente integrado"
title: "Complementos de arnés de agente"
sidebarTitle: "Arnés de agente"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

Un **arnés de agente** es el ejecutor de bajo nivel para un turno de agente OpenClaw preparado. No es un proveedor de modelos, ni un canal, ni un registro de herramientas. Para el modelo mental orientado al usuario, consulte [Runtimes de agente](/es/concepts/agent-runtimes).

Utilice esta superficie solo para complementos nativos agrupados o de confianza. El contrato sigue siendo experimental porque los tipos de parámetros reflejan intencionalmente el ejecutor integrado actual.

## Cuándo usar un arnés

Registre un arnés de agente cuando una familia de modelos tenga su propio tiempo de ejecución de sesión nativo y el transporte normal del proveedor OpenClaw sea la abstracción incorrecta.

Ejemplos:

- un servidor nativo de agente de codificación que posee los subprocesos y la compactación
- un CLI local o un demonio que debe transmitir eventos nativos de planificación/razonamiento/herramienta
- un tiempo de ejecución de modelo que necesita su propio ID de reanudación además de la transcripción de sesión de OpenClaw

**No** registre un arnés solo para agregar una nueva API de LLM. Para APIs de modelos HTTP o WebSocket normales, cree un [complemento de proveedor](/es/plugins/sdk-provider-plugins).

## Lo que el núcleo todavía posee

Antes de que se seleccione un arnés, OpenClaw ya ha resuelto:

- proveedor y modelo
- estado de autenticación del tiempo de ejecución
- nivel de pensamiento y presupuesto de contexto
- el archivo de transcripción/sesión de OpenClaw
- espacio de trabajo, sandbox y política de herramientas
- devoluciones de llamada de respuesta del canal y devoluciones de llamada de transmisión
- política de reserva de modelo y cambio de modelo en vivo

Esa división es intencional. Un arnés ejecuta un intento preparado; no elige proveedores, no reemplaza la entrega del canal ni cambia modelos silenciosamente.

El intento preparado también incluye `params.runtimePlan`, un paquete de políticas propiedad de OpenClaw para decisiones de tiempo de ejecución que deben mantenerse compartidas entre arneses PI y nativos:

- `runtimePlan.tools.normalize(...)` y
  `runtimePlan.tools.logDiagnostics(...)` para la política de esquema de herramientas consciente del proveedor
- `runtimePlan.transcript.resolvePolicy(...)` para la política de saneamiento de transcripciones y
  reparación de llamadas a herramientas
- `runtimePlan.delivery.isSilentPayload(...)` para la supresión de entrega de `NO_REPLY` y medios compartidos
- `runtimePlan.outcome.classifyRunResult(...)` para la clasificación de reserva del modelo
- `runtimePlan.observability` para los metadatos del proveedor/modelo/arnés resueltos

Los arneses pueden usar el plan para decisiones que deben coincidir con el comportamiento de PI, pero
deben tratarlo todavía como un estado de intento propiedad del host. No lo muten ni lo usen para
cambiar proveedores/modelos dentro de un turno.

## Registrar un arnés

**Importar:** `openclaw/plugin-sdk/agent-harness`

```typescript
import type { AgentHarness } from "openclaw/plugin-sdk/agent-harness";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const myHarness: AgentHarness = {
  id: "my-harness",
  label: "My native agent harness",

  supports(ctx) {
    return ctx.provider === "my-provider" ? { supported: true, priority: 100 } : { supported: false };
  },

  async runAttempt(params) {
    // Start or resume your native thread.
    // Use params.prompt, params.tools, params.images, params.onPartialReply,
    // params.onAgentEvent, and the other prepared attempt fields.
    return await runMyNativeTurn(params);
  },
};

export default definePluginEntry({
  id: "my-native-agent",
  name: "My Native Agent",
  description: "Runs selected models through a native agent daemon.",
  register(api) {
    api.registerAgentHarness(myHarness);
  },
});
```

## Política de selección

OpenClaw elige un arnés después de la resolución del proveedor/modelo:

1. El id de arnés registrado de una sesión existente tiene prioridad, por lo que los cambios de configuración/entorno no
   cambian dinámicamente esa transcripción a otro tiempo de ejecución.
2. `OPENCLAW_AGENT_RUNTIME=<id>` fuerza un arnés registrado con ese id para
   sesiones que aún no están fijadas.
3. `OPENCLAW_AGENT_RUNTIME=pi` fuerza el arnés PI integrado.
4. `OPENCLAW_AGENT_RUNTIME=auto` pregunta a los arneses registrados si admiten el
   proveedor/modelo resuelto.
5. Si ningún arnés registrado coincide, OpenClaw usa PI a menos que la reserva de PI esté
   deshabilitada.

Los fallos del arnés del complemento aparecen como fallos de ejecución. En el modo `auto`, la reserva de PI se
usa solo cuando ningún arnés de complemento registrado admite el proveedor/modelo
resuelto. Una vez que un arnés de complemento ha reclamado una ejecución, OpenClaw no
reproduce ese mismo turno a través de PI porque eso puede cambiar la semántica de autenticación/tiempo de ejecución
o duplicar efectos secundarios.

El id de arnés seleccionado se persiste con el id de sesión después de una ejecución integrada.
Las sesiones heredadas creadas antes de los pines de arnés se tratan como fijadas a PI una vez que
tienen historial de transcripciones. Use una sesión nueva/restablecida al cambiar entre PI y un
arnés de complemento nativo. `/status` muestra ids de arnés no predeterminados como `codex`
junto a `Fast`; PI permanece oculto porque es la ruta de compatibilidad predeterminada.
Si el arnés seleccionado es sorprendente, habilite el registro de depuración `agents/harness` e
inspeccione el registro estructurado `agent harness selected` de la puerta de enlace. Incluye
el id de arnés seleccionado, la razón de selección, la política de tiempo de ejecución/reserva y, en
el modo `auto`, el resultado de soporte de cada candidato de complemento.

El complemento Codex incluido registra `codex` como su id de harness. Core lo trata
como un id de harness de complemento normal; los alias específicos de Codex pertenecen a la configuración
del complemento o del operador, no al selector de tiempo de ejecución compartido.

## Emparejamiento de proveedor y harness

La mayoría de los harnesses también deben registrar un proveedor. El proveedor hace visibles las referencias de modelo,
el estado de autenticación, los metadatos del modelo y la selección de `/model` para el resto de
OpenClaw. El harness luego reclama ese proveedor en `supports(...)`.

El complemento Codex incluido sigue este patrón:

- referencias de modelo de usuario preferidas: `openai/gpt-5.5` más
  `agentRuntime.id: "codex"`
- referencias de compatibilidad: las referencias heredadas de `codex/gpt-*` siguen siendo aceptadas, pero las
  nuevas configuraciones no deberían usarlas como referencias normales de proveedor/modelo
- id de harness: `codex`
- auth: disponibilidad de proveedor sintético, porque el harness de Codex posee el
  inicio de sesión/sesión nativo de Codex
- solicitud de app-server: OpenClaw envía el id del modelo básico a Codex y permite que el
  harness hable con el protocolo nativo de app-server

El complemento Codex es aditivo. Las referencias simples de `openai/gpt-*` continúan usando la
ruta de proveedor normal de OpenClaw a menos que fuerce el harness de Codex con
`agentRuntime.id: "codex"`. Las referencias antiguas de `codex/gpt-*` todavía seleccionan el
proveedor y el harness de Codex para la compatibilidad.

Para la configuración del operador, ejemplos de prefijos de modelo y configuraciones solo de Codex, consulte
[Codex Harness](/es/plugins/codex-harness).

OpenClaw requiere Codex app-server `0.125.0` o más reciente. El complemento Codex verifica
el handshake de inicialización del app-server y bloquea servidores más antiguos o sin versión para que
OpenClaw solo se ejecute contra la superficie del protocolo con la que ha sido probado. El
piso de `0.125.0` incluye el soporte nativo de payload de hook de MCP que llegó en
Codex `0.124.0`, mientras que fija OpenClaw a la línea estable más reciente probada.

### Middleware de resultados de herramientas

Los complementos agrupados pueden adjuntar middleware de resultados de herramientas neutral al runtime a través de
`api.registerAgentToolResultMiddleware(...)` cuando su manifiesto declara los
ids del runtime objetivo en `contracts.agentToolResultMiddleware`. Esta costura
de confianza es para transformaciones asincrónicas de resultados de herramientas que deben ejecutarse antes de que PI o Codex alimente
la salida de la herramienta de vuelta al modelo.

Los complementos agrupados heredados aún pueden usar
`api.registerCodexAppServerExtensionFactory(...)` para middleware
solo del servidor de aplicaciones de Codex, pero las nuevas transformaciones de resultados deberían usar la API neutral al runtime.
El enlace solo para Pi `api.registerEmbeddedExtensionFactory(...)` se ha eliminado;
las transformaciones de resultados de herramientas de Pi deben usar middleware neutral al runtime.

### Clasificación de resultados terminales

Los arneses nativos que poseen su propia proyección de protocolo pueden usar
`classifyAgentHarnessTerminalOutcome(...)` de
`openclaw/plugin-sdk/agent-harness-runtime` cuando un turno completado no produjo
texto de asistente visible. El auxiliar devuelve `empty`, `reasoning-only` o
`planning-only` para que la política de reserva de OpenClaw pueda decidir si reintentar en un
modelo diferente. Intencionalmente deja errores de solicitud, turnos en vuelo y
respuestas silenciosas intencionales como `NO_REPLY` sin clasificar.

### Modo de arnés nativo de Codex

El arnés `codex` agrupado es el modo nativo de Codex para turnos de
agente de OpenClaw integrados. Habilite primero el complemento `codex` agrupado e incluya `codex` en
`plugins.allow` si su configuración usa una lista de permitidos restrictiva. Las configuraciones nativas del servidor de aplicaciones
deben usar `openai/gpt-*` con `agentRuntime.id: "codex"`.
Use `openai-codex/*` para Codex OAuth a través de PI en su lugar. Las referencias
`codex/*` de modelo heredadas siguen siendo alias de compatibilidad para el arnés nativo.

Cuando se ejecuta este modo, Codex es propietario del id de hilo nativo, el comportamiento de reanudación, la compactación y la ejecución del servidor de aplicaciones. OpenClaw sigue siendo propietario del canal de chat, el espejo de transcripción visible, la política de herramientas, las aprobaciones, la entrega de medios y la selección de sesión. Use `agentRuntime.id: "codex"` sin una anulación de `fallback` cuando necesite demostrar que solo la ruta del servidor de aplicaciones de Codex puede reclamar la ejecución. Los tiempos de ejecución de complementos explícitos ya fallan de forma cerrada de manera predeterminada. Establezca `fallback: "pi"` solo cuando intencionalmente desee que PI maneje la selección de arnés faltante. Los fallos del servidor de aplicaciones de Codex ya fallan directamente en lugar de reintentar a través de PI.

## Deshabilitar la reserva de PI

De manera predeterminada, OpenClaw ejecuta agentes integrados con `agents.defaults.agentRuntime` establecido en `{ id: "auto", fallback: "pi" }`. En el modo `auto`, los arneses de complementos registrados pueden reclamar un par de proveedor/modelo. Si ninguno coincide, OpenClaw recurre a PI.

En el modo `auto`, establezca `fallback: "none"` cuando necesite que la falta de selección de arnés de complemento falle en lugar de usar PI. Los tiempos de ejecución de complementos explícitos, como `runtime: "codex"`, ya fallan de forma cerrada de manera predeterminada, a menos que `fallback: "pi"` se establezca en el mismo ámbito de anulación de configuración o entorno. Los fallos de arnés de complemento seleccionado siempre fallan abruptamente. Esto no bloquea un `runtime: "pi"` o `OPENCLAW_AGENT_RUNTIME=pi` explícito.

Para ejecuciones integradas solo de Codex:

```json
{
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5",
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

Si desea que cualquier arnés de complemento registrado reclame modelos coincidentes pero nunca desea que OpenClaw recurra silenciosamente a PI, mantenga `runtime: "auto"` y deshabilite la reserva:

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto",
        "fallback": "none"
      }
    }
  }
}
```

Las anulaciones por agente usan la misma forma:

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "auto",
        "fallback": "pi"
      }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "agentRuntime": {
          "id": "codex",
          "fallback": "none"
        }
      }
    ]
  }
}
```

`OPENCLAW_AGENT_RUNTIME` aún anula el tiempo de ejecución configurado. Use `OPENCLAW_AGENT_HARNESS_FALLBACK=none` para deshabilitar la reserva de PI desde el entorno.

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

Con la reserva deshabilitada, una sesión falla temprano cuando el arnés solicitado no está registrado, no es compatible con el proveedor/modelo resuelto, o falla antes de producir efectos secundarios del turno. Eso es intencional para implementaciones solo de Codex y para pruebas en vivo que deben demostrar que la ruta del servidor de aplicaciones de Codex está realmente en uso.

Esta configuración solo controla el arnés del agente integrado. No deshabilita el enrutamiento de modelos específicos del proveedor para imágenes, video, música, TTS, PDF u otros.

## Espejo de sesiones nativas y transcripciones

Un arnés puede mantener un id de sesión nativo, un id de hilo o un token de reanudación del lado del demonio.
Mantenga ese enlace explícitamente asociado con la sesión de OpenClaw y siga
reflejando la salida del asistente/herramienta visible para el usuario en la transcripción de OpenClaw.

La transcripción de OpenClaw sigue siendo la capa de compatibilidad para:

- historial de sesión visible en el canal
- búsqueda e indexación de transcripciones
- volver al arnés PI integrado en un turno posterior
- comportamiento genérico de `/new`, `/reset` y eliminación de sesión

Si su arnés almacena un enlace adjunto, implemente `reset(...)` para que OpenClaw pueda
limpiarlo cuando se restablezca la sesión de OpenClaw propietaria.

## Resultados de herramientas y medios

Core construye la lista de herramientas de OpenClaw y la pasa al intento preparado.
Cuando un arnés ejecuta una llamada a herramienta dinámica, devuelva el resultado de la herramienta a través
del formulario de resultado del arnés en lugar de enviar medios del canal usted mismo.

Esto mantiene los resultados de texto, imagen, video, música, TTS, aprobación y herramientas de mensajería
en la misma ruta de entrega que las ejecuciones respaldadas por PI.

## Limitaciones actuales

- La ruta de importación pública es genérica, pero algunos alias de tipo de intento/resultado todavía
  llevan nombres `Pi` por compatibilidad.
- La instalación de arnés de terceros es experimental. Prefiera complementos de proveedor
  hasta que necesite un tiempo de ejecución de sesión nativo.
- El cambio de arnés es compatible entre turnos. No cambie de arnés en el
  medio de un turno después de que hayan comenzado las herramientas nativas, aprobaciones, texto del asistente o envío
  de mensajes.

## Relacionado

- [Descripción general del SDK](/es/plugins/sdk-overview)
- [Auxiliares de tiempo de ejecución](/es/plugins/sdk-runtime)
- [Complementos de proveedor](/es/plugins/sdk-provider-plugins)
- [Arnés de Codex](/es/plugins/codex-harness)
- [Proveedores de modelos](/es/concepts/model-providers)
