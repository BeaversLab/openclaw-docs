---
summary: "Preguntas frecuentes sobre la configuración, instalación y uso de OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "Preguntas frecuentes"
---

# Preguntas frecuentes

Respuestas rápidas y solución de problemas más profunda para configuraciones del mundo real (desarrollo local, VPS, multiagente, claves OAuth/API, conmutación por error del modelo). Para el diagnóstico en tiempo de ejecución, consulte [Solución de problemas](/es/gateway/troubleshooting). Para la referencia completa de configuración, consulte [Configuración](/es/gateway/configuration).

## Tabla de contenidos

- [Inicio rápido y configuración de primera ejecución]
  - [Estoy atascado, ¿cuál es la forma más rápida de desatascarme?](#im-stuck-whats-the-fastest-way-to-get-unstuck)
  - [¿Cuál es la forma recomendada de instalar y configurar OpenClaw?](#whats-the-recommended-way-to-install-and-set-up-openclaw)
  - [¿Cómo abro el panel de control después de la incorporación?](#how-do-i-open-the-dashboard-after-onboarding)
  - [¿Cómo autentico el panel de control (token) en localhost frente a remoto?](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [¿Qué tiempo de ejecución necesito?](#what-runtime-do-i-need)
  - [¿Se ejecuta en Raspberry Pi?](#does-it-run-on-raspberry-pi)
  - [¿Algún consejo para instalaciones en Raspberry Pi?](#any-tips-for-raspberry-pi-installs)
  - [Está atascado en "despierta amigo mío" / la incorporación no se abrirá. ¿Qué hago ahora?](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [¿Puedo migrar mi configuración a una nueva máquina (Mac mini) sin repetir la incorporación?](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [¿Dónde puedo ver las novedades de la última versión?](#where-do-i-see-what-is-new-in-the-latest-version)
  - [No puedo acceder a docs.openclaw.ai (error SSL). ¿Qué hago ahora?](#i-cant-access-docsopenclawai-ssl-error-what-now)
  - [¿Cuál es la diferencia entre estable y beta?](#whats-the-difference-between-stable-and-beta)
  - [¿Cómo instalo la versión beta y cuál es la diferencia entre beta y dev?](#how-do-i-install-the-beta-version-and-whats-the-difference-between-beta-and-dev)
  - [¿Cómo pruebo las últimas novedades?](#how-do-i-try-the-latest-bits)
  - [¿Cuánto tiempo suelen tardar la instalación y la incorporación?](#how-long-does-install-and-onboarding-usually-take)
  - [¿Instalador atascado? ¿Cómo obtengo más información?](#installer-stuck-how-do-i-get-more-feedback)
  - [La instalación en Windows dice que no se encontró git o que no se reconoce openclaw](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [La salida exec de Windows muestra caracteres chinos ilegibles, ¿qué debo hacer](#windows-exec-output-shows-garbled-chinese-text-what-should-i-do)
  - [La documentación no respondió a mi pregunta: ¿cómo puedo obtener una mejor respuesta?](#the-docs-didnt-answer-my-question-how-do-i-get-a-better-answer)
  - [¿Cómo instalo OpenClaw en Linux?](#how-do-i-install-openclaw-on-linux)
  - [¿Cómo instalo OpenClaw en un VPS?](#how-do-i-install-openclaw-on-a-vps)
  - [¿Dónde están las guías de instalación en la nube/VPS?](#where-are-the-cloudvps-install-guides)
  - [¿Puedo pedirle a OpenClaw que se actualice a sí mismo?](#can-i-ask-openclaw-to-update-itself)
  - [¿Qué hace realmente el asistente de incorporación?](#what-does-the-onboarding-wizard-actually-do)
  - [¿Necesito una suscripción a Claude u OpenAI para ejecutar esto?](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [¿Puedo usar la suscripción Claude Max sin una clave API](#can-i-use-claude-max-subscription-without-an-api-key)
  - [¿Cómo funciona la autenticación de "setup-token" de Anthropic?](#how-does-anthropic-setuptoken-auth-work)
  - [¿Dónde encuentro un "setup-token" de Anthropic?](#where-do-i-find-an-anthropic-setuptoken)
  - [¿Admiten la autenticación por suscripción de Claude (Claude Pro o Max)?](#do-you-support-claude-subscription-auth-claude-pro-or-max)
  - [¿Por qué veo `HTTP 429: rate_limit_error` de Anthropic?](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [¿AWS Bedrock es compatible?](#is-aws-bedrock-supported)
  - [¿Cómo funciona la autenticación de Codex?](#how-does-codex-auth-work)
  - [¿Admiten la autenticación por suscripción de OpenAI (Codex OAuth)?](#do-you-support-openai-subscription-auth-codex-oauth)
  - [¿Cómo configuro OAuth de Gemini CLI](#how-do-i-set-up-gemini-cli-oauth)
  - [¿Está bien un modelo local para chats informales?](#is-a-local-model-ok-for-casual-chats)
  - [¿Cómo mantengo el tráfico del modelo alojado en una región específica?](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [¿Tengo que comprar una Mac Mini para instalar esto?](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [¿Necesito una Mac mini para la compatibilidad con iMessage?](#do-i-need-a-mac-mini-for-imessage-support)
  - [Si compro una Mac mini para ejecutar OpenClaw, ¿puedo conectarla a mi MacBook Pro?](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [¿Puedo usar Bun?](#can-i-use-bun)
  - [Telegram: ¿qué va en `allowFrom`?](#telegram-what-goes-in-allowfrom)
  - [¿Pueden varias personas usar un número de WhatsApp con diferentes instancias de OpenClaw?](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [¿Puedo ejecutar un agente de "chat rápido" y un agente de "Opus para codificación"?](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [¿Homebrew funciona en Linux?](#does-homebrew-work-on-linux)
  - [¿Cuál es la diferencia entre la instalación hackable (git) y la instalación con npm?](#whats-the-difference-between-the-hackable-git-install-and-npm-install)
  - [¿Puedo cambiar entre las instalaciones npm y git más adelante?](#can-i-switch-between-npm-and-git-installs-later)
  - [¿Debo ejecutar el Gateway en mi portátil o en un VPS?](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [Qué tan importante es ejecutar OpenClaw en una máquina dedicada?](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [¿Cuáles son los requisitos mínimos del VPS y el sistema operativo recomendado?](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [¿Puedo ejecutar OpenClaw en una VM y cuáles son los requisitos](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [¿Qué es OpenClaw?](#what-is-openclaw)
  - [¿Qué es OpenClaw, en un párrafo?](#what-is-openclaw-in-one-paragraph)
  - [¿Cuál es la propuesta de valor?](#whats-the-value-proposition)
  - [Acabo de configurarlo, ¿qué debo hacer primero](#i-just-set-it-up-what-should-i-do-first)
  - [¿Cuáles son los cinco principales casos de uso cotidianos para OpenClaw](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [¿Puede OpenClaw ayudar con la generación de leads, alcance, anuncios y blogs para un SaaS](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [¿Cuáles son las ventajas frente a Claude Code para el desarrollo web?](#what-are-the-advantages-vs-claude-code-for-web-development)
- [Habilidades y automatización](#skills-and-automation)
  - [¿Cómo personalizo las habilidades sin mantener el repositorio sucio?](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [¿Puedo cargar habilidades desde una carpeta personalizada?](#can-i-load-skills-from-a-custom-folder)
  - [¿Cómo puedo usar diferentes modelos para diferentes tareas?](#how-can-i-use-different-models-for-different-tasks)
  - [El bot se congela mientras realiza trabajo pesado. ¿Cómo puedo descargar eso?](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Los recordatorios o programas de Cron no se ejecutan. ¿Qué debo verificar?](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [¿Cómo instalo habilidades en Linux?](#how-do-i-install-skills-on-linux)
  - [¿Puede OpenClaw ejecutar tareas programadas o continuamente en segundo plano?](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [¿Puedo ejecutar habilidades exclusivas de Apple macOS desde Linux?](#can-i-run-apple-macos-only-skills-from-linux)
  - [¿Tienen una integración con Notion o HeyGen?](#do-you-have-a-notion-or-heygen-integration)
  - [¿Cómo instalo la extensión de Chrome para la toma de control del navegador?](#how-do-i-install-the-chrome-extension-for-browser-takeover)
- [Sandboxing y memoria](#sandboxing-and-memory)
  - [¿Existe un documento dedicado al sandboxing?](#is-there-a-dedicated-sandboxing-doc)
  - [¿Cómo enlazo una carpeta del host en el entorno aislado (sandbox)?](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [¿Cómo funciona la memoria?](#how-does-memory-work)
  - [La memoria sigue olvidando cosas. ¿Cómo hago que persistan?](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [¿La memoria persiste para siempre? ¿Cuáles son los límites?](#does-memory-persist-forever-what-are-the-limits)
  - [¿La búsqueda semántica en la memoria requiere una clave de API de OpenAI?](#does-semantic-memory-search-require-an-openai-api-key)
- [Dónde residen las cosas en el disco](#where-things-live-on-disk)
  - [¿Todos los datos usados con OpenClaw se guardan localmente?](#is-all-data-used-with-openclaw-saved-locally)
  - [¿Dónde almacena OpenClaw sus datos?](#where-does-openclaw-store-its-data)
  - [¿Dónde deben estar AGENTS.md / SOUL.md / USER.md / MEMORY.md?](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [¿Cuál es la estrategia de copia de seguridad recomendada?](#whats-the-recommended-backup-strategy)
  - [¿Cómo desinstalo completamente OpenClaw?](#how-do-i-completely-uninstall-openclaw)
  - [¿Pueden los agentes trabajar fuera del espacio de trabajo?](#can-agents-work-outside-the-workspace)
  - [Estoy en modo remoto: ¿dónde está el almacenamiento de sesiones?](#im-in-remote-mode-where-is-the-session-store)
- [Conceptos básicos de configuración](#config-basics)
  - [¿Qué formato tiene la configuración? ¿Dónde está?](#what-format-is-the-config-where-is-it)
  - [Establecí `gateway.bind: "lan"` (o `"tailnet"`) y ahora nada escucha / la interfaz dice no autorizado](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [¿Por qué ahora necesito un token en localhost?](#why-do-i-need-a-token-on-localhost-now)
  - [¿Tengo que reiniciar después de cambiar la configuración?](#do-i-have-to-restart-after-changing-config)
  - [¿Cómo desactivo los lemas divertidos de la CLI?](#how-do-i-disable-funny-cli-taglines)
  - [¿Cómo habilito la búsqueda web (y la recuperación web)?](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply borró mi configuración. ¿Cómo la recupero y evito esto?](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [¿Cómo ejecuto una Puerta de enlace (Gateway) central con trabajadores especializados en varios dispositivos?](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [¿Puede ejecutarse el navegador de OpenClaw sin cabeza (headless)?](#can-the-openclaw-browser-run-headless)
  - [¿Cómo uso Brave para el control del navegador?](#how-do-i-use-brave-for-browser-control)
- [Puertas de enlace (gateways) y nodos remotos](#remote-gateways-and-nodes)
  - [¿Cómo se propagan los comandos entre Telegram, la puerta de enlace y los nodos?](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [¿Cómo puede mi agente acceder a mi ordenador si el Gateway se aloja de forma remota?](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale está conectado pero no recibo respuestas. ¿Qué hago ahora?](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [¿Pueden comunicarse entre sí dos instancias de OpenClaw (local + VPS)?](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [¿Necesito VPS separados para varios agentes](#do-i-need-separate-vpses-for-multiple-agents)
  - [¿Hay algún beneficio en usar un nodo en mi portátil personal en lugar de SSH desde un VPS?](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [¿Los nodos ejecutan un servicio de puerta de enlace (gateway)?](#do-nodes-run-a-gateway-service)
  - [¿Hay alguna forma de API / RPC para aplicar la configuración?](#is-there-an-api-rpc-way-to-apply-config)
  - [¿Cuál es una configuración mínima "sana" para una primera instalación?](#whats-a-minimal-sane-config-for-a-first-install)
  - [¿Cómo configuro Tailscale en un VPS y me conecto desde mi Mac?](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [¿Cómo conecto un nodo Mac a un Gateway remoto (Tailscale Serve)?](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [¿Debo instalar en un segundo portátil o simplemente agregar un nodo?](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [Variables de entorno y carga de .env](#env-vars-and-env-loading)
  - [¿Cómo carga OpenClaw las variables de entorno?](#how-does-openclaw-load-environment-variables)
  - ["Inicié el Gateway a través del servicio y mis variables de entorno desaparecieron." ¿Qué hago ahora?](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [Establecí `COPILOT_GITHUB_TOKEN`, pero el estado de los modelos muestra "Shell env: off." ¿Por qué?](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [Sesiones y múltiples chats](#sessions-and-multiple-chats)
  - [¿Cómo inicio una conversación nueva?](#how-do-i-start-a-fresh-conversation)
  - [¿Se restablecen las sesiones automáticamente si nunca envío `/new`?](#do-sessions-reset-automatically-if-i-never-send-new)
  - [¿Hay alguna forma de que un equipo de instancias de OpenClaw sea un CEO y muchos agentes](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [¿Por qué se truncó el contexto a mitad de tarea? ¿Cómo lo evito?](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [¿Cómo restablezco completamente OpenClaw pero lo mantengo instalado?](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [Estoy recibiendo errores de "contexto demasiado grande" - ¿cómo restablezco o compacto?](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [¿Por qué veo "LLM request rejected: messages.content.tool_use.input field required"?](#why-am-i-seeing-llm-request-rejected-messagescontenttool_useinput-field-required)
  - [¿Por qué recibo mensajes de latido cada 30 minutos?](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [¿Necesito agregar una "cuenta de bot" a un grupo de WhatsApp?](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [¿Cómo obtengo el JID de un grupo de WhatsApp?](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [¿Por qué OpenClaw no responde en un grupo?](#why-doesnt-openclaw-reply-in-a-group)
  - [¿Los grupos/hilos comparten contexto con los MD?](#do-groupsthreads-share-context-with-dms)
  - [¿Cuántos espacios de trabajo y agentes puedo crear?](#how-many-workspaces-and-agents-can-i-create)
  - [¿Puedo ejecutar varios bots o chats al mismo tiempo (Slack) y cómo debo configurarlo?](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [Modelos: predeterminados, selección, alias, cambio](#models-defaults-selection-aliases-switching)
  - [¿Cuál es el "modelo predeterminado"?](#what-is-the-default-model)
  - [¿Qué modelo recomiendas?](#what-model-do-you-recommend)
  - [¿Cómo cambio de modelo sin borrar mi configuración?](#how-do-i-switch-models-without-wiping-my-config)
  - [¿Puedo usar modelos autohospedados (llama.cpp, vLLM, Ollama)?](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [¿Qué usan OpenClaw, Flawd y Krill para los modelos?](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [¿Cómo cambio de modelo sobre la marcha (sin reiniciar)?](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [¿Puedo usar GPT 5.2 para tareas diarias y Codex 5.3 para programación](#can-i-use-gpt-52-for-daily-tasks-and-codex-53-for-coding)
  - [¿Por qué veo "El modelo … no está permitido" y luego ninguna respuesta?](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [¿Por qué veo "Modelo desconocido: minimax/MiniMax-M2.5"?](#why-do-i-see-unknown-model-minimaxminimaxm25)
  - [¿Puedo usar MiniMax como predeterminado y OpenAI para tareas complejas?](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [¿Son opus / sonnet / gpt atajos integrados?](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [¿Cómo defino/anulo los atajos de modelo (alias)?](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [¿Cómo agrego modelos de otros proveedores como OpenRouter o Z.AI?](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [Conmutación por error de modelo y "Todos los modelos fallaron"](#model-failover-and-all-models-failed)
  - [¿Cómo funciona la conmutación por error?](#how-does-failover-work)
  - [¿Qué significa este error?](#what-does-this-error-mean)
  - [Lista de verificación de solución para `No credentials found for profile "anthropic:default"`](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [¿Por qué también intentó con Google Gemini y falló?](#why-did-it-also-try-google-gemini-and-fail)
- [Perfiles de autenticación: qué son y cómo gestionarlos](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [¿Qué es un perfil de autenticación?](#what-is-an-auth-profile)
  - [¿Cuáles son los IDs de perfil típicos?](#what-are-typical-profile-ids)
  - [¿Puedo controlar qué perfil de autenticación se intenta primero?](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth vs. clave de API: ¿cuál es la diferencia?](#oauth-vs-api-key-whats-the-difference)
- [Gateway: puertos, "ya está en ejecución" y modo remoto](#gateway-ports-already-running-and-remote-mode)
  - [¿Qué puerto usa el Gateway?](#what-port-does-the-gateway-use)
  - [¿Por qué `openclaw gateway status` dice `Runtime: running` pero `RPC probe: failed`?](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [¿Por qué `openclaw gateway status` muestra `Config (cli)` y `Config (service)` diferentes?](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - [¿Qué significa "another gateway instance is already listening"?](#what-does-another-gateway-instance-is-already-listening-mean)
  - [¿Cómo ejecuto OpenClaw en modo remoto (el cliente se conecta a un Gateway en otro lugar)?](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [La interfaz de control dice "unauthorized" (o se mantiene reconectando). ¿Qué hago?](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [Configuré `gateway.bind: "tailnet"` pero no puede vincularse / nada escucha](#i-set-gatewaybind-tailnet-but-it-cant-bind-nothing-listens)
  - [¿Puedo ejecutar múltiples Gateways en el mismo host?](#can-i-run-multiple-gateways-on-the-same-host)
  - [¿Qué significa "invalid handshake" / código 1008?](#what-does-invalid-handshake-code-1008-mean)
- [Registro y depuración](#logging-and-debugging)
  - [¿Dónde están los registros?](#where-are-logs)
  - [¿Cómo inicio/detengo/reinicio el servicio Gateway?](#how-do-i-startstoprestart-the-gateway-service)
  - [Cerré mi terminal en Windows: ¿cómo reinicio OpenClaw?](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [El Gateway está activo pero las respuestas nunca llegan. ¿Qué debería verificar?](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - ["Disconnected from gateway: no reason": ¿qué hago?](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram setMyCommands falla. ¿Qué debería verificar?](#telegram-setmycommands-fails-what-should-i-check)
  - [La TUI no muestra salida. ¿Qué debería verificar?](#tui-shows-no-output-what-should-i-check)
  - [¿Cómo detengo por completo y luego inicio el Gateway?](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5: `openclaw gateway restart` vs `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [¿Cuál es la forma más rápida de obtener más detalles cuando algo falla?](#whats-the-fastest-way-to-get-more-details-when-something-fails)
- [Medios y archivos adjuntos](#media-and-attachments)
  - [Mi habilidad generó una imagen/PDF, pero no se envió nada](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [Seguridad y control de acceso](#security-and-access-control)
  - [¿Es seguro exponer OpenClaw a MD entrantes?](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [¿Es la inyección de prompts solo una preocupación para los bots públicos?](#is-prompt-injection-only-a-concern-for-public-bots)
  - [¿Mi bot debe tener su propia cuenta de GitHub, correo electrónico o número de teléfono?](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [¿Puedo darle autonomía sobre mis mensajes de texto y eso es seguro?](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [¿Puedo usar modelos más económicos para las tareas de asistente personal?](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [Ejecuté `/start` en Telegram pero no obtuve un código de emparejamiento](#i-ran-start-in-telegram-but-didnt-get-a-pairing-code)
  - [WhatsApp: ¿enviará mensajes a mis contactos? ¿Cómo funciona el emparejamiento?](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [Comandos de chat, cancelación de tareas y "no se detiene"](#chat-commands-aborting-tasks-and-it-wont-stop)
  - [¿Cómo evito que los mensajes internos del sistema aparezcan en el chat?](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [¿Cómo detengo/cancelo una tarea en ejecución?](#how-do-i-stopcancel-a-running-task)
  - [¿Cómo envío un mensaje de Discord desde Telegram? ("Envío de mensajes entre contextos denegado")](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [¿Por qué da la impresión de que el bot "ignora" los mensajes rápidos?](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## Primeros 60 segundos si algo está roto

1. **Estado rápido (primera comprobación)**

   ```bash
   openclaw status
   ```

   Resumen local rápido: sistema operativo + actualización, accesibilidad de puerta de enlace/servicio, agentes/sesiones, configuración del proveedor + problemas de tiempo de ejecución (cuando la puerta de enlace es accesible).

2. **Informe pegable (seguro para compartir)**

   ```bash
   openclaw status --all
   ```

   Diagnóstico de solo lectura con cola de registros (tokens redactados).

3. **Demonio + estado de puerto**

   ```bash
   openclaw gateway status
   ```

   Muestra el tiempo de ejecución del supervisor frente a la accesibilidad de RPC, la URL de destino de la sonda y qué configuración usó probablemente el servicio.

4. **Sondas profundas**

   ```bash
   openclaw status --deep
   ```

   Ejecuta comprobaciones de salud de la puerta de enlace + sondas de proveedores (requiere una puerta de enlace accesible). Consulte [Salud](/es/gateway/health).

5. **Ver el último registro**

   ```bash
   openclaw logs --follow
   ```

   Si RPC está caído, recurra a:

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Los registros de archivos son independientes de los registros del servicio; consulte [Registro de eventos](/es/logging) y [Solución de problemas](/es/gateway/troubleshooting).

6. **Ejecutar el doctor (reparaciones)**

   ```bash
   openclaw doctor
   ```

   Repara/migra la configuración/estado + ejecuta comprobaciones de salud. Consulte [Doctor](/es/gateway/doctor).

7. **Instantánea de la puerta de enlace**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Solicita a la puerta de enlace en ejecución una instantánea completa (solo WS). Consulte [Salud](/es/gateway/health).

## Inicio rápido y configuración de primera ejecución

### Estoy atascado, ¿cuál es la forma más rápida de desatascarme

Utilice un agente de IA local que pueda **ver su máquina**. Esto es mucho más efectivo que preguntar
en Discord, porque la mayoría de los casos de "estoy atascado" son **problemas de configuración local o del entorno** que
los ayudantes remotos no pueden inspeccionar.

- **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
- **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

Estas herramientas pueden leer el repositorio, ejecutar comandos, inspeccionar registros y ayudar a corregir su configuración a nivel de máquina
(PATH, servicios, permisos, archivos de autenticación). Proporciónelas la **copia completa del código fuente** a través de
la instalación hackable (git):

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Esto instala OpenClaw **desde una copia de git**, por lo que el agente puede leer el código + los documentos y
razonar sobre la versión exacta que está ejecutando. Siempre puede volver a cambiar a estable más adelante
volviendo a ejecutar el instalador sin `--install-method git`.

Consejo: pida al agente que **planifique y supervise** la solución (paso a paso) y luego ejecute solo los
comandos necesarios. Esto mantiene los cambios pequeños y facilita su auditoría.

Si descubre un error real o una solución, envíe un problema de GitHub o un PR:
[https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
[https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

Comience con estos comandos (comparta los resultados cuando pida ayuda):

```bash
openclaw status
openclaw models status
openclaw doctor
```

Lo que hacen:

- `openclaw status`: instantánea rápida de la salud de la puerta de enlace/agente + configuración básica.
- `openclaw models status`: verifica la autenticación del proveedor + disponibilidad del modelo.
- `openclaw doctor`: valida y repara problemas comunes de configuración/estado.

Otras comprobaciones útiles de la CLI: `openclaw status --all`, `openclaw logs --follow`,
`openclaw gateway status`, `openclaw health --verbose`.

Bucle de depuración rápido: [Primeros 60 segundos si algo está roto](#first-60-seconds-if-somethings-broken).
Documentos de instalación: [Instalación](/es/install), [Opciones del instalador](/es/install/installer), [Actualización](/es/install/updating).

### Cuál es la forma recomendada de instalar y configurar OpenClaw

El repositorio recomienda ejecutar desde el código fuente y usar el asistente de incorporación:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

El asistente también puede compilar los activos de la interfaz de usuario automáticamente. Después de la incorporación, normalmente ejecutas el Gateway en el puerto **18789**.

Desde el código fuente (colaboradores/desarrolladores):

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw onboard
```

Si aún no tienes una instalación global, ejecútalo mediante `pnpm openclaw onboard`.

### Cómo abro el panel de control después de la incorporación

El asistente abre tu navegador con una URL del panel de control limpia (sin token) justo después de la incorporación y también imprime el enlace en el resumen. Mantén esa pestaña abierta; si no se inició, copia y pega la URL impresa en la misma máquina.

### Cómo autentico el token del panel de control en localhost vs remoto

**Localhost (misma máquina):**

- Abre `http://127.0.0.1:18789/`.
- Si solicita autenticación, pega el token de `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en la configuración de Control UI.
- Recupéralo desde el host del gateway: `openclaw config get gateway.auth.token` (o genera uno: `openclaw doctor --generate-gateway-token`).

**No en localhost:**

- **Tailscale Serve** (recomendado): mantén el bucle de retorno (bind loopback), ejecuta `openclaw gateway --tailscale serve`, abre `https://<magicdns>/`. Si `gateway.auth.allowTailscale` es `true`, los encabezados de identidad satisfacen la autenticación de Control UI/WebSocket (sin token, asume host de gateway confiable); las API de HTTP aún requieren token/contraseña.
- **Tailnet bind**: ejecuta `openclaw gateway --bind tailnet --token "<token>"`, abre `http://<tailscale-ip>:18789/`, pega el token en la configuración del panel.
- **Túnel SSH**: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abre `http://127.0.0.1:18789/` y pega el token en la configuración de Control UI.

Consulta [Panel de control](/es/web/dashboard) y [Superficies web](/es/web) para ver los modos de enlace y detalles de autenticación.

### Qué entorno de ejecución necesito

Se requiere Node **>= 22**. Se recomienda `pnpm`. No se recomienda Bun para el Gateway.

### Se ejecuta en Raspberry Pi

Sí. El Gateway es ligero: la documentación lista **512MB-1GB de RAM**, **1 núcleo** y unos **500MB**
de disco como suficiente para uso personal, y señala que una **Raspberry Pi 4 puede ejecutarlo**.

Si quieres margen adicional (registros, medios, otros servicios), se recomiendan **2GB**, pero no
es un mínimo estricto.

Consejo: una Pi/VPS pequeña puede alojar el Gateway, y puedes emparejar **nodos** en tu portátil/teléfono para
pantalla/cámara/lienzo locales o ejecución de comandos. Consulta [Nodos](/es/nodes).

### Algún consejo para las instalaciones en Raspberry Pi

Versión corta: funciona, pero espera imprevistos.

- Utiliza un sistema operativo de **64 bits** y mantén Node >= 22.
- Prefiere la **instalación hackable (git)** para que puedas ver los registros y actualizar rápidamente.
- Comienza sin canales/habilidades, luego añádelos uno por uno.
- Si encuentras problemas extraños con binarios, generalmente es un problema de **compatibilidad ARM**.

Documentación: [Linux](/es/platforms/linux), [Instalación](/es/install).

### Está atascado en wake up my friend onboarding will not hatch ¿Qué hago ahora

Esa pantalla depende de que el Gateway sea accesible y esté autenticado. La TUI también envía
"Wake up, my friend!" automáticamente en la primera eclosión. Si ves esa línea con **sin respuesta**
y los tokens se mantienen en 0, el agente nunca se ejecutó.

1. Reinicia el Gateway:

```bash
openclaw gateway restart
```

2. Comprueba el estado + autenticación:

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

3. Si sigue bloqueado, ejecuta:

```bash
openclaw doctor
```

Si el Gateway es remoto, asegúrate de que la conexión túnel/Tailscale esté activa y de que la interfaz
apunte al Gateway correcto. Consulta [Acceso remoto](/es/gateway/remote).

### ¿Puedo migrar mi configuración a una nueva máquina Mac mini sin repetir la incorporación

Sí. Copia el **directorio de estado** y el **espacio de trabajo**, luego ejecuta Doctor una vez. Esto
mantiene tu bot "exactamente igual" (memoria, historial de sesiones, autenticación y estado
del canal) siempre que copies **ambas** ubicaciones:

1. Instala OpenClaw en la nueva máquina.
2. Copia `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`) de la máquina antigua.
3. Copia tu espacio de trabajo (predeterminado: `~/.openclaw/workspace`).
4. Ejecuta `openclaw doctor` y reinicia el servicio Gateway.

Esto preserva la configuración, perfiles de autenticación, credenciales de WhatsApp, sesiones y memoria. Si estás en
modo remoto, recuerda que el host de la puerta de enlace es el propietario del almacén de sesiones y el espacio de trabajo.

**Importante:** si solo haces commit/push de tu espacio de trabajo a GitHub, estás haciendo una copia de seguridad de **memoria + archivos de arranque**, pero **no** del historial de sesiones ni de la autenticación. Estos se encuentran en `~/.openclaw/` (por ejemplo `~/.openclaw/agents/<agentId>/sessions/`).

Relacionado: [Migración](/es/install/migrating), [Dónde se encuentran las cosas en el disco](/es/help/faq#where-does-openclaw-store-its-data),
[Espacio de trabajo del agente](/es/concepts/agent-workspace), [Doctor](/es/gateway/doctor),
[Modo remoto](/es/gateway/remote).

### ¿Dónde puedo ver las novedades de la última versión

Consulta el registro de cambios de GitHub:
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

Las entradas más recientes están arriba. Si la sección superior está marcada como **Unreleased** (No publicada), la siguiente sección con fecha es la última versión publicada. Las entradas se agrupan en **Highlights** (Aspectos destacados), **Changes** (Cambios) y
**Fixes** (Correcciones) (más secciones de documentos/otras cuando sea necesario).

### No puedo acceder a docs.openclaw.ai Error de SSL ¿Qué hago ahora

Algunas conexiones de Comcast/Xfinity bloquean incorrectamente `docs.openclaw.ai` a través de Xfinity
Advanced Security. Desactívalo o añade `docs.openclaw.ai` a la lista de permitidos, luego vuelve a intentarlo. Más
detalles: [Solución de problemas](/es/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity).
Por favor, ayúdanos a desbloquearlo informando aquí: [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

Si sigues sin poder acceder al sitio, la documentación se encuentra reflejada en GitHub:
[https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

### ¿Cuál es la diferencia entre estable y beta

**Stable** (estable) y **beta** son **dist-tags de npm**, no líneas de código separadas:

- `latest` = estable
- `beta` = versión preliminar para pruebas

Publicamos compilaciones en **beta**, las probamos y una vez que una compilación es sólida **promovemos
esa misma versión a `latest`**. Por eso beta y estable pueden apuntar a la
**misma versión**.

Ver qué cambió:
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

### ¿Cómo instalo la versión beta y cuál es la diferencia entre beta y dev

**Beta** es el dist-tag de npm `beta` (puede coincidir con `latest`).
**Dev** es la cabeza móvil de `main` (git); cuando se publica, usa el dist-tag de npm `dev`.

Líneas de comando únicas (macOS/Linux):

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Instalador de Windows (PowerShell):
[https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

Más detalles: [Canales de desarrollo](/es/install/development-channels) y [Opciones del instalador](/es/install/installer).

### ¿Cuánto tiempo suele tardar la instalación y la incorporación?

Guía aproximada:

- **Instalación:** 2-5 minutos
- **Incorporación:** 5-15 minutos dependiendo de cuántos canales/modelos configures

Si se bloquea, usa [Instalador atascado](/es/help/faq#installer-stuck-how-do-i-get-more-feedback)
y el bucle de depuración rápida en [Estoy atascado](/es/help/faq#im-stuck--whats-the-fastest-way-to-get-unstuck).

### ¿Cómo pruebo las últimas novedades?

Dos opciones:

1. **Canal de desarrollo (git checkout):**

```bash
openclaw update --channel dev
```

Esto cambia a la rama `main` y actualiza desde el código fuente.

2. **Instalación personalizable (desde el sitio del instalador):**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Eso te da un repositorio local que puedes editar, y luego actualizar vía git.

Si prefieres un clon limpio manualmente, usa:

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

Documentación: [Actualizar](/es/cli/update), [Canales de desarrollo](/es/install/development-channels),
[Instalar](/es/install).

### El instalador está atascado ¿Cómo obtengo más comentarios?

Vuelve a ejecutar el instalador con **salida detallada**:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

Instalación Beta con modo detallado:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

Para una instalación personalizable (git):

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
```

Equivalente en Windows (PowerShell):

```powershell
# install.ps1 has no dedicated -Verbose flag yet.
Set-PSDebug -Trace 1
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
Set-PSDebug -Trace 0
```

Más opciones: [Opciones del instalador](/es/install/installer).

### La instalación en Windows dice que no se encontró git o que openclaw no se reconoce

Dos problemas comunes en Windows:

**1) error de npm spawn git / git no encontrado**

- Instala **Git para Windows** y asegúrate de que `git` esté en tu PATH.
- Cierra y vuelve a abrir PowerShell, luego vuelve a ejecutar el instalador.

**2) openclaw no se reconoce después de la instalación**

- Tu carpeta bin global de npm no está en el PATH.
- Comprueba la ruta:

  ```powershell
  npm config get prefix
  ```

- Añade ese directorio a tu PATH de usuario (no se necesita sufijo `\bin` en Windows; en la mayoría de los sistemas es `%AppData%\npm`).
- Cierra y vuelve a abrir PowerShell después de actualizar el PATH.

Si quieres la configuración de Windows más fluida, usa **WSL2** en lugar de Windows nativo.
Documentación: [Windows](/es/platforms/windows).

### La salida de ejecución en Windows muestra texto chino corrupto ¿qué debo hacer?

Esto suele ser una discrepancia en la página de códigos de la consola en los shells nativos de Windows.

Síntomas:

- La salida de `system.run`/`exec` muestra el chino como mojibake
- El mismo comando se ve bien en otro perfil de terminal

Solución rápida en PowerShell:

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

Luego reinicie el Gateway y vuelva a intentar su comando:

```powershell
openclaw gateway restart
```

Si todavía reproduce esto en la última versión de OpenClaw, rastree/infórmelo en:

- [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

### La documentación no respondió a mi pregunta, ¿cómo obtengo una mejor respuesta?

Use la **instalación hackeable (git)** para tener el código fuente y los documentos completos localmente, luego pregunte
a su bot (o Claude/Codex) _desde esa carpeta_ para que pueda leer el repositorio y responder con precisión.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Más detalles: [Instalación](/es/install) y [Flags del instalador](/es/install/installer).

### ¿Cómo instalo OpenClaw en Linux?

Respuesta corta: siga la guía de Linux y luego ejecute el asistente de incorporación.

- Ruta rápida de Linux + instalación del servicio: [Linux](/es/platforms/linux).
- Tutorial completo: [Primeros pasos](/es/start/getting-started).
- Instalador + actualizaciones: [Instalación y actualizaciones](/es/install/updating).

### ¿Cómo instalo OpenClaw en un VPS?

Cualquier VPS de Linux funciona. Instale en el servidor y luego use SSH/Tailscale para acceder al Gateway.

Guías: [exe.dev](/es/install/exe-dev), [Hetzner](/es/install/hetzner), [Fly.io](/es/install/fly).
Acceso remoto: [Gateway remoto](/es/gateway/remote).

### ¿Dónde están las guías de instalación de VPS en la nube?

Mantenemos un **centro de alojamiento** con los proveedores comunes. Elija uno y siga la guía:

- [Alojamiento VPS](/es/vps) (todos los proveedores en un solo lugar)
- [Fly.io](/es/install/fly)
- [Hetzner](/es/install/hetzner)
- [exe.dev](/es/install/exe-dev)

Cómo funciona en la nube: el **Gateway se ejecuta en el servidor** y usted accede a él
desde su laptop/teléfono a través de la interfaz de usuario de Control (o Tailscale/SSH). Su estado + espacio de trabajo
viven en el servidor, así que trate el host como la fuente de verdad y respáldelo.

Puede vincular **nodos** (Mac/iOS/Android/headless) a ese Gateway en la nube para acceder
a la pantalla/cámara/lienzo local o ejecutar comandos en su laptop mientras mantiene el
Gateway en la nube.

Centro: [Plataformas](/es/platforms). Acceso remoto: [Gateway remoto](/es/gateway/remote).
Nodos: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes).

### ¿Puedo pedirle a OpenClaw que se actualice a sí mismo?

Respuesta corta: **posible, no recomendado**. El flujo de actualización puede reiniciar el
Gateway (lo que termina la sesión activa), puede requerir una comprobación limpia de git y
puede solicitar confirmación. Más seguro: ejecute las actualizaciones desde un shell como operador.

Use la CLI:

```bash
openclaw update
openclaw update status
openclaw update --channel stable|beta|dev
openclaw update --tag <dist-tag|version>
openclaw update --no-restart
```

Si debe automatizar desde un agente:

```bash
openclaw update --yes --no-restart
openclaw gateway restart
```

Documentación: [Actualizar](/es/cli/update), [Actualizando](/es/install/updating).

### ¿Qué hace realmente el asistente de incorporación

`openclaw onboard` es la ruta de configuración recomendada. En **modo local** le guía a través de:

- **Configuración de modelo/autenticación** (se admiten flujos de OAuth/token de configuración del proveedor y claves API, además de opciones de modelo local como LM Studio)
- Ubicación del **Espacio de trabajo** + archivos de arranque
- Configuración del **Gateway** (bind/puerto/auth/tailscale)
- **Proveedores** (WhatsApp, Telegram, Discord, Mattermost (complemento), Signal, iMessage)
- **Instalación del Daemon** (LaunchAgent en macOS; unidad de usuario systemd en Linux/WSL2)
- Selección de **comprobaciones de estado** y **habilidades**

También advierte si su modelo configurado es desconocido o falta la autenticación.

### ¿Necesito una suscripción a Claude u OpenAI para ejecutar esto

No. Puede ejecutar OpenClaw con **claves API** (Anthropic/OpenAI/u otros) o con
**modelos solo locales** para que sus datos se mantengan en su dispositivo. Las suscripciones (Claude
Pro/Max u OpenAI Codex) son formas opcionales de autenticar esos proveedores.

Si elige la autenticación por suscripción de Anthropic, decida usted mismo si usarla:
Anthropic ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado.
OpenAI Codex OAuth es explícitamente compatible con herramientas externas como OpenClaw.

Documentación: [Anthropic](/es/providers/anthropic), [OpenAI](/es/providers/openai),
[Modelos locales](/es/gateway/local-models), [Modelos](/es/concepts/models).

### ¿Puedo usar la suscripción Claude Max sin una clave API

Sí. Puede autenticarse con un **setup-token**
en lugar de una clave API. Esta es la ruta de suscripción.

Las suscripciones Claude Pro/Max **no incluyen una clave API**, por lo que esta es la
ruta técnica para cuentas de suscripción. Pero esta es su decisión: Anthropic
ha bloqueado algunos usos de suscripción fuera de Claude Code en el pasado.
Si desea la ruta compatible más clara y segura para producción, use una clave API de Anthropic.

### ¿Cómo funciona la autenticación por setuptoken de Anthropic

`claude setup-token` genera una **cadena de token** a través de la CLI de Claude Code (no está disponible en la consola web). Puedes ejecutarla en **cualquier máquina**. Elige **Anthropic token (paste setup-token)** en el asistente o pégalo con `openclaw models auth paste-token --provider anthropic`. El token se almacena como un perfil de autenticación para el proveedor **anthropic** y se usa como una clave API (sin actualización automática). Más detalles: [OAuth](/es/concepts/oauth).

### ¿Dónde encuentro un setuptoken de Anthropic

**No** está en la consola de Anthropic. El setup-token es generado por la **CLI de Claude Code** en **cualquier máquina**:

```bash
claude setup-token
```

Copia el token que imprime y luego elige **Anthropic token (paste setup-token)** en el asistente. Si quieres ejecutarlo en el host de la puerta de enlace, usa `openclaw models auth setup-token --provider anthropic`. Si ejecutaste `claude setup-token` en otro lugar, pégalo en el host de la puerta de enlace con `openclaw models auth paste-token --provider anthropic`. Consulta [Anthropic](/es/providers/anthropic).

### ¿Admiten la autenticación de suscripción de Claude (Claude Pro o Max)

Sí: a través de **setup-token**. OpenClaw ya no reutiliza los tokens OAuth de la CLI de Claude Code; usa un setup-token o una clave API de Anthropic. Genera el token en cualquier lugar y pégalo en el host de la puerta de enlace. Consulta [Anthropic](/es/providers/anthropic) y [OAuth](/es/concepts/oauth).

Importante: esta es compatibilidad técnica, no una garantía política. Anthropic
ha bloqueado algún uso de suscripción fuera de Claude Code en el pasado.
Debes decidir si usarlo y verificar los términos actuales de Anthropic.
Para cargas de trabajo de producción o multiusuario, la autenticación con clave API de Anthropic es la opción más segura y recomendada.

### ¿Por qué veo HTTP 429 ratelimiterror de Anthropic

Eso significa que tu **cuota/límite de velocidad de Anthropic** está agotada para la ventana actual. Si usas una **suscripción de Claude** (setup-token), espera a que la ventana se restablezca o actualiza tu plan. Si usas una **clave API de Anthropic**, revisa la consola de Anthropic para verificar el uso/facturación y aumenta los límites según sea necesario.

Si el mensaje es específicamente:
`Extra usage is required for long context requests`, la solicitud está intentando usar
la beta de contexto de 1M de Anthropic (`context1m: true`). Eso solo funciona cuando tu credencial es elegible para la facturación de contexto largo (facturación de clave API o suscripción con Uso adicional habilitado).

Sugerencia: configura un **modelo de reserva** para que OpenClaw pueda seguir respondiendo mientras un proveedor está limitado por la tasa de uso.
Consulta [Modelos](/es/cli/models), [OAuth](/es/concepts/oauth) y
[/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/es/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

### ¿Está soportado AWS Bedrock?

Sí, a través del proveedor **Amazon Bedrock (Converse)** de pi-ai con **configuración manual**. Debes proporcionar las credenciales/región de AWS en el host de la puerta de enlace y agregar una entrada de proveedor Bedrock en tu configuración de modelos. Consulta [Amazon Bedrock](/es/providers/bedrock) y [Proveedores de modelos](/es/providers/models). Si prefieres un flujo de claves administradas, un proxy compatible con OpenAI delante de Bedrock sigue siendo una opción válida.

### ¿Cómo funciona la autenticación de Codex?

OpenClaw es compatible con **OpenAI Code (Codex)** a través de OAuth (inicio de sesión de ChatGPT). El asistente puede ejecutar el flujo de OAuth y establecerá el modelo predeterminado en `openai-codex/gpt-5.4` cuando corresponda. Consulta [Proveedores de modelos](/es/concepts/model-providers) y [Asistente](/es/start/wizard).

### ¿Admites la autenticación de suscripción de OpenAI y OAuth de Codex?

Sí. OpenClaw es totalmente compatible con **OAuth de suscripción de OpenAI Code (Codex)**.
OpenAI permite explícitamente el uso de OAuth de suscripción en herramientas y flujos de trabajo externos
como OpenClaw. El asistente de incorporación puede ejecutar el flujo de OAuth por ti.

Consulta [OAuth](/es/concepts/oauth), [Proveedores de modelos](/es/concepts/model-providers) y [Asistente](/es/start/wizard).

### ¿Cómo configuro OAuth de la CLI de Gemini?

La CLI de Gemini utiliza un **flujo de autenticación de complementos**, no un ID de cliente ni un secreto en `openclaw.json`.

Pasos:

1. Habilita el complemento: `openclaw plugins enable google-gemini-cli-auth`
2. Inicia sesión: `openclaw models auth login --provider google-gemini-cli --set-default`

Esto almacena los tokens de OAuth en perfiles de autenticación en el host de la puerta de enlace. Detalles: [Proveedores de modelos](/es/concepts/model-providers).

### ¿Es válido un modelo local para charlas informales?

Por lo general, no. OpenClaw necesita un contexto grande + seguridad fuerte; las tarjetas pequeñas truncan y filtran información. Si es necesario, ejecuta la compilación **más grande** de MiniMax M2.5 que puedas localmente (LM Studio) y consulta [/gateway/local-models](/es/gateway/local-models). Los modelos más pequeños/cuantizados aumentan el riesgo de inyección de avisos; consulta [Seguridad](/es/gateway/security).

### ¿Cómo mantengo el tráfico del modelo alojado en una región específica

Elige puntos de conexión anclados a una región. OpenRouter expone opciones alojadas en EE. UU. para MiniMax, Kimi y GLM; elige la variante alojada en EE. UU. para mantener los datos en la región. Todavía puedes listar Anthropic/OpenAI junto a estos usando `models.mode: "merge"` para que las alternativas sigan disponibles respetando el proveedor regional que elijas.

### ¿Tengo que comprar un Mac Mini para instalar esto

No. OpenClaw se ejecuta en macOS o Linux (Windows a través de WSL2). Un Mac mini es opcional: algunas personas compran uno como host siempre activo, pero un pequeño VPS, un servidor doméstico o una caja de clase Raspberry Pi también funcionan.

Solo necesitas un Mac **para herramientas exclusivas de macOS**. Para iMessage, usa [BlueBubbles](/es/channels/bluebubbles) (recomendado); el servidor BlueBubbles se ejecuta en cualquier Mac, y la puerta de enlace (Gateway) puede ejecutarse en Linux o en otro lugar. Si deseas otras herramientas exclusivas de macOS, ejecuta la puerta de enlace en un Mac o empareja un nodo macOS.

Documentación: [BlueBubbles](/es/channels/bluebubbles), [Nodos](/es/nodes), [Modo remoto Mac](/es/platforms/mac/remote).

### ¿Necesito un Mac mini para la compatibilidad con iMessage

Necesitas **algún dispositivo macOS** conectado a Mensajes. **No** tiene que ser un Mac mini; cualquier Mac funciona. **Usa [BlueBubbles](/es/channels/bluebubbles)** (recomendado) para iMessage: el servidor BlueBubbles se ejecuta en macOS, mientras que la puerta de enlace puede ejecutarse en Linux o en otro lugar.

Configuraciones comunes:

- Ejecuta la puerta de enlace en Linux/VPS y ejecuta el servidor BlueBubbles en cualquier Mac conectado a Mensajes.
- Ejecuta todo en el Mac si deseas la configuración de máquina única más sencilla.

Documentación: [BlueBubbles](/es/channels/bluebubbles), [Nodos](/es/nodes),
[Modo remoto Mac](/es/platforms/mac/remote).

### Si compro un Mac mini para ejecutar OpenClaw, ¿puedo conectarlo a mi MacBook Pro

Sí. El **Mac mini puede ejecutar la puerta de enlace** y tu MacBook Pro puede conectarse como un **nodo** (dispositivo complementario). Los nodos no ejecutan la puerta de enlace; proporcionan capacidades adicionales como pantalla/cámara/lienzo y `system.run` en ese dispositivo.

Patrón común:

- Puerta de enlace en el Mac mini (siempre activo).
- El MacBook Pro ejecuta la aplicación macOS o un host de nodo y se empareja con la puerta de enlace.
- Usa `openclaw nodes status` / `openclaw nodes list` para verlo.

Documentación: [Nodes](/es/nodes), [Nodes CLI](/es/cli/nodes).

### ¿Puedo usar Bun

Bun **no está recomendado**. Vemos errores de ejecución, especialmente con WhatsApp y Telegram.
Use **Node** para gateways estables.

Si aun quieres experimentar con Bun, hazlo en un gateway que no sea de producción
sin WhatsApp/Telegram.

### Telegram qué va en allowFrom

`channels.telegram.allowFrom` es **el ID de usuario de Telegram del remitente humano** (numérico). No es el nombre de usuario del bot.

El asistente de incorporación acepta la entrada `@username` y la resuelve a una ID numérica, pero la autorización de OpenClaw usa solo IDs numéricos.

Más seguro (sin bot de terceros):

- Envía un mensaje privado (DM) a tu bot, luego ejecuta `openclaw logs --follow` y lee `from.id`.

API de Bot Oficial:

- Envía un DM a tu bot, luego llama `https://api.telegram.org/bot<bot_token>/getUpdates` y lee `message.from.id`.

Terceros (menos privado):

- Envía un DM a `@userinfobot` o `@getidsbot`.

Vea [/channels/telegram](/es/channels/telegram#access-control-dms--groups).

### ¿Pueden varias personas usar un número de WhatsApp con diferentes instancias de OpenClaw

Sí, a través del **enrutamiento multiagente**. Vincula el **MD** de WhatsApp de cada remitente (par `kind: "direct"`, remitente E.164 como `+15551234567`) a un `agentId` diferente, para que cada persona tenga su propio espacio de trabajo y almacén de sesiones. Las respuestas aún provienen de la **misma cuenta de WhatsApp**, y el control de acceso al DM (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`) es global por cuenta de WhatsApp. Vea [Enrutamiento Multi-Agent](/es/concepts/multi-agent) y [WhatsApp](/es/channels/whatsapp).

### ¿Puedo ejecutar un agente de chat rápido y un Opus para agente de codificación

Sí. Usa el enrutamiento multiagente: da a cada agente su propio modelo predeterminado, luego vincula las rutas de entrada (cuenta de proveedor o pares específicos) a cada agente. Un ejemplo de configuración se encuentra en [Enrutamiento Multi-Agent](/es/concepts/multi-agent). Vea también [Modelos](/es/concepts/models) y [Configuración](/es/gateway/configuration).

### ¿Homebrew funciona en Linux

Sí. Homebrew soporta Linux (Linuxbrew). Configuración rápida:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

Si ejecutas OpenClaw mediante systemd, asegúrate de que el PATH del servicio incluya `/home/linuxbrew/.linuxbrew/bin` (o tu prefijo de brew) para que las herramientas instaladas por `brew` se resuelvan en shells no de inicio de sesión.
Las compilaciones recientes también anteponen directorios comunes de bin de usuario en los servicios systemd de Linux (por ejemplo `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) y respetan `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` y `FNM_DIR` cuando están configurados.

### ¿Cuál es la diferencia entre la instalación hackable de git y la instalación de npm

- **Instalación hackable (git):** checkout completo del código fuente, editable, lo mejor para los colaboradores.
  Ejecutas compilaciones localmente y puedes parchear código/documentación.
- **instalación npm:** instalación global de CLI, sin repositorio, lo mejor para "solo ejecútalo".
  Las actualizaciones provienen de dist-tags de npm.

Documentos: [Primeros pasos](/es/start/getting-started), [Actualización](/es/install/updating).

### ¿Puedo cambiar entre instalaciones npm y git más adelante

Sí. Instala la otra variante y luego ejecuta Doctor para que el servicio de puerta de enlace apunte al nuevo punto de entrada.
Esto **no borra tus datos** - solo cambia la instalación del código de OpenClaw. Tu estado
(`~/.openclaw`) y espacio de trabajo (`~/.openclaw/workspace`) permanecen intactos.

De npm → git:

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
openclaw doctor
openclaw gateway restart
```

De git → npm:

```bash
npm install -g openclaw@latest
openclaw doctor
openclaw gateway restart
```

Doctor detecta una discrepancia en el punto de entrada del servicio de puerta de enlace y ofrece reescribir la configuración del servicio para que coincida con la instalación actual (usa `--repair` en automatización).

Consejos de copia de seguridad: consulta [Estrategia de copia de seguridad](/es/help/faq#whats-the-recommended-backup-strategy).

### ¿Debo ejecutar el Gateway en mi portátil o en un VPS

Respuesta corta: **si quieres fiabilidad 24/7, usa un VPS**. Si quieres la
menor fricción y te va bien dormir/reiniciar, ejecútalo localmente.

**Portátil (Gateway local)**

- **Ventajas:** sin coste de servidor, acceso directo a archivos locales, ventana del navegador en vivo.
- **Contras:** suspensión/caídas de red = desconexiones, las actualizaciones/reinicios del sistema operativo interrumpen, debe mantenerse encendido.

**VPS / nube**

- **Ventajas:** siempre encendido, red estable, sin problemas de suspensión del portátil, más fácil de mantener en ejecución.
- **Contras:** a menudo se ejecuta sin interfaz gráfica (usa capturas de pantalla), acceso remoto a archivos solamente, debes usar SSH para actualizaciones.

**Nota específica de OpenClaw:** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord funcionan bien desde un VPS. La única compensación real es **navegador sin interfaz** frente a una ventana visible. Consulta [Browser](/es/tools/browser).

**Recomendación por defecto:** VPS si has tenido desconexiones de la puerta de enlace antes. El uso local es excelente cuando estás usando activamente el Mac y deseas acceso a archivos locales o automatización de interfaz con un navegador visible.

### ¿Qué tan importante es ejecutar OpenClaw en una máquina dedicada

No es obligatorio, pero **recomendado para la confiabilidad y el aislamiento**.

- **Host dedicado (VPS/Mac mini/Pi):** siempre activo, menos interrupciones por sueño/reinicio, permisos más limpios, más fácil de mantener en ejecución.
- **Portátil/escritorio compartido:** totalmente bien para pruebas y uso activo, pero espera pausas cuando la máquina se suspenda o se actualice.

Si quieres lo mejor de ambos mundos, mantén la puerta de enlace en un host dedicado y empareja tu portátil como un **nodo** para herramientas de pantalla/cámara/exec locales. Consulta [Nodes](/es/nodes).
Para orientación sobre seguridad, lee [Security](/es/gateway/security).

### Cuáles son los requisitos mínimos de VPS y el sistema operativo recomendado

OpenClaw es ligero. Para una puerta de enlace básica + un canal de chat:

- **Mínimo absoluto:** 1 vCPU, 1GB de RAM, ~500MB de disco.
- **Recomendado:** 1-2 vCPU, 2GB de RAM o más para un margen (registros, medios, múltiples canales). Las herramientas de nodo y la automatización del navegador pueden consumir muchos recursos.

SO: usa **Ubuntu LTS** (o cualquier Debian/Ubuntu moderno). La ruta de instalación de Linux se prueba mejor allí.

Documentos: [Linux](/es/platforms/linux), [VPS hosting](/es/vps).

### ¿Puedo ejecutar OpenClaw en una VM y cuáles son los requisitos

Sí. Trata una VM igual que un VPS: debe estar siempre activa, ser accesible y tener suficiente
RAM para la puerta de enlace y cualquier canal que habilites.

Orientación básica:

- **Mínimo absoluto:** 1 vCPU, 1GB de RAM.
- **Recomendado:** 2GB de RAM o más si ejecutas múltiples canales, automatización del navegador o herramientas de medios.
- **SO:** Ubuntu LTS u otro Debian/Ubuntu moderno.

Si estás en Windows, **WSL2 es la configuración de estilo de VM más fácil** y tiene la mejor compatibilidad
de herramientas. Consulta [Windows](/es/platforms/windows), [VPS hosting](/es/vps).
Si estás ejecutando macOS en una VM, consulta [macOS VM](/es/install/macos-vm).

## ¿Qué es OpenClaw?

### ¿Qué es OpenClaw en un párrafo

OpenClaw es un asistente de IA personal que ejecutas en tus propios dispositivos. Responde en las superficies de mensajería que ya usas (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) y también puede hacer voz + un Canvas en vivo en las plataformas compatibles. El **Gateway** es el plano de control siempre activo; el asistente es el producto.

### Cuál es la propuesta de valor

OpenClaw no es "solo un envoltorio de Claude". Es un **plano de control local primero** que te permite ejecutar un
asistente capaz en **tu propio hardware**, accesible desde las aplicaciones de chat que ya usas, con
sesiones con estado, memoria y herramientas, sin entregar el control de tus flujos de trabajo a un SaaS
alojado.

Aspectos destacados:

- **Tus dispositivos, tus datos:** ejecuta el Gateway donde quieras (Mac, Linux, VPS) y mantén el
  espacio de trabajo + el historial de sesiones localmente.
- **Canales reales, no un sandbox web:** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc,
  más voz móvil y Canvas en plataformas compatibles.
- **Agnóstico al modelo:** usa Anthropic, OpenAI, MiniMax, OpenRouter, etc., con enrutamiento
  por agente y conmutación por error.
- **Opción solo local:** ejecuta modelos locales para que **todos los datos puedan permanecer en tu dispositivo** si lo deseas.
- **Enrutamiento multiagente:** agentes separados por canal, cuenta o tarea, cada uno con su propio
  espacio de trabajo y valores predeterminados.
- **Código abierto y hackeable:** inspecciona, extiende y aloja por ti mismo sin bloqueo de proveedor.

Documentación: [Gateway](/es/gateway), [Canales](/es/channels), [Multiagente](/es/concepts/multi-agent),
[Memoria](/es/concepts/memory).

### Acabo de configurarlo ¿qué debo hacer primero

Buenos primeros proyectos:

- Crear un sitio web (WordPress, Shopify o un sitio simple estático).
- Prototipar una aplicación móvil (esquema, pantallas, plan de API).
- Organizar archivos y carpetas (limpieza, nombres, etiquetas).
- Conectar Gmail y automatizar resúmenes o seguimientos.

Puede manejar tareas grandes, pero funciona mejor cuando las divides en fases y
usas subagentes para el trabajo en paralelo.

### ¿Cuáles son los cinco principales casos de uso cotidianos para OpenClaw

Los éxitos cotidianos suelen tener este aspecto:

- **Informes personales:** resúmenes de la bandeja de entrada, el calendario y las noticias que te interesan.
- **Investigación y redacción:** investigación rápida, resúmenes y primeros borradores para correos electrónicos o documentos.
- **Recordatorios y seguimientos:** avisos y listas de verificación impulsados por cron o latidos.
- **Automatización del navegador:** rellenar formularios, recopilar datos y repetir tareas web.
- **Coordinación entre dispositivos:** envía una tarea desde tu teléfono, deja que el Gateway la ejecute en un servidor y obtén el resultado en el chat.

### ¿Puede OpenClaw ayudar con la generación de clientes potenciales, la divulgación, los anuncios y los blogs para un SaaS

Sí para **investigación, calificación y redacción**. Puede escanear sitios, crear listas cortas,
resumir prospectos y escribir borradores de divulgación o textos publicitarios.

Para **campañas de divulgación o anuncios**, mantén a una persona en el bucle. Evita el spam, respeta las leyes locales y
las políticas de la plataforma, y revisa todo antes de enviarlo. El patrón más seguro es dejar
que OpenClaw redacte y tú apruebes.

Docs: [Seguridad](/es/gateway/security).

### ¿Cuáles son las ventajas frente a Claude Code para el desarrollo web

OpenClaw es un **asistente personal** y una capa de coordinación, no un reemplazo del IDE. Usa
Claude Code o Codex para el ciclo de codificación directa más rápido dentro de un repositorio. Usa OpenClaw cuando quieras
memoria duradera, acceso entre dispositivos y orquestación de herramientas.

Ventajas:

- **Memoria persistente + espacio de trabajo** a través de sesiones
- **Acceso multiplataforma** (WhatsApp, Telegram, TUI, WebChat)
- **Orquestación de herramientas** (navegador, archivos, programación, ganchos)
- **Gateway siempre activo** (ejecutar en un VPS, interactuar desde cualquier lugar)
- **Nodos** para navegador/pantalla/cámara/exec local

Showcase: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

## Habilidades y automatización

### ¿Cómo personalizo las habilidades sin ensuciar el repositorio

Usa anulaciones administradas en lugar de editar la copia del repositorio. Pon tus cambios en `~/.openclaw/skills/<name>/SKILL.md` (o añade una carpeta mediante `skills.load.extraDirs` en `~/.openclaw/openclaw.json`). La prioridad es `<workspace>/skills` > `~/.openclaw/skills` > agrupado, por lo que las anulaciones administradas ganan sin tocar git. Solo las ediciones dignas de upstream deben vivir en el repositorio y salir como PRs.

### ¿Puedo cargar habilidades desde una carpeta personalizada

Sí. Añada directorios adicionales a través de `skills.load.extraDirs` en `~/.openclaw/openclaw.json` (menor precedencia). La precedencia predeterminada sigue siendo: `<workspace>/skills` → `~/.openclaw/skills` → empaquetados → `skills.load.extraDirs`. `clawhub` se instala en `./skills` de forma predeterminada, lo cual OpenClaw trata como `<workspace>/skills`.

### ¿Cómo puedo usar diferentes modelos para diferentes tareas

Hoy, los patrones compatibles son:

- **Trabajos de Cron (Cron jobs)**: los trabajos aislados pueden establecer una anulación de `model` por trabajo.
- **Subagentes**: enrutar tareas a agentes separados con diferentes modelos predeterminados.
- **Cambio bajo demanda**: use `/model` para cambiar el modelo de la sesión actual en cualquier momento.

Consulte [Cron jobs](/es/automation/cron-jobs), [Multi-Agent Routing](/es/concepts/multi-agent) y [Slash commands](/es/tools/slash-commands).

### El bot se congela mientras realiza un trabajo pesado ¿Cómo puedo descargarlo?

Use **subagentes** para tareas largas o paralelas. Los subagentes se ejecutan en su propia sesión,
devuelven un resumen y mantienen su chat principal responsivo.

Pída a su bot que "genere un subagente para esta tarea" o use `/subagents`.
Use `/status` en el chat para ver qué está haciendo el Gateway ahora mismo (y si está ocupado).

Consejo sobre tokens: las tareas largas y los subagentes consumen tokens. Si el costo es una preocupación, establezca un
modelo más económico para los subagentes a través de `agents.defaults.subagents.model`.

Documentación: [Sub-agents](/es/tools/subagents).

### ¿Cómo funcionan las sesiones de subagente vinculadas a hilos en Discord?

Use enlaces de hilos (thread bindings). Puede vincular un hilo de Discord a un subagente o destino de sesión para que los mensajes de seguimiento en ese hilo se mantengan en esa sesión vinculada.

Flujo básico:

- Genere con `sessions_spawn` usando `thread: true` (y opcionalmente `mode: "session"` para un seguimiento persistente).
- O vincule manualmente con `/focus <target>`.
- Use `/agents` para inspeccionar el estado del enlace.
- Use `/session idle <duration|off>` y `/session max-age <duration|off>` para controlar el desenfoque automático.
- Use `/unfocus` para desvincular el hilo.

Configuración requerida:

- Valores predeterminados globales: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- Anulaciones de Discord: `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
- Vinculación automática al generar: configure `channels.discord.threadBindings.spawnSubagentSessions: true`.

Documentación: [Sub-agentes](/es/tools/subagents), [Discord](/es/channels/discord), [Referencia de configuración](/es/gateway/configuration-reference), [Comandos de barra](/es/tools/slash-commands).

### Cron o recordatorios no se ejecutan ¿Qué debería revisar

Cron se ejecuta dentro del proceso Gateway. Si el Gateway no se está ejecutando continuamente,
los trabajos programados no se ejecutarán.

Lista de verificación:

- Confirme que cron está habilitado (`cron.enabled`) y que `OPENCLAW_SKIP_CRON` no está establecido.
- Verifique que el Gateway se esté ejecutando las 24 horas, los 7 días (sin suspensión/reinicios).
- Verifique la configuración de zona horaria del trabajo (`--tz` vs zona horaria del host).

Depuración:

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

Documentación: [Trabajos Cron](/es/automation/cron-jobs), [Cron vs Heartbeat](/es/automation/cron-vs-heartbeat).

### ¿Cómo instalo habilidades en Linux

Use **ClawHub** (CLI) o coloque habilidades en su espacio de trabajo. La interfaz de usuario de Habilidades de macOS no está disponible en Linux.
Explore habilidades en [https://clawhub.com](https://clawhub.com).

Instale la CLI de ClawHub (elija un administrador de paquetes):

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### ¿Puede OpenClaw ejecutar tareas según un horario o continuamente en segundo plano

Sí. Use el programador de Gateway:

- **Trabajos Cron** para tareas programadas o recurrentes (persisten tras los reinicios).
- **Heartbeat** para comprobaciones periódicas de la "sesión principal".
- **Trabajos aislados** para agentes autónomos que publican resúmenes o entregan a chats.

Documentación: [Trabajos Cron](/es/automation/cron-jobs), [Cron vs Heartbeat](/es/automation/cron-vs-heartbeat),
[Heartbeat](/es/gateway/heartbeat).

### ¿Puedo ejecutar habilidades exclusivas de Apple macOS desde Linux?

No directamente. Las habilidades de macOS están restringidas por `metadata.openclaw.os` más los binarios necesarios, y las habilidades solo aparecen en el mensaje del sistema cuando son elegibles en el **host Gateway**. En Linux, las habilidades solo de `darwin` (como `apple-notes`, `apple-reminders`, `things-mac`) no se cargarán a menos que invalide la restricción.

Tiene tres patrones admitidos:

**Opción A: ejecutar el Gateway en una Mac (lo más sencillo).**
Ejecute el Gateway donde existen los binarios de macOS, luego conéctese desde Linux en [modo remoto](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere) o a través de Tailscale. Las habilidades se cargan normalmente porque el host del Gateway es macOS.

**Opción B: usar un nodo macOS (sin SSH).**
Ejecute el Gateway en Linux, empareje un nodo macOS (aplicación de la barra de menús) y configure **Ejecutar comandos de nodo** en "Preguntar siempre" o "Permitir siempre" en la Mac. OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios requeridos existen en el nodo. El agente ejecuta esas habilidades a través de la herramienta `nodes`. Si elige "Preguntar siempre", aprobar "Permitir siempre" en el mensaje agrega ese comando a la lista de permitidos.

**Opción C: proxificar binarios de macOS a través de SSH (avanzado).**
Mantenga el Gateway en Linux, pero haga que los binarios de CLI necesarios se resuelvan en contenedores SSH que se ejecutan en una Mac. Luego anule la habilidad para permitir Linux para que siga siendo elegible.

1. Cree un contenedor SSH para el binario (ejemplo: `memo` para Apple Notes):

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
   ```

2. Coloque el contenedor en `PATH` en el host de Linux (por ejemplo `~/bin/memo`).
3. Anule los metadatos de la habilidad (espacio de trabajo o `~/.openclaw/skills`) para permitir Linux:

   ```markdown
   ---
   name: apple-notes
   description: Manage Apple Notes via the memo CLI on macOS.
   metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
   ---
   ```

4. Inicie una nueva sesión para que se actualice la instantánea de las habilidades.

### ¿Tienen una integración con Notion o HeyGen?

No integrada hoy en día.

Opciones:

- **Habilidad/complemento personalizado:** lo mejor para un acceso a API confiable (tanto Notion como HeyGen tienen API).
- **Automatización del navegador:** funciona sin código, pero es más lenta y más frágil.

Si desea mantener el contexto por cliente (flujos de trabajo de agencia), un patrón simple es:

- Una página de Notion por cliente (contexto + preferencias + trabajo activo).
- Pida al agente que obtenga esa página al comienzo de una sesión.

Si desea una integración nativa, abra una solicitud de función o cree una habilidad
orientada a esas API.

Instalar habilidades:

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub se instala en `./skills` en tu directorio actual (o usa tu espacio de trabajo OpenClaw configurado); OpenClaw lo trata como `<workspace>/skills` en la siguiente sesión. Para habilidades compartidas entre agentes, colócalas en `~/.openclaw/skills/<name>/SKILL.md`. Algunas habilidades esperan binarios instalados a través de Homebrew; en Linux eso significa Linuxbrew (consulta la entrada de FAQ de Homebrew Linux anterior). Consulta [Skills](/es/tools/skills) y [ClawHub](/es/tools/clawhub).

### ¿Cómo instalo la extensión de Chrome para la toma de control del navegador

Usa el instalador integrado y luego carga la extensión desempaquetada en Chrome:

```bash
openclaw browser extension install
openclaw browser extension path
```

Luego ve a Chrome → `chrome://extensions` → habilita "Modo de desarrollador" → "Cargar descomprimida" → elige esa carpeta.

Guía completa (incluyendo Gateway remoto + notas de seguridad): [Chrome extension](/es/tools/chrome-extension)

Si el Gateway se ejecuta en la misma máquina que Chrome (configuración predeterminada), generalmente **no** necesitas nada extra.
Si el Gateway se ejecuta en otro lugar, ejecuta un host de nodo en la máquina del navegador para que el Gateway pueda delegar las acciones del navegador.
Aún necesitas hacer clic en el botón de la extensión en la pestaña que deseas controlar (no se adjunta automáticamente).

## Sandboxing y memoria

### ¿Existe alguna documentación dedicada al sandboxing

Sí. Consulta [Sandboxing](/es/gateway/sandboxing). Para la configuración específica de Docker (gateway completo en Docker o imágenes de sandbox), consulta [Docker](/es/install/docker).

### Docker se siente limitado ¿Cómo habilito todas las funciones

La imagen predeterminada prioriza la seguridad y se ejecuta como el usuario `node`, por lo que no incluye
paquetes del sistema, Homebrew o navegadores empaquetados. Para una configuración más completa:

- Mantén `/home/node` con `OPENCLAW_HOME_VOLUME` para que las cachés sobrevivan.
- Incorpora dependencias del sistema a la imagen con `OPENCLAW_DOCKER_APT_PACKAGES`.
- Instala los navegadores Playwright a través de la CLI incluida:
  `node /app/node_modules/playwright-core/cli.js install chromium`
- Configura `PLAYWRIGHT_BROWSERS_PATH` y asegúrate de que la ruta se mantenga.

Documentación: [Docker](/es/install/docker), [Browser](/es/tools/browser).

**¿Puedo mantener los MD personales pero hacer que los grupos sean públicos con un agente en sandbox**

Sí, si tu tráfico privado son los **MD** y tu tráfico público son los **grupos**.

Use `agents.defaults.sandbox.mode: "non-main"` para que las sesiones de grupo/canal (claves no principales) se ejecuten en Docker, mientras que la sesión de MD principal se mantiene en el host. Luego, restringa qué herramientas están disponibles en las sesiones enlazadas a través de `tools.sandbox.tools`.

Tutorial de configuración + ejemplo de configuración: [Grupos: MDs personales + grupos públicos](/es/channels/groups#pattern-personal-dms-public-groups-single-agent)

Referencia clave de configuración: [Configuración de Gateway](/es/gateway/configuration#agentsdefaultssandbox)

### How do I bind a host folder into the sandbox

Establezca `agents.defaults.sandbox.docker.binds` en `["host:path:mode"]` (p. ej., `"/home/user/src:/src:ro"`). Los enlaces globales y por agente se fusionan; los enlaces por agente se ignoran cuando `scope: "shared"`. Use `:ro` para cualquier cosa sensible y recuerde que los enlaces omiten las paredes del sistema de archivos del sandbox. Consulte [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts) y [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) para ver ejemplos y notas de seguridad.

### How does memory work

La memoria de OpenClaw son solo archivos Markdown en el espacio de trabajo del agente:

- Notas diarias en `memory/YYYY-MM-DD.md`
- Notas curadas a largo plazo en `MEMORY.md` (solo sesiones principales/privadas)

OpenClaw también ejecuta un **flush de memoria de pre-compacción silencioso** para recordar al modelo
que escriba notas duraderas antes de la auto-compacción. Esto solo se ejecuta cuando el espacio de trabajo
es grabable (los sandbox de solo lectura lo omiten). Consulte [Memoria](/es/concepts/memory).

### Memory keeps forgetting things How do I make it stick

Pida al bot que **escriba el hecho en la memoria**. Las notas a largo plazo pertenecen a `MEMORY.md`,
el contexto a corto plazo va en `memory/YYYY-MM-DD.md`.

Esta es todavía un área que estamos mejorando. Ayuda recordar al modelo que almacene memorias;
sabrá qué hacer. Si sigue olvidando, verifique que el Gateway esté usando el mismo
espacio de trabajo en cada ejecución.

Documentación: [Memoria](/es/concepts/memory), [Espacio de trabajo del agente](/es/concepts/agent-workspace).

### Does semantic memory search require an OpenAI API key

Solo si usas **embeddings de OpenAI**. El OAuth de Codex cubre chat/completions y
**no** otorga acceso a embeddings, por lo que **iniciar sesión con Codex (OAuth o el
inicio de sesión de la CLI de Codex)** no ayuda para la búsqueda de memoria semántica. Los embeddings de
OpenAI todavía necesitan una clave de API real (`OPENAI_API_KEY` o `models.providers.openai.apiKey`).

Si no estableces un proveedor explícitamente, OpenClaw selecciona automáticamente un proveedor cuando puede
resolver una clave de API (perfiles de autenticación, `models.providers.*.apiKey`, o variables de entorno).
Prefiere OpenAI si se resuelve una clave de OpenAI; de lo contrario, Gemini si se resuelve una clave de
Gemini, luego Voyage, luego Mistral. Si no hay ninguna clave remota disponible, la búsqueda
de memoria permanece deshabilitada hasta que la configures. Si tienes una ruta de modelo local
configurada y presente, OpenClaw
prefiere `local`. Ollama es compatible cuando estableces explícitamente
`memorySearch.provider = "ollama"`.

Si prefieres mantenerte local, establece `memorySearch.provider = "local"` (y opcionalmente
`memorySearch.fallback = "none"`). Si quieres embeddings de Gemini, establece
`memorySearch.provider = "gemini"` y proporciona `GEMINI_API_KEY` (o
`memorySearch.remote.apiKey`). Admitimos modelos de embedding **OpenAI, Gemini, Voyage, Mistral, Ollama o locales** -
consulta [Memoria](/es/concepts/memory) para los detalles de configuración.

### ¿La memoria persiste para siempre? ¿Cuáles son los límites

Los archivos de memoria residen en el disco y persisten hasta que los eliminas. El límite es tu
almacenamiento, no el modelo. El **contexto de sesión** todavía está limitado por la ventana de
contexto del modelo, por lo que las conversaciones largas pueden compactarse o truncarse. Por eso
existe la búsqueda de memoria: recupera solo las partes relevantes al contexto.

Documentación: [Memoria](/es/concepts/memory), [Contexto](/es/concepts/context).

## Dónde residen las cosas en el disco

### ¿Se guardan localmente todos los datos utilizados con OpenClaw?

No: **el estado de OpenClaw es local**, pero **los servicios externos todavía ven lo que les envías**.

- **Local de forma predeterminada:** las sesiones, los archivos de memoria, la configuración y el espacio de trabajo residen en el host de Gateway
  (`~/.openclaw` + tu directorio de espacio de trabajo).
- **Remoto por necesidad:** los mensajes que envías a proveedores de modelos (Anthropic/OpenAI/etc.) van a
  sus API, y las plataformas de chat (WhatsApp/Telegram/Slack/etc.) almacenan los datos de los mensajes en sus
  servidores.
- **Controlas la huella:** el uso de modelos locales mantiene los mensajes en tu máquina, pero el tráfico del canal aún pasa a través de los servidores del canal.

Relacionado: [Espacio de trabajo del agente](/es/concepts/agent-workspace), [Memoria](/es/concepts/memory).

### ¿Dónde almacena OpenClaw sus datos?

Todo vive bajo `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`):

| Ruta                                                            | Propósito                                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuración principal (JSON5)                                                           |
| `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importación heredada de OAuth (copiada en los perfiles de autenticación en el primer uso) |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Perfiles de autenticación (OAuth, claves API y `keyRef`/`tokenRef` opcionales)            |
| `$OPENCLAW_STATE_DIR/secrets.json`                              | Carga útil secreta opcional respaldada en archivo para proveedores SecretRef de `file`    |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Archivo de compatibilidad heredada (entradas estáticas de `api_key` depuradas)            |
| `$OPENCLAW_STATE_DIR/credentials/`                              | Estado del proveedor (p. ej., `whatsapp/<accountId>/creds.json`)                          |
| `$OPENCLAW_STATE_DIR/agents/`                                   | Estado por agente (agentDir + sesiones)                                                   |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historial y estado de la conversación (por agente)                                        |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Metadatos de la sesión (por agente)                                                       |

Ruta heredada de agente único: `~/.openclaw/agent/*` (migrada por `openclaw doctor`).

Tu **espacio de trabajo** (AGENTS.md, archivos de memoria, habilidades, etc.) es independiente y se configura a través de `agents.defaults.workspace` (predeterminado: `~/.openclaw/workspace`).

### ¿Dónde deben vivir AGENTSmd SOULmd USERmd MEMORYmd?

Estos archivos viven en el **espacio de trabajo del agente**, no en `~/.openclaw`.

- **Espacio de trabajo (por agente)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
  `MEMORY.md` (o alternativa heredada `memory.md` cuando `MEMORY.md` está ausente),
  `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` opcional.
- **Directorio de estado (`~/.openclaw`)**: configuración, credenciales, perfiles de autenticación, sesiones, registros
  y habilidades compartidas (`~/.openclaw/skills`).

El espacio de trabajo predeterminado es `~/.openclaw/workspace`, configurable mediante:

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

Si el bot "olvida" después de un reinicio, confirme que la Gateway está utilizando el mismo
espacio de trabajo en cada inicio (y recuerde: el modo remoto utiliza el espacio de trabajo del **host de la gateway**,
no su computadora portátil local).

Consejo: si desea un comportamiento o preferencia duradero, pida al bot que **lo escriba en
AGENTS.md o MEMORY.md** en lugar de confiar en el historial de chat.

Consulte [Espacio de trabajo del agente](/es/concepts/agent-workspace) y [Memoria](/es/concepts/memory).

### Cuál es la estrategia de copia de seguridad recomendada

Coloque su **espacio de trabajo del agente** en un repositorio git **privado** y respáldelo en algún lugar
privado (por ejemplo, GitHub privado). Esto captura la memoria + los archivos AGENTS/SOUL/USER
y le permite restaurar la "mente" del asistente más tarde.

**No** confirme nada bajo `~/.openclaw` (credenciales, sesiones, tokens o cargas útiles de secretos cifrados).
Si necesita una restauración completa, haga una copia de seguridad del espacio de trabajo y del directorio de estado
por separado (consulte la pregunta de migración anterior).

Documentación: [Espacio de trabajo del agente](/es/concepts/agent-workspace).

### ¿Cómo desinstalo OpenClaw completamente?

Consulte la guía dedicada: [Desinstalar](/es/install/uninstall).

### ¿Pueden los agentes trabajar fuera del espacio de trabajo?

Sí. El espacio de trabajo es el **cwd predeterminado** y el ancla de memoria, no un sandbox estricto.
Las rutas relativas se resuelven dentro del espacio de trabajo, pero las rutas absolutas pueden acceder a otras
ubicaciones del host a menos que se habilite el sandbox. Si necesita aislamiento, use
[`agents.defaults.sandbox`](/es/gateway/sandboxing) o configuraciones de sandbox por agente. Si
quiere que un repositorio sea el directorio de trabajo predeterminado, apunte el `workspace`
de ese agente a la raíz del repositorio. El repositorio de OpenClaw es solo código fuente; mantenga el
espacio de trabajo separado a menos que intencionalmente desee que el agente trabaje dentro de él.

Ejemplo (repositorio como cwd predeterminado):

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo",
    },
  },
}
```

### Estoy en modo remoto, dónde está el almacén de sesiones

El estado de la sesión es propiedad del **host de la gateway**. Si está en modo remoto, el almacén de sesiones que le interesa está en la máquina remota, no en su computadora portátil local. Consulte [Gestión de sesiones](/es/concepts/session).

## Conceptos básicos de configuración

### ¿Qué formato tiene la configuración? ¿Dónde está?

OpenClaw lee una configuración opcional **JSON5** desde `$OPENCLAW_CONFIG_PATH` (predeterminado: `~/.openclaw/openclaw.json`):

```
$OPENCLAW_CONFIG_PATH
```

Si falta el archivo, usa valores predeterminados relativamente seguros (incluyendo un espacio de trabajo predeterminado de `~/.openclaw/workspace`).

### Configuré gatewaybind en lan o tailnet y ahora nada escucha, la interfaz dice no autorizado

Los enlaces no locales **requieren autenticación**. Configure `gateway.auth.mode` + `gateway.auth.token` (o use `OPENCLAW_GATEWAY_TOKEN`).

```json5
{
  gateway: {
    bind: "lan",
    auth: {
      mode: "token",
      token: "replace-me",
    },
  },
}
```

Notas:

- `gateway.remote.token` / `.password` **no** activan la autenticación local de la puerta de enlace por sí mismos.
- Las rutas de llamadas locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está configurado.
- Si `gateway.auth.token` / `gateway.auth.password` está configurado explícitamente mediante SecretRef y no se resuelve, la resolución falla de forma cerrada (sin enmascaramiento de alternativa remota).
- La interfaz de Control se autentica mediante `connect.params.auth.token` (almacenado en la configuración de la aplicación/interfaz). Evite poner tokens en las URL.

### ¿Por qué necesito un token en localhost ahora?

OpenClaw exige la autenticación por token de forma predeterminada, incluido el bucle local. Si no se configura ningún token, el inicio de la puerta de enlace genera uno automáticamente y lo guarda en `gateway.auth.token`, por lo que **los clientes WS locales deben autenticarse**. Esto impide que otros procesos locales llamen a la Gateway.

Si **realmente** desea un bucle local abierto, configure `gateway.auth.mode: "none"` explícitamente en su configuración. Doctor puede generar un token para usted en cualquier momento: `openclaw doctor --generate-gateway-token`.

### ¿Tengo que reiniciar después de cambiar la configuración?

La Gateway observa la configuración y admite la recarga en caliente:

- `gateway.reload.mode: "hybrid"` (predeterminado): aplica cambios seguros en caliente, reinicia para los críticos
- `hot`, `restart`, `off` también son compatibles

### ¿Cómo desactivo los lemas divertidos de la CLI?

Configure `cli.banner.taglineMode` en la configuración:

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `off`: oculta el texto del lema pero mantiene la línea de título/versión del banner.
- `default`: usa `All your chats, one OpenClaw.` cada vez.
- `random`: lemas divertidos/estacionales rotativos (comportamiento predeterminado).
- Si no quieres ningún banner, establece la variable de entorno `OPENCLAW_HIDE_BANNER=1`.

### ¿Cómo habilito la búsqueda web y la obtención web

`web_fetch` funciona sin una clave API. `web_search` requiere una clave para tu
proveedor seleccionado (Brave, Gemini, Grok, Kimi o Perplexity).
**Recomendado:** ejecuta `openclaw configure --section web` y elige un proveedor.
Alternativas de entorno:

- Brave: `BRAVE_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` o `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "BRAVE_API_KEY_HERE",
        maxResults: 5,
      },
      fetch: {
        enabled: true,
      },
    },
  },
}
```

Notas:

- Si usas listas permitidas, añade `web_search`/`web_fetch` o `group:web`.
- `web_fetch` está habilitado por defecto (a menos que se deshabilite explícitamente).
- Los demonios leen las variables de entorno de `~/.openclaw/.env` (o el entorno del servicio).

Documentación: [Herramientas web](/es/tools/web).

### ¿Cómo ejecuto una Pasarela central (Gateway) con trabajadores especializados en varios dispositivos

El patrón común es **una Pasarela central** (por ejemplo, Raspberry Pi) más **nodos** y **agentes**:

- **Pasarela (central):** posee los canales (Signal/WhatsApp), el enrutamiento y las sesiones.
- **Nodos (dispositivos):** Mac/iOS/Android se conectan como periféricos y exponen herramientas locales (`system.run`, `canvas`, `camera`).
- **Agentes (trabajadores):** cerebros/espacios de trabajo separados para roles especiales (por ejemplo, "operaciones de Hetzner", "datos personales").
- **Sub-agentes:** generan trabajo en segundo plano desde un agente principal cuando deseas paralelismo.
- **TUI:** conéctate a la Pasarela y cambia de agentes/sesiones.

Documentación: [Nodos](/es/nodes), [Acceso remoto](/es/gateway/remote), [Enrutamiento multiagente](/es/concepts/multi-agent), [Sub-agentes](/es/tools/subagents), [TUI](/es/web/tui).

### ¿Puede ejecutarse el navegador de OpenClaw en modo headless (sin interfaz gráfica)

Sí. Es una opción de configuración:

```json5
{
  browser: { headless: true },
  agents: {
    defaults: {
      sandbox: { browser: { headless: true } },
    },
  },
}
```

El valor predeterminado es `false` (con interfaz). El modo headless es más probable que active comprobaciones anti-bot en algunos sitios. Consulta [Navegador](/es/tools/browser).

Headless usa el **mismo motor de Chromium** y funciona para la mayor parte de la automatización (formularios, clics, scraping, inicios de sesión). Las principales diferencias:

- No hay una ventana de navegador visible (use capturas de pantalla si necesita elementos visuales).
- Algunos sitios son más estrictos con la automatización en modo headless (CAPTCHAs, anti-bot).
  Por ejemplo, X/Twitter a menudo bloquea las sesiones headless.

### ¿Cómo uso Brave para el control del navegador?

Establezca `browser.executablePath` en su binario de Brave (o cualquier navegador basado en Chromium) y reinicie el Gateway.
Vea los ejemplos completos de configuración en [Navegador](/es/tools/browser#use-brave-or-another-chromium-based-browser).

## Gateways y nodos remotos

### ¿Cómo se propagan los comandos entre Telegram, el gateway y los nodos?

Los mensajes de Telegram son manejados por el **gateway**. El gateway ejecuta el agente y
solo entonces llama a los nodos a través del **Gateway WebSocket** cuando se necesita una herramienta de nodo:

Telegram → Gateway → Agente → `node.*` → Nodo → Gateway → Telegram

Los nodos no ven el tráfico entrante del proveedor; solo reciben llamadas RPC de nodo.

### ¿Cómo puede mi agente acceder a mi computadora si el Gateway está alojado de forma remota?

Respuesta corta: **empareje su computadora como un nodo**. El Gateway se ejecuta en otro lugar, pero puede
llamar a herramientas `node.*` (pantalla, cámara, sistema) en su máquina local a través del WebSocket del Gateway.

Configuración típica:

1. Ejecute el Gateway en el host siempre activo (VPS/servidor doméstico).
2. Ponga el host del Gateway + su computadora en la misma tailnet.
3. Asegúrese de que el WS del Gateway sea accesible (enlace tailnet o túnel SSH).
4. Abra la aplicación de macOS localmente y conéctese en modo **Remoto a través de SSH** (o tailnet directa)
   para que pueda registrarse como un nodo.
5. Aprobar el nodo en el Gateway:

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

No se requiere un puente TCP separado; los nodos se conectan a través del WebSocket del Gateway.

Recordatorio de seguridad: emparejar un nodo macOS permite `system.run` en esa máquina. Solo
empareje dispositivos en los que confíe y revise [Seguridad](/es/gateway/security).

Documentación: [Nodos](/es/nodes), [Protocolo del Gateway](/es/gateway/protocol), [Modo remoto de macOS](/es/platforms/mac/remote), [Seguridad](/es/gateway/security).

### Tailscale está conectado pero no recibo respuestas ¿Qué ahora?

Verifique lo básico:

- El Gateway está ejecutándose: `openclaw gateway status`
- Estado del Gateway: `openclaw status`
- Estado del canal: `openclaw channels status`

A continuación, verifique la autenticación y el enrutamiento:

- Si usa Tailscale Serve, asegúrese de que `gateway.auth.allowTailscale` esté configurado correctamente.
- Si se conecta a través de un túnel SSH, confirme que el túnel local esté activo y apunte al puerto correcto.
- Confirme que sus listas de permitidos (DM o grupo) incluyen su cuenta.

Documentación: [Tailscale](/es/gateway/tailscale), [Acceso remoto](/es/gateway/remote), [Canales](/es/channels).

### ¿Pueden dos instancias de OpenClaw comunicarse entre sí (local, VPS)?

Sí. No hay un puente "bot-to-bot" integrado, pero puede configurarlo de algunas
formas confiables:

**Lo más sencillo:** use un canal de chat normal al que ambos bots puedan acceder (Telegram/Slack/WhatsApp).
Haga que el Bot A envíe un mensaje al Bot B y luego deje que el Bot B responda como de costumbre.

**Puente CLI (genérico):** ejecute un script que llame al otro Gateway con
`openclaw agent --message ... --deliver`, apuntando a un chat donde el otro bot
escuche. Si un bot está en un VPS remoto, apunte su CLI a ese Gateway remoto
vía SSH/Tailscale (consulte [Acceso remoto](/es/gateway/remote)).

Patrón de ejemplo (ejecutar desde una máquina que pueda alcanzar el Gateway de destino):

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

Consejo: añada una barrera de protección para que los dos bots no entren en un bucle infinito (solo menciones, listas de permitidos del canal o una regla de "no responder a mensajes de bots").

Documentación: [Acceso remoto](/es/gateway/remote), [CLI del Agente](/es/cli/agent), [Envío del Agente](/es/tools/agent-send).

### ¿Necesito VPS separados para múltiples agentes?

No. Un solo Gateway puede alojar múltiples agentes, cada uno con su propio espacio de trabajo, valores predeterminados de modelo
y enrutamiento. Esa es la configuración normal y es mucho más barata y sencilla que ejecutar
un VPS por agente.

Use VPS separados solo cuando necesite un aislamiento estricto (límites de seguridad) o configuraciones
muy diferentes que no desee compartir. De lo contrario, mantenga un Gateway y
use múltiples agentes o sub-agentes.

### ¿Hay algún beneficio en usar un nodo en mi laptop personal en lugar de SSH desde un VPS?

Sí: los nodos son la forma principal de alcanzar su laptop desde un Gateway remoto y desbloquean
más que el acceso al shell. El Gateway se ejecuta en macOS/Linux (Windows a través de WSL2) y es
ligero (un VPS pequeño o una caja de clase Raspberry Pi está bien; 4 GB de RAM son suficientes), por lo que una configuración
común es un host siempre activo más su laptop como nodo.

- **No se requiere SSH entrante.** Los nodos se conectan al WebSocket del Gateway y usan el emparejamiento de dispositivos.
- **Controles de ejecución más seguros.** `system.run` está limitado por listas de permitidos/aprobaciones de nodos en ese portátil.
- **Más herramientas de dispositivo.** Los nodos exponen `canvas`, `camera` y `screen` además de `system.run`.
- **Automatización del navegador local.** Mantén el Gateway en un VPS, pero ejecuta Chrome localmente y retransmite el control
  con la extensión de Chrome + un host de nodo en el portátil.

SSH está bien para el acceso ad-hoc al shell, pero los nodos son más simples para los flujos de trabajo continuos del agente y la
automatización de dispositivos.

Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Extensión de Chrome](/es/tools/chrome-extension).

### ¿Debo instalar en un segundo portátil o simplemente agregar un nodo

Si solo necesitas **herramientas locales** (pantalla/cámara/ejecución) en el segundo portátil, agrégalo como un
**nodo**. Eso mantiene un solo Gateway y evita configuración duplicada. Las herramientas de nodo locales son
actualmente solo para macOS, pero planeamos extenderlas a otros sistemas operativos.

Instala un segundo Gateway solo cuando necesites **aislamiento total** o dos bots completamente separados.

Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Múltiples gateways](/es/gateway/multiple-gateways).

### ¿Los nodos ejecutan un servicio gateway?

No. Solo debería ejecutarse **un gateway** por host, a menos que ejecutes intencionalmente perfiles aislados (consulta [Múltiples gateways](/es/gateway/multiple-gateways)). Los nodos son periféricos que se conectan
al gateway (nodos iOS/Android, o modo "nodo" de macOS en la aplicación de la barra de menús). Para hosts de nodo
sin interfaz gráfica y control por CLI, consulta [CLI de host de nodo](/es/cli/node).

Se requiere un reinicio completo para los cambios de `gateway`, `discovery` y `canvasHost`.

### ¿Existe una forma RPC de API para aplicar la configuración?

Sí. `config.apply` valida + escribe la configuración completa y reinicia el Gateway como parte de la operación.

### configapply borró mi configuración ¿Cómo me recupero y evito esto?

`config.apply` reemplaza la **configuración completa**. Si envías un objeto parcial, todo lo demás se elimina.

Recuperar:

- Restaurar desde una copia de seguridad (git o una copiada `~/.openclaw/openclaw.json`).
- Si no tienes copia de seguridad, vuelve a ejecutar `openclaw doctor` y reconfigura los canales/modelos.
- Si esto fue inesperado, informa de un error e incluye tu última configuración conocida o cualquier copia de seguridad.
- Un agente de programación local a menudo puede reconstruir una configuración funcional a partir de registros o historial.

Evítalo:

- Usa `openclaw config set` para cambios pequeños.
- Usa `openclaw configure` para ediciones interactivas.

Documentos: [Config](/es/cli/config), [Configure](/es/cli/configure), [Doctor](/es/gateway/doctor).

### ¿Cuál es una configuración mínima sensata para una primera instalación

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

Esto configura tu espacio de trabajo y restringe quién puede activar el bot.

### ¿Cómo configuro Tailscale en un VPS y me conecto desde mi Mac

Pasos mínimos:

1. **Instalar + iniciar sesión en el VPS**

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. **Instalar + iniciar sesión en tu Mac**
   - Usa la aplicación Tailscale e inicia sesión en la misma tailnet.
3. **Habilitar MagicDNS (recomendado)**
   - En la consola de administración de Tailscale, habilita MagicDNS para que el VPS tenga un nombre estable.
4. **Usar el nombre de host de la tailnet**
   - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

Si quieres la interfaz de usuario de Control sin SSH, usa Tailscale Serve en el VPS:

```bash
openclaw gateway --tailscale serve
```

Esto mantiene el enlace vinculado al bucle local (loopback) y expone HTTPS a través de Tailscale. Consulta [Tailscale](/es/gateway/tailscale).

### ¿Cómo conecto un nodo Mac a un Gateway remoto Tailscale Serve

Serve expone la **interfaz de usuario de Control del Gateway + WS**. Los nodos se conectan a través del mismo punto final WS del Gateway.

Configuración recomendada:

1. **Asegúrate de que el VPS + Mac estén en la misma tailnet**.
2. **Usa la aplicación macOS en modo remoto** (el destino SSH puede ser el nombre de host de la tailnet).
   La aplicación tunelizará el puerto del Gateway y se conectará como un nodo.
3. **Aprobar el nodo** en el enlace:

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

Documentos: [Gateway protocol](/es/gateway/protocol), [Discovery](/es/gateway/discovery), [macOS remote mode](/es/platforms/mac/remote).

## Variables de entorno y carga de .env

### ¿Cómo carga OpenClaw las variables de entorno

OpenClaw lee las variables de entorno del proceso principal (shell, launchd/systemd, CI, etc.) y additionally carga:

- `.env` desde el directorio de trabajo actual
- un `.env` de respaldo global desde `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`)

Ningún archivo `.env` anula las variables de entorno existentes.

También puedes definir variables de entorno en línea en la configuración (se aplican solo si faltan en el entorno del proceso):

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

Consulta [/environment](/es/help/environment) para obtener la precedencia completa y las fuentes.

### Inicié la puerta de enlace a través del servicio y mis variables de entorno desaparecieron ¿Qué hago ahora

Dos correcciones comunes:

1. Pon las claves faltantes en `~/.openclaw/.env` para que se detecten incluso cuando el servicio no herede el entorno de tu shell.
2. Habilitar la importación de shell (comodidad opcional):

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

Esto ejecuta tu shell de inicio de sesión e importa solo las claves esperadas que faltan (nunca anula). Equivalentes de variables de entorno:
`OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

### Establecí COPILOTGITHUBTOKEN pero el estado de los modelos muestra Shell env desactivado Por qué

`openclaw models status` indica si la **importación del entorno de shell** está habilitada. "Shell env: off"
**no** significa que falten tus variables de entorno; solo significa que OpenClaw no cargará
tu shell de inicio de sesión automáticamente.

Si la puerta de enlace se ejecuta como servicio (launchd/systemd), no heredará tu entorno
de shell. Solución haciendo una de estas cosas:

1. Pon el token en `~/.openclaw/.env`:

   ```
   COPILOT_GITHUB_TOKEN=...
   ```

2. O habilita la importación de shell (`env.shellEnv.enabled: true`).
3. O agrégalo a tu bloque `env` de configuración (se aplica solo si falta).

Luego reinicia la puerta de enlace y vuelve a verificar:

```bash
openclaw models status
```

Los tokens de Copilot se leen desde `COPILOT_GITHUB_TOKEN` (también `GH_TOKEN` / `GITHUB_TOKEN`).
Consulta [/concepts/model-providers](/es/concepts/model-providers) y [/environment](/es/help/environment).

## Sesiones y múltiples chats

### ¿Cómo inicio una conversación nueva

Envía `/new` o `/reset` como un mensaje independiente. Consulta [Gestión de sesiones](/es/concepts/session).

### ¿Las sesiones se restablecen automáticamente si nunca envío mensajes nuevos

Sí. Las sesiones expiran después de `session.idleMinutes` (predeterminado **60**). El **siguiente**
mensaje inicia un nuevo id de sesión para esa clave de chat. Esto no elimina
las transcripciones; solo inicia una nueva sesión.

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### ¿Hay alguna forma de crear un equipo de instancias de OpenClaw con un CEO y muchos agentes?

Sí, mediante el **enrutamiento multi-agente** y los **sub-agentes**. Puede crear un agente coordinador
y varios agentes de trabajo con sus propios espacios de trabajo y modelos.

Dicho esto, esto es mejor visto como un **experimento divertido**. Es intensivo en tokens y, a menudo,
menos eficiente que usar un bot con sesiones separadas. El modelo típico que
imaginamos es un bot con el que hablas, con diferentes sesiones para trabajo paralelo. Ese
bot también puede generar sub-agentes cuando sea necesario.

Documentación: [Enrutamiento multi-agente](/es/concepts/multi-agent), [Sub-agentes](/es/tools/subagents), [CLI de agentes](/es/cli/agents).

### ¿Por qué se truncó el contexto a mitad de tarea? ¿Cómo puedo evitarlo?

El contexto de la sesión está limitado por la ventana del modelo. Los chats largos, las grandes salidas de herramientas o muchos
archivos pueden activar la compactación o el truncamiento.

Lo que ayuda:

- Pídale al bot que resuma el estado actual y lo escriba en un archivo.
- Use `/compact` antes de tareas largas, y `/new` al cambiar de tema.
- Mantenga el contexto importante en el espacio de trabajo y pídale al bot que lo lea de nuevo.
- Use sub-agentes para trabajos largos o paralelos para que el chat principal se mantenga más pequeño.
- Elija un modelo con una ventana de contexto más grande si esto sucede a menudo.

### ¿Cómo restablezco completamente OpenClaw pero lo mantengo instalado?

Use el comando de restablecimiento:

```bash
openclaw reset
```

Restablecimiento completo no interactivo:

```bash
openclaw reset --scope full --yes --non-interactive
```

Luego vuelva a ejecutar la incorporación:

```bash
openclaw onboard --install-daemon
```

Notas:

- El asistente de incorporación también ofrece **Restablecer** si ve una configuración existente. Consulte [Asistente](/es/start/wizard).
- Si usó perfiles (`--profile` / `OPENCLAW_PROFILE`), restablezca cada directorio de estado (los predeterminados son `~/.openclaw-<profile>`).
- Restablecimiento de desarrollo: `openclaw gateway --dev --reset` (solo desarrollo; borra la configuración de desarrollo + credenciales + sesiones + espacio de trabajo).

### Estoy obteniendo errores de contexto demasiado grande, ¿cómo restablezco o compacto?

Use uno de estos:

- **Compactar** (mantiene la conversación pero resume turnos anteriores):

  ```
  /compact
  ```

  o `/compact <instructions>` para guiar el resumen.

- **Restablecer** (ID de sesión nuevo para la misma clave de chat):

  ```
  /new
  /reset
  ```

Si sigue sucediendo:

- Habilite o ajuste la **poda de sesión** (`agents.defaults.contextPruning`) para recortar la salida antigua de herramientas.
- Use un modelo con una ventana de contexto más grande.

Documentación: [Compactación](/es/concepts/compaction), [Poda de sesiones](/es/concepts/session-pruning), [Gestión de sesiones](/es/concepts/session).

### ¿Por qué veo "LLM request rejected: messages.content.tool_use.input field required"?

Este es un error de validación del proveedor: el modelo emitió un bloque `tool_use` sin el `input` requerido.
Generalmente significa que el historial de la sesión está obsoleto o corrupto (a menudo después de hilos largos
o un cambio en la herramienta/esquema).

Solución: inicia una sesión nueva con `/new` (mensaje independiente).

### Por qué recibo mensajes de latido cada 30 minutos

Los latidos se ejecutan cada **30m** por defecto. Ajusta o desactívalos:

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "2h", // or "0m" to disable
      },
    },
  },
}
```

Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados
de markdown como `# Heading`), OpenClaw omite la ejecución del latido para ahorrar llamadas a la API.
Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.

Las anulaciones por agente usan `agents.list[].heartbeat`. Documentación: [Latido](/es/gateway/heartbeat).

### ¿Necesito añadir una cuenta de bot a un grupo de WhatsApp?

No. OpenClaw se ejecuta en **tu propia cuenta**, por lo que si estás en el grupo, OpenClaw puede verlo.
Por defecto, las respuestas grupales están bloqueadas hasta que permitas remitentes (`groupPolicy: "allowlist"`).

Si quieres que solo **tú** puedas activar las respuestas grupales:

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

### ¿Cómo obtengo el JID de un grupo de WhatsApp?

Opción 1 (la más rápida): sigue los registros y envía un mensaje de prueba en el grupo:

```bash
openclaw logs --follow --json
```

Busca `chatId` (o `from`) que termine en `@g.us`, como:
`1234567890-1234567890@g.us`.

Opción 2 (si ya está configurado/en lista blanca): enumera los grupos desde la configuración:

```bash
openclaw directory groups list --channel whatsapp
```

Documentación: [WhatsApp](/es/channels/whatsapp), [Directorio](/es/cli/directory), [Registros](/es/cli/logs).

### ¿Por qué no responde OpenClaw en un grupo?

Dos causas comunes:

- El filtrado de menciones está activado (por defecto). Debes @mencionar al bot (o coincidir con `mentionPatterns`).
- Configuraste `channels.whatsapp.groups` sin `"*"` y el grupo no está en la lista blanca.

Consulte [Grupos](/es/channels/groups) y [Mensajes de grupo](/es/channels/group-messages).

### ¿Los grupos/hilos comparten el contexto con los MD?

Los chats directos se contraen a la sesión principal por defecto. Los grupos/canales tienen sus propias claves de sesión, y los temas de Telegram / los hilos de Discord son sesiones separadas. Consulte [Grupos](/es/channels/groups) y [Mensajes de grupo](/es/channels/group-messages).

### ¿Cuántos espacios de trabajo y agentes puedo crear?

Sin límites estrictos. Docenas (incluso cientos) están bien, pero vigile lo siguiente:

- **Crecimiento del disco:** las sesiones + las transcripciones se guardan en `~/.openclaw/agents/<agentId>/sessions/`.
- **Costo de tokens:** más agentes significan más uso concurrente del modelo.
- **Sobrecarga operativa:** perfiles de autenticación por agente, espacios de trabajo y enrutamiento de canales.

Consejos:

- Mantenga un espacio de trabajo **activo** por agente (`agents.defaults.workspace`).
- Pode las sesiones antiguas (elimine archivos JSONL o entradas de almacenamiento) si el disco crece.
- Use `openclaw doctor` para detectar espacios de trabajo huérfanos y discordancias de perfiles.

### ¿Puedo ejecutar varios bots o chats al mismo tiempo en Slack y cómo debería configurarlo?

Sí. Use **Enrutamiento multiagente** para ejecutar varios agentes aislados y enrutar los mensajes entrantes por
canal/cuenta/par. Slack es compatible como canal y se puede vincular a agentes específicos.

El acceso del navegador es potente, pero no "hacer cualquier cosa que un humano pueda"; el anti-bot, los CAPTCHAs y el MFA aún pueden
bloquear la automatización. Para el control del navegador más confiable, use el relé de la extensión de Chrome
en la máquina que ejecuta el navegador (y mantenga la Gateway en cualquier lugar).

Configuración recomendada:

- Anfitrión de Gateway siempre activo (VPS/Mac mini).
- Un agente por rol (vinculaciones).
- Canal(es) de Slack vinculados a esos agentes.
- Navegador local a través del relé de la extensión (o un nodo) cuando sea necesario.

Documentación: [Enrutamiento multiagente](/es/concepts/multi-agent), [Slack](/es/channels/slack),
[Navegador](/es/tools/browser), [Extensión de Chrome](/es/tools/chrome-extension), [Nodos](/es/nodes).

## Modelos: valores predeterminados, selección, alias, cambio

### ¿Cuál es el modelo predeterminado?

El modelo predeterminado de OpenClaw es lo que configure como:

```
agents.defaults.model.primary
```

Los modelos se referencian como `provider/model` (ejemplo: `anthropic/claude-opus-4-6`). Si omites el proveedor, OpenClaw actualmente asume `anthropic` como un respaldo temporal por obsolescencia, pero aún debes establecer `provider/model` de forma **explícita**.

### Qué modelo recomiendas

**Predeterminado recomendado:** usa el modelo más potente de última generación disponible en tu pila de proveedores.
**Para agentes con herramientas habilitadas o entradas no confiables:** prioriza la potencia del modelo sobre el costo.
**Para chat rutinario o de bajo riesgo:** usa modelos de respaldo más económicos y enruta según el rol del agente.

MiniMax M2.5 tiene su propia documentación: [MiniMax](/es/providers/minimax) y
[Modelos locales](/es/gateway/local-models).

Regla general: usa el **mejor modelo que puedas permitir** para trabajo de alto riesgo y un modelo más económico para chat rutinario o resúmenes. Puedes enrutar modelos por agente y usar sub-agentes para paralelizar tareas largas (cada sub-agente consume tokens). Consulta [Modelos](/es/concepts/models) y
[Sub-agentes](/es/tools/subagents).

Advertencia importante: los modelos más débiles o sobre-cuantizados son más vulnerables a la inyección de prompts y comportamientos inseguros. Consulta [Seguridad](/es/gateway/security).

Más contexto: [Modelos](/es/concepts/models).

### ¿Puedo usar modelos autoalojados llamacpp vLLM Ollama

Sí. Ollama es la ruta más fácil para modelos locales.

Configuración más rápida:

1. Instala Ollama desde `https://ollama.com/download`
2. Descarga un modelo local como `ollama pull glm-4.7-flash`
3. Si también quieres Ollama Cloud, ejecuta `ollama signin`
4. Ejecuta `openclaw onboard` y elige `Ollama`
5. Elige `Local` o `Cloud + Local`

Notas:

- `Cloud + Local` te proporciona modelos de Ollama Cloud además de tus modelos locales de Ollama
- los modelos en la nube como `kimi-k2.5:cloud` no necesitan una descarga local
- para cambiar manualmente, usa `openclaw models list` y `openclaw models set ollama/<model>`

Nota de seguridad: los modelos más pequeños o muy cuantificados son más vulnerables a la inyección de prompts. Recomendamos encarecidamente **modelos grandes** para cualquier bot que pueda usar herramientas. Si aún deseas usar modelos pequeños, activa el sandboxing y listas de permitidos estrictas para herramientas.

Documentación: [Ollama](/es/providers/ollama), [Modelos locales](/es/gateway/local-models),
[Proveedores de modelos](/es/concepts/model-providers), [Seguridad](/es/gateway/security),
[Sandboxing](/es/gateway/sandboxing).

### ¿Cómo cambio de modelos sin borrar mi configuración

Usa **comandos de modelo** o edita solo los campos del **modelo**. Evita reemplazos completos de la configuración.

Opciones seguras:

- `/model` en el chat (rápido, por sesión)
- `openclaw models set ...` (actualiza solo la configuración del modelo)
- `openclaw configure --section model` (interactivo)
- edita `agents.defaults.model` en `~/.openclaw/openclaw.json`

Evita `config.apply` con un objeto parcial a menos que tengas la intención de reemplazar toda la configuración.
Si sobreescribiste la configuración, restaura desde una copia de seguridad o vuelve a ejecutar `openclaw doctor` para reparar.

Documentación: [Modelos](/es/concepts/models), [Configurar](/es/cli/configure), [Config](/es/cli/config), [Doctor](/es/gateway/doctor).

### ¿Qué usan OpenClaw, Flawd y Krill para los modelos

- Estos despliegues pueden diferir y pueden cambiar con el tiempo; no hay una recomendación fija de proveedor.
- Comprueba la configuración de runtime actual en cada puerta de enlace con `openclaw models status`.
- Para agentes sensibles a la seguridad o con herramientas activadas, usa el modelo más potente de la última generación disponible.

### ¿Cómo cambio de modelos al vuelo sin reiniciar

Usa el comando `/model` como un mensaje independiente:

```
/model sonnet
/model haiku
/model opus
/model gpt
/model gpt-mini
/model gemini
/model gemini-flash
```

Puedes listar los modelos disponibles con `/model`, `/model list` o `/model status`.

`/model` (y `/model list`) muestran un selector numerado compacto. Selecciona por número:

```
/model 3
```

También puedes forzar un perfil de autenticación específico para el proveedor (por sesión):

```
/model opus@anthropic:default
/model opus@anthropic:work
```

Consejo: `/model status` muestra qué agente está activo, qué archivo `auth-profiles.json` se está utilizando y qué perfil de autenticación se probará a continuación.
También muestra el punto de conexión del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando están disponibles.

**¿Cómo puedo desanclar un perfil que configuré con profile**

Vuelva a ejecutar `/model` **sin** el sufijo `@profile`:

```
/model anthropic/claude-opus-4-6
```

Si desea volver al valor predeterminado, selecciónelo desde `/model` (o envíe `/model <default provider/model>`).
Use `/model status` para confirmar qué perfil de autenticación está activo.

### ¿Puedo usar GPT 5.2 para tareas diarias y Codex 5.3 para programar

Sí. Establezca uno como predeterminado y cambie según sea necesario:

- **Cambio rápido (por sesión):** `/model gpt-5.2` para tareas diarias, `/model openai-codex/gpt-5.4` para programar con Codex OAuth.
- **Predeterminado + cambio:** establezca `agents.defaults.model.primary` en `openai/gpt-5.2`, luego cambie a `openai-codex/gpt-5.4` cuando esté programando (o viceversa).
- **Subagentes:** envíe las tareas de programación a subagentes con un modelo predeterminado diferente.

Consulte [Modelos](/es/concepts/models) y [Comandos de barra diagonal](/es/tools/slash-commands).

### ¿Por qué veo Modelo no permitido y luego ninguna respuesta

Si `agents.defaults.models` está configurado, se convierte en la **lista de permitidos** para `/model` y cualquier
anulación de sesión. Al elegir un modelo que no está en esa lista, se devuelve:

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Ese error se devuelve **en lugar de** una respuesta normal. Solución: agregue el modelo a
`agents.defaults.models`, elimine la lista de permitidos, o elija un modelo de `/model list`.

### ¿Por qué veo Modelo desconocido minimaxMiniMaxM25

Esto significa que el **proveedor no está configurado** (no se encontró ninguna configuración de proveedor de MiniMax ni perfil de autenticación),
por lo que no se puede resolver el modelo. Una solución para esta detección está
en **2026.1.12** (no lanzado en el momento de escribir esto).

Lista de verificación de soluciones:

1. Actualice a **2026.1.12** (o ejecute desde el código fuente `main`), luego reinicie la puerta de enlace.
2. Asegúrese de que MiniMax esté configurado (asistente o JSON), o de que exista una clave de API de MiniMax
   en perfiles env/auth para que se pueda inyectar el proveedor.
3. Use el ID exacto del modelo (distingue mayúsculas y minúsculas): `minimax/MiniMax-M2.5` o
   `minimax/MiniMax-M2.5-highspeed`.
4. Ejecute:

   ```bash
   openclaw models list
   ```

   y seleccione de la lista (o `/model list` en el chat).

Consulte [MiniMax](/es/providers/minimax) y [Modelos](/es/concepts/models).

### ¿Puedo usar MiniMax como predeterminado y OpenAI para tareas complejas?

Sí. Use **MiniMax como el predeterminado** y cambie de modelos **por sesión** cuando sea necesario.
Los respaldos (fallbacks) son para **errores**, no para "tareas difíciles", así que use `/model` o un agente separado.

**Opción A: cambiar por sesión**

```json5
{
  env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.5" },
      models: {
        "minimax/MiniMax-M2.5": { alias: "minimax" },
        "openai/gpt-5.2": { alias: "gpt" },
      },
    },
  },
}
```

Entonces:

```
/model gpt
```

**Opción B: agentes separados**

- Agente A predeterminado: MiniMax
- Agente B predeterminado: OpenAI
- Enrutamiento por agente o use `/agent` para cambiar

Documentación: [Modelos](/es/concepts/models), [Enrutamiento multiagente](/es/concepts/multi-agent), [MiniMax](/es/providers/minimax), [OpenAI](/es/providers/openai).

### ¿Son opus sonnet gpt accesos directos integrados?

Sí. OpenClaw incluye algunos atajos predeterminados (solo se aplican cuando el modelo existe en `agents.defaults.models`):

- `opus` → `anthropic/claude-opus-4-6`
- `sonnet` → `anthropic/claude-sonnet-4-6`
- `gpt` → `openai/gpt-5.4`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3.1-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`
- `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

Si configura su propio alias con el mismo nombre, su valor prevalece.

### ¿Cómo defino/anulo los atajos/alias de los modelos?

Los alias provienen de `agents.defaults.models.<modelId>.alias`. Ejemplo:

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "anthropic/claude-sonnet-4-5": { alias: "sonnet" },
        "anthropic/claude-haiku-4-5": { alias: "haiku" },
      },
    },
  },
}
```

Entonces `/model sonnet` (o `/<alias>` cuando sea compatible) se resuelve a ese ID de modelo.

### ¿Cómo agrego modelos de otros proveedores como OpenRouter o ZAI?

OpenRouter (pago por token; muchos modelos):

```json5
{
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" },
      models: { "openrouter/anthropic/claude-sonnet-4-5": {} },
    },
  },
  env: { OPENROUTER_API_KEY: "sk-or-..." },
}
```

Z.AI (modelos GLM):

```json5
{
  agents: {
    defaults: {
      model: { primary: "zai/glm-5" },
      models: { "zai/glm-5": {} },
    },
  },
  env: { ZAI_API_KEY: "..." },
}
```

Si hace referencia a un proveedor/modelo pero falta la clave del proveedor requerida, obtendrá un error de autenticación en tiempo de ejecución (p. ej., `No API key found for provider "zai"`).

**No se encontró ninguna clave de API para el proveedor después de agregar un nuevo agente**

Esto generalmente significa que el **nuevo agente** tiene un almacén de autenticación vacío. La autenticación es por agente y se almacena en:

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Opciones de solución:

- Ejecute `openclaw agents add <id>` y configure la autenticación durante el asistente.
- O copie `auth-profiles.json` del `agentDir` del agente principal al `agentDir` del nuevo agente.

**No** reutilice `agentDir` entre agentes; esto causa colisiones de autenticación/sesión.

## Conmutación por error de modelo y "All models failed"

### Cómo funciona la conmutación por error

La conmutación por error ocurre en dos etapas:

1. **Rotación del perfil de autenticación** dentro del mismo proveedor.
2. **Respaldo de modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

Se aplican tiempos de espera a los perfiles que fallan (retroceso exponencial), por lo que OpenClaw puede seguir respondiendo incluso cuando un proveedor tiene límites de velocidad o fallas temporales.

### Qué significa este error

```
No credentials found for profile "anthropic:default"
```

Significa que el sistema intentó utilizar el ID de perfil de autenticación `anthropic:default`, pero no pudo encontrar credenciales para él en el almacén de autenticación esperado.

### Lista de verificación para No credentials found for profile anthropicdefault

- **Confirmar dónde residen los perfiles de autenticación** (rutas nuevas vs. heredadas)
  - Actual: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - Heredado: `~/.openclaw/agent/*` (migrado por `openclaw doctor`)
- **Confirmar que su variable de entorno es cargada por el Gateway**
  - Si establece `ANTHROPIC_API_KEY` en su shell pero ejecuta el Gateway a través de systemd/launchd, es posible que no la herede. Póngala en `~/.openclaw/.env` o habilite `env.shellEnv`.
- **Asegúrese de estar editando el agente correcto**
  - Las configuraciones de múltiples agentes significan que puede haber varios archivos `auth-profiles.json`.
- **Verificación de estado del modelo/autenticación**
  - Use `openclaw models status` para ver los modelos configurados y si los proveedores están autenticados.

**Lista de verificación para No credentials found for profile anthropic**

Esto significa que la ejecución está fijada a un perfil de autenticación de Anthropic, pero el Gateway no puede encontrarlo en su almacén de autenticación.

- **Usar un token de configuración**
  - Ejecute `claude setup-token`, luego péguelo con `openclaw models auth setup-token --provider anthropic`.
  - Si el token fue creado en otra máquina, use `openclaw models auth paste-token --provider anthropic`.
- **Si desea utilizar una clave API en su lugar**
  - Pon `ANTHROPIC_API_KEY` en `~/.openclaw/.env` en el **host de puerta de enlace**.
  - Borra cualquier orden anclada que fuerce un perfil que falta:

    ```bash
    openclaw models auth order clear --provider anthropic
    ```

- **Confirma que estás ejecutando los comandos en el host de puerta de enlace**
  - En modo remoto, los perfiles de autenticación residen en la máquina de puerta de enlace, no en tu portátil.

### ¿Por qué también intentó Google Gemini y falló?

Si la configuración de tu modelo incluye Google Gemini como respaldo (o cambiaste a un atajo de Gemini), OpenClaw lo intentará durante el respaldo del modelo. Si no has configurado las credenciales de Google, verás `No API key found for provider "google"`.

Solución: proporciona la autenticación de Google, o elimina/evita los modelos de Google en `agents.defaults.model.fallbacks` / alias para que el respaldo no enrute allí.

**Mensaje de solicitud de LLM rechazada pensando que se requiere firma google antigravity**

Causa: el historial de la sesión contiene **bloques de pensamiento sin firmas** (a menudo de
una transmisión abortada/parcial). Google Antigravity requiere firmas para los bloques de pensamiento.

Solución: OpenClaw ahora elimina los bloques de pensamiento sin firmar para Google Antigravity Claude. Si aún aparece, inicia una **nueva sesión** o establece `/thinking off` para ese agente.

## Perfiles de autenticación: qué son y cómo gestionarlos

Relacionado: [/concepts/oauth](/es/concepts/oauth) (flujo de OAuth, almacenamiento de tokens, patrones multicuenta)

### ¿Qué es un perfil de autenticación?

Un perfil de autenticación es un registro de credenciales con nombre (OAuth o clave de API) vinculado a un proveedor. Los perfiles residen en:

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### ¿Cuáles son los ID de perfil típicos?

OpenClaw usa ID con prefijo de proveedor como:

- `anthropic:default` (común cuando no existe una identidad de correo electrónico)
- `anthropic:<email>` para identidades OAuth
- ID personalizados que elijas (ej. `anthropic:work`)

### ¿Puedo controlar qué perfil de autenticación se intenta primero?

Sí. La configuración admite metadatos opcionales para los perfiles y un orden por proveedor (`auth.order.<provider>`). Esto **no** almacena secretos; mapea ID a proveedor/modo y establece el orden de rotación.

OpenClaw puede omitir temporalmente un perfil si está en un estado de **enfriamiento** corto (límites de tasa/tiempos de espera/fallos de autenticación) o en un estado **deshabilitado** más largo (facturación/créditos insuficientes). Para inspeccionar esto, ejecuta `openclaw models status --json` y verifica `auth.unusableProfiles`. Ajuste: `auth.cooldowns.billingBackoffHours*`.

También puedes establecer una anulación de orden **por agente** (almacenada en `auth-profiles.json` de ese agente) a través de la CLI:

```bash
# Defaults to the configured default agent (omit --agent)
openclaw models auth order get --provider anthropic

# Lock rotation to a single profile (only try this one)
openclaw models auth order set --provider anthropic anthropic:default

# Or set an explicit order (fallback within provider)
openclaw models auth order set --provider anthropic anthropic:work anthropic:default

# Clear override (fall back to config auth.order / round-robin)
openclaw models auth order clear --provider anthropic
```

Para apuntar a un agente específico:

```bash
openclaw models auth order set --provider anthropic --agent main anthropic:default
```

### OAuth vs API key ¿cuál es la diferencia

OpenClaw soporta ambos:

- **OAuth** a menudo aprovecha el acceso por suscripción (cuando corresponde).
- **Las API keys** usan facturación por token.

El asistente soporta explícitamente el token de configuración de Anthropic y OAuth de OpenAI Codex, y puede almacenar API keys para ti.

## Gateway: puertos, "ya se está ejecutando" y modo remoto

### ¿Qué puerto usa el Gateway?

`gateway.port` controla el único puerto multiplexado para WebSocket + HTTP (Interfaz de usuario de control, hooks, etc.).

Precedencia:

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### ¿Por qué openclaw gateway status dice que el Runtime se está ejecutando pero la sonda RPC falló?

Porque "running" es la vista del **supervisor** (launchd/systemd/schtasks). La sonda RPC es la CLI conectándose realmente al WebSocket del gateway y llamando a `status`.

Usa `openclaw gateway status` y confía en estas líneas:

- `Probe target:` (la URL que la sonda realmente usó)
- `Listening:` (lo que realmente está enlazado en el puerto)
- `Last gateway error:` (causa raíz común cuando el proceso está vivo pero el puerto no está escuchando)

### ¿Por qué openclaw gateway status muestra Config cli y Config service diferentes?

Estás editando un archivo de configuración mientras el servicio está ejecutando otro (a menudo una discrepancia de `--profile` / `OPENCLAW_STATE_DIR`).

Solución:

```bash
openclaw gateway install --force
```

Ejecuta eso desde el mismo `--profile` / entorno que quieras que use el servicio.

### ¿Qué significa que otra instancia del gateway ya está escuchando?

OpenClaw aplica un bloqueo de tiempo de ejecución vinculando el escucha WebSocket inmediatamente al inicio (por defecto `ws://127.0.0.1:18789`). Si el enlace falla con `EADDRINUSE`, lanza `GatewayLockError` indicando que otra instancia ya está escuchando.

Solución: detén la otra instancia, libera el puerto o ejecuta con `openclaw gateway --port <port>`.

### ¿Cómo ejecuto OpenClaw en modo remoto (el cliente se conecta a un Gateway en otro lugar)?

Establece `gateway.mode: "remote"` y apunta a una URL de WebSocket remota, opcionalmente con un token/contraseña:

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://gateway.tailnet:18789",
      token: "your-token",
      password: "your-password",
    },
  },
}
```

Notas:

- `openclaw gateway` solo se inicia cuando `gateway.mode` es `local` (o pasas la marca de anulación).
- La aplicación de macOS vigila el archivo de configuración y cambia los modos en tiempo real cuando estos valores cambian.

### La Interfaz de Control (Control UI) indica no autorizado o sigue reconectando ¿Qué hacer ahora

Tu gateway se está ejecutando con autenticación habilitada (`gateway.auth.*`), pero la interfaz de usuario no está enviando el token/contraseña coincidente.

Datos (desde el código):

- La Interfaz de Control mantiene el token en `sessionStorage` para la sesión actual de la pestaña del navegador y la URL del gateway seleccionada, por lo que las actualizaciones en la misma pestaña siguen funcionando sin restaurar la persistencia del token a largo plazo en localStorage.
- En `AUTH_TOKEN_MISMATCH`, los clientes de confianza pueden intentar un reintento limitado con un token de dispositivo en caché cuando el gateway devuelve sugerencias de reintento (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).

Solución:

- Lo más rápido: `openclaw dashboard` (imprime + copia la URL del panel de control, intenta abrirla; muestra una sugerencia SSH si no hay interfaz gráfica).
- Si aún no tienes un token: `openclaw doctor --generate-gateway-token`.
- Si es remoto, crea un túnel primero: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abre `http://127.0.0.1:18789/`.
- Establece `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en el host del gateway.
- En la configuración de la Interfaz de Control, pega el mismo token.
- Si la discrepancia persiste después del único reintento, rota/vuelve a aprobar el token del dispositivo emparejado:
  - `openclaw devices list`
  - `openclaw devices rotate --device <id> --role operator`
- ¿Sigues atascado? Ejecuta `openclaw status --all` y sigue [Solución de problemas](/es/gateway/troubleshooting). Consulta [Panel de control](/es/web/dashboard) para detalles de autenticación.

### Establecí el enlace del gateway a tailnet pero no puede enlazar nada escucha

El enlace `tailnet` elige una IP de Tailscale de tus interfaces de red (100.64.0.0/10). Si la máquina no está en Tailscale (o la interfaz está caída), no hay nada a lo que enlazar.

Solución:

- Inicia Tailscale en ese host (para que tenga una dirección 100.x), o
- Cambia a `gateway.bind: "loopback"` / `"lan"`.

Nota: `tailnet` es explícito. `auto` prefiere el bucle local (loopback); usa `gateway.bind: "tailnet"` cuando quieras un enlace exclusivo de tailnet.

### ¿Puedo ejecutar varios Gateways en el mismo host

Por lo general no: un Gateway puede ejecutar múltiples canales de mensajería y agentes. Use varios Gateways solo cuando necesite redundancia (ej: bot de rescate) o aislamiento estricto.

Sí, pero debe aislar:

- `OPENCLAW_CONFIG_PATH` (configuración por instancia)
- `OPENCLAW_STATE_DIR` (estado por instancia)
- `agents.defaults.workspace` (aislamiento del espacio de trabajo)
- `gateway.port` (puertos únicos)

Configuración rápida (recomendado):

- Use `openclaw --profile <name> …` por instancia (crea automáticamente `~/.openclaw-<name>`).
- Establezca un `gateway.port` único en cada configuración de perfil (o pase `--port` para ejecuciones manuales).
- Instale un servicio por perfil: `openclaw --profile <name> gateway install`.

Los perfiles también sufijan los nombres de los servicios (`ai.openclaw.<profile>`; heredado `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
Guía completa: [Múltiples gateways](/es/gateway/multiple-gateways).

### ¿Qué significa el código de handshake no válido 1008

El Gateway es un servidor **WebSocket**, y espera que el primer mensaje
sea un marco `connect`. Si recibe cualquier otra cosa, cierra la conexión
con el **código 1008** (violación de política).

Causas comunes:

- Abrió la URL **HTTP** en un navegador (`http://...`) en lugar de un cliente WS.
- Usó el puerto o la ruta incorrectos.
- Un proxy o túnel eliminó los encabezados de autenticación o envió una solicitud que no es del Gateway.

Soluciones rápidas:

1. Use la URL WS: `ws://<host>:18789` (o `wss://...` si es HTTPS).
2. No abra el puerto WS en una pestaña normal del navegador.
3. Si la autenticación está activada, incluya el token/contraseña en el marco `connect`.

Si está usando la CLI o la TUI, la URL debería verse así:

```
openclaw tui --url ws://<host>:18789 --token <token>
```

Detalles del protocolo: [Protocolo Gateway](/es/gateway/protocol).

## Registro y depuración

### Dónde están los registros

Registros de archivo (estructurados):

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Puede establecer una ruta estable a través de `logging.file`. El nivel de registro de archivo se controla mediante `logging.level`. La verbosidad de la consola se controla mediante `--verbose` y `logging.consoleLevel`.

Seguimiento de registro más rápido:

```bash
openclaw logs --follow
```

Registros del servicio/supervisor (cuando el gateway se ejecuta mediante launchd/systemd):

- macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` y `gateway.err.log` (predeterminado: `~/.openclaw/logs/...`; los perfiles usan `~/.openclaw-<profile>/logs/...`)
- Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

Consulte [Solución de problemas](/es/gateway/troubleshooting#log-locations) para obtener más información.

### ¿Cómo inicio/detengo/reinicio el servicio Gateway?

Use los asistentes del gateway:

```bash
openclaw gateway status
openclaw gateway restart
```

Si ejecuta el gateway manualmente, `openclaw gateway --force` puede recuperar el puerto. Consulte [Gateway](/es/gateway).

### Cerré mi terminal en Windows, ¿cómo reinicio OpenClaw?

Hay **dos modos de instalación en Windows**:

**1) WSL2 (recomendado):** el Gateway se ejecuta dentro de Linux.

Abra PowerShell, entre en WSL y luego reinicie:

```powershell
wsl
openclaw gateway status
openclaw gateway restart
```

Si nunca instaló el servicio, inícielo en primer plano:

```bash
openclaw gateway run
```

**2) Windows nativo (no recomendado):** el Gateway se ejecuta directamente en Windows.

Abra PowerShell y ejecute:

```powershell
openclaw gateway status
openclaw gateway restart
```

Si lo ejecuta manualmente (sin servicio), use:

```powershell
openclaw gateway run
```

Documentación: [Windows (WSL2)](/es/platforms/windows), [Manual de servicio del Gateway](/es/gateway).

### El Gateway está activo pero las respuestas nunca llegan. ¿Qué debo verificar?

Comience con un barrido rápido de estado:

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

Causas comunes:

- Autenticación del modelo no cargada en el **host del gateway** (verifique `models status`).
- Emparejamiento de canales/lista de permitidos bloqueando las respuestas (verifique la configuración del canal + registros).
- WebChat/Dashboard está abierto sin el token correcto.

Si está remoto, confirme que la conexión del túnel/Tailscale esté activa y que el
WebSocket del Gateway sea accesible.

Documentación: [Canales](/es/channels), [Solución de problemas](/es/gateway/troubleshooting), [Acceso remoto](/es/gateway/remote).

### Desconectado del gateway sin razón, ¿qué ahora?

Esto generalmente significa que la interfaz de usuario perdió la conexión WebSocket. Verifique:

1. ¿Se está ejecutando el Gateway? `openclaw gateway status`
2. ¿Está el Gateway sano? `openclaw status`
3. ¿Tiene la interfaz de usuario el token correcto? `openclaw dashboard`
4. Si está remoto, ¿está activo el enlace del túnel/Tailscale?

Luego revise los registros:

```bash
openclaw logs --follow
```

Documentos: [Panel de control](/es/web/dashboard), [Acceso remoto](/es/gateway/remote), [Solución de problemas](/es/gateway/troubleshooting).

### Error de Telegram setMyCommands ¿Qué debo comprobar

Comience con los registros y el estado del canal:

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

Luego compare el error:

- `BOT_COMMANDS_TOO_MUCH`: el menú de Telegram tiene demasiadas entradas. OpenClaw ya recorta hasta el límite de Telegram y reintenta con menos comandos, pero algunas entradas del menú aún deben eliminarse. Reduzca los comandos de complemento/habilidad/personalizados, o deshabilite `channels.telegram.commands.native` si no necesita el menú.
- `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!` o errores de red similares: si está en un VPS o detrás de un proxy, confirme que el HTTPS saliente está permitido y que el DNS funciona para `api.telegram.org`.

Si la puerta de enlace es remota, asegúrese de estar mirando los registros en el host de la puerta de enlace.

Documentos: [Telegram](/es/channels/telegram), [Solución de problemas del canal](/es/channels/troubleshooting).

### La TUI no muestra salida ¿Qué debo comprobar

Primero confirme que la puerta de enlace es accesible y que el agente puede ejecutarse:

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

En la TUI, use `/status` para ver el estado actual. Si espera respuestas en un canal de chat, asegúrese de que la entrega esté habilitada (`/deliver on`).

Documentos: [TUI](/es/web/tui), [Comandos de barra](/es/tools/slash-commands).

### ¿Cómo detengo y luego inicio completamente la puerta de enlace?

Si instaló el servicio:

```bash
openclaw gateway stop
openclaw gateway start
```

Esto detiene/inicia el **servicio supervisado** (launchd en macOS, systemd en Linux).
Úselo cuando la puerta de enlace se ejecuta en segundo plano como un demonio.

Si se está ejecutando en primer plano, deténgalo con Ctrl-C y luego:

```bash
openclaw gateway run
```

Documentos: [Manual de servicio de la puerta de enlace](/es/gateway).

### Explícame como si tuviera 5 años: reinicio de la puerta de enlace openclaw frente a puerta de enlace openclaw

- `openclaw gateway restart`: reinicia el **servicio en segundo plano** (launchd/systemd).
- `openclaw gateway`: ejecuta la puerta de enlace **en primer plano** para esta sesión de terminal.

Si instaló el servicio, use los comandos de la puerta de enlace. Use `openclaw gateway` cuando desee una ejecución única en primer plano.

### ¿Cuál es la forma más rápida de obtener más detalles cuando algo falla?

Inicie la Gateway con `--verbose` para obtener más detalles en la consola. Luego inspeccione el archivo de registro en busca de errores de autenticación de canal, enrutamiento de modelo y RPC.

## Medios y adjuntos

### Mi habilidad generó una imagen/PDF pero no se envió nada

Los adjuntos salientes del agente deben incluir una línea `MEDIA:<path-or-url>` (en su propia línea). Consulte [Configuración del asistente OpenClaw](/es/start/openclaw) y [Envío de agente](/es/tools/agent-send).

Envío por CLI:

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

También verifique:

- El canal de destino admite medios salientes y no está bloqueado por listas de permitidos.
- El archivo está dentro de los límites de tamaño del proveedor (las imágenes se redimensionan a un máximo de 2048px).

Consulte [Imágenes](/es/nodes/images).

## Seguridad y control de acceso

### ¿Es seguro exponer OpenClaw a MD entrantes?

Trate los MD entrantes como entrada que no es de confianza. Los valores predeterminados están diseñados para reducir el riesgo:

- El comportamiento predeterminado en los canales con capacidad de MD es **vinculación (pairing)**:
  - Los remitentes desconocidos reciben un código de vinculación; el bot no procesa su mensaje.
  - Aprobar con: `openclaw pairing approve --channel <channel> [--account <id>] <code>`
  - Las solicitudes pendientes tienen un límite de **3 por canal**; verifique `openclaw pairing list --channel <channel> [--account <id>]` si un código no llegó.
- Abrir los MD públicamente requiere una aceptación explícita (`dmPolicy: "open"` y lista de permitidos `"*"`).

Ejecute `openclaw doctor` para mostrar políticas de MD riesgosas.

### ¿La inyección de avisos (prompt injection) es solo una preocupación para los bots públicos?

No. La inyección de avisos se trata de **contenido que no es de confianza**, no solo de quién puede enviar MD al bot.
Si su asistente lee contenido externo (búsqueda/obtención web, páginas del navegador, correos electrónicos,
documentos, adjuntos, registros pegados), ese contenido puede incluir instrucciones que intentan
desviar el modelo. Esto puede suceder incluso si **usted es el único remitente**.

El mayor riesgo es cuando se habilitan las herramientas: el modelo puede engañarse para
extraer contexto o llamar a herramientas en su nombre. Reduzca el radio de explosión:

- usando un agente "lector" de solo lectura o con herramientas deshabilitadas para resumir contenido que no es de confianza
- manteniendo `web_search` / `web_fetch` / `browser` desactivados para agentes con herramientas habilitadas
- sandboxing y listas de permitidos de herramientas estrictas

Detalles: [Seguridad](/es/gateway/security).

### ¿Debería mi bot tener su propio correo electrónico, cuenta de GitHub o número de teléfono?

Sí, para la mayoría de las configuraciones. Aislar el bot con cuentas y números de teléfono separados reduce el radio de impacto si algo sale mal. Esto también facilita la rotación de credenciales o la revocación del acceso sin afectar tus cuentas personales.

Empieza pequeño. Otorga acceso solo a las herramientas y cuentas que realmente necesites y amplíalo más tarde si es necesario.

Documentación: [Seguridad](/es/gateway/security), [Emparejamiento](/es/channels/pairing).

### ¿Puedo darle autonomía sobre mis mensajes de texto y es seguro?

**No** recomendamos la autonomía total sobre tus mensajes personales. El patrón más seguro es:

- Mantén los MD en **modo de emparejamiento** o en una lista de permitidos estricta.
- Usa un **número o cuenta separada** si quieres que envíe mensajes en tu nombre.
- Déjalo redactar y luego **aprueba antes de enviar**.

Si quieres experimentar, hazlo en una cuenta dedicada y mantenla aislada. Consulta [Seguridad](/es/gateway/security).

### ¿Puedo usar modelos más económicos para tareas de asistente personal?

Sí, **si** el agente es solo de chat y la entrada es confiable. Los niveles inferiores son más susceptibles al secuestro de instrucciones, por lo que se deben evitar para agentes con herramientas habilitadas o al leer contenido no confiable. Si debes usar un modelo más pequeño, restringe las herramientas y ejecútalo dentro de un entorno protegido. Consulta [Seguridad](/es/gateway/security).

### Ejecuté start en Telegram pero no recibí un código de emparejamiento

Los códigos de emparejamiento se envían **solo** cuando un remitente desconocido envía un mensaje al bot y `dmPolicy: "pairing"` está habilitado. `/start` por sí solo no genera un código.

Comprueba las solicitudes pendientes:

```bash
openclaw pairing list telegram
```

Si quieres acceso inmediato, añade tu id de remitente a la lista de permitidos o establece `dmPolicy: "open"` para esa cuenta.

### WhatsApp: ¿enviará mensajes a mis contactos? ¿Cómo funciona el emparejamiento?

No. La política predeterminada de MD de WhatsApp es de **emparejamiento**. Los remitentes desconocidos solo reciben un código de emparejamiento y su mensaje **no se procesa**. OpenClaw solo responde a los chats que recibe o a envíos explícitos que tú actives.

Aprueba el emparejamiento con:

```bash
openclaw pairing approve whatsapp <code>
```

Lista las solicitudes pendientes:

```bash
openclaw pairing list whatsapp
```

Solicitud del número de teléfono del asistente: se usa para establecer tu **lista de permitidos/propietario** para que se permitan tus propios MD. No se usa para el envío automático. Si ejecutas en tu número de WhatsApp personal, usa ese número y habilita `channels.whatsapp.selfChatMode`.

## Comandos de chat, cancelación de tareas y "no se detiene"

### ¿Cómo evito que aparezcan mensajes internos del sistema en el chat?

La mayoría de los mensajes internos o de herramientas solo aparecen cuando **verbose** o **reasoning** están activados
para esa sesión.

Arréglalo en el chat donde lo veas:

```
/verbose off
/reasoning off
```

Si sigue siendo ruidoso, verifica la configuración de la sesión en la Interfaz de Control (Control UI) y establece verbose
en **inherit** (heredar). También confirma que no estás usando un perfil de bot con `verboseDefault` establecido
en `on` en la configuración.

Documentos: [Thinking and verbose](/es/tools/thinking), [Security](/es/gateway/security#reasoning--verbose-output-in-groups).

### Cómo detenercancelar una tarea en ejecución

Envía cualquiera de estos **como un mensaje independiente** (sin barra):

```
stop
stop action
stop current action
stop run
stop current run
stop agent
stop the agent
stop openclaw
openclaw stop
stop don't do anything
stop do not do anything
stop doing anything
please stop
stop please
abort
esc
wait
exit
interrupt
```

Estos son desencadenantes de aborto (no comandos de barra).

Para procesos en segundo plano (de la herramienta exec), puedes pedirle al agente que ejecute:

```
process action:kill sessionId:XXX
```

Resumen de comandos de barra: consulta [Slash commands](/es/tools/slash-commands).

La mayoría de los comandos deben enviarse como un mensaje **independiente** que comience con `/`, pero algunos atajos (como `/status`) también funcionan en línea para remitentes en la lista de permitidos.

### Cómo enviar un mensaje de Discord desde Telegram Mensajería entre contextos denegada

OpenClaw bloquea la mensajería **entre proveedores** (cross-provider) de forma predeterminada. Si una llamada a una herramienta está vinculada
a Telegram, no se enviará a Discord a menos que lo permitas explícitamente.

Activa la mensajería entre proveedores para el agente:

```json5
{
  agents: {
    defaults: {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    },
  },
}
```

Reinicia la puerta de enlace después de editar la configuración. Si solo quieres esto para un solo
agente, establécelo bajo `agents.list[].tools.message` en su lugar.

### Por qué parece que el bot ignora mensajes rápidos

El modo de cola controla cómo interactúan los nuevos mensajes con una ejecución en curso. Usa `/queue` para cambiar modos:

- `steer` - los nuevos mensajes redirigen la tarea actual
- `followup` - ejecuta los mensajes de uno en uno
- `collect` - procesa los mensajes por lotes y responde una vez (predeterminado)
- `steer-backlog` - guía ahora, luego procesa el historial
- `interrupt` - aborta la ejecución actual y comienza de nuevo

Puedes agregar opciones como `debounce:2s cap:25 drop:summarize` para modos de seguimiento.

## Responde la pregunta exacta de la captura de pantalla/historial de chat

**P: "¿Cuál es el modelo predeterminado para Anthropic con una clave de API?"**

**R:** En OpenClaw, las credenciales y la selección de modelos son independientes. Configurar `ANTHROPIC_API_KEY` (o almacenar una clave de API de Anthropic en los perfiles de autenticación) habilita la autenticación, pero el modelo predeterminado real es el que configures en `agents.defaults.model.primary` (por ejemplo, `anthropic/claude-sonnet-4-5` o `anthropic/claude-opus-4-6`). Si ves `No credentials found for profile "anthropic:default"`, significa que la Gateway no pudo encontrar las credenciales de Anthropic en la `auth-profiles.json` esperada para el agente que se está ejecutando.

---

¿Sigues atascado? Pregunta en [Discord](https://discord.com/invite/clawd) o abre una [discusión en GitHub](https://github.com/openclaw/openclaw/discussions).

import es from "/components/footer/es.mdx";

<es />
