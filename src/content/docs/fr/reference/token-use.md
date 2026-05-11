---
summary: "Comment OpenClaw construit le contexte du prompt et signale l'utilisation des jetons + les coûts"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Utilisation des tokens et coûts"
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
- Espace de travail + fichiers d'amorçage (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` lorsqu'ils sont nouveaux, plus `MEMORY.md` si présent). La racine en minuscules `memory.md` n'est pas injectée ; il s'agit d'une entrée de réparation héritée pour `openclaw doctor --fix` lorsqu'elle est associée à `MEMORY.md`. Les fichiers volumineux sont tronqués par `agents.defaults.bootstrapMaxChars` (par défaut : 12000), et l'injection totale d'amorçage est plafonnée par `agents.defaults.bootstrapTotalMaxChars` (par défaut : 60000). Les fichiers quotidiens `memory/*.md` ne font pas partie de l'invite d'amorçage normale ; ils restent à la demande via les outils de mémoire lors des tours ordinaires, mais `/new` et `/reset` seuls peuvent prépendre un bloc de contexte de démarrage unique avec la mémoire quotidienne récente pour ce premier tour. Ce prélude de démarrage est contrôlé par `agents.defaults.startupContext`.
- Heure (UTC + fuseau horaire de l'utilisateur)
- Balises de réponse + comportement de pulsation
- Métadonnées d'exécution (hôte/SE/modèle/réflexion)

Voir la répartition complète dans [Invite système](/fr/concepts/system-prompt).

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

Les redéfinitions par agent se trouvent sous `agents.list[].contextLimits`. Ces commandes sont destinées aux extraits d'exécution limités et aux blocs injectés détenus par l'exécution. Elles sont distinctes des limites d'amorçage, des limites de contexte de démarrage et des limites d'invite des compétences.

Pour les images, OpenClaw réduit les charges utiles d'images de transcription/outils avant les appels au fournisseur. Utilisez `agents.defaults.imageMaxDimensionPx` (par défaut : `1200`) pour ajuster ceci :

- Des valeurs plus faibles réduisent généralement l'utilisation de tokens de vision et la taille de la charge utile.
- Des valeurs plus élevées préservent plus de détails visuels pour les captures d'écran lourdes en OCR/interface.

Pour une répartition pratique (par fichier injecté, outils, compétences et taille de l'invite système), utilisez `/context list` ou `/context detail`. Voir [Contexte](/fr/concepts/context).

## Comment voir l'utilisation actuelle des tokens

Utilisez ceux-ci dans le chat :

- `/status` → **carte de statut riche en emojis** avec le modèle de session, l'utilisation du contexte, les derniers tokens d'entrée/sortie de réponse et **coût estimé** (clé API uniquement).
- `/usage off|tokens|full` → ajoute un **pied de page d'utilisation par réponse** à chaque réponse.
  - Persiste par session (stocké sous la forme de `responseUsage`).
  - L'authentification OAuth **masque le coût** (tokens uniquement).
- `/usage cost` → affiche un résumé local des coûts à partir des journaux de session OpenClaw.

Autres surfaces :

- **TUI/TUI Web :** `/status` + `/usage` sont pris en charge.
- **CLI :** `openclaw status --usage` et `openclaw channels list` affichent
  les fenêtres de quota de fournisseur normalisées (`X% left`, et non les coûts par réponse).
  Fournisseurs actuels de fenêtres d'utilisation : Anthropic, GitHub Copilot, Gemini CLI,
  OpenAI Codex, MiniMax, Xiaomi et z.ai.

Les surfaces d'utilisation normalisent les alias de champs natifs courants du fournisseur avant l'affichage.
Pour le trafic Responses de la famille OpenAI, cela inclut à la fois `input_tokens` /
`output_tokens` et `prompt_tokens` / `completion_tokens`, de sorte que les noms de champs
spécifiques au transport ne modifient pas `/status`, `/usage` ni les résumés de session.
L'utilisation JSON du CLI Gemini est également normalisée : le texte de la réponse provient de `response`, et
`stats.cached` correspond à `cacheRead` avec `stats.input_tokens - stats.cached`
utilisé lorsque le CLI omet un champ explicite `stats.input`.
Pour le trafic Responses natif de la famille OpenAI, les alias d'utilisation WebSocket/SSE sont
normalisés de la même manière, et les totaux reviennent à une entrée + sortie normalisée lorsque
`total_tokens` est manquant ou `0`.
Lorsque l'instantané de la session actuelle est peu dense, `/status` et `session_status` peuvent
également récupérer les compteurs de jetons/cache et l'étiquette du modèle d'exécution actif à partir du
journal d'utilisation de la transcription le plus récent. Les valeurs actives non nulles existantes prennent
déjà le pas sur les valeurs de repli de la transcription, et les totaux de transcription orientés prompt
peuvent l'emporter lorsque les totaux stockés sont manquants ou plus petits.
L'authentification d'utilisation pour les fenêtres de quota du fournisseur provient de crochets spécifiques au fournisseur lorsque
disponible ; sinon OpenClaw revient à la correspondance des identifiants OAuth/clé API
à partir des profils d'authentification, de l'environnement ou de la configuration.
Les entrées de transcription de l'assistant conservent la même forme d'utilisation normalisée, y compris
`usage.cost` lorsque le modèle actif a une tarification configurée et que le fournisseur
renvoie des métadonnées d'utilisation. Cela donne à `/usage cost` et à l'état de session soutenu par la transcription
une source stable même après la disparition de l'état d'exécution en direct.

OpenClaw conserve la comptabilité d'utilisation du fournisseur séparée de l'instantané du contexte actuel. Le `usage.total` du fournisseur peut inclure l'entrée mise en cache, la sortie et plusieurs appels de modèle en boucle d'outil, il est donc utile pour les coûts et la télémétrie mais peut surestimer la fenêtre de contexte active. Les affichages de contexte et les diagnostics utilisent le dernier instantané de prompt (`promptTokens`, ou le dernier appel de modèle lorsqu'aucun instantané de prompt n'est disponible) pour `context.used`.

## Estimation des coûts (lorsqu'elle est affichée)

Les coûts sont estimés à partir de votre configuration de tarification de modèle :

```
models.providers.<provider>.models[].cost
```

Il s'agit de **USD par 1M de tokens** pour `input`, `output`, `cacheRead` et `cacheWrite`. Si la tarification est manquante, OpenClaw affiche uniquement les tokens. Les jetons OpenClaw n'affichent jamais le coût en dollars.

## Impact du TTL du cache et de l'élagage

La mise en cache du prompt du fournisseur ne s'applique que dans la fenêtre du TTL du cache. OpenClaw peut éventuellement exécuter l'**élagage du cache-ttl** : il élagage la session une fois le TTL du cache expiré, puis réinitialise la fenêtre du cache afin que les demandes ultérieures puissent réutiliser le contexte nouvellement mis en cache au lieu de remettre en cache l'historique complet. Cela permet de maintenir les coûts d'écriture du cache plus faibles lorsqu'une session reste inactive au-delà du TTL.

Configurez-le dans la [configuration Gateway](/fr/gateway/configuration) et consultez les détails du comportement dans [Élagage de session](/fr/concepts/session-pruning).

Le battement de cœur (heartbeat) peut garder le cache **à chaud** pendant les périodes d'inactivité. Si le TTL du cache de votre modèle est `1h`, définir l'intervalle de battement de cœur juste en dessous (par exemple, `55m`) peut éviter de remettre en cache le prompt complet, réduisant ainsi les coûts d'écriture du cache.

Dans les configurations multi-agents, vous pouvez conserver une configuration de modèle partagée et ajuster le comportement du cache par agent avec `agents.list[].params.cacheRetention`.

Pour un guide détaillé bouton par bouton, voir [Mise en cache du prompt](/fr/reference/prompt-caching).

Pour la tarification de l'API Anthropic, les lectures de cache sont significativement moins chères que les tokens d'entrée, tandis que les écritures de cache sont facturées avec un multiplicateur plus élevé. Consultez la tarification de mise en cache du prompt de API pour les derniers taux et multiplicateurs de TTL :
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Exemple : garder le cache de 1h à chaud avec un battement de cœur

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

### Exemple : trafic mixte avec stratégie de cache par agent

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

`agents.list[].params` fusionne par-dessus le `params` du modèle sélectionné, vous pouvez donc
ne remplacer que `cacheRetention` et hériter des autres valeurs par défaut du modèle inchangées.

### Exemple : activer l'en-tête bêta de contexte 1M Anthropic

La fenêtre de contexte de 1M de Anthropic est actuellement en version bêta fermée. OpenClaw peut injecter la
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

Cela ne s'applique que lorsque `context1m: true` est défini sur cette entrée de modèle.

Condition requise : les identifiants doivent être éligibles pour l'utilisation d'un contexte long. Sinon,
Anthropic répond par une erreur de limitation de débit côté fournisseur pour cette demande.

Si vous authentifiez Anthropic avec des jetons OAuth/d'abonnement (`sk-ant-oat-*`),
OpenClaw ignore l'en-tête bêta `context-1m-*` car Anthropic rejette
currentement cette combinaison avec une erreur HTTP 401.

## Conseils pour réduire la pression sur les jetons

- Utilisez `/compact` pour résumer les longues sessions.
- Coupez les grandes sorties d'outils dans vos workflows.
- Baissez `agents.defaults.imageMaxDimensionPx` pour les sessions avec de nombreuses captures d'écran.
- Gardez les descriptions des compétences courtes (la liste des compétences est injectée dans le prompt).
- Préférez des modèles plus petits pour un travail verbeux et exploratoire.

Consultez [Compétences](/fr/tools/skills) pour la formule exacte de la surcharge de la liste des compétences.

## Connexes

- [Utilisation et coûts de l'API](/fr/reference/api-usage-costs)
- [Mise en cache du prompt](/fr/reference/prompt-caching)
- [Suivi de l'utilisation](/fr/concepts/usage-tracking)
