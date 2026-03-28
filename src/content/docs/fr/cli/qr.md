---
summary: "Référence CLI pour `openclaw qr` (générer un QR de couplage iOS + code de configuration)"
read_when:
  - You want to pair the iOS app with a gateway quickly
  - You need setup-code output for remote/manual sharing
title: "qr"
---

# `openclaw qr`

Générer un QR de couplage iOS et un code de configuration à partir de la configuration actuelle de votre Gateway.

## Utilisation

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## Options

- `--remote` : utiliser `gateway.remote.url` plus le jeton/mot de passe distant depuis la configuration
- `--url <url>` : remplacer l'URL de la passerelle utilisée dans la charge utile
- `--public-url <url>` : remplacer l'URL publique utilisée dans la charge utile
- `--token <token>` : remplacer le jeton de passerelle contre lequel le flux d'amorçage s'authentifie
- `--password <password>` : remplacer le mot de passe de passerelle contre lequel le flux d'amorçage s'authentifie
- `--setup-code-only` : afficher uniquement le code de configuration
- `--no-ascii` : sauter le rendu QR ASCII
- `--json` : émettre du JSON (`setupCode`, `gatewayUrl`, `auth`, `urlSource`)

## Notes

- `--token` et `--password` sont mutuellement exclusifs.
- Le code de configuration transporte désormais un `bootstrapToken` opaque et à courte durée de vie, et non le jeton/mot de passe de passerelle partagé.
- Avec `--remote`, si les identifiants distants effectivement actifs sont configurés en tant que SecretRefs et que vous ne passez pas `--token` ou `--password`, la commande les résout à partir de l'instantané de passerelle actif. Si la passerelle n'est pas disponible, la commande échoue rapidement.
- Sans `--remote`, les SecretRefs d'authentification locale de passerelle sont résolus lorsqu'aucune substitution d'authentification CLI n'est passée :
  - `gateway.auth.token` se résout lorsque l'authentification par jeton peut l'emporter (`gateway.auth.mode="token"` explicite ou mode inféré où aucune source de mot de passe ne l'emporte).
  - `gateway.auth.password` se résout lorsque l'authentification par mot de passe peut l'emporter (`gateway.auth.mode="password"` explicite ou mode inféré sans jeton gagnant provenant de auth/env).
- Si `gateway.auth.token` et `gateway.auth.password` sont tous deux configurés (y compris les SecretRefs) et que `gateway.auth.mode` n'est pas défini, la résolution du code de configuration échoue jusqu'à ce que le mode soit défini explicitement.
- Remarque concernant la disparité des versions de Gateway : ce chemin de commande nécessite une passerelle qui prend en charge `secrets.resolve` ; les passerelles plus anciennes renvoient une erreur unknown-method.
- Après le scan, approuvez le jumelage de l'appareil avec :
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`
