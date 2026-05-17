---
summary: "Plan de suppression en priorité pour déplacer la colle d'entrée de channel répétée dans le cœur."
read_when:
  - Auditing why the channel ingress refactor added too much code
  - Moving route, command, event, activation, or access-group policy from bundled plugins into core
  - Reviewing whether a channel ingress helper actually deletes bundled plugin code
title: "Plan de suppression du cœur d'Ingress"
sidebarTitle: "Suppression du cœur d'Ingress"
---

# Plan de suppression du cœur d'Ingress

La refactorisation de l'ingress n'est pas saine tant qu'elle ajoute des milliers de lignes nettes. La centralisation du cœur ne compte que lorsque le code de production des plugins groupés diminue et que la compatibilité avec les anciens SDK tiers est mise en quarantaine dans les shims SDK/cœur.

Forme d'exécution souhaitée :

```text
bundled plugin event
  -> extract platform facts locally
  -> resolve shared ingress once when facts are available
  -> branch on generic ingress projections/outcomes
  -> perform platform side effects locally

old third-party helper
  -> SDK compatibility shim
  -> shared ingress-compatible projection where possible
  -> old return shape preserved
```

Les plugins groupés ne devraient pas reconvertir l'ingress en formes locales `AccessResult`,
`GroupAccessDecision`, `CommandAuthDecision`, `DmCommandAccess` ou
`{ allowed, reasonCode }`, sauf si ce type est une API publique de plugin.

## Budget

Mesuré par rapport à la base de fusion de la PR avec `origin/main`, y compris les fichiers non suivis.

```text
merge-base            1671e7532adb

current:
core production       +3,922 / -546    = +3,376
docs                  +601 / -17       = +584
other                 +145 / -2        = +143
plugin production     +4,148 / -5,388  = -1,240
tests                 +2,326 / -2,414  = -88
total                 +11,142 / -8,367 = +2,775

required:
plugin production     <= -1,500
core production       <= +1,500, or paid for by larger plugin deletion
tests                 <= +1,000
total                 <= +2,000

stretch:
plugin production     <= -2,500
core production       <= +1,200
total                 <= 0
```

Nettoyage restant minimum :

```text
plugin production     needs 260 more net deleted lines
total                 needs 775 more net deleted lines
core production       still +1,876 over standalone budget, unless paid down by plugin deletion
```

La suppression de commentaires uniquement ne compte pas comme un nettoyage. La passe de budget précédente était trop généreuse car elle incluait les commentaires explicatifs restaurés de QQBot ; ce document ne suit que le mouvement de code exécutable/docs/test.

Remesurer après chaque vague de nettoyage :

```sh
base=$(git merge-base HEAD origin/main)
git diff --shortstat "$base"
git diff --numstat "$base" -- src/channels/message-access src/plugin-sdk extensions | sort -nr -k1 | head -n 80
pnpm lint:extensions:no-deprecated-channel-access
```

## Diagnostic

La première passe a ajouté le noyau d'ingress partagé, puis a laissé trop d'autorisations locales de plugin à côté :

```text
platform facts
  -> shared ingress state and decision
  -> plugin-local DTO or legacy projection
  -> plugin-local if/else ladder
```

Cela duplique le model. La production du cœur a augmenté d'environ 3 376 lignes, tandis que la production des plugins groupés est 1 240 lignes plus petite. C'est mieux que la première passe, mais ce n'est pas dans le budget minimum. La correction reste la suppression en priorité :

- supprimer les DTO de plugin qui ne font que renommer les champs d'ingress
- supprimer les tests qui affirment uniquement la forme du wrapper
- ajouter des aides cœur uniquement lorsque le même correctif supprime du code de plugin groupé
- garder l'ancienne compatibilité SDK uniquement dans les shims SDK/cœur
- réempaqueter le cœur une fois que la suppression des wrappers expose la forme stable

## Points chauds

Fichiers de production groupés positifs qui doivent encore réduire :

```text
extensions/telegram/src/ingress.ts                        +126
extensions/discord/src/monitor/dm-command-auth.ts         +101
extensions/signal/src/monitor/access-policy.ts             +92
extensions/feishu/src/policy.ts                            +85
extensions/slack/src/monitor/auth.ts                       +64
extensions/googlechat/src/monitor-access.ts                +59
extensions/nextcloud-talk/src/inbound.ts                   +51
extensions/matrix/src/matrix/monitor/access-state.ts       +49
extensions/irc/src/inbound.ts                              +44
extensions/imessage/src/monitor/inbound-processing.ts      +36
extensions/qa-channel/src/inbound.ts                       +34
extensions/qqbot/src/bridge/sdk-adapter.ts                 +33
extensions/tlon/src/monitor/utils.ts                       +30
extensions/twitch/src/access-control.ts                    +22
extensions/qqbot/src/engine/commands/slash-command-handler.ts +20
extensions/telegram/src/bot-handlers.runtime.ts            +19
```

La branche n'est pas encore dans le budget minimum. Le travail restant pertinent pour la révision devrait supprimer le flux d'autorisation répété, l'échafaudage de rotation ou les tests de wrapper avant d'ajouter une autre abstraction cœur.

## Lecture actuelle du code

La jointure saine du cœur existe déjà dans `src/channels/message-access/runtime.ts` :
elle possède les adaptateurs d'identité, les listes d'autorisation effectives, les lectures du magasin d'appairage, les descripteurs de route, les préréglages de commande/événement, les groupes d'accès et la finale résolue `ResolvedChannelMessageIngress` projection.

La croissance restante est principalement de la colle de plugin empilée sur cette jointure :

- `extensions/telegram/src/ingress.ts` encapsule les décisions du cœur dans des aides de commande/événement spécifiques à Telegram,
  puis les sites d'appel passent toujours des listes d'autorisation et des listes de propriétaires normalisées précalculées.
- `extensions/discord/src/monitor/dm-command-auth.ts`,
  `extensions/feishu/src/policy.ts`, `extensions/googlechat/src/monitor-access.ts`,
  et `extensions/matrix/src/matrix/monitor/access-state.ts` conservent toujours
  des DTO de stratégie locale ou d'anciens noms de décision à côté de l'entrée.
- `extensions/signal/src/monitor/access-policy.ts` garde correctement la normalisation de l'identité Signal
  et les réponses d'appairage locales, mais possède toujours une jointure d'enveloppeur qui devrait s'effondrer dans une consommation directe de l'entrée.
- `extensions/nextcloud-talk/src/inbound.ts`, `extensions/irc/src/inbound.ts`,
  `extensions/qa-channel/src/inbound.ts`, `extensions/zalo/src/monitor.ts`, et
  `extensions/zalouser/src/monitor.ts` répètent toujours l'assemblage route/enveloppe/tour
  qui peut être déplacé vers des assistants de tour partagés en dehors du noyau d'entrée.

Conclusion : déplacer plus de code dans le cœur n'est utile que si cela supprime ces
couches d'enveloppeur de plugin dans le même correctif. Ajouter une autre abstraction tout en
laissant les retours de l'enveloppeur en place répète l'erreur.

## Limite

Le cœur possède la politique générique :

- normalisation et correspondance des listes d'autorisation
- expansion et diagnostic des groupes d'accès
- lectures des listes d'autorisation DM du magasin d'appairage
- portes de route, d'expéditeur, de commande, d'événement et d'activation
- mappage d'admission : répartition, suppression, saut, observation, appairage
- état expurgé, décisions, diagnostics et projections de compatibilité SDK
- descripteurs génériques réutilisables pour l'identité, la route, la commande, l'événement, l'activation,
  et les résultats

Les plugins possèdent les faits de transport et les effets secondaires :

- authenticité webhook/socket/request
- extraction de l'identité de la plateforme et recherches API
- valeurs par défaut de la stratégie spécifiques au channel
- livraison de défis d'appairage, réponses, accusés de réception, réactions, saisie, média, historique,
  configuration, médecin, statut, journaux et copie orientée utilisateur

Le cœur doit rester indépendant du canal : pas de Discord, Slack, Telegram, Matrix, room, guild, space, de client API ni de valeur par défaut spécifique au plugin dans DiscordSlackTelegramMatrixAPI`src/channels/message-access`.

## Règle d'acceptation

Chaque nouveau assistant central doit supprimer immédiatement le code de production du plugin groupé.

```text
one bundled caller        reject; keep plugin-local
two bundled callers       accept only if plugin production LOC drops
three or more callers     plugin deletion must be at least 2x new core LOC
compatibility-only helper SDK/core shim only; never bundled hot paths
```

Arrêtez et redéfinissez si :

- le nombre de lignes de code de production du plugin augmente
- les tests augmentent plus vite que la production ne diminue
- un chemin critique groupé renvoie un DTO qui ne fait que renommer `ResolvedChannelMessageIngress`
- un assistant central a besoin d'un identifiant de canal, d'un objet de plateforme, d'un client API ou d'une valeur par défaut spécifique au canal

## Paquets de travail

1. Geler le budget.
   Mettez le nombre de lignes dans la PR, gardez le linter deprecated-ingress vert, et incluez le nombre de lignes avant/après dans les commits de nettoyage.

2. Supprimer les fines coutures DTO.
   Remplacez les retours des wrappers locaux aux plugins par `ResolvedChannelMessageIngress`,
   `senderAccess`, `commandAccess`, `routeAccess`, ou `ingress`TelegramSlackDiscordSignalMatrixiMessageTlon directement. Commencez
   par QQBot, Telegram, Slack, Discord, Signal, Feishu, Matrix, iMessage et
   Tlon. Supprimez les tests de forme de wrappers ; gardez les tests de comportement.

3. Ajouter une classification des résultats uniquement avec des suppressions.
   Un classificateur générique peut exposer `dispatch`, `pairing-required`,
   `skip-activation`, `drop-command`, `drop-route`, `drop-sender` et
   `drop-ingress`. Il doit dériver du graphe de décision, pas des chaînes de raison, et migrer au moins trois plugins dans le même correctif.

4. Ajouter des constructeurs de descripteurs de route uniquement avec des suppressions.
   Les assistants génériques de cible de route et d'expéditeur de route sont acceptables uniquement s'ils réduisent immédiatement les plugins lourds en routes : Google Chat, IRC, Microsoft Teams,
   Nextcloud Talk, Mattermost, Slack, Zalo et Zalo Personal.

5. Ajouter des préréglages de commande/événement uniquement avec des suppressions.
   Centraliser les formes de commande textuelle, commande native, rappel et sujet d'origine.
   Les consommateurs de commandes doivent par défaut être non autorisés lorsque aucune porte de commande n'a été exécutée ;
   les événements ne doivent pas commencer l'appariement.

6. Ajouter des préréglages d'identité uniquement là où ils suppriment le code standard.
   Les assistants d'ID stable, d'ID stable plus alias, de téléphone/e164 et d'identifiants multiples
   sont autorisés lorsque les valeurs brutes n'entrent que dans l'entrée de l'adaptateur et que l'état expurgé conserve
   des IDs/comptes opaques.

7. Partager l'assemblage de tour autorisé.
   En dehors du noyau d'entrée (ingress), supprimer l'échafaudage répété de route/enveloppe/contexte/réponse
   du QA Channel, IRC, Nextcloud Talk, Zalo et Zalo Personal.
   Le cœur peut posséder le séquençage route/session/enveloppe/répartition ; les plugins gardent
   la livraison et le contexte spécifique au channel.

8. Mettre en quarantaine la compatibilité.
   Les assistants SDK dépréciés restent compatibles au niveau source, mais les chemins rapides (hot paths) regroupés ne doivent pas
   importer de façades d'entrée (ingress) ou d'authentification de commande dépréciées. Les tests de compatibilité doivent
   utiliser de faux plugins tiers, et non les internes des plugins regroupés.

9. Reconditionner le cœur.
   Après la suppression des wrappers, réduire les modules à usage unique, supprimer les exportations inutilisées, déplacer
   la projection de compatibilité hors des chemins rapides, et conserver des tests ciblés pour l'identité,
   la route, la commande/événement, l'activation, les groupes d'accès et les shims de compatibilité.

## Vagues de suppression

Exécuter celles-ci dans l'ordre. Chaque vague doit réduire le nombre de lignes de code (LOC) de production regroupées.

1. Effondrement des wrappers, delta de plugin attendu : -400 à -600.
   Remplacer les types de résultats `resolveXAccess`, `resolveXCommandAccess` et
   `accessFromIngress` locaux aux plugins par des lectures directes depuis
   `ResolvedChannelMessageIngress`. Premières cibles : auth de commande DM Discord,
   stratégie Feishu, état d'accès Matrix, entrée Telegram, stratégie d'accès Signal,
   adaptateur SDK QQBot.

2. Assistants de résultat partagés, delta de plugin attendu : -200 à -350.
   Ajouter un classificateur générique uniquement s'il supprime les échelles répétées de
   `shouldBlockControlCommand`, d'appariement, de saut d'activation, de blocage de route et de blocage d'expéditeur
   dans au moins trois plugins.

3. Constructeurs de descripteurs de route, delta de plugin attendu : -200 à -350.
   Déplacer l'assemblage répété des descripteurs de cible de route et d'expéditeur de route dans des helpers
   du noyau. Premières cibles : Google Chat, IRC, Microsoft Teams, Nextcloud Talk,
   Mattermost, Slack, Zalo, Zalo Personnel.

4. Partage de l'assemblage de tour, delta de plugin attendu : -250 à -450.
   Utiliser une séquence commune de route/session/enveloppe/répartition pour les plugins
   entrants simples. Premières cibles : QA Channel, IRC, Nextcloud Talk, Zalo, Zalo Personnel.

5. Réempaquetage du noyau, delta de noyau attendu : -300 à -700.
   Une fois que les plugins consomment directement les projections d'exécution, supprimer les modules à usage unique,
   fusionner les petits fichiers dans `runtime.ts` ou des frères ciblés, et garder les fichiers
   de compatibilité SDK séparés des chemins chauds empaquetés.

6. Élagage des tests, delta de test attendu : -300 à -600.
   Supprimer les tests qui affirment uniquement les formes de wrapper supprimées. Garder les tests de comportement pour
   le refus de commande, le repli de groupe, la correspondance origine-sujet, le saut d'activation,
   les groupes d'accès, le jumelage et la rédaction.

Forme minimale attendue après ces vagues :

```text
plugin production     <= -1,500
core production       about +1,800 to +2,200 before final repack
tests                 <= +500
total                 <= +2,000
```

## Ne pas déplacer

Ne pas déplacer les valeurs par défaut de configuration de la plateforme, l'UX de configuration, le texte de doctor/fix, les recherches API,
les vérifications de présence du propriétaire Slack, la gestion des alias/vérifications Matrix, l'analyse des rappels Telegram,
l'analyse de la syntaxe des commandes, l'enregistrement des commandes natives, l'analyse
de la charge utile des réactions, les réponses de jumelage, les réponses aux commandes, les accusés de réception, la saisie, les médias, l'historique,
ou les journaux.

## Vérification

Boucle locale ciblée :

```sh
pnpm lint:extensions:no-deprecated-channel-access
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts src/plugin-sdk/access-groups.test.ts
pnpm test extensions/<changed-plugin>/src/...
pnpm plugin-sdk:api:check
pnpm config:docs:check
pnpm check:docs
git diff --check
```

Utiliser Testbox pour des portes modifiées étendues/preuve de suite complète une fois que la tendance LOC est
dans le budget.

Chaque lot de travaux enregistre :

- LOC avant/après par catégorie
- wrappers de plugin supprimés
- nouveau LOC de helper du noyau, le cas échéant
- tests ciblés exécutés
- liste des points chauds restants

## Critères de sortie

- les imports de production empaquetés n'utilisent plus de façades obsolètes d'accès channel ou d'auth de commande
- le code de compatibilité est isolé aux coutures SDK/core
- les plugins empaquetés consomment directement les projections d'ingress ou les résultats génériques
- le LOC de production des plugins est au moins 1 500 net négatif par rapport à `origin/main`
- le nombre de lignes de code de production du cœur est `<= +1,500`, ou tout excédent est payé tant que le total reste `<= +2,000`
- des tests représentatifs couvrent la rédaction, l'acheminement, la commande/événement, l'activation,
  le groupe d'accès et le comportement de repli spécifique au canal
