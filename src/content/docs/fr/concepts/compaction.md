---
summary: "Comment OpenClaw résume les longues conversations pour rester dans les limites du modèle"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compactage"
---

# Compactage

Chaque modèle possède une fenêtre de contexte -- le nombre maximum de jetons qu'il peut traiter.
Lorsqu'une conversation approche cette limite, OpenClaw **compacte** les anciens messages
dans un résumé afin que la discussion puisse continuer.

## Fonctionnement

1. Les anciens tours de conversation sont résumés en une entrée compacte.
2. Le résumé est enregistré dans la transcription de la session.
3. Les messages récents sont conservés intacts.

Lorsque OpenClaw divise l'historique en blocs de compactage, il conserve les appels d'outil de l'assistant associés à leurs entrées `toolResult` correspondantes. Si un point de division tombe à l'intérieur d'un bloc d'outil, OpenClaw déplace la limite pour que la paire reste ensemble et que la queue non résumée actuelle soit préservée.

L'historique complet de la conversation reste sur le disque. Le compactage modifie uniquement ce que le modèle voit au tour suivant.

## Auto-compaction

L'auto-compactage est activé par défaut. Il s'exécute lorsque la session approche de la limite de contexte, ou lorsque le modèle renvoie une erreur de dépassement de contexte (auquel cas OpenClaw compacte et réessaie). Les signatures typiques de dépassement incluent `request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, and `ollama error: context length
exceeded`.

<Info>Avant le compactage, OpenClaw rappelle automatiquement à l'agent d'enregistrer des notes importantes dans les fichiers [memory](/fr/concepts/memory). Cela empêche la perte de contexte.</Info>

Utilisez le paramètre `agents.defaults.compaction` dans votre `openclaw.json` pour configurer le comportement de compactage (mode, nombre cible de jetons, etc.).
Le résumé de compactage préserve les identifiants opaques par défaut (`identifierPolicy: "strict"`). Vous pouvez remplacer cela par `identifierPolicy: "off"` ou fournir du texte personnalisé avec `identifierPolicy: "custom"` et `identifierInstructions`.

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

Cela fonctionne également avec des modèles locaux, par exemple un deuxième modèle Ollama dédié au résumé ou un spécialiste du compactage affiné :

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

Lorsqu'il n'est pas défini, le compactage utilise le modèle principal de l'agent.

## Fournisseurs de compactage enfichables

Les plugins peuvent enregistrer un provider de compactage personnalisé via `registerCompactionProvider()` sur l'API du plugin. Lorsqu'un provider est enregistré et configuré, OpenClaw délègue le résumé à celui-ci au lieu du pipeline LLM intégré.

Pour utiliser un provider enregistré, définissez l'id du provider dans votre configuration :

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "provider": "my-provider"
      }
    }
  }
}
```

Définir un `provider` force automatiquement `mode: "safeguard"`. Les providers reçoivent les mêmes instructions de compactage et la même politique de préservation des identifiants que le chemin intégré, et OpenClaw préserve toujours le contexte des tours récents et le suffixe des tours divisés après la sortie du provider. Si le provider échoue ou renvoie un résultat vide, OpenClaw revient au résumé LLM intégré.

## Auto-compaction (activé par défaut)

Lorsqu'une session approche ou dépasse la fenêtre de contexte du modèle, OpenClaw déclenche l'auto-compaction et peut réessayer la requête d'origine en utilisant le contexte compacté.

Vous verrez :

- `🧹 Auto-compaction complete` en mode verbeux
- `/status` montrant `🧹 Compactions: <count>`

Avant le compactage, OpenClaw peut exécuter un tour de **silent memory flush** (vidage silencieux de la mémoire) pour stocker des notes durables sur le disque. Voir [Memory](/fr/concepts/memory) pour les détails et la configuration.

## Compactage manuel

Tapez `/compact` dans n'importe quel chat pour forcer un compactage. Ajoutez des instructions pour guider le résumé :

```
/compact Focus on the API design decisions
```

## Utilisation d'un modèle différent

Par défaut, le compactage utilise le modèle principal de votre agent. Vous pouvez utiliser un modèle plus performant pour de meilleurs résumés :

```json5
{
  agents: {
    defaults: {
      compaction: {
        model: "openrouter/anthropic/claude-sonnet-4-6",
      },
    },
  },
}
```

## Notification de début de compactage

Par défaut, le compactage s'exécute en silence. Pour afficher une brève notification lorsque le compactage commence, activez `notifyUser` :

```json5
{
  agents: {
    defaults: {
      compaction: {
        notifyUser: true,
      },
    },
  },
}
```

Lorsque activé, l'utilisateur voit un court message (par exemple, "Compactage du contexte...") au début de chaque exécution du compactage.

## Compactage vs élagage

|                   | Compactage                             | Élagage                                  |
| ----------------- | -------------------------------------- | ---------------------------------------- |
| **Ce qu'il fait** | Résume l'ancienne conversation         | Supprime les anciens résultats de tool   |
| **Sauvegardé ?**  | Oui (dans la transcription de session) | Non (en mémoire uniquement, par requête) |
| **Portée**        | Conversation entière                   | Résultats de tool uniquement             |

[Session pruning](/fr/concepts/session-pruning) est un complément plus léger qui supprime la sortie des tools sans résumer.

## Dépannage

**Compacté trop souvent ?** La fenêtre de contexte du model peut être petite, ou les
sorties du tool peuvent être volumineuses. Essayez d'activer
[session pruning](/fr/concepts/session-pruning).

**Le contexte semble périmé après la compactage ?** Utilisez `/compact Focus on <topic>` pour
guider le résumé, ou activez le [memory flush](/fr/concepts/memory) pour que les notes
soient conservées.

**Besoin d'un nouveau départ ?** `/new` démarre une nouvelle session sans compacter.

Pour une configuration avancée (réserver des jetons, préservation des identifiants, moteurs de
contexte personnalisés, compactage côté serveur OpenAI), consultez
le [Session Management Deep Dive](/fr/reference/session-management-compaction).

## Connexes

- [Session](/fr/concepts/session) — gestion et cycle de vie de la session
- [Session Pruning](/fr/concepts/session-pruning) — découpage des résultats des outils
- [Context](/fr/concepts/context) — comment le contexte est construit pour les tours de l'agent
- [Hooks](/fr/automation/hooks) — hooks du cycle de vie de la compactage (before_compaction, after_compaction)
