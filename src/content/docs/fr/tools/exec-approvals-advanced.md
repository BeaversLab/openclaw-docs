---
summary: "Approbations exec avancées : bins sécurisés, liaison d'interpréteur, transfert d'approbation, livraison native"
read_when:
  - Configuring safe bins or custom safe-bin profiles
  - Forwarding approvals to Slack/Discord/Telegram or other chat channels
  - Implementing a native approval client for a channel
title: "Approbations exec — avancé"
---

Rubriques avancées sur l'approbation d'exécution : le chemin rapide `safeBins`, la liaison d'interpréteur/d'exécution (runtime) et le transfert des approbations vers les canaux de discussion (y compris la livraison native). Pour la stratégie de base et le flux d'approbation, voir [Approbations d'exécution](/fr/tools/exec-approvals).

## Bins sécurisés (stdin uniquement)

`tools.exec.safeBins` définit une petite liste de binaires **stdin uniquement** (par
exemple `cut`) qui peuvent s'exécuter en mode liste blanche **sans** entrées de liste blanche
explicites. Les bins sécurisés rejettent les arguments de fichier positionnels et les tokens de type chemin, ils ne peuvent donc
opérer que sur le flux entrant. Considérez cela comme un chemin rapide étroit pour
les filtres de flux, et non comme une liste de confiance générale.

<Warning>
N'ajoutez **pas** de binaires d'interpréteur ou d'exécution (par exemple `python3`, `node`,
`ruby`, `bash`, `sh`, `zsh`) à `safeBins`. Si une commande peut évaluer du code,
exécuter des sous-commandes ou lire des fichiers par conception, préférez les entrées de liste blanche explicites
et gardez les invites d'approbation activées. Les bins sécurisés personnalisés doivent définir un profil explicite
dans `tools.exec.safeBinProfiles.<bin>`.
</Warning>

Bins sécurisés par défaut :

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` et `sort` ne sont pas dans la liste par défaut. Si vous les activez, gardez des entrées de liste blanche
explicites pour leurs workflows non stdin. Pour `grep` en mode bin sécurisé,
fournissez le modèle avec `-e`/`--regexp` ; la forme de modèle positionnel est rejetée
pour que les opérandes de fichier ne puissent pas être introduits en contrebande comme des positionnels ambigus.

### Validation Argv et indicateurs refusés

La validation est déterministe uniquement à partir de la forme de l'argv (pas de vérification de l'existence du système de fichiers hôte), ce qui empêche le comportement d'oracle d'existence de fichiers résultant des différences de refus/autorisation. Les options orientées fichier sont refusées pour les bacs sécurisés par défaut ; les options longues sont validées en échec-fermé (les indicateurs inconnus et les abréviations ambiguës sont rejetés).

Indicateurs refusés par profil de bac sécurisé :

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep` : `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq` : `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort` : `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc` : `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Les bacs sécurisés forcent également les jetons argv à être traités comme du **texte littéral** au moment de l'exécution (pas de développement de globbing et pas de développement `$VARS`) pour les segments stdin-only, ce qui fait que des modèles comme `*` ou `$HOME/...` ne peuvent pas être utilisés pour introduire subrepticement des lectures de fichiers.

### Répertoires de binaires de confiance

Les bacs sécurisés doivent être résolus à partir de répertoires de binaires de confiance (valeurs par défaut du système plus `tools.exec.safeBinTrustedDirs` en option). Les entrées `PATH` ne sont jamais automatiquement approuvées. Les répertoires de confiance par défaut sont intentionnellement minimaux : `/bin`, `/usr/bin`. Si votre exécutable de bac sécurisé se trouve dans des chemins de gestionnaire de paquets/utilisateur (par exemple `/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), ajoutez-les explicitement à `tools.exec.safeBinTrustedDirs`.

### Chaînage de shell, wrappers et multiplexeurs

Le chaînage de shell (`&&`, `||`, `;`) est autorisé lorsque chaque segment de niveau supérieur
satisfait à la liste d'autorisation (y compris les bins sûrs ou l'autorisation automatique des compétences). Les redirections
restent non prises en charge en mode liste d'autorisation. La substitution de commande (`$()` / backticks) est
rejetée lors de l'analyse de la liste d'autorisation, y compris à l'intérieur des guillemets doubles ; utilisez des guillemets
simples si vous avez besoin du texte littéral `$()`.

Sur les approbations de l'application compagnon macOS, le texte brut du shell contenant une syntaxe de contrôle
ou d'expansion de shell (`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est
traité comme un échec de la liste d'autorisation, sauf si le binaire du shell lui-même est dans la liste d'autorisation.

Pour les wrappers de shell (`bash|sh|zsh ... -c/-lc`), les substitutions d'environnement délimitées à la demande sont
réduites à une petite liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`,
`NO_COLOR`, `FORCE_COLOR`).

Pour les décisions `allow-always` en mode liste d'autorisation, les wrappers de répartition connus (`env`,
`nice`, `nohup`, `stdbuf`, `timeout`) enregistrent le chemin de l'exécutable interne au lieu
du chemin du wrapper. Les multiplexeurs de shell (`busybox`, `toybox`) sont déballés pour
les applets de shell (`sh`, `ash`, etc.) de la même manière. Si un wrapper ou un multiplexeur
ne peut pas être déballé en toute sécurité, aucune entrée de la liste d'autorisation n'est enregistrée automatiquement.

Si vous mettez en liste blanche des interpréteurs comme `python3` ou `node`, préférez
`tools.exec.strictInlineEval=true` afin que l'évaluation en ligne (inline eval) nécessite toujours une approbation
explicite. En mode strict, `allow-always` peut toujours conserver les
invocations bénignes d'interpréteur/de script, mais les porteurs d'évaluation en ligne ne sont pas conservés
automatiquement.

### Bacs sûrs par rapport à la liste d'autorisation

| Sujet                  | `tools.exec.safeBins`                                              | Liste d'autorisation (`exec-approvals.json`)                                                            |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Objectif               | Autoriser automatiquement les filtres stdin étroits                | Faire explicitement confiance à des exécutables spécifiques                                             |
| Type de correspondance | Nom de l'exécutable + politique d'argv de bac sûr                  | Glob de chemin d'exécutable résolu, ou glob de nom de commande nu pour les commandes invoquées par PATH |
| Portée des arguments   | Restreint par le profil de bac sûr et les règles de jeton littéral | Correspondance de chemin par défaut ; un `argPattern` optionnel peut restreindre l'argv analysé         |
| Exemples types         | `head`, `tail`, `tr`, `wc`                                         | `jq`, `python3`, `node`, `ffmpeg`, CLIs personnalisés                                                   |
| Meilleure utilisation  | Transformations de texte à faible risque dans les pipelines        | Tout outil ayant un comportement plus large ou des effets secondaires                                   |

Emplacement de la configuration :

- `safeBins` provient de la configuration (`tools.exec.safeBins` ou `agents.list[].tools.exec.safeBins` par agent).
- `safeBinTrustedDirs` provient de la configuration (`tools.exec.safeBinTrustedDirs` ou `agents.list[].tools.exec.safeBinTrustedDirs` par agent).
- `safeBinProfiles` provient de la configuration (`tools.exec.safeBinProfiles` ou `agents.list[].tools.exec.safeBinProfiles` par agent). Les clés de profil par agent remplacent les clés globales.
- les entrées de liste blaque résident dans `~/.openclaw/exec-approvals.json` local à l'hôte sous `agents.<id>.allowlist` (ou via l'interface de contrôle / `openclaw approvals allowlist ...`).
- `openclaw security audit` avertit avec `tools.exec.safe_bins_interpreter_unprofiled` lorsque des binaires d'interpréteur/d'exécution apparaissent dans `safeBins` sans profils explicites.
- `openclaw doctor --fix` peut échafauder les entrées `safeBinProfiles.<bin>` personnalisées manquantes en tant que `{}` (à réviser et à resserrer ensuite). Les binaires d'interpréteur/d'exécution ne sont pas échafaudés automatiquement.

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

Si vous activez explicitement `jq` dans `safeBins`, OpenClaw rejette toujours la commande intégrée `env` en mode de binaires sécurisés, afin que `jq -n env` ne puisse pas vider l'environnement du processus hôte sans un chemin de liste blaque explicite ou une invite d'approbation.

## Commandes d'interpréteur/d'exécution

Les exécutions d'interpréteur/d'exécution soutenus par une approbation sont intentionnellement conservatrices :

- Le contexte exact argv/cwd/env est toujours lié.
- Les formes de script shell direct et de fichier d'exécution direct sont liées au mieux à un instantané de fichier local concret.
- Les formes courantes d'enveloppeurs de gestionnaires de paquets qui résolvent toujours vers un fichier local direct (par exemple
  `pnpm exec`, `pnpm node`, `npm exec`, `npx`) sont désenveloppées avant la liaison.
- Si OpenClaw ne peut pas identifier exactement un fichier local concret pour une commande d'interpréteur/d'exécution (par exemple les scripts de paquet, les formulaires eval, les chaînes de chargeur spécifiques à l'exécution, ou les formes multi-fichiers ambiguës), l'exécution soutenue par une approbation est refusée au lieu de prétendre à une couverture sémantique qu'elle n'a pas.
- Pour ces flux de travail, privilégiez la sandboxing, une frontière d'hôte séparée, ou une liste de confiance/explicite de flux complet où l'opérateur accepte la sémantique d'exécution plus large.

Lorsque des approbations sont requises, l'outil exec retourne immédiatement un identifiant d'approbation. Utilisez cet identifiant pour
corréler les événements système ultérieurs (`Exec finished` / `Exec denied`). Si aucune décision n'arrive avant l'expiration du délai, la demande est traitée comme un dépassement de délai d'approbation et signalée comme motif de refus.

### Comportement de livraison de suivi

Une fois un exec asynchrone approuvé terminé, OpenClaw envoie un tour de suivi `agent` à la même session.

- Si une cible de livraison externe valide existe (channel livrable plus cible `to`), la livraison de suivi utilise ce channel.
- Dans les flux webchat uniquement ou de session interne sans cible externe, la livraison de suivi reste limitée à la session (`deliver: false`).
- Si un appelant demande explicitement une livraison externe stricte sans channel externe résoluble, la demande échoue avec `INVALID_REQUEST`.
- Si `bestEffortDeliver` est activé et qu'aucun channel externe ne peut être résolu, la livraison est rétrogradée à la session uniquement au lieu d'échouer.

## Transfert des approbations vers les canaux de discussion

Vous pouvez transférer les invites d'approbation exec vers n'importe quel channel de chat (y compris les channels de plugin) et les approuver
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
configuration indépendante sous `approvals.plugin`. L'activation ou la désactivation de l'un n'affecte pas l'autre.

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

Les canaux qui prennent en charge les réponses interactives partagées affichent les mêmes boutons d'approbation pour les approbations d'exécution et de plug-in. Les canaux sans interface utilisateur interactive partagée reviennent au texte brut avec les instructions `/approve`. Les demandes d'approbation de plug-in peuvent restreindre les décisions disponibles. Les surfaces d'approbation utilisent l'ensemble de décisions déclaré par la demande, et le Gateway rejette les tentatives de soumission d'une décision qui n'a pas été proposée.

### Approbations dans le même chat sur n'importe quel canal

Lorsqu'une demande d'approbation d'exécution ou de plug-in provient d'une surface de chat pouvant être délivrée, le même chat peut désormais l'approuver avec `/approve` par défaut. Cela s'applique aux canaux tels que Slack, Matrix et Microsoft Teams, en plus des flux d'interface utilisateur Web et de terminal existants.

Ce chemin de commande textuelle partagée utilise le modèle d'authentification de canal normal pour cette conversation. Si le chat d'origine peut déjà envoyer des commandes et recevoir des réponses, les demandes d'approbation n'ont plus besoin d'un adaptateur de livraison natif séparé juste pour rester en attente.

Discord et Telegram prennent également en charge `/approve` dans le même chat, mais ces canaux utilisent toujours leur liste d'approbateurs résolus pour l'autorisation, même lorsque la livraison native des approbations est désactivée.

Pour Telegram et autres clients d'approbation natifs qui appellent le Gateway directement,
ce repli est intentionnellement limité aux échecs « approbation introuvable ». Un vrai refus/erreur
d'approbation d'exécution ne réessaie pas silencieusement en tant qu'approbation de plugin.

### Livraison native des approbations

Certains canaux peuvent également agir en tant que clients natifs d'approbation. Les clients natifs ajoutent les MP d'approbateur, la diffusion vers le chat d'origine et l'expérience utilisateur interactive d'approbation spécifique au canal par-dessus le flux `/approve` partagé dans le même chat.

Lorsque les cartes/boutons d'approbation natifs sont disponibles, cette interface utilisateur native est le chemin principal face à l'agent. L'agent ne doit pas non plus renvoyer une commande `/approve` de chat brut en double, sauf si le résultat de l'outil indique que les approbations de chat ne sont pas disponibles ou que l'approbation manuelle est le seul chemin restant.

Si un client d'approbation natif est configuré mais qu'aucun runtime natif n'est actif pour le canal d'origine, OpenClaw conserve l'invite déterministe locale `/approve` visible. Si le runtime natif est actif et tente la livraison mais qu'aucune cible ne reçoit la carte, OpenClaw envoie un avis de repli dans le même chat avec la commande exacte `/approve <id> <decision>` afin que la demande puisse toujours être résolue.

Modèle générique :

- la stratégie d'exécution de l'hôte décide toujours si l'approbation d'exécution est requise
- `approvals.exec` contrôle le transfert des invites d'approbation vers d'autres destinations de chat
- `channels.<channel>.execApprovals` contrôle si ce channel agit comme un client d'approbation natif

Les clients d'approbation natifs activent automatiquement la livraison en priorité DM lorsque toutes les conditions suivantes sont remplies :

- le channel prend en charge la livraison d'approbation native
- les approbateurs peuvent être résolus à partir de `execApprovals.approvers` explicites ou d'une identité
  de propriétaire telle que `commands.ownerAllowFrom`
- `channels.<channel>.execApprovals.enabled` n'est pas défini ou `"auto"`

Définissez `enabled: false` pour désactiver explicitement un client d'approbation natif. Définissez `enabled: true` pour le forcer
lorsque les approbateurs sont résolus. La livraison publique dans le chat d'origine reste explicite via
`channels.<channel>.execApprovals.target`.

FAQ : [Pourquoi existe-t-il deux configurations d'approbation exec pour les approbations de chat ?](/fr/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord : Discord`channels.discord.execApprovals.*`
- Slack : Slack`channels.slack.execApprovals.*`
- Telegram : Telegram`channels.telegram.execApprovals.*`

Ces clients d'approbation natifs ajoutent le routage DM et la diffusion de channel facultative par-dessus le flux `/approve` partagé dans le même chat et les boutons d'approbation partagés.

Comportement partagé :

- Slack, Matrix, Microsoft Teams et les chats similaires livrables utilisent le modèle d'autorisation de channel normal
  pour SlackMatrixMicrosoft Teams`/approve` dans le même chat
- lorsqu'un client d'approbation natif s'active automatiquement, la cible de livraison native par défaut est les DMs des approbateurs
- pour Discord et Telegram, seuls les approbateurs résolus peuvent approuver ou refuser
- Les approbateurs Discord peuvent être explicites (Discord`execApprovals.approvers`) ou déduits de `commands.ownerAllowFrom`
- Les approbateurs Telegram peuvent être explicites (Telegram`execApprovals.approvers`) ou déduits de `commands.ownerAllowFrom`
- Les approbateurs Slack peuvent être explicites (Slack`execApprovals.approvers`) ou déduits de `commands.ownerAllowFrom`
- Les boutons natifs Slack préservent le type d'identifiant d'approbation, donc les ids Slack`plugin:`Slack peuvent résoudre les approbations de plugin
  sans une deuxième couche de repli locale Slack
- Le routage natif DM/channel Matrix et les raccourcis de réaction gèrent à la fois les approbations exec et plugin ;
  l'autorisation des plugins provient toujours de Matrix`channels.matrix.dm.allowFrom`
- Les invites natives Matrix incluent le contenu d'événement personnalisé Matrix`com.openclaw.approval` sur le premier événement d'invite
  afin que les clients Matrix conscients de OpenClawMatrix puissent lire l'état d'approbation structuré, tandis que les clients standard
  conservent le secours en texte brut `/approve`
- le demandeur n'a pas besoin d'être un approbateur
- le chat d'origine peut approuver directement avec `/approve` lorsque ce chat prend déjà en charge les commandes et les réponses
- les boutons d'approbation natifs Discord acheminent par type d'identifiant d'approbation : les identifiants Discord`plugin:` vont
  directement aux approbations de plugin, tout le reste va aux approbations exec
- les boutons d'approbation natifs Telegram suivent le même secours exec-vers-plugin délimité que Telegram`/approve`
- lorsque le `target` natif active la livraison vers le chat d'origine, les invites d'approbation incluent le texte de la commande
- les approbations exec en attente expirent après 30 minutes par défaut
- si aucune interface utilisateur d'opérateur ou client d'approbation configuré ne peut accepter la demande, l'invite revient à `askFallback`

Les commandes de groupe sensibles réservées au propriétaire telles que `/diagnostics` et `/export-trajectory` utilisent un routage privé
au propriétaire pour les invites d'approbation et les résultats finaux. OpenClaw essaie d'abord une route privée sur la
même surface où le propriétaire a exécuté la commande. Si cette surface n'a pas de route privée au propriétaire, elle revient
à la première route de propriétaire disponible à partir de `commands.ownerAllowFrom`, de sorte qu'une commande de groupe Discord
p peut toujours envoyer l'approbation et le résultat au DM du propriétaire sur Telegram lorsque Telegram est l'interface privée
principale configurée. Le chat de groupe ne reçoit qu'un court accusé de réception.

Telegram utilise par défaut les MP de l'approbateur (Telegram`target: "dm"`). Vous pouvez basculer sur `channel` ou `both`TelegramTelegramOpenClaw lorsque vous
souhaitez que les invites d'approbation apparaissent également dans la conversation/sujet Telegram d'origine. Pour les sujets de forum
Telegram, OpenClaw conserve le sujet pour l'invite d'approbation et le suivi post-approbation.

Voir :

- [Discord](Discord/en/channels/discord)
- [Telegram](Telegram/en/channels/telegram)

### Flux IPC macOS

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

Notes de sécurité :

- Mode socket Unix `0600`, jeton stocké dans `exec-approvals.json`.
- Vérification des homologues de même UID.
- Défi/réponse (nonce + jeton HMAC + hachage de la requête) + TTL court.

## Connexes

- [Exec approvals](/fr/tools/exec-approvals) — politique principale et flux d'approbation
- [Exec tool](/fr/tools/exec)
- [Elevated mode](/fr/tools/elevated)
- [Skills](/fr/tools/skills) — comportement d'auto-autorisation basé sur les compétences
