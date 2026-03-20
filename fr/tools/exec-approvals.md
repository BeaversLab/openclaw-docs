---
summary: "Approbations d'exécution, listes d'autorisation et invites d'échappement de bac à sable"
read_when:
  - Configuration des approbations d'exécution ou des listes d'autorisation
  - Implémentation de l'UX d'approbation d'exécution dans l'application macOS
  - Révision des invites d'échappement de bac à sable et de leurs implications
title: "Approbations d'exécution"
---

# Approbations d'exécution

Les approbations d'exécution sont la **garde-fou de l'application compagnon / hôte de nœud** permettant à un agent en bac à sable d'exécuter
des commandes sur un hôte réel (`gateway` ou `node`). Voyez cela comme un verrouillage de sécurité :
les commandes sont autorisées uniquement lorsque la stratégie + la liste d'autorisation + l'approbation (facultative) de l'utilisateur sont toutes d'accord.
Les approbations d'exécution s'ajoutent **à** la stratégie d'outil et à la filtrage élevé (sauf si élevé est défini sur `full`, ce qui ignore les approbations).
La stratégie effective est la **plus stricte** de `tools.exec.*` et des valeurs par défaut des approbations ; si un champ d'approbation est omis, la valeur `tools.exec` est utilisée.

Si l'interface utilisateur de l'application compagnon est **non disponible**, toute demande nécessitant une invite est
résolue par le **secours de demande** (par défaut : refus).

## Où cela s'applique

Les approbations d'exécution sont appliquées localement sur l'hôte d'exécution :

- **hôte de passerelle** → processus `openclaw` sur la machine passerelle
- **hôte de nœud** → exécuteur de nœud (application compagnon macOS ou hôte de nœud sans interface)

Remarque sur le modèle de confiance :

- Les appelants authentifiés par la Gateway sont des opérateurs de confiance pour cette Gateway.
- Les nœuds appariés étendent cette capacité d'opérateur de confiance à l'hôte du nœud.
- Les approbations d'exécution réduisent le risque d'exécution accidentelle, mais ne constituent pas une limite d'authentification par utilisateur.
- Les exécutions approuvées sur l'hôte de nœud lient le contexte d'exécution canonique : cwd canonique, argv exact, liaison
  d'environnement lorsque présente, et chemin d'exécutable épinglé le cas échéant.
- Pour les scripts shell et les appels de fichiers d'interpréteur/runtime directs, OpenClaw essaie également de lier
  un opérande de fichier local concret. Si ce fichier lié change après l'approbation mais avant l'exécution,
  l'exécution est refusée au lieu d'exécuter le contenu modifié.
- Cette liaison de fichier est volontairement de type « meilleur effort », et non un modèle sémantique complet de chaque
  chemin de chargeur d'interpréteur/runtime. Si le mode d'approbation ne peut pas identifier exactement un fichier local concret
  à lier, il refuse de créer une exécution soutenue par une approbation au lieu de prétendre à une couverture complète.

Séparation macOS :

- Le **node host service** transfère `system.run` à l'**application macOS** via l'IPC local.
- L'**application macOS** applique les approbations + exécute la commande dans le contexte de l'interface utilisateur.

## Paramètres et stockage

Les approbations sont stockées dans un fichier JSON local sur l'hôte d'exécution :

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

## Paramètres de stratégie

### Sécurité (`exec.security`)

- **deny** : bloquer toutes les demandes d'exécution de l'hôte.
- **allowlist** : autoriser uniquement les commandes autorisées.
- **full** : tout autoriser (équivalent à un niveau élevé).

### Demander (`exec.ask`)

- **off** : ne jamais demander.
- **on-miss** : demander uniquement lorsque la liste d'autorisation ne correspond pas.
- **always** : demander à chaque commande.

### Demande de repli (`askFallback`)

Si une invite est requise mais qu'aucune interface utilisateur n'est accessible, le repli décide :

- **deny** : bloquer.
- **allowlist** : autoriser uniquement si la liste d'autorisation correspond.
- **full** : autoriser.

## Liste d'autorisation (par agent)

Les listes d'autorisation sont **par agent**. Si plusieurs agents existent, changez l'agent que vous
éditez dans l'application macOS. Les modèles sont des **correspondances glob insensibles à la casse**.
Les modèles doivent correspondre à des **chemins binaires** (les entrées composées uniquement du nom de base sont ignorées).
Les entrées `agents.default` héritées sont migrées vers `agents.main` lors du chargement.

Exemples :

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

Chaque entrée de la liste d'autorisation suit :

- **id** UUID stable utilisé pour l'identité de l'interface utilisateur (facultatif)
- **last used** horodatage
- **last used command**
- **last resolved path**

## Autorisation automatique des lignes de commande de compétence

Lorsque **Autoriser automatiquement les lignes de commande de compétence** est activé, les exécutables référencés par les compétences connues
sont traités comme autorisés sur les nœuds (nœud macOS ou hôte de nœud sans interface graphique). Cela utilise
`skills.bins` via le RPC Gateway pour récupérer la liste des binaires de compétence. Désactivez cette option si vous souhaitez des listes d'autorisation manuelles strictes.

Notes de confiance importantes :

- Il s'agit d'une **liste d'autorisation de commodité implicite**, distincte des entrées de liste d'autorisation de chemin manuel.
- Il est destiné aux environnements d'opérateurs de confiance où la passerelle et le nœud se trouvent dans la même limite de confiance.
- Si vous exigez une confiance explicite stricte, gardez `autoAllowSkills: false` et utilisez uniquement les entrées de liste d'autorisation de chemin manuel.

## Bacs sûrs (stdin-only)

`tools.exec.safeBins` définit une courte liste de binaires **uniquement stdin** (par exemple `jq`)
qui peuvent s'exécuter en mode liste autorisée **sans** entrées explicites dans la liste. Les binaires sûrs rejettent
les arguments de fichier positionnels et les tokens de type chemin, ils ne peuvent donc opérer que sur le flux entrant.
Traitez cela comme un chemin rapide étroit pour les filtres de flux, et non comme une liste de confiance générale.
N'ajoutez **pas** de binaires d'interpréteur ou d'exécution (par exemple `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`) à `safeBins`.
Si une commande peut évaluer du code, exécuter des sous-commandes ou lire des fichiers par conception, préférez des entrées explicites dans la liste autorisée et gardez les invites d'approbation activées.
Les binaires sûrs personnalisés doivent définir un profil explicite dans `tools.exec.safeBinProfiles.<bin>`.
La validation est déterministe uniquement à partir de la forme d'argv (pas de vérification de l'existence du système de fichiers hôte), ce qui
empêche le comportement d'oracle d'existence de fichiers résultant des différences d'autorisation/refus.
Les options orientées fichier sont refusées pour les binaires sûrs par défaut (par exemple `sort -o`, `sort --output`,
`sort --files0-from`, `sort --compress-program`, `sort --random-source`,
`sort --temporary-directory`/`-T`, `wc --files0-from`, `jq -f/--from-file`,
`grep -f/--file`).
Les binaires sûrs appliquent également une stratégie explicite d'indicateurs par binaire pour les options qui brisent le comportement
uniquement stdin (par exemple `sort -o/--output/--compress-program` et les indicateurs récursifs de grep).
Les options longues sont validées en échec fermé en mode binaire sûr : les indicateurs inconnus et les abréviations
ambiguës sont rejetées.
Indicateurs refusés par profil de binaire sûr :

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep` : `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq` : `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort` : `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc` : `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Les bacs sûrs forcent également les jetons argv à être traités comme du **texte littéral** au moment de l'exécution (pas de globbing
et pas d'expansion `$VARS`) pour les segments stdin-only, ce qui fait que des modèles comme `*` ou `$HOME/...` ne peuvent pas
être utilisés pour introduire clandestinement des lectures de fichiers.
Les bacs sûrs doivent également être résolus à partir de répertoires de binaires de confiance (valeurs par défaut du système plus `tools.exec.safeBinTrustedDirs` optionnels). Les entrées `PATH` ne sont jamais automatiquement approuvées.
Les répertoires de bacs sûrs de confiance par défaut sont intentionnellement minimaux : `/bin`, `/usr/bin`.
Si votre exécutable safe-bin se trouve dans des chemins de gestionnaire de paquets/utilisateur (par exemple
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), ajoutez-les explicitement
à `tools.exec.safeBinTrustedDirs`.
L'enchaînement de shell et les redirections ne sont pas automatiquement autorisés en mode liste verte.

Le chaînage de shell (`&&`, `||`, `;`) est autorisé lorsque chaque segment de niveau supérieur satisfait à la liste d'autorisation
(y compris les bins sûrs ou l'autorisation automatique des compétences). Les redirections ne sont toujours pas prises en charge en mode liste d'autorisation.
La substitution de commandes (`$()` / backticks) est rejetée lors de l'analyse de la liste d'autorisation, y compris à l'intérieur
de guillemets doubles ; utilisez des guillemets simples si vous avez besoin du texte littéral `$()`.
Sur les approbations de l'application compagnon macOS, le texte brut du shell contenant une syntaxe de contrôle ou d'extension de shell
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est traité comme une erreur de liste d'autorisation, sauf si
le binaire du shell lui-même est sur la liste d'autorisation.
Pour les wrappers de shell (`bash|sh|zsh ... -c/-lc`), les substitutions d'environnement liées à la requête sont réduites à une
petite liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
Pour les décisions d'autorisation permanente en mode liste d'autorisation, les wrappers de répartition connus
(`env`, `nice`, `nohup`, `stdbuf`, `timeout`) enregistrent les chemins des exécutables internes au lieu des chemins des
wrappers. Les multiplexeurs de shell (`busybox`, `toybox`) sont également déballés pour les applets de shell (`sh`, `ash`,
etc.) afin que les exécutables internes soient enregistrés au lieu des binaires de multiplexage. Si un wrapper ou
un multiplexeur ne peut pas être déballé en toute sécurité, aucune entrée de liste d'autorisation n'est enregistrée automatiquement.

Bacs sûrs par défaut : `jq`, `cut`, `uniq`, `head`, `tail`, `tr`, `wc`.

`grep` et `sort` ne figurent pas dans la liste par défaut. Si vous les activez, gardez des entrées de liste d'autorisation explicites pour leurs flux de travail non stdin.
Pour `grep` en mode bac sûr, fournissez le modèle avec `-e`/`--regexp` ; la forme de modèle positionnel est rejetée afin que les opérandes de fichier ne puissent pas être introduits en contrebande comme des positionnels ambigus.

### Bacs sûrs versus liste d'autorisation

| Sujet                  | `tools.exec.safeBins`                                              | Liste d'autorisation (`exec-approvals.json`)                                                  |
| ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Objectif               | Autoriser automatiquement les filtres stdin étroits                | Faire confiance explicitement à des exécutables spécifiques                                   |
| Type de correspondance | Nom de l'exécutable + politique argv de bac sûr                    | Motif global de chemin d'exécutable résolu                                                    |
| Portée de l'argument   | Restreint par le profil de bac sûr et les règles de jeton littéral | Correspondance de chemin uniquement ; les arguments sont par ailleurs de votre responsabilité |
| Exemples typiques      | `jq`, `head`, `tail`, `wc`                                         | `python3`, `node`, `ffmpeg`, CLIs personnalisés                                               |
| Meilleure utilisation  | Transformations de texte à faible risque dans les pipelines        | Tout tool avec un comportement plus large ou des effets secondaires                           |

Emplacement de la configuration :

- `safeBins` provient de la configuration (`tools.exec.safeBins` ou `agents.list[].tools.exec.safeBins` par agent).
- `safeBinTrustedDirs` provient de la configuration (`tools.exec.safeBinTrustedDirs` ou `agents.list[].tools.exec.safeBinTrustedDirs` par agent).
- `safeBinProfiles` provient de la configuration (`tools.exec.safeBinProfiles` ou `agents.list[].tools.exec.safeBinProfiles` par agent). Les clés de profil par agent remplacent les clés globales.
- les entrées de liste d'autorisation résident dans le fichier `~/.openclaw/exec-approvals.json` local à l'hôte sous `agents.<id>.allowlist` (ou via Control UI / `openclaw approvals allowlist ...`).
- `openclaw security audit` avertit avec `tools.exec.safe_bins_interpreter_unprofiled` lorsque des bins interpréteur/runtime apparaissent dans `safeBins` sans profils explicites.
- `openclaw doctor --fix` peut échafauder des entrées personnalisées `safeBinProfiles.<bin>` manquantes en tant que `{}` (à réviser et à resserrer ensuite). Les bins interpréteur/runtime ne sont pas échafaudés automatiquement.

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

## Modification de l'interface de contrôle

Utilisez la carte **Control UI → Nodes → Exec approvals** pour modifier les valeurs par défaut, les
remplacements par agent et les listes d'autorisation. Choisissez une portée (Defaults ou un agent), ajustez la stratégie,
ajoutez/supprimez les modèles de liste d'autorisation, puis **Save**. L'interface affiche des métadonnées **last used**
par modèle afin que vous puissiez garder la liste en ordre.

Le sélecteur de cible choisit **Gateway** (approbations locales) ou un **Node**. Les nœuds
doivent annoncer `system.execApprovals.get/set` (application macOS ou hôte de nœud headless).
Si un nœud n'annonce pas encore les approbations d'exécution, modifiez son
`~/.openclaw/exec-approvals.json` local directement.

CLI : `openclaw approvals` prend en charge la modification de la passerelle ou du nœud (voir [Approvals CLI](/fr/cli/approvals)).

## Flux d'approbation

Lorsqu'une invite est requise, la passerelle diffuse `exec.approval.requested` aux clients opérateurs.
L'interface de contrôle et l'application macOS la résolvent via `exec.approval.resolve`, puis la passerelle transmet la
requête approuvée à l'hôte du nœud.

Pour `host=node`, les demandes d'approbation incluent une charge utile `systemRunPlan` canonique. La passerelle utilise
ce plan comme contexte de commande/répertoire/session faisant autorité lors du transfert des demandes approuvées `system.run`.

## Commandes interpréteur/runtime

Les exécutions interpréteur/runtime soutenues par approbation sont intentionnellement conservatrices :

- Le contexte argv/cwd/env exact est toujours lié.
- Les formes de script shell direct et de fichier runtime direct sont liées au mieux à un fichier local concret
  unique.
- Les formes d'enveloppe de gestionnaire de packages courantes qui résolvent toujours à un fichier local direct (par exemple
  `pnpm exec`, `pnpm node`, `npm exec`, `npx`) sont déballées avant la liaison.
- Si OpenClaw ne peut pas identifier exactement un fichier local concret pour une commande d'interpréteur/d'exécution (par exemple, les scripts de package, les formulaires d'évaluation, les chaînes de chargeur spécifiques à l'exécution ou les formulaires multi-fichiers ambigus), l'exécution basée sur l'approbation est refusée au lieu de revendiquer une couverture sémantique qu'elle n'a pas.
- Pour ces flux de travail, privilégiez le sandboxing, une limite d'hôte distincte ou une liste d'autorisation/flux de travail complet explicitement approuvé où l'opérateur accepte la sémantique d'exécution plus large.

Lorsque des approbations sont requises, l'outil d'exécution renvoie immédiatement un identifiant d'approbation. Utilisez cet identifiant pour corréler les événements système ultérieurs (`Exec finished` / `Exec denied`). Si aucune décision n'arrive avant l'expiration du délai, la demande est traitée comme un délai d'approbation et signalée comme motif de refus.

La boîte de dialogue de confirmation comprend :

- commande + args
- répertoire de travail (cwd)
- id de l'agent
- chemin de l'exécutable résolu
- hôte + métadonnées de stratégie

Actions :

- **Autoriser une fois** → exécuter maintenant
- **Toujours autoriser** → ajouter à la liste d'autorisation + exécuter
- **Refuser** → bloquer

## Transfert des approbations vers les canaux de discussion

Vous pouvez transférer les invites d'approbation d'exécution vers n'importe quel canal de discussion (y compris les canaux de plugin) et les approuver avec `/approve`. Cela utilise le pipeline de livraison sortant normal.

Configuration :

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

Répondre dans la discussion :

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

### Clients d'approbation de discussion intégrés

Discord et Telegram peuvent également agir en tant que clients d'approbation d'exécution explicites avec une configuration spécifique au canal.

- Discord : `channels.discord.execApprovals.*`
- Telegram : `channels.telegram.execApprovals.*`

Ces clients sont facultatifs. Si un canal n'a pas les approbations d'exécution activées, OpenClaw ne traite pas ce canal comme une surface d'approbation simplement parce que la conversation a eu lieu là-bas.

Comportement partagé :

- seuls les approbateurs configurés peuvent approuver ou refuser
- le demandeur n'a pas besoin d'être un approbateur
- lorsque la livraison sur le canal est activée, les invites d'approbation incluent le texte de la commande
- si aucune interface utilisateur opérateur ou client d'approbation configuré ne peut accepter la demande, l'invite revient à `askFallback`

Telegram utilise par défaut les DMs de l'approbant (`target: "dm"`). Vous pouvez passer à `channel` ou `both` lorsque vous
souhaitez que les invites d'approbation apparaissent également dans la discussion/sujet Telegram d'origine. Pour les sujets de forum
Telegram, OpenClaw conserve le sujet pour l'invite d'approbation et le suivi post-approbation.

Voir :

- [Discord](/fr/channels/discord#exec-approvals-in-discord)
- [Telegram](/fr/channels/telegram#exec-approvals-in-telegram)

### Flux IPC macOS

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

Notes de sécurité :

- Mode socket Unix `0600`, token stocké dans `exec-approvals.json`.
- Vérification des pairs avec même UID.
- Défi/réponse (nonce + token HMAC + hachage de la requête) + TTL court.

## Événements système

Le cycle de vie de l'exécution est présenté sous forme de messages système :

- `Exec running` (uniquement si la commande dépasse le seuil de notification d'exécution)
- `Exec finished`
- `Exec denied`

Ces éléments sont publiés dans la session de l'agent après que le nœud a signalé l'événement.
Les approbations d'exécution hébergées par la Gateway émettent les mêmes événements de cycle de vie lorsque la commande se termine (et éventuellement lorsqu'elle s'exécute plus longtemps que le seuil).
Les exécutions soumises à approbation réutilisent l'ID d'approbation comme `runId` dans ces messages pour faciliter la corrélation.

## Implications

- **full** est puissant ; privilégiez les listes d'autorisation lorsque cela est possible.
- **ask** vous tient informé tout en permettant des approbations rapides.
- Les listes d'autorisation par agent empêchent les fuites des approbations d'un agent vers d'autres.
- Les approbations ne s'appliquent qu'aux requêtes d'exécution d'hôte provenant d'**expéditeurs autorisés**. Les expéditeurs non autorisés ne peuvent pas émettre `/exec`.
- `/exec security=full` est une commodité au niveau de la session pour les opérateurs autorisés et contourne les approbations par conception.
  Pour bloquer fermement l'exécution d'hôte, définissez la sécurité des approbations sur `deny` ou refusez l'outil `exec` via la stratégie d'outils.

Connexes :

- [Outil Exec](/fr/tools/exec)
- [Mode élevé](/fr/tools/elevated)
- [Skills](/fr/tools/skills)

import fr from "/components/footer/fr.mdx";

<fr />
