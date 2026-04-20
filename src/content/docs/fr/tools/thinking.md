---
summary: "Directive syntax for /think, /fast, /verbose, /trace, and reasoning visibility"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "Niveaux de réflexion"
---

# Niveaux de réflexion (directives /think)

## Fonctionnement

- Directive en ligne dans n'importe quel corps entrant : `/t <level>`, `/think:<level>`, ou `/thinking <level>`.
- Niveaux (alias) : `off | minimal | low | medium | high | xhigh | adaptive`
  - minimal → « think »
  - low → « think hard »
  - medium → « think harder »
  - high → « ultrathink » (budget max)
  - xhigh → « ultrathink+ » (modèles GPT-5.2 + Codex uniquement)
  - adaptive → budget de raisonnement adaptatif géré par le provider (pris en charge pour la famille de modèles Claude 4.6 d'Anthropic)
  - `x-high`, `x_high`, `extra-high`, `extra high`, et `extra_high` correspondent à `xhigh`.
  - `highest`, `max` correspondent à `high`.
- Notes du provider :
  - Les modèles Claude 4.6 d'Anthropic sont réglés par défaut sur `adaptive` lorsqu'aucun niveau de réflexion explicite n'est défini.
  - MiniMax (`minimax/*`) sur le chemin de streaming compatible Anthropic est réglé par défaut sur `thinking: { type: "disabled" }` sauf si vous définissez explicitement la réflexion dans les paramètres du modèle ou de la requête. Cela évite les deltas `reasoning_content` fuite provenant du format de flux Anthropic non natif de MiniMax.
  - Z.AI (`zai/*`) prend uniquement en charge la réflexion binaire (`on`/`off`). Tout niveau autre que `off` est traité comme `on` (mappé à `low`).
  - Moonshot (`moonshot/*`) mappe `/think off` à `thinking: { type: "disabled" }` et tout niveau autre que `off` à `thinking: { type: "enabled" }`. Lorsque la réflexion est activée, Moonshot n'accepte que `tool_choice` `auto|none` ; OpenClaw normalise les valeurs incompatibles à `auto`.

## Ordre de résolution

1. Directive en ligne sur le message (s'applique uniquement à ce message).
2. Remplacement de session (défini en envoyant un message contenant uniquement une directive).
3. Par défaut par agent (`agents.list[].thinkingDefault` dans la configuration).
4. Par défaut global (`agents.defaults.thinkingDefault` dans la configuration).
5. Par défaut : `adaptive` pour les modèles Anthropic Claude 4.6, `low` pour les autres modèles capables de raisonnement, `off` sinon.

## Définir une valeur par défaut de session

- Envoyez un message qui est **uniquement** la directive (espaces autorisés), par exemple `/think:medium` ou `/t high`.
- Cela reste pour la session en cours (par expéditeur par défaut) ; effacé par `/think:off` ou la réinitialisation par inactivité de la session.
- Une réponse de confirmation est envoyée (`Thinking level set to high.` / `Thinking disabled.`). Si le niveau n'est pas valide (par exemple `/thinking big`), la commande est rejetée avec un indice et l'état de la session reste inchangé.
- Envoyez `/think` (ou `/think:`) sans argument pour voir le niveau de réflexion actuel.

## Application par l'agent

- **Pi intégré** : le niveau résolu est transmis au runtime de l'agent Pi en cours de processus.

## Mode rapide (/fast)

- Niveaux : `on|off`.
- Un message de directive uniquement active/désactive le remplacement du mode rapide de session et répond `Fast mode enabled.` / `Fast mode disabled.`.
- Envoyez `/fast` (ou `/fast status`) sans mode pour voir l'état actuel effectif du mode rapide.
- OpenClaw résout le mode rapide dans cet ordre :
  1. `/fast on|off` en ligne/directive uniquement
  2. Remplacement de session
  3. Par défaut par agent (`agents.list[].fastModeDefault`)
  4. Configuration par modèle : `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Repli : `off`
- Pour `openai/*`, le mode rapide correspond au traitement prioritaire OpenAI en envoyant `service_tier=priority` sur les requêtes Responses prises en charge.
- Pour `openai-codex/*`, le mode rapide envoie le même indicateur `service_tier=priority` sur les réponses Codex. OpenClaw conserve un basculement partagé `/fast` sur les deux chemins d'authentification.
- Pour les requêtes publiques directes `anthropic/*`, y compris le trafic authentifié OAuth envoyé à `api.anthropic.com`, le mode rapide correspond aux niveaux de service Anthropic : `/fast on` définit `service_tier=auto`, `/fast off` définit `service_tier=standard_only`.
- Pour `minimax/*` sur le chemin compatible Anthropic, `/fast on` (ou `params.fastMode: true`) réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.
- Les paramètres de modèle Anthropic explicites `serviceTier` / `service_tier` remplacent la valeur par défaut du mode rapide lorsque les deux sont définis. OpenClaw ignore toujours l'injection de niveau de service Anthropic pour les URL de base de proxy non Anthropic.

## Directives verbeuses (/verbose ou /v)

- Niveaux : `on` (minimal) | `full` | `off` (par défaut).
- Un message de directive uniquement active/désactive le mode verbeux de session et répond `Verbose logging enabled.` / `Verbose logging disabled.` ; les niveaux non valides renvoient un indice sans changer l'état.
- `/verbose off` stocke un remplacement explicite de session ; effacez-le via l'interface utilisateur Sessions en choisissant `inherit`.
- La directive en ligne n'affecte que ce message ; sinon, les valeurs par défaut de session/globales s'appliquent.
- Envoyez `/verbose` (ou `/verbose:`) sans argument pour voir le niveau verbose actuel.
- Lorsque le mode verbose est activé, les agents qui émettent des résultats d'outils structurés (Pi, autres agents JSON) renvoient chaque appel d'outil comme son propre message contenant uniquement des métadonnées, préfixé par `<emoji> <tool-name>: <arg>` lorsque disponible (chemin/commande). Ces résumés d'outils sont envoyés dès que chaque outil démarre (bulles séparées), et non sous forme de deltas de flux.
- Les résumés d'échecs d'outils restent visibles en mode normal, mais les suffixes de détails d'erreur bruts sont masqués sauf si le mode verbose est `on` ou `full`.
- Lorsque le mode verbose est `full`, les sorties des outils sont également transmises après achèvement (bulle séparée, tronquée à une longueur sûre). Si vous basculez `/verbose on|full|off` pendant qu'une exécution est en cours, les bulles d'outils suivantes respectent le nouveau paramètre.

## Directives de trace de plugin (/trace)

- Niveaux : `on` | `off` (par défaut).
- Un message contenant uniquement la directive active/désactive la sortie de trace du plugin de session et répond `Plugin trace enabled.` / `Plugin trace disabled.`.
- La directive en ligne n'affecte que ce message ; sinon, les valeurs par défaut de session/globales s'appliquent.
- Envoyez `/trace` (ou `/trace:`) sans argument pour voir le niveau de trace actuel.
- `/trace` est plus restrictif que `/verbose` : il n'expose que les lignes de trace/débogage appartenant à des plugins, telles que les résumés de débogage de la mémoire active.
- Les lignes de trace peuvent apparaître dans `/status` et sous forme de message de diagnostic de suivi après la réponse normale de l'assistant.

## Visibilité du raisonnement (/reasoning)

- Niveaux : `on|off|stream`.
- Un message contenant uniquement la directive active/désactive l'affichage des blocs de réflexion dans les réponses.
- Lorsqu'elle est activée, le raisonnement est envoyé comme un **message distinct** préfixé par `Reasoning:`.
- `stream` (Telegram uniquement) : diffuse le raisonnement dans la bulle de brouillon Telegram pendant la génération de la réponse, puis envoie la réponse finale sans le raisonnement.
- Alias : `/reason`.
- Envoyez `/reasoning` (ou `/reasoning:`) sans argument pour voir le niveau de raisonnement actuel.
- Ordre de résolution : directive en ligne, puis remplacement de session, puis valeur par défaut par agent (`agents.list[].reasoningDefault`), puis repli (`off`).

## Connexes

- La documentation du mode élevé se trouve dans [Mode élevé](/en/tools/elevated).

## Battements de cœur (Heartbeats)

- Le corps de la sonde de battement de cœur est l'invite de battement de cœur configurée (par défaut : `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Les directives en ligne dans un message de battement de cœur s'appliquent comme d'habitude (mais évitez de modifier les valeurs par défaut de session depuis les battements de cœur).
- La livraison des battements de cœur par défaut concerne uniquement la charge utile finale. Pour envoyer également le message distinct `Reasoning:` (lorsqu'il est disponible), définissez `agents.defaults.heartbeat.includeReasoning: true` ou `agents.list[].heartbeat.includeReasoning: true` par agent.

## Interface utilisateur de chat Web

- Le sélecteur de réflexion du chat Web reflète le niveau stocké de la session à partir du magasin/configuration de session entrant lors du chargement de la page.
- Choisir un autre niveau écrit immédiatement la substitution de session via `sessions.patch` ; il n'attend pas le prochain envoi et ce n'est pas une substitution `thinkingOnce` unique.
- La première option est toujours `Default (<resolved level>)`, où la valeur par défaut résolue provient du modèle de session actif : `adaptive` pour Claude 4.6 sur Anthropic/Bedrock, `low` pour d'autres modèles capables de raisonnement, `off` sinon.
- Le sélecteur reste conscient du fournisseur :
  - la plupart des fournisseurs affichent `off | minimal | low | medium | high | adaptive`
  - Z.AI affiche `off | on` binaire
- `/think:<level>` fonctionne toujours et met à jour le même niveau de session stocké, les directives de chat et le sélecteur restent donc synchronisés.
