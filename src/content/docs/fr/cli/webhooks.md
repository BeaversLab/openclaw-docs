---
summary: "CLIRéférence de la CLI pour `openclaw webhooks` (configuration et exécution de Gmail Pub/Sub)"
read_when:
  - You want to wire Gmail Pub/Sub events into OpenClaw
  - You need the full flag list and default values
title: "Webhooks"
---

# `openclaw webhooks`

Helpers et intégrations pour les webhooks. Actuellement, cette surface est limitée aux flux Gmail Pub/Sub qui s'intègrent à l'observateur `gog` inclus.

## Sous-commandes

```bash
openclaw webhooks gmail setup --account <email> [...]
openclaw webhooks gmail run   [--account <email>] [...]
```

| Sous-commande | Description                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `gmail setup` | Configurer la surveillance Gmail, le sujet/abonnement Pub/Sub et la cible de livraison webhook OpenClaw. |
| `gmail run`   | Exécuter `gog watch serve` ainsi que la boucle de renouvellement automatique de la surveillance.         |

## `webhooks gmail setup`

Configurer la surveillance Gmail, Pub/Sub et la livraison webhook OpenClaw.

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail setup --account you@example.com --project my-gcp-project --json
openclaw webhooks gmail setup --account you@example.com --hook-url https://gateway.example.com/hooks/gmail
```

### Obligatoire

| Paramètre           | Description                |
| ------------------- | -------------------------- |
| `--account <email>` | Compte Gmail à surveiller. |

### Options Pub/Sub

| Paramètre               | Par défaut             | Description                                                      |
| ----------------------- | ---------------------- | ---------------------------------------------------------------- |
| `--project <id>`        | (aucun)                | ID de projet GCP (le propriétaire du client OAuth).              |
| `--topic <name>`        | `gog-gmail-watch`      | Nom du sujet Pub/Sub.                                            |
| `--subscription <name>` | `gog-gmail-watch-push` | Nom de l'abonnement Pub/Sub.                                     |
| `--label <label>`       | `INBOX`                | Libellé Gmail à surveiller.                                      |
| `--push-endpoint <url>` | (aucun)                | Point de terminaison push Pub/Sub explicite. Remplace Tailscale. |

### Options de livraison OpenClaw

| Paramètre              | Par défaut | Description                               |
| ---------------------- | ---------- | ----------------------------------------- |
| `--hook-url <url>`     | (aucun)    | URL du webhook OpenClaw.                  |
| `--hook-token <token>` | (aucun)    | Jeton du webhook OpenClaw.                |
| `--push-token <token>` | (aucun)    | Jeton push transféré à `gog watch serve`. |

### Options `gog watch serve`

| Paramètre             | Par défaut      | Description                                                                            |
| --------------------- | --------------- | -------------------------------------------------------------------------------------- |
| `--bind <host>`       | `127.0.0.1`     | Hôte de liaison `gog watch serve`.                                                     |
| `--port <port>`       | `8788`          | Port `gog watch serve`.                                                                |
| `--path <path>`       | `/gmail-pubsub` | Chemin `gog watch serve`.                                                              |
| `--include-body`      | `true`          | Inclure des extraits du corps des e-mails. Passez `--no-include-body` pour désactiver. |
| `--max-bytes <n>`     | `20000`         | Octets maximum par extrait de corps.                                                   |
| `--renew-minutes <n>` | `720` (12h)     | Renouveler la surveillance Gmail toutes les N minutes.                                 |

### Exposition Tailscale

| Flag                      | Par défaut | Description                                                                       |
| ------------------------- | ---------- | --------------------------------------------------------------------------------- |
| `--tailscale <mode>`      | `funnel`   | Exposer le point de terminaison push via tailscale : `funnel`, `serve`, ou `off`. |
| `--tailscale-path <path>` | (aucun)    | Chemin pour tailscale serve/funnel.                                               |
| `--tailscale-target <t>`  | (aucun)    | Cible Tailscale serve/funnel (port, `host:port`, ou URL).                         |

### Sortie

| Flag     | Description                                              |
| -------- | -------------------------------------------------------- |
| `--json` | Imprimer un résumé lisible par machine au lieu du texte. |

## `webhooks gmail run`

Exécuter `gog watch serve` plus la boucle de renouvellement automatique de la surveillance au premier plan.

```bash
openclaw webhooks gmail run --account you@example.com
```

`run` accepte les mêmes drapeaux `gog watch serve`, de livraison OpenClaw, Pub/Sub et Tailscale que `setup`, excepté :

- `--account` est **optionnel** sur `run` (il revient au compte configuré).
- `run` n'accepte **pas** `--project`, `--push-endpoint`, ou `--json`.
- Les drapeaux `run` n'ont pas de valeurs par défaut intégrées ; les valeurs manquantes reviennent aux valeurs écrites par `setup`.

| Catégorie          | Drapeaux                                                                         |
| ------------------ | -------------------------------------------------------------------------------- |
| Pub/Sub            | `--account`, `--topic`, `--subscription`, `--label`                              |
| Livraison OpenClaw | `--hook-url`, `--hook-token`, `--push-token`                                     |
| `gog watch serve`  | `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes` |
| Tailscale          | `--tailscale`, `--tailscale-path`, `--tailscale-target`                          |

<Note>Pour `run`, la valeur `--topic` est le chemin complet du sujet Pub/Sub (`projects/.../topics/...`), et non pas le simple nom du sujet.</Note>

## Flux de bout en bout

Voir [Intégration Gmail Pub/Sub](/fr/automation/cron-jobs#gmail-pubsub-integration) pour le projet GCP, OAuth et la configuration côté passerelle qui s'associent à ces commandes CLI.

## Connexes

- [Référence CLI](/fr/cli)
- [Automatisation des Webhooks](/fr/automation/webhook)
- [Gmail Pub/Sub](/fr/automation/cron-jobs#gmail-pubsub-integration)
