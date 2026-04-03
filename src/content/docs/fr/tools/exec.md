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
- `elevated` (bool) : demander le mode élevé (hôte passerelle) ; `security=full` n'est forcé que lorsque élevé est résolu à `full`

Notes :

- `host` par défaut à `auto` : sandbox lorsque le runtime de sandboxing est actif pour la session, sinon passerelle.
- `elevated` force `host=gateway` ; il n'est disponible que lorsque l'accès élevé est activé pour la session/provider actuelle.
- Les approbations `gateway`/`node` sont contrôlées par `~/.openclaw/exec-approvals.json`.
- `node` nécessite un nœud apparié (application compagnon ou hôte de nœud sans tête).
- Si plusieurs nœuds sont disponibles, définissez `exec.node` ou `tools.exec.node` pour en sélectionner un.
- `exec host=node` est le seul chemin d'exécution de shell pour les nœuds ; le wrapper legacy `nodes.run` a été supprimé.
- Sur les hôtes non Windows, exec utilise `SHELL` si défini ; si `SHELL` est `fish`, il privilégie `bash` (ou `sh`)
  depuis `PATH` pour éviter les scripts incompatibles avec fish, puis revient à `SHELL` si aucun n'existe.
- Sur les hôtes Windows, exec privilégie la découverte de PowerShell 7 (`pwsh`) (Program Files, ProgramW6432, puis PATH),
  puis revient à Windows PowerShell 5.1.
- L'exécution sur l'hôte (`gateway`/`node`) rejette `env.PATH` et les substitutions de chargeur (`LD_*`/`DYLD_*`) pour
  prévenir le détournement de binaire ou l'injection de code.
- OpenClaw définit `OPENCLAW_SHELL=exec` dans l'environnement de commande généré (y compris l'exécution PTY et sandbox) afin que les règles de shell/profil puissent détecter le contexte de l'outil d'exécution.
- Important : le sandboxing est **désactivé par défaut**. Si le sandboxing est désactivé, `host=auto`
  implicite est résolu en `gateway`. `host=sandbox` explicite échoue toujours fermement au lieu de s'exécuter
  silencieusement sur l'hôte de la passerelle. Activez le sandboxing ou utilisez `host=gateway` avec des approbations.
- Les contrôles de pré-vol des scripts (pour les erreurs courantes de syntaxe shell Python/Node) n'inspectent que les fichiers à l'intérieur de la limite effective `workdir`. Si un chemin de script se résout en dehors de `workdir`, le pré-vol est ignoré pour ce fichier.

## Config

- `tools.exec.notifyOnExit` (par défaut : true) : lorsque true, les sessions d'exécution en arrière-plan mettent en file d'attente un événement système et demandent un heartbeat à la sortie.
- `tools.exec.approvalRunningNoticeMs` (par défaut : 10000) : émet une seule notification « en cours d'exécution » lorsqu'une exec soumise à approbation s'exécute plus longtemps que cette durée (0 désactive).
- `tools.exec.host` (par défaut : `auto` ; se résout en `sandbox` lorsque le runtime sandbox est actif, `gateway` sinon)
- `tools.exec.security` (par défaut : `deny` pour le sandbox, `allowlist` pour la passerelle + le nœud si non défini)
- `tools.exec.ask` (par défaut : `on-miss`)
- `tools.exec.node` (par défaut : non défini)
- `tools.exec.strictInlineEval` (par défaut : false) : lorsque true, les formulaires d'évaluation de l'interpréteur en ligne tels que `python -c`, `node -e`, `ruby -e`, `perl -e`, `php -r`, `lua -e` et `osascript -e` nécessitent toujours une approbation explicite. `allow-always` peut toujours conserver les appels bénins d'interpréteur/script, mais les formulaires d'évaluation en ligne demandent toujours chaque fois.
- `tools.exec.pathPrepend` : liste des répertoires à ajouter au début de `PATH` pour les exécutions exec (passerelle + sandbox uniquement).
- `tools.exec.safeBins` : binaires sûrs stdin-only qui peuvent s'exécuter sans entrées de liste d'autorisation explicites. Pour plus de détails sur le comportement, consultez [Safe bins](/en/tools/exec-approvals#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs` : répertoires explicites supplémentaires approuvés pour les vérifications de chemin `safeBins`. Les entrées `PATH` ne sont jamais automatiquement approuvées. Les valeurs par défaut intégrées sont `/bin` et `/usr/bin`.
- `tools.exec.safeBinProfiles` : politique argv personnalisée optionnelle par binaire sécurisé (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

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

- `host=gateway` : fusionne votre `PATH` de shell de connexion dans l'environnement d'exécution. Les substitutions de `env.PATH`
  sont rejetées pour l'exécution sur l'hôte. Le démon lui-même s'exécute toujours avec un `PATH` minimal :
  - macOS : `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux : `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox` : exécute `sh -lc` (shell de connexion) à l'intérieur du conteneur, donc `/etc/profile` peut réinitialiser `PATH`.
  OpenClaw ajoute en préfixe `env.PATH` après le sourçage du profil via une variable d'environnement interne (pas d'interpolation par le shell) ;
  `tools.exec.pathPrepend` s'applique également ici.
- `host=node` : seules les substitutions d'environnement non bloquées que vous transmettez sont envoyées au nœud. Les substitutions de `env.PATH`
  sont rejetées pour l'exécution sur l'hôte et ignorées par les hôtes de nœud. Si vous avez besoin d'entrées PATH supplémentaires sur un nœud,
  configurez l'environnement du service hôte de nœud (systemd/launchd) ou installez les outils dans des emplacements standards.

Liaison de nœud par agent (utilisez l'index de la liste des agents dans la configuration) :

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Interface de contrôle : l'onglet Nœuds comprend un petit panneau « Liaison de nœud d'exécution » pour les mêmes paramètres.

## Substitutions de session (`/exec`)

Utilisez `/exec` pour définir des valeurs par défaut **par session** pour `host`, `security`, `ask` et `node`.
Envoyez `/exec` sans arguments pour afficher les valeurs actuelles.

Exemple :

```
/exec host=auto security=allowlist ask=on-miss node=mac-1
```

## Modèle d'autorisation

`/exec` n'est honoré que pour les **expéditeurs autorisés** (listes d'autorisation de channel/appairage plus `commands.useAccessGroups`).
Il met à jour **uniquement l'état de la session** et n'écrit pas la configuration. Pour désactiver définitivement exec, refusez-le via la stratégie de tool
(`tools.deny: ["exec"]` ou par agent). Les approbations de l'hôte s'appliquent toujours, sauf si vous définissez explicitement
`security=full` et `ask=off`.

## Approbations Exec (application compagnon / hôte de nœud)

Les agents sandboxed peuvent nécessiter une approbation par requête avant que `exec` ne s'exécute sur la passerelle ou l'hôte de nœud.
Voir [Exec approvals](/en/tools/exec-approvals) pour la stratégie, la liste d'autorisation et le flux de l'interface utilisateur.

Lorsque des approbations sont requises, l'outil exec renvoie immédiatement
`status: "approval-pending"` et un identifiant d'approbation. Une fois approuvé (ou refusé / expiré),
le Gateway émet des événements système (`Exec finished` / `Exec denied`). Si la commande est toujours
en cours d'exécution après `tools.exec.approvalRunningNoticeMs`, un seul avis `Exec running` est émis.

## Liste d'autorisation + bins sûrs

L'application manuelle de la liste d'autorisation correspond **uniquement aux chemins binaires résolus** (pas de correspondances sur le nom de base). Lorsque
`security=allowlist`, les commandes shell sont automatiquement autorisées uniquement si chaque segment de pipeline est
sur la liste d'autorisation ou est un bin sûr. Le chaînage (`;`, `&&`, `||`) et les redirections sont rejetés en
mode liste d'autorisation, sauf si chaque segment de premier niveau satisfait la liste d'autorisation (y compris les bins sûrs).
Les redirections restent non prises en charge.

`autoAllowSkills` est un chemin de commodité distinct dans les approbations exec. Ce n'est pas la même chose que
les entrées manuelles de la liste d'autorisation de chemins. Pour une confiance explicite stricte, gardez `autoAllowSkills` désactivé.

Utilisez les deux contrôles pour différentes tâches :

- `tools.exec.safeBins` : petits filtres de flux stdin uniquement.
- `tools.exec.safeBinTrustedDirs` : répertoires de confiance supplémentaires explicites pour les chemins exécutables de bin sûr.
- `tools.exec.safeBinProfiles` : stratégie argv explicite pour les bins sûrs personnalisés.
- allowlist : confiance explicite pour les chemins exécutables.

Ne traitez pas `safeBins` comme une liste d'autorisation générique, et n'ajoutez pas de binaires d'interpréteur/d'exécution (par exemple `python3`, `node`, `ruby`, `bash`). Si vous en avez besoin, utilisez des entrées de liste d'autorisation explicites et gardez les invites d'approbation activées.
`openclaw security audit` avertit lorsque les entrées d'interpréteur/d'exécution `safeBins` manquent de profils explicites, et `openclaw doctor --fix` peut générer des entrées `safeBinProfiles` personnalisées manquantes.
`openclaw security audit` et `openclaw doctor` avertissent également lorsque vous ajoutez explicitement des binaires à comportement large tels que `jq` dans `safeBins`.
Si vous autorisez explicitement des interpréteurs, activez `tools.exec.strictInlineEval` pour que les formulaires d'évaluation de code en ligne nécessitent toujours une nouvelle approbation.

Pour plus de détails et d'exemples sur la politique, consultez [Exec approvals](/en/tools/exec-approvals#safe-bins-stdin-only) et [Safe bins versus allowlist](/en/tools/exec-approvals#safe-bins-versus-allowlist).

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
Il est activé par défaut pour les modèles OpenAI et OpenAI Codex. N'utilisez la configuration que
lorsque vous souhaitez le désactiver ou le restreindre à des modèles spécifiques :

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-5.2"] },
    },
  },
}
```

Remarques :

- Disponible uniquement pour les modèles OpenAI/OpenAI Codex.
- La stratégie d'outil s'applique toujours ; `allow: ["write"]` autorise implicitement `apply_patch`.
- La configuration se trouve sous `tools.exec.applyPatch`.
- `tools.exec.applyPatch.enabled` est défini par défaut sur `true` ; définissez-le sur `false` pour désactiver l'outil pour les modèles OpenAI.
- `tools.exec.applyPatch.workspaceOnly` est défini par défaut sur `true` (contenu dans l'espace de travail). Définissez-le sur `false` uniquement si vous souhaitez intentionnellement que `apply_patch` écrive/supprime en dehors du répertoire de l'espace de travail.

## Connexes

- [Exec Approvals](/en/tools/exec-approvals) — portes d'approbation pour les commandes shell
- [Sandboxing](/en/gateway/sandboxing) — exécution de commandes dans des environnements sandboxed
- [Background Process](/en/gateway/background-process) — tool d'exécution et de processus longue durée
- [Security](/en/gateway/security) — stratégie de tool et accès élevé
