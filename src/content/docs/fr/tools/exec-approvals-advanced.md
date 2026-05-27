---
summary: "Approbations exec avancées : bins sûrs, liaison d'interpréteur, transfert d'approbation, livraison native"
read_when:
  - Configuring safe bins or custom safe-bin profiles
  - Forwarding approvals to Slack/Discord/Telegram or other chat channels
  - Implementing a native approval client for a channel
title: "Approbations exec — avancé"
---

Sujets avancés sur les approbations exec : le chemin rapide `safeBins`, la liaison d'interpréteur/d'exécution
et le transfert d'approbation vers les canaux de chat (y compris la livraison native).
Pour la politique principale et le flux d'approbation, voir [Exec approvals](/fr/tools/exec-approvals).

## Bins sécurisés (stdin uniquement)

`tools.exec.safeBins` définit une petite liste de binaires **stdin-only** (par
exemple `cut`) qui peuvent s'exécuter en mode liste blanche **sans** entrées explicites de
liste blanche. Les bins sûrs rejettent les arguments de fichier positionnels et les jetons de type chemin, ils ne peuvent donc opérer que sur le flux entrant. Traitez cela comme un chemin rapide étroit pour
les filtres de flux, et non comme une liste de confiance générale.

<Warning>
N'ajoutez **pas** de binaires d'interpréteur ou d'exécution (par exemple `python3`, `node`,
`ruby`, `bash`, `sh`, `zsh`) à `safeBins`. Si une commande peut évaluer du code,
exécuter des sous-commandes ou lire des fichiers par conception, préférez les entrées explicites de liste blanche
et gardez les invites d'approbation activées. Les bins sûrs personnalisés doivent définir un profil explicite
dans `tools.exec.safeBinProfiles.<bin>`.
</Warning>

Bins sécurisés par défaut :

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` et `sort` ne figurent pas dans la liste par défaut. Si vous les activez, gardez des entrées explicites
de liste blanche pour leurs flux de travail non stdin. Pour `grep` en mode bin sûr,
fournissez le modèle avec `-e`/`--regexp` ; la forme de modèle positionnel est rejetée
afin que les opérandes de fichier ne puissent pas être introduits en contrebande comme positionnels ambigus.

### Validation Argv et indicateurs refusés

La validation est déterministe uniquement à partir de la forme de l'argv (pas de vérification de l'existence du système de fichiers hôte), ce qui empêche le comportement d'oracle d'existence de fichiers résultant des différences de refus/autorisation. Les options orientées fichier sont refusées pour les bacs sécurisés par défaut ; les options longues sont validées en échec-fermé (les indicateurs inconnus et les abréviations ambiguës sont rejetés).

Indicateurs refusés par profil de bac sécurisé :

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep` : `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq` : `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort` : `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc` : `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Les bacs sûrs forcent également les jetons argv à être traités comme du **texte littéral** au moment de l'exécution (pas de globbing et pas d'expansion `$VARS`) pour les segments stdin uniquement, les modèles comme `*` ou `$HOME/...` ne peuvent donc pas être utilisés pour introduire subrepticement des lectures de fichiers.

### Répertoires de binaires de confiance

Les bacs sûrs doivent être résolus à partir de répertoires de binaires de confiance (valeurs par défaut du système plus `tools.exec.safeBinTrustedDirs` optionnels). Les entrées `PATH` ne sont jamais automatiquement approuvées. Les répertoires de confiance par défaut sont intentionnellement minimaux : `/bin`, `/usr/bin`. Si votre exécutable de bac sûr réside dans les chemins du gestionnaire de paquets/utilisateur (par exemple `/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), ajoutez-les explicitement à `tools.exec.safeBinTrustedDirs`.

### Chaînage de shell, wrappers et multiplexeurs

Le chaînage de shell (`&&`, `||`, `;`) est autorisé lorsque chaque segment de niveau supérieur
satisfait à la liste d'autorisation (y compris les bins sûrs ou l'autorisation automatique des compétences). Les redirections
ne sont pas prises en charge en mode liste d'autorisation. La substitution de commandes (`$()` / guillemets inversés) est
rejetée lors de l'analyse de la liste d'autorisation, y compris à l'intérieur des guillemets doubles ; utilisez des guillemets
simples si vous avez besoin du texte littéral `$()`.

Pour les approbations de l'application compagnon sur macOS, le texte de shell brut contenant une syntaxe de contrôle ou d'expansion de shell
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est
considéré comme un échec de la liste d'autorisation, sauf si le binaire du shell lui-même est sur la liste d'autorisation.

Pour les wrappers de shell (`bash|sh|zsh ... -c/-lc`), les redéfinitions d'environnement liées à la requête sont
réduites à une petite liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`,
`NO_COLOR`, `FORCE_COLOR`).

Pour les décisions `allow-always` en mode liste d'autorisation, les wrappers de répartition connus (`env`,
`nice`, `nohup`, `stdbuf`, `timeout`) enregistrent le chemin de l'exécutable interne au lieu
du chemin du wrapper. Les multiplexeurs de shell (`busybox`, `toybox`) sont déballés pour
les applets de shell (`sh`, `ash`, etc.) de la même manière. Si un wrapper ou un multiplexeur
ne peut pas être déballé en toute sécurité, aucune entrée de liste d'autorisation n'est enregistrée automatiquement.

Si vous mettez en liste blanche des interprètes comme `python3` ou `node`, préférez
`tools.exec.strictInlineEval=true` afin que l'évaluation en ligne (inline eval) nécessite toujours une approbation
explicite. En mode strict, `allow-always` peut toujours conserver des
invocations d'interpréteur/de script bénignes, mais les vecteurs d'évaluation en ligne ne sont pas conservés
automatiquement.

### Bacs sûrs par rapport à la liste d'autorisation

| Sujet                  | `tools.exec.safeBins`                                              | Liste blanche (`exec-approvals.json`)                                                                   |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Objectif               | Autoriser automatiquement les filtres stdin étroits                | Faire explicitement confiance à des exécutables spécifiques                                             |
| Type de correspondance | Nom de l'exécutable + politique d'argv de bac sûr                  | Glob de chemin d'exécutable résolu, ou glob de nom de commande nu pour les commandes invoquées par PATH |
| Portée des arguments   | Restreint par le profil de bac sûr et les règles de jeton littéral | Correspondance de chemin par défaut ; `argPattern` optionnel peut restreindre argv analysé              |
| Exemples types         | `head`, `tail`, `tr`, `wc`                                         | `jq`, `python3`, `node`, `ffmpeg`, CLIs personnalisés                                                   |
| Meilleure utilisation  | Transformations de texte à faible risque dans les pipelines        | Tout outil ayant un comportement plus large ou des effets secondaires                                   |

Emplacement de la configuration :

- `safeBins` provient de la configuration (`tools.exec.safeBins` ou `agents.list[].tools.exec.safeBins` par agent).
- `safeBinTrustedDirs` provient de la configuration (`tools.exec.safeBinTrustedDirs` ou `agents.list[].tools.exec.safeBinTrustedDirs` par agent).
- `safeBinProfiles` provient de la configuration (`tools.exec.safeBinProfiles` ou `agents.list[].tools.exec.safeBinProfiles` par agent). Les clés de profil par agent remplacent les clés globales.
- les entrées de la liste blanche résident dans `~/.openclaw/exec-approvals.json` local à l'hôte sous `agents.<id>.allowlist` (ou via Control UI / `openclaw approvals allowlist ...`).
- `openclaw security audit` avertit avec `tools.exec.safe_bins_interpreter_unprofiled` lorsque des binaires d'interpréteur/runtime apparaissent dans `safeBins` sans profils explicites.
- `openclaw doctor --fix` peut échafauder les entrées `safeBinProfiles.<bin>` personnalisées manquantes en tant que `{}` (à réviser et resserrer ensuite). Les binaires d'interpréteur/runtime ne sont pas échafaudés automatiquement.

Exemple de profil personnalisé :

```json5
{
  tools: {
    exec: {
      safeBins: ["jq", "myfilter"],
      safeBinProfiles: {
        myfilter: {
          minPositional: 0,
          maxPositional: 0,
          allowedValueFlags: ["-n", "--limit"],
          deniedFlags: ["-f", "--file", "-c", "--command"],
        },
      },
    },
  },
}
```

Si vous activez explicitement `jq` dans `safeBins`, OpenClaw rejette toujours la fonction intégrée `env` en mode safe-bin
afin que `jq -n env` ne puisse pas déverser l'environnement du processus hôte sans un chemin de liste blanche explicite
ou une invite d'approbation.

## Commandes d'interpréteur/d'exécution

Les exécutions d'interpréteur/d'exécution soutenus par une approbation sont intentionnellement conservatrices :

- Le contexte exact argv/cwd/env est toujours lié.
- Les formes de script shell direct et de fichier d'exécution direct sont liées au mieux à un instantané de fichier local concret.
- Les formes courantes de wrappers de gestionnaires de paquets qui résolvent toujours vers un fichier local direct (par exemple
  `pnpm exec`, `pnpm node`, `npm exec`, `npx`) sont déballées avant la liaison.
- Si OpenClaw ne peut pas identifier exactement un fichier local concret pour une commande d'interpréteur/d'exécution (par exemple les scripts de paquet, les formulaires eval, les chaînes de chargeur spécifiques à l'exécution, ou les formes multi-fichiers ambiguës), l'exécution soutenue par une approbation est refusée au lieu de prétendre à une couverture sémantique qu'elle n'a pas.
- Pour ces flux de travail, privilégiez la sandboxing, une frontière d'hôte séparée, ou une liste de confiance/explicite de flux complet où l'opérateur accepte la sémantique d'exécution plus large.

Lorsque des approbations sont requises, l'outil exec renvoie immédiatement un identifiant d'approbation. Utilisez cet identifiant pour
corréler les événements système d'exécution approuvés ultérieurs (`Exec finished`, et `Exec running` lorsque configurés).
Si aucune décision n'arrive avant l'expiration du délai, la demande est traitée comme un dépassement de délai d'approbation et
présentée comme un refus terminal plutôt que comme un événement système de réveil de l'agent.

### Comportement de livraison de suivi

Après qu'un exec asynchrone approuvé est terminé, OpenClaw envoie un tour `agent` de suivi à la même session.

- Si une cible de livraison externe valide existe (channel pouvant être livré plus cible `to`), la livraison de suivi utilise ce channel.
- Dans les flux webchat-only ou internal-session sans cible externe, la livraison de suivi reste uniquement pour la session (`deliver: false`).
- Si un appelant demande explicitement une livraison externe stricte sans channel externe résoluble, la demande échoue avec `INVALID_REQUEST`.
- Si `bestEffortDeliver` est activé et qu'aucun channel externe ne peut être résolu, la livraison est rétrogradée à session-only au lieu d'échouer.

## Transfert des approbations vers les canaux de discussion

Vous pouvez transférer les invites d'approbation exec vers n'importe quel channel de discussion (y compris les channels de plugin) et les approuver
avec `/approve`. Cela utilise le pipeline de livraison sortant normal.

Config :

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // substring or regex
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

Répondre dans le chat :

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

La commande `/approve` gère à la fois les approbations exec et les approbations de plugin. Si l'ID ne correspond pas à une approbation exec en attente, elle vérifie automatiquement les approbations de plugin à la place.

### Transfert des approbations de plugin

Le transfert des approbations de plugin utilise le même pipeline de livraison que les approbations exec mais possède sa propre
configuration indépendante sous `approvals.plugin`. Activer ou désactiver l'un n'affecte pas l'autre.

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

La forme de la configuration est identique à `approvals.exec` : `enabled`, `mode`, `agentFilter`,
`sessionFilter`, et `targets` fonctionnent de la même manière.

Les canaux prenant en charge les réponses interactives partagées affichent les mêmes boutons d'approbation pour les approbations d'exécution et de plugin. Les canaux sans interface utilisateur interactive partagée reviennent à du texte brut avec des instructions `/approve`. Les demandes d'approbation de plugin peuvent restreindre les décisions disponibles. Les surfaces d'approbation utilisent l'ensemble de décisions déclaré par la demande, et le Gateway rejette les tentatives de soumission d'une décision qui n'a pas été proposée.

### Approbations dans le même chat sur n'importe quel canal

Lorsqu'une demande d'approbation d'exécution ou de plugin provient d'une surface de discussion livrable, la même discussion peut désormais l'approuver avec `/approve` par défaut. Cela s'applique aux canaux tels que Slack, Matrix et Microsoft Teams, en plus des flux existants de l'interface utilisateur Web et de l'interface utilisateur du terminal.

Ce chemin de commande textuelle partagée utilise le modèle d'authentification de canal normal pour cette conversation. Si le chat d'origine peut déjà envoyer des commandes et recevoir des réponses, les demandes d'approbation n'ont plus besoin d'un adaptateur de livraison natif séparé juste pour rester en attente.

Discord et Telegram prennent également en charge l'approbation `/approve` dans la même discussion, mais ces canaux utilisent toujours leur liste d'approuveurs résolus pour l'autorisation, même lorsque la livraison native de l'approbation est désactivée.

Pour Telegram et autres clients d'approbation natifs qui appellent le Gateway directement,
ce repli est intentionnellement limité aux échecs « approbation introuvable ». Un vrai refus/erreur
d'approbation d'exécution ne réessaie pas silencieusement en tant qu'approbation de plugin.

### Livraison native des approbations

Certains canaux peuvent également agir en tant que clients d'approbation natifs. Les clients natifs ajoutent les DM des approuveurs, la diffusion vers la discussion d'origine et l'expérience utilisateur d'approbation interactive spécifique au canal par-dessus le flux `/approve` partagé dans la même discussion.

Lorsque les cartes/boutons d'approbation natifs sont disponibles, cette interface utilisateur native est le chemin principal orienté agent. L'agent ne doit pas non plus renvoyer une commande `/approve` de discussion en double, sauf si le résultat de l'outil indique que les approbations de discussion sont indisponibles ou que l'approbation manuelle est le seul chemin restant.

Si un client d'approbation natif est configuré mais qu'aucun runtime natif n'est actif pour le canal d'origine, OpenClaw garde visible l'invite déterministe locale `/approve`. Si le runtime natif est actif et tente la livraison mais qu'aucune cible ne reçoit la carte, OpenClaw envoie un avis de repli dans la même discussion avec la commande exacte `/approve <id> <decision>` afin que la demande puisse toujours être résolue.

Modèle générique :

- la stratégie d'exécution de l'hôte décide toujours si l'approbation d'exécution est requise
- `approvals.exec` contrôle le transfert des invites d'approbation vers d'autres destinations de discussion
- `channels.<channel>.execApprovals` contrôle si ce canal agit en tant que client d'approbation natif
- Les approbations par plugin Slack peuvent utiliser le client d'approbation natif de Slack lorsque la demande provient de Slack
  et que les approbateurs du plugin Slack sont résolus ; SlackSlackSlackSlack`approvals.plugin`SlackSlack peut également router les approbations par plugin vers des
  sessions ou des cibles Slack, même lorsque les approbations d'exécution Slack sont désactivées
- La livraison des approbations par emoji WhatsApp est conditionnée par WhatsApp`approvals.exec` et `approvals.plugin`WhatsApp, tandis que
  les réactions d'approbation nécessitent des approbateurs WhatsApp explicites provenant de `channels.whatsapp.allowFrom` ou `"*"`

Les clients d'approbation natifs activent automatiquement la livraison en priorité par DM lorsque toutes les conditions suivantes sont remplies :

- le channel prend en charge la livraison des approbations natives
- les approbateurs peuvent être résolus à partir de `execApprovals.approvers` explicites ou d'une identité
  de propriétaire telle que `commands.ownerAllowFrom`
- `channels.<channel>.execApprovals.enabled` est non défini ou `"auto"`

Définissez `enabled: false` pour désactiver explicitement un client d'approbation natif. Définissez `enabled: true` pour le
forcer lorsque les approbateurs sont résolus. La livraison publique dans le chat d'origine reste explicite via
`channels.<channel>.execApprovals.target`.

FAQ : [Pourquoi existe-t-il deux configurations d'approbation d'exécution pour les approbations par chat ?](/fr/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord : Discord`channels.discord.execApprovals.*`
- Slack : Slack`channels.slack.execApprovals.*`
- Telegram : Telegram`channels.telegram.execApprovals.*`
- WhatsApp : utilisez WhatsApp`approvals.exec` et `approvals.plugin`WhatsApp pour router les invites d'approbation vers WhatsApp

Ces clients d'approbation natifs ajoutent le routage par DM et la diffusion de canal (fanout) en plus du flux partagé
`/approve` de même-chat et des boutons d'approbation partagés.

Comportement partagé :

- Slack, Matrix, Microsoft Teams et les chats similaires livrables utilisent le modèle d'authentification de canal normal
  pour les SlackMatrixMicrosoft Teams`/approve` de même-chat
- lorsqu'un client d'approbation natif s'active automatiquement, la cible de livraison native par défaut est les DM des approbateurs
- pour Discord et Telegram, seuls les approbateurs résolus peuvent approuver ou refuser
- les approbateurs Discord peuvent être explicites (`execApprovals.approvers`) ou déduits de `commands.ownerAllowFrom`
- les approbateurs Telegram peuvent être explicites (`execApprovals.approvers`) ou déduits de `commands.ownerAllowFrom`
- les approbateurs Slack peuvent être explicites (`execApprovals.approvers`) ou déduits de `commands.ownerAllowFrom`
- les DM d'approbation de plugin Slack utilisent les approbateurs de plugin Slack à partir de `allowFrom` et du routage par défaut du compte, et non les approbateurs d'exécution Slack
- les boutons natifs Slack préservent le type d'identifiant d'approbation, donc les identifiants `plugin:` peuvent résoudre les approbations de plugin
  sans une seconde couche de repli locale Slack
- les approbations par emoji WhatsApp gèrent à la fois les invites d'exécution et de plugin uniquement lorsque la famille de transfert de niveau supérieur correspondante est activée et acheminée vers WhatsApp; le transfert WhatsApp ciblé uniquement reste sur
  le chemin de transfert partagé sauf s'il correspond à la même cible d'origine native
- le routage natif DM/channel Matrix et les raccourcis de réaction gèrent à la fois les approbations d'exécution et de plugin;
  l'autorisation du plugin provient toujours de `channels.matrix.dm.allowFrom`
- les invites natives Matrix incluent le contenu d'événement personnalisé `com.openclaw.approval` sur le premier événement d'invite
  afin que les clients OpenClaw conscients de Matrix puissent lire l'état d'approbation structuré tandis que les clients standard
  conservent le repli en texte brut `/approve`
- le demandeur n'a pas besoin d'être un approbateur
- le chat d'origine peut approuver directement avec `/approve` lorsque ce chat prend déjà en charge les commandes et les réponses
- les boutons d'approbation natifs Discord acheminent en fonction du type d'ID d'approbation : les ID Discord`plugin:` vont directement aux approbations de plugins, tout le reste va aux approbations exec
- les boutons d'approbation natifs Telegram suivent le même repli limité exec-vers-plugin que Telegram`/approve`
- lorsque `target` natif active la livraison vers le chat d'origine, les invites d'approbation incluent le texte de la commande
- les approbations exec en attente expirent après 30 minutes par défaut
- si aucune interface utilisateur d'opérateur ou aucun client d'approbation configuré ne peut accepter la demande, l'invite revient à `askFallback`

les commandes de groupe sensibles réservées au propriétaire, telles que `/diagnostics` et `/export-trajectory`OpenClaw, utilisent un acheminement privé vers le propriétaire pour les invites d'approbation et les résultats finaux. OpenClaw essaie d'abord une route privée sur la même surface où le propriétaire a exécuté la commande. Si cette surface n'a pas de route privée vers le propriétaire, elle revient à la première route privée disponible vers le propriétaire à partir de `commands.ownerAllowFrom`DiscordTelegramTelegram, de sorte qu'une commande de groupe Discord peut toujours envoyer l'approbation et le résultat au DM Telegram du propriétaire lorsque Telegram est l'interface privée principale configurée. Le chat de groupe ne reçoit qu'un court accusé de réception.

Telegram utilise par défaut les DMs de l'approbateur (Telegram`target: "dm"`). Vous pouvez passer à `channel` ou `both`TelegramTelegramOpenClaw lorsque vous voulez que les invites d'approbation apparaissent également dans le chat/sujet Telegram d'origine. Pour les sujets de forum Telegram, OpenClaw préserve le sujet pour l'invite d'approbation et le suivi post-approbation.

Voir :

- [Discord](Discord/en/channels/discord)
- [Telegram](Telegram/en/channels/telegram)

### flux IPC macOS

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

Notes de sécurité :

- Mode socket Unix `0600`, jeton stocké dans `exec-approvals.json`.
- Vérification des pairs même UID.
- Défi/réponse (nonce + jeton HMAC + hachage de la requête) + TTL court.

## FAQ

### Quand `accountId` et `threadId` seraient-ils utilisés sur une cible d'approbation ?

Utilisez `accountId` lorsque le channel a plusieurs identités configurées et que la demande d'approbation doit partir via un compte spécifique. Utilisez `threadId` lorsque la destination prend en charge les sujets ou les fils de discussion et que la demande doit rester dans ce fil plutôt que dans la conversation de niveau supérieur.

Un cas concret Telegram est un supergroupe d'opérations avec des sujets de forum et deux comptes de bots Telegram. La valeur `to` nomme le supergroupe, `accountId` sélectionne le compte du bot, et `threadId` sélectionne le sujet du forum :

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "targets",
      targets: [
        {
          channel: "telegram",
          to: "-1001234567890",
          accountId: "ops-bot",
          threadId: "77",
        },
      ],
    },
  },
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "env:TELEGRAM_PRIMARY_BOT_TOKEN",
        },
        "ops-bot": {
          name: "Operations bot",
          botToken: "env:TELEGRAM_OPS_BOT_TOKEN",
        },
      },
    },
  },
}
```

Avec cette configuration, les approbations d'exécution transférées sont publiées par le compte Telegram `ops-bot` dans le sujet `77` de la discussion `-1001234567890`. Une cible sans `accountId` utilise le compte par défaut du channel, et une cible sans `threadId` publie vers la destination de niveau supérieur.

### Lorsque les approbations sont envoyées à une session, n'importe qui dans cette session peut-il les approuver ?

Non. La livraison par session contrôle uniquement l'endroit où la demande apparaît. Elle n'autorise pas par elle-même chaque participant de cette discussion à approuver.

Pour les `/approve` de même canal génériques, l'expéditeur doit déjà être autorisé pour les commandes dans cette session de channel. Si le channel expose des approbateurs explicites, ces approbateurs peuvent autoriser l'action `/approve` même s'ils ne sont pas autrement autorisés pour les commandes dans cette session.

Certains channels sont plus stricts. Discord, Telegram, Matrix, les DMs d'approbation natifs Slack et les clients d'approbation natifs similaires utilisent leurs listes d'approbateurs résolus pour l'autorisation d'approbation. Par exemple, une demande d'approbation de sujet de forum Telegram peut être visible pour tous dans le sujet, mais seuls les IDs utilisateur numériques Telegram résolus depuis `channels.telegram.execApprovals.approvers` ou `commands.ownerAllowFrom` peuvent l'approuver ou la refuser.

## Connexes

- [Approbations Exec](/fr/tools/exec-approvals) — politique de base et flux d'approbation
- [Outil Exec](/fr/tools/exec)
- [Mode élevé](/fr/tools/elevated)
- [Skills](/fr/tools/skills) — comportement d'autorisation automatique basé sur les compétences
