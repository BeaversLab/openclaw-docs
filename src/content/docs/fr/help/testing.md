---
summary: "Kit de tests : suites unitaires/e2e/live, runners Docker, et couverture de chaque test"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "Testing"
---

OpenClaw possède trois suites Vitest (unit/integration, e2e, live) et un petit ensemble
de runners Docker. Ce document est un guide "comment nous testons" :

- Ce que couvre chaque suite (et ce qu'elle ne couvre _pas_ délibérément).
- Quelles commandes exécuter pour les workflows courants (local, pre-push, débogage).
- Comment les tests live découvrent les identifiants et sélectionnent les modèles/providers.
- Comment ajouter des régressions pour les problèmes réels de modèles/providers.

<Note>
**QA stack (qa-lab, qa-channel, live transport lanes)** est documenté séparément :

- [Aperçu QA](/fr/concepts/qa-e2e-automation) - architecture, surface de commande, création de scénarios.
- [Matrix QA](/fr/concepts/qa-matrix) - référence pour `pnpm openclaw qa matrix`.
- [QA channel](/fr/channels/qa-channel) - le plugin de transport synthétique utilisé par les scénarios basés sur le dépôt.

Cette page couvre l'exécution des suites de tests régulières et des exécuteurs Docker/Parallels. La section sur les exécuteurs spécifiques QA ci-dessous ([Exécuteurs spécifiques QA](#qa-specific-runners)) répertorie les invocations concrètes `qa` et fait référence aux documents ci-dessus.

</Note>

## Quick start

La plupart des jours :

- Full gate (attendu avant le push) : `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Exécution locale plus rapide de la suite complète sur une machine puissante : `pnpm test:max`
- Boucle de surveillance Vitest directe : `pnpm test:watch`
- Le ciblage direct de fichiers route désormais aussi les chemins d'extension/channel : `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Privilégiez d'abord les exécutions ciblées lorsque vous itérez sur un seul échec.
- Site QA soutenu par Docker : `pnpm qa:lab:up`
- Voie QA soutenue par une VM Linux : `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Lorsque vous modifiez des tests ou souhaitez une confiance supplémentaire :

- Coverage gate : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de vrais providers/modèles (nécessite de vrais identifiants) :

- Suite Live (modèles + sondes d'outil/image de passerelle) : `pnpm test:live`
- Cibler un fichier live discrètement : `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Rapports de performance à l'exécution : envoyez `OpenClaw Performance` avec
  `live_gpt54=true` pour un vrai tour d'agent `openai/gpt-5.4` ou
  `deep_profile=true` pour les artefacts CPU/tas/trace de Kova. Les exécutions planifiées quotidiennes
  publient les artefacts de voie mock-provider, deep-profile et GPT 5.4 vers
  `openclaw/clawgrit-reports` lorsque `CLAWGRIT_REPORTS_TOKEN` est configuré. Le
  rapport mock-provider inclut également les chiffres au niveau source du démarrage de la passerelle, de la mémoire,
  de la pression des plugins, de la boucle hello de faux modèle répétée et du démarrage CLI.
- Balayage de modèle live Docker : `pnpm test:docker:live-models`
  - Chaque modèle sélectionné exécute maintenant un tour de texte plus une petite sonde de style lecture de fichier.
    Les modèles dont les métadonnées annoncent une entrée `image` exécutent également un tour d'image minime.
    Désactivez les sondes supplémentaires avec `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` ou
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` lors de l'isolement des pannes du provider.
  - Couverture CI : le `OpenClaw Scheduled Live And E2E Checks` quotidien et le `OpenClaw Release Checks` manuel
    appellent tous deux le workflow live/E2E réutilisable avec
    `include_live_suites: true`, qui inclut des travaux de matrice distincts pour le modèle live Docker répartis par provider.
  - Pour les réexécutions CI ciblées, dispatchez `OpenClaw Live And E2E Checks (Reusable)`
    avec `include_live_suites: true` et `live_models_only: true`.
  - Ajoutez de nouveaux secrets de provider à signal élevé à `scripts/ci-hydrate-live-auth.sh`
    ainsi qu'à `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` et ses
    appelants planifiés/release.
- Test de fumée (smoke) du chat lié Codex natif : `pnpm test:docker:live-codex-bind`
  - Exécute une voie (lane) live Docker sur le chemin du serveur d'application Codex, lie un DM Slack synthétique avec `/codex bind`, exerce `/codex fast` et
    `/codex permissions`, puis vérifie qu'une réponse simple et une pièce jointe d'image
    passent par la liaison du plugin native au lieu de l'ACP.
- Test de fumée du harnais du serveur d'application Codex : `pnpm test:docker:live-codex-harness`
  - Exécute des tours d'agent de passerelle via le harnais du serveur d'application Codex propriété du plugin,
    vérifie `/codex status` et `/codex models`, et par défaut exerce les sondes d'image,
    MCP cron, sous-agent et Guardian. Désactivez la sonde de sous-agent avec
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` lors de l'isolement d'autres pannes du
    serveur d'application Codex. Pour une vérification ciblée du sous-agent, désactivez les autres sondes :
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    Cela se termine après la sonde de sous-agent, sauf si
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0` est défini.
- Test de fumée de l'installation à la demande Codex : `pnpm test:docker:codex-on-demand`
  - Installe l'archive tar OpenClaw empaquetée dans Docker, exécute l'intégration de la clé API OpenAI, et vérifie que le plugin Codex ainsi que la dépendance OpenClawDockerOpenAIAPI`@openai/codex`npm ont été téléchargés à la demande dans la racine npm gérée.
- Test de fumée de la dépendance d'outil de plugin en direct : `pnpm test:docker:live-plugin-tool`
  - Empaquete un plugin de test avec une dépendance `slugify` réelle, l'installe via `npm-pack:`npmOpenAI, vérifie la dépendance sous la racine npm gérée, puis demande à un modèle OpenAI en direct d'appeler l'outil du plugin et de renvoyer le slug masqué.
- Test de fumée de la commande de secours Crestodian : `pnpm test:live:crestodian-rescue-channel`
  - Vérification de sécurité supplémentaire (opt-in) pour la surface de la commande de secours du canal de messages. Elle exerce `/crestodian status`, met en file d'attente un changement de modèle persistant, répond `/crestodian yes`, et vérifie le chemin d'écriture d'audit/config.
- Test de fumée du planificateur Crestodian Docker : Docker`pnpm test:docker:crestodian-planner`
  - Exécute Crestodian dans un conteneur sans configuration avec une fausse CLI Claude sur CLI`PATH` et vérifie que le repli du planificateur flou se traduit par une écriture de configuration typée et auditée.
- Test de fumée de la première exécution Crestodian Docker : Docker`pnpm test:docker:crestodian-first-run`
  - Commence à partir d'un répertoire d'état OpenClaw vide, achemine les OpenClaw`openclaw`Discord nues vers Crestodian, applique les écritures de configuration/modèle/agent/plugin Discord + SecretRef, valide la configuration et vérifie les entrées d'audit. Le même chemin de configuration Ring 0 est également couvert dans le QA Lab par `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup`.
- Test de fumée des coûts Moonshot/Kimi : avec Moonshot`MOONSHOT_API_KEY` défini, exécutez `openclaw models list --provider moonshot --json`, puis exécutez un `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json` isolé contre `moonshot/kimi-k2.6`Moonshot. Vérifiez que le JSON rapporte Moonshot/K2.6 et que la transcription de l'assistant stocke les `usage.cost` normalisées.

<Tip>Lorsque vous n'avez besoin que d'un cas d'échec, préférez restreindre les tests en direct via les env vars de la liste d'autorisation décrits ci-dessous.</Tip>

## Runners spécifiques QA

Ces commandes se situent à côté des principales suites de tests lorsque vous avez besoin de réalisme de laboratoire QA :

L'CI exécute QA Lab dans des workflows dédiés. La parité agentique est imbriquée sous
`QA-Lab - All Lanes` et la validation de version, et non dans un workflow de PR autonome.
La validation large doit utiliser `Full Release Validation` avec
`rerun_group=qa-parity`Docker ou le groupe QA release-checks. Les vérifications de version stables par défaut gardent
le soak exhaustif live/Docker derrière `run_release_soak=true` ; le
profil `full` force l'activation du soak. `QA-Lab - All Lanes`
s'exécute chaque nuit sur `main` et depuis un déclenchement manuel avec la voie de parité simulée, la voie live
Matrix, la voie live Telegram gérée par Convex, et la voie live Discord
gérée par Convex en tant que travaux parallèles. La QA planifiée et les vérifications de version passent le Matrix
`--profile fast` explicitement, tandis que le Matrix CLI et l'entrée de workflow manuel
defaut restent `all` ; le déclenchement manuel peut fragmenter `all` en `transport`,
`media`, `e2ee-smoke`, `e2ee-deep` et `e2ee-cli`OpenClaw travaux. `OpenClaw Release
Checks` exécute la parité ainsi que les voies rapides Matrix et Telegram avant l'approbation
de la version, en utilisant `mock-openai/gpt-5.5` pour les vérifications de transport de version afin qu'elles restent
déterministes et évitent le démarrage normal du plugin provider. Ces passerelles de transport live
désactivent la recherche mémoire ; le comportement de la mémoire reste couvert par les suites de parité QA.

Les shards de média live complets pour la version utilisent
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, qui possède déjà
`ffmpeg` et `ffprobe`Docker. Les shards live model/backend Docker utilisent l'image partagée
`ghcr.io/openclaw/openclaw-live-test:<sha>` construite une fois par commit
sélectionné, puis la récupèrent avec `OPENCLAW_SKIP_DOCKER_BUILD=1` au lieu de la reconstruire
à l'intérieur de chaque shard.

- `pnpm openclaw qa suite`
  - Exécute les scénarios QA basés sur le dépôt directement sur l'hôte.
  - Exécute plusieurs scénarios sélectionnés en parallèle par défaut avec des
    workers de passerelle isolés. `qa-channel` a une concurrence par défaut de 4 (limitée par le
    nombre de scénarios sélectionnés). Utilisez `--concurrency <count>` pour ajuster le nombre
    de workers, ou `--concurrency 1` pour l'ancienne voie sérielle.
  - Quitte avec un code non nul si un scénario échoue. Utilisez `--allow-failures` lorsque vous
    souhaitez des artefacts sans code de sortie d'échec.
  - Prend en charge les modes de provider `live-frontier`, `mock-openai` et `aimock`.
    `aimock` démarre un serveur provider local soutenu par AIMock pour une couverture expérimentale
    de fixtures et de mocks de protocole sans remplacer la voie `mock-openai` consciente des scénarios.
- `pnpm test:plugins:kitchen-sink-live`
  - Exécute le gauntlet du plugin Kitchen Sink live OpenAI via QA Lab. Il
    installe le package externe Kitchen Sink, vérifie l'inventaire de surface du SDK de plugin,
    sonde `/healthz` et `/readyz`, enregistre les preuves CPU/RSS de la passerelle,
    exécute un tour live OpenAI et vérifie les diagnostics contradictoires.
    Nécessite une authentification live OpenAI telle que `OPENAI_API_KEY`. Dans les sessions Testbox hydratées,
    il source automatiquement le profil live-auth de Testbox lorsque l'assistant
    `openclaw-testbox-env` est présent.
- `pnpm test:gateway:cpu-scenarios`
  - Exécute le banc de démarrage de la passerelle ainsi qu'un petit pack de scénarios factices QA Lab
    (`channel-chat-baseline`, `memory-failure-fallback`,
    `gateway-restart-inflight-run`) et écrit un résumé combiné d'observations CPU
    sous `.artifacts/gateway-cpu-scenarios/`.
  - Signale uniquement les observations CPU chaudes soutenues par défaut (`--cpu-core-warn`
    plus `--hot-wall-warn-ms`), de sorte que les courtes bursts de démarrage sont enregistrées comme métriques
    sans ressembler à la régression de blocage de passerelle qui dure des minutes.
  - Utilise les artefacts `dist` construits ; lancez d'abord une compilation lorsque le checkout ne possède pas
    déjà une sortie d'exécution fraîche.
- `pnpm openclaw qa suite --runner multipass`
  - Exécute la même suite QA dans une machine virtuelle Linux Multipass jetable.
  - Conserve le même comportement de sélection de scénarios que `qa suite` sur l'hôte.
  - Réutilise les mêmes indicateurs de sélection de provider/model que `qa suite`.
  - Les exécutions Live transmettent les entrées d'auth QA prises en charge qui sont pratiques pour l'invité :
    les clés de provider basées sur l'env, le chemin de config du provider QA live, et `CODEX_HOME`
    lorsqu'il est présent.
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
  - Utilisez `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` pour exécuter la même voie d'installation packagée
    avec Discord.
- `pnpm test:docker:session-runtime-context`
  - Exécute un test de smoke déterministe d'application compilée Docker pour les
    transcriptions de contexte d'exécution intégrées. Il vérifie que le contexte d'exécution caché OpenClaw
    est conservé sous forme de message personnalisé non affiché au lieu de fuir dans le tour utilisateur visible,
    puis amorce un JSONL de session cassé affecté et vérifie que
    `openclaw doctor --fix` le réécrit vers la branche active avec une sauvegarde.
- `pnpm test:docker:npm-telegram-live`
  - Installe un candidat de paquet OpenClaw dans Docker, exécute l'onboarding du paquet installé, configure Telegram via le CLI installé, puis réutilise le voie QA Telegram en direct avec ce paquet installé en tant que Gateway du SUT.
  - Le wrapper monte uniquement la source du harnais `qa-lab` depuis l'extraction ; le
    package installé possède `dist`, `openclaw/plugin-sdk` et le runtime du plugin
    groupé afin que la voie ne mélange pas les plugins de l'extraction actuelle dans le package
    testé.
  - Par défaut, c'est `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta` ; définissez
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` ou
    `OPENCLAW_CURRENT_PACKAGE_TGZ` pour tester un tarball local résolu au lieu de
    l'installer depuis le registre.
  - Utilise les mêmes identifiants d'environnement Telegram ou la source d'identifiants Convex que
    `pnpm openclaw qa telegram`. Pour l'automatisation CI/release, définissez
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` ainsi que
    `OPENCLAW_QA_CONVEX_SITE_URL` et le secret de rôle. Si
    `OPENCLAW_QA_CONVEX_SITE_URL` et un secret de rôle Convex sont présents dans la CI,
    le wrapper Docker sélectionne automatiquement Convex.
  - Le wrapper valide l'environnement d'identifiants Telegram ou Convex sur l'hôte avant
    les travaux de construction/installation Docker. Définissez `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`
    uniquement lors du débogage délibéré de la configuration pré-identifiants.
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` remplace le `OPENCLAW_QA_CREDENTIAL_ROLE` partagé
    pour cette voie uniquement.
  - GitHub Actions expose cette voie en tant que workflow manuel de maintenance
    `NPM Telegram Beta E2E`. Il ne s'exécute pas lors de la fusion. Le workflow utilise l'environnement
    `qa-live-shared` et les baux d'identifiants CI Convex.
- GitHub Actions expose également `Package Acceptance` pour une preuve de produit en parallèle
  contre un package candidat. Il accepte une référence approuvée, une spec npm publiée,
  une URL d'archive HTTPS avec SHA-256, ou un artifact d'archive provenant d'une autre exécution, télécharge
  le `openclaw-current.tgz` normalisé sous `package-under-test`, puis exécute le
  planificateur E2E Docker existant avec les profils de voie smoke, package, product, full ou custom.
  Définissez `telegram_mode=mock-openai` ou `live-frontier` pour exécuter le
  workflow QA Telegram contre le même artifact `package-under-test`.
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
  - Installe également une ligne de base npm ancienne connue, active Telegram avant d'exécuter
    `openclaw update --tag <candidate>`, et vérifie que le médecin post-mise à jour du candidat nettoie les débris de dépendances de plugins hérités sans
    réparation postinstall du côté du harnais.
- `pnpm test:parallels:npm-update`
  - Exécute le test de fumée de mise à jour d'installation native empaquetée sur les invités Parallels. Chaque
    plateforme sélectionnée installe d'abord le package de ligne de base demandé, puis exécute
    la commande `openclaw update` installée sur le même invité et vérifie la
    version installée, le statut de mise à jour, la disponibilité de la passerelle et un tour d'agent
    local.
  - Utilisez `--platform macos`, `--platform windows`, ou `--platform linux` lors de
    l'itération sur un invité. Utilisez `--json` pour le chemin de l'artifact de résumé et
    le statut par voie.
  - La voie OpenAI utilise `openai/gpt-5.5` pour la preuve de tour d'agent en direct par
    défaut. Passez `--model <provider/model>` ou définissez
    `OPENCLAW_PARALLELS_OPENAI_MODEL` lors de la validation délibérée d'un autre
    modèle OpenAI.
  - Encadrez les exécutions locales longues avec un délai d'attente de l'hôte pour que les blocages du transport Parallels ne puissent pas consommer le reste de la fenêtre de tests :

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - Le script écrit des journaux de voie imbriqués sous `/tmp/openclaw-parallels-npm-update.*`.
    Inspectez `windows-update.log`, `macos-update.log` ou `linux-update.log`
    avant de supposer que l'enveloppe externe est bloquée.
  - La mise à jour Windows peut passer 10 à 15 minutes dans le travail de diagnostic et de mise à jour des packages sur un invité à froid ; cela est encore sain lorsque le journal de debug npm imbriqué progresse.
  - N'exécutez pas cet enveloppeur agrégé en parallèle avec les voies de test de fumée Parallels macOS, Windows ou Linux individuelles. Elles partagent l'état de la machine virtuelle et peuvent entrer en collision lors de la restauration d'instantané, de la diffusion de packages ou de l'état de la passerelle de l'invité.
  - La preuve de post-mise à jour exécute la surface normale du plugin groupé car les façades de fonctionnalités telles que la reconnaissance vocale, la génération d'images et la compréhension des médias sont chargées via les API d'exécution groupées, même lorsque le tour d'agent lui-même ne vérifie qu'une réponse textuelle simple.

- `pnpm openclaw qa aimock`
  - Démarre uniquement le serveur de fournisseur AIMock local pour le test de fumée direct du protocole.
- `pnpm openclaw qa matrix`
  - Exécute la voie QA Matrix en direct sur un serveur domestique Tuwunel éphémère soutenu par MatrixDocker. Source-checkout uniquement - les installations empaquetées n'incluent pas `qa-lab`.
  - CLI complet, catalogue de profils/scénarios, env vars et structure des artefacts : [Matrix QA](/fr/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Exécute la voie QA en direct Telegram contre un groupe privé réel en utilisant les jetons de bot du pilote et du SUT provenant de l'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. L'identifiant de groupe doit être l'identifiant de chat numérique Telegram.
  - Prend en charge `--credential-source convex` pour les identifiants mutualisés partagés. Utilisez le mode env par défaut, ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` pour opter pour les baux mutualisés.
  - Les valeurs par défaut couvrent canary, mention gating, command addressing, `/status`, les réponses mentionnées de bot à bot et les réponses aux commandes natives principales. Les valeurs par défaut `mock-openai` couvrent également les régressions de chaîne de réponses déterministes et de diffusion de message final Telegram. Utilisez `--list-scenarios` pour les sondes facultatifs tels que `session_status`.
  - Quitte avec un code non nul lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque vous
    souhaitez des artefacts sans code de sortie d'échec.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable de bot à bot, activez le mode de communication bot-à-bot dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact observed-messages sous `.artifacts/qa-e2e/...`. Les scénarios de réponse incluent le RTT de la demande d'envoi du pilote à la réponse SUT observée.

`Mantis Telegram Live` est le wrapper de preuves pour PR autour de ce lane. Il exécute la référence candidate avec des identifiants Telegram loués via Convex, restitue la transcription des messages observés (caviardée) dans un navigateur de bureau Crabbox, enregistre des preuves MP4, génère un GIF découpé par mouvement, télécharge le bundle d'artefacts et publie des preuves PR en ligne via l'application Mantis GitHub lorsque `pr_number` est défini. Les mainteneurs peuvent le démarrer depuis l'interface Actions via `Mantis Scenario` (`scenario_id: telegram-live`) ou directement depuis un commentaire de pull request :

```text
@Mantis telegram
@Mantis telegram scenario=telegram-status-command
@Mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` est le wrapper agentic natif avant/après du bureau Telegram pour la preuve visuelle de PR. Démarrez-le depuis l'interface Actions avec des `instructions` libres, via `Mantis Scenario` (`scenario_id: telegram-desktop-proof`), ou depuis un commentaire de PR :

```text
@Mantis telegram desktop proof
```

L'agent Mantis lit la PR, décide quel comportement visible sur Telegram prouve le changement, exécute le lane de preuve Crabbox Telegram Desktop réel de l'utilisateur sur les références de base et candidate, itère jusqu'à ce que les GIF natifs soient utiles, écrit un manifeste `motionPreview` couplé et publie le même tableau GIF à 2 colonnes via l'application Mantis GitHub lorsque `pr_number` est défini.

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - Loue ou réutilise un bureau Crabbox Linux, installe le bureau natif Telegram Desktop, configure OpenClaw avec un jeton de bot SUT Telegram loué, démarre la passerelle et enregistre des preuves de capture d'écran/MP4 depuis le bureau VNC visible.
  - Par défaut, utilise `--credential-source convex`, donc les workflows n'ont besoin que du secret du broker Convex. Utilisez `--credential-source env` avec les mêmes variables `OPENCLAW_QA_TELEGRAM_*` que `pnpm openclaw qa telegram`.
  - Telegram Desktop a toujours besoin d'une connexion/profil utilisateur. Le jeton de bot ne configure qu'OpenClaw. Utilisez TelegramOpenClaw`--telegram-profile-archive-env <name>` pour une archive de profil `.tgz` en base64, ou utilisez `--keep-lease` et connectez-vous manuellement via VNC une fois.
  - Écrit `mantis-telegram-desktop-builder-report.md`, `mantis-telegram-desktop-builder-summary.json`, `telegram-desktop-builder.png` et `telegram-desktop-builder.mp4` sous le répertoire de sortie.

Les voies de transport en direct partagent un contrat standard afin que les nouveaux transports ne dérivent pas ; la matrice de couverture par voie se trouve dans [Aperçu QA → Couverture du transport en direct](/fr/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` est la suite synthétique large et ne fait pas partie de cette matrice.

### Identifiants Telegram partagés via Convex (v1)

Lorsque `--credential-source convex` (ou `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`DiscordSlackWhatsApp) est activé pour les tests QA de transport en direct, le laboratoire QA acquiert un bail exclusif depuis un pool soutenu par Convex, maintient ce bail par pulsations (heartbeats) tant que la voie est en cours d'exécution, et libère le bail à l'arrêt. Le nom de la section précède le support de Discord, Slack et WhatsApp ; le contrat de bail est partagé entre les différents types.

Référence de l'échafaudage de projet Convex :

- `qa/convex-credential-broker/`

Variables d'environnement requises :

- `OPENCLAW_QA_CONVEX_SITE_URL` (par exemple `https://your-deployment.convex.site`)
- Un secret pour le rôle sélectionné :
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` pour `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` pour `ci`
- Sélection du rôle d'identifiants :
  - CLI : CLI`--credential-role maintainer|ci`
  - Défaut d'env : `OPENCLAW_QA_CREDENTIAL_ROLE` (par défaut `ci` dans la CI, `maintainer` sinon)

Variables d'environnement optionnelles :

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (défaut `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (défaut `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (défaut `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (défaut `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (défaut `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de trace optionnel)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` autorise les `http://` URL Convex en boucle locale pour un développement uniquement local.

`OPENCLAW_QA_CONVEX_SITE_URL` doit utiliser `https://` en fonctionnement normal.

Les commandes d'administration du responsable (pool add/remove/list) nécessitent
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` spécifiquement.

Aides CLI pour les responsables :

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Utilisez `doctor` avant les exécutions en direct pour vérifier l'URL du site Convex, les secrets du courtier,
le préfixe du point de terminaison, le délai d'expiration HTTP et l'accessibilité de l'administrateur/de la liste sans imprimer
les valeurs secrètes. Utilisez `--json` pour une sortie lisible par machine dans les scripts et les utilitaires d'IC.

Contrat de point de terminaison par défaut (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`) :

- `POST /acquire`
  - Requête : `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Succès : `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Épuisé/réessayable : `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - Succès : `{ status: "ok", index, data }`
- `POST /heartbeat`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Succès : `{ status: "ok" }` (ou `2xx` vide)
- `POST /release`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Succès : `{ status: "ok" }` (ou `2xx` vide)
- `POST /admin/add` (secret responsable uniquement)
  - Requête : `{ kind, actorId, payload, note?, status? }`
  - Succès : `{ status: "ok", credential }`
- `POST /admin/remove` (secret responsable uniquement)
  - Requête : `{ credentialId, actorId }`
  - Succès : `{ status: "ok", changed, credential }`
  - Garde de bail actif : `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (secret responsable uniquement)
  - Requête : `{ kind?, status?, includePayload?, limit? }`
  - Succès : `{ status: "ok", credentials, count }`

Structure de la charge utile pour le type Telegram :

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` doit être une chaîne d'identifiant de conversation Telegram numérique.
- `admin/add` valide cette structure pour `kind: "telegram"` et rejette les charges utiles malformées.

Structure de la charge utile pour le type réel d'utilisateur Telegram :

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`, `testerUserId` et `telegramApiId` doivent être des chaînes numériques.
- `tdlibArchiveSha256` et `desktopTdataArchiveSha256` doivent être des chaînes hexadécimales SHA-256.
- `kind: "telegram-user"` représente un compte jeton Telegram. Traitez le bail comme étant à l'échelle du compte : le pilote CLI TDLib et le témoin visuel Telegram Desktop restaurent à partir de la même charge utile, et un seul travail doit détenir le bail à la fois.

Restauration du bail d'utilisateur réel Telegram :

```bash
tmp=$(mktemp -d /tmp/openclaw-telegram-user.XXXXXX)
node --import tsx scripts/e2e/telegram-user-credential.ts lease-restore \
  --user-driver-dir "$tmp/user-driver" \
  --desktop-workdir "$tmp/desktop" \
  --lease-file "$tmp/lease.json"
TELEGRAM_USER_DRIVER_STATE_DIR="$tmp/user-driver" \
  uv run ~/.codex/skills/custom/telegram-e2e-bot-to-bot/scripts/user-driver.py status --json
node --import tsx scripts/e2e/telegram-user-credential.ts release --lease-file "$tmp/lease.json"
```

Utilisez le profil Desktop restauré avec `Telegram -workdir "$tmp/desktop"` lorsqu'un enregistrement visuel est nécessaire. Dans les environnements d'opérateur locaux, `scripts/e2e/telegram-user-credential.ts` lit `~/.codex/skills/custom/telegram-e2e-bot-to-bot/convex.local.env` par défaut si les variables d'environnement de processus sont absentes.

Session Crabbox pilotée par l'agent :

```bash
pnpm qa:telegram-user:crabbox -- start \
  --tdlib-url http://artifacts.openclaw.ai/tdlib-v1.8.0-linux-x64.tgz \
  --output-dir .artifacts/qa-e2e/telegram-user-crabbox/pr-review
pnpm qa:telegram-user:crabbox -- send \
  --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json \
  --text /status
pnpm qa:telegram-user:crabbox -- finish \
  --session .artifacts/qa-e2e/telegram-user-crabbox/pr-review/session.json
```

`start` loue les informations d'identification `telegram-user`, restaure le même compte dans
TDLib et Telegram Desktop sur un bureau Crabbox Linux, démarre une passerelle SUT simulée locale
à partir de l'extraction actuelle, ouvre le chat Telegram visible, démarre
l'enregistrement du bureau et écrit un `session.json` privé. Tant que la session est
active, un agent peut continuer à tester jusqu'à satisfaction :

- `send --session <file> --text <message>` envoie via le vrai utilisateur TDLib et attend la réponse du SUT.
- `run --session <file> -- <remote command>` exécute une commande arbitraire sur le Crabbox et enregistre sa sortie, par exemple `bash -lc 'source /tmp/openclaw-telegram-user-crabbox/env.sh && python3 /tmp/openclaw-telegram-user-crabbox/user-driver.py transcript --limit 20 --json'`.
- `screenshot --session <file>` capture le bureau visible actuel.
- `status --session <file>` affiche le bail et la commande WebVNC.
- `finish --session <file>` arrête l'enregistreur, capture les artefacts de capture d'écran/vidéo/rognage de mouvement, libère les identifiants Convex, arrête les processus SUT locaux et arrête le bail Crabbox, sauf si `--keep-box` est passé.
- Par défaut, `publish --session <file> --pr <number>` publie un commentaire de PR contenant uniquement un GIF. Ne passez `--full-artifacts` que lorsque les journaux ou les artefacts JSON sont intentionnellement nécessaires.

Pour des reproductions visuelles déterministes, passez `--mock-response-file <path>` à `start`
ou à l'abréviation en une commande `probe`. Le runner utilise par défaut une classe Crabbox standard, un enregistrement à 24 fps, des aperçus GIF animés à 24 fps et une largeur de GIF de 1920 px. Remplacez par `--class`, `--record-fps`, `--preview-fps` et
`--preview-width` uniquement lorsque la preuve nécessite des paramètres de capture différents.

Preuve Crabbox en une commande :

```bash
pnpm qa:telegram-user:crabbox -- --text /status
```

La commande par défaut `probe` est une abréviation pour un cycle démarrer/envoyer/terminer. Utilisez-la
pour un test de fumée `/status` rapide. Utilisez les commandes de session pour la révision de PR,
le travail de reproduction de bugs ou tout cas où l'agent a besoin de minutes d'expérimentation
arbitraire avant de décider que la preuve est terminée. Utilisez `--id <cbx_...>` pour
réutiliser un bail de bureau à chaud, `--keep-box` pour garder le VNC ouvert après la fin,
`--desktop-chat-title <name>` pour choisir le chat visible et `--tdlib-url <tgz>`
lors de l'utilisation d'une archive Linux `libtdjson.so` préconstruite au lieu de construire TDLib sur
une nouvelle machine. Le runner vérifie `--tdlib-url` avec `--tdlib-sha256 <hex>` ou,
par défaut, un fichier `<url>.sha256` frère.

Payloads multi-canaux validés par le broker :

- Discord : `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp : `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Les voies Slack peuvent également louer depuis le pool, mais la validation des payload Slack se trouve actuellement
dans le runner QA Slack plutôt que dans le broker. Utilisez
`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`
pour les lignes Slack.

### Ajouter un canal à la QA

L'architecture et les noms des helpers de scénario pour les nouveaux adaptateurs de canal se trouvent dans [Aperçu de la QA → Ajouter un canal](/fr/concepts/qa-e2e-automation#adding-a-channel). Le minimum requis : implémenter le runner de transport sur le seam d'hôte partagé `qa-lab`, déclarer `qaRunners` dans le manifeste du plugin, monter en tant que `openclaw qa <runner>`, et rédiger des scénarios sous `qa/scenarios/`.

## Suites de tests (ce qui s'exécute où)

Considérez les suites comme un « réalisme croissant » (et une volatilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Config : les exécutions non ciblées utilisent le jeu de shards `vitest.full-*.config.ts` et peuvent étendre les shards multi-projets en configs par projet pour la planification parallèle
- Fichiers : inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts` et `test/**/*.test.ts` ; les tests unitaires UI s'exécutent dans le shard dédié `unit-ui`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration in-process (auth gateway, routage, outils, parsing, config)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans la CI
  - Aucune vraie clé requise
  - Doit être rapide et stable
  - Les tests de résolveur et de chargeur de surface publique doivent prouver un comportement de repli `api.js` et
    `runtime-api.js` large avec des tiny plugins générés, et non
    de vraies API sources de plugins empaquetés. Les chargements de vraies API de plugins appartiennent aux
    suites de contrat/intégration détenues par les plugins.

Politique de dépendance native :

- Les installations de test par défaut ignorent les constructions opus natives optionnelles de Discord. La réception vocale Discord utilise le décodeur `opusscript` pur JS, et `@discordjs/opus` reste désactivé dans `allowBuilds` afin que les tests locaux et les voies Testbox ne compilent pas l'addon natif.
- Utilisez une voie de performance vocale dédiée Discord ou une voie live si vous avez besoin intentionnellement de comparer une construction opus native. Ne définissez pas `@discordjs/opus` à `true` dans le `allowBuilds` par défaut ; cela fait compiler du code natif lors des boucles d'installation/test sans rapport.

<AccordionGroup>
  <Accordion title="Projets, shards et volets délimités">

    - Untargeted `pnpm test` exécute douze configurations de shard plus petites (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus géant de projet racine natif. Cela réduit le pic RSS sur les machines chargées et évite que le travail de réponse automatique/extension ne fasse mourir de faim les suites non liées.
    - `pnpm test --watch` utilise toujours le graphe de projet racine natif `vitest.config.ts`, car une boucle de surveillance multi-shard n'est pas pratique.
    - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent les cibles de fichiers/répertoires explicites d'abord via des volets délimités, de sorte que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
    - `pnpm test:changed` développe par défaut les chemins git modifiés en volets délimités peu coûteux : modifications directes des tests, fichiers `*.test.ts` frères, mappages de source explicites et dépendants du graphe d'importation local. Les modifications de configuration/configuration/package n'exécutent pas de tests larges sauf si vous utilisez explicitement `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed` est la passerelle de vérification locale intelligente normale pour le travail étroit. Il classifie la différence en core, core tests, extensions, extension tests, apps, docs, release metadata, live Docker tooling et tooling, puis exécute les commandes typecheck, lint et guard correspondantes. Il n'exécute pas les tests Vitest ; appelez `pnpm test:changed` ou un `pnpm test <target>`DockerDockerDocker explicite pour la preuve de test. Les incrémentations de version uniquement des métadonnées de version exécutent des vérifications ciblées de version/config/root-dependency, avec une garde qui rejette les modifications de package en dehors du champ de version de premier niveau.
    - Les modifications du harnais ACP Docker Live exécutent des vérifications ciblées : syntaxe shell pour les scripts d'auth Docker Live et une exéculation à sec du planificateur Docker Live. Les modifications `package.json` sont incluses uniquement lorsque la différence est limitée à `scripts["test:docker:live-*"]` ; les modifications de dépendance, d'exportation, de version et d'autres modifications de surface de package utilisent toujours les gardes plus larges.
    - Les tests unitaires légers en importations provenant d'agents, de commandes, de plugins, d'assistants de réponse automatique, `plugin-sdk` et de zones utilitaires pures similaires sont acheminés via le volet `unit-fast`, qui saute `test/setup-openclaw-runtime.ts` ; les fichiers lourds avec état/runtime restent sur les volets existants.
    - Certains fichiers source d'assistants `plugin-sdk` et `commands` sélectionnés mappent également les exécutions en mode modifié à des tests frères explicites dans ces volets légers, de sorte que les modifications d'assistants évitent de réexécuter la suite lourde complète pour ce répertoire.
    - `auto-reply` a des compartiments dédiés pour les assistants de base de premier niveau, les tests d'intégration `reply.*` de premier niveau et le sous-arbre `src/auto-reply/reply/**`. Le CI divise davantage le sous-arbre de réponse en shards agent-runner, dispatch et commands/state-routing afin qu'un compartiment lourd en importations ne possède pas la totalité de la queue Node.
    - Le CI PR/main normal ignore intentionnellement le balayage par lots d'extension et le shard `agentic-plugins` réservé aux versions. La validation complète des versions distribue le workflow enfant séparé `Plugin Prerelease` pour ces suites lourdes en plugins/extensions sur les candidats à la version.

  </Accordion>

  <Accordion title="Embedded runner coverage">

    - Lorsque vous modifiez les entrées de découverte de message-tool ou le contexte d'exécution de la compaction, maintenez les deux niveaux de couverture.
    - Ajoutez des régressions d'assistance ciblées pour les limites de routage pur et de normalisation.
    - Maintenez les suites d'intégration du runner intégré en bonne santé :
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, et
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
    - Ces suites vérifient que les IDs étendus et le comportement de compaction traversent toujours les chemins réels `run.ts` / `compact.ts` ; les tests d'assistance uniquement ne constituent pas un substitut suffisant à ces chemins d'intégration.

  </Accordion>

  <Accordion title="Vitest pool and isolation defaults">

    - La configuration de base de Vitest est définie par défaut sur `threads`.
    - La configuration partagée de Vitest fixe `isolate: false` et utilise le runner non isolé pour les configurations des projets racines, e2e et live.
    - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute également sur le runner partagé non isolé.
    - Chaque shard `pnpm test` hérite des mêmes valeurs par défaut `threads` + `isolate: false` de la configuration partagée Vitest.
    - `scripts/run-vitest.mjs` ajoute `--no-maglev` par défaut pour les processus enfants Node Vitest afin de réduire l'activité de compilation V8 lors des grandes exécutions locales.
      Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` pour comparer avec le comportement standard de V8.

  </Accordion>

  <Accordion title="Itération locale rapide">

    - `pnpm changed:lanes` indique quelles voies architecturales une diff déclenche.
    - Le hook de pré-commit est réservé au formatage. Il remet les fichiers formatés dans l'index
      et n'exécute pas le lint, le contrôle de type ou les tests.
    - Exécutez `pnpm check:changed` explicitement avant le transfert ou le push lorsque vous
      avez besoin de la porte de contrôle locale intelligente.
    - `pnpm test:changed` passe par des voies étendues peu coûteuses par défaut. Utilisez
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` uniquement lorsque l'agent
      décide qu'une modification de harnais, de config, de package ou de contrat nécessite vraiment une couverture
      Vitest plus large.
    - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement
      de routage, mais avec une limite de workers plus élevée.
    - La mise à l'échelle automatique des workers locaux est intentionnellement conservative et recule
      lorsque la charge moyenne de l'hôte est déjà élevée, de sorte que plusieurs exécutions
      concurrentes de Vitest causent moins de dégâts par défaut.
    - La config Vitest de base marque les fichiers projets/config comme
      `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage
      des tests change.
    - La config conserve `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge ;
      définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous voulez
      un emplacement de cache explicite pour le profilage direct.

  </Accordion>

  <Accordion title="Perf debugging">

    - `pnpm test:perf:imports` active le rapport de durée d'importation Vitest ainsi que
      la sortie de répartition des importations.
    - `pnpm test:perf:imports:changed` limite la même vue de profilage aux
      fichiers modifiés depuis `origin/main`.
    - Les données de synchronisation des partitions sont écrites dans `.artifacts/vitest-shard-timings.json`.
      Les exécutions de configuration complète utilisent le chemin de configuration comme clé ; les partitions CI de modèle d'inclusion
      ajoutent le nom de la partition afin que les partitions filtrées puissent être suivies
      séparément.
    - Lorsqu'un test à chaud passe encore la majeure partie de son temps dans les importations de démarrage,
      gardez les dépendances lourdes derrière une étroite jointure locale `*.runtime.ts` et
      mockez cette jointure directement au lieu d'importer profondément les helpers d'exécution juste
      pour les transmettre via `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les
      `test:changed` acheminés au chemin natif du projet racine pour ce diff
      validé et imprime le temps écoulé ainsi que le RSS max macOS.
    - `pnpm test:perf:changed:bench -- --worktree` mesure les performances de l'arborescence
      dirty actuelle en acheminant la liste des fichiers modifiés via
      `scripts/test-projects.mjs` et la configuration racine Vitest.
    - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour
      le démarrage et la surcharge de transformation de Vitest/Vite.
    - `pnpm test:perf:profile:runner` écrit des profils CPU+tas du lanceur pour la
      suite unitaire avec le parallélisme de fichiers désactivé.

  </Accordion>
</AccordionGroup>

### Stabilité (Gateway)

- Commande : `pnpm test:stability:gateway`
- Configuration : `vitest.gateway.config.ts`, forcée à un worker
- Portée :
  - Démarre un véritable Gateway en boucle avec les diagnostics activés par défaut
  - Fait passer des messages synthétiques, de la mémoire et des charges utiles importantes du Gateway par le chemin des événements de diagnostic
  - Interroge `diagnostics.stability` via le Gateway WS RPC
  - Couvre les helpers de persistance du bundle de stabilité de diagnostic
  - Affirme que l'enregistreur reste borné, que les échantillons RSS synthétiques restent sous le budget de pression et que les profondeurs de file d'attente par session se drainent jusqu'à zéro
- Attentes :
  - Sûr pour la CI et sans clé
  - Voie étroite pour le suivi des régressions de stabilité, non un substitut à la suite Gateway complète

### E2E (gateway smoke)

- Commande : `pnpm test:e2e`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts` et les tests E2E de bundled-plugin sous `extensions/`
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
  - Aucune clé réelle requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : test de fumée du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `extensions/openshell/src/backend.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw sur un `sandbox ssh-config` réel + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un `openshell` CLI local ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script d'enveloppement

### Live (fournisseurs réels + modèles réels)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`, `test/**/*.live.test.ts` et les tests live de bundled-plugin sous `extensions/`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - "Ce provider/model fonctionne-t-il réellement _aujourd'hui_ avec de vraies identifiants ?"
  - Détecter les changements de format du provider, les bizarreries des appels d'outils, les problèmes d'authentification et le comportement des limites de taux
- Attentes :
  - Non stable pour l'CI par conception (réseaux réels, politiques réelles des providers, quotas, pannes)
  - Coûte de l'argent / utilise des limites de taux
  - Préférer l'exécution de sous-ensembles réduits plutôt que de "tout"
- Les exécutions Live sourcent `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions Live isolent toujours `HOME` et copient le matériel de configuration/authentification dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre vrai `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests Live utilisent votre vrai répertoire personnel.
- `pnpm test:live` est maintenant par défaut en mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avertissement supplémentaire `~/.profile` et réduit les journaux d'amorçage de la passerelle et les bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au provider) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une substitution par test via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponse de limite de taux.
- Sortie de progression/heartbeat :
  - Les suites Live émettent désormais des lignes de progression sur stderr, de sorte que les appels longs au provider sont visiblement actifs même lorsque la capture de console de Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de la console Vitest, de sorte que les lignes de progression du provider/du gateway sont diffusées immédiatement lors des exécutions en direct.
  - Ajustez les signaux de cœur du modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les signaux de cœur du gateway/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Touching gateway networking / WS protocol / pairing: add `pnpm test:e2e`
- Debugging "my bot is down" / provider-specific failures / tool calling: run a narrowed `pnpm test:live`

## Live (network-touching) tests

For the live model matrix, CLI backend smokes, ACP smokes, Codex app-server
harness, and all media-provider live tests (Deepgram, BytePlus, ComfyUI, image,
music, video, media harness) - plus credential handling for live runs - see
[Testing live suites](/fr/help/testing-live). For the dedicated update and
plugin validation checklist, see
[Testing updates and plugins](/fr/help/testing-updates-plugins).

## Runners Docker (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker sont divisés en deux catégories :

- Live-model runners: `test:docker:live-models` and `test:docker:live-gateway` run only their matching profile-key live file inside the repo Docker image (`src/agents/models.profiles.live.test.ts` and `src/gateway/gateway-models.profiles.live.test.ts`), mounting your local config dir and workspace (and sourcing `~/.profile` if mounted). The matching local entrypoints are `test:live:models-profiles` and `test:live:gateway-profiles`.
- Les runners live Docker utilisent par défaut une limite de smoke plus petite afin qu'un balayage Docker complet reste pratique :
  `test:docker:live-models` defaults to `OPENCLAW_LIVE_MAX_MODELS=12`, and
  `test:docker:live-gateway` defaults to `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, and
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Override those env vars when you
  explicitly want the larger exhaustive scan.
- `test:docker:all`Docker construit l'image Docker live une fois via `test:docker:live-build`OpenClawnpm, emballe OpenClaw une fois en tant qu'archive tar npm via `scripts/package-openclaw-for-docker.mjs`, puis construit/réutilise deux images `scripts/e2e/Dockerfile`. L'image nue est uniquement le runner Node/Git pour les voies d'installation/de mise à jour/dépendances de plugin ; ces voies montent l'archive tar préconstruite. L'image fonctionnelle installe la même archive dans `/app`Docker pour les voies de fonctionnalité d'application construite. Les définitions des voies Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur se trouve dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. L'agrégat utilise un planificateur local pondéré : `OPENCLAW_DOCKER_ALL_PARALLELISM`npm contrôle les créneaux de processus, tandis que les limites de ressources empêchent les voies lourdes, npm-install et multi-service de démarrer toutes en même temps. Si une seule voie est plus lourde que les limites actives, le planificateur peut toujours la démarrer lorsque le pool est vide, puis la faire fonctionner seule jusqu'à ce que la capacité soit à nouveau disponible. Les valeurs par défaut sont 10 créneaux, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; ajustez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`DockerDockerOpenClaw uniquement lorsque l'hôte Docker dispose de plus de marge. Le runner effectue une vérification préalable Docker par défaut, supprime les conteneurs OpenClaw E2E obsolètes, imprime le statut toutes les 30 secondes, stocke les timings de voies réussis dans `.artifacts/docker-tests/lane-timings.json`, et utilise ces timings pour démarrer d'abord les voies plus longues lors des exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1`Docker pour imprimer le manifeste des voies pondérées sans construire ou exécuter Docker, ou `node scripts/test-docker-all.mjs --plan-json` pour imprimer le plan CI pour les voies sélectionnées, les besoins en packages/images et les identifiants.
- `Package Acceptance` est la porte de paquets native GitHub pour « est-ce que cette archive tar installable fonctionne en tant que produit ? ». Elle résout un paquet candidat depuis `source=npm`, `source=ref`, `source=url` ou `source=artifact`, le téléverse en tant que `package-under-test`, puis exécute les voies E2E Docker réutilisables contre cette archive tar exacte au lieu de recomprimer la référence sélectionnée. Les profils sont ordonnés par portée : `smoke`, `package`, `product` et `full`. Voir [Testing updates and plugins](/fr/help/testing-updates-plugins) pour le contrat paquet/mise à jour/plugin, la matrice de survie des mises à niveau publiées, les paramètres par défaut de publication et le triage des échecs.
- Les vérifications de build et de publication exécutent `scripts/check-cli-bootstrap-imports.mjs` après tsdown. Le garde parcourt le graphe de build statique depuis `dist/entry.js` et `dist/cli/run-main.js` et échoue si l'importation de démarrage pré-répartition importe des dépendances de paquets telles que Commander, prompt UI, undici ou logging avant la répartition des commandes ; il maintient également le bloc d'exécution de la passerelle regroupée sous le budget et rejette les importations statiques de chemins de passerelle froids connus. Le test de fumée du CLI empaqueté couvre également l'aide racine, l'aide à l'intégration, l'aide du docteur, le statut, le schéma de configuration et une commande de liste de modèles.
- La compatibilité héritée de l'acceptation des paquets est plafonnée à `2026.4.25` (`2026.4.25-beta.*` inclus). Jusqu'à cette limite, le harnais tolère uniquement les lacunes de métadonnées des paquets expédiés : entrées d'inventaire QA privées omises, `gateway install --wrapper` manquant, fichiers de correctifs manquants dans le git dérivé de l'archive tar, `update.channel` persistants manquants, emplacements hérités des enregistrements d'installation de plugins, persistance des enregistrements d'installation de la place de marché manquante, et migration des métadonnées de configuration pendant `plugins update`. Pour les paquets après `2026.4.25`, ces chemins sont des échecs stricts.
- Container smoke runners : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix` et `test:docker:config-reload` démarrent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de niveau supérieur.

Les runners Docker live-model montent également par liaison uniquement les répertoires d'authentification DockerCLICLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin que l'OAuth externe puisse actualiser les jetons sans modifier le magasin d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- ACP bind smoke : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh` ; couvre Claude, Codex et Gemini par défaut, avec une couverture stricte de Droid/OpenCode via `pnpm test:docker:live-acp-bind:droid` et `pnpm test:docker:live-acp-bind:opencode`)
- CLI backend smoke : CLI`pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent : Gateway`pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Observability smoke : `pnpm qa:otel:smoke` est une voie privée de checkout source QA. Elle n'est intentionnellement pas incluse dans les voies de publication de package Docker car l'archive tar npm omet le QA Lab.
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant d'intégration (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Test de fumée onboarding/channel/agent de tarball Npm : `pnpm test:docker:npm-onboard-channel-agent` installe la tarball OpenClaw empaquetée globalement dans Docker, configure OpenAI via env-ref onboarding ainsi que Telegram par défaut, exécute doctor, et exécute un tour d'agent OpenAI simulé. Réutilisez une tarball préconstruite avec `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sautez la reconstruction de l'hôte avec `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, ou changez de channel avec `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` ou `OPENCLAW_NPM_ONBOARD_CHANNEL=slack`.
- Test de fumée d'installation de compétence : `pnpm test:docker:skill-install` installe la tarball OpenClaw empaquetée globalement dans Docker, désactive les installations d'archive téléchargées dans la configuration, résout le slug de compétence ClawHub actif actuel à partir de la recherche, l'installe avec `openclaw skills install`, et vérifie la compétence installée ainsi que les métadonnées d'origine/verrouillage `.clawhub`.
- Test de fumée de changement de channel de mise à jour : `pnpm test:docker:update-channel-switch` installe la tarball OpenClaw empaquetée globalement dans Docker, passe du package `stable` à git `dev`, vérifie le channel persisté et le fonctionnement du plugin après mise à jour, puis repasse au package `stable` et vérifie l'état de la mise à jour.
- Test de fumée de survie de mise à niveau : `pnpm test:docker:upgrade-survivor` installe la tarball OpenClaw empaquetée sur un appareil d'ancien utilisateur sale avec des agents, une configuration de channel, des listes d'autorisation de plugins, un état de dépendance de plugin obsolète, et des fichiers d'espace de travail/session existants. Il exécute la mise à jour du package ainsi que le doctor non interactif sans clés de provider ou de channel actif, puis démarre un Gateway en boucle et vérifie la préservation de la configuration/de l'état ainsi que les budgets de démarrage/statut.
- Survivor de mise à niveau publiée : `pnpm test:docker:published-upgrade-survivor` installe `openclaw@latest` par défaut, sème des fichiers réalistes d'utilisateur existant, configure cette ligne de base avec une recette de commande intégrée, valide la configuration résultante, met à jour cette installation publiée vers l'archive tar candidate, exécute le doctor en mode non interactif, écrit `.artifacts/upgrade-survivor/summary.json`Gateway, puis démarre un Gateway en boucle et vérifie les intentions configurées, la préservation de l'état, le démarrage, `/healthz`, `/readyz`RPC, et les budgets de statut RPC. Remplacez une ligne de base par `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, demandez au planificateur agrégé d'étendre les lignes de base locales exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` telles que `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, et étendez les fixtures en forme de ticket avec `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` telles que `reported-issues` ; l'ensemble des tickets signalés inclut `configured-plugin-installs`OpenClaw pour la réparation automatique de l'installation du plugin externe OpenClaw. L'acceptation de package expose ceux-ci en tant que `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` et `published_upgrade_survivor_scenarios`, résout les jetons de méta-ligne de base tels que `last-stable-4` ou `all-since-2026.4.23`, et la validation complète de release étend la porte de package de trempage de release à `last-stable-4 2026.4.23 2026.5.2 2026.4.15` plus `reported-issues`.
- Survie du contexte d'exécution de session : `pnpm test:docker:session-runtime-context` vérifie la persistance de la transcription du contexte d'exécution caché ainsi que la réparation par doctor des branches de réécriture de prompt dupliquées affectées.
- Survie de l'installation globale Bun : Bun`bash scripts/e2e/bun-global-install-smoke.sh` empaquète l'arborescence actuelle, l'installe avec `bun install -g` dans un répertoire personnel isolé, et vérifie que `openclaw infer image providers --json` renvoie les fournisseurs d'images groupés au lieu de bloquer. Réutilisez une archive tar préconstruite avec `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sautez la construction de l'hôte avec `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0`, ou copiez `dist/`Docker depuis une image Docker construite avec `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Test de fumée de l'installeur Docker : Docker`bash scripts/test-install-sh-docker.sh`npmnpmnpm partage un cache npm entre ses conteneurs racine, update et direct-npm. Le test de fumée de mise à jour utilise par défaut npm `latest` comme base stable avant de passer à l'archive candidate. Remplacez-le par `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` en local, ou avec l'entrée `update_baseline_version`GitHubnpm du workflow Install Smoke sur GitHub. Les vérifications de l'installeur non root maintiennent un cache npm isolé afin que les entrées de cache appartenant au root ne masquent pas le comportement d'installation local à l'utilisateur. Définissez `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache`npm pour réutiliser le cache root/update/direct-npm lors des exécutions locales répétées.
- La CI Install Smoke ignore la mise à jour globale direct-npm en double avec npm`OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` ; exécutez le script localement sans cette variable d'environnement lorsque la couverture directe `npm install -g` est nécessaire.
- Test de fumée CLI de suppression d'espace de travail partagé par les agents : CLI`pnpm test:docker:agents-delete-shared-workspace` (script : `scripts/e2e/agents-delete-shared-workspace-docker.sh`) construit par défaut l'image du Dockerfile racine, initialise deux agents avec un espace de travail dans un répertoire home de conteneur isolé, exécute `agents delete --json`, et vérifie le JSON valide ainsi que le comportement de l'espace de travail conservé. Réutilisez l'image install-smoke avec `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Réseau Gateway (deux conteneurs, auth WS + santé) : Gateway`pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Test de fumée de snapshot CDP du navigateur : `pnpm test:docker:browser-cdp-snapshot` (script : `scripts/e2e/browser-cdp-snapshot-docker.sh`) construit l'image E2E source plus une couche Chromium, démarre Chromium avec CDP brut, exécute `browser doctor --deep`, et vérifie que les snapshots de rôle CDP couvrent les URL des liens, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de frame.
- Régression de raisonnement minimal web_search des réponses OpenAI : OpenAI`pnpm test:docker:openai-web-search-minimal` (script : `scripts/e2e/openai-web-search-minimal-docker.sh`OpenAIGateway) exécute un serveur OpenAI simulé via le Gateway, vérifie que `web_search` déclenche `reasoning.effort` de `minimal` à `low`Gateway, force ensuite le rejet du schéma du provider et vérifie que les détails bruts apparaissent dans les journaux du Gateway.
- Pont de channel MCP (Gateway initialisé + pont stdio + test de fumée du cadre de notification brute de Claude) : Gateway`pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Outils MCP du bundle Pi (serveur MCP stdio réel + test de fumée d'autorisation/refus du profil Pi intégré) : `pnpm test:docker:pi-bundle-mcp-tools` (script : `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Nettoyage MCP Cron/subagent (Gateway réel + démontage de l'enfant MCP stdio après des tâches cron isolées et des exécutions de sous-agent ponctuelles) : Gateway`pnpm test:docker:cron-mcp-cleanup` (script : `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Plugins (test de fumée d'installation/mise à jour pour le chemin local, `file:`npmClawHub, le registre npm avec des dépendances hissées, les références git mouvantes, le kitchen-sink ClawHub, les mises à jour de la place de marché, et l'activation/inspection du bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)
  Définissez `OPENCLAW_PLUGINS_E2E_CLAWHUB=0`ClawHub pour ignorer le bloc ClawHub, ou remplacez la paire paquet/runtime par défaut du kitchen-sink par `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` et `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`. Sans `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`ClawHub, le test utilise un serveur de fixture ClawHub local hermétique.
- Test de fumée de mise à jour de plugin inchangée : `pnpm test:docker:plugin-update` (script : `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Plugin lifecycle matrix smoke: `pnpm test:docker:plugin-lifecycle-matrix`OpenClawnpmnpm installe l'archive tar d'OpenClaw empaquetée dans un conteneur nu, installe un plugin npm, active/désactive, effectue des mises à niveau et des rétrogradations via un registre npm local, supprime le code installé, puis vérifie que la désinstallation supprime toujours l'état obsolète tout en consignant les métriques RSS/CPU pour chaque phase du cycle de vie.
- Config reload metadata smoke: `pnpm test:docker:config-reload` (script : `scripts/e2e/config-reload-source-docker.sh`)
- Plugins : `pnpm test:docker:plugins` couvre le smoke test d'installation/de mise à jour pour le chemin local, `file:`npmClawHub, le registre npm avec dépendances hissées, les références git mobiles, les fixtures ClawHub, les mises à jour de la marketplace et l'activation/inspection des bundles Claude. `pnpm test:docker:plugin-update` couvre le comportement de mise à jour inchangée pour les plugins installés. `pnpm test:docker:plugin-lifecycle-matrix`npm couvre l'installation, l'activation, la désactivation, la mise à niveau, la rétrogradation et la désinstallation de code manquant pour les plugins npm suivis en tant que ressources.

Pour préconstruire et réutiliser manuellement l'image fonctionnelle partagée :

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Les redéfinitions d'image spécifiques aux suites, telles que `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`, priment toujours lorsqu'elles sont définies. Lorsque `OPENCLAW_SKIP_DOCKER_BUILD=1`Docker pointe vers une image partagée distante, les scripts la tirent si elle n'est pas déjà locale. Les tests Docker QR et d'installation conservent leurs propres Dockerfiles car ils valident le comportement de package/d'installation plutôt que le runtime de l'application construite partagée.

Les exécuteurs Docker de modèle live montent également en liaison l'extraction actuelle en lecture seule et la mettent en scène dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest par rapport à votre source/configuration locale exacte. L'étape de mise en scène ignore les caches locaux volumineux et les sorties de construction de l'application tels que Docker`.pnpm-store`, `.worktrees`, `__openclaw_vitest__`Docker`.build`, et les répertoires de sortie Gradle locaux à l'application afin que les exécutions Docker live ne passent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1`TelegramDiscord afin que les sondes live du Gateway ne démurrent pas de vrais workers de canal Telegram/Discord/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, faites donc passer `OPENCLAW_LIVE_GATEWAY_*`Docker également lorsque vous devez réduire ou exclure la couverture live du Gateway de cette voie Docker. `test:docker:openwebui`OpenClawOpenAI est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur Gateway OpenClaw avec les points de terminaison HTTP compatibles OpenAI activés, démarre un conteneur Open WebUI épinglé contre ce Gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une vraie demande de chat via le proxy `/api/chat/completions` d'Open WebUI. Définissez `OPENWEBUI_SMOKE_MODE=models`Docker pour les vérifications CI du chemin de publication qui doivent s'arrêter après la connexion et la découverte de modèle d'Open WebUI, sans attendre une complétion de modèle live. La première exécution peut être sensiblement plus lente car Docker peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie s'attend à une clé de modèle live utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir lors des exécutions Dockerisées. Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels`TelegramDiscordiMessageGateway est intentionnellement déterministe et n'a pas besoin d'un vrai compte Telegram, Discord ou iMessage. Il démarre un conteneur Gateway amorcé, démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversation acheminée, les lectures de transcription, les métadonnées de pièce jointe, le comportement de la file d'attente d'événements live, le routage d'envoi sortant et les notifications de canal + d'autorisation de style Claude sur le vrai pont MCP stdio. La vérification des notifications inspecte directement les trames MCP stdio brutes afin que le test de fumée valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à présenter. `test:docker:pi-bundle-mcp-tools`Docker est déterministe et n'a pas besoin d'une clé de modèle live. Il construit l'image Docker du dépôt, démarre un vrai serveur de sonde MCP stdio à l'intérieur du conteneur, matérialise ce serveur via le runtime MCP du bundle Pi intégré, exécute l'outil, puis vérifie que `coding` et `messaging` gardent les outils `bundle-mcp` tandis que `minimal` et `tools.deny: ["bundle-mcp"]` les filtrent. `test:docker:cron-mcp-cleanup`Gateway est déterministe et n'a pas besoin d'une clé de modèle live. Il démarre un Gateway amorcé avec un vrai serveur de sonde MCP stdio, exécute un tour cron isolé et un tour enfant ponctuel `/subagents spawn`, puis vérifie que le processus enfant MCP se termine après chaque exécution.

Test de fumée de fil en langage clair ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Gardez ce script pour les workflows de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils ACP, alors ne le supprimez pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` pour vérifier uniquement les variables d'environnement sourcées depuis `OPENCLAW_PROFILE_FILE`CLI, en utilisant des répertoires de config/workspace temporaires et aucun montage d'auth CLI externe
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global`CLIDocker pour les installations CLI mises en cache à l'intérieur de Docker
- Les répertoires/fichiers d'auth CLI externes sous CLI`$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions de fournisseur restreintes ne montent que les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les fournisseurs dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les réexécutions qui ne nécessitent pas de reconstruction
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du magasin de profils (pas de l'env)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le modèle exposé par la Gateway pour le test de fumée Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification de nonce utilisée par le test de fumée Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer la balise d'image épinglée Open WebUI

## Cohérence de la documentation

Exécutez les vérifications de documentation après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûre pour CI)

Ce sont des régressions de « vrai pipeline » sans vrais fournisseurs :

- Appel de tool Gateway (OpenAI simulé, vraie boucle gateway + agent) : GatewayOpenAI`src/gateway/gateway.test.ts`OpenAI (cas : « exécute un appel tool OpenAI simulé de bout en bout via la boucle de l'agent gateway »)
- Assistant Gateway (WS Gateway`wizard.start`/`wizard.next`, écrit la config + auth forcée) : `src/gateway/gateway.test.ts` (cas : « exécute l'assistant via ws et écrit la config du jeton d'auth »)

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Appel de tool simulé via la vraie boucle gateway + agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les Skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les Skills sont répertoriés dans l'invite, l'agent choisit-il la bonne skill (ou évite-t-il celles non pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios à plusieurs tours qui affirment l'ordre des tools, le report de l'historique de session et les limites du bac à sable.

Les futures évaluations doivent d'abord rester déterministes :

- Un exécuteur de scénario utilisant des fournisseurs simulés pour affirmer les appels de tools + l'ordre, les lectures de fichiers de skills et le câblage de session.
- Une petite suite de scénarios axés sur les skills (utilisation vs évitement, limitation, injection d'invite).
- Évaluations en direct optionnelles (opt-in, restreintes par env) uniquement après la mise en place de la suite sûre pour CI.

## Tests de contrat (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son contrat d'interface. Ils parcourent tous les plugins découverts et exécutent une suite d'assertions sur la forme et le comportement. La `pnpm test` unit lane par défaut omet intentionnellement ces fichiers communs de jointure et de fumée ; exécutez les commandes de contrat explicitement lorsque vous touchez aux surfaces partagées du channel ou du provider.

### Commandes

- Tous les contrats : `pnpm test:contracts`
- Contrats de channel uniquement : `pnpm test:contracts:channels`
- Contrats de provider uniquement : `pnpm test:contracts:plugins`

### Contrats de channel

Situés dans `src/channels/plugins/contracts/*.contract.test.ts` :

- **plugin** - Forme de base du plugin (id, nom, capacités)
- **setup** - Contrat de l'assistant de configuration
- **session-binding** - Comportement de liaison de session
- **outbound-payload** - Structure de la charge utile du message
- **inbound** - Gestion des messages entrants
- **actions** - Gestionnaires d'actions de channel
- **threading** - Gestion de l'ID de fil de discussion
- **directory** - API de répertoire/liste API
- **group-policy** - Application de la stratégie de groupe

### Contrats de statut de provider

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - sondes de statut du channel
- **registry** - Forme du registre de plugins

### Contrats de provider

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection d'authentification
- **catalog** - API du catalogue de modèles API
- **discovery** - Découverte de plugins
- **loader** - Chargement de plugins
- **runtime** - Runtime du provider
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exportations ou les sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de channel ou de provider
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests de contrat s'exécutent dans CI et ne nécessitent pas de vraies clés API.

## Ajout de régressions (recommandations)

Lorsque vous corrigez un problème de provider/model découvert en live :

- Ajoutez si possible une régression compatible CI (provider simulé/bouchonné, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement uniquement en live (limites de débit, stratégies d'auth), gardez le test live étroit et opt-in via des env vars
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bug de conversion/relecture de requête provider → test direct des modèles
  - bug de pipeline session/historique/tool de la passerelle → test de fumée live de la passerelle ou test simulé de passerelle sûr pour la CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les ids d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les ids de cibles non classifiés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.

## Connexes

- [Tests en direct](/fr/help/testing-live)
- [Tests des mises à jour et des plugins](/fr/help/testing-updates-plugins)
- [CI](/fr/ci)
