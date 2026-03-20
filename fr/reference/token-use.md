---
summary: "Comment OpenClaw construit le contexte du prompt et signale l'utilisation des tokens + les coûts"
read_when:
  - Expliquer l'utilisation des tokens, les coûts ou les fenêtres de contexte
  - Débogage de la croissance du contexte ou du comportement de compactage
title: "Utilisation des tokens et coûts"
---

# Utilisation des tokens et coûts

OpenClaw suit les **tokens**, et non les caractères. Les tokens sont spécifiques au modèle, mais la plupart des modèles de style OpenAI comptent en moyenne ~4 caractères par token pour le texte anglais.

## Comment le prompt système est construit

OpenClaw assemble son propre prompt système à chaque exécution. Il comprend :

- Liste des outils + courtes descriptions
- Liste des Skills (métadonnées uniquement ; les instructions sont chargées à la demande avec `read`)
- Instructions de mise à jour automatique
- Espace de travail + fichiers d'amorçage (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` lorsqu'ils sont nouveaux, plus `MEMORY.md` lorsqu'il est présent ou `memory.md` comme solution de repli en minuscules). Les fichiers volumineux sont tronqués par `agents.defaults.bootstrapMaxChars` (par défaut : 20000), et l'injection totale d'amorçage est plafonnée par `agents.defaults.bootstrapTotalMaxChars` (par défaut : 150000). Les fichiers `memory/*.md` sont à la demande via les outils de mémoire et ne sont pas injectés automatiquement.
- Heure (UTC + fuseau horaire de l'utilisateur)
- Balises de réponse + comportement de heartbeat
- Métadonnées d'exécution (hôte/OS/modèle/réflexion)

Voir le récapitulatif complet dans [System Prompt](/fr/concepts/system-prompt).

## Ce qui compte dans la fenêtre de contexte

Tout ce que reçoit le modèle compte vers la limite de contexte :

- Prompt système (toutes les sections listées ci-dessus)
- Historique de la conversation (messages utilisateur + assistant)
- Appels d'outils et résultats des outils
- Pièces jointes/transcriptions (images, audio, fichiers)
- Résumés de compactage et artefacts d'élagage
- Enveloppes de fournisseur ou en-têtes de sécurité (non visibles, mais toujours comptés)

Pour les images, OpenClaw réduit la résolution des charges utiles d'image de transcription/outil avant les appels au fournisseur.
Utilisez `agents.defaults.imageMaxDimensionPx` (par défaut : `1200`) pour ajuster cela :

- Des valeurs plus basses réduisent généralement l'utilisation des tokens de vision et la taille de la charge utile.
- Des valeurs plus élevées préservent plus de détails visuels pour les captures d'écran lourdes en OCR/UI.

Pour une ventilation pratique (par fichier injecté, outils, compétences et taille du prompt système), utilisez `/context list` ou `/context detail`. Voir [Context](/fr/concepts/context).

## Comment voir l'utilisation actuelle des jetons

Utilisez ceci dans le chat :

- `/status` → **carte de statut riche en emojis** avec le modèle de session, l'utilisation du contexte,
  les jetons d'entrée/sortie de la dernière réponse et le **coût estimé** (clé API uniquement).
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

## Impact du TTL du cache et de l'élagage

La mise en cache du prompt du fournisseur ne s'applique que dans la fenêtre du TTL du cache. OpenClaw peut
facultativement exécuter **l'élagage du cache-ttl** : il élagage la session une fois le TTL du cache
expiré, puis réinitialise la fenêtre du cache pour que les demandes suivantes puissent réutiliser le
contexte nouvellement mis en cache au lieu de remettre en cache l'historique complet. Cela permet de maintenir les coûts d'écriture du cache
plus bas lorsqu'une session reste inactive au-delà du TTL.

Configurez-le dans [Gateway configuration](/fr/gateway/configuration) et consultez les
détails du comportement dans [Session pruning](/fr/concepts/session-pruning).

Le heartbeat peut garder le cache **à chaud** pendant les périodes d'inactivité. Si le TTL du cache de votre modèle
est `1h`, définir l'intervalle du heartbeat juste en dessous (par exemple, `55m`) peut éviter
de remettre en cache le prompt complet, réduisant ainsi les coûts d'écriture du cache.

Dans les configurations multi-agents, vous pouvez conserver une configuration de modèle partagée et ajuster le comportement du cache par agent avec `agents.list[].params.cacheRetention`.

Pour un guide détaillé de tous les paramètres, consultez [Mise en cache du prompt](/fr/reference/prompt-caching).

Pour la tarification de l'Anthropic API, les lectures du cache sont considérablement moins chères que les jetons d'entrée, tandis que les écritures du cache sont facturées avec un multiplicateur plus élevé. Consultez la tarification de mise en cache du prompt de Anthropic pour les derniers tarifs et multiplicateurs TTL :
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Exemple : garder le cache chaud pendant 1h avec un heartbeat

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

### Exemple : trafic mixte avec une stratégie de cache par agent

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # default baseline for most agents
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # keep long cache warm for deep sessions
    - id: "alerts"
      params:
        cacheRetention: "none" # avoid cache writes for bursty notifications
```

`agents.list[].params` fusionne par-dessus les `params` du modèle sélectionné, vous pouvez donc remplacer uniquement `cacheRetention` et hériter des autres paramètres par défaut du modèle sans modification.

### Exemple : activer l'en-tête bêta de contexte 1M Anthropic

La fenêtre de contexte de 1M de Anthropic est actuellement restreinte à la version bêta. OpenClaw peut injecter la valeur requise `anthropic-beta` lorsque vous activez `context1m` sur les modèles Opus ou Sonnet pris en charge.

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

Cela correspond à l'en-tête bêta `context-1m-2025-08-07` de Anthropic.

Cela ne s'applique que lorsque `context1m: true` est défini sur cette entrée de modèle.

Condition requise : les identifiants doivent être éligibles pour l'utilisation d'un contexte long (facturation de clé API, ou abonnement avec l'Extra Usage activé). Dans le cas contraire, Anthropic répond avec `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Si vous authentifiez Anthropic avec des jetons OAuth/d'abonnement (`sk-ant-oat-*`), OpenClaw ignore l'en-tête bêta `context-1m-*` car Anthropic rejette actuellement cette combinaison avec une erreur HTTP 401.

## Conseils pour réduire la pression sur les jetons

- Utilisez `/compact` pour résumer les longues sessions.
- Raccourcissez les sorties volumineuses des outils dans vos flux de travail.
- Baissez `agents.defaults.imageMaxDimensionPx` pour les sessions avec de nombreuses captures d'écran.
- Gardez les descriptions des compétences courtes (la liste des compétences est injectée dans le prompt).
- Préférez des modèles plus petits pour un travail verbeux et exploratoire.

Consultez [Compétences](/fr/tools/skills) pour la formule exacte de la surcharge de la liste des compétences.

import fr from "/components/footer/fr.mdx";

<fr />
