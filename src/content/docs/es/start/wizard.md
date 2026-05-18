---
summary: "Incorporación mediante CLI: configuración guiada para puerta de enlace, espacio de trabajo, canales y habilidades"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "Incorporación (CLI)"
sidebarTitle: "Incorporación: CLI"
---

La incorporación mediante CLI es la forma **recomendada** de configurar OpenClaw en macOS,
Linux o Windows (vía WSL2; muy recomendado).
Configura una puerta de enlace (Gateway) local o una conexión remota, además de canales, habilidades
y valores predeterminados del espacio de trabajo en un flujo guiado.

```bash
openclaw onboard
```

## Configuración regional

El asistente de la CLI localiza los textos fijos de incorporación. Resuelve la configuración regional a partir de
`OPENCLAW_LOCALE`, luego `LC_ALL`, luego `LC_MESSAGES`, luego `LANG` y, como alternativa,
usa inglés. Las configuraciones regionales compatibles con el asistente son `en`, `zh-CN` y `zh-TW`.

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
```

Los nombres y los identificadores estables se mantienen literales: `OpenClaw`, `Gateway`, `Tailscale`,
comandos, claves de configuración, URL, ID de proveedores, ID de modelos y etiquetas de complementos/canales
no se traducen.

<Info>Primera charla más rápida: abra la interfaz de usuario de Control (no se requiere configuración de canal). Ejecute `openclaw dashboard` y chatee en el navegador. Documentos: [Panel de control](/es/web/dashboard).</Info>

Para reconfigurar más tarde:

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` no implica el modo no interactivo. Para scripts, use `--non-interactive`.</Note>

<Tip>
  La incorporación mediante CLI incluye un paso de búsqueda web donde puede elegir un proveedor tal como Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG o Tavily. Algunos proveedores requieren una clave API, mientras que otros no tienen clave. También puede configurar esto más tarde con `openclaw configure --section web`. Documentos:
  [Herramientas web](/es/tools/web).
</Tip>

## Inicio rápido frente a Avanzado

La incorporación comienza con **Inicio rápido** (predeterminados) frente a **Avanzado** (control total).

<Tabs>
  <Tab title="Inicio rápido (valores predeterminados)">
    - Puerta de enlace local (bucle)
    - Espacio de trabajo predeterminado (o espacio de trabajo existente)
    - Puerto de puerta de enlace **18789**
    - Autenticación de puerta de enlace **Token** (generado automáticamente, incluso en bucle)
    - Política de herramientas predeterminada para nuevas configuraciones locales: `tools.profile: "coding"` (se conserva el perfil explícito existente)
    - Aislamiento de DM predeterminado: la incorporación local escribe `session.dmScope: "per-channel-peer"` cuando no está configurado. Detalles: [Referencia de configuración de CLI](/es/start/wizard-cli-reference#outputs-and-internals)
    - Exposición de Tailscale **Desactivada**
    - Los DM de Telegram + WhatsApp se predeterminan en **lista de permitidos** (se le pedirá su número de teléfono)

  </Tab>
  <Tab title="Avanzado (control total)">
    - Expone cada paso (modo, espacio de trabajo, puerta de enlace, canales, demonio, habilidades).

  </Tab>
</Tabs>

## Lo que configura la incorporación

**Modo local (predeterminado)** le guía a través de estos pasos:

1. **Modelo/Autenticación** — elija cualquier flujo de proveedor/autenticación compatible (clave de API, OAuth o autenticación manual específica del proveedor), incluido Proveedor personalizado
   (compatible con OpenAI, compatible con Anthropic o detección automática desconocida). Elija un modelo predeterminado.
   Nota de seguridad: si este agente va a ejecutar herramientas o procesar contenido de webhooks/hooks, prefiera el modelo más fuerte de la última generación disponible y mantenga la política de herramientas estricta. Los niveles más débiles/antiguos son más fáciles de inyectar mediante instrucciones.
   Para ejecuciones no interactivas, `--secret-input-mode ref` almacena referencias respaldadas por entorno en perfiles de autenticación en lugar de valores de clave de API en texto plano.
   En el modo `ref` no interactivo, se debe establecer la variable de entorno del proveedor; pasar indicadores de clave en línea sin esa variable de entorno falla rápidamente.
   En ejecuciones interactivas, elegir el modo de referencia secreta le permite señalar una variable de entorno o una referencia de proveedor configurada (`file` o `exec`), con una validación previa rápida antes de guardar.
   Para Anthropic, la incorporación/configuración interactiva ofrece **Anthropic Claude CLI** como la ruta local preferida y **Clave de API de Anthropic** como la ruta de producción recomendada. El token de configuración de Anthropic también sigue disponible como una ruta de autenticación por token compatible.
2. **Espacio de trabajo** — Ubicación de los archivos del agente (predeterminado `~/.openclaw/workspace`). Siembra archivos de arranque.
3. **Gateway** — Puerto, dirección de enlace, modo de autenticación, exposición a Tailscale.
   En el modo de token interactivo, elija el almacenamiento de token de texto plano predeterminado o opte por SecretRef.
   Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
4. **Canales** — canales de chat integrados y de complementos oficiales, como iMessage, Discord, Feishu, Google Chat, Mattermost, Microsoft Teams, QQ Bot, Signal, Slack, Telegram, WhatsApp y más.
5. **Demonio** — Instala un LaunchAgent (macOS), una unidad de usuario systemd (Linux/WSL2) o una Tarea programada nativa de Windows con respaldo a la carpeta de Inicio por usuario.
   Si la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, la instalación del demonio lo valida pero no persiste el token resuelto en los metadatos del entorno del servicio de supervisor.
   Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación del demonio se bloquea con orientación procesable.
   Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación del demonio se bloquea hasta que el modo se establece explícitamente.
6. **Verificación de estado** — Inicia el Gateway y verifica que se esté ejecutando.
7. **Habilidades** — Instala habilidades recomendadas y dependencias opcionales.

<Note>Volver a ejecutar la incorporación **no** borra nada a menos que elija explícitamente **Restablecer** (o pase `--reset`). CLI `--reset` predeterminado a configuración, credenciales y sesiones; use `--reset-scope full` para incluir el espacio de trabajo. Si la configuración no es válida o contiene claves heredadas, la incorporación le pide que ejecute `openclaw doctor` primero.</Note>

**Modo remoto** solo configura el cliente local para conectarse a un Gateway en otro lugar.
**No** instala ni cambia nada en el host remoto.

## Agregar otro agente

Use `openclaw agents add <name>` para crear un agente separado con su propio espacio de trabajo,
sesiones y perfiles de autenticación. Ejecutar sin `--workspace` inicia la incorporación.

Lo que establece:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notas:

- Los espacios de trabajo predeterminados siguen `~/.openclaw/workspace-<agentId>`.
- Agregue `bindings` para enrutar mensajes entrantes (la incorporación puede hacer esto).
- Marcas no interactivas: `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Referencia completa

Para ver desgloses detallados paso a paso y resultados de configuración, consulte
[Referencia de configuración de la CLI](/es/start/wizard-cli-reference).
Para ver ejemplos no interactivos, consulte [Automatización de la CLI](/es/start/wizard-cli-automation).
Para obtener la referencia técnica más profunda, incluidos los detalles de RPC, consulte
[Referencia de incorporación](/es/reference/wizard).

## Documentos relacionados

- Referencia de comandos de la CLI: [`openclaw onboard`](/es/cli/onboard)
- Descripción general de la incorporación: [Descripción general de la incorporación](/es/start/onboarding-overview)
- Incorporación de la aplicación de macOS: [Incorporación](/es/start/onboarding)
- Ritual de primera ejecución del agente: [Inicialización del agente](/es/start/bootstrapping)
