---
summary: "Support du channel WhatsApp, contrôles d'accès, comportement de livraison et opérations"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (channel Web)

Statut : prêt pour la production via WhatsApp Web (Baileys). Le Gateway possède les sessions liées.

## Installer (à la demande)

- Onboarding (`openclaw onboard`) et `openclaw channels add --channel whatsapp`
  invitent à installer le plugin WhatsApp la première fois que vous le sélectionnez.
- `openclaw channels login --channel whatsapp` offre également le flux d'installation lorsque
  le plugin n'est pas encore présent.
- Canal Dev + git checkout : valeur par défaut du chemin local du plugin.
- Stable/Beta : utilise par défaut le package npm `@openclaw/whatsapp`.

L'installation manuelle reste disponible :

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/en/channels/pairing">
    La stratégie DM par défaut est l'appariement pour les expéditeurs inconnus.
  </Card>
  <Card title="Résolution de problèmes du channel" icon="wrench" href="/en/channels/troubleshooting">
    Guides de diagnostic et de réparation multi-channel.
  </Card>
  <Card title="Configuration du Gateway" icon="settings" href="/en/gateway/configuration">
    Modèles et exemples complets de configuration de channel.
  </Card>
</CardGroup>

## Configuration rapide

<Steps>
  <Step title="Configure WhatsApp access policy">

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+15551234567"],
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

  </Step>

  <Step title="Lier WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    Pour un compte spécifique :

```bash
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="Démarrer la passerelle">

```bash
openclaw gateway
```

  </Step>

  <Step title="Approuver la première demande d'appariement (si le mode appariement est utilisé)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    Les demandes d'appariement expirent après 1 heure. Les demandes en attente sont limitées à 3 par channel.

  </Step>
</Steps>

<Note>OpenClaw recommande d'exécuter WhatsApp sur un numéro distinct lorsque cela est possible. (Les métadonnées du canal et le flux de configuration sont optimisés pour cette configuration, mais les configurations avec numéro personnel sont également prises en charge.)</Note>

## Modèles de déploiement

<AccordionGroup>
  <Accordion title="Numéro dédié (recommandé)">
    C'est le mode opérationnel le plus propre :

    - identité WhatsApp séparée pour OpenClaw
    - listes d'autorisation DM et limites de routage plus claires
    - risque réduit de confusion avec l'auto-chat

    Modèle de stratégie minimal :

    ```json5
    {
      channels: {
        whatsapp: {
          dmPolicy: "allowlist",
          allowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Repli du numéro personnel">
    L'intégration prend en charge le mode numéro personnel et écrit une ligne de base adaptée à l'auto-discussion :

    - `dmPolicy: "allowlist"`
    - `allowFrom` inclut votre numéro personnel
    - `selfChatMode: true`

    À l'exécution, les protections de l'auto-discussion reposent sur le numéro personnel lié et `allowFrom`.

  </Accordion>

  <Accordion title="Périmètre du channel WhatsApp Web uniquement">
    Le channel de la plateforme de messagerie est basé sur WhatsApp Web (`Baileys`) dans l'architecture de channel actuelle de WhatsApp.

    Il n'y a pas de channel de messagerie Twilio OpenClaw distinct dans le registre de canaux de discussion intégré.

  </Accordion>
</AccordionGroup>

## Modèle d'exécution

- Gateway possède le socket WhatsApp et la boucle de reconnexion.
- Les envois sortants nécessitent un écouteur WhatsApp actif pour le compte cible.
- Les discussions de statut et les discussions de diffusion sont ignorées (`@status`, `@broadcast`).
- Les discussions directes utilisent les règles de session DM (`session.dmScope` ; `main` par défaut regroupe les DMs dans la session principale de l'agent).
- Les sessions de groupe sont isolées (`agent:<agentId>:whatsapp:group:<jid>`).

## Contrôle d'accès et activation

<Tabs>
  <Tab title="Stratégie DM">
    `channels.whatsapp.dmPolicy` contrôle l'accès aux discussions directes :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    `allowFrom` accepte les numéros de style E.164 (normalisés en interne).

    Remplacement multi-compte : `channels.whatsapp.accounts.<id>.dmPolicy` (et `allowFrom`) ont la priorité sur les défauts au niveau du channel pour ce compte.

    Détails du comportement à l'exécution :

    - les appariements sont conservés dans le magasin d'autorisation du channel et fusionnés avec `allowFrom` configuré
    - si aucune liste d'autorisation n'est configurée, le numéro personnel lié est autorisé par défaut
    - les DMs `fromMe` sortants ne sont jamais appariés automatiquement

  </Tab>

  <Tab title="Stratégie de groupe + listes d'autorisation">
    L'accès aux groupes comporte deux couches :

    1. **Liste d'autorisation d'appartenance au groupe** (`channels.whatsapp.groups`)
       - si `groups` est omis, tous les groupes sont éligibles
       - si `groups` est présent, il agit comme une liste d'autorisation de groupe (`"*"` autorisés)

    2. **Stratégie d'expéditeur de groupe** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open` : liste d'autorisation de l'expéditeur contournée
       - `allowlist` : l'expéditeur doit correspondre à `groupAllowFrom` (ou `*`)
       - `disabled` : bloquer tout le trafic entrant du groupe

    Fallback de la liste d'autorisation de l'expéditeur :

    - si `groupAllowFrom` n'est pas défini, le runtime revient à `allowFrom` si disponible
    - les listes d'autorisation des expéditeurs sont évaluées avant l'activation par mention/réponse

    Remarque : si aucun bloc `channels.whatsapp` n'existe du tout, le fallback de la stratégie de groupe du runtime est `allowlist` (avec un journal d'avertissement), même si `channels.defaults.groupPolicy` est défini.

  </Tab>

  <Tab title="Mentions + /activation">
    Les réponses de groupe nécessitent une mention par défaut.

    La détection de mention inclut :

    - les mentions explicites WhatsApp de l'identité du bot
    - les modèles de regex de mention configurés (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - la détection implicite de réponse au bot (l'expéditeur de la réponse correspond à l'identité du bot)

    Note de sécurité :

    - la citation/réponse satisfait uniquement la condition de mention ; elle n'accorde **pas** l'autorisation de l'expéditeur
    - avec `groupPolicy: "allowlist"`, les expéditeurs non autorisés sont toujours bloqués même s'ils répondent au message d'un utilisateur autorisé

    Commande d'activation au niveau de la session :

    - `/activation mention`
    - `/activation always`

    `activation` met à jour l'état de la session (pas la configuration globale). Il est limité au propriétaire.

  </Tab>
</Tabs>

## Comportement du numéro personnel et de l'auto-discussion

Lorsque le numéro personnel lié est également présent dans `allowFrom`, les sauvegardes de self-chat WhatsApp s'activent :

- ignorer les accusés de réception pour les tours d'auto-discussion
- ignorer le comportement de déclenchement automatique par mention-JID qui vous ferait autrement vous mentionner vous-même
- si `messages.responsePrefix` n'est pas défini, les réponses self-chat reviennent par défaut à `[{identity.name}]` ou `[openclaw]`

## Normalisation des messages et contexte

<AccordionGroup>
  <Accordion title="Enveloppe entrante + contexte de réponse">
    Les messages WhatsApp entrants sont enveloppés dans l'enveloppe entrante partagée.

    Si une réponse citée existe, le contexte est ajouté sous cette forme :

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    Les champs de métadonnées de réponse sont également remplis lorsqu'ils sont disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, expéditeur JID/E.164).

  </Accordion>

  <Accordion title="Espaces réservés pour les médias et extraction de localisation/contact">
    Les messages entrants contenant uniquement des médias sont normalisés avec des espaces réservés tels que :

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Les charges utiles de localisation et de contact sont normalisées en contexte textuel avant le routage.

  </Accordion>

  <Accordion title="Injection de l'historique de groupe en attente">
    Pour les groupes, les messages non traités peuvent être mis en tampon et injectés en contexte lorsque le bot est finalement déclenché.

    - limite par défaut : `50`
    - configuration : `channels.whatsapp.historyLimit`
    - repli : `messages.groupChat.historyLimit`
    - `0` désactive

    Marqueurs d'injection :

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Accusés de réception de lecture">
    Les accusés de réception de lecture sont activés par défaut pour les messages WhatsApp entrants acceptés.

    Désactiver globalement :

    ```json5
    {
      channels: {
        whatsapp: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    Remplacement par compte :

    ```json5
    {
      channels: {
        whatsapp: {
          accounts: {
            work: {
              sendReadReceipts: false,
            },
          },
        },
      },
    }
    ```

    Les tours d'auto-discussion ignorent les accusés de réception de lecture même lorsqu'ils sont activés globalement.

  </Accordion>
</AccordionGroup>

## Livraison, découpage et médias

<AccordionGroup>
  <Accordion title="Découpage du texte">
    - limite de découpage par défaut : `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - le mode `newline` privilégie les limites de paragraphe (lignes vides), puis revient au découpage sécurisé en longueur
  </Accordion>

<Accordion title="Comportement des médias sortants">
  - prend en charge les charges utiles d'image, de vidéo, d'audio (note vocale PTT) et de document - `audio/ogg` est réécrit en `audio/ogg; codecs=opus` pour la compatibilité avec les notes vocales - la lecture des GIF animés est prise en charge via `gifPlayback: true` lors de l'envoi de vidéos - les légendes sont appliquées au premier élément média lors de l'envoi de charges utiles de réponse
  multimédia - la source du média peut être HTTP(S), `file://` ou des chemins locaux
</Accordion>

  <Accordion title="Limites de taille des médias et comportement de repli">
    - limite de sauvegarde des médias entrants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - limite d'envoi des médias sortants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - les substitutions par compte utilisent `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - les images sont automatiquement optimisées (redimensionnement/balayage de qualité) pour respecter les limites
    - en cas d'échec de l'envoi de média, le repli sur le premier élément envoie un avertissement textuel au lieu d'abandonner silencieusement la réponse
  </Accordion>
</AccordionGroup>

## Niveau de réaction

`channels.whatsapp.reactionLevel` contrôle l'étendue de l'utilisation des réactions emoji par l'agent sur WhatsApp :

| Niveau        | Réactions d'accusé de réception | Réactions initiées par l'agent | Description                                                               |
| ------------- | ------------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| `"off"`       | Non                             | Non                            | Aucune réaction                                                           |
| `"ack"`       | Oui                             | Non                            | Uniquement les réactions d'accusé de réception (accusé avant réponse)     |
| `"minimal"`   | Oui                             | Oui (conservateur)             | Accusé de réception + réactions de l'agent avec directives conservatives  |
| `"extensive"` | Oui                             | Oui (encouragé)                | Accusé de réception + réactions de l'agent avec directives encourageantes |

Par défaut : `"minimal"`.

Les substitutions par compte utilisent `channels.whatsapp.accounts.<id>.reactionLevel`.

```json5
{
  channels: {
    whatsapp: {
      reactionLevel: "ack",
    },
  },
}
```

## Réactions d'accusé de réception

WhatsApp prend en charge les réactions d'accusé de réception immédiates sur les messages entrants via `channels.whatsapp.ackReaction`.
Les réactions d'accusé de réception sont filtrées par `reactionLevel` — elles sont supprimées lorsque `reactionLevel` est `"off"`.

```json5
{
  channels: {
    whatsapp: {
      ackReaction: {
        emoji: "👀",
        direct: true,
        group: "mentions", // always | mentions | never
      },
    },
  },
}
```

Notes de comportement :

- envoyées immédiatement après acceptation du message entrant (pré-réponse)
- les échecs sont consignés mais ne bloquent pas la livraison des réponses normales
- le mode de groupe `mentions` réagit aux tours déclenchés par des mentions ; l'activation de groupe `always` sert de contournement pour cette vérification
- WhatsApp utilise `channels.whatsapp.ackReaction` (l'ancien `messages.ackReaction` n'est pas utilisé ici)

## Multi-compte et identifiants

<AccordionGroup>
  <Accordion title="Sélection de compte et valeurs par défaut">
    - les identifiants de compte proviennent de `channels.whatsapp.accounts`
    - sélection du compte par défaut : `default` si présent, sinon le premier identifiant de compte configuré (trié)
    - les identifiants de compte sont normalisés en interne pour la recherche
  </Accordion>

  <Accordion title="Chemins d'identifiants et compatibilité legacy">
    - chemin d'auth actuel : `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - fichier de sauvegarde : `creds.json.bak`
    - l'auth par défaut legacy dans `~/.openclaw/credentials/` est toujours reconnu/migré pour les flux de compte par défaut
  </Accordion>

  <Accordion title="Comportement de déconnexion">
    `openclaw channels logout --channel whatsapp [--account <id>]` efface l'état d'authentification WhatsApp pour ce compte.

    Dans les répertoires d'auth legacy, `oauth.json` est conservé tandis que les fichiers d'auth Baileys sont supprimés.

  </Accordion>
</AccordionGroup>

## Outils, actions et écritures de configuration

- La prise en charge des outils d'agent inclut l'action de réaction WhatsApp (`react`).
- Portes d'action (Action gates) :
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Les écritures de configuration initiées par le canal sont activées par défaut (désactiver via `channels.whatsapp.configWrites=false`).

## Dépannage

<AccordionGroup>
  <Accordion title="Non lié (QR requis)">
    Symptôme : le statut du canal indique non lié.

    Correction :

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="Lié mais déconnecté / boucle de reconnexion">
    Symptôme : compte lié avec des déconnexions répétées ou des tentatives de reconnexion.

    Correction :

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    Si nécessaire, reliez avec `channels login`.

  </Accordion>

  <Accordion title="Aucun écouteur actif lors de l'envoi">
    Les envois sortants échouent rapidement lorsqu'aucun écouteur de passerelle actif n'existe pour le compte cible.

    Assurez-vous que la passerelle est en cours d'exécution et que le compte est lié.

  </Accordion>

  <Accordion title="Messages de groupe ignorés de manière inattendue">
    Vérifiez dans cet ordre :

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entrées de la liste blanche `groups`
    - filtrage des mentions (`requireMention` + modèles de mention)
    - clés en double dans `openclaw.json` (JSON5) : les entrées ultérieures remplacent les précédentes, gardez donc un seul `groupPolicy` par portée

  </Accordion>

  <Accordion title="Avertissement d'exécution Bun">
    Le moteur d'exécution de la passerelle WhatsApp doit utiliser Node. Bun est signalé comme incompatible pour un fonctionnement stable de la passerelle WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Pointeurs vers la référence de configuration

Référence principale :

- [Référence de configuration - WhatsApp](/en/gateway/configuration-reference#whatsapp)

Champs WhatsApp à signal fort :

- accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-compte : `accounts.<id>.enabled`, `accounts.<id>.authDir`, substitutions au niveau du compte
- opérations : `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- comportement de session : `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## Connexes

- [Appairage](/en/channels/pairing)
- [Groupes](/en/channels/groups)
- [Sécurité](/en/gateway/security)
- [Routage des canaux](/en/channels/channel-routing)
- [Routage multi-agent](/en/concepts/multi-agent)
- [Dépannage](/en/channels/troubleshooting)
