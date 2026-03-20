---
summary: "Référence CLI pour `openclaw daemon` (ancien alias pour la gestion du service Gateway)"
read_when:
  - Vous utilisez encore `openclaw daemon ...` dans des scripts
  - Vous avez besoin de commandes de cycle de vie du service (install/start/stop/restart/status)
title: "daemon"
---

# `openclaw daemon`

Ancien alias pour les commandes de gestion du service Gateway.

`openclaw daemon ...` correspond à la même surface de contrôle de service que les commandes de service `openclaw gateway ...`.

## Utilisation

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## Sous-commandes

- `status` : afficher l'état d'installation du service et sonder la santé du Gateway
- `install` : installer le service (`launchd`/`systemd`/`schtasks`)
- `uninstall` : supprimer le service
- `start` : démarrer le service
- `stop` : arrêter le service
- `restart` : redémarrer le service

## Options communes

- `status` : `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `install` : `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- lifecycle (`uninstall|start|stop|restart`) : `--json`

Notes :

- `status` résout les SecretRefs d'authentification configurés pour l'authentification de la sonde lorsque cela est possible.
- Si un SecretRef d'authentification requis n'est pas résolu dans ce chemin de commande, `daemon status --json` signale `rpc.authWarning` lorsque la connectivité/la authentification de la sonde échoue ; passez `--token`/`--password` explicitement ou résolvez d'abord la source du secret.
- Si la sonde réussit, les avertissements d'auth-rés non résolus sont supprimés pour éviter les faux positifs.
- Sur les installations Linux systemd, les vérifications de dérive de jeton `status` incluent à la fois les sources d'unité `Environment=` et `EnvironmentFile=`.
- Lorsque l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, `install` valide que la SecretRef peut être résolue, mais ne persiste pas le jeton résolu dans les métadonnées de l'environnement de service.
- Si l'authentification par jeton nécessite un jeton et que la SecretRef du jeton configurée est non résolue, l'installation échoue de manière sécurisée.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation est bloquée jusqu'à ce que le mode soit défini explicitement.

## Préférence

Utilisez [`openclaw gateway`](/fr/cli/gateway) pour la documentation actuelle et les exemples.

import en from "/components/footer/en.mdx";

<en />
