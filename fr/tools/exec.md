---
summary: "Utilisation de l'outil Exec, modes stdin et prise en charge TTY"
read_when:
  - Utilisation ou modification de l'outil exec
  - Débogage du comportement stdin ou TTY
title: "Exec Tool"
---

# Outil Exec

Exécuter des commandes shell dans l'espace de travail. Prend en charge l'exécution en premier plan et en arrière-plan via `process`.
Si `process` n'est pas autorisé, `exec` s'exécute de manière synchrone et ignore `yieldMs`/`background`.
Les sessions en arrière-plan sont délimitées par agent ; `process` ne voit que les sessions du même agent.

## Paramètres

- `command` (requis)
- `workdir` (par défaut cwd)
- `env` (remplacements clé/valeur)
- `yieldMs` (par défaut 10000) : passage automatique en arrière-plan après le délai
- `background` (bool) : passage immédiat en arrière-plan
- `timeout` (secondes, par défaut 1800) : tuer à l'expiration
- `pty` (bool) : exécuter dans un pseudo-terminal lorsque disponible (CLI TTY uniquement, agents de codage, interfaces utilisateur terminal)
- `host` (`sandbox | gateway | node`) : où exécuter
- `security` (`deny | allowlist | full`) : mode d'application pour `gateway`/`node`
- `ask` (`off | on-miss | always`) : invites d'approbation pour `gateway`/`node`
- `node` (chaîne) : id/nom du nœud pour `host=node`
- `elevated` (bool) : demander le mode élevé (hôte de passerelle) ; `security=full` n'est forcé que lorsque élevé est résolu à `full`

Notes :

- `host` est `sandbox` par défaut.
- `elevated` est ignoré lorsque le sandboxing est désactivé (exec s'exécute déjà sur l'hôte).
- Les approbations `gateway`/`node` sont contrôlées par `~/.openclaw/exec-approvals.json`.
- `node` nécessite un nœud couplé (application compagnon ou hôte de nœud sans tête).
- Si plusieurs nœuds sont disponibles, définissez `exec.node` ou `tools.exec.node` pour en sélectionner un.
- Sur les hôtes non-Windows, exec utilise `SHELL` s'il est défini ; si `SHELL` est `fish`, il préfère `bash` (ou `sh`)
  depuis `PATH` pour éviter les scripts incompatibles avec fish, puis revient à `SHELL` si aucun n'existe.
- Sur les hôtes Windows, exec préfère la découverte de PowerShell 7 (`pwsh`) (Program Files, ProgramW6432, puis PATH),
  puis revient à Windows PowerShell 5.1.
- L'exécution sur l'hôte (`gateway`/`node`) rejette `env.PATH` et les remplacements du chargeur (`LD_*`/`DYLD_*`) pour
  empêcher le détournement de binaire ou l'injection de code.
- OpenClaw définit `OPENCLAW_SHELL=exec` dans l'environnement de commande généré (y compris pour l'exécution PTY et sandbox) afin que les règles de shell/profil puissent détecter le contexte de l'outil exec.
- Important : le sandboxing est **désactivé par défaut**. Si le sandboxing est désactivé et que `host=sandbox` est explicitement
  configuré/demandé, exec échoue désormais de manière fermée au lieu de s'exécuter silencieusement sur l'hôte de la passerelle.
  Activez le sandboxing ou utilisez `host=gateway` avec des approbations.
- Les vérifications préalables des scripts (pour les erreurs courantes de syntaxe shell Python/Node) n'inspectent que les fichiers à l'intérieur de
  la limite effective `workdir`. Si un chemin de script se résout en dehors de `workdir`, la vérification préalable est ignorée pour
  ce fichier.

## Config

- `tools.exec.notifyOnExit` (par défaut : true) : si true, les sessions exec en arrière-plan mettent en file d'attente un événement système et demandent un battement de cœur à la sortie.
- `tools.exec.approvalRunningNoticeMs` (par défaut : 10000) : émet une unique notification « en cours d'exécution » lorsqu'un exec soumis à approbation s'exécute plus longtemps que cette durée (0 désactive).
- `tools.exec.host` (par défaut : `sandbox`)
- `tools.exec.security` (par défaut : `deny` pour le sandbox, `allowlist` pour la passerelle + le nœud si non défini)
- `tools.exec.ask` (par défaut : `on-miss`)
- `tools.exec.node` (par défaut : non défini)
- `tools.exec.pathPrepend` : liste des répertoires à préfixer à `PATH` pour les exécutions exec (passerelle + bac à sable uniquement).
- `tools.exec.safeBins` : binaires sécurisés stdin uniquement pouvant s'exécuter sans entrées de liste autorisée explicites. Pour plus de détails sur le comportement, consultez [Safe bins](/fr/tools/exec-approvals#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs` : répertoires explicites supplémentaires approuvés pour les vérifications de chemin `safeBins`. Les entrées `PATH` ne sont jamais approuvées automatiquement. Les valeurs par défaut intégrées sont `/bin` et `/usr/bin`.
- `tools.exec.safeBinProfiles` : stratégie argv personnalisée facultative par binaires sécurisés (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

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

- `host=gateway` : fusionne votre `PATH` de shell de connexion dans l'environnement d'exécution. Les remplacements `env.PATH` sont
  rejetés pour l'exécution sur l'hôte. Le démon s'exécute toujours avec un `PATH` minimal :
  - macOS : `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux : `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox` : exécute `sh -lc` (shell de connexion) à l'intérieur du conteneur, donc `/etc/profile` peut réinitialiser `PATH`.
  OpenClaw préfixe `env.PATH` après le sourçage du profil via une variable d'environnement interne (sans interpolation du shell) ;
  `tools.exec.pathPrepend` s'applique également ici.
- `host=node` : seuls les remplacements d'environnement non bloqués que vous transmettez sont envoyés au nœud. Les remplacements `env.PATH` sont
  rejetés pour l'exécution sur l'hôte et ignorés par les hôtes de nœud. Si vous avez besoin d'entrées PATH supplémentaires sur un nœud,
  configurez l'environnement du service hôte de nœud (systemd/launchd) ou installez les outils dans des emplacements standard.

Liaison de nœud par agent (utilisez l'index de la liste des agents dans la configuration) :

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Contrôle de l'interface utilisateur : l'onglet Nœuds comprend un petit panneau « Liaison de nœud Exec » pour les mêmes paramètres.

## Remplacements de session (`/exec`)

Utilisez `/exec` pour définir les valeurs par défaut **par session** pour `host`, `security`, `ask` et `node`.
Envoyez `/exec` sans arguments pour afficher les valeurs actuelles.

Exemple :

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## Modèle d'autorisation

`/exec` n'est respecté que pour les **expéditeurs autorisés** (listes d'autorisation de channel/appariement ainsi que `commands.useAccessGroups`).
Il met à jour **l'état de la session uniquement** et n'écrit pas la configuration. Pour désactiver définitivement l'exécution, refusez-la via la stratégie de tool
(`tools.deny: ["exec"]` ou par agent). Les approbations de l'hôte s'appliquent toujours, sauf si vous définissez explicitement
`security=full` et `ask=off`.

## Approbations d'exécution (application compagnon / hôte de nœud)

Les agents Sandboxed peuvent nécessiter une approbation par demande avant que `exec` ne s'exécute sur la passerelle ou l'hôte de nœud.
Voir [Exec approvals](/fr/tools/exec-approvals) pour la stratégie, la liste d'autorisation et le flux de l'interface utilisateur.

Lorsque des approbations sont requises, l'outil d'exécution retourne immédiatement
`status: "approval-pending"` et un identifiant d'approbation. Une fois approuvé (ou refusé / expiré),
le Gateway émet des événements système (`Exec finished` / `Exec denied`). Si la commande est toujours
en cours d'exécution après `tools.exec.approvalRunningNoticeMs`, un seul avis `Exec running` est émis.

## Liste d'autorisation + bins sûrs

L'application manuelle de la liste d'autorisation correspond **uniquement aux chemins binaires résolus** (aucune correspondance sur le nom de base). Lorsque
`security=allowlist`, les commandes shell sont automatiquement autorisées uniquement si chaque segment du pipeline est
sur la liste d'autorisation ou est un bin sûr. Les chaînes (`;`, `&&`, `||`) et les redirections sont rejetées en
mode liste d'autorisation, sauf si chaque segment de premier niveau satisfait la liste d'autorisation (y compris les bins sûrs).
Les redirections restent non prises en charge.

`autoAllowSkills` est un chemin de commodité distinct dans les approbations exec. Ce n'est pas la même chose que
les entrées manuelles de liste d'autorisation (allowlist). Pour une confiance explicite stricte, gardez `autoAllowSkills` désactivé.

Utilisez les deux contrôles pour des tâches différentes :

- `tools.exec.safeBins` : petits filtres de flux stdin uniquement.
- `tools.exec.safeBinTrustedDirs` : répertoires supplémentaires explicitement approuvés pour les chemins d'exécutables safe-bin.
- `tools.exec.safeBinProfiles` : stratégie argv explicite pour les safe-bins personnalisés.
- allowlist : confiance explicite pour les chemins d'exécutables.

Ne traitez pas `safeBins` comme une liste d'autorisation générique, et n'ajoutez pas de binaires d'interpréteur/runtime (par exemple `python3`, `node`, `ruby`, `bash`). Si vous en avez besoin, utilisez des entrées explicites de liste d'autorisation et gardez les invites d'approbation activées.
`openclaw security audit` avertit lorsque les entrées `safeBins` d'interpréteur/runtime n'ont pas de profils explicites, et `openclaw doctor --fix` peut générer des entrées personnalisées `safeBinProfiles` manquantes.

Pour plus de détails sur la stratégie et des exemples, consultez [Approbations exec](/fr/tools/exec-approvals#safe-bins-stdin-only) et [Safe bins par rapport à la liste d'autorisation](/fr/tools/exec-approvals#safe-bins-versus-allowlist).

## Exemples

Premier plan :

```json
{ "tool": "exec", "command": "ls -la" }
```

Arrière-plan + interroger (poll) :

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

## apply_patch (expérimental)

`apply_patch` est un sous-outil de `exec` pour les modifications multi-fichiers structurées.
Activez-le explicitement :

```json5
{
  tools: {
    exec: {
      applyPatch: { enabled: true, workspaceOnly: true, allowModels: ["gpt-5.2"] },
    },
  },
}
```

Remarques :

- Disponible uniquement pour les modèles OpenAI/OpenAI Codex.
- La stratégie d'outil s'applique toujours ; `allow: ["exec"]` autorise implicitement `apply_patch`.
- La configuration se trouve sous `tools.exec.applyPatch`.
- `tools.exec.applyPatch.workspaceOnly` est par défaut `true` (contenu dans l'espace de travail). Définissez-le sur `false` uniquement si vous souhaitez intentionnellement que `apply_patch` écrive/supprime en dehors du répertoire de l'espace de travail.

import fr from "/components/footer/fr.mdx";

<fr />
