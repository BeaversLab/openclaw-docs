---
title: "Élagage de session"
summary: "Suppression des anciens résultats d'outils pour garder le contexte léger et le cache efficace"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

# Élagage de session

L'élagage de session supprime les **anciens résultats d'outils** du contexte avant chaque appel LLM. Cela réduit le gonflement du contexte dû aux résultats d'outils accumulés (résultats d'exécution, lectures de fichiers, résultats de recherche) sans toucher à vos messages de conversation.

<Info>L'élagage s'effectue uniquement en mémoire -- il ne modifie pas la transcription de session sur disque. Votre historique complet est toujours préservé.</Info>

## Pourquoi c'est important

Les sessions longues accumulent des résultats d'outils qui gonflent la fenêtre de contexte. Cela augmente les coûts et peut forcer la [compactage](/en/concepts/compaction) plus tôt que nécessaire.

L'élagage est particulièrement précieux pour le **cache de prompt Anthropic**. Une fois le TTL du cache expiré, la requête suivante remet en cache le prompt complet. L'élagage réduit la taille de l'écriture dans le cache, ce qui réduit directement les coûts.

## Comment cela fonctionne

1. Attendez l'expiration du TTL du cache (par défaut 5 minutes).
2. Trouvez les anciens résultats d'outils (les messages de l'utilisateur et de l'assistant ne sont jamais touchés).
3. **Couper en douceur** les résultats trop volumineux -- gardez le début et la fin, insérez `...`.
4. **Effacer fermement** le reste -- remplacez par un espace réservé.
5. Réinitialisez le TTL pour que les requêtes de suivi réutilisent le cache frais.

## Paramètres par défaut intelligents

OpenClaw active automatiquement l'élagage pour les profils Anthropic :

| Type de profil                  | Élagage activé | Heartbeat |
| ------------------------------- | -------------- | --------- |
| OAuth ou jeton de configuration | Oui            | 1 heure   |
| Clé API                         | Oui            | 30 min    |

Si vous définissez des valeurs explicites, OpenClaw ne les remplacera pas.

## Activer ou désactiver

L'élagage est désactivé par défaut pour les fournisseurs autres que Anthropic. Pour activer :

```json5
{
  agents: {
    defaults: {
      contextPruning: { mode: "cache-ttl", ttl: "5m" },
    },
  },
}
```

Pour désactiver : définissez `mode: "off"`.

## Élagage vs compactage

|                  | Élagage                       | Compactage                  |
| ---------------- | ----------------------------- | --------------------------- |
| **Quoi**         | Coupe les résultats d'outils  | Résume la conversation      |
| **Sauvegardé ?** | Non (par requête)             | Oui (dans la transcription) |
| **Portée**       | Résultats d'outils uniquement | Conversation entière        |

Ils se complètent -- l'élagage garde les résultats d'outils légers entre les cycles de compactage.

## Pour aller plus loin

- [Compactage](/en/concepts/compaction) -- réduction du contexte basée sur le résumé
- [Configuration Gateway](/en/gateway/configuration) -- tous les paramètres de configuration d'élagage
  (`contextPruning.*`)
