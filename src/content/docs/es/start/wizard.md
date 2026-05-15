---
summary: "Incorporación (CLI): configuración guiada para puerta de enlace, espacio de trabajo, canales y habilidades"
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

<Info>El chat más rápido: abra la Interfaz de Control (no se requiere configuración de canal). Ejecute `openclaw dashboard` y chatee en el navegador. Documentación: [Panel de control](/es/web/dashboard).</Info>

Para reconfigurar más tarde:

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` no implica el modo no interactivo. Para secuencias de comandos, use `--non-interactive`.</Note>

<Tip>
  La incorporación mediante CLI incluye un paso de búsqueda web donde puede elegir un proveedor tal como Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG o Tavily. Algunos proveedores requieren una clave API, mientras que otros no requieren clave. También puede configurar esto más tarde con `openclaw configure --section web`.
  Documentación: [Herramientas web](/es/tools/web).
</Tip>

## Inicio rápido frente a Avanzado

La incorporación comienza con **Inicio rápido** (valores predeterminados) frente a **Avanzado** (control total).

<Tabs>
  <Tab title="Inicio rápido (valores predeterminados)">
    - Puerta de enlace local (loopback)
    - Espacio de trabajo predeterminado (o espacio de trabajo existente)
    - Puerto de puerta de enlace **18789**
    - Autenticación de puerta de enlace **Token** (generado automáticamente, incluso en loopback)
    - Política de herramientas predeterminada para nuevas configuraciones locales: `tools.profile: "coding"` (se conserva el perfil explícito existente)
    - Aislamiento de DM predeterminado: la incorporación local escribe `session.dmScope: "per-channel-peer"` cuando no está configurado. Detalles: [Referencia de configuración de CLI](/es/start/wizard-cli-reference#outputs-and-internals)
    - Exposición de Tailscale **Desactivada**
    - Los MD de Telegram + WhatsApp se configuran de forma predeterminada en **lista blanca** (se le pedirá su número de teléfono)

  </Tab>
  <Tab title="Avanzado (control total)">
    - Expone cada paso (modo, espacio de trabajo, puerta de enlace, canales, demonio, habilidades).

  </Tab>
</Tabs>

## Qué configura la incorporación

El **modo local (predeterminado)** le guía a través de estos pasos:

1. **Modelo/Auth** — elige cualquier proveedor/flujo de autenticación compatible (clave de API, OAuth o autenticación manual específica del proveedor), incluido el Proveedor personalizado
   (compatible con OpenAI, compatible con Anthropic o detección automática desconocida). Elige un modelo predeterminado.
   Nota de seguridad: si este agente va a ejecutar herramientas o procesar contenido de webhooks/hooks, prefiere el modelo más reciente y potente disponible y mantén la política de herramientas estricta. Los niveles más débiles/antiguos son más fáciles de inyectar mediante prompts.
   Para ejecuciones no interactivas, `--secret-input-mode ref` almacena referencias respaldadas por entorno en los perfiles de autenticación en lugar de valores de clave de API en texto sin formato.
   En el modo `ref` no interactivo, se debe establecer la variable de entorno del proveedor; pasar indicadores de clave en línea sin esa variable de entorno falla rápidamente.
   En ejecuciones interactivas, elegir el modo de referencia secreta te permite señalar a una variable de entorno o a una referencia de proveedor configurada (`file` o `exec`), con una validación previa rápida antes de guardar.
   Para Anthropic, la incorporación/configuración interactiva ofrece **Anthropic Claude CLI** como la ruta local preferida y **Anthropic API key** como la ruta de producción recomendada. El token de configuración de Anthropic también sigue disponible como una ruta de autenticación por token compatible.
2. **Espacio de trabajo** — Ubicación para los archivos del agente (predeterminado `~/.openclaw/workspace`). Semillas de archivos de arranque.
3. **Gateway** — Puerto, dirección de enlace, modo de autenticación, exposición a Tailscale.
   En el modo de token interactivo, elige el almacenamiento de token de texto sin formato predeterminado o opta por SecretRef.
   Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
4. **Canales** — canales de chat integrados y incluidos, como iMessage, Discord, Feishu, Google Chat, Mattermost, Microsoft Teams, QQ Bot, Signal, Slack, Telegram, WhatsApp y más.
5. **Demonio** — Instala un LaunchAgent (macOS), una unidad de usuario systemd (Linux/WSL2) o una Tarea Programada nativa de Windows con respaldo en la carpeta de Inicio por usuario.
   Si la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, la instalación del demonio lo valida pero no persiste el token resuelto en los metadatos del entorno del servicio supervisor.
   Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación del demonio se bloquea con una guía accionable.
   Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación del demonio se bloquea hasta que el modo se establezca explícitamente.
6. **Verificación de estado** — Inicia el Gateway y verifica que se está ejecutando.
7. **Habilidades** — Instala las habilidades recomendadas y dependencias opcionales.

<Note>
  Volver a ejecutar la incorporación **no** borra nada a menos que elija explícitamente **Restablecer** (o pase `--reset`). La CLI `--reset` de forma predeterminada incluye configuración, credenciales y sesiones; use `--reset-scope full` para incluir el espacio de trabajo. Si la configuración no es válida o contiene claves heredadas, la incorporación le pide que ejecute `openclaw doctor` primero.
</Note>

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

Para ver desgloses paso a paso detallados y resultados de configuración, consulte
[Referencia de configuración de la CLI](/es/start/wizard-cli-reference).
Para ver ejemplos no interactivos, consulte [Automatización de la CLI](/es/start/wizard-cli-automation).
Para la referencia técnica más profunda, incluidos los detalles de RPC, consulte
[Referencia de incorporación](/es/reference/wizard).

## Documentos relacionados

- Referencia de comandos de la CLI: [`openclaw onboard`](/es/cli/onboard)
- Resumen de incorporación: [Resumen de incorporación](/es/start/onboarding-overview)
- Incorporación de la aplicación de macOS: [Incorporación](/es/start/onboarding)
- Ritual de primera ejecución del agente: [Inicialización del agente](/es/start/bootstrapping)
