---
summary: "Kit de test : suites unit/e2e/live, runners Docker, et ce que couvre chaque test"
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

- Passerelle complète (attendue avant le push) : `pnpm build && pnpm check && pnpm test`
- Exécution locale plus rapide de la suite complète sur une machine puissante : `pnpm test:max`
- Boucle de surveillance directe Vitest (configuration des projets modernes) : `pnpm test:watch`
- Le ciblage direct de fichiers route désormais également les chemins d'extension/channel : `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts`

Lorsque vous touchez aux tests ou souhaitez une confiance supplémentaire :

- Passerelle de couverture : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de vrais fournisseurs/modèles (nécessite de vrais identifiants) :

- Suite Live (modèles + sondes d'outil/image de passerelle) : `pnpm test:live`
- Cibler un fichier live en mode silencieux : `pnpm test:live -- src/agents/models.profiles.live.test.ts`

Conseil : lorsque vous n'avez besoin que d'un seul cas d'échec, préférez restreindre les tests live via les variables d'environnement de liste d'autorisation décrites ci-dessous.

## Suites de tests (ce qui s'exécute où)

Pensez aux suites comme à un « réalisme croissant » (et une instabilité/coût croissants) :

### Unité / Intégration (par défaut)

- Commande : `pnpm test`
- Configuration : `projects` Vitest natif via `vitest.config.ts`
- Fichiers : inventaires core/unit sous `src/**/*.test.ts`, `packages/**/*.test.ts`, `test/**/*.test.ts`, et les tests de nœud `ui` sur liste blanche couverts par `vitest.unit.config.ts`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration en cours de processus (auth passerelle, routage, tooling, analyse, configuration)
  - Régressions déterministes pour les bogues connus
- Attentes :
  - S'exécute dans CI
  - Aucune vraie clé requise
  - Doit être rapide et stable
- Note sur les projets :
  - `pnpm test`, `pnpm test:watch`, et `pnpm test:changed` utilisent tous désormais la même configuration racine `projects` Vitest native.
  - Les filtres de fichiers directs routent nativement via le graphe de projet racine, donc `pnpm test extensions/discord/src/monitor/message-handler.preflight.test.ts` fonctionne sans wrapper personnalisé.
- Note sur le runner intégré :
  - Lorsque vous modifiez les entrées de découverte des outils de message ou le contexte d'exécution de compactage,
    conservez les deux niveaux de couverture.
  - Ajoutez des régressions d'assistance ciblées pour les limites pures de routage/normalisation.
  - Maintenez également les suites d'intégration du runner intégré en bonne santé :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les identifiants délimités et le comportement de compactage circulent toujours
    à travers les vrais chemins `run.ts` / `compact.ts` ; les tests d'assistance uniquement ne constituent pas
    un substitut suffisant pour ces chemins d'intégration.
- Note sur le pool :
  - La configuration de base de Vitest utilise désormais `threads` par défaut.
  - La configuration partagée de Vitest corrige également `isolate: false` et utilise le runner non isolé dans les configurations des projets racine, e2e et live.
  - La voie UI racine conserve sa configuration `jsdom` et son optimiseur, mais s'exécute désormais également sur le runner non isolé partagé.
  - `pnpm test` hérite des mêmes valeurs par défaut `threads` + `isolate: false` de la configuration des projets `vitest.config.ts` racine.
  - Le lanceur partagé `scripts/run-vitest.mjs` ajoute désormais également `--no-maglev` par défaut pour les processus enfants Node de Vitest afin de réduire l'activité de compilation V8 lors des grandes exécutions locales. Définissez `OPENCLAW_VITEST_ENABLE_MAGLEV=1` si vous devez comparer avec le comportement standard de V8.
- Note sur l'itération locale rapide :
  - `pnpm test:changed` exécute la configuration native des projets avec `--changed origin/main`.
  - `pnpm test:max` et `pnpm test:changed:max` conservent la même configuration native des projets, mais avec une limite de travailleurs plus élevée.
  - La mise à l'échelle automatique des travailleurs locaux est désormais intentionnellement conservatrice et se désactive également lorsque la charge moyenne de l'hôte est déjà élevée, afin que plusieurs exécutions Vitest simultanées causent moins de dégâts par défaut.
  - La configuration de base de Vitest marque les fichiers de projets/configuration comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque le câblage des tests change.
  - La configuration conserve `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge ; définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez un emplacement de cache explicite pour le profilage direct.
- Note de débogage des performances :
  - `pnpm test:perf:imports` active le rapport de durée d'importation Vitest ainsi que la sortie de répartition des importations.
  - `pnpm test:perf:imports:changed` limite la même vue de profilage aux fichiers modifiés depuis `origin/main`.
  - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour le démarrage et la surcharge de transformation de Vitest/Vite.
  - `pnpm test:perf:profile:runner` écrit des profils CPU+tas pour la suite de tests unitaires avec le parallélisme de fichiers désactivé.

### E2E (smoke de passerelle)

- Commande : `pnpm test:e2e`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `threads` avec `isolate: false`, correspondant au reste du dépôt.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console détaillée.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appariement de nœuds et réseautage plus complexe
- Attentes :
  - S'exécute dans la CI (lorsqu'il est activé dans le pipeline)
  - Aucune clé réelle requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : Smoke du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `test/openshell-sandbox.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell de OpenClaw sur de vrais `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un CLI `openshell` local ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non standard ou un script wrapper

### Live (vrais fournisseurs + vrais modèles)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - « Est-ce que ce provider/model fonctionne vraiment _aujourd'hui_ avec de vraies informations d'identification ? »
  - Détecter les changements de format du provider, les bizarreries de l'appel d'outils, les problèmes d'authentification et le comportement des limites de débit
- Attentes :
  - Non stable pour l'CI par conception (réseaux réels, politiques réelles des providers, quotas, pannes)
  - Coûte de l'argent / utilise les limites de débit
  - Préférez l'exécution de sous-ensembles réduits plutôt que « tout »
- Les exécutions Live sourcent `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions Live isolent toujours `HOME` et copient le matériel de configuration/authentification dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre véritable `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests Live utilisent votre véritable répertoire personnel.
- `pnpm test:live` utilise par défaut désormais un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avertissement supplémentaire `~/.profile` et réduit le silence des journaux d'amorçage de la passerelle et des bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au provider) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une priorité par exécution Live via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponse de limite de débit.
- Sortie de progression/réveil :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels longs du provider soient visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de console Vitest afin que les lignes de progression du provider/de la passerelle diffusent immédiatement lors des exécutions Live.
  - Ajustez les réveils du modèle direct avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les réveils de la passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Touching gateway networking / WS protocol / pairing: add `pnpm test:e2e`
- Debugging “my bot is down” / provider-specific failures / tool calling: run a narrowed `pnpm test:live`

## Live : Android node capability sweep

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Goal : invoke **every command currently advertised** by a connected Android node and assert command contract behavior.
- Scope :
  - Preconditioned/manual setup (the suite does not install/run/pair the app).
  - Command-by-command gateway `node.invoke` validation for the selected Android node.
- Required pre-setup :
  - Android app already connected + paired to the gateway.
  - App kept in foreground.
  - Permissions/capture consent granted for capabilities you expect to pass.
- Optional target overrides :
  - `OPENCLAW_ANDROID_NODE_ID` or `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Full Android setup details : [Android App](/en/platforms/android)

## Live : model smoke (profile keys)

Live tests are split into two layers so we can isolate failures :

- “Direct model” tells us the provider/model can answer at all with the given key.
- “Gateway smoke” tells us the full gateway+agent pipeline works for that model (sessions, history, tools, sandbox policy, etc.).

### Layer 1 : Direct model completion (no gateway)

- Test : `src/agents/models.profiles.live.test.ts`
- Goal :
  - Enumerate discovered models
  - Use `getApiKeyForModel` to select models you have creds for
  - Run a small completion per model (and targeted regressions where needed)
- How to enable :
  - `pnpm test:live` (or `OPENCLAW_LIVE_TEST=1` if invoking Vitest directly)
- Set `OPENCLAW_LIVE_MODELS=modern` (or `all`, alias for modern) to actually run this suite; otherwise it skips to keep `pnpm test:live` focused on gateway smoke
- How to select models :
  - `OPENCLAW_LIVE_MODELS=modern` to run the modern allowlist (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` is an alias for the modern allowlist
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,..."` (liste d'autorisation séparée par des virgules)
- Comment sélectionner les fournisseurs :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity"` (liste d'autorisation séparée par des virgules)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis d'environnement
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'utilisation uniquement du **magasin de profils**
- Pourquoi cela existe :
  - Sépare « l'API du fournisseur est cassée / la clé est invalide » de « le pipeline de l'agent de passerelle est cassé »
  - Contient de petites régressions isolées (exemple : relecture du raisonnement des réponses OpenAI/Codex + flux d'appels d'outils)

### Couche 2 : Gateway + test de fumée de l'agent de développement (ce que fait réellement « @openclaw »)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une passerelle en cours de processus
  - Créer/patcher une session `agent:dev:*` (remplacement du modèle par exécution)
  - Parcourir les modèles avec clés et vérifier :
    - une réponse « significative » (sans outils)
    - une invocation d'outil réel fonctionne (sonde de lecture)
    - sondes d'outils supplémentaires optionnelles (sonde exec+lecture)
    - les chemins de régression OpenAI (appel d'outil uniquement → suivi) continuent de fonctionner
- Détails des sondes (pour que vous puissiez expliquer rapidement les échecs) :
  - sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - sonde `exec+read` : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le modèle renvoie `cat <CODE>`.
  - Référence de mise en œuvre : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou liste séparée par des virgules) pour restreindre
- Comment sélectionner les fournisseurs (éviter « OpenRouter tout ») :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondes d'outil et d'image sont toujours activées dans ce test en direct :
  - sonde `read` + sonde `exec+read` (stress de l'outil)
  - la sonde d'image s'exécute lorsque le modèle annonce la prise en charge de l'entrée d'image
  - Flux (de haut niveau) :
    - Le test génère un petit PNG avec « CAT » + un code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Conseil : pour voir ce que vous pouvez tester sur votre machine (et les identifiants `provider/model` exacts), exécutez :

```bash
openclaw models list
openclaw models list --json
```

## Live : ACP bind smoke (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de conversation-bind ACP avec un agent ACP en direct :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation de canal de message synthétique en place
  - envoyer une suite normale sur cette même conversation
  - vérifier que la suite atterrit dans la transcription de session ACP liée
- Activer :
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Par défaut :
  - Agent ACP : `claude`
  - Canal synthétique : contexte de conversation style DM Slack
  - Backend ACP : `acpx`
- Remplacements :
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
- Notes :
  - Ce couloir utilise la surface `chat.send` de la passerelle avec des champs de route d'origine synthétiques réservés aux administrateurs, permettant aux tests d'attacher le contexte du canal de message sans prétendre livrer à l'externe.
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

Notes Docker :

- Le lanceur Docker se trouve à `scripts/test-live-acp-bind-docker.sh`.
- Il source `~/.profile`, met en place le matériau d'authentification CLI correspondant dans le conteneur, installe `acpx` dans un préfixe npm accessible en écriture, puis installe le CLI en direct demandé (`@anthropic-ai/claude-code` ou `@openai/codex`) si manquant.
- À l'intérieur de Docker, le runner définit `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` afin qu'acpx conserve les env vars du provider à partir du profil sourcé disponibles pour le CLI du harnais enfant CLI.

### Recettes live recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.4" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, smoke de passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel d'outil sur plusieurs providers :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise la API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison de l'agent de type Cloud Code Assist).

## Live : matrice de modèles (ce que nous couvrons)

Il n'y a pas de « liste de modèles CI » fixe (live est optionnel), mais ce sont les modèles **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de smoke moderne (appel d'outil + image)

C'est l'exécution de « modèles courants » que nous nous attendons à voir fonctionner :

- OpenAI (non-Codex) : `openai/gpt-5.4` (optionnel : `openai/gpt-5.4-mini`)
- Codex OpenAI : `openai-codex/gpt-5.4`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (API Gemini) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (éviter les modèles Gemini 2.x plus anciens)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Exécuter le smoke de passerelle avec outils + image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.4,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Ligne de base : appel d'outil (Read + Exec optionnel)

Choisissez au moins un par famille de providers :

- OpenAI : `openai/gpt-5.4` (ou `openai/gpt-5.4-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Couverture supplémentaire optionnelle (bien à avoir) :

- xAI : `xai/grok-4` (ou dernière version disponible)
- Mistral : `mistral/`… (choisissez un modèle compatible avec les « outils » que avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; l'appel d'outils dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un modèle capable de traiter des images dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI compatibles avec la vision, etc.) pour tester la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez activé des clés, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (des centaines de modèles ; utilisez `openclaw models scan` pour trouver les candidats capables d'outils et d'images)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (authentification via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

D'autres fournisseurs que vous pouvez inclure dans la matrice en direct (si vous avez des identifiants/config) :

- Intégré : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible avec OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Conseil : n'essayez pas de coder en dur « tous les modèles » dans la documentation. La liste faisant autorité est tout ce que `discoverModels(...)` retourne sur votre machine + toutes les clés disponibles.

## Identifiants (ne jamais committer)

Les tests en direct découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests en direct devraient trouver les mêmes clés.
- Si un test en direct indique « no creds », débuguez de la même manière que vous débugueriez `openclaw models list` / la sélection de modèle.

- Profils d'authentification par agent : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (c'est ce que « profile keys » signifie dans les tests en direct)
- Config : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Répertoire d'état hérité : `~/.openclaw/credentials/` (copié dans le home live intermédiaire si présent, mais pas le stock principal de clés de profil)
- Les exécutions locales live copient la configuration active, les fichiers `auth-profiles.json` par agent, le `credentials/` hérité, et les répertoires d'auth CLI externes pris en charge dans un home de test temporaire par défaut ; les substitutions de chemin `agents.*.workspace` / `agentDir` sont supprimées dans cette configuration intermédiaire afin que les sondes restent en dehors de votre espace de travail hôte réel.

Si vous souhaitez vous fier à des clés d'environnement (par exemple exportées dans votre `~/.profile`), exécutez les tests locaux après `source ~/.profile`, ou utilisez les runners Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Live Deepgram (transcription audio)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## Live du plan de codage BytePlus

- Test : `src/agents/byteplus.live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Remplacement de model optionnel : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Live des médias de workflow ComfyUI

- Test : `extensions/comfy/comfy.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Portée :
  - Teste les chemins d'image, de vidéo et `music_generate` inclus dans le bundle comfy
  - Ignore chaque capacité à moins que `models.providers.comfy.<capability>` ne soit configuré
  - Utile après avoir modifié la soumission, l'interrogation, les téléchargements ou l'enregistrement de plugins du workflow comfy

## Live de génération d'images

- Test : `src/image-generation/runtime.live.test.ts`
- Commande : `pnpm test:live src/image-generation/runtime.live.test.ts`
- Portée :
  - Énumère chaque plugin provider de génération d'images enregistré
  - Charge les variables d'environnement provider manquantes depuis votre shell de connexion (`~/.profile`) avant le sondage
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les identifiants shell réels
  - Ignore les providers sans authentification/profil/model utilisable
  - Exécute les variantes de génération d'images standard via la capacité d'exécution partagée :
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Fournisseurs groupés actuels couverts :
  - `openai`
  - `google`
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les remplacements exclusivement basés sur les variables d'environnement

## Génération de musique en direct

- Test : `extensions/music-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Portée :
  - Exerce le chemin du fournisseur de génération de musique groupé partagé
  - Couvre actuellement Google et MiniMax
  - Charge les variables d'environnement du fournisseur à partir de votre shell de connexion (`~/.profile`) avant la sonde
  - Ignore les fournisseurs sans authentification/profil/modèle utilisable
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.5+"`

## Exécuteurs Docker (vérifications optionnelles "fonctionne sous Linux")

Ces exécuteurs Docker sont divisés en deux catégories :

- Exécuteurs de modèles en direct : `test:docker:live-models` et `test:docker:live-gateway` n'exécutent que leur fichier live correspondant à la clé de profil à l'intérieur de l'image Docker du dépôt (`src/agents/models.profiles.live.test.ts` et `src/gateway/gateway-models.profiles.live.test.ts`), en montant votre répertoire de configuration local et votre espace de travail (et en sourçant `~/.profile` si monté). Les points d'entrée locaux correspondants sont `test:live:models-profiles` et `test:live:gateway-profiles`.
- Les exécuteurs live Docker ont par défaut une limite de smoke plus petite afin qu'un balayage Docker complet reste pratique :
  `test:docker:live-models` est `OPENCLAW_LIVE_MAX_MODELS=12` par défaut, et
  `test:docker:live-gateway` est `OPENCLAW_LIVE_GATEWAY_SMOKE=1` par défaut,
  `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=8`,
  `OPENCLAW_LIVE_GATEWAY_STEP_TIMEOUT_MS=45000`, et
  `OPENCLAW_LIVE_GATEWAY_MODEL_TIMEOUT_MS=90000`. Remplacez ces variables d'environnement lorsque vous
  souhaitez explicitement le scan exhaustif plus large.
- `test:docker:all` construit l'image live Docker une seule fois via `test:docker:live-build`, puis la réutilise pour les deux voies live Docker.
- Container smoke runners: `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels`, et `test:docker:plugins` démarrent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de niveau supérieur.

Les runners Docker live-model montent également par liaison uniquement les répertoires d'authentification Docker nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire du conteneur avant l'exécution afin que l'CLI externe CLI puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- ACP bind smoke : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh`)
- Gateway + agent de développement : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant de configuration (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Réseau Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Pont de canal MCP (Gateway amorcé + pont stdio + smoke de trame de notification Claude brute) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (smoke d'installation + alias `/plugin` + sémantique de redémarrage du bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)

Les exécuteurs Docker du modèle en direct montent également l'extraction actuelle en lecture seule et la préparent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de maintenir l'image d'exécution légère tout en exécutant Vitest sur votre source/configuration locale exacte. L'étape de préparation ignore les caches volumineux locaux et les sorties de construction de l'application tels que `.pnpm-store`, `.worktrees`, `__openclaw_vitest__`, et `.build` local à l'application ou les répertoires de sortie Gradle, afin que les exécutions live Docker ne passent pas des minutes à copier des artefacts spécifiques à la machine. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` afin que les sondes live du gateway ne démarrent pas de vrais workers de canal Telegram/Discord/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, faites donc passer également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture live du gateway de cette voie Docker. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur de gateway OpenClaw avec les points de terminaison HTTP compatibles OpenAI activés, démarre un conteneur Open WebUI épinglé contre ce gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une vraie demande de chat via le proxy `/api/chat/completions` d'Open WebUI. La première exécution peut être sensiblement plus lente car Docker peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie attend une clé de modèle live utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir dans les exécutions Dockerisées. Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un vrai compte Telegram, Discord ou iMessage. Il démarre un conteneur Gateway amorcé, démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte des conversations acheminées, les lectures de transcripts, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements live, le routage des envois sortants, et les notifications de canal et d'autorisations de style Claude sur le vrai pont MCP stdio. La vérification des notifications inspecte directement les trames MCP stdio brutes, de sorte que le test de fumée valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à exposer.

Test de smoke de fil en langage clair ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les flux de travail de régression/débogage. Il peut être nécessaire à nouveau pour la validation du routage des fils ACP, donc ne le supprimez pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (par défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (par défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installations CLI mises en cache dans Docker
- Les répertoires/fichiers d'auth externes CLI sous `$HOME` sont montés en lecture seule sous `/host-auth...`, puis copiés dans `/home/node/...` avant le début des tests
  - Répertoires par défaut : `.minimax`
  - Fichiers par défaut : `~/.codex/auth.json`, `~/.codex/config.toml`, `.claude.json`, `~/.claude/.credentials.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json`
  - Les exécutions restreintes de provider montent uniquement les répertoires/fichiers nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du magasin de profils (pas de l'env)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le model exposé par la passerelle pour le test de smoke Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification de nonce utilisée par le test de smoke Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer le tag d'image Open WebUI épinglée

## Sanité de la documentation

Exécutez les vérifications de docs après les modifications : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez besoin de vérifications des titres en page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûr pour CI)

Ce sont des régressions de « vrai pipeline » sans vrais providers :

- Appel d'outil Gateway (mock Gateway, vraie boucle gateway + agent) : `src/gateway/gateway.test.ts` (cas : « exécute un appel d'outil mock OpenAI de bout en bout via la boucle d'agent gateway »)
- Assistant Gateway (WS `wizard.start`/`wizard.next`, écriture config + auth forcée) : `src/gateway/gateway.test.ts` (cas : « exécute l'assistant sur ws et écrit la config du jeton d'auth »)

## Évaluations de fiabilité de l'agent (skills)

Nous avons déjà quelques tests sûrs pour CI qui se comportent comme des « évaluations de fiabilité de l'agent » :

- Mock d'appel d'outil via la vraie boucle gateway + agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de session et les effets de config (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les skills (voir [Skills](/en/tools/skills)) :

- **Prise de décision :** lorsque les skills sont listées dans le prompt, l'agent choisit-il la bonne skill (ou évite-t-il celles non pertinentes) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/args requis ?
- **Contrats de workflow :** scénarios multi-tours qui affirment l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les futures évaluations doivent d'abord rester déterministes :

- Un exécuteur de scénario utilisant des providers mocks pour affirmer les appels d'outil + l'ordre, les lectures de fichiers de skills et le câblage de session.
- Une petite suite de scénarios axés sur les skills (utilisation vs évitement, gating, injection de prompt).
- Évaluations live optionnelles (opt-in, env-gated) uniquement après que la suite sûre pour CI est en place.

## Tests de contrat (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son
contrat d'interface. Ils parcourent tous les plugins découverts et exécutent une suite
d'assertions de forme et de comportement. La voie `pnpm test` unitaire par défaut
ignore intentionnellement ces fichiers de jointure et de fumée partagés ; exécutez les commandes de contrat explicitement
lorsque vous touchez aux surfaces de channel ou de provider partagées.

### Commandes

- Tous les contrats : `pnpm test:contracts`
- Contrats de channel uniquement : `pnpm test:contracts:channels`
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
- **directory** - API de répertoire/liste API
- **group-policy** - Application de la stratégie de groupe

### Contrats de statut de fournisseur

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sonde de statut de canal
- **registry** - Forme du registre de plugins

### Contrats de fournisseur

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection d'authentification
- **catalog** - API du catalogue de modèles
- **discovery** - Découverte de plugin
- **loader** - Chargement de plugin
- **runtime** - Runtime du fournisseur
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exportations ou les sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de canal ou de fournisseur
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests de contrat s'exécutent dans CI et ne nécessitent pas de clés API réelles.

## Ajouter des régressions (conseils)

Lorsque vous corrigez un problème de fournisseur/modèle découvert en direct :

- Ajoutez une régression sûre pour CI si possible (fournisseur simulé/bouchon, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement en direct uniquement (limites de débit, stratégies d'auth), gardez le test en direct étroit et facultatif via env vars
- Préférez cibler la plus petite couche qui détecte le bogue :
  - bogue de conversion/relecture de requête de fournisseur → test direct des modèles
  - bogue de pipeline de session/historique/tool de passerelle → test de fumée en direct de la passerelle ou test simulé de passerelle sûr pour CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les exec id des segments de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les id de cibles non classifiées afin que les nouvelles classes ne puissent pas être ignorées silencieusement.
