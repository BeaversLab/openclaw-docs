---
summary: "CLI OpenClaw OpenClaw (`openclaw gateway`) — exécuter, interroger et découvrir les passerelles"
read_when:
  - Running the Gateway from the CLI (dev or servers)
  - Debugging Gateway auth, bind modes, and connectivity
  - Discovering gateways via Bonjour (LAN + tailnet)
title: "gateway"
---

# Gateway CLI

Le Gateway est le serveur WebSocket d'OpenClaw (canaux, nœuds, sessions, hooks).

Les sous-commandes de cette page se trouvent sous `openclaw gateway …`.

Documentation connexe :

- [/gateway/bonjour](/fr/gateway/bonjour)
- [/gateway/discovery](/fr/gateway/discovery)
- [/gateway/configuration](/fr/gateway/configuration)

## Exécuter le Gateway

Exécuter un processus Gateway local :

```bash
openclaw gateway
```

Alias de premier plan :

```bash
openclaw gateway run
```

Remarques :

- Par défaut, le Gateway refuse de démarrer à moins que `gateway.mode=local` ne soit défini dans `~/.openclaw/openclaw.json`. Utilisez `--allow-unconfigured` pour les exécutions ad hoc/dev.
- La liaison au-delà de la boucle locale sans authentification est bloquée (garde-fou de sécurité).
- `SIGUSR1` déclenche un redémarrage dans le processus lorsqu'il est autorisé (`commands.restart` est activé par défaut ; définissez `commands.restart: false` pour bloquer le redémarrage manuel, alors que l'outil de passerelle/config apply/update restent autorisés).
- Les gestionnaires `SIGINT`/`SIGTERM` arrêtent le processus de passerelle, mais ils ne restaurent aucun état de terminal personnalisé. Si vous encapsulez la CLI avec une TUI ou une saisie en mode brut, restaurez le terminal avant de quitter.

### Options

- `--port <port>` : port WebSocket (la valeur par défaut provient de la config/env ; généralement `18789`).
- `--bind <loopback|lan|tailnet|auto|custom>` : mode de liaison de l'écouteur.
- `--auth <token|password>` : substitution du mode d'authentification.
- `--token <token>` : substitution de jeton (définit également `OPENCLAW_GATEWAY_TOKEN` pour le processus).
- `--password <password>` : substitution du mot de passe. Avertissement : les mots de passe en ligne peuvent être exposés dans les listes de processus locaux.
- `--password-file <path>` : lire le mot de passe de la passerelle depuis un fichier.
- `--tailscale <off|serve|funnel>` : exposer le Gateway via Tailscale.
- `--tailscale-reset-on-exit` : réinitialiser la configuration de service/tunnel Tailscale à l'arrêt.
- `--allow-unconfigured` : autoriser le démarrage de la passerelle sans `gateway.mode=local` dans la configuration.
- `--dev` : créer une configuration de développement + un espace de travail s'ils sont manquants (ignore BOOTSTRAP.md).
- `--reset` : réinitialiser la configuration de développement + les identifiants + les sessions + l'espace de travail (nécessite `--dev`).
- `--force` : tuer tout écouteur existant sur le port sélectionné avant de démarrer.
- `--verbose` : journaux détaillés.
- `--claude-cli-logs` : afficher uniquement les journaux claude-cli dans la console (et activer son stdout/stderr).
- `--ws-log <auto|full|compact>` : style de journal websocket (par défaut `auto`).
- `--compact` : alias pour `--ws-log compact`.
- `--raw-stream` : enregistrer les événements bruts du flux de modèle dans un fichier l.
- `--raw-stream-path <path>` : chemin du l du flux brut.

## Interroger un Gateway en cours d'exécution

Toutes les commandes de requête utilisent le WebSocket RPC.

Modes de sortie :

- Par défaut : lisible par l'homme (coloré dans un TTY).
- `--json` : JSON lisible par la machine (sans style/spinner).
- `--no-color` (ou `NO_COLOR=1`) : désactiver ANSI tout en conservant la disposition humaine.

Options partagées (lorsque prises en charge) :

- `--url <url>` : URL WebSocket du Gateway.
- `--token <token>` : jeton du Gateway.
- `--password <password>` : mot de passe du Gateway.
- `--timeout <ms>` : délai/budget (varie par commande).
- `--expect-final` : attendre une réponse « finale » (appels d'agent).

Remarque : lorsque vous définissez `--url`, le CLI ne revient pas aux identifiants de configuration ou d'environnement.
Passez `--token` ou `--password` explicitement. L'absence d'identifiants explicites est une erreur.

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway status`

`gateway status` affiche le service Gateway (launchd/systemd/schtasks) ainsi qu'une sonde RPC facultative.

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

Options :

- `--url <url>` : remplacer l'URL de la sonde.
- `--token <token>` : authentification par jeton pour la sonde.
- `--password <password>` : authentification par mot de passe pour la sonde.
- `--timeout <ms>` : délai d'attente de la sonde (par défaut `10000`).
- `--no-probe` : ignorer la sonde RPC (vue service uniquement).
- `--deep` : analyser également les services de niveau système.
- `--require-rpc` : renvoie un code de sortie non nul lorsque la sonde RPC échoue. Ne peut pas être combiné avec `--no-probe`.

Notes :

- `gateway status` résout les SecretRefs d'authentification configurés pour l'authentification de la sonde lorsque cela est possible.
- Si un SecretRef d'authentification requis n'est pas résolu dans ce chemin de commande, `gateway status --json` signale `rpc.authWarning` lorsque la sonde de connectivité/d'authentification échoue ; passez `--token`/`--password` explicitement ou résolvez d'abord la source du secret.
- Si la sonde réussit, les avertissements d'auth-rés non résolus sont supprimés pour éviter les faux positifs.
- Utilisez `--require-rpc` dans les scripts et l'automatisation lorsqu'un service d'écoute ne suffit pas et que vous avez besoin du Gateway RPC lui-même pour être en bonne santé.
- Sur les installations Linux systemd, les vérifications de dérive d'authentification du service lisent les valeurs `Environment=` et `EnvironmentFile=` à partir de l'unité (y compris `%h`, les chemins entre guillemets, les fichiers multiples et les fichiers `-` facultatifs).

### `gateway probe`

`gateway probe` est la commande « déboguer tout ». Elle sonde toujours :

- votre passerelle distante configurée (si définie), et
- localhost (boucle locale) **même si une distante est configurée**.

Si plusieurs passerelles sont accessibles, elle les imprime toutes. Plusieurs passerelles sont prises en charge lorsque vous utilisez des profils/ports isolés (par exemple, un robot de secours), mais la plupart des installations exécutent toujours une seule passerelle.

```bash
openclaw gateway probe
openclaw gateway probe --json
```

Interprétation :

- `Reachable: yes` signifie qu'au moins une cible a accepté une connexion WebSocket.
- `RPC: ok` signifie que les appels RPC détaillés (`health`/`status`/`system-presence`/`config.get`) ont également réussi.
- `RPC: limited - missing scope: operator.read` signifie que la connexion a réussi mais que le RPC détaillé est limité par la portée. Ceci est signalé comme une accessibilité **dégradée**, et non comme un échec total.
- Le code de sortie est non nul uniquement lorsqu'aucune cible sondée n'est accessible.

Notes JSON (`--json`) :

- Niveau supérieur :
  - `ok` : au moins une cible est accessible.
  - `degraded` : au moins une cible avait un RPC détaillé limité par la portée.
- Par cible (`targets[].connect`) :
  - `ok` : accessibilité après connexion + classification dégradée.
  - `rpcOk` : succès RPC détaillé complet.
  - `scopeLimited` : échec du détail RPC en raison d'une portée opérateur manquante.

#### À distance via SSH (parité avec l'application Mac)

Le mode « À distance via SSH » de l'application macOS utilise un transfert de port local afin que la passerelle distante (qui peut être liée uniquement à la boucle locale) devienne accessible à `ws://127.0.0.1:<port>`.

Équivalent CLI :

```bash
openclaw gateway probe --ssh user@gateway-host
```

Options :

- `--ssh <target>` : `user@host` ou `user@host:port` (le port par défaut est `22`).
- `--ssh-identity <path>` : fichier d'identité.
- `--ssh-auto` : choisir le premier hôte de passerelle découvert comme cible SSH (LAN/WAB uniquement).

Config (facultatif, utilisé comme valeurs par défaut) :

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

Assistant RPC de bas niveau.

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

## Gérer le service Gateway

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

Notes :

- `gateway install` prend en charge `--port`, `--runtime`, `--token`, `--force`, `--json`.
- Lorsque l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, `gateway install` vérifie que le SecretRef peut être résolu, mais ne persiste pas le jeton résolu dans les métadonnées de l'environnement de service.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef de jeton configuré n'est pas résolu, l'installation échoue de manière fermée au lieu de persister le texte en clair de secours.
- Pour l'authentification par mot de passe sur `gateway run`, privilégiez `OPENCLAW_GATEWAY_PASSWORD`, `--password-file`, ou un `gateway.auth.password` soutenu par SecretRef plutôt qu'un `--password` en ligne.
- En mode d'authentification inférée, le `OPENCLAW_GATEWAY_PASSWORD`/`CLAWDBOT_GATEWAY_PASSWORD` limité au shell ne relâche pas les exigences de jeton d'installation ; utilisez une configuration durable (`gateway.auth.password` ou config `env`) lors de l'installation d'un service géré.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation est bloquée jusqu'à ce que le mode soit défini explicitement.
- Les commandes de cycle de vie acceptent `--json` pour les scripts.

## Découvrir les passerelles (Bonjour)

`gateway discover` recherche les balises Gateway (`_openclaw-gw._tcp`).

- Multicast DNS-SD : `local.`
- Unicast DNS-SD (Bonjour étendu) : choisissez un domaine (exemple : `openclaw.internal.`) et configurez un DNS divisé + un serveur DNS ; voir [/gateway/bonjour](/fr/gateway/bonjour)

Seules les passerelles avec la découverte Bonjour activée (par défaut) annoncent la balise.

Les enregistrements de découverte étendue incluent (TXT) :

- `role` (indication de rôle de passerelle)
- `transport` (indication de transport, par exemple `gateway`)
- `gatewayPort` (port WebSocket, généralement `18789`)
- `sshPort` (port SSH ; par défaut `22` si absent)
- `tailnetDns` (nom d'hôte MagicDNS, si disponible)
- `gatewayTls` / `gatewayTlsSha256` (TLS activé + empreinte de certificat)
- `cliPath` (indication facultative pour les installations distantes)

### `gateway discover`

```bash
openclaw gateway discover
```

Options :

- `--timeout <ms>` : délai d'expiration par commande (parcours/résolution) ; par défaut `2000`.
- `--json` : sortie lisible par machine (désactive également le style/l'indicateur d'activité).

Exemples :

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

import fr from "/components/footer/fr.mdx";

<fr />
