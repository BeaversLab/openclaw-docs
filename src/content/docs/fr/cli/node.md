---
summary: "Référence CLI pour `openclaw node` (hôte de nœud headless)"
read_when:
  - Running the headless node host
  - Pairing a non-macOS node for system.run
title: "Node"
---

# `openclaw node`

Exécutez un **hôte de nœud headless** qui se connecte au WebSocket du Gateway et expose
`system.run` / `system.which` sur cette machine.

## Pourquoi utiliser un hôte de nœud ?

Utilisez un hôte de nœud lorsque vous souhaitez que les agents **exécutent des commandes sur d'autres machines** de votre
réseau sans y installer l'application compagnon complète macOS.

Cas d'usage courants :

- Exécuter des commandes sur des machines distantes Linux/Windows (serveurs de build, machines de laboratoire, NAS).
- Gardez l'exécution **sandboxed** sur la passerelle, mais déléguez les exécutions approuvées à d'autres hôtes.
- Fournir une cible d'exécution légère et sans interface pour l'automatisation ou les nœuds CI.

L'exécution est toujours protégée par les **approbations d'exécution** et les listes d'autorisation par agent sur l'hôte de nœud, vous pouvez donc garder l'accès aux commandes délimité et explicite.

## Proxy de navigateur (zéro configuration)

Les hôtes de nœuds annoncent automatiquement un proxy de navigateur si `browser.enabled` n'est pas
désactivé sur le nœud. Cela permet à l'agent d'utiliser l'automatisation du navigateur sur ce nœud
sans configuration supplémentaire.

Par défaut, le proxy expose la surface de profil de navigateur normale du nœud. Si vous
définissez `nodeHost.browserProxy.allowProfiles`, le proxy devient restrictif :
le ciblage de profil non autorisé est rejeté, et les routes de création/suppression
de profils persistants sont bloquées via le proxy.

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

- `--host <host>` : Hôte WebSocket du Gateway (par défaut : `127.0.0.1`)
- `--port <port>` : Port WebSocket du Gateway (par défaut : `18789`)
- `--tls` : Utiliser TLS pour la connexion gateway
- `--tls-fingerprint <sha256>` : Empreinte du certificat TLS attendue (sha256)
- `--node-id <id>` : Remplacer l'id du nœud (efface le jeton d'appariement)
- `--display-name <name>` : Remplacer le nom d'affichage du nœud

## Authentification Gateway pour l'hôte de nœud

`openclaw node run` et `openclaw node install` résolvent l'authentification gateway depuis la config/env (pas de drapeaux `--token`/`--password` sur les commandes de nœud) :

- `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD` sont vérifiés en premier.
- Ensuite, repli vers la configuration locale : `gateway.auth.token` / `gateway.auth.password`.
- En mode local, l'hôte de nœud n'hérite pas intentionnellement de `gateway.remote.token` / `gateway.remote.password`.
- Si `gateway.auth.token` / `gateway.auth.password` est explicitement configuré via SecretRef et non résolu, la résolution de l'authentification du nœud échoue de manière fermée (pas de masquage de repli distant).
- Dans `gateway.mode=remote`, les champs de client distant (`gateway.remote.token` / `gateway.remote.password`) sont également éligibles selon les règles de priorité distantes.
- La résolution de l'authentification de l'hôte de nœud prend uniquement en compte les variables d'environnement `OPENCLAW_GATEWAY_*`.

Pour un nœud se connectant à une passerelle `ws://`Gateway en texte clair, les boucles locales, les adresses IP privées en littéral, `.local` et les hôtes `*.ts.net` de Tailnet sont acceptés. Pour d'autres noms DNS privés de confiance, définissez `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` ; sans cela, le démarrage du nœud échoue de manière fermée et vous demande d'utiliser `wss://`Tailscale, un tunnel SSH ou Tailscale. Il s'agit d'une option d'adhésion via l'environnement du processus, et non d'une clé de configuration `openclaw.json`.
`openclaw node install` la rend persistante dans le service de nœud supervisé lorsqu'elle est présente dans l'environnement de la commande d'installation.

## Service (arrière-plan)

Installez un hôte de nœud headless en tant que service utilisateur.

```bash
openclaw node install --host <gateway-host> --port 18789
```

Options :

- `--host <host>`Gateway : Hôte WebSocket de la passerelle (par défaut : `127.0.0.1`)
- `--port <port>`Gateway : Port WebSocket de la passerelle (par défaut : `18789`)
- `--tls` : Utiliser TLS pour la connexion à la passerelle
- `--tls-fingerprint <sha256>` : Empreinte du certificat TLS attendue (sha256)
- `--node-id <id>` : Remplacer l'identifiant du nœud (efface le jeton d'appariement)
- `--display-name <name>` : Remplacer le nom d'affichage du nœud
- `--runtime <runtime>` : Runtime du service (`node` ou `bun`)
- `--force` : Réinstaller/écraser si déjà installé

Gérer le service :

```bash
openclaw node status
openclaw node start
openclaw node stop
openclaw node restart
openclaw node uninstall
```

Utilisez `openclaw node run` pour un hôte de nœud au premier plan (pas de service).

Les commandes de service acceptent `--json` pour une sortie lisible par machine.

L'hôte de nœud réessaie le redémarrage Gateway et les fermetures réseau en cours de processus. Si le Gateway signale une pause d'authentification terminale par jeton/mot de passe/amorçage, l'hôte de nœud consigne le détail de la fermeture et quitte avec un code non nul afin que launchd/systemd puisse le redémarrer avec une configuration et des informations d'identification fraîches. Les pauses nécessitant un appairage restent dans le flux de premier plan afin que la demande en attente puisse être approuvée.

## Appairage

La première connexion crée une demande d'appareil d'appariement en attente (`role: node`Gateway) sur la passerelle.
Approuvez-la via :

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Sur les réseaux de nœuds étroitement contrôlés, l'opérateur Gateway peut explicitement accepter l'approubation automatique du premier appairage de nœud à partir de CIDR de confiance :

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Ceci est désactivé par défaut. Cela s'applique uniquement aux nouveaux appariements `role: node`WebChat sans portées demandées. Les clients opérateur/navigateur, l'interface de contrôle, WebChat, ainsi que les mises à niveau de rôle, de portée, de métadonnées ou de clé publique nécessitent toujours une approbation manuelle.

Si le nœud réessaie l'appariement avec des détails d'authentification modifiés (rôle/portées/clé publique),
la demande en attente précédente est remplacée et un nouveau `requestId` est créé.
Exécutez `openclaw devices list` à nouveau avant l'approbation.

L'hôte de nœud stocke son identifiant de nœud, son jeton, son nom d'affichage et les informations de connexion à la passerelle dans `~/.openclaw/node.json`.

## Approbations d'exécution

`system.run` est protégé par des approbations d'exécution locales :

- `~/.openclaw/exec-approvals.json`
- [Approbations d'exécution](/fr/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>` (modifier à partir du Gateway)

Pour l'exécution asynchrone approuvée du nœud, OpenClaw prépare un `systemRunPlan` canonique avant de demander une confirmation. Le transfert `system.run` approuvé ultérieurement réutilise ce plan stocké ; par conséquent, les modifications des champs commande/répertoire de travail/session après la création de la demande d'approbation sont rejetées au lieu de modifier ce que le nœud exécute.

## Connexes

- [Référence CLI](/fr/cli)
- [Nœuds](/fr/nodes)
