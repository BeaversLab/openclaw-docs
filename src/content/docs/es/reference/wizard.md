---
summary: "Referencia completa para la integración de CLI: cada paso, indicador y campo de configuración"
read_when:
  - Looking up a specific onboarding step or flag
  - Automating onboarding with non-interactive mode
  - Debugging onboarding behavior
title: "Referencia de integración"
sidebarTitle: "Referencia de integración"
---

# Referencia de integración

Esta es la referencia completa de `openclaw onboard`.
Para obtener una descripción general de alto nivel, consulte [Incorporación (CLI)](/en/start/wizard).

## Detalles del flujo (modo local)

<Steps>
  <Step title="Detección de configuración existente">
    - Si `~/.openclaw/openclaw.json` existe, elija **Conservar / Modificar / Restablecer**.
    - Volver a ejecutar la integración **no** borra nada a menos que elija explícitamente **Restablecer**
      (o pase `--reset`).
    - El indicador `--reset` de la CLI por defecto es `config+creds+sessions`; use `--reset-scope full`
      para también eliminar el espacio de trabajo.
    - Si la configuración no es válida o contiene claves heredadas, el asistente se detiene y le pide
      que ejecute `openclaw doctor` antes de continuar.
    - Restablecer usa `trash` (nunca `rm`) y ofrece ámbitos:
      - Solo configuración
      - Configuración + credenciales + sesiones
      - Restablecimiento completo (también elimina el espacio de trabajo)
  </Step>
  <Step title="Modelo/Auth">
    - **Clave de API de Anthropic**: usa `ANTHROPIC_API_KEY` si está presente o solicita una clave, y luego la guarda para uso del demonio.
    - **CLI de Anthropic Claude**: en macOS, la incorporación (onboarding) verifica el elemento del llavero "Claude Code-credentials" (elija "Permitir siempre" para que los inicios de launchd no se bloqueen); en Linux/Windows reutiliza `~/.claude/.credentials.json` si está presente y cambia la selección del modelo a `claude-cli/...`.
    - **Token de Anthropic (pegar setup-token)**: ejecute `claude setup-token` en cualquier máquina y luego pegue el token (puede asignarle un nombre; en blanco = predeterminado).
    - **Suscripción de OpenAI Code (Codex) (CLI de Codex)**: si `~/.codex/auth.json` existe, la incorporación puede reutilizarla.
    - **Suscripción de OpenAI Code (Codex) (OAuth)**: flujo del navegador; pegue el `code#state`.
      - Establece `agents.defaults.model` en `openai-codex/gpt-5.2` cuando el modelo no está configurado o es `openai/*`.
    - **Clave de API de OpenAI**: usa `OPENAI_API_KEY` si está presente o solicita una clave, y luego la almacena en perfiles de autenticación.
    - **Clave de API de xAI (Grok)**: solicita `XAI_API_KEY` y configura xAI como proveedor de modelos.
    - **OpenCode**: solicita `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`, consígalo en https://opencode.ai/auth) y le permite elegir el catálogo Zen o Go.
    - **Ollama**: solicita la URL base de Ollama, ofrece el modo **Cloud + Local** o **Local**, descubre los modelos disponibles y extrae automáticamente el modelo local seleccionado cuando sea necesario.
    - Más detalles: [Ollama](/en/providers/ollama)
    - **Clave de API**: almacena la clave por usted.
    - **Vercel AI Gateway (proxy multi-modelo)**: solicita `AI_GATEWAY_API_KEY`.
    - Más detalles: [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**: solicita el ID de cuenta, el ID de puerta de enlace y `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    - Más detalles: [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
    - **MiniMax**: la configuración se escribe automáticamente; el valor predeterminado alojado es `MiniMax-M2.7` y `MiniMax-M2.5` permanece disponible.
    - Más detalles: [MiniMax](/en/providers/minimax)
    - **Synthetic (compatible con Anthropic)**: solicita `SYNTHETIC_API_KEY`.
    - Más detalles: [Synthetic](/en/providers/synthetic)
    - **Moonshot (Kimi K2)**: la configuración se escribe automáticamente.
    - **Kimi Coding**: la configuración se escribe automáticamente.
    - Más detalles: [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
    - **Omitir (Skip)**: aún no se ha configurado autenticación.
    - Elija un modelo predeterminado de las opciones detectadas (o ingrese proveedor/modelo manualmente). Para obtener la mejor calidad y un menor riesgo de inyección de indicaciones (prompt-injection), elija el modelo más potente de la última generación disponible en su pila de proveedores.
    - La incorporación ejecuta una verificación del modelo y advierte si el modelo configurado es desconocido o falta la autenticación.
    - El modo de almacenamiento de claves de API predetermina a valores de perfil de autenticación en texto sin formato. Use `--secret-input-mode ref` para almacenar referencias respaldadas por variables de entorno en su lugar (por ejemplo `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`).
    - Las credenciales de OAuth residen en `~/.openclaw/credentials/oauth.json`; los perfiles de autenticación residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (claves de API + OAuth).
    - Más detalles: [/concepts/oauth](/en/concepts/oauth)
    <Note>
    Sugerencia para servidor/headless: complete OAuth en una máquina con navegador, luego copie
    `~/.openclaw/credentials/oauth.json` (o `$OPENCLAW_STATE_DIR/credentials/oauth.json`) al
    host de la puerta de enlace.
    </Note>
  </Step>
  <Step title="Workspace">
    - Predeterminado `~/.openclaw/workspace` (configurable).
    - Inicializa los archivos del espacio de trabajo necesarios para el ritual de arranque del agente.
    - Diseño completo del espacio de trabajo + guía de respaldo: [Agent workspace](/en/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - Puerto, bind, modo de autenticación, exposición de tailscale.
    - Recomendación de autenticación: mantenga **Token** incluso para loopback para que los clientes WS locales deban autenticarse.
    - En modo token, la configuración interactiva ofrece:
      - **Generar/guardar token en texto plano** (predeterminado)
      - **Usar SecretRef** (opcional)
      - El inicio rápido reutiliza los SecretRefs `gateway.auth.token` existentes en los proveedores `env`, `file` y `exec` para el arranque del panel/sondeo de incorporación.
      - Si ese SecretRef está configurado pero no se puede resolver, la incorporación falla antes con un mensaje claro de solución en lugar de degradar silenciosamente la autenticación en tiempo de ejecución.
    - En modo contraseña, la configuración interactiva también admite almacenamiento en texto plano o SecretRef.
    - Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
      - Requiere una variable de entorno no vacía en el entorno del proceso de incorporación.
      - No se puede combinar con `--gateway-token`.
    - Desactive la autenticación solo si confía plenamente en cada proceso local.
    - Los enlaces no loopback aún requieren autenticación.
  </Step>
  <Step title="Canales">
    - [WhatsApp](/en/channels/whatsapp): inicio de sesión QR opcional.
    - [Telegram](/en/channels/telegram): token del bot.
    - [Discord](/en/channels/discord): token del bot.
    - [Google Chat](/en/channels/googlechat): JSON de cuenta de servicio + audiencia de webhook.
    - [Mattermost](/en/channels/mattermost) (plugin): token del bot + URL base.
    - [Signal](/en/channels/signal): instalación opcional de `signal-cli` + configuración de cuenta.
    - [BlueBubbles](/en/channels/bluebubbles): **recomendado para iMessage**; URL del servidor + contraseña + webhook.
    - [iMessage](/en/channels/imessage): ruta de CLI heredada de `imsg` + acceso a la base de datos.
    - Seguridad de MD: el valor predeterminado es el emparejamiento. El primer MD envía un código; apruébelo a través de `openclaw pairing approve <channel> <code>` o use listas de permitidos.
  </Step>
  <Step title="Búsqueda web">
    - Elija un proveedor: Perplexity, Brave, Gemini, Grok o Kimi (u omita).
    - Pegue su clave de API (QuickStart detecta automáticamente las claves de las variables de entorno o la configuración existente).
    - Omitir con `--skip-search`.
    - Configurar más tarde: `openclaw configure --section web`.
  </Step>
  <Step title="Daemon install">
    - macOS: LaunchAgent
      - Requiere una sesión de usuario iniciada; para sin cabeza, use un LaunchDaemon personalizado (no incluido).
    - Linux (y Windows vía WSL2): unidad de usuario systemd
      - El onboarding intenta habilitar lingering mediante `loginctl enable-linger <user>` para que la Gateway se mantenga activa después de cerrar sesión.
      - Puede pedir sudo (escribe `/var/lib/systemd/linger`); primero intenta sin sudo.
    - **Selección de tiempo de ejecución:** Node (recomendado; obligatorio para WhatsApp/Telegram). Bun **no está recomendado**.
    - Si la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, la instalación del demonio lo valida pero no persiste los valores de token en texto plano resueltos en los metadatos del entorno del servicio supervisor.
    - Si la autenticación por token requiere un token y el SecretRef de token configurado no está resuelto, la instalación del demonio se bloquea con orientación práctica.
    - Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación del demonio se bloquea hasta que el modo se establece explícitamente.
  </Step>
  <Step title="Comprobación de estado">
    - Inicia la puerta de enlace (si es necesario) y ejecuta `openclaw health`.
    - Consejo: `openclaw status --deep` añade sondas de estado de la puerta de enlace a la salida de estado (requiere una puerta de enlace accesible).
  </Step>
  <Step title="Habilidades (recomendado)">
    - Lee las habilidades disponibles y verifica los requisitos.
    - Le permite elegir un gestor de nodos: **npm / pnpm** (bun no recomendado).
    - Instala dependencias opcionales (algunas usan Homebrew en macOS).
  </Step>
  <Step title="Finalizar">
    - Resumen + siguientes pasos, incluyendo las aplicaciones de iOS/Android/macOS para funciones adicionales.
  </Step>
</Steps>

<Note>Si no se detecta ninguna GUI, la incorporación imprime instrucciones de reenvío de puerto SSH para la interfaz de usuario de control (Control UI) en lugar de abrir un navegador. Si faltan los recursos de la interfaz de usuario de control, la incorporación intenta compilarlos; la alternativa es `pnpm ui:build` (instala automáticamente las dependencias de la interfaz de usuario).</Note>

## Modo no interactivo

Use `--non-interactive` para automatizar o crear secuencias de comandos de la incorporación:

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

Añada `--json` para obtener un resumen legible por máquina.

SecretRef del token de Gateway en modo no interactivo:

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` y `--gateway-token-ref-env` son mutuamente excluyentes.

<Note>`--json` **no** implica el modo no interactivo. Use `--non-interactive` (y `--workspace`) para las secuencias de comandos.</Note>

Los ejemplos de comandos específicos del proveedor se encuentran en [CLI Automation](/en/start/wizard-cli-automation#provider-specific-examples).
Use esta página de referencia para la semántica de las banderas (flags) y el orden de los pasos.

### Añadir agente (no interactivo)

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Asistente del Gateway RPC

El Gateway expone el flujo de incorporación a través de RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`).
Los clientes (aplicación macOS, interfaz de Control) pueden mostrar los pasos sin volver a implementar la lógica de incorporación.

## Configuración de Signal (signal-cli)

La incorporación puede instalar `signal-cli` desde las versiones de GitHub:

- Descarga el activo de lanzamiento adecuado.
- Lo almacena en `~/.openclaw/tools/signal-cli/<version>/`.
- Escribe `channels.signal.cliPath` en su configuración.

Notas:

- Las compilaciones de JVM requieren **Java 21**.
- Se utilizan compilaciones nativas cuando están disponibles.
- Windows usa WSL2; la instalación de signal-cli sigue el flujo de Linux dentro de WSL.

## Lo que escribe el asistente

Campos típicos en `~/.openclaw/openclaw.json`:

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` (si se elige Minimax)
- `tools.profile` (la incorporación local usa por defecto `"coding"` si no está establecido; se preservan los valores explícitos existentes)
- `gateway.*` (modo, bind, auth, tailscale)
- `session.dmScope` (detalles del comportamiento: [CLI Setup Reference](/en/start/wizard-cli-reference#outputs-and-internals))
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- Listas de permitidos de canales (Slack/Discord/Matrix/Microsoft Teams) cuando opta por participar durante las indicaciones (los nombres se resuelven en ID cuando es posible).
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` escribe `agents.list[]` y `bindings` opcional.

Las credenciales de WhatsApp van en `~/.openclaw/credentials/whatsapp/<accountId>/`.
Las sesiones se almacenan en `~/.openclaw/agents/<agentId>/sessions/`.

Algunos canales se entregan como complementos. Cuando seleccionas uno durante la configuración, la incorporación
solicitará instalarlo (npm o una ruta local) antes de que pueda ser configurado.

## Documentos relacionados

- Resumen de incorporación: [Incorporación (CLI)](/en/start/wizard)
- Incorporación de la aplicación macOS: [Incorporación](/en/start/onboarding)
- Referencia de configuración: [Configuración de la puerta de enlace](/en/gateway/configuration)
- Proveedores: [WhatsApp](/en/channels/whatsapp), [Telegram](/en/channels/telegram), [Discord](/en/channels/discord), [Google Chat](/en/channels/googlechat), [Signal](/en/channels/signal), [BlueBubbles](/en/channels/bluebubbles) (iMessage), [iMessage](/en/channels/imessage) (heredado)
- Habilidades: [Habilidades](/en/tools/skills), [Configuración de habilidades](/en/tools/skills-config)
