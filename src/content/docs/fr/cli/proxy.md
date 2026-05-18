---
summary: "Référence de la CLI pour `openclaw proxy`, incluant la validation du proxy géré par l'opérateur et l'inspecteur de capture du proxy de débogage local"
read_when:
  - You need to validate operator-managed proxy routing before deployment
  - You need to capture OpenClaw transport traffic locally for debugging
  - You want to inspect debug proxy sessions, blobs, or built-in query presets
title: "Proxy"
---

# `openclaw proxy`

Validez le routage du proxy géré par l'opérateur, ou exécutez le proxy de débogage explicite local
et inspectez le trafic capturé.

Utilisez `validate` pour effectuer un contrôle préliminaire sur un proxy de transfert géré par l'opérateur avant d'activer
le routage du proxy OpenClaw. Les autres commandes sont des outils de débogage pour
l'investigation au niveau du transport : ils peuvent démarrer un proxy local, exécuter une commande fille
avec la capture activée, lister les sessions de capture, interroger les modèles de trafic courants, lire
les blobs capturés et purger les données de capture locales.

## Commandes

```bash
openclaw proxy start [--host <host>] [--port <port>]
openclaw proxy run [--host <host>] [--port <port>] -- <cmd...>
openclaw proxy validate [--json] [--proxy-url <url>] [--proxy-ca-file <path>] [--allowed-url <url>] [--denied-url <url>] [--apns-reachable] [--apns-authority <url>] [--timeout-ms <ms>]
openclaw proxy coverage
openclaw proxy sessions [--limit <count>]
openclaw proxy query --preset <name> [--session <id>]
openclaw proxy blob --id <blobId>
openclaw proxy purge
```

## Valider

`openclaw proxy validate` vérifie l'URL effective du proxy géré par l'opérateur à partir de
`--proxy-url`, de la configuration ou de `OPENCLAW_PROXY_URL`. Les URL de proxy géré peuvent utiliser
`http://` pour un écouteur de proxy de transfert classique ou `https://` lorsque OpenClaw doit
ouvrir TLS vers le point de terminaison du proxy avant d'envoyer les requêtes proxy. Il signale un
problème de configuration lorsque aucun proxy n'est activé et configuré ; utilisez `--proxy-url` pour un
prévol unique avant de modifier la configuration. Ajoutez `--proxy-ca-file` pour faire confiance à
une autorité de certification privée pour la connexion TLS vers un point de terminaison proxy HTTPS. Par défaut, il
vérifie qu'une destination publique réussit via le proxy et que le proxy
ne peut pas atteindre un canary de bouclage temporaire. Les destinations refusées personnalisées
sont en échec fermé : les réponses HTTP et les échecs de transport ambiguïs échouent tous les deux, à moins
que vous ne puissiez vérifier séparément un signal de refus spécifique au déploiement. Ajoutez
`--apns-reachable` pour ouvrir également un tunnel CONNECT HTTP/2 APNs via le proxy
et confirmer que le bac à sable APNs répond ; la sonde utilise un jeton provider
volontairement invalide, donc une réponse APNs `403 InvalidProviderToken` est un signal
de joignabilité réussi.

Options :

- `--json` : afficher du JSON lisible par machine.
- `--proxy-url <url>` : valider cette URL de proxy `http://` ou `https://` au lieu de la configuration ou de l'environnement.
- `--proxy-ca-file <path>` : faire confiance à ce fichier CA PEM pour la vérification TLS d'un point de terminaison proxy HTTPS.
- `--allowed-url <url>` : ajouter une destination censée réussir via le proxy. Répéter pour vérifier plusieurs destinations.
- `--denied-url <url>` : ajouter une destination censée être bloquée par le proxy. Répéter pour vérifier plusieurs destinations.
- `--apns-reachable` : vérifier également que le bac à sable APNs HTTP/2 est joignable via le proxy.
- `--apns-authority <url>` : autorité APNs à sonder avec `--apns-reachable` (`https://api.sandbox.push.apple.com` par défaut ; la production est `https://api.push.apple.com`).
- `--timeout-ms <ms>` : délai d'expiration par requête en millisecondes.

Voir [Network Proxy](/fr/security/network-proxy) pour les conseils de déploiement et la sémantique de refus.

## Préréglages de requête

`openclaw proxy query --preset <name>` accepte :

- `double-sends`
- `retry-storms`
- `cache-busting`
- `ws-duplicate-frames`
- `missing-ack`
- `error-bursts`

## Notes

- `start` est défini par défaut sur `127.0.0.1` sauf si `--host` est défini.
- `run` démarre un proxy de débogage local, puis exécute la commande après `--`.
- Le transfert direct en amont du proxy de débogage ouvre des sockets en amont pour le diagnostic. Lorsque le mode de proxy géré par OpenClaw est actif, le transfert direct pour les requêtes proxy et les tunnels CONNECT est désactivé par défaut ; définissez `OPENCLAW_DEBUG_PROXY_ALLOW_DIRECT_CONNECT_WITH_MANAGED_PROXY=1` uniquement pour les diagnostics locaux approuvés.
- `validate` se termine avec le code 1 lorsque les vérifications de configuration ou de destination du proxy échouent.
- Les captures sont des données de débogage locales ; utilisez `openclaw proxy purge` une fois terminé.

## Connexes

- [Référence CLI](/fr/cli)
- [Network Proxy](/fr/security/network-proxy)
- [Authentification de proxy approuvé](/fr/gateway/trusted-proxy-auth)
