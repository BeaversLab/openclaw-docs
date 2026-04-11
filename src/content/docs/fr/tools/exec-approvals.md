---
summary: "Exec approvals, allowlists, and sandbox escape prompts"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Exec Approvals"
---

# Approbations d'exécution

Les approbations d'exécution constituent la **garde-fou de l'application compagnon / de l'hôte de nœud** permettant à un agent sandboxé d'exécuter des commandes sur un hôte réel (`gateway` ou `node`). Considérez cela comme un interlock de sécurité : les commandes ne sont autorisées que lorsque la stratégie + la liste d'autorisation + (l'approbation utilisateur optionnelle) sont toutes d'accord. Les approbations d'exécution s'ajoutent **à** la stratégie d'outil et au filtrage élevé (sauf si elevated est défini sur `full`, ce qui ignore les approbations). La stratégie effective est la **plus stricte** entre `tools.exec.*` et les valeurs par défaut des approbations ; si un champ d'approbation est omis, la valeur `tools.exec` est utilisée. L'exécution hôte utilise également l'état local des approbations sur cette machine. Un `ask: "always"` local à l'hôte dans `~/.openclaw/exec-approvals.json` continue de demander l'approbation même si la session ou les valeurs par défaut de la configuration demandent `ask: "on-miss"`. Utilisez `openclaw approvals get`, `openclaw approvals get --gateway` ou `openclaw approvals get --node <id|name|ip>` pour inspecter la stratégie demandée, les sources de la stratégie hôte et le résultat effectif.

Si l'interface utilisateur de l'application compagnon n'est **pas disponible**, toute demande nécessitant une invite est résolue par le **ask fallback** (par défaut : refuser).

Les clients natifs d'approbation par chat peuvent également exposer des fonctionnalités spécifiques au canal sur le message d'approbation en attente. Par exemple, Matrix peut ajouter des raccourcis de réaction sur l'invite d'approbation (`✅` autoriser une fois, `❌` refuser et `♾️` autoriser toujours si disponible) tout en laissant les commandes `/approve ...` dans le message en solution de secours.

## Où cela s'applique

Les approbations d'exécution sont appliquées localement sur l'hôte d'exécution :

- **hôte de passerelle** → processus `openclaw` sur la machine passerelle
- **hôte de nœud** → exécuteur de nœud (application compagnon macOS ou hôte de nœud sans interface)

Note sur le modèle de confiance :

- Les appelants authentifiés par la Gateway sont des opérateurs de confiance pour cette Gateway.
- Les nœuds appariés étendent cette capacité d'opérateur de confiance à l'hôte de nœud.
- Les approbations d'exécution réduisent le risque d'exécution accidentelle, mais ne constituent pas une frontière d'authentification par utilisateur.
- Les exécutions approuvées sur l'hôte de nœud lient le contexte d'exécution canonique : cwd canonique, argv exact, liaison d'environnement lorsque présente, et chemin d'exécutable épinglé le cas échéant.
- Pour les scripts shell et les appels directs de fichiers d'interpréteur/runtime, OpenClaw essaie également de lier un opérande de fichier local concret. Si ce fichier lié change après l'approbation mais avant l'exécution, l'exécution est refusée au lieu d'exécuter le contenu dérivé.
- Cette liaison de fichier est intentionnellement de type « best-effort » (au mieux), et non un modèle sémantique complet de chaque chemin de chargeur d'interpréteur/runtime. Si le mode d'approbation ne peut pas identifier exactement un fichier local concret à lier, il refuse de créer une exécution soutenue par une approbation au lieu de prétendre à une couverture complète.

Séparation macOS :

- Le **service d'hôte de nœud** transmet `system.run` à l' **application macOS** via IPC local.
- L' **application macOS** applique les approbations + exécute la commande dans le contexte de l'interface utilisateur.

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

## Mode « YOLO » sans approbation

Si vous souhaitez que l'exécution sur l'hôte se déroule sans invites d'approbation, vous devez ouvrir **les deux** couches de stratégie :

- stratégie d'exécution demandée dans la configuration OpenClaw (`tools.exec.*`)
- stratégie d'approbations locale à l'hôte dans `~/.openclaw/exec-approvals.json`

C'est désormais le comportement par défaut de l'hôte, sauf si vous le resserr explicitement :

- `tools.exec.security` : `full` sur `gateway`/`node`
- `tools.exec.ask` : `off`
- hôte `askFallback` : `full`

Distinction importante :

- `tools.exec.host=auto` choisit où l'exécution a lieu : bac à sable (sandbox) si disponible, sinon passerelle.
- YOLO choisit comment l'exécution sur l'hôte est approuvée : `security=full` plus `ask=off`.
- En mode YOLO, OpenClaw n'ajoute pas de porte d'approbation heuristique distincte pour l'obfuscation de commandes par-dessus la stratégie d'exécution sur l'hôte configurée.
- `auto` ne rend pas le routage de la passerelle une priorité gratuite depuis une session sandboxed. Une demande `host=node` par appel est autorisée depuis `auto`, et `host=gateway` n'est autorisée depuis `auto` que lorsqu'aucun runtime de bac à sable n'est actif. Si vous souhaitez une valeur par défaut stable et non automatique, définissez `tools.exec.host` ou utilisez `/exec host=...` explicitement.

Si vous souhaitez une configuration plus conservatrice, resserrez l'une ou l'autre couche à `allowlist` / `on-miss`
ou `deny`.

Configuration persistante de passerelle-hôte "jamais demander" :

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
openclaw gateway restart
```

Ensuite, définissez le fichier d'approbations de l'hôte pour qu'il corresponde :

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

Pour un hôte de nœud, appliquez le même fichier d'approbations sur ce nœud à la place :

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

Raccourci session uniquement :

- `/exec security=full ask=off` ne modifie que la session en cours.
- `/elevated full` est un raccourci bris de vitre qui ignore également les approbations d'exécution pour cette session.

Si le fichier d'approbations de l'hôte reste plus strict que la configuration, la stratégie d'hôte la plus stricte l'emporte toujours.

## Boutons de stratégie

### Sécurité (`exec.security`)

- **deny** : bloquer toutes les demandes d'exécution de l'hôte.
- **allowlist** : autoriser uniquement les commandes sur la liste blanche.
- **full** : tout autoriser (équivalent à élevé).

### Demander (`exec.ask`)

- **off** : ne jamais demander.
- **on-miss** : demander uniquement lorsque la liste blanche ne correspond pas.
- **always** : demander à chaque commande.
- La confiance durable `allow-always` ne supprime pas les invites lorsque le mode de demande effectif est `always`

### Demande de secours (`askFallback`)

Si une invite est requise mais qu'aucune interface utilisateur n'est accessible, le secours décide :

- **deny** : bloquer.
- **allowlist** : autoriser uniquement si la liste blanche correspond.
- **full** : autoriser.

### Durcissement de l'évaluation de l'interpréteur en ligne (`tools.exec.strictInlineEval`)

Lorsque `tools.exec.strictInlineEval=true`, OpenClaw traite les formulaires d'évaluation de code en ligne comme approbation uniquement, même si l'exécutable de l'interpréteur lui-même est sur la liste blanche.

Exemples :

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

Il s'agit d'une défense en profondeur pour les chargeurs d'interpréteur qui ne correspondent pas proprement à un seul opérande de fichier stable. En mode strict :

- ces commandes nécessitent toujours une approbation explicite ;
- `allow-always` ne persiste pas automatiquement les nouvelles entrées de liste blanche pour elles.

## Liste blanche (par agent)

Les listes blanches sont **par agent**. Si plusieurs agents existent, changez l'agent que vous
modifiez dans l'application macOS. Les modèles sont des **correspondances glob insensibles à la casse**.
Les modèles doivent correspondre à des **chemins binaires** (les entrées composées uniquement du nom de base sont ignorées).
Les entrées héritées `agents.default` sont migrées vers `agents.main` lors du chargement.
Les chaînes de shell telles que `echo ok && pwd` nécessitent toujours que chaque segment de premier niveau satisfasse les règles de la liste blanche.

Exemples :

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

Chaque entrée de la liste blanche suit :

- **id** UUID stable utilisé pour l'identité de l'interface utilisateur (facultatif)
- **dernière utilisation** horodatage
- **dernière commande utilisée**
- **dernier chemin résolu**

## Autoriser automatiquement les lignes de commande des compétences

Lorsque **Autoriser automatiquement les lignes de commande des compétences** est activé, les exécutables référencés par des compétences connues
sont traités comme étant sur liste blanche sur les nœuds (nœud macOS ou hôte de nœud sans interface). Cela utilise
`skills.bins` via le Gateway RPC pour récupérer la liste des binaires des compétences. Désactivez cette option si vous souhaitez des listes blanches manuelles strictes.

Notes importantes sur la confiance :

- Il s'agit d'une **liste blanche de commodité implicite**, distincte des entrées de liste blanche de chemin manuel.
- Elle est destinée aux environnements d'opérateurs de confiance où Gateway et le nœud se trouvent dans la même limite de confiance.
- Si vous exigez une confiance explicite stricte, gardez `autoAllowSkills: false` et utilisez uniquement les entrées de liste blanche de chemin manuel.

## Bacs sûrs (stdin uniquement)

`tools.exec.safeBins` définit une petite liste de binaires **stdin-only** (par exemple `cut`)
qui peuvent s'exécuter en mode liste d'autorisation **sans** entrées de liste d'autorisation explicites. Les bacs sûrs rejettent
les arguments de fichier positionnels et les jetons de type chemin, ils ne peuvent donc opérer que sur le flux entrant.
Traitez cela comme un chemin rapide étroit pour les filtres de flux, et non comme une liste de confiance générale.
N'ajoutez **pas** de binaires d'interpréteur ou d'exécution (par exemple `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`) à `safeBins`.
Si une commande peut évaluer du code, exécuter des sous-commandes ou lire des fichiers par conception, préférez les entrées de liste d'autorisation explicites et gardez les invites d'approbation activées.
Les bacs sûrs personnalisés doivent définir un profil explicite dans `tools.exec.safeBinProfiles.<bin>`.
La validation est déterministe uniquement à partir de la forme d'argv (aucune vérification de l'existence du système de fichiers hôte), ce qui
empêche le comportement d'oracle de l'existence de fichiers à partir des différences d'autorisation/refus.
Les options orientées fichier sont refusées pour les bacs sûrs par défaut (par exemple `sort -o`, `sort --output`,
`sort --files0-from`, `sort --compress-program`, `sort --random-source`,
`sort --temporary-directory`/`-T`, `wc --files0-from`, `jq -f/--from-file`,
`grep -f/--file`).
Les bacs sûrs appliquent également une stratégie explicite de drapeaux par binaire pour les options qui brisent le comportement stdin-only
(par exemple `sort -o/--output/--compress-program` et les drapeaux récursifs de grep).
Les options longues sont validées en échec-fermé en mode bac sûr : les drapeaux inconnus et les
abréviations ambiguës sont rejetées.
Drapeaux refusés par profil de bac sûr :

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep` : `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq` : `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort` : `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc` : `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Les bacs sûrs forcent également les jetons argv à être traités comme du **texte littéral** au moment de l'exécution (pas de globalisation
et pas d'expansion `$VARS`) pour les segments stdin uniquement, donc des modèles comme `*` ou `$HOME/...` ne peuvent pas être
utilisés pour introduire subrepticement des lectures de fichiers.
Les bacs sûrs doivent également être résolus à partir de répertoires binaires de confiance (valeurs par défaut du système plus optionnels
`tools.exec.safeBinTrustedDirs`). Les entrées `PATH` ne sont jamais automatiquement approuvées.
Les répertoires de bacs sûrs de confiance par défaut sont volontairement minimaux : `/bin`, `/usr/bin`.
Si votre exécutable de bac sûr réside dans des chemins de gestionnaire de paquets/utilisateur (par exemple
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), ajoutez-les explicitement
à `tools.exec.safeBinTrustedDirs`.
Le chaînage de shell et les redirections ne sont pas automatiquement autorisés en mode liste blanche.

L'enchaînement de shell (`&&`, `||`, `;`) est autorisé lorsque chaque segment de premier niveau satisfait la liste d'autorisation
(y compris les bins sûrs ou l'autorisation automatique des compétences). Les redirections restent non prises en charge en mode liste d'autorisation.
La substitution de commandes (`$()` / backticks) est rejetée lors de l'analyse de la liste d'autorisation, y compris à l'intérieur
de guillemets doubles ; utilisez des guillemets simples si vous avez besoin de texte `$()` littéral.
Sur les approbations de l'application compagnon macOS, le texte shell brut contenant une syntaxe de contrôle ou d'expansion shell
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est traité comme un échec de la liste d'autorisation, à moins que
le binaire shell lui-même ne soit sur la liste d'autorisation.
Pour les wrappers de shell (`bash|sh|zsh ... -c/-lc`), les substitutions d'environnement étendues à la demande sont réduites à une
petite liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
Pour les décisions « autoriser toujours » en mode liste d'autorisation, les wrappers de répartition connus
(`env`, `nice`, `nohup`, `stdbuf`, `timeout`) persistent les chemins exécutables internes au lieu des chemins des wrappers.
Les multiplexeurs de shell (`busybox`, `toybox`) sont également déballés pour les applets shell (`sh`, `ash`,
etc.) afin que les exécutables internes soient persistés au lieu des binaires de multiplexeur. Si un wrapper ou
un multiplexeur ne peut pas être déballé en toute sécurité, aucune entrée de liste d'autorisation n'est persistée automatiquement.
Si vous mettez sur la liste d'autorisation des interpréteurs comme `python3` ou `node`, préférez `tools.exec.strictInlineEval=true` afin que l'évaluation en ligne nécessite toujours une approbation explicite. En mode strict, `allow-always` peut toujours persister les appels bénins d'interpréteur/script, mais les porteurs d'évaluation en ligne ne sont pas persistés automatiquement.

Bacs sûrs par défaut :

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` et `sort` ne figurent pas dans la liste par défaut. Si vous les activez, conservez des entrées de liste d'autorisation explicites pour leurs workflows non stdin.
Pour `grep` en mode bac sûr, fournissez le modèle avec `-e`/`--regexp` ; le modèle de forme positionnelle est rejeté afin que les opérandes de fichier ne puissent pas être introduits en fraude par le biais de positions ambiguës.

### Bacs sûrs versus liste d'autorisation

| Sujet                  | `tools.exec.safeBins`                                             | Liste d'autorisation (`exec-approvals.json`)                                                  |
| ---------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Objectif               | Autoriser automatiquement les filtres stdin étroits               | Faire explicitement confiance à des exécutables spécifiques                                   |
| Type de correspondance | Nom de l'exécutable + stratégie argv bac sûr                      | Modèle global de chemin d'accès à l'exécutable résolu                                         |
| Portée des arguments   | Restreint par le profil bac sûr et les règles de jetons littéraux | Correspondance de chemin uniquement ; les arguments sont par ailleurs de votre responsabilité |
| Exemples typiques      | `head`, `tail`, `tr`, `wc`                                        | `jq`, `python3`, `node`, `ffmpeg`, CLI personnalisés                                          |
| Meilleure utilisation  | Transformations de texte à faible risque dans les pipelines       | Tout outil avec un comportement plus large ou des effets secondaires                          |

Emplacement de la configuration :

- `safeBins` provient de la configuration (`tools.exec.safeBins` ou `agents.list[].tools.exec.safeBins` par agent).
- `safeBinTrustedDirs` provient de la configuration (`tools.exec.safeBinTrustedDirs` ou `agents.list[].tools.exec.safeBinTrustedDirs` par agent).
- `safeBinProfiles` provient de la configuration (`tools.exec.safeBinProfiles` ou `agents.list[].tools.exec.safeBinProfiles` par agent). Les clés de profil par agent remplacent les clés globales.
- les entrées de la liste d'autorisation se trouvent dans `~/.openclaw/exec-approvals.json` local à l'hôte sous `agents.<id>.allowlist` (ou via l'interface de contrôle / `openclaw approvals allowlist ...`).
- `openclaw security audit` avertit avec `tools.exec.safe_bins_interpreter_unprofiled` lorsque des binaires d'interpréteur/runtime apparaissent dans `safeBins` sans profils explicites.
- `openclaw doctor --fix` peut échafauder les entrées personnalisées `safeBinProfiles.<bin>` manquantes en tant que `{}` (à vérifier et à resserrer ensuite). Les binaires d'interpréteur/runtime ne sont pas échafaudés automatiquement.

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

Si vous activez explicitement `jq` pour `safeBins`, OpenClaw rejette toujours la commande intégrée `env` en mode safe-bin afin que `jq -n env` ne puisse pas vider l'environnement du processus hôte sans un chemin de liste d'autorisation explicite ou une invite d'approbation.

## Modification via l'interface de contrôle

Utilisez la carte **Control UI → Nodes → Exec approvals** pour modifier les valeurs par défaut, les remplacements par agent et les listes d'autorisation. Choisissez une portée (Defaults ou un agent), ajustez la stratégie, ajoutez/supprimez les modèles de liste d'autorisation, puis **Save**. L'interface affiche les métadonnées **last used** par modèle afin que vous puissiez garder la liste en ordre.

Le sélecteur de cible choisit **Gateway** (approbations locales) ou un **Node**. Les nœuds doivent annoncer `system.execApprovals.get/set` (application macOS ou hôte de nœud sans tête). Si un nœud n'annonce pas encore les approbations d'exécution, modifiez son `~/.openclaw/exec-approvals.json` local directement.

CLI : `openclaw approvals` prend en charge l'édition de passerelle ou de nœud (voir [Approvals CLI](/en/cli/approvals)).

## Flux d'approbation

Lorsqu'une invite est requise, la passerelle diffuse `exec.approval.requested` aux clients de l'opérateur. L'interface de contrôle et l'application macOS la résolvent via `exec.approval.resolve`, puis la passerelle transmet la demande approuvée à l'hôte du nœud.

Pour `host=node`, les demandes d'approbation incluent une charge utile `systemRunPlan` canonique. La passerelle utilise ce plan comme contexte de commande/répertoire de travail/session autoritaire lors du transfert des demandes `system.run` approuvées.

Cela est important pour la latence d'approbation asynchrone :

- le chemin d'exécution du nœud prépare un plan canonique à l'avance
- l'enregistrement d'approbation stocke ce plan et ses métadonnées de liaison
- une fois approuvé, l'appel `system.run` transféré final réutilise le plan stocké
  au lieu de faire confiance aux modifications ultérieures de l'appelant
- si l'appelant modifie `command`, `rawCommand`, `cwd`, `agentId` ou
  `sessionKey` après la création de la demande d'approbation, la passerelle rejette
  l'exécution transmise en raison d'une inadéquation de l'approbation

## Commandes de l'interpréteur/runtime

Les exécutions de l'interpréteur/runtime soutenues par une approbation sont intentionnellement conservatrices :

- Le contexte exact argv/cwd/env est toujours lié.
- Les formes de script shell direct et de fichier runtime direct sont liées, dans la mesure du possible, à un instantané concret d'un fichier local.
- Les formes courantes de wrappers de gestionnaires de paquets qui se résolvent encore à un fichier local direct (par exemple
  `pnpm exec`, `pnpm node`, `npm exec`, `npx`) sont déballées avant liaison.
- Si OpenClaw ne peut pas identifier exactement un fichier local concret pour une commande d'interpréteur/runtime
  (par exemple les scripts de paquet, les formes eval, les chaînes de chargeurs spécifiques au runtime, ou les formes multi-fichiers
  ambiguës), l'exécution soutenue par une approbation est refusée au lieu de prétendre à une couverture sémantique qu'elle ne possède pas.
- Pour ces workflows, préférez le sandboxing, une limite d'hôte distincte, ou une liste autorisée/explicite de confiance
  /workflow complet où l'opérateur accepte la sémantique runtime plus large.

Lorsque des approbations sont requises, l'outil d'exécution renvoie immédiatement un identifiant d'approbation. Utilisez cet identifiant pour
corréler les événements système ultérieurs (`Exec finished` / `Exec denied`). Si aucune décision n'arrive avant l'expiration
du délai, la demande est traitée comme une expiration d'approbation et signalée comme motif de refus.

### Comportement de livraison de suivi

Après qu'une exécution asynchrone approuvée est terminée, OpenClaw envoie un tour de suivi `agent` à la même session.

- Si une cible de livraison externe valide existe (canal livrable plus cible `to`), la livraison de suivi utilise ce canal.
- Dans les flux de webchat uniquement ou de session interne sans cible externe, la livraison de suivi reste limitée à la session (`deliver: false`).
- Si un appelant demande explicitement une livraison externe stricte sans canal externe résolvable, la demande échoue avec `INVALID_REQUEST`.
- Si `bestEffortDeliver` est activé et qu'aucun canal externe ne peut être résolu, la livraison est rétrogradée à session-only au lieu d'échouer.

La boîte de dialogue de confirmation inclut :

- commande + args
- cwd
- id de l'agent
- chemin de l'exécutable résolu
- hôte + métadonnées de stratégie

Actions :

- **Autoriser une fois** → exécuter maintenant
- **Toujours autoriser** → ajouter à la liste d'autorisation + exécuter
- **Refuser** → bloquer

## Transfert des approbations vers les canaux de discussion

Vous pouvez transférer les invites d'approbation d'exécution vers n'importe quel canal de discussion (y compris les canaux de plugins) et les approuver
avec `/approve`. Cela utilise le pipeline de livraison sortant normal.

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

Répondre dans le chat :

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

La commande `/approve` gère à la fois les approbations d'exécution et les approbations de plugins. Si l'ID ne correspond pas à une approbation d'exécution en attente, elle vérifie automatiquement les approbations de plugins à la place.

### Transfert des approbations de plugins

Le transfert des approbations de plugins utilise le même pipeline de livraison que les approbations d'exécution mais possède sa propre
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

La structure de configuration est identique à `approvals.exec` : `enabled`, `mode`, `agentFilter`,
`sessionFilter` et `targets` fonctionnent de la même manière.

Les canaux qui prennent en charge les réponses interactives partagées affichent les mêmes boutons d'approbation pour les approbations d'exécution et
de plugins. Les canaux sans interface interactive partagée reviennent au texte brut avec les instructions
`/approve`.

### Approbations dans le même chat sur n'importe quel canal

Lorsqu'une demande d'approbation d'exécution ou de plugin provient d'une surface de discussion livrable, le même chat
peut désormais l'approuver avec `/approve` par défaut. Cela s'applique aux canaux tels que Slack, Matrix et
Microsoft Teams en plus des flux existants de l'interface Web et de l'interface terminal.

Ce chemin de commande texte partagé utilise le modèle d'authentification de canal normal pour cette conversation. Si le
chat d'origine peut déjà envoyer des commandes et recevoir des réponses, les demandes d'approbation n'ont plus besoin d'un
adaptateur de livraison natif distinct juste pour rester en attente.

Discord et Telegram prennent également en charge le `/approve` dans le même chat, mais ces channels utilisent toujours leur
liste de responsables résolue pour l'autorisation, même lorsque la diffusion native des approbations est désactivée.

Pour Telegram et autres clients d'approbation natifs qui appellent directement le Gateway,
ce repli est intentionnellement limité aux échecs de type « approbation introuvable ». Un vrai
refus/erreur d'approbation d'exécution ne réessaie pas silencieusement en tant qu'approbation de plugin.

### Diffusion native des approbations

Certains channels peuvent également agir en tant que clients d'approbation natifs. Les clients natifs ajoutent les DMs des responsables, la diffusion
vers le chat d'origine, et une UX d'approbation interactive spécifique au channel par-dessus le `/approve` partagé
dans le même chat.

Lorsque les cartes/boutons d'approbation natifs sont disponibles, cette interface utilisateur native est le chemin principal
orienté agent. L'agent ne doit pas non plus renvoyer une commande `/approve` en clair en double
dans le chat, sauf si le résultat de l'outil indique que les approbations par chat sont indisponibles ou
que l'approbation manuelle est le seul chemin restant.

Modèle générique :

- la stratégie d'exécution de l'hôte décide toujours si une approbation d'exécution est requise
- `approvals.exec` contrôle le transfert des invites d'approbation vers d'autres destinations de chat
- `channels.<channel>.execApprovals` contrôle si ce channel agit comme un client d'approbation natif

Les clients d'approbation natifs activent automatiquement la diffusion prioritaire par DM lorsque toutes ces conditions sont vraies :

- le channel prend en charge la diffusion native des approbations
- les responsables peuvent être résolus à partir d'un `execApprovals.approvers` explicite ou des
  sources de repli documentées pour ce channel
- `channels.<channel>.execApprovals.enabled` est non défini ou `"auto"`

Définissez `enabled: false` pour désactiver explicitement un client d'approbation natif. Définissez `enabled: true` pour le
forcer lorsque les responsables sont résolus. La diffusion publique vers le chat d'origine reste explicite via
`channels.<channel>.execApprovals.target`.

FAQ : [Pourquoi y a-t-il deux configurations d'approbation d'exécution pour les approbations de chat ?](/en/help/faq#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord : `channels.discord.execApprovals.*`
- Slack : `channels.slack.execApprovals.*`
- Telegram : `channels.telegram.execApprovals.*`

Ces clients d'approbation natifs ajoutent le routage par DM et la diffusion optionnelle vers le channel par-dessus le `/approve` partagé
dans le même chat et les boutons d'approbation partagés.

Comportement partagé :

- Slack, Matrix, Microsoft Teams et les chats similaires utilisent le modèle d'authentification de canal normal pour les `/approve` de même chat
- lorsqu'un client d'approbation natif s'active automatiquement, la cible de livraison native par défaut est les DMs de l'approbateur
- pour Discord et Telegram, seuls les approbateurs résolus peuvent approuver ou refuser
- les approbateurs Discord peuvent être explicites (`execApprovals.approvers`) ou déduits de `commands.ownerAllowFrom`
- les approbateurs Telegram peuvent être explicites (`execApprovals.approvers`) ou déduits de la configuration de propriétaire existante (`allowFrom`, plus `defaultTo` de message direct lorsque pris en charge)
- les approbateurs Slack peuvent être explicites (`execApprovals.approvers`) ou déduits de `commands.ownerAllowFrom`
- les boutons natifs Slack préservent le type d'id d'approbation, donc les ids `plugin:` peuvent résoudre les approbations de plugin sans une deuxième couche de repli locale Slack
- Le routage natif Matrix DM/canal et les raccourcis de réaction gèrent les approbations d'exécution et de plugin ;
  l'autorisation de plugin provient toujours de `channels.matrix.dm.allowFrom`
- le demandeur n'a pas besoin d'être un approbateur
- le chat d'origine peut approuver directement avec `/approve` lorsque ce chat prend déjà en charge les commandes et les réponses
- les boutons d'approbation natifs Discord sont acheminés par type d'identifiant d'approbation : les identifiants `plugin:` vont
  directement aux approbations de plugin, tout le reste va aux approbations d'exécution
- les boutons d'approbation natifs Telegram suivent le même repli limité d'exécution vers plugin que `/approve`
- lorsque `target` natif active la livraison vers le chat d'origine, les invites d'approbation incluent le texte de la commande
- les approbations d'exécution en attente expirent après 30 minutes par défaut
- si aucune interface utilisateur d'opérateur ou client d'approbation configuré ne peut accepter la demande, l'invite revient à `askFallback`

Telegram utilise par défaut les DMs de l'approbateur (`target: "dm"`). Vous pouvez passer à `channel` ou `both` lorsque vous
voulez que les invites d'approbation apparaissent également dans le chat/sujet Telegram d'origine. Pour les sujets de forum
Telegram, OpenClaw conserve le sujet pour l'invite d'approbation et le suivi post-approbation.

Voir :

- [Discord](/en/channels/discord)
- [Telegram](/en/channels/telegram)

### Flux macOS IPC

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

Notes de sécurité :

- Mode socket Unix `0600`, jeton stocké dans `exec-approvals.json`.
- Vérification des pairs same-UID.
- Défi/réponse (nonce + jeton HMAC + hachage de la requête) + court TTL.

## Événements système

Le cycle de vie de l'exécution est présenté sous forme de messages système :

- `Exec running` (uniquement si la commande dépasse le seuil de notification d'exécution)
- `Exec finished`
- `Exec denied`

Ceux-ci sont publiés dans la session de l'agent après que le nœud a signalé l'événement.
Les approbations d'exécution hébergées par Gateway émettent les mêmes événements de cycle de vie lorsque la commande se termine (et facultativement lorsqu'elle s'exécute plus longtemps que le seuil).
Les exécutions soumises à approbation réutilisent l'identifiant d'approbation comme `runId` dans ces messages pour une corrélation facile.

## Comportement en cas de refus d'approbation

Lorsqu'une approbation d'exécution asynchrone est refusée, OpenClaw empêche l'agent de réutiliser
la sortie de toute exécution antérieure de la même commande dans la session. La raison du refus
est transmise avec une indication explicite qu'aucune sortie de commande n'est disponible, ce qui empêche
l'agent de prétendre qu'il y a une nouvelle sortie ou de répéter la commande refusée avec
des résultats obsolètes provenant d'une exécution réussie antérieure.

## Implications

- **full** est puissant ; préférez les listes blanches lorsque c'est possible.
- **ask** vous tient informé tout en permettant des approbations rapides.
- Les listes blances par agent empêchent les approbations d'un agent de fuir vers d'autres.
- Les approbations ne s'appliquent qu'aux demandes d'exécution d'hôte provenant d'**expéditeurs autorisés**. Les expéditeurs non autorisés ne peuvent pas émettre `/exec`.
- `/exec security=full` est une commodité au niveau de la session pour les opérateurs autorisés et saute les approbations par conception.
  Pour bloquer fermement l'exécution sur l'hôte, définissez la sécurité des approbations sur `deny` ou refusez l'outil `exec` via la politique d'outils.

Connexes :

- [Outil Exec](/en/tools/exec)
- [Mode élevé](/en/tools/elevated)
- [Skills](/en/tools/skills)

## Connexes

- [Exec](/en/tools/exec) — outil d'exécution de commandes shell
- [Sandboxing](/en/gateway/sandboxing) — modes de Sandbox et accès à l'espace de travail
- [Sécurité](/en/gateway/security) — modèle de sécurité et durcissement
- [Sandbox vs Politique d'outil vs Élevé](/en/gateway/sandbox-vs-tool-policy-vs-elevated) — quand utiliser chacun
