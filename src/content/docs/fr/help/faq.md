---
summary: "Questions fréquemment posées sur l'installation, la configuration et l'utilisation d'OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "FAQ"
---

Réponses rapides et dépannage approfondi pour les configurations réelles (dev local, VPS, multi-agent, clés OAuth/API, basculement de model). Pour les diagnostics d'exécution, voir [Troubleshooting](/fr/gateway/troubleshooting). Pour la référence complète de la configuration, voir [Configuration](/fr/gateway/configuration).

## Premières 60 secondes si quelque chose est cassé

1. **Statut rapide (première vérification)**

   ```bash
   openclaw status
   ```

   Résumé local rapide : OS + mise à jour, accessibilité de la passerelle/du service, agents/sessions, configuration du provider + problèmes d'exécution (lorsque la passerelle est accessible).

2. **Rapport collable (sûr à partager)**

   ```bash
   openclaw status --all
   ```

   Diagnostic en lecture seule avec le suivi des journaux (jetons expurgés).

3. **État du démon et du port**

   ```bash
   openclaw gateway status
   ```

   Affiche l'exécution du superviseur par rapport à l'accessibilité RPC, l'URL cible de la sonde et la configuration probablement utilisée par le service.

4. **Sondes approfondies**

   ```bash
   openclaw status --deep
   ```

   Exécute une sonde de santé de la passerelle en direct, incluant les sondes de channel lorsque prises en charge
   (nécessite une passerelle accessible). Voir [Health](/fr/gateway/health).

5. **Suivre les derniers journaux**

   ```bash
   openclaw logs --follow
   ```

   Si le RPC est en panne, revenez à :

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Les journaux de fichiers sont distincts des journaux de service ; voir [Logging](/fr/logging) et [Troubleshooting](/fr/gateway/troubleshooting).

6. **Exécuter le docteur (réparations)**

   ```bash
   openclaw doctor
   ```

   Répare/migre la configuration/l'état + exécute des vérifications de santé. Voir [Doctor](/fr/gateway/doctor).

7. **Instantané de la passerelle**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Demande à la passerelle en cours d'exécution un instantané complet (WS uniquement). Voir [Health](/fr/gateway/health).

## Démarrage rapide et configuration initiale

Q&A de première exécution — installation, intégration, routes d'auth, abonnements, échecs initiaux —
se trouve sur la [First-run FAQ](/fr/help/faq-first-run).

## Qu'est-ce qu'OpenClaw ?

<AccordionGroup>
  <Accordion title="Qu'est-ce qu'OpenClaw, en un paragraphe ?">
    OpenClaw est un assistant IA personnel que vous exécutez sur vos propres appareils. Il répond sur les surfaces de messagerie que vous utilisez déjà (WhatsApp, Telegram, Slack, Mattermost, Discord, Google Chat, Signal, iMessage, WebChat et des plugins de canal groupés tels que QQ Bot) et peut également gérer la voix + un Canvas en direct sur les plateformes prises en charge. Le **Gateway** est le plan de contrôle toujours actif ; l'assistant est le produit.
  </Accordion>

  <Accordion title="Proposition de valeur"OpenClawGatewayLinuxWhatsAppTelegramSlackDiscordSignaliMessageCanvasAnthropicOpenAIMiniMaxOpenRouterGateway>
    OpenClaw n'est pas "simplement un enveloppeur de Claude". C'est un **plan de contrôle local-first** qui vous permet d'exécuter un
    assistant capable sur **votre propre matériel**, accessible depuis les applications de chat que vous utilisez déjà, avec
    des sessions avec état, de la mémoire et des outils - sans céder le contrôle de vos flux de travail à un
    SaaS hébergé.

    Points forts :

    - **Vos appareils, vos données :** exécutez la Gateway où vous le souhaitez (Mac, Linux, VPS) et gardez l'espace de travail
      + l'historique des sessions en local.
    - **Vrais canaux, pas un bac à sable web :** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc,
      ainsi que la voix mobile et Canvas sur les plateformes prises en charge.
    - **Agnostique aux modèles :** utilisez Anthropic, OpenAI, MiniMax, OpenRouter, etc., avec un routage
      et une bascule par agent.
    - **Option uniquement locale :** exécutez des modèles locaux pour que **toutes les données puissent rester sur votre appareil** si vous le souhaitez.
    - **Routage multi-agents :** séparez les agents par canal, compte ou tâche, chacun avec son propre
      espace de travail et ses propres paramètres par défaut.
    - **Open source et hackable :** inspectez, étendez et auto-hébergez sans dépendance vis-à-vis d'un fournisseur.

    Docs : [Gateway](/fr/gateway), [Canaux](/fr/channels), [Multi-agent](/fr/concepts/multi-agent),
    [Mémoire](/fr/concepts/memory).

  </Accordion>

  <Accordion title="Je viens de l'installer - que dois-je faire en premier ?">
    Bons premiers projets :

    - Créer un site web (WordPress, Shopify ou un site statique simple).
    - Prototyper une application mobile (plan, écrans, plan API).
    - Organiser les fichiers et dossiers (nettoyage, nommage, balisage).
    - Connecter Gmail et automatiser les résumés ou les suivis.

    Il peut gérer de grandes tâches, mais fonctionne mieux lorsque vous les divisez en phases et utilisez des sous-agents pour le travail parallèle.

  </Accordion>

  <Accordion title="Quels sont les cinq principaux cas d'usage quotidiens pour OpenClaw ?">
    Les succès quotidiens ressemblent généralement à :

    - **Briefings personnels :** résumés de votre boîte de réception, de votre agenda et des actualités qui vous intéressent.
    - **Recherche et rédaction :** recherche rapide, résumés et premières versions de courriels ou de documents.
    - **Rappels et suivis :** relances et listes de contrôle basées sur cron ou le rythme cardiaque.
    - **Automatisation du navigateur :** remplissage de formulaires, collecte de données et répétition de tâches web.
    - **Coordination multi-appareils :** envoyez une tâche depuis votre téléphone, laissez le Gateway l'exécuter sur un serveur et récupérez le résultat dans le chat.

  </Accordion>

  <Accordion title="OpenClawOpenClaw peut-il aider avec la génération de leads, le prospection, la publicité et les blogs pour un SaaS ?"OpenClaw>
    Oui pour la **recherche, la qualification et la rédaction**. Il peut scanner des sites, constituer des listes restreintes,
    résumer des prospects et rédiger des brouillons de prospection ou de publicités.

    Pour les **campagnes de prospection ou publicitaires**, gardez un humain dans la boucle. Évitez le spam, respectez les lois locales et
    les politiques des plateformes, et examinez tout avant l'envoi. Le modèle le plus sûr est de laisser
    OpenClaw rédiger et que vous approuviez.

    Docs : [Sécurité](/fr/gateway/security).

  </Accordion>

  <Accordion title="Quels sont les avantages par rapport à Claude Code pour le développement web ?"OpenClawOpenClawWhatsAppTelegramTUIWebChatGateway>
    OpenClaw est un **assistant personnel** et une couche de coordination, et non un remplacement d'IDE. Utilisez
    Claude Code ou Codex pour la boucle de codage direct la plus rapide dans un dépôt. Utilisez OpenClaw lorsque vous
    souhaitez une mémoire persistante, un accès multi-appareils et une orchestration d'outils.

    Avantages :

    - **Mémoire persistante + espace de travail** sur plusieurs sessions
    - **Accès multiplateforme** (WhatsApp, Telegram, TUI, WebChat)
    - **Orchestration d'outils** (navigateur, fichiers, planification, hooks)
    - **Gateway toujours actif** (exécuté sur un VPS, accessible de n'importe où)
    - **Nœuds** pour le navigateur/écran/caméra/exec local

    Démonstration : [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills et automatisation

<AccordionGroup>
  <Accordion title="Comment personnaliser les compétences sans salir le dépôt ?">
    Utilisez les substitutions gérées au lieu de modifier la copie du dépôt. Placez vos modifications dans `~/.openclaw/skills/<name>/SKILL.md` (ou ajoutez un dossier via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json`). La priorité est `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`, donc les substitutions gérées priment toujours sur les compétences groupées sans toucher à git. Si vous avez besoin que la compétence soit installée globalement mais visible uniquement par certains agents, gardez la copie partagée dans `~/.openclaw/skills` et contrôlez la visibilité avec `agents.defaults.skills` et `agents.list[].skills`. Seules les modifications dignes d'être intégrées en amont devraient figurer dans le dépôt et être envoyées sous forme de PRs.
  </Accordion>

  <Accordion title="Puis-je charger des compétences depuis un dossier personnalisé ?">
    Oui. Ajoutez des répertoires supplémentaires via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json` (la priorité la plus basse). La priorité par défaut est `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`. `clawhub` installe dans `./skills` par défaut, qu'OpenClaw traite comme `<workspace>/skills` lors de la prochaine session. Si la compétence ne doit être visible que pour certains agents, associez-la à `agents.defaults.skills` ou `agents.list[].skills`.
  </Accordion>

  <Accordion title="Comment puis-je utiliser différents modèles pour différentes tâches ?">
    Aujourd'hui, les modèles pris en charge sont :

    - **Tâches Cron** : les tâches isolées peuvent définir une substitution `model` par tâche.
    - **Sous-agents** : acheminez les tâches vers des agents distincts avec différents modèles par défaut.
    - **Commutation à la demande** : utilisez `/model` pour changer le modèle de la session actuelle à tout moment.

    Voir [Tâches Cron](/fr/automation/cron-jobs), [Routage Multi-Agent](/fr/concepts/multi-agent) et [Commandes Slash](/fr/tools/slash-commands).

  </Accordion>

  <Accordion title="Le bot se fige pendant l'exécution de tâches lourdes. Comment délester cela ?">
    Utilisez des **sous-agents** pour les tâches longues ou parallèles. Les sous-agents s'exécutent dans leur propre session,
    renvoient un résumé et gardent votre discussion principale réactive.

    Demandez à votre bot de « lancer un sous-agent pour cette tâche » ou utilisez `/subagents`.
    Utilisez `/status` dans le chat pour voir ce que le Gateway est en train de faire (et s'il est occupé).

    Conseil sur les jetons : les tâches longues et les sous-agents consomment tous deux des jetons. Si le coût est un problème, définissez un
    model moins coûteux pour les sous-agents via `agents.defaults.subagents.model`.

    Docs : [Sous-agents](/fr/tools/subagents), [Tâches d'arrière-plan](/fr/automation/tasks).

  </Accordion>

  <Accordion title="DiscordComment fonctionnent les sessions de sous-agent liées aux fils sur Discord ?"Discord>
    Utilisez les liaisons de fils (thread bindings). Vous pouvez lier un fil Discord à une cible de sous-agent ou de session afin que les messages de suivi dans ce fil restent sur cette session liée.

    Flux de base :

    - Lancez avec `sessions_spawn` en utilisant `thread: true` (et optionnellement `mode: "session"` pour un suivi persistant).
    - Ou liez manuellement avec `/focus <target>`.
    - Utilisez `/agents` pour inspecter l'état de la liaison.
    - Utilisez `/session idle <duration|off>` et `/session max-age <duration|off>` pour contrôler le défocus automatique.
    - Utilisez `/unfocus` pour détacher le fil.

    Configuration requise :

    - Valeurs globales par défaut : `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`Discord.
    - Remplacements Discord : `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Liaison automatique au lancement : `channels.discord.threadBindings.spawnSessions` est par défaut `true` ; définissez-le sur `false` pour désactiver les lancements de sessions liées aux fils.

    Documentation : [Sous-agents](/fr/tools/subagentsDiscord), [Discord](/fr/channels/discord), [Référence de configuration](/fr/gateway/configuration-reference), [Commandes slash](/fr/tools/slash-commands).

  </Accordion>

  <Accordion title="Un sous-agent a terminé, mais la mise à jour de la complétion est allée au mauvais endroit ou n'a jamais été publiée. Que dois-je vérifier ?"OpenClaw>
    Vérifiez d'abord la route du demandeur résolue :

    - La livraison des sous-agents en mode complétion préfère toute route de fil ou de conversation liée lorsqu'une existe.
    - Si l'origine de la complétion ne porte qu'un channel, OpenClaw revient à la route stockée de la session du demandeur (`lastChannel` / `lastTo` / `lastAccountId`) afin que la livraison directe puisse encore réussir.
    - Si ni une route liée ni une route stockée utilisable n'existe, la livraison directe peut échouer et le résultat revient à la livraison en file d'attente de la session au lieu d'être publié immédiatement dans le chat.
    - Des cibles invalides ou obsolètes peuvent toujours forcer le retour en file d'attente ou l'échec final de la livraison.
    - Si la dernière réponse visible de l'assistant de l'enfant est le jeton silencieux exact `NO_REPLY` / `no_reply`, ou exactement `ANNOUNCE_SKIP`OpenClaw, OpenClaw supprime intentionnellement l'annonce au lieu de publier une progression antérieure obsolète.
    - Si l'enfant a expiré après seulement des appels de tool, l'annonce peut réduire cela en un résumé court de progression partielle au lieu de rejouer la sortie brute du tool.

    Débogage :

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    Docs : [Sous-agents](/fr/tools/subagents), [Tâches d'arrière-plan](/fr/automation/tasks), [Outils de session](/fr/concepts/session-tool).

  </Accordion>

  <Accordion title="Les tâches cron ou les rappels ne se déclenchent pas. Que dois-je vérifier ?"GatewayGateway>
    Cron s'exécute dans le processus Gateway. Si le Gateway ne fonctionne pas en continu,
    les tâches planifiées ne s'exécuteront pas.

    Liste de contrôle :

    - Confirmez que cron est activé (`cron.enabled`) et que `OPENCLAW_SKIP_CRON`Gateway n'est pas défini.
    - Vérifiez que le Gateway fonctionne 24h/24 (pas de mise en veille/redémarrages).
    - Vérifiez les paramètres de fuseau horaire pour la tâche (`--tz` par rapport au fuseau horaire de l'hôte).

    Débogage :

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    Docs : [Tâches cron](/fr/automation/cron-jobs), [Automatisation](/fr/automation).

  </Accordion>

  <Accordion title="Cron déclenché, mais rien n'a été envoyé sur le channel. Pourquoi ?">
    Vérifiez d'abord le mode de livraison :

    - `--no-deliver` / `delivery.mode: "none"` signifie qu'aucun envoi de repli par le runner n'est prévu.
    - Une cible d'annonce manquante ou non valide (`channel` / `to`) signifie que le runner a ignoré la livraison sortante.
    - Les échecs d'authentification du channel (`unauthorized`, `Forbidden`) signifient que le runner a tenté de livrer mais que les identifiants l'ont bloqué.
    - Un résultat isolé silencieux (`NO_REPLY` / `no_reply` uniquement) est considéré comme intentionnellement non livrable, donc le runner supprime également la livraison de repli mise en file d'attente.

    Pour les tâches cron isolées, l'agent peut toujours envoyer directement avec l'outil `message`
    lorsqu'une route de discussion est disponible. `--announce` contrôle uniquement le chemin de repli
    du runner pour le texte final que l'agent n'a pas déjà envoyé.

    Débogage :

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentation : [Tâches Cron](/fr/automation/cron-jobs), [Tâches d'arrière-plan](/fr/automation/tasks).

  </Accordion>

  <Accordion title="Pourquoi une exécution cron isolée a-t-elle changé de model ou réessayé une fois ?">
    C'est généralement le chemin de changement de model en direct, et non une planification en double.

    Le cron isolé peut persister un transfert de model à l'exécution et réessayer lorsque l'exécution
    active génère `LiveSessionModelSwitchError`. La nouvelle tentative conserve le provider/model
    changé, et si le changement comportait un nouveau profil d'authentification, cron
    le persiste également avant de réessayer.

    Règles de sélection connexes :

    - La priorité au model du hook Gmail l'emporte d'abord le cas échéant.
    - Ensuite, `model` par tâche.
    - Ensuite, tout remplacement de model de session cron stocké.
    - Ensuite, la sélection normale du model agent/défaut.

    La boucle de nouvelle tentative est limitée. Après la tentative initiale plus 2 nouvelles tentatives de changement,
    cron abandonne au lieu de boucler indéfiniment.

    Débogage :

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Documentation : [Tâches Cron](/fr/automation/cron-jobs), [cron CLI](/fr/cli/cron).

  </Accordion>

  <Accordion title="Comment installer des compétences sur Linux ?">
    Utilisez les commandes natives `openclaw skills` ou déposez les compétences dans votre espace de travail. L'interface utilisateur Skills de macOS n'est pas disponible sur Linux.
    Parcourez les compétences sur [https://clawhub.ai](https://clawhub.ai).

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills update --all
    openclaw skills list --eligible
    openclaw skills check
    ```

    Le `openclaw skills install` natif écrit dans le répertoire de l'espace de travail actif `skills/`.
    Installez le CLI `clawhub` séparé uniquement si vous souhaitez publier ou
    synchroniser vos propres compétences. Pour les installations partagées entre les agents, placez la compétence sous
    `~/.openclaw/skills` et utilisez `agents.defaults.skills` ou
    `agents.list[].skills` si vous souhaitez limiter les agents qui peuvent la voir.

  </Accordion>

  <Accordion title="OpenClaw%PH:GLOSSARY:954:dcc8fedd%% peut-il exécuter des tâches selon un calendrier ou en continu en arrière-plan ?">
    Oui. Utilisez le planificateur Gateway :

    - **Cron jobs** pour les tâches planifiées ou récurrentes (persistance après redémarrage).
    - **Heartbeat** pour les vérifications périodiques de la "session principale".
    - **Isolated jobs** pour les agents autonomes qui publient des résumés ou livrent aux chats.

    Docs : [Cron jobs](/fr/automation/cron-jobs), [Automation](/fr/automation),
    [Heartbeat](/fr/gateway/heartbeat).

  </Accordion>

  <Accordion title="Puis-je exécuter des compétences exclusives à Apple macOS depuis Linux ?">
    Pas directement. Les compétences macOS sont limitées par `metadata.openclaw.os` ainsi que par les binaires requis, et ces compétences n'apparaissent dans l'invite système que lorsqu'elles sont éligibles sur l'**hôte Gateway**. Sur Linux, les compétences exclusives à `darwin` (telles que `apple-notes`, `apple-reminders`, `things-mac`) ne se chargeront pas à moins que vous ne neutralisiez ces restrictions.

    Vous avez trois modèles pris en charge :

    **Option A - exécuter le Gateway sur un Mac (le plus simple).**
    Exécutez le Gateway là où se trouvent les binaires macOS, puis connectez-vous depuis Linux en [mode distant](#gateway-ports-already-running-and-remote-mode) ou via Tailscale. Les compétences se chargent normalement car l'hôte du Gateway est macOS.

    **Option B - utiliser un nœud macOS (pas de SSH).**
    Exécutez le Gateway sur Linux, associez un nœud macOS (application de barre de menus), et définissez les **Commandes d'exécution du nœud** sur « Toujours demander » ou « Toujours autoriser » sur le Mac. OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque les binaires requis existent sur le nœud. L'agent exécute ces compétences via l'outil `nodes`. Si vous choisissez « Toujours demander », approuver « Toujours autoriser » dans l'invite ajoute cette commande à la liste d'autorisation.

    **Option C - proxy des binaires macOS via SSH (avancé).**
    Gardez le Gateway sur Linux, mais faites en sorte que les binaires requis de la CLI pointent vers des enveloppeurs (wrappers) SSH qui s'exécutent sur un Mac. Ensuite, substituez les métadonnées de la compétence pour autoriser Linux afin qu'elle reste éligible.

    1. Créez un enveloppeur SSH pour le binaire (exemple : `memo` pour Apple Notes) :

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Placez l'enveloppeur sur `PATH` sur l'hôte Linux (par exemple `~/bin/memo`).
    3. Substituez les métadonnées de la compétence (espace de travail ou `~/.openclaw/skills`) pour autoriser Linux :

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. Démarrez une nouvelle session pour que l'instantané des compétences soit actualisé.

  </Accordion>

  <Accordion title="Avez-vous une intégration Notion ou HeyGen ?">
    Non intégrée nativement pour le moment.

    Options :

    - **Skill / plugin personnalisé :** idéal pour un accès fiable à l'API (Notion et HeyGen disposent tous deux d'API).
    - **Automatisation du navigateur :** fonctionne sans code mais est plus lent et plus fragile.

    Si vous souhaitez conserver le contexte par client (flux de travail d'agence), un modèle simple consiste à :

    - Une page Notion par client (contexte + préférences + travail en cours).
    - Demander à l'agent de récupérer cette page au début d'une session.

    Si vous souhaitez une intégration native, ouvrez une demande de fonctionnalité ou créez une skill
    ciblant ces API.

    Installer des skills :

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    Les installations natives atterrissent dans le répertoire de l'espace de travail actif `skills/`. Pour les skills partagées entre les agents, placez-les dans `~/.openclaw/skills/<name>/SKILL.md`. Si seulement certains agents doivent voir une installation partagée, configurez `agents.defaults.skills` ou `agents.list[].skills`. Certaines skills s'attendent à des binaires installés via Homebrew ; sur Linux, cela signifie Linuxbrew (voir l'entrée FAQ de Homebrew pour Linux ci-dessus). Voir [Skills](/fr/tools/skills), [Configuration des skills](/fr/tools/skills-config) et [ClawHub](/fr/clawhub).

  </Accordion>

  <Accordion title="Comment utiliser mon Chrome connecté existant avec OpenClaw ?">
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

    Ce chemin peut utiliser le navigateur de l'hôte local ou un nœud de navigateur connecté. Si le Gateway s'exécute ailleurs, exécutez soit un hôte de nœud sur la machine du navigateur, soit utilisez le CDP distant à la place.

    Limites actuelles sur `existing-session` / `user` :

    - les actions sont basées sur les références, pas sur les sélecteurs CSS
    - les téléchargements nécessitent `ref` / `inputRef` et prennent actuellement en charge un seul fichier à la fois
    - `responsebody`, l'exportation PDF, l'interception des téléchargements et les actions par lots nécessitent toujours un navigateur géré ou un profil CDP brut

  </Accordion>
</AccordionGroup>

## Bac à sable (Sandboxing) et mémoire

<AccordionGroup>
  <Accordion title="Existe-t-il une documentation dédiée au sandboxing ?">
    Oui. Voir [Sandboxing](/fr/gateway/sandboxing). Pour une configuration spécifique à Docker (passerelle complète dans Docker ou images de sandbox), voir [Docker](/fr/install/docker).
  </Accordion>

  <Accordion title="DockerDocker semble limité - comment activer toutes les fonctionnalités ?">
    L'image par défaut privilégie la sécurité et s'exécute en tant qu'utilisateur `node`, elle n'inclut donc pas
    les packages système, Homebrew ou les navigateurs intégrés. Pour une configuration plus complète :

    - Persistez `/home/node` avec `OPENCLAW_HOME_VOLUME` afin que les caches survivent.
    - Intégrez les dépendances système dans l'image avec `OPENCLAW_DOCKER_APT_PACKAGES`CLI.
    - Installez les navigateurs Playwright via le CLI intégré :
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Définissez `PLAYWRIGHT_BROWSERS_PATH`Docker et assurez-vous que le chemin est persisté.

    Docs : [Docker](/fr/install/docker), [Navigateur](/fr/tools/browser).

  </Accordion>

  <Accordion title="Puis-je garder les DMs personnels mais rendre les groupes publics/sandboxés avec un seul agent ?">
    Oui - si votre trafic privé est constitué de **DMs** et votre trafic public de **groupes**.

    Utilisez `agents.defaults.sandbox.mode: "non-main"`Docker afin que les sessions de groupe/canal (clés non principales) s'exécutent dans le backend de sandbox configuré, tandis que la session DM principale reste sur l'hôte. Docker est le backend par défaut si vous n'en choisissez pas un. Restreignez ensuite les outils disponibles dans les sessions sandboxées via `tools.sandbox.tools`.

    Procédure de configuration + exemple de config : [Groupes : DMs personnels + groupes publics](/fr/channels/groups#pattern-personal-dms-public-groups-single-agentGateway)

    Référence de configuration clé : [Configuration Gateway](/fr/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="Comment lier un dossier de l'hôte au bac à sable ?">
    Définissez `agents.defaults.sandbox.docker.binds` sur `["host:path:mode"]` (par ex., `"/home/user/src:/src:ro"`). Les liaisons globales et par agent sont fusionnées ; les liaisons par agent sont ignorées lorsque `scope: "shared"`. Utilisez `:ro`OpenClaw pour tout ce qui est sensible et rappelez-vous que les liaisons contournent les murs du système de fichiers du bac à sable.

    OpenClaw valide les sources de liaison par rapport à la fois au chemin normalisé et au chemin canonique résolu via l'ancêtre existant le plus profond. Cela signifie que les échappements par parent de lien symbolique échouent toujours même si le dernier segment du chemin n'existe pas encore, et que les vérifications de racine autorisée s'appliquent toujours après la résolution des liens symboliques.

    Voir [Sandboxing](/fr/gateway/sandboxing#custom-bind-mounts) et [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) pour des exemples et des notes de sécurité.

  </Accordion>

  <Accordion title="Comment fonctionne la mémoire ?"OpenClaw>
    La mémoire OpenClaw se compose simplement de fichiers Markdown dans l'espace de travail de l'agent :

    - Notes quotidiennes dans `memory/YYYY-MM-DD.md`
    - Notes à long terme triées dans `MEMORY.md`OpenClaw (sessions principales/privées uniquement)

    OpenClaw exécute également un **vidange de mémoire silencieuse pré-compaction** pour rappeler au model d'écrire des notes durables avant la auto-compaction. Cela ne s'exécute que lorsque l'espace de travail est inscriptible (les bacs à sable en lecture seule l'ignorent). Voir [Memory](/fr/concepts/memory).

  </Accordion>

  <Accordion title="La mémoire continue d'oublier des choses. Comment faire pour qu'elle retienne ?">
    Demandez au bot d'**écrire le fait en mémoire**. Les notes à long terme appartiennent à `MEMORY.md`,
    le contexte à court terme va dans `memory/YYYY-MM-DD.md`Gateway.

    C'est encore un domaine que nous améliorons. Il est utile de rappeler au model de stocker des souvenirs ;
    il saura quoi faire. S'il continue d'oublier, vérifiez que la Gateway utilise le même
    espace de travail à chaque exécution.

    Documentation : [Memory](/fr/concepts/memory), [Agent workspace](/fr/concepts/agent-workspace).

  </Accordion>

  <Accordion title="La mémoire persiste-t-elle pour toujours ? Quelles sont les limites ?">
    Les fichiers de mémoire résident sur le disque et persistent jusqu'à ce que vous les supprimiez. La limite est votre
    stockage, et non le model. Le **contexte de session** est toujours limité par la fenêtre de contexte du
    model, les conversations longues peuvent donc être compactées ou tronquées. C'est pourquoi
    la recherche de mémoire existe - elle ne récupère dans le contexte que les parties pertinentes.

    Documentation : [Memory](/fr/concepts/memory), [Context](/fr/concepts/context).

  </Accordion>

  <Accordion title="La recherche sémantique dans la mémoire nécessite-t-elle une clé OpenAI API ?">
    Seulement si vous utilisez les **embeddings OpenAI**. OAuth Codex couvre la conversation/les complétions et
    n'accorde **pas** l'accès aux embeddings, donc **se connecter avec Codex (OAuthCLI ou la
    connexion CLI Codex)** n'aide pas pour la recherche sémantique dans la mémoire. Les embeddings OpenAI
    nécessitent toujours une véritable clé API (`OPENAI_API_KEY` ou `models.providers.openai.apiKey`).

    Si vous ne définissez pas de fournisseur explicitement, OpenClaw en sélectionne un automatiquement lorsqu'il
    peut résoudre une clé API (profils d'authentification, `models.providers.*.apiKey`, ou env vars).
    Il préfère OpenAI si une clé OpenAI est résolue, sinon Gemini si une clé Gemini
    est résolue, puis Voyage, puis Mistral. Si aucune clé distante n'est disponible, la recherche
    de mémoire reste désactivée jusqu'à ce que vous la configuriez. Si vous avez un chemin de modèle local
    configuré et présent, OpenClaw
    préfère `local`. Ollama est pris en charge lorsque vous définissez explicitement
    `memorySearch.provider = "ollama"`.

    Si vous préférez rester local, définissez `memorySearch.provider = "local"` (et facultativement
    `memorySearch.fallback = "none"`). Si vous voulez des embeddings Gemini, définissez
    `memorySearch.provider = "gemini"` et fournissez `GEMINI_API_KEY` (ou
    `memorySearch.remote.apiKey`). Nous prenons en charge les modèles d'embeddings **OpenAI, Gemini, Voyage, Mistral, Ollama ou local**
    - consultez [Memory](/fr/concepts/memory) pour les détails de la configuration.

  </Accordion>
</AccordionGroup>

## Emplacement des fichiers sur le disque

<AccordionGroup>
  <Accordion title="OpenClawToutes les données utilisées avec OpenClaw sont-elles enregistrées localement ?"OpenClawGateway>
    Non - **l'état d'OpenClaw est local**, mais **les services externes voient toujours ce que vous leur envoyez**.

    - **Local par défaut :** les sessions, les fichiers de mémoire, la configuration et l'espace de travail résident sur l'hôte de la Gateway
      (`~/.openclaw`AnthropicOpenAIWhatsAppTelegramSlack + votre répertoire d'espace de travail).
    - **Distant par nécessité :** les messages que vous envoyez aux fournisseurs de modèles (Anthropic/OpenAI/etc.) sont envoyés à
      leurs API, et les plateformes de discussion (WhatsApp/Telegram/Slack/etc.) stockent les données des messages sur leurs
      serveurs.
    - **Vous contrôlez l'empreinte :** l'utilisation de modèles locaux garde les requêtes sur votre machine, mais le trafic du
      channel passe toujours par les serveurs de ce channel.

    Connexes : [Espace de travail de l'agent](/fr/concepts/agent-workspace), [Mémoire](/fr/concepts/memory).

  </Accordion>

  <Accordion title="OpenClawOù OpenClaw stocke-t-il ses données ?">
    Tout se trouve sous `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) :

    | Chemin                                                            | Objectif                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Config principale (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`OAuth                    | Import OAuth hérité (copié dans les profils d'auth lors de la première utilisation)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json`OAuthAPI | Profils d'auth (OAuth, clés API et `keyRef`/`tokenRef` optionnels)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Charge utile de secret optionnelle sauvegardée dans un fichier pour les fournisseurs SecretRef `file` |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Fichier de compatibilité hérité (entrées statiques `api_key` nettoyées)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | État du fournisseur (ex : `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | État par agent (agentDir + sessions)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historique des conversations et état (par agent)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Métadonnées de session (par agent)                                       |

    Chemin hérité à agent unique : `~/.openclaw/agent/*` (migré par `openclaw doctor`).

    Votre **espace de travail** (AGENTS.md, fichiers de mémoire, compétences, etc.) est séparé et configuré via `agents.defaults.workspace` (par défaut : `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="Où doivent se trouver AGENTS.md / SOUL.md / USER.md / MEMORY.md ?">
    Ces fichiers se trouvent dans l'**espace de travail de l'agent** (agent workspace), et non dans `~/.openclaw`.

    - **Espace de travail (par agent)** : `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md`, `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` en option.
      La racine en minuscules `memory.md` est une entrée de réparation héritée uniquement ; `openclaw doctor --fix`
      peut la fusionner dans `MEMORY.md` lorsque les deux fichiers existent.
    - **Répertoire d'état (`~/.openclaw`)** : configuration, état du canal/fournisseur, profils d'authentification, sessions, journaux,
      et compétences partagées (`~/.openclaw/skills`).

    L'espace de travail par défaut est `~/.openclaw/workspace`, configurable via :

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si le bot "oublie" après un redémarrage, confirmez que le Gateway utilise le même
    espace de travail à chaque lancement (et rappelez-vous : le mode distant utilise l'espace de travail de l'**hôte de la passerelle**,
    et non celui de votre ordinateur portable local).

    Astuce : si vous souhaitez un comportement ou une préférence durable, demandez au bot de **l'écrire dans
    AGENTS.md ou MEMORY.md** plutôt que de vous fier à l'historique des discussions.

    Voir [Agent workspace](/fr/concepts/agent-workspace) et [Memory](/fr/concepts/memory).

  </Accordion>

  <Accordion title="Stratégie de sauvegarde recommandée">
    Placez votre **espace de travail de l'agent** (agent workspace) dans un dépôt git **privé** et sauvegardez-le quelque part
    de privé (par exemple, privé sur GitHub). Cela capture la mémoire + les fichiers AGENTS/SOUL/USER
    et vous permet de restaurer l'"esprit" de l'assistant plus tard.

    **Ne** commitez rien sous `~/.openclaw` (identifiants, sessions, jetons ou charges utiles de secrets chiffrés).
    Si vous avez besoin d'une restauration complète, sauvegardez séparément l'espace de travail et le répertoire d'état
    (voir la question sur la migration ci-dessus).

    Documentation : [Agent workspace](/fr/concepts/agent-workspace).

  </Accordion>

<Accordion title="OpenClawComment désinstaller complètement OpenClaw ?">Voir le guide dédié : [Uninstall](/fr/install/uninstall).</Accordion>

  <Accordion title="Les agents peuvent-ils travailler en dehors de l'espace de travail ?">
    Oui. L'espace de travail est le **répertoire de travail par défaut (cwd)** et l'ancre de mémoire, et non un bac à sable strict.
    Les chemins relatifs sont résolus dans l'espace de travail, mais les chemins absolus peuvent accéder à d'autres
    emplacements de l'hôte, sauf si le bac à sable (sandboxing) est activé. Si vous avez besoin d'isolement, utilisez
    [`agents.defaults.sandbox`](/fr/gateway/sandboxing) ou les paramètres de bac à sable par agent. Si vous
    souhaitez qu'un dépôt soit le répertoire de travail par défaut, définissez le
    `workspace`OpenClaw de cet agent vers la racine du dépôt. Le dépôt OpenClaw n'est que du code source ; gardez l'
    espace de travail séparé, sauf si vous souhaitez intentionnellement que l'agent travaille à l'intérieur.

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

  </Accordion>

  <Accordion title="Mode distant : où se trouve le magasin de sessions ?">
    L'état de la session appartient à l'**hôte de la passerelle**. Si vous êtes en mode distant, le magasin de sessions qui vous concerne se trouve sur la machine distante, et non sur votre ordinateur portable local. Voir [Session management](/fr/concepts/session).
  </Accordion>
</AccordionGroup>

## Config basics

<AccordionGroup>
  <Accordion title="Quel est le format de la configuration ? Où se trouve-t-elle ?"OpenClaw>
    OpenClaw lit une configuration **JSON5** optionnelle à partir de `$OPENCLAW_CONFIG_PATH` (par défaut : `~/.openclaw/openclaw.json`) :

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    Si le fichier est manquant, il utilise des paramètres par défaut sûrs (y compris un espace de travail par défaut de `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title='J'ai défini gateway.bind : "lan" (ou "tailnet") et maintenant rien n'écoute / l'interface indique non autorisé'>
    Les liaisons non-boucle (**non-loopback**) **nécessitent un chemin d'authentification passerelle valide**. En pratique, cela signifie :

    - authentification par secret partagé : jeton ou mot de passe
    - `gateway.auth.mode: "trusted-proxy"` derrière un proxy inverse identitaire correctement configuré

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

    - `gateway.remote.token` / `.password` n'activent **pas** l'authentification de passerelle locale par eux-mêmes.
    - Les chemins d'appel locaux peuvent utiliser `gateway.remote.*` comme solution de repli uniquement lorsque `gateway.auth.*` n'est pas défini.
    - Pour l'authentification par mot de passe, définissez `gateway.auth.mode: "password"` plus `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`) à la place.
    - Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue fermement (pas de masquage de repli distant).
    - Les configurations d'interface de contrôle avec secret partagé s'authentifient via `connect.params.auth.token` ou `connect.params.auth.password`Tailscale (stockés dans les paramètres de l'application/interface). Les modes porteurs d'identité tels que Tailscale Serve ou `trusted-proxy` utilisent plutôt les en-têtes de requête. Évitez de mettre des secrets partagés dans les URL.
    - Avec `gateway.auth.mode: "trusted-proxy"`, les proxies inverses de boucle sur le même hôte nécessitent un `gateway.auth.trustedProxy.allowLoopback = true` explicite et une entrée de boucle dans `gateway.trustedProxies`.

  </Accordion>

  <Accordion title="Pourquoi ai-je besoin d'un jeton sur localhost maintenant ?"OpenClaw>
    OpenClaw applique l'authentification de la Gateway par défaut, y compris pour le bouclage (loopback). Dans le chemin par défaut normal, cela signifie l'authentification par jeton : si aucun chemin d'authentification explicite n'est configuré, le démarrage de la Gateway se résout en mode jeton et génère un jeton valable uniquement pour ce démarrage, donc **les clients WS locaux doivent s'authentifier**. Configurez `gateway.auth.token`, `gateway.auth.password`, `OPENCLAW_GATEWAY_TOKEN`, ou `OPENCLAW_GATEWAY_PASSWORD`Gateway explicitement lorsque les clients ont besoin d'un secret stable entre les redémarrages. Cela empêche les autres processus locaux d'appeler la Gateway.

    Si vous préférez un chemin d'authentification différent, vous pouvez explicitement choisir le mode mot de passe (ou, pour les proxys inversés conscients de l'identité, `trusted-proxy`). Si vous voulez **vraiment** un bouclage ouvert, définissez `gateway.auth.mode: "none"` explicitement dans votre configuration. Doctor peut générer un jeton pour vous à tout moment : `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="Dois-je redémarrer après avoir modifié la configuration ?"Gateway>
    La Gateway surveille la configuration et prend en charge le rechargement à chaud (hot-reload) :

    - `gateway.reload.mode: "hybrid"` (par défaut) : applique à chaud les modifications sûres, redémarre pour les modifications critiques
    - `hot`, `restart`, `off` sont également pris en charge

  </Accordion>

  <Accordion title="CLIComment désactiver les slogans amusants du CLI ?">
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
    - `random` : rotation des slogans amusants/saisonniers (comportement par défaut).
    - Si vous ne voulez aucune bannière du tout, définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

  </Accordion>

  <Accordion title="Comment activer la recherche web (et la récupération web) ?">
    `web_fetch` fonctionne sans clé API. `web_search` dépend de votre fournisseur
    sélectionné :

    - Les fournisseurs basés sur une API tels que Brave, Exa, Firecrawl, Gemini, Grok, Kimi, MiniMax Search, Perplexity et Tavily nécessitent leur configuration normale de clé API.
    - La recherche web Ollama est sans clé, mais elle utilise votre hôte Ollama configuré et nécessite `ollama signin`.
    - DuckDuckGo est sans clé, mais c'est une intégration non officielle basée sur HTML.
    - SearXNG est sans clé/auto-hébergé ; configurez `SEARXNG_BASE_URL` ou `plugins.entries.searxng.config.webSearch.baseUrl`.

    **Recommandé :** exécutez `openclaw configure --section web` et choisissez un fournisseur.
    Alternatives d'environnement :

    - Brave : `BRAVE_API_KEY`
    - Exa : `EXA_API_KEY`
    - Firecrawl : `FIRECRAWL_API_KEY`
    - Gemini : `GEMINI_API_KEY`
    - Grok : `XAI_API_KEY`
    - Kimi : `KIMI_API_KEY` ou `MOONSHOT_API_KEY`
    - MiniMax Search : `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY` ou `MINIMAX_API_KEY`
    - Perplexity : `PERPLEXITY_API_KEY` ou `OPENROUTER_API_KEY`
    - SearXNG : `SEARXNG_BASE_URL`
    - Tavily : `TAVILY_API_KEY`

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
              provider: "firecrawl", // optional; omit for auto-detect
            },
          },
        },
    }
    ```

    La configuration de recherche web spécifique au fournisseur se trouve désormais sous `plugins.entries.<plugin>.config.webSearch.*`.
    Les chemins de fournisseur `tools.web.search.*` obsolètes se chargent encore temporairement pour compatibilité, mais ils ne doivent pas être utilisés pour les nouvelles configurations.
    La configuration de repli de récupération web Firecrawl se trouve sous `plugins.entries.firecrawl.config.webFetch.*`.

    Notes :

    - Si vous utilisez des listes d'autorisation, ajoutez `web_search`/`web_fetch`/`x_search` ou `group:web`.
    - `web_fetch` est activé par défaut (sauf si désactivé explicitement).
    - Si `tools.web.fetch.provider` est omis, OpenClaw détecte automatiquement le premier fournisseur de repli de récupération prêt parmi les identifiants disponibles. Aujourd'hui, le fournisseur inclus est Firecrawl.
    - Les démons lisent les variables d'environnement depuis `~/.openclaw/.env` (ou l'environnement du service).

    Documentation : [Outils web](/fr/tools/web).

  </Accordion>

  <Accordion title="config.apply a effacé ma configuration. Comment récupérer et éviter cela ?">
    `config.apply` remplace la **configuration entière**. Si vous envoyez un objet partiel, tout
    le reste est supprimé.

    OpenClaw actuel protège contre de nombreux écrasements accidentels :

    - Les écritures de configuration détenues par OpenClaw valident la configuration complète après modification avant l'écriture.
    - Les écritures invalides ou destructrices détenues par OpenClaw sont rejetées et enregistrées sous `openclaw.json.rejected.*`.
    - Si une modification directe empêche le démarrage ou le rechargement à chaud, Gateway échoue en mode fermé ou ignore le rechargement ; il ne réécrit pas `openclaw.json`.
    - `openclaw doctor --fix` gère la réparation et peut restaurer la dernière configuration connue bonne tout en enregistrant le fichier rejeté sous `openclaw.json.clobbered.*`.

    Récupération :

    - Vérifiez `openclaw logs --follow` pour `Invalid config at`, `Config write rejected:`, ou `config reload skipped (invalid config)`.
    - Inspectez le plus récent `openclaw.json.clobbered.*` ou `openclaw.json.rejected.*` à côté de la configuration active.
    - Exécutez `openclaw config validate` et `openclaw doctor --fix`.
    - Copiez uniquement les clés souhaitées avec `openclaw config set` ou `config.patch`.
    - Si vous n'avez aucune dernière configuration connue bonne ou charge utile rejetée, restaurez à partir d'une sauvegarde, ou relancez `openclaw doctor` et reconfigurez les canaux/modèles.
    - Si cela était inattendu, signalez un bogue et incluez votre dernière configuration connue ou toute sauvegarde.
    - Un agent de codage local peut souvent reconstruire une configuration fonctionnelle à partir des journaux ou de l'historique.

    Éviter cela :

    - Utilisez `openclaw config set` pour les petites modifications.
    - Utilisez `openclaw configure` pour les modifications interactives.
    - Utilisez `config.schema.lookup` en premier lorsque vous n'êtes pas sûr d'un chemin exact ou de la forme d'un champ ; il renvoie un nœud de schéma superficiel plus des résumés des enfants immédiats pour l'exploration.
    - Utilisez `config.patch` pour les modifications RPC partielles ; gardez `config.apply` uniquement pour le remplacement complet de la configuration.
    - Si vous utilisez l'outil `gateway` réservé au propriétaire lors d'une exécution d'agent, il rejettera toujours les écritures vers `tools.exec.ask` / `tools.exec.security` (y compris les alias `tools.bash.*` hérités qui sont normalisés vers les mêmes chemins d'exécution protégés).

    Documentation : [Config](/fr/cli/config), [Configure](/fr/cli/configure), [Gateway troubleshooting](/fr/gateway/troubleshooting#gateway-rejected-invalid-config), [Doctor](/fr/gateway/doctor).

  </Accordion>

  <Accordion title="GatewayComment faire fonctionner une passerelle centrale avec des travailleurs spécialisés sur plusieurs appareils ?"GatewayRaspberry PiGatewaySignalWhatsAppiOSAndroid>
    Le modèle courant consiste en **une passerelle** (ex. Raspberry Pi) plus des **nœuds** et des **agents** :

    - **Passerelle (centrale) :** possède les canaux (Signal/WhatsApp), le routage et les sessions.
    - **Nœuds (appareils) :** Mac/iOS/Android se connectent en tant que périphériques et exposent des outils locaux (`system.run`, `canvas`, `camera`HetznerTUIGateway).
    - **Agents (travailleurs) :** cerveaux/espaces de travail séparés pour des rôles spécifiques (ex. « ops Hetzner », « Données personnels »).
    - **Sous-agents :** lancent des tâches en arrière-plan à partir d'un agent principal lorsque vous souhaitez du parallélisme.
    - **TUI :** se connecte à la passerelle et permet de changer d'agent/session.

    Docs : [Nœuds](/fr/nodes), [Accès à distance](/fr/gateway/remote), [Routage Multi-Agent](/fr/concepts/multi-agent), [Sous-agents](/fr/tools/subagentsTUI), [TUI](/fr/web/tui).

  </Accordion>

  <Accordion title="OpenClawLe navigateur OpenClaw peut-il fonctionner en mode headless ?">
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

    La valeur par défaut est `false` (avec interface). Le mode headless est plus susceptible de déclencher des détections anti-bot sur certains sites. Voir [Navigateur](/fr/tools/browser).

    Le mode headless utilise le **même moteur Chromium** et fonctionne pour la plupart des automatisations (formulaires, clics, scraping, connexions). Les principales différences :

    - Aucune fenêtre de navigateur visible (utilisez des captures d'écran si vous avez besoin d'éléments visuels).
    - Certains sites sont plus stricts concernant l'automatisation en mode headless (CAPTCHAS, anti-bot).
      Par exemple, X/Twitter bloque souvent les sessions headless.

  </Accordion>

  <Accordion title="BraveComment utiliser Brave pour le contrôle du navigateur ?">
    Définissez `browser.executablePath`BraveGateway sur votre binaire Brave (ou tout autre navigateur basé sur Chromium) et redémarrez le Gateway.
    Consultez les exemples de configuration complets dans [Navigateur](/fr/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Gateways et nœuds distants

<AccordionGroup>
  <Accordion title="TelegramComment les commandes se propagent-elles entre Telegram, la passerelle et les nœuds ?"TelegramGatewayTelegramGateway>
    Les messages Telegram sont gérés par le **gateway**. Le gateway exécute l'agent et
    n'appelle ensuite les nœuds via le **Gateway WebSocket** que lorsqu'un outil de nœud est nécessaire :

    Telegram → Gateway → Agent → `node.*`GatewayTelegramRPC → Node → Gateway → Telegram

    Les nœuds ne voient pas le trafic provider entrant ; ils ne reçoivent que les appels RPC de nœud.

  </Accordion>

  <Accordion title="GatewayComment mon agent peut-il accéder à mon ordinateur si le Gateway est hébergé à distance ?"Gateway>
    Réponse courte : **associez votre ordinateur en tant que nœud**. Le Gateway s'exécute ailleurs, mais il peut
    appeler des outils `node.*`GatewayGatewayGatewayGatewaymacOSGateway (écran, caméra, système) sur votre machine locale via le WebSocket du Gateway.

    Configuration typique :

    1. Exécutez le Gateway sur l'hôte toujours actif (VPS/serveur domestique).
    2. Placez l'hôte du Gateway + votre ordinateur sur le même tailnet.
    3. Assurez-vous que le WS du Gateway est accessible (liaison tailnet ou tunnel SSH).
    4. Ouvrez l'application macOS localement et connectez-vous en mode **Remote sur SSH** (ou tailnet direct)
       pour qu'elle puisse s'enregistrer en tant que nœud.
    5. Approuvez le nœud sur le Gateway :

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```GatewaymacOS

    Aucun pont TCP séparé n'est requis ; les nœuds se connectent via le WebSocket du Gateway.

    Rappel de sécurité : associer un nœud macOS permet `system.run` sur cette machine. N'associez
    que des appareils de confiance, et consultez [Sécurité](/en/gateway/security).

    Documentation : [Nœuds](/en/nodesGateway), [Protocole Gateway](/en/gateway/protocolmacOS), [Mode distant macOS](/en/platforms/mac/remote), [Sécurité](/en/gateway/security).

  </Accordion>

  <Accordion title="TailscaleTailscale est connecté mais je ne reçois aucune réponse. Et maintenant ?"Gateway>
    Vérifiez les bases :

    - Le Gateway fonctionne : `openclaw gateway status`Gateway
    - Santé du Gateway : `openclaw status`
    - Santé du channel : `openclaw channels status`Tailscale

    Vérifiez ensuite l'authentification et le routage :

    - Si vous utilisez Tailscale Serve, assurez-vous que `gateway.auth.allowTailscale`Tailscale est correctement configuré.
    - Si vous vous connectez via un tunnel SSH, confirmez que le tunnel local est actif et pointe vers le bon port.
    - Confirmez que vos listes d'autorisation (DM ou groupe) incluent votre compte.

    Docs : [Tailscale](/en/gateway/tailscale), [Accès à distance](/en/gateway/remote), [Channels](/en/channels).

  </Accordion>

  <Accordion title="OpenClawDeux instances OpenClaw peuvent-elles communiquer entre elles (local + VPS) ?"TelegramSlackWhatsAppCLIGateway>
    Oui. Il n'y a pas de pont "bot-to-bot" intégré, mais vous pouvez le configurer de quelques
    manières fiables :

    **Le plus simple :** utilisez un channel de chat normal auquel les deux bots peuvent accéder (Telegram/Slack/WhatsApp).
    Faites envoyer un message par le Bot A au Bot B, puis laissez le Bot B répondre comme d'habitude.

    **Pont CLI (générique) :** exécutez un script qui appelle l'autre Gateway avec
    `openclaw agent --message ... --deliver`CLIGatewayTailscale, en ciblant un chat où l'autre bot
    écoute. Si un bot est sur un VPS distant, pointez votre CLI vers ce Gateway distant
    via SSH/Tailscale (voir [Accès à distance](/en/gateway/remoteGateway)).

    Exemple de modèle (exécuté depuis une machine qui peut atteindre le Gateway cible) :

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Astuce : ajoutez une barrière de sécurité pour que les deux robots ne bouclent pas indéfiniment (mention uniquement, listes d'autorisation de channel, ou une règle "ne pas répondre aux messages des bots").

    Docs : [Accès à distance](/fr/gateway/remoteCLI), [Agent CLI](/fr/cli/agent), [Agent send](/fr/tools/agent-send).

  </Accordion>

  <Accordion title="Do I need separate VPSes for multiple agents?">
    Non. Un seul Gateway peut héberger plusieurs agents, chacun avec son propre espace de travail, ses paramètres de modèle par défaut
    et son routage. C'est la configuration normale et elle est beaucoup moins chère et plus simple que de faire tourner
    un VPS par agent.

    Utilisez des VPS séparés uniquement lorsque vous avez besoin d'un isolement strict (limites de sécurité) ou de configurations
    très différentes que vous ne souhaitez pas partager. Sinon, gardez un seul Gateway et
    utilisez plusieurs agents ou sous-agents.

  </Accordion>

  <Accordion title="Y a-t-il un avantage à utiliser un nœud sur mon ordinateur portable personnel plutôt qu'un SSH depuis un VPS ?">
    Oui - les nœuds constituent la méthode privilégiée pour atteindre votre ordinateur portable depuis un Gateway distant, et ils
    offrent plus qu'un simple accès shell. Le Gateway fonctionne sous macOS/Linux (Windows via WSL2) et est
    léger (un petit VPS ou une boîte de classe Raspberry Pi suffit ; 4 Go de RAM sont suffisants), donc une configuration
    courante consiste en un hôte toujours allumé plus votre ordinateur portable en tant que nœud.

    - **Aucun SSH entrant requis.** Les nœuds se connectent au WebSocket du Gateway et utilisent l'appareil d'appairage.
    - **Contrôles d'exécution plus sûrs.** `system.run` est limité par les listes d'autorisation/approbations des nœuds sur cet ordinateur portable.
    - **Plus d'outils d'appareil.** Les nœuds exposent `canvas`, `camera` et `screen` en plus de `system.run`.
    - **Automatisation du navigateur local.** Gardez le Gateway sur un VPS, mais exécutez Chrome localement via un hôte de nœud sur l'ordinateur portable, ou attachez-vous au Chrome local sur l'hôte via Chrome MCP.

    Le SSH convient pour un accès shell ponctuel, mais les nœuds sont plus simples pour les flux de travail d'agents continus et
    l'automatisation des appareils.

    Documentation : [Nœuds](/fr/nodes), [CLI des nœuds](/fr/cli/nodes), [Navigateur](/fr/tools/browser).

  </Accordion>

  <Accordion title="Les nœuds exécutent-ils un service de passerelle ?">
    Non. Seule **une seule passerelle** doit fonctionner par hôte, sauf si vous exécutez intentionnellement des profils isolés (voir [Multiple gateways](/fr/gateway/multiple-gateways)). Les nœuds sont des périphériques qui se connectent
    à la passerelle (nœuds iOS/Android, ou "mode nœud" macOS dans l'application de la barre de menus). Pour les hôtes de nœuds
    sans interface graphique et le contrôle CLI, voir [Node host CLI](/fr/cli/node).

    Un redémarrage complet est requis pour `gateway`, `discovery` et les modifications de surface des plugins hébergés.

  </Accordion>

  <Accordion title="Existe-t-il un moyen API / RPC d'appliquer la configuration ?">
    Oui.

    - `config.schema.lookup`: inspecter un sous-arbre de configuration avec son nœud de schéma superficiel, l'indice d'interface correspondant et les résumés des enfants immédiats avant l'écriture
    - `config.get`: récupérer l'instantané actuel + le hachage
    - `config.patch`: mise à jour partielle sécurisée (préférée pour la plupart des modifications RPC); recharge à chaud lorsque cela est possible et redémarre lorsque cela est requis
    - `config.apply`: valider + remplacer la configuration complète; recharge à chaud lorsque cela est possible et redémarre lorsque cela est requis
    - L'outil d'exécution `gateway`, réservé au propriétaire, refuse toujours de réécrire `tools.exec.ask` / `tools.exec.security`; les alias `tools.bash.*` obsolètes sont normalisés vers les mêmes chemins d'exécution protégés

  </Accordion>

  <Accordion title="Configuration minimale saine pour une première installation">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    Cela définit votre espace de travail et restreint qui peut déclencher le bot.

  </Accordion>

  <Accordion title="Comment configurer Tailscale sur un VPS et se connecter depuis mon Mac ?">
    Étapes minimales :

    1. **Installer + se connecter sur le VPS**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **Installer + se connecter sur votre Mac**
       - Utilisez l'application Tailscale et connectez-vous au même tailnet.
    3. **Activer MagicDNS (recommandé)**
       - Dans la console d'administration Tailscale, activez MagicDNS afin que le VPS dispose d'un nom stable.
    4. **Utiliser le nom d'hôte du tailnet**
       - SSH : `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS : `ws://your-vps.tailnet-xxxx.ts.net:18789`

    Si vous souhaitez l'interface de contrôle sans SSH, utilisez Tailscale Serve sur le VPS :

    ```bash
    openclaw gateway --tailscale serve
    ```

    Cela maintient la passerée liée au bouclage et expose HTTPS via Tailscale. Voir [Tailscale](/fr/gateway/tailscale).

  </Accordion>

  <Accordion title="GatewayTailscaleComment connecter un nœud Mac à une Gateway distante (Tailscale Serve) ?"GatewayGatewaymacOSGateway>
    Serve expose l'**interface utilisateur de contrôle Gateway + WS**. Les nœuds se connectent via le même point de terminaison WS de la Gateway.

    Configuration recommandée :

    1. **Assurez-vous que le VPS + le Mac sont sur le même tailnet**.
    2. **Utilisez l'application macOS en mode distant** (la cible SSH peut être le nom d'hôte du tailnet).
       L'application va tunneller le port de la Gateway et se connecter en tant que nœud.
    3. **Approuver le nœud** sur la gateway :

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```Gateway

    Docs : [Protocole Gateway](/en/gateway/protocol), [Discovery](/en/gateway/discoverymacOS), [Mode distant macOS](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="Dois-je installer sur un deuxième ordinateur portable ou simplement ajouter un nœud ?"GatewaymacOSGateway>
    Si vous avez uniquement besoin d'**outils locaux** (écran/caméra/exec) sur le deuxième ordinateur portable, ajoutez-le en tant que
    **nœud**. Cela permet de conserver une seule Gateway et d'éviter une configuration en double. Les outils de nœud locaux sont
    actuellement réservés à macOS, mais nous prévoyons de les étendre à d'autres systèmes d'exploitation.

    Installez une deuxième Gateway uniquement lorsque vous avez besoin d'une **isolement strict** ou de deux bots entièrement séparés.

    Docs : [Nœuds](/en/nodesCLI), [CLI des nœuds](/en/cli/nodes), [Multiple gateways](/en/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## Variables d'environnement et chargement .env

<AccordionGroup>
  <Accordion title="OpenClawComment OpenClaw charge-t-il les variables d'environnement ?"OpenClaw>
    OpenClaw lit les env vars depuis le processus parent (shell, launchd/systemd, CI, etc.) et charge également :

    - `.env` à partir du répertoire de travail actuel
    - un `.env` de repli global depuis `~/.openclaw/.env` (aka `$OPENCLAW_STATE_DIR/.env`)

    Aucun fichier `.env` ne remplace les env vars existants.

    Vous pouvez également définir des env vars en ligne dans la configuration (appliqués uniquement s'ils sont absents de l'environnement du processus) :

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    Voir [/environment](/fr/help/environment) pour la priorité complète et les sources.

  </Accordion>

  <Accordion title="J'ai démarré le Gateway via le service et mes variables d'environnement ont disparu. Et maintenant ?">
    Deux correctifs courants :

    1. Placez les clés manquantes dans `~/.openclaw/.env` afin qu'elles soient détectées même lorsque le service n'hérite pas de l'environnement de votre shell.
    2. Activez l'importation du shell (confort optionnel) :

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

    Cela exécute votre shell de connexion et importe uniquement les clés attendues manquantes (ne remplace jamais). Équivalents des variables d'environnement :
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='J'ai défini COPILOT_GITHUB_TOKEN, mais le statut des modèles indique "Shell env : off." Pourquoi ?'>
    `openclaw models status`OpenClawGateway indique si l'**importation de l'environnement shell** est activée. "Shell env : off"
    ne signifie **pas** que vos env vars sont manquants - cela signifie simplement qu'OpenClaw ne chargera
    pas votre shell de connexion automatiquement.

    Si le Gateway fonctionne en tant que service (launchd/systemd), il n'héritera pas de votre
    environnement de shell. Corrigez cela en faisant l'une de ces opérations :

    1. Placez le jeton dans `~/.openclaw/.env` :

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. Ou activez l'importation du shell (`env.shellEnv.enabled: true`).
    3. Ou ajoutez-le au bloc `env` de votre configuration (appliqué uniquement si manquant).

    Puis redémarrez la passerelle et vérifiez à nouveau :

    ```bash
    openclaw models status
    ```

    Les jetons Copilot sont lus depuis `COPILOT_GITHUB_TOKEN` (aussi `GH_TOKEN` / `GITHUB_TOKEN`).
    Voir [/concepts/model-providers](/fr/concepts/model-providers) et [/environment](/fr/help/environment).

  </Accordion>
</AccordionGroup>

## Sessions et plusieurs discussions

<AccordionGroup>
  <Accordion title="Comment puis-je démarrer une nouvelle conversation ?">
    Envoyez `/new` ou `/reset` comme message autonome. Voir [Gestion de session](/fr/concepts/session).
  </Accordion>

  <Accordion title="Les sessions réinitialisent-elles automatiquement si je n'envoie jamais /new ?">
    Les sessions peuvent expirer après `session.idleMinutes`, mais ceci est **désactivé par défaut** (par défaut **0**).
    Définissez-le sur une valeur positive pour activer l'expiration d'inactivité. Lorsqu'elle est activée, le message **suivant**
    après la période d'inactivité démarre un nouvel identifiant de session pour cette clé de chat.
    Cela ne supprime pas les transcriptions - cela démarre simplement une nouvelle session.

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="OpenClawExiste-t-il un moyen de créer une équipe d'instances OpenClaw (un PDG et de nombreux agents) ?">
    Oui, via le **routage multi-agent** et les **sous-agents**. Vous pouvez créer un agent coordinateur
    et plusieurs agents de travail avec leurs propres espaces de travail et modèles.

    Cela dit, c'est mieux vu comme une **expérience amusante**. C'est gourmand en jetons et souvent
    moins efficace que d'utiliser un seul bot avec des sessions séparées. Le modèle type que nous
    envisageons est un bot avec lequel vous parlez, avec différentes sessions pour le travail parallèle. Ce
    bot peut également générer des sous-agents si nécessaire.

    Docs : [Routage multi-agent](/fr/concepts/multi-agent), [Sous-agents](/fr/tools/subagentsCLI), [Agents CLI](/fr/cli/agents).

  </Accordion>

  <Accordion title="Pourquoi le contexte a-t-il été tronqué en cours de tâche ? Comment puis-je l'empêcher ?">
    Le contexte de la session est limité par la fenêtre du modèle. Les longues discussions, les grandes sorties d'outils ou de nombreux
    fichiers peuvent déclencher une compression ou une troncation.

    Ce qui aide :

    - Demandez au bot de résumer l'état actuel et de l'écrire dans un fichier.
    - Utilisez `/compact` avant les longues tâches, et `/new` lors du changement de sujet.
    - Gardez un contexte important dans l'espace de travail et demandez au bot de le relire.
    - Utilisez des sous-agents pour des travaux longs ou parallèles afin que le chat principal reste plus léger.
    - Choisissez un modèle avec une fenêtre de contexte plus large si cela se produit souvent.

  </Accordion>

  <Accordion title="OpenClawComment réinitialiser complètement OpenClaw tout en le gardant installé ?">
    Utilisez la commande de réinitialisation :

    ```bash
    openclaw reset
    ```

    Réinitialisation complète non interactive :

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    Puis relancez la configuration :

    ```bash
    openclaw onboard --install-daemon
    ```CLI

    Notes :

    - L'intégration (Onboarding) offre également une option **Réinitialiser** s'il détecte une configuration existante. Voir [Onboarding (CLI)](/en/start/wizard).
    - Si vous avez utilisé des profils (`--profile` / `OPENCLAW_PROFILE`), réinitialisez chaque répertoire d'état (ceux par défaut sont `~/.openclaw-<profile>`).
    - Réinitialisation dev : `openclaw gateway --dev --reset` (dev uniquement ; efface la config dev + les identifiants + les sessions + l'espace de travail).

  </Accordion>

  <Accordion title='Je reçois des erreurs "context too large" - comment réinitialiser ou compacter ?'>
    Utilisez l'une de ces méthodes :

    - **Compacter** (garde la conversation mais résume les tours précédents) :

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

    - Activez ou ajustez le **session pruning** (`agents.defaults.contextPruning`) pour supprimer les anciennes sorties d'outils.
    - Utilisez un modèle avec une fenêtre de contexte plus grande.

    Docs : [Compaction](/en/concepts/compaction), [Session pruning](/en/concepts/session-pruning), [Session management](/en/concepts/session).

  </Accordion>

  <Accordion title='Pourquoi vois-je « LLM request rejected: messages.content.tool_use.input field required » ?'>
    Il s'agit d'une erreur de validation du provider : le model a émis un bloc `tool_use` sans le
    `input` requis. Cela signifie généralement que l'historique de la session est périmé ou corrompu (souvent après des longs fils
    ou un changement d'outil/de schéma).

    Solution : commencez une nouvelle session avec `/new` (message autonome).

  </Accordion>

  <Accordion title="Pourquoi reçois-je des messages de heartbeat toutes les 30 minutes ?">
    Les heartbeats s'exécutent toutes les **30m** par défaut (**1h** lors de l'utilisation de l'authentification OAuth). Ajustez-les ou désactivez-les :

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

    Si `HEARTBEAT.md` existe mais est effectivement vide (seulement des lignes vides et des en-têtes
    markdown comme `# Heading`), OpenClaw ignore l'exécution du heartbeat pour économiser les appels API.
    Si le fichier est manquant, le heartbeat s'exécute toujours et le modèle décide de ce qu'il faut faire.

    Les overrides par agent utilisent `agents.list[].heartbeat`. Docs : [Heartbeat](/fr/gateway/heartbeat).

  </Accordion>

  <Accordion title='Dois-je ajouter un "compte bot" à un groupe WhatsApp ?'>
    Non. OpenClaw fonctionne avec **votre propre compte**, donc si vous êtes dans le groupe, OpenClaw peut le voir.
    Par défaut, les réponses de groupe sont bloquées jusqu'à ce que vous autorisiez les expéditeurs (`groupPolicy: "allowlist"`).

    Si vous voulez que **seul vous** puissiez déclencher des réponses de groupe :

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

  </Accordion>

  <Accordion title="Comment obtenir le JID d'un groupe WhatsApp ?">
    Option 1 (la plus rapide) : surveillez les journaux et envoyez un message de test dans le groupe :

    ```bash
    openclaw logs --follow --json
    ```

    Recherchez `chatId` (ou `from`) se terminant par `@g.us`, comme :
    `1234567890-1234567890@g.us`.

    Option 2 (si déjà configuré/autorisé) : lister les groupes depuis la configuration :

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    Docs : [WhatsApp](/fr/channels/whatsapp), [Directory](/fr/cli/directory), [Logs](/fr/cli/logs).

  </Accordion>

  <Accordion title="OpenClawPourquoi OpenClaw ne répond-il pas dans un groupe ?">
    Deux causes courantes :

    - Le filtrage par mention est activé (par défaut). Vous devez @mentionner le bot (ou correspondre à `mentionPatterns`).
    - Vous avez configuré `channels.whatsapp.groups` sans `"*"` et le groupe n'est pas sur la liste autorisée.

    Voir [Groupes](/fr/channels/groups) et [Messages de groupe](/fr/channels/group-messages).

  </Accordion>

<Accordion title="Les groupes/fils de discussion partagent-ils le contexte avec les DMs ?" TelegramDiscord>
  Les discussions directes sont regroupées dans la session principale par défaut. Les groupes/canaux ont leurs propres clés de session, et les sujets Telegram / fils Discord sont des sessions séparées. Voir [Groupes](/fr/channels/groups) et [Messages de groupe](/fr/channels/group-messages).
</Accordion>

  <Accordion title="Combien d'espaces de travail et d'agents puis-je créer ?">
    Aucune limite stricte. Des dizaines (voire des centaines) sont acceptables, mais attention à :

    - **Croissance du disque :** les sessions + transcriptions résident sous `~/.openclaw/agents/<agentId>/sessions/`.
    - **Coût des jetons :** plus d'agents signifie plus d'utilisation simultanée de modèle.
    - **Surcharge opérationnelle :** profils d'authentification par agent, espaces de travail et routage de canal.

    Conseils :

    - Conserver un espace de travail **actif** par agent (`agents.defaults.workspace`).
    - Nettoyer les anciennes sessions (supprimer les entrées JSONL ou du magasin) si le disque grossit.
    - Utiliser `openclaw doctor` pour repérer les espaces de travail orphelins et les inadéquations de profils.

  </Accordion>

  <Accordion title="SlackPuis-je exécuter plusieurs bots ou discussions en même temps (Slack), et comment dois-je configurer cela ?"SlackGatewaySlack>
    Oui. Utilisez le **Routage Multi-Agent** pour exécuter plusieurs agents isolés et acheminer les messages entrants par
    canal/compte/pair. Slack est pris en charge en tant que canal et peut être lié à des agents spécifiques.

    L'accès par navigateur est puissant mais pas « faire tout ce qu'un humain peut faire » — anti-bot, CAPTCHAs et MFA peuvent
    toujours bloquer l'automatisation. Pour le contrôle de navigateur le plus fiable, utilisez Chrome MCP local sur l'hôte,
    ou utilisez CDP sur la machine qui exécute réellement le navigateur.

    Configuration recommandée :

    - Hôte Gateway toujours actif (VPS/Mac mini).
    - Un agent par rôle (liaisons).
    - Canal(x) Slack lié(s) à ces agents.
    - Navigateur local via Chrome MCP ou un nœud si nécessaire.

    Documentation : [Routage Multi-Agent](/fr/concepts/multi-agentSlack), [Slack](/fr/channels/slack),
    [Navigateur](/fr/tools/browser), [Nœuds](/fr/nodes).

  </Accordion>
</AccordionGroup>

## Modèles, basculement et profils d'authentification

Questions/Réponses sur les modèles — valeurs par défaut, sélection, alias, basculement, secours, profils d'authentification —
se trouvent sur la [FAQ Modèles](/fr/help/faq-models).

## Gateway : ports, « déjà en cours d'exécution » et mode distant

<AccordionGroup>
  <Accordion title="GatewayQuel port le Gateway utilise-t-il ?">
    `gateway.port` contrôle le port multiplexé unique pour WebSocket + HTTP (UI de contrôle, hooks, etc.).

    Priorité :

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='Pourquoi le statut de la passerelle OpenClaw indique-t-il « Runtime: running » mais « Connectivity probe: failed » ?'>
    Parce que « running » est la vue du **superviseur** (launchd/systemd/schtasks). La sonde de connectivité est le CLI se connectant réellement au WebSocket de la passerelle.

    Utilisez `openclaw gateway status` et faites confiance à ces lignes :

    - `Probe target:` (l'URL réellement utilisée par la sonde)
    - `Listening:` (ce qui est réellement lié sur le port)
    - `Last gateway error:` (cause racine courante lorsque le processus est actif mais que le port n'écoute pas)

  </Accordion>

  <Accordion title='Pourquoi le statut de la passerelle OpenClaw affiche-t-il « Config (cli) » et « Config (service) » différents ?'>
    Vous modifiez un fichier de configuration alors que le service en utilise un autre (souvent une inadéquation `--profile` / `OPENCLAW_STATE_DIR`).

    Correction :

    ```bash
    openclaw gateway install --force
    ```

    Exécutez cela à partir du même `--profile` / environnement que vous souhaitez que le service utilise.

  </Accordion>

  <Accordion title='Que signifie « another gateway instance is already listening » ?'>
    OpenClaw applique un verrou d'exécution en liant l'écouteur WebSocket immédiatement au démarrage (par défaut `ws://127.0.0.1:18789`). Si la liaison échoue avec `EADDRINUSE`, il génère `GatewayLockError` indiquant qu'une autre instance est déjà à l'écoute.

    Correction : arrêtez l'autre instance, libérez le port ou exécutez avec `openclaw gateway --port <port>`.

  </Accordion>

  <Accordion title="Comment faire fonctionner OpenClawGateway en mode distant (le client se connecte à une passerelle située ailleurs) ?">
    Définissez `gateway.mode: "remote"` et pointez vers une URL WebSocket distante, facultativement avec des identifiants distants de secret partagé :

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

    Remarques :

    - `openclaw gateway` ne démarre que lorsque `gateway.mode` est `local` (ou que vous transmettez l'indicateur de substitution).
    - L'application macOS surveille le fichier de configuration et change de mode en direct lorsque ces valeurs changent.
    - `gateway.remote.token` / `.password` sont des identifiants distants côté client uniquement ; ils n'activent pas par eux-mêmes l'authentification de la passerelle locale.

  </Accordion>

  <Accordion title='L'interface de contrôle indique « unauthorized » (ou se reconnecte en permanence). Que faire ?'>
    Le chemin d'authentification de votre passerelle et la méthode d'authentification de l'interface ne correspondent pas.

    Faits (issus du code) :

    - L'interface de contrôle conserve le jeton dans `sessionStorage` pour l'onglet de navigateur actuel et l'URL de la passerelle sélectionnée, afin que les actualisations dans le même onglet continuent de fonctionner sans restaurer la persistance des jetons localStorage à long terme.
    - Sur `AUTH_TOKEN_MISMATCH`, les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton d'appareil mis en cache lorsque la passerelle renvoie des indices de réessai (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).
    - Cette nouvelle tentative avec jeton mis en cache réutilise désormais les étendues (scopes) approuvées stockées avec le jeton de l'appareil. Les appelants avec `deviceToken` explicite / `scopes` explicite conservent toujours leur ensemble d'étendues demandées au lieu d'hériter des étendues mises en cache.
    - En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, et enfin le jeton d'amorçage.
    - L'amorçage par code de configuration intégré est réservé aux nœuds. Après approbation, il renvoie un jeton d'appareil de nœud avec `scopes: []` et ne renvoie pas de jeton d'opérateur transféré.

    Correction :

    - Le plus rapide : `openclaw dashboard` (affiche et copie l'URL du tableau de bord, tente de l'ouvrir ; affiche un indice SSH sans tête).
    - Si vous n'avez pas encore de jeton : `openclaw doctor --generate-gateway-token`.
    - Si à distance, créez d'abord un tunnel : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`.
    - Mode secret partagé : définissez `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` ou `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`Tailscale, puis collez le secret correspondant dans les paramètres de l'interface de contrôle.
    - Mode Tailscale Serve : assurez-vous que `gateway.auth.allowTailscale`Tailscale est activé et que vous ouvrez l'URL Serve, et non une URL de bouclage (loopback)/tailnet brute qui contourne les en-têtes d'identité Tailscale.
    - Mode proxy de confiance : assurez-vous que vous passez par le proxy avec reconnaissance d'identité configuré, et non par une URL de passerelle brute. Les proxies de bouclage sur le même hôte ont également besoin de `gateway.auth.trustedProxy.allowLoopback = true`.
    - Si la discordance persiste après la nouvelle tentative unique, faites pivoter/réapprouver le jeton de l'appareil associé :
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - Si cet appel de rotation indique qu'il a été refusé, vérifiez deux choses :
      - les sessions d'appareils associés ne peuvent faire pivoter que leur **propre** appareil, sauf si elles ont également `operator.admin`
      - les valeurs `--scope` explicites ne peuvent pas dépasser les étendues d'opérateur actuelles de l'appelant
    - Toujours bloqué ? Exécutez `openclaw status --all` et suivez le [Dépannage](/fr/gateway/troubleshooting). Voir [Tableau de bord](/fr/web/dashboard) pour les détails d'authentification.

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet`TailscaleTailscaleTailscale bind sélectionne une IP Tailscale parmi vos interfaces réseau (100.64.0.0/10). Si la machine n'est pas sur Tailscale (ou si l'interface est désactivée), il n'y a rien à lier.

    Correction :

    - Démarrez Tailscale sur cet hôte (afin qu'il ait une adresse 100.x), ou
    - Basculez sur `gateway.bind: "loopback"` / `"lan"`.

    Remarque : `tailnet` est explicite. `auto` préfère le bouclage (loopback) ; utilisez `gateway.bind: "tailnet"` lorsque vous souhaitez une liaison exclusive au tailnet.

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?"Gateway>
    Généralement non - un seul Gateway peut exécuter plusieurs canaux de messagerie et agents. Utilisez plusieurs Gateways uniquement lorsque vous avez besoin de redondance (ex : robot de secours) ou d'un isolement strict.

    Oui, mais vous devez isoler :

    - `OPENCLAW_CONFIG_PATH` (configuration par instance)
    - `OPENCLAW_STATE_DIR` (état par instance)
    - `agents.defaults.workspace` (isolement de l'espace de travail)
    - `gateway.port` (ports uniques)

    Configuration rapide (recommandée) :

    - Utilisez `openclaw --profile <name> ...` par instance (crée automatiquement `~/.openclaw-<name>`).
    - Définissez un `gateway.port` unique dans chaque configuration de profil (ou passez `--port` pour les exécutions manuelles).
    - Installez un service par profil : `openclaw --profile <name> gateway install`.

    Les profils suffixent également les noms de service (`ai.openclaw.<profile>` ; `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)` hérités).
    Guide complet : [Multiple gateways](/fr/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='Que signifie "invalid handshake" / code 1008 ?'Gateway>
    Le Gateway est un serveur **WebSocket**, et il s'attend à ce que le tout premier message soit
    une trame `connect`. S'il reçoit autre chose, il ferme la connexion
    avec le **code 1008** (violation de stratégie).

    Causes courantes :

    - Vous avez ouvert l'URL **HTTP** dans un navigateur (`http://...`Gateway) au lieu d'un client WS.
    - Vous avez utilisé le mauvais port ou chemin.
    - Un proxy ou un tunnel a supprimé les en-têtes d'authentification ou a envoyé une requête non-Gateway.

    Corrections rapides :

    1. Utilisez l'URL WS : `ws://<host>:18789` (ou `wss://...` si HTTPS).
    2. N'ouvrez pas le port WS dans un onglet de navigateur normal.
    3. Si l'authentification est activée, incluez le jeton/mot de passe dans la trame `connect`CLITUI.

    Si vous utilisez le CLI ou TUI, l'URL devrait ressembler à :

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```Gateway

    Détails du protocole : [Protocole Gateway](/en/gateway/protocol).

  </Accordion>
</AccordionGroup>

## Journalisation et débogage

<AccordionGroup>
  <Accordion title="Où se trouvent les journaux ?">
    Journaux de fichiers (structurés) :

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    Vous pouvez définir un chemin stable via `logging.file`. Le niveau de journalisation des fichiers est contrôlé par `logging.level`. La verbosité de la console est contrôlée par `--verbose` et `logging.consoleLevel`.

    Affichage le plus rapide des journaux :

    ```bash
    openclaw logs --follow
    ```macOS

    Journaux de service/superviseur (lorsque le gateway fonctionne via launchd/systemd) :

    - macOS launchd stdout : `~/Library/Logs/openclaw/gateway.log` (les profils utilisent `gateway-<profile>.log`Linux ; stderr est supprimé)
    - Linux : `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`Windows
    - Windows : `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    Voir [Dépannage](/en/gateway/troubleshooting) pour plus d'informations.

  </Accordion>

  <Accordion title="GatewayComment démarrer/arrêter/redémarrer le service Gateway ?">
    Utilisez les assistants de passerelle :

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous exécutez la passerelle manuellement, `openclaw gateway --force`Gateway peut réclamer le port. Voir [Gateway](/fr/gateway).

  </Accordion>

  <Accordion title="WindowsOpenClawJ'ai fermé mon terminal sur Windows - comment redémarrer OpenClaw ?"WindowsWSL2GatewayLinux>
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
    ```WindowsGatewayWindows

    **2) Windows natif (non recommandé) :** la Gateway s'exécute directement sous Windows.

    Ouvrez PowerShell et exécutez :

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous l'exécutez manuellement (sans service), utilisez :

    ```powershell
    openclaw gateway run
    ```WindowsWSL2

    Documentation : [Windows (WSL2)](/en/platforms/windowsGateway), [Manuel de service Gateway](/en/gateway).

  </Accordion>

  <Accordion title="GatewayLa Gateway est opérationnelle mais les réponses n'arrivent jamais. Que dois-je vérifier ?">
    Commencez par un contrôle rapide de l'état de santé :

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causes courantes :

    - L'authentification du modèle n'est pas chargée sur l'**hôte de la passerelle** (vérifiez `models status`WebChatTailscaleGateway).
    - Le jumelage/la liste d'autorisation des channels bloque les réponses (vérifiez la configuration des channels + les journaux).
    - WebChat/Dashboard est ouvert sans le bon jeton.

    Si vous êtes distant, confirmez que la connexion tunnel/Tailscale est active et que le
    WebSocket de la Gateway est accessible.

    Documentation : [Channels](/fr/channels), [Dépannage](/fr/gateway/troubleshooting), [Accès à distance](/fr/gateway/remote).

  </Accordion>

  <Accordion title='"Déconnecté du Gateway : aucune raison" - et maintenant ?'Gateway>
    Cela signifie généralement que l'interface utilisateur a perdu la connexion WebSocket. Vérifiez :

    1. Le Gateway fonctionne-t-il ? `openclaw gateway status`Gateway
    2. Le Gateway est-il en bonne santé ? `openclaw status`
    3. L'interface utilisateur a-t-elle le bon jeton ? `openclaw dashboard`Tailscale
    4. Si à distance, le lien tunnel/Tailscale est-il actif ?

    Puis consultez les journaux :

    ```bash
    openclaw logs --follow
    ```

    Docs : [Tableau de bord](/fr/web/dashboard), [Accès à distance](/fr/gateway/remote), [Dépannage](/fr/gateway/troubleshooting).

  </Accordion>

  <Accordion title="TelegramÉchec de Telegram setMyCommands. Que dois-je vérifier ?">
    Commencez par les journaux et l'état du channel :

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Ensuite, correspondez l'erreur :

    - `BOT_COMMANDS_TOO_MUCH`TelegramOpenClawTelegram : le menu Telegram a trop d'entrées. OpenClaw réduit déjà à la limite Telegram et réessaie avec moins de commandes, mais certaines entrées de menu doivent encore être supprimées. Réduisez les commandes de plugin/compétence/personnalisées, ou désactivez `channels.telegram.commands.native` si vous n'avez pas besoin du menu.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, ou erreurs réseau similaires : si vous êtes sur un VPS ou derrière un proxy, confirmez que le HTTPS sortant est autorisé et que le DNS fonctionne pour `api.telegram.org`GatewayGatewayTelegram.

    Si le Gateway est distant, assurez-vous que vous consultez les journaux sur l'hôte du Gateway.

    Docs : [Telegram](/fr/channels/telegram), [Dépannage du channel](/fr/channels/troubleshooting).

  </Accordion>

  <Accordion title="TUILe TUI n'affiche aucune sortie. Que dois-je vérifier ?"Gateway>
    Confirmez d'abord que le Gateway est accessible et que l'agent peut s'exécuter :

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```TUI

    Dans le TUI, utilisez `/status` pour voir l'état actuel. Si vous attendez des réponses dans un canal
    de chat, assurez-vous que la livraison est activée (`/deliver on`TUI).

    Docs : [TUI](/en/web/tui), [Slash commands](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="GatewayComment arrêter complètement puis démarrer le Gateway ?">
    Si vous avez installé le service :

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```macOSLinuxGateway

    Cela arrête/démarre le **service supervisé** (launchd sur macOS, systemd sur Linux).
    Utilisez ceci lorsque le Gateway s'exécute en arrière-plan en tant que démon.

    Si vous l'exécutez au premier plan, arrêtez avec Ctrl-C, puis :

    ```bash
    openclaw gateway run
    ```Gateway

    Docs : [Gateway service runbook](/en/gateway).

  </Accordion>

  <Accordion title="ELI5 : redémarrage du openclaw gateway vs openclaw gateway">
    - `openclaw gateway restart` : redémarre le **service d'arrière-plan** (launchd/systemd).
    - `openclaw gateway` : exécute le gateway **au premier plan** pour cette session de terminal.

    Si vous avez installé le service, utilisez les commandes du gateway. Utilisez `openclaw gateway` lorsque
    vous voulez une exécution ponctuelle, au premier plan.

  </Accordion>

  <Accordion title="Le moyen le plus rapide d'obtenir plus de détails en cas d'échec"Gateway>
    Démarrez le Gateway avec `--verbose`RPC pour obtenir plus de détails dans la console. Ensuite, inspectez le fichier journal pour les erreurs d'authentification de canal, le routage de modèle et les erreurs RPC.
  </Accordion>
</AccordionGroup>

## Médias et pièces jointes

<AccordionGroup>
  <Accordion title="Ma compétence a généré une image/PDF, mais rien n'a été envoyé">
    Les pièces jointes sortantes de l'agent doivent inclure une ligne `MEDIA:<path-or-url>` (sur sa propre ligne). Voir [Configuration de l'assistant OpenClaw](/en/start/openclaw) et [Envoi d'agent](/en/tools/agent-send).

    Envoi CLI :

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    Vérifiez également :

    - Le channel cible prend en charge les médias sortants et n'est pas bloqué par des listes autorisées.
    - Le fichier respecte les limites de taille du fournisseur (les images sont redimensionnées à un maximum de 2048px).
    - `tools.fs.workspaceOnly=true` limite les envois de chemins locaux à l'espace de travail, au magasin temp/media et aux fichiers validés par le bac à sable.
    - `tools.fs.workspaceOnly=false` permet à `MEDIA:` d'envoyer des fichiers locaux de l'hôte que l'agent peut déjà lire, mais uniquement pour les médias et les types de documents sécurisés (images, audio, vidéo, PDF et documents Office). Les fichiers texte brut et de type secret sont toujours bloqués.

    Voir [Images](/fr/nodes/images).

  </Accordion>
</AccordionGroup>

## Sécurité et contrôle d'accès

<AccordionGroup>
  <Accordion title="Est-il sûr d'exposer OpenClaw aux DMs entrants ?">
    Traitez les DMs entrants comme une entrée non fiable. Les paramètres par défaut sont conçus pour réduire les risques :

    - Le comportement par défaut sur les channels prenant en charge les DMs est le **couplage** (pairing) :
      - Les expéditeurs inconnus reçoivent un code de couplage ; le bot ne traite pas leur message.
      - Approuvez avec : `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Les demandes en attente sont limitées à **3 par channel** ; vérifiez `openclaw pairing list --channel <channel> [--account <id>]` si un code n'est pas arrivé.
    - L'ouverture publique des DMs nécessite un opt-in explicite (`dmPolicy: "open"` et liste autorisée `"*"`).

    Exécutez `openclaw doctor` pour révéler les stratégies de DM risquées.

  </Accordion>

  <Accordion title="L'injection de prompt est-elle uniquement une préoccupation pour les bots publics ?">
    Non. L'injection de prompt concerne le **contenu non fiable**, et pas seulement qui peut envoyer un DM au bot.
    Si votre assistant lit du contenu externe (recherche/récupération web, pages de navigateur, e-mails,
    documents, pièces jointes, journaux collés), ce contenu peut inclure des instructions qui tentent
    de détourner le modèle. Cela peut arriver même si **vous êtes le seul expéditeur**.

    Le plus grand risque survient lorsque les outils sont activés : le modèle peut être trompé pour
    exfiltrer le contexte ou appeler des outils en votre nom. Réduisez le rayon d'impact en :

    - utilisant un agent "lecteur" en lecture seule ou sans outils pour résumer le contenu non fiable
    - gardant `web_search` / `web_fetch` / `browser`OpenResponses désactivés pour les agents avec outils
    - traitant le texte des fichiers/documents décodés comme non fiable aussi : OpenResponses
      `input_file` et l'extraction de pièces jointes multimédias enveloppent tous deux le texte extrait dans
      des marqueurs de limite de contenu externe explicites au lieu de transmettre le texte brut du fichier
    - utilisant le sandboxing et des listes strictes d'outils autorisés

    Détails : [Sécurité](/fr/gateway/security).

  </Accordion>

  <Accordion title="GitHubMon bot doit-il avoir son propre e-mail, compte GitHub ou numéro de téléphone ?">
    Oui, pour la plupart des configurations. Isoler le bot avec des comptes et des numéros de téléphone distincts
    réduit le rayon d'impact en cas de problème. Cela facilite également la rotation des
    identifiants ou la révocation de l'accès sans impacter vos comptes personnels.

    Commencez petit. Ne donnez l'accès qu'aux outils et comptes dont vous avez réellement besoin, et étendez
    plus tard si nécessaire.

    Documentation : [Sécurité](/fr/gateway/security), [Appairage](/fr/channels/pairing).

  </Accordion>

  <Accordion title="Puis-je lui donner l'autonomie sur mes SMS et est-ce sûr ?">
    Nous ne recommandons **pas** une autonomie totale sur vos messages personnels. Le modèle le plus sûr est :

    - Conserver les DMs en **mode appairage** ou sur une liste d'autorisation stricte.
    - Utiliser un **numéro ou un compte distinct** si vous souhaitez qu'il envoie des messages en votre nom.
    - Laisser-le rédiger, puis **approuver avant l'envoi**.

    Si vous souhaitez expérimenter, faites-le sur un compte dédié et tenez-le isolé. Voir
    [Sécurité](/fr/gateway/security).

  </Accordion>

<Accordion title="Puis-je utiliser des modèles moins chers pour les tâches d'assistant personnel ?">
  Oui, **si** l'agent est uniquement en mode chat et si l'entrée est fiable. Les niveaux inférieurs sont plus susceptibles au détournement d'instructions, donc évitez-les pour les agents dotés d'outils ou lors de la lecture de contenu non fiable. Si vous devez utiliser un plus petit modèle, verrouillez les outils et exécutez-le dans un bac à sable (sandbox). Voir [Sécurité](/fr/gateway/security).
</Accordion>

  <Accordion title="J'ai exécuté /start sur Telegram mais je n'ai pas reçu de code d'appairage">
    Les codes d'appairage sont envoyés **uniquement** lorsqu'un expéditeur inconnu envoie un message au bot et que
    `dmPolicy: "pairing"` est activé. `/start` seul ne génère pas de code.

    Vérifiez les demandes en attente :

    ```bash
    openclaw pairing list telegram
    ```

    Si vous souhaitez un accès immédiat, ajoutez votre identifiant d'expéditeur à la liste blanche ou définissez `dmPolicy: "open"`
    pour ce compte.

  </Accordion>

  <Accordion title="WhatsAppWhatsApp : va-t-il envoyer des messages à mes contacts ? Comment fonctionne l'appariement ?"WhatsAppOpenClaw>
    Non. La stratégie par défaut pour les DM WhatsApp est l'**appariement**. Les expéditeurs inconnus ne reçoivent qu'un code d'appariement et leur message n'est **pas traité**. OpenClaw ne répond qu'aux conversations qu'il reçoit ou aux envois explicites que vous déclenchez.

    Approuver l'appariement avec :

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Liste des demandes en attente :

    ```bash
    openclaw pairing list whatsapp
    ```WhatsApp

    Invite du numéro de téléphone dans l'assistant : il est utilisé pour définir votre **allowlist/owner** afin que vos propres DM soient autorisés. Il n'est pas utilisé pour l'envoi automatique. Si vous utilisez votre numéro WhatsApp personnel, utilisez ce numéro et activez `channels.whatsapp.selfChatMode`.

  </Accordion>
</AccordionGroup>

## Commandes de chat, annulation de tâches et « ça ne s'arrête pas »

<AccordionGroup>
  <Accordion title="Comment empêcher l'affichage des messages système internes dans le chat ?">
    La plupart des messages internes ou des outils n'apparaissent que lorsque le mode **verbose**, **trace** ou **reasoning** est activé
    pour cette session.

    Corriger dans le chat où vous le voyez :

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    Si c'est encore bruyant, vérifiez les paramètres de la session dans l'interface de contrôle et définissez verbose
    sur **inherit**. Confirmez également que vous n'utilisez pas un profil de bot avec `verboseDefault` défini
    sur `on` dans la configuration.

    Docs : [Thinking and verbose](/en/tools/thinking), [Security](/en/gateway/security/index#reasoning-and-verbose-output-in-groups).

  </Accordion>

  <Accordion title="Comment arrêter/annuler une tâche en cours d'exécution ?">
    Envoyez l'un de ces messages **en tant que message autonome** (sans barre oblique) :

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

    Aperçu des commandes slash : voir [Slash commands](/en/tools/slash-commands).

    La plupart des commandes doivent être envoyées sous forme de message **autonome** commençant par `/`, mais quelques raccourcis (comme `/status`) fonctionnent également en ligne pour les expéditeurs sur la liste d'autorisation.

  </Accordion>

  <Accordion title='Comment envoyer un message Discord depuis Telegram ? ("Cross-context messaging denied")'>
    OpenClaw bloque la messagerie **cross-provider** par défaut. Si un appel d'outil est lié
    à Telegram, il n'enverra pas à Discord sauf si vous l'autorisez explicitement.

    Activez la messagerie cross-provider pour l'agent :

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    }
    ```

    Redémarrez la passerelle après avoir modifié la configuration.

  </Accordion>

  <Accordion title='Pourquoi a-t-on l'impression que le bot "ignore" les messages en rafale ?'>
    Par défaut, les invites en cours d'exécution sont acheminées vers l'exécution active. Utilisez `/queue` pour choisir le comportement de l'exécution active :

    - `steer` - guider l'exécution active à la prochaine limite du modèle
    - `followup` - mettre les messages en file d'attente et les exécuter un par un après la fin de l'exécution actuelle
    - `collect` - mettre les messages compatibles en file d'attente et répondre une seule fois après la fin de l'exécution actuelle
    - `interrupt` - abandonner l'exécution actuelle et recommencer

    Le mode par défaut est `steer`. Vous pouvez ajouter des options comme `debounce:0.5s cap:25 drop:summarize` pour les modes de file d'attente. Voir [Command queue](/fr/concepts/queue) et [Steering queue](/fr/concepts/queue-steering).

  </Accordion>
</AccordionGroup>

## Divers

<AccordionGroup>
  <Accordion title="Quel est le modèle par défaut pour Anthropic avec une clé API ?">
    Dans OpenClaw, les informations d'identification et la sélection du modèle sont distinctes. Définir `ANTHROPIC_API_KEY` (ou stocker une clé API AnthropicAPI dans les profils d'authentification) active l'authentification, mais le modèle par défaut réel est celui que vous configurez dans `agents.defaults.model.primary` (par exemple, `anthropic/claude-sonnet-4-6` ou `anthropic/claude-opus-4-6`).
    Si vous voyez `No credentials found for profile "anthropic:default"`, cela signifie que le Gateway n'a pas pu trouver les informations d'identification Anthropic dans le `auth-profiles.json` attendu pour l'agent en cours d'exécution.
  </Accordion>
</AccordionGroup>

---

Toujours bloqué ? Demandez sur [Discord](https://discord.com/invite/clawd) ou ouvrez une [discussion GitHub](https://github.com/openclaw/openclaw/discussions).

## Connexes

- [FAQ de première exécution](/fr/help/faq-first-run) — installation, intégration, authentification, abonnements, premiers échecs
- [FAQ sur les modèles](/fr/help/faq-models) — sélection des modèles, basculement, profils d'authentification
- [Dépannage](/fr/help/troubleshooting) — triage par symptômes
