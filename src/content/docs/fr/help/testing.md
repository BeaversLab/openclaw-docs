---
summary: "Testing kit : suites unitaires/e2e/live, runners Docker, et couverture de chaque test"
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

Lorsque vous touchez aux tests ou souhaitez une confiance supplémentaire :

- Coverage gate : `pnpm test:coverage`
- E2E suite : `pnpm test:e2e`

Lors du débogage de providers/models réels (nécessite de vrais identifiants) :

- Live suite (models + sondes de tool/image de passerelle) : `pnpm test:live`

Astuce : lorsque vous n'avez besoin que d'un seul cas d'échec, préférez restreindre les tests live via les env vars de liste blanche décrits ci-dessous.

## Test suites (ce qui s'exécute où)

Considérez les suites comme un « réalisme croissant » (et une instabilité/coût croissants) :

### Unit / integration (par défaut)

- Commande : `pnpm test`
- Config : `scripts/test-parallel.mjs` (exécute `vitest.unit.config.ts`, `vitest.extensions.config.ts`, `vitest.gateway.config.ts`)
- Fichiers : `src/**/*.test.ts`, `extensions/**/*.test.ts`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en processus (auth de passerelle, routage, tooling, analyse, config)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute dans la CI
  - Aucune vraie clé requise
  - Doit être rapide et stable
- Note du planificateur :
  - `pnpm test` conserve désormais un petit manifeste comportemental archivé pour les véritables remplacements de pool/isolation et un instantané de synchronisation distinct pour les fichiers unitaires les plus lents.
  - La couverture unitaire partagée utilise désormais `threads` par défaut, tandis que le manifeste conserve les exceptions mesurées pour les forks uniquement et les voies de singletons lourdes de manière explicite.
  - La voie d'extension partagée utilise toujours `threads` par défaut ; le wrapper conserve les exceptions explicites pour les forks uniquement dans `test/fixtures/test-parallel.behavior.json` lorsqu'un fichier ne peut pas partager en toute sécurité un worker non isolé.
  - La suite de canal (`vitest.channels.config.ts`) utilise désormais également `threads` par défaut ; l'exécution de contrôle directe de la suite complète du 22 mars 2026 s'est déroulée sans erreur sans exceptions de fork spécifiques au canal.
  - Le wrapper isole les fichiers les plus lourds mesurés dans des voies dédiées au lieu de s'appuyer sur une liste d'exclusion gérée à la main et en croissance constante.
  - Actualisez l'instantané de synchronisation avec `pnpm test:perf:update-timings` après des modifications importantes de la forme de la suite.
- Note concernant le runner intégré :
  - Lorsque vous modifiez les entrées de découverte des outils de message ou le contexte d'exécution de la compactation,
    maintenez les deux niveaux de couverture.
  - Ajoutez des régressions d'assistance ciblées pour les limites de routage/normalisation pures.
  - Maintenez également les suites d'intégration du runner intégré en bon état :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les identifiants délimités et le comportement de compactage traversent toujours
    les chemins réels `run.ts` / `compact.ts` ; les tests d'assistance uniquement ne constituent pas un
    substitut suffisant à ces chemins d'intégration.
- Note concernant le pool :
  - La configuration de base de Vitest utilise toujours `forks` par défaut.
  - Les voies du wrapper d'unité utilisent `threads` par défaut, avec des exceptions de fork uniquement explicites dans le manifeste.
  - La configuration délimitée d'extension utilise `threads` par défaut.
  - La configuration délimitée de canal utilise `threads` par défaut.
  - Les configurations d'unité, de canal et d'extension utilisent `isolate: false` par défaut pour un démarrage de fichier plus rapide.
  - `pnpm test` transmet également `--isolate=false` au niveau du wrapper.
  - Optez à nouveau pour l'isolation de fichiers Vitest avec `OPENCLAW_TEST_ISOLATE=1 pnpm test`.
  - `OPENCLAW_TEST_NO_ISOLATE=0` ou `OPENCLAW_TEST_NO_ISOLATE=false` forcent également les exécutions isolées.
- Note concernant l'itération locale rapide :
  - `pnpm test:changed` exécute le wrapper avec `--changed origin/main`.
  - La configuration de base de Vitest marque les fichiers manifests/config des wrappers comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque les entrées du planificateur changent.
  - Le cache de module de système de fichiers de Vitest est désormais activé par défaut pour les réexécutions de tests côté Node.
  - Désactivez-le avec `OPENCLAW_VITEST_FS_MODULE_CACHE=0` ou `OPENCLAW_VITEST_FS_MODULE_CACHE=false` si vous soupçonnez un comportement obsolète du cache de transformation.
- Note de débogage des performances :
  - `pnpm test:perf:imports` active le rapport de durée d'importation Vitest ainsi que la sortie de répartition des importations.
  - `pnpm test:perf:imports:changed` délimite la même vue de profilage aux fichiers modifiés depuis `origin/main`.
  - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour le démarrage et la surcharge de transformation de Vitest/Vite.
  - `pnpm test:perf:profile:runner` écrit les profils CPU+tas du lanceur pour la suite unitaire avec le parallélisme de fichiers désactivé.

### E2E (smoke de passerelle)

- Commande : `pnpm test:e2e`
- Configuration : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `forks` pour un isolation déterministe entre fichiers.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie verbeuse de la console.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appairage de nœuds et réseau plus important
- Attentes :
  - S'exécute dans la CI (lorsqu'elle est activée dans le pipeline)
  - Aucune clé réelle requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : smoke du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `test/openshell-sandbox.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw sur des `sandbox ssh-config` réels + exécution SSH
  - Vérifie le comportement du système de fichiers canonique distant via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un CLI `openshell` local ainsi qu'un démon Docker fonctionnel
  - Utilise `HOME` / `XDG_CONFIG_HOME` isolé, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (providers réels + modèles réels)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Scope :
  - « Est-ce que ce provider/modèle fonctionne réellement _aujourd'hui_ avec de vraies identifiants ? »
  - Détecter les changements de format de provider, les singularités d'appel d'outil, les problèmes d'auth et le comportement des limites de taux
- Attentes :
  - Pas stable dans CI par conception (réseaux réels, politiques de provider réelles, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Préférer l'exécution de sous-ensembles réduits plutôt que « tout »
  - Les exécutions Live sourceront `~/.profile` pour récupérer les clés API manquantes
- Rotation des clés API (spécifique au provider) : définir `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une substitution per-live via `OPENCLAW_LIVE_*_KEY` ; les tests réessaient en cas de réponse de limite de taux.
- Sortie de progression/battement de cœur :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels providers longs soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de console Vitest afin que les lignes de progression provider/gateway diffusent immédiatement lors des exécutions live.
  - Régler les battements de cœur direct-modèle avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Régler les battements de cœur gateway/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécuter `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Modification du réseau de passerelle / protocole WS / appariement : ajouter `pnpm test:e2e`
- Débogage de « mon bot est en panne » / échecs spécifiques au provider / appel d'outil : exécuter un `pnpm test:live` réduit

## Live: Android node capability sweep

- Test: `src/gateway/android-node.capabilities.live.test.ts`
- Script: `pnpm android:test:integration`
- Goal: invoke **every command currently advertised** by a connected Android node and assert command contract behavior.
- Scope:
  - Preconditioned/manual setup (the suite does not install/run/pair the app).
  - Command-by-command gateway `node.invoke` validation for the selected Android node.
- Required pre-setup:
  - Android app already connected + paired to the gateway.
  - App kept in foreground.
  - Permissions/capture consent granted for capabilities you expect to pass.
- Optional target overrides:
  - `OPENCLAW_ANDROID_NODE_ID` or `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Full Android setup details: [Android App](/fr/platforms/android)

## Live: model smoke (profile keys)

Live tests are split into two layers so we can isolate failures:

- “Direct model” tells us the provider/model can answer at all with the given key.
- “Gateway smoke” tells us the full gateway+agent pipeline works for that model (sessions, history, tools, sandbox policy, etc.).

### Layer 1: Direct model completion (no gateway)

- Test: `src/agents/models.profiles.live.test.ts`
- Goal:
  - Enumerate discovered models
  - Use `getApiKeyForModel` to select models you have creds for
  - Run a small completion per model (and targeted regressions where needed)
- How to enable:
  - `pnpm test:live` (or `OPENCLAW_LIVE_TEST=1` if invoking Vitest directly)
- Set `OPENCLAW_LIVE_MODELS=modern` (or `all`, alias for modern) to actually run this suite; otherwise it skips to keep `pnpm test:live` focused on gateway smoke
- How to select models:
  - `OPENCLAW_LIVE_MODELS=modern` to run the modern allowlist (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` is an alias for the modern allowlist
  - or `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (comma allowlist)
- How to select providers:
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (comma allowlist)
- Where keys come from:
  - By default: profile store and env fallbacks
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour appliquer uniquement le **profile store**
- Pourquoi cela existe :
  - Sépare « l'API du provider est cassée / la clé est invalide » de « le pipeline de l'agent du gateway est cassé »
  - Contient de petites régressions isolées (exemple : rejeu du raisonnement OpenAI Responses/Codex Responses + flux d'appels d'outils)

### Couche 2 : Gateway + smoke de l'agent dev (ce que fait réellement « @openclaw »)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer un gateway en cours de processus
  - Créer/patcher une session `agent:dev:*` (remplacement de model par exécution)
  - Itérer les modèles avec clés et vérifier :
    - réponse « significative » (pas d'outils)
    - une invocation d'outil réel fonctionne (sonde de lecture)
    - sondes d'outils supplémentaires facultatives (sonde exec+lecture)
    - les chemins de régression OpenAI (tool-call-only → follow-up) continuent de fonctionner
- Détails des sondes (afin de pouvoir expliquer rapidement les échecs) :
  - sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - sonde `exec+read` : le test demande à l'agent d'`exec`-écrire un nonce dans un fichier temporaire, puis de le `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le modèle renvoie `cat <CODE>`.
  - Référence de l'implémentation : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou liste séparée par des virgules) pour restreindre
- Comment sélectionner les providers (éviter « OpenRouter tout ») :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondes d'outil + d'image sont toujours activées dans ce test en direct :
  - sonde `read` + sonde `exec+read` (stress de l'outil)
  - la sonde d'image s'exécute lorsque le modèle annonce la prise en charge des entrées d'image
  - Flux (haut niveau) :
    - Le test génère un minuscule PNG avec « CAT » + code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Le Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Conseil : pour voir ce que vous pouvez tester sur votre machine (et les ids `provider/model` exacts), exécutez :

```bash
openclaw models list
openclaw models list --json
```

## Live : test de fumée du jeton de configuration Anthropic

- Test : `src/agents/anthropic.setup-token.live.test.ts`
- Objectif : vérifier que le jeton de configuration de la CLI Claude Code (ou un profil de jeton de configuration collé) peut compléter une invite Anthropic.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Sources de jeton (choisissez-en une) :
  - Profil : `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Jeton brut : `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- Remplacement de modèle (facultatif) :
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

Exemple de configuration :

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live : test de fumée du backend CLI (Claude Code CLI ou autres CLI locaux)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline Gateway + agent en utilisant un backend CLI local, sans toucher à votre configuration par défaut.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valeurs par défaut :
  - Modèle : `claude-cli/claude-sonnet-4-6`
  - Commande : `claude`
  - Args : `["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- Remplacements (facultatifs) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une pièce jointe image réelle (les chemins sont injectés dans l'invite).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins de fichiers image en tant qu'args CLI au lieu de l'injection d'invite.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la façon dont les arguments d'image sont passés lorsque `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un deuxième tour et valider le flux de reprise.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` pour garder la configuration MCP de Claude Code CLI activée (par défaut, la configuration MCP est désactivée avec un fichier vide temporaire).

Exemple :

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### Recettes live recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, test de fumée de la passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel d'outil sur plusieurs fournisseurs :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Remarques :

- `google/...` utilise l'API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison d'agent de type Cloud Code Assist).
- `google-gemini-cli/...` utilise le CLI Gemini local sur votre machine (authentification distincte + bizarreries des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle l'API Gemini hébergée par Google via HTTP (clé API / authentification par profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw appelle un binaire `gemini` local ; il possède sa propre authentification et peut se comporter différemment (flux de données/support des outils/décalage de version).

## Live : matrice des modèles (ce que nous couvrons)

Il n'y a pas de « liste de modèles CI » fixe (live est optionnel), mais ce sont les modèles **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de test de fumée moderne (appel d'outil + image)

C'est l'exécution de « modèles courants » que nous nous attendons à voir fonctionner :

- OpenAI (non-Codex) : `openai/gpt-5.2` (optionnel : `openai/gpt-5.1`)
- Codex OpenAI : `openai-codex/gpt-5.4`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (API Gemini) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (évitez les anciens modèles Gemini 2.x)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Exécuter le test de fumée de la passerelle avec les outils + l'image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Ligne de base : appel d'outil (Read + Exec optionnel)

Choisissez au moins un par famille de fournisseurs :

- OpenAI : `openai/gpt-5.2` (ou `openai/gpt-5-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Couverture supplémentaire optionnelle (à avoir si possible) :

- xAI : `xai/grok-4` (ou la dernière disponible)
- Mistral : `mistral/`… (choisissez un model « tools » compatible que vous avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; le tool calling dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un model compatible avec les images dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes Claude/Gemini/OpenAI compatibles Vision, etc.) pour tester la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez des clés activées, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (des centaines de models ; utilisez `openclaw models scan` pour trouver les candidats compatibles tool+image)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Plus de fournisseurs que vous pouvez inclure dans la matrice live (si vous avez des identifiants/config) :

- Intégrés : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Astuce : n'essayez pas de coder en dur « tous les models » dans la documentation. La liste faisant autorité est tout ce que `discoverModels(...)` renvoie sur votre machine + toutes les clés disponibles.

## Identifiants (ne jamais commiter)

Les tests live découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests live devraient trouver les mêmes clés.
- Si un test live indique « no creds », débuguez de la même manière que vous débugueriez `openclaw models list` / la sélection de model.

- Stockage de profil : `~/.openclaw/credentials/` (préféré ; ce que signifie « clés de profil » dans les tests)
- Configuration : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)

Si vous souhaitez vous fier aux clés d'environnement (par exemple exportées dans votre `~/.profile`), exécutez les tests locaux après `source ~/.profile`, ou utilisez les runners Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Live Deepgram (transcription audio)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Live du plan de codage BytePlus

- Test : `src/agents/byteplus.live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Remplacement facultatif de model : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Live de génération d'images

- Test : `src/image-generation/runtime.live.test.ts`
- Commande : `pnpm test:live src/image-generation/runtime.live.test.ts`
- Portée :
  - Énumère chaque greffon de provider de génération d'images enregistré
  - Charge les variables d'environnement de provider manquantes depuis votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les identifiants réels du shell
  - Ignore les providers sans authentification/profil/model utilisable
  - Exécute les variantes de génération d'images standard via la capacité d'exécution partagée :
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Providers groupés actuels couverts :
  - `openai`
  - `google`
- Réduction facultative :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification par stockage de profil et ignorer les remplacements basés uniquement sur l'environnement

## Docker runners (vérifications optionnelles "fonctionne sous Linux")

Ces runners Docker sont répartis en deux catégories :

- Live-model runners : `test:docker:live-models` et `test:docker:live-gateway` exécutent `pnpm test:live` à l'intérieur de l'image Docker du dépôt, en montant votre répertoire de configuration local et votre espace de travail (et en sourçant `~/.profile` si monté).
- Container smoke runners : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network` et `test:docker:plugins` démarrent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de niveau supérieur.

Les runners Docker live-model bind-mount également uniquement les répertoires d'authentification CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution, afin que l'OAuth CLI externe puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Direct models : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- Gateway + dev agent : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Gateway networking (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Plugins (install smoke + alias `/plugin` + sémantique de redémarrage Claude-bundle) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)

Les exécuteurs Docker de modèle en direct (live-model) montent également la copie de travail actuelle en lecture seule et la placent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest sur votre source/config locale exacte. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` afin que les sondes en direct de la passerelle ne démarrant pas de véritables workers de canal Docker/Telegram/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, faites donc passer également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture en direct de la passerelle de cette voie Discord. `test:docker:openwebui` est un test de compatibilité de plus haut niveau : il démarre un conteneur de passerelle Docker avec les points de terminaison HTTP compatibles OpenClaw activés, démarre un conteneur Open WebUI épinglé contre cette passerelle, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une véritable requête de chat via le proxy `/api/chat/completions` d'Open WebUI. La première exécution peut être sensiblement plus lente car OpenAI peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie attend une clé de modèle en direct utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir lors des exécutions Dockerisées. Les exécutions réussies affichent une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`.

Test de fumée de fil en langage clair ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les workflows de régression/débogage. Il peut être à nouveau nécessaire pour la validation du routage des fils ACP, ne le supprimez donc pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (par défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- Les répertoires d'authentification CLI externes sous `$HOME` sont montés en lecture seule sous `/host-auth/...`, puis copiés dans `/home/node/...` avant le début des tests
  - Par défaut : monter tous les répertoires pris en charge (`.codex`, `.claude`, `.qwen`, `.minimax`)
  - Les exécutions restreintes de provider ne montent que les répertoires nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du magasin de profils (pas de l'environnement)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le modèle exposé par la passerie pour le test de fumée Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification du nonce utilisée par le test de fumée d'Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer la balise d'image épinglée d'Open WebUI

## Sanité de la documentation

Exécuter les vérifications de documentation après les modifications : `pnpm docs:list`.

## Régression hors ligne (sûr pour CI)

Il s'agit de régressions de « pipeline réel » sans fournisseurs réels :

- Appel d'outil Gateway (simulé Gateway, boucle d'agent et passerelle réelles) : `src/gateway/gateway.test.ts` (cas : "exécute un appel d'outil simulé OpenAI de bout en bout via la boucle d'agent de la passerelle")
- Assistant Gateway (WS `wizard.start`/`wizard.next`, écrit la config + auth appliquée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant via ws et écrit la configuration du jeton d'auth")

## Évaluations de fiabilité de l'agent (compétences)

Nous avons déjà quelques tests sûrs pour CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Simuler les appels d'outils via la véritable passerelle et boucle d'agent (`src/gateway/gateway.test.ts`).
- Flux de l'assistant de bout en bout qui valident le câblage de session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les compétences (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les compétences sont répertoriées dans le prompt, l'agent choisit-il la bonne compétence (ou évite-t-il celles qui ne sont pas pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios multi-tours qui vérifient l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les évaluations futures doivent d'abord rester déterministes :

- Un lanceur de scénarios utilisant des fournisseurs simulés pour vérifier les appels d'outils et leur ordre, les lectures de fichiers de compétences et le câblage de session.
- Une petite suite de scénarios axés sur les compétences (utilisation vs évitement, blocage, injection de prompt).
- Évaluations en direct optionnelles (adhésion, limitées par l'environnement) uniquement après la mise en place de la suite sécurisée pour l'CI.

## Tests de contrat (structure de plugin et de channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son
contrat d'interface. Ils itèrent sur tous les plugins découverts et exécutent une suite d'assertions
sur la structure et le comportement.

### Commandes

- Tous les contrats : `pnpm test:contracts`
- Contrats de channel uniquement : `pnpm test:contracts:channels`
- Contrats de fournisseur uniquement : `pnpm test:contracts:plugins`

### Contrats de channel

Situés dans `src/channels/plugins/contracts/*.contract.test.ts` :

- **plugin** - Structure de base du plugin (id, nom, capacités)
- **setup** - Contrat de l'assistant de configuration
- **session-binding** - Comportement de liaison de session
- **outbound-payload** - Structure de la charge utile du message
- **inbound** - Gestion des messages entrants
- **actions** - Gestionnaires d'actions de channel
- **threading** - Gestion de l'ID de fil de discussion
- **directory** - API de répertoire/liste
- **group-policy** - Application de la stratégie de groupe
- **status** - Sonde de statut de la chaîne
- **registry** - Structure du registre de plugins

### Contrats de fournisseur

Situé dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection de l'authentification
- **catalog** - API de catalogue de modèles
- **discovery** - Découverte de plugins
- **loader** - Chargement de plugins
- **runtime** - Runtime du fournisseur
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exportations ou les sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de chaîne ou de fournisseur
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests de contrat s'exécutent dans CI et ne nécessitent pas de véritables clés API.

## Ajouter des régressions (recommandations)

Lorsque vous corrigez un problème de fournisseur/modèle découvert en direct :

- Ajoutez une régression compatible CI si possible (provider simulé/bouchonné, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement uniquement en direct (limites de débit, stratégies d'authentification), gardez le test en direct étroit et optionnel via env vars
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bogue de conversion/relecture de requête provider → test direct des modèles
  - bogue de pipeline de session/historique/tool de passerelle → test de fumée en direct de passerelle ou test simulé de passerelle sûr pour la CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les id d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles `includeInPlan` SecretRef dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les id de cibles non classifiées afin que les nouvelles classes ne puissent pas être ignorées silencieusement.
