---
summary: "Référence de la CLI pour `openclaw node` (hôte de nœud sans interface)"
read_when:
  - Exécution de l'hôte de nœud sans interface
  - Association d'un nœud non macOS pour system.run
title: "node"
---

# `openclaw node`

Exécutez un **hôte de nœud sans interface** qui se connecte au WebSocket Gateway et expose
`system.run` / `system.which` sur cette machine.

## Pourquoi utiliser un hôte de nœud ?

Utilisez un hôte de nœud lorsque vous souhaitez que les agents **exécutent des commandes sur d'autres machines** de votre
réseau sans y installer l'application compagnon complète macOS.

Cas d'usage courants :

- Exécuter des commandes sur des boîtes distantes Linux/Windows (serveurs de build, machines de labo, NAS).
- Garder l'exécution **sandboxed** sur la passerelle, tout en déléguant les exécutions approuvées à d'autres hôtes.
- Fournir une cible d'exécution légère et sans interface pour l'automatisation ou les nœuds d'CI.

L'exécution est toujours protégée par les **approbations d'exécution** et les listes d'autorisation par agent sur
l'hôte de nœud, ce qui vous permet de garder l'accès aux commandes délimité et explicite.

## Proxy de navigateur (zéro configuration)

Les hôtes de nœud annoncent automatiquement un proxy de navigateur si `browser.enabled` n'est pas
désactivé sur le nœud. Cela permet à l'agent d'utiliser l'automatisation du navigateur sur ce nœud
sans configuration supplémentaire.

Désactivez-le sur le nœud si nécessaire :

```json5
{
  nodeHost: {
    browserProxy: {
      enabled: false,
    },
  },
}
```

## Exécuter (premier plan)

```bash
openclaw node run --host <gateway-host> --port 18789
```

Options :

- `--host <host>` : Hôte WebSocket Gateway (par défaut : `127.0.0.1`)
- `--port <port>` : Port WebSocket Gateway (par défaut : `18789`)
- `--tls` : Utiliser TLS pour la connexion à la passerelle
- `--tls-fingerprint <sha256>` : Empreinte du certificat TLS attendue (sha256)
- `--node-id <id>` : Remplacer l'identifiant du nœud (efface le jeton d'association)
- `--display-name <name>` : Remplacer le nom d'affichage du nœud

## Authentification Gateway pour l'hôte de nœud

`openclaw node run` et `openclaw node install` résolvent l'authentification de la passerelle depuis la config/env (pas de drapeaux `--token`/`--password` sur les commandes de nœud) :

- `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` sont vérifiés en premier.
- Ensuite, repli vers la configuration locale : `gateway.auth.token` / `gateway.auth.password`.
- En mode local, l'hôte de nœud n'hérite pas volontairement de `gateway.remote.token` / `gateway.remote.password`.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution d'auth du nœud échoue de manière fermée (sans masque de repli distant).
- Dans `gateway.mode=remote`, les champs de client distant (`gateway.remote.token` / `gateway.remote.password`) sont également éligibles selon les règles de priorité distantes.
- Les env vars `CLAWDBOT_GATEWAY_*` hérités sont ignorés pour la résolution d'auth de l'hôte de nœud.

## Service (arrière-plan)

Installer un hôte de nœud sans interface (headless) en tant que service utilisateur.

```bash
openclaw node install --host <gateway-host> --port 18789
```

Options :

- `--host <host>` : Hôte WebSocket du Gateway (par défaut : `127.0.0.1`)
- `--port <port>` : Port WebSocket du Gateway (par défaut : `18789`)
- `--tls` : Utiliser TLS pour la connexion passerelle
- `--tls-fingerprint <sha256>` : Empreinte du certificat TLS attendue (sha256)
- `--node-id <id>` : Remplacer l'identifiant du nœud (efface le jeton d'appairage)
- `--display-name <name>` : Remplacer le nom d'affichage du nœud
- `--runtime <runtime>` : Runtime du service (`node` ou `bun`)
- `--force` : Réinstaller/écraser si déjà installé

Gérer le service :

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

Utilisez `openclaw node run` pour un hôte de nœud au premier plan (pas de service).

Les commandes de service acceptent `--json` pour une sortie lisible par machine.

## Appairage

La première connexion crée une demande d'appareil d'appairage en attente (`role: node`) sur le Gateway.
Approuvez-la via :

```bash
openclaw devices list
openclaw devices approve <requestId>
```

L'hôte de nœud stocke son identifiant de nœud, son jeton, son nom d'affichage et les informations de connexion à la passerelle dans
`~/.openclaw/node.json`.

## Approbations d'exécution

`system.run` est contrôlé par les approbations d'exécution locales :

- `~/.openclaw/exec-approvals.json`
- [Approbations d'exécution](/fr/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>` (modifier depuis le Gateway)

import en from "/components/footer/en.mdx";

<en />
