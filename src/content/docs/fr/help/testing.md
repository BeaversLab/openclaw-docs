---
summary: "Kit de tests : suites unit/e2e/live, runners Docker, et ce que couvre chaque test"
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
**La stack QA (qa-lab, qa-channel, live transport lanes)** est documentée séparément :

- [Aperçu QA](/fr/concepts/qa-e2e-automation) — architecture, surface de commande, création de scénarios.
- [Matrix QA](/fr/concepts/qa-matrix) — référence pour `pnpm openclaw qa matrix`.
- [QA channel](/fr/channels/qa-channel) — le plugin de transport synthétique utilisé par les scénarios basés sur le repo.

Cette page couvre l'exécution des suites de tests régulières et des runners Docker/Parallels. La section des runners spécifiques QA ci-dessous ([QA-specific runners](#qa-specific-runners)) répertorie les invocations concrètes `qa` et renvoie aux références ci-dessus.

</Note>

## Quick start

La plupart des jours :

- Full gate (attendu avant le push) : `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Exécution locale plus rapide de la suite complète sur une machine puissante : `pnpm test:max`
- Boucle de surveillance directe Vitest : `pnpm test:watch`
- Le ciblage direct de fichiers route maintenant aussi les chemins d'extension/channel : `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Privilégiez d'abord les exécutions ciblées lorsque vous itérez sur un seul échec.
- Site QA avec support Docker : `pnpm qa:lab:up`
- Voie QA avec support VM Linux : `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Lorsque vous modifiez des tests ou souhaitez une confiance supplémentaire :

- Coverage gate : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de vrais providers/modèles (nécessite de vrais identifiants) :

- Suite live (modèles + sondes d'outil/image de passerelle) : `pnpm test:live`
- Cibler un fichier live en silence : `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Balayage de modèle live Docker : `pnpm test:docker:live-models`
  - Chaque model sélectionné exécute désormais un tour de texte plus une petite sonde de type lecture de fichier.
    Les models dont les métadonnées annoncent une entrée `image` exécutent également un minuscule tour d'image.
    Désactivez les sondes supplémentaires avec `OPENCLAW_LIVE_MODEL_FILE_PROBE=0` ou
    `OPENCLAW_LIVE_MODEL_IMAGE_PROBE=0` lors de l'isolement des échecs de provider.
  - Couverture CI : le `OpenClaw Scheduled Live And E2E Checks` quotidien et le `OpenClaw Release Checks` manuel
    appellent tous deux le workflow réutilisable live/E2E avec
    `include_live_suites: true`, qui inclut des travaux de matrice de model live Docker
    distincts, répartis par provider.
  - Pour des réexécutions CI ciblées, appelez `OpenClaw Live And E2E Checks (Reusable)`
    avec `include_live_suites: true` et `live_models_only: true`.
  - Ajoutez de nouveaux secrets de provider à signal fort à `scripts/ci-hydrate-live-auth.sh`
    ainsi qu'à `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml` et ses
    appelants planifiés/release.
- Test de fumée bound-chat Codex natif : `pnpm test:docker:live-codex-bind`
  - Exécute un voie live Docker contre le chemin app-server Codex, lie un DM Slack
    synthétique avec `/codex bind`, exerce `/codex fast` et
    `/codex permissions`, puis vérifie qu'une réponse simple et une pièce jointe image
    transitent par la liaison native du plugin au lieu de l'ACP.
- Test de fumée du harnais app-server Codex : `pnpm test:docker:live-codex-harness`
  - Exécute des tours d'agent de passerelle via le harnais app-server Codex détenu par le plugin,
    vérifie `/codex status` et `/codex models`, et par défaut teste les sondes image,
    cron MCP, sub-agent et Guardian. Désactivez la sonde sub-agent avec
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=0` lors de l'isolement d'autres échecs
    du app-server Codex. Pour une vérification ciblée du sub-agent, désactivez les autres sondes :
    `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0 OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_PROBE=1 pnpm test:docker:live-codex-harness`.
    Cela quitte après la sonde sub-agent sauf si
    `OPENCLAW_LIVE_CODEX_HARNESS_SUBAGENT_ONLY=0` est défini.
- Test de fumée de commande de sauvetage Crestodian : `pnpm test:live:crestodian-rescue-channel`
  - Vérification opt-in belt-and-suspenders pour la surface de commande de sauvetage
    du message-channel. Elle exerce `/crestodian status`, met en file un changement de model
    persistant, répond `/crestodian yes` et vérifie le chemin d'écriture audit/config.
- Test de fumée Docker du planificateur Crestodian : `pnpm test:docker:crestodian-planner`
  - Exécute Crestodian dans un conteneur sans configuration avec un faux Claude CLI sur `PATH`
    et vérifie que le repli du planificateur approximatif se traduit par une écriture de configuration
    typée et auditée.
- Test de fumée Docker de la première exécution de Crestodian : `pnpm test:docker:crestodian-first-run`
  - Commence à partir d'un répertoire d'état OpenClaw vide, achemine les `openclaw` nus vers
    Crestodian, applique les écritures de configuration/model/agent/plugin Discord + SecretRef,
    valide la configuration et vérifie les entrées d'audit. Le même chemin de configuration Ring 0 est
    également couvert dans le QA Lab par
    `pnpm openclaw qa suite --scenario crestodian-ring-zero-setup`.
- Test de fumée des coûts Moonshot/Kimi : avec `MOONSHOT_API_KEY` défini, lancez
  `openclaw models list --provider moonshot --json`, puis lancez un `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  isolé contre `moonshot/kimi-k2.6`. Vérifiez que le JSON rapporte Moonshot/K2.6 et que
  la transcription de l'assistant stocke les `usage.cost` normalisés.

<Tip>Lorsque vous n'avez besoin que d'un seul cas d'échec, préférez restreindre les tests en direct via les variables d'environnement de liste d'autorisation décrites ci-dessous.</Tip>

## Exécuteurs spécifiques aux QA

Ces commandes se situent à côté des suites de tests principales lorsque vous avez besoin de réalisme de type QA Lab :

L'IC exécute le QA Lab dans des flux de travail dédiés. `Parity gate` s'exécute sur les PR correspondants et
à partir du déclenchement manuel avec de faux fournisseurs. `QA-Lab - All Lanes` s'exécute chaque nuit sur
`main` et à partir du déclenchement manuel avec la porte de parité simulée, le volet Matrix en direct,
le volet Telegram en direct géré par Convex, et le volet Discord en direct géré par Convex en tant que
travaux parallèles. Les vérifications QA planifiées et de version transmettent explicitement Matrix `--profile fast`,
tandis que l'Matrix CLI et l'entrée par défaut du flux de travail manuel restent
`all` ; le déclenchement manuel peut partitionner `all` en travaux `transport`, `media`, `e2ee-smoke`,
`e2ee-deep` et `e2ee-cli`. `OpenClaw Release Checks` exécute la parité ainsi que
les volets Matrix et Telegram rapides avant l'approbation de la version.

- `pnpm openclaw qa suite`
  - Exécute des scénarios QA basés sur le dépôt directement sur l'hôte.
  - Exécute plusieurs scénarios sélectionnés en parallèle par défaut avec des workers de passerelle isolés. `qa-channel` utilise une concurrence de 4 par défaut (limitée par le nombre de scénarios sélectionnés). Utilisez `--concurrency <count>` pour ajuster le nombre de workers, ou `--concurrency 1` pour l'ancienne voie série (serial lane).
  - Se termine avec un code de sortie non nul si un scénario échoue. Utilisez `--allow-failures` lorsque vous souhaitez les artefacts sans que le code de sortie n'indique d'échec.
  - Prend en charge les modes de fournisseur `live-frontier`, `mock-openai` et `aimock`. `aimock` démarre un serveur de fournisseur local soutenu par AIMock pour une couverture expérimentale de fixtures et de mocks de protocole sans remplacer la voie `mock-openai` qui tient compte des scénarios.
- `pnpm openclaw qa suite --runner multipass`
  - Exécute la même suite QA à l'intérieur d'une VM Linux Multipass éphémère.
  - Conserve le même comportement de sélection de scénarios que `qa suite` sur l'hôte.
  - Réutilise les mêmes drapeaux de sélection de fournisseur/modèle que `qa suite`.
  - Les exécutions en mode Live transmettent les entrées d'authentification QA prises en charge qui sont pratiques pour l'invité : les clés de fournisseur basées sur des variables d'environnement, le chemin de configuration du fournisseur QA live, et `CODEX_HOME` si présent.
  - Les répertoires de sortie doivent rester sous la racine du dépôt afin que l'invité puisse écrire en retour via l'espace de travail monté.
  - Écrit le rapport QA normal + le résumé ainsi que les journaux Multipass sous `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Démarre le site QA soutenu par Docker pour un travail de style opérateur.
- `pnpm test:docker:npm-onboard-channel-agent`
  - Construit une archive tarball npm à partir de l'extraction actuelle, l'installe globalement dans Docker, exécute l'intégration non interactive de la clé API OpenAI, configure Telegram par défaut, vérifie que l'activation du plugin installe les dépendances d'exécution à la demande, exécute doctor, et effectue un tour d'agent local contre un endpoint OpenAI simulé.
  - Utilisez `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` pour exécuter la même voie d'installation empaquetée avec Discord.
- `pnpm test:docker:session-runtime-context`
  - Exécute un test de fumée Docker d'application construite déterministe pour les
    transcriptions de contexte d'exécution intégré. Il vérifie que le contexte
    d'exécution caché Docker est persisté en tant que
    message personnalisé non affiché au lieu de fuir dans le tour utilisateur visible,
    puis ensemence un JSONL de session cassée affectée et vérifie que
    `openclaw doctor --fix` le réécrit vers la branche active avec une sauvegarde.
- `pnpm test:docker:npm-telegram-live`
  - Installe un candidat de paquet OpenClaw dans Docker, exécute l'intégration
    du paquet installé, configure Telegram via la CLI installée, puis réutilise le
    canal QA Telegram en direct avec ce paquet installé en tant que Gateway SUT.
  - Par défaut, c'est `OPENCLAW_NPM_TELEGRAM_PACKAGE_SPEC=openclaw@beta` ; définissez
    `OPENCLAW_NPM_TELEGRAM_PACKAGE_TGZ=/path/to/openclaw-current.tgz` ou
    `OPENCLAW_CURRENT_PACKAGE_TGZ` pour tester une archive tar locale résolue au lieu d'
    installer depuis le registre.
  - Utilise les mêmes identifiants d'environnement Telegram ou la source d'identifiants Convex que
    `pnpm openclaw qa telegram`. Pour l'automatisation CI/release, définissez
    `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_SOURCE=convex` plus
    `OPENCLAW_QA_CONVEX_SITE_URL` et le secret de rôle. Si
    `OPENCLAW_QA_CONVEX_SITE_URL` et un secret de rôle Convex sont présents dans la CI,
    le wrapper Docker sélectionne Convex automatiquement.
  - `OPENCLAW_NPM_TELEGRAM_CREDENTIAL_ROLE=ci|maintainer` remplace le `OPENCLAW_QA_CREDENTIAL_ROLE`
    partagé pour ce canal uniquement.
  - Les actions GitHub exposent ce canal en tant que workflow manuel de maintenance
    `NPM Telegram Beta E2E`. Il ne s'exécute pas lors de la fusion. Le workflow utilise l'
    environnement `qa-live-shared` et les baux d'identifiants Convex CI.
- Les actions GitHub exposent également `Package Acceptance` pour une preuve de produit
  parallèle contre un paquet candidat. Il accepte une référence de confiance, une spec npm publiée,
  une URL d'archive tar HTTPS plus SHA-256, ou un artefact d'archive tar d'une autre exécution, télécharge
  le `openclaw-current.tgz` normalisé en tant que `package-under-test`, puis exécute le
  planificateur E2E Docker existant avec les profils de canal smoke, package, product, full ou custom.
  Définissez `telegram_mode=mock-openai` ou `live-frontier` pour exécuter le
  workflow QA Telegram contre le même artefact `package-under-test`.
  - Dernière preuve de produit bêta :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=product \
  -f telegram_mode=mock-openai
```

- La preuve par URL d'archive tar exacte nécessite un résumé :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=url \
  -f package_url=https://registry.npmjs.org/openclaw/-/openclaw-VERSION.tgz \
  -f package_sha256=<sha256> \
  -f suite_profile=package
```

- La preuve par artefact télécharge un artefact d'archive tar depuis une autre exécution d'Actions :

```bash
gh workflow run package-acceptance.yml --ref main \
  -f source=artifact \
  -f artifact_run_id=<run-id> \
  -f artifact_name=<artifact-name> \
  -f suite_profile=smoke
```

- `pnpm test:docker:bundled-channel-deps`
  - Empaquette et installe la version actuelle d'OpenClaw dans Docker, démarre le Gateway avec OpenAI configuré, puis active les canaux/plugins groupés via des modifications de configuration.
  - Vérifie que la découverte de la configuration laisse les dépendances d'exécution du plugin non configurées absentes, que la première exécution configurée du Gateway ou du docteur installe les dépendances d'exécution de chaque plugin groupé à la demande, et qu'un deuxième redémarrage ne réinstalle pas les dépendances qui étaient déjà activées.
  - Installe également une base npm plus ancienne connue, active Telegram avant d'exécuter `openclaw update --tag <candidate>`, et vérifie que le docteur post-mise à jour du candidat répare les dépendances d'exécution du canal groupé sans réparation post-installation du côté du harnais.
- `pnpm test:parallels:npm-update`
  - Exécute le test de fumée de mise à jour de l'installation packagée native sur les invités Parallels. Chaque plateforme sélectionnée installe d'abord le package de base demandé, puis exécute la commande installée `openclaw update` sur le même invité et vérifie la version installée, le statut de mise à jour, la disponibilité de la passerelle et un tour d'agent local.
  - Utilisez `--platform macos`, `--platform windows`, ou `--platform linux` lors de l'itération sur un invité. Utilisez `--json` pour le chemin de l'artefact de résumé et le statut par voie.
  - La voie OpenAI utilise `openai/gpt-5.5` pour la preuve de tour d'agent en direct par défaut. Passez `--model <provider/model>` ou définissez `OPENCLAW_PARALLELS_OPENAI_MODEL` lors de la validation délibérée d'un autre OpenAI.
  - Encadrez les exécutions locales longues avec un délai d'attente de l'hôte pour que les blocages du transport Parallels ne puissent pas consommer le reste de la fenêtre de test :

    ```bash
    timeout --foreground 150m pnpm test:parallels:npm-update -- --json
    timeout --foreground 90m pnpm test:parallels:npm-update -- --platform windows --json
    ```

  - Le script écrit des journaux de voie imbriqués sous `/tmp/openclaw-parallels-npm-update.*`. Inspectez `windows-update.log`, `macos-update.log`, ou `linux-update.log` avant de supposer que l'enveloppe extérieure est bloquée.
  - La mise à jour Windows peut passer de 10 à 15 minutes dans la réparation des dépendances d'exécution/docteur post-mise à jour sur un invité à froid ; cela est encore sain lorsque le journal de débogage npm imbriqué progresse.
  - N'exécutez pas cette enveloppe agrégée en parallèle avec des voies de test de fumee Parallels individuelles macOS, Windows ou Linux. Elles partagent l'état de la machine virtuelle et peuvent entrer en collision lors de la restauration d'instantané, de la diffusion de package ou de l'état de la passerelle de l'invité.
  - La vérification post-mise à jour exécute la surface normale du plugin groupé, car les façades de fonctionnalités telles que la synthèse vocale, la génération d'images et la compréhension multimédia sont chargées via les API d'exécution groupées, même lorsque le tour de l'agent vérifie uniquement une réponse textuelle simple.

- `pnpm openclaw qa aimock`
  - Démarre uniquement le serveur de fournisseur AIMock local pour un test de fumée direct du protocole.
- `pnpm openclaw qa matrix`
  - Exécute le canal QA en direct Matrix sur un serveur domestique Tuwunel éphémère soutenu par Docker. Uniquement pour les extraits de code source — les installations packagées n'incluent pas `qa-lab`.
  - CLI complète, catalogue de profils/scénarios, variables d'environnement et disposition des artefacts : [QA CLI](/fr/concepts/qa-matrix).
- `pnpm openclaw qa telegram`
  - Exécute le canal QA en direct Telegram sur un groupe privé réel en utilisant les jetons de bot du pilote et du SUT provenant de l'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. L'identifiant de groupe doit être l'identifiant de discussion numérique Telegram.
  - Prend en charge `--credential-source convex` pour les identifiants mutualisés partagés. Utilisez le mode env par défaut, ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` pour opter pour les baux mutualisés.
  - Se termine avec un code non nul en cas d'échec d'un scénario. Utilisez `--allow-failures` lorsque vous souhaitez des artefacts sans code de sortie en échec.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable de bot à bot, activez le Mode de Communication Bot-à-Bot dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact des messages observés sous `.artifacts/qa-e2e/...`. Les scénarios de réponse incluent le RTT de la demande d'envoi du pilote à la réponse observée du SUT.

Les canaux de transport en direct partagent un contrat standard afin que les nouveaux transports ne dérivent pas ; la matrice de couverture par canal se trouve dans [Aperçu QA → Couverture du transport en direct](/fr/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` est la suite synthétique large et ne fait pas partie de cette matrice.

### Identifiants Telegram partagés via Convex (v1)

Lorsque `--credential-source convex` (ou `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) est activé pour `openclaw qa telegram`, le labo QA acquiert un bail exclusif depuis un pool géré par Convex, envoie des pulsations sur ce bail pendant que la voie est active, et libère le bail à l'arrêt.

Structure de projet Convex de référence :

- `qa/convex-credential-broker/`

Variables d'environnement requises :

- `OPENCLAW_QA_CONVEX_SITE_URL` (par exemple `https://your-deployment.convex.site`)
- Un secret pour le rôle sélectionné :
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` pour `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` pour `ci`
- Sélection du rôle d'identification :
  - CLI : `--credential-role maintainer|ci`
  - Défaut Env : `OPENCLAW_QA_CREDENTIAL_ROLE` (vaut `ci` par défaut dans la CI, `maintainer` sinon)

Variables d'environnement optionnelles :

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (défaut `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (défaut `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (défaut `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (défaut `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (défaut `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de trace optionnel)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permet les URL Convex `http://` en boucle locale pour un développement uniquement local.

`OPENCLAW_QA_CONVEX_SITE_URL` devrait utiliser `https://` en fonctionnement normal.

Les commandes d'administration du mainteneur (pool add/remove/list) nécessitent `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` spécifiquement.

Assistants CLI pour les mainteneurs :

```bash
pnpm openclaw qa credentials doctor
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Utilisez `doctor` avant les exécutions en direct pour vérifier l'URL du site Convex, les secrets du courtier, le préfixe de point de terminaison, le délai d'attente HTTP et l'accessibilité admin/liste sans imprimer les valeurs secrètes. Utilisez `--json` pour une sortie lisible par machine dans les scripts et utilitaires CI.

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

Forme de la charge utile pour le type Telegram :

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` doit être une chaîne d'identifiant de conversation Telegram numérique.
- `admin/add` valide cette forme pour `kind: "telegram"` et rejette les charges utiles malformées.

### Ajouter un channel à la QA

L'architecture et les noms des scénarios d'aide pour les nouveaux adaptateurs de channel se trouvent dans [Aperçu QA → Ajouter un channel](/fr/concepts/qa-e2e-automation#adding-a-channel). Le minimum requis : implémenter le transport runner sur le point de couture d'hôte `qa-lab` partagé, déclarer `qaRunners` dans le manifeste du plugin, monter en tant que `openclaw qa <runner>`, et rédiger des scénarios sous `qa/scenarios/`.

## Suites de tests (ce qui s'exécute où)

Pensez aux suites comme à un « réalisme croissant » (et une instabilité/coût croissants) :

### Unitaire / intégration (par défaut)

- Commande : `pnpm test`
- Config : les exécutions non ciblées utilisent l'ensemble de shards `vitest.full-*.config.ts` et peuvent développer les shards multi-projets en configurations par projet pour la planification parallèle
- Fichiers : inventaires unitaires de base sous `src/**/*.test.ts`, `packages/**/*.test.ts` et `test/**/*.test.ts` ; les tests unitaires de l'interface utilisateur s'exécutent dans le shard dédié `unit-ui`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en cours de processus (authentification de la passerelle, routage, outils, analyse, configuration)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans l'CI
  - Aucune clé réelle requise
  - Doit être rapide et stable

<AccordionGroup>
  <Accordion title="Projets, shards et volets délimités">

    - Untargeted `pnpm test` exécute douze configurations de shard plus petites (`core-unit-fast`, `core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus géant de projet racine natif. Cela réduit le RSS de pointe sur les machines chargées et évite que le travail de réponse automatique/extension ne prive les suites non liées.
    - `pnpm test --watch` utilise toujours le graphe de projet racine natif `vitest.config.ts`, car une boucle de surveillance multi-shard n'est pas pratique.
    - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent d'abord les cibles explicites de fichiers/répertoires via des volets délimités, donc `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
    - `pnpm test:changed` développe par défaut les chemins git modifiés en volets délimités peu coûteux : modifications directes de tests, fichiers `*.test.ts` frères, mappages de source explicites et dépendants du graphe d'importation local. Les modifications de configuration/configuration/package n'exécutent pas de tests étendus sauf si vous utilisez explicitement `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed`.
    - `pnpm check:changed` est la porte de contrôle locale intelligente normale pour un travail étroit. Il classe la diff en core, tests core, extensions, tests d'extension, apps, docs, métadonnées de version, outil Docker en direct et outils, puis exécute les commandes de typecheck, lint et guard correspondantes. Il n'exécute pas les tests Vitest ; appelez `pnpm test:changed` ou un `pnpm test <target>` explicite pour la preuve de test. Les incrémentations de version contenant uniquement des métadonnées de version exécutent des vérifications ciblées de version/config/root-dependency, avec une garde qui rejette les modifications de package en dehors du champ de version de niveau supérieur.
    - Les modifications du harnais ACP Docker en direct exécutent des vérifications ciblées : syntaxe shell pour les scripts d'authentification Docker en direct et une simulation à sec du planificateur Docker en direct. Les modifications `package.json` ne sont incluses que lorsque la diff est limitée à `scripts["test:docker:live-*"]` ; les modifications de dépendance, d'exportation, de version et d'autres éditions de surface de package utilisent toujours les gardes plus larges.
    - Les tests unitaires à importation légère provenant des agents, commandes, plugins, assistants de réponse automatique, `plugin-sdk` et zones utilitaires pures similaires passent par le volet `unit-fast`, qui saute `test/setup-openclaw-runtime.ts` ; les fichiers lourds avec état/runtime restent sur les volets existants.
    - Certains fichiers sources d'assistants `plugin-sdk` et `commands` sélectionnés mappent également les exécutions en mode modifié à des tests frères explicites dans ces volets légers, afin que les modifications d'assistants évitent de réexécuter la suite lourde complète pour ce répertoire.
    - `auto-reply` possède des compartiments dédiés pour les assistants core de niveau supérieur, les tests d'intégration `reply.*` de niveau supérieur et le sous-arbre `src/auto-reply/reply/**`. Le CI divise davantage le sous-arbre de réponse en shards agent-runner, dispatch et commands/state-routing afin qu'un compartiment à forte importation ne possède pas toute la file d'attente Node.

  </Accordion>

  <Accordion title="Couverture du runner intégré">

    - Lorsque vous modifiez les entrées de découverte des outils de message ou le contexte d'exécution de la compactage, conservez les deux niveaux de couverture.
    - Ajoutez des régressions ciblées pour les assistants concernant les limites de routage pur et de normalisation.
    - Maintenez les suites d'intégration du runner intégré en bonne santé :
      `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
      `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` et
      `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
    - Ces suites vérifient que les identifiants délimités et le comportement de compactage traversent toujours les chemins réels `run.ts` / `compact.ts` ; les tests avec assistants uniquement ne constituent pas un substitut suffisant à ces chemins d'intégration.

  </Accordion>

  <Accordion title="Pool Vitest et valeurs par défaut d'isolation">

    - La configuration de base de Vitest est `threads` par défaut.
    - La configuration partagée de Vitest fixe `isolate: false` et utilise le runner non isolé pour les configurations des projets racine, e2e et live.
    - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute également sur le runner non isolé partagé.
    - Chaque shard `pnpm test` hérite des mêmes valeurs par défaut `threads` + `isolate: false` de la configuration partagée de Vitest.
    - `scripts/run-vitest.mjs` ajoute `--no-maglev` pour les processus enfants Node de Vitest par défaut afin de réduire l'activité de compilation V8 lors des grandes exécutions locales.
      Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` pour comparer avec le comportement standard de V8.

  </Accordion>

  <Accordion title="Itération locale rapide">

    - `pnpm changed:lanes` montre les voies architecturales déclenchées par une diff.
    - Le hook de pré-commit sert uniquement au formatage. Il remet les fichiers formatés dans la zone de staging et n'exécute pas le lint, le typecheck ou les tests.
    - Exécutez `pnpm check:changed` explicitement avant le transfert ou le push lorsque vous avez besoin de la porte de vérification intelligente locale.
    - `pnpm test:changed` passe par des voies étendues peu coûteuses par défaut. Utilisez `OPENCLAW_TEST_CHANGED_BROAD=1 pnpm test:changed` uniquement lorsque l'agent décide qu'une modification de harnais, de configuration, de package ou de contrat nécessite vraiment une couverture Vitest plus large.
    - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement de routage, mais avec une limite de workers plus élevée.
    - L'auto-scaling des workers locaux est intentionnellement conservateur et réduit l'activité lorsque la charge moyenne de l'hôte est déjà élevée, afin que plusieurs exécutions Vitest simultanées causent moins de dégâts par défaut.
    - La configuration de base Vitest marque les fichiers de projets/configurations comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage des tests change.
    - La configuration maintient `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez un emplacement de cache explicite pour un profilage direct.

  </Accordion>

  <Accordion title="Perf debugging">

    - `pnpm test:perf:imports` active le rapport de durée d'import Vitest ainsi que
      la sortie détaillée des importations.
    - `pnpm test:perf:imports:changed` limite la même vue de profilage aux
      fichiers modifiés depuis `origin/main`.
    - Les données de synchronisation des shards sont écrites dans `.artifacts/vitest-shard-timings.json`.
      Les exécutions sur toute la configuration utilisent le chemin de la configuration comme clé ; les shards CI avec motif d'inclusion
      ajoutent le nom du shard afin que les shards filtrés puissent être suivis
      séparément.
    - Lorsqu'un test à chaud passe encore la majeure partie de son temps dans les importations de démarrage,
      gardez les dépendances lourdes derrière une couture locale étroite `*.runtime.ts` et
      simulez directement cette couture au lieu d'importer en profondeur les helpers d'exécution juste
      pour les transmettre via `vi.mock(...)`.
    - `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les
      `test:changed` acheminés au chemin racine du projet natif pour ce diff
      commis et affiche le temps écoulé ainsi que le RSS maximum macOS.
    - `pnpm test:perf:changed:bench -- --worktree` effectue des benchmarks sur l'arborescence
      dirty actuelle en acheminant la liste des fichiers modifiés via
      `scripts/test-projects.mjs` et la configuration racine Vitest.
    - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour
      le démarrage Vitest/Vite et la surcharge de transformation.
    - `pnpm test:perf:profile:runner` écrit des profils CPU+heap pour le runner
      de la suite unitaire avec le parallélisme de fichiers désactivé.

  </Accordion>
</AccordionGroup>

### Stabilité (gateway)

- Commande : `pnpm test:stability:gateway`
- Configuration : `vitest.gateway.config.ts`, forcée à un worker
- Portée :
  - Démarre un Gateway bouclage réel avec les diagnostics activés par défaut
  - Effectue des tests de charge synthétiques sur les messages, la mémoire et les charges utiles volumineuses via le chemin des événements de diagnostic
  - Interroge `diagnostics.stability` via le Gateway WS RPC
  - Couvre les assistants de persistance des bundles de stabilité de diagnostic
  - Vérifie que l'enregistreur reste borné, que les échantillons RSS synthétiques restent sous le budget de pression et que les profondeurs de file d'attente par session reviennent à zéro
- Attentes :
  - Sûr pour la CI et sans clé
  - Voie étroite pour le suivi des régressions de stabilité, pas un substitut à la suite complète Gateway

### E2E (gateway smoke)

- Commande : `pnpm test:e2e`
- Configuration : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts` et tests de bout en bout de bundled-plugin sous `extensions/`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `threads` avec `isolate: false`, correspondant au reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie verbeuse de la console.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appariement de nœuds et réseau plus lourd
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
  - Teste le backend OpenShell de OpenClaw via un `sandbox ssh-config` réel + exec SSH
  - Vérifie le comportement du système de fichiers canonique distant via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un CLI `openshell` local ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (providers réels + modèles réels)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`, `test/**/*.live.test.ts` et tests live de bundled-plugin sous `extensions/`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - « Est-ce que ce provider/modèle fonctionne réellement _aujourd'hui_ avec de vraies informations d'identification ? »
  - Détecter les changements de format du provider, les bizarreries de l'appel d'outil, les problèmes d'authentification et le comportement de la limitation de débit
- Attentes :
  - Pas stable pour l'IC par conception (réseaux réels, politiques réelles des providers, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Préférez l'exécution de sous-ensembles réduits plutôt que de « tout »
- Live exécute source `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions Live isolent toujours `HOME` et copient le matériel de configuration/auth dans un répertoire temporaire de test afin que les fixtures unitaires ne puissent pas modifier votre véritable `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests Live utilisent votre véritable répertoire personnel.
- `pnpm test:live` utilise par défaut un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avis supplémentaire `~/.profile` et réduit les journaux d'amorçage de la passerelle/les bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au provider) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une substitution par Live via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponses de limite de taux.
- Sortie de progression/heartbeat :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels longs aux providers soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de console Vitest afin que les lignes de progression provider/passerele diffusent immédiatement pendant les exécutions Live.
  - Ajustez les heartbeats de modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les heartbeats de passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Modification du réseau de la passerelle / protocole WS / appairage : ajoutez `pnpm test:e2e`
- Débogage de « mon bot est en panne » / pannes spécifiques au provider / appels d'outils : exécutez un `pnpm test:live` réduit

## Tests Live (touchant le réseau)

Pour la matrice de modèles en direct, les tests de fumée du backend CLI, les tests de fumée ACP, le harnais du serveur d'application Codex, et tous les tests en direct des fournisseurs de médias (Deepgram, BytePlus, ComfyUI, image, musique, vidéo, harnais média) — ainsi que la gestion des informations d'identification pour les exécutions en direct — voir [Testing — live suites](/fr/help/testing-live).

## Runners Docker (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker sont divisés en deux catégories :

- Runners de modèles en direct : `test:docker:live-models` et `test:docker:live-gateway` n'exécutent que leur fichier live correspondant à la clé de profil à l'intérieur de l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de config local et votre espace de travail (et en sourçant `~/.profile` si monté). Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les runners live Docker ont par défaut une limite de fumée plus petite afin qu'un balayage Docker complet reste pratique :
  `test:docker:live-models` par défaut à `OPENCLAW_LIVE_MAX_MODELS=12`, et
  `test:docker:live-gateway` par défaut à `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Remplacez ces variables d'environnement lorsque vous
  voulez explicitement le scan exhaustif plus large.
- `test:docker:all` construit une fois l'image live Docker via `test:docker:live-build`, empaquète OpenClaw une fois en tant qu'archive tar npm via `scripts/package-openclaw-for-docker.mjs`, puis construit/réutilise deux images `scripts/e2e/Dockerfile`. L'image nue est uniquement le runner Node/Git pour les voies d'installation/de mise à jour/dépendances de plugins ; ces voies montent l'archive préconstruite. L'image fonctionnelle installe la même archive dans `/app` pour les voies de fonctionnalité d'application construite. Les définitions des voies Docker se trouvent dans `scripts/lib/docker-e2e-scenarios.mjs` ; la logique du planificateur se trouve dans `scripts/lib/docker-e2e-plan.mjs` ; `scripts/test-docker-all.mjs` exécute le plan sélectionné. L'agrégat utilise un planificateur local pondéré : `OPENCLAW_DOCKER_ALL_PARALLELISM` contrôle les emplacements de processus, tandis que les plafonds de ressources empêchent les voies lourdes en direct, d'installation npm et multiservices de démarrer toutes à la fois. Si une seule voie est plus lourde que les plafonds actifs, le planificateur peut toujours la démarrer lorsque le pool est vide, puis la laisse tourner seule jusqu'à ce que la capacité soit à nouveau disponible. Les valeurs par défaut sont 10 emplacements, `OPENCLAW_DOCKER_ALL_LIVE_LIMIT=9`, `OPENCLAW_DOCKER_ALL_NPM_LIMIT=10` et `OPENCLAW_DOCKER_ALL_SERVICE_LIMIT=7` ; n'ajustez `OPENCLAW_DOCKER_ALL_WEIGHT_LIMIT` ou `OPENCLAW_DOCKER_ALL_DOCKER_LIMIT` que lorsque l'hôte Docker dispose de plus de marge. Le runner effectue par défaut une pré-vérification Docker, supprime les conteneurs E2E OpenClaw obsolètes, imprime le statut toutes les 30 secondes, stocke les timings de voie réussis dans `.artifacts/docker-tests/lane-timings.json`, et utilise ces timings pour démarrer d'abord les voies plus longues lors des exécutions ultérieures. Utilisez `OPENCLAW_DOCKER_ALL_DRY_RUN=1` pour imprimer le manifeste des voies pondérées sans construire ou exécuter Docker, ou `node scripts/test-docker-all.mjs --plan-json` pour imprimer le plan CI pour les voies sélectionnées, les besoins de packages/images et les identifiants.
- `Package Acceptance` est la passerelle de paquet native GitHub pour « est-ce que cette archive tar installable fonctionne comme un produit ? ». Elle résout un paquet candidat unique à partir de `source=npm`, `source=ref`, `source=url` ou `source=artifact`, le télécharge en tant que `package-under-test`, puis exécute les voies E2E Docker réutilisables sur cette archive exacte au lieu de réempaqueter la référence sélectionnée. `workflow_ref` sélectionne les scripts de workflow/harnais de confiance, tandis que `package_ref` sélectionne le commit/la branche/le tag source à empaqueter lors de `source=ref` ; cela permet à la logique d'acceptation actuelle de valider des commits de confiance plus anciens. Les profils sont classés par portée : `smoke` est une installation rapide/canal/agent plus passerelle/configuration, `package` est le contrat de paquet/mise à jour/plugin et le remplacement natif par défaut pour la plupart des couvertures de paquet/mise à jour Parallels, `product` ajoute les canaux MCP, le nettoyage cron/sous-agent, la recherche web OpenAI et OpenWebUI, et `full` exécute les blocs Docker de chemin de publication avec OpenWebUI. La validation de publication exécute un delta de paquet personnalisé (`bundled-channel-deps-compat plugins-offline`) plus le QA de paquet Telegram car les blocs Docker de chemin de publication couvrent déjà les voies de paquet/mise à jour/plugin qui se chevauchent. Les commandes de réexécution GitHub Docker ciblées générées à partir des artefacts incluent les artefacts de paquet antérieurs et les entrées d'image préparées lorsqu'elles sont disponibles, afin que les voies ayant échoué puissent éviter de reconstruire le paquet et les images.
- Les contrôles de build et de publication exécutent `scripts/check-cli-bootstrap-imports.mjs` après tsdown. La garde parcourt le graphe de construction statique à partir de `dist/entry.js` et `dist/cli/run-main.js` et échoue si l'importation de démarrage avant répartition importe des dépendances de paquet telles que Commander, l'interface utilisateur d'invite, undici ou la journalisation avant la répartition des commandes. Le test de fumée du CLI empaqueté couvre également l'aide racine, l'aide à l'intégration, l'aide du médecin, le statut, le schéma de configuration et une commande de liste de modèles.
- La compatibilité héritée de l'acceptation des packages est limitée à `2026.4.25` (`2026.4.25-beta.*` inclus). Jusqu'à cette limite, le harnais tolère uniquement les lacunes de métadonnées des packages expédiés : entrées d'inventaire QA privées omises, `gateway install --wrapper` manquantes, fichiers de correctifs manquants dans le fichier git dérivé du tarball, `update.channel` persistantes manquantes, emplacements hérités des enregistrements d'installation des plugins, persistance manquante des enregistrements d'installation de la place de marché, et migration des métadonnées de configuration pendant `plugins update`. Pour les packages après `2026.4.25`, ces chemins sont des échecs stricts.
- Runners de smoke de conteneur : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:update-channel-switch`, `test:docker:session-runtime-context`, `test:docker:agents-delete-shared-workspace`, `test:docker:gateway-network`, `test:docker:browser-cdp-snapshot`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update` et `test:docker:config-reload` démarrent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de niveau supérieur.

Les runners Docker de modèles en direct effectuent également un montage de liaison (bind-mount) uniquement sur les répertoires d'authentification CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas limitée), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin que l'CLI OAuth externe puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- Smoke de liaison ACP : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh` ; couvre Claude, Codex et Gemini par défaut, avec une couverture stricte Droid/OpenCode via `pnpm test:docker:live-acp-bind:droid` et `pnpm test:docker:live-acp-bind:opencode`)
- Smoke du backend CLI : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Smoke du harnais du serveur d'application Codex : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agent dev : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Observability smoke : `pnpm qa:otel:smoke` est une voie de vérification source QA privée. Elle n'est intentionnellement pas incluse dans les voies de publication du package Docker car l'archive npm omet le QA Lab.
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant d'onboarding (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Smoke test onboarding/channel/agent de l'archive npm : `pnpm test:docker:npm-onboard-channel-agent` installe l'archive OpenClaw empaquetée globalement dans Docker, configure OpenAI via l'onboarding par référence d'environnement plus Telegram par défaut, vérifie que le réparateur (doctor) active les dépendances d'exécution du plugin, et exécute un tour d'agent OpenAI simulé. Réutilisez une archive préconstruite avec `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sautez la reconstruction de l'hôte avec `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, ou changez de channel avec `OPENCLAW_NPM_ONBOARD_CHANNEL=discord`.
- Smoke test de changement de channel de mise à jour : `pnpm test:docker:update-channel-switch` installe l'archive OpenClaw empaquetée globalement dans Docker, passe du package `stable` à git `dev`, vérifie que le channel persisté et le plugin fonctionnent après la mise à jour, puis retourne au package `stable` et vérifie le statut de la mise à jour.
- Smoke test du contexte d'exécution de session : `pnpm test:docker:session-runtime-context` vérifie la persistance de la transcription du contexte d'exécution caché ainsi que la réparation par le doctor des branches de réécriture de prompt dupliquées affectées.
- Smoke test d'installation globale Bun : `bash scripts/e2e/bun-global-install-smoke.sh` empaquette l'arborescence actuelle, l'installe avec `bun install -g` dans un répertoire personnel isolé, et vérifie que `openclaw infer image providers --json` renvoie les fournisseurs d'images regroupés au lieu de s'arrêter (hang). Réutilisez une archive préconstruite avec `OPENCLAW_BUN_GLOBAL_SMOKE_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sautez la construction de l'hôte avec `OPENCLAW_BUN_GLOBAL_SMOKE_HOST_BUILD=0`, ou copiez `dist/` depuis une image Docker construite avec `OPENCLAW_BUN_GLOBAL_SMOKE_DIST_IMAGE=openclaw-dockerfile-smoke:local`.
- Installer Docker smoke : `bash scripts/test-install-sh-docker.sh` partage un cache npm entre ses conteneurs root, update et direct-npm. Le smoke de mise à jour utilise par défaut npm `latest` comme base stable avant de passer au tarball candidat. Remplacez-le par `OPENCLAW_INSTALL_SMOKE_UPDATE_BASELINE=2026.4.22` en local, ou avec l'entrée `update_baseline_version` du workflow Install Smoke sur GitHub. Les vérifications de l'installateur non-root maintiennent un cache npm isolé pour que les entrées de cache détenues par root ne masquent pas le comportement d'installation local à l'utilisateur. Définissez `OPENCLAW_INSTALL_SMOKE_NPM_CACHE_DIR=/path/to/cache` pour réutiliser le cache root/update/direct-npm lors des réexécutions locales.
- Le CI Install Smoke ignore la mise à jour globale direct-npm en double avec `OPENCLAW_INSTALL_SMOKE_SKIP_NPM_GLOBAL=1` ; exécutez le script localement sans cet env lorsque la couverture directe `npm install -g` est nécessaire.
- Agents delete shared workspace CLI smoke : `pnpm test:docker:agents-delete-shared-workspace` (script : `scripts/e2e/agents-delete-shared-workspace-docker.sh`) construit par défaut l'image du Dockerfile racine, ensemence deux agents avec un espace de travail dans un répertoire home de conteneur isolé, exécute `agents delete --json` et vérifie le JSON valide ainsi que le comportement de l'espace de travail conservé. Réutilisez l'image install-smoke avec `OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_IMAGE=openclaw-dockerfile-smoke:local OPENCLAW_AGENTS_DELETE_SHARED_WORKSPACE_E2E_SKIP_BUILD=1`.
- Gateway networking (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Browser CDP snapshot smoke : `pnpm test:docker:browser-cdp-snapshot` (script : `scripts/e2e/browser-cdp-snapshot-docker.sh`) construit l'image E2E source plus une couche Chromium, démarre Chromium avec CDP brut, exécute `browser doctor --deep` et vérifie que les instantanés de rôle CDP couvrent les URLs de lien, les éléments cliquables promus par le curseur, les références iframe et les métadonnées de frame.
- OpenAI Responses web_search minimal reasoning regression : `pnpm test:docker:openai-web-search-minimal` (script : `scripts/e2e/openai-web-search-minimal-docker.sh`) exécute un serveur OpenAI simulé via Gateway, vérifie que `web_search` augmente `reasoning.effort` de `minimal` à `low`, puis force le rejet du schéma du provider et vérifie que le détail brut apparaît dans les journaux Gateway.
- Pont de canal MCP (Gateway amorcée + pont stdio + test de fumée du cadre de notification Claude brut) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Outils MCP du bundle Pi (serveur MCP stdio réel + test de fumée d'autorisation/refus du profil Pi intégré) : `pnpm test:docker:pi-bundle-mcp-tools` (script : `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Nettoyage MCP de cron/sous-agent (Gateway réelle + démontage de l'enfant MCP stdio après des tâches cron isolées et des exécutions de sous-agent ponctuelles) : `pnpm test:docker:cron-mcp-cleanup` (script : `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Plugins (test de fumée d'installation, installation/désinstallation de ClawHub, mises à jour de la place de marché, et activation/inspection du bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)
  Définissez `OPENCLAW_PLUGINS_E2E_CLAWHUB=0` pour ignorer le bloc ClawHub en direct, ou remplacez le package par défaut par `OPENCLAW_PLUGINS_E2E_CLAWHUB_SPEC` et `OPENCLAW_PLUGINS_E2E_CLAWHUB_ID`.
- Test de fumée de mise à jour de plugin sans changement : `pnpm test:docker:plugin-update` (script : `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Test de fumée des métadonnées de rechargement de la configuration : `pnpm test:docker:config-reload` (script : `scripts/e2e/config-reload-source-docker.sh`)
- Dépendances d'exécution du plugin regroupé : `pnpm test:docker:bundled-channel-deps` génère par défaut une petite image de runner Docker, génère et empaquette OpenClaw une fois sur l'hôte, puis monte cette archive dans chaque scénario d'installation Linux. Réutilisez l'image avec `OPENCLAW_SKIP_DOCKER_BUILD=1`, sautez la reconstruction sur l'hôte après une construction locale fraîche avec `OPENCLAW_BUNDLED_CHANNEL_HOST_BUILD=0`, ou pointez vers une archive existante avec `OPENCLAW_CURRENT_PACKAGE_TGZ=/path/to/openclaw-*.tgz`. Le bloc d'agrégat et de chemin de publication Docker complet `bundled-channels` prépackage cette archive une fois, puis répartit les vérifications de canal regroupées dans des voies indépendantes, y compris des voies de mise à jour séparées pour Telegram, Discord, Slack, Feishu, memory-lancedb et ACPX. Le bloc hérité `plugins-integrations` reste un alias d'agrégat pour les réexécutions manuelles. Utilisez `OPENCLAW_BUNDLED_CHANNELS=telegram,slack` pour réduire la matrice de canaux lors de l'exécution directe de la voie regroupée, ou `OPENCLAW_BUNDLED_CHANNEL_UPDATE_TARGETS=telegram,acpx` pour réduire le scénario de mise à jour. La voie vérifie également que `channels.<id>.enabled=false` et `plugins.entries.<id>.enabled=false` suppriment la réparation des dépendances doctor/runtime-dependency.
- Réduisez les dépendances d'exécution du plugin groupé lors des itérations en désactivant les scénarios non liés, par exemple :
  `OPENCLAW_BUNDLED_CHANNEL_SCENARIOS=0 OPENCLAW_BUNDLED_CHANNEL_UPDATE_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_ROOT_OWNED_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_SETUP_ENTRY_SCENARIO=0 pnpm test:docker:bundled-channel-deps`.

Pour préconstruire et réutiliser manuellement l'image fonctionnelle partagée :

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e-functional:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Les substitutions d'image spécifiques à la suite, telles que `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE`, priment toujours lorsqu'elles sont définies. Lorsque `OPENCLAW_SKIP_DOCKER_BUILD=1` pointe vers une image partagée distante, les scripts la téléchargent si elle n'est pas déjà locale. Les tests QR et d'installateur Docker conservent leurs propres Dockerfiles car ils valident le comportement d'empaquetage/d'installation plutôt que le d'exécution de l'application construite partagée.

Les exécuteurs Docker de modèle en direct montent également la copie de travail actuelle en lecture seule et la préparent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest sur votre source/configuration locale exacte. L'étape de préparation ignore les caches locaux importants et les sorties de build de l'application tels que `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et les répertoires de sortie Gradle ou `.build` locaux à l'application, afin que les exécutions Docker en direct ne passent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` pour que les sondes en direct de la passerelle ne démarrent pas de véritables workers de canal Telegram/Discord/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, donc transmettez également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture en direct de la passerne de cette voie Docker. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur de passerne OpenClaw avec les points de terminaison HTTP compatibles OpenAI activés, démarre un conteneur Open WebUI épinglé contre cette passerne, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une vraie requête de chat via le proxy `/api/chat/completions` d'Open WebUI. La première exécution peut être sensiblement plus lente car Docker peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie attend une clé de modèle en direct utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir dans les exécutions Telegram. Les exécutions réussies affichent une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un vrai compte Discord, iMessage ou Gateway. Il démarre un conteneur Docker amorcé, démarre un second conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations routées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements en direct, le routage d'envoi sortant, et les notifications de canal et d'autorisation style Claude sur le véritable pont stdio MCP. La vérification des notifications inspecte directement les trames stdio MCP brutes, donc le test valide ce que le pont émet réellement, pas seulement ce qu'un SDK client spécifique se trouve à exposer. `test:docker:pi-bundle-mcp-tools` est déterministe et n'a pas besoin d'une clé de modèle en direct. Il construit l'image Gateway du dépôt, démarre un vrai serveur de sonde MCP stdio à l'intérieur du conteneur, matérialise ce serveur via le runtime MCP du bundle Pi intégré, exécute l'outil, puis vérifie que `coding` et `messaging` gardent les outils `bundle-mcp` tandis que `minimal` et `tools.deny: ["bundle-mcp"]` les filtrent. `test:docker:cron-mcp-cleanup` est déterministe et n'a pas besoin d'une clé de modèle en direct. Il démarre une passerne Gateway amorcée avec un vrai serveur de sonde MCP stdio, exécute un tour cron isolé et un tour enfant ponctuel `/subagents spawn`, puis vérifie que le processus enfant MCP se termine après chaque exécution.

Test de fumage du fil ACP en langage clair manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Gardez ce script pour les workflows de régression/débogage. Il pourrait être à nouveau nécessaire pour la validation du routage des fils ACP, alors ne le supprimez pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (par défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` pour vérifier uniquement les variables d'environnement sourcées depuis `OPENCLAW_PROFILE_FILE`, en utilisant des répertoires de configuration/espace de travail temporaires et aucun montage d'authentification CLI externe
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (par défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installations CLI mises en cache dans Docker
- Les répertoires/fichiers d'authentification CLI externes sous `$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions de fournisseur restreintes ne montent que les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les fournisseurs dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les nouvelles exécutions qui ne nécessitent pas de reconstruction
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour garantir que les informations d'identification proviennent du magasin de profils (et non des variables d'environnement)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le modèle exposé par la passerelle pour le test de fumage d'Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification du nonce utilisée par le smoke test d'Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer le tag d'image Open WebUI épinglé

## Documentation sanity

Exécutez les vérifications de documentation après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûre pour CI)

Ce sont des régressions de « vrai pipeline » sans vrais fournisseurs :

- Appel d'outil Gateway (mock OpenAI, vraie boucle gateway + agent) : `src/gateway/gateway.test.ts` (cas : "exécute un appel d'outil OpenAI simulé de bout en bout via la boucle de l'agent Gateway")
- Assistant Gateway (WS `wizard.start`/`wizard.next`, écrit la config + auth appliquée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant via ws et écrit la config du jeton d'auth")

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Appel d'outil simulé via la vraie boucle gateway + agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de session et les effets de la configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les Skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les Skills sont listés dans l'invite, l'agent choisit-il la bonne Skill (ou évite-t-il celles non pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios à plusieurs tours qui vérifient l'ordre des outils, la persistance de l'historique de session et les limites du bac à sable.

Les futures évaluations doivent d'abord rester déterministes :

- Un exécuteur de scénario utilisant des fournisseurs simulés pour vérifier les appels d'outils + l'ordre, les lectures de fichiers Skills et le câblage de session.
- Une petite suite de scénarios axés sur les Skills (utilisation vs évitement, gating, injection d'invite).
- Évaluations en direct optionnelles (opt-in, env-gated) uniquement après la mise en place de la suite sûre pour CI.

## Tests de contrat (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son contrat d'interface. Ils parcourent tous les plugins découverts et exécutent une suite d'assertions sur la forme et le comportement. La `pnpm test` unit lane par défaut omet intentionnellement ces fichiers de jointure partagés et de fumée ; exécutez les commandes de contrat explicitement lorsque vous touchez aux surfaces partagées du channel ou du provider.

### Commandes

- Tous les contrats : `pnpm test:contracts`
- Contrats de channel uniquement : `pnpm test:contracts:channels`
- Contrats de provider uniquement : `pnpm test:contracts:plugins`

### Contrats de channel

Situés dans `src/channels/plugins/contracts/*.contract.test.ts` :

- **plugin** - Forme de base du plugin (id, nom, capacités)
- **setup** - Contrat de l'assistant de configuration
- **session-binding** - Comportement de la liaison de session
- **outbound-payload** - Structure du payload du message
- **inbound** - Gestion des messages entrants
- **actions** - Gestionnaires d'actions de channel
- **threading** - Gestion de l'ID de thread
- **directory** - API de répertoire/liste
- **group-policy** - Application de la politique de groupe

### Contrats de statut de provider

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sonde de statut du channel
- **registry** - Forme du registre de plugins

### Contrats de provider

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection de l'authentification
- **catalog** - API du catalogue de modèles
- **discovery** - Découverte de plugins
- **loader** - Chargement de plugins
- **runtime** - Runtime du provider
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exportations ou les sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de channel ou de provider
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests de contrat s'exécutent dans la CI et ne nécessitent pas de vraies clés API.

## Ajout de régressions (conseils)

Lorsque vous corrigez un problème de provider/model découvert en direct :

- Ajoutez une régression compatible CI si possible (provider simulé/bouchon, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement uniquement en direct (limites de débit, politiques d'authentification), gardez le test en direct étroit et optionnel via des variables d'environnement
- Privilégiez le ciblage de la plus petite couche qui capture le bogue :
  - bogue de conversion/relecture de requête provider → test direct des modèles
  - bogue de pipeline session/historique/tool du gateway → test de fumée live du gateway ou test simulé CI-safe du gateway
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les ids d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les ids de cibles non classifiés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.

## Connexes

- [Tests en direct (Testing live)](/fr/help/testing-live)
- [CI](/fr/ci)
