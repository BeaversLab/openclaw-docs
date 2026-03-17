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

<Info>
  Primer chat más rápido: abre la interfaz de usuario de Control (no se necesita configuración de
  canales). Ejecuta `openclaw dashboard` y chatea en el navegador. Documentación: [Panel de
  control](/es/web/dashboard).
</Info>

Para reconfigurar más adelante:

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
  `--json` no implica el modo no interactivo. Para secuencias de comandos, usa `--non-interactive`.
</Note>

<Tip>
  La incorporación mediante CLI incluye un paso de búsqueda web donde puede elegir un proveedor
  (Perplexity, Brave, Gemini, Grok o Kimi) y pegar su clave API para que el agente pueda usar
  `web_search`. También puede configurar esto más tarde con `openclaw configure --section web`.
  Documentación: [Herramientas web](/es/tools/web).
</Tip>

## Inicio rápido frente a Avanzado

La incorporación comienza con **QuickStart** (valores predeterminados) frente a **Advanced** (control total).

<Tabs>
  <Tab title="QuickStart (valores predeterminados)">
    - Puerta de enlace local (bucle) - Espacio de trabajo predeterminado (o espacio de trabajo
    existente) - Puerto de puerta de enlace **18789** - Autenticación de puerta de enlace **Token**
    (generado automáticamente, incluso en bucle) - Política de herramientas predeterminada para
    nuevas configuraciones locales: `tools.profile: "coding"` (se conserva el perfil explícito
    existente) - Aislamiento de DM predeterminado: la incorporación local escribe `session.dmScope:
    "per-channel-peer"` cuando no está configurado. Detalles: [Referencia de configuración de
    CLI](/es/start/wizard-cli-reference#outputs-and-internals) - Exposición de Tailscale
    **Desactivada** - Los DM de Telegram + WhatsApp se establecen de forma predeterminada en **lista
    de permitidos** (se le pedirá su número de teléfono)
  </Tab>
  <Tab title="Avanzado (control total)">
    - Expone cada paso (modo, espacio de trabajo, puerta de enlace, canales, demonio, habilidades).
  </Tab>
</Tabs>

## Qué configura la incorporación

**Modo local (predeterminado)** le guía a través de estos pasos:

1. **Modelo/Autenticación** — elija cualquier flujo de proveedor/autenticación admitido (clave de API, OAuth o token de configuración), incluido el proveedor personalizado
   (compatible con OpenAI, compatible con Anthropic o detección automática desconocida). Elija un modelo predeterminado.
   Nota de seguridad: si este agente va a ejecutar herramientas o procesar contenido de webhooks/hooks, prefiera el modelo más fuerte de la última generación disponible y mantenga la política de herramientas estricta. Los niveles más débiles/antiguos son más fáciles de inyectar mediante indicaciones.
   Para ejecuciones no interactivas, `--secret-input-mode ref` almacena referencias respaldadas por variables de entorno en perfiles de autenticación en lugar de valores de clave de API en texto plano.
   En el modo no interactivo `ref`, la variable de entorno del proveedor debe estar establecida; pasar indicadores de clave en línea sin esa variable de entorno falla rápidamente.
   En ejecuciones interactivas, elegir el modo de referencia secreta le permite señalar a una variable de entorno o a una referencia de proveedor configurada (`file` o `exec`), con una validación previa rápida antes de guardar.
2. **Espacio de trabajo** — Ubicación de los archivos del agente (predeterminado `~/.openclaw/workspace`). Inicializa archivos de arranque.
3. **Gateway** — Puerto, dirección de enlace, modo de autenticación, exposición a Tailscale.
   En el modo de token interactivo, elija el almacenamiento de token en texto plano predeterminado u opte por SecretRef.
   Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
4. **Canales** — WhatsApp, Telegram, Discord, Google Chat, Mattermost, Signal, BlueBubbles o iMessage.
5. **Demonio** — Instala un LaunchAgent (macOS) o una unidad de usuario systemd (Linux/WSL2).
   Si la autenticación por token requiere un token y `gateway.auth.token` está administrada por SecretRef, la instalación del demonio lo valida pero no persiste el token resuelto en los metadatos del entorno del servicio de supervisor.
   Si la autenticación por token requiere un token y la referencia secreta del token configurada no está resuelta, la instalación del demonio se bloquea con una orientación accionable.
   Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación del demonio se bloquea hasta que el modo se establece explícitamente.
6. **Verificación de estado** — Inicia el Gateway y verifica que se esté ejecutando.
7. **Habilidades** — Instala las habilidades recomendadas y dependencias opcionales.

<Note>
  Volver a ejecutar la incorporación **no** borra nada a menos que elija explícitamente
  **Restablecer** (o pase `--reset`). La CLI `--reset` se usa de forma predeterminada para
  configuración, credenciales y sesiones; use `--reset-scope full` para incluir el espacio de
  trabajo. Si la configuración no es válida o contiene claves heredadas, la incorporación le pedirá
  que ejecute `openclaw doctor` primero.
</Note>

El **modo remoto** solo configura el cliente local para conectarse a un Gateway en otro lugar.
**No** instala ni cambia nada en el host remoto.

## Añadir otro agente

Use `openclaw agents add <name>` para crear un agente separado con su propio espacio de trabajo,
sesiones y perfiles de autenticación. Ejecutar sin `--workspace` inicia la incorporación.

Lo que configura:

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

Notas:

- Los espacios de trabajo predeterminados siguen `~/.openclaw/workspace-<agentId>`.
- Agregue `bindings` para enrutar mensajes entrantes (la incorporación puede hacer esto).
- Opciones no interactivas: `--model`, `--agent-dir`, `--bind`, `--non-interactive`.

## Referencia completa

Para ver desgloses detallados paso a paso y salidas de configuración, consulte
[Referencia de configuración de CLI](/es/start/wizard-cli-reference).
Para ver ejemplos no interactivos, consulte [Automatización de CLI](/es/start/wizard-cli-automation).
Para obtener la referencia técnica más profunda, incluidos los detalles de RPC, consulte
[Referencia de incorporación](/es/reference/wizard).

## Documentos relacionados

- Referencia de comandos de CLI: [`openclaw onboard`](/es/cli/onboard)
- Resumen de incorporación: [Resumen de incorporación](/es/start/onboarding-overview)
- Incorporación de la aplicación macOS: [Incorporación](/es/start/onboarding)
- Ritual de primera ejecución del agente: [Inicialización del agente](/es/start/bootstrapping)

import es from "/components/footer/es.mdx";

<es />
