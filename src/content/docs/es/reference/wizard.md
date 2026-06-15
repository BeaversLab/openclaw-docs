---
summary: "Referencia completa para la integración de CLI: cada paso, indicador y campo de configuración"
read_when:
  - Looking up a specific onboarding step or flag
  - Automating onboarding with non-interactive mode
  - Debugging onboarding behavior
title: "Referencia de incorporación"
sidebarTitle: "Referencia de integración"
---

Esta es la referencia completa de `openclaw onboard`.
Para obtener una descripción general de alto nivel, consulte [Onboarding (CLI)](/es/start/wizard).

## Detalles del flujo (modo local)

<Steps>
  <Step title="Detección de configuración existente">
    - Si `~/.openclaw/openclaw.json` existe, elija **Mantener valores actuales**, **Revisar y actualizar** o **Restablecer antes de la configuración**.
    - Volver a ejecutar la incorporación **no** borra nada a menos que elija explícitamente **Restablecer**
      (o pase `--reset`).
    - La CLI `--reset` por defecto es `config+creds+sessions`; use `--reset-scope full`
      para también eliminar el espacio de trabajo.
    - Si la configuración no es válida o contiene claves heredadas, el asistente se detiene y le pide
      que ejecute `openclaw doctor` antes de continuar.
    - Restablecer usa `trash` (nunca `rm`) y ofrece alcances:
      - Solo configuración
      - Configuración + credenciales + sesiones
      - Restablecimiento completo (también elimina el espacio de trabajo)

  </Step>
  <Step title="Model/Auth">
    - **Clave de API de Anthropic**: usa `ANTHROPIC_API_KEY` si está presente o solicita una clave, luego la guarda para uso del daemon.
    - **Clave de API de Anthropic**: opción preferida de asistente Anthropic en onboarding/configure.
    - **Token de configuración de Anthropic**: aún disponible en onboarding/configure, aunque OpenClaw ahora prefiere el reuso de Claude CLI cuando está disponible.
    - **Suscripción a OpenAI Code (Codex) (OAuth)**: flujo del navegador; pegue el `code#state`.
      - Establece `agents.defaults.model` en `openai/gpt-5.5` a través del runtime de Codex cuando el modelo no está establecido o ya es de la familia OpenAI.
    - **Suscripción a OpenAI Code (Codex) (emparejamiento de dispositivo)**: flujo de emparejamiento del navegador con un código de dispositivo de corta duración.
      - Establece `agents.defaults.model` en `openai/gpt-5.5` a través del runtime de Codex cuando el modelo no está establecido o ya es de la familia OpenAI.
    - **Clave de API de OpenAI**: usa `OPENAI_API_KEY` si está presente o solicita una clave, luego la almacena en perfiles de autenticación.
      - Establece `agents.defaults.model` en `openai/gpt-5.5` cuando el modelo no está establecido, `openai/*`, o referencias de modelo Codex heredadas.
    - **xAI (Grok) OAuth / Clave de API**: inicia sesión con xAI OAuth cuando se elige, o solicita `XAI_API_KEY` en la ruta de clave de API, y configura xAI como proveedor de modelo.
    - **OpenCode**: solicita `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`, obténgalo en https://opencode.ai/auth) y le permite elegir el catálogo Zen o Go.
    - **Ollama**: ofrece **Cloud + Local**, **Solo Cloud** o **Solo Local** primero. `Cloud only` solicita `OLLAMA_API_KEY` y usa `https://ollama.com`; los modos respaldados por el host solicitan la URL base de Ollama, descubren los modelos disponibles y extraen automáticamente el modelo local seleccionado cuando es necesario; `Cloud + Local` también verifica si ese host de Ollama ha iniciado sesión para el acceso en la nube.
    - Más detalles: [Ollama](/es/providers/ollama)
    - **Clave de API**: almacena la clave por usted.
    - **Vercel AI Gateway (proxy multi-modelo)**: solicita `AI_GATEWAY_API_KEY`.
    - Más detalles: [Vercel AI Gateway](/es/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**: solicita Account ID, Gateway ID y `CLOUDFLARE_AI_GATEWAY_API_KEY`.
    - Más detalles: [Cloudflare AI Gateway](/es/providers/cloudflare-ai-gateway)
    - **MiniMax**: la configuración se escribe automáticamente; el predeterminado alojado es `MiniMax-M3`.
      La configuración con clave de API usa `minimax/...`, y la configuración OAuth usa
      `minimax-portal/...`.
    - Más detalles: [MiniMax](/es/providers/minimax)
    - **StepFun**: la configuración se escribe automáticamente para StepFun estándar o Step Plan en endpoints de China o globales.
    - El estándar actualmente incluye `step-3.5-flash`, y Step Plan también incluye `step-3.5-flash-2603`.
    - Más detalles: [StepFun](/es/providers/stepfun)
    - **Synthetic (compatible con Anthropic)**: solicita `SYNTHETIC_API_KEY`.
    - Más detalles: [Synthetic](/es/providers/synthetic)
    - **Moonshot (Kimi K2)**: la configuración se escribe automáticamente.
    - **Kimi Coding**: la configuración se escribe automáticamente.
    - Más detalles: [Moonshot AI (Kimi + Kimi Coding)](/es/providers/moonshot)
    - **Skip**: sin autenticación configurada aún.
    - Elija un modelo predeterminado de las opciones detectadas (o ingrese proveedor/modelo manualmente). Para la mejor calidad y un menor riesgo de inyección de prompts, elija el modelo de última generación más fuerte disponible en su pila de proveedores.
    - Onboarding ejecuta una verificación de modelo y advierte si el modelo configurado es desconocido o falta autenticación.
    - El modo de almacenamiento de clave de API usa valores de perfil de autenticación en texto plano por defecto. Use `--secret-input-mode ref` para almacenar referencias respaldadas por variables de entorno en su lugar (por ejemplo `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`).
    - Los perfiles de autenticación residen en `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (claves de API + OAuth). `~/.openclaw/credentials/oauth.json` es una importación heredada solamente.
    - Más detalles: [/concepts/oauth](/es/concepts/oauth)
    <Note>
    Consejo para headless/servidor: complete OAuth en una máquina con un navegador, luego copie
    el `auth-profiles.json` de ese agente (por ejemplo
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`, o la ruta `$OPENCLAW_STATE_DIR/...` coincidente)
    al host de la puerta de enlace. `credentials/oauth.json`
    es solo una fuente de importación heredada.
    </Note>
  </Step>
  <Step title="Workspace">
    - Predeterminado `~/.openclaw/workspace` (configurable).
    - Inicializa los archivos del espacio de trabajo necesarios para el ritual de arranque del agente.
    - Diseño completo del espacio de trabajo + guía de copia de seguridad: [Agent workspace](/es/concepts/agent-workspace)

  </Step>
  <Step title="Gateway">
    - Puerto, enlace, modo de autenticación, exposición a tailscale.
    - Recomendación de autenticación: mantenga **Token** incluso para el bucle local (loopback) para que los clientes WS locales deban autenticarse.
    - En modo token, la configuración interactiva ofrece:
      - **Generar/guardar token en texto sin formato** (predeterminado)
      - **Usar SecretRef** (opcional)
      - Quickstart reutiliza los SecretRefs existentes `gateway.auth.token` en los proveedores `env`, `file` y `exec` para el arranque del panel/probe de incorporación.
      - Si ese SecretRef está configurado pero no se puede resolver, la incorporación falla pronto con un mensaje claro de solución en lugar de degradar silenciosamente la autenticación en tiempo de ejecución.
    - En modo contraseña, la configuración interactiva también admite almacenamiento en texto sin formato o SecretRef.
    - Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
      - Requiere una variable de entorno no vacía en el entorno del proceso de incorporación.
      - No se puede combinar con `--gateway-token`.
    - Desactive la autenticación solo si confía completamente en cada proceso local.
    - Los enlaces no locales siguen requiriendo autenticación.

  </Step>
  <Step title="Channels">
    - [WhatsApp](/es/channels/whatsapp): inicio de sesión QR opcional.
    - [Telegram](/es/channels/telegram): token del bot.
    - [Discord](/es/channels/discord): token del bot.
    - [Google Chat](/es/channels/googlechat): JSON de cuenta de servicio + audiencia de webhook.
    - [Mattermost](/es/channels/mattermost) (plugin): token del bot + URL base.
    - [Signal](/es/channels/signal): instalación opcional de `signal-cli` + configuración de cuenta.
    - [iMessage](/es/channels/imessage): ruta de la CLI `imsg` + acceso a la BD de Messages; use un contenedor SSH cuando el Gateway se ejecute fuera de Mac.
    - Seguridad de MD: el valor predeterminado es emparejamiento. El primer DM envía un código; apruébelo a través de `openclaw pairing approve <channel> <code>` o use listas de permitidos.

  </Step>
  <Step title="Búsqueda web">
    - Elija un proveedor compatible como Brave, DuckDuckGo, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Ollama Web Search, Perplexity, SearXNG o Tavily (u omita este paso).
    - Los proveedores con API pueden usar variables de entorno o configuraciones existentes para una configuración rápida; los proveedores sin clave utilizan sus requisitos específicos del proveedor en su lugar.
    - Omitir con `--skip-search`.
    - Configurar más tarde: `openclaw configure --section web`.

  </Step>
  <Step title="Instalación del demonio">
    - macOS: LaunchAgent
      - Requiere una sesión de usuario iniciada; para sin interfaz gráfica, use un LaunchDaemon personalizado (no incluido).
    - Linux (y Windows a través de WSL2): unidad de usuario systemd
      - La incorporación intenta habilitar la persistencia mediante `loginctl enable-linger <user>` para que el Gateway se mantenga activo después de cerrar sesión.
      - Puede pedir sudo (escribe `/var/lib/systemd/linger`); primero intenta sin sudo.
    - **Selección de tiempo de ejecución:** Node (recomendado; requerido para WhatsApp/Telegram). Bun **no está recomendado**.
    - Si la autenticación por token requiere un token y `gateway.auth.token` está gestionado por SecretRef, la instalación del demonio lo valida pero no persiste los valores de token en texto plano resueltos en los metadatos del entorno del servicio de supervisor.
    - Si la autenticación por token requiere un token y el SecretRef de token configurado no está resuelto, la instalación del demonio se bloquea con una guía accionable.
    - Si tanto `gateway.auth.token` como `gateway.auth.password` están configurados y `gateway.auth.mode` no está establecido, la instalación del demonio se bloquea hasta que el modo se establece explícitamente.

  </Step>
  <Step title="Verificación de estado">
    - Inicia el Gateway (si es necesario) y ejecuta `openclaw health`.
    - Sugerencia: `openclaw status --deep` añade la sonda de estado del gateway en vivo a la salida de estado, incluidas las sondas de canal cuando son compatibles (requiere un gateway accesible).

  </Step>
  <Step title="Habilidades (recomendado)">
    - Lee las habilidades disponibles y comprueba los requisitos.
    - Le permite elegir un gestor de nodos: **npm / pnpm** (bun no recomendado).
    - Instala dependencias opcionales (algunas usan Homebrew en macOS).

  </Step>
  <Step title="Finalizar">
    - Resumen + siguientes pasos, incluyendo el indicador **¿Cómo quieres eclosionar tu agente?** para Terminal, Navegador o más adelante.

  </Step>
</Steps>

<Note>Si no se detecta una interfaz gráfica, la incorporación imprime instrucciones de reenvío de puerto SSH para la Interfaz de Control en lugar de abrir un navegador. Si faltan los activos de la Interfaz de Control, la incorporación intenta compilarlos; la alternativa es `pnpm ui:build` (instala automáticamente las dependencias de la interfaz).</Note>

## Modo no interactivo

Use `--non-interactive` para automatizar o crear scripts de incorporación:

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

Los ejemplos de comandos específicos del proveedor se encuentran en [CLI Automation](/es/start/wizard-cli-automation#provider-specific-examples).
Use esta página de referencia para la semántica de las opciones (flags) y el orden de los pasos.

### Agregar agente (no interactivo)

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.5 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Asistente RPC de Gateway

El Gateway expone el flujo de incorporación a través de RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`).
Los clientes (aplicación macOS, Interfaz de Control) pueden renderizar los pasos sin volver a implementar la lógica de incorporación.

## Configuración de Signal (signal-cli)

La incorporación puede instalar `signal-cli` desde los lanzamientos de GitHub:

- Descarga el activo de lanzamiento apropiado.
- Lo almacena en `~/.openclaw/tools/signal-cli/<version>/`.
- Escribe `channels.signal.cliPath` en su configuración.

Notas:

- Las compilaciones de JVM requieren **Java 21**.
- Las compilaciones nativas se utilizan cuando están disponibles.
- Windows usa WSL2; la instalación de signal-cli sigue el flujo de Linux dentro de WSL.

## Lo que escribe el asistente

Campos típicos en `~/.openclaw/openclaw.json`:

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` (si se elige Minimax)
- `tools.profile` (la incorporación local usa por defecto `"coding"` si no está establecido; se conservan los valores explícitos existentes)
- `gateway.*` (mode, bind, auth, tailscale)
- `session.dmScope` (detalles del comportamiento: [CLI Setup Reference](/es/start/wizard-cli-reference#outputs-and-internals))
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- Listas de permitidos de canales (Slack/Discord/Matrix/Microsoft Teams) cuando acepta durante las indicaciones (los nombres se resuelven en ID cuando es posible).
- `skills.install.nodeManager`
  - `setup --node-manager` acepta `npm`, `pnpm` o `bun`.
  - La configuración manual aún puede usar `yarn` estableciendo `skills.install.nodeManager` directamente.
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` escribe `agents.list[]` y `bindings` opcional.

Las credenciales de WhatsApp se guardan en `~/.openclaw/credentials/whatsapp/<accountId>/`.
Las sesiones se almacenan en `~/.openclaw/agents/<agentId>/sessions/`.

Algunos canales se entregan como complementos. Cuando elige uno durante la configuración, el proceso de incorporación
le pedirá que lo instale (npm o una ruta local) antes de que pueda configurarse.

## Documentos relacionados

- Resumen de incorporación: [Incorporación (CLI)](/es/start/wizard)
- Incorporación de la aplicación de macOS: [Incorporación](/es/start/onboarding)
- Referencia de configuración: [Configuración de la puerta de enlace](/es/gateway/configuration)
- Proveedores: [WhatsApp](/es/channels/whatsapp), [Telegram](/es/channels/telegram), [Discord](/es/channels/discord), [Google Chat](/es/channels/googlechat), [Signal](/es/channels/signal), [iMessage](/es/channels/imessage)
- Habilidades: [Habilidades](/es/tools/skills), [Configuración de habilidades](/es/tools/skills-config)
