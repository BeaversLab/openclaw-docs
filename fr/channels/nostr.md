---
summary: "Canal DM Nostr via messages chiffrés NIP-04"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

# Nostr

**Statut :** Plugin optionnel (désactivé par défaut).

Nostr est un protocole décentralisé pour les réseaux sociaux. Ce canal permet à OpenClaw de recevoir et de répondre aux messages directs (DMs) chiffrés via NIP-04.

## Installation (à la demande)

### Onboarding (recommandé)

- Onboarding (`openclaw onboard`) et `openclaw channels add` listent les plugins de canal optionnels.
- Sélectionner Nostr vous invite à installer le plugin à la demande.

Paramètres d'installation par défaut :

- **Canal Dev + git checkout disponible :** utilise le chemin du plugin local.
- **Stable/Bêta :** télécharge depuis npm.

Vous pouvez toujours remplacer le choix dans l'invite.

### Installation manuelle

```bash
openclaw plugins install @openclaw/nostr
```

Utiliser un checkout local (flux de travail dev) :

```bash
openclaw plugins install --link <path-to-openclaw>/extensions/nostr
```

Redémarrez la passerelle après avoir installé ou activé les plugins.

### Configuration non interactive

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

Utilisez `--use-env` pour conserver `NOSTR_PRIVATE_KEY` dans l'environnement au lieu de stocker la clé dans la configuration.

## Configuration rapide

1. Générer une paire de clés Nostr (si nécessaire) :

```bash
# Using nak
nak key generate
```

2. Ajouter à la configuration :

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
    },
  },
}
```

3. Exporter la clé :

```bash
export NOSTR_PRIVATE_KEY="nsec1..."
```

4. Redémarrez le Gateway.

## Référence de configuration

| Clé          | Type     | Par défaut                                  | Description                                |
| ------------ | -------- | ------------------------------------------- | ------------------------------------------ |
| `privateKey` | string   | requis                                      | Clé privée au format `nsec` ou hexadécimal |
| `relays`     | string[] | `['wss://relay.damus.io', 'wss://nos.lol']` | URLs de relais (WebSocket)                 |
| `dmPolicy`   | string   | `pairing`                                   | Politique d'accès DM                       |
| `allowFrom`  | string[] | `[]`                                        | Clés publiques d'expéditeurs autorisées    |
| `enabled`    | boolean  | `true`                                      | Activer/désactiver le canal                |
| `name`       | string   | -                                           | Nom d'affichage                            |
| `profile`    | object   | -                                           | Métadonnées de profil NIP-01               |

## Métadonnées du profil

Les données du profil sont publiées en tant qu'événement NIP-01 `kind:0`. Vous pouvez les gérer depuis l'interface de contrôle (Canaux -> Nostr -> Profil) ou les définir directement dans la configuration.

Exemple :

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      profile: {
        name: "openclaw",
        displayName: "OpenClaw",
        about: "Personal assistant DM bot",
        picture: "https://example.com/avatar.png",
        banner: "https://example.com/banner.png",
        website: "https://example.com",
        nip05: "openclaw@example.com",
        lud16: "openclaw@example.com",
      },
    },
  },
}
```

Notes :

- Les URLs de profil doivent utiliser `https://`.
- L'importation depuis les relais fusionne les champs et conserve les substitutions locales.

## Contrôle d'accès

### Politiques DM

- **pairing** (par défaut) : les expéditeurs inconnus reçoivent un code d'appariement.
- **allowlist** : seules les clés publiques dans `allowFrom` peuvent envoyer des DMs.
- **open** : DMs entrants publics (nécessite `allowFrom: ["*"]`).
- **disabled** : ignorer les DMs entrants.

### Exemple de liste blanche

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      dmPolicy: "allowlist",
      allowFrom: ["npub1abc...", "npub1xyz..."],
    },
  },
}
```

## Formats de clé

Formats acceptés :

- **Clé privée :** `nsec...` ou hexadécimal sur 64 caractères
- **Clés publiques (`allowFrom`) :** `npub...` ou hexadécimal

## Relais

Par défaut : `relay.damus.io` et `nos.lol`.

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nostr.wine"],
    },
  },
}
```

Conseils :

- Utilisez 2 à 3 relais pour la redondance.
- Évitez d'utiliser trop de relais (latence, duplication).
- Les relais payants peuvent améliorer la fiabilité.
- Les relais locaux conviennent pour les tests (`ws://localhost:7777`).

## Prise en charge du protocole

| NIP    | Statut         | Description                                        |
| ------ | -------------- | -------------------------------------------------- |
| NIP-01 | Pris en charge | Format d'événement de base + métadonnées de profil |
| NIP-04 | Pris en charge | DMs chiffrés (`kind:4`)                            |
| NIP-17 | Prévu          | DMs enveloppés (gift-wrapped)                      |
| NIP-44 | Prévu          | Chiffrement versionné                              |

## Tests

### Relai local

```bash
# Start strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry
```

```json5
{
  channels: {
    nostr: {
      privateKey: "${NOSTR_PRIVATE_KEY}",
      relays: ["ws://localhost:7777"],
    },
  },
}
```

### Test manuel

1. Notez la clé publique du bot (npub) dans les journaux (logs).
2. Ouvrez un client Nostr (Damus, Amethyst, etc.).
3. Envoyez un DM à la clé publique du bot.
4. Vérifiez la réponse.

## Dépannage

### Non-réception de messages

- Vérifiez que la clé privée est valide.
- Assurez-vous que les URL des relais sont accessibles et utilisent `wss://` (ou `ws://` en local).
- Confirmez que `enabled` n'est pas `false`.
- Consultez les journaux du Gateway pour les erreurs de connexion aux relais.

### Absence d'envoi de réponses

- Vérifiez que le relai accepte les écritures.
- Vérifiez la connectivité sortante.
- Surveillez les limites de taux des relais.

### Réponses en double

- Comportement attendu lors de l'utilisation de plusieurs relais.
- Les messages sont dédupliqués par ID d'événement ; seule la première livraison déclenche une réponse.

## Sécurité

- Ne commettez jamais de clés privées.
- Utilisez des variables d'environnement pour les clés.
- Envisagez `allowlist` pour les bots de production.

## Limitations (MVP)

- Messages directs uniquement (pas de discussions de groupe).
- Pas de pièces jointes multimédias.
- NIP-04 uniquement (NIP-17 gift-wrap prévu).

import fr from "/components/footer/fr.mdx";

<fr />
