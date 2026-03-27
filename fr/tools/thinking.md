---
summary: "Syntaxe des directives pour /think, /fast, /verbose et la visibilité du raisonnement"
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
  - Z.AI (`zai/*`) prend uniquement en charge la réflexion binaire (`on`/`off`). Tout niveau autre que `off` est traité comme `on` (correspond à `low`).
  - Moonshot (`moonshot/*`) mappe `/think off` à `thinking: { type: "disabled" }` et tout niveau autre que `off` à `thinking: { type: "enabled" }`. Lorsque la réflexion est activée, Moonshot n'accepte que `tool_choice` `auto|none` ; OpenClaw normalise les valeurs incompatibles à `auto`.

## Ordre de résolution

1. Directive en ligne sur le message (s'applique uniquement à ce message).
2. Remplacement de session (défini en envoyant un message contenant uniquement une directive).
3. Par défaut par agent (`agents.list[].thinkingDefault` dans la configuration).
4. Par défaut global (`agents.defaults.thinkingDefault` dans la configuration).
5. Par défaut : `adaptive` pour les modèles Anthropic Claude 4.6, `low` pour les autres modèles capables de raisonnement, `off` sinon.

## Définir une valeur par défaut de session

- Envoyez un message qui est **uniquement** la directive (espaces autorisés), par ex. `/think:medium` ou `/t high`.
- Cela s'applique pour la session en cours (par expéditeur par défaut) ; effacé par `/think:off` ou une réinitialisation d'inactivité de la session.
- Une réponse de confirmation est envoyée (`Thinking level set to high.` / `Thinking disabled.`). Si le niveau n'est pas valide (par ex. `/thinking big`), la commande est rejetée avec un indice et l'état de la session reste inchangé.
- Envoyez `/think` (ou `/think:`) sans argument pour voir le niveau de réflexion actuel.

## Application par agent

- **Pi intégré** : le niveau résolu est passé au runtime de l'agent Pi en cours de processus.

## Mode rapide (/fast)

- Niveaux : `on|off`.
- Un message de directive uniquement active/désactive la priorité du mode rapide de session et répond `Fast mode enabled.` / `Fast mode disabled.`.
- Envoyez `/fast` (ou `/fast status`) sans mode pour voir l'état actuel du mode rapide effectif.
- OpenClaw résout le mode rapide dans cet ordre :
  1. En ligne/directive uniquement `/fast on|off`
  2. Priorité de session
  3. Par défaut par agent (`agents.list[].fastModeDefault`)
  4. Configuration par modèle : `agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. Par défaut : `off`
- Pour `openai/*`, le mode rapide applique le profil rapide OpenAI : `service_tier=priority` lorsque pris en charge, ainsi qu'un effort de raisonnement faible et une verbosité de texte faible.
- Pour `openai-codex/*`, le mode rapide applique le même profil à faible latence sur les réponses Codex. OpenClaw conserve un commutateur `/fast` partagé sur les deux chemins d'authentification.
- Pour les demandes directes avec clé `anthropic/*` API, le mode rapide correspond aux niveaux de service Anthropic : `/fast on` définit `service_tier=auto`, `/fast off` définit `service_tier=standard_only`.
- Le mode rapide Anthropic est réservé aux clés API. OpenClaw ignore l'injection de niveau de service Anthropic pour l'authentification par jeton de configuration Claude / OAuth et pour les URL de base de proxy non Anthropic.

## Directives détaillées (/verbose ou /v)

- Niveaux : `on` (minimal) | `full` | `off` (par défaut).
- Un message contenant uniquement la directive bascule le mode détaillé de la session et répond `Verbose logging enabled.` / `Verbose logging disabled.` ; les niveaux non valides renvoient une indication sans modifier l'état.
- `/verbose off` stocke une substitution explicite pour la session ; effacez-la via l'interface Sessions en choisissant `inherit`.
- La directive en ligne n'affecte que ce message ; sinon, les valeurs par défaut de session/globales s'appliquent.
- Envoyez `/verbose` (ou `/verbose:`) sans argument pour voir le niveau de détail actuel.
- Lorsque le mode détaillé est activé, les agents qui émettent des résultats de %%PH:GLOSSARY:pi:normalize%% structurés (Pi, autres agents JSON) renvoient chaque appel d'outil sous forme de message contenant uniquement ses propres métadonnées, préfixé par `<emoji> <tool-name>: <arg>` si disponible (chemin/commande). Ces résumés d'outils sont envoyés dès le début de chaque outil (bulles séparées), et non sous forme de deltas de flux.
- Les résumés d'échecs d'outils restent visibles en mode normal, mais les suffixes de détails d'erreurs brutes sont masqués, sauf si le niveau de détail est `on` ou `full`.
- Lorsque le niveau de détail est `full`, les sorties des outils sont également transmises après achèvement (bulle séparée, tronquée à une longueur sûre). Si vous basculez `/verbose on|full|off` pendant qu'une exécution est en cours, les bulles d'outils suivantes respectent le nouveau paramètre.

## Visibilité du raisonnement (/reasoning)

- Niveaux : `on|off|stream`.
- Un message contenant uniquement la directive bascule l'affichage des blocs de réflexion dans les réponses.
- Lorsqu'elle est activée, le raisonnement est envoyé sous la forme d'un **message distinct** préfixé par `Reasoning:`.
- `stream` (Telegram uniquement) : diffuse le raisonnement dans la bulle de brouillon Telegram pendant la génération de la réponse, puis envoie la réponse finale sans le raisonnement.
- Alias : `/reason`.
- Envoyez `/reasoning` (ou `/reasoning:`) sans argument pour voir le niveau de raisonnement actuel.
- Ordre de résolution : directive en ligne, puis remplacement de session, puis défaut par agent (`agents.list[].reasoningDefault`), puis repli (`off`).

## Connexe

- La documentation du mode élevé se trouve dans [Elevated mode](/fr/tools/elevated).

## Heartbeats

- Le corps de la sonde de heartbeat est le prompt de heartbeat configuré (par défaut : `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Les directives en ligne dans un message de heartbeat s'appliquent comme d'habitude (mais évitez de modifier les valeurs par défaut de session via les heartbeats).
- La livraison du heartbeat par défaut concerne uniquement la charge utile finale. Pour envoyer également le message `Reasoning:` séparé (si disponible), définissez `agents.defaults.heartbeat.includeReasoning: true` ou `agents.list[].heartbeat.includeReasoning: true` par agent.

## Interface Web de chat

- Le sélecteur de réflexion du chat Web reflète le niveau stocké de la session depuis le magasin/config de session entrante lors du chargement de la page.
- Choisir un autre niveau ne s'applique qu'au message suivant (`thinkingOnce`) ; après l'envoi, le sélecteur revient au niveau de session stocké.
- Pour modifier la valeur par défaut de la session, envoyez une directive `/think:<level>` (comme auparavant) ; le sélecteur reflètera cela après le prochain rechargement.

import fr from "/components/footer/fr.mdx";

<fr />
