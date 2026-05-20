---
summary: "DockerKit de tests : suites unit/e2e/live, runners Docker et ce que couvre chaque test"
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
**La pile QA (qa-lab, qa-channel, voies de transport en direct)** est documentée séparément :

- [Vue d'ensemble de la QA](/fr/concepts/qa-e2e-automationMatrix) - architecture, surface de commande, rédaction de scénarios.
- [QA Matrix](/fr/concepts/qa-matrix) - référence pour `pnpm openclaw qa matrix`.
- [Canal QA](/fr/channels/qa-channelDocker) - le plugin de transport synthétique utilisé par les scénarios basés sur le dépôt.

Cette page traite de l'exécution des suites de tests régulières et des runners Docker/Parallels. La section sur les runners spécifiques à la QA ci-dessous ([Runners spécifiques à la QA](#qa-specific-runners)) liste les invocations concrètes de `qa` et renvoie aux références ci-dessus.

</Note>

## Quick start

La plupart des jours :

- Passerelle complète (attendue avant le push) : `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Exécution locale plus rapide de la suite complète sur une machine puissante : `pnpm test:max`
- Boucle de surveillance directe Vitest : `pnpm test:watch`
- Le ciblage direct de fichiers route désormais également les chemins d'extension/de canal : `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Privilégiez d'abord les exécutions ciblées lorsque vous itérez sur un seul échec.
- Site QA avec support Docker : Docker`pnpm qa:lab:up`
- Voie QA avec support VM Linux : Linux`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Lorsque vous modifiez des tests ou souhaitez une confiance supplémentaire :

- Passerelle de couverture : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de vrais providers/modèles (nécessite de vrais identifiants) :

- Suite Live (modèles + sondes d'outil/image de passerelle) : `pnpm test:live`
- Cibler un fichier live en silence : `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Rapports de performance d'exécution : dispatchez `OpenClaw Performance` avec
  `live_openai_candidate=true` pour un tour d'agent `openai/gpt-5.5` réel ou
  `deep_profile=true` pour les artefacts de trace, de tas et de CPU de Kova. Les exécutions planifiées quotidiennes
  publient les artefacts des voies mock-provider, deep-profile et GPT 5.5 vers
  `openclaw/clawgrit-reports` lorsque `CLAWGRIT_REPORTS_TOKEN` est configuré. Le
  rapport du mock-provider inclut également les chiffres de démarrage du CLI, du démarrage de la passerelle au niveau source, de la mémoire,
  de la pression des plugins, et de la boucle de salutation hello-loop avec fake-model répétée.
- Balayage de modèle en direct Docker : `pnpm test:docker:live-models`
  - Chaque modèle sélectionné exécute désormais un tour de texte plus une petite sonde de type lecture de fichier.
    Les modèles dont les métadonnées annoncent une entrée `image` exécutent également un minuscule tour d'image.
    Désactivez les sondes supplémentaires avec `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` ou
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` lors de l'isolement des pannes de fournisseur.
  - Couverture CI : le `OpenClaw Scheduled Live And E2E Checks` quotidien et le
    `OpenClaw Release Checks` manuel appellent tous deux le workflow réutilisable live/E2E avec
    `include_live_suites: true`, qui inclut des travaux de matrice distincts pour les modèles en direct Docker
    partitionnés par fournisseur.
  - Pour des réexécutions CI ciblées, dispatchez `OpenClaw Live And E2E Checks (Reusable)`
    avec `include_live_suites: true` et `live_models_only: true`.
  - Ajoutez de nouveaux secrets de fournisseur à signal élevé à `scripts/ci-hydrate-live-auth.sh`
    ainsi qu'à `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` et ses
    appelants planifiés/release.
- Test de fumée de chat lié Codex natif : `pnpm test:docker:live-codex-bind`
  - Exécute une voie en direct Docker sur le chemin du serveur d'application Codex, lie un
    Slack DM synthétique avec `/codex bind`, exerce `/codex fast` et
    `/codex permissions`, puis vérifie qu'une réponse simple et une pièce jointe d'image
    passent par la liaison native du plugin au lieu de l'ACP.
- Test de fumée du harnais de serveur d'application Codex : `pnpm test:docker:live-codex-harness`
  - Exécute les tours de l'agent passerelle via le harnais app-server Codex propriétaire du plugin,
    vérifie `/codex status` et `/codex models`, et par défaut teste image,
    cron MCP, sub-agent, et les sondes Guardian. Désactivez la sonde sub-agent avec
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` lors de l'isolement d'autres échecs du
    app-server Codex. Pour une vérification ciblée du sub-agent, désactivez les autres sondes :
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    Ceci s'arrête après la sonde sub-agent à moins que
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0` ne soit défini.
- Test de fumée de l'installation à la demande de Codex : `pnpm test:docker:codex-on-demand`
  - Installe l'archive tar OpenClaw empaquetée dans Docker, exécute l'onboarding
    de la clé OpenAI API, et vérifie que le plugin Codex ainsi que la dépendance
    `@openai/codex` ont été téléchargés à la demande dans la racine npm gérée.
- Test de fumée de la dépendance d'outil de plugin en direct : `pnpm test:docker:live-plugin-tool`
  - Empaquette un plugin de test avec une dépendance `slugify` réelle, l'installe via
    `npm-pack:`, vérifie la dépendance sous la racine npm gérée, puis demande à un
    model OpenAI en direct d'appeler l'outil du plugin et de retourner le slug masqué.
- Test de fumée de la commande de secours Crestodian : `pnpm test:live:crestodian-rescue-channel`
  - Vérification de sécurité supplémentaire (opt-in) pour la surface de commande de secours
    du message-channel. Elle exécute `/crestodian status`, met en file un changement de model
    persistant, répond `/crestodian yes`, et vérifie le chemin d'écriture d'audit/config.
- Test de fumée du planificateur Crestodian Docker : `pnpm test:docker:crestodian-planner`
  - Exécute Crestodian dans un conteneur sans configuration avec un faux CLI Claude sur `PATH`
    et vérifie que le repli du planificateur approximatif se traduit par une écriture de configuration
    typée et auditée.
- Test de fumée de la première exécution Crestodian Docker : `pnpm test:docker:crestodian-first-run`
  - Commence à partir d'un répertoire d'état OpenClaw vide, achemine OpenClaw`openclaw` nu vers
    Crestodian, applique l'écriture de la configuration/modele/agent/plugin Discord + SecretRef,
    valide la configuration et vérifie les entrées d'audit. Le même chemin de configuration Ring 0 est
    également couvert dans le QA Lab par
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup`.
- Test de coût Moonshot/Kimi : avec `MOONSHOT_API_KEY` défini, exécutez
  `openclaw models list --provider moonshot --json`, puis exécutez un `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  isolé contre `moonshot/kimi-k2.6`. Vérifiez que le JSON rapporte Moonshot/K2.6 et que
  la transcription de l'assistant stocke le `usage.cost` normalisé.

<Tip>Lorsque vous n'avez besoin que d'un cas d'échec, préférez restreindre les tests en direct via les env vars de la liste d'autorisation décrits ci-dessous.</Tip>

## Runners spécifiques QA

Ces commandes se situent à côté des principales suites de tests lorsque vous avez besoin de réalisme de laboratoire QA :

CI exécute QA Lab dans des workflows dédiés. La parité agentic est imbriquée sous
`QA-Lab - All Lanes` et la validation de version, et non dans un workflow de PR autonome.
Une validation large doit utiliser `Full Release Validation` avec
`rerun_group=qa-parity`Docker ou le groupe QA release-checks. Les vérifications de version stables/défaut gardent
un soak exhaustif live/Docker derrière `run_release_soak=true` ; le
profil `full` force le soak. `QA-Lab - All Lanes`
s'exécute nightly sur `main` et depuis un déclenchement manuel avec le volet de parité simulée, le
volet live Matrix, le volet live Telegram géré par Convex, et le volet live Discord géré par Convex
comme travaux parallèles. Les QA planifiés et les vérifications de version passent le Matrix
`--profile fast` explicitement, alors que le Matrix CLI et l'entrée du workflow manuel restent
par défaut `all` ; le déclenchement manuel peut diviser `all` en `transport`,
`media`, `e2ee-smoke`, `e2ee-deep`, et `e2ee-cli` travaux. `OpenClaw Release
Checks` exécute la parité ainsi que les volets rapides Matrix et Telegram avant l'approbation de
la version, en utilisant `mock-openai/gpt-5.5` pour les vérifications de transport de version afin qu'elles restent déterministes et évitent le démarrage normal des plugins de fournisseur. Ces passerelles de transport live désactivent la recherche de mémoire ; le comportement de la mémoire reste couvert par les suites de parité QA.

Les shards de médias live complets pour la version utilisent
`ghcr.io/openclaw/openclaw-live-media-runner:ubuntu-24.04`, qui possède déjà
`ffmpeg` et `ffprobe`. Les shards live de modèle/backend Docker utilisent l'image partagée
`ghcr.io/openclaw/openclaw-live-test:<sha>` construite une fois par commit
sélectionné, puis la tirent avec `OPENCLAW_SKIP_DOCKER_BUILD=1` au lieu de la reconstruire
à l'intérieur de chaque shard.

- `pnpm openclaw qa suite`
  - Exécute les scénarios QA basés sur le dépôt directement sur l'hôte.
  - Exécute plusieurs scénarios sélectionnés en parallèle par défaut avec des
    workers de passerelle isolés. `qa-channel` a une concurrence par défaut de 4 (limitée par le
    nombre de scénarios sélectionnés). Utilisez `--concurrency <count>` pour ajuster le nombre
    de workers, ou `--concurrency 1` pour l'ancienne voie série.
  - Se termine avec un code non-zéro si un scénario échoue. Utilisez `--allow-failures` lorsque vous
    souhaitez des artefacts sans code de sortie en échec.
  - Prend en charge les modes de provider `live-frontier`, `mock-openai` et `aimock`.
    `aimock` démarre un serveur provider local soutenu par AIMock pour une couverture
    expérimentale de fixtures et de mocks de protocole sans remplacer la voie
    `mock-openai` consciente des scénarios.
- `pnpm test:plugins:kitchen-sink-live`
  - Exécute le gauntlet du plugin Kitchen Sink en direct OpenAI via QA Lab. Il
    installe le package externe Kitchen Sink, vérifie l'inventaire de surface du SDK de plugin,
    sonde `/healthz` et `/readyz`, enregistre les preuves CPU/RSS
    de la passerelle, exécute un tour en direct OpenAI et vérifie les diagnostics contradictoires.
    Nécessite une authentification live OpenAI telle que `OPENAI_API_KEY`. Dans les sessions Testbox
    hydratées, il sourç automatiquement le profil live-auth Testbox lorsque le
    helper `openclaw-testbox-env` est présent.
- `pnpm test:gateway:cpu-scenarios`
  - Exécute le banc de démarrage de la passerelle plus un petit pack de scénarios simulés QA Lab
    (`channel-chat-baseline`, `memory-failure-fallback`,
    `gateway-restart-inflight-run`) et écrit un résumé combiné d'observations
    CPU sous `.artifacts/gateway-cpu-scenarios/`.
  - Signale par défaut uniquement les observations CPU chaudes soutenues (`--cpu-core-warn`
    plus `--hot-wall-warn-ms`), de sorte que les courtes poussées de démarrage sont enregistrées comme métriques
    sans ressembler à la régression de blocage de passerelle de plusieurs minutes.
  - Utilise les artefacts `dist` construits ; lancez d'abord une build lorsque le checkout ne
    possède pas déjà une sortie d'exécution fraîche.
- `pnpm openclaw qa suite --runner multipass`
  - Exécute la même suite QA dans une machine virtuelle Linux Multipass jetable.
  - Conserve le même comportement de sélection de scénarios que `qa suite` sur l'hôte.
  - Réutilise les mêmes indicateurs de sélection de provider/model que `qa suite`.
  - Les exécutions Live transmettent les entrées d'auth QA prises en charge qui sont pratiques pour l'invité :
    les clés de provider basées sur env, le chemin de configuration du provider QA live, et `CODEX_HOME`
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
  - Utilisez `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` pour exécuter la même voie d'installation packagée
    avec Discord.
- `pnpm test:docker:session-runtime-context`
  - Exécute un smoke déterministe de l'application intégrée via Docker pour les transcripts de contexte d'exécution intégrés. Il vérifie que le contexte d'exécution caché de OpenClaw est conservé sous forme de message personnalisé non affiché au lieu de fuir dans le tour utilisateur visible, puis insère un JSONL de session cassée affectée et vérifie que
    `openclaw doctor --fix` le réécrit vers la branche active avec une sauvegarde.
- `pnpm test:docker:npm-telegram-live`
  - Installe un candidat de paquet OpenClaw dans Docker, exécute l'onboarding du paquet installé, configure Telegram via le CLI installé, puis réutilise le voie QA Telegram en direct avec ce paquet installé en tant que Gateway du SUT.
  - Le wrapper monte uniquement la source du harnais `qa-lab` depuis l'extraction ; le
    package installé possède `dist`, `openclaw/plugin-sdk` et le runtime du plugin groupé
    de sorte que la voie ne mélange pas les plugins de l'extraction actuelle dans le package
    testé.
  - Par défaut `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta` ; définissez
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` ou
    `OPENCLAW_CURRENT_PACKAGE_TGZ` pour tester un tarball local résolu au lieu de
    l'installer depuis le registre.
  - Utilise les mêmes informations d'identification env Telegram ou la source d'informations d'identification Convex que
    `pnpm openclaw qa telegram`. Pour l'automatisation CI/release, définissez
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` plus
    `OPENCLAW_QA_CONVEX_SITE_URL` et le secret de rôle. Si
    `OPENCLAW_QA_CONVEX_SITE_URL` et un secret de rôle Convex sont présents dans CI,
    le wrapper Docker sélectionne automatiquement Convex.
  - Le wrapper valide les informations d'identification env Telegram ou Convex sur l'hôte avant
    le travail de construction/installation Docker. Définissez `OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1`
    uniquement lors du débogage délibéré de la configuration pré-information d'identification.
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` remplace le `OPENCLAW_QA_CREDENTIAL_ROLE` partagé
    pour cette voie uniquement.
  - GitHub Actions expose cette voie sous le nom de workflow manuel du mainteneur
    `NPM Telegram Beta E2E`. Il ne s'exécute pas lors de la fusion. Le workflow utilise l'environnement
    `qa-live-shared` et les baux d'identifiants CI Convex.
- GitHub Actions expose également `Package Acceptance` pour la preuve de produit parallèle
  contre un package candidat. Il accepte une référence de confiance, une spec npm publiée,
  une URL d'archive tar HTTPS plus SHA-256, ou un artefact d'archive tar d'une autre exécution, télécharge
  le `openclaw-current.tgz` normalisé sous le nom `package-under-test`, puis exécute le
  planificateur E2E Docker existant avec les profils de voie smoke, package, product, full ou custom.
  Définissez `telegram_mode=mock-openai` ou `live-frontier` pour exécuter le
  workflow QA Telegram contre le même artefact `package-under-test`.
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
    `openclaw update --tag <candidate>`, et vérifie que le médecin post-mise à jour du candidat nettoie les débris de dépendance de plugin hérités sans
    réparation postinstall du côté du harnais.
- `pnpm test:parallels:npm-update`
  - Exécute le test de fumée de mise à jour d'installation packagée native sur les invités Parallels. Chaque
    plateforme sélectionnée installe d'abord le package de base de référence demandé, puis exécute
    la commande `openclaw update` installée sur le même invité et vérifie la
    version installée, l'état de la mise à jour, la disponibilité de la passerelle et un tour d'agent
    local.
  - Utilisez `--platform macos`, `--platform windows` ou `--platform linux` tout en
    itérant sur un invité. Utilisez `--json` pour le chemin de l'artefact récapitulatif et
    l'état par voie.
  - La voie OpenAI utilise `openai/gpt-5.5` pour la preuve de tour d'agent en direct par
    défaut. Passez `--model <provider/model>` ou définissez
    `OPENCLAW_PARALLELS_OPENAI_MODEL` lors de la validation délibérée d'un autre
    model OpenAI.
  - Encadrez les exécutions locales longues avec un délai d'attente de l'hôte pour que les blocages du transport Parallels ne puissent pas consommer le reste de la fenêtre de tests :

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - Le script écrit des journaux de voie imbriqués sous `/tmp/openclaw-parallels-npm-update.*`.
    Inspectez `windows-update.log`, `macos-update.log` ou `linux-update.log`
    avant de supposer que le wrapper externe est bloqué.
  - La mise à jour Windows peut passer 10 à 15 minutes dans le travail de diagnostic et de mise à jour des packages sur un invité à froid ; cela est encore sain lorsque le journal de debug npm imbriqué progresse.
  - N'exécutez pas cet enveloppeur agrégé en parallèle avec les voies de test de fumée Parallels macOS, Windows ou Linux individuelles. Elles partagent l'état de la machine virtuelle et peuvent entrer en collision lors de la restauration d'instantané, de la diffusion de packages ou de l'état de la passerelle de l'invité.
  - La preuve de post-mise à jour exécute la surface normale du plugin groupé car les façades de fonctionnalités telles que la reconnaissance vocale, la génération d'images et la compréhension des médias sont chargées via les API d'exécution groupées, même lorsque le tour d'agent lui-même ne vérifie qu'une réponse textuelle simple.

- `pnpm openclaw qa aimock`
  - Démarre uniquement le serveur de fournisseur AIMock local pour le test de fumée direct du protocole.
- `pnpm openclaw qa matrix`
  - Exécute la voie QA live Matrix sur un serveur domestique Tuwunel éphémère soutenu par Docker. Réservé au checkout source - les installations empaquetées n'incluent pas `qa-lab`.
  - CLI complet, catalogue de profils/scénarios, env vars et disposition des artefacts : [Matrix QA](/fr/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Exécute la voie QA en direct Telegram contre un groupe privé réel en utilisant les jetons de bot du pilote et du SUT provenant de l'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. L'identifiant de groupe doit être l'identifiant de chat numérique Telegram.
  - Prend en charge `--credential-source convex` pour les identifiants partagés en pool. Utilise le mode env par défaut, ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` pour opter pour les baux en pool.
  - Les valeurs par défaut couvrent canary, mention gating, addressing de commande, `/status`, les réponses mentionnées bot-à-bot et les réponses de commandes natives principales. Les valeurs par défaut `mock-openai` couvrent également les régressions de chaîne de réponse déterministe et le streaming de message final Telegram. Utilisez `--list-scenarios` pour des sondes facultatives telles que `session_status`.
  - Sort avec un code non nul si un scénario échoue. Utilisez `--allow-failures` lorsque vous
    souhaitez des artefacts sans code de sortie d'échec.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable bot-à-bot, activez le mode de communication Bot-to-Bot dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact des messages observés sous `.artifacts/qa-e2e/...`. Les scénarios de réponse incluent le RTT de la demande d'envoi du pilote à la réponse observée du SUT.

`Mantis Telegram Live` est le wrapper de preuves pour PR autour de cette voie. Il exécute la référence candidate avec les identifiants Telegram loués via Convex, rend la transcription des messages observés expurgés dans un navigateur de bureau Crabbox, enregistre une preuve MP4, génère un GIF rogné par mouvement, télécharge le bundle d'artefacts et publie des preuves en ligne dans la PR via l'application Mantis GitHub lorsque `pr_number` est défini. Les mainteneurs peuvent le démarrer depuis l'interface Actions via `Mantis Scenario` (`scenario_id:
telegram-live`) ou directement depuis un commentaire de demande de tirage :

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` est le wrapper d'agent natif avant/après pour Telegram Desktop, destiné à la preuve visuelle de PR. Démarrez-le depuis l'interface Actions avec des `instructions` libres, via `Mantis Scenario` (`scenario_id:
telegram-desktop-proof`), ou depuis un commentaire de PR :

```text
@openclaw-mantis telegram desktop proof
```

L'agent Mantis lit la PR, décide quel comportement visible sur Telegram prouve le changement, exécute la voie de preuve Crabbox Telegram Desktop utilisateur réel sur les références de base et candidates, itère jusqu'à ce que les GIF natifs soient utiles, écrit un manifeste `motionPreview` couplé et publie le même tableau GIF à 2 colonnes via l'application Mantis GitHub lorsque `pr_number` est défini.

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - Loue ou réutilise un bureau Crabbox Linux, installe le bureau natif Telegram Desktop, configure OpenClaw avec un jeton de bot SUT Telegram loué, démarre la passerelle et enregistre des preuves de capture d'écran/MP4 depuis le bureau VNC visible.
  - Par défaut, il utilise `--credential-source convex` afin que les workflows n'aient besoin que du secret du courtier Convex. Utilisez `--credential-source env` avec les mêmes variables `OPENCLAW_QA_TELEGRAM_*` que `pnpm openclaw qa telegram`.
  - Telegram Desktop a toujours besoin d'une connexion/profil utilisateur. Le jeton de bot configure uniquement OpenClaw. Utilisez `--telegram-profile-archive-env <name>` pour une archive de profil `.tgz` en base64, ou utilisez `--keep-lease` et connectez-vous manuellement une fois via VNC.
  - Écrit `mantis-telegram-desktop-builder-report.md`, `mantis-telegram-desktop-builder-summary.json`, `telegram-desktop-builder.png` et `telegram-desktop-builder.mp4` dans le répertoire de sortie.

Les voies de transport en direct partagent un contrat standard afin que les nouveaux transports ne dérivent pas ; la matrice de couverture par voie se trouve dans [QA overview → Live transport coverage](/fr/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` est la suite synthétique large et ne fait pas partie de cette matrice.

### Identifiants Telegram partagés via Convex (v1)

Lorsque `--credential-source convex` (ou `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) est activé pour la QA du transport en direct, le laboratoire de QA acquiert un bail exclusif depuis un pool alimenté par Convex, envoie un signal de présence (heartbeat) sur ce bail pendant que la voie est en cours d'exécution, et libère le bail à l'arrêt. Le nom de la section précède le support de Discord, Slack et WhatsApp ; le contrat de bail est partagé entre les différents types.

Référence de l'échafaudage de projet Convex :

- `qa/convex-credential-broker/`

Variables d'environnement requises :

- `OPENCLAW_QA_CONVEX_SITE_URL` (par exemple `https://your-deployment.convex.site`)
- Un secret pour le rôle sélectionné :
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` pour `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` pour `ci`
- Sélection du rôle d'identifiants :
  - CLI : `--credential-role maintainer|ci`
  - Env par défaut : `OPENCLAW_QA_CREDENTIAL_ROLE` (vaut `ci` par défaut dans CI, `maintainer` sinon)

Variables d'environnement optionnelles :

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (défaut `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (défaut `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (défaut `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (défaut `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (défaut `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de trace optionnel)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permet les URL de bouclage (loopback) `http://` Convex pour un développement uniquement local.

`OPENCLAW_QA_CONVEX_SITE_URL` devrait utiliser `https://` en fonctionnement normal.

Les commandes d'administration du mainteneur (pool add/remove/list) nécessitent `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` spécifiquement.

Aides CLI pour les responsables :

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Utilisez `doctor` avant les exécutions en direct pour vérifier l'URL du site Convex, les secrets du courtier, le préfixe de point de terminaison, le délai d'attente HTTP et l'accessibilité de la liste d'administration sans imprimer les valeurs secrètes. Utilisez `--json` pour une sortie lisible par machine dans les scripts et les utilitaires CI.

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
  - Succès : `{ status: "ok" }` (ou vide `2xx`)
- `POST /release`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Succès : `{ status: "ok" }` (ou vide `2xx`)
- `POST /admin/add` (secret de mainteneur uniquement)
  - Requête : `{ kind, actorId, payload, note?, status? }`
  - Succès : `{ status: "ok", credential }`
- `POST /admin/remove` (secret de mainteneur uniquement)
  - Requête : `{ credentialId, actorId }`
  - Succès : `{ status: "ok", changed, credential }`
  - Garantie de bail actif : `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (secret de mainteneur uniquement)
  - Requête : `{ kind?, status?, includePayload?, limit? }`
  - Succès : `{ status: "ok", credentials, count }`

Structure de la charge utile pour le type Telegram :

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` doit être une chaîne d'identifiant de chat Telegram numérique.
- `admin/add` valide cette forme pour `kind: "telegram"` et rejette les charges utiles malformées.

Structure de la charge utile pour le type réel d'utilisateur Telegram :

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`, `testerUserId` et `telegramApiId` doivent être des chaînes numériques.
- `tdlibArchiveSha256` et `desktopTdataArchiveSha256` doivent être des chaînes hexadécimales SHA-256.
- `kind: "telegram-user"` est réservé pour le flux de travail de preuve Mantis Telegram Desktop. Les voies QA Lab génériques ne doivent pas l'acquérir.

Payloads multi-canal validés par le courtier :

- Discord : Discord : `{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp : WhatsApp : `{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Les voies Slack peuvent également louer depuis le pool, mais la validation des payloads Slack réside actuellement dans le runner QA Slack plutôt que dans le courtier. Utilisez `{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }` pour les lignes Slack.

### Ajouter un canal à QA

L'architecture et les noms des assistants de scénario pour les nouveaux adaptateurs de canal se trouvent dans [Aperçu QA → Ajouter un canal](/fr/concepts/qa-e2e-automation#adding-a-channel). Le minimum requis : implémenter le runner de transport sur le seam d'hôte partagé `qa-lab`, déclarer `qaRunners` dans le manifeste du plugin, monter en tant que `openclaw qa <runner>`, et rédiger des scénarios sous `qa/scenarios/`.

## Suites de tests (ce qui s'exécute où)

Pensez aux suites comme à un « réalisme croissant » (et à une instabilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Config : les exécutions non ciblées utilisent l'ensemble de shards `vitest.full-*.config.ts` et peuvent étendre les shards multi-projets en configurations par projet pour la planification parallèle
- Fichiers : inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts` et `test/**/*.test.ts` ; les tests unitaires UI s'exécutent dans le shard dédié `unit-ui`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en processus (auth passerelle, routage, outils, analyse, config)
  - Régressions déterministes pour les bogues connus
- Attentes :
  - S'exécute dans CI
  - Aucune clé réelle requise
  - Doit être rapide et stable
  - Les tests de résolveur et de chargeur de surface publique doivent prouver un large comportement de repli `api.js` et `runtime-api.js` avec des fixtures de minuscules plugins générés, et non les vraies API sources de plugins empaquetés. Les vrais chargements d'API de plugin appartiennent aux suites de contrat/intégration propres aux plugins.

Politique de dépendance native :

- Les installations de test par défaut ignorent les constructions natives optionnelles d'opus Discord. La réception vocale Discord utilise le décodeur pure-JS `opusscript`, et `@discordjs/opus` reste désactivé dans `allowBuilds` afin que les tests locaux et les voies Testbox ne compilent pas l'addon natif.
- Utilisez une voie dédiée aux performances vocales ou en direct Discord si vous avez besoin de comparer une construction native d'opus. Ne définissez pas `@discordjs/opus` sur `true` dans le `allowBuilds` par défaut ; cela ferait compiler du code natif lors des boucles d'installation/test sans rapport.

<AccordionGroup>
  <Accordion title="Projets, shards et volets délimités">

    - `pnpm test` non ciblé exécute douze configurations de shard plus petites (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus géant de projet racine natif. Cela réduit le RSS de pointe sur les machines chargées et évite que le travail de réponse automatique/d'extension ne prive les suites non liées.
    - `pnpm test --watch` utilise toujours le graphe de projet racine natif `vitest.config.ts`, car une boucle de surveillance multi-shard n'est pas pratique.
    - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent d'abord les cibles de fichiers/répertoires explicites via des volets délimités, de sorte que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
    - `pnpm test:changed` développe les chemins git modifiés en volets délimités peu coûteux par défaut : modifications directes de tests, fichiers `*.test.ts` frères, mappages de source explicites et dépendants du graphe d'importation local. Les modifications de configuration/d'installation/package n'exécutent pas des tests étendus sauf si vous utilisez explicitement `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed` est la passerelle de contrôle locale intelligente normale pour les travaux étroits. Il classe la différence en core, tests core, extensions, tests d'extension, applications, documentation, métadonnées de publication, outil Docker en direct, et outil, puis exécute les commandes typecheck, lint et guard correspondantes. Il n'exécute pas les tests Vitest ; appelez `pnpm test:changed` ou un `pnpm test <target>` explicite pour la preuve de test. Les incrémentations de version uniquement pour les métadonnées de publication exécutent des vérifications ciblées de version/config/root-dependency, avec une garde qui rejette les modifications de package en dehors du champ de version de niveau supérieur.
    - Les modifications du harnais ACP Docker en direct exécutent des vérifications ciblées : syntaxe shell pour les scripts d'authentification Docker en direct et un essai à sec du planificateur Docker en direct. Les modifications `package.json` ne sont incluses que lorsque la différence est limitée à `scripts["test:docker:live-*"]` ; les modifications de dépendance, d'exportation, de version et d'autres éditions de surface de package utilisent toujours les gardes plus larges.
    - Les tests unitaires légers en importation des agents, commandes, plugins, assistants de réponse automatique, `plugin-sdk` et zones utilitaires pures similaires passent par le volet `unit-fast`, qui saute `test/setup-openclaw-runtime.ts` ; les fichiers lourds avec état/runtime restent sur les volets existants.
    - Certains fichiers source assistants `plugin-sdk` et `commands` sélectionnés mappent également les exécutions en mode modifié à des tests frères explicites dans ces volets légers, afin que les modifications d'assistants évitent de réexécuter la suite lourde complète pour ce répertoire.
    - `auto-reply` a des compartiments dédiés pour les assistants de niveau supérieur, les tests d'intégration `reply.*` de niveau supérieur, et le sous-arbre `src/auto-reply/reply/**`. Le CI divise davantage le sous-arbre de réponse en shards agent-runner, dispatch et commands/state-routing afin qu'un compartiment lourd en importations ne possède pas la totalité de la file d'attente Node.
    - Le CI PR/main normal ignore intentionnellement le balayage par lots d'extension et le shard `agentic-plugins` réservé aux publications. La validation complète de la publication dispatche le workflow enfant séparé `Plugin Prerelease` pour ces suites lourdes en plugins/extensions sur les candidats à la publication.

  </Accordion>

  <Accordion title="Couverture du runner intégré">

    - Lorsque vous modifiez les entrées de découverte de message-tool ou le contexte d'exécution de la compaction, maintenez les deux niveaux de couverture.
    - Ajoutez des régressions d'assistant ciblées pour les limites de routage pur et de normalisation.
    - Maintenez les suites d'intégration du runner intégré en bonne santé :
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` et
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
    - Ces suites vérifient que les identifiants délimités et le comportement de compaction circulent toujours à travers les vrais chemins `run.ts` / `compact.ts` ; les tests basés uniquement sur les assistants ne sont pas un substitut suffisant à ces chemins d'intégration.

  </Accordion>

  <Accordion title="Pool Vitest et paramètres d'isolement par défaut">

    - La configuration de base de Vitest est réglée par défaut sur `threads`.
    - La configuration partagée de Vitest fixe `isolate: false` et utilise le runner non isolé dans les configurations des projets racine, e2e et live.
    - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute également sur le runner partagé non isolé.
    - Chaque shard `pnpm test` hérite des mêmes paramètres par défaut `threads` + `isolate: false` de la configuration partagée Vitest.
    - `scripts/run-vitest.mjs` ajoute `--no-maglev` pour les processus enfants Node de Vitest par défaut afin de réduire l'impact de la compilation V8 lors des grandes exécutions locales.
      Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` pour comparer avec le comportement standard de V8.

  </Accordion>

  <Accordion title="Itération locale rapide">

    - `pnpm changed:lanes` indique quelles voies architecturales sont déclenchées par une diff.
    - Le hook de pré-commit ne s'occupe que du formatage. Il remet les fichiers formatés dans l'index
      et n'exécute pas le linting, le typecheck ou les tests.
    - Exécutez `pnpm check:changed` explicitement avant le transfert ou le push lorsque vous
      avez besoin de la porte de vérification intelligente locale.
    - `pnpm test:changed` route par défaut via des voies délimitées peu coûteuses. Utilisez
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` uniquement lorsque l'agent
      décide qu'une modification du harnais, de la configuration, du package ou du contrat nécessite vraiment une couverture
      Vitest plus large.
    - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement
      de routage, mais avec une capacité de workers plus élevée.
    - L'autoscaling local des workers est intentionnellement prudent et se désactive
      lorsque la charge moyenne de l'hôte est déjà élevée, afin que plusieurs exécutions
      Vitest simultanées causent moins de dégâts par défaut.
    - La configuration de base Vitest marque les fichiers de projets/configuration comme
      `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage
      des tests change.
    - La configuration conserve `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes
      pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous voulez
      un emplacement de cache explicite pour le profilage direct.

  </Accordion>

  <Accordion title="Perf debugging">

    - `pnpm test:perf:imports` active le rapport de durée d'import Vitest ainsi que
      la sortie de répartition des importations.
    - `pnpm test:perf:imports:changed` limite la même vue de profilage aux
      fichiers modifiés depuis `origin/main`.
    - Les données de chronométrage des shards sont écrites dans `.artifacts/vitest-shard-timings.json`.
      Les exécutions sur l'ensemble de la configuration utilisent le chemin de la configuration comme clé ;
      les shards CI avec motif d'inclusion ajoutent le nom du shard afin que les shards filtrés puissent être suivis
      séparément.
    - Lorsqu'un test à chaud passe encore la majeure partie de son temps dans les importations de démarrage,
      gardez les dépendances lourdes derrière une jointure `*.runtime.ts` locale étroite et
      mockez cette jointure directement au lieu d'importer profondément les helpers d'exécution juste
      pour les transmettre via `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les
      `test:changed` acheminés avec le chemin natif du projet racine pour ce diff
      validé et affiche le temps réel ainsi que le RSS maximal macOS.
    - `pnpm test:perf:changed:bench -- --worktree` effectue un benchmark de l'arbre
      sale actuel en acheminant la liste des fichiers modifiés via
      `scripts/test-projects.mjs` et la configuration racine Vitest.
    - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour
      le démarrage et la surcharge de transformation de Vitest/Vite.
    - `pnpm test:perf:profile:runner` écrit les profils CPU+tas du runner pour
      la suite unitaire avec le parallélisme de fichiers désactivé.

  </Accordion>
</AccordionGroup>

### Stabilité (gateway)

- Commande : `pnpm test:stability:gateway`
- Configuration : `vitest.gateway.config.ts`, forcée à un worker
- Portée :
  - Démarre un vrai Gateway en boucle avec les diagnostics activés par défaut
  - Pilote des messages synthétiques, la mémoire et l'activité de charge utile importante du gateway via le chemin d'événement de diagnostic
  - Interroge `diagnostics.stability` via le Gateway WS RPC
  - Couvre les helpers de persistance du bundle de stabilité de diagnostic
  - Affirme que l'enregistreur reste borné, que les échantillons RSS synthétiques restent sous le budget de pression et que les profondeurs de file d'attente par session se drainent jusqu'à zéro
- Attentes :
  - Sûr pour la CI et sans clé
  - Voie étroite pour le suivi de régression de stabilité, pas un substitut à la suite Gateway complète

### E2E (gateway smoke)

- Commande : `pnpm test:e2e`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`, et les tests E2E des bundled-plugins sous `extensions/`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `threads` avec `isolate: false`, correspondant au reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la charge des E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console verbeuse.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appariement de nœuds et réseau plus complexe
- Attentes :
  - S'exécute dans la CI (lorsqu'elle est activée dans le pipeline)
  - Aucune vraie clé requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : test de fumée du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `extensions/openshell/src/backend.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw sur de vrais `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un CLI `openshell` local ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (vrais fournisseurs + vrais modèles)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`, `test/**/*.live.test.ts`, et les tests live des bundled-plugins sous `extensions/`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - "Est-ce que ce provider/model fonctionne réellement _aujourd'hui_ avec de vrais identifiants ?"
  - Détecter les changements de format du provider, les bizarreries de l'appel d'outils, les problèmes d'authentification et le comportement des limites de taux
- Attentes :
  - Pas stable dans CI par conception (réseaux réels, politiques réelles des providers, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Privilégiez l'exécution de sous-ensembles réduits plutôt que de "tout"
- Les exécutions Live utilisent des clés API déjà exportées et des profils d'authentification mis en scène.
- Par défaut, les exécutions Live isolent toujours `HOME` et copient le matériel de configuration/d'authentification dans un répertoire de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre véritable `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests Live utilisent votre véritable répertoire personnel.
- `pnpm test:live` utilise par défaut un mode plus silencieux : il conserve la sortie de progression `[live] ...` et coupe les journaux de démarrage de la passerelle/les bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au provider) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une priorité par Live via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponse de limite de taux.
- Sortie de progression/heartbeat :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels longs au provider soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de la console Vitest afin que les lignes de progression du provider/de la passerelle diffusent immédiatement pendant les exécutions Live.
  - Ajustez les heartbeats du modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les heartbeats de la passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Touching gateway networking / WS protocol / pairing: ajoutez `pnpm test:e2e`
- Debugging "my bot is down" / provider-specific failures / tool calling: exécutez un `pnpm test:live` ciblé

## Tests en direct (accès réseau)

Pour la matrice de model en direct, les tests de fumée du backend CLI, les tests de fumée ACP, le harnais Codex app-server, et tous les tests en direct de provider de médias (Deepgram, BytePlus, ComfyUI, image, musique, vidéo, harnais média) — ainsi que la gestion des identifiants pour les exécutions en direct — consultez [Testing live suites](CLIDeepgram/en/help/testing-live). Pour la liste de contrôle dédiée à la validation des mises à jour et des plugins, consultez [Testing updates and plugins](/fr/help/testing-updates-plugins).

## Runners Docker (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker sont divisés en deux catégories :

- Runners de model en direct : `test:docker:live-models` et `test:docker:live-gateway`Docker n'exécutent que leur fichier live correspondant à la clé de profil dans l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de configuration local, votre espace de travail et le fichier d'environnement de profil optionnel. Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les runners Docker en ligne utilisent par défaut une limite de fumée plus petite afin qu'un balayage Docker complet reste pratique :
  DockerDocker`test:docker:live-models` est par défaut `OPENCLAW_LIVE_MAX_MODELS=12`, et
  `test:docker:live-gateway` est par défaut `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Remplacez ces env vars lorsque vous
  souhaitez explicitement le scan exhaustif plus large.
- `test:docker:all`Docker construit l'image Docker live une fois via `test:docker:live-build`OpenClawnpm, empaquète OpenClaw une fois sous forme de tarball npm via `scripts/package-openclaw-for-docker.mjs`, puis construit/réutilise deux images `scripts/e2e/Dockerfile`. L'image nue n'est que le runner Node/Git pour les voies d'installation/de mise à jour/de dépendances de plug-in ; ces voies montent le tarball préconstruit. L'image fonctionnelle installe le même tarball dans `/app`Docker pour les voies de fonctionnalité d'application construite. Les définitions de voies Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur réside dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. L'agrégat utilise un planificateur local pondéré : `OPENCLAW_DOCKER_ALL_PARALLELISM`npm contrôle les créneaux de processus, tandis que les plafonds de ressources empêchent les voies lourdes live, npm-install et multi-service de démarrer toutes en même temps. Si une seule voie est plus lourde que les plafonds actifs, le planificateur peut tout de même la démarrer lorsque le pool est vide, puis la laisse fonctionner seule jusqu'à ce que la capacité soit à nouveau disponible. Les valeurs par défaut sont 10 créneaux, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; ajustez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`DockerDockerOpenClaw uniquement lorsque l'hôte Docker dispose de plus de marge. Le runner effectue une pré-vérification Docker par défaut, supprime les conteneurs E2E OpenClaw périmés, imprime le statut toutes les 30 secondes, stocke les timings de voies réussis dans `.artifacts/docker-tests/lane-timings.json` et utilise ces timings pour démarrer d'abord les voies plus longues lors des exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1`Docker pour imprimer le manifeste des voies pondérées sans construire ni exécuter Docker, ou `node scripts/test-docker-all.mjs --plan-json` pour imprimer le plan CI pour les voies sélectionnées, les besoins de paquet/image et les identifiants.
- `Package Acceptance` est la passerelle de package native GitHub pour « est-ce que cette archive tar installable fonctionne en tant que produit ? ». Elle résout un package candidat à partir de `source=npm`, `source=ref`, `source=url` ou `source=artifact`, le télécharge en tant que `package-under-test`, puis exécute les voies E2E Docker réutilisables sur cette archive tar exacte au lieu de réempaqueter la référence sélectionnée. Les profils sont ordonnés par étendue : `smoke`, `package`, `product` et `full`. Voir [Testing updates and plugins](/fr/help/testing-updates-plugins) pour le contrat package/update/plugin, la matrice de survie des mises à niveau publiées, les valeurs par défaut de release et le triage des échecs.
- Les vérifications de build et de release exécutent `scripts/check-cli-bootstrap-imports.mjs` après tsdown. Le garde parcourt le graphe de build statique à partir de `dist/entry.js` et `dist/cli/run-main.js` et échoue si l'importation de démarrage pré-répartition importe des dépendances de package telles que Commander, l'interface utilisateur d'invite, undici ou la journalisation avant la répartition des commandes ; il maintient également le bloc d'exécution de passerelle regroupé sous le budget et rejette les importations statiques de chemins de passerelle froids connus. Le test de fumée du CLI empaqueté couvre également l'aide racine, l'aide à l'intégration, l'aide du médecin, le statut, le schéma de configuration et une commande de liste de modèles.
- La compatibilité héritée de l'acceptation des packages est plafonnée à `2026.4.25` (`2026.4.25-beta.*` incluse). Jusqu'à cette limite, le harnais tolère uniquement les lacunes de métadonnées des packages expédiés : entrées d'inventaire QA privées omises, `gateway install --wrapper` manquant, fichiers de correctifs manquants dans le git dérivé de l'archive tar, `update.channel` persisté manquant, emplacements hérités des enregistrements d'installation de plugins, persistance manquante des enregistrements d'installation du marketplace et migration des métadonnées de configuration pendant `plugins update`. Pour les packages après `2026.4.25`, ces chemins entraînent des échecs stricts.
- Container smoke runners : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:release-user-journey`, `test:docker:release-typed-onboarding`, `test:docker:release-media-memory`, `test:docker:release-upgrade-user-journey`, `test:docker:release-plugin-marketplace`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix` et `test:docker:config-reload` démarrent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de niveau supérieur.

Les runners Docker pour les Dockers en direct montent également (bind-mount) uniquement les répertoires d'authentification CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution, afin que l'CLI OAuth externe puisse actualiser les jetons sans modifier le magasin d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- ACP bind smoke : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh` ; couvre Claude, Codex et Gemini par défaut, avec une couverture stricte Droid/OpenCode via `pnpm test:docker:live-acp-bind:droid` et `pnpm test:docker:live-acp-bind:opencode`)
- Smoke du backend CLI : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Smoke du harnais app-server Codex : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agent dev : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Observability smoke : `pnpm qa:otel:smoke` est une voie privée de vérification du code source (source-checkout) QA. Elle n'est intentionnellement pas incluse dans les voies de publication de package Docker car l'archive npm omet le Lab QA.
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Npm tarball onboarding/channel/agent smoke : `pnpm test:docker:npm-onboard-channel-agent`OpenClawDockerOpenAITelegramOpenAI installe la tarball OpenClaw empaquetée globalement dans Docker, configure OpenAI via env-ref onboarding plus Telegram par défaut, exécute doctor, et exécute un tour d'agent OpenAI simulé. Réutilisez une tarball préconstruite avec `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sautez la reconstruction de l'hôte avec `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, ou changez de channel avec `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` ou `OPENCLAW_NPM_ONBOARD_CHANNEL=slack`.

- Release user journey smoke : `pnpm test:docker:release-user-journey`OpenClawDockerOpenAIGateway installe la tarball OpenClaw empaquetée globalement dans un home Docker propre, exécute l'onboarding, configure un provider OpenAI simulé, exécute un tour d'agent, installe/désinstalle des plugins externes, configure ClickClack contre un fixture local, vérifie la messagerie sortante/entrante, redémarre Gateway, et exécute doctor.
- Release typed onboarding smoke : `pnpm test:docker:release-typed-onboarding` installe la tarball empaquetée, pilote `openclaw onboard`OpenAI à travers un TTY réel, configure OpenAI comme un provider env-ref, vérifie qu'il n'y a pas de persistance de clé brute, et exécute un tour d'agent simulé.
- Release media/memory smoke : `pnpm test:docker:release-media-memory`OpenAIGateway installe la tarball empaquetée, vérifie la compréhension d'image à partir d'une pièce jointe PNG, la sortie de génération d'image compatible OpenAI, le rappel de recherche de mémoire, et la survie du rappel à travers le redémarrage de Gateway.
- Release upgrade user journey smoke : `pnpm test:docker:release-upgrade-user-journey` installe `openclaw@latest` par défaut, configure l'état provider/plugin/ClickClack sur le package publié, effectue une mise à niveau vers la tarball candidate, puis réexécute le parcours cœur agent/plugin/channel. Remplacez la base de référence avec `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>`.
- Test de fumaison du marketplace de plugins de version : `pnpm test:docker:release-plugin-marketplace` installe à partir d'un marketplace de fixtures local, met à jour le plugin installé, le désinstalle et vérifie que le CLI disparaît avec les métadonnées d'installation nettoyées.
- Test de fumaison d'installation de compétence : `pnpm test:docker:skill-install` installe globalement l'archive tar OpenClaw empaquetée dans Docker, désactive les installations d'archives téléchargées dans la configuration, résout le slug de compétence ClawHub actuel à partir de la recherche, l'installe avec `openclaw skills install` et vérifie la compétence installée ainsi que les métadonnées d'origine/verrouillage `.clawhub`.
- Test de fumaison de changement de canal de mise à jour : `pnpm test:docker:update-channel-switch` installe globalement l'archive tar OpenClaw empaquetée dans Docker, passe du paquet `stable` à git `dev`, vérifie que le canal persistant et le plugin fonctionnent après la mise à jour, puis repasse au paquet `stable` et vérifie l'état de la mise à jour.
- Test de fumaison de survie à la mise à niveau : `pnpm test:docker:upgrade-survivor` installe l'archive tar OpenClaw empaquetée sur une fixture d'ancien utilisateur sale avec des agents, une configuration de canal, des listes d'autorisation de plugins, un état obsolète des dépendances de plugins et des fichiers d'espace de travail/session existants. Il exécute la mise à jour du paquet ainsi qu'un diagnostic non interactif sans clés de provider ou de canal en direct, puis démarre un Gateway en boucle et vérifie la préservation de la configuration/de l'état ainsi que les budgets de démarrage/statut.
- Published upgrade survivor smoke : `pnpm test:docker:published-upgrade-survivor` installe `openclaw@latest` par défaut, sème des fichiers d'utilisateurs existants réalistes, configure cette base de référence avec une commande de recette intégrée, valide la configuration résultante, met à jour cette installation publiée vers l'archive tar candidate, exécute le doctor en mode non interactif, écrit `.artifacts/upgrade-survivor/summary.json`, puis démarre un Gateway en boucle locale et vérifie les intentions configurées, la préservation de l'état, le démarrage, `/healthz`, `/readyz` et les budgets de statut RPC. Remplacer une base de référence par `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, demander à l'ordonnanceur agrégé d'étendre les bases locales exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` telles que `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, et étendre les fixtures en forme de problème avec `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` telles que `reported-issues` ; l'ensemble de problèmes signalés inclut `configured-plugin-installs` pour la réparation automatique de l'installation du plugin externe OpenClaw. L'acceptation de package expose ceux-ci comme `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` et `published_upgrade_survivor_scenarios`, résout les jetons de méta-base de référence tels que `last-stable-4` ou `all-since-2026.4.23`, et la validation complète de version étend la porte du package de trempage de version à `last-stable-4 2026.4.23 2026.5.2 2026.4.15` plus `reported-issues`.
- Session runtime context smoke : `pnpm test:docker:session-runtime-context` vérifie la persistance de la transcription du contexte d'exécution cachée ainsi que la réparation par le doctor des branches de réécriture de prompt dupliquées affectées.
- Bun global install smoke : `bash scripts/e2e/bun-global-install-smoke.sh` empaquète l'arborescence actuelle, l'installe avec `bun install -g` dans un répertoire personnel isolé et vérifie que `openclaw infer image providers --json` renvoie les fournisseurs d'images regroupés au lieu de se bloquer. Réutiliser une archive tar préconstruite avec `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sauter la construction de l'hôte avec `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` ou copier `dist/` depuis une image Docker construite avec `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Installer Docker smoke : Docker`bash scripts/test-install-sh-docker.sh` partage un cache npmnpm entre ses conteneurs racine, de mise à jour et direct-npm. Le smoke de mise à jour utilise par défaut npm `latest` comme base stable avant de passer à l'archive candidate. Remplacez par `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` en local, ou avec l'entrée `update_baseline_version` du workflow Install Smoke sur GitHub. Les vérifications de l'installateur non-root gardent un cache npm isolé pour que les entrées de cache détenues par root ne masquent pas le comportement d'installation local à l'utilisateur. Définissez `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache`npm pour réutiliser le cache racine/mise à jour/direct-npm lors des exécutions locales répétées.
- Install Smoke CI saute la mise à jour globale direct-npm en double avec npm`OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` ; exécutez le script localement sans cette variable d'environnement lorsque la couverture directe `npm install -g` est nécessaire.
- Les agents suppriment le smoke CLI de l'espace de travail partagé : `pnpm test:docker:agents-delete-shared-workspace` (script : `scripts/e2e/agents-delete-shared-workspace-docker.sh`) construit par défaut l'image du Dockerfile racine, initialise deux agents avec un espace de travail dans un home de conteneur isolé, exécute `agents delete --json` et vérifie le JSON valide ainsi que le comportement de l'espace de travail conservé. Réutilisez l'image install-smoke avec `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Réseautage Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Smoke de snapshot CDP du navigateur : `pnpm test:docker:browser-cdp-snapshot` (script : `scripts/e2e/browser-cdp-snapshot-docker.sh`) construit l'image E2E source plus une couche Chromium, démarre Chromium avec CDP brut, exécute `browser doctor --deep` et vérifie que les snapshots de rôle CDP couvrent les URL de liens, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de frame.
- Régression du raisonnement minimal web_search des réponses OpenAI : OpenAI`pnpm test:docker:openai-web-search-minimal` (script : `scripts/e2e/openai-web-search-minimal-docker.sh`OpenAIGateway) exécute un serveur OpenAI simulé via le Gateway, vérifie que `web_search` augmente `reasoning.effort` de `minimal` à `low`Gateway, puis force le rejet du schéma du provider et vérifie que le détail brut apparaît dans les journaux du Gateway.
- Pont de channel MCP (Gateway amorcé + pont stdio + test de fumée du cadre de notification brut Claude) : Gateway`pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Outils MCP du bundle Pi (vrai serveur MCP stdio + test de fumée autoriser/refuser du profil Pi intégré) : `pnpm test:docker:pi-bundle-mcp-tools` (script : `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Nettoyage MCP Cron/sous-agent (véritable Gateway + arrêt de l'enfant MCP stdio après des tâches cron isolées et des exécutions de sous-agent ponctuelles) : `pnpm test:docker:cron-mcp-cleanup` (script : `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Plugins (smoke d'installation/mise à jour pour le chemin local, `file:`, registre npm avec dépendances hissées, métadonnées de paquet npm malformées, refs git en mouvement, kitchen-sink ClawHub, mises à jour de la marketplace et activation/inspection de bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)
  Définissez `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` pour ignorer le bloc ClawHub, ou remplacez la paire paquet/runtime kitchen-sink par défaut avec `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` et `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`. Sans `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`, le test utilise un serveur de fixtures ClawHub local hermétique.
- Smoke de mise à jour de plugin inchangée : `pnpm test:docker:plugin-update` (script : `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Plugin lifecycle matrix smoke: `pnpm test:docker:plugin-lifecycle-matrix` installs the packed OpenClaw tarball in a bare container, installs an npm plugin, toggles enable/disable, upgrades and downgrades it through a local npm registry, deletes the installed code, then verifies uninstall still removes stale state while logging RSS/CPU metrics for each lifecycle phase.
- Config reload metadata smoke: `pnpm test:docker:config-reload` (script: `scripts/e2e/config-reload-source-docker.sh`)
- Plugins: `pnpm test:docker:plugins` covers install/update smoke for local path, `file:`, npm registry with hoisted dependencies, git moving refs, ClawHub fixtures, marketplace updates, and Claude-bundle enable/inspect. `pnpm test:docker:plugin-update` covers unchanged update behavior for installed plugins. `pnpm test:docker:plugin-lifecycle-matrix` covers resource-tracked npm plugin install, enable, disable, upgrade, downgrade, and missing-code uninstall.

To prebuild and reuse the shared functional image manually:

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Suite-specific image overrides such as `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` still win when set. When `OPENCLAW_SKIP_DOCKER_BUILD=1` points at a remote shared image, the scripts pull it if it is not already local. The QR and installer Docker tests keep their own Dockerfiles because they validate package/install behavior rather than the shared built-app runtime.

Les exécuteurs Docker de modèle en direct (live-model) montent également le checkout actuel en lecture seule (bind-mount) et le mettent en scène dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest par rapport à votre source/configuration locale exacte. L'étape de mise en scène ignore les caches locaux volumineux et les sorties de compilation de l'application tels que Docker`.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et les répertoires de sortie Gradle ou locaux à l'application `.build`Docker, afin que les exécutions Docker en direct ne passent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1`TelegramDiscord afin que les sondes en direct du Gateway ne démarrent pas de véritables workers de channel Telegram/Discord/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, donc transmettez également `OPENCLAW_LIVE_GATEWAY_*`Docker lorsque vous devez restreindre ou exclure la couverture en direct du Gateway de cette voie Docker. `test:docker:openwebui`OpenClawOpenAI est un test de smoke de compatibilité de plus haut niveau : il démarre un conteneur Gateway OpenClaw avec les points de terminaison HTTP compatibles OpenAI activés, démarre un conteneur Open WebUI épinglé (pinned) contre ce Gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une véritable requête de chat via le proxy `/api/chat/completions` d'Open WebUI. Définissez `OPENWEBUI_SMOKE_MODE=models`Docker pour les vérifications CI de chemin de publication (release-path) qui doivent s'arrêter après la connexion à Open WebUI et la découverte de modèle, sans attendre une complétion de modèle en direct. La première exécution peut être sensiblement plus lente car Docker peut avoir besoin de tirer (pull) l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid (cold-start). Cette voie s'attend à une clé de modèle en direct utilisable. Fournissez-la via l'environnement de processus, les profils d'authentification mis en scène, ou une variable `OPENCLAW_PROFILE_FILE` explicite. Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels`TelegramDiscordiMessageGateway est intentionnellement déterministe et n'a pas besoin d'un compte Telegram, Discord ou iMessage réel. Il démarre un conteneur Gateway amorcé (seeded), démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversation routée, les lectures de transcription, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements en direct, le routage d'envoi sortant, et les notifications de channel + style Claude via le véritable pont MCP stdio. La vérification des notifications inspecte directement les trames MCP stdio brutes, de sorte que le test de smoke valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à exposer. `test:docker:pi-bundle-mcp-tools`Docker est déterministe et n'a pas besoin d'une clé de modèle en direct. Il construit l'image Docker du dépôt, démarre un véritable serveur de sonde MCP stdio à l'intérieur du conteneur, matérialise ce serveur via le runtime MCP du bundle Pi intégré, exécute l'outil, puis vérifie que `coding` et `messaging` conservent les outils `bundle-mcp` tandis que `minimal` et `tools.deny: ["bundle-mcp"]` les filtrent. `test:docker:cron-mcp-cleanup`Gateway est déterministe et n'a pas besoin d'une clé de modèle en direct. Il démarre un Gateway amorcé avec un véritable serveur de sonde MCP stdio, exécute un tour cron isolé et un tour enfant ponctuel `/subagents spawn`, puis vérifie que le processus enfant MCP se termine après chaque exécution.

Test de fumé manuel du fil en langage clair de l'ACP (pas de CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les workflows de régression/débogage. Il peut être nécessaire à nouveau pour la validation du routage des fils de l'ACP, ne le supprimez donc pas.

Env vars utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` monté et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` pour vérifier uniquement les env vars sourcés depuis `OPENCLAW_PROFILE_FILE`CLI, en utilisant des répertoires de config/workspace temporaires et aucun montage d'auth CLI externe
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (par défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global`CLIDocker pour les installations CLI mises en cache à l'intérieur de Docker
- Les répertoires/fichiers d'auth CLI externes sous CLI`$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions restreintes de providers ne montent que les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les réexécutions qui ne nécessitent pas de reconstruction
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du magasin de profils (et non des env vars)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le model exposé par le Gateway pour le test de fumée Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer le prompt de vérification de nonce utilisé par le test de fumée Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer le tag d'image épinglée Open WebUI

## Cohérence de la documentation

Exécutez les vérifications de documentation après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres intra-page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûr pour CI)

Il s'agit de régressions de « vrai pipeline » sans vrais providers :

- Appel de tool du Gateway (mock OpenAI, vrai gateway + boucle agent) : GatewayOpenAI`src/gateway/gateway.test.ts`OpenAI (cas : "exécute un appel tool mock OpenAI de bout en bout via la boucle agent du gateway")
- Assistant du Gateway (WS Gateway`wizard.start`/`wizard.next`, écrit la config + auth forcée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant via ws et écrit la config du jeton d'auth")

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Mock d'appel de tool via le vrai gateway + boucle d'agent (`src/gateway/gateway.test.ts`).
- Flux d'assistant de bout en bout qui valident le câblage de session et les effets de la config (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les Skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les Skills sont listés dans le prompt, l'agent choisit-il le bon Skill (ou évite-t-il ceux qui ne sont pas pertinents) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios multi-tours qui vérifient l'ordre des tools, le report de l'historique de session et les limites du bac à sable.

Les futures évaluations doivent d'abord rester déterministes :

- Un exécuteur de scénario utilisant des mocks de providers pour vérifier les appels de tools + l'ordre, les lectures de fichiers de Skills, et le câblage de session.
- Une petite suite de scénarios axés sur les Skills (utilisation vs évitement, restriction, injection de prompt).
- Évaluations en direct optionnelles (opt-in, restreintes par env) uniquement après la mise en place de la suite sûre pour CI.

## Tests de contrat (structure de plugin et de channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son contrat d'interface. Ils itèrent sur tous les plugins découverts et exécutent une suite d'assertions de forme et de comportement. La `pnpm test` unit lane par défaut ignore intentionnellement ces fichiers de seam et de fumée partagés ; exécutez les commandes de contrat explicitement lorsque vous touchez aux surfaces partagées du channel ou du provider.

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
- **actions** - Gestionnaires d'actions de channel
- **threading** - Gestion de l'ID de fil de discussion
- **directory** - API de répertoire/liste API
- **group-policy** - Application de la stratégie de groupe

### Contrats de statut de provider

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondes de statut de channel
- **registry** - Forme du registre de plugins

### Contrats de provider

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection de l'authentification
- **catalog** - API du catalogue de models
- **discovery** - Découverte de plugins
- **loader** - Chargement des plugins
- **runtime** - Runtime du provider
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exportations ou les sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de channel ou de provider
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests de contrat s'exécutent dans CI et ne nécessitent pas de clés API réelles.

## Ajouter des régressions (conseils)

Lorsque vous corrigez un problème de provider/model découvert en live :

- Ajoutez si possible une régression sûre pour CI (provider simulé/bouchonné, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement uniquement en live (limites de débit, stratégies d'auth), gardez le test live étroit et optionnel via des variables d'environnement
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bug de conversion/relecture de requête provider → test direct des models
  - bug du pipeline de session/historique/tool de la passerelle → test de fumée live de la passerelle ou test mock de passerelle sûr pour la CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les ids d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les ids de cibles non classifiés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.

## Connexes

- [Tests en direct](/fr/help/testing-live)
- [Tests des mises à jour et des plugins](/fr/help/testing-updates-plugins)
- [CI](/fr/ci)
