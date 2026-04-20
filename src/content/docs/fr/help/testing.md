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
  - Prend en charge les modes de fournisseur `live-frontier`, `mock-openai` et `aimock`.
    `aimock` démarre un serveur de fournisseur local soutenu par AIMock pour une couverture expérimentale
    de fixture et de mock de protocole sans remplacer la voie `mock-openai`
    consciente des scénarios.
- `pnpm openclaw qa suite --runner multipass`
  - Exécute la même suite de QA dans une VM Multipass Linux jetable.
  - Conserve le même comportement de sélection de scénario que `qa suite` sur l'hôte.
  - Réutilise les mêmes indicateurs de sélection de fournisseur/modèle que `qa suite`.
  - Les exécutions en direct transmettent les entrées d'authentification QA prises en charge qui sont pratiques pour l'invité :
    les clés de fournisseur basées sur l'env, le chemin de configuration du fournisseur QA en direct, et `CODEX_HOME`
    si présentes.
  - Les répertoires de sortie doivent rester sous la racine du dépôt pour que l'invité puisse écrire en retour via
    l'espace de travail monté.
  - Écrit le rapport QA normal + le résumé ainsi que les journaux Multipass sous
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Démarre le site QA soutenu par Docker pour un travail de QA de type opérateur.
- `pnpm openclaw qa aimock`
  - Démarre uniquement le serveur de fournisseur AIMock local pour un test de fumage direct
    du protocole.
- `pnpm openclaw qa matrix`
  - Exécute la voie QA en direct Matrix contre un serveur domestique Tuwunel jetable soutenu par Docker.
  - Cet hôte QA est aujourd'hui réservé au dépôt/développement. Les installations packagées OpenClaw n'expédient pas
    `qa-lab`, elles n'exposent donc pas `openclaw qa`.
  - Les extraits de dépôt chargent l'exécuteur groupé directement ; aucune étape d'installation de plugin séparée
    n'est nécessaire.
  - Provisionne trois utilisateurs temporaires Matrix (`driver`, `sut`, `observer`) plus une salle privée, puis démarre un enfant de passerelle QA avec le vrai plugin Matrix comme transport SUT.
  - Utilise par défaut l'image Tuwunel stable épinglée `ghcr.io/matrix-construct/tuwunel:v1.5.1`. Remplacez-la par `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` lorsque vous devez tester une image différente.
  - Matrix n'expose pas d'indicateurs de source d'informations d'identification partagés car la voie provisionne des utilisateurs jetables localement.
  - Écrit un rapport QA Matrix, un résumé, un artefact d'événements observés et un journal de sortie combiné stdout/stderr sous `.artifacts/qa-e2e/...`.
- `pnpm openclaw qa telegram`
  - Exécute le lae QA live Telegram contre un groupe privé réel en utilisant les jetons de bot du pilote et du SUT à partir de l'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. L'identifiant du groupe doit être l'identifiant de chat numérique Telegram.
  - Prend en charge `--credential-source convex` pour les identifiants partagés en pool. Utilisez le mode env par défaut, ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` pour opter pour les baux partagés.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable de bot à bot, activez le mode de communication bot à bot dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact de messages observés sous `.artifacts/qa-e2e/...`.

Les voies de transport live partagent un contrat standard afin que les nouveaux transports ne dérivent pas :

`qa-channel` reste la suite QA synthétique large et ne fait pas partie de la matrice
de couverture du transport live.

| Voie     | Canary | Filtrage par mention | Bloc de liste blanche | Réponse de premier niveau | Reprise après redémarrage | Suite de fil de discussion | Isolement du fil | Observation des réactions | Commande d'aide |
| -------- | ------ | -------------------- | --------------------- | ------------------------- | ------------------------- | -------------------------- | ---------------- | ------------------------- | --------------- |
| Matrix   | x      | x                    | x                     | x                         | x                         | x                          | x                | x                         |                 |
| Telegram | x      |                      |                       |                           |                           |                            |                  |                           | x               |

### Identifiants Telegram partagés via Convex (v1)

Lorsque `--credential-source convex` (ou `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) est activé pour
`openclaw qa telegram`, le lab QA acquiert un bail exclusif depuis un pool soutenu par Convex, envoie des signaux de vie
à ce bail pendant que la voie est en cours d'exécution, et libère le bail à l'arrêt.

Référence de structure de projet Convex :

- `qa/convex-credential-broker/`

Variables d'environnement requises :

- `OPENCLAW_QA_CONVEX_SITE_URL` (par exemple `https://your-deployment.convex.site`)
- Un secret pour le rôle sélectionné :
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` pour `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` pour `ci`
- Sélection du rôle d'identification :
  - CLI : `--credential-role maintainer|ci`
  - Défaut Env : `OPENCLAW_QA_CREDENTIAL_ROLE` (par défaut `maintainer`)

Variables d'environnement facultatives :

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (par défaut `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (par défaut `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (défaut `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (défaut `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (défaut `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de trace facultatif)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permet les URL Convex de bouclage `http://` pour le développement uniquement en local.

`OPENCLAW_QA_CONVEX_SITE_URL` doit utiliser `https://` en fonctionnement normal.

Les commandes d'administration de mainteneur (pool add/remove/list) nécessitent
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` spécifiquement.

Helpers CLI pour les mainteneurs :

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
  - Épuisé/réessai possible : `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
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

Forme de la charge utile pour le type Telegram :

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` doit être une chaîne d'id de conversation Telegram numérique.
- `admin/add` valide cette forme pour `kind: "telegram"` et rejette les charges utiles mal formées.

### Ajout d'un canal à la QA

Ajouter un canal au système QA markdown nécessite exactement deux choses :

1. Un adaptateur de transport pour le canal.
2. Un pack de scénarios qui exerce le contrat du canal.

N'ajoutez pas une nouvelle racine de commande QA de niveau supérieur lorsque l'hôte partagé `qa-lab` peut
posséder le flux.

`qa-lab` possède les mécanismes de l'hôte partagé :

- la racine de commande `openclaw qa`
- le démarrage et le démontage de la suite
- la concurrence des workers
- l'écriture d'artefacts
- la génération de rapports
- l'exécution de scénarios
- les alias de compatibilité pour les anciens scénarios `qa-channel`

Les plugins de runner possèdent le contrat de transport :

- comment `openclaw qa <runner>` est monté sous la racine partagée `qa`
- comment la passerelle est configurée pour ce transport
- comment la disponibilité est vérifiée
- comment les événements entrants sont injectés
- comment les messages sortants sont observés
- comment les transcriptions et l'état normalisé du transport sont exposés
- comment les actions basées sur le transport sont exécutées
- comment la réinitialisation ou le nettoyage spécifique au transport est géré

Le niveau d'adoption minimum pour un nouveau canal est :

1. Garder `qa-lab` comme propriétaire de la racine partagée `qa`.
2. Implémenter le runner de transport sur le joint d'hôte partagé `qa-lab`.
3. Garder les mécanismes spécifiques au transport à l'intérieur du plugin de runner ou du harnais de canal.
4. Monter le runner en tant que `openclaw qa <runner>` au lieu d'enregistrer une commande racine concurrente.
   Les plugins de runner doivent déclarer `qaRunners` dans `openclaw.plugin.json` et exporter un tableau `qaRunnerCliRegistrations` correspondant depuis `runtime-api.ts`.
   Garder `runtime-api.ts` léger ; l'exécution paresseuse du CLI et du runner doit rester derrière des points d'entrée séparés.
5. Créer ou adapter des scénarios markdown sous les répertoires thématiques `qa/scenarios/`.
6. Utiliser les assistants de scénarios génériques pour les nouveaux scénarios.
7. Garder les alias de compatibilité existants fonctionnels, sauf si le dépôt effectue une migration intentionnelle.

La règle de décision est stricte :

- Si le comportement peut être exprimé une fois dans `qa-lab`, mettez-le dans `qa-lab`.
- Si le comportement dépend d'un transport de canal, gardez-le dans ce plugin de runner ou ce harnais de plugin.
- Si un scénario nécessite une nouvelle capacité que plusieurs channels peuvent utiliser, ajoutez un assistant générique au lieu d'une branche spécifique au channel dans `suite.ts`.
- Si un comportement n'a de sens que pour un seul transport, gardez le scénario spécifique à ce transport et rendez cela explicite dans le contrat du scénario.

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

Le travail sur un nouveau channel doit utiliser les noms d'assistants génériques.
Les alias de compatibilité existent pour éviter une migration brutale, et non comme modèle pour
la création de nouveaux scénarios.

## Suites de tests (ce qui s'exécute où)

Considérez les suites comme un « réalisme croissant » (et une instabilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Configuration : dix exécutions de shards séquentielles (`vitest.full-*.config.ts`) sur les projets Vitest existants avec portée définie
- Fichiers : inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, et les tests node sur liste blanche `ui` couverts par `vitest.unit.config.ts`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en cours de processus (authentification de passerelle, routage, outils, analyse, configuration)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans la CI
  - Aucune clé réelle requise
  - Doit être rapide et stable
- Note sur les projets :
  - Untargeted `pnpm test` exécute désormais onze configurations de partition plus petites (`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus natif géant de racine de projet. Cela réduit le pic RSS sur les machines chargées et évite que le travail de réponse automatique/d'extension ne prive les suites non liées.
  - `pnpm test --watch` utilise toujours le graphe de projet racine natif `vitest.config.ts`, car une boucle de surveillance multi-partition n'est pas pratique.
  - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent d'abord les cibles explicites de fichiers/répertoires via des voies délimitées (scoped lanes), donc `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
  - `pnpm test:changed` développe les chemins git modifiés dans les mêmes voies délimitées lorsque la diff ne touche que les fichiers source/test routables ; les modifications de configuration/configuration reviennent toujours à la réexécution large du projet racine.
  - Les tests unitaires peu importants (import-light) des agents, commandes, plugins, assistants de réponse automatique, `plugin-sdk` et zones d'utilitaires purs similaires passent par la voie `unit-fast`, qui saute `test/setup-openclaw-runtime.ts` ; les fichiers lourds avec état/runtime restent sur les voies existantes.
  - Certains fichiers source d'assistants `plugin-sdk` et `commands` sélectionnés mappent également les exécutions en mode modifié à des tests frères explicites dans ces voies légères, afin que les modifications d'assistants évitent de réexécuter la suite lourde complète pour ce répertoire.
  - `auto-reply` dispose désormais de trois compartiments dédiés : les assistants principaux de niveau supérieur, les tests d'intégration `reply.*` de niveau supérieur et le sous-arbre `src/auto-reply/reply/**`. Cela maintient le travail de harnais de réponse le plus plus lourd à l'écart des tests de status/chunk/token peu coûteux.
- Note sur le runner intégré :
  - Lorsque vous modifiez les entrées de découverte d'outils de message ou le contexte d'exécution de compactage,
    gardez les deux niveaux de couverture.
  - Ajoutez des régressions d'assistance ciblées pour les limites de routage/pure normalisation.
  - Maintenez également les suites d'intégration du runner intégré en bonne santé :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les identifiants délimités et le comportement de compactage passent toujours
    par les chemins réels `run.ts` / `compact.ts` ; les tests d'assistance uniquement ne sont pas un
    substitut suffisant pour ces chemins d'intégration.
- Note sur le pool :
  - La configuration de base de Vitest utilise maintenant par défaut `threads`.
  - La configuration partagée Vitest corrige également `isolate: false` et utilise le runner non isolé à travers les projets racine, les configurations e2e et live.
  - La voie d'accès UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute maintenant aussi sur le runner partagé non isolé.
  - Chaque shard `pnpm test` hérite des mêmes valeurs par défaut `threads` + `isolate: false` de la configuration Vitest partagée.
  - Le lanceur partagé `scripts/run-vitest.mjs` ajoute maintenant aussi `--no-maglev` par défaut pour les processus enfants Node de Vitest afin de réduire l'agitation de compilation V8 lors des grandes exécutions locales. Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si vous devez comparer avec le comportement standard de V8.
- Note sur l'itération locale rapide :
  - `pnpm test:changed` achemine via des voies délimitées lorsque les chemins modifiés correspondent proprement à une suite plus petite.
  - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement de routage, mais avec une limite de travailleurs plus élevée.
  - L'autoscaling des travailleurs locaux est maintenant intentionnellement conservateur et se désactive également lorsque la charge moyenne de l'hôte est déjà élevée, donc plusieurs exécutions concurrentes de Vitest causent moins de dégâts par défaut.
  - La configuration de base de Vitest marque les fichiers de projets/configurations comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage des tests change.
  - La configuration conserve `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez un emplacement de cache explicite pour un profilage direct.
- Note de débogage des performances :
  - `pnpm test:perf:imports` active le rapport de durée d'importation Vitest ainsi que la sortie de répartition des importations.
  - `pnpm test:perf:imports:changed` limite la même vue de profilage aux fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare le `test:changed` routé avec le chemin racine du projet natif pour ce diff validé et affiche le temps écoulé ainsi que le RSS max de macOS.
- `pnpm test:perf:changed:bench -- --worktree` effectue un benchmark de l'arbre sale actuel en acheminant la liste des fichiers modifiés via `scripts/test-projects.mjs` et la configuration racine de Vitest.
  - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour le démarrage et la surcharge de transformation de Vitest/Vite.
  - `pnpm test:perf:profile:runner` écrit les profils CPU+ tas du runner pour la suite unitaire avec le parallélisme de fichiers désactivé.

### E2E (test de fumée de la passerelle)

- Commande : `pnpm test:e2e`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `threads` avec `isolate: false`, comme le reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console verbeuse.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appairage de nœuds et réseau plus intensif
- Attentes :
  - S'exécute dans la CI (lorsqu'elle est activée dans le pipeline)
  - Aucune vraie clé requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : test de fumée du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `test/openshell-sandbox.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw sur de vrais `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution par défaut `pnpm test:e2e`
  - Nécessite un `openshell` CLI local ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite de tests e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (vrais providers + vrais models)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - « Ce provider/model fonctionne-t-il réellement _aujourd'hui_ avec de vrais identifiants ? »
  - Détecter les changements de format de provider, les bizarreries d'appel de tool, les problèmes d'authentification et le comportement des limites de taux
- Attentes :
  - Pas stable pour l'CI par conception (vrais réseaux, vraies politiques de provider, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Préférez l'exécution de sous-ensembles réduits plutôt que de « tout »
- Live exécute source `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions Live isolent toujours `HOME` et copient le matériel de configuration/authentification dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre véritable `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests Live utilisent votre véritable répertoire personnel.
- `pnpm test:live` utilise par défaut un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avis `~/.profile` supplémentaire et coupe les journaux de démarrage de la passerelle / les bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au provider) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une substitution par live via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponse de limite de taux.
- Sortie de progression / heartbeat :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels provider longs soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de la console Vitest afin que les lignes de progression du provider/gateway s'affichent immédiatement lors des exécutions en direct.
  - Ajustez les heartbeats du modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les heartbeats de la gateway/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez modifié beaucoup de choses)
- Modification du réseau de la passerelle / du protocole WS / de l'appariement : ajoutez `pnpm test:e2e`
- Débogage de « mon bot est en panne » / échecs spécifiques au provider / appel d'outils : exécutez un `pnpm test:live` ciblé

## Live : balayage des capacités des nœuds Android

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **toutes les commandes actuellement annoncées** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préalable/manuelle (la suite n'installe pas/exécute/n'apparie pas l'application).
  - Validation gateway `node.invoke` commande par commande pour le nœud Android sélectionné.
- Configuration préalable requise :
  - Application Android déjà connectée et appariée à la passerelle.
  - Application gardée au premier plan.
  - Autorisations/consentement de capture accordés pour les capacités que vous attendez voir réussir.
- Remplacements de cible facultatifs :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Application Android](/fr/platforms/android)

## Live : test de fumée du modèle (clés de profil)

Les tests en direct sont divisés en deux couches afin que nous puissions isoler les échecs :

- « Modèle direct » nous indique si le provider/modèle peut répondre du tout avec la clé donnée.
- « Test de fumée Gateway » nous indique si le pipeline complet passerelle+agent fonctionne pour ce modèle (sessions, historique, outils, politique de bac à sable, etc.).

### Couche 1 : Achèvement direct du modèle (sans passerelle)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les modèles découverts
  - Utilisez `getApiKeyForModel` pour sélectionner les modèles pour lesquels vous avez des identifiants
  - Exécuter un petit achèvement par modèle (et des régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour modern) pour exécuter réellement cette suite ; sinon, elle est ignorée pour garder `pnpm test:live` concentré sur les tests de fumée (smoke tests) de la passerelle
- Comment sélectionner les modèles :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (liste d'autorisation par virgule)
  - Les parcours Modern/all (modernes/tous) sont limités par défaut à une limite de signal haute (high-signal) soigneusement sélectionnée ; définissez `OPENCLAW_LIVE_MAX_MODELS=0` pour un parcours moderne exhaustif ou un nombre positif pour une limite plus petite.
- Comment sélectionner les fournisseurs :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation par virgule)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis (fallbacks) d'environnement
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour appliquer uniquement le **magasin de profils**
- Pourquoi cela existe :
  - Sépare « l'API du fournisseur est cassée / la clé est invalide » de « le pipeline de l'agent de passerelle est cassé »
  - Contient de petites régressions isolées (exemple : rejeu du raisonnement des réponses OpenAI/Codex Responses + flux d'appels d'outils)

### Couche 2 : Gateway + test de fumée de l'agent de dev (ce que fait réellement "@openclaw")

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une passerelle (gateway) en processus
  - Créer/patcher une session `agent:dev:*` (remplacement de modèle par exécution)
  - Parcourir les modèles avec clés et vérifier :
    - réponse « significative » (sans outils)
    - une invocation d'outil réel fonctionne (sonde de lecture)
    - sondes d'outils supplémentaires facultatives (sonde exec+read)
    - les chemins de régression OpenAI (tool-call-only → follow-up) continuent de fonctionner
- Détails des sondes (afin que vous puissiez expliquer rapidement les échecs) :
  - sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - sonde `exec+read` : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le modèle renvoie `cat <CODE>`.
  - Référence de l'implémentation : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou une liste séparée par des virgules) pour restreindre
  - Les parcours modernes/ complets du Gateway sont par défaut limités à un seuil curé de signal élevé ; définissez `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` pour un parcours moderne exhaustif ou un nombre positif pour une limite plus petite.
- Comment sélectionner les fournisseurs (éviter " OpenRouter tout ") :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondages tool + image sont toujours activés dans ce test en direct :
  - Sondage `read` + sondage `exec+read` (stress du tool)
  - le sondage d'image s'exécute lorsque le modèle annonce la prise en charge des entrées d'image
  - Flux (haut niveau) :
    - Le test génère un petit PNG avec "CAT" + un code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Le Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Astuce : pour voir ce que vous pouvez tester sur votre machine (et les identifiants exacts `provider/model`), exécutez :

```bash
openclaw models list
openclaw models list --json
```

## En direct : test de fumée du backend CLI (Claude, Codex, Gemini, ou autres CLIs locaux)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline Gateway + agent en utilisant un backend CLI local, sans toucher à votre configuration par défaut.
- Les valeurs par défaut de test de fumée spécifiques au backend résident avec la définition `cli-backend.ts` de l'extension propriétaire.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valeurs par défaut :
  - Fournisseur/modèle par défaut : `claude-cli/claude-sonnet-4-6`
  - Le comportement de commande/args/image provient des métadonnées du plugin du backend CLI propriétaire.
- Remplacements (facultatifs) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une véritable pièce jointe image (les chemins sont injectés dans le prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins des fichiers image en tant qu'args CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la manière dont les args d'image sont passés lorsque `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un second tour et valider le flux de reprise.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` pour désactiver la sonde de continuité de session par défaut Claude Sonnet -> Opus (définir sur `1` pour la forcer lorsque le model sélectionné prend en charge une cible de commutation).

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

Recettes Docker à provider unique :

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

Notes :

- Le runner Docker se trouve à `scripts/test-live-cli-backend-docker.sh`.
- Il exécute le smoke de backend CLI en direct dans l'image Docker du dépôt en tant qu'utilisateur non-root `node`.
- Il résout les métadonnées de smoke CLI à partir de l'extension propriétaire, puis installe le package Linux CLI correspondant (`@anthropic-ai/claude-code`, `@openai/codex`, ou `@google/gemini-cli`) dans un préfixe inscriptible en cache à `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (par défaut : `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` nécessite un abonnement portable Claude Code OAuth via `~/.claude/.credentials.json` avec `claudeAiOauth.subscriptionType` ou `CLAUDE_CODE_OAUTH_TOKEN` de `claude setup-token`. Il prouve d'abord le `claude -p` direct dans Docker, puis exécute deux tours de backend Gateway CLI sans préserver les env vars de clé API Anthropic API. Cette voie d'abonnement désactive les sondes MCP/tool et image de Claude par défaut car Claude achemine actuellement l'utilisation d'applications tiers via une facturation d'utilisation supplémentaire au lieu des limites normales du plan d'abonnement.
- Le smoke de backend CLI en direct exerce désormais le même flux de bout en bout pour Claude, Codex et Gemini : tour de texte, tour de classification d'image, puis appel d'outil MCP `cron` vérifié via le CLI CLI.
- Le test de fumée par défaut de Claude modifie également la session de Sonnet à Opus et vérifie que la session reprise se souvient toujours d'une note antérieure.

## Live: Test de fumée de liaison ACP (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de liaison de conversation ACP avec un agent ACP en direct :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation de canal de messages synthétique en place
  - envoyer une suite normale sur cette même conversation
  - vérifier que la suite aboutit dans la transcription de la session ACP liée
- Activer :
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Par défaut :
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
  - Ce parcours utilise la surface `chat.send` de la passerelle avec des champs de route d'origine synthétiques réservés aux administrateurs, afin que les tests puissent attacher du contexte de canal de messages sans prétendre livrer à l'externe.
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

Notes Docker :

- Le runner Docker se trouve à `scripts/test-live-acp-bind-docker.sh`.
- Par défaut, il exécute le test de fumée de liaison ACP contre tous les agents CLI en direct pris en charge en séquence : `claude`, `codex`, puis `gemini`.
- Utilisez `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` ou `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` pour réduire la matrice.
- Il récupère `~/.profile`, met en scène le matériel d'authentification CLI correspondant dans le conteneur, installe `acpx` dans un préfixe npm accessible en écriture, puis installe le CLI en direct demandé (`@anthropic-ai/claude-code`, `@openai/codex` ou `@google/gemini-cli`) s'il est manquant.
- À l'intérieur de Docker, le runner définit `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` pour qu'acpx conserve les env vars du provider du profil sourcé disponibles pour le CLI du harnais enfant.

## Live : Test de fumée du harnais Codex app-server

- Objectif : valider le harnais Codex détenu par le plugin via la méthode
  `agent` de la passerelle normale :
  - charger le plugin `codex` groupé
  - sélectionner `OPENCLAW_AGENT_RUNTIME=codex`
  - envoyer un premier tour d'agent de passerelle à `codex/gpt-5.4`
  - envoyer un second tour à la même session OpenClaw et vérifier que le thread
    de l'app-server peut reprendre
  - exécuter `/codex status` et `/codex models` via le même chemin de commande
    de passerelle
- Test : `src/gateway/gateway-codex-harness.live.test.ts`
- Activer : `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Modèle par défaut : `codex/gpt-5.4`
- Sonde d'image facultative : `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonde MCP/tool facultative : `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- Le test de fumée définit `OPENCLAW_AGENT_HARNESS_FALLBACK=none` pour qu'un harnais Codex
  cassé ne puisse pas passer en retombant silencieusement sur PI.
- Auth : `OPENAI_API_KEY` depuis le shell/profil, plus copie facultative
  de `~/.codex/auth.json` et `~/.codex/config.toml`

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
- Il source le `~/.profile` monté, passe `OPENAI_API_KEY`, copie les fichiers d'auth du CLI Codex
  lorsque présents, installe `@openai/codex` dans un préfixe npm monté en écriture,
  met en scène l'arborescence des sources, puis exécute uniquement le test live du harnais Codex.
- Docker active les sondes d'image et MCP/tool par défaut. Définissez
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` ou
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` lorsque vous avez besoin d'un exécution de débogage plus ciblée.
- Docker exporte également `OPENCLAW_AGENT_HARNESS_FALLBACK=none`, correspondant à la configuration de test
  live afin que `openai-codex/*` ou le repli PI ne puisse pas masquer une régression
  du harnais Codex.

### Recettes live recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, test de fumée de la passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel d'outil sur plusieurs providers :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Google focus (clé API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise le API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison de l'agent de style Cloud Code Assist).
- `google-gemini-cli/...` utilise le CLI Gemini local sur votre machine (authentification séparée + particularités des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle le API Gemini hébergé par Google via HTTP (clé API / authentification par profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw délègue à un binaire `gemini` local ; il possède sa propre authentification et peut se comporter différemment (prise en charge du streaming/outils/décalage de version).

## Live : matrice de modèles (ce que nous couvrons)

Il n'y a pas de « liste de modèles CI » fixe (live est optionnel), mais ce sont les modèles **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de test de smoke moderne (appel d'outil + image)

Il s'agit de l'exécution des « modèles courants » que nous nous attendons à maintenir opérationnels :

- OpenAI (non-Codex) : `openai/gpt-5.4` (optionnel : `openai/gpt-5.4-mini`)
- Codex OpenAI : `openai-codex/gpt-5.4`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (API Gemini) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (éviter les anciens modèles Gemini 2.x)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Exécuter le test de smoke de la passerelle avec des outils + image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Référence : appel d'outil (Read + Exec optionnel)

Choisissez au moins un par famille de provider :

- OpenAI : `openai/gpt-5.4` (ou `openai/gpt-5.4-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Couverture supplémentaire optionnelle (la bienvenue) :

- xAI : `xai/grok-4` (ou dernière disponible)
- Mistral : `mistral/`… (choisissez un modèle compatible avec les « outils » que avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; l'appel d'outils dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un modèle compatible avec les images dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI compatibles avec la vision, etc.) pour tester la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez activé des clés, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (des centaines de modèles ; utilisez `openclaw models scan` pour trouver les candidats compatibles avec les outils et les images)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

D'autres fournisseurs que vous pouvez inclure dans la matrice en direct (si vous avez des identifiants/config) :

- Intégré : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Astuce : n'essayez pas de coder en dur « tous les modèles » dans la documentation. La liste faisant autorité est tout ce que `discoverModels(...)` renvoie sur votre machine + les clés disponibles.

## Identifiants (ne jamais commiter)

Les tests en direct découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests en direct devraient trouver les mêmes clés.
- Si un test en direct indique « pas d'identifiants », débuguez de la même manière que vous débugueriez `openclaw models list` / la sélection de modèle.

- Profils d'authentification par agent : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (c'est ce que signifient les « clés de profil » dans les tests en direct)
- Config : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Répertoire d'état hérité : `~/.openclaw/credentials/` (copié dans le répertoire domestique intermédiaire en direct si présent, mais pas dans le stockage principal des clés de profil)
- Les exécutions locales en direct copient par défaut la configuration active, les fichiers `auth-profiles.json` par agent, le `credentials/` hérité et les répertoires d'auth CLI externes pris en charge dans un répertoire de test temporaire ; les répertoires domestiques intermédiaires en direct ignorent `workspace/` et `sandboxes/`, et les remplacements de chemin `agents.*.workspace` / `agentDir` sont supprimés afin que les sondes restent en dehors de votre espace de travail hôte réel.

Si vous souhaitez vous fier à des clés d'environnement (par exemple, exportées dans votre `~/.profile`), exécutez des tests locaux après `source ~/.profile`, ou utilisez les exécuteurs Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Deepgram en direct (transcription audio)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Plan de codage BytePlus en direct

- Test : `src/agents/byteplus.live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Remplacement de model optionnel : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Média du workflow ComfyUI en direct

- Test : `extensions/comfy/comfy.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Portée :
  - Teste les chemins d'image, de vidéo et `music_generate` comfy regroupés
  - Ignore chaque capacité sauf si `models.providers.comfy.<capability>` est configuré
  - Utile après avoir modifié la soumission, l'interrogation, les téléchargements ou l'enregistrement des plugins du workflow comfy

## Génération d'images en direct

- Test : `src/image-generation/runtime.live.test.ts`
- Commande : `pnpm test:live src/image-generation/runtime.live.test.ts`
- Harnais : `pnpm test:live:media image`
- Portée :
  - Énumère chaque plugin de provider de génération d'image enregistré
  - Charge les vars d'environnement provider manquants depuis votre shell de connexion (`~/.profile`) avant les sondages
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les identifiants shell réels
  - Ignore les providers sans authentification/profil/model utilisable
  - Exécute les variantes de génération d'images standard via la fonctionnalité d'exécution partagée :
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Fournisseurs groupés actuellement couverts :
  - `openai`
  - `google`
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les substitutions uniquement par environnement

## Génération de musique en direct

- Test : `extensions/music-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media music`
- Portée :
  - Teste le chemin partagé du provider groupé de génération de musique
  - Couvre actuellement Google et MiniMax
  - Charge les env vars du provider à partir de votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, de sorte que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les providers sans authentification/profil/model utilisable
  - Exécute les deux modes d'exécution déclarés lorsque disponibles :
    - `generate` avec entrée prompt uniquement
    - `edit` lorsque le provider déclare `capabilities.edit.enabled`
  - Couverture actuelle de la voie partagée :
    - `google` : `generate`, `edit`
    - `minimax` : `generate`
    - `comfy` : fichier live Comfy séparé, non compris dans ce balayage partagé
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les substitutions uniquement par environnement

## Génération de vidéo en direct

- Test : `extensions/video-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media video`
- Portée :
  - Teste le chemin partagé du provider groupé de génération de vidéo
  - Correspond par défaut au chemin de smoke test sécurisé pour la version : providers non-FAL, une requête text-to-video par provider, un prompt lobster d'une seconde, et une limite d'opérations par provider issue de `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` par défaut)
  - Ignore FAL par défaut car la latence de la file d'attente côté provider peut dominer le temps de publication ; passez `--video-providers fal` ou `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` pour l'exécuter explicitement
  - Charge les env vars du provider depuis votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les providers sans authentification/profil/modèle utilisable
  - N'exécute que `generate` par défaut
  - Définissez `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` pour exécuter également les modes de transformation déclarés lorsqu'ils sont disponibles :
    - `imageToVideo` lorsque le provider déclare `capabilities.imageToVideo.enabled` et que le provider/modèle sélectionné accepte les images locales basées sur des tampons dans le balayage partagé
    - `videoToVideo` lorsque le provider déclare `capabilities.videoToVideo.enabled` et que le provider/modèle sélectionné accepte les vidéos locales basées sur des tampons dans le balayage partagé
  - Providers `imageToVideo` actuellement déclarés mais ignorés dans le balayage partagé :
    - `vydra` car le `veo3` fourni est texte uniquement et le `kling` fourni nécessite une URL d'image distante
  - Couverture Vydra spécifique au provider :
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ce fichier exécute du `veo3` text-to-video plus une voie `kling` qui utilise par défaut une fixture d'URL d'image distante
  - Couverture actuelle `videoToVideo` en direct :
    - `runway` uniquement lorsque le modèle sélectionné est `runway/gen4_aleph`
  - Providers `videoToVideo` actuellement déclarés mais ignorés dans le balayage partagé :
    - `alibaba`, `qwen`, `xai` car ces chemins nécessitent actuellement des URL de référence `http(s)` / MP4 distantes
    - `google` car la voie partagée Gemini/Veo actuelle utilise une entrée tamponnée localement et ce chemin n'est pas accepté dans le balayage partagé
    - `openai` car la voie partagée actuelle manque de garanties d'accès à la restauration/remixage vidéo spécifiques à l'organisation
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` pour inclure chaque fournisseur dans le balayage par défaut, y compris FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` pour réduire la limite d'opérations de chaque fournisseur pour un test de fumée agressif
- Comportement d'auth optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'auth du magasin de profils et ignorer les substitutions uniquement env

## Harnais média live

- Commande : `pnpm test:live:media`
- Objectif :
  - Exécute les suites live d'image, de musique et de vidéo partagées via un point d'entrée natif du dépôt
  - Charge automatiquement les env vars de fournisseur manquants depuis `~/.profile`
  - Rétrécit automatiquement chaque suite aux fournisseurs qui ont actuellement une auth utilisable par défaut
  - Réutilise `scripts/test-live.mjs`, donc le comportement de heartbeat et de mode silencieux reste cohérent
- Exemples :
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Runners Docker (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker sont divisés en deux catégories :

- Runners de model live : `test:docker:live-models` et `test:docker:live-gateway` n'exécutent que leur fichier live correspondant à la clé de profil à l'intérieur de l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de config local et votre espace de travail (et en sourçant `~/.profile` si monté). Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les runners live Docker sont par défaut limités à une plage de test de fumée plus petite pour qu'un balayage Docker complet reste pratique :
  `test:docker:live-models` est par défaut `OPENCLAW_LIVE_MAX_MODELS=12`, et
  `test:docker:live-gateway` est par défaut `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Remplacez ces env vars lorsque vous
  voulez explicitement le scan exhaustif plus large.
- `test:docker:all` construit l'image Docker live une fois via `test:docker:live-build`, puis la réutilise pour les deux voies Docker live.
- Runners de test de fumée de conteneur : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels` et `test:docker:plugins` démarrent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de niveau supérieur.

Les runners Docker de modèles live montent également par liaison uniquement les répertoires d'authentification CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas limitée), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin que l'OAuth CLI externe puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- Test de fumée de liaison ACP : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh`)
- Test de fumée du backend CLI : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Test de fumée du harnais app-server Codex : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agent de développement : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Test de fumée live Open WebUI : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant de configuration (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Mise en réseau Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Pont de canal MCP (Gateway amorcée + pont stdio + test de fumée du cadre de notification Claude brut) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (test de fumée d'installation + alias `/plugin` + sémantique de redémarrage du lot Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)

Les runners Docker live-model montent également l'extraction actuelle (checkout) en lecture seule (bind-mount) et la préparent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest avec votre code source et votre configuration locale exacts. L'étape de préparation ignore les caches volumineux locaux et les sorties de build de l'application tels que `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et les répertoires de sortie Gradle ou `.build` locaux à l'application, afin que les exécutions live Docker ne passent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` pour que les sondes live du gateway ne démarrent pas de vrais workers de channel Docker/Telegram/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, transmettez donc également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture live du gateway de cette voie Discord. `test:docker:openwebui` est un test de fumée (smoke test) de compatibilité de plus haut niveau : il démarre un conteneur gateway Docker avec les points de terminaison HTTP compatibles OpenClaw activés, démarre un conteneur Open WebUI épinglé (pinned) contre ce gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une véritable requête de chat via le proxy `/api/chat/completions` d'Open WebUI. La première exécution peut être sensiblement plus lente car OpenAI peut avoir besoin de tirer (pull) l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid (cold-start). Cette voie s'attend à une clé de modèle live utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir dans les exécutions Dockerisées. Les exécutions réussies affichent une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un compte Docker, Telegram ou Discord réel. Il démarre un conteneur Gateway amorcé (seeded), démarre un second conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations routées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements en direct, le routage d'envoi sortant et les notifications de style Claude channel + autorisation sur le vrai pont stdio MCP. La vérification des notifications inspecte directement les trames stdio MCP brutes, afin que le test valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à exposer.

Test de fumée en langage clair du fil ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Gardez ce script pour les flux de travail de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils ACP, donc ne le supprimez pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (par défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` pour vérifier uniquement les variables d'environnement sourcées depuis `OPENCLAW_PROFILE_FILE`, en utilisant des répertoires de config/espace de travail temporaires et aucun montage d'auth CLI externe
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (par défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installations CLI mises en cache dans Docker
- Les répertoires/fichiers d'auth CLI externes sous `$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions de fournisseur réduites ne montent que les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour réduire l'étendue de l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les fournisseurs dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les réexécutions qui ne nécessitent pas de reconstruction
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour garantir que les identifiants proviennent du magasin de profils (et non des variables d'environnement)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le modèle exposé par la passerelle pour le test de fumée Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification du nonce utilisée par le test de fumée Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer la balise d'image Open WebUI épinglée

## Sanité des docs

Exécutez les vérifications de documentation après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûre pour CI)

Ce sont des régressions de « pipeline réel » sans vrais fournisseurs :

- Appel d'outil Gateway (mock OpenAI, vraie boucle gateway + agent) : `src/gateway/gateway.test.ts` (cas : "exécute un appel d'outil mock OpenAI de bout en bout via la boucle d'agent gateway")
- Assistant Gateway (WS `wizard.start`/`wizard.next`, écriture config + auth appliquée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant via ws et écrit la config du jeton d'auth")

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour la CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Appel d'outil simulé via la vraie boucle gateway + agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de la session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les compétences (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les compétences sont répertoriées dans l'invite, l'agent choisit-il la bonne compétence (ou évite-t-il celles qui ne sont pas pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios à plusieurs tours qui affirment l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les évaluations futures doivent rester d'abord déterministes :

- Un exécuteur de scénario utilisant des fournisseurs simulés pour affirmer les appels d'outils + l'ordre, les lectures de fichiers de compétences et le câblage de session.
- Une petite suite de scénarios axés sur les compétences (utilisation vs évitement, filtrage, injection d'invite).
- Évaluations en direct optionnelles (opt-in, restreintes par env) uniquement après la mise en place de la suite sûre pour la CI.

## Tests de contrat (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son contrat d'interface. Ils itèrent sur tous les plugins découverts et exécutent une suite d'assertions de forme et de comportement. La voie `pnpm test` unitaire ignore intentionnellement ces fichiers partagés de seam et de smoke ; exécutez les commandes de contrat explicitement lorsque vous touchez aux surfaces partagées de channel ou de provider.

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

- **status** - Sondes de statut de channel
- **registry** - Forme du registre de plugins

### Contrats de provider

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection d'authentification
- **catalog** - API de catalogue de modèles API
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

## Ajouter des régressions (guidance)

Lorsque vous corrigez un problème de provider/model découvert en live :

- Ajoutez une régression sûre pour CI si possible (provider mock/stub, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement uniquement en live (limites de débit, stratégies d'authentification), gardez le test live étroit et opt-in via env vars
- Privilégiez le ciblage de la plus petite couche qui détecte le bug :
  - bug de conversion/relecture de requête provider → test direct des modèles
  - bug de pipeline session/historique/tool du gateway → test de fumée live du gateway ou test mock du gateway sûr pour CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les id d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les id de cible non classés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.
