---
summary: "Kit de test : suites unit/e2e/live, runners Docker et ce que couvre chaque test"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "Tests"
---

OpenClaw possède trois suites Vitest (unit/integration, e2e, live) et un petit ensemble
de runners Docker. Ce document est un guide "comment nous testons" :

- Ce que couvre chaque suite (et ce qu'elle ne couvre _pas_ délibérément).
- Quelles commandes exécuter pour les workflows courants (local, pre-push, débogage).
- Comment les tests live découvrent les identifiants et sélectionnent les modèles/providers.
- Comment ajouter des régressions pour les problèmes réels de modèles/providers.

<Note>
**La pile QA (qa-lab, qa-channel, live transport lanes)** est documentée séparément :

- [Aperçu QA](/fr/concepts/qa-e2e-automationMatrix) - architecture, surface de commande, rédaction de scénarios.
- [QA Matrix](/fr/concepts/qa-matrix) - référence pour `pnpm openclaw qa matrix`.
- [Channel QA](/fr/channels/qa-channelDocker) - le plugin de transport synthétique utilisé par les scénarios basés sur le dépôt.

Cette page couvre l'exécution des suites de tests régulières et des runners Docker/Parallels. La section des runners spécifiques à QA ci-dessous ([QA-specific runners](#qa-specific-runners)) répertorie les invocations concrètes `qa` et renvoie aux références ci-dessus.

</Note>

## Quick start

La plupart des jours :

- Passage complet attendu avant le push : `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Exécution locale plus rapide de la suite complète sur une machine puissante : `pnpm test:max`
- Boucle de surveillance directe Vitest : `pnpm test:watch`
- Le ciblage direct de fichiers route désormais aussi les chemins d'extension/channel : `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Privilégiez d'abord les exécutions ciblées lorsque vous itérez sur un seul échec.
- Site QA avec Docker : Docker`pnpm qa:lab:up`
- Voie QA avec VM Linux : Linux`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Lorsque vous modifiez des tests ou souhaitez une confiance supplémentaire :

- Passage de couverture : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de vrais providers/modèles (nécessite de vrais identifiants) :

- Suite live (models + sondages d'outil/image de passerelle) : `pnpm test:live`
- Cibler un fichier live en silence : `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Rapports de performance à l'exécution : envoyez `OpenClaw Performance` avec
  `live_gpt54=true` pour un tour d'agent `openai/gpt-5.4` réel ou
  `deep_profile=true` pour les artefacts CPU/tas/trace de Kova. Les exécutions planifiées quotidiennes
  publient les artefacts de la voie mock-provider, deep-profile et GPT 5.4 vers
  `openclaw/clawgrit-reports` lorsque `CLAWGRIT_REPORTS_TOKEN` est configuré. Le
  rapport du mock-provider inclut également les chiffres au niveau source du démarrage de la passerelle, de la mémoire,
  de la pression des plugins, de la boucle hello de fake-model répétée et du démarrage CLI.
- Balayage de model live Docker : Docker`pnpm test:docker:live-models`
  - Chaque modèle sélectionné exécute désormais un tour de texte plus une petite sonde de type lecture de fichier.
    Les modèles dont les métadonnées annoncent une entrée `image` exécutent également un minuscule tour d'image.
    Désactivez les sondes supplémentaires avec `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` ou
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` lors de l'isolement des pannes de fournisseur.
  - Couverture CI : le `OpenClaw Scheduled Live And E2E Checks` quotidien et le `OpenClaw Release Checks` manuel
    appellent tous les deux le workflow live/E2E réutilisable avec
    `include_live_suites: true`, qui inclut des travaux de matrice de modèles live Docker distincts partitionnés par fournisseur.
  - Pour les réexécutions CI ciblées, déclenchez `OpenClaw Live And E2E Checks (Reusable)`
    avec `include_live_suites: true` et `live_models_only: true`.
  - Ajoutez de nouveaux secrets de fournisseur à fort signal à `scripts/ci-hydrate-live-auth.sh`
    ainsi qu'à `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` et ses appelants planifiés/release.
- Test de fumée du chat lié Codex natif : `pnpm test:docker:live-codex-bind`
  - Exécute une voie live Docker sur le chemin app-server Codex, lie un DM
    synthétique Slack avec `/codex bind`, teste `/codex fast` et
    `/codex permissions`, puis vérifie qu'une réponse simple et une pièce jointe image
    passent par la liaison native du plugin au lieu de l'ACP.
- Test de fumée du harnais app-server Codex : `pnpm test:docker:live-codex-harness`
  - Exécute des tours d'agent passerelle via le harnais app-server Codex détenu par le plugin,
    vérifie `/codex status` et `/codex models`, et par défaut teste image,
    MCP cron, sous-agent et les sondes Guardian. Désactivez la sonde de sous-agent avec
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` lors de l'isolement d'autres pannes de
    l'app-server Codex. Pour une vérification ciblée du sous-agent, désactivez les autres sondes :
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    Cela quitte après la sonde de sous-agent sauf si
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0` est défini.
- Test de fumée de l'installation à la demande Codex : `pnpm test:docker:codex-on-demand`
  - Installe l'archive tar OpenClaw empaquetée dans Docker, exécute l'onboarding
    de la clé API OpenAI et vérifie que le plugin Codex et la dépendance
    OpenClawDockerOpenAIAPI`@openai/codex`npm ont été téléchargés à la demande dans la racine
    gérée par npm.
- Test de fumée des dépendances d'outil de plugin en direct : `pnpm test:docker:live-plugin-tool`
  - Empaquette un plugin de test avec une véritable dépendance `slugify`,
    l'installe via `npm-pack:`npmOpenAI, vérifie la dépendance sous la racine npm gérée,
    puis demande à un modèle OpenAI en direct d'appeler l'outil du plugin et de
    renvoyer le slug masqué.
- Test de fumée de la commande de secours de Crestodian : `pnpm test:live:crestodian-rescue-channel`
  - Vérification de redondance optionnelle pour la surface de commande de
    secours du message-channel. Elle exerce `/crestodian status`, met en file
    un changement persistant de modèle, répond `/crestodian yes` et vérifie
    le chemin d'écriture audit/config.
- Test de fumée du planificateur Docker de Crestodian : Docker`pnpm test:docker:crestodian-planner`
  - Exécute Crestodian dans un conteneur sans configuration avec une fausse CLI Claude
    sur CLI`PATH` et vérifie que le repli du planificateur flou se
    traduit par une écriture de config typée et auditée.
- Test de fumée Docker du premier lancement de Crestodian : Docker`pnpm test:docker:crestodian-first-run`
  - Commence à partir d'un répertoire d'état OpenClaw vide, achemine OpenClaw`openclaw`Discord
    nu vers Crestodian, applique les écritures de configuration/model/agent/plugin Discord
    - SecretRef, valide la configuration et vérifie les entrées d'audit. Le même
      chemin de configuration Ring 0 est également couvert dans QA Lab par
      `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup`.
- Test de fumée des coûts Moonshot/Kimi : avec Moonshot`MOONSHOT_API_KEY` défini, exécutez
  `openclaw models list --provider moonshot --json`, puis exécutez un `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json` isolé
  contre `moonshot/kimi-k2.6`Moonshot. Vérifiez que le JSON rapporte Moonshot/K2.6 et que
  la transcription de l'assistant stocke `usage.cost` normalisé.

<Tip>Lorsque vous n'avez besoin que d'un cas d'échec, préférez restreindre les tests en direct via les env vars de la liste d'autorisation décrits ci-dessous.</Tip>

## Runners spécifiques QA

Ces commandes se situent à côté des principales suites de tests lorsque vous avez besoin de réalisme de laboratoire QA :

L'IC exécute le QA Lab dans des workflows dédiés. La parité agentic est imbriquée sous
`QA-Lab - All Lanes` et la validation de version, et non dans un workflow PR autonome.
La validation large doit utiliser `Full Release Validation` avec
`rerun_group=qa-parity`Docker ou le groupe QA de vérification de version (release-checks). Les vérifications de version stables par défaut
gardent le soak complet live/Docker derrière `run_release_soak=true` ; le
profil `full` force le soak. `QA-Lab - All Lanes`
s'exécute chaque nuit sur `main`MatrixTelegramDiscordMatrix et depuis un déclenchement manuel avec la voie de parité mock, la voie
Matrix live, la voie Telegram live gérée par Convex, et la voie Discord live gérée par Convex
comme tâches parallèles. La QA planifiée et les vérifications de version passent le
`--profile fast`MatrixCLI Matrix explicitement, tandis que le CLI Matrix et l'entrée du workflow manuel
restent par défaut `all` ; le déclenchement manuel peut diviser `all` en tâches
`transport`,
`media`, `e2ee-smoke`, `e2ee-deep`, et `e2ee-cli`. Les `Vérifications de version d'OpenClawMatrixTelegram`
exécutent la parité ainsi que les voies Matrix et Telegram rapides avant l'approbation
de la version, en utilisant `mock-openai/gpt-5.5` pour les vérifications de transport de version afin qu'elles restent
déterministes et évitent le démarrage normal des plugins provider. Ces passerelles de transport live
désactivent la recherche mémoire ; le comportement de la mémoire reste couvert par les suites de parité QA.

Les shards de média live de version complète utilisent
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, qui possède déjà
`ffmpeg` et `ffprobe`. Les shards live de modèle/backend Docker utilisent l'image partagée
`ghcr.io/openclaw/openclaw-live-test:<sha>` construite une fois par commit
sélectionné, puis la tirent avec `OPENCLAW_SKIP_DOCKER_BUILD=1` au lieu de la reconstruire
à l'intérieur de chaque shard.

- `pnpm openclaw qa suite`
  - Exécute les scénarios QA basés sur le dépôt directement sur l'hôte.
  - Exécute plusieurs scénarios sélectionnés en parallèle par défaut avec des workers
    de passerelle isolés. `qa-channel` a une concurrence par défaut de 4 (limitée par le
    nombre de scénarios sélectionnés). Utilisez `--concurrency <count>` pour ajuster le nombre
    de workers, ou `--concurrency 1` pour l'ancienne voie série.
  - Quitte avec un code non-zéro lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque vous
    voulez les artefacts sans code de sortie d'échec.
  - Prend en charge les modes de fournisseur `live-frontier`, `mock-openai` et `aimock`.
    `aimock` démarre un serveur de fournisseur soutenu par AIMock local pour une couverture
    expérimentale de fixture et de protocole-mock sans remplacer la voie
    `mock-openai` consciente des scénarios.
- `pnpm test:plugins:kitchen-sink-live`
  - Exécute le gauntlet du plugin Kitchen Sink live OpenAI via QA Lab. Il
    installe le package externe Kitchen Sink, vérifie l'inventaire de surface du SDK de plugin,
    sonde `/healthz` et `/readyz`, enregistre les preuves CPU/RSS de la
    passerelle, exécute un tour live OpenAI et vérifie les diagnostics contradictoires.
    Nécessite une authentification live OpenAI telle que `OPENAI_API_KEY`. Dans les sessions Testbox
    hydratées, il source automatiquement le profil live-auth Testbox lorsque l'assistant
    `openclaw-testbox-env` est présent.
- `pnpm test:gateway:cpu-scenarios`
  - Exécute le banc de démarrage de la passerelle plus un petit pack de scénarios QA Lab simulés
    (`channel-chat-baseline`, `memory-failure-fallback`,
    `gateway-restart-inflight-run`) et écrit un résumé d'observation CPU combiné
    sous `.artifacts/gateway-cpu-scenarios/`.
  - Signale par défaut uniquement les observations soutenues de CPU à haute température (`--cpu-core-warn`
    plus `--hot-wall-warn-ms`), afin que les courts pics de démarrage soient enregistrés en tant que métriques
    sans ressembler à la régression de blocage de la passerelle qui dure plusieurs minutes.
  - Utilise les artefacts `dist` construits ; lancez d'abord une build lorsque le checkout ne possède pas
    déjà une sortie d'exécution fraîche.
- `pnpm openclaw qa suite --runner multipass`
  - Exécute la même suite QA dans une machine virtuelle Linux Multipass jetable.
  - Conserve le même comportement de sélection de scénario que `qa suite` sur l'hôte.
  - Réutilise les mêmes indicateurs de sélection de provider/model que `qa suite`.
  - Les exécutions Live transmettent les entrées d'authentification QA prises en charge qui sont pratiques pour l'invité :
    les clés de provider basées sur des variables d'environnement, le chemin de configuration du provider QA live, et `CODEX_HOME`
    lorsqu'elles sont présentes.
  - Les répertoires de sortie doivent rester sous la racine du dépôt pour que l'invité puisse écrire en retour à travers
    l'espace de travail monté.
  - Écrit le rapport QA normal + le résumé ainsi que les journaux Multipass sous
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Démarre le site QA soutenu par Docker pour un travail de style opérateur.
- `pnpm test:docker:npm-onboard-channel-agent`
  - Construit un tarball npm à partir du checkout actuel, l'installe globalement dans
    Docker, exécute un onboarding non-interactif de la clé API OpenAI, configure Telegram
    par défaut, vérifie que le runtime du plugin packagé se charge sans réparation
    des dépendances au démarrage, exécute doctor, et lance un tour d'agent local contre une
    endpoint OpenAI simulée.
  - Utilisez `OPENCLAW_NPM_ONBOARD_CHANNEL=discord`Discord pour exécuter la même voie d'installation packagée
    avec Discord.
- `pnpm test:docker:session-runtime-context`
  - Exécute un test de fumée Docker déterministe d'application construite pour les transcriptions de contexte
    d'exécution embarqué. Il vérifie que le contexte d'exécution caché d'OpenClaw est persisté en tant que
    message personnalisé non-affiché au lieu de fuir dans le tour utilisateur visible,
    puis ensemence un JSONL de session cassée affectée et vérifie
    que DockerOpenClaw`openclaw doctor --fix` le réécrit vers la branche active avec une sauvegarde.
- `pnpm test:docker:npm-telegram-live`
  - Installe un candidat de paquet OpenClaw dans Docker, exécute l'onboarding du paquet installé, configure Telegram via le CLI installé, puis réutilise le voie QA Telegram en direct avec ce paquet installé en tant que Gateway du SUT.
  - Le wrapper monte uniquement la source du harnais `qa-lab` depuis l'extraction ; le paquet installé possède `dist`, `openclaw/plugin-sdk` et le runtime du plugin groupé, de sorte que la voie ne mélange pas les plugins de l'extraction actuelle dans le paquet testé.
  - Par défaut, c'est `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta` ; définissez `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` ou `OPENCLAW_CURRENT_PACKAGE_TGZ` pour tester une archive tar locale résolue au lieu d'installer depuis le registre.
  - Utilise les mêmes identifiants d'environnement Telegram ou la source d'identifiants Convex que `pnpm openclaw qa telegram`. Pour l'automatisation CI/release, définissez `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` ainsi que `OPENCLAW_QA_CONVEX_SITE_URL` et le secret de rôle. Si `OPENCLAW_QA_CONVEX_SITE_URL` et un secret de rôle Convex sont présents dans la CI, le wrapper Docker sélectionne Convex automatiquement.
  - Le wrapper valide les identifiants d'environnement Telegram ou Convex sur l'hôte avant le travail de construction/installation Docker. Définissez `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1` uniquement lors du débogage délibéré de la configuration pré-identifiants.
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` remplace le `OPENCLAW_QA_CREDENTIAL_ROLE` partagé pour cette voie uniquement.
  - Les actions GitHub exposent cette voie en tant que workflow de maintenance manuel `NPM Telegram Beta E2E`. Il ne s'exécute pas lors de la fusion. Le workflow utilise l'environnement `qa-live-shared` et les baux d'identifiants CI Convex.
- Les actions GitHub exposent également GitHub`Package Acceptance` pour une vérification de produit parallèle
  par rapport à un package candidat. Elle accepte une référence de confiance, une spécification npm publiée,
  une URL d'archive tar HTTPS plus SHA-256, ou un artefact d'archive tar d'une autre exécution, télécharge
  le `openclaw-current.tgz` normalisé en tant que `package-under-test`, puis exécute le
  planificateur E2E Docker existant avec les profils de voie smoke, package, product, full ou custom.
  Définissez `telegram_mode=mock-openai` ou `live-frontier` pour exécuter le
  workflow QA Telegram sur le même artefact `package-under-test`.
  - Dernière vérification de produit bêta :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- La vérification exacte par URL d'archive tar nécessite un résumé :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- La vérification par artefact télécharge une archive tar d'une autre exécution d'Actions :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - Empaquette et installe la version actuelle de OpenClaw dans Docker, démarre le Gateway
    avec OpenAI configuré, puis active les channel/plugins groupés via des modifications
    de configuration.
  - Vérifie que la découverte de la configuration laisse les plugins téléchargeables non configurés absents,
    que la première réparation de doctor configurée installe explicitement chaque plugin téléchargeable
    manquant, et qu'un second redémarrage n'exécute pas la réparation des dépendances cachées.
  - Installe également une base de référence npm plus ancienne connue, active Telegram avant d'exécuter
    `openclaw update --tag <candidate>`, et vérifie que le doctor post-mise à jour du candidat nettoie les débris de dépendances de plugins hérités sans
    réparation post-installation du côté du harnais.
- `pnpm test:parallels:npm-update`
  - Exécute le test de fumée de mise à jour de l'installation native empaquetée sur les invités Parallels. Chaque
    plateforme sélectionnée installe d'abord le package de base demandé, puis exécute
    la commande installée `openclaw update` sur le même invité et vérifie la
    version installée, le statut de mise à jour, la disponibilité du gateway et un tour d'agent local.
  - Utilisez `--platform macos`, `--platform windows` ou `--platform linux` lors de
    l'itération sur un invité. Utilisez `--json` pour le chemin de l'artefact récapitulatif et
    le statut par voie.
  - La voie OpenAI utilise OpenAI`openai/gpt-5.5` pour la preuve de tour d'agent en direct par défaut. Passez `--model <provider/model>` ou définissez `OPENCLAW_PARALLELS_OPENAI_MODEL`OpenAI lorsque vous validez délibérément un autre modèle OpenAI.
  - Encadrez les exécutions locales longues avec un délai d'attente de l'hôte pour que les blocages du transport Parallels ne puissent pas consommer le reste de la fenêtre de tests :

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - Le script écrit des journaux de voie imbriqués sous `/tmp/openclaw-parallels-npm-update.*`. Inspectez `windows-update.log`, `macos-update.log` ou `linux-update.log` avant de supposer que l'enveloppe externe est bloquée.
  - La mise à jour Windows peut passer 10 à 15 minutes dans le travail de diagnostic et de mise à jour des packages sur un invité à froid ; cela est encore sain lorsque le journal de debug npm imbriqué progresse.
  - N'exécutez pas cet enveloppeur agrégé en parallèle avec les voies de test de fumée Parallels macOS, Windows ou Linux individuelles. Elles partagent l'état de la machine virtuelle et peuvent entrer en collision lors de la restauration d'instantané, de la diffusion de packages ou de l'état de la passerelle de l'invité.
  - La preuve de post-mise à jour exécute la surface normale du plugin groupé car les façades de fonctionnalités telles que la reconnaissance vocale, la génération d'images et la compréhension des médias sont chargées via les API d'exécution groupées, même lorsque le tour d'agent lui-même ne vérifie qu'une réponse textuelle simple.

- `pnpm openclaw qa aimock`
  - Démarre uniquement le serveur de fournisseur AIMock local pour le test de fumée direct du protocole.
- `pnpm openclaw qa matrix`
  - Exécute la voie QA en direct Matrix contre un serveur d'accueil Tuwunel éphémère soutenu par Docker. Uniquement pour l'extraction du code source - les installations empaquetées n'incluent pas MatrixDocker`qa-lab`.
  - CLI complet, catalogue de profils/scénarios, env vars et disposition des artefacts : [QA Matrix](CLIMatrix/en/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Exécute la voie QA en direct Telegram contre un groupe privé réel en utilisant les jetons de bot du pilote et du SUT provenant de l'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`Telegram. L'identifiant de groupe doit être l'identifiant de conversation numérique Telegram.
  - Prend en charge `--credential-source convex` pour les informations d'identification partagées en pool. Utilisez le mode env par défaut, ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` pour opter pour les baux en pool.
  - Les paramètres par défaut couvrent canary, mention gating, command addressing, `/status`, les réponses mentionnées de bot à bot, et les réponses aux commandes natives de base. Les paramètres par défaut `mock-openai` couvrent également les régressions de la chaîne de réponses déterministe et du streaming des messages finaux Telegram. Utilisez `--list-scenarios` pour les sondes facultatives telles que `session_status`.
  - Sort avec un code non nul lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque vous
    souhaitez des artefacts sans code de sortie d'échec.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable de bot à bot, activez le Bot-to-Bot Communication Mode dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact observed-messages sous `.artifacts/qa-e2e/...`. Les scénarios de réponse incluent le RTT de la demande d'envoi du pilote à la réponse SUT observée.

`Mantis Telegram Live` est le wrapper de preuve PR autour de ce lane. Il exécute le
candidat ref avec des informations d'identification Telegram louées via Convex, restitue la transcription
du message observé expurgé dans un navigateur de bureau Crabbox, enregistre la preuve MP4,
génère un GIF découpé par mouvement, télécharge le bundle d'artefacts et publie la preuve PR en ligne
via l'application Mantis GitHub lorsque `pr_number` est défini. Les mainteneurs peuvent
le démarrer depuis l'interface Actions via `Mantis Scenario` (`scenario_id:
    telegram-live`) ou directement depuis un commentaire de pull request :

```text
@Mantis telegram
@Mantis telegram scenario=telegram-status-command
@Mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - Loue ou réutilise un bureau Crabbox Linux, installe Telegram Desktop natif, configure OpenClaw avec un jeton de bot SUT Telegram loué, démarre la passerelle et enregistre la preuve de capture d'écran/MP4 depuis le bureau VNC visible.
  - La valeur par défaut est `--credential-source convex`, donc les workflows n'ont besoin que du secret du broker Convex. Utilisez `--credential-source env` avec les mêmes variables `OPENCLAW_QA_TELEGRAM_*` que `pnpm openclaw qa telegram`.
  - Telegram Desktop a toujours besoin d'une connexion/profil utilisateur. Le jeton du bot ne configure que OpenClaw. Utilisez `--telegram-profile-archive-env <name>` pour une archive de profil `.tgz` en base64, ou utilisez `--keep-lease` et connectez-vous manuellement une fois via VNC.
  - Écrit `mantis-telegram-desktop-builder-report.md`, `mantis-telegram-desktop-builder-summary.json`, `telegram-desktop-builder.png` et `telegram-desktop-builder.mp4` dans le répertoire de sortie.

Les voies de transport live partagent un contrat standard pour que les nouveaux transports ne dérivent pas ; la matrice de couverture par voie se trouve dans [QA overview → Live transport coverage](/fr/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` est la suite synthétique large et ne fait pas partie de cette matrice.

### Identifiants Telegram partagés via Convex (v1)

Lorsque `--credential-source convex` (ou `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) est activé pour
les tests de transport live, le labo QA acquiert un bail exclusif depuis un pool soutenu par Convex, envoie des battements de cœur à ce bail pendant que la voie est en cours d'exécution, et libère le bail à l'arrêt. Le nom de la section précède
le support de Discord, Slack et WhatsApp ; le contrat de bail est partagé entre les types.

Référence de la structure du projet Convex :

- `qa/convex-credential-broker/`

Variables d'environnement requises :

- `OPENCLAW_QA_CONVEX_SITE_URL` (par exemple `https://your-deployment.convex.site`)
- Un secret pour le rôle sélectionné :
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` pour `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` pour `ci`
- Sélection du rôle d'identifiants :
  - CLI : `--credential-role maintainer|ci`
  - Par défaut d'env : `OPENCLAW_QA_CREDENTIAL_ROLE` (par défaut `ci` dans CI, `maintainer` sinon)

Variables d'environnement facultatives :

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (par défaut `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (par défaut `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (par défaut `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (par défaut `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (par défaut `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de trace facultatif)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permet les URL de bouclage `http://` Convex pour un développement local uniquement.

`OPENCLAW_QA_CONVEX_SITE_URL` doit utiliser `https://` en fonctionnement normal.

Les commandes d'administration de mainteneur (pool add/remove/list) nécessitent
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` spécifiquement.

CLI helpers for maintainers:

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Utilisez `doctor` avant les exécutions en direct pour vérifier l'URL du site Convex, les secrets du courtier,
le préfixe de point de terminaison, le délai d'attente HTTP et l'accessibilité de l'admin/liste sans imprimer
les valeurs secrètes. Utilisez `--json` pour une sortie lisible par machine dans les scripts et les utilitaires CI.

Contrat de point de terminaison par défaut (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`) :

- `POST /acquire`
  - Requête : `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Succès : `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Épuisé/réessai : `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Succès : `{ status: "ok" }` (ou vide `2xx`)
- `POST /release`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Succès : `{ status: "ok" }` (ou vide `2xx`)
- `POST /admin/add` (secret mainteneur uniquement)
  - Requête : `{ kind, actorId, payload, note?, status? }`
  - Succès : `{ status: "ok", credential }`
- `POST /admin/remove` (secret mainteneur uniquement)
  - Requête : `{ credentialId, actorId }`
  - Succès : `{ status: "ok", changed, credential }`
  - Garde de bail actif : `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (secret mainteneur uniquement)
  - Requête : `{ kind?, status?, includePayload?, limit? }`
  - Succès : `{ status: "ok", credentials, count }`

Format de la charge utile pour le type Telegram :

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` doit être une chaîne d'identifiant de conversation Telegram numérique.
- `admin/add` valide ce format pour `kind: "telegram"` et rejette les charges utiles malformées.

Charges utiles multi-canal validées par le courtier :

- Discord : `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp : `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Les voies Slack peuvent également louer depuis le pool, mais la validation de la charge utile Slack réside actuellement dans le runner QA Slack plutôt que dans le courtier. Utilisez `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }` pour les lignes Slack.

### Ajouter un canal à la QA

L'architecture et les noms des assistants de scénario pour les nouveaux adaptateurs de canal se trouvent dans [QA overview → Adding a channel](/fr/concepts/qa-e2e-automation#adding-a-channel). Le minimum requis : implémenter le runner de transport sur le joint d'hôte partagé `qa-lab`, déclarer `qaRunners` dans le manifeste du plugin, monter en tant que `openclaw qa <runner>`, et rédiger des scénarios sous `qa/scenarios/`.

## Suites de tests (ce qui s'exécute où)

Pensez aux suites comme à un « réalisme croissant » (et une instabilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Config : les exécutions non ciblées utilisent l'ensemble de shards `vitest.full-*.config.ts` et peuvent étendre les shards multi-projets en configs par projet pour la planification parallèle
- Fichiers : inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts` et `test/**/*.test.ts` ; les tests unitaires UI s'exécutent dans le shard dédié `unit-ui`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en processus (authentification passerelle, routage, outils, analyse, config)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans la CI
  - Aucune clé réelle requise
  - Doit être rapide et stable
  - Les tests du résolveur et du chargeur de surface publique doivent prouver un large `api.js` et
    un comportement de repli `runtime-api.js` avec de minuscules fixtures de plugin générées, et non
    de véritables API de code source de plugin groupé. Les chargements de API de plugin réel appartiennent aux
    suites de contrat/intégration détenues par le plugin.

Politique de dépendance native :

- Les installations de test par défaut ignorent les constructions natives opus optionnelles Discord. La réception vocale Discord utilise le décodeur `opusscript` pure-JS, et `@discordjs/opus` reste en `ignoredBuiltDependencies` afin que les tests locaux et les voies Testbox ne compilent pas le module natif.
- Utilisez une voie de performance vocale ou en direct dédiée Discord si vous avez besoin de comparer intentionnellement une construction native opus. Ne rajoutez pas `@discordjs/opus` au `onlyBuiltDependencies` par défaut ; cela ferait compiler du code natif lors des boucles d'installation/test non liées.

<AccordionGroup>
  <Accordion title="Projets, shards et voies délimitées (scoped lanes)">

    - Les exécutions `pnpm test` non ciblées utilisent douze configurations de shard plus petites (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus géant de projet racine natif. Cela réduit le RSS de pointe sur les machines chargées et évite que le travail de réponse automatique (auto-reply) et d'extension ne prive de ressources les suites non liées.
    - `pnpm test --watch` utilise toujours le graphe de projet natif de la racine `vitest.config.ts`, car une boucle de surveillance (watch loop) multi-shard n'est pas pratique.
    - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent les cibles de fichiers/répertoires explicites d'abord par des voies délimitées, de sorte que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer l'intégralité du coût de démarrage du projet racine.
    - `pnpm test:changed` développe par défaut les chemins git modifiés en voies délimitées peu coûteuses : modifications directes de tests, fichiers `*.test.ts` frères, mappages source explicites et dépendants du graphe d'importation local. Les modifications de configuration, de configuration ou de package n'exécutent pas des tests larges sauf si vous utilisez explicitement `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed`Docker est la passerelle de contrôle locale intelligente normale pour un travail étroit. Il classe les différences en core, tests core, extensions, tests d'extension, applications, documentation, métadonnées de publication, d'outillage Docker live, et d'outillage, puis exécute les commandes typecheck, lint et guard correspondantes. Il n'exécute pas les tests Vitest ; appelez `pnpm test:changed` ou un `pnpm test <target>`DockerDockerDocker explicite pour la preuve de test. Les incrémentations de version uniquement pour les métadonnées de publication exécutent des vérifications ciblées de version/configuration/dépendances racines, avec une garde qui rejette les modifications de package en dehors du champ de version de premier niveau.
    - Les modifications du harnais ACP Docker Live exécutent des vérifications ciblées : syntaxe de shell pour les scripts d'auth Docker Live et une simulation à sec (dry-run) du planificateur Docker Live. Les modifications `package.json` sont incluses uniquement lorsque la différence est limitée à `scripts["test:docker:live-*"]` ; les modifications de dépendances, d'exportations, de version et autres éditions de surface de package utilisent toujours les gardes plus larges.
    - Les tests unitaires légers en importations des agents, commandes, plugins, aides de réponse automatique, `plugin-sdk` et zones d'utilitaires purs similaires passent par la voie `unit-fast`, qui saute `test/setup-openclaw-runtime.ts` ; les fichiers lourds avec état/runtime restent sur les voies existantes.
    - Certains fichiers source d'aides `plugin-sdk` et `commands` mappent également les exécutions en mode modifié à des tests frères explicites dans ces voies légères, de sorte que les modifications d'aides évitent de réexécuter la suite lourde complète pour ce répertoire.
    - `auto-reply` possède des compartiments dédiés pour les aides core de premier niveau, les tests d'intégration `reply.*` de premier niveau, et le sous-arbre `src/auto-reply/reply/**`. Le CI divise davantage le sous-arbre de réponse en shards agent-runner, dispatch et commands/state-routing afin qu'un compartiment lourd en importations ne possède pas la totalité de la file d'attente Node.
    - Le CI normal PR/main saute intentionnellement le balayage de lot d'extension et le shard `agentic-plugins` réservé aux publications. La validation complète de la publication (Full Release Validation) distribue le workflow enfant séparé `Plugin Prerelease` pour ces suites lourdes en plugins/extensions sur les candidats à la publication.

  </Accordion>

  <Accordion title="Couverture du runner intégré">

    - Lorsque vous modifiez les entrées de découverte des message-tools ou le contexte d'exécution de la compaction, maintenez les deux niveaux de couverture.
    - Ajoutez des régressions d'assistance ciblées pour les limites de routage pur et de normalisation.
    - Maintenez les suites d'intégration du runner intégré en bonne santé :
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` et
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
    - Ces suites vérifient que les identifiants délimités et le comportement de compaction circulent toujours dans les chemins réels `run.ts` / `compact.ts` ; les tests d'assistance uniquement ne sont pas un substitut suffisant pour ces chemins d'intégration.

  </Accordion>

  <Accordion title="Pool Vitest et valeurs par défaut d'isolement">

    - La configuration de base de Vitest utilise par défaut `threads`.
    - La configuration partagée de Vitest fixe `isolate: false` et utilise le runner non isolé pour les configurations des projets racine, e2e et live.
    - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute également sur le runner partagé non isolé.
    - Chaque shard `pnpm test` hérite des mêmes valeurs par défaut `threads` + `isolate: false` de la configuration partagée de Vitest.
    - `scripts/run-vitest.mjs` ajoute `--no-maglev` pour les processus enfants Node de Vitest par défaut afin de réduire la charge de compilation V8 lors des grandes exécutions locales.
      Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` pour comparer avec le comportement standard de V8.

  </Accordion>

  <Accordion title="Itération locale rapide">

    - `pnpm changed:lanes` indique quelles voies architecturales une diff déclenche.
    - Le hook de pré-commit est uniquement pour le formatage. Il remet les fichiers formatés dans l'index
      et n'exécute pas lint, typecheck ou les tests.
    - Exécutez `pnpm check:changed` explicitement avant la transmission ou le push lorsque vous
      avez besoin de la porte de contrôle locale intelligente.
    - `pnpm test:changed` passe par des voies délimitées peu coûteuses par défaut. Utilisez
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` uniquement lorsque l'agent
      décide qu'une modification de harnais, de configuration, de package ou de contrat nécessite vraiment une couverture
      Vitest plus large.
    - `pnpm test:max` et `pnpm test:changed:max` gardent le même comportement de routage,
      juste avec une limite de workers plus élevée.
    - L'autoscaling des workers locaux est intentionnellement conservateur et recule
      lorsque la charge moyenne de l'hôte est déjà élevée, donc plusieurs exécutions
      Vitest simultanées font moins de dégâts par défaut.
    - La configuration de base Vitest marque les fichiers de projets/config comme
      `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage
      des tests change.
    - La configuration garde `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes
      pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous voulez
      un emplacement de cache explicite pour le profilage direct.

  </Accordion>

  <Accordion title="Perf debugging">

    - `pnpm test:perf:imports` active le rapport de durée d'import Vitest ainsi que
      la sortie de répartition des importations.
    - `pnpm test:perf:imports:changed` limite la même vue de profilage aux
      fichiers modifiés depuis `origin/main`.
    - Les données de chronométrage des partitions sont écrites dans `.artifacts/vitest-shard-timings.json`.
      Les exécutions sur l'ensemble de la configuration utilisent le chemin de la configuration comme clé ; les partitions CI avec modèle d'inclusion
      ajoutent le nom de la partition afin que les partitions filtrées puissent être suivies
      séparément.
    - Lorsqu'un test à chaud passe encore la majeure partie de son temps dans les importations de démarrage,
      gardez les dépendances lourdes derrière une seam `*.runtime.ts` locale étroite et
      simulez directement cette seam au lieu d'importer profondément des helpers d'exécution juste
      pour les transmettre via `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compare le chemin
      `test:changed` routé au chemin du projet racine natif pour ce diff
      commité et imprime le temps écoulé ainsi que le RSS maximal macOS.
    - `pnpm test:perf:changed:bench -- --worktree` effectue des benchmarks sur l'arbre
      sale actuel en acheminant la liste des fichiers modifiés via
      `scripts/test-projects.mjs` et la configuration racine Vitest.
    - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour
      le démarrage et la surcharge de transformation de Vitest/Vite.
    - `pnpm test:perf:profile:runner` écrit des profils CPU+tas pour le lanceur de la suite
      unitaire avec le parallélisme de fichiers désactivé.

  </Accordion>
</AccordionGroup>

### Stabilité (Gateway)

- Commande : `pnpm test:stability:gateway`
- Config : `vitest.gateway.config.ts`, forcée à un worker
- Portée :
  - Démarre un Gateway de boucle de retour réel avec les diagnostics activés par défaut
  - Fait passer des messages synthétiques de passerelle, de la mémoire et une charge importante de charge utile via le chemin des événements de diagnostic
  - Interroge `diagnostics.stability` via le Gateway WS RPC
  - Couvre les helpers de persistance du bundle de stabilité de diagnostic
  - Affirme que l'enregistreur reste borné, que les échantillons RSS synthétiques restent sous le budget de pression et que les profondeurs de file d'attente par session reviennent à zéro
- Attentes :
  - Sûr pour la CI et sans clé
  - Voie étroite pour le suivi des régressions de stabilité, pas un substitut à la suite complète du Gateway

### E2E (fumée Gateway)

- Commande : `pnpm test:e2e`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`, et les tests E2E du plugin groupé sous `extensions/`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `threads` avec `isolate: false`, correspondant au reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console verbeuse.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appairage de nœuds et réseau plus lourd
- Attentes :
  - S'exécute dans la CI (lorsqu'elle est activée dans le pipeline)
  - Aucune vraie clé requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : Test de fumée du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `extensions/openshell/src/backend.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw sur de vrais `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un `openshell` CLI local ainsi qu'un daemon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (vrais fournisseurs + vrais modèles)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`, `test/**/*.live.test.ts`, et les tests en direct du plugin groupé sous `extensions/`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - "Est-ce que ce provider/model fonctionne réellement _aujourd'hui_ avec de vrais identifiants ?"
  - Détecter les changements de format du provider, les bizarreries de l'appel d'outils, les problèmes d'auth et le comportement des limites de taux
- Attentes :
  - Non stable pour l'CI par conception (réseaux réels, politiques réelles des providers, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Préférer l'exécution de sous-ensembles réduits plutôt que de "tout"
- Les exécutions Live sourcent `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions Live isolent toujours `HOME` et copient le matériel de configuration/d'auth dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre vrai `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests Live utilisent votre véritable répertoire personnel.
- `pnpm test:live` utilise par défaut désormais un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avis `~/.profile` supplémentaire et coupe les journaux de démarrage de la passerelle/les bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au provider) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une substitution par exécution Live via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponse de limite de taux.
- Sortie de progression/heartbeat :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels longs au provider soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de la console Vitest afin que les lignes de progression du provider/de la passerelle diffusent immédiatement pendant les exécutions Live.
  - Ajustez les heartbeats du modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les heartbeats de la passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez apporté beaucoup de modifications)
- Modification du réseau de la passerelle / protocole WS / appariement : ajoutez `pnpm test:e2e`
- Débogage de "mon bot est en panne" / échecs spécifiques au fournisseur / appel d'outil : exécutez un `pnpm test:live` réduit

## Tests en direct (touchant au réseau)

Pour la matrice de modèles en direct, tests de fumée du backend CLI, tests de fumée ACP, harnais Codex app-server et tous les tests en direct des fournisseurs de médias (Deepgram, BytePlus, ComfyUI, image, musique, vidéo, harnais média) - ainsi que la gestion des identifiants pour les exécutions en direct - voir [Testing live suites](/fr/help/testing-live). Pour la liste de contrôle dédiée à la validation des mises à jour et des plugins, voir [Testing updates and plugins](/fr/help/testing-updates-plugins).

## Runners Docker (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker sont divisés en deux catégories :

- Runners de modèles en direct : `test:docker:live-models` et `test:docker:live-gateway` n'exécutent que leur fichier en direct correspondant à la clé de profil dans l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de configuration local et votre espace de travail (et en sourçant `~/.profile` s'il est monté). Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les runners en direct Docker utilisent par défaut une limite de test de fumée plus petite afin qu'un balayage Docker complet reste pratique :
  `test:docker:live-models` par défaut à `OPENCLAW_LIVE_MAX_MODELS=12`, et
  `test:docker:live-gateway` par défaut à `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Remplacez ces variables d'environnement lorsque vous
  souhaitez explicitement le scan exhaustif plus large.
- `test:docker:all`Docker construit une fois l'image Docker live via `test:docker:live-build`OpenClawnpm, empaquette une fois OpenClaw en tant que tarball npm via `scripts/package-openclaw-for-docker.mjs`, puis construit/réutilise deux images `scripts/e2e/Dockerfile`. L'image nue est uniquement le runner Node/Git pour les voies d'installation/de mise à jour/de dépendances de plug-in ; ces voies montent le tarball préconstruit. L'image fonctionnelle installe le même tarball dans `/app`Docker pour les voies de fonctionnalité d'application construite. Les définitions des voies Docker résident dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur réside dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. L'agrégat utilise un planificateur local pondéré : `OPENCLAW_DOCKER_ALL_PARALLELISM`npm contrôle les créneaux de processus, tandis que les plafonds de ressources empêchent les voies lourdes live, npm-install et multi-service de démarrer toutes en même temps. Si une voie unique est plus lourde que les plafonds actifs, le planificateur peut toujours la démarrer lorsque le pool est vide, puis la laisse tourner seule jusqu'à ce que la capacité soit à nouveau disponible. Les valeurs par défaut sont 10 créneaux, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; ajustez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`DockerDockerOpenClaw uniquement lorsque l'hôte Docker dispose de plus de marge. Le runner effectue par défaut une pré-vérification Docker, supprime les conteneurs E2E OpenClaw obsolètes, imprime le statut toutes les 30 secondes, stocke les durées de voie réussies dans `.artifacts/docker-tests/lane-timings.json` et utilise ces durées pour démarrer d'abord les voies plus longues lors des exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1`Docker pour imprimer le manifeste des voies pondérées sans construire ni exécuter Docker, ou `node scripts/test-docker-all.mjs --plan-json` pour imprimer le plan CI pour les voies sélectionnées, les besoins de package/image et les identifiants.
- `Package Acceptance` est la passerelle de paquets native GitHub pour « est-ce que cette archive tar installable fonctionne en tant que produit ? ». Elle résout un paquet candidat depuis `source=npm`, `source=ref`, `source=url`, ou `source=artifact`, le téléverse en tant que `package-under-test`, puis exécute les pistes E2E Docker réutilisables contre cette archive tar exacte au lieu de recompresser la référence sélectionnée. Les profils sont ordonnés par étendue : `smoke`, `package`, `product`, et `full`. Consultez [Testing updates and plugins](/fr/help/testing-updates-plugins) pour le contrat paquet/mise à jour/plugin, la matrice de survie des mises à jour publiées, les valeurs par défaut de version, et le triage des échecs.
- Les vérifications de build et de version s'exécutent `scripts/check-cli-bootstrap-imports.mjs` après tsdown. Le garde parcourt le graphe de build statique depuis `dist/entry.js` et `dist/cli/run-main.js` et échoue si l'initialisation avant répartition importe des dépendances de paquets telles que Commander, prompt UI, undici, ou logging avant la répartition de commande ; il maintient également le bloc d'exécution du passerelle regroupé sous le budget et rejette les importations statiques de chemins connus de la passerelle froide. Le test de fumée du CLI empaqueté couvre également l'aide racine, l'aide à l'intégration, l'aide du docteur, le statut, le schéma de configuration, et une commande de liste de modèles.
- La compatibilité héritée de l'acceptation de paquets est plafonnée à `2026.4.25` (`2026.4.25-beta.*` incluse). Jusqu'à cette limite, le harnais tolère uniquement les lacunes de métadonnées du paquet expédié : entrées d'inventaire QA privées omises, `gateway install --wrapper` manquant, fichiers de correctifs manquants dans le montage git dérivé de l'archive tar, `update.channel` persisté manquant, emplacements d'enregistrements d'installation de plugins hérités, persistance d'enregistrements d'installation de la place de marché manquante, et migration des métadonnées de configuration pendant `plugins update`. Pour les paquets après `2026.4.25`, ces chemins sont des échecs stricts.
- Container smoke runners : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix` et `test:docker:config-reload` amorcent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de niveau supérieur.

Les runners Docker de modèle actuel montent également par liaison (bind-mount) uniquement les répertoires d'authentification DockerCLICLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin que l'OAuth externe puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- ACP bind smoke : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh` ; couvre Claude, Codex et Gemini par défaut, avec une couverture stricte Droid/OpenCode via `pnpm test:docker:live-acp-bind:droid` et `pnpm test:docker:live-acp-bind:opencode`)
- CLI backend smoke : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agent dev : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Observability smoke : `pnpm qa:otel:smoke` est une voie privée de checkout source QA. Elle ne fait pas intentionnellement partie des voies de publication du package Docker car l'archive npm omet le Lab QA.
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant d'intégration (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Test de fumée onboarding/channel/agent pour tarball npm : `pnpm test:docker:npm-onboard-channel-agent`OpenClawDockerOpenAITelegramOpenAI installe globalement la tarball OpenClaw empaquetée dans Docker, configure OpenAI via env-ref onboarding ainsi que Telegram par défaut, exécute doctor, et effectue un tour d'agent OpenAI simulé. Réutilisez une tarball préconstruite avec `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sautez la reconstruction de l'hôte avec `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, ou changez de channel avec `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` ou `OPENCLAW_NPM_ONBOARD_CHANNEL=slack`.
- Test de fumée d'installation de compétence : `pnpm test:docker:skill-install`OpenClawDockerClawHub installe globalement la tarball OpenClaw empaquetée dans Docker, désactive les installations d'archive téléchargées dans la configuration, résout le slug de compétence ClawHub en direct actuel à partir de la recherche, l'installe avec `openclaw skills install`, et vérifie la compétence installée ainsi que les métadonnées d'origine/verrouillage `.clawhub`.
- Test de fumée de changement de channel de mise à jour : `pnpm test:docker:update-channel-switch`OpenClawDocker installe globalement la tarball OpenClaw empaquetée dans Docker, passe du package `stable` à git `dev`, vérifie le channel persistant et le fonctionnement des plugins après la mise à jour, puis repasse au package `stable` et vérifie l'état de la mise à jour.
- Test de fumée de survie de mise à niveau : `pnpm test:docker:upgrade-survivor`OpenClawGateway installe la tarball OpenClaw empaquetée sur un fixture de vieil utilisateur sale avec des agents, une configuration de channel, des listes d'autorisation de plugins, un état de dépendance de plugin obsolète, et des fichiers d'espace de travail/session existants. Il exécute la mise à jour du package ainsi que doctor non interactif sans clés de provider ou de channel en direct, puis démarre une Gateway en boucle et vérifie la préservation de la configuration/de l'état ainsi que les budgets de démarrage/statut.
- Test de survie de mise à niveau publiée : `pnpm test:docker:published-upgrade-survivor` installe `openclaw@latest` par défaut, amorce des fichiers utilisateurs existants réalistes, configure cette base de référence avec une recette de commande intégrée, valide la configuration résultante, met à jour cette installation publiée vers l'archive tar candidate, exécute un doctor non interactif, écrit `.artifacts/upgrade-survivor/summary.json`Gateway, puis démarre une boucle de retour Gateway et vérifie les intentions configurées, la préservation de l'état, le démarrage, `/healthz`, `/readyz`RPC et les budgets de statut RPC. Remplacer une base de référence par `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, demander au planificateur agrégé d'étendre les bases de référence locales exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` telles que `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, et étendre les fixtures de type problème avec `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` telles que `reported-issues` ; l'ensemble de problèmes signalés comprend `configured-plugin-installs`OpenClaw pour la réparation automatique de l'installation du plugin externe OpenClaw. L'acceptation de package expose ceux-ci sous forme de `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` et `published_upgrade_survivor_scenarios`, résout les jetons de méta-base de référence tels que `last-stable-4` ou `all-since-2026.4.23`, et la validation complète de publication étend la barrière de package de trempage de publication à `last-stable-4 2026.4.23 2026.5.2 2026.4.15` plus `reported-issues`.
- Test de fumée du contexte d'exécution de session : `pnpm test:docker:session-runtime-context` vérifie la persistance de la transcription du contexte d'exécution caché ainsi que la réparation par doctor des branches de réécriture de prompt en double affectées.
- Test de fumée de l'installation globale Bun : Bun`bash scripts/e2e/bun-global-install-smoke.sh` compresse l'arborescence actuelle, l'installe avec `bun install -g` dans un répertoire personnel isolé et vérifie que `openclaw infer image providers --json` renvoie les fournisseurs d'images groupés au lieu de rester bloqué. Réutiliser une archive tar préconstruite avec `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sauter la construction de l'hôte avec `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` ou copier `dist/`Docker depuis une image Docker construite avec `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Installer Docker smoke : Docker`bash scripts/test-install-sh-docker.sh`npmnpmnpm partage un cache npm entre ses conteneurs racine, update et direct-npm. Update smoke utilise par défaut npm `latest` comme base stable avant de passer au tarball candidat. Remplacez-le par `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` localement, ou avec l'entrée `update_baseline_version`GitHubnpm du workflow Install Smoke sur GitHub. Les vérifications de l'installateur non-root maintiennent un cache npm isolé afin que les entrées de cache détenues par root ne masquent pas le comportement d'installation local à l'utilisateur. Définissez `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache`npm pour réutiliser le cache root/update/direct-npm lors des exécutions locales répétées.
- Install Smoke CI ignore la mise à jour globale direct-npm en double avec npm`OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` ; exécutez le script localement sans cet environnement lorsqu'une couverture directe `npm install -g` est nécessaire.
- Agents delete shared workspace CLI smoke : CLI`pnpm test:docker:agents-delete-shared-workspace` (script : `scripts/e2e/agents-delete-shared-workspace-docker.sh`) construit par défaut l'image du Dockerfile racine, initialise deux agents avec un espace de travail dans un répertoire isolé du conteneur, exécute `agents delete --json` et vérifie le JSON valide ainsi que le comportement de l'espace de travail conservé. Réutilisez l'image install-smoke avec `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Gateway networking (deux conteneurs, auth WS + santé) : Gateway`pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke : `pnpm test:docker:browser-cdp-snapshot` (script : `scripts/e2e/browser-cdp-snapshot-docker.sh`) construit l'image source E2E plus une couche Chromium, démarre Chromium avec du CDP brut, exécute `browser doctor --deep` et vérifie que les instantanés de rôle CDP couvrent les URL des liens, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de frame.
- Régression du raisonnement minimal web_search des réponses OpenAI : `pnpm test:docker:openai-web-search-minimal` (script : `scripts/e2e/openai-web-search-minimal-docker.sh`) exécute un serveur OpenAI simulé via Gateway, vérifie que `web_search` déclenche `reasoning.effort` de `minimal` à `low`, puis force le rejet du schéma du provider et vérifie que les détails bruts apparaissent dans les journaux Gateway.
- Pont de channel MCP (test de fumée du Gateway amorcé + pont stdio + frame de notification Claude brute) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Outils MCP du bundle Pi (test de fumée d'autorisation/refus du profil Pi intégré avec un vrai serveur MCP stdio) : `pnpm test:docker:pi-bundle-mcp-tools` (script : `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Nettoyage MCP Cron/subagent (vrai Gateway + démontage de l'enfant MCP stdio après des exécutions cron isolées et de sous-agent ponctuelles) : `pnpm test:docker:cron-mcp-cleanup` (script : `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Plugins (test de fumée d'installation/mise à jour pour le chemin local, `file:`, le registre npm avec les dépendances hissées, les refs git mobiles, le fourre-tout ClawHub, les mises à jour de la place de marché et l'activation/inspection du bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)
  Définissez `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` pour ignorer le bloc ClawHub, ou remplacez la paire paquet/runtime fourre-tout par défaut avec `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` et `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`. Sans `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`, le test utilise un serveur de fixture ClawHub local hermétique.
- Test de fumée de mise à jour de plugin inchangée : `pnpm test:docker:plugin-update` (script : `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Plugin lifecycle matrix smoke: `pnpm test:docker:plugin-lifecycle-matrix`OpenClawnpmnpm installe l'archive tarball d'OpenClaw empaquetée dans un conteneur nu, installe un plugin npm, active/désactive, effectue des montées et descentes de version via un registre npm local, supprime le code installé, puis vérifie que la désinstallation supprime toujours l'état obsolète tout en consignant les métriques RSS/CPU pour chaque phase du cycle de vie.
- Config reload metadata smoke: `pnpm test:docker:config-reload` (script: `scripts/e2e/config-reload-source-docker.sh`)
- Plugins: `pnpm test:docker:plugins` couvre les tests de fumée d'installation/de mise à jour pour le chemin local, `file:`npmClawHub, le registre npm avec des dépendances hissées (hoisted), les références git mobiles, les fixtures ClawHub, les mises à jour de la place de marché, et l'activation/inspection du bundle Claude. `pnpm test:docker:plugin-update` couvre le comportement de mise à jour sans changement pour les plugins installés. `pnpm test:docker:plugin-lifecycle-matrix`npm couvre l'installation, l'activation, la désactivation, la mise à niveau, la rétrogradation et la désinstallation en cas de code manquant pour les plugins npm avec suivi des ressources.

Pour préconstruire et réutiliser manuellement l'image fonctionnelle partagée :

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Les redéfinitions d'images spécifiques aux suites telles que `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` priment toujours lorsqu'elles sont définies. Lorsque `OPENCLAW_SKIP_DOCKER_BUILD=1`Docker pointe vers une image partagée distante, les scripts la tirent si elle n'est pas déjà locale. Les tests Docker du QR et de l'installateur conservent leurs propres Dockerfiles car ils valident le comportement du paquet/de l'installation plutôt que le temps d'exécution de l'application construite partagée.

Les runners Docker live-model montent également la copie de travail actuelle en lecture seule (bind-mount) et la mettent en zone de préparation dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest par rapport à votre source/configuration locale exacte. L'étape de mise en zone de préparation ignore les caches locaux importants et les sorties de construction de l'application tels que Docker`.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et les répertoires de sortie Gradle ou `.build` locaux à l'application, afin que les exécutions live Docker ne passent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` pour que les sondes live du gateway ne démarrrent pas de vrais workers de channel Telegram/Discord/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, donc transmettez également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture live du gateway de cette voie Docker. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur gateway OpenClaw avec les points de terminaison HTTP compatibles OpenAI activés, démarre un conteneur Open WebUI épinglé contre ce gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une vraie demande de chat via le proxy `/api/chat/completions` d'Open WebUI. Définissez `OPENWEBUI_SMOKE_MODE=models` pour les vérifications CI de chemin de publication qui doivent s'arrêter après la connexion Open WebUI et la découverte du modèle, sans attendre de complétion de modèle live. La première exécution peut être sensiblement plus lente car Docker peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie attend une clé de modèle live utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir lors des exécutions Dockerisées. Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un vrai compte Telegram, Discord ou iMessageGateway. Il démarre un conteneur Gateway amorcé, démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations routées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements live, le routage d'envoi sortant, et les notifications de channel et d'autorisation de style Claude sur le vrai pont MCP stdio. La vérification des notifications inspecte directement les trames MCP stdio brutes, de sorte que le test de fumée valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à exposer. `test:docker:pi-bundle-mcp-tools`Docker est déterministe et n'a pas besoin d'une clé de modèle live. Il construit l'image Docker du dépôt, démarre un vrai serveur de sonde MCP stdio à l'intérieur du conteneur, matérialise ce serveur via le runtime MCP du bundle Pi intégré, exécute l'outil, puis vérifie que `coding` et `messaging` gardent les outils `bundle-mcp` tandis que `minimal` et `tools.deny: ["bundle-mcp"]` les filtrent. `test:docker:cron-mcp-cleanup`Gateway est déterministe et n'a pas besoin d'une clé de modèle live. Il démarre un Gateway amorcé avec un vrai serveur de sonde MCP stdio, exécute un tour cron isolé et un tour enfant ponctuel `/subagents spawn`, puis vérifie que le processus enfant MCP se termine après chaque exécution.

Test de fumée de fil en langage clair ACP manuel (pas dans CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les flux de travail de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils ACP, donc ne le supprimez pas.

Env vars utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté dans `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté dans `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (par défaut : `~/.profile`) monté dans `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` pour vérifier uniquement les env vars sourcés depuis `OPENCLAW_PROFILE_FILE`, en utilisant des répertoires de config/workspace temporaires et aucun montage d'auth CLI externe
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (par défaut : `~/.cache/openclaw/docker-cli-tools`) monté dans `/home/node/.npm-global` pour les installations CLI mises en cache dans Docker
- Les répertoires/fichiers d'auth CLI externes sous `$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions de provider restreintes ne montent que les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les réexécutions qui ne nécessitent pas de reconstruction
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour garantir que les identifiants proviennent du magasin de profils (et non des variables d'environnement)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le model exposé par le Gateway pour le test de fumée d'Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification de nonce utilisée par le test de fumée d'Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer la balise d'image Open WebUI épinglée

## Cohérence de la documentation

Exécutez les vérifications de documentation après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûr pour CI)

Il s'agit de régressions de « véritable pipeline » sans vrais fournisseurs :

- Appel d'outil du Gateway (mock OpenAI, véritable boucle agent + Gateway) : Gateway tool calling (mock OpenAI, real gateway + agent loop): `src/gateway/gateway.test.ts` (case: "runs a mock OpenAI tool call end-to-end via gateway agent loop")
- Assistant du Gateway (WS `wizard.start`/`wizard.next`, écriture de la configuration + authentification appliquée) : Gateway wizard (WS `wizard.start`/`wizard.next`, writes config + auth enforced): `src/gateway/gateway.test.ts` (case: "runs wizard over ws and writes auth token config")

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour la CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Appel d'outil simulé via la véritable boucle agent + Gateway (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de session et les effets de la configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les Skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les Skills sont répertoriés dans l'invite, l'agent choisit-il le bon Skill (ou évite-t-il ceux qui ne sont pas pertinents) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios à plusieurs tours qui affirment l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les futures évaluations doivent d'abord rester déterministes :

- Un exécuteur de scénario utilisant des fournisseurs simulés pour affirmer les appels d'outils + l'ordre, les lectures de fichiers de Skills et le câblage de session.
- Une petite suite de scénarios axés sur les Skills (utilisation vs évitement, filtrage, injection d'invite).
- Évaluations en direct facultatives (adhésion, limitées par l'environnement) uniquement après la mise en place de la suite sûre pour la CI.

## Tests de contrat (structure de plugin et de channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son contrat d'interface. Ils itèrent sur tous les plugins découverts et exécutent une suite d'assertions sur la forme et le comportement. La voie `pnpm test` unit par défaut ignore intentionnellement ces fichiers de jointure et de fumée partagés ; exécutez les commandes de contrat explicitement lorsque vous touchez aux surfaces partagées du channel ou du provider.

### Commandes

- Tous les contrats : `pnpm test:contracts`
- Contrats de channel uniquement : `pnpm test:contracts:channels`
- Contrats de provider uniquement : `pnpm test:contracts:plugins`

### Contrats de channel

Situés dans `src/channels/plugins/contracts/*.contract.test.ts` :

- **plugin** - Forme de base du plugin (id, nom, capacités)
- **setup** - Contrat de l'assistant de configuration
- **session-binding** - Comportement de liaison de session
- **outbound-payload** - Structure du payload du message
- **inbound** - Gestion des messages entrants
- **actions** - Gestionnaires d'actions du channel
- **threading** - Gestion de l'ID de fil de discussion
- **directory** - API de répertoire/liste
- **group-policy** - Application de la stratégie de groupe

### Contrats de statut de provider

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondes de statut du channel
- **registry** - Forme du registre de plugins

### Contrats de provider

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat du flux d'authentification
- **auth-choice** - Choix/sélection de l'authentification
- **catalog** - API du catalogue de modèles
- **discovery** - Découverte de plugins
- **loader** - Chargement des plugins
- **runtime** - Runtime du provider
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exportations ou les sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de channel ou de provider
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests de contrat s'exécutent dans CI et ne nécessitent pas de vraies clés API.

## Ajouter des régressions (conseils)

Lorsque vous corrigez un problème de provider/model découvert en direct :

- Ajoutez si possible une régression sûre pour la CI (provider simulé/bouchon, ou capturez la transformation exacte de la forme de la requête)
- S'il est intrinsèquement uniquement en direct (limites de débit, stratégies d'authentification), gardez le test en direct étroit et optionnel via les env vars
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bug de conversion/relecture de requête provider → test direct des modèles
  - bug du pipeline de session/historique/tool de la passerelle → test de fumée en direct de la passerelle ou test simulé sécurisé pour la CI de la passerelle
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les identifiants d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles `includeInPlan` SecretRef dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les identifiants de cible non classés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.

## Connexe

- [Test en direct](/fr/help/testing-live)
- [Test des mises à jour et des plugins](/fr/help/testing-updates-plugins)
- [CI](/fr/ci)
