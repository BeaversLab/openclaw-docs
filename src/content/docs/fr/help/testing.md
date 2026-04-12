---
summary: "Kit de tests : suites unit/e2e/live, runners Docker, et ce que couvre chaque test"
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

- Full gate (attendu avant le push) : `pnpm build && pnpm check && pnpm test`
- Exécution locale plus rapide de la suite complète sur une machine puissante : `pnpm test:max`
- Boucle de surveillance directe Vitest : `pnpm test:watch`
- Le ciblage direct de fichiers route désormais aussi les chemins d'extension/channel : `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Privilégiez d'abord les exécutions ciblées lorsque vous itérez sur un échec unique.
- Site QA soutenu par Docker : `pnpm qa:lab:up`
- Voie QA soutenue par une VM Linux : `pnpm openclaw qa suite --runner multipass --scenario channel-chat-baseline`

Lorsque vous modifiez des tests ou souhaitez une confiance supplémentaire :

- Porte de couverture : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de providers/models réels (nécessite des identifiants réels) :

- Suite Live (modèles + sondes d'outil/image de passerelle) : `pnpm test:live`
- Cibler un fichier live en silence : `pnpm test:live -- src/agents/models.profiles.live.test.ts`

Astuce : lorsque vous avez besoin d'un seul cas d'échec, privilégiez la réduction des tests live via les env vars de liste autorisée décrits ci-dessous.

## Runners spécifiques QA

Ces commandes se situent à côté des principales suites de tests lorsque vous avez besoin du réalisme du labo QA :

- `pnpm openclaw qa suite`
  - Exécute les scénarios QA soutenus par le repo directement sur l'hôte.
  - Exécute plusieurs scénarios sélectionnés en parallèle par défaut avec des workers de passerelle isolés,
    jusqu'à 64 workers ou le nombre de scénarios sélectionnés. Utilisez
    `--concurrency <count>` pour régler le nombre de workers, ou `--concurrency 1` pour
    l'ancienne voie série.
- `pnpm openclaw qa suite --runner multipass`
  - Exécute la même suite QA dans une VM Multipass Linux jetable.
  - Conserve le même comportement de sélection de scénario que `qa suite` sur l'hôte.
  - Réutilise les mêmes indicateurs de sélection de provider/model que `qa suite`.
  - Les exécutions Live transmettent les entrées d'auth QA prises en charge qui sont pratiques pour l'invité :
    clés de provider basées sur env, le chemin de configuration du provider QA live, et `CODEX_HOME`
    lorsque présent.
  - Les répertoires de sortie doivent rester sous la racine du repo afin que l'invité puisse écrire en retour via
    l'espace de travail monté.
  - Écrit le rapport QA normal + le résumé ainsi que les journaux Multipass sous
    `.artifacts/qa-e2e/...`.
- `pnpm qa:lab:up`
  - Démarre le site QA pris en charge par Docker pour un travail de type opérateur.
- `pnpm openclaw qa matrix`
  - Exécute la voie QA en direct Matrix contre un serveur domestique Tuwunel jetable pris en charge par Docker.
  - Provisionne trois utilisateurs temporaires Matrix (`driver`, `sut`, `observer`) plus une salle privée, puis démarre un enfant de passerelle QA avec le vrai plugin Matrix comme transport SUT.
  - Utilise l'image Tuwunel stable épinglée `ghcr.io/matrix-construct/tuwunel:v1.5.1` par défaut. Remplacez par `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` lorsque vous devez tester une image différente.
  - Écrit un rapport QA Matrix, un résumé et un artefact d'événements observés sous `.artifacts/qa-e2e/...`.
- `pnpm openclaw qa telegram`
  - Exécute la voie QA en direct Telegram contre un groupe privé réel en utilisant les jetons de bot du pilote et du SUT depuis l'environnement.
  - Nécessite `OPENCLAW_QA_TELEGRAM_GROUP_ID`, `OPENCLAW_QA_TELEGRAM_DRIVER_BOT_TOKEN` et `OPENCLAW_QA_TELEGRAM_SUT_BOT_TOKEN`. L'identifiant du groupe doit être l'identifiant de chat numérique Telegram.
  - Nécessite deux bots distincts dans le même groupe privé, le bot SUT exposant un nom d'utilisateur Telegram.
  - Pour une observation stable de bot à bot, activez le mode de communication bot à bot dans `@BotFather` pour les deux bots et assurez-vous que le bot pilote peut observer le trafic du bot de groupe.
  - Écrit un rapport QA Telegram, un résumé et un artefact de messages observés sous `.artifacts/qa-e2e/...`.

Les voies de transport en direct partagent un contrat standard pour que les nouveaux transports ne dérivent pas :

`qa-channel` reste la suite QA synthétique large et ne fait pas partie de la matrice de couverture des transports en direct.

| Voie     | Canary | Filtrage des mentions | Bloc de liste blanche | Réponse de niveau supérieur | Reprise après redémarrage | Suite de fil de discussion | Isolement du fil de discussion | Observation des réactions | Commande d'aide |
| -------- | ------ | --------------------- | --------------------- | --------------------------- | ------------------------- | -------------------------- | ------------------------------ | ------------------------- | --------------- |
| Matrix   | x      | x                     | x                     | x                           | x                         | x                          | x                              | x                         |                 |
| Telegram | x      |                       |                       |                             |                           |                            |                                |                           | x               |

## Suites de tests (ce qui s'exécute où)

Considérez les suites comme une « réalité croissante » (et une instabilité/coût croissants) :

### Unité / Intégration (par défaut)

- Commande : `pnpm test`
- Config : dix exécutions séquentielles de shards (`vitest.full-*.config.ts`) sur les projets Vitest existants délimités
- Fichiers : inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, et les tests de nœud `ui` sur liste blanche couverts par `vitest.unit.config.ts`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en cours de processus (authentification de la passerelle, routage, outils, analyse, configuration)
  - Régressions déterministes pour les bogues connus
- Attentes :
  - S'exécute dans CI
  - Aucune clé réelle requise
  - Doit être rapide et stable
- Note sur les projets :
  - Le `pnpm test` non ciblé exécute désormais onze configurations de partition plus petites (`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus géant de projet racine natif. Cela réduit le pic RSS sur les machines chargées et évite que le travail de réponse automatique/extension ne affame les suites non liées.
  - `pnpm test --watch` utilise toujours le graphe de projet racine natif `vitest.config.ts`, car une boucle de surveillance multi-partition n'est pas pratique.
  - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent les cibles de fichiers/répertoires explicites d'abord par des voies délimitées (scoped lanes), donc `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
  - `pnpm test:changed` étend les chemins git modifiés dans les mêmes voies délimitées lorsque la diff ne touche que les fichiers source/test routables ; les modifications de configuration/configuration reviennent toujours à la réexécution large du projet racine.
  - Les tests unitaires à importation légère provenant des agents, des commandes, des plugins, des assistants de réponse automatique, `plugin-sdk` et d'autres zones d'utilitaires purs passent par la voie `unit-fast`, qui ignore `test/setup-openclaw-runtime.ts` ; les fichiers lourds d'état/d'exécution restent sur les voies existantes.
  - Les fichiers source d'assistance `plugin-sdk` et `commands` sélectionnés mappent également les exécutions en mode modifié à des tests frères explicites dans ces voies légères, afin que les modifications d'assistance évitent de relancer la suite complète et lourde pour ce répertoire.
  - `auto-reply` dispose désormais de trois compartiments dédiés : les assistants principaux de premier niveau, les tests d'intégration `reply.*` de premier niveau, et le sous-arbre `src/auto-reply/reply/**`. Cela permet de garder le travail le plus lourd du harnais de réponse en dehors des tests de statut/chunk/token peu coûteux.
- Note concernant le runner intégré :
  - Lorsque vous modifiez les entrées de découverte des outils de message ou le contexte d'exécution de la compactage,
    conservez les deux niveaux de couverture.
  - Ajoutez des régressions d'assistance ciblées pour les limites de routage/normalisation pures.
  - Maintenez également les suites d'intégration du runner intégré en bonne santé :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les IDs scopés et le comportement de compactage circulent toujours
    dans les chemins réels `run.ts` / `compact.ts` ; les tests d'assistance uniquement ne constituent pas
    un substitut suffisant pour ces chemins d'intégration.
- Note concernant le pool :
  - La configuration de base de Vitest utilise désormais `threads` par défaut.
  - La configuration partagée Vitest corrige également `isolate: false` et utilise le runner non isolé pour les configurations des projets racine, e2e et live.
  - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute désormais également sur le runner partagé non isolé.
  - Chaque shard `pnpm test` hérite des mêmes valeurs par défaut `threads` + `isolate: false` de la configuration partagée Vitest.
  - Le lanceur partagé `scripts/run-vitest.mjs` ajoute désormais également `--no-maglev` par défaut pour les processus enfants Node de Vitest afin de réduire l'activité de compilation V8 lors des grandes exécutions locales. Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si vous devez comparer avec le comportement standard de V8.
- Note concernant l'itération locale rapide :
  - `pnpm test:changed` achemine via des voies scopées lorsque les chemins modifiés correspondent proprement à une suite plus petite.
  - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement de routage, mais avec une limite de workers plus élevée.
  - La mise à l'échelle automatique des workers locaux est intentionnellement conservatrice pour l'instant et réduit également ses efforts lorsque la charge moyenne de l'hôte est déjà élevée, de sorte que plusieurs exécutions Vitest simultanées causent moins de dégâts par défaut.
  - La configuration Vitest de base marque les fichiers de projets/configurations comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage des tests change.
  - La configuration conserve `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez un emplacement de cache explicite pour le profilage direct.
- Note de débogage des performances :
  - `pnpm test:perf:imports` active le rapport de durée d'importation Vitest ainsi que la sortie de la répartition des importations.
  - `pnpm test:perf:imports:changed` limite la même vue de profilage aux fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare le `test:changed` acheminé avec le chemin natif du projet racine pour ce diff validé et affiche le temps écoulé ainsi que le RSS maximal macOS.
- `pnpm test:perf:changed:bench -- --worktree` effectue un benchmark de l'arborescence sale actuelle en acheminant la liste des fichiers modifiés via `scripts/test-projects.mjs` et la configuration Vitest racine.
  - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour le démarrage Vitest/Vite et la surcharge de transformation.
  - `pnpm test:perf:profile:runner` écrit des profils CPU+tas de l'exécuteur pour la suite unitaire avec le parallélisme de fichiers désactivé.

### E2E (gateway smoke)

- Commande : `pnpm test:e2e`
- Configuration : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `threads` avec `isolate: false`, correspondant au reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (limité à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console verbeuse.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appariement de nœuds et réseau plus lourd
- Attentes :
  - S'exécute dans la CI (lorsqu'elle est activée dans le pipeline)
  - Aucune clé réelle requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : OpenShell backend smoke

- Commande : `pnpm test:e2e:openshell`
- Fichier : `test/openshell-sandbox.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw sur un vrai `sandbox ssh-config` + exec SSH
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
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - « Est-ce que ce fournisseur/modèle fonctionne réellement _aujourd'hui_ avec de vrais identifiants ? »
  - Détecte les changements de format du fournisseur, les singularités d'appel d'outil, les problèmes d'authentification et le comportement des limites de taux
- Attentes :
  - Non stable pour l'IC par conception (réseaux réels, politiques réelles des fournisseurs, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Privilégiez l'exécution de sous-ensembles réduits plutôt que de « tout »
- Les exécutions live sourcent `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions live isolent toujours les `HOME` et copient le matériel de configuration/authentification dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre véritable `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests live utilisent votre véritable répertoire personnel.
- `pnpm test:live` utilise par défaut un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avis `~/.profile` supplémentaire et coupe les journaux de démarrage de la passerelle/les bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés d'API (spécifique au fournisseur) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une priorité par exécution via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponses de limite de taux.
- Sortie de progression/battement de cœur :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels longs au fournisseur restent visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de la console Vitest afin que les lignes de progression du fournisseur/de la passerelle diffusent immédiatement lors des exécutions en direct.
  - Ajustez les battements de cœur du modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les battements de cœur de la passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Modification du réseau de passerelle / protocole WS / appariement : ajoutez `pnpm test:e2e`
- Débogage de « mon bot est en panne » / échecs spécifiques au fournisseur / appel d'outil : exécutez un `pnpm test:live` réduit

## Live : Android node capability sweep

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **toutes les commandes actuellement annoncées** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préalable/manuelle (la suite n'installe/exécute/apparie pas l'application).
  - Validation commande par commande de la passerelle `node.invoke` pour le nœud Android sélectionné.
- Configuration préalable requise :
  - Application Android déjà connectée et appariée à la passerelle.
  - Application maintenue au premier plan.
  - Autorisations/consentement de capture accordés pour les capacités que vous attendez voir réussir.
- Priorités de cible facultatives :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Android App](/en/platforms/android)

## Live : model smoke (profile keys)

Les tests Live sont divisés en deux couches afin que nous puissions isoler les échecs :

- « Direct model » indique si le provider/model peut répondre du tout avec la clé donnée.
- « Gateway smoke » indique si le pipeline complet gateway+agent fonctionne pour ce model (sessions, historique, outils, stratégie de bac à sable, etc.).

### Couche 1 : Achèvement direct du model (sans passerelle)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les modèles découverts
  - Utilisez `getApiKeyForModel` pour sélectionner les modèles pour lesquels vous avez des identifiants
  - Exécuter un petit achèvement par model (et des régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour moderne) pour exécuter réellement cette suite ; sinon, elle est ignorée pour garder `pnpm test:live` concentré sur le smoke de la passerelle
- Comment sélectionner les modèles :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (liste d'autorisation par virgule)
  - Les balayages modernes/tous sont par défaut limités à une plafond curé à fort signal ; définissez `OPENCLAW_LIVE_MAX_MODELS=0` pour un balayage moderne exhaustif ou un nombre positif pour un plafond plus petit.
- Comment sélectionner les fournisseurs :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation par virgule)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis d'environnement
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour appliquer uniquement le **magasin de profils**
- Pourquoi cela existe :
  - Sépare « l'API du provider est cassée / la clé est invalide » de « le pipeline de l'agent de la passerelle est cassé »
  - Contient de petites régressions isolées (exemple : rejeu de raisonnement OpenAI Responses/Codex Responses + flux d'appels d'outils)

### Couche 2 : Gateway + smoke de l'agent de développement (ce que fait réellement « @openclaw »)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une passerelle en cours de processus
  - Créer/patcher une session `agent:dev:*` (remplacement de modèle par exécution)
  - Parcourir les modèles avec clés et vérifier :
    - réponse « significative » (sans outils)
    - une invocation d'outil réel fonctionne (sonde de lecture)
    - sondes d'outils supplémentaires facultatives (sonde exec+read)
    - Les chemins de régression OpenAI (outil uniquement → suivi) continuent de fonctionner
- Détails des sondes (pour que vous puissiez expliquer rapidement les échecs) :
  - `read` probe : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - `exec+read` probe : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read`.
  - image probe : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le model renvoie `cat <CODE>`.
  - Référence de l'implémentation : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou une liste séparée par des virgules) pour restreindre
  - Les parcours Modern/all du Gateway sont par défaut limités à une sélection curated à fort signal ; définissez `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` pour un parcours moderne exhaustif ou un nombre positif pour une limite plus petite.
- Comment sélectionner les fournisseurs (éviter "OpenRouter tout") :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondes Tool + image sont toujours activées dans ce test en direct :
  - `read` probe + `exec+read` probe (stress tool)
  - la sonde d'image s'exécute lorsque le model annonce la prise en charge des entrées d'image
  - Flux (haut niveau) :
    - Le test génère un petit PNG avec "CHAT" + code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Le Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au model
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Astuce : pour voir ce que vous pouvez tester sur votre machine (et les `provider/model` ids exacts), exécutez :

```bash
openclaw models list
openclaw models list --json
```

## Live : CLI backend smoke (Claude, Codex, Gemini ou autres CLI locaux)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline Gateway + agent en utilisant un backend CLI local, sans toucher à votre configuration par défaut.
- Les valeurs par défaut des tests de fumée spécifiques au backend se trouvent dans la définition `cli-backend.ts` de l'extension propriétaire.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Par défaut :
  - Provider/modèle par défaut : `claude-cli/claude-sonnet-4-6`
  - Le comportement de la commande/args/image provient des métadonnées du plugin backend CLI propriétaire.
- Remplacements (facultatif) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une pièce jointe image réelle (les chemins sont injectés dans le prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins de fichiers image en tant qu'args CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la manière dont les args d'image sont passés lorsque `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un deuxième tour et valider le flux de reprise.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` pour désactiver la sonde de continuité de session Claude Sonnet -> Opus par défaut (définir sur `1` pour forcer son activation lorsque le modèle sélectionné prend en charge une cible de basculement).

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
- Il exécute le test de fumée du backend CLI en direct dans l'image Docker du dépôt en tant qu'utilisateur non-root `node`.
- Il résout les métadonnées de test de fumée CLI à partir de l'extension propriétaire, puis installe le package CLI Linux correspondant (`@anthropic-ai/claude-code`, `@openai/codex` ou `@google/gemini-cli`) dans un préfixe accessible en écriture mis en cache à `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (par défaut : `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` nécessite un abonnement portable Claude Code OAuth via `~/.claude/.credentials.json` avec `claudeAiOauth.subscriptionType` ou `CLAUDE_CODE_OAUTH_TOKEN` depuis `claude setup-token`. Il prouve d'abord le `claude -p` direct dans Docker, puis exécute deux tours backend CLI Gateway CLI sans préserver les variables d'environnement de clé Anthropic API. Ce parcours d'abonnement désactive par défaut les sondes MCP/tool et d'image de Claude car Claude achemine actuellement l'utilisation des applications tierces via la facturation d'utilisation supplémentaire au lieu des limites normales du plan d'abonnement.
- Le test de fumée backend CLI en direct exerce désormais le même flux de bout en bout pour Claude, Codex et Gemini : tour de texte, tour de classification d'image, puis appel d'outil MCP `cron` vérifié via le CLI CLI.
- Le test de fumée par défaut de Claude modifie également la session de Sonnet à Opus et vérifie que la session reprise se souvient toujours d'une note antérieure.

## Live : Test de fumée de liaison ACP (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de liaison de conversation ACP avec un agent ACP en direct :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation de canal de messages synthétique en place
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
  - Ce parcours utilise la surface `chat.send` du Gateway avec des champs de route d'origine synthétiques réservés aux administrateurs afin que les tests puissent attacher le contexte du canal de messages sans prétendre livrer à l'extérieur.
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
- Par défaut, il exécute le test de fumée ACP bind contre tous les agents CLI en direct pris en charge, séquentiellement : `claude`, `codex`, puis `gemini`.
- Utilisez `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` ou `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` pour réduire la matrice.
- Il source `~/.profile`, met en place le matériel d'authentification CLI correspondant dans le conteneur, installe `acpx` dans un préfixe npm inscriptible, puis installe le CLI en direct demandé (`@anthropic-ai/claude-code`, `@openai/codex` ou `@google/gemini-cli`) s'il est manquant.
- Dans Docker, le runner définit `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` pour qu'acpx garde les variables d'environnement du provider issues du profil sourcé disponibles pour le CLI de harnais enfant.

## Live : Test de fumée du harnais app-server Codex

- Objectif : valider le harnais Codex détenu par le plugin via la passerelle normale
  méthode `agent` :
  - charger le plugin `codex` regroupé
  - sélectionner `OPENCLAW_AGENT_RUNTIME=codex`
  - envoyer un premier tour d'agent passerelle à `codex/gpt-5.4`
  - envoyer un second tour à la même session OpenClaw et vérifier que le thread app-server
    peut reprendre
  - exécuter `/codex status` et `/codex models` via le même chemin de commande
    passerelle
- Test : `src/gateway/gateway-codex-harness.live.test.ts`
- Activer : `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Modèle par défaut : `codex/gpt-5.4`
- Sonde d'image facultative : `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonde MCP/outil facultative : `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- Le test de fumée définit `OPENCLAW_AGENT_HARNESS_FALLBACK=none` pour qu'un harnais Codex
  cassé ne puisse pas passer en revenant silencieusement à PI.
- Auth : `OPENAI_API_KEY` depuis le shell/profil, plus optionnellement copiés
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

- Le runner Docker se trouve dans `scripts/test-live-codex-harness-docker.sh`.
- Il source le `~/.profile` monté, passe `OPENAI_API_KEY`, copie les fichiers d'auth Codex CLI si présents, installe `@openai/codex` dans un préfixe npm monté en écriture, prépare l'arborescence des sources, puis exécute uniquement le test live Codex-harness.
- Docker active les sondes d'image et MCP/tool par défaut. Définissez `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` ou `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` lorsque vous avez besoin d'un débogage plus ciblé.
- Docker exporte également `OPENCLAW_AGENT_HARNESS_FALLBACK=none`, correspondant à la configuration du test live afin que `openai-codex/*` ou le repli PI ne puissent pas masquer une régression du harnais Codex.

### Recettes live recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins fragiles :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, smoke de la passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel de tool sur plusieurs fournisseurs :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise l'API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison d'agent style Cloud Code Assist).
- `google-gemini-cli/...` utilise le CLI Gemini local sur votre machine (authentification séparée + particularités des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle l'API Gemini hébergée par Google via HTTP (clé API / auth par profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw appelle un binaire `gemini` local ; il possède sa propre authentification et peut se comporter différemment (streaming/support des outils/décalage de version).

## Live : matrice de modèles (ce que nous couvrons)

Il n'y a pas de « liste de modèles CI » fixe (live est optionnel), mais voici les modèles **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble smoke moderne (appel de tool + image)

C'est l'exécution « modèles courants » que nous espérons maintenir fonctionnelle :

- OpenAI (non-Codex) : `openai/gpt-5.4` (optionnel : `openai/gpt-5.4-mini`)
- OpenAI Codex : `openai-codex/gpt-5.4`
- Anthropic : Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (Gemini API) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (évitez les anciens modèles Gemini 2.x)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Exécuter le test de fumée de la passerelle avec outils + image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Référence : appel d'outils (Read + Exec optionnel)

Choisissez au moins un par famille de provider :

- OpenAI : `openai/gpt-5.4` (ou `openai/gpt-5.4-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Couverture supplémentaire optionnelle (bien à avoir) :

- xAI : `xai/grok-4` (ou dernière disponible)
- Mistral : `mistral/`… (choisissez un modèle capable « d'outils » que avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; l'appel d'outils dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un modèle capable d'image dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI capables de vision, etc.) pour tester la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez des clés activées, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (des centaines de modèles ; utilisez `openclaw models scan` pour trouver des candidats capables d'outils+image)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Plus de providers que vous pouvez inclure dans la matrice live (si vous avez des identifiants/config) :

- Intégré : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Conseil : n'essayez pas de coder en dur « tous les modèles » dans la documentation. La liste faisant autorité est tout ce que `discoverModels(...)` renvoie sur votre machine + toutes les clés disponibles.

## Identifiants (ne jamais committer)

Les tests en direct découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests en direct devraient trouver les mêmes clés.
- Si un test en direct indique « no creds », débuggez de la même manière que vous débuggeriez `openclaw models list` / la sélection de modèle.

- Profils d'authentification par agent : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (c'est ce que signifie « profile keys » dans les tests en direct)
- Config : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Répertoire d'état hérité : `~/.openclaw/credentials/` (copié dans le domicile en direct de préproduction lorsque présent, mais pas le stockage principal des clés de profil)
- Les exécutions locales en direct copient par défaut la configuration active, les fichiers `auth-profiles.json` par agent, l'`credentials/` hérité et les répertoires d'authentification CLI externes pris en charge dans un domicile de test temporaire ; les domiciles en direct de préproduction ignorent `workspace/` et `sandboxes/`, et les remplacements de chemin `agents.*.workspace` / `agentDir` sont supprimés pour que les sondages restent en dehors de votre espace de travail hôte réel.

Si vous souhaitez vous fier aux clés d'environnement (par exemple exportées dans votre `~/.profile`), exécutez des tests locaux après `source ~/.profile`, ou utilisez les runners Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Deepgram en direct (transcription audio)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus plan de codage en direct

- Test : `src/agents/byteplus.live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Remplacement facultatif de model : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Flux de médias du workflow ComfyUI en direct

- Test : `extensions/comfy/comfy.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Portée :
  - Teste les chemins d'image, de vidéo et `music_generate` comfy regroupés
  - Ignore chaque capacité sauf si `models.providers.comfy.<capability>` est configuré
  - Utile après avoir modifié la soumission, le sondage, les téléchargements ou l'enregistrement du plugin du workflow comfy

## Génération d'images en direct

- Test : `src/image-generation/runtime.live.test.ts`
- Commande : `pnpm test:live src/image-generation/runtime.live.test.ts`
- Harnais : `pnpm test:live:media image`
- Portée :
  - Énumère chaque plugin de provider de génération d'image enregistré
  - Charge les env vars de provider manquants depuis votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API en direct/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les identifiants réels du shell
  - Ignore les providers sans authentification/profil/model utilisable
  - Exécute les variantes de génération d'images standard via la capacité d'exécution partagée :
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Providers groupés actuels couverts :
  - `openai`
  - `google`
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification par le magasin de profils et ignorer les remplacements uniquement basés sur les variables d'environnement

## Génération de musique en direct

- Test : `extensions/music-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media music`
- Portée :
  - Teste le chemin de provider de génération de musique groupé partagé
  - Couvre actuellement Google et MiniMax
  - Charge les env vars de provider depuis votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API en direct/de l'environnement avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les identifiants réels du shell
  - Ignore les fournisseurs sans authentification/profil/modèle utilisable
  - Exécute les deux modes d'exécution déclarés lorsqu'ils sont disponibles :
    - `generate` avec une entrée composée uniquement d'une invite
    - `edit` lorsque le fournisseur déclare `capabilities.edit.enabled`
  - Couverture actuelle sur la voie partagée :
    - `google` : `generate`, `edit`
    - `minimax` : `generate`
    - `comfy` : fichier live Comfy séparé, non inclus dans ce balayage partagé
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification par le magasin de profils et ignorer les substitutions uniquement environnementales

## Génération de vidéo en direct

- Test : `extensions/video-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media video`
- Portée :
  - Exerce le chemin du fournisseur de génération de vidéo groupé et partagé
  - Charge les variables d'environnement du fournisseur depuis votre shell de connexion (`~/.profile`) avant le sondage
  - Utilise par défaut les clés API en direct/de l'environnement avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les identifiants réels du shell
  - Ignore les fournisseurs sans authentification/profil/modèle utilisable
  - Exécute les deux modes d'exécution déclarés lorsqu'ils sont disponibles :
    - `generate` avec une entrée composée uniquement d'une invite
    - `imageToVideo` lorsque le fournisseur déclare `capabilities.imageToVideo.enabled` et que le fournisseur/modèle sélectionné accepte les images locales soutenues par un tampon dans le balayage partagé
    - `videoToVideo` lorsque le fournisseur déclare `capabilities.videoToVideo.enabled` et que le fournisseur/modèle sélectionné accepte les vidéos locales soutenues par un tampon dans le balayage partagé
  - Fournisseurs `imageToVideo` actuellement déclarés mais ignorés dans le balayage partagé :
    - `vydra` car le `veo3` groupé est textuel uniquement et le `kling` groupé nécessite une URL d'image distante
  - Couverture spécifique au fournisseur Vydra :
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ce fichier exécute `veo3` texte-vidéo plus une voie `kling` qui utilise une fixture d'URL d'image distante par défaut
  - Couverture live `videoToVideo` actuelle :
    - `runway` uniquement lorsque le model sélectionné est `runway/gen4_aleph`
  - Providers `videoToVideo` actuellement déclarés mais ignorés dans le sweep partagé :
    - `alibaba`, `qwen`, `xai` car ces chemins nécessitent actuellement des URLs de référence distantes `http(s)` / MP4
    - `google` car la voie partagée Gemini/Veo actuelle utilise une entrée sauvegardée en tampon local et ce chemin n'est pas accepté dans le sweep partagé
    - `openai` car la voie partagée actuelle ne dispose pas de garanties d'accès à la retouche/remix vidéo spécifiques à l'organisation
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
- Comportement d'auth facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'auth par magasin de profil et ignorer les remplacements uniquement par env

## Harnais de live média

- Commande : `pnpm test:live:media`
- Objectif :
  - Exécute les suites live d'image, de musique et de vidéo partagées via un point d'entrée natif du dépôt
  - Charge automatiquement les env vars du provider manquants depuis `~/.profile`
  - Rétrécit automatiquement chaque suite aux providers qui ont actuellement une auth utilisable par défaut
  - Réutilise `scripts/test-live.mjs`, donc le comportement de heartbeat et de mode silencieux reste cohérent
- Exemples :
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Runners Docker (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker sont divisés en deux catégories :

- Runners de model live : `test:docker:live-models` et `test:docker:live-gateway` n'exécutent que leur fichier live correspondant à la clé de profil à l'intérieur de l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de config local et votre espace de travail (et en sourçant `~/.profile` si monté). Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les lanceurs de tests live Docker utilisent par défaut une limite de smoke plus petite afin qu'un sweep complet Docker reste pratique :
  `test:docker:live-models` a pour valeur par défaut `OPENCLAW_LIVE_MAX_MODELS=12`, et
  `test:docker:live-gateway` a pour valeur par défaut `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000` et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Remplacez ces env vars lorsque vous
  souhaitez explicitement effectuer le scan exhaustif plus large.
- `test:docker:all` construit l'image live Docker une fois via `test:docker:live-build`, puis la réutilise pour les deux voies de test live Docker.
- Lanceurs de smoke de conteneur : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels` et `test:docker:plugins` démarrent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de plus haut niveau.

Les lanceurs de modèles live Docker montent également en liaison (bind-mount) uniquement les répertoires d'auth CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire home du conteneur avant l'exécution afin que l'OAuth CLI OAuth puisse actualiser les jetons sans modifier le magasin d'auth de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- Smoke de liaison ACP : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh`)
- Smoke backend CLI : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Smoke de harnais app-server Codex : `pnpm test:docker:live-codex-harness` (script : `scripts/test-live-codex-harness-docker.sh`)
- Gateway + agent dev : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Smoke live Open WebUI : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant Onboarding (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Mise en réseau Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Pont de canal MCP (Gateway amorcé + pont stdio + smoke de cadre de notification brut Claude) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (install smoke + `/plugin` alias + Claude-bundle restart semantics): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Les runners Docker live-model montent également la copie de travail actuelle en lecture seule (bind-mount) et la préparent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest par rapport à votre source/configuration locale exacte. L'étape de préparation ignore les caches volumineux locaux et les résultats de construction de l'application tels que `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et les répertoires de sortie Gradle ou `.build` locaux à l'application, afin que les exécutions live Docker ne perdent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` afin que les sondes live du gateway ne démarrent pas de vrais workers de canal Docker/Telegram/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, donc faites également passer `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture live du gateway de cette voie Discord. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur gateway Docker avec les points de terminaison HTTP compatibles OpenClaw activés, démarre un conteneur Open WebUI épinglé contre ce gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une véritable requête de chat via le proxy `/api/chat/completions` d'Open WebUI. La première exécution peut être sensiblement plus lente car OpenAI peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie attend une clé de modèle live utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir lors des exécutions Dockerisées. Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un compte Docker, Telegram, ou Discord réel. Il démarre un conteneur Gateway amorcé, démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations acheminées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements live, le routage des envois sortants, et les notifications de canal + autorisations de style Claude sur le pont MCP stdio réel. La vérification des notifications inspecte directement les trames MCP stdio brutes, de sorte que le test de fumée valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à exposer.

Test de fumée en langage clair ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les workflows de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils ACP, donc ne le supprimez pas.

Env vars utiles :

- `OPENCLAW_CONFIG_DIR=...` (défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installations CLI mises en cache dans Docker
- Les répertoires/fichiers d'auth CLI externes sous `$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions restreintes de provider montent uniquement les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_SKIP_DOCKER_BUILD=1` pour réutiliser une image `openclaw:local-live` existante pour les réexécutions qui ne nécessitent pas de reconstruction
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du magasin de profils (pas de l'env)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le model exposé par la passerelle pour le test de fumée Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification du nonce utilisée par le test de fumée Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer la balise d'image Open WebUI épinglée

## Docs sanity

Run docs checks after doc edits: `pnpm check:docs`.
Run full Mintlify anchor validation when you need in-page heading checks too: `pnpm docs:check-links:anchors`.

## Offline regression (CI-safe)

These are “real pipeline” regressions without real providers:

- Gateway tool calling (mock OpenAI, real gateway + agent loop): `src/gateway/gateway.test.ts` (case: "runs a mock OpenAI tool call end-to-end via gateway agent loop")
- Gateway wizard (WS `wizard.start`/`wizard.next`, writes config + auth enforced): `src/gateway/gateway.test.ts` (case: "runs wizard over ws and writes auth token config")

## Agent reliability evals (skills)

We already have a few CI-safe tests that behave like “agent reliability evals”:

- Mock tool-calling through the real gateway + agent loop (`src/gateway/gateway.test.ts`).
- End-to-end wizard flows that validate session wiring and config effects (`src/gateway/gateway.test.ts`).

What’s still missing for skills (see [Skills](/en/tools/skills)):

- **Decisioning:** when skills are listed in the prompt, does the agent pick the right skill (or avoid irrelevant ones)?
- **Compliance:** does the agent read `SKILL.md` before use and follow required steps/args?
- **Workflow contracts:** multi-turn scenarios that assert tool order, session history carryover, and sandbox boundaries.

Future evals should stay deterministic first:

- A scenario runner using mock providers to assert tool calls + order, skill file reads, and session wiring.
- A small suite of skill-focused scenarios (use vs avoid, gating, prompt injection).
- Optional live evals (opt-in, env-gated) only after the CI-safe suite is in place.

## Contract tests (plugin and channel shape)

Contract tests verify that every registered plugin and channel conforms to its
interface contract. They iterate over all discovered plugins and run a suite of
shape and behavior assertions. The default `pnpm test` unit lane intentionally
skips these shared seam and smoke files; run the contract commands explicitly
when you touch shared channel or provider surfaces.

### Commands

- All contracts: `pnpm test:contracts`
- Contrats de canal uniquement : `pnpm test:contracts:channels`
- Contrats de fournisseur uniquement : `pnpm test:contracts:plugins`

### Contrats de canal

Situés dans `src/channels/plugins/contracts/*.contract.test.ts` :

- **plugin** - Forme de base du plugin (id, nom, capacités)
- **setup** - Contrat de l'assistant de configuration
- **session-binding** - Comportement de liaison de session
- **outbound-payload** - Structure de la charge utile du message
- **inbound** - Gestion des messages entrants
- **actions** - Gestionnaires d'actions de canal
- **threading** - Gestion de l'ID de fil de discussion
- **directory** - API de répertoire/liste
- **group-policy** - Application de la stratégie de groupe

### Contrats de statut de fournisseur

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sonde de statut du canal
- **registry** - Structure du registre de plugins

### Contrats de fournisseur

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat du flux d'authentification
- **auth-choice** - Choix/sélection de l'authentification
- **catalog** - API du catalogue de modèles
- **discovery** - Découverte de plugins
- **loader** - Chargement de plugins
- **runtime** - Runtime du fournisseur
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exportations ou les sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de canal ou de fournisseur
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests de contrat s'exécutent dans CI et ne nécessitent pas de vraies clés API.

## Ajout de régressions (conseils)

Lorsque vous corrigez un problème de fournisseur/modèle découvert en direct :

- Ajoutez une régression sûre pour CI si possible (fournisseur simulé/stub, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement uniquement en direct (limites de débit, stratégies d'authentification), gardez le test en direct restreint et optionnel via les variables d'environnement
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bogue de conversion/relecture de requête de fournisseur → test direct des modèles
  - bogue de pipeline session/historique/outil de la passerelle → test de fumée en direct de la passerelle ou test simulé de la passerelle sûr pour CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les id d'exécution des segments de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille cible `includeInPlan` SecretRef dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les identifiants de cible non classés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.
