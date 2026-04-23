---
summary: "Approbations d'exécution, listes blanches et invites d'échappement de bac à sable"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Approbations d'exécution"
---

# Approbations d'exécution

Les approbations d'exécution constituent la **garde-fou de l'application compagnon / de l'hôte de nœud** permettant à un agent sandboxed d'exécuter des commandes sur un hôte réel (`gateway` ou `node`). Voyez cela comme un verrouillage de sécurité : les commandes sont autorisées uniquement lorsque la stratégie + la liste blanche + (l'approbation utilisateur facultative) sont toutes d'accord.
Les approbations d'exécution s'ajoutent **en plus** à la stratégie d'outil et au filtrage élevé (sauf si élevé est défini sur `full`, ce qui ignore les approbations).
La stratégie effective est la **plus stricte** de `tools.exec.*` et des valeurs par défaut d'approbation ; si un champ d'approbation est omis, la valeur `tools.exec` est utilisée.
L'exécution de l'hôte utilise également l'état local des approbations sur cette machine. Un `ask: "always"` local à l'hôte dans `~/.openclaw/exec-approvals.json` continue à demander, même si la session ou les valeurs par configuration demandent `ask: "on-miss"`.
Utilisez `openclaw approvals get`, `openclaw approvals get --gateway` ou `openclaw approvals get --node <id|name|ip>` pour inspecter la stratégie demandée, les sources de la stratégie de l'hôte et le résultat effectif.
Pour la machine locale, `openclaw exec-policy show` expose la même vue fusionnée et `openclaw exec-policy set|preset` peut synchroniser la stratégie demandée locale avec le fichier d'approbations de l'hôte local en une seule étape. Lorsqu'une portée locale demande `host=node`, `openclaw exec-policy show` signale cette portée comme gérée par le nœud au moment de l'exécution au lieu de prétendre que le fichier d'approbations local est la source de vérité effective.

Si l'interface utilisateur de l'application compagnon n'est **pas disponible**, toute demande nécessitant une invite est résolue par le **ask fallback** (par défaut : refuser).

Les clients natifs d'approbation par chat peuvent également exposer des fonctionnalités spécifiques au channel sur le message d'approbation en attente. Par exemple, Matrix peut amorcer des raccourcis de réaction sur l'invite d'approbation (`✅` autoriser une fois, `❌` refuser et `♾️` autoriser toujours si disponible) tout en laissant les commandes `/approve ...` dans le message comme solution de repli.

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

- Le **service hôte de nœud** transfère `system.run` à l'application **macOS** via l'IPC local.
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
- stratégie d'approbations locales à l'hôte dans `~/.openclaw/exec-approvals.json`

C'est désormais le comportement par défaut de l'hôte, sauf si vous le resserr explicitement :

- `tools.exec.security` : `full` sur `gateway`/`node`
- `tools.exec.ask` : `off`
- hôte `askFallback` : `full`

Distinction importante :

- `tools.exec.host=auto` choisit où l'exécution a lieu : bac à sable (sandbox) si disponible, sinon passerelle.
- YOLO choisit comment l'exécution hôte est approuvée : `security=full` plus `ask=off`.
- En mode YOLO, OpenClaw n'ajoute pas de porte distincte d'approvation par heuristique d'obscurcissement de commande ou de couche de rejet de pré-vérification de script par-dessus la stratégie d'exécution hôte configurée.
- `auto` ne fait pas du routage via la passerelle une priorité gratuite depuis une session sandboxée. Une demande `host=node` par appel est autorisée depuis `auto`, et `host=gateway` n'est autorisée depuis `auto` que lorsqu'aucun runtime de bac à sable n'est actif. Si vous souhaitez une valeur par défaut stable non automatique, définissez `tools.exec.host` ou utilisez `/exec host=...` explicitement.

Si vous souhaitez une configuration plus prudente, resserrez l'une ou l'autre couche à `allowlist` / `on-miss`
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

Raccourci local pour la même stratégie de passerelle-hôte sur la machine actuelle :

```bash
openclaw exec-policy preset yolo
```

Ce raccourci local met à jour les deux éléments :

- `tools.exec.host/security/ask` local
- valeurs par défaut `~/.openclaw/exec-approvals.json` locales

C'est intentionnellement uniquement local. Si vous devez modifier les approbations passerelle-hôte ou nœud-hôte
à distance, continuez à utiliser `openclaw approvals set --gateway` ou
`openclaw approvals set --node <id|name|ip>`.

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

Importante limitation locale uniquement :

- `openclaw exec-policy` ne synchronise pas les approbations de nœud
- `openclaw exec-policy set --host node` est rejeté
- les approbations d'exécution de nœud sont récupérées à partir du nœud au moment de l'exécution, les mises à jour ciblant le nœud doivent donc utiliser `openclaw approvals --node ...`

Raccourci session uniquement :

- `/exec security=full ask=off` ne modifie que la session actuelle.
- `/elevated full` est un raccourci de type « break-glass » qui ignore également les approbations d'exécution pour cette session.

Si le fichier d'approbations de l'hôte reste plus strict que la configuration, la stratégie de l'hôt la plus stricte l'emporte.

## Paramètres de stratégie

### Sécurité (`exec.security`)

- **deny** : bloquer toutes les demandes d'exécution sur l'hôte.
- **allowlist** : autoriser uniquement les commandes figurant sur la liste d'autorisation.
- **full** : tout autoriser (équivalent à elevated).

### Demande (`exec.ask`)

- **off** : ne jamais demander.
- **on-miss** : demander uniquement lorsque la liste d'autorisation ne correspond pas.
- **always** : demander pour chaque commande.
- La confiance durable `allow-always` ne supprime pas les demandes lorsque le mode de demande effectif est `always`.

### Repli de demande (`askFallback`)

Si une demande est requise mais qu'aucune interface utilisateur n'est accessible, le repli décide :

- **deny** : bloquer.
- **allowlist** : autoriser uniquement si la liste d'autorisation correspond.
- **full** : autoriser.

### Renforcement de l'évaluation de l'interpréteur en ligne (`tools.exec.strictInlineEval`)

Lorsque `tools.exec.strictInlineEval=true`, OpenClaw traite les formulaires d'évaluation de code en ligne comme nécessitant une approbation uniquement, même si le binaire de l'interpréteur lui-même est sur la liste d'autorisation.

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
- `allow-always` ne conserve pas automatiquement de nouvelles entrées de liste d'autorisation pour elles.

## Liste d'autorisation (par agent)

Les listes d'autorisation sont **par agent**. Si plusieurs agents existent, changez l'agent que vous modifiez
dans l'application macOS. Les modèles sont des **correspondances glob insensibles à la casse**.
Les modèles doivent correspondre à **des chemins binaires** (les entrées constituées uniquement du nom de base sont ignorées).
Les entrées obsolètes `agents.default` sont migrées vers `agents.main` lors du chargement.
Les chaînes de shell telles que `echo ok && pwd` nécessitent toujours que chaque segment de niveau supérieur respecte les règles de la liste d'autorisation.

Exemples :

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

Chaque entrée de liste d'autorisation suit :

- **id** UUID stable utilisé pour l'identité de l'interface utilisateur (facultatif)
- **last used** horodatage
- **last used command**
- **last resolved path**

## Auto-allow skill CLIs

Lorsque l'option **Auto-allow skill CLIs** est activée, les exécutables référencés par les compétences connues
sont traités comme autorisés sur les nœuds (nœud macOS ou hôte de nœud sans interface graphique). Cela utilise
`skills.bins` via le Gateway RPC pour récupérer la liste des binaires de la compétence. Désactivez cette option si vous souhaitez des listes d'autorisation manuelles strictes.

Notes de confiance importantes :

- Il s'agit d'une **liste d'autorisation de commodité implicite**, distincte des entrées de liste d'autorisation de chemin manuelles.
- Elle est destinée aux environnements d'opérateurs de confiance où le Gateway et le nœud se trouvent dans la même limite de confiance.
- Si vous exigez une confiance explicite stricte, gardez `autoAllowSkills: false` et utilisez uniquement les entrées de liste d'autorisation de chemin manuelles.

## Safe bins (stdin-only)

`tools.exec.safeBins` définit une petite liste de binaires **uniquement stdin** (par exemple `cut`)
qui peuvent s'exécuter en mode liste blanche **sans** entrées de liste blanche explicites. Les bacs sûrs rejettent
les arguments de fichiers positionnels et les tokens de type chemin, ils ne peuvent donc opérer que sur le flux entrant.
Considérez cela comme un chemin rapide étroit pour les filtres de flux, et non comme une liste de confiance générale.
N'ajoutez **pas** de binaires d'interpréteur ou d'exécution (par exemple `python3`, `node`, `ruby`, `bash`, `sh`, `zsh`) à `safeBins`.
Si une commande peut évaluer du code, exécuter des sous-commandes ou lire des fichiers par conception, préférez les entrées de liste blanche explicites et gardez les invites d'approbation activées.
Les bacs sûrs personnalisés doivent définir un profil explicite dans `tools.exec.safeBinProfiles.<bin>`.
La validation est déterministe uniquement à partir de la forme d'argv (pas de vérifications d'existence du système de fichiers hôte), ce qui
empêche le comportement d'oracle d'existence de fichier à partir des différences d'autorisation/refus.
Les options orientées fichier sont refusées pour les bacs sûrs par défaut (par exemple `sort -o`, `sort --output`,
`sort --files0-from`, `sort --compress-program`, `sort --random-source`,
`sort --temporary-directory`/`-T`, `wc --files0-from`, `jq -f/--from-file`,
`grep -f/--file`).
Les bacs sûrs appliquent également une stratégie explicite d'indicateurs par binaire pour les options qui brisent le comportement uniquement stdin
(par exemple `sort -o/--output/--compress-program` et les indicateurs récursifs de grep).
Les options longues sont validées en échec fermé en mode bac sûr : les indicateurs inconnus et les
abréviations ambiguës sont rejetées.
Indicateurs refusés par profil de bac sûr :

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep` : `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq` : `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort` : `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc` : `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Les bacs sûrs (Safe bins) forcent également les jetons argv à être traités comme du **texte littéral** au moment de l'exécution (pas de globbing
et pas d'expansion `$VARS`) pour les segments stdin uniquement, afin que des modèles comme `*` ou `$HOME/...` ne puissent pas
être utilisés pour introduire subrepticement des lectures de fichiers.
Les bacs sûrs doivent également être résolus à partir de répertoires binaires de confiance (valeurs par défaut du système plus `tools.exec.safeBinTrustedDirs` en option). Les entrées `PATH` ne sont jamais automatiquement approuvées.
Les répertoires de bacs sûrs de confiance par défaut sont intentionnellement minimaux : `/bin`, `/usr/bin`.
Si votre exécutable de bac sûr réside dans des chemins de gestionnaire de paquets/utilisateur (par exemple
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`), ajoutez-les explicitement
à `tools.exec.safeBinTrustedDirs`.
Les chaînages et redirections de shell ne sont pas automatiquement autorisés en mode liste verte (allowlist).

L'enchaînement de shell (`&&`, `||`, `;`) est autorisé lorsque chaque segment de niveau supérieur satisfait à la liste d'autorisation
(y compris les bins sûrs ou l'autorisation automatique des compétences). Les redirections restent non prises en charge en mode liste d'autorisation.
La substitution de commandes (`$()` / backticks) est rejetée lors de l'analyse de la liste d'autorisation, y compris à l'intérieur
de guillemets doubles ; utilisez des guillemets simples si vous avez besoin d'un texte littéral `$()`.
Sur les approbations d'applications compagnon macOS, le texte shell brut contenant une syntaxe de contrôle ou d'expansion de shell
(`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) est traité comme un échec de la liste d'autorisation, à moins que
le binaire du shell lui-même ne soit dans la liste d'autorisation.
Pour les wrappers de shell (`bash|sh|zsh ... -c/-lc`), les redéfinitions d'environnement limitées à la demande sont réduites à une
petite liste d'autorisation explicite (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
Pour les décisions d'autorisation permanente en mode liste d'autorisation, les wrappers de répartition connus
(`env`, `nice`, `nohup`, `stdbuf`, `timeout`) conservent les chemins des exécutables internes au lieu des chemins des wrappers.
Les multiplexeurs de shell (`busybox`, `toybox`) sont également décompressés pour les applets de shell (`sh`, `ash`,
etc.) afin que les exécutables internes soient conservés à la place des binaires multiplexeurs. Si un wrapper ou
un multiplexeur ne peut pas être décompressé en toute sécurité, aucune entrée de liste d'autorisation n'est conservée automatiquement.
Si vous mettez sur la liste d'autorisation des interpréteurs comme `python3` ou `node`, préférez `tools.exec.strictInlineEval=true` afin que l'évaluation en ligne nécessite toujours une approbation explicite. En mode strict, `allow-always` peut toujours conserver les appels bénins d'interpréteur/de script, mais les porteurs d'évaluation en ligne ne sont pas conservés automatiquement.

Bacs sécurisés par défaut :

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` et `sort` ne figurent pas dans la liste par défaut. Si vous les activez, conservez des entrées de liste d'autorisation explicites pour
leurs flux de travail non-stdin.
Pour `grep` en mode bac sécurisé, fournissez le modèle avec `-e`/`--regexp` ; la forme de modèle positionnel est
rejetée afin que les opérandes de fichier ne puissent pas être introduits en contrebande comme éléments positionnels ambigus.

### Bacs sécurisés par rapport à la liste d'autorisation

| Sujet                  | `tools.exec.safeBins`                                                   | Liste d'autorisation (`exec-approvals.json`)                                                  |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Objectif               | Autoriser automatiquement les filtres stdin étroits                     | Approuver explicitement des exécutables spécifiques                                           |
| Type de correspondance | Nom de l'exécutable + politique argv de bac sécurisé                    | Modèle de glob de chemin d'exécutable résolu                                                  |
| Portée des arguments   | Restreint par le profil de bac sécurisé et les règles de jeton littéral | Correspondance de chemin uniquement ; les arguments sont par ailleurs de votre responsabilité |
| Exemples typiques      | `head`, `tail`, `tr`, `wc`                                              | `jq`, `python3`, `node`, `ffmpeg`, CLI personnalisées                                         |
| Meilleure utilisation  | Transformations de texte à faible risque dans les pipelines             | Tout outil avec un comportement plus large ou des effets secondaires                          |

Emplacement de la configuration :

- `safeBins` provient de la configuration (`tools.exec.safeBins` ou `agents.list[].tools.exec.safeBins` par agent).
- `safeBinTrustedDirs` provient de la configuration (`tools.exec.safeBinTrustedDirs` ou `agents.list[].tools.exec.safeBinTrustedDirs` par agent).
- `safeBinProfiles` provient de la configuration (`tools.exec.safeBinProfiles` ou `agents.list[].tools.exec.safeBinProfiles` par agent). Les clés de profil par agent remplacent les clés globales.
- les entrées de la liste d'autorisation résident dans `~/.openclaw/exec-approvals.json` local à l'hôte sous `agents.<id>.allowlist` (ou via l'interface utilisateur de contrôle / `openclaw approvals allowlist ...`).
- `openclaw security audit` avertit avec `tools.exec.safe_bins_interpreter_unprofiled` lorsque des interpréteurs/bins d'exécution apparaissent dans `safeBins` sans profils explicites.
- `openclaw doctor --fix` peut générer des entrées `safeBinProfiles.<bin>` personnalisées manquantes en tant que `{}` (à réviser et à resserrer ensuite). Les interpréteurs/bins d'exécution ne sont pas générés automatiquement.

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

Si vous activez explicitement `jq` dans `safeBins`, OpenClaw rejette toujours la fonction intégrée `env` en mode safe-bin, afin que `jq -n env` ne puisse pas vider l'environnement du processus hôte sans un chemin de liste d'autorisation explicite ou une invite d'approbation.

## Modification de l'interface utilisateur de contrôle

Utilisez la carte **Control UI → Nodes → Exec approvals** pour modifier les valeurs par défaut, les remplacements par agent et les listes d'autorisation. Choisissez une portée (Defaults ou un agent), ajustez la stratégie, ajoutez/supprimez des modèles de liste d'autorisation, puis **Save**. L'interface affiche les métadonnées **last used** par modèle afin que vous puissiez garder la liste en ordre.

Le sélecteur de cible choisit **Gateway** (approbations locales) ou un **Node**. Les nœuds doivent annoncer `system.execApprovals.get/set` (application macOS ou hôte de nœud sans tête). Si un nœud n'annonce pas encore les approbations d'exécution, modifiez directement son `~/.openclaw/exec-approvals.json` local.

CLI : `openclaw approvals` prend en charge la modification de la passerelle ou du nœud (voir [Approvals CLI](/fr/cli/approvals)).

## Flux d'approbation

Lorsqu'une invite est requise, la passerelle diffuse `exec.approval.requested` aux clients opérateurs. L'interface utilisateur de contrôle et l'application macOS la résolvent via `exec.approval.resolve`, puis la passerelle transmet la demande approuvée à l'hôte du nœud.

Pour `host=node`, les demandes d'approbation incluent une charge utile canonique `systemRunPlan`. La passerelle utilise ce plan comme contexte de commande/répertoire/session faisant autorité lors du transfert des demandes `system.run` approuvées.

C'est important pour la latence d'approbation asynchrone :

- le chemin d'exécution du nœud prépare un plan canonique à l'avance
- l'enregistrement d'approbation stocke ce plan et ses métadonnées de liaison
- une fois approuvé, l'appel `system.run` final transféré réutilise le plan stocké
  au lieu de faire confiance aux modifications ultérieures de l'appelant
- si l'appelant modifie `command`, `rawCommand`, `cwd`, `agentId`, ou
  `sessionKey` après la création de la demande d'approbation, la passerelle rejette
  l'exécution transférée en raison d'une inadéquation de l'approbation

## Commandes d'interpréteur/runtime

Les exécutions d'interpréteur/runtime soutenues par une approbation sont intentionnellement conservatrices :

- Le contexte exact argv/cwd/env est toujours lié.
- Les formes de script shell direct et de fichier runtime direct sont liées de manière « au mieux » à un fichier local concret.
- Les formes de wrappers courants de gestionnaires de paquets qui résolvent toujours vers un fichier local direct (par exemple
  `pnpm exec`, `pnpm node`, `npm exec`, `npx`) sont déballées avant la liaison.
- Si OpenClaw ne peut pas identifier exactement un fichier local concret pour une commande d'interpréteur/runtime
  (par exemple les scripts de paquets, les formes eval, les chaînes de chargeur spécifiques au runtime, ou les formes
  multi-fichiers ambiguës), l'exécution soutenue par une approbation est refusée plutôt que de prétendre à une couverture sémantique qu'elle n'a pas.
- Pour ces workflows, préférez le sandboxing, une limite d'hôte séparée, ou une liste d'autorisation/flux de travail complet explicitement de confiance où l'opérateur accepte la sémantique runtime plus large.

Lorsque des approbations sont requises, l'outil exec retourne immédiatement un identifiant d'approbation. Utilisez cet identifiant pour
corréler les événements système ultérieurs (`Exec finished` / `Exec denied`). Si aucune décision n'arrive avant le
délai d'attente, la demande est traitée comme un dépassement de délai d'approbation et signalée comme motif de refus.

### Comportement de livraison de suivi

Après qu'un exec asynchrone approuvé est terminé, OpenClaw envoie un tour de suivi `agent` à la même session.

- Si une cible de livraison externe valide existe (channel livrable plus cible `to`), la livraison de suivi utilise ce channel.
- Dans les flux webchat uniquement ou de session interne sans cible externe, la livraison de suivi reste limitée à la session (`deliver: false`).
- Si un appelant demande explicitement une livraison externe stricte sans channel externe résolvable, la demande échoue avec `INVALID_REQUEST`.
- Si `bestEffortDeliver` est activé et qu'aucun canal externe ne peut être résolu, la livraison est rétrogradée à session uniquement au lieu d'échouer.

La boîte de dialogue de confirmation inclut :

- commande + args
- cwd
- id de l'agent
- chemin exécutable résolu
- métadonnées de l'hôte + de la stratégie

Actions :

- **Autoriser une fois** → exécuter maintenant
- **Toujours autoriser** → ajouter à la liste d'autorisation + exécuter
- **Refuser** → bloquer

## Transfert des approbations vers les canaux de discussion

Vous pouvez transférer les invites d'approbation d'exécution vers n'importe quel canal de discussion (y compris les canaux de plugin) et les approuver
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

Répondre dans la discussion :

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

La commande `/approve` gère à la fois les approbations d'exécution et les approbations de plugin. Si l'ID ne correspond pas à une approbation d'exécution en attente, elle vérifie automatiquement les approbations de plugin à la place.

### Transfert des approbations de plugin

Le transfert des approbations de plugin utilise le même pipeline de livraison que les approbations d'exécution mais possède sa propre
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

Les canaux qui prennent en charge les réponses interactives partagées affichent les mêmes boutons d'approbation pour les approubations d'exécution et
de plugin. Les canaux sans interface interactive partagée reviennent au texte brut avec les instructions
`/approve`.

### Approbations dans la même discussion sur n'importe quel canal

Lorsqu'une demande d'approbation d'exécution ou de plugin provient d'une surface de discussion livrable, la même discussion
peut maintenant l'approuver avec `/approve` par défaut. Cela s'applique aux canaux tels que Slack, Matrix et
Microsoft Teams en plus des flux existants de l'interface Web et de l'interface terminal.

Ce chemin de commande texte partagé utilise le modèle d'authentification de canal normal pour cette conversation. Si la discussion
d'origine peut déjà envoyer des commandes et recevoir des réponses, les demandes d'approbation n'ont plus besoin d'un adaptateur de livraison natif séparé juste pour rester en attente.

Discord et Telegram prennent également en charge `/approve` dans le même chat, mais ces canaux utilisent toujours leur liste d'approuvants résolue pour l'autorisation, même lorsque la livraison native des approbations est désactivée.

Pour Telegram et autres clients d'approbation natifs qui appellent le Gateway directement,
ce repli est intentionnellement limité aux échecs « approbation introuvable ». Un véritable
refus/erreur d'approbation d'exécution ne réessaie pas silencieusement en tant qu'approbation de plugin.

### Livraison native des approbations

Certains canaux peuvent également agir en tant que clients d'approbation natifs. Les clients natifs ajoutent les DM des approuvants, la diffusion vers le chat d'origine,
et l'UX d'approbation interactive spécifique au canal par-dessus le flux partagé de `/approve` dans le même chat.

Lorsque les cartes/boutons d'approbation natifs sont disponibles, cette interface utilisateur native est le chemin principal
orienté agent. L'agent ne doit pas non plus répéter une commande de chat en clair en double
`/approve` à moins que le résultat de l'outil n'indique que les approbations de chat sont indisponibles ou
que l'approbation manuelle est le seul chemin restant.

Modèle générique :

- la stratégie d'exécution de l'hôte décide toujours si une approbation d'exécution est requise
- `approvals.exec` contrôle le transfert des invites d'approbation vers d'autres destinations de chat
- `channels.<channel>.execApprovals` contrôle si ce canal agit comme un client d'approbation natif

Les clients d'approbation natifs activent automatiquement la livraison prioritaire par DM lorsque toutes les conditions suivantes sont remplies :

- le canal prend en charge la livraison native des approbations
- les approuvants peuvent être résolus à partir d'un `execApprovals.approvers` explicite ou des
  sources de repli documentées de ce canal
- `channels.<channel>.execApprovals.enabled` est non défini ou `"auto"`

Définissez `enabled: false` pour désactiver explicitement un client d'approbation natif. Définissez `enabled: true` pour le
forcer lorsque les approuvants sont résolus. La livraison publique dans le chat d'origine reste explicite via
`channels.<channel>.execApprovals.target`.

FAQ : [Pourquoi y a-t-il deux configurations d'approbation d'exécution pour les approbations de chat ?](/fr/help/faq#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord : `channels.discord.execApprovals.*`
- Slack : `channels.slack.execApprovals.*`
- Telegram : `channels.telegram.execApprovals.*`

Ces clients d'approbation natifs ajoutent le routage par DM et la diffusion optionnelle vers le canal par-dessus le flux partagé de
`/approve` dans le même chat et les boutons d'approbation partagés.

Comportement partagé :

- Slack, Matrix, Microsoft Teams et les chats livrables similaires utilisent le modèle d'authentification de canal normal
  pour les `/approve` de même chat
- lorsqu'un client d'approbation natif s'active automatiquement, la cible de livraison native par défaut est les DMs de l'approbant
- pour Discord et Telegram, seuls les approbants résolus peuvent approuver ou refuser
- les approbants Discord peuvent être explicites (`execApprovals.approvers`) ou déduits de `commands.ownerAllowFrom`
- les approbants Telegram peuvent être explicites (`execApprovals.approvers`) ou déduits de la configuration de propriétaire existante (`allowFrom`, plus message direct `defaultTo` lorsque pris en charge)
- les approbants Slack peuvent être explicites (`execApprovals.approvers`) ou déduits de `commands.ownerAllowFrom`
- les boutons natifs Slack préservent le type d'ID d'approbation, donc les IDs `plugin:` peuvent résoudre les approbations de plugin
  sans une deuxième couche de repli locale Slack
- le routage natif DM/canal Matrix et les raccourcis de réaction gèrent à la fois les approbations exec et plugin ;
  l'autorisation de plugin provient toujours de `channels.matrix.dm.allowFrom`
- le demandeur n'a pas besoin d'être un approbant
- le chat d'origine peut approuver directement avec `/approve` lorsque ce chat prend déjà en charge les commandes et les réponses
- les boutons d'approbation natifs Discord acheminent par type d'ID d'approbation : les IDs `plugin:` vont
  directement aux approbations de plugin, tout le reste va aux approbations exec
- les boutons d'approbation natifs Telegram suivent le même repli borné exec-vers-plugin que `/approve`
- lorsque `target` natif active la livraison au chat d'origine, les invites d'approbation incluent le texte de la commande
- les approbations exec en attente expirent après 30 minutes par défaut
- si aucune interface utilisateur d'opérateur ou client d'approbation configuré ne peut accepter la demande, l'invite revient à `askFallback`

Telegram utilise par défaut les DMs de l'approbant (`target: "dm"`). Vous pouvez passer à `channel` ou `both` lorsque vous
voulez que les invites d'approbation apparaissent également dans le chat/sujet Telegram d'origine. Pour les sujets de forum
Telegram, OpenClaw préserve le sujet pour l'invite d'approbation et le suivi post-approbation.

Voir :

- [Discord](/fr/channels/discord)
- [Telegram](/fr/channels/telegram)

### Flux macOS IPC

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

Notes de sécurité :

- Mode socket Unix `0600`, jeton stocké dans `exec-approvals.json`.
- Vérification des homologues même UID.
- Défi/réponse (nonce + jeton HMAC + hachage de la requête) + TTL court.

## Événements système

Le cycle de vie de l'exécution apparaît sous forme de messages système :

- `Exec running` (seulement si la commande dépasse le seuil d'avertissement d'exécution)
- `Exec finished`
- `Exec denied`

Ces éléments sont publiés dans la session de l'agent après que le nœud a signalé l'événement.
Les approbations d'exécution hébergées par Gateway émettent les mêmes événements de cycle de vie lorsque la commande se termine (et éventuellement lorsqu'elle s'exécute plus longtemps que le seuil).
Les exécutions soumises à approbation réutilisent l'identifiant d'approbation comme `runId` dans ces messages pour une corrélation aisée.

## Comportement en cas d'approbation refusée

Lorsqu'une approbation d'exécution asynchrone est refusée, OpenClaw empêche l'agent de réutiliser
la sortie de toute exécution antérieure de la même commande dans la session. La raison du refus
est transmise avec des instructions explicites indiquant qu'aucune sortie de commande n'est disponible, ce qui empêche
l'agent de prétendre qu'il y a une nouvelle sortie ou de répéter la commande refusée avec
des résultats obsolètes d'une exécution antérieure réussie.

## Implications

- **full** est puissant ; privilégiez les listes d'autorisation lorsque cela est possible.
- **ask** vous maintient dans la boucle tout en permettant des approbations rapides.
- Les listes d'autorisation par agent empêchent les approbations d'un agent de fuir vers d'autres.
- Les approbations ne s'appliquent qu'aux requêtes d'exécution d'hôte provenant d'**expéditeurs autorisés**. Les expéditeurs non autorisés ne peuvent pas émettre `/exec`.
- `/exec security=full` est une commodité au niveau de la session pour les opérateurs autorisés et ignore les approbations par conception.
  Pour bloquer fermement l'exécution de l'hôte, définissez la sécurité des approbations sur `deny` ou refusez l'outil `exec` via la stratégie d'outil.

Connexes :

- [Outil Exec](/fr/tools/exec)
- [Mode élevé](/fr/tools/elevated)
- [Skills](/fr/tools/skills)

## Connexes

- [Exec](/fr/tools/exec) — outil d'exécution de commandes shell
- [Sandboxing](/fr/gateway/sandboxing) — modes de bac à sable et accès à l'espace de travail
- [Sécurité](/fr/gateway/security) — modèle de sécurité et durcissement
- [Sandbox vs politique d'outils vs élevé](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) — quand utiliser chacun
