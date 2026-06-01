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
**La stack QA (qa-lab, qa-channel, live transport lanes)** est documentée séparément :

- [Aperçu QA](/fr/concepts/qa-e2e-automation) - architecture, surface de commande, rédaction de scénarios.
- [QA Matrix](/fr/concepts/qa-matrix) - référence pour `pnpm openclaw qa matrix`.
- [QA channel](/fr/channels/qa-channelDocker) - le plugin de transport synthétique utilisé par les scénarios basés sur le dépôt.

Cette page traite de l'exécution des suites de tests régulières et des runners Docker/Parallels. La section des runners spécifiques QA ci-dessous ([QA-specific runners](#qa-specific-runners)) répertorie les appels concrets `qa` et fait référence aux documents ci-dessus.

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
  - Installe l'archive tar OpenClaw empaquetée dans Docker, exécute l'onboarding de clé OpenAI de API, et vérifie que le plugin Codex et la dépendance `@openai/codex` ont été téléchargés à la demande dans la racine du projet géré par npm.
- Test de fumée de la dépendance de l'outil de plugin en direct : `pnpm test:docker:live-plugin-tool`
  - Empaquette un plugin fixture avec une véritable dépendance `slugify`, l'installe via
    `npm-pack:`, vérifie la dépendance sous la racine du projet géré par npm,
    puis demande à un model OpenAI en direct d'appeler le tool du plugin et de retourner le slug
    caché.
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
- `pnpm openclaw qa coverage --match <query>`
  - Recherche les ID de scénarios, titres, surfaces, ID de couverture, références de docs, références de code,
    plugins et exigences de provider, puis imprime les cibles de suite correspondantes.
  - Utilisez ceci avant une exécution QA Lab lorsque vous connaissez le comportement modifié ou le chemin de fichier
    mais pas le plus petit scénario. Ce n'est qu'indicatif ; choisissez toujours mock,
    live, Multipass, Matrix ou transport proof en fonction du comportement modifié.
- `pnpm test:plugins:kitchen-sink-live`
  - Exécute la série complète de tests du plugin Kitchen Sink OpenAI en direct via QA Lab. Elle installe le package Kitchen Sink externe, vérifie l'inventaire de la surface du SDK du plugin, sonde OpenAI`/healthz` et `/readyz`OpenAIOpenAI, enregistre les preuves CPU/RSS de la passerelle, exécute un tour OpenAI en direct et vérifie les diagnostics contradictoires. Nécessite une authentification OpenAI en direct telle que `OPENAI_API_KEY`. Dans les sessions Testbox hydratées, elle source automatiquement le profil live-auth de Testbox lorsque l'assistant `openclaw-testbox-env` est présent.
- `pnpm test:gateway:cpu-scenarios`
  - Exécute le benchmark de démarrage de la passerelle plus un petit pack de scénarios QA Lab simulés (`channel-chat-baseline`, `memory-failure-fallback`, `gateway-restart-inflight-run`) et écrit un résumé combiné des observations CPU sous `.artifacts/gateway-cpu-scenarios/`.
  - Signale par défaut uniquement les observations CPU chaudes soutenues (`--cpu-core-warn` plus `--hot-wall-warn-ms`), de sorte que les courtes pics de démarrage sont enregistrés comme métriques sans ressembler à la régression de blocage de la passerelle qui dure plusieurs minutes.
  - Utilise les artefacts `dist` construits ; lancez d'abord une build lorsque le checkout ne possède pas déjà une sortie d'exécution fraîche.
- `pnpm openclaw qa suite --runner multipass`
  - Exécute la même suite QA dans une VM Linux Multipass jetable.
  - Conserve le même comportement de sélection de scénario que `qa suite` sur l'hôte.
  - Réutilise les mêmes indicateurs de sélection de fournisseur/modèle que `qa suite`.
  - Les exécutions en direct transmettent les entrées d'authentification QA prises en charge qui sont pratiques pour l'invité : les clés de fournisseur basées sur l'environnement, le chemin de configuration du fournisseur live QA, et `CODEX_HOME` si présent.
  - Les répertoires de sortie doivent rester sous la racine du repo afin que l'invité puisse écrire en retour via l'espace de travail monté.
  - Écrit le rapport QA normal + le résumé ainsi que les journaux Multipass sous `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Démarre le site QA soutenu par Docker pour le travail de style opérateur.
- `pnpm test:docker:npm-onboard-channel-agent`
  - Génère une archive tarball npm à partir de l'extraction actuelle, l'installe globalement dans Docker, exécute l'onboarding non-interactif de la clé OpenAI API, configure Telegram par défaut, vérifie que le runtime du plugin empaqueté se charge sans réparation des dépendances au démarrage, exécute doctor, et exécute un tour d'agent local sur un endpoint OpenAI simulé.
  - Utilisez `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` pour exécuter la même voie d'installation de package avec Discord.
- `pnpm test:docker:session-runtime-context`
  - Exécute un test de fumée Docker déterministe d'application construite pour les transcriptions de contexte d'exécution intégré. Il vérifie que le contexte d'exécution caché OpenClaw est conservé en tant que message personnalisé non affiché au lieu de fuir dans le tour utilisateur visible, puis insère un fichier session JSONL brisé affecté et vérifie que `openclaw doctor --fix` le réécrit vers la branche active avec une sauvegarde.
- `pnpm test:docker:npm-telegram-live`
  - Installe un candidat de package OpenClaw dans Docker, exécute l'onboarding du package installé, configure Telegram via la CLI installée, puis réutilise la voie QA Telegram en direct avec ce package installé en tant que Gateway SUT.
  - Le wrapper monte uniquement la source du harnais `qa-lab` à partir de l'extraction ; le package installé possède `dist`, `openclaw/plugin-sdk` et le runtime du plugin groupé, de sorte que la voie ne mélange pas les plugins de l'extraction actuelle dans le package testé.
  - Par défaut, utilise `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta` ; définissez `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` ou `OPENCLAW_CURRENT_PACKAGE_TGZ` pour tester une archive tarball locale résolue au lieu d'installer depuis le registre.
  - Utilise les mêmes identifiants d'environnement Telegram ou la source d'identifiants Convex que Telegram`pnpm openclaw qa telegram`. Pour l'automatisation CI/release, définissez `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` ainsi que `OPENCLAW_QA_CONVEX_SITE_URL` et le secret de rôle. Si `OPENCLAW_QA_CONVEX_SITE_URL`Docker et un secret de rôle Convex sont présents dans la CI, l'enveloppe Docker sélectionne automatiquement Convex.
  - L'enveloppe valide les identifiants d'environnement Telegram ou Convex sur l'hôte avant le travail de build/install Docker. Définissez TelegramDocker`OPENCLAW_NPM_TELEGRAM_SKIP_CREDENTIAL_PREFLIGHT=1` uniquement lors du débogage délibéré de la configuration pré-identifiants.
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` remplace le `OPENCLAW_QA_CREDENTIAL_ROLE` partagé pour cette voie uniquement.
  - Les Actions GitHub exposent cette voie en tant que workflow de maintenance manuel GitHub`NPM Telegram Beta E2E`. Il ne s'exécute pas lors de la fusion. Le workflow utilise l'environnement `qa-live-shared` et les baux d'identifiants Convex CI.
- Les Actions GitHub exposent également GitHub`Package Acceptance`npm pour une preuve de produit en exécution parallèle contre un package candidat. Il accepte une référence de confiance, une spec npm publiée, une URL d'archive tar HTTPS plus SHA-256, ou un artefact d'archive tar d'une autre exécution, télécharge le `openclaw-current.tgz` normalisé en tant que `package-under-test`Docker, puis exécute le planificateur E2E Docker existant avec les profils de voie smoke, package, product, full ou custom. Définissez `telegram_mode=mock-openai` ou `live-frontier`Telegram pour exécuter le workflow QA Telegram contre le même artefact `package-under-test`.
  - Preuve de produit pour la dernière bêta :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- La preuve par URL d'archive tar exacte nécessite un condensé et utilise la politique de sécurité d'URL publique :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- Les miroirs d'archive tar Enterprise/privés utilisent une stratégie explicite de source de confiance :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=trusted-url \
  -f trusted_source_id=enterprise-artifactory \
  -f package_url=https://packages.example.internal:8443/artifactory/openclaw/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

`source=trusted-url` lit `.github/package-trusted-sources.json` depuis la référence de workflow de confiance et n'accepte pas les identifiants d'URL ni un contournement de réseau privé par entrée de workflow. Si la stratégie nommée déclare une authentification bearer, configurez le secret fixe `OPENCLAW_TRUSTED_PACKAGE_TOKEN`.

- La preuve par artefact télécharge un artefact d'archive tar depuis une autre exécution d'Actions :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:plugins`
  - Empaquette et installe la version actuelle d'OpenClaw dans Docker, démarre la Gateway
    avec OpenAI configuré, puis active les channels/plugins groupés via des modifications de
    configuration.
  - Vérifie que la découverte de la configuration laisse les plugins téléchargeables non configurés absents,
    que la première réparation du docteur configuré installe explicitement chaque plugin
    téléchargeable manquant, et qu'un second redémarrage n'exécute pas la réparation des dépendances
    cachées.
  - Installe également une base de référence npm connue plus ancienne, active Telegram avant d'exécuter
    `openclaw update --tag <candidate>`, et vérifie que le docteur post-mise à jour du candidat nettoie les débris des dépendances des plugins hérités sans
    réparation post-installation côté harnais.
- `pnpm test:parallels:npm-update`
  - Exécute le test de fumée de mise à jour de l'installation packagée native sur les invités Parallels. Chaque
    plateforme sélectionnée installe d'abord le package de base demandé, puis exécute
    la commande installée `openclaw update` sur le même invité et vérifie la
    version installée, le statut de mise à jour, la disponibilité de la passerelle et un tour d'agent
    local.
  - Utilisez `--platform macos`, `--platform windows` ou `--platform linux` lors de
    l'itération sur un invité. Utilisez `--json` pour le chemin de l'artefact de résumé et
    le statut par voie.
  - La voie OpenAI utilise `openai/gpt-5.5` pour la preuve en direct du tour d'agent par
    défaut. Passez `--model <provider/model>` ou définissez
    `OPENCLAW_PARALLELS_OPENAI_MODEL` lors de la validation délibérée d'un autre
    modèle OpenAI.
  - Enveloppez les exécutions locales longues dans un délai d'attente hôte afin que les arrêts du transport Parallels ne puissent
    pas consommer le reste de la fenêtre de tests :

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - Le script écrit des journaux de voie imbriqués sous `/tmp/openclaw-parallels-npm-update.*`.
    Inspectez `windows-update.log`, `macos-update.log` ou `linux-update.log`
    avant de supposer que l'enveloppe extérieure est bloquée.
  - La mise à jour Windows peut passer de 10 à 15 minutes dans le docteur post-mise à jour et le travail de
    mise à jour du package sur un invité à froid ; cela est encore sain lorsque le journal de débogage
    npm imbriqué progresse.
  - N'exécutez pas cet agrégateur de wrapper en parallèle avec les Parallèles individuels
    macOS, Windows ou les voies de test de fumée Linux. Ils partagent l'état de la VM et peuvent entrer en collision lors de
    la restauration de l'instantané, la diffusion des paquets ou l'état de la passerelle invité.
  - La vérification post-mise à jour exécute la surface normale du plugin groupé car
    les façades de capacités telles que la parole, la génération d'images et la compréhension
    multimédia sont chargées via les API d'exécution groupées même lorsque le tour
    de l'agent lui-même ne vérifie qu'une réponse textuelle simple.

- `pnpm openclaw qa aimock`
  - Démarre uniquement le serveur provider AIMock local pour les tests de fumée
    directs du protocole.
- `pnpm openclaw qa matrix`
  - Exécute la voie de QA en direct Matrix contre un serveur domestique Tuwunel éphémère soutenu par Docker. Réservé au checkout du code source - les installations groupées n'incluent pas `qa-lab`.
  - CLI complet, catalogue de profils/scénarios, env vars, et disposition des artefacts : [QA Matrix](/fr/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Exécute la voie de QA en direct Telegram contre un groupe privé réel en utilisant les jetons de bot du pilote et du SUT provenant de l'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. L'identifiant du groupe doit être l'identifiant de chat numérique Telegram.
  - Prend en charge `--credential-source convex` pour les informations d'identification mises en commun partagées. Utilisez le mode env par défaut, ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` pour opter pour les baux mis en commun.
  - Les valeurs par défaut couvrent canary, mention gating, l'adressage des commandes, `/status`, les réponses mentionnées de bot à bot et les réponses aux commandes natives principales. Les valeurs par défaut `mock-openai` couvrent également les régressions déterministes de chaîne de réponses et de diffusion de message final Telegram. Utilisez `--list-scenarios` pour des sondes facultatives telles que `session_status`.
  - Se termine avec un code non nul lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque vous
    souhaitez des artefacts sans code de sortie d'échec.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable bot à bot, activez le mode de communication bot-à-bot dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact de messages observés sous `.artifacts/qa-e2e/...`. Les scénarios de réponse incluent le temps aller-retour (RTT) depuis la demande d'envoi du pilote jusqu'à la réponse observée du SUT.

`Mantis Telegram Live` est le wrapper de preuve de PR autour de cette voie. Il exécute le candidat avec des identifiants Telegram loués via Convex, affiche la transcription des messages observés expurgés dans un navigateur de bureau Crabbox, enregistre des preuves MP4, génère un GIF rogné par mouvement, télécharge le bundle d'artefacts et publie des preuves PR en ligne via l'application Mantis GitHub lorsque `pr_number` est défini. Les mainteneurs peuvent le démarrer depuis l'interface Actions via `Mantis Scenario` (`scenario_id: telegram-live`) ou directement depuis un commentaire de demande de tirage (pull request) :

```text
@openclaw-mantis telegram
@openclaw-mantis telegram scenario=telegram-status-command
@openclaw-mantis telegram scenarios=telegram-status-command,telegram-mentioned-message-reply
```

`Mantis Telegram Desktop Proof` est le wrapper agentique natif avant/après Telegram Desktop pour la preuve visuelle PR. Démarrez-le depuis l'interface Actions avec `instructions` libre, via `Mantis Scenario` (`scenario_id: telegram-desktop-proof`), ou depuis un commentaire de PR :

```text
@openclaw-mantis telegram desktop proof
```

L'agent Mantis lit la PR, décide quel comportement visible Telegram prouve le changement, exécute la voie de preuve Crabbox Telegram Desktop utilisateur réel sur les références de base et candidates, itère jusqu'à ce que les GIF natifs soient utiles, écrit un manifeste `motionPreview` apparié et publie le même tableau GIF à 2 colonnes via l'application Mantis GitHub lorsque `pr_number` est défini.

- `pnpm openclaw qa mantis telegram-desktop-builder`
  - Loue ou réutilise un bureau Crabbox Linux, installe Telegram Desktop natif, configure OpenClaw avec un jeton de bot SUT Telegram loué, démarre la passerelle et enregistre des preuves de capture d'écran/MP4 depuis le bureau VNC visible.
  - La valeur par défaut est `--credential-source convex`, donc les workflows n'ont besoin que du secret du broker Convex. Utilisez `--credential-source env` avec les mêmes variables `OPENCLAW_QA_TELEGRAM_*` que `pnpm openclaw qa telegram`.
  - Telegram Desktop a toujours besoin d'une connexion utilisateur/profil. Le jeton du bot ne configure qu'OpenClaw. Utilisez TelegramOpenClaw`--telegram-profile-archive-env <name>` pour une archive de profil `.tgz` en base64, ou utilisez `--keep-lease` et connectez-vous manuellement une fois via VNC.
  - Écrit `mantis-telegram-desktop-builder-report.md`, `mantis-telegram-desktop-builder-summary.json`, `telegram-desktop-builder.png` et `telegram-desktop-builder.mp4` dans le répertoire de sortie.

Les voies de transport en direct (live transport lanes) partagent un contrat standard pour que les nouveaux transports ne dérivent pas ; la matrice de couverture par voie se trouve dans [QA overview → Live transport coverage](/fr/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` est la suite synthétique large et ne fait pas partie de cette matrice.

### Identifiants Telegram partagés via Convex (v1)

Lorsque `--credential-source convex` (ou `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`DiscordSlackWhatsApp) est activé pour les tests QA de transport en direct, le labo QA acquiert un bail exclusif depuis un pool alimenté par Convex, maintient ce bail par pulsation (heartbeat) tant que la voie est en cours d'exécution, et libère le bail à l'arrêt. Le nom de la section précède le support de Discord, Slack et WhatsApp ; le contrat de bail est partagé entre les types.

Référence de la structure de projet Convex :

- `qa/convex-credential-broker/`

Variables d'environnement requises :

- `OPENCLAW_QA_CONVEX_SITE_URL` (par exemple `https://your-deployment.convex.site`)
- Un secret pour le rôle sélectionné :
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` pour `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` pour `ci`
- Sélection du rôle d'identifiant :
  - CLI : CLI`--credential-role maintainer|ci`
  - Défaut d'env : `OPENCLAW_QA_CREDENTIAL_ROLE` (par défaut `ci` dans CI, `maintainer` sinon)

Variables d'environnement facultatives :

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (défaut `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (défaut `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (défaut `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (défaut `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (défaut `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (trace id optionnel)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permet les URL Convex en boucle locale `http://` pour un développement uniquement local.

`OPENCLAW_QA_CONVEX_SITE_URL` doit utiliser `https://` en fonctionnement normal.

Les commandes d'administration du mainteneur (pool add/remove/list) nécessitent
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` spécifiquement.

Assistants CLI pour les mainteneurs :

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Utilisez `doctor` avant les exécutions en direct pour vérifier l'URL du site Convex, les secrets du broker,
le préfixe du point de terminaison, le délai d'attente HTTP et l'accessibilité de l'admin/liste sans imprimer
les valeurs secrètes. Utilisez `--json` pour une sortie lisible par machine dans les scripts et les utilitaires CI.

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
- `POST /admin/add` (secret mainteneur uniquement)
  - Requête : `{ kind, actorId, payload, note?, status? }`
  - Succès : `{ status: "ok", credential }`
- `POST /admin/remove` (secret mainteneur uniquement)
  - Requête : `{ credentialId, actorId }`
  - Succès : `{ status: "ok", changed, credential }`
  - Garantie de bail actif : `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (secret mainteneur uniquement)
  - Requête : `{ kind?, status?, includePayload?, limit? }`
  - Succès : `{ status: "ok", credentials, count }`

Structure de la charge utile pour le type Telegram :

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId`Telegram doit être une chaîne d'ID de conversation channel numérique.
- `admin/add` valide cette structure pour `kind: "telegram"` et rejette les charges utiles malformées.

Structure de la charge utile pour le type d'utilisateur réel Telegram :

- `{ groupId: string, sutToken: string, testerUserId: string, testerUsername: string, telegramApiId: string, telegramApiHash: string, tdlibDatabaseEncryptionKey: string, tdlibArchiveBase64: string, tdlibArchiveSha256: string, desktopTdataArchiveBase64: string, desktopTdataArchiveSha256: string }`
- `groupId`, `testerUserId` et `telegramApiId` doivent être des chaînes numériques.
- `tdlibArchiveSha256` et `desktopTdataArchiveSha256` doivent être des chaînes hexadécimales SHA-256.
- `kind: "telegram-user"`Telegram est réservé au workflow de preuve Mantis Telegram Desktop. Les voies QA Lab génériques ne doivent pas l'acquérir.

Charges utiles multi-canal validées par le courtier :

- Discord : Discord`{ guildId: string, channelId: string, driverBotToken: string, sutBotToken: string, sutApplicationId: string, voiceChannelId?: string }`
- WhatsApp : WhatsApp`{ driverPhoneE164: string, sutPhoneE164: string, driverAuthArchiveBase64: string, sutAuthArchiveBase64: string, groupJid?: string }`

Les voies Slack peuvent également louer depuis le pool, mais la validation de la charge utile Slack réside actuellement dans le runner QA Slack plutôt que dans le courtier. Utilisez SlackSlackSlack`{ channelId: string, driverBotToken: string, sutBotToken: string, sutAppToken: string }`Slack pour les lignes Slack.

### Ajout d'un channel à la QA

L'architecture et les noms des assistants de scénario pour les nouveaux adaptateurs de canal se trouvent dans [QA overview → Adding a channel](/fr/concepts/qa-e2e-automation#adding-a-channel). La barre minimale : implémenter le runner de transport sur le joint d'hôte partagé `qa-lab`, déclarer `qaRunners` dans le manifeste du plugin, monter en tant que `openclaw qa <runner>` et rédiger des scénarios sous `qa/scenarios/`.

## Suites de tests (ce qui s'exécute où)

Considérez les suites comme « un réalisme croissant » (et une instabilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Configuration : les exécutions non ciblées utilisent le jeu de shards `vitest.full-*.config.ts` et peuvent étendre les shards multi-projets en configurations par projet pour la planification parallèle
- Fichiers : inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts` et `test/**/*.test.ts` ; les tests unitaires de l'UI s'exécutent dans le shard dédié `unit-ui`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en cours de processus (authentification de passerelle, routage, outils, analyse, configuration)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans la CI
  - Aucune clé réelle requise
  - Doit être rapide et stable
  - Les tests de résolveur et de chargeur de surface publique doivent prouver un comportement de repli `api.js` et `runtime-api.js` large avec de minuscules fixtures de plugin générés, et non les API source de plugins groupés réels. Les chargements d'API de plugin réel appartiennent aux suites de contrat/intégration propres au plugin.

Politique de dépendance native :

- Les installations de test par défaut ignorent les constructions natives opus optionnelles de Discord. La voix Discord utilise `libopus-wasm` groupé, et `@discordjs/opus` reste désactivé dans `allowBuilds` afin que les tests locaux et les voies Testbox ne compilent pas le module natif.
- Comparez les performances opus natives dans le dépôt de benchmark `libopus-wasm`, et non dans les boucles d'installation/test par défaut de OpenClaw. Ne définissez pas `@discordjs/opus` sur `true` dans le `allowBuilds` par défaut ; cela ferait compiler du code natif lors de boucles d'installation/test sans rapport.

<AccordionGroup>
  <Accordion title="Projets, shards et lanes délimitées">

    - Le `pnpm test` non ciblé exécute douze configurations de shard plus petites (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus géant de projet racine natif. Cela réduit le RSS de pointe sur les machines chargées et évite que le travail de réponse automatique/d'extension ne prive les suites indépendantes.
    - `pnpm test --watch` utilise toujours le graphe de projet racine natif `vitest.config.ts`, car une boucle de surveillance multi-shard n'est pas pratique.
    - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent d'abord les cibles de fichiers/répertoires explicites via des lanes délimitées, afin que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
    - `pnpm test:changed` développe par défaut les chemins git modifiés en lanes délimitées peu coûteuses : modifications directes de tests, fichiers `*.test.ts` frères, mappages de source explicites et dépendants du graphe d'importation locaux. Les modifications de configuration/configuration/package n'exécutent pas de tests étendus sauf si vous utilisez explicitement `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed`Docker est la porte de vérification locale intelligente normale pour un travail étroit. Il classe la différence en core, tests core, extensions, tests d'extensions, applications, docs, métadonnées de version, outilage Docker en direct, et outilage, puis exécute les commandes typecheck, lint et guard correspondantes. Il n'exécute pas les tests Vitest ; appelez `pnpm test:changed` ou `pnpm test <target>`DockerDockerDocker explicite pour la preuve de test. Les incrémentations de version uniquement pour les métadonnées de version exécutent des vérifications ciblées de version/configuration/racine-dépendance, avec une garde qui rejette les modifications de package en dehors du champ de version de premier niveau.
    - Les modifications du harnais ACP Docker en direct exécutent des vérifications ciblées : syntaxe shell pour les scripts d'auth Docker en direct et une exécution à sec du planificateur Docker en direct. Les modifications `package.json` sont incluses uniquement lorsque la différence est limitée à `scripts["test:docker:live-*"]` ; les modifications de dépendance, d'exportation, de version et d'autres surfaces de package utilisent toujours les gardes plus larges.
    - Les tests unitaires à importation légère provenant des agents, commandes, plugins, aides de réponse automatique, `plugin-sdk` et zones utilitaires pures similaires transitent par la lane `unit-fast`, qui ignore `test/setup-openclaw-runtime.ts` ; les fichiers lourds avec état/runtime restent sur les lanes existantes.
    - Certains fichiers source d'aide `plugin-sdk` et `commands` sélectionnés mappent également les exécutions en mode modifié à des tests frères explicites dans ces lanes légères, afin que les modifications d'aide évitent de réexécuter la suite lourde complète pour ce répertoire.
    - `auto-reply` possède des buckets dédiés pour les aides core de premier niveau, les tests d'intégration `reply.*` de premier niveau et le sous-arbre `src/auto-reply/reply/**`. Le CI divise davantage le sous-arbre de réponse en shards agent-runner, dispatch et commands/state-routing afin qu'un bucket à forte importation ne possède pas la totalité de la queue Node.
    - Le CI PR/main normal ignore intentionnellement le balayage de lot d'extension et le shard `agentic-plugins` uniquement pour la version. La validation complète de la version envoie le workflow enfant distinct `Plugin Prerelease` pour ces suites lourdes en plug-ins/extensions sur les candidats à la version.

  </Accordion>

  <Accordion title="Embedded runner coverage">

    - Lorsque vous modifiez les entrées de découverte de message-tool ou le contexte d'exécution de la compaction, maintenez les deux niveaux de couverture.
    - Ajoutez des régressions d'assistance ciblées pour les limites de routage pur et de normalisation.
    - Maintenez les suites d'intégration du runner intégré en bonne santé :
      `src/agents/embedded-agent-runner/compact.hooks.test.ts`,
      `src/agents/embedded-agent-runner/run.overflow-compaction.test.ts`, et
      `src/agents/embedded-agent-runner/run.overflow-compaction.loop.test.ts`.
    - Ces suites vérifient que les identifiants délimités et le comportement de compaction circulent toujours à travers les vrais chemins `run.ts` / `compact.ts` ; les tests d'assistance uniquement ne constituent pas un substitut suffisant à ces chemins d'intégration.

  </Accordion>

  <Accordion title="Vitest pool and isolation defaults">

    - La configuration de base Vitest est `threads` par défaut.
    - La configuration partagée Vitest fixe `isolate: false` et utilise le runner non isolé pour les configurations des projets racines, e2e et live.
    - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute également sur le runner partagé non isolé.
    - Chaque shard `pnpm test` hérite des mêmes valeurs par défaut `threads` + `isolate: false` de la configuration partagée Vitest.
    - `scripts/run-vitest.mjs` ajoute `--no-maglev` pour les processus enfants Node de Vitest par défaut afin de réduire l'activité de compilation V8 lors des grandes exécutions locales.
      Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` pour comparer avec le comportement standard V8.
    - `scripts/run-vitest.mjs` termine les exécutions Vitest non-watch explicites après
      5 minutes sans sortie stdout ou stderr. Définissez
      `OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS=0` pour désactiver le chien de garde pour une
      investigation volontairement silencieuse.

  </Accordion>

  <Accordion title="Itération locale rapide">

    - `pnpm changed:lanes` indique quels volets architecturaux sont déclenchés par une diff.
    - Le crochet de pré-commit (pre-commit hook) est réservé au formatage. Il remet les fichiers formatés dans la zone de préparation (staging)
      et n'exécute pas le lint, le typecheck ou les tests.
    - Exécutez `pnpm check:changed` explicitement avant le transfert ou le push lorsque vous
      avez besoin de la passerelle de vérification locale intelligente.
    - `pnpm test:changed` route par défaut via des volets délimités peu coûteux. Utilisez
      `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` uniquement lorsque l'agent
      décide qu'une modification de harnais, de configuration, de package ou de contrat nécessite vraiment une couverture Vitest plus large.
    - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement de routage,
      simplement avec une limite de workers plus élevée.
    - La mise à l'échelle automatique des workers locaux est intentionnellement conservatrice et s'atténue
      lorsque la charge moyenne de l'hôte est déjà élevée, afin que plusieurs exécutions Vitest simultanées
      causent moins de dégâts par défaut.
    - La configuration Vitest de base marque les fichiers de projets/configurations comme
      `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage des tests change.
    - La configuration garde `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge ;
      définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous voulez
      un emplacement de cache explicite pour le profilage direct.

  </Accordion>

  <Accordion title="Perf debugging">

    - `pnpm test:perf:imports` active le rapport de durée d'import Vitest ainsi que
      la sortie de ventilation des imports.
    - `pnpm test:perf:imports:changed` limite la même vue de profilage aux
      fichiers modifiés depuis `origin/main`.
    - Les données de chronométrage des partitions sont écrites dans `.artifacts/vitest-shard-timings.json`.
      Les exécutions de configuration complète utilisent le chemin de la configuration comme clé ; les partitions CI avec motif d'inclusion
      ajoutent le nom de la partition afin que les partitions filtrées puissent être suivies
      séparément.
    - Lorsqu'un test à chaud passe toujours la majeure partie de son temps dans les imports de démarrage,
      gardez les dépendances lourdes derrière une jointure `*.runtime.ts` locale étroite et
      mockez directement cette jointure au lieu d'importer en profondeur des helpers d'exécution juste
      pour les transmettre via `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les
      `test:changed` acheminés par rapport au chemin natif du projet racine pour ce diff
      commité et affiche le temps écoulé ainsi que le RSS maximal macOS.
    - `pnpm test:perf:changed:bench -- --worktree` effectue des benchmarks sur l'arbre
      sale actuel en acheminant la liste des fichiers modifiés via
      `scripts/test-projects.mjs` et la configuration racine Vitest.
    - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour
      le démarrage Vitest/Vite et la surcharge de transformation.
    - `pnpm test:perf:profile:runner` écrit des profils CPU+tas pour le lanceur
      de la suite unitaire avec le parallélisme de fichiers désactivé.

  </Accordion>
</AccordionGroup>

### Stabilité (Gateway)

- Commande : `pnpm test:stability:gateway`
- Configuration : `vitest.gateway.config.ts`, forcée à un worker
- Portée :
  - Démarre un Gateway en boucle réelle avec les diagnostics activés par défaut
  - Entraîne une agitation synthétique de messages de passerelle, de mémoire et de charges utiles volumineuses via le chemin des événements de diagnostic
  - Interroge `diagnostics.stability` via le Gateway WS RPC
  - Couvre les helpers de persistance du bundle de stabilité de diagnostic
  - Affirme que l'enregistreur reste borné, que les échantillons RSS synthétiques restent sous le budget de pression et que les profondeurs de file d'attente par session se vident pour revenir à zéro
- Attentes :
  - Sûr pour la CI et sans clé
  - Voie étroite pour le suivi des régressions de stabilité, pas un substitut à la suite complète du Gateway

### E2E (agrégat de dépôt)

- Commande : `pnpm test:e2e`
- Portée :
  - Exécute la suite E2E de test rapide du Gateway
  - Exécute la suite E2E du navigateur de Control UI simulé
- Attentes :
  - Sûr pour la CI et sans clé
  - Nécessite que Playwright Chromium soit installé

### E2E (gateway smoke)

- Commande : `pnpm test:e2e:gateway`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`, et les tests E2E des bundled-plugin sous `extensions/`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `threads` avec `isolate: false`, comme le reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console détaillée.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appairage de nœuds et réseau plus lourd
- Attentes :
  - S'exécute dans la CI (lorsqu'elle est activée dans le pipeline)
  - Aucune clé réelle requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E (navigateur simulé Control UI)

- Commande : `pnpm test:ui:e2e`
- Config : `test/vitest/vitest.ui-e2e.config.ts`
- Fichiers : `ui/src/**/*.e2e.test.ts`
- Portée :
  - Démarre le Control UI Vite
  - Pilote une vraie page Chromium via Playwright
  - Remplace le WebSocket du Gateway par des simulacres déterministes dans le navigateur
- Attentes :
  - S'exécute dans la CI dans le cadre de `pnpm test:e2e`
  - Aucun Gateway réel, d'agents ou de clés de provider requis
  - La dépendance de navigateur doit être présente (`pnpm --dir ui exec playwright install chromium`)

### E2E : test rapide du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `extensions/openshell/src/backend.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell d'OpenClaw via un vrai `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution par défaut de `pnpm test:e2e`
  - Nécessite un CLI `openshell` local ainsi qu'un daemon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (providers réels + models réels)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`, `test/**/*.live.test.ts`, et les tests live du bundled-plugin sous `extensions/`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - "Est-ce que ce provider/model fonctionne réellement _aujourd'hui_ avec de vraies identifiants ?"
  - Détecter les changements de format de provider, les particularités des appels de tools, les problèmes d'authentification et le comportement des limites de taux
- Attentes :
  - Non stable en CI par conception (réseaux réels, politiques réelles des providers, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Préférez l'exécution de sous-ensembles restreints plutôt que de "tout"
- Les exécutions live utilisent des clés API déjà exportées et des profils d'authentification mis en scène.
- Par défaut, les exécutions live isolent toujours `HOME` et copient le matériel de configuration/auth dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre vrai `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests live utilisent votre vrai répertoire personnel.
- `pnpm test:live` fonctionne par défaut en mode plus silencieux : il conserve la sortie de progression `[live] ...` et coupe les journaux de démarrage de la passerelle et les bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au provider) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une priorité par live via `OPENCLAW_LIVE_*_KEY` ; les tests réessaient en cas de réponse de limite de taux.
- Sortie de progression/heartbeat :
  - Les suites live émettent désormais des lignes de progression vers stderr afin que les appels longs au provider soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de la console Vitest afin que les lignes de progression du provider/de la passerelle soient diffusées immédiatement lors des exécutions live.
  - Ajustez les heartbeats du model direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les battements de cœur de la passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez apporté beaucoup de modifications)
- Modification du réseau de la passerelle / du protocole WS / de l'appariement : ajoutez `pnpm test:e2e`
- Débogage de « mon bot est en panne » / échecs spécifiques au fournisseur / appels d'outils : exécutez un `pnpm test:live` réduit

## Tests en direct (touchant le réseau)

Pour la matrice de modèles en direct, les tests de fumée du backend CLI, les tests de fumée ACP, le harnais Codex app-server et tous les tests en direct des fournisseurs de médias (Deepgram, BytePlus, ComfyUI, image, musique, vidéo, harnais média) — ainsi que la gestion des identifiants pour les exécutions en direct — consultez [Testing live suites](/fr/help/testing-live). Pour la liste de contrôle dédiée à la validation des mises à jour et des plugins, consultez [Testing updates and plugins](/fr/help/testing-updates-plugins).

## Runners Docker (vérifications facultatives « fonctionne sous Linux »)

Ces runners Docker sont divisés en deux catégories :

- Runners de modèles en direct : `test:docker:live-models` et `test:docker:live-gateway` n'exécutent que leur fichier live correspondant à la clé de profil à l'intérieur de l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de configuration local, votre espace de travail et le fichier d'environnement de profil facultatif. Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les runners live Docker gardent leurs propres limites pratiques là où c'est nécessaire :
  `test:docker:live-models` est par défaut l'ensemble pris en charge et curé de signal élevé, et
  `test:docker:live-gateway` est par défaut `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Définissez `OPENCLAW_LIVE_MAX_MODELS`
  ou les variables d'environnement de la passerelle lorsque vous voulez explicitement une limite plus petite ou une analyse plus large.
- `test:docker:all`Docker construit une seule fois l'image Docker live via `test:docker:live-build`OpenClawnpm, empaquette OpenClaw une seule fois en tant qu'archive tar npm via `scripts/package-openclaw-for-docker.mjs`, puis construit/réutilise deux images `scripts/e2e/Dockerfile`. L'image nue est uniquement le lanceur Node/Git pour les voies d'installation/de mise à jour/de dépendances de plug-in ; ces voies montent l'archive préconstruite. L'image fonctionnelle installe la même archive dans `/app`Docker pour les voies de fonctionnalités de l'application construite. Les définitions des voies Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur se trouve dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. L'agrégat utilise un planificateur local pondéré : `OPENCLAW_DOCKER_ALL_PARALLELISM`npm contrôle les emplacements de processus, tandis que les limites de ressources empêchent les voies lourdes live, npm-install et multi-service de démarrer toutes en même temps. Si une seule voie est plus lourde que les limites actives, le planificateur peut tout de même la démarrer lorsque le pool est vide, puis la garder en cours d'exécution seule jusqu'à ce que la capacité soit à nouveau disponible. Les valeurs par défaut sont 10 emplacements, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10`, et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; ajustez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT`DockerDockerOpenClaw uniquement lorsque l'hôte Docker dispose de plus de marge. Le lanceur effectue une vérification préalable Docker par défaut, supprime les conteneurs E2E OpenClaw obsolètes, imprime le statut toutes les 30 secondes, stocke les durées de voie réussies dans `.artifacts/docker-tests/lane-timings.json`, et utilise ces durées pour démarrer d'abord les voies plus longues lors des exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1`Docker pour imprimer le manifeste des voies pondérées sans construire ni exécuter Docker, ou `node scripts/test-docker-all.mjs --plan-json` pour imprimer le plan CI pour les voies sélectionnées, les besoins de package/image et les informations d'identification.
- `Package Acceptance` est la passerelle de paquet native GitHub pour "cette archive tar installable fonctionne-t-elle comme un produit ?". Elle résout un candidat unique à partir de `source=npm`, `source=ref`, `source=url`, ou `source=artifact`, le télécharge sous la forme `package-under-test`, puis exécute les voies E2E Docker réutilisables sur cette archive tar exacte au lieu de réempaqueter la référence sélectionnée. Les profils sont classés par étendue : `smoke`, `package`, `product` et `full`. Consultez [Testing updates and plugins](/fr/help/testing-updates-plugins) pour le contrat paquet/mise à jour/plugin, la matrice de survie des mises à jour publiées, les valeurs par défaut de publication et le triage des échecs.
- Les vérifications de build et de version exécutent `scripts/check-cli-bootstrap-imports.mjs` après tsdown. Le garde parcourt le graphe de build statique à partir de `dist/entry.js` et `dist/cli/run-main.js` et échoue si le démarrage avant répartition importe des dépendances de paquet telles que Commander, l'interface utilisateur d'invite, undici ou la journalisation avant la répartition des commandes ; il maintient également le bloc d'exécution de la passerelle regroupée sous le budget et rejette les importations statiques des chemins de passerelle froids connus. Le test de fumée du CLI empaqueté couvre également l'aide racine, l'aide d'intégration, l'aide du docteur, l'état, le schéma de configuration et une commande de liste de modèles.
- La compatibilité héritée de l'acceptation de paquets est plafonnée à `2026.4.25` (`2026.4.25-beta.*` incluse). Jusqu'à cette limite, le harnais tolère uniquement les lacunes de métadonnées des paquets expédiés : entrées d'inventaire QA privées omises, `gateway install --wrapper` manquant, fichiers de correctifs manquants dans le git fixture dérivé de l'archive tar, `update.channel` persistant manquant, emplacements des enregistrements d'installation de plugins hérités, persistance des enregistrements d'installation du marketplace manquante et migration des métadonnées de configuration pendant `plugins update`. Pour les paquets après `2026.4.25`, ces chemins sont des échecs stricts.
- Container smoke runners : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:release-user-journey`, `test:docker:release-typed-onboarding`, `test:docker:release-media-memory`, `test:docker:release-upgrade-user-journey`, `test:docker:release-plugin-marketplace`, `test:docker:skill-install`, `test:docker:update-channel-switch`, `test:docker:upgrade-survivor`, `test:docker:published-upgrade-survivor`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:agent-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update`, `test:docker:plugin-lifecycle-matrix` et `test:docker:config-reload` démarrant un ou plusieurs conteneurs réels et vérifiant les chemins d'intégration de niveau supérieur.
- Les voies E2E Docker/Bash qui installent l'archive tar OpenClaw empaquetée via DockerOpenClaw`scripts/lib/openclaw-e2e-instance.sh` plafonnent `npm install` à `OPENCLAW_E2E_NPM_INSTALL_TIMEOUT` (par défaut `600s` ; définissez `0` pour désactiver le wrapper pour le débogage).

Les runners Docker de model en direct montent également (bind-mount) uniquement les répertoires d'authentification CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin que l'OAuth CLI externe puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- ACP bind smoke : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh` ; couvre Claude, Codex et Gemini par défaut, avec une couverture stricte Droid/OpenCode via `pnpm test:docker:live-acp-bind:droid` et `pnpm test:docker:live-acp-bind:opencode`)
- CLI backend smoke : CLI`pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent : Gateway`pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Observability smokes : `pnpm qa:otel:smoke`, `pnpm qa:prometheus:smoke` et `pnpm qa:observability:smoke`Dockernpm sont des voies de checkout de source QA privées. Elles ne font pas intentionnellement partie des voies de release du package Docker car le tarball npm omet le QA Lab.
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Npm tarball onboarding/channel/agent smoke : `pnpm test:docker:npm-onboard-channel-agent`OpenClawDockerOpenAITelegramOpenAI installe le tarball OpenClaw packed globalement dans Docker, configure OpenAI via env-ref onboarding plus Telegram par défaut, exécute doctor, et exécute un tour d'agent OpenAI mocké. Réutilisez un tarball préconstruit avec `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sautez la rebuild de l'hôte avec `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, ou changez de channel avec `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` ou `OPENCLAW_NPM_ONBOARD_CHANNEL=slack`.

- Release user journey smoke : `pnpm test:docker:release-user-journey`OpenClawDockerOpenAIGateway installe le tarball OpenClaw packed globalement dans un home Docker propre, exécute l'onboarding, configure un provider OpenAI mocké, exécute un tour d'agent, installe/désinstalle des plugins externes, configure ClickClack contre un fixture local, vérifie la messagerie sortante/entrante, redémarre Gateway, et exécute doctor.
- Release typed onboarding smoke : `pnpm test:docker:release-typed-onboarding` installe le tarball packed, pilote `openclaw onboard`OpenAI via un vrai TTY, configure OpenAI comme un provider env-ref, vérifie qu'il n'y a pas de persistance de clé brute, et exécute un tour d'agent mocké.
- Release media/memory smoke : `pnpm test:docker:release-media-memory` installe l'archive tar compressée, vérifie la compréhension d'image à partir d'une pièce jointe PNG, la sortie de génération d'image compatible OpenAI, la recherche de mémoire, et la persistance de la mémoire lors des redémarrages du Gateway.
- Release upgrade user journey smoke : `pnpm test:docker:release-upgrade-user-journey` installe `openclaw@latest` par défaut, configure l'état du provider/plugin/ClickClack sur le package publié, effectue une mise à niveau vers l'archive tar candidate, puis réexécute le parcours principal de l'agent/plugin/channel. Remplacez la base de référence avec `OPENCLAW_RELEASE_UPGRADE_BASELINE_SPEC=openclaw@<version>`.
- Release plugin marketplace smoke : `pnpm test:docker:release-plugin-marketplace` installe à partir d'un marketplace de fixture local, met à jour le plugin installé, le désinstalle, et vérifie que le CLI du plugin disparaît avec les métadonnées d'installation nettoyées.
- Skill install smoke : `pnpm test:docker:skill-install` installe l'archive tar compressée OpenClaw globalement dans Docker, désactive les installations d'archive téléchargée dans la configuration, résout le slug de compétence live actuel ClawHub à partir de la recherche, l'installe avec `openclaw skills install`, et vérifie la compétence installée ainsi que les métadonnées d'origine/verrouillage `.clawhub`.
- Update channel switch smoke : `pnpm test:docker:update-channel-switch` installe l'archive tar compressée OpenClaw globalement dans Docker, passe du package `stable` à git `dev`, vérifie que le channel persistant et le plugin fonctionnent après la mise à jour, puis repasse au package `stable` et vérifie l'état de la mise à jour.
- Upgrade survivor smoke : `pnpm test:docker:upgrade-survivor` installe l'archive tar compressée OpenClaw sur une fixture d'ancien utilisateur sale avec des agents, une configuration de channel, des listes d'autorisation de plugins, un état de dépendance de plugin obsolète et des fichiers d'espace de travail/session existants. Il exécute la mise à jour du package ainsi qu'un docteur non interactif sans clés de provider ou de channel actives, puis démarre un Gateway en boucle et vérifie la préservation de la configuration/de l'état ainsi que les budgets de démarrage/statut.
- Published upgrade survivor smoke: `pnpm test:docker:published-upgrade-survivor` installe `openclaw@latest` par défaut, prépare des fichiers d'utilisateur existants réalistes, configure cette base de référence avec une recette de commande intégrée, valide la configuration résultante, met à jour cette installation publiée vers l'archive tar candidate, exécute le médecin en mode non interactif, écrit `.artifacts/upgrade-survivor/summary.json`, puis démarre un Gateway en boucle et vérifie les intentions configurées, la préservation de l'état, le démarrage, `/healthz`, `/readyz` et les budgets de statut RPC. Remplacez une base de référence par `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC`, demandez au planificateur agrégé d'étendre les bases locales exactes avec `OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPECS` telles que `openclaw@2026.5.2 openclaw@2026.4.23 openclaw@2026.4.15`, et étendez les fixtures de forme de ticket avec `OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS` telles que `reported-issues` ; l'ensemble des tickets signalés inclut `configured-plugin-installs` pour la réparation automatique de l'installation du plugin externe OpenClaw. Le package Acceptance expose ceux-ci comme `published_upgrade_survivor_baseline`, `published_upgrade_survivor_baselines` et `published_upgrade_survivor_scenarios`, résout les jetons de méta-base de référence tels que `last-stable-4` ou `all-since-2026.4.23`, et la Full Release Validation étend la porte du package de release-soak à `last-stable-4 2026.4.23 2026.5.2 2026.4.15` plus `reported-issues`.
- Session runtime context smoke: `pnpm test:docker:session-runtime-context` vérifie la persistance de la transcription du contexte d'exécution masqué ainsi que la réparation par le médecin des branches de réécriture de prompt dupliquées affectées.
- Bun global install smoke: `bash scripts/e2e/bun-global-install-smoke.sh` empaquette l'arborescence actuelle, l'installe avec `bun install -g` dans un répertoire personnel isolé et vérifie que `openclaw infer image providers --json` renvoie les fournisseurs d'images groupés au lieu de se bloquer. Réutilisez une archive tar préconstruite avec `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sautez la construction de l'hôte avec `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0` ou copiez `dist/` depuis une image Docker construite avec `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Installer Docker smoke : Docker`bash scripts/test-install-sh-docker.sh`npmnpmnpm partage un cache npm entre ses conteneurs root, update et direct-npm. Update smoke utilise par défaut npm `latest` comme base stable avant de passer à l'archive candidate. Remplacez par `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` en local, ou avec l'entrée `update_baseline_version`GitHubnpm du workflow Install Smoke sur GitHub. Les vérifications de l'installateur non-root maintiennent un cache npm isolé pour que les entrées de cache appartenant au root ne masquent pas le comportement d'installation local de l'utilisateur. Définissez `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache`npm pour réutiliser le cache root/update/direct-npm lors des réexécutions locales.
- Install Smoke CI ignore la mise à jour globale en double direct-npm avec npm`OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` ; exécutez le script localement sans cette variable d'environnement lorsque la couverture directe `npm install -g` est nécessaire.
- Agents delete shared workspace CLI smoke : CLI`pnpm test:docker:agents-delete-shared-workspace` (script : `scripts/e2e/agents-delete-shared-workspace-docker.sh`) construit par défaut l'image Dockerfile racine, initialise deux agents avec un espace de travail dans un répertoire home de conteneur isolé, exécute `agents delete --json` et vérifie le JSON valide ainsi que le comportement de l'espace de travail conservé. Réutilisez l'image install-smoke avec `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Gateway networking (deux conteneurs, auth WS + santé) : Gateway`pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke : `pnpm test:docker:browser-cdp-snapshot` (script : `scripts/e2e/browser-cdp-snapshot-docker.sh`) construit l'image source E2E plus une couche Chromium, démarre Chromium avec CDP brut, exécute `browser doctor --deep` et vérifie que les instantanés de rôle CDP couvrent les URL des liens, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de frame.
- Régression du raisonnement minimal de web_search des réponses OpenAI : OpenAI`pnpm test:docker:openai-web-search-minimal` (script : `scripts/e2e/openai-web-search-minimal-docker.sh`OpenAIGateway) exécute un serveur OpenAI simulé via Gateway, vérifie que `web_search` déclenche `reasoning.effort` de `minimal` à `low`Gateway, puis force le rejet du schéma du provider et vérifie que les détails bruts apparaissent dans les logs de Gateway.
- Pont de channel MCP (Gateway amorcé + pont stdio + test de fumée de trame de notification Claude brute) : Gateway`pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Outils MCP du bundle OpenClaw (serveur MCP stdio réel + test de fumée d'acceptation/refus du profil OpenClaw intégré) : OpenClawOpenClaw`pnpm test:docker:agent-bundle-mcp-tools` (script : `scripts/e2e/agent-bundle-mcp-tools-docker.sh`)
- Nettoyage MCP Cron/subagent (Gateway réel + démontage de l'enfant MCP stdio après des cron isolés et des exécutions de subagent ponctuelles) : Gateway`pnpm test:docker:cron-mcp-cleanup` (script : `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Plugins (test de fumée d'installation/mise à jour pour le chemin local, `file:`npmnpmClawHub, le registre npm avec dépendances hissées, les métadonnées de package npm malformées, les refs mobiles git, ClawHub fourre-tout, les mises à jour du marketplace et l'activation/inspection du bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)
  Définissez `OPENCLAW_PLUGINS_E2E_CLAWHUB=0`ClawHub pour ignorer le bloc ClawHub, ou remplacez la paire de paquet/runtime fourre-tout par défaut par `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` et `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`. Sans `OPENCLAW_CLAWHUB_URL`/`CLAWHUB_URL`ClawHub, le test utilise un serveur de fixture local ClawHub hermétique.
- Test de fumée de mise à jour de plugin inchangée : `pnpm test:docker:plugin-update` (script : `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Plugin lifecycle matrix smoke: `pnpm test:docker:plugin-lifecycle-matrix`OpenClawnpmnpm installe l'archive tar OpenClaw empaquetée dans un conteneur nu, installe un plugin npm, active/désactive, effectue des mises à niveau et des rétrogradations via un registre npm local, supprime le code installé, puis vérifie que la désinstallation supprime toujours l'état obsolète tout en journalisant les métriques RSS/CPU pour chaque phase du cycle de vie.
- Config reload metadata smoke: `pnpm test:docker:config-reload` (script: `scripts/e2e/config-reload-source-docker.sh`)
- Plugins: `pnpm test:docker:plugins` couvre les tests de fumée d'installation/mise à jour pour le chemin local, `file:`npmClawHub, le registre npm avec dépendances hissées (hoisted), les refs git en mouvement, les fixtures ClawHub, les mises à jour de la marketplace et l'activation/inspection des bundles Claude. `pnpm test:docker:plugin-update` couvre le comportement de mise à jour inchangée pour les plugins installés. `pnpm test:docker:plugin-lifecycle-matrix`npm couvre l'installation, l'activation, la désactivation, la mise à niveau, la rétrogradation et la désinstallation avec code manquant des plugins npm suivis comme ressources.

Pour préconstruire et réutiliser manuellement l'image fonctionnelle partagée :

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Les surcharges d'image spécifiques aux suites, telles que `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`, l'emportent toujours lorsqu'elles sont définies. Lorsque `OPENCLAW_SKIP_DOCKER_BUILD=1`Docker pointe vers une image partagée distante, les scripts la téléchargent si elle n'est pas déjà locale. Les tests Docker QR et d'installateur conservent leurs propres Dockerfiles car ils valident le comportement d'empaquetage/d'installation plutôt que le runtime de l'application construite partagée.

Les runners Docker de modèle en direct (live-model) montent également la copie de travail actuelle (checkout) en lecture seule et la placent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest sur votre source/configuration locale exacte. L'étape de préparation ignore les caches volumineux locaux et les sorties de build de l'application tels que Docker`.pnpm-store`, `.worktrees`, `__openclaw_vitest__``.build`, et les répertoires de sortie Gradle locaux à l'application, afin que les exécutions live Docker ne perdent pas de minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` pour que les sondes live du gateway ne démarrant pas de véritables workers de channel Telegram/Discord/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, transmettez donc également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture live du gateway de cette voie Docker. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur gateway OpenClaw avec les points de terminaison HTTP compatibles OpenAI activés, démarre un conteneur Open WebUI épinglé (pinned) contre ce gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une véritable demande de chat via le proxy `/api/chat/completions` d'Open WebUI. Définissez `OPENWEBUI_SMOKE_MODE=models` pour les vérifications CI sur le chemin de release qui doivent s'arrêter après la connexion Open WebUI et la découverte du modèle, sans attendre une completion de modèle live. La première exécution peut être sensiblement plus lente car Docker peut avoir besoin de tirer (pull) l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid (cold-start). Cette voie attend une clé de modèle live utilisable. Fournissez-la via l'environnement de processus, les profils d'authentification intermédiaires (staged), ou une variable `OPENCLAW_PROFILE_FILE` explicite. Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un compte réel Telegram, Discord ou iMessageGateway. Il démarre un conteneur Gateway amorcé (seeded), démarre un second conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations routées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements live, le routage d'envoi sortant, et les notifications de style Claude de channel + permissions sur le véritable pont MCP stdio. La vérification des notifications inspecte directement les trames MCP stdio brutes afin que le test de fumée valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à exposer. `test:docker:agent-bundle-mcp-tools` est déterministe et n'a pas besoin d'une clé de modèle live. Il construit l'image du repo Docker, démarre un véritable serveur de sonde MCP stdio à l'intérieur du conteneur, matérialise ce serveur via le runtime MCP du bundle intégré OpenClaw, exécute l'outil, puis vérifie que `coding` et `messaging` gardent les outils `bundle-mcp` tandis que `minimal` et `tools.deny: ["bundle-mcp"]` les filtrent. `test:docker:cron-mcp-cleanup`Gateway est déterministe et n'a pas besoin d'une clé de modèle live. Il démarre un Gateway amorcé avec un véritable serveur de sonde MCP stdio, exécute un tour cron isolé et un tour enfant ponctuel `sessions_spawn`, puis vérifie que le processus enfant MCP se termine après chaque exécution.

Test de fumée en langage clair de l'ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les workflows de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils de discussion ACP, ne le supprimez donc pas.

Env vars utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` monté et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` pour vérifier uniquement les env vars sourcés depuis `OPENCLAW_PROFILE_FILE`CLI, en utilisant des répertoires de configuration/espace de travail temporaires et aucun montage d'auth CLI externe
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (par défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global`CLIDocker pour les installations mises en cache du CLI à l'intérieur de Docker
- Les répertoires/fichiers d'auth CLI externes sous CLI`$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions restreintes de providers ne montent que les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les réexécutions qui ne nécessitent pas de reconstruction
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du magasin de profils (et non de l'environnement)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le model exposé par le Gateway pour le smoke test Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer le prompt de vérification nonce utilisé par le smoke test Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer le tag d'image Open WebUI épinglé

## Sanité des docs

Exécutez les vérifications de docs après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûr pour CI)

Il s'agit de régressions de « vrai pipeline » sans vrais fournisseurs :

- Appel d'outil du Gateway (mock GatewayOpenAI, vrai gateway + boucle agent) : `src/gateway/gateway.test.ts` (cas : « exécute un appel d'outil mock OpenAI de bout en bout via la boucle d'agent du gateway »)
- Assistant du Gateway (WS Gateway`wizard.start`/`wizard.next`, écriture config + auth forcée) : `src/gateway/gateway.test.ts` (cas : « exécute l'assistant via ws et écrit la config du jeton d'auth »)

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour la CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Appel d'outil simulé via la vraie boucle gateway + agent (`src/gateway/gateway.test.ts`).
- Flux d'assistant de bout en bout qui valident le câblage de session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qu'il manque encore pour les Skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque des Skills sont répertoriés dans le prompt, l'agent choisit-il le bon Skill (ou évite-t-il ceux qui ne sont pas pertinents) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios multi-tours qui affirment l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les évaluations futures doivent rester d'abord déterministes :

- Un exécuteur de scénario utilisant des fournisseurs simulés pour affirmer les appels d'outil + l'ordre, les lectures de fichiers Skill et le câblage de session.
- Une petite suite de scénarios axés sur les Skills (utilisation vs évitement, filtrage, injection de prompt).
- Évaluations en direct optionnelles (opt-in, limitées par env) uniquement après la mise en place de la suite sûre pour CI.

## Tests de contrat (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son
contrat d'interface. Ils parcourent tous les plugins découverts et exécutent une suite de
assertions de forme et de comportement. La `pnpm test` unit lane par défaut
ignore intentionnellement ces fichiers de seam partagés et de fumée ; exécutez les commandes de contrat explicitement
lorsque vous touchez aux surfaces partagées de channel ou de provider.

### Commandes

- Tous les contrats : `pnpm test:contracts`
- Contrats de channel uniquement : `pnpm test:contracts:channels`
- Contrats de provider uniquement : `pnpm test:contracts:plugins`

### Contrats de channel

Situés dans `src/channels/plugins/contracts/*.contract.test.ts` :

- **plugin** - Forme de base du plugin (id, nom, capacités)
- **setup** - Contrat de l'assistant de configuration
- **session-binding** - Comportement de liaison de session
- **outbound-payload** - Structure de payload du message
- **inbound** - Gestion des messages entrants
- **actions** - Gestionnaires d'actions de channel
- **threading** - Gestion de l'ID de fil de discussion
- **directory** - API de répertoire/liste API
- **group-policy** - Application de la stratégie de groupe

### Contrats de statut de provider

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - sondes de statut de channel
- **registry** - forme du registre de plugins

### Contrats de provider

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection d'authentification
- **catalog** - API du catalogue de model API
- **discovery** - Découverte de plugins
- **loader** - Chargement de plugins
- **runtime** - Runtime du provider
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exports ou les sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de channel ou de provider
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests de contrat s'exécutent dans CI et ne nécessitent pas de clés API réelles.

## Ajouter des régressions (guide)

Lorsque vous corrigez un problème de provider/model découvert en live :

- Ajoutez une régression compatible CI si possible (provider mock/stub, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement en live uniquement (limites de débit, stratégies d'auth), gardez le test live étroit et optionnel via des env vars
- Privilégiez le ciblage de la plus petite couche qui attrape le bogue :
  - bogue de conversion/relecture de requête provider → test direct des models
  - bug de pipeline de session/historique/tool de la passerelle → test de fumée en direct de la passerelle ou test simulé de passerelle sûr pour la CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les exec ids des segments de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille cible SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les ids de cible non classifiés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.

## Connexes

- [Tests en direct](/fr/help/testing-live)
- [Tests de mises à jour et de plugins](/fr/help/testing-updates-plugins)
- [CI](/fr/ci)
