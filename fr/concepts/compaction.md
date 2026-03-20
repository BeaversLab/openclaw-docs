---
summary: "Fenêtre contextuelle + compactage : comment OpenClaw maintient les sessions sous les limites du modèle"
read_when:
  - Vous souhaitez comprendre le compactage automatique et /compact
  - Vous déboguez de longues sessions atteignant les limites du contexte
title: "Compactage"
---

# Fenêtre contextuelle et compactage

Chaque modèle possède une **fenêtre contextuelle** (le nombre maximal de tokens qu'il peut voir). Les conversations longues accumulent des messages et des résultats d'outils ; une fois la fenêtre saturée, OpenClaw **compacte** l'historique plus ancien pour rester dans les limites.

## Qu'est-ce que le compactage

Le compactage **résume l'ancienne conversation** dans une entrée de résumé compacte et garde les messages récents intacts. Le résumé est stocké dans l'historique de la session, donc les prochaines requêtes utilisent :

- Le résumé de compactage
- Les messages récents après le point de compactage

Le compactage **persiste** dans l'historique JSONL de la session.

## Configuration

Utilisez le paramètre `agents.defaults.compaction` dans votre `openclaw.json` pour configurer le comportement du compactage (mode, tokens cibles, etc.).
Le résumé de compactage préserve les identifiants opaques par défaut (`identifierPolicy: "strict"`). Vous pouvez remplacer cela par `identifierPolicy: "off"` ou fournir un texte personnalisé avec `identifierPolicy: "custom"` et `identifierInstructions`.

Vous pouvez éventuellement spécifier un modèle différent pour le résumé de compactage via `agents.defaults.compaction.model`. C'est utile lorsque votre modèle principal est un modèle local ou petit et que vous souhaitez que les résumés de compactage soient produits par un modèle plus capable. Le remplacement accepte toute chaîne `provider/model-id` :

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-5"
      }
    }
  }
}
```

Cela fonctionne aussi avec des modèles locaux, par exemple un deuxième modèle Ollama dédié au résumé ou un spécialiste du compactage affiné :

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

## Compactage automatique (activé par défaut)

Lorsqu'une session approche ou dépasse la fenêtre contextuelle du modèle, OpenClaw déclenche le compactage automatique et peut réessayer la requête originale en utilisant le contexte compacté.

Vous verrez :

- `🧹 Auto-compaction complete` en mode verbeux
- `/status` affichant `🧹 Compactions: <count>`

Avant le compactage, OpenClaw peut exécuter un tour de **vidage silencieux de la mémoire** pour stocker
des notes durables sur le disque. Voir [Mémoire](/fr/concepts/memory) pour les détails et la configuration.

## Compactage manuel

Utilisez `/compact` (optionnellement avec des instructions) pour forcer une passe de compactage :

```
/compact Focus on decisions and open questions
```

## Source de la fenêtre de contexte

La fenêtre de contexte est spécifique au modèle. OpenClaw utilise la définition du modèle à partir du catalogue de fournisseurs configuré pour déterminer les limites.

## Compactage vs élagage

- **Compactage** : résume et **persiste** en JSONL.
- **Élagage de session** : coupe les anciens **résultats d'outils** uniquement, **en mémoire**, par requête.

Voir [/concepts/session-pruning](/fr/concepts/session-pruning) pour les détails de l'élagage.

## Compactage côté serveur OpenAI

OpenClaw prend également en charge les indications de compactage côté serveur de OpenAI Responses pour les modèles directs OpenAI compatibles. Cela est distinct du compactage local OpenClaw et peut fonctionner parallèlement.

- Compactage local : OpenClaw résume et persiste dans le JSONL de session.
- Compactage côté serveur : OpenAI compresse le contexte côté fournisseur lorsque
  `store` + `context_management` sont activés.

Voir [Fournisseur OpenAI](/fr/providers/openai) pour les paramètres et substitutions de modèle.

## Moteurs de contexte personnalisés

Le comportement de compactage est géré par le
[moteur de contexte](/fr/concepts/context-engine) actif. Le moteur hérité utilise la
résumé intégré décrit ci-dessus. Les moteurs de plugins (sélectionnés via
`plugins.slots.contextEngine`) peuvent implémenter n'importe quelle stratégie de compactage — résumés de DAG,
récupération vectorielle, condensation incrémentale, etc.

Lorsqu'un moteur de plugin définit `ownsCompaction: true`, OpenClaw délègue toutes les
décisions de compactage au moteur et n'exécute pas l'auto-compactage intégré.

Lorsque `ownsCompaction` est `false` ou non défini, OpenClaw peut toujours utiliser l'auto-compactage intégré lors de la tentative de Pi, mais la méthode `compact()` du moteur actif
gère toujours `/compact` et la récupération de dépassement. Il n'y a pas de repli automatique
vers le chemin de compactage du moteur hérité.

Si vous créez un moteur de contexte non propriétaire, implémentez `compact()` en
appelant `delegateCompactionToRuntime(...)` depuis `openclaw/plugin-sdk/core`.

## Conseils

- Utilisez `/compact` lorsque les sessions semblent stagnantes ou le contexte est encombré.
- Les grandes sorties d'outils sont déjà tronquées ; l'élagage peut réduire davantage l'accumulation des résultats d'outils.
- Si vous avez besoin de repartir à zéro, `/new` ou `/reset` lance un nouvel identifiant de session.

import fr from "/components/footer/fr.mdx";

<fr />
