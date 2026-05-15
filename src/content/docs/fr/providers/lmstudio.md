---
summary: "OpenClawExécuter OpenClaw avec LM Studio"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

LM Studio est une application conviviale et puissante pour exécuter des modèles à poids ouverts sur votre propre matériel. Elle vous permet d'exécuter des modèles llama.cpp (GGUF) ou MLX (Apple Silicon). Disponible en package avec interface graphique ou en démon sans interface (`llmster`). Pour la documentation produit et la configuration, consultez [lmstudio.ai](https://lmstudio.ai/).

## Quick start

1. Installez LM Studio (bureau) ou `llmster` (sans interface), puis démarrez le serveur local :

```bash
curl -fsSL https://lmstudio.ai/install.sh | bash
```

2. Démarrer le serveur

Assurez-vous de démarrer l'application de bureau ou d'exécuter le démon à l'aide de la commande suivante :

```bash
lms daemon up
```

```bash
lms server start --port 1234
```

Si vous utilisez l'application, assurez-vous d'avoir activé le JIT pour une expérience fluide. En savoir plus dans le [guide LM Studio JIT et TTL](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict).

3. Si l'authentification LM Studio est activée, définissez `LM_API_TOKEN` :

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

Si l'authentification LM Studio est désactivée, vous pouvez laisser la clé API vide lors de la configuration interactive OpenClaw.

Pour plus de détails sur la configuration de l'authentification LM Studio, consultez [Authentification LM Studio](https://lmstudio.ai/docs/developer/core/authentication).

4. Exécutez l'onboarding et choisissez `LM Studio` :

```bash
openclaw onboard
```

5. Dans l'onboarding, utilisez l'invite `Default model` pour sélectionner votre modèle LM Studio.

Vous pouvez également le définir ou le modifier ultérieurement :

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

Les clés de modèle LM Studio suivent un format `author/model-name` (par ex. `qwen/qwen3.5-9b`OpenClaw). Les références de modèle OpenClaw préfixent le nom du fournisseur : `lmstudio/qwen/qwen3.5-9b`. Vous pouvez trouver la clé exacte d'un modèle en exécutant `curl http://localhost:1234/api/v1/models` et en regardant le champ `key`.

## Non-interactive onboarding

Utilisez l'onboarding non interactif lorsque vous souhaitez scripter la configuration (CI, approvisionnement, amorçage distant) :

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

Ou spécifiez l'URL de base, le modèle et la clé API facultative :

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` prend la clé de modèle telle que renvoyée par LM Studio (par ex. `qwen/qwen3.5-9b`), sans le préfixe du fournisseur `lmstudio/`.

Pour les serveurs LM Studio authentifiés, passez `--lmstudio-api-key` ou définissez `LM_API_TOKEN`OpenClaw.
Pour les serveurs LM Studio non authentifiés, omettez la clé ; OpenClaw stocke un marqueur local non secret.

`--custom-api-key` reste pris en charge pour la compatibilité, mais `--lmstudio-api-key` est préféré pour LM Studio.

Cela écrit `models.providers.lmstudio` et définit le modèle par défaut sur `lmstudio/<custom-model-id>`API. Lorsque vous fournissez une clé API, la configuration écrit également le profil d'authentification `lmstudio:default`.

La configuration interactive peut demander une longueur de contexte de chargement préférée facultative et l'applique à tous les modèles LM Studio découverts qu'elle enregistre dans la configuration.
La configuration du plugin LM Studio fait confiance au point de terminaison LM Studio configuré pour les demandes de modèles, y compris les hôtes de bouclage, LAN et tailnet. Vous pouvez désactiver cette option en définissant `models.providers.lmstudio.request.allowPrivateNetwork: false`.

## Configuration

### Compatibilité de l'utilisation en streaming

LM Studio est compatible avec l'utilisation en streaming. Lorsqu'il n'émet pas d'objet OpenAI`usage` de forme standard, OpenClaw récupère les nombres de jetons à partir des métadonnées `timings.prompt_n` / `timings.predicted_n` de style llama.cpp à la place.

Le même comportement d'utilisation en streaming s'applique à ces backends locaux compatibles OpenAI :

- vLLM
- SGLang
- llama.cpp
- LocalAI
- Jan
- TabbyAPI
- text-generation-webui

### Compatibilité de la réflexion

Lorsque la découverte `/api/v1/models` de LM Studio signale des options de raisonnement spécifiques au modèle, OpenClaw expose les valeurs `reasoning_effort` compatibles OpenAI correspondantes dans les métadonnées de compatibilité du modèle. Les versions actuelles de LM Studio peuvent annoncer des options d'interface utilisateur binaires telles que `allowed_options: ["off", "on"]` tout en rejetant ces valeurs sur `/v1/chat/completions` ; OpenClaw normalise cette forme de découverte binaire en `none`, `minimal`, `low`, `medium`, `high` et `xhigh` avant d'envoyer les demandes.
L'ancienne configuration enregistrée de LM Studio contenant des cartes de raisonnement `off`/`on` est normalisée de la même manière lors du chargement du catalogue.

### Configuration explicite

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        apiKey: "${LM_API_TOKEN}",
        api: "openai-completions",
        models: [
          {
            id: "qwen/qwen3-coder-next",
            name: "Qwen 3 Coder Next",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Dépannage

### LM Studio non détecté

Assurez-vous que LM Studio est en cours d'exécution. Si l'authentification est activée, définissez également `LM_API_TOKEN` :

```bash
# Start via desktop app, or headless:
lms server start --port 1234
```

Vérifiez que l'API est accessible :

```bash
curl http://localhost:1234/api/v1/models
```

### Erreurs d'authentification (HTTP 401)

Si la configuration signale une erreur HTTP 401, vérifiez votre clé API :

- Vérifiez que `LM_API_TOKEN` correspond à la clé configurée dans LM Studio.
- Pour plus de détails sur la configuration de l'authentification LM Studio, consultez [LM Studio Authentication](https://lmstudio.ai/docs/developer/core/authentication).
- Si votre serveur ne nécessite pas d'authentification, laissez la clé vide lors de la configuration.

### Chargement de modèle à la demande

LM Studio prend en charge le chargement de modèles juste-à-temps (JIT), où les modèles sont chargés lors de la première demande. OpenClaw précharge les modèles via le point de terminaison de chargement natif de LM Studio par défaut, ce qui aide lorsque le JIT est désactivé. Pour laisser le JIT, le TTL d'inactivité et le comportement d'expulsion automatique de LM Studio gérer le cycle de vie du modèle, désactivez l'étape de préchargement de OpenClaw :

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://localhost:1234/v1",
        api: "openai-completions",
        params: { preload: false },
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

### Hôte LM Studio sur LAN ou tailnet

Utilisez l'adresse accessible de l'hôte LM Studio, gardez `/v1`, et assurez-vous que LM Studio est lié au-delà du bouclage sur cette machine :

```json5
{
  models: {
    providers: {
      lmstudio: {
        baseUrl: "http://gpu-box.local:1234/v1",
        apiKey: "lmstudio",
        api: "openai-completions",
        models: [{ id: "qwen/qwen3.5-9b" }],
      },
    },
  },
}
```

Contrairement aux fournisseurs compatibles avec OpenAI génériques, `lmstudio` fait confiance automatiquement à son point de terminaison local/privé configuré pour les requêtes de modèle gardées. Les ID de fournisseur de bouclage personnalisés tels que `localhost` ou `127.0.0.1` sont également fiables automatiquement ; pour les ID de fournisseur personnalisés LAN, tailnet ou DNS privé, définissez `models.providers.<id>.request.allowPrivateNetwork: true` explicitement.

## Connexes

- [Sélection du modèle](/fr/concepts/model-providers)
- [Ollama](/fr/providers/ollama)
- [Modèles locaux](/fr/gateway/local-models)
