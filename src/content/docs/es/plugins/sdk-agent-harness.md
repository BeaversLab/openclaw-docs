---
summary: "Superficie experimental del SDK para complementos que reemplazan el ejecutor de nivel bajo del agente integrado"
title: "Complementos de arnés de agente"
sidebarTitle: "Arnés de agente"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

Un **agente harness** es el ejecutor de bajo nivel para un turno de agente
OpenClaw preparado. No es un proveedor de modelos, ni un canal, ni un
registro de herramientas. Para el modelo mental orientado al usuario,
consulte [Runtimes de agentes](/es/concepts/agent-runtimes).

Utilice esta superficie solo para complementos nativos agrupados o de confianza. El contrato sigue siendo experimental porque los tipos de parámetros reflejan intencionalmente el ejecutor integrado actual.

## Cuándo usar un arnés

Registre un arnés de agente cuando una familia de modelos tenga su propio tiempo de ejecución de sesión nativo y el transporte normal del proveedor OpenClaw sea la abstracción incorrecta.

Ejemplos:

- un servidor nativo de agente de codificación que posee los subprocesos y la compactación
- un CLI local o un demonio que debe transmitir eventos nativos de planificación/razonamiento/herramienta
- un tiempo de ejecución de modelo que necesita su propio ID de reanudación además de la transcripción de sesión de OpenClaw

No\*\* registre un harness solo para añadir una nueva API de LLM. Para APIs de
modelos HTTP o WebSocket normales, cree un [plugin de proveedor](/es/plugins/sdk-provider-plugins).

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

El intento preparado también incluye `params.runtimePlan`, un paquete de
políticas propiedad de OpenClaw para decisiones de tiempo de ejecución que deben
permanecer compartidas entre OpenClaw y los harnesses nativos:

- `runtimePlan.tools.normalize(...)` y
  `runtimePlan.tools.logDiagnostics(...)` para la política de esquema de herramientas consciente del proveedor
- `runtimePlan.transcript.resolvePolicy(...)` para la política de saneamiento de transcripciones y
  reparación de llamadas a herramientas
- `runtimePlan.delivery.isSilentPayload(...)` para la supresión de entrega de `NO_REPLY` y medios compartidos
- `runtimePlan.outcome.classifyRunResult(...)` para la clasificación de reserva del modelo
- `runtimePlan.observability` para los metadatos del proveedor/modelo/arnés resueltos

Los harnesses pueden usar el plan para decisiones que deben coincidir con el
comportamiento de OpenClaw, pero aún deben tratarlo como un estado de intento
del propietario del host. No lo mute ni lo use para cambiar proveedores/modelos
dentro de un turno.

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

1. La política de runtime con ámbito de modelo tiene prioridad.
2. A continuación, la política de runtime con ámbito de proveedor.
3. `auto` pregunta a los harnesses registrados si admiten el
   proveedor/modelo resuelto.
4. Si no coincide ningún harness registrado, OpenClaw usa su tiempo de ejecución
   integrado.

Los fallos del arnés del complemento se manifiestan como fallos de ejecución. En el modo `auto`, la reserva integrada (fallback)
solo se usa cuando ningún arnés de complemento registrado admite el
proveedor/modelo resuelto. Una vez que un arnés de complemento ha reclamado una ejecución, OpenClaw no
reproduce ese mismo turno a través de otro tiempo de ejecución porque eso puede cambiar
la semántica de autenticación/tiempo de ejecución o duplicar efectos secundarios.

Las fijaciones de runtime de toda la sesión y de todo el agente se ignoran en la
selección. Eso incluye los valores obsoletos de sesión `agentHarnessId`,
`agents.defaults.agentRuntime`, `agents.list[].agentRuntime` y `OPENCLAW_AGENT_RUNTIME`. `/status` muestra
el runtime efectivo seleccionado desde la ruta del proveedor/modelo.
Si el harness seleccionado es sorprendente, habilite el registro de depuración
`agents/harness` e inspeccione el registro estructurado `agent harness selected` de la
gateway. Incluye el id del harness seleccionado, el motivo de selección,
la política de runtime/recuperación alternativa y, en el modo
`auto`, el resultado de soporte de cada candidato de plugin.

El plugin Codex incluido registra `codex` como su id de harness. Core lo
dealata como un id de harness de plugin ordinario; los alias específicos de Codex
pertenecen a la configuración del plugin o del operador, no al selector de
runtime compartido.

## Emparejamiento de proveedor más harness

La mayoría de los harnesses también deben registrar un proveedor. El proveedor hace
que las referencias de modelos, el estado de autenticación, los metadatos del
modelo y la selección `/model` sean visibles para el resto de OpenClaw.
El harness luego reclama ese proveedor en `supports(...)`.

El plugin Codex incluido sigue este patrón:

- preferencias de modelo de usuario: `openai/gpt-5.5`
- referencias de compatibilidad: las referencias `codex/gpt-*` heredadas siguen siendo aceptadas, pero las nuevas
  configuraciones no deben usarlas como referencias normales de proveedor/modelo
- id del arnés: `codex`
- autenticación: disponibilidad de proveedor sintético, ya que el arnés Codex es el propietario del
  inicio de sesión/sesión nativa de Codex
- solicitud de servidor de aplicaciones: OpenClaw envía el id del modelo simple a Codex y permite que
  el arnés hable con el protocolo nativo del servidor de aplicaciones

El complemento Codex es aditivo. Las referencias de agente `openai/gpt-*` simples en el proveedor
oficial de OpenAI seleccionan el arnés Codex de forma predeterminada. Las referencias `codex/gpt-*` más antiguas
siguen seleccionando el proveedor y arnés Codex para compatibilidad.

Para la configuración del operador, ejemplos de prefijos de modelo y
configuraciones exclusivas de Codex, consulte [Codex Harness](/es/plugins/codex-harness).

OpenClaw requiere el servidor de aplicaciones Codex `0.125.0` o más reciente. El complemento Codex verifica
el protocolo de enlace de inicialización del servidor de aplicaciones y bloquea los servidores más antiguos o sin versión para que
OpenClaw solo se ejecute contra la superficie del protocolo con la que ha sido probado. El
piso `0.125.0` incluye el soporte nativo de carga útil de enlace MCP que llegó en
Codex `0.124.0`, al fijar OpenClaw a la línea estable probada más reciente.

### Middleware de resultados de herramientas

Los complementos integrados pueden adjuntar middleware de resultados de herramientas neutral al tiempo de ejecución a través de
`api.registerAgentToolResultMiddleware(...)` cuando su manifiesto declara los
ids de tiempo de ejecución objetivo en `contracts.agentToolResultMiddleware`. Esta costura de confianza es
para transformaciones asincrónicas de resultados de herramientas que deben ejecutarse antes de que OpenClaw o Codex introduzca
la salida de la herramienta de nuevo en el modelo.

Los complementos empaquetados heredados todavía pueden usar
`api.registerCodexAppServerExtensionFactory(...)` para el middleware solo del
servidor de aplicaciones de Codex, pero las nuevas transformaciones de resultados deben usar la API neutral al tiempo de ejecución.
El enlace `api.registerEmbeddedExtensionFactory(...)` solo para el ejecutor incrustado se ha eliminado;
las transformaciones de resultados de herramientas incrustadas deben usar el middleware neutral al tiempo de ejecución.

### Clasificación de resultados terminales

Los arneses nativos que poseen su propia proyección de protocolo pueden usar
`classifyAgentHarnessTerminalOutcome(...)` de
`openclaw/plugin-sdk/agent-harness-runtime` cuando un turno completado no produjo
texto de asistente visible. El asistente devuelve `empty`, `reasoning-only` o
`planning-only` para que la política de reserva de OpenClaw pueda decidir si reintentar con un
modelo diferente. Intencionalmente deja los errores del prompt, los turnos en curso y
las respuestas silenciosas intencionales como `NO_REPLY` sin clasificar.

### Modo de arnés nativo de Codex

El harness `codex` incluido es el modo nativo Codex para turnos de
agente OpenClaw integrados. Habilite primero el plugin `codex` incluido e incluya
`codex` en `plugins.allow` si su configuración usa una lista de
permitidos restrictiva. Las configuraciones de servidor de aplicaciones nativas
deben usar `openai/gpt-*`; los turnos de agente OpenAI seleccionan el harness
Codex de manera predeterminada. Las rutas de referencias de modelos Codex heredadas
deben repararse con `openclaw doctor --fix`, y las referencias de modelos
`codex/*` heredadas siguen siendo alias de compatibilidad para el
harness nativo.

Cuando se ejecuta este modo, Codex posee el id de subproceso nativo, el
comportamiento de reanudación, la compactación y la ejecución del servidor de
aplicaciones. OpenClaw sigue siendo el propietario del canal de chat, el espejo
de transcripción visible, la política de herramientas, las aprobaciones, la
entrega de medios y la selección de sesión. Use el proveedor/modelo
`agentRuntime.id: "codex"` cuando necesite demostrar que solo la ruta del servidor de
aplicaciones de Codex puede reclamar la ejecución. Los tiempos de ejecución de
plugins explícitos fallan cerrados; los errores de selección del servidor de
aplicaciones de Codex y los fallos del tiempo de ejecución no se reintentan a
través de otro tiempo de ejecución.

## Estrictitud del tiempo de ejecución

De manera predeterminada, OpenClaw utiliza la política de tiempo de ejecución de
proveedor/modelo `auto`: los harnesses de plugins registrados pueden
reclamar un par proveedor/modelo, y el tiempo de ejecución integrado maneja el
turno cuando ninguno coincide. Las referencias de agente OpenAI en el proveedor
oficial de OpenAI son predeterminadas para Codex. Use un tiempo de ejecución de
plugin de proveedor/modelo explícito como `agentRuntime.id: "codex"` cuando la selección
de harness faltante debería fallar en lugar de enrutar a través del tiempo de
ejecución integrado. Los fallos del harness de plugin seleccionado siempre fallan
de manera estricta. Esto no bloquea un proveedor/modelo explícito
`agentRuntime.id: "openclaw"`.

Para ejecuciones integradas solo de Codex:

```json
{
  "models": {
    "providers": {
      "openai": {
        "agentRuntime": {
          "id": "codex"
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "model": "openai/gpt-5.5"
    }
  }
}
```

Si desea un backend de CLI para un modelo canónico, ponga el tiempo de ejecución en esa
entrada de modelo:

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus-4-8",
      "models": {
        "anthropic/claude-opus-4-8": {
          "agentRuntime": {
            "id": "claude-cli"
          }
        }
      }
    }
  }
}
```

Las anulaciones por agente utilizan la misma forma con alcance de modelo:

```json
{
  "agents": {
    "list": [
      {
        "id": "codex-only",
        "model": "openai/gpt-5.5",
        "models": {
          "openai/gpt-5.5": {
            "agentRuntime": { "id": "codex" }
          }
        }
      }
    ]
  }
}
```

Se ignoran los ejemplos de tiempo de ejecución de agente heredados como este:

```json
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

Con un tiempo de ejecución de complemento explícito, una sesión falla temprano cuando el harness
solicitado no está registrado, no es compatible con el proveedor/modelo resuelto, o
falla antes de producir efectos secundarios de turno. Eso es intencional para despliegues
solo de Codex y para pruebas en vivo que deben demostrar que la ruta del servidor de aplicaciones
Codex está realmente en uso.

Esta configuración solo controla el harness del agente integrado. No deshabilita
el enrutamiento de modelos específicos del proveedor para imágenes, video, música, TTS, PDF u otros.

## Sesiones nativas y espejo de transcripción

Un harness puede mantener un id de sesión nativo, un id de hilo, o un token de reanudación del lado del demonio.
Mantenga esa vinculación explícitamente asociada con la sesión de OpenClaw, y mantenga
el espejo de la salida del asistente/herramienta visible para el usuario en la transcripción de OpenClaw.

La transcripción de OpenClaw sigue siendo la capa de compatibilidad para:

- historial de sesión visible para el canal
- búsqueda e indexación de transcripciones
- volver al arnés integrado de OpenClaw en un turno posterior
- comportamiento genérico de `/new`, `/reset` y eliminación de sesión

Si su arnés almacena un enlace asociado (sidecar binding), implemente `reset(...)` para que OpenClaw pueda limpiarlo cuando se restablezca la sesión de OpenClaw propietaria.

## Resultados de herramientas y medios

Core construye la lista de herramientas de OpenClaw y la pasa al intento preparado.
Cuando un harness ejecuta una llamada a herramienta dinámica, devuelva el resultado de la herramienta a través de
la forma de resultado del harness en lugar de enviar medios del canal usted mismo.

Esto mantiene los resultados de texto, imagen, video, música, TTS, aprobaciones y herramientas de mensajería en la misma ruta de entrega que las ejecuciones respaldadas por OpenClaw.

## Limitaciones actuales

- La ruta de importación pública es genérica, pero algunos alias de tipos de intento/resultado todavía conservan nombres heredados por compatibilidad.
- La instalación de harness de terceros es experimental. Prefiera complementos de proveedor
  hasta que necesite un tiempo de ejecución de sesión nativo.
- El cambio de harness es compatible entre turnos. No cambie de harness en el
  medio de un turno después de que hayan comenzado las herramientas nativas, aprobaciones, texto del asistente, o envíos
  de mensajes.

## Relacionado

- [Descripción general del SDK](/es/plugins/sdk-overview)
- [Ayudantes de tiempo de ejecución](/es/plugins/sdk-runtime)
- [Complementos de proveedor](/es/plugins/sdk-provider-plugins)
- [Arnés de Codex](/es/plugins/codex-harness)
- [Proveedores de modelos](/es/concepts/model-providers)
