---
title: "Plugins de arnés de agente"
sidebarTitle: "Arnés de agente"
summary: "Superficie experimental del SDK para complementos que reemplazan el ejecutor de agente integrado de bajo nivel"
read_when:
  - You are changing the embedded agent runtime or harness registry
  - You are registering an agent harness from a bundled or trusted plugin
  - You need to understand how the Codex plugin relates to model providers
---

# Plugins de arnés de agente

Un **arnés de agente** es el ejecutor de bajo nivel para un turno de agente
OpenClaw preparado. No es un proveedor de modelos, ni un canal, ni un
registro de herramientas.

Use esta superficie solo para complementos nativos empaquetados o confiables.
El contrato sigue siendo experimental porque los tipos de parámetros reflejan
intencionalmente el ejecutor integrado actual.

## Cuándo usar un arnés

Registre un arnés de agente cuando una familia de modelos tenga su propio tiempo
de ejecución de sesión nativa y el transporte normal del proveedor OpenClaw sea
la abstracción incorrecta.

Ejemplos:

- un servidor nativo de agente de codificación que posee hilos y compactación
- una CLI local o un demonio que debe transmitir eventos nativos de
  plan/razonamiento/herramienta
- un tiempo de ejecución de modelo que necesita su propio ID de reanudación además
  de la transcripción de la sesión de OpenClaw

**No** registre un harness solo para añadir una nueva API de LLM. Para las API de modelo HTTP o WebSocket normales, cree un [plugin de proveedor](/es/plugins/sdk-provider-plugins).

## Lo que el núcleo aún posee

Antes de que se seleccione un arnés, OpenClaw ya ha resuelto:

- proveedor y modelo
- estado de autenticación en tiempo de ejecución
- nivel de pensamiento y presupuesto de contexto
- el archivo de transcripción/sesión de OpenClaw
- espacio de trabajo, sandbox y política de herramientas
- devoluciones de llamada de respuesta del canal y devoluciones de llamada de transmisión
- política de respaldo de modelo y cambio de modelo en vivo

Esa división es intencional. Un arnés ejecuta un intento preparado; no elige
proveedores, reemplaza la entrega del canal ni cambia modelos silenciosamente.

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

1. `OPENCLAW_AGENT_RUNTIME=<id>` fuerza un arnés registrado con ese ID.
2. `OPENCLAW_AGENT_RUNTIME=pi` fuerza el arnés PI integrado.
3. `OPENCLAW_AGENT_RUNTIME=auto` pregunta a los arneses registrados si admiten el
   proveedor/modelo resuelto.
4. Si ningún arnés registrado coincide, OpenClaw usa PI a menos que el respaldo
   de PI esté deshabilitado.

Los fallos del harness del plugin aparecen como fallos de ejecución. En el modo `auto`, el respaldo de PI solo se utiliza cuando ningún harness de plugin registrado soporta el proveedor/modelo resuelto. Una vez que un harness de plugin ha reclamado una ejecución, OpenClaw no reproduce ese mismo turno a través de PI porque eso puede cambiar la semántica de autenticación/ejecución o duplicar los efectos secundarios.

El plugin Codex incluido registra `codex` como su id de harness. Core lo trata como un id de harness de plugin ordinario; los alias específicos de Codex pertenecen a la configuración del plugin o del operador, no al selector de tiempo de ejecución compartido.

## Emparejamiento de proveedor y arnés

La mayoría de los harnesses también deben registrar un proveedor. El proveedor hace visibles las referencias del modelo, el estado de autenticación, los metadatos del modelo y la selección de `/model` para el resto de OpenClaw. El harness luego reclama ese proveedor en `supports(...)`.

El complemento Codex incluido sigue este patrón:

- id de proveedor: `codex`
- referencias de modelo de usuario: `codex/gpt-5.4`, `codex/gpt-5.2` u otro modelo devuelto por el servidor de la aplicación Codex
- id de harness: `codex`
- auth: disponibilidad de proveedor sintético, porque el arnés Codex posee el
  inicio de sesión/sesión nativo de Codex
- solicitud de servidor de aplicaciones: OpenClaw envía el id del modelo simple a Codex y permite que
  el arnés hable con el protocolo nativo del servidor de aplicaciones

El plugin Codex es aditivo. Las referencias simples de `openai/gpt-*` siguen siendo referencias del proveedor de OpenAI y continúan utilizando la ruta normal del proveedor de OpenClaw. Seleccione `codex/gpt-*` cuando desee autenticación administrada por Codex, descubrimiento de modelos de Codex, hilos nativos y ejecución en el servidor de la aplicación Codex. `/model` puede cambiar entre los modelos de Codex devueltos por el servidor de la aplicación Codex sin requerir credenciales del proveedor de OpenAI.

Para la configuración del operador, ejemplos de prefijos de modelo y configuraciones exclusivas de Codex, consulte [Codex Harness](/es/plugins/codex-harness).

OpenClaw requiere el servidor de la aplicación Codex `0.118.0` o más reciente. El plugin Codex verifica el handshake de inicialización del servidor de la aplicación y bloquea los servidores antiguos o sin versión para que OpenClaw solo se ejecute contra la superficie del protocolo con la que ha sido probado.

### Middleware de resultado de herramienta del servidor de la aplicación Codex

Los complementos empaquetados también pueden adjuntar middleware específico del servidor de aplicaciones de Codex `tool_result` a través de `api.registerCodexAppServerExtensionFactory(...)` cuando su manifiesto declara `contracts.embeddedExtensionFactories: ["codex-app-server"]`. Esta es la costura de complementos de confianza para transformaciones asincrónicas de resultados de herramientas que necesitan ejecutarse dentro del arnés nativo de Codex antes de que la salida de la herramienta se proyecte de nuevo en la transcripción de OpenClaw.

### Modo de arnés nativo de Codex

El arnés `codex` empaquetado es el modo nativo de Codex para turnos de
agente OpenClaw integrados. Habilite primero el plugin `codex` empaquetado e incluya `codex` en
`plugins.allow` si su configuración utiliza una lista de permitidos restrictiva. Es diferente
de `openai-codex/*`:

- `openai-codex/*` utiliza ChatGPT/Codex OAuth a través de la ruta del proveedor
  normal de OpenClaw.
- `codex/*` utiliza el proveedor Codex empaquetado y enruta el turno a través del servidor de
  aplicaciones Codex.

Cuando se ejecuta este modo, Codex posee el id de hilo nativo, el comportamiento de reanudación,
la compactación y la ejecución del servidor de aplicaciones. OpenClaw aún posee el canal de chat,
el espejo de transcripción visible, la política de herramientas, las aprobaciones, la entrega de medios y la selección
de sesión. Utilice `embeddedHarness.runtime: "codex"` con
`embeddedHarness.fallback: "none"` cuando necesite demostrar que solo la ruta del
servidor de aplicaciones Codex puede reclamar la ejecución. Esa configuración es solo una guardia de selección:
los fallos del servidor de aplicaciones Codex ya fallan directamente en lugar de reintentar a través de PI.

## Deshabilitar la alternativa PI

De manera predeterminada, OpenClaw ejecuta agentes integrados con `agents.defaults.embeddedHarness`
configurado en `{ runtime: "auto", fallback: "pi" }`. En el modo `auto`, los arneses de
plugin registrados pueden reclamar un par proveedor/modelo. Si ninguno coincide, OpenClaw recurre a PI.

Establezca `fallback: "none"` cuando necesite que la falta de selección de arnés de plugin falle
en lugar de usar PI. Los fallos de arnés de plugin seleccionados ya fallan drásticamente. Esto
no bloquea un `runtime: "pi"` o `OPENCLAW_AGENT_RUNTIME=pi` explícito.

Para ejecuciones integradas solo de Codex:

```json
{
  "agents": {
    "defaults": {
      "model": "codex/gpt-5.4",
      "embeddedHarness": {
        "runtime": "codex",
        "fallback": "none"
      }
    }
  }
}
```

Si desea que cualquier arnés de plugin registrado reclame modelos coincidentes pero nunca
quiere que OpenClaw recurra silenciosamente a PI, mantenga `runtime: "auto"` y deshabilite
la alternativa:

```json
{
  "agents": {
    "defaults": {
      "embeddedHarness": {
        "runtime": "auto",
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
      "embeddedHarness": {
        "runtime": "auto",
        "fallback": "pi"
      }
    },
    "list": [
      {
        "id": "codex-only",
        "model": "codex/gpt-5.4",
        "embeddedHarness": {
          "runtime": "codex",
          "fallback": "none"
        }
      }
    ]
  }
}
```

`OPENCLAW_AGENT_RUNTIME` todavía anula el tiempo de ejecución configurado. Use
`OPENCLAW_AGENT_HARNESS_FALLBACK=none` para desactivar el respaldo (fallback) de PI desde
el entorno.

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

Con el respaldo desactivado, una sesión falla temprano cuando el arnés solicitado no está
registrado, no soporta el proveedor/modelo resuelto, o falla antes de
producir efectos secundarios del turno. Eso es intencional para despliegues solo de Codex
y para pruebas en vivo que deben probar que la ruta del servidor de aplicaciones de Codex realmente está en uso.

Este ajuste solo controla el arnés del agente integrado. No desactiva
el enrutamiento de modelos de imagen, video, música, TTS, PDF u otros específicos del proveedor.

## Sesiones nativas y espejo de transcripciones

Un arnés puede mantener un id de sesión nativo, un id de hilo, o un token de reanudación del lado del demonio.
Mantenga esa vinculación explícitamente asociada con la sesión OpenClaw, y mantenga
el espejo de la salida del asistente/herramienta visible por el usuario en la transcripción OpenClaw.

La transcripción OpenClaw sigue siendo la capa de compatibilidad para:

- historial de sesión visible por el canal
- búsqueda e indexación de transcripciones
- volver a cambiar al arnés PI integrado en un turno posterior
- comportamiento genérico de `/new`, `/reset` y eliminación de sesión

Si su arnés almacena una vinculación de acompañante (sidecar), implemente `reset(...)` para que OpenClaw pueda
limpiarla cuando la sesión OpenClaw propietaria se reinicie.

## Resultados de herramientas y medios

Core construye la lista de herramientas OpenClaw y la pasa en el intento preparado.
Cuando un arnés ejecuta una llamada de herramienta dinámica, devuelva el resultado de la herramienta a través de
la forma de resultado del arnés en lugar de enviar medios del canal usted mismo.

Esto mantiene las salidas de texto, imagen, video, música, TTS, aprobación y herramientas de mensajería
en la misma ruta de entrega que las ejecuciones respaldadas por PI.

## Limitaciones actuales

- La ruta de importación pública es genérica, pero algunos alias de tipos de intento/resultado todavía
  llevan nombres `Pi` por compatibilidad.
- La instalación de arneses de terceros es experimental. Prefiera complementos de proveedor
  hasta que necesite un tiempo de ejecución de sesión nativo.
- El cambio de arnés es compatible a través de turnos. No cambie de arnés en el
  medio de un turno después de que hayan comenzado las herramientas nativas, aprobaciones, texto del asistente o envíos
  de mensajes.

## Relacionado

- [Descripción general del SDK](/es/plugins/sdk-overview)
- [Runtime Helpers](/es/plugins/sdk-runtime)
- [Provider Plugins](/es/plugins/sdk-provider-plugins)
- [Codex Harness](/es/plugins/codex-harness)
- [Model Providers](/es/concepts/model-providers)
