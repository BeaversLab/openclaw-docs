---
summary: "Kit de tests : suites unitaires/e2e/live, runners Docker et couverture de chaque test"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "Tests"
---

# Testing

OpenClaw dispose de trois suites Vitest (unitaire/intégration, e2e, live) et d'un petit ensemble de runners Docker.

Ce document est un guide sur « comment nous testons » :

- Ce que chaque suite couvre (et ce qu'elle couvre délibérément _pas_)
- Quelles commandes exécuter pour les workflows courants (local, pre-push, débogage)
- Comment les tests live découvrent les identifiants et sélectionnent les models/providers
- Comment ajouter des régressions pour les problèmes réels de model/provider

## Quick start

La plupart des jours :

- Passage complète (attendue avant le push) : `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Exécution locale complète plus rapide sur une machine puissante : `pnpm test:max`
- Boucle de surveillance directe Vitest : `pnpm test:watch`
- Le ciblage direct de fichiers route désormais les chemins d'extension/channel : `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Privilégiez d'abord les exécutions ciblées lorsque vous itérez sur un échec unique.
- Site QA basé sur Docker : `pnpm qa:lab:up`
- Voie QA basée sur une VM Linux : `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Lorsque vous modifiez des tests ou souhaitez une confiance supplémentaire :

- Gate de couverture : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de providers/models réels (nécessite des identifiants réels) :

- Suite Live (modèles + sondes d'outils/images de passerelle) : `pnpm test:live`
- Cibler un fichier live en silence : `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Test de fumée des coûts Moonshot/Kimi : avec `MOONSHOT_API_KEY` défini, lancez
  `openclaw models list --provider moonshot --json`, puis lancez un `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  isolé contre `moonshot/kimi-k2.6`. Vérifiez que le JSON signale Moonshot/K2.6 et que
  la transcription de l'assistant stocke des `usage.cost` normalisées.

Conseil : lorsque vous n'avez besoin que d'un seul cas d'échec, préférez restreindre les tests en direct via les variables d'environnement de liste d'autorisation décrites ci-dessous.

## Lanceurs spécifiques au QA

Ces commandes se situent à côté des suites de tests principales lorsque vous avez besoin du réalisme d'un laboratoire QA :

- `pnpm openclaw qa suite`
  - Exécute directement des scénarios QA basés sur le dépôt sur l'hôte.
  - Exécute plusieurs scénarios sélectionnés en parallèle par défaut avec des
    workers de passerelle isolés. `qa-channel` est réglé par défaut sur une concurrence de 4 (limitée par
    le nombre de scénarios sélectionnés). Utilisez `--concurrency <count>` pour ajuster le nombre
    de workers, ou `--concurrency 1` pour l'ancienne voie sérielle.
  - Sort avec un code non nul si un scénario échoue. Utilisez `--allow-failures` lorsque vous
    voulez les artefacts sans un code de sortie d'échec.
  - Prend en charge les modes de provider `live-frontier`, `mock-openai` et `aimock`.
    `aimock` démarre un serveur de provider local soutenu par AIMock pour une couverture
    expérimentale de fixtures et de mocks de protocole sans remplacer la voie
    `mock-openai` consciente des scénarios.
- `pnpm openclaw qa suite --runner multipass`
  - Exécute la même suite QA dans une VM Linux Multipass éphémère.
  - Conserve le même comportement de sélection de scénario que `qa suite` sur l'hôte.
  - Réutilise les mêmes drapeaux de sélection de provider/model que `qa suite`.
  - Les exécutions en direct transmettent les entrées d'auth QA prises en charge qui sont pratiques pour l'invité :
    les clés de provider basées sur des variables d'environnement, le chemin de configuration du provider QA en direct, et `CODEX_HOME`
    si présent.
  - Les répertoires de sortie doivent rester sous la racine du dépôt afin que l'invité puisse écrire en retour
    via l'espace de travail monté.
  - Écrit le rapport et le résumé QA normaux ainsi que les journaux Multipass dans
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Démarre le site QA soutenu par Docker pour un travail de style opérateur.
- `pnpm test:docker:bundled-channel-deps`
  - Empaquette et installe la version actuelle d'OpenClaw dans Docker, démarre la Gateway
    avec OpenAI configuré, puis active Telegram et Discord via des modifications de configuration.
  - Vérifie que le premier redémarrage de la Gateway installe les dépendances d'exécution
    de chaque plugin de canal groupé à la demande, et qu'un second redémarrage ne réinstalle pas
    les dépendances qui ont déjà été activées.
- `pnpm openclaw qa aimock`
  - Démarre uniquement le serveur de fournisseur AIMock local pour des tests de fumée
    directs du protocole.
- `pnpm openclaw qa matrix`
  - Exécute le canal QA live Matrix contre un serveur d'accueil Tuwunel éphémère soutenu par Docker.
  - Cet hôte QA est aujourd'hui réservé au repo/dev. Les installations empaquetées d'OpenClaw n'expédient pas
    `qa-lab`, elles n'exposent donc pas `openclaw qa`.
  - Les extraits du repo chargent le runner groupé directement ; aucune étape d'installation de plugin séparée
    n'est nécessaire.
  - Provisionne trois utilisateurs temporaires Matrix (`driver`, `sut`, `observer`) plus une salle privée, puis démarre un enfant de passerelle QA avec le vrai plugin Matrix comme transport du SUT.
  - Utilise par défaut l'image stable Tuwunel épinglée `ghcr.io/matrix-construct/tuwunel:v1.5.1`. Remplacez par `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` lorsque vous devez tester une image différente.
  - Matrix n'expose pas d'indicateurs de source d'informations d'identification partagés car le canal provisionne des utilisateurs éphémères localement.
  - Écrit un rapport QA Matrix, un résumé, un artefact d'événements observés et un journal de sortie combiné stdout/stderr sous `.artifacts/qa-e2e/...`.
- `pnpm openclaw qa telegram`
  - Exécute le canal QA live Telegram contre un groupe privé réel en utilisant les jetons de bot driver et SUT depuis les variables d'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. L'identifiant de groupe doit être l'identifiant de chat numérique Telegram.
  - Prend en charge `--credential-source convex` pour les informations d'identification partagées en pool. Utilise le mode env par défaut, ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` pour opter pour des baux en pool.
  - Quitte avec un code non nul lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque vous
    souhaitez des artefacts sans code de sortie d'échec.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable de bot à bot, activez le mode de communication Bot-to-Bot dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact de messages observés sous `.artifacts/qa-e2e/...`.

Les voies de transport en direct partagent un contrat standard pour éviter que les nouveaux transports ne dérivent :

`qa-channel` reste la suite de synthèse QA large et ne fait pas partie de la matrice de couverture des transport en direct.

| Voie     | Canary | Filtrage par mention | Bloc de liste blanche | Réponse de premier niveau | Reprise après redémarrage | Suite de discussion | Isolement de discussion | Observation des réactions | Commande d'aide |
| -------- | ------ | -------------------- | --------------------- | ------------------------- | ------------------------- | ------------------- | ----------------------- | ------------------------- | --------------- |
| Matrix   | x      | x                    | x                     | x                         | x                         | x                   | x                       | x                         |                 |
| Telegram | x      |                      |                       |                           |                           |                     |                         |                           | x               |

### Identifiants Telegram partagés via Convex (v1)

Lorsque `--credential-source convex` (ou `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) est activé pour `openclaw qa telegram`, le lab QA acquiert un bail exclusif depuis un pool soutenu par Convex, maintient ce bail par des signaux de présence tant que la voie est active, et libère le bail à l'arrêt.

Structure de projet Convex de référence :

- `qa/convex-credential-broker/`

Env vars requises :

- `OPENCLAW_QA_CONVEX_SITE_URL` (par exemple `https://your-deployment.convex.site`)
- Un secret pour le rôle sélectionné :
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` pour `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` pour `ci`
- Sélection du rôle d'identifiant :
  - CLI : `--credential-role maintainer|ci`
  - Par défaut env : `OPENCLAW_QA_CREDENTIAL_ROLE` (par défaut `ci` dans CI, `maintainer` sinon)

Env vars optionnelles :

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (par défaut `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (par défaut `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (par défaut `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (par défaut `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (par défaut `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de trace optionnel)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permet les URL Convex de bouclage `http://` pour un développement purement local.

`OPENCLAW_QA_CONVEX_SITE_URL` doit utiliser `https://` en fonctionnement normal.

Les commandes d'administration du responsable (pool add/remove/list) nécessitent
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` spécifiquement.

Aides CLI pour les responsables :

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Utilisez `--json` pour une sortie lisible par machine dans les scripts et les utilitaires CI.

Contrat de point de terminaison par défaut (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`) :

- `POST /acquire`
  - Requête : `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Succès : `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Épuisé/réessai : `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Succès : `{ status: "ok" }` (ou `2xx` vide)
- `POST /release`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Succès : `{ status: "ok" }` (ou `2xx` vide)
- `POST /admin/add` (secret du responsable uniquement)
  - Requête : `{ kind, actorId, payload, note?, status? }`
  - Succès : `{ status: "ok", credential }`
- `POST /admin/remove` (secret du responsable uniquement)
  - Requête : `{ credentialId, actorId }`
  - Succès : `{ status: "ok", changed, credential }`
  - Garde de bail actif : `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (secret du responsable uniquement)
  - Requête : `{ kind?, status?, includePayload?, limit? }`
  - Succès : `{ status: "ok", credentials, count }`

Forme de la charge utile pour le type Telegram :

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` doit être une chaîne d'identifiant de chat numérique Telegram.
- `admin/add` valide cette forme pour `kind: "telegram"` et rejette les charges utiles malformées.

### Ajout d'un channel au QA

L'ajout d'un channel au système QA markdown nécessite exactement deux choses :

1. Un adaptateur de transport pour le channel.
2. Un pack de scénarios qui exerce le contrat du channel.

N'ajoutez pas de nouvelle racine de commande QA de niveau supérieur lorsque l'hôte partagé `qa-lab` peut
prendre en charge le flux.

`qa-lab` possède les mécanismes de l'hôte partagé :

- la racine de commande `openclaw qa`
- démarrage et arrêt de la suite
- concurrence des workers
- écriture d'artefacts
- génération de rapports
- exécution du scénario
- alias de compatibilité pour les anciens scénarios `qa-channel`

Les plugins de runner sont propriétaires du contrat de transport :

- la manière dont `openclaw qa <runner>` est monté sous la racine partagée `qa`
- la manière dont la passerelle est configurée pour ce transport
- la manière dont la disponibilité est vérifiée
- la manière dont les événements entrants sont injectés
- la manière dont les messages sortants sont observés
- la manière dont les transcriptions et l'état normalisé du transport sont exposés
- la manière dont les actions basées sur le transport sont exécutées
- la manière dont la réinitialisation ou le nettoyage spécifique au transport est géré

Le seuil minimum d'adoption pour un nouveau channel est :

1. Gardez `qa-lab` comme propriétaire de la racine partagée `qa`.
2. Implémentez le runner de transport sur le seam d'hôte partagé `qa-lab`.
3. Gardez les mécanismes spécifiques au transport à l'intérieur du plugin de runner ou du harnais de channel.
4. Montez le runner en tant que `openclaw qa <runner>` au lieu d'enregistrer une commande racine concurrente.
   Les plugins de runner doivent déclarer `qaRunners` dans `openclaw.plugin.json` et exporter un tableau `qaRunnerCliRegistrations` correspondant depuis `runtime-api.ts`.
   Gardez `runtime-api.ts` léger ; l'exécution différée de la CLI et du runner doit rester derrière des points d'entrée distincts.
5. Rédigez ou adaptez des scénarios markdown dans les répertoires thématiques `qa/scenarios/`.
6. Utilisez les assistants de scénario génériques pour les nouveaux scénarios.
7. Assurez le fonctionnement des alias de compatibilité existants à moins que le dépôt ne procède à une migration intentionnelle.

La règle de décision est stricte :

- Si le comportement peut être exprimé une fois dans `qa-lab`, mettez-le dans `qa-lab`.
- Si le comportement dépend d'un transport de channel, gardez-le dans ce plugin de runner ou ce harnais de plugin.
- Si un scénario a besoin d'une nouvelle capacité que plus d'un channel peut utiliser, ajoutez un assistant générique au lieu d'une branche spécifique au channel dans `suite.ts`.
- Si un comportement n'est significatif que pour un transport, gardez le scénario spécifique au transport et rendez cela explicite dans le contrat du scénario.

Les noms d'assistants génériques préférés pour les nouveaux scénarios sont :

- `waitForTransportReady`
- `waitForChannelReady`
- `injectInboundMessage`
- `injectOutboundMessage`
- `waitForTransportOutboundMessage`
- `waitForChannelOutboundMessage`
- `waitForNoTransportOutbound`
- `getTransportSnapshot`
- `readTransportMessage`
- `readTransportTranscript`
- `formatTransportTranscript`
- `resetTransport`

Les alias de compatibilité restent disponibles pour les scénarios existants, notamment :

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

Les travaux sur les nouveaux canaux doivent utiliser les noms des assistants génériques.
Les alias de compatibilité existent pour éviter une migration « flag day », et non comme modèle pour
la création de nouveaux scénarios.

## Suites de tests (ce qui s'exécute où)

Considérez les suites comme un « réalisme croissant » (et une instabilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Configuration : dix exécutions séquentielles de shards (`vitest.full-*.config.ts`) sur les projets Vitest existants délimités
- Fichiers : les inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, et les tests node `ui` sur liste blanche couverts par `vitest.unit.config.ts`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration in-process (authentification de passerelle, routage, outils, analyse, configuration)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans CI
  - Aucune clé réelle requise
  - Doit être rapide et stable
- Note sur les projets :
  - Le `pnpm test` non ciblé exécute désormais onze configurations de shard plus petites (`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus géant de projet racine natif. Cela réduit le RSS de pointe sur les machines chargées et évite que les travaux de réponse automatique/extension ne privent les suites indépendantes de ressources.
  - `pnpm test --watch` utilise toujours le graphe de projet racine natif `vitest.config.ts`, car une boucle de surveillance multi-shard n'est pas pratique.
  - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent d'abord les cibles explicites de fichiers/répertoires via des voies délimitées, de sorte que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
  - `pnpm test:changed` étend les chemins git modifiés dans les mêmes voies délimitées lorsque le diff ne touche que les fichiers source/test routables ; les modifications de config/setup reviennent toujours à la réexécution large du projet racine.
  - `pnpm check:changed` est la passerelle locale intelligente normale pour le travail étroit. Il classifie le diff en core, core tests, extensions, extension tests, apps, docs et tooling, puis exécute les voies typecheck/lint/test correspondantes. Les modifications du SDK Public Plugin et du plugin-contract incluent la validation des extensions car celles-ci dépendent des contrats core.
  - Les tests unitaires légers en imports d'agents, de commandes, de plugins, d'helpers de réponse automatique, `plugin-sdk` et de zones utilitaires pures similaires passent par la voie `unit-fast`, qui ignore `test/setup-openclaw-runtime.ts` ; les fichiers lourds d'état/d'exécution restent sur les voies existantes.
  - Certains fichiers source helpers `plugin-sdk` et `commands` sélectionnés mappent également les exécutions en mode modifié à des tests frères explicites dans ces voies légères, afin que les modifications d'helpers évitent de réexécuter la suite lourde complète pour ce répertoire.
  - `auto-reply` possède désormais trois compartiments dédiés : les helpers core de premier niveau, les tests d'intégration `reply.*` de premier niveau et le sous-arbre `src/auto-reply/reply/**`. Cela permet de garder le travail le plus lourd du harnais de réponse à l'écart des tests bon marché de status/chunk/token.
- Note concernant le runner intégré :
  - Lorsque vous modifiez les entrées de découverte d'outil de message ou le contexte d'exécution de compactage,
    conservez les deux niveaux de couverture.
  - Ajoutez des régressions d'helpers ciblées pour les limites de routage/normalisation pures.
  - Maintenez également les suites d'intégration du runner intégré en bonne santé :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les identifiants délimités et le comportement de compactage passent toujours par les chemins réels `run.ts` / `compact.ts` ; les tests basés uniquement sur les assistants ne constituent pas un substitut suffisant pour ces chemins d'intégration.
- Note sur le pool :
  - La configuration de base de Vitest utilise maintenant `threads` par défaut.
  - La configuration partagée de Vitest corrige également `isolate: false` et utilise le lanceur non isolé dans les configurations des projets racines, e2e et live.
  - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute désormais également sur le lanceur non isolé partagé.
  - Chaque shard `pnpm test` hérite des mêmes valeurs par défaut `threads` + `isolate: false` de la configuration partagée Vitest.
  - Le lanceur partagé `scripts/run-vitest.mjs` ajoute désormais également `--no-maglev` par défaut pour les processus enfants Node de Vitest afin de réduire l'activité de compilation V8 lors des exécutions locales importantes. Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si vous devez comparer avec le comportement standard de V8.
- Note sur l'itération locale rapide :
  - `pnpm changed:lanes` indique quelles voies architecturales un diff déclenche.
  - Le hook de pré-commit exécute `pnpm check:changed --staged` après le formatage/linting intermédiaire, afin que les validations uniquement pour le cœur ne supportent pas le coût des tests d'extension, sauf si elles touchent des contrats publics orientés vers l'extension.
  - `pnpm test:changed` achemine via des voies délimitées lorsque les chemins modifiés correspondent proprement à une suite plus petite.
  - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement d'acheminement, mais avec une limite de workers plus élevée.
  - L'auto-mise à l'échelle locale des workers est désormais intentionnellement conservatrice et recule également lorsque la charge moyenne de l'hôte est déjà élevée, de sorte que plusieurs exécutions Vitest simultanées causent moins de dégâts par défaut.
  - La configuration de base de Vitest marque les fichiers de projets/configurations comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage des tests change.
  - La configuration conserve `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez un emplacement de cache explicite pour un profilage direct.
- Note sur le débogage des performances :
  - `pnpm test:perf:imports` active le rapport de durée d'importation Vitest ainsi que la sortie de répartition des importations.
  - `pnpm test:perf:imports:changed` limite la même vue de profilage aux fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les `test:changed` acheminés avec le chemin natif du projet racine pour ce diff validé et affiche le temps écoulé ainsi que le RSS maximal de macOS.
- `pnpm test:perf:changed:bench -- --worktree` effectue des benchmarks sur l'arborescence dirty actuelle en acheminant la liste des fichiers modifiés via `scripts/test-projects.mjs` et la configuration racine de Vitest.
  - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour le démarrage de Vitest/Vite et la surcharge de transformation.
  - `pnpm test:perf:profile:runner` écrit des profils CPU+tas du lanceur pour la suite de tests unitaires avec le parallélisme de fichiers désactivé.

### E2E (gateway smoke)

- Commande : `pnpm test:e2e`
- Configuration : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Paramètres d'exécution par défaut :
  - Utilise `threads` de Vitest avec `isolate: false`, correspondant au reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console verbeuse.
- Portée :
  - Comportement de bout en bout du passerelle multi-instance
  - Surfaces WebSocket/HTTP, appariement de nœuds et réseau plus lourd
- Attentes :
  - S'exécute dans la CI (lorsqu'elle est activée dans le pipeline)
  - Aucune vraie clé requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : OpenShell backend smoke

- Commande : `pnpm test:e2e:openshell`
- Fichier : `test/openshell-sandbox.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw sur un vrai `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers canonique distant via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un `openshell` CLI local ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (providers réels + models réels)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - « Est-ce que ce provider/model fonctionne vraiment _aujourd'hui_ avec de vrais identifiants ? »
  - Détecter les changements de format du provider, les bizarreries d'appel de tool, les problèmes d'auth et le comportement des limites de débit
- Attentes :
  - Non stable pour CI par conception (réseaux réels, politiques réelles des providers, quotas, pannes)
  - Coûte de l'argent / utilise les limites de débit
  - Préférez l'exécution de sous-ensembles réduits plutôt que « tout »
- Les exécutions Live sourcent `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions Live isolent toujours `HOME` et copient le matériel de config/auth dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre vrai `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests Live utilisent votre véritable répertoire personnel.
- `pnpm test:live` utilise par défaut un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avis supplémentaire `~/.profile` et réduit les journaux de démarrage de la passerelle/le bavardage Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au provider) : définissez `*_API_KEYS` avec le format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une substitution par live via `OPENCLAW_LIVE_*_KEY` ; les tests réessaient en cas de réponse de limite de débit.
- Sortie de progression/heartbeat :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels longs au provider soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de console Vitest afin que les lignes de progression du provider/de la passerelle diffusent immédiatement lors des exécutions Live.
  - Ajustez les pulsations du modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les pulsations de la passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez modifié beaucoup de choses)
- Modification du réseau de la passerelle / protocole WS / appairage : ajoutez `pnpm test:e2e`
- Débogage de "mon bot est en panne" / échecs spécifiques au fournisseur / appel d'outil : exécutez un `pnpm test:live` ciblé

## Live : analyse des capacités du nœud Android

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **toutes les commandes actuellement annoncées** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préconditionnelle/manuelle (la suite n'installe pas n'exécute/n'apparie pas l'application).
  - Validation `node.invoke` de la passerelle commande par commande pour le nœud Android sélectionné.
- Configuration préalable requise :
  - Application Android déjà connectée + appariée à la passerelle.
  - Application maintenue au premier plan.
  - Autorisations/consentement de capture accordés pour les capacités que vous attendez voir réussir.
- Remplacements de cible facultatifs :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails de la configuration complète d'Android : [Application Android](/fr/platforms/android)

## Live : test de fumée du modèle (clés de profil)

Les tests en direct sont divisés en deux couches afin que nous puissions isoler les échecs :

- "Modèle direct" nous indique si le fournisseur/modèle peut répondre du tout avec la clé donnée.
- "Test de fumée de la passerelle" nous indique si le pipeline complet passerelle+agent fonctionne pour ce modèle (sessions, historique, outils, stratégie de bac à sable, etc.).

### Couche 1 : Achèvement du modèle direct (sans passerelle)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les modèles découverts
  - Utilisez `getApiKeyForModel` pour sélectionner les modèles pour lesquels vous disposez d'identifiants
  - Exécuter une petite completion par modèle (et des régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour modern) pour exécuter réellement cette suite ; sinon, elle l'ignore pour garder `pnpm test:live` concentré sur le smoke test de la passerelle.
- Comment sélectionner les modèles :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste blanche moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste blanche moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (liste blanche séparée par des virgules)
  - Les parcours Modern/all par défaut à une limite curée à fort signal ; définissez `OPENCLAW_LIVE_MAX_MODELS=0` pour un parcours moderne exhaustif ou un nombre positif pour une limite plus petite.
- Comment sélectionner les fournisseurs :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste blanche séparée par des virgules)
- D'où viennent les clés :
  - Par défaut : magasin de profil et replis d'env (environnement)
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour appliquer uniquement le **magasin de profil**
- Pourquoi cela existe :
  - Sépare « l'API du fournisseur est cassée / la clé n'est pas valide » de « le pipeline de l'agent de la passerelle est cassé »
  - Contient de petites régressions isolées (exemple : repli du raisonnement OpenAI Responses/Codex Responses + flux d'appels d'outils)

### Couche 2 : Smoke test passerelle + agent dev (ce que fait réellement "@openclaw")

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une passerelle en cours de processus
  - Créer/patcher une session `agent:dev:*` (remplacement de modèle par exécution)
  - Parcourir les modèles-avec-clés et vérifier :
    - réponse « significative » (pas d'outils)
    - une invocation d'outil réel fonctionne (sonde de lecture)
    - sondes d'outil supplémentaires facultatives (sonde exec+lecture)
    - Les chemins de régression OpenAI (appel d'outil uniquement → suivi) continuent de fonctionner
- Détails de la sonde (afin que vous puissiez expliquer rapidement les échecs) :
  - Sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - Sonde `exec+read` : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le modèle renvoie `cat <CODE>`.
  - Référence de mise en œuvre : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou liste séparée par des virgules) pour restreindre
  - Les parcours modernes/totaux de la passerelle (gateway) utilisent par défaut une limite curée à signal élevé ; définissez `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` pour un parcours moderne exhaustif ou un nombre positif pour une limite plus petite.
- Comment sélectionner les fournisseurs (éviter « OpenRouter tout ») :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondages d'outils (tool) et d'images sont toujours activés dans ce test en direct :
  - sondage `read` + sondage `exec+read` (stress de l'outil)
  - le sondage d'image s'exécute lorsque le modèle annonce la prise en charge des entrées d'image
  - Flux (haut niveau) :
    - Le test génère un tout petit PNG avec « CAT » + code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Le Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Astuce : pour voir ce que vous pouvez tester sur votre machine (et les ids `provider/model` exacts), exécutez :

```bash
openclaw models list
openclaw models list --json
```

## En direct : test de fumée du backend CLI (Claude, Codex, Gemini ou autres CLI locaux)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline Gateway + agent en utilisant un backend CLI local, sans toucher à votre configuration par défaut.
- Les valeurs par défaut du test de fumée spécifiques au backend se trouvent dans la définition `cli-backend.ts` de l'extension propriétaire.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valeurs par défaut :
  - Fournisseur/modèle par défaut : `claude-cli/claude-sonnet-4-6`
  - Le comportement de commande/args/image provient des métadonnées du plugin backend CLI propriétaire.
- Remplacements (facultatif) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une pièce jointe image réelle (les chemins sont injectés dans le prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins des fichiers image en tant qu'args CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la façon dont les args d'image sont passés lorsque `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un second tour et valider le flux de reprise.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` pour désactiver la sonde de continuité de session par défaut Claude Sonnet -> Opus (définir sur `1` pour la forcer lorsque le modèle sélectionné prend en charge une cible de basculement).

Exemple :

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Recette Docker :

```bash
pnpm test:docker:live-cli-backend
```

Recettes Docker pour fournisseur unique :

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

Notes :

- Le runner Docker se trouve à `scripts/test-live-cli-backend-docker.sh`.
- Il exécute le test de fumée backend CLI live à l'intérieur de l'image Docker du dépôt en tant qu'utilisateur non-root `node`.
- Il résout les métadonnées de test de fumée CLI à partir de l'extension propriétaire, puis installe le package Linux CLI correspondant (`@anthropic-ai/claude-code`, `@openai/codex` ou `@google/gemini-cli`) dans un préfixe inscriptible en cache à `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (par défaut : `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` nécessite un abonnement portable Claude Code OAuth soit via `~/.claude/.credentials.json` avec `claudeAiOauth.subscriptionType`, soit via `CLAUDE_CODE_OAUTH_TOKEN` depuis `claude setup-token`. Il prouve d'abord le `claude -p` direct dans Docker, puis exécute deux tours backend Gateway CLI sans préserver les vars d'env de clé API Anthropic API. Cette voie d'abonnement désactive les sondes d'image et d'outil/MCP de Claude par défaut car Claude achemine actuellement l'utilisation des applications tierces via la facturation à l'usage supplémentaire au lieu des limites du plan d'abonnement normal.
- Le test de fumée backend CLI live exerce désormais le même flux de bout en bout pour Claude, Codex et Gemini : tour de texte, tour de classification d'image, puis appel d'outil MCP `cron` vérifié via le CLI de la passerelle.
- Le test de fumée par défaut de Claude corrige également la session de Sonnet à Opus et vérifie que la session reprise se souvient toujours d'une note antérieure.

## Live : Test de fumée de liaison ACP (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de conversation-bind ACP avec un agent ACP en direct :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation de canal de message synthétique en place
  - envoyer une suite normale sur cette même conversation
  - vérifier que la suite atterrit dans la transcription de session ACP liée
- Activer :
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Valeurs par défaut :
  - Agents ACP dans Docker : `claude,codex,gemini`
  - Agent ACP pour `pnpm test:live ...` direct : `claude`
  - Canal synthétique : contexte de conversation style DM Slack
  - Backend ACP : `acpx`
- Remplacements :
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- Notes :
  - Ce parcours utilise la surface `chat.send` de la passerelle avec des champs de route d'origine synthétiques réservés aux administrateurs, afin que les tests puissent attacher un contexte de canal de message sans prétendre effectuer une livraison externe.
  - Lorsque `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` n'est pas défini, le test utilise le registre d'agents intégré du plugin `acpx` pour l'agent de harnais ACP sélectionné.

Exemple :

```bash
OPENCLAW_LIVE_ACP_BIND=1 \
  OPENCLAW_LIVE_ACP_BIND_AGENT=claude \
  pnpm test:live src/gateway/gateway-acp-bind.live.test.ts
```

Recette Docker :

```bash
pnpm test:docker:live-acp-bind
```

Recettes Docker à agent unique :

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:gemini
```

Notes Docker :

- Le lanceur Docker se trouve à `scripts/test-live-acp-bind-docker.sh`.
- Par défaut, il exécute le test de fumage de liaison ACP contre tous les agents CLI en direct pris en charge en séquence : `claude`, `codex`, puis `gemini`.
- Utilisez `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` ou `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` pour réduire la matrice.
- Il sourcé `~/.profile`, met en scène le matériel d'authentification CLI correspondant dans le conteneur, installe `acpx` dans un préfixe npm inscriptible, puis installe le CLI en direct demandé (`@anthropic-ai/claude-code`, `@openai/codex`, ou `@google/gemini-cli`) si manquant.
- À l'intérieur de Docker, le lanceur définit `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` afin qu'acpx garde les variables d'environnement du fournisseur du profil sourcé disponibles pour le CLI du harnais enfant.

## Live : Test de fumage du harnais app-server Codex

- Objectif : valider le harnais Codex détenu par le plugin via la méthode normale de passerelle
  `agent` :
  - charger le plugin groupé `codex`
  - sélectionner `OPENCLAW_AGENT_RUNTIME=codex`
  - envoyer un premier tour d'agent de passerelle à `codex/gpt-5.4`
  - envoyer un second tour à la même session OpenClaw et vérifier que le fil
    d'exécution du serveur d'application peut reprendre
  - exécuter `/codex status` et `/codex models` via le même chemin de commande
    de passerelle
- Test : `src/gateway/gateway-codex-harness.live.test.ts`
- Activer : `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Modèle par défaut : `codex/gpt-5.4`
- Sonde d'image facultative : `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonde MCP/tool facultative : `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- Le test de fumée définit `OPENCLAW_AGENT_HARNESS_FALLBACK=none` afin qu'un harnais Codex
  défaillant ne puisse pas passer en retombant silencieusement sur PI.
- Auth : `OPENAI_API_KEY` depuis le shell/profil, plus copie facultative
  `~/.codex/auth.json` et `~/.codex/config.toml`

Recette locale :

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=codex/gpt-5.4 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Recette Docker :

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Notes Docker :

- Le runner Docker se trouve à `scripts/test-live-codex-harness-docker.sh`.
- Il sourc le `~/.profile` monté, passe `OPENAI_API_KEY`, copie les fichiers
  d'auth Codex CLI lorsqu'ils sont présents, installe `@openai/codex` dans un préfixe npm
  monté en écriture, met en scène l'arborescence source, puis exécute uniquement le test live Codex-harness.
- Docker active les sondes d'image et MCP/tool par défaut. Définissez
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` ou
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` lorsque vous avez besoin d'un exécution de débogage plus étroite.
- Docker exporte également `OPENCLAW_AGENT_HARNESS_FALLBACK=none`, correspondant à la configuration
  du test live afin que `openai-codex/*` ou le repli PI ne puisse pas masquer une régression
  du harnais Codex.

### Recettes live recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins fiables :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, test de fumée de passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel de tool sur plusieurs fournisseurs :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé d'API Gemini + Antigravity) :
  - Gemini (clé d'API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise l'API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison de l'agent style Cloud Code Assist).
- `google-gemini-cli/...` utilise la CLI Gemini locale sur votre machine (authentification séparée + particularités des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle l'API Gemini hébergée par Google via HTTP (clé API / auth profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw délègue à un binaire `gemini` local ; il possède sa propre authentification et peut se comporter différemment (streaming/support des outils/décalage de version).

## Live : matrice de models (ce que nous couvrons)

Il n'y a pas de « liste de models CI » fixe (live est optionnel), mais voici les models **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de test de fumée moderne (appel d'outil + image)

Il s'agit de l'exécution des « models courants » que nous nous attendons à maintenir fonctionnels :

- OpenAI (non-Codex) : `openai/gpt-5.4` (optionnel : `openai/gpt-5.4-mini`)
- Codex OpenAI : `openai-codex/gpt-5.4`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (API Gemini) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (éviter les anciens models Gemini 2.x)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Exécuter le test de fumée de la passerelle avec outils + image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Référence : appel d'outil (Read + Exec optionnel)

Choisissez au moins un par famille de provider :

- OpenAI : `openai/gpt-5.4` (ou `openai/gpt-5.4-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Couverture supplémentaire optionnelle (la bienvenue) :

- xAI : `xai/grok-4` (ou la dernière disponible)
- Mistral : `mistral/`… (choisissez un model capable « d'outils » que vous avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; tool calling depends on API mode)

### Vision : envoi d'image (attachment → multimodal message)

Incluez au moins un modèle compatible avec les images dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes Claude/Gemini/OpenAI compatibles avec la vision, etc.) pour exercer la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez activé les clés, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (centaines de modèles ; utilisez `openclaw models scan` pour trouver les candidats compatibles avec les outils et les images)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

D'autres fournisseurs que vous pouvez inclure dans la matrice en direct (si vous avez des identifiants/config) :

- Intégré : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Astuce : n'essayez pas de coder en dur « tous les modèles » dans les docs. La liste faisant autorité est ce que `discoverModels(...)` renvoie sur votre machine + les clés disponibles.

## Identifiants (jamais à valider)

Les tests en direct découvrent les identifiants de la même manière que le CLI. Implications pratiques :

- Si le CLI fonctionne, les tests en direct devraient trouver les mêmes clés.
- Si un test en direct indique « no creds », déboguez de la même manière que vous débogueriez `openclaw models list` / la sélection de modèle.

- Profils d'auth par agent : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (c'est ce que signifie « profile keys » dans les tests en direct)
- Config : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Legacy state dir : `~/.openclaw/credentials/` (copied into the staged live home when present, but not the main profile-key store)
- Live local runs copy the active config, per-agent `auth-profiles.json` files, legacy `credentials/`, and supported external CLI auth dirs into a temp test home by default; staged live homes skip `workspace/` and `sandboxes/`, and `agents.*.workspace` / `agentDir` path overrides are stripped so probes stay off your real host workspace.

If you want to rely on env keys (e.g. exported in your `~/.profile`), run local tests after `source ~/.profile`, or use the Docker runners below (they can mount `~/.profile` into the container).

## Deepgram live (audio transcription)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Enable : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- Test : `src/agents/byteplus.live.test.ts`
- Enable : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Optional model override : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI workflow media live

- Test : `extensions/comfy/comfy.live.test.ts`
- Enable : `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Scope :
  - Exercises the bundled comfy image, video, and `music_generate` paths
  - Skips each capability unless `models.providers.comfy.<capability>` is configured
  - Useful after changing comfy workflow submission, polling, downloads, or plugin registration

## Image generation live

- Test : `src/image-generation/runtime.live.test.ts`
- Command : `pnpm test:live src/image-generation/runtime.live.test.ts`
- Harness : `pnpm test:live:media image`
- Scope :
  - Enumerates every registered image-generation provider plugin
  - Loads missing provider env vars from your login shell (`~/.profile`) before probing
  - Uses live/env API keys ahead of stored auth profiles by default, so stale test keys in `auth-profiles.json` do not mask real shell credentials
  - Skips providers with no usable auth/profile/model
  - Runs the stock image-generation variants through the shared runtime capability :
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Fournisseurs groupés actuels couverts :
  - `openai`
  - `google`
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportement d'authentification optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du profil de stockage et ignorer les remplacements uniquement via env

## Génération de musique en direct

- Test : `extensions/music-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media music`
- Portée :
  - Exerce le chemin du fournisseur de génération de musique groupé partagé
  - Couvre actuellement Google et MiniMax
  - Charge les env vars du fournisseur depuis votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API en direct/env avant les profils d'authentification stockés, afin que les clés de test périmées dans `auth-profiles.json` ne masquent pas les véritables informations d'identification du shell
  - Ignore les fournisseurs sans authentification/profil/model utilisable
  - Exécute les deux modes d'exécution déclarés lorsqu'ils sont disponibles :
    - `generate` avec une entrée de type prompt uniquement
    - `edit` lorsque le fournisseur déclare `capabilities.edit.enabled`
  - Couverture actuelle du couloir partagé :
    - `google` : `generate`, `edit`
    - `minimax` : `generate`
    - `comfy` : fichier Comfy live séparé, pas ce balayage partagé
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- Comportement d'authentification optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du profil de stockage et ignorer les remplacements uniquement via env

## Génération de vidéo en direct

- Test : `extensions/video-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media video`
- Portée :
  - Exerce le chemin du fournisseur de génération de vidéo groupé partagé
  - Par défaut, le chemin de smoke sûr pour la version : fournisseurs non-FAL, une requête texte-vers-vidéo par fournisseur, un prompt homard d'une seconde, et une plafond d'opérations par fournisseur depuis `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` par défaut)
  - Ignore FAL par défaut car la latence de la file d'attente côté fournisseur peut dominer le temps de diffusion ; passez `--video-providers fal` ou `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` pour l'exécuter explicitement
  - Charge les env vars du fournisseur depuis votre shell de connexion (`~/.profile`) avant la sonde
  - Utilise les clés d'API live/env par défaut avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les fournisseurs sans auth/profil/model utilisable
  - N'exécute que `generate` par défaut
  - Définissez `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` pour exécuter également les modes de transformation déclarés lorsque disponibles :
    - `imageToVideo` lorsque le fournisseur déclare `capabilities.imageToVideo.enabled` et que le fournisseur/model sélectionné accepte les images locales supportées par un tampon dans le balayage partagé
    - `videoToVideo` lorsque le fournisseur déclare `capabilities.videoToVideo.enabled` et que le fournisseur/model sélectionné accepte les vidéos locales supportées par un tampon dans le balayage partagé
  - Fournisseurs `imageToVideo` actuellement déclarés mais ignorés dans le balayage partagé :
    - `vydra` car `veo3` groupé est texte uniquement et `kling` groupé nécessite une URL d'image distante
  - Couverture Vydra spécifique au fournisseur :
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ce fichier exécute du texte-vers-vidéo `veo3` plus une voie `kling` qui utilise par défaut une fixture d'URL d'image distante
  - Couverture live actuelle `videoToVideo` :
    - `runway` uniquement lorsque le modèle sélectionné est `runway/gen4_aleph`
  - Fournisseurs `videoToVideo` actuellement déclarés mais ignorés dans le balayage partagé :
    - `alibaba`, `qwen`, `xai` car ces chemins nécessitent actuellement des URL de référence `http(s)` / MP4 distantes
    - `google` car la voie Gemini/Veo partagée actuelle utilise une entrée locale supportée par un tampon et ce chemin n'est pas accepté dans le balayage partagé
    - `openai` car la voie partagée actuelle manque de garanties d'accès à la restauration/remix vidéo spécifiques à l'organisation
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` pour inclure chaque fournisseur dans le balayage par défaut, y compris FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` pour réduire la limite d'opérations de chaque fournisseur pour une exécution de test de fumée agressive
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les remplacements uniquement par env

## Harnais de media live

- Commande : `pnpm test:live:media`
- Objectif :
  - Exécute les suites live partagées d'image, de musique et de vidéo via un point d'entrée natif du dépôt
  - Charge automatiquement les env vars de fournisseur manquants depuis `~/.profile`
  - Réduit automatiquement chaque suite aux fournisseurs qui ont actuellement une authentification utilisable par défaut
  - Réutilise `scripts/test-live.mjs`, donc le comportement du rythme cardiaque et du mode silencieux reste cohérent
- Exemples :
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Runners Docker (vérifications facultatives « fonctionne dans Linux »)

Ces runners Docker sont divisés en deux catégories :

- Runners de modèle live : `test:docker:live-models` et `test:docker:live-gateway` n'exécutent que leur fichier live correspondant à la clé de profil à l'intérieur de l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de config et votre espace de travail local (et en sourçant `~/.profile` si monté). Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Par défaut, les runners live Docker utilisent une limite de test de fumée plus petite pour qu'un balayage Docker complet reste pratique :
  `test:docker:live-models` est par défaut `OPENCLAW_LIVE_MAX_MODELS=12`, et
  `test:docker:live-gateway` est par défaut `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Remplacez ces env vars lorsque vous
  voulez explicitement la analyse exhaustive plus large.
- `test:docker:all` construit l'image Docker live une fois via `test:docker:live-build`, puis la réutilise pour les deux voies Docker live.
- Container smoke runners : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels` et `test:docker:plugins` démarrant un ou plusieurs conteneurs réels et vérifiant les chemins d'intégration de niveau supérieur.

Les runners Docker de live-model effectuent également un bind-mount uniquement sur les répertoires d'auth CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin qu'OAuth CLI externe puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- ACP bind smoke : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh`)
- CLI backend smoke : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant de configuration (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Gateway networking (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Pont de channel MCP (Gateway amorcé + pont stdio + smoke du cadre de notification brut Claude) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (install smoke + alias `/plugin` + sémantique de redémarrage du bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)

Les exécuteurs Docker du modèle en direct (live-model) montent également en liaison (bind-mount) l'extraction actuelle (checkout) en lecture seule et la mettent en scène dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest sur votre source/configuration locale exacte. L'étape de mise en scène ignore les caches locaux volumineux et les sorties de construction de l'application tels que `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et les répertoires de sortie `.build` ou Gradle locaux à l'application, afin que les exécutions Docker en direct ne passent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` pour que les sondes en direct du Gateway ne démarrent pas de vrais workers de canal Telegram/Discord/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, donc transmettez également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture en direct du Gateway depuis cette voie Docker. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur Gateway OpenClaw avec les points de terminaison HTTP compatibles OpenAI activés, démarre un conteneur Open WebUI épinglé (pinned) contre ce Gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une vraie demande de chat via le proxy `/api/chat/completions` d'Open WebUI. La première exécution peut être sensiblement plus lente car Docker peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie attend une clé de modèle en direct utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir dans les exécutions Dockerisées. Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un vrai compte Telegram, Discord ou iMessage. Il démarre un conteneur Gateway ensemencé (seeded), démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte des conversations routées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements en direct, le routage d'envoi sortant, et les notifications de canal + autorisations de style Claude sur le pont MCP stdio réel. La vérification des notifications inspecte directement les trames MCP stdio brutes, donc le test de fumée valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à exposer.

Test de fumée de fil en langage clair ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Gardez ce script pour les workflows de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils ACP, donc ne le supprimez pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` pour vérifier uniquement les variables d'environnement sourcées depuis `OPENCLAW_PROFILE_FILE`, en utilisant des répertoires de configuration/espace de travail temporaires et aucun montage d'authentification CLI externe
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installations CLI mises en cache dans Docker
- Les répertoires/fichiers d'authentification CLI externes sous `$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions de fournisseur restreintes ne montent que les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les fournisseurs dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les réexécutions qui n'ont pas besoin d'être reconstruites
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du stockage de profil (pas de l'env)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le modèle exposé par la passerelle pour le test de fumage Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification du nonce utilisée par le test de fumée d'Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer la balise d'image Open WebUI épinglée

## Sanité de la documentation

Exécutez les vérifications de la documentation après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûr pour CI)

Ce sont des régressions de « vrai pipeline » sans vrais fournisseurs :

- Appel d'outil Gateway (OpenAI simulé, vraie boucle gateway + agent) : `src/gateway/gateway.test.ts` (cas : "exécute un appel d'outil OpenAI simulé de bout en bout via la boucle de l'agent gateway")
- Assistant Gateway (WS `wizard.start`/`wizard.next`, écriture de la configuration + authentification appliquée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant via ws et écrit la configuration du jeton d'authentification")

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour la CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Appel d'outil simulé via la vraie boucle gateway + agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les Skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les Skills sont répertoriés dans l'invite, l'agent choisit-il le bon Skill (ou évite-t-il ceux qui ne sont pas pertinents) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios à plusieurs tours qui affirment l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les évaluations futures doivent d'abord rester déterministes :

- Un exécuteur de scénario utilisant des fournisseurs simulés pour affirmer les appels d'outils + l'ordre, les lectures de fichiers de Skills et le câblage de session.
- Une petite suite de scénarios axés sur les Skills (utilisation vs évitement, filtrage, injection par invite).
- Évaluations en direct optionnelles (opt-in, limitées par env) uniquement après la mise en place de la suite sûre pour la CI.

## Tests contractuels (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son contrat d'interface. Ils parcourent tous les plugins découverts et exécutent une suite d'assertions de forme et de comportement. La voie `pnpm test` unitaire ignore intentionnellement ces fichiers de jointure et de fumée partagés ; exécutez les commandes de contrat explicitement lorsque vous touchez aux surfaces de channel ou de provider partagées.

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
- **directory** - API de répertoire/liste
- **group-policy** - Application de la stratégie de groupe

### Contrats de statut de provider

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sonde de statut du channel
- **registry** - Forme du registre de plugins

### Contrats de provider

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection d'authentification
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

Les tests de contrat s'exécutent dans CI et ne nécessitent pas de clés API réelles.

## Ajouter des régressions (conseils)

Lorsque vous corrigez un problème de provider/modèle découvert en direct :

- Ajoutez si possible une régression sans échec pour la CI (provider simulé/bouchon, ou capturez la transformation exacte de la forme de la requête)
- S'il est intrinsèquement uniquement en direct (limites de débit, stratégies d'authentification), gardez le test en direct étroit et facultatif via des variables d'environnement
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bogue de conversion/relecture de requête provider → test direct des modèles
  - bogue de pipeline session/historique/tool de la passerelle → test de fumée en direct de la passerelle ou test simulé de la passerelle sans échec pour la CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les id d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les id de cibles non classifiées afin que les nouvelles classes ne puissent pas être ignorées silencieusement.
