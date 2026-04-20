---
summary: "Canal DM Nostr via messages chiffrés NIP-04"
read_when:
  - You want OpenClaw to receive DMs via Nostr
  - You're setting up decentralized messaging
title: "Nostr"
---

# Nostr

**Statut :** Plugin groupé optionnel (désactivé par défaut jusqu'à configuration).

Nostr est un protocole décentralisé pour les réseaux sociaux. Ce canal permet à OpenClaw de recevoir et de répondre aux messages directs (DMs) chiffrés via NIP-04.

## Plugin groupé

Les versions actuelles d'OpenClaw incluent Nostr en tant que plugin groupé, donc les versions empaquetées normales
n'ont pas besoin d'une installation séparée.

### Installations anciennes/personnalisées

- L'intégration (`openclaw onboard`) et `openclaw channels add` récupèrent toujours
  Nostr à partir du catalogue de canaux partagés.
- Si votre version exclut Nostr groupé, installez-le manuellement.

```bash
openclaw plugins install @openclaw/nostr
```

Utilisez une extraction locale (flux de travail de développement) :

```bash
openclaw plugins install --link <path-to-local-nostr-plugin>
```

Redémarrez la Gateway après avoir installé ou activé des plugins.

### Configuration non interactive

```bash
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY" --relay-urls "wss://relay.damus.io,wss://relay.primal.net"
```

Utilisez `--use-env` pour conserver `NOSTR_PRIVATE_KEY` dans l'environnement au lieu de stocker la clé dans la configuration.

## Configuration rapide

1. Générez une paire de clés Nostr (si nécessaire) :

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

4. Redémarrez la Gateway.

## Référence de configuration

| Clé          | Type     | Par défaut                                  | Description                                |
| ------------ | -------- | ------------------------------------------- | ------------------------------------------ |
| `privateKey` | chaîne   | requis                                      | Clé privée au format `nsec` ou hexadécimal |
| `relays`     | chaîne[] | `['wss://relay.damus.io', 'wss://nos.lol']` | URL de relais (WebSocket)                  |
| `dmPolicy`   | chaîne   | `pairing`                                   | Stratégie d'accès DM                       |
| `allowFrom`  | chaîne[] | `[]`                                        | Clés publiques des expéditeurs autorisés   |
| `enabled`    | booléen  | `true`                                      | Activer/désactiver le canal                |
| `name`       | chaîne   | -                                           | Nom d'affichage                            |
| `profile`    | objet    | -                                           | Métadonnées de profil NIP-01               |

## Métadonnées de profil

Les données du profil sont publiées sous forme d'événement NIP-01 `kind:0`. Vous pouvez les gérer depuis l'interface de contrôle (Canaux -> Nostr -> Profil) ou les définir directement dans la configuration.

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

- Les URL de profil doivent utiliser `https://`.
- L'importation depuis les relais fusionne les champs et conserve les remplacements locaux.

## Contrôle d'accès

### Stratégies DM

- **pairing** (par défaut) : les expéditeurs inconnus reçoivent un code d'appariement.
- **allowlist** : seules les clés publiques dans `allowFrom` peuvent envoyer des DM.
- **open** : DM entrants publics (nécessite `allowFrom: ["*"]`).
- **disabled** : ignorer les DM entrants.

Notes sur l'application :

- Les signatures des événements entrants sont vérifiées avant la stratégie de l'expéditeur et le déchiffrement NIP-04, les événements falsifiés sont donc rejetés tôt.
- Les réponses d'appariement sont envoyées sans traiter le corps du DM d'origine.
- Les DM entrants sont limités par débit et les charges utiles trop volumineuses sont supprimées avant le déchiffrement.

### Exemple de liste d'autorisation

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

- **Clé privée :** `nsec...` ou hex de 64 caractères
- **Clés publiques (`allowFrom`) :** `npub...` ou hex

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
| NIP-04 | Pris en charge | DM chiffrés (`kind:4`)                             |
| NIP-17 | Prévu          | DM enveloppés (gift-wrapped)                       |
| NIP-44 | Prévu          | Chiffrement versionné                              |

## Tests

### Relais local

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

### Non réception de messages

- Vérifiez que la clé privée est valide.
- Assurez-vous que les URL des relais sont accessibles et utilisent `wss://` (ou `ws://` pour le local).
- Confirmez que `enabled` n'est pas `false`.
- Consultez les journaux du Gateway pour les erreurs de connexion aux relais.

### Pas d'envoi de réponses

- Vérifiez que le relais accepte les écritures.
- Vérifiez la connectivité sortante.
- Surveillez les limites de débit des relais.

### Réponses en double

- Attendu lors de l'utilisation de plusieurs relais.
- Les messages sont dédupliqués par ID d'événement ; seule la première livraison déclenche une réponse.

## Sécurité

- Ne commettez jamais de clés privées.
- Utilisez des variables d'environnement pour les clés.
- Envisagez `allowlist` pour les bots de production.
- Les signatures sont vérifiées avant la stratégie de l'expéditeur, et la stratégie de l'expéditeur est appliquée avant le déchiffrement, de sorte que les événements falsifiés sont rejetés tôt et les expéditeurs inconnus ne peuvent pas forcer le travail cryptographique complet.

## Limitations (MVP)

- Messages directs uniquement (pas de chats de groupe).
- Pas de pièces jointes multimédias.
- NIP-04 uniquement (NIP-17 gift-wrap prévu).

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) — tous les canaux pris en charge
- [Appariement](/fr/channels/pairing) — authentification DM et flux d'appariement
- [Groups](/fr/channels/groups) — comportement de la discussion de groupe et filtrage des mentions
- [Channel Routing](/fr/channels/channel-routing) — routage de session pour les messages
- [Security](/fr/gateway/security) — modèle d'accès et durcissement
