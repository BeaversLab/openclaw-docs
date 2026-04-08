---
summary: "Runbook pour le service Gateway, le cycle de vie et les opérations"
read_when:
  - Running or debugging the gateway process
title: "Gateway Runbook"
---

# Gateway runbook

Utilisez cette page pour le démarrage initial (jour-1) et les opérations courantes (jour-2) du service Gateway.

<CardGroup cols={2}>
  <Card title="Deep troubleshooting" icon="siren" href="/en/gateway/troubleshooting">
    Diagnostics basés sur les symptômes avec des échelles de commandes exactes et des signatures de journal.
  </Card>
  <Card title="Configuration" icon="sliders" href="/en/gateway/configuration">
    Guide de configuration orienté tâche + référence complète de la configuration.
  </Card>
  <Card title="Secrets management" icon="key-round" href="/en/gateway/secrets">
    Contrat SecretRef, comportement de l'instantané d'exécution et opérations de migration/rechargement.
  </Card>
  <Card title="Secrets plan contract" icon="shield-check" href="/en/gateway/secrets-plan-contract">
    Règles exactes de chemin/cible `secrets apply` et comportement du profil d'authentification en référence seule.
  </Card>
</CardGroup>

## Démarrage local en 5 minutes

<Steps>
  <Step title="Start the Gateway">

```bash
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step title="Verify service health">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

Ligne de base saine : `Runtime: running` et `RPC probe: ok`.

  </Step>

  <Step title="Validate channel readiness">

```bash
openclaw channels status --probe
```

Avec une passerelle accessible, cela exécute des sondes de channel en direct par compte et des audits facultatifs.
Si la passerelle est inaccessible, la CLI revient par défaut aux résumés de channel uniquement basés sur la configuration au lieu
d'une sortie de sonde en direct.

  </Step>
</Steps>

<Note>
  Le rechargement de la configuration de la Gateway surveille le chemin du fichier de configuration actif (résolu à partir des valeurs par défaut du profil/état, ou `OPENCLAW_CONFIG_PATH` si défini). Le mode par défaut est `gateway.reload.mode="hybrid"`. Après le premier chargement réussi, le processus en cours d'exécution sert l'instantané de configuration actif en mémoire ; un rechargement
  réussi échange cet instantané de manière atomique.
</Note>

## Modèle d'exécution

- Un processus toujours actif pour le routage, le plan de contrôle et les connexions de canal.
- Port multiplexé unique pour :
  - Contrôle WebSocket / RPC
  - API HTTP, compatibles OpenAI (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - Interface de contrôle et crochets (hooks)
- Mode de liaison par défaut : `loopback`.
- L'authentification est requise par défaut. Les configurations à clé partagée utilisent
  `gateway.auth.token` / `gateway.auth.password` (ou
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`), et les configurations de
  proxy inverse non bouclé peuvent utiliser `gateway.auth.mode: "trusted-proxy"`.

## Points de terminaison compatibles OpenAI

La surface de compatibilité la plus à fort impact de OpenClaw est désormais :

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

Pourquoi cet ensemble est important :

- La plupart des intégrations Open WebUI, LobeChat et LibreChats sondent d'abord `/v1/models`.
- De nombreux pipelines RAG et de mémoire s'attendent à `/v1/embeddings`.
- Les clients natifs pour agents préfèrent de plus en plus `/v1/responses`.

Note de planification :

- `/v1/models` est centré sur l'agent : il renvoie `openclaw`, `openclaw/default` et `openclaw/<agentId>`.
- `openclaw/default` est l'alias stable qui correspond toujours à l'agent par défaut configuré.
- Utilisez `x-openclaw-model` lorsque vous souhaitez un remplacement du fournisseur/model backend ; sinon, la configuration normale du model et de l'incorporation de l'agent sélectionné reste en vigueur.

Tous ces éléments s'exécutent sur le port principal du Gateway et utilisent la même limite d'authentification opérateur de confiance que le reste de l'Gateway HTTP du API.

### Priorité du port et de la liaison

| Paramètre       | Ordre de résolution                                           |
| --------------- | ------------------------------------------------------------- |
| Port Gateway    | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| Mode de liaison | CLI/remplacement → `gateway.bind` → `loopback`                |

### Modes de rechargement à chaud

| `gateway.reload.mode` | Comportement                                                   |
| --------------------- | -------------------------------------------------------------- |
| `off`                 | Aucun rechargement de la configuration                         |
| `hot`                 | Appliquer uniquement les modifications sécurisées à chaud      |
| `restart`             | Redémarrer en cas de modifications nécessitant un rechargement |
| `hybrid` (par défaut) | Application à chaud si sécurisé, redémarrage si nécessaire     |

## Ensemble de commandes de l'opérateur

```bash
openclaw gateway status
openclaw gateway status --deep   # adds a system-level service scan
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

`gateway status --deep` sert à la découverte de services supplémentaire (LaunchDaemons/unités système systemd/schtasks), et non à une sonde de santé RPC plus approfondie.

## Multiple gateways (same host)

La plupart des installations doivent exécuter une seule passerelle par machine. Une seule passerelle peut héberger plusieurs agents et canaux.

Vous n'avez besoin de plusieurs passerelles que lorsque vous souhaitez intentionnellement une isolation ou un robot de secours.

Vérifications utiles :

```bash
openclaw gateway status --deep
openclaw gateway probe
```

À quoi s'attendre :

- `gateway status --deep` peut signaler `Other gateway-like services detected (best effort)`
  et imprimer des conseils de nettoyage lorsque des installations launchd/systemd/schtasks obsolètes sont toujours présentes.
- `gateway probe` peut avertir concernant `multiple reachable gateways` lorsque plus d'une cible
  répond.
- Si c'est intentionnel, isolez les ports, la configuration/l'état et les racines de l'espace de travail pour chaque passerelle.

Configuration détaillée : [/gateway/multiple-gateways](/en/gateway/multiple-gateways).

## Accès à distance

Préféré : Tailscale/VPN.
Alternative : Tunnel SSH.

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Connectez ensuite les clients localement à `ws://127.0.0.1:18789`.

<Warning>Les tunnels SSH ne contournent pas l'authentification de la passerelle. Pour l'authentification par secret partagé, les clients doivent encore envoyer `token`/`password` même via le tunnel. Pour les modes porteurs d'identité, la requête doit toujours satisfaire ce chemin d'authentification.</Warning>

Voir : [Remote Gateway](/en/gateway/remote), [Authentication](/en/gateway/authentication), [Tailscale](/en/gateway/tailscale).

## Supervision et cycle de vie du service

Utilisez des exécutions supervisées pour une fiabilité de type production.

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

Les labels LaunchAgent sont `ai.openclaw.gateway` (par défaut) ou `ai.openclaw.<profile>` (profil nommé). `openclaw doctor` audit et répare la dérive de configuration du service.

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

Pour la persistance après la déconnexion, activez le mode persistant (lingering) :

```bash
sudo loginctl enable-linger <user>
```

Exemple manuel d'unité utilisateur lorsque vous avez besoin d'un chemin d'installation personnalisé :

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

  </Tab>

  <Tab title="Windows (native)">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

Le démarrage géré natif de Windows utilise une tâche planifiée nommée `OpenClaw Gateway`
(ou `OpenClaw Gateway (<profile>)` pour les profils nommés). Si la création de la tâche planifiée
est refusée, OpenClaw se rabat sur un lanceur de dossier Démarrage par utilisateur
qui pointe vers `gateway.cmd` dans le répertoire d'état.

  </Tab>

  <Tab title="Linux (system service)">

Utilisez une unité système pour les hôtes multi-utilisateurs/toujours actifs.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

Utilisez le même corps de service que l'unité utilisateur, mais installez-le sous
`/etc/systemd/system/openclaw-gateway[-<profile>].service` et ajustez
`ExecStart=` si votre binaire `openclaw` se trouve ailleurs.

  </Tab>
</Tabs>

## Plusieurs passerelles sur un seul hôte

La plupart des configurations devraient exécuter **une seule** Gateway.
Utilisez-en plusieurs uniquement pour une isolation/redondance stricte (par exemple, un profil de secours).

Liste de contrôle par instance :

- `gateway.port` unique
- `OPENCLAW_CONFIG_PATH` unique
- `OPENCLAW_STATE_DIR` unique
- `agents.defaults.workspace` unique

Exemple :

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

Voir : [Plusieurs passerelles](/en/gateway/multiple-gateways).

### Chemin rapide du profil de développement

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

Les valeurs par défaut incluent un état/une configuration isolés et le port de passerelle de base `19001`.

## Référence rapide du protocole (vue opérateur)

- La première trame client doit être `connect`.
- La Gateway renvoie un instantané `hello-ok` (`presence`, `health`, `stateVersion`, `uptimeMs`, limites/stratégie).
- `hello-ok.features.methods` / `events` constituent une liste de découverte conservatrice, et non
  un vidage généré de chaque route d'assistance appelable.
- Requêtes : `req(method, params)` → `res(ok/payload|error)`.
- Les événements courants incluent `connect.challenge`, `agent`, `chat`,
  `session.message`, `session.tool`, `sessions.changed`, `presence`, `tick`,
  `health`, `heartbeat`, les événements de cycle de vie d'appariement/approbation et `shutdown`.

Les exécutions de l'agent se déroulent en deux étapes :

1. Accusé de réception accepté immédiat (`status:"accepted"`)
2. Réponse d'achèvement finale (`status:"ok"|"error"`), avec des événements `agent` diffusés entre les deux.

Voir la documentation complète du protocole : [Protocole Gateway](/en/gateway/protocol).

## Vérifications opérationnelles

### État actif

- Ouvrez WS et envoyez `connect`.
- Attendez une réponse `hello-ok` avec un instantané.

### Préparation

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### Récupération des lacunes

Les événements ne sont pas rejoués. En cas de lacunes dans la séquence, rafraîchissez l'état (`health`, `system-presence`) avant de continuer.

## Signatures de défaillance courantes

| Signature                                                      | Problème probable                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `refusing to bind gateway ... without auth`                    | Liaison non-bouclée sans chemin d'authentification de passerelle valide                                      |
| `another gateway instance is already listening` / `EADDRINUSE` | Conflit de port                                                                                              |
| `Gateway start blocked: set gateway.mode=local`                | Config définie en mode distant, ou l'horodatage du mode local est manquant dans une configuration endommagée |
| `unauthorized` lors de la connexion                            | Inadéquation de l'authentification entre le client et la passerelle                                          |

Pour les échelles de diagnostic complètes, utilisez [Dépannage de la passerelle](/en/gateway/troubleshooting).

## Garanties de sécurité

- Les clients du protocole Gateway échouent rapidement lorsque la Gateway est indisponible (pas de repli implicite sur le canal direct).
- Les premières trames invalides/non-connect sont rejetées et fermées.
- L'arrêt progressif émet l'événement `shutdown` avant la fermeture du socket.

---

Connexes :

- [Dépannage](/en/gateway/troubleshooting)
- [Processus d'arrière-plan](/en/gateway/background-process)
- [Configuration](/en/gateway/configuration)
- [Santé](/en/gateway/health)
- [Docteur](/en/gateway/doctor)
- [Authentification](/en/gateway/authentication)
