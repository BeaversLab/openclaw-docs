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

Voir la ventilation complète dans [System Prompt](/en/concepts/system-prompt).

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

Pour une ventilation pratique (par fichier injecté, outils, compétences et taille du prompt système), utilisez `/context list` ou `/context detail`. Voir [Context](/en/concepts/context).

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
  les fenêtres de quota fournisseur normalisées (`X% left`, et non les coûts par réponse).
  Fournisseurs de fenêtres d'utilisation actuels : Anthropic, GitHub Copilot, Gemini CLI,
  OpenAI Codex, MiniMax, Xiaomi et z.ai.

Les surfaces d'utilisation normalisent les alias de champs natifs courants des fournisseurs avant l'affichage.
Pour le trafic Responses de la famille OpenAI, cela inclut à la fois `input_tokens` /
`output_tokens` et `prompt_tokens` / `completion_tokens`, de sorte que les noms de champs spécifiques au transport
ne modifient pas `/status`, `/usage` ou les résumés de session.
L'utilisation JSON de CLI est également normalisée : le texte de réponse provient de `response`, et
`stats.cached` correspond à `cacheRead` avec `stats.input_tokens - stats.cached`
utilisé lorsque la CLI omet un champ `stats.input` explicite.
Pour le trafic Responses natif de la famille OpenAI, les alias d'utilisation WebSocket/SSE sont
normalisés de la même manière, et les totaux reviennent à l'entrée + la sortie normalisées lorsque
`total_tokens` est manquant ou `0`.
Lorsque l'instantané de la session actuelle est clairsemé, `/status` et `session_status` peuvent
également récupérer les compteurs de jetons/cache et l'étiquette de modèle d'exécution actif à partir du
journal d'utilisation de la transcription le plus récent. Les valeurs live non nulles existantes prennent toujours
la priorité sur les valeurs de repli de la transcription, et les totaux de transcription orientés prompt
plus importants peuvent l'emporter lorsque les totaux stockés sont manquants ou plus petits.
L'authentification d'utilisation pour les fenêtres de quota fournisseur provient de crochets spécifiques au fournisseur lorsque
disponibles ; sinon OpenClaw revient à faire correspondre les informations d'identification OAuth/API-key
à partir des profils d'authentification, de l'environnement ou de la configuration.

## Estimation des coûts (lorsqu'elle est affichée)

Les coûts sont estimés à partir de votre configuration de tarification de modèle :

```
models.providers.<provider>.models[].cost
```

Ce sont des **USD par 1M de tokens** pour `input`, `output`, `cacheRead` et
`cacheWrite`. Si la tarification est manquante, OpenClaw n'affiche que les tokens. Les tokens OAuth
ne montrent jamais le coût en dollars.

## Impact du TTL du cache et de l'élagage

La mise en cache du prompt par le fournisseur ne s'applique que dans la fenêtre du TTL du cache. OpenClaw peut
optionnellement exécuter l'**élagage par TTL du cache** (cache-ttl pruning) : il élagage la session une fois le TTL du cache
expiré, puis réinitialise la fenêtre du cache pour que les requêtes suivantes puissent réutiliser le
contexte nouvellement mis en cache au lieu de remettre en cache l'historique complet. Cela permet de garder les coûts
d'écriture du cache plus faibles lorsqu'une session reste inactive au-delà du TTL.

Configurez-le dans [Gateway configuration](/en/gateway/configuration) et consultez les
détails du comportement dans [Session pruning](/en/concepts/session-pruning).

Le heartbeat peut garder le cache **à chaud** (warm) pendant les périodes d'inactivité. Si le TTL du cache de votre modèle
est `1h`, définir l'intervalle du heartbeat juste en dessous (par exemple, `55m`) peut éviter
de remettre en cache le prompt complet, réduisant ainsi les coûts d'écriture du cache.

Dans les configurations multi-agent, vous pouvez conserver une seule configuration de modèle partagée et régler le comportement du cache
par agent avec `agents.list[].params.cacheRetention`.

Pour un guide détaillé de chaque paramètre, voir [Prompt Caching](/en/reference/prompt-caching).

Pour la tarification de l'Anthropic API, les lectures de cache sont significativement moins chères que les tokens
d'entrée, tandis que les écritures de cache sont facturées avec un multiplicateur plus élevé. Voir la tarification de mise en cache
de prompt de Anthropic pour les derniers tarifs et multiplicateurs TTL :
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Exemple : garder le cache 1h à chaud avec heartbeat

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

`agents.list[].params` fusionne par-dessus `params` du modèle sélectionné, vous pouvez donc
ne remplacer que `cacheRetention` et hériter des autres valeurs par défaut du modèle sans modification.

### Exemple : activer l'en-tête bêta du contexte 1M Anthropic

La fenêtre de contexte de 1M de Anthropic est actuellement soumise à une version bêta restreinte. OpenClaw peut injecter la
valeur `anthropic-beta` requise lorsque vous activez `context1m` sur les modèles Opus
ou Sonnet pris en charge.

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

Exigence : les identifiants doivent être éligibles pour l'utilisation de contexte long (facturation par clé API, ou chemin de connexion Claude de OpenClaw avec Extra Usage activé). Si ce n'est pas le cas, Anthropic répond
avec `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Si vous authentifiez Anthropic avec des jetons OAuth/d'abonnement (`sk-ant-oat-*`),
OpenClaw ignore l'en-tête bêta `context-1m-*` car Anthropic rejette actuellement
cette combinaison avec une erreur HTTP 401.

## Conseils pour réduire la pression sur les jetons

- Utilisez `/compact` pour résumer les sessions longues.
- Raccourcissez les grandes sorties d'outils dans vos flux de travail.
- Abaissez `agents.defaults.imageMaxDimensionPx` pour les sessions avec de nombreuses captures d'écran.
- Gardez les descriptions de compétences courtes (la liste des compétences est injectée dans le prompt).
- Préférez des modèles plus petits pour un travail verbeux et exploratoire.

Consultez [Compétences](/en/tools/skills) pour connaître la formule exacte de la surcharge de la liste de compétences.
