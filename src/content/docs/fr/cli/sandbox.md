---
summary: "Gérer les runtimes du Sandbox et inspecter la stratégie effective du Sandbox"
title: Sandbox CLI
read_when: "Vous gérez des runtimes de bac à sable ou vous déboguez le comportement de la stratégie de bac à sable/tool."
status: active
---

Gérer les runtimes du Sandbox pour l'exécution isolée des agents.

## Vue d'ensemble

OpenClaw peut exécuter des agents dans des runtimes de Sandbox isolés pour la sécurité. Les commandes `sandbox` vous aident à inspecter et recréer ces runtimes après des mises à jour ou des changements de configuration.

Aujourd'hui, cela signifie généralement :

- Conteneurs de Sandbox Docker
- Runtimes de Sandbox SSH lorsque `agents.defaults.sandbox.backend = "ssh"`
- Runtimes de Sandbox OpenShell lorsque `agents.defaults.sandbox.backend = "openshell"`

Pour `ssh` et OpenShell `remote`, la recréation est plus importante qu'avec Docker :

- l'espace de travail distant est canonique après l'initialisation initiale
- `openclaw sandbox recreate` supprime cet espace de travail distant canonique pour la portée sélectionnée
- la prochaine utilisation le réinitialise à partir de l'espace de travail local actuel

## Commandes

### `openclaw sandbox explain`

Inspecter le mode/la portée/l'accès à l'espace de travail **effectif** du Sandbox, la stratégie des outils du Sandbox, et les portes élevées (avec les chemins des clés de configuration de réparation).

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

Lister tous les runtimes du Sandbox avec leur statut et leur configuration.

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**La sortie inclut :**

- Nom et statut du runtime
- Backend (`docker`, `openshell`, etc.)
- Libellé de la configuration et indique si elle correspond à la configuration actuelle
- Âge (temps écoulé depuis la création)
- Temps d'inactivité (temps écoulé depuis la dernière utilisation)
- Session/agent associé

### `openclaw sandbox recreate`

Supprimer les runtimes du Sandbox pour forcer leur recréation avec une configuration mise à jour.

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**Options :**

- `--all` : Recréer tous les conteneurs du Sandbox
- `--session <key>` : Recréer le conteneur pour une session spécifique
- `--agent <id>` : Recréer les conteneurs pour un agent spécifique
- `--browser` : Recréer uniquement les conteneurs du navigateur
- `--force` : Ignorer l'invite de confirmation

<Note>Les runtimes sont automatiquement recréés lors de la prochaine utilisation de l'agent.</Note>

## Cas d'usage

### Après avoir mis à jour une image Docker

```bash
# Pull new image
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# Update config to use new image
# Edit config: agents.defaults.sandbox.docker.image (or agents.list[].sandbox.docker.image)

# Recreate containers
openclaw sandbox recreate --all
```

### Après avoir modifié la configuration du Sandbox

```bash
# Edit config: agents.defaults.sandbox.* (or agents.list[].sandbox.*)

# Recreate to apply new config
openclaw sandbox recreate --all
```

### Après avoir modifié la cible SSH ou le matériel d'authentification SSH

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - agents.defaults.sandbox.ssh.target
# - agents.defaults.sandbox.ssh.workspaceRoot
# - agents.defaults.sandbox.ssh.identityFile / certificateFile / knownHostsFile
# - agents.defaults.sandbox.ssh.identityData / certificateData / knownHostsData

openclaw sandbox recreate --all
```

Pour le backend principal `ssh`, la recréation supprime la racine de l'espace de travail distant par portée
sur la cible SSH. La prochaine exécution l'ensemence à nouveau à partir de l'espace de travail local.

### Après avoir modifié la source, la stratégie ou le mode OpenShell

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

Pour le mode OpenShell `remote`, la recréation supprime l'espace de travail distant canonique
pour cette portée. La prochaine exécution l'ensemence à nouveau à partir de l'espace de travail local.

### Après avoir modifié setupCommand

```bash
openclaw sandbox recreate --all
# or just one agent:
openclaw sandbox recreate --agent family
```

### Pour un agent spécifique uniquement

```bash
# Update only one agent's containers
openclaw sandbox recreate --agent alfred
```

## Pourquoi c'est nécessaire

Lorsque vous mettez à jour la configuration du Sandbox :

- Les runtimes existants continuent de fonctionner avec les anciens paramètres.
- Les runtimes ne sont supprimés qu'après 24h d'inactivité.
- Les agents utilisés régulièrement maintiennent les anciens runtimes actifs indéfiniment.

Utilisez `openclaw sandbox recreate` pour forcer la suppression des anciens runtimes. Ils sont recréés automatiquement avec les paramètres actuels lors de la prochaine nécessité.

<Tip>Privilégiez `openclaw sandbox recreate` par rapport au nettoyage manuel spécifique au backend. Il utilise le registre des runtimes du Gateway et évite les incohérences lorsque les clés de portée ou de session changent.</Tip>

## Migration du registre

OpenClaw stocke les métadonnées du runtime de sandbox sous forme d'un fragment JSON par entrée conteneur/navigateur dans le répertoire d'état de la sandbox. Les installations plus anciennes peuvent encore posséder des fichiers monolithiques hérités :

- `~/.openclaw/sandbox/containers.json`
- `~/.openclaw/sandbox/browsers.json`

Les lectures régulières du runtime de sandbox ne réécrivent pas ces fichiers. Exécutez `openclaw doctor --fix` pour migrer les entrées héritées valides vers les répertoires du registre partitionné. Les fichiers hérités non valides sont mis en quarantaine afin qu'un ancien registre corrompu ne puisse pas masquer les entrées du runtime actuel.

## Configuration

Les paramètres de la sandbox se trouvent dans `~/.openclaw/openclaw.json` sous `agents.defaults.sandbox` (les redéfinitions par agent se trouvent dans `agents.list[].sandbox`) :

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "backend": "docker", // docker, ssh, openshell
        "scope": "agent", // session, agent, shared
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... more Docker options
        },
        "prune": {
          "idleHours": 24, // Auto-prune after 24h idle
          "maxAgeDays": 7, // Auto-prune after 7 days
        },
      },
    },
  },
}
```

## Connexes

- [Référence CLI](/fr/cli)
- [Sandboxing](/fr/gateway/sandboxing)
- [Espace de travail de l'agent](/fr/concepts/agent-workspace)
- [Doctor](/fr/gateway/doctor) : vérifie la configuration de la sandbox.
