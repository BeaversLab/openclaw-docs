---
summary: "Referencia completa para la incorporación mediante CLI: cada paso, indicador y campo de configuración"
read_when:
  - Buscar un paso o indicador específico de la incorporación
  - Automatizar la incorporación con el modo no interactivo
  - Depuración del comportamiento de la incorporación
title: "Referencia de la incorporación"
sidebarTitle: "Referencia de la incorporación"
---

# Referencia de la incorporación

Esta es la referencia completa de `openclaw onboard`.
Para obtener una visión general de alto nivel, consulte [Incorporación (CLI)](/es/start/wizard).

## Detalles del flujo (modo local)

<Steps>
  <Step title="Detección de configuración existente">
    - Si `~/.openclaw/openclaw.json` existe, elija **Mantener / Modificar / Restablecer**.
    - Volver a ejecutar la incorporación **no** borra nada a menos que elija explícitamente **Restablecer**
      (o pase `--reset`).
    - El indicador `--reset` de la CLI por defecto es `config+creds+sessions`; use `--reset-scope full`
      para también eliminar el espacio de trabajo.
    - Si la configuración no es válida o contiene claves heredadas, el asistente se detiene y le pide
      que ejecute `openclaw doctor` antes de continuar.
    - Restablecer usa `trash` (nunca `rm`) y ofrece alcances:
      - Solo configuración
      - Configuración + credenciales + sesiones
      - Restablecimiento completo (también elimina el espacio de trabajo)
  </Step>
  <Step title="Modelo/Auth">
    - **Clave de API de Anthropic**: usa `ANTHROPIC_API_KEY` si está presente o solicita una clave, luego la guarda para uso del daemon.
    - **OAuth de Anthropic (Claude Code CLI)**: en la configuración inicial en macOS, verifica el elemento del Llavero de claves "Claude Code-credentials" (elija "Permitir siempre" para que los inicios de launchd no se bloqueen); en Linux/Windows reutiliza `~/.claude/.credentials.json` si está presente.
    - **Token de Anthropic (pegar setup-token)**: ejecute `claude setup-token` en cualquier máquina, luego pegue el token (puede darle un nombre; en blanco = predeterminado).
    - **Suscripción OpenAI Code (Codex) (Codex CLI)**: si `~/.codex/auth.json` existe, la configuración inicial puede reutilizarla.
    - **Suscripción OpenAI Code (Codex) (OAuth)**: flujo del navegador; pegue el `code#state`.
      - Establece `agents.defaults.model` en `openai-codex/gpt-5.2` cuando el modelo no está configurado o `openai/*`.
    - **Clave de API de OpenAI**: usa `OPENAI_API_KEY` si está presente o solicita una clave, luego la almacena en perfiles de autenticación.
    - **Clave de API de xAI (Grok)**: solicita `XAI_API_KEY` y configura xAI como proveedor de modelo.
    - **OpenCode**: solicita `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`, consígalo en https://opencode.ai/auth) y le permite elegir el catálogo Zen o Go.
    - **Ollama**: solicita la URL base de Ollama, ofrece el modo **Nube + Local** o **Local**, descubre los modelos disponibles y extrae automáticamente el modelo local seleccionado cuando sea necesario.
    - Más detalles: [Ollama](/es/providers/ollama)
    - **Clave de API**: almacena la clave por usted.
    - **Vercel AI Gateway (proxy multi-modelo)**: solicita `AI_GATEWAY_API_KEY`.
    - Más detalles: [Vercel AI Gateway](/es/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**: solicita el ID de cuenta, el ID de puerta de enlace y `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    - Más detalles: [Cloudflare AI Gateway](/es/providers/cloudflare-ai-gateway)
    - **MiniMax M2.5**: la configuración se escribe automáticamente.
    - Más detalles: [MiniMax](/es/providers/minimax)
    - **Synthetic (compatible con Anthropic)**: solicita `SYNTHETIC_API_KEY`.
    - Más detalles: [Synthetic](/es/providers/synthetic)
    - **Moonshot (Kimi K2)**: la configuración se escribe automáticamente.
    - **Kimi Coding**: la configuración se escribe automáticamente.
    - Más detalles: [Moonshot AI (Kimi + Kimi Coding)](/es/providers/moonshot)
    - **Omitir**: no hay autenticación configurada todavía.
    - Elija un modelo predeterminado de las opciones detectadas (o ingrese proveedor/modelo manualmente). Para obtener la mejor calidad y un menor riesgo de inyección de avisos, elija el modelo de última generación más potente disponible en su pila de proveedores.
    - La configuración inicial ejecuta una verificación del modelo y advierte si el modelo configurado es desconocido o falta la autenticación.
    - El modo de almacenamiento de clave de API predeterminado es valores de perfil de autenticación en texto plano. Use `--secret-input-mode ref` para almacenar referencias respaldadas por env en su lugar (por ejemplo `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`).
    - Las credenciales de OAuth viven en `~/.openclaw/credentials/oauth.json`; los perfiles de autenticación viven en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (claves de API + OAuth).
    - Más detalles: [/concepts/oauth](/es/concepts/oauth)
    <Note>
    Consejo para headless/servidor: complete OAuth en una máquina con un navegador, luego copie
    `~/.openclaw/credentials/oauth.json` (o `$OPENCLAW_STATE_DIR/credentials/oauth.json`) al
    host de la puerta de enlace.
    </Note>
  </Step>
  <Step title="Workspace">
    - Predeterminado `~/.openclaw/workspace` (configurable).
    - Inicializa los archivos del espacio de trabajo necesarios para el ritual de arranque del agente.
    - Guía completa del diseño del espacio de trabajo + copia de seguridad: [Agent workspace](/es/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - Puerto, enlace, modo de autenticación, exposición de tailscale.
    - Recomendación de autenticación: mantenga **Token** incluso para el bucle local (loopback) para que los clientes WS locales deban autenticarse.
    - En modo token, la configuración interactiva ofrece:
      - **Generar/guardar token en texto sin formato** (predeterminado)
      - **Usar SecretRef** (opcional)
      - El inicio rápido reutiliza los `gateway.auth.token` SecretRefs existentes en los proveedores `env`, `file` y `exec` para el arranque de sondeos/paneles de incorporación.
      - Si ese SecretRef está configurado pero no se puede resolver, la incorporación falla temprano con un mensaje claro de solución en lugar de degradar silenciosamente la autenticación en tiempo de ejecución.
    - En modo contraseña, la configuración interactiva también admite almacenamiento en texto sin formato o SecretRef.
    - Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
      - Requiere una variable de entorno no vacía en el entorno del proceso de incorporación.
      - No se puede combinar con `--gateway-token`.
    - Desactive la autenticación solo si confía completamente en todos los procesos locales.
    - Los enlaces no de bucle local (non‑loopback) aún requieren autenticación.
  </Step>
  <Step title="Canales">
    - [WhatsApp](/es/channels/whatsapp): inicio de sesión con QR opcional.
    - [Telegram](/es/channels/telegram): token del bot.
    - [Discord](/es/channels/discord): token del bot.
    - [Google Chat](/es/channels/googlechat): JSON de cuenta de servicio + audiencia del webhook.
    - [Mattermost](/es/channels/mattermost) (complemento): token del bot + URL base.
    - [Signal](/es/channels/signal): instalación opcional de `signal-cli` + configuración de cuenta.
    - [BlueBubbles](/es/channels/bluebubbles): **recomendado para iMessage**; URL del servidor + contraseña + webhook.
    - [iMessage](/es/channels/imessage): ruta de la CLI heredada `imsg` + acceso a la base de datos.
    - Seguridad de MD: el valor predeterminado es emparejamiento. El primer DM envía un código; apruébelo mediante `openclaw pairing approve <channel> <code>` o use listas de permitidos.
  </Step>
  <Step title="Búsqueda web">
    - Elija un proveedor: Perplexity, Brave, Gemini, Grok o Kimi (o omita).
    - Pegue su clave de API (QuickStart detecta automáticamente las claves de las variables de entorno o la configuración existente).
    - Omitir con `--skip-search`.
    - Configurar más tarde: `openclaw configure --section web`.
  </Step>
  <Step title="Instalación del demonio">
    - macOS: LaunchAgent
      - Requiere una sesión de usuario iniciada; para headless, use un LaunchDaemon personalizado (no incluido).
    - Linux (y Windows a través de WSL2): unidad de usuario systemd
      - La incorporación intenta habilitar lingering mediante `loginctl enable-linger <user>` para que el Gateway se mantenga activo después de cerrar sesión.
      - Puede pedir sudo (escribe `/var/lib/systemd/linger`); intenta primero sin sudo.
    - **Selección de tiempo de ejecución:** Node (recomendado; necesario para WhatsApp/Telegram). Bun **no está recomendado**.
    - Si la autenticación por token requiere un token y `gateway.auth.token` está administrado por SecretRef, la instalación del demonio lo valida pero no persiste los valores de token de texto resueltos en los metadatos del entorno del servicio del supervisor.
    - Si la autenticación por token requiere un token y el SecretRef del token configurado no está resuelto, la instalación del demonio se bloquea con una guía accionable.
    - Si están configurados tanto `gateway.auth.token` como `gateway.auth.password` y `gateway.auth.mode` no está establecido, la instalación del demonio se bloquea hasta que el modo se establezca explícitamente.
  </Step>
  <Step title="Comprobación de estado">
    - Inicia el Gateway (si es necesario) y ejecuta `openclaw health`.
    - Consejo: `openclaw status --deep` añade sondas de estado del gateway a la salida de estado (requiere un gateway accesible).
  </Step>
  <Step title="Habilidades (recomendado)">
    - Lee las habilidades disponibles y comprueba los requisitos.
    - Le permite elegir un gestor de nodos: **npm / pnpm** (bun no recomendado).
    - Instala dependencias opcionales (algunas usan Homebrew en macOS).
  </Step>
  <Step title="Finalizar">
    - Resumen + siguientes pasos, incluidas las aplicaciones iOS/Android/macOS para funciones adicionales.
  </Step>
</Steps>

<Note>
Si no se detecta una GUI, la incorporación imprime instrucciones de reenvío de puerto SSH para la interfaz de usuario de control (Control UI) en lugar de abrir un navegador.
Si faltan los activos de la interfaz de usuario de control, la incorporación intenta compilarlos; la alternativa es `pnpm ui:build` (instala automáticamente las dependencias de la interfaz de usuario).
</Note>

## Modo no interactivo

Use `--non-interactive` para automatizar o guionizar la incorporación:

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

SecretRef del token de puerta de enlace en modo no interactivo:

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` y `--gateway-token-ref-env` son mutuamente excluyentes.

<Note>
`--json` **no** implica el modo no interactivo. Use `--non-interactive` (y `--workspace`) para scripts.
</Note>

Los ejemplos de comandos específicos del proveedor se encuentran en [CLI Automation](/es/start/wizard-cli-automation#provider-specific-examples).
Use esta página de referencia para la semántica de las banderas y el orden de los pasos.

### Agregar agente (no interactivo)

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Asistente RPC de puerta de enlace

La puerta de enlace expone el flujo de incorporación a través de RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`).
Los clientes (aplicación macOS, Interfaz de control) pueden representar los pasos sin volver a implementar la lógica de incorporación.

## Configuración de Signal (signal-cli)

La incorporación puede instalar `signal-cli` desde los lanzamientos de GitHub:

- Descarga el activo de lanzamiento adecuado.
- Lo almacena bajo `~/.openclaw/tools/signal-cli/<version>/`.
- Escribe `channels.signal.cliPath` en su configuración.

Notas:

- Las compilaciones de JVM requieren **Java 21**.
- Se utilizan compilaciones nativas cuando están disponibles.
- Windows usa WSL2; la instalación de signal-cli sigue el flujo de Linux dentro de WSL.

## Lo que escribe el asistente

Campos típicos en `~/.openclaw/openclaw.json`:

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` (si se elige Minimax)
- `tools.profile` (la incorporación local por defecto es `"coding"` si no se establece; se preservan los valores explícitos existentes)
- `gateway.*` (modo, bind, auth, tailscale)
- `session.dmScope` (detalles de comportamiento: [CLI Setup Reference](/es/start/wizard-cli-reference#outputs-and-internals))
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

Algunos canales se entregan como complementos. Cuando seleccionas uno durante la configuración, la incorporación te pedirá que lo instales (npm o una ruta local) antes de poder configurarlo.

## Documentos relacionados

- Resumen de incorporación: [Incorporación (CLI)](/es/start/wizard)
- Incorporación de la aplicación de macOS: [Incorporación](/es/start/onboarding)
- Referencia de configuración: [Configuración de la puerta de enlace](/es/gateway/configuration)
- Proveedores: [WhatsApp](/es/channels/whatsapp), [Telegram](/es/channels/telegram), [Discord](/es/channels/discord), [Google Chat](/es/channels/googlechat), [Signal](/es/channels/signal), [BlueBubbles](/es/channels/bluebubbles) (iMessage), [iMessage](/es/channels/imessage) (heredado)
- Habilidades: [Habilidades](/es/tools/skills), [Configuración de habilidades](/es/tools/skills-config)

import en from "/components/footer/en.mdx";

<en />
