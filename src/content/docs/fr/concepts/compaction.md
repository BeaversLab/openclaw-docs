---
summary: "Fenêtre contextuelle + compactage : comment OpenClaw maintient les sessions sous les limites du modèle"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compactage"
---

# Fenêtre contextuelle et compactage

Chaque modèle possède une **fenêtre contextuelle** (nombre maximum de jetons qu'il peut voir). Les conversations longues accumulent des messages et des résultats d'outils ; une fois la fenêtre saturée, OpenClaw **compacte** l'historique plus ancien pour rester dans les limites.

## Qu'est-ce que le compactage

Le compactage **résume l'ancienne conversation** dans une entrée de résumé compacte et conserve les messages récents intacts. Le résumé est stocké dans l'historique de la session, de sorte que les futures requêtes utilisent :

- Le résumé de compactage
- Les messages récents après le point de compactage

Le compactage **persiste** dans l'historique JSONL de la session.

## Configuration

Utilisez le paramètre `agents.defaults.compaction` dans votre `openclaw.json` pour configurer le comportement de compactage (mode, jetons cibles, etc.).
Le résumé de compactage préserve les identifiants opaques par défaut (`identifierPolicy: "strict"`). Vous pouvez remplacer cela par `identifierPolicy: "off"` ou fournir un texte personnalisé avec `identifierPolicy: "custom"` et `identifierInstructions`.

Vous pouvez éventuellement spécifier un modèle différent pour le résumé de compactage via `agents.defaults.compaction.model`. C'est utile lorsque votre modèle principal est un modèle local ou petit et que vous voulez que les résumés de compactage soient produits par un modèle plus capable. Le remplacement accepte n'importe quelle chaîne `provider/model-id` :

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-6"
      }
    }
  }
}
```

Cela fonctionne également avec les modèles locaux, par exemple un deuxième modèle Ollama dédié au résumé ou un spécialiste du compactage affiné :

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "ollama/llama3.1:8b"
      }
    }
  }
}
```

Si non défini, le compactage utilise le modèle principal de l'agent.

## Auto-compactage (activé par défaut)

Lorsqu'une session approche ou dépasse la fenêtre contextuelle du modèle, OpenClaw déclenche l'auto-compactage et peut réessayer la requête originale en utilisant le contexte compacté.

Vous verrez :

- `🧹 Auto-compaction complete` en mode verbeux
- `/status` affichant `🧹 Compactions: <count>`

Avant la compactage, OpenClaw peut exécuter un tour de **silent memory flush** pour stocker
des notes durables sur le disque. Voir [Memory](/fr/concepts/memory) pour les détails et la configuration.

## Compaction manuelle

Utilisez `/compact` (éventuellement avec des instructions) pour forcer une passe de compaction :

```
/compact Focus on decisions and open questions
```

## Source de la fenêtre de contexte

La fenêtre de contexte est spécifique au modèle. OpenClaw utilise la définition du modèle issue du catalogue de providers configuré pour déterminer les limites.

## Compaction vs élagage

- **Compaction** : résume et **persiste** en JSONL.
- **Élagage de session** : supprime uniquement les anciens **résultats d'outils**, **en mémoire**, par requête.

Voir [/concepts/session-pruning](/fr/concepts/session-pruning) pour les détails sur l'élagage (pruning).

## Compaction côté serveur OpenAI

OpenClaw prend également en charge les indications de compaction côté serveur OpenAI Responses pour les modèles OpenAI directs compatibles. Cela est distinct de la compaction locale OpenClaw et peut fonctionner parallèlement.

- Compaction locale : OpenClaw résume et persiste dans le fichier JSONL de session.
- Compaction côté serveur : OpenAI compacte le contexte côté provider lorsque
  `store` + `context_management` sont activés.

Voir [OpenAI provider](/fr/providers/openai) pour les paramètres de modèle et les substitutions.

## Moteurs de contexte personnalisés

Le comportement de compactage est géré par le
[context engine](/fr/concepts/context-engine) actif. Le moteur hérité utilise la synthèse
intégrée décrite ci-dessus. Les moteurs de plugins (sélectionnés via
`plugins.slots.contextEngine`) peuvent implémenter n'importe quelle stratégie de compactage — synthèses DAG,
récupération vectorielle, condensation incrémentale, etc.

Lorsqu'un moteur de plugin définit `ownsCompaction: true`, OpenClaw délègue toutes
les décisions de compactage au moteur et n'exécute pas l'auto-compactage intégré.

Lorsque `ownsCompaction` est `false` ou non défini, OpenClaw peut encore utiliser l'auto-compactage intégrée
de Pi lors de la tentative, mais la méthode `compact()` du moteur actif
gère toujours `/compact` et la récupération des dépassements. Il n'y a pas de repli automatique
vers le chemin de compactage du moteur hérité.

Si vous créez un moteur de contexte non propriétaire, implémentez `compact()` en
appelant `delegateCompactionToRuntime(...)` depuis `openclaw/plugin-sdk/core`.

## Conseils

- Utilisez `/compact` lorsque les sessions semblent obsolètes ou que le contexte est saturé.
- Les grandes sorties d'outils sont déjà tronquées ; l'élagage peut réduire davantage l'accumulation des résultats d'outils.
- Si vous avez besoin d'un repartir à zéro, `/new` ou `/reset` démarre un nouvel identifiant de session.
