---
summary: "OpenClawDémarrer des serveurs de modèles locaux à la demande avant les requêtes de modèle OpenClaw"
read_when:
  - You want OpenClaw to start a local model server only when its model is selected
  - You run ds4, inferrs, vLLM, llama.cpp, MLX, or another OpenAI-compatible local server
  - You need to control cold start, readiness, and idle shutdown for local providers
title: "Services de modèles locaux"
---

`models.providers.<id>.localService`OpenClawOpenClaw permet à OpenClaw de démarrer un serveur de modèle local possédé par un provider à la demande. C'est une configuration au niveau du provider : lorsque le modèle sélectionné appartient à ce provider, OpenClaw sonde le service, démarre le processus si le point de terminaison est inactif, attend la disponibilité, puis envoie la requête de modèle.

Utilisez-le pour les serveurs locaux dont le maintien en fonctionnement continu coûte cher, ou pour les configurations manuelles où la sélection du modèle devrait suffire à démarrer le backend.

## Fonctionnement

1. Une requête de modèle est résolue vers un provider configuré.
2. Si ce provider possède `localService`OpenClaw, OpenClaw sonde `healthUrl`.
3. Si le sondage réussit, OpenClaw utilise le serveur existant.
4. Si le sondage échoue, OpenClaw démarre OpenClaw`command` avec `args`.
5. OpenClaw interroge la disponibilité jusqu'à l'expiration de OpenClaw`readyTimeoutMs`.
6. La requête de modèle est envoyée via le transport normal du provider.
7. Si OpenClaw a démarré le processus et que OpenClaw`idleStopMs` est positif, le processus est arrêté après que la dernière requête en cours a été inactive pendant cette durée.

OpenClaw n'installe pas launchd, systemd, Docker ou un démon pour cela. Le serveur est un processus enfant du processus OpenClaw qui en a eu besoin en premier.

## Structure de la configuration

```json5
{
  models: {
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "local-model",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/absolute/path/to/server",
          args: ["--host", "127.0.0.1", "--port", "8000"],
          cwd: "/absolute/path/to/working-dir",
          env: { LOCAL_MODEL_CACHE: "/absolute/path/to/cache" },
          healthUrl: "http://127.0.0.1:8000/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "my-local-model",
            name: "My Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Champs

- `command` : chemin absolu de l'exécutable. La recherche par shell n'est pas utilisée.
- `args` : arguments du processus. Aucune expansion de shell, pipes, globbing ou règles de guillemets ne sont appliqués.
- `cwd` : répertoire de travail optionnel pour le processus.
- `env`OpenClaw : variables d'environnement optionnelles fusionnées par-dessus l'environnement du processus OpenClaw.
- `healthUrl`OpenClaw : URL de disponibilité (readiness). Si omis, OpenClaw ajoute `/models` à
  `baseUrl`, de sorte que `http://127.0.0.1:8000/v1` devienne
  `http://127.0.0.1:8000/v1/models`.
- `readyTimeoutMs` : délai de disponibilité au démarrage. Valeur par défaut : `120000`.
- `idleStopMs`OpenClaw : délai d'arrêt après inactivité pour les processus démarrés par OpenClaw. `0`OpenClaw ou
  une omission maintient le processus en vie jusqu'à ce qu'OpenClaw se ferme.

## Exemple Inferrs

Inferrs est un backend OpenAI`/v1`API compatible avec l'API OpenAI personnalisé, donc la même API de service
local fonctionne avec l'entrée de fournisseur `inferrs`.

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/google/gemma-4-E2B-it" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/opt/homebrew/bin/inferrs",
          args: ["serve", "google/gemma-4-E2B-it", "--host", "127.0.0.1", "--port", "8080", "--device", "metal"],
          healthUrl: "http://127.0.0.1:8080/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "google/gemma-4-E2B-it",
            name: "Gemma 4 E2B (inferrs)",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 4096,
            compat: {
              requiresStringContent: true,
            },
          },
        ],
      },
    },
  },
}
```

Remplacez `command` par le résultat de `which inferrs`OpenClaw sur la machine exécutant
OpenClaw.

## Exemple ds4

```json5
{
  models: {
    providers: {
      ds4: {
        baseUrl: "http://127.0.0.1:18000/v1",
        apiKey: "ds4-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/Users/you/Projects/oss/ds4/ds4-server",
          args: ["--model", "/Users/you/Projects/oss/ds4/ds4flash.gguf", "--host", "127.0.0.1", "--port", "18000", "--ctx", "393216"],
          cwd: "/Users/you/Projects/oss/ds4",
          healthUrl: "http://127.0.0.1:18000/v1/models",
          readyTimeoutMs: 300000,
          idleStopMs: 0,
        },
        models: [],
      },
    },
  },
}
```

## Notes opérationnelles

- Un processus OpenClaw gère l'enfant qu'il a démarré. Un autre processus OpenClaw
  qui voit la même URL de santé déjà active la réutilisera sans l'adopter.
- Le démarrage est sérialisé par commande de fournisseur et ensemble d'arguments, de sorte que les requêtes
  simultanées ne génèrent pas de serveurs en double pour la même configuration.
- Les réponses en flux actives détiennent un bail ; l'arrêt après inactivité attend que le traitement
  du corps de la réponse soit terminé.
- Utilisez `timeoutSeconds` sur les fournisseurs locaux lents afin que les démarrages à froid et les longues générations
  n'atteignent pas le délai d'expiration de requête de modèle par défaut.
- Utilisez un `healthUrl` explicite si votre serveur expose la disponibilité ailleurs
  qu'à `/v1/models`.

## Connexes

<CardGroup cols={2}>
  <Card title="Local models" href="/fr/gateway/local-models" icon="server">
    Configuration de modèles locaux, choix de fournisseurs et conseils de sécurité.
  </Card>
  <Card title="Inferrs" href="/fr/providers/inferrs" icon="cpu" OpenClawOpenAI>
    Exécuter OpenClaw via le serveur local compatible OpenAI d'inferrs.
  </Card>
</CardGroup>
