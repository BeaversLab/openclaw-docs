---
summary: "Référence de la CLI pour `openclaw proxy`, le proxy de débogage local et l'inspecteur de capture"
read_when:
  - You need to capture OpenClaw transport traffic locally for debugging
  - You want to inspect debug proxy sessions, blobs, or built-in query presets
title: "Proxy"
---

# `openclaw proxy`

Exécutez le proxy de débogage explicite local et inspectez le trafic capturé.

Il s'agit d'une commande de débogage pour l'investigation au niveau du transport. Elle peut démarrer un
proxy local, exécuter une commande enfant avec la capture activée, lister les sessions de capture,
interroger les modèles de trafic courants, lire les objets blob capturés et purger les données de capture
locales.

## Commandes

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## Préréglages de requête

`openclaw proxy query --preset <name>` accepte :

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## Notes

- `start` est par défaut `127.0.0.1` sauf si `--host` est défini.
- `run` démarre un proxy de débogage local puis exécute la commande après `--`.
- Les captures sont des données de débogage locales ; utilisez `openclaw proxy purge` une fois terminé.

## Connexes

- [Référence de la CLI](/fr/cli)
- [Authentification de proxy de confiance](/fr/gateway/trusted-proxy-auth)
