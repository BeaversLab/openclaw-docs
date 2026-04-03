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

L'historique complet de la conversation reste sur le disque. Le compactage ne modifie que ce que
le modèle voit au tour suivant.

## Auto-compactage

L'auto-compactage est activé par défaut. Il s'exécute lorsque la session approche la limite
de contexte, ou lorsque le modèle renvoie une erreur de dépassement de contexte (auquel cas
OpenClaw compactera et réessayera).

<Info>Avant de compacter, OpenClaw rappelle automatiquement à l'agent d'enregistrer des notes importantes dans les fichiers [mémoire](/en/concepts/memory). Cela évite la perte de contexte.</Info>

## Compactage manuel

Tapez `/compact` dans n'importe quel chat pour forcer un compactage. Ajoutez des instructions pour guider
le résumé :

```
/compact Focus on the API design decisions
```

## Utiliser un modèle différent

Par défaut, le compactage utilise le modèle principal de votre agent. Vous pouvez utiliser un modèle
plus performant pour de meilleurs résumés :

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

## Compactage vs élagage

|                   | Compactage                             | Élagage                                  |
| ----------------- | -------------------------------------- | ---------------------------------------- |
| **Ce qu'il fait** | Résume l'ancienne conversation         | Supprime les anciens résultats d'outils  |
| **Sauvegardé ?**  | Oui (dans la transcription de session) | Non (en mémoire uniquement, par requête) |
| **Portée**        | Conversation entière                   | Résultats des outils uniquement          |

[L'élagage de session](/en/concepts/session-pruning) est un complément plus léger qui
réduit la sortie des outils sans résumer.

## Dépannage

**Compactage trop fréquent ?** La fenêtre de contexte du modèle peut être petite, ou les
sorties d'outils peuvent être volumineuses. Essayez d'activer
[l'élagage de session](/en/concepts/session-pruning).

**Le contexte semble périmé après compactage ?** Utilisez `/compact Focus on <topic>` pour
guider le résumé, ou activez la [vidange de la mémoire](/en/concepts/memory) afin que les notes
soient conservées.

**Besoin d'un nouveau départ ?** `/new` lance une nouvelle session sans compactage.

Pour une configuration avancée (réservation de jetons, préservation des identifiants, moteurs de contexte personnalisés, compactage côté serveur OpenAI), consultez la section
[Approfondissement de la gestion de session](/en/reference/session-management-compaction).

## Liens connexes

- [Session](/en/concepts/session) — gestion et cycle de vie de session
- [Élagage de session](/en/concepts/session-pruning) — rognage des résultats des outils
- [Contexte](/en/concepts/context) — construction du contexte pour les tours de l'agent
- [Hooks](/en/automation/hooks) — hooks de cycle de vie du compactage (before_compaction, after_compaction)
