---
summary: "Preguntas frecuentes sobre la configuración, configuración y uso de OpenClaw"
read_when:
  - Responder preguntas comunes sobre configuración, instalación, incorporación o soporte de tiempo de ejecución
  - Clasificación de problemas reportados por el usuario antes de una depuración más profunda
title: "Preguntas frecuentes"
---

# Preguntas frecuentes

Respuestas rápidas más solución de problemas más profunda para configuraciones del mundo real (desarrollo local, VPS, multiagente, claves OAuth/API, conmutación por error de modelos). Para el diagnóstico de tiempo de ejecución, consulte [Solución de problemas](/es/gateway/troubleshooting). Para la referencia completa de configuración, consulte [Configuración](/es/gateway/configuration).

## Tabla de contenidos

- [Inicio rápido y configuración de primera ejecución]
  - [Estoy atascado: la forma más rápida de desatascarse](#i-am-stuck---fastest-way-to-get-unstuck)
  - [Forma recomendada de instalar y configurar OpenClaw](#recommended-way-to-install-and-set-up-openclaw)
  - [¿Cómo abro el panel de control después de la incorporación?](#how-do-i-open-the-dashboard-after-onboarding)
  - [¿Cómo autentico el panel de control (token) en localhost vs. remoto?](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [¿Qué tiempo de ejecución necesito?](#what-runtime-do-i-need)
  - [¿Funciona en Raspberry Pi?](#does-it-run-on-raspberry-pi)
  - [¿Algún consejo para instalaciones en Raspberry Pi?](#any-tips-for-raspberry-pi-installs)
  - [Está atascado en "despierta a mi amigo" / la incorporación no se abrirá. ¿Qué ahora?](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [¿Puedo migrar mi configuración a una nueva máquina (Mac mini) sin repetir la incorporación?](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [¿Dónde puedo ver qué hay de nuevo en la última versión?](#where-do-i-see-what-is-new-in-the-latest-version)
  - [No se puede acceder a docs.openclaw.ai (error SSL)](#cannot-access-docsopenclawai-ssl-error)
  - [Diferencia entre estable y beta](#difference-between-stable-and-beta)
  - [¿Cómo instalo la versión beta y cuál es la diferencia entre beta y dev?](#how-do-i-install-the-beta-version-and-what-is-the-difference-between-beta-and-dev)
  - [¿Cómo pruebo las últimas novedades?](#how-do-i-try-the-latest-bits)
  - [¿Cuánto tiempo suele tardar la instalación y la incorporación?](#how-long-does-install-and-onboarding-usually-take)
  - [¿El instalador está atascado? ¿Cómo obtengo más comentarios?](#installer-stuck-how-do-i-get-more-feedback)
  - [La instalación en Windows dice que no se encontró git o que openclaw no se reconoció](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [La salida de exec de Windows muestra texto chino ilegible, ¿qué debo hacer?](#windows-exec-output-shows-garbled-chinese-text-what-should-i-do)
  - [La documentación no respondió a mi pregunta, ¿cómo puedo obtener una mejor respuesta?](#the-docs-did-not-answer-my-question---how-do-i-get-a-better-answer)
  - [¿Cómo instalo OpenClaw en Linux?](#how-do-i-install-openclaw-on-linux)
  - [¿Cómo instalo OpenClaw en un VPS?](#how-do-i-install-openclaw-on-a-vps)
  - [¿Dónde están las guías de instalación en la nube/VPS?](#where-are-the-cloudvps-install-guides)
  - [¿Puedo pedirle a OpenClaw que se actualice a sí mismo?](#can-i-ask-openclaw-to-update-itself)
  - [¿Qué hace realmente la integración (onboarding)?](#what-does-onboarding-actually-do)
  - [¿Necesito una suscripción a Claude u OpenAI para ejecutar esto?](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [¿Puedo usar la suscripción Claude Max sin una clave API?](#can-i-use-claude-max-subscription-without-an-api-key)
  - [¿Cómo funciona la autenticación de "setup-token" de Anthropic?](#how-does-anthropic-setuptoken-auth-work)
  - [¿Dónde encuentro un token de configuración (setup-token) de Anthropic?](#where-do-i-find-an-anthropic-setuptoken)
  - [¿Admiten la autenticación por suscripción de Claude (Claude Pro o Max)?](#do-you-support-claude-subscription-auth-claude-pro-or-max)
  - [¿Por qué veo `HTTP 429: rate_limit_error` de Anthropic?](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [¿Se admite AWS Bedrock?](#is-aws-bedrock-supported)
  - [¿Cómo funciona la autenticación de Codex?](#how-does-codex-auth-work)
  - [¿Admiten la autenticación por suscripción de OpenAI (Codex OAuth)?](#do-you-support-openai-subscription-auth-codex-oauth)
  - [¿Cómo configuro OAuth de CLI Gemini](#how-do-i-set-up-gemini-cli-oauth)
  - [¿Es válido un modelo local para charlas informales?](#is-a-local-model-ok-for-casual-chats)
  - [¿Cómo mantengo el tráfico del modelo alojado en una región específica?](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [¿Tengo que comprar un Mac Mini para instalar esto?](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [¿Necesito un Mac mini para la compatibilidad con iMessage?](#do-i-need-a-mac-mini-for-imessage-support)
  - [Si compro un Mac mini para ejecutar OpenClaw, ¿puedo conectarlo a mi MacBook Pro?](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [¿Puedo usar Bun?](#can-i-use-bun)
  - [Telegram: ¿qué va en `allowFrom`?](#telegram-what-goes-in-allowfrom)
  - [¿Pueden varias personas usar un número de WhatsApp con diferentes instancias de OpenClaw?](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [¿Puedo ejecutar un agente de "chat rápido" y un agente de "Opus para programar"?](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [¿Homebrew funciona en Linux?](#does-homebrew-work-on-linux)
  - [Diferencia entre la instalación modificable de git y la instalación de npm](#difference-between-the-hackable-git-install-and-npm-install)
  - [¿Puedo cambiar entre las instalaciones npm y git más tarde?](#can-i-switch-between-npm-and-git-installs-later)
  - [¿Debo ejecutar el Gateway en mi portátil o en un VPS?](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [¿Qué tan importante es ejecutar OpenClaw en una máquina dedicada?](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [¿Cuáles son los requisitos mínimos de VPS y el sistema operativo recomendado?](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [¿Puedo ejecutar OpenClaw en una máquina virtual y cuáles son los requisitos](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [¿Qué es OpenClaw?](#what-is-openclaw)
  - [¿Qué es OpenClaw, en un párrafo?](#what-is-openclaw-in-one-paragraph)
  - [Propuesta de valor](#value-proposition)
  - [Acabo de configurarlo, ¿qué debo hacer primero](#i-just-set-it-up-what-should-i-do-first)
  - [¿Cuáles son los cinco principales casos de uso cotidianos para OpenClaw](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [¿Puede OpenClaw ayudar con la generación de leads, alcance, anuncios y blogs para un SaaS](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [¿Cuáles son las ventajas frente a Claude Code para el desarrollo web?](#what-are-the-advantages-vs-claude-code-for-web-development)
- [Habilidades y automatización](#skills-and-automation)
  - [¿Cómo personalizo las habilidades sin mantener el repositorio sucio?](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [¿Puedo cargar habilidades desde una carpeta personalizada?](#can-i-load-skills-from-a-custom-folder)
  - [¿Cómo puedo usar diferentes modelos para diferentes tareas?](#how-can-i-use-different-models-for-different-tasks)
  - [El bot se congela mientras realiza trabajos pesados. ¿Cómo puedo descargar eso?](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Cron o los recordatorios no se activan. ¿Qué debo verificar?](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [¿Cómo instalo habilidades en Linux?](#how-do-i-install-skills-on-linux)
  - [¿Puede OpenClaw ejecutar tareas programadas o continuamente en segundo plano?](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [¿Puedo ejecutar habilidades exclusivas de Apple macOS desde Linux?](#can-i-run-apple-macos-only-skills-from-linux)
  - [¿Tienen una integración con Notion o HeyGen?](#do-you-have-a-notion-or-heygen-integration)
  - [¿Cómo uso mi Chrome con sesión iniciada existente con OpenClaw?](#how-do-i-use-my-existing-signed-in-chrome-with-openclaw)
- [Sandboxing y memoria](#sandboxing-and-memory)
  - [¿Existe algún documento dedicado al sandboxing?](#is-there-a-dedicated-sandboxing-doc)
  - [¿Cómo vinculo una carpeta del host al sandbox?](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [¿Cómo funciona la memoria?](#how-does-memory-work)
  - [La memoria sigue olvidando cosas. ¿Cómo hago que se quede?](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [¿La memoria persiste para siempre? ¿Cuáles son los límites?](#does-memory-persist-forever-what-are-the-limits)
  - [¿La búsqueda de memoria semántica requiere una clave API de OpenAI?](#does-semantic-memory-search-require-an-openai-api-key)
- [Dónde se encuentran las cosas en el disco](#where-things-live-on-disk)
  - [¿Se guardan localmente todos los datos utilizados con OpenClaw?](#is-all-data-used-with-openclaw-saved-locally)
  - [¿Dónde almacena OpenClaw sus datos?](#where-does-openclaw-store-its-data)
  - [¿Dónde deben estar AGENTS.md / SOUL.md / USER.md / MEMORY.md?](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [Estrategia de respaldo recomendada](#recommended-backup-strategy)
  - [¿Cómo desinstalo completamente OpenClaw?](#how-do-i-completely-uninstall-openclaw)
  - [¿Pueden los agentes trabajar fuera del espacio de trabajo?](#can-agents-work-outside-the-workspace)
  - [Estoy en modo remoto: ¿dónde está el almacenamiento de sesión?](#im-in-remote-mode-where-is-the-session-store)
- [Conceptos básicos de configuración](#config-basics)
  - [¿Qué formato tiene la configuración? ¿Dónde está?](#what-format-is-the-config-where-is-it)
  - [Establecí `gateway.bind: "lan"` (o `"tailnet"`) y ahora nada escucha / la IU dice no autorizado](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [¿Por qué necesito un token en localhost ahora?](#why-do-i-need-a-token-on-localhost-now)
  - [¿Tengo que reiniciar después de cambiar la configuración?](#do-i-have-to-restart-after-changing-config)
  - [¿Cómo desactivo las frases ingeniosas de la CLI?](#how-do-i-disable-funny-cli-taglines)
  - [¿Cómo habilito la búsqueda web (y la recuperación web)?](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply borró mi configuración. ¿Cómo recupero y evito esto?](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [¿Cómo ejecuto una puerta de enlace (Gateway) central con trabajadores especializados en varios dispositivos?](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [¿Puede ejecutarse el navegador de OpenClaw sin cabeza (headless)?](#can-the-openclaw-browser-run-headless)
  - [¿Cómo uso Brave para el control del navegador?](#how-do-i-use-brave-for-browser-control)
- [Puertas de enlace (gateways) y nodos remotos](#remote-gateways-and-nodes)
  - [¿Cómo se propagan los comandos entre Telegram, la puerta de enlace y los nodos?](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [¿Cómo puede mi agente acceder a mi ordenador si la Pasarela (Gateway) está alojada de forma remota?](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale está conectado pero no recibo respuestas. ¿Qué ahora?](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [¿Pueden dos instancias de OpenClaw comunicarse entre sí (local + VPS)?](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [¿Necesito VPS separados para múltiples agentes](#do-i-need-separate-vpses-for-multiple-agents)
  - [¿Hay algún beneficio en usar un nodo en mi portátil personal en lugar de SSH desde un VPS?](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [¿Los nodos ejecutan un servicio de pasarela (gateway)?](#do-nodes-run-a-gateway-service)
  - [¿Hay una forma de API / RPC para aplicar la configuración?](#is-there-an-api-rpc-way-to-apply-config)
  - [Configuración mínima sensata para una primera instalación](#minimal-sane-config-for-a-first-install)
  - [¿Cómo configuro Tailscale en un VPS y me conecto desde mi Mac?](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [¿Cómo conecto un nodo Mac a una Pasarela remota (Tailscale Serve)?](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [¿Debo instalar en un segundo portátil o simplemente agregar un nodo?](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [Variables de entorno y carga de .env](#env-vars-and-env-loading)
  - [¿Cómo carga OpenClaw las variables de entorno?](#how-does-openclaw-load-environment-variables)
  - ["Inicié la Pasarela a través del servicio y mis variables de entorno desaparecieron." ¿Qué ahora?](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [Establecí `COPILOT_GITHUB_TOKEN`, pero el estado de los modelos muestra "Shell env: off." ¿Por qué?](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [Sesiones y múltiples chats](#sessions-and-multiple-chats)
  - [¿Cómo inicio una conversación nueva?](#how-do-i-start-a-fresh-conversation)
  - [¿Se reinician las sesiones automáticamente si nunca envío `/new`?](#do-sessions-reset-automatically-if-i-never-send-new)
  - [¿Hay alguna forma de hacer que un equipo de instancias de OpenClaw sea un CEO y muchos agentes](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [¿Por qué se truncó el contexto a mitad de tarea? ¿Cómo lo evito?](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [¿Cómo restablezco completamente OpenClaw pero lo mantengo instalado?](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [Estoy obteniendo errores de "context too large" - ¿cómo restablezco o compacto?](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [¿Por qué veo "LLM request rejected: messages.content.tool_use.input field required"?](#why-am-i-seeing-llm-request-rejected-messagescontenttool_useinput-field-required)
  - [¿Por qué recibo mensajes de latido cada 30 minutos?](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [¿Necesito agregar una "cuenta de bot" a un grupo de WhatsApp?](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [¿Cómo obtengo el JID de un grupo de WhatsApp?](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [¿Por qué OpenClaw no responde en un grupo](#why-does-openclaw-not-reply-in-a-group)
  - [¿Los grupos/hilos comparten el contexto con los MD?](#do-groupsthreads-share-context-with-dms)
  - [¿Cuántos espacios de trabajo y agentes puedo crear?](#how-many-workspaces-and-agents-can-i-create)
  - [¿Puedo ejecutar múltiples bots o chats al mismo tiempo (Slack) y cómo debería configurarlo?](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [Modelos: valores predeterminados, selección, alias, cambio](#models-defaults-selection-aliases-switching)
  - [¿Cuál es el "modelo predeterminado"?](#what-is-the-default-model)
  - [¿Qué modelo recomiendas?](#what-model-do-you-recommend)
  - [¿Cómo cambio de modelo sin borrar mi configuración?](#how-do-i-switch-models-without-wiping-my-config)
  - [¿Puedo usar modelos autohospedados (llama.cpp, vLLM, Ollama)?](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [¿Qué usan OpenClaw, Flawd y Krill para los modelos?](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [¿Cómo cambio de modelo al vuelo (sin reiniciar)?](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [¿Puedo usar GPT 5.2 para tareas diarias y Codex 5.3 para programación](#can-i-use-gpt-52-for-daily-tasks-and-codex-53-for-coding)
  - [¿Por qué veo "El modelo ... no está permitido" y luego no hay respuesta?](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [¿Por qué veo "Modelo desconocido: minimax/MiniMax-M2.5"?](#why-do-i-see-unknown-model-minimaxminimaxm25)
  - [¿Puedo usar MiniMax como predeterminado y OpenAI para tareas complejas?](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [¿Son opus / sonnet / gpt atajos integrados?](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [¿Cómo defino/sobrescribo los atajos de modelo (alias)?](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [¿Cómo agrego modelos de otros proveedores como OpenRouter o Z.AI?](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [Conmutación por error de modelo y "Todos los modelos fallaron"](#model-failover-and-all-models-failed)
  - [¿Cómo funciona la conmutación por error?](#how-does-failover-work)
  - [¿Qué significa este error?](#what-does-this-error-mean)
  - [Lista de verificación para arreglar `No credentials found for profile "anthropic:default"`](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [¿Por qué también intentó usar Google Gemini y falló?](#why-did-it-also-try-google-gemini-and-fail)
- [Perfiles de autenticación: qué son y cómo gestionarlos](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [¿Qué es un perfil de autenticación?](#what-is-an-auth-profile)
  - [¿Cuáles son los IDs de perfil típicos?](#what-are-typical-profile-ids)
  - [¿Puedo controlar qué perfil de autenticación se prueba primero?](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth vs clave de API - ¿cuál es la diferencia](#oauth-vs-api-key---what-is-the-difference)
- [Gateway: puertos, "ya está ejecutándose" y modo remoto](#gateway-ports-already-running-and-remote-mode)
  - [¿Qué puerto usa el Gateway?](#what-port-does-the-gateway-use)
  - [¿Por qué `openclaw gateway status` dice `Runtime: running` pero `RPC probe: failed`?](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [¿Por qué `openclaw gateway status` muestra `Config (cli)` y `Config (service)` diferentes?](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - [¿Qué significa "another gateway instance is already listening"?](#what-does-another-gateway-instance-is-already-listening-mean)
  - [¿Cómo ejecuto OpenClaw en modo remoto (el cliente se conecta a un Gateway en otro lugar)?](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [La interfaz de control dice "unauthorized" (o sigue reconectando). ¿Qué ahora?](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [Configuré gateway.bind tailnet pero no puede vincularse y nada escucha](#i-set-gatewaybind-tailnet-but-it-cannot-bind-and-nothing-listens)
  - [¿Puedo ejecutar varios Gateways en el mismo host?](#can-i-run-multiple-gateways-on-the-same-host)
  - [¿Qué significa "invalid handshake" / código 1008?](#what-does-invalid-handshake-code-1008-mean)
- [Registro y depuración](#logging-and-debugging)
  - [¿Dónde están los registros?](#where-are-logs)
  - [¿Cómo inicio/detengo/reinicio el servicio Gateway?](#how-do-i-startstoprestart-the-gateway-service)
  - [Cerré mi terminal en Windows - ¿cómo reinicio OpenClaw?](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [El Gateway está activo pero las respuestas nunca llegan. ¿Qué debería comprobar?](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - ["Disconnected from gateway: no reason" - ¿qué ahora?](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram setMyCommands falla. ¿Qué debería comprobar?](#telegram-setmycommands-fails-what-should-i-check)
  - [La interfaz de usuario TUI no muestra salida. ¿Qué debería comprobar?](#tui-shows-no-output-what-should-i-check)
  - [¿Cómo detengo completamente y luego inicio el Gateway?](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5: `openclaw gateway restart` vs `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [Forma más rápida de obtener más detalles cuando algo falla](#fastest-way-to-get-more-details-when-something-fails)
- [Medios y archivos adjuntos](#media-and-attachments)
  - [Mi habilidad generó una imagen/PDF, pero no se envió nada](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [Seguridad y control de acceso](#security-and-access-control)
  - [¿Es seguro exponer OpenClaw a mensajes entrantes (DMs)?](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [¿Es la inyección de prompts solo una preocupación para los bots públicos?](#is-prompt-injection-only-a-concern-for-public-bots)
  - [¿Debe mi bot tener su propio correo, cuenta de GitHub o número de teléfono?](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [¿Puedo darle autonomía sobre mis mensajes de texto y es eso seguro?](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [¿Puedo usar modelos más baratos para tareas de asistente personal?](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [Ejecuté /start en Telegram pero no recibí un código de emparejamiento](#i-ran-start-in-telegram-but-did-not-get-a-pairing-code)
  - [WhatsApp: ¿mensajeará a mis contactos? ¿Cómo funciona el emparejamiento?](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [Comandos de chat, cancelación de tareas y "no se detendrá"](#chat-commands-aborting-tasks-and-it-will-not-stop)
  - [¿Cómo evito que los mensajes internos del sistema aparezcan en el chat?](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [¿Cómo detengo/cancelo una tarea en ejecución?](#how-do-i-stopcancel-a-running-task)
  - [¿Cómo envío un mensaje de Discord desde Telegram? ("Mensajería multi-contexto denegada")](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [¿Por qué da la impresión de que el bot "ignora" los mensajes rápidos?](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## Primeros 60 segundos si algo está roto

1. **Estado rápido (primera verificación)**

   ```bash
   openclaw status
   ```

   Resumen local rápido: SO + actualización, accesibilidad de puerta de enlace/servicio, agentes/sesiones, configuración del proveedor + problemas de tiempo de ejecución (cuando la puerta de enlace es accesible).

2. **Reporte copiable (seguro para compartir)**

   ```bash
   openclaw status --all
   ```

   Diagnóstico de solo lectura con el registro final (tokens redactados).

3. **Demonio + estado del puerto**

   ```bash
   openclaw gateway status
   ```

   Muestra el tiempo de ejecución del supervisor frente a la accesibilidad RPC, la URL de destino de la sonda y qué configuración es probable que usara el servicio.

4. **Sondas profundas**

   ```bash
   openclaw status --deep
   ```

   Ejecuta comprobaciones de salud de la puerta de enlace + sondas del proveedor (requiere una puerta de enlace accesible). Consulte [Salud](/es/gateway/health).

5. **Ver el último registro**

   ```bash
   openclaw logs --follow
   ```

   Si RPC está caído, recurra a:

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Los registros de archivos son independientes de los registros de servicio; consulte [Logging](/es/logging) y [Troubleshooting](/es/gateway/troubleshooting).

6. **Ejecutar el doctor (reparaciones)**

   ```bash
   openclaw doctor
   ```

   Repara/migra la configuración/el estado + ejecuta comprobaciones de estado. Consulte [Doctor](/es/gateway/doctor).

7. **Instantánea de la puerta de enlace**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Pide a la puerta de enlace en ejecución una instantánea completa (solo WS). Consulte [Health](/es/gateway/health).

## Inicio rápido y configuración de primera ejecución

### Estoy atascado: la forma más rápida de desatascarse

Use un agente de IA local que pueda **ver su máquina**. Esto es mucho más efectivo que preguntar
en Discord, porque la mayoría de los casos de "Estoy atascado" son **problemas de configuración local o del entorno** que
los ayudantes remotos no pueden inspeccionar.

- **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
- **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

Estas herramientas pueden leer el repositorio, ejecutar comandos, inspeccionar registros y ayudar a solucionar su configuración
a nivel de máquina (PATH, servicios, permisos, archivos de autenticación). Dales el **checkout completo del código fuente** a través
de la instalación hackeable (git):

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Esto instala OpenClaw **desde un checkout de git**, por lo que el agente puede leer el código y los documentos y
razonar sobre la versión exacta que está ejecutando. Siempre puede volver a la versión estable más tarde
volviendo a ejecutar el instalador sin `--install-method git`.

Consejo: pida al agente que **planifique y supervise** la solución (paso a paso) y luego ejecute solo los
comandos necesarios. Esto mantiene los cambios pequeños y más fáciles de auditar.

Si descubre un error real o una solución, envíe un issue de GitHub o envíe un PR:
[https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
[https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

Comience con estos comandos (comparta los resultados cuando pida ayuda):

```bash
openclaw status
openclaw models status
openclaw doctor
```

Lo que hacen:

- `openclaw status`: instantánea rápida del estado de la puerta de enlace/agente + configuración básica.
- `openclaw models status`: verifica la autenticación del proveedor + disponibilidad del modelo.
- `openclaw doctor`: valida y repara problemas comunes de configuración/estado.

Otras comprobaciones útiles de CLI: `openclaw status --all`, `openclaw logs --follow`,
`openclaw gateway status`, `openclaw health --verbose`.

Bucle de depuración rápido: [Primeros 60 segundos si algo está roto](#first-60-seconds-if-something-is-broken).
Documentos de instalación: [Instalar](/es/install), [Opciones del instalador](/es/install/installer), [Actualización](/es/install/updating).

### Forma recomendada de instalar y configurar OpenClaw

El repositorio recomienda ejecutar desde el código fuente y utilizar la incorporación:

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

### ¿Cómo abro el panel de control después de la incorporación?

El asistente abre tu navegador con una URL limpia (sin token) del panel de control justo después de la incorporación y también imprime el enlace en el resumen. Mantén esa pestaña abierta; si no se inició, copia y pega la URL impresa en la misma máquina.

### ¿Cómo autentico el token del panel de control en localhost vs. remoto?

**Localhost (misma máquina):**

- Abre `http://127.0.0.1:18789/`.
- Si pide autenticación, pega el token de `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en la configuración de Control UI.
- Recupéralo del host del gateway: `openclaw config get gateway.auth.token` (o genera uno: `openclaw doctor --generate-gateway-token`).

**No en localhost:**

- **Tailscale Serve** (recomendado): mantén bind loopback, ejecuta `openclaw gateway --tailscale serve`, abre `https://<magicdns>/`. Si `gateway.auth.allowTailscale` es `true`, los encabezados de identidad satisfacen la autenticación de Control UI/WebSocket (sin token, asume host de gateway confiable); las API HTTP aún requieren token/contraseña.
- **Tailnet bind**: ejecuta `openclaw gateway --bind tailnet --token "<token>"`, abre `http://<tailscale-ip>:18789/`, pega el token en la configuración del panel de control.
- **Túnel SSH**: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abre `http://127.0.0.1:18789/` y pega el token en la configuración de Control UI.

Consulta [Panel de control](/es/web/dashboard) y [Superficies web](/es/web) para obtener detalles sobre los modos de enlace y autenticación.

### Qué entorno de ejecución necesito

Se requiere Node **>= 22**. Se recomienda `pnpm`. No se **recomienda** Bun para el Gateway.

### ¿Se ejecuta en Raspberry Pi?

Sí. Gateway es ligero: la documentación indica que **512MB-1GB de RAM**, **1 núcleo** y unos **500MB** de disco son suficientes para uso personal, y señala que una **Raspberry Pi 4 puede ejecutarlo**.

Si quieres un margen adicional (registros, medios, otros servicios), se **recomiendan 2GB**, pero no es un mínimo estricto.

Consejo: una Pi/VPS pequeña puede alojar el Gateway, y puedes emparejar **nodos** en tu portátil/teléfono para pantalla/cámara/lienzos locales o ejecución de comandos. Consulta [Nodos](/es/nodes).

### ¿Algún consejo para las instalaciones en Raspberry Pi?

Versión corta: funciona, pero espera imprevistos.

- Utiliza un sistema operativo **de 64 bits** y mantén Node >= 22.
- Prefiere la **instalación «hackable» (git)** para que puedas ver los registros y actualizar rápidamente.
- Empieza sin canales/habilidades, luego añádelos uno a uno.
- Si encuentras problemas extraños con los binarios, generalmente es un problema de **compatibilidad ARM**.

Documentación: [Linux](/es/platforms/linux), [Instalación](/es/install).

### Se queda atascado en «despierta, mi amigo», la incorporación no se completará. ¿Qué hago ahora?

Esa pantalla depende de que el Gateway sea accesible y autenticado. La TUI también envía «¡Despierta, mi amigo!» automáticamente en la primera eclosión. Si ves esa línea **sin respuesta** y los tokens se mantienen en 0, el agente nunca se ejecutó.

1. Reinicia el Gateway:

```bash
openclaw gateway restart
```

2. Verifica el estado y la autenticación:

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

3. Si sigue bloqueado, ejecuta:

```bash
openclaw doctor
```

Si el Gateway es remoto, asegúrate de que la conexión del túnel/Tailscale esté activa y que la interfaz de usuario apunte al Gateway correcto. Consulta [Acceso remoto](/es/gateway/remote).

### ¿Puedo migrar mi configuración a una nueva máquina Mac mini sin repetir la incorporación?

Sí. Copia el **directorio de estado** y el **espacio de trabajo**, luego ejecuta Doctor una vez. Esto mantiene tu bot «exactamente igual» (memoria, historial de sesiones, autenticación y estado del canal) siempre que copies **ambas** ubicaciones:

1. Instala OpenClaw en la nueva máquina.
2. Copia `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`) de la máquina antigua.
3. Copia tu espacio de trabajo (predeterminado: `~/.openclaw/workspace`).
4. Ejecuta `openclaw doctor` y reinicia el servicio Gateway.

Eso preserva la configuración, los perfiles de autenticación, las credenciales de WhatsApp, las sesiones y la memoria. Si estás en modo remoto, recuerda que el host de la puerta de enlace posee el almacenamiento de sesiones y el espacio de trabajo.

**Importante:** si solo envías (commit/push) tu espacio de trabajo a GitHub, estás haciendo una copia de seguridad de **memoria + archivos de arranque**, pero **no** del historial de sesiones ni de la autenticación. Estos residen en `~/.openclaw/` (por ejemplo `~/.openclaw/agents/<agentId>/sessions/`).

Relacionado: [Migrating](/es/install/migrating), [Where things live on disk](/es/help/faq#where-does-openclaw-store-its-data),
[Agent workspace](/es/concepts/agent-workspace), [Doctor](/es/gateway/doctor),
[Remote mode](/es/gateway/remote).

### ¿Dónde puedo ver las novedades de la última versión

Consulta el registro de cambios de GitHub:
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

Las entradas más recientes están arriba. Si la sección superior está marcada como **Unreleased** (sin publicar), la siguiente sección con fecha es la última versión publicada. Las entradas se agrupan en **Highlights** (destacados), **Changes** (cambios) y
**Fixes** (correcciones) (más secciones de docs/u otras cuando sea necesario).

### No se puede acceder a docs.openclaw.ai (error SSL)

Algunas conexiones de Comcast/Xfinity bloquean incorrectamente `docs.openclaw.ai` a través de Xfinity
Advanced Security. Desactívalo o añade `docs.openclaw.ai` a la lista de permitidos, luego vuelve a intentarlo. Más
detalles: [Troubleshooting](/es/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity).
Por favor, ayúdanos a desbloquearlo reportándolo aquí: [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

Si sigues sin poder acceder al sitio, la documentación está reflejada en GitHub:
[https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

### Diferencia entre stable y beta

**Stable** y **beta** son **dist-tags de npm**, no líneas de código separadas:

- `latest` = estable
- `beta` = versión preliminar para pruebas

Publicamos compilaciones en **beta**, las probamos y una vez que una compilación es sólida, **promovemos
esa misma versión a `latest`**. Por eso beta y stable pueden apuntar a la
**misma versión**.

Ver qué cambió:
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

### ¿Cómo instalo la versión beta y cuál es la diferencia entre beta y dev

**Beta** es la dist-tag de npm `beta` (puede coincidir con `latest`).
**Dev** es la cabeza móvil de `main` (git); cuando se publica, usa la dist-tag de npm `dev`.

Comandos de una línea (macOS/Linux):

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Instalador de Windows (PowerShell):
[https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

Más detalles: [Canales de desarrollo](/es/install/development-channels) y [Marcas del instalador](/es/install/installer).

### ¿Cuánto tiempo suelen tardar la instalación y la incorporación?

Guía aproximada:

- **Instalación:** 2-5 minutos
- **Incorporación:** 5-15 minutos, dependiendo de cuántos canales/modelos configures

Si se cuelga, usa [Instalador atascado](/es/help/faq#installer-stuck-how-do-i-get-more-feedback)
y el bucle de depuración rápida en [Estoy atascado](/es/help/faq#i-am-stuck---fastest-way-to-get-unstuck).

### ¿Cómo pruebo las últimas novedades?

Dos opciones:

1. **Canal de desarrollo (git checkout):**

```bash
openclaw update --channel dev
```

Esto cambia a la rama `main` y actualiza desde el código fuente.

2. **Instalación hackeable (desde el sitio del instalador):**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Eso te da un repositorio local que puedes editar y luego actualizar vía git.

Si prefieres un clon limpio manualmente, usa:

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

Documentación: [Actualizar](/es/cli/update), [Canales de desarrollo](/es/install/development-channels),
[Instalar](/es/install).

### Instalador atascado ¿Cómo obtengo más comentarios?

Vuelve a ejecutar el instalador con **salida detallada**:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

Instalación Beta con detalles:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

Para una instalación hackeable (git):

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

Más opciones: [Marcas del instalador](/es/install/installer).

### La instalación de Windows dice que no se encontró git o que openclaw no se reconoce

Dos problemas comunes en Windows:

**1) error npm spawn git / git not found**

- Instala **Git para Windows** y asegúrate de que `git` esté en tu PATH.
- Cierra y vuelve a abrir PowerShell, luego vuelve a ejecutar el instalador.

**2) openclaw no se reconoce después de la instalación**

- Tu carpeta bin global de npm no está en PATH.
- Comprueba la ruta:

  ```powershell
  npm config get prefix
  ```

- Añade ese directorio a tu PATH de usuario (no se necesita el sufijo `\bin` en Windows; en la mayoría de los sistemas es `%AppData%\npm`).
- Cierra y vuelve a abrir PowerShell después de actualizar el PATH.

Si quieres la configuración de Windows más fluida, usa **WSL2** en lugar de Windows nativo.
Documentación: [Windows](/es/platforms/windows).

### La salida de ejecución de Windows muestra texto chino corrupto, ¿qué debo hacer?

Esto suele ser una discordancia en la página de códigos de la consola en los shells nativos de Windows.

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

A continuación, reinicie el Gateway y vuelva a intentar su comando:

```powershell
openclaw gateway restart
```

Si todavía reproduce esto en la última versión de OpenClaw, haga un seguimiento o infórmelo en:

- [Incidencia #30640](https://github.com/openclaw/openclaw/issues/30640)

### La documentación no respondió a mi pregunta: ¿cómo obtengo una mejor respuesta?

Use la **instalación (git) hackeable** para tener el código fuente y la documentación completos localmente, luego pregunte a su bot (o Claude/Codex) _desde esa carpeta_ para que pueda leer el repositorio y responder con precisión.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Más detalles: [Instalación](/es/install) y [Opciones del instalador](/es/install/installer).

### ¿Cómo instalo OpenClaw en Linux?

Respuesta corta: siga la guía de Linux y luego ejecute la configuración inicial (onboarding).

- Ruta rápida de Linux + instalación del servicio: [Linux](/es/platforms/linux).
- Tutorial completo: [Introducción](/es/start/getting-started).
- Instalador + actualizaciones: [Instalación y actualizaciones](/es/install/updating).

### ¿Cómo instalo OpenClaw en un VPS?

Cualquier VPS de Linux funciona. Instale en el servidor y luego use SSH/Tailscale para acceder al Gateway.

Guías: [exe.dev](/es/install/exe-dev), [Hetzner](/es/install/hetzner), [Fly.io](/es/install/fly).
Acceso remoto: [Gateway remoto](/es/gateway/remote).

### Dónde están las guías de instalación de cloudVPS

Mantenemos un **centro de alojamiento** con los proveedores comunes. Elija uno y siga la guía:

- [Alojamiento VPS](/es/vps) (todos los proveedores en un solo lugar)
- [Fly.io](/es/install/fly)
- [Hetzner](/es/install/hetzner)
- [exe.dev](/es/install/exe-dev)

Cómo funciona en la nube: el **Gateway se ejecuta en el servidor** y usted accede a él desde su portátil/teléfono mediante la interfaz de Control (o Tailscale/SSH). Su estado + espacio de trabajo residen en el servidor, así que trate el host como la fuente de verdad y realice copias de seguridad.

Puede emparejar **nodos** (Mac/iOS/Android/headless) a ese Gateway en la nube para acceder a la pantalla/cámara/lienzo local o ejecutar comandos en su portátil mientras mantiene el Gateway en la nube.

Centro: [Plataformas](/es/platforms). Acceso remoto: [Gateway remoto](/es/gateway/remote).
Nodos: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes).

### ¿Puedo pedirle a OpenClaw que se actualice a sí mismo?

Respuesta corta: **posible, no recomendado**. El flujo de actualización puede reiniciar el
Gateway (lo que interrumpe la sesión activa), puede requerir una extracción limpia de git y
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

Documentación: [Update](/es/cli/update), [Updating](/es/install/updating).

### ¿Qué hace realmente la incorporación

`openclaw onboard` es la ruta de configuración recomendada. En **modo local** le guía a través de:

- **Configuración de modelo/auth** (se admiten flujos de OAuth/token de configuración del proveedor y claves API, más opciones de modelos locales como LM Studio)
- Ubicación del **Workspace** + archivos de inicio
- **Configuración de Gateway** (bind/port/auth/tailscale)
- **Proveedores** (WhatsApp, Telegram, Discord, Mattermost (plugin), Signal, iMessage)
- **Instalación del demonio** (LaunchAgent en macOS; unidad de usuario systemd en Linux/WSL2)
- Selección de **Health checks** y **skills**

También advierte si su modelo configurado es desconocido o le falta autenticación.

### ¿Necesito una suscripción a Claude o OpenAI para ejecutar esto

No. Puede ejecutar OpenClaw con **claves API** (Anthropic/OpenAI/u otros) o con
**modelos solo locales** para que sus datos se mantengan en su dispositivo. Las suscripciones (Claude
Pro/Max u OpenAI Codex) son formas opcionales de autenticar esos proveedores.

Si elige la autenticación de suscripción de Anthropic, decida usted mismo si usarla:
Anthropic ha bloqueado algún uso de suscripción fuera de Claude Code en el pasado.
El OAuth de OpenAI Codex es compatible explícitamente con herramientas externas como OpenClaw.

Documentación: [Anthropic](/es/providers/anthropic), [OpenAI](/es/providers/openai),
[Local models](/es/gateway/local-models), [Models](/es/concepts/models).

### ¿Puedo usar la suscripción Claude Max sin una clave API

Sí. Puede autenticarse con un **setup-token**
en lugar de una clave API. Esta es la ruta de suscripción.

Las suscripciones Claude Pro/Max **no incluyen una clave API**, por lo que esta es la
ruta técnica para las cuentas de suscripción. Pero esta es su decisión: Anthropic
ha bloqueado algún uso de suscripción fuera de Claude Code en el pasado.
Si desea la ruta compatible más clara y segura para producción, use una clave API de Anthropic.

### ¿Cómo funciona la autenticación setuptoken de Anthropic

`claude setup-token` genera una **cadena de token** a través de la CLI de Claude Code (no está disponible en la consola web). Puede ejecutarlo en **cualquier máquina**. Elija **Anthropic token (pegar setup-token)** en la incorporación o péguelo con `openclaw models auth paste-token --provider anthropic`. El token se almacena como un perfil de autenticación para el proveedor **anthropic** y se usa como una clave API (sin actualización automática). Más detalles: [OAuth](/es/concepts/oauth).

### ¿Dónde encuentro un setuptoken de Anthropic

**No** está en la Consola de Anthropic. El setup-token es generado por la **CLI de Claude Code** en **cualquier máquina**:

```bash
claude setup-token
```

Copie el token que imprime, luego elija **Anthropic token (pegar setup-token)** en la incorporación. Si desea ejecutarlo en el host de la puerta de enlace, use `openclaw models auth setup-token --provider anthropic`. Si ejecutó `claude setup-token` en otro lugar, péguelo en el host de la puerta de enlace con `openclaw models auth paste-token --provider anthropic`. Consulte [Anthropic](/es/providers/anthropic).

### ¿Admiten la autenticación de suscripción de Claude (Claude Pro o Max)

Sí: a través de **setup-token**. OpenClaw ya no reutiliza los tokens OAuth de la CLI de Claude Code; use un setup-token o una clave API de Anthropic. Genere el token en cualquier lugar y péguelo en el host de la puerta de enlace. Consulte [Anthropic](/es/providers/anthropic) y [OAuth](/es/concepts/oauth).

Importante: esta es compatibilidad técnica, no una garantía de política. Anthropic ha bloqueado algún uso de suscripción fuera de Claude Code en el pasado. Debe decidir si usarlo y verificar los términos actuales de Anthropic. Para cargas de trabajo de producción o multiusuario, la autenticación con clave API de Anthropic es la opción más segura y recomendada.

### ¿Por qué veo el error HTTP 429 ratelimiterror de Anthropic

Eso significa que su **cuota/límite de velocidad de Anthropic** está agotada para la ventana actual. Si usa una **suscripción de Claude** (setup-token), espere a que se restablezca la ventana o actualice su plan. Si usa una **clave API de Anthropic**, verifique el uso y la facturación en la Consola de Anthropic y aumente los límites según sea necesario.

Si el mensaje es específicamente:
`Extra usage is required for long context requests`, la solicitud está intentando usar la beta de contexto 1M de Anthropic (`context1m: true`). Eso solo funciona cuando su credencial es elegible para la facturación de contexto largo (facturación de clave API o suscripción con Uso adicional habilitado).

Sugerencia: configure un **modelo alternativo** para que OpenClaw pueda seguir respondiendo mientras un proveedor está limitado por la velocidad.
Vea [Modelos](/es/cli/models), [OAuth](/es/concepts/oauth) y
[/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/es/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

### ¿Está soportado AWS Bedrock

Sí: a través del proveedor **Amazon Bedrock (Converse)** de pi-ai con **configuración manual**. Debe proporcionar las credenciales/región de AWS en el host de la puerta de enlace y agregar una entrada de proveedor Bedrock en su configuración de modelos. Vea [Amazon Bedrock](/es/providers/bedrock) y [Proveedores de modelos](/es/providers/models). Si prefiere un flujo de claves administradas, un proxy compatible con OpenAI delante de Bedrock sigue siendo una opción válida.

### ¿Cómo funciona la autenticación de Codex

OpenClaw soporta **OpenAI Code (Codex)** a través de OAuth (inicio de sesión de ChatGPT). La incorporación puede ejecutar el flujo de OAuth y establecerá el modelo predeterminado en `openai-codex/gpt-5.4` cuando sea apropiado. Vea [Proveedores de modelos](/es/concepts/model-providers) e [Incorporación (CLI)](/es/start/wizard).

### ¿Soportan la autenticación de suscripción de OpenAI OAuth de Codex

Sí. OpenClaw soporta completamente **OAuth de suscripción de OpenAI Code (Codex)**.
OpenAI permite explícitamente el uso de OAuth de suscripción en herramientas/flujo de trabajo externas
como OpenClaw. La incorporación puede ejecutar el flujo de OAuth por usted.

Vea [OAuth](/es/concepts/oauth), [Proveedores de modelos](/es/concepts/model-providers) e [Incorporación (CLI)](/es/start/wizard).

### ¿Cómo configuro OAuth de CLI Gemini

La CLI de Gemini usa un **flujo de autenticación de complemento**, no una identificación de cliente ni un secreto en `openclaw.json`.

Pasos:

1. Habilite el complemento: `openclaw plugins enable google`
2. Inicio de sesión: `openclaw models auth login --provider google-gemini-cli --set-default`

Esto almacena los tokens OAuth en perfiles de autenticación en el host de la puerta de enlace. Detalles: [Proveedores de modelos](/es/concepts/model-providers).

### ¿Es correcto un modelo local para charlas casuales

Generalmente no. OpenClaw necesita un contexto grande + seguridad fuerte; las tarjetas pequeñas truncan y filtran. Si es necesario, ejecute la compilación **más grande** de MiniMax M2.5 que pueda localmente (LM Studio) y vea [/gateway/local-models](/es/gateway/local-models). Los modelos más pequeños/cuantizados aumentan el riesgo de inyección de prompt: vea [Seguridad](/es/gateway/security).

### ¿Cómo mantengo el tráfico del modelo alojado en una región específica

Elija puntos finales fijados a la región. OpenRouter expone opciones alojadas en EE. UU. para MiniMax, Kimi y GLM; elija la variante alojada en EE. UU. para mantener los datos en la región. Aún puede listar Anthropic/OpenAI junto con estos usando `models.mode: "merge"` para que las alternativas estén disponibles mientras respeta el proveedor regional que seleccione.

### ¿Tengo que comprar un Mac Mini para instalar esto

No. OpenClaw se ejecuta en macOS o Linux (Windows a través de WSL2). Un Mac mini es opcional; algunas personas compran uno como host siempre activo, pero un pequeño VPS, un servidor doméstico o una caja de la clase Raspberry Pi también funciona.

Solo necesitas un Mac **para herramientas exclusivas de macOS**. Para iMessage, usa [BlueBubbles](/es/channels/bluebubbles) (recomendado); el servidor BlueBubbles se ejecuta en cualquier Mac, y la puerta de enlace puede ejecutarse en Linux o en otro lugar. Si deseas otras herramientas exclusivas de macOS, ejecuta la puerta de enlace en un Mac o empareja un nodo macOS.

Documentación: [BlueBubbles](/es/channels/bluebubbles), [Nodos](/es/nodes), [Modo remoto de Mac](/es/platforms/mac/remote).

### ¿Necesito una Mac mini para la compatibilidad con iMessage

Necesitas **algún dispositivo macOS** con sesión iniciada en Mensajes. **No** tiene que ser una Mac mini -
cualquier Mac funciona. **Usa [BlueBubbles](/es/channels/bluebubbles)** (recomendado) para iMessage; el servidor de BlueBubbles se ejecuta en macOS, mientras que el Gateway puede ejecutarse en Linux o en otro lugar.

Configuraciones comunes:

- Ejecuta el Gateway en Linux/VPS y ejecuta el servidor de BlueBubbles en cualquier Mac con sesión iniciada en Mensajes.
- Ejecuta todo en la Mac si quieres la configuración de una sola máquina más sencilla.

Documentación: [BlueBubbles](/es/channels/bluebubbles), [Nodos](/es/nodes),
[Modo remoto de Mac](/es/platforms/mac/remote).

### Si compro una Mac mini para ejecutar OpenClaw, ¿puedo conectarla a mi MacBook Pro

Sí. El **Mac mini puede ejecutar el Gateway**, y su MacBook Pro puede conectarse como un **nodo** (dispositivo complementario). Los nodos no ejecutan el Gateway; proporcionan capacidades adicionales como pantalla/cámara/lienzo y `system.run` en ese dispositivo.

Patrón común:

- Gateway en el Mac mini (siempre activo).
- El MacBook Pro ejecuta la aplicación de macOS o un host de nodo y se empareja con el Gateway.
- Use `openclaw nodes status` / `openclaw nodes list` para verlo.

Documentación: [Nodes](/es/nodes), [Nodes CLI](/es/cli/nodes).

### ¿Puedo usar Bun

Bun **no es recomendable**. Vemos errores de ejecución, especialmente con WhatsApp y Telegram.
Use **Node** para gateways estables.

Si aun así quieres experimentar con Bun, hazlo en un gateway que no sea de producción
sin WhatsApp/Telegram.

### Telegram qué va en allowFrom

`channels.telegram.allowFrom` es **el ID de usuario de Telegram del remitente humano** (numérico). No es el nombre de usuario del bot.

La incorporación acepta entrada de `@username` y la resuelve a un ID numérico, pero la autorización de OpenClaw usa solo IDs numéricos.

Más seguro (sin bot de terceros):

- Envía un mensaje privado a tu bot, luego ejecuta `openclaw logs --follow` y lee `from.id`.

Bot API oficial:

- Envía un mensaje privado a tu bot, luego llama `https://api.telegram.org/bot<bot_token>/getUpdates` y lee `message.from.id`.

Terceros (menos privado):

- Envía un mensaje privado a `@userinfobot` o `@getidsbot`.

Consulta [/channels/telegram](/es/channels/telegram#access-control-dms--groups).

### ¿Pueden varias personas usar un número de WhatsApp con diferentes instancias de OpenClaw

Sí, a través del **enrutamiento multiagente**. Vincula el **mensaje directo (DM)** de WhatsApp de cada remitente (par `kind: "direct"`, remitente E.164 como `+15551234567`) a un `agentId` diferente, de modo que cada persona obtenga su propio espacio de trabajo y almacén de sesiones. Las respuestas aún provienen de la **misma cuenta de WhatsApp**, y el control de acceso de DM (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`) es global por cuenta de WhatsApp. Consulta [Multi-Agent Routing](/es/concepts/multi-agent) y [WhatsApp](/es/channels/whatsapp).

### ¿Puedo ejecutar un agente de chat rápido y un agente Opus para codificación

Sí. Usa el enrutamiento multiagente: asigna a cada agente su propio modelo predeterminado, luego vincula las rutas entrantes (cuenta de proveedor o pares específicos) a cada agente. Un ejemplo de configuración se encuentra en [Multi-Agent Routing](/es/concepts/multi-agent). Consulta también [Models](/es/concepts/models) y [Configuration](/es/gateway/configuration).

### ¿Homebrew funciona en Linux

Sí. Homebrew es compatible con Linux (Linuxbrew). Configuración rápida:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

Si ejecutas OpenClaw a través de systemd, asegúrate de que el PATH del servicio incluya `/home/linuxbrew/.linuxbrew/bin` (o tu prefijo de brew) para que las herramientas instaladas por `brew` se resuelvan en shells no de login.
Las compilaciones recientes también anteponen los directorios bin comunes de usuario en los servicios systemd de Linux (por ejemplo `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) y respetan `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` y `FNM_DIR` cuando están configurados.

### Diferencia entre la instalación hackable de git y la instalación de npm

- **Instalación hackable (git):** descarga completa del código fuente, editable, lo mejor para los colaboradores.
  Ejecutas las compilaciones localmente y puedes parchear código/documentación.
- **Instalación de npm:** instalación global de CLI, sin repositorio, lo mejor para "simplemente ejecútalo".
  Las actualizaciones provienen de las dist-tags de npm.

Documentación: [Primeros pasos](/es/start/getting-started), [Actualización](/es/install/updating).

### ¿Puedo cambiar entre instalaciones npm y git más tarde?

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

Consejos de copia de seguridad: consulta [Estrategia de copia de seguridad](/es/help/faq#recommended-backup-strategy).

### ¿Debo ejecutar la puerta de enlace en mi portátil o en un VPS?

Respuesta corta: **si deseas confiabilidad 24/7, usa un VPS**. Si quieres la
menor fricción y estás bien con los reinicios/suspensiones, ejecútalo localmente.

**Portátil (puerta de enlace local)**

- **Ventajas:** sin coste de servidor, acceso directo a archivos locales, ventana del navegador en vivo.
- **Contras:** suspensión/caídas de red = desconexiones, las actualizaciones/reinicios del sistema operativo interrumpen, debe permanecer encendido.

**VPS / nube**

- **Ventajas:** siempre activo, red estable, sin problemas de suspensión del portátil, más fácil de mantener en ejecución.
- **Contras:** a menudo se ejecutan sin cabeza (usa capturas de pantalla), acceso a archivos solo de forma remota, debes usar SSH para las actualizaciones.

**Nota específica de OpenClaw:** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord funcionan bien desde un VPS. El único compromiso real es **navegador sin cabeza** frente a una ventana visible. Consulte [Browser](/es/tools/browser).

**Recomendado por defecto:** VPS si ha tenido desconexiones de la puerta de enlace antes. Local es excelente cuando está usando activamente el Mac y desea acceso a archivos locales o automatización de la interfaz de usuario con un navegador visible.

### Qué tan importante es ejecutar OpenClaw en una máquina dedicada

No es obligatorio, pero **recomendado para mayor confiabilidad y aislamiento**.

- **Host dedicado (VPS/Mac mini/Pi):** siempre activo, menos interrupciones de suspensión/reinicio, permisos más limpios, más fácil de mantener en funcionamiento.
- **Portátil/escritorio compartido:** totalmente bien para pruebas y uso activo, pero espere pausas cuando la máquina se suspenda o se actualice.

Si desea lo mejor de ambos mundos, mantenga la puerta de enlace en un host dedicado y empareje su portátil como un **nodo** para herramientas de pantalla/cámara/exec locales. Consulte [Nodes](/es/nodes).
Para obtener orientación sobre seguridad, lea [Security](/es/gateway/security).

### Cuáles son los requisitos mínimos de VPS y el sistema operativo recomendado

OpenClaw es ligero. Para una puerta de enlace básica + un canal de chat:

- **Mínimo absoluto:** 1 vCPU, 1GB de RAM, ~500MB de disco.
- **Recomendado:** 1-2 vCPU, 2GB de RAM o más para margen de maniobra (registros, medios, múltiples canales). Las herramientas de nodos y la automatización del navegador pueden consumir muchos recursos.

SO: use **Ubuntu LTS** (o cualquier Debian/Ubuntu moderno). La ruta de instalación de Linux se prueba mejor allí.

Documentos: [Linux](/es/platforms/linux), [VPS hosting](/es/vps).

### Puedo ejecutar OpenClaw en una VM y cuáles son los requisitos

Sí. Trate una VM igual que un VPS: debe estar siempre activa, ser accesible y tener suficiente
RAM para la puerta de enlace y cualquier canal que habilite.

Orientación de base:

- **Mínimo absoluto:** 1 vCPU, 1GB de RAM.
- **Recomendado:** 2GB de RAM o más si ejecuta múltiples canales, automatización del navegador o herramientas de medios.
- **SO:** Ubuntu LTS u otro Debian/Ubuntu moderno.

Si estás en Windows, **WSL2 es la configuración estilo VM más fácil** y tiene la mejor compatibilidad de herramientas.
Consulta [Windows](/es/platforms/windows), [VPS hosting](/es/vps).
Si estás ejecutando macOS en una VM, consulta [macOS VM](/es/install/macos-vm).

## ¿Qué es OpenClaw?

### Qué es OpenClaw en un párrafo

OpenClaw es un asistente de IA personal que ejecutas en tus propios dispositivos. Responde en las superficies de mensajería que ya usas (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) y también puede hacer voz + un Canvas en vivo en las plataformas compatibles. El **Gateway** es el plano de control siempre activo; el asistente es el producto.

### Propuesta de valor

OpenClaw no es "solo un contenedor de Claude". Es un **plano de control con prioridad local** que te permite ejecutar un
asistente capaz en **tu propio hardware**, accesible desde las aplicaciones de chat que ya usas, con
sesiones con estado, memoria y herramientas, sin entregar el control de tus flujos de trabajo a un SaaS alojado.

Aspectos destacados:

- **Tus dispositivos, tus datos:** ejecuta el Gateway donde quieras (Mac, Linux, VPS) y mantén el
  espacio de trabajo + el historial de sesiones local.
- **Canales reales, no un entorno de pruebas web:** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc.,
  además de voz móvil y Canvas en plataformas compatibles.
- **Agnóstico a modelos:** usa Anthropic, OpenAI, MiniMax, OpenRouter, etc., con enrutamiento
  por agente y conmutación por error.
- **Opción solo local:** ejecuta modelos locales para que **todos los datos pueden permanecer en tu dispositivo** si lo deseas.
- **Enrutamiento multiagente:** agentes separados por canal, cuenta o tarea, cada uno con su propio
  espacio de trabajo y valores predeterminados.
- **Código abierto y modificable:** inspecciona, extiende y autoaloja sin bloqueo de proveedor.

Documentación: [Gateway](/es/gateway), [Canales](/es/channels), [Multiagente](/es/concepts/multi-agent),
[Memoria](/es/concepts/memory).

### Acabo de configurarlo, ¿qué debería hacer primero

Buenos primeros proyectos:

- Crear un sitio web (WordPress, Shopify o un sitio estático simple).
- Prototipar una aplicación móvil (esquema, pantallas, plan de API).
- Organizar archivos y carpetas (limpieza, nombres, etiquetado).
- Conectar Gmail y automatizar resúmenes o seguimientos.

Puede manejar tareas grandes, pero funciona mejor cuando las divides en fases y
usas subagentes para el trabajo en paralelo.

### ¿Cuáles son los cinco principales casos de uso cotidianos para OpenClaw

Los logros cotidianos generalmente se ven así:

- **Informes personales:** resúmenes de la bandeja de entrada, el calendario y las noticias que le interesan.
- **Investigación y redacción:** investigación rápida, resúmenes y primeros borradores para correos electrónicos o documentos.
- **Recordatorios y seguimientos:** recordatorios y listas de verificación impulsados por cron o latidos.
- **Automatización del navegador:** completar formularios, recopilar datos y repetir tareas web.
- **Coordinación entre dispositivos:** envíe una tarea desde su teléfono, deje que el Gateway la ejecute en un servidor y obtenga el resultado de nuevo en el chat.

### ¿Puede OpenClaw ayudar con la generación de contactos prospecto, anuncios y blogs para un SaaS

Sí para **investigación, calificación y redacción**. Puede escanear sitios, crear listas cortas,
resumir prospectos y escribir borradores de textos de divulgación o anuncios.

Para **campañas de divulgación o anuncios**, mantenga a una persona en el ciclo. Evite el spam, cumpla con las leyes locales y
las políticas de la plataforma, y revise todo antes de enviarlo. El patrón más seguro es dejar
que OpenClaw redacte y usted apruebe.

Documentos: [Seguridad](/es/gateway/security).

### ¿Cuáles son las ventajas frente a Claude Code para el desarrollo web

OpenClaw es un **asistente personal** y una capa de coordinación, no un reemplazo del IDE. Use
Claude Code o Codex para el ciclo de codificación directa más rápido dentro de un repositorio. Use OpenClaw cuando desee
memoria duradera, acceso entre dispositivos y orquestación de herramientas.

Ventajas:

- **Memoria persistente + espacio de trabajo** a través de sesiones
- **Acceso multiplataforma** (WhatsApp, Telegram, TUI, WebChat)
- **Orquestación de herramientas** (navegador, archivos, programación, enlaces)
- **Gateway siempre activo** (ejecutar en un VPS, interactuar desde cualquier lugar)
- **Nodos** para navegador/pantalla/cámara/exec local

Demostración: [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

## Habilidades y automatización

### ¿Cómo personalizo las habilidades sin dejar el repositorio sucio

Use anulaciones administradas en lugar de editar la copia del repositorio. Ponga sus cambios en `~/.openclaw/skills/<name>/SKILL.md` (o agregue una carpeta a través de `skills.load.extraDirs` en `~/.openclaw/openclaw.json`). La precedencia es `<workspace>/skills` > `~/.openclaw/skills` > incluido, por lo que las anulaciones administradas ganan sin tocar git. Solo las ediciones dignas de upstream deben vivir en el repositorio y salir como PR.

### ¿Puedo cargar habilidades desde una carpeta personalizada

Sí. Añada directorios adicionales a través de `skills.load.extraDirs` en `~/.openclaw/openclaw.json` (menor precedencia). La precedencia predeterminada se mantiene: `<workspace>/skills` → `~/.openclaw/skills` → empaquetado → `skills.load.extraDirs`. `clawhub` se instala en `./skills` de forma predeterminada, lo que OpenClaw trata como `<workspace>/skills`.

### ¿Cómo puedo usar diferentes modelos para diferentes tareas

Hoy los patrones compatibles son:

- **Cron jobs**: los trabajos aislados pueden establecer una anulación de `model` por trabajo.
- **Sub-agentes**: enruta tareas a agentes separados con diferentes modelos predeterminados.
- **Cambio bajo demanda**: use `/model` para cambiar el modelo de la sesión actual en cualquier momento.

Consulte [Cron jobs](/es/automation/cron-jobs), [Multi-Agent Routing](/es/concepts/multi-agent) y [Slash commands](/es/tools/slash-commands).

### El bot se congela mientras realiza un trabajo intensivo. ¿Cómo puedo descargar eso

Use **sub-agentes** para tareas largas o paralelas. Los sub-agentes se ejecutan en su propia sesión,
devuelven un resumen y mantienen su chat principal responsivo.

Pida a su bot que "genere un sub-agente para esta tarea" o use `/subagents`.
Use `/status` en el chat para ver qué está haciendo el Gateway ahora mismo (y si está ocupado).

Consejo sobre tokens: las tareas largas y los sub-agentes consumen tokens. Si el costo es una preocupación, establezca un
modelo más barato para los sub-agentes a través de `agents.defaults.subagents.model`.

Documentación: [Sub-agentes](/es/tools/subagents).

### ¿Cómo funcionan las sesiones de sub-agente vinculadas a hilos en Discord

Use enlaces de hilos. Puede vincular un hilo de Discord a un sub-agente o objetivo de sesión para que los mensajes de seguimiento en ese hilo se mantengan en esa sesión vinculada.

Flujo básico:

- Genere con `sessions_spawn` usando `thread: true` (y opcionalmente `mode: "session"` para seguimiento persistente).
- O vincule manualmente con `/focus <target>`.
- Use `/agents` para inspeccionar el estado del enlace.
- Use `/session idle <duration|off>` y `/session max-age <duration|off>` para controlar el auto-enfoque.
- Use `/unfocus` para desvincular el hilo.

Configuración requerida:

- Valores predeterminados globales: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
-  anulaciones de Discord: `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
- Vinculación automática al generar: establezca `channels.discord.threadBindings.spawnSubagentSessions: true`.

Documentos: [Sub-agentes](/es/tools/subagents), [Discord](/es/channels/discord), [Referencia de configuración](/es/gateway/configuration-reference), [Comandos de barra](/es/tools/slash-commands).

### Cron o recordatorios no se ejecutan ¿Qué debería verificar

Cron se ejecuta dentro del proceso Gateway. Si el Gateway no se está ejecutando continuamente,
los trabajos programados no se ejecutarán.

Lista de verificación:

- Confirme que cron está habilitado (`cron.enabled`) y `OPENCLAW_SKIP_CRON` no está establecido.
- Verifique que el Gateway se esté ejecutando las 24 horas, los 7 días (sin suspensión/reinicios).
- Verifique la configuración de zona horaria del trabajo (`--tz` vs zona horaria del host).

Depuración:

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

Documentos: [Trabajos de Cron](/es/automation/cron-jobs), [Cron vs Heartbeat](/es/automation/cron-vs-heartbeat).

### ¿Cómo instalo habilidades en Linux

Use **ClawHub** (CLI) o coloque habilidades en su espacio de trabajo. La interfaz de usuario de habilidades de macOS no está disponible en Linux.
Explore habilidades en [https://clawhub.com](https://clawhub.com).

Instale el CLI de ClawHub (elija un administrador de paquetes):

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### ¿Puede OpenClaw ejecutar tareas según un horario o continuamente en segundo plano

Sí. Use el programador de Gateway:

- **Trabajos de Cron** para tareas programadas o recurrentes (persisten tras los reinicios).
- **Heartbeat** para verificaciones periódicas de la "sesión principal".
- **Trabajos aislados** para agentes autónomos que publican resúmenes o envían mensajes a chats.

Documentos: [Trabajos de Cron](/es/automation/cron-jobs), [Cron vs Heartbeat](/es/automation/cron-vs-heartbeat),
[Heartbeat](/es/gateway/heartbeat).

### ¿Puedo ejecutar habilidades exclusivas de Apple macOS desde Linux?

No directamente. Las habilidades de macOS están limitadas por `metadata.openclaw.os` más los binarios requeridos, y las habilidades solo aparecen en el prompt del sistema cuando son elegibles en el **host Gateway**. En Linux, las habilidades solo de `darwin` (como `apple-notes`, `apple-reminders`, `things-mac`) no se cargarán a menos que anule la limitación.

Tiene tres patrones admitidos:

**Opción A: ejecutar el Gateway en una Mac (lo más sencillo).**
Ejecute el Gateway donde existen los binarios de macOS y luego conéctese desde Linux en [modo remoto](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere) o a través de Tailscale. Las habilidades se cargan normalmente porque el host del Gateway es macOS.

**Opción B: usar un nodo macOS (sin SSH).**
Ejecute el Gateway en Linux, empareje un nodo macOS (aplicación de barra de menús) y configure **Node Run Commands** en "Preguntar siempre" o "Permitir siempre" en la Mac. OpenClaw puede tratar las habilidades exclusivas de macOS como elegibles cuando los binarios requeridos existen en el nodo. El agente ejecuta esas habilidades a través de la herramienta `nodes`. Si elige "Preguntar siempre", aprobar "Permitir siempre" en el mensaje añade ese comando a la lista de permitidos.

**Opción C: proxy de binarios macOS a través de SSH (avanzado).**
Mantenga el Gateway en Linux, pero haga que los binarios CLI necesarios se resuelvan a envoltorios SSH que se ejecutan en una Mac. Luego anule la habilidad para permitir Linux para que siga siendo elegible.

1. Cree un envoltorio SSH para el binario (ejemplo: `memo` para Apple Notes):

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
   ```

2. Coloque el envoltorio en `PATH` en el host de Linux (por ejemplo `~/bin/memo`).
3. Anule los metadatos de la habilidad (espacio de trabajo o `~/.openclaw/skills`) para permitir Linux:

   ```markdown
   ---
   name: apple-notes
   description: Manage Apple Notes via the memo CLI on macOS.
   metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
   ---
   ```

4. Inicie una nueva sesión para que se actualice la instantánea de habilidades.

### ¿Tiene una integración con Notion o HeyGen

No está integrado hoy en día.

Opciones:

- **Habilidad / complemento personalizado:** lo mejor para un acceso confiable a la API (tanto Notion como HeyGen tienen API).
- **Automatización del navegador:** funciona sin código, pero es más lenta y más frágil.

Si desea mantener el contexto por cliente (flujos de trabajo de agencia), un patrón simple es:

- Una página de Notion por cliente (contexto + preferencias + trabajo activo).
- Pida al agente que obtenga esa página al inicio de una sesión.

Si desea una integración nativa, abra una solicitud de función o cree una habilidad
orientada a esas API.

Instalar habilidades:

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub se instala en `./skills` en tu directorio actual (o recurre a tu espacio de trabajo OpenClaw configurado); OpenClaw lo trata como `<workspace>/skills` en la siguiente sesión. Para habilidades compartidas entre agentes, colócalas en `~/.openclaw/skills/<name>/SKILL.md`. Algunas habilidades esperan binarios instalados a través de Homebrew; en Linux eso significa Linuxbrew (consulta la entrada de Homebrew Linux FAQ anterior). Consulta [Skills](/es/tools/skills) y [ClawHub](/es/tools/clawhub).

### ¿Cómo uso mi Chrome existente con la sesión iniciada con OpenClaw?

Usa el perfil de navegador `user` integrado, que se conecta a través de Chrome DevTools MCP:

```bash
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot
```

Si quieres un nombre personalizado, crea un perfil MCP explícito:

```bash
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser --browser-profile chrome-live tabs
```

Esta ruta es local del host. Si el Gateway se ejecuta en otro lugar, ejecuta un host de nodo en la máquina del navegador o usa CDP remoto en su lugar.

## Sandboxing y memoria

### ¿Existe alguna documentación dedicada al sandboxing

Sí. Consulta [Sandboxing](/es/gateway/sandboxing). Para una configuración específica de Docker (gateway completo en Docker o imágenes de sandbox), consulta [Docker](/es/install/docker).

### Docker se siente limitado ¿Cómo habilito todas las funciones

La imagen predeterminada prioriza la seguridad y se ejecuta como el usuario `node`, por lo que no incluye
paquetes del sistema, Homebrew o navegadores incluidos. Para una configuración más completa:

- Mantén `/home/node` con `OPENCLAW_HOME_VOLUME` para que las cachés sobrevivan.
- Incorpora dependencias del sistema a la imagen con `OPENCLAW_DOCKER_APT_PACKAGES`.
- Instala los navegadores Playwright a través de la CLI incluida:
  `node /app/node_modules/playwright-core/cli.js install chromium`
- Establece `PLAYWRIGHT_BROWSERS_PATH` y asegúrate de que la ruta se mantenga.

Documentación: [Docker](/es/install/docker), [Browser](/es/tools/browser).

**¿Puedo mantener los MD personales pero hacer que los grupos sean públicos con un agente en sandbox**

Sí, si tu tráfico privado son los **MD** y tu tráfico público son los **grupos**.

Usa `agents.defaults.sandbox.mode: "non-main"` para que las sesiones de grupo/canal (claves no principales) se ejecuten en Docker, mientras que la sesión principal de MD se mantiene en el host. Luego restringe qué herramientas están disponibles en las sesiones en sandbox a través de `tools.sandbox.tools`.

Tutorial de configuración + ejemplo de configuración: [Groups: personal DMs + public groups](/es/channels/groups#pattern-personal-dms-public-groups-single-agent)

Referencia clave de configuración: [Gateway configuration](/es/gateway/configuration#agentsdefaultssandbox)

### How do I bind a host folder into the sandbox

Establezca `agents.defaults.sandbox.docker.binds` en `["host:path:mode"]` (p. ej., `"/home/user/src:/src:ro"`). Los enlaces globales + por agente se fusionan; los enlaces por agente se ignoran cuando `scope: "shared"`. Use `:ro` para cualquier cosa sensible y recuerde que los enlaces omiten las paredes del sistema de archivos del sandbox. Consulte [Sandboxing](/es/gateway/sandboxing#custom-bind-mounts) y [Sandbox vs Tool Policy vs Elevated](/es/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) para ver ejemplos y notas de seguridad.

### How does memory work

La memoria de OpenClaw son solo archivos Markdown en el espacio de trabajo del agente:

- Notas diarias en `memory/YYYY-MM-DD.md`
- Notas curadas a largo plazo en `MEMORY.md` (solo sesiones principales/privadas)

OpenClaw también ejecuta un **flush de memoria de precompactación silenciosa** para recordarle al modelo
que escriba notas duraderas antes de la autocompactación. Esto solo se ejecuta cuando el espacio de trabajo
es escribible (los sandboxes de solo lectura lo omiten). Consulte [Memory](/es/concepts/memory).

### Memory keeps forgetting things How do I make it stick

Pídale al bot que **escriba el hecho en la memoria**. Las notas a largo plazo pertenecen a `MEMORY.md`,
el contexto a corto plazo va en `memory/YYYY-MM-DD.md`.

Esta es todavía un área que estamos mejorando. Ayuda recordar al modelo que almacene memorias;
él sabrá qué hacer. Si sigue olvidando, verifique que el Gateway esté usando el mismo
espacio de trabajo en cada ejecución.

Documentos: [Memory](/es/concepts/memory), [Agent workspace](/es/concepts/agent-workspace).

### Does semantic memory search require an OpenAI API key

Solo si usa **embeddings de OpenAI**. Codex OAuth cubre chat/completions y
**no** concede acceso a embeddings, por lo que **iniciar sesión con Codex (OAuth o el
inicio de sesión de CLI de Codex)** no ayuda para la búsqueda de memoria semántica. Los embeddings de OpenAI
aún necesitan una clave de API real (`OPENAI_API_KEY` o `models.providers.openai.apiKey`).

Si no establece un proveedor explícitamente, OpenClaw selecciona automáticamente un proveedor cuando
puede resolver una clave de API (perfiles de autenticación, `models.providers.*.apiKey`, o variables de entorno).
Prefiere OpenAI si se resuelve una clave de OpenAI; de lo contrario, Gemini si se resuelve una clave de Gemini,
luego Voyage y luego Mistral. Si no hay ninguna clave remota disponible, la búsqueda de memoria
permanece deshabilitada hasta que la configure. Si tiene una ruta de modelo local
configurada y presente, OpenClaw
prefiere `local`. Ollama es compatible cuando establece explícitamente
`memorySearch.provider = "ollama"`.

Si prefieres quedarte local, establece `memorySearch.provider = "local"` (y opcionalmente
`memorySearch.fallback = "none"`). Si quieres embeddings de Gemini, establece
`memorySearch.provider = "gemini"` y proporciona `GEMINI_API_KEY` (o
`memorySearch.remote.apiKey`). Admitimos modelos de embedding **OpenAI, Gemini, Voyage, Mistral, Ollama o locales**; consulta [Memoria](/es/concepts/memory) para obtener detalles de la configuración.

### ¿La memoria persiste para siempre? ¿Cuáles son los límites

Los archivos de memoria residen en el disco y persisten hasta que los eliminas. El límite es tu
almacenamiento, no el modelo. El **contexto de la sesión** todavía está limitado por la ventana
de contexto del modelo, por lo que las conversaciones largas pueden compactarse o truncarse. Por eso
existe la búsqueda en memoria: recupera solo las partes relevantes al contexto.

Documentos: [Memoria](/es/concepts/memory), [Contexto](/es/concepts/context).

## Dónde residen las cosas en el disco

### ¿Se guardan localmente todos los datos utilizados con OpenClaw?

No: **el estado de OpenClaw es local**, pero **los servicios externos todavía ven lo que les envías**.

- **Local de forma predeterminada:** las sesiones, los archivos de memoria, la configuración y el espacio de trabajo residen en el host del Gateway
  (`~/.openclaw` + tu directorio de espacio de trabajo).
- **Remoto por necesidad:** los mensajes que envías a los proveedores de modelos (Anthropic/OpenAI/etc.) van a
  sus API, y las plataformas de chat (WhatsApp/Telegram/Slack/etc.) almacenan los datos de los mensajes en sus
  servidores.
- **Tú controlas la huella:** el uso de modelos locales mantiene los mensajes en tu máquina, pero el tráfico
  del canal todavía pasa a través de los servidores del canal.

Relacionado: [Espacio de trabajo del agente](/es/concepts/agent-workspace), [Memoria](/es/concepts/memory).

### ¿Dónde almacena OpenClaw sus datos?

Todo reside bajo `$OPENCLAW_STATE_DIR` (predeterminado: `~/.openclaw`):

| Ruta                                                            | Propósito                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `$OPENCLAW_STATE_DIR/openclaw.json`                             | Configuración principal (JSON5)                                                |
| `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importación heredada de OAuth (copiada en los perfiles de autenticación en el primer uso)       |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Perfiles de autenticación (OAuth, claves de API y `keyRef`/`tokenRef` opcionales)  |
| `$OPENCLAW_STATE_DIR/secrets.json`                              | Carga secreta opcional respaldada en archivo para proveedores `file` SecretRef |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Archivo de compatibilidad heredada (entradas estáticas `api_key` depuradas)      |
| `$OPENCLAW_STATE_DIR/credentials/`                              | Estado del proveedor (por ejemplo, `whatsapp/<accountId>/creds.json`)            |
| `$OPENCLAW_STATE_DIR/agents/`                                   | Estado por agente (agentDir + sesiones)                              |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historial y estado de la conversación (por agente)                           |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Metadatos de la sesión (por agente)                                       |

Ruta de agente único heredada: `~/.openclaw/agent/*` (migrada por `openclaw doctor`).

Su **espacio de trabajo** (AGENTS.md, archivos de memoria, habilidades, etc.) está separado y se configura a través de `agents.defaults.workspace` (predeterminado: `~/.openclaw/workspace`).

### ¿Dónde deben vivir AGENTSmd SOULmd USERmd MEMORYmd?

Estos archivos residen en el **espacio de trabajo del agente**, no en `~/.openclaw`.

- **Espacio de trabajo (por agente)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
  `MEMORY.md` (o alternativa heredada `memory.md` cuando `MEMORY.md` está ausente),
  `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` opcional.
- **Directorio de estado (`~/.openclaw`)**: configuración, credenciales, perfiles de autenticación, sesiones, registros,
  y habilidades compartidas (`~/.openclaw/skills`).

El espacio de trabajo predeterminado es `~/.openclaw/workspace`, configurable a través de:

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

Si el bot "olvida" después de reiniciar, confirme que la Gateway está usando el mismo
espacio de trabajo en cada inicio (y recuerde: el modo remoto usa el espacio de trabajo
**del host de la gateway**, no de su computadora portátil local).

Sugerencia: si desea un comportamiento o preferencia duraderos, pida al bot que **lo escriba en
AGENTS.md o MEMORY.md** en lugar de confiar en el historial de chat.

Consulte [Espacio de trabajo del agente](/es/concepts/agent-workspace) y [Memoria](/es/concepts/memory).

### Estrategia de respaldo recomendada

Coloque su **espacio de trabajo del agente** en un repositorio git **privado** y respáldelo en algún lugar
privado (por ejemplo, GitHub privado). Esto captura la memoria + los archivos AGENTS/SOUL/USER
y le permite restaurar la "mente" del asistente más tarde.

**No** confirme nada en `~/.openclaw` (credenciales, sesiones, tokens o cargas útiles de secretos cifrados).
Si necesita una restauración completa, haga una copia de seguridad tanto del espacio de trabajo como del directorio de estado
por separado (vea la pregunta sobre migración anterior).

Documentación: [Espacio de trabajo del agente](/es/concepts/agent-workspace).

### ¿Cómo desinstalo OpenClaw completamente?

Consulte la guía dedicada: [Desinstalar](/es/install/uninstall).

### ¿Pueden los agentes trabajar fuera del espacio de trabajo?

Sí. El espacio de trabajo es el **cwd predeterminado** y el ancla de memoria, no un sandbox estricto.
Las rutas relativas se resuelven dentro del espacio de trabajo, pero las rutas absolutas pueden acceder a otras
ubicaciones del host a menos que se habilite el sandbox. Si necesita aislamiento, use
[`agents.defaults.sandbox`](/es/gateway/sandboxing) o la configuración de sandbox por agente. Si
quiere que un repositorio sea el directorio de trabajo predeterminado, apunte el
`workspace` de ese agente a la raíz del repositorio. El repositorio de OpenClaw es solo código fuente; mantenga el
espacio de trabajo separado a menos que intencionalmente quiera que el agente trabaje dentro de él.

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

El estado de la sesión es propiedad del **host de la puerta de enlace**. Si está en modo remoto, el almacén de sesiones que le importa está en la máquina remota, no en su computadora portátil local. Vea [Gestión de sesiones](/es/concepts/session).

## Conceptos básicos de configuración

### ¿Qué formato tiene la configuración? ¿Dónde está?

OpenClaw lee una configuración opcional de **JSON5** desde `$OPENCLAW_CONFIG_PATH` (predeterminado: `~/.openclaw/openclaw.json`):

```
$OPENCLAW_CONFIG_PATH
```

Si falta el archivo, usa valores predeterminados seguros (incluido un espacio de trabajo predeterminado de `~/.openclaw/workspace`).

### Configuré gatewaybind en lan o tailnet y ahora nada escucha, la interfaz dice no autorizado

Los enlaces no locales de bucle **requieren autenticación**. Configure `gateway.auth.mode` + `gateway.auth.token` (o use `OPENCLAW_GATEWAY_TOKEN`).

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

- `gateway.remote.token` / `.password` **no** habilitan la autenticación de la puerta de enlace local por sí mismos.
- Las rutas de llamadas locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está establecido.
- Si `gateway.auth.token` / `gateway.auth.password` está configurado explícitamente mediante SecretRef y no resuelto, la resolución falla cerrada (sin enmascaramiento de alternativa remota).
- La interfaz de usuario de Control se autentica mediante `connect.params.auth.token` (almacenado en la configuración de la aplicación/interfaz). Evite poner tokens en URL.

### ¿Por qué necesito un token en localhost ahora?

OpenClaw impone la autenticación por token de forma predeterminada, incluido el bucle local. Si no se configura ningún token, el inicio de la puerta de enlace genera uno automáticamente y lo guarda en `gateway.auth.token`, por lo que **los clientes WS locales deben autenticarse**. Esto bloquea que otros procesos locales llamen a la puerta de enlace.

Si **realmente** quiere un bucle local abierto, establezca `gateway.auth.mode: "none"` explícitamente en su configuración. Doctor puede generar un token para usted en cualquier momento: `openclaw doctor --generate-gateway-token`.

### ¿Tengo que reiniciar después de cambiar la configuración?

La Gateway observa la configuración y admite la recarga en caliente:

- `gateway.reload.mode: "hybrid"` (predeterminado): aplica cambios seguros en caliente, reinicia para los críticos
- `hot`, `restart`, `off` también son compatibles

### ¿Cómo desactivo los lemas divertidos de la CLI?

Establezca `cli.banner.taglineMode` en la configuración:

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `off`: oculta el texto de la etiqueta pero mantiene la línea de título/versión del banner.
- `default`: usa `All your chats, one OpenClaw.` cada vez.
- `random`: etiquetas divertidas/temporales rotativas (comportamiento predeterminado).
- Si no desea ningún banner, establezca el env `OPENCLAW_HIDE_BANNER=1`.

### ¿Cómo habilito la búsqueda web y la obtención web

`web_fetch` funciona sin una clave de API. `web_search` requiere una clave para su
proveedor seleccionado (Brave, Gemini, Grok, Kimi o Perplexity).
**Recomendado:** ejecute `openclaw configure --section web` y elija un proveedor.
Alternativas de entorno:

- Brave: `BRAVE_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` o `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` o `OPENROUTER_API_KEY`

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        maxResults: 5,
      },
      fetch: {
        enabled: true,
      },
    },
  },
}
```

La configuración de búsqueda web específica del proveedor ahora se encuentra en `plugins.entries.<plugin>.config.webSearch.*`.
Las rutas de proveedor heredadas `tools.web.search.*` todavía se cargan temporalmente por compatibilidad, pero no deben usarse en configuraciones nuevas.

Notas:

- Si usa listas de permitidos, agregue `web_search`/`web_fetch` o `group:web`.
- `web_fetch` está habilitado de forma predeterminada (a menos que se deshabilite explícitamente).
- Los demonios leen las variables de entorno de `~/.openclaw/.env` (o el entorno de servicio).

Documentación: [Herramientas web](/es/tools/web).

### ¿Cómo ejecuto una pasarela central con trabajadores especializados en varios dispositivos?

El patrón común es **una pasarela** (p. ej., Raspberry Pi) más **nodos** y **agentes**:

- **Pasarela (central):** posee canales (Signal/WhatsApp), enrutamiento y sesiones.
- **Nodos (dispositivos):** Mac/iOS/Android se conectan como periféricos y exponen herramientas locales (`system.run`, `canvas`, `camera`).
- **Agentes (trabajadores):** cerebros/espacios de trabajo separados para roles especiales (p. ej., "Hetzner ops", "Datos personales").
- **Subagentes:** generan trabajo en segundo plano desde un agente principal cuando se desea paralelismo.
- **TUI:** conéctese a la Gateway y cambie de agentes/sesiones.

Documentación: [Nodos](/es/nodes), [Acceso remoto](/es/gateway/remote), [Enrutamiento Multiagente](/es/concepts/multi-agent), [Subagentes](/es/tools/subagents), [TUI](/es/web/tui).

### ¿El navegador OpenClaw puede ejecutarse en modo headless?

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

El valor predeterminado es `false` (con interfaz gráfica). El modo headless es más probable que active comprobaciones anti-bot en algunos sitios. Consulte [Navegador](/es/tools/browser).

El modo headless usa el **mismo motor Chromium** y funciona para la mayoría de las automatizaciones (formularios, clics, scraping, inicios de sesión). Las principales diferencias:

- No hay una ventana de navegador visible (use capturas de pantalla si necesita elementos visuales).
- Algunos sitios son más estrictos con la automatización en modo headless (CAPTCHAs, anti-bot).
  Por ejemplo, X/Twitter a menudo bloquea las sesiones headless.

### ¿Cómo uso Brave para el control del navegador?

Establezca `browser.executablePath` en su binario de Brave (o cualquier navegador basado en Chromium) y reinicie la Gateway.
Vea los ejemplos de configuración completos en [Navegador](/es/tools/browser#use-brave-or-another-chromium-based-browser).

## Gateways y nodos remotos

### ¿Cómo se propagan los comandos entre Telegram, la gateway y los nodos?

Los mensajes de Telegram son manejados por la **gateway**. La gateway ejecuta el agente y
solo entonces llama a los nodos a través del **Gateway WebSocket** cuando se necesita una herramienta de nodo:

Telegram → Gateway → Agente → `node.*` → Nodo → Gateway → Telegram

Los nodos no ven el tráfico entrante del proveedor; solo reciben llamadas RPC de nodo.

### ¿Cómo puede mi agente acceder a mi computadora si la Gateway está alojada de forma remota?

Respuesta corta: **empareje su computadora como un nodo**. La Gateway se ejecuta en otro lugar, pero puede
llamar a herramientas `node.*` (pantalla, cámara, sistema) en su máquina local a través del Gateway WebSocket.

Configuración típica:

1. Ejecute la Gateway en el host activo (VPS/servidor doméstico).
2. Ponga el host de la Gateway + su computadora en la misma tailnet.
3. Asegúrese de que el WS de la Gateway sea accesible (enlace tailnet o túnel SSH).
4. Abra la aplicación de macOS localmente y conéctese en el modo **Remote over SSH** (o tailnet directo)
   para que pueda registrarse como un nodo.
5. Aprobar el nodo en la Gateway:

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

No se requiere un puente TCP separado; los nodos se conectan a través del WebSocket de la Gateway.

Recordatorio de seguridad: emparejar un nodo macOS permite `system.run` en esa máquina. Solo
empareje dispositivos que confíe y revise [Seguridad](/es/gateway/security).

Documentación: [Nodos](/es/nodes), [Protocolo de Gateway](/es/gateway/protocol), [Modo remoto de macOS](/es/platforms/mac/remote), [Seguridad](/es/gateway/security).

### Tailscale está conectado pero no recibo respuestas ¿Qué ahora

Verifique lo básico:

- La Gateway se está ejecutando: `openclaw gateway status`
- Salud de la Gateway: `openclaw status`
- Salud del canal: `openclaw channels status`

Luego verifique la autenticación y el enrutamiento:

- Si usa Tailscale Serve, asegúrese de que `gateway.auth.allowTailscale` esté configurado correctamente.
- Si se conecta a través de un túnel SSH, confirme que el túnel local esté activo y apunte al puerto correcto.
- Confirme que sus listas de permitidos (DM o grupo) incluyan su cuenta.

Documentación: [Tailscale](/es/gateway/tailscale), [Acceso remoto](/es/gateway/remote), [Canales](/es/channels).

### ¿Pueden dos instancias de OpenClaw comunicarse entre sí VPS local

Sí. No hay ningún puente "bot-to-bot" integrado, pero puede configurarlo de algunas
maneras confiables:

**Lo más sencillo:** use un canal de chat normal al que ambos bots puedan acceder (Telegram/Slack/WhatsApp).
Haga que el Bot A envíe un mensaje al Bot B y luego deje que el Bot B responda como de costumbre.

**Puente CLI (genérico):** ejecute un script que llame a la otra Gateway con
`openclaw agent --message ... --deliver`, apuntando a un chat donde el otro bot
escuche. Si un bot está en un VPS remoto, apunte su CLI a esa Gateway remota
a través de SSH/Tailscale (ver [Acceso remoto](/es/gateway/remote)).

Patrón de ejemplo (ejecutar desde una máquina que pueda alcanzar la Gateway de destino):

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

Consejo: añada una restricción para que los dos bots no entren en un bucle infinito (solo menciones, listas
de permitidos del canal, o una regla de "no responder a mensajes de bots").

Documentación: [Acceso remoto](/es/gateway/remote), [CLI del agente](/es/cli/agent), [Envío del agente](/es/tools/agent-send).

### ¿Necesito VPS separados para múltiples agentes?

No. Una única pasarela (Gateway) puede alojar múltiples agentes, cada uno con su propio espacio de trabajo, valores predeterminados de modelo y enrutamiento. Esa es la configuración normal y es mucho más barata y sencilla que ejecutar un VPS por agente.

Use VPS separados solo cuando necesite un aislamiento estricto (límites de seguridad) o configuraciones muy diferentes que no desee compartir. De lo contrario, mantenga una única pasarela y utilice múltiples agentes o sub-agentes.

### ¿Hay algún beneficio en usar un nodo en mi laptop personal en lugar de SSH desde un VPS?

Sí: los nodos son la forma principal de alcanzar su laptop desde una pasarela remota y desbloquean más que el acceso al shell. La pasarela se ejecuta en macOS/Linux (Windows mediante WSL2) y es ligera (un VPS pequeño o una caja de clase Raspberry Pi está bien; 4 GB de RAM son suficientes), por lo que una configuración común es un host siempre activo más su laptop como un nodo.

- **No se requiere SSH entrante.** Los nodos se conectan a la pasarela a través de WebSocket y usan el emparejamiento de dispositivos.
- **Controles de ejecución más seguros.** `system.run` está limitado por listas de aprobación/aprobaciones de nodos en esa laptop.
- **Más herramientas de dispositivo.** Los nodos exponen `canvas`, `camera` y `screen` además de `system.run`.
- **Automatización local del navegador.** Mantenga la pasarela en un VPS, pero ejecute Chrome localmente a través de un host de nodo en la laptop, o conéctese al Chrome local en el host mediante Chrome MCP.

SSH está bien para el acceso ad-hoc al shell, pero los nodos son más simples para los flujos de trabajo continuos de agentes y la automatización de dispositivos.

Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Navegador](/es/tools/browser).

### ¿Debo instalar en una segunda laptop o simplemente agregar un nodo?

Si solo necesita **herramientas locales** (pantalla/cámara/exec) en la segunda laptop, agréguela como un **nodo**. Eso mantiene una única pasarela y evita configuraciones duplicadas. Las herramientas de nodo local actualmente son solo para macOS, pero planeamos extenderlas a otros sistemas operativos.

Instale una segunda pasarela solo cuando necesite **aislamiento estricto** o dos bots completamente separados.

Documentación: [Nodos](/es/nodes), [CLI de Nodos](/es/cli/nodes), [Múltiples pasarelas](/es/gateway/multiple-gateways).

### ¿Los nodos ejecutan un servicio de pasarela?

No. Solo debe ejecutarse **una puerta de enlace** por host, a menos que ejecutes intencionalmente perfiles aislados (consulta [Múltiples puertas de enlace](/es/gateway/multiple-gateways)). Los nodos son periféricos que se conectan a la puerta de enlace (nodos iOS/Android o el "modo nodo" de macOS en la aplicación de la barra de menús). Para hosts de nodos sin cabeza y control por CLI, consulta [CLI de host de nodos](/es/cli/node).

Se requiere un reinicio completo para los cambios de `gateway`, `discovery` y `canvasHost`.

### ¿Hay una forma de API RPC para aplicar la configuración

Sí. `config.apply` valida y escribe la configuración completa y reinicia la puerta de enlace como parte de la operación.

### configapply borró mi configuración ¿Cómo recupero y evito esto

`config.apply` reemplaza la **configuración completa**. Si envías un objeto parcial, todo lo demás se elimina.

Recuperar:

- Restaurar desde una copia de seguridad (git o un `~/.openclaw/openclaw.json` copiado).
- Si no tienes copia de seguridad, vuelve a ejecutar `openclaw doctor` y reconfigura los canales/modelos.
- Si esto fue inesperado, informa de un error e incluye tu última configuración conocida o cualquier copia de seguridad.
- Un agente de codificación local a menudo puede reconstruir una configuración funcional a partir de registros o historial.

Evitarlo:

- Usa `openclaw config set` para cambios pequeños.
- Usa `openclaw configure` para ediciones interactivas.

Documentación: [Config](/es/cli/config), [Configure](/es/cli/configure), [Doctor](/es/gateway/doctor).

### Configuración mínima sensata para una primera instalación

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

Esto establece tu espacio de trabajo y restringe quién puede activar el bot.

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
   - Puerta de enlace WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

Si deseas la interfaz de usuario de control sin SSH, usa Tailscale Serve en el VPS:

```bash
openclaw gateway --tailscale serve
```

Esto mantiene la puerta de enlace vinculada a loopback y expone HTTPS a través de Tailscale. Consulta [Tailscale](/es/gateway/tailscale).

### ¿Cómo conecto un nodo Mac a una puerta de enlace remota Tailscale Serve

Serve expone la **Interfaz de control de Gateway + WS**. Los nodos se conectan a través del mismo endpoint WS de Gateway.

Configuración recomendada:

1. **Asegúrese de que el VPS + Mac estén en la misma tailnet**.
2. **Use la aplicación macOS en modo remoto** (el destino SSH puede ser el nombre de host de la tailnet).
   La aplicación creará un túnel del puerto Gateway y se conectará como un nodo.
3. **Aprobar el nodo** en la puerta de enlace:

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

Documentación: [Protocolo de Gateway](/es/gateway/protocol), [Descubrimiento](/es/gateway/discovery), [modo remoto de macOS](/es/platforms/mac/remote).

## Variables de entorno y carga de .env

### Cómo carga OpenClaw las variables de entorno

OpenClaw lee las variables de entorno del proceso principal (shell, launchd/systemd, CI, etc.) y adicionalmente carga:

- `.env` desde el directorio de trabajo actual
- un `.env` de reserva global desde `~/.openclaw/.env` (también conocido como `$OPENCLAW_STATE_DIR/.env`)

Ningún archivo `.env` anula las variables de entorno existentes.

También puede definir variables de entorno en línea en la configuración (se aplican solo si faltan en el entorno del proceso):

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

Vea [/environment](/es/help/environment) para ver la precedencia completa y las fuentes.

### Inicié el Gateway a través del servicio y mis variables de entorno desaparecieron ¿Qué hago ahora

Dos soluciones comunes:

1. Ponga las claves faltantes en `~/.openclaw/.env` para que se detecten incluso cuando el servicio no herede el entorno de su shell.
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

Esto ejecuta su shell de inicio de sesión e importa solo las claves esperadas faltantes (nunca las anula). Equivalentes de variables de entorno:
`OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

### Establecí COPILOTGITHUBTOKEN pero el estado de los modelos muestra Shell env desactivado ¿Por qué

`openclaw models status` indica si la **importación del entorno de shell** está habilitada. "Shell env: off"
**no** significa que falten sus variables de entorno; solo significa que OpenClaw no cargará
su shell de inicio de sesión automáticamente.

Si el Gateway se ejecuta como un servicio (launchd/systemd), no heredará su entorno
de shell. Solucione esto haciendo una de estas cosas:

1. Ponga el token en `~/.openclaw/.env`:

   ```
   COPILOT_GITHUB_TOKEN=...
   ```

2. O habilite la importación de shell (`env.shellEnv.enabled: true`).
3. O agréguelo a su bloque `env` de configuración (se aplica solo si falta).

Luego reinicie la puerta de enlace y verifique de nuevo:

```bash
openclaw models status
```

Los tokens de Copilot se leen de `COPILOT_GITHUB_TOKEN` (también `GH_TOKEN` / `GITHUB_TOKEN`).
Vea [/concepts/model-providers](/es/concepts/model-providers) y [/environment](/es/help/environment).

## Sesiones y múltiples chats

### Cómo inicio una conversación nueva

Envíe `/new` o `/reset` como un mensaje independiente. Vea [Gestión de sesiones](/es/concepts/session).

### ¿Las sesiones se reinician automáticamente si nunca envío mensajes nuevos

Sí. Las sesiones caducan después de `session.idleMinutes` (por defecto **60**). El **siguiente**
mensaje inicia un id de sesión nuevo para esa clave de chat. Esto no borra
las transcripciones - solo inicia una sesión nueva.

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### ¿Hay alguna forma de hacer un equipo de instancias de OpenClaw un CEO y muchos agentes

Sí, a través del **enrutamiento multi-agente** y **sub-agentes**. Puede crear un agente
coordinador y varios agentes trabajadores con sus propios espacios de trabajo y modelos.

Dicho esto, esto es mejor visto como un **experimento divertido**. Consume muchos tokens y a menudo
es menos eficiente que usar un bot con sesiones separadas. El modelo típico que
imaginamos es un bot con el que habla, con diferentes sesiones para trabajo paralelo. Ese
bot también puede generar sub-agentes cuando sea necesario.

Documentación: [Enrutamiento multi-agente](/es/concepts/multi-agent), [Sub-agentes](/es/tools/subagents), [CLI de Agentes](/es/cli/agents).

### ¿Por qué se truncó el contexto a mitad de tarea ¿Cómo lo evito

El contexto de la sesión está limitado por la ventana del modelo. Chats largos, salidas de herramientas grandes o muchos
archivos pueden activar la compactación o el truncamiento.

Lo que ayuda:

- Pida al bot que resuma el estado actual y lo escriba en un archivo.
- Use `/compact` antes de tareas largas, y `/new` al cambiar de tema.
- Mantenga el contexto importante en el espacio de trabajo y pida al bot que lo lea de nuevo.
- Use sub-agentes para trabajo largo o paralelo para que el chat principal se mantenga más pequeño.
- Elija un modelo con una ventana de contexto más grande si esto sucede a menudo.

### ¿Cómo restablezco completamente OpenClaw pero lo mantengo instalado

Use el comando de reinicio:

```bash
openclaw reset
```

Restablecimiento completo no interactivo:

```bash
openclaw reset --scope full --yes --non-interactive
```

Luego vuelva a ejecutar la configuración:

```bash
openclaw onboard --install-daemon
```

Notas:

- La incorporación también ofrece **Restablecer** si ve una configuración existente. Vea [Incorporación (CLI)](/es/start/wizard).
- Si usaste perfiles (`--profile` / `OPENCLAW_PROFILE`), restablece cada directorio de estado (los predeterminados son `~/.openclaw-<profile>`).
- Restablecimiento de desarrollo: `openclaw gateway --dev --reset` (solo para desarrollo; borra la configuración de desarrollo + credenciales + sesiones + espacio de trabajo).

### Estoy obteniendo errores de contexto demasiado grande, ¿cómo restablezco o compacto?

Usa uno de estos:

- **Compactar** (mantiene la conversación pero resume los turnos anteriores):

  ```
  /compact
  ```

  o `/compact <instructions>` para guiar el resumen.

- **Restablecer** (ID de sesión nueva para la misma clave de chat):

  ```
  /new
  /reset
  ```

Si sigue sucediendo:

- Habilita o ajusta la **poda de sesiones** (`agents.defaults.contextPruning`) para recortar el resultado antiguo de las herramientas.
- Usa un modelo con una ventana de contexto más grande.

Documentación: [Compactación](/es/concepts/compaction), [Poda de sesiones](/es/concepts/session-pruning), [Gestión de sesiones](/es/concepts/session).

### ¿Por qué veo "LLM request rejected: messages.content.tool_use.input field required"?

Este es un error de validación del proveedor: el modelo emitió un bloque `tool_use` sin el `input` requerido. Generalmente significa que el historial de la sesión está obsoleto o corrupto (a menudo después de hilos largos o un cambio en la herramienta/esquema).

Solución: inicia una sesión nueva con `/new` (mensaje independiente).

### ¿Por qué recibo mensajes de latido cada 30 minutos?

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

Si `HEARTBEAT.md` existe pero está efectivamente vacío (solo líneas en blanco y encabezados de markdown como `# Heading`), OpenClaw omite la ejecución del latido para ahorrar llamadas a la API. Si falta el archivo, el latido aún se ejecuta y el modelo decide qué hacer.

Las anulaciones por agente usan `agents.list[].heartbeat`. Documentación: [Latido](/es/gateway/heartbeat).

### ¿Necesito agregar una cuenta de bot a un grupo de WhatsApp?

No. OpenClaw se ejecuta en **tu propia cuenta**, por lo que si estás en el grupo, OpenClaw puede verlo. Por defecto, las respuestas de grupo están bloqueadas hasta que permitas remitentes (`groupPolicy: "allowlist"`).

Si quieres que solo **tú** puedas activar las respuestas de grupo:

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

Busque `chatId` (o `from`) que termine en `@g.us`, como:
`1234567890-1234567890@g.us`.

Opción 2 (si ya está configurado/en la lista permitida): listar grupos desde la configuración:

```bash
openclaw directory groups list --channel whatsapp
```

Documentación: [WhatsApp](/es/channels/whatsapp), [Directorio](/es/cli/directory), [Registros](/es/cli/logs).

### ¿Por qué OpenClaw no responde en un grupo

Dos causas comunes:

- El filtrado de menciones está activado (predeterminado). Debe @mencionar al bot (o coincidir con `mentionPatterns`).
- Configuró `channels.whatsapp.groups` sin `"*"` y el grupo no está en la lista permitida.

Consulte [Grupos](/es/channels/groups) y [Mensajes de grupo](/es/channels/group-messages).

### ¿Los grupos/hilos comparten el contexto con los MD?

Los chats directos se colapsan en la sesión principal de forma predeterminada. Los grupos/canales tienen sus propias claves de sesión, y los temas de Telegram / hilos de Discord son sesiones separadas. Consulte [Grupos](/es/channels/groups) y [Mensajes de grupo](/es/channels/group-messages).

### ¿Cuántos espacios de trabajo y agentes puedo crear?

Sin límites estrictos. Docenas (incluso cientos) están bien, pero tenga en cuenta:

- **Crecimiento del disco:** las sesiones + las transcripciones se almacenan en `~/.openclaw/agents/<agentId>/sessions/`.
- **Costo de tokens:** más agentes significan mayor uso simultáneo del modelo.
- **Sobrecarga operativa:** perfiles de autenticación por agente, espacios de trabajo y enrutamiento de canales.

Consejos:

- Mantenga un espacio de trabajo **activo** por agente (`agents.defaults.workspace`).
- Pode sesiones antiguas (elimine JSONL o almacene entradas) si el disco crece.
- Use `openclaw doctor` para detectar espacios de trabajo huérfanos y discordancias de perfil.

### ¿Puedo ejecutar varios bots o chats al mismo tiempo en Slack y cómo debo configurarlo?

Sí. Use **Enrutamiento multiproceso** para ejecutar varios agentes aislados y enrutar mensajes entrantes por
canal/cuenta/par. Slack es compatible como canal y se puede vincular a agentes específicos.

El acceso al navegador es potente, pero no "hacer todo lo que un humano puede"; los anti-bots, los CAPTCHAs y el MFA aún pueden
bloquear la automatización. Para el control del navegador más confiable, use Chrome MCP local en el host,
o use CDP en la máquina que realmente ejecuta el navegador.

Configuración recomendada:

- Host de puerta de enlace siempre activo (VPS/Mac mini).
- Un agente por rol (vinculaciones).
- Canal(es) de Slack vinculados a esos agentes.
- Navegador local a través de Chrome MCP o un nodo cuando sea necesario.

Documentos: [Multi-Agent Routing](/es/concepts/multi-agent), [Slack](/es/channels/slack),
[Browser](/es/tools/browser), [Nodes](/es/nodes).

## Modelos: predeterminados, selección, alias, cambio

### ¿Cuál es el modelo predeterminado?

El modelo predeterminado de OpenClaw es lo que configure como:

```
agents.defaults.model.primary
```

Los modelos se referencian como `provider/model` (ejemplo: `anthropic/claude-opus-4-6`). Si omite el proveedor, OpenClaw asume actualmente `anthropic` como alternativa temporal de desuso, pero aún debería configurar `provider/model` **explícitamente**.

### ¿Qué modelo recomienda?

**Predeterminado recomendado:** use el modelo más fuerte de la última generación disponible en su pila de proveedores.
**Para agentes con herramientas habilitadas o entrada que no es de confianza:** dé prioridad a la fuerza del modelo sobre el costo.
**Para chat rutinario o de bajo riesgo:** use modelos alternativos más económicos y enrute por rol de agente.

MiniMax M2.5 tiene sus propios documentos: [MiniMax](/es/providers/minimax) y
[Local models](/es/gateway/local-models).

Regla general: use el **mejor modelo que pueda pagar** para el trabajo de alto riesgo y un modelo más económico
para el chat rutinario o los resúmenes. Puede enrutar modelos por agente y usar subagentes para
paralelizar tareas largas (cada subagente consume tokens). Consulte [Models](/es/concepts/models) y
[Sub-agents](/es/tools/subagents).

Advertencia importante: los modelos más débiles o sobrecuantizados son más vulnerables a la inyección
de prompts y al comportamiento inseguro. Consulte [Security](/es/gateway/security).

Más contexto: [Models](/es/concepts/models).

### ¿Puedo usar modelos autohospedados llamacpp vLLM Ollama?

Sí. Ollama es la ruta más fácil para los modelos locales.

Configuración más rápida:

1. Instale Ollama desde `https://ollama.com/download`
2. Extraiga un modelo local como `ollama pull glm-4.7-flash`
3. Si también quiere Ollama Cloud, ejecute `ollama signin`
4. Ejecute `openclaw onboard` y elija `Ollama`
5. Elija `Local` o `Cloud + Local`

Notas:

- `Cloud + Local` te ofrece modelos de Ollama Cloud además de tus modelos locales de Ollama
- los modelos en la nube como `kimi-k2.5:cloud` no necesitan una extracción local
- para un cambio manual, usa `openclaw models list` y `openclaw models set ollama/<model>`

Nota de seguridad: los modelos más pequeños o muy cuantizados son más vulnerables a la inyección de prompts. Recomendamos encarecidamente **modelos grandes** para cualquier bot que pueda usar herramientas. Si aún quieres modelos pequeños, activa el sandboxing y listas de permitidos estrictas para herramientas.

Documentación: [Ollama](/es/providers/ollama), [Modelos locales](/es/gateway/local-models),
[Proveedores de modelos](/es/concepts/model-providers), [Seguridad](/es/gateway/security),
[Sandboxing](/es/gateway/sandboxing).

### ¿Cómo cambio de modelos sin borrar mi configuración

Usa **comandos de modelo** o edita solo los campos de **modelo**. Evita reemplazos completos de la configuración.

Opciones seguras:

- `/model` en el chat (rápido, por sesión)
- `openclaw models set ...` (actualiza solo la configuración del modelo)
- `openclaw configure --section model` (interactivo)
- edita `agents.defaults.model` en `~/.openclaw/openclaw.json`

Evita `config.apply` con un objeto parcial a menos que tengas la intención de reemplazar toda la configuración. Si sobrescribiste la configuración, restaura desde una copia de seguridad o vuelve a ejecutar `openclaw doctor` para reparar.

Documentación: [Modelos](/es/concepts/models), [Configurar](/es/cli/configure), [Configuración](/es/cli/config), [Doctor](/es/gateway/doctor).

### ¿Qué usan OpenClaw, Flawd y Krill para los modelos

- Estos despliegues pueden diferir y pueden cambiar con el tiempo; no hay una recomendación fija de proveedor.
- Comprueba la configuración actual de tiempo de ejecución en cada puerta de enlace con `openclaw models status`.
- Para agentes sensibles a la seguridad o con herramientas habilitadas, usa el modelo más fuerte y de última generación disponible.

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

Puedes listar los modelos disponibles con `/model`, `/model list`, o `/model status`.

`/model` (y `/model list`) muestra un selector numérico compacto. Seleccione por número:

```
/model 3
```

También puede forzar un perfil de autenticación específico para el proveedor (por sesión):

```
/model opus@anthropic:default
/model opus@anthropic:work
```

Sugerencia: `/model status` muestra qué agente está activo, qué archivo `auth-profiles.json` se está utilizando y qué perfil de autenticación se probará a continuación.
También muestra el punto de conexión del proveedor configurado (`baseUrl`) y el modo de API (`api`) cuando están disponibles.

**¿Cómo desanclar un perfil que establecí con profile**

Vuelva a ejecutar `/model` **sin** el sufijo `@profile`:

```
/model anthropic/claude-opus-4-6
```

Si desea volver al predeterminado, selecciónelo desde `/model` (o envíe `/model <default provider/model>`).
Use `/model status` para confirmar qué perfil de autenticación está activo.

### ¿Puedo usar GPT 5.2 para tareas diarias y Codex 5.3 para programar

Sí. Establezca uno como predeterminado y cambie según sea necesario:

- **Cambio rápido (por sesión):** `/model gpt-5.2` para tareas diarias, `/model openai-codex/gpt-5.4` para programar con Codex OAuth.
- **Predeterminado + cambio:** establezca `agents.defaults.model.primary` en `openai/gpt-5.2`, luego cambie a `openai-codex/gpt-5.4` cuando programe (o viceversa).
- **Sub-agentes:** enrute las tareas de programación a sub-agentes con un modelo predeterminado diferente.

Consulte [Modelos](/es/concepts/models) y [Comandos de barra](/es/tools/slash-commands).

### ¿Por qué veo Model is not allowed (El modelo no está permitido) y luego ninguna respuesta

Si `agents.defaults.models` está configurado, se convierte en la **lista de permitidos** para `/model` y cualquier
anulación de sesión. Elegir un modelo que no esté en esa lista devuelve:

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Ese error se devuelve **en lugar de** una respuesta normal. Solución: agregue el modelo a
`agents.defaults.models`, elimine la lista de permitidos o elija un modelo de `/model list`.

### ¿Por qué veo Unknown model minimaxMiniMaxM25 (Modelo desconocido minimaxMiniMaxM25)

Esto significa que **el proveedor no está configurado** (no se encontró ninguna configuración de proveedor MiniMax o perfil de
autenticación), por lo que no se puede resolver el modelo. Una solución para esta detección está
en **2026.1.12** (sin lanzar en el momento de escribir esto).

Lista de verificación de solución:

1. Actualice a **2026.1.12** (o ejecute desde el código fuente `main`) y luego reinicie la puerta de enlace.
2. Asegúrese de que MiniMax esté configurado (asistente o JSON) o de que exista una clave de API de MiniMax en los perfiles env/auth para que el proveedor pueda inyectarse.
3. Use el ID exacto del modelo (distingue mayúsculas y minúsculas): `minimax/MiniMax-M2.5` o `minimax/MiniMax-M2.5-highspeed`.
4. Ejecute:

   ```bash
   openclaw models list
   ```

   y elija de la lista (o `/model list` en el chat).

Consulte [MiniMax](/es/providers/minimax) y [Modelos](/es/concepts/models).

### ¿Puedo usar MiniMax como predeterminado y OpenAI para tareas complejas

Sí. Use **MiniMax como predeterminado** y cambie de modelos **por sesión** cuando sea necesario.
Los mecanismos de respaldo son para **errores**, no para "tareas difíciles", así que use `/model` o un agente separado.

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

Luego:

```
/model gpt
```

**Opción B: agentes separados**

- Agente A predeterminado: MiniMax
- Agente B predeterminado: OpenAI
- Enrutar por agente o usar `/agent` para cambiar

Documentación: [Modelos](/es/concepts/models), [Enrutamiento multiagente](/es/concepts/multi-agent), [MiniMax](/es/providers/minimax), [OpenAI](/es/providers/openai).

### ¿Son opus sonnet gpt atajos integrados

Sí. OpenClaw incluye algunos atajos predeterminados (solo se aplican cuando el modelo existe en `agents.defaults.models`):

- `opus` → `anthropic/claude-opus-4-6`
- `sonnet` → `anthropic/claude-sonnet-4-6`
- `gpt` → `openai/gpt-5.4`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3.1-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`
- `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

Si establece su propio alias con el mismo nombre, su valor prevalece.

### ¿Cómo defino/sobrescribo los atajos y alias de los modelos

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

Entonces `/model sonnet` (o `/<alias>` cuando sea compatible) se resuelve en ese ID de modelo.

### ¿Cómo agrego modelos de otros proveedores como OpenRouter o ZAI

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

Si haces referencia a un proveedor/modelo pero falta la clave del proveedor requerida, obtendrás un error de autenticación en tiempo de ejecución (ej. `No API key found for provider "zai"`).

**No se encontró ninguna clave API para el proveedor después de agregar un nuevo agente**

Esto generalmente significa que el **nuevo agente** tiene un almacén de autenticación vacío. La autenticación es por agente y
se almacena en:

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Opciones de corrección:

- Ejecuta `openclaw agents add <id>` y configura la autenticación durante el asistente.
- O copia `auth-profiles.json` del `agentDir` del agente principal al `agentDir` del nuevo agente.

**No** reutilices `agentDir` entre agentes; esto causa colisiones de autenticación/sesión.

## Conmutación por error de modelo y "Todos los modelos fallaron"

### Cómo funciona la conmutación por error

La conmutación por error ocurre en dos etapas:

1. **Rotación del perfil de autenticación** dentro del mismo proveedor.
2. **Respaldo del modelo** al siguiente modelo en `agents.defaults.model.fallbacks`.

Se aplican tiempos de enfriamiento a los perfiles que fallan (retroceso exponencial), por lo que OpenClaw puede seguir respondiendo incluso cuando un proveedor tiene límites de tasa o fallas temporales.

### Qué significa este error

```
No credentials found for profile "anthropic:default"
```

Significa que el sistema intentó usar el ID del perfil de autenticación `anthropic:default`, pero no pudo encontrar las credenciales para él en el almacén de autenticación esperado.

### Lista de verificación de corrección para No se encontraron credenciales para el perfil anthropicdefault

- **Confirmar dónde residen los perfiles de autenticación** (rutas nuevas vs. heredadas)
  - Actual: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - Heredado: `~/.openclaw/agent/*` (migrado por `openclaw doctor`)
- **Confirmar que tu variable de entorno es cargada por el Gateway**
  - Si estableces `ANTHROPIC_API_KEY` en tu shell pero ejecutas el Gateway a través de systemd/launchd, puede que no la herede. Ponla en `~/.openclaw/.env` o habilita `env.shellEnv`.
- **Asegúrate de editar el agente correcto**
  - Las configuraciones de múltiples agentes significan que puede haber múltiples archivos `auth-profiles.json`.
- **Verificar el estado del modelo/autenticación**
  - Usa `openclaw models status` para ver los modelos configurados y si los proveedores están autenticados.

**Lista de verificación de corrección para No se encontraron credenciales para el perfil anthropic**

Esto significa que la ejecución está fijada a un perfil de autenticación de Anthropic, pero el Gateway
no puede encontrarlo en su almacén de autenticación.

- **Usa un token de configuración**
  - Ejecute `claude setup-token` y luego péguelo con `openclaw models auth setup-token --provider anthropic`.
  - Si el token se creó en otra máquina, use `openclaw models auth paste-token --provider anthropic`.
- **Si desea utilizar una clave API en su lugar**
  - Ponga `ANTHROPIC_API_KEY` en `~/.openclaw/.env` en el **host de puerta de enlace**.
  - Borre cualquier orden fijada que fuerce un perfil que falta:

    ```bash
    openclaw models auth order clear --provider anthropic
    ```

- **Confirme que está ejecutando comandos en el host de puerta de enlace**
  - En el modo remoto, los perfiles de autenticación residen en la máquina de puerta de enlace, no en su computadora portátil.

### ¿Por qué también intentó Google Gemini y falló

Si su configuración de modelo incluye Google Gemini como alternativa (o cambió a una abreviatura de Gemini), OpenClaw lo intentará durante la conmutación por error del modelo. Si no ha configurado las credenciales de Google, verá `No API key found for provider "google"`.

Solución: proporcione la autenticación de Google, o elimine/evite los modelos de Google en `agents.defaults.model.fallbacks` / alias para que la conmutación por error no enrute allí.

**Mensaje de solicitud de LLM rechazada pensando que se requiere firma google antigravity**

Causa: el historial de la sesión contiene **bloques de pensamiento sin firmas** (a menudo a partir de
una flujo interrumpido/parcial). Google Antigravity requiere firmas para los bloques de pensamiento.

Solución: OpenClaw ahora elimina los bloques de pensamiento sin firmar para Google Antigravity Claude. Si aún aparece, inicie una **nueva sesión** o configure `/thinking off` para ese agente.

## Perfiles de autenticación: qué son y cómo gestionarlos

Relacionado: [/concepts/oauth](/es/concepts/oauth) (flujos de OAuth, almacenamiento de tokens, patrones de multicuenta)

### ¿Qué es un perfil de autenticación

Un perfil de autenticación es un registro de credenciales con nombre (OAuth o clave API) vinculado a un proveedor. Los perfiles residen en:

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### ¿Cuáles son los ID de perfil típicos

OpenClaw usa ID con prefijo de proveedor como:

- `anthropic:default` (común cuando no existe una identidad de correo electrónico)
- `anthropic:<email>` para identidades OAuth
- ID personalizados que usted elija (por ejemplo, `anthropic:work`)

### ¿Puedo controlar qué perfil de autenticación se intenta primero

Sí. La configuración admite metadatos opcionales para los perfiles y un orden por proveedor (`auth.order.<provider>`). Esto **no** almacena secretos; asigna ID a proveedor/modo y establece el orden de rotación.

OpenClaw puede omitir temporalmente un perfil si está en un **cooldown** a corto plazo (límites de velocidad/tiempos de espera/fallos de autenticación) o en un estado **deshabilitado** a más largo plazo (facturación/créditos insuficientes). Para inspeccionar esto, ejecute `openclaw models status --json` y verifique `auth.unusableProfiles`. Ajuste: `auth.cooldowns.billingBackoffHours*`.

También puede establecer una anulación de orden **por agente** (almacenada en `auth-profiles.json` de ese agente) a través de la CLI:

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

### OAuth vs clave de API: ¿cuál es la diferencia

OpenClaw admite ambos:

- **OAuth** a menudo aprovecha el acceso por suscripción (cuando corresponde).
- Las **claves de API** usan facturación pago por token.

El asistente admite explícitamente el token de configuración de Anthropic y OAuth de OpenAI Codex, y puede almacenar claves de API por usted.

## Gateway: puertos, "ya se está ejecutando" y modo remoto

### Qué puerto usa el Gateway

`gateway.port` controla el único puerto multiplexado para WebSocket + HTTP (Interfaz de usuario de control, enlaces, etc.).

Precedencia:

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### Por qué el estado de openclaw gateway indica que el tiempo de ejecución se está ejecutando pero la prueba RPC falló

Porque "en ejecución" es la vista del **supervisor** (launchd/systemd/schtasks). La prueba RPC es la CLI conectándose realmente al WebSocket de la puerta de enlace y llamando a `status`.

Use `openclaw gateway status` y confíe en estas líneas:

- `Probe target:` (la URL que la prueba usó realmente)
- `Listening:` (lo que realmente está vinculado en el puerto)
- `Last gateway error:` (causa raíz común cuando el proceso está vivo pero el puerto no está escuchando)

### Por qué el estado de openclaw gateway muestra Config cli y Config service diferentes

Está editando un archivo de configuración mientras el servicio está ejecutando otro (a menudo una discrepancia de `--profile` / `OPENCLAW_STATE_DIR`).

Solución:

```bash
openclaw gateway install --force
```

Ejecute eso desde el mismo `--profile` / entorno que desee que use el servicio.

### Qué significa que ya hay otra instancia de gateway escuchando

OpenClaw aplica un bloqueo de tiempo de ejecución vinculando el oyente WebSocket inmediatamente al inicio (predeterminado `ws://127.0.0.1:18789`). Si el enlace falla con `EADDRINUSE`, lanza `GatewayLockError` indicando que otra instancia ya está escuchando.

Solución: detenga la otra instancia, libere el puerto o ejecute con `openclaw gateway --port <port>`.

### ¿Cómo ejecuto OpenClaw en modo remoto (el cliente se conecta a un Gateway en otro lugar)?

Establezca `gateway.mode: "remote"` y apunte a una URL de WebSocket remota, opcionalmente con un token/contraseña:

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

- `openclaw gateway` solo se inicia cuando `gateway.mode` es `local` (o pasa la bandera de anulación).
- La aplicación de macOS observa el archivo de configuración y cambia los modos en vivo cuando estos valores cambian.

### La interfaz de usuario de Control dice no autorizado o sigue reconectando ¿Qué hacer ahora

Su gateway se está ejecutando con la autenticación habilitada (`gateway.auth.*`), pero la interfaz de usuario no está enviando el token/contraseña correspondiente.

Datos (del código):

- La interfaz de usuario de Control mantiene el token en `sessionStorage` para la sesión actual de la pestaña del navegador y la URL del gateway seleccionada, por lo que las actualizaciones en la misma pestaña siguen funcionando sin restaurar la persistencia del token de localStorage a largo plazo.
- En `AUTH_TOKEN_MISMATCH`, los clientes de confianza pueden intentar un reintento limitado con un token de dispositivo en caché cuando el gateway devuelve sugerencias de reintento (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).

Solución:

- La más rápida: `openclaw dashboard` (imprime + copia la URL del panel, intenta abrirla; muestra una sugerencia de SSH si no tiene cabeza).
- Si aún no tiene un token: `openclaw doctor --generate-gateway-token`.
- Si es remoto, cree un túnel primero: `ssh -N -L 18789:127.0.0.1:18789 user@host` y luego abra `http://127.0.0.1:18789/`.
- Establezca `gateway.auth.token` (o `OPENCLAW_GATEWAY_TOKEN`) en el host del gateway.
- En la configuración de la interfaz de usuario de Control, pegue el mismo token.
- Si la discordancia persiste después del único reintento, rote/vuelva a aprobar el token del dispositivo emparejado:
  - `openclaw devices list`
  - `openclaw devices rotate --device <id> --role operator`
- ¿Sigues atascado? Ejecute `openclaw status --all` y siga [Solución de problemas](/es/gateway/troubleshooting). Consulte [Panel](/es/web/dashboard) para obtener detalles de autenticación.

### Establecí gateway.bind tailnet pero no puede vincular y nada escucha

`tailnet` bind elige una IP de Tailscale de sus interfaces de red (100.64.0.0/10). Si la máquina no está en Tailscale (o la interfaz está caída), no hay nada a lo que vincularse.

Solución:

- Inicie Tailscale en ese host (para que tenga una dirección 100.x), o
- Cambie a `gateway.bind: "loopback"` / `"lan"`.

Nota: `tailnet` es explícito. `auto` prefiere el bucle local; use `gateway.bind: "tailnet"` cuando desee un enlace exclusivo de tailnet.

### ¿Puedo ejecutar múltiples Gateways en el mismo host

Generalmente no: un Gateway puede ejecutar múltiples canales de mensajería y agentes. Use múltiples Gateways solo cuando necesite redundancia (ej: bot de rescate) o aislamiento estricto.

Sí, pero debe aislar:

- `OPENCLAW_CONFIG_PATH` (configuración por instancia)
- `OPENCLAW_STATE_DIR` (estado por instancia)
- `agents.defaults.workspace` (aislamiento del espacio de trabajo)
- `gateway.port` (puertos únicos)

Configuración rápida (recomendado):

- Use `openclaw --profile <name> …` por instancia (crea automáticamente `~/.openclaw-<name>`).
- Establezca un `gateway.port` único en cada configuración de perfil (o pase `--port` para ejecuciones manuales).
- Instale un servicio por perfil: `openclaw --profile <name> gateway install`.

Los perfiles también sufijan los nombres de los servicios (`ai.openclaw.<profile>`; legado `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
Guía completa: [Múltiples gateways](/es/gateway/multiple-gateways).

### ¿Qué significa el código de handshake no válido 1008

El Gateway es un **servidor WebSocket**, y espera que el primer mensaje
sea un trama `connect`. Si recibe cualquier otra cosa, cierra la conexión
con el **código 1008** (violación de política).

Causas comunes:

- Abrió la URL **HTTP** en un navegador (`http://...`) en lugar de un cliente WS.
- Usó el puerto o la ruta incorrectos.
- Un proxy o túnel eliminó los encabezados de autenticación o envió una solicitud no Gateway.

Soluciones rápidas:

1. Use la URL WS: `ws://<host>:18789` (o `wss://...` si es HTTPS).
2. No abra el puerto WS en una pestaña normal del navegador.
3. Si la autenticación está activada, incluya el token/contraseña en la trama `connect`.

Si está usando la CLI o TUI, la URL debería verse así:

```
openclaw tui --url ws://<host>:18789 --token <token>
```

Detalles del protocolo: [Protocolo Gateway](/es/gateway/protocol).

## Registro y depuración

### ¿Dónde están los registros

Registros de archivos (estructurados):

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Puedes establecer una ruta estable a través de `logging.file`. El nivel de registro de archivo está controlado por `logging.level`. La verbosidad de la consola está controlada por `--verbose` y `logging.consoleLevel`.

Seguimiento de registros más rápido:

```bash
openclaw logs --follow
```

Registros de servicio/supervisor (cuando la puerta de enlace se ejecuta a través de launchd/systemd):

- macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` y `gateway.err.log` (predeterminado: `~/.openclaw/logs/...`; los perfiles usan `~/.openclaw-<profile>/logs/...`)
- Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

Consulte [Solución de problemas](/es/gateway/troubleshooting#log-locations) para obtener más información.

### ¿Cómo inicio/detengo/reinicio el servicio Gateway?

Utilice los asistentes de la puerta de enlace:

```bash
openclaw gateway status
openclaw gateway restart
```

Si ejecuta la puerta de enlace manualmente, `openclaw gateway --force` puede reclamar el puerto. Consulte [Gateway](/es/gateway).

### Cerré mi terminal en Windows, ¿cómo reinicio OpenClaw?

Hay **dos modos de instalación en Windows**:

**1) WSL2 (recomendado):** la puerta de enlace se ejecuta dentro de Linux.

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

**2) Windows nativo (no recomendado):** la puerta de enlace se ejecuta directamente en Windows.

Abra PowerShell y ejecute:

```powershell
openclaw gateway status
openclaw gateway restart
```

Si lo ejecuta manualmente (sin servicio), use:

```powershell
openclaw gateway run
```

Documentos: [Windows (WSL2)](/es/platforms/windows), [Manual de servicio de Gateway](/es/gateway).

### La puerta de enlace está activa pero las respuestas nunca llegan. ¿Qué debo verificar?

Comience con un rápido barrido de estado:

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

Causas comunes:

- Autenticación del modelo no cargada en el **host de la puerta de enlace** (verifique `models status`).
- Emparejamiento de canal/lista de permitidos bloqueando respuestas (verifique la configuración del canal + registros).
- WebChat/Dashboard está abierto sin el token correcto.

Si está remoto, confirme que la conexión del túnel/Tailscale esté activa y que el
WebSocket de la puerta de enlace sea accesible.

Documentos: [Canales](/es/channels), [Solución de problemas](/es/gateway/troubleshooting), [Acceso remoto](/es/gateway/remote).

### Desconectado de la puerta de enlace sin razón, ¿y ahora qué?

Esto generalmente significa que la interfaz perdió la conexión WebSocket. Verifique:

1. ¿Se está ejecutando la puerta de enlace? `openclaw gateway status`
2. ¿Está el Gateway sano? `openclaw status`
3. ¿Tiene la UI el token correcto? `openclaw dashboard`
4. Si es remoto, ¿está activo el enlace túnel/Tailscale?

A continuación, revisa los registros (tail logs):

```bash
openclaw logs --follow
```

Documentación: [Dashboard](/es/web/dashboard), [Acceso remoto](/es/gateway/remote), [Solución de problemas](/es/gateway/troubleshooting).

### Telegram setMyCommands falla ¿Qué debería comprobar

Empieza con los registros y el estado del canal:

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

A continuación, compara el error:

- `BOT_COMMANDS_TOO_MUCH`: el menú de Telegram tiene demasiadas entradas. OpenClaw ya recorta hasta el límite de Telegram y reintenta con menos comandos, pero aún así es necesario eliminar algunas entradas del menú. Reduce los complementos/habilidades/comandos personalizados, o deshabilita `channels.telegram.commands.native` si no necesitas el menú.
- `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, o errores de red similares: si estás en un VPS o detrás de un proxy, confirma que se permite el HTTPS saliente y que el DNS funciona para `api.telegram.org`.

Si el Gateway es remoto, asegúrate de que estás mirando los registros en el host del Gateway.

Documentación: [Telegram](/es/channels/telegram), [Solución de problemas del canal](/es/channels/troubleshooting).

### La TUI no muestra ninguna salida ¿Qué debería comprobar

Primero confirma que el Gateway es accesible y que el agente puede ejecutarse:

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

En la TUI, usa `/status` para ver el estado actual. Si esperas respuestas en un
canal de chat, asegúrate de que la entrega esté habilitada (`/deliver on`).

Documentación: [TUI](/es/web/tui), [Comandos de barra](/es/tools/slash-commands).

### ¿Cómo detengo y luego inicio completamente el Gateway

Si instalaste el servicio:

```bash
openclaw gateway stop
openclaw gateway start
```

Esto detiene/inicia el **servicio supervisado** (launchd en macOS, systemd en Linux).
Úsalo cuando el Gateway se ejecuta en segundo plano como demonio.

Si te estás ejecutando en primer plano, detén con Ctrl-C, y luego:

```bash
openclaw gateway run
```

Documentación: [Manual de servicio del Gateway](/es/gateway).

### Explícame como si tuviera 5 años: openclaw gateway restart vs openclaw gateway

- `openclaw gateway restart`: reinicia el **servicio en segundo plano** (launchd/systemd).
- `openclaw gateway`: ejecuta el gateway **en primer plano** para esta sesión de terminal.

Si instaló el servicio, use los comandos de gateway. Use `openclaw gateway` cuando
quiera una ejecución única en primer plano.

### La forma más rápida de obtener más detalles cuando algo falla

Inicie el Gateway con `--verbose` para obtener más detalles en la consola. Luego inspeccione el archivo de registro para ver errores de autenticación del canal, enrutamiento del modelo y RPC.

## Medios y adjuntos

### Mi habilidad generó un imagePDF pero no se envió nada

Los adjuntos salientes del agente deben incluir una línea `MEDIA:<path-or-url>` (en su propia línea). Consulte [Configuración del asistente OpenClaw](/es/start/openclaw) y [Envío del agente](/es/tools/agent-send).

Envío por CLI:

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

También verifique:

- El canal de destino admite medios salientes y no está bloqueado por listas de permitidos.
- El archivo está dentro de los límites de tamaño del proveedor (las imágenes se redimensionan a un máximo de 2048 px).

Consulte [Imágenes](/es/nodes/images).

## Seguridad y control de acceso

### ¿Es seguro exponer OpenClaw a DMs entrantes?

Trate los DMs entrantes como una entrada no confiable. Los valores predeterminados están diseñados para reducir el riesgo:

- El comportamiento predeterminado en los canales con capacidad de DM es **emparejamiento**:
  - Los remitentes desconocidos reciben un código de emparejamiento; el bot no procesa su mensaje.
  - Aprobar con: `openclaw pairing approve --channel <channel> [--account <id>] <code>`
  - Las solicitudes pendientes están limitadas a **3 por canal**; verifique `openclaw pairing list --channel <channel> [--account <id>]` si un código no llegó.
- Abrir DMs públicamente requiere una aceptación explícita (`dmPolicy: "open"` y lista de permitidos `"*"`).

Ejecute `openclaw doctor` para mostrar políticas de DM riesgosas.

### ¿La inyección de instrucciones (prompt injection) es solo una preocupación para los bots públicos?

No. La inyección de instrucciones se trata sobre **contenido no confiable**, no solo sobre quién puede enviar un DM al bot.
Si su asistente lee contenido externo (búsqueda/obtención web, páginas del navegador, correos electrónicos,
documentos, archivos adjuntos, registros pegados), ese contenido puede incluir instrucciones que intentan
tomar el control del modelo. Esto puede suceder incluso si **usted es el único remitente**.

El mayor riesgo es cuando las herramientas están habilitadas: el modelo puede ser engañado para
exfiltrar contexto o llamar herramientas en su nombre. Reduzca el radio de explosión:

- usando un agente "lector" de solo lectura o con herramientas deshabilitadas para resumir contenido no confiable
- manteniendo `web_search` / `web_fetch` / `browser` desactivados para los agentes con herramientas habilitadas
- aislamiento de seguridad y listas de permitidos estrictas para herramientas

Detalles: [Seguridad](/es/gateway/security).

### ¿Mi bot debe tener su propia cuenta de correo electrónico, de GitHub o número de teléfono?

Sí, para la mayoría de las configuraciones. Aislar el bot con cuentas y números de teléfono separados
reduce el radio de impacto si algo sale mal. Esto también facilita la rotación de
credenciales o la revocación del acceso sin afectar sus cuentas personales.

Empiece pequeño. Otorgue acceso solo a las herramientas y cuentas que realmente necesite, y amplíelo
más tarde si es necesario.

Documentos: [Seguridad](/es/gateway/security), [Emparejamiento](/es/channels/pairing).

### ¿Puedo darle autonomía sobre mis mensajes de texto y es seguro?

Nosotros **no** recomendamos la autonomía total sobre sus mensajes personales. El patrón más seguro es:

- Mantenga los MD en **modo de emparejamiento** o en una lista de permitidos estricta.
- Use un **número o cuenta separado** si desea que envíe mensajes en su nombre.
- Déjelo redactar y luego **aprobar antes de enviar**.

Si desea experimentar, hágalo en una cuenta dedicada y manténgala aislada. Véase
[Seguridad](/es/gateway/security).

### ¿Puedo usar modelos más económicos para las tareas de asistente personal?

Sí, **si** el agente es solo de chat y la entrada es confiable. Los niveles más pequeños son
más susceptibles al secuestro de instrucciones, así que evítelos para agentes con herramientas habilitadas
o al leer contenido no confiable. Si debe usar un modelo más pequeño, bloquee las
herramientas y ejecútelas dentro de un aislamiento de seguridad. Véase [Seguridad](/es/gateway/security).

### Ejecuté start en Telegram pero no recibí un código de emparejamiento

Los códigos de emparejamiento se envían **solo** cuando un remitente desconocido envía un mensaje al bot y
`dmPolicy: "pairing"` está habilitado. `/start` por sí solo no genera un código.

Verificar las solicitudes pendientes:

```bash
openclaw pairing list telegram
```

Si desea acceso inmediato, añada su id de remitente a la lista de permitidos o configure `dmPolicy: "open"`
para esa cuenta.

### WhatsApp: ¿Enviará mensajes a mis contactos? ¿Cómo funciona el emparejamiento?

No. La política predeterminada de MD de WhatsApp es **emparejamiento**. Los remitentes desconocidos solo reciben un código de emparejamiento y su mensaje **no se procesa**. OpenClaw solo responde a los chats que recibe o a envíos explícitos que usted active.

Aprobar el emparejamiento con:

```bash
openclaw pairing approve whatsapp <code>
```

Listar las solicitudes pendientes:

```bash
openclaw pairing list whatsapp
```

Solicitud del número de teléfono del asistente: se usa para configurar tu **allowlist/owner** para que se permitan tus propios MD. No se usa para el envío automático. Si ejecutas en tu número personal de WhatsApp, usa ese número y habilita `channels.whatsapp.selfChatMode`.

## Comandos de chat, cancelación de tareas y "no se detendrá"

### ¿Cómo evito que los mensajes internos del sistema aparezcan en el chat

La mayoría de los mensajes internos o de herramientas solo aparecen cuando **verbose** o **reasoning** están habilitados
para esa sesión.

Solución en el chat donde lo veas:

```
/verbose off
/reasoning off
```

Si sigue siendo ruidoso, verifica la configuración de la sesión en la UI de Control y establece verbose
en **inherit**. También confirma que no estás usando un perfil de bot con `verboseDefault` establecido
en `on` en la configuración.

Documentación: [Thinking and verbose](/es/tools/thinking), [Security](/es/gateway/security#reasoning--verbose-output-in-groups).

### ¿Cómo detengo/cancelo una tarea en ejecución

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

Estos son disparadores de aborto (no comandos de barra).

Para procesos en segundo plano (desde la herramienta exec), puedes pedirle al agente que ejecute:

```
process action:kill sessionId:XXX
```

Resumen de comandos de barra: consulta [Slash commands](/es/tools/slash-commands).

La mayoría de los comandos deben enviarse como un mensaje **independiente** que comienza con `/`, pero algunos atajos (como `/status`) también funcionan en línea para remitentes en la lista blanca.

### ¿Cómo envío un mensaje de Discord desde Telegram Mensajía entre contextos denegada

OpenClaw bloquea la mensajería **entre proveedores** (cross-provider) por defecto. Si una llamada a una herramienta está vinculada
a Telegram, no se enviará a Discord a menos que lo permitas explícitamente.

Habilita la mensajería entre proveedores para el agente:

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

### ¿Por qué da la impresión de que el bot ignora mensajes rápidos

El modo de cola controla cómo interactúan los nuevos mensajes con una ejecución en curso. Usa `/queue` para cambiar los modos:

- `steer` - los mensajes nuevos redirigen la tarea actual
- `followup` - ejecuta mensajes uno a uno
- `collect` - agrupa mensajes y responde una vez (por defecto)
- `steer-backlog` - dirige ahora, luego procesa el historial
- `interrupt` - aborta la ejecución actual y comienza de nuevo

Puedes añadir opciones como `debounce:2s cap:25 drop:summarize` para los modos de seguimiento.

## Responder la pregunta exacta de la captura de pantalla/historial de chat

**P: "¿Cuál es el modelo predeterminado para Anthropic con una clave de API?"**

**A:** En OpenClaw, las credenciales y la selección del modelo son separadas. Configurar `ANTHROPIC_API_KEY` (o almacenar una clave de API de Anthropic en los perfiles de autenticación) habilita la autenticación, pero el modelo predeterminado real es el que configures en `agents.defaults.model.primary` (por ejemplo, `anthropic/claude-sonnet-4-5` o `anthropic/claude-opus-4-6`). Si ves `No credentials found for profile "anthropic:default"`, significa que la Gateway no pudo encontrar credenciales de Anthropic en el `auth-profiles.json` esperado para el agente que se está ejecutando.

---

¿Sigues atascado? Pregunta en [Discord](https://discord.com/invite/clawd) o abre una [discusión de GitHub](https://github.com/openclaw/openclaw/discussions).

import en from "/components/footer/en.mdx";

<en />
