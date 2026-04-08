---
summary: "Statut de support, capacités et configuration du bot Zalo"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

# Zalo (Bot API)

Statut : expérimental. Les DMs sont pris en charge. La section [Capabilities](#capabilities) ci-dessous reflète le comportement actuel du bot Marketplace.

## Plugin inclus

Zalo est fourni en tant que plugin inclus dans les versions actuelles d'OpenClaw, les versions empaquetées standard n'ont donc pas besoin d'une installation distincte.

Si vous êtes sur une version ancienne ou une installation personnalisée qui exclut Zalo, installez-le manuellement :

- Installer via le CLI : `openclaw plugins install @openclaw/zalo`
- Ou depuis une extraction des sources : `openclaw plugins install ./path/to/local/zalo-plugin`
- Détails : [Plugins](/en/tools/plugin)

## Configuration rapide (débutant)

1. Assurez-vous que le plugin Zalo est disponible.
   - Les versions empaquetées actuelles d'OpenClaw l'incluent déjà.
   - Les installations anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Définir le jeton :
   - Env : `ZALO_BOT_TOKEN=...`
   - Ou config : `channels.zalo.accounts.default.botToken: "..."`.
3. Redémarrez la passerelle (ou terminez la configuration).
4. L'accès DM est couplé par défaut ; approuvez le code de couplage lors du premier contact.

Configuration minimale :

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

## Ce que c'est

Zalo est une application de messagerie axée sur le Vietnam ; son Bot API permet à la Gateway d'exécuter un bot pour des conversations 1:1.
C'est un bon choix pour le support ou les notifications où vous souhaitez un routage déterministe vers Zalo.

Cette page reflète le comportement actuel d'OpenClaw pour les **bots Marketplace / Zalo Bot Creator**.
Les **bots Zalo Official Account (OA)** sont une surface de produit Zalo différente et peuvent se comporter différemment.

- Un channel Zalo Bot API appartenant au Gateway.
- Routage déterministe : les réponses reviennent vers Zalo ; le modèle ne choisit jamais les channels.
- Les DMs partagent la session principale de l'agent.
- La section [Capabilities](#capabilities) ci-dessous montre la prise en charge actuelle des bots Marketplace.

## Configuration (chemin rapide)

### 1) Créer un jeton de bot (Zalo Bot Platform)

1. Allez sur [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) et connectez-vous.
2. Créez un nouveau bot et configurez ses paramètres.
3. Copiez le jeton complet du bot (typiquement `numeric_id:secret`). Pour les bots Marketplace, le jeton d'exécution utilisable peut apparaître dans le message de bienvenue du bot après sa création.

### 2) Configurer le jeton (env ou config)

Exemple :

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

Si vous passez ultérieurement à une interface de bot Zalo où les groupes sont disponibles, vous pouvez ajouter une configuration spécifique aux groupes telle que `groupPolicy` et `groupAllowFrom` explicitement. Pour le comportement actuel du bot Marketplace, voir [Capabilities](#capabilities).

Option Env : `ZALO_BOT_TOKEN=...` (fonctionne uniquement pour le compte par défaut).

Support multi-comptes : utilisez `channels.zalo.accounts` avec des jetons par compte et `name` facultatif.

3. Redémarrez la passerelle. Zalo démarre lorsqu'un jeton est résolu (env ou config).
4. L'accès DM est par défaut couplé. Approuvez le code lors du premier contact du bot.

## Fonctionnement (comportement)

- Les messages entrants sont normalisés dans l'enveloppe de channel partagée avec des espaces réservés pour les médias.
- Les réponses sont toujours renvoyées vers le même chat Zalo.
- Long-polling par défaut ; mode webhook disponible avec `channels.zalo.webhookUrl`.

## Limites

- Le texte sortant est découpé en tranches de 2000 caractères (limite de l'Zalo API).
- Les téléchargements/téléversements de médias sont limités par `channels.zalo.mediaMaxMb` (par défaut 5).
- Le streaming est bloqué par défaut car la limite de 2000 caractères rend le streaming moins utile.

## Contrôle d'accès (DMs)

### Accès DM

- Par défaut : `channels.zalo.dmPolicy = "pairing"`. Les expéditeurs inconnus reçoivent un code d'appariement ; les messages sont ignorés jusqu'à approbation (les codes expirent après 1 heure).
- Approuver via :
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- L'appariement est l'échange de jetons par défaut. Détails : [Pairing](/en/channels/pairing)
- `channels.zalo.allowFrom` accepte les ID d'utilisateur numériques (aucune recherche par nom d'utilisateur disponible).

## Contrôle d'accès (Groupes)

Pour les bots **Zalo Bot Creator / Marketplace**, la prise en charge des groupes n'était pas disponible en pratique car le bot ne pouvait pas être ajouté à un groupe du tout.

Cela signifie que les clés de configuration liées aux groupes ci-dessous existent dans le schéma, mais n'étaient pas utilisables pour les bots Marketplace :

- `channels.zalo.groupPolicy` contrôle la gestion des messages entrants de groupe : `open | allowlist | disabled`.
- `channels.zalo.groupAllowFrom` restreint les ID d'expéditeur pouvant déclencher le bot dans les groupes.
- Si `groupAllowFrom` n'est pas défini, Zalo revient à `allowFrom` pour les vérifications de l'expéditeur.
- Remarque d'exécution : si `channels.zalo` est totalement absent, l'exécution revient toujours à `groupPolicy="allowlist"` pour la sécurité.

Les valeurs de stratégie de groupe ( lorsque l'accès au groupe est disponible sur votre interface de bot ) sont :

- `groupPolicy: "disabled"` — bloque tous les messages de groupe.
- `groupPolicy: "open"` — autorise n'importe quel membre du groupe (limité par mention).
- `groupPolicy: "allowlist"` — échec par défaut fermé ; seuls les expéditeurs autorisés sont acceptés.

Si vous utilisez une autre interface de produit bot Zalo et que vous avez vérifié le fonctionnement des groupes, documentez-le séparément plutôt que de supposer qu'il correspond au flux des bots Marketplace.

## Long-polling vs webhook

- Par défaut : long-polling (aucune URL publique requise).
- Mode Webhook : définissez `channels.zalo.webhookUrl` et `channels.zalo.webhookSecret`.
  - Le secret du webhook doit comporter entre 8 et 256 caractères.
  - L'URL du webhook doit utiliser HTTPS.
  - Zalo envoie des événements avec l'en-tête `X-Bot-Api-Secret-Token` pour vérification.
  - Le Gateway HTTP gère les demandes webhook à `channels.zalo.webhookPath` (correspond par défaut au chemin de l'URL webhook).
  - Les demandes doivent utiliser `Content-Type: application/json` (ou les types de média `+json`).
  - Les événements en double (`event_name + message_id`) sont ignorés pendant une courte fenêtre de relecture.
  - Le trafic en rafale est limité par chemin/source et peut renvoyer une erreur HTTP 429.

**Remarque :** getUpdates (polling) et le webhook sont mutuellement exclusifs selon la documentation de l'Zalo API.

## Types de messages pris en charge

Pour un aperçu rapide du support, voir [Capabilities](#capabilities). Les notes ci-dessous ajoutent des détails là où le comportement nécessite un contexte supplémentaire.

- **Messages texte :** Prise en charge complète avec découpage par tranches de 2000 caractères.
- **URL simples dans le texte :** Se comportent comme une saisie de texte normale.
- **Aperçus de liens / cartes de liens riches** : Voir le statut du Marketplace-bot dans [Capabilities](#capabilities) ; ils ne déclenchaient pas de manière fiable une réponse.
- **Messages image** : Voir le statut du Marketplace-bot dans [Capabilities](#capabilities) ; la gestion des images entrantes n'était pas fiable (indicateur de frappe sans réponse finale).
- **Autocollants** : Voir le statut du Marketplace-bot dans [Capabilities](#capabilities).
- **Notes vocales / fichiers audio / vidéo / pièces jointes génériques** : Voir le statut du Marketplace-bot dans [Capabilities](#capabilities).
- **Types non pris en charge :** Enregistrés (par exemple, messages d'utilisateurs protégés).

## Fonctionnalités

Ce tableau résume le comportement actuel des **Zalo Bot Creator / Marketplace bot** dans OpenClaw.

| Fonctionnalité                | Statut                                                 |
| ----------------------------- | ------------------------------------------------------ |
| Messages directs              | ✅ Pris en charge                                      |
| Groupes                       | ❌ Non disponible pour les bots Marketplace            |
| Média (images entrantes)      | ⚠️ Limité / à vérifier dans votre environnement        |
| Média (images sortantes)      | ⚠️ Non testé à nouveau pour les bots Marketplace       |
| URL simples dans le texte     | ✅ Pris en charge                                      |
| Aperçus de liens              | ⚠️ Peu fiable pour les bots Marketplace                |
| Réactions                     | ❌ Non pris en charge                                  |
| Autocollants                  | ⚠️ Pas de réponse de l'agent pour les bots Marketplace |
| Notes vocales / audio / vidéo | ⚠️ Pas de réponse de l'agent pour les bots Marketplace |
| Pièces jointes de fichiers    | ⚠️ Pas de réponse de l'agent pour les bots Marketplace |
| Discussions (Threads)         | ❌ Non pris en charge                                  |
| Sondages                      | ❌ Non pris en charge                                  |
| Commandes natives             | ❌ Non pris en charge                                  |
| Streaming                     | ⚠️ Bloqué (limite de 2000 caractères)                  |

## Cibles de livraison (CLI/cron)

- Utilisez un identifiant de conversation comme cible.
- Exemple : `openclaw message send --channel zalo --target 123456789 --message "hi"`.

## Dépannage

**Le bot ne répond pas :**

- Vérifiez que le jeton est valide : `openclaw channels status --probe`
- Vérifiez que l'expéditeur est approuvé (appairage ou allowFrom)
- Vérifiez les journaux de la passerelle : `openclaw logs --follow`

**Le webhook ne reçoit pas d'événements :**

- Assurez-vous que l'URL du webhook utilise HTTPS
- Vérifiez que le jeton secret comporte de 8 à 256 caractères
- Confirmez que le point de terminaison HTTP de la passerelle est accessible sur le chemin configuré
- Vérifiez que le polling getUpdates n'est pas en cours d'exécution (ils sont mutuellement exclusifs)

## Référence de configuration (Zalo)

Configuration complète : [Configuration](/en/gateway/configuration)

Les clés de niveau supérieur plates (`channels.zalo.botToken`, `channels.zalo.dmPolicy` et similaires) sont une abréviation héritée pour un compte unique. Privilégiez `channels.zalo.accounts.<id>.*` pour les nouvelles configurations. Les deux formes sont encore documentées ici car elles existent dans le schéma.

Options du fournisseur :

- `channels.zalo.enabled` : activer/désactiver le démarrage du channel.
- `channels.zalo.botToken` : jeton de bot provenant de la plateforme de bot Zalo.
- `channels.zalo.tokenFile` : lire le jeton à partir d'un chemin de fichier régulier. Les liens symboliques sont rejetés.
- `channels.zalo.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appairage).
- `channels.zalo.allowFrom` : liste d'autorisation DM (identifiants utilisateurs). `open` nécessite `"*"`. L'assistant demandera les identifiants numériques.
- `channels.zalo.groupPolicy` : `open | allowlist | disabled` (par défaut : liste d'autorisation). Présent dans la configuration ; voir [Capacités](#capabilities) et [Contrôle d'accès (Groupes)](#access-control-groups) pour le comportement actuel du bot Marketplace.
- `channels.zalo.groupAllowFrom` : liste d'autorisation des expéditeurs de groupe (identifiants utilisateurs). Revient à `allowFrom` si non défini.
- `channels.zalo.mediaMaxMb` : limite de média entrant/sortant (Mo, par défaut 5).
- `channels.zalo.webhookUrl` : activer le mode webhook (HTTPS requis).
- `channels.zalo.webhookSecret` : secret du webhook (8-256 caractères).
- `channels.zalo.webhookPath` : chemin du webhook sur le serveur HTTP de la passerelle.
- `channels.zalo.proxy` : URL du proxy pour les requêtes API.

Options multi-comptes :

- `channels.zalo.accounts.<id>.botToken` : jeton par compte.
- `channels.zalo.accounts.<id>.tokenFile` : fichier de jeton régulier par compte. Les liens symboliques sont rejetés.
- `channels.zalo.accounts.<id>.name` : nom d'affichage.
- `channels.zalo.accounts.<id>.enabled` : activer/désactiver le compte.
- `channels.zalo.accounts.<id>.dmPolicy` : stratégie DM par compte.
- `channels.zalo.accounts.<id>.allowFrom` : liste d'autorisation par compte.
- `channels.zalo.accounts.<id>.groupPolicy` : stratégie de groupe par compte. Présent dans la configuration ; voir [Capacités](#capabilities) et [Contrôle d'accès (Groupes)](#access-control-groups) pour le comportement actuel du bot Marketplace.
- `channels.zalo.accounts.<id>.groupAllowFrom` : liste d'autorisation des expéditeurs de groupe par compte.
- `channels.zalo.accounts.<id>.webhookUrl` : URL de webhook par compte.
- `channels.zalo.accounts.<id>.webhookSecret` : secret de webhook par compte.
- `channels.zalo.accounts.<id>.webhookPath` : chemin de webhook par compte.
- `channels.zalo.accounts.<id>.proxy` : URL de proxy par compte.

## Connexes

- [Vue d'ensemble des canaux](/en/channels) — tous les canaux pris en charge
- [Jumelage](/en/channels/pairing) — authentification DM et processus de jumelage
- [Groupes](/en/channels/groups) — comportement des discussions de groupe et filtrage des mentions
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
