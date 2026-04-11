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
Para obtener una descripción general de alto nivel, consulte [Onboarding (CLI)](/en/start/wizard).

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
  <Step title="Model/Auth">
    - **Clave de API de Anthropic**: usa `ANTHROPIC_API_KEY` si está presente o solicita una clave, luego la guarda para su uso por parte del daemon.
    - **Clave de API de Anthropic**: elección de asistente de Anthropic preferida en onboarding/configure.
    - **Token de configuración de Anthropic**: todavía disponible en onboarding/configure, aunque OpenClaw ahora prefiere reutilizar Claude CLI cuando está disponible.
    - **Suscripción de OpenAI Code (Codex) (Codex CLI)**: si existe `~/.codex/auth.json`, el onboarding puede reutilizarla. Las credenciales reutilizadas de Codex CLI siguen siendo administradas por Codex CLI; al expirar, OpenClaw vuelve a leer esa fuente primero y, cuando el proveedor puede actualizarla, escribe la credencial actualizada de nuevo en el almacenamiento de Codex en lugar de hacerse cargo de ella.
    - **Suscripción de OpenAI Code (Codex) (OAuth)**: flujo del navegador; pegue el `code#state`.
      - Establece `agents.defaults.model` en `openai-codex/gpt-5.4` cuando el modelo no está configurado o es `openai/*`.
    - **Clave de API de OpenAI**: usa `OPENAI_API_KEY` si está presente o solicita una clave, luego la almacena en los perfiles de autenticación.
      - Establece `agents.defaults.model` en `openai/gpt-5.4` cuando el modelo no está configurado, es `openai/*` o `openai-codex/*`.
    - **Clave de API de xAI (Grok)**: solicita `XAI_API_KEY` y configura xAI como proveedor de modelos.
    - **OpenCode**: solicita `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`, consígalo en https://opencode.ai/auth) y le permite elegir el catálogo Zen o Go.
    - **Ollama**: solicita la URL base de Ollama, ofrece el modo **Cloud + Local** o **Local**, descubre los modelos disponibles y extrae automáticamente el modelo local seleccionado cuando es necesario.
    - Más detalles: [Ollama](/en/providers/ollama)
    - **Clave de API**: almacena la clave para usted.
    - **Vercel AI Gateway (proxy multi-modelo)**: solicita `AI_GATEWAY_API_KEY`.
    - Más detalles: [Vercel AI Gateway](/en/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**: solicita el ID de cuenta, el ID de Gateway y `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    - Más detalles: [Cloudflare AI Gateway](/en/providers/cloudflare-ai-gateway)
    - **MiniMax**: la configuración se escribe automáticamente; el valor predeterminado alojado es `MiniMax-M2.7`.
      La configuración con clave de API usa `minimax/...`, y la configuración con OAuth usa
      `minimax-portal/...`.
    - Más detalles: [MiniMax](/en/providers/minimax)
    - **StepFun**: la configuración se escribe automáticamente para StepFun estándar o Step Plan en puntos finales de China o globales.
    - El estándar actualmente incluye `step-3.5-flash`, y Step Plan también incluye `step-3.5-flash-2603`.
    - Más detalles: [StepFun](/en/providers/stepfun)
    - **Sintético (compatible con Anthropic)**: solicita `SYNTHETIC_API_KEY`.
    - Más detalles: [Synthetic](/en/providers/synthetic)
    - **Moonshot (Kimi K2)**: la configuración se escribe automáticamente.
    - **Kimi Coding**: la configuración se escribe automáticamente.
    - Más detalles: [Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
    - **Skip**: sin autenticación configurada todavía.
    - Elija un modelo predeterminado de las opciones detectadas (o ingrese proveedor/modelo manualmente). Para obtener la mejor calidad y un menor riesgo de inyección de mensajes, elija el modelo de última generación más potente disponible en su pila de proveedores.
    - El onboarding ejecuta una verificación del modelo y advierte si el modelo configurado es desconocido o falta la autenticación.
    - El modo de almacenamiento de claves de API es predeterminado en valores de perfil de autenticación en texto plano. Use `--secret-input-mode ref` para almacenar referencias respaldadas por env en su lugar (por ejemplo `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`).
    - Los perfiles de autenticación residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (claves de API + OAuth). `~/.openclaw/credentials/oauth.json` es solo de importación heredada.
    - Más detalles: [/concepts/oauth](/en/concepts/oauth)
    <Note>
    Consejo para headless/servidor: complete OAuth en una máquina con un navegador, luego copie
    el `auth-profiles.json` de ese agente (por ejemplo
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`, o la ruta `$OPENCLAW_STATE_DIR/...` correspondiente)
    al host de la puerta de enlace. `credentials/oauth.json`
    es solo una fuente de importación heredada.
    </Note>
  </Step>
  <Step title="Workspace">
    - Por defecto `~/.openclaw/workspace` (configurable).
    - Siembra los archivos del espacio de trabajo necesarios para el ritual de arranque del agente.
    - Diseño completo del espacio de trabajo + guía de respaldo: [Agente workspace](/en/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - Puerto, bind, modo de autenticación, exposición de tailscale.
    - Recomendación de auth: mantenga **Token** incluso para loopback para que los clientes WS locales deban autenticarse.
    - En modo token, la configuración interactiva ofrece:
      - **Generar/guardar token en texto plano** (por defecto)
      - **Usar SecretRef** (opcional)
      - El inicio rápido reutiliza los SecretRefs existentes de `gateway.auth.token` en los proveedores `env`, `file` y `exec` para el arranque de la sonda/panel de incorporación.
      - Si ese SecretRef está configurado pero no se puede resolver, la incorporación falla temprano con un mensaje claro de solución en lugar de degradar silenciosamente la autenticación en tiempo de ejecución.
    - En modo contraseña, la configuración interactiva también admite almacenamiento en texto plano o SecretRef.
    - Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
      - Requiere una variable de entorno no vacía en el entorno del proceso de incorporación.
      - No se puede combinar con `--gateway-token`.
    - Desactive la autenticación solo si confía plenamente en cada proceso local.
    - Los enlaces no locales aún requieren autenticación.
  </Step>
  <Step title="Canales">
    - [WhatsApp](/en/channels/whatsapp): inicio de sesión con QR opcional.
    - [Telegram](/en/channels/telegram): token del bot.
    - [Discord](/en/channels/discord): token del bot.
    - [Google Chat](/en/channels/googlechat): JSON de cuenta de servicio + audiencia del webhook.
    - [Mattermost](/en/channels/mattermost) (complemento): token del bot + URL base.
    - [Signal](/en/channels/signal): instalación opcional de `signal-cli` + configuración de cuenta.
    - [BlueBubbles](/en/channels/bluebubbles): **recomendado para iMessage**; URL del servidor + contraseña + webhook.
    - [iMessage](/en/channels/imessage): ruta de la CLI heredada de `imsg` + acceso a la base de datos.
    - Seguridad de MD: el valor predeterminado es el emparejamiento. El primer DM envía un código; apruébelo a través de `openclaw pairing approve <channel> <code>` o use listas de permitidos.
  </Step>
  <Step title="Búsqueda web">
    - Elija un proveedor compatible como Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG o Tavily (o omita).
    - Los proveedores con respaldo de API pueden usar variables de entorno o configuración existente para una configuración rápida; los proveedores sin clave usan sus requisitos específicos del proveedor en su lugar.
    - Omitir con `--skip-search`.
    - Configurar más tarde: `openclaw configure --section web`.
  </Step>
  <Step title="Instalación del demonio">
    - macOS: LaunchAgent
      - Requiere una sesión de usuario iniciada; para headless, use un LaunchDaemon personalizado (no incluido).
    - Linux (y Windows a través de WSL2): unidad de usuario systemd
      - El onboarding intenta habilitar lingering mediante `loginctl enable-linger <user>` para que el Gateway se mantenga activo después del cierre de sesión.
      - Puede solicitar sudo (escribe `/var/lib/systemd/linger`); primero lo intenta sin sudo.
    - **Selección de tiempo de ejecución:** Node (recomendado; requerido para WhatsApp/Telegram). Bun **no es recomendado**.
    - Si la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, la instalación del demonio lo valida pero no persiste los valores de token de texto plano resueltos en los metadatos del entorno del servicio supervisor.
    - Si la autenticación por token requiere un token y el SecretRef de token configurado no está resuelto, la instalación del demonio se bloquea con orientación procesable.
    - Si están configurados tanto `gateway.auth.token` como `gateway.auth.password` y `gateway.auth.mode` no está configurado, la instalación del demonio se bloquea hasta que el modo se establezca explícitamente.
  </Step>
  <Step title="Comprobación de estado">
    - Inicia el Gateway (si es necesario) y ejecuta `openclaw health`.
    - Sugerencia: `openclaw status --deep` añade la sonda de estado del gateway en vivo a la salida de estado, incluyendo sondas de canal cuando sea compatible (requiere un gateway accesible).
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

<Note>Si no se detecta ninguna GUI, el onboarding imprime las instrucciones de reenvío de puerto SSH para la interfaz de usuario de control en lugar de abrir un navegador. Si faltan los recursos de la interfaz de usuario de control, el onboarding intenta compilarlos; la alternativa es `pnpm ui:build` (instala automáticamente las dependencias de la interfaz de usuario).</Note>

## Modo no interactivo

Use `--non-interactive` para automatizar o crear scripts de onboarding:

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

<Note>`--json` **no** implica el modo no interactivo. Use `--non-interactive` (y `--workspace`) para scripts.</Note>

Los ejemplos de comandos específicos del proveedor se encuentran en [CLI Automation](/en/start/wizard-cli-automation#provider-specific-examples).
Use esta página de referencia para conocer la semántica de las marcas y el orden de los pasos.

### Añadir agente (no interactivo)

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.4 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Asistente del Gateway RPC

El Gateway expone el flujo de incorporación a través de RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`).
Los clientes (aplicación macOS, Interfaz de usuario de control) pueden representar los pasos sin volver a implementar la lógica de incorporación.

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
- `tools.profile` (la incorporación local por defecto es `"coding"` cuando no está configurado; se conservan los valores explícitos existentes)
- `gateway.*` (modo, bind, auth, tailscale)
- `session.dmScope` (detalles del comportamiento: [CLI Setup Reference](/en/start/wizard-cli-reference#outputs-and-internals))
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- Listas de permitidos de canales (Slack/Discord/Matrix/Microsoft Teams) cuando opta por participar durante las indicaciones (los nombres se resuelven en ID cuando es posible).
- `skills.install.nodeManager`
  - `setup --node-manager` acepta `npm`, `pnpm` o `bun`.
  - La configuración manual todavía puede usar `yarn` estableciendo `skills.install.nodeManager` directamente.
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` escribe `agents.list[]` y `bindings` opcional.

Las credenciales de WhatsApp van bajo `~/.openclaw/credentials/whatsapp/<accountId>/`.
Las sesiones se almacenan bajo `~/.openclaw/agents/<agentId>/sessions/`.

Algunos canales se entregan como complementos. Cuando elige uno durante la configuración, la incorporación
le solicitará que lo instale (npm o una ruta local) antes de que pueda configurarse.

## Documentos relacionados

- Resumen de la incorporación: [Incorporación (CLI)](/en/start/wizard)
- Incorporación de la aplicación de macOS: [Incorporación](/en/start/onboarding)
- Referencia de configuración: [Configuración de la puerta de enlace](/en/gateway/configuration)
- Proveedores: [WhatsApp](/en/channels/whatsapp), [Telegram](/en/channels/telegram), [Discord](/en/channels/discord), [Google Chat](/en/channels/googlechat), [Signal](/en/channels/signal), [BlueBubbles](/en/channels/bluebubbles) (iMessage), [iMessage](/en/channels/imessage) (heredado)
- Habilidades: [Habilidades](/en/tools/skills), [Configuración de habilidades](/en/tools/skills-config)
