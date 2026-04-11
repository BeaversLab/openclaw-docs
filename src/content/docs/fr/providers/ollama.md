---
summary: "Exécuter OpenClaw avec Ollama (modèles cloud et locaux)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

Ollama est un runtime LLM local qui facilite l'exécution de modèles open source sur votre machine. OpenClaw s'intègre à l'Ollama native de API (`/api/chat`), prend en charge le streaming et l'appel d'outils, et peut découvrir automatiquement les modèles Ollama locaux lorsque vous activez l'option avec `OLLAMA_API_KEY` (ou un profil d'authentification) et que vous ne définissez pas d'entrée `models.providers.ollama` explicite.

<Warning>**Utilisateurs d'Ollama distant** : N'utilisez pas l'URL compatible `/v1` Ollama (`http://host:11434/v1`) avec OpenAI. Cela désactive l'appel de tool et les modèles peuvent afficher le JSON brut du tool en texte clair. Utilisez plutôt l'URL native de l'OpenClaw Ollama : `baseUrl: "http://host:11434"` (sans `/v1`).</Warning>

## Quick start

### Onboarding (recommandé)

Le moyen le plus rapide de configurer Ollama passe par l'onboarding :

```bash
openclaw onboard
```

Sélectionnez **Ollama** dans la liste des providers. L'onboarding va :

1. Demandez l'URL de base Ollama à laquelle votre instance est accessible (par défaut `http://127.0.0.1:11434`).
2. Vous laisser choisir **Cloud + Local** (modèles cloud et modèles locaux) ou **Local** (modèles locaux uniquement).
3. Ouvrir un flux de connexion dans le navigateur si vous choisissez **Cloud + Local** et que vous n'êtes pas connecté à ollama.com.
4. Découvrir les modèles disponibles et suggérer les valeurs par défaut.
5. Tirer automatiquement le modèle sélectionné s'il n'est pas disponible localement.

Le mode non interactif est également pris en charge :

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --accept-risk
```

Spécifiez éventuellement une URL de base personnalisée ou un modèle :

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

### Configuration manuelle

1. Installez Ollama : [https://ollama.com/download](https://ollama.com/download)

2. Tirez un modèle local si vous souhaitez une inférence locale :

```bash
ollama pull gemma4
# or
ollama pull gpt-oss:20b
# or
ollama pull llama3.3
```

3. Si vous souhaitez également des modèles cloud, connectez-vous :

```bash
ollama signin
```

4. Exécutez l'intégration (onboarding) et choisissez `Ollama` :

```bash
openclaw onboard
```

- `Local` : modèles locaux uniquement
- `Cloud + Local` : modèles locaux plus modèles cloud
- Les modèles cloud tels que `kimi-k2.5:cloud`, `minimax-m2.7:cloud` et `glm-5.1:cloud` ne nécessitent **pas** de `ollama pull` local

OpenClaw suggère actuellement :

- par défaut local : `gemma4`
- par défaut cloud : `kimi-k2.5:cloud`, `minimax-m2.7:cloud`, `glm-5.1:cloud`

5. Si vous préférez une configuration manuelle, activez Ollama pour OpenClaw directement (n'importe quelle valeur fonctionne ; Ollama ne nécessite pas de vraie clé) :

```bash
# Set environment variable
export OLLAMA_API_KEY="ollama-local"

# Or configure in your config file
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

6. Inspecter ou changer de modèles :

```bash
openclaw models list
openclaw models set ollama/gemma4
```

7. Ou définir la valeur par défaut dans la configuration :

```json5
{
  agents: {
    defaults: {
      model: { primary: "ollama/gemma4" },
    },
  },
}
```

## Découverte de modèles (provider implicite)

Lorsque vous définissez `OLLAMA_API_KEY` (ou un profil d'authentification) et que vous **ne définissez pas** `models.providers.ollama`, OpenClaw découvre les modèles à partir de l'instance locale Ollama sur `http://127.0.0.1:11434` :

- Interroge `/api/tags`
- Utilise des recherches `/api/show` de meilleure tentative pour lire `contextWindow` lorsqu'elles sont disponibles
- Marque `reasoning` avec une heuristique de nom de modèle (`r1`, `reasoning`, `think`)
- Définit `maxTokens` à la limite maximale de jetons par défaut de Ollama utilisée par OpenClaw
- Définit tous les coûts à `0`

Cela évite les entrées de modèle manuelles tout en gardant le catalogue aligné avec l'instance locale Ollama.

Pour voir quels modèles sont disponibles :

```bash
ollama list
openclaw models list
```

Pour ajouter un nouveau modèle, il suffit de le tirer avec Ollama :

```bash
ollama pull mistral
```

Le nouveau modèle sera découvert automatiquement et disponible à l'utilisation.

Si vous définissez `models.providers.ollama` explicitement, la découverte automatique est ignorée et vous devez définir les modèles manuellement (voir ci-dessous).

## Configuration

### Configuration de base (découverte implicite)

Le moyen le plus simple d'activer Ollama est via une variable d'environnement :

```bash
export OLLAMA_API_KEY="ollama-local"
```

### Configuration explicite (modèles manuels)

Utilisez une configuration explicite lorsque :

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

Si `OLLAMA_API_KEY` est défini, vous pouvez omettre `apiKey` dans l'entrée du fournisseur et OpenClaw le remplacera pour les vérifications de disponibilité.

### URL de base personnalisée (configuration explicite)

Si Ollama s'exécute sur un hôte ou un port différent (la configuration explicite désactive la découverte automatique, définissez donc les modèles manuellement) :

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

<Warning>N'ajoutez pas `/v1` à l'URL. Le chemin `/v1` utilise le mode compatible OpenAI, où l'appel d'outil n'est pas fiable. Utilisez l'URL de base Ollama sans suffixe de chemin.</Warning>

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

Les modèles cloud vous permettent d'exécuter des modèles hébergés dans le cloud (par exemple `kimi-k2.5:cloud`, `minimax-m2.7:cloud`, `glm-5.1:cloud`) parallèlement à vos modèles locaux.

Pour utiliser des modèles cloud, sélectionnez le mode **Cloud + Local** lors de la configuration. L'assistant vérifie si vous êtes connecté et ouvre un flux de connexion dans le navigateur si nécessaire. Si l'authentification ne peut pas être vérifiée, l'assistant revient aux paramètres par défaut des modèles locaux.

Vous pouvez également vous connecter directement sur [ollama.com/signin](https://ollama.com/signin).

## Recherche Web Ollama

OpenClaw prend également en charge la **Recherche Web Ollama** en tant que fournisseur `web_search`
bundlé.

- Il utilise votre hôte Ollama configuré (`models.providers.ollama.baseUrl` lorsqu'il est
  défini, sinon `http://127.0.0.1:11434`).
- Il ne nécessite pas de clé.
- Il nécessite que Ollama soit en cours d'exécution et connecté avec `ollama signin`.

Choisissez **Recherche Web Ollama** pendant `openclaw onboard` ou
`openclaw configure --section web`, ou définissez :

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

Pour les détails complets sur la configuration et le comportement, consultez [Recherche Web Ollama](/en/tools/ollama-search).

## Avancé

### Modèles de raisonnement

OpenClaw traite par défaut les modèles portant des noms tels que `deepseek-r1`, `reasoning` ou `think` comme capables de raisonnement :

```bash
ollama pull deepseek-r1:32b
```

### Coûts du modèle

Ollama est gratuit et fonctionne localement, donc tous les coûts du modèle sont définis à 0 $.

### Configuration du streaming

L'intégration OpenClaw de Ollama utilise l'**Ollama native API** (`/api/chat`) par défaut, ce qui prend entièrement en charge le streaming et l'appel d'outils simultanément. Aucune configuration spéciale n'est nécessaire.

#### Mode compatible OpenAI hérité

<Warning>**L'appel d'outils n'est pas fiable en mode compatible OpenAI.** N'utilisez ce mode que si vous avez besoin du format OpenAI pour un proxy et ne dépendez pas du comportement natif de l'appel d'outils.</Warning>

Si vous devez plutôt utiliser le point de terminaison compatible OpenAI (par exemple, derrière un proxy qui ne prend en charge que le format OpenAI), définissez `api: "openai-completions"` explicitement :

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

Ce mode peut ne pas prendre en charge simultanément le streaming et l'appel d'outils. Vous devrez peut-être désactiver le streaming avec `params: { streaming: false }` dans la configuration du modèle.

Lorsque `api: "openai-completions"` est utilisé avec Ollama, OpenClaw injecte `options.num_ctx` par défaut afin que Ollama ne revienne pas silencieusement à une fenêtre de contexte de 4096. Si votre proxy ou votre serveur amont rejette les champs `options` inconnus, désactivez ce comportement :

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

Pour les modèles découverts automatiquement, OpenClaw utilise la fenêtre de contexte signalée par Ollama si elle est disponible, sinon elle revient à la fenêtre de contexte Ollama par défaut utilisée par OpenClaw. Vous pouvez remplacer `contextWindow` et `maxTokens` dans la configuration explicite du fournisseur.

## Dépannage

### Ollama non détecté

Assurez-vous que Ollama est en cours d'exécution et que vous avez défini `OLLAMA_API_KEY` (ou un profil d'authentification), et que vous n'avez **pas** défini d'entrée `models.providers.ollama` explicite :

```bash
ollama serve
```

Et que l'API est accessible :

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
ollama pull gemma4
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

- [Fournisseurs de modèles](/en/concepts/model-providers) - Aperçu de tous les fournisseurs
- [Sélection de modèle](/en/concepts/models) - Comment choisir des modèles
- [Configuration](/en/gateway/configuration) - Référence complète de la configuration
