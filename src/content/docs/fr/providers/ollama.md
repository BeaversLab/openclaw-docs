---
summary: "OpenClawOllamaExécuter OpenClaw avec Ollama (modèles cloud et locaux)"
read_when:
  - You want to run OpenClaw with cloud or local models via Ollama
  - You need Ollama setup and configuration guidance
  - You want Ollama vision models for image understanding
title: "OllamaOllama"
---

OpenClaw s'intègre à l'API native d'Ollama (OpenClawOllamaAPI`/api/chat`OllamaOllama) pour les modèles cloud hébergés et les serveurs Ollama locaux/auto-hébergés. Vous pouvez utiliser Ollama selon trois modes : `Cloud + Local`Ollama via un hôte Ollama accessible, `Cloud only` contre `https://ollama.com`, ou `Local only`Ollama contre un hôte Ollama accessible.

<Warning>**Utilisateurs d'Ollama distant** : N'utilisez pas l'URL compatible OpenAI (Ollama`/v1`OpenAI) (`http://host:11434/v1`OpenClawOllamaAPI) avec OpenClaw. Cela empêche l'appel d'outils et les modèles peuvent renvoyer du JSON brut d'outils sous forme de texte brut. Utilisez plutôt l'URL de l'API native d'Ollama : `baseUrl: "http://host:11434"` (sans `/v1`).</Warning>

La configuration du fournisseur Ollama utilise Ollama`baseUrl`OpenClaw comme clé canonique. OpenClaw accepte également `baseURL`OpenAI pour la compatibilité avec les exemples de style SDK OpenAI, mais les nouvelles configurations devraient préférer `baseUrl`.

## Règles d'authentification

<AccordionGroup>
  <Accordion title="Local and LAN hosts"OllamaOpenClaw>
    Les hôtes Ollama locaux et LAN n'ont pas besoin d'un jeton de support réel. OpenClaw utilise le marqueur local `ollama-local` uniquement pour les URL de base Ollama de bouclage, de réseau privé, `.local`Ollama et de nom d'hôte nu.
  </Accordion>
  <Accordion title="OllamaHôtes distants et Ollama Cloud"Ollama>
    Les hôtes publics distants et Ollama Cloud (`https://ollama.com`) nécessitent un identifiant réel via `OLLAMA_API_KEY`, un profil d'authentification ou le `apiKey` du fournisseur.
  </Accordion>
  <Accordion title="ID de fournisseur personnalisés">
    Les ID de fournisseur personnalisés qui définissent `api: "ollama"` suivent les mêmes règles. Par exemple, un fournisseur `ollama-remote`Ollama pointant vers un hôte Ollama sur un LAN privé peut utiliser `apiKey: "ollama-local"`Ollama et les sous-agents résoudront ce marqueur via le hook du fournisseur Ollama au lieu de le traiter comme un identifiant manquant. La recherche mémoire peut également définir `agents.defaults.memorySearch.provider`Ollama sur cet ID de fournisseur personnalisé pour que les incorporations utilisent le point de terminaison Ollama correspondant.
  </Accordion>
  <Accordion title="Profils d'authentification">
    `auth-profiles.json` stocke l'identifiant pour un ID de fournisseur. Placez les paramètres de point de terminaison (`baseUrl`, `api`, ID de modèle, en-têtes, délais d'attente) dans `models.providers.<id>`. Les anciens fichiers de profil d'authentification plats tels que `{ "ollama-windows": { "apiKey": "ollama-local" } }` ne constituent pas un format d'exécution ; exécutez `openclaw doctor --fix` pour les réécrire dans le profil de clé API canonique `ollama-windows:default`API avec une sauvegarde. `baseUrl` dans ce fichier est du bruit de compatibilité et doit être déplacé vers la configuration du fournisseur.
  </Accordion>
  <Accordion title="Portée de l'incorporation de mémoire">
    Lorsque Ollama est utilisé pour les incorporations de mémoire, l'authentification par porteur est limitée à l'hôte où elle a été déclarée :

    - Une clé au niveau du fournisseur n'est envoyée qu'à l'hôte Ollama de ce fournisseur.
    - `agents.*.memorySearch.remote.apiKey` est envoyé uniquement à son hôte d'incorporation distant.
    - Une valeur d'environnement `OLLAMA_API_KEY` pure est traitée comme la convention Ollama Cloud, et n'est pas envoyée aux hôtes locaux ou auto-hébergés par défaut.

  </Accordion>
</AccordionGroup>

## Getting started

Choisissez votre méthode et votre mode de configuration préférés.

<Tabs>
  <Tab title="Onboarding (recommandé)">
    **Idéal pour :** la méthode la plus rapide pour obtenir une configuration cloud ou locale fonctionnelle de Ollama.

    <Steps>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard
        ```

        Sélectionnez **Ollama** dans la liste des providers.
      </Step>
      <Step title="Choisissez votre mode">
        - **Cloud + Local** — hôte local Ollama plus modèles cloud routés via cet hôte
        - **Cloud uniquement** — modèles hébergés Ollama via `https://ollama.com`
        - **Local uniquement** — modèles locaux uniquement

      </Step>
      <Step title="Sélectionner un modèle">
        `Cloud only` demande `OLLAMA_API_KEY` et suggère des valeurs par défaut hébergées dans le cloud. `Cloud + Local` et `Local only` demandent une URL de base Ollama, découvrent les modèles disponibles et téléchargent automatiquement le modèle local sélectionné s'il n'est pas encore disponible. Lorsque Ollama signale une balise `:latest` installée telle que `gemma4:latest`, la configuration affiche ce modèle installé une seule fois au lieu d'afficher à la fois `gemma4` et `gemma4:latest` ou de retélécharger l'alias nu. `Cloud + Local` vérifie également si cet hôte Ollama est connecté pour l'accès au cloud.
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider ollama
        ```
      </Step>
    </Steps>

    ### Mode non-interactif

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
    **Idéal pour :** contrôle total de la configuration cloud ou locale.

    <Steps>
      <Step title="Choisir cloud ou local"Ollama>
        - **Cloud + Local** : installez Ollama, connectez-vous avec `ollama signin`, et acheminez les requêtes cloud via cet hôte
        - **Cloud uniquement** : utilisez `https://ollama.com` avec un `OLLAMA_API_KEY`Ollama
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
      <Step title="OllamaOpenClawActiver Ollama pour OpenClaw">
        Pour `Cloud only`, utilisez votre véritable `OLLAMA_API_KEY`. Pour les configurations sauvegardées par l'hôte, n'importe quelle valeur d'espace réservé fonctionne :

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
    `Cloud + Local`OllamaOllamaOpenClawOllama utilise un hôte Ollama joignable comme point de contrôle pour les modèles locaux et cloud. C'est le flux hybride préféré d'Ollama.

    Utilisez **Cloud + Local** lors de la configuration. OpenClaw demande l'URL de base d'Ollama, découvre les modèles locaux depuis cet hôte et vérifie si l'hôte est connecté pour l'accès cloud avec `ollama signin`OpenClaw. Lorsque l'hôte est connecté, OpenClaw suggère également des valeurs par défaut cloud hébergées telles que `kimi-k2.5:cloud`, `minimax-m2.7:cloud` et `glm-5.1:cloud`OpenClaw.

    Si l'hôte n'est pas encore connecté, OpenClaw conserve la configuration en mode local uniquement jusqu'à ce que vous exécutiez `ollama signin`.

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` s'exécute sur l'Ollama hébergée d'API à `https://ollama.com`.

    Utilisez **Cloud only** (Cloud uniquement) lors de la configuration. OpenClaw demande `OLLAMA_API_KEY`, définit `baseUrl: "https://ollama.com"` et remplit la liste des modèles cloud hébergés. Ce chemin ne nécessite **pas** de serveur Ollama local ni `ollama signin`.

    La liste des modèles cloud affichée pendant `openclaw onboard` est remplie en temps réel à partir de `https://ollama.com/api/tags`, plafonnée à 500 entrées, afin que le sélecteur reflète le catalogue hébergé actuel plutôt qu'une liste statique. Si `ollama.com` est inaccessible ou ne renvoie aucun modèle au moment de la configuration, OpenClaw revient aux suggestions précédentes codées en dur afin que l'intégration se termine tout de même.

  </Tab>

  <Tab title="Local only">
    En mode local uniquement, OpenClaw découvre les modèles à partir de l'instance Ollama configurée. Ce chemin est destiné aux serveurs Ollama locaux ou auto-hébergés.

    OpenClaw suggère actuellement `gemma4` comme valeur locale par défaut.

  </Tab>
</Tabs>

## Découverte de modèles (fournisseur implicite)

Lorsque vous définissez `OLLAMA_API_KEY` (ou un profil d'authentification) et que vous ne définissez **pas** `models.providers.ollama` ou un autre fournisseur distant personnalisé avec `api: "ollama"`, OpenClaw découvre les modèles à partir de l'instance locale Ollama à `http://127.0.0.1:11434`.

| Comportement              | Détail                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requête de catalogue      | Interroge `/api/tags`                                                                                                                                                                                                 |
| Détection des capacités   | Utilise des recherches `/api/show` au mieux possible pour lire `contextWindow`, les paramètres étendus du fichier Modelfile `num_ctx` et les capacités, y compris la vision/outils                                    |
| Modèles de vision         | Les modèles ayant une capacité `vision` signalée par `/api/show` sont marqués comme compatibles avec les images (`input: ["text", "image"]`), de sorte que OpenClaw injecte automatiquement les images dans le prompt |
| Détection du raisonnement | Utilise les capacités `/api/show` lorsqu'elles sont disponibles, notamment `thinking``think``reasoning``r1`Ollama omet les capacités                                                                                  |
| Limites de jetons         | Définit `maxTokens` sur la limite maximale de jetons par défaut Ollama utilisée par OpenClaw                                                                                                                          |
| Coûts                     | Définit tous les coûts sur `0`                                                                                                                                                                                        |

Cela évite les entrées de modèle manuelles tout en gardant le catalogue aligné avec l'instance locale Ollama. Vous pouvez utiliser une référence complète telle que `ollama/<pulled-model>:latest` dans le `infer model run` local OpenClaw résout ce modèle installé à partir du catalogue en direct de Ollama sans nécessiter d'entrée `models.json` écrite à la main.

Pour les hôtes Ollama connectés, certains modèles `:cloud` peuvent être utilisables via `/api/chat`
et `/api/show` avant d'apparaître dans `/api/tags`. Lorsque vous sélectionnez explicitement une
référence complète `ollama/<model>:cloud`, OpenClaw valide ce modèle manquant exact avec
`/api/show` et l'ajoute au catalogue d'exécution uniquement si Ollama confirme les
métadonnées du modèle. Les erreurs de frappe échouent toujours en tant que modèles inconnus au lieu d'être créés automatiquement.

```bash
# See what models are available
ollama list
openclaw models list
```

Pour un test de fumée étroit de génération de texte qui évite toute la surface de l'outil de l'agent,
utilisez le `infer model run` local avec une référence complète de modèle Ollama :

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

Ce chemin utilise toujours le fournisseur configuré d'OpenClaw, l'authentification et le transport natif d'Ollama, mais il ne démarre pas de tour d'agent de discussion ni ne charge le contexte MCP/outil. Si cela réussit alors que les réponses normales de l'agent échouent, dépannez ensuite la capacité de prompt/outil de l'agent du modèle.

Pour un test de fumée étroit de modèle de vision sur le même chemin léger, ajoutez un ou plusieurs
fichiers image à `infer model run`. Cela envoie l'invite et l'image directement au
modèle de vision Ollama sélectionné sans charger les outils de chat, la mémoire ou le
contexte de session antérieur :

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

`model run --file` accepte les fichiers détectés comme `image/*`, y compris les entrées courantes
PNG, JPEG et WebP. Les fichiers non image sont rejetés avant que Ollama ne soit appelé.
Pour la reconnaissance vocale, utilisez `openclaw infer audio transcribe` à la place.

Lorsque vous changez de conversation avec `/model ollama/<model>`, OpenClaw considère
qu'il s'agit d'une sélection exacte de l'utilisateur. Si le OpenClaw`baseUrl` Ollama configuré est
injoignable, la réponse suivante échoue avec l'erreur du fournisseur au lieu de répondre
silencieusement avec un autre Ollama de repli configuré.

Les tâches cron isolées effectuent une vérification de sécurité locale supplémentaire avant de lancer le tour
de l'agent. Si le sélectionné résout vers un fournisseur Ollama local, de réseau privé ou `.local`Ollama
et que `/api/tags`OpenClaw est injoignable, OpenClaw enregistre l'exécution de ce cron
comme `skipped` avec le `ollama/<model>`Ollama sélectionné dans le texte de l'erreur. Le préflight
de point de terminaison est mis en cache pendant 5 minutes, de sorte que plusieurs tâches cron pointant vers le même
démon Ollama arrêté ne lancent pas toutes des requêtes de ayant échoué.

Vérifiez en direct le chemin de texte local, le chemin de flux natif et les intégrations par rapport à Ollama local avec :

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

Pour les tests de fumée de clé API OllamaAPI Cloud, dirigez le test en direct vers `https://ollama.com`
et choisissez un hébergé dans le catalogue actuel :

```bash
export OLLAMA_API_KEY='<your-ollama-cloud-api-key>'

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

Le test de fumée cloud exécute du texte, un flux natif et une recherche web. Il ignore les intégrations par
défaut pour `https://ollama.com` car les clés d'API OllamaAPI Cloud peuvent ne pas autoriser
`/api/embed`. Définissez `OPENCLAW_LIVE_OLLAMA_EMBEDDINGS=1` lorsque vous voulez explicitement
que le test en direct échoue si la clé cloud configurée ne peut pas utiliser le point de terminaison d'intégration.

Pour ajouter un nouveau , il suffit de le tirer avec Ollama :

```bash
ollama pull mistral
```

Le nouveau OpenClaw sera découvert automatiquement et disponible à l'utilisation.

<Note>
  Si vous définissez `models.providers.ollama` explicitement, ou si vous configurez un fournisseur distant personnalisé tel que `models.providers.ollama-cloud` avec `api: "ollama"`, la découverte automatique est ignorée et vous devez définir les modèles manuellement. Les fournisseurs personnalisés en boucle tels que `http://127.0.0.2:11434` sont toujours traités comme locaux. Voir la section de
  configuration explicite ci-dessous.
</Note>

## Vision et description d'image

Le plugin Ollama inclus enregistre Ollama en tant que fournisseur de compréhension de média capable de traiter des images. Cela permet à OpenClaw de router les demandes explicites de description d'image et les valeurs par défaut configurées pour les modèles d'image via des modèles de vision Ollama locaux ou hébergés.

Pour une vision locale, téléchargez un modèle qui prend en charge les images :

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
```

Puis vérifiez avec le CLI d'inférence :

```bash
openclaw infer image describe \
  --file ./photo.jpg \
  --model ollama/qwen2.5vl:7b \
  --json
```

`--model` doit être une référence complète `<provider/model>`. Lorsqu'il est défini, `openclaw infer image describe` exécute directement ce modèle au lieu d'ignorer la description, car le modèle prend en charge la vision native.

Utilisez `infer image describe` lorsque vous souhaitez le flux de fournisseur de compréhension d'image de OpenClaw, le `agents.defaults.imageModel` configuré, et la forme de sortie de la description d'image. Utilisez `infer model run --file` lorsque vous souhaitez une sonde de modèle multimodale brute avec un prompt personnalisé et une ou plusieurs images.

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

Préférez la référence complète `ollama/<model>`. Si le même modèle est répertorié sous `models.providers.ollama.models` avec `input: ["text", "image"]` et qu'aucun autre fournisseur d'image configuré n'expose cet ID de modèle nu, OpenClaw normalise également une référence nue `imageModel` telle que `qwen2.5vl:7b` vers `ollama/qwen2.5vl:7b`. Si plus d'un fournisseur d'image configuré possède le même ID nu, utilisez explicitement le préfixe du fournisseur.

Les modèles de vision locaux lents peuvent nécessiter un délai d'attente de compréhension d'image plus long que les modèles cloud. Ils peuvent également planter ou s'arrêter lorsque Ollama tente d'allouer le contexte de vision complet annoncé sur un matériel contraint. Définissez un délai d'attente de capacité et plafonnez `num_ctx` sur l'entrée du modèle lorsque vous avez seulement besoin d'un tour de description d'image normal :

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

Ce délai s'applique à la compréhension d'image entrante et à l'outil explicite `image` que l'agent peut appeler pendant un tour. Le `models.providers.ollama.timeoutSeconds`Ollama au niveau du fournisseur contrôle toujours le garde de requête HTTP Ollama sous-jacent pour les appels de modèle normaux.

Vérifiez en direct l'outil d'image explicite par rapport au Ollama local avec :

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

Si vous définissez `models.providers.ollama.models` manuellement, marquez les modèles de vision avec le support d'entrée d'image :

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw rejette les demandes de description d'image pour les modèles qui ne sont pas marqués comme compatibles avec l'image. Avec la découverte implicite, OpenClaw lit cela depuis Ollama lorsque `/api/show` signale une capacité de vision.

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
    Utilisez une configuration explicite lorsque vous voulez une configuration cloud hébergée, que Ollama s'exécute sur un autre hôte/port, que vous voulez forcer des fenêtres de contexte spécifiques ou des listes de modèles, ou que vous voulez des définitions de modèle entièrement manuelles.

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
    N'ajoutez pas `/v1` à l'URL. Le chemin `/v1` utilise le mode compatible OpenAI, où l'appel d'outil n'est pas fiable. Utilisez l'URL de base Ollama sans suffixe de chemin.
    </Warning>

  </Tab>
</Tabs>

## Recettes courantes

Utilisez-les comme points de départ et remplacez les ID de modèle par les noms exacts provenant de `ollama list` ou `openclaw models list --provider ollama`.

<AccordionGroup>
  <Accordion title="Modèle local avec découverte automatique">
    Utilisez ceci lorsque Ollama s'exécute sur la même machine que le Gateway et que vous souhaitez qu'OpenClaw découvre automatiquement les modèles installés.

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    Cette approche maintient la configuration minimale. N'ajoutez pas de bloc `models.providers.ollama` sauf si vous souhaitez définir les modèles manuellement.

  </Accordion>

  <Accordion title="Hôte Ollama en LAN avec modèles manuels">
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

  <Accordion title="Cloud Ollama uniquement">
    Utilisez ceci lorsque vous n'exécutez pas de démon local et que vous souhaitez des modèles Ollama hébergés directement.

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
    Utilisez ceci lorsqu'un démon Ollama local ou LAN est connecté avec `ollama signin` et doit servir à la fois des modèles locaux et des modèles `:cloud`.

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

  <Accordion title="Plusieurs hôtes Ollama">
    Utilisez des IDs de fournisseur personnalisés lorsque vous avez plus d'un serveur Ollama. Chaque fournisseur obtient son propre hôte, modèles, auth, délai d'attente et références de modèle.

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

    Lorsque OpenClaw envoie la requête, le préfixe du fournisseur actif est supprimé afin que `ollama-large/qwen3.5:27b` atteigne Ollama sous la forme `qwen3.5:27b`.

  </Accordion>

  <Accordion title="Lean local model profile">
    Certains modèles locaux peuvent répondre à des invites simples mais peinent avec l'ensemble de la surface des outils de l'agent. Commencez par limiter les outils et le contexte avant de modifier les paramètres d'exécution globaux.

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

    Utilisez `compat.supportsTools: false` uniquement lorsque le modèle ou le serveur échoue de manière fiable sur les schémas d'outils. Cela échange les capacités de l'agent contre la stabilité.
    `localModelLean` supprime les outils de navigateur, de cron et de messagerie de la surface de l'agent, mais cela ne modifie pas le contexte d'exécution ou le mode de réflexion d'Ollama. Associez-le à des `params.num_ctx` et `params.thinking: false` explicites pour les petits modèles de réflexion de style Qwen qui bouclent ou dépensent leur budget de réponse en raisonnement caché.

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

Les identifiants de fournisseur personnalisés Ollama sont également pris en charge. Lorsqu'une référence de modèle utilise le préfixe de fournisseur actif, tel que `ollama-spark/qwen3:32b`, OpenClaw ne supprime que ce préfixe avant d'appeler Ollama afin que le serveur reçoive `qwen3:32b`.

Pour les modèles locaux lents, préférez le réglage de la demande avec portée fournisseur avant d'augmenter tout le délai d'expiration de l'exécution de l'agent :

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

`timeoutSeconds` s'applique à la requête HTTP du modèle, y compris la configuration de la connexion, les en-têtes, le flux du corps et l'abandon total de la récupération gardée. `params.keep_alive` est transmis à Ollama en tant que `keep_alive` de premier niveau sur les requêtes natives `/api/chat` ; définissez-le par modèle lorsque le temps de chargement du premier tour est le goulot d'étranglement.

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

Pour les hôtes distants, remplacez `127.0.0.1` par l'hôte utilisé dans `baseUrl`. Si `curl` fonctionne mais que OpenClaw ne fonctionne pas, vérifiez si le Gateway s'exécute sur une machine, un conteneur ou un compte de service différent.

## Recherche Web Ollama

OpenClaw prend en charge **Ollama Web Search** en tant que fournisseur OpenClawOllama`web_search` intégré.

| Propriété | Détail                                                                                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hôte      | Utilise votre hôte Ollama configuré (Ollama`models.providers.ollama.baseUrl` si défini, sinon `http://127.0.0.1:11434`) ; `https://ollama.com`API utilise l'API hébergée directement                                        |
| Auth      | Sans clé pour les hôtes Ollama locaux connectés ; Ollama`OLLAMA_API_KEY` ou authentification de fournisseur configurée pour la recherche `https://ollama.com` directe ou les hôtes protégés par authentification            |
| Exigence  | Les hôtes locaux/auto-hébergés doivent être en cours d'exécution et connectés avec `ollama signin` ; la recherche hébergée directe nécessite `baseUrl: "https://ollama.com"`OllamaAPI ainsi qu'une véritable clé API Ollama |

Choisissez **Ollama Web Search** pendant Ollama`openclaw onboard` ou `openclaw configure --section web`, ou définissez :

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

<Note>Pour la configuration complète et les détails de comportement, consultez [Ollama Web Search](Ollama/en/tools/ollama-search).</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="OpenAIMode compatible OpenAI hérité"OpenAIOpenAIOpenAIOpenAI>
    <Warning>
    **L'appel d'outils n'est pas fiable en mode compatible OpenAI.** Utilisez ce mode uniquement si vous avez besoin du format OpenAI pour un proxy et que ne dépendez pas du comportement natif d'appel d'outils.
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

    Lorsque `api: "openai-completions"`OllamaOpenClaw est utilisé avec Ollama, OpenClaw injecte `options.num_ctx`Ollama par défaut pour qu'Ollama ne revienne pas silencieusement à une fenêtre de contexte de 4096. Si votre proxy/amont rejette les champs `options` inconnus, désactivez ce comportement :

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
    Pour les modèles découverts automatiquement, OpenClaw utilise la fenêtre de contexte signalée par Ollama lorsque disponible, y compris les valeurs `PARAMETER num_ctx` plus grandes provenant de Modelfiles personnalisés. Sinon, elle revient à la fenêtre de contexte Ollama par défaut utilisée par OpenClaw.

    Vous pouvez définir les valeurs par défaut au niveau du fournisseur pour `contextWindow`, `contextTokens` et `maxTokens` pour chaque modèle sous ce fournisseur Ollama, puis les remplacer par modèle si nécessaire. `contextWindow` est le budget de prompt et de compactage de OpenClaw. Les requêtes natives Ollama laissent `options.num_ctx` non défini à moins que vous ne configuriez explicitement `params.num_ctx`, permettant ainsi à Ollama d'appliquer sa propre valeur par défaut basée sur le modèle, `OLLAMA_CONTEXT_LENGTH` ou la VRAM. Pour plafonner ou forcer le contexte d'exécution par requête de Ollama sans reconstruire un Modelfile, définissez `params.num_ctx` ; les valeurs non valides, nulles, négatives et non finies sont ignorées. Si vous avez mis à niveau une ancienne configuration qui n'utilisait que `contextWindow` ou `maxTokens` pour forcer un contexte de requête natif Ollama, exécutez `openclaw doctor --fix` pour copier ces budgets explicites de fournisseur ou de modèle dans `params.num_ctx`. L'adaptateur OpenAI compatible Ollama injecte toujours `options.num_ctx` par défaut à partir de `params.num_ctx` ou `contextWindow` configuré ; désactivez cela avec `injectNumCtxForOpenAICompat: false` si votre en amont rejette `options`.

    Les entrées de modèle natives Ollama acceptent également les options d'exécution courantes de Ollama sous `params`, y compris `temperature`, `top_p`, `top_k`, `min_p`, `num_predict`, `stop`, `repeat_penalty`, `num_batch`, `num_thread` et `use_mmap`. OpenClaw ne transmet que les clés de requête Ollama, les paramètres d'exécution de OpenClaw tels que `streaming` ne fuient donc pas vers Ollama. Utilisez `params.think` ou `params.thinking` pour envoyer `think` Ollama de premier niveau ; `false` désactive la réflexion au niveau API pour les modèles de réflexion de style Qwen.

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

    `agents.defaults.models["ollama/<model>"].params.num_ctx` par modèle fonctionne également. Si les deux sont configurés, l'entrée de modèle de fournisseur explicite l'emporte sur la valeur par défaut de l'agent.

  </Accordion>

  <Accordion title="Contrôle de la réflexion"OllamaOpenClawOllama>
    Pour les modèles natifs Ollama, OpenClaw transmet le contrôle de la réflexion comme Ollama l'attend : `think` de premier niveau, et non `options.think`. Les modèles découverts automatiquement dont la réponse `/api/show` inclut la capacité `thinking` exposent `/think low`, `/think medium`, `/think high` et `/think max` ; les modèles non réfléchis n'exposent que `/think off`.

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

    Les paramètres `params.think` ou `params.thinking`OllamaAPIOpenClaw par modèle peuvent désactiver ou forcer la réflexion via l'API Ollama pour un modèle configuré spécifique. OpenClaw conserve ces paramètres de modèle explicites lorsque l'exécution active ne possède que la valeur par défaut implicite `off` ; les commandes d'exécution runtime non-off telles que `/think medium` continuent de remplacer l'exécution active.

  </Accordion>

  <Accordion title="Modèles de raisonnement"OpenClaw>
    OpenClaw considère par défaut que les modèles portant des noms tels que `deepseek-r1`, `reasoning` ou `think` sont capables de raisonnement.

    ```bash
    ollama pull deepseek-r1:32b
    ```OpenClaw

    Aucune configuration supplémentaire n'est nécessaire. OpenClaw les marque automatiquement.

  </Accordion>

<Accordion title="Coûts des modèles" Ollama>
  Ollama est gratuit et fonctionne localement, par conséquent tous les coûts de modèle sont définis à 0 $. Cela s'applique aux modèles découverts automatiquement ainsi qu'aux modèles définis manuellement.
</Accordion>

  <Accordion title="Mémoires et embeddings"Ollama>
    Le plugin Ollama inclus enregistre un fournisseur d'embedding de mémoire pour
    la [recherche mémoire](/en/concepts/memoryOllamaAPIOllama). Il utilise l'URL de base Ollama configurée
    et la clé API, appelle le point de terminaison actuel `/api/embed` d'Ollama et regroupe
    plusieurs blocs de mémoire en une seule requête `input` lorsque cela est possible.

    Lorsque `proxy.enabled=true`Ollama, les requêtes d'embedding de mémoire Ollama vers l'origine exacte
    de bouclage local de l'hôte dérivée du `baseUrl`OpenClaw configuré utilisent
    le chemin direct gardé d'OpenClaw au lieu du proxy de transfert géré. Le
    nom d'hôte configuré doit lui-même être `localhost`Ollama ou une adresse IP de bouclage littérale ;
    les noms DNS qui résolvent simplement vers une adresse de bouclage utilisent toujours le chemin du proxy géré.
    Les hôtes Ollama LAN, tailnet, réseau privé et public restent également sur le
    chemin du proxy géré. Les redirections vers un autre hôte ou port n'héritent pas de la confiance.
    Les opérateurs peuvent toujours définir le paramètre global `proxy.loopbackMode: "proxy"` pour
    envoyer le trafic de bouclage via le proxy, ou `proxy.loopbackMode: "block"`
    pour refuser les connexions de bouclage avant l'ouverture d'une connexion ; voir
    [Proxy géré](/en/security/network-proxy#gateway-loopback-mode) pour l'
    effet à l'échelle du processus de ce paramètre.

    | Propriété      | Valeur               |
    | ------------- | ------------------- |
    | Modèle par défaut | `nomic-embed-text`  |
    | Tirage automatique     | Oui — le modèle d'embedding est tiré automatiquement s'il n'est pas présent localement |

    Les embeddings au moment de la requête utilisent des préfixes de récupération pour les modèles qui les exigent ou les recommandent, y compris `nomic-embed-text`, `qwen3-embedding` et `mxbai-embed-large`Ollama. Les lots de documents de mémoire restent bruts pour que les index existants ne nécessitent pas de migration de format.

    Pour sélectionner Ollama comme fournisseur d'embedding pour la recherche mémoire :

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

    Pour un hôte d'embedding distant, conservez l'authentification limitée à cet hôte :

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

  <Accordion title="Configuration du streaming">
    L'intégration Ollama d'OpenClawOllama utilise l'**API native OllamaAPI** (`/api/chat`) par défaut, ce qui prend entièrement en charge le streaming et l'appel d'outils simultanément. Aucune configuration spéciale n'est nécessaire.

    Pour les requêtes natives `/api/chat`, OpenClaw transmet également directement le contrôle de réflexion à Ollama : `/think off` et `openclaw agent --thinking off` envoient un `think: false` de premier niveau, sauf si une valeur de model `params.think`/`params.thinking` explicite est configurée, tandis que `/think low|medium|high` envoient la chaîne d'effort `think` de premier niveau correspondante. `/think max` correspond à l'effort natif le plus élevé d'Ollama, `think: "high"`.

    <Tip>
    Si vous devez utiliser le point de terminaison compatible OpenAI, consultez la section "Mode compatible OpenAI hérité" ci-dessus. Le streaming et l'appel d'outils peuvent ne pas fonctionner simultanément dans ce mode.
    </Tip>

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="WSL2Boucle de crash WSL2 (redémarrages répétés)"WSL2OllamaLinux>
    Sur WSL2 avec NVIDIA/CUDA, le programme d'installation officiel d'Ollama pour Linux crée une unité systemd `ollama.service` avec `Restart=always`WSL2OllamaWindowsWSL2OllamaWSL2Windows. Si ce service démarre automatiquement et charge un modèle GPU lors du démarrage de WSL2, Ollama peut épingler la mémoire de l'hôte pendant le chargement du modèle. La récupération de mémoire Hyper-V ne peut pas toujours récupérer ces pages épinglées, Windows peut donc arrêter la machine virtuelle WSL2, systemd redémarre Ollama, et la boucle se répète.

    Preuves courantes :

    - redémarrages ou arrêts répétés de WSL2 depuis le côté Windows
    - utilisation élevée du CPU dans `app.slice` ou `ollama.service`WSL2LinuxOpenClawWSL2 peu après le démarrage de WSL2
    - SIGTERM de systemd plutôt qu'un événement OOM-killer Linux

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

    Définissez une durée de conservation (keep-alive) plus courte dans l'environnement du service Ollama, ou démarrez Ollama manuellement uniquement lorsque vous en avez besoin :

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
    Si votre modèle n'est pas listé, tirez le modèle localement ou définissez-le explicitement dans `models.providers.ollama`.

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
    Vérifiez depuis la même machine et le runtime qui exécute le Gateway :

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    Causes courantes :

    - `baseUrl` pointe vers `localhost`, mais le Gateway s'exécute dans Docker ou sur un autre hôte.
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

  <Accordion title="GLMKimi ou GLM renvoie des symboles illisibles"GLM>
    Les réponses hébergées de Kimi/GLM qui consistent en de longues séquences de symboles non linguistiques sont traitées comme une sortie du fournisseur ayant échoué plutôt que comme une réponse réussie de l'assistant. Cela permet à la réessai normal, au repli ou à la gestion des erreurs de prendre le relais sans persister le texte corrompu dans la session.

    Si cela se produit à plusieurs reprises, capturez le nom brut du modèle, le fichier de session actuel, et si l'exécution utilisait `Cloud + Local` ou `Cloud only`, puis essayez une nouvelle session et un modèle de repli :

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="Le modèle local à froid expire"OllamaOllama>
    Les grands modèles locaux peuvent avoir besoin d'un long premier chargement avant que le flux ne commence. Gardez le délai d'expiration limité au fournisseur Ollama, et demandez facultativement à Ollama de garder le modèle chargé entre les tours :

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

    Si l'hôte lui-même est lent à accepter les connexions, `timeoutSeconds` étend également le délai de connexion gardé d'Undici pour ce fournisseur.

  </Accordion>

  <Accordion title="Le modèle à grand contexte est trop lent ou manque de mémoire"OllamaOllamaOllama>
    De nombreux modèles Ollama annoncent des contextes plus volumineux que ce que votre matériel peut gérer confortablement. Ollama natif utilise le contexte d'exécution par défaut propre à Ollama, sauf si vous définissez `params.num_ctx`OpenClawOllama. Plafonnez à la fois le budget d'OpenClaw et le contexte de requête d'Ollama lorsque vous souhaitez une latence prévisible du premier jeton :

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

    Réduisez d'abord `contextWindow`OpenClaw si OpenClaw envoie trop de prompt. Réduisez `params.num_ctx`Ollama si Ollama charge un contexte d'exécution trop volumineux pour la machine. Réduisez `maxTokens` si la génération dure trop longtemps.

  </Accordion>
</AccordionGroup>

<Note>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Fournisseurs de modèles" href="/fr/concepts/model-providers" icon="layers">
    Vue d'ensemble de tous les fournisseurs, des références de modèles et du comportement de basculement.
  </Card>
  <Card title="Sélection du modèle" href="/fr/concepts/models" icon="brain">
    Comment choisir et configurer les modèles.
  </Card>
  <Card title="Ollama Web Search" href="/fr/tools/ollama-search" icon="magnifying-glass">
    Détails complets de la configuration et du comportement pour la recherche Web propulsée par Ollama.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration.
  </Card>
</CardGroup>
