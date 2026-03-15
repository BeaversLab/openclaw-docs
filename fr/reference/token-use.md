---
summary: "Comment OpenClaw construit le contexte du prompt et rapporte l'utilisation des tokens + les coûts"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Utilisation et coûts des tokens"
---

# Utilisation et coûts des tokens

OpenClaw suit les **tokens**, et non les caractères. Les tokens sont spécifiques au modèle, mais la plupart
des modèles de type OpenAI atteignent une moyenne d'environ 4 caractères par token pour le texte en anglais.

## Construction du prompt système

OpenClaw assemble son propre prompt système à chaque exécution. Il inclut :

- Liste des outils + descriptions courtes
- Liste des compétences (uniquement les métadonnées ; les instructions sont chargées à la demande avec `read`)
- Instructions de mise à jour automatique
- Fichiers d'espace de travail + d'amorçage (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` lorsqu'ils sont nouveaux, plus `MEMORY.md` si présent ou `memory.md` comme alternative en minuscules). Les fichiers volumineux sont tronqués par `agents.defaults.bootstrapMaxChars` (par défaut : 20000), et l'injection totale d'amorçage est plafonnée par `agents.defaults.bootstrapTotalMaxChars` (par défaut : 150000). Les fichiers `memory/*.md` sont à la demande via les outils de mémoire et ne sont pas injectés automatiquement.
- Heure (UTC + fuseau horaire de l'utilisateur)
- Balises de réponse + comportement de heartbeat
- Métadonnées d'exécution (hôte/OS/modèle/réflexion)

Voir la répartition complète dans [Prompt système](/fr/concepts/system-prompt).

## Ce qui compte dans la fenêtre de contexte

Tout ce que le modèle reçoit compte vers la limite de contexte :

- Prompt système (toutes les sections listées ci-dessus)
- Historique de la conversation (messages utilisateur + assistant)
- Appels d'outils et résultats d'outils
- Pièces jointes/transcriptions (images, audio, fichiers)
- Résumés de compactage et artefacts d'élagage
- En-têtes de wrapper ou de sécurité du fournisseur (non visibles, mais toujours comptés)

Pour les images, OpenClaw réduit la charge utile des images de transcription/outils avant les appels au fournisseur.
Utilisez `agents.defaults.imageMaxDimensionPx` (par défaut : `1200`) pour ajuster ceci :

- Des valeurs plus faibles réduisent généralement l'utilisation des tokens de vision et la taille de la charge utile.
- Des valeurs plus élevées préservent plus de détails visuels pour les captures d'écran lourdes en OCR/interface utilisateur.

Pour une ventilation pratique (par fichier injecté, outils, compétences et taille du prompt système), utilisez `/context list` ou `/context detail`. Voir [Context](/fr/concepts/context).

## Comment voir l'utilisation actuelle des tokens

Utilisez ceux-ci dans le chat :

- `/status` → **carte de statut riche en emojis** avec le model de session, l'utilisation du contexte,
  les tokens d'entrée/sortie de la dernière réponse et le **coût estimé** (clé API uniquement).
- `/usage off|tokens|full` → ajoute un **pied de page d'utilisation par réponse** à chaque réponse.
  - Persiste par session (stocké sous `responseUsage`).
  - L'authentification OAuth **masque le coût** (tokens uniquement).
- `/usage cost` → affiche un résumé local des coûts à partir des journaux de session OpenClaw.

Autres interfaces :

- **TUI/Web TUI :** `/status` + `/usage` sont pris en charge.
- **CLI :** `openclaw status --usage` et `openclaw channels list` affichent
  les fenêtres de quota du provider (pas les coûts par réponse).

## Estimation des coûts (lorsqu'elle est affichée)

Les coûts sont estimés à partir de votre configuration de tarification des modèles :

```
models.providers.<provider>.models[].cost
```

Il s'agit de **USD par 1M de tokens** pour `input`, `output`, `cacheRead` et
`cacheWrite`. Si la tarification est manquante, OpenClaw affiche uniquement les tokens. Les tokens OAuth
n'affichent jamais le coût en dollars.

## Impact du cache TTL et de l'élagage

La mise en cache du prompt par le provider ne s'applique que dans la fenêtre du cache TTL. OpenClaw peut
optionnellement exécuter l'**élagage du cache TTL** : il élagage la session une fois le cache TTL
expiré, puis réinitialise la fenêtre de cache afin que les requêtes ultérieures puissent réutiliser le
contexte fraîchement mis en cache au lieu de remettre en cache l'historique complet. Cela permet de maintenir les coûts d'écriture du cache
plus bas lorsqu'une session reste inactive au-delà du TTL.

Configurez-le dans [Gateway configuration](/fr/gateway/configuration) et consultez les
détails du comportement dans [Session pruning](/fr/concepts/session-pruning).

Le battement de cœur (heartbeat) peut garder le cache **à chaud** pendant les périodes d'inactivité. Si le TTL du cache de votre modèle est `1h`, définir l'intervalle de battement juste en dessous (par exemple, `55m`) permet d'éviter de recacher l'invite complète, réduisant ainsi les coûts d'écriture du cache.

Dans les configurations multi-agents, vous pouvez conserver une configuration de modèle partagée et ajuster le comportement du cache par agent avec `agents.list[].params.cacheRetention`.

Pour un guide détaillé de chaque paramètre, consultez [Mise en cache de l'invite (Prompt Caching)](/fr/reference/prompt-caching).

Pour la tarification de l'API Anthropic, les lectures de cache sont nettement moins chères que les tokens d'entrée, tandis que les écritures de cache sont facturées avec un multiplicateur plus élevé. Consultez la tarification de la mise en cache de l'invite de API pour les derniers taux et multiplicateurs TTL :
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Exemple : garder le cache de 1h à chaud avec le battement de cœur

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

`agents.list[].params` fusionne par-dessus le `params` du modèle sélectionné, vous pouvez donc remplacer uniquement `cacheRetention` et hériter des autres paramètres par défaut du modèle sans modification.

### Exemple : activer l'en-tête bêta du contexte 1M Anthropic

La fenêtre de contexte de 1M de Anthropic est actuellement soumise à une restriction bêta. OpenClaw peut injecter la valeur `anthropic-beta` requise lorsque vous activez `context1m` sur les modèles Opus ou Sonnet pris en charge.

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

Cela correspond à l'en-tête bêta `context-1m-2025-08-07` de Anthropic.

Cela ne s'applique que lorsque `context1m: true` est défini pour cette entrée de modèle.

Condition requise : les identifiants doivent être éligibles pour une utilisation à long contexte (facturation par clé API ou abonnement avec l'Extra Usage activé). Sinon, Anthropic répond avec `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Si vous authentifiez Anthropic avec des jetons OAuth/d'abonnement (`sk-ant-oat-*`),
OpenClaw ignore l'en-tête bêta `context-1m-*` car Anthropic rejette actuellement cette combinaison avec une erreur HTTP 401.

## Conseils pour réduire la pression sur les tokens

- Utilisez `/compact` pour résumer les longues sessions.
- Coupez les sorties d'outil volumineuses dans vos flux de travail.
- Baissez `agents.defaults.imageMaxDimensionPx` pour les sessions riches en captures d'écran.
- Gardez les descriptions des compétences courtes (la liste des compétences est injectée dans le prompt).
- Préférez des modèles plus petits pour un travail verbeux et exploratoire.

Voir [Skills](/fr/tools/skills) pour la formule exacte de la surcharge de la liste des compétences.

import fr from '/components/footer/fr.mdx';

<fr />
