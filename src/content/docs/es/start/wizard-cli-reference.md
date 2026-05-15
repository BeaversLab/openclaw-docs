---
summary: "Referencia completa del flujo de configuración de la CLI, configuración de autenticación/modelo, salidas e internos"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "Referencia de configuración de CLI"
sidebarTitle: "Referencia de CLI"
---

Esta página es la referencia completa de `openclaw onboard`.
Para la guía breve, consulta [Onboarding (CLI)](/es/start/wizard).

## Lo que hace el asistente

El modo local (predeterminado) le guía a través de:

- Configuración de modelo y autenticación (suscripción OpenAI Code OAuth, Anthropic Claude CLI o clave API, además de opciones de MiniMax, GLM, Ollama, Moonshot, StepFun y AI Gateway)
- Ubicación del espacio de trabajo y archivos de arranque
- Configuración de puerta de enlace (puerto, vinculación, autenticación, tailscale)
- Canales y proveedores (Telegram, WhatsApp, Discord, Google Chat, Mattermost, Signal, iMessage y otros complementos de canal incluidos)
- Instalación del demonio (LaunchAgent, unidad de usuario systemd o Tarea programada nativa de Windows con respaldo a la carpeta de Inicio)
- Verificación de estado
- Configuración de habilidades

El modo remoto configura esta máquina para conectarse a una puerta de enlace en otro lugar.
No instala ni modifica nada en el host remoto.

## Detalles del flujo local

<Steps>
  <Step title="Detección de configuración existente">
    - Si `~/.openclaw/openclaw.json` existe, elige Mantener, Modificar o Restablecer.
    - Volver a ejecutar el asistente no borra nada a menos que elijas explícitamente Restablecer (o pases `--reset`).
    - El `--reset` de la CLI por defecto es `config+creds+sessions`; usa `--reset-scope full` para también eliminar el espacio de trabajo.
    - Si la configuración no es válida o contiene claves heredadas, el asistente se detiene y te pide que ejecutes `openclaw doctor` antes de continuar.
    - Restablecer usa `trash` y ofrece alcances:
      - Solo configuración
      - Configuración + credenciales + sesiones
      - Restablecimiento completo (también elimina el espacio de trabajo)

  </Step>
  <Step title="Modelo y autenticación">
    - La matriz completa de opciones está en [Auth and model options](#auth-and-model-options).

  </Step>
  <Step title="Espacio de trabajo">
    - Por defecto `~/.openclaw/workspace` (configurable).
    - Siembra los archivos del espacio de trabajo necesarios para el ritual de arranque de la primera ejecución.
    - Diseño del espacio de trabajo: [Agent workspace](/es/concepts/agent-workspace).

  </Step>
  <Step title="Gateway">
    - Solicita puerto, enlace, modo de autenticación y exposición a tailscale.
    - Recomendado: mantén la autenticación por token activada incluso para el bucle local (loopback) para que los clientes WS locales deban autenticarse.
    - En modo token, la configuración interactiva ofrece:
      - **Generar/guardar token en texto plano** (predeterminado)
      - **Usar SecretRef** (opcional)
    - En modo contraseña, la configuración interactiva también admite almacenamiento en texto plano o SecretRef.
    - Ruta de SecretRef de token no interactiva: `--gateway-token-ref-env <ENV_VAR>`.
      - Requiere una variable de entorno no vacía en el entorno del proceso de incorporación (onboarding).
      - No se puede combinar con `--gateway-token`.
    - Desactiva la autenticación solo si confías plenamente en todos los procesos locales.
    - Los enlaces que no son de bucle local (non-loopback) aún requieren autenticación.

  </Step>
  <Step title="Canales">
    - [WhatsApp](/es/channels/whatsapp): inicio de sesión QR opcional
    - [Telegram](/es/channels/telegram): token del bot
    - [Discord](/es/channels/discord): token del bot
    - [Google Chat](/es/channels/googlechat): JSON de cuenta de servicio + audiencia de webhook
    - [Mattermost](/es/channels/mattermost): token del bot + URL base
    - [Signal](/es/channels/signal): `signal-cli` opcional instalación + configuración de cuenta
    - [iMessage](/es/channels/imessage): ruta CLI `imsg` + acceso a Messages DB; use un contenedor SSH cuando el Gateway se ejecuta fuera de Mac
    - Seguridad MD: el valor predeterminado es emparejamiento. El primer MD envía un código; apruebe a través de
      `openclaw pairing approve <channel> <code>` o use listas de permitidos.
  </Step>
  <Step title="Instalación del demonio">
    - macOS: LaunchAgent
      - Requiere sesión de usuario iniciada; para sin cabeza, use un LaunchDaemon personalizado (no incluido).
    - Linux y Windows a través de WSL2: unidad de usuario systemd
      - El asistente intenta `loginctl enable-linger <user>` para que el gateway permanezca activo después de cerrar sesión.
      - Puede solicitar sudo (escribe `/var/lib/systemd/linger`); primero intenta sin sudo.
    - Windows nativo: Tarea programada primero
      - Si se deniega la creación de la tarea, OpenClaw recurre a un elemento de inicio de sesión en la carpeta de Inicio por usuario e inicia el gateway inmediatamente.
      - Las Tareas programadas siguen siendo preferidas porque proporcionan un mejor estado de supervisor.
    - Selección de tiempo de ejecución: Node (recomendado; requerido para WhatsApp y Telegram). No se recomienda Bun.

  </Step>
  <Step title="Verificación de estado">
    - Inicia el gateway (si es necesario) y ejecuta `openclaw health`.
    - `openclaw status --deep` añade la sonda de estado del gateway en vivo a la salida de estado, incluyendo sondas de canal cuando es compatible.

  </Step>
  <Step title="Habilidades">
    - Lee las habilidades disponibles y verifica los requisitos.
    - Le permite elegir el gestor de nodos: npm, pnpm o bun.
    - Instala dependencias opcionales (algunas usan Homebrew en macOS).

  </Step>
  <Step title="Finalizar">
    - Resumen y próximos pasos, incluidas las opciones de aplicaciones para iOS, Android y macOS.

  </Step>
</Steps>

<Note>Si no se detecta ninguna GUI, el asistente imprime instrucciones de reenvío de puerto SSH para la Interfaz de Control en lugar de abrir un navegador. Si faltan los activos de la Interfaz de Control, el asistente intenta compilarlos; la alternativa es `pnpm ui:build` (instala automáticamente las dependencias de la interfaz).</Note>

## Detalles del modo remoto

El modo remoto configura esta máquina para conectarse a una puerta de enlace en otro lugar.

<Info>El modo remoto no instala ni modifica nada en el host remoto.</Info>

Lo que configura:

- URL de la puerta de enlace remota (`ws://...`)
- Token si se requiere autenticación en la puerta de enlace remota (recomendado)

<Note>
- Si la puerta de enlace es solo de bucle local, use túnel SSH o una tailnet.
- Sugerencias de descubrimiento:
  - macOS: Bonjour (`dns-sd`)
  - Linux: Avahi (`avahi-browse`)

</Note>

## Opciones de autenticación y modelo

<AccordionGroup>
  <Accordion title="Clave de API de Anthropic">
    Usa `ANTHROPIC_API_KEY` si está presente o solicita una clave, luego la guarda para su uso por el daemon.
  </Accordion>
  <Accordion title="Suscripción a OpenAI Code (OAuth)">
    Flujo del navegador; pegue `code#state`.

    Establece `agents.defaults.model` en `openai/gpt-5.5` a través del tiempo de ejecución de Codex cuando el modelo no está configurado o ya es de la familia OpenAI.

  </Accordion>
  <Accordion title="Suscripción a OpenAI Code (emparejamiento de dispositivos)">
    Flujo de emparejamiento en el navegador con un código de dispositivo de corta duración.

    Establece `agents.defaults.model` en `openai/gpt-5.5` a través del tiempo de ejecución de Codex cuando el modelo no está configurado o ya es de la familia OpenAI.

  </Accordion>
  <Accordion title="Clave de API de OpenAI">
    Usa `OPENAI_API_KEY` si está presente o solicita una clave, luego almacena la credencial en perfiles de autenticación.

    Establece `agents.defaults.model` en `openai/gpt-5.5` cuando el modelo no está configurado, es `openai/*` o `openai-codex/*`.

  </Accordion>
  <Accordion title="Clave de API de xAI (Grok)">
    Solicita `XAI_API_KEY` y configura xAI como proveedor de modelo.
  </Accordion>
  <Accordion title="OpenCode">
    Solicita `OPENCODE_API_KEY` (o `OPENCODE_ZEN_API_KEY`) y le permite elegir el catálogo Zen o Go.
    URL de configuración: [opencode.ai/auth](https://opencode.ai/auth).
  </Accordion>
  <Accordion title="Clave de API (genérica)">
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
  <Accordion title="MiniMax">
    La configuración se escribe automáticamente. El valor predeterminado alojado es `MiniMax-M2.7`; la configuración de clave de API usa
    `minimax/...`, y la configuración de OAuth usa `minimax-portal/...`.
    Más detalles: [MiniMax](/es/providers/minimax).
  </Accordion>
  <Accordion title="StepFun">
    La configuración se escribe automáticamente para StepFun estándar o Step Plan en endpoints de China o globales.
    El estándar actualmente incluye `step-3.5-flash`, y Step Plan también incluye `step-3.5-flash-2603`.
    Más detalles: [StepFun](/es/providers/stepfun).
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    Solicita `SYNTHETIC_API_KEY`.
    Más detalles: [Synthetic](/es/providers/synthetic).
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    Solicita `Cloud + Local`, `Cloud only` o `Local only` primero.
    `Cloud only` usa `OLLAMA_API_KEY` con `https://ollama.com`.
    Los modos respaldados por el host solicitan la URL base (por defecto `http://127.0.0.1:11434`), descubren los modelos disponibles y sugieren valores predeterminados.
    `Cloud + Local` también verifica si ese host de Ollama ha iniciado sesión para el acceso en la nube.
    Más detalles: [Ollama](/es/providers/ollama).
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Las configuraciones de Moonshot (Kimi K2) y Kimi Coding se escriben automáticamente.
    Más detalles: [Moonshot AI (Kimi + Kimi Coding)](/es/providers/moonshot).
  </Accordion>
  <Accordion title="Proveedor personalizado">
    Funciona con endpoints compatibles con OpenAI y Anthropic.

    La integración interactiva admite las mismas opciones de almacenamiento de claves de API que otros flujos de claves de API de proveedores:
    - **Pegar clave de API ahora** (texto sin formato)
    - **Usar referencia secreta** (referencia de entorno o referencia de proveedor configurado, con validación previa)

    Opciones no interactivas:
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key` (opcional; se usa `CUSTOM_API_KEY` de forma predeterminada)
    - `--custom-provider-id` (opcional)
    - `--custom-compatibility <openai|anthropic>` (opcional; valor predeterminado `openai`)
    - `--custom-image-input` / `--custom-text-input` (opcional; invalida la capacidad de entrada del modelo inferida)

  </Accordion>
  <Accordion title="Omitir">
    Deja la autenticación sin configurar.
  </Accordion>
</AccordionGroup>

Comportamiento del modelo:

- Elija el modelo predeterminado de las opciones detectadas o ingrese el proveedor y el modelo manualmente.
- La integración del proveedor personalizado infiere la compatibilidad con imágenes para IDs de modelos comunes y solo pregunta cuando el nombre del modelo es desconocido.
- Cuando la incorporación comienza desde una elección de autenticación de proveedor, el selector de modelos prefiere
  automáticamente ese proveedor. Para Volcengine y BytePlus, la misma preferencia
  también coincide con sus variantes de plan de codificación (`volcengine-plan/*`,
  `byteplus-plan/*`).
- Si el filtro de ese proveedor preferido estuviera vacío, el selector vuelve al
  catálogo completo en lugar de no mostrar modelos.
- El asistente ejecuta una verificación del modelo y advierte si el modelo configurado es desconocido o le falta autenticación.

Rutas de credenciales y perfiles:

- Perfiles de autenticación (claves API + OAuth): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Importación de OAuth heredada: `~/.openclaw/credentials/oauth.json`

Modo de almacenamiento de credenciales:

- El comportamiento predeterminado de la integración persiste las claves de API como valores de texto sin formato en los perfiles de autenticación.
- `--secret-input-mode ref` habilita el modo de referencia en lugar del almacenamiento de clave en texto plano.
  En la configuración interactiva, puede elegir cualquiera de los siguientes:
  - referencia de variable de entorno (por ejemplo, `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`)
  - referencia de proveedor configurado (`file` o `exec`) con alias de proveedor + id
- El modo de referencia interactivo ejecuta una validación previa rápida antes de guardar.
  - Referencias de entorno: valida el nombre de la variable + un valor no vacío en el entorno de integración actual.
  - Referencias de proveedor: valida la configuración del proveedor y resuelve la id solicitada.
  - Si la verificación previa falla, el proceso de incorporación muestra el error y le permite reintentar.
- En modo no interactivo, `--secret-input-mode ref` está respaldado únicamente por el entorno.
  - Establezca la variable de entorno del proveedor en el entorno del proceso de incorporación.
  - Las marcas de clave en línea (por ejemplo, `--openai-api-key`) requieren que se establezca esa variable de entorno; de lo contrario, la incorporación falla rápidamente.
  - Para proveedores personalizados, el modo no interactivo `ref` almacena `models.providers.<id>.apiKey` como `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`.
  - En ese caso de proveedor personalizado, `--custom-api-key` requiere que se establezca `CUSTOM_API_KEY`; de lo contrario, la incorporación falla rápidamente.
- Las credenciales de autenticación de Gateway admiten opciones de texto sin formato y SecretRef en la configuración interactiva:
  - Modo token: **Generar/almacenar token en texto sin formato** (predeterminado) o **Usar SecretRef**.
  - Modo contraseña: texto sin formato o SecretRef.
- Ruta de SecretRef de token no interactivo: `--gateway-token-ref-env <ENV_VAR>`.
- Las configuraciones existentes de texto sin formato siguen funcionando sin cambios.

<Note>
Consejo para headless y servidor: complete OAuth en una máquina con un navegador, luego copie
el `auth-profiles.json` de ese agente (por ejemplo,
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`, o la ruta `$OPENCLAW_STATE_DIR/...` coincidente)
al host de la pasarela. `credentials/oauth.json`
es solo una fuente de importación heredada.
</Note>

## Salidas e aspectos internos

Campos típicos en `~/.openclaw/openclaw.json`:

- `agents.defaults.workspace`
- `agents.defaults.skipBootstrap` cuando se pasa `--skip-bootstrap`
- `agents.defaults.model` / `models.providers` (si se elige Minimax)
- `tools.profile` (la integración local usa `"coding"` de forma predeterminada si no está establecido; los valores explícitos existentes se conservan)
- `gateway.*` (modo, bind, auth, tailscale)
- `session.dmScope` (la integración local establece esto en `per-channel-peer` de forma predeterminada si no está establecido; los valores explícitos existentes se conservan)
- `channels.telegram.botToken`, `channels.discord.token`, `channels.matrix.*`, `channels.signal.*`, `channels.imessage.*`
- Listas de permitidos de canales (Slack, Discord, Matrix, Microsoft Teams) cuando aceptas participar durante las solicitudes (los nombres se resuelven en IDs cuando es posible)
- `skills.install.nodeManager`
  - La opción `setup --node-manager` acepta `npm`, `pnpm` o `bun`.
  - La configuración manual todavía puede establecer `skills.install.nodeManager: "yarn"` más tarde.
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` escribe `agents.list[]` y `bindings` opcional.

Las credenciales de WhatsApp van en `~/.openclaw/credentials/whatsapp/<accountId>/`.
Las sesiones se almacenan en `~/.openclaw/agents/<agentId>/sessions/`.

<Note>Algunos canales se entregan como complementos. Cuando se seleccionan durante la configuración, el asistente solicita instalar el complemento (npm o ruta local) antes de la configuración del canal.</Note>

Asistente del wizard de puerta de enlace (RPC):

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

Los clientes (aplicación macOS e interfaz de usuario de Control) pueden renderizar los pasos sin volver a implementar la lógica de incorporación.

Comportamiento de la configuración de Signal:

- Descarga el activo de lanzamiento adecuado
- Lo almacena en `~/.openclaw/tools/signal-cli/<version>/`
- Escribe `channels.signal.cliPath` en la configuración
- Las compilaciones de JVM requieren Java 21
- Las compilaciones nativas se usan cuando están disponibles
- Windows usa WSL2 y sigue el flujo de signal-cli de Linux dentro de WSL

## Documentación relacionada

- Centro de incorporación: [Onboarding (CLI)](/es/start/wizard)
- Automatización y scripts: [CLI Automation](/es/start/wizard-cli-automation)
- Referencia de comandos: [`openclaw onboard`](/es/cli/onboard)
