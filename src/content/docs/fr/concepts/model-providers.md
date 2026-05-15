---
summary: "Aperçu des providers de modèles avec des exemples de configuration + flux CLI"
read_when:
  - You need a provider-by-provider model setup reference
  - You want example configs or CLI onboarding commands for model providers
title: "Providers de modèles"
sidebarTitle: "Providers de modèles"
---

Référence pour les **providers de modèle/LLM** (pas les canaux de discussion comme WhatsApp/Telegram). Pour les règles de sélection de modèle, voir [Modèles](/fr/concepts/models).

## Règles rapides

<AccordionGroup>
  <Accordion title="Références de modèle et assistants CLI">
    - Les références de modèle utilisent `provider/model` (exemple : `opencode/claude-opus-4-6`).
    - `agents.defaults.models` agit comme une liste d'autorisation lorsqu'il est défini.
    - Assistants CLI : `openclaw onboard`, `openclaw models list`, `openclaw models set <provider/model>`.
    - `models.providers.*.contextWindow` / `contextTokens` / `maxTokens` définissent les valeurs par défaut au niveau du provider ; `models.providers.*.models[].contextWindow` / `contextTokens` / `maxTokens` les remplacent pour chaque modèle.
    - Règles de basculement, sondages de refroidissement et persistance des remplacements de session : [Basculement de modèle](/fr/concepts/model-failover).

  </Accordion>
  <Accordion title="Ajouter une authentification de provider ne change pas votre modèle principal">
    `openclaw configure` préserve un `agents.defaults.model.primary` existant lorsque vous ajoutez ou réauthentifiez un provider. Les plugins de provider peuvent toujours renvoyer un modèle par défaut recommandé dans leur correctif de configuration d'authentification, mais configure le considère comme « rendre ce modèle disponible » lorsqu'un modèle principal existe déjà, et non « remplacer le modèle principal actuel ».

    Pour changer intentionnellement le modèle par défaut, utilisez `openclaw models set <provider/model>` ou `openclaw models auth login --provider <id> --set-default`.

  </Accordion>
  <Accordion title="OpenAISéparateur fournisseur/runtime OpenAI"OpenAI>
    Les routes de la famille OpenAI sont spécifiques au préfixe :

    - `openai/<model>` utilise le harnais natif du serveur d'application Codex pour les tours d'agent par défaut. C'est la configuration d'abonnement habituelle ChatGPT/Codex.
    - `openai-codex/<model>` est une configuration legacy que le médecin réécrit en `openai/<model>`.
    - `openai/<model>` avec le fournisseur/modèle `agentRuntime.id: "pi"`APIOpenAI utilise PI pour les routes de clé API explicite ou de compatibilité.

    Voir [OpenAI](/fr/providers/openai) et [harnais Codex](/fr/plugins/codex-harness). Si la séparation fournisseur/runtime est déroutante, lisez d'abord [Runtimes de l'agent](/fr/concepts/agent-runtimes).

    L'activation automatique du plugin suit la même limite : les références d'agent `openai/*` activent le plugin Codex pour la route par défaut, et les références explicites de fournisseur/modèle `agentRuntime.id: "codex"` ou les références legacy `codex/<model>` le nécessitent également.

    GPT-5.5 est disponible via le harnais natif du serveur d'application Codex par défaut sur `openai/gpt-5.5`, et via PI uniquement lorsque la stratégie d'exécution du fournisseur/modèle sélectionne explicitement `pi`.

  </Accordion>
  <Accordion title="CLIRuntimes CLI"CLI>
    Les runtimes CLI utilisent la même séparation : choisissez des références canoniques de modèle telles que `anthropic/claude-*`, `google/gemini-*`, ou `openai/gpt-*`, puis définissez la stratégie d'exécution du fournisseur/modèle sur `claude-cli`, `google-gemini-cli`, ou `codex-cli`CLI lorsque vous souhaitez un backend CLI local.

    Les références legacy `claude-cli/*`, `google-gemini-cli/*`, et `codex-cli/*` migrent vers les références canoniques de fournisseur avec le runtime enregistré séparément.

  </Accordion>
</AccordionGroup>

## Comportement du fournisseur détenu par le plugin

La plupart des logiques spécifiques aux providers résident dans les plugins de provider (`registerProvider(...)`OpenClawOAuth) tandis qu'OpenClaw conserve la boucle d'inférence générique. Les plugins gèrent l'onboarding, les catalogues de modèles, le mappage des variables d'environnement d'auth, la normalisation du transport/de la configuration, le nettoyage des schémas d'outils, la classification du basculement, le rafraîchissement OAuth, le rapport d'utilisation, les profils de réflexion/reasoning, et plus encore.

La liste complète des hooks du SDK de provider et les exemples de plugins groupés se trouve dans [Provider plugins](/fr/plugins/sdk-provider-plugins). Un provider qui a besoin d'un exécuteur de requête totalement personnalisé est une surface d'extension distincte et plus approfondie.

<Note>Le comportement du runner détenu par le provider réside sur des hooks de provider explicites tels que la politique de relecture, la normalisation du schéma d'outils, l'encapsulation du flux et les assistants de transport/requête. Le sac statique hérité `ProviderPlugin.capabilities` n'est utilisé que pour la compatibilité et n'est plus lu par la logique du runner partagé.</Note>

## Rotation de la clé API

<AccordionGroup>
  <Accordion title="Sources et priorité des clés">
    Configurez plusieurs clés via :

    - `OPENCLAW_LIVE_<PROVIDER>_KEY` (remplacement unique en direct, priorité la plus élevée)
    - `<PROVIDER>_API_KEYS` (liste séparée par des virgules ou des points-virgules)
    - `<PROVIDER>_API_KEY` (clé primaire)
    - `<PROVIDER>_API_KEY_*` (liste numérotée, par ex. `<PROVIDER>_API_KEY_1`)

    Pour les providers Google, `GOOGLE_API_KEY` est également inclus en tant que solution de repli. L'ordre de sélection des clés préserve la priorité et déduplique les valeurs.

  </Accordion>
  <Accordion title="Quand la rotation s'active">
    - Les requêtes sont réessayées avec la clé suivante uniquement en cas de réponses de limitation de débit (par exemple `429`, `rate_limit`, `quota`, `resource exhausted`, `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, ou des messages périodiques de limite d'utilisation).
    - Les échecs non liés à la limitation de débit échouent immédiatement ; aucune rotation de clé n'est tentée.
    - Lorsque toutes les clés candidates échouent, l'erreur finale est renvoyée à partir de la dernière tentative.

  </Accordion>
</AccordionGroup>

## Providers intégrés (catalogue pi-ai)

OpenClaw est fourni avec le catalogue pi-ai. Ces fournisseurs ne nécessitent **aucune** configuration OpenClaw`models.providers` ; il suffit de définir l'authentification et de choisir un modèle.

### OpenAI

- Fournisseur : `openai`
- Authentification : `OPENAI_API_KEY`
- Rotation facultative : `OPENAI_API_KEYS`, `OPENAI_API_KEY_1`, `OPENAI_API_KEY_2`, ainsi que `OPENCLAW_LIVE_OPENAI_KEY` (remplacement unique)
- Exemples de modèles : `openai/gpt-5.5`, `openai/gpt-5.4-mini`
- Vérifiez la disponibilité du compte/modèle avec `openclaw models list --provider openai`API si une installation ou une clé API spécifique se comporte différemment.
- CLI : CLI`openclaw onboard --auth-choice openai-api-key`
- Le transport par défaut est `auto`OpenClaw ; OpenClaw transmet le choix du transport à pi-ai.
- Remplacer pour chaque modèle via `agents.defaults.models["openai/<model>"].params.transport` (`"sse"`, `"websocket"` ou `"auto"`)
- Le traitement prioritaire OpenAI peut être activé via OpenAI`agents.defaults.models["openai/<model>"].params.serviceTier`
- `/fast` et `params.fastMode` mappent les demandes directes de réponses `openai/*` vers `service_tier=priority` sur `api.openai.com`
- Utilisez `params.serviceTier` lorsque vous souhaitez un niveau explicite au lieu de l'interrupteur partagé `/fast`
- Les en-têtes d'attribution masqués d'OpenClaw (OpenClaw`originator`, `version`, `User-Agent`OpenAI) ne s'appliquent qu'au trafic natif OpenAI vers `api.openai.com`OpenAI, et non aux proxys génériques compatibles OpenAI
- Les routes natives OpenAI conservent également les réponses OpenAI`store`OpenAI, les indices de cache de prompt et la mise en forme de charge utile compatible avec le raisonnement OpenAI ; les routes de proxy ne le font pas
- `openai/gpt-5.3-codex-spark` est intentionnellement supprimé dans OpenClaw car les requêtes en direct à l'OpenAI API la rejettent et le catalogue Codex actuel ne l'expose pas

```json5
{
  agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
}
```

### Anthropic

- Fournisseur : `anthropic`
- Auth : `ANTHROPIC_API_KEY`
- Rotation facultative : `ANTHROPIC_API_KEYS`, `ANTHROPIC_API_KEY_1`, `ANTHROPIC_API_KEY_2`, ainsi que `OPENCLAW_LIVE_ANTHROPIC_KEY` (remplacement unique)
- Exemple de model : `anthropic/claude-opus-4-6`
- CLI : `openclaw onboard --auth-choice apiKey`
- Les requêtes publiques directes vers Anthropic prennent en charge le commutateur partagé `/fast` et `params.fastMode`, y compris le trafic authentifié par clé API et OAuth envoyé à `api.anthropic.com` ; OpenClaw mappe cela vers Anthropic `service_tier` (`auto` contre `standard_only`)
- La configuration Claude CLI préférée conserve la référence du model canonique et sélectionne le backend CLI
  séparément : `anthropic/claude-opus-4-7` avec
  `agentRuntime.id: "claude-cli"` défini pour le model. Les références
  `claude-cli/claude-opus-4-7` héritées fonctionnent toujours pour la compatibilité.

<Note>
  Le personnel de Anthropic nous a informé que l'utilisation du Claude OpenClaw de type CLI est à nouveau autorisée, donc OpenClaw considère la réutilisation du Claude CLI et l'utilisation de `claude -p` comme approuvées pour cette intégration, sauf si Anthropic publie une nouvelle politique. Le jeton de configuration (setup-token) de Anthropic reste disponible en tant que chemin de jeton pris en
  charge par OpenClaw, mais OpenClaw préfère désormais la réutilisation du Claude CLI et `claude -p` lorsqu'ils sont disponibles.
</Note>

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

### OpenAI Codex OAuth

- Fournisseur : `openai-codex`
- Auth : OAuth (ChatGPT)
- Référence de model PI héritée : `openai-codex/gpt-5.5`
- Référence de harnais d'application serveur Codex natif : `openai/gpt-5.5`
- Documentation du harnais native Codex app-server : [Codex harness](/fr/plugins/codex-harness)
- Références de modèle héritées : `codex/gpt-*`
- Limite du plugin : `openai-codex/*` charge le plugin OpenAI ; le plugin natif Codex app-server est sélectionné uniquement par le runtime du harnais Codex ou les références `codex/*` héritées.
- CLI : `openclaw onboard --auth-choice openai-codex` ou `openclaw models auth login --provider openai-codex`
- Le transport par défaut est `auto` (WebSocket en priorité, repli SSE)
- Remplacer pour chaque modèle PI via `agents.defaults.models["openai-codex/<model>"].params.transport` (`"sse"`, `"websocket"`, ou `"auto"`)
- `params.serviceTier` est également transmis lors des requêtes natives Codex Responses (`chatgpt.com/backend-api`)
- Les en-têtes d'attribution masqués OpenClaw (`originator`, `version`, `User-Agent`) sont uniquement attachés au trafic natif Codex vers `chatgpt.com/backend-api`, et non aux proxys génériques compatibles OpenAI
- Partage le même commutateur `/fast` et la configuration `params.fastMode` que le `openai/*` direct ; OpenClaw le mappe à `service_tier=priority`
- `openai-codex/gpt-5.5` utilise le `contextWindow = 400000` natif du catalogue Codex et le `contextTokens = 272000` d'exécution par défaut ; remplacer la limite d'exécution avec `models.providers.openai-codex.models[].contextTokens`
- Note de politique : OpenAI Codex OAuth est explicitement pris en charge pour les outils/workflows externes tels que OpenClaw.
- Pour la route courante d'abonnement plus runtime natif Codex, connectez-vous avec l'authentification `openai-codex` mais configurez `openai/gpt-5.5` ; l'agent OpenAI sélectionne Codex par défaut.
- Utilisez le provider/modèle `agentRuntime.id: "pi"` uniquement lorsque vous souhaitez une route de compatibilité via PI ; sinon, gardez `openai/gpt-5.5` sur le harnais Codex par défaut.
- Les références `openai-codex/gpt-5.1*`, `openai-codex/gpt-5.2*` et `openai-codex/gpt-5.3*` plus anciennes sont supprimées car les comptes ChatGPT/Codex OAuth les rejettent ; utilisez plutôt `openai-codex/gpt-5.5` ou l'itinéraire d'exécution natif de Codex.

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
- Fournisseur d'exécution Zen : `opencode`
- Fournisseur d'exécution Go : `opencode-go`
- Modèles exemples : `opencode/claude-opus-4-6`, `opencode-go/kimi-k2.6`
- CLI : `openclaw onboard --auth-choice opencode-zen` ou `openclaw onboard --auth-choice opencode-go`

```json5
{
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}
```

### Google Gemini (clé API)

- Fournisseur : `google`
- Auth : `GEMINI_API_KEY`
- Rotation facultative : `GEMINI_API_KEYS`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, secours `GOOGLE_API_KEY` et `OPENCLAW_LIVE_GEMINI_KEY` (remplacement unique)
- Modèles exemples : `google/gemini-3.1-pro-preview`, `google/gemini-3-flash-preview`
- Compatibilité : la configuration héritée OpenClaw utilisant `google/gemini-3.1-flash-preview` est normalisée vers `google/gemini-3-flash-preview`
- Alias : `google/gemini-3.1-pro` est accepté et normalisé vers l'identifiant de l'API Gemini en direct de Google, `google/gemini-3.1-pro-preview`
- CLI : CLI`openclaw onboard --auth-choice gemini-api-key`
- Réflexion : `/think adaptive` utilise la réflexion dynamique de Google. Gemini 3/3.1 omettent un `thinkingLevel` fixe ; Gemini 2.5 envoie `thinkingBudget: -1`.
- Les exécutions directes de Gemini acceptent également `agents.defaults.models["google/<model>"].params.cachedContent` (ou l'ancien `cached_content`) pour transmettre un handle `cachedContents/...`OpenClaw natif du provider ; les accès au cache Gemini apparaissent comme des `cacheRead` OpenClaw

### Google Vertex et CLI Gemini

- Providers : `google-vertex`, `google-gemini-cli`
- Auth : Vertex utilise l'ADC gcloud ; la CLI Gemini utilise son flux OAuth

<Warning>L'OAuth de la CLI Gemini dans OpenClaw est une intégration non officielle. Certains utilisateurs ont signalé des restrictions sur leur compte Google après avoir utilisé des clients tiers. Veuillez consulter les conditions d'utilisation de Google et utiliser un compte non critique si vous choisissez de continuer.</Warning>

L'OAuth de la CLI Gemini est fourni dans le cadre du plugin groupé CLIOAuth`google`.

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
  <Step title="Connexion">
    ```bash
    openclaw models auth login --provider google-gemini-cli --set-default
    ```

    Modèle par défaut : `google-gemini-cli/gemini-3-flash-preview`. Vous **ne devez pas** coller un identifiant client ou un secret dans `openclaw.json`CLI. Le flux de connexion CLI stocke les jetons dans les profils d'authentification sur l'hôte de la passerelle.

  </Step>
  <Step title="Définir le projet (si nécessaire)">
    Si les requêtes échouent après la connexion, définissez `GOOGLE_CLOUD_PROJECT` ou `GOOGLE_CLOUD_PROJECT_ID` sur l'hôte de la passerelle.
  </Step>
</Steps>

Les réponses JSON de la CLI Gemini sont analysées à partir de CLI`response` ; l'utilisation revient à `stats`, avec `stats.cached`OpenClaw normalisé en `cacheRead` OpenClaw.

### Z.AI (GLM)

- Provider : `zai`
- Auth : `ZAI_API_KEY`
- Exemple de model : `zai/glm-5.1`
- CLI : CLI`openclaw onboard --auth-choice zai-api-key`
  - Les alias `z.ai/*` et `z-ai/*` sont normalisés vers `zai/*`
  - `zai-api-key` détecte automatiquement le point de terminaison Z.AI correspondant ; `zai-coding-global`, `zai-coding-cn`, `zai-global` et `zai-cn` forcent une surface spécifique

### Vercel AI Gateway

- Provider : `vercel-ai-gateway`
- Auth : `AI_GATEWAY_API_KEY`
- Exemples de models : `vercel-ai-gateway/anthropic/claude-opus-4.6`, `vercel-ai-gateway/moonshotai/kimi-k2.6`
- CLI : CLI`openclaw onboard --auth-choice ai-gateway-api-key`

### Kilo Gateway

- Provider : `kilocode`
- Auth : `KILOCODE_API_KEY`
- Exemple de model : `kilocode/kilo/auto`
- CLI : CLI`openclaw onboard --auth-choice kilocode-api-key`
- URL de base : `https://api.kilo.ai/api/gateway/`
- Le catalogue de repli statique fournit `kilocode/kilo/auto` ; la découverte dynamique `https://api.kilo.ai/api/gateway/models` peut étendre davantage le catalogue d'exécution.
- Le routage amont exact derrière `kilocode/kilo/auto`GatewayOpenClaw est géré par Kilo Gateway, et n'est pas codé en dur dans OpenClaw.

Consultez [/providers/kilocode](/fr/providers/kilocode) pour les détails de la configuration.

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
  <Accordion title="OpenRouter">
    Applique ses en-têtes d'attribution d'application et les marqueurs Anthropic `cache_control` uniquement sur les routes `openrouter.ai` vérifiées. Les références DeepSeek, Moonshot et ZAI sont éligibles au cache-TTL pour la mise en cache de prompt gérée par OpenRouter mais ne reçoivent pas les marqueurs de cache Anthropic. En tant que chemin compatible OpenAI de type proxy, il ignore le formatage natif-OpenAI uniquement (`serviceTier`, Réponses `store`, indices de cache de prompt, compatibilité de raisonnement OpenAI). Les références basées sur Gemini conservent uniquement la sanitation des signatures de pensée proxy-Gemini.
  </Accordion>
  <Accordion title="Kilo Gateway">
    Les références basées sur Gemini suivent le même chemin de sanitation proxy-Gemini ; `kilocode/kilo/auto` et autres références ne prenant pas en charge le raisonnement proxy ignorent l'injection du raisonnement proxy.
  </Accordion>
  <Accordion title="MiniMax">
    L'onboarding de clé API écrit des définitions de modèle de chat M2.7 texte uniquement explicites ; la compréhension d'images reste sur le fournisseur de média `MiniMax-VL-01` détenu par le plugin.
  </Accordion>
  <Accordion title="NVIDIA">
    Les IDs de modèle utilisent un espace de noms `nvidia/<vendor>/<model>` (par exemple `nvidia/nvidia/nemotron-...` à côté de `nvidia/moonshotai/kimi-k2.5`) ; les sélecteurs préservent la composition littérale `<provider>/<model-id>`API tandis que la clé canonique envoyée à l'API reste avec un seul préfixe.
  </Accordion>
  <Accordion title="xAI">
    Utilise le chemin xAI Responses. `grok-4.3` est le modèle de chat par défaut inclus. `/fast` ou `params.fastMode: true` réécrit `grok-3`, `grok-3-mini`, `grok-4` et `grok-4-0709` vers leurs variantes `*-fast`. `tool_stream` est activé par défaut ; désactivez-le via `agents.defaults.models["xai/<model>"].params.tool_stream=false`.
  </Accordion>
  <Accordion title="Cerebras">
    Est fourni en tant que plugin de fournisseur `cerebras`GLM inclus. GLM utilise `zai-glm-4.7`OpenAI ; l'URL de base compatible OpenAI est `https://api.cerebras.ai/v1`.
  </Accordion>
</AccordionGroup>

## Fournisseurs via `models.providers` (URL personnalisée/de base)

Utilisez `models.providers` (ou `models.json`OpenAIAnthropic) pour ajouter des fournisseurs **personnalisés** ou des proxies compatibles OpenAI/Anthropic.

Nombreux des plugins de fournisseur inclus ci-dessous publient déjà un catalogue par défaut. Utilisez des entrées `models.providers.<id>` explicites uniquement lorsque vous souhaitez remplacer l'URL de base par défaut, les en-têtes ou la liste des modèles.

Les vérifications de capacité de modèle du Gateway lisent également les métadonnées Gateway`models.providers.<id>.models[]` explicites. Si un modèle personnalisé ou proxy accepte les images, définissez `input: ["text", "image"]`WebChat sur ce modèle afin que les chemins de pièces jointes WebChat et d'origine nœud transmettent les images en tant qu'entrées natives du modèle au lieu de références médias texte uniquement.

`agents.defaults.models["provider/model"]` contrôle uniquement la visibilité des modèles, les alias et les métadonnées par modèle pour les agents. Il n'enregistre pas un nouveau modèle d'exécution par lui-même. Pour les modèles de providers personnalisés, ajoutez également `models.providers.<provider>.models[]` avec au minimum le `id` correspondant.

### Moonshot AI (Kimi)

Moonshot est fourni en tant que plugin de provider groupé. Utilisez le provider intégré par défaut, et ajoutez une entrée explicite Moonshot`models.providers.moonshot` uniquement lorsque vous devez remplacer l'URL de base ou les métadonnées du modèle :

- Provider : `moonshot`
- Auth : `MOONSHOT_API_KEY`
- Exemple de modèle : `moonshot/kimi-k2.6`
- CLI : CLI`openclaw onboard --auth-choice moonshot-api-key` ou `openclaw onboard --auth-choice moonshot-api-key-cn`

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
- Exemple de modèle : `kimi/kimi-for-coding`

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: { model: { primary: "kimi/kimi-for-coding" } },
  },
}
```

Les anciens `kimi/kimi-code` et `kimi/k2p5`API restent acceptés en tant qu'IDs de modèle de compatibilité et sont normalisés vers l'ID de modèle API stable de Kimi.

### Volcano Engine (Doubao)

Volcano Engine (火山引擎) donne accès à Doubao et d'autres modèles en Chine.

- Provider : `volcengine` (coding : `volcengine-plan`)
- Auth : `VOLCANO_ENGINE_API_KEY`
- Exemple de modèle : `volcengine-plan/ark-code-latest`
- CLI : CLI`openclaw onboard --auth-choice volcengine-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "volcengine-plan/ark-code-latest" } },
  },
}
```

L'onboarding (Onboarding) par défaut se porte sur la surface de coding, mais le catalogue général `volcengine/*` est enregistré en même temps.

Dans les sélecteurs de modèles d'onboarding/configuration, le choix d'authentification Volcengine préfère les lignes `volcengine/*` et `volcengine-plan/*`OpenClaw. Si ces modèles ne sont pas encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur limité au provider vide.

<Tabs>
  <Tab title="Modèles standard">
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

- Fournisseur : `byteplus` (codage : `byteplus-plan`)
- Auth : `BYTEPLUS_API_KEY`
- Exemple de modèle : `byteplus-plan/ark-code-latest`
- CLI : CLI`openclaw onboard --auth-choice byteplus-api-key`

```json5
{
  agents: {
    defaults: { model: { primary: "byteplus-plan/ark-code-latest" } },
  },
}
```

L'intégration par défaut se fait sur l'interface de codage, mais le catalogue général `byteplus/*` est enregistré en même temps.

Dans les sélecteurs de modèles d'intégration/de configuration, le choix d'authentification BytePlus privilégie à la fois les lignes `byteplus/*` et `byteplus-plan/*`OpenClaw. Si ces modèles ne sont pas encore chargés, OpenClaw revient au catalogue non filtré au lieu d'afficher un sélecteur vide limité au fournisseur.

<Tabs>
  <Tab title="Modèles standard">
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

Synthetic fournit des modèles compatibles avec Anthropic via le fournisseur Anthropic`synthetic` :

- Fournisseur : `synthetic`
- Auth : `SYNTHETIC_API_KEY`
- Exemple de modèle : `synthetic/hf:MiniMaxAI/MiniMax-M2.5`
- CLI : CLI : `openclaw onboard --auth-choice synthetic-api-key`

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

Voir [/providers/minimax](/fr/providers/minimax) pour les détails de configuration, les options de modèle et les extraits de configuration.

<Note>Sur le chemin de streaming compatible MiniMax de Anthropic, OpenClaw désactive la réflexion par défaut sauf si vous la définissez explicitement, et `/fast on` réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.</Note>

Répartition des capacités détenues par le plugin :

- Les valeurs par défaut de texte/chat restent sur `minimax/MiniMax-M2.7`
- La génération d'images est `minimax/image-01` ou `minimax-portal/image-01`
- La compréhension d'images est `MiniMax-VL-01` détenue par le plugin sur les deux chemins d'authentification MiniMax
- La recherche Web reste sur l'identifiant de fournisseur `minimax`

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

OpenClaw utilise les `/api/v1/models` et `/api/v1/models/load` natives de LM Studio pour la découverte + le chargement automatique, avec `/v1/chat/completions` pour l'inférence par défaut. Si vous souhaitez que le chargement JIT, le TTL et l'éviction automatique de LM Studio gèrent le cycle de vie du modèle, définissez `models.providers.lmstudio.params.preload: false`. Consultez [/providers/lmstudio](/fr/providers/lmstudio) pour la configuration et le dépannage.

### Ollama

Ollama est fourni en tant que plugin de fournisseur groupé et utilise l'Ollama native de API :

- Provider : `ollama`
- Auth : Aucune requise (serveur local)
- Modèle exemple : `ollama/llama3.3`
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

Ollama est détecté localement à `http://127.0.0.1:11434` lorsque vous optez pour `OLLAMA_API_KEY`, et le plugin de fournisseur groupé ajoute Ollama directement à `openclaw onboard` et au sélecteur de modèles. Consultez [/providers/ollama](/fr/providers/ollama) pour l'intégration, le mode cloud/local et la configuration personnalisée.

### vLLM

vLLM est fourni en tant que plugin de fournisseur groupé pour les serveurs compatibles OpenAI locaux/auto-hébergés :

- Provider : `vllm`
- Auth : Optionnel (dépend de votre serveur)
- URL de base par défaut : `http://127.0.0.1:8000/v1`

Pour activer la découverte automatique localement (n'importe quelle valeur fonctionne si votre serveur n'applique pas l'authentification) :

```bash
export VLLM_API_KEY="vllm-local"
```

Ensuite, définissez un modèle (remplacez par l'un des ID renvoyés par `/v1/models`) :

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

Ensuite, définissez un modèle (remplacez par l'un des ID renvoyés par `/v1/models`) :

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
  <Accordion title="Champs facultatifs par défaut">
    Pour les fournisseurs personnalisés, `reasoning`, `input`, `cost`, `contextWindow` et `maxTokens` sont facultatifs. En cas d'omission, OpenClaw utilise par défaut :

    - `reasoning: false`
    - `input: ["text"]`
    - `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
    - `contextWindow: 200000`
    - `maxTokens: 8192`

    Recommandé : définissez des valeurs explicites correspondant aux limites de votre proxy/modèle.

  </Accordion>
  <Accordion title="Règles de façonnage des routes de proxy">
    - Pour `api: "openai-completions"` sur des points de terminaison non natifs (tout `baseUrl` non vide dont l'hôte n'est pas `api.openai.com`), OpenClaw force `compat.supportsDeveloperRole: false` pour éviter les erreurs 400 du provider pour les rôles `developer` non pris en charge.
    - Les routes compatibles OpenAI de style proxy ignorent également le façonnage des requêtes natif uniquement OpenAI : pas de `service_tier`, pas de `store` Responses, pas de `store` Completions, pas d'indices de cache de prompt, pas de façonnage de charge utile de compatibilité de raisonnement OpenAI et pas d'en-têtes d'attribution cachés OpenClaw.
    - Pour les proxys Completions compatibles OpenAI qui nécessitent des champs spécifiques au fournisseur, définissez `agents.defaults.models["provider/model"].params.extra_body` (ou `extraBody`) pour fusionner du JSON supplémentaire dans le corps de la requête sortante.
    - Pour les contrôles du modèle de conversation vLLM, définissez `agents.defaults.models["provider/model"].params.chat_template_kwargs`. Le plugin vLLM inclus envoie automatiquement `enable_thinking: false` et `force_nonempty_content: true` pour `vllm/nemotron-3-*` lorsque le niveau de réflexion de la session est désactivé.
    - Pour les modèles locaux lents ou les hôtes distants sur LAN/tailnet, définissez `models.providers.<id>.timeoutSeconds`. Cela étend la gestion des requêtes HTTP du modèle de provider, y compris la connexion, les en-têtes, le streaming du corps et l'abandon de la récupération gardée totale, sans augmenter le délai d'exécution global de l'agent.
    - Les appels HTTP du provider de modèle permettent les réponses DNS de fausse IP de Surge, Clash et sing-box dans `198.18.0.0/15` et `fc00::/7` uniquement pour le nom d'hôte du provider `baseUrl` configuré. D'autres destinations privées, de bouclage, de liaison locale et de métadonnées nécessitent toujours un `models.providers.<id>.request.allowPrivateNetwork: true` d'opt-in explicite.
    - Si `baseUrl` est vide/omis, OpenClaw conserve le comportement par défaut de OpenAI (qui résout vers `api.openai.com`).
    - Pour la sécurité, un `compat.supportsDeveloperRole: true` explicite est toujours remplacé sur les points de terminaison `openai-completions` non natifs.
    - Pour `api: "anthropic-messages"` sur des points de terminaison non directs (tout provider autre que `anthropic` canonique, ou un `models.providers.anthropic.baseUrl` personnalisé dont l'hôte n'est pas un point de terminaison public `api.anthropic.com`), OpenClaw supprime les en-têtes bêta implicites Anthropic tels que `claude-code-20250219`, `interleaved-thinking-2025-05-14` et les marqueurs OAuth, afin que les proxys compatibles Anthropic personnalisés ne rejettent pas les indicateurs bêta non pris en charge. Définissez `models.providers.<id>.headers["anthropic-beta"]` explicitement si votre proxy nécessite des fonctionnalités bêta spécifiques.

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

- [Référence de configuration](/fr/gateway/config-agents#agent-defaults) - clés de configuration de modèle
- [Basculement de modèle](/fr/concepts/model-failover) - chaînes de secours et comportement de nouvelle tentative
- [Modèles](/fr/concepts/models) - configuration et alias de modèles
- [Providers](/fr/providers) - guides de configuration par provider
