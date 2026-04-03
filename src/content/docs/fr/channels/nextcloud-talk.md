---
summary: "Statut de support, capacités et configuration de Nextcloud Talk"
read_when:
  - Working on Nextcloud Talk channel features
title: "Nextcloud Talk"
---

# Nextcloud Talk (plugin)

Statut : pris en charge via plugin (bot webhook). Les messages directs, les salons, les réactions et les messages markdown sont pris en charge.

## Plugin requis

Nextcloud Talk est fourni en tant que plugin et n'est pas inclus dans l'installation principale.

Installation via CLI (registre npm) :

```bash
openclaw plugins install @openclaw/nextcloud-talk
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./path/to/local/nextcloud-talk-plugin
```

Si vous choisissez Nextcloud Talk lors de la configuration et qu'une extraction git est détectée,
OpenClaw proposera automatiquement le chemin d'installation local.

Détails : [Plugins](/en/tools/plugin)

## Configuration rapide (débutant)

1. Installez le plugin Nextcloud Talk.
2. Sur votre serveur Nextcloud, créez un bot :

   ```bash
   ./occ talk:bot:install "OpenClaw" "<shared-secret>" "<webhook-url>" --feature reaction
   ```

3. Activez le bot dans les paramètres du salon cible.
4. Configurez OpenClaw :
   - Config : `channels.nextcloud-talk.baseUrl` + `channels.nextcloud-talk.botSecret`
   - Ou env : `NEXTCLOUD_TALK_BOT_SECRET` (compte par défaut uniquement)
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
- L'URL du webhook doit être accessible par la Gateway ; définissez `webhookPublicUrl` si derrière un proxy.
- Les téléchargements de médias ne sont pas pris en charge par l'API du bot ; les médias sont envoyés sous forme d'URL.
- La charge utile du webhook ne distingue pas les DMs des salons ; définissez `apiUser` + `apiPassword` pour activer les recherches de type de salon (sinon les DMs sont traités comme des salons).

## Contrôle d'accès (DMs)

- Par défaut : `channels.nextcloud-talk.dmPolicy = "pairing"`. Les expéditeurs inconnus reçoivent un code de couplage.
- Approuver via :
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- DMs publics : `channels.nextcloud-talk.dmPolicy="open"` plus `channels.nextcloud-talk.allowFrom=["*"]`.
- `allowFrom` correspond uniquement aux ID utilisateur Nextcloud ; les noms d'affichage sont ignorés.

## Salons (groupes)

- Par défaut : `channels.nextcloud-talk.groupPolicy = "allowlist"` (limité aux mentions).
- Liste blanche des salons avec `channels.nextcloud-talk.rooms` :

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

- Pour interdire les salles, laissez la liste d'autorisation vide ou définissez `channels.nextcloud-talk.groupPolicy="disabled"`.

## Capacités

| Fonctionnalité     | Statut             |
| ------------------ | ------------------ |
| Messages directs   | Pris en charge     |
| Salles             | Pris en charge     |
| Fils de discussion | Non pris en charge |
| Médias             | URL uniquement     |
| Réactions          | Pris en charge     |
| Commandes natives  | Non pris en charge |

## Référence de configuration (Nextcloud Talk)

Configuration complète : [Configuration](/en/gateway/configuration)

Options du fournisseur :

- `channels.nextcloud-talk.enabled` : activer/désactiver le démarrage du canal.
- `channels.nextcloud-talk.baseUrl` : URL de l'instance Nextcloud.
- `channels.nextcloud-talk.botSecret` : secret partagé du bot.
- `channels.nextcloud-talk.botSecretFile` : chemin du secret de fichier régulier. Les liens symboliques sont rejetés.
- `channels.nextcloud-talk.apiUser` : utilisateur API pour la recherche de salles (détection de DM).
- `channels.nextcloud-talk.apiPassword` : mot de passe API/application pour la recherche de salles.
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
- `channels.nextcloud-talk.historyLimit` : limite d'historique de groupe (0 désactive).
- `channels.nextcloud-talk.dmHistoryLimit` : limite d'historique DM (0 désactive).
- `channels.nextcloud-talk.dms` : substitutions par DM (historyLimit).
- `channels.nextcloud-talk.textChunkLimit` : taille du bloc de texte sortant (caractères).
- `channels.nextcloud-talk.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphes) avant le découpage par longueur.
- `channels.nextcloud-talk.blockStreaming` : désactiver le block streaming pour ce channel.
- `channels.nextcloud-talk.blockStreamingCoalesce` : réglage de la coalescence du block streaming.
- `channels.nextcloud-talk.mediaMaxMb` : limite de média entrant (Mo).

## Connexes

- [Aperçu des canaux](/en/channels) — tous les canaux pris en charge
- [Appariement](/en/channels/pairing) — authentification DM et flux d'appariement
- [Groupes](/en/channels/groups) — comportement de discussion de groupe et contrôle des mentions
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
