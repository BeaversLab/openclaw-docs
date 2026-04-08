---
summary: "Incorporación (CLI): configuración guiada para puerta de enlace, espacio de trabajo, canales y habilidades"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "Incorporación (CLI)"
sidebarTitle: "Incorporación: CLI"
---

# Incorporación (CLI)

La incorporación mediante CLI es la forma **recomendada** de configurar OpenClaw en macOS,
Linux o Windows (a través de WSL2; muy recomendado).
Configura una puerta de enlace local o una conexión a una puerta de enlace remota, además de canales, habilidades
y valores predeterminados del espacio de trabajo en un flujo guiado.

```bash
openclaw onboard
```

<Info>Primera chat más rápido: abre la Control UI (no se necesita configuración de canal). Ejecuta `openclaw dashboard` y chatea en el navegador. Documentos: [Dashboard](/en/web/dashboard).</Info>

Para reconfigurar más adelante:

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` no implica el modo no interactivo. Para secuencias de comandos, use `--non-interactive`.</Note>

<Tip>
  La onboarding de CLI incluye un paso de búsqueda web donde puedes elegir un proveedor tal como Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG o Tavily. Algunos proveedores requieren una clave API, mientras que otros no requieren clave. También puedes configurar esto más tarde con `openclaw configure --section web`. Documentos: [Web
  tools](/en/tools/web).
</Tip>

## Inicio rápido frente a Avanzado

La incorporación comienza con **QuickStart** (valores predeterminados) frente a **Advanced** (control total).

<Tabs>
  <Tab title="QuickStart (valores predeterminados)">
    - Gateway local (bucle invertido) - Espacio de trabajo predeterminado (o espacio de trabajo existente) - Puerto del Gateway **18789** - Autenticación del Gateway **Token** (auto‑generado, incluso en bucle invertido) - Política de herramientas predeterminada para nuevas configuraciones locales: `tools.profile: "coding"` (se conserva el perfil explícito existente) - Aislamiento de DM
    predeterminado: la onboarding local escribe `session.dmScope: "per-channel-peer"` cuando no está configurado. Detalles: [CLI Setup Reference](/en/start/wizard-cli-reference#outputs-and-internals) - Exposición de Tailscale **Desactivada** - Los DM de Telegram + WhatsApp se configuran por defecto en **lista de permitidos** (se te pedirá tu número de teléfono)
  </Tab>
  <Tab title="Avanzado (control total)">- Expone cada paso (modo, espacio de trabajo, puerta de enlace, canales, demonio, habilidades).</Tab>
</Tabs>

## Qué configura la incorporación

**Modo local (predeterminado)** le guía a través de estos pasos:

1. **Modelo/Auth** — elija cualquier proveedor/flujo de autenticación admitido (clave de API, OAuth o autenticación manual específica del proveedor), incluido Proveedor personalizado
   (compatible con OpenAI, compatible con Anthropic o detección automática desconocida). Elija un modelo predeterminado.
   Nota de seguridad: si este agente ejecutará herramientas o procesará contenido de webhook/hooks, prefiera el modelo más potente de la última generación disponible y mantenga la política de herramientas estricta. Los niveles más débiles/antiguos son más fáciles de inyectar mediante el prompt.
   Para ejecuciones no interactivas, `--secret-input-mode ref` almacena referencias respaldadas por variables de entorno en perfiles de autenticación en lugar de valores de clave de API en texto plano.
   En el modo no interactivo `ref`, la variable de entorno del proveedor debe estar configurada; pasar banderas de clave en línea sin esa variable de entorno falla rápidamente.
   En ejecuciones interactivas, elegir el modo de referencia secreta le permite apuntar a una variable de entorno o a una referencia de proveedor configurada (`file` o `exec`), con una validación previa rápida antes de guardar.
   Para Anthropic, el onboarding/configuración interactivo ofrece **Anthropic Claude CLI** como alternativa local y **Anthropic API key** como la ruta de producción recomendada. El token de configuración de Anthropic también está disponible nuevamente como una ruta heredada/manual de OpenClaw, con la expectativa de facturación de **Uso Extra** específica de OpenClaw de Anthropic.
2. **Espacio de trabajo (Workspace)** — Ubicación para los archivos del agente (predeterminado `~/.openclaw/workspace`). Semilla archivos de arranque (bootstrap).
3. **Gateway** — Puerto, dirección de enlace, modo de autenticación, exposición a Tailscale.
   En el modo de token interactivo, elija el almacenamiento de token en texto plano predeterminado u opte por SecretRef.
   Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
4. **Canales** — canales de chat integrados y empaquetados, como BlueBubbles, Discord, Feishu, Google Chat, Mattermost, Microsoft Teams, QQ Bot, Signal, Slack, Telegram, WhatsApp y más.
5. **Daemon** — Instala un LaunchAgent (macOS), unidad de usuario systemd (Linux/WSL2) o Tarea programada nativa de Windows con respaldo a la carpeta de Inicio por usuario.
   Si la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, la instalación del demonio lo valida pero no persiste el token resuelto en los metadatos del entorno del servicio supervisor.
   Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación del demonio se bloquea con una orientación accionable.
   Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación del demonio se bloquea hasta que el modo se establezca explícitamente.
6. **Verificación de estado** — Inicia el Gateway y verifica que se esté ejecutando.
7. **Habilidades** — Instala las habilidades recomendadas y dependencias opcionales.

<Note>Volver a ejecutar el onboarding **no** borra nada a menos que elijas explícitamente **Restablecer** (o pases `--reset`). El `--reset` de la CLI por defecto es configuración, credenciales y sesiones; usa `--reset-scope full` para incluir el espacio de trabajo. Si la configuración no es válida o contiene claves heredadas, el onboarding te pide que ejecutes `openclaw doctor` primero.</Note>

El **modo remoto** solo configura el cliente local para conectarse a un Gateway en otro lugar.
**No** instala ni cambia nada en el host remoto.

## Añadir otro agente

Usa `openclaw agents add <name>` para crear un agente separado con su propio espacio de trabajo,
sesiones y perfiles de autenticación. Ejecutar sin `--workspace` inicia el onboarding.

Lo que configura:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notas:

- Los espacios de trabajo predeterminados siguen `~/.openclaw/workspace-<agentId>`.
- Agrega `bindings` para enrutar mensajes entrantes (el onboarding puede hacer esto).
- Marcas no interactivas: `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Referencia completa

Para ver desgloses detallados paso a paso y salidas de configuración, consulta
[Referencia de configuración de CLI](/en/start/wizard-cli-reference).
Para ver ejemplos no interactivos, consulta [Automatización de CLI](/en/start/wizard-cli-automation).
Para la referencia técnica más profunda, incluidos los detalles de RPC, consulta
[Referencia de Onboarding](/en/reference/wizard).

## Documentos relacionados

- Referencia de comandos de CLI: [`openclaw onboard`](/en/cli/onboard)
- Resumen del onboarding: [Resumen de Onboarding](/en/start/onboarding-overview)
- Incorporación de la aplicación de macOS: [Incorporación](/en/start/onboarding)
- Ritual de primera ejecución del agente: [Inicialización del agente](/en/start/bootstrapping)
