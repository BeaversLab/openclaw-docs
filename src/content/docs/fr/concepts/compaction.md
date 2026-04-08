---
summary: "Comment OpenClaw résume les longues conversations pour rester dans les limites du modèle"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compaction"
---

# Compactage

Chaque modèle possède une fenêtre de contexte -- le nombre maximum de jetons qu'il peut traiter.
Lorsqu'une conversation approche cette limite, OpenClaw **compacte** les anciens messages
dans un résumé afin que la discussion puisse continuer.

## Fonctionnement

1. Les anciens tours de conversation sont résumés en une entrée compacte.
2. Le résumé est enregistré dans la transcription de la session.
3. Les messages récents sont conservés intacts.

Lorsque OpenClaw divise l'historique en blocs de compactage, il conserve les appels d'outils de l'assistant associés à leurs entrées `toolResult` correspondantes. Si un point de division tombe à l'intérieur d'un bloc d'outil, OpenClaw déplace la limite pour que la paire reste ensemble et que la file d'attente non résumée actuelle soit préservée.

L'historique complet de la conversation reste sur le disque. Le compactage modifie uniquement ce que le modèle voit au tour suivant.

## Auto-compaction

L'auto-compactage est activé par défaut. Il s'exécute lorsque la session approche de la limite du contexte, ou lorsque le modèle renvoie une erreur de dépassement de contexte (dans ce cas, OpenClaw compresse et réessaie). Les signatures de dépassement typiques incluent `request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the model`, and `ollama error: context length
exceeded`.

<Info>Avant le compactage, OpenClaw rappelle automatiquement à l'agent de sauvegarder des notes importantes dans les fichiers [mémoire](/en/concepts/memory). Cela empêche la perte de contexte.</Info>

## Compactage manuel

Tapez `/compact` dans n'importe quel chat pour forcer un compactage. Ajoutez des instructions pour guider le résumé :

```
/compact Focus on the API design decisions
```

## Utilisation d'un modèle différent

Par défaut, le compactage utilise le modèle principal de votre agent. Vous pouvez utiliser un modèle plus performant pour obtenir de meilleurs résumés :

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

## Avis de début de compactage

Par défaut, le compactage s'exécute en silence. Pour afficher un bref avis lorsque le compactage commence, activez `notifyUser` :

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

Lorsqu'il est activé, l'utilisateur voit un court message (par exemple, "Compactage du contexte...") au début de chaque exécution du compactage.

## Compactage vs élagage

|                   | Compactage                             | Élagage                                  |
| ----------------- | -------------------------------------- | ---------------------------------------- |
| **Ce qu'il fait** | Résume l'ancienne conversation         | Coupe les anciens résultats d'outils     |
| **Sauvegardé ?**  | Oui (dans la transcription de session) | Non (uniquement en mémoire, par requête) |
| **Portée**        | Conversation entière                   | Résultats des outils uniquement          |

[L'élagage de session](/en/concepts/session-pruning) est un complément plus léger qui coupe la sortie des outils sans résumer.

## Dépannage

**Compactage trop fréquent ?** La fenêtre de contexte du modèle peut être petite, ou les résultats des outils peuvent être volumineux. Essayez d'activer
[session pruning](/en/concepts/session-pruning).

**Le contexte semble périmé après compactage ?** Utilisez `/compact Focus on <topic>` pour
guider le résumé, ou activez le [memory flush](/en/concepts/memory) pour que les notes
survivent.

**Besoin de repartir à zéro ?** `/new` lance une nouvelle session sans compactage.

Pour une configuration avancée (réserver des jetons, préservation des identifiants, moteurs de contexte personnalisés, compactage côté serveur OpenAI), consultez
[Session Management Deep Dive](/en/reference/session-management-compaction).

## Connexes

- [Session](/en/concepts/session) — gestion et cycle de vie de la session
- [Session Pruning](/en/concepts/session-pruning) — suppression des résultats des outils
- [Context](/en/concepts/context) — construction du contexte pour les tours de l'agent
- [Hooks](/en/automation/hooks) — hooks du cycle de vie du compactage (before_compaction, after_compaction)
