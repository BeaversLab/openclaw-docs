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
- `host` (`sandbox | gateway | node`) : où exécuter
- `security` (`deny | allowlist | full`) : mode d'application pour `gateway`/`node`
- `ask` (`off | on-miss | always`) : invites d'approbation pour `gateway`/`node`
- `node` (chaîne) : id/nom du nœud pour `host=node`
- `elevated` (bool) : demander le mode élevé (hôte passerelle) ; `security=full` n'est forcé que lorsque élevé est résolu à `full`

Notes :

- `host` par défaut `sandbox`.
- `elevated` est ignoré lorsque le sandboxing est désactivé (exec s'exécute déjà sur l'hôte).
- Les approbations `gateway`/`node` sont contrôlées par `~/.openclaw/exec-approvals.json`.
- `node` nécessite un nœud couplé (application compagnon ou hôte de nœud sans interface).
- Si plusieurs nœuds sont disponibles, définissez `exec.node` ou `tools.exec.node` pour en sélectionner un.
- Sur les hôtes non Windows, exec utilise `SHELL` s'il est défini ; si `SHELL` est `fish`, il privilégie `bash` (ou `sh`)
  depuis `PATH` pour éviter les scripts incompatibles avec fish, puis revient à `SHELL` si aucun n'existe.
- Sur les hôtes Windows, exec privilégie la découverte de PowerShell 7 (`pwsh`) (Program Files, ProgramW6432, puis PATH),
  puis revient à Windows PowerShell 5.1.
- L'exécution sur l'hôte (`gateway`/`node`) rejette `env.PATH` et les remplacements du chargeur (`LD_*`/`DYLD_*`) pour
  empêcher le détournement de binaires ou l'injection de code.
- OpenClaw définit `OPENCLAW_SHELL=exec` dans l'environnement de commande généré (y compris l'exécution PTY et sandbox) afin que les règles de shell/profil puissent détecter le contexte exec-tool.
- Important : le sandboxing est **désactivé par défaut**. Si le sandboxing est désactivé et que `host=sandbox` est explicitement
  configuré/demandé, exec échoue désormais en mode fermé au lieu de s'exécuter silencieusement sur l'hôte de la passerelle.
  Activez le sandboxing ou utilisez `host=gateway` avec des approbations.
- Les vérifications préalables de script (pour les erreurs courantes de syntaxe shell Python/Node) inspectent uniquement les fichiers à l'intérieur de
  la limite `workdir` effective. Si un chemin de script résout en dehors de `workdir`, la vérification préalable est ignorée pour
  ce fichier.

## Config

- `tools.exec.notifyOnExit` (par défaut : true) : si true, les sessions exec en arrière-plan mettent en file d'attente un événement système et demandent un heartbeat à la sortie.
- `tools.exec.approvalRunningNoticeMs` (par défaut : 10000) : émet un avis unique « en cours d'exécution » lorsqu'une exec soumise à approbation s'exécute plus longtemps que cette durée (0 désactive).
- `tools.exec.host` (par défaut `sandbox`)
- `tools.exec.security` (par défaut `deny` pour le bac à sable, `allowlist` pour la passerelle + le nœud si non défini)
- `tools.exec.ask` (par défaut `on-miss`)
- `tools.exec.node` (par défaut non défini)
- `tools.exec.pathPrepend` : liste des répertoires à ajouter en tête de `PATH` pour les exécutions exec (passerelle + bac à sable uniquement).
- `tools.exec.safeBins` : binaires sécurisés stdin-only qui peuvent s'exécuter sans entrées de liste d'autorisation explicites. Pour plus de détails sur le comportement, consultez [Safe bins](/fr/tools/exec-approvals#safe-bins-stdin-only).
- `tools.exec.safeBinTrustedDirs` : répertoires explicites supplémentaires approuvés pour les vérifications de chemin `safeBins`. Les entrées `PATH` ne sont jamais automatiquement approuvées. Les valeurs par défaut intégrées sont `/bin` et `/usr/bin`.
- `tools.exec.safeBinProfiles` : stratégie argv personnalisée optionnelle par binaire sécurisé (`minPositional`, `maxPositional`, `allowedValueFlags`, `deniedFlags`).

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

- `host=gateway` : fusionne votre `PATH` de shell de connexion dans l'environnement exec. Les remplacements de `env.PATH` sont
  rejetés pour l'exécution sur l'hôte. Le démon lui-même s'exécute toujours avec un `PATH` minimal :
  - macOS : `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux : `/usr/local/bin`, `/usr/bin`, `/bin`
- `host=sandbox` : exécute `sh -lc` (login shell) à l'intérieur du conteneur, donc `/etc/profile` peut réinitialiser `PATH`.
  OpenClaw ajoute `env.PATH` après le sourçage du profil via une env var interne (pas d'interpolation shell) ;
  `tools.exec.pathPrepend` s'applique également ici.
- `host=node` : seules les substitutions d'env non bloquées que vous envoyez sont transmises au nœud. Les substitutions `env.PATH` sont
  rejetées pour l'exécution hôte et ignorées par les hôtes de nœud. Si vous avez besoin d'entrées PATH supplémentaires sur un nœud,
  configurez l'environnement du service hôte de nœud (systemd/launchd) ou installez les outils dans des emplacements standards.

Liaison de nœud par agent (utiliser l'index de la liste des agents dans la configuration) :

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

Interface de contrôle : l'onglet Nœuds comprend un petit panneau « Liaison de nœud Exec » pour les mêmes paramètres.

## Substitutions de session (`/exec`)

Utilisez `/exec` pour définir des valeurs par défaut **par session** pour `host`, `security`, `ask` et `node`.
Envoyez `/exec` sans arguments pour afficher les valeurs actuelles.

Exemple :

```
/exec host=gateway security=allowlist ask=on-miss node=mac-1
```

## Modèle d'autorisation

`/exec` n'est honoré que pour les **expéditeurs autorisés** (listes de canaux/appairages plus `commands.useAccessGroups`).
Il met à jour **uniquement l'état de session** et n'écrit pas la configuration. Pour désactiver définitivement exec, refusez-le via la stratégie d'outil
(`tools.deny: ["exec"]` ou par agent). Les approbations de l'hôte s'appliquent toujours sauf si vous définissez explicitement
`security=full` et `ask=off`.

## Approbations Exec (application compagnon / hôte de nœud)

Les agents en bac à sable peuvent exiger une approbation par demande avant que `exec` ne s'exécute sur la passerelle ou l'hôte de nœud.
Voir [Approbations Exec](/fr/tools/exec-approvals) pour la stratégie, la liste d'autorisation et le flux de l'interface.

Lorsque des approbations sont requises, l'exec tool renvoie immédiatement
`status: "approval-pending"` et un identifiant d'approbation. Une fois approuvé (ou refusé / expiré),
le Gateway émet des événements système (`Exec finished` / `Exec denied`). Si la commande est toujours
en cours d'exécution après `tools.exec.approvalRunningNoticeMs`, un seul avis `Exec running` est émis.

## Liste d'autorisation + bins sûrs

L'application manuelle de la liste d'autorisation correspond **uniquement aux chemins binaires résolus** (aucune correspondance sur le nom de base). Lorsque
`security=allowlist`, les commandes shell sont automatiquement autorisées uniquement si chaque segment de pipeline est
sur la liste d'autorisation ou un bin sûr. Le chaînage (`;`, `&&`, `||`) et les redirections sont rejetés en
mode liste d'autorisation, sauf si chaque segment de niveau supérieur satisfait à la liste d'autorisation (y compris les bins sûrs).
Les redirections restent non prises en charge.

`autoAllowSkills` est un chemin de commodité distinct dans les approbations d'exécution. Ce n'est pas la même chose que
les entrées manuelles de liste d'autorisation de chemins. Pour une confiance explicite stricte, gardez `autoAllowSkills` désactivé.

Utilisez les deux contrôles pour différentes tâches :

- `tools.exec.safeBins` : petits filtres de flux stdin uniquement.
- `tools.exec.safeBinTrustedDirs` : répertoires supplémentaires explicitement approuvés pour les chemins exécutables de bins sûrs.
- `tools.exec.safeBinProfiles` : stratégie argv explicite pour les bins sûrs personnalisés.
- allowlist : confiance explicite pour les chemins exécutables.

Ne traitez pas `safeBins` comme une liste d'autorisation générique, et n'ajoutez pas de binaires d'interpréteur/d'exécution (par exemple `python3`, `node`, `ruby`, `bash`). Si vous en avez besoin, utilisez des entrées de liste d'autorisation explicites et gardez les invites d'approbation activées.
`openclaw security audit` avertit lorsque les entrées d'interpréteur/d'exécution `safeBins` manquent de profils explicites, et `openclaw doctor --fix` peut générer des entrées `safeBinProfiles` personnalisées manquantes.

Pour plus de détails sur la politique et des exemples, consultez [Approbations Exec](/fr/tools/exec-approvals#safe-bins-stdin-only) et [Bins sécurisés par rapport à la liste d'autorisation](/fr/tools/exec-approvals#safe-bins-versus-allowlist).

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

`apply_patch` est un sous-outil de `exec` pour les modifications structurées multi-fichiers.
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
- La stratégie de l'outil s'applique toujours ; `allow: ["exec"]` autorise implicitement `apply_patch`.
- La configuration se trouve sous `tools.exec.applyPatch`.
- `tools.exec.applyPatch.workspaceOnly` est défini par défaut sur `true` (contenu dans l'espace de travail). Définissez-le sur `false` uniquement si vous souhaitez intentionnellement que `apply_patch` écrive/supprime en dehors du répertoire de l'espace de travail.

import fr from "/components/footer/fr.mdx";

<fr />
