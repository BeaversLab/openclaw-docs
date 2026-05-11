---
summary: "Taillage des anciens résultats d'outils pour garder le contexte léger et le cache efficace"
title: "Taillage de session"
read_when:
  - You want to reduce context growth from tool outputs
  - You want to understand Anthropic prompt cache optimization
---

Le taillage de session supprime les **anciens résultats d'outils** du contexte avant chaque appel LLM. Cela réduit le gonflement du contexte dû aux sorties d'outils accumulées (résultats d'exécution, lectures de fichiers, résultats de recherche) sans réécrire le texte normal de la conversation.

<Info>Le taillage s'effectue uniquement en mémoire -- il ne modifie pas la transcription de session sur disque. Votre historique complet est toujours préservé.</Info>

## Pourquoi c'est important

Les sessions longues accumulent des sorties d'outils qui gonflent la fenêtre de contexte. Cela augmente les coûts et peut forcer la [compaction](/fr/concepts/compaction) plus tôt que nécessaire.

Le taillage est particulièrement précieux pour le **cache de prompt Anthropic**. Une fois le TTL du cache expiré, la requête suivante remet en cache le prompt complet. Le taillage réduit la taille d'écriture du cache, abaissant directement les coûts.

## Comment ça marche

1. Attendre l'expiration du TTL du cache (par défaut 5 minutes).
2. Trouver les anciens résultats d'outils pour le taillage normal (le texte de conversation est laissé tel quel).
3. **Tailler en douceur** les résultats trop volumineux -- garder le début et la fin, insérer `...`.
4. **Effacer fermement** le reste -- remplacer par un espace réservé.
5. Réinitialiser le TTL pour que les requêtes de suivi réutilisent le cache fraîchement créé.

## Nettoyage des images héritées

OpenClaw construit également une vue de relecture idempotente distincte pour les sessions qui conservent des blocs d'images bruts ou des marqueurs de média d'hydratation de prompt dans l'historique.

- Il préserve les **3 derniers tours complétés** octet par octet afin que les préfixes de cache de prompt pour les suivis récents restent stables.
- Dans la vue de relecture, les anciens blocs d'images déjà traités de l'historique `user` ou `toolResult` peuvent être remplacés par `[image data removed - already processed by model]`.
- Les anciennes références de média textuel telles que `[media attached: ...]`, `[Image: source: ...]` et `media://inbound/...` peuvent être remplacées par `[media reference removed - already processed by model]`. Les marqueurs de pièces jointes du tour en cours restent intacts pour que les modèles de vision puissent encore hydrater des images fraîches.
- La transcription brute de la session n'est pas réécrite, les visualiseurs d'historique peuvent donc toujours afficher les entrées de message originales et leurs images.
- Ceci est distinct de l'élagage normal du cache-TTL. Cela sert à empêcher les
  charges d'images répétées ou les références médias obsolètes de casser les caches de
  invites lors des tours ultérieurs.

## Valeurs par défaut intelligentes

OpenClaw active automatiquement l'élagage pour les profils Anthropic :

| Type de profil                                                   | Élagage activé | Intervalle (Heartbeat) |
| ---------------------------------------------------------------- | -------------- | ---------------------- |
| Auth Anthropic/token (incluant la réutilisation du OAuth Claude) | Oui            | 1 heure                |
| Clé API                                                          | Oui            | 30 min                 |

Si vous définissez des valeurs explicites, OpenClaw ne les remplacera pas.

## Activer ou désactiver

L'élagage est désactivé par défaut pour les fournisseurs non-Anthropic. Pour activer :

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

|                  | Élagage                        | Compactage                  |
| ---------------- | ------------------------------ | --------------------------- |
| **Quoi**         | Supprime les résultats d'outil | Résume la conversation      |
| **Sauvegardé ?** | Non (par requête)              | Oui (dans la transcription) |
| **Portée**       | Résultats d'outil uniquement   | Conversation entière        |

Ils se complètent -- l'élagage maintient les sorties d'outil légères entre
les cycles de compactage.

## Pour aller plus loin

- [Compactage](/fr/concepts/compaction) -- réduction du contexte basée sur le résumé
- [Configuration du Gateway](/fr/gateway/configuration) -- tous les paramètres de config d'élagage
  (`contextPruning.*`)

## Connexe

- [Gestion de session](/fr/concepts/session)
- [Outils de session](/fr/concepts/session-tool)
- [Moteur de contexte](/fr/concepts/context-engine)
