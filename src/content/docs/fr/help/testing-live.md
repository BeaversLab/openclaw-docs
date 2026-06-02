---
summary: "CLITests en direct (avec accès réseau) : model matrix, backends CLI, ACP, media providers, identifiants"
read_when:
  - Running live model matrix / CLI backend / ACP / media-provider smokes
  - Debugging live-test credential resolution
  - Adding a new provider-specific live test
title: "Tests : suites en direct"
sidebarTitle: "Tests en direct"
---

Pour un démarrage rapide, les exécuteurs QA, les suites de tests unitaires/d'intégration et les flux Docker, consultez
[Testing](Docker/en/help/testingCLI). Cette page couvre les suites de tests **live** (avec accès réseau) :
matrice de modèles, backends CLI, ACP et tests live de fournisseurs de médias, ainsi que
la gestion des identifiants.

## En direct : commandes de fumée locales

Exportez la clé provider nécessaire dans l'environnement de processus avant les vérifications en direct ad hoc.

Smoke de média sécurisé :

```bash
pnpm openclaw infer tts convert --local --json \
  --text "OpenClaw live smoke." \
  --output /tmp/openclaw-live-smoke.mp3
```

Smoke de préparation à l'appel vocal sécurisé :

```bash
pnpm openclaw voicecall setup --json
pnpm openclaw voicecall smoke --to "+15555550123"
```

`voicecall smoke` est un essai à blanc (dry run) sauf si `--yes` est également présent. Utilisez `--yes` uniquement
lorsque vous souhaitez intentionnellement passer un appel de notification réel. Pour Twilio, Telnyx et
Plivo, une vérification de disponibilité réussie nécessite une URL de webhook publique ; les secours de boucle locale/privée
sont rejetés par conception.

## En direct : balayage des capacités de nœud Android

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **toutes les commandes actuellement annoncées** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préconditionnée/manuelle (la suite n'installe pas/n'exécute pas/n'apparie pas l'application).
  - Validation commande par commande de la passerelle `node.invoke`Android pour le nœud Android sélectionné.
- Configuration préalable requise :
  - Application Android déjà connectée et appariée à la passerelle.
  - Application gardée au premier plan.
  - Autorisations/consentement de capture accordés pour les capacités que vous vous attendez à réussir.
- Remplacements de cibles optionnels :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Application Android](/fr/platforms/android)

## En direct : smoke de modèle (clés de profil)

Les tests en direct sont divisés en deux couches afin que nous puissions isoler les échecs :

- "Direct model" nous indique si le provider/model peut répondre du tout avec la clé donnée.
- "Gateway smoke" nous indique si le pipeline complet gateway+agent fonctionne pour ce modèle (sessions, historique, outils, stratégie de sandbox, etc.).

### Couche 1 : Achèvement direct du model (sans passerelle)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les models découverts
  - Utilisez `getApiKeyForModel` pour sélectionner les modèles pour lesquels vous avez des identifiants
  - Exécuter un petit achèvement par model (et régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern`, `small` ou `all` (alias pour moderne) pour exécuter réellement cette suite ; sinon, elle est ignorée pour garder `pnpm test:live` concentré sur le smoke de la passerelle
- Comment sélectionner les models :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.2 + Codex, Gemini 3, DeepSeek V4, GLM 4.7, MiniMax M2.7, Grok 4.3)
  - `OPENCLAW_LIVE_MODELS=small` pour exécuter la liste d'autorisation de petits modèles contraints (itinéraires compatibles locaux Qwen 8B/9B, OpenRouter Qwen/GLM, et Z.AI GLM)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,..."` (liste d'autorisation par virgule)
  - Les parcours modernes/tous et petits utilisent par défaut leurs plafonds curés ; définissez `OPENCLAW_LIVE_MAX_MODELS=0` pour un parcours exhaustif de profils sélectionnés ou un nombre positif pour un plafond plus petit.
  - Les parcours exhaustifs utilisent `OPENCLAW_LIVE_TEST_TIMEOUT_MS` pour le délai d'expiration global du test de modèle direct. Par défaut : 60 minutes.
  - Les sondages de modèle direct s'exécutent avec un parallélisme de 20 voies par défaut ; définissez `OPENCLAW_LIVE_MODEL_CONCURRENCY` pour modifier.
- Comment sélectionner les fournisseurs :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation par virgules)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis env
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'utilisation **uniquement du magasin de profils**
- Pourquoi cela existe :
  - Sépare « l'API du fournisseur est cassée / la clé est invalide » de « le pipeline de l'agent de passerelle est cassé »
  - Contient de petites régressions isolées (exemple : rejeu de raisonnement des réponses OpenAI / réponses Codex + flux d'appels d'outil)

### Layer 2 : Gateway + test de fumée de l'agent de développement (ce que "@openclaw" fait réellement)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une passerelle (gateway) en cours de processus
  - Créer/patcher une session `agent:dev:*` (remplacement de modèle par exécution)
  - Itérer sur les modèles avec clés et vérifier :
    - réponse "significative" (sans outils)
    - une invocation d'outil réelle fonctionne (sonde de lecture)
    - sondes d'outils supplémentaires facultatives (sonde exec+lecture)
    - les chemins de régression OpenAI (outil-appel-uniquement → suivi) continuent de fonctionner
- Détails des sondes (pour pouvoir expliquer rapidement les échecs) :
  - sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de `read` et de renvoyer le nonce.
  - sonde `exec+read` : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read`.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le modèle renvoie `cat <CODE>`.
  - Référence de l'implémentation : `src/gateway/gateway-models.profiles.live.test.ts` et `test/helpers/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.2 + Codex, Gemini 3, DeepSeek V4, GLM 4.7, MiniMax M2.7, Grok 4.3)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou une liste séparée par des virgules) pour restreindre
  - Les balayages modernes/totaux de passerelles (gateway) sont par défaut limités à une sélection hautement significative ; définissez `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` pour un balayage moderne exhaustif ou un nombre positif pour une limite plus petite.
- Comment sélectionner les fournisseurs (éviter "tout OpenRouter") :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondes d'outils et d'images sont toujours activées dans ce test en direct :
  - sonde `read` + sonde `exec+read` (stress des outils)
  - la sonde d'image s'exécute lorsque le modèle annonce la prise en charge des entrées d'images
  - Flux (haut niveau) :
    - Le test génère un petit PNG avec "CAT" + code aléatoire (`test/helpers/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Le Gateway analyse les pièces jointes en Gateway`images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transfère un message multimodal de l'utilisateur au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

<Tip>
Pour voir ce que vous pouvez tester sur votre machine (et les identifiants `provider/model` exacts), exécutez :

```bash
openclaw models list
openclaw models list --json
```

</Tip>

## Live : test de fumee du backend CLI (Claude, Gemini ou autres CLI locaux)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline Gateway + agent en utilisant un backend GatewayCLI local, sans toucher à votre configuration par défaut.
- Les valeurs par défaut du test de fumee spécifique au backend se trouvent dans la définition `cli-backend.ts` de l'extension propriétaire.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Valeurs par défaut :
  - Provider/modèle par défaut : `claude-cli/claude-sonnet-4-6`
  - Le comportement de commande/args/image provient des métadonnées du plugin du backend CLI propriétaire.
- Remplacements (facultatif) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/claude"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["-p","--output-format","json"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une pièce jointe image réelle (les chemins sont injectés dans le prompt). Les recettes Docker désactivent cela par défaut, sauf demande explicite.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins des fichiers image en tant qu'args CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la façon dont les args d'image sont passés quand `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un second tour et valider le flux de reprise.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` pour activer la sonde de continuité de même session Claude Sonnet -> Opus lorsque le modèle sélectionné prend en charge une cible de basculement. Les recettes Docker désactivent cela par défaut pour une fiabilité globale.
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1`Docker pour activer la sonde de bouclage MCP/tool. Les recettes Docker désactivent cela par défaut, sauf si cela est explicitement demandé.

Exemple :

```bash
  OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="claude-cli/claude-sonnet-4-6" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Test de configuration rapide MCP Gemini :

```bash
OPENCLAW_LIVE_TEST=1 \
  pnpm test:live src/agents/cli-runner/bundle-mcp.gemini.live.test.ts
```

Cela ne demande pas à Gemini de générer une réponse. Il écrit les mêmes paramètres système que OpenClaw donne à Gemini, puis exécute `gemini --debug mcp list` pour prouver qu'un serveur `transport: "streamable-http"` enregistré est normalisé au format HTTP MCP de Gemini et peut se connecter à un serveur MCP HTTP diffusable en local.

Recette Docker :

```bash
pnpm test:docker:live-cli-backend
```

Recettes Docker pour fournisseur unique :

```bash
pnpm test:docker:live-cli-backend:claude
pnpm test:docker:live-cli-backend:claude-subscription
pnpm test:docker:live-cli-backend:gemini
```

Notes :

- L'exécuteur Docker se trouve dans `scripts/test-live-cli-backend-docker.sh`.
- Il exécute le test de fumée du backend CLI en direct à l'intérieur de l'image Docker du dépôt en tant qu'utilisateur `node` non root.
- Il résout les métadonnées de test de fumée CLI à partir de l'extension propriétaire, puis installe le paquet Linux CLI correspondant (`@anthropic-ai/claude-code` ou `@google/gemini-cli`) dans un préfixe inscriptible mis en cache à `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (par défaut : `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` nécessite un abonnement portable à Claude Code OAuth soit via `~/.claude/.credentials.json` avec `claudeAiOauth.subscriptionType` soit via `CLAUDE_CODE_OAUTH_TOKEN` depuis `claude setup-token`. Il prouve d'abord le `claude -p` direct dans Docker, puis exécute deux tours de backend Gateway CLI sans conserver les variables d'environnement de clé API Anthropic-API. Cette voie d'abonnement désactive par défaut les sondes d'outil MCP/d'image de Claude car Claude achemine actuellement l'utilisation des applications tierces via une facturation d'utilisation supplémentaire au lieu des limites normales du plan d'abonnement.
- Le test de fumée du backend CLI en direct exerce désormais le même flux de bout en bout pour Claude et Gemini : tour de texte, tour de classification d'image, puis appel d'outil MCP `cron` vérifié via le CLI de passerelle.
- Le test de fumée par défaut de Claude modifie également la session de Sonnet à Opus et vérifie que la session reprend se souvient toujours d'une note antérieure.

## Live : accessibilité du proxy HTTP/2 APNs

- Test : `src/infra/push-apns-http2.live.test.ts`
- Objectif : tunnéliser via un proxy HTTP CONNECT local vers le point de terminaison APNs sandbox d'Apple, envoyer la demande de validation HTTP/2 APNs et vérifier que la vraie réponse `403 InvalidProviderToken` d'Apple revient via le chemin du proxy.
- Activer :
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_APNS_REACHABILITY=1 pnpm test:live src/infra/push-apns-http2.live.test.ts`
- Délai d'attente optionnel :
  - `OPENCLAW_LIVE_APNS_TIMEOUT_MS=30000`

## Live : test de fumée de liaison ACP (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de liaison de conversation ACP avec un agent ACP en direct :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation de canal de message synthétique en place
  - envoyer un suivi normal sur cette même conversation
  - vérifier que le suivi atterrit dans la transcription de session ACP liée
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
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=droid`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT=opencode`
  - `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude,codex,gemini`
  - `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND='npx -y @agentclientprotocol/claude-agent-acp@<version>'`
  - `OPENCLAW_LIVE_ACP_BIND_CODEX_MODEL=gpt-5.5`
  - `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL=opencode/kimi-k2.6`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_TRANSCRIPT=1`
  - `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1`
  - `OPENCLAW_LIVE_ACP_BIND_PARENT_MODEL=openai/gpt-5.5`
- Remarques :
  - Cette voie utilise la surface `chat.send` de la passerelle avec des champs de route d'origine synthétiques réservés aux administrateurs afin que les tests puissent attacher le contexte du canal de messages sans prétendre livrer à l'extérieur.
  - Lorsque `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` n'est pas défini, le test utilise le registre d'agents intégré du plugin `acpx` pour l'agent de harnais ACP sélectionné.
  - La création de cron MCP de session liée est un effort de meilleur possible par défaut, car les harnais ACP externes peuvent annuler les appels MCP une fois la liaison/preuve d'image passée ; définissez `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` pour rendre cette sonde cron post-liaison stricte.

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

Recettes à agent unique Docker :

```bash
pnpm test:docker:live-acp-bind:claude
pnpm test:docker:live-acp-bind:codex
pnpm test:docker:live-acp-bind:droid
pnpm test:docker:live-acp-bind:gemini
pnpm test:docker:live-acp-bind:opencode
```

Notes Docker :

- Le lanceur Docker se trouve à `scripts/test-live-acp-bind-docker.sh`.
- Par défaut, il exécute le test de fumée de liaison ACP contre les agents CLI en direct agrégés en séquence : `claude`, `codex`, puis `gemini`.
- Utilisez `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=droid`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` ou `OPENCLAW_LIVE_ACP_BIND_AGENTS=opencode` pour réduire la matrice.
- Il met en place le matériel d'authentification CLI correspondant dans le conteneur, puis installe le CLI en direct demandé (`@anthropic-ai/claude-code`, `@openai/codex`, Factory Droid via `https://app.factory.ai/cli`, `@google/gemini-cli` ou `opencode-ai`) s'il est manquant. Le backend ACP lui-même est le package `acpx/runtime` intégré provenant du plugin officiel `acpx`.
- La variante Droid Docker met en place `~/.factory` pour les paramètres, transfère `FACTORY_API_KEY` et nécessite cette clé API, car l'authentification Factory locale OAuth/keyring n'est pas portable dans le conteneur. Elle utilise l'entrée de registre intégrée `droid exec --output-format acp` d'ACPX.
- La variante OpenCode Docker est une voie de régression stricte à agent unique. Elle écrit un modèle par défaut `OPENCODE_CONFIG_CONTENT` temporaire à partir de `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL` (par défaut `opencode/kimi-k2.6`), et `pnpm test:docker:live-acp-bind:opencode` nécessite une transcription d'assistant liée au lieu d'accepter l'ignore générique post-liaison.
- Les appels `acpx`CLIGatewayDockerOpenClaw CLI ne constituent qu'une solution manuelle/de contournement pour comparer le comportement en dehors du Gateway. Le smoke test ACP bind de Docker exerce le backend d'exécution `acpx` intégré d'OpenClaw.

## Live: Codex app-server harness smoke

- Objectif : valider le harnais Codex détenu par le plugin via la méthode normale `agent` de la passerelle :
  - charger le plugin `codex` groupé
  - sélectionner `openai/gpt-5.5`OpenAI, qui route par défaut les tours de l'agent OpenAI via Codex
  - envoyer un premier tour d'agent de passerelle à `openai/gpt-5.5` avec le harnais Codex sélectionné
  - envoyer un second tour à la même session OpenClaw et vérifier que le thread de l'application serveur peut reprendre
  - exécuter `/codex status` et `/codex models` via le même chemin de commande de passerelle
  - exécuter facultativement deux sondes de shell escaladées examinées par Guardian : une commande bénigne qui doit être approuvée et un faux téléchargement de secret qui doit être refusé afin que l'agent redemande
- Test : `src/gateway/gateway-codex-harness.live.test.ts`
- Activer : `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Modèle par défaut : `openai/gpt-5.5`
- Sonde d'image facultative : `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonde MCP/tool facultative : `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- Sonde Guardian facultative : `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- Le smoke test force le provider/modèle `agentRuntime.id: "codex"`OpenClaw afin qu'un harnais Codex défectueux ne puisse pas réussir en retombant silencieusement sur OpenClaw.
- Auth : auth Codex app-server à partir de la connexion locale à l'abonnement Codex. Les smoke tests Docker peuvent également fournir Docker`OPENAI_API_KEY` pour les sondes non-Codex le cas échéant, ainsi que des `~/.codex/auth.json` et `~/.codex/config.toml` copiés facultatifs.

Recette locale :

```bash
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.5 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Recette Docker :

```bash
pnpm test:docker:live-codex-harness
```

Notes Docker :

- Le runner Docker se trouve à Docker`scripts/test-live-codex-harness-docker.sh`.
- Il transmet `OPENAI_API_KEY`CLI, copie les fichiers d'authentification Codex CLI si présents, installe
  `@openai/codex`npm dans un préfixe npm monté en écriture,
  prépare l'arborescence source, puis exécute uniquement le test en direct du harnais Codex.
- Docker active par défaut les sondes d'image, MCP/tool et Guardian. Définissez
  Docker`OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` ou
  `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` ou
  `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0` lorsque vous avez besoin d'un exécution de débogage
  plus ciblée.
- Docker utilise la même configuration d'exécution explicite Codex, donc les alias hérités ou le repli OpenClaw
  ne peuvent pas masquer une régression du harnais Codex.

### Recettes en direct recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Modèle unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.5" pnpm test:live src/agents/models.profiles.live.test.ts`

- Profil direct pour petit modèle :
  - `OPENCLAW_LIVE_MODELS=small pnpm test:live src/agents/models.profiles.live.test.ts`

- Test de fumée de l'API Cloud Ollama :
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 pnpm test:live -- extensions/ollama/ollama.live.test.ts`

- Modèle unique, test de fumée de passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel d'outil sur plusieurs fournisseurs :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé d'API Gemini + Antigravity) :
  - Gemini (clé d'API) : API`OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : OAuth`OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Test de fumée de la pensée adaptative Google :
  - Défaut dynamique Gemini 3 : `pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Budget dynamique Gemini 2.5 : `pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

Notes :

- `google/...`APIAPI utilise l'API Gemini (clé d'API).
- `google-antigravity/...`OAuth utilise le pont OAuth Antigravity (point de terminaison d'agent style Cloud Code Assist).
- `google-gemini-cli/...`CLI utilise le CLI Gemini local sur votre machine (authentification séparée + particularités des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle l'API Gemini hébergée par Google via HTTP (auth par clé API/profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw délègue à un binaire local CLIOpenClaw`gemini` ; il possède sa propre auth et peut se comporter différemment (streaming/support de tool/décalage de version).

## Live : matrice de models (ce que nous couvrons)

Il n'y a pas de « liste de models CI » fixe (live est optionnel), mais voici les models **recommandés** à couvrir régulièrement sur une machine de dev avec des clés.

### Ensemble de smoke moderne (tool calling + image)

Il s'agit de l'exécution des « models courants » que nous nous attendons à voir fonctionner :

- OpenAI (non-Codex) : OpenAI`openai/gpt-5.5`
- OpenAI ChatGPT/Codex OAuth : `openai/gpt-5.5`
- Anthropic : Anthropic`anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (API Gemini) : API`google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (éviter les models Gemini 2.x plus anciens)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- DeepSeek : `deepseek/deepseek-v4-flash` et `deepseek/deepseek-v4-pro`
- Z.AI (GLM) : GLM`zai/glm-5.1`
- MiniMax : MiniMax`minimax/MiniMax-M2.7`

Exécuter le test de fumée de la passerelle avec outils + image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Référence : tool calling (Read + Exec optionnel)

Choisissez au moins un par famille de provider :

- OpenAI : OpenAI`openai/gpt-5.5`
- Anthropic : Anthropic`anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- DeepSeek : `deepseek/deepseek-v4-flash`
- Z.AI (GLM) : GLM`zai/glm-5.1`
- MiniMax : MiniMax`minimax/MiniMax-M2.7`

Couverture supplémentaire optionnelle (la bienvenue) :

- xAI : `xai/grok-4.3` (ou la plus récente disponible)
- Mistral : `mistral/`… (choisissez un model « tools » activé que vous possédez)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`… (local ; le tool calling dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un model compatible avec les images dans `OPENCLAW_LIVE_GATEWAY_MODELS` (variantes de Claude/Gemini/OpenAI compatibles avec la vision, etc.) pour exercer la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez des clés activées, nous prenons également en charge les tests via :

- OpenRouter : `openrouter/...` (des centaines de models ; utilisez `openclaw models scan` pour trouver des candidats compatibles avec les outils et les images)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

D'autres fournisseurs que vous pouvez inclure dans la matrice live (si vous avez des identifiants/config) :

- Intégré : `openai`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

<Tip>Ne codifiez pas en dur « tous les modèles » dans la documentation. La liste faisant autorité est tout ce que `discoverModels(...)` renvoie sur votre machine ainsi que les clés disponibles.</Tip>

## Identifiants (jamais commit)

Les tests live découvrent les identifiants de la même manière que le CLI. Conséquences pratiques :

- Si le CLI fonctionne, les tests en direct devraient trouver les mêmes clés.
- Si un test en direct indique « no creds », débuguez de la même manière que vous débugeriez `openclaw models list` / la sélection de modèle.

- Profils d'authentification par agent : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (c'est ce que signifie « profile keys » dans les tests en direct)
- Configuration : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Répertoire d'état hérité : `~/.openclaw/credentials/` (copié dans le répertoire personnel intermédiaire en direct lorsqu'il est présent, mais pas le magasin principal de clés de profil)
- Les exécutions locales en direct copient la configuration active, les fichiers `auth-profiles.json` par agent, l'ancien `credentials/`CLI et les répertoires d'authentification CLI externes pris en charge dans un répertoire de test temporaire par défaut ; les homes de diffusion préparés ignorent `workspace/` et `sandboxes/`, et les remplacements de chemin `agents.*.workspace` / `agentDir` sont supprimés afin que les sondes restent en dehors de votre espace de travail hôte réel.

Si vous souhaitez vous fier aux clés d'environnement, exportez-les avant les tests locaux ou utilisez les exécuteurs Docker ci-dessous avec un `OPENCLAW_PROFILE_FILE` explicite.

## Deepgram en direct (transcription audio)

- Test : `extensions/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus coding plan en direct

- Test : `extensions/byteplus/live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- Remplacement de modèle facultatif : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## Media de workflow ComfyUI en direct

- Test : `extensions/comfy/comfy.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Portée :
  - Exerce les chemins d'image, de vidéo et `music_generate` comfy regroupés
  - Ignore chaque capacité sauf si `plugins.entries.comfy.config.<capability>` est configuré
  - Utile après avoir modifié la soumission, l'interrogation, les téléchargements ou l'enregistrement de plugins du workflow comfy

## Génération d'images en direct

- Test : `test/image-generation.runtime.live.test.ts`
- Commande : `pnpm test:live test/image-generation.runtime.live.test.ts`
- Harnais : `pnpm test:live:media image`
- Portée :
  - Énumère chaque plugin de provider de génération d'images enregistré
  - Utilise les variables d'environnement de provider déjà exportées avant le sondage
  - Utilise par défaut les clés API en direct/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les identifiants réels du shell
  - Ignore les fournisseurs sans auth/profil/model utilisable
  - Exécute chaque fournisseur configuré via le runtime partagé de génération d'images :
    - `<provider>:generate`
    - `<provider>:edit` lorsque le fournisseur déclare la prise en charge de la modification
- Fournisseurs groupés actuellement couverts :
  - `deepinfra`
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `openrouter`
  - `vydra`
  - `xai`
- Rétrécissement optionnel :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,openrouter,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="deepinfra"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,openrouter/google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,openrouter:generate,xai:default-generate,xai:default-edit"`
- Comportement d'authentification optionnel :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification par magasin de profils et ignorer les remplacements uniquement basés sur l'environnement

Pour le chemin CLI livré, ajoutez un test de fumée `infer` après la réussite du test en direct du fournisseur/runtime :

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image-preview \
  --prompt "Minimal flat test image: one blue square on a white background, no text." \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

Cela couvre l'analyse des arguments CLI, la résolution config/default-agent, l'activation des plugins groupés, le runtime partagé de génération d'images et la demande en direct au fournisseur. Les dépendances des plugins doivent être présentes avant le chargement du runtime.

## Génération de musique en direct

- Test : `extensions/music-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media music`
- Portée :
  - Teste le chemin partagé des fournisseurs de génération de musique groupés
  - Couvre actuellement Google et MiniMax
  - Utilise les variables d'environnement de fournisseur déjà exportées avant la sonde
  - Utilise par défaut les clés d'API live/env avant les profils d'authentification stockés, les clés de test obsolètes dans `auth-profiles.json` ne masquent donc pas les identifiants réels du shell
  - Ignore les fournisseurs sans auth/profil/model utilisable
  - Exécute les deux modes de runtime déclarés lorsqu'ils sont disponibles :
    - `generate` avec une entrée composée uniquement d'une invite
    - `edit` lorsque le provider déclare `capabilities.edit.enabled`
  - Couverture actuelle des voies partagées :
    - `google` : `generate`, `edit`
    - `minimax` : `generate`
    - `comfy` : fichier live Comfy séparé, et non ce balayage partagé
- Restriction facultative :
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.6"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification par le magasin de profils et ignorer les remplacements basés uniquement sur l'environnement

## Test en direct de génération vidéo

- Test : `extensions/video-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media video`
- Portée :
  - Exerce le chemin de provider de génération vidéo groupé et partagé
  - Par défaut, utilise le chemin de test de smoke sûr pour la release : providers non-FAL, une requête texte-vidéo par provider, une invite homard d'une seconde, et une limite d'opérations par provider issue de `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` par défaut)
  - Ignore FAL par défaut car la latence de la file d'attente côté provider peut impacter le temps de release ; passez `--video-providers fal` ou `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` pour l'exécuter explicitement
  - Utilise les variables d'environnement de provider déjà exportées avant le sondage
  - Utilise par défaut les clés d'API live/env avant les profils d'authentification stockés, les clés de test obsolètes dans `auth-profiles.json` ne masquent donc pas les identifiants réels du shell
  - Ignore les providers sans authentification/profil/modèle utilisable
  - N'exécute que `generate` par défaut
  - Définissez `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` pour exécuter également les modes de transformation déclarés lorsqu'ils sont disponibles :
    - `imageToVideo` lorsque le provider déclare `capabilities.imageToVideo.enabled` et que le provider/modèle sélectionné accepte l'entrée d'image locale soutenue par un tampon dans le balayage partagé
    - `videoToVideo` lorsque le provider déclare `capabilities.videoToVideo.enabled` et que le provider/modèle sélectionné accepte l'entrée de vidéo locale soutenue par un tampon dans le balayage partagé
  - Providers `imageToVideo` déclarés mais ignorés actuellement dans le balayage partagé :
    - `vydra` car le `veo3` groupé est texte uniquement et le `kling` groupé nécessite une URL d'image distante
  - Couverture Vydra spécifique au provider :
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ce fichier exécute du texte-vers-vidéo `veo3` plus une voie `kling` qui utilise une fixture d'URL d'image distante par défaut
  - Couverture actuelle en direct `videoToVideo` :
    - `runway` uniquement lorsque le modèle sélectionné est `runway/gen4_aleph`
  - Fournisseurs `videoToVideo` actuellement déclarés mais ignorés dans le balayage partagé :
    - `alibaba`, `qwen`, `xai` car ces chemins nécessitent actuellement des URLs de référence `http(s)` / MP4 distantes
    - `google` car la voie partagée Gemini/Veo actuelle utilise une entrée locale soutenue par un tampon et ce chemin n'est pas accepté dans le balayage partagé
    - `openai` car la voie partagée actuelle manque de garanties d'accès spécifiques à l'organisation pour l'édition vidéo
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="deepinfra,google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` pour inclure chaque fournisseur dans le balayage par défaut, y compris FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` pour réduire la limite d'opérations de chaque fournisseur pour une exécution de test de fumée agressive
- Comportement d'auth facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'auth du magasin de profils et ignorer les remplacements uniquement environnement

## Harnais de live média

- Commande : `pnpm test:live:media`
- Objectif :
  - Exécute les suites live partagées d'image, de musique et de vidéo via un point d'entrée natif du dépôt
  - Utilise les env vars de provider déjà exportées
  - Rétrécit automatiquement chaque suite aux providers qui ont actuellement une auth utilisable par défaut
  - Réutilise `scripts/test-live.mjs`, donc le comportement du battement de cœur et du mode silencieux reste cohérent
- Exemples :
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Connexes

- [Testing](/fr/help/testing) - suites unitaires, d'intégration, QA et Docker
