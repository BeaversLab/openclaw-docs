---
summary: "Aperçu des providers de modèles avec des exemples de configuration + flux CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Providers de modèles"
sidebarTitle: "Providers de modèles"
---

Référence pour les **providers de modèles/LLM** (et non les canaux de discussion comme LLMWhatsApp/Telegram). Pour les règles de sélection de modèles, voir [Models](/fr/concepts/models).

## Règles rapides

<AccordionGroup>
  <Accordion title="Références de modèle et assistants CLI">
    - Les références de modèle utilisent `provider/model` (exemple : `opencode/claude-opus-4-6`).
    - `agents.defaults.models` agit comme une liste d'autorisation lorsqu'il est défini.
    - Assistants CLI : `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` définissent les valeurs par défaut au niveau du provider ; `models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` les remplacent pour chaque modèle.
    - Règles de repli, sondages de refroidissement et persistance de remplacement de session : [Model failover](/fr/concepts/model-failover).

  </Accordion>
  <Accordion title="Ajouter l'authentification du provider ne change pas votre modèle principal">
    `openclaw configure` préserve un `agents.defaults.model.primary` existant lorsque vous ajoutez ou réauthentifiez un provider. `openclaw models auth login` fait de même sauf si vous passez `--set-default`. Les plugins de provider peuvent toujours renvoyer un modèle par défaut recommandé dans leur correctif de configuration d'authentification, mais OpenClaw considère cela comme « rendre ce modèle disponible » lorsqu'un modèle principal existe déjà, et non « remplacer le modèle principal actuel ».

    Pour changer intentionnellement le modèle par défaut, utilisez `openclaw models set <provider/model>` ou `openclaw models auth login --provider <id> --set-default`.

  </Accordion>
  <Accordion title="OpenAISéparation fournisseur/runtime OpenAI"OpenAI>
    Les routes de la famille OpenAI sont spécifiques au préfixe :

    - `openai/<model>` utilise le harnais natif de serveur d'application Codex pour les tours d'agent par défaut. Il s'agit de la configuration d'abonnement habituelle pour ChatGPT/Codex.
    - `openai-codex/<model>` est une configuration héritée que le docteur réécrit en `openai/<model>`.
    - `openai/<model>` plus fournisseur/modèle `agentRuntime.id: "pi"`APIOpenAI utilise PI pour les routes de clé d'API explicite ou de compatibilité.

    Voir [OpenAI](/fr/providers/openai) et [harnais Codex](/fr/plugins/codex-harness). Si la séparation fournisseur/runtime est confuse, lisez d'abord [Runtimes d'agent](/fr/concepts/agent-runtimes).

    L'activation automatique du plugin suit la même limite : les références d'agent `openai/*` activent le plugin Codex pour la route par défaut, et les références explicites de fournisseur/modèle `agentRuntime.id: "codex"` ou l'hérité `codex/<model>` le nécessitent également.

    GPT-5.5 est disponible via le harnais natif de serveur d'application Codex par défaut sur `openai/gpt-5.5`, et via PI uniquement lorsque la stratégie d'exécution du fournisseur/modèle sélectionne explicitement `pi`.

  </Accordion>
  <Accordion title="CLIRuntimes CLI"CLI>
    Les runtimes CLI utilisent la même séparation : choisissez des références de modèle canoniques telles que `anthropic/claude-*`, `google/gemini-*`, ou `openai/gpt-*`, puis définissez la stratégie d'exécution du fournisseur/modèle sur `claude-cli`, `google-gemini-cli`, ou `codex-cli` lorsque vous souhaitez un backend CLI local.

    Les références héritées `claude-cli/*`, `google-gemini-cli/*`, et `codex-cli/*` migrent vers les références de fournisseur canoniques avec le runtime enregistré séparément.

  </Accordion>
</AccordionGroup>

## Comportement du fournisseur détenu par le plugin

La plupart des logiques spécifiques aux providers résident dans les plugins de provider (`registerProvider(...)`OpenClawOAuth) tandis qu'OpenClaw conserve la boucle d'inférence générique. Les plugins gèrent l'onboarding, les catalogues de modèles, le mappage des variables d'environnement d'authentification, la normalisation du transport/de la configuration, le nettoyage du schéma des tools, la classification du basculement, le rafraîchissement OAuth, le reporting d'utilisation, les profils de réflexion/reasoning, et plus encore.

La liste complète des hooks du SDK de provider et les exemples de plugins groupés se trouve dans [Provider plugins](/fr/plugins/sdk-provider-plugins). Un provider qui a besoin d'un exécuteur de requêtes totalement personnalisé constitue une surface d'extension distincte et plus profonde.

<Note>Le comportement du runner détenu par le provider réside sur des hooks de provider explicites tels que la politique de relecture, la normalisation du schéma des tools, l'encapsulage de flux, et les assistants de transport/requête. l'ancien sac statique `ProviderPlugin.capabilities` n'est qu'une question de compatibilité et n'est plus lu par la logique du runner partagé.</Note>

## Rotation de la clé API

<AccordionGroup>
  <Accordion title="Key sources and priority">
    Configurez plusieurs clés via :

    - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement unique en direct, priorité la plus élevée)
    - `<PROVIDER>_API_KEYS` (liste séparée par des virgules ou des points-virgules)
    - `<PROVIDER>_API_KEY` (clé primaire)
    - `<PROVIDER>_API_KEY_*` (liste numérotée, par exemple `<PROVIDER>_API_KEY_1`)

    Pour les providers Google, `GOOGLE_API_KEY` est également inclus en tant que repli. L'ordre de sélection des clés préserve la priorité et déduplique les valeurs.

  </Accordion>
  <Accordion title="When rotation kicks in">
    - Les requêtes sont réessayées avec la clé suivante uniquement en cas de réponses de limitation de débit (par exemple `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, ou des messages périodiques de limite d'utilisation).
    - Les échecs non liés à la limitation de débit échouent immédiatement ; aucune rotation de clé n'est tentée.
    - Lorsque toutes les clés candidates échouent, l'erreur finale est renvoyée à partir de la dernière tentative.

  </Accordion>
</AccordionGroup>

## Providers intégrés (catalogue pi-ai)

OpenClaw est fourni avec le catalogue pi-ai. Ces fournisseurs ne nécessitent **aucune** configuration `models.providers` ; il suffit de définir l'authentification et de choisir un modèle.

### OpenAI

- Fournisseur : `openai`
- Authentification : `OPENAI_API_KEY`
- Rotation facultative : `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, ainsi que `OPENCLAW_LIVE_OPENAI_KEY` (remplacement unique)
- Exemples de modèles : `openai/gpt-5.5`, `openai/gpt-5.4-mini`
- Vérifiez la disponibilité du compte/modèle avec `openclaw models list --provider openai` si une installation spécifique ou une clé API se comporte différemment.
- CLI : `openclaw onboard --auth-choice openai-api-key`
- Le transport par défaut est `auto` ; OpenClaw transmet le choix du transport à pi-ai.
- Remplacer pour chaque modèle via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"` ou `"auto"`)
- Le traitement prioritaire OpenAI peut être activé via `agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` et `params.fastMode` mappent les requêtes directes `openai/*` Responses vers `service_tier=priority` sur `api.openai.com`
- Utilisez `params.serviceTier` lorsque vous souhaitez un niveau explicite au lieu de l'interrupteur partagé `/fast`
- Les en-têtes d'attribution masqués OpenClaw (`originator`, `version`, `User-Agent`) ne s'appliquent qu'au trafic natif OpenAI vers `api.openai.com`, et non aux proxys génériques compatibles OpenAI
- Les routes natives OpenAI conservent également `store`, les indicateurs de cache de prompt et le façonnage de charge utile compatible avec le raisonnement OpenAI ; les routes proxy ne le font pas
- `openai/gpt-5.3-codex-spark` est intentionnellement supprimé dans OpenClaw car les requêtes en direct à l'OpenAI API le rejettent et le catalogue Codex actuel ne l'expose pas

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
}
```

### Anthropic

- Fournisseur : `anthropic`
- Auth : `ANTHROPIC_API_KEY`
- Rotation facultative : `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, plus `OPENCLAW_LIVE_ANTHROPIC_KEY` (remplacement unique)
- Exemple de modèle : `anthropic/claude-opus-4-6`
- CLI : `openclaw onboard --auth-choice apiKey`
- Les demandes publiques directes vers Anthropic prennent en charge le commutateur partagé `/fast` et `params.fastMode`, y compris le trafic authentifié par clé API et OAuth envoyé à `api.anthropic.com` ; OpenClaw mappe cela vers Anthropic `service_tier` (`auto` vs `standard_only`)
- La configuration Claude CLI préférée garde la référence du modèle canonique et sélectionne le backend CLI séparément : `anthropic/claude-opus-4-7` avec `agentRuntime.id: "claude-cli"` à portée de modèle. Les références `claude-cli/claude-opus-4-7` héritées fonctionnent toujours pour la compatibilité.

<Note>
  Le personnel de Anthropic nous a informés que l'utilisation de la ligne de commande Claude style OpenClawCLI est à nouveau autorisée, donc OpenClawCLI traite la réutilisation de la ligne de commande Claude et l'utilisation de `claude -p` comme sanctionnées pour cette intégration, sauf si Anthropic publie une nouvelle politique. Le jeton de configuration Anthropic reste disponible en tant que
  chemin de jeton OpenClaw pris en charge, mais OpenClawCLI préfère désormais la réutilisation de la ligne de commande Claude et `claude -p` lorsqu'elles sont disponibles.
</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Codex OAuth

- Fournisseur : `openai-codex`
- Auth : OAuth (ChatGPT)
- Référence de modèle PI héritée : `openai-codex/gpt-5.5`
- Référence de harnais native du serveur d'application Codex : `openai/gpt-5.5`
- Documentation du harnais natif du serveur d'application Codex : [Codex harness](/fr/plugins/codex-harness)
- Références de modèle héritées : `codex/gpt-*`
- Limite du plugin : `openai-codex/*` charge le plugin OpenAI ; le plugin natif du serveur d'application Codex n'est sélectionné que par le runtime du harnais Codex ou les références héritées `codex/*`.
- CLI : `openclaw onboard --auth-choice openai-codex` ou `openclaw models auth login --provider openai-codex`
- Le transport par défaut est `auto` (WebSocket en priorité, repli sur SSE)
- Remplacer pour chaque modèle PI via `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"`, ou `"auto"`)
- `params.serviceTier` est également transmis lors des requêtes natives Codex Responses (`chatgpt.com/backend-api`)
- Les en-têtes d'attribution masqués OpenClaw (`originator`, `version`, `User-Agent`) sont uniquement attachés au trafic natif Codex vers `chatgpt.com/backend-api`, et non aux proxys génériques compatibles OpenAI
- Partage le même commutateur `/fast` et la même configuration `params.fastMode` que `openai/*` direct ; OpenClaw mappe cela vers `service_tier=priority`
- `openai-codex/gpt-5.5` utilise le `contextWindow = 400000` natif du catalogue Codex et le runtime `contextTokens = 272000` par défaut ; remplacer la limite du runtime avec `models.providers.openai-codex.models[].contextTokens`
- Note de politique : OpenAI Codex OAuth est explicitement pris en charge pour les outils/workflows externes tels que OpenClaw.
- Pour la route commune d'abonnement plus le runtime natif Codex, connectez-vous avec l'authentification `openai-codex` mais configurez `openai/gpt-5.5` ; l'agent OpenAI active Codex par défaut.
- Utilisez le provider/modèle `agentRuntime.id: "pi"` uniquement lorsque vous souhaitez une route de compatibilité via PI ; sinon, gardez `openai/gpt-5.5` sur le harnais Codex par défaut.
- Les anciennes références `openai-codex/gpt-5.1*`, `openai-codex/gpt-5.2*` et `openai-codex/gpt-5.3*` sont supprimées car les comptes ChatGPT/Codex OAuth les rejettent ; utilisez `openai-codex/gpt-5.5` ou la route d'exécution native Codex à la place.

```json5
{
  plugins: { entries: { codex: { enabled: true } } },
  agents: {
    defaults: {
      model: { primary: "openai/gpt-5.5" },
    },
  },
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
  <Card title="Modèles GLM" href="/fr/providers/glm">
    Plan de codage Z.AI ou points de terminaison API généraux.
  </Card>
  <Card title="MiniMax" href="/fr/providers/minimax">
    Plan de codage MiniMax OAuth ou accès par clé API.
  </Card>
  <Card title="Cloud Qwen" href="/fr/providers/qwen">
    Surface du fournisseur Cloud Qwen plus mappage des points de terminaison Alibaba DashScope et Coding Plan.
  </Card>
</CardGroup>

### OpenCode

- Auth : `OPENCODE_API_KEY` (ou `OPENCODE_ZEN_API_KEY`)
- Provider d'exécution Zen : `opencode`
- Provider d'exécution Go : `opencode-go`
- Modèles exemples : `opencode/claude-opus-4-6`, `opencode-go/kimi-k2.6`
- CLI : `openclaw onboard --auth-choice opencode-zen` ou `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (clé API)

- Provider : `google`
- Auth : `GEMINI_API_KEY`
- Rotation facultative : `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GOOGLE_API_KEY` de secours, et `OPENCLAW_LIVE_GEMINI_KEY` (remplacement unique)
- Modèles exemples : `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilité : la configuration legacy OpenClaw utilisant `google/gemini-3.1-flash-preview` est normalisée vers `google/gemini-3-flash-preview`
- Alias : `google/gemini-3.1-pro` est accepté et normalisé vers l'ID de l'API Gemini live de Google, `google/gemini-3.1-pro-preview`
- CLI : `openclaw onboard --auth-choice gemini-api-key`
- Réflexion : `/think adaptive` utilise la réflexion dynamique de Google. Gemini 3/3.1 omettent un `thinkingLevel` fixe ; Gemini 2.5 envoie `thinkingBudget: -1`.
- Les exécutions directes Gemini acceptent également `agents.defaults.models["google/<model>"].params.cachedContent` (ou l'ancien `cached_content`) pour transmettre un descripteur `cachedContents/...` natif du provider ; les succès du cache Gemini apparaissent comme OpenClaw `cacheRead`

### Google Vertex et CLI Gemini

- Providers : `google-vertex`, `google-gemini-cli`
- Auth : Vertex utilise l'ADC gcloud ; la CLI Gemini utilise son flux OAuth

<Warning>L'OAuth de la CLI Gemini dans OpenClaw est une intégration non officielle. Certains utilisateurs ont signalé des restrictions sur leur compte Google après avoir utilisé des clients tiers. Veuillez consulter les conditions d'utilisation de Google et utiliser un compte non critique si vous choisissez de continuer.</Warning>

Le CLI OAuth est fourni dans le cadre du plugin groupé `google`.

<Steps>
  <Step title="CLIInstaller la CLI Gemini">
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
  <Step title="Login">
    ```bash
    openclaw models auth login --provider google-gemini-cli --set-default
    ```

    Modèle par défaut : `google-gemini-cli/gemini-3-flash-preview`. Vous ne devez **pas** coller un identifiant client ou un secret dans `openclaw.json`. Le flux de connexion CLI stocke les jetons dans les profils d'authentification sur l'hôte de la passerelle.

  </Step>
  <Step title="Set project (if needed)">
    Si les requêtes échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle.
  </Step>
</Steps>

Les réponses JSON du CLI Gemini sont analysées à partir de `response` ; l'utilisation revient à `stats`, avec `stats.cached` normalisé en OpenClaw `cacheRead`.

### Z.AI (GLM)

- Fournisseur : `zai`
- Auth : `ZAI_API_KEY`
- Exemple de modèle : `zai/glm-5.1`
- CLI : `openclaw onboard --auth-choice zai-api-key`
  - Alias : `z.ai/*` et `z-ai/*` sont normalisés en `zai/*`
  - `zai-api-key` détecte automatiquement le point de terminaison Z.AI correspondant ; `zai-coding-global`, `zai-coding-cn`, `zai-global` et `zai-cn` forcent une surface spécifique

### Vercel AI Gateway

- Fournisseur : `vercel-ai-gateway`
- Auth : `AI_GATEWAY_API_KEY`
- Exemples de modèles : `vercel-ai-gateway/anthropic/claude-opus-4.6`, `vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI : `openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Fournisseur : `kilocode`
- Auth : `KILOCODE_API_KEY`
- Exemple de modèle : `kilocode/kilo/auto`
- CLI : `openclaw onboard --auth-choice kilocode-api-key`
- URL de base : `https://api.kilo.ai/api/gateway/`
- Le catalogue de repli statique fournit `kilocode/kilo/auto` ; la découverte en direct `https://api.kilo.ai/api/gateway/models` peut étendre davantage le catalogue d'exécution.
- Le routage exact en amont derrière `kilocode/kilo/auto` est géré par Kilo Gateway, et n'est pas codé en dur dans OpenClaw.

Voir [/providers/kilocode](/fr/providers/kilocode) pour les détails de configuration.

### Autres plugins de provider groupés

| Provider                | Id                               | Auth env                                                     | Exemple de model                              |
| ----------------------- | -------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| BytePlus                | `byteplus` / `byteplus-plan`     | `BYTEPLUS_API_KEY`                                           | `byteplus-plan/ark-code-latest`               |
| Cerebras                | `cerebras`                       | `CEREBRAS_API_KEY`                                           | `cerebras/zai-glm-4.7`                        |
| Cloudflare AI Gateway   | `cloudflare-ai-gateway`          | `CLOUDFLARE_AI_GATEWAY_API_KEY`                              | -                                             |
| DeepInfra               | `deepinfra`                      | `DEEPINFRA_API_KEY`                                          | `deepinfra/deepseek-ai/DeepSeek-V3.2`         |
| DeepSeek                | `deepseek`                       | `DEEPSEEK_API_KEY`                                           | `deepseek/deepseek-v4-flash`                  |
| GitHub Copilot          | `github-copilot`                 | `COPILOT_GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN`         | -                                             |
| Groq                    | `groq`                           | `GROQ_API_KEY`                                               | -                                             |
| Inférence Hugging Face  | `huggingface`                    | `HUGGINGFACE_HUB_TOKEN` ou `HF_TOKEN`                        | `huggingface/deepseek-ai/DeepSeek-R1`         |
| Kilo Gateway            | `kilocode`                       | `KILOCODE_API_KEY`                                           | `kilocode/kilo/auto`                          |
| Kimi Coding             | `kimi`                           | `KIMI_API_KEY` ou `KIMICODE_API_KEY`                         | `kimi/kimi-for-coding`                        |
| MiniMax                 | `minimax` / `minimax-portal`     | `MINIMAX_API_KEY` / `MINIMAX_OAUTH_TOKEN`                    | `minimax/MiniMax-M2.7`                        |
| Mistral                 | `mistral`                        | `MISTRAL_API_KEY`                                            | `mistral/mistral-large-latest`                |
| Moonshot                | `moonshot`                       | `MOONSHOT_API_KEY`                                           | `moonshot/kimi-k2.6`                          |
| NVIDIA                  | `nvidia`                         | `NVIDIA_API_KEY`                                             | `nvidia/nvidia/nemotron-3-super-120b-a12b`    |
| OpenRouter              | `openrouter`                     | `OPENROUTER_API_KEY`                                         | `openrouter/auto`                             |
| Qianfan                 | `qianfan`                        | `QIANFAN_API_KEY`                                            | `qianfan/deepseek-v3.2`                       |
| Qwen Cloud              | `qwen`                           | `QWEN_API_KEY` / `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY` | `qwen/qwen3.5-plus`                           |
| StepFun                 | `stepfun` / `stepfun-plan`       | `STEPFUN_API_KEY`                                            | `stepfun/step-3.5-flash`                      |
| Together                | `together`                       | `TOGETHER_API_KEY`                                           | `together/moonshotai/Kimi-K2.5`               |
| Venice                  | `venice`                         | `VENICE_API_KEY`                                             | -                                             |
| Vercel AI Gateway       | `vercel-ai-gateway`              | `AI_GATEWAY_API_KEY`                                         | `vercel-ai-gateway/anthropic/claude-opus-4.6` |
| Volcano Engine (Doubao) | `volcengine` / `volcengine-plan` | `VOLCANO_ENGINE_API_KEY`                                     | `volcengine-plan/ark-code-latest`             |
| xAI                     | `xai`                            | `XAI_API_KEY`                                                | `xai/grok-4.3`                                |
| Xiaomi                  | `xiaomi`                         | `XIAOMI_API_KEY`                                             | `xiaomi/mimo-v2-flash`                        |

#### Particularités à connaître

<AccordionGroup>
  <Accordion title="OpenRouterOpenRouter"Anthropic>
    Applique ses en-têtes d'attribution d'application et les marqueurs Anthropic `cache_control` uniquement sur les routes `openrouter.ai`MoonshotOpenRouterAnthropicOpenAIOpenAI vérifiées. Les références DeepSeek, Moonshot et ZAI sont éligibles au cache-TTL pour la mise en cache des invites gérée par OpenRouter, mais ne reçoivent pas les marqueurs de cache Anthropic. En tant que chemin compatible OpenAI de style proxy, il ignore le formatage natif-OpenAI uniquement (`serviceTier`, Réponses `store`OpenAI, indices de cache d'invite, compatibilité de raisonnement OpenAI). Les références basées sur Gemini conservent uniquement le nettoyage de la signature de pensée proxy-Gemini.
  </Accordion>
  <Accordion title="GatewayKilo Gateway">
    Les références basées sur Gemini suivent le même chemin de nettoyage proxy-Gemini ; `kilocode/kilo/auto` et autres références non prises en charge par le raisonnement proxy ignorent l'injection du raisonnement proxy.
  </Accordion>
  <Accordion title="MiniMaxMiniMax"API>
    L'intégration de clé API écrit des définitions de modèle de chat M2.7 texte uniquement explicites ; la compréhension d'images reste sur le fournisseur de média `MiniMax-VL-01` détenu par le plugin.
  </Accordion>
  <Accordion title="NVIDIA">
    Les ID de modèle utilisent un espace de noms `nvidia/<vendor>/<model>` (par exemple `nvidia/nvidia/nemotron-...` avec `nvidia/moonshotai/kimi-k2.5`) ; les sélecteurs préservent la composition littérale `<provider>/<model-id>` tandis que la clé canonique envoyée à l'API reste avec un préfixe unique.
  </Accordion>
  <Accordion title="xAI">
    Utilise le chemin xAI Responses. `grok-4.3` est le modèle de chat par défaut inclus. `/fast` ou `params.fastMode: true` réécrit `grok-3`, `grok-3-mini`, `grok-4` et `grok-4-0709` vers leurs variantes `*-fast`. `tool_stream` est activé par défaut ; désactivez via `agents.defaults.models["xai/<model>"].params.tool_stream=false`.
  </Accordion>
  <Accordion title="Cerebras">
    Fourni comme plugin de provider `cerebras` inclus. Le GLM utilise `zai-glm-4.7` ; l'URL de base compatible OpenAI est `https://api.cerebras.ai/v1`.
  </Accordion>
</AccordionGroup>

## Providers via `models.providers` (URL personnalisée/base)

Utilisez `models.providers` (ou `models.json`) pour ajouter des providers **personnalisés** ou des proxies compatibles OpenAI/Anthropic.

La plupart des plugins de provider inclus ci-dessous publient déjà un catalogue par défaut. Utilisez des entrées explicites `models.providers.<id>` uniquement lorsque vous souhaitez remplacer l'URL de base par défaut, les en-têtes ou la liste des modèles.

Les vérifications de capacité de modèle du Gateway lisent également les métadonnées explicites `models.providers.<id>.models[]`. Si un modèle personnalisé ou proxy accepte les images, définissez `input: ["text", "image"]` sur ce modèle afin que les chemins de pièce jointe WebChat et d'origine nœud transmettent les images en tant qu'entrées natives du modèle au lieu de références de média texte uniquement.

`agents.defaults.models["provider/model"]` contrôle uniquement la visibilité des modèles, les alias et les métadonnées par modèle pour les agents. Il n'enregistre pas un nouveau modèle d'exécution par lui-même. Pour les modèles de fournisseurs personnalisés, ajoutez également `models.providers.<provider>.models[]` avec au moins le `id` correspondant.

### Moonshot AI (Kimi)

Moonshot est fourni en tant que plugin de fournisseur groupé. Utilisez le fournisseur intégré par défaut, et ajoutez une entrée explicite `models.providers.moonshot` uniquement lorsque vous devez remplacer l'URL de base ou les métadonnées du modèle :

- Provider : `moonshot`
- Auth : `MOONSHOT_API_KEY`
- Modèle exemple : `moonshot/kimi-k2.6`
- CLI : `openclaw onboard --auth-choice moonshot-api-key` ou `openclaw onboard --auth-choice moonshot-api-key-cn`

IDs de modèle Kimi K2 :

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

### Kimi coding

Kimi Coding utilise le point de terminaison compatible Anthropic de Moonshot AI :

- Provider : `kimi`
- Auth : `KIMI_API_KEY`
- Modèle exemple : `kimi/kimi-for-coding`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-for-coding" } },
  },
}
```

Les `kimi/kimi-code` et `kimi/k2p5` hérités restent acceptés en tant qu'identifiants de modèle de compatibilité et sont normalisés vers l'identifiant de modèle API stable de Kimi.

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) donne accès à Doubao et d'autres modèles en Chine.

- Provider : `volcengine` (codage : `volcengine-plan`)
- Auth : `VOLCANO_ENGINE_API_KEY`
- Modèle exemple : `volcengine-plan/ark-code-latest`
- CLI : `openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

L'intégration (%PH:GLOSSARY:1%%onboarding%%PH:GLOSSARY:1%%) par défaut s'effectue sur l'interface de codage, mais le catalogue `volcengine/*` général est enregistré en même temps.

Dans les sélecteurs de modèles d'intégration (%PH:GLOSSARY:1%%onboarding%%PH:GLOSSARY:1%%)/configuration, le choix d'authentification Volcengine préfère les lignes `volcengine/*` et `volcengine-plan/*`. Si ces modèles ne sont pas encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur délimité au fournisseur vide.

<Tabs>
  <Tab title="Modèles standards">
    - `volcengine/doubao-seed-1-8-251228` (Doubao Seed 1.8)
    - `volcengine/doubao-seed-code-preview-251028`
    - `volcengine/kimi-k2-5-260127` (Kimi K2.5)
    - `volcengine/glm-4-7-251222`GLM (GLM 4.7)
    - `volcengine/deepseek-v3-2-251201` (DeepSeek V3.2 128K)

  </Tab>
  <Tab title="Modèles de codage (volcengine-plan)">
    - `volcengine-plan/ark-code-latest`
    - `volcengine-plan/doubao-seed-code`
    - `volcengine-plan/kimi-k2.5`
    - `volcengine-plan/kimi-k2-thinking`
    - `volcengine-plan/glm-4.7`

  </Tab>
</Tabs>

### BytePlus (International)

BytePlus ARK donne accès aux mêmes modèles que Volcano Engine pour les utilisateurs internationaux.

- Provider : `byteplus` (codage : `byteplus-plan`)
- Auth : `BYTEPLUS_API_KEY`
- Exemple de model : `byteplus-plan/ark-code-latest`
- CLI : CLI`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

L'onboarding par défaut vers la surface de codage, mais le catalogue général `byteplus/*` est enregistré en même temps.

Dans les sélecteurs de model onboarding/configurer, le choix d'authentification BytePlus privilégie à la fois les lignes `byteplus/*` et `byteplus-plan/*`OpenClaw. Si ces models ne sont pas encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur limité au provider vide.

<Tabs>
  <Tab title="Modèles standards">
    - `byteplus/seed-1-8-251228` (Seed 1.8)
    - `byteplus/kimi-k2-5-260127` (Kimi K2.5)
    - `byteplus/glm-4-7-251222`GLM (GLM 4.7)

  </Tab>
  <Tab title="Modèles de codage (byteplus-plan)">
    - `byteplus-plan/ark-code-latest`
    - `byteplus-plan/doubao-seed-code`
    - `byteplus-plan/kimi-k2.5`
    - `byteplus-plan/kimi-k2-thinking`
    - `byteplus-plan/glm-4.7`

  </Tab>
</Tabs>

### Synthetic

Synthetic fournit des models compatibles Anthropic derrière le provider Anthropic`synthetic` :

- Provider : `synthetic`
- Auth : `SYNTHETIC_API_KEY`
- Exemple de model : `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI : CLI`openclaw onboard --auth-choice synthetic-api-key`

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

MiniMax est configuré via MiniMax`models.providers` car il utilise des points de terminaison personnalisés :

- MiniMax OAuth (Global) : MiniMaxOAuth`--auth-choice minimax-global-oauth`
- MiniMax OAuth (CN) : MiniMaxOAuth`--auth-choice minimax-cn-oauth`
- Clé API MiniMax (Global) : MiniMaxAPI`--auth-choice minimax-global-api`
- Clé API MiniMax (CN) : MiniMaxAPI`--auth-choice minimax-cn-api`
- Auth : `MINIMAX_API_KEY` pour `minimax` ; `MINIMAX_OAUTH_TOKEN` ou `MINIMAX_API_KEY` pour `minimax-portal`

Voir [/providers/minimax](/fr/providers/minimax) pour les détails de configuration, les options de modèle et les extraits de configuration.

<Note>Sur le chemin de streaming compatible Anthropic de MiniMax, OpenClaw désactive la réflexion par défaut, sauf si vous la définissez explicitement, et MiniMaxAnthropicOpenClaw`/fast on` réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.</Note>

Répartition des capacités détenues par le plugin :

- Les valeurs par défaut de texte/chat restent sur `minimax/MiniMax-M2.7`
- La génération d'images est `minimax/image-01` ou `minimax-portal/image-01`
- La compréhension d'images est `MiniMax-VL-01`MiniMax détenue par le plugin sur les deux chemins d'authentification MiniMax
- La recherche Web reste sur l'id de fournisseur `minimax`

### LM Studio

LM Studio est fourni en tant que plugin de fournisseur groupé qui utilise l'API native :

- Fournisseur : `lmstudio`
- Auth : `LM_API_TOKEN`
- URL de base d'inférence par défaut : `http://localhost:1234/v1`

Définissez ensuite un modèle (remplacez par l'un des ID renvoyés par `http://localhost:1234/api/v1/models`) :

```json5
{
  agents: {
    defaults: { model: { primary: "lmstudio/openai/gpt-oss-20b" } },
  },
}
```

OpenClaw utilise les OpenClaw`/api/v1/models` et `/api/v1/models/load` natives de LM Studio pour la découverte et le chargement automatique, avec `/v1/chat/completions` pour l'inférence par défaut. Si vous souhaitez que le chargement JIT, le TTL et l'expulsion automatique de LM Studio gèrent le cycle de vie du modèle, définissez `models.providers.lmstudio.params.preload: false`. Voir [/providers/lmstudio](/fr/providers/lmstudio) pour la configuration et le dépannage.

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

Ollama est détecté localement sur `http://127.0.0.1:11434` lorsque vous l'activez avec `OLLAMA_API_KEY`, et le plugin provider intégré ajoute Ollama directement à `openclaw onboard` et au sélecteur de modèles. Voir [/providers/ollama](/fr/providers/ollama) pour l'onboarding, le mode cloud/local et la configuration personnalisée.

### vLLM

vLLM est fourni en tant que plugin de fournisseur groupé pour les serveurs compatibles OpenAI locaux/auto-hébergés :

- Provider : `vllm`
- Auth : Optionnel (dépend de votre serveur)
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

SGLang est fourni en tant que plugin de fournisseur groupé pour les serveurs compatibles OpenAI auto-hébergés rapides :

- Provider : `sglang`
- Auth : Optionnel (dépend de votre serveur)
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

### Proxies locaux (LM Studio, vLLM, LiteLLM, etc.)

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
  <Accordion title="Default optional fields">
    Pour les providers personnalisés, `reasoning`, `input`, `cost`, `contextWindow` et `maxTokens` sont facultatifs. Lorsqu'ils sont omis, OpenClaw utilise par défaut :

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    Recommandé : définissez des valeurs explicites correspondant aux limites de votre proxy/modèle.

  </Accordion>
  <Accordion title="Proxy-route shaping rules">
    - Pour `api: "openai-completions"` sur des points de terminaison non natifs (tout `baseUrl` non vide dont l'hôte n'est pas `api.openai.com`), OpenClaw force `compat.supportsDeveloperRole: false` pour éviter les erreurs 400 du provider pour les rôles `developer` non pris en charge.
    - Les routes compatibles OpenAI de type proxy sautent également le formatage des demandes natif OpenAI uniquement : pas de `service_tier`, pas de Responses `store`, pas de Completions `store`, pas d'indices de cache de prompt, pas de formatage de payload de compatibilité de raisonnement OpenAI, et pas d'en-têtes d'attribution OpenClaw cachés.
    - Pour les proxies Completions compatibles OpenAI qui nécessitent des champs spécifiques au fournisseur, définissez `agents.defaults.models["provider/model"].params.extra_body` (ou `extraBody`) pour fusionner du JSON supplémentaire dans le corps de la demande sortante.
    - Pour les contrôles de modèle de discussion vLLM, définissez `agents.defaults.models["provider/model"].params.chat_template_kwargs`. Le plugin vLLM groupé envoie automatiquement `enable_thinking: false` et `force_nonempty_content: true` pour `vllm/nemotron-3-*` lorsque le niveau de réflexion de la session est désactivé.
    - Pour les modèles locaux lents ou les hôtes LAN/tailnet distants, définissez `models.providers.<id>.timeoutSeconds`. Cela étend la gestion des requêtes HTTP du modèle de provider, y compris la connexion, les en-têtes, le streaming du corps et l'abandon de la récupération gardée, sans augmenter le délai d'exécution global de l'agent.
    - Les appels HTTP du provider de modèles autorisent les réponses DNS fake-IP de Surge, Clash et sing-box dans `198.18.0.0/15` et `fc00::/7` uniquement pour le nom d'hôte du provider `baseUrl` configuré. D'autres destinations privées, de bouclage, de liaison locale et de métadonnées nécessitent toujours un opt-in explicite `models.providers.<id>.request.allowPrivateNetwork: true`.
    - Si `baseUrl` est vide/omis, OpenClaw conserve le comportement par défaut OpenAI (qui résout en `api.openai.com`).
    - Pour la sécurité, un `compat.supportsDeveloperRole: true` explicite est toujours remplacé sur les points de terminaison `openai-completions` non natifs.
    - Pour `api: "anthropic-messages"` sur les points de terminaison non directs (tout provider autre que le `anthropic` canonique, ou un `models.providers.anthropic.baseUrl` personnalisé dont l'hôte n'est pas un point de terminaison public `api.anthropic.com`), OpenClaw supprime les en-têtes bêta implicites Anthropic tels que `claude-code-20250219`, `interleaved-thinking-2025-05-14` et les marqueurs OAuth, afin que les proxies compatibles Anthropic personnalisés ne rejettent pas les indicateurs bêta non pris en charge. Définissez `models.providers.<id>.headers["anthropic-beta"]` explicitement si votre proxy nécessite des fonctionnalités bêta spécifiques.

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

- [Référence de configuration](/fr/gateway/config-agents#agent-defaults) - clés de configuration de model
- [Basculement de model](/fr/concepts/model-failover) - chaînes de secours et comportement de réessai
- [Models](/fr/concepts/models) - configuration et alias de model
- [Providers](/fr/providers) - guides de configuration par provider
