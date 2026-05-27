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

Voir la répartition complète dans [System Prompt](/fr/concepts/system-prompt).

Lors de la documentation des identifiants ou des extraits d'authentification, utilisez les
[Secret Placeholder Conventions](/fr/reference/secret-placeholder-conventions) pour
éviter les faux positifs des détecteurs de secrets lors des modifications de documentation uniquement.

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

Pour une répartition pratique (par fichier injecté, outils, compétences et taille du prompt système), utilisez `/context list` ou `/context detail`. Voir [Context](/fr/concepts/context).

## Comment voir l'utilisation actuelle des tokens

Utilisez ceux-ci dans le chat :

- `/status` → **carte de statut riche en emojis** avec le modèle de session, l'utilisation du contexte,
  les jetons d'entrée/sortie de la dernière réponse, et **coût estimé** lorsque la tarification locale est
  configurée pour le modèle actif.
- `/usage off|tokens|full` → ajoute un **pied de page d'utilisation par réponse** à chaque réponse.
  - Persiste par session (stocké sous la forme de `responseUsage`).
  - `/usage full` affiche le coût estimé uniquement lorsque OpenClaw dispose de métadonnées d'utilisation et
    d'une tarification locale pour le modèle actif. Sinon, il affiche uniquement les jetons.
- `/usage cost` → affiche un résumé local des coûts à partir des journaux de session OpenClaw.

Autres surfaces :

- **TUI/Web TUI :** `/status` + `/usage` sont pris en charge.
- **CLI :** `openclaw status --usage` et `openclaw channels list` affichent
  les fenêtres de quota normalisées par fournisseur (`X% left`, et non les coûts par réponse).
  Fournisseurs actuels à fenêtre d'utilisation : Anthropic, GitHub Copilot, Gemini CLI,
  OpenAI Codex, MiniMax, Xiaomi et z.ai.

Les surfaces d'utilisation normalisent les alias de champs natifs courants des fournisseurs avant l'affichage.
Pour le trafic Responses de la famille OpenAI, cela inclut à la fois `input_tokens` /
`output_tokens` et `prompt_tokens` / `completion_tokens`, de sorte que les noms de champs spécifiques au transport
ne changent pas `/status`, `/usage`, ou les résumés de session.
L'utilisation JSON de la CLI CLI est également normalisée : le texte de réponse provient de `response`, et
`stats.cached` correspond à `cacheRead` avec `stats.input_tokens - stats.cached`
utilisé lorsque la OpenAI omet un champ `stats.input` explicite.
Pour le trafic Responses natif de la famille OpenClaw, les alias d'utilisation WebSocket/SSE sont
normalisés de la même manière, et les totaux reviennent à une entrée + sortie normalisée lorsque
`total_tokens` est manquant ou `0`.
Lorsque l'instantané de la session actuelle est clairsemé, `/status` et `session_status` peuvent
également récupérer les compteurs de jetons/cache et l'étiquette du modèle d'exécution actif à partir du
journal d'utilisation de la transcription le plus récent. Les valeurs actives non nulles existantes prennent
toujours le pas sur les valeurs de secours de la transcription, et les totaux de transcription orientés invite
de plus grande importance peuvent l'emporter lorsque les totaux stockés sont manquants ou plus petits.
L'autorisation d'utilisation pour les fenêtres de quota de fournisseur provient de crochets spécifiques au fournisseur lorsque
disponible ; sinon OAuth revient à la correspondance des identifiants API/clé API
à partir des profils d'auth, de l'env, ou de la config.
Les entrées de transcription de l'assistant persistent avec la même forme d'utilisation normalisée, y compris
`usage.cost` lorsque le modèle actif a une tarification configurée et que le fournisseur
renvoie des métadonnées d'utilisation. Cela donne à `/usage cost` et à l'état de session soutenu par la transcription
une source stable même après la disparition de l'état d'exécution en direct.

OpenClaw maintient la comptabilité de l'utilisation du fournisseur séparée de l'instantané du contexte actuel. Le OpenClaw`usage.total` du fournisseur peut inclure des entrées mises en cache, des sorties et plusieurs appels de modèle en boucle d'outil, ce qui est utile pour les coûts et la télémétrie mais peut surestimer la fenêtre de contexte en direct. Les affichages de contexte et les diagnostics utilisent le dernier instantané d'invite (`promptTokens`, ou le dernier appel de modèle lorsqu'aucun instantané d'invite n'est disponible) pour `context.used`.

## Estimation des coûts (lorsqu'elle est affichée)

Les coûts sont estimés à partir de votre configuration de tarification de modèle :

```
models.providers.<provider>.models[].cost
```

Il s'agit de **USD par 1M de tokens** pour `input`, `output`, `cacheRead` et `cacheWrite`OpenClawAPIAPI. Si la tarification est manquante, OpenClaw affiche uniquement les tokens. L'affichage des coûts n'est pas limité à l'authentification par clé API : les fournisseurs sans clé API tels que `aws-sdk` peuvent afficher le coût estimé lorsque leur entrée de modèle configurée inclut une tarification locale et que le fournisseur renvoie des métadonnées d'utilisation.

Une fois que les sidecars et les canaux ont atteint le chemin prêt de la Gateway, OpenClaw lance un bootstrap de tarification en arrière-plan facultatif pour les références de modèle configurées qui n'ont pas encore de tarification locale. Ce bootstrap récupère les catalogues de tarification distants d'OpenRouter et LiteLLM. Définissez GatewayOpenClawOpenRouter`models.pricing.enabled: false` pour ignorer ces récupérations de catalogue sur les réseaux hors ligne ou restreints ; les entrées explicites `models.providers.*.models[].cost` continuent de piloter les estimations de coûts locaux.

## Impact de la durée de vie (TTL) et du nettoyage du cache

La mise en cache de l'invite du fournisseur ne s'applique que dans la fenêtre de TTL du cache. OpenClaw peut éventuellement exécuter un **nettoyage par TTL de cache** : il nettoie la session une fois le TTL du cache expiré, puis réinitialise la fenêtre de cache afin que les requêtes suivantes puissent réutiliser le contexte nouvellement mis en cache au lieu de remettre en cache l'historique complet. Cela permet de maintenir les coûts d'écriture du cache plus bas lorsqu'une session reste inactive au-delà du TTL.

Configurez-le dans la [configuration de la Gateway](Gateway/en/gateway/configuration) et consultez les détails du comportement dans [Nettoyage de session](/fr/concepts/session-pruning).

Heartbeat peut garder le cache **à chaud** pendant les périodes d'inactivité. Si le TTL du cache de votre modèle est `1h`, définir l'intervalle de heartbeat juste en dessous (par exemple, `55m`) peut éviter de remettre en cache le prompt complet, réduisant ainsi les coûts d'écriture du cache.

Dans les configurations multi-agents, vous pouvez conserver une configuration de modèle partagée et ajuster le comportement du cache par agent avec `agents.list[].params.cacheRetention`.

Pour un guide détaillé de tous les paramètres, consultez [Prompt Caching](/fr/reference/prompt-caching).

Pour la tarification de l'API AnthropicAPI, les lectures de cache sont significativement moins chères que les tokens d'entrée, tandis que les écritures de cache sont facturées avec un multiplicateur plus élevé. Consultez la tarification du cache de prompt de Anthropic pour les derniers tarifs et multiplicateurs TTL :
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### Exemple : garder le cache à chaud pendant 1h avec un heartbeat

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

`agents.list[].params` fusionne par-dessus le `params` du modèle sélectionné, vous pouvez donc remplacer uniquement `cacheRetention` et hériter des autres valeurs par défaut du modèle sans changement.

### Contexte 1M Anthropic

OpenClaw dimensionne les modèles Claude 4.x compatibles GA tels qu'Opus 4.6, Opus 4.7 et Sonnet 4.6 avec la fenêtre de contexte 1M d'Anthropic. Vous n'avez pas besoin de `params.context1m: true` pour ces modèles.

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        alias: opus
```

Les anciennes configurations peuvent conserver `context1m: true`, mais OpenClaw n'envoie plus l'en-tête bêta `context-1m-2025-08-07` (déprécié par Anthropic) pour ce paramètre et n'étend pas les anciens modèles Claude non pris en charge à 1M.

Condition requise : les identifiants doivent être éligibles pour l'utilisation d'un contexte long. Sinon,
Anthropic répond par une erreur de limitation de débit côté fournisseur pour cette demande.

Si vous authentifiez Anthropic avec des tokens OAuth/d'abonnement (`sk-ant-oat-*`), OpenClaw préserve les en-têtes bêta OAuth requis par Anthropic tout en supprimant le bêta `context-1m-*` déprécié s'il reste dans l'ancienne configuration.

## Conseils pour réduire la pression sur les jetons

- Utilisez `/compact` pour résumer les longues sessions.
- Coupez les grandes sorties d'outils dans vos workflows.
- Réduisez `agents.defaults.imageMaxDimensionPx` pour les sessions avec beaucoup de captures d'écran.
- Gardez les descriptions des compétences courtes (la liste des compétences est injectée dans le prompt).
- Préférez des modèles plus petits pour un travail verbeux et exploratoire.

Consultez [Skills](/fr/tools/skills) pour la formule exacte de la surcharge de la liste de compétences.

## Connexes

- [Utilisation et coûts de l'API](/fr/reference/api-usage-costs)
- [Mise en cache du prompt](/fr/reference/prompt-caching)
- [Suivi de l'utilisation](/fr/concepts/usage-tracking)
