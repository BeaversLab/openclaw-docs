---
summary: "Kit de test : suites unit/e2e/live, runners Docker et ce que couvre chaque test"
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

- Full gate (attendu avant le push) : `pnpm build && pnpm check && pnpm test`
- Exécution locale plus rapide de la suite complète sur une machine puissante : `pnpm test:max`
- Boucle de surveillance directe Vitest : `pnpm test:watch`
- Le ciblage direct de fichiers route désormais également les chemins d'extension/channel : `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`
- Site QA basé sur Docker : `pnpm qa:lab:up`

Lorsque vous modifiez des tests ou souhaitez une confiance supplémentaire :

- Coverage gate : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de vrais providers/modèles (nécessite de vrais identifiants) :

- Suite Live (modèles + sondes tool/image de la passerelle) : `pnpm test:live`
- Cibler un fichier live en silence : `pnpm test:live -- src/agents/models.profiles.live.test.ts`

Astuce : lorsque vous n'avez besoin que d'un seul cas d'échec, préférez restreindre les tests live via les env vars de liste autorisée décrits ci-dessous.

## Suites de tests (ce qui s'exécute où)

Pensez aux suites comme à un « réalisme croissant » (et une instabilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Config : dix exécutions séquentielles de shards (`vitest.full-*.config.ts`) sur les projets Vitest existants délimités
- Fichiers : inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, et les tests node `ui` sur liste blanche couverts par `vitest.unit.config.ts`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en cours de processus (auth passerelle, routage, outils, analyse, config)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans CI
  - Aucune clé réelle requise
  - Doit être rapide et stable
- Note sur les projets :
  - `pnpm test` non ciblé exécute désormais onze configurations de partition plus petites (`core-unit-src`, `core-unit-security`, `core-unit-ui`, `core-unit-support`, `core-support-boundary`, `core-contracts`, `core-bundled`, `core-runtime`, `agentic`, `auto-reply`, `extensions`) au lieu d'un seul processus natif géant de projet racine. Cela réduit le RSS de pointe sur les machines chargées et évite que les travaux de réponse automatique/extension ne privent les suites indépendantes.
  - `pnpm test --watch` utilise toujours le graphe de projet racine natif `vitest.config.ts`, car une boucle de surveillance multi-partition n'est pas pratique.
  - `pnpm test`, `pnpm test:watch` et `pnpm test:perf:imports` acheminent les cibles explicites de fichiers/répertoires d'abord via des voies délimitées, de sorte que `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` évite de payer la taxe de démarrage complète du projet racine.
  - `pnpm test:changed` développe les chemins git modifiés dans les mêmes voies délimitées lorsque la diff ne touche que les fichiers source/test routables ; les modifications de configuration/de configuration reviennent toujours à la réexécution large du projet racine.
  - Les tests `plugin-sdk` et `commands` sélectionnés passent également par des voies légères dédiées qui sautent `test/setup-openclaw-runtime.ts` ; les fichiers lourds avec état/exécution restent sur les voies existantes.
  - Les fichiers source auxiliaires `plugin-sdk` et `commands` sélectionnés mappent également les exécutions en mode modifié à des tests frères explicites dans ces voies légères, afin que les modifications des auxiliaires évitent de réexécuter la suite lourde complète pour ce répertoire.
  - `auto-reply` possède désormais trois compartiments dédiés : les assistants principaux de niveau supérieur, les tests d'intégration `reply.*` de niveau supérieur et le sous-arbre `src/auto-reply/reply/**`. Cela permet de garder le travail de harnais de réponse le plus lourd à l'écart des tests peu coûteux de statut/chunk/jeton.
- Note sur le runner intégré :
  - Lorsque vous modifiez les entrées de découverte d'outils de message ou le contexte d'exécution de compactage,
    conservez les deux niveaux de couverture.
  - Ajoutez des régressions d'assistant ciblées pour les limites pures de routage/normalisation.
  - Assurez-vous également que les suites d'intégration du runner intégré restent fonctionnelles :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les identifiants délimités et le comportement de compactage passent toujours
    par les chemins réels `run.ts` / `compact.ts` ; les tests reposant uniquement sur les assistants ne constituent pas
    un substitut suffisant pour ces chemins d'intégration.
- Note sur le pool :
  - La configuration de base de Vitest utilise désormais `threads` par défaut.
  - La configuration partagée de Vitest corrige également `isolate: false` et utilise le runner non isolé pour les projets racine, e2e et les configurations live.
  - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute également maintenant sur le runner non isolé partagé.
  - Chaque shard `pnpm test` hérite des mêmes valeurs par défaut `threads` + `isolate: false` de la configuration partagée Vitest.
  - Le lanceur partagé `scripts/run-vitest.mjs` ajoute désormais également `--no-maglev` pour les processus enfants Node de Vitest par défaut afin de réduire la charge de compilation V8 lors des grandes exécutions locales. Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si vous devez comparer avec le comportement standard de V8.
- Note sur l'itération locale rapide :
  - `pnpm test:changed` achemine via les voies délimitées lorsque les chemins modifiés correspondent proprement à une suite plus petite.
  - `pnpm test:max` et `pnpm test:changed:max` conservent le même comportement de routage, mais avec une limite de workers plus élevée.
  - La mise à l'échelle automatique des workers locaux est désormais intentionnellement conservatrice et réduit également l'activité lorsque la charge moyenne de l'hôte est déjà élevée, afin que plusieurs exécutions Vitest simultanées causent moins de dégâts par défaut.
  - La configuration de base de Vitest marque les projets/fichiers de configuration comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage des tests change.
  - La configuration conserve `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez un emplacement de cache explicite pour un profilage direct.
- Note sur le débogage des performances :
  - `pnpm test:perf:imports` active le rapport de durée d'importation Vitest ainsi que la sortie de répartition des importations.
  - `pnpm test:perf:imports:changed` limite la même vue de profilage aux fichiers modifiés depuis `origin/main`.
- `pnpm test:perf:changed:bench -- --ref <git-ref>` compare les `test:changed` acheminés par rapport au chemin natif du projet racine pour ce diff validé et imprime le temps écoulé ainsi que le RSS max de macOS.
- `pnpm test:perf:changed:bench -- --worktree` effectue un benchmark de l'arborescence sale actuelle en acheminant la liste des fichiers modifiés via `scripts/test-projects.mjs` et la configuration racine de Vitest.
  - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour le démarrage et la surcharge de transformation de Vitest/Vite.
  - `pnpm test:perf:profile:runner` écrit les profils CPU+heap du runner pour la suite unitaire avec le parallélisme de fichiers désactivé.

### E2E (test de fumée de la passerelle)

- Commande : `pnpm test:e2e`
- Configuration : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Par défauts d'exécution :
  - Utilise le `threads` de Vitest avec `isolate: false`, correspondant au reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console verbeuse.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appairage de nœuds et réseau plus conséquent
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
  - Optionnel uniquement ; ne fait pas partie de l'exécution par défaut de `pnpm test:e2e`
  - Nécessite un `openshell` CLI local ainsi qu'un daemon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (providers réels + modèles réels)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - "Ce fournisseur/modèle fonctionne-t-il réellement _aujourd'hui_ avec de vrais identifiants ?"
  - Détecter les changements de format du fournisseur, les singularités d'appel d'outil, les problèmes d'authentification et le comportement des limites de taux
- Attentes :
  - Non stable pour l'IC par conception (réseaux réels, politiques réelles des fournisseurs, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Préférez l'exécution de sous-ensembles réduits plutôt que "tout"
- Les exécutions Live exécutent la source `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions Live isolent toujours `HOME` et copient le matériel de configuration/authentification dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre vrai `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests Live utilisent votre vrai répertoire personnel.
- `pnpm test:live` utilise par défaut un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avis supplémentaire `~/.profile` et coupe les logs d'amorçage de la passerelle/le bavardage Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les logs de démarrage complets.
- Rotation des clés API (spécifique au fournisseur) : définissez `*_API_KEYS` avec le format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une priorité par exécution via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponse de limite de taux.
- Sortie de progression/heartbeat :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels fournisseurs longs soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de console Vitest afin que les lignes de progression du fournisseur/de la passerelle diffusent immédiatement pendant les exécutions Live.
  - Ajustez les heartbeats de modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Régler les battements de cœur de la passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Toucher au réseau de la passerelle / protocole WS / appairage : ajoutez `pnpm test:e2e`
- Débogage de "mon bot est en panne" / échecs spécifiques au fournisseur / appel d'outils : exécutez un `pnpm test:live` ciblé

## Live : Android node capability sweep

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **chaque commande actuellement annoncée** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préalable/manuelle (la suite n'installe pas/n'exécute pas/n'apparie pas l'application).
  - Validation commande par commande de la passerelle `node.invoke` pour le nœud Android sélectionné.
- Pré-configuration requise :
  - Application Android déjà connectée + appariée à la passerelle.
  - Application gardée au premier plan.
  - Consentement d'autorisations/capture accordé pour les capacités que vous attendez réussir.
- Remplacements de cible facultatifs :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Android App](/en/platforms/android)

## Live : model smoke (profile keys)

Les tests en direct sont divisés en deux couches afin que nous puissions isoler les échecs :

- « Modèle direct » nous indique si le fournisseur/modèle peut répondre du tout avec la clé donnée.
- « Gateway smoke » nous indique si le pipeline complet passerelle+agent fonctionne pour ce modèle (sessions, historique, outils, politique de bac à sable, etc.).

### Couche 1 : Achèvement direct du modèle (pas de passerelle)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les modèles découverts
  - Utiliser `getApiKeyForModel` pour sélectionner les modèles pour lesquels vous avez des identifiants
  - Exécuter un petit achèvement par modèle (et des régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour modern) pour exécuter réellement cette suite ; sinon elle est ignorée pour garder `pnpm test:live` concentré sur le test de fumée de la passerelle
- Comment sélectionner les modèles :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (liste d'autorisation par virgule)
- Comment sélectionner les fournisseurs :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation par virgule)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis d'env
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour appliquer uniquement le **magasin de profils**
- Pourquoi cela existe :
  - Sépare « l'API du fournisseur est cassée / la clé est invalide » de « le pipeline de l'agent Gateway est cassé »
  - Contient de petites régressions isolées (exemple : rejeu du raisonnement OpenAI Responses/Codex Responses + flux d'appels d'outils)

### Couche 2 : Gateway + test de fumée de l'agent de développement (ce que fait réellement « @openclaw »)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une Gateway en processus
  - Créer/patcher une session `agent:dev:*` (remplacement du modèle par exécution)
  - Parcourir les modèles avec clés et vérifier :
    - réponse « significative » (sans outils)
    - un véritable appel d'outil fonctionne (sonde de lecture)
    - sondes d'outils supplémentaires facultatives (sonde exec+read)
    - les chemins de régression OpenAI (appel d'outil uniquement → suivi) continuent de fonctionner
- Détails de la sonde (afin que vous puissiez expliquer rapidement les échecs) :
  - sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - sonde `exec+read` : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le modèle renvoie `cat <CODE>`.
  - Référence de mise en œuvre : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou liste par virgule) pour restreindre
- Comment sélectionner les providers (éviter « tout OpenRouter ») :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste blanche séparée par des virgules)
- Les sondes d'outil et d'image sont toujours activées dans ce test en direct :
  - sonde `read` + sonde `exec+read` (stress de l'outil)
  - la sonde d'image s'exécute lorsque le modèle annonce la prise en charge de la saisie d'image
  - Flux (haut niveau) :
    - Le test génère un petit PNG avec « CAT » + code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Le Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message multimodal de l'utilisateur au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Astuce : pour voir ce que vous pouvez tester sur votre machine (et les ids exacts `provider/model`), exécutez :

```bash
openclaw models list
openclaw models list --json
```

## Live : test de fumée du backend CLI (Claude, Codex, Gemini ou autres CLI locaux)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline Gateway + agent en utilisant un backend CLI local, sans toucher à votre configuration par défaut.
- Les valeurs par défaut de test de fumée spécifiques au backend se trouvent dans la définition `cli-backend.ts` de l'extension propriétaire.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Par défaut :
  - Provider/modèle par défaut : `claude-cli/claude-sonnet-4-6`
  - Le comportement commande/args/image provient des métadonnées du plugin de backend CLI propriétaire.
- Remplacements (facultatif) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une vraie pièce jointe d'image (les chemins sont injectés dans le prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins de fichiers d'image comme args CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la façon dont les args d'image sont passés quand `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un second tour et valider le flux de reprise.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=0` pour désactiver la sonde de continuité de même session Claude Sonnet -> Opus par défaut (définissez sur `1` pour l'activer de force lorsque le modèle sélectionné prend en charge une cible de commutation).

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

Recettes Docker pour un seul fournisseur :

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:codex
pnpm test:docker:live-cli-backend:gemini
```

Notes :

- Le runner Docker se trouve à `scripts/test-live-cli-backend-docker.sh`.
- Il exécute le smoke test backend CLI en direct dans l'image Docker du dépôt en tant qu'utilisateur `node` non root.
- Il résout les métadonnées de smoke test CLI à partir de l'extension propriétaire, puis installe le paquet Linux CLI correspondant (`@anthropic-ai/claude-code`, `@openai/codex` ou `@google/gemini-cli`) dans un préfixe inscriptible en cache à `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (par défaut : `~/.cache/openclaw/docker-cli-tools`).
- Le smoke test backend CLI en direct exerce désormais le même flux de bout en bout pour Claude, Codex et Gemini : tour de texte, tour de classification d'image, puis appel d'outil MCP `cron` vérifié via la CLI de la passerelle.
- Le smoke test par défaut de Claude modifie également la session de Sonnet à Opus et vérifie que la session reprise se souvient toujours d'une note précédente.

## Live : Smoke test de liaison ACP (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de liaison de conversation ACP avec un agent ACP en direct :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation synthétique de message-channel en place
  - envoyer une suite normale sur cette même conversation
  - vérifier que la suite atterrit dans la transcription de la session ACP liée
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
  - Cette voie utilise la surface de passerelle `chat.send` avec des champs de route d'origine synthétiques réservés aux administrateurs, afin que les tests puissent attacher un contexte de canal de messages sans prétendre livrer en externe.
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
- Par défaut, il exécute le test de fumée ACP bind contre tous les agents CLI en direct pris en charge en séquence : `claude`, `codex`, puis `gemini`.
- Utilisez `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex` ou `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` pour réduire la matrice.
- Il source `~/.profile`, met en scène le matériel d'authentification CLI correspondant dans le conteneur, installe `acpx` dans un préfixe npm accessible en écriture, puis installe le CLI en direct demandé (`@anthropic-ai/claude-code`, `@openai/codex` ou `@google/gemini-cli`) s'il est manquant.
- À l'intérieur de Docker, le lanceur définit `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` afin qu'acpx garde les variables d'environnement du fournisseur du profil sourcé disponibles pour le CLI de harnais enfant.

### Recettes en direct recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, test de fumée de passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel d'outils sur plusieurs fournisseurs :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise la API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison de l'agent style Cloud Code Assist).
- `google-gemini-cli/...` utilise le CLI Gemini local sur votre machine (authentification distincte + particularités des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle la API Gemini hébergée par Google via HTTP (clé API / auth de profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw fait appel à un binaire `gemini` local ; il possède sa propre authentification et peut se comporter différemment (streaming/support d'outil/décalage de version).

## Live : matrice de modèles (ce que nous couvrons)

Il n'y a pas de « liste de modèles CI » fixe (live est optionnel), mais ce sont les modèles **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de test de fumée moderne (appel d'outil + image)

C'est l'exécution « modèles courants » que nous nous attendons à voir fonctionner :

- OpenAI (non-Codex) : `openai/gpt-5.4` (optionnel : `openai/gpt-5.4-mini`)
- OpenAI Codex : `openai-codex/gpt-5.4`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (Gemini API) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (évitez les anciens modèles Gemini 2.x)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Exécuter le test de fumée de la passerelle avec les outils + l'image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Ligne de base : appel d'outil (Read + Exec optionnel)

Choisissez au moins un par famille de provider :

- OpenAI : `openai/gpt-5.4` (ou `openai/gpt-5.4-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Couverture supplémentaire optionnelle (la bienvenue) :

- xAI : `xai/grok-4` (ou le plus récent disponible)
- Mistral : `mistral/`… (choisissez un modèle capable « d'outils » que vous avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; l'appel d'outil dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un modèle capable d'image dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI capables de vision, etc.) pour tester la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez des clés activées, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (centaines de modèles ; utilisez `openclaw models scan` pour trouver les candidats compatibles avec les outils et les images)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (authentification via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Plus de fournisseurs que vous pouvez inclure dans la matrice live (si vous avez des identifiants/config) :

- Intégrés : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), plus tout proxy compatible avec OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Conseil : n'essayez pas de coder en dur « tous les modèles » dans la documentation. La liste faisant autorité est tout ce que `discoverModels(...)` renvoie sur votre machine + toutes les clés disponibles.

## Identifiants (ne jamais commiter)

Les tests live découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests live devraient trouver les mêmes clés.
- Si un test live indique « no creds », débuguez de la même manière que vous débugueriez `openclaw models list` / la sélection de modèle.

- Profils d'authentification par agent : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (c'est ce que signifie « profile keys » dans les tests live)
- Config : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Répertoire d'état hérité : `~/.openclaw/credentials/` (copié dans le domicile live intermédiaire si présent, mais pas le stockage principal des clés de profil)
- Les exécutions locales en direct copient la configuration active, les fichiers `auth-profiles.json` par agent, `credentials/` hérité et les répertoires d'authentification CLI externes pris en charge dans un répertoire de test temporaire par défaut ; les environnements de test en direct intermédiaires ignorent `workspace/` et `sandboxes/`, et les substitutions de chemin `agents.*.workspace` / `agentDir` sont supprimées afin que les sondes ne touchent pas à votre véritable espace de travail hôte.

Si vous souhaitez vous fier aux clés d'environnement (par exemple, exportées dans votre `~/.profile`), exécutez les tests locaux après `source ~/.profile`, ou utilisez les exécuteurs Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Deepgram en direct (transcription audio)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan en direct

- Test : `src/agents/byteplus.live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Substitution facultative de model : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Flux de travail média ComfyUI en direct

- Test : `extensions/comfy/comfy.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Portée :
  - Teste les chemins d'image, de vidéo et `music_generate` comfy groupés
  - Ignore chaque capacité sauf si `models.providers.comfy.<capability>` est configuré
  - Utile après avoir modifié la soumission, l'interrogation, les téléchargements ou l'enregistrement de plugins du flux de travail comfy

## Génération d'images en direct

- Test : `src/image-generation/runtime.live.test.ts`
- Commande : `pnpm test:live src/image-generation/runtime.live.test.ts`
- Harnais : `pnpm test:live:media image`
- Portée :
  - Énumère chaque plugin de provider de génération d'images enregistré
  - Charge les variables d'environnement provider manquantes depuis votre shell de connexion (`~/.profile`) avant le sondage
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les providers sans authentification/profil/model utilisable
  - Exécute les variantes de génération d'images standard via la capacité d'exécution partagée :
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Providers groupés actuels couverts :
  - `openai`
  - `google`
- Réduction facultative :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportement d'authentification optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les substitutions uniquement par environnement

## Génération de musique en direct

- Test : `extensions/music-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media music`
- Portée :
  - Exerce le chemin partagé groupé du provider de génération de musique
  - Couvre actuellement Google et MiniMax
  - Charge les variables d'environnement du provider depuis votre shell de connexion (`~/.profile`) avant le sondage
  - Utilise par défaut les clés API en direct/environnement avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les informations d'identification réelles du shell
  - Ignore les providers sans authentification/profil/model utilisable
  - Exécute les deux modes d'exécution déclarés lorsque disponibles :
    - `generate` avec une entrée composée uniquement d'une invite
    - `edit` lorsque le provider déclare `capabilities.edit.enabled`
  - Couverture actuelle de la voie partagée :
    - `google` : `generate`, `edit`
    - `minimax` : `generate`
    - `comfy` : fichier en direct Comfy séparé, pas ce balayage partagé
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`
- Comportement d'authentification optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les substitutions uniquement par environnement

## Génération de vidéo en direct

- Test : `extensions/video-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media video`
- Portée :
  - Exerce le chemin partagé groupé du provider de génération de vidéo
  - Charge les variables d'environnement du provider depuis votre shell de connexion (`~/.profile`) avant le sondage
  - Utilise par défaut les clés API en direct/environnement avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les informations d'identification réelles du shell
  - Ignore les providers sans authentification/profil/model utilisable
  - Exécute les deux modes d'exécution déclarés lorsque disponibles :
    - `generate` avec une entrée composée uniquement d'une invite
    - `imageToVideo` lorsque le fournisseur déclare `capabilities.imageToVideo.enabled` et que le fournisseur/modèle sélectionné accepte les entrées d'images locales basées sur des tampons dans le sweep partagé
    - `videoToVideo` lorsque le fournisseur déclare `capabilities.videoToVideo.enabled` et que le fournisseur/modèle sélectionné accepte les entrées de vidéos locales basées sur des tampons dans le sweep partagé
  - Fournisseurs `imageToVideo` actuellement déclarés mais ignorés dans le sweep partagé :
    - `vydra` car le `veo3` fourni est text-only et le `kling` fourni nécessite une URL d'image distante
  - Couverture Vydra spécifique au fournisseur :
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ce fichier exécute `veo3` text-to-video plus une voie `kling` qui utilise par défaut une fixture d'URL d'image distante
  - Couverture `videoToVideo` live actuelle :
    - `runway` uniquement lorsque le modèle sélectionné est `runway/gen4_aleph`
  - Fournisseurs `videoToVideo` actuellement déclarés mais ignorés dans le sweep partagé :
    - `alibaba`, `qwen`, `xai` car ces chemins nécessitent actuellement des URL de référence `http(s)` / MP4 distantes
    - `google` car la voie partagée Gemini/Véo actuelle utilise une entrée locale basée sur des tampons et ce chemin n'est pas accepté dans le sweep partagé
    - `openai` car la voie partagée actuelle ne garantit pas l'accès à la restauration/remix vidéo spécifique à l'organisation
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
- Comportement d'authentification optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les substitutions uniquement basées sur les variables d'environnement

## Harnais live média

- Commande : `pnpm test:live:media`
- Objectif :
  - Exécute les suites live partagées pour les images, la musique et les vidéos via un point d'entrée natif du dépôt
  - Charge automatiquement les variables d'environnement du fournisseur manquantes depuis `~/.profile`
  - Rétrécit automatiquement chaque suite aux fournisseurs qui ont actuellement une authentification utilisable par défaut
  - Réutilise `scripts/test-live.mjs`, de sorte que le comportement de heartbeat et de mode silencieux reste cohérent
- Exemples :
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Docker runners (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker sont divisés en deux catégories :

- Runners de modèles en direct : `test:docker:live-models` et `test:docker:live-gateway` n'exécutent que leur fichier live correspondant à la clé de profil dans l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de configuration local et votre espace de travail (et en sourçant `~/.profile` s'il est monté). Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les runners live Docker utilisent par défaut une limite de smoke plus petite afin qu'un balayage Docker complet reste pratique :
  `test:docker:live-models` est défini par défaut sur `OPENCLAW_LIVE_MAX_MODELS=12`, et
  `test:docker:live-gateway` est défini par défaut sur `OPENCLAW_LIVE_GATEWAY_SMOKE=1`,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Remplacez ces env vars lorsque vous
  souhaitez explicitement le balayage exhaustif plus large.
- `test:docker:all` construit l'image Docker live une fois via `test:docker:live-build`, puis la réutilise pour les deux voies Docker live.
- Runners de smoke de conteneur : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels`, et `test:docker:plugins` démarrent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de niveau supérieur.

Les runners Docker de modèles live montent également en liaison (bind-mount) uniquement les répertoires d'authentification CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin que CLI OAuth puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- Smoke de liaison ACP : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh`)
- Smoke backend CLI : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Gateway + agent de dev : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant d'onboarding (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Réseau Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Pont de Gateway MCP (Gateway amorcé + pont stdio + smoke de trame de notification brute Claude) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (smoke d'installation + alias `/plugin` + sémantique de redémarrage du bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)

Les runners Docker live-model montent également en liaison (bind-mount) la copie locale actuelle en lecture seule et la préparent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest sur votre source/config locale exacte. L'étape de préparation ignore les caches volumineux locaux et les sorties de build de l'application tels que `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et les répertoires de sortie `.build` ou Gradle locaux à l'application, afin que les exécutions live Docker ne passent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` pour que les sondes live du Docker ne démarrent pas de vrais workers de channel Telegram/Discord/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, faites donc passer `OPENCLAW_LIVE_GATEWAY_*` également lorsque vous devez restreindre ou exclure la couverture live du Docker de cette voie OpenClaw. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur OpenAI Docker avec les points de terminaison HTTP compatibles Telegram activés, démarre un conteneur Open WebUI épinglé contre ce Discord, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une vraie demande de discussion via le proxy `/api/chat/completions` d'Open WebUI. La première exécution peut être sensiblement plus lente car iMessage peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie attend une clé de modèle live utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir lors des exécutions Dockerisées. Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un vrai compte Gateway, Gateway ou Gateway. Il démarre un conteneur Gateway ensemencé, démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations acheminées, la lecture de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements live, le routage des envois sortants, et les notifications de channel et d'autorisation de style Claude sur le vrai pont stdio MCP. La vérification des notifications inspecte directement les trames stdio MCP brutes, de sorte que le test de fumée valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à afficher.

Test de fumée de fil en langage clair ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Gardez ce script pour les flux de travail de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils ACP, donc ne le supprimez pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installations CLI mises en cache dans Docker
- Les répertoires/fichiers d'auth externes CLI sous `$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions restreintes de provider ne montent que les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du magasin de profils (pas de l'environnement)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le model exposé par la passerelle pour le test de fumée Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification de nonce utilisée par le test de fumée Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer le tag d'image Open WebUI épinglé

## Documents sanity

Exécutez les vérifications de documentation après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûr pour CI)

Ce sont des régressions de « vrai pipeline » sans vrais fournisseurs :

- Appel d'outil Gateway (mock OpenAI, vraie boucle gateway + agent) : `src/gateway/gateway.test.ts` (cas : "exécute un appel d'outil mock OpenAI de bout en bout via la boucle de l'agent gateway")
- Assistant Gateway (WS `wizard.start`/`wizard.next`, écriture de la config + auth appliquée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant sur ws et écrit la config du jeton d'authentification")

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour la CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Appel d'outil simulé via la vraie boucle gateway + agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de session et les effets de la configuration (`src/gateway/gateway.test.ts`).

Ce qu'il manque encore pour les Skills (voir [Skills](/en/tools/skills)) :

- **Prise de décision :** lorsque les Skills sont répertoriés dans le prompt, l'agent choisit-il la bonne Skill (ou évite-t-il celles qui ne sont pas pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios multi-tours qui affirment l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les futures évaluations doivent d'abord rester déterministes :

- Un exécuteur de scénario utilisant des fournisseurs simulés pour affirmer les appels d'outils + l'ordre, les lectures de fichiers de Skills et le câblage de session.
- Une petite suite de scénarios axés sur les Skills (utilisation vs évitement, filtrage, injection de prompt).
- Évaluations en direct optionnelles (opt-in, limitées par env) uniquement après la mise en place de la suite sûre pour la CI.

## Tests de contrat (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son
contrat d'interface. Ils parcourent tous les plugins découverts et exécutent une suite d'assertions
de forme et de comportement. La ligne d'unité `pnpm test` par défaut ignore
intentionnellement ces fichiers de jointure et de fumée partagés ; exécutez les commandes de contrat explicitement
lorsque vous touchez aux surfaces partagées de channel ou de fournisseur.

### Commandes

- Tous les contrats : `pnpm test:contracts`
- Contrats de channel uniquement : `pnpm test:contracts:channels`
- Contrats de fournisseur uniquement : `pnpm test:contracts:plugins`

### Contrats de channel

Situés dans `src/channels/plugins/contracts/*.contract.test.ts` :

- **plugin** - Forme de base du plugin (id, nom, capacités)
- **setup** - Contrat de l'assistant de configuration
- **session-binding** - Comportement de liaison de session
- **outbound-payload** - Structure de la charge utile du message
- **inbound** - Gestion des messages entrants
- **actions** - Gestionnaires d'actions de channel
- **threading** - Gestion des ID de fil de discussion
- **directory** - API de liste/répertoire (API)
- **group-policy** - Application de la stratégie de groupe

### Contrats de statut de fournisseur

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sonde de statut de channel
- **registry** - Forme du registre de plugins

### Contrats de fournisseur

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection de l'authentification
- **catalog** - API de catalogue de modèles (API)
- **discovery** - Découverte de plugins
- **loader** - Chargement de plugins
- **runtime** - Runtime du fournisseur
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exportations ou les sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de channel ou de fournisseur
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests de contrat s'exécutent dans la CI et ne nécessitent pas de clés API réelles.

## Ajouter des régressions (directives)

Lorsque vous corrigez un problème de fournisseur/modèle découvert en direct :

- Ajoutez une régression sûre pour la CI si possible (fournisseur simulé/bouchon, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement uniquement en direct (limites de débit, stratégies d'authentification), gardez le test en direct ciblé et activé par env vars
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bogue de conversion/relecture de requête fournisseur → test direct des modèles
  - bogue de pipeline session/historique/outil de la passerelle → test de fumée en direct de la passerelle ou test simulé de passerelle sûr pour la CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les id d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille cible SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les id de cible non classés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.
