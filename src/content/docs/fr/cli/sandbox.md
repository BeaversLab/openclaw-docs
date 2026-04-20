---
title: Sandbox CLI
summary: "Gérez les runtimes de bac à sable et inspectez la stratégie de bac à sable effective"
read_when: "Vous gérez des runtimes de bac à sable ou vous déboguez le comportement de la stratégie de bac à sable/tool."
status: active
---

# Sandbox CLI

Gérez les runtimes de bac à sable pour l'exécution isolée des agents.

## Overview

OpenClaw peut exécuter des agents dans des runtimes de bac à sable isolés pour la sécurité. Les commandes `sandbox` vous aident à inspecter et recréer ces runtimes après des mises à jour ou des modifications de configuration.

Aujourd'hui, cela signifie généralement :

- Conteneurs de bac à sable Docker
- Runtimes de bac à sable SSH lorsque `agents.defaults.sandbox.backend = "ssh"`
- Runtimes de bac à sable OpenShell lorsque `agents.defaults.sandbox.backend = "openshell"`

Pour `ssh` et OpenShell `remote`, la recréation est plus importante qu'avec Docker :

- l'espace de travail distant est canonique après l'amorçage initial
- `openclaw sandbox recreate` supprime cet espace de travail distant canonique pour la portée sélectionnée
- la prochaine utilisation l'amorce à nouveau à partir de l'espace de travail local actuel

## Commandes

### `openclaw sandbox explain`

Inspectez le mode/la portée/l'accès à l'espace de travail de bac à sable **effectif**, la stratégie d'outil de bac à sable et les portées élevées (avec les chemins de clé de configuration de réparation).

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

Listez tous les runtimes de bac à sable avec leur statut et leur configuration.

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**La sortie comprend :**

- Nom et statut du runtime
- Backend (`docker`, `openshell`, etc.)
- Libellé de configuration et s'il correspond à la configuration actuelle
- Âge (temps écoulé depuis la création)
- Temps d'inactivité (temps écoulé depuis la dernière utilisation)
- Session/agent associé

### `openclaw sandbox recreate`

Supprimez les runtimes de bac à sable pour forcer leur recréation avec une configuration mise à jour.

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**Options :**

- `--all` : Recréer tous les conteneurs de bac à sable
- `--session <key>` : Recréer le conteneur pour une session spécifique
- `--agent <id>` : Recréer les conteneurs pour un agent spécifique
- `--browser` : Recréer uniquement les conteneurs de navigateur
- `--force` : Ignorer l'invite de confirmation

**Important :** Les runtimes sont automatiquement recréés lors de la prochaine utilisation de l'agent.

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

### Après avoir modifié la configuration du bac à sable

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

Pour le backend principal `ssh`, recreate supprime la racine de l'espace de travail distant par portée sur la cible SSH. La prochaine exécution l'ensemence à nouveau à partir de l'espace de travail local.

### Après avoir modifié la source, la stratégie ou le mode d'OpenShell

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

Pour le mode `remote` d'OpenShell, recreate supprime l'espace de travail distant canonique pour cette portée. La prochaine exécution l'ensemence à nouveau à partir de l'espace de travail local.

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

## Pourquoi est-ce nécessaire ?

**Problème :** Lorsque vous mettez à jour la configuration du bac à sable :

- Les runtimes existants continuent de fonctionner avec les anciens paramètres
- Les runtimes ne sont supprimés qu'après 24h d'inactivité
- Les agents utilisés régulièrement gardent les anciens runtimes actifs indéfiniment

**Solution :** Utilisez `openclaw sandbox recreate` pour forcer la suppression des anciens runtimes. Ils seront recréés automatiquement avec les paramètres actuels lors de la prochaine utilisation.

Astuce : préférez `openclaw sandbox recreate` au nettoyage manuel spécifique au backend.
Il utilise le registre des runtimes du Gateway et évite les inadéquations lorsque les clés de portée/session changent.

## Configuration

Les paramètres du bac à sable se trouvent dans `~/.openclaw/openclaw.json` sous `agents.defaults.sandbox` (les remplacements par agent vont dans `agents.list[].sandbox`) :

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

## Voir aussi

- [Documentation Sandbox](/fr/gateway/sandboxing)
- [Configuration de l'agent](/fr/concepts/agent-workspace)
- [Commande Doctor](/fr/gateway/doctor) - Vérifier la configuration du bac à sable
