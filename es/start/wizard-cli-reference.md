---
summary: "Referencia completa del flujo de configuración de la CLI, configuración de autenticación/modelo, salidas e internos"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "Referencia de configuración de la CLI"
sidebarTitle: "Referencia de CLI"
---

# Referencia de configuración de la CLI

Esta página es la referencia completa para `openclaw onboard`.
Para la guía breve, consulte [Incorporación (CLI)](/es/start/wizard).

## Lo que hace el asistente

El modo local (predeterminado) le guía a través de:

- Configuración de modelo y autenticación (suscripción OAuth de OpenAI Code, clave de API de Anthropic o token de configuración, además de opciones de MiniMax, GLM, Ollama, Moonshot y AI Gateway)
- Ubicación del espacio de trabajo y archivos de arranque
- Configuración de puerta de enlace (puerto, enlace, autenticación, tailscale)
- Canales y proveedores (Telegram, WhatsApp, Discord, Google Chat, complemento Mattermost, Signal)
- Instalación del demonio (LaunchAgent o unidad de usuario systemd)
- Verificación de estado
- Configuración de habilidades

El modo remoto configura esta máquina para conectarse a una puerta de enlace en otro lugar.
No instala ni modifica nada en el host remoto.

## Detalles del flujo local

<Steps>
  <Step title="Detección de configuración existente">
    - Si `~/.openclaw/openclaw.json` existe, elija Mantener, Modificar o Restablecer.
    - Volver a ejecutar el asistente no borra nada a menos que elija explícitamente Restablecer (o pase `--reset`).
    - El comando CLI `--reset` es `config+creds+sessions` de forma predeterminada; use `--reset-scope full` para también eliminar el espacio de trabajo.
    - Si la configuración no es válida o contiene claves heredadas, el asistente se detiene y le pide que ejecute `openclaw doctor` antes de continuar.
    - Restablecer usa `trash` y ofrece alcances:
      - Solo configuración
      - Configuración + credenciales + sesiones
      - Restablecimiento completo (también elimina el espacio de trabajo)
  </Step>
  <Step title="Modelo y autenticación">
    - La matriz completa de opciones está en [Opciones de autenticación y modelo](#auth-and-model-options).
  </Step>
  <Step title="Workspace">
    - Predeterminado `~/.openclaw/workspace` (configurable).
    - Siembra archivos de espacio de trabajo necesarios para el ritual de arranque inicial.
    - Diseño del espacio de trabajo: [Agent workspace](/es/concepts/agent-workspace).
  </Step>
  <Step title="Puerta de enlace">
    - Solicita puerto, enlace, modo de autenticación y exposición de tailscale.
    - Recomendado: mantenga la autenticación por token habilitada incluso para el bucle local (loopback) para que los clientes WS locales deban autenticarse.
    - En modo token, la configuración interactiva ofrece:
      - **Generar/guardar token en texto plano** (predeterminado)
      - **Usar SecretRef** (opcional)
    - En modo contraseña, la configuración interactiva también admite almacenamiento en texto plano o SecretRef.
    - Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
      - Requiere una variable de entorno no vacía en el entorno del proceso de incorporación.
      - No se puede combinar con `--gateway-token`.
    - Desactive la autenticación solo si confía plenamente en cada proceso local.
    - Los enlaces que no son de bucle local (non-loopback) aún requieren autenticación.
  </Step>
  <Step title="Channels">
    - [WhatsApp](/es/channels/whatsapp): inicio de sesión con QR opcional
    - [Telegram](/es/channels/telegram): token del bot
    - [Discord](/es/channels/discord): token del bot
    - [Google Chat](/es/channels/googlechat): JSON de cuenta de servicio + audiencia del webhook
    - Complemento [Mattermost](/es/channels/mattermost): token del bot + URL base
    - [Signal](/es/channels/signal): instalación opcional de `signal-cli` + configuración de cuenta
    - [BlueBubbles](/es/channels/bluebubbles): recomendado para iMessage; URL del servidor + contraseña + webhook
    - [iMessage](/es/channels/imessage): ruta de CLI `imsg` heredada + acceso a la base de datos
    - Seguridad de MD: el valor predeterminado es el emparejamiento. El primer MD envía un código; apruébelo a través de
      `openclaw pairing approve <channel> <code>` o use listas de permitidos.
  </Step>
  <Step title="Instalación del demonio">
    - macOS: LaunchAgent
      - Requiere una sesión de usuario iniciada; para headless, use un LaunchDaemon personalizado (no incluido).
    - Linux y Windows a través de WSL2: unidad de usuario systemd
      - El asistente intenta `loginctl enable-linger <user>` para que la puerta de enlace permanezca activa después de cerrar sesión.
      - Puede pedir sudo (escribe `/var/lib/systemd/linger`); primero intenta sin sudo.
    - Selección de runtime: Node (recomendado; necesario para WhatsApp y Telegram). No se recomienda Bun.
  </Step>
  <Step title="Comprobación de estado">
    - Inicia la puerta de enlace (si es necesario) y ejecuta `openclaw health`.
    - `openclaw status --deep` añade sondas de salud de la puerta de enlace a la salida de estado.
  </Step>
  <Step title="Habilidades">
    - Lee las habilidades disponibles y comprueba los requisitos.
    - Le permite elegir el gestor de nodos: npm o pnpm (no se recomienda bun).
    - Instala dependencias opcionales (algunas usan Homebrew en macOS).
  </Step>
  <Step title="Finalizar">
    - Resumen y siguientes pasos, incluyendo opciones de aplicaciones para iOS, Android y macOS.
  </Step>
</Steps>

<Note>
  Si no se detecta una GUI, el asistente imprime instrucciones de reenvío de puerto SSH para la
  Interfaz de Control en lugar de abrir un navegador. Si faltan los recursos de la Interfaz de
  Control, el asistente intenta compilarlos; la alternativa es `pnpm ui:build` (instala
  automáticamente las dependencias de la UI).
</Note>

## Detalles del modo remoto

El modo remoto configura esta máquina para conectarse a una puerta de enlace en otro lugar.

<Info>El modo remoto no instala ni modifica nada en el host remoto.</Info>

Lo que configura:

- URL de la puerta de enlace remota (`ws://...`)
- Token si se requiere autenticación en la puerta de enlace remota (recomendado)

<Note>
  - Si la puerta de enlace es solo de bucle local (loopback), use túnel SSH o una tailnet. -
  Sugerencias de descubrimiento: - macOS: Bonjour (`dns-sd`) - Linux: Avahi (`avahi-browse`)
</Note>

## Opciones de autenticación y modelo

<AccordionGroup>
  <Accordion title="Clave de API de Anthropic">
    Usa `ANTHROPIC_API_KEY` si está presente o pide una clave, luego la guarda para uso del demonio.
  </Accordion>
  <Accordion title="Anthropic OAuth (Claude Code CLI)">
    - macOS: verifica el elemento del llavero "Claude Code-credentials"
    - Linux y Windows: reutiliza `~/.claude/.credentials.json` si está presente

    En macOS, elija "Always Allow" para que los inicios de launchd no se bloqueen.

  </Accordion>
  <Accordion title="Anthropic token (setup-token paste)">
    Ejecute `claude setup-token` en cualquier máquina y luego pegue el token.
    Puede nombrarlo; en blanco se usa el predeterminado.
  </Accordion>
  <Accordion title="OpenAI Code subscription (Codex CLI reuse)">
    Si `~/.codex/auth.json` existe, el asistente puede reutilizarlo.
  </Accordion>
  <Accordion title="OpenAI Code subscription (OAuth)">
    Flujo del navegador; pegue `code#state`.

    Establece `agents.defaults.model` en `openai-codex/gpt-5.4` cuando el modelo no está configurado o es `openai/*`.

  </Accordion>
  <Accordion title="OpenAI API key">
    Usa `OPENAI_API_KEY` si está presente o solicita una clave, luego almacena la credencial en los perfiles de autenticación.

    Establece `agents.defaults.model` en `openai/gpt-5.1-codex` cuando el modelo no está configurado, es `openai/*` o `openai-codex/*`.

  </Accordion>
  <Accordion title="xAI (Grok) API key">
    Solicita `XAI_API_KEY` y configura xAI como proveedor de modelo.
  </Accordion>
  <Accordion title="OpenCode">
    Solicita `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`) y le permite elegir el catálogo Zen o Go.
    URL de configuración: [opencode.ai/auth](https://opencode.ai/auth).
  </Accordion>
  <Accordion title="API key (generic)">
    Almacena la clave para usted.
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    Solicita `AI_GATEWAY_API_KEY`.
    Más detalles: [Vercel AI Gateway](/es/providers/vercel-ai-gateway).
  </Accordion>
  <Accordion title="Cloudflare AI Gateway">
    Solicita el ID de cuenta, el ID de puerta de enlace y `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    Más detalles: [Cloudflare AI Gateway](/es/providers/cloudflare-ai-gateway).
  </Accordion>
  <Accordion title="MiniMax M2.5">
    La configuración se escribe automáticamente.
    Más detalles: [MiniMax](/es/providers/minimax).
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    Solicita `SYNTHETIC_API_KEY`.
    Más detalles: [Synthetic](/es/providers/synthetic).
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    Solicita la URL base (por defecto `http://127.0.0.1:11434`), luego ofrece los modos Cloud + Local o Local.
    Descubre los modelos disponibles y sugiere los predeterminados.
    Más detalles: [Ollama](/es/providers/ollama).
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Las configuraciones de Moonshot (Kimi K2) y Kimi Coding se escriben automáticamente.
    Más detalles: [Moonshot AI (Kimi + Kimi Coding)](/es/providers/moonshot).
  </Accordion>
  <Accordion title="Custom provider">
    Funciona con puntos de conexión compatibles con OpenAI y Anthropic.

    La integración interactiva admite las mismas opciones de almacenamiento de claves API que otros flujos de claves API de proveedores:
    - **Pegar clave API ahora** (texto plano)
    - **Usar referencia secreta** (referencia de entorno o referencia de proveedor configurada, con validación previa al vuelo)

    Opciones no interactivas:
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (opcional; vuelve a `CUSTOM_API_KEY`)
    - `--custom-provider-id` (opcional)
    - `--custom-compatibility <openai|anthropic>` (opcional; por defecto `openai`)

  </Accordion>
  <Accordion title="Skip">
    Deja la autenticación sin configurar.
  </Accordion>
</AccordionGroup>

Comportamiento del modelo:

- Elija el modelo predeterminado de las opciones detectadas, o ingrese el proveedor y el modelo manualmente.
- El asistente ejecuta una verificación del modelo y advierte si el modelo configurado es desconocido o carece de autenticación.

Rutas de credenciales y perfiles:

- Credenciales de OAuth: `~/.openclaw/credentials/oauth.json`
- Perfiles de autenticación (claves de API + OAuth): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

Modo de almacenamiento de credenciales:

- El comportamiento de incorporación predeterminado persiste las claves de API como valores de texto sin formato en los perfiles de autenticación.
- `--secret-input-mode ref` habilita el modo de referencia en lugar del almacenamiento de claves en texto plano.
  En la configuración interactiva, puede elegir:
  - referencia de variable de entorno (por ejemplo, `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)
  - referencia de proveedor configurado (`file` o `exec`) con alias de proveedor + id
- El modo de referencia interactiva ejecuta una validación previa rápida antes de guardar.
  - Referencias de entorno: valida el nombre de la variable + valor no vacío en el entorno de incorporación actual.
  - Referencias de proveedor: valida la configuración del proveedor y resuelve el id solicitado.
  - Si la validación previa falla, la incorporación muestra el error y le permite reintentar.
- En modo no interactivo, `--secret-input-mode ref` solo está respaldado por variables de entorno.
  - Establezca la variable de entorno del proveedor en el entorno del proceso de incorporación.
  - Las banderas de clave en línea (por ejemplo, `--openai-api-key`) requieren que se establezca esa variable de entorno; de lo contrario, la incorporación falla rápidamente.
  - Para proveedores personalizados, el modo `ref` no interactivo almacena `models.providers.<id>.apiKey` como `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`.
  - En ese caso de proveedor personalizado, `--custom-api-key` requiere que se establezca `CUSTOM_API_KEY`; de lo contrario, la incorporación falla rápidamente.
- Las credenciales de autenticación de la puerta de enlace admiten opciones de texto plano y SecretRef en la configuración interactiva:
  - Modo de token: **Generar/almacenar token de texto sin formato** (predeterminado) o **Usar SecretRef**.
  - Modo de contraseña: texto sin formato o SecretRef.
- Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
- Las configuraciones existentes de texto sin formato siguen funcionando sin cambios.

<Note>
  Consejo para servidor sin cabeza (headless): complete OAuth en una máquina con un navegador, luego
  copie `~/.openclaw/credentials/oauth.json` (o `$OPENCLAW_STATE_DIR/credentials/oauth.json`) al
  host de la puerta de enlace.
</Note>

## Salidas e internos

Campos típicos en `~/.openclaw/openclaw.json`:

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` (si se elige Minimax)
- `tools.profile` (el onboarding local usa `"coding"` por defecto si no está configurado; se conservan los valores explícitos existentes)
- `gateway.*` (modo, bind, auth, tailscale)
- `session.dmScope` (el onboarding local usa `per-channel-peer` por defecto si no está configurado; se conservan los valores explícitos existentes)
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- Listas de permitidos de canales (Slack, Discord, Matrix, Microsoft Teams) cuando optas por participar durante las indicaciones (los nombres se resuelven en IDs cuando es posible)
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` escribe `agents.list[]` y `bindings` opcional.

Las credenciales de WhatsApp se guardan en `~/.openclaw/credentials/whatsapp/<accountId>/`.
Las sesiones se almacenan en `~/.openclaw/agents/<agentId>/sessions/`.

<Note>
  Algunos canales se entregan como complementos (plugins). Cuando se seleccionan durante la
  configuración, el asistente solicita instalar el complemento (npm o ruta local) antes de la
  configuración del canal.
</Note>

RPC del asistente de puerta de enlace:

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

Los clientes (aplicación macOS e interfaz de usuario de Control) pueden renderizar pasos sin volver a implementar la lógica de onboarding.

Comportamiento de configuración de Signal:

- Descarga el activo de lanzamiento adecuado
- Lo almacena bajo `~/.openclaw/tools/signal-cli/<version>/`
- Escribe `channels.signal.cliPath` en la configuración
- Las compilaciones de JVM requieren Java 21
- Se usan compilaciones nativas cuando están disponibles
- Windows usa WSL2 y sigue el flujo de signal-cli de Linux dentro de WSL

## Documentos relacionados

- Centro de incorporación: [Incorporación (CLI)](/es/start/wizard)
- Automatización y scripts: [Automatización de CLI](/es/start/wizard-cli-automation)
- Referencia de comandos: [`openclaw onboard`](/es/cli/onboard)

import es from "/components/footer/es.mdx";

<es />
