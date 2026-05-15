---
summary: "Tests en direct (avec accès réseau) : matrice de modèles, backends CLI, ACP, fournisseurs de médias, identifiants"
read_when:
  - Running live model matrix / CLI backend / ACP / media-provider smokes
  - Debugging live-test credential resolution
  - Adding a new provider-specific live test
title: "Tests : suites en direct"
sidebarTitle: "Tests en direct"
---

Pour un démarrage rapide, les exécuteurs QA, les suites unitaires/d'intégration et les flux Docker, voir
[Testing](/fr/help/testing). Cette page couvre les suites de tests **live** (touchant le réseau) :
matrice de modèles, backends CLI, ACP et tests live de fournisseurs de médias, ainsi que
la gestion des identifiants.

## En direct : commandes de smoke de profil local

Sourcez `~/.profile` avant les vérifications en direct ad hoc afin que les clés du fournisseur et les chemins d'outils locaux correspondent à votre shell :

```bash
source ~/.profile
```

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

`voicecall smoke` est un essai à blanc sauf si `--yes` est également présent. N'utilisez `--yes` que
lorsque vous souhaitez intentionnellement passer un appel de notification réel. Pour Twilio, Telnyx et
Plivo, une vérification de préparation réussie nécessite une URL de webhook publique ; les secours en boucle locale/privée sont rejetés par conception.

## En direct : balayage des capacités de nœud Android

- Test : `src/gateway/android-node.capabilities.live.test.ts`
- Script : `pnpm android:test:integration`
- Objectif : invoquer **toutes les commandes actuellement annoncées** par un nœud Android connecté et vérifier le comportement du contrat de commande.
- Portée :
  - Configuration préconditionnée/manuelle (la suite n'installe pas/n'exécute pas/n'apparie pas l'application).
  - Validation `node.invoke` de la passerelle, commande par commande, pour le nœud Android sélectionné.
- Configuration préalable requise :
  - Application Android déjà connectée et appariée à la passerelle.
  - Application gardée au premier plan.
  - Autorisations/consentement de capture accordés pour les capacités que vous vous attendez à réussir.
- Remplacements de cibles optionnels :
  - `OPENCLAW_ANDROID_NODE_ID` ou `OPENCLAW_ANDROID_NODE_NAME`.
  - `OPENCLAW_ANDROID_GATEWAY_URL` / `OPENCLAW_ANDROID_GATEWAY_TOKEN` / `OPENCLAW_ANDROID_GATEWAY_PASSWORD`.
- Détails complets de la configuration Android : [Android App](/fr/platforms/android)

## En direct : smoke de modèle (clés de profil)

Les tests en direct sont divisés en deux couches afin que nous puissions isoler les échecs :

- "Direct model" nous indique si le provider/model peut répondre du tout avec la clé donnée.
- "Gateway smoke" nous indique si le pipeline complet gateway+agent fonctionne pour ce modèle (sessions, historique, outils, stratégie de sandbox, etc.).

### Couche 1 : Achèvement direct du model (sans passerelle)

- Test : `src/agents/models.profiles.live.test.ts`
- Objectif :
  - Énumérer les models découverts
  - Utilisez `getApiKeyForModel` pour sélectionner les models pour lesquels vous avez des identifiants
  - Exécuter un petit achèvement par model (et régressions ciblées si nécessaire)
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous invoquez Vitest directement)
- Définissez `OPENCLAW_LIVE_MODELS=modern` (ou `all`, alias pour modern) pour exécuter réellement cette suite ; sinon, elle est ignorée pour que `pnpm test:live` reste concentré sur le smoke de la passerelle
- Comment sélectionner les models :
  - `OPENCLAW_LIVE_MODELS=modern` pour exécuter la liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.2 + Codex, Gemini 3, DeepSeek V4, GLM 4.7, MiniMax M2.7, Grok 4.3)
  - `OPENCLAW_LIVE_MODELS=all` est un alias pour la liste d'autorisation moderne
  - ou `OPENCLAW_LIVE_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,..."` (liste d'autorisation par virgule)
  - Les balayages modernes/tous sont définis par défaut sur une limite curée à fort signal ; définissez `OPENCLAW_LIVE_MAX_MODELS=0` pour un balayage moderne exhaustif ou un nombre positif pour une limite plus petite.
  - Les balayages exhaustifs utilisent `OPENCLAW_LIVE_TEST_TIMEOUT_MS` pour le délai d'expiration global du test de modèle direct. Par défaut : 60 minutes.
  - Les sondes de modèle direct s'exécutent avec un parallélisme de 20 voies par défaut ; définissez `OPENCLAW_LIVE_MODEL_CONCURRENCY` pour modifier.
- Comment sélectionner les providers :
  - `OPENCLAW_LIVE_PROVIDERS="google,google-antigravity,google-gemini-cli"` (liste d'autorisation par virgule)
- D'où viennent les clés :
  - Par défaut : magasin de profils et replis d'environnement
  - Définissez `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'utilisation uniquement du **magasin de profils**
- Pourquoi cela existe :
  - Sépare "l'API du provider est cassée / la clé est invalide" de "le pipeline de l'agent Gateway est cassé"
  - Contient de petites régressions isolées (exemple : rejeu du raisonnement OpenAI Responses/Codex Responses + flux tool-call)

### Couche 2 : Gateway + test de fumée de l'agent de développement (ce que "@openclaw" fait réellement)

- Test : `src/gateway/gateway-models.profiles.live.test.ts`
- Objectif :
  - Lancer une passerelle (gateway) en processus
  - Créer/patcher une session `agent:dev:*` (remplacement de modèle par exécution)
  - Itérer les modèles avec clés et vérifier :
    - réponse "significative" (pas d'outils)
    - une invocation d'outil réelle fonctionne (sonde de lecture)
    - sondes d'outil supplémentaires optionnelles (sonde exec+read)
    - les chemins de régression OpenAI (tool-call-only → follow-up) continuent de fonctionner
- Détails des sondes (afin que vous puissiez expliquer rapidement les échecs) :
  - sonde `read` : le test écrit un fichier nonce dans l'espace de travail et demande à l'agent de le `read` et de renvoyer le nonce.
  - `exec+read` probe : le test demande à l'agent de `exec`-écrire un nonce dans un fichier temporaire, puis de `read` le relire.
  - sonde d'image : le test joint un PNG généré (chat + code aléatoire) et s'attend à ce que le model renvoie `cat <CODE>`.
  - Référence de mise en œuvre : `src/gateway/gateway-models.profiles.live.test.ts` et `src/gateway/live-image-probe.ts`.
- Comment activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
- Comment sélectionner les modèles :
  - Par défaut : liste d'autorisation moderne (Opus/Sonnet 4.6+, GPT-5.2 + Codex, Gemini 3, DeepSeek V4, GLM 4.7, MiniMax M2.7, Grok 4.3)
  - `OPENCLAW_LIVE_GATEWAY_MODELS=all` est un alias pour la liste d'autorisation moderne
  - Ou définissez `OPENCLAW_LIVE_GATEWAY_MODELS="provider/model"` (ou une liste séparée par des virgules) pour restreindre
  - Les parcours Modern/all gateway sont limités par défaut à une limite de signal élevé soigneusement sélectionnée ; définissez `OPENCLAW_LIVE_GATEWAY_MAX_MODELS=0` pour un parcours moderne exhaustif ou un nombre positif pour une limite plus petite.
- Comment sélectionner les providers (éviter "OpenRouter tout") :
  - `OPENCLAW_LIVE_GATEWAY_PROVIDERS="google,google-antigravity,google-gemini-cli,openai,anthropic,zai,minimax"` (liste d'autorisation séparée par des virgules)
- Les sondages d'outil et d'image sont toujours activés dans ce test en direct :
  - Sondage `read` + sondage `exec+read` (stress de l'outil)
  - Le sondage d'image s'exécute lorsque le modèle annonce la prise en charge des entrées d'image
  - Flux (haut niveau) :
    - Le test génère un petit PNG avec "CAT" + code aléatoire (`src/gateway/live-image-probe.ts`)
    - L'envoie via `agent` `attachments: [{ mimeType: "image/png", content: "<base64>" }]`
    - Gateway analyse les pièces jointes en `images[]` (`src/gateway/server-methods/agent.ts` + `src/gateway/chat-attachments.ts`)
    - L'agent intégré transmet un message utilisateur multimodal au modèle
    - Assertion : la réponse contient `cat` + le code (tolérance OCR : erreurs mineures autorisées)

<Tip>
Pour voir ce que vous pouvez tester sur votre machine (et les ids `provider/model` exacts), exécutez :

```bash
openclaw models list
openclaw models list --json
```

</Tip>

## Live : test de fumée du backend CLI (Claude, Codex, Gemini ou autres CLIs locaux)

- Test : `src/gateway/gateway-cli-backend.live.test.ts`
- Objectif : valider le pipeline Gateway + agent en utilisant un backend CLI local, sans toucher à votre configuration par défaut.
- Les valeurs par défaut des tests de fumée spécifiques au backend se trouvent dans la définition `cli-backend.ts` de l'extension propriétaire.
- Activer :
  - `pnpm test:live` (ou `OPENCLAW_LIVE_TEST=1` si vous appelez Vitest directement)
  - `OPENCLAW_LIVE_CLI_BACKEND=1`
- Par défaut :
  - Fournisseur/modèle par défaut : `claude-cli/claude-sonnet-4-6`
  - Le comportement de la commande/args/image provient des métadonnées du plugin backend CLI propriétaire.
- Remplacements (optionnels) :
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.5"`
  - `OPENCLAW_LIVE_CLI_BACKEND_COMMAND="/full/path/to/codex"`
  - `OPENCLAW_LIVE_CLI_BACKEND_ARGS='["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]'`
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_PROBE=1` pour envoyer une véritable pièce jointe image (les chemins sont injectés dans le prompt). Les recettes Docker désactivent cela par défaut, sauf demande explicite.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_ARG="--image"` pour passer les chemins de fichiers image en tant qu'arguments CLI au lieu de l'injection de prompt.
  - `OPENCLAW_LIVE_CLI_BACKEND_IMAGE_MODE="repeat"` (ou `"list"`) pour contrôler la façon dont les arguments d'image sont passés lorsque `IMAGE_ARG` est défini.
  - `OPENCLAW_LIVE_CLI_BACKEND_RESUME_PROBE=1` pour envoyer un deuxième tour et valider le flux de reprise.
  - `OPENCLAW_LIVE_CLI_BACKEND_MODEL_SWITCH_PROBE=1` pour opter pour la sonde de continuité de session Claude Sonnet -> Opus lorsque le modèle sélectionné prend en charge une cible de changement. Les recettes Docker désactivent cela par défaut pour une fiabilité globale.
  - `OPENCLAW_LIVE_CLI_BACKEND_MCP_PROBE=1` pour opter pour la sonde de bouclage MCP/tool. Les recettes Docker désactivent cela par défaut, sauf demande explicite.

Exemple :

```bash
OPENCLAW_LIVE_CLI_BACKEND=1 \
  OPENCLAW_LIVE_CLI_BACKEND_MODEL="codex-cli/gpt-5.5" \
  pnpm test:live src/gateway/gateway-cli-backend.live.test.ts
```

Test de configuration Gemini MCP rapide :

```bash
OPENCLAW_LIVE_TEST=1 \
  pnpm test:live src/agents/cli-runner/bundle-mcp.gemini.live.test.ts
```

Cela ne demande pas à Gemini de générer une réponse. Il écrit les mêmes paramètres système que OpenClaw donne à Gemini, puis exécute `gemini --debug mcp list` pour prouver qu'un serveur `transport: "streamable-http"` enregistré est normalisé à la forme HTTP MCP de Gemini et peut se connecter à un serveur MCP HTTP diffusable en local.

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

- Le lanceur Docker se trouve à `scripts/test-live-cli-backend-docker.sh`.
- Il exécute le test de fumée du backend CLI en direct à l'intérieur de l'image Docker du dépôt en tant qu'utilisateur non root `node`.
- Il résout les métadonnées de smoke CLI de l'extension propriétaire, puis installe le package CLI Linux correspondant (`@anthropic-ai/claude-code`, `@openai/codex` ou `@google/gemini-cli`) dans un préfixe accessible en écriture mis en cache à `OPENCLAW_DOCKER_CLI_TOOLS_DIR` (par défaut : `~/.cache/openclaw/docker-cli-tools`).
- `pnpm test:docker:live-cli-backend:claude-subscription` nécessite un abonnement portable Claude Code OAuth via `~/.claude/.credentials.json` avec `claudeAiOauth.subscriptionType` ou `CLAUDE_CODE_OAUTH_TOKEN` depuis `claude setup-token`. Il prouve d'abord le `claude -p` direct dans Docker, puis exécute deux tours de backend CLI Gateway sans préserver les variables d'environnement de clé API Anthropic. Cet abonnement désactive les sondes MCP/tool et image de Claude par défaut car Claude achemine actuellement l'utilisation des applications tierces via une facturation d'utilisation supplémentaire au lieu des limites normales du plan d'abonnement.
- Le smoke live de backend CLI exerce désormais le même flux de bout en bout pour Claude, Codex et Gemini : tour de texte, tour de classification d'image, puis appel d'outil MCP `cron` vérifié via la CLI Gateway.
- Le smoke par défaut de Claude corrige également la session de Sonnet à Opus et vérifie que la session reprise se souvient toujours d'une note précédente.

## Live : accessibilité du proxy HTTP/2 APNs

- Test : `src/infra/push-apns-http2.live.test.ts`
- Objectif : tunnelliser via un proxy HTTP CONNECT local vers le point de terminaison APNs de bac à sable d'Apple, envoyer la demande de validation HTTP/2 APNs, et vérifier que la vraie réponse `403 InvalidProviderToken` d'Apple revient via le chemin du proxy.
- Activer :
  - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_APNS_REACHABILITY=1 pnpm test:live src/infra/push-apns-http2.live.test.ts`
- Délai d'expiration facultatif :
  - `OPENCLAW_LIVE_APNS_TIMEOUT_MS=30000`

## Live : ACP bind smoke (`/acp spawn ... --bind here`)

- Test : `src/gateway/gateway-acp-bind.live.test.ts`
- Objectif : valider le flux réel de conversation-bind ACP avec un agent ACP live :
  - envoyer `/acp spawn <agent> --bind here`
  - lier une conversation de message-channel synthétique en place
  - envoyer une suite normale sur cette même conversation
  - vérifier que la suite atterrit dans la transcription de session ACP liée
- Activer :
  - `pnpm test:live src/gateway/gateway-acp-bind.live.test.ts`
  - `OPENCLAW_LIVE_ACP_BIND=1`
- Par défaut :
  - Agents ACP dans Docker : Docker`claude,codex,gemini`
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
- Notes :
  - Cette voie utilise la surface `chat.send` de la passerelle avec des champs de route d'origine synthétiques réservés aux administrateurs, afin que les tests puissent attacher un contexte de canal de message sans prétendre livrer à l'externe.
  - Lorsque `OPENCLAW_LIVE_ACP_BIND_AGENT_COMMAND` n'est pas défini, le test utilise le registre d'agents intégré du plugin `acpx` pour l'agent harnais ACP sélectionné.
  - La création de MCP cron de session liée est de type « best-effort » par défaut car les harnais ACP externes peuvent annuler les appels MCP une fois la preuve de liaison/d'image passée ; définissez `OPENCLAW_LIVE_ACP_BIND_REQUIRE_CRON=1` pour rendre cette sonde cron post-liaison stricte.

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
pnpm test:docker:live-acp-bind:droid
pnpm test:docker:live-acp-bind:gemini
pnpm test:docker:live-acp-bind:opencode
```

Notes Docker :

- L'exécuteur Docker se trouve à Docker`scripts/test-live-acp-bind-docker.sh`.
- Par défaut, il exécute le test de fumée de liaison ACP contre les agents CLI live agrégés en séquence : CLI`claude`, `codex`, puis `gemini`.
- Utilisez `OPENCLAW_LIVE_ACP_BIND_AGENTS=claude`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=codex`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=droid`, `OPENCLAW_LIVE_ACP_BIND_AGENTS=gemini` ou `OPENCLAW_LIVE_ACP_BIND_AGENTS=opencode` pour restreindre la matrice.
- Il source `~/.profile`CLICLI, met en place le matériel d'authentification CLI correspondant dans le conteneur, puis installe le CLI en temps réel demandé (`@anthropic-ai/claude-code`, `@openai/codex`, Factory Droid via `https://app.factory.ai/cli`, `@google/gemini-cli`, ou `opencode-ai`) s'il est manquant. Le backend ACP lui-même est le package `acpx/runtime` intégré du plugin officiel `acpx`.
- La variante Droid Docker met en place Docker`~/.factory` pour les paramètres, transfère `FACTORY_API_KEY`APIOAuth et nécessite cette clé d'API car l'authentification OAuth/keyring Factory locale n'est pas portable dans le conteneur. Elle utilise l'entrée de registre `droid exec --output-format acp` intégrée d'ACPX.
- La variante OpenCode Docker est une voie de régression à agent unique stricte. Elle écrit un model par défaut Docker`OPENCODE_CONFIG_CONTENT` temporaire à partir de `OPENCLAW_LIVE_ACP_BIND_OPENCODE_MODEL` (par défaut `opencode/kimi-k2.6`) après avoir sourcé `~/.profile`, et `pnpm test:docker:live-acp-bind:opencode` nécessite une transcription d'assistant liée au lieu d'accepter le saut générique post-liaison.
- Les appels directs au CLI `acpx`CLIGatewayDockerOpenClaw ne constituent qu'une voie manuelle/de contournement pour comparer le comportement en dehors du Gateway. Le test de fumée de liaison ACP Docker exerce le backend d'exécution `acpx` intégré d'OpenClaw.

## Live: Codex app-server harness smoke

- Goal: validate the plugin-owned Codex harness through the normal gateway
  `agent` method:
  - load the bundled `codex` plugin
  - select `openai/gpt-5.5`OpenAI, which routes OpenAI agent turns through Codex by default
  - send a first gateway agent turn to `openai/gpt-5.5` with the Codex harness selected
  - send a second turn to the same OpenClaw session and verify the app-server
    thread can resume
  - exécuter `/codex status` et `/codex models` via le même chemin de commande de passerelle
  - exécuter facultativement deux sondes de shell échelonnées examinées par Guardian : une commande bénigne qui doit être approuvée et un faux téléchargement de secret qui doit être refusé afin que l'agent redemande
- Test : `src/gateway/gateway-codex-harness.live.test.ts`
- Activer : `OPENCLAW_LIVE_CODEX_HARNESS=1`
- Model par défaut : `openai/gpt-5.5`
- Sonde d'image facultative : `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1`
- Sonde MCP/tool facultative : `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1`
- Sonde Guardian facultative : `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1`
- Le test de fumée force le provider/model `agentRuntime.id: "codex"` afin qu'un harnais Codex défaillant ne puisse pas réussir en retombant silencieusement sur PI.
- Auth : auth Codex app-server à partir de la connexion locale à l'abonnement Codex. Les smokes Docker peuvent également fournir `OPENAI_API_KEY` pour les sondes non-Codex, le cas échéant, ainsi que des fichiers `~/.codex/auth.json` et `~/.codex/config.toml` copiés facultatifs.

Recette locale :

```bash
source ~/.profile
OPENCLAW_LIVE_CODEX_HARNESS=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=1 \
  OPENCLAW_LIVE_CODEX_HARNESS_MODEL=openai/gpt-5.5 \
  pnpm test:live -- src/gateway/gateway-codex-harness.live.test.ts
```

Recette Docker :

```bash
source ~/.profile
pnpm test:docker:live-codex-harness
```

Notes Docker :

- Le runner Docker se trouve à `scripts/test-live-codex-harness-docker.sh`.
- Il source le `~/.profile` monté, passe `OPENAI_API_KEY`, copie les fichiers d'auth Codex CLI lorsqu'ils sont présents, installe `@openai/codex` dans un préfixe npm monté en écriture, prépare l'arborescence source, puis exécute uniquement le test en direct Codex-harness.
- Docker active les sondes d'image, MCP/tool et Guardian par défaut. Définissez `OPENCLAW_LIVE_CODEX_HARNESS_IMAGE_PROBE=0` ou `OPENCLAW_LIVE_CODEX_HARNESS_MCP_PROBE=0` ou `OPENCLAW_LIVE_CODEX_HARNESS_GUARDIAN_PROBE=0` lorsque vous avez besoin d'un exécution de débogage plus ciblée.
- Docker utilise la même configuration d'exécution explicite Codex, de sorte que les alias hérités ou le repli PI ne peuvent pas masquer une régression du harnais Codex.

### Recettes en direct recommandées

Les listes d'autorisation étroites et explicites sont les plus rapides et les moins instables :

- Model unique, direct (sans passerelle) :
  - `OPENCLAW_LIVE_MODELS="openai/gpt-5.5" pnpm test:live src/agents/models.profiles.live.test.ts`

- Model unique, test de fumée de passerelle :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Appel de tool sur plusieurs providers :
  - `OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3-flash-preview,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Focus Google (clé API Gemini + Antigravity) :
  - Gemini (clé API) : `OPENCLAW_LIVE_GATEWAY_MODELS="google/gemini-3-flash-preview" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`
  - Antigravity (OAuth) : `OPENCLAW_LIVE_GATEWAY_MODELS="google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-pro-high" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

- Test de fumée de la pensée adaptative Google :
  - Si les clés locales résident dans le profil du shell : `source ~/.profile`
  - Par défaut dynamique Gemini 3 : `pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-3.1-pro-preview --alt-model google/gemini-3.1-pro-preview --message '/think adaptive Reply exactly: GEMINI_ADAPTIVE_OK' --timeout-ms 180000`
  - Budget dynamique Gemini 2.5 : `pnpm openclaw qa manual --provider-mode live-frontier --model google/gemini-2.5-flash --alt-model google/gemini-2.5-flash --message '/think adaptive Reply exactly: GEMINI25_ADAPTIVE_OK' --timeout-ms 180000`

Notes :

- `google/...` utilise l'API Gemini (clé API).
- `google-antigravity/...` utilise le pont OAuth Antigravity (point de terminaison de l'agent style Cloud Code Assist).
- `google-gemini-cli/...` utilise le CLI Gemini local sur votre machine (auth séparée + particularités des outils).
- API Gemini vs CLI Gemini :
  - API : OpenClaw appelle l'API Gemini hébergée par Google via HTTP (clé API / auth profil) ; c'est ce que la plupart des utilisateurs entendent par « Gemini ».
  - CLI : OpenClaw délègue à un binaire `gemini` local ; il possède sa propre auth et peut se comporter différemment (prise en charge du streaming/outils/décalage de version).

## En direct : matrice de modèles (ce que nous couvrons)

Il n'y a pas de « liste de modèles CI » fixe (les tests en direct sont optionnels), mais voici les modèles **recommandés** à couvrir régulièrement sur une machine de développement avec des clés.

### Ensemble de tests de fumée modernes (appel d'outils + image)

Il s'agit de l'exécution des « modèles communs » que nous espérons maintenir fonctionnels :

- OpenAI (hors Codex) : `openai/gpt-5.5`
- OpenAI OAuth Codex : `openai-codex/gpt-5.5`
- Anthropic : `anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google (API Gemini) : `google/gemini-3.1-pro-preview` et `google/gemini-3-flash-preview` (évitez les anciens modèles Gemini 2.x)
- Google (Antigravity) : `google-antigravity/claude-opus-4-6-thinking` et `google-antigravity/gemini-3-flash`
- DeepSeek : `deepseek/deepseek-v4-flash` et `deepseek/deepseek-v4-pro`
- Z.AI (GLM) : GLM`zai/glm-5.1`
- MiniMax : MiniMax`minimax/MiniMax-M2.7`

Exécuter le test de fumée de la passerelle avec les outils + l'image :
`OPENCLAW_LIVE_GATEWAY_MODELS="openai/gpt-5.5,openai-codex/gpt-5.5,anthropic/claude-opus-4-6,google/gemini-3.1-pro-preview,google/gemini-3-flash-preview,google-antigravity/claude-opus-4-6-thinking,google-antigravity/gemini-3-flash,deepseek/deepseek-v4-flash,zai/glm-5.1,minimax/MiniMax-M2.7" pnpm test:live src/gateway/gateway-models.profiles.live.test.ts`

### Référence : appel d'outil (Read + Exec facultatif)

Choisissez au moins un par famille de providers :

- OpenAI : OpenAI`openai/gpt-5.5`
- Anthropic : Anthropic`anthropic/claude-opus-4-6` (ou `anthropic/claude-sonnet-4-6`)
- Google : `google/gemini-3-flash-preview` (ou `google/gemini-3.1-pro-preview`)
- DeepSeek : `deepseek/deepseek-v4-flash`
- Z.AI (GLM) : GLM`zai/glm-5.1`
- MiniMax : MiniMax`minimax/MiniMax-M2.7`

Couverture supplémentaire facultative (souhaitable) :

- xAI : `xai/grok-4.3` (ou la dernière version disponible)
- Mistral : `mistral/`… (choisissez un modèle compatible avec les outils que avez activé)
- Cerebras : `cerebras/`… (si vous y avez accès)
- LM Studio : `lmstudio/`API… (local ; l'appel d'outil dépend du mode API)

### Vision : envoi d'image (pièce jointe → message multimodal)

Incluez au moins un modèle compatible avec l'image dans `OPENCLAW_LIVE_GATEWAY_MODELS`OpenAI (variantes Claude/Gemini/OpenAI compatibles avec la vision, etc.) pour tester la sonde d'image.

### Agrégateurs / passerelles alternatives

Si vous avez activé des clés, nous prenons également en charge les tests via :

- OpenRouter : OpenRouter`openrouter/...` (des centaines de modèles ; utilisez `openclaw models scan` pour trouver les candidats compatibles avec les outils et l'image)
- OpenCode : `opencode/...` pour Zen et `opencode-go/...` pour Go (auth via `OPENCODE_API_KEY` / `OPENCODE_ZEN_API_KEY`)

D'autres providers que vous pouvez inclure dans la matrice live (si vous avez des identifiants/config) :

- Intégré : `openai`, `openai-codex`, `anthropic`, `google`, `google-vertex`, `google-antigravity`, `google-gemini-cli`, `zai`, `openrouter`, `opencode`, `opencode-go`, `xai`, `groq`, `cerebras`, `mistral`, `github-copilot`
- Via `models.providers` (points de terminaison personnalisés) : `minimax` (cloud/API), ainsi que tout proxy compatible OpenAI/Anthropic (LM Studio, vLLM, LiteLLM, etc.)

<Tip>Ne durcissez pas « tous les modèles » dans la documentation. La liste faisant autorité est tout ce que `discoverModels(...)` renvoie sur votre machine ainsi que les clés disponibles.</Tip>

## Identifiants (ne jamais commettre)

Les tests en direct découvrent les identifiants de la même manière que le CLI. Implications pratiques :

- Si le CLI fonctionne, les tests en direct devraient trouver les mêmes clés.
- Si un test en direct indique « no creds », déboguez de la même manière que vous débogueriez `openclaw models list` / la sélection de modèle.

- Profils d'authentification par agent : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (c'est ce que signifie « clés de profil » dans les tests en direct)
- Configuration : `~/.openclaw/openclaw.json` (ou `OPENCLAW_CONFIG_PATH`)
- Répertoire d'état hérité : `~/.openclaw/credentials/` (copié dans le répertoire d'accueil de test en direct mis en scène lorsqu'il est présent, mais pas le stockage principal des clés de profil)
- Les exécutions locales en direct copient par défaut la configuration active, les fichiers `auth-profiles.json` par agent, le `credentials/`CLI hérité et les répertoires d'authentification CLI externes pris en charge dans un répertoire d'accueil de test temporaire ; les répertoires d'accueil de test en direct mis en scène ignorent `workspace/` et `sandboxes/`, et les remplacements de chemin `agents.*.workspace` / `agentDir` sont supprimés afin que les sondes restent en dehors de votre espace de travail hôte réel.

Si vous souhaitez vous baser sur des clés d'environnement (par exemple, exportées dans votre `~/.profile`), exécutez les tests locaux après `source ~/.profile`, ou utilisez les runners Docker ci-dessous (ils peuvent monter `~/.profile` dans le conteneur).

## Deepgram live (transcription audio)

- Test : `extensions/deepgram/audio.live.test.ts`
- Activer : `DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## BytePlus coding plan live

- Test : `extensions/byteplus/live.test.ts`
- Activer : `BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- Remplacement facultatif de model : `BYTEPLUS_CODING_MODEL=ark-code-latest`

## ComfyUI workflow media live

- Test : `extensions/comfy/comfy.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- Portée :
  - Teste les chemins d'image, de vidéo et `music_generate` comfy fournis
  - Ignore chaque capacité sauf si `plugins.entries.comfy.config.<capability>` est configuré
  - Utile après avoir modifié la soumission, le polling, les téléchargements ou l'enregistrement du plugin comfy

## Image generation live

- Test : `test/image-generation.runtime.live.test.ts`
- Commande : `pnpm test:live test/image-generation.runtime.live.test.ts`
- Harness : `pnpm test:live:media image`
- Portée :
  - Énumère chaque plugin de provider de génération d'image enregistré
  - Charge les variables d'environnement de provider manquantes depuis votre shell de connexion (`~/.profile`) avant les tests
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les providers sans authentification/profil/model utilisable
  - Exécute chaque provider configuré via le runtime partagé de génération d'image :
    - `<provider>:generate`
    - `<provider>:edit` lorsque le provider déclare la prise en charge de l'édition
- Providers fournis actuellement couverts :
  - `deepinfra`
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `openrouter`
  - `vydra`
  - `xai`
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,openrouter,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="deepinfra"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image-preview,openrouter/google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,openrouter:generate,xai:default-generate,xai:default-edit"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification par magasin de profils et ignorer les remplacements d'environnement uniquement

Pour le chemin CLI fourni, ajoutez un test `infer` après la réussite du test en direct du fournisseur/runtime :

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image-preview \
  --prompt "Minimal flat test image: one blue square on a white background, no text." \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

Cela couvre l'analyse des arguments CLI, la résolution config/default-agent, l'activation des plugins groupés, le runtime de génération d'images partagé et la demande en direct au fournisseur. Les dépendances des plugins sont censées être présentes avant le chargement du runtime.

## Génération de musique en direct

- Test : `extensions/music-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media music`
- Portée :
  - Exerce le chemin partagé groupé du fournisseur de génération de musique
  - Couvre actuellement Google et MiniMax
  - Charge les env vars du fournisseur depuis votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par défaut les clés API live/env avant les profils d'authentification stockés, afin que les clés de test périmées dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les fournisseurs sans authentification/profil/model utilisable
  - Exécute les deux modes de runtime déclarés, le cas échéant :
    - `generate` avec une entrée prompt-only
    - `edit` lorsque le fournisseur déclare `capabilities.edit.enabled`
  - Couverture actuelle de la voie partagée :
    - `google` : `generate`, `edit`
    - `minimax` : `generate`
    - `comfy` : fichier live Comfy séparé, pas ce balayage partagé
- Rétrécissement facultatif :
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.6"`
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification par magasin de profils et ignorer les remplacements d'environnement uniquement

## Génération de vidéo en direct

- Test : `extensions/video-generation-providers.live.test.ts`
- Activer : `OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- Harnais : `pnpm test:live:media video`
- Portée :
  - Exerce le chemin partagé groupé du fournisseur de génération de vidéo
  - Par défaut, utilise le chemin de smoke sécurisé pour la release : providers non-FAL, une requête text-to-video par provider, une invite lobster d'une seconde, et une limite d'opération par provider à partir de `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` (`180000` par défaut)
  - Saute FAL par défaut car la latence de la file d'attente côté provider peut dominer le temps de release ; passez `--video-providers fal` ou `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"` pour l'exécuter explicitement
  - Charge les env vars du provider à partir de votre shell de connexion (`~/.profile`) avant de sonder
  - Utilise par priorité les clés live/env API plutôt que les profils d'authentification stockés, afin que les clés de test obsolètes dans `auth-profiles.json` ne masquent pas les véritables identifiants du shell
  - Ignore les providers sans auth/profil/model utilisable
  - N'exécute que `generate` par défaut
  - Définissez `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` pour exécuter également les modes de transformation déclarés lorsque disponibles :
    - `imageToVideo` lorsque le provider déclare `capabilities.imageToVideo.enabled` et que le provider/model sélectionné accepte l'entrée d'image locale soutenue par un tampon dans le sweep partagé
    - `videoToVideo` lorsque le provider déclare `capabilities.videoToVideo.enabled` et que le provider/model sélectionné accepte l'entrée vidéo locale soutenue par un tampon dans le sweep partagé
  - Providers `imageToVideo` actuellement déclarés mais ignorés dans le sweep partagé :
    - `vydra` car le `veo3` groupé est texte uniquement et le `kling` groupé nécessite une URL d'image distante
  - Couverture Vydra spécifique au provider :
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - ce fichier exécute du `veo3` text-to-video plus une voie `kling` qui utilise par défaut une fixture d'URL d'image distante
  - Couverture live actuelle `videoToVideo` :
    - `runway` uniquement lorsque le modèle sélectionné est `runway/gen4_aleph`
  - Providers `videoToVideo` actuellement déclarés mais ignorés dans le sweep partagé :
    - `alibaba`, `qwen`, `xai` car ces chemins nécessitent actuellement des URL de référence `http(s)` / MP4 distantes
    - `google` car la voie Gemini/Veo partagée actuelle utilise une entrée locale soutenue par un tampon et que ce chemin n'est pas accepté dans le sweep partagé
    - `openai` car la voie partagée actuelle ne garantit pas l'accès spécifique à l'organisation pour l'inpaint/remix vidéo
- Réduction facultative :
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="deepinfra,google,openai,runway"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,openai/sora-2,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` pour inclure chaque provider dans le sweep par défaut, y compris FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` pour réduire la limite d'opération de chaque provider pour une exécution de smoke agressive
- Comportement d'authentification facultatif :
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` pour forcer l'authentification profile-store et ignorer les substitutions env-only

## Media live harness

- Commande : `pnpm test:live:media`
- Objectif :
  - Exécute les suites live partagées pour les images, la musique et la vidéo via un point d'entrée natif du dépôt
  - Charge automatiquement les env vars provider manquants depuis `~/.profile`
  - Réduit automatiquement chaque suite aux providers qui ont actuellement une authentification utilisable par défaut
  - Réutilise `scripts/test-live.mjs`, donc le comportement heartbeat et quiet-mode reste cohérent
- Exemples :
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers openai,google,minimax`
  - `pnpm test:live:media video --video-providers openai,runway --all-providers`
  - `pnpm test:live:media music --quiet`

## Connexes

- [Testing](/fr/help/testing) - suites unitaires, d'intégration, QA et Docker
