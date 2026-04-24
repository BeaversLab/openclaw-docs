---
summary: "Prise en charge du channel WhatsApp, contrôles d'accès, comportement de livraison et opérations"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (channel Web)

Statut : prêt pour la production via WhatsApp Web (Baileys). Le Gateway possède les sessions liées.

## Installer (à la demande)

- Onboarding (`openclaw onboard`) et `openclaw channels add --channel whatsapp`
  invitent à installer le plugin WhatsApp la première fois que vous le sélectionnez.
- `openclaw channels login --channel whatsapp` propose également le flux d'installation lorsque
  le plugin n'est pas encore présent.
- Canal Dev + git checkout : valeur par défaut du chemin local du plugin.
- Stable/Beta : correspond par défaut au package npm `@openclaw/whatsapp`.

L'installation manuelle reste disponible :

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/fr/channels/pairing">
    La stratégie DM par défaut est l'appariement pour les expéditeurs inconnus.
  </Card>
  <Card title="Channel troubleshooting" icon="wrench" href="/fr/channels/troubleshooting">
    Manuels de diagnostic et de réparation inter-canaux.
  </Card>
  <Card title="Configuration du Gateway" icon="settings" href="/fr/gateway/configuration">
    Modèles de configuration complets du channel et exemples.
  </Card>
</CardGroup>

## Configuration rapide

<Steps>
  <Step title="Configurer la stratégie d'accès WhatsApp">

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

<Note>OpenClaw recommande d'exécuter WhatsApp sur un numéro distinct lorsque cela est possible. (Les métadonnées du canal et le flux de configuration sont optimisés pour cette configuration, mais les configurations avec numéro personnel sont également prises en charge.)</Note>

## Modèles de déploiement

<AccordionGroup>
  <Accordion title="Numéro dédié (recommandé)">
    C'est le mode opérationnel le plus propre :

    - identité WhatsApp distincte pour OpenClaw
    - listes d'autorisation DM et limites de routage plus claires
    - risque réduit de confusion avec les auto-discussions

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

  <Accordion title="Personal-number fallback">
    Onboarding prend en charge le mode personal-number et écrit une base favorable à l'auto-chat :

    - `dmPolicy: "allowlist"`
    - `allowFrom` inclut votre numéro personnel
    - `selfChatMode: true`

    Au moment de l'exécution, les protections d'auto-chat reposent sur le numéro d'auto-liaison et `allowFrom`.

  </Accordion>

  <Accordion title="Portée du channel WhatsApp Web uniquement">
    Le channel de la plateforme de messagerie est basé sur WhatsApp Web (`Baileys`) dans l'architecture de channel OpenClaw actuelle.

    Il n'y a pas de channel de messagerie Twilio WhatsApp distinct dans le registre de chat-channel intégré.

  </Accordion>
</AccordionGroup>

## Modèle d'exécution

- Gateway possède la socket WhatsApp et la boucle de reconnexion.
- Les envois sortants nécessitent un écouteur WhatsApp actif pour le compte cible.
- Les discussions de statut et de diffusion sont ignorées (`@status`, `@broadcast`).
- Les discussions directes utilisent les règles de session DM (`session.dmScope` ; par défaut, `main` regroupe les DMs dans la session principale de l'agent).
- Les sessions de groupe sont isolées (`agent:<agentId>:whatsapp:group:<jid>`).
- Le transport WhatsApp Web respecte les variables d'environnement proxy standard sur l'hôte de la passerelle (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / variantes en minuscules). Préférez la configuration proxy au niveau de l'hôte aux paramètres proxy WhatsApp spécifiques au channel.

## Contrôle d'accès et activation

<Tabs>
  <Tab title="Stratégie DM">
    `channels.whatsapp.dmPolicy` contrôle l'accès aux chats directs :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    `allowFrom` accepte les numéros de style E.164 (normalisés en interne).

    Remplacement multi-compte : `channels.whatsapp.accounts.<id>.dmPolicy` (et `allowFrom`) ont la priorité sur les paramètres par défaut au niveau du channel pour ce compte.

    Détails du comportement à l'exécution :

    - les appariements sont conservés dans le stockage d'autorisation du channel et fusionnés avec les `allowFrom` configurés
    - si aucune liste blanche n'est configurée, le numéro personnel lié est autorisé par défaut
    - les `fromMe` DM sortants ne sont jamais automatiquement appariés

  </Tab>

  <Tab title="Stratégie de groupe + listes blanches">
    L'accès aux groupes comporte deux couches :

    1. **Liste blanche d'appartenance aux groupes** (`channels.whatsapp.groups`)
       - si `groups` est omis, tous les groupes sont éligibles
       - si `groups` est présent, il agit comme une liste blanche de groupes (`"*"` autorisés)

    2. **Stratégie d'expéditeur de groupe** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open` : la liste blanche des expéditeurs est contournée
       - `allowlist` : l'expéditeur doit correspondre à `groupAllowFrom` (ou `*`)
       - `disabled` : bloquer tout le trafic entrant du groupe

    Liste blanche de secours pour l'expéditeur :

    - si `groupAllowFrom` n'est pas défini, l'exécution revient à `allowFrom` si disponible
    - les listes blanches des expéditeurs sont évaluées avant l'activation par mention/réponse

    Remarque : si aucun bloc `channels.whatsapp` n'existe du tout, la stratégie de groupe de secours à l'exécution est `allowlist` (avec un journal d'avertissement), même si `channels.defaults.groupPolicy` est défini.

  </Tab>

  <Tab title="Mentions + /activation">
    Les réponses de groupe nécessitent une mention par défaut.

    La détection de mention inclut :

    - des mentions WhatsApp explicites de l'identité du bot
    - des modèles de regex de mention configurés (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - une détection implicite de réponse au bot (l'expéditeur de la réponse correspond à l'identité du bot)

    Note de sécurité :

    - la citation/réponse satisfait uniquement le filtrage par mention ; elle ne **donne pas** l'autorisation à l'expéditeur
    - avec `groupPolicy: "allowlist"`, les expéditeurs non autorisés sont toujours bloqués même s'ils répondent au message d'un utilisateur autorisé

    Commande d'activation au niveau de la session :

    - `/activation mention`
    - `/activation always`

    `activation` met à jour l'état de la session (pas la configuration globale). Elle est soumise au contrôle du propriétaire.

  </Tab>
</Tabs>

## Comportement du numéro personnel et de l'auto-chat

Lorsque le numéro auto lié est également présent dans `allowFrom`, les sauvegardes de discussion automatique WhatsApp s'activent :

- ignorer les accusés de réception pour les tours d'auto-chat
- ignore mention-JID auto-trigger behavior that would otherwise ping yourself
- si `messages.responsePrefix` n'est pas défini, les réponses de discussion automatique reviennent par défaut à `[{identity.name}]` ou `[openclaw]`

## Normalisation des messages et contexte

<AccordionGroup>
  <Accordion title="Inbound envelope + reply context">
    Les messages entrants WhatsApp sont encapsulés dans l'enveloppe entrante partagée.

    Si une réponse citée existe, le contexte est ajouté sous cette forme :

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    Les champs de métadonnées de réponse sont également remplis lorsqu'ils sont disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, expéditeur JID/E.164).

  </Accordion>

  <Accordion title="Media placeholders and location/contact extraction">
    Les messages entrants composés uniquement de médias sont normalisés avec des espaces réservés tels que :

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Les charges utiles de localisation et de contact sont normalisées en contexte textuel avant le routage.

  </Accordion>

  <Accordion title="Injection de l'historique de groupe en attente">
    Pour les groupes, les messages non traités peuvent être mis en mémoire tampon et injectés en contexte lorsque le bot est finalement déclenché.

    - limite par défaut : `50`
    - configuration : `channels.whatsapp.historyLimit`
    - repli : `messages.groupChat.historyLimit`
    - `0` désactive

    Marqueurs d'injection :

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Accusés de lecture">
    Les accusés de lecture sont activés par défaut pour les messages WhatsApp entrants acceptés.

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

    Les tours de discussion en auto-contournent les accusés de lecture même lorsqu'ils sont activés globalement.

  </Accordion>
</AccordionGroup>

## Livraison, segmentation et médias

<AccordionGroup>
  <Accordion title="Découpage du texte">
    - limite de découpage par défaut : `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - le mode `newline` privilégie les limites de paragraphes (lignes vides), puis revient au découpage sécurisé en termes de longueur
  </Accordion>

<Accordion title="Comportement des médias sortants">
  - prend en charge les charges utiles d'image, vidéo, audio (note vocale PTT) et document - `audio/ogg` est réécrit en `audio/ogg; codecs=opus` pour la compatibilité des notes vocales - la lecture des GIF animés est prise en charge via `gifPlayback: true` lors de l'envoi de vidéos - les légendes sont appliquées au premier élément média lors de l'envoi de charges utiles de réponse multimédia - la
  source du média peut être HTTP(S), `file://` ou des chemins locaux
</Accordion>

  <Accordion title="Tailles limites des médias et comportement de repli">
    - limite d'enregistrement des médias entrants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - limite d'envoi des médias sortants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - les remplacements par compte utilisent `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - les images sont automatiquement optimisées (redimensionnement/ajustement de la qualité) pour respecter les limites
    - en cas d'échec de l'envoi d'un média, le repli du premier élément envoie un avertissement textuel au lieu de supprimer silencieusement la réponse
  </Accordion>
</AccordionGroup>

## Citation de réponse

WhatsApp prend en charge la citation de réponse native, où les réponses sortantes citent visuellement le message entrant. Contrôlez cela avec `channels.whatsapp.replyToMode`.

| Valeur   | Comportement                                                                                |
| -------- | ------------------------------------------------------------------------------------------- |
| `"auto"` | Citez le message entrant lorsque le provider le prend en charge ; ignorez la citation sinon |
| `"on"`   | Toujours citer le message entrant ; revenir à un envoi simple si la citation est rejetée    |
| `"off"`  | Ne jamais citer ; envoyer comme un message simple                                           |

La valeur par défaut est `"auto"`. Les remplacements par compte utilisent `channels.whatsapp.accounts.<id>.replyToMode`.

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "on",
    },
  },
}
```

## Niveau de réaction

`channels.whatsapp.reactionLevel` contrôle la largeur d'utilisation des réactions emoji par l'agent sur WhatsApp :

| Niveau        | Réactions d'accusé de réception | Réactions initiées par l'agent | Description                                                                      |
| ------------- | ------------------------------- | ------------------------------ | -------------------------------------------------------------------------------- |
| `"off"`       | Non                             | Non                            | Aucune réaction                                                                  |
| `"ack"`       | Oui                             | Non                            | Réactions d'accusé de réception uniquement (accusé de réception pré-réponse)     |
| `"minimal"`   | Oui                             | Oui (conservateur)             | Réactions d'accusé de réception + réactions de l'agent avec guidage conservateur |
| `"extensive"` | Oui                             | Oui (encouragé)                | Réactions d'accusé de réception + réactions de l'agent avec guidage encourageant |

Par défaut : `"minimal"`.

Les remplacements par compte utilisent `channels.whatsapp.accounts.<id>.reactionLevel`.

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

WhatsApp prend en charge les réactions d'accusé de réception immédiates sur réception entrante via `channels.whatsapp.ackReaction`.
Les réactions d'accusé de réception sont conditionnées par `reactionLevel` — elles sont supprimées lorsque `reactionLevel` est `"off"`.

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

Notes sur le comportement :

- envoyées immédiatement après acceptation du message entrant (pré-réponse)
- les échecs sont enregistrés mais ne bloquent pas la livraison des réponses normales
- le mode de groupe `mentions` réagit aux tours déclenchés par des mentions ; l'activation de groupe `always` agit comme une dérogation pour cette vérification
- WhatsApp utilise `channels.whatsapp.ackReaction` (l'ancien `messages.ackReaction` n'est pas utilisé ici)

## Multi-compte et identifiants

<AccordionGroup>
  <Accordion title="Sélection et valeurs par défaut du compte">
    - les identifiants de compte proviennent de `channels.whatsapp.accounts`
    - sélection du compte par défaut : `default` si présent, sinon le premier identifiant de compte configuré (trié)
    - les identifiants de compte sont normalisés en interne pour la recherche
  </Accordion>

  <Accordion title="Chemins d'accès aux identifiants et compatibilité héritée">
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

- La prise en charge des outils de l'agent comprend l'action de réaction WhatsApp (`react`).
- Barrières d'action :
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
    - entrées de liste d'autorisation `groups`
    - filtrage par mentions (`requireMention` + modèles de mention)
    - clés en double dans `openclaw.json` (JSON5) : les entrées ultérieures remplacent les précédentes, donc gardez un seul `groupPolicy` par portée

  </Accordion>

  <Accordion title="Avertissement du runtime Bun">
    Le runtime de la passerelle WhatsApp doit utiliser Node. Bun est signalé comme incompatible pour une opération stable de la passerelle WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Prompts système

WhatsApp prend en charge les prompts système de style Telegram pour les groupes et les chats directs via les cartes `groups` et `direct`.

Hiérarchie de résolution pour les messages de groupe :

La carte `groups` effective est déterminée en premier : si le compte définit sa propre carte `groups`, elle remplace entièrement la carte racine `groups` (pas de fusion profonde). La recherche de prompt s'exécute ensuite sur la carte unique résultante :

1. **Prompt système spécifique au groupe** (`groups["<groupId>"].systemPrompt`) : utilisé si l'entrée de groupe spécifique définit un `systemPrompt`.
2. **Prompt système générique de groupe** (`groups["*"].systemPrompt`) : utilisé lorsque l'entrée de groupe spécifique est absente ou ne définit aucun `systemPrompt`.

Hiérarchie de résolution pour les messages directs :

La carte `direct` effective est déterminée en premier : si le compte définit sa propre carte `direct`, elle remplace entièrement la carte racine `direct` (pas de fusion profonde). La recherche de prompt s'exécute ensuite sur la carte unique résultante :

1. **Invite système spécifique direct** (`direct["<peerId>"].systemPrompt`) : utilisé si l'entrée de pair spécifique définit un `systemPrompt`.
2. **Invite système générique direct** (`direct["*"].systemPrompt`) : utilisé lorsque l'entrée de pair spécifique est absente ou ne définit pas `systemPrompt`.

Remarque : `dms` reste le compartiment de substitution léger de l'historique par DM (`dms.<id>.historyLimit`) ; les substitutions d'invites se trouvent sous `direct`.

**Différence par rapport au comportement multi-compte Telegram :** Dans Telegram, le `groups` racine est intentionnellement supprimé pour tous les comptes dans une configuration multi-compte — même les comptes qui ne définissent pas leur propre `groups` — pour empêcher un bot de recevoir des messages de groupe pour les groupes auxquels il n'appartient pas. WhatsApp n'applique pas cette protection : le `groups` racine et le `direct` racine sont toujours hérités par les comptes qui ne définissent pas de substitution au niveau du compte, quel que soit le nombre de comptes configurés. Dans une configuration WhatsApp multi-compte, si vous souhaitez des invites de groupe ou directes par compte, définissez la carte complète sous chaque compte explicitement plutôt que de vous fier aux valeurs par défaut au niveau racine.

Comportement important :

- `channels.whatsapp.groups` est à la fois une carte de configuration par groupe et la liste d'autorisation de groupe au niveau du chat. À la portée racine ou du compte, `groups["*"]` signifie « tous les groupes sont admis » pour cette portée.
- N'ajoutez un `systemPrompt` de groupe générique que lorsque vous souhaitez déjà que cette portée admette tous les groupes. Si vous souhaitez toujours qu'un ensemble fixe d'ID de groupe soient éligibles, n'utilisez pas `groups["*"]` pour l'invite par défaut. À la place, répétez l'invite sur chaque entrée de groupe explicitement autorisée.
- L'admission de groupe et l'autorisation de l'expéditeur sont des contrôles distincts. `groups["*"]` élargit l'ensemble des groupes qui peuvent atteindre la gestion de groupe, mais cela n'autorise pas par lui-même chaque expéditeur dans ces groupes. L'accès de l'expéditeur est toujours contrôlé séparément par `channels.whatsapp.groupPolicy` et `channels.whatsapp.groupAllowFrom`.
- `channels.whatsapp.direct` n'a pas le même effet secondaire pour les DMs. `direct["*"]` fournit uniquement une configuration de chat direct par défaut après qu'un DM a déjà été admis par `dmPolicy` plus `allowFrom` ou les règles de stockage d'appairage.

Exemple :

```json5
{
  channels: {
    whatsapp: {
      groups: {
        // Use only if all groups should be admitted at the root scope.
        // Applies to all accounts that do not define their own groups map.
        "*": { systemPrompt: "Default prompt for all groups." },
      },
      direct: {
        // Applies to all accounts that do not define their own direct map.
        "*": { systemPrompt: "Default prompt for all direct chats." },
      },
      accounts: {
        work: {
          groups: {
            // This account defines its own groups, so root groups are fully
            // replaced. To keep a wildcard, define "*" explicitly here too.
            "120363406415684625@g.us": {
              requireMention: false,
              systemPrompt: "Focus on project management.",
            },
            // Use only if all groups should be admitted in this account.
            "*": { systemPrompt: "Default prompt for work groups." },
          },
          direct: {
            // This account defines its own direct map, so root direct entries are
            // fully replaced. To keep a wildcard, define "*" explicitly here too.
            "+15551234567": { systemPrompt: "Prompt for a specific work direct chat." },
            "*": { systemPrompt: "Default prompt for work direct chats." },
          },
        },
      },
    },
  },
}
```

## Pointeurs de référence de configuration

Référence principale :

- [Référence de configuration - WhatsApp](/fr/gateway/configuration-reference#whatsapp)

Champs WhatsApp à signal fort :

- accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-compte : `accounts.<id>.enabled`, `accounts.<id>.authDir`, substitutions au niveau du compte
- opérations : `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- comportement de session : `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- prompts : `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## Connexes

- [Appairage](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Sécurité](/fr/gateway/security)
- [Routage de canal](/fr/channels/channel-routing)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)
