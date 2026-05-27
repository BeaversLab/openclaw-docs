---
summary: "Directive syntax for /think, /fast, /verbose, /trace, and reasoning visibility"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "Niveaux de réflexion"
---

## Ce que cela fait

- Directive en ligne dans n'importe quel corps entrant : `/t <level>`, `/think:<level>`, ou `/thinking <level>`.
- Niveaux (alias) : `off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → "think"
  - low → "think hard"
  - medium → "think harder"
  - high → "ultrathink" (max budget)
  - xhigh → "ultrathink+" (GPT-5.2+ and Codex models, plus Anthropic Claude Opus 4.7 effort)
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
  - Direct DeepSeek V4 models expose `/think xhigh|max`; both map to DeepSeek `reasoning_effort: "max"` while lower non-off levels map to `high`.
  - OpenRouter-routed DeepSeek V4 models expose `/think xhigh` and send OpenRouter-supported `reasoning_effort` values. Stored `max` overrides fall back to `xhigh`.
  - Ollama thinking-capable models expose `/think low|medium|high|max`; `max` maps to native `think: "high"` because Ollama's native API accepts `low`, `medium`, and `high` effort strings.
  - OpenAI GPT models map `/think` through model-specific Responses API effort support. `/think off` sends `reasoning.effort: "none"` only when the target model supports it; otherwise OpenClaw omits the disabled reasoning payload instead of sending an unsupported value.
  - Custom OpenAI-compatible catalog entries can opt into `/think xhigh` by setting `models.providers.<provider>.models[].compat.supportedReasoningEfforts` to include `"xhigh"`. This uses the same compat metadata that maps outbound OpenAI reasoning effort payloads, so menus, session validation, agent CLI, and `llm-task` agree with transport behavior.
  - Stale configured OpenRouter Hunter Alpha refs skip proxy reasoning injection because that retired route could return final answer text through reasoning fields.
  - Google Gemini mappe `/think adaptive` à la réflexion dynamique propre au fournisseur de Gemini. Les requêtes Gemini 3 omettent un `thinkingLevel` fixe, tandis que les requêtes Gemini 2.5 envoient `thinkingBudget: -1` ; les niveaux fixes mappent toujours au `thinkingLevel` Gemini le plus proche ou au budget pour cette famille de modèles.
  - MiniMax (MiniMax`minimax/*`Anthropic) sur le chemin de streaming compatible Anthropic est par défaut `thinking: { type: "disabled" }`, sauf si vous définissez explicitement la réflexion dans les paramètres du modèle ou de la requête. Cela évite les fuites de deltas `reasoning_content`MiniMaxAnthropic provenant du format de flux Anthropic non natif de MiniMax.
  - Z.AI (`zai/*`) ne prend en charge que la réflexion binaire (`on`/`off`). Tout niveau autre que `off` est traité comme `on` (mappé à `low`).
  - Moonshot (Moonshot`moonshot/*`) mappe `/think off` à `thinking: { type: "disabled" }` et tout niveau autre que `off` à `thinking: { type: "enabled" }`Moonshot. Lorsque la réflexion est activée, Moonshot n'accepte que `tool_choice` `auto|none`OpenClaw ; OpenClaw normalise les valeurs incompatibles à `auto`.

## Ordre de résolution

1. Directive en ligne sur le message (s'applique uniquement à ce message).
2. Remplacement de session (défini en envoyant un message contenant uniquement une directive).
3. Par défaut par agent (`agents.list[].thinkingDefault` dans la configuration).
4. Par défaut global (`agents.defaults.thinkingDefault` dans la configuration).
5. Repli : par défaut déclaré par le fournisseur si disponible ; sinon, les modèles capables de raisonnement résolvent à `medium` ou au niveau non-`off` pris en charge le plus proche pour ce modèle, et les modèles non raisonnables restent `off`.

## Définir une valeur par défaut de session

- Envoyez un message qui est **uniquement** la directive (espaces autorisés), par exemple `/think:medium` ou `/t high`.
- Cela reste pour la session en cours (par expéditeur par défaut). Utilisez `/think default` pour effacer la priorité de session et hériter de la valeur par défaut configurée/du fournisseur ; les alias incluent `inherit`, `clear`, `reset` et `unpin`.
- `/think off` stocke une priorité de désactivation explicite. Il désactive la réflexion jusqu'à ce que vous modifiiez ou effaciez la priorité de session.
- Une réponse de confirmation est envoyée (`Thinking level set to high.` / `Thinking disabled.`). Si le niveau n'est pas valide (par exemple `/thinking big`), la commande est rejetée avec un indice et l'état de la session reste inchangé.
- Envoyez `/think` (ou `/think:`) sans argument pour voir le niveau de réflexion actuel.

## Application par l'agent

- **Pi intégré** : le niveau résolu est transmis au runtime de l'agent Pi en cours de processus.
- **Backend CLI de Claude** : les niveaux non désactivés sont transmis à Claude Code en tant que CLI`--effort` lors de l'utilisation de `claude-cli`CLI ; voir [Backends CLI](/fr/gateway/cli-backends).

## Mode rapide (/fast)

- Niveaux : `on|off|default`.
- Un message contenant uniquement une directive active une priorité de mode rapide de session et répond `Fast mode enabled.` / `Fast mode disabled.`. Utilisez `/fast default` pour effacer la priorité de session et hériter de la valeur par défaut configurée ; les alias incluent `inherit`, `clear`, `reset` et `unpin`.
- Envoyez `/fast` (ou `/fast status`) sans mode pour voir l'état effectif actuel du mode rapide.
- OpenClaw résout le mode rapide dans cet ordre :
  1. Priorité en ligne/de directive uniquement `/fast on|off` (`/fast default` efface ce niveau)
  2. Priorité de session
  3. Valeur par défaut par agent (`agents.list[].fastModeDefault`)
  4. Configuration par modèle : `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Alternative : `off`
- Pour `openai/*`, le mode rapide correspond au traitement prioritaire OpenAI en envoyant `service_tier=priority` sur les requêtes Responses prises en charge.
- Pour `openai-codex/*`, le mode rapide envoie le même indicateur `service_tier=priority` sur les réponses Codex. OpenClaw conserve un commutateur `/fast` partagé sur les deux chemins d'authentification.
- Pour les requêtes publiques directes `anthropic/*`, y compris le trafic authentifié OAuth envoyé à `api.anthropic.com`, le mode rapide correspond aux niveaux de service Anthropic : `/fast on` définit `service_tier=auto`, `/fast off` définit `service_tier=standard_only`.
- Pour `minimax/*` sur le chemin compatible Anthropic, `/fast on` (ou `params.fastMode: true`) réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.
- Les paramètres de modèle `serviceTier` / `service_tier` explicites Anthropic remplacent la valeur par défaut du mode rapide lorsque les deux sont définis. OpenClaw ignore toujours l'injection de niveau de service Anthropic pour les URL de base de proxy non Anthropic.
- `/status` affiche `Fast` uniquement lorsque le mode rapide est activé.

## Directives de mode verbeux (/verbose ou /v)

- Niveaux : `on` (minimal) | `full` | `off` (par défaut).
- Un message contenant uniquement une directive active le mode verbeux de la session et répond `Verbose logging enabled.` / `Verbose logging disabled.` ; les niveaux non valides renvoient un indice sans modifier l'état.
- `/verbose off` stocke une substitution explicite de session ; effacez-la via l'interface utilisateur Sessions en choisissant `inherit`.
- La directive en ligne n'affecte que ce message ; les valeurs par défaut de session/globales s'appliquent sinon.
- Envoyez `/verbose` (ou `/verbose:`) sans argument pour voir le niveau de verbosité actuel.
- Lorsque le mode verbeux est activé, les agents qui émettent des résultats d'outil structurés (Pi, autres agents JSON) renvoient chaque appel d'outil sous forme de message de métadonnées uniquement, préfixé par `<emoji> <tool-name>: <arg>` si disponible. Ces résumés d'outils sont envoyés dès le début de chaque outil (bulles séparées), et non sous forme de deltas de flux.
- Les résumés d'échecs d'outils restent visibles en mode normal, mais les suffixes de détails d'erreur bruts sont masqués sauf si verbose est `full`.
- Lorsque verbose est `full`, les sorties des outils sont également transmises après achèvement (bulle séparée, tronquée à une longueur sûre). Si vous basculez `/verbose on|full|off` pendant qu'une exécution est en cours, les bulles d'outils suivantes honorent le nouveau paramètre.
- `agents.defaults.toolProgressDetail` contrôle la forme des résumés d'outils `/verbose` et des lignes d'outils de brouillon de progression. Utilisez `"explain"` (par défaut) pour des libellés humains compacts tels que `🛠️ Exec: checking JS syntax` ; utilisez `"raw"` lorsque vous souhaitez également que la commande brute/détail soit ajoutée pour le débogage. `agents.list[].toolProgressDetail` par agent remplace la valeur par défaut.
  - `explain` : `🛠️ Exec: check JS syntax for /tmp/app.js`
  - `raw` : `🛠️ Exec: check JS syntax for /tmp/app.js, node --check /tmp/app.js`

## Directives de trace de plugin (/trace)

- Niveaux : `on` | `off` (par défaut).
- Un message contenant uniquement une directive active la sortie de trace de plugin de session et répond `Plugin trace enabled.` / `Plugin trace disabled.`.
- La directive en ligne n'affecte que ce message ; les valeurs par défaut de session/globale s'appliquent autrement.
- Envoyez `/trace` (ou `/trace:`) sans argument pour voir le niveau de trace actuel.
- `/trace` est plus étroit que `/verbose` : il n'expose que les lignes de trace/débogage appartenant à des plugins telles que les résumés de débogage de la Mémoire Active.
- Les lignes de trace peuvent apparaître dans `/status` et sous forme de message de diagnostic de suivi après la réponse normale de l'assistant.

## Visibilité du raisonnement (/reasoning)

- Niveaux : `on|off|stream`.
- Le message contenant uniquement la directive bascule l'affichage des blocs de réflexion dans les réponses.
- Lorsqu'elle est activée, le raisonnement est envoyé sous la forme d'un **message distinct** préfixé par `Thinking`.
- `stream`TelegramTelegram (Telegram uniquement) : diffuse le raisonnement dans la bulle de brouillon Telegram pendant que la réponse est générée, puis envoie la réponse finale sans le raisonnement.
- Alias : `/reason`.
- Envoyez `/reasoning` (ou `/reasoning:`) sans argument pour voir le niveau de raisonnement actuel.
- Ordre de résolution : directive en ligne, puis remplacement de session, puis valeur par défaut par agent (`agents.list[].reasoningDefault`), puis valeur par défaut globale (`agents.defaults.reasoningDefault`), puis repli (`off`).

Les balises de raisonnement mal formées pour les modèles locaux sont gérées de manière prudente. Les blocs `<think>...</think>`OpenClaw fermés restent masqués dans les réponses normales, et le raisonnement non fermé après du texte déjà visible est également masqué. Si une réponse est entièrement encapsulée dans une seule balise d'ouverture non fermée et serait sinon livrée comme du texte vide, OpenClaw supprime la balise d'ouverture mal formée et livre le texte restant.

## Connexes

- La documentation du mode élevé se trouve dans [Elevated mode](/fr/tools/elevated).

## Heartbeats

- Le corps de la sonde de heartbeat est le prompt de heartbeat configuré (par défaut : `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Les directives en ligne dans un message de heartbeat s'appliquent comme d'habitude (mais évitez de modifier les valeurs par défaut de la session depuis les heartbeats).
- La livraison du heartbeat correspond par défaut uniquement à la charge utile finale. Pour envoyer également le message `Thinking` séparé (lorsqu'il est disponible), définissez `agents.defaults.heartbeat.includeReasoning: true` ou `agents.list[].heartbeat.includeReasoning: true` par agent.

## Interface utilisateur du chat Web

- Le sélecteur de réflexion du chat Web reflète le niveau stocké de la session provenant du magasin/config de session entrante lors du chargement de la page.
- Choisir un autre niveau écrit immédiatement le remplacement de la session via `sessions.patch` ; cela n'attend pas le prochain envoi et ce n'est pas un remplacement `thinkingOnce` à usage unique.
- La première option est toujours le choix d'annulation du remplacement. Elle affiche `Inherited: <resolved level>`, y compris `Inherited: Off` lorsque la réflexion héritée est désactivée.
- Les choix explicites du sélecteur utilisent leurs libellés de niveau direct tout en préservant les libellés du fournisseur lorsqu'ils sont présents (par exemple `Maximum` pour une option `max` étiquetée par le fournisseur).
- Le sélecteur utilise `thinkingLevels` renvoyé par la ligne de session Gateway/les valeurs par défaut, avec `thinkingOptions` conservé comme liste d'étiquettes héritée. L'interface utilisateur du navigateur ne conserve pas sa propre liste d'expressions régulières de fournisseur ; les plugins possèdent des ensembles de niveaux spécifiques au modèle.
- `/think:<level>` fonctionne toujours et met à jour le même niveau de session stocké, de sorte que les directives de chat et le sélecteur restent synchronisés.

## Profils de fournisseur

- Les plugins de fournisseur peuvent exposer `resolveThinkingProfile(ctx)` pour définir les niveaux pris en charge et la valeur par défaut du modèle.
- Les plugins de fournisseur qui servent de proxy pour les modèles Claude doivent réutiliser `resolveClaudeThinkingProfile(modelId)` de `openclaw/plugin-sdk/provider-model-shared` afin que les catalogues Anthropic directs et de proxy restent alignés.
- Chaque niveau de profil possède un `id` canonique stocké (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `adaptive` ou `max`) et peut inclure un `label` d'affichage. Les fournisseurs binaires utilisent `{ id: "low", label: "on" }`.
- Les plugins d'outils qui doivent valider une substitution de réflexion explicite doivent utiliser `api.runtime.agent.resolveThinkingPolicy({ provider, model })` plus `api.runtime.agent.normalizeThinkingLevel(...)` ; ils ne doivent pas conserver leurs propres listes de niveaux de fournisseur/modèle.
- Les plugins d'outils ayant accès aux métadonnées de modèle personnalisé configurées peuvent transmettre `catalog` à `resolveThinkingPolicy` afin que les opt-ins `compat.supportedReasoningEfforts` soient reflétés dans la validation côté plugin.
- Les hooks hérités publiés (`supportsXHighThinking`, `isBinaryThinking` et `resolveDefaultThinkingLevel`) restent en tant qu'adaptateurs de compatibilité, mais les nouveaux ensembles de niveaux personnalisés doivent utiliser `resolveThinkingProfile`.
- Les lignes/valeurs par défaut de la Gateway exposent `thinkingLevels`, `thinkingOptions` et `thinkingDefault` afin que les clients ACP/chat affichent les mêmes identifiants et étiquettes de profil que ceux utilisés par la validation à l'exécution.
