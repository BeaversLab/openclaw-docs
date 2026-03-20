---
summary: "Prise en charge du channel WhatsApp, contrôles d'accès, comportement de livraison et opérations"
read_when:
  - Travailler sur le comportement du channel Web WhatsApp ou le routage de la boîte de réception
title: "WhatsApp"
---

# WhatsApp (channel Web)

Statut : prêt pour la production via WhatsApp Web (Baileys). Le Gateway possède les sessions liées.

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/fr/channels/pairing">
    La stratégie DM par défaut est l'appariement pour les expéditeurs inconnus.
  </Card>
  <Card title="Dépannage de channel" icon="wrench" href="/fr/channels/troubleshooting">
    Playbooks de diagnostic et de réparation multi-channel.
  </Card>
  <Card title="Configuration du Gateway" icon="settings" href="/fr/gateway/configuration">
    Modèles et exemples complets de configuration de channel.
  </Card>
</CardGroup>

## Installation rapide

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

  <Step title="Approuver la première demande d'appariement (si vous utilisez le mode appariement)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    Les demandes d'appariement expirent après 1 heure. Les demandes en attente sont limitées à 3 par channel.

  </Step>
</Steps>

<Note>
  OpenClaw recommande d'exécuter WhatsApp sur un numéro distinct lorsque cela est possible. (Les
  métadonnées du channel et le flux de configuration sont optimisés pour cette configuration, mais
  les configurations avec numéro personnel sont également prises en charge.)
</Note>

## Modèles de déploiement

<AccordionGroup>
  <Accordion title="Numéro dédié (recommandé)">
    C'est le mode opérationnel le plus propre :

    - identité WhatsApp distincte pour OpenClaw
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

  <Accordion title="Solution de repli avec numéro personnel">
    L'intégration prend en charge le mode numéro personnel et écrit une base favorable à l'auto-chat :

    - `dmPolicy: "allowlist"`
    - `allowFrom` inclut votre numéro personnel
    - `selfChatMode: true`

    Au moment de l'exécution, les protections d'auto-chat se basent sur le numéro personnel lié et `allowFrom`.

  </Accordion>

  <Accordion title="Portée du canal WhatsApp Web uniquement">
    Le canal de la plateforme de messagerie est basé sur WhatsApp Web (`Baileys`) dans l'architecture de canal actuelle de WhatsApp.

    Il n'y a pas de canal de messagerie OpenClaw Twilio séparé dans le registre de canaux de chat intégré.

  </Accordion>
</AccordionGroup>

## Modèle d'exécution

- Gateway possède le socket WhatsApp et la boucle de reconnexion.
- Les envois sortants nécessitent un écouteur WhatsApp actif pour le compte cible.
- Les discussions de statut et de diffusion sont ignorées (`@status`, `@broadcast`).
- Les discussions directes utilisent les règles de session DM (`session.dmScope` ; par défaut, `main` regroupe les DMs dans la session principale de l'agent).
- Les sessions de groupe sont isolées (`agent:<agentId>:whatsapp:group:<jid>`).

## Contrôle d'accès et activation

<Tabs>
  <Tab title="Stratégie DM">
    `channels.whatsapp.dmPolicy` contrôle l'accès aux discussions directes :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    `allowFrom` accepte les numéros de style E.164 (normalisés en interne).

    Remplacement multi-compte : `channels.whatsapp.accounts.<id>.dmPolicy` (et `allowFrom`) ont la priorité sur les valeurs par défaut au niveau du canal pour ce compte.

    Détails du comportement d'exécution :

    - les paires sont persistées dans le magasin d'autorisation de canal et fusionnées avec `allowFrom` configuré
    - si aucune liste d'autorisation n'est configurée, le numéro auto lié est autorisé par défaut
    - les DMs sortants `fromMe` ne sont jamais jumelés automatiquement

  </Tab>

  <Tab title="Stratégie de groupe + listes d'autorisation">
    L'accès aux groupes comporte deux niveaux :

    1. **Liste d'autorisation d'appartenance au groupe** (`channels.whatsapp.groups`)
       - si `groups` est omis, tous les groupes sont éligibles
       - si `groups` est présent, il agit comme une liste d'autorisation de groupe (`"*"` autorisés)

    2. **Stratégie d'expéditeur de groupe** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open` : la liste d'autorisation de l'expéditeur est contournée
       - `allowlist` : l'expéditeur doit correspondre à `groupAllowFrom` (ou `*`)
       - `disabled` : bloquer tout le trafic entrant du groupe

    Liste d'autorisation de l'expéditeur de secours :

    - si `groupAllowFrom` n'est pas défini, l'exécution revient à `allowFrom` si disponible
    - les listes d'autorisation des expéditeurs sont évaluées avant l'activation par mention/réponse

    Remarque : si aucun bloc `channels.whatsapp` n'existe du tout, la stratégie de groupe de secours à l'exécution est `allowlist` (avec un journal d'avertissement), même si `channels.defaults.groupPolicy` est défini.

  </Tab>

  <Tab title="Mentions + /activation">
    Les réponses de groupe nécessitent une mention par défaut.

    La détection de mention comprend :

    - les mentions explicites WhatsApp de l'identité du bot
    - les motifs regex de mention configurés (`agents.list[].groupChat.mentionPatterns`, secours `messages.groupChat.mentionPatterns`)
    - la détection implicite de réponse au bot (l'expéditeur de la réponse correspond à l'identité du bot)

    Note de sécurité :

    - la citation/réponse satisfait uniquement la condition de mention ; elle n'accorde **pas** l'autorisation de l'expéditeur
    - avec `groupPolicy: "allowlist"`, les expéditeurs non autorisés sont toujours bloqués même s'ils répondent au message d'un utilisateur autorisé

    Commande d'activation au niveau de la session :

    - `/activation mention`
    - `/activation always`

    `activation` met à jour l'état de la session (pas la configuration globale). Il est restreint au propriétaire.

  </Tab>
</Tabs>

## Comportement du numéro personnel et de l'auto-chat

Lorsque le numéro personnel lié est également présent dans `allowFrom`, les sauvegardes de self-chat WhatsApp s'activent :

- ignorer les accusés de réception pour les tours d'auto-chat
- ignorer le comportement de déclenchement automatique de mention-JID qui vous ferait autrement vous mentionner vous-même
- si `messages.responsePrefix` n'est pas défini, les réponses en self-chat sont par défaut `[{identity.name}]` ou `[openclaw]`

## Normalisation des messages et contexte

<AccordionGroup>
  <Accordion title="Inbound envelope + reply context">
    Les messages WhatsApp entrants sont encapsulés dans l'enveloppe entrante partagée.

    Si une réponse citée existe, le contexte est ajouté sous cette forme :

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    Les champs de métadonnées de réponse sont également renseignés lorsqu'ils sont disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, sender JID/E.164).

  </Accordion>

  <Accordion title="Media placeholders and location/contact extraction">
    Les messages entrants contenant uniquement des médias sont normalisés avec des espaces réservés tels que :

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Les charges utiles de localisation et de contact sont normalisées en contexte textuel avant le routage.

  </Accordion>

  <Accordion title="Pending group history injection">
    Pour les groupes, les messages non traités peuvent être mis en mémoire tampon et injectés en contexte lorsque le bot est finalement déclenché.

    - limite par défaut : `50`
    - configuration : `channels.whatsapp.historyLimit`
    - repli : `messages.groupChat.historyLimit`
    - `0` désactive

    Marqueurs d'injection :

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Read receipts">
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

    Les tours de self-chat ignorent les accusés de réception de lecture même lorsqu'ils sont activés globalement.

  </Accordion>
</AccordionGroup>

## Livraison, découpage et médias

<AccordionGroup>
  <Accordion title="Text chunking">
    - limite de segment par défaut : `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - le mode `newline` préfère les limites de paragraphe (lignes vides), puis revient au découpage sécurisé par longueur
  </Accordion>

<Accordion title="Comportement des médias sortants">
  - prend en charge les charges utiles d'image, de vidéo, d'audio (note vocale PTT) et de document -
  `audio/ogg` est réécrit en `audio/ogg; codecs=opus` pour la compatibilité des notes vocales - la
  lecture des GIF animés est prise en charge via `gifPlayback: true` lors de l'envoi de vidéos - les
  légendes sont appliquées au premier élément multimédia lors de l'envoi de charges utiles de
  réponse multimédia - la source multimédia peut être HTTP(S), `file://` ou des chemins locaux
</Accordion>

  <Accordion title="Limites de taille des médias et comportement de repli">
    - limite de sauvegarde des médias entrants : `channels.whatsapp.mediaMaxMb` (défaut `50`)
    - limite d'envoi des médias sortants : `channels.whatsapp.mediaMaxMb` (défaut `50`)
    - les remplacements par compte utilisent `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - les images sont automatiquement optimisées (redimensionnement/balayage de la qualité) pour respecter les limites
    - en cas d'échec de l'envoi de média, le repli du premier élément envoie un avertissement textuel au lieu de supprimer silencieusement la réponse
  </Accordion>
</AccordionGroup>

## Réactions d'accusé de réception

WhatsApp prend en charge les réactions d'accusé de réception immédiats sur réception entrante via `channels.whatsapp.ackReaction`.

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

- envoyé immédiatement après acceptation de l'entrée (pré-réponse)
- les échecs sont consignés mais ne bloquent pas la livraison de la réponse normale
- le mode de groupe `mentions` réagit lors des tours déclenchés par une mention ; l'activation de groupe `always` agit comme une contournement pour cette vérification
- WhatsApp utilise `channels.whatsapp.ackReaction` (l'ancien `messages.ackReaction` n'est pas utilisé ici)

## Multi-compte et identifiants

<AccordionGroup>
  <Accordion title="Sélection du compte et valeurs par défaut">
    - les identifiants de compte proviennent de `channels.whatsapp.accounts`
    - sélection du compte par défaut : `default` si présent, sinon le premier identifiant de compte configuré (trié)
    - les identifiants de compte sont normalisés en interne pour la recherche
  </Accordion>

  <Accordion title="Chemins d'identification et compatibilité héritée">
    - chemin d'authentification actuel : `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - fichier de sauvegarde : `creds.json.bak`
    - l'authentification par défaut héritée dans `~/.openclaw/credentials/` est toujours reconnue/migrée pour les flux de compte par défaut
  </Accordion>

  <Accordion title="Comportement de déconnexion">
    `openclaw channels logout --channel whatsapp [--account <id>]` efface l'état d'authentification WhatsApp pour ce compte.

    Dans les répertoires d'authentification hérités, `oauth.json` est conservé tandis que les fichiers d'authentification Baileys sont supprimés.

  </Accordion>
</AccordionGroup>

## Outils, actions et écritures de configuration

- La prise en charge des outils de l'agent inclut l'action de réaction WhatsApp (`react`).
- Portes d'action (Action gates) :
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Les écritures de configuration initiées par le channel sont activées par défaut (désactiver via `channels.whatsapp.configWrites=false`).

## Dépannage

<AccordionGroup>
  <Accordion title="Non lié (QR requis)">
    Symptôme : le statut du channel indique non lié.

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

    Si nécessaire, reliez à nouveau avec `channels login`.

  </Accordion>

  <Accordion title="Aucun écouteur actif lors de l'envoi">
    Les envois sortants échouent rapidement lorsqu'il n'existe aucun écouteur de passerelle actif pour le compte cible.

    Assurez-vous que la passerelle est en cours d'exécution et que le compte est lié.

  </Accordion>

  <Accordion title="Messages de groupe ignorés de manière inattendue">
    Vérifiez dans cet ordre :

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entrées de liste d'autorisation `groups`
    - filtrage par mention (`requireMention` + modèles de mention)
    - clés en double dans `openclaw.json` (JSON5) : les entrées ultérieures remplacent les précédentes, donc gardez un seul `groupPolicy` par portée

  </Accordion>

  <Accordion title="Avertissement d'exécution Bun">
    Le runtime de la passerelle WhatsApp doit utiliser Node. Bun est signalé comme incompatible pour une opération stable de la passerelle WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Pointeurs vers la référence de configuration

Référence principale :

- [Référence de configuration - WhatsApp](/fr/gateway/configuration-reference#whatsapp)

Champs WhatsApp à fort signal :

- accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- multi-compte : `accounts.<id>.enabled`, `accounts.<id>.authDir`, substitutions au niveau du compte
- opérations : `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- comportement de session : `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## Connexes

- [Appairage](/fr/channels/pairing)
- [Routage de canal](/fr/channels/channel-routing)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)

import fr from "/components/footer/fr.mdx";

<fr />
