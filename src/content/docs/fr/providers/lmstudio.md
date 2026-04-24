---
summary: "Exécuter OpenClaw avec LM Studio"
read_when:
  - You want to run OpenClaw with open source models via LM Studio
  - You want to set up and configure LM Studio
title: "LM Studio"
---

# LM Studio

LM Studio est une application conviviale mais puissante pour exécuter des modèles à poids ouverts sur votre propre matériel. Elle vous permet d'exécuter des modèles llama.cpp (GGUF) ou MLX (Apple Silicon). Disponible en package GUI ou en démon sans interface (`llmster`). Pour la documentation produit et la configuration, consultez [lmstudio.ai](https://lmstudio.ai/).

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

Si vous utilisez l'application, assurez-vous que le JIT est activé pour une expérience fluide. Pour en savoir plus, consultez le [guide LM Studio JIT et TTL](https://lmstudio.ai/docs/developer/core/ttl-and-auto-evict).

3. OpenClaw nécessite une valeur de jeton LM Studio. Définissez `LM_API_TOKEN` :

```bash
export LM_API_TOKEN="your-lm-studio-api-token"
```

Si l'authentification LM Studio est désactivée, utilisez n'importe quelle valeur de jeton non vide :

```bash
export LM_API_TOKEN="placeholder-key"
```

Pour plus de détails sur la configuration de l'authentification LM Studio, consultez [Authentification LM Studio](https://lmstudio.ai/docs/developer/core/authentication).

4. Exécutez l'onboarding et choisissez `LM Studio` :

```bash
openclaw onboard
```

5. Lors de l'onboarding, utilisez l'invite `Default model` pour sélectionner votre modèle LM Studio.

Vous pouvez également le définir ou le modifier ultérieurement :

```bash
openclaw models set lmstudio/qwen/qwen3.5-9b
```

Les clés de modèle LM Studio suivent un format `author/model-name` (par ex. `qwen/qwen3.5-9b`). Les références de modèle OpenClaw
préfixent le nom du fournisseur : `lmstudio/qwen/qwen3.5-9b`. Vous pouvez trouver la clé exacte pour
un modèle en exécutant `curl http://localhost:1234/api/v1/models` et en regardant le champ `key`.

## Non-interactive onboarding

Utilisez l'onboarding non interactif lorsque vous souhaitez scripter la configuration (CI, provisionnement, amorçage à distance) :

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio
```

Ou spécifiez l'URL de base ou le modèle avec la clé API :

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice lmstudio \
  --custom-base-url http://localhost:1234/v1 \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --custom-model-id qwen/qwen3.5-9b
```

`--custom-model-id` prend la clé de modèle telle que renvoyée par LM Studio (par ex. `qwen/qwen3.5-9b`), sans
le préfixe du fournisseur `lmstudio/`.

L'onboarding non interactif nécessite `--lmstudio-api-key` (ou `LM_API_TOKEN` dans les variables d'env).
Pour les serveurs LM Studio non authentifiés, n'importe quelle valeur de jeton non vide fonctionne.

`--custom-api-key` reste pris en charge pour la compatibilité, mais `--lmstudio-api-key` est préféré pour LM Studio.

Cela écrit `models.providers.lmstudio`, définit le model par défaut sur
`lmstudio/<custom-model-id>` et écrit le profil d'authentification `lmstudio:default`.

La configuration interactive peut demander une longueur de contexte de chargement préférée optionnelle et l'applique à tous les modèles LM Studio découverts qu'elle enregistre dans la configuration.

## Configuration

### Compatibilité de l'utilisation en streaming

OpenClaw marque LM Studio comme compatible avec l'utilisation en streaming, de sorte que la comptabilisation des jetons ne se dégrade plus en totaux inconnus ou obsolètes lors des complétions en streaming. OpenClaw récupère également les comptes de jetons à partir des métadonnées de type llama.cpp `timings.prompt_n` / `timings.predicted_n` lorsque LM Studio n'émet pas d'objet `usage` de forme OpenAI.

Autres backends locaux compatibles OpenAI couverts par le même comportement :

- vLLM
- SGLang
- llama.cpp
- LocalAI
- Jan
- TabbyAPI
- text-generation-webui

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

Assurez-vous que LM Studio est en cours d'exécution et que vous avez défini `LM_API_TOKEN` (pour les serveurs non authentifiés, toute valeur de jeton non vide fonctionne) :

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
- Pour plus de détails sur la configuration de l'authentification LM Studio, consultez [Authentification LM Studio](https://lmstudio.ai/docs/developer/core/authentication).
- Si votre serveur ne nécessite pas d'authentification, utilisez n'importe quelle valeur de jeton non vide pour `LM_API_TOKEN`.

### Chargement de modèle à la demande (Just-in-time)

LM Studio prend en charge le chargement de modèle à la demande (JIT), où les modèles sont chargés lors de la première requête. Assurez-vous que cette fonction est activée pour éviter les erreurs « Modèle non chargé ».
