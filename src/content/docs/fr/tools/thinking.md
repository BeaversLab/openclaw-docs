---
summary: "Directive syntax for /think, /fast, /verbose, /trace, and reasoning visibility"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "Niveaux de réflexion"
---

## Ce que cela fait

- Directive en ligne dans n'importe quel corps entrant : `/t <level>`, `/think:<level>`, ou `/thinking <level>`.
- Niveaux (alias) : `off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → « think »
  - low → « think hard »
  - medium → « think harder »
  - high → « ultrathink » (budget max)
  - xhigh → « ultrathink+ » (modèles GPT-5.2+ et Codex, ainsi que l'effort Anthropic Claude Opus 4.7)
  - adaptive → réflexion adaptative gérée par le provider (prise en charge pour Claude 4.6 sur Anthropic/Bedrock, Anthropic Claude Opus 4.7, et la réflexion dynamique de Google Gemini)
  - max → raisonnement max du provider (Anthropic Claude Opus 4.7 ; Ollama mappe cela à son effort `think` natif le plus élevé)
  - `x-high`, `x_high`, `extra-high`, `extra high`, et `extra_high` correspondent à `xhigh`.
  - `highest` correspond à `high`.
- Notes du provider :
  - Les menus et sélecteurs de réflexion sont pilotés par le profil de provider. Les plugins de provider déclarent l'ensemble exact de niveaux pour le modèle sélectionné, y compris des étiquettes telles que binaire `on`.
  - `adaptive`, `xhigh`, et `max` ne sont proposés que pour les profils provider/modèle qui les prennent en charge. Les directives tapées pour les niveaux non pris en charge sont rejetées avec les options valides de ce modèle.
  - Les niveaux non pris en charge déjà stockés sont remappés par rang de profil de provider. `adaptive` revient à `medium` sur les modèles non adaptatifs, tandis que `xhigh` et `max` reviennent au plus grand niveau non-off pris en charge pour le modèle sélectionné.
  - Les modèles Anthropic Claude 4.6 sont par défaut sur `adaptive` lorsqu'aucun niveau de réflexion explicite n'est défini.
  - Anthropic Claude Opus 4.7 n'a pas par défaut la réflexion adaptative. Son niveau d'effort API par défaut reste la propriété du fournisseur, sauf si vous définissez explicitement un niveau de réflexion.
  - Anthropic Claude Opus 4.7 mappe `/think xhigh` à une réflexion adaptative plus `output_config.effort: "xhigh"`, car `/think` est une directive de réflexion et `xhigh` est le paramètre d'effort Opus 4.7.
  - Anthropic Claude Opus 4.7 expose également `/think max` ; il correspond au même chemin d'effort maximal appartenant au fournisseur.
  - Les modèles Ollama compatibles avec la réflexion exposent `/think low|medium|high|max` ; `max` correspond au `think: "high"` natif car l'API native d'Ollama accepte les chaînes d'effort `low`, `medium` et `high`.
  - Les modèles GPT d'OpenAI mappent `/think` via la prise en charge de l'effort de l'API Responses spécifique au modèle. `/think off` envoie `reasoning.effort: "none"` uniquement lorsque le modèle cible le prend en charge ; sinon, OpenClaw omet la charge utile de raisonnement désactivée au lieu d'envoyer une valeur non prise en charge.
  - Les références obsolètes configurées d'OpenRouter Hunter Alpha ignorent l'injection du raisonnement proxy, car cet ancien itinéraire pouvait renvoyer du texte de réponse finale via des champs de raisonnement.
  - Google Gemini mappe `/think adaptive` à la réflexion dynamique appartenant au fournisseur de Gemini. Les requêtes Gemini 3 omettent un `thinkingLevel` fixe, tandis que les requêtes Gemini 2.5 envoient `thinkingBudget: -1` ; les niveaux fixes mappent toujours au `thinkingLevel` ou au budget Gemini le plus proche pour cette famille de modèles.
  - MiniMax (`minimax/*`) sur le chemin de streaming compatible Anthropic est réglé par défaut sur `thinking: { type: "disabled" }`, sauf si vous définissez explicitement la réflexion dans les paramètres du modèle ou de la requête. Cela évite les fuites de deltas `reasoning_content` provenant du format de flux Anthropic non natif de MiniMax.
  - Z.AI (`zai/*`) prend uniquement en charge la réflexion binaire (`on`/`off`). Tout niveau non `off` est traité comme `on` (mappé à `low`).
  - Moonshot (`moonshot/*`) mappe `/think off` à `thinking: { type: "disabled" }` et tout niveau non `off` à `thinking: { type: "enabled" }`. Lorsque la réflexion est activée, Moonshot n'accepte que `tool_choice` `auto|none` ; OpenClaw normalise les valeurs incompatibles à `auto`.

## Ordre de résolution

1. Directive en ligne sur le message (s'applique uniquement à ce message).
2. Remplacement de session (défini en envoyant un message contenant uniquement la directive).
3. Valeur par défaut par agent (`agents.list[].thinkingDefault` dans la configuration).
4. Valeur par défaut globale (`agents.defaults.thinkingDefault` dans la configuration).
5. Repli : valeur par défaut déclarée par le fournisseur si disponible ; sinon, les modèles capables de raisonnement résolvent à `medium` ou au niveau non-`off` le plus proche pris en charge pour ce modèle, et les modèles non raisonnables restent `off`.

## Définir une valeur par défaut de session

- Envoyez un message qui ne contient **que** la directive (les espaces blancs sont autorisés), par exemple `/think:medium` ou `/t high`.
- Cela reste en vigueur pour la session en cours (par expéditeur par défaut) ; effacé par `/think:off` ou la réinitialisation suite à l'inactivité de la session.
- Une réponse de confirmation est envoyée (`Thinking level set to high.` / `Thinking disabled.`). Si le niveau n'est pas valide (par exemple `/thinking big`), la commande est rejetée avec un indice et l'état de la session reste inchangé.
- Envoyez `/think` (ou `/think:`) sans argument pour voir le niveau de réflexion actuel.

## Application par l'agent

- **Pi intégré** : le niveau résolu est transmis au runtime de l'agent Pi en cours de processus.

## Mode rapide (/fast)

- Niveaux : `on|off`.
- Un message contenant uniquement la directive active/désactive le remplacement du mode rapide de session et répond `Fast mode enabled.` / `Fast mode disabled.`.
- Envoyez `/fast` (ou `/fast status`) sans mode pour voir l'état actuel effectif du mode rapide.
- OpenClaw résout le mode rapide dans cet ordre :
  1. En ligne/uniquement la directive `/fast on|off`
  2. Remplacement de session
  3. Valeur par défaut par agent (`agents.list[].fastModeDefault`)
  4. Configuration par modèle : `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Repli : `off`
- Pour `openai/*`, le mode rapide correspond au traitement prioritaire OpenAI en envoyant `service_tier=priority` sur les requêtes Responses prises en charge.
- Pour `openai-codex/*`, le mode rapide envoie le même indicateur `service_tier=priority` sur les réponses Codex. OpenClaw conserve un seul commutateur `/fast` partagé sur les deux chemins d'authentification.
- Pour les requêtes publiques directes `anthropic/*`, y compris le trafic authentifié OAuth envoyé à `api.anthropic.com`, le mode rapide correspond aux niveaux de service Anthropic : `/fast on` définit `service_tier=auto`, `/fast off` définit `service_tier=standard_only`.
- Pour `minimax/*` sur le chemin compatible Anthropic, `/fast on` (ou `params.fastMode: true`) réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.
- Les paramètres de modèle explicites Anthropic `serviceTier` / `service_tier` remplacent la valeur par défaut du mode rapide lorsque les deux sont définis. OpenClaw ignore toujours l'injection du niveau de service Anthropic pour les URL de base de proxy non Anthropic.
- `/status` affiche `Fast` uniquement lorsque le mode rapide est activé.

## Directives de verbosité (/verbose ou /v)

- Niveaux : `on` (minimal) | `full` | `off` (par défaut).
- Un message contenant uniquement la directive bascule la verbosité de la session et répond `Verbose logging enabled.` / `Verbose logging disabled.` ; les niveaux non valides renvoient une indication sans modifier l'état.
- `/verbose off` stocke une substitution explicite de session ; effacez-la via l'interface Sessions en choisissant `inherit`.
- La directive en ligne n'affecte que ce message ; les valeurs par défaut de session/globales s'appliquent sinon.
- Envoyez `/verbose` (ou `/verbose:`) sans argument pour voir le niveau de verbosité actuel.
- Lorsque la verbosité est activée, les agents qui émettent des résultats d'outil structurés (Pi, autres agents JSON) renvoient chaque appel d'outil en tant que son propre message contenant uniquement des métadonnées, préfixé par `<emoji> <tool-name>: <arg>` si disponible (chemin/commande). Ces résumés d'outils sont envoyés dès que chaque outil démarre (bulles distinctes), et non sous forme de deltas de streaming.
- Les résumés des échecs d'outils restent visibles en mode normal, mais les suffixes de détails d'erreur bruts sont masqués sauf si verbose est `on` ou `full`.
- Lorsque verbose est `full`, les sorties des outils sont également transmises après achèvement (bulle séparée, tronquée à une longueur sûre). Si vous basculez `/verbose on|full|off` pendant qu'une exécution est en cours, les bulles d'outil suivantes respectent le nouveau paramètre.

## Directives de trace de plugin (/trace)

- Niveaux : `on` | `off` (par défaut).
- Un message contenant uniquement une directive active/désactive la sortie de trace de plugin de session et répond `Plugin trace enabled.` / `Plugin trace disabled.`.
- La directive en ligne n'affecte que ce message ; les valeurs par défaut de session/globales s'appliquent sinon.
- Envoyez `/trace` (ou `/trace:`) sans argument pour voir le niveau de trace actuel.
- `/trace` est plus étroit que `/verbose` : il n'expose que les lignes de trace/débogage appartenant au plugin, telles que les résumés de débogage de la Mémoire Active.
- Les lignes de trace peuvent apparaître dans `/status` et sous forme de message de diagnostic de suite après la réponse normale de l'assistant.

## Visibilité du raisonnement (/reasoning)

- Niveaux : `on|off|stream`.
- Un message contenant uniquement une directive active/désactive l'affichage des blocs de réflexion dans les réponses.
- Lorsqu'il est activé, le raisonnement est envoyé comme un **message séparé** préfixé par `Reasoning:`.
- `stream` (Telegram uniquement) : diffuse le raisonnement dans la bulle de brouillon Telegram pendant la génération de la réponse, puis envoie la réponse finale sans le raisonnement.
- Alias : `/reason`.
- Envoyez `/reasoning` (ou `/reasoning:`) sans argument pour voir le niveau de raisonnement actuel.
- Ordre de résolution : directive en ligne, puis remplacement de session, puis valeur par défaut par agent (`agents.list[].reasoningDefault`), puis repli (`off`).

Les balises de raisonnement de modèle local malformées sont gérées de manière conservatrice. Les blocs fermés `<think>...</think>` restent masqués dans les réponses normales, et le raisonnement non fermé après du texte déjà visible est également masqué. Si une réponse est entièrement enveloppée dans une seule balise d'ouverture non fermée et serait sinon livrée sous forme de texte vide, OpenClaw supprime la balise d'ouverture malformée et livre le texte restant.

## Connexes

- La documentation du mode élevé se trouve dans [Mode élevé](/fr/tools/elevated).

## Battements de cœur (Heartbeats)

- Le corps de la sonde de battement de cœur est le prompt de battement de cœur configuré (par défaut : `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Les directives en ligne dans un message de battement de cœur s'appliquent comme d'habitude (mais évitez de modifier les valeurs par défaut de la session via les battements de cœur).
- La livraison du battement de cœur par défaut uniquement à la charge utile finale. Pour également envoyer le message séparé `Reasoning:` (si disponible), définissez `agents.defaults.heartbeat.includeReasoning: true` ou `agents.list[].heartbeat.includeReasoning: true` par agent.

## Interface utilisateur de chat Web

- Le sélecteur de réflexion (thinking) du chat Web reflète le niveau stocké de la session à partir du magasin/config de la session entrante lors du chargement de la page.
- Le choix d'un autre niveau écrit immédiatement la priorité de session via `sessions.patch` ; il n'attend pas le prochain envoi et ce n'est pas une priorité ponctuelle `thinkingOnce`.
- La première option est toujours `Default (<resolved level>)`, où la valeur par défaut résolue provient du profil de réflexion du provider du modèle de session active, plus la même logique de repli que `/status` et `session_status` utilisent.
- Le sélecteur utilise les `thinkingLevels` renvoyés par la ligne/paramètres par défaut de la session de passerelle, avec `thinkingOptions` conservés comme une liste de légacies (héritage). L'interface utilisateur du navigateur ne conserve pas sa propre liste de regex de provider ; les plugins possèdent des ensembles de niveaux spécifiques aux modèles.
- `/think:<level>` fonctionne toujours et met à jour le même niveau de session stocké, de sorte que les directives de chat et le sélecteur restent synchronisés.

## Profils de provider

- Les plugins de provider peuvent exposer `resolveThinkingProfile(ctx)` pour définir les niveaux pris en charge et la valeur par défaut du modèle.
- Les plugins de provider qui proxient les modèles Claude doivent réutiliser `resolveClaudeThinkingProfile(modelId)` de `openclaw/plugin-sdk/provider-model-shared` afin que les catalogues directs Anthropic et proxy restent alignés.
- Chaque niveau de profil possède un `id` canonique stocké (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `adaptive` ou `max`) et peut inclure un `label` d'affichage. Les fournisseurs binaires utilisent `{ id: "low", label: "on" }`.
- Les plugins d'outils qui doivent valider une substitution de réflexion explicite doivent utiliser `api.runtime.agent.resolveThinkingPolicy({ provider, model })` ainsi que `api.runtime.agent.normalizeThinkingLevel(...)` ; ils ne doivent pas conserver leurs propres listes de niveaux fournisseur/modèle.
- Les hooks hérités publiés (`supportsXHighThinking`, `isBinaryThinking` et `resolveDefaultThinkingLevel`) restent en tant qu'adaptateurs de compatibilité, mais les nouveaux ensembles de niveaux personnalisés doivent utiliser `resolveThinkingProfile`.
- Les lignes/valeurs par défaut du Gateway exposent `thinkingLevels`, `thinkingOptions` et `thinkingDefault` afin que les clients ACP/chat affichent les mêmes identifiants et étiquettes de profil que ceux utilisés par la validation à l'exécution.
