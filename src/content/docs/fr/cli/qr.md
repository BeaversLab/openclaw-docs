---
summary: "Référence CLI pour `openclaw qr` (générer QR d'appairage mobile + code de configuration)"
read_when:
  - You want to pair a mobile node app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "QR"
---

# `openclaw qr`

Générer un QR d'appairage mobile et un code de configuration à partir de la configuration actuelle de votre Gateway.

## Utilisation

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## Options

- `--remote` : préférer `gateway.remote.url` ; s'il n'est pas défini, `gateway.tailscale.mode=serve|funnel` peut toujours fournir l'URL publique distante
- `--url <url>` : remplacer l'URL de la passerelle utilisée dans le payload
- `--public-url <url>` : remplacer l'URL publique utilisée dans le payload
- `--token <token>` : remplacer le jeton de passerelle contre lequel le processus d'amorçage s'authentifie
- `--password <password>` : remplacer le mot de passe de la passerelle contre lequel le processus d'amorçage s'authentifie
- `--setup-code-only` : afficher uniquement le code de configuration
- `--no-ascii` : sauter le rendu QR ASCII
- `--json` : émettre du JSON (`setupCode`, `gatewayUrl`, `auth`, `urlSource`)

## Notes

- `--token` et `--password` sont mutuellement exclusifs.
- Le code de configuration lui-même contient désormais un `bootstrapToken` opaque et à courte durée de vie, et non le jeton/mot de passe de la passerelle partagé.
- L'amorçage du code de configuration intégré est réservé aux nœuds. Après approbation, le jeton du nœud principal atterrit avec `scopes: []`.
- Le flux de code de configuration intégré ne renvoie pas de jeton d'opérateur transmis ; l'accès opérateur nécessite un appariement d'opérateur approuvé distinct ou un flux de jetons.
- L'appariement mobile échoue en mode fermé pour les URL de passerelle Tailscale/publiques `ws://`. Les adresses LAN privées et les hôtes `.local` Bonjour restent pris en charge via `ws://`, mais les itinéraires mobiles Tailscale/publics doivent utiliser Tailscale Serve/Funnel ou une URL de passerelle `wss://`.
- Avec `--remote`, OpenClaw nécessite soit `gateway.remote.url` soit
  `gateway.tailscale.mode=serve|funnel`.
- Avec `--remote`, si des informations d'identification à distance effectivement actives sont configurées en tant que SecretRefs et que vous ne transmettez pas `--token` ou `--password`, la commande les résout à partir de l'instantané actif de la passerelle. Si la passerelle n'est pas disponible, la commande échoue rapidement.
- Sans `--remote`, les SecretRefs d'authentification de la passerelle locale sont résolus lorsqu aucune substitution d'authentification CLI n'est transmise :
  - `gateway.auth.token` se résout lorsque l'authentification par jeton peut l'emporter (`gateway.auth.mode="token"` explicite ou mode inféré où aucune source de mot de passe ne l'emporte).
  - `gateway.auth.password` se résout lorsque l'authentification par mot de passe peut l'emporter (`gateway.auth.mode="password"` explicite ou mode inféré sans jeton gagnant provenant de auth/env).
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés (y compris les SecretRefs) et que `gateway.auth.mode` n'est pas défini, la résolution du code de configuration échoue jusqu'à ce que le mode soit défini explicitement.
- Remarque sur la différence de version de la Gateway : ce chemin de commande nécessite une passerelle prenant en charge `secrets.resolve` ; les passerelles plus anciennes renvoient une erreur de méthode inconnue.
- Après le scan, approuvez l'appariement de l'appareil avec :
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`

## Connexes

- [Référence CLI](/fr/cli)
- [Appariement](/fr/cli/pairing)
