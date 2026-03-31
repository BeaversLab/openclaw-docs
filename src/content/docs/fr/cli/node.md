---
summary: "Référence CLI pour `openclaw node` (hôte de nœud sans interface)"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "nœud"
---

# `openclaw node`

Exécutez un **hôte de nœud sans interface** qui se connecte au WebSocket Gateway et expose
`system.run` / `system.which` sur cette machine.

## Pourquoi utiliser un hôte de nœud ?

Utilisez un hôte de nœud lorsque vous souhaitez que les agents **exécutent des commandes sur d'autres machines** de votre
réseau sans y installer l'application compagnon complète macOS.

Cas d'usage courants :

- Exécuter des commandes sur des machines distantes Linux/Windows (serveurs de build, machines de laboratoire, NAS).
- Gardez l'exécution **sandboxed** sur la passerelle, mais déléguez les exécutions approuvées à d'autres hôtes.
- Fournir une cible d'exécution légère et sans interface pour l'automatisation ou les nœuds CI.

L'exécution reste protégée par les **approbations d'exécution** et les listes d'autorisation par agent sur
l'hôte de nœud, vous pouvez donc garder l'accès aux commandes délimité et explicite.

## Proxy de navigateur (zéro configuration)

Les hôtes de nœud annoncent automatiquement un proxy de navigateur si `browser.enabled` n'est pas
désactivé sur le nœud. Cela permet à l'agent d'utiliser l'automatisation du navigateur sur ce nœud
sans configuration supplémentaire.

Par défaut, le proxy expose la surface de profil de navigateur normale du nœud. Si vous définissez `nodeHost.browserProxy.allowProfiles`, le proxy devient restrictif : le ciblage de profil non autorisé est rejeté, et les routes de création/suppression de profil persistant sont bloquées via le proxy.

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

## Exécution (premier plan)

```bash
openclaw node run --host <gateway-host> --port 18789
```

Options :

- `--host <host>` : Hôte WebSocket Gateway (par défaut : `127.0.0.1`)
- `--port <port>` : Port WebSocket Gateway (par défaut : `18789`)
- `--tls` : Utiliser TLS pour la connexion à la passerelle
- `--tls-fingerprint <sha256>` : Empreinte du certificat TLS attendue (sha256)
- `--node-id <id>` : Remplacer l'identifiant du nœud (efface le jeton d'appairage)
- `--display-name <name>` : Remplacer le nom d'affichage du nœud

## Authentification Gateway pour l'hôte de nœud

`openclaw node run` et `openclaw node install` résolvent l'authentification de la passerelle à partir de la configuration/de l'environnement (pas de drapeaux `--token`/`--password` sur les commandes de nœud) :

- `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` sont vérifiés en premier.
- Ensuite, repli sur la configuration locale : `gateway.auth.token` / `gateway.auth.password`.
- En mode local, l'hôte de nœud n'hérite pas intentionnellement de `gateway.remote.token` / `gateway.remote.password`.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution de l'authentification du nœud échoue fermée (pas de masquage de repli distant).
- Dans `gateway.mode=remote`, les champs de client distant (`gateway.remote.token` / `gateway.remote.password`) sont également éligibles selon les règles de priorité distantes.
- La résolution de l'authentification de l'hôte de nœud ne prend en compte que les `OPENCLAW_GATEWAY_*` env vars.

## Service (arrière-plan)

Installer un hôte de nœud sans interface graphique en tant que service utilisateur.

```bash
openclaw node install --host <gateway-host> --port 18789
```

Options :

- `--host <host>` : Hôte WebSocket Gateway (par défaut : `127.0.0.1`)
- `--port <port>` : Port WebSocket Gateway (par défaut : `18789`)
- `--tls` : Utiliser TLS pour la connexion à la passerelle
- `--tls-fingerprint <sha256>` : Empreinte du certificat TLS attendue (sha256)
- `--node-id <id>` : Remplacer l'ID du nœud (efface le jeton d'appariement)
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

La première connexion crée une demande d'appareil en attente (`role: node`) sur le Gateway.
Approuvez-la via :

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Si le nœud réessaie l'appairage avec des détails d'authentification modifiés (rôle/portées/clé publique),
l'ancienne demande en attente est remplacée et un nouveau `requestId` est créé.
Exécutez `openclaw devices list` à nouveau avant l'approbation.

L'hôte de nœud stocke son identifiant de nœud, son jeton, son nom d'affichage et les informations de connexion à la passerelle dans
`~/.openclaw/node.json`.

## Approbations d'exécution

`system.run` est limité par des approbations d'exécution locales :

- `~/.openclaw/exec-approvals.json`
- [Approbations d'exécution](/en/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>` (modifier depuis le Gateway)
