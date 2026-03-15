---
summary: "Aperçu des fournisseurs de modèles avec des configurations d'exemple + flux CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Fournisseurs de modèles"
---

# Fournisseurs de modèles

Cette page couvre les **fournisseurs de LLM/modèles** (et non les canaux de chat comme WhatsApp/Telegram).
Pour les règles de sélection de modèles, voir [/concepts/models](/fr/concepts/models).

## Règles rapides

- Les références de modèles utilisent `provider/model` (exemple : `opencode/claude-opus-4-6`).
- Si vous définissez `agents.defaults.models`, cela devient la liste d'autorisation.
- Aides CLI : `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.

## Rotation de la clé API

- Prend en charge la rotation générique des fournisseurs pour les fournisseurs sélectionnés.
- Configurez plusieurs clés via :
  - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement unique en direct, priorité la plus élevée)
  - `<PROVIDER>_API_KEYS` (liste séparée par des virgules ou des points-virgules)
  - `<PROVIDER>_API_KEY` (clé primaire)
  - `<PROVIDER>_API_KEY_*` (liste numérotée, par ex. `<PROVIDER>_API_KEY_1`)
- Pour les fournisseurs Google, `GOOGLE_API_KEY` est également inclus en tant que solution de secours.
- L'ordre de sélection des clés préserve la priorité et déduplique les valeurs.
- Les demandes sont réessayées avec la clé suivante uniquement en cas de réponses de limitation de débit (par exemple `429`, `rate_limit`, `quota`, `resource exhausted`).
- Les échecs non liés à la limitation de débit échouent immédiatement ; aucune rotation de clé n'est tentée.
- Lorsque toutes les clés candidates échouent, l'erreur finale est renvoyée à partir de la dernière tentative.

## Fournisseurs intégrés (catalogue pi-ai)

OpenClaw est fourni avec le catalogue pi-ai. Ces fournisseurs ne nécessitent **aucune**
config `models.providers` ; définissez simplement l'authentification + choisissez un modèle.

### OpenAI

- Fournisseur : `openai`
- Auth : `OPENAI_API_KEY`
- Rotation facultative : `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, plus `OPENCLAW_LIVE_OPENAI_KEY` (remplacement unique)
- Exemples de modèles : `openai/gpt-5.4`, `openai/gpt-5.4-pro`
- CLI : `openclaw onboard --auth-choice openai-api-key`
- Le transport par défaut est `auto` (WebSocket prioritaire, repli SSE)
- Remplacer pour chaque modèle via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, ou `"auto"`)
- Le préchauffage WebSocket OpenAI Responses est activé par défaut via `params.openaiWsWarmup` (`true`/`false`)
- Le traitement prioritaire OpenAI peut être activé via `agents.defaults.models["openai/<model>"].params.serviceTier`
- Le mode rapide OpenAI peut être activé pour chaque modèle via `agents.defaults.models["<provider>/<model>"].params.fastMode`
- `openai/gpt-5.3-codex-spark` est intentionnellement supprimé dans OpenClaw car l'OpenAI API en direct la rejette ; Spark est traité comme Codex uniquement

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}
```

### Anthropic

- Fournisseur : `anthropic`
- Auth : `ANTHROPIC_API_KEY` ou `claude setup-token`
- Rotation facultative : `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, plus `OPENCLAW_LIVE_ANTHROPIC_KEY` (remplacement unique)
- Exemple de modèle : `anthropic/claude-opus-4-6`
- CLI : `openclaw onboard --auth-choice token` (coller le setup-token) ou `openclaw models auth paste-token --provider anthropic`
- Les modèles à clé API directe prennent en charge le commutateur partagé `/fast` et `params.fastMode` ; OpenClaw associe cela à Anthropic `service_tier` (`auto` vs `standard_only`)
- Remarque de politique : la prise en charge du setup-token est une compatibilité technique ; Anthropic a bloqué certaines utilisations d'abonnement en dehors de Claude Code par le passé. Vérifiez les conditions actuelles de Anthropic et décidez en fonction de votre tolérance au risque.
- Recommandation : l'authentification par clé Anthropic API est la voie la plus sûre et recommandée par rapport à l'authentification par setup-token d'abonnement.

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### Code OpenAI (Codex)

- Fournisseur : `openai-codex`
- Auth : OAuth (ChatGPT)
- Exemple de modèle : `openai-codex/gpt-5.4`
- CLI : `openclaw onboard --auth-choice openai-codex` ou `openclaw models auth login --provider openai-codex`
- Le transport par défaut est `auto` (WebSocket en priorité, repli SSE)
- Remplacer pour chaque modèle via `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"`, ou `"auto"`)
- Partage le même sélecteur `/fast` et la configuration `params.fastMode` que `openai/*` direct
- `openai-codex/gpt-5.3-codex-spark` reste disponible lorsque le catalogue Codex OAuth l'expose ; dépend des droits d'accès
- Note de stratégie : OpenAI Codex OAuth est explicitement pris en charge pour les outils/workflows externes comme OpenClaw.

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}
```

### OpenCode

- Auth : `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`)
- Fournisseur d'exécution Zen : `opencode`
- Fournisseur d'exécution Go : `opencode-go`
- Exemples de modèles : `opencode/claude-opus-4-6`, `opencode-go/kimi-k2.5`
- CLI : `openclaw onboard --auth-choice opencode-zen` ou `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (clé API)

- Fournisseur : `google`
- Auth : `GEMINI_API_KEY`
- Rotation facultative : `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, repli `GOOGLE_API_KEY`, et `OPENCLAW_LIVE_GEMINI_KEY` (remplacement unique)
- Exemples de modèles : `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilité : la configuration héritée OpenClaw utilisant `google/gemini-3.1-flash-preview` est normalisée vers `google/gemini-3-flash-preview`
- CLI : `openclaw onboard --auth-choice gemini-api-key`

### Google Vertex, Antigravity et Gemini CLI

- Fournisseurs : `google-vertex`, `google-antigravity`, `google-gemini-cli`
- Auth : Vertex utilise gcloud ADC ; Antigravity/Gemini CLI utilisent leurs flux d'authentification respectifs
- Attention : Antigravity et Gemini CLI OAuth dans OpenClaw sont des intégrations non officielles. Certains utilisateurs ont signalé des restrictions de compte Google après avoir utilisé des clients tiers. Consultez les conditions de Google et utilisez un compte non critique si vous choisissez de continuer.
- Antigravity OAuth est fourni sous forme de plugin groupé (`google-antigravity-auth`, désactivé par défaut).
  - Activer : `openclaw plugins enable google-antigravity-auth`
  - Connexion : `openclaw models auth login --provider google-antigravity --set-default`
- Gemini CLI OAuth est fourni sous forme de plugin groupé (`google-gemini-cli-auth`, désactivé par défaut).
  - Activer : `openclaw plugins enable google-gemini-cli-auth`
  - Connexion : `openclaw models auth login --provider google-gemini-cli --set-default`
  - Remarque : vous ne collez **pas** un identifiant client ou un secret dans `openclaw.json`. Le flux de connexion CLI stocke des jetons dans des profils d'authentification sur l'hôte de la passerelle.

### Z.AI (GLM)

- Fournisseur : `zai`
- Auth : `ZAI_API_KEY`
- Modèle exemple : `zai/glm-5`
- CLI : `openclaw onboard --auth-choice zai-api-key`
  - Alias : `z.ai/*` et `z-ai/*` sont normalisés vers `zai/*`

### Vercel AI Gateway

- Fournisseur : `vercel-ai-gateway`
- Auth : `AI_GATEWAY_API_KEY`
- Modèle exemple : `vercel-ai-gateway/anthropic/claude-opus-4.6`
- CLI : `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Fournisseur : `kilocode`
- Auth : `KILOCODE_API_KEY`
- Modèle exemple : `kilocode/anthropic/claude-opus-4.6`
- CLI : `openclaw onboard --kilocode-api-key <key>`
- URL de base : `https://api.kilo.ai/api/gateway/`
- Le catalogue intégré étendu comprend GLM-5 Free, MiniMax M2.5 Free, GPT-5.2, Gemini 3 Pro Preview, Gemini 3 Flash Preview, Grok Code Fast 1 et Kimi K2.5.

Consultez [/providers/kilocode](/fr/providers/kilocode) pour plus de détails sur la configuration.

### Autres fournisseurs intégrés

- OpenRouter : `openrouter` (`OPENROUTER_API_KEY`)
- Modèle exemple : `openrouter/anthropic/claude-sonnet-4-5`
- Kilo Gateway : `kilocode` (`KILOCODE_API_KEY`)
- Exemple de model : `kilocode/anthropic/claude-opus-4.6`
- xAI : `xai` (`XAI_API_KEY`)
- Mistral : `mistral` (`MISTRAL_API_KEY`)
- Exemple de model : `mistral/mistral-large-latest`
- CLI : `openclaw onboard --auth-choice mistral-api-key`
- Groq : `groq` (`GROQ_API_KEY`)
- Cerebras : `cerebras` (`CEREBRAS_API_KEY`)
  - Les models GLM sur Cerebras utilisent les identifiants `zai-glm-4.7` et `zai-glm-4.6`.
  - URL de base compatible OpenAI : `https://api.cerebras.ai/v1`.
- GitHub Copilot : `github-copilot` (`COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`)
- Hugging Face Inference : `huggingface` (`HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN`) — routeur compatible OpenAI ; exemple de model : `huggingface/deepseek-ai/DeepSeek-R1` ; CLI : `openclaw onboard --auth-choice huggingface-api-key`. Voir [Hugging Face (Inference)](/fr/providers/huggingface).

## Providers via `models.providers` (URL de base/personnalisée)

Utilisez `models.providers` (ou `models.json`) pour ajouter des providers **personnalisés** ou
des proxies compatibles OpenAI/Anthropic.

### Moonshot AI (Kimi)

Moonshot utilise des points de terminaison compatibles OpenAI, donc configurez-le en tant que provider personnalisé :

- Provider : `moonshot`
- Auth : `MOONSHOT_API_KEY`
- Exemple de model : `moonshot/kimi-k2.5`

Identifiants de model Kimi K2 :

{/* markdownlint-disable MD037 */}

{/_ moonshot-kimi-k2-model-refs:start _/ && null}

{/* markdownlint-enable MD037 */}

- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-0905-preview`
- `moonshot/kimi-k2-turbo-preview`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
  {/* markdownlint-disable MD037 */}
  {/_ moonshot-kimi-k2-model-refs:end _/ && null}
  {/* markdownlint-enable MD037 */}

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.5", name: "Kimi K2.5" }],
      },
    },
  },
}
```

### Kimi Coding

Kimi Coding utilise le point de terminaison compatible Moonshot de Anthropic AI :

- Fournisseur : `kimi-coding`
- Auth : `KIMI_API_KEY`
- Exemple de modèle : `kimi-coding/k2p5`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi-coding/k2p5" } },
  },
}
```

### Qwen OAuth (gratuit)

Qwen fournit un accès OAuth à Qwen Coder + Vision via un flux de code d'appareil.
Activez le plugin inclus, puis connectez-vous :

```bash
openclaw plugins enable qwen-portal-auth
openclaw models auth login --provider qwen-portal --set-default
```

Références de modèles :

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

Voir [/providers/qwen](/fr/providers/qwen) pour les détails de configuration et les notes.

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) permet d'accéder à Doubao et à d'autres modèles en Chine.

- Fournisseur : `volcengine` (codage : `volcengine-plan`)
- Auth : `VOLCANO_ENGINE_API_KEY`
- Exemple de modèle : `volcengine/doubao-seed-1-8-251228`
- CLI : `openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine/doubao-seed-1-8-251228" } },
  },
}
```

Modèles disponibles :

- `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
- `volcengine/doubao-seed-code-preview-251028`
- `volcengine/kimi-k2-5-260127` (Kimi K2.5)
- `volcengine/glm-4-7-251222` (GLM 4.7)
- `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

Modèles de codage (`volcengine-plan`) :

- `volcengine-plan/ark-code-latest`
- `volcengine-plan/doubao-seed-code`
- `volcengine-plan/kimi-k2.5`
- `volcengine-plan/kimi-k2-thinking`
- `volcengine-plan/glm-4.7`

### BytePlus (International)

BytePlus ARK permet d'accéder aux mêmes modèles que Volcano Engine pour les utilisateurs internationaux.

- Fournisseur : `byteplus` (codage : `byteplus-plan`)
- Auth : `BYTEPLUS_API_KEY`
- Exemple de modèle : `byteplus/seed-1-8-251228`
- CLI : `openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus/seed-1-8-251228" } },
  },
}
```

Modèles disponibles :

- `byteplus/seed-1-8-251228` (Seed 1.8)
- `byteplus/kimi-k2-5-260127` (Kimi K2.5)
- `byteplus/glm-4-7-251222` (GLM 4.7)

Modèles de codage (`byteplus-plan`) :

- `byteplus-plan/ark-code-latest`
- `byteplus-plan/doubao-seed-code`
- `byteplus-plan/kimi-k2.5`
- `byteplus-plan/kimi-k2-thinking`
- `byteplus-plan/glm-4.7`

### Synthetic

Synthetic fournit des modèles compatibles avec Anthropic via le fournisseur `synthetic` :

- Provider : `synthetic`
- Auth : `SYNTHETIC_API_KEY`
- Exemple de model : `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI : `openclaw onboard --auth-choice synthetic-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M2.5" } },
  },
  models: {
    mode: "merge",
    providers: {
      synthetic: {
        baseUrl: "https://api.synthetic.new/anthropic",
        apiKey: "${SYNTHETIC_API_KEY}",
        api: "anthropic-messages",
        models: [{ id: "hf:MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" }],
      },
    },
  },
}
```

### MiniMax

MiniMax est configuré via `models.providers` car il utilise des points de terminaison personnalisés :

- MiniMax (compatible Anthropic) : `--auth-choice minimax-api`
- Auth : `MINIMAX_API_KEY`

Voir [/providers/minimax](/fr/providers/minimax) pour les détails de configuration, les options de model et les extraits de configuration.

### Ollama

Ollama est fourni sous forme de plugin de provider groupé et utilise l'Ollama native de API :

- Provider : `ollama`
- Auth : Aucune requise (serveur local)
- Exemple de model : `ollama/llama3.3`
- Installation : [https://ollama.com/download](https://ollama.com/download)

```bash
# Install Ollama, then pull a model:
ollama pull llama3.3
```

```json5
{
  agents: {
    defaults: { model: { primary: "ollama/llama3.3" } },
  },
}
```

Ollama est détecté localement au niveau de `http://127.0.0.1:11434` lorsque vous activez l'option avec
`OLLAMA_API_KEY`, et le plugin de provider groupé ajoute directement Ollama à
`openclaw onboard` et au sélecteur de model. Voir [/providers/ollama](/fr/providers/ollama)
pour l'onboarding, le mode cloud/local et la configuration personnalisée.

### vLLM

vLLM est fourni sous forme de plugin de provider groupé pour les serveurs compatibles OpenAI locaux/auto-hébergés :

- Provider : `vllm`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:8000/v1`

Pour activer la détection automatique localement (n'importe quelle valeur fonctionne si votre serveur n'applique pas l'auth) :

```bash
export VLLM_API_KEY="vllm-local"
```

Définissez ensuite un model (remplacez par l'un des ID renvoyés par `/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Voir [/providers/vllm](/fr/providers/vllm) pour plus de détails.

### SGLang

SGLang est fourni sous forme de plugin de provider groupé pour les serveurs compatibles OpenAI auto-hébergés rapides :

- Provider : `sglang`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:30000/v1`

Pour activer la détection automatique localement (n'importe quelle valeur fonctionne si votre serveur n'applique pas
l'auth) :

```bash
export SGLANG_API_KEY="sglang-local"
```

Définissez ensuite un model (remplacez par l'un des ID renvoyés par `/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Voir [/providers/sglang](/fr/providers/sglang) pour plus de détails.

### Proxies locaux (LM Studio, vLLM, LiteLLM, etc.)

Exemple (compatible OpenAI) :

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/minimax-m2.5-gs32" },
      models: { "lmstudio/minimax-m2.5-gs32": { alias: "Minimax" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "LMSTUDIO_KEY",
        api: "openai-completions",
        models: [
          {
            id: "minimax-m2.5-gs32",
            name: "MiniMax M2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

Remarques :

- Pour les fournisseurs personnalisés, `reasoning`, `input`, `cost`, `contextWindow` et `maxTokens` sont facultatifs.
  En cas d'omission, OpenClaw utilise les valeurs par défaut suivantes :
  - `reasoning: false`
  - `input: ["text"]`
  - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
  - `contextWindow: 200000`
  - `maxTokens: 8192`
- Recommandé : définissez des valeurs explicites correspondant aux limites de votre proxy/modèle.
- Pour `api: "openai-completions"` sur des points de terminaison non natifs (tout `baseUrl` non vide dont l'hôte n'est pas `api.openai.com`), OpenClaw force `compat.supportsDeveloperRole: false` pour éviter les erreurs 400 du fournisseur dues aux rôles `developer` non pris en charge.
- Si `baseUrl` est vide ou omis, OpenClaw conserve le comportement par défaut de OpenAI (qui correspond à `api.openai.com`).
- Pour des raisons de sécurité, un `compat.supportsDeveloperRole: true` explicite est toujours remplacé sur les points de terminaison `openai-completions` non natifs.

## Exemples CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Voir aussi : [/gateway/configuration](/fr/gateway/configuration) pour des exemples complets de configuration.

import fr from '/components/footer/fr.mdx';

<fr />
