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
- Note sur le pool :
  - OpenClaw utilise Vitest `vmForks` sur Node 22, 23 et 24 pour des shards unitaires plus rapides.
  - Sur Node 25+, OpenClaw revient automatiquement au `forks` régulier jusqu'à ce que le dépôt y soit re-validé.
  - Remplacer manuellement avec `OPENCLAW_TEST_VM_FORKS=0` (forcer `forks`) ou `OPENCLAW_TEST_VM_FORKS=1` (forcer `vmForks`).

### E2E (gateway smoke)

- Commande : `pnpm test:e2e`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `vmForks` pour un démarrage de fichier plus rapide.
  - Utilise des workers adaptatifs (CI : 2-4, local : 4-8).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Remplacements utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (limité à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console détaillée.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appairage de nœuds et réseau plus important
- Attentes :
  - S'exécute dans la CI (lorsqu'elle est activée dans le pipeline)
  - Aucune clé réelle requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : test de fumée du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `test/openshell-sandbox.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw via un vrai `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un CLI `openshell` local ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script wrapper

### Live (vrais providers + vrais models)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - « Ce provider/model fonctionne-t-il réellement _aujourd'hui_ avec de vrais identifiants ? »
  - Détecter les changements de format de provider, les bizarreries d'appel d'outils, les problèmes d'authentification et le comportement des limites de taux
- Attentes :
  - Non stable pour l'CI par conception (vrais réseaux, vraies politiques de provider, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Préférer l'exécution de sous-ensembles réduits plutôt que « tout »
  - Les exécutions Live vont sourcer `~/.profile` pour récupérer les clés API manquantes
- Rotation de la clé API (spécifique au fournisseur) : définissez `*_API_KEYS` avec le format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une remplacement par test via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponses de limitation de débit.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez modifié beaucoup de choses)
- Modification du réseau Gateway / protocole WS / appairage : ajoutez `pnpm test:e2e`
- Débogage de "mon bot est en panne" / échecs spécifiques au fournisseur / appel d'outils : exécutez un `pnpm test:live` ciblé

## Live : sweep des capacités du nœud Android

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **toutes les commandes actuellement annoncées** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préalable/manuelle (la suite n'installe pas n'exécute pas n'appaire pas l'application).
  - Validation de la `node.invoke` du Gateway commande par commande pour le nœud Android sélectionné.
- Configuration préalable requise :
  - Application Android déjà connectée + appariée au Gateway.
  - Application gardée au premier plan.
  - Autorisations/consentement de capture accordés pour les capacités que vous attendez réussir.
- Remplacements de cibles facultatifs :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Application Android](/fr/platforms/android)

## Live : test de fumée de model (clés de profil)

Les tests Live sont divisés en deux couches afin que nous puissions isoler les échecs :

- « Modèle direct » nous indique si le fournisseur/modèle peut répondre du tout avec la clé donnée.
- « Test de fumée Gateway » nous indique si le pipeline complet Gateway+agent fonctionne pour ce model (sessions, historique, outils, stratégie de sandbox, etc.).

### Couche 1 : Achèvement direct du model (pas de Gateway)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les modèles découverts
  - Utilisez `getApiKeyForModel` pour sélectionner les modèles pour lesquels vous avez des identifiants
  - Exécuter un petit achèvement par model (et régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour moderne) pour exécuter réellement cette suite ; sinon, elle est ignorée pour garder `pnpm test:live` axé sur les tests de fumée du gateway
- Comment sélectionner les modèles :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (liste d'autorisation séparée par des virgules)
- Comment sélectionner les providers :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation séparée par des virgules)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis d'env
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour appliquer uniquement le **magasin de profils**
- Pourquoi cela existe :
  - Sépare « l'API du provider est cassée / la clé est invalide » de « le pipeline de l'agent du gateway est cassé »
  - Contient de petites régressions isolées (exemple : rejeu de raisonnement OpenAI Responses/Codex Responses + flux d'appels d'outils)

### Couche 2 : Gateway + test de fumée de l'agent de développement (ce que fait réellement « @openclaw »)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer un gateway en processus
  - Créer/patcher une session `agent:dev:*` (remplacement de modèle par exécution)
  - Itérer sur les modèles avec clés et vérifier :
    - réponse « significative » (sans outils)
    - une invocation réelle d'un outil fonctionne (sonde de lecture)
    - sondes d'outils supplémentaires facultatives (sonde exec+lecture)
    - les chemins de régression OpenAI (appel d'outil uniquement → suivi) continuent de fonctionner
- Détails des sondes (pour que vous puissiez expliquer rapidement les échecs) :
  - sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - sonde `exec+read` : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le modèle renvoie `cat <CODE>`.
  - Référence de l'implémentation : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.5, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou une liste séparée par des virgules) pour restreindre
- Comment sélectionner les fournisseurs (évitez « tout OpenRouter ») :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation par virgule)
- Les sondages d'outil + d'image sont toujours activés dans ce test en direct :
  - Sondage `read` + sondage `exec+read` (stress de l'outil)
  - le sondage d'image s'exécute lorsque le modèle annonce la prise en charge des entrées d'image
  - Flux (niveau élevé) :
    - Le test génère un minuscule PNG avec « CAT » + un code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Conseil : pour voir ce que vous pouvez tester sur votre machine (et les ids exacts `provider/model`), exécutez :

```bash
openclaw models list
openclaw models list --json
```

## En direct : test de fumée du jeton de configuration Anthropic

- Test : `src/agents/anthropic.setup-token.live.test.ts`
- Objectif : vérifier que le jeton de configuration CLI de Claude Code (ou un profil de jeton de configuration collé) peut compléter une invite CLI.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Sources de jetons (choisissez-en une) :
  - Profil : `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Jeton brut : `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- Remplacement du modèle (facultatif) :
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

Exemple de configuration :

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## En direct : test de fumée du backend CLI (CLI Claude Code ou autres CLI locales)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline Gateway + agent en utilisant un backend CLI local, sans toucher à votre configuration par défaut.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Par défaut :
  - Modèle : `claude-cli/claude-sonnet-4-6`
  - Commande : `claude`
  - Arguments : `["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- Remplacements (facultatif) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une véritable pièce jointe image (les chemins sont injectés dans le prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour transmettre les chemins des fichiers image en tant qu'arguments CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la façon dont les arguments image sont transmis lorsque `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un second tour et valider le flux de reprise.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` pour garder la configuration MCP CLI activée (par défaut, la configuration MCP est désactivée avec un fichier vide temporaire).

Exemple :

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

### Recettes live recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Model unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Model unique, test de fumée de passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel de tool sur plusieurs fournisseurs :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise l'API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison d'agent style Cloud Code Assist).
- `google-gemini-cli/...` utilise la CLI Gemini locale sur votre machine (auth distincte + particularités d'outillage).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle l'API Gemini hébergée par Google via HTTP (clé API / auth profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw délègue à un binaire local `gemini` ; il possède sa propre auth et peut se comporter différemment (support de streaming/tool/décalage de version).

## Live : matrice de models (ce que nous couvrons)

Il n'y a pas de « liste de models CI » fixe (live est optionnel), mais ce sont les models **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de test de fumée moderne (appel de tool + image)

Il s'agit de l'exécution des « models courants » que nous nous attendons à voir continuer de fonctionner :

- OpenAI (non-Codex) : `openai/gpt-5.2` (optionnel : `openai/gpt-5.1`)
- Codex OpenAI : `openai-codex/gpt-5.4`
- Anthropic : Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-5`)
- Google (Gemini API) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (évitez les modèles Gemini 2.x plus anciens)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/minimax-m2.5`

Exécuter le test de fumée de la passerelle avec des outils + image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/minimax-m2.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Référence : appel d'outil (Read + Exec facultatif)

Choisissez au moins un par famille de fournisseurs :

- OpenAI : `openai/gpt-5.2` (ou `openai/gpt-5-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-5`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/minimax-m2.5`

Couverture supplémentaire facultative (idéal à avoir) :

- xAI : `xai/grok-4` (ou la dernière disponible)
- Mistral : `mistral/`… (choisissez un modèle compatible avec les « outils » que avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; l'appel d'outils dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un modèle compatible image dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes Claude/Gemini/OpenAI compatibles Vision, etc.) pour tester la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez activé des clés, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (des centaines de modèles ; utilisez `openclaw models scan` pour trouver des candidats compatibles outils+image)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

D'autres fournisseurs que vous pouvez inclure dans la matrice en direct (si vous avez des identifiants/une configuration) :

- Intégré : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), plus tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Conseil : n'essayez pas de coder en dur « tous les modèles » dans la documentation. La liste faisant autorité est ce que `discoverModels(...)` renvoie sur votre machine + les clés disponibles.

## Identifiants (ne jamais commettre)

Les tests en direct découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests en direct devraient trouver les mêmes clés.
- Si un test en direct indique « pas d'identifiants », débuguez de la même manière que vous débugueriez `openclaw models list` / la sélection du modèle.

- Stockage de profil : `~/.openclaw/credentials/` (préféré ; ce que signifie « clés de profil » dans les tests)
- Configuration : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)

Si vous souhaitez vous appuyer sur des clés d'environnement (par exemple exportées dans votre `~/.profile`), exécutez les tests locaux après `source ~/.profile`, ou utilisez les runners Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Deepgram live (transcription audio)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- Test : `src/agents/byteplus.live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Remplacement facultatif du modèle : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Runners Docker (vérifications facultatives « fonctionne sous Linux »)

Ces tests s'exécutent `pnpm test:live` à l'intérieur de l'image Docker du dépôt, en montant votre répertoire de configuration local et votre espace de travail (et en sourçant `~/.profile` si monté). Ils montent également en liaison les répertoires d'authentification CLI comme `~/.codex`, `~/.claude`, `~/.qwen` et `~/.minimax` lorsqu'ils sont présents, afin que l'CLI OAuth externe reste disponible dans le conteneur :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- Gateway + agent dev : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Assistant d'intégration (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Réseau Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Plugins (chargement d'extension personnalisé + test du registre) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)

Les runners Docker live-model montent également l'extraction actuelle en lecture seule et la préparent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest sur votre source/configuration locale exacte.

Test de smoke manuel de fil en langage clair ACP (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les workflows de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils ACP, alors ne le supprimez pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (par défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- Les répertoires d'authentification CLI externes sous `$HOME` (`.codex`, `.claude`, `.qwen`, `.minimax`) sont montés en lecture seule sur les chemins `/home/node/...` correspondants lorsqu'ils sont présents
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour garantir que les identifiants proviennent du magasin de profils (et non des variables d'environnement)

## Sanité de la documentation

Exécuter les vérifications de la documentation après les modifications : `pnpm docs:list`.

## Régression hors ligne (sûre pour CI)

Il s'agit de régressions de « pipeline réel » sans providers réels :

- Appel d'outil Gateway (simulage OpenAI, boucle réelle de passerelle + agent) : `src/gateway/gateway.test.ts` (cas : "exécute un appel d'outil simulé OpenAI de bout en bout via la boucle d'agent de passerelle")
- Assistant Gateway (WS `wizard.start`/`wizard.next`, écrit la configuration + authentification appliquée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant via ws et écrit la configuration du jeton d'authentification")

## Évaluations de fiabilité de l'agent (Skills)

Nous avons déjà quelques tests sûrs pour CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Appel d'outil simulé via la boucle réelle de passerelle + agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de la session et les effets de la configuration (`src/gateway/gateway.test.ts`).

Ce qu'il manque encore pour les Skills (voir [Skills](/fr/tools/skills)) :

- **Prise de décision :** lorsque les Skills sont listés dans le prompt, l'agent choisit-il la bonne Skill (ou évite-t-il celles non pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios à plusieurs tours qui affirment l'ordre des outils, la continuité de l'historique de session et les limites du bac à sable.

Les évaluations futures doivent d'abord rester déterministes :

- Un lanceur de scénarios utilisant des providers simulés pour affirmer les appels d'outils + l'ordre, les lectures de fichiers de Skills et le câblage de session.
- Une petite suite de scénarios axés sur les Skills (utilisation vs évitement, restriction, injection de prompt).
- Évaluations en direct optionnelles (opt-in, limitées par env) uniquement après la mise en place de la suite sûre pour CI.

## Ajouter des régressions (recommandations)

Lorsque vous corrigez un problème de provider/model découvert en direct :

- Ajoutez une régression sûre pour CI si possible (provider simulé/stub, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement uniquement en direct (limites de débit, stratégies d'authentification), gardez le test en direct restreint et opt-in via des variables d'environnement
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bogue de conversion/relecture de requête provider → test direct des models
  - bogue du pipeline de session/historique/outil de la passerelle → test de fumée en direct de la passerelle ou test simulé de la passerelle sans risque pour la CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis vérifie que les id d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les id de cibles non classés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.

import fr from "/components/footer/fr.mdx";

<fr />
