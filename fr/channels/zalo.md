---
summary: "Statut de support, capacités et configuration du bot Zalo"
read_when:
  - Working on Zalo features or webhooks
title: "Zalo"
---

# Zalo (Bot API)

Statut : expérimental. Les DM sont pris en charge ; la gestion des groupes est disponible avec des contrôles de stratégie de groupe explicites.

## Plugin requis

Zalo est fourni sous forme de plugin et n'est pas inclus dans l'installation de base.

- Installer via CLI : `openclaw plugins install @openclaw/zalo`
- Ou sélectionnez **Zalo** lors de l'intégration et confirmez l'invite d'installation
- Détails : [Plugins](/fr/tools/plugin)

## Configuration rapide (débutant)

1. Installer le plugin Zalo :
   - À partir d'une source extraite : `openclaw plugins install ./extensions/zalo`
   - À partir de npm (si publié) : `openclaw plugins install @openclaw/zalo`
   - Ou choisissez **Zalo** lors de l'intégration et confirmez l'invite d'installation
2. Définir le jeton :
   - Env : `ZALO_BOT_TOKEN=...`
   - Ou config : `channels.zalo.botToken: "..."`.
3. Redémarrez la passerelle (ou terminez l'intégration).
4. L'accès DM est couplé par défaut ; approuvez le code de couplage lors du premier contact.

Configuration minimale :

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing",
    },
  },
}
```

## Ce que c'est

Zalo est une application de messagerie axée sur le Vietnam ; son Bot API permet à la Gateway d'exécuter un bot pour des conversations 1:1.
C'est un bon choix pour le support ou les notifications où vous souhaitez un routage déterministe vers Zalo.

- Un canal Zalo Bot API propriété de la Gateway.
- Routage déterministe : les réponses reviennent vers Zalo ; le modèle ne choisit jamais les canaux.
- Les DM partagent la session principale de l'agent.
- Les groupes sont pris en charge avec des contrôles de stratégie (`groupPolicy` + `groupAllowFrom`) et adoptent par défaut un comportement de liste d'autorisation fermé par échec.

## Configuration (chemin rapide)

### 1) Créer un jeton de bot (Zalo Bot Platform)

1. Allez sur [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) et connectez-vous.
2. Créez un nouveau bot et configurez ses paramètres.
3. Copiez le jeton du bot (format : `12345689:abc-xyz`).

### 2) Configurer le jeton (env ou config)

Exemple :

```json5
{
  channels: {
    zalo: {
      enabled: true,
      botToken: "12345689:abc-xyz",
      dmPolicy: "pairing",
    },
  },
}
```

Option Env : `ZALO_BOT_TOKEN=...` (fonctionne uniquement pour le compte par défaut).

Support multi-compte : utilisez `channels.zalo.accounts` avec des jetons par compte et `name` facultatif.

3. Redémarrez la passerelle. Zalo démarre lorsqu'un jeton est résolu (env ou config).
4. L'accès DM par défaut est le couplage. Approuvez le code lorsque le bot est contacté pour la première fois.

## Fonctionnement (comportement)

- Les messages entrants sont normalisés dans l'enveloppe de canal partagée avec des espaces réservés pour les médias.
- Les réponses sont toujours acheminées vers le même chat Zalo.
- Long-polling par défaut ; mode webhook disponible avec `channels.zalo.webhookUrl`.

## Limites

- Le texte sortant est découpé en morceaux de 2000 caractères (limite de Zalo API).
- Les téléchargements/téléversements de médias sont limités par `channels.zalo.mediaMaxMb` (par défaut 5).
- Le streaming est bloqué par défaut car la limite de 2000 caractères rend le streaming moins utile.

## Contrôle d'accès (DMs)

### Accès DM

- Par défaut : `channels.zalo.dmPolicy = "pairing"`. Les expéditeurs inconnus reçoivent un code de couplage ; les messages sont ignorés jusqu'à approbation (les codes expirent après 1 heure).
- Approuver via :
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- Le couplage est l'échange de jetons par défaut. Détails : [Couplage](/fr/channels/pairing)
- `channels.zalo.allowFrom` accepte les ID utilisateur numériques (aucune recherche de nom d'utilisateur disponible).

## Contrôle d'accès (Groupes)

- `channels.zalo.groupPolicy` contrôle la gestion des messages entrants de groupe : `open | allowlist | disabled`.
- Le comportement par défaut est sécurisé par défaut : `allowlist`.
- `channels.zalo.groupAllowFrom` restreint les ID d'expéditeur qui peuvent déclencher le bot dans les groupes.
- Si `groupAllowFrom` n'est pas défini, Zalo revient à `allowFrom` pour les vérifications d'expéditeur.
- `groupPolicy: "disabled"` bloque tous les messages de groupe.
- `groupPolicy: "open"` autorise n'importe quel membre du groupe (limité aux mentions).
- Note d'exécution : si `channels.zalo` est entièrement manquant, l'exécution revient toujours à `groupPolicy="allowlist"` pour la sécurité.

## Long-polling vs webhook

- Par défaut : long-polling (aucune URL publique requise).
- Mode webhook : définissez `channels.zalo.webhookUrl` et `channels.zalo.webhookSecret`.
  - Le secret du webhook doit comporter entre 8 et 256 caractères.
  - L'URL du webhook doit utiliser HTTPS.
  - Zalo envoie des événements avec l'en-tête `X-Bot-Api-Secret-Token` pour vérification.
  - Le HTTP Gateway gère les requêtes webhook sur `channels.zalo.webhookPath` (correspond par défaut au chemin de l'URL webhook).
  - Les requêtes doivent utiliser `Content-Type: application/json` (ou les types de média `+json`).
  - Les événements en double (`event_name + message_id`) sont ignorés pendant une courte fenêtre de relecture.
  - Le trafic en rafale est limité par chemin/source et peut renvoyer HTTP 429.

**Remarque :** getUpdates (sondage) et webhook sont mutuellement exclusifs selon la documentation de l'API Zalo.

## Types de messages pris en charge

- **Messages texte :** Support complet avec découpage par blocs de 2000 caractères.
- **Messages image :** Télécharger et traiter les images entrantes ; envoyer des images via `sendPhoto`.
- **Autocollants :** Enregistrés mais non entièrement traités (pas de réponse de l'agent).
- **Types non pris en charge :** Enregistrés (par exemple, messages des utilisateurs protégés).

## Capacités

| Fonctionnalité     | Statut                                                                          |
| ------------------ | ------------------------------------------------------------------------------- |
| Messages directs   | ✅ Pris en charge                                                               |
| Groupes            | ⚠️ Pris en charge avec contrôles de stratégie (liste d'autorisation par défaut) |
| Média (images)     | ✅ Pris en charge                                                               |
| Réactions          | ❌ Non pris en charge                                                           |
| Fils de discussion | ❌ Non pris en charge                                                           |
| Sondages           | ❌ Non pris en charge                                                           |
| Commandes natives  | ❌ Non pris en charge                                                           |
| Streaming          | ⚠️ Bloqué (limite de 2000 caractères)                                           |

## Cibles de livraison (CLI/cron)

- Utilisez un identifiant de chat comme cible.
- Exemple : `openclaw message send --channel zalo --target 123456789 --message "hi"`.

## Dépannage

**Le bot ne répond pas :**

- Vérifiez que le jeton est valide : `openclaw channels status --probe`
- Vérifiez que l'expéditeur est approuvé (jumelage ou allowFrom)
- Consultez les journaux de la passerelle : `openclaw logs --follow`

**Le webhook ne reçoit pas d'événements :**

- Assurez-vous que l'URL du webhook utilise HTTPS
- Vérifiez que le jeton secret comporte entre 8 et 256 caractères
- Confirmez que le point de terminaison HTTP de la passerelle est accessible sur le chemin configuré
- Vérifiez que le sondage getUpdates n'est pas en cours d'exécution (ils sont mutuellement exclusifs)

## Référence de configuration (Zalo)

Configuration complète : [Configuration](/fr/gateway/configuration)

Options du fournisseur :

- `channels.zalo.enabled` : activer/désactiver le démarrage du canal.
- `channels.zalo.botToken` : jeton de bot de la plate-forme Zalo Bot.
- `channels.zalo.tokenFile` : lire le jeton depuis un chemin de fichier standard. Les liens symboliques sont rejetés.
- `channels.zalo.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appairage).
- `channels.zalo.allowFrom` : liste d'autorisation de DM (identifiants utilisateurs). `open` nécessite `"*"`. L'assistant demandera les identifiants numériques.
- `channels.zalo.groupPolicy` : `open | allowlist | disabled` (par défaut : liste d'autorisation).
- `channels.zalo.groupAllowFrom` : liste d'autorisation des expéditeurs de groupe (identifiants utilisateurs). Revient à `allowFrom` si non défini.
- `channels.zalo.mediaMaxMb` : limite de média entrant/sortant (Mo, par défaut 5).
- `channels.zalo.webhookUrl` : activer le mode webhook (HTTPS requis).
- `channels.zalo.webhookSecret` : secret du webhook (8-256 caractères).
- `channels.zalo.webhookPath` : chemin du webhook sur le serveur HTTP de la passerelle.
- `channels.zalo.proxy` : URL du proxy pour les requêtes API.

Options multi-comptes :

- `channels.zalo.accounts.<id>.botToken` : jeton par compte.
- `channels.zalo.accounts.<id>.tokenFile` : fichier de jeton standard par compte. Les liens symboliques sont rejetés.
- `channels.zalo.accounts.<id>.name` : nom d'affichage.
- `channels.zalo.accounts.<id>.enabled` : activer/désactiver le compte.
- `channels.zalo.accounts.<id>.dmPolicy` : politique de DM par compte.
- `channels.zalo.accounts.<id>.allowFrom` : liste d'autorisation par compte.
- `channels.zalo.accounts.<id>.groupPolicy` : politique de groupe par compte.
- `channels.zalo.accounts.<id>.groupAllowFrom` : liste d'autorisation des expéditeurs de groupe par compte.
- `channels.zalo.accounts.<id>.webhookUrl` : URL du webhook par compte.
- `channels.zalo.accounts.<id>.webhookSecret` : secret du webhook par compte.
- `channels.zalo.accounts.<id>.webhookPath` : chemin du webhook par compte.
- `channels.zalo.accounts.<id>.proxy` : URL du proxy par compte.

import fr from '/components/footer/fr.mdx';

<fr />
