---
summary: "Kit de tests : suites unit/e2e/live, runners Docker, et ce que couvre chaque test"
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

- [QA overview](/fr/concepts/qa-e2e-automationMatrix) - architecture, surface de commande, création de scénarios.
- [Matrix QA](/fr/concepts/qa-matrix) - référence pour `pnpm openclaw qa matrix`.
- [QA channel](/fr/channels/qa-channelDocker) - le plugin de transport synthétique utilisé par les scénarios basés sur le dépôt.

Cette page couvre l'exécution des suites de tests régulières et des exécuteurs Docker/Parallels. La section sur les exécuteurs spécifiques QA ci-dessous ([QA-specific runners](#qa-specific-runners)) répertorie les appels `qa` concrets et renvoie aux références ci-dessus.

</Note>

## Quick start

La plupart des jours :

- Full gate (attendu avant le push) : `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Exécution locale complète plus rapide sur une machine puissante : `pnpm test:max`
- Boucle de surveillance directe Vitest : `pnpm test:watch`
- Le ciblage direct de fichiers route désormais aussi les chemins d'extension/channel : `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Privilégiez d'abord les exécutions ciblées lorsque vous itérez sur un seul échec.
- Site QA avec support Docker : Docker`pnpm qa:lab:up`
- Voie QA avec support VM Linux : Linux`pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Lorsque vous modifiez des tests ou souhaitez une confiance supplémentaire :

- Coverage gate : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de vrais providers/modèles (nécessite de vrais identifiants) :

- Suite live (modèles + sondes d'outil/image de la passerelle) : `pnpm test:live`
- Cibler un fichier live en silence : `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Rapports de performance à l'exécution : envoyer `OpenClaw Performance` avec
  `live_openai_candidate=true` pour un tour d'agent `openai/gpt-5.5` réel ou
  `deep_profile=true` pour les artefacts CPU/tas/trace de Kova. Les exécutions planifiées quotidiennes
  publient les artefacts de la voie mock-provider, deep-profile et GPT 5.5 vers
  `openclaw/clawgrit-reports` lorsque `CLAWGRIT_REPORTS_TOKEN` est configuré. Le rapport
  du mock-provider inclut également les chiffres de démarrage, de mémoire,
  de pression des plugins, de boucle de hello du faux modèle répétitive, et de démarrage CLI au niveau source de la passerelle.
- Balayage de modèles live Docker : Docker`pnpm test:docker:live-models`
  - Chaque modèle sélectionné exécute désormais un tour de texte plus une petite sonde de style lecture de fichier.
    Les modèles dont les métadonnées annoncent une entrée `image` exécutent également un minuscule tour d'image.
    Désactivez les sondes supplémentaires avec `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` ou
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` lors de l'isolement des pannes du fournisseur.
  - Couverture CI : le `OpenClaw Scheduled Live And E2E Checks` quotidien et le `OpenClaw Release Checks` manuel
    appellent tous deux le workflow live/E2E réutilisable avec
    `include_live_suites: true`, qui inclut des travaux de matrice de modèle live Docker distincts
    fragmentés par fournisseur.
  - Pour des réexécutions CI ciblées, déclenchez `OpenClaw Live And E2E Checks (Reusable)`
    avec `include_live_suites: true` et `live_models_only: true`.
  - Ajoutez de nouveaux secrets de fournisseur à signal élevé à `scripts/ci-hydrate-live-auth.sh`
    plus `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` et ses
    appelants planifiés/release.
- Fumée de chat lié Codex natif : `pnpm test:docker:live-codex-bind`
  - Exécute une ligne live Docker sur le chemin du serveur d'application Codex, lie un
    Slack DM synthétique avec `/codex bind`, exerce `/codex fast` et
    `/codex permissions`, puis vérifie une réponse simple et une pièce jointe image
    routées via la liaison de plugin native au lieu de l'ACP.
- Fumée du harnais du serveur d'application Codex : `pnpm test:docker:live-codex-harness`
  - Exécute des tours d'agent de passerelle via le harnais du serveur d'application Codex détenu par le plugin,
    vérifie `/codex status` et `/codex models`, et par défaut exerce les sondes image,
    cron MCP, sous-agent et Guardian. Désactivez la sonde de sous-agent avec
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` lors de l'isolement d'autres pannes du
    serveur d'application Codex. Pour une vérification ciblée du sous-agent, désactivez les autres sondes :
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    Ceci s'arrête après la sonde de sous-agent sauf si
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0` est défini.
- Fumée de l'installation à la demande de Codex : `pnpm test:docker:codex-on-demand`
  - Installe l'archive tar OpenClaw conditionnée dans Docker, exécute l'onboarding de la clé API OpenAI et vérifie que le plugin Codex ainsi que la dépendance OpenClawDockerOpenAIAPI`@openai/codex`npm ont été téléchargés à la demande dans le répertoire racine géré par npm.
- Test de fumée de la dépendance de l'outil de plugin en direct : `pnpm test:docker:live-plugin-tool`
  - Empaquette un plugin de test avec une dépendance réelle `slugify`, l'installe via `npm-pack:`npmOpenAI, vérifie la dépendance sous le répertoire racine géré par npm, puis demande à un modèle OpenAI en direct d'appeler l'outil du plugin et de renvoyer l'identifiant masqué.
- Test de fumée de la commande de secours Crestodian : `pnpm test:live:crestodian-rescue-channel`
  - Vérification de sécurité supplémentaire (optionnelle) pour la surface de la commande de secours du canal de messages. Elle exécute `/crestodian status`, met en file d'attente un changement persistant du modèle, répond `/crestodian yes` et vérifie le chemin d'écriture d'audit/configuration.
- Test de fumée du planificateur Crestodian Docker : Docker`pnpm test:docker:crestodian-planner`
  - Exécute Crestodian dans un conteneur sans configuration avec une fausse CLI Claude sur CLI`PATH` et vérifie que le repli du planificateur flou se traduit par une écriture de configuration typée et auditée.
- Test de fumée du premier démarrage Crestodian Docker : Docker`pnpm test:docker:crestodian-first-run`
  - Commence à partir d'un répertoire d'état OpenClaw vide, vérifie le point d'entrée de l'onboarding moderne de Crestodian, applique les écritures de configuration/modèle/agent/plugin Discord + SecretRef, valide la configuration et vérifie les entrées d'audit. Le même chemin de configuration Ring 0 est également couvert dans le QA Lab par OpenClawDiscord`pnpm openclaw qa suite --scenario crestodian-ring-zero-setup`.
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

- La preuve de l'URL exacte de l'archive tar nécessite un condensé (digest) et utilise la stratégie de sécurité d'URL publique :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- Les miroirs d'archive tar d'entreprise/privés utilisent une stratégie explicite de source de confiance :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

`source=trusted-url` lit `.github/package-trusted-sources.json` à partir de la référence de workflow de confiance et n'accepte pas les identifiants d'URL ni un contournement du réseau privé par entrée de workflow. Si la stratégie nommée déclare une authentification par porteur (bearer auth), configurez le secret fixe `OPENCLAW_TRUSTED_PACKAGE_TOKEN`.

- Artifact proof télécharge un artefact tarball depuis une autre exécution d'Actions :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - Empaquette et installe la build actuelle d'OpenClaw dans Docker, démarre le Gateway
    avec OpenAI configuré, puis active les channel/plugins groupés via des modifications
    de configuration.
  - Vérifie que la découverte de la configuration laisse les plugins téléchargeables non configurés absents,
    que la première réparation de docteur configurée installe explicitement chaque plugin
    téléchargeur manquant, et qu'un deuxième redémarrage n'exécute pas la réparation des dépendances
    masquées.
  - Installe également une base de référence npm connue plus ancienne, active Telegram avant d'exécuter
    `openclaw update --tag <candidate>`, et vérifie que le docteur post-mise à jour du candidat nettoie les débris de dépendances de plugins hérités sans
    réparation post-install côté harnais.
- `pnpm test:parallels:npm-update`
  - Exécute le test de fumée de mise à jour de l'installation packagée native sur les invités Parallels. Chaque
    plateforme sélectionnée installe d'abord le package de base demandé, puis exécute
    la commande installée `openclaw update` sur le même invité et vérifie la
    version installée, le statut de mise à jour, l'état de préparation du gateway et un tour d'agent local.
  - Utilisez `--platform macos`, `--platform windows` ou `--platform linux` tout en
    itérant sur un invité. Utilisez `--json` pour le chemin de l'artefact récapitulatif et
    le statut par voie.
  - La voie OpenAI utilise `openai/gpt-5.5` pour la preuve de tour d'agent en direct par
    défaut. Passez `--model <provider/model>` ou définissez
    `OPENCLAW_PARALLELS_OPENAI_MODEL` lors de la validation délibérée d'un autre
    modèle OpenAI.
  - Enveloppez les longues exécutions locales dans un délai d'attente hôte afin que les arrêts du transport Parallels ne puissent
    pas consommer le reste de la fenêtre de test :

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - Le script écrit des journaux de voie imbriqués sous `/tmp/openclaw-parallels-npm-update.*`.
    Inspectez `windows-update.log`, `macos-update.log` ou `linux-update.log`
    avant de supposer que l'enveloppe extérieure est bloquée.
  - La mise à jour Windows peut prendre 10 à 15 minutes pour les tâches de vérification post-mise à jour et de mise à jour des packages sur un invité à froid ; cela est toujours normal lorsque le journal de débogage npm imbriqué avance.
  - N'exécutez pas cet wrapper d'agrégation en parallèle avec les voies de test de fumée individuelles Parallels macOS, Windows ou Linux. Elles partagent l'état de la machine virtuelle et peuvent entrer en collision lors de la restauration d'instantanés, de la diffusion des packages ou de l'état de la passerelle invitée.
  - La preuve post-mise à jour exécute la surface normale du plugin groupé, car les façades de capacités telles que la parole, la génération d'images et la compréhension des médias sont chargées via les API d'exécution groupées, même lorsque le tour de l'agent ne vérifie qu'une simple réponse textuelle.

- `pnpm openclaw qa aimock`
  - Démarre uniquement le serveur de fournisseur AIMock local pour le test de fumée direct du protocole.
- `pnpm openclaw qa matrix`
  - Exécute la voie QA en direct Matrix contre un serveur domestique Tuwunel éphabère soutenu par Docker. Réservé au code source - les installations packagées n'expédient pas `qa-lab`.
  - CLI complet, catalogue de profils/scénarios, variables d'environnement et disposition des artefacts : [Matrix QA](/fr/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Exécute la voie QA en direct Telegram contre un groupe privé réel en utilisant les jetons de bot du pilote et du système à tester (SUT) provenant de l'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. L'identifiant du groupe doit être l'identifiant de chat numérique Telegram.
  - Prend en charge `--credential-source convex` pour les identifiants mis en commun partagés. Utilisez le mode d'environnement par défaut, ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` pour opter pour les baux mis en commun.
  - Les valeurs par défaut couvrent canary, le filtrage des mentions, l'adressage des commandes, `/status`, les réponses mentionnées de bot à bot et les réponses de commandes natives principales. Les valeurs par défaut `mock-openai` couvrent également les régressions de chaîne de réponse déterministe et de diffusion de message final Telegram. Utilisez `--list-scenarios` pour des sondes facultatives telles que `session_status`.
  - Quitte avec un code non nul quand un scénario échoue. Utilisez `--allow-failures` lorsque vous
    voulez les artefacts sans un code de sortie d'échec.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable de bot à bot, activez le Mode de Communication Bot-à-Bot dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact de messages observés sous `.artifacts/qa-e2e/...`. Les scénarios de réponse incluent le RTT de la demande d'envoi du pilote à la réponse SUT observée.

`Mantis Telegram Live` est le wrapper de preuve PR autour de cette voie. Il exécute
le candidat ref avec des identifiants Telegram loués par Convex, rend la transcription
de messages observés expurgés dans un navigateur de bureau Crabbox, enregistre la preuve MP4,
génère un GIF rogné par mouvement, télécharge le bundle d'artefacts et publie des preuves PR en ligne
via l'application Mantis GitHub lorsque `pr_number` est défini. Les mainteneurs peuvent
le démarrer depuis l'interface Actions via `Mantis Scenario` (`scenario_id:
telegram-live`) ou directement depuis un commentaire de demande d'extraction :

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` est le wrapper natif d'agent avant/après
Telegram Desktop pour la preuve visuelle PR. Démarrez-le depuis l'interface Actions avec
un `instructions` libre, via `Mantis Scenario` (`scenario_id:
telegram-desktop-proof`), ou depuis un commentaire PR :

```text
@openclaw-mantis telegram desktop proof
```

L'agent Mantis lit la PR, décide quel comportement visible Telegram prouve le
changement, exécute la voie de preuve Crabbox Telegram Desktop utilisateur réel sur les refs de base et
candidat, itère jusqu'à ce que les GIF natifs soient utiles, écrit un manifeste `motionPreview` apparié,
et publie le même tableau GIF à 2 colonnes via l'application Mantis GitHub lorsque `pr_number` est défini.

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - Loue ou réutilise un bureau Crabbox Linux, installe l'application native Telegram Desktop, configure OpenClaw avec un jeton de bot SUT Telegram loué, démarre la passerelle et enregistre des preuves de capture d'écran/MP4 depuis le bureau VNC visible.
  - Par défaut sur `--credential-source convex`, les workflows n'ont donc besoin que du secret du courtier Convex. Utilisez `--credential-source env` avec les mêmes variables `OPENCLAW_QA_TELEGRAM_*` que `pnpm openclaw qa telegram`.
  - L'application Telegram Desktop nécessite toujours une connexion/profil utilisateur. Le jeton de bot ne configure que OpenClaw. Utilisez `--telegram-profile-archive-env <name>` pour une archive de profil `.tgz` en base64, ou utilisez `--keep-lease` et connectez-vous manuellement une fois via VNC.
  - Écrit `mantis-telegram-desktop-builder-report.md`, `mantis-telegram-desktop-builder-summary.json`, `telegram-desktop-builder.png` et `telegram-desktop-builder.mp4` dans le répertoire de sortie.

Les voies de transport en direct partagent un contrat standard pour éviter que les nouveaux transports ne dérivent ; la matrice de couverture par voie se trouve dans [QA overview → Live transport coverage](/fr/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` est la suite synthétique globale et ne fait pas partie de cette matrice.

### Identifiants Telegram partagés via Convex (v1)

Lorsque `--credential-source convex` (ou `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) est activé pour les QA de transport en direct, le labo de QA acquiert un bail exclusif depuis un pool alimenté par Convex, envoie un signal de présence (heartbeat) sur ce bail pendant que la voie est en cours d'exécution, et libère le bail à l'arrêt. Le nom de la section précède la prise en charge de Discord, Slack et WhatsApp ; le contrat de bail est partagé entre les différents types.

Structure de projet Convex de référence :

- `qa/convex-credential-broker/`

Env vars requises :

- `OPENCLAW_QA_CONVEX_SITE_URL` (par exemple `https://your-deployment.convex.site`)
- Un secret pour le rôle sélectionné :
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` pour `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` pour `ci`
- Sélection du rôle d'identifiants :
  - CLI : CLI`--credential-role maintainer|ci`
  - Env par défaut : `OPENCLAW_QA_CREDENTIAL_ROLE` (par défaut `ci` dans CI, `maintainer` sinon)

Env vars facultatives :

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (par défaut `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (par défaut `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (par défaut `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (par défaut `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (par défaut `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de trace facultatif)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permet les URL de bouclage `http://` Convex pour un développement uniquement local.

`OPENCLAW_QA_CONVEX_SITE_URL` doit utiliser `https://` en fonctionnement normal.

Les commandes d'administration du responsable (pool add/remove/list) nécessitent
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` spécifiquement.

Assistants CLI pour les responsables :

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Utilisez `doctor` avant les exécutions en direct pour vérifier l'URL du site Convex, les secrets du courtier,
le préfixe de point de terminaison, le délai d'attente HTTP et l'accessibilité de la liste d'administration sans imprimer
les valeurs secrètes. Utilisez `--json` pour une sortie lisible par machine dans les scripts et les utilitaires
CI.

Contrat de point de terminaison par défaut (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`) :

- `POST /acquire`
  - Requête : `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Succès : `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Épuisé/réessai : `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /payload-chunk`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken, index }`
  - Succès : `{ status: "ok", index, data }`
- `POST /heartbeat`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Succès : `{ status: "ok" }` (ou vide `2xx`)
- `POST /release`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Succès : `{ status: "ok" }` (ou vide `2xx`)
- `POST /admin/add` (secret du responsable uniquement)
  - Requête : `{ kind, actorId, payload, note?, status? }`
  - Succès : `{ status: "ok", credential }`
- `POST /admin/remove` (secret mainteneur uniquement)
  - Requête : `{ credentialId, actorId }`
  - Succès : `{ status: "ok", changed, credential }`
  - Garde de bail actif : `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (secret mainteneur uniquement)
  - Requête : `{ kind?, status?, includePayload?, limit? }`
  - Succès : `{ status: "ok", credentials, count }`

Format de payload pour le type Telegram :

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId`Telegram doit être une chaîne d'ID de chat Telegram numérique.
- `admin/add` valide ce format pour `kind: "telegram"` et rejette les payloads malformés.

Format de payload pour le type réel utilisateur Telegram :

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`, `testerUserId` et `telegramApiId` doivent être des chaînes numériques.
- `tdlibArchiveSha256` et `desktopTdataArchiveSha256` doivent être des chaînes hexadécimales SHA-256.
- `kind: "telegram-user"`Telegram est réservé pour le workflow de preuve Mantis Telegram Desktop. Les voies QA Lab génériques ne doivent pas l'acquérir.

Payloads multi-canaux validés par le courtier :

- Discord : Discord`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp : WhatsApp`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Les voies Slack peuvent également louer à partir du pool, mais la validation de payload Slack réside actuellement dans le lanceur QA Slack plutôt que dans le courtier. Utilisez SlackSlackSlack`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`Slack pour les lignes Slack.

### Ajout d'un canal à la QA

L'architecture et les noms des aides de scénario pour les nouveaux adaptateurs de canal se trouvent dans [Vue d'ensemble de la QA → Ajout d'un canal](/fr/concepts/qa-e2e-automation#adding-a-channel). La barre minimale : implémenter le lanceur de transport sur le joint d'hôte partagé `qa-lab`, déclarer `qaRunners` dans le manifeste du plugin, monter en tant que `openclaw qa <runner>` et rédiger des scénarios sous `qa/scenarios/`.

## Suites de tests (ce qui s'exécute où)

Pensez aux suites comme à un "réalisme croissant" (et une instabilité/coût croissants) :

### Unité / Intégration (par défaut)

- Commande : `pnpm test`
- Configuration : les exécutions sans cible utilisent le jeu de partitions `vitest.full-*.config.ts` et peuvent étendre les partitions multi-projets en configurations par projet pour la planification parallèle
- Fichiers : inventaires unitaires principaux sous `src/**/*.test.ts`, `packages/**/*.test.ts` et `test/**/*.test.ts` ; les tests unitaires de l'UI s'exécutent dans la partition dédiée `unit-ui`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en cours de processus (authentification de la passerelle, routage, outils, analyse, configuration)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans la CI
  - Aucune clé réelle requise
  - Doit être rapide et stable
  - Les tests de résolveur et de chargeur de surface publique doivent prouver un comportement de secours large `api.js` et `runtime-api.js` avec des fixtures de plugins minuscules générés, et non les API source de plugins réels empaquetés. Les chargements de API de plugins réels appartiennent aux suites de contrat/intégration détenues par les plugins.

Politique de dépendance native :

- Les installations de test par défaut ignorent les constructions natives opus optionnelles de Discord. La réception vocale de Discord utilise le décodeur `opusscript` JS pur, et `@discordjs/opus` reste désactivé dans `allowBuilds` afin que les tests locaux et les voies Testbox ne compilent pas le module natif.
- Utilisez une voie de performance ou en direct dédiée à la voix de Discord si vous avez intentionnellement besoin de comparer une construction native opus. Ne définissez pas `@discordjs/opus` sur `true` dans le `allowBuilds` par défaut ; cela fait compiler du code natif lors des boucles d'installation/test sans rapport.

<AccordionGroup>
  <Accordion title="Projets, shards et voies délimitées">

    - Le `pnpm test` sans cible exécute douze configurations de shard plus petites (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus géant de projet racine natif. Cela réduit le RSS de pointe sur les machines chargées et évite que le travail de réponse automatique/d'extension ne prive de ressources les suites non liées.
    - `pnpm test --watch` utilise toujours le graphe de projet racine natif `vitest.config.ts`, car une boucle de surveillance multi-shard n'est pas pratique.
    - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent d'abord les cibles de fichiers/répertoires explicites via des voies délimitées, afin que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
    - `pnpm test:changed` étend par défaut les chemins git modifiés en voies délimitées peu coûteuses : modifications directes des tests, fichiers frères `*.test.ts`, mappages de source explicites et dépendants du graphe d'importation local. Les modifications de configuration/configuration/package n'exécutent pas des tests étendus sauf si vous utilisez explicitement `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed` est la porte de contrôle locale intelligente normale pour le travail étroit. Il classe la différence en cœur, tests de cœur, extensions, tests d'extension, applications, documentation, métadonnées de version, outillage Docker en direct et outillage, puis exécute les commandes de vérification de type, de lint et de garde correspondantes. Il n'exécute pas les tests Vitest ; appelez `pnpm test:changed` ou un `pnpm test <target>` explicite pour la preuve de test. Les incrémentations de version uniquement métadonnées de version exécutent des vérifications ciblées de version/configuration/dépendances racines, avec une garde qui rejette les modifications de package en dehors du champ de version de niveau supérieur.
    - Les modifications du harnais ACP Docker en direct exécutent des vérifications ciblées : syntaxe shell pour les scripts d'authentification Docker en direct et un essai à sec du planificateur Docker en direct. Les modifications `package.json` ne sont incluses que lorsque la différence est limitée à `scripts["test:docker:live-*"]` ; les modifications de dépendance, d'exportation, de version et d'autres éditions de surface de package utilisent toujours les gardes plus larges.
    - Les tests unitaires à importation légère des agents, commandes, plugins, assistants de réponse automatique, `plugin-sdk` et zones utilitaires pures similaires transitent par la voie `unit-fast`, qui ignore `test/setup-openclaw-runtime.ts` ; les fichiers lourds avec état/à l'exécution restent sur les voies existantes.
    - Certains fichiers source assistants `plugin-sdk` et `commands` sélectionnés mappent également les exécutions en mode modifié aux tests frères explicites dans ces voies légères, de sorte que les modifications d'assistants évitent de réexécuter la suite lourde complète pour ce répertoire.
    - `auto-reply` dispose de compartiments dédiés pour les assistants de niveau supérieur, les tests d'intégration `reply.*` de niveau supérieur et le sous-arbre `src/auto-reply/reply/**`. Le CI divise davantage le sous-arbre de réponse en shards agent-exécuteur, répartition et commandes/routage d'état afin qu'un compartiment à forte importation ne possède pas toute la file d'attente Node.
    - Le CI PR/main normal ignore intentionnellement le balayage par lot d'extension et le shard `agentic-plugins` uniquement pour la version. La validation complète de la version distribue le workflow enfant distinct `Plugin Prerelease` pour ces suites lourdes en plugins/extensions sur les candidats à la version.

  </Accordion>

  <Accordion title="Couverture du runner intégré">

    - Lorsque vous modifiez les entrées de découverte de message-tool ou le
      contexte d'exécution de la compaction, conservez les deux niveaux de
      couverture.
    - Ajoutez des régressions d'assistant ciblées pour les limites de routage
      pur et de normalisation.
    - Maintenez les suites d'intégration du runner intégré en bonne santé :
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` et
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
    - Ces suites vérifient que les identifiants délimités et le comportement de
      compaction passent toujours par les vrais chemins `run.ts` / `compact.ts` ; les tests
      d'assistant uniquement ne sont pas un substitut suffisant à ces chemins
      d'intégration.

  </Accordion>

  <Accordion title="Pool Vitest et paramètres d'isolement par défaut">

    - La configuration de base de Vitest utilise par défaut `threads`.
    - La configuration partagée de Vitest fixe `isolate: false` et utilise
      le runner non isolé pour les configurations des projets racines, e2e et
      live.
    - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais
      s'exécute également sur le runner non isolé partagé.
    - Chaque shard `pnpm test` hérite des mêmes paramètres par défaut
      `threads` + `isolate: false` de la configuration partagée
      de Vitest.
    - `scripts/run-vitest.mjs` ajoute `--no-maglev` pour les processus enfants
      Node de Vitest par défaut pour réduire l'activité de compilation V8 lors
      des exécutions locales importantes. Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` pour comparer
      avec le comportement standard de V8.

  </Accordion>

  <Accordion title="Itération locale rapide">

    - `pnpm changed:lanes` indique quelles voies architecturales sont déclenchées par un diff.
    - Le hook pre-commit sert uniquement au formatage. Il remet en zone de préparation (restage) les fichiers formatés et
      n'exécute pas lint, typecheck, ou les tests.
    - Exécutez `pnpm check:changed` explicitement avant le handoff ou le push lorsque vous
      avez besoin de la porte de vérification locale intelligente.
    - `pnpm test:changed` route par défaut via des voies délimitées peu coûteuses. Utilisez
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` uniquement lorsque l'agent
      décide qu'une modification de harnais, de configuration, de package ou de contrat nécessite vraiment une couverture
      Vitest plus large.
    - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement
      de routage, simplement avec une limite de travailleurs plus élevée.
    - L'auto-mise à l'échelle des travailleurs locaux est intentionnellement conservatrice et se désengage
      lorsque la charge moyenne de l'hôte est déjà élevée, afin que plusieurs exécutions
      Vitest simultanées causent moins de dégâts par défaut.
    - La configuration Vitest de base marque les fichiers de projets/configuration comme
      `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage
      des tests change.
    - La configuration conserve `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes
      pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez
      un emplacement de cache explicite pour le profilage direct.

  </Accordion>

  <Accordion title="Perf debugging">

    - `pnpm test:perf:imports` active le rapport de durée d'import Vitest ainsi que
      la sortie de décomposition des imports.
    - `pnpm test:perf:imports:changed` limite la même vue de profilage aux
      fichiers modifiés depuis `origin/main`.
    - Les données de synchronisation des shards sont écrites dans `.artifacts/vitest-shard-timings.json`.
      Les exécutions de configuration complète utilisent le chemin de configuration comme clé ; les shards CI de modèle d'inclusion
      ajoutent le nom du shard afin que les shards filtrés puissent être suivis
      séparément.
    - Lorsqu'un test à chaud passe encore la majeure partie de son temps dans les imports de démarrage,
      gardez les dépendances lourdes derrière une jointure `*.runtime.ts` locale étroite et
      mockez cette jointure directement au lieu d'importer profondément les helpers d'exécution juste
      pour les transmettre à `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les
      `test:changed` acheminés avec le chemin natif du projet racine pour ce diff
      validé et imprime le temps écoulé ainsi que le RSS max macOS.
    - `pnpm test:perf:changed:bench -- --worktree` effectue des benchmarks sur l'arbre
      sale actuel en acheminant la liste des fichiers modifiés via
      `scripts/test-projects.mjs` et la configuration racine Vitest.
    - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour
      le démarrage Vitest/Vite et la surcharge de transformation.
    - `pnpm test:perf:profile:runner` écrit les profils CPU+tas du lanceur pour
      la suite unitaire avec le parallélisme de fichiers désactivé.

  </Accordion>
</AccordionGroup>

### Stabilité (Gateway)

- Commande : `pnpm test:stability:gateway`
- Configuration : `vitest.gateway.config.ts`, forcée à un worker
- Portée :
  - Démarre un véritable Gateway en boucle avec les diagnostics activés par défaut
  - Fait passer des messages synthétiques de passerelle, de la mémoire et une activité intense de charges utiles volumineuses via le chemin d'événement de diagnostic
  - Interroge `diagnostics.stability` via le Gateway WS RPC
  - Couvre les helpers de persistance du bundle de stabilité de diagnostic
  - Affirme que l'enregistreur reste borné, que les échantillons RSS synthétiques restent sous le budget de pression et que les profondeurs de file d'attente par session se vident pour revenir à zéro
- Attentes :
  - Sûr pour la CI et sans clé
  - Voie étroite pour le suivi de régression de stabilité, et non un substitut à la suite complète Gateway

### E2E (agrégat de dépôt)

- Commande : `pnpm test:e2e`
- Portée :
  - Exécute le lane E2E de fumée du Gateway
  - Exécute le lane E2E du navigateur Control UI simulé
- Attentes :
  - Sans clé et sûr pour la CI
  - Nécessite que Playwright Chromium soit installé

### E2E (fumée du Gateway)

- Commande : `pnpm test:e2e:gateway`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`, et les tests E2E de bundled-plugin sous `extensions/`
- Par défaut d'exécution :
  - Utilise Vitest `threads` avec `isolate: false`, comme le reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console détaillée.
- Portée :
  - Comportement de bout en bout du Gateway multi-instance
  - Surfaces WebSocket/HTTP, appariement de nœuds et réseau plus lourd
- Attentes :
  - S'exécute dans la CI (lorsqu'il est activé dans le pipeline)
  - Aucune clé réelle requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E (navigateur simulé Control UI)

- Commande : `pnpm test:ui:e2e`
- Config : `test/vitest/vitest.ui-e2e.config.ts`
- Fichiers : `ui/src/**/*.e2e.test.ts`
- Portée :
  - Démarre le Control UI Vite
  - Pilote une page Chromium réelle via Playwright
  - Remplace le WebSocket du Gateway par des simulations déterministes dans le navigateur
- Attentes :
  - S'exécute dans la CI dans le cadre de `pnpm test:e2e`
  - Aucun Gateway, agent ou clé de provider réel requis
  - La dépendance du navigateur doit être présente (`pnpm --dir ui exec playwright install chromium`)

### E2E : Fumée du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `extensions/openshell/src/backend.e2e.test.ts`
- Portée :
  - Démarre un Gateway OpenShell isolé sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw via un `sandbox ssh-config` réel + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution par défaut `pnpm test:e2e`
  - Nécessite un `openshell`CLI CLI local ainsi qu'un daemon Docker opérationnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (providers réels + models réels)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`, `test/**/*.live.test.ts`, et les tests live de bundled-plugin sous `extensions/`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - "Est-ce que ce provider/model fonctionne réellement _aujourd'hui_ avec de vraies identifiants ?"
  - Détecter les changements de format de provider, les bizarreries de tool-calling, les problèmes d'auth et le comportement des limites de taux
- Attentes :
  - Non stable en CI par conception (réseaux réels, politiques réelles des providers, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Privilégiez l'exécution de sous-ensembles réduits plutôt que de "tout"
- Les exécutions Live utilisent des clés API déjà exportées et des profils d'auth mis en scène.
- Par défaut, les exécutions Live isolent toujours les `HOME` et copient le matériel de config/auth dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre `~/.openclaw` réel.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests live utilisent votre véritable répertoire personnel.
- `pnpm test:live` fonctionne par défaut en mode plus silencieux : il conserve la sortie de progression `[live] ...` et réduit le bruit des journaux d'amorçage de la passerelle et des bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au fournisseur) : définissez API`*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une substitution par live via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponses de limite de débit.
- Sortie de progression/heartbeat :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels fournisseurs longs soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de console Vitest afin que les lignes de progression fournisseur/passerelle diffusent immédiatement lors des exécutions live.
  - Ajustez les heartbeats de modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les heartbeats de passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Modification du réseau de la passerelle / protocole WS / appairage : ajoutez `pnpm test:e2e`
- Débogage de "mon bot est en panne" / échecs spécifiques au fournisseur / appel d'outil : exécutez un `pnpm test:live` ciblé

## Tests Live (touchant au réseau)

Pour la matrice de modèles live, smokes backend CLI, smokes ACP, harnais Codex app-server
et tous les tests live de fournisseur média (Deepgram, BytePlus, ComfyUI, image,
musique, vidéo, harnais média) - ainsi que la gestion des identifiants pour les exécutions live - voir
[Testing live suites](CLIDeepgram/en/help/testing-live). Pour la liste de contrôle dédiée à la validation
des mises à jour et plugins, voir
[Testing updates and plugins](/fr/help/testing-updates-plugins).

## Runners Docker (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker se divisent en deux catégories :

- Exécuteurs de modèle en direct : `test:docker:live-models` et `test:docker:live-gateway` exécutent uniquement leur fichier live correspondant à la clé de profil dans l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de configuration local, votre espace de travail et le fichier d'environnement de profil facultatif. Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les exécuteurs live Docker utilisent par défaut une limite de smoke plus petite afin qu'un balayage Docker complet reste pratique :
  `test:docker:live-models` par défaut à `OPENCLAW_LIVE_MAX_MODELS=12`, et
  `test:docker:live-gateway` par défaut à `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Remplacez ces env vars lorsque vous
  souhaitez explicitement le scan exhaustif plus vaste.
- `test:docker:all`Docker construit l'image live Docker une fois via `test:docker:live-build`OpenClawnpm, empaquète OpenClaw une fois en tant qu'archive tar npm via `scripts/package-openclaw-for-docker.mjs`, puis construit/réutilise deux images `scripts/e2e/Dockerfile`. L'image bare est uniquement le runner Node/Git pour les voies d'installation/de mise à jour/dépendances de plugins ; ces voies montent l'archive préconstruite. L'image fonctionnelle installe la même archive dans `/app`Docker pour les voies de fonctionnalité d'application construite. Les définitions des voies Docker résident dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur réside dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. L'agrégat utilise un planificateur local pondéré : `OPENCLAW_DOCKER_ALL_PARALLELISM`npm contrôle les slots de processus, tandis que les plafonds de ressources empêchent les voies lourdes live, npm-install et multi-service de démarrer toutes en même temps. Si une seule voie est plus lourde que les plafonds actifs, le planificateur peut tout de même la démarrer lorsque le pool est vide, puis la laisse tourner seule jusqu'à ce que la capacité soit à nouveau disponible. Les valeurs par défaut sont 10 slots, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; ajustez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`DockerDockerOpenClaw uniquement lorsque l'hôte Docker dispose de plus de marge. Le runner effectue par défaut une pré-vérification Docker, supprime les conteneurs E2E OpenClaw obsolètes, imprime le statut toutes les 30 secondes, stocke les temps de voie réussis dans `.artifacts/docker-tests/lane-timings.json` et utilise ces temps pour démarrer d'abord les voies plus longues lors des exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1`Docker pour imprimer le manifeste des voies pondérées sans construire ni exécuter Docker, ou `node scripts/test-docker-all.mjs --plan-json` pour imprimer le plan CI pour les voies sélectionnées, les besoins de package/image et les identifiants.
- `Package Acceptance` est la passerelle de paquet native GitHub pour « est-ce que cette archive tar installable fonctionne en tant que produit ? ». Elle résout un paquet candidat à partir de `source=npm`, `source=ref`, `source=url` ou `source=artifact`, le télécharge en tant que `package-under-test`, puis exécute les voies E2E Docker réutilisables sur cette archive tar exacte au lieu de réempaqueter la référence sélectionnée. Les profils sont ordonnés par portée : `smoke`, `package`, `product` et `full`. Voir [Testing updates and plugins](/fr/help/testing-updates-plugins) pour le contrat paquet/mise à jour/plugin, la matrice de survie des mises à jour publiées, les valeurs par défaut de publication et le triage des échecs.
- Les vérifications de build et de publication exécutent `scripts/check-cli-bootstrap-imports.mjs` après tsdown. Le garde parcourt le graphe de construction statique à partir de `dist/entry.js` et `dist/cli/run-main.js` et échoue si le démarrage avant répartition importe des dépendances de paquet telles que Commander, l'interface d'invite (prompt UI), undici ou la journalisation avant la répartition de commande ; il maintient également le bloc d'exécution de passerelle regroupé sous le budget et rejette les importations statiques des chemins de passerelle froids connus. Le test de fumée du CLI empaqueté couvre également l'aide racine, l'aide d'intégration (onboard), l'aide médecin (doctor), le statut, le schéma de configuration et une commande de liste de modèles.
- La compatibilité héritée de l'acceptation de paquets est plafonnée à `2026.4.25` (`2026.4.25-beta.*` incluse). Jusqu'à cette limite, le harnais tolère uniquement les lacunes de métadonnées des paquets expédiés : entrées d'inventaire QA privées omises, `gateway install --wrapper` manquant, fichiers de correctifs manquants dans le dispositif git dérivé de l'archive tar, `update.channel` persistant manquant, emplacements d'enregistrement d'installation de plugin hérités, persistance d'enregistrement d'installation de marketplace manquante et migration des métadonnées de configuration pendant `plugins update`. Pour les paquets après `2026.4.25`, ces chemins sont des échecs stricts.
- Container smoke runners : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:release-user-journey`, `test:docker:release-typed-onboarding`, `test:docker:release-media-memory`, `test:docker:release-upgrade-user-journey`, `test:docker:release-plugin-marketplace`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix` et `test:docker:config-reload` lancent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de niveau supérieur.

Les runners Docker de model en direct montent également par liaison uniquement les répertoires d'authentification DockerCLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin que CLI OAuth externe puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- ACP bind smoke : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh` ; couvre Claude, Codex et Gemini par défaut, avec une couverture stricte de Droid/OpenCode via `pnpm test:docker:live-acp-bind:droid` et `pnpm test:docker:live-acp-bind:opencode`)
- Smoke du backend CLI : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Observability smokes : `pnpm qa:otel:smoke`, `pnpm qa:prometheus:smoke` et `pnpm qa:observability:smoke` sont des voies de vérification de source privées pour le QA. Elles ne font pas volontairement partie des voies de publication de paquets Docker car l'archive npm omet le QA Lab.
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Npm tarball onboarding/channel/agent smoke : `pnpm test:docker:npm-onboard-channel-agent` installe l'archive OpenClaw empaquetée globalement dans Docker, configure OpenAI via la référence d'environnement d'onboarding ainsi que Telegram par défaut, exécute le docteur et exécute un tour d'agent simulé OpenAI. Réutilisez une archive préconstruite avec `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sautez la reconstruction de l'hôte avec `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, ou changez de channel avec `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` ou `OPENCLAW_NPM_ONBOARD_CHANNEL=slack`.

- Release user journey smoke : `pnpm test:docker:release-user-journey` installe l'archive OpenClaw empaquetée globalement dans un home Docker propre, exécute l'onboarding, configure un fournisseur OpenAI simulé, exécute un tour d'agent, installe/désinstalle des plugins externes, configure ClickClack sur un appareil local, vérifie la messagerie sortante/entrante, redémarre Gateway et exécute le docteur.
- Release typed onboarding smoke : `pnpm test:docker:release-typed-onboarding` installe l'archive empaquetée, pilote `openclaw onboard` via un TTY réel, configure OpenAI comme fournisseur env-ref, vérifie l'absence de persistance de clé brute et exécute un tour d'agent simulé.
- Release media/memory smoke : `pnpm test:docker:release-media-memory` installe l'archive empaquetée, vérifie la compréhension d'image à partir d'une pièce jointe PNG, la sortie de génération d'image compatible OpenAI, la recherche de mémoire et la survie du rappel à travers le redémarrage du Gateway.
- Test de fumée du parcours utilisateur de mise à niveau de version : `pnpm test:docker:release-upgrade-user-journey` installe `openclaw@latest` par défaut, configure l'état du fournisseur/du plugin/de ClickClack sur le package publié, effectue une mise à niveau vers le tarball candidat, puis relance le parcours principal de l'agent/du plugin/du canal. Remplacez la ligne de base avec `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>`.
- Test de fumée de la marketplace de plugins de version : `pnpm test:docker:release-plugin-marketplace` installe à partir d'une marketplace de fixture locale, met à jour le plugin installé, le désinstalle et vérifie que le plugin CLI disparaît avec les métadonnées d'installation nettoyées.
- Test de fumée d'installation de compétence : `pnpm test:docker:skill-install` installe le tarball OpenClaw empaqueté globalement dans Docker, désactive les installations d'archives téléchargées dans la configuration, résout le slug de compétence ClawHub en direct actuel à partir de la recherche, l'installe avec `openclaw skills install` et vérifie la compétence installée ainsi que les métadonnées d'origine/verrouillage `.clawhub`.
- Test de fumée de changement de canal de mise à jour : `pnpm test:docker:update-channel-switch` installe le tarball OpenClaw empaqueté globalement dans Docker, passe du package `stable` à git `dev`, vérifie que le canal persistant et le plugin fonctionnent après la mise à jour, puis repasse au package `stable` et vérifie l'état de la mise à jour.
- Test de fumée de survie de mise à niveau : `pnpm test:docker:upgrade-survivor` installe le tarball OpenClaw empaqueté sur un fixture d'ancien utilisateur sale avec des agents, une configuration de canal, des listes d'autorisation de plugins, un état obsolète des dépendances de plugins et des fichiers d'espace de travail/session existants. Il exécute la mise à jour du package ainsi qu'un docteur non interactif sans clés de fournisseur ou de canal en direct, puis démarre une Gateway en boucle et vérifie la préservation de la configuration/de l'état ainsi que les budgets de démarrage/de statut.
- Test de survie de mise à niveau publiée : `pnpm test:docker:published-upgrade-survivor` installe `openclaw@latest` par défaut, sème des fichiers d'utilisateur existants réalistes, configure cette base de référence avec une recette de commande intégrée, valide la configuration résultante, met à jour cette installation publiée vers l'archive candidate, exécute le doctor en mode non interactif, écrit `.artifacts/upgrade-survivor/summary.json`, puis démarre une Gateway en boucle locale et vérifie les intentions configurées, la préservation de l'état, le démarrage, `/healthz`, `/readyz` et les budgets d'état RPC. Remplacer une base de référence par `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, demander au planificateur agrégé d'étendre les bases locales exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` telles que `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, et étendre les fixtures de type problème avec `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` telles que `reported-issues` ; l'ensemble des problèmes signalés inclut `configured-plugin-installs` pour la réparation automatique de l'installation du plugin externe OpenClaw. Acceptation de package expose ceux-ci sous forme de `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` et `published_upgrade_survivor_scenarios`, résout les jetons de méta-base de référence tels que `last-stable-4` ou `all-since-2026.4.23`, et la Validation Complète de Release étend la porte de package de release-soak à `last-stable-4 2026.4.23 2026.5.2 2026.4.15` plus `reported-issues`.
- Test de fumée du contexte d'exécution de session : `pnpm test:docker:session-runtime-context` vérifie la persistance de la transcription du contexte d'exécution caché ainsi que la réparation par le doctor des branches de réécriture de prompt dupliquées affectées.
- Test de fumée de l'installation globale Bun : `bash scripts/e2e/bun-global-install-smoke.sh` empaquette l'arborescence actuelle, l'installe avec `bun install -g` dans un répertoire personnel isolé, et vérifie que `openclaw infer image providers --json` renvoie les fournisseurs d'images groupés au lieu de bloquer. Réutiliser une archive préconstruite avec `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sauter la construction de l'hôte avec `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0`, ou copier `dist/` depuis une image Docker construite avec `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Installer Docker smoke : Docker`bash scripts/test-install-sh-docker.sh` partage un cache npm unique entre ses conteneurs racine, de mise à jour et direct-npm. La smoke de mise à jour utilise par défaut npm `latest` comme base stable avant de passer à l'archive candidate. Remplacez-le localement par `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22`, ou avec l'entrée `update_baseline_version` du workflow Install Smoke sur GitHub. Les vérifications de l'installateur non-root conservent un cache npm isolé afin que les entrées de cache détenues par root ne masquent pas le comportement d'installation local à l'utilisateur. Définissez `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` pour réutiliser le cache racine/mise à jour/direct-npm lors des exécutions locales répétées.
- Install Smoke CI ignore la mise à jour globale duplicate direct-npm avec `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` ; exécutez le script localement sans cette variable d'environnement lorsque la couverture directe `npm install -g` est nécessaire.
- Agents delete shared workspace CLI smoke : `pnpm test:docker:agents-delete-shared-workspace` (script : `scripts/e2e/agents-delete-shared-workspace-docker.sh`) construit par défaut l'image Dockerfile racine, initialise deux agents avec un espace de travail dans un répertoire personnel de conteneur isolé, exécute `agents delete --json`, et vérifie le JSON valide ainsi que le comportement de l'espace de travail conservé. Réutilisez l'image install-smoke avec `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Réseautage Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke : `pnpm test:docker:browser-cdp-snapshot` (script : `scripts/e2e/browser-cdp-snapshot-docker.sh`) construit l'image source E2E plus une couche Chromium, démarre Chromium avec CDP brut, exécute `browser doctor --deep`, et vérifie que les instantanés de rôle CDP couvrent les liens URL, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de frame.
- Régression OpenAI Responses web_search minimal reasoning : OpenAI`pnpm test:docker:openai-web-search-minimal` (script : `scripts/e2e/openai-web-search-minimal-docker.sh`OpenAIGateway) exécute un serveur OpenAI simulé via Gateway, vérifie que `web_search` déclenche `reasoning.effort` de `minimal` à `low`Gateway, puis force le rejet du schéma du provider et vérifie que les détails bruts apparaissent dans les journaux Gateway.
- Pont de channel MCP (Gateway amorcé + pont stdio + test de fumée du cadre de notification Claude brut) : Gateway`pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Outils MCP du bundle Pi (serveur MCP stdio réel + test de fumée d'acceptation/refus du profil Pi embarqué) : `pnpm test:docker:pi-bundle-mcp-tools` (script : `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Nettoyage MCP Cron/subagent (Gateway réel + démontage de l'enfant MCP stdio après des exécutions cron isolées et des subagents ponctuels) : Gateway`pnpm test:docker:cron-mcp-cleanup` (script : `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Plugins (test de fumée d'installation/mise à jour pour le chemin local, `file:`npmnpmClawHub, le registre npm avec dépendances hissées, les métadonnées de package npm malformées, les références git mobiles, la cuisine évier de ClawHub, les mises à jour de la place de marché, et l'activation/inspection du bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)
  Définissez `OPENCLAW_PLUGINS_E2E_CLAWHUB=0`ClawHub pour ignorer le bloc ClawHub, ou remplacez la paire par défaut de package/runtime de la cuisine évier par `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` et `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`. Sans `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`ClawHub, le test utilise un serveur de fixture local ClawHub hermétique.
- Test de fumée de mise à jour de plugin inchangée : `pnpm test:docker:plugin-update` (script : `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Plugin lifecycle matrix smoke: `pnpm test:docker:plugin-lifecycle-matrix`OpenClawnpmnpm installe l'archive tarball OpenClaw empaquetée dans un conteneur vierge, installe un plugin npm, active/désactive, effectue des montées et descentes de version via un registre npm local, supprime le code installé, puis vérifie que la désinstallation supprime toujours l'état obsolète tout en enregistrant les métriques RSS/CPU pour chaque phase du cycle de vie.
- Config reload metadata smoke: `pnpm test:docker:config-reload` (script: `scripts/e2e/config-reload-source-docker.sh`)
- Plugins: `pnpm test:docker:plugins` couvre les tests de fumée d'installation/mise à jour pour le chemin local, `file:`npmClawHub, le registre npm avec des dépendances hissées, les références git mobiles, les fixtures ClawHub, les mises à jour du marketplace, et l'activation/inspection des bundles Claude. `pnpm test:docker:plugin-update` couvre le comportement de mise à jour inchangée pour les plugins installés. `pnpm test:docker:plugin-lifecycle-matrix`npm couvre l'installation, l'activation, la désactivation, la mise à niveau, la rétrogradation et la désinstallation de code manquant pour les plugins npm avec suivi des ressources.

Pour préconstruire et réutiliser manuellement l'image fonctionnelle partagée :

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Les remplacements d'images spécifiques aux suites, tels que `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`, priment toujours lorsqu'ils sont définis. Lorsque `OPENCLAW_SKIP_DOCKER_BUILD=1`Docker pointe vers une image partagée distante, les scripts la tirent si elle n'est pas déjà locale. Les tests Docker du QR et de l'installateur conservent leurs propres Dockerfiles car ils valident le comportement de package/installation plutôt que le runtime de l'application construite partagée.

Les runners Docker live-model montent également l'extraction actuelle en lecture seule (bind-mount) et la placent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest par rapport à votre source/configuration locale exacte. L'étape de préparation ignore les caches volumineux locaux uniquement et les sorties de build de l'application tels que Docker`.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et les répertoires de sortie Gradle ou `.build`Docker locaux à l'application, afin que les exécutions live Docker ne passent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` afin que les sondes live du Gateway ne démarrent pas de vrais workers de channel Telegram/Discord/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, donc passez également `OPENCLAW_LIVE_GATEWAY_*`Docker lorsque vous devez restreindre ou exclure la couverture live du Gateway de cette voie Docker. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur Gateway OpenClaw avec les points de terminaison HTTP compatibles OpenAI activés, démarre un conteneur Open WebUI épinglé contre ce Gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une vraie demande de chat via le proxy `/api/chat/completions` d'Open WebUI. Définissez `OPENWEBUI_SMOKE_MODE=models` pour les vérifications CI de la voie de publication qui doivent s'arrêter après la connexion et la découverte de model sur Open WebUI, sans attendre de completion de model live. La première exécution peut être sensiblement plus lente car Docker peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie attend une clé de model live utilisable. Fournissez-la via l'environnement de processus, les profils d'authentification mis en scène, ou une `OPENCLAW_PROFILE_FILE` explicite. Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un vrai compte Telegram, Discord ou iMessageGateway. Il démarre un conteneur Gateway amorcé, démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations acheminées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements live, l'acheminement des envois sortants, et les notifications de channel + autorisations de style Claude sur le vrai pont stdio MCP. La vérification des notifications inspecte directement les trames stdio MCP brutes, de sorte que le test de fumée valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à exposer. `test:docker:pi-bundle-mcp-tools`Docker est déterministe et n'a pas besoin d'une clé de model live. Il construit l'image Docker du repo, démarre un vrai serveur de sonde MCP stdio à l'intérieur du conteneur, matérialise ce serveur via le runtime MCP du bundle Pi intégré, exécute l'outil, puis vérifie que `coding` et `messaging` conservent les outils `bundle-mcp` tandis que `minimal` et `tools.deny: ["bundle-mcp"]` les filtrent. `test:docker:cron-mcp-cleanup`Gateway est déterministe et n'a pas besoin d'une clé de model live. Il démarre un Gateway amorcé avec un vrai serveur de sonde MCP stdio, exécute un tour cron isolé et un tour enfant unique `sessions_spawn`, puis vérifie que le processus enfant MCP se termine après chaque exécution.

Test de fumé de fil en langage clair ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les flux de travail de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils ACP, donc ne le supprimez pas.

Env vars utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` monté et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` pour vérifier uniquement les env vars sourcés depuis `OPENCLAW_PROFILE_FILE`, en utilisant des répertoires de config/workspace temporaires et aucun montage d'auth CLI externe
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (par défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installs CLI mises en cache dans Docker
- Les répertoires/fichiers d'auth CLI externes sous `$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions de provider restreintes ne montent que les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les réexécutions qui ne nécessitent pas de reconstruction
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du magasin de profils (pas de l'env)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le modèle exposé par la passerelle pour le smoke test Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer le prompt de vérification de nonce utilisé par le smoke test Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer le tag d'image Open WebUI épinglé

## Docs sanity

Exécutez les vérifications de docs après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Offline regression (CI-safe)

Il s'agit de régressions de « vrai pipeline » sans vrais fournisseurs :

- Gateway tool calling (mock OpenAI, real gateway + agent loop) : GatewayOpenAI`src/gateway/gateway.test.ts`OpenAI (cas : "exécute un appel d'outil mock OpenAI de bout en bout via la boucle de l'agent gateway")
- Gateway wizard (WS Gateway`wizard.start`/`wizard.next`, writes config + auth enforced) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant sur ws et écrit la config du jeton d'auth")

## Agent reliability evals (Skills)

Nous avons déjà quelques tests sûrs pour la CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Mock tool-calling via la vraie boucle gateway + agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les Skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les Skills sont répertoriés dans le prompt, l'agent choisit-il la bonne Skill (ou évite-t-il celles qui ne sont pas pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios multi-tours qui affirment l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les futures évaluations doivent d'abord rester déterministes :

- Un scénario de test utilisant des mock providers pour affirmer les appels d'outils + l'ordre, les lectures de fichiers de Skills, et le câblage de session.
- Une petite suite de scénarios axés sur les Skills (utilisation vs évitement, filtrage, injection de prompt).
- Évaluations en direct optionnelles (opt-in, env-gated) uniquement après la mise en place de la suite sûre pour la CI.

## Contract tests (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son contrat d'interface. Ils parcourent tous les plugins découverts et exécutent une suite d'assertions de forme et de comportement. La voie `pnpm test` unitaire ignore intentionnellement ces fichiers de jointure partagée et de smoke ; exécutez les commandes de contrat explicitement lorsque vous touchez aux surfaces partagées de channel ou de provider.

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

- **status** - Sonde de statut de channel
- **registry** - Forme du registre de plugins

### Contrats de provider

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection de l'authentification
- **catalog** - API du catalogue de models API
- **discovery** - Découverte de plugins
- **loader** - Chargement de plugins
- **runtime** - Runtime du provider
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exportations ou sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de channel ou de provider
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests de contrat s'exécutent dans CI et ne nécessitent pas de clés API réelles.

## Ajouter des régressions (conseils)

Lorsque vous corrigez un problème de provider/model découvert en live :

- Ajoutez si possible une régression compatible CI (provider simulé/bouchonné, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement uniquement en live (limites de débit, stratégies d'auth), gardez le test live étroit et optionnel via des env vars
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bug de conversion/relecture de requête provider → test direct de models
  - bogue du pipeline de session/historique/tool de la passerelle → test de fumée en direct de la passerelle ou test simulé de la passerelle sûr pour la CI
- Garantie de sécurité de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les ids d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les ids de cibles non classifiés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.

## Connexes

- [Tests en direct](/fr/help/testing-live)
- [Tests des mises à jour et des plugins](/fr/help/testing-updates-plugins)
- [CI](/fr/ci)
