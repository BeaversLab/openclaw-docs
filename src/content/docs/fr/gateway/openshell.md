---
title: OpenShell
summary: "Utilisez OpenShell en tant que backend de bac à sable géré pour les agents OpenClaw"
read_when:
  - You want cloud-managed sandboxes instead of local Docker
  - You are setting up the OpenShell plugin
  - You need to choose between mirror and remote workspace modes
---

# OpenShell

OpenShell est un backend de bac à sable géré pour OpenClaw. Au lieu d'exécuter des conteneurs Docker en local, OpenClaw délègue le cycle de vie du bac à sable au `openshell` CLI, qui provisionne des environnements distants avec une exécution de commandes basée sur SSH.

Le plugin OpenShell réutilise le même transport SSH de base et le même pont de système de fichiers distant que le [backend SSH générique](/fr/gateway/sandboxing#ssh-backend). Il ajoute un cycle de vie spécifique à OpenShell (`sandbox create/get/delete`, `sandbox ssh-config`) et un mode d'espace de travail `mirror` facultatif.

## Prérequis

- Le `openshell` CLI installé et sur le `PATH` (ou définissez un chemin personnalisé via
  `plugins.entries.openshell.config.command`)
- Un compte OpenShell avec accès au bac à sable
- OpenClaw Gateway exécuté sur l'hôte

## Quick start

1. Activez le plugin et définissez le backend de bac à sable :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
        },
      },
    },
  },
}
```

2. Redémarrez la Gateway. Au prochain tour de l'agent, OpenClaw crée un bac à sable OpenShell et achemine l'exécution des outils via celui-ci.

3. Vérifiez :

```bash
openclaw sandbox list
openclaw sandbox explain
```

## Modes d'espace de travail

C'est la décision la plus importante lors de l'utilisation d'OpenShell.

### `mirror`

Utilisez `plugins.entries.openshell.config.mode: "mirror"` lorsque vous voulez que **l'espace de travail local reste canonique**.

Comportement :

- Avant `exec`, OpenClaw synchronise l'espace de travail local dans le bac à sable OpenShell.
- Après `exec`, OpenClaw synchronise l'espace de travail distant vers l'espace de travail local.
- Les outils de fichiers fonctionnent toujours via le pont du bac à sable, mais l'espace de travail local reste la source de vérité entre les tours.

Idéal pour :

- Vous modifiez des fichiers localement en dehors de OpenClaw et souhaitez que ces modifications soient visibles dans le bac à sable automatiquement.
- Vous voulez que le bac à sable OpenShell se comporte autant que possible comme le backend Docker.
- Vous voulez que l'espace de travail de l'hôte reflète les écritures du bac à sable après chaque tour d'exécution.

Compromis : coût de synchronisation supplémentaire avant et après chaque exécution.

### `remote`

Utilisez `plugins.entries.openshell.config.mode: "remote"` lorsque vous voulez que **l'espace de travail OpenShell devienne canonique**.

Comportement :

- Lorsque le bac à sable est créé pour la première fois, OpenClaw ensemence l'espace de travail distant à partir de l'espace de travail local une seule fois.
- Après cela, `exec`, `read`, `write`, `edit` et `apply_patch` opèrent
  directement sur l'espace de travail OpenShell distant.
- OpenClaw ne synchronise **pas** les modifications distantes dans l'espace de travail local.
- Les lectures de médias au moment de l'invite fonctionnent toujours car les outils de fichiers et de médias lisent via
  le pont Sandbox.

Idéal pour :

- Le Sandbox doit résider principalement du côté distant.
- Vous souhaitez une charge de synchronisation par tour inférieure.
- Vous ne voulez pas que les modifications locales écrasent silencieusement l'état du Sandbox distant.

Important : si vous modifiez des fichiers sur l'hôte en dehors de OpenClaw après l'ensemencement initial,
le Sandbox distant ne voit **pas** ces modifications. Utilisez
`openclaw sandbox recreate` pour ré-ensemencer.

### Choisir un mode

|                                      | `mirror`                                     | `remote`                             |
| ------------------------------------ | -------------------------------------------- | ------------------------------------ |
| **Espace de travail canonique**      | Hôte local                                   | OpenShell distant                    |
| **Sens de la synchronisation**       | Bidirectionnelle (chaque exec)               | Ensemencement unique                 |
| **Charge par tour**                  | Plus élevée (téléchargement + téléversement) | Plus faible (ops distantes directes) |
| **Modifications locales visibles ?** | Oui, au prochain exec                        | Non, jusqu'à la recréation           |
| **Idéal pour**                       | Flux de travail de développement             | Agents longue durée, CI              |

## Référence de configuration

Toute la configuration OpenShell se trouve sous `plugins.entries.openshell.config` :

| Clé                       | Type                     | Par défaut    | Description                                                                         |
| ------------------------- | ------------------------ | ------------- | ----------------------------------------------------------------------------------- |
| `mode`                    | `"mirror"` ou `"remote"` | `"mirror"`    | Mode de synchronisation de l'espace de travail                                      |
| `command`                 | `string`                 | `"openshell"` | Chemin ou nom du `openshell` CLI                                                    |
| `from`                    | `string`                 | `"openclaw"`  | Source du Sandbox pour la première création                                         |
| `gateway`                 | `string`                 | —             | Nom de la passerelle OpenShell (`--gateway`)                                        |
| `gatewayEndpoint`         | `string`                 | —             | URL du point de terminaison de la passerelle OpenShell (`--gateway-endpoint`)       |
| `policy`                  | `string`                 | —             | ID de stratégie OpenShell pour la création de Sandbox                               |
| `providers`               | `string[]`               | `[]`          | Noms des fournisseurs à attacher lors de la création du sandbox                     |
| `gpu`                     | `boolean`                | `false`       | Demander des ressources GPU                                                         |
| `autoProviders`           | `boolean`                | `true`        | Passer `--auto-providers` lors de la création du sandbox                            |
| `remoteWorkspaceDir`      | `string`                 | `"/sandbox"`  | Espace de travail principal accessible en écriture dans le sandbox                  |
| `remoteAgentWorkspaceDir` | `string`                 | `"/agent"`    | Chemin de montage de l'espace de travail de l'agent (pour l'accès en lecture seule) |
| `timeoutSeconds`          | `number`                 | `120`         | Délai d'expiration pour les opérations de la CLI `openshell`                        |

Les paramètres au niveau du sandbox (`mode`, `scope`, `workspaceAccess`) sont configurés sous
`agents.defaults.sandbox` comme pour tout backend. Voir
[Sandboxing](/fr/gateway/sandboxing) pour la matrice complète.

## Exemples

### Configuration minimale à distance

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
        },
      },
    },
  },
}
```

### Mode miroir avec GPU

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "agent",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "mirror",
          gpu: true,
          providers: ["openai"],
          timeoutSeconds: 180,
        },
      },
    },
  },
}
```

### OpenShell par agent avec passerelle personnalisée

```json5
{
  agents: {
    defaults: {
      sandbox: { mode: "off" },
    },
    list: [
      {
        id: "researcher",
        sandbox: {
          mode: "all",
          backend: "openshell",
          scope: "agent",
          workspaceAccess: "rw",
        },
      },
    ],
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote",
          gateway: "lab",
          gatewayEndpoint: "https://lab.example",
          policy: "strict",
        },
      },
    },
  },
}
```

## Gestion du cycle de vie

Les sandboxes OpenShell sont gérés via la CLI de sandbox normale :

```bash
# List all sandbox runtimes (Docker + OpenShell)
openclaw sandbox list

# Inspect effective policy
openclaw sandbox explain

# Recreate (deletes remote workspace, re-seeds on next use)
openclaw sandbox recreate --all
```

Pour le mode `remote`, **la recréation est particulièrement importante** : elle supprime l'espace de travail
distant canonique pour cette portée. La prochaine utilisation sème un nouvel espace de travail distant à partir de
l'espace de travail local.

Pour le mode `mirror`, la recréation réinitialise principalement l'environnement d'exécution distant car
l'espace de travail local reste canonique.

### Quand recréer

Recréer après avoir modifié l'un de ces éléments :

- `agents.defaults.sandbox.backend`
- `plugins.entries.openshell.config.from`
- `plugins.entries.openshell.config.mode`
- `plugins.entries.openshell.config.policy`

```bash
openclaw sandbox recreate --all
```

## Limitations actuelles

- Le navigateur de sandbox n'est pas pris en charge sur le backend OpenShell.
- `sandbox.docker.binds` ne s'applique pas à OpenShell.
- Les paramètres d'exécution spécifiques à Docker sous `sandbox.docker.*` s'appliquent uniquement au backend
  Docker.

## Fonctionnement

1. OpenClaw appelle `openshell sandbox create` (avec les indicateurs `--from`, `--gateway`,
   `--policy`, `--providers`, `--gpu` tels que configurés).
2. OpenClaw appelle `openshell sandbox ssh-config <name>` pour obtenir les détails de
   la connexion SSH pour le sandbox.
3. Core écrit la configuration SSH dans un fichier temporaire et ouvre une session SSH en utilisant le
   même pont de système de fichiers distant que le backend SSH générique.
4. En mode `mirror` : synchroniser le local vers le distant avant l'exécution, exécuter, puis resynchroniser après l'exécution.
5. En mode `remote` : initialiser une fois lors de la création, puis opérer directement sur
   l'espace de travail distant.

## Voir aussi

- [Sandboxing](/fr/gateway/sandboxing) -- modes, portées et comparaison des backends
- [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) -- débogage des outils bloqués
- [Multi-Agent Sandbox and Tools](/fr/tools/multi-agent-sandbox-tools) -- substitutions par agent
- [Sandbox CLI](/fr/cli/sandbox) -- commandes `openclaw sandbox`
