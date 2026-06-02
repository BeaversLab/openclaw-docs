---
summary: "OllamaConfigurez le plugin de mémoire externe officiel LanceDB, y compris les embeddings compatibles avec Ollama local"
read_when:
  - You are configuring the memory-lancedb plugin
  - You want LanceDB-backed long-term memory with auto-recall or auto-capture
  - You are using local OpenAI-compatible embeddings such as Ollama
title: "Memory LanceDB"
sidebarTitle: "Memory LanceDB"
---

`memory-lancedb` est un plugin de mémoire externe officiel qui stocke la mémoire à long terme dans
LanceDB et utilise des embeddings pour le rappel. Il peut rappeler automatiquement les
mémoires pertinentes avant un tour de modèle et capturer des faits importants après une réponse.

Utilisez-le lorsque vous souhaitez une base de données vectorielle locale pour la mémoire, que vous avez besoin d'un point de terminaison d'embeddings compatible OpenAI, ou que vous souhaitez conserver une base de données de mémoire en dehors du magasin de mémoire intégré par défaut.

## Installation

Installez `memory-lancedb` avant de configurer `plugins.slots.memory = "memory-lancedb"` :

```bash
openclaw plugins install @openclaw/memory-lancedb
```

Le plugin est publié sur npm et n'est pas inclus dans l'image d'exécution OpenClaw.
Le programme d'installation écrit l'entrée du plugin et change l'emplacement mémoire lorsqu'aucun autre
plugin ne le possède.

<Note>`memory-lancedb` est un plugin de mémoire actif. Activez-le en sélectionnant l'emplacement mémoire avec `plugins.slots.memory = "memory-lancedb"`. Les plugins compagnons tels que `memory-wiki` peuvent fonctionner à côté, mais un seul plugin possède l'emplacement mémoire actif.</Note>

## Quick start

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

Redémarrez le Gateway après avoir modifié la configuration du plugin :

```bash
openclaw gateway restart
```

Vérifiez ensuite que le plugin est chargé :

```bash
openclaw plugins list
```

## Provider-backed embeddings

`memory-lancedb` peut utiliser les mêmes adaptateurs de fournisseur d'embeddings mémoire que
`memory-core`. Définissez `embedding.provider` et omettez `embedding.apiKey` pour utiliser le
profil d'authentification configuré du fournisseur, la variable d'environnement ou
`models.providers.<provider>.apiKey`.

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
        },
      },
    },
  },
}
```

Cette méthode fonctionne avec les profils d'authentification de fournisseurs qui exposent des identifiants d'embeddings.
Par exemple, GitHub Copilot peut être utilisé lorsque le profil/plan Copilot prend en charge
les embeddings :

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "github-copilot",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

OpenAI Codex / ChatGPT OAuth n'est pas un identifiant d'intégration OpenAI Platform.
Pour les intégrations OpenAI, utilisez un profil d'authentification par clé API OpenAI,
OpenAIOAuthOpenAIOpenAIOpenAIAPI`OPENAI_API_KEY` ou `models.providers.openai.apiKey`OAuthGitHubOllama. Les utilisateurs exclusivement OAuth peuvent utiliser
un autre fournisseur prenant en charge les intégrations, tel que GitHub Copilot ou Ollama.

## Embeddings Ollama

Pour les intégrations Ollama, préférez le fournisseur d'intégration Ollama inclus. Il utilise le
point de terminaison natif OllamaOllamaOllama`/api/embed`OllamaOllama d'Ollama et suit les mêmes règles d'authentification/URL de base que
le fournisseur Ollama documenté dans [Ollama](/fr/providers/ollama).

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "ollama",
            baseUrl: "http://127.0.0.1:11434",
            model: "mxbai-embed-large",
            dimensions: 1024,
          },
          recallMaxChars: 400,
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

Définissez `dimensions`OpenClaw pour les modèles d'intégration non standard. OpenClaw connaît les
dimensions pour `text-embedding-3-small` et `text-embedding-3-large` ; les modèles personnalisés
ont besoin de cette valeur dans la configuration pour que LanceDB puisse créer la colonne de vecteurs.

Pour les petits modèles d'intégration locaux, réduisez `recallMaxChars` si vous rencontrez des erreurs
de longueur de contexte émanant du serveur local.

## Providers compatibles avec OpenAI

Certains fournisseurs d'intégration compatibles OpenAI rejettent le paramètre
OpenAI`encoding_format`, tandis que d'autres l'ignorent et renvoient toujours des vecteurs
`number[]`. `memory-lancedb` omet donc `encoding_format` dans les demandes d'intégration et
accepte les réponses sous forme de tableaux de flottants ou de flottants float32 encodés en base64.

Si vous disposez d'un point de terminaison d'intégration brut compatible OpenAI qui ne possède pas
d'adaptateur de fournisseur inclus, omettez OpenAI`embedding.provider` (ou laissez-le comme `openai`) et
définissez `embedding.apiKey` ainsi que `embedding.baseUrl`OpenAI. Cela préserve le chemin client
direct compatible OpenAI.

Définissez `embedding.dimensions` pour les fournisseurs dont les dimensions du modèle ne sont pas intégrées. Par exemple, ZhiPu `embedding-3` utilise des dimensions `2048` :

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            apiKey: "${ZHIPU_API_KEY}",
            baseUrl: "https://open.bigmodel.cn/api/paas/v4",
            model: "embedding-3",
            dimensions: 2048,
          },
        },
      },
    },
  },
}
```

## Limites de rappel et de capture

`memory-lancedb` possède deux limites de texte distinctes :

| Paramètre         | Par défaut | Plage     | S'applique à                                                                |
| ----------------- | ---------- | --------- | --------------------------------------------------------------------------- |
| `recallMaxChars`  | `1000`     | 100-10000 | texte envoyé à l'API d'embedding pour le rappel                             |
| `captureMaxChars` | `500`      | 100-10000 | longueur de message éligible pour la capture automatique                    |
| `customTriggers`  | `[]`       | 0-50      | phrases littérales qui font que la capture automatique considère un message |

`recallMaxChars` contrôle le rappel automatique, l'outil `memory_recall`, le chemin de requête `memory_forget` et `openclaw ltm search`. Le rappel automatique privilégie le dernier message utilisateur du tour et n'a recours au prompt complet que lorsqu'aucun message utilisateur n'est disponible. Cela permet de garder les métadonnées du channel et les grands blocs de prompt hors de la requête d'intégration.

`captureMaxChars` contrôle si une réponse est suffisamment courte pour être prise en compte pour la capture automatique. Elle ne limite pas les intégrations de requête de rappel.

`customTriggers` vous permet d'ajouter des expressions littérales de capture automatique sans écrire d'expressions régulières. Les déclencheurs intégrés incluent des phrases de mémoire courantes en anglais, tchèque, chinois, japonais et coréen.

## Commandes

Lorsque `memory-lancedb` est le plugin de mémoire actif, il enregistre l'espace de noms `ltm` CLI :

```bash
openclaw ltm list
openclaw ltm search "project preferences"
openclaw ltm stats
```

La sous-commande `query` exécute une requête non vectorielle directement sur la table LanceDB :

```bash
openclaw ltm query --cols id,text,createdAt --limit 20
openclaw ltm query --filter "category = 'preference'" --order-by createdAt:desc
```

- `--cols <columns>` : liste d'autorisation de colonnes séparées par des virgules (par défaut `id`, `text`, `importance`, `category`, `createdAt`).
- `--filter <condition>` : clause WHERE de style SQL ; limitée à 200 caractères et restreinte aux caractères alphanumériques, opérateurs de comparaison, guillemets, parenthèses et un petit ensemble de ponctuations sûres.
- `--limit <n>` : entier positif ; par défaut `10`.
- `--order-by <column>:<asc|desc>` : tri en mémoire appliqué après le filtre ; la colonne de tri est automatiquement incluse dans la projection.

Les agents obtiennent également les outils de mémoire LanceDB à partir du plugin de mémoire actif :

- `memory_recall` pour le rappel basé sur LanceDB
- `memory_store` pour enregistrer des faits importants, des préférences, des décisions et des entités
- `memory_forget` pour supprimer les mémoires correspondantes

## Stockage

Par défaut, les données LanceDB résident sous `~/.openclaw/memory/lancedb`. Remplacez le
chemin par `dbPath` :

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "~/.openclaw/memory/lancedb",
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

`storageOptions` accepte des paires clé/valeur de chaînes pour les moteurs de stockage LanceDB et
prend en charge l'expansion `${ENV_VAR}` :

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "s3://memory-bucket/openclaw",
          storageOptions: {
            access_key: "${AWS_ACCESS_KEY_ID}",
            secret_key: "${AWS_SECRET_ACCESS_KEY}",
            endpoint: "${AWS_ENDPOINT_URL}",
          },
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

## Dépendances d'exécution

`memory-lancedb` dépend du package natif `@lancedb/lancedb`OpenClawGatewayGateway. OpenClaw
conditionné traite ce package comme faisant partie du package du plugin. Le démarrage du
Gateway ne répare pas les dépendances des plugins ; si la dépendance est manquante, réinstallez ou
mettez à jour le package du plugin et redémarrez le Gateway.

Si une ancienne installation enregistre une erreur de `dist/package.json` manquant ou de
`@lancedb/lancedb`OpenClawGateway manquant lors du chargement du plugin, mettez à niveau OpenClaw et redémarrez le
Gateway.

Si le plugin enregistre que LanceDB n'est pas disponible sur `darwin-x64`Gateway, utilisez le moteur de
mémoire par défaut sur cette machine, déplacez le Gateway vers une plate-forme prise en charge ou
désactivez `memory-lancedb`.

## Dépannage

### La longueur de l'entrée dépasse la longueur du contexte

Cela signifie généralement que le model d'intégration a rejeté la requête de rappel :

```text
memory-lancedb: recall failed: Error: 400 the input length exceeds the context length
```

Définissez une valeur `recallMaxChars`Gateway inférieure, puis redémarrez le Gateway :

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        config: {
          recallMaxChars: 400,
        },
      },
    },
  },
}
```

Pour Ollama, vérifiez également que le serveur d'intégration est accessible depuis l'hôte du Gateway :

```bash
curl http://127.0.0.1:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"mxbai-embed-large","input":"hello"}'
```

### Model d'intégration non pris en charge

Sans `dimensions`OpenAI, seules les dimensions de l'intégration OpenAI intégrée sont connues.
Pour les modèles d'intégration locaux ou personnalisés, définissez `embedding.dimensions` sur la taille du
vecteur signalée par ce modèle.

### Le plugin se charge mais aucun souvenir n'apparaît

Vérifiez que `plugins.slots.memory` pointe vers `memory-lancedb`, puis exécutez :

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

Si `autoCapture` est désactivé, le plugin rappellera les mémoires existantes mais n'en
stockera pas automatiquement de nouvelles. Utilisez l'outil `memory_store` ou activez
`autoCapture` si vous souhaitez une capture automatique.

## Connexes

- [Vue d'ensemble de la mémoire](/fr/concepts/memory)
- [Mémoire active](/fr/concepts/active-memory)
- [Recherche de mémoire](/fr/concepts/memory-search)
- [Wiki Mémoire](/fr/plugins/memory-wiki)
- [Ollama](Ollama/en/providers/ollama)
