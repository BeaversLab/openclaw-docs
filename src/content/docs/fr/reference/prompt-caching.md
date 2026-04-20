---
title: "Mise en cache du prompt"
summary: "Paramètres de mise en cache du prompt, ordre de fusion, comportement du fournisseur et modèles de réglage"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# Mise en cache des prompts

La mise en cache du prompt signifie que le fournisseur de modèle peut réutiliser les préfixes de prompt inchangés (généralement les instructions système/développeur et d'autres contextes stables) sur plusieurs tours au lieu de les traiter à chaque fois. OpenClaw normalise l'utilisation du fournisseur en `cacheRead` et `cacheWrite` lorsque l'API en amont expose ces compteurs directement.

Les surfaces d'état peuvent également récupérer les compteurs de cache à partir du journal d'utilisation de la transcription la plus récente lorsque l'instantané de session en direct ne les contient pas, de sorte que `/status` peut continuer à afficher une ligne de cache après une perte partielle des métadonnées de session. Les valeurs de cache en direct non nulles existantes ont toujours la priorité sur les valeurs de repli de la transcription.

Pourquoi c'est important : coût en jetons réduit, réponses plus rapides et performances plus prévisibles pour les sessions de longue durée. Sans mise en cache, les prompts répétés paient le coût complet du prompt à chaque tour, même lorsque la majorité de l'entrée n'a pas changé.

Cette page couvre tous les paramètres liés au cache qui affectent la réutilisation des prompts et le coût en jetons.

Références des fournisseurs :

- Mise en cache des prompts Anthropic : [https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- Mise en cache des prompts OpenAI : [https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- En-têtes et ID de requête de l'API OpenAI : [https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- ID de requête et erreurs Anthropic : [https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## Paramètres principaux

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

Supprime l'ancien contexte des résultats d'outils après les fenêtres TTL du cache afin que les demandes post-inactivité ne remettent pas en cache un historique trop volumineux.

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

Voir [Session Pruning](/fr/concepts/session-pruning) pour le comportement complet.

### Maintien de la chaleur par pulsation (Heartbeat keep-warm)

La pulsation peut garder les fenêtres de cache au chaud et réduire les écritures de cache répétées après les périodes d'inactivité.

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

Le rythme cardiaque par agent est pris en charge à `agents.list[].heartbeat`.

## Comportement du fournisseur

### Anthropic (API directe)

- `cacheRetention` est pris en charge.
- Avec les profils d'authentification par clé API Anthropic, OpenClaw initialise `cacheRetention: "short"` pour les références de modèle Anthropic s'il n'est pas défini.
- Les réponses Messages natives d'Anthropic exposent à la fois `cache_read_input_tokens` et `cache_creation_input_tokens`, donc OpenClaw peut afficher à la fois `cacheRead` et `cacheWrite`.
- Pour les requêtes Anthropic natives, `cacheRetention: "short"` correspond au cache éphémère par défaut de 5 minutes, et `cacheRetention: "long"` passe au TTL d'une heure uniquement sur les hôtes `api.anthropic.com` directs.

### OpenAI (API directe)

- La mise en cache du prompt est automatique sur les modèles récents pris en charge. OpenClaw n'a pas besoin d'injecter des marqueurs de cache au niveau du bloc.
- OpenClaw utilise `prompt_cache_key` pour maintenir le routage du cache stable entre les tours et utilise `prompt_cache_retention: "24h"` uniquement lorsque `cacheRetention: "long"` est sélectionné sur les hôtes OpenAI directs.
- Les réponses d'OpenAI exposent les jetons de prompt mis en cache via `usage.prompt_tokens_details.cached_tokens` (ou `input_tokens_details.cached_tokens` sur les événements de l'API Responses). OpenClaw mappe cela vers `cacheRead`.
- OpenAI n'expose pas de compteur de jetons d'écriture de cache distinct, donc `cacheWrite` reste `0` sur les chemins OpenAI même lorsque le fournisseur est en train de réchauffer un cache.
- OpenAI renvoie des en-têtes de traçage et de limite de taux utiles tels que `x-request-id`, `openai-processing-ms` et `x-ratelimit-*`, mais la comptabilité des succès de cache doit provenir de la charge utile d'utilisation, et non des en-têtes.
- En pratique, OpenAI se comporte souvent comme un cache de préfixe initial plutôt qu'une réutilisation de l'historique complet mobile style Anthropic. Les tours de texte avec un long préfixe stable peuvent atteindre un plateau de jetons mis en cache près de `4864` dans les sondages en direct actuels, tandis que les transcriptions lourdes en outils ou style MCP atteignent souvent un plateau près de `4608` jetons mis en cache même lors de répétitions exactes.

### Anthropic Vertex

- Les modèles Anthropic sur Vertex AI (`anthropic-vertex/*`) prennent en charge `cacheRetention` de la même manière qu'Anthropic direct.
- `cacheRetention: "long"` correspond au vrai TTL de 1 heure du cache de prompt sur les points de terminaison Vertex AI.
- La rétention du cache par défaut pour `anthropic-vertex` correspond aux valeurs par défaut d'Anthropic direct.
- Les requêtes Vertex sont acheminées via une mise en forme de cache tenant compte des limites, afin que la réutilisation du cache reste alignée sur ce que les fournisseurs reçoivent réellement.

### Amazon Bedrock

- Les références de modèle Anthropic Claude (`amazon-bedrock/*anthropic.claude*`) prennent en charge le passage explicite de `cacheRetention`.
- Les modèles Bedrock non-Anthropic sont forcés à `cacheRetention: "none"` lors de l'exécution.

### Modèles OpenRouter Anthropic

Pour les références de modèle `openrouter/anthropic/*`, OpenClaw injecte des
`cache_control` Anthropic sur les blocs de prompt système/développeur pour améliorer la réutilisation du cache de prompt uniquement lorsque la requête cible toujours une route OpenRouter vérifiée
(`openrouter` sur son point de terminaison par défaut, ou toute URL de fournisseur/base qui résout
vers `openrouter.ai`).

Si vous redirigez le modèle vers une URL de proxy compatible OpenAI arbitraire, OpenClaw
cesse d'injecter ces marqueurs de cache Anthropic spécifiques à OpenRouter.

### Autres fournisseurs

Si le fournisseur ne prend pas en charge ce mode de cache, `cacheRetention` n'a aucun effet.

### API directe Google Gemini

- Le transport Gemini direct (`api: "google-generative-ai"`) signale les succès de cache
  via `cachedContentTokenCount` en amont ; OpenClaw le mappe vers `cacheRead`.
- Lorsque `cacheRetention` est défini sur un modèle Gemini direct, OpenClaw crée automatiquement,
  réutilise et actualise les ressources `cachedContents` pour les prompts système
  lors des exécutions sur Google AI Studio. Cela signifie que vous n'avez plus besoin de pré-créer manuellement un
  identifiant de contenu mis en cache.
- Vous pouvez toujours passer un identifiant de contenu mis en cache Gemini existant en tant que
  `params.cachedContent` (ou `params.cached_content` hérité) sur le modèle
  configuré.
- Ceci est distinct du cache de préfixe de prompt Anthropic/OpenAI. Pour Gemini,
  OpenClaw gère une ressource `cachedContents` native au fournisseur plutôt que
  d'injecter des marqueurs de cache dans la requête.

### Utilisation JSON CLI Gemini

- La sortie JSON CLI Gemini peut également afficher les succès de cache via `stats.cached` ;
  OpenClaw le mappe vers `cacheRead`.
- Si la CLI omet une valeur directe `stats.input`, OpenClaw dérive les jetons d'entrée
  à partir de `stats.input_tokens - stats.cached`.
- Il s'agit uniquement d'une normalisation de l'utilisation. Cela ne signifie pas que OpenClaw crée des marqueurs de cache de prompt de style Anthropic/OpenAI pour le CLI Gemini.

## Limite du cache du prompt système

OpenClaw divise le prompt système en un **préfixe stable** et un **suffixe volatile** séparés par une limite interne de préfixe de cache. Le contenu au-dessus de la limite (définitions d'outils, métadonnées de compétences, fichiers de l'espace de travail et autre contexte relativement statique) est ordonné de manière à rester identique au niveau octet d'un tour à l'autre. Le contenu sous la limite (par exemple `HEARTBEAT.md`, horodatages d'exécution et autres métadonnées par tour) est autorisé à changer sans invalider le préfixe mis en cache.

Choix de conception clés :

- Les fichiers de contexte de projet stables de l'espace de travail sont ordonnés avant `HEARTBEAT.md` afin que l'activité du heartbeat ne fasse pas sauter le préfixe stable.
- La limite est appliquée à la mise en forme du transport pour la famille Anthropic, la famille OpenAI, Google et le CLI afin que tous les providers pris en charge bénéficient de la même stabilité de préfixe.
- Les réponses Codex et les requêtes Vertex Anthropic sont acheminées via une mise en forme du cache consciente de la limite, afin que la réutilisation du cache reste alignée avec ce que les providers reçoivent réellement.
- Les empreintes de prompt système sont normalisées (espace blanc, fins de ligne, contexte ajouté par des hooks, ordre des capacités d'exécution) afin que les prompts sémantiquement inchangés partagent le KV/cache entre les tours.

Si vous constatez des pics inattendus de `cacheWrite` après un changement de configuration ou d'espace de travail, vérifiez si le changement se situe au-dessus ou en dessous de la limite du cache. Le déplacement du contenu volatile sous la limite (ou sa stabilisation) résout souvent le problème.

## Garanties de stabilité du cache OpenClaw

OpenClaw maintient également plusieurs formes de payload sensibles au cache de manière déterministe avant que la demande n'atteigne le provider :

- Les catalogues d'outils MCP de bundle sont triés de manière déterministe avant l'enregistrement des outils, afin que les modifications d'ordre de `listTools()` ne fassent pas tourner le bloc des outils et ne fassent pas sauter les préfixes du cache de prompt.
- Les sessions héritées avec des blocs d'image persistants gardent les **3 tours récents terminés** intacts ; les blocs d'image plus anciens déjà traités peuvent être remplacés par un marqueur afin que les suites lourdes en images ne continuent pas à renvoyer de gros payloads obsolètes.

## Motifs de réglage

### Trafic mixte (par défaut recommandé)

Conservez une ligne de base longue durée sur votre agent principal, désactivez la mise en cache sur les agents de notification par rafales :

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

### Référentiel axé sur les coûts

- Définir le `cacheRetention: "short"` de référence.
- Activer `contextPruning.mode: "cache-ttl"`.
- Maintenez le heartbeat sous votre TTL uniquement pour les agents qui bénéficient de caches chauds.

## Diagnostics du cache

OpenClaw expose des diagnostics dédiés de trace de cache pour les exécutions d'agents intégrés.

Pour les diagnostics normaux orientés utilisateur, `/status` et autres résumés d'utilisation peuvent utiliser
la dernière entrée d'utilisation de transcription comme source de secours pour `cacheRead` /
`cacheWrite` lorsque l'entrée de session en direct ne possède pas ces compteurs.

## Tests de régression en direct

OpenClaw conserve une porte de régression de cache en direct combinée pour les préfixes répétés, les tours d'outils, les tours d'images, les transcriptions d'outils de style MCP et un contrôle de no-cache Anthropic.

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

Exécuter la porte étroite en direct avec :

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

Le fichier de référence stocke les derniers chiffres en direct observés ainsi que les planchers de régression spécifiques au fournisseur utilisés par le test.
Le lanceur utilise également des ID de session et des espaces de noms de prompt frais pour chaque exécution afin que l'état du cache précédent ne pollue pas l'échantillon de régression actuel.

Ces tests n'utilisent pas intentionnellement des critères de succès identiques pour tous les fournisseurs.

### Attentes en direct Anthropic

- S'attendre à des écritures de préchauffage explicites via `cacheWrite`.
- S'attendre à une réutilisation quasi complète de l'historique lors des tours répétés car le contrôle de cache Anthropic fait avancer le point d'arrêt du cache à travers la conversation.
- Les assertions en direct actuelles utilisent toujours des seuils de taux de réussite élevés pour les chemins stables, les outils et les images.

### Attentes en direct OpenAI

- S'attendre uniquement à `cacheRead`. `cacheWrite` reste `0`.
- Considérer la réutilisation du cache lors de tours répétés comme un plateau spécifique au fournisseur, et non comme une réutilisation mobile de l'historique complet de style Anthropic.
- Les assertions en direct actuelles utilisent des vérifications de plancher conservatrices dérivées du comportement en direct observé sur `gpt-5.4-mini` :
  - préfixe stable : `cacheRead >= 4608`, taux de réussite `>= 0.90`
  - transcription d'outil : `cacheRead >= 4096`, taux de réussite `>= 0.85`
  - transcription d'image : `cacheRead >= 3840`, taux de réussite `>= 0.82`
  - Transcript style MCP : `cacheRead >= 4096`, taux de succès `>= 0.85`

La vérification combinée en direct du 2026-04-04 a abouti à :

- préfixe stable : `cacheRead=4864`, taux de succès `0.966`
- transcript d'outil : `cacheRead=4608`, taux de succès `0.896`
- transcript d'image : `cacheRead=4864`, taux de succès `0.954`
- Transcript style MCP : `cacheRead=4608`, taux de succès `0.891`

L'heure locale réelle pour la porte combinée était d'environ `88s`.

Pourquoi les assertions diffèrent :

- Anthropic expose des points d'arrêt de cache explicites et la réutilisation mobile de l'historique de conversation.
- La mise en cache de prompt OpenAI est toujours sensible au préfixe exact, mais le préfixe réellement réutilisable dans le trafic Réponses en direct peut plafonner plus tôt que le prompt complet.
- Pour cette raison, comparer Anthropic et OpenAI à l'aide d'un seul seuil de pourcentage inter-fournisseurs crée de fausses régressions.

### Config `diagnostics.cacheTrace`

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

### Interrupteurs d'environnement (débogage ponctuel)

- `OPENCLAW_CACHE_TRACE=1` active le traçage du cache.
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` remplace le chemin de sortie.
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` active la capture complète de la charge utile des messages.
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` active la capture du texte du prompt.
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` active la capture du prompt système.

### Ce qu'il faut inspecter

- Les événements de trace de cache sont au format JSONL et incluent des instantanés intermédiaires tels que `session:loaded`, `prompt:before`, `stream:context` et `session:after`.
- L'impact des jetons de cache par tour est visible dans les surfaces d'utilisation normales via `cacheRead` et `cacheWrite` (par exemple `/usage full` et les résumés d'utilisation de session).
- Pour Anthropic, attendez-vous à la fois à `cacheRead` et à `cacheWrite` lorsque le cache est actif.
- Pour OpenAI, attendez-vous à `cacheRead` lors des accès au cache et à `cacheWrite` pour rester `0` ; OpenAI ne publie pas de champ distinct pour les jetons d'écriture de cache.
- Si vous avez besoin du traçage des requêtes, enregistrez les ID de requête et les en-têtes de limite de taux séparément des métriques de cache. La sortie actuelle du traçage de cache de OpenClaw se concentre sur la forme du prompt/session et l'utilisation normalisée des jetons plutôt que sur les en-têtes de réponse bruts du fournisseur.

## Dépannage rapide

- `cacheWrite` élevé sur la plupart des tours : vérifiez la présence d'entrées de système prompt volatiles et assurez-vous que le modèle/fournisseur prend en charge vos paramètres de cache.
- `cacheWrite` élevé sur Anthropic : cela signifie souvent que le point d'arrêt du cache atterrit sur un contenu qui change à chaque requête.
- `cacheRead` OpenAI faible : vérifiez que le préfixe stable est au début, que le préfixe répété fait au moins 1024 jetons et que le même `prompt_cache_key` est réutilisé pour les tours qui devraient partager un cache.
- Aucun effet de `cacheRetention` : confirmez que la clé du modèle correspond à `agents.defaults.models["provider/model"]`.
- Requêtes Bedrock Nova/Mistral avec paramètres de cache : force d'exécution attendue pour `none`.

Documentation connexe :

- [Anthropic](/fr/providers/anthropic)
- [Utilisation des jetons et coûts](/fr/reference/token-use)
- [Nettoyage de session](/fr/concepts/session-pruning)
- [Référence de configuration Gateway](/fr/gateway/configuration-reference)
