---
summary: "Utilisation de l'outil Exec, modes stdin et support TTY"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Tool d'exécution"
---

Exécutez des commandes shell dans l'espace de travail. `exec`OpenClaw est une surface shell mutante : les commandes peuvent créer, modifier ou supprimer des fichiers partout où le système de fichiers de l'hôte ou du bac à sable sélectionné le permet. La désactivation des outils de système de fichiers d'OpenClaw tels que `write`, `edit` ou `apply_patch` ne rend pas `exec` en lecture seule.

Prend en charge l'exécution en premier plan et en arrière-plan via `process`. Si `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
Les sessions d'arrière-plan sont délimitées par agent ; `process` ne voit que les sessions du même agent.

## Paramètres

<ParamField path="command" type="string" required>
  Commande shell à exécuter.
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
  Répertoire de travail pour la commande.
</ParamField>

<ParamField path="env" type="object">
  Remplacements d'environnement clé/valeur fusionnés par-dessus l'environnement hérité.
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
  Mettre automatiquement la commande en arrière-plan après ce délai (ms).
</ParamField>

<ParamField path="background" type="boolean" default="false">
  Mettre la commande en arrière-plan immédiatement au lieu d'attendre `yieldMs`.
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec">
  Remplacer le délai d'attente exec configuré pour cet appel. Définissez `timeout: 0` uniquement lorsque la commande doit s'exécuter sans le délai d'attente du processus exec.
</ParamField>

<ParamField path="pty" type="boolean" default="false">
  Exécuter dans un pseudo-terminal lorsque disponible. À utiliser pour les interfaces de ligne de commande (CLI) TTY uniquement, les agents de codage et les interfaces utilisateur de terminal.
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
  Où exécuter. `auto` correspond à `sandbox` lorsqu'un runtime de bac à sable est actif et `gateway` sinon.
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
  Ignoré pour les appels de tool normaux. La sécurité `gateway` / `node` est contrôlée par `tools.exec.security` et `~/.openclaw/exec-approvals.json` ; le mode élevé peut forcer `security=full` uniquement lorsque l'opérateur accorde explicitement un accès élevé.
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  Comportement de l'invite d'approbation pour l'exécution `gateway` / `node`.
</ParamField>

<ParamField path="node" type="string">
  ID/nom du nœud lors de `host=node`.
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  Demander le mode élevé — échapper du bac à sable vers le chemin d'hôte configuré. `security=full` est forcé uniquement lorsque la résolution élevée donne `full`.
</ParamField>

Notes :

- `host` par défaut est `auto` : bac à sable si le runtime du bac à sable est actif pour la session, sinon passerelle.
- `host` n'accepte que `auto`, `sandbox`, `gateway` ou `node`. Ce n'est pas un sélecteur de nom d'hôte ; les valeurs ressemblant à des noms d'hôte sont rejetées avant l'exécution de la commande.
- `auto` est la stratégie de routage par défaut, pas un caractère générique. `host=node` par appel est autorisé depuis `auto` ; `host=gateway` par appel n'est autorisé que lorsqu'aucun runtime de bac à sable n'est actif.
- Sans configuration supplémentaire, `host=auto` fonctionne toujours « tel quel » : pas de bac à sable signifie qu'il résout vers `gateway` ; un bac à sable actif signifie qu'il reste dans le bac à sable.
- `elevated` échappe au bac à sable vers le chemin d'hôte configuré : `gateway` par défaut, ou `node` lorsque `tools.exec.host=node` (ou que la valeur par défaut de la session est `host=node`). Il n'est disponible que lorsque l'accès élevé est activé pour la session/le fournisseur actuel.
- Les approbations `gateway`/`node` sont contrôlées par `~/.openclaw/exec-approvals.json`.
- `node` nécessite un nœud apparié (application compagnon ou hôte de nœud sans tête).
- Si plusieurs nœuds sont disponibles, définissez `exec.node` ou `tools.exec.node` pour en sélectionner un.
- `exec host=node` est le seul chemin d'exécution de shell pour les nœuds ; le wrapper `nodes.run` hérité a été supprimé.
- `timeout` s'applique à l'exécution au premier plan, en arrière-plan, `yieldMs`, passerelle, bac à sable et nœud `system.run`. S'il est omis, OpenClaw utilise `tools.exec.timeoutSec` ; `timeout: 0` explicite désactive le délai d'expiration du processus exec pour cet appel.
- Sur les hôtes non Windows, exec utilise `SHELL` s'il est défini ; si `SHELL` est `fish`, il préfère `bash` (ou `sh`)
  depuis `PATH` pour éviter les scripts incompatibles avec fish, puis revient à `SHELL` si aucun n'existe.
- Sur les hôtes Windows, exec préfère la découverte de PowerShell 7 (`pwsh`) (Program Files, ProgramW6432, puis PATH),
  puis revient à Windows PowerShell 5.1.
- L'exécution sur l'hôte (`gateway`/`node`) rejette `env.PATH` et les substitutions du chargeur (`LD_*`/`DYLD_*`) pour
  empêcher le détournement binaire ou l'injection de code.
- OpenClaw définit OpenClaw`OPENCLAW_SHELL=exec` dans l'environnement de la commande générée (y compris pour l'exécution PTY et sandbox) afin que les règles shell/profil puissent détecter le contexte de l'outil d'exécution.
- `openclaw channels login` est bloqué depuis `exec` car il s'agit d'un flux d'authentification channel interactif ; exécutez-le dans un terminal sur l'hôte de passerelle, ou utilisez l'outil de connexion natif du channel depuis le chat lorsqu'il existe.
- Important : le sandboxing est **désactivé par défaut**. Si le sandboxing est désactivé, le `host=auto`
  implicite est résolu en `gateway`. Le `host=sandbox` explicite échoue toujours (fail closed) au lieu de s'exécuter
  silencieusement sur l'hôte de la passerelle. Activez le sandboxing ou utilisez `host=gateway` avec des approbations.
- Les vérifications préalables de script (pour les erreurs courantes de syntaxe shell Python/Node) n'inspectent que les fichiers à l'intérieur de
  la limite `workdir` effective. Si un chemin de script se résout en dehors de `workdir`, la vérification préalable est ignorée pour
  ce fichier.
- Pour les travaux de longue durée qui commencent maintenant, lancez-les une seule fois et comptez sur le réveil automatique
  de complétion lorsqu'il est activé et que la commande émet une sortie ou échoue.
  Utilisez `process` pour les journaux, le statut, la saisie ou l'intervention ; n'émulez pas
  la planification avec des boucles de sleep, des boucles de timeout ou des interrogations répétées.
- Pour le travail qui doit se produire plus tard ou selon un calendrier, utilisez cron au lieu des
  modèles de sleep/delay `exec`.

## Config

- `tools.exec.notifyOnExit` (par défaut : true) : lorsque true, les sessions d'exécution en arrière-plan mettent en file d'attente un événement système et demandent un battement de cœur (heartbeat) à la sortie.
- `tools.exec.approvalRunningNoticeMs` (par défaut : 10000) : émet un seul avis "running" lorsqu'une exécution soumise à approbation dure plus longtemps que ce délai (0 désactive).
- `tools.exec.timeoutSec` (par défaut : 1800) : délai d'expiration d'exécution par commande par défaut en secondes. Le `timeout` par appel le remplace ; le `timeout: 0` par appel désactive le délai d'expiration du processus d'exécution.
- `tools.exec.host` (par défaut : `auto` ; se résout en `sandbox` lorsque le runtime sandbox est actif, `gateway` sinon)
- `tools.exec.security` (par défaut : `deny` pour le sandbox, `full` pour la passerelle + le nœud si non défini)
- `tools.exec.ask` (par défaut : `off`)
- L'exécution sur l'hôte sans approbation est le comportement par défaut pour la passerelle et le nœud. Si vous souhaitez le comportement d'approbations/liste blanche, renforcez à la fois `tools.exec.*` et `~/.openclaw/exec-approvals.json` de l'hôte ; voir [Exec approvals](/fr/tools/exec-approvals#yolo-mode-no-approval).
- YOLO provient des valeurs par défaut de la stratégie d'hôte (`security=full`, `ask=off`), et non de `host=auto`. Si vous souhaitez forcer le routage via la passerelle ou le nœud, définissez `tools.exec.host` ou utilisez `/exec host=...`.
- En mode `security=full` plus `ask=off`, l'exécution sur l'hôte suit directement la stratégie configurée ; il n'y a pas de couche de préfiltrage heuristique d'obfuscation de commande ni de rejet préalable de script.
- `tools.exec.node` (par défaut : non défini)
- `tools.exec.strictInlineEval` (par défaut : false) : si true, les formulaires d'évaluation de l'interpréteur en ligne tels que `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` et `osascript -e` nécessitent toujours une approbation explicite. `allow-always` peut toujours conserver les appels bénins d'interpréteur/de script, mais les formulaires d'évaluation en ligne invitent toujours à chaque fois.
- `tools.exec.commandHighlighting` (par défaut : false) : si true, les invites d'approbation peuvent mettre en surbrillance les étendues de commande dérivées de l'analyseur dans le texte de la commande. Définissez sur `true` globalement ou par agent pour activer la mise en surbrillance du texte de la commande sans modifier la stratégie d'approbation d'exécution.
- `tools.exec.pathPrepend` : liste des répertoires à ajouter au début de `PATH` pour les exécutions exec (passerelle + sandbox uniquement).
- `tools.exec.safeBins` : binaires sécurisés stdin uniquement qui peuvent s'exécuter sans entrées explicites de liste blanche. Pour plus de détails sur le comportement, voir [Safe bins](/fr/tools/exec-approvals-advanced#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs` : répertoires explicites supplémentaires approuvés pour les vérifications de chemin `safeBins`. Les entrées `PATH` ne sont jamais automatiquement approuvées. Les valeurs par défaut intégrées sont `/bin` et `/usr/bin`.
- `tools.exec.safeBinProfiles` : stratégie argv personnalisée facultative par binaire sécurisé (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

Exemple :

```json5
{
  tools: {
    exec: {
      pathPrepend: ["~/bin", "/opt/oss/bin"],
    },
  },
}
```

### Gestion du PATH

- `host=gateway` : fusionne votre `PATH` de shell de connexion dans l'environnement d'exécution. Les substitutions `env.PATH` sont
  rejetées pour l'exécution sur l'hôte. Le démon lui-même s'exécute toujours avec un `PATH` minimal :
  - macOS : `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux : `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox` : exécute `sh -lc` (shell de connexion) à l'intérieur du conteneur, donc `/etc/profile` peut réinitialiser `PATH`.
  OpenClaw préfixe `env.PATH` après le sourçage du profil via une variable d'environnement interne (pas d'interpolation shell) ;
  `tools.exec.pathPrepend` s'applique également ici.
- `host=node` : seules les substitutions d'environnement non bloquées que vous transmettez sont envoyées au nœud. Les substitutions `env.PATH` sont
  rejetées pour l'exécution sur l'hôte et ignorées par les hôtes de nœud. Si vous avez besoin d'entrées PATH supplémentaires sur un nœud,
  configurez l'environnement du service hôte de nœud (systemd/launchd) ou installez les outils dans des emplacements standards.

Liaison de nœud par agent (utilisez l'index de la liste des agents dans la configuration) :

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Interface de contrôle : l'onglet Nœuds inclut un petit panneau « Liaison de nœud Exec » pour les mêmes paramètres.

## Substitutions de session (`/exec`)

Utilisez `/exec` pour définir des valeurs par défaut **par session** pour `host`, `security`, `ask` et `node`.
Envoyez `/exec` sans arguments pour afficher les valeurs actuelles.

Exemple :

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## Modèle d'autorisation

`/exec` n'est pris en compte que pour les **expéditeurs autorisés** (listes d'autorisation de channel/appariement plus `commands.useAccessGroups`).
Il met à jour **uniquement l'état de la session** et n'écrit pas la configuration. Pour désactiver complètement l'exécution, refusez-la via la stratégie d'outils
(`tools.deny: ["exec"]` ou par agent). Les approbations de l'hôte s'appliquent toujours, sauf si vous définissez explicitement
`security=full` et `ask=off`.

## Approbations d'exécution (application compagnon / hôte de nœud)

Les agents en bac à sable (Sandboxed) peuvent exiger une approbation par requête avant que `exec` ne s'exécute sur la passerelle ou l'hôte de nœud.
Voir [Approbations d'exécution](/fr/tools/exec-approvals) pour la stratégie, la liste d'autorisation et le flux de l'interface utilisateur.

Lorsque des approbations sont requises, l'outil d'exécution retourne immédiatement
`status: "approval-pending"` et un identifiant d'approbation. Une fois approuvé (ou refusé / expiré),
le Gateway émet des événements système (`Exec finished` / `Exec denied`). Si la commande est toujours
en cours d'exécution après `tools.exec.approvalRunningNoticeMs`, un seul avis `Exec running` est émis.
Sur les channels avec des cartes/boutons d'approbation natifs, l'agent doit d'abord s'appuyer sur cette
interface utilisateur native et inclure uniquement une commande manuelle `/approve` lorsque le résultat de l'outil
indique explicitement que les approbations par chat sont indisponibles ou que l'approbation manuelle est le
seul chemin.

## Liste d'autorisation + bacs sûrs

L'application stricte de la liste d'autorisation correspond aux globs de chemins binaires résolus et aux globs de noms de commande nus. Les noms nus ne correspondent qu'aux commandes invoquées via PATH, donc `rg` peut correspondre à `/opt/homebrew/bin/rg` lorsque la commande est `rg`, mais pas `./rg` ou `/tmp/rg`. Lorsque `security=allowlist`, les commandes shell sont automatiquement autorisées uniquement si chaque segment du pipeline est sur la liste d'autorisation ou est un binaire sécurisé. Les chaînages (`;`, `&&`, `||`) et les redirections sont rejetés en mode liste d'autorisation, sauf si chaque segment de niveau supérieur satisfait la liste d'autorisation (y compris les bins sécurisés). Les redirections restent non prises en charge. La confiance durable `allow-always` ne contourne pas cette règle : une commande chaînée exige toujours que chaque segment de niveau supérieur corresponde.

`autoAllowSkills` est un chemin de commodité distinct dans les approbations d'exécution. Ce n'est pas la même chose que les entrées manuelles de la liste d'autorisation de chemins. Pour une confiance explicite stricte, gardez `autoAllowSkills` désactivé.

Utilisez les deux contrôles pour des tâches différentes :

- `tools.exec.safeBins` : petits filtres de flux stdin uniquement.
- `tools.exec.safeBinTrustedDirs` : répertoires supplémentaires explicitement approuvés pour les chemins d'exécutables des bins sécurisés.
- `tools.exec.safeBinProfiles` : stratégie argv explicite pour les bins sécurisés personnalisés.
- allowlist : confiance explicite pour les chemins d'exécutables.

Ne traitez pas `safeBins` comme une liste d'autorisation générique, et n'ajoutez pas de binaires d'interpréteur/d'exécution (par exemple `python3`, `node`, `ruby`, `bash`). Si vous en avez besoin, utilisez des entrées de liste d'autorisation explicites et gardez les invites d'approbation activées.
`openclaw security audit` avertit lorsque les entrées d'interpréteur/d'exécution `safeBins` manquent de profils explicites, et `openclaw doctor --fix` peut échafauder les entrées `safeBinProfiles` personnalisées manquantes.
`openclaw security audit` et `openclaw doctor` avertissent également lorsque vous ajoutez explicitement des binaires à comportement large tels que `jq` dans `safeBins`.
Si vous autorisez explicitement les interpréteurs, activez `tools.exec.strictInlineEval` afin que les formes d'évaluation de code en ligne nécessitent toujours une nouvelle approbation.

Pour plus de détails sur la politique et des exemples, consultez [Approbations Exec](/fr/tools/exec-approvals-advanced#safe-bins-stdin-only) et [Bacs de sécurité (safe bins) par rapport à la liste d'autorisation](/fr/tools/exec-approvals-advanced#safe-bins-versus-allowlist).

## Exemples

Premier plan :

```json
{ "tool": "exec", "command": "ls -la" }
```

Arrière-plan + interrogation (poll) :

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

L'interrogation (polling) est destinée à l'état à la demande, et non aux boucles d'attente. Si le réveil automatique de l'achèvement est activé, la commande peut réveiller la session lorsqu'elle émet une sortie ou échoue.

Envoyer des touches (style tmux) :

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

Soumettre (envoyer CR uniquement) :

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

Coller (entre crochets par défaut) :

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` est un sous-outil de `exec` pour les modifications multi-fichiers structurées.
Il est activé par défaut pour les modèles OpenAI et OpenAI Codex. N'utilisez la configuration que lorsque vous souhaitez le désactiver ou le restreindre à des modèles spécifiques :

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.5"] },
    },
  },
}
```

Remarques :

- Disponible uniquement pour les modèles OpenAI/OpenAI Codex.
- La stratégie d'outil s'applique toujours ; `allow: ["write"]` autorise implicitement `apply_patch`.
- `deny: ["write"]` ne refuse pas `apply_patch`; refusez `apply_patch` explicitement ou utilisez `deny: ["group:fs"]` lorsque les écritures de correctifs doivent également être bloquées.
- La configuration se trouve sous `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` est `true` par défaut ; définissez-le sur `false` pour désactiver le tool pour les modèles OpenAI.
- `tools.exec.applyPatch.workspaceOnly` est `true` par défaut (limité à l'espace de travail). Définissez-le sur `false` uniquement si vous voulez intentionnellement que `apply_patch` écrive ou supprime des fichiers en dehors du répertoire de l'espace de travail.

## Connexes

- [Exec Approvals](/fr/tools/exec-approvals) — portes d'approbation pour les commandes shell
- [Sandboxing](/fr/gateway/sandboxing) — exécution de commandes dans des environnements sandboxed
- [Background Process](/fr/gateway/background-process) — tool d'exécution et de processus de longue durée
- [Security](/fr/gateway/security) — stratégie de tool et accès élevé
