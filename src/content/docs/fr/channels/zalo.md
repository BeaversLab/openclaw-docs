---
summary: "Statut de support, capacités et configuration du bot Zalo"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

Statut : expérimental. Les DM sont pris en charge. La section [Capabilities](#capabilities) ci-dessous reflète le comportement actuel des bots Marketplace.

## Plugin intégré

Zalo est fourni en tant que plugin intégré dans les versions actuelles d'OpenClaw, donc les versions empaquetées
normales n'ont pas besoin d'une installation séparée.

Si vous êtes sur une version plus ancienne ou une installation personnalisée qui exclut Zalo, installez-le
manuellement :

- Installer via CLI : `openclaw plugins install @openclaw/zalo`
- Ou depuis une source : `openclaw plugins install ./path/to/local/zalo-plugin`
- Détails : [Plugins](/fr/tools/plugin)

## Configuration rapide (débutant)

1. Assurez-vous que le plugin Zalo est disponible.
   - Les versions actuelles empaquetées d'OpenClaw l'incluent déjà.
   - Les installations plus anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Définir le jeton :
   - Env : `ZALO_BOT_TOKEN=...`
   - Ou config : `channels.zalo.accounts.default.botToken: "..."`.
3. Redémarrez la passerelle (ou terminez la configuration).
4. L'accès DM est par appariement par défaut ; approuvez le code d'appariement lors du premier contact.

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

Zalo est une application de messagerie axée sur le Vietnam ; son Bot API permet à la passerelle d'exécuter un bot pour des conversations 1:1.
C'est un bon choix pour le support ou les notifications où vous souhaitez un routage déterministe vers Zalo.

Cette page reflète le comportement actuel d'OpenClaw pour les **bots Zalo Bot Creator / Marketplace**.
Les **bots Zalo Official Account (OA)** sont une surface de produit Zalo différente et peuvent se comporter différemment.

- Un canal Zalo Bot API détenu par la passerelle.
- Routage déterministe : les réponses reviennent vers Zalo ; le modèle ne choisit jamais les canaux.
- Les DM partagent la session principale de l'agent.
- La section [Capabilities](#capabilities) ci-dessous montre le support actuel des bots Marketplace.

## Configuration (chemin rapide)

### 1) Créer un jeton de bot (Zalo Bot Platform)

1. Allez sur [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) et connectez-vous.
2. Créez un nouveau bot et configurez ses paramètres.
3. Copiez le jeton complet du bot (généralement `numeric_id:secret`). Pour les bots Marketplace, le jeton d'exécution utilisable peut apparaître dans le message de bienvenue du bot après sa création.

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

Si vous passez ensuite à une surface de bot Zalo où les groupes sont disponibles, vous pouvez ajouter une configuration spécifique aux groupes telle que `groupPolicy` et `groupAllowFrom` explicitement. Pour le comportement actuel des bots Marketplace, voir [Capabilities](#capabilities).

Option d'env : `ZALO_BOT_TOKEN=...` (fonctionne uniquement pour le compte par défaut).

Support multi-comptes : utilisez `channels.zalo.accounts` avec des jetons par compte et `name` en option.

3. Redémarrez la passerelle. Zalo démarre lorsqu'un jeton est résolu (env ou config).
4. L'accès par DM est réglé sur l'appairage par défaut. Approuvez le code lorsque le bot est contacté pour la première fois.

## Fonctionnement (comportement)

- Les messages entrants sont normalisés dans l'enveloppe de canal partagée avec des espaces réservés pour les médias.
- Les réponses sont toujours routées vers la même conversation Zalo.
- Polling long par défaut ; mode webhook disponible avec `channels.zalo.webhookUrl`.

## Limites

- Le texte sortant est découpé en blocs de 2000 caractères (limite de Zalo API).
- Les téléchargements/téléversements de médias sont plafonnés par `channels.zalo.mediaMaxMb` (5 par défaut).
- Le streaming est bloqué par défaut car la limite de 2000 caractères rend le streaming moins utile.

## Contrôle d'accès (DMs)

### Accès par DM

- Par défaut : `channels.zalo.dmPolicy = "pairing"`. Les expéditeurs inconnus reçoivent un code d'appairage ; les messages sont ignorés jusqu'à approbation (les codes expirent après 1 heure).
- Approuver via :
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- L'appairage est l'échange de jetons par défaut. Détails : [Appairage](/fr/channels/pairing)
- `channels.zalo.allowFrom` accepte les IDs utilisateur numériques (aucune recherche de nom d'utilisateur disponible).

## Contrôle d'accès (Groupes)

Pour les **bots Zalo Bot Creator / Marketplace**, le support des groupes n'était pas disponible en pratique car le bot ne pouvait pas du tout être ajouté à un groupe.

Cela signifie que les clés de configuration liées aux groupes ci-dessous existent dans le schéma, mais n'étaient pas utilisables pour les bots Marketplace :

- `channels.zalo.groupPolicy` contrôle la gestion des entrées de groupe : `open | allowlist | disabled`.
- `channels.zalo.groupAllowFrom` restreint quels IDs d'expéditeur peuvent déclencher le bot dans les groupes.
- Si `groupAllowFrom` n'est pas défini, Zalo revient à `allowFrom` pour les vérifications d'expéditeur.
- Note d'exécution : si `channels.zalo` manque entièrement, l'exécution revient toujours à `groupPolicy="allowlist"` pour la sécurité.

Les valeurs de stratégie de groupe (lorsque l'accès groupe est disponible sur votre surface de bot) sont :

- `groupPolicy: "disabled"` — bloque tous les messages de groupe.
- `groupPolicy: "open"` — autorise n'importe quel membre du groupe (limité par mention).
- `groupPolicy: "allowlist"` — échec par défaut (fail-closed) ; seuls les expéditeurs autorisés sont acceptés.

Si vous utilisez une autre surface de produit de bot Zalo et que vous avez vérifié le comportement de groupe fonctionnel, documentez-le séparément plutôt que de supposer qu'il correspond au flux du bot Marketplace.

## Long-polling vs webhook

- Par défaut : long-polling (aucune URL publique requise).
- Mode webhook : définissez `channels.zalo.webhookUrl` et `channels.zalo.webhookSecret`.
  - La clé secrète du webhook doit comporter entre 8 et 256 caractères.
  - L'URL du webhook doit utiliser HTTPS.
  - Zalo envoie des événements avec l'en-tête `X-Bot-Api-Secret-Token` pour vérification.
  - Le Gateway HTTP gère les demandes webhook sur `channels.zalo.webhookPath` (par défaut, le chemin de l'URL du webhook).
  - Les demandes doivent utiliser `Content-Type: application/json` (ou les types de média `+json`).
  - Les événements en double (`event_name + message_id`) sont ignorés pendant une courte fenêtre de répétition.
  - Le trafic en rafale est limité par chemin/source et peut renvoyer HTTP 429.

**Remarque :** getUpdates (polling) et webhook s'excluent mutuellement selon la documentation de l'Zalo API.

## Types de messages pris en charge

Pour un aperçu rapide de la prise en charge, voir [Capacités](#capabilities). Les notes ci-dessous ajoutent des détails là où le comportement nécessite un contexte supplémentaire.

- **Messages textuels** : Prise en charge complète avec découpage par blocs de 2000 caractères.
- **URL simples dans le texte** : Se comportent comme une saisie de texte normale.
- **Aperçus de lien / cartes de lien riches** : Consultez l'état du bot Marketplace dans [Capacités](#capabilities) ; ils ne déclenchaient pas de manière fiable une réponse.
- **Messages image** : Consultez l'état du bot Marketplace dans [Capacités](#capabilities) ; la gestion des images entrantes n'était pas fiable (indicateur de frappe sans réponse finale).
- **Autocollants** : Consultez l'état du bot Marketplace dans [Capacités](#capabilities).
- **Notes vocales / fichiers audio / vidéo / pièces jointes génériques** : Consultez l'état du bot Marketplace dans [Capacités](#capabilities).
- **Types non pris en charge** : Enregistrés (par exemple, messages d'utilisateurs protégés).

## Capacités

Ce tableau résume le comportement actuel des bots **Créateur de bot Zalo / bot Marketplace** dans OpenClaw.

| Fonctionnalité                | Statut                                                 |
| ----------------------------- | ------------------------------------------------------ |
| Messages directs              | ✅ Pris en charge                                      |
| Groupes                       | ❌ Non disponible pour les bots Marketplace            |
| Médias (images entrantes)     | ⚠️ Limité / à vérifier dans votre environnement        |
| Médias (images sortantes)     | ⚠️ Non testé à nouveau pour les bots Marketplace       |
| URL brutes dans le texte      | ✅ Pris en charge                                      |
| Aperçus de liens              | ⚠️ Non fiable pour les bots Marketplace                |
| Réactions                     | ❌ Non pris en charge                                  |
| Autocollants                  | ⚠️ Pas de réponse de l'agent pour les bots Marketplace |
| Notes vocales / audio / vidéo | ⚠️ Pas de réponse de l'agent pour les bots Marketplace |
| Pièces jointes                | ⚠️ Pas de réponse de l'agent pour les bots Marketplace |
| Fils de discussion            | ❌ Non pris en charge                                  |
| Sondages                      | ❌ Non pris en charge                                  |
| Commandes natives             | ❌ Non pris en charge                                  |
| Streaming                     | ⚠️ Bloqué (limite de 2000 caractères)                  |

## Cibles de livraison (CLI/cron)

- Utilisez un ID de conversation comme cible.
- Exemple : `openclaw message send --channel zalo --target 123456789 --message "hi"`.

## Dépannage

**Le bot ne répond pas :**

- Vérifiez que le jeton est valide : `openclaw channels status --probe`
- Vérifiez que l'expéditeur est approuvé (appairage ou allowFrom)
- Vérifiez les journaux de la passerelle : `openclaw logs --follow`

**Le webhook ne reçoit pas d'événements :**

- Assurez-vous que l'URL du webhook utilise HTTPS
- Vérifiez que le jeton secret comporte entre 8 et 256 caractères
- Confirmez que le point de terminaison HTTP de la passerelle est accessible sur le chemin configuré
- Vérifiez que le polling getUpdates n'est pas en cours d'exécution (ils s'excluent mutuellement)

## Référence de configuration (Zalo)

Configuration complète : [Configuration](/fr/gateway/configuration)

Les clés plates de premier niveau (`channels.zalo.botToken`, `channels.zalo.dmPolicy`, et similaires) sont une abréviation héritée pour compte unique. Préférez `channels.zalo.accounts.<id>.*` pour les nouvelles configurations. Les deux formes sont encore documentées ici car elles existent dans le schéma.

Options du fournisseur :

- `channels.zalo.enabled` : activer/désactiver le démarrage du canal.
- `channels.zalo.botToken` : jeton de bot de la plateforme Zalo Bot Platform.
- `channels.zalo.tokenFile` : lire le jeton depuis un chemin de fichier régulier. Les liens symboliques sont rejetés.
- `channels.zalo.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appairage).
- `channels.zalo.allowFrom` : liste blanche de DM (ID utilisateur). `open` nécessite `"*"`. L'assistant demandera les ID numériques.
- `channels.zalo.groupPolicy` : `open | allowlist | disabled` (par défaut : allowlist). Présent dans la configuration ; voir [Capabilities](#capabilities) et [Access control (Groups)](#access-control-groups) pour le comportement actuel du Marketplace-bot.
- `channels.zalo.groupAllowFrom` : liste d'autorisation des expéditeurs de groupe (ID utilisateur). Revient à `allowFrom` si non défini.
- `channels.zalo.mediaMaxMb` : limite média entrant/sortant (Mo, défaut 5).
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
- `channels.zalo.accounts.<id>.groupPolicy` : stratégie de groupe par compte. Présent dans la configuration ; voir [Capabilities](#capabilities) et [Access control (Groups)](#access-control-groups) pour le comportement actuel du Marketplace-bot.
- `channels.zalo.accounts.<id>.groupAllowFrom` : liste d'autorisation des expéditeurs de groupe par compte.
- `channels.zalo.accounts.<id>.webhookUrl` : URL du webhook par compte.
- `channels.zalo.accounts.<id>.webhookSecret` : secret du webhook par compte.
- `channels.zalo.accounts.<id>.webhookPath` : chemin du webhook par compte.
- `channels.zalo.accounts.<id>.proxy` : URL du proxy par compte.

## Connexes

- [Channels Overview](/fr/channels) — tous les canaux pris en charge
- [Pairing](/fr/channels/pairing) — authentification DM et flux d'appairage
- [Groups](/fr/channels/groups) — comportement de chat de groupe et filtrage des mentions
- [Channel Routing](/fr/channels/channel-routing) — routage de session pour les messages
- [Security](/fr/gateway/security) — modèle d'accès et durcissement
