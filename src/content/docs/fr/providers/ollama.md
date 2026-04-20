---
summary: "Exécuter OpenClaw avec Ollama (modèles cloud et locaux)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
title: "Ollama"
---

# Ollama

OpenClaw s'intègre à l'Ollama native de API (`/api/chat`) pour les modèles cloud hébergés et les serveurs Ollama locaux/auto-hébergés. Vous pouvez utiliser Ollama selon trois modes : `Cloud + Local` via un hôte Ollama accessible, `Cloud only` contre `https://ollama.com`, ou `Local only` contre un hôte Ollama accessible.

<Warning>**Utilisateurs d'Ollama distant** : N'utilisez pas l'URL compatible `/v1` (`http://host:11434/v1`) avec OpenClaw. Cela empêche l'appel d'outils et les modèles peuvent renvoyer le JSON brut de l'outil en texte clair. Utilisez plutôt l'URL de l'API native Ollama : `baseUrl: "http://host:11434"` (sans `/v1`).</Warning>

## Getting started

Choisissez votre méthode et votre mode de configuration préférés.

<Tabs>
  <Tab title="Onboarding (recommandé)">
    **Idéal pour :** la voie la plus rapide vers une configuration Ollama cloud ou locale fonctionnelle.

    <Steps>
      <Step title="Exécuter l'intégration">
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
      <Step title="Sélectionner un modèle">
        `Cloud only` demande `OLLAMA_API_KEY` et suggère des valeurs par défaut cloud hébergées. `Cloud + Local` et `Local only` demandent une URL de base Ollama, découvrent les modèles disponibles et extraient automatiquement le modèle local sélectionné s'il n'est pas encore disponible. `Cloud + Local` vérifie également si cet hôte Ollama est connecté pour l'accès cloud.
      </Step>
      <Step title="Vérifier que le modèle est disponible">
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

    Spécifiez facultativement une URL de base ou un modèle personnalisé :

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
      <Step title="Tirer un modèle local (local uniquement)">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="Activer Ollama pour OpenClaw">
        Pour `Cloud only`, utilisez votre vrai `OLLAMA_API_KEY`. Pour les configurations sauvegardées par l'hôte, n'importe quelle valeur d'espace réservé fonctionne :

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

        Ou définir la valeur par défaut dans la configuration :

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
    `Cloud + Local` utilise un hôte Ollama accessible comme point de contrôle pour les modèles locaux et cloud. C'est le flux hybride préféré d'Ollama.

    Utilisez **Cloud + Local** lors de la configuration. OpenClaw demande l'URL de base d'Ollama, découvre les modèles locaux depuis cet hôte et vérifie si l'hôte est connecté pour l'accès cloud avec `ollama signin`. Lorsque l'hôte est connecté, OpenClaw suggère également des valeurs par défaut cloud hébergées telles que `kimi-k2.5:cloud`, `minimax-m2.7:cloud` et `glm-5.1:cloud`.

    Si l'hôte n'est pas encore connecté, OpenClaw garde la configuration en local uniquement jusqu'à ce que vous exécutiez `ollama signin`.

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` s'exécute sur l'API hébergée d'Ollama à `https://ollama.com`.

    Utilisez **Cloud only** lors de la configuration. API demande `OLLAMA_API_KEY`, définit `baseUrl: "https://ollama.com"`, et alimente la liste des modèles cloud hébergés. Cette méthode ne nécessite **pas** de serveur OpenClaw local ni `ollama signin`.

  </Tab>

  <Tab title="Local only">
    En mode local uniquement, OpenClaw découvre les modèles à partir de l'instance Ollama configurée. Cette méthode est destinée aux serveurs Ollama locaux ou auto-hébergés.

    OpenClaw suggère actuellement `gemma4` comme valeur par défaut locale.

  </Tab>
</Tabs>

## Découverte de modèles (fournisseur implicite)

Lorsque vous définissez `OLLAMA_API_KEY` (ou un profil d'authentification) et que vous **ne** définissez **pas** `models.providers.ollama`, OpenClaw découvre les modèles à partir de l'instance Ollama locale à `http://127.0.0.1:11434`.

| Comportement              | Détail                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requête de catalogue      | Interroge `/api/tags`                                                                                                                                                                                        |
| Détection des capacités   | Utilise des recherches `/api/show` au meilleur effort pour lire `contextWindow` et détecter les capacités (y compris la vision)                                                                              |
| Modèles de vision         | Les modèles avec une capacité `vision` signalée par `/api/show` sont marqués comme compatibles avec les images (`input: ["text", "image"]`), donc OpenClaw injecte automatiquement les images dans le prompt |
| Détection du raisonnement | Marque `reasoning` avec une heuristique basée sur le nom du modèle (`r1`, `reasoning`, `think`)                                                                                                              |
| Limites de jetons         | Définit `maxTokens` à la limite maximale de jetons par défaut d'Ollama utilisée par OpenClaw                                                                                                                 |
| Coûts                     | Définit tous les coûts sur `0`                                                                                                                                                                               |

Cela évite les entrées de modèle manuelles tout en gardant le catalogue aligné avec l'instance Ollama locale.

```bash
# See what models are available
ollama list
openclaw models list
```

Pour ajouter un nouveau modèle, il suffit de le tirer avec Ollama :

```bash
ollama pull mistral
```

Le nouveau modèle sera découvert automatiquement et disponible à l'utilisation.

<Note>Si vous définissez `models.providers.ollama` explicitement, la découverte automatique est ignorée et vous devez définir les modèles manuellement. Voir la section de configuration explicite ci-dessous.</Note>

## Configuration

<Tabs>
  <Tab title="Basic (implicit discovery)">
    Le chemin d'activation local le plus simple passe par la variable d'environnement :

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    Si `OLLAMA_API_KEY` est définie, vous pouvez omettre `apiKey` dans l'entrée du fournisseur et OpenClaw la remplira pour les vérifications de disponibilité.
    </Tip>

  </Tab>

  <Tab title="Explicit (manual models)">
    Utilisez une configuration explicite lorsque vous souhaitez une configuration cloud hébergée, que Ollama s'exécute sur un autre hôte/port, que vous souhaitez forcer des fenêtres de contexte ou des listes de modèles spécifiques, ou que vous souhaitiez des définitions de modèle entièrement manuelles.

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
          },
        },
      },
    }
    ```

    <Warning>
    N'ajoutez pas `/v1` à l'URL. Le chemin `/v1` utilise le mode compatible OpenAI, où l'appel d'outil n'est pas fiable. Utilisez l'URL de base Ollama sans suffixe de chemin.
    </Warning>

  </Tab>
</Tabs>

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

## Recherche Web Ollama

OpenClaw prend en charge la **Recherche Web Ollama** en tant que fournisseur `web_search` intégré.

| Propriété             | Détail                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Hôte                  | Utilise votre hôte Ollama configuré (`models.providers.ollama.baseUrl` si défini, sinon `http://127.0.0.1:11434`) |
| Auth                  | Sans clé                                                                                                          |
| Configuration requise | Ollama doit être en cours d'exécution et connecté avec `ollama signin`                                            |

Choisissez **Recherche Web Ollama** lors du `openclaw onboard` ou du `openclaw configure --section web`, ou définissez :

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

<Note>Pour les détails complets de la configuration et du comportement, consultez [Recherche Web Ollama](/fr/tools/ollama-search).</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Mode compatible OpenAI hérité">
    <Warning>
    **L'appel d'outils n'est pas fiable en mode compatible OpenAI.** Utilisez ce mode uniquement si vous avez besoin du format OpenAI pour un proxy et ne dépendez pas du comportement natif d'appel d'outils.
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

    Lorsque `api: "openai-completions"` est utilisé avec Ollama, OpenClaw injecte `options.num_ctx` par défaut afin qu'Ollama ne revienne pas silencieusement à une fenêtre de contexte de 4096. Si votre proxy/montant rejette les champs `options` inconnus, désactivez ce comportement :

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

  <Accordion title="Fenêtres de contexte">
    Pour les modèles découverts automatiquement, OpenClaw utilise la fenêtre de contexte signalée par Ollama si elle est disponible, sinon elle revient à la fenêtre de contexte Ollama par défaut utilisée par OpenClaw.

    Vous pouvez remplacer `contextWindow` et `maxTokens` dans la configuration explicite du fournisseur :

    ```json5
    {
      models: {
        providers: {
          ollama: {
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
              }
            ]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="Modèles de raisonnement">
    OpenClaw considère par défaut que les modèles portant des noms tels que `deepseek-r1`, `reasoning` ou `think` sont capables de raisonnement.

    ```bash
    ollama pull deepseek-r1:32b
    ```

    Aucune configuration supplémentaire n'est nécessaire -- OpenClaw les marque automatiquement.

  </Accordion>

<Accordion title="Coûts des modèles">Ollama est gratuit et fonctionne localement, tous les coûts des modèles sont donc fixés à 0 $. Cela s'applique aux modèles découverts automatiquement ainsi qu'aux modèles définis manuellement.</Accordion>

  <Accordion title="Mémoires intégrées">
    Le plugin Ollama inclus enregistre un fournisseur d'intégrations de mémoire pour
    [memory search](/fr/concepts/memory). Il utilise l'URL de base Ollama configurée
    et la clé API.

    | Propriété      | Valeur               |
    | ------------- | ------------------- |
    | Modèle par défaut | `nomic-embed-text`  |
    | Tirage automatique     | Oui — le modèle d'intégration est téléchargé automatiquement s'il n'est pas présent localement |

    Pour sélectionner Ollama comme fournisseur d'intégrations pour la recherche mémoire :

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: { provider: "ollama" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configuration du flux">
    L'intégration OpenClaw de Ollama utilise l'**API native Ollama** (`/api/chat`) par défaut, ce qui prend entièrement en charge le flux et l'appel d'outils simultanément. Aucune configuration spéciale n'est nécessaire.

    <Tip>
    Si vous devez utiliser le point de terminaison compatible API, consultez la section « Mode compatible OpenAI hérité » ci-dessus. Le flux et l'appel d'outils peuvent ne pas fonctionner simultanément dans ce mode.
    </Tip>

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="Ollama non détecté">
    Assurez-vous que Ollama est en cours d'exécution et que vous avez défini `OLLAMA_API_KEY` (ou un profil d'authentification), et que vous n'avez **pas** défini d'entrée `models.providers.ollama` explicite :

    ```bash
    ollama serve
    ```

    Vérifiez que l'API est accessible :

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="Aucun modèle disponible">
    Si votre modèle n'est pas répertorié, tirez-le localement ou définissez-le explicitement dans `models.providers.ollama`.

    ```bash
    ollama list  # See what's installed
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # Or another model
    ```

  </Accordion>

  <Accordion title="Connexion refusée">
    Vérifiez que Ollama s'exécute sur le bon port :

    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>
</AccordionGroup>

<Note>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Fournisseurs de modèles" href="/fr/concepts/model-providers" icon="layers">
    Vue d'ensemble de tous les fournisseurs, références de modèles et comportements de basculement.
  </Card>
  <Card title="Sélection du modèle" href="/fr/concepts/models" icon="brain">
    Comment choisir et configurer les modèles.
  </Card>
  <Card title="Recherche Web Ollama" href="/fr/tools/ollama-search" icon="magnifying-glass">
    Détails complets de la configuration et du comportement pour la recherche Web propulsée par Ollama.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration.
  </Card>
</CardGroup>
