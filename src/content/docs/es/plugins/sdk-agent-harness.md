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

**No** registres un arnés solo para añadir una nueva API de LLM. Para las API de modelo
HTTP o WebSocket normales, crea un [proveedor de complementos](/es/plugins/sdk-provider-plugins).

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

Los fallos forzados del arnés del complemento se manifiestan como fallos de ejecución. En el modo `auto`,
OpenClaw puede retroceder a PI cuando el arnés del complemento seleccionado falla antes de que
un turno haya producido efectos secundarios. Establezca `OPENCLAW_AGENT_HARNESS_FALLBACK=none` o
`embeddedHarness.fallback: "none"` para que esa recuperación sea un fallo grave en su lugar.

El complemento Codex incluido registra `codex` como su id de arnés. Core lo trata
como un id de arnés de complemento ordinario; los alias específicos de Codex pertenecen en la configuración
del complemento o del operador, no en el selector de tiempo de ejecución compartido.

## Emparejamiento de proveedor y arnés

La mayoría de los arneses también deben registrar un proveedor. El proveedor hace visibles las referencias del modelo,
el estado de autenticación, los metadatos del modelo y la selección de `/model` para el resto de
OpenClaw. El arnés luego reclama ese proveedor en `supports(...)`.

El complemento Codex incluido sigue este patrón:

- id del proveedor: `codex`
- referencias de modelo de usuario: `codex/gpt-5.4`, `codex/gpt-5.2`, u otro modelo devuelto
  por el servidor de aplicaciones Codex
- id del arnés: `codex`
- auth: disponibilidad de proveedor sintético, porque el arnés Codex posee el
  inicio de sesión/sesión nativo de Codex
- solicitud de servidor de aplicaciones: OpenClaw envía el id del modelo simple a Codex y permite que
  el arnés hable con el protocolo nativo del servidor de aplicaciones

El complemento Codex es aditivo. Las referencias simples `openai/gpt-*` siguen siendo referencias del proveedor
OpenAI y continúan usando la ruta normal del proveedor de OpenClaw. Seleccione `codex/gpt-*`
cuando desee autenticación gestionada por Codex, descubrimiento de modelos Codex, hilos nativos y
ejecución del servidor de aplicaciones Codex. `/model` puede cambiar entre los modelos Codex devueltos
por el servidor de aplicaciones Codex sin requerir credenciales del proveedor OpenAI.

Para ver la configuración del operador, ejemplos de prefijos de modelo y configuraciones
de solo Codex, consulte [Arnés de Codex](/es/plugins/codex-harness).

OpenClaw requiere el servidor de aplicaciones Codex `0.118.0` o más reciente. El complemento Codex verifica
el protocolo de enlace de inicialización del servidor de aplicaciones y bloquea los servidores antiguos o sin versión para que
OpenClaw solo se ejecute contra la superficie del protocolo con la que se ha probado.

### Modo de arnés nativo de Codex

El arnés `codex` incluido es el modo nativo de Codex para los turnos
del agente OpenClaw integrados. Habilite primero el complemento `codex` incluido
e incluya `codex` en `plugins.allow` si su configuración utiliza una lista de permitidos
restrictiva. Es diferente de `openai-codex/*`:

- `openai-codex/*` utiliza ChatGPT/Codex OAuth a través de la ruta del proveedor
  normal de OpenClaw.
- `codex/*` utiliza el proveedor de Codex incluido y enruta el turno a través del
  servidor de aplicaciones de Codex.

Cuando se ejecuta este modo, Codex posee el ID de hilo nativo, el comportamiento de
reanudación, la compactación y la ejecución del servidor de aplicaciones. OpenClaw
todavía posee el canal de chat, el espejo de transcripción visible, la política de
herramientas, las aprobaciones, la entrega de medios y la selección de sesión.
Use `embeddedHarness.runtime: "codex"` con `embeddedHarness.fallback: "none"` cuando necesite probar que se utiliza
la ruta del servidor de aplicaciones de Codex y que la alternativa PI no está ocultando
un arnés nativo roto.

## Deshabilitar la alternativa PI

De forma predeterminada, OpenClaw ejecuta agentes integrados con `agents.defaults.embeddedHarness`
configurado en `{ runtime: "auto", fallback: "pi" }`. En el modo `auto`, los arneses de
complementos registrados pueden reclamar un par proveedor/modelo. Si ninguno coincide
o si un arnés de complemento seleccionado automáticamente falla antes de producir
salida, OpenClaw recurre a PI.

Establezca `fallback: "none"` cuando necesite demostrar que un arnés de complemento
es el único tiempo de ejecución que se está utilizando. Esto deshabilita la alternativa
automática a PI; no bloquea un `runtime: "pi"` explícito o `OPENCLAW_AGENT_RUNTIME=pi`.

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

Si desea que cualquier arnés de complemento registrado reclame los modelos coincidentes
pero nunca desea que OpenClaw recurra silenciosamente a PI, mantenga `runtime: "auto"`
y deshabilite la alternativa:

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

Las anulaciones por agente utilizan la misma forma:

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
`OPENCLAW_AGENT_HARNESS_FALLBACK=none` para desactivar la alternativa de PI desde el
entorno.

```bash
OPENCLAW_AGENT_RUNTIME=codex \
OPENCLAW_AGENT_HARNESS_FALLBACK=none \
openclaw gateway run
```

Con la alternativa desactivada, una sesión falla pronto cuando el arnés solicitado no
está registrado, no es compatible con el proveedor/modelo resuelto, o falla antes
de producir efectos secundarios del turno. Eso es intencional para despliegues solo de Codex
y para pruebas en vivo que deben demostrar que la ruta del servidor de aplicaciones de Codex se está utilizando realmente.

Esta configuración solo controla el arnés del agente integrado. No desactiva
el enrutamiento de modelos específicos del proveedor para imágenes, videos, música, TTS, PDF u otros.

## Sesiones nativas y réplica de la transcripción

Un arnés puede mantener un id de sesión nativo, un id de hilo, o un token de reanudación del lado del demonio.
Mantenga esa vinculación explícitamente asociada con la sesión de OpenClaw, y mantenga
la réplica de la salida del asistente/herramienta visible para el usuario en la transcripción de OpenClaw.

La transcripción de OpenClaw sigue siendo la capa de compatibilidad para:

- historial de sesiones visible para el canal
- búsqueda e indexación de transcripciones
- volver al arnés PI integrado en un turno posterior
- comportamiento genérico de `/new`, `/reset` y eliminación de sesiones

Si su arnés almacena una vinculación sidecar, implemente `reset(...)` para que OpenClaw pueda
limpiarla cuando se restablezca la sesión de OpenClaw propietaria.

## Resultados de herramientas y medios

Core construye la lista de herramientas de OpenClaw y la pasa al intento preparado.
Cuando un arnés ejecuta una llamada a herramienta dinámica, devuelva el resultado de la herramienta a través
del formulario de resultado del arnés en lugar de enviar medios del canal usted mismo.

Esto mantiene las salidas de texto, imagen, video, música, TTS, aprobación y herramientas de mensajería
en la misma ruta de entrega que las ejecuciones respaldadas por PI.

## Limitaciones actuales

- La ruta de importación pública es genérica, pero algunos alias de tipo de intento/resultado todavía
  llevan nombres `Pi` por compatibilidad.
- La instalación de arneses de terceros es experimental. Prefiera complementos del proveedor
  hasta que necesite un tiempo de ejecución de sesión nativo.
- El cambio de arnés es compatible a través de turnos. No cambie de arnés en el
  medio de un turno después de que hayan comenzado las herramientas nativas, aprobaciones, texto del asistente o envíos
  de mensajes.

## Relacionado

- [Descripción general del SDK](/es/plugins/sdk-overview)
- [Ayudantes de tiempo de ejecución](/es/plugins/sdk-runtime)
- [Complementos de proveedores](/es/plugins/sdk-provider-plugins)
- [Arnés de Codex](/es/plugins/codex-harness)
- [Proveedores de modelos](/es/concepts/model-providers)
