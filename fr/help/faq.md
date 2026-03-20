---
summary: "Foire aux questions sur la configuration, l'installation et l'utilisation d'OpenClaw"
read_when:
  - Répondre aux questions courantes sur la configuration, l'installation, l'intégration ou le support d'exécution
  - Tri des problèmes signalés par les utilisateurs avant un débogage plus approfondi
title: "FAQ"
---

# FAQ

Réponses rapides et dépannage approfondi pour des configurations réelles (développement local, VPS, multi-agent, clés OAuth/API, basculement de modèle). Pour les diagnostics d'exécution, voir [Troubleshooting](/fr/gateway/troubleshooting). Pour la référence complète de la configuration, voir [Configuration](/fr/gateway/configuration).

## Table des matières

- [Démarrage rapide et configuration du premier lancement]
  - [Je suis bloqué - moyen le plus rapide de débloquer](#i-am-stuck---fastest-way-to-get-unstuck)
  - [Méthode recommandée pour installer et configurer OpenClaw](#recommended-way-to-install-and-set-up-openclaw)
  - [Comment ouvrir le tableau de bord après l'intégration ?](#how-do-i-open-the-dashboard-after-onboarding)
  - [Comment authentifier le tableau de bord (jeton) sur localhost vs à distance ?](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [De quel runtime ai-je besoin ?](#what-runtime-do-i-need)
  - [Est-ce que cela fonctionne sur Raspberry Pi ?](#does-it-run-on-raspberry-pi)
  - [Des conseils pour les installations sur Raspberry Pi ?](#any-tips-for-raspberry-pi-installs)
  - [Cela reste bloqué sur "wake up my friend" / l'intégration ne va pas aboutir. Que faire ?](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [Puis-je migrer ma configuration vers une nouvelle machine (Mac mini) sans refaire l'intégration ?](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [Où puis-je voir les nouveautés de la dernière version ?](#where-do-i-see-what-is-new-in-the-latest-version)
  - [Impossible d'accéder à docs.openclaw.ai (erreur SSL)](#cannot-access-docsopenclawai-ssl-error)
  - [Différence entre stable et bêta](#difference-between-stable-and-beta)
  - [Comment installer la version bêta et quelle est la différence entre bêta et dev](#how-do-i-install-the-beta-version-and-what-is-the-difference-between-beta-and-dev)
  - [Comment essayer les dernières versions ?](#how-do-i-try-the-latest-bits)
  - [Combien de temps prennent généralement l'installation et l'intégration ?](#how-long-does-install-and-onboarding-usually-take)
  - [Installateur bloqué ? Comment obtenir plus de retours ?](#installer-stuck-how-do-i-get-more-feedback)
  - [L'installation Windows indique que git n'est pas trouvé ou qu'openclaw n'est pas reconnu](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [La sortie exec Windows affiche du texte chinois illisible, que dois-je faire](#windows-exec-output-shows-garbled-chinese-text-what-should-i-do)
  - [La documentation n'a pas répondu à ma question - comment obtenir une meilleure réponse](#the-docs-did-not-answer-my-question---how-do-i-get-a-better-answer)
  - [Comment installer OpenClaw sur Linux ?](#how-do-i-install-openclaw-on-linux)
  - [Comment installer OpenClaw sur un VPS ?](#how-do-i-install-openclaw-on-a-vps)
  - [Où se trouvent les guides d'installation cloud/VPS ?](#where-are-the-cloudvps-install-guides)
  - [Puis-je demander à OpenClaw de se mettre à jour ?](#can-i-ask-openclaw-to-update-itself)
  - [Que fait réellement l'onboarding ?](#what-does-onboarding-actually-do)
  - [Ai-je besoin d'un abonnement Claude ou OpenAI pour exécuter ceci ?](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [Puis-je utiliser l'abonnement Claude Max sans clé API](#can-i-use-claude-max-subscription-without-an-api-key)
  - [Comment fonctionne l'authentification "setup-token" Anthropic ?](#how-does-anthropic-setuptoken-auth-work)
  - [Où puis-je trouver un setup-token Anthropic ?](#where-do-i-find-an-anthropic-setuptoken)
  - [Prenez-vous en charge l'authentification par abonnement Claude (Claude Pro ou Max) ?](#do-you-support-claude-subscription-auth-claude-pro-or-max)
  - [Pourquoi vois-je `HTTP 429: rate_limit_error` de la part de Anthropic ?](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [AWS Bedrock est-il pris en charge ?](#is-aws-bedrock-supported)
  - [Comment fonctionne l'authentification Codex ?](#how-does-codex-auth-work)
  - [Prenez-vous en charge l'authentification par abonnement OpenAI (Codex OAuth) ?](#do-you-support-openai-subscription-auth-codex-oauth)
  - [Comment configurer CLI OAuth Gemini](#how-do-i-set-up-gemini-cli-oauth)
  - [Un modèle local est-il adapté aux discussions occasionnelles ?](#is-a-local-model-ok-for-casual-chats)
  - [Comment puis-je maintenir le trafic du modèle hébergé dans une région spécifique ?](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [Dois-je acheter un Mac Mini pour installer ceci ?](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [Ai-je besoin d'un Mac mini pour le support iMessage ?](#do-i-need-a-mac-mini-for-imessage-support)
  - [Si j'achète un Mac mini pour faire tourner OpenClaw, puis-je le connecter à mon MacBook Pro ?](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [Puis-je utiliser Bun ?](#can-i-use-bun)
  - [Telegram : que dois-je mettre dans `allowFrom` ?](#telegram-what-goes-in-allowfrom)
  - [Plusieurs personnes peuvent-elles utiliser un même numéro WhatsApp avec différentes instances OpenClaw ?](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [Puis-je exécuter un agent "fast chat" et un agent "Opus for coding" ?](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [Homebrew fonctionne-t-il sur Linux ?](#does-homebrew-work-on-linux)
  - [Différence entre l'installation hackable via git et l'installation npm](#difference-between-the-hackable-git-install-and-npm-install)
  - [Puis-je basculer entre les installations npm et git plus tard ?](#can-i-switch-between-npm-and-git-installs-later)
  - [Dois-je exécuter le Gateway sur mon ordinateur portable ou un VPS ?](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [Quelle est l'importance d'exécuter OpenClaw sur une machine dédiée ?](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [Quels sont les requis minimaux du VPS et les systèmes d'exploitation recommandés ?](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [Puis-je exécuter OpenClaw dans une VM et quels sont les requis](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [Qu'est-ce que OpenClaw ?](#what-is-openclaw)
  - [Qu'est-ce que OpenClaw, en un paragraphe ?](#what-is-openclaw-in-one-paragraph)
  - [Proposition de valeur](#value-proposition)
  - [Je viens de le configurer, que dois-je faire en premier](#i-just-set-it-up-what-should-i-do-first)
  - [Quels sont les cinq principaux cas d'usage quotidiens pour OpenClaw](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [OpenClaw peut-il aider avec la génération de leads, le contact, la publicité et les blogs pour un SaaS](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [Quels sont les avantages par rapport à Claude Code pour le développement web ?](#what-are-the-advantages-vs-claude-code-for-web-development)
- [Compétences et automatisation](#skills-and-automation)
  - [Comment personnaliser les compétences sans salir le dépôt ?](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [Puis-je charger des compétences depuis un dossier personnalisé ?](#can-i-load-skills-from-a-custom-folder)
  - [Comment puis-je utiliser différents modèles pour différentes tâches ?](#how-can-i-use-different-models-for-different-tasks)
  - [Le bot gèle pendant qu'il effectue un travail intensif. Comment décharger cela ?](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [Les tâches Cron ou les rappels ne se déclenchent pas. Que dois-je vérifier ?](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [Comment installer des compétences sur Linux ?](#how-do-i-install-skills-on-linux)
  - [OpenClaw peut-il exécuter des tâches selon un planning ou en continu en arrière-plan ?](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [Puis-je exécuter des compétences exclusives à Apple macOS depuis Linux ?](#can-i-run-apple-macos-only-skills-from-linux)
  - [Avez-vous une intégration Notion ou HeyGen ?](#do-you-have-a-notion-or-heygen-integration)
  - [Comment utiliser mon Chrome existant connecté avec OpenClaw ?](#how-do-i-use-my-existing-signed-in-chrome-with-openclaw)
- [Bac à sable et mémoire](#sandboxing-and-memory)
  - [Existe-t-il une documentation dédiée au bac à sable ?](#is-there-a-dedicated-sandboxing-doc)
  - [Comment lier un dossier de l'hôte au bac à sable ?](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [Comment fonctionne la mémoire ?](#how-does-memory-work)
  - [La mémoire continue d'oublier des choses. Comment faire en sorte qu'elle retienne ?](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [La mémoire persiste-t-elle pour toujours ? Quelles sont les limites ?](#does-memory-persist-forever-what-are-the-limits)
  - [La recherche sémantique dans la mémoire nécessite-t-elle une clé OpenAI API ?](#does-semantic-memory-search-require-an-openai-api-key)
- [Emplacement des éléments sur le disque](#where-things-live-on-disk)
  - [Toutes les données utilisées avec OpenClaw sont-elles enregistrées localement ?](#is-all-data-used-with-openclaw-saved-locally)
  - [Où OpenClaw enregistre-t-il ses données ?](#where-does-openclaw-store-its-data)
  - [Où doivent se trouver AGENTS.md / SOUL.md / USER.md / MEMORY.md ?](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [Stratégie de sauvegarde recommandée](#recommended-backup-strategy)
  - [Comment désinstaller complètement OpenClaw ?](#how-do-i-completely-uninstall-openclaw)
  - [Les agents peuvent-ils travailler en dehors de l'espace de travail ?](#can-agents-work-outside-the-workspace)
  - [Je suis en mode distant - où se trouve le magasin de session ?](#im-in-remote-mode-where-is-the-session-store)
- [Notions de base de la configuration](#config-basics)
  - [Quel est le format de la configuration ? Où se trouve-t-elle ?](#what-format-is-the-config-where-is-it)
  - [J'ai défini `gateway.bind: "lan"` (ou `"tailnet"`) et maintenant rien n'écoute / l'interface utilisateur indique non autorisé](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [Pourquoi ai-je besoin d'un jeton sur localhost maintenant ?](#why-do-i-need-a-token-on-localhost-now)
  - [Dois-je redémarrer après avoir modifié la configuration ?](#do-i-have-to-restart-after-changing-config)
  - [Comment désactiver les slogans drôles de la CLI ?](#how-do-i-disable-funny-cli-taglines)
  - [Comment activer la recherche Web (et la récupération Web) ?](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply a effacé ma configuration. Comment récupérer et éviter cela ?](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [Comment faire fonctionner une Gateway centrale avec des workers spécialisés sur plusieurs appareils ?](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [Le navigateur OpenClaw peut-il fonctionner en mode headless ?](#can-the-openclaw-browser-run-headless)
  - [Comment utiliser Brave pour le contrôle du navigateur ?](#how-do-i-use-brave-for-browser-control)
- [Passerelles et nœuds distants](#remote-gateways-and-nodes)
  - [Comment les commandes se propagent-elles entre Telegram, la passerelle et les nœuds ?](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [Comment mon agent peut-il accéder à mon ordinateur si la passerelle est hébergée à distance ?](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale est connecté mais je ne reçois aucune réponse. Que faire ?](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [Deux instances OpenClaw peuvent-elles communiquer entre elles (local + VPS) ?](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [Ai-je besoin de VPS séparés pour plusieurs agents](#do-i-need-separate-vpses-for-multiple-agents)
  - [Y a-t-il un avantage à utiliser un nœud sur mon ordinateur portable personnel au lieu d'un SSH depuis un VPS ?](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [Les nœuds exécutent-ils un service de passerelle ?](#do-nodes-run-a-gateway-service)
  - [Existe-t-il un moyen API / RPC d'appliquer la configuration ?](#is-there-an-api-rpc-way-to-apply-config)
  - [Configuration minimale saine pour une première installation](#minimal-sane-config-for-a-first-install)
  - [Comment configurer Tailscale sur un VPS et se connecter depuis mon Mac ?](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [Comment connecter un nœud Mac à une passerelle distante (Tailscale Serve) ?](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [Dois-je installer sur un deuxième ordinateur portable ou simplement ajouter un nœud ?](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [Variables d'environnement et chargement .env](#env-vars-and-env-loading)
  - [Comment OpenClaw charge-t-il les variables d'environnement ?](#how-does-openclaw-load-environment-variables)
  - ["J'ai démarré la passerelle via le service et mes variables d'environnement ont disparu." Que faire ?](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [J'ai défini `COPILOT_GITHUB_TOKEN`, mais l'état des modèles indique "Shell env : désactivé." Pourquoi ?](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [Sessions et discussions multiples](#sessions-and-multiple-chats)
  - [Comment démarrer une nouvelle conversation ?](#how-do-i-start-a-fresh-conversation)
  - [Les sessions sont-elles réinitialisées automatiquement si je n'envoie jamais `/new` ?](#do-sessions-reset-automatically-if-i-never-send-new)
  - [Existe-t-il un moyen de constituer une équipe d'instances OpenClaw avec un PDG et plusieurs agents](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [Pourquoi le contexte a-t-il été tronqué en cours de tâche ? Comment l'éviter ?](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [Comment réinitialiser complètement OpenClaw tout en le laissant installé ?](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [Je rencontre des erreurs "contexte trop volumineux" - comment réinitialiser ou compacter ?](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [Pourquoi vois-je "LLM request rejected: messages.content.tool_use.input field required" ?](#why-am-i-seeing-llm-request-rejected-messagescontenttool_useinput-field-required)
  - [Pourquoi reçois-je des messages de heartbeat toutes les 30 minutes ?](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [Dois-je ajouter un "compte bot" à un groupe WhatsApp ?](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [Comment obtenir le JID d'un groupe WhatsApp ?](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [Pourquoi OpenClaw ne répond-il pas dans un groupe](#why-does-openclaw-not-reply-in-a-group)
  - [Les groupes/fils partagent-ils le contexte avec les DMs ?](#do-groupsthreads-share-context-with-dms)
  - [Combien d'espaces de travail et d'agents puis-je créer ?](#how-many-workspaces-and-agents-can-i-create)
  - [Puis-je exécuter plusieurs bots ou discussions en même temps (Slack), et comment dois-je les configurer ?](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [Modèles : valeurs par défaut, sélection, alias, changement](#models-defaults-selection-aliases-switching)
  - [Qu'est-ce que le "modèle par défaut" ?](#what-is-the-default-model)
  - [Quel modèle recommandez-vous ?](#what-model-do-you-recommend)
  - [Comment changer de modèles sans effacer ma configuration ?](#how-do-i-switch-models-without-wiping-my-config)
  - [Puis-je utiliser des modèles auto-hébergés (llama.cpp, vLLM, Ollama) ?](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [Que utilisent OpenClaw, Flawd et Krill pour les modèles ?](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [Comment changer de modèles à la volée (sans redémarrer) ?](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [Puis-je utiliser GPT 5.2 pour les tâches quotidiennes et Codex 5.3 pour le codage](#can-i-use-gpt-52-for-daily-tasks-and-codex-53-for-coding)
  - [Pourquoi vois-je "Modèle … non autorisé" et ensuite aucune réponse ?](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [Pourquoi vois-je "Modèle inconnu : minimax/MiniMax-M2.5" ?](#why-do-i-see-unknown-model-minimaxminimaxm25)
  - [Puis-je utiliser MiniMax par défaut et OpenAI pour les tâches complexes ?](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [Les raccourcis opus / sonnet / gpt sont-ils intégrés ?](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [Comment définir/remplacer les raccourcis de modèles (alias) ?](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [Comment ajouter des modèles d'autres fournisseurs comme OpenRouter ou Z.AI ?](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [Basculement de modèle et "Tous les modèles ont échoué"](#model-failover-and-all-models-failed)
  - [Comment fonctionne le basculement ?](#how-does-failover-work)
  - [Que signifie cette erreur ?](#what-does-this-error-mean)
  - [Liste de contrôle pour `No credentials found for profile "anthropic:default"`](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [Pourquoi a-t-il également essayé Google Gemini et échoué ?](#why-did-it-also-try-google-gemini-and-fail)
- [Profils d'authentification : ce qu'ils sont et comment les gérer](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [Qu'est-ce qu'un profil d'authentification ?](#what-is-an-auth-profile)
  - [Quels sont les ID de profil typiques ?](#what-are-typical-profile-ids)
  - [Puis-je contrôler quel profil d'authentification est essayé en premier ?](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth vs clé API - quelle est la différence](#oauth-vs-api-key---what-is-the-difference)
- [Gateway : ports, "déjà en cours d'exécution" et mode distant](#gateway-ports-already-running-and-remote-mode)
  - [Quel port la Gateway utilise-t-elle ?](#what-port-does-the-gateway-use)
  - [Pourquoi `openclaw gateway status` indique `Runtime: running` mais `RPC probe: failed` ?](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [Pourquoi `openclaw gateway status` affiche-t-il `Config (cli)` et `Config (service)` différents ?](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - [Que signifie "une autre instance de la gateway écoute déjà" ?](#what-does-another-gateway-instance-is-already-listening-mean)
  - [Comment exécuter OpenClaw en mode distant (le client se connecte à une Gateway située ailleurs) ?](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [L'interface de contrôle indique "non autorisé" (ou se reconnecte en permanence). Et maintenant ?](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [J'ai défini gateway.bind tailnet mais il ne peut pas se lier et rien n'écoute](#i-set-gatewaybind-tailnet-but-it-cannot-bind-and-nothing-listens)
  - [Puis-je exécuter plusieurs Gateways sur le même hôte ?](#can-i-run-multiple-gateways-on-the-same-host)
  - [Que signifie "handshake invalide" / code 1008 ?](#what-does-invalid-handshake-code-1008-mean)
- [Journalisation et débogage](#logging-and-debugging)
  - [Où se trouvent les journaux ?](#where-are-logs)
  - [Comment démarrer/arrêter/redémarrer le service Gateway ?](#how-do-i-startstoprestart-the-gateway-service)
  - [J'ai fermé mon terminal sur Windows - comment redémarrer OpenClaw ?](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [La Gateway est opérationnelle mais les réponses n'arrivent jamais. Que dois-je vérifier ?](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - ["Déconnecté de la gateway : aucune raison" - et maintenant ?](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram setMyCommands échoue. Que dois-je vérifier ?](#telegram-setmycommands-fails-what-should-i-check)
  - [Le TUI n'affiche aucune sortie. Que dois-je vérifier ?](#tui-shows-no-output-what-should-i-check)
  - [Comment arrêter complètement puis démarrer la Gateway ?](#how-do-i-completely-stop-then-start-the-gateway)
  - [ELI5 : `openclaw gateway restart` contre `openclaw gateway`](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [Le moyen le plus rapide d'obtenir plus de détails en cas d'échec](#fastest-way-to-get-more-details-when-something-fails)
- [Médias et pièces jointes](#media-and-attachments)
  - [Mon skill a généré une image/PDF, mais rien n'a été envoyé](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [Sécurité et contrôle d'accès](#security-and-access-control)
  - [Est-il sûr d'exposer OpenClaw aux DM entrants ?](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [L'injection de prompt est-elle uniquement une préoccupation pour les bots publics ?](#is-prompt-injection-only-a-concern-for-public-bots)
  - [Mon bot doit-il avoir son propre compte GitHub, e-mail ou numéro de téléphone](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [Puis-je lui donner une autonomie sur mes SMS et est-ce sûr](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [Puis-je utiliser des modèles moins chers pour les tâches d'assistant personnel ?](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [J'ai exécuté /start sur Telegram mais je n'ai pas reçu de code d'appariement](#i-ran-start-in-telegram-but-did-not-get-a-pairing-code)
  - [WhatsApp : va-t-il envoyer des messages à mes contacts ? Comment fonctionne l'appariement ?](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [Commandes de chat, annulation de tâches et "ça ne s'arrête pas"](#chat-commands-aborting-tasks-and-it-will-not-stop)
  - [Comment empêcher les messages système internes de s'afficher dans le chat](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [Comment arrêter/annuler une tâche en cours ?](#how-do-i-stopcancel-a-running-task)
  - [Comment envoyer un message Discord depuis Telegram ? ("Cross-context messaging denied")](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [Pourquoi a-t-on l'impression que le bot "ignore" les messages en rafale ?](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## Premières 60 secondes si quelque chose ne fonctionne pas

1. **Statut rapide (première vérification)**

   ```bash
   openclaw status
   ```

   Résumé local rapide : OS + mise à jour, accessibilité de la passerelle/du service, agents/sessions, configuration du provider + problèmes d'exécution (lorsque la passerelle est accessible).

2. **Rapport collable (sûr à partager)**

   ```bash
   openclaw status --all
   ```

   Diagnostic en lecture seule avec le journal (tokens expurgés).

3. **Daemon + état du port**

   ```bash
   openclaw gateway status
   ```

   Affiche l'exécution du superviseur par rapport à l'accessibilité RPC, l'URL cible de la sonde et la configuration probablement utilisée par le service.

4. **Sondes profondes**

   ```bash
   openclaw status --deep
   ```

   Exécute les contrôles de santé de la passerelle + sondes du provider (nécessite une passerelle accessible). Voir [Santé](/fr/gateway/health).

5. **Afficher la fin du journal**

   ```bash
   openclaw logs --follow
   ```

   Si le RPC est en panne, revenez à :

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Les fichiers journaux sont distincts des journaux de service ; voir [Journalisation](/fr/logging) et [Dépannage](/fr/gateway/troubleshooting).

6. **Exécuter le docteur (réparations)**

   ```bash
   openclaw doctor
   ```

   Répare/migre la config/l'état + exécute les contrôles de santé. Voir [Docteur](/fr/gateway/doctor).

7. **Gateway snapshot**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Demande au gateway en cours d'exécution un instantané complet (WS uniquement). Voir [Santé](/fr/gateway/health).

## Quick start et configuration de première exécution

### Je suis bloqué - moyen le plus rapide de get unstuck

Utilisez un agent IA local capable de **voir votre machine**. C'est bien plus efficace que de demander
dans Discord, car la plupart des cas "Je suis bloqué" sont des **problèmes de config locale ou d'environnement** que
les assistants distants ne peuvent pas inspecter.

- **Claude Code** : [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
- **OpenAI Codex** : [https://openai.com/codex/](https://openai.com/codex/)

Ces outils peuvent lire le dépôt, exécuter des commandes, inspecter les journaux et aider à réparer votre configuration
au niveau de la machine (PATH, services, permissions, fichiers d'auth). Donnez-leur l'**extraction complète des sources** via
l'installation hackable (git) :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Cela installe OpenClaw **à partir d'une extraction git**, afin que l'agent puisse lire le code + les docs et
raisonner sur la version exacte que vous exécutez. Vous pourrez toujours revenir à la version stable plus tard
en réexécutant l'installateur sans `--install-method git`.

Conseil : demandez à l'agent de **planifier et superviser** la réparation (étape par étape), puis d'exécuter uniquement les
commandes nécessaires. Cela permet de garder les modifications limitées et plus faciles à auditer.

Si vous découvrez un vrai bug ou une correction, veuillez signaler un problème GitHub ou envoyer une PR :
[https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
[https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

Commencez par ces commandes (partagez les résultats lorsque vous demandez de l'aide) :

```bash
openclaw status
openclaw models status
openclaw doctor
```

Ce qu'elles font :

- `openclaw status` : instantané rapide de la santé du gateway/de l'agent + config de base.
- `openclaw models status` : vérifie l'auth du provider + la disponibilité des models.
- `openclaw doctor` : valide et répare les problèmes courants de config/état.

Autres contrôles CLI utiles : `openclaw status --all`, `openclaw logs --follow`,
`openclaw gateway status`, `openclaw health --verbose`.

Boucle de débogage rapide : [First 60 seconds if something is broken](#first-60-seconds-if-something-is-broken).
Documentation d'installation : [Install](/fr/install), [Installer flags](/fr/install/installer), [Updating](/fr/install/updating).

### Méthode recommandée pour installer et configurer OpenClaw

Le dépôt recommande de l'exécuter à partir du code source et d'utiliser l'onboarding :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

L'assistant peut également construire automatiquement les éléments de l'interface utilisateur. Après l'onboarding, vous exécutez généralement la Gateway sur le port **18789**.

À partir du code source (contributeurs/dev) :

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw onboard
```

Si vous n'avez pas encore d'installation globale, exécutez-la via `pnpm openclaw onboard`.

### Comment ouvrir le tableau de bord après l'onboarding

L'assistant ouvre votre navigateur avec une URL de tableau de bord propre (non tokenisée) juste après l'onboarding et affiche également le lien dans le résumé. Gardez cet onglet ouvert ; s'il ne s'est pas lancé, copiez/collez l'affichage URL sur la même machine.

### Comment authentifier le jeton du tableau de bord sur localhost vs à distance

**Localhost (même machine) :**

- Ouvrez `http://127.0.0.1:18789/`.
- S'il demande une authentification, collez le jeton de `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`) dans les paramètres de l'interface utilisateur de contrôle.
- Récupérez-le depuis l'hôte de la passerelle : `openclaw config get gateway.auth.token` (ou générez-en un : `openclaw doctor --generate-gateway-token`).

**Pas sur localhost :**

- **Tailscale Serve** (recommandé) : gardez la liaison loopback, exécutez `openclaw gateway --tailscale serve`, ouvrez `https://<magicdns>/`. Si `gateway.auth.allowTailscale` est `true`, les en-têtes d'identité satisfont l'authentification de l'interface utilisateur de contrôle/WebSocket (pas de jeton, suppose un hôte de passerelle de confiance) ; les API HTTP nécessitent toujours un jeton/mot de passe.
- **Liaison Tailnet** : exécutez `openclaw gateway --bind tailnet --token "<token>"`, ouvrez `http://<tailscale-ip>:18789/`, collez le jeton dans les paramètres du tableau de bord.
- **Tunnel SSH** : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/` et collez le jeton dans les paramètres de l'interface utilisateur de contrôle.

Voir [Dashboard](/fr/web/dashboard) et [Web surfaces](/fr/web) pour les modes de liaison et les détails d'authentification.

### De quel runtime ai-je besoin

Node **>= 22** est requis. `pnpm` est recommandé. Bun n'est **pas recommandé** pour la Gateway.

### Est-ce que ça tourne sur Raspberry Pi

Oui. Le Gateway est léger - la documentation indique que **512 Mo à 1 Go de RAM**, **1 cœur**, et environ **500 Mo**
d'espace disque suffisent pour un usage personnel, et note qu'un **Raspberry Pi 4 peut l'exécuter**.

Si vous voulez une marge supplémentaire (journaux, médias, autres services), **2 Go sont recommandés**, mais ce n'est
pas un minimum strict.

Astuce : un petit Pi/VPS peut héberger le Gateway, et vous pouvez associer des **nœuds** sur votre ordinateur portable/téléphone pour
un écran/caméra/canevas local ou l'exécution de commandes. Voir [Nodes](/fr/nodes).

### Des conseils pour les installations sur Raspberry Pi

Version courte : ça fonctionne, mais attendez-vous à des rudiments.

- Utilisez un OS **64 bits** et gardez Node >= 22.
- Préférez l'**installation modifiable (git)** afin que vous puissiez voir les journaux et mettre à jour rapidement.
- Commencez sans channels/skills, puis ajoutez-les un par un.
- Si vous rencontrez des problèmes binaires étranges, c'est généralement un problème de **compatibilité ARM**.

Documentation : [Linux](/fr/platforms/linux), [Install](/fr/install).

### C'est bloqué sur wake up my friend onboarding will not hatch Que faire maintenant

Cet écran dépend de l'accessibilité et de l'authentification du Gateway. Le TUI envoie également
« Wake up, my friend! » automatiquement au premier éclosion. Si vous voyez cette ligne avec **aucune réponse**
et que les jetons restent à 0, l'agent n'a jamais été exécuté.

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

3. Si ça bloque toujours, exécutez :

```bash
openclaw doctor
```

Si le Gateway est distant, assurez-vous que la connexion tunnel/Tailscale est active et que l'interface utilisateur
pointe vers le bon Gateway. Voir [Remote access](/fr/gateway/remote).

### Puis-je migrer ma configuration vers une nouvelle machine Mac mini sans refaire l'onboarding

Oui. Copiez le **répertoire d'état** et le **workspace**, puis exécutez Doctor une fois. Cela
conserve votre bot « exactement le même » (mémoire, historique de session, auth, et état du
channel) tant que vous copiez **les deux** emplacements :

1. Installez OpenClaw sur la nouvelle machine.
2. Copiez `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) depuis l'ancienne machine.
3. Copiez votre workspace (par défaut : `~/.openclaw/workspace`).
4. Exécutez `openclaw doctor` et redémarrez le service Gateway.

Cela préserve la configuration, les profils d'auth, les identifiants WhatsApp, les sessions et la mémoire. Si vous êtes en
mode distant, rappelez-vous que l'hôte de la passerelle possède le magasin de sessions et le workspace.

**Important :** si vous ne faites que commit/push de votre espace de travail sur GitHub, vous sauvegardez
**la mémoire + les fichiers de démarrage**, mais **pas** l'historique des sessions ni l'authentification. Ils se trouvent
sous `~/.openclaw/` (par exemple `~/.openclaw/agents/<agentId>/sessions/`).

Connexes : [Migration](/fr/install/migrating), [Emplacement des fichiers sur le disque](/fr/help/faq#where-does-openclaw-store-its-data),
[Espace de travail de l'agent](/fr/concepts/agent-workspace), [Doctor](/fr/gateway/doctor),
[Mode distant](/fr/gateway/remote).

### Où puis-je voir les nouveautés de la dernière version

Consultez le journal des modifications GitHub :
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

Les entrées les plus récentes sont en haut. Si la section supérieure est marquée **Unreleased**, la section datée suivante
correspond à la dernière version publiée. Les entrées sont regroupées par **Points forts**, **Modifications** et
**Corrections** (ainsi que les docs/autres sections si nécessaire).

### Impossible d'accéder à docs.openclaw.ai (erreur SSL)

Certaines connexions Comcast/Xfinity bloquent incorrectement `docs.openclaw.ai` via la
sécurité avancée Xfinity. Désactivez-la ou mettez `docs.openclaw.ai` sur la liste blanche, puis réessayez. Plus
de détails : [Dépannage](/fr/help/troubleshooting#docsopenclawai-shows-an-ssl-error-comcastxfinity).
S'il vous plaît, aidez-nous à débloquer le site en signalant le problème ici : [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

Si vous ne parvenez toujours pas à atteindre le site, la documentation est disponible en miroir sur GitHub :
[https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

### Différence entre stable et beta

**Stable** et **beta** sont des **dist-tags npm**, pas des lignes de code distinctes :

- `latest` = stable
- `beta` = version précoce pour tests

Nous publions des versions sur **beta**, les testons, et une fois qu'une version est solide, nous la **promouvons
vers `latest`**. C'est pourquoi beta et stable peuvent pointer vers la
**même version**.

Voir ce qui a changé :
[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

### Comment installer la version beta et quelle est la différence entre beta et dev

**Beta** est le dist-tag npm `beta` (peut correspondre à `latest`).
**Dev** est la tête mobile de `main` (git) ; lors de la publication, il utilise le dist-tag npm `dev`.

Ligne de commande unique (macOS/Linux) :

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Installateur Windows (PowerShell) :
[https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

Plus de détails : [Canaux de développement](/fr/install/development-channels) et [Indicateurs de l'installateur](/fr/install/installer).

### Combien de temps prennent généralement l'installation et l'intégration

Guide approximatif :

- **Installation :** 2 à 5 minutes
- **Intégration :** 5 à 15 minutes selon le nombre de canaux/modèles que vous configurez

Si cela bloque, utilisez [Installateur bloqué](/fr/help/faq#installer-stuck-how-do-i-get-more-feedback)
et la boucle de débogage rapide dans [Je suis bloqué](/fr/help/faq#i-am-stuck---fastest-way-to-get-unstuck).

### Comment essayer les dernières fonctionnalités

Deux options :

1. **Canal de développement (git checkout) :**

```bash
openclaw update --channel dev
```

Cela bascule vers la branche `main` et met à jour à partir des sources.

2. **Installation modifiable (à partir du site de l'installateur) :**

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Cela vous donne un dépôt local que vous pouvez modifier, puis mettre à jour via git.

Si vous préférez un clonage propre manuellement, utilisez :

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

Documentation : [Mise à jour](/fr/cli/update), [Canaux de développement](/fr/install/development-channels),
[Installation](/fr/install).

### Installateur bloqué Comment obtenir plus de commentaires

Relancez l'installateur avec **sortie détaillée** :

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

Installation bêta avec mode détaillé :

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

Plus d'options : [Indicateurs de l'installateur](/fr/install/installer).

### L'installation Windows indique que git est introuvable ou qu'openclaw n'est pas reconnu

Deux problèmes courants Windows :

**1) erreur npm spawn git / git non trouvé**

- Installez **Git pour Windows** et assurez-vous que `git` est dans votre PATH.
- Fermez et rouvrez PowerShell, puis relancez l'installateur.

**2) openclaw n'est pas reconnu après l'installation**

- Votre dossier bin global npm n'est pas dans le PATH.
- Vérifiez le chemin :

  ```powershell
  npm config get prefix
  ```

- Ajoutez ce répertoire à votre PATH utilisateur (pas de suffixe `\bin` nécessaire sur Windows ; sur la plupart des systèmes c'est `%AppData%\npm`).
- Fermez et rouvrez PowerShell après avoir mis à jour le PATH.

Si vous souhaitez la configuration Windows la plus fluide, utilisez **WSL2** au lieu de Windows natif.
Documentation : [Windows](/fr/platforms/windows).

### La sortie exec Windows affiche des caractères chinois illisibles, que dois-je faire

Il s'agit généralement d'une inadéquation de la page de codes de la console sur les shells Windows natifs.

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

Redémarrez ensuite la Gateway et réessayez votre commande :

```powershell
openclaw gateway restart
```

Si vous reproduisez toujours ce problème sur la dernière version d'OpenClaw, suivez ou signalez le problème ici :

- [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

### La documentation n'a pas répondu à ma question - comment obtenir une meilleure réponse

Utilisez l'**installation hackable (git)** afin d'avoir le code source et la documentation complets en local, puis demandez
à votre bot (ou Claude/Codex) _depuis ce dossier_ afin qu'il puisse lire le dépôt et répondre précisément.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Plus de détails : [Installer](/fr/install) et [Indicateurs de l'installateur](/fr/install/installer).

### Comment installer OpenClaw sur Linux

Réponse courte : suivez le guide Linux, puis exécutez l'onboarding.

- Chemin rapide Linux + installation du service : [Linux](/fr/platforms/linux).
- Procédure pas à pas complète : [Getting Started](/fr/start/getting-started).
- Installateur + mises à jour : [Install & updates](/fr/install/updating).

### Comment installer OpenClaw sur un VPS

N'importe quel VPS Linux fonctionne. Installez sur le serveur, puis utilisez SSH/Tailscale pour accéder à la Gateway.

Guides : [exe.dev](/fr/install/exe-dev), [Hetzner](/fr/install/hetzner), [Fly.io](/fr/install/fly).
Accès à distance : [Gateway remote](/fr/gateway/remote).

### Où se trouvent les guides d'installation cloudVPS

Nous conservons un **hub d'hébergement** avec les fournisseurs courants. Choisissez-en un et suivez le guide :

- [Hébergement VPS](/fr/vps) (tous les fournisseurs au même endroit)
- [Fly.io](/fr/install/fly)
- [Hetzner](/fr/install/hetzner)
- [exe.dev](/fr/install/exe-dev)

Fonctionnement dans le cloud : la **Gateway s'exécute sur le serveur**, et vous y accédez
depuis votre ordinateur/téléphone via l'interface de contrôle (ou Tailscale/SSH). Votre état + espace de travail
résident sur le serveur, traitez donc l'hôte comme source de vérité et sauvegardez-le.

Vous pouvez coupler des **nœuds** (Mac/iOS/Android/sans tête) à cette Gateway cloud pour accéder
à l'écran/caméra/toile local ou exécuter des commandes sur votre ordinateur portable tout en gardant la
Gateway dans le cloud.

Hub : [Plateformes](/fr/platforms). Accès à distance : [Gateway remote](/fr/gateway/remote).
Nœuds : [Nœuds](/fr/nodes), [CLI des nœuds](/fr/cli/nodes).

### Puis-je demander à OpenClaw de se mettre à jour lui-même

Réponse courte : **possible, non recommandé**. Le flux de mise à jour peut redémarrer le
Gateway (ce qui interrompt la session active), peut nécessiter un nettoyage git, et
peut demander une confirmation. Plus sûr : exécutez les mises à jour depuis un shell en tant qu'opérateur.

Utilisez la CLI :

```bash
openclaw update
openclaw update status
openclaw update --channel stable|beta|dev
openclaw update --tag <dist-tag|version>
openclaw update --no-restart
```

Si vous devez automatiser depuis un agent :

```bash
openclaw update --yes --no-restart
openclaw gateway restart
```

Docs : [Mise à jour](/fr/cli/update), [Mise à jour](/fr/install/updating).

### Que fait réellement l'intégration (onboarding)

`openclaw onboard` est le chemin d'installation recommandé. En **mode local**, il vous guide à travers :

- **Configuration du modèle/auth** (flux provider OAuth/setup-token et clés API pris en charge, plus les options de modèle local telles que LM Studio)
- **Espace de travail** (Workspace) emplacement + fichiers d'amorçage
- Paramètres du **Gateway** (bind/port/auth/tailscale)
- **Fournisseurs** (WhatsApp, Telegram, Discord, Mattermost (plugin), Signal, iMessage)
- **Installation du démon** (LaunchAgent sur macOS ; unité utilisateur systemd sur Linux/WSL2)
- **Contrôles de santé** et sélection des **compétences**

Il avertit également si votre modèle configuré est inconnu ou s'il manque une authentification.

### Ai-je besoin d'un abonnement Claude ou OpenAI pour exécuter ceci

Non. Vous pouvez exécuter OpenClaw avec des **clés API** (Anthropic/OpenAI/autres) ou avec
**des modèles uniquement locaux** afin que vos données restent sur votre appareil. Les abonnements (Claude
Pro/Max ou OpenAI Codex) sont des moyens facultatifs pour authentifier ces fournisseurs.

Si vous choisissez l'authentification par abonnement Anthropic, décidez par vous-même de l'utiliser :
Anthropic a bloqué certaines utilisations d'abonnement en dehors de Claude Code dans le passé.
Le OpenAI OAuth Codex est explicitement pris en charge pour les outils externes comme OpenClaw.

Docs : [Anthropic](/fr/providers/anthropic), [OpenAI](/fr/providers/openai),
[Modèles locaux](/fr/gateway/local-models), [Modèles](/fr/concepts/models).

### Puis-je utiliser l'abonnement Claude Max sans clé API

Oui. Vous pouvez vous authentifier avec un **setup-token**
au lieu d'une clé API. C'est le chemin de l'abonnement.

Les abonnements Claude Pro/Max **n'incluent pas de clé API**, c'est donc le
chemin technique pour les comptes abonnés. Mais c'est votre décision : Anthropic
a bloqué certaines utilisations d'abonnement en dehors de Claude Code dans le passé.
Si vous souhaitez le chemin pris en charge le plus clair et le plus sûr pour la production, utilisez une clé Anthropic API.

### Comment fonctionne l'authentification par setuptoken Anthropic

`claude setup-token` génère une **chaîne de jeton** via le Claude Code CLI (il n'est pas disponible dans la console web). Vous pouvez l'exécuter sur **n'importe quelle machine**. Choisissez **Jeton Anthropic (coller setup-token)** lors de l'onboarding ou collez-le avec `openclaw models auth paste-token --provider anthropic`. Le jeton est stocké en tant que profil d'authentification pour le fournisseur **anthropic** et utilisé comme une clé API (pas d'actualisation automatique). Plus de détails : [OAuth](/fr/concepts/oauth).

### Où puis-je trouver un setuptoken Anthropic

Il n'est **pas** dans la console Anthropic. Le setup-token est généré par le **Claude Code CLI** sur **n'importe quelle machine** :

```bash
claude setup-token
```

Copiez le jeton qu'il affiche, puis choisissez **Jeton Anthropic (coller setup-token)** lors de l'onboarding. Si vous souhaitez l'exécuter sur l'hôte de la passerelle, utilisez `openclaw models auth setup-token --provider anthropic`. Si vous avez exécuté `claude setup-token` ailleurs, collez-le sur l'hôte de la passerelle avec `openclaw models auth paste-token --provider anthropic`. Voir [Anthropic](/fr/providers/anthropic).

### Prenez-vous en charge l'authentification par abonnement Claude (Claude Pro ou Max)

Oui - via **setup-token**. OpenClaw ne réutilise plus les jetons CLI du Claude Code OAuth ; utilisez un setup-token ou une clé Anthropic API. Générez le jeton n'importe où et collez-le sur l'hôte de la passerelle. Voir [Anthropic](/fr/providers/anthropic) et [OAuth](/fr/concepts/oauth).

Important : il s'agit d'une compatibilité technique, et non d'une garantie politique. Anthropic
a bloqué certaines utilisations d'abonnement en dehors de Claude Code par le passé.
Vous devez décider de l'utiliser ou non et vérifier les conditions actuelles de Anthropic.
Pour les charges de travail de production ou multi-utilisateurs, l'authentification par clé Anthropic API est le choix le plus sûr et recommandé.

### Pourquoi vois-je une erreur de limitation de débit HTTP 429 de la part de Anthropic

Cela signifie que votre **quota/limite de débit Anthropic** est épuisé pour la fenêtre actuelle. Si vous
utilisez un **abonnement Claude** (setup-token), attendez que la fenêtre
se réinitialise ou mettez à niveau votre plan. Si vous utilisez une **clé Anthropic API**, vérifiez la console Anthropic
pour l'utilisation/facturation et augmentez les limites si nécessaire.

Si le message est spécifiquement :
`Extra usage is required for long context requests`, la requête essaie d'utiliser
la bêta de contexte 1M de Anthropic (`context1m: true`). Cela ne fonctionne que lorsque vos
identifiants sont éligibles pour la facturation à long contexte (facturation par clé API ou abonnement
avec Extra Usage activé).

Astuce : définissez un **model de secours** afin que OpenClaw puisse continuer à répondre pendant qu'un fournisseur est limité par le taux.
Voir [Modèles](/fr/cli/models), [OAuth](/fr/concepts/oauth) et
[/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/fr/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

### AWS Bedrock est-il pris en charge

Oui - via le fournisseur **Amazon Bedrock (Converse)** de pi-ai avec une **configuration manuelle**. Vous devez fournir les informations d'identification/région AWS sur l'hôte de la passerelle et ajouter une entrée de fournisseur Bedrock dans votre configuration de modèles. Voir [Amazon Bedrock](/fr/providers/bedrock) et [Fournisseurs de modèles](/fr/providers/models). Si vous préférez un flux de clé géré, un proxy compatible OpenAI devant Bedrock reste une option valide.

### Comment fonctionne l'authentification Codex

OpenClaw prend en charge **OpenAI Code (Codex)** via OAuth (connexion ChatGPT). L'intégration peut exécuter le flux OAuth et définira le modèle par défaut sur `openai-codex/gpt-5.4` le cas échéant. Voir [Fournisseurs de modèles](/fr/concepts/model-providers) et [Intégration (CLI)](/fr/start/wizard).

### Prenez-vous en charge l'authentification par abonnement OpenAI Codex OAuth

Oui. OpenClaw prend entièrement en charge **OpenAI Code (Codex) abonnement OAuth**.
OpenAI autorise explicitement l'utilisation de l'abonnement OAuth dans les outils/flux de travail externes
tels que OpenClaw. L'intégration peut exécuter le flux OAuth pour vous.

Voir [OAuth](/fr/concepts/oauth), [Fournisseurs de modèles](/fr/concepts/model-providers) et [Intégration (CLI)](/fr/start/wizard).

### Comment configurer Gemini CLI OAuth

Gemini CLI utilise un **flux d'authentification par plugin**, et non un identifiant client ou un secret dans `openclaw.json`.

Étapes :

1. Activer le plugin : `openclaw plugins enable google`
2. Connexion : `openclaw models auth login --provider google-gemini-cli --set-default`

Cela stocke les jetons OAuth dans les profils d'authentification sur l'hôte de la passerelle. Détails : [Fournisseurs de modèles](/fr/concepts/model-providers).

### Un modèle local convient-il aux discussions décontractées

Généralement non. OpenClaw nécessite un grand contexte + une sécurité forte ; les petites cartes tronquent et fuient. Si vous le devez, exécutez la version **la plus grande** de MiniMax M2.5 que vous pouvez localement (LM Studio) et consultez [/gateway/local-models](/fr/gateway/local-models). Les modèles plus petits/quantifiés augmentent le risque d'injection de prompt - voir [Sécurité](/fr/gateway/security).

### Comment garder le trafic du modèle hébergé dans une région spécifique

Choisissez des points de terminaison épinglés par région. OpenRouter expose des options hébergées aux États-Unis pour MiniMax, Kimi et GLM ; choisissez la variante hébergée aux États-Unis pour garder les données dans la région. Vous pouvez toujours lister Anthropic/OpenAI à côté de ceux-ci en utilisant `models.mode: "merge"` afin que les solutions de repli restent disponibles tout en respectant le fournisseur régional que vous sélectionnez.

### Dois-je acheter un Mac Mini pour l'installer

Non. OpenClaw fonctionne sous macOS ou Linux (Windows via WSL2). Un Mac mini est en option - certaines personnes en achètent un comme hôte toujours actif, mais un petit VPS, un serveur domestique ou une boîte de classe Raspberry Pi fonctionne aussi.

Vous n'avez besoin d'un Mac que pour les outils **uniques à macOS**. Pour iMessage, utilisez [BlueBubbles](/fr/channels/bluebubbles) (recommandé) - le serveur BlueBubbles fonctionne sur n'importe quel Mac, et la Gateway peut fonctionner sous Linux ou ailleurs. Si vous souhaitez d'autres outils uniques à macOS, exécutez la Gateway sur un Mac ou associez un nœud macOS.

Documentation : [BlueBubbles](/fr/channels/bluebubbles), [Nœuds](/fr/nodes), [Mode distant Mac](/fr/platforms/mac/remote).

### Ai-je besoin d'un Mac mini pour la prise en charge de iMessage

Vous avez besoin d'un appareil macOS connecté à Messages. Ce n'est **pas** obligé que ce soit un Mac mini - n'importe quel Mac fonctionne. **Utilisez [BlueBubbles](/fr/channels/bluebubbles)** (recommandé) pour iMessage - le serveur BlueBubbles fonctionne sous macOS, tandis que la Gateway peut fonctionner sous Linux ou ailleurs.

Configurations courantes :

- Exécutez la Gateway sous Linux/VPS, et exécutez le serveur BlueBubbles sur n'importe quel Mac connecté à Messages.
- Exécutez tout sur le Mac si vous souhaitez la configuration mono-machine la plus simple.

Documentation : [BlueBubbles](/fr/channels/bluebubbles), [Nœuds](/fr/nodes),
[Mode distant Mac](/fr/platforms/mac/remote).

### Si j'achète un Mac mini pour exécuter OpenClaw, puis-je le connecter à mon MacBook Pro

Oui. Le **Mac mini peut exécuter la Gateway**, et votre MacBook Pro peut se connecter en tant que **nœud** (appareil compagnon). Les nœuds n'exécutent pas la Gateway - ils fournissent des capacités supplémentaires comme l'écran/caméra/toile et `system.run` sur cet appareil.

Schéma courant :

- Gateway sur le Mac mini (toujours actif).
- Le MacBook Pro exécute l'application macOS ou un hôte de nœud et s'apparie à la Gateway.
- Utilisez `openclaw nodes status` / `openclaw nodes list` pour le voir.

Docs : [Nodes](/fr/nodes), [Nodes CLI](/fr/cli/nodes).

### Puis-je utiliser Bun

Bun n'est **pas recommandé**. Nous rencontrons des bugs d'exécution, notamment avec WhatsApp et Telegram.
Utilisez **Node** pour des passerelles stables.

Si vous souhaitez tout de même expérimenter avec Bun, faites-le sur une passerelle non-production
sans WhatsApp/Telegram.

### Telegram que faut-il mettre dans allowFrom

`channels.telegram.allowFrom` est **l'ID utilisateur Telegram de l'expéditeur humain** (numérique). Ce n'est pas le nom d'utilisateur du bot.

L'intégration accepte l'entrée `@username` et la résout en un ID numérique, mais l'autorisation OpenClaw n'utilise que les ID numériques.

Plus sûr (pas de bot tiers) :

- Envoyez un DM à votre bot, puis exécutez `openclaw logs --follow` et lisez `from.id`.

Bot API officiel :

- Envoyez un DM à votre bot, puis appelez `https://api.telegram.org/bot<bot_token>/getUpdates` et lisez `message.from.id`.

Tiers (moins privé) :

- Envoyez un DM à `@userinfobot` ou `@getidsbot`.

Voir [/channels/telegram](/fr/channels/telegram#access-control-dms--groups).

### Plusieurs personnes peuvent-elles utiliser un même numéro WhatsApp avec différentes instances OpenClaw

Oui, via le **routage multi-agent**. Liez le **DM** WhatsApp de chaque expéditeur (pair `kind: "direct"`, expéditeur E.164 comme `+15551234567`) à un `agentId` différent, afin que chaque personne ait son propre espace de travail et son propre magasin de session. Les réponses proviennent toujours du **même compte WhatsApp**, et le contrôle d'accès DM (`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`) est global par compte WhatsApp. Voir [Multi-Agent Routing](/fr/concepts/multi-agent) et [WhatsApp](/fr/channels/whatsapp).

### Puis-je exécuter un agent de chat rapide et un agent Opus pour le codage

Oui. Utilisez le routage multi-agent : donnez à chaque agent son propre modèle par défaut, puis liez les routes entrantes (compte fournisseur ou pairs spécifiques) à chaque agent. Un exemple de configuration se trouve dans [Multi-Agent Routing](/fr/concepts/multi-agent). Voir aussi [Models](/fr/concepts/models) et [Configuration](/fr/gateway/configuration).

### Homebrew fonctionne-t-il sur Linux

Oui. Homebrew prend en charge Linux (Linuxbrew). Configuration rapide :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

Si vous exécutez OpenClaw via systemd, assurez-vous que le PATH du service inclut `/home/linuxbrew/.linuxbrew/bin` (ou votre préfixe brew) afin que les outils installés par `brew` soient résolus dans les shells non-login.
Les versions récentes ajoutent également au début les répertoires bin utilisateur courants sur les services systemd Linux (par exemple `~/.local/bin`, `~/.npm-global/bin`, `~/.local/share/pnpm`, `~/.bun/bin`) et honorent `PNPM_HOME`, `NPM_CONFIG_PREFIX`, `BUN_INSTALL`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `NVM_DIR` et `FNM_DIR` lorsqu'ils sont définis.

### Différence entre l'installation hackable via git et l'installation npm

- **Installation hackable (git) :** extraction complète du code source, modifiable, idéale pour les contributeurs.
  Vous exécutez les builds localement et pouvez appliquer des correctifs au code/docs.
- **Installation npm :** installation globale de la CLI, sans dépôt, idéale pour « juste lancer ».
  Les mises à jour proviennent des dist-tags npm.

Docs : [Getting started](/fr/start/getting-started), [Updating](/fr/install/updating).

### Puis-je passer d'une installation npm à git plus tard

Oui. Installez l'autre variante, puis exécutez Doctor pour que le service gateway pointe vers le nouveau point d'entrée.
Cela **ne supprime pas vos données** - cela modifie uniquement l'installation du code OpenClaw. Votre état
(`~/.openclaw`) et votre espace de travail (`~/.openclaw/workspace`) restent intacts.

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

Doctor détecte une inadéquation du point d'entrée du service gateway et propose de réécrire la configuration du service pour correspondre à l'installation actuelle (utilisez `--repair` dans l'automatisation).

Conseils de sauvegarde : voir [Backup strategy](/fr/help/faq#recommended-backup-strategy).

### Dois-je exécuter le Gateway sur mon ordinateur portable ou un VPS

Réponse courte : **si vous voulez une fiabilité 24/7, utilisez un VPS**. Si vous voulez le
moins de friction possible et que vous acceptez les mises en veille/redémarrages, exécutez-le localement.

**Ordinateur portable (Gateway local)**

- **Avantages :** pas de coût de serveur, accès direct aux fichiers locaux, fenêtre de navigateur en direct.
- **Inconvénients :** mise en veille/déconnexions réseau = déconnexions, les mises à jour/redémarrages de l'OS interrompent, doit rester allumé.

**VPS / cloud**

- **Avantages :** toujours en ligne, réseau stable, pas de problèmes de mise en veille de l'ordinateur portable, plus facile à maintenir en fonctionnement.
- **Inconvénients :** souvent exécuté sans interface graphique ( utilise des captures d'écran ), accès aux fichiers à distance uniquement, vous devez utiliser SSH pour les mises à jour.

**Note spécifique à OpenClaw :** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord fonctionnent tous correctement depuis un VPS. Le seul compromis réel est le **navigateur sans interface graphique** par rapport à une fenêtre visible. Voir [Navigateur](/fr/tools/browser).

**Par défaut recommandé :** VPS si vous avez déjà eu des déconnexions de la passerelle. L'installation locale est idéale lorsque vous utilisez activement le Mac et que vous souhaitez un accès aux fichiers locaux ou une automation de l'interface utilisateur avec un navigateur visible.

### Quelle est l'importance d'exécuter OpenClaw sur une machine dédiée

Pas obligatoire, mais **recommandé pour la fiabilité et l'isolement**.

- **Hôte dédié (VPS/Mac mini/Pi) :** toujours allumé, moins d'interruptions de mise en veille/redémarrage, permissions plus propres, plus facile à maintenir en fonctionnement.
- **Ordinateur portable/de bureau partagé :** totalement adapté pour les tests et l'utilisation active, mais attendez-vous à des pauses lorsque la machine se met en veille ou se met à jour.

Si vous voulez le meilleur des deux mondes, gardez la Gateway sur un hôte dédié et associez votre ordinateur portable en tant que **nœud** pour les outils locaux d'écran/caméra/exécution. Voir [Nœuds](/fr/nodes).
Pour les conseils de sécurité, lisez [Sécurité](/fr/gateway/security).

### Quelles sont les configurations minimales du VPS et les systèmes d'exploitation recommandés

OpenClaw est léger. Pour une Gateway de base + un channel de chat :

- **Minimum absolu :** 1 vCPU, 1 Go de RAM, ~500 Mo d'espace disque.
- **Recommandé :** 1-2 vCPU, 2 Go de RAM ou plus pour la marge de manœuvre (journaux, médias, plusieurs channels). Les outils de nœud et l'automation du navigateur peuvent être gourmands en ressources.

OS : utilisez **Ubuntu LTS** (ou n'importe quel Debian/Ubuntu moderne). Le chemin d'installation Linux est le mieux testé là-bas.

Docs : [Linux](/fr/platforms/linux), [Hébergement VPS](/fr/vps).

### Puis-je exécuter OpenClaw dans une machine virtuelle et quelles sont les configurations requises

Oui. Traitez une machine virtuelle de la même manière qu'un VPS : elle doit être toujours allumée, accessible, et disposer de suffisamment
 de RAM pour la Gateway et tous les channels que vous activez.

Directives de base :

- **Minimum absolu :** 1 vCPU, 1 Go de RAM.
- **Recommandé :** 2 Go de RAM ou plus si vous exécutez plusieurs channels, l'automation du navigateur, ou des outils médias.
- **OS :** Ubuntu LTS ou un autre Debian/Ubuntu moderne.

Si vous êtes sous Windows, **WSL2 est la configuration de style VM la plus simple** et offre la meilleure compatibilité des outils.
Voir [Windows](/fr/platforms/windows), [Hébergement VPS](/fr/vps).
Si vous exécutez macOS dans une VM, voir [VM macOS](/fr/install/macos-vm).

## Qu'est-ce qu'OpenClaw ?

### Qu'est-ce qu'OpenClaw en un paragraphe

OpenClaw est un assistant IA personnel que vous exécutez sur vos propres appareils. Il répond sur les surfaces de messagerie que vous utilisez déjà (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) et peut également effectuer des appels vocaux + un Canvas en direct sur les plateformes prises en charge. Le **Gateway** est le plan de contrôle toujours actif ; l'assistant est le produit.

### Proposition de valeur

OpenClaw n'est pas « juste un wrapper Claude ». C'est un **plan de contrôle local优先** qui vous permet d'exécuter un assistant capable sur **votre propre matériel**, accessible depuis les applications de chat que vous utilisez déjà, avec des sessions avec état, de la mémoire et des outils - sans céder le contrôle de vos flux de travail à un SaaS hébergé.

Points forts :

- **Vos appareils, vos données :** exécutez le Gateway où vous le souhaitez (Mac, Linux, VPS) et gardez l'historique de l'espace de travail + des sessions en local.
- **Vrais canaux, pas une sandbox web :** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc.,
  plus la voix mobile et Canvas sur les plateformes prises en charge.
- **Agnostique au modèle :** utilisez Anthropic, OpenAI, MiniMax, OpenRouter, etc., avec un routage par agent
  et un basculement.
- **Option locale uniquement :** exécutez des modèles locaux pour que **toutes les données puissent rester sur votre appareil** si vous le souhaitez.
- **Routage multi-agent :** agents séparés par canal, compte ou tâche, chacun avec son propre
  espace de travail et ses paramètres par défaut.
- **Open source et hackable :** inspectez, étendez et auto-hébergez sans dépendance fournisseur.

Documentation : [Gateway](/fr/gateway), [Canaux](/fr/channels), [Multi-agent](/fr/concepts/multi-agent),
[Mémoire](/fr/concepts/memory).

### Je viens de le configurer, que dois-je faire en premier

Bons premiers projets :

- Créer un site web (WordPress, Shopify, ou un site statique simple).
- Prototyper une application mobile (plan, écrans, plan API).
- Organiser les fichiers et dossiers (nettoyage, nommage, étiquetage).
- Connecter Gmail et automatiser les résumés ou les relances.

Il peut gérer des tâches importantes, mais fonctionne mieux lorsque vous les divisez en phases et utilisez des sous-agents pour le travail parallèle.

### Quels sont les cinq cas d'utilisation quotidiens les plus courants pour OpenClaw

Les gains quotidiens ressemblent généralement à ceci :

- **Briefings personnels :** résumés de la boîte de réception, du calendrier et des actualités qui vous intéressent.
- **Recherche et rédaction :** recherche rapide, résumés et premières versions de courriels ou de documents.
- **Rappels et suivis :** relances et listes de contrôle basées sur cron ou heartbeat.
- **Automatisation du navigateur :** remplissage de formulaires, collecte de données et répétition de tâches web.
- **Coordination multi-appareils :** envoyez une tâche depuis votre téléphone, laissez le Gateway l'exécuter sur un serveur et recevez le résultat dans le chat.

### OpenClaw peut-il aider avec la génération de leads, la prospection, les publicités et les blogs pour un SaaS

Oui pour la **recherche, la qualification et la rédaction**. Il peut scanner des sites, constituer des listes restreintes,
résumer des prospects et rédiger des versions de prospection ou de publicité.

Pour les **campagnes de prospection ou de publicité**, gardez un humain dans la boucle. Évitez le spam, respectez les lois locales et
les politiques des plateformes, et vérifiez tout avant l'envoi. Le modèle le plus sûr est de laisser
OpenClaw rédiger et vous approuver.

Docs : [Sécurité](/fr/gateway/security).

### Quels sont les avantages par rapport à Claude Code pour le développement web

OpenClaw est un **assistant personnel** et une couche de coordination, et non un remplacement d'IDE. Utilisez
Claude Code ou Codex pour la boucle de codage directe la plus rapide dans un dépôt. Utilisez OpenClaw lorsque vous
souhaitez une mémoire durable, un accès multi-appareils et l'orchestration d'outils.

Avantages :

- **Mémoire persistante + espace de travail** entre les sessions
- **Accès multi-plateforme** (WhatsApp, Telegram, TUI, WebChat)
- **Orchestration d'outils** (navigateur, fichiers, planification, hooks)
- **Gateway toujours actif** (exécutez sur un VPS, interagissez de n'importe où)
- **Nœuds** pour le navigateur/écran/caméra/exécution local

Vitrine : [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

## Compétences et automatisation

### Comment personnaliser les compétences sans laisser le dépôt dans un état sale

Utilisez les substitutions gérées au lieu de modifier la copie du dépôt. Placez vos modifications dans `~/.openclaw/skills/<name>/SKILL.md` (ou ajoutez un dossier via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json`). La priorité est `<workspace>/skills` > `~/.openclaw/skills` > bundle, donc les substitutions gérées l'emportent sans toucher à git. Seules les modifications dignes d'intégration en amont devraient résider dans le dépôt et être envoyées sous forme de PR.

### Puis-je charger des compétences depuis un dossier personnalisé

Oui. Ajoutez des répertoires supplémentaires via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json` (la priorité la plus basse). La priorité par défaut reste : `<workspace>/skills` → `~/.openclaw/skills` → groupé → `skills.load.extraDirs`. `clawhub` installe dans `./skills` par défaut, qu'OpenClaw considère comme `<workspace>/skills`.

### Comment puis-je utiliser différents modèles pour différentes tâches

Aujourd'hui, les modèles pris en charge sont :

- **Tâches Cron** : les tâches isolées peuvent définir une priorité `model` par tâche.
- **Sous-agents** : acheminez les tâches vers des agents séparés avec des modèles par défaut différents.
- **Commutation à la demande** : utilisez `/model` pour changer le modèle de la session actuelle à tout moment.

Voir [Tâches Cron](/fr/automation/cron-jobs), [Routage Multi-Agent](/fr/concepts/multi-agent) et [Commandes Slash](/fr/tools/slash-commands).

### Le bot se fige pendant l'exécution de travaux lourds Comment décharger cela

Utilisez des **sous-agents** pour les tâches longues ou parallèles. Les sous-agents s'exécutent dans leur propre session,
retournent un résumé et gardent votre chat principal réactif.

Demandez à votre bot de « lancer un sous-agent pour cette tâche » ou utilisez `/subagents`.
Utilisez `/status` dans le chat pour voir ce que le Gateway est en train de faire (et s'il est occupé).

Astuce concernant les jetons : les tâches longues et les sous-agents consomment tous deux des jetons. Si le coût est un souci, définissez un
modèle moins cher pour les sous-agents via `agents.defaults.subagents.model`.

Documentation : [Sous-agents](/fr/tools/subagents).

### Comment fonctionnent les sessions de sous-agents liées aux fils sur Discord

Utilisez les liaisons de fils. Vous pouvez lier un fil Discord à une cible de sous-agent ou de session afin que les messages de suivi dans ce fil restent sur cette session liée.

Flux de base :

- Générez avec `sessions_spawn` en utilisant `thread: true` (et `mode: "session"` en option pour un suivi persistant).
- Ou liez manuellement avec `/focus <target>`.
- Utilisez `/agents` pour inspecter l'état de la liaison.
- Utilisez `/session idle <duration|off>` et `/session max-age <duration|off>` pour contrôler le défocus automatique.
- Utilisez `/unfocus` pour détacher le fil.

Configuration requise :

- Global defaults: `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
- Discord overrides: `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
- Auto-bind on spawn: set `channels.discord.threadBindings.spawnSubagentSessions: true`.

Docs: [Sub-agents](/fr/tools/subagents), [Discord](/fr/channels/discord), [Configuration Reference](/fr/gateway/configuration-reference), [Slash commands](/fr/tools/slash-commands).

### Cron or reminders do not fire What should I check

Cron runs inside the Gateway process. If the Gateway is not running continuously,
scheduled jobs will not run.

Checklist:

- Confirm cron is enabled (`cron.enabled`) and `OPENCLAW_SKIP_CRON` is not set.
- Check the Gateway is running 24/7 (no sleep/restarts).
- Verify timezone settings for the job (`--tz` vs host timezone).

Debug:

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

Docs: [Cron jobs](/fr/automation/cron-jobs), [Cron vs Heartbeat](/fr/automation/cron-vs-heartbeat).

### How do I install skills on Linux

Use **ClawHub** (CLI) or drop skills into your workspace. The macOS Skills UI isn't available on Linux.
Browse skills at [https://clawhub.com](https://clawhub.com).

Install the ClawHub CLI (pick one package manager):

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### Can OpenClaw run tasks on a schedule or continuously in the background

Yes. Use the Gateway scheduler:

- **Cron jobs** for scheduled or recurring tasks (persist across restarts).
- **Heartbeat** for "main session" periodic checks.
- **Isolated jobs** for autonomous agents that post summaries or deliver to chats.

Docs: [Cron jobs](/fr/automation/cron-jobs), [Cron vs Heartbeat](/fr/automation/cron-vs-heartbeat),
[Heartbeat](/fr/gateway/heartbeat).

### Can I run Apple macOS-only skills from Linux?

Not directly. macOS skills are gated by `metadata.openclaw.os` plus required binaries, and skills only appear in the system prompt when they are eligible on the **Gateway host**. On Linux, `darwin`-only skills (like `apple-notes`, `apple-reminders`, `things-mac`) will not load unless you override the gating.

Vous avez trois modèles pris en charge :

**Option A - exécuter la Gateway sur un Mac (le plus simple).**
Exécutez la Gateway là où se trouvent les binaires macOS, puis connectez-vous depuis Linux en [mode distant](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere) ou via Tailscale. Les compétences se chargent normalement car l'hôte de la Gateway est macOS.

**Option B - utiliser un nœud macOS (pas de SSH).**
Exécutez la Gateway sur Linux, associez un nœud macOS (application de la barre de menus) et définissez **Exécuter les commandes du nœud** sur « Toujours demander » ou « Toujours autoriser » sur le Mac. OpenClaw peut traiter les compétences exclusivement macOS comme éligibles lorsque les binaires requis existent sur le nœud. L'agent exécute ces compétences via l'outil `nodes`. Si vous choisissez « Toujours demander », approuver « Toujours autoriser » dans l'invite ajoute cette commande à la liste d'autorisation.

**Option C - proxier les binaires macOS via SSH (avancé).**
Conservez la Gateway sur Linux, mais faites en sorte que les binaires CLI requis résolvent vers des wrappers SSH qui s'exécutent sur un Mac. Remplacez ensuite la configuration de la compétence pour autoriser Linux afin qu'elle reste éligible.

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

Non intégrée pour le moment.

Options :

- **Compétence / plugin personnalisé :** le meilleur choix pour un accès fiable à la API (Notion et HeyGen ont tous deux des API).
- **Automatisation du navigateur :** fonctionne sans code mais est plus lent et plus fragile.

Si vous souhaitez conserver le contexte par client (flux de travail d'agence), un modèle simple consiste à :

- Une page Notion par client (contexte + préférences + travail en cours).
- Demander à l'agent de récupérer cette page au début d'une session.

Si vous souhaitez une intégration native, ouvrez une demande de fonctionnalité ou créez une compétence
ciblant ces API.

Installer les compétences :

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub s'installe dans `./skills` sous votre répertoire actuel (ou revient à votre espace de travail OpenClaw configuré) ; OpenClaw le considère comme `<workspace>/skills` lors de la prochaine session. Pour des compétences partagées entre les agents, placez-les dans `~/.openclaw/skills/<name>/SKILL.md`. Certaines compétences s'attendent à des binaires installés via Homebrew ; sur Linux, cela signifie Linuxbrew (voir l'entrée FAQ Homebrew Linux ci-dessus). Voir [Skills](/fr/tools/skills) et [ClawHub](/fr/tools/clawhub).

### Comment utiliser mon Chrome existant déjà connecté avec OpenClaw

Utilisez le profil de navigateur intégré `user`, qui se connecte via Chrome DevTools MCP :

```bash
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot
```

Si vous voulez un nom personnalisé, créez un profil MCP explicite :

```bash
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser --browser-profile chrome-live tabs
```

Ce chemin est local à l'hôte. Si la Gateway s'exécute ailleurs, exécutez soit un nœud hôte sur la machine du navigateur, soit utilisez le CDP distant à la place.

## Sandboxing et mémoire

### Existe-t-il une documentation dédiée au sandboxing

Oui. Voir [Sandboxing](/fr/gateway/sandboxing). Pour une configuration spécifique à Docker (passerelle complète dans Docker ou images sandbox), voir [Docker](/fr/install/docker).

### Docker semble limité. Comment activer toutes les fonctionnalités

L'image par défaut privilégie la sécurité et s'exécute en tant qu'utilisateur `node`, elle n'inclut donc pas
les packages système, Homebrew, ou les navigateurs groupés. Pour une configuration plus complète :

- Persistez `/home/node` avec `OPENCLAW_HOME_VOLUME` pour que les caches survivent.
- Intégrez les dépendances système dans l'image avec `OPENCLAW_DOCKER_APT_PACKAGES`.
- Installez les navigateurs Playwright via la CLI groupée :
  `node /app/node_modules/playwright-core/cli.js install chromium`
- Définissez `PLAYWRIGHT_BROWSERS_PATH` et assurez-vous que le chemin est persisté.

Docs : [Docker](/fr/install/docker), [Browser](/fr/tools/browser).

**Puis-je garder les DMs personnels mais rendre les groupes publics sandboxés avec un agent**

Oui - si votre trafic privé est constitué de **DMs** et votre trafic public de **groupes**.

Utilisez `agents.defaults.sandbox.mode: "non-main"` afin que les sessions de groupe/canal (clés non principales) s'exécutent dans Docker, tandis que la session DM principale reste sur l'hôte. Restreignez ensuite les outils disponibles dans les sessions sandbox via `tools.sandbox.tools`.

Procédure pas à pas de la configuration + exemple de configuration : [Groups: personal DMs + public groups](/fr/channels/groups#pattern-personal-dms-public-groups-single-agent)

Référence de la configuration clé : [Gateway configuration](/fr/gateway/configuration#agentsdefaultssandbox)

### Comment monter un dossier hôte dans le sandbox

Définissez `agents.defaults.sandbox.docker.binds` sur `["host:path:mode"]` (par exemple, `"/home/user/src:/src:ro"`). Les liaisons globales + par agent fusionnent ; les liaisons par agent sont ignorées lorsque `scope: "shared"`. Utilisez `:ro` pour tout ce qui est sensible et rappelez-vous que les liaisons contournent les barrières du système de fichiers du bac à sable. Voir [Sandboxing](/fr/gateway/sandboxing#custom-bind-mounts) et [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) pour des exemples et des notes de sécurité.

### Comment fonctionne la mémoire

La mémoire OpenClaw se compose simplement de fichiers Markdown dans l'espace de travail de l'agent :

- Notes quotidiennes dans `memory/YYYY-MM-DD.md`
- Notes à long terme organisées dans `MEMORY.md` (sessions principales/privées uniquement)

OpenClaw exécute également un **vidage de mémoire silencieux pré-compactage** pour rappeler au modèle
d'écrire des notes durables avant la compactage automatique. Cela ne s'exécute que lorsque l'espace de travail
est accessible en écriture (les bacs à sable en lecture seule l'ignorent). Voir [Memory](/fr/concepts/memory).

### La mémoire continue à oublier des choses. Comment faire pour qu'elles restent ?

Demandez au bot **d'écrire le fait en mémoire**. Les notes à long terme appartiennent à `MEMORY.md`,
le contexte à court terme va dans `memory/YYYY-MM-DD.md`.

C'est encore un domaine que nous améliorons. Il aide de rappeler au modèle de stocker des souvenirs ;
il saura quoi faire. S'il continue à oublier, vérifiez que le Gateway utilise le même
espace de travail à chaque exécution.

Docs : [Memory](/fr/concepts/memory), [Agent workspace](/fr/concepts/agent-workspace).

### La recherche sémantique dans la mémoire nécessite-t-elle une clé OpenAI API ?

Seulement si vous utilisez les **embeddings OpenAI**. Codex OAuth couvre la chat/completions et
ne **donne pas** accès aux embeddings, donc **se connecter avec Codex (OAuth ou la
connexion Codex CLI)** n'aide pas pour la recherche sémantique dans la mémoire. Les embeddings OpenAI
nécessitent toujours une vraie clé API (`OPENAI_API_KEY` ou `models.providers.openai.apiKey`).

Si vous ne définissez pas explicitement un provider, OpenClaw sélectionne automatiquement un provider lorsqu'il
peut résoudre une clé API (profils d'authentification, `models.providers.*.apiKey`, ou env vars).
Il préfère OpenAI si une clé OpenAI est résolue, sinon Gemini si une clé Gemini
est résolue, puis Voyage, puis Mistral. Si aucune clé distante n'est disponible, la recherche
de mémoire reste désactivée jusqu'à ce que vous la configuriez. Si vous avez un chemin de modèle local
configuré et présent, OpenClaw
préfère `local`. Ollama est pris en charge lorsque vous définissez explicitement
`memorySearch.provider = "ollama"`.

Si vous préférez rester en local, définissez `memorySearch.provider = "local"` (et facultativement
`memorySearch.fallback = "none"`). Si vous souhaitez des intégrations Gemini, définissez
`memorySearch.provider = "gemini"` et fournissez `GEMINI_API_KEY` (ou
`memorySearch.remote.apiKey`). Nous prenons en charge les modèles d'intégration **OpenAI, Gemini, Voyage, Mistral, Ollama ou local**
- voir [Mémoire](/fr/concepts/memory) pour les détails de configuration.

### La mémoire persiste-t-elle pour toujours ? Quelles sont les limites ?

Les fichiers de mémoire résident sur le disque et persistent jusqu'à ce que vous les supprimiez. La limite est votre
stockage, pas le modèle. Le **contexte de session** est toujours limité par la fenêtre de
contexte du modèle, de sorte que les longues conversations peuvent être compactées ou tronquées. C'est pourquoi
la recherche de mémoire existe - elle ne récupère que les parties pertinentes dans le contexte.

Docs : [Mémoire](/fr/concepts/memory), [Contexte](/fr/concepts/context).

## Emplacement des éléments sur le disque

### Toutes les données utilisées avec OpenClaw sont-elles enregistrées localement

Non - **l'état de OpenClaw est local**, mais **les services externes voient toujours ce que vous leur envoyez**.

- **Local par défaut :** les sessions, les fichiers de mémoire, la configuration et l'espace de travail résident sur l'hôte du Gateway
  (`~/.openclaw` + votre répertoire d'espace de travail).
- **Distant par nécessité :** les messages que vous envoyez aux fournisseurs de modèles (Anthropic/OpenAI/etc.) vont vers
  leurs API, et les plateformes de chat (WhatsApp/Telegram/Slack/etc.) stockent les données des messages sur leurs
  serveurs.
- **Vous contrôlez l'empreinte :** l'utilisation de modèles locaux garde les invites sur votre machine, mais le trafic
  du canal passe toujours par les serveurs de ce canal.

Connexes : [Espace de travail de l'agent](/fr/concepts/agent-workspace), [Mémoire](/fr/concepts/memory).

### Où OpenClaw stocke-t-il ses données

Tout se trouve sous `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) :

| Chemin                                                            | Objet                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `$OPENCLAW_STATE_DIR/openclaw.json`                             | Config principale (JSON5)                                                |
| `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | Importation héritée OAuth (copiée dans les profils d'authentification lors de la première utilisation)       |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Profils d'authentification (OAuth, clés API et `keyRef`/`tokenRef` facultatifs)  |
| `$OPENCLAW_STATE_DIR/secrets.json`                              | Payload secret stocké dans un fichier facultatif pour les fournisseurs SecretRef `file` |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Fichier de compatibilité hérité (entrées `api_key` statiques nettoyées)      |
| `$OPENCLAW_STATE_DIR/credentials/`                              | État du fournisseur (ex. `whatsapp/<accountId>/creds.json`)            |
| `$OPENCLAW_STATE_DIR/agents/`                                   | État par agent (agentDir + sessions)                              |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historique des conversations & état (par agent)                           |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Métadonnées de session (par agent)                                       |

Chemin d'agent unique hérité : `~/.openclaw/agent/*` (migré par `openclaw doctor`).

Votre **espace de travail** (AGENTS.md, fichiers de mémoire, compétences, etc.) est séparé et configuré via `agents.defaults.workspace` (par défaut : `~/.openclaw/workspace`).

### Où doivent se trouver AGENTSmd SOULmd USERmd MEMORYmd

Ces fichiers résident dans l'**espace de travail de l'agent**, et non dans `~/.openclaw`.

- **Espace de travail (par agent)** : `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
  `MEMORY.md` (ou repli hérité `memory.md` lorsque `MEMORY.md` est absent),
  `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` en option.
- **Répertoire d'état (`~/.openclaw`)** : configuration, identifiants, profils d'authentification, sessions, journaux,
  et compétences partagées (`~/.openclaw/skills`).

L'espace de travail par défaut est `~/.openclaw/workspace`, configurable via :

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

Si le bot "oublie" après un redémarrage, vérifiez que le Gateway utilise le même
espace de travail à chaque lancement (et rappelez-vous : le mode distant utilise l'espace de travail
**de l'hôte de la passerelle**, et non celui de votre ordinateur portable local).

Conseil : si vous souhaitez un comportement ou une préférence durable, demandez au bot de **l'écrire dans
AGENTS.md ou MEMORY.md** plutôt que de vous fier à l'historique des discussions.

Voir [Espace de travail de l'agent](/fr/concepts/agent-workspace) et [Mémoire](/fr/concepts/memory).

### Stratégie de sauvegarde recommandée

Placez votre **espace de travail de l'agent** dans un dépôt git **privé** et sauvegardez-le quelque part
de manière privée (par exemple privé GitHub). Cela capture la mémoire + les fichiers
AGENTS/SOUL/USER, et vous permet de restaurer l'"esprit" de l'assistant plus tard.

Ne **committez** rien sous `~/.openclaw` (identifiants, sessions, jetons ou charges utiles de secrets chiffrés).
Si vous avez besoin d'une restauration complète, sauvegardez l'espace de travail et le répertoire d'état
séparément (voir la question sur la migration ci-dessus).

Documentation : [Espace de travail de l'agent](/fr/concepts/agent-workspace).

### Comment désinstaller complètement OpenClaw

Voir le guide dédié : [Désinstaller](/fr/install/uninstall).

### Les agents peuvent-ils travailler en dehors de l'espace de travail ?

Oui. L'espace de travail est le **cwd par défaut** et l'ancre de mémoire, pas un bac à sable strict.
Les chemins relatifs sont résolus à l'intérieur de l'espace de travail, mais les chemins absolus peuvent accéder à d'autres
emplacements de l'hôte sauf si le sandboxing est activé. Si vous avez besoin d'isolement, utilisez
[`agents.defaults.sandbox`](/fr/gateway/sandboxing) ou les paramètres de bac à sable par agent. Si vous
voulez qu'un dépôt soit le répertoire de travail par défaut, pointez le `workspace` de cet agent
vers la racine du dépôt. Le dépôt OpenClaw est simplement du code source ; gardez l'espace de travail
séparé sauf si vous voulez intentionnellement que l'agent travaille à l'intérieur.

Exemple (dépôt en tant que répertoire de travail par défaut) :

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo",
    },
  },
}
```

### Je suis en mode distant, où se trouve le magasin de sessions ?

L'état de la session appartient à l'**hôte de la passerelle**. Si vous êtes en mode distant, le magasin de sessions qui vous concerne est sur la machine distante, et non sur votre ordinateur portable local. Voir [Session management](/fr/concepts/session).

## Bases de la configuration

### Quel est le format de la configuration ? Où se trouve-t-elle ?

OpenClaw lit une configuration optionnelle **JSON5** depuis `$OPENCLAW_CONFIG_PATH` (par défaut : `~/.openclaw/openclaw.json`) :

```
$OPENCLAW_CONFIG_PATH
```

Si le fichier est manquant, il utilise des paramètres par défaut assez sûrs (y compris un espace de travail par défaut de `~/.openclaw/workspace`).

### J'ai défini gatewaybind sur lan ou tailnet et maintenant rien n'écoute, l'interface indique non autorisé

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
- Les chemins d'appel locaux peuvent utiliser `gateway.remote.*` comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue de manière fermée (aucun masquage de repli distant).
- L'interface de contrôle s'authentifie via `connect.params.auth.token` (stocké dans les paramètres de l'application/interface utilisateur). Évitez de mettre des jetons dans les URL.

### Pourquoi ai-je besoin d'un jeton sur localhost maintenant

OpenClaw applique l'authentification par jeton par défaut, y compris pour la boucle locale. Si aucun jeton n'est configuré, le démarrage de la passerelle en génère automatiquement un et l'enregistre dans `gateway.auth.token`, donc **les clients WS locaux doivent s'authentifier**. Cela empêche d'autres processus locaux d'appeler la Gateway.

Si vous **vraiment** voulez une boucle locale ouverte, définissez `gateway.auth.mode: "none"` explicitement dans votre configuration. Le médecin peut générer un jeton pour vous à tout moment : `openclaw doctor --generate-gateway-token`.

### Dois-je redémarrer après avoir modifié la configuration

Le Gateway surveille la configuration et prend en charge le rechargement à chaud :

- `gateway.reload.mode: "hybrid"` (par défaut) : applique à chaud les modifications sûres, redémarre pour les critiques
- `hot`, `restart`, `off` sont également pris en charge

### Comment désactiver les slogans amusants de la CLI

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

- `off` : masque le texte de la devise mais conserve la ligne de titre/version de la bannière.
- `default` : utilise `All your chats, one OpenClaw.` à chaque fois.
- `random` : rotation des devises amusantes/saisonnières (comportement par défaut).
- Si vous ne voulez aucune bannière du tout, définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

### Comment activer la recherche Web et la récupération Web

`web_fetch` fonctionne sans clé d'API. `web_search` nécessite une clé pour votre
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

La configuration de recherche web spécifique au fournisseur se trouve désormais sous `plugins.entries.<plugin>.config.webSearch.*`.
Les chemins de fournisseur hérités `tools.web.search.*` se chargent encore temporairement pour la compatibilité, mais ils ne doivent pas être utilisés pour les nouvelles configurations.

Notes :

- Si vous utilisez des listes autorisées, ajoutez `web_search`/`web_fetch` ou `group:web`.
- `web_fetch` est activé par défaut (sauf s'il est explicitement désactivé).
- Les démons lisent les variables d'environnement à partir de `~/.openclaw/.env` (ou de l'environnement du service).

Documentation : [Outils web](/fr/tools/web).

### Comment exécuter une passerelle centrale avec des workers spécialisés sur plusieurs appareils

Le modèle courant est **une passerelle** (ex. Gateway) plus des **nœuds** et des **agents** :

- **Passerelle (centrale) :** possède les canaux (Gateway/Signal), le routage et les sessions.
- **Nœuds (appareils) :** les Mac/iOS/Android se connectent en tant que périphériques et exposent des outils locaux (`system.run`, `canvas`, `camera`).
- **Agents (workers) :** cerveaux/espaces de travail distincts pour des rôles spécifiques (ex. "ops Hetzner", "Données personnelles").
- **Sous-agents :** génèrent des tâches en arrière-plan à partir d'un agent principal lorsque vous souhaitez du parallélisme.
- **TUI :** se connecte au Gateway et permet de changer d'agent/session.

Documentation : [Nodes](/fr/nodes), [Remote access](/fr/gateway/remote), [Multi-Agent Routing](/fr/concepts/multi-agent), [Sub-agents](/fr/tools/subagents), [TUI](/fr/web/tui).

### Le navigateur OpenClaw peut-il fonctionner en mode headless

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

La valeur par défaut est `false` (avec interface). Le mode headless est plus susceptible de déclencher des détections anti-bot sur certains sites. Voir [Browser](/fr/tools/browser).

Le mode headless utilise le **même moteur Chromium** et fonctionne pour la plupart des automatisations (formulaires, clics, scraping, connexions). Les principales différences :

- Aucune fenêtre de navigateur visible (utilisez des captures d'écran si vous avez besoin d'éléments visuels).
- Certains sites sont plus stricts concernant l'automatisation en mode headless (CAPTCHAS, anti-bot).
  Par exemple, X/Twitter bloque souvent les sessions headless.

### Comment utiliser Brave pour le contrôle du navigateur

Définissez `browser.executablePath` sur votre binaire Brave (ou tout autre navigateur basé sur Chromium) et redémarrez le Gateway.
Voir les exemples de configuration complets dans [Browser](/fr/tools/browser#use-brave-or-another-chromium-based-browser).

## Passerelles et nœuds distants

### Comment les commandes se propagent-elles entre Telegram, la passerelle et les nœuds

Les messages Telegram sont gérés par la **passerelle**. La passerelle exécute l'agent et
n'appelle ensuite les nœuds via le **WebSocket Gateway** uniquement lorsqu'un outil de nœud est nécessaire :

Telegram → Gateway → Agent → `node.*` → Nœud → Gateway → Telegram

Les nœuds ne voient pas le trafic entrant du provider ; ils ne reçoivent que les appels RPC de nœud RPC.

### Comment mon agent peut-il accéder à mon ordinateur si la Gateway est hébergée à distance

Réponse courte : **associez votre ordinateur en tant que nœud**. La Gateway s'exécute ailleurs, mais elle peut
appeler des outils `node.*` (écran, caméra, système) sur votre machine locale via le WebSocket Gateway.

Configuration typique :

1. Exécutez la Gateway sur l'hôte toujours allumé (VPS/serveur domestique).
2. Placez l'hôte de la Gateway + votre ordinateur sur le même tailnet.
3. Assurez-vous que le WS de la Gateway est accessible (liaison tailnet ou tunnel SSH).
4. Ouvrez l'application macOS localement et connectez-vous en mode **Bureau à distance via SSH** (ou tailnet direct)
   afin qu'elle puisse s'enregistrer en tant que nœud.
5. Approuvez le nœud sur le Gateway :

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

Aucun pont TCP distinct n'est requis ; les nœuds se connectent via le WebSocket Gateway.

Rappel de sécurité : l'appariement d'un nœud macOS permet `system.run` sur cette machine. N'associez
que des appareils de confiance, et consultez la page [Sécurité](/fr/gateway/security).

Documentation : [Nœuds](/fr/nodes), [Protocole Gateway](/fr/gateway/protocol), [Mode distant macOS](/fr/platforms/mac/remote), [Sécurité](/fr/gateway/security).

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

### Deux instances OpenClaw peuvent-elles communiquer entre elles VPS local

Oui. Il n'y a pas de pont « bot-à-bot » intégré, mais vous pouvez le configurer de quelques
façons fiables :

**Le plus simple :** utilisez un channel de chat normal auquel les deux bots peuvent accéder (Telegram/Slack/WhatsApp).
Faites en sorte que le bot A envoie un message au bot B, puis laissez le bot B répondre comme d'habitude.

**Pont CLI (générique) :** exécutez un script qui appelle l'autre Gateway avec
`openclaw agent --message ... --deliver`, en ciblant un chat où l'autre bot
coute. Si un bot est sur un VPS distant, pointez votre CLI vers ce Gateway distant
via SSH/Tailscale (voir [Accès distant](/fr/gateway/remote)).

Exemple de modèle (exécuté depuis une machine qui peut atteindre le Gateway cible) :

```bash
openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
```

Conseil : ajoutez une barrière de sécurité pour que les deux bots ne bouclent pas indéfiniment (mention uniquement, listes
d'autorisation de channels, ou une règle « ne pas répondre aux messages des bots »).

Documentation : [Accès distant](/fr/gateway/remote), [Agent CLI](/fr/cli/agent), [Agent send](/fr/tools/agent-send).

### Do I need separate VPSes for multiple agents

No. One Gateway can host multiple agents, each with its own workspace, model defaults,
and routing. That is the normal setup and it is much cheaper and simpler than running
one VPS per agent.

Use separate VPSes only when you need hard isolation (security boundaries) or very
different configs that you do not want to share. Otherwise, keep one Gateway and
use multiple agents or sub-agents.

### Is there a benefit to using a node on my personal laptop instead of SSH from a VPS

Yes - nodes are the first-class way to reach your laptop from a remote Gateway, and they
unlock more than shell access. The Gateway runs on macOS/Linux (Windows via WSL2) and is
lightweight (a small VPS or Raspberry Pi-class box is fine; 4 GB RAM is plenty), so a common
setup is an always-on host plus your laptop as a node.

- **No inbound SSH required.** Nodes connect out to the Gateway WebSocket and use device pairing.
- **Safer execution controls.** `system.run` is gated by node allowlists/approvals on that laptop.
- **More device tools.** Nodes expose `canvas`, `camera`, and `screen` in addition to `system.run`.
- **Local browser automation.** Keep the Gateway on a VPS, but run Chrome locally through a node host on the laptop, or attach to local Chrome on the host via Chrome MCP.

SSH is fine for ad-hoc shell access, but nodes are simpler for ongoing agent workflows and
device automation.

Docs: [Nodes](/fr/nodes), [Nodes CLI](/fr/cli/nodes), [Browser](/fr/tools/browser).

### Should I install on a second laptop or just add a node

If you only need **local tools** (screen/camera/exec) on the second laptop, add it as a
**node**. That keeps a single Gateway and avoids duplicated config. Local node tools are
currently macOS-only, but we plan to extend them to other OSes.

Install a second Gateway only when you need **hard isolation** or two fully separate bots.

Docs: [Nodes](/fr/nodes), [Nodes CLI](/fr/cli/nodes), [Multiple gateways](/fr/gateway/multiple-gateways).

### Do nodes run a gateway service

Non. Un seul **gateway** doit fonctionner par hôte, sauf si vous exécutez intentionnellement des profils isolés (voir [Multiple gateways](/fr/gateway/multiple-gateways)). Les nœuds sont des périphériques qui se connectent
au gateway (nœuds iOS/Android, ou "mode nœud" macOS dans l'application de la barre de menus). Pour les hôtes de nœuds sans interface graphique et le contrôle CLI, voir [Node host CLI](/fr/cli/node).

Un redémarrage complet est requis pour les modifications de `gateway`, `discovery` et `canvasHost`.

### Existe-t-il un moyen API RPC d'appliquer la configuration

Oui. `config.apply` valide + écrit la configuration complète et redémarre le Gateway dans le cadre de l'opération.

### configapply a effacé ma configuration Comment récupérer et éviter cela

`config.apply` remplace la **configuration entière**. Si vous envoyez un objet partiel, tout
le reste est supprimé.

Récupération :

- Restaurer à partir d'une sauvegarde (git ou un `~/.openclaw/openclaw.json` copié).
- Si vous n'avez pas de sauvegarde, relancez `openclaw doctor` et reconfigurez les canaux/modèles.
- Si c'était inattendu, signalez un bogue et incluez votre dernière configuration connue ou toute sauvegarde.
- Un agent de codage local peut souvent reconstruire une configuration fonctionnelle à partir des journaux ou de l'historique.

L'éviter :

- Utilisez `openclaw config set` pour les petites modifications.
- Utilisez `openclaw configure` pour les modifications interactives.

Documentation : [Config](/fr/cli/config), [Configure](/fr/cli/configure), [Doctor](/fr/gateway/doctor).

### Configuration minimale saine pour une première installation

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

Cela définit votre espace de travail et restreint qui peut déclencher le bot.

### Comment configurer Tailscale sur un VPS et se connecter depuis mon Mac

Étapes minimales :

1. **Installer + se connecter sur le VPS**

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. **Installer + se connecter sur votre Mac**
   - Utilisez l'application Tailscale et connectez-vous au même tailnet.
3. **Activer MagicDNS (recommandé)**
   - Dans la console d'administration Tailscale, activez MagicDNS pour que le VPS ait un nom stable.
4. **Utiliser le nom d'hôte du tailnet**
   - SSH : `ssh user@your-vps.tailnet-xxxx.ts.net`
   - Gateway WS : `ws://your-vps.tailnet-xxxx.ts.net:18789`

Si vous voulez l'interface de contrôle sans SSH, utilisez Tailscale Serve sur le VPS :

```bash
openclaw gateway --tailscale serve
```

Cela garde le gateway lié au bouclage local et expose HTTPS via Tailscale. Voir [Tailscale](/fr/gateway/tailscale).

### Comment connecter un nœud Mac à un Gateway distant Tailscale Serve

Serve exposes the **Gateway Control UI + WS**. Nodes connect over the same Gateway WS endpoint.

Recommended setup:

1. **Make sure the VPS + Mac are on the same tailnet**.
2. **Use the macOS app in Remote mode** (SSH target can be the tailnet hostname).
   The app will tunnel the Gateway port and connect as a node.
3. **Approve the node** on the gateway:

   ```bash
   openclaw devices list
   openclaw devices approve <requestId>
   ```

Docs: [Gateway protocol](/fr/gateway/protocol), [Discovery](/fr/gateway/discovery), [macOS remote mode](/fr/platforms/mac/remote).

## Env vars and .env loading

### How does OpenClaw load environment variables

OpenClaw reads env vars from the parent process (shell, launchd/systemd, CI, etc.) and additionally loads:

- `.env` from the current working directory
- a global fallback `.env` from `~/.openclaw/.env` (aka `$OPENCLAW_STATE_DIR/.env`)

Neither `.env` file overrides existing env vars.

You can also define inline env vars in config (applied only if missing from the process env):

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

See [/environment](/fr/help/environment) for full precedence and sources.

### I started the Gateway via the service and my env vars disappeared What now

Two common fixes:

1. Put the missing keys in `~/.openclaw/.env` so they're picked up even when the service doesn't inherit your shell env.
2. Enable shell import (opt-in convenience):

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

This runs your login shell and imports only missing expected keys (never overrides). Env var equivalents:
`OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

### I set COPILOTGITHUBTOKEN but models status shows Shell env off Why

`openclaw models status` reports whether **shell env import** is enabled. "Shell env: off"
does **not** mean your env vars are missing - it just means OpenClaw won't load
your login shell automatically.

If the Gateway runs as a service (launchd/systemd), it won't inherit your shell
environment. Fix by doing one of these:

1. Put the token in `~/.openclaw/.env`:

   ```
   COPILOT_GITHUB_TOKEN=...
   ```

2. Or enable shell import (`env.shellEnv.enabled: true`).
3. Or add it to your config `env` block (applies only if missing).

Then restart the gateway and recheck:

```bash
openclaw models status
```

Les jetons Copilot sont lus à partir de `COPILOT_GITHUB_TOKEN` (aussi `GH_TOKEN` / `GITHUB_TOKEN`).
Voir [/concepts/model-providers](/fr/concepts/model-providers) et [/environment](/fr/help/environment).

## Sessions et discussions multiples

### Comment commencer une nouvelle conversation

Envoyez `/new` ou `/reset` comme message autonome. Voir [Gestion de session](/fr/concepts/session).

### Les sessions se réinitialisent-elles automatiquement si je n'envoie rien de nouveau

Oui. Les sessions expirent après `session.idleMinutes` (par défaut **60**). Le message **suivant**
commence un identifiant de session frais pour cette clé de discussion. Cela ne supprime pas
les transcriptions - cela lance simplement une nouvelle session.

```json5
{
  session: {
    idleMinutes: 240,
  },
}
```

### Existe-t-il un moyen de constituer une équipe d'instances OpenClaw avec un PDG et de nombreux agents

Oui, via le **routage multi-agents** et les **sous-agents**. Vous pouvez créer un agent coordinateur
et plusieurs agents de travail avec leurs propres espaces de travail et modèles.

Cela dit, c'est mieux vu comme une **expérience amusante**. C'est gourmand en jetons et souvent
moins efficace que d'utiliser un seul bot avec des sessions séparées. Le modèle typique que
nous envisageons est un bot avec lequel vous parlez, avec différentes sessions pour le travail parallèle. Ce
bot peut également générer des sous-agents si nécessaire.

Documentation : [Routage multi-agents](/fr/concepts/multi-agent), [Sous-agents](/fr/tools/subagents), [Agents CLI](/fr/cli/agents).

### Pourquoi le contexte a-t-il été tronqué en cours de tâche Comment l'empêcher

Le contexte de session est limité par la fenêtre du modèle. Les longues discussions, les grandes sorties d'outils ou de nombreux
fichiers peuvent déclencher une compression ou une troncation.

Ce qui aide :

- Demandez au bot de résumer l'état actuel et de l'écrire dans un fichier.
- Utilisez `/compact` avant les longues tâches, et `/new` lors du changement de sujet.
- Gardez le contexte important dans l'espace de travail et demandez au bot de le relire.
- Utilisez des sous-agents pour des tâches longues ou parallèles afin que la discussion principale reste plus petite.
- Choisissez un modèle avec une fenêtre de contexte plus large si cela arrive souvent.

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

- L'intégration offre également **Réinitialiser** s'elle détecte une configuration existante. Voir [Intégration (CLI)](/fr/start/wizard).
- Si vous avez utilisé des profils (`--profile` / `OPENCLAW_PROFILE`), réinitialisez chaque répertoire d'état (ceux par défaut sont `~/.openclaw-<profile>`).
- Réinitialisation dev : `openclaw gateway --dev --reset` (dev uniquement ; efface la config dev + les identifiants + les sessions + l'espace de travail).

### Je reçois des erreurs de contexte trop volumineux, comment réinitialiser ou compacter

Utilisez l'une de ces méthodes :

- **Compacter** (conserve la conversation mais résume les tours plus anciens) :

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

- Activez ou ajustez le **nettoyage de session** (`agents.defaults.contextPruning`) pour supprimer les anciennes sorties d'outils.
- Utilisez un modèle avec une fenêtre de contexte plus grande.

Documentation : [Compactage](/fr/concepts/compaction), [Nettoyage de session](/fr/concepts/session-pruning), [Gestion de session](/fr/concepts/session).

### Pourquoi vois-je "LLM request rejected: messages.content.tool_use.input field required" ?

C'est une erreur de validation du fournisseur : le modèle a émis un bloc `tool_use` sans le `input` requis. Cela signifie généralement que l'historique de la session est obsolète ou corrompu (souvent après de longs fils ou un changement d'outil/schéma).

Solution : démarrez une nouvelle session avec `/new` (message autonome).

### Pourquoi reçois-je des messages de heartbeat toutes les 30 minutes

Les heartbeats s'exécutent toutes les **30 m** par défaut. Ajustez-les ou désactivez-les :

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

Si `HEARTBEAT.md` existe mais est effectivement vide (seulement des lignes vides et des en-têtes markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels API. Si le fichier est manquant, le heartbeat s'exécute quand même et le modèle décide de ce qu'il faut faire.

Les personnalisations par agent utilisent `agents.list[].heartbeat`. Documentation : [Heartbeat](/fr/gateway/heartbeat).

### Dois-je ajouter un compte bot à un groupe WhatsApp

Non. OpenClaw fonctionne sur **votre propre compte**, donc si vous êtes dans le groupe, OpenClaw peut le voir. Par défaut, les réponses de groupe sont bloquées jusqu'à ce que vous autorisiez les expéditeurs (`groupPolicy: "allowlist"`).

Si vous voulez que seul **vous** puissiez déclencher des réponses de groupe :

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

Option 1 (la plus rapide) : surveillez les logs et envoyez un message de test dans le groupe :

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

### Les groupes/fils partagent-ils le contexte avec les DMs

Les discussions directes sont regroupées dans la session principale par défaut. Les groupes/canaux ont leurs propres clés de session, et les sujets Telegram / les fils Discord sont des sessions distinctes. Voir [Groupes](/fr/channels/groups) et [Messages de groupe](/fr/channels/group-messages).

### Combien d'espaces de travail et d'agents puis-je créer

Aucune limite stricte. Des dizaines (voire des centaines) sont acceptables, mais surveillez :

- **Croissance du disque :** les sessions + les transcriptions résident sous `~/.openclaw/agents/<agentId>/sessions/`.
- **Coût des jetons :** plus d'agents signifie une utilisation simultanée plus importante du model.
- **Surcharge opérationnelle :** profils d'authentification par agent, espaces de travail et routage des canaux.

Conseils :

- Gardez un espace de travail **actif** par agent (`agents.defaults.workspace`).
- Nettoyez les anciennes sessions (supprimez les entrées JSONL ou du store) si le disque sature.
- Utilisez `openclaw doctor` pour repérer les espaces de travail orphelins et les inadéquations de profils.

### Puis-je faire fonctionner plusieurs bots ou discussions en même temps sur Slack et comment dois-je configurer cela

Oui. Utilisez le **routage multi-agent** pour faire fonctionner plusieurs agents isolés et acheminer les messages entrants par
canal/compte/pair. Slack est pris en charge en tant que canal et peut être lié à des agents spécifiques.

L'accès par navigateur est puissant mais pas limité à "faire tout ce qu'un humain peut faire" - les anti-bots, les CAPTCHAS et la MFA peuvent
encore bloquer l'automatisation. Pour le contrôle de navigateur le plus fiable, utilisez le Chrome MCP local sur l'hôte,
ou utilisez le CDP sur la machine qui exécute réellement le navigateur.

Configuration des bonnes pratiques :

- Hôte Gateway toujours actif (VPS/Mac mini).
- Un agent par rôle (liaisons).
- Canaux Slack liés à ces agents.
- Navigateur local via Chrome MCP ou un nœud si nécessaire.

Docs : [Routage multi-agent](/fr/concepts/multi-agent), [Slack](/fr/channels/slack),
[Navigateur](/fr/tools/browser), [Nœuds](/fr/nodes).

## Modèles : valeurs par défaut, sélection, alias, changement

### Quel est le modèle par défaut

Le modèle par défaut de OpenClaw est celui que vous définissez comme :

```
agents.defaults.model.primary
```

Les modèles sont référencés comme `provider/model` (exemple : `anthropic/claude-opus-4-6`). Si vous omettez le fournisseur, OpenClaw suppose actuellement `anthropic` comme solution de repli temporaire pour dépréciation - mais vous devez toujours définir `provider/model` de manière **explicite**.

### Quel modèle recommandez-vous

**Par défaut recommandé :** utilisez le modèle le plus puissant de la dernière génération disponible dans votre pile de fournisseurs.
**Pour les agents avec outils ou entrées non fiables :** privilégiez la puissance du modèle par rapport au coût.
**Pour les discussions de routine ou à faible enjeu :** utilisez des modèles de repli moins chers et acheminez par rôle d'agent.

MiniMax M2.5 possède sa propre documentation : [MiniMax](/fr/providers/minimax) et
[Modèles locaux](/fr/gateway/local-models).

Règle empirique : utilisez le **meilleur modèle que vous pouvez payer** pour les travaux à enjeux élevés, et un modèle
moins cher pour les discussions de routine ou les résumés. Vous pouvez acheminer les modèles par agent et utiliser des sous-agents pour
paralléliser les longues tâches (chaque sous-agent consomme des jetons). Voir [Modèles](/fr/concepts/models) et
[Sous-agents](/fr/tools/subagents).

Avertissement sévère : les modèles plus faibles ou sur-quantifiés sont plus vulnérables aux injections
de prompt et aux comportements non sûrs. Voir [Sécurité](/fr/gateway/security).

Plus de contexte : [Modèles](/fr/concepts/models).

### Puis-je utiliser des modèles auto-hébergés llamacpp vLLM Ollama

Oui. Ollama est le moyen le plus simple pour les modèles locaux.

Configuration la plus rapide :

1. Installez Ollama depuis `https://ollama.com/download`
2. Tirez un modèle local tel que `ollama pull glm-4.7-flash`
3. Si vous souhaitez également le Cloud Ollama, exécutez `ollama signin`
4. Exécutez `openclaw onboard` et choisissez `Ollama`
5. Choisissez `Local` ou `Cloud + Local`

Notes :

- `Cloud + Local` vous donne accès aux modèles cloud Ollama ainsi qu'à vos modèles Ollama locaux
- les modèles cloud tels que `kimi-k2.5:cloud` n'ont pas besoin d'être téléchargés localement
- pour un changement manuel, utilisez `openclaw models list` et `openclaw models set ollama/<model>`

Note de sécurité : les modèles plus petits ou fortement quantifiés sont plus vulnérables à l'injection de prompts. Nous recommandons vivement les **grands modèles** pour tout bot capable d'utiliser des outils. Si vous souhaitez tout de même utiliser des petits modèles, activez le sandboxing et des listes d'autorisation strictes pour les outils.

Documentation : [Ollama](/fr/providers/ollama), [Modèles locaux](/fr/gateway/local-models),
[Fournisseurs de modèles](/fr/concepts/model-providers), [Sécurité](/fr/gateway/security),
[Sandboxing](/fr/gateway/sandboxing).

### Comment changer de modèles sans effacer ma configuration

Utilisez les **commandes de modèle** ou modifiez uniquement les champs **model**. Évitez de remplacer l'intégralité de la configuration.

Options sûres :

- `/model` dans le chat (rapide, par session)
- `openclaw models set ...` (met à jour uniquement la config du modèle)
- `openclaw configure --section model` (interactif)
- modifiez `agents.defaults.model` dans `~/.openclaw/openclaw.json`

Évitez `config.apply` avec un objet partiel, sauf si vous avez l'intention de remplacer toute la configuration.
Si vous avez écrasé la configuration, restaurez-la depuis une sauvegarde ou relancez `openclaw doctor` pour réparer.

Documentation : [Modèles](/fr/concepts/models), [Configurer](/fr/cli/configure), [Config](/fr/cli/config), [Doctor](/fr/gateway/doctor).

### Qu'est-ce que OpenClaw, Flawd et Krill utilisent comme modèles

- Ces déploiements peuvent différer et évoluer dans le temps ; il n'y a aucune recommandation fixe de fournisseur.
- Vérifiez le réglage actuel du runtime sur chaque passerelle avec `openclaw models status`.
- Pour les agents sensibles à la sécurité ou utilisant des outils, utilisez le modèle le plus puissant de la dernière génération disponible.

### Comment changer de modèles à la volée sans redémarrer

Utilisez la commande `/model` comme un message autonome :

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

`/model` (et `/model list`) affiche un sélecteur numéroté compact. Sélectionnez par numéro :

```
/model 3
```

Vous pouvez également forcer un profil d'authentification spécifique pour le provider (par session) :

```
/model opus@anthropic:default
/model opus@anthropic:work
```

Astuce : `/model status` indique quel agent est actif, quel fichier `auth-profiles.json` est utilisé, et quel profil d'authentification sera essayé ensuite.
Il indique également le point de terminaison du provider configuré (`baseUrl`) et le mode API (API `api`) lorsque disponibles.

**Comment épingler un profil que j'ai défini avec profile**

Réexécutez `/model` **sans** le suffixe `@profile` :

```
/model anthropic/claude-opus-4-6
```

Si vous souhaitez revenir à la valeur par défaut, sélectionnez-la dans `/model` (ou envoyez `/model <default provider/model>`).
Utilisez `/model status` pour confirmer quel profil d'authentification est actif.

### Puis-je utiliser GPT 5.2 pour les tâches quotidiennes et Codex 5.3 pour le codage

Oui. Définissez-en un par défaut et basculez au besoin :

- **Bascule rapide (par session) :** `/model gpt-5.2` pour les tâches quotidiennes, `/model openai-codex/gpt-5.4` pour le codage avec Codex OAuth.
- **Par défaut + bascule :** définissez `agents.defaults.model.primary` sur `openai/gpt-5.2`, puis basculez sur `openai-codex/gpt-5.4` lors du codage (ou inversement).
- **Sous-agents :** routez les tâches de codage vers des sous-agents avec un modèle par défaut différent.

Voir [Modèles](/fr/concepts/models) et [Commandes slash](/fr/tools/slash-commands).

### Pourquoi vois-je Model is not allowed puis aucune réponse

Si `agents.defaults.models` est défini, il devient la **liste d'autorisation** pour `/model` et toute
remplacement de session. Le choix d'un modèle qui n'est pas dans cette liste renvoie :

```
Model "provider/model" is not allowed. Use /model to list available models.
```

Cette erreur est renvoyée **à la place de** une réponse normale. Correction : ajoutez le modèle à
`agents.defaults.models`, supprimez la liste d'autorisation, ou choisissez un modèle dans `/model list`.

### Pourquoi vois-je Unknown model minimaxMiniMaxM25

Cela signifie que le **provider n'est pas configuré** (aucune configuration de provider MiniMax ou profil d'authentification
n'a été trouvé), le modèle ne peut donc pas être résolu. Une correction pour cette détection est
dans **2026.1.12** (non publié au moment de la rédaction).

Liste de vérification de la correction :

1. Mettez à jour vers **2026.1.12** (ou exécutez à partir de la source `main`), puis redémarrez la passerelle.
2. Assurez-vous que MiniMax est configuré (assistant ou JSON), ou qu'une clé MiniMax API
   existe dans les profils env/auth afin que le provider puisse être injecté.
3. Utilisez l'ID exact du modèle (sensible à la casse) : `minimax/MiniMax-M2.5` ou
   `minimax/MiniMax-M2.5-highspeed`.
4. Exécutez :

   ```bash
   openclaw models list
   ```

   et choisissez dans la liste (ou `/model list` dans le chat).

Voir [MiniMax](/fr/providers/minimax) et [Modèles](/fr/concepts/models).

### Puis-je utiliser MiniMax par défaut et OpenAI pour les tâches complexes

Oui. Utilisez **MiniMax par défaut** et changez de modèle **par session** si nécessaire.
Les solutions de repli sont pour les **erreurs**, pas les « tâches difficiles », utilisez donc `/model` ou un agent séparé.

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

Documentation : [Modèles](/fr/concepts/models), [Routage multi-agent](/fr/concepts/multi-agent), [MiniMax](/fr/providers/minimax), [OpenAI](/fr/providers/openai).

### opus sonnet gpt sont-ils des raccourcis intégrés

Oui. OpenClaw fournit quelques abréviations par défaut (uniquement appliquées lorsque le modèle existe dans `agents.defaults.models`) :

- `opus` → `anthropic/claude-opus-4-6`
- `sonnet` → `anthropic/claude-sonnet-4-6`
- `gpt` → `openai/gpt-5.4`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3.1-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`
- `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

Si vous définissez votre propre alias avec le même nom, votre valeur prévaut.

### Comment définir/remplacer les raccourcis/alias des modèles

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

### Comment ajouter des modèles d'autres providers comme OpenRouter ou ZAI

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

Si vous référencez un provider/model mais que la clé de provider requise est manquante, vous obtiendrez une erreur d'authentification lors de l'exécution (par ex. `No API key found for provider "zai"`).

**Aucune clé API trouvée pour le provider après l'ajout d'un nouvel agent**

Cela signifie généralement que le **nouvel agent** a un magasin d'authentification vide. L'authentification est par agent et
stockée dans :

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Options de correction :

- Exécutez `openclaw agents add <id>` et configurez l'authentification lors de l'assistant.
- Ou copiez `auth-profiles.json` du `agentDir` de l'agent principal vers le `agentDir` du nouvel agent.

Ne **réutilisez pas** le `agentDir` entre les agents ; cela provoque des collisions d'authentification/session.

## Basculement de modèle et "Tous les modèles ont échoué"

### Comment fonctionne le basculement

Le basculement se produit en deux étapes :

1. **Rotation des profils d'authentification** au sein du même provider.
2. **Retrait du modèle** vers le modèle suivant dans `agents.defaults.model.fallbacks`.

Des temps de recharge s'appliquent aux profils en échec (backoff exponentiel), afin que OpenClaw puisse continuer à répondre même lorsqu'un provider est limité par le débit ou en échec temporaire.

### Que signifie cette erreur

```
No credentials found for profile "anthropic:default"
```

Cela signifie que le système a tenté d'utiliser l'ID de profil d'authentification `anthropic:default`, mais n'a pas pu trouver d'identifiants correspondants dans le magasin d'authentification attendu.

### Liste de vérification pour Aucune identifiant trouvé pour le profil anthropicdefault

- **Confirmez l'emplacement des profils d'authentification** (nouveaux chemins vs anciens)
  - Actuel : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - Ancien : `~/.openclaw/agent/*` (migré par `openclaw doctor`)
- **Confirmez que votre env var est chargée par le Gateway**
  - Si vous définissez `ANTHROPIC_API_KEY` dans votre shell mais que vous exécutez le Gateway via systemd/launchd, il est possible qu'il ne l'hérite pas. Placez-la dans `~/.openclaw/.env` ou activez `env.shellEnv`.
- **Assurez-vous de modifier le bon agent**
  - Les configurations multi-agents signifient qu'il peut y avoir plusieurs fichiers `auth-profiles.json`.
- **Vérification de l'état du modèle/de l'authentification**
  - Utilisez `openclaw models status` pour voir les modèles configurés et si les providers sont authentifiés.

**Liste de vérification pour Aucune identifiant trouvé pour le profil anthropic**

Cela signifie que l'exécution est épinglée à un profil d'authentification Anthropic, mais que le Gateway
ne peut pas le trouver dans son magasin d'authentification.

- **Utiliser un setup-token**
  - Exécutez `claude setup-token`, puis collez-le avec `openclaw models auth setup-token --provider anthropic`.
  - Si le jeton a été créé sur une autre machine, utilisez `openclaw models auth paste-token --provider anthropic`.
- **Si vous souhaitez plutôt utiliser une clé API**
  - Mettez `ANTHROPIC_API_KEY` dans `~/.openclaw/.env` sur l'**hôte de la passerelle**.
  - Effacez tout ordre épinglé qui force un profil manquant :

    ```bash
    openclaw models auth order clear --provider anthropic
    ```

- **Confirmez que vous exécutez les commandes sur l'hôte de la passerelle**
  - En mode distant, les profils d'authentification résident sur la machine passerelle, et non sur votre ordinateur portable.

### Pourquoi a-t-il également essayé Google Gemini et échoué

Si la configuration de votre modèle inclut Google Gemini comme solution de repli (ou si vous avez basculé vers un raccourci Gemini), OpenClaw l'essaiera lors du repli de modèle. Si vous n'avez pas configuré d'identifiants Google, vous verrez `No API key found for provider "google"`.

Correction : fournissez soit l'authentification Google, soit supprimez/évitez les modèles Google dans `agents.defaults.model.fallbacks` / les alias pour que le repli ne s'achemine pas vers cet endroit.

**Message de rejet de requête LLM indiquant une signature requise google antigravity**

Cause : l'historique de la session contient des **blocs de réflexion sans signature** (souvent provenant d'un flux interrompu/partiel). Google Antigravity nécessite des signatures pour les blocs de réflexion.

Correction : OpenClaw supprime désormais les blocs de réflexion non signés pour Google Antigravity Claude. Si cela apparaît toujours, démarrez une **nouvelle session** ou définissez `/thinking off` pour cet agent.

## Profils d'authentification : ce qu'ils sont et comment les gérer

Connexes : [/concepts/oauth](/fr/concepts/oauth) (flux OAuth, stockage des jetons, modèles multi-comptes)

### Qu'est-ce qu'un profil d'authentification

Un profil d'authentification est un enregistrement d'identifiants nommé (OAuth ou clé API) lié à un fournisseur. Les profils résident dans :

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### Quels sont les ID de profil typiques

OpenClaw utilise des ID préfixés par fournisseur, tels que :

- `anthropic:default` (courant lorsqu'aucune identité par e-mail n'existe)
- `anthropic:<email>` pour les identités OAuth
- ID personnalisés de votre choix (par exemple `anthropic:work`)

### Puis-je contrôler quel profil d'authentification est essayé en premier

Oui. La configuration prend en charge des métadonnées facultatives pour les profils et un ordre par fournisseur (`auth.order.<provider>`). Cela ne stocke **pas** de secrets ; il mappe les ID au fournisseur/mode et définit l'ordre de rotation.

OpenClaw peut ignorer temporairement un profil s'il est dans un court **délai de rétablissement** (cooldown) (limites de délai/délais d'attente/échecs d'authentification) ou dans un état plus long **désactivé** (facturation/crédits insuffisants). Pour inspecter cela, exécutez `openclaw models status --json` et vérifiez `auth.unusableProfiles`. Réglage : `auth.cooldowns.billingBackoffHours*`.

Vous pouvez également définir une priorité de remplacement **par agent** (stockée dans le `auth-profiles.json` de cet agent) via le CLI :

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

### OAuth vs clé API - quelle est la différence

OpenClaw prend en charge les deux :

- **OAuth** tire souvent parti de l'accès par abonnement (le cas échéant).
- Les **clés API** utilisent une facturation au paiement à l'utilisation.

L'assistant prend explicitement en charge le jeton de configuration Anthropic et OpenAI Codex OAuth et peut stocker les clés API pour vous.

## Gateway : ports, « déjà en cours d'exécution » et mode distant

### Quel port le Gateway utilise-t-il

`gateway.port` contrôle le port multiplexé unique pour WebSocket + HTTP (interface utilisateur de contrôle, hooks, etc.).

Priorité :

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
```

### Pourquoi le statut de la passerelle openclaw indique-t-il Runtime en cours d'exécution mais sonde RPC échouée

Parce que « en cours d'exécution » est la vue du **superviseur** (launchd/systemd/schtasks). La sonde RPC est le CLI se connectant réellement au WebSocket de la passerelle et appelant `status`.

Utilisez `openclaw gateway status` et faites confiance à ces lignes :

- `Probe target:` (l'URL réellement utilisée par la sonde)
- `Listening:` (ce qui est réellement lié au port)
- `Last gateway error:` (cause racine courante lorsque le processus est actif mais que le port n'écoute pas)

### Pourquoi le statut de la passerelle openclaw affiche-t-il Config cli et Config service différents

Vous modifiez un fichier de configuration pendant que le service en exécute un autre (souvent une inadéquation `--profile` / `OPENCLAW_STATE_DIR`).

Correction :

```bash
openclaw gateway install --force
```

Exécutez cela à partir du même `--profile` / environnement que vous souhaitez que le service utilise.

### Que signifie une autre instance de la passerelle est déjà à l'écoute

OpenClaw applique un verrou d'exécution en liant l'écouteur WebSocket immédiatement au démarrage (par défaut `ws://127.0.0.1:18789`). Si la liaison échoue avec `EADDRINUSE`, il lance `GatewayLockError` indiquant qu'une autre instance est déjà à l'écoute.

Correction : arrêtez l'autre instance, libérez le port ou exécutez avec `openclaw gateway --port <port>`.

### Comment exécuter OpenClaw en mode distant (le client se connecte à une Gateway ailleurs)

Définissez `gateway.mode: "remote"` et pointez vers une URL WebSocket distante, facultativement avec un jeton/mot de passe :

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

- `openclaw gateway` ne démarre que lorsque `gateway.mode` est `local` (ou que vous passez le flag de forçage).
- L'application macOS surveille le fichier de configuration et bascule les modes en direct lorsque ces valeurs changent.

### L'interface de contrôle indique non autorisé ou se reconnecte en boucle. Et maintenant ?

Votre gateway s'exécute avec l'authentification activée (`gateway.auth.*`), mais l'interface n'envoie pas le jeton/mot de passe correspondant.

Faits (issus du code) :

- L'interface de contrôle conserve le jeton dans `sessionStorage` pour la session de l'onglet actuel du navigateur et l'URL de la passerelle sélectionnée, les rafraîchissements du même onglet continuent donc de fonctionner sans restaurer la persistance du jeton localStorage à long terme.
- Sur `AUTH_TOKEN_MISMATCH`, les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton d'appareil mis en cache lorsque la passerelle renvoie des indices de nouvelle tentative (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).

Correction :

- Le plus rapide : `openclaw dashboard` (affiche + copie l'URL du tableau de bord, tente de l'ouvrir ; affiche un indice SSH en mode sans tête).
- Si vous n'avez pas encore de jeton : `openclaw doctor --generate-gateway-token`.
- Si distant, établissez d'abord un tunnel : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`.
- Définissez `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`) sur l'hôte de la passerelle.
- Dans les paramètres de l'interface de contrôle, collez le même jeton.
- Si la discordance persiste après la nouvelle tentative, faites pivoter/réapprouvez le jeton de l'appareil couplé :
  - `openclaw devices list`
  - `openclaw devices rotate --device <id> --role operator`
- Toujours bloqué ? Exécutez `openclaw status --all` et suivez [Dépannage](/fr/gateway/troubleshooting). Consultez [Tableau de bord](/fr/web/dashboard) pour les détails d'authentification.

### J'ai défini gateway.bind tailnet mais il ne peut pas se lier et rien n'écoute

`tailnet` bind choisit une IP Tailscale parmi vos interfaces réseau (100.64.0.0/10). Si la machine n'est pas sur Tailscale (ou que l'interface est en panne), il n'y a rien à lier.

Correction :

- Start Tailscale on that host (so it has a 100.x address), or
- Switch to `gateway.bind: "loopback"` / `"lan"`.

Note: `tailnet` is explicit. `auto` prefers loopback; use `gateway.bind: "tailnet"` when you want a tailnet-only bind.

### Can I run multiple Gateways on the same host

Usually no - one Gateway can run multiple messaging channels and agents. Use multiple Gateways only when you need redundancy (ex: rescue bot) or hard isolation.

Yes, but you must isolate:

- `OPENCLAW_CONFIG_PATH` (per-instance config)
- `OPENCLAW_STATE_DIR` (per-instance state)
- `agents.defaults.workspace` (workspace isolation)
- `gateway.port` (unique ports)

Quick setup (recommended):

- Use `openclaw --profile <name> …` per instance (auto-creates `~/.openclaw-<name>`).
- Set a unique `gateway.port` in each profile config (or pass `--port` for manual runs).
- Install a per-profile service: `openclaw --profile <name> gateway install`.

Profiles also suffix service names (`ai.openclaw.<profile>`; legacy `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
Full guide: [Multiple gateways](/fr/gateway/multiple-gateways).

### What does invalid handshake code 1008 mean

The Gateway is a **WebSocket server**, and it expects the very first message to
be a `connect` frame. If it receives anything else, it closes the connection
with **code 1008** (policy violation).

Common causes:

- You opened the **HTTP** URL in a browser (`http://...`) instead of a WS client.
- You used the wrong port or path.
- A proxy or tunnel stripped auth headers or sent a non-Gateway request.

Quick fixes:

1. Use the WS URL: `ws://<host>:18789` (or `wss://...` if HTTPS).
2. Don't open the WS port in a normal browser tab.
3. If auth is on, include the token/password in the `connect` frame.

If you're using the CLI or TUI, the URL should look like:

```
openclaw tui --url ws://<host>:18789 --token <token>
```

Protocol details: [Gateway protocol](/fr/gateway/protocol).

## Logging and debugging

### Where are logs

Journaux de fichiers (structurés) :

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

Vous pouvez définir un chemin stable via `logging.file`. Le niveau de journalisation des fichiers est contrôlé par `logging.level`. La verbosité de la console est contrôlée par `--verbose` et `logging.consoleLevel`.

Suivi de journal le plus rapide :

```bash
openclaw logs --follow
```

Journaux du service/superviseur (lorsque la passerelle s'exécute via launchd/systemd) :

- macOS : `$OPENCLAW_STATE_DIR/logs/gateway.log` et `gateway.err.log` (par défaut : `~/.openclaw/logs/...` ; les profils utilisent `~/.openclaw-<profile>/logs/...`)
- Linux : `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
- Windows : `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

Voir [Dépannage](/fr/gateway/troubleshooting#log-locations) pour plus d'informations.

### Comment démarrer/arrêter/redémarrer le service Gateway

Utilisez les assistants de passerelle :

```bash
openclaw gateway status
openclaw gateway restart
```

Si vous exécutez la passerelle manuellement, `openclaw gateway --force` peut récupérer le port. Voir [Gateway](/fr/gateway).

### J'ai fermé mon terminal sur Windows, comment redémarrer OpenClaw

Il existe **deux modes d'installation Windows** :

**1) WSL2 (recommandé) :** la Gateway s'exécute à l'intérieur de Linux.

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

**2) Windows natif (non recommandé) :** la Gateway s'exécute directement dans Windows.

Ouvrez PowerShell et exécutez :

```powershell
openclaw gateway status
openclaw gateway restart
```

Si vous l'exécutez manuellement (sans service), utilisez :

```powershell
openclaw gateway run
```

Docs : [Windows (WSL2)](/fr/platforms/windows), [Manuel de procédures du service Gateway](/fr/gateway).

### Le Gateway est opérationnel mais les réponses n'arrivent jamais, que dois-je vérifier

Commencez par un contrôle de santé rapide :

```bash
openclaw status
openclaw models status
openclaw channels status
openclaw logs --follow
```

Causes courantes :

- Authentification du modèle non chargée sur l'**hôte de la passerelle** (vérifiez `models status`).
- Appairage de canal/liste d'autorisation bloquant les réponses (vérifiez la configuration du canal + les journaux).
- WebChat/Tableau de bord est ouvert sans le bon jeton.

Si vous êtes à distance, confirmez que la connexion tunnel/Tailscale est active et que le WebSocket de la Gateway est accessible.

Docs : [Canaux](/fr/channels), [Dépannage](/fr/gateway/troubleshooting), [Accès à distance](/fr/gateway/remote).

### Déconnecté de la passerelle sans raison, et maintenant

Cela signifie généralement que l'interface utilisateur a perdu la connexion WebSocket. Vérifiez :

1. La Gateway est-elle en cours d'exécution ? `openclaw gateway status`
2. Le Gateway est-il en bonne santé ? `openclaw status`
3. L'interface utilisateur dispose-t-elle du bon jeton ? `openclaw dashboard`
4. Si distant, le lien tunnel/Tailscale est-il actif ?

Ensuite, consultez les journaux :

```bash
openclaw logs --follow
```

Documentation : [Tableau de bord](/fr/web/dashboard), [Accès à distance](/fr/gateway/remote), [Dépannage](/fr/gateway/troubleshooting).

### Échec de setMyCommands Telegram Que dois-je vérifier

Commencez par les journaux et l'état du canal :

```bash
openclaw channels status
openclaw channels logs --channel telegram
```

Ensuite, confrontez l'erreur :

- `BOT_COMMANDS_TOO_MUCH` : le menu Telegram contient trop d'entrées. OpenClaw réduit déjà à la limite Telegram et réessaie avec moins de commandes, mais certaines entrées du menu doivent encore être supprimées. Réduisez les commandes de plugin/compétence/personnalisées, ou désactivez `channels.telegram.commands.native` si vous n'avez pas besoin du menu.
- `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, ou erreurs réseau similaires : si vous êtes sur un VPS ou derrière un proxy, confirmez que le HTTPS sortant est autorisé et que le DNS fonctionne pour `api.telegram.org`.

Si le Gateway est distant, assurez-vous que vous consultez les journaux sur l'hôte du Gateway.

Documentation : [Telegram](/fr/channels/telegram), [Dépannage du canal](/fr/channels/troubleshooting).

### Le TUI n'affiche aucune sortie Que dois-je vérifier

Confirmez d'abord que le Gateway est accessible et que l'agent peut s'exécuter :

```bash
openclaw status
openclaw models status
openclaw logs --follow
```

Dans le TUI, utilisez `/status` pour voir l'état actuel. Si vous attendez des réponses dans un canal de discussion, assurez-vous que la livraison est activée (`/deliver on`).

Documentation : [TUI](/fr/web/tui), [Commandes slash](/fr/tools/slash-commands).

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

Documentation : [Manuel de procédure du service Gateway](/fr/gateway).

### ELI5 openclaw gateway restart vs openclaw gateway

- `openclaw gateway restart` : redémarre le **service en arrière-plan** (launchd/systemd).
- `openclaw gateway` : exécute la passerelle **au premier plan** pour cette session de terminal.

Si vous avez installé le service, utilisez les commandes gateway. Utilisez `openclaw gateway` lorsque vous souhaitez une exécution unique et au premier plan.

### Le moyen le plus rapide d'obtenir plus de détails en cas d'échec

Démarrez le Gateway avec `--verbose` pour obtenir plus de détails dans la console. Inspectez ensuite le fichier journal pour les erreurs d'authentification de channel, de routage de model et de RPC.

## Médias et pièces jointes

### Mon skill a généré un imagePDF mais rien n'a été envoyé

Les pièces jointes sortantes de l'agent doivent inclure une ligne `MEDIA:<path-or-url>` (sur sa propre ligne). Voir la [configuration de l'assistant OpenClaw](/fr/start/openclaw) et [Agent send](/fr/tools/agent-send).

Envoi via CLI :

```bash
openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
```

Vérifiez également :

- Le channel cible prend en charge les médias sortants et n'est pas bloqué par les listes d'autorisation.
- Le fichier est dans les limites de taille du provider (les images sont redimensionnées à un maximum de 2048 px).

Voir [Images](/fr/nodes/images).

## Sécurité et contrôle d'accès

### Est-il sûr d'exposer OpenClaw aux DM entrants

Traitez les DM entrants comme une entrée non approuvée. Les paramètres par défaut sont conçus pour réduire les risques :

- Le comportement par défaut sur les channels prenant en charge les DM est le **pairing** (appariement) :
  - Les expéditeurs inconnus reçoivent un code de pairing ; le bot ne traite pas leur message.
  - Approuver avec : `openclaw pairing approve --channel <channel> [--account <id>] <code>`
  - Les demandes en attente sont limitées à **3 par channel** ; vérifiez `openclaw pairing list --channel <channel> [--account <id>]` si un code n'est pas arrivé.
- Ouvrir les DM publiquement nécessite un consentement explicite (`dmPolicy: "open"` et allowlist `"*"`).

Exécutez `openclaw doctor` pour révéler les stratégies de DM risquées.

### L'injection de prompt est-elle uniquement une préoccupation pour les bots publics

Non. L'injection de prompt concerne le **contenu non approuvé**, et pas seulement qui peut envoyer un DM au bot.
Si votre assistant lit du contenu externe (recherche/récupération web, pages de navigateur, e-mails,
documents, pièces jointes, journaux collés), ce contenu peut inclure des instructions qui tentent
de détourner le model. Cela peut arriver même si **vous êtes le seul expéditeur**.

Le plus grand risque survient lorsque les tools sont activés : le model peut être trompé et
exfiltrer du contexte ou appeler des tools en votre nom. Réduisez le rayon d'impact en :

- utilisant un agent "reader" (lecteur) en lecture seule ou sans tools pour résumer le contenu non approuvé
- gardant `web_search` / `web_fetch` / `browser` désactivés pour les agents avec tools activés
- sandboxing et listes de contrôle d'accès strictes pour les outils

Détails : [Sécurité](/fr/gateway/security).

### Mon bot doit-il avoir son propre compte e-mail GitHub ou son propre numéro de téléphone

Oui, pour la plupart des configurations. Isoler le bot avec des comptes et des numéros de téléphone distincts
réduit le rayon d'impact en cas de problème. Cela facilite également la rotation des
identifiants ou la révocation de l'accès sans impacter vos comptes personnels.

Commencez modestement. Ne donnez l'accès qu'aux outils et comptes dont vous avez réellement besoin, et étendez
plus tard si nécessaire.

Docs : [Sécurité](/fr/gateway/security), [Appairage](/fr/channels/pairing).

### Puis-je lui donner une autonomie sur mes messages texte et est-ce sans risque

Nous **ne recommandons pas** une autonomie totale sur vos messages personnels. Le modèle le plus sûr est :

- Gardez les DMs en **mode d'appairage** ou sur une liste de contrôle d'accès restreinte.
- Utilisez un **numéro ou un compte distinct** si vous souhaitez qu'il message en votre nom.
- Laissez-le rédiger, puis **approuvez avant l'envoi**.

Si vous souhaitez expérimenter, faites-le sur un compte dédié et gardez-le isolé. Voir
[Sécurité](/fr/gateway/security).

### Puis-je utiliser des modèles moins chers pour les tâches d'assistant personnel

Oui, **si** l'agent est en mode chat uniquement et que l'entrée est fiable. Les niveaux inférieurs sont
plus sensibles au détournement d'instructions, évitez donc de les utiliser pour les agents disposant d'outils
ou lors de la lecture de contenu non fiable. Si vous devez utiliser un modèle plus petit, verrouillez
les outils et exécutez-les dans un bac à sable. Voir [Sécurité](/fr/gateway/security).

### J'ai exécuté start dans Telegram mais je n'ai pas reçu de code d'appairage

Les codes d'appairage sont envoyés **uniquement** lorsqu'un expéditeur inconnu message le bot et que
`dmPolicy: "pairing"` est activé. `/start` seul ne génère pas de code.

Vérifiez les demandes en attente :

```bash
openclaw pairing list telegram
```

Si vous souhaitez un accès immédiat, ajoutez votre identifiant d'expéditeur à la liste de contrôle d'accès ou définissez `dmPolicy: "open"`
pour ce compte.

### WhatsApp va-t-il message mes contacts Comment fonctionne l'appairage

Non. Par défaut, la politique de DM WhatsApp est l'**appairage**. Les expéditeurs inconnus ne reçoivent qu'un code d'appairage et leur message est **pas traité**. OpenClaw ne répond qu'aux chats qu'il reçoit ou aux envois explicites que vous déclenchez.

Approuver l'appairage avec :

```bash
openclaw pairing approve whatsapp <code>
```

Lister les demandes en attente :

```bash
openclaw pairing list whatsapp
```

Invité du numéro de téléphone dans l'assistant : il est utilisé pour définir votre **allowlist/owner** afin que vos propres DMs soient autorisés. Il n'est pas utilisé pour l'envoi automatique. Si vous utilisez votre numéro personnel WhatsApp, utilisez ce numéro et activez `channels.whatsapp.selfChatMode`.

## Commandes de chat, annulation de tâches et "ça ne s'arrête pas"

### Comment empêcher l'affichage des messages système internes dans le chat

La plupart des messages internes ou des tool n'apparaissent que lorsque le mode **verbose** ou **reasoning** est activé
pour cette session.

Correction dans le chat où vous le voyez :

```
/verbose off
/reasoning off
```

Si c'est encore trop bruyant, vérifiez les paramètres de session dans l'interface de contrôle et définissez verbose
sur **inherit**. Confirmez également que vous n'utilisez pas un profil de bot avec `verboseDefault` défini
sur `on` dans la configuration.

Documentation : [Thinking and verbose](/fr/tools/thinking), [Sécurité](/fr/gateway/security#reasoning--verbose-output-in-groups).

### Comment annuler une tâche en cours d'exécution

Envoyez l'un de ces éléments **en tant que message autonome** (sans barre oblique) :

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

Il s'agit de déclencheurs d'abandon (et non de commandes slash).

Pour les processus d'arrière-plan (provenant de l'outil exec), vous pouvez demander à l'agent d'exécuter :

```
process action:kill sessionId:XXX
```

Aperçu des commandes slash : voir [Slash commands](/fr/tools/slash-commands).

La plupart des commandes doivent être envoyées sous forme de message **autonome** commençant par `/`, mais quelques raccourcis (comme `/status`) fonctionnent également en ligne pour les expéditeurs sur la liste d'autorisation.

### Comment envoyer un message Discord depuis Telegram Messagerie intercontexte refusée

OpenClaw bloque la messagerie **cross-provider** par défaut. Si un appel d'outil est lié
à Telegram, il n'enverra pas vers Discord sauf si vous l'autorisez explicitement.

Activer la messagerie cross-provider pour l'agent :

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

Redémarrez la passerelle après avoir modifié la configuration. Si vous ne souhaitez cela que pour un seul
agent, définissez-le sous `agents.list[].tools.message` à la place.

### Pourquoi a-t-on l'impression que le bot ignore les messages en rafale

Le mode de file d'attente contrôle la façon dont les nouveaux messages interagissent avec une exécution en cours. Utilisez `/queue` pour changer de mode :

- `steer` - les nouveaux messages redirigent la tâche actuelle
- `followup` - exécuter les messages un par un
- `collect` - regrouper les messages et répondre une fois (par défaut)
- `steer-backlog` - guider maintenant, puis traiter l'arriéré
- `interrupt` - abandonner l'exécution actuelle et recommencer

Vous pouvez ajouter des options comme `debounce:2s cap:25 drop:summarize` pour les modes de suivi.

## Répondre à la question exacte de la capture d'écran/journal de discussion

**Q : « Quel est le model par défaut pour Anthropic avec une clé API ? »**

**A :** Dans OpenClaw, les identifiants et la sélection du model sont distincts. Définir `ANTHROPIC_API_KEY` (ou stocker une clé Anthropic API dans les profils d'authentification) active l'authentification, mais le model par défaut réel est celui que vous configurez dans `agents.defaults.model.primary` (par exemple, `anthropic/claude-sonnet-4-5` ou `anthropic/claude-opus-4-6`). Si vous voyez `No credentials found for profile "anthropic:default"`, cela signifie que la Gateway n'a pas pu trouver d'identifiants Anthropic dans le `auth-profiles.json` attendu pour l'agent en cours d'exécution.

---

Toujours bloqué ? Posez la question sur [Discord](https://discord.com/invite/clawd) ou ouvrez une [discussion GitHub](https://github.com/openclaw/openclaw/discussions).

import en from "/components/footer/en.mdx";

<en />
