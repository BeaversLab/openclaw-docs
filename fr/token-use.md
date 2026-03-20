---
summary: "Comment OpenClaw construit le contexte du prompt et rapporte l'utilisation des tokens + les coûts"
read_when:
  - Expliquer l'utilisation des tokens, les coûts ou les fenêtres de contexte
  - Débogage de la croissance ou du comportement de compactage du contexte
title: "Utilisation et coûts des tokens"
---

# Utilisation et coûts des tokens

OpenClaw suit les **tokens**, et non les caractères. Les tokens sont spécifiques au modèle, mais la plupart
des modèles de type OpenAI font la moyenne d'environ ~4 caractères par token pour le texte en anglais.

## Construction du prompt système

OpenClaw assemble son propre prompt système à chaque exécution. Il inclut :

- Liste des outils + descriptions courtes
- Liste des Skills (uniquement les métadonnées ; les instructions sont chargées à la demande avec `read`)
- Instructions de mise à jour automatique
- Espace de travail + fichiers d'amorçage (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` lorsqu'ils sont nouveaux). Les fichiers volumineux sont tronqués par `agents.defaults.bootstrapMaxChars` (par défaut : 20000).
- Heure (UTC + fuseau horaire de l'utilisateur)
- Balises de réponse + comportement de heartbeat
- Métadonnées d'exécution (hôte/OS/modèle/réflexion)

Voir la répartition complète dans [System Prompt](/fr/concepts/system-prompt).

## Ce qui compte dans la fenêtre de contexte

Tout ce que le modèle reçoit compte vers la limite de contexte :

- Prompt système (toutes les sections listées ci-dessus)
- Historique de la conversation (messages utilisateur + assistant)
- Appels d'outils et résultats d'outils
- Pièces jointes/transcriptions (images, audio, fichiers)
- Résumés de compactage et artefacts d'élagage
- Enveloppes de fournisseur ou en-têtes de sécurité (non visibles, mais toujours comptés)

Pour une répartition pratique (par fichier injecté, outils, skills et taille du prompt système), utilisez `/context list` ou `/context detail`. Voir [Context](/fr/concepts/context).

## Comment voir l'utilisation actuelle des tokens

Utilisez ceux-ci dans le chat :

- `/status` → **carte de statut riche en emojis** avec le modèle de la session, l'utilisation du contexte,
  les derniers tokens d'entrée/sortie de la réponse, et **coût estimé** (clé API uniquement).
- `/usage off|tokens|full` → ajoute un **pied de page d'utilisation par réponse** à chaque réponse.
  - Persiste par session (stocké sous `responseUsage`).
  - L'authentification OAuth **masque le coût** (tokens uniquement).
- `/usage cost` → affiche un résumé local des coûts à partir des journaux de session OpenClaw.

Autres interfaces :

- **TUI/Web TUI :** `/status` + `/usage` sont pris en charge.
- **CLI :** `openclaw status --usage` et `openclaw channels list` affichent
  les fenêtres de quota du provider (pas les coûts par réponse).

## Estimation des coûts (lorsqu'elle est affichée)

Les coûts sont estimés à partir de votre configuration tarifaire de model :

```
models.providers.<provider>.models[].cost
```

Il s'agit de **USD par 1M de tokens** pour `input`, `output`, `cacheRead` et
`cacheWrite`. Si la tarification est manquante, OpenClaw n'affiche que les tokens. Les tokens OAuth
n'affichent jamais les coûts en dollars.

## Impact du TTL et de l'élagage du cache

La mise en cache du prompt par le provider ne s'applique que dans la fenêtre du TTL du cache. OpenClaw peut
optionnellement exécuter le **cache-ttl pruning** (élagage du TTL du cache) : il élagage la session une fois le TTL du cache
expiré, puis réinitialise la fenêtre du cache afin que les requêtes suivantes puissent réutiliser le
contexte nouvellement mis en cache au lieu de remettre en cache l'historique complet. Cela maintient les coûts
d'écriture du cache plus bas lorsqu'une session reste inactive au-delà du TTL.

Configurez-le dans [Gateway configuration](/fr/gateway/configuration) et consultez les
détails du comportement dans [Session pruning](/fr/concepts/session-pruning).

Le heartbeat peut garder le cache **chaud** pendant les périodes d'inactivité. Si le TTL du cache de votre model
est `1h`, définir l'intervalle du heartbeat juste en dessous (p. ex., `55m`) peut éviter
de remettre en cache le prompt complet, réduisant ainsi les coûts d'écriture du cache.

Pour la tarification de l'Anthropic API, les lectures du cache sont considérablement moins chères que les
tokens d'entrée, tandis que les écritures du cache sont facturées avec un multiplicateur plus élevé. Consultez la tarification
de mise en cache de prompt de Anthropic pour les derniers taux et multiplicateurs TTL :
https://docs.anthropic.com/docs/build-with-claude/prompt-caching

### Exemple : garder le cache chaud pendant 1h avec un heartbeat

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
- Coupez les grandes sorties de tool dans vos workflows.
- Gardez les descriptions de compétences courtes (la liste des compétences est injectée dans le prompt).
- Préférez des models plus petits pour le travail verbeux et exploratoire.

Consultez [Skills](/fr/tools/skills) pour la formule exacte de la surcharge de la liste des compétences.

import fr from "/components/footer/fr.mdx";

<fr />
