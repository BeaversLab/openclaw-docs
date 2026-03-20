---
title : Sandbox CLI
summary : « Gérer les runtimes de sandbox et inspecter la stratégie de sandbox effective »
read_when : « Vous gérez des runtimes de sandbox ou déboguez le comportement de la sandbox/de la stratégie d'outil. »
status : active
---

# Sandbox CLI

Gérer les runtimes de sandbox pour l'exécution isolée de l'agent.

## Vue d'ensemble

OpenClaw peut exécuter des agents dans des runtimes de sandbox isolés pour la sécurité. Les commandes `sandbox` vous aident à inspecter et recréer ces runtimes après des mises à jour ou des changements de configuration.

Aujourd'hui, cela signifie généralement :

- Conteneurs de sandbox Docker
- Runtimes de sandbox SSH lorsque `agents.defaults.sandbox.backend = "ssh"`
- Runtimes de sandbox OpenShell lorsque `agents.defaults.sandbox.backend = "openshell"`

Pour `ssh` et OpenShell `remote`, la recréation est plus importante qu'avec Docker :

- l'espace de travail distant est canonique après l'initialisation initiale
- `openclaw sandbox recreate` supprime cet espace de travail distant canonique pour l'étendue sélectionnée
- la prochaine utilisation le réinitialise à partir de l'espace de travail local actuel

## Commandes

### `openclaw sandbox explain`

Inspecter le mode/étendue/accès à l'espace de sandbox **effectif**, la stratégie d'outil de sandbox et les barrières élevées (avec les chemins de clé de configuration de correction).

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

Lister tous les runtimes de sandbox avec leur statut et leur configuration.

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**La sortie inclut :**

- Nom et statut du runtime
- Backend (`docker`, `openshell`, etc.)
- Label de configuration et correspondance avec la configuration actuelle
- Âge (temps écoulé depuis la création)
- Temps d'inactivité (temps écoulé depuis la dernière utilisation)
- Session/agent associé

### `openclaw sandbox recreate`

Supprimer les runtimes de sandbox pour forcer leur recréation avec la configuration mise à jour.

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**Options :**

- `--all` : Recréer tous les conteneurs de sandbox
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

### Après avoir modifié la configuration de la sandbox

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

Pour le backend principal `ssh`, recreation supprime la racine de l'espace de travail distant par portée
sur la cible SSH. L'exécution suivante la réensemence à partir de l'espace de travail local.

### Après modification de la source, de la stratégie ou du mode OpenShell

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

Pour le mode `remote` OpenShell, recreation supprime l'espace de travail distant canonique
pour cette portée. L'exécution suivante la réensemence à partir de l'espace de travail local.

### Après modification de setupCommand

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

**Problème :** Lorsque vous mettez à jour la configuration du Sandbox :

- Les runtimes existants continuent de s'exécuter avec les anciens paramètres
- Les runtimes sont uniquement supprimés après 24h d'inactivité
- Les agents utilisés régulièrement maintiennent les anciens runtimes en vie indéfiniment

**Solution :** Utilisez `openclaw sandbox recreate` pour forcer la suppression des anciens runtimes. Ils seront recréés automatiquement avec les paramètres actuels lors de la prochaine utilisation.

Conseil : préférez `openclaw sandbox recreate` au nettoyage manuel spécifique au backend.
Il utilise le registre des runtimes du Gateway et évite les incohérences lorsque les clés de portée/session changent.

## Configuration

Les paramètres du Sandbox se trouvent dans `~/.openclaw/openclaw.json` sous `agents.defaults.sandbox` (les substitutions par agent vont dans `agents.list[].sandbox`) :

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
- [Commande Doctor](/fr/gateway/doctor) - Vérifier la configuration du Sandbox

import en from "/components/footer/en.mdx";

<en />
