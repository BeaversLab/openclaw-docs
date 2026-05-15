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
  Mode d'application pour l'exécution `gateway` / `node`.
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
  Comportement de l'invite d'approbation pour l'exécution `gateway` / `node`.
</ParamField>

<ParamField path="node" type="string">
  ID/nom du nœud lorsque `host=node`.
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
  Demander le mode élevé — échapper du bac à sable vers le chemin d'hôte configuré. `security=full` est forcé uniquement lorsqu'élévé correspond à `full`.
</ParamField>

Notes :

- `host` correspond par défaut à `auto` : bac à sable lorsque le runtime de bac à sable est actif pour la session, sinon passerelle.
- `host` n'accepte que `auto`, `sandbox`, `gateway` ou `node`. Ce n'est pas un sélecteur de nom d'hôte ; les valeurs ressemblant à des noms d'hôte sont rejetées avant l'exécution de la commande.
- `auto` est la stratégie de routage par défaut, pas un caractère générique. `host=node` par appel est autorisé depuis `auto` ; `host=gateway` par appel n'est autorisé que lorsqu'aucun runtime de bac à sable n'est actif.
- Sans configuration supplémentaire, `host=auto` fonctionne toujours « tout seul » : l'absence de bac à sable signifie qu'il correspond à `gateway` ; un bac à sable actif signifie qu'il reste dans le bac à sable.
- `elevated` s'échappe du bac à sable vers le chemin d'hôte configuré : `gateway` par défaut, ou `node` lorsque `tools.exec.host=node` (ou la valeur par défaut de la session est `host=node`). Il n'est disponible que lorsque l'accès élevé est activé pour la session/provider actuelle.
- Les approbations `gateway`/`node` sont contrôlées par `~/.openclaw/exec-approvals.json`.
- `node` nécessite un nœud apparié (application compagnon ou hôte de nœud sans tête).
- Si plusieurs nœuds sont disponibles, définissez `exec.node` ou `tools.exec.node` pour en sélectionner un.
- `exec host=node` est le seul chemin d'exécution de shell pour les nœuds ; le wrapper obsolète `nodes.run` a été supprimé.
- `timeout` s'applique aux exécutions au premier plan, en arrière-plan, `yieldMs`, passerelle, bac à sable et nœud `system.run`OpenClaw. Si omis, OpenClaw utilise `tools.exec.timeoutSec` ; `timeout: 0` explicite désactive le délai d'expiration du processus exec pour cet appel.
- Sur les hôtes non Windows, exec utilise Windows`SHELL` lorsqu'il est défini ; si `SHELL` est `fish`, il préfère `bash` (ou `sh`)
  depuis `PATH` pour éviter les scripts incompatibles avec fish, puis revient à `SHELL` si aucun n'existe.
- Sur les hôtes Windows, exec privilégie la découverte de PowerShell 7 (Windows`pwsh`Windows) (Program Files, ProgramW6432, puis PATH),
  puis revient à Windows PowerShell 5.1.
- L'exécution sur l'hôte (`gateway`/`node`) rejette `env.PATH` et les remplacements du chargeur (`LD_*`/`DYLD_*`) pour
  empêcher le détournement de binaire ou l'injection de code.
- OpenClaw définit OpenClaw`OPENCLAW_SHELL=exec` dans l'environnement de commande généré (y compris l'exécution PTY et sandbox) afin que les règles shell/profil puissent détecter le contexte de l'outil exec.
- `openclaw channels login` est bloqué depuis `exec` car il s'agit d'un flux d'authentification de canal interactif ; exécutez-le dans un terminal sur l'hôte de passerelle, ou utilisez l'outil de connexion natif du canal depuis le chat lorsqu'il existe.
- Important : le sandboxing est **désactivé par défaut**. Si le sandboxing est désactivé, `host=auto` implicite
  est résolu en `gateway`. `host=sandbox` explicite échoue toujours (fermeture) au lieu de s'exécuter
  silencieusement sur l'hôte de passerelle. Activez le sandboxing ou utilisez `host=gateway` avec approbations.
- Les vérifications préalables de script (pour les erreurs courantes de syntaxe shell Python/Node) n'inspectent que les fichiers à l'intérieur de la
  limite effective `workdir`. Si un chemin de script se résout en dehors de `workdir`, la vérification préalable est ignorée pour
  ce fichier.
- Pour le travail de longue durée qui commence maintenant, lancez-le une seule fois et comptez sur le réveil automatique
  de la complétion lorsqu'il est activé et que la commande émet une sortie ou échoue.
  Utilisez `process` pour les journaux, le statut, la saisie ou l'intervention ; n'émulez pas
  la planification avec des boucles de sleep, des boucles de timeout ou des sondages répétés.
- Pour le travail qui doit se produire plus tard ou selon un calendrier, utilisez cron au lieu des
  modèles sleep/delay de `exec`.

## Config

- `tools.exec.notifyOnExit` (par défaut : true) : lorsque true, les sessions exec en arrière-plan mettent en file d'attente un événement système et demandent un heartbeat à la sortie.
- `tools.exec.approvalRunningNoticeMs` (par défaut : 10000) : émet un seul avis "en cours d'exécution" lorsqu'un exec soumis à approbation s'exécute plus longtemps que cette durée (0 désactive).
- `tools.exec.timeoutSec` (par défaut : 1800) : délai d'expiration exec par commande par défaut en secondes. `timeout` par appel le remplace ; `timeout: 0` par appel désactive le délai d'expiration du processus exec.
- `tools.exec.host` (par défaut : `auto` ; se résout en `sandbox` lorsque le runtime sandbox est actif, `gateway` sinon)
- `tools.exec.security` (par défaut : `deny` pour le sandbox, `full` pour la passerelle + le nœud si non défini)
- `tools.exec.ask` (par défaut : `off`)
- L'exécution sur l'hôte sans approbation est le comportement par défaut pour la passerelle et le nœud. Si vous souhaitez un comportement d'approbations/liste blanche, renforcez à la fois `tools.exec.*` et `~/.openclaw/exec-approvals.json` de l'hôte ; voir [Approbations Exec](/fr/tools/exec-approvals#yolo-mode-no-approval).
- Le mode YOLO provient des valeurs par défaut de la stratégie de l'hôte (`security=full`, `ask=off`), et non de `host=auto`. Si vous souhaitez forcer le routage via la passerelle ou le nœud, définissez `tools.exec.host` ou utilisez `/exec host=...`.
- En mode `security=full` plus `ask=off`, l'exécution sur l'hôte suit directement la stratégie configurée ; il n'y a pas de couche supplémentaire de préfiltrage heuristique d'obfuscation de commande ni de rejet préalable de script.
- `tools.exec.node` (par défaut : non défini)
- `tools.exec.strictInlineEval` (par défaut : false) : si true, les formes d'évaluation de l'interpréteur en ligne telles que `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` et `osascript -e` nécessitent toujours une approbation explicite. `allow-always` peut toujours conserver les appels bénins à l'interpréteur/aux scripts, mais les formes d'évaluation en ligne invitent toujours à chaque fois.
- `tools.exec.pathPrepend` : liste des répertoires à préfixer à `PATH` pour les exécutions exec (passerelle + sandbox uniquement).
- `tools.exec.safeBins` : binaires sécurisés stdin-only qui peuvent s'exécuter sans entrées explicites de liste blanche. Pour plus de détails sur le comportement, voir [Bacs sécurisés](/fr/tools/exec-approvals-advanced#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs` : répertoires supplémentaires explicitement approuvés pour les vérifications de chemin `safeBins`. Les entrées `PATH` ne sont jamais automatiquement approuvées. Les valeurs par défaut intégrées sont `/bin` et `/usr/bin`.
- `tools.exec.safeBinProfiles` : stratégie argv personnalisée facultative par binaire sûr (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

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

- `host=gateway` : fusionne votre `PATH` de shell de connexion dans l'environnement exec. Les `env.PATH` de remplacement sont
  rejetés pour l'exécution sur l'hôte. Le démon lui-même continue de s'exécuter avec un `PATH` minimal :
  - macOS : `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux : `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox` : exécute `sh -lc` (shell de connexion) à l'intérieur du conteneur, donc `/etc/profile` peut réinitialiser `PATH`.
  OpenClaw préfixe `env.PATH` après le chargement du profil via une env var interne (pas d'interpolation shell) ;
  `tools.exec.pathPrepend` s'applique ici aussi.
- `host=node` : seules les substitutions d'env non bloquées que vous transmettez sont envoyées au nœud. Les `env.PATH` de remplacement sont
  rejetés pour l'exécution sur l'hôte et ignorés par les hôtes de nœud. Si vous avez besoin d'entrées PATH supplémentaires sur un nœud,
  configurez l'environnement du service hôte de nœud (systemd/launchd) ou installez les outils dans des emplacements standards.

Liaison de nœud par agent (utilisez l'index de la liste des agents dans la config) :

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

`/exec` n'est honoré que pour les **expéditeurs autorisés** (listes d'autorisation de channel/appariement ainsi que `commands.useAccessGroups`).
Il met à jour **l'état de la session uniquement** et n'écrit pas la configuration. Pour désactiver définitivement exec, refusez-le via la stratégie de
outil (`tools.deny: ["exec"]` ou par agent). Les approbations de l'hôte s'appliquent toujours, sauf si vous définissez explicitement
`security=full` et `ask=off`.

## Approbations Exec (application compagnon / hôte de nœud)

Les agents en mode Sandboxed peuvent nécessiter une approbation par requête avant que `exec` ne s'exécute sur la passerelle ou l'hôte de nœud.
Voir [Approbations Exec](/fr/tools/exec-approvals) pour la stratégie, la liste d'autorisation et le flux de l'interface utilisateur.

Lorsque des approbations sont requises, l'outil exec retourne immédiatement avec
`status: "approval-pending"` et un identifiant d'approbation. Une fois approuvé (ou refusé / expiré),
le Gateway émet des événements système (`Exec finished` / `Exec denied`). Si la commande est toujours
en cours d'exécution après `tools.exec.approvalRunningNoticeMs`, une seule notification `Exec running` est émise.
Sur les canaux avec des cartes/boutons d'approbation natifs, l'agent doit d'abord s'appuyer sur cette
interface utilisateur native et inclure uniquement une commande manuelle `/approve` lorsque le résultat
de l'outil indique explicitement que les approbations par chat sont indisponibles ou que l'approbation manuelle est la
seule option.

## Liste d'autorisation + bins sûrs

L'application manuelle de la liste d'autorisation correspond aux globs de chemins binaires résolus et aux globs de noms de commandes simples. Les noms simples ne correspondent qu'aux commandes invoquées via PATH, donc `rg` peut correspondre à `/opt/homebrew/bin/rg` lorsque la commande est `rg`, mais pas à `./rg` ou `/tmp/rg`.
Lorsque `security=allowlist`, les commandes shell sont automatiquement autorisées uniquement si chaque segment de pipeline est sur la liste d'autorisation ou est un binaire sûr. Les chaînages (`;`, `&&`, `||`) et les redirections sont rejetés en mode liste d'autorisation, sauf si chaque segment de premier niveau satisfait la liste d'autorisation (y compris les binaires sûrs). Les redirections restent non prises en charge.
La confiance durable `allow-always` ne contourne pas cette règle : une commande chaînée nécessite toujours que chaque segment de premier niveau corresponde.

`autoAllowSkills` est un chemin de commodité distinct dans les approbations d'exécution. Ce n'est pas la même chose que les entrées manuelles de la liste d'autorisation de chemins. Pour une confiance explicite stricte, gardez `autoAllowSkills` désactivé.

Utilisez les deux contrôles pour des tâches différentes :

- `tools.exec.safeBins` : petits filtres de flux stdin uniquement.
- `tools.exec.safeBinTrustedDirs` : répertoires supplémentaires explicitement fiables pour les chemins d'exécutables de binaires sûrs.
- `tools.exec.safeBinProfiles` : stratégie argv explicite pour les binaires sûrs personnalisés.
- allowlist : confiance explicite pour les chemins d'exécutables.

Ne traitez pas `safeBins` comme une liste d'autorisation générique, et n'ajoutez pas de binaires d'interpréteur/de runtime (par exemple `python3`, `node`, `ruby`, `bash`). Si vous en avez besoin, utilisez des entrées explicites de liste d'autorisation et gardez les invites d'approbation activées.
`openclaw security audit` avertit lorsque les entrées d'interpréteur/de runtime `safeBins` manquent de profils explicites, et `openclaw doctor --fix` peut générer des entrées personnalisées `safeBinProfiles` manquantes.
`openclaw security audit` et `openclaw doctor` avertissent également lorsque vous ajoutez explicitement des bins à comportement étendu tels que `jq` dans `safeBins`.
Si vous autorisez explicitement des interpréteurs, activez `tools.exec.strictInlineEval` afin que les formes d'évaluation de code en ligne nécessitent toujours une nouvelle approbation.

Pour plus de détails sur la stratégie et des exemples, consultez [Exec approvals](/fr/tools/exec-approvals-advanced#safe-bins-stdin-only) et [Safe bins versus allowlist](/fr/tools/exec-approvals-advanced#safe-bins-versus-allowlist).

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

L'interrogation (polling) sert pour l'état à la demande, et non pour les boucles d'attente. Si le réveil automatique de complétion est activé, la commande peut réveiller la session lorsqu'elle émet une sortie ou échoue.

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
- La stratégie d'outil s'applique toujours ; `allow: ["write"]` autorise implicitement `apply_patch`.
- `deny: ["write"]` ne refuse pas `apply_patch`; refusez `apply_patch` explicitement ou utilisez `deny: ["group:fs"]` lorsque les écritures de correctifs doivent également être bloquées.
- La configuration se trouve sous `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` est `true` par défaut ; définissez-le sur `false` pour désactiver l'outil pour les modèles OpenAI.
- `tools.exec.applyPatch.workspaceOnly` est `true` par défaut (contenu dans l'espace de travail). Définissez-le sur `false` uniquement si vous voulez intentionnellement que `apply_patch` écrive/supprime en dehors du répertoire de l'espace de travail.

## Connexes

- [Exec Approvals](/fr/tools/exec-approvals) — portes d'approbation pour les commandes shell
- [Sandboxing](/fr/gateway/sandboxing) — exécution de commandes dans des environnements sandboxed
- [Background Process](/fr/gateway/background-process) — tool d'exécution et de processus longue durée
- [Security](/fr/gateway/security) — politique de tool et accès élevé
