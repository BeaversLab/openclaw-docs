---
summary: "Utilisation de l'outil Exec, modes stdin et support TTY"
read_when:
  - Using or modifying the exec tool
  - Debugging stdin or TTY behavior
title: "Outil Exec"
---

# Outil Exec

Exécutez des commandes shell dans l'espace de travail. Prend en charge l'exécution en premier plan et en arrière-plan via `process`.
Si `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
Les sessions d'arrière-plan sont limitées par agent ; `process` ne voit que les sessions du même agent.

## Paramètres

- `command` (requis)
- `workdir` (par défaut cwd)
- `env` (remplacements clé/valeur)
- `yieldMs` (défaut 10000) : arrière-plan automatique après délai
- `background` (bool) : arrière-plan immédiat
- `timeout` (secondes, défaut 1800) : tuer à l'expiration
- `pty` (bool) : exécuter dans un pseudo-terminal si disponible (CLI TTY uniquement, agents de codage, interfaces utilisateur terminal)
- `host` (`auto | sandbox | gateway | node`) : où exécuter
- `security` (`deny | allowlist | full`) : mode d'application pour `gateway`/`node`
- `ask` (`off | on-miss | always`) : invites d'approbation pour `gateway`/`node`
- `node` (chaîne) : id/nom du nœud pour `host=node`
- `elevated` (bool) : demander le mode élevé (échapper du bac à sable vers le chemin d'hôte configuré) ; `security=full` n'est forcé que lorsque élevé est résolu à `full`

Notes :

- `host` par défaut à `auto` : sandbox lorsque le runtime de sandboxing est actif pour la session, sinon passerelle.
- `auto` est la stratégie de routage par défaut, et non un caractère générique. Le `host=node` par appel est autorisé à partir de `auto` ; le `host=gateway` par appel n'est autorisé que lorsqu'aucun runtime de bac à sable n'est actif.
- Sans configuration supplémentaire, `host=auto` fonctionne « tout simplement » : l'absence de bac à sable signifie qu'il est résolu à `gateway` ; un bac à sable actif signifie qu'il reste dans le bac à sable.
- `elevated` permet d'échapper du bac à sable vers le chemin d'hôte configuré : `gateway` par défaut, ou `node` lorsque `tools.exec.host=node` (ou la valeur par défaut de la session est `host=node`). Il n'est disponible que lorsque l'accès élevé est activé pour la session/provider actuelle.
- Les approbations `gateway`/`node` sont contrôlées par `~/.openclaw/exec-approvals.json`.
- `node` nécessite un nœud appairé (application compagnon ou hôte de nœud sans interface).
- Si plusieurs nœuds sont disponibles, définissez `exec.node` ou `tools.exec.node` pour en sélectionner un.
- `exec host=node` est le seul chemin d'exécution de shell pour les nœuds ; l'enveloppe héritée `nodes.run` a été supprimée.
- Sur les hôtes non Windows, exec utilise `SHELL` s'il est défini ; si `SHELL` est `fish`, il préfère `bash` (ou `sh`)
  à partir de `PATH` pour éviter les scripts incompatibles avec fish, puis revient à `SHELL` si aucun des deux n'existe.
- Sur les hôtes Windows, exec privilégie la découverte de PowerShell 7 (`pwsh`) (Program Files, ProgramW6432, puis PATH),
  puis revient à Windows PowerShell 5.1.
- L'exécution sur l'hôte (`gateway`/`node`) rejette `env.PATH` et les remplacements du chargeur (`LD_*`/`DYLD_*`) pour
  prévenir le détournement de binaire ou l'injection de code.
- OpenClaw définit `OPENCLAW_SHELL=exec` dans l'environnement de la commande générée (y compris pour l'exécution PTY et le bac à sable) afin que les règles de shell/profil puissent détecter le contexte de l'outil d'exécution.
- Important : le sandboxing est **désactivé par défaut**. Si le sandboxing est désactivé, `host=auto`
  implicite est résolu en `gateway`. `host=sandbox` explicite échoue toujours fermement au lieu de s'exécuter
  silencieusement sur l'hôte de la passerelle. Activez le sandboxing ou utilisez `host=gateway` avec des approbations.
- Les vérifications préalables de script (pour les erreurs courantes de syntaxe de shell Python/Node) n'inspectent que les fichiers à l'intérieur de
  la limite effective `workdir`. Si un chemin de script est résolu à l'extérieur de `workdir`, la vérification préalable est ignorée pour
  ce fichier.
- Pour les tâches de longue durée qui commencent maintenant, lancez-les une seule fois et comptez sur le réveil automatique
  de fin lorsqu'il est activé et que la commande émet une sortie ou échoue.
  Utilisez `process` pour les journaux, le statut, la saisie ou l'intervention ; n'émulez pas
  la planification avec des boucles de sleep, des boucles de timeout ou des interrogations répétées.
- Pour les tâches qui doivent se produire plus tard ou selon un calendrier, utilisez cron au lieu des
  modèles de sleep/delay `exec`.

## Config

- `tools.exec.notifyOnExit` (par défaut : true) : quand true, les sessions d'exécution en arrière-plan mettent en file d'attente un événement système et demandent un battement de cœur à la sortie.
- `tools.exec.approvalRunningNoticeMs` (par défaut : 10000) : émet un seul avis « en cours d'exécution » lorsqu'une exec soumise à approbation dure plus longtemps que cette durée (0 désactive).
- `tools.exec.host` (par défaut : `auto` ; résout en `sandbox` lorsque le runtime de bac à sable est actif, `gateway` sinon)
- `tools.exec.security` (par défaut : `deny` pour le bac à sable, `full` pour la passerelle + le nœud si non défini)
- `tools.exec.ask` (par défaut : `off`)
- L'exécution hôte sans approbation est la valeur par défaut pour la passerelle et le nœud. Si vous souhaitez un comportement d'approbations/de liste d'autorisation, renforcez à la fois `tools.exec.*` et l'hôte `~/.openclaw/exec-approvals.json` ; voir [Exec approvals](/en/tools/exec-approvals#no-approval-yolo-mode).
- Le mode YOLO provient des valeurs par défaut de la stratégie hôte (`security=full`, `ask=off`), et non de `host=auto`. Si vous souhaitez forcer le routage via la passerelle ou le nœud, définissez `tools.exec.host` ou utilisez `/exec host=...`.
- En mode `security=full` plus `ask=off`, l'exécution hôte suit directement la stratégie configurée ; il n'y a pas de préfiltre heuristique d'obfuscation de commande supplémentaire.
- `tools.exec.node` (par défaut : non défini)
- `tools.exec.strictInlineEval` (par défaut : false) : si vrai, les formes d'évaluation de l'interpréteur en ligne telles que `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` et `osascript -e` nécessitent toujours une approbation explicite. `allow-always` peut toujours conserver les appels bénins d'interpréteur/de script, mais les formes d'évaluation en ligne demandent toujours une confirmation à chaque fois.
- `tools.exec.pathPrepend` : liste des répertoires à préfixer à `PATH` pour les exécutions exec (passerelle + bac à sable uniquement).
- `tools.exec.safeBins` : binaires sécurisés stdin uniquement qui peuvent s'exécuter sans entrées explicites de liste d'autorisation. Pour plus de détails sur le comportement, voir [Safe bins](/en/tools/exec-approvals#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs` : répertoires explicites supplémentaires approuvés pour les vérifications de chemin `safeBins`. Les entrées `PATH` ne sont jamais automatiquement approuvées. Les valeurs par défaut intégrées sont `/bin` et `/usr/bin`.
- `tools.exec.safeBinProfiles` : stratégie argv personnalisée facultative par bac à sable sécurisé (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

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

- `host=gateway` : fusionne votre `PATH` de login-shell dans l'environnement exec. Les remplacements de `env.PATH` sont
  rejetés pour l'exécution sur l'hôte. Le démon lui-même s'exécute toujours avec un `PATH` minimal :
  - macOS : `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux : `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox` : exécute `sh -lc` (login shell) à l'intérieur du conteneur, donc `/etc/profile` peut réinitialiser `PATH`.
  OpenClaw préfixe `env.PATH` après le chargement du profil via une variable d'environnement interne (pas d'interpolation shell) ;
  `tools.exec.pathPrepend` s'applique également ici.
- `host=node` : seules les substitutions d'environnement non bloquées que vous envoyez sont transmises au nœud. Les remplacements de `env.PATH` sont
  rejetés pour l'exécution sur l'hôte et ignorés par les hôtes de nœud. Si vous avez besoin d'entrées PATH supplémentaires sur un nœud,
  configurez l'environnement du service d'hôte de nœud (systemd/launchd) ou installez les outils dans des emplacements standards.

Liaison de nœud par agent (utilisez l'index de la liste des agents dans la configuration) :

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Interface de contrôle : l'onglet Nœuds comprend un petit panneau « Liaison de nœud Exec » pour les mêmes paramètres.

## Remplacements de session (`/exec`)

Utilisez `/exec` pour définir des valeurs par défaut **par session** pour `host`, `security`, `ask` et `node`.
Envoyez `/exec` sans arguments pour afficher les valeurs actuelles.

Exemple :

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## Modèle d'autorisation

`/exec` n'est honoré que pour les **expéditeurs autorisés** (listes d'autorisation/appariement de chaîne ainsi que `commands.useAccessGroups`).
Il met à jour **uniquement l'état de la session** et n'écrit pas la configuration. Pour désactiver strictement exec, refusez-le via la stratégie de tool
(`tools.deny: ["exec"]` ou par agent). Les approbations de l'hôte s'appliquent toujours, sauf si vous définissez explicitement
`security=full` et `ask=off`.

## Approbations Exec (application compagnon / hôte de nœud)

Les agents Sandboxed peuvent exiger une approbation par requête avant que `exec` ne s'exécute sur la passerelle ou l'hôte de nœud.
Voir [Approbations Exec](/en/tools/exec-approvals) pour la stratégie, la liste d'autorisation et le flux de l'interface utilisateur.

Lorsque des approbations sont requises, l'outil d'exécution renvoie immédiatement `status: "approval-pending"` et un identifiant d'approbation. Une fois approuvé (ou refusé / expiré),
le Gateway émet des événements système (`Exec finished` / `Exec denied`). Si la commande est toujours
en cours d'exécution après `tools.exec.approvalRunningNoticeMs`, un seul avis `Exec running` est émis.
Sur les canaux avec des cartes/boutons d'approbation natifs, l'agent doit d'abord s'appuyer sur cette
interface utilisateur native et inclure une commande manuelle `/approve` uniquement lorsque le résultat de l'outil
indique explicitement que les approbations de chat sont indisponibles ou que l'approbation manuelle est le
seul chemin possible.

## Liste d'autorisation + bacs sûrs

L'application manuelle de la liste d'autorisation correspond **uniquement aux chemins binaires résolus** (aucune correspondance de nom de base). Lorsque
`security=allowlist`, les commandes shell sont automatiquement autorisées uniquement si chaque segment de pipeline est
sur la liste d'autorisation ou est un bac sûr. Le chaînage (`;`, `&&`, `||`) et les redirections sont rejetés en
mode liste d'autorisation à moins que chaque segment de premier niveau ne satisfasse la liste d'autorisation (y compris les bacs sûrs).
Les redirections restent non prises en charge.
La confiance durable `allow-always` ne contourne pas cette règle : une commande chaînée exige toujours que chaque
segment de premier niveau corresponde.

`autoAllowSkills` est un chemin de commodité distinct dans les approbations d'exécution. Ce n'est pas la même chose que
les entrées manuelles de liste d'autorisation de chemins. Pour une confiance explicite stricte, gardez `autoAllowSkills` désactivé.

Utilisez les deux contrôles pour différentes tâches :

- `tools.exec.safeBins` : petits filtres de flux stdin uniquement.
- `tools.exec.safeBinTrustedDirs` : répertoires approuvés supplémentaires explicites pour les chemins exécutables de bac sûr.
- `tools.exec.safeBinProfiles` : stratégie argv explicite pour les bacs sûrs personnalisés.
- allowlist : confiance explicite pour les chemins exécutables.

Ne traitez pas `safeBins` comme une liste d'autorisation générique, et n'ajoutez pas de binaires d'interpréteur/de runtime (par exemple `python3`, `node`, `ruby`, `bash`). Si vous en avez besoin, utilisez des entrées de liste d'autorisation explicites et gardez les invites d'approbation activées.
`openclaw security audit` avertit lorsque les entrées d'interpréteur/runtime `safeBins` manquent de profils explicites, et `openclaw doctor --fix` peut échafauder les entrées `safeBinProfiles` personnalisées manquantes.
`openclaw security audit` et `openclaw doctor` avertissent également lorsque vous ajoutez explicitement des bins à comportement large tels que `jq` dans `safeBins`.
Si vous autorisez explicitement les interpréteurs, activez `tools.exec.strictInlineEval` pour que les formulaires d'évaluation de code en ligne nécessitent toujours une nouvelle approbation.

Pour les détails complets de la politique et des exemples, consultez [Approbations Exec](/en/tools/exec-approvals#safe-bins-stdin-only) et [Bins sûrs par rapport à la liste d'autorisation](/en/tools/exec-approvals#safe-bins-versus-allowlist).

## Exemples

Premier plan :

```json
{ "tool": "exec", "command": "ls -la" }
```

Arrière-plan + sondage :

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>"}
```

Le sondage est destiné à l'état à la demande, et non aux boucles d'attente. Si le réveil automatique à l'achèvement
est activé, la commande peut réveiller la session lorsqu'elle émet une sortie ou échoue.

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
Il est activé par défaut pour les modèles OpenAI et OpenAI Codex. N'utilisez la configuration que
lorsque vous souhaitez le désactiver ou le restreindre à des modèles spécifiques :

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.4"] },
    },
  },
}
```

Remarques :

- Disponible uniquement pour les modèles OpenAI/OpenAI Codex.
- La politique de l'outil s'applique toujours ; `allow: ["write"]` autorise implicitement `apply_patch`.
- La configuration se trouve sous `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` est par défaut `true` ; définissez-le sur `false` pour désactiver l'outil pour les modèles OpenAI.
- `tools.exec.applyPatch.workspaceOnly` est défini par défaut sur `true` (contenu dans l'espace de travail). Définissez-le sur `false` uniquement si vous souhaitez explicitement que `apply_patch` écrive/supprime en dehors du répertoire de l'espace de travail.

## Connexes

- [Exec Approvals](/en/tools/exec-approvals) — portes d'approbation pour les commandes shell
- [Sandboxing](/en/gateway/sandboxing) — exécution de commandes dans des environnements isolés (sandboxed)
- [Background Process](/en/gateway/background-process) — tool d'exécution et de processus longue durée
- [Security](/en/gateway/security) — stratégie de tool et accès élevé
