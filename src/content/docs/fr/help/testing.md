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
- Fichiers : `src/**/*.test.ts`, `extensions/**/*.test.ts`
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
  - Pour les exécutions locales en surface uniquement, les voies partagées unit, extension et channel peuvent faire chevaucher leurs points isolés au lieu d'attendre derrière un préfixe série unique.
  - Pour les exécutions locales multi-surfaces, le wrapper garde les phases de surface partagées ordonnées, mais les lots à l'intérieur de la même phase partagée se déploient désormais ensemble, le travail isolé différé peut chevaucher la prochaine phase partagée, et la marge de manœuvre `unit-fast` disponible lance désormais ce travail différé plus tôt au lieu de laisser ces emplacements inactifs.
  - Rafraîchissez les instantanés de minutage avec `pnpm test:perf:update-timings` et `pnpm test:perf:update-timings:extensions` après des modifications importantes de la forme de la suite.
- Note concernant le runner intégré :
  - Lorsque vous modifiez les entrées de découverte des outils de message ou le contexte d'exécution de la compactage,
    gardez les deux niveaux de couverture.
  - Ajoutez des régressions d'assistants ciblées pour les limites de routage/normalisation pures.
  - Maintenez également les suites d'intégration du runner intégré en bonne santé :
    `src/agents/pi-embedded-runner/compact.hooks.test.ts`,
    `src/agents/pi-embedded-runner/run.overflow-compaction.test.ts` et
    `src/agents/pi-embedded-runner/run.overflow-compaction.loop.test.ts`.
  - Ces suites vérifient que les identifiants délimités et le comportement de compactage circulent toujours
    à travers les vrais chemins `run.ts` / `compact.ts` ; les tests d'assistants uniquement ne constituent pas
    un substitut suffisant pour ces chemins d'intégration.
- Note sur le pool :
  - La configuration de base de Vitest utilise toujours `forks` par défaut.
  - Les voies d'unité, de canal, d'extension et de wrapper de passerelle utilisent toutes `forks` par défaut.
  - Les configurations d'unité, de canal et d'extension utilisent `isolate: false` par défaut pour un démarrage de fichier plus rapide.
  - `pnpm test` transmet également `--isolate=false` au niveau du wrapper.
  - Opter à nouveau pour l'isolement des fichiers Vitest avec `OPENCLAW_TEST_ISOLATE=1 pnpm test`.
  - `OPENCLAW_TEST_NO_ISOLATE=0` ou `OPENCLAW_TEST_NO_ISOLATE=false` forcent également des exécutions isolées.
- Note sur l'itération locale rapide :
  - `pnpm test:changed` exécute le wrapper avec `--changed origin/main`.
  - `pnpm test:changed:max` conserve le même filtre de fichiers modifiés mais utilise le profil de planificateur local agressif du wrapper.
  - `pnpm test:max` expose ce même profil de planificateur pour une exécution locale complète.
  - Sur les versions locales de Node prises en charge, y compris Node 25, le profil normal peut utiliser le parallélisme au niveau des voies (lanes). `pnpm test:max` pousse toujours le planificateur plus fort lorsque vous souhaitez une exécution locale plus agressive.
  - La configuration de base de Vitest marque les fichiers manifestes/configuration du wrapper comme `forceRerunTriggers` afin que les réexécutions en mode modifié restent correctes lorsque les entrées du planificateur changent.
  - Le wrapper garde `OPENCLAW_VITEST_FS_MODULE_CACHE` activé sur les hôtes pris en charge, mais assigne un `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH` local à la voie afin que les processus Vitest simultanés n'entrent pas en compétition pour un répertoire de cache expérimental partagé.
  - Définissez `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/abs/path` si vous souhaitez un emplacement de cache explicite pour un profilage direct en exécution unique.
- Note de débogage des performances :
  - `pnpm test:perf:imports` active le rapport de durée d'importation Vitest ainsi que la sortie de la répartition des imports.
  - `pnpm test:perf:imports:changed` limite la même vue de profilage aux fichiers modifiés depuis `origin/main`.
  - `pnpm test:perf:profile:main` écrit un profil CPU du thread principal pour le démarrage et la surcharge de transformation de Vitest/Vite.
  - `pnpm test:perf:profile:runner` écrit des profils CPU+tas pour le lanceur de la suite unitaire avec le parallélisme de fichiers désactivé.

### E2E (gateway smoke)

- Commande : `pnpm test:e2e`
- Config : `vitest.e2e.config.ts`
- Fichiers : `src/**/*.e2e.test.ts`, `test/**/*.e2e.test.ts`
- Runtime par défaut :
  - Utilise `forks` de Vitest pour un isolement déterministe entre fichiers.
  - Utilise des workers adaptatifs (CI : jusqu'à 2, local : 1 par défaut).
  - S'exécute en mode silencieux par défaut pour réduire la surcharge d'E/S de la console.
- Substitutions utiles :
  - `OPENCLAW_E2E_WORKERS=<n>` pour forcer le nombre de workers (plafonné à 16).
  - `OPENCLAW_E2E_VERBOSE=1` pour réactiver la sortie console verbeuse.
- Portée :
  - Comportement de bout en bout de la passerelle multi-instance
  - Surfaces WebSocket/HTTP, appairage de nœuds et réseau plus complexe
- Attentes :
  - S'exécute dans la CI (lorsqu'elle est activée dans le pipeline)
  - Aucune vraie clé requise
  - Plus de pièces mobiles que les tests unitaires (peut être plus lent)

### E2E : test de fumée du backend OpenShell

- Commande : `pnpm test:e2e:openshell`
- Fichier : `test/openshell-sandbox.e2e.test.ts`
- Portée :
  - Démarre une passerelle OpenShell isolée sur l'hôte via Docker
  - Crée un bac à sable (sandbox) à partir d'un Dockerfile local temporaire
  - Exerce le backend OpenShell d'OpenClaw sur de véritables `sandbox ssh-config` + exec SSH
  - Vérifie le comportement du système de fichiers canonique distant via le pont fs du bac à sable
- Attentes :
  - Optionnel uniquement ; ne fait pas partie de l'exécution `pnpm test:e2e` par défaut
  - Nécessite un CLI `openshell` local ainsi qu'un démon Docker fonctionnel
  - Utilise des `HOME` / `XDG_CONFIG_HOME` isolés, puis détruit la passerelle de test et le bac à sable
- Substitutions utiles :
  - `OPENCLAW_E2E_OPENSHELL=1` pour activer le test lors de l'exécution manuelle de la suite e2e plus large
  - `OPENCLAW_E2E_OPENSHELL_COMMAND=/path/to/openshell` pour pointer vers un binaire CLI non par défaut ou un script de wrapping

### Live (vrais fournisseurs + vrais modèles)

- Commande : `pnpm test:live`
- Config : `vitest.live.config.ts`
- Fichiers : `src/**/*.live.test.ts`
- Par défaut : **activé** par `pnpm test:live` (définit `OPENCLAW_LIVE_TEST=1`)
- Portée :
  - “Ce provider/model fonctionne-t-il réellement _aujourd’hui_ avec de vraies identifiants ?”
  - Détecter les changements de format du provider, les bizarreries des appels d'outils, les problèmes d'authentification et le comportement des limites de taux
- Attentes :
  - Pas stable en CI par conception (réseaux réels, politiques de provider réelles, quotas, pannes)
  - Coûte de l'argent / utilise les limites de débit
  - Privilégiez l'exécution de sous-ensembles restreints plutôt que de « tout »
- Live exécute la source `~/.profile` pour récupérer les clés API manquantes.
- Par défaut, les exécutions en direct isolent toujours `HOME` et copient le matériel de configuration/d'authentification dans un répertoire de test temporaire, afin que les fixtures unitaires ne puissent pas modifier votre vrai `~/.openclaw`.
- Définissez `OPENCLAW_LIVE_USE_REAL_HOME=1` uniquement lorsque vous avez intentionnellement besoin que les tests en direct utilisent votre véritable répertoire personnel.
- `pnpm test:live` utilise désormais par défaut un mode plus silencieux : il conserve la sortie de progression `[live] ...`, mais supprime l'avis `~/.profile` supplémentaire et réduit les journaux de démarrage de la passerelle/les bavardages Bonjour. Définissez `OPENCLAW_LIVE_TEST_QUIET=0` si vous souhaitez récupérer les journaux de démarrage complets.
- Rotation des clés API (spécifique au fournisseur) : définissez `*_API_KEYS` avec un format virgule/point-virgule ou `*_API_KEY_1`, `*_API_KEY_2` (par exemple `OPENAI_API_KEYS`, `ANTHROPIC_API_KEYS`, `GEMINI_API_KEYS`) ou une substitution par test via `OPENCLAW_LIVE_*_KEY` ; les tests réessayent en cas de réponses de limitation de débit.
- Sortie de progression/témoin d'activité :
  - Les suites Live émettent désormais des lignes de progression vers stderr afin que les appels fournisseurs longs restent visiblement actifs même lorsque la capture de console Vitest est silencieuse.
  - `vitest.live.config.ts` désactive l'interception de la console Vitest afin que les lignes de progression du fournisseur/de la passerelle diffusent immédiatement lors des exécutions en direct.
  - Ajustez les signaux de présence directe du model avec `OPENCLAW_LIVE_HEARTBEAT_MS`.
  - Ajustez les signaux de présence de la passerelle/sonde avec `OPENCLAW_LIVE_GATEWAY_HEARTBEAT_MS`.

## Quelle suite dois-je exécuter ?

Utilisez ce tableau de décision :

- Modification de la logique/tests : exécutez `pnpm test` (et `pnpm test:coverage` si vous avez apporté beaucoup de modifications)
- Modification du réseau de la passerelle / protocole WS / appairage : ajoutez `pnpm test:e2e`
- Débogage de « mon bot est en panne » / échecs spécifiques au fournisseur / appel d'outils : exécutez un `pnpm test:live` réduit

## En direct : balayage des capacités des nœuds Android

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : appeler **toutes les commandes actuellement annoncées** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préconditionnée/manuelle (la suite n'installe/exécute/associe pas l'application).
  - Validation commande par commande de la passerelle `node.invoke` pour le nœud Android sélectionné.
- Configuration préalable requise :
  - Application Android déjà connectée et associée à la passerelle.
  - Application maintenue au premier plan.
  - Autorisations/consentement de capture accordés pour les fonctionnalités que vous vous attendez à voir réussir.
- Remplacements de cibles facultatifs :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Application Android](/en/platforms/android)

## Live : test de fumée du modèle (clés de profil)

Les tests en direct sont divisés en deux couches afin que nous puissions isoler les échecs :

- « Direct model » nous indique si le provider/model peut répondre du tout avec la clé donnée.
- « Gateway smoke » nous indique si le pipeline complet gateway+agent fonctionne pour ce model (sessions, historique, outils, stratégie de bac à sable, etc.).

### Couche 1 : Complétion directe du model (sans gateway)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les modèles découverts
  - Utilisez `getApiKeyForModel` pour sélectionner les modèles pour lesquels vous avez des identifiants
  - Exécuter une petite complétion par model (et des régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour modern) pour exécuter réellement cette suite ; sinon, elle est ignorée pour garder `pnpm test:live` axé sur le gateway smoke
- Comment sélectionner les modèles :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,..."` (liste d'autorisation par virgule)
- Comment sélectionner les providers :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation par virgule)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis d'environnement
  - Définir `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour appliquer uniquement le **magasin de profils**
- Pourquoi cela existe :
  - Sépare « l'API du provider est cassée / la clé est invalide » de « le pipeline de l'agent gateway est cassé »
  - Contient de petites régressions isolées (exemple : OpenAI Responses/Codex Responses rejeu du raisonnement + flux d'appels d'outil)

### Couche 2 : Gateway + test de fumée de l'agent de développement (ce que « @openclaw » fait réellement)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une gateway en cours de processus
  - Créer/corriger une `agent:dev:*` session (surcharge de model par exécution)
  - Parcourir les modèles avec clés et vérifier :
    - réponse « significative » (pas d'outils)
    - une invocation d'outil réel fonctionne (sonde de lecture)
    - sondes d'outil supplémentaires optionnelles (sonde exec+read)
    - OpenAI chemins de régression (tool-call-only → suivi) continuent de fonctionner
- Détails des sondes (afin que vous puissiez expliquer rapidement les échecs) :
  - `read` sonde : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - `exec+read` sonde : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le model renvoie `cat <CODE>`.
  - Référence de mise en œuvre : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Comment sélectionner les models :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet/Haiku 4.5, GPT-5.x + Codex, Gemini 3, GLM 4.7, MiniMax M2.7, Grok 4)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou liste séparée par des virgules) pour restreindre
- Comment sélectionner les fournisseurs (éviter « OpenRouter tout ») :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondages d'outil et d'image sont toujours activés dans ce test en direct :
  - Sondage `read` + sondage `exec+read` (stress de l'outil)
  - le sondage d'image s'exécute lorsque le model annonce la prise en charge des entrées d'image
  - Flux (haut niveau) :
    - Test génère un petit PNG avec « CAT » + un code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message multimodal de l'utilisateur au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

Astuce : pour voir ce que vous pouvez tester sur votre machine (et les ids exacts de `provider/model`), lancez :

```bash
openclaw models list
openclaw models list --json
```

## Live : test de fumée du setup-token Anthropic

- Test : `src/agents/anthropic.setup-token.live.test.ts`
- Objectif : vérifier que le setup-token de la CLI Claude Code (ou un profil de setup-token collé) peut compléter un prompt Anthropic.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
  - `OPENCLAW_LIVE_SETUP_TOKEN=1`
- Sources de jetons (choisissez-en une) :
  - Profil : `OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test`
  - Jeton brut : `OPENCLAW_LIVE_SETUP_TOKEN_VALUE=sk-ant-oat01-...`
- Remplacement de modèle (optionnel) :
  - `OPENCLAW_LIVE_SETUP_TOKEN_MODEL=anthropic/claude-opus-4-6`

Exemple de configuration :

```bash
openclaw models auth paste-token --provider anthropic --profile-id anthropic:setup-token-test
OPENCLAW_LIVE_SETUP_TOKEN=1 OPENCLAW_LIVE_SETUP_TOKEN_PROFILE=anthropic:setup-token-test pnpm test:live src/agents/anthropic.setup-token.live.test.ts
```

## Live : CLI backend smoke (Claude Code CLI ou autres CLI locales)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline Gateway + agent en utilisant un backend CLI local, sans toucher à votre configuration par défaut.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
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
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une vraie pièce jointe image (les chemins sont injectés dans le prompt).
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins de fichiers image comme args CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la façon dont les args image sont passés quand `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un second tour et valider le flux de reprise.
- `OPENCLAW_LIVE_CLI_BACKEND_DISABLE_MCP_CONFIG=0` pour garder la config MCP du CLI Claude Code activée (désactive la config MCP par défaut avec un fichier vide temporaire).

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

- Le runner Docker se trouve à `scripts/test-live-cli-backend-docker.sh`.
- Il exécute le test de fumée du backend CLI en direct dans l'image Docker du dépôt en tant qu'utilisateur non-root `node`, car Claude CLI rejette `bypassPermissions` lorsqu'il est invoqué en tant que root.
- Pour `claude-cli`, il installe le paquet `@anthropic-ai/claude-code` Linux dans un préfixe inscriptible mis en cache à `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (par défaut : `~/.cache/openclaw/docker-cli-tools`).
- Il copie `~/.claude` dans le conteneur lorsqu'il est disponible, mais sur les machines où l'authentification Claude est sauvegardée par `ANTHROPIC_API_KEY`, il préserve également `ANTHROPIC_API_KEY` / `ANTHROPIC_API_KEY_OLD` pour le CLI Claude enfant via `OPENCLAW_LIVE_CLI_BACKEND_PRESERVE_ENV`.

## Live : Test de fumée de liaison ACP (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de liaison de conversation ACP avec un agent ACP en direct :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation synthétique de message-channel à la place
  - envoyer un suivi normal sur cette même conversation
  - vérifier que le suivi atterrit dans la transcription de session ACP liée
- Activation :
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Valeurs par défaut :
  - Agent ACP : `claude`
  - Canal synthétique : contexte de conversation style Slack DM
  - Backend ACP : `acpx`
- Remplacements :
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=claude`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=codex`
  - `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=/full/path/to/acpx`
- Notes :
  - Ce couloir utilise la surface `chat.send` de la passerelle avec des champs de route d'origine synthétiques réservés aux administrateurs, permettant aux tests d'attacher le contexte du message-channel sans prétendre livrer à l'extérieur.
  - Lorsque `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND` n'est pas défini, le test utilise la commande acpx configurée/bundlée. Si l'auth de votre harnais dépend des variables d'environnement de `~/.profile`, préférez une commande personnalisée `acpx` qui préserve l'environnement du fournisseur.

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
- Il sourcé `~/.profile`, copie le domicile d'auth CLI correspondant (`~/.claude` ou `~/.codex`) dans le conteneur, installe `acpx` dans un préfixe npm inscriptible, puis installe le CLI live demandé (`@anthropic-ai/claude-code` ou `@openai/codex`) si manquant.
- À l'intérieur de Docker, le runner définit `OPENCLAW_LIVE_ACP_BIND_ACPX_COMMAND=$HOME/.npm-global/bin/acpx` afin qu'acpx garde les variables d'environnement du fournisseur du profil sourcé disponibles pour le CLI harnais enfant.

### Recettes live recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.2" pnpm test:live src/agents/models.profiles.live.test.ts`

- Modèle unique, smoke de passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel d'outil sur plusieurs fournisseurs :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé d'API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

Notes :

- `google/...` utilise l'API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison d'agent de style Cloud Code Assist).
- `google-gemini-cli/...` utilise le CLI Gemini local sur votre machine (authentification séparée + particularités des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle l'API Gemini hébergée par Google via HTTP (clé API / auth de profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw fait appel à un binaire `gemini` local ; il possède sa propre authentification et peut se comporter différemment (streaming/tool support/version skew).

## Live : matrice des models (ce que nous couvrons)

Il n'y a pas de « liste de models CI » fixe (live est optionnel), mais voici les models **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de smoke moderne (tool calling + image)

C'est la série de « models courants » que nous nous attendons à voir continuer de fonctionner :

- OpenAI (non-Codex) : `openai/gpt-5.2` (optionnel : `openai/gpt-5.1`)
- OpenAI Codex : `openai-codex/gpt-5.4`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (Gemini API) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (éviter les anciens models Gemini 2.x)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Exécuter le test de fumée de la passerelle avec les outils + l'image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.2,openai-codex/gpt-5.4,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,zai/glm-4.7,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Référence : appel d'outils (Read + Exec optionnel)

Choisissez au moins un par famille de provider :

- OpenAI : `openai/gpt-5.2` (ou `openai/gpt-5-mini`)
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- Z.AI (GLM) : `zai/glm-4.7`
- MiniMax : `minimax/MiniMax-M2.7`

Couverture supplémentaire optionnelle (la bienvenue) :

- xAI : `xai/grok-4` (ou la dernière disponible)
- Mistral : `mistral/`… (choisissez un modèle capable d'utiliser les "tools" que vous avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; tool calling depends on API mode)

### Vision : image send (attachment → multimodal message)

Include at least one image-capable model in `OPENCLAW_LIVE_GATEWAY_MODELS` (Claude/Gemini/OpenAI vision-capable variants, etc.) to exercise the image probe.

### Aggregators / alternate gateways

If you have keys enabled, we also support testing via :

- OpenRouter : `openrouter/...` (hundreds of models ; use `openclaw models scan` to find tool+image capable candidates)
- OpenCode : `opencode/...` for Zen and `opencode-go/...` for Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

More providers you can include in the live matrix (if you have creds/config) :

- Intégré : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

Astuce : n'essayez pas de coder en dur « tous les modèles » dans la documentation. La liste faisant autorité est tout ce que `discoverModels(...)` renvoie sur votre machine + toutes les clés disponibles.

## Identifiants (ne jamais les valider)

Les tests en direct découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests en direct devraient trouver les mêmes clés.
- Si un test en direct indique « pas d'identifiants », débuggez de la même manière que vous débuggeriez `openclaw models list` / la sélection de modèle.

- Stockage de profil : `~/.openclaw/credentials/` (préféré ; ce que signifie « clés de profil » dans les tests)
- Configuration : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Les exécutions locales en direct copient par défaut la configuration active plus les magasins d'authentification dans un dossier de test temporaire ; les remplacements de chemin `agents.*.workspace` / `agentDir` sont supprimés dans cette copie intermédiaire afin que les sondes restent hors de votre espace de travail hôte réel.

Si vous souhaitez vous appuyer sur les clés d'environnement (par exemple exportées dans votre `~/.profile`), exécutez les tests locaux après `source ~/.profile`, ou utilisez les runners Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Deepgram live (transcription audio)

- Test : `src/media-understanding/providers/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live src/media-understanding/providers/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- Test : `src/agents/byteplus.live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live src/agents/byteplus.live.test.ts`
- Remplacement optionnel du model : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Génération d'images live

- Test : `src/image-generation/runtime.live.test.ts`
- Commande : `pnpm test:live src/image-generation/runtime.live.test.ts`
- Portée :
  - Énumère chaque plugin de fournisseur d'image-génération enregistré
  - Charge les variables d'environnement du fournisseur manquantes depuis votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API en direct/environnement plutôt que les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les informations d'identification réelles du shell
  - Ignore les fournisseurs sans authentification/profil/model utilisable
  - Exécute les variantes de génération d'images standard via la capacité d'exécution partagée :
    - `google:flash-generate`
    - `google:pro-generate`
    - `google:pro-edit`
    - `openai:default-generate`
- Fournisseurs groupés actuels couverts :
  - `openai`
  - `google`
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-1,google/gemini-3.1-flash-image-preview"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit"`
- Comportement d'authentification optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification du magasin de profils et ignorer les remplacements uniquement environnementaux

## Runners Docker (vérifications optionnelles « fonctionne sous Linux »)

Ces runners Docker sont divisés en deux catégories :

- Live-model runners : `test:docker:live-models` et `test:docker:live-gateway` exécutent `pnpm test:live` à l'intérieur de l'image Docker du dépôt, en montant votre répertoire de configuration local et votre espace de travail (et en sourçant `~/.profile` s'il est monté).
- Container smoke runners : `test:docker:openwebui`, `test:docker:onboard`, `test:docker:gateway-network`, `test:docker:mcp-channels`, et `test:docker:plugins` démarent un ou plusieurs conteneurs réels et vérifient les chemins d'intégration de plus haut niveau.

Les runners Docker Live-model montent également uniquement les répertoires d'authentification CLI nécessaires (ou tous ceux pris en charge lorsque l'exécution n'est pas restreinte), puis les copient dans le répertoire personnel du conteneur avant l'exécution afin que l'OAuth CLI externe puisse actualiser les jetons sans modifier le stockage d'authentification de l'hôte :

- Modèles directs : `pnpm test:docker:live-models` (script : `scripts/test-live-models-docker.sh`)
- ACP bind smoke : `pnpm test:docker:live-acp-bind` (script : `scripts/test-live-acp-bind-docker.sh`)
- CLI backend smoke : `pnpm test:docker:live-cli-backend` (script : `scripts/test-live-cli-backend-docker.sh`)
- Gateway + dev agent : `pnpm test:docker:live-gateway` (script : `scripts/test-live-gateway-models-docker.sh`)
- Open WebUI live smoke : `pnpm test:docker:openwebui` (script : `scripts/e2e/openwebui-docker.sh`)
- Onboarding wizard (TTY, full scaffolding) : `pnpm test:docker:onboard` (script : `scripts/e2e/onboard-docker.sh`)
- Gateway networking (two containers, WS auth + health) : `pnpm test:docker:gateway-network` (script : `scripts/e2e/gateway-network-docker.sh`)
- MCP channel bridge (seeded Gateway + stdio bridge + raw Claude notification-frame smoke) : `pnpm test:docker:mcp-channels` (script : `scripts/e2e/mcp-channels-docker.sh`)
- Plugins (install smoke + `/plugin` alias + Claude-bundle restart semantics): `pnpm test:docker:plugins` (script: `scripts/e2e/plugins-docker.sh`)

Les exécuteurs Docker du modèle live montent également l'extraction actuelle (checkout) en lecture seule (bind-mount) et la placent dans un répertoire de travail temporaire à l'intérieur du conteneur. Cela permet de garder l'image d'exécution légère tout en exécutant Vitest par rapport à votre source/configuration locale exacte. Ils définissent également `OPENCLAW_SKIP_CHANNELS=1` afin que les sondes live du Gateway ne démurrent pas de véritables workers de canal Telegram/Discord/etc. à l'intérieur du conteneur. `test:docker:live-models` exécute toujours `pnpm test:live`, donc transmettez également `OPENCLAW_LIVE_GATEWAY_*` lorsque vous devez restreindre ou exclure la couverture live du Gateway de cette ligne Docker. `test:docker:openwebui` est un test de fumée de compatibilité de plus haut niveau : il démarre un conteneur Gateway OpenClaw avec les points de terminaison HTTP compatibles OpenAI activés, démarre un conteneur Open WebUI épinglé contre ce Gateway, se connecte via Open WebUI, vérifie que `/api/models` expose `openclaw/default`, puis envoie une vraie demande de chat via le proxy `/api/chat/completions` d'Open WebUI. La première exécution peut être sensiblement plus lente car Docker peut avoir besoin de tirer l'image Open WebUI et Open WebUI peut avoir besoin de terminer sa propre configuration de démarrage à froid (cold-start). Cette ligne attend une clé de modèle live utilisable, et `OPENCLAW_PROFILE_FILE` (`~/.profile` par défaut) est le moyen principal de la fournir dans les exécutions Telegram. Les exécutions réussies affichent une petite charge utile JSON comme `{ "ok": true, "model": "openclaw/default", ... }`. `test:docker:mcp-channels` est intentionnellement déterministe et n'a pas besoin d'un vrai compte Discord, iMessage ou Gateway. Il démarre un conteneur Gateway amorcé, démarre un second conteneur qui génère `openclaw mcp serve`, puis vérifie la découverte des conversations acheminées, les lectures de transcriptions, les métadonnées de pièces jointes, le comportement de la file d'attente d'événements live, le routage d'envoi sortant et les notifications de canal + style Claude sur le véritable pont stdio MCP. La vérification des notifications inspecte directement les trames stdio MCP brutes, de sorte que le test de fumée valide ce que le pont émet réellement, et pas seulement ce qu'un SDK client spécifique se trouve à exposer.

Test de fumée du fil en langage clair ACP manuel (pas CI) :

- `bun scripts/dev/discord-acp-plain-language-smoke.ts --channel <discord-channel-id> ...`
- Conservez ce script pour les flux de travail de régression/débogage. Il pourrait être nécessaire à nouveau pour la validation du routage des fils ACP, donc ne le supprimez pas.

Variables d'environnement utiles :

- `OPENCLAW_CONFIG_DIR=...` (défaut : `~/.openclaw`) monté sur `/home/node/.openclaw`
- `OPENCLAW_WORKSPACE_DIR=...` (défaut : `~/.openclaw/workspace`) monté sur `/home/node/.openclaw/workspace`
- `OPENCLAW_PROFILE_FILE=...` (défaut : `~/.profile`) monté sur `/home/node/.profile` et sourcé avant l'exécution des tests
- `OPENCLAW_DOCKER_CLI_TOOLS_DIR=...` (défaut : `~/.cache/openclaw/docker-cli-tools`) monté sur `/home/node/.npm-global` pour les installations CLI mises en cache dans Docker
- Les répertoires d'auth CLI externes sous `$HOME` sont montés en lecture seule sous `/host-auth/...`, puis copiés dans `/home/node/...` avant le début des tests
  - Par défaut : monter tous les répertoires pris en charge (`.codex`, `.claude`, `.minimax`)
  - Les exécutions de provider restreintes ne montent que les répertoires nécessaires déduits de `OPENCLAW_LIVE_PROVIDERS` / `OPENCLAW_LIVE_GATEWAY_PROVIDERS`
  - Remplacer manuellement avec `OPENCLAW_DOCKER_AUTH_DIRS=all`, `OPENCLAW_DOCKER_AUTH_DIRS=none`, ou une liste séparée par des virgules comme `OPENCLAW_DOCKER_AUTH_DIRS=.claude,.codex`
- `OPENCLAW_LIVE_GATEWAY_MODELS=...` / `OPENCLAW_LIVE_MODELS=...` pour restreindre l'exécution
- `OPENCLAW_LIVE_GATEWAY_PROVIDERS=...` / `OPENCLAW_LIVE_PROVIDERS=...` pour filtrer les providers dans le conteneur
- `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour garantir que les identifiants proviennent du magasin de profils (et non de l'environnement)
- `OPENCLAW_OPENWEBUI_MODEL=...` pour choisir le modèle exposé par la passerelle pour le test de fumée Open WebUI
- `OPENCLAW_OPENWEBUI_PROMPT=...` pour remplacer l'invite de vérification nonce utilisée par le test de fumée Open WebUI
- `OPENWEBUI_IMAGE=...` pour remplacer l'étiquette d'image épinglée Open WebUI

## Cohérence de la documentation

Exécutez les vérifications de documentation après les modifications de docs : `pnpm check:docs`.
Exécutez la validation complète des ancres Mintlify lorsque vous avez besoin également de vérifications des titres dans la page : `pnpm docs:check-links:anchors`.

## Régression hors ligne (sûre pour CI)

Ce sont des régressions de « pipeline réel » sans vrais fournisseurs :

- Appel d'outil Gateway (simul OpenAI, vraie passerelle + boucle d'agent) : `src/gateway/gateway.test.ts` (cas : « exécute un appel d'outil simul OpenAI de bout en bout via la boucle d'agent de la passerelle »)
- Assistant de configuration Gateway (WS `wizard.start`/`wizard.next`, écrit la config + auth appliquée) : `src/gateway/gateway.test.ts` (cas : "runs wizard over ws and writes auth token config")

## Évaluations de fiabilité de l'agent (skills)

Nous avons déjà quelques tests compatibles CI qui se comportent comme des "évaluations de fiabilité de l'agent" :

- Simulation de l'appel d'outil via la boucle réelle de la passerelle et de l'agent (`src/gateway/gateway.test.ts`).
- Flux de bout en bout de l'assistant qui valident le câblage de la session et les effets de configuration (`src/gateway/gateway.test.ts`).

Ce qui manque encore pour les skills (voir [Skills](/en/tools/skills)) :

- **Prise de décision :** lorsque les skills sont répertoriés dans le prompt, l'agent choisit-il le bon skill (ou évite-t-il ceux qui ne sont pas pertinents) ?
- **Conformité :** l'agent lit-il `SKILL.md` avant utilisation et suit-il les étapes/arguments requis ?
- **Contrats de flux de travail :** scénarios à plusieurs tours qui vérifient l'ordre des outils, la conservation de l'historique de session et les limites du bac à sable.

Les évaluations futures doivent d'abord rester déterministes :

- Un exécuteur de scénarios utilisant des fournisseurs factices pour vérifier les appels d'outils + l'ordre, les lectures de fichiers de compétences et le câblage de session.
- Une petite suite de scénarios axés sur les compétences (utilisation vs évitement, verrouillage, injection de prompt).
- Évaluations en direct facultatives (optionnel, restreint par l'environnement) uniquement après la mise en place de la suite sécurisée pour l'IC.

## Tests de contrat (forme du plugin et du channel)

Les tests de contrat vérifient que chaque plugin et channel enregistré est conforme à son contrat d'interface. Ils parcourent tous les plugins découverts et exécutent une suite d'assertions sur la forme et le comportement. La voie unitaire `pnpm test` par défaut ignore intentionnellement ces fichiers partagés de jointure et de fumigation ; exécutez les commandes de contrat explicitement lorsque vous touchez aux surfaces partagées du channel ou du fournisseur.

### Commandes

- Tous les contrats : `pnpm test:contracts`
- Contrats de canal uniquement : `pnpm test:contracts:channels`
- Contrats de fournisseur uniquement : `pnpm test:contracts:plugins`

### Contrats de canal

Situés dans `src/channels/plugins/contracts/*.contract.test.ts` :

- **plugin** - Structure de base du plugin (id, nom, capacités)
- **setup** - Contrat de l'assistant de configuration
- **session-binding** - Comportement de liaison de session
- **outbound-payload** - Structure de la charge utile du message
- **inbound** - Gestion des messages entrants
- **actions** - Gestionnaires d'actions de canal
- **threading** - Gestion de l'ID de fil de discussion
- **directory** - API d'annuaire/liste
- **group-policy** - Application de la stratégie de groupe

### Contrats d'état du fournisseur

Situés dans `src/plugins/contracts/*.contract.test.ts`.

- **status** - Sondes d'état du canal
- **registry** - Structure du registre de plugins

### Contrats de fournisseur

Situés dans `src/plugins/contracts/*.contract.test.ts` :

- **auth** - Contrat de flux d'authentification
- **auth-choice** - Choix/sélection d'authentification
- **catalog** - API du catalogue de API
- **discovery** - Découverte de plugins
- **loader** - Chargement de plugins
- **runtime** - Runtime du provider
- **shape** - Forme/interface du plugin
- **wizard** - Assistant de configuration

### Quand exécuter

- Après avoir modifié les exportations ou les sous-chemins de plugin-sdk
- Après avoir ajouté ou modifié un plugin de channel ou de provider
- Après avoir refactorisé l'enregistrement ou la découverte de plugins

Les tests contractuels s'exécutent dans CI et ne nécessitent pas de clés API réelles.

## Ajouter des régressions (recommandations)

Lorsque vous corrigez un problème de provider/model découvert en live :

- Ajoutez si possible une régression sûre pour CI (provider simulé/stub, ou capturez la transformation exacte de la forme de la requête)
- Si c'est intrinsèquement en live uniquement (limites de débit, stratégies d'authentification), gardez le test live étroit et opt-in via env vars
- Privilégiez le ciblage de la plus petite couche qui détecte le bug :
  - bug de conversion/relecture de requête provider → test direct des models
  - bogue du pipeline session/historique/tool de la passerelle → test de fumée en direct de la passerelle ou test fictif de la passerelle sécurisé pour la CI
- Garde-fou de traversée SecretRef :
  - `src/secrets/exec-secret-ref-id-parity.test.ts` dérive une cible échantillonnée par classe SecretRef à partir des métadonnées du registre (`listSecretTargetRegistryEntries()`), puis affirme que les id d'exécution de segment de traversée sont rejetés.
  - Si vous ajoutez une nouvelle famille de cibles `includeInPlan` SecretRef dans `src/secrets/target-registry-data.ts`, mettez à jour `classifyTargetClass` dans ce test. Le test échoue intentionnellement sur les id de cibles non classées afin que les nouvelles classes ne puissent pas être ignorées silencieusement.
