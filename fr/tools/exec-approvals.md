---
summary: "Approbations d'exécution, listes d'autorisation et invites d'échappement de bac à sable"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Approbations d'exécution"
---

# Approbations d'exécution

Exec approvals sont la **garde-fou de l'application compagnon / de l'hôte de nœud** permettant à un agent sandboxed d'exécuter
des commandes sur un hôte réel (`gateway` ou `node`). Voyez cela comme un verrouillage de sécurité :
les commandes sont autorisées uniquement lorsque la stratégie + la liste d'autorisation + l'approbation (facultative) de l'utilisateur sont toutes d'accord.
Les Exec approvals s'ajoutent **à** la stratégie d'outil et au contrôle d'accès élevé (sauf si elevated est défini sur `full`, ce qui contourne les approbations).
La stratégie effective est la **plus stricte** de `tools.exec.*` et des valeurs par défaut des approbations ; si un champ d'approbation est omis, la valeur `tools.exec` est utilisée.

Si l'interface utilisateur de l'application compagnon n'est **pas disponible**, toute demande nécessitant une invite est résolue par le **ask fallback** (par défaut : refuser).

## Champ d'application

Les approbations d'exécution sont appliquées localement sur l'hôte d'exécution :

- **hôte de passerelle** → processus `openclaw` sur la machine passerelle
- **hôte de nœud** → node runner (application compagnon macOS ou hôte de nœud sans interface)

Remarque sur le modèle de confiance :

- Les appelants authentifiés par la Gateway sont des opérateurs de confiance pour cette Gateway.
- Les nœuds appariés étendent cette capacité d'opérateur de confiance à l'hôte de nœud.
- Les approbations d'exécution réduisent le risque d'exécution accidentelle, mais ne constituent pas une limite d'authentification par utilisateur.
- Les exécutions approuvées sur l'hôte de nœud lient le contexte d'exécution canonique : cwd canonique, argv exact, liaison env lorsqu'elle est présente, et chemin d'exécutable épinglé le cas échéant.
- Pour les scripts shell et les appels de fichiers d'interpréteur/runtime directs, OpenClaw tente également de lier un opérande de fichier local concret. Si ce fichier lié change après l'approbation mais avant l'exécution, l'exécution est refusée au lieu d'exécuter le contenu modifié.
- Cette liaison de fichier est volontairement au mieux (best-effort), et non un modèle sémantique complet de chaque chemin de chargeur d'interpréteur/de runtime. Si le mode d'approbation ne peut pas identifier exactement un fichier local concret à lier, il refuse de créer une exécution soutenue par une approbation au lieu de prétendre à une couverture complète.

macOS division :

- le service d'hôte de nœud transfère `system.run` vers l'application **macOS** via l'IPC local.
- L'**application macOS** applique les approbations + exécute la commande dans le contexte de l'interface utilisateur.

## Paramètres et stockage

Les approbations résident dans un fichier JSON local sur l'hôte d'exécution :

`~/.openclaw/exec-approvals.json`

Exemple de schéma :

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## Boutons de contrôle de stratégie

### Sécurité (`exec.security`)

- **deny** : bloquer toutes les demandes d'exécution sur l'hôte.
- **allowlist** : autoriser uniquement les commandes de la liste blanche.
- **full** : tout autoriser (équivalent à un accès élevé).

### Demander (`exec.ask`)

- **off** : ne jamais demander.
- **on-miss** : demander uniquement lorsque la liste blanche ne correspond pas.
- **always** : demander pour chaque commande.

### Demande de secours (`askFallback`)

Si une demande est requise mais qu'aucune interface utilisateur n'est accessible, le repli décide :

- **deny** : bloquer.
- **allowlist** : autoriser uniquement si la liste blanche correspond.
- **full** : autoriser.

## Liste blanche (par agent)

Les listes d'autorisation sont **par agent**. Si plusieurs agents existent, changez l'agent que vous
modifiez dans l'application macOS. Les modèles sont des **correspondances glob insensibles à la casse**.
Les modèles doivent correspondre à **chemins binaires** (les entrées composées uniquement du nom de base sont ignorées).
Les entrées héritées `agents.default` sont migrées vers `agents.main` lors du chargement.

Exemples :

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

Chaque entrée de la liste blanche suit :

- **id** UUID stable utilisé pour l'identité de l'interface utilisateur (facultatif)
- **last used** horodatage
- **last used command**
- **last resolved path**

## Autoriser automatiquement les lignes de commande des compétences

Lorsque **Auto-allow skill CLIs** est activé, les exécutables référencés par les compétences connues
sont traités comme autorisés sur les nœuds (nœud macOS ou hôte de nœud sans interface graphique). Cela utilise
`skills.bins` via le Gateway RPC pour récupérer la liste des binaires de compétence. Désactivez cette option si vous souhaitez des listes d'autorisation manuelles strictes.

Notes importantes sur la confiance :

- Il s'agit d'une **liste d'autorisation de confort implicite**, distincte des entrées manuelles de la liste d'autorisation de chemin.
- Elle est destinée aux environnements d'opérateurs de confiance où Gateway et le nœud se trouvent dans la même limite de confiance.
- Si vous exigez une confiance explicite stricte, gardez `autoAllowSkills: false` et utilisez uniquement des entrées de liste d'autorisation de chemin manuelles.

## Bacs sûrs (stdin uniquement)

`tools.exec.safeBins` définit une petite liste de binaires **stdin uniquement** (par exemple `jq`)
qui peuvent s'exécuter en mode liste verte **sans** entrées de liste explicites. Les bacs sûrs rejettent
les arguments de fichiers positionnels et les jetons de type chemin, ils ne peuvent donc opérer que sur le flux entrant.
Considérez cela comme un chemin rapide étroit pour les filtres de flux, et non une liste de confiance générale.
Ne **pas** ajouter de binaires d'interpréteur ou d'exécution (par exemple `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`) à `safeBins`.
Si une commande peut évaluer du code, exécuter des sous-commandes ou lire des fichiers par conception, privilégiez les entrées de liste explicites et gardez les invites d'approbation activées.
Les bacs sûrs personnalisés doivent définir un profil explicite dans `tools.exec.safeBinProfiles.<bin>`.
La validation est déterministe uniquement à partir de la forme d'argv (pas de vérification de l'existence du système de fichiers hôte), ce qui
empêche le comportement de l'oracle d'existence de fichiers résultant des différences de refus/autorisation.
Les options orientées fichiers sont refusées pour les bacs sûrs par défaut (par exemple `sort -o`, `sort --output`,
`sort --files0-from`, `sort --compress-program`, `sort --random-source`,
`sort --temporary-directory`/`-T`, `wc --files0-from`, `jq -f/--from-file`,
`grep -f/--file`).
Les bacs sûrs appliquent également une stratégie explicite d'indicateurs par binaire pour les options qui brisent le comportement stdin uniquement
(par exemple `sort -o/--output/--compress-program` et les indicateurs récursifs de grep).
Les options longues sont validées en échec fermé en mode bac sûr : les indicateurs inconnus et les
abréviations ambiguës sont rejetées.
Indicateurs refusés par profil de bac sûr :

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep` : `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq` : `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort` : `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc` : `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Les bacs sûrs forcent également les jetons argv à être traités comme du **texte littéral** au moment de l'exécution (pas de globbing
et pas d'expansion `$VARS`) pour les segments stdin uniquement, les modèles tels que `*` ou `$HOME/...` ne peuvent donc pas être
utilisés pour introduire subrepticement des lectures de fichiers.
Les bacs sûrs doivent également être résolus à partir de répertoires binaires de confiance (valeurs par défaut du système plus `tools.exec.safeBinTrustedDirs` en option). Les entrées `PATH` ne sont jamais automatiquement fiables.
Les répertoires de bacs sûrs de confiance par défaut sont intentionnellement minimaux : `/bin`, `/usr/bin`.
Si votre exécutable bac sûr se trouve dans des chemins de gestionnaire de paquets/utilisateur (par exemple
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), ajoutez-les explicitement
à `tools.exec.safeBinTrustedDirs`.
Les chaînages de shell et les redirections ne sont pas automatiquement autorisés en mode liste blanche.

L'enchaînement de shell (`&&`, `||`, `;`) est autorisé lorsque chaque segment de niveau supérieur satisfait à la liste d'autorisation
(y compris les bins sécurisés ou l'autorisation automatique des compétences). Les redirections restent non prises en charge en mode liste d'autorisation.
La substitution de commandes (`$()` / backticks) est rejetée lors de l'analyse de la liste d'autorisation, y compris à l'intérieur
de guillemets doubles ; utilisez des guillemets simples si vous avez besoin d'un texte littéral `$()`.
Sur les approbations de l'application compagnon macOS, le texte brut du shell contenant une syntaxe de contrôle ou d'expansion de shell
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est traité comme une absence de la liste d'autorisation, à moins que
le binaire du shell lui-même ne soit sur la liste d'autorisation.
Pour les enveloppeurs de shell (`bash|sh|zsh ... -c/-lc`), les remplacements d'environnement liés à la demande sont réduits à une
petite liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
Pour les décisions d'autorisation permanente en mode liste d'autorisation, les enveloppeurs de répartition connus
(`env`, `nice`, `nohup`, `stdbuf`, `timeout`) enregistrent les chemins d'exécutables internes au lieu des chemins d'enveloppement.
Les multiplexeurs de shell (`busybox`, `toybox`) sont également désencapsulés pour les applets de shell (`sh`, `ash`,
etc.) afin que les exécutables internes soient enregistrés au lieu des binaires de multiplexeur. Si un enveloppeur ou
un multiplexeur ne peut pas être désencapsulé en toute sécurité, aucune entrée de liste d'autorisation n'est enregistrée automatiquement.

Bacs sûrs par défaut : `jq`, `cut`, `uniq`, `head`, `tail`, `tr`, `wc`.

`grep` et `sort` ne figurent pas dans la liste par défaut. Si vous les activez, conservez des entrées de liste d'autorisation explicites pour leurs flux de travail non stdin.
Pour `grep` en mode bac sûr, fournissez le modèle avec `-e`/`--regexp` ; la forme de modèle positionnel est rejetée afin que les opérandes de fichier ne puissent pas être introduits en contrebande sous forme de positionnels ambigus.

### Bacs sûrs contre liste d'autorisation

| Sujet                  | `tools.exec.safeBins`                                              | Liste d'autorisation (`exec-approvals.json`)                                               |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Objectif               | Autoriser automatiquement les filtres stdin étroits                | Faire explicitement confiance à des exécutables spécifiques                                |
| Type de correspondance | Nom de l'exécutable + stratégie argv de bac sûr                    | Motif global de chemin d'exécutable résolu                                                 |
| Portée des arguments   | Restreint par le profil de bac sûr et les règles de jeton littéral | Correspondance de chemin uniquement ; les arguments sont par ailleurs votre responsabilité |
| Exemples typiques      | `jq`, `head`, `tail`, `wc`                                         | `python3`, `node`, `ffmpeg`, CLIs personnalisés                                            |
| Meilleure utilisation  | Transformations de texte à faible risque dans les pipelines        | Tout tool ayant un comportement plus large ou des effets secondaires                       |

Emplacement de la configuration :

- `safeBins` provient de la configuration (`tools.exec.safeBins` ou `agents.list[].tools.exec.safeBins` par agent).
- `safeBinTrustedDirs` provient de la configuration (`tools.exec.safeBinTrustedDirs` ou `agents.list[].tools.exec.safeBinTrustedDirs` par agent).
- `safeBinProfiles` provient de la configuration (`tools.exec.safeBinProfiles` ou `agents.list[].tools.exec.safeBinProfiles` par agent). Les clés de profil par agent remplacent les clés globales.
- les entrées de liste d'autorisation résident dans `~/.openclaw/exec-approvals.json` local à l'hôte sous `agents.<id>.allowlist` (ou via l'interface de contrôle / `openclaw approvals allowlist ...`).
- `openclaw security audit` avertis avec `tools.exec.safe_bins_interpreter_unprofiled` lorsque des bins d'interpréteur/runtime apparaissent dans `safeBins` sans profils explicites.
- `openclaw doctor --fix` peut échafauder les entrées `safeBinProfiles.<bin>` personnalisées manquantes en tant que `{}` (à vérifier et à resserrer ensuite). Les bins d'interpréteur/runtime ne sont pas échafaudés automatiquement.

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

## Modification via l'interface de contrôle

Utilisez la carte **Interface de contrôle → Nœuds → Approbations d'exécution** pour modifier les valeurs par défaut, les remplacements par agent et les listes d'autorisation. Choisissez une portée (Par défaut ou un agent), ajustez la stratégie, ajoutez/supprimez des modèles de liste d'autorisation, puis **Enregistrez**. L'interface affiche les métadonnées de **dernière utilisation** pour chaque modèle afin que vous puissiez garder la liste en ordre.

Le sélecteur cible choisit la **Gateway** (approbations locales) ou un **Nœud**. Les nœuds doivent annoncer `system.execApprovals.get/set` (application macOS ou hôte de nœud sans interface). Si un nœud n'annonce pas encore les approbations d'exécution, modifiez son `~/.openclaw/exec-approvals.json` local directement.

CLI : `openclaw approvals` prend en charge la modification de la passerelle ou du nœud (voir [Approbations CLI](/fr/cli/approvals)).

## Flux d'approbation

Lorsqu'une invite est requise, la passerelle diffuse `exec.approval.requested` aux clients opérateurs. L'interface de contrôle et l'application macOS la résolvent via `exec.approval.resolve`, puis la passerelle transmet la demande approuvée à l'hôte du nœud.

Pour `host=node`, les demandes d'approbation incluent une charge utile `systemRunPlan` canonique. La passerelle utilise ce plan comme contexte de commande/répertoire de travail/session faisant autorité lors du transfert des demandes `system.run` approuvées.

## Commandes d'interpréteur/runtime

Les exécutions d'interpréteur/runtime soutenues par une approbation sont intentionnellement conservatrices :

- Le contexte exact argv/cwd/env est toujours lié.
- Les formes de script shell direct et de fichier runtime direct sont liées au mieux à un instantané de fichier local concret.
- Les formes d'enveloppe courantes de gestionnaire de paquets qui se résolvent toujours en un fichier local direct (par exemple `pnpm exec`, `pnpm node`, `npm exec`, `npx`) sont déballées avant liaison.
- Si OpenClaw ne peut pas identifier exactement un fichier local concret pour une commande d'interpréteur/d'exécution
  (par exemple les scripts de package, les formulaires d'évaluation, les chaînes de chargeur spécifiques à l'exécution, ou les formes multi-fichiers
  ambiguës), l'exécution soutenue par une approbation est refusée au lieu de revendiquer une couverture sémantique qu'il n'a pas.
- Pour ces workflows, privilégiez le sandboxing, une frontière d'hôte distincte, ou une liste d'autorisation/explicitement approuvée ou un workflow complet où l'opérateur accepte la sémantique d'exécution plus large.

Lorsque des approbations sont requises, l'exec tool renvoie immédiatement un identifiant d'approbation. Utilisez cet identifiant pour mettre en corrélation les événements système ultérieurs (`Exec finished` / `Exec denied`). Si aucune décision n'arrive avant l'expiration du délai, la demande est traitée comme un expiration d'approbation et présentée comme un motif de refus.

La boîte de dialogue de confirmation inclut :

- commande + arguments
- cwd
- id de l'agent
- chemin de l'exécutable résolu
- métadonnées de l'hôte + de la politique

Actions :

- **Autoriser une fois** → exécuter maintenant
- **Toujours autoriser** → ajouter à la liste d'autorisation + exécuter
- **Refuser** → bloquer

## Transfert des approbations vers les canaux de chat

Vous pouvez transférer les invites d'approbation d'exécution vers n'importe quel channel de chat (y compris les canaux de plugin) et les approuver
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

### Clients d'approbation de chat intégrés

Discord et Telegram peuvent également agir comme clients d'approbation d'exécution explicites avec une configuration spécifique au channel.

- Discord : `channels.discord.execApprovals.*`
- Telegram : `channels.telegram.execApprovals.*`

Ces clients sont optionnels. Si un channel n'a pas les approbations d'exécution activées, OpenClaw ne traite pas
ce channel comme une surface d'approbation simplement parce que la conversation a eu lieu là.

Comportement partagé :

- seuls les approbateurs configurés peuvent approuver ou refuser
- le demandeur n'a pas besoin d'être un approbateur
- lorsque la livraison par channel est activée, les invites d'approbation incluent le texte de la commande
- si aucune interface utilisateur d'opérateur ou aucun client d'approbation configuré ne peut accepter la demande, l'invite revient à `askFallback`

Telegram utilise par défaut les DMs de l'approbateur (`target: "dm"`). Vous pouvez passer à `channel` ou `both` lorsque vous
voulez que les invites d'approbation apparaissent également dans le channel/topic Telegram d'origine. Pour les sujets de forum
Telegram, Telegram préserve le sujet pour l'invite d'approbation et le suivi post-approbation.

Voir :

- [Discord](/fr/channels/discord#exec-approvals-in-discord)
- [Telegram](/fr/channels/telegram#exec-approvals-in-telegram)

### flux macOS IPC

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

Notes de sécurité :

- Mode socket Unix `0600`, jeton stocké dans `exec-approvals.json`.
- Vérification des pairs de même UID.
- Défi/réponse (nonce + jeton HMAC + hachage de la demande) + TTL court.

## Événements système

Le cycle de vie de l'exécution est affiché sous forme de messages système :

- `Exec running` (uniquement si la commande dépasse le seuil de notification d'exécution)
- `Exec finished`
- `Exec denied`

Ces messages sont publiés dans la session de l'agent après que le nœud a signalé l'événement.
Les approbations d'exécution hébergées par la Gateway émettent les mêmes événements de cycle de vie lorsque la commande se termine (et optionnellement lors d'une exécution plus longue que le seuil).
Les exécutions soumises à approbation réutilisent l'identifiant d'approbation comme `runId` dans ces messages pour une corrélation facile.

## Implications

- **full** est puissant ; privilégiez les listes d'autorisation (allowlists) lorsque cela est possible.
- **ask** vous maintient dans la boucle tout en permettant des approbations rapides.
- Les listes d'autorisation par agent empêchent les approbations d'un agent de fuir vers d'autres.
- Les approbations ne s'appliquent qu'aux demandes d'exécution sur l'hôte provenant d'**expéditeurs autorisés**. Les expéditeurs non autorisés ne peuvent pas émettre de `/exec`.
- `/exec security=full` est une commodité au niveau de la session pour les opérateurs autorisés et saute les approbations par conception.
  Pour bloquer fermement l'exécution sur l'hôte, définissez la sécurité des approbations sur `deny` ou refusez l'outil `exec` via la stratégie d'outil.

Connexe :

- [Outil Exec](/fr/tools/exec)
- [Mode élevé](/fr/tools/elevated)
- [Skills](/fr/tools/skills)

import fr from "/components/footer/fr.mdx";

<fr />
