---
summary: "Kit de tests : suites unit/e2e/live, runners Docker et ce que chaque test couvre"
read_when:
  - Exécution de tests localement ou en CI
  - Ajout de régressions pour les bugs de model/provider
  - Débogage du comportement de la passerelle et de l'agent
title: "Testing"
---

# Tests

OpenClaw possède trois suites Vitest (unit/integration, e2e, live) et un petit ensemble de runners Docker.

Ce document est un guide « comment nous testons » :

- Ce que chaque suite couvre (et ce qu'elle ne couvre _pas_ délibérément)
- Quelles commandes exécuter pour les workflows courants (local, pre-push, débogage)
- Comment les tests live découvrent les identifiants et sélectionnent les models/providers
- Comment ajouter des régressions pour les problèmes réels de model/provider

## Quick start

La plupart des jours :

- Passerelle complète (attendue avant le push) : `pnpm build && pnpm check && pnpm test`

Lorsque vous touchez aux tests ou voulez une confiance supplémentaire :

- Passerelle de couverture : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de providers/models réels (nécessite de vrais identifiants) :

- Suite Live (models + sondes de tool/image de passerelle) : `pnpm test:live`

Conseil : lorsque vous n'avez besoin que d'un seul cas d'échec, préférez réduire les tests live via les env vars de la liste autorisée décrits ci-dessous.

## Suites de tests (ce qui s'exécute où)

Pensez aux suites comme à un « réalisme croissant » (et instabilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Config : `scripts/test-parallel.mjs` (exécute `vitest.unit.config.ts`, `vitest.extensions.config.ts`, `vitest.gateway.config.ts`)
- Fichiers : `src/**/*.test.ts`, `extensions/**/*.test.ts`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration in-process (auth de passerelle, routage, tooling, analyse, config)
  - Régressions déterministes pour les bugs connus
- Attentes :
  - S'exécute en CI
  - Aucune vraie clé requise
  - Doit être rapide et stable
- Note sur le runner intégré :
  - Lorsque vous modifiez les entrées de découverte d'outils de message ou le contexte d'exécution de compactage,
    gardez les deux niveaux de couverture.
  - Ajoutez des régressions d'assistance ciblées pour les limites de routage/normalisation pures.
  - Gardez également les suites d'intégration de runner intégré en bonne santé :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les identifiants délimités et le comportement de compactage traversent toujours les chemins réels `run.ts` / `compact.ts` ; les tests basés uniquement sur les helpers ne constituent pas un substitut suffisant à ces chemins d'intégration.
- Note sur le pool :
  - OpenClaw utilise Vitest `vmForks` sur Node 22, 23 et 24 pour des partitions unitaires plus rapides.
  - Sur Node 25+, OpenClaw revient automatiquement au `forks` régulier jusqu'à ce que le dépôt y soit revalidé.
  - Remplacer manuellement avec `OPENCLAW_TEST_VM_FORKS=0` (forcer `forks`) ou `OPENCLAW_TEST_VM_FORKS=1` (forcer `vmForks`).

### E2E (fumée de passerelle)

- Commande : `pnpm test:e2e`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `vmForks` pour un démarrage de fichier plus rapide.
  - Utilise des workers adaptatifs (CI : 2-4, local : 4-8).
  - S'exécute en mode silencieux par défaut pour réduire la charge des E/S de la console.
- Remplacements utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie verbeuse de la console.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appairage de nœuds et réseau plus intensif
- Attentes :
  - S'exécute dans CI (lorsqu'elle est activée dans le pipeline)
  - Aucune clé réelle requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : fumée du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `test/openshell-sandbox.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw sur un vrai `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un CLI CLI `openshell` ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Remplacements utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (fournisseurs réels + modèles réels)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - « Est-ce que ce fournisseur/modèle fonctionne réellement _aujourd'hui_ avec de vraies informations d'identification ? »
  - Détecter les changements de format de fournisseur, les bizarreries d'appel d'outil, les problèmes d'authentification et le comportement des limites de taux
- Attentes :
  - Non stable pour l'intégration continue par conception (réseaux réels, politiques réelles des fournisseurs, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Préférez l'exécution de sous-ensembles réduits plutôt que de « tout »
  - Les exécutions Live vont sourcer `~/.profile` pour récupérer les clés API manquantes
- Rotation des clés API (spécifique au fournisseur) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une override par Live via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponse de limite de taux.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup changé)
- Modification du réseau passerelle / protocole WS / appairage : ajoutez `pnpm test:e2e`
- Débogage de « mon bot est en panne » / échecs spécifiques au fournisseur / appel d'outil : exécutez un `pnpm test:live` réduit

## Live : balayage des capacités du nœud Android

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **toutes les commandes actuellement annoncées** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préalable/manuelle (la suite n'installe pas/exécute/n'appaire pas l'application).
  - Validation de la passerelle `node.invoke` commande par commande pour le nœud Android sélectionné.
- Configuration préalable requise :
  - Application Android déjà connectée + appairée à la passerelle.
  - Application maintenue au premier plan.
  - Autorisations/consentement de capture accordés pour les capacités que vous vous attendez à réussir.
- Remplacements cibles facultatifs :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Application Android](/fr/platforms/android)

## Live : test de fumée du modèle (clés de profil)

Les tests en direct sont divisés en deux couches afin que nous puissions isoler les pannes :

- « Modèle direct » nous indique si le provider/modèle peut répondre du tout avec la clé donnée.
- « Test de fumée Gateway » nous indique que le pipeline complet passerelle+agent fonctionne pour ce modèle (sessions, historique, outils, stratégie de bac à sable, etc.).

### Couche 1 : Achèvement direct du modèle (sans passerelle)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les modèles découverts
  - Utilisez `getApiKeyForModel` pour sélectionner les modèles pour lesquels vous avez des identifiants
  - Exécuter un petit achèvement par modèle (et des régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour moderne) pour exécuter réellement cette suite ; sinon elle est ignorée pour garder `pnpm test:live` concentré sur le test de fumée de la passerelle
- Comment sélectionner les modèles :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (liste d'autorisation séparée par des virgules)
- Comment sélectionner les providers :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation séparée par des virgules)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis d'environnement
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour appliquer uniquement le **magasin de profils**
- Pourquoi cela existe :
  - Sépare « l'API du provider est cassée / la clé n'est pas valide » de « le pipeline de l'agent de la passerelle est cassé »
  - Contient de petites régressions isolées (exemple : réexécution du raisonnement des réponses OpenAI / réponses Codex + flux d'appels d'outils)

### Couche 2 : Gateway + test de fumée de l'agent de développement (ce que fait réellement « @openclaw »)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une passerelle en cours de processus
  - Créer/modifier une session `agent:dev:*` (remplacement de modèle par exécution)
  - Parcourir les modèles avec clés et affirmer :
    - réponse « significative » (pas d'outils)
    - un appel de tool réel fonctionne (sonde de lecture)
    - sondes de tool supplémentaires facultatives (sonde exec+lecture)
    - les chemins de régression OpenAI (tool-call-only → follow-up) continuent de fonctionner
- Détails des sondes (pour que vous puissiez expliquer rapidement les échecs) :
  - sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - sonde `exec+read` : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le model renvoie `cat <CODE>`.
  - Référence de l'implémentation : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Comment sélectionner les models :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou une liste séparée par des virgules) pour restreindre
- Comment sélectionner les fournisseurs (évitez « OpenRouter tout ») :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondes de tool + image sont toujours activées dans ce test en direct :
  - sonde `read` + sonde `exec+read` (stress de tool)
  - la sonde d'image s'exécute lorsque le model annonce la prise en charge de l'entrée d'image
  - Flux (haut niveau) :
    - Le test génère un petit PNG avec « CAT » + code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Le Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au model
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Conseil : pour voir ce que vous pouvez tester sur votre machine (et les ids `provider/model` exacts), exécutez :

```bash
openclaw models list
openclaw models list --json
```

## En direct : test de fumée du jeton de configuration Anthropic

- Test : `src/agents/anthropic.setup-token.live.test.ts`
- Objectif : vérifier que le jeton de configuration CLI de Claude Code (ou un profil de jeton de configuration collé) peut compléter une invite Anthropic.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Sources de jetons (choisir une option) :
  - Profil : `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Jeton brut : `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- Remplacement de modèle (facultatif) :
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

Exemple de configuration :

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live : smoke test du backend CLI (CLI Claude Code ou autres CLI locales)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline du Gateway et de l'agent en utilisant un backend CLI local, sans toucher à votre configuration par défaut.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valeurs par défaut :
  - Modèle : `claude-cli/claude-sonnet-4-6`
  - Commande : `claude`
  - Args : `["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- Remplacements (facultatif) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une vraie pièce jointe d'image (les chemins sont injectés dans le prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins des fichiers d'image comme arguments CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la façon dont les arguments d'image sont passés quand `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un deuxième tour et valider le flux de reprise.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` pour garder la configuration MCP de la CLI Claude Code activée (désactive par défaut la configuration MCP avec un fichier vide temporaire).

Exemple :

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### Recettes live recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins fragiles :

- Modèle unique, direct (sans gateway) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, smoke test de la gateway :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel d'outil sur plusieurs fournisseurs :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise la API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison de l'agent de style Cloud Code Assist).
- `google-gemini-cli/...` utilise le CLI Gemini local sur votre machine (authentification séparée + particularités des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle le API Gemini hébergé par Google via HTTP (clé API / authentification par profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw exécute un binaire `gemini` local ; il possède sa propre authentification et peut se comporter différemment (streaming/support des outils/décalage de version).

## Live : matrice des models (ce que nous couvrons)

Il n'y a pas de « liste de models CI » fixe (live est optionnel), mais ce sont les models **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de smoke moderne (appel d'outil + image)

Il s'agit de la série de « models courants » que nous nous attendons à voir fonctionner :

- OpenAI (non-Codex) : `openai/gpt-5.2` (optionnel : `openai/gpt-5.1`)
- OpenAI Codex : `openai-codex/gpt-5.4`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-5`)
- Google (API Gemini) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (éviter les models Gemini 2.x plus anciens)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/minimax-m2.5`

Exécuter le smoke de la passerelle avec les outils + l'image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Référence : appel d'outil (Read + Exec optionnel)

Choisissez au moins un par famille de provider :

- OpenAI : `openai/gpt-5.2` (ou `openai/gpt-5-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-5`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/minimax-m2.5`

Couverture supplémentaire optionnelle (la bienvenue) :

- xAI : `xai/grok-4` (ou la plus récente disponible)
- Mistral : `mistral/`… (choisissez un model capable « d'outils » que vous avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; l'appel d'outil dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un modèle compatible avec les images dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI compatibles avec la vision, etc.) pour exercer la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez activé les clés, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (des centaines de modèles ; utilisez `openclaw models scan` pour trouver les candidats compatibles avec les outils et les images)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

Davantage de fournisseurs que vous pouvez inclure dans la matrice live (si vous avez des identifiants/config) :

- Intégré : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible avec OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Conseil : n'essayez pas de coder en dur « tous les modèles » dans la documentation. La liste faisant autorité est tout ce que `discoverModels(...)` renvoie sur votre machine + toutes les clés disponibles.

## Identifiants (ne jamais commiter)

Les tests live découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests live devraient trouver les mêmes clés.
- Si un test live indique « no creds », débuguez de la même manière que vous débugueriez `openclaw models list` / la sélection de modèle.

- Stockage de profil : `~/.openclaw/credentials/` (préféré ; ce que signifie « clés de profil » dans les tests)
- Configuration : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)

Si vous souhaitez vous fier aux clés d'environnement (par exemple, exportées dans votre `~/.profile`), exécutez des tests locaux après `source ~/.profile`, ou utilisez les lanceurs Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Deepgram live (transcription audio)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- Test : `src/agents/byteplus.live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Remplacement de model facultatif : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Image generation live

- Test : `src/image-generation/runtime.live.test.ts`
- Commande : `pnpm test:live src/image-generation/runtime.live.test.ts`
- Portée :
  - Énumère chaque plugin de provider de génération d'images enregistré
  - Charge les variables d'environnement de provider manquantes depuis votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables informations d'identification du shell
  - Ignore les providers sans auth/profil/model utilisable
  - Exécute les variantes de génération d'images standard via la capacité d'exécution partagée :
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Providers groupés actuellement couverts :
  - `openai`
  - `google`
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification par le stockage de profils et ignorer les remplacements basés uniquement sur les variables d'environnement

## Lanceurs Docker (vérifications facultatives "fonctionne sous Linux")

Ceux-ci exécutent `pnpm test:live` à l'intérieur de l'image Docker du dépôt, en montant votre répertoire de configuration local et votre espace de travail (et en sourçant `~/.profile` si monté). Ils montent également par liaison les répertoires d'authentification de la CLI comme `~/.codex`, `~/.claude`, `~/.qwen` et `~/.minimax` lorsqu'ils sont présents, puis les copient dans le répertoire personnel du conteneur avant l'exécution, afin que l'CLI OAuth puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- Gateway + agent de développement : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Assistant Onboarding (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Réseau Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Plugins (chargement d'extension personnalisé + smoke de registre) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)

Les runners Docker de modèle live montent également la copie de travail actuelle en lecture seule et la mettent en scène dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest sur votre source/config locale exacte. `test:docker:live-models` exécute toujours `pnpm test:live`, donc passez également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture live du Gateway de cette voie Docker.

Smoke manuel de thread en langage clair ACP (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les workflows de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des threads ACP, donc ne le supprimez pas.

Variables d'env utiles :

- `OPENCLAW_CONFIG_DIR=...` (défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- Les répertoires d'auth CLI externes sous `$HOME` (`.codex`, `.claude`, `.qwen`, `.minimax`) sont montés en lecture seule sous `/host-auth/...`, puis copiés dans `/home/node/...` avant le début des tests
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les fournisseurs dans le conteneur
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les informations d'identification proviennent du magasin de profils (pas de l'env)

## Sanité de la documentation

Exécutez les vérifications de documentation après les modifications : `pnpm docs:list`.

## Régression hors ligne (sûr pour CI)

Il s'agit de régressions de « pipeline réel » sans véritables providers :

- Appel d'outil Gateway (mock Gateway, vraie gateway + boucle d'agent) : `src/gateway/gateway.test.ts` (cas : "exécute un appel d'outil mock OpenAI de bout en bout via la boucle d'agent de la gateway")
- Assistant Gateway (WS `wizard.start`/`wizard.next`, écrit la config + auth appliquée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant via ws et écrit la config du jeton d'auth")

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour la CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Appel d'outil simulé via la vraie gateway + boucle d'agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les Skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les Skills sont répertoriés dans le prompt, l'agent choisit-il la bonne Skill (ou évite-t-il celles qui ne sont pas pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios à plusieurs tours qui affirment l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les futures évaluations doivent d'abord rester déterministes :

- Un exécuteur de scénario utilisant des providers simulés pour affirmer les appels d'outils + l'ordre, les lectures de fichiers de Skills et le câblage de session.
- Une petite suite de scénarios axés sur les Skills (utilisation vs évitement, gating, injection de prompt).
- Évaluations en direct facultatives (opt-in, limitées par l'environnement) uniquement après la mise en place de la suite sûre pour la CI.

## Ajout de régressions (guidance)

Lorsque vous corrigez un problème de provider/model découvert en direct :

- Ajoutez une régression sûre pour la CI si possible (provider simulé/bouchon, ou capturez la transformation exacte de la forme de la requête)
- S'il est intrinsèquement uniquement en direct (limites de débit, stratégies d'auth), gardez le test en direct étroit et opt-in via les env vars
- Préférez cibler la plus petite couche qui détecte le bogue :
  - bogue de conversion/relecture de requête provider → test direct des models
  - bogue de pipeline session/historique/outil de la gateway → test de fumée en direct de la gateway ou test simulé de la gateway sûr pour la CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis vérifie que les ID d'exécution de segments de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement pour les ID de cibles non classés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.

import fr from "/components/footer/fr.mdx";

<fr />
