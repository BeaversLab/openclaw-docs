---
summary: "Référence CLI pour `openclaw approvals` (approbations d'exécution pour les hôtes de passerelle ou de nœud)"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "approvals"
---

# `openclaw approvals`

Gérez les approbations d'exécution pour l'**hôte local**, l'**hôte passerelle** ou un **hôte de nœud**.
Par défaut, les commandes ciblent le fichier d'approbations local sur le disque. Utilisez `--gateway` pour cibler la passerelle, ou `--node` pour cibler un nœud spécifique.

Alias : `openclaw exec-approvals`

Connexes :

- Approbations d'exécution : [Approbations d'exécution](/en/tools/exec-approvals)
- Nœuds : [Nœuds](/en/nodes)

## Commandes courantes

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` affiche désormais la stratégie d'exécution effective pour les cibles locales, de passerelle et de nœud :

- stratégie `tools.exec` demandée
- hôte fichier-approbations stratégie
- résultat effectif après application des règles de priorité

La priorité est intentionnelle :

- le fichier d'approbations de l'hôte est la source de vérité applicable
- la stratégie `tools.exec` demandée peut restreindre ou élargir l'intention, mais le résultat effectif est toujours dérivé des règles de l'hôte
- `--node` combine le fichier d'approbations de l'hôte du nœud avec la stratégie `tools.exec` de la passerelle, car les deux s'appliquent toujours lors de l'exécution
- si la configuration de la passerelle n'est pas disponible, le CLI revient à l'instantané des approbations du nœud et note que la stratégie d'exécution finale n'a pas pu être calculée

## Remplacer les approbations depuis un fichier

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --stdin <<'EOF'
{ version: 1, defaults: { security: "full", ask: "off" } }
EOF
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

`set` accepte le JSON5, et pas seulement le JSON strict. Utilisez soit `--file` soit `--stdin`, mais pas les deux.

## Exemple « Never prompt » / YOLO

Pour un hôte qui ne doit jamais s'arrêter sur les approbations d'exécution, définissez les valeurs par défaut des approbations de l'hôte sur `full` + `off` :

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

Variante nœud :

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

Cela modifie uniquement le **fichier d'approbations de l'hôte**. Pour maintenir l'alignement de la stratégie OpenClaw demandée, définissez également :

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

Pourquoi `tools.exec.host=gateway` dans cet exemple :

- `host=auto` signifie toujours « sandbox si disponible, sinon passerelle ».
- YOLO concerne les approbations, pas le routage.
- Si vous souhaitez l'exécution sur l'hôte même lorsqu'un bac à sable (sandbox) est configuré, rendez le choix de l'hôte explicite avec `gateway` ou `/exec host=gateway`.

Cela correspond au comportement YOLO actuel par défaut de l'hôte. Serrez-le si vous souhaitez des approbations.

## Assistants de liste d'autorisation

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## Options courantes

`get`, `set` et `allowlist add|remove` prennent tous en charge :

- `--node <id|name|ip>`
- `--gateway`
- options RPC de nœud partagé : `--url`, `--token`, `--timeout`, `--json`

Notes de ciblage :

- aucun indicateur de cible signifie le fichier d'approbations local sur le disque
- `--gateway` cible le fichier d'approbations de l'hôte passerelle
- `--node` cible un hôte de nœud après avoir résolu l'id, le nom, l'IP ou le préfixe d'id

`allowlist add|remove` prend également en charge :

- `--agent <id>` (par défaut `*`)

## Notes

- `--node` utilise le même résolveur que `openclaw nodes` (id, nom, ip ou préfixe d'id).
- `--agent` est par défaut `"*"`, ce qui s'applique à tous les agents.
- L'hôte du nœud doit annoncer `system.execApprovals.get/set` (application macOS ou hôte de nœud sans interface).
- Les fichiers d'approbations sont stockés par hôte à `~/.openclaw/exec-approvals.json`.
