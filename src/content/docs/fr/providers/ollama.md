---
summary: "Exécuter OpenClaw avec Ollama (modèles cloud et locaux)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

OpenClaw s'intègre à l'API native d'Ollama (`/api/chat`) pour les modèles cloud hébergés et les serveurs Ollama locaux/auto-hébergés. Vous pouvez utiliser Ollama selon trois modes : `Cloud + Local` via un hôte Ollama accessible, `Cloud only` sur `https://ollama.com`, ou `Local only` contre un hôte Ollama accessible.

<Warning>**Utilisateurs d'Ollama distant** : N'utilisez pas l'URL compatible `/v1` OpenAI (`http://host:11434/v1`) avec OpenClaw. Cela brise l'appel d'outils et les modèles peuvent produire du JSON brut d'outils en texte clair. Utilisez plutôt l'URL de l'API native Ollama : `baseUrl: "http://host:11434"` (pas de `/v1`).</Warning>

La configuration du fournisseur Ollama utilise `baseUrl` comme clé canonique. OpenClaw accepte également `baseURL` pour la compatibilité avec les exemples de style SDK OpenAI, mais la nouvelle configuration devrait préférer `baseUrl`.

## Règles d'authentification

<AccordionGroup>
  <Accordion title="Hôtes locaux et LAN">
    Les hôtes Ollama locaux et LAN n'ont pas besoin d'un vrai jeton de porteur. OpenClaw utilise le marqueur local `ollama-local` uniquement pour les URL de base Ollama de bouclage, de réseau privé, `.local`, et de nom d'hôte nu.
  </Accordion>
  <Accordion title="Hôtes distants et cloud Ollama">
    Les hôtes publics distants et Ollama Cloud (`https://ollama.com`) nécessitent une vraie identifiants via `OLLAMA_API_KEY`, un profil d'authentification, ou le `apiKey` du fournisseur.
  </Accordion>
  <Accordion title="Custom provider ids">
    Les identifiants de fournisseur personnalisés qui définissent `api: "ollama"` suivent les mêmes règles. Par exemple, un fournisseur `ollama-remote` pointant vers un hôte Ollama sur un réseau privé local peut utiliser `apiKey: "ollama-local"` et les sous-agents résoudront ce marqueur via le hook du fournisseur Ollama au lieu de le traiter comme des identifiants manquants.
  </Accordion>
  <Accordion title="Memory embedding scope">
    Lorsque Ollama est utilisé pour les plongements de mémoire (memory embeddings), l'authentification par porteur est limitée à l'hôte où elle a été déclarée :

    - Une clé de niveau fournisseur n'est envoyée qu'à l'hôte Ollama de ce fournisseur.
    - `agents.*.memorySearch.remote.apiKey` n'est envoyé qu'à son hôte de plongement distant.
    - Une valeur d'environnement `OLLAMA_API_KEY` pure est traitée comme la convention Ollama Cloud et n'est pas envoyée aux hôtes locaux ou auto-hébergés par défaut.

  </Accordion>
</AccordionGroup>

## Getting started

Choose your preferred setup method and mode.

<Tabs>
  <Tab title="Onboarding (recommandé)">
    **Idéal pour :** le chemin le plus rapide vers une configuration Ollama cloud ou locale fonctionnelle.

    <Steps>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard
        ```

        Sélectionnez **Ollama** dans la liste des fournisseurs.
      </Step>
      <Step title="Choisissez votre mode">
        - **Cloud + Local** — hôte Ollama local plus modèles cloud acheminés via cet hôte
        - **Cloud uniquement** — modèles Ollama hébergés via `https://ollama.com`
        - **Local uniquement** — modèles locaux uniquement
      </Step>
      <Step title="Sélectionnez un modèle">
        `Cloud only` demande `OLLAMA_API_KEY` et suggère des valeurs par défaut cloud hébergées. `Cloud + Local` et `Local only` demandent une URL de base Ollama, découvrent les modèles disponibles et téléchargent automatiquement le modèle local sélectionné s'il n'est pas encore disponible. Lorsqu'Ollama signale un tag `:latest` installé tel que `gemma4:latest`, la configuration affiche ce modèle installé une seule fois au lieu d'afficher à la fois `gemma4` et `gemma4:latest` ou de télécharger à nouveau l'alias nu. `Cloud + Local` vérifie également si cet hôte Ollama est connecté pour l'accès cloud.
      </Step>
      <Step title="Vérifiez que le modèle est disponible">
        ```bash
        openclaw models list --provider ollama
        ```
      </Step>
    </Steps>

    ### Mode non interactif

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --accept-risk
    ```

    Spécifiez facultativement une URL de base personnalisée ou un modèle :

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

  </Tab>

  <Tab title="Configuration manuelle">
    **Idéal pour :** un contrôle total de la configuration cloud ou locale.

    <Steps>
      <Step title="Choisir cloud ou local">
        - **Cloud + Local** : installez Ollama, connectez-vous avec `ollama signin`, et acheminez les requêtes cloud via cet hôte
        - **Cloud uniquement** : utilisez `https://ollama.com` avec un `OLLAMA_API_KEY`
        - **Local uniquement** : installez Ollama depuis [ollama.com/download](https://ollama.com/download)
      </Step>
      <Step title="Tirer un modèle local (uniquement local)">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="Activer Ollama pour OpenClaw">
        Pour `Cloud only`, utilisez votre véritable `OLLAMA_API_KEY`. Pour les configurations basées sur un hôte, n'importe quelle valeur d'espace réservé fonctionne :

        ```bash
        # Cloud
        export OLLAMA_API_KEY="your-ollama-api-key"

        # Local-only
        export OLLAMA_API_KEY="ollama-local"

        # Or configure in your config file
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="Inspecter et définir votre modèle">
        ```bash
        openclaw models list
        openclaw models set ollama/gemma4
        ```

        Ou définissez la valeur par défaut dans la configuration :

        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "ollama/gemma4" },
            },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Modèles cloud

<Tabs>
  <Tab title="Cloud + Local">
    `Cloud + Local` utilise un hôte Ollama accessible comme point de contrôle pour les modèles locaux et cloud. Il s'agit du flux hybride préféré d'Ollama.

    Utilisez **Cloud + Local** lors de la configuration. OpenClaw demande l'URL de base d'Ollama, découvre les modèles locaux depuis cet hôte et vérifie si l'hôte est connecté pour l'accès cloud avec `ollama signin`. Lorsque l'hôte est connecté, OpenClaw suggère également des valeurs par défaut cloud hébergées telles que `kimi-k2.5:cloud`, `minimax-m2.7:cloud` et `glm-5.1:cloud`.

    Si l'hôte n'est pas encore connecté, OpenClaw conserve la configuration en mode local uniquement jusqu'à ce que vous exécutiez `ollama signin`.

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` s'exécute sur l'API hébergée de Ollama à l'adresse `https://ollama.com`.

    Utilisez **Cloud only** (Cloud uniquement) lors de la configuration. API demande `OLLAMA_API_KEY`, définit `baseUrl: "https://ollama.com"` et remplit la liste des modèles cloud hébergés. Cette méthode ne nécessite **pas** de serveur OpenClaw local ni `ollama signin`.

    La liste des modèles cloud affichée pendant `openclaw onboard` est remplie en direct à partir de `https://ollama.com/api/tags`, plafonnée à 500 entrées, de sorte que le sélecteur reflète le catalogue hébergé actuel plutôt qu'une graine statique. Si `ollama.com` est inaccessible ou ne renvoie aucun modèle au moment de la configuration, Ollama revient aux suggestions précédentes en dur afin que l'onboarding puisse toujours se terminer.

  </Tab>

  <Tab title="Local only">
    En mode local uniquement, OpenClaw découvre les modèles à partir de l'instance Ollama configurée. Cette méthode est destinée aux serveurs Ollama locaux ou auto-hébergés.

    OpenClaw suggère actuellement `gemma4` comme valeur par défaut locale.

  </Tab>
</Tabs>

## Découverte de modèles (fournisseur implicite)

Lorsque vous définissez `OLLAMA_API_KEY` (ou un profil d'authentification) et que vous **ne** définissez pas `models.providers.ollama` ou un autre fournisseur distant personnalisé avec `api: "ollama"`, OpenClaw découvre les modèles à partir de l'instance locale Ollama à l'adresse `http://127.0.0.1:11434`.

| Comportement              | Détail                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requête de catalogue      | Interroge `/api/tags`                                                                                                                                                                                        |
| Détection des capacités   | Utilise des recherches `/api/show` au mieux effort pour lire `contextWindow`, les paramètres étendus `num_ctx` du Modelfile, et les capacités incluant la vision/outils                                      |
| Modèles de vision         | Les modèles avec une capacité `vision` signalée par `/api/show` sont marqués comme compatibles avec les images (`input: ["text", "image"]`), donc OpenClaw injecte automatiquement les images dans le prompt |
| Détection du raisonnement | Marque `reasoning` avec une heuristique de nom de modèle (`r1`, `reasoning`, `think`)                                                                                                                        |
| Limites de jetons         | Définit `maxTokens` sur la limite maximale de jetons par défaut pour Ollama utilisée par OpenClaw                                                                                                            |
| Coûts                     | Définit tous les coûts à `0`                                                                                                                                                                                 |

Cela évite les entrées manuelles de modèles tout en gardant le catalogue aligné avec l'instance Ollama locale.

```bash
# See what models are available
ollama list
openclaw models list
```

Pour ajouter un nouveau modèle, tirez-le simplement avec Ollama :

```bash
ollama pull mistral
```

Le nouveau modèle sera découvert automatiquement et disponible à l'utilisation.

<Note>
  Si vous définissez `models.providers.ollama` explicitement, ou si vous configurez un fournisseur distant personnalisé tel que `models.providers.ollama-cloud` avec `api: "ollama"`, la découverte automatique est ignorée et vous devez définir les modèles manuellement. Les fournisseurs personnalisés de bouclage (loopback) tels que `http://127.0.0.2:11434` sont toujours traités comme locaux. Voir la
  section de configuration explicite ci-dessous.
</Note>

## Vision et description d'image

Le plugin Ollama intégré enregistre Ollama en tant que fournisseur de compréhension de média capable de traiter des images. Cela permet à OpenClaw de router les demandes explicites de description d'image et les paramètres par défaut de modèles d'image configurés via des modèles de vision Ollama locaux ou hébergés.

Pour la vision locale, tirez un modèle qui prend en charge les images :

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
```

Vérifiez ensuite avec la CLI d'inférence :

```bash
openclaw infer image describe \
  --file ./photo.jpg \
  --model ollama/qwen2.5vl:7b \
  --json
```

`--model` doit être une référence complète `<provider/model>`. Lorsqu'il est défini, `openclaw infer image describe` exécute ce modèle directement au lieu d'ignorer la description car le modèle prend en charge la vision native.

Pour faire d'Ollama le modèle de compréhension d'image par défaut pour les médias entrants, configurez `agents.defaults.imageModel` :

```json5
{
  agents: {
    defaults: {
      imageModel: {
        primary: "ollama/qwen2.5vl:7b",
      },
    },
  },
}
```

Les modèles de vision locale lents peuvent nécessiter un délai d'attente de compréhension d'image plus long que les modèles cloud. Ils peuvent également planter ou s'arrêter lorsque Ollama essaie d'allouer le contexte de vision complet annoncé sur du matériel contraint. Définissez un délai d'attente de capacité, et plafonnez `num_ctx` sur l'entrée du modèle lorsque vous avez seulement besoin d'un tour de description d'image normal :

```json5
{
  models: {
    providers: {
      ollama: {
        models: [
          {
            id: "qwen2.5vl:7b",
            name: "qwen2.5vl:7b",
            input: ["text", "image"],
            params: { num_ctx: 2048, keep_alive: "1m" },
          },
        ],
      },
    },
  },
  tools: {
    media: {
      image: {
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "qwen2.5vl:7b", timeoutSeconds: 300 }],
      },
    },
  },
}
```

Ce délai d'attente s'applique à la compréhension d'image entrante et à l'outil explicite `image` que l'agent peut appeler pendant un tour. Le `models.providers.ollama.timeoutSeconds` au niveau du fournisseur contrôle toujours la garde de requête HTTP Ollama sous-jacente pour les appels de modèle normaux.

Vérifiez en direct l'outil d'image explicite contre Ollama local avec :

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

Si vous définissez `models.providers.ollama.models` manuellement, marquez les modèles de vision avec la prise en charge des entrées d'image :

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw rejette les demandes de description d'image pour les modèles qui ne sont pas marqués comme compatibles avec les images. Avec la découverte implicite, OpenClaw lit cela auprès d'Ollama lorsque `/api/show` signale une capacité de vision.

## Configuration

<Tabs>
  <Tab title="Basic (implicit discovery)">
    La méthode d'activation la plus simple en local uniquement se fait via une variable d'environnement :

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    Si `OLLAMA_API_KEY` est défini, vous pouvez omettre `apiKey` dans l'entrée du fournisseur et OpenClaw le remplira pour les vérifications de disponibilité.
    </Tip>

  </Tab>

  <Tab title="Explicit (manual models)">
    Utilisez une configuration explicite lorsque vous souhaitez une configuration dans le cloud hébergé, qu'Ollama s'exécute sur un autre hôte/port, que vous souhaitez forcer des fenêtres de contexte ou des listes de modèles spécifiques, ou que vous souhaitez des définitions de modèles entièrement manuelles.

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "https://ollama.com",
            apiKey: "OLLAMA_API_KEY",
            api: "ollama",
            models: [
              {
                id: "kimi-k2.5:cloud",
                name: "kimi-k2.5:cloud",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 128000,
                maxTokens: 8192
              }
            ]
          }
        }
      }
    }
    ```

  </Tab>

  <Tab title="Custom base URL">
    Si Ollama s'exécute sur un hôte ou un port différent (la configuration explicite désactive la découverte automatique, définissez donc les modèles manuellement) :

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
            api: "ollama", // Set explicitly to guarantee native tool-calling behavior
            timeoutSeconds: 300, // Optional: give cold local models longer to connect and stream
            models: [
              {
                id: "qwen3:32b",
                name: "qwen3:32b",
                params: {
                  keep_alive: "15m", // Optional: keep the model loaded between turns
                },
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    N'ajoutez pas `/v1` à l'URL. Le chemin `/v1` utilise le mode compatible OpenAI, où l'appel d'outils n'est pas fiable. Utilisez l'URL de base d'Ollama sans suffixe de chemin.
    </Warning>

  </Tab>
</Tabs>

## Recettes courantes

Utilisez-les comme points de départ et remplacez les ID de modèle par les noms exacts provenant de `ollama list` ou `openclaw models list --provider ollama`.

<AccordionGroup>
  <Accordion title="Local model with auto-discovery">
    Utilisez cette option lorsqu'Ollama s'exécute sur la même machine que la passerelle et que vous souhaitez qu'OpenClaw découvre automatiquement les modèles installés.

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    Cette méthode permet de garder la configuration minimale. N'ajoutez pas de bloc `models.providers.ollama` sauf si vous souhaitez définir des modèles manuellement.

  </Accordion>

  <Accordion title="Hôte Ollama sur le réseau local avec modèles manuels">
    Utilisez les URL natives Ollama pour les hôtes sur le réseau local. N'ajoutez pas `/v1`.

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                reasoning: true,
                input: ["text"],
                params: {
                  num_ctx: 32768,
                  thinking: false,
                  keep_alive: "15m",
                },
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/qwen3.5:9b" },
        },
      },
    }
    ```

    `contextWindow` est le budget de contexte côté OpenClaw. `params.num_ctx` est envoyé à Ollama pour la requête. Gardez-les alignés lorsque votre matériel ne peut pas exécuter le contexte complet annoncé par le modèle.

  </Accordion>

  <Accordion title="Ollama Cloud uniquement">
    Utilisez ceci lorsque vous n'exécutez pas de démon local et que vous souhaitez utiliser des modèles Ollama hébergés directement.

    ```bash
    export OLLAMA_API_KEY="your-ollama-api-key"
    ```

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "https://ollama.com",
            apiKey: "OLLAMA_API_KEY",
            api: "ollama",
            models: [
              {
                id: "kimi-k2.5:cloud",
                name: "kimi-k2.5:cloud",
                reasoning: false,
                input: ["text", "image"],
                contextWindow: 128000,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/kimi-k2.5:cloud" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Cloud plus local via un démon connecté">
    Utilisez ceci lorsqu'un démon Ollama local ou sur le réseau local est connecté avec `ollama signin` et doit servir à la fois des modèles locaux et des modèles `:cloud`.

    ```bash
    ollama signin
    ollama pull gemma4
    ```

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            models: [
              { id: "gemma4", name: "gemma4", input: ["text"] },
              { id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text", "image"] },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama/gemma4",
            fallbacks: ["ollama/kimi-k2.5:cloud"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Hôtes Ollama multiples">
    Utilisez des ID de fournisseur personnalisés lorsque vous avez plus d'un serveur Ollama. Chaque fournisseur obtient son propre hôte, modèles, auth, délai d'attente et références de modèle.

    ```json5
    {
      models: {
        providers: {
          "ollama-fast": {
            baseUrl: "http://mini.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [{ id: "gemma4", name: "gemma4", input: ["text"] }],
          },
          "ollama-large": {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 420,
            contextWindow: 131072,
            maxTokens: 16384,
            models: [{ id: "qwen3.5:27b", name: "qwen3.5:27b", input: ["text"] }],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama-fast/gemma4",
            fallbacks: ["ollama-large/qwen3.5:27b"],
          },
        },
      },
    }
    ```

    Lorsqu'OpenClaw envoie la requête, le préfixe du fournisseur actif est supprimé, afin que `ollama-large/qwen3.5:27b` atteigne Ollama sous la forme `qwen3.5:27b`.

  </Accordion>

  <Accordion title="Lean local model profile">
    Certains modèles locaux peuvent répondre à des invites simples mais peinent avec la surface complète des outils de l'agent. Commencez par limiter les outils et le contexte avant de modifier les paramètres d'exécution globaux.

    ```json5
    {
      agents: {
        defaults: {
          experimental: {
            localModelLean: true,
          },
          model: { primary: "ollama/gemma4" },
        },
      },
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [
              {
                id: "gemma4",
                name: "gemma4",
                input: ["text"],
                params: { num_ctx: 32768 },
                compat: { supportsTools: false },
              },
            ],
          },
        },
      },
    }
    ```

    Utilisez `compat.supportsTools: false` uniquement lorsque le modèle ou le serveur échoue de manière fiable sur les schémas d'outils. Cela échange les capacités de l'agent contre la stabilité.
    `localModelLean` supprime les outils de navigateur, cron et de message de la surface de l'agent, mais cela ne modifie pas le contexte d'exécution ou le mode de réflexion d'Ollama. Associez-le à des `params.num_ctx` et des `params.thinking: false` explicites pour les petits modèles de réflexion de style Qwen qui bouclent ou dépensent leur budget de réponse en raisonnement caché.

  </Accordion>
</AccordionGroup>

### Sélection du modèle

Une fois configurés, tous vos modèles Ollama sont disponibles :

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

Les ID de fournisseur personnalisés Ollama sont également pris en charge. Lorsqu'une référence de modèle utilise le préfixe de fournisseur actif, tel que `ollama-spark/qwen3:32b`, OpenClaw ne supprime que ce préfixe avant d'appeler Ollama afin que le serveur reçoive `qwen3:32b`.

Pour les modèles locaux lents, préférez le réglage des requêtes délimitées par le fournisseur avant d'augmenter le délai d'attente global de l'exécution de l'agent :

```json5
{
  models: {
    providers: {
      ollama: {
        timeoutSeconds: 300,
        models: [
          {
            id: "gemma4:26b",
            name: "gemma4:26b",
            params: { keep_alive: "15m" },
          },
        ],
      },
    },
  },
}
```

`timeoutSeconds` s'applique à la requête HTTP du modèle, y compris la configuration de la connexion, les en-têtes, le flux du corps et l'abandon total de la récupération sécurisée. `params.keep_alive` est transmis à Ollama en tant que `keep_alive` de niveau supérieur sur les requêtes natives `/api/chat` ; définissez-le par modèle lorsque le temps de chargement du premier tour est le goulot d'étranglement.

### Vérification rapide

```bash
# Ollama daemon visible to this machine
curl http://127.0.0.1:11434/api/tags

# OpenClaw catalog and selected model
openclaw models list --provider ollama
openclaw models status

# Direct model smoke
openclaw infer model run \
  --model ollama/gemma4 \
  --prompt "Reply with exactly: ok"
```

Pour les hôtes distants, remplacez `127.0.0.1` par l'hôte utilisé dans `baseUrl`. Si `curl` fonctionne mais que OpenClaw ne fonctionne pas, vérifiez si la Gateway s'exécute sur une machine, un conteneur ou un compte de service différent.

## Recherche Web Ollama

OpenClaw prend en charge **Recherche Web Ollama** en tant que fournisseur `web_search` intégré.

| Propriété | Détail                                                                                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hôte      | Utilise votre hôte Ollama configuré (`models.providers.ollama.baseUrl` si défini, sinon `http://127.0.0.1:11434`) ; `https://ollama.com` utilise l'API hébergée directement                                    |
| Auth      | Sans clé pour les hôtes Ollama locaux connectés ; `OLLAMA_API_KEY` ou authentification de fournisseur configurée pour la recherche `https://ollama.com` directe ou les hôtes protégés par authentification     |
| Prérequis | Les hôtes locaux/auto-hébergés doivent être en cours d'exécution et connectés avec `ollama signin` ; la recherche hébergée directe nécessite `baseUrl: "https://ollama.com"` ainsi qu'une vraie clé API Ollama |

Choisissez **Recherche Web Ollama** pendant `openclaw onboard` ou `openclaw configure --section web`, ou définissez :

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

Pour une recherche hébergée directe via Ollama Cloud :

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
        api: "ollama",
        models: [{ id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text"] }],
      },
    },
  },
  tools: {
    web: {
      search: { provider: "ollama" },
    },
  },
}
```

Pour un démon local connecté, OpenClaw utilise le proxy `/api/experimental/web_search` du démon. Pour `https://ollama.com`, il appelle directement le point de terminaison hébergé `/api/web_search`.

<Note>Pour les détails complets sur la configuration et le comportement, consultez [Recherche Web Ollama](/fr/tools/ollama-search).</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Mode compatible OpenAI hérité">
    <Warning>
    **L'appel d'outils n'est pas fiable en mode compatible OpenAI.** N'utilisez ce mode que si vous avez besoin du format OpenAI pour un proxy et que vous ne dépendez pas du comportement d'appel d'outils natif.
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

    Lorsque `api: "openai-completions"` est utilisé avec Ollama, OpenClaw injecte `options.num_ctx` par défaut pour qu'Ollama ne revienne pas silencieusement à une fenêtre de contexte de 4096. Si votre proxy/amont rejette les champs `options` inconnus, désactivez ce comportement :

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

  </Accordion>

  <Accordion title="Context windows">
    Pour les modèles découverts automatiquement, OpenClaw utilise la fenêtre contextuelle signalée par Ollama lorsque disponible, y compris les valeurs `PARAMETER num_ctx` plus grandes provenant de Modelfiles personnalisés. Sinon, elle revient à la fenêtre contextuelle par défaut Ollama utilisée par OpenClaw.

    Vous pouvez définir des valeurs par défaut au niveau du fournisseur pour `contextWindow`, `contextTokens` et `maxTokens` pour chaque modèle sous ce fournisseur Ollama, puis les remplacer par modèle si nécessaire. `contextWindow` correspond au budget de prompt et de compactage de OpenClaw. Les requêtes natives Ollama laissent `options.num_ctx` non défini, sauf si vous configurez explicitement `params.num_ctx`, afin que Ollama puisse appliquer sa propre valeur par défaut basée sur le modèle, `OLLAMA_CONTEXT_LENGTH` ou la VRAM. Pour plafonner ou forcer le contexte d'exécution par requête de Ollama sans reconstruire un Modelfile, définissez `params.num_ctx` ; les valeurs non valides, nulles, négatives et non finies sont ignorées. L'adaptateur OpenAI compatible Ollama injecte toujours `options.num_ctx` par défaut à partir du `params.num_ctx` configuré ou du `contextWindow` ; désactivez-le avec `injectNumCtxForOpenAICompat: false` si votre amont rejette `options`.

    Les entrées de modèle natives Ollama acceptent également les options d'exécution courantes Ollama sous `params`, notamment `temperature`, `top_p`, `top_k`, `min_p`, `num_predict`, `stop`, `repeat_penalty`, `num_batch`, `num_thread` et `use_mmap`. OpenClaw ne transmet que les clés de requête Ollama, de sorte que les paramètres d'exécution de OpenClaw tels que `streaming` ne fuient pas vers Ollama. Utilisez `params.think` ou `params.thinking` pour envoyer des `think` Ollama de niveau supérieur ; `false` désactive la réflexion au niveau de l'API pour les modèles de réflexion de style Qwen.

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
                params: {
                  num_ctx: 32768,
                  temperature: 0.7,
                  top_p: 0.9,
                  thinking: false,
                },
              }
            ]
          }
        }
      }
    }
    ```

    Le `agents.defaults.models["ollama/<model>"].params.num_ctx` par modèle fonctionne également. Si les deux sont configurés, l'entrée de modèle de fournisseur explicite l'emporte sur la valeur par défaut de l'agent.

  </Accordion>

  <Accordion title="Contrôle de la réflexion">
    Pour les modèles natifs Ollama, OpenClaw transmet le contrôle de la réflexion comme Ollama l'attend : `think` de premier niveau, et non `options.think`.

    ```bash
    openclaw agent --model ollama/gemma4 --thinking off
    openclaw agent --model ollama/gemma4 --thinking low
    ```

    Vous pouvez également définir une valeur par défaut pour le modèle :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "ollama/gemma4": {
              thinking: "low",
            },
          },
        },
      },
    }
    ```

    Les `params.think` ou `params.thinking` par modèle peuvent désactiver ou forcer la réflexion de l'Ollama API pour un modèle configuré spécifique. Les commandes d'exécution telles que `/think off` s'appliquent toujours à l'exécution active.

  </Accordion>

  <Accordion title="Modèles de raisonnement">
    OpenClaw considère par défaut que les modèles portant des noms tels que `deepseek-r1`, `reasoning` ou `think` sont capables de raisonnement.

    ```bash
    ollama pull deepseek-r1:32b
    ```

    Aucune configuration supplémentaire n'est nécessaire. OpenClaw les marque automatiquement.

  </Accordion>

<Accordion title="Coûts des modèles">Ollama est gratuit et fonctionne localement, donc tous les coûts de modèle sont définis à 0 $. Cela s'applique aux modèles découverts automatiquement ainsi qu'à ceux définis manuellement.</Accordion>

  <Accordion title="Mémoire et embeddings">
    Le plugin Ollama inclus enregistre un fournisseur d'embeddings de mémoire pour
    la [recherche mémoire](/fr/concepts/memory). Il utilise l'URL de base Ollama configurée
    et la clé API, appelle le point de terminaison actuel `/api/embed` de Ollama, et regroupe
    plusieurs blocs de mémoire en une seule requête `input` lorsque cela est possible.

    | Propriété      | Valeur               |
    | ------------- | ------------------- |
    | Modèle par défaut | `nomic-embed-text`  |
    | Tirage automatique     | Oui — le modèle d'embedding est tiré automatiquement s'il n'est pas présent localement |

    Les embeddings au moment de la requête utilisent des préfixes de récupération pour les modèles qui les exigent ou les recommandent, notamment `nomic-embed-text`, `qwen3-embedding` et `mxbai-embed-large`. Les lots de documents mémoire restent bruts afin que les index existants n'aient pas besoin de migration de format.

    Pour sélectionner Ollama comme fournisseur d'embeddings pour la recherche mémoire :

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: { provider: "ollama" },
        },
      },
    }
    ```

    Pour un hôte d'embedding distant, gardez l'authentification limitée à cet hôte :

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              model: "nomic-embed-text",
              apiKey: "ollama-local",
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configuration du streaming">
    L'intégration OpenClaw de Ollama utilise l'**API native Ollama** (API) (`/api/chat`) par défaut, qui prend entièrement en charge le streaming et l'appel d'outils simultanément. Aucune configuration spéciale n'est nécessaire.

    Pour les requêtes natives `/api/chat`, OpenClaw transmet également directement le contrôle de la réflexion à Ollama : `/think off` et `openclaw agent --thinking off` envoient un `think: false` de niveau supérieur, tandis que `/think low|medium|high` envoient la chaîne d'effort `think` de niveau supérieur correspondante. `/think max` correspond à l'effort natif le plus élevé de Ollama, `think: "high"`.

    <Tip>
    Si vous devez utiliser le point de terminaison compatible OpenAI, consultez la section « Mode compatible OpenAI (hérité) » ci-dessus. Le streaming et l'appel d'outils peuvent ne pas fonctionner simultanément dans ce mode.
    </Tip>

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="WSL2 crash loop (redémarrages répétés)">
    Sur WSL2 avec NVIDIA/CUDA, le programme d'installation officiel Ollama Linux crée une unité systemd `ollama.service` avec `Restart=always`. Si ce service démarre automatiquement et charge un modèle pris en charge par le GPU lors du démarrage de WSL2, Ollama peut épingler la mémoire de l'hôte pendant le chargement du modèle. La récupération de mémoire Hyper-V ne peut pas toujours récupérer ces pages épinglées, donc Windows peut terminer la machine virtuelle WSL2, systemd redémarre Ollama, et la boucle se répète.

    Preuves courantes :

    - redémarrages ou terminaisons WSL2 répétés depuis le côté Windows
    - utilisation élevée du CPU dans `app.slice` ou `ollama.service` peu après le démarrage de WSL2
    - SIGTERM de systemd plutôt qu'un événement OOM-killer Linux

    OpenClaw enregistre un avertissement de démarrage lorsqu'il détecte WSL2, `ollama.service` activé avec `Restart=always`, et des marqueurs CUDA visibles.

    Atténuation :

    ```bash
    sudo systemctl disable ollama
    ```

    Ajoutez ceci à `%USERPROFILE%\.wslconfig` côté Windows, puis exécutez `wsl --shutdown` :

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    Définissez une durée de keep-alive plus courte dans l'environnement du service Ollama, ou démarrez Ollama manuellement uniquement lorsque vous en avez besoin :

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    Voir [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317).

  </Accordion>

  <Accordion title="Ollama non détecté">
    Assurez-vous qu'Ollama est en cours d'exécution et que vous avez défini `OLLAMA_API_KEY` (ou un profil d'authentification), et que vous n'avez **pas** défini une entrée `models.providers.ollama` explicite :

    ```bash
    ollama serve
    ```

    Vérifiez que l'API est accessible :

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="Aucun modèle disponible">
    Si votre modèle n'est pas répertorié, téléchargez le modèle localement ou définissez-le explicitement dans `models.providers.ollama`.

    ```bash
    ollama list  # See what's installed
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # Or another model
    ```

  </Accordion>

  <Accordion title="Connexion refusée">
    Vérifiez qu'Ollama s'exécute sur le bon port :

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>

  <Accordion title="L'hôte distant fonctionne avec curl mais pas avec OpenClaw">
    Vérifiez à partir de la même machine et de l'exécution qui exécute la Gateway :

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    Causes courantes :

    - `baseUrl` pointe vers `localhost`, mais la Gateway s'exécute dans Docker ou sur un autre hôte.
    - L'URL utilise `/v1`, qui sélectionne le comportement compatible OpenAI au lieu du Ollama natif.
    - L'hôte distant a besoin de modifications de pare-feu ou de liaison LAN côté Ollama.
    - Le modèle est présent sur le démon de votre ordinateur portable mais pas sur le démon distant.

  </Accordion>

  <Accordion title="Le modèle génère du JSON d'outil sous forme de texte">
    Cela signifie généralement que le fournisseur utilise le mode compatible OpenAI ou que le modèle ne peut pas gérer les schémas d'outils.

    Privilégiez le mode Ollama natif :

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434",
            api: "ollama",
          },
        },
      },
    }
    ```

    Si un petit modèle local échoue toujours sur les schémas d'outils, définissez `compat.supportsTools: false` sur cette entrée de modèle et testez à nouveau.

  </Accordion>

  <Accordion title="Le modèle local à froid expire">
    Les grands modèles locaux peuvent nécessiter un long premier chargement avant le début du streaming. Gardez le délai d'expiration limité au fournisseur Ollama et demandez optionnellement à Ollama de garder le modèle chargé entre les tours :

    ```json5
    {
      models: {
        providers: {
          ollama: {
            timeoutSeconds: 300,
            models: [
              {
                id: "gemma4:26b",
                name: "gemma4:26b",
                params: { keep_alive: "15m" },
              },
            ],
          },
        },
      },
    }
    ```

    Si l'hôte lui-même est lent à accepter les connexions, `timeoutSeconds` étend également le délai de connexion Undici gardé pour ce fournisseur.

  </Accordion>

  <Accordion title="Le modèle à grand contexte est trop lent ou manque de mémoire">
    De nombreux modèles Ollama annoncent des contextes plus volumineux que ce que votre matériel peut gérer confortablement. Le Ollama natif utilise le contexte d'exécution par défaut de Ollama sauf si vous définissez `params.num_ctx`. Limitez à la fois le budget de OpenClaw et le contexte de requête de Ollama lorsque vous souhaitez une latence prévisible du premier jeton :

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                params: { num_ctx: 32768, thinking: false },
              },
            ],
          },
        },
      },
    }
    ```

    Réduisez d'abord `contextWindow` si OpenClaw envoie trop d'invite. Réduisez `params.num_ctx` si Ollama charge un contexte d'exécution trop volumineux pour la machine. Réduisez `maxTokens` si la génération prend trop de temps.

  </Accordion>
</AccordionGroup>

<Note>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Fournisseurs de modèles" href="/fr/concepts/model-providers" icon="layers">
    Aperçu de tous les fournisseurs, des références de modèles et du comportement de basculement.
  </Card>
  <Card title="Sélection de modèle" href="/fr/concepts/models" icon="brain">
    Comment choisir et configurer les modèles.
  </Card>
  <Card title="Recherche Web Ollama" href="/fr/tools/ollama-search" icon="magnifying-glass">
    Détails complets de la configuration et du comportement de la recherche Web propulsée par Ollama.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration.
  </Card>
</CardGroup>
