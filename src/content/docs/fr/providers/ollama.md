---
summary: "Exécuter OpenClaw avec Ollama (modèles cloud et locaux)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "Ollama"
---

OpenClaw s'intègre à l'Ollama native de API (`/api/chat`) pour les modèles cloud hébergés et les serveurs Ollama locaux/auto-hébergés. Vous pouvez utiliser Ollama selon trois modes : `Cloud + Local` via un hôte Ollama accessible, `Cloud only` contre `https://ollama.com`, ou `Local only` contre un hôte Ollama accessible.

<Warning>**Utilisateurs distants de Ollama`/v1`** : N'utilisez pas l'URL compatible OpenAI (`http://host:11434/v1`) avec OpenClaw. Cela empêche l'appel d'outils et les modèles peuvent sortir du JSON brut d'outils en tant que texte brut. Utilisez plutôt l'URL de l'Ollama native de API : `baseUrl: "http://host:11434"` (sans `/v1`).</Warning>

La configuration du fournisseur Ollama utilise `baseUrl` comme clé canonique. OpenClaw accepte également `baseURL` pour la compatibilité avec les exemples de style SDK OpenAI, mais les nouvelles configurations devraient privilégier `baseUrl`.

## Règles d'authentification

<AccordionGroup>
  <Accordion title="Hôtes locaux et LAN">
    Les hôtes Ollama locaux et LAN n'ont pas besoin d'un jeton bearer réel. OpenClaw n'utilise le marqueur local `ollama-local` que pour les URL de base Ollama de bouclage, de réseau privé, `.local` et de nom d'hôte nu.
  </Accordion>
  <Accordion title="OllamaHôtes distants et Cloud Ollama"Ollama>
    Les hôtes publics distants et Ollama Cloud (`https://ollama.com`) nécessitent des informations d'identification réelles via `OLLAMA_API_KEY`, un profil d'authentification ou l'`apiKey` du fournisseur.
  </Accordion>
  <Accordion title="Identifiants de fournisseur personnalisés">
    Les identifiants de fournisseur personnalisés qui définissent `api: "ollama"` suivent les mêmes règles. Par exemple, un fournisseur `ollama-remote`Ollama pointant vers un hôte Ollama sur un réseau privé (LAN) peut utiliser `apiKey: "ollama-local"`Ollama et les sous-agents résoudront ce marqueur via le hook du fournisseur Ollama au lieu de le traiter comme une information d'identification manquante. La recherche mémoire peut également définir `agents.defaults.memorySearch.provider`Ollama sur cet identifiant de fournisseur personnalisé afin que les intégrations utilisent le point de terminaison Ollama correspondant.
  </Accordion>
  <Accordion title="Profils d'authentification">
    `auth-profiles.json` stocke les informations d'identification pour un identifiant de fournisseur. Placez les paramètres de point de terminaison (`baseUrl`, `api`, identifiants de modèle, en-têtes, délais d'attente) dans `models.providers.<id>`. Les anciens fichiers plats de profil d'authentification tels que `{ "ollama-windows": { "apiKey": "ollama-local" } }` ne constituent pas un format d'exécution ; exécutez `openclaw doctor --fix` pour les réécrire dans le profil de clé API canonique `ollama-windows:default`API avec une sauvegarde. `baseUrl` dans ce fichier est du bruit de compatibilité et doit être déplacé vers la configuration du fournisseur.
  </Accordion>
  <Accordion title="Memory embedding scope"OllamaOllama>
    Lorsque Ollama est utilisé pour les embeddings de mémoire, l'authentification par porteur est limitée à l'hôte sur lequel elle a été déclarée :

    - Une clé au niveau du fournisseur n'est envoyée qu'à l'hôte Ollama de ce fournisseur.
    - `agents.*.memorySearch.remote.apiKey` n'est envoyé qu'à son hôte d'embedding distant.
    - Une valeur d'env `OLLAMA_API_KEY`Ollama pure est traitée comme la convention Ollama Cloud, elle n'est pas envoyée aux hôtes locaux ou auto-hébergés par défaut.

  </Accordion>
</AccordionGroup>

## Getting started

Choisissez votre méthode et votre mode de configuration préférés.

<Tabs>
  <Tab title="Onboarding (recommandé)"Ollama>
    **Idéal pour :** le chemin le plus rapide vers une configuration cloud ou locale Ollama fonctionnelle.

    <Steps>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard
        ```Ollama

        Sélectionnez **Ollama** dans la liste des providers.
      </Step>
      <Step title="Choisissez votre mode"OllamaOllama>
        - **Cloud + Local** — hôte Ollama local plus modèles cloud acheminés via cet hôte
        - **Cloud uniquement** — modèles Ollama hébergés via `https://ollama.com`
        - **Local uniquement** — modèles locaux uniquement

      </Step>
      <Step title="Sélectionnez un modèle">
        `Cloud only` demande `OLLAMA_API_KEY` et suggère des valeurs par défaut cloud hébergées. `Cloud + Local` et `Local only`OllamaOllama demandent une URL de base Ollama, découvrent les modèles disponibles et téléchargent automatiquement le modèle local sélectionné s'il n'est pas encore disponible. Lorsque Ollama signale un tag `:latest` installé tel que `gemma4:latest`, la configuration affiche ce modèle installé une seule fois au lieu d'afficher à la fois `gemma4` et `gemma4:latest` ou de télécharger à nouveau l'alias nu. `Cloud + Local`Ollama vérifie également si cet hôte Ollama est connecté pour l'accès cloud.
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
    **Idéal pour :** un contrôle total sur la configuration cloud ou locale.

    <Steps>
      <Step title="Choisir cloud ou local"Ollama>
        - **Cloud + Local** : installez Ollama, connectez-vous avec `ollama signin`, et acheminez les requêtes cloud via cet hôte
        - **Cloud uniquement** : utilisez `https://ollama.com` avec un `OLLAMA_API_KEY`Ollama
        - **Local uniquement** : installez Ollama depuis [ollama.com/download](https://ollama.com/download)

      </Step>
      <Step title="Tirer un model local (local uniquement)">
        ```bash
        ollama pull gemma4
        # or
        ollama pull gpt-oss:20b
        # or
        ollama pull llama3.3
        ```
      </Step>
      <Step title="OllamaOpenClawActiver Ollama pour OpenClaw">
        Pour `Cloud only`, utilisez votre véritable `OLLAMA_API_KEY`. Pour les configurations soutenues par un hôte, n'importe quelle valeur d'espace réservé fonctionne :

        ```bash
        # Cloud
        export OLLAMA_API_KEY="your-ollama-api-key"

        # Local-only
        export OLLAMA_API_KEY="ollama-local"

        # Or configure in your config file
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="Inspecter et définir votre model">
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
    `Cloud + Local`OllamaOllamaOpenClawOllama utilise un hôte Ollama joignable comme point de contrôle pour les modèles locaux et cloud. C'est le flux hybride préféré d'Ollama.

    Utilisez **Cloud + Local** lors de la configuration. OpenClaw demande l'URL de base d'Ollama, découvre les modèles locaux depuis cet hôte, et vérifie si l'hôte est connecté pour l'accès cloud avec `ollama signin`OpenClaw. Lorsque l'hôte est connecté, OpenClaw suggère également des valeurs par défaut cloud hébergées telles que `kimi-k2.5:cloud`, `minimax-m2.7:cloud` et `glm-5.1:cloud`OpenClaw.

    Si l'hôte n'est pas encore connecté, OpenClaw conserve la configuration en local uniquement jusqu'à ce que vous exécutiez `ollama signin`.

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` s'exécute sur l'API hébergée d'OllamaAPI à `https://ollama.com`.

    Utilisez **Cloud only** lors de la configuration. OpenClaw demande `OLLAMA_API_KEY`, définit `baseUrl: "https://ollama.com"` et initialise la liste des modèles cloud hébergés. Ce chemin ne nécessite **pas** de serveur Ollama local ou `ollama signin`.

    La liste des modèles cloud affichée pendant `openclaw onboard` est remplie en temps réel à partir de `https://ollama.com/api/tags`, limitée à 500 entrées, de sorte que le sélecteur reflète le catalogue hébergé actuel plutôt qu'une initialisation statique. Si `ollama.com` est inaccessible ou ne renvoie aucun modèle au moment de la configuration, OpenClaw revient aux suggestions précédentes en dur afin que l'intégration puisse toujours être terminée.

  </Tab>

  <Tab title="Local only">
    En mode local uniquement, OpenClaw découvre les modèles à partir de l'instance Ollama configurée. Ce chemin est destiné aux serveurs Ollama locaux ou auto-hébergés.

    OpenClaw suggère actuellement `gemma4` comme valeur par défaut locale.

  </Tab>
</Tabs>

## Découverte de modèles (fournisseur implicite)

Lorsque vous définissez `OLLAMA_API_KEY` (ou un profil d'authentification) et que vous **ne** définissez **pas** `models.providers.ollama` ou un autre fournisseur distant personnalisé avec `api: "ollama"`, OpenClaw découvre les modèles à partir de l'instance locale Ollama à `http://127.0.0.1:11434`.

| Comportement              | Détail                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requête de catalogue      | Interroge `/api/tags`                                                                                                                                                                                        |
| Détection des capacités   | Utilise des recherches `/api/show` au meilleur effort pour lire `contextWindow`, les paramètres étendus du `num_ctx` Modelfile et les capacités, notamment la vision/outils                                  |
| Modèles de vision         | Les modèles avec une capacité `vision` signalée par `/api/show` sont marqués comme compatibles avec les images (`input: ["text", "image"]`), donc OpenClaw injecte automatiquement les images dans le prompt |
| Détection du raisonnement | Utilise les capacités `/api/show` lorsqu'elles sont disponibles, y compris `thinking`; revient à une heuristique basée sur le nom du modèle (`r1`, `reasoning`, `think`) lorsque Ollama omet les capacités   |
| Limites de jetons         | Définit `maxTokens` à la limite maximale de jetons par défaut de Ollama utilisée par OpenClaw                                                                                                                |
| Coûts                     | Définit tous les coûts à `0`                                                                                                                                                                                 |

Cela évite les entrées de modèle manuelles tout en gardant le catalogue aligné avec l'instance locale Ollama. Vous pouvez utiliser une référence complète telle que `ollama/<pulled-model>:latest` dans `infer model run` local ; OpenClaw résout ce modèle installé à partir du catalogue en direct de Ollama sans nécessiter d'entrée `models.json` écrite à la main.

Pour les hôtes Ollama connectés, certains modèles `:cloud` peuvent être utilisables via `/api/chat`
et `/api/show` avant qu'ils n'apparaissent dans `/api/tags`. Lorsque vous sélectionnez explicitement une
référence complète `ollama/<model>:cloud`, OpenClaw valide ce modèle manquant exact avec
`/api/show` et l'ajoute au catalogue d'exécution uniquement si Ollama confirme les métadonnées du
modèle. Les erreurs de frappe échouent toujours en tant que modèles inconnus au lieu d'être créés automatiquement.

```bash
# See what models are available
ollama list
openclaw models list
```

Pour un test de fumée étroit de génération de texte qui évite la surface complète des outils de l'agent,
utilisez `infer model run` local avec une référence complète de modèle Ollama :

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

Ce chemin utilise toujours le fournisseur configuré d'OpenClaw, l'authentification et le transport natif d'Ollama, mais il ne démarre pas de tour d'agent de discussion ni ne charge le contexte MCP/outil. Si cela réussit alors que les réponses normales de l'agent échouent, dépannez ensuite la capacité de prompt/outil de l'agent du modèle.

Pour un test de fumée étroit sur un modèle de vision sur le même chemin allégé, ajoutez un ou plusieurs fichiers image à `infer model run`. Cela envoie le prompt et l'image directement au modèle de vision Ollama sélectionné sans charger les outils de discussion, la mémoire ni le contexte de session précédent :

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

`model run --file` accepte les fichiers détectés comme `image/*`, y compris les entrées PNG, JPEG et WebP courantes. Les fichiers non-image sont rejetés avant qu'Ollama ne soit appelé. Pour la reconnaissance vocale, utilisez plutôt `openclaw infer audio transcribe`.

Lorsque vous basculez une conversation avec `/model ollama/<model>`, OpenClaw considère cela comme une sélection exacte de l'utilisateur. Si le Ollama `baseUrl` configuré est inaccessible, la réponse suivante échoue avec l'erreur du fournisseur au lieu de répondre silencieusement avec un autre modèle de repli configuré.

Les tâches cron isolées effectuent une vérification de sécurité locale supplémentaire avant de démarrer le tour de l'agent. Si le modèle sélectionné résout vers un fournisseur Ollama local, de réseau privé ou `.local` et que `/api/tags` est inaccessible, OpenClaw enregistre cette exécution cron comme `skipped` avec le `ollama/<model>` sélectionné dans le texte d'erreur. La pré-vérification du point de terminaison est mise en cache pendant 5 minutes, plusieurs tâches cron pointant vers le même démon Ollama arrêté ne lancent donc pas toutes des requêtes de modèle échouantes.

Vérifiez en direct le chemin de texte local, le chemin de flux natif et les intégrations par rapport à Ollama local avec :

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

Pour ajouter un nouveau modèle, il suffit de le tirer avec Ollama :

```bash
ollama pull mistral
```

Le nouveau modèle sera découvert automatiquement et disponible à l'utilisation.

<Note>
  Si vous définissez `models.providers.ollama` explicitement, ou si vous configurez un fournisseur distant personnalisé tel que `models.providers.ollama-cloud` avec `api: "ollama"`, la découverte automatique est ignorée et vous devez définir les modèles manuellement. Les fournisseurs personnalisés de bouclage tels que `http://127.0.0.2:11434` sont toujours traités comme locaux. Voir la section de
  configuration explicite ci-dessous.
</Note>

## Vision et description d'images

Le plugin Ollama intégré enregistre Ollama en tant que fournisseur de compréhension de média capable de traiter des images. Cela permet à OpenClaw de router les demandes explicites de description d'images et les modèles d'image configurés par défaut via des modèles de vision Ollama locaux ou hébergés.

Pour la vision locale, téléchargez un modèle qui prend en charge les images :

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
```

Vérifiez ensuite avec le CLI d'inférence :

```bash
openclaw infer image describe \
  --file ./photo.jpg \
  --model ollama/qwen2.5vl:7b \
  --json
```

`--model` doit être une référence `<provider/model>` complète. Lorsqu'elle est définie, `openclaw infer image describe` exécute ce modèle directement au lieu d'ignorer la description car le modèle prend en charge la vision native.

Utilisez `infer image describe` lorsque vous souhaitez le flux de fournisseur de compréhension d'image de OpenClaw, le `agents.defaults.imageModel` configuré, et la forme de sortie de description d'image. Utilisez `infer model run --file` lorsque vous souhaitez une sonde de modèle multimodale brute avec un prompt personnalisé et une ou plusieurs images.

Pour faire de Ollama le modèle de compréhension d'image par défaut pour les médias entrants, configurez `agents.defaults.imageModel` :

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

Préférez la référence complète `ollama/<model>`. Si le même modèle est répertorié sous `models.providers.ollama.models` avec `input: ["text", "image"]` et qu'aucun autre fournisseur d'image configuré n'expose cet ID de modèle nu, OpenClaw normalise également une référence `imageModel` nue telle que `qwen2.5vl:7b` vers `ollama/qwen2.5vl:7b`. Si plus d'un fournisseur d'image configuré possède le même ID nu, utilisez explicitement le préfixe du fournisseur.

Les modèles de vision locaux lents peuvent nécessiter un délai d'expiration de compréhension d'image plus long que les modèles cloud. Ils peuvent également planter ou s'arrêter lorsque Ollama tente d'allouer le contexte de vision complet annoncé sur du matériel contraint. Définissez un délai d'expiration de capacité et plafonnez `num_ctx` dans l'entrée du modèle lorsque vous avez uniquement besoin d'un tour de description d'image normale :

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

Ce délai d'expiration s'applique à la compréhension d'image entrante et à l'outil `image` explicite que l'agent peut appeler au cours d'un tour. Le `models.providers.ollama.timeoutSeconds` au niveau du fournisseur contrôle toujours la garde de requête HTTP Ollama sous-jacente pour les appels de modèle normaux.

Vérifiez en direct l'outil d'image explicite par rapport au Ollama local avec :

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

OpenClaw rejette les demandes de description d'image pour les modèles qui ne sont pas marqués comme prenant en charge l'image. Avec la découverte implicite, OpenClaw lit cela auprès de Ollama lorsque `/api/show` signale une capacité de vision.

## Configuration

<Tabs>
  <Tab title="Basic (implicit discovery)">
    Le chemin d'activation local le plus simple se fait via une variable d'environnement :

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    Si `OLLAMA_API_KEY` est défini, vous pouvez omettre `apiKey` dans l'entrée du fournisseur et OpenClaw le remplira pour les vérifications de disponibilité.
    </Tip>

  </Tab>

  <Tab title="Explicit (manual models)">
    Utilisez une configuration explicite lorsque vous souhaitez une configuration cloud hébergée, que Ollama s'exécute sur un autre hôte/port, que vous souhaitez forcer des fenêtres de contexte ou des listes de modèles spécifiques, ou que vous souhaitez des définitions de modèle entièrement manuelles.

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

  <Tab title="URL de base personnalisée">
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
    N'ajoutez pas `/v1` à l'URL. Le chemin `/v1` utilise le mode compatible OpenAI, où l'appel d'outils n'est pas fiable. Utilisez l'URL de base Ollama sans suffixe de chemin.
    </Warning>

  </Tab>
</Tabs>

## Recettes courantes

Utilisez ces éléments comme points de départ et remplacez les ID de modèle par les noms exacts provenant de `ollama list` ou `openclaw models list --provider ollama`.

<AccordionGroup>
  <Accordion title="Modèle local avec découverte automatique">
    Utilisez cette option lorsque Ollama s'exécute sur la même machine que le Gateway et que vous souhaitez que OpenClaw découvre automatiquement les modèles installés.

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    Cette approche maintient la configuration minimale. N'ajoutez pas de bloc `models.providers.ollama` sauf si vous souhaitez définir les modèles manuellement.

  </Accordion>

  <Accordion title="Hôte Ollama LAN avec modèles manuels">
    Utilisez les URL natives Ollama pour les hôtes LAN. N'ajoutez pas `/v1`.

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
    Utilisez cette option lorsque vous n'exécutez pas de démon local et que vous souhaitez utiliser directement des modèles Ollama hébergés.

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

  <Accordion title="Cloud plus local through a signed-in daemon"Ollama>
    Utilisez ceci lorsqu'un démon Ollama local ou sur un LAN est connecté avec `ollama signin` et doit servir à la fois des modèles locaux et des modèles `:cloud`.

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

  <Accordion title="OllamaMultiple Ollama hosts"Ollama>
    Utilisez des IDs de fournisseur personnalisés lorsque vous avez plus d'un serveur Ollama. Chaque fournisseur obtient son propre hôte, modèles, auth, délai d'attente et références de modèles.

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
    ```OpenClaw

    Lorsque OpenClaw envoie la requête, le préfixe du fournisseur actif est supprimé afin que `ollama-large/qwen3.5:27b`Ollama atteigne Ollama sous la forme `qwen3.5:27b`.

  </Accordion>

  <Accordion title="Lean local model profile">
    Certains modèles locaux peuvent répondre à des instructions simples mais ont des difficultés avec la surface complète des outils de l'agent. Commencez par limiter les outils et le contexte avant de modifier les paramètres d'exécution globaux.

    ```json5
    {
      agents: {
        list: [
          {
            id: "local",
            experimental: {
              localModelLean: true,
            },
            model: { primary: "ollama/gemma4" },
          },
        ],
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

    Utilisez `compat.supportsTools: false` uniquement lorsque le modèle ou le serveur échoue de manière fiable sur les schémas d'outils. Cela échange la capacité de l'agent contre la stabilité.
    `localModelLean` supprime les outils de navigateur, cron et de message de la surface de l'agent, mais cela ne modifie pas le contexte d'exécution ou le mode de réflexion d'Ollama. Associez-le à des `params.num_ctx` et `params.thinking: false` explicites pour les petits modèles de réflexion de type Qwen qui bouclent ou dépensent leur budget de réponse en raisonnement caché.

  </Accordion>
</AccordionGroup>

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

Les IDs de fournisseur Ollama personnalisés sont également pris en charge. Lorsqu'une référence de modèle utilise le préfixe du fournisseur actif, tel que Ollama`ollama-spark/qwen3:32b`OpenClawOllama, OpenClaw supprime uniquement ce
préfixe avant d'appeler Ollama afin que le serveur reçoive `qwen3:32b`.

Pour les modèles locaux lents, privilégiez le réglage des requêtes avec portée fournisseur avant d'augmenter
le délai d'expiration global de l'exécution de l'agent :

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

`timeoutSeconds` s'applique à la requête HTTP du modèle, y compris la configuration de la connexion,
les en-têtes, la diffusion du corps (body streaming) et l'interruption totale de la récupération sécurisée (guarded-fetch). `params.keep_alive`Ollama
est transmis à Ollama en tant que `keep_alive` de premier niveau sur les requêtes `/api/chat` natives ;
définissez-le par modèle lorsque le temps de chargement du premier tour est le goulot d'étranglement.

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

Pour les hôtes distants, remplacez `127.0.0.1` par l'hôte utilisé dans `baseUrl`. Si `curl`OpenClawGateway fonctionne mais pas OpenClaw, vérifiez si le Gateway s'exécute sur une machine, un conteneur ou un compte de service différent.

## Recherche Web Ollama

OpenClaw prend en charge la **Recherche Web Ollama** en tant que fournisseur OpenClawOllama`web_search` intégré.

| Propriété | Détail                                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hôte      | Utilise votre hôte Ollama configuré (Ollama`models.providers.ollama.baseUrl` s'il est défini, sinon `http://127.0.0.1:11434`) ; `https://ollama.com`API utilise l'API hébergée directement                              |
| Auth      | Sans clé pour les hôtes Ollama locaux connectés ; Ollama`OLLAMA_API_KEY` ou authentification de fournisseur configurée pour la recherche `https://ollama.com` directe ou les hôtes protégés par authentification        |
| Prérequis | Les hôtes locaux/auto-hébergés doivent être en cours d'exécution et connectés avec `ollama signin` ; la recherche hébergée directe nécessite `baseUrl: "https://ollama.com"`OllamaAPI ainsi qu'une vraie clé API Ollama |

Choisissez **Recherche Web Ollama** lors de Ollama`openclaw onboard` ou `openclaw configure --section web`, ou définissez :

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

Pour un démon local connecté, OpenClaw utilise le proxy OpenClaw`/api/experimental/web_search` du démon. Pour `https://ollama.com`, il appelle directement le point de terminaison `/api/web_search` hébergé.

<Note>Pour les détails complets sur la configuration et le comportement, consultez [Ollama Web Search](Ollama/en/tools/ollama-search).</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="OpenAIMode compatible OpenAI hérité"OpenAIOpenAIOpenAIOpenAI>
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

    Lorsque `api: "openai-completions"`OllamaOpenClaw est utilisé avec Ollama, OpenClaw injecte `options.num_ctx`Ollama par défaut afin qu'Ollama ne revienne pas silencieusement à une fenêtre de contexte de 4096. Si votre proxy ou votre amont rejette les champs `options` inconnus, désactivez ce comportement :

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
    Pour les modèles découverts automatiquement, OpenClaw utilise la fenêtre de contexte signalée par Ollama si elle est disponible, y compris les valeurs `PARAMETER num_ctx` plus élevées des Modelfiles personnalisés. Sinon, elle revient à la fenêtre de contexte par défaut de Ollama utilisée par OpenClaw.

    Vous pouvez définir des valeurs par défaut au niveau du fournisseur pour `contextWindow`, `contextTokens` et `maxTokens` pour chaque modèle sous ce fournisseur Ollama, puis les remplacer par modèle si nécessaire. `contextWindow` est le budget de prompt et de compactage de OpenClaw. Les requêtes natives Ollama laissent `options.num_ctx` non défini, sauf si vous configurez explicitement `params.num_ctx`, afin que Ollama puisse appliquer sa propre valeur par défaut basée sur le modèle, `OLLAMA_CONTEXT_LENGTH` ou la VRAM. Pour plafonner ou forcer le contexte d'exécution par requête de Ollama sans reconstruire un Modelfile, définissez `params.num_ctx` ; les valeurs non valides, nulles, négatives et non finies sont ignorées. Si vous avez mis à jour une ancienne configuration qui n'utilisait que `contextWindow` ou `maxTokens` pour forcer un contexte de requête natif Ollama, exécutez `openclaw doctor --fix` pour copier ces budgets explicites de fournisseur ou de modèle dans `params.num_ctx`. L'adaptateur OpenAI compatible Ollama injecte toujours `options.num_ctx` par défaut à partir du `params.num_ctx` configuré ou du `contextWindow` ; désactivez-le avec `injectNumCtxForOpenAICompat: false` si votre amont rejette `options`.

    Les entrées de modèle natives Ollama acceptent également les options d'exécution courantes de Ollama sous `params`, y compris `temperature`, `top_p`, `top_k`, `min_p`, `num_predict`, `stop`, `repeat_penalty`, `num_batch`, `num_thread` et `use_mmap`. OpenClaw ne transmet que les clés de requête Ollama, de sorte que les paramètres d'exécution de OpenClaw tels que `streaming` ne fuient pas vers Ollama. Utilisez `params.think` ou `params.thinking` pour envoyer des `think` Ollama de niveau supérieur ; `false` désactive la réflexion au niveau de l'API pour les modèles de réflexion de style Qwen.

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

  <Accordion title="Contrôle de la pensée">
    Pour les modèles natifs Ollama, OpenClaw transmet le contrôle de la pensée comme Ollama l'attend : `think` de premier niveau, et non `options.think`. Les modèles découverts automatiquement dont la réponse `/api/show` inclut la capacité `thinking` exposent `/think low`, `/think medium`, `/think high` et `/think max` ; les modèles non réflexifs n'exposent que `/think off`.

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

    Les paramètres `params.think` ou `params.thinking` par modèle peuvent désactiver ou forcer la réflexion via l'API OllamaAPI pour un modèle spécifique configuré. OpenClaw préserve ces paramètres explicites du modèle lorsque l'exécution active ne possède que la valeur par défaut implicite `off` ; les commandes d'exécution hors ligne telles que `/think medium` remplacent toujours l'exécution active.

  </Accordion>

  <Accordion title="Modèles de raisonnement">
    OpenClaw traite les modèles portant des noms tels que `deepseek-r1`, `reasoning` ou `think` comme étant capables de raisonnement par défaut.

    ```bash
    ollama pull deepseek-r1:32b
    ```

    Aucune configuration supplémentaire n'est nécessaire. OpenClaw les marque automatiquement.

  </Accordion>

<Accordion title="Coûts des modèles">Ollama est gratuit et fonctionne localement, donc tous les coûts de modèle sont définis à 0 $. Cela s'applique aux modèles découverts automatiquement ainsi qu'à ceux définis manuellement.</Accordion>

  <Accordion title="Intégrations de mémoire">
    Le plugin Ollama inclus enregistre un fournisseur d'intégrations de mémoire pour
    la [recherche mémoire](/fr/concepts/memory). Il utilise l'URL de base configurée pour Ollama
    et la clé d'API, appelle le point de terminaison actuel `/api/embed` de Ollama et regroupe
    plusieurs blocs de mémoire en une seule requête `input` lorsque cela est possible.

    | Propriété      | Valeur               |
    | ------------- | ------------------- |
    | Modèle par défaut | `nomic-embed-text`  |
    | Tirage automatique     | Oui — le modèle d'intégration est tiré automatiquement s'il n'est pas présent localement |

    Les intégrations au moment de la requête utilisent des préfixes de récupération pour les modèles qui les exigent ou les recommandent, notamment `nomic-embed-text`, `qwen3-embedding` et `mxbai-embed-large`. Les lots de documents mémoire restent bruts pour que les index existants ne nécessitent pas de migration de format.

    Pour sélectionner Ollama comme fournisseur d'intégrations pour la recherche mémoire :

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            remote: {
              // Default for Ollama. Raise on larger hosts if reindexing is too slow.
              nonBatchConcurrency: 1,
            },
          },
        },
      },
    }
    ```

    Pour un hôte d'intégration distant, gardez l'authentification limitée à cet hôte :

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            model: "nomic-embed-text",
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              apiKey: "ollama-local",
              nonBatchConcurrency: 2,
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Configuration du flux">
    L'intégration d'OpenClaw avec Ollama utilise l'**API native OllamaAPI** (`/api/chat`) par défaut, qui prend entièrement en charge le flux et l'appel d'outils simultanément. Aucune configuration spéciale n'est nécessaire.

    Pour les requêtes `/api/chat` natives, OpenClaw transmet également directement le contrôle de la réflexion à Ollama : `/think off` et `openclaw agent --thinking off` envoient un `think: false` de niveau supérieur, sauf si une valeur explicite de `params.think`/`params.thinking` du modèle est configurée, tandis que `/think low|medium|high` envoient la chaîne d'effort `think` de niveau supérieur correspondante. `/think max` correspond à l'effort natif le plus élevé de Ollama, `think: "high"`.

    <Tip>
    Si vous devez utiliser le point de terminaison compatible OpenAI, consultez la section « Mode compatible OpenAI hérité » ci-dessus. Le flux et l'appel d'outils peuvent ne pas fonctionner simultanément dans ce mode.
    </Tip>

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="WSL2Boucle de crash WSL2 (redémarrages répétés)"WSL2OllamaLinux>
    Sur WSL2 avec NVIDIA/CUDA, le programme d'installation Linux officiel d'Ollama crée une unité `ollama.service` systemd avec `Restart=always`WSL2OllamaWindowsWSL2OllamaWSL2Windows. Si ce service démarre automatiquement et charge un modèle pris en charge par le GPU lors du démarrage de WSL2, Ollama peut épingler la mémoire de l'hôte pendant le chargement du modèle. La récupération de mémoire Hyper-V ne peut pas toujours récupérer ces pages épinglées, ce qui fait que Windows peut arrêter la machine virtuelle WSL2, systemd redémarre Ollama, et la boucle se répète.

    Preuves courantes :

    - redémarrages WSL2 répétés ou arrêts provenant du côté Windows
    - utilisation élevée du CPU dans `app.slice` ou `ollama.service`WSL2LinuxOpenClawWSL2 peu après le démarrage de WSL2
    - SIGTERM de systemd plutôt qu'un événement OOM-killer de Linux

    OpenClaw enregistre un avertissement au démarrage lorsqu'il détecte WSL2, `ollama.service` activé avec `Restart=always`, et des marqueurs CUDA visibles.

    Atténuation :

    ```bash
    sudo systemctl disable ollama
    ```

    Ajoutez ceci à `%USERPROFILE%\.wslconfig`Windows du côté Windows, puis exécutez `wsl --shutdown` :

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```OllamaOllama

    Définissez une durée de conservation plus courte dans l'environnement du service Ollama, ou démarrez Ollama manuellement uniquement lorsque vous en avez besoin :

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    Voir [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317).

  </Accordion>

  <Accordion title="OllamaOllama non détecté"Ollama>
    Assurez-vous qu'Ollama est en cours d'exécution et que vous avez défini `OLLAMA_API_KEY` (ou un profil d'authentification), et que vous n'avez **pas** défini d'entrée explicite `models.providers.ollama` :

    ```bash
    ollama serve
    ```API

    Vérifiez que l'API est accessible :

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="Aucun modèle disponible">
    Si votre modèle n'est pas répertorié, tirez (pull) le modèle localement ou définissez-le explicitement dans `models.providers.ollama`.

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

  <Accordion title="L'hôte distant fonctionne avec curl mais pas avec OpenClaw">
    Vérifiez depuis la même machine et le même runtime qui exécutent la Gateway :

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    Causes courantes :

    - `baseUrl` pointe vers `localhost`, mais la Gateway s'exécute dans Docker ou sur un autre hôte.
    - L'URL utilise `/v1`, qui sélectionne le comportement compatible OpenAI au lieu du mode natif Ollama.
    - L'hôte distant a besoin de modifications de pare-feu ou de liaison LAN du côté de Ollama.
    - Le modèle est présent sur le démon de votre ordinateur portable mais pas sur le démon distant.

  </Accordion>

  <Accordion title="Le modèle renvoie le JSON de l'outil sous forme de texte">
    Cela signifie généralement que le provider utilise le mode compatible OpenAI ou que le modèle ne peut pas gérer les schémas d'outils.

    Préférez le mode natif Ollama :

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

  <Accordion title="Kimi ou GLM renvoie des symboles illisibles">
    Les réponses hébergées Kimi/GLM qui sont de longues suites de symboles non linguistiques sont traitées comme une sortie de provider ayant échoué au lieu d'une réponse d'assistant réussie. Cela permet à la nouvelle tentative, au repli (fallback) ou à la gestion des erreurs normaux de prendre le relais sans persister le texte corrompu dans la session.

    Si cela se produit de manière répétée, capturez le nom brut du modèle, le fichier de session actuel et indiquez si l'exécution utilisait `Cloud + Local` ou `Cloud only`, puis essayez une nouvelle session et un modèle de repli :

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="Le modèle local à froid expire">
    Les grands modèles locaux peuvent nécessiter un long premier chargement avant le début du streaming. Gardez le délai d'attente limité au fournisseur Ollama et demandez éventuellement à Ollama de garder le modèle chargé entre les tours :

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
    De nombreux modèles Ollama annoncent des contextes plus importants que ce que votre matériel peut gérer confortablement. Ollama natif utilise le contexte d'exécution par défaut de Ollama, sauf si vous définissez `params.num_ctx`. Limitez à la fois le budget de OpenClaw et le contexte de requête de Ollama lorsque vous souhaitez une latence prévisible du premier jeton :

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

    Réduisez d'abord `contextWindow` si OpenClaw envoie trop d'invite. Réduisez `params.num_ctx` si Ollama charge un contexte d'exécution trop volumineux pour la machine. Réduisez `maxTokens` si la génération dure trop longtemps.

  </Accordion>
</AccordionGroup>

<Note>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Model providers" href="/fr/concepts/model-providers" icon="layers">
    Vue d'ensemble de tous les fournisseurs, des références de models et du comportement de basculement.
  </Card>
  <Card title="Model selection" href="/fr/concepts/models" icon="brain">
    Comment choisir et configurer des models.
  </Card>
  <Card title="OllamaOllama Web Search" href="/fr/tools/ollama-search" icon="magnifying-glass" Ollama>
    Détails complets de la configuration et du comportement pour la recherche Web propulsée par Ollama.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration.
  </Card>
</CardGroup>
