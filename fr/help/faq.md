---
summary: "Questions fréquentes sur l'installation, la configuration et l'utilisation d'OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "FAQ"
---

# FAQ

Réponses rapides et dépannage approfondi pour des configurations réelles (dev local, VPS, multi-agent, clés OAuth/API, basculement de model). Pour le diagnostic d'exécution, voir [Troubleshooting](/fr/gateway/troubleshooting). Pour la référence complète de la configuration, voir [Configuration](/fr/gateway/configuration).

## Table des matières

- [Démarrage rapide et configuration du premier lancement]
  - [Je suis bloqué, quel est le moyen le plus rapide de get unstuck ?](#im-stuck-whats-the-fastest-way-to-get-unstuck)
  - [Quelle est la méthode recommandée pour installer et configurer OpenClaw ?](#whats-the-recommended-way-to-install-and-set-up-openclaw)
  - [Comment ouvrir le tableau de bord après l'onboarding ?](#how-do-i-open-the-dashboard-after-onboarding)
  - [Comment authentifier le tableau de bord (token) sur localhost vs distant ?](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [De quel runtime ai-je besoin ?](#what-runtime-do-i-need)
  - [Est-ce que cela fonctionne sur Raspberry Pi ?](#does-it-run-on-raspberry-pi)
  - [Avez-vous des conseils pour l'installation sur Raspberry Pi ?](#any-tips-for-raspberry-pi-installs)
  - [Cela reste bloqué sur « wake up my friend » / l'onboarding ne démarre pas. Que faire ?](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [Puis-je migrer ma configuration vers une nouvelle machine (Mac mini) sans refaire l'onboarding ?](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [Où puis-je voir ce qu'il y a de nouveau dans la dernière version ?](#where-do-i-see-what-is-new-in-the-latest-version)
  - [Je ne peux pas accéder à docs.openclaw.ai (erreur SSL). Que faire ?](#i-cant-access-docsopenclawai-ssl-error-what-now)
  - [Quelle est la différence entre stable et beta ?](#whats-the-difference-between-stable-and-beta)
  - [Comment installer la version beta, et quelle est la différence entre beta et dev ?](#how-do-i-install-the-beta-version-and-whats-the-difference-between-beta-and-dev)
  - [Comment essayer les derniers bits ?](#how-do-i-try-the-latest-bits)
  - [Combien de temps prennent généralement l'installation et l'intégration ?](#how-long-does-install-and-onboarding-usually-take)
  - [L'installateur est bloqué ? Comment obtenir plus de retours ?](#installer-stuck-how-do-i-get-more-feedback)
  - [L'installation Windows indique que git est introuvable ou qu'openclaw n'est pas reconnu](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [La sortie de l'exécutable Windows affiche des caractères chinois illisibles, que dois-je faire ?](#windows-exec-output-shows-garbled-chinese-text-what-should-i-do)
  - [La documentation n'a pas répondu à ma question - comment obtenir une meilleure réponse ?](#the-docs-didnt-answer-my-question-how-do-i-get-a-better-answer)
  - [Comment installer OpenClaw sur Linux ?](#how-do-i-install-openclaw-on-linux)
  - [Comment installer OpenClaw sur un VPS ?](#how-do-i-install-openclaw-on-a-vps)
  - [Où se trouvent les guides d'installation cloud/VPS ?](#where-are-the-cloudvps-install-guides)
  - [Puis-je demander à OpenClaw de se mettre à jour ?](#can-i-ask-openclaw-to-update-itself)
  - [Que fait réellement l'onboarding ?](#what-does-onboarding-actually-do)
  - [Do I need a Claude or OpenAI subscription to run this?](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [Can I use Claude Max subscription without an API key](#can-i-use-claude-max-subscription-without-an-api-key)
  - [How does Anthropic "setup-token" auth work?](#how-does-anthropic-setuptoken-auth-work)
  - [Where do I find an Anthropic setup-token?](#where-do-i-find-an-anthropic-setuptoken)
  - [Do you support Claude subscription auth (Claude Pro or Max)?](#do-you-support-claude-subscription-auth-claude-pro-or-max)
  - [Why am I seeing `HTTP 429: rate_limit_error` from Anthropic?](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [Is AWS Bedrock supported?](#is-aws-bedrock-supported)
  - [How does Codex auth work?](#how-does-codex-auth-work)
  - [Do you support OpenAI subscription auth (Codex OAuth)?](#do-you-support-openai-subscription-auth-codex-oauth)
  - [How do I set up Gemini CLI OAuth](#how-do-i-set-up-gemini-cli-oauth)
  - [Un modèle local est-il adapté aux conversations décontractées ?](#is-a-local-model-ok-for-casual-chats)
  - [Comment puis-je garder le trafic du modèle hébergé dans une région spécifique ?](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [Dois-je acheter un Mac Mini pour installer ceci ?](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [Ai-je besoin d'un Mac mini pour le support iMessage ?](#do-i-need-a-mac-mini-for-imessage-support)
  - [Si j'achète un Mac mini pour exécuter OpenClaw, puis-je le connecter à mon MacBook Pro ?](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [Puis-je utiliser Bun ?](#can-i-use-bun)
  - [Telegram : que dois-je mettre dans `allowFrom` ?](#telegram-what-goes-in-allowfrom)
  - [Plusieurs personnes peuvent-elles utiliser un même numéro WhatsApp avec différentes instances OpenClaw ?](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [Puis-je exécuter un agent "chat rapide" et un agent "Opus pour le codage" ?](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [Homebrew fonctionne-t-il sur Linux ?](#does-homebrew-work-on-linux)
  - [Quelle est la différence entre l'installation piratable (git) et l'installation npm ?](#whats-the-difference-between-the-hackable-git-install-and-npm-install)
  - [Puis-je passer d'une installation npm à git plus tard ?](#can-i-switch-between-npm-and-git-installs-later)
  - [Dois-je exécuter le Gateway sur mon ordinateur portable ou sur un VPS ?](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [Quelle est l'importance d'exécuter OpenClaw sur une machine dédiée ?](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [Quelles sont les configurations minimales du VPS et le système d'exploitation recommandé ?](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [Puis-je exécuter OpenClaw dans une machine virtuelle et quelles sont les configurations requises](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [Qu'est-ce que OpenClaw ?](#what-is-openclaw)
  - [Qu'est-ce que OpenClaw, en un paragraphe ?](#what-is-openclaw-in-one-paragraph)
  - [Quelle est la proposition de valeur ?](#whats-the-value-proposition)
  - [Je viens de l'installer que dois-je faire en premier](#i-just-set-it-up-what-should-i-do-first)
  - [Quels sont les cinq cas d'utilisation quotidiens principaux pour OpenClaw](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [OpenClaw peut-il aider avec la génération de leads, les pubs de prospection et les blogs pour un SaaS ?](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [Quels sont les avantages par rapport à Claude Code pour le développement web ?](#what-are-the-advantages-vs-claude-code-for-web-development)
- [Skills et automatisation](#skills-and-automation)
  - [Comment personnaliser les skills sans salir le dépôt ?](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [Puis-je charger les skills depuis un dossier personnalisé ?](#can-i-load-skills-from-a-custom-folder)
  - [Comment puis-je utiliser différents modèles pour différentes tâches ?](#how-can-i-use-different-models-for-different-tasks)
  - [Le bot gèle pendant qu'il effectue un travail intensif. Comment décharger cela ?](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Les tâches Cron ou les rappels ne se déclenchent pas. Que dois-je vérifier ?](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [Comment installer les skills sur Linux ?](#how-do-i-install-skills-on-linux)
  - [OpenClaw peut-il exécuter des tâches selon un calendrier ou continuellement en arrière-plan ?](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [Puis-je exécuter des compétences exclusives Apple macOS depuis Linux ?](#can-i-run-apple-macos-only-skills-from-linux)
  - [Avez-vous une intégration Notion ou HeyGen ?](#do-you-have-a-notion-or-heygen-integration)
  - [Comment utiliser mon Chrome connecté existant avec OpenClaw ?](#how-do-i-use-my-existing-signed-in-chrome-with-openclaw)
- [Sandboxing et mémoire](#sandboxing-and-memory)
  - [Existe-t-il une documentation dédiée au sandboxing ?](#is-there-a-dedicated-sandboxing-doc)
  - [Comment lier un dossier de l'hôte au bac à sable ?](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [Comment fonctionne la mémoire ?](#how-does-memory-work)
  - [La mémoire continue à oublier des choses. Comment faire pour qu'elle retienne ?](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [La mémoire persiste-t-elle indéfiniment ? Quelles sont les limites ?](#does-memory-persist-forever-what-are-the-limits)
  - [La recherche de mémoire sémantique nécessite-t-elle une clé OpenAI API ?](#does-semantic-memory-search-require-an-openai-api-key)
- [Emplacement des éléments sur le disque](#where-things-live-on-disk)
  - [Toutes les données utilisées avec OpenClaw sont-elles enregistrées localement ?](#is-all-data-used-with-openclaw-saved-locally)
  - [Où OpenClaw stocke-t-il ses données ?](#where-does-openclaw-store-its-data)
  - [Où doivent se trouver AGENTS.md / SOUL.md / USER.md / MEMORY.md ?](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [Quelle est la stratégie de sauvegarde recommandée ?](#whats-the-recommended-backup-strategy)
  - [Comment désinstaller complètement OpenClaw ?](#how-do-i-completely-uninstall-openclaw)
  - [Les agents peuvent-ils fonctionner en dehors de l'espace de travail ?](#can-agents-work-outside-the-workspace)
  - [Je suis en mode distant — où se trouve le stockage de session ?](#im-in-remote-mode-where-is-the-session-store)
- [Notions de base de la configuration](#config-basics)
  - [Quel est le format de la configuration ? Où se trouve-t-elle ?](#what-format-is-the-config-where-is-it)
  - [J'ai défini `gateway.bind: "lan"` (ou `"tailnet"`) et maintenant rien n'écoute / l'interface utilisateur indique non autorisé](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [Pourquoi ai-je besoin d'un jeton sur localhost maintenant ?](#why-do-i-need-a-token-on-localhost-now)
  - [Dois-je redémarrer après avoir modifié la configuration ?](#do-i-have-to-restart-after-changing-config)
  - [Comment désactiver les slogans amusants de la CLI ?](#how-do-i-disable-funny-cli-taglines)
  - [Comment activer la recherche Web (et la récupération Web) ?](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply a effacé ma configuration. Comment récupérer et éviter cela ?](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [Comment exécuter une Gateway centrale avec des workers spécialisés sur plusieurs appareils ?](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [Le navigateur OpenClaw peut-il s'exécuter en mode sans tête (headless) ?](#can-the-openclaw-browser-run-headless)
  - [Comment utiliser Brave pour le contrôle du navigateur ?](#how-do-i-use-brave-for-browser-control)
- [Passerelles et nœuds distants](#remote-gateways-and-nodes)
  - [Comment les commandes se propagent-elles entre Telegram, la passerelle et les nœuds ?](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [Comment mon agent peut-il accéder à mon ordinateur si la Gateway est hébergée à distance ?](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale est connecté mais je ne reçois aucune réponse. Que faire ?](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [Deux instances OpenClaw peuvent-elles communiquer entre elles (local + VPS) ?](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [Ai-je besoin de VPS séparés pour plusieurs agents](#do-i-need-separate-vpses-for-multiple-agents)
  - [Y a-t-il un avantage à utiliser un nœud sur mon ordinateur portable personnel plutôt que SSH depuis un VPS ?](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [Les nœuds exécutent-ils un service de passerelle ?](#do-nodes-run-a-gateway-service)
  - [Existe-t-il un moyen API / RPC d'appliquer la configuration ?](#is-there-an-api-rpc-way-to-apply-config)
  - [Quelle est la configuration minimale « saine » pour une première installation ?](#whats-a-minimal-sane-config-for-a-first-install)
  - [Comment configurer Tailscale sur un VPS et se connecter depuis mon Mac ?](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [Comment connecter un nœud Mac à un Gateway distant (Tailscale Serve) ?](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [Dois-je installer sur un deuxième ordinateur portable ou simplement ajouter un nœud ?](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [Variables d'environnement et chargement .env](#env-vars-and-env-loading)
  - [Comment OpenClaw charge-t-il les variables d'environnement ?](#how-does-openclaw-load-environment-variables)
  - [« J'ai démarré le Gateway via le service et mes variables d'environnement ont disparu. » Et maintenant ?](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [J'ai défini `COPILOT_GITHUB_TOKEN`, mais l'état des modèles indique « Shell env : off. ». Pourquoi ?](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [Sessions et discussions multiples](#sessions-and-multiple-chats)
  - [Comment démarrer une nouvelle conversation ?](#how-do-i-start-a-fresh-conversation)
  - [Les sessions se réinitialisent-elles automatiquement si je n'envoie jamais `/new` ?](#do-sessions-reset-automatically-if-i-never-send-new)
  - [Existe-t-il un moyen de créer une équipe d'instances OpenClaw avec un PDG et plusieurs agents](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [Pourquoi le contexte a-t-il été tronqué en cours de tâche ? Comment l'empêcher ?](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [Comment réinitialiser complètement OpenClaw tout en le gardant installé ?](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [Je reçois des erreurs "context too large" - comment réinitialiser ou compacter ?](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [Pourquoi vois-je "LLM request rejected: messages.content.tool_use.input field required" ?](#why-am-i-seeing-llm-request-rejected-messagescontenttool_useinput-field-required)
  - [Pourquoi reçois-je des messages de heartbeat toutes les 30 minutes ?](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [Do I need to add a "bot account" to a WhatsApp group?](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [How do I get the JID of a WhatsApp group?](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [Why doesn't OpenClaw reply in a group?](#why-doesnt-openclaw-reply-in-a-group)
  - [Do groups/threads share context with DMs?](#do-groupsthreads-share-context-with-dms)
  - [How many workspaces and agents can I create?](#how-many-workspaces-and-agents-can-i-create)
  - [Can I run multiple bots or chats at the same time (Slack), and how should I set that up?](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [Models: defaults, selection, aliases, switching](#models-defaults-selection-aliases-switching)
  - [What is the "default model"?](#what-is-the-default-model)
  - [What model do you recommend?](#what-model-do-you-recommend)
  - [How do I switch models without wiping my config?](#how-do-i-switch-models-without-wiping-my-config)
  - [Puis-je utiliser des modèles auto-hébergés (llama.cpp, vLLM, Ollama) ?](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [Que OpenClaw, Flawd et Krill utilisent-ils comme modèles ?](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [Comment changer de modèle à la volée (sans redémarrage) ?](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [Puis-je utiliser GPT 5.2 pour les tâches quotidiennes et Codex 5.3 pour le codage](#can-i-use-gpt-52-for-daily-tasks-and-codex-53-for-coding)
  - [Pourquoi vois-je « Modèle … non autorisé » et ensuite aucune réponse ?](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [Pourquoi vois-je « Modèle inconnu : minimax/MiniMax-M2.5 » ?](#why-do-i-see-unknown-model-minimaxminimaxm25)
  - [Puis-je utiliser MiniMax par défaut et OpenAI pour les tâches complexes ?](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [opus / sonnet / gpt sont-ils des raccourcis intégrés ?](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [Comment définir/surcharger les raccourcis de modèle (alias) ?](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [Comment ajouter des modèles d'autres fournisseurs comme OpenRouter ou Z.AI ?](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [Bascule de modèle et "All models failed"](#model-failover-and-all-models-failed)
  - [Comment fonctionne la bascule ?](#how-does-failover-work)
  - [Que signifie cette erreur ?](#what-does-this-error-mean)
  - [Liste de vérification pour `No credentials found for profile "anthropic:default"`](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [Pourquoi a-t-il également essayé Google Gemini et échoué ?](#why-did-it-also-try-google-gemini-and-fail)
- [Profils d'authentification : ce qu'ils sont et comment les gérer](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [Qu'est-ce qu'un profil d'authentification ?](#what-is-an-auth-profile)
  - [Quels sont les ID de profil typiques ?](#what-are-typical-profile-ids)
  - [Puis-je contrôler quel profil d'authentification est essayé en premier ?](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth vs clé API : quelle est la différence ?](#oauth-vs-api-key-whats-the-difference)
- [Gateway : ports, « already running » et mode distant](#gateway-ports-already-running-and-remote-mode)
  - [Quel port le Gateway utilise-t-il ?](#what-port-does-the-gateway-use)
  - [Pourquoi `openclaw gateway status` indique-t-il `Runtime: running` mais `RPC probe: failed` ?](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [Pourquoi `openclaw gateway status` affiche-t-il `Config (cli)` et `Config (service)` différents ?](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - [Que signifie « another gateway instance is already listening » ?](#what-does-another-gateway-instance-is-already-listening-mean)
  - [Comment exécuter OpenClaw en mode distant (le client se connecte à un Gateway situé ailleurs) ?](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [L'interface de contrôle indique « unauthorized » (ou se reconnecte en continu). Que faire ?](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [J'ai défini `gateway.bind: "tailnet"` mais il ne peut pas s'attacher / rien n'écoute](#i-set-gatewaybind-tailnet-but-it-cant-bind-nothing-listens)
  - [Puis-je exécuter plusieurs Gateway sur le même hôte ?](#can-i-run-multiple-gateways-on-the-same-host)
  - [Que signifie « invalid handshake » / code 1008 ?](#what-does-invalid-handshake-code-1008-mean)
- [Journalisation et débogage](#logging-and-debugging)
  - [Où se trouvent les journaux ?](#where-are-logs)
  - [Comment démarrer/arrêter/redémarrer le service Gateway ?](#how-do-i-startstoprestart-the-gateway-service)
  - [J'ai fermé mon terminal sur Windows - comment redémarrer OpenClaw ?](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [Le Gateway est opérationnel mais les réponses n'arrivent jamais. Que dois-je vérifier ?](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - [« Déconnecté de la passerelle : aucune raison » - et maintenant ?](#disconnected-from-gateway-no-reason-what-now)
  - [Le setMyCommands de Telegram échoue. Que dois-je vérifier ?](#telegram-setmycommands-fails-what-should-i-check)
  - [TUI n'affiche aucune sortie. Que dois-je vérifier ?](#tui-shows-no-output-what-should-i-check)
  - [Comment arrêter complètement puis démarrer le Gateway ?](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5 : `openclaw gateway restart` contre `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [Quel est le moyen le plus rapide d'obtenir plus de détails en cas d'échec ?](#whats-the-fastest-way-to-get-more-details-when-something-fails)
- [Médias et pièces jointes](#media-and-attachments)
  - [Ma compétence a généré une image/PDF, mais rien n'a été envoyé](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [Sécurité et contrôle d'accès](#security-and-access-control)
  - [Est-il sûr d'exposer OpenClaw aux messages entrants ?](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [L'injection de prompt est-elle uniquement une préoccupation pour les bots publics ?](#is-prompt-injection-only-a-concern-for-public-bots)
  - [Mon bot doit-il avoir son propre compte e-mail GitHub ou numéro de téléphone](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [Puis-je lui donner l'autonomie sur mes SMS et est-ce sûr](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [Puis-je utiliser des modèles moins chers pour les tâches d'assistant personnel ?](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [J'ai exécuté `/start` dans Telegram mais je n'ai pas reçu de code d'appariement](#i-ran-start-in-telegram-but-didnt-get-a-pairing-code)
  - [WhatsApp : va-t-il envoyer des messages à mes contacts ? Comment fonctionne l'appariement ?](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [Commandes de chat, annulation de tâches et "ça ne s'arrête pas"](#chat-commands-aborting-tasks-and-it-wont-stop)
  - [Comment empêcher l'affichage des messages système internes dans le chat](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [Comment arrêter/annuler une tâche en cours d'exécution ?](#how-do-i-stopcancel-a-running-task)
  - [Comment envoyer un message Discord depuis Telegram ? ("Cross-context messaging denied")](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [Pourquoi a-t-on l'impression que le bot "ignore" les messages en rafale ?](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## Premières 60 secondes si quelque chose ne fonctionne pas

1. **Statut rapide (première vérification)**

   ```bash
   openclaw status
   ```

   Résumé local rapide : OS + mise à jour, accessibilité de la passerelle/du service, agents/sessions, configuration du provider + problèmes d'exécution (lorsque la passerelle est accessible).

2. **Rapport copiable (sûr à partager)**

   ```bash
   openclaw status --all
   ```

   Diagnostic en lecture seule avec le suivi des journaux (jetons expurgés).

3. **État du démon + du port**

   ```bash
   openclaw gateway status
   ```

   Affiche l'exécution du superviseur par rapport à l'accessibilité RPC, l'URL de la sonde cible et la configuration probablement utilisée par le service.

4. **Sondes approfondies**

   ```bash
   openclaw status --deep
   ```

   Exécute des contrôles de santé de la passerelle + sondages de fournisseur (nécessite une passerelle accessible). Voir [Health](/fr/gateway/health).

5. **Suivre le dernier journal**

   ```bash
   openclaw logs --follow
   ```

   Si RPC est en panne, revenez à :

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Les journaux de fichiers sont distincts des journaux de service ; voir [Logging](/fr/logging) et [Troubleshooting](/fr/gateway/troubleshooting).

6. **Exécuter le docteur (réparations)**

   ```bash
   openclaw doctor
   ```

   Répare/migre la configuration/l'état + exécute des contrôles de santé. Voir [Doctor](/fr/gateway/doctor).

7. **Instantané Gateway**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Demande à la passerelle en cours d'exécution une capture instantanée complète (WS uniquement). Voir [Health](/fr/gateway/health).

## Quick start et configuration de premier lancement

### Je suis bloqué, quelle est la méthode la plus rapide pour se débloquer

Utilisez un agent IA local qui peut **voir votre machine**. C'est beaucoup plus efficace que de demander
dans Discord, car la plupart des cas « Je suis bloqué » sont des **problèmes de configuration locale ou d'environnement** que
les assistants à distance ne peuvent pas inspecter.

- **Claude Code** : [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
- **OpenAI Codex** : [https://openai.com/codex/](https://openai.com/codex/)

Ces outils peuvent lire le dépôt, exécuter des commandes, inspecter les journaux et aider à corriger votre configuration
au niveau de la machine (PATH, services, permissions, fichiers d'auth). Donnez-leur le **checkout complet des sources** via
l'installation piratable (git) :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Cela installe OpenClaw **à partir d'un git checkout**, afin que l'agent puisse lire le code + la documentation et
raisonner sur la version exacte que vous exécutez. Vous pourrez toujours revenir à la stable plus tard
en ré-exécutant l'installateur sans `--install-method git`.

Conseil : demandez à l'agent de **planifier et superviser** la correction (étape par étape), puis n'exécutez que les
commandes nécessaires. Cela permet de garder les modifications limitées et plus faciles à auditer.

Si vous découvrez un vrai bug ou une correction, veuillez signaler un problème GitHub ou envoyer une PR :
[https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
[https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

Commencez par ces commandes (partagez les sorties lorsque vous demandez de l'aide) :

```bash
openclaw status
openclaw models status
openclaw doctor
```

Ce qu'elles font :

- `openclaw status`: capture instantanée rapide de l'état de la passerelle/de l'agent + configuration de base.
- `openclaw models status`: vérifie l'auth du fournisseur + la disponibilité du modèle.
- `openclaw doctor` : valide et répare les problèmes courants de configuration/état.

Autres vérifications CLI utiles : `openclaw status --all`, `openclaw logs --follow`,
`openclaw gateway status`, `openclaw health --verbose`.

Boucle de débogage rapide : [First 60 seconds if something's broken](#first-60-seconds-if-somethings-broken).
Docs d'installation : [Install](/fr/install), [Installer flags](/fr/install/installer), [Updating](/fr/install/updating).

### Quelle est la méthode recommandée pour installer et configurer OpenClaw

Le dépôt recommande de l'exécuter à partir de la source et d'utiliser l'onboarding :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

L'assistant peut également construire les éléments de l'interface utilisateur automatiquement. Après l'onboarding, vous exécutez généralement le Gateway sur le port **18789**.

À partir du code source (contributeurs/développeurs) :

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw onboard
```

Si vous n'avez pas encore d'installation globale, exécutez-le via `pnpm openclaw onboard`.

### Comment ouvrir le tableau de bord après l'onboarding

L'assistant ouvre votre navigateur avec une URL propre (sans token) du tableau de bord juste après l'onboarding et affiche également le lien dans le résumé. Gardez cet onglet ouvert ; s'il ne s'est pas lancé, copiez/collez l'URL affichée sur la même machine.

### Comment authentifier le jeton du tableau de bord sur localhost vs à distance

**Localhost (même machine) :**

- Ouvrez `http://127.0.0.1:18789/`.
- Si une authentification est demandée, collez le jeton de `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`) dans les paramètres de Control UI.
- Récupérez-le depuis l'hôte de la passerelle : `openclaw config get gateway.auth.token` (ou générez-en un : `openclaw doctor --generate-gateway-token`).

**Pas sur localhost :**

- **Tailscale Serve** (recommandé) : conservez la liaison loopback, exécutez `openclaw gateway --tailscale serve`, ouvrez `https://<magicdns>/`. Si `gateway.auth.allowTailscale` est `true`, les en-têtes d'identité satisfont l'authentification Control UI/WebSocket (pas de jeton, suppose un hôte de passerelle de confiance) ; les API HTTP nécessitent toujours un jeton/mot de passe.
- **Liaison Tailnet** : exécutez `openclaw gateway --bind tailnet --token "<token>"`, ouvrez `http://<tailscale-ip>:18789/`, collez le jeton dans les paramètres du tableau de bord.
- **Tunnel SSH** : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/` et collez le jeton dans les paramètres de l'interface Control UI.

Voir [Dashboard](/fr/web/dashboard) et [Web surfaces](/fr/web) pour les modes de liaison et les détails d'authentification.

### De quel runtime ai-je besoin

Node **>= 22** est requis. `pnpm` est recommandé. Bun est **déconseillé** pour le Bun.

### Est-ce que cela fonctionne sur Raspberry Pi

Oui. Le Gateway est léger - la documentation indique que **512 Mo à 1 Go de RAM**, **1 cœur**, et environ **500 Mo** d'espace disque suffisent pour un usage personnel, et note qu'un **Raspberry Pi 4 peut l'exécuter**.

Si vous souhaitez une marge supplémentaire (journaux, médias, autres services), **2 Go sont recommandés**, mais ce n'est pas un minimum strict.

Astuce : un petit Pi/VPS peut héberger le Gateway, et vous pouvez coupler des **nœuds** sur votre ordinateur portable/téléphone pour
l'écran/la caméra/le canevas local ou l'exécution de commandes. Voir [Nodes](/fr/nodes).

### Conseils pour l'installation sur Raspberry Pi

Version courte : cela fonctionne, mais attendez-vous à des angles rugueux.

- Utilisez un système d'exploitation **64 bits** et gardez Node >= 22.
- Privilégiez l'**installation pirateable (git)** afin que vous puissiez voir les journaux et mettre à jour rapidement.
- Commencez sans channels/skills, puis ajoutez-les un par un.
- Si vous rencontrez des problèmes binaires étranges, il s'agit généralement d'un problème de **compatibilité ARM**.

Docs : [Linux](/fr/platforms/linux), [Install](/fr/install).

### C'est bloqué sur wake up my friend onboarding will not hatch Et maintenant

Cet écran dépend de l'accessibilité et de l'authentification du Gateway. Le TUI envoie également automatiquement "Wake up, my friend!" lors du premier éclos. Si vous voyez cette ligne avec **pas de réponse** et que les tokens restent à 0, l'agent n'a jamais fonctionné.

1. Redémarrez le Gateway :

```bash
openclaw gateway restart
```

2. Vérifiez le statut + l'auth :

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

3. Si cela bloque toujours, exécutez :

```bash
openclaw doctor
```

Si le Gateway est distant, assurez-vous que la connexion tunnel/Tailscale est active et que l'interface utilisateur
est pointée vers le bon Gateway. Voir [Remote access](/fr/gateway/remote).

### Puis-je migrer ma configuration vers une nouvelle machine Mac mini sans refaire l'onboarding

Oui. Copiez le **répertoire d'état** et le **workspace**, puis exécutez Doctor une fois. Cela garde votre bot "exactement le même" (mémoire, historique de session, auth, et état du channel) tant que vous copiez **les deux** emplacements :

1. Installez OpenClaw sur la nouvelle machine.
2. Copiez `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) depuis l'ancienne machine.
3. Copiez votre espace de travail (par défaut : `~/.openclaw/workspace`).
4. Exécutez `openclaw doctor` et redémarrez le service Gateway.

Cela préserve la configuration, les profils d'authentification, les identifiants WhatsApp, les sessions et la mémoire. Si vous êtes en
mode distant, n'oubliez pas que l'hôte de la passerelle possède le magasin de sessions et l'espace de travail.

**Important :** si vous ne faites que committer/pusher votre espace de travail vers GitHub, vous sauvegardez
la **mémoire + les fichiers d'amorçage**, mais **pas** l'historique des sessions ni l'authentification. Ceux-ci se trouvent
sous `~/.openclaw/` (par exemple `~/.openclaw/agents/<agentId>/sessions/`).

Connexes : [Migration](/fr/install/migrating), [Emplacement des fichiers sur le disque](/fr/help/faq#where-does-openclaw-store-its-data),
[Espace de travail de l'agent](/fr/concepts/agent-workspace), [Doctor](/fr/gateway/doctor),
[Mode distant](/fr/gateway/remote).

### Où puis-voir les nouveautés de la dernière version

Consultez le journal des modifications GitHub :
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

Les entrées les plus récentes sont en haut. Si la section supérieure est marquée **Unreleased**, la prochaine section
datée est la dernière version publiée. Les entrées sont regroupées par **Points forts**, **Modifications** et
**Corrections** (ainsi que les docs/autres sections si nécessaire).

### Je ne peux pas accéder à docs.openclaw.ai erreur SSL Que faire

Certaines connexions Comcast/Xfinity bloquent incorrectement `docs.openclaw.ai` via la
sécurité avancée Xfinity. Désactivez-la ou mettez `docs.openclaw.ai` sur la liste autorisée, puis réessayez. Pour plus
de détails : [Dépannage](/fr/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity).
S'il vous plaît, aidez-nous à débloquer cela en signalant ici : [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

Si vous ne parvenez toujours pas à atteindre le site, la documentation est disponible en miroir sur GitHub :
[https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

### Quelle est la différence entre stable et beta

**Stable** et **beta** sont des **dist-tags npm**, et non des lignes de code distinctes :

- `latest` = stable
- `beta` = version précoce pour les tests

Nous publions des builds sur **beta**, les testons, et une fois qu'un build est solide, nous **promouvons
cette même version vers `latest`**. C'est pourquoi beta et stable peuvent pointer vers la
**même version**.

Voir ce qui a changé :
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

### Comment installer la version bêta et quelle est la différence entre bêta et dev

**Beta** est le dist-tag npm `beta` (peut correspondre à `latest`).
**Dev** est la tête mobile de `main` (git) ; lors de la publication, il utilise le dist-tag npm `dev`.

Lignes de commande (macOS/Linux) :

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Installateur Windows (PowerShell) :
[https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

Plus de détails : [Canaux de développement](/fr/install/development-channels) et [Indicateurs de l'installateur](/fr/install/installer).

### Combien de temps prennent généralement l'installation et l'onboarding

Guide approximatif :

- **Installation :** 2-5 minutes
- **Onboarding :** 5-15 minutes selon le nombre de canaux/modèles que vous configurez

Si cela bloque, utilisez [Installateur bloqué](/fr/help/faq#installer-stuck-how-do-i-get-more-feedback)
et la boucle de débogage rapide dans [Je suis bloqué](/fr/help/faq#im-stuck--whats-the-fastest-way-to-get-unstuck).

### Comment essayer les dernières fonctionnalités

Deux options :

1. **Canal Dev (git checkout) :**

```bash
openclaw update --channel dev
```

Cela bascule vers la branche `main` et met à jour à partir de la source.

2. **Installation modifiable (depuis le site de l'installateur) :**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Cela vous donne un dépôt local que vous pouvez modifier, puis mettre à jour via git.

Si vous préférez faire un clone manuel propre, utilisez :

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

Documentation : [Mise à jour](/fr/cli/update), [Canaux de développement](/fr/install/development-channels),
[Installation](/fr/install).

### Installateur bloqué Comment obtenir plus de retours

Relancez l'installateur avec **sortie détaillée** :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

Installation Beta avec mode détaillé :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

Pour une installation modifiable (git) :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
```

Équivalent Windows (PowerShell) :

```powershell
# install.ps1 has no dedicated -Verbose flag yet.
Set-PSDebug -Trace 1
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
Set-PSDebug -Trace 0
```

Plus d'options : [Indicateurs d'installation](/fr/install/installer).

### L'installation Windows indique que git est introuvable ou openclaw non reconnu

Deux problèmes courants Windows :

**1) Erreur npm spawn git / git not found**

- Installez **Git pour Windows** et assurez-vous que `git` est dans votre PATH.
- Fermez et rouvrez PowerShell, puis relancez l'installateur.

**2) openclaw n'est pas reconnu après l'installation**

- Votre dossier global bin npm n'est pas dans le PATH.
- Vérifiez le chemin :

  ```powershell
  npm config get prefix
  ```

- Ajoutez ce répertoire à votre PATH utilisateur (pas de suffixe `\bin` nécessaire sur Windows ; sur la plupart des systèmes, c'est `%AppData%\npm`).
- Fermez et rouvrez PowerShell après avoir mis à jour le PATH.

Si vous souhaitez la configuration Windows la plus fluide, utilisez **WSL2** au lieu de Windows natif.
Documentation : [Windows](/fr/platforms/windows).

### La sortie exec Windows affiche du texte chinois illisible, que dois-je faire

Il s'agit généralement d'une inadéquation de la page de codes de la console sur les shells natifs Windows.

Symptômes :

- La sortie `system.run`/`exec` affiche le chinois sous forme de mojibake
- La même commande s'affiche correctement dans un autre profil de terminal

Solution rapide dans PowerShell :

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

Redémarrez ensuite le Gateway et réessayez votre commande :

```powershell
openclaw gateway restart
```

Si vous rencontrez toujours ce problème avec la dernière version de OpenClaw, suivez ou signalez-le ici :

- [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

### La documentation n'a pas répondu à ma question, comment obtenir une meilleure réponse

Utilisez l'**installation hackable (git)** pour avoir la source complète et la documentation en local, puis demandez
à votre bot (ou Claude/Codex) _depuis ce dossier_ afin qu'il puisse lire le dépôt et répondre précisément.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Plus de détails : [Installer](/fr/install) et [Flags de l'installateur](/fr/install/installer).

### Comment installer OpenClaw sur Linux

Réponse courte : suivez le guide Linux, puis exécutez l'onboarding.

- Chemin rapide Linux + installation du service : [Linux](/fr/platforms/linux).
- Procédure pas à pas : [Getting Started](/fr/start/getting-started).
- Installateur + mises à jour : [Install & updates](/fr/install/updating).

### Comment installer OpenClaw sur un VPS

N'importe quel VPS Linux fonctionne. Installez sur le serveur, puis utilisez SSH/Tailscale pour accéder au Gateway.

Guides : [exe.dev](/fr/install/exe-dev), [Hetzner](/fr/install/hetzner), [Fly.io](/fr/install/fly).
Accès distant : [Gateway remote](/fr/gateway/remote).

### Où trouver les guides d'installation pour cloudVPS

Nous maintenons un **hub d'hébergement** avec les fournisseurs courants. Choisissez-en un et suivez le guide :

- [Hébergement VPS](/fr/vps) (tous les fournisseurs au même endroit)
- [Fly.io](/fr/install/fly)
- [Hetzner](/fr/install/hetzner)
- [exe.dev](/fr/install/exe-dev)

Fonctionnement dans le cloud : la **Gateway s'exécute sur le serveur**, et vous y accédez
depuis votre ordinateur/téléphone via l'interface de contrôle (ou Tailscale/SSH). Votre état + votre espace de travail
résident sur le serveur, traitez donc l'hôte comme la source de vérité et sauvegardez-le.

Vous pouvez associer des **nœuds** (Mac/iOS/Android/headless) à cette Gateway cloud pour accéder
à l'écran/caméra/canevas local ou exécuter des commandes sur votre ordinateur tout en gardant la
Gateway dans le cloud.

Hub : [Plateformes](/fr/platforms). Accès à distance : [Gateway distant](/fr/gateway/remote).
Nœuds : [Nœuds](/fr/nodes), [CLI des nœuds](/fr/cli/nodes).

### Puis-je demander à OpenClaw de se mettre à jour lui-même

Réponse courte : **possible, non recommandé**. Le flux de mise à jour peut redémarrer la
Gateway (ce qui coupe la session active), peut nécessiter un git checkout propre et
peut demander une confirmation. Plus sûr : exécutez les mises à jour depuis un shell en tant qu'opérateur.

Utilisez la CLI :

```bash
openclaw update
openclaw update status
openclaw update --channel stable|beta|dev
openclaw update --tag <dist-tag|version>
openclaw update --no-restart
```

Si vous devez absolument automatiser depuis un agent :

```bash
openclaw update --yes --no-restart
openclaw gateway restart
```

Docs : [Mise à jour](/fr/cli/update), [Mise à jour](/fr/install/updating).

### Que fait réellement l'intégration

`openclaw onboard` est la méthode d'installation recommandée. En **mode local**, elle vous guide à travers :

- **Configuration du modèle/de l'auth** (flux OAuth/setup-token du fournisseur et clés API prises en charge, plus options de modèle local telles que LM Studio)
- Emplacement de l'**Espace de travail** + fichiers d'amorçage
- Paramètres de la **Gateway** (bind/port/auth/tailscale)
- **Fournisseurs** (WhatsApp, Telegram, Discord, Mattermost (plugin), Signal, iMessage)
- **Installation du démon** (LaunchAgent sur macOS ; unité utilisateur systemd sur Linux/WSL2)
- Sélection des **Contrôles de santé** et des **compétences**

Il avertit également si votre modèle configuré est inconnu ou s'il manque une authentification.

### Ai-je besoin d'un abonnement Claude ou OpenAI pour exécuter ceci

Non. Vous pouvez exécuter OpenClaw avec des **clés d'API** (Anthropic/OpenAI/autres) ou avec des **modèles uniquement locaux**, afin que vos données restent sur votre appareil. Les abonnements (Claude Pro/Max ou OpenAI Codex) sont des moyens facultatifs pour authentifier ces fournisseurs.

Si vous choisissez l'authentification par abonnement Anthropic, décidez par vous-même de l'utiliser : Anthropic a bloqué certaines utilisations d'abonnement en dehors de Claude Code par le passé. L'OAuth OpenAI Codex est explicitement pris en charge pour les outils externes comme OpenClaw.

Docs : [Anthropic](/fr/providers/anthropic), [OpenAI](/fr/providers/openai),
[Modèles locaux](/fr/gateway/local-models), [Modèles](/fr/concepts/models).

### Puis-je utiliser l'abonnement Claude Max sans clé d'API

Oui. Vous pouvez vous authentifier avec un **setup-token**
au lieu d'une clé d'API. C'est la voie de l'abonnement.

Les abonnements Claude Pro/Max **n'incluent pas de clé d'API**, c'est donc la
voie technique pour les comptes abonnés. Mais la décision vous appartient : Anthropic
a bloqué certaines utilisations d'abonnement en dehors de Claude Code par le passé.
Si vous souhaitez la voie prise en charge la plus claire et la plus sûre pour la production, utilisez une clé d'API Anthropic.

### Comment fonctionne l'authentification par setuptoken Anthropic

`claude setup-token` génère une **chaîne de jeton** via le CLI Claude Code (elle n'est pas disponible dans la console web). Vous pouvez l'exécuter sur **n'importe quelle machine**. Choisissez **Jeton Anthropic (coller setup-token)** lors de l'onboarding ou collez-le avec `openclaw models auth paste-token --provider anthropic`. Le jeton est stocké en tant que profil d'authentification pour le fournisseur **anthropic** et utilisé comme une clé API (pas d'actualisation automatique). Plus de détails : [OAuth](/fr/concepts/oauth).

### Où puis-je trouver un setuptoken Anthropic

Il n'est **pas** dans la console Anthropic. Le setup-token est généré par le **Anthropic Claude Code** sur **n'importe quelle machine** :

```bash
claude setup-token
```

Copiez le jeton qu'il affiche, puis choisissez **Jeton Anthropic (coller setup-token)** lors de l'onboarding. Si vous souhaitez l'exécuter sur l'hôte de la passerelle, utilisez `openclaw models auth setup-token --provider anthropic`. Si vous avez exécuté `claude setup-token` ailleurs, collez-le sur l'hôte de la passerelle avec `openclaw models auth paste-token --provider anthropic`. Voir [Anthropic](/fr/providers/anthropic).

### Prenez-vous en charge l'authentification par abonnement Claude (Claude Pro ou Max) ?

Oui - via **setup-token**. OpenClaw ne réutilise plus les jetons CLI de la OAuth Anthropic ; utilisez un setup-token ou une clé API de l'Anthropic. Générez le jeton n'importe où et collez-le sur l'hôte de la passerelle. Voir [OAuth](/fr/providers/anthropic) et [OAuth](/fr/concepts/oauth).

Important : il s'agit d'une compatibilité technique, et non d'une garantie de politique. Anthropic
a bloqué par le passé certaines utilisations d'abonnement en dehors de Claude Code.
Vous devez décider de l'utiliser et vérifier les conditions actuelles de Anthropic.
Pour les charges de travail de production ou multi-utilisateurs, l'authentification par clé Anthropic API est le choix le plus sûr et recommandé.

### Pourquoi vois-je l'erreur de limite de débit HTTP 429 de Anthropic ?

Cela signifie que votre **quota/limite de débit Anthropic** est épuisé pour la fenêtre actuelle. Si vous
utilisez un **abonnement Claude** (setup-token), attendez que la fenêtre
se réinitialise ou mettez à niveau votre plan. Si vous utilisez une **clé Anthropic API**, vérifiez la console Anthropic
pour l'utilisation/facturation et augmentez les limites si nécessaire.

Si le message est spécifiquement :
`Extra usage is required for long context requests`, la requête essaie d'utiliser
la version bêta de contexte 1M d'Anthropic (`context1m: true`). Cela ne fonctionne que lorsque votre
identifiant est éligible à la facturation de contexte long (facturation par clé API ou abonnement
avec Extra Usage activé).

Astuce : définissez un **modèle de repli** afin que OpenClaw puisse continuer à répondre pendant qu'un fournisseur est limité par le taux.
Voir [Modèles](/fr/cli/models), [OAuth](/fr/concepts/oauth) et
[/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/fr/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

### AWS Bedrock est-il pris en charge ?

Oui - via le fournisseur **Amazon Bedrock (Converse)** de pi-ai avec une **configuration manuelle**. Vous devez fournir les identifiants/la région AWS sur l'hôte de la passerelle et ajouter une entrée de fournisseur Bedrock dans votre configuration de modèles. Voir [Amazon Bedrock](/fr/providers/bedrock) et [Fournisseurs de modèles](/fr/providers/models). Si vous préférez un flux de clé géré, un proxy compatible OpenAI devant Bedrock reste une option valide.

### Comment fonctionne l'authentification Codex

OpenClaw prend en charge **OpenAI Code (Codex)** via OAuth (connexion ChatGPT). L'intégration peut exécuter le flux OAuth et définira le modèle par défaut sur `openai-codex/gpt-5.4` si approprié. Voir [Fournisseurs de modèles](/fr/concepts/model-providers) et [Intégration (CLI)](/fr/start/wizard).

### Prenez-vous en charge l'authentification par abonnement OpenAI Codex OAuth

Oui. OpenClaw prend entièrement en charge l'abonnement **OpenAI Code (Codex) OAuth**.
OpenAI autorise explicitement l'utilisation de l'abonnement OAuth dans les outils/workflows externes
tels que OpenClaw. L'onboarding peut exécuter le flux OAuth pour vous.

Voir [OAuth](/fr/concepts/oauth), [Fournisseurs de modèles](/fr/concepts/model-providers) et [Onboarding (CLI)](/fr/start/wizard).

### Comment configurer l'authentification CLI du OAuth Gemini

Le CLI Gemini utilise un **flux d'authentification par plugin**, et non un identifiant client ou un secret dans `openclaw.json`.

Étapes :

1. Activer le plugin : `openclaw plugins enable google`
2. Connexion : `openclaw models auth login --provider google-gemini-cli --set-default`

Cela stocke les jetons OAuth dans les profils d'authentification sur l'hôte de la passerelle. Détails : [Fournisseurs de modèles](/fr/concepts/model-providers).

### Un modèle local est-il adapté aux discussions occasionnelles

En général, non. OpenClaw nécessite un grand contexte + une forte sécurité ; les petites cartes tronquent et fuient. Si vous devez le faire, exécutez la version **la plus grande** de MiniMax M2.5 que vous pouvez localement (LM Studio) et consultez [/gateway/local-models](/fr/gateway/local-models). Les modèles plus petits/quantifiés augmentent le risque d'injection de prompt - voir [Sécurité](/fr/gateway/security).

### Comment garder le trafic du modèle hébergé dans une région spécifique

Choisissez des points de terminaison épinglés par région. OpenRouter expose des options hébergées aux États-Unis pour MiniMax, Kimi et GLM ; choisissez la variante hébergée aux États-Unis pour garder les données dans la région. Vous pouvez toujours lister Anthropic/OpenAI à côté de ceux-ci en utilisant `models.mode: "merge"` afin que les solutions de repli restent disponibles tout en respectant le provider régional que vous sélectionnez.

### Dois-je acheter un Mac Mini pour installer ceci

Non. OpenClaw fonctionne sur macOS ou Linux (Windows via WSL2). Un Mac mini est facultatif - certaines personnes en achètent un comme hôte toujours allumé, mais un petit VPS, un serveur domestique, ou une boîte de type Raspberry Pi fonctionne aussi.

Vous n'avez besoin d'un Mac que pour les outils **uniques à macOS**. Pour iMessage, utilisez [BlueBubbles](/fr/channels/bluebubbles) (recommandé) - le serveur BlueBubbles s'exécute sur n'importe quel Mac, et la Gateway peut fonctionner sur Linux ou ailleurs. Si vous souhaitez d'autres outils uniques à macOS, exécutez la Gateway sur un Mac ou associez un nœud macOS.

Documentation : [BlueBubbles](/fr/channels/bluebubbles), [Nœuds](/fr/nodes), [Mode Mac distant](/fr/platforms/mac/remote).

### Ai-je besoin d'un Mac mini pour la prise en charge d'iMessage

Vous avez besoin d'**un appareil macOS** connecté à Messages. Ce n'**pas** obligé d'être un Mac mini -
n'importe quel Mac fonctionne. **Utilisez [BlueBubbles](/fr/channels/bluebubbles)** (recommandé) pour iMessage - le serveur BlueBubbles s'exécute sur macOS, tandis que la Gateway peut fonctionner sur Linux ou ailleurs.

Configurations courantes :

- Exécutez la Gateway sur Linux/VPS, et exécutez le serveur BlueBubbles sur n'importe quel Mac connecté à Messages.
- Exécutez tout sur le Mac si vous voulez la configuration mono-machine la plus simple.

Documentation : [BlueBubbles](/fr/channels/bluebubbles), [Nœuds](/fr/nodes),
[Mode Mac distant](/fr/platforms/mac/remote).

### Si j'achète un Mac mini pour exécuter OpenClaw, puis-je le connecter à mon MacBook Pro

Oui. Le **Mac mini peut faire tourner le Gateway**, et votre MacBook Pro peut se connecter en tant que
**nœud** (périphérique compagnon). Les nœuds ne font pas tourner le Gateway - ils fournissent des capacités supplémentaires comme l'écran/l'appareil photo/toile et `system.run` sur ce périphérique.

Motif courant :

- Gateway sur le Mac mini (toujours actif).
- Le MacBook Pro exécute l'application macOS ou un hôte de nœud et se couple au Gateway.
- Utilisez `openclaw nodes status` / `openclaw nodes list` pour le voir.

Documentation : [Nœuds](/fr/nodes), [CLI des nœuds](/fr/cli/nodes).

### Puis-je utiliser Bun

Bun n'est **pas recommandé**. Nous constatons des bugs d'exécution, notamment avec WhatsApp et Telegram.
Utilisez **Node** pour des passerelles stables.

Si vous souhaitez toujours expérimenter avec Bun, faites-le sur une passerelle hors production
sans WhatsApp/Telegram.

### Telegram que faut-il mettre dans allowFrom

`channels.telegram.allowFrom` est **l'ID d'utilisateur Telegram de l'expéditeur humain** (numérique). Ce n'est pas le nom d'utilisateur du bot.

L'intégration accepte une entrée `@username` et la résout en un ID numérique, mais l'autorisation OpenClaw n'utilise que des ID numériques.

Plus sûr (pas de bot tiers) :

- Envoyez un DM à votre bot, puis exécutez `openclaw logs --follow` et lisez `from.id`.

API Bot officielle :

- Envoyez un DM à votre bot, puis appelez `https://api.telegram.org/bot<bot_token>/getUpdates` et lisez `message.from.id`.

Tiers (moins privé) :

- DM `@userinfobot` ou `@getidsbot`.

Voir [/channels/telegram](/fr/channels/telegram#access-control-dms--groups).

### Plusieurs personnes peuvent-elles utiliser un même numéro WhatsApp avec différentes instances OpenClaw

Oui, via le **routage multi-agent**. Liez le **DM** WhatsApp de chaque expéditeur (pair `kind: "direct"`, expéditeur E.164 comme `+15551234567`) à un `agentId` différent, afin que chaque personne ait son propre espace de travail et son propre magasin de session. Les réponses proviennent toujours du **même compte WhatsApp**, et le contrôle d'accès DM (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`) est global par compte WhatsApp. Voir [Multi-Agent Routing](/fr/concepts/multi-agent) et [WhatsApp](/fr/channels/whatsapp).

### Puis-je exécuter un agent de chat rapide et un agent Opus pour le codage

Oui. Utilisez le routage multi-agent : donnez à chaque agent son propre model par défaut, puis liez les routes entrantes (compte fournisseur ou pairs spécifiques) à chaque agent. Un exemple de configuration se trouve dans [Multi-Agent Routing](/fr/concepts/multi-agent). Voir aussi [Models](/fr/concepts/models) et [Configuration](/fr/gateway/configuration).

### Homebrew fonctionne-t-il sur Linux

Oui. Homebrew prend en charge Linux (Linuxbrew). Installation rapide :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

Si vous exécutez OpenClaw via systemd, assurez-vous que le PATH du service inclut `/home/linuxbrew/.linuxbrew/bin` (ou votre préfixe brew) afin que les outils installés via `brew` soient résolus dans les shells non-login.
Les versions récentes ajoutent également au début les répertoires bin utilisateur courants pour les services systemd Linux (par exemple `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) et respectent `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` et `FNM_DIR` lorsqu'ils sont définis.

### Quelle est la différence entre l'installation hackable via git et l'installation npm

- **Installation hackable (git) :** extraction complète du code source, modifiable, idéale pour les contributeurs.
  Vous exécutez les builds localement et pouvez modifier le code/la documentation.
- **Installation npm :** installation globale CLI, sans dépôt, idéale pour "just run it."
  Les mises à jour proviennent des dist-tags npm.

Docs : [Getting started](/fr/start/getting-started), [Updating](/fr/install/updating).

### Puis-je basculer entre npm et les installations git ultérieurement

Oui. Installez l'autre version, puis exécutez Doctor pour que le service de passerelle pointe vers le nouveau point d'entrée.
Cela **ne supprime pas vos données** - cela modifie uniquement l'installation du code OpenClaw. Votre état
(`~/.openclaw`) et votre espace de travail (`~/.openclaw/workspace`) restent intouchés.

De npm → git :

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
openclaw doctor
openclaw gateway restart
```

De git → npm :

```bash
npm install -g openclaw@latest
openclaw doctor
openclaw gateway restart
```

Doctor détecte une inadéquation du point d'entrée du service de passerelle et propose de réécrire la configuration du service pour correspondre à l'installation actuelle (utilisez `--repair` dans l'automatisation).

Conseils de sauvegarde : voir [Stratégie de sauvegarde](/fr/help/faq#whats-the-recommended-backup-strategy).

### Dois-je exécuter le Gateway sur mon ordinateur portable ou sur un VPS

Réponse courte : **si vous voulez une fiabilité 24/7, utilisez un VPS**. Si vous voulez le
moins de friction possible et que vous êtes à l'aise avec les mises en veille/redémarrages, exécutez-le localement.

**Ordinateur portable (Gateway locale)**

- **Avantages :** pas de coût de serveur, accès direct aux fichiers locaux, fenêtre de navigateur en direct.
- **Inconvénients :** mise en veille/chutes de réseau = déconnexions, les mises à jour/redémarrages de l'OS interrompent, doit rester allumé.

**VPS / cloud**

- **Avantages :** toujours actif, réseau stable, pas de problèmes de mise en veille de l'ordinateur portable, plus facile à garder en fonctionnement.
- **Inconvénients :** souvent sans tête (tête d'affichage) (utilisez des captures d'écran), accès aux fichiers uniquement à distance, vous devez utiliser SSH pour les mises à jour.

**Note spécifique à OpenClaw :** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord fonctionnent tous correctement depuis un VPS. Le seul réel compromis est entre un **navigateur sans tête** (headless) et une fenêtre visible. Voir [Navigateur](/fr/tools/browser).

**Par défaut recommandé :** VPS si vous avez déjà eu des déconnexions de gateway. Le mode local est excellent lorsque vous utilisez activement le Mac et que vous souhaitez un accès aux fichiers locaux ou une automatisation de l'interface utilisateur avec un navigateur visible.

### Quelle est l'importance d'exécuter OpenClaw sur une machine dédiée

Non requis, mais **recommandé pour la fiabilité et l'isolement**.

- **Hôte dédié (VPS/Mac mini/Pi) :** toujours actif, moins d'interruptions de mise en veille/redémarrage, autorisations plus propres, plus facile à maintenir en fonctionnement.
- **Ordinateur portable/de bureau partagé :** totalement correct pour les tests et l'utilisation active, mais attendez-vous à des pauses lorsque la machine se met en veille ou se met à jour.

Si vous souhaitez profiter du meilleur des deux mondes, gardez le Gateway sur un hôte dédié et associez votre ordinateur portable en tant que **nœud** pour les outils locaux d'écran/caméra/exécution. Voir [Nodes](/fr/nodes).
Pour des conseils de sécurité, lisez [Security](/fr/gateway/security).

### Quelles sont les configuration minimale requise pour le VPS et le système d'exploitation recommandé

OpenClaw est léger. Pour une passerelle (Gateway) de base + un channel de discussion :

- **Minimum absolu :** 1 vCPU, 1 Go de RAM, ~500 Mo d'espace disque.
- **Recommandé :** 1-2 vCPU, 2 Go de RAM ou plus pour la marge de manœuvre (journaux, médias, channels multiples). Les outils Node et l'automatisation du navigateur peuvent être gourmands en ressources.

**OS :** utilisez **Ubuntu LTS** (ou n'importe quel Debian/Ubuntu moderne). Le chemin d'installation sous Linux est le mieux testé sur ces systèmes.

Docs : [Linux](/fr/platforms/linux), [VPS hosting](/fr/vps).

### Puis-je exécuter OpenClaw dans une machine virtuelle et quels sont les prérequis

Oui. Traitez une machine virtuelle (VM) comme un VPS : elle doit être toujours allumée, accessible et disposer de
suffisamment de RAM pour la passerelle (Gateway) et tous les channels que vous activez.

Directives de base :

- **Minimum absolu :** 1 vCPU, 1 Go de RAM.
- **Recommandé :** 2 Go de RAM ou plus si vous exécutez plusieurs channels, l'automatisation du navigateur ou des outils médias.
- **OS :** Ubuntu LTS ou un autre Debian/Ubuntu moderne.

Si vous êtes sur Windows, **WSL2 est la configuration de style VM la plus simple** et offre la meilleure compatibilité des outils.
Voir [Windows](/fr/platforms/windows), [VPS hosting](/fr/vps).
Si vous exécutez macOS dans une VM, voir [macOS VM](/fr/install/macos-vm).

## Qu'est-ce qu'OpenClaw ?

### Qu'est-ce qu'OpenClaw en un paragraphe

OpenClaw est un assistant IA personnel que vous exécutez sur vos propres appareils. Il répond sur les surfaces de messagerie que vous utilisez déjà (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) et peut également effectuer des tâches vocales + un Canvas en direct sur les plateformes prises en charge. La **passerelle (Gateway)** est le plan de contrôle toujours actif ; l'assistant est le produit.

### Quelle est la proposition de valeur

OpenClaw n'est pas « juste un enveloppeur (wrapper) pour Claude ». C'est un **plan de contrôle local-first** qui vous permet d'exécuter un
assistant capable sur **votre propre matériel**, accessible depuis les applications de chat que vous utilisez déjà, avec
des sessions avec état, de la mémoire et des outils - sans céder le contrôle de vos flux de travail à un
SaaS hébergé.

Points forts :

- **Vos appareils, vos données :** exécutez le Gateway où vous le souhaitez (Mac, Linux, VPS) et gardez l’historique de l’espace de travail et de la session en local.
- **Vrais canaux, pas une bac à sable web :** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc., plus la voix mobile et Canvas sur les plateformes prises en charge.
- **Agnostique de modèle :** utilisez Anthropic, OpenAI, MiniMax, OpenRouter, etc., avec un routage et une basculement par agent.
- **Option uniquement locale :** exécutez des modèles locaux pour que **toutes les données puissent rester sur votre appareil** si vous le souhaitez.
- **Routage multi-agent :** séparez les agents par canal, compte ou tâche, chacun avec son propre espace de travail et ses propres paramètres par défaut.
- **Open source et hackable :** inspectez, étendez et auto-hébergez sans verrouillage vendeur.

Docs : [Gateway](/fr/gateway), [Channels](/fr/channels), [Multi-agent](/fr/concepts/multi-agent),
[Memory](/fr/concepts/memory).

### Je viens de l’installer, que devrais-je faire en premier

Bons premiers projets :

- Créer un site web (WordPress, Shopify, ou un site statique simple).
- Prototyper une application mobile (plan, écrans, plan API).
- Organiser les fichiers et dossiers (nettoyage, nommage, étiquetage).
- Connecter Gmail et automatiser les résumés ou les relances.

Il peut gérer de grandes tâches, mais fonctionne mieux lorsque vous les divisez en phases et utilisez des sous-agents pour un travail parallèle.

### Quelles sont les cinq principales utilisations quotidiennes de OpenClaw

Les succès quotidiens ressemblent généralement à ceci :

- **Briefings personnels :** résumés de la boîte de réception, du calendrier et des actualités qui vous intéressent.
- **Recherche et rédaction :** recherche rapide, résumés et premières versions de courriels ou de documents.
- **Rappels et relances :** notifications et listes de contrôle pilotées par cron ou heartbeat.
- **Automatisation du navigateur :** remplir des formulaires, collecter des données et répéter des tâches web.
- **Coordination multi-appareils :** envoyez une tâche depuis votre téléphone, laissez le Gateway l’exécuter sur un serveur et récupérez le résultat dans le chat.

### OpenClaw peut-il aider avec la génération de leads, les envois, les publicités et les blogs pour un SaaS

Oui pour la **recherche, la qualification et la rédaction**. Il peut scanner des sites, constituer des listes restreintes, résumer des prospects et rédiger des brouillons de messages de prospection ou de publicités.

Pour les **campagnes de prospection ou de publicité**, gardez un humain dans la boucle. Évitez le spam, respectez les lois locales et les politiques des plateformes, et révisez tout avant l'envoi. Le modèle le plus sûr consiste à laisser OpenClaw rédiger et à ce que vous approuviez.

Docs : [Sécurité](/fr/gateway/security).

### Quels sont les avantages par rapport à Claude Code pour le développement web ?

OpenClaw est un **assistant personnel** et une couche de coordination, et non un remplacement d'IDE. Utilisez Claude Code ou Codex pour la boucle de codage directe la plus rapide dans un dépôt. Utilisez OpenClaw lorsque vous souhaitez une mémoire persistante, un accès multi-appareils et une orchestration d'outils.

Avantages :

- **Mémoire persistante + espace de travail** sur plusieurs sessions
- **Accès multi-plateforme** (WhatsApp, Telegram, TUI, WebChat)
- **Orchestration d'outils** (navigateur, fichiers, planification, hooks)
- **Gateway toujours actif** (exécutez sur un VPS, interagissez de n'importe où)
- **Nœuds** pour le navigateur/la caméra/l'exéc locaux

Vitrine : [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

## Compétences et automatisation

### Comment personnaliser les compétences sans salir le dépôt ?

Utilisez des remplacements gérés au lieu de modifier la copie du dépôt. Placez vos modifications dans `~/.openclaw/skills/<name>/SKILL.md` (ou ajoutez un dossier via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json`). La priorité est `<workspace>/skills` > `~/.openclaw/skills` > groupé, donc les remplacements gérés l'emportent sans toucher à git. Seules les modifications dignes d'intégration en amont devraient figurer dans le dépôt et être envoyées en tant que PR.

### Puis-je charger des compétences depuis un dossier personnalisé ?

Oui. Ajoutez des répertoires supplémentaires via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json` (priorité la plus basse). La priorité par défaut reste : `<workspace>/skills` → `~/.openclaw/skills` → groupé → `skills.load.extraDirs`. `clawhub` installe dans `./skills` par défaut, que OpenClaw traite comme `<workspace>/skills`.

### Comment puis-je utiliser différents modèles pour différentes tâches

Aujourd'hui, les modèles pris en charge sont :

- **Tâches planifiées** : les tâches isolées peuvent définir une priorité `model` par tâche.
- **Sous-agents** : acheminez les tâches vers des agents distincts avec des modèles par défaut différents.
- **Commutation à la demande** : utilisez `/model` pour changer le modèle de la session actuelle à tout moment.

Voir [Tâches planifiées](/fr/automation/cron-jobs), [Routage Multi-Agent](/fr/concepts/multi-agent) et [Commandes Slash](/fr/tools/slash-commands).

### Le bot se fige pendant l'exécution de tâches lourdes Comment décharger cela

Utilisez des **sous-agents** pour les tâches longues ou parallèles. Les sous-agents s'exécutent dans leur propre session,
renvoient un résumé et gardent votre chat principal réactif.

Demandez à votre bot de "lancer un sous-agent pour cette tâche" ou utilisez `/subagents`.
Utilisez `/status` dans le chat pour voir ce que le Gateway est en train de faire (et s'il est occupé).

Conseil sur les jetons : les tâches longues et les sous-agents consomment tous deux des jetons. Si le coût est un souci, définissez un
modèle moins cher pour les sous-agents via `agents.defaults.subagents.model`.

Documentation : [Sous-agents](/fr/tools/subagents).

### Comment fonctionnent les sessions de sous-agents liées aux fils sur Discord

Utilisez les liaisons de fils (thread bindings). Vous pouvez lier un fil Discord à une cible de sous-agent ou de session afin que les messages de suivi dans ce fil restent sur cette session liée.

Flux de base :

- Générez avec `sessions_spawn` en utilisant `thread: true` (et optionnellement `mode: "session"` pour un suivi persistant).
- Ou liez manuellement avec `/focus <target>`.
- Utilisez `/agents` pour inspecter l'état de liaison.
- Utilisez `/session idle <duration|off>` et `/session max-age <duration|off>` pour contrôler le focus automatique.
- Utilisez `/unfocus` pour détacher le fil de discussion.

Configuration requise :

- Paramètres globaux par défaut : `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- Remplacements Discord : `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
- Liaison automatique lors du spawn : définissez `channels.discord.threadBindings.spawnSubagentSessions: true`.

Docs : [Sous-agents](/fr/tools/subagents), [Discord](/fr/channels/discord), [Référence de configuration](/fr/gateway/configuration-reference), [Commandes slash](/fr/tools/slash-commands).

### Cron ou les rappels ne se déclenchent pas Que dois-je vérifier

Cron s'exécute dans le processus Gateway. Si le Gateway ne tourne pas en continu,
les tâches planifiées ne s'exécuteront pas.

Liste de vérification :

- Confirmez que cron est activé (`cron.enabled`) et que `OPENCLAW_SKIP_CRON` n'est pas défini.
- Vérifiez que le Gateway tourne 24h/24 et 7j/7 (pas de mise en veille/redémarrage).
- Vérifiez les paramètres de fuseau horaire pour la tâche (`--tz` vs fuseau horaire de l'hôte).

Débogage :

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

Docs : [Tâches Cron](/fr/automation/cron-jobs), [Cron vs Heartbeat](/fr/automation/cron-vs-heartbeat).

### Comment installer des compétences sur Linux

Utilisez **ClawHub** (CLI) ou déposez des compétences dans votre espace de travail. L'interface utilisateur des compétences de macOS n'est pas disponible sur Linux.
Parcourez les compétences sur [https://clawhub.com](https://clawhub.com).

Installez le ClawHub CLI (choisissez un gestionnaire de paquets) :

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### OpenClaw peut-il exécuter des tâches selon un planning ou en continu en arrière-plan

Oui. Utilisez le planificateur Gateway :

- **Tâches Cron** pour les tâches planifiées ou récurrentes (persistantes après redémarrage).
- **Heartbeat** pour les vérifications périodiques de la "session principale".
- **Tâches isolées** pour les agents autonomes qui publient des résumés ou livrent aux discussions.

Docs : [Tâches Cron](/fr/automation/cron-jobs), [Cron vs Heartbeat](/fr/automation/cron-vs-heartbeat),
[Heartbeat](/fr/gateway/heartbeat).

### Puis-je exécuter des compétences exclusives à Apple macOS depuis Linux ?

Pas directement. Les compétences macOS sont limitées par `metadata.openclaw.os` ainsi que par les binaires requis, et les compétences n'apparaissent dans l'invite système que lorsqu'elles sont éligibles sur l'**hôte Gateway**. Sur Linux, les compétences uniquement `darwin` (comme `apple-notes`, `apple-reminders`, `things-mac`) ne se chargeront pas à moins que vous ne contourniez la limitation.

Vous avez trois modèles pris en charge :

**Option A - exécuter le Gateway sur un Mac (le plus simple).**
Exécutez le Gateway là où se trouvent les binaires macOS, puis connectez-vous depuis Linux en [mode distant](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere) ou via Tailscale. Les compétences se chargent normalement car l'hôte Gateway est macOS.

**Option B - utiliser un nœud macOS (pas de SSH).**
Exécutez le Gateway sur Linux, associez un nœud macOS (application de barre de menus) et définissez **Node Run Commands** sur « Always Ask » (Toujours demander) ou « Always Allow » (Toujours autoriser) sur le Mac. OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque les binaires requis existent sur le nœud. L'agent exécute ces compétences via l'outil `nodes`. Si vous choisissez « Always Ask », approuver « Always Allow » dans l'invite ajoute cette commande à la liste blanche.

**Option C - proxy des binaires macOS via SSH (avancé).**
Gardez le Gateway sur Linux, mais faites en sorte que les binaires CLI requis résolvent vers des wrappers SSH qui s'exécutent sur un Mac. Ensuite, remplacez la restriction de la compétence pour autoriser Linux afin qu'elle reste éligible.

1. Créez un wrapper SSH pour le binaire (exemple : `memo` pour Apple Notes) :

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
   ```

2. Placez le wrapper sur `PATH` sur l'hôte Linux (par exemple `~/bin/memo`).
3. Remplacez les métadonnées de la compétence (espace de travail ou `~/.openclaw/skills`) pour autoriser Linux :

   ```markdown
   ---
   name: apple-notes
   description: Manage Apple Notes via the memo CLI on macOS.
   metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
   ---
   ```

4. Démarrez une nouvelle session pour que l'instantané des compétences soit actualisé.

### Avez-vous une intégration Notion ou HeyGen

Pas intégrée pour le moment.

Options :

- **Compétence personnalisée / plugin :** idéal pour un accès fiable à l'API (Notion et HeyGen ont tous deux des API).
- **Automatisation du navigateur :** fonctionne sans code mais est plus lent et plus fragile.

Si vous souhaitez conserver le contexte par client (flux de travail d'agence), un modèle simple est :

- Une page Notion par client (contexte + préférences + travail en cours).
- Demandez à l'agent de récupérer cette page au début d'une session.

Si vous souhaitez une intégration native, ouvrez une demande de fonctionnalité ou créez une skill
ciblant ces API.

Installer des skills :

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub s'installe dans `./skills` sous votre répertoire actuel (ou revient à votre espace de travail OpenClaw configuré) ; OpenClaw le considère comme `<workspace>/skills` lors de la prochaine session. Pour des compétences partagées entre les agents, placez-les dans `~/.openclaw/skills/<name>/SKILL.md`. Certaines compétences s'attendent à des binaires installés via Homebrew ; sur Linux, cela signifie Linuxbrew (voir l'entrée FAQ Homebrew Linux ci-dessus). Voir [Skills](/fr/tools/skills) et [ClawHub](/fr/tools/clawhub).

### Comment utiliser mon Chrome connecté existant avec OpenClaw

Utilisez le profil de navigateur `user` intégré, qui se connecte via Chrome DevTools MCP :

```bash
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot
```

Si vous souhaitez un nom personnalisé, créez un profil MCP explicite :

```bash
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser --browser-profile chrome-live tabs
```

Ce chemin est local à l'hôte. Si le Gateway s'exécute ailleurs, exécutez soit un nœud hôte sur la machine du navigateur, soit utilisez le CDP à distance.

## Sandboxing et mémoire

### Existe-t-il une documentation dédiée au sandboxing

Oui. Voir [Sandboxing](/fr/gateway/sandboxing). Pour une configuration spécifique à Docker (passerelle complète dans Docker ou images de sandbox), voir [Docker](/fr/install/docker).

### Docker semble limité. Comment activer toutes les fonctionnalités

L'image par défaut privilégie la sécurité et s'exécute en tant qu'utilisateur `node`, elle n'inclut donc pas
de paquets système, Homebrew ou de navigateurs groupés. Pour une configuration plus complète :

- Persistez `/home/node` avec `OPENCLAW_HOME_VOLUME` afin que les caches survivent.
- Intégrez les dépendances système dans l'image avec `OPENCLAW_DOCKER_APT_PACKAGES`.
- Installez les navigateurs Playwright via le CLI inclus :
  `node /app/node_modules/playwright-core/cli.js install chromium`
- Définissez `PLAYWRIGHT_BROWSERS_PATH` et assurez-vous que le chemin est persistant.

Docs : [Docker](/fr/install/docker), [Navigateur](/fr/tools/browser).

**Puis-je garder les DMs personnels mais rendre les groupes publics sandboxed avec un seul agent**

Oui - si votre trafic privé correspond aux **DMs** et votre trafic public aux **groupes**.

Utilisez `agents.defaults.sandbox.mode: "non-main"` afin que les sessions de groupe/canal (clés non principales) s'exécutent dans Docker, tandis que la session DM principale reste sur l'hôte. Ensuite, limitez les outils disponibles dans les sessions sandboxed via `tools.sandbox.tools`.

Procédure pas à pas + exemple de configuration : [Groupes : DMs personnels + groupes publics](/fr/channels/groups#pattern-personal-dms-public-groups-single-agent)

Référence clé de la configuration : [configuration Gateway](/fr/gateway/configuration#agentsdefaultssandbox)

### Comment monter un dossier hôte dans le sandbox

Définissez `agents.defaults.sandbox.docker.binds` sur `["host:path:mode"]` (par exemple, `"/home/user/src:/src:ro"`). Les liaisons globales + par agent fusionnent ; les liaisons par agent sont ignorées lorsque `scope: "shared"`. Utilisez `:ro` pour tout ce qui est sensible et gardez à l'esprit que les liaisons contournent les murs du système de fichiers du bac à sable. Voir [Sandboxing](/fr/gateway/sandboxing#custom-bind-mounts) et [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) pour des exemples et des notes de sécurité.

### Comment fonctionne la mémoire

La mémoire OpenClaw se compose simplement de fichiers Markdown dans l'espace de travail de l'agent :

- Notes quotidiennes dans `memory/YYYY-MM-DD.md`
- Notes à long terme triées dans `MEMORY.md` (sessions principales/privées uniquement)

OpenClaw exécute également une **vidange de mémoire de précompactation silencieuse** pour rappeler au modèle d'écrire des notes durables avant le compactage automatique. Cela ne s'exécute que lorsque l'espace de travail est accessible en écriture (les bac à sable en lecture seule l'ignorent). Voir [Mémoire](/fr/concepts/memory).

### La mémoire oublie les choses Comment faire pour qu'elles restent

Demandez au bot d'**écrire le fait en mémoire**. Les notes à long terme appartiennent à `MEMORY.md`, le contexte à court terme va dans `memory/YYYY-MM-DD.md`.

C'est encore un domaine que nous améliorons. Il aide de rappeler au modèle de stocker les souvenirs ; il saura quoi faire. S'il continue à oublier, vérifiez que le Gateway utilise le même espace de travail à chaque exécution.

Docs : [Mémoire](/fr/concepts/memory), [Espace de travail de l'agent](/fr/concepts/agent-workspace).

### La recherche de mémoire sémantique nécessite-t-elle une clé OpenAI API

Seulement si vous utilisez des **embeddings OpenAI**. Codex OAuth couvre les conversations/complétions et
ne **donne pas** accès aux embeddings, donc **se connecter avec Codex (OAuth ou la
connexion Codex CLI)** n'aide pas pour la recherche de mémoire sémantique. Les embeddings OpenAI
nécessitent toujours une vraie clé API (`OPENAI_API_KEY` ou `models.providers.openai.apiKey`).

Si vous ne définissez pas de fournisseur explicitement, OpenClaw sélectionne automatiquement un fournisseur lorsqu'il
peut résoudre une clé API (profils d'authentification, `models.providers.*.apiKey` ou env vars).
Il préfère OpenAI si une clé OpenAI est résolue, sinon Gemini si une clé Gemini est résolue,
puis Voyage, puis Mistral. Si aucune clé distante n'est disponible, la recherche
de mémoire reste désactivée jusqu'à ce que vous la configuriez. Si vous avez un chemin de modèle local
configuré et présent, OpenClaw
préfère `local`. Ollama est pris en charge lorsque vous définissez explicitement
`memorySearch.provider = "ollama"`.

Si vous préférez rester local, définissez `memorySearch.provider = "local"` (et facultativement
`memorySearch.fallback = "none"`). Si vous souhaitez des embeddings Gemini, définissez
`memorySearch.provider = "gemini"` et fournissez `GEMINI_API_KEY` (ou
`memorySearch.remote.apiKey`). Nous prenons en charge les modèles d'embedding **OpenAI, Gemini, Voyage, Mistral, Ollama ou local**

- voir [Mémoire](/fr/concepts/memory) pour les détails de la configuration.

### La mémoire persiste-t-elle indéfiniment Quelles sont les limites

Les fichiers de mémoire résident sur le disque et persistent jusqu'à ce que vous les supprimiez. La limite est votre
espace de stockage, et non le modèle. Le **contexte de session** est toujours limité par la fenêtre de
contexte du modèle, de sorte que les longues conversations peuvent être compactées ou tronquées. C'est pour cela
que la recherche en mémoire existe - elle ne récupère que les parties pertinentes dans le contexte.

Docs : [Mémoire](/fr/concepts/memory), [Contexte](/fr/concepts/context).

## Emplacement des éléments sur le disque

### Toutes les données utilisées avec OpenClaw sont-elles enregistrées localement

Non - **l'état de OpenClaw est local**, mais **les services externes voient toujours ce que vous leur envoyez**.

- **Local par défaut :** les sessions, les fichiers mémoire, la configuration et l'espace de travail résident sur l'hôte Gateway
  (`~/.openclaw` + votre répertoire d'espace de travail).
- **Distant par nécessité :** les messages que vous envoyez aux fournisseurs de modèles (Anthropic/OpenAI/etc.) vont vers
  leurs API, et les plateformes de chat (WhatsApp/Telegram/Slack/etc.) stockent les données des messages sur leurs
  serveurs.
- **Vous contrôlez l'empreinte :** l'utilisation de modèles locaux garde les invites sur votre machine, mais le trafic
  du canal passe toujours par les serveurs de ce canal.

Connexe : [Espace de travail de l'agent](/fr/concepts/agent-workspace), [Mémoire](/fr/concepts/memory).

### Où OpenClaw stocke-t-il ses données

Tout se trouve sous `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) :

| Chemin                                                          | Objet                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `$OPENCLAW_STATE_DIR/openclaw.json`                             | Config principale (JSON5)                                                                              |
| `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importation OAuth héritée (copiée dans les profils d'authentification lors de la première utilisation) |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Profils d'authentification (OAuth, clés API et `keyRef`/`tokenRef` en option)                          |
| `$OPENCLAW_STATE_DIR/secrets.json`                              | Charge utile secrète stockée dans un fichier en option pour les fournisseurs SecretRef `file`          |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Fichier de compatibilité hérité (entrées statiques `api_key` nettoyées)                                |
| `$OPENCLAW_STATE_DIR/credentials/`                              | État du fournisseur (ex. `whatsapp/<accountId>/creds.json`)                                            |
| `$OPENCLAW_STATE_DIR/agents/`                                   | État par agent (agentDir + sessions)                                                                   |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historique et état des conversations (par agent)                                                       |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Métadonnées de session (par agent)                                                                     |

Chemin mono-agent hérité : `~/.openclaw/agent/*` (migré par `openclaw doctor`).

Votre **espace de travail** (AGENTS.md, fichiers de mémoire, compétences, etc.) est distinct et configuré via `agents.defaults.workspace` (par défaut : `~/.openclaw/workspace`).

### Où doivent se trouver AGENTSmd SOULmd USERmd MEMORYmd

Ces fichiers résident dans l'**espace de travail de l'agent**, et non dans `~/.openclaw`.

- **Espace de travail (par agent)** : `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
  `MEMORY.md` (ou repli hérité `memory.md` lorsque `MEMORY.md` est absent),
  `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` facultatif.
- **Répertoire d'état (`~/.openclaw`)** : config, identifiants, profils d'auth, sessions, journaux,
  et compétences partagées (`~/.openclaw/skills`).

L'espace de travail par défaut est `~/.openclaw/workspace`, configurable via :

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

Si le bot "oublie" après un redémarrage, vérifiez que le Gateway utilise le même
espace de travail à chaque lancement (et rappelez-vous : le mode distant utilise l'espace de travail de l'**hôte de la passerelle**,
et non celui de votre ordinateur portable local).

Conseil : si vous souhaitez un comportement ou une préférence durable, demandez au bot de **l'écrire dans
AGENTS.md ou MEMORY.md** plutôt que de vous fier à l'historique de discussion.

Voir [Espace de travail de l'agent](/fr/concepts/agent-workspace) et [Mémoire](/fr/concepts/memory).

### Quelle est la stratégie de sauvegarde recommandée

Placez votre **agent workspace** dans un dépôt git **privé** et sauvegardez-le quelque part en privé (par exemple, privé GitHub). Cela capture la mémoire + les fichiers AGENTS/SOUL/USER et vous permet de restaurer l'« esprit » de l'assistant plus tard.

Ne **commitez pas** (commit) ce qui se trouve sous `~/.openclaw` (identifiants, sessions, jetons ou charges utiles de secrets chiffrés). Si vous avez besoin d'une restauration complète, sauvegardez l'espace de travail et le répertoire d'état séparément (voir la question sur la migration ci-dessus).

Documentation : [Espace de travail de l'agent](/fr/concepts/agent-workspace).

### Comment désinstaller complètement OpenClaw

Voir le guide dédié : [Désinstallation](/fr/install/uninstall).

### Les agents peuvent-ils fonctionner en dehors de l'espace de travail

Oui. L'espace de travail est le **répertoire de travail par défaut** et le point d'ancrage de la mémoire, et non un bac à sable strict.
Les chemins relatifs sont résolus dans l'espace de travail, mais les chemins absolus peuvent accéder à d'autres
emplacements de l'hôte, sauf si le bac à sable est activé. Si vous avez besoin d'isolement, utilisez
[`agents.defaults.sandbox`](/fr/gateway/sandboxing) ou les paramètres de bac à sable par agent. Si vous
souhaitez qu'un dépôt soit le répertoire de travail par défaut, dirigez le
`workspace` de cet agent vers la racine du dépôt. Le dépôt OpenClaw n'est que du code source ; gardez l'espace de travail
séparé, sauf si vous souhaitez intentionnellement que l'agent travaille à l'intérieur.

Exemple (dépôt en tant que cwd par défaut) :

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo",
    },
  },
}
```

### Je suis en mode distant, où se trouve le magasin de session

L'état de la session appartient à l'**hôte de la passerelle**. Si vous êtes en mode distant, le magasin de sessions qui vous concerne se trouve sur la machine distante, et non sur votre ordinateur local local. Voir [Gestion de session](/fr/concepts/session).

## Bases de la configuration

### Quel est le format de la configuration et où se trouve-t-elle

OpenClaw lit une configuration facultative en **JSON5** depuis `$OPENCLAW_CONFIG_PATH` (par défaut : `~/.openclaw/openclaw.json`) :

```
$OPENCLAW_CONFIG_PATH
```

Si le fichier est manquant, il utilise des paramètres par défaut sûrs (y compris un espace de travail par défaut de `~/.openclaw/workspace`).

### J'ai défini gatewaybind lan ou tailnet et maintenant rien n'écoute, l'interface indique non autorisé

Les liaisons non-boucle **nécessitent une authentification**. Configurez `gateway.auth.mode` + `gateway.auth.token` (ou utilisez `OPENCLAW_GATEWAY_TOKEN`).

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

Notes :

- `gateway.remote.token` / `.password` n'activent **pas** l'authentification de la passerelle locale par eux-mêmes.
- Les chemins d'appel locaux peuvent utiliser `gateway.remote.*` comme solution de rechange uniquement lorsque `gateway.auth.*` n'est pas défini.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue de manière fermée (aucun masquage de secours à distance).
- L'interface de contrôle (Control UI) s'authentifie via `connect.params.auth.token` (stocké dans les paramètres de l'application/interface). Évitez de mettre des jetons dans les URL.

### Pourquoi ai-je besoin d'un jeton sur localhost maintenant

OpenClaw applique l'authentification par jeton par défaut, y compris pour le bouclage (loopback). Si aucun jeton n'est configuré, le démarrage de la passerelle en génère automatiquement un et l'enregistre dans `gateway.auth.token`, donc **les clients WS locaux doivent s'authentifier**. Cela empêche d'autres processus locaux d'appeler la passerelle.

Si vous voulez **vraiment** ouvrir le bouclage (loopback), définissez `gateway.auth.mode: "none"` explicitement dans votre configuration. Doctor peut générer un jeton pour vous à tout moment : `openclaw doctor --generate-gateway-token`.

### Dois-je redémarrer après avoir modifié la configuration

La passerelle surveille la configuration et prend en charge le rechargement à chaud (hot-reload) :

- `gateway.reload.mode: "hybrid"` (par défaut) : applique à chaud les modifications sûres, redémarre pour les critiques
- `hot`, `restart` et `off` sont également pris en charge

### Comment désactiver les slogans drôles de la CLI

Définissez `cli.banner.taglineMode` dans la configuration :

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `off` : masque le texte du slogan mais conserve la ligne de titre/version de la bannière.
- `default` : utilise `All your chats, one OpenClaw.` à chaque fois.
- `random` : rotation de slogans drôles/saisonniers (comportement par défaut).
- Si vous ne voulez aucune bannière du tout, définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

### Comment activer la recherche web et la récupération web

`web_fetch` fonctionne sans clé API. `web_search` nécessite une clé pour votre
fournisseur sélectionné (Brave, Gemini, Grok, Kimi ou Perplexity).
**Recommandé :** exécutez `openclaw configure --section web` et choisissez un fournisseur.
Alternatives d'environnement :

- Brave : `BRAVE_API_KEY`
- Gemini : `GEMINI_API_KEY`
- Grok : `XAI_API_KEY`
- Kimi : `KIMI_API_KEY` ou `MOONSHOT_API_KEY`
- Perplexity : `PERPLEXITY_API_KEY` ou `OPENROUTER_API_KEY`

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

Notes :

- Si vous utilisez des listes d'autorisation, ajoutez `web_search`/`web_fetch` ou `group:web`.
- `web_fetch` est activé par défaut (sauf s'il est explicitement désactivé).
- Les démons lisent les variables d'environnement depuis `~/.openclaw/.env` (ou l'environnement du service).

Docs : [Web tools](/fr/tools/web).

### Comment exécuter un Gateway central avec des workers spécialisés sur plusieurs appareils

Le modèle courant est **un Gateway** (ex : Raspberry Pi) plus des **nœuds** et des **agents** :

- **Gateway (central) :** possède les canaux (Signal/WhatsApp), le routage et les sessions.
- **Nœuds (appareils) :** les Mac/iOS/Android se connectent en tant que périphériques et exposent des outils locaux (`system.run`, `canvas`, `camera`).
- **Agents (workers) :** cerveaux/espaces de travail séparés pour des rôles spéciaux (ex : "ops Hetzner", "Données personnelles").
- **Sous-agents :** lancent des tâches en arrière-plan à partir d'un agent principal lorsque vous souhaitez du parallélisme.
- **TUI :** se connecter au Gateway et changer d'agent/session.

Docs : [Nodes](/fr/nodes), [Accès distant](/fr/gateway/remote), [Routage Multi-Agent](/fr/concepts/multi-agent), [Sous-agents](/fr/tools/subagents), [TUI](/fr/web/tui).

### Le navigateur OpenClaw peut-il s'exécuter en mode headless

Oui. C'est une option de configuration :

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

La valeur par défaut est `false` (mode avec interface). Le mode headless est plus susceptible de déclencher des vérifications anti-bot sur certains sites. Voir [Navigateur](/fr/tools/browser).

Le mode headless utilise le **même moteur Chromium** et fonctionne pour la plupart des automatisations (formulaires, clics, scraping, connexions). Les principales différences :

- Aucune fenêtre de navigateur visible (utilisez des captures d'écran si vous avez besoin d'éléments visuels).
- Certains sites sont plus stricts concernant l'automatisation en mode headless (CAPTCHAs, anti-bot).
  Par exemple, X/Twitter bloque souvent les sessions headless.

### Comment utiliser Brave pour le contrôle du navigateur

Définissez `browser.executablePath` sur votre binaire Brave (ou tout navigateur basé sur Chromium) et redémarrez le Gateway.
Voir les exemples de configuration complets dans [Navigateur](/fr/tools/browser#use-brave-or-another-chromium-based-browser).

## Gateways et nœuds distants

### Comment les commandes se propagent-elles entre Telegram, la passerelle et les nœuds

Les messages Telegram sont gérés par la **gateway**. La gateway exécute l'agent et
n'appelle ensuite les nœuds via le **Gateway WebSocket** que lorsqu'un outil de nœud est nécessaire :

Telegram → Gateway → Agent → `node.*` → Nœud → Gateway → Telegram

Les nœuds ne voient pas le trafic provider entrant ; ils ne reçoivent que les appels RPC de nœud.

### Comment mon agent peut-il accéder à mon ordinateur si le Gateway est hébergé à distance

Réponse courte : **associez votre ordinateur en tant que nœud**. Le Gateway s'exécute ailleurs, mais il peut
appeler des outils `node.*` (écran, caméra, système) sur votre machine locale via le Gateway WebSocket.

Configuration typique :

1. Exécutez le Gateway sur l'hôte toujours actif (VPS/serveur domestique).
2. Placez l'hôte du Gateway + votre ordinateur sur le même tailnet.
3. Assurez-vous que le WS du Gateway est accessible (liaison tailnet ou tunnel SSH).
4. Ouvrez l'application macOS localement et connectez-vous en mode **Remote over SSH** (ou tailnet direct)
   afin qu'elle puisse s'enregistrer en tant que nœud.
5. Approuvez le nœud sur le Gateway :

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

Aucun pont TCP distinct n'est requis ; les nœuds se connectent via le WebSocket du Gateway.

Rappel de sécurité : jumeler un nœud macOS permet `system.run` sur cette machine. Ne
jumelez que des appareils de confiance, et consultez [Security](/fr/gateway/security).

Docs : [Nodes](/fr/nodes), [protocole Gateway](/fr/gateway/protocol), [mode distant macOS](/fr/platforms/mac/remote), [Security](/fr/gateway/security).

### Tailscale est connecté mais je ne reçois aucune réponse Que faire maintenant

Vérifiez les bases :

- Gateway est en cours d'exécution : `openclaw gateway status`
- Santé du Gateway : `openclaw status`
- Santé du channel : `openclaw channels status`

Vérifiez ensuite l'authentification et le routage :

- Si vous utilisez Tailscale Serve, assurez-vous que `gateway.auth.allowTailscale` est défini correctement.
- Si vous vous connectez via un tunnel SSH, confirmez que le tunnel local est actif et pointe vers le bon port.
- Confirmez que vos listes d'autorisation (DM ou groupe) incluent votre compte.

Documentation : [Tailscale](/fr/gateway/tailscale), [Accès distant](/fr/gateway/remote), [Channels](/fr/channels).

### Deux instances OpenClaw peuvent-elles communiquer entre elles (local/VPS) ?

Oui. Il n'y a pas de pont "bot-à-bot" intégré, mais vous pouvez le configurer de quelques
manières fiables :

**Le plus simple :** utilisez un channel de chat normal auquel les deux bots peuvent accéder (Telegram/Slack/WhatsApp).
Demandez au Bot A d'envoyer un message au Bot B, puis laissez le Bot B répondre comme d'habitude.

**CLI bridge (generic) :** exécutez un script qui appelle l'autre Gateway via
`openclaw agent --message ... --deliver`, en ciblant une discussion où l'autre bot
coute. Si un bot est sur un VPS distant, pointez votre CLI vers ce Gateway distant
via SSH/Tailscale (voir [Remote access](/fr/gateway/remote)).

Exemple de modèle (exécuter depuis une machine qui peut atteindre le Gateway cible) :

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

Astuce : ajoutez une garde-fou pour que les deux bots ne bouclent pas indéfiniment (mention uniquement, listes d'autorisation de channel,
ou une règle « ne pas répondre aux messages de bot »).

Documentation : [Remote access](/fr/gateway/remote), [Agent CLI](/fr/cli/agent), [Agent send](/fr/tools/agent-send).

### Ai-je besoin de VPS séparés pour plusieurs agents

Non. Un seul Gateway peut héberger plusieurs agents, chacun avec son propre espace de travail, les valeurs par défaut du model,
et le routage. C'est la configuration normale et c'est beaucoup moins cher et plus simple que de faire tourner
un VPS par agent.

Utilisez des VPS séparés uniquement lorsque vous avez besoin d'une isolation stricte (limites de sécurité) ou de configurations très différentes que vous ne souhaitez pas partager. Sinon, conservez un seul Gateway et utilisez plusieurs agents ou sous-agents.

### Y a-t-il un avantage à utiliser un nœud sur mon ordinateur portable personnel au lieu d'un SSH depuis un VPS

Oui - les nœuds sont la méthode privilégiée pour atteindre votre ordinateur portable depuis un Gateway distant, et ils offrent plus qu'un simple accès shell. Le Gateway fonctionne sous macOS/Linux (Windows via WSL2) et est léger (un petit VPS ou une boîte de classe Raspberry Pi convient; 4 Go de RAM suffisent), donc une configuration courante est un hôte toujours allumé plus votre ordinateur portable en tant que nœud.

- **Aucun SSH entrant requis.** Les nœuds se connectent au WebSocket du Gateway et utilisent l'appariement d'appareils.
- **Contrôles d'exécution plus sûrs.** `system.run` est limité par les listes d'autorisation/approbations des nœuds sur cet ordinateur portable.
- **Plus d'outils périphériques.** Les nœuds exposent `canvas`, `camera` et `screen` en plus de `system.run`.
- **Automatisation du navigateur local.** Gardez le Gateway sur un VPS, mais exécutez Chrome localement via un hôte de nœud sur l'ordinateur portable, ou attachez-vous au Chrome local sur l'hôte via Chrome MCP.

SSH convient pour un accès shell ad hoc, mais les nœuds sont plus simples pour les flux de travail d'agents continus et l'automatisation des appareils.

Documentation : [Nodes](/fr/nodes), [Nodes CLI](/fr/cli/nodes), [Browser](/fr/tools/browser).

### Dois-je installer sur un deuxième ordinateur portable ou simplement ajouter un nœud

Si vous avez uniquement besoin d'**outils locaux** (écran/caméra/exéc) sur le deuxième ordinateur portable, ajoutez-le en tant que **nœud**. Cela permet de conserver un seul Gateway et d'éviter une configuration dupliquée. Les outils de nœud locaux sont actuellement uniquement disponibles sur macOS, mais nous prévoyons de les étendre à d'autres systèmes d'exploitation.

Installez un deuxième Gateway uniquement lorsque vous avez besoin d'une **isolement strict** ou de deux robots entièrement distincts.

Documentation : [Nœuds](/fr/nodes), [CLI Nœuds](/fr/cli/nodes), [Passerelles multiples](/fr/gateway/multiple-gateways).

### Les nœuds exécutent-ils un service de passerelle

Non. Seule **une seule passerelle** doit s'exécuter par hôte, sauf si vous faites tourner intentionnellement des profils isolés (voir [Passerelles multiples](/fr/gateway/multiple-gateways)). Les nœuds sont des périphériques qui se connectent à la passerelle (nœuds iOS/Android, ou "mode nœud" macOS dans l'application de la barre de menus). Pour les hôtes de nœuds sans interface graphique et le contrôle CLI, consultez [CLI Hôte de nœud](/fr/cli/node).

Un redémarrage complet est requis pour les modifications de `gateway`, `discovery` et `canvasHost`.

### Existe-t-il un moyen API RPC d'appliquer la configuration

Oui. `config.apply` valide et écrit la configuration complète et redémarre le Gateway dans le cadre de l'opération.

### configapply a effacé ma configuration. Comment puis-je récupérer et éviter cela

`config.apply` remplace la **configuration entière**. Si vous envoyez un objet partiel, tout
le reste est supprimé.

Récupération :

- Restaurer à partir d'une sauvegarde (git ou un `~/.openclaw/openclaw.json` copié).
- Si vous n'avez pas de sauvegarde, relancez `openclaw doctor` et reconfigurez les chaînes/modèles.
- Si cela était inattendu, signalez un bogue et incluez votre dernière configuration connue ou toute sauvegarde.
- Un agent de codage local peut souvent reconstruire une configuration fonctionnelle à partir des journaux ou de l'historique.

L'éviter :

- Utilisez `openclaw config set` pour les petits changements.
- Utilisez `openclaw configure` pour les modifications interactives.

Docs : [Config](/fr/cli/config), [Configure](/fr/cli/configure), [Doctor](/fr/gateway/doctor).

### Quelle est une configuration minimale saine pour une première installation

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

Cela définit votre espace de travail et restreint qui peut déclencher le bot.

### Comment configurer Tailscale sur un VPS et se connecter depuis mon Mac

Étapes minimales :

1. **Install + login sur le VPS**

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. **Install + login sur votre Mac**
   - Utilisez l'application Tailscale et connectez-vous au même tailnet.
3. **Activer MagicDNS (recommandé)**
   - Dans la console d'administration Tailscale, activez MagicDNS pour que le VPS ait un nom stable.
4. **Utiliser le nom d'hôte du tailnet**
   - SSH : `ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway WS : `ws://your-vps.tailnet-xxxx.ts.net:18789`

Si vous souhaitez l'interface de contrôle sans SSH, utilisez Tailscale Serve sur le VPS :

```bash
openclaw gateway --tailscale serve
```

Cela permet de garder la passerelle liée à bouclage et d'exposer HTTPS via Tailscale. Voir [Tailscale](/fr/gateway/tailscale).

### Comment connecter un nœud Mac à un Gateway Tailscale Serve distant

Serve expose l'**IU de contrôle Gateway + WS**. Les nœuds se connectent via le même point de terminaison WS Gateway.

Configuration recommandée :

1. **Assurez-vous que le VPS et le Mac sont sur le même tailnet**.
2. **Utilisez l'application macOS en mode distant** (la cible SSH peut être le nom d'hôte du tailnet).
   L'application va tunneler le port Gateway et se connecter en tant que nœud.
3. **Approuver le nœud** sur la passerelle :

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

Documentation : [Protocole Gateway](/fr/gateway/protocol), [Discovery](/fr/gateway/discovery), [mode distant macOS](/fr/platforms/mac/remote).

## Variables d'environnement et chargement .env

### Comment OpenClaw charge-t-il les variables d'environnement

OpenClaw lit les variables d'environnement du processus parent (shell, launchd/systemd, CI, etc.) et charge en plus :

- `.env` à partir du répertoire de travail actuel
- une valeur de repli globale `.env` à partir de `~/.openclaw/.env` (alias `$OPENCLAW_STATE_DIR/.env`)

Aucun fichier `.env` ne remplace les variables d'environnement existantes.

Vous pouvez également définir des variables d'environnement en ligne dans la configuration (appliquées uniquement si elles sont absentes de l'environnement du processus) :

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

Voir [/environment](/fr/help/environment) pour la priorité complète et les sources.

### J'ai démarré le Gateway via le service et mes env vars ont disparu. Et maintenant ?

Deux correctifs courants :

1. Placez les clés manquantes dans `~/.openclaw/.env` pour qu'elles soient récupérées même lorsque le service n'hérite pas de l'environnement de votre shell.
2. Activer l'importation du shell (confort opt-in) :

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

Cela exécute votre shell de connexion et n'importe que les clés attendues manquantes (ne remplace jamais). Équivalents des variables d'environnement :
`OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

### J'ai défini COPILOTGITHUBTOKEN mais le statut des modèles indique Shell env désactivé. Pourquoi ?

`openclaw models status` indique si l'**importation de l'environnement du shell** est activée. « Shell env: off »
ne signifie **pas** que vos variables d'environnement sont manquantes ; cela signifie simplement que OpenClaw ne chargera
pas votre shell de connexion automatiquement.

Si le Gateway s'exécute en tant que service (launchd/systemd), il n'héritera pas de votre
environnement de shell. Corrigez cela en effectuant l'une des opérations suivantes :

1. Placez le jeton dans `~/.openclaw/.env` :

   ```
   COPILOT_GITHUB_TOKEN=...
   ```

2. Ou activez l'importation du shell (`env.shellEnv.enabled: true`).
3. Ou ajoutez-le à votre bloc de configuration `env` (s'applique uniquement s'il est manquant).

Redémarrez ensuite la passerelle et vérifiez à nouveau :

```bash
openclaw models status
```

Les jetons Copilot sont lus à partir de `COPILOT_GITHUB_TOKEN` (également `GH_TOKEN` / `GITHUB_TOKEN`).
Voir [/concepts/model-providers](/fr/concepts/model-providers) et [/environment](/fr/help/environment).

## Sessions et discussions multiples

### Comment puis-je commencer une nouvelle conversation

Envoyez `/new` ou `/reset` comme un message autonome. Voir [Gestion de session](/fr/concepts/session).

### Les sessions réinitialisent-elles automatiquement si je n'envoie jamais de nouveau

Oui. Les sessions expirent après `session.idleMinutes` (par défaut **60**). Le message **suivant** démarre un identifiant de session frais pour cette clé de chat. Cela ne supprime pas les transcriptions - cela démarre simplement une nouvelle session.

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### Existe-t-il un moyen de constituer une équipe d'instances OpenClaw avec un PDG et plusieurs agents

Oui, via le **routage multi-agent** et les **sous-agents**. Vous pouvez créer un agent coordinateur et plusieurs agents de travailleurs avec leurs propres espaces de travail et modèles.

Cela dit, il est préférable de considérer cela comme une **expérience amusante**. Elle consomme beaucoup de jetons et est souvent moins efficace que l'utilisation d'un seul bot avec des sessions séparées. Le modèle typique que nous envisageons est un seul bot avec lequel vous parlez, avec différentes sessions pour le travail parallèle. Ce bot peut également générer des sous-agents si nécessaire.

Docs : [Multi-agent routing](/fr/concepts/multi-agent), [Sub-agents](/fr/tools/subagents), [Agents CLI](/fr/cli/agents).

### Pourquoi le contexte a-t-il été tronqué en cours de tâche ? Comment puis-je l'empêcher ?

Le contexte de la session est limité par la fenêtre contextuelle du modèle. Les longues discussions, les sorties d'outils volumineuses ou de nombreux fichiers peuvent déclencher une compactage ou une troncation.

Ce qui aide :

- Demandez au bot de résumer l'état actuel et de l'écrire dans un fichier.
- Utilisez `/compact` avant les longues tâches et `/new` lors du changement de sujet.
- Gardez le contexte important dans l'espace de travail et demandez au bot de le relire.
- Utilisez des sous-agents pour les tâches longues ou parallèles afin que la discussion principale reste plus légère.
- Choisissez un modèle avec une fenêtre contextuelle plus grande si cela arrive souvent.

### Comment réinitialiser complètement OpenClaw tout en le gardant installé

Utilisez la commande de réinitialisation :

```bash
openclaw reset
```

Réinitialisation complète non interactive :

```bash
openclaw reset --scope full --yes --non-interactive
```

Relancez ensuite la configuration :

```bash
openclaw onboard --install-daemon
```

Notes :

- L'intégration propose également **Réinitialiser** si elle détecte une configuration existante. Voir [Onboarding (CLI)](/fr/start/wizard).
- Si vous avez utilisé des profils (`--profile` / `OPENCLAW_PROFILE`), réinitialisez chaque répertoire d'état (ceux par défaut sont `~/.openclaw-<profile>`).
- Réinitialisation dev : `openclaw gateway --dev --reset` (dev uniquement ; efface la config dev + les identifiants + les sessions + l'espace de travail).

### Je reçois des erreurs de contexte trop volumineux, comment réinitialiser ou compacter

Utilisez l'une de ces options :

- **Compacter** (garde la conversation mais résume les tours plus anciens) :

  ```
  /compact
  ```

  ou `/compact <instructions>` pour guider le résumé.

- **Réinitialiser** (nouvel ID de session pour la même clé de chat) :

  ```
  /new
  /reset
  ```

Si cela continue de se produire :

- Activez ou ajustez le **nettoyage de session** (`agents.defaults.contextPruning`) pour supprimer les anciennes sorties d'outil.
- Utilisez un modèle avec une fenêtre de contexte plus grande.

Docs : [Compactage](/fr/concepts/compaction), [Nettoyage de session](/fr/concepts/session-pruning), [Gestion de session](/fr/concepts/session).

### Pourquoi vois-je « Requête LLM rejetée : champ messages.content.tool_use.input requis » ?

C'est une erreur de validation du provider : le modèle a émis un bloc `tool_use` sans le
`input` requis. Cela signifie généralement que l'historique de la session est obsolète ou corrompu (souvent après de longs fils de discussion
ou un changement d'outil/de schéma).

Solution : démarrez une nouvelle session avec `/new` (message autonome).

### Pourquoi reçois-je des messages de pulsation (heartbeat) toutes les 30 minutes

Les pulsations s'exécutent toutes les **30 m** par défaut. Ajustez-les ou désactivez-les :

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

Si `HEARTBEAT.md` existe mais est effectivement vide (seulement des lignes vides et des en-têtes markdown comme `# Heading`), OpenClaw saute l'exécution du heartbeat pour économiser les appels API.
Si le fichier est manquant, le heartbeat s'exécute quand même et le modèle décide de ce qu'il faut faire.

Les overrides par agent utilisent `agents.list[].heartbeat`. Documentation : [Heartbeat](/fr/gateway/heartbeat).

### Dois-je ajouter un compte bot à un groupe WhatsApp

Non. OpenClaw fonctionne sur **votre propre compte**, donc si vous êtes dans le groupe, OpenClaw peut le voir.
Par défaut, les réponses de groupe sont bloquées jusqu'à ce que vous autorisiez les expéditeurs (`groupPolicy: "allowlist"`).

Si vous voulez que seulement **vous** puissiez déclencher des réponses de groupe :

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

### Comment obtenir le JID d'un groupe WhatsApp

Option 1 (la plus rapide) : surveillez les logs (tail logs) et envoyez un message de test dans le groupe :

```bash
openclaw logs --follow --json
```

Recherchez `chatId` (ou `from`) se terminant par `@g.us`, comme :
`1234567890-1234567890@g.us`.

Option 2 (si déjà configuré/autorisé) : lister les groupes depuis la configuration :

```bash
openclaw directory groups list --channel whatsapp
```

Docs : [WhatsApp](/fr/channels/whatsapp), [Répertoire](/fr/cli/directory), [Journaux](/fr/cli/logs).

### Pourquoi OpenClaw ne répond-il pas dans un groupe

Deux causes courantes :

- Le filtrage par mention est activé (par défaut). Vous devez @mentionner le bot (ou correspondre à `mentionPatterns`).
- Vous avez configuré `channels.whatsapp.groups` sans `"*"` et le groupe n'est pas autorisé.

Voir [Groupes](/fr/channels/groups) et [Messages de groupe](/fr/channels/group-messages).

### Les groupes/fils de discussion partagent-ils le contexte avec les DMs

Les discussions directes sont réduites à la session principale par défaut. Les groupes/canaux ont leurs propres clés de session, et les sujets Telegram / fils de discussion Discord sont des sessions séparées. Voir [Groups](/fr/channels/groups) et [Group messages](/fr/channels/group-messages).

### Combien d'espaces de travail et d'agents puis-je créer

Pas de limites strictes. Des douzaines (voire des centaines) conviennent, mais surveillez :

- **Croissance du disque :** les sessions et les transcriptions se trouvent sous `~/.openclaw/agents/<agentId>/sessions/`.
- **Coût des jetons :** plus d'agents signifie plus d'utilisation simultanée du modèle.
- **Surcharge opérationnelle :** profils d'authentification, espaces de travail et routage de canal par agent.

Conseils :

- Conservez un espace de travail **actif** par agent (`agents.defaults.workspace`).
- Nettoyez les anciennes sessions (supprimez les entrées JSONL ou du stockage) si le disque grossit.
- Utilisez `openclaw doctor` pour repérer les espaces de travail orphelins et les inadéquations de profil.

### Puis-je exécuter plusieurs bots ou chats en même temps sur Slack et comment dois-je configurer cela

Oui. Utilisez le **routage multi-agent** pour exécuter plusieurs agents isolés et acheminer les messages entrants par canal/compte/pair. Slack est pris en charge en tant que canal et peut être lié à des agents spécifiques.

L'accès par navigateur est puissant mais ne permet pas de « faire tout ce qu'un humain peut faire » : les anti-bots, les CAPTCHAs et la MFA peuvent toujours bloquer l'automatisation. Pour le contrôle du navigateur le plus fiable, utilisez le Chrome MCP local sur l'hôte, ou utilisez CDP sur la machine qui exécute réellement le navigateur.

Configuration des meilleures pratiques :

- Hôte de Gateway toujours actif (VPS/Mac mini).
- Un agent par rôle (liaisons).
- Canaux Slack liés à ces agents.
- Navigateur local via Chrome MCP ou un nœud si nécessaire.

Documentation : [Routage multi-agent](/fr/concepts/multi-agent), [Slack](/fr/channels/slack),
[Browser](/fr/tools/browser), [Nodes](/fr/nodes).

## Modèles : valeurs par défaut, sélection, alias, changement

### Quel est le modèle par défaut

Le modèle par défaut d'OpenClaw est ce que vous avez défini comme :

```
agents.defaults.model.primary
```

Les modèles sont référencés en tant que `provider/model` (exemple : `anthropic/claude-opus-4-6`). Si vous omettez le fournisseur, OpenClaw suppose actuellement `anthropic` comme solution de repli temporaire pour la dépréciation - mais vous devez toujours définir `provider/model` **explicitement**.

### Quel modèle recommandez-vous

**Valeur par défaut recommandée :** utilisez le modèle le plus puissant de la dernière génération disponible dans votre stack de fournisseurs.
**Pour les agents avec outils ou entrées non fiables :** privilégiez la puissance du modèle plutôt que le coût.
**Pour les chat de routine/à faible enjeu :** utilisez des modèles de repli moins chers et acheminez par rôle d'agent.

MiniMax M2.5 possède sa propre documentation : [MiniMax](/fr/providers/minimax) et
[Modèles locaux](/fr/gateway/local-models).

Règle générale : utilisez le **meilleur model que vous pouvez vous permettre** pour le travail à fort enjeu, et un model moins cher pour le chat de routine ou les résumés. Vous pouvez router des models par agent et utiliser des sous-agents pour paralléliser les longues tâches (chaque sous-agent consomme des tokens). Voir [Modèles](/fr/concepts/models) et [Sous-agents](/fr/tools/subagents).

Avertissement important : les models plus faibles ou trop quantifiés sont plus vulnérables à l'injection de prompt et aux comportements non sécurisés. Voir [Sécurité](/fr/gateway/security).

Pour plus de contexte : [Modèles](/fr/concepts/models).

### Puis-je utiliser des modèles auto-hébergés llamacpp vLLM Ollama

Oui. Ollama est la voie la plus simple pour les modèles locaux.

Installation la plus rapide :

1. Installez Ollama depuis `https://ollama.com/download`
2. Tirez un modèle local tel que `ollama pull glm-4.7-flash`
3. Si vous voulez aussi le Cloud Ollama, exécutez `ollama signin`
4. Exécutez `openclaw onboard` et choisissez `Ollama`
5. Sélectionnez `Local` ou `Cloud + Local`

Notes :

- `Cloud + Local` vous donne les modèles cloud Ollama ainsi que vos modèles locaux Ollama
- les modèles cloud tels que `kimi-k2.5:cloud` n'ont pas besoin d'être téléchargés localement
- pour un changement manuel, utilisez `openclaw models list` et `openclaw models set ollama/<model>`

Note de sécurité : les modèles plus petits ou fortement quantifiés sont plus vulnérables à l'injection de prompts. Nous recommandons vivement des **modèles de grande taille** pour tout bot capable d'utiliser des outils. Si vous souhaitez tout de même utiliser des petits modèles, activez le sandboxing et des listes d'autorisation strictes pour les outils.

Docs : [Ollama](/fr/providers/ollama), [Local models](/fr/gateway/local-models),
[Model providers](/fr/concepts/model-providers), [Security](/fr/gateway/security),
[Sandboxing](/fr/gateway/sandboxing).

### Comment changer de model sans effacer ma configuration

Utilisez les **model commands** ou modifiez uniquement les champs **model**. Évitez les remplacements complets de la configuration.

Options sûres :

- `/model` dans le chat (rapide, par session)
- `openclaw models set ...` (met à jour uniquement la config du model)
- `openclaw configure --section model` (interactif)
- éditer `agents.defaults.model` dans `~/.openclaw/openclaw.json`

Évitez `config.apply` avec un objet partiel à moins que vous ne souhaitiez remplacer toute la configuration.
Si vous avez écrasé la configuration, restaurez-la depuis une sauvegarde ou relancez `openclaw doctor` pour réparer.

Docs : [Modèles](/fr/concepts/models), [Configurer](/fr/cli/configure), [Config](/fr/cli/config), [Docteur](/fr/gateway/doctor).

### Que OpenClaw, Flawd et Krill utilisent-ils comme modèles

- Ces déploiements peuvent différer et peuvent évoluer avec le temps ; il n'y a pas de recommandation de fournisseur fixe.
- Vérifiez le paramètre d'exécution actuel sur chaque passerelle avec `openclaw models status`.
- Pour les agents sensibles à la sécurité ou activant des outils, utilisez le modèle le plus puissant et le plus récent disponible.

### Comment changer de modèles à la volée sans redémarrer

Utilisez la commande `/model` comme message autonome :

```
/model sonnet
/model haiku
/model opus
/model gpt
/model gpt-mini
/model gemini
/model gemini-flash
```

Vous pouvez lister les modèles disponibles avec `/model`, `/model list` ou `/model status`.

`/model` (et `/model list`) affiche un sélecteur compact et numéroté. Sélectionnez par numéro :

```
/model 3
```

Vous pouvez également forcer un profil d'authentification spécifique pour le provider (par session) :

```
/model opus@anthropic:default
/model opus@anthropic:work
```

Astuce : `/model status` montre quel agent est actif, quel fichier `auth-profiles.json` est utilisé et quel profil d'authentification sera essayé ensuite.
Il montre également le point de terminaison du provider configuré (`baseUrl`) et le mode API (`api`) lorsqu'ils sont disponibles.

**Comment annuler l'épingle d'un profil que j'ai défini avec profile**

Relancez `/model` **sans** le suffixe `@profile` :

```
/model anthropic/claude-opus-4-6
```

Si vous souhaitez revenir au paramètre par défaut, sélectionnez-le dans `/model` (ou envoyez `/model <default provider/model>`).
Utilisez `/model status` pour confirmer quel profil d'authentification est actif.

### Puis-je utiliser GPT 5.2 pour les tâches quotidiennes et Codex 5.3 pour le codage

Oui. Définissez-en un par défaut et changez au besoin :

- **Changement rapide (par session) :** `/model gpt-5.2` pour les tâches quotidiennes, `/model openai-codex/gpt-5.4` pour le codage avec Codex OAuth.
- **Par défaut + changement :** définissez `agents.defaults.model.primary` sur `openai/gpt-5.2`, puis basculez sur `openai-codex/gpt-5.4` lors du codage (ou inversement).
- **Sous-agents :** acheminez les tâches de codage vers des sous-agents avec un model par défaut différent.

Voir [Modèles](/fr/concepts/models) et [Commandes slash](/fr/tools/slash-commands).

### Pourquoi vois-je Model is not allowed (Le modèle n'est pas autorisé) et ensuite aucune réponse

Si `agents.defaults.models` est défini, il devient la **liste d'autorisation** pour `/model` et toutes
les substitutions de session. Choisir un modèle qui n'est pas dans cette liste renvoie :

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Cette erreur est renvoyée **au lieu de** une réponse normale. Correctif : ajoutez le modèle à
`agents.defaults.models`, supprimez la liste blanche, ou choisissez un modèle parmi `/model list`.

### Pourquoi je vois Unknown model minimaxMiniMaxM25

Cela signifie que le **fournisseur n'est pas configuré** (aucune configuration de fournisseur MiniMax ou profil d'authentification
n'a été trouvé), le modèle ne peut donc pas être résolu. Une correction pour cette détection est
prévue dans la version **2026.1.12** (non publiée au moment de la rédaction).

Liste de vérification du correctif :

1. Mettez à niveau vers la version **2026.1.12** (ou exécutez à partir du code source `main`), puis redémarrez la passerelle.
2. Assurez-vous que MiniMax est configuré (assistant ou JSON), ou qu'une clé MiniMax API
   existe dans les profils env/auth afin que le fournisseur puisse être injecté.
3. Utilisez l'identifiant exact du modèle (sensible à la casse) : `minimax/MiniMax-M2.5` ou
   `minimax/MiniMax-M2.5-highspeed`.
4. Exécutez :

   ```bash
   openclaw models list
   ```

   et choisissez dans la liste (ou `/model list` dans le chat).

Voir [MiniMax](/fr/providers/minimax) et [Modèles](/fr/concepts/models).

### Puis-je utiliser MiniMax par défaut et OpenAI pour les tâches complexes

Oui. Utilisez **MiniMax par défaut** et changez de modèle **par session** si nécessaire.
Les replis sont pour les **erreurs**, pas les "tâches difficiles", utilisez donc `/model` ou un agent séparé.

**Option A : changer par session**

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

Ensuite :

```
/model gpt
```

**Option B : agents séparés**

- Agent A par défaut : MiniMax
- Agent B par défaut : OpenAI
- Acheminez par agent ou utilisez `/agent` pour changer

Docs : [Modèles](/fr/concepts/models), [Routage Multi-Agent](/fr/concepts/multi-agent), [MiniMax](/fr/providers/minimax), [OpenAI](/fr/providers/openai).

### opus sonnet gpt sont-ils des raccourcis intégrés

Oui. OpenClaw fournit quelques raccourcis par défaut (appliqués uniquement lorsque le modèle existe dans `agents.defaults.models`) :

- `opus` → `anthropic/claude-opus-4-6`
- `sonnet` → `anthropic/claude-sonnet-4-6`
- `gpt` → `openai/gpt-5.4`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3.1-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`
- `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

Si vous définissez votre propre alias avec le même nom, votre valeur prévaut.

### Comment définir ou remplacer les raccourcis et alias des modèles

Les alias proviennent de `agents.defaults.models.<modelId>.alias`. Exemple :

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

Ensuite, `/model sonnet` (ou `/<alias>` lorsque pris en charge) résout vers cet ID de modèle.

### Comment ajouter des modèles d'autres fournisseurs comme OpenRouter ou ZAI

OpenRouter (paiement par jeton ; de nombreux modèles) :

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

Z.AI (modèles GLM) :

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

Si vous référencez un provider/modèle mais que la clé provider requise est manquante, vous obtiendrez une erreur d'authentification au moment de l'exécution (ex. `No API key found for provider "zai"`).

**Aucune clé API trouvée pour le provider après l'ajout d'un nouvel agent**

Cela signifie généralement que le **nouvel agent** dispose d'un magasin d'authentification vide. L'authentification est spécifique à chaque agent et
est stockée dans :

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Options de correction :

- Exécutez `openclaw agents add <id>` et configurez l'authentification lors de l'assistant.
- Ou copiez `auth-profiles.json` du `agentDir` de l'agent principal vers le `agentDir` du nouvel agent.

Ne **réutilisez pas** le `agentDir` entre les agents ; cela provoque des conflits d'authentification/session.

## Basculement de modèle et "All models failed"

### Comment fonctionne le basculement

Le basculement s'effectue en deux étapes :

1. **Rotation des profils d'authentification** au sein du même provider.
2. **Basculement de modèle** vers le modèle suivant dans `agents.defaults.model.fallbacks`.

Les temps de recharge s'appliquent aux profils défaillants (backoff exponentiel), afin qu'OpenClaw puisse continuer à répondre même lorsqu'un fournisseur est limité par son taux ou échoue temporairement.

### Que signifie cette erreur

```
No credentials found for profile "anthropic:default"
```

Cela signifie que le système a tenté d'utiliser l'ID de profil d'authentification `anthropic:default`, mais n'a pas pu trouver d'identifiants correspondants dans le magasin d'authentification attendu.

### Liste de vérification pour Aucun identifiant trouvé pour le profil anthropicdefault

- **Confirmer l'emplacement des profils d'authentification** (nouveaux chemins vs chemins hérités)
  - Actuel : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - Hérité : `~/.openclaw/agent/*` (migré par `openclaw doctor`)
- **Confirmer que votre env var est chargé par le Gateway**
  - Si vous définissez `ANTHROPIC_API_KEY` dans votre shell mais que vous exécutez le Gateway via systemd/launchd, il est possible qu'il ne l'hérite pas. Placez-le dans `~/.openclaw/.env` ou activez `env.shellEnv`.
- **Assurez-vous de modifier le bon agent**
  - Les configurations multi-agents signifient qu'il peut y avoir plusieurs fichiers `auth-profiles.json`.
- **Vérifier l'état du model/auth**
  - Utilisez `openclaw models status` pour voir les models configurés et si les fournisseurs sont authentifiés.

**Liste de vérification pour Aucune information d'identification trouvée pour le profil anthropic**

Cela signifie que l'exécution est épinglée à un profil d'authentification Anthropic, mais que la Gateway
ne peut pas le trouver dans son magasin d'authentification.

- **Utiliser un jeton de configuration (setup-token)**
  - Exécutez `claude setup-token`, puis collez-le avec `openclaw models auth setup-token --provider anthropic`.
  - Si le jeton a été créé sur une autre machine, utilisez `openclaw models auth paste-token --provider anthropic`.
- **Si vous souhaitez utiliser une clé API à la place**
  - Mettez `ANTHROPIC_API_KEY` dans `~/.openclaw/.env` sur l'**hôte de la passerelle**.
  - Effacez tout ordre épinglé qui force un profil manquant :

    ```bash
    openclaw models auth order clear --provider anthropic
    ```

- **Confirmez que vous exécutez les commandes sur l'hôte de la passerelle**
  - En mode distant, les profils d'authentification résident sur la machine passerelle, et non sur votre ordinateur portable.

### Pourquoi a-t-il également essayé Google Gemini et échoué

Si votre configuration de modèle inclut Google Gemini comme solution de repli (ou si vous avez basculé vers un raccourci Gemini), OpenClaw essaiera de l'utiliser lors du repli de modèle. Si vous n'avez pas configuré d'identifiants Google, vous verrez `No API key found for provider "google"`.

Correctif : fournissez soit l'authentification Google, soit supprimez/évitez les modèles Google dans `agents.defaults.model.fallbacks` / les alias afin que le repli ne soit pas acheminé vers eux.

**Message de requête LLM rejeté pensant que la signature requise google antigravity**

Cause : l'historique de la session contient des **blocs de réflexion sans signature** (souvent provenant d'un flux interrompu/partiel). Google Antigravity nécessite des signatures pour les blocs de réflexion.

Correctif : OpenClaw supprime désormais les blocs de réflexion non signés pour Google Antigravity Claude. Si le problème persiste, démarrez une **nouvelle session** ou définissez `/thinking off` pour cet agent.

## Profils d'authentification : ce qu'ils sont et comment les gérer

Connexe : [/concepts/oauth](/fr/concepts/oauth) (flux OAuth, stockage des jetons, modèles multi-comptes)

### Qu'est-ce qu'un profil d'authentification

Un profil d'authentification est un enregistrement d'identifiants nommé (OAuth ou clé API) lié à un fournisseur. Les profils se trouvent dans :

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### Quels sont les ID de profil typiques

OpenClaw utilise des ID préfixés par le fournisseur, comme :

- `anthropic:default` (courant lorsqu'aucune identité d'e-mail n'existe)
- `anthropic:<email>` pour les identités OAuth
- ID personnalisés de votre choix (par ex. `anthropic:work`)

### Puis-je contrôler quel profil d'authentification est essayé en premier

Oui. La configuration prend en charge les métadonnées facultatives pour les profils et un ordre par provider (`auth.order.<provider>`). Cela ne stocke **pas** de secrets ; il mappe les ID au provider/mode et définit l'ordre de rotation.

OpenClaw peut temporairement ignorer un profil s'il est en courte période de **refroidissement** (limites de taux/délais d'expiration/échecs d'authentification) ou dans un état plus long de **désactivation** (facturation/crédits insuffisants). Pour inspecter cela, exécutez `openclaw models status --json` et vérifiez `auth.unusableProfiles`. Réglage : `auth.cooldowns.billingBackoffHours*`.

Vous pouvez également définir une priorité de commande **par agent** (stockée dans le `auth-profiles.json` de cet agent) via le CLI :

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

Pour cibler un agent spécifique :

```bash
openclaw models auth order set --provider anthropic --agent main anthropic:default
```

### OAuth vs clé API quelle est la différence

OpenClaw prend en charge les deux :

- Le **OAuth** tire souvent parti de l'accès par abonnement (le cas échéant).
- Les **clés API** utilisent une facturation pay-as-you-go par jeton.

L'assistant prend explicitement en charge le jeton de configuration Anthropic et OpenAI OAuth Codex et peut stocker les clés API pour vous.

## Gateway : ports, « déjà en cours d'exécution » et mode distant

### Quel port le Gateway utilise-t-il

`gateway.port` contrôle le port multiplexé unique pour WebSocket + HTTP (interface de contrôle, hooks, etc.).

Priorité :

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### Pourquoi le statut de la passerelle openclaw indique-t-il Runtime en cours d'exécution mais sonde RPC échouée

Parce que « en cours d'exécution » est la vue du **superviseur** (launchd/systemd/schtasks). La sonde RPC est le CLI se connectant réellement au WebSocket de la passerelle et appelant `status`.

Utilisez `openclaw gateway status` et faites confiance à ces lignes :

- `Probe target:` (l'URL réellement utilisée par la sonde)
- `Listening:` (ce qui est réellement lié au port)
- `Last gateway error:` (cause racine courante lorsque le processus est en vie mais que le port n'écoute pas)

### Pourquoi le statut de la passerelle openclaw montre-t-il Config cli et Config service différents

Vous éditez un fichier de configuration pendant que le service en utilise un autre (souvent une inadéquation `--profile` / `OPENCLAW_STATE_DIR`).

Correctif :

```bash
openclaw gateway install --force
```

Exécutez cela à partir du même `--profile` / environnement que celui que vous souhaitez que le service utilise.

### Que signifie une autre instance de la passerelle est déjà à l'écoute

OpenClaw applique un verrou d'exécution en liant l'écouteur WebSocket immédiatement au démarrage (par défaut `ws://127.0.0.1:18789`). Si la liaison échoue avec `EADDRINUSE`, il lance `GatewayLockError` indiquant qu'une autre instance est déjà à l'écoute.

Correctif : arrêtez l'autre instance, libérez le port ou exécutez avec `openclaw gateway --port <port>`.

### Comment exécuter OpenClaw en mode distant (le client se connecte à une Gateway ailleurs)

Définissez `gateway.mode: "remote"` et pointez vers une URL WebSocket distante, en option avec un jeton/mot de passe :

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

Notes :

- `openclaw gateway` ne démarre que lorsque `gateway.mode` est `local` (ou si vous passez le indicateur de forçage).
- L'application macOS surveille le fichier de configuration et change les modes en direct lorsque ces valeurs changent.

### L'interface de contrôle indique non autorisé ou se reconnecte en boucle Et maintenant

Votre passerelle fonctionne avec l'authentification activée (`gateway.auth.*`), mais l'interface n'envoie pas le jeton/mot de passe correspondant.

Faits (à partir du code) :

- L'interface de contrôle conserve le jeton dans `sessionStorage` pour la session de l'onglet de navigateur actuel et l'URL de la passerelle sélectionnée, afin que les actualisations du même onglet continuent de fonctionner sans restaurer la persistance du jeton localStorage à long terme.
- Sur `AUTH_TOKEN_MISMATCH`, les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton d'appareil mis en cache lorsque la passerelle renvoie des indices de réessai (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).

Correction :

- Le plus rapide : `openclaw dashboard` (imprime + copie l'URL du tableau de bord, essaie de l'ouvrir ; affiche un indice SSH si sans tête).
- Si vous n'avez pas encore de jeton : `openclaw doctor --generate-gateway-token`.
- Si à distance, créez d'abord un tunnel : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`.
- Définissez `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`) sur l'hôte de la passerelle.
- Dans les paramètres de l'interface de contrôle, collez le même jeton.
- Si la discordance persiste après la nouvelle tentative unique, faites pivoter/réapprouvez le jeton de l'appareil couplé :
  - `openclaw devices list`
  - `openclaw devices rotate --device <id> --role operator`
- Toujours bloqué ? Exécutez `openclaw status --all` et suivez le [Dépannage](/fr/gateway/troubleshooting). Consultez le [Tableau de bord](/fr/web/dashboard) pour les détails d'authentification.

### J'ai défini gatewaybind tailnet mais il ne peut pas se lier, rien n'écoute

`tailnet` bind sélectionne une IP Tailscale depuis vos interfaces réseau (100.64.0.0/10). Si la machine n'est pas sur Tailscale (ou si l'interface est désactivée), il n'y a rien à laquelle se lier.

Solution :

- Démarrez Tailscale sur cet hôte (afin qu'il ait une adresse 100.x), ou
- Passez à `gateway.bind: "loopback"` / `"lan"`.

Remarque : `tailnet` est explicite. `auto` préfère le bouclage ; utilisez `gateway.bind: "tailnet"` lorsque vous voulez une liaison tailnet uniquement.

### Puis-je exécuter plusieurs passerelles sur le même hôte

Généralement non - un Gateway peut exécuter plusieurs canaux de messagerie et agents. Utilisez plusieurs Gateways uniquement lorsque vous avez besoin de redondance (ex : bot de secours) ou d'une isolation stricte.

Oui, mais vous devez isoler :

- `OPENCLAW_CONFIG_PATH` (configuration par instance)
- `OPENCLAW_STATE_DIR` (état par instance)
- `agents.defaults.workspace` (isolement de l'espace de travail)
- `gateway.port` (ports uniques)

Configuration rapide (recommandée) :

- Utilisez `openclaw --profile <name> …` par instance (crée automatiquement `~/.openclaw-<name>`).
- Définissez un `gateway.port` unique dans chaque configuration de profil (ou passez `--port` pour les exécutions manuelles).
- Installez un service par profil : `openclaw --profile <name> gateway install`.

Les profils suffixent également les noms de service (`ai.openclaw.<profile>`; `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)` obsolètes).
Guide complet : [Multiple gateways](/fr/gateway/multiple-gateways).

### Que signifie le code de négociation non valide 1008

Le Gateway est un **serveur WebSocket**, et il s'attend à ce que le tout premier message soit
une trame `connect`. S'il reçoit autre chose, il ferme la connexion
avec le **code 1008** (violation de stratégie).

Causes courantes :

- Vous avez ouvert l'URL **HTTP** dans un navigateur (`http://...`) au lieu d'un client WS.
- Vous avez utilisé le mauvais port ou le mauvais chemin.
- Un proxy ou un tunnel a supprimé les en-têtes d'authentification ou a envoyé une requête non-Gateway.

Solutions rapides :

1. Utilisez l'URL WS : `ws://<host>:18789` (ou `wss://...` si HTTPS).
2. N'ouvrez pas le port WS dans un onglet de navigateur normal.
3. Si l'authentification est activée, incluez le jeton/mot de passe dans la frame `connect`.

Si vous utilisez le CLI ou le TUI, l'URL devrait ressembler à :

```
openclaw tui --url ws://<host>:18789 --token <token>
```

Détails du protocole : [protocole Gateway](/fr/gateway/protocol).

## Journalisation et débogage

### Où se trouvent les journaux

Journaux de fichiers (structurés) :

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Vous pouvez définir un chemin stable via `logging.file`. Le niveau de journalisation des fichiers est contrôlé par `logging.level`. La verbosité de la console est contrôlée par `--verbose` et `logging.consoleLevel`.

Surveillance des journaux la plus rapide :

```bash
openclaw logs --follow
```

Journaux du service/superviseur (lorsque la passerelle s'exécute via launchd/systemd) :

- macOS : `$OPENCLAW_STATE_DIR/logs/gateway.log` et `gateway.err.log` (par défaut : `~/.openclaw/logs/...` ; les profils utilisent `~/.openclaw-<profile>/logs/...`)
- Linux : `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows : `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

Voir [Dépannage](/fr/gateway/troubleshooting#log-locations) pour plus d'informations.

### Comment démarrer/arrêter/redémarrer le service Gateway

Utilisez les assistants de la passerelle (gateway) :

```bash
openclaw gateway status
openclaw gateway restart
```

Si vous exécutez la passerelle manuellement, `openclaw gateway --force` peut récupérer le port. Voir [Gateway](/fr/gateway).

### J'ai fermé mon terminal sur Windows, comment redémarrer OpenClaw

Il existe **deux modes d'installation Windows** :

**1) WSL2 (recommandé) :** le Gateway s'exécute à l'intérieur de Linux.

Ouvrez PowerShell, entrez dans WSL, puis redémarrez :

```powershell
wsl
openclaw gateway status
openclaw gateway restart
```

Si vous n'avez jamais installé le service, démarrez-le au premier plan :

```bash
openclaw gateway run
```

**2) Windows natif (non recommandé) :** le Gateway s'exécute directement dans Windows.

Ouvrez PowerShell et exécutez :

```powershell
openclaw gateway status
openclaw gateway restart
```

Si vous l'exécutez manuellement (sans service), utilisez :

```powershell
openclaw gateway run
```

Documentation : [Windows (WSL2)](/fr/platforms/windows), [Manuel de procédure du service Gateway](/fr/gateway).

### Le Gateway est opérationnel mais les réponses n'arrivent jamais, que dois-je vérifier

Commencez par un contrôle rapide de l'état de santé :

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

Causes courantes :

- Authentification du modèle non chargée sur l'hôte de passerelle (**gateway host**) (vérifiez `models status`).
- Appairage de canal (channel) / liste d'autorisation bloquant les réponses (vérifiez la configuration du canal + les journaux).
- WebChat/Dashboard est ouvert sans le bon jeton.

Si vous êtes à distance, confirmez que la connexion du tunnel/Tailscale est active et que le WebSocket du Gateway est accessible.

Documentation : [Canaux](/fr/channels), [Dépannage](/fr/gateway/troubleshooting), [Accès à distance](/fr/gateway/remote).

### Déconnecté de la passerelle sans raison, que faire maintenant

Cela signifie généralement que l'interface utilisateur a perdu la connexion WebSocket. Vérifiez :

1. Le Gateway est-il en cours d'exécution ? `openclaw gateway status`
2. Le Gateway est-il en bonne santé ? `openclaw status`
3. L'interface utilisateur dispose-t-elle du bon jeton ? `openclaw dashboard`
4. Si à distance, la liaison tunnel/Tailscale est-elle active ?

Puis consultez les journaux (tail logs) :

```bash
openclaw logs --follow
```

Docs : [Dashboard](/fr/web/dashboard), [Accès distant](/fr/gateway/remote), [Dépannage](/fr/gateway/troubleshooting).

### Échec de Telegram setMyCommands Que dois-je vérifier

Commencez par les journaux et le statut du canal :

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

Faites ensuite correspondre l'erreur :

- `BOT_COMMANDS_TOO_MUCH` : le menu Telegram contient trop d'entrées. OpenClaw réduit déjà à la limite Telegram et réessaie avec moins de commandes, mais certaines entrées du menu doivent encore être supprimées. Réduisez les commandes de plugin/compétence/personnalisées, ou désactivez `channels.telegram.commands.native` si vous n'avez pas besoin du menu.
- `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, ou erreurs réseau similaires : si vous êtes sur un VPS ou derrière un proxy, confirmez que le HTTPS sortant est autorisé et que le DNS fonctionne pour `api.telegram.org`.

Si le Gateway est distant, assurez-vous que vous consultez les journaux sur l'hôte du Gateway.

Docs : [Telegram](/fr/channels/telegram), [Channel troubleshooting](/fr/channels/troubleshooting).

### TUI n'affiche aucune sortie Que dois-je vérifier

Confirmez d'abord que le Gateway est accessible et que l'agent peut fonctionner :

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

Dans le TUI, utilisez `/status` pour voir l'état actuel. Si vous attendez des réponses dans un channel
de discussion, assurez-vous que la livraison est activée (`/deliver on`).

Docs : [TUI](/fr/web/tui), [Slash commands](/fr/tools/slash-commands).

### Comment arrêter complètement puis démarrer le Gateway

Si vous avez installé le service :

```bash
openclaw gateway stop
openclaw gateway start
```

Cela arrête/démarre le **service supervisé** (launchd sur macOS, systemd sur Linux).
Utilisez ceci lorsque le Gateway s'exécute en arrière-plan en tant que démon.

Si vous l'exécutez au premier plan, arrêtez avec Ctrl-C, puis :

```bash
openclaw gateway run
```

Docs : [Gateway service runbook](/fr/gateway).

### ELI5 openclaw gateway restart vs openclaw gateway

- `openclaw gateway restart` : redémarre le **service d'arrière-plan** (launchd/systemd).
- `openclaw gateway` : exécute la passerelle **au premier plan** pour cette session de terminal.

Si vous avez installé le service, utilisez les commandes de la passerelle. Utilisez `openclaw gateway` lorsque vous souhaitez une exécution unique au premier plan.

### Quel est le moyen le plus rapide d'obtenir plus de détails en cas d'échec

Démarrez le Gateway avec `--verbose` pour obtenir plus de détails dans la console. Ensuite, inspectez le fichier journal pour les erreurs d'authentification de canal, le routage de modèle et les erreurs RPC.

## Médias et pièces jointes

### Mon skill a généré une imagePDF mais rien n'a été envoyé

Les pièces jointes sortantes de l'agent doivent inclure une ligne `MEDIA:<path-or-url>` (sur sa propre ligne). Voir [Configuration de l'assistant OpenClaw](/fr/start/openclaw) et [Envoi d'agent](/fr/tools/agent-send).

Envoi CLI :

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

Vérifiez également :

- Le channel cible prend en charge les médias sortants et n'est pas bloqué par les listes d'autorisation.
- Le fichier est dans les limites de taille du provider (les images sont redimensionnées à un maximum de 2048px).

Voir [Images](/fr/nodes/images).

## Sécurité et contrôle d'accès

### Est-il sûr d'exposer OpenClaw aux DMs entrants

Traitez les DMs entrants comme une entrée non fiable. Les paramètres par défaut sont conçus pour réduire les risques :

- Le comportement par défaut sur les channels prenant en charge les DMs est le **pairing** :
  - Les expéditeurs inconnus reçoivent un code de pairing ; le bot ne traite pas leur message.
  - Approuvez avec : `openclaw pairing approve --channel <channel> [--account <id>] <code>`
  - Les demandes en attente sont limitées à **3 par channel** ; vérifiez `openclaw pairing list --channel <channel> [--account <id>]` si un code n'est pas arrivé.
- Ouvrir les DMs publiquement nécessite une acceptation explicite (`dmPolicy: "open"` et allowlist `"*"`).

Exécutez `openclaw doctor` pour révéler les politiques de DM risquées.

### L'injection de prompt est-elle uniquement une préoccupation pour les bots publics

Non. L'injection de prompt concerne le **contenu non fiable**, et pas seulement qui peut envoyer un DM au bot.
Si votre assistant lit du contenu externe (recherche Web/récupération, pages de navigateur, e-mails,
docs, pièces jointes, journaux collés), ce contenu peut inclure des instructions qui tentent
de détourner le modèle. Cela peut arriver même si **vous êtes le seul expéditeur**.

Le plus grand risque survient lorsque les outils sont activés : le modèle peut être trompé et
exfiltrer du contexte ou appeler des outils en votre nom. Réduisez le rayon d'impact en :

- utilisant un agent "lecteur" en lecture seule ou sans outils pour résumer le contenu non fiable
- gardant `web_search` / `web_fetch` / `browser` désactivés pour les agents avec outils activés
- le sandboxing et les listes d'autorisation strictes pour les outils

Détails : [Sécurité](/fr/gateway/security).

### Mon bot doit-il avoir son propre compte e-mail GitHub ou son propre numéro de téléphone

Oui, pour la plupart des configurations. Isoler le bot avec des comptes et des numéros de téléphone distincts réduit le rayon d'impact en cas de problème. Cela facilite également la rotation des identifiants ou la révocation de l'accès sans impacter vos comptes personnels.

Commencez modestement. Accordez l'accès uniquement aux outils et comptes dont vous avez réellement besoin, et étendez-le plus tard si nécessaire.

Documentation : [Sécurité](/fr/gateway/security), [Appairage](/fr/channels/pairing).

### Puis-je lui donner une autonomie sur mes SMS et est-ce sans danger

Nous **ne recommandons pas** une autonomie totale sur vos messages personnels. Le modèle le plus sûr est :

- Gardez les DMs en **mode d'appairage** ou dans une liste d'autorisation stricte.
- Utilisez un **numéro ou un compte distinct** si vous souhaitez qu'il envoie des messages en votre nom.
- Laissez-le rédiger, puis **approuvez avant l'envoi**.

Si vous souhaitez expérimenter, faites-le sur un compte dédié et tenez-le isolé. Voir [Sécurité](/fr/gateway/security).

### Puis-je utiliser des modèles moins coûteux pour les tâches d'assistant personnel

Oui, **si** l'agent est uniquement conversationnel et que l'entrée est fiable. Les niveaux inférieurs sont
plus sensibles au détournement d'instructions, donc évitez-les pour les agents avec des outils
ou lors de la lecture de contenu non fiable. Si vous devez utiliser un modèle plus petit, verrouillez
les outils et exécutez-le dans un bac à sable. Voir [Sécurité](/fr/gateway/security).

### J'ai exécuté start sur Telegram mais je n'ai pas reçu de code d'appariement

Les codes d'appariement sont envoyés **uniquement** lorsqu'un expéditeur inconnu envoie un message au bot et que
`dmPolicy: "pairing"` est activé. `/start` seul ne génère pas de code.

Vérifiez les demandes en attente :

```bash
openclaw pairing list telegram
```

Si vous souhaitez un accès immédiat, ajoutez votre identifiant d'expéditeur à la liste blanche ou définissez `dmPolicy: "open"`
pour ce compte.

### WhatsApp va-t-il envoyer des messages à mes contacts ? Comment fonctionne l'appariement ?

Non. La stratégie par défaut pour les WhatsApp DM est le **jumelage** (pairing). Les expéditeurs inconnus ne reçoivent qu'un code de jumelage et leur message n'est **pas traité**. OpenClaw ne répond qu'aux conversations qu'il reçoit ou aux envois explicites que vous déclenchez.

Approuver le jumelage avec :

```bash
openclaw pairing approve whatsapp <code>
```

Lister les demandes en attente :

```bash
openclaw pairing list whatsapp
```

Invite du numéro de téléphone de l'assistant : elle est utilisée pour définir votre **liste blanche/propriétaire** afin que vos propres DM soient autorisés. Elle n'est pas utilisée pour l'envoi automatique. Si vous utilisez votre numéro personnel WhatsApp, utilisez ce numéro et activez `channels.whatsapp.selfChatMode`.

## Commandes de chat, annulation de tâches et "ça ne s'arrête pas"

### Comment empêcher les messages système internes de s'afficher dans le chat

La plupart des messages internes ou des outils n'apparaissent que lorsque le mode **verbose** ou **reasoning** est activé
pour cette session.

Corriger dans le chat où vous le voyez :

```
/verbose off
/reasoning off
```

S'il y a encore du bruit, vérifiez les paramètres de session dans l'interface de contrôle et définissez verbose sur **inherit**. Assurez-vous également que vous n'utilisez pas un profil de bot avec `verboseDefault` défini sur `on` dans la configuration.

Docs : [Thinking and verbose](/fr/tools/thinking), [Security](/fr/gateway/security#reasoning--verbose-output-in-groups).

### Comment arrêter/annuler une tâche en cours d'exécution

Envoyez l'un de ces éléments **en tant que message autonome** (sans slash) :

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

Ce sont des déclencheurs d'abandon (et non des commandes slash).

Pour les processus d'arrière-plan (issus de l'outil exec), vous pouvez demander à l'agent d'exécuter :

```
process action:kill sessionId:XXX
```

Aperçu des commandes slash : voir [Slash commands](/fr/tools/slash-commands).

La plupart des commandes doivent être envoyées sous forme de message **autonome** commençant par `/`, mais quelques raccourcis (comme `/status`) fonctionnent également en ligne pour les expéditeurs autorisés.

### Comment envoyer un message Discord depuis Telegram Messagerie intercontexte refusée

OpenClaw bloque la messagerie **inter-fournisseurs** par défaut. Si un appel d'outil est lié à Telegram, il n'enverra pas à Discord sauf si vous l'autorisez explicitement.

Activez la messagerie inter-fournisseurs pour l'agent :

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

Redémarrez la passerelle après avoir modifié la configuration. Si vous ne le souhaitez que pour un seul agent, définissez-le sous `agents.list[].tools.message` à la place.

### Pourquoi a-t-on l'impression que le bot ignore les messages en rafale

Le mode de file d'attente contrôle la façon dont les nouveaux messages interagissent avec une exécution en cours. Utilisez `/queue` pour changer de mode :

- `steer` - les nouveaux messages redirigent la tâche actuelle
- `followup` - exécuter les messages un par un
- `collect` - regrouper les messages et répondre une fois (par défaut)
- `steer-backlog` - guider maintenant, puis traiter l'arriéré
- `interrupt` - interrompre l'exécution actuelle et recommencer

Vous pouvez ajouter des options comme `debounce:2s cap:25 drop:summarize` pour les modes de suivi.

## Répondre exactement à la question issue de la capture d'écran/journal de chat

**Q : « Quel est le model par défaut pour Anthropic avec une clé API ? »**

**R :** Dans OpenClaw, les informations d'identification et la sélection du model sont distinctes. Définir `ANTHROPIC_API_KEY` (ou stocker une clé Anthropic API dans les profils d'authentification) active l'authentification, mais le model par défaut réel est celui que vous configurez dans `agents.defaults.model.primary` (par exemple, `anthropic/claude-sonnet-4-5` ou `anthropic/claude-opus-4-6`). Si vous voyez `No credentials found for profile "anthropic:default"`, cela signifie que la Gateway n'a pas pu trouver les informations d'identification Anthropic dans le `auth-profiles.json` attendu pour l'agent en cours d'exécution.

---

Toujours bloqué ? Posez la question sur [Discord](https://discord.com/invite/clawd) ou ouvrez une [discussion GitHub](https://github.com/openclaw/openclaw/discussions).

import fr from "/components/footer/fr.mdx";

<fr />
