---
summary: "Référence CLI pour `openclaw approvals` et `openclaw exec-policy`"
read_when:
  - You want to edit exec approvals from the CLI
  - You need to manage allowlists on gateway or node hosts
title: "Approvals"
---

# `openclaw approvals`

Gérer les approbations exec pour l'**hôte local**, l'**hôte passerelle** ou un **hôte de nœud**.
Par défaut, les commandes ciblent le fichier d'approbations local sur le disque. Utilisez `--gateway` pour cibler la passerelle, ou `--node` pour cibler un nœud spécifique.

Alias : `openclaw exec-approvals`

Connexes :

- Approbations exec : [Approbations exec](/fr/tools/exec-approvals)
- Nœuds : [Nœuds](/fr/nodes)

## `openclaw exec-policy`

`openclaw exec-policy` est la commande de commodité locale pour garder la config `tools.exec.*` demandée et le fichier d'approbations de l'hôte local alignés en une seule étape.

Utilisez-la lorsque vous souhaitez :

- inspecter la stratégie demandée locale, le fichier d'approbations de l'hôte et la fusion effective
- appliquer un préréglage local tel que YOLO ou deny-all
- synchroniser le `tools.exec.*` local et l'`~/.openclaw/exec-approvals.json` local

Exemples :

```bash
openclaw exec-policy show
openclaw exec-policy show --json

openclaw exec-policy preset yolo
openclaw exec-policy preset cautious --json

openclaw exec-policy set --host gateway --security full --ask off --ask-fallback full
```

Modes de sortie :

- pas d'`--json` : affiche la vue tabulaire lisible par l'homme
- `--json` : affiche la sortie structurée lisible par machine

Portée actuelle :

- `exec-policy` est **uniquement local**
- il met à jour ensemble le fichier de configuration local et le fichier d'approbations local
- il ne pousse **pas** la stratégie vers l'hôte passerelle ou un hôte de nœud
- `--host node` est rejeté dans cette commande car les approbations exec de nœud sont récupérées depuis le nœud au moment de l'exécution et doivent être gérées via les commandes d'approbations ciblant le nœud à la place
- `openclaw exec-policy show` marque les portées `host=node` comme gérées par le nœud au moment de l'exécution au lieu de dériver une stratégie effective depuis le fichier d'approbations local

Si vous avez besoin de modifier directement les approbations de l'hôte distant, continuez d'utiliser `openclaw approvals set --gateway`
ou `openclaw approvals set --node <id|name|ip>`.

## Commandes courantes

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` affiche désormais la stratégie exec effective pour les cibles locales, passerelle et nœud :

- stratégie `tools.exec` demandée
- stratégie du fichier d'approbations de l'hôte
- résultat effectif après application des règles de priorité

La priorité est intentionnelle :

- le fichier des approbations de l'hôte est la source de vérité applicable
- la stratégie `tools.exec` demandée peut restreindre ou élargir l'intention, mais le résultat effectif est toujours dérivé des règles de l'hôte
- `--node` combine le fichier des approbations de l'hôte du nœud avec la stratégie `tools.exec` de la passerelle, car les deux s'appliquent toujours à l'exécution
- si la configuration de la passerelle n'est pas disponible, le CLI revient à l'instantané des approbations du nœud et note que la stratégie d'exécution finale n'a pas pu être calculée

## Remplacer les approbations à partir d'un fichier

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --stdin <<'EOF'
{ version: 1, defaults: { security: "full", ask: "off" } }
EOF
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

`set` accepte JSON5, et pas seulement JSON strict. Utilisez soit `--file` soit `--stdin`, pas les deux.

## Exemple "Jamais demander" / YOLO

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

Variante de nœud :

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

Cela modifie uniquement le **fichier des approbations de l'hôte**. Pour maintenir l'alignement de la stratégie OpenClaw demandée, définissez également :

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

Pourquoi `tools.exec.host=gateway` dans cet exemple :

- `host=auto` signifie toujours "bac à sable si disponible, sinon passerelle".
- YOLO concerne les approbations, pas le routage.
- Si vous souhaitez l'exécution sur l'hôte même lorsqu'un bac à sable est configuré, rendez le choix de l'hôte explicite avec `gateway` ou `/exec host=gateway`.

Cela correspond au comportement YOLO actuel par défaut de l'hôte. Serrez-le si vous souhaitez des approbations.

Raccourci local :

```bash
openclaw exec-policy preset yolo
```

Ce raccourci local met à jour ensemble la configuration `tools.exec.*` locale demandée et les valeurs par défaut des approbations locales. Il est équivalent en intention à la configuration manuelle en deux étapes ci-dessus, mais uniquement pour la machine locale.

## Assistants de liste blanche

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
- options RPC de nœud partagées : `--url`, `--token`, `--timeout`, `--json`

Notes sur le ciblage :

- aucun indicateur de cible signifie le fichier des approbations locales sur le disque
- `--gateway` cible le fichier d'approbations de l'hôte de passerelle
- `--node` cible un hôte de nœud après avoir résolu l'id, le nom, l'IP ou le préfixe d'id

`allowlist add|remove` prend également en charge :

- `--agent <id>` (par défaut `*`)

## Notes

- `--node` utilise le même résolveur que `openclaw nodes` (id, nom, ip ou préfixe d'id).
- `--agent` est défini par défaut sur `"*"`, ce qui s'applique à tous les agents.
- L'hôte du nœud doit annoncer `system.execApprovals.get/set` (application macOS ou hôte de nœud headless).
- Les fichiers d'approbations sont stockés par hôte à `~/.openclaw/exec-approvals.json`.

## Connexes

- [Référence CLI](/fr/cli)
- [Approbations d'exécution](/fr/tools/exec-approvals)
