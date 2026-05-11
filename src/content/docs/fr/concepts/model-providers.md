---
summary: "Aperçu des providers de modèles avec des exemples de configuration + flux CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Providers de modèles"
sidebarTitle: "Providers de modèles"
---

Référence pour les **providers LLM/de modèles** (pas les canaux de chat comme WhatsApp/Telegram). Pour les règles de sélection de modèle, voir [Modèles](/fr/concepts/models).

## Règles rapides

<AccordionGroup>
  <Accordion title="Références de modèle et assistants CLI">
    - Les références de modèle utilisent `provider/model` (exemple : `opencode/claude-opus-4-6`).
    - `agents.defaults.models` agit comme une liste d'autorisation (allowlist) lorsqu'il est défini.
    - Assistants CLI : `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` définissent les valeurs par défaut au niveau du provider ; `models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` les remplacent pour chaque modèle.
    - Règles de repli, sondages de refroidissement et persistance du remplacement de session : [Échec de basculement de modèle](/fr/concepts/model-failover).
  </Accordion>
  <Accordion title="Fournisseur/exécution OpenAI divisé">
    Les routes de la famille OpenAI sont spécifiques au préfixe :

    - `openai/<model>` utilise le fournisseur de clé API OpenAI direct dans PI.
    - `openai-codex/<model>` utilise Codex OAuth dans PI.
    - `openai/<model>` plus `agents.defaults.agentRuntime.id: "codex"` utilise le harnais natif du serveur d'application Codex.

    Voir [OpenAI](/fr/providers/openai) et [Harnais Codex](/fr/plugins/codex-harness). Si la division fournisseur/exécution est déroutante, lisez d'abord [Runtimes de l'agent](/fr/concepts/agent-runtimes).

    L'activation automatique du plugin suit la même limite : `openai-codex/<model>` appartient au plugin OpenAI, tandis que le plugin Codex est activé par `agentRuntime.id: "codex"` ou les refs de `codex/<model>` hérités.

    GPT-5.5 est disponible via `openai/gpt-5.5` pour le trafic direct par clé API, `openai-codex/gpt-5.5` dans PI pour Codex OAuth, et le harnais natif du serveur d'application Codex lorsque `agentRuntime.id: "codex"` est défini.

  </Accordion>
  <Accordion title="Runtimes CLI">
    Les runtimes CLI utilisent la même division : choisissez des références de modèle canoniques telles que `anthropic/claude-*`, `google/gemini-*`, ou `openai/gpt-*`, puis définissez `agents.defaults.agentRuntime.id` sur `claude-cli`, `google-gemini-cli`, ou `codex-cli` lorsque vous souhaitez un backend CLI local.

    Les refs de `claude-cli/*`, `google-gemini-cli/*`, et `codex-cli/*` héritées migrent vers les références de fournisseur canoniques avec le runtime enregistré séparément.

  </Accordion>
</AccordionGroup>

## Comportement du fournisseur détenue par le plugin

La plupart des logiques spécifiques aux fournisseurs résident dans les plugins de fournisseur (`registerProvider(...)`) tandis qu'OpenClaw conserve la boucle d'inférence générique. Les plugins gèrent l'onboarding, les catalogues de modèles, le mappage des variables d'environnement d'authentification, la normalisation du transport/config, le nettoyage du schéma d'outils, la classification du basculement, le rafraîchissement OAuth, le rapport d'utilisation, les profils de réflexion/reasoning, et plus encore.

La liste complète des hooks du SDK de fournisseur et des exemples de plugins groupés se trouve dans [Provider plugins](/fr/plugins/sdk-provider-plugins). Un fournisseur qui a besoin d'un exécuteur de requêtes totalement personnalisé constitue une surface d'extension distincte et plus approfondie.

<Note>Le runtime du fournisseur `capabilities` est des métadonnées d'exécuteur partagées (famille de fournisseurs, particularités de transcription/outillage, indices de transport/cache). Ce n'est pas la même chose que le [modèle de capacité publique](/fr/plugins/architecture#public-capability-model), qui décrit ce qu'un plugin enregistre (inférence de texte, parole, etc.).</Note>

## Rotation de la clé API

<AccordionGroup>
  <Accordion title="Sources de clés et priorité">
    Configurez plusieurs clés via :

    - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement direct unique, priorité la plus élevée)
    - `<PROVIDER>_API_KEYS` (liste séparée par des virgules ou des points-virgules)
    - `<PROVIDER>_API_KEY` (clé primaire)
    - `<PROVIDER>_API_KEY_*` (liste numérotée, par exemple `<PROVIDER>_API_KEY_1`)

    Pour les fournisseurs Google, `GOOGLE_API_KEY` est également inclus en tant que solution de secours. L'ordre de sélection des clés préserve la priorité et déduplique les valeurs.

  </Accordion>
  <Accordion title="Quand la rotation s'active">
    - Les demandes sont réessayées avec la clé suivante uniquement en cas de réponses de limite de taux (par exemple `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, ou des messages périodiques de limite d'utilisation).
    - Les échecs non liés à la limite de taux échouent immédiatement ; aucune rotation de clé n'est tentée.
    - Lorsque toutes les clés candidates échouent, l'erreur finale est renvoyée à partir de la dernière tentative.
  </Accordion>
</AccordionGroup>

## Fournisseurs intégrés (catalogue pi-ai)

OpenClaw est livré avec le catalogue pi‑ai. Ces fournisseurs ne nécessitent **aucune** configuration `models.providers` ; il suffit de définir l'authentification et de choisir un modèle.

### OpenAI

- Fournisseur : `openai`
- Auth : `OPENAI_API_KEY`
- Rotation facultative : `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, plus `OPENCLAW_LIVE_OPENAI_KEY` (remplacement unique)
- Exemples de modèles : `openai/gpt-5.5`, `openai/gpt-5.4-mini`
- Vérifiez la disponibilité du compte/modèle avec `openclaw models list --provider openai` si une installation spécifique ou une clé API se comporte différemment.
- CLI : `openclaw onboard --auth-choice openai-api-key`
- Le transport par défaut est `auto` (priorité WebSocket, repli SSE)
- Remplacer pour chaque modèle via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"`, ou `"auto"`)
- Le préchauffage WebSocket des réponses OpenAI est activé par défaut via `params.openaiWsWarmup` (`true`/`false`)
- Le traitement prioritaire OpenAI peut être activé via `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` et `params.fastMode` mappent les requêtes de réponses directes `openai/*` vers `service_tier=priority` sur `api.openai.com`
- Utilisez `params.serviceTier` lorsque vous souhaitez un niveau explicite au lieu de l'interrupteur partagé `/fast`
- Les en-têtes d'attribution masqués OpenClaw (`originator`, `version`, `User-Agent`) s'appliquent uniquement au trafic natif OpenAI vers `api.openai.com`, et non aux proxys génériques compatibles OpenAI
- Les routes natives OpenAI conservent également `store`, les indicateurs de cache de prompt, et le façonnage de payload de compatibilité de raisonnement OpenAI ; les routes de proxy ne le font pas
- `openai/gpt-5.3-codex-spark` est intentionnellement supprimé dans OpenClaw car les requêtes OpenAI API en direct le rejettent et le catalogue Codex actuel ne l'expose pas

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
}
```

### Anthropic

- Fournisseur : `anthropic`
- Auth : `ANTHROPIC_API_KEY`
- Rotation facultative : `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, plus `OPENCLAW_LIVE_ANTHROPIC_KEY` (remplacement unique)
- Modèle exemple : `anthropic/claude-opus-4-6`
- CLI : `openclaw onboard --auth-choice apiKey`
- Les requêtes publiques directes vers Anthropic prennent en charge le bouton bascule partagé `/fast` et `params.fastMode`, y compris le trafic authentifié par clé API et OAuth envoyé à `api.anthropic.com` ; OpenClaw mappe cela vers Anthropic `service_tier` (`auto` vs `standard_only`)
- La configuration Claude CLI préférée conserve la référence du modèle canonique et sélectionne le backend CLI séparément : `anthropic/claude-opus-4-7` avec `agents.defaults.agentRuntime.id: "claude-cli"`. Les références `claude-cli/claude-opus-4-7` obsolètes fonctionnent toujours pour la compatibilité.

<Note>
  Le personnel d'Anthropic nous a informé que l'utilisation de Claude OpenClaw de type CLI est à nouveau autorisée, donc OpenClaw considère la réutilisation de Claude CLI et l'utilisation de `claude -p` comme approuvées pour cette intégration, sauf si Anthropic publie une nouvelle politique. Le jeton de configuration Anthropic reste disponible en tant que chemin de jeton pris en charge par
  OpenClaw, mais OpenClaw préfère désormais la réutilisation de Claude CLI et `claude -p` lorsqu'ils sont disponibles.
</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Codex OAuth

- Provider : `openai-codex`
- Auth : OAuth (ChatGPT)
- Réf. de modèle PI : `openai-codex/gpt-5.5`
- Réf. de harnais d'application serveur Codex natif : `openai/gpt-5.5` avec `agents.defaults.agentRuntime.id: "codex"`
- Documentation du harnais d'application serveur Codex natif : [Codex harness](/fr/plugins/codex-harness)
- Références de modèle obsolètes : `codex/gpt-*`
- Limite du plugin : `openai-codex/*` charge le plugin OpenAI ; le plugin d'application serveur Codex natif n'est sélectionné que par le runtime du harnais Codex ou les références `codex/*` obsolètes.
- CLI : `openclaw onboard --auth-choice openai-codex` ou `openclaw models auth login --provider openai-codex`
- Le transport par défaut est `auto` (WebSocket en priorité, repli SSE)
- Remplacer pour chaque modèle PI via `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"` ou `"auto"`)
- `params.serviceTier` est également transmis lors des requêtes de réponses Codex natives (`chatgpt.com/backend-api`)
- Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`, `User-Agent`) sont uniquement attachés au trafic natif Codex vers `chatgpt.com/backend-api`, et non aux proxys compatibles OpenClaw génériques
- Partage le même interrupteur `/fast` et la configuration `params.fastMode` que le `openai/*` direct ; OpenClaw mappe cela vers `service_tier=priority`
- `openai-codex/gpt-5.5` utilise le `contextWindow = 400000` natif du catalogue Codex et le runtime `contextTokens = 272000` par défaut ; remplacez la limite du runtime avec `models.providers.openai-codex.models[].contextTokens`
- Note de politique : OpenAI Codex OAuth est explicitement pris en charge pour les outils/workflows externes tels que OpenClaw.
- Utilisez `openai-codex/gpt-5.5` lorsque vous souhaitez la route OAuth/d'abonnement Codex ; utilisez `openai/gpt-5.5` lorsque votre configuration de clé API et votre catalogue local exposent la route de l'API publique.

```json5
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.5" } } },
}
```

```json5
{
  models: {
    providers: {
      "openai-codex": {
        models: [{ id: "gpt-5.5", contextTokens: 160000 }],
      },
    },
  },
}
```

### Autres options hébergées par abonnement

<CardGroup cols={3}>
  <Card title="modèles GLM" href="/fr/providers/glm">
    Plan de codage Z.AI ou points de terminaison API généraux.
  </Card>
  <Card title="MiniMax" href="/fr/providers/minimax">
    Accès par MiniMax ou clé OAuth au plan de codage API.
  </Card>
  <Card title="Cloud Qwen" href="/fr/providers/qwen">
    Surface du fournisseur Cloud Qwen plus mappage des points de terminaison Alibaba DashScope et du plan de codage.
  </Card>
</CardGroup>

### OpenCode

- Auth : `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`)
- Fournisseur de runtime Zen : `opencode`
- Fournisseur de runtime Go : `opencode-go`
- Exemples de modèles : `opencode/claude-opus-4-6`, `opencode-go/kimi-k2.6`
- CLI : `openclaw onboard --auth-choice opencode-zen` ou `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (clé API)

- Fournisseur : `google`
- Auth : `GEMINI_API_KEY`
- Rotation facultative : `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, repli `GOOGLE_API_KEY` et `OPENCLAW_LIVE_GEMINI_KEY` (remplacement unique)
- Exemples de modèles : `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilité : la configuration legacy OpenClaw utilisant `google/gemini-3.1-flash-preview` est normalisée en `google/gemini-3-flash-preview`
- CLI : `openclaw onboard --auth-choice gemini-api-key`
- Réflexion : `/think adaptive` utilise la réflexion dynamique de Google. Gemini 3/3.1 omettent un `thinkingLevel` fixe ; Gemini 2.5 envoie `thinkingBudget: -1`.
- Les exécutions directes Gemini acceptent également `agents.defaults.models["google/<model>"].params.cachedContent` (ou l'ancien `cached_content`) pour transférer un gestionnaire `cachedContents/...` natif du fournisseur ; les succès du cache Gemini apparaissent comme OpenClaw `cacheRead`

### Google Vertex et Gemini CLI

- Fournisseurs : `google-vertex`, `google-gemini-cli`
- Auth : Vertex utilise gcloud ADC ; Gemini CLI utilise son propre flux OAuth

<Warning>Le CLI OAuth Gemini dans OpenClaw est une intégration non officielle. Certains utilisateurs ont signalé des restrictions sur leur compte Google après avoir utilisé des clients tiers. Consultez les conditions d'utilisation de Google et utilisez un compte non critique si vous choisissez de continuer.</Warning>

Le CLI OAuth Gemini est fourni dans le cadre du plugin groupé `google`.

<Steps>
  <Step title="Installer le CLI Gemini">
    <Tabs>
      <Tab title="brew">
        ```bash
        brew install gemini-cli
        ```
      </Tab>
      <Tab title="npm">
        ```bash
        npm install -g @google/gemini-cli
        ```
      </Tab>
    </Tabs>
  </Step>
  <Step title="Enable plugin">
    ```bash
    openclaw plugins enable google
    ```
  </Step>
  <Step title="Connexion">
    ```bash
    openclaw models auth login --provider google-gemini-cli --set-default
    ```

    Modèle par défaut : `google-gemini-cli/gemini-3-flash-preview`. Vous ne devez **pas** coller un identifiant client ou un secret dans `openclaw.json`. Le flux de connexion CLI stocke les jetons dans les profils d'authentification sur l'hôte de la passerelle.

  </Step>
  <Step title="Définir le projet (si nécessaire)">
    Si les requêtes échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle.
  </Step>
</Steps>

Les réponses JSON du CLI Gemini sont analysées à partir de `response` ; l'utilisation revient à `stats`, avec `stats.cached` normalisé en OpenClaw `cacheRead`.

### Z.AI (GLM)

- Fournisseur : `zai`
- Auth : `ZAI_API_KEY`
- Exemple de modèle : `zai/glm-5.1`
- CLI : `openclaw onboard --auth-choice zai-api-key`
  - Alias : `z.ai/*` et `z-ai/*` sont normalisés vers `zai/*`
  - `zai-api-key` détecte automatiquement le point de terminaison Z.AI correspondant ; `zai-coding-global`, `zai-coding-cn`, `zai-global` et `zai-cn` forcent une surface spécifique

### Gateway IA Vercel

- Provider : `vercel-ai-gateway`
- Auth : `AI_GATEWAY_API_KEY`
- Exemples de modèles : `vercel-ai-gateway/anthropic/claude-opus-4.6`, `vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI : `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Provider : `kilocode`
- Auth : `KILOCODE_API_KEY`
- Exemple de modèle : `kilocode/kilo/auto`
- CLI : `openclaw onboard --auth-choice kilocode-api-key`
- URL de base : `https://api.kilo.ai/api/gateway/`
- Le catalogue de repli statique fournit `kilocode/kilo/auto` ; la découverte en direct `https://api.kilo.ai/api/gateway/models` peut étendre davantage le catalogue d'exécution.
- Le routage amont exact derrière `kilocode/kilo/auto` est géré par Kilo Gateway, et n'est pas codé en dur dans OpenClaw.

Voir [/providers/kilocode](/fr/providers/kilocode) pour les détails de configuration.

### Autres plugins de provider groupés

| Provider                | Id                               | Auth env                                                     | Exemple de modèle                               |
| ----------------------- | -------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| BytePlus                | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                           | `byteplus-plan/ark-code-latest`                 |
| Cerebras                | `cerebras`                       | `CEREBRAS_API_KEY`                                           | `cerebras/zai-glm-4.7`                          |
| Cloudflare AI Gateway   | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                              | —                                               |
| DeepSeek                | `deepseek`                       | `DEEPSEEK_API_KEY`                                           | `deepseek/deepseek-v4-flash`                    |
| GitHub Copilot          | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`         | —                                               |
| Groq                    | `groq`                           | `GROQ_API_KEY`                                               | —                                               |
| Inférence Hugging Face  | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN`                        | `huggingface/deepseek-ai/DeepSeek-R1`           |
| Kilo Gateway            | `kilocode`                       | `KILOCODE_API_KEY`                                           | `kilocode/kilo/auto`                            |
| Kimi Coding             | `kimi`                           | `KIMI_API_KEY` ou `KIMICODE_API_KEY`                         | `kimi/kimi-code`                                |
| MiniMax                 | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                    | `minimax/MiniMax-M2.7`                          |
| Mistral                 | `mistral`                        | `MISTRAL_API_KEY`                                            | `mistral/mistral-large-latest`                  |
| Moonshot                | `moonshot`                       | `MOONSHOT_API_KEY`                                           | `moonshot/kimi-k2.6`                            |
| NVIDIA                  | `nvidia`                         | `NVIDIA_API_KEY`                                             | `nvidia/nvidia/llama-3.1-nemotron-70b-instruct` |
| OpenRouter              | `openrouter`                     | `OPENROUTER_API_KEY`                                         | `openrouter/auto`                               |
| Qianfan                 | `qianfan`                        | `QIANFAN_API_KEY`                                            | `qianfan/deepseek-v3.2`                         |
| Qwen Cloud              | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                             |
| StepFun                 | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                            | `stepfun/step-3.5-flash`                        |
| Together                | `together`                       | `TOGETHER_API_KEY`                                           | `together/moonshotai/Kimi-K2.5`                 |
| Venice                  | `venice`                         | `VENICE_API_KEY`                                             | —                                               |
| Vercel AI Gateway       | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                         | `vercel-ai-gateway/anthropic/claude-opus-4.6`   |
| Volcano Engine (Doubao) | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                     | `volcengine-plan/ark-code-latest`               |
| xAI                     | `xai`                            | `XAI_API_KEY`                                                | `xai/grok-4`                                    |
| Xiaomi                  | `xiaomi`                         | `XIAOMI_API_KEY`                                             | `xiaomi/mimo-v2-flash`                          |

#### Particularités à connaître

<AccordionGroup>
  <Accordion title="OpenRouter">
    Applique ses en-têtes d'attribution d'application et les marqueurs Anthropic `cache_control` uniquement sur les routes `openrouter.ai` vérifiées. Les références DeepSeek, Moonshot et ZAI sont éligibles pour le cache-TTL pour la mise en cache des invites gérée par OpenRouter mais ne reçoivent pas les marqueurs de cache Anthropic. En tant que chemin compatible OpenAI de style proxy, il ignore le formatage natif-OpenAI uniquement (`serviceTier`, Responses `store`, indices de cache d'invite, compatibilité de raisonnement OpenAI). Les références basées sur Gemini conservent uniquement le nettoyage de la signature de pensée proxy-Gemini.
  </Accordion>
  <Accordion title="Kilo Gateway">
    Les références basées sur Gemini suivent le même chemin de nettoyage proxy-Gemini ; `kilocode/kilo/auto` et autres références non prises en charge pour le raisonnement proxy ignorent l'injection de raisonnement proxy.
  </Accordion>
  <Accordion title="MiniMax">
    L'intégration de la clé API écrit des définitions explicites de modèle de chat M2.7 en texte uniquement ; la compréhension des images reste sur le fournisseur de médias `MiniMax-VL-01` appartenant au plugin.
  </Accordion>
  <Accordion title="xAI">
    Utilise le chemin de réponses xAI. `/fast` ou `params.fastMode: true` réécrit `grok-3`, `grok-3-mini`, `grok-4` et `grok-4-0709` vers leurs variantes `*-fast`. `tool_stream` est activé par défaut ; désactivez via `agents.defaults.models["xai/<model>"].params.tool_stream=false`.
  </Accordion>
  <Accordion title="Cerebras">
    Est fourni en tant que plugin de fournisseur `cerebras` groupé. GLM utilise `zai-glm-4.7` ; l'URL de base compatible OpenAI est `https://api.cerebras.ai/v1`.
  </Accordion>
</AccordionGroup>

## Providers via `models.providers` (custom/base URL)

Use `models.providers` (or `models.json`) to add **custom** providers or OpenAI/Anthropic‑compatible proxies.

La plupart des plugins de provider ci-dessous publient déjà un catalogue par défaut. Utilisez des entrées explicites `models.providers.<id>` uniquement lorsque vous souhaitez remplacer l'URL de base, les en-têtes ou la liste des modèles par défaut.

### Moonshot AI (Kimi)

Moonshot est fourni en tant que plugin de provider groupé. Utilisez le provider intégré par défaut, et ajoutez une entrée explicite `models.providers.moonshot` uniquement lorsque vous devez remplacer l'URL de base ou les métadonnées du modèle :

- Provider : `moonshot`
- Auth : `MOONSHOT_API_KEY`
- Exemple de modèle : `moonshot/kimi-k2.6`
- CLI : `openclaw onboard --auth-choice moonshot-api-key` ou `openclaw onboard --auth-choice moonshot-api-key-cn`

ID des modèles Kimi K2 :

[//]: # "moonshot-kimi-k2-model-refs:start"

- `moonshot/kimi-k2.6`
- `moonshot/kimi-k2.5`
- `moonshot/kimi-k2-thinking`
- `moonshot/kimi-k2-thinking-turbo`
- `moonshot/kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-model-refs:end"

```json5
{
  agents: {
    defaults: { model: { primary: "moonshot/kimi-k2.6" } },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [{ id: "kimi-k2.6", name: "Kimi K2.6" }],
      },
    },
  },
}
```

### Codage Kimi

Kimi Coding utilise le point de terminaison compatible Moonshot de Anthropic AI :

- Provider : `kimi`
- Auth : `KIMI_API_KEY`
- Exemple de modèle : `kimi/kimi-code`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-code" } },
  },
}
```

L'ancien `kimi/k2p5` reste accepté comme ID de modèle de compatibilité.

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) fournit l'accès aux modèles Doubao et autres en Chine.

- Provider : `volcengine` (codage : `volcengine-plan`)
- Auth : `VOLCANO_ENGINE_API_KEY`
- Exemple de modèle : `volcengine-plan/ark-code-latest`
- CLI : `openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

L'intégration (onboarding) par défaut concerne la surface de codage, mais le catalogue général `volcengine/*` est enregistré en même temps.

Dans les sélecteurs de modèle d'intégration (onboarding) et de configuration, le choix d'authentification Volcengine privilégie les lignes `volcengine/*` et `volcengine-plan/*`. Si ces modèles ne sont pas encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur vide limité au provider.

<Tabs>
  <Tab title="Modèles standard">- `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8) - `volcengine/doubao-seed-code-preview-251028` - `volcengine/kimi-k2-5-260127` (Kimi K2.5) - `volcengine/glm-4-7-251222` (GLM 4.7) - `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)</Tab>
  <Tab title="Modèles de codage (volcengine-plan)">- `volcengine-plan/ark-code-latest` - `volcengine-plan/doubao-seed-code` - `volcengine-plan/kimi-k2.5` - `volcengine-plan/kimi-k2-thinking` - `volcengine-plan/glm-4.7`</Tab>
</Tabs>

### BytePlus (International)

BytePlus ARK permet d'accéder aux mêmes modèles que Volcano Engine pour les utilisateurs internationaux.

- Provider : `byteplus` (codage : `byteplus-plan`)
- Auth : `BYTEPLUS_API_KEY`
- Exemple de modèle : `byteplus-plan/ark-code-latest`
- CLI : `openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

L'intégration (onboarding) par défaut concerne la surface de codage, mais le catalogue général `byteplus/*` est enregistré en même temps.

Dans les sélecteurs de modèles d'intégration/configuration, le choix d'authentification BytePlus privilégie les lignes `byteplus/*` et `byteplus-plan/*`. Si ces modèles ne sont pas encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur vide délimité au provider.

<Tabs>
  <Tab title="Modèles standard">- `byteplus/seed-1-8-251228` (Seed 1.8) - `byteplus/kimi-k2-5-260127` (Kimi K2.5) - `byteplus/glm-4-7-251222` (GLM 4.7)</Tab>
  <Tab title="Modèles de codage (byteplus-plan)">- `byteplus-plan/ark-code-latest` - `byteplus-plan/doubao-seed-code` - `byteplus-plan/kimi-k2.5` - `byteplus-plan/kimi-k2-thinking` - `byteplus-plan/glm-4.7`</Tab>
</Tabs>

### Synthetic

Synthetic fournit des modèles compatibles avec Anthropic via le provider `synthetic` :

- Provider : `synthetic`
- Auth : `SYNTHETIC_API_KEY`
- Exemple de modèle : `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
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

- MiniMax OAuth (Global) : `--auth-choice minimax-global-oauth`
- MiniMax OAuth (CN) : `--auth-choice minimax-cn-oauth`
- Clé MiniMax API (Global) : `--auth-choice minimax-global-api`
- Clé MiniMax API (CN) : `--auth-choice minimax-cn-api`
- Auth : `MINIMAX_API_KEY` pour `minimax` ; `MINIMAX_OAUTH_TOKEN` ou `MINIMAX_API_KEY` pour `minimax-portal`

Consultez [/providers/minimax](/fr/providers/minimax) pour les détails de configuration, les options de modèle et les extraits de configuration.

<Note>Sur le chemin de streaming compatible MiniMax de Anthropic, OpenClaw désactive la réflexion par défaut, sauf si vous la définissez explicitement, et `/fast on` réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.</Note>

Répartition des capacités détenues par le plugin :

- Les valeurs par défaut pour le texte/chat restent sur `minimax/MiniMax-M2.7`
- La génération d'images est `minimax/image-01` ou `minimax-portal/image-01`
- La compréhension d'images est une capacité `MiniMax-VL-01` détenue par le plugin sur les deux chemins d'authentification MiniMax
- La recherche web reste sur l'identifiant de fournisseur `minimax`

### LM Studio

LM Studio est fourni en tant que plugin de fournisseur groupé qui utilise l'API native :

- Fournisseur : `lmstudio`
- Auth : `LM_API_TOKEN`
- URL de base d'inférence par défaut : `http://localhost:1234/v1`

Ensuite, définissez un modèle (remplacez par l'un des ID renvoyés par `http://localhost:1234/api/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw utilise les `/api/v1/models` et `/api/v1/models/load` natives de LM Studio pour la découverte et le chargement automatique, avec `/v1/chat/completions` pour l'inférence par défaut. Consultez [/providers/lmstudio](/fr/providers/lmstudio) pour la configuration et le dépannage.

### Ollama

Ollama est fourni en tant que plugin de fournisseur groupé et utilise l'Ollama native de API :

- Fournisseur : `ollama`
- Auth : Aucune requise (serveur local)
- Exemple de modèle : `ollama/llama3.3`
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

Ollama est détecté localement à `http://127.0.0.1:11434` lorsque vous activez l'option avec `OLLAMA_API_KEY`, et le plugin de fournisseur groupé ajoute Ollama directement à `openclaw onboard` et au sélecteur de modèle. Consultez [/providers/ollama](/fr/providers/ollama) pour la prise en main, le mode cloud/local et la configuration personnalisée.

### vLLM

vLLM est fourni en tant que plugin de fournisseur groupé pour les serveurs compatibles OpenAI en libre-service/hébergés localement :

- Fournisseur : `vllm`
- Auth : Facultatif (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:8000/v1`

Pour activer la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'applique pas l'authentification) :

```bash
export VLLM_API_KEY="vllm-local"
```

Définissez ensuite un modèle (remplacez par l'un des ID renvoyés par `/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "vllm/your-model-id" } },
  },
}
```

Consultez [/providers/vllm](/fr/providers/vllm) pour plus de détails.

### SGLang

SGLang est fourni en tant que plugin de fournisseur groupé pour les serveurs auto-hébergés rapides compatibles OpenAI :

- Fournisseur : `sglang`
- Auth : Facultatif (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:30000/v1`

Pour activer la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'applique pas l'authentification) :

```bash
export SGLANG_API_KEY="sglang-local"
```

Définissez ensuite un modèle (remplacez par l'un des ID renvoyés par `/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "sglang/your-model-id" } },
  },
}
```

Consultez [/providers/sglang](/fr/providers/sglang) pour plus de détails.

### Proxys locaux (LM Studio, vLLM, LiteLLM, etc.)

Exemple (compatible OpenAI) :

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: { "lmstudio/my-local-model": { alias: "Local" } },
    },
  },
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "Local Model",
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

<AccordionGroup>
  <Accordion title="Champs facultatifs par défaut">
    Pour les fournisseurs personnalisés, `reasoning`, `input`, `cost`, `contextWindow` et `maxTokens` sont facultatifs. En cas d'omission, OpenClaw utilise par défaut :

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    Recommandé : définissez des valeurs explicites correspondant aux limites de votre proxy/modèle.

  </Accordion>
  <Accordion title="Proxy-route shaping rules">
    - Pour `api: "openai-completions"` sur des points de terminaison non natifs (toute `baseUrl` non vide dont l'hôte n'est pas `api.openai.com`), OpenClaw force `compat.supportsDeveloperRole: false` pour éviter les erreurs 400 du provider pour les rôles `developer` non pris en charge.
    - Les routes de style proxy compatibles avec OpenAI ignorent également le façonnement des requêtes natif uniquement pour OpenAI : pas de `service_tier`, pas de Réponses `store`, pas de Completions `store`, pas d'indices de cache de prompt, pas de façonnement de payload compatible avec le raisonnement OpenAI et pas d'en-têtes d'attribution OpenClaw cachés.
    - Pour les proxies de Completions compatibles OpenAI qui nécessitent des champs spécifiques au fournisseur, définissez `agents.defaults.models["provider/model"].params.extra_body` (ou `extraBody`) pour fusionner du JSON supplémentaire dans le corps de la demande sortante.
    - Pour les contrôles du modèle de conversation vLLM, définissez `agents.defaults.models["provider/model"].params.chat_template_kwargs`. Le plugin vLLM groupé envoie automatiquement `enable_thinking: false` et `force_nonempty_content: true` pour `vllm/nemotron-3-*` lorsque le niveau de réflexion de la session est désactivé.
    - Pour les modèles locaux lents ou les hôtes LAN/tailnet distants, définissez `models.providers.<id>.timeoutSeconds`. Cela étend la gestion des requêtes HTTP du modèle de provider, y compris la connexion, les en-têtes, la diffusion du corps et l'abandon de la récupération gardée, sans augmenter le délai d'exécution global de l'agent.
    - Si `baseUrl` est vide/omis, OpenClaw conserve le comportement par défaut de OpenAI (qui se résout en `api.openai.com`).
    - Pour la sécurité, un `compat.supportsDeveloperRole: true` explicite est toujours remplacé sur les points de terminaison `openai-completions` non natifs.
  </Accordion>
</AccordionGroup>

## Exemples CLI

```bash
openclaw onboard --auth-choice opencode-zen
openclaw models set opencode/claude-opus-4-6
openclaw models list
```

Voir aussi : [Configuration](/fr/gateway/configuration) pour des exemples de configuration complets.

## Connexes

- [Référence de configuration](/fr/gateway/config-agents#agent-defaults) — clés de configuration du modèle
- [Basculement de modèle](/fr/concepts/model-failover) — chaînes de secours et comportement de nouvelle tentative
- [Modèles](/fr/concepts/models) — configuration et alias de modèles
- [Providers](/fr/providers) — guides de configuration par provider
