---
summary: "Utilisation de l'outil Exec, modes stdin et support TTY"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Tool d'exécution"
---

Exécutez des commandes shell dans l'espace de travail. Prend en charge l'exécution en premier plan et en arrière-plan via `process`.
Si `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
Les sessions en arrière-plan sont délimitées par agent ; `process` ne voit que les sessions du même agent.

## Paramètres

<ParamField path="command" type="string" required>
  Commande shell à exécuter.
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
  Répertoire de travail de la commande.
</ParamField>

<ParamField path="env" type="object">
  Remplacements de l'environnement clé/valeur fusionnés par-dessus l'environnement hérité.
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
  Passer automatiquement la commande en arrière-plan après ce délai (ms).
</ParamField>

<ParamField path="background" type="boolean" default="false">
  Passer immédiatement la commande en arrière-plan au lieu d'attendre `yieldMs`.
</ParamField>

<ParamField path="timeout" type="number" default="tools.exec.timeoutSec">
  Remplacer le délai d'exécution configuré pour cet appel. Définissez `timeout: 0` uniquement lorsque la commande doit s'exécuter sans le délai du processus d'exécution.
</ParamField>

<ParamField path="pty" type="boolean" default="false">
  Exécuter dans un pseudo-terminal lorsque disponible. À utiliser pour les CLI en mode TTY uniquement, les agents de codage et les interfaces de terminal.
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
  Où exécuter. `auto` résout en `sandbox` lorsqu'un runtime bac à sable est actif et `gateway` sinon.
</ParamField>

<ParamField path="security" type="'deny' | 'allowlist' | 'full'">
  Mode d'application pour l'exécution `gateway` / `node`.
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  Comportement de la demande d'approbation pour l'exécution `gateway` / `node`.
</ParamField>

<ParamField path="node" type="string">
  ID/nom du nœud lorsque `host=node`.
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  Demander le mode élevé — échapper du bac à sable vers le chemin d'hôte configuré. `security=full` est forcé uniquement lorsque élevé est résolu à `full`.
</ParamField>

Notes :

- `host` vaut `auto` par défaut : bac à sable lorsque le runtime de bac à sable est actif pour la session, sinon passerelle.
- `auto` est la stratégie de routage par défaut, pas un caractère générique. Le `host=node` par appel est autorisé depuis `auto` ; le `host=gateway` par appel n'est autorisé que lorsqu'aucun runtime de bac à sable n'est actif.
- Sans configuration supplémentaire, `host=auto` fonctionne toujours « tel quel » : pas de bac à sable signifie qu'il est résolu à `gateway` ; un bac à sable actif signifie qu'il reste dans le bac à sable.
- `elevated` échappe du bac à sable vers le chemin d'hôte configuré : `gateway` par défaut, ou `node` lorsque `tools.exec.host=node` (ou la valeur par défaut de la session est `host=node`). Il n'est disponible que lorsque l'accès élevé est activé pour la session/le fournisseur actuel.
- Les approbations `gateway`/`node` sont contrôlées par `~/.openclaw/exec-approvals.json`.
- `node` nécessite un nœud apparié (application compagnon ou hôte de nœud headless).
- Si plusieurs nœuds sont disponibles, définissez `exec.node` ou `tools.exec.node` pour en sélectionner un.
- `exec host=node` est le seul chemin d'exécution de shell pour les nœuds ; le wrapper obsolète `nodes.run` a été supprimé.
- `timeout` s'applique aux exécutions en avant-plan, en arrière-plan, `yieldMs`, passerelle, bac à sable (sandbox) et nœud `system.run`. S'il est omis, OpenClaw utilise `tools.exec.timeoutSec` ; `timeout: 0` explicite désactive le délai d'expiration du processus d'exécution pour cet appel.
- Sur les hôtes non Windows, exec utilise `SHELL` lorsqu'il est défini ; si `SHELL` est `fish`, il préfère `bash` (ou `sh`)
  depuis `PATH` pour éviter les scripts incompatibles avec fish, puis revient à `SHELL` si aucun n'existe.
- Sur les hôtes Windows, exec préfère la découverte de PowerShell 7 (`pwsh`) (Program Files, ProgramW6432, puis PATH),
  puis revient à Windows PowerShell 5.1.
- L'exécution sur l'hôte (`gateway`/`node`) rejette `env.PATH` et les substitutions de chargeur (`LD_*`/`DYLD_*`) pour
  prévenir le détournement de binaire ou l'injection de code.
- OpenClaw définit `OPENCLAW_SHELL=exec` dans l'environnement de la commande générée (y compris l'exécution PTY et sandbox) afin que les règles de shell/profil puissent détecter le contexte de l'outil d'exécution.
- Important : le sandboxing (bac à sable) est **désactivé par défaut**. Si le sandboxing est désactivé, `host=auto`
  implicite est résolu en `gateway`. `host=sandbox` explicite échoue toujours fermement au lieu de
  s'exécuter silencieusement sur l'hôte de la passerelle. Activez le sandboxing ou utilisez `host=gateway` avec des approbations.
- Les vérifications préalables de script (pour les erreurs courantes de syntaxe de shell Python/Node) n'inspectent que les fichiers à l'intérieur de
  la limite effective `workdir`. Si un chemin de script est résolu à l'extérieur de `workdir`, la vérification préalable est ignorée pour
  ce fichier.
- Pour le travail de longue durée qui commence maintenant, lancez-le une seule fois et comptez sur le réveil automatique de complétion lorsqu'il est activé et que la commande émet une sortie ou échoue. Utilisez `process` pour les journaux, le statut, la saisie ou l'intervention ; n'émulez pas la planification avec des boucles de veille, des boucles de délai d'expiration ou des sondages répétés.
- Pour le travail qui doit se produire plus tard ou selon un calendrier, utilisez cron au lieu des modèles `exec` sleep/delay.

## Config

- `tools.exec.notifyOnExit` (par défaut : true) : lorsque c'est true, les sessions d'exécution en arrière-plan mettent en file d'attente un événement système et demandent un signal de présence à la sortie.
- `tools.exec.approvalRunningNoticeMs` (par défaut : 10000) : émet un seul avis « en cours d'exécution » lorsqu'une exécution soumise à approbation dure plus longtemps que cette durée (0 désactive).
- `tools.exec.timeoutSec` (par défaut : 1800) : délai d'expiration d'exécution par commande par défaut en secondes. Le `timeout` par appel le remplace ; le `timeout: 0` par appel désactive le délai d'expiration du processus d'exécution.
- `tools.exec.host` (par défaut : `auto` ; résout `sandbox` lorsque le runtime du bac à sable est actif, `gateway` sinon)
- `tools.exec.security` (par défaut : `deny` pour le bac à sable, `full` pour la passerelle + le nœud si non défini)
- `tools.exec.ask` (par défaut : `off`)
- L'exécution sur l'hôte sans approbation est la valeur par défaut pour la passerelle + le nœud. Si vous voulez le comportement d'approbations/liste blanche, resserrez à la fois `tools.exec.*` et le `~/.openclaw/exec-approvals.json` de l'hôte ; voir [Approbations d'exécution](/fr/tools/exec-approvals#no-approval-yolo-mode).
- YOLO provient des valeurs par défaut de la stratégie hôte (`security=full`, `ask=off`), et non de `host=auto`. Si vous souhaitez forcer le routage via la passerelle ou le nœud, définissez `tools.exec.host` ou utilisez `/exec host=...`.
- En mode `security=full` plus `ask=off`, l'exécution hôte suit directement la stratégie configurée ; il n'y a pas de couche de préfiltrage heuristique d'obfuscation de commande ou de rejet de pré-vol de script supplémentaire.
- `tools.exec.node` (par défaut : non défini)
- `tools.exec.strictInlineEval` (par défaut : false) : si vrai, les formes d'évaluation de l'interpréteur en ligne telles que `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` et `osascript -e` nécessitent toujours une approbation explicite. `allow-always` peut toujours rendre persistantes les appels bénins à l'interpréteur/aux scripts, mais les formes d'évaluation en ligne demandent toujours une confirmation à chaque fois.
- `tools.exec.pathPrepend` : liste des répertoires à ajouter au début de `PATH` pour les exécutions exec (passerelle + bac à sable uniquement).
- `tools.exec.safeBins` : binaires sûrs stdin uniquement qui peuvent s'exécuter sans entrées de liste autorisée explicites. Pour les détails sur le comportement, voir [Bacs à sable (Safe bins)](/fr/tools/exec-approvals-advanced#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs` : répertoires explicites supplémentaires de confiance pour les vérifications de chemin `safeBins`. Les entrées `PATH` ne sont jamais automatiquement approuvées. Les valeurs par défaut intégrées sont `/bin` et `/usr/bin`.
- `tools.exec.safeBinProfiles` : stratégie argv personnalisée facultative par bac à sable sûr (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

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

### Gestion de PATH

- `host=gateway` : fusionne votre `PATH` de shell de connexion dans l'environnement d'exécution. Les remplacements de `env.PATH` sont
  rejetés pour l'exécution sur l'hôte. Le démon lui-même continue de fonctionner avec un `PATH` minimal :
  - macOS : `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux : `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox` : exécute `sh -lc` (login shell) à l'intérieur du conteneur, donc `/etc/profile` peut réinitialiser `PATH`.
  OpenClaw ajoute `env.PATH` en préfixe après le chargement du profil via une variable d'environnement interne (pas d'interpolation de shell) ;
  `tools.exec.pathPrepend` s'applique également ici.
- `host=node` : seules les substitutions d'environnement non bloquées que vous envoyez sont transmises au nœud. Les substitutions `env.PATH` sont
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

`/exec` n'est honoré que pour les **expéditeurs autorisés** (listes d'autorisation de canaux/appairage plus `commands.useAccessGroups`).
Il met à jour **uniquement l'état de la session** et n'écrit pas la configuration. Pour désactiver définitivement exec, refusez-le via la stratégie de
tool (`tools.deny: ["exec"]` ou par agent). Les approbations de l'hôte s'appliquent toujours sauf si vous définissez explicitement
`security=full` et `ask=off`.

## Approbations Exec (application compagnon / hôte de nœud)

Les agents en mode bac à sable (Sandboxed) peuvent nécessiter une approbation par requête avant que `exec` ne s'exécute sur la passerelle ou l'hôte de nœud.
Voir [Approbations Exec](/fr/tools/exec-approvals) pour la stratégie, la liste d'autorisation et le flux de l'interface.

Lorsque des approbations sont requises, l'outil d'exécution (exec tool) renvoie immédiatement
`status: "approval-pending"` et un identifiant d'approbation. Une fois approuvé (ou refusé / expiré),
le Gateway émet des événements système (`Exec finished` / `Exec denied`). Si la commande est toujours
en cours d'exécution après `tools.exec.approvalRunningNoticeMs`, un seul avis `Exec running` est émis.
Sur les canaux avec des cartes/boutons d'approbation natifs, l'agent doit s'appuyer sur cette
interface native en premier et inclure uniquement une commande `/approve` manuelle lorsque le résultat de l'outil
indique explicitement que les approbations par chat sont indisponibles ou que l'approbation manuelle est le
seul chemin possible.

## Liste d'autorisation + bins sécurisés

L'application manuelle de la liste d'autorisation correspond aux globs de chemin binaires résolus et aux globs de noms de commande nus.
Les noms nus ne correspondent qu'aux commandes invoquées via PATH, donc `rg` peut correspondre à
`/opt/homebrew/bin/rg` lorsque la commande est `rg`, mais pas `./rg` ou `/tmp/rg`.
Lorsque `security=allowlist`, les commandes shell sont automatiquement autorisées uniquement si chaque segment
de pipeline est sur la liste d'autorisation ou est un bin sécurisé. Les chaînages (`;`, `&&`, `||`) et les redirections
sont rejetés en mode liste d'autorisation, sauf si chaque segment de niveau supérieur satisfait la
liste d'autorisation (y compris les bins sécurisés). Les redirections restent non prises en charge.
La confiance durable `allow-always` ne contourne pas cette règle : une commande chaînée exige toujours que chaque
segment de niveau supérieur corresponde.

`autoAllowSkills` est un chemin de commodité distinct dans les approbations d'exécution. Ce n'est pas la même chose que
les entrées manuelles de liste d'autorisation de chemins. Pour une confiance explicite stricte, gardez `autoAllowSkills` désactivé.

Utilisez les deux contrôles pour des tâches différentes :

- `tools.exec.safeBins` : petits filtres de flux stdin uniquement.
- `tools.exec.safeBinTrustedDirs` : répertoires de confiance supplémentaires explicites pour les chemins exécutables de bins sécurisés.
- `tools.exec.safeBinProfiles` : stratégie argv explicite pour les bins sécurisés personnalisés.
- allowlist : confiance explicite pour les chemins exécutables.

Ne traitez pas `safeBins` comme une liste d'autorisation générique, et n'ajoutez pas de binaires d'interpréteur/d'exécution (par exemple `python3`, `node`, `ruby`, `bash`). Si vous en avez besoin, utilisez des entrées de liste d'autorisation explicites et gardez les invites d'approbation activées.
`openclaw security audit` avertit lorsque les entrées d'interpréteur/d'exécution `safeBins` manquent de profils explicites, et `openclaw doctor --fix` peut générer des entrées `safeBinProfiles` personnalisées manquantes.
`openclaw security audit` et `openclaw doctor` avertissent également lorsque vous ajoutez explicitement des bacs à large comportement tels que `jq` dans `safeBins`.
Si vous autorisez explicitement les interpréteurs, activez `tools.exec.strictInlineEval` afin que les formes d'évaluation de code en ligne nécessitent toujours une nouvelle approbation.

Pour plus de détails sur la politique et des exemples, consultez [Approbations Exec](/fr/tools/exec-approvals-advanced#safe-bins-stdin-only) et [Bacs sécurisés versus liste d'autorisation](/fr/tools/exec-approvals-advanced#safe-bins-versus-allowlist).

## Exemples

Premier plan :

```json
{ "tool": "exec", "command": "ls -la" }
```

Arrière-plan + interrogation :

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

L'interrogation est pour l'état à la demande, pas pour les boucles d'attente. Si le réveil automatique de l'achèvement est
activé, la commande peut réveiller la session lorsqu'elle émet une sortie ou échoue.

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

`apply_patch` est un sous-outil de `exec` pour les modifications structurées multi-fichiers.
Il est activé par défaut pour les modèles OpenAI et OpenAI Codex. Utilisez la configuration uniquement
lorsque vous souhaitez le désactiver ou le restreindre à des modèles spécifiques :

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
- La politique d'outil s'applique toujours ; `allow: ["write"]` autorise implicitement `apply_patch`.
- La configuration se trouve sous `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` par défaut est `true` ; définissez-le sur `false` pour désactiver l'outil pour les modèles OpenAI.
- `tools.exec.applyPatch.workspaceOnly` est défini par défaut sur `true` (limité à l'espace de travail). Définissez-le sur `false` uniquement si vous souhaitez volontairement que `apply_patch` écrive ou supprime en dehors du répertoire de l'espace de travail.

## Connexe

- [Exec Approvals](/fr/tools/exec-approvals) — barrières d'approbation pour les commandes shell
- [Sandboxing](/fr/gateway/sandboxing) — exécution de commandes dans des environnements sandboxed
- [Background Process](/fr/gateway/background-process) — tool d'exécution et de processus longs
- [Security](/fr/gateway/security) — stratégie de tool et accès élevé
