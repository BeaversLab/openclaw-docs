---
summary: "Comment OpenClaw construit le contexte du prompt et rapporte l'utilisation des tokens + les coûts"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Utilisation des tokens et coûts"
---

# Utilisation des tokens & coûts

OpenClaw suit les **tokens**, et non les caractères. Les tokens sont spécifiques au modèle, mais la plupart
des modèles de style OpenAI comptent en moyenne ~4 caractères par token pour le texte en anglais.

## Construction du prompt système

OpenClaw assemble son propre prompt système à chaque exécution. Il inclut :

- Liste des outils + descriptions courtes
- Liste des Skills (uniquement les métadonnées ; les instructions sont chargées à la demande avec `read`)
- Instructions de mise à jour automatique
- Espace de travail + fichiers d'amorçage (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` lors de la création). Les fichiers volumineux sont tronqués par `agents.defaults.bootstrapMaxChars` (par défaut : 20000).
- Heure (UTC + fuseau horaire de l'utilisateur)
- Étiquettes de réponse + comportement de heartbeat
- Métadonnées d'exécution (hôte/OS/modèle/réflexion)

Voir le détail complet dans [Prompt système](/fr/concepts/system-prompt).

## Ce qui compte dans la fenêtre de contexte

Tout ce que le modèle reçoit compte vers la limite de contexte :

- Prompt système (toutes les sections listées ci-dessus)
- Historique de conversation (messages utilisateur + assistant)
- Appels d'outils et résultats d'outils
- Pièces jointes/transcriptions (images, audio, fichiers)
- Résumés de compactage et artefacts d'élagage
- Enveloppes de fournisseur ou en-têtes de sécurité (non visibles, mais toujours comptés)

Pour une répartition pratique (par fichier injecté, outils, skills et taille du prompt système), utilisez `/context list` ou `/context detail`. Voir [Contexte](/fr/concepts/context).

## Comment voir l'utilisation actuelle des tokens

Utilisez ceux-ci dans le chat :

- `/status` → **carte de statut riche en emojis** avec le modèle de session, l'utilisation du contexte,
  les tokens d'entrée/sortie de la dernière réponse, et **coût estimé** (clé API uniquement).
- `/usage off|tokens|full` → ajoute un **pied de page d'utilisation par réponse** à chaque réponse.
  - Persiste par session (stocké sous forme de `responseUsage`).
  - L'authentification OAuth **masque le coût** (uniquement les jetons).
- `/usage cost` → affiche un résumé local des coûts à partir des journaux de session OpenClaw.

Autres surfaces :

- **TUI/Web TUI :** `/status` + `/usage` sont pris en charge.
- **CLI :** `openclaw status --usage` et `openclaw channels list` affichent
  les fenêtres de quota du fournisseur (pas les coûts par réponse).

## Estimation des coûts (lorsqu'elle est affichée)

Les coûts sont estimés à partir de votre configuration de tarification du modèle :

```
models.providers.<provider>.models[].cost
```

Il s'agit de **USD par 1M de jetons** pour `input`, `output`, `cacheRead` et
`cacheWrite`. Si la tarification est manquante, OpenClaw affiche uniquement les jetons. Les jetons OAuth
n'affichent jamais le coût en dollars.

## Impact du cache TTL et de l'élagage

La mise en cache du prompt par le fournisseur ne s'applique que dans la fenêtre du cache TTL. OpenClaw peut
optionnellement exécuter le **cache-ttl pruning** : il élagage la session une fois que le cache TTL
a expiré, puis réinitialise la fenêtre de cache afin que les requêtes ultérieures puissent réutiliser le
contexte nouvellement mis en cache au lieu de remettre en cache l'historique complet. Cela permet de maintenir les coûts d'écriture du cache
plus bas lorsqu'une session reste inactive au-delà du TTL.

Configurez-le dans [Configuration de la Gateway](/fr/gateway/configuration) et consultez les
détails du comportement dans [Élagage de session](/fr/concepts/session-pruning).

Le battement de cœur (heartbeat) peut garder le cache **chaud** pendant les périodes d'inactivité. Si le cache TTL de votre modèle
est `1h`, définir l'intervalle de battement de cœur juste en dessous (par exemple `55m`) peut éviter
de remettre en cache le prompt complet, réduisant ainsi les coûts d'écriture du cache.

Pour la tarification de l'Anthropic API, les lectures de cache sont beaucoup moins chères que les jetons d'entrée,
tandis que les écritures de cache sont facturées avec un multiplicateur plus élevé. Consultez la tarification
de mise en cache des prompts de Anthropic pour les derniers tarifs et les multiplicateurs TTL :
https://docs.anthropic.com/docs/build-with-claude/prompt-caching

### Exemple : garder le cache de 1h chaud avec le battement de cœur

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-5"
    models:
      "anthropic/claude-opus-4-5":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

## Conseils pour réduire la pression sur les tokens

- Utilisez `/compact` pour résumer les longues sessions.
- Coupez les sorties volumineuses des outils dans vos workflows.
- Gardez les descriptions des compétences courtes (la liste des compétences est injectée dans le prompt).
- Préférez des modèles plus petits pour un travail verbeux et exploratoire.

Voir [Skills](/fr/tools/skills) pour la formule exacte de la surcharge de la liste des compétences.

import fr from "/components/footer/fr.mdx";

<fr />
