---
summary: "Kit de tests : suites unitaires/e2e/live, runners Docker, et couverture de chaque test"
read_when:
  - Running tests locally or in CI
  - Adding regressions for model/provider bugs
  - Debugging gateway + agent behavior
title: "Testing"
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

- Full gate (attendu avant le push) : `pnpm build && pnpm check && pnpm check:test-types && pnpm test`
- Exécution locale plus rapide de la suite complète sur une machine puissante : `pnpm test:max`
- Boucle de surveillance directe Vitest : `pnpm test:watch`
- Le ciblage direct de fichiers route désormais aussi les chemins d'extension/channel : `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Privilégiez d'abord les exécutions ciblées lorsque vous itérez sur un échec unique.
- Site QA basé sur Docker : `pnpm qa:lab:up`
- Voie QA basée sur une VM Linux : `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Lorsque vous modifiez des tests ou souhaitez une confiance supplémentaire :

- Gate de couverture : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de providers/models réels (nécessite des identifiants réels) :

- Suite live (modèles + sondes d'outil/image de passerelle) : `pnpm test:live`
- Cibler un fichier live en silence : `pnpm test:live -- src/agents/models.profiles.live.test.ts`
- Test de fumée des coûts Moonshot/Kimi : avec `MOONSHOT_API_KEY` défini, lancez
  `openclaw models list --provider moonshot --json`, puis lancez un `openclaw agent --local --session-id live-kimi-cost --message 'Reply exactly: KIMI_LIVE_OK' --thinking off --json`
  isolé contre `moonshot/kimi-k2.6`. Vérifiez que le JSON rapporte Moonshot/K2.6 et que
  la transcription de l'assistant stocke un `usage.cost` normalisé.

Conseil : lorsque vous n'avez besoin que d'un seul cas d'échec, préférez restreindre les tests en direct via les variables d'environnement de liste d'autorisation décrites ci-dessous.

## Lanceurs spécifiques au QA

Ces commandes se situent à côté des suites de tests principales lorsque vous avez besoin du réalisme d'un laboratoire QA :

L'CI exécute QA Lab dans des workflows dédiés. `Parity gate` s'exécute sur les PR correspondants et
à partir d'un déclenchement manuel avec des fournisseurs mock. `QA-Lab - All Lanes` s'exécute nightly sur
`main` et à partir d'un déclenchement manuel avec la gate de parité mock, la voie live Matrix, et
la voie live Telegram gérée par Convex comme travaux parallèles. `OpenClaw Release Checks`
exécute les mêmes voies avant l'approbation de la release.

- `pnpm openclaw qa suite`
  - Exécute les scénarios QA basés sur le repo directement sur l'hôte.
  - Exécute plusieurs scénarios sélectionnés en parallèle par défaut avec des workers
    de passerelle isolés. `qa-channel` a une concurrence par défaut de 4 (limitée par le
    nombre de scénarios sélectionnés). Utilisez `--concurrency <count>` pour ajuster le nombre
    de workers, ou `--concurrency 1` pour l'ancienne voie série.
  - Sort avec un code non nul lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque vous
    voulez des artefacts sans code de sortie d'échec.
  - Prend en charge les modes de fournisseur `live-frontier`, `mock-openai` et `aimock`.
    `aimock` démarre un serveur de fournisseur local soutenu par AIMock pour une couverture expérimentale
    de fixture et de mock de protocole sans remplacer la voie `mock-openai` consciente du scénario.
- `pnpm openclaw qa suite --runner multipass`
  - Exécute la même suite QA dans une VM Multipass Linux jetable.
  - Conserve le même comportement de sélection de scénario que `qa suite` sur l'hôte.
  - Réutilise les mêmes indicateurs de sélection de fournisseur/modèle que `qa suite`.
  - Les exécutions en direct transmettent les entrées d'authentification QA prises en charge qui sont pratiques pour l'invité :
    les clés de fournisseur basées sur env, le chemin de configuration du fournisseur live QA, et `CODEX_HOME`
    si présent.
  - Les répertoires de sortie doivent rester sous la racine du dépôt pour que l'invité puisse écrire en retour à travers
    l'espace de travail monté.
  - Écrit le rapport QA normal + le résumé ainsi que les journaux Multipass sous
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Démarre le site QA soutenu par Docker pour un travail de style opérateur.
- `pnpm test:docker:npm-onboard-channel-agent`
  - Construit un tarball npm à partir de l'extraction actuelle, l'installe globalement dans
    Docker, exécute un onboarding non-interactif de clé API OpenAI API, configure Telegram
    par défaut, vérifie que l'activation du plugin installe les dépendances d'exécution à
    la demande, exécute doctor, et exécute un tour d'agent local contre un point de terminaison OpenAI simulé.
  - Utilisez `OPENCLAW_NPM_ONBOARD_CHANNEL=discord` pour exécuter la même voie d'installation empaquetée
    avec Discord.
- `pnpm test:docker:bundled-channel-deps`
  - Empaquette et installe la version actuelle de OpenClaw dans Docker, démarre le Gateway
    avec OpenAI configuré, puis active les chaînes/plugins groupés via des modifications
    de configuration.
  - Vérifie que la découverte de la configuration laisse les dépendances d'exécution du plugin non configuré
    absentes, que la première exécution configurée du Gateway ou de doctor installe les dépendances d'exécution de chaque plugin
    groupé à la demande, et qu'un second redémarrage ne réinstalle
    pas les dépendances qui étaient déjà activées.
  - Installe également une base de référence npm plus ancienne connue, active Telegram avant d'exécuter
    `openclaw update --tag <candidate>`, et vérifie que le doctor post-mise à jour du candidat répare les dépendances d'exécution de la chaîne groupée sans
    réparation postinstall côté harnais.
- `pnpm openclaw qa aimock`
  - Démarre uniquement le serveur provider AIMock local pour un test de fumée direct du protocole.
- `pnpm openclaw qa matrix`
  - Exécute le canal QA en direct Matrix sur un homeserver Tuwunel éphémère soutenu par Docker.
  - Cet hôte QA est aujourd'hui réservé au repo/dev uniquement. Les installations packagées OpenClaw n'expédient pas `qa-lab`, elles n'exposent donc pas `openclaw qa`.
  - Les extractions du repo chargent directement le runner groupé ; aucune étape d'installation de plugin séparée n'est nécessaire.
  - Provisionne trois utilisateurs temporaires Matrix (`driver`, `sut`, `observer`) plus une salle privée, puis démarre un enfant de passerelle QA avec le vrai plugin Matrix comme transport SUT.
  - Utilise par défaut l'image stable Tuwunel épinglée `ghcr.io/matrix-construct/tuwunel:v1.5.1`. Remplacez-la par `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` lorsque vous devez tester une image différente.
  - Matrix n'expose pas de indicateurs de source d'informations d'identification partagés car le canal provisionne des utilisateurs éphémères localement.
  - Écrit un rapport QA Matrix, un résumé, un artefact d'événements observés et un journal de sortie combiné stdout/stderr sous `.artifacts/qa-e2e/...`.
- `pnpm openclaw qa telegram`
  - Exécute le canal QA en direct Telegram contre un groupe privé réel en utilisant les jetons de bot de pilote et de SUT depuis l'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. L'identifiant de groupe doit être l'identifiant de conversation numérique Telegram.
  - Prend en charge `--credential-source convex` pour les informations d'identification partagées mises en commun. Utilisez le mode env par défaut, ou définissez `OPENCLAW_QA_CREDENTIAL_SOURCE=convex` pour opter pour les baux mis en commun.
  - Sort avec un code non nul lorsqu'un scénario échoue. Utilisez `--allow-failures` lorsque vous souhaitez des artefacts sans code de sortie d'échec.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable de bot à bot, activez le Mode de Communication Bot-à-Bot dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact de messages observés sous `.artifacts/qa-e2e/...`.

Les canaux de transport en direct partagent un contrat standard pour que les nouveaux transports ne dérivent pas :

`qa-channel` reste la suite QA synthétique large et ne fait pas partie de la matrice de couverture de transport en direct.

| Lane     | Canary | Mention gating | Allowlist block | Top-level reply | Restart resume | Thread follow-up | Thread isolation | Reaction observation | Help command |
| -------- | ------ | -------------- | --------------- | --------------- | -------------- | ---------------- | ---------------- | -------------------- | ------------ |
| Matrix   | x      | x              | x               | x               | x              | x                | x                | x                    |              |
| Telegram | x      |                |                 |                 |                |                  |                  |                      | x            |

### Shared Telegram credentials via Convex (v1)

Lorsque `--credential-source convex` (ou `OPENCLAW_QA_CREDENTIAL_SOURCE=convex`) est activé pour
`openclaw qa telegram`, le laboratoire QA acquiert un bail exclusif depuis un pool soutenu par Convex, envoie des signaux de vie (heartbeat)
à ce bail pendant que la lane est en cours d'exécution, et libère le bail à l'arrêt.

Structure de projet Convex de référence :

- `qa/convex-credential-broker/`

Variables d'environnement requises :

- `OPENCLAW_QA_CONVEX_SITE_URL` (par exemple `https://your-deployment.convex.site`)
- Un secret pour le rôle sélectionné :
  - `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` pour `maintainer`
  - `OPENCLAW_QA_CONVEX_SECRET_CI` pour `ci`
- Sélection du rôle d'identification :
  - CLI : `--credential-role maintainer|ci`
  - Défaut d'env : `OPENCLAW_QA_CREDENTIAL_ROLE` (par défaut `ci` dans la CI, `maintainer` sinon)

Variables d'environnement facultatives :

- `OPENCLAW_QA_CREDENTIAL_LEASE_TTL_MS` (défaut `1200000`)
- `OPENCLAW_QA_CREDENTIAL_HEARTBEAT_INTERVAL_MS` (défaut `30000`)
- `OPENCLAW_QA_CREDENTIAL_ACQUIRE_TIMEOUT_MS` (défaut `90000`)
- `OPENCLAW_QA_CREDENTIAL_HTTP_TIMEOUT_MS` (défaut `15000`)
- `OPENCLAW_QA_CONVEX_ENDPOINT_PREFIX` (défaut `/qa-credentials/v1`)
- `OPENCLAW_QA_CREDENTIAL_OWNER_ID` (id de trace facultatif)
- `OPENCLAW_QA_ALLOW_INSECURE_HTTP=1` permet les URL Convex `http://` en boucle locale pour un développement purement local.

`OPENCLAW_QA_CONVEX_SITE_URL` devrait utiliser `https://` en fonctionnement normal.

Les commandes d'administration du mainteneur (pool add/remove/list) nécessitent
`OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` spécifiquement.

Aides CLI pour les mainteneurs :

```bash
pnpm openclaw qa credentials add --kind telegram --payload-file qa/telegram-credential.json
pnpm openclaw qa credentials list --kind telegram
pnpm openclaw qa credentials remove --credential-id <credential-id>
```

Utilisez `--json` pour une sortie lisible par machine dans les scripts et utilitaires CI.

Contrat de point de terminaison par défaut (`OPENCLAW_QA_CONVEX_SITE_URL` + `/qa-credentials/v1`) :

- `POST /acquire`
  - Requête : `{ kind, ownerId, actorRole, leaseTtlMs, heartbeatIntervalMs }`
  - Succès : `{ status: "ok", credentialId, leaseToken, payload, leaseTtlMs?, heartbeatIntervalMs? }`
  - Épuisé/réessayable : `{ status: "error", code: "POOL_EXHAUSTED" | "NO_CREDENTIAL_AVAILABLE", ... }`
- `POST /heartbeat`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken, leaseTtlMs }`
  - Succès : `{ status: "ok" }` (ou `2xx` vide)
- `POST /release`
  - Requête : `{ kind, ownerId, actorRole, credentialId, leaseToken }`
  - Succès : `{ status: "ok" }` (ou `2xx` vide)
- `POST /admin/add` (secret de mainteneur uniquement)
  - Requête : `{ kind, actorId, payload, note?, status? }`
  - Succès : `{ status: "ok", credential }`
- `POST /admin/remove` (secret de mainteneur uniquement)
  - Requête : `{ credentialId, actorId }`
  - Succès : `{ status: "ok", changed, credential }`
  - Garde de bail actif : `{ status: "error", code: "LEASE_ACTIVE", ... }`
- `POST /admin/list` (secret de mainteneur uniquement)
  - Requête : `{ kind?, status?, includePayload?, limit? }`
  - Succès : `{ status: "ok", credentials, count }`

Forme de la charge utile pour le type Telegram :

- `{ groupId: string, driverToken: string, sutToken: string }`
- `groupId` doit être une chaîne d'ID de chat Telegram numérique.
- `admin/add` valide cette forme pour `kind: "telegram"` et rejette les charges utiles malformées.

### Ajout d'un channel à la QA

Ajouter un channel au système de QA markdown nécessite exactement deux choses :

1. Un adaptateur de transport pour le channel.
2. Un pack de scénarios qui exerce le contrat du channel.

N'ajoutez pas une nouvelle racine de commande QA de premier niveau lorsque l'hôte partagé `qa-lab` peut
posséder le flux.

`qa-lab` possède les mécaniques de l'hôte partagé :

- la racine de commande `openclaw qa`
- démarrage et démontage de la suite
- concurrence des workers
- écriture d'artefacts
- génération de rapports
- exécution de scénarios
- alias de compatibilité pour les anciens scénarios `qa-channel`

Les plugins de Runner possèdent le contrat de transport :

- comment `openclaw qa <runner>` est monté sous la racine partagée `qa`
- comment la passerelle est configurée pour ce transport
- comment la disponibilité est vérifiée
- comment les événements entrants sont injectés
- comment les messages sortants sont observés
- comment les transcriptions et l'état normalisé du transport sont exposés
- comment les actions soutenues par le transport sont exécutées
- comment la réinitialisation ou le nettoyage spécifique au transport est géré

Le niveau minimum d'adoption pour un nouveau canal est :

1. Garder `qa-lab` comme propriétaire de la racine partagée `qa`.
2. Implémenter le runner de transport sur la couture d'hôte partagée `qa-lab`.
3. Garder les mécanismes spécifiques au transport dans le plugin du runner ou le harnais du canal.
4. Monter le runner en tant que `openclaw qa <runner>` au lieu d'enregistrer une commande racine concurrente.
   Les plugins de runner doivent déclarer `qaRunners` dans `openclaw.plugin.json` et exporter un tableau `qaRunnerCliRegistrations` correspondant depuis `runtime-api.ts`.
   Garder `runtime-api.ts` léger ; l'exécution paresseuse de la CLI et du runner doit rester derrière des points d'entrée séparés.
5. Rédiger ou adapter des scénarios markdown dans les répertoires thématiques `qa/scenarios/`.
6. Utiliser les assistants de scénario génériques pour les nouveaux scénarios.
7. Garder les alias de compatibilité existants fonctionnels, sauf si le dépôt effectue une migration intentionnelle.

La règle de décision est stricte :

- Si le comportement peut être exprimé une fois dans `qa-lab`, mettez-le dans `qa-lab`.
- Si le comportement dépend du transport d'un canal, gardez-le dans ce plugin de runner ou le harnais du plugin.
- Si un scénario a besoin d'une nouvelle capacité que plus d'un canal peut utiliser, ajoutez un assistant générique au lieu d'une branche spécifique au canal dans `suite.ts`.
- Si un comportement n'a de sens que pour un transport, gardez le scénario spécifique au transport et rendez cela explicite dans le contrat du scénario.

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

Les nouveaux travaux de channel doivent utiliser les noms génériques des helpers.
Les alias de compatibilité existent pour éviter une migration de type « flag day », et non comme modèle pour
la création de nouveaux scénarios.

## Suites de tests (ce qui s'exécute où)

Pensez aux suites comme à un « réalisme croissant » (et à une volatilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Config : dix exécutions séquentielles de shards (`vitest.full-*.config.ts`) sur les projets Vitest existants
- Fichiers : inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, et les tests node `ui` sur liste blanche couverts par `vitest.unit.config.ts`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en cours de processus (authentification passerelle, routage, outils, analyse, configuration)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans la CI
  - Aucune vraie clé requise
  - Doit être rapide et stable
- Note sur les projets :
  - Le `pnpm test` non ciblé exécute désormais onze configurations de shards plus petites (`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus de projet racine natif géant. Cela réduit le RSS de pointe sur les machines chargées et évite que le travail de réponse automatique/extension ne fasse souffrir les suites non liées.
  - `pnpm test --watch` utilise toujours le graphique de projet racine natif `vitest.config.ts`, car une boucle de surveillance multi-shard n'est pas pratique.
  - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent d'abord les cibles de fichiers/répertoires explicites via des voies délimitées, donc `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
  - `pnpm test:changed` développe les chemins git modifiés dans les mêmes lanes étendues lorsque le diff ne touche que les fichiers source/test routables ; les modifications de config/setup reviennent toujours au réexécution large du projet racine.
  - `pnpm check:changed` est la passerelle locale intelligente normale pour le travail étroit. Il classe le diff en core, core tests, extensions, extension tests, apps, docs, release metadata et tooling, puis exécute les lanes typecheck/lint/test correspondantes. Les modifications du SDK Public Plugin et du plugin-contract incluent la validation des extensions car les extensions dépendent de ces contrats core. Les bumps de version uniquement de métadonnées de release exécutent des vérifications ciblées de version/config/root-dependency au lieu de la suite complète, avec une garde qui rejette les modifications de package en dehors du champ de version de niveau supérieur.
  - Les tests unitaires légers en importations provenant des agents, commandes, plugins, aides de réponse automatique, `plugin-sdk`, et zones d'utilitaires purs similaires passent par la lane `unit-fast`, qui saute `test/setup-openclaw-runtime.ts` ; les fichiers lourds avec état/runtime restent sur les lanes existantes.
  - Certains fichiers source d'aides `plugin-sdk` et `commands` mappent également les exécutions en mode modifié à des tests frères explicites dans ces lanes légères, afin que les modifications d'aides évitent de réexécuter la suite lourde complète pour ce répertoire.
  - `auto-reply` dispose maintenant de trois seaux dédiés : les aides core de niveau supérieur, les tests d'intégration `reply.*` de niveau supérieur, et le sous-arbre `src/auto-reply/reply/**`. Cela permet de garder le travail le plus lourd du harnais de réponse en dehors des tests bon marché de status/chunk/token.
- Note sur le runner intégré :
  - Lorsque vous modifiez les entrées de découverte d'outils de message ou le contexte d'exécution de compactage,
    gardez les deux niveaux de couverture.
  - Ajoutez des régressions d'aides ciblées pour les limites pures de routage/normalisation.
  - Maintenez également les suites d'intégration du runner intégré en bonne santé :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les ids étendus et le comportement de compactage circulent toujours
    dans les vrais chemins `run.ts` / `compact.ts` ; les tests uniquement d'aides ne sont pas un
    substitut suffisant pour ces chemins d'intégration.
- Note sur le pool :
  - La configuration de base de Vitest utilise maintenant `threads` par défaut.
  - La configuration partagée de Vitest corrige également `isolate: false` et utilise le lanceur non isolé pour les projets racine, les configurations e2e et live.
  - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute également maintenant sur le lanceur non isolé partagé.
  - Chaque shard `pnpm test` hérite des mêmes paramètres par défaut `threads` + `isolate: false` de la configuration partagée de Vitest.
  - Le lanceur partagé `scripts/run-vitest.mjs` ajoute désormais également `--no-maglev` par défaut pour les processus enfants Node de Vitest afin de réduire la charge de compilation V8 lors des grands exécutions locales. Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si vous devez comparer avec le comportement standard de V8.
- Note sur l'itération locale rapide :
  - `pnpm changed:lanes` montre quelles voies architecturales un diff déclenche.
  - Le hook pre-commit exécute `pnpm check:changed --staged` après le formatage/linting intermédiaire, de sorte que les commits core-only ne paient pas le coût des tests d'extension sauf s'ils touchent des contrats publics face à l'extension. Les commits de métadonnées de release uniquement restent sur la voie ciblée version/config/root-dependency.
  - Si l'ensemble exact des modifications intermédiaires a déjà été validé avec des barrières égales ou plus strictes, utilisez `scripts/committer --fast "<message>" <files...>` pour sauter uniquement la réexécution du hook à portée modifiée. Le formatage/linting intermédiaires s'exécutent toujours. Mentionnez les barrières terminées lors de votre passation. Cela est également acceptable après qu'une défaillance isolée et instable du hook a été réexécutée et réussie avec une preuve étendue.
  - `pnpm test:changed` route via des voies étendues lorsque les chemins modifiés correspondent proprement à une suite plus petite.
  - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement de routage, mais avec une limite de workers plus élevée.
  - La mise à l'échelle automatique des workers locaux est maintenant intentionnellement conservatrice et se réduit également lorsque la charge moyenne de l'hôte est déjà élevée, de sorte que plusieurs exécutions Vitest simultanées causent moins de dégâts par défaut.
  - La configuration de base de Vitest marque les fichiers projets/config comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage des tests change.
  - La configuration conserve `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez un emplacement de cache explicite pour le profilage direct.
- Note de débogage des performances :
  - `pnpm test:perf:imports` active le rapport de durée d'importation Vitest ainsi que la sortie de la répartition des importations.
  - `pnpm test:perf:imports:changed` limite la même vue de profilage aux fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les `test:changed` acheminés par rapport au chemin racine du projet natif pour ce diff validé et imprime le temps écoulé ainsi que le RSS max macOS.
- `pnpm test:perf:changed:bench -- --worktree` effectue un benchmark de l'arborescence sale actuelle en acheminant la liste des fichiers modifiés via `scripts/test-projects.mjs` et la configuration racine Vitest.
  - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour le démarrage et la surcharge de transformation de Vitest/Vite.
  - `pnpm test:perf:profile:runner` écrit les profils CPU+tas du lanceur pour la suite unitaire avec le parallélisme de fichiers désactivé.

### Stabilité (passerelle)

- Commande : `pnpm test:stability:gateway`
- Configuration : `vitest.gateway.config.ts`, forcé à un worker
- Portée :
  - Démarre une véritable Gateway de bouclage avec les diagnostics activés par défaut
  - Effectue des cycles synthétiques de messages de passerelle, de mémoire et de charges utiles volumineuses via le chemin des événements de diagnostic
  - Interroge `diagnostics.stability` via le Gateway WS de la RPC
  - Couvre les assistants de persistance du bundle de stabilité de diagnostic
  - Asserte que l'enregistreur reste borné, que les échantillons RSS synthétiques restent sous le budget de pression et que les profondeurs de file d'attente par session se drainent jusqu'à zéro
- Attentes :
  - Sans risque pour la CI et sans clé
  - Voie étroite pour le suivi des régressions de stabilité, et non un substitut à la suite complète de la Gateway

### E2E (test de fumée de passerelle)

- Commande : `pnpm test:e2e`
- Configuration : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`, et les tests E2E des plugins groupés sous `extensions/`
- Par défaut d'exécution :
  - Utilise `threads` de Vitest avec `isolate: false`, correspondant au reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge des E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console verbeuse.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appariement de nœuds et réseau plus lourd
- Attentes :
  - S'exécute dans CI (lorsqu'il est activé dans le pipeline)
  - Aucune clé réelle requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : smoke test du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `extensions/openshell/src/backend.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw sur de vrais `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un `openshell` CLI local ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (vrais providers + vrais modèles)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`, `test/**/*.live.test.ts`, et les tests live de bundled-plugin sous `extensions/`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - « Est-ce que ce provider/modèle fonctionne réellement _aujourd'hui_ avec de vrais identifiants ? »
  - Détecter les changements de format de provider, les bizarreries d'appel d'outil, les problèmes d'auth et le comportement des limites de taux
- Attentes :
  - Non stable en CI par conception (réseaux réels, politiques réelles de providers, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Préférer l'exécution de sous-ensembles réduits plutôt que « tout »
- Live exécute source `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions live isolent toujours `HOME` et copient le matériel de configuration/d'authentification dans un répertoire temporaire de test afin que les fixtures unitaires ne puissent pas modifier votre véritable `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests live utilisent votre véritable répertoire personnel.
- `pnpm test:live` utilise désormais par défaut un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avis `~/.profile` supplémentaire et réduit les journaux de démarrage de la passerelle/les bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au fournisseur) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une priorité par live via `OPENCLAW_LIVE_*_KEY` ; les tests réessaient en cas de réponses de limitation de débit.
- Sortie de progression/heartbeat :
  - Les suites live émettent désormais des lignes de progression vers stderr afin que les appels fournisseurs longs soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de console Vitest afin que les lignes de progression du fournisseur/de la passerelle s'affichent immédiatement pendant les exécutions live.
  - Ajustez les heartbeats du modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les heartbeats de la passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Modification du réseau de passerelle / protocole WS / appairage : ajoutez `pnpm test:e2e`
- Débogage de "mon bot est en panne" / échecs spécifiques au fournisseur / appel d'outil : exécutez une `pnpm test:live` ciblée

## Live : balayage des capacités du nœud Android

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **toutes les commandes actuellement annoncées** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préconditionnée/manuelle (la suite n'installe pas/n'exécute pas/n'apparie pas l'application).
  - Validation commande par commande du `node.invoke` de la passerelle pour le nœud Android sélectionné.
- Configuration préalable requise :
  - Application Android déjà connectée et appariée à la passerelle.
  - Application gardée au premier plan.
  - Autorisations/consentement de capture accordés pour les fonctionnalités que vous prévoyez de réussir.
- Remplacements de cible facultatifs :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Application Android](/fr/platforms/android)

## Direct : test de fumée du modèle (clés de profil)

Les tests en direct sont divisés en deux couches afin que nous puissions isoler les échecs :

- « Modèle direct » nous indique si le fournisseur/modèle peut répondre du tout avec la clé donnée.
- « Test de fumée Gateway » nous indique si l'intégralité du pipeline passerelle+agent fonctionne pour ce modèle (sessions, historique, outils, politique de bac à sable, etc.).

### Couche 1 : Achèvement direct du modèle (sans passerelle)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les modèles découverts
  - Utiliser `getApiKeyForModel` pour sélectionner les modèles pour lesquels vous avez des identifiants
  - Exécuter un petit achèvement par modèle (et des régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Définir `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour modern) pour exécuter réellement cette suite ; sinon, elle est ignorée pour garder `pnpm test:live` concentré sur le test de fumée de la passerelle
- Comment sélectionner les modèles :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (liste d'autorisation par virgule)
  - Les analyses modernes/toutes par défaut ont une limite curated high-signal ; définissez `OPENCLAW_LIVE_MAX_MODELS=0` pour une analyse moderne exhaustive ou un nombre positif pour une limite plus petite.
- Comment sélectionner les fournisseurs :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation par virgule)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis env
  - Définir `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'utilisation uniquement du **magasin de profils**
- Pourquoi cela existe :
  - Sépare « l'API du fournisseur est cassée / la clé est invalide » de « le pipeline de l'agent de la passerelle est cassé »
  - Contient de petites régressions isolées (exemple : réexécution du raisonnement des réponses OpenAI / Codex Responses + flux d'appels d'outils)

### Couche 2 : Gateway + test de fumée de l'agent de développement (ce que fait réellement "@openclaw")

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une passerelle (Gateway) en processus
  - Créer/patcher une session `agent:dev:*` (remplacement de modèle par exécution)
  - Itérer sur les modèles avec clés et vérifier :
    - réponse « significative » (sans outils)
    - un véritable appel d'outil fonctionne (sonde de lecture)
    - sondes d'outils supplémentaires optionnelles (sonde d'exécution + lecture)
    - les chemins de régression OpenAI (appel d'outil uniquement → suivi) continuent de fonctionner
- Détails des sondes (afin que vous puissiez expliquer rapidement les échecs) :
  - Sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de le `read` et de renvoyer le nonce.
  - Sonde `exec+read` : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de le `read` en retour.
  - sonde d'image : le test attache un PNG généré (chat + code aléatoire) et s'attend à ce que le modèle renvoie `cat <CODE>`.
  - Référence de mise en œuvre : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou liste séparée par des virgules) pour restreindre
  - Les analyses modernes/toutes des passerelles (Gateway) sont par défaut limitées à une plafond curé à fort signal ; définissez `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` pour une analyse moderne exhaustive ou un nombre positif pour un plafond plus petit.
- Comment sélectionner les fournisseurs (éviter « tout en OpenRouter ») :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondes d'outil et d'image sont toujours activées dans ce test en direct :
  - sonde `read` + sonde `exec+read` (stress de l'outil)
  - la sonde d'image s'exécute lorsque le modèle annonce la prise en charge des entrées d'image
  - Flux (niveau élevé) :
    - Le test génère un minuscule PNG avec « CAT » + code aléatoire (`src/gateway/live-image-probe.ts`)
    - Envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Le Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Astuce : pour voir ce que vous pouvez tester sur votre machine (et les `provider/model` ids exacts), exécutez :

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
  - Le comportement de la commande/args/image provient des métadonnées du plugin du backend CLI propriétaire.
- Remplacements (optionnels) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une vraie pièce jointe image (les chemins sont injectés dans le prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins des fichiers image comme args CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la manière dont les args d'image sont passés quand `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un second tour et valider le flux de reprise.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` pour désactiver la sonde de continuité de session Claude Sonnet -> Opus par défaut (définir à `1` pour forcer son activation quand le modèle sélectionné prend en charge une cible de basculement).

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

Recettes Docker à fournisseur unique :

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

Notes :

- Le runner Docker se trouve à `scripts/test-live-cli-backend-docker.sh`.
- Il exécute le test de fumée du backend CLI en direct à l'intérieur de l'image Docker du dépôt en tant qu'utilisateur non-root `node`.
- Il résout les métadonnées de smoke CLI de l'extension propriétaire, puis installe le paquet Linux CLI correspondant (`@anthropic-ai/claude-code`, `@openai/codex` ou `@google/gemini-cli`) dans un préfixe inscriptible en cache à `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (par défaut : `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` nécessite un OAuth d'abonnement portable Claude Code soit via `~/.claude/.credentials.json` avec `claudeAiOauth.subscriptionType` soit via `CLAUDE_CODE_OAUTH_TOKEN` depuis `claude setup-token`. Il prouve d'abord le `claude -p` direct dans Docker, puis exécute deux tours backend CLI du Gateway sans préserver les variables d'environnement de la clé API d'Anthropic. Cet voie d'abonnement désactive par défaut les sondes MCP/tool et image de Claude car celui-ci route actuellement l'utilisation des applications tierces via une facturation d'utilisation supplémentaire au lieu des limites normales du plan d'abonnement.
- Le smoke backend CLI live exécute désormais le même flux de bout en bout pour Claude, Codex et Gemini : tour de texte, tour de classification d'image, puis appel d'outil MCP `cron` vérifié via le CLI du Gateway.
- Le smoke par défaut de Claude modifie également la session de Sonnet à Opus et vérifie que la session reprise se souvient toujours d'une note précédente.

## Live : Smoke de liaison ACP (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de liaison de conversation ACP avec un agent ACP en direct :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation de canal de messages synthétique en place
  - envoyer une suite normale sur cette même conversation
  - vérifier que la suite atterrit dans la transcription de session ACP liée
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
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.4`
- Notes :
  - Ce lane utilise la surface `chat.send` de la passerelle avec des champs synthétiques de route d'origine réservés aux administrateurs, afin que les tests puissent attacher un contexte de message-channel sans prétendre livrer à l'externe.
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

- Le runner Docker se trouve à `scripts/test-live-acp-bind-docker.sh`.
- Par défaut, il exécute le test de fumée de liaison ACP contre tous les agents CLI en direct pris en charge, en séquence : `claude`, `codex`, puis `gemini`.
- Utilisez `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` ou `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` pour réduire la matrice.
- Il source `~/.profile`, met en scène le matériel d'authentification CLI correspondant dans le conteneur, installe `acpx` dans un préfixe npm inscriptible, puis installe le CLI en direct demandé (`@anthropic-ai/claude-code`, `@openai/codex` ou `@google/gemini-cli`) s'il est manquant.
- Dans Docker, le runner définit `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` afin qu'acpx garde les env vars du provider du profil sourcé disponibles pour le CLI de harnais enfant.

## Live : test de fumée du harnais app-server Codex

- Objectif : valider le harnais Codex détenu par le plugin via la méthode normale `agent` de la passerelle :
  - charger le plugin `codex` groupé
  - sélectionner `OPENCLAW_AGENT_RUNTIME=codex`
  - envoyer un premier tour d'agent de passerelle à `codex/gpt-5.4`
  - envoyer un deuxième tour à la même session OpenClaw et vérifier que le thread app-server peut reprendre
  - exécuter `/codex status` et `/codex models` via le même chemin de commande de passerelle
  - exécuter facultativement deux sondes de shell escaladées examinées par Guardian : une commande bénigne qui doit être approuvée et un faux téléchargement de secret qui doit être refusé, pour que l'agent redemande
- Test : `src/gateway/gateway-codex-harness.live.test.ts`
- Activer : `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Modèle par défaut : `codex/gpt-5.4`
- Sonde d'image facultative : `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonde MCP/tool facultative : `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- Sonde Guardian facultative : `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- Le test de fumée définit `OPENCLAW_AGENT_HARNESS_FALLBACK=none` afin qu'un harnais Codex
  défaillant ne puisse pas réussir en revenant silencieusement à PI.
- Auth : `OPENAI_API_KEY` depuis le shell/profil, plus `~/.codex/auth.json` et `~/.codex/config.toml` copiés en option

Recette locale :

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
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
- Il source le `~/.profile` monté, passe `OPENAI_API_KEY`, copie les fichiers d'auth Codex CLI
  lorsqu'ils sont présents, installe `@openai/codex` dans un préfixe npm monté en écriture,
  prépare l'arborescence des sources, puis exécute uniquement le test en direct Codex-harness.
- Docker active les sondes d'image, MCP/tool et Guardian par défaut. Définissez
  `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` ou
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` ou
  `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0` lorsque vous avez besoin d'un exécution de débogage
  plus ciblée.
- Docker exporte également `OPENCLAW_AGENT_HARNESS_FALLBACK=none`, correspondant à la configuration du test
  en direct afin que `openai-codex/*` ou le repli PI ne puissent pas masquer une régression
  du harnais Codex.

### Recettes en direct recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, test de fumée de passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel de tool sur plusieurs fournisseurs :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise la API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison d'agent style Cloud Code Assist).
- `google-gemini-cli/...` utilise le CLI Gemini local sur votre machine (auth distinct + particularités de tooling).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle la API Gemini hébergée par Google sur HTTP (clé API / auth profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw fait appel à un binaire `gemini` local ; il possède sa propre auth et peut se comporter différemment (streaming/support de tool/décalage de version).

## Live : matrice de modèles (ce que nous couvrons)

Il n'y a pas de « liste de modèles CI » fixe (live est facultatif), mais voici les modèles **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de tests de fumée modernes (appel d'outil + image)

C'est l'exécution de « modèles courants » que nous nous attendons à maintenir fonctionnelle :

- OpenAI (hors Codex) : `openai/gpt-5.4` (optionnel : `openai/gpt-5.4-mini`)
- OpenAI Codex : `openai-codex/gpt-5.4`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (API Gemini) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (éviter les anciens modèles Gemini 2.x)
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

- xAI : `xai/grok-4` (ou la plus récente disponible)
- Mistral : `mistral/`… (choisissez un modèle compatible « outils » que avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; l'appel d'outil dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un modèle compatible image dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes Claude/Gemini/OpenAI compatibles vision, etc.) pour tester la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez activé des clés, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (des centaines de modèles ; utilisez `openclaw models scan` pour trouver des candidats compatibles outil+image)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

D'autres fournisseurs que vous pouvez inclure dans la matrice en direct (si vous avez des identifiants/config) :

- Intégrés : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Conseil : n'essayez pas de coder en dur « tous les modèles » dans la documentation. La liste faisant autorité est ce que `discoverModels(...)` renvoie sur votre machine + les clés disponibles.

## Identifiants (ne jamais commiter)

Les tests en direct découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests en direct devraient trouver les mêmes clés.
- Si un test en direct indique « pas d'identifiants », débuggez de la même manière que vous débuggeriez `openclaw models list` / la sélection de modèle.

- Profils d'auth par agent : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (c'est ce que signifie « clés de profil » dans les tests en direct)
- Config : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Répertoire d'état hérité : `~/.openclaw/credentials/` (copié dans le domicile en direct intermédiaire si présent, mais pas le stockage principal des clés de profil)
- Les exécutions locales en direct copient par défaut la configuration active, les fichiers `auth-profiles.json` par agent, le `credentials/` hérité et les répertoires d'auth CLI externes pris en charge dans un domicile de test temporaire ; les domiciles en direct intermédiaires ignorent `workspace/` et `sandboxes/`, et les remplacements de chemin `agents.*.workspace` / `agentDir` sont supprimés pour que les sondages restent en dehors de votre espace de travail hôte réel.

Si vous souhaitez compter sur les clés d'environnement (par ex. exportées dans votre `~/.profile`), exécutez les tests locaux après `source ~/.profile`, ou utilisez les runners Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Deepgram live (transcription audio)

- Test : `extensions/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- Test : `extensions/byteplus/live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- Surcharge optionnelle du model : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI workflow media live

- Test : `extensions/comfy/comfy.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Portée :
  - Teste les chemins d'image, de vidéo et `music_generate` comfy inclus
  - Ignore chaque capacité sauf si `models.providers.comfy.<capability>` est configuré
  - Utile après avoir modifié la soumission, le sondage, les téléchargements ou l'enregistrement des plugins du workflow comfy

## Génération d'images live

- Test : `test/image-generation.runtime.live.test.ts`
- Commande : `pnpm test:live test/image-generation.runtime.live.test.ts`
- Harnais : `pnpm test:live:media image`
- Portée :
  - Énumère chaque plugin de provider de génération d'images enregistré
  - Charge les variables d'environnement provider manquantes depuis votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API live/env avant les profils d'auth stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les providers sans auth/profil/model utilisable
  - Exécute les variantes de génération d'images standards via la capacité d'exécution partagée :
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Providers groupés actuels couverts :
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `vydra`
  - `xai`
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,xai:default-generate,xai:default-edit"`
- Comportement d'auth optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'auth du magasin de profils et ignorer les surcharges env-only

## Génération de musique live

- Test : `extensions/music-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media music`
- Portée :
  - Teste le chemin du provider groupé de génération de musique partagé
  - Couvre actuellement Google et MiniMax
  - Charge les env vars du provider depuis votre shell de connexion (`~/.profile`) avant le test
  - Utilise par défaut les clés API en direct/env avant les profils d'auth stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les providers sans auth/profil/model utilisable
  - Exécute les deux modes d'exécution déclarés lorsque disponibles :
    - `generate` avec une entrée composée uniquement d'une invite
    - `edit` lorsque le provider déclare `capabilities.edit.enabled`
  - Couverture actuelle de la voie partagée :
    - `google` : `generate`, `edit`
    - `minimax` : `generate`
    - `comfy` : fichier Comfy live séparé, et non ce sweep partagé
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification profile-store et ignorer les remplacements env-only

## Génération de vidéo en direct

- Test : `extensions/video-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media video`
- Portée :
  - Teste le chemin provider de génération vidéo groupé partagé
  - Par défaut, le chemin de smoke sûr pour la version : providers non-FAL, une requête text-to-video par provider, une invite homard d'une seconde, et une limite d'opération par provider depuis `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` par défaut)
  - Ignore FAL par défaut car la latence de la file d'attente côté provider peut dominer le temps de diffusion ; passez `--video-providers fal` ou `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` pour l'exécuter explicitement
  - Charge les env vars du provider depuis votre shell de connexion (`~/.profile`) avant sonder
  - Utilise par défaut les clés API live/env avant les profils d'auth stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les providers sans auth/profil/model utilisable
  - N'exécute que `generate` par défaut
  - Définissez `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` pour exécuter également les modes de transformation déclarés lorsqu'ils sont disponibles :
    - `imageToVideo` lorsque le fournisseur déclare `capabilities.imageToVideo.enabled` et que le fournisseur/modèle sélectionné accepte les images locales basées sur des tampons (buffer-backed) dans le sweep partagé
    - `videoToVideo` lorsque le fournisseur déclare `capabilities.videoToVideo.enabled` et que le fournisseur/modèle sélectionné accepte les vidéos locales basées sur des tampons (buffer-backed) dans le sweep partagé
  - Fournisseurs `imageToVideo` actuellement déclarés mais ignorés dans le sweep partagé :
    - `vydra` car le `veo3` groupé est texte uniquement et le `kling` groupé nécessite une URL d'image distante
  - Couverture Vydra spécifique au fournisseur :
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ce fichier exécute du `veo3` texte-vidéo plus une voie `kling` qui utilise par défaut une fixture d'URL d'image distante
  - Couverture actuelle en direct `videoToVideo` :
    - `runway` uniquement lorsque le modèle sélectionné est `runway/gen4_aleph`
  - Fournisseurs `videoToVideo` actuellement déclarés mais ignorés dans le sweep partagé :
    - `alibaba`, `qwen`, `xai` car ces chemins nécessitent actuellement des URL de référence `http(s)` / MP4 distantes
    - `google` car la voie Gemini/Veo partagée actuelle utilise une entrée locale basée sur des tampons (buffer-backed) et ce chemin n'est pas accepté dans le sweep partagé
    - `openai` car la voie partagée actuelle manque de garanties d'accès spécifiques à l'organisation pour la réinpaint/remix vidéo
- Rétrécissement (narrowing) optionnel :
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` pour inclure chaque fournisseur dans le sweep par défaut, y compris FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` pour réduire la limite d'opérations de chaque fournisseur pour un test de fumée (smoke) agressif
- Comportement d'authentification optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification via le magasin de profils (profile-store) et ignorer les remplacements basés uniquement sur les variables d'environnement

## Harnais (harness) de média en direct

- Commande : `pnpm test:live:media`
- Objectif :
  - Exécute les suites live partagées pour les images, la musique et les vidéos via un point d'entrée natif au dépôt
  - Charge automatiquement les env vars du provider manquants depuis `~/.profile`
  - Réduit automatiquement chaque suite aux providers qui ont actuellement une auth utilisable par défaut
  - Réutilise `scripts/test-live.mjs`, de sorte que le comportement du heartbeat et du mode silencieux reste cohérent
- Exemples :
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Runners Docker (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker sont divisés en deux catégories :

- Runners live-model : `test:docker:live-models` et `test:docker:live-gateway` n'exécutent que leur fichier live correspondant à la clé de profil à l'intérieur de l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de config local et votre espace de travail (et en sourçant `~/.profile` si monté). Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les runners live Docker ont par défaut une limite de smoke plus petite afin qu'un balayage Docker complet reste pratique :
  `test:docker:live-models` est par défaut `OPENCLAW_LIVE_MAX_MODELS=12`, et
  `test:docker:live-gateway` est par défaut `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Modifiez ces env vars lorsque vous
  souhaitez explicitement le balayage exhaustif plus large.
- `test:docker:all` construit l'image Docker live une fois via `test:docker:live-build`, puis la réutilise pour les deux voies Docker live. Il construit également une image `scripts/e2e/Dockerfile` partagée via `test:docker:e2e-build` et la réutilise pour les runners de smoke de conteneur E2E qui testent l'application construite.
- Container smoke runners : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:npm-onboard-channel-agent`, `test:docker:gateway-network`, `test:docker:mcp-channels`, `test:docker:pi-bundle-mcp-tools`, `test:docker:cron-mcp-cleanup`, `test:docker:plugins`, `test:docker:plugin-update` et `test:docker:config-reload` démarrent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de plus haut niveau.

Les runners live-model Docker montent également en liaison (bind-mount) uniquement les répertoires d'authentification CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin que CLI OAuth externe puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- ACP bind smoke : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh`)
- CLI backend smoke : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Codex app-server harness smoke : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + dev agent : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant d'intégration (Onboarding wizard) (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Npm tarball onboarding/channel/agent smoke : `pnpm test:docker:npm-onboard-channel-agent` installe globalement l'archive tar OpenClaw empaquetée dans Docker, configure OpenAI via l'intégration par référence d'environnement ainsi que Telegram par défaut, vérifie que l'activation du plugin installe ses dépendances d'exécution à la demande, exécute doctor et exécute un tour d'agent simulé OpenAI. Réutilisez une archive tar préconstruite avec `OPENCLAW_NPM_ONBOARD_PACKAGE_TGZ=/path/to/openclaw-*.tgz`, sautez la reconstruction de l'hôte avec `OPENCLAW_NPM_ONBOARD_HOST_BUILD=0`, ou changez de channel avec `OPENCLAW_NPM_ONBOARD_CHANNEL=discord`.
- Réseau Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Régression de raisonnement minimal web_search des réponses OpenAI : `pnpm test:docker:openai-web-search-minimal` (script : `scripts/e2e/openai-web-search-minimal-docker.sh`) exécute un serveur OpenAI simulé via Gateway, vérifie que `web_search` déclenche `reasoning.effort` de `minimal` à `low`, puis force le rejet du schéma du provider et vérifie que les détails bruts apparaissent dans les logs Gateway.
- Pont de channel MCP (Gateway amorcé + pont stdio + smoke de trame de notification Claude brute) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Outils MCP bundle Pi (serveur MCP stdio réel + smoke autorisation/refus du profil Pi intégré) : `pnpm test:docker:pi-bundle-mcp-tools` (script : `scripts/e2e/pi-bundle-mcp-tools-docker.sh`)
- Nettoyage MCP Cron/subagent (Gateway réel + démontage enfant MCP stdio après des cron isolés et des exécutions de subagent ponctuelles) : `pnpm test:docker:cron-mcp-cleanup` (script : `scripts/e2e/cron-mcp-cleanup-docker.sh`)
- Plugins (smoke d'installation + alias `/plugin` + sémantique de redémarrage Claude-bundle) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)
- Smoke de mise à jour de plugin inchangée : `pnpm test:docker:plugin-update` (script : `scripts/e2e/plugin-update-unchanged-docker.sh`)
- Smoke des métadonnées de rechargement de configuration : `pnpm test:docker:config-reload` (script : `scripts/e2e/config-reload-source-docker.sh`)
- Dépendances d'exécution du plugin groupé : `pnpm test:docker:bundled-channel-deps` construit une petite image de runner Docker par défaut, construit et empaquette OpenClaw une fois sur l'hôte, puis monte cette archive dans chaque scénario d'installation Linux. Réutilisez l'image avec `OPENCLAW_SKIP_DOCKER_BUILD=1`, sautez la reconstruction sur l'hôte après une nouvelle construction locale avec `OPENCLAW_BUNDLED_CHANNEL_HOST_BUILD=0`, ou pointez vers une archive existante avec `OPENCLAW_BUNDLED_CHANNEL_PACKAGE_TGZ=/path/to/openclaw-*.tgz`.
- Réduisez les dépendances d'exécution du plugin groupé lors de l'itération en désactivant les scénarios non liés, par exemple :
  `OPENCLAW_BUNDLED_CHANNEL_SCENARIOS=0 OPENCLAW_BUNDLED_CHANNEL_UPDATE_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_ROOT_OWNED_SCENARIO=0 OPENCLAW_BUNDLED_CHANNEL_SETUP_ENTRY_SCENARIO=0 pnpm test:docker:bundled-channel-deps`.

Pour préconstruire et réutiliser manuellement l'image partagée de l'application construite :

```bash
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e:local pnpm test:docker:e2e-build
OPENCLAW_DOCKER_E2E_IMAGE=openclaw-docker-e2e:local OPENCLAW_SKIP_DOCKER_BUILD=1 pnpm test:docker:mcp-channels
```

Les remplacements d'images spécifiques aux suites tels que `OPENCLAW_GATEWAY_NETWORK_E2E_IMAGE` priment toujours lorsqu'ils sont définis. Lorsque `OPENCLAW_SKIP_DOCKER_BUILD=1` pointe vers une image partagée distante, les scripts la récupèrent si elle n'est pas déjà locale. Les tests QR et d'installation Docker conservent leurs propres Dockerfiles car ils valident le comportement d'empaquetage/d'installation plutôt que l'exécution partagée de l'application construite.

Les runners Docker live-model montent également par liaison la copie de travail actuelle en lecture seule et
la préparent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image
d'exécution légère tout en exécutant Vitest sur votre source/configuration locale exacte.
L'étape de préparation ignore les caches locaux volumineux et les sorties de build de l'application tels que
`.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et les répertoires de sortie Gradle
ou locaux à l'application `.build` afin que les exécutions live Docker ne passent pas des minutes
copier des artefacts spécifiques à la machine.
Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` afin que les sondes live du Gateway ne démarrent pas
de vrais workers de channel Telegram/Discord/etc. à l'intérieur du conteneur.
`test:docker:live-models` exécute toujours `pnpm test:live`, faites donc passer
également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture live
du Gateway depuis ce lane Docker.
`test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un
conteneur Gateway OpenClaw avec les points de terminaison HTTP compatibles Docker activés,
démarre un conteneur Open WebUI épinglé contre ce Gateway, se connecte via
Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une
vraie requête de chat via le proxy `/api/chat/completions` d'Open WebUI.
La première exécution peut être sensiblement plus lente car Docker peut avoir besoin de tirer l'image
Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid.
Ce lane attend une clé de modèle live utilisable, et `OPENCLAW_PROFILE_FILE`
(`~/.profile` par défaut) est le moyen principal de la fournir lors des exécutions Dockerisées.
Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model":
"openclaw/default", ... }`.
`test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un
vrai compte Telegram, Discord ou Docker. Il démarre un conteneur Gateway
amorcé, démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis
vérifie la découverte de conversations routées, les lectures de transcriptions, les métadonnées de pièces jointes,
le comportement de la file d'attente d'événements live, le routage des envois sortants et les notifications de channel +
autorisations de style Claude sur le vrai pont stdio MCP. La vérification des notifications
inspecte directement les trames stdio MCP brutes, donc le test valide ce que
le pont émet réellement, pas seulement ce qu'un SDK client spécifique se trouve à présenter.
`test:docker:pi-bundle-mcp-tools` est déterministe et n'a pas besoin d'une clé de
modèle live. Il construit l'image Docker du dépôt, démarre un vrai serveur de sonde MCP stdio
à l'intérieur du conteneur, matérialise ce serveur via le temps d'exécution MCP du bundle Pi embarqué,
exécute l'outil, puis vérifie que `coding` et `messaging` conservent
les outils `bundle-mcp` tandis que `minimal` et `tools.deny: ["bundle-mcp"]` les filtrent.
`test:docker:cron-mcp-cleanup` est déterministe et n'a pas besoin d'une clé de modèle
live. Il démarre un Gateway amorcé avec un vrai serveur de sonde MCP stdio, exécute un
tour cron isolé et un tour enfant ponctuel `/subagents spawn`, puis vérifie
que le processus enfant MCP se termine après chaque exécution.

Test de fumage en langage clair du fil ACP manuel (pas en CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les workflows de régression/débogage. Il pourrait être à nouveau nécessaire pour la validation du routage des fils ACP, donc ne le supprimez pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_PROFILE_ENV_ONLY=1` pour vérifier uniquement les variables d'environnement provenant de `OPENCLAW_PROFILE_FILE`, en utilisant des répertoires de configuration/espace de travail temporaires et sans montages d'auth CLI externes
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installations CLI mises en cache dans CLI
- Les répertoires/fichiers d'auth CLI externes sous `$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions restreintes de provider ne montent que les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les réexécutions qui ne nécessitent pas de reconstruction
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du magasin de profils (pas de l'environnement)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le modèle exposé par la passerelle pour le test de fumage Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification du nonce utilisée par le test de fumée d'Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer la balise d'image Open WebUI épinglée

## Sanité des docs

Exécutez les vérifications de docs après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûr pour CI)

Il s'agit de régressions de « pipeline réel » sans vrais fournisseurs :

- Appel d'outil Gateway (mock OpenAI, boucle réelle gateway + agent) : `src/gateway/gateway.test.ts` (cas : "exécute un appel d'outil mock OpenAI de bout en bout via la boucle de l'agent gateway")
- Assistant Gateway (WS `wizard.start`/`wizard.next`, écrit la config + auth appliquée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant sur ws et écrit la config du jeton d'auth")

## Évaluations de fiabilité des agents (skills)

Nous avons déjà quelques tests sûrs pour CI qui se comportent comme des « évaluations de fiabilité des agents » :

- Mock d'appel d'outil via la boucle réelle gateway + agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les skills sont répertoriés dans l'invite, l'agent choisit-il la bonne skill (ou évite-t-il celles qui ne sont pas pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios multi-tours qui affirment l'ordre des outils, la conservation de l'historique de session et les limites du bac à sable.

Les futures évaluations doivent d'abord rester déterministes :

- Un exécuteur de scénario utilisant des mocks de fournisseurs pour affirmer les appels d'outils + l'ordre, les lectures de fichiers de skills et le câblage de session.
- Une petite suite de scénarios axés sur les skills (utilisation vs évitement, filtrage, injection par invite).
- Évaluations en direct optionnelles (opt-in, limitées par env) uniquement après la mise en place de la suite sûre pour CI.

## Tests de contrat (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son contrat d'interface. Ils itèrent sur tous les plugins découverts et exécutent une suite d'assertions de forme et de comportement. La voie `pnpm test` unitaire ignore intentionnellement ces fichiers de jointure et de fumée partagés ; exécutez les commandes de contrat explicitement lorsque vous touchez aux surfaces de channel ou de provider partagées.

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

- **status** - Sondes de statut de channel
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

Les tests de contrat s'exécutent dans CI et ne nécessitent pas de vraies clés API.

## Ajouter des régressions (conseils)

Lorsque vous corrigez un problème de provider/model découvert en direct :

- Ajoutez si possible une régression compatible CI (provider simulé/bouchonné, ou capturez la transformation exacte de la forme de la requête)
- S'il est intrinsèquement en direct uniquement (limites de débit, stratégies d'authentification), gardez le test en direct étroit et optionnel via les variables d'environnement
- Privilégiez le ciblage de la plus petite couche qui attrape le bogue :
  - bogue de conversion/relecture de requête provider → test de modèles directs
  - bogue de pipeline session/historique/tool de la passerelle → test de fumée en direct de la passerelle ou test simulé de la passerelle compatible CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les identifiants d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les identifiants de cible non classés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.
