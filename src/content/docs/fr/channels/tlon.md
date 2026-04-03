---
summary: "État du support, capacités et configuration de Tlon/Urbit"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

# Tlon (plugin)

Tlon est un messenger décentralisé basé sur Urbit. OpenClaw se connecte à votre vaisseau Urbit et peut répondre aux DMs et aux messages de chat de groupe. Les réponses de groupe nécessitent une mention @ par défaut et peuvent être davantage restreintes via des listes d'autorisation.

État : pris en charge via un plugin. Les DMs, les mentions de groupe, les réponses aux fils de discussion, le formatage de texte enrichi et les téléchargements d'images sont pris en charge. Les réactions et les sondages ne sont pas encore pris en charge.

## Plugin requis

Tlon est livré sous forme de plugin et n'est pas inclus avec l'installation principale.

Installer via CLI (registre npm) :

```bash
openclaw plugins install @openclaw/tlon
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

Détails : [Plugins](/en/tools/plugin)

## Configuration

1. Installez le plugin Tlon.
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

## Vaisseseau privé/LAN

Par défaut, OpenClaw bloque les noms d'hôte privés/internes et les plages d'adresses IP pour la protection SSRF. Si votre vaisseau fonctionne sur un réseau privé (localhost, IP LAN ou nom d'hôte interne), vous devez explicitement l'accepter :

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

Cela s'applique aux URL comme :

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ N'activez ceci que si vous faites confiance à votre réseau local. Ce paramètre désactive les protections SSRF pour les demandes vers l'URL de votre vaisseau.

## Canaux de groupe

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

Liste d'autorisation DM (vide = aucun DM autorisé, utilisez `ownerShip` pour le processus d'approbation) :

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

Définissez un vaisseau propriétaire pour recevoir les demandes d'approbation lorsque des utilisateurs non autorisés essaient d'interagir :

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

Le vaisseau du propriétaire est **automatiquement autorisé partout** — les invitations DM sont automatiquement acceptées et
les messages de channel sont toujours autorisés. Vous n'avez pas besoin d'ajouter le propriétaire à `dmAllowlist` ou
`defaultAuthorizedShips`.

Lorsque défini, le propriétaire reçoit des notifications DM pour :

- Demandes DM de vaisseaux qui ne sont pas dans la liste d'autorisation
- Mentions dans les channels sans autorisation
- Demandes d'invitation de groupe

## Paramètres d'acceptation automatique

Accepter automatiquement les invitations DM (pour les vaisseaux dans dmAllowlist) :

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

Accepter automatiquement les invitations de groupe :

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

Utilisez-les avec `openclaw message send` ou la livraison cron :

- DM : `~sampel-palnet` ou `dm/~sampel-palnet`
- Groupe : `chat/~host-ship/channel` ou `group:~host-ship/channel`

## Compétence groupée

Le plugin Tlon comprend une compétence intégrée ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))
qui fournit un accès Tlon aux opérations CLI :

- **Contacts** : obtenir/mettre à jour les profils, lister les contacts
- **Channels** : lister, créer, publier des messages, récupérer l'historique
- **Groupes** : lister, créer, gérer les membres
- **DMs** : envoyer des messages, réagir aux messages
- **Réactions** : ajouter/supprimer des réactions emoji aux publications et DMs
- **Paramètres** : gérer les permissions du plugin via les commandes slash

La compétence est automatiquement disponible lorsque le plugin est installé.

## Capacités

| Fonctionnalité     | Statut                                                 |
| ------------------ | ------------------------------------------------------ |
| Messages directs   | ✅ Pris en charge                                      |
| Groupes/channels   | ✅ Pris en charge (limité aux mentions par défaut)     |
| Fils de discussion | ✅ Pris en charge (réponses automatiques dans le fil)  |
| Texte enrichi      | ✅ Markdown converti au format Tlon                    |
| Images             | ✅ Téléversées vers le stockage Tlon                   |
| Réactions          | ✅ Via [compétence groupée](#bundled-skill)            |
| Sondages           | ❌ Pas encore pris en charge                           |
| Commandes natives  | ✅ Pris en charge (propriétaire uniquement par défaut) |

## Dépannage

Exécutez d'abord cette échelle :

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

Pannes courantes :

- **DMs ignorés** : l'expéditeur n'est pas dans `dmAllowlist` et aucun `ownerShip` n'est configuré pour le flux d'approbation.
- **Messages de groupe ignorés** : channel non découvert ou expéditeur non autorisé.
- **Erreurs de connexion** : vérifiez que l'URL du vaisseau est accessible ; activez `allowPrivateNetwork` pour les vaisseaux locaux.
- **Erreurs d'authentification** : vérifiez que le code de connexion est à jour (les codes tournent).

## Référence de configuration

Configuration complète : [Configuration](/en/gateway/configuration)

Options du fournisseur :

- `channels.tlon.enabled` : activer/désactiver le démarrage du canal.
- `channels.tlon.ship` : nom du vaisseau Urbit du bot (par ex. `~sampel-palnet`).
- `channels.tlon.url` : URL du vaisseau (par ex. `https://sampel-palnet.tlon.network`).
- `channels.tlon.code` : code de connexion du vaisseau.
- `channels.tlon.allowPrivateNetwork` : autoriser les URL localhost/LAN (contournement SSRF).
- `channels.tlon.ownerShip` : vaisseau propriétaire pour le système d'approbation (toujours autorisé).
- `channels.tlon.dmAllowlist` : vaisseaux autorisés à envoyer des DMs (vide = aucun).
- `channels.tlon.autoAcceptDmInvites` : accepter automatiquement les DMs des vaisseaux autorisés.
- `channels.tlon.autoAcceptGroupInvites` : accepter automatiquement toutes les invitations de groupe.
- `channels.tlon.autoDiscoverChannels` : découvrir automatiquement les canaux de groupe (par défaut : true).
- `channels.tlon.groupChannels` : nids de canaux épinglés manuellement.
- `channels.tlon.defaultAuthorizedShips` : vaisseaux autorisés pour tous les canaux.
- `channels.tlon.authorization.channelRules` : règles d'authentification par canal.
- `channels.tlon.showModelSignature` : ajouter le nom du model aux messages.

## Notes

- Les réponses de groupe nécessitent une mention (par ex. `~your-bot-ship`) pour répondre.
- Réponses aux fils : si le message entrant fait partie d'un fil, OpenClaw répond dans le fil.
- Texte enrichi : le formatage Markdown (gras, italique, code, en-têtes, listes) est converti au format natif de Tlon.
- Images : les URL sont téléchargées vers le stockage de Tlon et intégrées sous forme de blocs d'image.

## Connexes

- [Aperçu des canaux](/en/channels) — tous les canaux pris en charge
- [Appariement](/en/channels/pairing) — authentification par DM et flux d'appariement
- [Groupes](/en/channels/groups) — comportement du chat de groupe et filtrage des mentions
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
