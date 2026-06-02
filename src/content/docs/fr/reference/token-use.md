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
- Liste des Skills (métadonnées uniquement ; les instructions sont chargées à la demande avec `read`).
  Les tours Codex natifs reçoivent le bloc de compétences compact sous forme d'instructions de développeur de collaboration limitées au tour ; les autres harnais le reçoivent dans la surface de prompt normale. Elle est limitée par `skills.limits.maxSkillsPromptChars`, avec
  une substitution facultative par agent à `agents.list[].skillsLimits.maxSkillsPromptChars`.
- Instructions de mise à jour automatique
- Fichiers d'espace de travail + d'amorçage (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` lorsqu'ils sont nouveaux, plus `MEMORY.md` lorsqu'il est présent). Les tours Codex natifs ne collent pas le `MEMORY.md` brut de l'espace de travail de l'agent configuré lorsque les outils de mémoire sont disponibles pour cet espace de travail ; ils incluent un petit pointeur de mémoire dans les instructions de développeur de collaboration limitées au tour et utilisent les outils de mémoire à la demande. Si les outils sont désactivés, la recherche de mémoire est indisponible, ou si l'espace de travail actif diffère de l'espace de travail de mémoire de l'agent, `MEMORY.md` utilise le chemin normal de contexte de tour limité. La racine en minuscules `memory.md` n'est pas injectée ; c'est une entrée de réparation héritée pour `openclaw doctor --fix` lorsqu'elle est associée à `MEMORY.md`. Les fichiers injectés volumineux sont tronqués par `agents.defaults.bootstrapMaxChars` (par défaut : 12000), et l'injection totale d'amorçage est plafonnée par `agents.defaults.bootstrapTotalMaxChars` (par défaut : 60000). Les fichiers quotidiens `memory/*.md` ne font pas partie du prompt d'amorçage normal ; ils restent à la demande via les outils de mémoire lors des tours ordinaires, mais les exécutions de model de réinitialisation/démarrage peuvent ajouter un bloc de contexte de démarrage ponctuel avec la mémoire quotidienne récente pour ce premier tour. Les commandes de chat nu `/new` et `/reset` sont reconnues sans invoquer le model. Le prélude de démarrage est contrôlé par `agents.defaults.startupContext`. Les extraits AGENTS.md post-compaction sont distincts et nécessitent un opt-in explicite `agents.defaults.compaction.postCompactionSections`.
- Heure (UTC + fuseau horaire de l'utilisateur)
- Balises de réponse + comportement de heartbeat
- Métadonnées d'exécution (hôte/SE/modèle/réflexion)

Voir la ventilation complète dans [System Prompt](/fr/concepts/system-prompt).

Lors de la documentation des identifiants ou des extraits d'authentification, utilisez les
[Secret Placeholder Conventions](/fr/reference/secret-placeholder-conventions) pour
éviter les faux positifs des scanners de secrets dans les modifications uniquement de documentation.

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

Les redéfinitions par agent se trouvent sous `agents.list[].contextLimits`. Ces paramètres s'appliquent aux extraits d'exécution délimités et aux blocs injectés détenus par l'exécution. Ils sont distincts des limites d'amorçage, des limites de contexte de démarrage et des limites d'invite des compétences.

`toolResultMaxChars`OpenClaw est un plafond avancé. Lorsqu'il n'est pas défini, OpenClaw choisit la limite dynamique des résultats d'outils à partir de la fenêtre de contexte effective du modèle : `16000` caractères en dessous de 100K jetons, `32000` caractères à 100K+ jetons, et `64000` caractères à 200K+ jetons, toujours limité par la garde de partage de contexte d'exécution.

Pour les images, OpenClaw réduit la charge utile des images de transcription/outils avant les appels au fournisseur. Utilisez OpenClaw`agents.defaults.imageMaxDimensionPx` (par défaut : `1200`) pour régler ceci :

- Des valeurs plus basses réduisent généralement l'utilisation de jetons de vision et la taille de la charge utile.
- Des valeurs plus élevées préservent plus de détails visuels pour les captures d'écran lourdes en OCR/interface utilisateur.

Pour une répartition pratique (par fichier injecté, outils, compétences et taille de l'invite système), utilisez `/context list` ou `/context detail`. Voir [Contexte](/fr/concepts/context).

## Comment voir l'utilisation actuelle des jetons

Utilisez ceux-ci dans le chat :

- `/status` → **carte de statut riche en emojis** avec le modèle de session, l'utilisation du contexte, les jetons d'entrée/sortie de la dernière réponse, et **coût estimé** lorsque la tarification locale est configurée pour le modèle actif.
- `/usage off|tokens|full` → ajoute un **pied de page d'utilisation par réponse** à chaque réponse.
  - Persiste par session (stocké sous `responseUsage`).
  - `/usage full`OpenClaw affiche le coût estimé uniquement lorsque OpenClaw dispose des métadonnées d'utilisation et de la tarification locale pour le modèle actif. Sinon, il affiche uniquement les jetons.
- `/usage cost`OpenClaw → affiche un résumé local des coûts à partir des journaux de session OpenClaw.

Autres surfaces :

- **TUI/TUI Web :** TUITUI`/status` + `/usage` sont pris en charge.
- **CLI :** `openclaw status --usage` et `openclaw channels list` affichent
  les fenêtres de quota fournisseur normalisées (`X% left`, et non les coûts par réponse).
  Fournisseurs de fenêtres d'utilisation actuels : Anthropic, GitHub Copilot, Gemini CLI,
  OpenAI Codex, MiniMax, Xiaomi et z.ai.

Les surfaces d'utilisation normalisent les alias de champs natifs courants des fournisseurs avant l'affichage. Pour le trafic des réponses de la famille OpenAI, cela inclut à la fois `input_tokens` / `output_tokens` et `prompt_tokens` / `completion_tokens`, de sorte que les noms de champs spécifiques au transport ne modifient pas `/status`, `/usage` ou les résumés de session. L'utilisation JSON de la CLI est également normalisée : le texte de la réponse provient de `response`, et `stats.cached` correspond à `cacheRead` avec `stats.input_tokens - stats.cached` utilisé lorsque la CLI omet un champ `stats.input` explicite. Pour le trafic natif des réponses de la famille OpenAI, les alias d'utilisation WebSocket/SSE sont normalisés de la même manière, et les totaux reviennent à l'entrée + la sortie normalisées lorsque `total_tokens` est manquant ou `0`. Lorsque l'instantané de la session actuelle est clairsemé, `/status` et `session_status` peuvent également récupérer les compteurs de jetons/cache et l'étiquette du modèle d'exécution actif à partir du journal d'utilisation de la transcription le plus récent. Les valeurs actives non nulles existantes prennent toujours la priorité sur les valeurs de secours de la transcription, et les totaux de transcription orientés prompt peuvent l'emporter lorsque les totaux stockés sont manquants ou plus petits. L'authentification d'utilisation pour les fenêtres de quota des fournisseurs provient de crochets spécifiques au fournisseur lorsqu'ils sont disponibles ; sinon, OpenClaw revient à la correspondance des informations d'identification OAuth/API-key à partir des profils d'authentification, de l'environnement ou de la configuration. Les entrées de la transcription de l'assistant conservent la même forme d'utilisation normalisée, y compris `usage.cost` lorsque le modèle actif a une tarification configurée et que le fournisseur renvoie des métadonnées d'utilisation. Cela donne à `/usage cost` et à l'état de session basé sur la transcription une source stable même après la disparition de l'état d'exécution en direct.

OpenClaw conserve une comptabilité distincte de l'utilisation du fournisseur par rapport à l'instantané du contexte actuel. L'utilisation du OpenClaw`usage.total` du fournisseur peut inclure des entrées mises en cache, des sorties et plusieurs appels de modèle en boucle d'outil, ce qui est utile pour les coûts et la télémétrie mais peut surestimer la fenêtre de contexte active. Les affichages de contexte et les diagnostics utilisent le dernier instantané de prompt (`promptTokens`, ou le dernier appel de modèle lorsqu'aucun instantané de prompt n'est disponible) pour `context.used`.

## Estimation des coûts (lorsqu'elle est affichée)

Les coûts sont estimés à partir de votre configuration de tarification du modèle :

```
models.providers.<provider>.models[].cost
```

Il s'agit de **USD par 1M de tokens** pour `input`, `output`, `cacheRead` et
`cacheWrite`OpenClawAPIAPI. Si la tarification est manquante, OpenClaw n'affiche que les tokens. L'affichage des coûts n'est pas limité à l'authentification par clé API : les fournisseurs sans clé API tels que `aws-sdk` peuvent afficher un coût estimé lorsque leur entrée de modèle configurée inclut une tarification locale et que le fournisseur renvoie des métadonnées d'utilisation.

Une fois que les sidecars et les canaux ont atteint le chemin prêt du Gateway, OpenClaw lance un
amorçage de tarification en arrière-plan optionnel pour les références de modèle configurées qui n'ont pas
encore de tarification locale. Cet amorçage récupère les catalogues de tarification distants d'OpenRouter et LiteLLM.
Définissez GatewayOpenClawOpenRouter`models.pricing.enabled: false` pour ignorer ces récupérations de catalogue
sur les réseaux hors ligne ou restreints ; les entrées explicites
`models.providers.*.models[].cost` continuent de piloter les estimations de coûts
locales.

## Impact du TTL du cache et de l'élagage

La mise en cache du prompt par le fournisseur ne s'applique que dans la fenêtre du TTL du cache. OpenClaw peut
optionnellement exécuter un **élagage du TTL du cache** : il élagage la session une fois le TTL du cache
expiré, puis réinitialise la fenêtre du cache afin que les demandes ultérieures puissent réutiliser le
contexte fraîchement mis en cache au lieu de remettre en cache l'historique complet. Cela permet de maintenir les coûts d'écriture du cache plus bas lorsqu'une session reste inactive au-delà du TTL.

Configurez-le dans [Configuration du Gateway](Gateway/en/gateway/configuration) et consultez les
détails du comportement dans [Élagage de session](/fr/concepts/session-pruning).

Le heartbeat peut garder le cache **chaud** pendant les périodes d'inactivité. Si le TTL du cache de votre modèle est `1h`, définir l'intervalle du heartbeat juste en dessous (par exemple, `55m`) peut éviter de remettre en cache le prompt complet, réduisant ainsi les coûts d'écriture du cache.

Dans les configurations multi-agent, vous pouvez conserver une configuration de modèle partagée et régler le comportement du cache par agent avec `agents.list[].params.cacheRetention`.

Pour un guide détaillé bouton par bouton, consultez [Mise en cache du prompt](/fr/reference/prompt-caching).

Pour la tarification de l'Anthropic API, les lectures du cache sont considérablement moins chères que les tokens d'entrée, tandis que les écritures du cache sont facturées avec un multiplicateur plus élevé. Consultez la tarification de la mise en cache du prompt de Anthropic pour les derniers tarifs et multiplicateurs TTL :
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

`agents.list[].params` fusionne par-dessus `params` du modèle sélectionné, vous pouvez donc remplacer uniquement `cacheRetention` et hériter des autres paramètres par défaut du modèle sans modification.

### Contexte 1M Anthropic

OpenClaw dimensionne les modèles Claude 4.x compatibles GA tels qu'Opus 4.8, Opus 4.7, Opus 4.6 et Sonnet 4.6 avec la fenêtre de contexte 1M d'Anthropic. Vous n'avez pas besoin de `params.context1m: true` pour ces modèles.

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        alias: opus
```

Les anciennes configurations peuvent conserver `context1m: true`, mais OpenClaw n'envoie plus l'en-tête bêta `context-1m-2025-08-07` retraité d'Anthropic pour ce paramètre et n'étend pas les anciens modèles Claude non pris en charge à 1M.

Condition préalable : les informations d'identification doivent être éligibles pour l'utilisation du contexte long. Sinon, Anthropic répond par une erreur de limite de taux côté fournisseur pour cette demande.

Si vous authentifiez Anthropic avec des jetons OAuth/d'abonnement (`sk-ant-oat-*`), OpenClaw préserve les en-têtes bêta OAuth requis par Anthropic tout en supprimant le bêta `context-1m-*` retraité s'il reste dans l'ancienne configuration.

## Conseils pour réduire la pression sur les tokens

- Utilisez `/compact` pour résumer les longues sessions.
- Coupez les résultats volumineux des outils dans vos flux de travail.
- Baissez `agents.defaults.imageMaxDimensionPx` pour les sessions avec de nombreuses captures d'écran.
- Gardez les descriptions des Skills courtes (la liste des Skills est injectée dans le prompt).
- Préférez des modèles plus petits pour un travail verbeux et exploratoire.

Voir [Skills](/fr/tools/skills) pour la formule exacte de la surcharge de la liste des Skills.

## Connexes

- [Utilisation et coûts de l'API](/fr/reference/api-usage-costs)
- [Mise en cache du prompt](/fr/reference/prompt-caching)
- [Suivi de l'utilisation](/fr/concepts/usage-tracking)
