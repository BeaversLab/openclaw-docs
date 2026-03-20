---
summary: "Run OpenClaw with Ollama (cloud and local models)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

Ollama is a local LLM runtime that makes it easy to run open-source models on your machine. OpenClaw integrates with Ollama's native API (`/api/chat`), supports streaming and tool calling, and can auto-discover local Ollama models when you opt in with `OLLAMA_API_KEY` (or an auth profile) and do not define an explicit `models.providers.ollama` entry.

<Warning>
**Remote Ollama users**: Do not use the `/v1` OpenAI-compatible URL (`http://host:11434/v1`) with OpenClaw. This breaks tool calling and models may output raw tool JSON as plain text. Use the native Ollama API URL instead: `baseUrl: "http://host:11434"` (no `/v1`).
</Warning>

## Quick start

### Onboarding (recommended)

The fastest way to set up Ollama is through onboarding:

```bash
openclaw onboard
```

Select **Ollama** from the provider list. Onboarding will:

1. Ask for the Ollama base URL where your instance can be reached (default `http://127.0.0.1:11434`).
2. Let you choose **Cloud + Local** (cloud models and local models) or **Local** (local models only).
3. Open a browser sign-in flow if you choose **Cloud + Local** and are not signed in to ollama.com.
4. Discover available models and suggest defaults.
5. Auto-pull the selected model if it is not available locally.

Non-interactive mode is also supported:

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --accept-risk
```

Optionally specify a custom base URL or model:

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

### Manual setup

1. Install Ollama: [https://ollama.com/download](https://ollama.com/download)

2. Pull a local model if you want local inference:

```bash
ollama pull glm-4.7-flash
# or
ollama pull gpt-oss:20b
# or
ollama pull llama3.3
```

3. If you want cloud models too, sign in:

```bash
ollama signin
```

4. Run onboarding and choose `Ollama`:

```bash
openclaw onboard
```

- `Local`: local models only
- `Cloud + Local`: local models plus cloud models
- Cloud models such as `kimi-k2.5:cloud`, `minimax-m2.5:cloud`, and `glm-5:cloud` do **not** require a local `ollama pull`

OpenClaw currently suggests:

- local default: `glm-4.7-flash`
- valeurs par défaut cloud : `kimi-k2.5:cloud`, `minimax-m2.5:cloud`, `glm-5:cloud`

5. Si vous préférez une configuration manuelle, activez Ollama pour OpenClaw directement (n'importe quelle valeur fonctionne ; Ollama ne nécessite pas de vraie clé) :

```bash
# Set environment variable
export OLLAMA_API_KEY="ollama-local"

# Or configure in your config file
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

6. Inspecter ou changer les modèles :

```bash
openclaw models list
openclaw models set ollama/glm-4.7-flash
```

7. Ou définir la valeur par défaut dans la configuration :

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/glm-4.7-flash" },
    },
  },
}
```

## Découverte de modèles (fournisseur implicite)

Lorsque vous définissez `OLLAMA_API_KEY` (ou un profil d'authentification) et que vous **ne définissez pas** `models.providers.ollama`, OpenClaw découvre les modèles depuis l'instance locale Ollama sur `http://127.0.0.1:11434` :

- Interroge `/api/tags`
- Utilise des recherches `/api/show` au mieux possible pour lire `contextWindow` lorsque disponible
- Marque `reasoning` avec une heuristique de nom de modèle (`r1`, `reasoning`, `think`)
- Définit `maxTokens` à la limite maximale de jetons par défaut Ollama utilisée par OpenClaw
- Définit tous les coûts à `0`

Cela évite les entrées de modèle manuelles tout en gardant le catalogue aligné avec l'instance locale Ollama.

Pour voir quels modèles sont disponibles :

```bash
ollama list
openclaw models list
```

Pour ajouter un nouveau modèle, il suffit de le récupérer avec Ollama :

```bash
ollama pull mistral
```

Le nouveau modèle sera découvert automatiquement et disponible à l'utilisation.

Si vous définissez `models.providers.ollama` explicitement, la découverte automatique est ignorée et vous devez définir les modèles manuellement (voir ci-dessous).

## Configuration

### Configuration de base (découverte implicite)

Le moyen le plus simple d'activer Ollama est via la variable d'environnement :

```bash
export OLLAMA_API_KEY="ollama-local"
```

### Configuration explicite (modèles manuels)

Utilisez une configuration explicite lorsque :

- Ollama s'exécute sur un autre hôte/port.
- Vous voulez forcer des fenêtres de contexte ou des listes de modèles spécifiques.
- Vous voulez des définitions de modèles entièrement manuelles.

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
        apiKey: "ollama-local",
        api: "ollama",
        models: [
          {
            id: "gpt-oss:20b",
            name: "GPT-OSS 20B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 8192 * 10
          }
        ]
      }
    }
  }
}
```

Si `OLLAMA_API_KEY` est défini, vous pouvez omettre `apiKey` dans l'entrée du fournisseur et OpenClaw le remplira pour les vérifications de disponibilité.

### URL de base personnalisée (configuration explicite)

Si Ollama s'exécute sur un hôte ou un port différent (la configuration explicite désactive la découverte automatique, donc définissez les modèles manuellement) :

```json5
{
  models: {
    providers: {
      ollama: {
        apiKey: "ollama-local",
        baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
        api: "ollama", // Set explicitly to guarantee native tool-calling behavior
      },
    },
  },
}
```

<Warning>
N'ajoutez pas `/v1` à l'URL. Le chemin `/v1` utilise le mode compatible OpenAI, où l'appel d'outil n'est pas fiable. Utilisez l'URL de base Ollama sans suffixe de chemin.
</Warning>

### Sélection du modèle

Une fois configuré, tous vos modèles Ollama sont disponibles :

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

## Modèles cloud

Les modèles cloud vous permettent d'exécuter des modèles hébergés dans le cloud (par exemple `kimi-k2.5:cloud`, `minimax-m2.5:cloud`, `glm-5:cloud`) aux côtés de vos modèles locaux.

Pour utiliser les modèles cloud, sélectionnez le mode **Cloud + Local** lors de la configuration. L'assistant vérifie si vous êtes connecté et ouvre un flux de connexion dans le navigateur si nécessaire. Si l'authentification ne peut pas être vérifiée, l'assistant revient aux modèles locaux par défaut.

Vous pouvez également vous connecter directement sur [ollama.com/signin](https://ollama.com/signin).

## Avancé

### Modèles de raisonnement

OpenClaw considère par défaut les modèles portant des noms tels que `deepseek-r1`, `reasoning` ou `think` comme étant capables de raisonnement :

```bash
ollama pull deepseek-r1:32b
```

### Coûts des modèles

Ollama est gratuit et fonctionne localement, donc tous les coûts des modèles sont définis à 0 $.

### Configuration du streaming

L'intégration OpenClaw de Ollama utilise l'**Ollama API native** (`/api/chat`) par défaut, ce qui prend entièrement en charge le streaming et l'appel d'outils simultanément. Aucune configuration spéciale n'est nécessaire.

#### Mode compatible OpenAI (hérité)

<Warning>
**L'appel d'outils n'est pas fiable en mode compatible OpenAI.** N'utilisez ce mode que si vous avez besoin du format OpenAI pour un proxy et que ne dépendez pas du comportement natif d'appel d'outils.
</Warning>

Si vous devez utiliser le point de terminaison compatible OpenAI à la place (par exemple, derrière un proxy qui ne prend en charge que le format OpenAI), définissez `api: "openai-completions"` explicitement :

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: true, // default: true
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}
```

Ce mode peut ne pas prendre en charge le streaming et l'appel d'outils simultanément. Vous devrez peut-être désactiver le streaming avec `params: { streaming: false }` dans la configuration du modèle.

Lorsque `api: "openai-completions"` est utilisé avec Ollama, OpenClaw injecte `options.num_ctx` par défaut pour que Ollama ne revienne pas silencieusement à une fenêtre de contexte de 4096. Si votre proxy/amont rejette les champs `options` inconnus, désactivez ce comportement :

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: false,
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}
```

### Fenêtres de contexte

Pour les modèles découverts automatiquement, OpenClaw utilise la fenêtre de contexte signalée par Ollama si elle est disponible, sinon elle revient à la fenêtre de contexte Ollama par défaut utilisée par OpenClaw. Vous pouvez remplacer `contextWindow` et `maxTokens` dans la configuration explicite du provider.

## Dépannage

### Ollama non détecté

Assurez-vous que Ollama est en cours d'exécution, que vous avez configuré `OLLAMA_API_KEY` (ou un profil d'authentification), et que vous n'avez **pas** défini d'entrée `models.providers.ollama` explicite :

```bash
ollama serve
```

Et que API est accessible :

```bash
curl http://localhost:11434/api/tags
```

### Aucun modèle disponible

Si votre modèle n'est pas répertorié, soit :

- Téléchargez le modèle localement, ou
- Définissez le modèle explicitement dans `models.providers.ollama`.

Pour ajouter des modèles :

```bash
ollama list  # See what's installed
ollama pull glm-4.7-flash
ollama pull gpt-oss:20b
ollama pull llama3.3     # Or another model
```

### Connexion refusée

Vérifiez que Ollama s'exécute sur le bon port :

```bash
# Check if Ollama is running
ps aux | grep ollama

# Or restart Ollama
ollama serve
```

## Voir aussi

- [Fournisseurs de modèles](/fr/concepts/model-providers) - Vue d'ensemble de tous les fournisseurs
- [Sélection de modèle](/fr/concepts/models) - Comment choisir des modèles
- [Configuration](/fr/gateway/configuration) - Référence complète de la configuration

import en from "/components/footer/en.mdx";

<en />
