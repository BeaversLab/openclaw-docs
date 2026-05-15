---
summary: "Comment OpenClaw construit le contexte du prompt et signale l'utilisation des jetons + les coûts"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Utilisation des tokens et coûts"
---

OpenClaw suit les **tokens**, et non les caractères. Les tokens sont spécifiques au modèle, mais la plupart des modèles de style OpenAI affichent une moyenne d'environ 4 caractères par token pour le texte en anglais.

## Comment le prompt système est construit

OpenClaw assemble son propre prompt système à chaque exécution. Il inclut :

- Liste des outils + descriptions courtes
- Liste des compétences (uniquement les métadonnées ; les instructions sont chargées à la demande avec `read`).
  Le bloc de compétences compact est délimité par `skills.limits.maxSkillsPromptChars`,
  avec une option de remplacement par agent à
  `agents.list[].skillsLimits.maxSkillsPromptChars`.
- Instructions de mise à jour automatique
- Espace de travail + fichiers d'amorçage (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` lors de leur création, plus `MEMORY.md` si présent). La racine en minuscules `memory.md` n'est pas injectée ; il s'agit d'une entrée de réparation d'ancienne génération pour `openclaw doctor --fix` lorsqu'elle est associée à `MEMORY.md`. Les fichiers volumineux sont tronqués par `agents.defaults.bootstrapMaxChars` (par défaut : 12000), et l'injection totale d'amorçage est plafonnée par `agents.defaults.bootstrapTotalMaxChars` (par défaut : 60000). Les fichiers quotidiens `memory/*.md` ne font pas partie du prompt d'amorçage normal ; ils restent à la demande via les outils de mémoire lors des tours ordinaires, mais les exécutions de modèle de réinitialisation/démarrage peuvent ajouter en préambule un bloc de contexte de démarrage ponctuel avec la mémoire quotidienne récente pour ce premier tour. Les commandes de chat nu `/new` et `/reset` sont reconnues sans invoquer le modèle. Le prélude de démarrage est contrôlé par `agents.defaults.startupContext`.
- Heure (UTC + fuseau horaire de l'utilisateur)
- Balises de réponse + comportement de heartbeat
- Métadonnées d'exécution (hôte/SE/modèle/réflexion)

Voir la répartition complète dans [Prompt système](/fr/concepts/system-prompt).

## Ce qui compte dans la fenêtre de contexte

Tout ce que le modèle reçoit compte vers la limite de contexte :

- Prompt système (toutes les sections listées ci-dessus)
- Historique des conversations (messages utilisateur + assistant)
- Appels d'outils et résultats d'outils
- Pièces jointes/transcriptions (images, audio, fichiers)
- Résumés de compactage et artefacts d'élagage
- Wrappers de fournisseur ou en-têtes de sécurité (non visibles, mais toujours comptés)

Certaines surfaces gourmandes en ressources d'exécution ont leurs propres limites explicites :

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

Les redéfinitions par agent se trouvent sous `agents.list[].contextLimits`. Ces commandes sont destinées aux extraits d'exécution délimités et aux blocs injectés appartenant à l'exécution. Elles sont distinctes des limites de bootstrap, des limites de contexte de démarrage et des limites du prompt des compétences.

Pour les images, OpenClaw réduit la taille des charges utiles d'images de transcription/outil avant les appels au fournisseur. Utilisez `agents.defaults.imageMaxDimensionPx` (défaut : `1200`) pour régler ceci :

- Des valeurs plus faibles réduisent généralement l'utilisation des tokens de vision et la taille de la charge utile.
- Des valeurs plus élevées préservent plus de détails visuels pour les captures d'écran lourdes en OCR/interface.

Pour une répartition pratique (par fichier injecté, outils, compétences et taille du prompt système), utilisez `/context list` ou `/context detail`. Voir [Contexte](/fr/concepts/context).

## Comment voir l'utilisation actuelle des tokens

Utilisez ceux-ci dans le chat :

- `/status` → **carte de statut riche en emojis** avec le modèle de session, l'utilisation du contexte, les derniers tokens d'entrée/sortie de réponse, et **coût estimé** (clé API uniquement).
- `/usage off|tokens|full` → ajoute un **pied de page d'utilisation par réponse** à chaque réponse.
  - Persiste par session (stocké sous `responseUsage`).
  - L'auth OAuth **masque le coût** (tokens uniquement).
- `/usage cost` → affiche un résumé local des coûts à partir des journaux de session OpenClaw.

Autres surfaces :

- **TUI/Web TUI :** `/status` + `/usage` sont pris en charge.
- **CLI :** CLI`openclaw status --usage` et `openclaw channels list` affichent les fenêtres de quota fournisseur normalisées (`X% left`AnthropicGitHubCLIOpenAIMiniMaxXiaomi, et non les coûts par réponse). Fournisseurs de fenêtres d'utilisation actuels : Anthropic, GitHub Copilot, Gemini CLI, OpenAI Codex, MiniMax, Xiaomi et z.ai.

Les surfaces d'utilisation normalisent les alias de champs natifs courants du fournisseur avant l'affichage.
Pour le trafic Responses de la famille OpenAI, cela inclut à la fois `input_tokens` /
`output_tokens` et `prompt_tokens` / `completion_tokens`, de sorte que les noms de champs
spécifiques au transport ne modifient pas `/status`, `/usage` ou les résumés de session.
L'utilisation JSON de la CLI Gemini est également normalisée : le texte de la réponse provient de `response`, et
`stats.cached` correspond à `cacheRead` avec `stats.input_tokens - stats.cached`
utilisé lorsque la CLI omet un champ explicite `stats.input`.
Pour le trafic Responses natif de la famille OpenAI, les alias d'utilisation WebSocket/SSE sont
normalisés de la même manière, et les totaux reviennent à une entrée + sortie normalisée lorsque
`total_tokens` est manquant ou `0`.
Lorsque l'instantané de la session actuelle est clairsemé, `/status` et `session_status` peuvent
également récupérer les compteurs de jetons/cache et l'étiquette du modèle d'exécution actif à partir du
journal d'utilisation de la transcription le plus récent. Les valeurs existantes non nulles en direct
ont toujours la priorité sur les valeurs de repli de la transcription, et les totaux de transcription
orientés prompt peuvent l'emporter lorsque les totaux stockés sont manquants ou plus petits.
L'authentification d'utilisation pour les fenêtres de quota de fournisseur provient de hooks spécifiques
au fournisseur lorsque disponibles ; sinon OpenClaw revient à la correspondance des identifiants
OAuth/API-key à partir des profils d'authentification, des variables d'environnement ou de la configuration.
Les entrées de transcription de l'assistant conservent la même forme d'utilisation normalisée, y compris
`usage.cost` lorsque le modèle actif a une tarification configurée et que le fournisseur
renvoie des métadonnées d'utilisation. Cela donne `/usage cost` et à l'état de session
basé sur la transcription une source stable même après la disparition de l'état d'exécution en direct.

OpenClaw conserve la comptabilité de l'utilisation du fournisseur séparée de l'instantané du contexte actuel. Le OpenClaw`usage.total` du fournisseur peut inclure l'entrée mise en cache, la sortie et plusieurs appels de `context.used` en boucle d'outil, il est donc utile pour les coûts et la télémétrie mais peut surestimer la fenêtre de contexte en direct. Les affichages contextuels et les diagnostics utilisent le dernier instantané de prompt (`promptTokens`, ou le dernier appel de modèle lorsqu'aucun instantané de prompt n'est disponible) pour `context.used`.

## Estimation des coûts (lorsqu'elle est affichée)

Les coûts sont estimés à partir de votre configuration de tarification du modèle :

```
models.providers.<provider>.models[].cost
```

Il s'agit de **USD par 1M de tokens** pour `input`, `output`, `cacheRead` et `cacheWrite`OpenClaw. Si la tarification est manquante, OpenClaw affiche uniquement les tokens. Les tokens OAuth n'affichent jamais le coût en dollars.

Une fois que les sidecars et les canaux atteignent le chemin prêt du GatewayOpenClaw, OpenClaw démarre un bootstrap de tarification en arrière-plan facultatif pour les références de modèle configurées qui n'ont pas déjà de tarification locale. Ce bootstrap récupère les catalogues de tarification distants de OpenRouter et LiteLLM. Définissez `models.pricing.enabled: false` pour ignorer ces récupérations de catalogue sur les réseaux hors ligne ou restreints ; les entrées explicites `models.providers.*.models[].cost` continuent de piloter les estimations de coûts locaux.

## Impact du TTL du cache et de l'élagage

La mise en cache du prompt du fournisseur ne s'applique que dans la fenêtre du TTL du cache. OpenClaw peut éventuellement exécuter l'**élagage du cache-ttl** : il élagage la session une fois le TTL du cache expiré, puis réinitialise la fenêtre du cache afin que les demandes ultérieures puissent réutiliser le contexte nouvellement mis en cache au lieu de remettre en cache l'historique complet. Cela permet de maintenir les coûts d'écriture du cache plus faibles lorsqu'une session reste inactive au-delà du TTL.

Configurez-le dans la [configuration du Gateway](/fr/gateway/configuration) et consultez les détails du comportement dans [Élagage de session](/fr/concepts/session-pruning).

Le battement de cœur (heartbeat) peut maintenir le cache **à chaud** pendant les périodes d'inactivité. Si le TTL de votre cache de modèle est `1h`, définir l'intervalle de battement de cœur juste en dessous (par exemple, `55m`) peut éviter de remettre en cache le prompt complet, réduisant ainsi les coûts d'écriture du cache.

Dans les configurations multi-agents, vous pouvez conserver une seule configuration de modèle partagée et régler le comportement du cache par agent avec `agents.list[].params.cacheRetention`.

Pour un guide détaillé bouton par bouton, consultez [Mise en cache des prompts](/fr/reference/prompt-caching).

Pour la tarification de l'API AnthropicAPI, les lectures du cache sont nettement moins chères que les jetons d'entrée, tandis que les écritures dans le cache sont facturées avec un multiplicateur plus élevé. Consultez la tarification du cache de prompt de Anthropic pour les derniers tarifs et multiplicateurs TTL :
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

`agents.list[].params` fusionne par-dessus `params` du modèle sélectionné, vous pouvez donc remplacer uniquement `cacheRetention` et hériter des autres valeurs par défaut du modèle sans changement.

### Exemple : activer l'en-tête bêta de contexte 1M Anthropic

La fenêtre de contexte de 1M de Anthropic est actuellement en version bêta restreinte. OpenClaw peut injecter la valeur `anthropic-beta` requise lorsque vous activez `context1m` sur les modèles Opus ou Sonnet pris en charge.

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

Cela correspond à l'en-tête bêta `context-1m-2025-08-07` de Anthropic.

Cela s'applique uniquement lorsque `context1m: true` est défini pour cette entrée de modèle.

Condition requise : les identifiants doivent être éligibles pour l'utilisation d'un contexte long. Sinon,
Anthropic répond par une erreur de limitation de débit côté fournisseur pour cette demande.

Si vous authentifiez Anthropic avec des jetons d'abonnement/OAuth (`sk-ant-oat-*`),
OpenClaw ignore l'en-tête bêta `context-1m-*` car Anthropic rejette actuellement cette combinaison avec une erreur HTTP 401.

## Conseils pour réduire la pression sur les jetons

- Utilisez `/compact` pour résumer les longues sessions.
- Coupez les grandes sorties d'outils dans vos workflows.
- Abaissez `agents.defaults.imageMaxDimensionPx` pour les sessions avec de nombreuses captures d'écran.
- Gardez les descriptions des compétences courtes (la liste des compétences est injectée dans le prompt).
- Préférez des modèles plus petits pour un travail verbeux et exploratoire.

Voir [Skills](/fr/tools/skills) pour la formule exacte de la surcharge de liste de compétences.

## Connexes

- [Utilisation et coûts de l'API](API/en/reference/api-usage-costs)
- [Mise en cache du prompt](/fr/reference/prompt-caching)
- [Suivi de l'utilisation](/fr/concepts/usage-tracking)
