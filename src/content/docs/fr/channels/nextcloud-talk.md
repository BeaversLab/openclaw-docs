---
summary: "Statut du support, capacités et configuration de Nextcloud Talk"
read_when:
  - Working on Nextcloud Talk channel features
title: "Nextcloud Talk"
---

Statut : plugin intégré (bot webhook). Les messages directs, les salons, les réactions et les messages markdown sont pris en charge.

## Plugin intégré

Nextcloud Talk est fourni en tant que plugin intégré dans les versions actuelles d'OpenClaw,
les versions empaquetées standard n'ont donc pas besoin d'installation séparée.

Si vous utilisez une version antérieure ou une installation personnalisée qui exclut Nextcloud Talk,
installez directement le package npm :

Installer via CLI (registre npm) :

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

Utilisez le package nu pour suivre le tag de version officiel actuel. Épinglez une version
exacte uniquement lorsque vous avez besoin d'une installation reproductible.

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

Détails : [Plugins](/fr/tools/plugin)

## Configuration rapide (débutant)

1. Assurez-vous que le plugin Nextcloud Talk est disponible.
   - Les versions empaquetées actuelles de OpenClaw l'incluent déjà.
   - Les installations anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Sur votre serveur Nextcloud, créez un bot :

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature webhook --feature response --feature reaction
   ```

3. Activez le bot dans les paramètres du salon cible.
4. Configurez OpenClaw :
   - Config : `channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - Ou env : `NEXTCLOUD_TALK_BOT_SECRET` (compte par défaut uniquement)

   Configuration CLI :

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --url https://cloud.example.com \
     --token "<shared-secret>"
   ```

   Champs explicites équivalents :

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret "<shared-secret>"
   ```

   Secret basé sur un fichier :

   ```bash
   openclaw channels add --channel nextcloud-talk \
     --base-url https://cloud.example.com \
     --secret-file /path/to/nextcloud-talk-secret
   ```

5. Redémarrez la passerelle (ou terminez la configuration).

Configuration minimale :

```json5
{
  channels: {
    "nextcloud-talk": {
      enabled: true,
      baseUrl: "https://cloud.example.com",
      botSecret: "shared-secret",
      dmPolicy: "pairing",
    },
  },
}
```

## Notes

- Les bots ne peuvent pas initier de DMs. L'utilisateur doit d'abord envoyer un message au bot.
- L'URL du webhook doit être accessible par la passerelle ; définissez Gateway`webhookPublicUrl` si vous êtes derrière un proxy.
- Les téléchargements de médias ne sont pas pris en charge par l'API du bot ; les médias sont envoyés sous forme d'URL.
- La charge utile du webhook ne distingue pas les DMs des salles ; définissez `apiUser` + `apiPassword` pour activer les recherches de type de salle (sinon les DMs sont traités comme des salles).

## Contrôle d'accès (DMs)

- Par défaut : `channels.nextcloud-talk.dmPolicy = "pairing"`. Les expéditeurs inconnus reçoivent un code d'appariement.
- Approuver via :
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- DMs publics : `channels.nextcloud-talk.dmPolicy="open"` plus `channels.nextcloud-talk.allowFrom=["*"]`.
- `allowFrom`Nextcloud correspond uniquement aux ID utilisateur Nextcloud ; les noms d'affichage sont ignorés.

## Salles (groupes)

- Par défaut : `channels.nextcloud-talk.groupPolicy = "allowlist"` (limité aux mentions).
- Liste blanche des salles avec `channels.nextcloud-talk.rooms` :

```json5
{
  channels: {
    "nextcloud-talk": {
      rooms: {
        "room-token": { requireMention: true },
      },
    },
  },
}
```

- Pour ne permettre aucune salle, gardez la liste blanche vide ou définissez `channels.nextcloud-talk.groupPolicy="disabled"`.

## Fonctionnalités

| Fonctionnalité     | Statut             |
| ------------------ | ------------------ |
| Messages directs   | Pris en charge     |
| Salles             | Pris en charge     |
| Fils de discussion | Non pris en charge |
| Médias             | URL uniquement     |
| Réactions          | Pris en charge     |
| Commandes natives  | Non pris en charge |

## Référence de configuration (Nextcloud Talk)

Configuration complète : [Configuration](/fr/gateway/configuration)

Options du fournisseur :

- `channels.nextcloud-talk.enabled` : activer/désactiver le démarrage du canal.
- `channels.nextcloud-talk.baseUrl`Nextcloud : URL de l'instance Nextcloud.
- `channels.nextcloud-talk.botSecret` : secret partagé du bot.
- `channels.nextcloud-talk.botSecretFile` : chemin du secret vers un fichier régulier. Les liens symboliques sont rejetés.
- `channels.nextcloud-talk.apiUser` : utilisateur API pour les recherches de salle (détection de DM).
- `channels.nextcloud-talk.apiPassword` : mot de passe API/application pour les recherches de salle.
- `channels.nextcloud-talk.apiPasswordFile` : chemin du fichier de mot de passe API.
- `channels.nextcloud-talk.webhookPort` : port d'écoute du webhook (par défaut : 8788).
- `channels.nextcloud-talk.webhookHost` : hôte du webhook (par défaut : 0.0.0.0).
- `channels.nextcloud-talk.webhookPath` : chemin du webhook (par défaut : /nextcloud-talk-webhook).
- `channels.nextcloud-talk.webhookPublicUrl` : URL du webhook accessible de l'extérieur.
- `channels.nextcloud-talk.dmPolicy` : `pairing | allowlist | open | disabled`.
- `channels.nextcloud-talk.allowFrom` : liste d'autorisation DM (identifiants utilisateurs). `open` nécessite `"*"`.
- `channels.nextcloud-talk.groupPolicy` : `allowlist | open | disabled`.
- `channels.nextcloud-talk.groupAllowFrom` : liste d'autorisation de groupe (identifiants utilisateurs).
- `channels.nextcloud-talk.rooms` : paramètres et liste d'autorisation par salle.
- Les groupes d'accès statiques de l'expéditeur peuvent être référencés depuis `allowFrom` et `groupAllowFrom` avec `accessGroup:<name>`.
- `channels.nextcloud-talk.historyLimit` : limite d'historique de groupe (0 désactive).
- `channels.nextcloud-talk.dmHistoryLimit` : limite d'historique DM (0 désactive).
- `channels.nextcloud-talk.dms` : substitutions par DM (historyLimit).
- `channels.nextcloud-talk.textChunkLimit` : taille du bloc de texte sortant (caractères).
- `channels.nextcloud-talk.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.nextcloud-talk.blockStreaming` : désactiver le block streaming pour ce canal.
- `channels.nextcloud-talk.blockStreamingCoalesce` : réglage de la fusion du block streaming.
- `channels.nextcloud-talk.mediaMaxMb` : limite de média entrant (Mo).

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) — tous les canaux pris en charge
- [Appariement](/fr/channels/pairing) — authentification DM et flux d'appariement
- [Groupes](/fr/channels/groups) — comportement du chat de groupe et filtrage des mentions
- [Channel Routing](/fr/channels/channel-routing) — routage de session pour les messages
- [Security](/fr/gateway/security) — modèle d'accès et durcissement
