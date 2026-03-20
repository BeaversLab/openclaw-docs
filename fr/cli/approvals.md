---
summary: "Référence CLI pour `openclaw approvals` (approbations exec pour les hôtes de passerelle ou de nœud)"
read_when:
  - Vous souhaitez modifier les approbations exec à partir de la CLI
  - Vous devez gérer les listes d'autorisation sur les hôtes de passerelle ou de nœud
title: "approvals"
---

# `openclaw approvals`

Gérer les approbations exec pour l'**hôte local**, l'**hôte de passerelle** ou un **hôte de nœud**.
Par défaut, les commandes ciblent le fichier d'approbations local sur le disque. Utilisez `--gateway` pour cibler la passerelle, ou `--node` pour cibler un nœud spécifique.

Connexe :

- Approbations exec : [Approbations exec](/fr/tools/exec-approvals)
- Nœuds : [Nœuds](/fr/nodes)

## Commandes courantes

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

## Remplacer les approbations à partir d'un fichier

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

## Assistants de liste d'autorisation

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## Remarques

- `--node` utilise le même résolveur que `openclaw nodes` (id, nom, ip ou préfixe d'id).
- `--agent` correspond par défaut à `"*"`, ce qui s'applique à tous les agents.
- L'hôte du nœud doit annoncer `system.execApprovals.get/set` (application macOS ou hôte de nœud sans interface).
- Les fichiers d'approbations sont stockés par hôte à `~/.openclaw/exec-approvals.json`.

import en from "/components/footer/en.mdx";

<en />
