---
summary: "Référence CLI pour `openclaw daemon` (alias legacy pour la gestion du service Gateway)"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `openclaw daemon`

Alias legacy pour les commandes de gestion du service Gateway.

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

- `status` : afficher l'état d'installation du service et sonder l'état de santé du Gateway
- `install` : installer le service (`launchd`/`systemd`/`schtasks`)
- `uninstall` : supprimer le service
- `start` : démarrer le service
- `stop` : arrêter le service
- `restart` : redémarrer le service

## Options communes

- `status` : `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--deep`, `--json`
- `install` : `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- cycle de vie (`uninstall|start|stop|restart`) : `--json`

Remarques :

- `status` résout les SecretRefs d'authentification configurés pour l'authentification de sonde lorsque cela est possible.
- Sur les installations systemd Linux, les vérifications de dérive de jeton (token-drift) de `status` incluent à la fois les sources d'unité `Environment=` et `EnvironmentFile=`.
- Lorsque l'authentification par jeton nécessite un jeton et que `gateway.auth.token` est géré par SecretRef, `install` valide que le SecretRef peut être résolu mais ne persiste pas le jeton résolu dans les métadonnées de l'environnement de service.
- Si l'authentification par jeton nécessite un jeton et que le SecretRef de jeton configuré est non résolu, l'installation échoue en mode fermé.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation est bloquée jusqu'à ce que le mode soit explicitement défini.

## Préférence

Utilisez [`openclaw gateway`](/fr/cli/gateway) pour la documentation actuelle et les exemples.

import fr from '/components/footer/fr.mdx';

<fr />
