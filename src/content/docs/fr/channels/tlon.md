---
summary: "État du support, capacités et configuration de Tlon/Urbit"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

# Tlon

Tlon est un messenger décentralisé basé sur Urbit. OpenClaw se connecte à votre vaisseau Urbit et peut répondre aux DMs et aux messages de chat de groupe. Les réponses de groupe nécessitent une mention @ par défaut et peuvent être davantage restreintes via des listes d'autorisation.

Statut : plugin groupé. Les DMs, les mentions de groupe, les réponses aux fils de discussion, le formatage de texte enrichi et
les téléchargements d'images sont pris en charge. Les réactions et les sondages ne sont pas encore pris en charge.

## Plugin groupé

Tlon est fourni en tant que plugin groupé dans les versions actuelles de OpenClaw. Les versions empaquetées
standard n'ont donc pas besoin d'installation séparée.

Si vous utilisez une version ancienne ou une installation personnalisée qui exclut Tlon, installez-le
manuellement :

Installation via CLI (registre npm) :

```bash
openclaw plugins install @openclaw/tlon
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

Détails : [Plugins](/en/tools/plugin)

## Configuration

1. Assurez-vous que le plugin Tlon est disponible.
   - Les versions empaquetées actuelles de OpenClaw l'incluent déjà.
   - Les installations anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Récupérez l'URL de votre vaisseau et votre code de connexion.
3. Configurez `channels.tlon`.
4. Redémarrez la passerelle.
5. Envoyez un DM au bot ou mentionnez-le dans un channel de groupe.

Configuration minimale (compte unique) :

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup",
      ownerShip: "~your-main-ship", // recommended: your ship, always allowed
    },
  },
}
```

## Vaisseaux privés/réseau local (LAN)

Par défaut, OpenClaw bloque les noms d'hôte privés/internes et les plages d'adresses IP pour la protection SSRF.
Si votre vaisseau fonctionne sur un réseau privé (localhost, IP LAN ou nom d'hôte interne),
vous devez explicitement l'accepter :

```json5
{
  channels: {
    tlon: {
      url: "http://localhost:8080",
      allowPrivateNetwork: true,
    },
  },
}
```

Cela s'applique aux URL telles que :

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ N'activez ceci que si vous faites confiance à votre réseau local. Ce paramètre désactive les protections SSRF
pour les requêtes vers l'URL de votre vaisseau.

## Channels de groupe

La découverte automatique est activée par défaut. Vous pouvez également épingler des channels manuellement :

```json5
{
  channels: {
    tlon: {
      groupChannels: ["chat/~host-ship/general", "chat/~host-ship/support"],
    },
  },
}
```

Désactiver la découverte automatique :

```json5
{
  channels: {
    tlon: {
      autoDiscoverChannels: false,
    },
  },
}
```

## Contrôle d'accès

Liste blanche de DMs (vide = aucun DM autorisé, utilisez `ownerShip` pour le flux d'approbation) :

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

Autorisation de groupe (restreinte par défaut) :

```json5
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"],
          },
          "chat/~host-ship/announcements": {
            mode: "open",
          },
        },
      },
    },
  },
}
```

## Système de propriétaire et d'approbation

Définissez un vaisseau propriétaire pour recevoir les demandes d'approbation lorsque des utilisateurs non autorisés tentent d'interagir :

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

Le vaisseau propriétaire est **automatiquement autorisé partout** — les invitations DM sont acceptées automatiquement et
les messages dans les channels sont toujours autorisés. Vous n'avez pas besoin d'ajouter le propriétaire à `dmAllowlist` ou
`defaultAuthorizedShips`.

Lorsqu'il est défini, le propriétaire reçoit des notifications DM pour :

- Demandes DM de vaisseaux non présents sur la liste blanche
- Mentions dans les channels sans autorisation
- Demandes d'invitation à un groupe

## Paramètres d'acceptation automatique

Acceptation automatique des invitations DM (pour les vaisseaux dans dmAllowlist) :

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

Acceptation automatique des invitations de groupe :

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
    },
  },
}
```

## Cibles de livraison (CLI/cron)

Utilisez ceux-ci avec `openclaw message send` ou la livraison cron :

- DM : `~sampel-palnet` ou `dm/~sampel-palnet`
- Groupe : `chat/~host-ship/channel` ou `group:~host-ship/channel`

## Compétence intégrée

Le plugin Tlon inclut une compétence intégrée ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))
qui fournit un accès CLI aux opérations Tlon :

- **Contacts** : obtenir/mettre à jour des profils, lister les contacts
- **Canaux** : lister, créer, publier des messages, récupérer l'historique
- **Groupes** : lister, créer, gérer les membres
- **DMs** : envoyer des messages, réagir aux messages
- **Réactions** : ajouter/supprimer des réactions emoji aux publications et DMs
- **Paramètres** : gérer les permissions du plugin via les commandes slash

La compétence est automatiquement disponible lorsque le plugin est installé.

## Capacités

| Fonctionnalité     | Statut                                                 |
| ------------------ | ------------------------------------------------------ |
| Messages directs   | ✅ Pris en charge                                      |
| Groupes/canaux     | ✅ Pris en charge (limité par mention par défaut)      |
| Fils de discussion | ✅ Pris en charge (réponses automatiques dans le fil)  |
| Texte enrichi      | ✅ Markdown converti au format Tlon                    |
| Images             | ✅ Téléversées vers le stockage Tlon                   |
| Réactions          | ✅ Via [compétence intégrée](#bundled-skill)           |
| Sondages           | ❌ Pas encore pris en charge                           |
| Commandes natives  | ✅ Pris en charge (propriétaire uniquement par défaut) |

## Dépannage

Exécutez d'abord cette échelle (ladder) :

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

Pannes courantes :

- **DMs ignorés** : l'expéditeur n'est pas dans `dmAllowlist` et aucun `ownerShip` n'est configuré pour le flux d'approbation.
- **Messages de groupe ignorés** : canal non découvert ou expéditeur non autorisé.
- **Erreurs de connexion** : vérifiez que l'URL du vaisseau est accessible ; activez `allowPrivateNetwork` pour les vaisseaux locaux.
- **Erreurs d'authentification** : vérifiez que le code de connexion est à jour (les codes changent).

## Référence de configuration

Configuration complète : [Configuration](/en/gateway/configuration)

Options du fournisseur :

- `channels.tlon.enabled` : activer/désactiver le démarrage du canal.
- `channels.tlon.ship` : nom du vaisseau Urbit du bot (par ex. `~sampel-palnet`).
- `channels.tlon.url` : URL du vaisseau (par ex. `https://sampel-palnet.tlon.network`).
- `channels.tlon.code` : code de connexion du vaisseau.
- `channels.tlon.allowPrivateNetwork` : autoriser les URL localhost/LAN (contournement SSRF).
- `channels.tlon.ownerShip` : vaisseau propriétaire pour le système d'approbation (toujours autorisé).
- `channels.tlon.dmAllowlist` : navires autorisés à envoyer des DM (vide = aucun).
- `channels.tlon.autoAcceptDmInvites` : accepter automatiquement les DM des navires autorisés.
- `channels.tlon.autoAcceptGroupInvites` : accepter automatiquement toutes les invitations de groupe.
- `channels.tlon.autoDiscoverChannels` : découverte automatique des canaux de groupe (par défaut : true).
- `channels.tlon.groupChannels` : nids de canaux épinglés manuellement.
- `channels.tlon.defaultAuthorizedShips` : navires autorisés pour tous les canaux.
- `channels.tlon.authorization.channelRules` : règles d'authentification par canal.
- `channels.tlon.showModelSignature` : ajouter le nom du model aux messages.

## Notes

- Les réponses de groupe nécessitent une mention (par ex. `~your-bot-ship`) pour répondre.
- Réponses de fil : si le message entrant est dans un fil, OpenClaw répond dans le fil.
- Texte riche : le formatage Markdown (gras, italique, code, en-têtes, listes) est converti au format natif de Tlon.
- Images : les URL sont téléchargées vers le stockage Tlon et intégrées sous forme de blocs d'image.

## Connexes

- [Vue d'ensemble des canaux](/en/channels) — tous les canaux pris en charge
- [Appairage](/en/channels/pairing) — authentification DM et flux d'appairage
- [Groupes](/en/channels/groups) — comportement du chat de groupe et filtrage par mention
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — model d'accès et durcissement
