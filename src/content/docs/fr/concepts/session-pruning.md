---
title: "Élagage de session"
summary: "Suppression des anciens résultats d'outils pour garder le contexte léger et le cache efficace"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

# Élagage de session

L'élagage de session supprime les **anciens résultats d'outils** du contexte avant chaque appel au LLM. Cela réduit l'encombrement du contexte causé par l'accumulation des sorties d'outils (résultats d'exécution, lectures de fichiers, résultats de recherche) sans réécrire le texte normal de la conversation.

<Info>L'élagage s'effectue uniquement en mémoire -- il ne modifie pas la transcription de session sur disque. Votre historique complet est toujours préservé.</Info>

## Pourquoi c'est important

Les longues sessions accumulent des sorties d'outils qui gonflent la fenêtre de contexte. Cela augmente les coûts et peut forcer la [compaction](/fr/concepts/compaction) plus tôt que nécessaire.

L'élagage est particulièrement précieux pour le **cache de prompt Anthropic**. Une fois le TTL du cache expiré, la requête suivante remet en cache le prompt complet. L'élagage réduit la taille de l'écriture dans le cache, ce qui réduit directement les coûts.

## Comment cela fonctionne

1. Attendez l'expiration du TTL du cache (par défaut 5 minutes).
2. Trouve les anciens résultats d'outils pour l'élagage normal (le texte de la conversation est laissé intact).
3. **Couper en douceur** les résultats trop volumineux -- gardez le début et la fin, insérez `...`.
4. **Effacer fermement** le reste -- remplacez par un espace réservé.
5. Réinitialisez le TTL pour que les requêtes de suivi réutilisent le cache frais.

## Nettoyage des images héritées

OpenClaw exécute également un nettoyage idempotent séparé pour les sessions héritées plus anciennes qui ont persisté des blocs d'images brutes dans l'historique.

- Il préserve les **3 tours complétés les plus récents** octet par octet afin que les préfixes du cache de prompt pour les suivis récents restent stables.
- Les anciens blocs d'images déjà traités dans l'historique `user` ou `toolResult` peuvent être remplacés par `[image data removed - already processed by model]`.
- Ceci est distinct de l'élagage normal du cache-TTL. Il existe pour empêcher les charges utiles d'images répétées de casser les caches de prompt lors des tours ultérieurs.

## Valeurs par défaut intelligentes

OpenClaw active automatiquement l'élagage pour les profils Anthropic :

| Type de profil                                                         | Élagage activé | Fréquence cardiaque |
| ---------------------------------------------------------------------- | -------------- | ------------------- |
| Auth Anthropic /jeton OAuth (y compris la réutilisation du CLI Claude) | Oui            | 1 heure             |
| Clé API                                                                | Oui            | 30 min              |

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

## Élagage vs Compaction

|                  | Élagage                         | Compaction                  |
| ---------------- | ------------------------------- | --------------------------- |
| **Quoi**         | Supprime les résultats d'outils | Résume la conversation      |
| **Sauvegardé ?** | Non (par requête)               | Oui (dans la transcription) |
| **Portée**       | Résultats d'outils uniquement   | Conversation entière        |

Ils se complètent -- l'élagage maintient les sorties d'outils légères entre les cycles de compaction.

## Pour aller plus loin

- [Compaction](/fr/concepts/compaction) -- réduction du contexte basée sur le résumé
- [Configuration de la Gateway](/fr/gateway/configuration) -- tous les paramètres de configuration d'élagage (`contextPruning.*`)
