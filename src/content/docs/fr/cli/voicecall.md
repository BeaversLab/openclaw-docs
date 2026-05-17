---
summary: "CLIRéférence CLI pour `openclaw voicecall` (surface de commande du plugin voice-call)"
read_when:
  - You use the voice-call plugin and want every CLI entry point
  - You need flag tables and defaults for setup, smoke, call, continue, speak, dtmf, end, status, tail, latency, expose, and start
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` est une commande fournie par un plugin. Elle n'apparaît que lorsque le plugin voice-call est installé et activé.

Lorsque le Gateway est en cours d'exécution, les commandes opérationnelles (Gateway`call`, `start`, `continue`, `speak`, `dtmf`, `end`, `status`GatewayGatewayCLI) sont acheminées vers le runtime voice-call de ce Gateway. Si aucun Gateway n'est joignable, elles reviennent à un runtime CLI autonome.

## Sous-commandes

```bash
openclaw voicecall setup    [--json]
openclaw voicecall smoke    [-t <phone>] [--message <text>] [--mode <m>] [--yes] [--json]
openclaw voicecall call     -m <text> [-t <phone>] [--mode <m>]
openclaw voicecall start    --to <phone> [--message <text>] [--mode <m>]
openclaw voicecall continue --call-id <id> --message <text>
openclaw voicecall speak    --call-id <id> --message <text>
openclaw voicecall dtmf     --call-id <id> --digits <digits>
openclaw voicecall end      --call-id <id>
openclaw voicecall status   [--call-id <id>] [--json]
openclaw voicecall tail     [--file <path>] [--since <n>] [--poll <ms>]
openclaw voicecall latency  [--file <path>] [--last <n>]
openclaw voicecall expose   [--mode <m>] [--path <p>] [--port <port>] [--serve-path <p>]
```

| Sous-commande | Description                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `setup`       | Afficher les vérifications de disponibilité du provider et du webhook.                                   |
| `smoke`       | Exécuter les vérifications de disponibilité ; placer un appel de test en direct uniquement avec `--yes`. |
| `call`        | Lancer un appel vocal sortant.                                                                           |
| `start`       | Alias pour `call` avec `--to` requis et `--message` optionnel.                                           |
| `continue`    | Parler un message et attendre la prochaine réponse.                                                      |
| `speak`       | Parler un message sans attendre de réponse.                                                              |
| `dtmf`        | Envoyer des chiffres DTMF à un appel actif.                                                              |
| `end`         | Raccrocher un appel actif.                                                                               |
| `status`      | Inspecter les appels actifs (ou l'un d'eux par `--call-id`).                                             |
| `tail`        | Suivre le `calls.jsonl` (utile pendant les tests de provider).                                           |
| `latency`     | Résumer les métriques de latence de tour à partir du `calls.jsonl`.                                      |
| `expose`      | Activer/désactiver le serveur/tunnel Tailscale pour le point de terminaison webhook.                     |

## Configuration et test

### `setup`

Imprime par défaut des contrôles de lisibilité lisibles par l'homme. Passez `--json` pour les scripts.

```bash
openclaw voicecall setup
openclaw voicecall setup --json
```

### `smoke`

Exécute les mêmes contrôles de lisibilité. Il ne passera pas de vrai appel téléphonique à moins que `--to` et `--yes` ne soient tous deux présents.

| Flag               | Par défaut                        | Description                                       |
| ------------------ | --------------------------------- | ------------------------------------------------- |
| `-t, --to <phone>` | (aucun)                           | Numéro de téléphone à appeler pour un test actif. |
| `--message <text>` | `OpenClaw voice call smoke test.` | Message à prononcer pendant l'appel de test.      |
| `--mode <mode>`    | `notify`                          | Mode d'appel : `notify` ou `conversation`.        |
| `--yes`            | `false`                           | Passe réellement l'appel sortant en direct.       |
| `--json`           | `false`                           | Imprime du JSON lisible par machine.              |

```bash
openclaw voicecall smoke
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

<Note>Pour les fournisseurs externes (`twilio`, `telnyx`, `plivo`), `setup` et `smoke` nécessitent une URL de webhook publique de `publicUrl`Tailscale, un tunnel, ou une exposition Tailscale. Un serveur de rebouclage ou privé de repli est rejeté car les opérateurs ne peuvent pas l'atteindre.</Note>

## Cycle de vie de l'appel

### `call`

Initier un appel vocal sortant.

| Flag                   | Requis | Par défaut        | Description                                                                              |
| ---------------------- | ------ | ----------------- | ---------------------------------------------------------------------------------------- |
| `-m, --message <text>` | oui    | (aucun)           | Message à prononcer lorsque l'appel est connecté.                                        |
| `-t, --to <phone>`     | non    | config `toNumber` | Numéro de téléphone E.164 à appeler.                                                     |
| `--mode <mode>`        | non    | `conversation`    | Mode d'appel : `notify` (raccrocher après le message) ou `conversation` (rester ouvert). |

```bash
openclaw voicecall call --to "+15555550123" --message "Hello"
openclaw voicecall call -m "Heads up" --mode notify
```

### `start`

Alias pour `call` avec une forme de flag par défaut différente.

| Flag               | Requis | Par défaut     | Description                                       |
| ------------------ | ------ | -------------- | ------------------------------------------------- |
| `--to <phone>`     | oui    | (aucun)        | Numéro de téléphone à appeler.                    |
| `--message <text>` | non    | (aucun)        | Message à prononcer lorsque l'appel est connecté. |
| `--mode <mode>`    | non    | `conversation` | Mode d'appel : `notify` ou `conversation`.        |

### `continue`

Parler un message et attendre une réponse.

| Indicateur         | Obligatoire | Description          |
| ------------------ | ----------- | -------------------- |
| `--call-id <id>`   | oui         | ID de l'appel.       |
| `--message <text>` | oui         | Message à prononcer. |

### `speak`

Parler un message sans attendre de réponse.

| Indicateur         | Obligatoire | Description          |
| ------------------ | ----------- | -------------------- |
| `--call-id <id>`   | oui         | ID de l'appel.       |
| `--message <text>` | oui         | Message à prononcer. |

### `dtmf`

Envoyer des chiffres DTMF vers un appel actif.

| Indicateur          | Obligatoire | Description                                      |
| ------------------- | ----------- | ------------------------------------------------ |
| `--call-id <id>`    | oui         | ID de l'appel.                                   |
| `--digits <digits>` | oui         | Chiffres DTMF (ex. `ww123456#` pour les pauses). |

### `end`

Raccrocher un appel actif.

| Indicateur       | Obligatoire | Description    |
| ---------------- | ----------- | -------------- |
| `--call-id <id>` | oui         | ID de l'appel. |

### `status`

Inspecter les appels actifs.

| Indicateur       | Par défaut | Description                           |
| ---------------- | ---------- | ------------------------------------- |
| `--call-id <id>` | (aucun)    | Limiter la sortie à un seul appel.    |
| `--json`         | `false`    | Imprimer du JSON lisible par machine. |

```bash
openclaw voicecall status
openclaw voicecall status --json
openclaw voicecall status --call-id <id>
```

## Journaux et métriques

### `tail`

Suivre le journal JSONL de voice-call. Imprime les `--since` dernières lignes au démarrage, puis diffuse les nouvelles lignes au fur et à mesure qu'elles sont écrites.

| Indicateur      | Par défaut                            | Description                                  |
| --------------- | ------------------------------------- | -------------------------------------------- |
| `--file <path>` | résolu à partir du magasin de plugins | Chemin vers `calls.jsonl`.                   |
| `--since <n>`   | `25`                                  | Lignes à imprimer avant le suivi.            |
| `--poll <ms>`   | `250` (minimum 50)                    | Intervalle d'interrogation en millisecondes. |

### `latency`

Résumer les métriques de latence de tour et d'attente d'écoute à partir de `calls.jsonl`. La sortie est du JSON avec des résumés `recordsScanned`, `turnLatency` et `listenWait`.

| Indicateur      | Par défaut                            | Description                                  |
| --------------- | ------------------------------------- | -------------------------------------------- |
| `--file <path>` | résolu à partir du magasin de plugins | Chemin vers `calls.jsonl`.                   |
| `--last <n>`    | `200` (minimum 1)                     | Nombre d'enregistrements récents à analyser. |

## Exposition des webhooks

### `expose`

Activer, désactiver ou modifier la configuration Tailscale serve/funnel pour le webhook vocal.

| Flag                  | Par défaut                                | Description                                    |
| --------------------- | ----------------------------------------- | ---------------------------------------------- |
| `--mode <mode>`       | `funnel`                                  | `off`, `serve` (tailnet) ou `funnel` (public). |
| `--path <path>`       | config `tailscale.path` ou `--serve-path` | Chemin Tailscale à exposer.                    |
| `--port <port>`       | config `serve.port` ou `3334`             | Port du webhook local.                         |
| `--serve-path <path>` | config `serve.path` ou `/voice/webhook`   | Chemin du webhook local.                       |

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

<Warning>N'exposez le point de terminaison du webhook qu'aux réseaux de confiance. Privilégiez Tailscale Serve par rapport à Funnel lorsque cela est possible.</Warning>

## Connexes

- [Référence CLI](CLI/en/cli)
- [Plugin d'appel vocal](/fr/plugins/voice-call)
