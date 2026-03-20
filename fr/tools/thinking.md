---
summary: "Syntaxe des directives pour /think, /fast, /verbose et la visibilité du raisonnement"
read_when:
  - Ajustement de l'analyse ou des valeurs par défaut des directives de réflexion, du mode rapide ou détaillé
title: "Niveaux de réflexion"
---

# Niveaux de réflexion (directives /think)

## Fonctionnement

- Directive en ligne dans n'importe quel corps entrant : `/t <level>`, `/think:<level>` ou `/thinking <level>`.
- Niveaux (alias) : `off | minimal | low | medium | high | xhigh | adaptive`
  - minimal → « think »
  - low → « think hard »
  - medium → « think harder »
  - high → « ultrathink » (budget max)
  - xhigh → « ultrathink+ » (modèles GPT-5.2 + Codex uniquement)
  - adaptive → budget de raisonnement adaptatif géré par le provider (pris en charge pour la famille de modèles Claude 4.6 d'Anthropic)
  - `x-high`, `x_high`, `extra-high`, `extra high` et `extra_high` correspondent à `xhigh`.
  - `highest`, `max` correspondent à `high`.
- Notes du provider :
  - Les modèles Anthropic Claude 4.6 sont définis par défaut sur `adaptive` lorsqu'aucun niveau de réflexion explicite n'est défini.
  - Z.AI (`zai/*`) prend uniquement en charge la réflexion binaire (`on`/`off`). Tout niveau autre que `off` est traité comme `on` (mappé à `low`).
  - Moonshot (`moonshot/*`) mappe `/think off` à `thinking: { type: "disabled" }` et tout niveau autre que `off` à `thinking: { type: "enabled" }`. Lorsque la réflexion est activée, Moonshot n'accepte que `tool_choice` `auto|none` ; OpenClaw normalise les valeurs incompatibles à `auto`.

## Ordre de résolution

1. Directive en ligne sur le message (s'applique uniquement à ce message).
2. Remplacement de session (défini en envoyant un message contenant uniquement une directive).
3. Valeur par défaut globale (`agents.defaults.thinkingDefault` dans la configuration).
4. Valeur de repli : `adaptive` pour les modèles Anthropic Claude 4.6, `low` pour les autres modèles capables de raisonnement, `off` sinon.

## Définir une valeur par défaut de session

- Envoyez un message qui ne contient **que** la directive (espaces autorisés), par exemple `/think:medium` ou `/t high`.
- Cela reste en vigueur pour la session actuelle (par expéditeur par défaut) ; effacé par `/think:off` ou par la réinitialisation lors de l'inactivité de la session.
- Une réponse de confirmation est envoyée (`Thinking level set to high.` / `Thinking disabled.`). Si le niveau n'est pas valide (par ex. `/thinking big`), la commande est rejetée avec un indice et l'état de la session reste inchangé.
- Envoyez `/think` (ou `/think:`) sans argument pour voir le niveau de réflexion actuel.

## Application par l'agent

- **Pi intégré** : le niveau résolu est transmis au runtime de l'agent Pi en cours.

## Mode rapide (/fast)

- Niveaux : `on|off`.
- Un message composé uniquement d'une directive active/désactive le mode rapide de la session et répond `Fast mode enabled.` / `Fast mode disabled.`.
- Envoyez `/fast` (ou `/fast status`) sans mode pour voir l'état effectif actuel du mode rapide.
- OpenClaw résout le mode rapide dans cet ordre :
  1. En ligne/Message uniquement directive `/fast on|off`
  2. Priorité de session
  3. Configuration par model : `agents.defaults.models["<provider>/<model>"].params.fastMode`
  4. Repli (Fallback) : `off`
- Pour `openai/*`, le mode rapide applique le profil rapide OpenAI : `service_tier=priority` lorsqu'il est pris en charge, ainsi qu'un effort de raisonnement faible et une verbosité de texte faible.
- Pour `openai-codex/*`, le mode rapide applique le même profil à faible latence sur les réponses Codex. OpenClaw conserve un seul commutateur `/fast` partagé sur les deux chemins d'authentification.
- Pour les demandes directes avec clé API `anthropic/*`, le mode rapide correspond aux niveaux de service Anthropic : `/fast on` définit `service_tier=auto`, `/fast off` définit `service_tier=standard_only`.
- Le mode rapide Anthropic est réservé à la clé d'API. OpenClaw ignore l'injection du niveau de service Anthropic pour l'authentification par jeton de configuration Claude / OAuth et pour les URL de base de proxy non Anthropic.

## Directives détaillées (/verbose ou /v)

- Niveaux : `on` (minimal) | `full` | `off` (par défaut).
- Un message composé uniquement d'une directive active/désactive le mode verbeux de la session et répond `Verbose logging enabled.` / `Verbose logging disabled.` ; les niveaux non valides renvoient un indice sans modifier l'état.
- `/verbose off` stocke une substitution de session explicite ; effacez-la via l'interface utilisateur des Sessions en choisissant `inherit`.
- La directive en ligne n'affecte que ce message ; sinon, les valeurs par défaut de session/globale s'appliquent.
- Envoyez `/verbose` (ou `/verbose:`) sans argument pour voir le niveau de verbosité actuel.
- Lorsque le mode verbeux est activé, les agents qui émettent des résultats de tool structurés (Pi, autres agents JSON) renvoient chaque appel de tool sous forme de message de métadonnées, préfixé par `<emoji> <tool-name>: <arg>` si disponible (chemin/commande). Ces résumés de tool sont envoyés dès que chaque tool démarre (bulles séparées), et non sous forme de deltas de flux.
- Les résumés d'échec de tool restent visibles en mode normal, mais les suffixes de détail d'erreur brute sont masqués à moins que le mode verbeux ne soit `on` ou `full`.
- Lorsque le mode verbeux est `full`, les sorties de tool sont également transmises après achèvement (bulle séparée, tronquée à une longueur sûre). Si vous basculez `/verbose on|full|off` pendant qu'une exécution est en cours, les bulles de tool ultérieures respectent le nouveau paramètre.

## Visibilité du raisonnement (/reasoning)

- Niveaux : `on|off|stream`.
- Le message de directive uniquement indique si les blocs de réflexion sont affichés dans les réponses.
- Lorsqu'il est activé, le raisonnement est envoyé en tant que **message distinct** préfixé par `Reasoning:`.
- `stream` (Telegram uniquement) : diffuse le raisonnement dans la bulle de brouillon Telegram pendant la génération de la réponse, puis envoie la réponse finale sans le raisonnement.
- Alias : `/reason`.
- Envoyez `/reasoning` (ou `/reasoning:`) sans argument pour voir le niveau de raisonnement actuel.

## Connexes

- La documentation du mode élevé se trouve dans [Elevated mode](/fr/tools/elevated).

## Battements de cœur (Heartbeats)

- Le corps de la sonde de heartbeat est le prompt de heartbeat configuré (par défaut : `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Les directives en ligne dans un message de heartbeat s'appliquent comme d'habitude (mais évitez de modifier les valeurs par défaut de session via les heartbeats).
- La livraison du heartbeat par défaut concerne uniquement la charge utile finale. Pour envoyer également le message `Reasoning:` distinct (si disponible), définissez `agents.defaults.heartbeat.includeReasoning: true` ou `agents.list[].heartbeat.includeReasoning: true` par agent.

## Interface de chat Web

- Le sélecteur de réflexion du chat Web reflète le niveau stocké de la session à partir du magasin/la configuration de session entrante lors du chargement de la page.
- Le choix d'un autre niveau ne s'applique qu'au message suivant (`thinkingOnce`) ; après l'envoi, le sélecteur revient au niveau de session stocké.
- Pour modifier la valeur par défaut de la session, envoyez une directive `/think:<level>` (comme auparavant) ; le sélecteur la reflètera après le prochain rechargement.

import en from "/components/footer/en.mdx";

<en />
