---
summary: "Directive syntax for /think, /fast, /verbose, /trace, and reasoning visibility"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "Niveaux de réflexion"
---

# Niveaux de réflexion (directives /think)

## Fonctionnement

- Directive en ligne dans n'importe quel corps entrant : `/t <level>`, `/think:<level>`, ou `/thinking <level>`.
- Niveaux (alias) : `off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → « think »
  - low → « think hard »
  - medium → « think harder »
  - high → « ultrathink » (budget max)
  - xhigh → « ultrathink+ » (modèles GPT-5.2 + Codex et effort Anthropic Claude Opus 4.7)
  - adaptive → réflexion adaptative gérée par le fournisseur (prise en charge pour Claude 4.6 sur Anthropic/Bedrock et Anthropic Claude Opus 4.7)
  - max → raisonnement maximal du fournisseur (actuellement Anthropic Claude Opus 4.7)
  - `x-high`, `x_high`, `extra-high`, `extra high` et `extra_high` correspondent à `xhigh`.
  - `highest` correspond à `high`.
- Notes du fournisseur :
  - Les menus et sélecteurs de réflexion sont pilotés par le profil du fournisseur. Les plugins de fournisseur déclarent l'ensemble exact de niveaux pour le modèle sélectionné, y compris des étiquettes telles que binaire `on`.
  - `adaptive`, `xhigh` et `max` ne sont annoncés que pour les profils fournisseur/modèle qui les prennent en charge. Les directives tapées pour des niveaux non pris en charge sont rejetées avec les options valides de ce modèle.
  - Les niveaux non pris en charge existants stockés sont remappés par le rang du profil du fournisseur. `adaptive` revient à `medium` sur les modèles non adaptatifs, tandis que `xhigh` et `max` reviennent au plus grand niveau non désactivé pris en charge pour le modèle sélectionné.
  - Les modèles Claude 4.6 d'Anthropic Anthropic sont réglés par défaut sur `adaptive` lorsqu'aucun niveau de réflexion explicite n'est défini.
  - Anthropic Claude Opus 4.7 Anthropic n'est pas réglé par défaut sur la réflexion adaptative. Son effort API par défaut reste géré par le fournisseur, sauf si vous définissez explicitement un niveau de réflexion.
  - Anthropic Claude Opus 4.7 Anthropic mappe `/think xhigh` à une réflexion adaptative plus `output_config.effort: "xhigh"`, car `/think` est une directive de réflexion et `xhigh` est le paramètre d'effort d'Opus 4.7.
  - Anthropic Claude Opus 4.7 Anthropic expose également `/think max` ; il correspond au même chemin d'effort maximal géré par le fournisseur.
  - Les modèles GPT d'OpenAI OpenAI mappent `/think` via la prise en charge de l'effort de l'API Responses spécifique au modèle API. `/think off` envoie `reasoning.effort: "none"` uniquement lorsque le modèle cible le prend en charge ; sinon, OpenClaw OpenClaw omet la charge utile de raisonnement désactivée au lieu d'envoyer une valeur non prise en charge.
  - MiniMax (`minimax/*`) sur le chemin de flux compatible Anthropic MiniMax est réglé par défaut sur `thinking: { type: "disabled" }`, sauf si vous définissez explicitement la réflexion dans les paramètres du modèle ou de la requête. Cela évite les fuites de deltas `reasoning_content` provenant du format de flux Anthropic non natif de MiniMax Anthropic MiniMax.
  - Z.AI (`zai/*`) prend uniquement en charge la réflexion binaire (`on`/`off`). Tout niveau autre que `off` est traité comme `on` (mappé à `low`).
  - Moonshot (Moonshot) (`moonshot/*`) mappe `/think off` à `thinking: { type: "disabled" }` et tout niveau autre que `off` à `thinking: { type: "enabled" }`. Lorsque la réflexion est activée, Moonshot n'accepte que les `tool_choice` `auto|none` ; OpenClaw normalise les valeurs incompatibles à `auto`.

## Ordre de résolution

1. Directive en ligne sur le message (s'applique uniquement à ce message).
2. Remplacement de session (défini par l'envoi d'un message contenant uniquement une directive).
3. Par défaut par agent (`agents.list[].thinkingDefault` dans la configuration).
4. Par défaut global (`agents.defaults.thinkingDefault` dans la configuration).
5. Recours : valeur par défaut déclarée par le fournisseur si disponible, `low` pour les autres modèles de catalogue marqués comme capables de raisonnement, `off` sinon.

## Définir une valeur par défaut de session

- Envoyez un message qui ne contient **que** la directive (espaces autorisés), par exemple `/think:medium` ou `/t high`.
- Cela reste en vigueur pour la session en cours (par expéditeur par défaut) ; effacé par `/think:off` ou la réinitialisation par inactivité de la session.
- Une réponse de confirmation est envoyée (`Thinking level set to high.` / `Thinking disabled.`). Si le niveau n'est pas valide (par exemple `/thinking big`), la commande est rejetée avec un indice et l'état de la session reste inchangé.
- Envoyez `/think` (ou `/think:`) sans argument pour voir le niveau de réflexion actuel.

## Application par agent

- **Pi intégré** : le niveau résolu est transmis au runtime de l'agent Pi en processus.

## Mode rapide (/fast)

- Niveaux : `on|off`.
- Un message contenant uniquement une directive active/désactive le remplacement du mode rapide de session et répond `Fast mode enabled.` / `Fast mode disabled.`.
- Envoyez `/fast` (ou `/fast status`) sans mode pour voir l'état effectif actuel du mode rapide.
- OpenClaw résout le mode rapide dans cet ordre :
  1. Uniquement en ligne/directive `/fast on|off`
  2. Remplacement de session
  3. Par défaut par agent (`agents.list[].fastModeDefault`)
  4. Configuration par modèle : `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Par défaut : `off`
- Pour `openai/*`, le mode rapide correspond au traitement prioritaire OpenAI en envoyant `service_tier=priority` sur les requêtes Responses prises en charge.
- Pour `openai-codex/*`, le mode rapide envoie le même indicateur `service_tier=priority` sur les réponses Codex. OpenClaw conserve un seul commutateur `/fast` partagé sur les deux chemins d'authentification.
- Pour les requêtes publiques directes `anthropic/*`, y compris le trafic authentifié OAuth envoyé à `api.anthropic.com`, le mode rapide correspond aux niveaux de service Anthropic : `/fast on` définit `service_tier=auto`, `/fast off` définit `service_tier=standard_only`.
- Pour `minimax/*` sur le chemin compatible Anthropic, `/fast on` (ou `params.fastMode: true`) réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed`.
- Les paramètres de modèle explicites Anthropic `serviceTier` / `service_tier` remplacent la valeur par défaut du mode rapide lorsque les deux sont définis. OpenClaw ignore toujours l'injection de niveau de service Anthropic pour les URL de base de proxy non-Anthropic.
- `/status` affiche `Fast` uniquement lorsque le mode rapide est activé.

## Directives détaillées (/verbose ou /v)

- Niveaux : `on` (minimal) | `full` | `off` (par défaut).
- Un message contenant uniquement la directive bascule le mode détaillé de la session et répond `Verbose logging enabled.` / `Verbose logging disabled.` ; les niveaux non valides renvoient un indice sans modifier l'état.
- `/verbose off` stocke un remplacement explicite de session ; effacez-le via l'interface Sessions en choisissant `inherit`.
- La directive en ligne n'affecte que ce message ; sinon, les valeurs par défaut de session/globale s'appliquent.
- Envoyez `/verbose` (ou `/verbose:`) sans argument pour voir le niveau de détail actuel.
- Lorsque le mode verbeux est activé, les agents qui émettent des résultats de tool structurés (Pi, autres agents JSON) renvoient chaque appel de tool sous la forme de son propre message contenant uniquement des métadonnées, préfixé par `<emoji> <tool-name>: <arg>` si disponible (chemin/commande). Ces résumés de tool sont envoyés dès que chaque tool démarre (bulles séparées), et non sous forme de deltas de flux.
- Les résumés d'échec de tool restent visibles en mode normal, mais les suffixes de détails d'erreur bruts sont masqués sauf si verbeux est `on` ou `full`.
- Lorsque le mode verbeux est `full`, les sorties des tool sont également transmises après leur achèvement (bulle séparée, tronquée à une longueur sûre). Si vous basculez `/verbose on|full|off` pendant qu'une exécution est en cours, les bulles de tool suivantes respectent le nouveau paramètre.

## Directives de trace de plugin (/trace)

- Niveaux : `on` | `off` (par défaut).
- Un message contenant uniquement la directive active/désactive la sortie de trace de plugin de session et répond `Plugin trace enabled.` / `Plugin trace disabled.`.
- La directive en ligne n'affecte que ce message ; les valeurs par défaut de session/globales s'appliquent sinon.
- Envoyez `/trace` (ou `/trace:`) sans argument pour voir le niveau de trace actuel.
- `/trace` est plus restreint que `/verbose` : il n'expose que les lignes de trace/débogage appartenant à des plugins, telles que les résumés de débogage de la Mémoire Active.
- Les lignes de trace peuvent apparaître dans `/status` et sous forme de message de diagnostic de suivi après la réponse normale de l'assistant.

## Visibilité du raisonnement (/reasoning)

- Niveaux : `on|off|stream`.
- Un message contenant uniquement la directive active ou désactive l'affichage des blocs de réflexion dans les réponses.
- Lorsqu'il est activé, le raisonnement est envoyé comme un **message séparé** préfixé par `Reasoning:`.
- `stream` (Telegram uniquement) : diffuse le raisonnement dans la bulle de brouillon Telegram pendant la génération de la réponse, puis envoie la réponse finale sans le raisonnement.
- Alias : `/reason`.
- Envoyez `/reasoning` (ou `/reasoning:`) sans argument pour voir le niveau de raisonnement actuel.
- Ordre de résolution : directive en ligne, puis remplacement de session, puis valeur par défaut par agent (`agents.list[].reasoningDefault`), puis repli (`off`).

## Connexes

- La documentation du mode élevé se trouve dans [Elevated mode](/fr/tools/elevated).

## Heartbeats

- Le corps de la sonde heartbeat est le prompt heartbeat configuré (par défaut : `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Les directives en ligne dans un message heartbeat s'appliquent comme d'habitude (mais évitez de modifier les valeurs par défaut de la session depuis les heartbeats).
- La livraison du heartbeat correspond par défaut uniquement à la charge utile finale. Pour également envoyer le message séparé `Reasoning:` (si disponible), définissez `agents.defaults.heartbeat.includeReasoning: true` ou `agents.list[].heartbeat.includeReasoning: true` par agent.

## Interface utilisateur du chat Web

- Le sélecteur de réflexion du chat Web reflète le niveau stocké de la session à partir du magasin/ de la configuration de session entrante lors du chargement de la page.
- Choisir un autre niveau écrit le remplacement de la session immédiatement via `sessions.patch` ; il n'attend pas le prochain envoi et ce n'est pas un remplacement `thinkingOnce` ponctuel.
- La première option est toujours `Default (<resolved level>)`, où la valeur par défaut résolue provient du profil de réflexion du fournisseur du modèle de session actif.
- Le sélecteur utilise `thinkingOptions` renvoyé par la ligne de session de la passerelle. L'interface utilisateur du navigateur ne conserve pas sa propre liste de regex de fournisseur ; les plugins possèdent des ensembles de niveaux spécifiques aux modèles.
- `/think:<level>` fonctionne toujours et met à jour le même niveau de session stocké, de sorte que les directives de chat et le sélecteur restent synchronisés.

## Profils de fournisseur

- Les plugins de fournisseur peuvent exposer `resolveThinkingProfile(ctx)` pour définir les niveaux pris en charge et la valeur par défaut du modèle.
- Chaque niveau de profil possède un `id` canonique stocké (`off`, `minimal`, `low`, `medium`, `high`, `xhigh`, `adaptive` ou `max`) et peut inclure un `label` d'affichage. Les fournisseurs binaires utilisent `{ id: "low", label: "on" }`.
- Les hooks hérités publiés (`supportsXHighThinking`, `isBinaryThinking` et `resolveDefaultThinkingLevel`) restent en tant qu'adaptateurs de compatibilité, mais les nouveaux ensembles de niveaux personnalisés devraient utiliser `resolveThinkingProfile`.
- Les lignes Gateway exposent `thinkingOptions` et `thinkingDefault` pour que les clients ACP/chat affichent le même profil que celui utilisé par la validation d'exécution.
