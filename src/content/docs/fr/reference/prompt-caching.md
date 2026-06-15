---
summary: "Contrôles de mise en cache des invites, ordre de fusion, comportement du fournisseur et modèles de réglage"
title: "Mise en cache des invites"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

La mise en cache des invitations signifie que le fournisseur de modèles peut réutiliser les préfixes d'invitation inchangés (généralement les instructions système/développeur et d'autres contextes stables) sur plusieurs tours au lieu de les retraiter à chaque fois. OpenClaw normalise l'utilisation du fournisseur en `cacheRead` et `cacheWrite` lorsque l'API amont expose ces compteurs directement.

Les surfaces d'état peuvent également récupérer les compteurs de cache à partir du journal d'utilisation de la transcription la plus récente lorsque l'instantané de la session en direct ne les contient pas, de sorte que `/status` peut continuer à afficher une ligne de cache après une perte partielle des métadonnées de session. Les valeurs de cache en direct non nulles existantes prennent toujours le pas sur les valeurs de secours de la transcription.

Pourquoi c'est important : coût de jetons réduit, réponses plus rapides et performances plus prévisibles pour les sessions de longue durée. Sans mise en cache, les invitations répétées paient le coût complet de l'invitation à chaque tour, même si la plupart des entrées n'ont pas changé.

Les sections ci-dessous couvrent chaque contrôle lié au cache qui affecte la réutilisation des invitations et le coût des jetons.

Références des fournisseurs :

- Mise en cache de prompt Anthropic : [Anthropichttps://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- Mise en cache de prompt OpenAI : [OpenAIhttps://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- En-têtes et ID de requête de l'API OpenAI : [OpenAIAPIhttps://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- ID de requête et erreurs Anthropic : [Anthropichttps://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## Contrôles principaux

### `cacheRetention` (par défaut global, modèle et par agent)

Définir la rétention du cache comme valeur par défaut globale pour tous les modèles :

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
```

Remplacer par modèle :

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

Remplacement par agent :

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

Ordre de fusion de la configuration :

1. `agents.defaults.params` (par défaut global — s'applique à tous les modèles)
2. `agents.defaults.models["provider/model"].params` (remplacement par modèle)
3. `agents.list[].params` (id d'agent correspondant ; remplace par clé)

### `contextPruning.mode: "cache-ttl"`

Supprime l'ancien contexte de résultat d'outil après les fenêtres TTL du cache afin que les requêtes post-inactivité ne remettent pas en cache un historique trop volumineux.

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

Voir [Session Pruning](/fr/concepts/session-pruning) pour le comportement complet.

### Maintien de la chaleur par pulsation

La pulsation peut maintenir les fenêtres de cache au chaud et réduire les écritures de cache répétées après les périodes d'inactivité.

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

Le heartbeat par agent est pris en charge à `agents.list[].heartbeat`.

## Comportement du fournisseur

### Anthropic (API directe)

- `cacheRetention` est pris en charge.
- Avec les profils d'authentification par clé Anthropic de API, OpenClaw amorce `cacheRetention: "short"` pour les références de modèle Anthropic lorsqu'il n'est pas défini.
- Les réponses Messages natives de Anthropic exposent à la fois `cache_read_input_tokens` et `cache_creation_input_tokens`, donc OpenClaw peut afficher à la fois `cacheRead` et `cacheWrite`.
- Pour les requêtes natives Anthropic, `cacheRetention: "short"` correspond au cache éphémère par défaut de 5 minutes, et `cacheRetention: "long"` passe à la TTL de 1 heure uniquement sur les hôtes `api.anthropic.com` directs.

### OpenAI (API directe)

- La mise en cache des prompts est automatique sur les modèles récents pris en charge. OpenClaw n'a pas besoin d'injecter des marqueurs de cache au niveau du bloc.
- OpenClaw utilise `prompt_cache_key` pour garder le routage du cache stable entre les tours. Les hôtes OpenAI directs utilisent `prompt_cache_retention: "24h"` lorsque `cacheRetention: "long"` est sélectionné.
- Les fournisseurs de complétions compatibles OpenAI reçoivent OpenAI`prompt_cache_key` uniquement lorsque leur configuration de modèle définit explicitement `compat.supportsPromptCacheKey: true`. Le transfert à longue rétention est une capacité distincte : `cacheRetention: "long"` explicite envoie `prompt_cache_retention: "24h"` uniquement lorsque cette entrée de compatibilité prend également en charge la longue rétention du cache. Des fournisseurs comme Mistral peuvent opter pour les clés de cache tout en définissant `compat.supportsLongCacheRetention: false` pour supprimer le champ de longue rétention. `cacheRetention: "none"` supprime les deux champs.
- Les réponses OpenAI exposent les jetons de prompt mis en cache via OpenAI`usage.prompt_tokens_details.cached_tokens` (ou `input_tokens_details.cached_tokens`APIOpenClaw sur les événements de l'API Responses). OpenClaw mappe cela vers `cacheRead`.
- OpenAI n'expose pas de compteur de jetons d'écriture de cache distinct, donc OpenAI`cacheWrite` reste `0`OpenAI sur les chemins OpenAI même lorsque le fournisseur réchauffe un cache.
- OpenAI renvoie des en-têtes de traçage et de limitation de débit utiles tels que OpenAI`x-request-id`, `openai-processing-ms` et `x-ratelimit-*`, mais la comptabilité des succès de cache doit provenir du payload d'utilisation, et non des en-têtes.
- En pratique, OpenAI se comporte souvent comme un cache de préfixe initial plutôt que comme une réutilisation de l'historique complet mobile à la manière d'Anthropic. Les tours de texte avec un préfixe long et stable peuvent atteindre un plateau de jetons mis en cache près de OpenAIAnthropic`4864` dans les sondages en direct actuels, tandis que les transcriptions lourdes en outils ou de style MCP atteignent souvent un plateau près de `4608` jetons mis en cache, même lors de répétitions exactes.

### Anthropic Vertex

- Les modèles Anthropic sur Vertex AI (Anthropic`anthropic-vertex/*`) prennent en charge `cacheRetention`Anthropic de la même manière que l'API Anthropic directe.
- `cacheRetention: "long"` correspond au vrai TTL de cache de prompt d'une heure sur les points de terminaison Vertex AI.
- La rétention du cache par défaut pour `anthropic-vertex`Anthropic correspond aux valeurs par défaut d'Anthropic direct.
- Les requêtes Vertex sont acheminées via une mise en forme de cache tenant compte des limites, afin que la réutilisation du cache reste alignée sur ce que les fournisseurs reçoivent réellement.

### Amazon Bedrock

- Les références de modèles Anthropic Claude (Anthropic`amazon-bedrock/*anthropic.claude*`) prennent en charge le passage explicite `cacheRetention`.
- Les modèles Bedrock non-Anthropic sont forcés à Anthropic`cacheRetention: "none"` lors de l'exécution.

### Modèles OpenRouter

Pour les références de modèles `openrouter/anthropic/*`OpenClawAnthropic, OpenClaw injecte des `cache_control`OpenRouter Anthropic sur les blocs de prompt système/développeur pour améliorer la réutilisation du cache de prompt uniquement lorsque la requête cible toujours une route OpenRouter vérifiée (`openrouter` sur son point de terminaison par défaut, ou toute URL de fournisseur/base qui résout vers `openrouter.ai`).

Pour les références de modèles `openrouter/deepseek/*`, `openrouter/moonshot*/*` et `openrouter/zai/*`, `contextPruning.mode: "cache-ttl"`OpenRouterOpenClawAnthropic est autorisé car OpenRouter gère automatiquement la mise en cache des prompts côté fournisseur. OpenClaw n'injecte pas de marqueurs `cache_control` Anthropic dans ces requêtes.

La construction du cache DeepSeek est au mieux possible (best-effort) et peut prendre quelques secondes. Une suite immédiate peut toujours afficher `cached_tokens: 0` ; vérifiez avec une requête de même préfixe répétée après un court délai et utilisez `usage.prompt_tokens_details.cached_tokens` comme signal de succès du cache.

Si vous redirigez le modèle vers une URL de proxy arbitraire compatible OpenAI, OpenClaw arrête d'injecter ces marqueurs de cache OpenRouter spécifiques à Anthropic.

### Autres providers

Si le fournisseur ne prend pas en charge ce mode de cache, `cacheRetention` n'a aucun effet.

### API direct Google Gemini

- Le transport Gemini direct (`api: "google-generative-ai"`) signale les succès de cache via les `cachedContentTokenCount`OpenClaw en amont ; OpenClaw mappe cela vers `cacheRead`.
- Lorsque `cacheRetention` est défini sur un modèle Gemini direct, OpenClaw crée,
  réutilise et actualise automatiquement les ressources `cachedContents` pour les invites système
  lors des exécutions sur Google AI Studio. Cela signifie que vous n'avez plus besoin de pré-créer manuellement
  un handle de cached-content.
- Vous pouvez toujours transmettre un handle de cached-content Gemini existant en tant que
  `params.cachedContent` (ou `params.cached_content` hérité) sur le modèle
  configuré.
- Ceci est distinct du cache de préfixe d'invite de Anthropic/OpenAI. Pour Gemini,
  OpenClaw gère une ressource `cachedContents` native du provider plutôt que
  d'injecter des marqueurs de cache dans la requête.

### Utilisation JSON CLI Gemini

- La sortie JSON de la CLI Gemini peut également afficher les succès de cache via `stats.cached` ;
  OpenClaw les associe à `cacheRead`.
- Si la CLI omet une valeur directe `stats.input`, OpenClaw déduit les jetons d'entrée
  à partir de `stats.input_tokens - stats.cached`.
- Il ne s'agit que d'une normalisation de l'utilisation. Cela ne signifie pas que OpenClaw crée
  des marqueurs de cache d'invite de type Anthropic/OpenAI pour la CLI Gemini.

## Limite de cache de l'invite système

OpenClaw divise l'invite système en un **préfixe stable** et un **suffixe
volatil** séparés par une limite interne de préfixe de cache. Le contenu au-dessus de
la limite (définitions d'outils, métadonnées de compétences, fichiers d'espace de travail et autre
contexte relativement statique) est ordonné de manière à rester identique octet par octet d'un tour à l'autre.
Le contenu sous la limite (par exemple `HEARTBEAT.md`, horodatages d'exécution et
autres métadonnées par tour) est autorisé à changer sans invalider le préfixe
mis en cache.

Choix de conception clés :

- Les fichiers de contexte de projet d'espace de travail stables sont ordonnés avant `HEARTBEAT.md` afin
  que le turnover de l'intervalle de battement (heartbeat) ne casse pas le préfixe stable.
- La limite est appliquée à travers le façonnement du transport de la famille Anthropic,
  de la famille OpenAI, de Google et de la CLI afin que tous les fournisseurs pris en charge
  bénéficient de la même stabilité de préfixe.
- Les réponses Codex et les requêtes Anthropic Vertex sont acheminées via
  une mise en forme de cache sensible aux limites, afin que la réutilisation du cache reste alignée avec ce que les providers
  reçoivent réellement.
- Les empreintes de système-prompt sont normalisées (espaces, fins de ligne,
  contexte ajouté par les hooks, ordre des capacités d'exécution) afin que les invites
  sémantiquement inchangées partagent le KV/cache entre les tours.

Si vous constatez des pics inattendus de `cacheWrite` après un changement de configuration ou d'espace de travail,
vérifiez si le changement se situe au-dessus ou en dessous de la limite du cache. Déplacer
le contenu volatil sous la limite (ou le stabiliser) résout souvent le
problème.

## Garanties de stabilité du cache OpenClaw

OpenClaw maintient également plusieurs formes de payloads sensibles au cache de manière déterministe avant
que la demande n'atteigne le provider :

- Les catalogues d'outils MCP de bundle sont triés de manière déterministe avant
  l'enregistrement des outils, afin que les changements d'ordre `listTools()` ne fassent pas tourner le bloc d'outils et
  ne cassent les préfixes de cache d'invite.
- Les sessions héritées avec des blocs d'images persistants conservent les **3 tours
  terminés les plus récents** intacts ; les blocs d'images plus anciens déjà traités peuvent être
  remplacés par un marqueur afin que les suites riches en images ne continuent pas à renvoyer de gros
  payloads obsolètes.

## Motifs de réglage

### Trafic mixte (valeur par défaut recommandée)

Conservez une ligne de base de longue durée sur votre agent principal, désactivez la mise en cache sur les agents de notification par rafales :

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m"
    - id: "alerts"
      params:
        cacheRetention: "none"
```

### Ligne de base axée sur les coûts

- Définir `cacheRetention: "short"` de base.
- Activer `contextPruning.mode: "cache-ttl"`.
- Maintenez le heartbeat en dessous de votre TTL uniquement pour les agents qui bénéficient de caches chauds.

## Diagnostics du cache

OpenClaw expose des diagnostics de trace de cache dédiés pour les exécutions d'agents intégrés.

Pour les diagnostics normaux orientés utilisateur, `/status` et d'autres résumés d'utilisation peuvent utiliser
la dernière entrée d'utilisation de la transcription comme source de secours pour `cacheRead` /
`cacheWrite` lorsque l'entrée de session en direct ne dispose pas de ces compteurs.

## Tests de régression en direct

OpenClaw maintient une seule porte de régression de cache en direct combinée pour les préfixes répétés, les tours d'outils, les tours d'images, les transcriptions d'outils de style MCP et un contrôle de non-cache Anthropic.

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

Exécutez la porte en direct étroite avec :

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

Le fichier de référence stocke les derniers nombres observés en direct ainsi que les planchers de régression spécifiques au fournisseur utilisés par le test. Le lanceur utilise également des identifiants de session frais par exécution et des espaces de noms de prompt afin que l'état du cache précédent ne pollue pas l'échantillon de régression actuel.

Ces tests n'utilisent volontairement pas des critères de succès identiques pour tous les providers.

### Attentes en direct Anthropic

- Attendre des écritures de préchauffage explicites via `cacheWrite`.
- Attendre une réutilisation presque complète de l'historique lors des tours répétés car le contrôle de cache Anthropic fait avancer le point de rupture du cache tout au long de la conversation.
- Les assertions en direct actuelles utilisent toujours des seuils de taux de réussite élevés pour les chemins stables, tool et image.

### Attentes en direct OpenAI

- Attendre uniquement `cacheRead`. `cacheWrite` reste `0`.
- Considérer la réutilisation du cache sur les tours répétés comme un plateau spécifique au provider, et non comme une réutilisation mobile de l'historique complet à la manière Anthropic.
- Les assertions en direct actuelles utilisent des vérifications de plancher conservatrices dérivées du comportement en direct observé sur `gpt-5.4-mini` :
  - préfixe stable : `cacheRead >= 4608`, taux de réussite `>= 0.90`
  - transcription d'outil : `cacheRead >= 4096`, taux de réussite `>= 0.85`
  - transcription d'image : `cacheRead >= 3840`, taux de réussite `>= 0.82`
  - transcription style MCP : `cacheRead >= 4096`, taux de réussite `>= 0.85`

Une vérification combinée en direct fraîche le 2026-04-04 a donné :

- préfixe stable : `cacheRead=4864`, taux de réussite `0.966`
- transcription d'outil : `cacheRead=4608`, taux de réussite `0.896`
- transcription d'image : `cacheRead=4864`, taux de réussite `0.954`
- transcription style MCP : `cacheRead=4608`, taux de réussite `0.891`

Le temps d'horloge murale local récent pour la porte combinée était d'environ `88s`.

Pourquoi les assertions diffèrent :

- Anthropic expose des points de rupture de cache explicites et une réutilisation mobile de l'historique de conversation.
- Le mise en cache de prompt de OpenAI reste sensible au préfixe exact, mais le préfixe réellement réutilisable dans le trafic des réponses en direct peut atteindre un plateau plus tôt que le prompt complet.
- En raison de cela, comparer Anthropic et OpenAI à l'aide d'un seul seuil de pourcentage inter-fournisseurs crée de fausses régressions.

### config `diagnostics.cacheTrace`

```yaml
diagnostics:
  cacheTrace:
    enabled: true
    filePath: "~/.openclaw/logs/cache-trace.jsonl" # optional
    includeMessages: false # default true
    includePrompt: false # default true
    includeSystem: false # default true
```

Valeurs par défaut :

- `filePath` : `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages` : `true`
- `includePrompt` : `true`
- `includeSystem` : `true`

### Bascules d'environnement (débug ponctuel)

- `OPENCLAW_CACHE_TRACE=1` active le traçage du cache.
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` remplace le chemin de sortie.
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` active la capture complète de la charge utile du message.
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` active la capture du texte du prompt.
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` active la capture du prompt système.

### Ce qu'il faut inspecter

- Les événements de trace de cache sont au format JSONL et incluent des instantanés intermédiaires tels que `session:loaded`, `prompt:before`, `stream:context` et `session:after`.
- L'impact des jetons de cache par tour est visible dans les surfaces d'utilisation normales via `cacheRead` et `cacheWrite` (par exemple `/usage full` et les résumés d'utilisation de session).
- Pour Anthropic, attendez-vous à ce que `cacheRead` et `cacheWrite` soient tous deux présents lorsque le cache est actif.
- Pour OpenAI, attendez-vous à `cacheRead` lors des accès au cache et à ce que `cacheWrite` reste `0` ; OpenAI ne publie pas de champ distinct pour les jetons d'écriture de cache.
- Si vous avez besoin du traçage des requêtes, consignez les ID de requête et les en-têtes de limite de taux séparément des métriques de cache. La sortie actuelle du traçage de cache de OpenClaw est axée sur la forme du prompt/de la session et l'utilisation normalisée des jetons plutôt que sur les en-têtes de réponse bruts du fournisseur.

## Dépannage rapide

- `cacheWrite` élevé sur la plupart des tours : vérifiez la présence d'entrées de prompt système volatiles et confirmez que le model/provider prend en charge vos paramètres de cache.
- `cacheWrite` élevé chez Anthropic : cela signifie souvent que le point d'arrêt du cache atterrit sur un contenu qui change à chaque requête.
- OpenAI `cacheRead` faible : vérifiez que le préfixe stable est au début, que le préfixe répété fait au moins 1024 jetons, et que le même `prompt_cache_key` est réutilisé pour les tours qui devraient partager un cache.
- Aucun effet de `cacheRetention` : confirmez que la clé du model correspond à `agents.defaults.models["provider/model"]`.
- Requêtes Bedrock Nova/Mistral avec paramètres de cache : on s'attend à ce que le runtime force `none`.

Documentation connexe :

- [Anthropic](/fr/providers/anthropic)
- [Utilisation et coûts des jetons](/fr/reference/token-use)
- [Nettoyage de session](/fr/concepts/session-pruning)
- [Référence de configuration du Gateway](/fr/gateway/configuration-reference)

## Connexes

- [Utilisation et coûts des jetons](/fr/reference/token-use)
- [Utilisation et coûts de l'API](/fr/reference/api-usage-costs)
