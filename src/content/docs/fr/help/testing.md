---
summary: "Kit de tests : suites unit/e2e/live, exécuteurs Docker et couverture de chaque test"
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
- Exécution locale plus rapide de la suite complète sur une machine puissante : `pnpm test:max`

Lorsque vous modifiez des tests ou souhaitez une confiance supplémentaire :

- Passage de couverture : `pnpm test:coverage`
- Suite E2E : `pnpm test:e2e`

Lors du débogage de vrais fournisseurs/modèles (nécessite de vrais identifiants) :

- Suite Live (modèles + sondes d'outils/images de passerelle) : `pnpm test:live`
- Cibler un fichier live en silence : `pnpm test:live -- src/agents/models.profiles.live.test.ts`

Astuce : lorsque vous n'avez besoin que d'un cas d'échec, préférez restreindre les tests live via les env vars de liste d'autorisation décrits ci-dessous.

## Suites de tests (ce qui s'exécute où)

Considérez les suites comme un « réalisme croissant » (et une instabilité/coût croissants) :

### Unité / intégration (par défaut)

- Commande : `pnpm test`
- Config : `scripts/test-parallel.mjs` (exécute `vitest.unit.config.ts`, `vitest.extensions.config.ts`, `vitest.gateway.config.ts`)
- Fichiers : `src/**/*.test.ts`, plugin groupé `**/*.test.ts`
- Portée :
  - Tests unitaires purs
  - Tests d'intégration in-process (authentification, routage, outils, analyse, configuration de la passerelle)
  - Régressions déterministes pour les bugs connus
- Attendus :
  - S'exécute dans la CI
  - Aucune clé réelle requise
  - Doit être rapide et stable
- Note du planificateur :
  - `pnpm test` conserve désormais un petit manifeste comportemental validé pour les véritables substitutions de pool/isolation et un instantané de minutage distinct pour les fichiers unitaires les plus lents.
  - Les exécutions locales en mode extension uniquement utilisent désormais également un instantané de synchronisation des extensions vérifié, ainsi qu'une cible de lot partagée légèrement plus grossière sur les hôtes à haute mémoire, afin que la voie des extensions partagées évite de générer un lot supplémentaire lorsque deux exécutions partagées mesurées suffisent.
  - Les lots partagés d'extensions locales à haute mémoire s'exécutent également avec une limite de travailleurs légèrement plus élevée qu'auparavant, ce qui a réduit la durée des deux lots d'extensions partagées restants sans modifier les voies d'extensions isolées.
  - Les exécutions locales de channel à haute mémoire réutilisent désormais l'instantané de synchronisation channel vérifié pour diviser la voie des channels partagés en quelques lots mesurés au lieu d'un seul worker partagé long.
  - Les lots partagés de channel locaux à haute mémoire s'exécutent également avec une limite de travailleurs légèrement plus faible que les lots unitaires partagés, ce qui a aidé les réexécutions ciblées de channel à éviter une surabonnement de CPU une fois que les voies de channel isolées sont déjà en cours d'exécution.
  - Les réexécutions locales ciblées de canaux commencent maintenant à diviser le travail partagé des canaux un peu plus tôt, ce qui empêche les réexécutions ciblées de taille moyenne de laisser un lot partagé de canal de taille excessive sur le chemin critique.
  - Les réexécutions locales ciblées d'unités divisent également les sélections partagées d'unités de taille moyenne en lots mesurés, ce qui permet aux grandes réexécutions ciblées de se chevaucher au lieu d'attendre derrière une longue voie unitaire partagée.
  - Les exécutions locales multi-surfaces à haute mémoire utilisent également des lots partagés `unit-fast` légèrement plus grossiers, afin que le planificateur mixte passe moins de temps à démarrer des workers unitaires partagés supplémentaires avant que les surfaces ultérieures puissent se chevaucher.
  - Les exécutions partagées d'unités, d'extensions, de canaux et de passerelles restent toutes sur Vitest `forks`.
  - Le wrapper maintient les exceptions isolées par fork mesurées et les voies singleton lourdes explicitement dans `test/fixtures/test-parallel.behavior.json`.
  - Le wrapper extrait les fichiers les plus lourds mesurés dans des voies dédiées au lieu de s'appuyer sur une liste d'exclusion croissante maintenue manuellement.
  - Le benchmark de démarrage CLI dispose désormais de sorties enregistrées distinctes : `pnpm test:startup:bench:smoke` écrit l'artefact de smoke ciblé à `.artifacts/cli-startup-bench-smoke.json`, `pnpm test:startup:bench:save` écrit l'artefact de suite complète à `.artifacts/cli-startup-bench-all.json` avec `runs=5` et `warmup=1`, et `pnpm test:startup:bench:update` rafraîchit le fixture validé à `test/fixtures/cli-startup-bench.json` avec `runs=5` et `warmup=1`.
  - Pour les exécutions locales en surface uniquement, les voies partagées unit, extension et channel peuvent faire chevaucher leurs points isolés au lieu d'attendre derrière un préfixe série unique.
  - Pour les exécutions locales multi-surfaces, le wrapper maintient l'ordre des phases de surface partagées, mais les lots à l'intérieur de la même phase partagée sont désormais exécutés en parallèle, le travail isolé différé peut chevaucher la prochaine phase partagée, et la marge de réserve `unit-fast` démarre désormais ce travail différé plus tôt au lieu de laisser ces créneaux inactifs.
  - Rafraîchissez les instantanés de timing avec `pnpm test:perf:update-timings` et `pnpm test:perf:update-timings:extensions` après des modifications majeures de la forme de la suite.
- Note sur le runner intégré :
  - Lorsque vous modifiez les entrées de découverte de message-tool ou le contexte d'exécution de compactage,
    conservez les deux niveaux de couverture.
  - Ajoutez des régressions d'assistance ciblées pour les limites de routage/normalisation pures.
  - Maintenez également les suites d'intégration du runner intégré en bonne santé :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts`, et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les ids délimités et le comportement de compactage circulent toujours
    à travers les chemins `run.ts` / `compact.ts` réels ; les tests d'assistance uniquement ne constituent pas un
    substitut suffisant à ces chemins d'intégration.
- Note sur le pool :
  - La configuration de base Vitest utilise par défaut `forks`.
  - Les voies de wrapper Unit, channel, extension et gateway utilisent par défaut `forks`.
  - Les configurations Unit, channel et extension utilisent par défaut `isolate: false` pour un démarrage de fichier plus rapide.
  - `pnpm test` transmet également `--isolate=false` au niveau du wrapper.
  - Optez de nouveau pour l'isolation de fichiers Vitest avec `OPENCLAW_TEST_ISOLATE=1 pnpm test`.
  - `OPENCLAW_TEST_NO_ISOLATE=0` ou `OPENCLAW_TEST_NO_ISOLATE=false` forcent également des exécutions isolées.
- Note sur l'itération locale rapide :
  - `pnpm test:changed` exécute le wrapper avec `--changed origin/main`.
  - `pnpm test:changed:max` conserve le même filtre de fichiers modifiés mais utilise le profil de planificateur local agressif du wrapper.
  - `pnpm test:max` expose ce même profil de planificateur pour une exécution locale complète.
  - Sur les versions locales de Node prises en charge, y compris Node 25, le profil normal peut utiliser le parallélisme de voie de niveau supérieur. `pnpm test:max` pousse tout de même le planificateur plus fort lorsque vous souhaitez une exécution locale plus agressive.
  - La configuration de base de Vitest marque les fichiers manifests/config du wrapper comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque les entrées du planificateur changent.
  - Le wrapper garde `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge, mais assigne un `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH` local à la voie afin que les processus Vitest concurrents n'entrent pas en conflit sur un répertoire de cache expérimental partagé.
  - Définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez un emplacement de cache explicite pour le profilage direct en une seule exécution.
- Note de débogage des performances :
  - `pnpm test:perf:imports` active le rapport de durée d'importation Vitest ainsi que la sortie de la répartition des importations.
  - `pnpm test:perf:imports:changed` limite la même vue de profilage aux fichiers modifiés depuis `origin/main`.
  - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour le démarrage Vitest/Vite et la surcharge de transformation.
  - `pnpm test:perf:profile:runner` écrit des profils CPU+tas de l'exécuteur pour la suite unitaire avec le parallélisme de fichiers désactivé.

### E2E (smoke de passerelle)

- Commande : `pnpm test:e2e`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Paramètres d'exécution par défaut :
  - Utilise Vitest `forks` pour une isolation déterministe entre fichiers.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge des E/S de la console.
- Remplacements utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (limité à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie détaillée de la console.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appariement de nœuds et mise en réseau plus intensive
- Attentes :
  - S'exécute dans CI (lorsqu'il est activé dans le pipeline)
  - Aucune clé réelle requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : test de fumée du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `test/openshell-sandbox.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable à partir d'un Dockerfile local temporaire
  - Teste le backend OpenShell d'OpenClaw via un vrai `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers distant canonique via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un CLI `openshell` local ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Remplacements utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non standard ou un script wrapper

### Live (providers réels + modèles réels)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (défini `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - « Ce provider/modèle fonctionne-t-il réellement _aujourd'hui_ avec de vraies identifiants ? »
  - Détecter les changements de format du provider, les bizarreries d'appel d'outils, les problèmes d'authentification et le comportement des limites de taux
- Attentes :
  - Non stable en CI par conception (réseaux réels, politiques réelles des providers, quotas, pannes)
  - Coûte de l'argent / utilise les limites de taux
  - Préférez l'exécution de sous-ensembles réduits plutôt que « tout »
- Les exécutions Live sourcent `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions Live isolent toujours les `HOME` et copient le matériel de configuration/d'authentification dans un répertoire personnel de test temporaire afin que les fixtures unitaires ne puissent pas modifier votre vrai `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests live utilisent votre vrai répertoire personnel.
- `pnpm test:live` utilise désormais par défaut un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avis `~/.profile` supplémentaire et réduit les journaux d'amorçage de la passerelle/les bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au fournisseur) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une substitution par live via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponses de limitation de débit.
- Sortie de progression/battement de cœur :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels fournisseurs longs restent visibles, même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de console Vitest afin que les lignes de progression du fournisseur/de la passerelle diffusent immédiatement lors des exécutions live.
  - Ajustez les battements de cœur direct-model avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les battements de cœur gateway/probe avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez beaucoup modifié)
- Modification du réseau de la passerelle / du protocole WS / de l'appairage : ajoutez `pnpm test:e2e`
- Débogage de « mon bot est en panne » / des échecs spécifiques au fournisseur / de l'appel d'outil : exécutez un `pnpm test:live` réduit

## Live : balayage des capacités du nœud Android

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **toutes les commandes actuellement annoncées** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préalable/manuelle (la suite n'installe pas/exécute/n'appaire pas l'application).
  - Validation de la passerelle `node.invoke` commande par commande pour le nœud Android sélectionné.
- Configuration préalable requise :
  - Application Android déjà connectée et appariée à la passerelle.
  - Application maintenue au premier plan.
  - Autorisations/consentement de capture accordés pour les capacités que vous attendez voir réussir.
- Substitutions de cibles facultatives :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Android App](/en/platforms/android)

## Live : test rapide de model (clés de profil)

Les tests en direct sont divisés en deux couches afin que nous puissions isoler les défaillances :

- « Direct model » nous indique si le provider/model peut répondre du tout avec la clé donnée.
- « Gateway smoke » nous indique si le pipeline complet gateway+agent fonctionne pour ce model (sessions, historique, outils, stratégie de bac à sable, etc.).

### Couche 1 : achèvement direct du model (sans passerelle)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les models découverts
  - Utilisez `getApiKeyForModel` pour sélectionner les models pour lesquels vous avez des identifiants
  - Exécuter un petit achèvement par model (et des régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour modern) pour exécuter réellement cette suite ; sinon, elle est ignorée pour garder `pnpm test:live` concentré sur le test de la passerelle
- Comment sélectionner les models :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (liste d'autorisation séparée par des virgules)
- Comment sélectionner les providers :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation séparée par des virgules)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis env
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour appliquer uniquement le **magasin de profils**
- Pourquoi cela existe :
  - Sépare « l'API du provider est défectueuse / la clé n'est pas valide » de « le pipeline de l'agent de passerelle est défectueux »
  - Contient de petites régressions isolées (exemple : rejeu du raisonnement OpenAI Responses/Codex Responses + flux d'appels d'outils)

### Couche 2 : Gateway + test rapide de l'agent de développement (ce que fait réellement « @openclaw »)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une passerelle en cours de traitement
  - Créer/patcher une session `agent:dev:*` (remplacement de model par exécution)
  - Parcourir les modèles-avec-clés et affirmer :
    - réponse « significative » (pas d'outils)
    - une véritable invocation d'outil fonctionne (sonde de lecture)
    - sondes d'outils supplémentaires facultatives (sonde exec+read)
    - Les chemins de régression OpenAI (tool-call-only → follow-up) continuent de fonctionner
- Détails des sondes (pour que vous puissiez expliquer rapidement les échecs) :
  - `read` probe : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - `exec+read` probe : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le modèle renvoie `cat <CODE>`.
  - Référence de l'implémentation : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou liste séparée par des virgules) pour restreindre
- Comment sélectionner les fournisseurs (évitez « tout OpenRouter ») :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondes d'outil et d'image sont toujours activées dans ce test en direct :
  - `read` probe + `exec+read` probe (stress de l'outil)
  - la sonde d'image s'exécute lorsque le modèle annonce la prise en charge des entrées d'image
  - Flux (niveau élevé) :
    - Le test génère un petit PNG avec « CAT » + code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Le Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Astuce : pour voir ce que vous pouvez tester sur votre machine (et les `provider/model` ids exacts), exécutez :

```bash
openclaw models list
openclaw models list --json
```

## Live : Anthropic setup-token smoke

- Test : `src/agents/anthropic.setup-token.live.test.ts`
- Objectif : vérifier que le setup-token du CLI Claude Code (ou un profil setup-token collé) peut compléter un prompt Anthropic.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Sources de jeton (choisissez-en une) :
  - Profil : `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Jeton brut : `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- Remplacement de modèle (optionnel) :
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

Exemple de configuration :

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live : CLI backend smoke (Claude Code CLI ou autres CLI locaux)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline Gateway + agent en utilisant un backend CLI local, sans toucher à votre configuration par défaut.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valeurs par défaut :
  - Modèle : `claude-cli/claude-sonnet-4-6`
  - Commande : `claude`
  - Args : `["-p","--output-format","json","--permission-mode","bypassPermissions"]`
- Remplacements (optionnel) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-opus-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.4"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json","--permission-mode","bypassPermissions"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_CLEAR_ENV='["ANTHROPIC_API_KEY","ANTHROPIC_API_KEY_OLD"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une pièce jointe image réelle (les chemins sont injectés dans le prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins des fichiers image en tant qu'arguments CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la manière dont les arguments d'image sont passés lorsque `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un deuxième tour et valider le flux de reprise.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` pour garder la configuration MCP de Claude Code CLI activée (désactive par défaut la configuration MCP avec un fichier vide temporaire).

Exemple :

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Recette Docker :

```bash
pnpm test:docker:live-cli-backend
```

Notes :

- Le runner Docker se trouve dans `scripts/test-live-cli-backend-docker.sh`.
- Il exécute le smoke live du backend CLI à l'intérieur de l'image Docker du dépôt en tant qu'utilisateur non-root `node`, car Claude CLI rejette `bypassPermissions` lorsqu'il est invoqué en tant que root.
- Pour `claude-cli`, il installe le package `@anthropic-ai/claude-code` Linux dans un préfixe accessible en écriture et mis en cache à `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (par défaut : `~/.cache/openclaw/docker-cli-tools`).
- Il copie `~/.claude` dans le conteneur lorsqu'il est disponible, mais sur les machines où l'auth Claude est soutenue par `ANTHROPIC_API_KEY`, il préserve également `ANTHROPIC_API_KEY` / `ANTHROPIC_API_KEY_OLD` pour le CLI Claude enfant via `OPENCLAW_LIVE_CLI_BACKEND_PRESERVE_ENV`.

## Live : Smoke test de liaison ACP (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de liaison de conversation ACP avec un agent ACP en direct :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation de canal de message synthétique en place
  - envoyer une suite normale sur cette même conversation
  - vérifier que la suite aboutit dans la transcription de session ACP liée
- Activer :
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Valeurs par défaut :
  - Agent ACP : `claude`
  - Canal synthétique : contexte de conversation style DM Slack
  - Backend ACP : `acpx`
- Remplacements :
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=/full/path/to/acpx`
- Notes :
  - Ce couloir utilise la surface `chat.send` de la passerelle avec des champs de route d'origine synthétiques réservés aux administrateurs afin que les tests puissent attacher du contexte de canal de message sans prétendre livrer à l'extérieur.
  - Lorsque `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND` n'est pas défini, le test utilise la commande acpx configurée/bundlée. Si votre auth de harnais dépend des variables d'environnement de `~/.profile`, préférez une commande `acpx` personnalisée qui préserve l'environnement du provider.

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

- Le runner Docker se trouve à `scripts/test-live-acp-bind-docker.sh`.
- Il source `~/.profile`, copie le répertoire d'auth CLI correspondant (`~/.claude` ou `~/.codex`) dans le conteneur, installe `acpx` dans un préfixe npm inscriptible, puis installe le CLI live demandé (`@anthropic-ai/claude-code` ou `@openai/codex`) s'il est manquant.
- Dans Docker, le runner définit `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` afin qu'acpx garde les variables d'environnement du provider du profil sourcé disponibles pour le CLI de harnais enfant.

### Recettes live recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, test de fumée de la passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel d'outil sur plusieurs providers :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé d'API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise l'API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison d'agent style Cloud Code Assist).
- `google-gemini-cli/...` utilise le CLI Gemini local sur votre machine (auth distincte + particularités des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle l'API Gemini hébergée par Google via HTTP (clé API / auth de profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw appelle un binaire `gemini` local ; il possède sa propre auth et peut se comporter différemment (streaming/support d'outil/décalage de version).

## Live : matrice de modèles (ce que nous couvrons)

Il n'y a pas de « liste de modèles CI » fixe (live est optionnel), mais ce sont les modèles **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de test de fumée moderne (appel d'outil + image)

C'est l'exécution « modèles communs » que nous nous attendons à voir fonctionner :

- OpenAI (non-Codex) : `openai/gpt-5.2` (optionnel : `openai/gpt-5.1`)
- OpenAI Codex : `openai-codex/gpt-5.4`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (API Gemini) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (éviter les anciens modèles Gemini 2.x)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Exécuter le test de fumée de la passerelle avec outils + image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Référence : appel d'outil (Read + Exec optionnel)

Choisissez au moins un par famille de provider :

- OpenAI : `openai/gpt-5.2` (ou `openai/gpt-5-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Couverture supplémentaire optionnelle (idéal à avoir) :

- xAI : `xai/grok-4` (ou la dernière version disponible)
- Mistral : `mistral/`… (choisissez un modèle compatible « tools » que vous avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; l'appel d'outils dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un modèle compatible image dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes vision de Claude/Gemini/OpenAI, etc.) pour tester la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez des clés activées, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (centaines de modèles ; utilisez `openclaw models scan` pour trouver les candidats compatibles outils+image)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

D'autres fournisseurs que vous pouvez inclure dans la matrice live (si vous avez des identifiants/config) :

- Intégrés : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Conseil : n'essayez pas de coder en dur « tous les modèles » dans la documentation. La liste faisant autorité est tout ce que `discoverModels(...)` renvoie sur votre machine + toutes les clés disponibles.

## Identifiants (ne jamais committer)

Les tests live découvrent les identifiants de la même manière que le CLI. Implications pratiques :

- Si la CLI fonctionne, les tests en direct devraient trouver les mêmes clés.
- Si un test en direct indique « no creds », déboguez de la même manière que vous débogueriez `openclaw models list` / la sélection de modèle.

- Stockage de profil : `~/.openclaw/credentials/` (préféré ; ce que signifie « clés de profil » dans les tests)
- Configuration : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Par défaut, les exécutions locales en direct copient la configuration active ainsi que les magasins d'authentification dans un répertoire de test temporaire ; les substitutions de chemin `agents.*.workspace` / `agentDir` sont supprimées dans cette copie intermédiaire afin que les sondes restent en dehors de votre espace de travail hôte réel.

Si vous souhaitez vous fier aux clés d'environnement (par exemple, exportées dans votre `~/.profile`), exécutez les tests locaux après `source ~/.profile`, ou utilisez les exécuteurs Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Deepgram en direct (transcription audio)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan en direct

- Test : `src/agents/byteplus.live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Remplacement de modèle facultatif : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Génération d'images en direct

- Test : `src/image-generation/runtime.live.test.ts`
- Commande : `pnpm test:live src/image-generation/runtime.live.test.ts`
- Portée :
  - Énumère chaque plugin fournisseur de génération d'images enregistré
  - Charge les variables d'environnement fournisseur manquantes depuis votre shell de connexion (`~/.profile`) avant les sondages
  - Utilise par défaut les clés API en direct/environnement avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les informations d'identification réelles du shell
  - Ignore les fournisseurs sans authentification/profil/modèle utilisable
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
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification par magasin de profils et ignorer les substitutions uniquement environnementales

## Runners Docker (vérifications optionnelles « fonctionne sous Docker »)

Ces runners Docker sont divisés en deux catégories :

- Runners de modèles en direct : `test:docker:live-models` et `test:docker:live-gateway` exécutent `pnpm test:live` à l'intérieur de l'image Docker du dépôt, en montant votre répertoire de configuration local et votre espace de travail (et en sourçant `~/.profile` s'il est monté).
- Runners de test de fumée de conteneurs : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels` et `test:docker:plugins` démarrant un ou plusieurs conteneurs réels et vérifiant les chemins d'intégration de niveau supérieur.

Les runners Docker de modèles en direct effectuent également un bind-mount uniquement des répertoires d'authentification CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution, afin que CLI externe OAuth puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- Test de fumée de liaison ACP : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh`)
- Test de fumée du backend CLI : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Gateway + agent de développement : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Test de fumée en direct Open WebUI : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Assistant d'intégration (TTY, échafaudage complet) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Réseau Gateway (deux conteneurs, auth WS + santé) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- Pont de canal MCP (Gateway amorcé + pont stdio + test de fumée de trame de notification Claude brut) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (test de fumée d'installation + alias `/plugin` + sémantique de redémarrage du bundle Claude) : `pnpm test:docker:plugins` (script : `scripts/e2e/plugins-docker.sh`)

Les exécuteurs Docker de modèle en direct (live-model) montent également la copie de travail actuelle en lecture seule (bind-mount) et la placent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest sur votre configuration et votre code source exacts. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` afin que les sondes en direct du Gateway ne démarrent pas de vrais workers de canal Docker/Telegram/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, faites donc passer `OPENCLAW_LIVE_GATEWAY_*` également lorsque vous devez restreindre ou exclure la couverture en direct du Gateway de cette voie Discord. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur Gateway Docker avec les points de terminaison HTTP compatibles OpenClaw activés, démarre un conteneur Open WebUI épinglé contre ce Gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une vraie demande de chat via le proxy `/api/chat/completions` d'Open WebUI. La première exécution peut être sensiblement plus lente car OpenAI peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid. Cette voie attend une clé de modèle en direct utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir lors des exécutions Dockerisées. Les exécutions réussies impriment une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un vrai compte Docker, Telegram ou Discord. Il démarre un conteneur Gateway amorcé, démarre un deuxième conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte de conversations acheminées, la lecture des transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements en direct, le routage d'envoi sortant et les notifications de canal et d'autorisations de style Claude sur le vrai pont MCP stdio. La vérification des notifications inspecte directement les trames MCP stdio brutes, de sorte que le test valide ce que le pont émet réellement, et non seulement ce qu'un SDK client spécifique se trouve à exposer.

Test de fumée manuel de fil en langage clair ACP (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les flux de travail de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils ACP, ne le supprimez donc pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (par défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (par défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (par défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (par défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installations CLI mises en cache dans Docker
- Les répertoires d'auth externes CLI sous `$HOME` sont montés en lecture seule sous `/host-auth/...`, puis copiés dans `/home/node/...` avant le début des tests
  - Par défaut : monter tous les répertoires pris en charge (`.codex`, `.claude`, `.minimax`)
  - Les exécutions restreintes de provider ne montent que les répertoires nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour s'assurer que les identifiants proviennent du magasin de profils (et non de l'env)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le model exposé par la passerie pour le test de fumée Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification du nonce utilisée par le test de fumée Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer le tag d'image Open WebUI épinglé

## Sanité de la documentation

Exécuter les vérifications de docs après les modifications : `pnpm check:docs`.
Exécuter la validation complète des ancres Mintlify lorsque vous avez également besoin de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûr pour CI)

Il s'agit de régressions de « vrai pipeline » sans vrais providers :

- Appel d'outil Gateway (mock OpenAI, vraie passerie + boucle d'agent) : `src/gateway/gateway.test.ts` (cas : "exécute un appel d'outil OpenAI simulé de bout en bout via la boucle d'agent de la passerie")
- Assistant de configuration du Gateway (WS `wizard.start`/`wizard.next`, écrit la config + auth appliquée) : `src/gateway/gateway.test.ts` (cas : "exécute l'assistant via ws et écrit la config du jeton d'auth")

## Évaluations de la fiabilité de l'agent (skills)

Nous avons déjà quelques tests sûrs pour la CI qui se comportent comme des « évaluations de la fiabilité de l'agent » :

- Simulation des appels d'outils via la boucle réelle du Gateway et de l'agent (`src/gateway/gateway.test.ts`).
- Bout en bout des flux de l'assistant qui valident le câblage de session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les skills (voir [Skills](/en/tools/skills)) :

- **Prise de décision :** lorsque les skills sont listés dans le prompt, l'agent choisit-il le bon skill (ou évite-t-il ceux qui ne sont pas pertinents) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de workflow :** scénarios à plusieurs tours qui affirment l'ordre des outils, le report de l'historique de session et les limites du bac à sable.

Les évaluations futures doivent d'abord rester déterministes :

- Un exécuteur de scénarios utilisant des providers simulés pour affirmer les appels d'outils + l'ordre, les lectures de fichiers de skills et le câblage de session.
- Une petite suite de scénarios axés sur les skills (utilisation vs évitement, restriction, injection de prompt).
- Évaluations en direct optionnelles (opt-in, limitées par l'environnement) uniquement après la mise en place de la suite sûre pour la CI.

## Tests de contrat (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son
contrat d'interface. Ils parcourent tous les plugins découverts et exécutent une suite
d'assertions sur la forme et le comportement. La voie unitaire `pnpm test` par défaut
ignore intentionnellement ces fichiers communs de seam et de smoke ; exécutez les commandes de contrat explicitement
lorsque vous touchez aux surfaces partagées du channel ou du provider.

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
- **actions** - Gestionnaires d'actions du channel
- **threading** - Gestion de l'ID de fil de discussion
- **directory** - API de répertoire/ liste
- **group-policy** - Application de la stratégie de groupe

### Contrats de statut de fournisseur

Situé dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sonde de statut de canal
- **registry** - Structure du registre de plugins

### Contrats de fournisseur

Situé dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection d'authentification
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

Les tests contractuels s'exécutent dans la CI et ne nécessitent pas de clés API réelles.

## Ajouter des régressions (conseils)

Lorsque vous corrigez un problème de fournisseur/modèle découvert en direct :

- Ajoutez si possible une régression sûre pour la CI (fournisseur simulé/bouchon, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement en direct uniquement (limites de débit, stratégies d'authentification), gardez le test en direct étroit et optionnel via des variables d'environnement
- Privilégiez le ciblage de la plus petite couche qui détecte le bogue :
  - bogue de conversion/relecture de requête de fournisseur → test direct des modèles
  - bogue de pipeline de session/historique/outils de la passerelle → test de fumée en direct de la passerelle ou test simulé de la passerelle sûr pour la CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les ID d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille cible SecretRef `includeInPlan` dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les ID cible non classifiés afin que les nouvelles classes ne puissent pas être ignorées silencieusement.
