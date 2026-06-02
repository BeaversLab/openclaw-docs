---
summary: "OpenClawQuestions fréquemment posées sur la configuration, l'installation et l'utilisation d'OpenClaw"
read_when:
  - Answering common setup, install, onboarding, or runtime support questions
  - Triaging user-reported issues before deeper debugging
title: "FAQ"
---

Réponses rapides et dépannage approfondi pour des configurations réelles (dev local, VPS, multi-agent, clés OAuth/API, basculement de modèle). Pour les diagnostics d'exécution, voir [Dépannage](/fr/gateway/troubleshooting). Pour la référence complète de la configuration, voir [Configuration](/fr/gateway/configuration).

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

   Exécute une sonde de santé en direct de la passerelle, y compris des sondes de canal lorsque prises en charge
   (nécessite une passerelle accessible). Voir [Santé](/fr/gateway/health).

5. **Suivre les derniers journaux**

   ```bash
   openclaw logs --follow
   ```

   Si le RPC est en panne, revenez à :

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   Les journaux de fichiers sont distincts des journaux de service ; voir [Journalisation](/fr/logging) et [Dépannage](/fr/gateway/troubleshooting).

6. **Exécuter le docteur (réparations)**

   ```bash
   openclaw doctor
   ```

   Répare/migre la configuration/l'état + exécute des vérifications de santé. Voir [Docteur](/fr/gateway/doctor).

7. **Instantané de la passerelle**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   Demande à la passerelle en exécution un instantané complet (WS uniquement). Voir [Santé](/fr/gateway/health).

## Démarrage rapide et configuration initiale

Q&R de première exécution — installation, intégration, routes d'authentification, abonnements, échecs initiaux —
se trouve sur la [FAQ de première exécution](/fr/help/faq-first-run).

## Qu'est-ce qu'OpenClaw ?

<AccordionGroup>
  <Accordion title="OpenClawQu'est-ce qu'OpenClaw, en un paragraphe ?"OpenClawWhatsAppTelegramSlackMattermostDiscordGoogle ChatSignaliMessageWebChatCanvasGateway>
    OpenClaw est un assistant IA personnel que vous exécutez sur vos propres appareils. Il répond sur les surfaces de messagerie que vous utilisez déjà (WhatsApp, Telegram, Slack, Mattermost, Discord, Google Chat, Signal, iMessage, WebChat et les plugins de canal groupés tels que QQ Bot) et peut également faire de la voix + un Canvas en direct sur les plateformes prises en charge. Le **Gateway** est le plan de contrôle toujours actif ; l'assistant est le produit.
  </Accordion>

  <Accordion title="Value proposition"OpenClawGatewayLinuxWhatsAppTelegramSlackDiscordSignaliMessageCanvasAnthropicOpenAIMiniMaxOpenRouterGateway>
    OpenClaw n'est pas « simplement un wrapper Claude ». C'est un **plan de contrôle privilégiant le local** qui vous permet d'exécuter un
    assistant performant sur **votre propre matériel**, accessible depuis les applications de chat que vous utilisez déjà, avec
    des sessions avec état, de la mémoire et des outils - sans céder le contrôle de vos flux de travail à un
    SaaS hébergé.

    Points forts :

    - **Vos appareils, vos données :** exécutez le Gateway où vous le souhaitez (Mac, Linux, VPS) et gardez
      l'espace de travail + l'historique des sessions en local.
    - **Vrais canaux, pas une bac à sable web :** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc.,
      plus la voix mobile et Canvas sur les plateformes prises en charge.
    - **Agnostique aux modèles :** utilisez Anthropic, OpenAI, MiniMax, OpenRouter, etc., avec un routage
      et une bascule par agent.
    - **Option uniquement locale :** exécutez des modèles locaux pour que **toutes les données puissent rester sur votre appareil** si vous le souhaitez.
    - **Routage multi-agents :** agents séparés par canal, compte ou tâche, chacun avec son propre
      espace de travail et ses propres paramètres par défaut.
    - **Open source et hackable :** inspectez, étendez et auto-hébergez sans verrouillage fournisseur.

    Docs : [Gateway](/fr/gateway), [Canaux](/fr/channels), [Multi-agent](/fr/concepts/multi-agent),
    [Mémoire](/fr/concepts/memory).

  </Accordion>

  <Accordion title="Je viens de l'installer - que dois-je faire en premier ?"API>
    Bons premiers projets :

    - Créer un site web (WordPress, Shopify ou un site statique simple).
    - Prototyper une application mobile (plan, écrans, plan API).
    - Organiser les fichiers et dossiers (nettoyage, nommage, étiquetage).
    - Connecter Gmail et automatiser les résumés ou les suivis.

    Il peut gérer de grandes tâches, mais fonctionne mieux lorsque vous les divisez en phases et utilisez des sous-agents pour le travail parallèle.

  </Accordion>

  <Accordion title="OpenClawQuels sont les cinq principaux cas d'usage quotidiens pour OpenClaw ?"Gateway>
    Les réussites quotidiennes prennent généralement la forme suivante :

    - **Briefings personnels :** résumés de votre boîte de réception, de votre calendrier et des nouvelles qui vous intéressent.
    - **Recherche et rédaction :** recherche rapide, résumés et premières versions pour des e-mails ou des documents.
    - **Rappels et suivis :** relances et listes de contrôle pilotées par cron ou heartbeat.
    - **Automatisation du navigateur :** remplissage de formulaires, collecte de données et répétition de tâches web.
    - **Coordination multi-appareils :** envoyez une tâche depuis votre téléphone, laissez le Gateway l'exécuter sur un serveur et recevez le résultat dans le chat.

  </Accordion>

  <Accordion title="OpenClawCan OpenClaw help with lead gen, outreach, ads, and blogs for a SaaS?"OpenClaw>
    Oui pour la **recherche, la qualification et la rédaction**. Il peut analyser des sites, constituer des listes restreintes,
    résumer des prospects et rédiger des brouillons de messages de prospection ou de copies publicitaires.

    Pour les **campagnes de prospection ou publicitaires**, gardez un humain dans la boucle. Évitez le spam, respectez les lois locales et
    les politiques des plateformes, et relisez tout avant l'envoi. Le modèle le plus sûr est de laisser
    OpenClaw rédiger et que vous approuviez.

    Docs : [Sécurité](/fr/gateway/security).

  </Accordion>

  <Accordion title="Quels sont les avantages par rapport à Claude Code pour le développement web ?">
    OpenClaw est un **assistant personnel** et une couche de coordination, pas un remplacement pour l'IDE. Utilisez
    Claude Code ou Codex pour la boucle de codage directe la plus rapide dans un dépôt. Utilisez OpenClaw lorsque vous
    souhaitez une mémoire durable, un accès multi-appareils et une orchestration d'outils.

    Avantages :

    - **Mémoire persistante + espace de travail** sur plusieurs sessions
    - **Accès multiplateforme** (WhatsApp, Telegram, TUI, WebChat)
    - **Orchestration d'outils** (navigateur, fichiers, planification, hooks)
    - **Gateway toujours actif** (exécutez sur un VPS, interagissez de n'importe où)
    - **Nœuds** pour le navigateur/écran/caméra/exéc local

    Démo : [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills et automatisation

<AccordionGroup>
  <Accordion title="Comment personnaliser les compétences sans salir le dépôt ?">
    Utilisez des remplacements gérés au lieu de modifier la copie du dépôt. Placez vos modifications dans `~/.openclaw/skills/<name>/SKILL.md` (ou ajoutez un dossier via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json`). La priorité est `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`, donc les remplacements gérés priment toujours sur les compétences groupées sans toucher à git. Si vous avez besoin que la compétence soit installée globalement mais visible uniquement pour certains agents, conservez la copie partagée dans `~/.openclaw/skills` et contrôlez la visibilité avec `agents.defaults.skills` et `agents.list[].skills`. Seules les modifications dignes d'être intégrées en amont devraient résider dans le dépôt et être envoyées sous forme de PR.
  </Accordion>

  <Accordion title="Puis-je charger des compétences depuis un dossier personnalisé ?">
    Oui. Ajoutez des répertoires supplémentaires via `skills.load.extraDirs` dans `~/.openclaw/openclaw.json` (priorité la plus basse). La priorité par défaut est `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`. `clawhub` installe dans `./skills`OpenClaw par défaut, ce qu'OpenClaw traite comme `<workspace>/skills` lors de la prochaine session. Si la compétence ne doit être visible que pour certains agents, associez-la à `agents.defaults.skills` ou `agents.list[].skills`.
  </Accordion>

  <Accordion title="Comment puis-je utiliser différents modèles pour différentes tâches ?">
    Les modèles pris en charge aujourd'hui sont :

    - **Tâches cron** : les tâches isolées peuvent définir une priorité `model` par tâche.
    - **Sous-agents** : acheminez les tâches vers des agents distincts avec des modèles par défaut différents.
    - **Commutation à la demande** : utilisez `/model` pour changer le modèle de la session actuelle à tout moment.

    Voir [Tâches cron](/fr/automation/cron-jobs), [Routage Multi-Agent](/fr/concepts/multi-agent) et [Commandes slash](/fr/tools/slash-commands).

  </Accordion>

  <Accordion title="Le bot se fige pendant l'exécution de tâches lourdes. Comment décharger cela ?">
    Utilisez des **sous-agents** pour les tâches longues ou parallèles. Les sous-agents s'exécutent dans leur propre session,
    renvoient un résumé et gardent votre chat principal réactif.

    Demandez à votre bot de "lancer un sous-agent pour cette tâche" ou utilisez `/subagents`.
    Utilisez `/status` dans le chat pour voir ce que le Gateway est en train de faire (et s'il est occupé).

    Astuce concernant les tokens : les tâches longues et les sous-agents consomment tous deux des tokens. Si le coût est un problème, définissez un
    model moins cher pour les sous-agents via `agents.defaults.subagents.model`.

    Docs : [Sous-agents](/fr/tools/subagents), [Tâches d'arrière-plan](/fr/automation/tasks).

  </Accordion>

  <Accordion title="Comment fonctionnent les sessions de sous-agents liées aux fils sur Discord ?">
    Utilisez les liaisons de fils. Vous pouvez lier un fil Discord à une cible de sous-agent ou de session afin que les messages de suivi dans ce fil restent sur cette session liée.

    Flux de base :

    - Générez avec `sessions_spawn` en utilisant `thread: true` (et optionnellement `mode: "session"` pour un suivi persistant).
    - Ou liez manuellement avec `/focus <target>`.
    - Utilisez `/agents` pour inspecter l'état de la liaison.
    - Utilisez `/session idle <duration|off>` et `/session max-age <duration|off>` pour contrôler le défocal automatique.
    - Utilisez `/unfocus` pour détacher le fil.

    Configuration requise :

    - Valeurs par défaut globales : `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`.
    - Remplacements Discord : `channels.discord.threadBindings.enabled`, `channels.discord.threadBindings.idleHours`, `channels.discord.threadBindings.maxAgeHours`.
    - Liaison automatique à la génération : `channels.discord.threadBindings.spawnSessions` par défaut `true` ; définissez-le sur `false` pour désactiver les générations de sessions liées aux fils.

    Documentation : [Sous-agents](/fr/tools/subagents), [Discord](/fr/channels/discord), [Référence de configuration](/fr/gateway/configuration-reference), [Commandes slash](/fr/tools/slash-commands).

  </Accordion>

  <Accordion title="Un sous-agent a terminé, mais la mise à jour de l'achèvement est allée au mauvais endroit ou n'a jamais été publiée. Que dois-je vérifier ?"OpenClaw>
    Vérifiez d'abord la route du demandeur résolu :

    - La livraison des sous-agents en mode achèvement privilégie toute route de fil ou de conversation liée lorsqu'elle existe.
    - Si l'origine de l'achèvement ne transporte qu'un channel, OpenClaw revient à la route stockée de la session du demandeur (`lastChannel` / `lastTo` / `lastAccountId`) afin que la livraison directe puisse encore réussir.
    - Si ni une route liée ni une route stockée utilisable n'existe, la livraison directe peut échouer et le résultat revient à une livraison en file d'attente de la session au lieu d'être publié immédiatement dans le chat.
    - Des cibles invalides ou obsolètes peuvent toujours forcer le retour en file d'attente ou l'échec final de la livraison.
    - Si la dernière réponse visible de l'assistant de l'enfant est le jeton silencieux exact `NO_REPLY` / `no_reply`, ou exactement `ANNOUNCE_SKIP`OpenClaw, OpenClaw supprime intentionnellement l'annonce au lieu de publier une progression antérieure obsolète.
    - La sortie de l'outil/toolResult n'est pas promue dans le texte du résultat de l'enfant ; le résultat est la dernière réponse visible de l'assistant de l'enfant.

    Débogage :

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    Docs : [Sous-agents](/fr/tools/subagents), [Tâches d'arrière-plan](/fr/automation/tasks), [Outils de session](/fr/concepts/session-tool).

  </Accordion>

  <Accordion title="Les cron ou les rappels ne se déclenchent pas. Que dois-je vérifier ?"GatewayGateway>
    Le cron s'exécute dans le processus Gateway. Si le Gateway ne fonctionne pas en continu,
    les tâches planifiées ne s'exécuteront pas.

    Liste de contrôle :

    - Confirmez que le cron est activé (`cron.enabled`) et que `OPENCLAW_SKIP_CRON`Gateway n'est pas défini.
    - Vérifiez que le Gateway fonctionne 24h/24 et 7j/7 (pas de mise en veille/redémarrage).
    - Vérifiez les paramètres de fuseau horaire pour la tâche (`--tz` par rapport au fuseau horaire de l'hôte).

    Débogage :

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    Docs : [Tâches cron](/fr/automation/cron-jobs), [Automatisation](/fr/automation).

  </Accordion>

  <Accordion title="Cron déclenché, mais rien n'a été envoyé vers le channel. Pourquoi ?">
    Vérifiez d'abord le mode de livraison :

    - `--no-deliver` / `delivery.mode: "none"` signifie qu'aucun envoi de secours par le runner n'est attendu.
    - Une cible d'annonce manquante ou invalide (`channel` / `to`) signifie que le runner a ignoré la livraison sortante.
    - Les échecs d'authentification du channel (`unauthorized`, `Forbidden`) signifient que le runner a essayé de livrer mais que les identifiants l'ont bloqué.
    - Un résultat isolé silencieux (`NO_REPLY` / `no_reply` uniquement) est traité comme intentionnellement non livrable, le runner supprime donc également la livraison de secours en file d'attente.

    Pour les tâches cron isolées, l'agent peut toujours envoyer directement avec l'outil `message`
    lorsqu'une route de chat est disponible. `--announce` contrôle uniquement le chemin
    de secours du runner pour le texte final que l'agent n'a pas encore envoyé.

    Débogage :

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Docs : [Tâches Cron](/fr/automation/cron-jobs), [Tâches d'arrière-plan](/fr/automation/tasks).

  </Accordion>

  <Accordion title="Pourquoi une exécution cron isolée a-t-elle changé de model ou réessayé une fois ?">
    C'est généralement le chemin de changement de model en direct, et non une planification en double.

    Le cron isolé peut persister un transfert de model à l'exécution et réessayer lorsque l'exécution
    active lance `LiveSessionModelSwitchError`. La nouvelle tentative conserve le provider/model
    changé, et si le changement comportait une nouvelle substitution de profil d'auth, le cron
    la persiste également avant de réessayer.

    Règles de sélection associées :

    - La substitution de model par le hook Gmail l'emporte en premier le cas échéant.
    - Puis `model` par tâche.
    - Puis toute substitution de model de session cron stockée.
    - Puis la sélection normale de model agent/défaut.

    La boucle de nouvelle tentative est bornée. Après la tentative initiale plus 2 nouvelles tentatives de changement,
    le cron abandonne au lieu de boucler indéfiniment.

    Débogage :

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    Docs : [Tâches Cron](/fr/automation/cron-jobs), [cron CLI](/fr/cli/cron).

  </Accordion>

  <Accordion title="Comment installer des compétences sur Linux ?">
    Utilisez les commandes `openclaw skills` natives ou déposez des compétences dans votre espace de travail. L'interface utilisateur Skills de macOS n'est pas disponible sur Linux.
    Parcourez les compétences sur [https://clawhub.ai](https://clawhub.ai).

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills install <skill-slug> --global
    openclaw skills update --all
    openclaw skills update --all --global
    openclaw skills list --eligible
    openclaw skills check
    ```

    `openclaw skills install` natif écrit dans le répertoire `skills/` de l'espace de travail actif
    par défaut. Ajoutez `--global` pour installer dans le répertoire géré partagé
    des compétences pour tous les agents locaux. N'installez le CLI `clawhub` séparé
    que si vous souhaitez publier ou synchroniser vos propres compétences. Utilisez
    `agents.defaults.skills` ou `agents.list[].skills` si vous souhaitez restreindre
    les agents pouvant voir les compétences partagées.

  </Accordion>

  <Accordion title="OpenClaw%PH:GLOSSARY:984:9a93abf6%% peut-il exécuter des tâches selon un calendrier ou continuellement en arrière-plan ?">
    Oui. Utilisez le planificateur Gateway :

    - **Tâches Cron** pour les tâches planifiées ou récurrentes (persistent après redémarrage).
    - **Heartbeat** pour les vérifications périodiques de la « session principale ».
    - **Tâches isolées** pour les agents autonomes qui publient des résumés ou les livrent aux discussions.

    Documentation : [Tâches Cron](/fr/automation/cron-jobs), [Automatisation](/fr/automation),
    [Heartbeat](/fr/gateway/heartbeat).

  </Accordion>

  <Accordion title="macOSLinuxPuis-je exécuter des compétences exclusives à Apple macOS depuis Linux ?"macOS>
    Pas directement. Les compétences macOS sont limitées par `metadata.openclaw.os` ainsi que par les binaires requis, et n'apparaissent dans l'invite système que lorsqu'elles sont éligibles sur l'**hôte du Gateway**. Sur Linux, les compétences exclusives à `darwin` (telles que `apple-notes`, `apple-reminders`, `things-mac`) ne se chargeront pas à moins que vous ne contourniez le verrouillage.

    Vous avez trois modèles pris en charge :

    **Option A - exécuter le Gateway sur un Mac (le plus simple).**
    Exécutez le GatewaymacOS là où se trouvent les binaires macOS, puis connectez-vous depuis Linux en [mode distant](#gateway-ports-already-running-and-remote-mode) ou via Tailscale. Les compétences se chargent normalement car l'hôte du Gateway est macOS.

    **Option B - utiliser un nœud macOS (sans SSH).**
    Exécutez le Gateway sur Linux, associez un nœud macOS (application de barre de menus), et définissez **Node Run Commands** sur « Toujours demander » ou « Toujours autoriser » sur le Mac. OpenClaw peut considérer les compétences exclusives à macOS comme éligibles lorsque les binaires requis existent sur le nœud. L'agent exécute ces compétences via l'outil `nodes`macOS. Si vous choisissez « Toujours demander », approuver « Toujours autoriser » dans l'invite ajoute cette commande à la liste d'autorisation.

    **Option C - proxy des binaires macOS via SSH (avancé).**
    Conservez le Gateway sur Linux, mais faites en sorte que les binaires CLI requis résolvent vers des enveloppes SSH qui s'exécutent sur un Mac. Ensuite, substituez les métadonnées de la compétence pour autoriser Linux afin qu'elle reste éligible.

    1. Créez une enveloppe SSH pour le binaire (exemple : `memo` pour Apple Notes) :

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. Placez l'enveloppe sur `PATH` sur l'hôte Linux (par exemple `~/bin/memo`).
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
    Non intégrée pour l'instant.

    Options :

    - **Skill / plugin personnalisé :** le meilleur choix pour un accès fiable à l'API (Notion et HeyGen ont tous deux des API).
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

    Les installations natives atterrissent dans le répertoire de l'espace de travail actif `skills/`. Pour des compétences partagées entre tous les agents locaux, utilisez `openclaw skills install <slug> --global` (ou placez-les manuellement dans `~/.openclaw/skills/<name>/SKILL.md`). Si seuls certains agents doivent voir une installation partagée, configurez `agents.defaults.skills` ou `agents.list[].skills`. Certaines skills s'attendent à des binaires installés via Homebrew ; sur Linux, cela signifie Linuxbrew (voir l'entrée FAQ Homebrew Linux ci-dessus). Voir [Skills](/fr/tools/skills), [Skills config](/fr/tools/skills-config) et [ClawHub](/fr/tools/clawhub).

  </Accordion>

  <Accordion title="OpenClawComment utiliser mon Chrome connecté existant avec OpenClaw ?">
    Utilisez le profil de navigateur intégré `user`, qui se connecte via Chrome DevTools MCP :

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    Si vous souhaitez un nom personnalisé, créez un profil MCP explicite :

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```Gateway

    Ce chemin peut utiliser le navigateur de l'hôte local ou un nœud de navigateur connecté. Si la Gateway s'exécute ailleurs, exécutez soit un hôte de nœud sur la machine du navigateur, soit utilisez le CDP distant.

    Limites actuelles sur `existing-session` / `user` :

    - les actions sont basées sur les références, pas sur les sélecteurs CSS
    - les téléversements nécessitent `ref` / `inputRef` et prennent actuellement en charge un seul fichier à la fois
    - `responsebody`, l'export PDF, l'interception des téléchargements et les actions groupées nécessitent toujours un navigateur géré ou un profil CDP brut

  </Accordion>
</AccordionGroup>

## Bac à sable (Sandboxing) et mémoire

<AccordionGroup>
  <Accordion title="Y a-t-il une documentation dédiée au sandboxing ?">
    Oui. Voir [Sandboxing](/en/gateway/sandboxing). Pour une configuration spécifique à Docker (passerelle complète dans Docker ou images de sandbox), voir [Docker](/en/install/docker).
  </Accordion>

  <Accordion title="DockerDocker semble limité - comment activer toutes les fonctionnalités ?">
    L'image par défaut privilégie la sécurité et s'exécute en tant qu'utilisateur `node`, elle n'inclut donc pas
    les paquets système, Homebrew ou les navigateurs fournis. Pour une configuration plus complète :

    - Persistez `/home/node` avec `OPENCLAW_HOME_VOLUME` pour que les caches soient conservés.
    - Intégrez les dépendances système dans l'image avec `OPENCLAW_IMAGE_APT_PACKAGES`.
    - Installez les navigateurs Playwright via le CLI fourni :
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - Définissez `PLAYWRIGHT_BROWSERS_PATH`Docker et assurez-vous que le chemin est persisté.

    Docs : [Docker](/en/install/docker), [Navigateur](/en/tools/browser).

  </Accordion>

  <Accordion title="Puis-je garder les DMs personnels mais rendre les groupes publics/sandboxed avec un seul agent ?">
    Oui - si votre trafic privé est constitué de **DMs** et votre trafic public de **groupes**.

    Utilisez `agents.defaults.sandbox.mode: "non-main"` pour que les sessions de groupe/canal (clés non principales) s'exécutent dans le backend sandbox configuré, tandis que la session DM principale reste sur l'hôte. Docker est le backend par défaut si vous n'en choisissez pas un. Restreignez ensuite les outils disponibles dans les sessions sandboxed via `tools.sandbox.tools`.

    Procédure pas à pas + exemple de configuration : [Groupes : DMs personnels + groupes publics](/en/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Référence clé de configuration : [Configuration du Gateway](/en/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="Comment lier un dossier de l'hôte au bac à sable ?">
    Définissez `agents.defaults.sandbox.docker.binds` sur `["host:path:mode"]` (par ex., `"/home/user/src:/src:ro"`). Les liaisons globales + par agent fusionnent ; les liaisons par agent sont ignorées lorsque `scope: "shared"`. Utilisez `:ro`OpenClaw pour tout ce qui est sensible et rappelez-vous que les liaisons contournent les murs du système de fichiers du bac à sable.

    OpenClaw valide les sources de liaison par rapport à la fois au chemin normalisé et au chemin canonique résolu via l'ancêtre existant le plus profond. Cela signifie que les échappements par lien symbolique parent échouent toujours en mode fermé même lorsque le dernier segment du chemin n'existe pas encore, et que les vérifications de racine autorisée s'appliquent toujours après la résolution des liens symboliques.

    Voir [Sandboxing](/en/gateway/sandboxing#custom-bind-mounts) et [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) pour des exemples et des notes de sécurité.

  </Accordion>

  <Accordion title="Comment fonctionne la mémoire ?"OpenClaw>
    La mémoire OpenClaw se compose simplement de fichiers Markdown dans l'espace de travail de l'agent :

    - Notes quotidiennes dans `memory/YYYY-MM-DD.md`
    - Notes à long terme triées dans `MEMORY.md`OpenClaw (sessions principales/privées uniquement)

    OpenClaw exécute également une **vidange de mémoire silencieuse pré-compaction** pour rappeler au model
    d'écrire des notes durables avant la auto-compaction. Cela ne s'exécute que lorsque l'espace de travail
    est accessible en écriture (les bacs à sable en lecture seule l'ignorent). Voir [Memory](/en/concepts/memory).

  </Accordion>

  <Accordion title="La mémoire continue d'oublier des choses. Comment faire pour qu'elle les retienne ?">
    Demandez au bot **d'écrire le fait en mémoire**. Les notes à long terme appartiennent à `MEMORY.md`,
    le contexte à court terme va dans `memory/YYYY-MM-DD.md`Gateway.

    C'est encore un domaine que nous améliorons. Il aide de rappeler au model de stocker des souvenirs ;
    il saura quoi faire. S'il continue d'oublier, vérifiez que le Gateway utilise le même
    espace de travail à chaque exécution.

    Documentation : [Memory](/en/concepts/memory), [Agent workspace](/en/concepts/agent-workspace).

  </Accordion>

  <Accordion title="La mémoire persiste-t-elle pour toujours ? Quelles sont les limites ?">
    Les fichiers de mémoire sont stockés sur le disque et persistent jusqu'à ce que vous les supprimiez. La limite est votre
    espace de stockage, et non le modèle. Le **contexte de session** est toujours limité par la fenêtre de
    contexte du modèle, les longues conversations peuvent donc être compactées ou tronquées. C'est pourquoi
    la recherche de mémoire existe - elle ne rappelle dans le contexte que les parties pertinentes.

    Documentation : [Mémoire](/en/concepts/memory), [Contexte](/en/concepts/context).

  </Accordion>

  <Accordion title="La recherche sémantique dans la mémoire nécessite-t-elle une clé API OpenAIAPI ?">
    Seulement si vous utilisez les **embeddings OpenAI**. Codex OAuth couvre la conversation/complétion et
    n'accorde **pas** l'accès aux embeddings, donc **se connecter avec Codex (OAuth ou la
    connexion Codex CLI)** n'aide pas pour la recherche sémantique dans la mémoire. Les embeddings OpenAI
    nécessitent toujours une vraie clé API (`OPENAI_API_KEY` ou `models.providers.openai.apiKey`).

    Si vous ne définissez pas explicitement de fournisseur, OpenClaw utilise les embeddings OpenAI. Les configurations
    héritées qui indiquent toujours `memorySearch.provider = "auto"` résolvent également vers OpenAI.
    Si aucune clé API OpenAI API n'est disponible, la recherche sémantique dans la mémoire reste indisponible
    jusqu'à ce que vous configuriez une clé ou choisissiez explicitement un autre fournisseur.

    Si vous préférez rester local, définissez `memorySearch.provider = "local"` (et optionnellement
    `memorySearch.fallback = "none"`). Si vous voulez des embeddings Gemini, définissez
    `memorySearch.provider = "gemini"` et fournissez `GEMINI_API_KEY` (ou
    `memorySearch.remote.apiKey`). Nous prenons en charge les modèles d'embeddings **OpenAI, compatibles OpenAI, Gemini,
    Voyage, Mistral, Bedrock, Ollama, LM Studio, GitHub Copilot, DeepInfra, ou local**
    - voir [Mémoire](/en/concepts/memory) pour les détails de configuration.

  </Accordion>
</AccordionGroup>

## Emplacement des fichiers sur le disque

<AccordionGroup>
  <Accordion title="Toutes les données utilisées avec OpenClaw sont-elles sauvegardées localement ?">
    Non - **l'état d'OpenClaw est local**, mais **les services externes voient toujours ce que vous leur envoyez**.

    - **Local par défaut :** les sessions, les fichiers mémoire, la configuration et l'espace de travail résident sur l'hôte du Gateway
      (`~/.openclaw` + votre répertoire d'espace de travail).
    - **Distant par nécessité :** les messages que vous envoyez aux fournisseurs de modèles (Anthropic/OpenAI/etc.) sont envoyés à
      leurs API, et les plateformes de chat (WhatsApp/Telegram/Slack/etc.) stockent les données des messages sur leurs
      serveurs.
    - **Vous contrôlerez l'empreinte :** l'utilisation de modèles locaux garde les requêtes sur votre machine, mais le trafic
      des canaux passe toujours par les serveurs des canaux.

    Connexes : [Espace de travail de l'agent](/en/concepts/agent-workspace), [Mémoire](/en/concepts/memory).

  </Accordion>

  <Accordion title="Où OpenClaw stocke-t-il ses données ?">
    Tout se trouve sous `$OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`) :

    | Chemin                                                            | Objectif                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | Config principale (JSON5)                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`OAuth                    | Import d'authentification héritée (copié dans les profils d'auth lors de la première utilisation)       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json`OAuth | Profils d'auth (OAuth, clés API et optionnel `keyRef`/`tokenRef`)  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | Payload de secret optionnel sauvegardé dans un fichier pour les fournisseurs `file` SecretRef |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | Fichier de compatibilité héritée (entrées `api_key` statiques nettoyées)      |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | État du fournisseur (ex. `whatsapp/<accountId>/creds.json`)            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | État par agent (agentDir + sessions)                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | Historique des conversations et état (par agent)                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | Métadonnées de session (par agent)                                       |

    Chemin d'agent unique hérité : `~/.openclaw/agent/*` (migré par `openclaw doctor`).

    Votre **espace de travail** (AGENTS.md, fichiers mémoire, compétences, etc.) est distinct et configuré via `agents.defaults.workspace` (par défaut : `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title="Où doivent se trouver AGENTS.md / SOUL.md / USER.md / MEMORY.md ?">
    Ces fichiers se trouvent dans l'**espace de travail de l'agent**, et non dans `~/.openclaw`.

    - **Espace de travail (par agent)** : `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md`, `memory/YYYY-MM-DD.md`, `HEARTBEAT.md` en option.
      La racine en minuscule `memory.md` est réservée à la saisie de réparation héritée ; `openclaw doctor --fix`
      peut la fusionner dans `MEMORY.md` lorsque les deux fichiers existent.
    - **Répertoire d'état (`~/.openclaw`)** : configuration, état du canal/fournisseur, profils d'authentification, sessions, journaux,
      et compétences partagées (`~/.openclaw/skills`).

    L'espace de travail par défaut est `~/.openclaw/workspace`, configurable via :

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    Si le bot « oublie » après un redémarrage, vérifiez que le Gateway utilise le même
    espace de travail à chaque lancement (et rappelez-vous : le mode distant utilise l'espace de travail de l'**hôte de la passerelle**,
    et non celui de votre ordinateur portable local).

    Astuce : si vous souhaitez un comportement ou une préférence durable, demandez au bot de **l'écrire dans
    AGENTS.md ou MEMORY.md** plutôt que de vous fier à l'historique de la discussion.

    Voir [Espace de travail de l'agent](/fr/concepts/agent-workspace) et [Mémoire](/fr/concepts/memory).

  </Accordion>

  <Accordion title="Stratégie de sauvegarde recommandée">
    Placez votre **espace de travail de l'agent** dans un dépôt git **privé** et sauvegardez-le quelque part
    en privé (par exemple GitHub privé). Cela capture la mémoire + les fichiers AGENTS/SOUL/USER
    et vous permet de restaurer l'« esprit » de l'assistant plus tard.

    Ne **committez** rien sous `~/.openclaw` (identifiants, sessions, jetons ou charges utiles de secrets chiffrés).
    Si vous avez besoin d'une restauration complète, sauvegardez l'espace de travail et le répertoire d'état
    séparément (voir la question sur la migration ci-dessus).

    Documentation : [Espace de travail de l'agent](/fr/concepts/agent-workspace).

  </Accordion>

<Accordion title="Comment désinstaller complètement OpenClaw ?">Consultez le guide dédié : [Désinstallation](/fr/install/uninstall).</Accordion>

  <Accordion title="Les agents peuvent-ils travailler en dehors de l'espace de travail ?">
    Oui. L'espace de travail est le **répertoire de travail par défaut (cwd)** et l'ancre de mémoire, et non un sandbox strict.
    Les chemins relatifs sont résolus dans l'espace de travail, mais les chemins absolus peuvent accéder à d'autres
    emplacements de l'hôte à moins que le sandboxing ne soit activé. Si vous avez besoin d'isolation, utilisez
    [`agents.defaults.sandbox`](/fr/gateway/sandboxing) ou les paramètres de sandbox par agent. Si vous
    souhaitez qu'un dépôt soit le répertoire de travail par défaut, dirigez le `workspace` de cet agent
    vers la racine du dépôt. Le dépôt OpenClaw n'est que du code source ; gardez l'espace de
    travail séparé, sauf si vous voulez intentionnellement que l'agent travaille à l'intérieur.

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
    L'état de la session appartient à l'**hôte de la passerelle**. Si vous êtes en mode distant, le magasin de sessions qui vous concerne se trouve sur la machine distante, et non sur votre ordinateur portable local. Voir [Gestion des sessions](/fr/concepts/session).
  </Accordion>
</AccordionGroup>

## Config basics

<AccordionGroup>
  <Accordion title="Quel est le format de la configuration ? Où se trouve-t-elle ?">
    OpenClaw lit une configuration **JSON5** facultative depuis `$OPENCLAW_CONFIG_PATH` (par défaut : `~/.openclaw/openclaw.json`) :

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    Si le fichier est manquant, il utilise des paramètres par défaut assez sûrs (y compris un espace de travail par défaut de `~/.openclaw/workspace`).

  </Accordion>

  <Accordion title='J'ai défini gateway.bind : "lan" (ou "tailnet") et maintenant rien n'écoute / l'interface indique non autorisé'>
    Les liaisons non-boucle (non-loopback) **nécessitent un chemin d'authentification de passerelle valide**. En pratique, cela signifie :

    - authentification par secret partagé : jeton ou mot de passe
    - `gateway.auth.mode: "trusted-proxy"` derrière un proxy inverse conscient de l'identité correctement configuré

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
    - Pour l'authentification par mot de passe, définissez `gateway.auth.mode: "password"` plus `gateway.auth.password` (ou `OPENCLAW_GATEWAY_PASSWORD`) à la place.
    - Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution échoue de manière fermée (aucun masquage de repli distant).
    - Les configurations de l'interface de contrôle avec secret partagé s'authentient via `connect.params.auth.token` ou `connect.params.auth.password` (stockés dans les paramètres de l'application/interface). Les modes porteurs d'identité tels que Tailscale Serve ou `trusted-proxy` utilisent plutôt les en-têtes de requête. Évitez de mettre des secrets partagés dans les URL.
    - Avec `gateway.auth.mode: "trusted-proxy"`, les proxies inverses de boucle sur le même hôte nécessitent un `gateway.auth.trustedProxy.allowLoopback = true` explicite et une entrée de boucle dans `gateway.trustedProxies`.

  </Accordion>

  <Accordion title="Pourquoi ai-je besoin d'un jeton sur localhost maintenant ?"OpenClaw>
    OpenClaw applique l'authentification de la Gateway par défaut, y compris pour le bouclage (loopback). Dans le chemin normal par défaut, cela signifie une authentification par jeton : si aucun chemin d'authentification explicite n'est configuré, le démarrage de la Gateway passe en mode jeton et génère un jeton valable uniquement pour l'exécution en cours, donc **les clients WS locaux doivent s'authentifier**. Configurez `gateway.auth.token`, `gateway.auth.password`, `OPENCLAW_GATEWAY_TOKEN` ou `OPENCLAW_GATEWAY_PASSWORD`Gateway explicitement lorsque les clients ont besoin d'un secret stable entre les redémarrages. Cela empêche d'autres processus locaux d'appeler la Gateway.

    Si vous préférez un chemin d'authentification différent, vous pouvez explicitement choisir le mode mot de passe (ou, pour les proxies inversés conscients de l'identité, `trusted-proxy`). Si vous **voulez vraiment** un bouclage ouvert, définissez `gateway.auth.mode: "none"` explicitement dans votre configuration. Le Doctor peut générer un jeton pour vous à tout moment : `openclaw doctor --generate-gateway-token`.

  </Accordion>

  <Accordion title="Dois-je redémarrer après avoir modifié la configuration ?"Gateway>
    La Gateway surveille la configuration et prend en charge le rechargement à chaud (hot-reload) :

    - `gateway.reload.mode: "hybrid"` (par défaut) : applique à chaud les modifications sûres, redémarre pour les critiques
    - `hot`, `restart`, `off` sont également pris en charge

  </Accordion>

  <Accordion title="CLIComment désactiver les slogans amusants de la CLI ?">
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
    - `random` : rotation de slogans amusants/saisonniers (comportement par défaut).
    - Si vous ne voulez aucune bannière du tout, définissez la variable d'environnement `OPENCLAW_HIDE_BANNER=1`.

  </Accordion>

  <Accordion title="Comment activer la recherche web (et la récupération web) ?">
    `web_fetch`API fonctionne sans clé API. `web_search`APIBraveFirecrawlMiniMaxPerplexityAPIOAuth dépend de votre
    provider sélectionné :

    - Les providers basés sur une API tels que Brave, Exa, Firecrawl, Gemini, Kimi, MiniMax Search, Perplexity et Tavily nécessitent leur configuration de clé API habituelle.
    - Grok peut réutiliser xAI OAuth depuis l'auth du modèle, ou revenir à `XAI_API_KEY`OllamaOllama / config du plugin web-search.
    - Ollama Web Search est sans clé, mais il utilise votre hôte Ollama configuré et nécessite `ollama signin`.
    - DuckDuckGo est sans clé, mais c'est une intégration non officielle basée sur HTML.
    - SearXNG est sans clé/auto-hébergé ; configurez `SEARXNG_BASE_URL` ou `plugins.entries.searxng.config.webSearch.baseUrl`.

    **Recommandé :** exécutez `openclaw configure --section web`Brave et choisissez un provider.
    Alternatives d'environnement :

    - Brave : `BRAVE_API_KEY`
    - Exa : `EXA_API_KEY`Firecrawl
    - Firecrawl : `FIRECRAWL_API_KEY`
    - Gemini : `GEMINI_API_KEY`OAuth
    - Grok : xAI OAuth, `XAI_API_KEY`
    - Kimi : `KIMI_API_KEY` ou `MOONSHOT_API_KEY`MiniMax
    - MiniMax Search : `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY` ou `MINIMAX_API_KEY`Perplexity
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

    La configuration spécifique au provider de la recherche web se trouve maintenant sous `plugins.entries.<plugin>.config.webSearch.*`.
    Les anciens chemins de provider `tools.web.search.*`Firecrawl sont encore chargés temporairement pour compatibilité, mais ils ne doivent pas être utilisés pour les nouvelles configurations.
    La configuration de repli web-fetch de Firecrawl se trouve sous `plugins.entries.firecrawl.config.webFetch.*`.

    Notes :

    - Si vous utilisez des listes blanches, ajoutez `web_search`/`web_fetch`/`x_search` ou `group:web`.
    - `web_fetch` est activé par défaut (sauf désactivation explicite).
    - Si `tools.web.fetch.provider`OpenClawFirecrawl est omis, OpenClaw détecte automatiquement le premier provider de repli de récupération prêt parmi les identifiants disponibles. Aujourd'hui, le provider inclus est Firecrawl.
    - Les démons lisent les env vars depuis `~/.openclaw/.env` (ou l'environnement du service).

    Documentation : [Web tools](/fr/tools/web).

  </Accordion>

  <Accordion title="config.apply a effacé ma configuration. Comment récupérer et éviter cela ?">
    `config.apply` remplace la **configuration entière**. Si vous envoyez un objet partiel, tout
    le reste est supprimé.

    OpenClaw actuel protège contre de nombreux écrasements accidentels :

    - Les écritures de configuration détenues par OpenClaw valident la configuration complète après modification avant l'écriture.
    - Les écritures invalides ou destructrices détenues par OpenClaw sont rejetées et sauvegardées sous `openclaw.json.rejected.*`.
    - Si une modification directe casse le démarrage ou le rechargement à chaud, Gateway échoue en mode fermé ou ignore le rechargement ; il ne réécrit pas `openclaw.json`.
    - `openclaw doctor --fix` gère la réparation et peut restaurer le dernier état valide tout en sauvegardant le fichier rejeté sous `openclaw.json.clobbered.*`.

    Récupération :

    - Vérifiez `openclaw logs --follow` pour `Invalid config at`, `Config write rejected:` ou `config reload skipped (invalid config)`.
    - Inspectez le plus récent `openclaw.json.clobbered.*` ou `openclaw.json.rejected.*` à côté de la configuration active.
    - Exécutez `openclaw config validate` et `openclaw doctor --fix`.
    - Copiez uniquement les clés souhaitées avec `openclaw config set` ou `config.patch`.
    - Si vous n'avez pas de dernier état valide ou de payload rejeté, restaurez depuis une sauvegarde, ou relancez `openclaw doctor` et reconfigurez les canaux/modèles.
    - Si c'était inattendu, signalez un bogue et incluez votre dernière configuration connue ou toute sauvegarde.
    - Un agent de codage local peut souvent reconstruire une configuration fonctionnelle à partir des journaux ou de l'historique.

    Pour l'éviter :

    - Utilisez `openclaw config set` pour les petites modifications.
    - Utilisez `openclaw configure` pour les modifications interactives.
    - Utilisez `config.schema.lookup` d'abord si vous n'êtes pas sûr d'un chemin exact ou de la forme d'un champ ; il renvoie un nœud de schéma superficiel plus des résumés des enfants immédiats pour un forage.
    - Utilisez `config.patch` pour les modifications RPC partielles ; gardez `config.apply` uniquement pour le remplacement complet de la configuration.
    - Si vous utilisez l'outil `gateway` orienté agent depuis une exécution d'agent, il rejettera toujours les écritures sur `tools.exec.ask` / `tools.exec.security` (y compris les alias `tools.bash.*` hérités qui se normalisent vers les mêmes chemins d'exécution protégés).

    Docs : [Config](/fr/cli/config), [Configure](/fr/cli/configure), [Gateway troubleshooting](/fr/gateway/troubleshooting#gateway-rejected-invalid-config), [Doctor](/fr/gateway/doctor).

  </Accordion>

  <Accordion title="GatewayComment exécuter une passerelle centrale avec des workers spécialisés sur plusieurs appareils ?"GatewayRaspberry PiGatewaySignalWhatsAppiOSAndroid>
    Le modèle courant consiste en **une passerelle** (par ex. Raspberry Pi) plus des **nœuds** et des **agents** :

    - **Passerelle (centrale) :** possède les canaux (Signal/WhatsApp), le routage et les sessions.
    - **Nœuds (appareils) :** les Mac/iOS/Android se connectent comme périphériques et exposent des outils locaux (`system.run`, `canvas`, `camera`HetznerTUIGateway).
    - **Agents (workers) :** des cerveaux/espaces de travail distincts pour des rôles spéciaux (par ex. « ops Hetzner », « Données personnels »).
    - **Sous-agents :** lancent des travaux en arrière-plan à partir d'un agent principal lorsque vous souhaitez du parallélisme.
    - **TUI :** se connecte à la passerelle et permet de changer d'agents/sessions.

    Docs : [Nœuds](/fr/nodes), [Accès à distance](/fr/gateway/remote), [Routage multi-agent](/fr/concepts/multi-agent), [Sous-agents](/fr/tools/subagentsTUI), [TUI](/fr/web/tui).

  </Accordion>

  <Accordion title="OpenClawLe navigateur OpenClaw peut-il s'exécuter en mode headless ?">
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

    La valeur par défaut est `false` (headful). Le mode headless est plus susceptible de déclencher des détections anti-bot sur certains sites. Voir [Navigateur](/fr/tools/browser).

    Le mode headless utilise le **même moteur Chromium** et fonctionne pour la plupart des automatisations (formulaires, clics, scraping, connexions). Les principales différences :

    - Aucune fenêtre de navigateur visible (utilisez des captures d'écran si vous avez besoin d'éléments visuels).
    - Certains sites sont plus stricts concernant l'automatisation en mode headless (CAPTCHAs, anti-bot).
      Par exemple, X/Twitter bloque souvent les sessions headless.

  </Accordion>

  <Accordion title="BraveComment utiliser Brave pour le contrôle du navigateur ?">
    Définissez `browser.executablePath`BraveGateway sur votre binaire Brave (ou tout autre navigateur basé sur Chromium) et redémarrez le Gateway.
    Voir les exemples de configuration complets dans [Navigateur](/fr/tools/browser#use-brave-or-another-chromium-based-browser).
  </Accordion>
</AccordionGroup>

## Gateways et nœuds distants

<AccordionGroup>
  <Accordion title="TelegramComment les commandes se propagent-elles entre Telegram, la passerelle et les nœuds ?"TelegramGatewayTelegramGateway>
    Les messages Telegram sont gérés par le **gateway**. Le gateway exécute l'agent et
    n'appelle ensuite les nœuds via le **Gateway WebSocket** que lorsqu'un outil de nœud est nécessaire :

    Telegram → Gateway → Agent → `node.*`GatewayTelegramRPC → Node → Gateway → Telegram

    Les nœuds ne voient pas le trafic provider entrant ; ils ne reçoivent que des appels RPC de nœud.

  </Accordion>

  <Accordion title="GatewayComment mon agent peut-il accéder à mon ordinateur si le Gateway est hébergé à distance ?"Gateway>
    Réponse courte : **associez votre ordinateur en tant que nœud**. Le Gateway s'exécute ailleurs, mais il peut
    appeler des outils `node.*`GatewayGatewayGatewayGatewaymacOSGateway (écran, caméra, système) sur votre machine locale via le WebSocket du Gateway.

    Configuration type :

    1. Exécutez le Gateway sur l'hôte toujours actif (VPS/serveur domestique).
    2. Placez l'hôte du Gateway et votre ordinateur sur le même tailnet.
    3. Assurez-vous que le WS du Gateway est accessible (liaison tailnet ou tunnel SSH).
    4. Ouvrez l'application macOS localement et connectez-vous en mode **Remote sur SSH** (ou tailnet direct)
       afin qu'il puisse s'enregistrer en tant que nœud.
    5. Approuvez le nœud sur le Gateway :

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```GatewaymacOS

    Aucun pont TCP distinct n'est requis ; les nœuds se connectent via le WebSocket du Gateway.

    Rappel de sécurité : associer un nœud macOS permet `system.run` sur cette machine. N'associez
    que des appareils de confiance, et consultez [Sécurité](/en/gateway/security).

    Documentation : [Nœuds](/en/nodesGateway), [Protocole Gateway](/en/gateway/protocolmacOS), [Mode distant macOS](/en/platforms/mac/remote), [Sécurité](/en/gateway/security).

  </Accordion>

  <Accordion title="TailscaleTailscale est connecté mais je ne reçois aucune réponse. Que faire maintenant ?"Gateway>
    Vérifiez les bases :

    - Le Gateway fonctionne : `openclaw gateway status`Gateway
    - Santé du Gateway : `openclaw status`
    - Santé du channel : `openclaw channels status`Tailscale

    Vérifiez ensuite l'authentification et le routage :

    - Si vous utilisez Tailscale Serve, assurez-vous que `gateway.auth.allowTailscale`Tailscale est défini correctement.
    - Si vous vous connectez via un tunnel SSH, confirmez que le tunnel local est actif et pointe vers le bon port.
    - Confirmez que vos listes d'autorisation (DM ou groupe) incluent votre compte.

    Docs : [Tailscale](/en/gateway/tailscale), [Accès distant](/en/gateway/remote), [Channels](/en/channels).

  </Accordion>

  <Accordion title="OpenClawDeux instances OpenClaw peuvent-elles communiquer entre elles (local + VPS) ?"TelegramSlackWhatsAppCLIGateway>
    Oui. Il n'y a pas de pont "bot-to-bot" intégré, mais vous pouvez le configurer de quelques
    manières fiables :

    **Le plus simple :** utilisez un channel de chat normal auquel les deux bots peuvent accéder (Telegram/Slack/WhatsApp).
    Faites en sorte que le Bot A envoie un message au Bot B, puis laissez le Bot B répondre comme d'habitude.

    **Pont CLI (générique) :** exécutez un script qui appelle l'autre Gateway avec
    `openclaw agent --message ... --deliver`CLIGatewayTailscale, en ciblant un chat où l'autre bot
    écoute. Si un bot est sur un VPS distant, pointez votre CLI vers ce Gateway distant
    via SSH/Tailscale (voir [Accès distant](/en/gateway/remoteGateway)).

    Exemple de modèle (exécuté depuis une machine qui peut atteindre le Gateway cible) :

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    Astuce : ajoutez une garde-fou pour que les deux bots ne bouclent pas indéfiniment (mention uniquement, listes d'autorisation de channel, ou une règle "ne pas répondre aux messages de bot").

    Docs : [Accès distant](/fr/gateway/remoteCLI), [Agent CLI](/fr/cli/agent), [Agent send](/fr/tools/agent-send).

  </Accordion>

  <Accordion title="Do I need separate VPSes for multiple agents?">
    Non. Un Gateway peut héberger plusieurs agents, chacun avec son propre espace de travail, les paramètres par défaut du modèle,
    et le routage. C'est la configuration normale et c'est beaucoup moins cher et plus simple que de faire tourner
    un VPS par agent.

    Utilisez des VPS distincts uniquement lorsque vous avez besoin d'une isolation stricte (limites de sécurité) ou de configurations
    très différentes que vous ne souhaitez pas partager. Sinon, gardez un Gateway et
    utilisez plusieurs agents ou sous-agents.

  </Accordion>

  <Accordion title="Y a-t-il un avantage à utiliser un nœud sur mon ordinateur portable personnel plutôt qu'un SSH depuis un VPS ?"GatewayGatewaymacOSLinuxWindowsWSL2Raspberry PiGateway>
    Oui - les nœuds constituent la méthode privilégiée pour accéder à votre ordinateur portable depuis un Gateway distant, et ils offrent plus qu'un simple accès shell. Le Gateway fonctionne sous macOS/Linux (Windows via WSL2) et est léger (un petit VPS ou une boîte de classe Raspberry Pi convient ; 4 Go de RAM sont suffisants), donc une configuration courante consiste en un hôte toujours allumé plus votre ordinateur portable en tant que nœud.

    - **Pas de SSH entrant requis.** Les nœuds se connectent au WebSocket du Gateway et utilisent l'appairage d'appareils.
    - **Contrôles d'exécution plus sûrs.** `system.run` est limité par les listes d'autorisation/approbations des nœuds sur cet ordinateur portable.
    - **Plus d'outils d'appareil.** Les nœuds exposent `canvas`, `camera` et `screen` en plus de `system.run`Gateway.
    - **Automatisation du navigateur locale.** Gardez le Gateway sur un VPS, mais exécutez Chrome localement via un hôte de nœud sur l'ordinateur portable, ou attachez-vous au Chrome local sur l'hôte via Chrome MCP.

    SSH convient pour un accès shell ad hoc, mais les nœuds sont plus simples pour les flux de travail d'agents continus et l'automatisation des appareils.

    Docs : [Nodes](/fr/nodesCLI), [Nodes CLI](/fr/cli/nodes), [Browser](/fr/tools/browser).

  </Accordion>

  <Accordion title="Do nodes run a gateway service?">
    Non. Un seul **gateway** doit s'exécuter par hôte, sauf si vous exécutez intentionnellement des profils isolés (voir [Multiple gateways](/fr/gateway/multiple-gateways)). Les nœuds sont des périphériques qui se connectent
    au gateway (nœuds iOS/Android, ou "mode nœud" macOS dans l'application de la barre de menus). Pour les hôtes de nœuds sans interface (headless) et le contrôle CLI, voir [Node host CLI](/fr/cli/node).

    Un redémarrage complet est requis pour `gateway`, `discovery`, et les modifications de la surface des plugins hébergés.

  </Accordion>

  <Accordion title="Existe-t-il un moyen API / RPC d'appliquer la configuration ?">
    Oui.

    - `config.schema.lookup` : inspecter un sous-arbre de configuration avec son nœud de schéma superficiel, l'indice d'interface utilisateur correspondant et les résumés des enfants immédiats avant l'écriture
    - `config.get` : récupérer l'instantané actuel + le hachage
    - `config.patch` : mise à jour partielle sécurisée (préférée pour la plupart des modifications RPC) ; rechargement à chaud lorsque possible et redémarrage si nécessaire
    - `config.apply` : valider + remplacer la configuration complète ; rechargement à chaud lorsque possible et redémarrage si nécessaire
    - L'outil d'exécution `gateway` orienté agent refuse toujours de réécrire `tools.exec.ask` / `tools.exec.security` ; les alias `tools.bash.*` hérités sont normalisés vers les mêmes chemins d'exécution protégés

  </Accordion>

  <Accordion title="Configuration saine minimale pour une première installation">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    Cela définit votre espace de travail et restreint qui peut déclencher le bot.

  </Accordion>

  <Accordion title="TailscaleHow do I set up Tailscale on a VPS and connect from my Mac?">
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

    Si vous souhaitez l'interface utilisateur de contrôle sans SSH, utilisez Tailscale Serve sur le VPS :

    ```bash
    openclaw gateway --tailscale serve
    ```

    Cela permet de garder le gateway lié à loopback et d'exposer HTTPS via Tailscale. Voir [Tailscale](/fr/gateway/tailscale).

  </Accordion>

  <Accordion title="GatewayTailscaleComment connecter un nœud Mac à une Gateway distante (Tailscale Serve) ?"GatewayGatewaymacOSGateway>
    Serve expose l'**interface utilisateur de contrôle Gateway + WS**. Les nœuds se connectent via le même point de terminaison WS de la Gateway.

    Configuration recommandée :

    1. **Assurez-vous que le VPS + le Mac sont sur le même tailnet**.
    2. **Utilisez l'application macOS en mode distant** (la cible SSH peut être le nom d'hôte du tailnet).
       L'application va tunnéliser le port de la Gateway et se connecter en tant que nœud.
    3. **Approuvez le nœud** sur la gateway :

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```Gateway

    Docs : [Protocole Gateway](/en/gateway/protocol), [Discovery](/en/gateway/discoverymacOS), [mode distant macOS](/en/platforms/mac/remote).

  </Accordion>

  <Accordion title="Dois-je installer sur un deuxième ordinateur portable ou simplement ajouter un nœud ?"GatewaymacOSGateway>
    Si vous avez uniquement besoin d'**outils locaux** (écran/caméra/exéc) sur le deuxième ordinateur portable, ajoutez-le en tant que
    **nœud**. Cela permet de conserver une seule Gateway et évite une configuration dupliquée. Les outils de nœud locaux sont
    actuellement réservés à macOS, mais nous prévoyons de les étendre à d'autres systèmes d'exploitation.

    Installez une deuxième Gateway uniquement si vous avez besoin d'une **isolement strict** ou de deux bots entièrement distincts.

    Docs : [Nœuds](/en/nodesCLI), [CLI des nœuds](/en/cli/nodes), [Gateways multiples](/en/gateway/multiple-gateways).

  </Accordion>
</AccordionGroup>

## Variables d'environnement et chargement .env

<AccordionGroup>
  <Accordion title="Comment OpenClaw charge-t-il les variables d'environnement ?">
    OpenClaw lit les variables d'environnement du processus parent (shell, launchd/systemd, CI, etc.) et charge également :

    - `.env` depuis le répertoire de travail actuel
    - un `.env` global de repli depuis `~/.openclaw/.env` (aussi appelé `$OPENCLAW_STATE_DIR/.env`)

    Aucun fichier `.env` ne remplace les variables d'environnement existantes.
    Les variables d'identification des fournisseurs constituent une exception pour le `.env` de l'espace de travail : les clés telles que
    `GEMINI_API_KEY`, `XAI_API_KEY` ou `MISTRAL_API_KEY` sont ignorées depuis le `.env` de l'espace de travail
    et doivent résider dans l'environnement du processus, `~/.openclaw/.env`, ou la `env` de configuration.

    Vous pouvez également définir des variables d'environnement en ligne dans la configuration (appliquées uniquement si elles sont absentes de l'environnement du processus) :

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    Voir [/environment](/fr/help/environment) pour l'ordre de priorité complet et les sources.

  </Accordion>

  <Accordion title="J'ai démarré le Gateway via le service et mes env vars ont disparu. Que faire maintenant ?">
    Deux correctifs courants :

    1. Mettez les clés manquantes dans `~/.openclaw/.env` pour qu'elles soient détectées même lorsque le service n'hérite pas de votre environnement de shell.
    2. Activez l'importation du shell (commodité optionnelle) :

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

    Cela exécute votre shell de connexion et importe uniquement les clés attendues manquantes (ne remplace jamais). Équivalents en env vars :
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='J'ai défini COPILOT_GITHUB_TOKEN, mais l'état des modèles affiche "Shell env: off." Pourquoi ?'>
    `openclaw models status` indique si l'**importation de l'environnement du shell** est activée. "Shell env: off"
    ne signifie **pas** que vos variables d'environnement sont manquantes - cela signifie juste que OpenClaw ne chargera
    pas votre shell de connexion automatiquement.

    Si le Gateway s'exécute en tant que service (launchd/systemd), il n'héritera pas de votre
    environnement de shell. Corrigez cela en effectuant l'une de ces actions :

    1. Mettez le jeton dans `~/.openclaw/.env` :

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. Ou activez l'importation du shell (`env.shellEnv.enabled: true`).
    3. Ou ajoutez-le à votre bloc de configuration `env` (s'applique uniquement en cas d'absence).

    Redémarrez ensuite la passerelle et vérifiez à nouveau :

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
    Envoyez `/new` ou `/reset` comme un message autonome. Voir [Gestion de session](/fr/concepts/session).
  </Accordion>

  <Accordion title="Les sessions se réinitialisent-elles automatiquement si je n'envoie jamais /new ?">
    Les sessions peuvent expirer après `session.idleMinutes`, mais ceci est **désactivé par défaut** (par défaut **0**).
    Définissez une valeur positive pour activer l'expiration d'inactivité. Lorsqu'elle est activée, le message **suivant**
    après la période d'inactivité démarre un identifiant de session frais pour cette clé de chat.
    Cela ne supprime pas les transcriptions - cela commence simplement une nouvelle session.

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="Y a-t-il un moyen de constituer une équipe d'instances OpenClaw (un PDG et de nombreux agents) ?">
    Oui, via le **routage multi-agents** et les **sous-agents**. Vous pouvez créer un agent coordinateur
    et plusieurs agents de travail avec leurs propres espaces de travail et modèles.

    Cela dit, il est préférable de considérer cela comme une **expérience amusante**. Cela consomme beaucoup de jetons et est souvent
    moins efficace que d'utiliser un seul bot avec des sessions séparées. Le modèle typique que
    nous envisageons est un seul bot avec lequel vous parlez, avec différentes sessions pour le travail parallèle. Ce
    bot peut également générer des sous-agents si nécessaire.

    Docs : [Routage multi-agents](/fr/concepts/multi-agent), [Sous-agents](/fr/tools/subagents), [CLI des agents](/fr/cli/agents).

  </Accordion>

  <Accordion title="Pourquoi le contexte a-t-il été tronqué en cours de tâche ? Comment puis-je l'empêcher ?">
    Le contexte de la session est limité par la fenêtre du modèle. Les longues conversations, les sorties d'outils volumineuses, ou de nombreux
    fichiers peuvent déclencher une compactage ou une troncature.

    Ce qui aide :

    - Demandez au bot de résumer l'état actuel et de l'écrire dans un fichier.
    - Utilisez `/compact` avant les longues tâches, et `/new` lors du changement de sujet.
    - Gardez le contexte important dans l'espace de travail et demandez au bot de le relire.
    - Utilisez des sous-agents pour le travail long ou parallèle afin que le chat principal reste plus léger.
    - Choisissez un modèle avec une fenêtre de contexte plus grande si cela arrive souvent.

  </Accordion>

  <Accordion title="Comment réinitialiser complètement OpenClaw tout en le conservant installé ?">
    Utilisez la commande de réinitialisation :

    ```bash
    openclaw reset
    ```

    Réinitialisation complète non interactive :

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    Réexécutez ensuite la configuration :

    ```bash
    openclaw onboard --install-daemon
    ```

    Notes :

    - La prise en main offre également une option de **Réinitialisation** si elle détecte une configuration existante. Voir [Onboarding (CLI)](/fr/start/wizard).
    - Si vous avez utilisé des profils (`--profile` / `OPENCLAW_PROFILE`), réinitialisez chaque répertoire d'état (ceux par défaut sont `~/.openclaw-<profile>`).
    - Réinitialisation de développement : `openclaw gateway --dev --reset` (développement uniquement ; efface la configuration de développement, les identifiants, les sessions et l'espace de travail).

  </Accordion>

  <Accordion title='Je reçois des erreurs « context too large » (contexte trop volumineux) — comment réinitialiser ou compacter ?'>
    Utilisez l'une de ces méthodes :

    - **Compacter** (conserve la conversation mais résume les tours plus anciens) :

      ```
      /compact
      ```

      ou `/compact <instructions>` pour guider le résumé.

    - **Réinitialiser** (nouvel ID de session pour la même clé de discussion) :

      ```
      /new
      /reset
      ```

    Si cela continue :

    - Activez ou ajustez le **nettoyage de session** (`agents.defaults.contextPruning`) pour supprimer les anciennes sorties d'outils.
    - Utilisez un modèle avec une fenêtre contextuelle plus grande.

    Documentation : [Compactage](/fr/concepts/compaction), [Nettoyage de session](/fr/concepts/session-pruning), [Gestion des sessions](/fr/concepts/session).

  </Accordion>

  <Accordion title='Pourquoi vois-je « LLM request rejected: messages.content.tool_use.input field required » ?'>
    Il s'agit d'une erreur de validation du fournisseur : le modèle a émis un bloc `tool_use` sans le champ requis
    `input`. Cela signifie généralement que l'historique de la session est périmé ou corrompu (souvent après des fils longs
    ou un changement d'outil/de schéma).

    Solution : démarrez une session fraîche avec `/new` (message autonome).

  </Accordion>

  <Accordion title="Pourquoi reçois-je des messages de battement de cœur (heartbeat) toutes les 30 minutes ?">
    Les battements de cœur s'exécutent toutes les **30 m** par défaut (**1 h** lors de l'utilisation de l'authentification OAuth). Ajustez-les ou désactivez-les :

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

    Si `HEARTBEAT.md` existe mais est effectivement vide (uniquement des lignes vides et des en-têtes
    markdown comme `# Heading`), OpenClaw ignore l'exécution du battement de cœur pour économiser les appels API.
    Si le fichier est manquant, le battement de cœur s'exécute toujours et le modèle décide de ce qu'il faut faire.

    Les remplacements par agent utilisent `agents.list[].heartbeat`. Documentation : [Battement de cœur](/fr/gateway/heartbeat).

  </Accordion>

  <Accordion title='Dois-je ajouter un « compte bot » à un groupe WhatsApp ?'>
    Non. OpenClaw fonctionne sur **votre propre compte**, donc si vous êtes dans le groupe, OpenClaw peut le voir.
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

  <Accordion title="WhatsAppComment obtenir le JID d'un groupe WhatsApp ?">
    Option 1 (la plus rapide) : surveillez les journaux (tail logs) et envoyez un message test dans le groupe :

    ```bash
    openclaw logs --follow --json
    ```

    Recherchez `chatId` (ou `from`) se terminant par `@g.us`, par exemple :
    `1234567890-1234567890@g.us`.

    Option 2 (si déjà configuré/autorisé) : lister les groupes depuis la configuration :

    ```bash
    openclaw directory groups list --channel whatsapp
    ```WhatsApp

    Documentation : [WhatsApp](/en/channels/whatsapp), [Répertoire](/en/cli/directory), [Journaux](/en/cli/logs).

  </Accordion>

  <Accordion title="OpenClawPourquoi OpenClaw ne répond-il pas dans un groupe ?">
    Deux causes courantes :

    - Le filtrage par mention est activé (par défaut). Vous devez mentionner le bot (@mention) ou correspondre à `mentionPatterns`.
    - Vous avez configuré `channels.whatsapp.groups` sans `"*"` et le groupe n'est pas autorisé.

    Voir [Groupes](/en/channels/groups) et [Messages de groupe](/en/channels/group-messages).

  </Accordion>

<Accordion title="Les groupes/fils partagent-ils le contexte avec les DMs ?" TelegramDiscord>
  Les discussions directes sont réduites à la session principale par défaut. Les groupes/canaux ont leurs propres clés de session, et les sujets Telegram / les fils Discord sont des sessions séparées. Voir [Groupes](/en/channels/groups) et [Messages de groupe](/en/channels/group-messages).
</Accordion>

  <Accordion title="Combien d'espaces de travail et d'agents puis-je créer ?">
    Aucune limite stricte. Des dizaines (voire des centaines) sont acceptables, mais surveillez :

    - **Croissance du disque :** les sessions + transcriptions résident sous `~/.openclaw/agents/<agentId>/sessions/`.
    - **Coût des jetons :** plus d'agents signifie une utilisation simultanée plus importante du modèle.
    - **Surcharge opérationnelle :** profils d'authentification par agent, espaces de travail et routage des canaux.

    Conseils :

    - Gardez un espace de travail **actif** par agent (`agents.defaults.workspace`).
    - Nettoyez les anciennes sessions (supprimez les entrées JSONL ou du magasin) si le disque grossit.
    - Utilisez `openclaw doctor` pour repérer les espaces de travail orphelins et les incohérences de profils.

  </Accordion>

  <Accordion title="Puis-je exécuter plusieurs bots ou discussions en même temps (Slack), et comment dois-je configurer cela ?">
    Oui. Utilisez le **Multi-Agent Routing** pour exécuter plusieurs agents isolés et acheminer les messages entrants par
    canal/compte/pair. Slack est pris en charge en tant que canal et peut être lié à des agents spécifiques.

    L'accès via le navigateur est puissant mais ne permet pas de "faire tout ce qu'un humain peut faire" ; les mesures anti-bot, les CAPTCHAs et la MFA peuvent
    toujours bloquer l'automatisation. Pour le contrôle du navigateur le plus fiable, utilisez le Chrome MCP local sur l'hôte,
    ou utilisez le CDP sur la machine qui exécute réellement le navigateur.

    Configuration recommandée :

    - Hôte Gateway toujours actif (VPS/Mac mini).
    - Un agent par rôle (liaisons).
    - Canal(x) Slack lié(s) à ces agents.
    - Navigateur local via Chrome MCP ou un nœud si nécessaire.

    Docs : [Multi-Agent Routing](/en/concepts/multi-agent), [Slack](/en/channels/slack),
    [Navigateur](/en/tools/browser), [Nœuds](/en/nodes).

  </Accordion>
</AccordionGroup>

## Modèles, basculement et profils d'authentification

Q&R Modèle — valeurs par défaut, sélection, alias, basculement, profils d'authentification —
se trouve dans la [FAQ Modèles](/en/help/faq-models).

## Gateway : ports, « déjà en cours d'exécution » et mode distant

<AccordionGroup>
  <Accordion title="Quel port le Gateway utilise-t-il ?">
    `gateway.port` contrôle le port multiplexé unique pour WebSocket + HTTP (UI de contrôle, hooks, etc.).

    Priorité :

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='Pourquoi le statut de la passerelle openclaw indique-t-il « Runtime : en cours d'exécution » mais « Connectivity probe : échec » ?'>
    Parce que « en cours d'exécution » est la vue du **superviseur** (launchd/systemd/schtasks). La sonde de connectivité est la CLI se connectant réellement au WebSocket de la passerelle.

    Utilisez `openclaw gateway status` et faites confiance à ces lignes :

    - `Probe target:` (l'URL réellement utilisée par la sonde)
    - `Listening:` (ce qui est réellement lié au port)
    - `Last gateway error:` (cause racine courante lorsque le processus est actif mais que le port n'écoute pas)

  </Accordion>

  <Accordion title='Pourquoi le statut de la passerelle OpenClaw indique-t-il des valeurs différentes pour « Config (cli) » et « Config (service) » ?'>
    Vous modifiez un fichier de configuration alors que le service en utilise un autre (souvent une inadéquation `--profile` / `OPENCLAW_STATE_DIR`).

    Correction :

    ```bash
    openclaw gateway install --force
    ```

    Exécutez cette commande depuis le même `--profile` / environnement que celui que vous souhaitez que le service utilise.

  </Accordion>

  <Accordion title='Que signifie « another gateway instance is already listening » ?'>
    OpenClaw applique un verrou d'exécution en liant l'écouteur WebSocket immédiatement au démarrage (par défaut `ws://127.0.0.1:18789`). Si la liaison échoue avec `EADDRINUSE`, il génère `GatewayLockError` indiquant qu'une autre instance est déjà à l'écoute.

    Correction : arrêtez l'autre instance, libérez le port ou exécutez avec `openclaw gateway --port <port>`.

  </Accordion>

  <Accordion title="Comment exécuter OpenClaw en mode distant (le client se connecte à une Gateway ailleurs) ?">
    Définissez `gateway.mode: "remote"` et pointez vers une URL WebSocket distante, éventuellement avec des identifiants distants à secret partagé :

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

    - `openclaw gateway` ne démarre que lorsque `gateway.mode` est `local` (ou si vous passez le drapeau de substitution).
    - L'application macOS surveille le fichier de configuration et change de mode en direct lorsque ces valeurs changent.
    - `gateway.remote.token` / `.password` sont des identifiants distants côté client uniquement ; ils n'activent pas par eux-mêmes l'authentification de la passerelle locale.

  </Accordion>

  <Accordion title='L'interface de contrôle indique "non autorisé" (ou continue à se reconnecter). Que faire ?'>
    Le chemin d'authentification de votre passerelle et la méthode d'authentification de l'interface ne correspondent pas.

    Faits (issus du code) :

    - L'interface de contrôle conserve le jeton dans `sessionStorage` pour l'onglet actuel du navigateur et l'URL de la passerelle sélectionnée, ce qui permet aux actualisations dans le même onglet de continuer à fonctionner sans restaurer la persistance à long terme du jeton dans le localStorage.
    - Sur `AUTH_TOKEN_MISMATCH`, les clients de confiance peuvent tenter une nouvelle tentative limitée avec un jeton d'appareil mis en cache lorsque la passerelle renvoie des indices de nouvelle tentative (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).
    - Cette nouvelle tentative avec jeton mis en cache réutilise désormais les étendues approuvées en cache stockées avec le jeton de l'appareil. Les appelants avec `deviceToken` explicite / `scopes` explicite conservent toujours leur ensemble d'étendues demandées au lieu d'hériter des étendues mises en cache.
    - En dehors de ce chemin de nouvelle tentative, la priorité d'authentification de connexion est d'abord le jeton/mot de passe partagé explicite, puis `deviceToken` explicite, puis le jeton d'appareil stocké, puis le jeton d'amorçage.
    - L'amorçage par code de configuration intégré est réservé aux nœuds. Après approbation, il renvoie un jeton d'appareil de nœud avec `scopes: []` et ne renvoie pas de jeton d'opérateur transféré.

    Correction :

    - Le plus rapide : `openclaw dashboard` (affiche + copie l'URL du tableau de bord, tente de l'ouvrir ; affiche un indice SSH en mode sans tête).
    - Si vous n'avez pas encore de jeton : `openclaw doctor --generate-gateway-token`.
    - Si à distance, établissez d'abord un tunnel : `ssh -N -L 18789:127.0.0.1:18789 user@host` puis ouvrez `http://127.0.0.1:18789/`.
    - Mode secret partagé : définissez `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` ou `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, puis collez le secret correspondant dans les paramètres de l'interface de contrôle.
    - Mode Serve de Tailscale : assurez-vous que `gateway.auth.allowTailscale` est activé et que vous ouvrez l'URL Serve, et non une URL de bouclage (loopback) brute ou d'URL de tailnet qui contourne les en-têtes d'identité Tailscale.
    - Mode proxy de confiance : assurez-vous que vous passez par le proxy configuré prenant en charge l'identité, et non par une URL de passerelle brute. Les proxies de bouclage sur le même hôte ont également besoin de `gateway.auth.trustedProxy.allowLoopback = true`.
    - Si la discordance persiste après la nouvelle tentative unique, faites pivoter/réapprouver le jeton de l'appareil couplé :
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - Si cet appel de rotation indique qu'il a été refusé, vérifiez deux choses :
      - les sessions d'appareils couplés ne peuvent faire pivoter que leur **propre** appareil, sauf s'ils ont également `operator.admin`
      - les valeurs `--scope` explicites ne peuvent pas dépasser les étendues d'opérateur actuelles de l'appelant
    - Toujours bloqué ? Exécutez `openclaw status --all` et suivez la page [Dépannage](/fr/gateway/troubleshooting). Consultez le [Tableau de bord](/fr/web/dashboard) pour les détails sur l'authentification.

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` bind sélectionne une IP Tailscale parmi vos interfaces réseau (100.64.0.0/10). Si la machine n'est pas sur Tailscale (ou si l'interface est désactivée), il n'y a rien à lier.

    Correction :

    - Démarrez Tailscale sur cet hôte (afin qu'il ait une adresse 100.x), ou
    - Basculez sur `gateway.bind: "loopback"` / `"lan"`.

    Remarque : `tailnet` est explicite. `auto` privilégie le bouclage (loopback) ; utilisez `gateway.bind: "tailnet"` lorsque vous souhaitez une liaison exclusive au tailnet.

  </Accordion>

  <Accordion title="Puis-je exécuter plusieurs Gateways sur le même hôte ?">
    En général, non - un Gateway peut gérer plusieurs canaux de messagerie et agents. Utilisez plusieurs Gateways uniquement lorsque vous avez besoin de redondance (ex : robot de secours) ou d'un isolement strict.

    Oui, mais vous devez isoler :

    - `OPENCLAW_CONFIG_PATH` (configuration par instance)
    - `OPENCLAW_STATE_DIR` (état par instance)
    - `agents.defaults.workspace` (isolement de l'espace de travail)
    - `gateway.port` (ports uniques)

    Configuration rapide (recommandée) :

    - Utilisez `openclaw --profile <name> ...` par instance (crée automatiquement `~/.openclaw-<name>`).
    - Définissez un `gateway.port` unique dans chaque configuration de profil (ou passez `--port` pour les exécutions manuelles).
    - Installez un service par profil : `openclaw --profile <name> gateway install`.

    Les profils suffixent également les noms de service (`ai.openclaw.<profile>` ; ancien `com.openclaw.*`, `openclaw-gateway-<profile>.service`, `OpenClaw Gateway (<profile>)`).
    Guide complet : [Multiple gateways](/fr/gateway/multiple-gateways).

  </Accordion>

  <Accordion title='Que signifie « invalid handshake » / code 1008 ?'>
    Le Gateway est un **serveur WebSocket**, et il s'attend à ce que le tout premier message soit
    une trame `connect`. S'il reçoit autre chose, il ferme la connexion
    avec le **code 1008** (violation de stratégie).

    Causes courantes :

    - Vous avez ouvert l'URL **HTTP** dans un navigateur (`http://...`Gateway) au lieu d'un client WS.
    - Vous avez utilisé le mauvais port ou chemin.
    - Un proxy ou un tunnel a supprimé les en-têtes d'authentification ou a envoyé une requête non-%PH:GLOSSARY:1223:092909b9%%.

    Corrections rapides :

    1. Utilisez l'URL WS : `ws://<host>:18789` (ou `wss://...` si HTTPS).
    2. N'ouvrez pas le port WS dans un onglet de navigateur normal.
    3. Si l'authentification est activée, incluez le jeton/mot de passe dans la trame `connect`.

    Si vous utilisez le CLI ou le TUI, l'URL devrait ressembler à :

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```Gateway

    Détails du protocole : [Protocole Gateway](/en/gateway/protocol).

  </Accordion>
</AccordionGroup>

## Journalisation et débogage

<AccordionGroup>
  <Accordion title="Où se trouvent les journaux ?">
    Fichiers journaux (structurés) :

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    Vous pouvez définir un chemin stable via `logging.file`. Le niveau de journalisation des fichiers est contrôlé par `logging.level`. La verbosité de la console est contrôlée par `--verbose` et `logging.consoleLevel`.

    Affichage le plus rapide des journaux :

    ```bash
    openclaw logs --follow
    ```macOS

    Journaux de service/superviseur (lorsque la passerelle est exécutée via launchd/systemd) :

    - macOS launchd stdout : `~/Library/Logs/openclaw/gateway.log` (les profils utilisent `gateway-<profile>.log`Linux ; stderr est supprimé)
    - Linux : `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`Windows
    - Windows : `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    Voir [Dépannage](/en/gateway/troubleshooting) pour plus d'informations.

  </Accordion>

  <Accordion title="GatewayComment démarrer/arrêter/redémarrer le service Gateway ?">
    Utilisez les assistants de la passerelle :

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous exécutez la passerelle manuellement, `openclaw gateway --force`Gateway peut récupérer le port. Voir [Gateway](/fr/gateway).

  </Accordion>

  <Accordion title="WindowsOpenClawJ'ai fermé mon terminal sur Windows - comment redémarrer OpenClaw ?"WindowsWSL2GatewayLinux>
    Il existe **deux modes d'installation Windows** :

    **1) WSL2 (recommandé) :** le Gateway s'exécute à l'intérieur de Linux.

    Ouvrez PowerShell, entrez dans WSL, puis redémarrez :

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous n'avez jamais installé le service, lancez-le au premier plan :

    ```bash
    openclaw gateway run
    ```WindowsGatewayWindows

    **2) Windows natif (non recommandé) :** le Gateway s'exécute directement sous Windows.

    Ouvrez PowerShell et exécutez :

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    Si vous le lancez manuellement (sans service), utilisez :

    ```powershell
    openclaw gateway run
    ```WindowsWSL2

    Docs : [Windows (WSL2)](/en/platforms/windowsGateway), [Manuel de service du Gateway](/en/gateway).

  </Accordion>

  <Accordion title="GatewayLe Gateway est démarré mais les réponses n'arrivent jamais. Que dois-je vérifier ?">
    Commencez par un diagnostic rapide de l'état de santé :

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    Causes courantes :

    - Authentification du modèle non chargée sur l'**hôte de la passerelle** (vérifiez `models status`WebChatTailscaleGateway).
    - Jumelages/autorisations du channel bloquant les réponses (vérifiez la configuration + les journaux du channel).
    - WebChat/Dashboard est ouvert sans le bon jeton.

    Si vous êtes à distance, confirmez que la connexion tunnel/Tailscale est active et que le
    WebSocket du Gateway est accessible.

    Docs : [Canaux](/fr/channels), [Dépannage](/fr/gateway/troubleshooting), [Accès à distance](/fr/gateway/remote).

  </Accordion>

  <Accordion title='"Déconnecté de la passerelle : aucune raison" - et maintenant ?'>
    Cela signifie généralement que l'interface utilisateur a perdu la connexion WebSocket. Vérifiez :

    1. Le Gateway est-il en cours d'exécution ? `openclaw gateway status`
    2. Le Gateway est-il en bonne santé ? `openclaw status`
    3. L'interface utilisateur dispose-t-elle du bon jeton ? `openclaw dashboard`
    4. Si c'est à distance, le lien tunnel/Tailscale est-il actif ?

    Ensuite, consultez les journaux :

    ```bash
    openclaw logs --follow
    ```

    Documentation : [Tableau de bord](/fr/web/dashboard), [Accès à distance](/fr/gateway/remote), [Troubleshooting](/fr/gateway/troubleshooting).

  </Accordion>

  <Accordion title="L'échec de setMyCommands de Telegram. Que dois-je vérifier ?">
    Commencez par les journaux et l'état du channel :

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    Ensuite, faites correspondre l'erreur :

    - `BOT_COMMANDS_TOO_MUCH` : le menu Telegram contient trop d'entrées. OpenClaw réduit déjà à la limite Telegram et réessaie avec moins de commandes, mais certaines entrées de menu doivent encore être supprimées. Réduisez les commandes de plugin/compétence/personnalisées, ou désactivez `channels.telegram.commands.native` si vous n'avez pas besoin du menu.
    - `TypeError: fetch failed`, `Network request for 'setMyCommands' failed!`, ou erreurs réseau similaires : si vous êtes sur un VPS ou derrière un proxy, confirmez que le HTTPS sortant est autorisé et que le DNS fonctionne pour `api.telegram.org`.

    Si le Gateway est distant, assurez-vous que vous consultez les journaux sur l'hôte du Gateway.

    Documentation : [Telegram](/fr/channels/telegram), [Channel troubleshooting](/fr/channels/troubleshooting).

  </Accordion>

  <Accordion title="TUILe TUI n'affiche aucune sortie. Que dois-je vérifier ?"Gateway>
    Confirmez d'abord que le Gateway est accessible et que l'agent peut fonctionner :

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```TUI

    Dans le TUI, utilisez `/status` pour voir l'état actuel. Si vous attendez des réponses dans un chat
    channel, assurez-vous que la livraison est activée (`/deliver on`TUI).

    Docs : [TUI](/en/web/tui), [Slash commands](/en/tools/slash-commands).

  </Accordion>

  <Accordion title="GatewayComment arrêter complètement puis démarrer le Gateway ?">
    Si vous avez installé le service :

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```macOSLinuxGateway

    Cela arrête/démarre le **service supervisé** (launchd sur macOS, systemd sur Linux).
    Utilisez ceci lorsque le Gateway fonctionne en arrière-plan en tant que démon.

    Si vous l'exécutez au premier plan, arrêtez avec Ctrl-C, puis :

    ```bash
    openclaw gateway run
    ```Gateway

    Docs : [Gateway service runbook](/en/gateway).

  </Accordion>

  <Accordion title="ELI5 : openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart` : redémarre le **service en arrière-plan** (launchd/systemd).
    - `openclaw gateway` : exécute la passerelle **au premier plan** pour cette session de terminal.

    Si vous avez installé le service, utilisez les commandes du gateway. Utilisez `openclaw gateway` lorsque
    vous souhaitez une exécution unique au premier plan.

  </Accordion>

  <Accordion title="Le moyen le plus rapide d'obtenir plus de détails en cas d'échec"Gateway>
    Démarrez le Gateway avec `--verbose`RPC pour obtenir plus de détails dans la console. Ensuite, inspectez le fichier journal pour les erreurs d'authentification de canal, le routage des modèles et les erreurs RPC.
  </Accordion>
</AccordionGroup>

## Médias et pièces jointes

<AccordionGroup>
  <Accordion title="Ma compétence a généré une image/PDF, mais rien n'a été envoyé">
    Les pièces jointes sortantes de l'agent doivent utiliser des champs de médias structurés tels que `media`, `mediaUrl`, `path` ou `filePath`OpenClaw. Voir [Configuration de l'assistant OpenClaw](/en/start/openclaw) et [Envoi par l'agent](/en/tools/agent-send).

    Envoi via CLI :

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    Vérifiez également :

    - Le channel cible prend en charge les médias sortants et n'est pas bloqué par des listes d'autorisation.
    - Le fichier respecte les limites de taille du fournisseur (les images sont redimensionnées à un maximum de 2048 px).
    - `tools.fs.workspaceOnly=true` limite les envois de chemin local à l'espace de travail, au stockage temp/média et aux fichiers validés par le bac à sable.
    - `tools.fs.workspaceOnly=false` permet aux envois de médias locaux structurés d'utiliser des fichiers locaux de l'hôte que l'agent peut déjà lire, mais uniquement pour les médias et les types de documents sécurisés (images, audio, vidéo, PDF et documents Office). Les fichiers texte brut et de type secret sont toujours bloqués.

    Voir [Images](/fr/nodes/images).

  </Accordion>
</AccordionGroup>

## Sécurité et contrôle d'accès

<AccordionGroup>
  <Accordion title="OpenClawEst-il sûr d'exposer OpenClaw aux DMs entrants ?">
    Traitez les DMs entrants comme une entrée non fiable. Les valeurs par défaut sont conçues pour réduire les risques :

    - Le comportement par défaut sur les channels compatibles avec les DMs est le **jumelage** :
      - Les expéditeurs inconnus reçoivent un code de jumelage ; le bot ne traite pas leur message.
      - Approuvez avec : `openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - Les demandes en attente sont limitées à **3 par channel** ; vérifiez `openclaw pairing list --channel <channel> [--account <id>]` si un code n'est pas arrivé.
    - L'ouverture publique des DMs nécessite un opt-in explicite (`dmPolicy: "open"` et liste d'autorisation `"*"`).

    Exécutez `openclaw doctor` pour révéler les politiques de DMs risquées.

  </Accordion>

  <Accordion title="L'injection de prompt est-elle uniquement une préoccupation pour les bots publics ?">
    Non. L'injection de prompt concerne le **contenu non fiable**, et pas seulement qui peut DM le bot.
    Si votre assistant lit du contenu externe (recherche web/récupération, pages de navigateur, e-mails,
    docs, pièces jointes, journaux collés), ce contenu peut inclure des instructions qui tentent
    de détourner le modèle. Cela peut arriver même si **vous êtes le seul expéditeur**.

    Le plus grand risque survient lorsque les outils sont activés : le modèle peut être trompé
    pour exfiltrer du contexte ou appeler des outils en votre nom. Réduisez le rayon d'impact en :

    - utilisant un agent "lecteur" en lecture seule ou sans outils pour résumer le contenu non fiable
    - gardant `web_search` / `web_fetch` / `browser` désactivés pour les agents avec outils
    - traitant le texte des fichiers/documents décodés comme non fiable aussi : OpenResponses
      `input_file` et l'extraction de pièces jointes média enveloppent tous deux le texte extrait dans
      des marqueurs de limite de contenu externe explicites au lieu de transmettre le texte brut du fichier
    - utilisant le sandboxing et des listes d'autorisation strictes pour les outils

    Détails : [Sécurité](/fr/gateway/security).

  </Accordion>

  <Accordion title="OpenClawOpenClaw est-il moins sûr car il utilise TypeScript/Node au lieu de Rust/WASM ?"OpenClawGateway>
    Le langage et l'exécution comptent, mais ils ne constituent pas le risque principal pour un agent personnel. Les risques pratiques d'OpenClaw sont l'exposition de la passerelle, qui peut envoyer un message au bot, l'injection de prompt, la portée des outils, la gestion des identifiants, l'accès au navigateur, l'accès à l'exécution et la confiance envers les compétences ou plugins tiers.

    Rust et WASM peuvent fournir un isolement plus fort pour certaines classes de code, mais ils ne résolvent pas l'injection de prompt, les mauvaises listes d'autorisation, l'exposition publique de la passerelle, les outils trop larges, ou un profil de navigateur déjà connecté à des comptes sensibles. Traitez ces éléments comme des contrôles principaux :

    - garder la passerelle privée ou authentifiée
    - utiliser le jumelage et les listes d'autorisation pour les DMs et les groupes
    - refuser ou isoler les outils risqués pour les entrées non fiables
    - installer uniquement des plugins et compétences fiables
    - exécuter `openclaw security audit --deep` après les modifications de configuration

    Détails : [Sécurité](/fr/gateway/security), [Isolation](/fr/gateway/sandboxing).

  </Accordion>

  <Accordion title="OpenClawJ'ai vu des rapports sur des instances OpenClaw exposées. Que dois-je vérifier ?">
    Vérifiez d'abord votre déploiement réel :

    ```bash
    openclaw security audit --deep
    openclaw gateway status
    ```Gateway

    Une base de référence plus sûre est :

    - Passerelle liée à `loopback`, ou exposée uniquement via un accès privé authentifié tel qu'un réseau privé (tailnet), un tunnel SSH, une authentification par jeton/mot de passe, ou un proxy de confiance correctement configuré
    - DMs en mode `pairing` ou `allowlist`
    - groupes sur liste d'autorisation et restreints par mention, sauf si chaque membre est fiable
    - outils à risque élevé (`exec`, `browser`, `gateway`, `cron`) refusés ou strictement délimités pour les agents qui lisent du contenu non fiable
    - sandboxing activé là où l'exécution de l'outil nécessite un rayon d'impact plus réduit

    Les liaisons publiques sans authentification, les DMs/groupes ouverts avec des outils et le contrôle exposé du navigateur sont les éléments à corriger en priorité. Détails :
    [Liste de contrôle d'audit de sécurité](/en/gateway/security#security-audit-checklist).

  </Accordion>

  <Accordion title="ClawHubLes compétences ClawHub et les plugins tiers sont-ils sûrs à installer ?"ClawHubOpenClaw>
    Traitez les compétences et plugins tiers comme du code que vous choisissez de confiance.
    Les pages de compétences ClawHub exposent l'état de l'analyse avant l'installation, et les flux
    d'installation/mise à jour des plugins OpenClaw exécutent des vérifications intégrées de code dangereux, mais les analyses ne constituent pas
    une limite de sécurité complète.

    Modèle plus sûr :

    - privilégier les auteurs de confiance et les versions épinglées
    - lire la compétence ou le plugin avant de l'activer
    - garder les listes d'autorisation de plugins et de compétences étroites
    - exécuter des flux de travail avec entrées non fiables dans un bac à sable avec des outils minimaux
    - éviter de donner au code tiers un accès large au système de fichiers, à l'exécution, au navigateur ou aux secrets

    Détails : [Compétences](/en/tools/skills), [Plugins](/en/tools/plugin),
    [Sécurité](/en/gateway/security).

  </Accordion>

  <Accordion title="GitHubMon bot doit-il avoir son propre e-mail, compte GitHub ou numéro de téléphone ?">
    Oui, pour la plupart des configurations. Isoler le bot avec des comptes et des numéros de téléphone séparés
    réduit le rayon d'impact en cas de problème. Cela facilite également la rotation
    des identifiants ou la révocation de l'accès sans impacter vos comptes personnels.

    Commencez modestement. Donnez l'accès uniquement aux outils et comptes dont vous avez réellement besoin, et étendez
    ultérieurement si nécessaire.

    Documentation : [Sécurité](/en/gateway/security), [Appairage](/en/channels/pairing).

  </Accordion>

  <Accordion title="Puis-je lui donner une autonomie sur mes SMS et est-ce sûr ?">
    Nous ne recommandons **pas** une autonomie totale sur vos messages personnels. Le modèle le plus sûr est :

    - Garder les DMs en **mode d'appairage** ou dans une liste d'autorisation stricte.
    - Utiliser un **numéro ou compte distinct** si vous souhaitez qu'il envoie des messages en votre nom.
    - Laisser-le rédiger, puis **approuver avant l'envoi**.

    Si vous souhaitez expérimenter, faites-le sur un compte dédié et gardez-le isolé. Voir
    [Sécurité](/en/gateway/security).

  </Accordion>

<Accordion title="Puis-je utiliser des modèles moins coûteux pour les tâches d'assistant personnel ?">
  Oui, **si** l'agent est uniquement en mode chat et si l'entrée est fiable. Les niveaux inférieurs sont plus susceptibles d'être victimes de détournement d'instructions, évitez-les donc pour les agents disposant d'outils ou lors de la lecture de contenu non fiable. Si vous devez utiliser un modèle plus petit, verrouillez les outils et exécutez-le dans un bac à sable. Voir
  [Sécurité](/en/gateway/security).
</Accordion>

  <Accordion title="J'ai lancé /start sur Telegram mais je n'ai pas reçu de code d'appariement">
    Les codes d'appariement sont envoyés **uniquement** lorsqu'un expéditeur inconnu envoie un message au bot et que
    `dmPolicy: "pairing"` est activé. `/start` seul ne génère pas de code.

    Vérifiez les demandes en attente :

    ```bash
    openclaw pairing list telegram
    ```

    Si vous souhaitez un accès immédiat, ajoutez votre identifiant d'expéditeur à la liste blanche ou définissez `dmPolicy: "open"`
    pour ce compte.

  </Accordion>

  <Accordion title="WhatsApp : va-t-il envoyer des messages à mes contacts ? Comment fonctionne l'appariement ?">
    Non. La stratégie par défaut pour les DM WhatsApp est l'**appariement**. Les expéditeurs inconnus reçoivent uniquement un code d'appariement et leur message n'est **pas traité**. OpenClaw ne répond qu'aux chats qu'il reçoit ou aux envois explicites que vous déclenchez.

    Approuver l'appariement avec :

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    Lister les demandes en attente :

    ```bash
    openclaw pairing list whatsapp
    ```

    Invite du numéro de téléphone de l'assistant : il est utilisé pour définir votre **liste blanche/propriétaire** afin que vos propres DM soient autorisés. Il n'est pas utilisé pour l'envoi automatique. Si vous utilisez votre numéro personnel WhatsApp, utilisez ce numéro et activez `channels.whatsapp.selfChatMode`.

  </Accordion>
</AccordionGroup>

## Commandes de chat, abandon de tâches et "il ne s'arrêtera pas"

<AccordionGroup>
  <Accordion title="Comment empêcher l'affichage des messages système internes dans le chat ?">
    La plupart des messages internes ou des tool n'apparaissent que lorsque le mode **verbose**, **trace** ou **reasoning** est activé
    pour cette session.

    Solution dans le chat où vous voyez le problème :

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    Si cela reste trop bruyant, vérifiez les paramètres de la session dans l'interface de contrôle (Control UI) et définissez verbose
    sur **inherit**. Confirmez également que vous n'utilisez pas un profil de bot avec `verboseDefault` défini
    à `on` dans la configuration.

    Documentation : [Thinking and verbose](/fr/tools/thinking), [Security](/fr/gateway/security/index#reasoning-and-verbose-output-in-groups).

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

    Pour les processus d'arrière-plan (provenant de l'outil exec), vous pouvez demander à l'agent d'exécuter :

    ```
    process action:kill sessionId:XXX
    ```

    Aperçu des commandes slash : voir [Slash commands](/fr/tools/slash-commands).

    La plupart des commandes doivent être envoyées en tant que message **autonome** commençant par `/`, mais quelques raccourcis (comme `/status`) fonctionnent également en ligne pour les expéditeurs autorisés.

  </Accordion>

  <Accordion title='Comment envoyer un message Discord depuis Telegram ? ("Cross-context messaging denied")'>
    OpenClaw bloque la messagerie **cross-provider** par défaut. Si un appel de tool est lié
    à Telegram, il n'enverra pas vers Discord sauf si vous l'autorisez explicitement.

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

  <Accordion title='Pourquoi a-t-on l'impression que le bot "ignore" les messages envoyés en rafale ?'>
    Par défaut, les invites en cours d'exécution sont aiguillées vers l'exécution active. Utilisez `/queue` pour choisir le comportement de l'exécution active :

    - `steer` - guider l'exécution active à la prochaine limite du model
    - `followup` - mettre les messages en file d'attente et les exécuter un par un après la fin de l'exécution actuelle
    - `collect` - mettre les messages compatibles en file d'attente et répondre une seule fois après la fin de l'exécution actuelle
    - `interrupt` - abandonner l'exécution actuelle et recommencer

    Le mode par défaut est `steer`. Vous pouvez ajouter des options comme `debounce:0.5s cap:25 drop:summarize` pour les modes en file d'attente. Voir [Command queue](/fr/concepts/queue) et [Steering queue](/fr/concepts/queue-steering).

  </Accordion>
</AccordionGroup>

## Divers

<AccordionGroup>
  <Accordion title="Quel est le modèle par défaut pour Anthropic avec une clé API ?">
    Dans OpenClaw, les identifiants et la sélection du modèle sont distincts. Définir `ANTHROPIC_API_KEY` (ou stocker une clé Anthropic API dans les profils d'authentification) active l'authentification, mais le modèle par défaut réel est celui que vous configurez dans `agents.defaults.model.primary` (par exemple, `anthropic/claude-sonnet-4-6` ou `anthropic/claude-opus-4-6`). Si vous voyez `No
    credentials found for profile "anthropic:default"`, cela signifie que la Gateway n'a pas pu trouver les identifiants Anthropic dans le `auth-profiles.json` attendu pour l'agent en cours d'exécution.
  </Accordion>
</AccordionGroup>

---

Toujours bloqué ? Posez la question sur [Discord](https://discord.com/invite/clawd) ou ouvrez une [discussion GitHub](https://github.com/openclaw/openclaw/discussions).

## Connexes

- [FAQ de premier démarrage](/fr/help/faq-first-run) — installation, intégration, authentification, abonnements, premières erreurs
- [FAQ sur les modèles](/fr/help/faq-models) — sélection de modèles, basculement, profils d'authentification
- [Dépannage](/fr/help/troubleshooting) — triage par symptôme
