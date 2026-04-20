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

- Passage complet (attendu avant le push) : `pnpm build && pnpm check && pnpm test`
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

Astuce : lorsque vous avez besoin d'un seul cas d'échec, privilégiez la réduction des tests live via les env vars de liste autorisée décrits ci-dessous.

## Runners spécifiques QA

Ces commandes se situent à côté des principales suites de tests lorsque vous avez besoin du réalisme du labo QA :

- `pnpm openclaw qa suite`
  - Exécute les scénarios QA soutenus par le repo directement sur l'hôte.
  - Exécute plusieurs scénarios sélectionnés en parallèle par défaut avec des workers de passerelle isolés,
    jusqu'à 64 workers ou le nombre de scénarios sélectionnés. Utilisez
    `--concurrency <count>` pour ajuster le nombre de workers, ou `--concurrency 1` pour
    l'ancienne voie série.
- `pnpm openclaw qa suite --runner multipass`
  - Exécute la même suite QA dans une VM Multipass Linux jetable.
  - Conserve le même comportement de sélection de scénarios que `qa suite` sur l'hôte.
  - Réutilise les mêmes indicateurs de sélection de provider/modèle que `qa suite`.
  - Les exécutions Live transmettent les entrées d'auth QA prises en charge qui sont pratiques pour l'invité :
    clés de provider basées sur des variables d'environnement, le chemin de configuration du provider QA live, et `CODEX_HOME`
    si présent.
  - Les répertoires de sortie doivent rester sous la racine du repo afin que l'invité puisse écrire en retour via
    l'espace de travail monté.
  - Écrit le rapport QA normal + le résumé ainsi que les journaux Multipass dans
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Démarre le site QA pris en charge par Docker pour un travail de type opérateur.
- `pnpm openclaw qa matrix`
  - Exécute la voie QA en direct Matrix contre un serveur domestique Tuwunel jetable pris en charge par Docker.
  - Cet hôte QA est aujourd'hui réservé au repo/dev. Les installations empaquetées d'OpenClaw n'incluent pas
    `qa-lab`, elles n'exposent donc pas `openclaw qa`.
  - Les checkouts de repo chargent le runner groupé directement ; aucune étape d'installation de plugin séparée
    n'est nécessaire.
  - Provisionne trois utilisateurs temporaires Matrix (`driver`, `sut`, `observer`) plus une chambre privée, puis démarre un enfant passerelle QA avec le vrai plugin Matrix comme transport SUT.
  - Utilise par défaut l'image stable Tuwunel épinglée `ghcr.io/matrix-construct/tuwunel:v1.5.1`. Remplacez-la par `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` lorsque vous devez tester une image différente.
  - Matrix n'expose pas les indicateurs de source d'informations d'identification partagés car le voie provisionne des utilisateurs jetables localement.
  - Écrit un rapport QA Matrix, un résumé et un artefact d'événements observés sous `.artifacts/qa-e2e/...`.
- `pnpm openclaw qa telegram`
  - Exécute la voie QA en direct Telegram contre un groupe privé réel en utilisant les jetons de bot du pilote et du SUT à partir de l'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. L'identifiant de groupe doit être l'identifiant de chat numérique Telegram.
  - Prend en charge `--credential-source convex` pour les informations d'identification mutualisées. Utilisez le mode env par défaut, ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` pour opter pour les baux mutualisés.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable de bot à bot, activez le mode de communication bot-à-bot dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact de messages observés sous `.artifacts/qa-e2e/...`.

Les voies de transport en direct partagent un contrat standard pour que les nouveaux transports ne dérivent pas :

`qa-channel` reste la suite QA synthétique large et ne fait pas partie de la matrice de couverture du transport en direct.

| Voie     | Canary | Filtrage des mentions | Blocage de la liste autorisée | Réponse de niveau supérieur | Reprise après redémarrage | Suite de fil de discussion | Isolement du fil de discussion | Observation des réactions | Commande d'aide |
| -------- | ------ | --------------------- | ----------------------------- | --------------------------- | ------------------------- | -------------------------- | ------------------------------ | ------------------------- | --------------- |
| Matrix   | x      | x                     | x                             | x                           | x                         | x                          | x                              | x                         |                 |
| Telegram | x      |                       |                               |                             |                           |                            |                                |                           | x               |

### Informations d'identification partagées Telegram via Convex (v1)

Lorsque `--credential-source convex` (ou `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) est activé pour `openclaw qa telegram`, le laboratoire QA acquiert un bail exclusif depuis un pool soutenu par Convex, maintient un battement de cœur sur ce bail pendant que la voie s'exécute, et libère le bail à l'arrêt.

Référence de l'échafaudage de projet Convex :

- `qa/convex-credential-broker/`

Variables d'environnement requises :

- `OPENCLAW_QA_CONVEX_SITE_URL` (par exemple `https://your-deployment.convex.site`)
- Un secret pour le rôle sélectionné :
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` pour `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` pour `ci`
- Sélection du rôle d'identification :
  - CLI : `--credential-role maintainer|ci`
  - Par défaut de l'environnement : `OPENCLAW_QA_CREDENTIAL_ROLE` (valeur par défaut `maintainer`)

Variables d'environnement facultatives :

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (par défaut `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (par défaut `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (par défaut `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (par défaut `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (par défaut `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de trace facultatif)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` autorise les URL Convex en boucle locale `http://` pour un développement purement local.

`OPENCLAW_QA_CONVEX_SITE_URL` doit utiliser `https://` en fonctionnement normal.

Les commandes d'administration du mainteneur (ajout/suppression/liste du pool) nécessitent
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` spécifiquement.

CLI d'aide pour les mainteneurs :

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Utilisez `--json` pour une sortie lisible par machine dans les scripts et les utilitaires d'CI.

Contrat de point de terminaison par défaut (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`) :

- `POST /acquire`
  - Demande : `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Succès : `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Épuisé/réessai : `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - Demande : `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Succès : `{ status: "ok" }` (ou vide `2xx`)
- `POST /release`
  - Demande : `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Succès : `{ status: "ok" }` (ou vide `2xx`)
- `POST /admin/add` (secret du mainteneur uniquement)
  - Demande : `{ kind, actorId, payload, note?, status? }`
  - Succès : `{ status: "ok", credential }`
- `POST /admin/remove` (secret du mainteneur uniquement)
  - Demande : `{ credentialId, actorId }`
  - Succès : `{ status: "ok", changed, credential }`
  - Garde de bail actif : `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (secret du mainteneur uniquement)
  - Requête : `{ kind?, status?, includePayload?, limit? }`
  - Succès : `{ status: "ok", credentials, count }`

Structure de la charge utile pour le type Telegram :

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` doit être une chaîne d'identifiant de chat numérique Telegram.
- `admin/add` valide cette structure pour `kind: "telegram"` et rejette les charges utules malformées.

### Ajout d'un canal à QA

Ajouter un canal au système de réassurance markdown (QA) nécessite exactement deux choses :

1. Un adaptateur de transport pour le canal.
2. Un pack de scénarios qui exerce le contrat du canal.

N'ajoutez pas de nouvelle racine de commande QA de premier niveau lorsque l'hôte partagé `qa-lab` peut
posséder le flux.

`qa-lab` possède les mécanismes de l'hôte partagé :

- la racine de commande `openclaw qa`
- démarrage et arrêt de la suite
- concurrence des workers
- écriture d'artefacts
- génération de rapports
- exécution de scénarios
- alias de compatibilité pour les anciens scénarios `qa-channel`

Les plugins de runner possèdent le contrat de transport :

- comment `openclaw qa <runner>` est monté sous la racine partagée `qa`
- comment la passerelle est configurée pour ce transport
- comment la disponibilité est vérifiée
- comment les événements entrants sont injectés
- comment les messages sortants sont observés
- comment les transcriptions et l'état normalisé du transport sont exposés
- comment les actions soutenues par le transport sont exécutées
- comment la réinitialisation ou le nettoyage spécifique au transport est géré

Le niveau d'adoption minimum pour un nouveau canal est :

1. Garder `qa-lab` comme propriétaire de la racine partagée `qa`.
2. Implémenter le runner de transport sur la couture de l'hôte partagé `qa-lab`.
3. Garder les mécanismes spécifiques au transport à l'intérieur du plugin runner ou du harnais du canal.
4. Monter le runner en tant que `openclaw qa <runner>` au lieu d'enregistrer une commande racine concurrente.
   Les plugins de runner doivent déclarer `qaRunners` dans `openclaw.plugin.json` et exporter un tableau `qaRunnerCliRegistrations` correspondant depuis `runtime-api.ts`.
   Garder `runtime-api.ts` léger ; l'exécution CLI paresseuse et du runner doit rester derrière des points d'entrée séparés.
5. Rédiger ou adapter des scénarios markdown sous `qa/scenarios/`.
6. Utilisez les assistants de scénario génériques pour les nouveaux scénarios.
7. Gardez les alias de compatibilité existants fonctionnels, sauf si le dépôt effectue une migration intentionnelle.

La règle de décision est stricte :

- Si le comportement peut être exprimé une fois dans `qa-lab`, mettez-le dans `qa-lab`.
- Si le comportement dépend d'un transport de canal, gardez-le dans le plugin du runner ou le harnais du plugin.
- Si un scénario a besoin d'une nouvelle capacité que plus d'un canal peut utiliser, ajoutez un assistant générique au lieu d'une branche spécifique au canal dans `suite.ts`.
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

Les alias de compatibilité restent disponibles pour les scénarios existants, y compris :

- `waitForQaChannelReady`
- `waitForOutboundMessage`
- `waitForNoOutbound`
- `formatConversationTranscript`
- `resetBus`

Les travaux sur les nouveaux canaux doivent utiliser les noms d'assistants génériques.
Les alias de compatibilité existent pour éviter une migration par étapes (flag day), et non comme modèle pour
la création de nouveaux scénarios.

## Suites de tests (ce qui s'exécute où)

Considérez les suites comme « un réalisme croissant » (et une instabilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Config : dix exécutions séquentielles de shards (`vitest.full-*.config.ts`) sur les projets Vitest existants délimités
- Fichiers : les inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, et les tests node whitelistés `ui` couverts par `vitest.unit.config.ts`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en cours de processus (authentification de passerelle, routage, outils, analyse, configuration)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans la CI
  - Aucune clé réelle requise
  - Doit être rapide et stable
- Note sur les projets :
  - Le `pnpm test` non ciblé exécute désormais onze configurations de shard plus petites (`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus géant de projet racine natif. Cela réduit le RSS maximal sur les machines chargées et évite que le travail de réponse automatique/d'extension ne fasse souffrir les suites non liées.
  - Le `pnpm test --watch` utilise toujours le graphe de projet natif racine `vitest.config.ts`, car une boucle de surveillance multi-shard n'est pas pratique.
  - Les `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent les cibles de fichiers/répertoires explicites d'abord via des voies délimitées, de sorte que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
  - Le `pnpm test:changed` développe les chemins git modifiés dans les mêmes voies délimitées lorsque le diff ne touche que les fichiers source/test routables ; les modifications de configuration/configuration reviennent toujours au réexécution large du projet racine.
  - Les tests unitaires légers en importation des agents, commandes, plugins, assistants de réponse automatique, `plugin-sdk` et zones utilitaires pures similaires passent par la voie `unit-fast`, qui saute `test/setup-openclaw-runtime.ts` ; les fichiers lourds avec état/restent sur les voies existantes.
  - Certains fichiers source d'assistance `plugin-sdk` et `commands` sélectionnés mappent également les exécutions en mode modifié à des tests frères explicites dans ces voies légères, afin que les modifications d'assistance évitent de réexécuter la suite lourde complète pour ce répertoire.
  - Le `auto-reply` dispose désormais de trois seaux dédiés : les assistants de base de niveau supérieur, les tests d'intégration `reply.*` de niveau supérieur et le sous-arbre `src/auto-reply/reply/**`. Cela permet de garder le travail le plus lourd du harnais de réponse à l'écart des tests peu coûteux de status/chunk/token.
- Note sur le runner intégré :
  - Lorsque vous modifiez les entrées de découverte des message-tool ou le contexte d'exécution de la compaction, maintenez les deux niveaux de couverture.
  - Ajoutez des régressions d'assistant ciblées pour les limites pures de routage/normalisation.
  - Maintenez également les suites d'intégration du runner intégré en bonne santé :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les identifiants délimités (scoped ids) et le comportement de compaction circulent toujours
    à travers les vrais chemins `run.ts` / `compact.ts` ; les tests d'assistant uniquement ne sont pas un
    substitut suffisant pour ces chemins d'intégration.
- Note sur le pool :
  - La configuration de base de Vitest utilise désormais `threads` par défaut.
  - La configuration partagée de Vitest corrige également `isolate: false` et utilise le runner non isolé sur les projets racine, e2e et les configurations live.
  - La voie (lane) UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute désormais également sur le runner partagé non isolé.
  - Chaque shard `pnpm test` hérite des mêmes valeurs par défaut `threads` + `isolate: false` de la configuration partagée Vitest.
  - Le lanceur `scripts/run-vitest.mjs` partagé ajoute désormais également `--no-maglev` par défaut pour les processus enfants Node de Vitest afin de réduire l'activité de compilation V8 lors des grandes exécutions locales. Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si vous devez comparer avec le comportement standard de V8.
- Note sur l'itération locale rapide :
  - `pnpm test:changed` route à travers les voies délimitées lorsque les chemins modifiés correspondent proprement à une suite plus petite.
  - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement de routage, mais avec une limite de workers plus élevée.
  - La mise à l'échelle automatique des workers locaux est désormais intentionnellement conservatrice et se désactive également lorsque la charge moyenne de l'hôte est déjà élevée, afin que plusieurs exécutions Vitest simultanées causent moins de dégâts par défaut.
  - La configuration de base de Vitest marque les fichiers de projets/configuration comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage des tests change.
  - La configuration conserve `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez un emplacement de cache explicite pour un profilage direct.
- Note sur le débogage de performance :
  - `pnpm test:perf:imports` active le rapport de durée d'importation de Vitest ainsi que la sortie détaillée des importations.
  - `pnpm test:perf:imports:changed` limite la même vue de profilage aux fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les `test:changed` acheminées avec le chemin natif du projet racine pour ce diff validé et affiche le temps écoulé ainsi que le RSS max macOS.
- `pnpm test:perf:changed:bench -- --worktree` évalue les performances de l'arborescence sale actuelle en acheminant la liste des fichiers modifiés via `scripts/test-projects.mjs` et la configuration racine de Vitest.
  - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour le démarrage et la surcharge de transformation de Vitest/Vite.
  - `pnpm test:perf:profile:runner` écrit les profils CPU+tas du lanceur pour la suite de tests unitaires avec le parallélisme de fichiers désactivé.

### E2E (test rapide de la passerelle)

- Commande : `pnpm test:e2e`
- Configuration : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `threads` avec `isolate: false`, correspondant au reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Remplacements utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie verbeuse de la console.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appariement de nœuds et réseau plus intensif
- Attentes :
  - S'exécute dans CI (lorsqu'elle est activée dans le pipeline)
  - Aucune clé réelle requise
  - Plus de composants mobiles que les tests unitaires (peut être plus lent)

### E2E : test rapide du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `test/openshell-sandbox.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell d'OpenClaw sur du `sandbox ssh-config` réel + exec SSH
  - Vérifie le comportement du système de fichiers canonique distant via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution par défaut de `pnpm test:e2e`
  - Nécessite un CLI `openshell` local ainsi qu'un démon Docker fonctionnel
  - Utilise `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (fournisseurs réels + modèles réels)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - « Est-ce que ce fournisseur/modèle fonctionne réellement _aujourd'hui_ avec de vrais identifiants ? »
  - Détecter les changements de format de fournisseur, les singularités d'appel d'outil, les problèmes d'auth et le comportement des limites de débit
- Attentes :
  - Non stable en CI par conception (réseaux réels, politiques réelles de fournisseurs, quotas, pannes)
  - Coûte de l'argent / utilise les limites de débit
  - Privilégiez l'exécution de sous-ensembles réduits plutôt que de « tout »
- Live exécute la source `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions live isolent toujours `HOME` et copient le matériel de config/auth dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre vrai `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests live utilisent votre vrai répertoire personnel.
- `pnpm test:live` utilise désormais par défaut un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avis `~/.profile` supplémentaire et coupe les journaux de démarrage de la passerelle et le bavardage Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au fournisseur) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une substitution par live via `OPENCLAW_LIVE_*_KEY` ; les tests réessaient en cas de réponse de limite de débit.
- Sortie de progression/battement de cœur :
  - Les suites live émettent désormais des lignes de progression vers stderr afin que les appels fournisseurs longs soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de la console Vitest afin que les lignes de progression du provider/gateway diffusent immédiatement lors des exécutions en direct.
  - Ajustez les battements de cœur du modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les battements de cœur de la passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Toucher au réseau de la passerelle / protocole WS / appariement : ajoutez `pnpm test:e2e`
- Débogage de « mon bot est en panne » / échecs spécifiques au provider / appel d'outil : exécutez un `pnpm test:live` réduit

## Live : Android node capability sweep

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **chaque commande actuellement annoncée** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préalable/manuelle (la suite n'installe pas n'exécute pas n'apparie pas l'application).
  - Validation de la passerelle `node.invoke` commande par commande pour le nœud Android sélectionné.
- Prérequis requis :
  - Application Android déjà connectée et appariée à la passerelle.
  - Application maintenue au premier plan.
  - Autorisations/consentement de capture accordés pour les fonctionnalités que vous attendez réussir.
- Remplacements de cible facultatifs :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Android App](/fr/platforms/android)

## Live : model smoke (clés de profil)

Les tests en direct sont divisés en deux couches afin que nous puissions isoler les échecs :

- « Modèle direct » nous indique si le provider/modèle peut répondre du tout avec la clé donnée.
- « Gateway smoke » nous indique si le pipeline complet passerelle+agent fonctionne pour ce modèle (sessions historique outils politique de bac à sable etc.).

### Couche 1 : Achèvement du modèle direct (pas de passerelle)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les modèles découverts
  - Utilisez `getApiKeyForModel` pour sélectionner les modèles pour lesquels vous avez des identifiants
  - Exécuter une petite complétion par modèle (et des régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour modern) pour exécuter réellement cette suite ; sinon elle est ignorée pour garder `pnpm test:live` concentré sur le smoke test du gateway
- Comment sélectionner les modèles :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (liste d'autorisation par virgule)
  - Les parcours Modern/all par défaut à une limite curée à fort signal ; définissez `OPENCLAW_LIVE_MAX_MODELS=0` pour un parcours moderne exhaustif ou un nombre positif pour une limite plus petite.
- Comment sélectionner les providers :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation par virgule)
- D'où viennent les clés :
  - Par défaut : magasin de profil et replis d'env
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'utilisation du **magasin de profil** uniquement
- Pourquoi cela existe :
  - Sépare « l'API du provider est cassée / la clé est invalide » de « le pipeline de l'agent gateway est cassé »
  - Contient de petites régressions isolées (exemple : rejeu de raisonnement OpenAI Responses/Codex Responses + flux d'appels d'outils)

### Couche 2 : Gateway + smoke test de l'agent de développement (ce que fait réellement « @openclaw »)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer un gateway en cours de processus
  - Créer/patcher une session `agent:dev:*` (remplacement de modèle par exécution)
  - Itérer les modèles avec clés et vérifier :
    - réponse « significative » (pas d'outils)
    - une invocation d'outil réel fonctionne (sonde de lecture)
    - sondes d'outils supplémentaires optionnelles (sonde exec+read)
    - Les chemins de régression OpenAI (tool-call-only → follow-up) continuent de fonctionner
- Détails des sondes (pour que vous puissiez expliquer rapidement les échecs) :
  - sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - sonde `exec+read` : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de le `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le modèle renvoie `cat <CODE>`.
  - Référence d'implémentation : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou liste séparée par des virgules) pour restreindre
  - Les parcours modernes/complets de la passerelle sont par défaut limités à un ensemble soigneusement sélectionné ; définissez `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` pour un parcours moderne exhaustif ou un nombre positif pour une limite plus petite.
- Comment sélectionner les providers (éviter « tout OpenRouter ») :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondages d'outils et d'images sont toujours activés dans ce test en direct :
  - Sondage `read` + sondage `exec+read` (stress de l'outil)
  - le sondage d'image s'exécute lorsque le modèle annonce la prise en charge des entrées d'image
  - Flux (haut niveau) :
    - Le test génère un petit PNG avec « CAT » + un code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Conseil : pour voir ce que vous pouvez tester sur votre machine (et les IDs exacts `provider/model`), exécutez :

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
- Par défaut :
  - Provider/modèle par défaut : `claude-cli/claude-sonnet-4-6`
  - Le comportement de commande/args/image provient des métadonnées du plugin de backend CLI propriétaire.
- Remplacements (facultatif) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une véritable pièce jointe image (les chemins sont injectés dans le prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins de fichiers image en tant qu'args CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la manière dont les args d'image sont passés lorsque `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un second tour et valider le flux de reprise.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` pour désactiver la sonde de continuité de session par défaut Claude Sonnet -> Opus (définir sur `1` pour forcer son activation lorsque le model sélectionné prend en charge une cible de commutation).

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

- Le runner Docker se trouve dans `scripts/test-live-cli-backend-docker.sh`.
- Il exécute le smoke de backend CLI en direct à l'intérieur de l'image Docker du dépôt en tant qu'utilisateur `node` non-root.
- Il résout les métadonnées de smoke CLI à partir de l'extension propriétaire, puis installe le package Linux CLI correspondant (`@anthropic-ai/claude-code`, `@openai/codex`, ou `@google/gemini-cli`) dans un préfixe inscriptible en cache à `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (par défaut : `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` nécessite un abonnement portable Claude Code avec OAuth soit via `~/.claude/.credentials.json` avec `claudeAiOauth.subscriptionType` soit via `CLAUDE_CODE_OAUTH_TOKEN` depuis `claude setup-token`. Il prouve d'abord un `claude -p` direct dans Docker, puis exécute deux tours de backend Gateway du CLI sans conserver les variables d'environnement de clé API Anthropic API. Cette voie d'abonnement désactive les sondes MCP/tool et image de Claude par défaut car Claude route actuellement l'utilisation des applications tierces via la facturation à l'usage supplémentaire au lieu des limites normales du plan d'abonnement.
- Le smoke de backend CLI en direct exerce désormais le même flux de bout en bout pour Claude, Codex et Gemini : tour de texte, tour de classification d'image, puis appel d'outil MCP `cron` vérifié via la CLI du gateway.
- Le test de fumée par défaut de Claude corrige également la session de Sonnet à Opus et vérifie que la session reprise se souvient encore d'une note précédente.

## Live : test de fumée de liaison ACP (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de liaison de conversation ACP avec un agent ACP en direct :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation de canal de messages synthétique en place
  - envoyer un suivi normal sur cette même conversation
  - vérifier que le suivi atterrit dans la transcription de session ACP liée
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
- Remarques :
  - Cette voie utilise la surface `chat.send` de la passerelle avec des champs de route d'origine synthétiques réservés aux administrateurs, afin que les tests puissent attacher le contexte du canal de messages sans prétendre livrer à l'extérieur.
  - Lorsque `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` n'est pas défini, le test utilise le registre d'agents intégré du plugin `acpx` pour l'agent harnais ACP sélectionné.

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

Remarques Docker :

- Le runner Docker se trouve à `scripts/test-live-acp-bind-docker.sh`.
- Par défaut, il exécute le test de fumée de liaison ACP contre tous les agents CLI en direct pris en charge séquentiellement : `claude`, `codex`, puis `gemini`.
- Utilisez `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` ou `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` pour réduire la matrice.
- Il récupère `~/.profile`, met en scène le matériel d'authentification CLI correspondant dans le conteneur, installe `acpx` dans un préfixe npm accessible en écriture, puis installe le CLI en direct demandé (`@anthropic-ai/claude-code`, `@openai/codex` ou `@google/gemini-cli`) s'il est manquant.
- Dans Docker, le runner définit `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` pour qu'acpx conserve les env vars du provider du profil sourcé disponibles pour le CLI enfant.

## Live : test de fumée du harnais app-server Codex

- Objectif : valider le harnais Codex détenu par le plugin via la méthode de passerelle normale `agent` :
  - charger le plugin groupé `codex`
  - sélectionner `OPENCLAW_AGENT_RUNTIME=codex`
  - envoyer un premier tour d'agent de passerelle à `codex/gpt-5.4`
  - envoyer un second tour à la même session OpenClaw et vérifier que le thread app-server peut reprendre
  - exécuter `/codex status` et `/codex models` via le même chemin de commande de passerelle
- Test : `src/gateway/gateway-codex-harness.live.test.ts`
- Activer : `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Modèle par défaut : `codex/gpt-5.4`
- Sonde d'image facultative : `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonde MCP/tool facultative : `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- Le test de fumée définit `OPENCLAW_AGENT_HARNESS_FALLBACK=none` pour qu'un harnais Codex cassé ne puisse pas passer en retombant silencieusement sur PI.
- Auth : `OPENAI_API_KEY` depuis le shell/profil, plus `~/.codex/auth.json` et `~/.codex/config.toml` copiés facultatifs

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

- Le runner Docker se trouve dans `scripts/test-live-codex-harness-docker.sh`.
- Il sourcit le `~/.profile` monté, passe `OPENAI_API_KEY`, copie les fichiers d'auth Codex CLI lorsqu'ils sont présents, installe `@openai/codex` dans un préfixe npm monté en écriture, met en scène l'arborescence source, puis exécute uniquement le test en direct du harnais Codex.
- Docker active les sondes d'image et MCP/tool par défaut. Définissez `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` ou `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` lorsque vous avez besoin d'un exécution de débogage plus étroite.
- Docker exporte également `OPENCLAW_AGENT_HARNESS_FALLBACK=none`, correspondant à la configuration du test en direct pour que `openai-codex/*` ou le repli PI ne puisse pas masquer une régression du harnais Codex.

### Recettes en direct recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, test de fumée de passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel d'outil sur plusieurs providers :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise l'API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison de l'agent de type Cloud Code Assist).
- `google-gemini-cli/...` utilise le CLI Gemini local sur votre machine (authentification distincte + particularités des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle l'API Gemini hébergée par Google via HTTP (clé API / authentification par profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw exécute un binaire `gemini` local ; il possède sa propre authentification et peut se comporter différemment (streaming/support des outils/décalage de version).

## Live : matrice de modèles (ce que nous couvrons)

Il n'y a pas de « liste de modèles CI » fixe (live est optionnel), mais ce sont les modèles **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de test de fumée moderne (appel d'outil + image)

Il s'agit de l'exécution des « modèles communs » que nous espérons maintenir fonctionnels :

- OpenAI (non-Codex) : `openai/gpt-5.4` (optionnel : `openai/gpt-5.4-mini`)
- OpenAI Codex : `openai-codex/gpt-5.4`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (API Gemini) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (éviter les anciens modèles Gemini 2.x)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Exécuter le test de fumée de la passerelle avec outils + image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Ligne de base : appel d'outil (Read + Exec optionnel)

Choisissez au moins un par famille de provider :

- OpenAI : `openai/gpt-5.4` (ou `openai/gpt-5.4-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Couverture supplémentaire optionnelle (la bienvenue) :

- xAI : `xai/grok-4` (ou dernière disponible)
- Mistral : `mistral/`… (choisissez un modèle compatible « tools » que vous avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; le tool calling dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un modèle compatible avec les images dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI compatibles avec la vision, etc.) pour tester la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez activé des clés, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (centaines de modèles ; utilisez `openclaw models scan` pour trouver les candidats compatibles avec les outils et les images)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Autres fournisseurs que vous pouvez inclure dans la matrice live (si vous avez les identifiants/config) :

- Intégrés : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Astuce : n'essayez pas de coder en dur « tous les modèles » dans la documentation. La liste faisant autorité est ce que `discoverModels(...)` renvoie sur votre machine + les clés disponibles.

## Identifiants (ne jamais commiter)

Les tests live découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests live devraient trouver les mêmes clés.
- Si un test live indique « no creds », débuguez de la même manière que vous débugueriez `openclaw models list` / la sélection de modèle.

- Profils d'authentification par agent : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (c'est ce que signifie « profile keys » dans les tests en direct)
- Config : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Répertoire d'état hérité : `~/.openclaw/credentials/` (copié dans le répertoire personnel de test intermédiaire lorsqu'il est présent, mais pas le stockage principal des clés de profil)
- Les exécutions locales en direct copient par défaut la configuration active, les fichiers `auth-profiles.json` par agent, le `credentials/` hérité et les répertoires d'authentification CLI externes pris en charge dans un répertoire personnel de test temporaire ; les répertoires intermédiaires en direct ignorent `workspace/` et `sandboxes/`, et les remplacements de chemin `agents.*.workspace` / `agentDir` sont supprimés pour que les sondes restent en dehors de votre espace de travail hôte réel.

Si vous souhaitez vous fier aux clés d'environnement (par exemple, exportées dans votre `~/.profile`), exécutez des tests locaux après `source ~/.profile`, ou utilisez les runners Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Deepgram en direct (transcription audio)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan en direct

- Test : `src/agents/byteplus.live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Remplacement de model facultatif : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Flux de travail ComfyUI média en direct

- Test : `extensions/comfy/comfy.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Portée :
  - Teste les chemins d'image, de vidéo et `music_generate` comfy regroupés
  - Ignore chaque capacité sauf si `models.providers.comfy.<capability>` est configuré
  - Utile après avoir modifié la soumission, l'interrogation, les téléchargements ou l'enregistrement du plugin du flux de travail comfy

## Génération d'images en direct

- Test : `src/image-generation/runtime.live.test.ts`
- Commande : `pnpm test:live src/image-generation/runtime.live.test.ts`
- Harnais : `pnpm test:live:media image`
- Portée :
  - Énumère chaque plugin de provider de génération d'images enregistré
  - Charge les variables d'environnement de provider manquantes depuis votre shell de connexion (`~/.profile`) avant le sondage
  - Utilise par défaut les clés API en direct/d'environnement avant les profils d'authentification stockés, de sorte que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables informations d'identification du shell
  - Ignore les providers sans authentification/profil/model utilisable
  - Exécute les variantes de génération d'images standard via la capacité d'exécution partagée :
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Fournisseurs groupés actuellement couverts :
  - `openai`
  - `google`
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportement d'authentification optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les remplacements uniquement via env vars

## Génération de musique en direct

- Test : `extensions/music-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media music`
- Portée :
  - Teste le chemin partagé des fournisseurs de génération de musique groupés
  - Couvre actuellement Google et MiniMax
  - Charge les env vars des fournisseurs depuis votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les fournisseurs sans authentification/profil/model utilisable
  - Exécute les deux modes d'exécution déclarés lorsque disponibles :
    - `generate` avec une entrée composée uniquement d'un prompt
    - `edit` lorsque le fournisseur déclare `capabilities.edit.enabled`
  - Couverture actuelle de la voie partagée :
    - `google` : `generate`, `edit`
    - `minimax` : `generate`
    - `comfy` : fichier Comfy live séparé, non inclus dans ce balayage partagé
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- Comportement d'authentification optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les remplacements uniquement via env vars

## Génération de vidéo en direct

- Test : `extensions/video-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media video`
- Portée :
  - Teste le chemin partagé des fournisseurs de génération de vidéo groupés
  - Par défaut, utilise le chemin de test de smoke sécurisé pour la release : providers non-FAL, une requête text-to-video par provider, un prompt lobster d'une seconde, et une limite d'opérations par provider issue de `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` par défaut)
  - Saute FAL par défaut car la latence de la file d'attente côté provider peut dominer le temps de release ; passez `--video-providers fal` ou `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` pour l'exécuter explicitement
  - Charge les env vars des providers depuis votre shell de connexion (`~/.profile`) avant le sondage
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les providers sans auth/profile/model utilisable
  - N'exécute que `generate` par défaut
  - Définissez `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` pour exécuter également les modes de transformation déclarés lorsqu'ils sont disponibles :
    - `imageToVideo` lorsque le provider déclare `capabilities.imageToVideo.enabled` et que le provider/model sélectionné accepte l'entrée d'image locale soutenue par un tampon dans le sweep partagé
    - `videoToVideo` lorsque le provider déclare `capabilities.videoToVideo.enabled` et que le provider/model sélectionné accepte l'entrée de vidéo locale soutenue par un tampon dans le sweep partagé
  - Providers `imageToVideo` actuellement déclarés mais ignorés dans le sweep partagé :
    - `vydra` car `veo3` groupé est uniquement texte et `kling` groupé nécessite une URL d'image distante
  - Couverture Vydra spécifique au provider :
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ce fichier exécute `veo3` text-to-video plus une voie `kling` qui utilise par défaut une fixture d'URL d'image distante
  - Couverture live `videoToVideo` actuelle :
    - `runway` uniquement lorsque le modèle sélectionné est `runway/gen4_aleph`
  - Providers `videoToVideo` actuellement déclarés mais ignorés dans le sweep partagé :
    - `alibaba`, `qwen`, `xai` car ces chemins nécessitent actuellement des URL de référence `http(s)` / MP4 distantes
    - `google` car la voie partagée Gemini/Véo actuelle utilise une entrée locale soutenue par un tampon et ce chemin n'est pas accepté dans le balayage partagé
    - `openai` car la voie partagée actuelle manque de garanties d'accès à la restauration/au remixage vidéo spécifiques à l'organisation
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` pour inclure chaque fournisseur dans le balayage par défaut, y compris FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` pour réduire la plafond d'opération de chaque fournisseur pour une exécution de test de fumée agressive
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les remplacements basés uniquement sur l'environnement

## Harnais de média en direct

- Commande : `pnpm test:live:media`
- Objectif :
  - Exécute les suites en direct partagées d'image, de musique et de vidéo via un point d'entrée natif du dépôt
  - Charge automatiquement les variables d'environnement du fournisseur manquantes à partir de `~/.profile`
  - Rétrécit automatiquement chaque suite aux fournisseurs qui ont actuellement une authentification utilisable par défaut
  - Réutilise `scripts/test-live.mjs`, de sorte que le comportement de heartbeat et de mode silencieux reste cohérent
- Exemples :
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Runners Docker (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker sont divisés en deux catégories :

- Runners de modèle en direct : `test:docker:live-models` et `test:docker:live-gateway` exécutent uniquement leur fichier en direct correspondant à la clé de profil dans l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de configuration local et votre espace de travail (et en sourçant `~/.profile` si monté). Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les runners en direct Docker utilisent par défaut une limite de test de fumée plus petite afin qu'un balayage Docker complet reste pratique :
  `test:docker:live-models` est par défaut `OPENCLAW_LIVE_MAX_MODELS=12`, et
  `test:docker:live-gateway` est par défaut `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Remplacez ces variables d'environnement lorsque vous
  souhaitez explicitement la analyse exhaustive plus grande.
- `test:docker:all` construit l'image Docker live une fois via `test:docker:live-build`, puis la réutilise pour les deux voies Docker live.
- Runners de smoke de conteneur : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels` et `test:docker:plugins` amorcent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de niveau supérieur.

Les runners Docker live-model effectuent également un bind-mount uniquement sur les répertoires d'auth CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin que l'OAuth CLI externe puisse actualiser les jetons sans modifier le stockage d'auth de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- ACP bind smoke : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh`)
- CLI backend smoke : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agent de dev : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant d'intégration (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Mise en réseau Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Pont de canal MCP (Gateway amorcée + pont stdio + smoke de trame de notification Claude brute) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (smoke d'installation + alias `/plugin` + sémantique de redémarrage du bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)

Les exécuteurs Docker de modèle actuel montent également la copie de travail actuelle en lecture seule et la placent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest par rapport à votre configuration/source local exact. L'étape de préparation ignore les caches locaux volumineux et les sorties de build de l'application telles que `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et les répertoires de sortie Gradle ou `.build` locaux à l'application, afin que les exécutions live Docker ne passent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` afin que les sondages live de la passerine ne démarrent pas de véritables workers de channel Docker/Telegram/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, transmettez donc également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture live de la passerine de cette voie Discord. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur de passerine Docker avec les points de terminaison HTTP compatibles OpenClaw activés, démarre un conteneur Open WebUI épinglé contre cette passerine, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une véritable requête de discussion via le proxy `/api/chat/completions` d'Open WebUI. La première exécution peut être sensiblement plus lente car OpenAI peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie attend une clé de modèle live utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir dans les exécutions Dockerisées. Les exécutions réussies affichent une petite charge utile JSON telle que `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un vrai compte Docker, Telegram ou Discord. Il démarre un conteneur de passerine ensemencé, démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations acheminées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements live, le routage des envois sortants, et les notifications de channel + autorisations de style Claude sur le vrai pont MCP stdio. La vérification des notifications inspecte directement les trames MCP stdio brutes, de sorte que le test de fumée valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à exposer.

Test de fumage de fil en langage clair ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les workflows de régression/débogage. Il pourrait être à nouveau nécessaire pour la validation du routage des fils ACP, donc ne le supprimez pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (par défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` pour vérifier uniquement les variables d'environnement sourcées depuis `OPENCLAW_PROFILE_FILE`, en utilisant des répertoires de configuration/espace de travail temporaires et aucun montage d'auth CLI externe
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (par défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installations CLI mises en cache dans Docker
- Les répertoires/fichiers d'auth CLI externes sous `$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions restreintes de provider montent uniquement les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les réexécutions qui ne nécessitent pas de reconstruction
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les informations d'identification proviennent du magasin de profils (pas de l'environnement)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le model exposé par la passerelle pour le test de fumage Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification du nonce utilisée par le test de fumée Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer la balise d'image Open WebUI épinglée

## Docs sanity

Exécutez les vérifications de documentation après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez besoin de vérifications d'en-tête dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûre pour CI)

Ce sont des régressions de « pipeline réel » sans vrais fournisseurs :

- Appel d'outil Gateway (mock OpenAI, véritable boucle agent + passerelle) : `src/gateway/gateway.test.ts` (cas : "exécute un appel d'outil mock OpenAI de bout en bout via la boucle de l'agent de la passerelle")
- Assistant Gateway (WS `wizard.start`/`wizard.next`, écrit la config + auth forcée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant sur ws et écrit la config du jeton d'auth")

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Appel d'outil simulé via la véritable passerelle et la boucle de l'agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les Skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les Skills sont répertoriés dans l'invite, l'agent choisit-il la bonne Skill (ou évite-t-il celles qui ne sont pas pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios à plusieurs tours qui affirment l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les évaluations futures doivent d'abord rester déterministes :

- Un exécuteur de scénario utilisant des fournisseurs simulés pour affirmer les appels d'outils + l'ordre, les lectures de fichiers de Skill et le câblage de session.
- Une petite suite de scénarios axés sur les Skills (utilisation vs évitement, restriction, injection d'invite).
- Évaluations en direct facultatives (opt-in, limitées par l'environnement) uniquement après la mise en place de la suite sûre pour CI.

## Tests de contrat (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son
contrat d'interface. Ils itèrent sur tous les plugins découverts et exécutent une suite de
assertions de forme et de comportement. La voie unitaire `pnpm test` par défaut ignore
intentionnellement ces fichiers partagés de jointure et de test de fumée ; exécutez les commandes de contrat explicitement
lorsque vous touchez aux surfaces de channel ou de provider partagées.

### Commandes

- Tous les contrats : `pnpm test:contracts`
- Contrats de channel uniquement : `pnpm test:contracts:channels`
- Contrats de provider uniquement : `pnpm test:contracts:plugins`

### Contrats de channel

Situés dans `src/channels/plugins/contracts/*.contract.test.ts` :

- **plugin** - Forme de base du plugin (id, nom, capacités)
- **setup** - Contrat de l'assistant de configuration
- **session-binding** - Comportement de la liaison de session
- **outbound-payload** - Structure de la charge utile du message
- **inbound** - Gestion des messages entrants
- **actions** - Gestionnaires d'actions de channel
- **threading** - Gestion de l'ID de fil de discussion
- **directory** - API de répertoire/liste API
- **group-policy** - Application de la politique de groupe

### Contrats de statut de provider

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondes de statut de channel
- **registry** - Forme du registre de plugins

### Contrats de provider

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection de l'authentification
- **catalog** - API de catalogue de modèles API
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

## Ajouter des régressions (recommandations)

Lorsque vous corrigez un problème de provider/model découvert en direct :

- Ajoutez une régression compatible CI si possible (provider simulé/bouchon, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement uniquement en direct (limites de débit, politiques d'authentification), gardez le test en direct étroit et optionnel via les env vars
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bogue de conversion/relecture de requête de provider → test direct des modèles
  - bogue de pipeline de session/historique/tool de la passerelle → test de fumée en direct de la passerelle ou test simulé de la passerelle compatible CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les exec ids des segments de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les ids de cibles non classifiés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.
