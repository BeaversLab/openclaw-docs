---
summary: "État du support, fonctionnalités et configuration de Nextcloud Talk"
read_when:
  - Travailler sur les fonctionnalités du canal Nextcloud Talk
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
openclaw plugins install ./extensions/nextcloud-talk
```

Si vous choisissez Nextcloud Talk lors de l'installation et qu'un dépôt git est détecté,
OpenClaw proposera automatiquement le chemin d'installation local.

Détails : [Plugins](/fr/tools/plugin)

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
- L'URL du webhook doit être accessible par le Gateway ; définissez `webhookPublicUrl` si derrière un proxy.
- Les téléchargements de médias ne sont pas pris en charge par l'API du bot ; les médias sont envoyés sous forme d'URL.
- La charge utile du webhook ne fait pas la distinction entre les DMs et les salons ; définissez `apiUser` + `apiPassword` pour activer les recherches de type de salon (sinon les DMs sont traités comme des salons).

## Contrôle d'accès (DMs)

- Par défaut : `channels.nextcloud-talk.dmPolicy = "pairing"`. Les expéditeurs inconnus reçoivent un code d'appariement.
- Approuver via :
  - `openclaw pairing list nextcloud-talk`
  - `openclaw pairing approve nextcloud-talk <CODE>`
- DMs publics : `channels.nextcloud-talk.dmPolicy="open"` plus `channels.nextcloud-talk.allowFrom=["*"]`.
- `allowFrom` correspond uniquement aux ID utilisateur Nextcloud ; les noms d'affichage sont ignorés.

## Salons (groupes)

- Par défaut : `channels.nextcloud-talk.groupPolicy = "allowlist"` (restreint aux mentions).
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

- Pour ne permettre aucun salon, gardez la liste blanche vide ou définissez `channels.nextcloud-talk.groupPolicy="disabled"`.

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

Configuration complète : [Configuration](/fr/gateway/configuration)

Options du fournisseur :

- `channels.nextcloud-talk.enabled` : activer/désactiver le démarrage du canal.
- `channels.nextcloud-talk.baseUrl` : URL de l'instance Nextcloud.
- `channels.nextcloud-talk.botSecret` : secret partagé du bot.
- `channels.nextcloud-talk.botSecretFile` : chemin du secret de fichier régulier. Les liens symboliques sont rejetés.
- `channels.nextcloud-talk.apiUser` : utilisateur API pour les recherches de salons (détection de DM).
- `channels.nextcloud-talk.apiPassword` : mot de passe API/application pour les recherches de salons.
- `channels.nextcloud-talk.apiPasswordFile` : chemin du fichier de mot de passe API.
- `channels.nextcloud-talk.webhookPort` : port d'écoute du webhook (par défaut : 8788).
- `channels.nextcloud-talk.webhookHost` : hôte du webhook (par défaut : 0.0.0.0).
- `channels.nextcloud-talk.webhookPath` : chemin du webhook (par défaut : /nextcloud-talk-webhook).
- `channels.nextcloud-talk.webhookPublicUrl` : URL du webhook accessible de l'extérieur.
- `channels.nextcloud-talk.dmPolicy` : `pairing | allowlist | open | disabled`.
- `channels.nextcloud-talk.allowFrom` : liste d'autorisation DM (IDs utilisateur). `open` nécessite `"*"`.
- `channels.nextcloud-talk.groupPolicy` : `allowlist | open | disabled`.
- `channels.nextcloud-talk.groupAllowFrom` : liste d'autorisation de groupe (IDs utilisateur).
- `channels.nextcloud-talk.rooms` : paramètres par salle et liste d'autorisation.
- `channels.nextcloud-talk.historyLimit` : limite d'historique de groupe (0 désactive).
- `channels.nextcloud-talk.dmHistoryLimit` : limite d'historique DM (0 désactive).
- `channels.nextcloud-talk.dms` : remplacements par DM (historyLimit).
- `channels.nextcloud-talk.textChunkLimit` : taille de bloc de texte sortant (caractères).
- `channels.nextcloud-talk.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.nextcloud-talk.blockStreaming` : désactiver le block streaming pour ce channel.
- `channels.nextcloud-talk.blockStreamingCoalesce` : réglage de la fusion du block streaming.
- `channels.nextcloud-talk.mediaMaxMb` : plafond de média entrant (Mo).

import fr from "/components/footer/fr.mdx";

<fr />
