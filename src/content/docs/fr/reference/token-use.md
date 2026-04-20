---
summary: "Comment OpenClaw construit le contexte du prompt et signale l'utilisation des jetons + les coûts"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Utilisation des jetons et coûts"
---

# Utilisation des jetons et coûts

OpenClaw suit les **tokens**, et non les caractères. Les tokens sont spécifiques au modèle, mais la plupart des modèles de style OpenAI ont une moyenne d'environ 4 caractères par token pour le texte anglais.

## Comment le prompt système est construit

OpenClaw assemble son propre prompt système à chaque exécution. Il inclut :

- Liste des outils + descriptions courtes
- Liste des compétences (uniquement les métadonnées ; les instructions sont chargées à la demande avec `read`).
  Le bloc de compétences compact est délimité par `skills.limits.maxSkillsPromptChars`,
  avec une option de remplacement par agent à
  `agents.list[].skillsLimits.maxSkillsPromptChars`.
- Instructions de mise à jour automatique
- Fichiers d'espace de travail + d'amorçage (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` lorsqu'ils sont nouveaux, plus `MEMORY.md` si présent ou `memory.md` comme solution de repli en minuscules). Les fichiers volumineux sont tronqués par `agents.defaults.bootstrapMaxChars` (par défaut : 12000), et l'injection totale d'amorçage est plafonnée par `agents.defaults.bootstrapTotalMaxChars` (par défaut : 60000). Les fichiers quotidiens `memory/*.md` ne font pas partie du prompt d'amorçage normal ; ils restent à la demande via les outils de mémoire lors des tours ordinaires, mais `/new` et `/reset` nus peuvent prépendre un bloc de contexte de démarrage unique avec la mémoire quotidienne récente pour ce premier tour. Ce prélude de démarrage est contrôlé par `agents.defaults.startupContext`.
- Heure (UTC + fuseau horaire de l'utilisateur)
- Balises de réponse + comportement de pulsation
- Métadonnées d'exécution (hôte/SE/modèle/réflexion)

Voir la répartition complète dans [Prompt système](/en/concepts/system-prompt).

## Ce qui compte dans la fenêtre de contexte

Tout ce que le modèle reçoit compte vers la limite de contexte :

- Prompt système (toutes les sections listées ci-dessus)
- Historique de la conversation (messages utilisateur + assistant)
- Appels d'outils et résultats d'outils
- Pièces jointes/transcriptions (images, audio, fichiers)
- Résumés de compactage et artefacts d'élagage
- Fournisseurs d'enveloppes ou en-têtes de sécurité (non visibles, mais toujours comptés)

Certaines surfaces gourmandes en runtime ont leurs propres limites explicites :

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

Les redéfinitions par agent se trouvent sous `agents.list[].contextLimits`. Ces boutons de réglage sont destinés aux extraits de runtime délimités et aux blocs injectés appartenant au runtime. Ils sont distincts des limites de bootstrap, des limites de contexte de démarrage et des limites de prompt de compétences.

Pour les images, OpenClaw réduit la résolution des charges utiles d'images de transcription/outils avant les appels au fournisseur. Utilisez `agents.defaults.imageMaxDimensionPx` (par défaut : `1200`) pour ajuster ceci :

- Des valeurs plus faibles réduisent généralement l'utilisation de tokens de vision et la taille de la charge utile.
- Des valeurs plus élevées préservent plus de détails visuels pour les captures d'écran lourdes en OCR/interface.

Pour une répartition pratique (par fichier injecté, outils, compétences et taille du prompt système), utilisez `/context list` ou `/context detail`. Voir [Context](/en/concepts/context).

## Comment voir l'utilisation actuelle des tokens

Utilisez ceux-ci dans le chat :

- `/status` → **carte de statut riche en emojis** avec le model de session, l'utilisation du contexte, les tokens d'entrée/sortie de la dernière réponse, et le **coût estimé** (clé API uniquement).
- `/usage off|tokens|full` → ajoute un **pied de page d'utilisation par réponse** à chaque réponse.
  - Persiste par session (stocké sous `responseUsage`).
  - L'authentification OAuth **masque le coût** (tokens uniquement).
- `/usage cost` → affiche un résumé local des coûts à partir des journaux de session OpenClaw.

Autres surfaces :

- **TUI/Web TUI :** `/status` + `/usage` sont pris en charge.
- **CLI :** `openclaw status --usage` et `openclaw channels list` affichent les fenêtres de quota normalisées par fournisseur (`X% left`, et non les coûts par réponse). Fournisseurs actuels de fenêtres d'utilisation : Anthropic, GitHub Copilot, Gemini CLI, OpenAI Codex, MiniMax, Xiaomi et z.ai.

Les surfaces d'utilisation normalisent les alias de champ natifs courants du fournisseur avant l'affichage.
Pour le trafic Responses de la famille OpenAI, cela inclut à la fois `input_tokens` /
`output_tokens` et `prompt_tokens` / `completion_tokens`, de sorte que les noms de champ
spécifiques au transport ne modifient pas `/status`, `/usage` ou les résumés de session.
L'utilisation JSON du CLI Gemini est également normalisée : le texte de réponse provient de `response`, et
`stats.cached` correspond à `cacheRead` avec `stats.input_tokens - stats.cached`
utilisé lorsque le CLI omet un champ `stats.input` explicite.
Pour le trafic Responses natif de la famille OpenAI, les alias d'utilisation WebSocket/SSE sont
normalisés de la même manière, et les totaux reviennent à l'entrée + la sortie normalisées lorsque
`total_tokens` est manquant ou `0`.
Lorsque l'instantané de la session actuelle est clairsemé, `/status` et `session_status` peuvent
également récupérer les compteurs de jetons/cache et l'étiquette du modèle d'exécution actif à partir du
journal d'utilisation de la transcription le plus récent. Les valeurs non nulles existantes en direct prennent
déjà le pas sur les valeurs de secours de la transcription, et les totaux de transcription orientés prompt
plus importants peuvent l'emporter lorsque les totaux stockés sont manquants ou plus petits.
L'autorisation d'utilisation pour les fenêtres de quota de fournisseur provient de crochets spécifiques au fournisseur lorsque
disponibles ; sinon OpenClaw revient à faire correspondre les identifiants OAuth/clé API
à partir des profils d'auth, de l'env, ou de la configuration.

## Estimation des coûts (lorsqu'elle est affichée)

Les coûts sont estimés à partir de votre configuration de tarification du modèle :

```
models.providers.<provider>.models[].cost
```

Ce sont des **USD par 1M de jetons** pour `input`, `output`, `cacheRead` et
`cacheWrite`. Si la tarification est manquante, OpenClaw n'affiche que les jetons. Les jetons OAuth
n'affichent jamais le coût en dollars.

## Impact du TTL du cache et de l'élagage

La mise en cache du prompt par le fournisseur ne s'applique que dans la fenêtre du TTL du cache. OpenClaw peut
optionnellement exécuter l'**élagage du cache-ttl** : il élagage la session une fois le TTL du cache
expiré, puis réinitialise la fenêtre du cache afin que les requêtes ultérieures puissent réutiliser le
contexte nouvellement mis en cache au lieu de remettre en cache l'historique complet. Cela permet de maintenir les coûts d'écriture du cache
plus bas lorsqu'une session reste inactive au-delà du TTL.

Configurez-le dans la [configuration du Gateway](/en/gateway/configuration) et consultez les
détails du comportement dans [Session pruning](/en/concepts/session-pruning).

Le heartbeat peut maintenir le cache **à chaud** pendant les périodes d'inactivité. Si le TTL du cache de votre modèle
est `1h`, définir l'intervalle de heartbeat juste en dessous (par exemple, `55m`) peut éviter
de remettre en cache le prompt complet, réduisant ainsi les coûts d'écriture du cache.

Dans les configurations multi-agent, vous pouvez conserver une configuration de modèle partagée et ajuster le comportement du cache
par agent avec `agents.list[].params.cacheRetention`.

Pour un guide détaillé de tous les paramètres, consultez [Prompt Caching](/en/reference/prompt-caching).

Pour la tarification de l'Anthropic API, les lectures de cache sont nettement moins chères que les jetons
d'entrée, tandis que les écritures de cache sont facturées avec un multiplicateur plus élevé. Consultez la tarification
du prompt caching de Anthropic pour les derniers tarifs et les multiplicateurs TTL :
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Example: keep 1h cache warm with heartbeat

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

### Example: mixed traffic with per-agent cache strategy

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

`agents.list[].params` fusionne au-dessus du `params` du modèle sélectionné, vous pouvez donc
ne remplacer que `cacheRetention` et hériter des autres valeurs par défaut du modèle inchangées.

### Example: enable Anthropic 1M context beta header

La fenêtre de contexte de 1M de Anthropic est actuellement en version bêta restreinte. OpenClaw peut injecter la
valeur requise `anthropic-beta` lorsque vous activez `context1m` sur les modèles Opus
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

Condition requise : les identifiants doivent être éligibles pour l'utilisation d'un contexte long. Sinon,
Anthropic répond avec une erreur de limite de taux côté fournisseur pour cette requête.

Si vous authentifiez Anthropic avec des jetons OAuth/d'abonnement (`sk-ant-oat-*`),
OpenClaw ignore l'en-tête bêta `context-1m-*` car Anthropic rejette actuellement
cette combinaison avec une erreur HTTP 401.

## Tips for reducing token pressure

- Utilisez `/compact` pour résumer les sessions longues.
- Coupez les grandes sorties d'outils dans vos workflows.
- Baissez `agents.defaults.imageMaxDimensionPx` pour les sessions avec beaucoup de captures d'écran.
- Gardez les descriptions des compétences courtes (la liste des compétences est injectée dans le prompt).
- Préférez des modèles plus petits pour un travail verbeux et exploratoire.

Voir [Skills](/en/tools/skills) pour la formule exacte de la surcharge de la liste des compétences.
