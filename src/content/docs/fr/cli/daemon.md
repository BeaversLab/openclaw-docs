---
summary: "Référence CLI pour `openclaw daemon` (alias legacy pour la gestion du service Gateway)"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "Daemon"
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

- `status` : `--url`, `--token`, `--password`, `--timeout`, `--no-probe`, `--require-rpc`, `--deep`, `--json`
- `install` : `--port`, `--runtime <node|bun>`, `--token`, `--force`, `--json`
- `restart` : `--safe`, `--skip-deferral`, `--force`, `--wait <duration>`, `--json`
- cycle de vie (`uninstall|start|stop`) : `--json`

Notes :

- `status` résout les SecretRefs d'authentification configurés pour l'authentification de sonde lorsque cela est possible.
- Si un SecretRef d'authentification requis n'est pas résolu dans ce chemin de commande, `daemon status --json` signale `rpc.authWarning` lorsque la connectivité/l'authentification de la sonde échoue ; passez `--token`/`--password` explicitement ou résolvez d'abord la source du secret.
- Si la sonde réussit, les avertissements d'auth-rés non résolus sont supprimés pour éviter les faux positifs.
- `status --deep` ajoute une analyse des services au niveau système au mieux. Lorsqu'il trouve d'autres services de type passerelle, la sortie humaine imprime des conseils de nettoyage et avertit qu'une passerelle par machine reste toujours la recommandation normale.
- Sur les installations systemd Linux, les vérifications de dérive de token `status` incluent à la fois les sources d'unité `Environment=` et `EnvironmentFile=`.
- Les vérifications de dérive résolvent les SecretRefs `gateway.auth.token` à l'aide de l'environnement d'exécution fusionné (environnement de commande de service d'abord, puis repli sur l'environnement de processus).
- Si l'authentification par token n'est pas effectivement active (`gateway.auth.mode` explicite de `password`/`none`/`trusted-proxy`, ou mode non défini où le mot de passe peut l'emporter et aucun candidat token ne peut l'emporter), les vérifications de dérive de token ignorent la résolution du token de configuration.
- Lorsque l'authentification par token nécessite un token et que `gateway.auth.token` est géré par SecretRef, `install` valide que le SecretRef est résolvable mais ne persiste pas le token résolu dans les métadonnées de l'environnement de service.
- Si l'authentification par token nécessite un token et que le SecretRef de token configuré n'est pas résolu, l'installation échoue de manière fermée.
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés et que `gateway.auth.mode` n'est pas défini, l'installation est bloquée jusqu'à ce que le mode soit défini explicitement.
- Sur macOS, macOS`install`API conserve les plist LaunchAgent en accès réservé au propriétaire et charge les valeurs d'environnement du service géré via un fichier et un wrapper en accès réservé au propriétaire au lieu de sérialiser les clés d'API ou les références d'environnement de profil d'authentification dans `EnvironmentVariables`.
- Si vous exécutez intentionnellement plusieurs passerelles sur un seul hôte, isolez les ports, la configuration/l'état et les espaces de travail ; consultez [/gateway#multiple-gateways-same-host](/fr/gateway#multiple-gateways-same-host).
- `restart --safe`Gateway demande au Gateway en cours d'exécution d'effectuer une vérification préalable du travail actif et de planifier un redémarrage fusionné une fois le travail actif écoulé. `restart` simple conserve le comportement existant du gestionnaire de services ; `--force` reste le chemin de substitution immédiat.
- `restart --safe --skip-deferral`OpenClawGateway exécute le redémarrage sécurisé compatible OpenClaw mais contourne la porte de report du travail actif afin que le Gateway émette le redémarrage immédiatement, même lorsque des bloqueurs sont signalés. Porte de sortie de l'opérateur lorsqu'une exécution de tâche bloquée empêche le redémarrage sécurisé ; nécessite `--safe`.

## Préférences

Utilisez [`openclaw gateway`](/fr/cli/gateway) pour la documentation actuelle et les exemples.

## Connexes

- [Référence CLI](CLI/en/cli)
- [Runbook Gateway](Gateway/en/gateway)
