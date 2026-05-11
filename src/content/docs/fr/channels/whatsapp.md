---
summary: "Prise en charge du canal WhatsApp, contrôles d'accès, comportement de livraison et opérations"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

Statut : prêt pour la production via WhatsApp Web (Baileys). Le Gateway possède les sessions liées.

## Installer (à la demande)

- Onboarding (`openclaw onboard`) et `openclaw channels add --channel whatsapp`
  invitent à installer le plugin WhatsApp la première fois que vous le sélectionnez.
- `openclaw channels login --channel whatsapp` offre également le flux d'installation lorsque
  le plugin n'est pas encore présent.
- Canal Dev + git checkout : par défaut, le chemin du plugin local.
- Stable/Bêta : par défaut, le package npm `@openclaw/whatsapp`.

L'installation manuelle reste disponible :

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/fr/channels/pairing">
    La stratégie DM par défaut est l'appariement pour les expéditeurs inconnus.
  </Card>
  <Card title="Dépannage de canal" icon="wrench" href="/fr/channels/troubleshooting">
    Manuels de diagnostic et de réparation multi-canaux.
  </Card>
  <Card title="Configuration du Gateway" icon="settings" href="/fr/gateway/configuration">
    Modèles et exemples de configuration complète du canal.
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

    Pour attacher un répertoire d'authentification WhatsApp Web existant/personnalisé avant la connexion :

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
```

  </Step>

  <Step title="Démarrer la passerelle">

```bash
openclaw gateway
```

  </Step>

  <Step title="Approuver la première demande d'appariement (si vous utilisez le mode d'appariement)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    Les demandes d'appariement expirent après 1 heure. Les demandes en attente sont limitées à 3 par canal.

  </Step>
</Steps>

<Note>OpenClaw recommande d'exécuter WhatsApp sur un numéro distinct lorsque cela est possible. (Les métadonnées du canal et le flux de configuration sont optimisés pour cette configuration, mais les configurations avec numéro personnel sont également prises en charge.)</Note>

## Modèles de déploiement

<AccordionGroup>
  <Accordion title="Numéro dédié (recommandé)">
    C'est le mode opérationnel le plus propre :

    - identité WhatsApp séparée pour OpenClaw
    - listes d'autorisation de DM et limites de routage plus claires
    - risque réduit de confusion avec l'auto-chat

    Modèle de politique minimal :

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

  <Accordion title="Repli sur numéro personnel">
    L'intégration (Onboarding) prend en charge le mode numéro personnel et écrit une ligne de base compatible avec l'auto-chat :

    - `dmPolicy: "allowlist"`
    - `allowFrom` inclut votre numéro personnel
    - `selfChatMode: true`

    Au moment de l'exécution, les protections contre l'auto-chat se basent sur le numéro auto lié et `allowFrom`.

  </Accordion>

  <Accordion title="Portée de canal WhatsApp Web uniquement">
    Le canal de la plateforme de messagerie est basé sur WhatsApp Web (`Baileys`) dans l'architecture de canal actuelle de OpenClaw.

    Il n'y a pas de canal de messagerie Twilio WhatsApp distinct dans le registre des canaux de chat intégrés.

  </Accordion>
</AccordionGroup>

## Modèle d'exécution

- Gateway possède le socket WhatsApp et la boucle de reconnexion.
- Le chien de garde de reconnexion utilise l'activité de transport WhatsApp Web, et non seulement le volume des messages applicatifs entrants, donc une session de périphérique lié silencieuse n'est pas redémarrée uniquement parce que personne n'a envoyé de message récemment. Une limite de silence applicatif plus longue force tout de même une reconnexion si les trames de transport continuent d'arriver mais qu'aucun message applicatif n'est traité pendant la fenêtre du chien de garde.
- Les envois sortants nécessitent un écouteur WhatsApp actif pour le compte cible.
- Les statuts et les chats de diffusion sont ignorés (`@status`, `@broadcast`).
- Les chats directs utilisent les règles de session DM (`session.dmScope` ; par défaut, `main` regroupe les DMs dans la session principale de l'agent).
- Les sessions de groupe sont isolées (`agent:<agentId>:whatsapp:group:<jid>`).
- Le transport WhatsApp Web respecte les variables d'environnement de proxy standard sur l'hôte de la passerelle (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY` / variantes en minuscules). Préférez la configuration de proxy au niveau de l'hôte aux paramètres de proxy WhatsApp spécifiques au canal.
- Lorsque `messages.removeAckAfterReply` est activé, OpenClaw efface la réaction d'accusé de réception WhatsApp après qu'une réponse visible a été délivrée.

## Points d'extension du plugin et confidentialité

Les messages entrants WhatsApp peuvent contenir du contenu personnel de messages, des numéros de téléphone,
identificateurs de groupe, noms d'expéditeurs et champs de corrélation de session. Pour cette raison,
WhatsApp ne diffuse pas les payloads de hooks `message_received` entrants aux plugins
sauf si vous l'acceptez explicitement :

```json5
{
  channels: {
    whatsapp: {
      pluginHooks: {
        messageReceived: true,
      },
    },
  },
}
```

Vous pouvez limiter l'acceptation à un seul compte :

```json5
{
  channels: {
    whatsapp: {
      accounts: {
        work: {
          pluginHooks: {
            messageReceived: true,
          },
        },
      },
    },
  },
}
```

N'activez cela que pour les plugins auxquels vous faites confiance pour recevoir le contenu
et les identificateurs des messages WhatsApp entrants.

## Contrôle d'accès et activation

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` contrôle l'accès au chat direct :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    `allowFrom` accepte les numéros au format E.164 (normalisés en interne).

    Remplacement multi-compte : `channels.whatsapp.accounts.<id>.dmPolicy` (et `allowFrom`) priment sur les défauts au niveau du canal pour ce compte.

    Détails du comportement à l'exécution :

    - les paires sont persistées dans le stockage d'autorisation du canal et fusionnées avec les `allowFrom` configurés
    - si aucune liste d'autorisation n'est configurée, le numéro auto lié est autorisé par défaut
    - OpenClaw n'associe jamais automatiquement les DM `fromMe` sortants (messages que vous vous envoyez depuis l'appareil lié)

  </Tab>

  <Tab title="Stratégie de groupe + listes d'autorisation">
    L'accès aux groupes comporte deux niveaux :

    1. **Liste d'autorisation d'appartenance au groupe** (`channels.whatsapp.groups`)
       - si `groups` est omis, tous les groupes sont éligibles
       - si `groups` est présent, il agit comme une liste d'autorisation de groupe (`"*"` autorisés)

    2. **Stratégie d'expéditeur de groupe** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open` : liste d'autorisation de l'expéditeur contournée
       - `allowlist` : l'expéditeur doit correspondre à `groupAllowFrom` (ou `*`)
       - `disabled` : bloquer tout le trafic entrant du groupe

    Fallback de la liste d'autorisation de l'expéditeur :

    - si `groupAllowFrom` n'est pas défini, l'exécution revient à `allowFrom` si disponible
    - les listes d'autorisation des expéditeurs sont évaluées avant l'activation par mention/réponse

    Remarque : si aucun bloc `channels.whatsapp` n'existe du tout, le fallback de stratégie de groupe à l'exécution est `allowlist` (avec un journal d'avertissement), même si `channels.defaults.groupPolicy` est défini.

  </Tab>

  <Tab title="Mentions + /activation">
    Les réponses de groupe nécessitent une mention par défaut.

    La détection de mention inclut :

    - les mentions explicites WhatsApp de l'identité du bot
    - les motifs regex de mention configurés (`agents.list[].groupChat.mentionPatterns`, fallback `messages.groupChat.mentionPatterns`)
    - les transcriptions de notes vocales entrantes pour les messages de groupe autorisés
    - la détection implicite de réponse au bot (l'expéditeur de la réponse correspond à l'identité du bot)

    Remarque de sécurité :

    - la citation/réponse satisfait uniquement le filtrage par mention ; elle n'accorde **pas** l'autorisation de l'expéditeur
    - avec `groupPolicy: "allowlist"`, les expéditeurs non autorisés sont toujours bloqués même s'ils répondent au message d'un utilisateur autorisé

    Commande d'activation au niveau de la session :

    - `/activation mention`
    - `/activation always`

    `activation` met à jour l'état de la session (pas la configuration globale). Elle est soumise à la validation par le propriétaire.

  </Tab>
</Tabs>

## Comportement du numéro personnel et de l'auto-chat

Lorsque le numéro personnel lié est également présent dans `allowFrom`, les sauvegardes d'auto-chat WhatsApp s'activent :

- ignorer les accusés de réception pour les tours d'auto-chat
- ignore le comportement de déclenchement automatique des mentions-JID qui vous ferait autrement vous envoyer une notification vous-même
- si `messages.responsePrefix` n'est pas défini, les réponses en auto-chat (self-chat) sont par défaut `[{identity.name}]` ou `[openclaw]`

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

    Les champs de métadonnées de réponse sont également renseignés lorsqu'ils sont disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, expéditeur JID/E.164).

  </Accordion>

  <Accordion title="Espaces réservés pour les médias et extraction de localisation/contact">
    Les messages entrants composés uniquement de médias sont normalisés avec des espaces réservés tels que :

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Les notes vocales de groupe autorisées sont transcrites avant le filtrage par mention lorsque le
    corps contient uniquement `<media:audio>`, ainsi, prononcer la mention du bot dans la note vocale peut
    déclencher la réponse. Si la transcription ne mentionne toujours pas le bot, la
    transcription est conservée dans l'historique du groupe en attente au lieu de l'espace réservé brut.

    Les corps de localisation utilisent un texte de coordonnées concis. Les étiquettes/commentaires de localisation et les détails de contact/vCard sont rendus en tant que métadonnées non fiables clôturées, et non en tant que texte d'invite en ligne.

  </Accordion>

  <Accordion title="Injection de l'historique de groupe en attente">
    Pour les groupes, les messages non traités peuvent être mis en tampon et injectés en tant que contexte lorsque le bot est finalement déclenché.

    - limite par défaut : `50`
    - configuration : `channels.whatsapp.historyLimit`
    - solution de repli : `messages.groupChat.historyLimit`
    - `0` désactive

    Marqueurs d'injection :

    - `[Chat messages since your last reply - for context]`
    - `[Current message - respond to this]`

  </Accordion>

  <Accordion title="Accusés de réception">
    Les accusés de réception sont activés par défaut pour les messages WhatsApp entrants acceptés.

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

    L'auto-chat ignore les accusés de réception même s'ils sont activés globalement.

  </Accordion>
</AccordionGroup>

## Livraison, découpage et médias

<AccordionGroup>
  <Accordion title="Découpage du texte">
    - limite de découpage par défaut : `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - le mode `newline` privilégie les limites de paragraphes (lignes vides), puis revient à un découpage sécurisé en longueur
  </Accordion>

<Accordion title="Comportement des médias sortants">
  - prend en charge les charges utiles d'image, vidéo, audio (note vocale PTT) et document - les fichiers audio sont envoyés via la charge utile `audio` de Baileys avec `ptt: true`, de sorte que les clients WhatsApp l'affichent comme une note vocale push-to-talk - les charges utiles de réponse conservent `audioAsVoice`; la sortie de note vocale TTS pour WhatsApp reste sur ce chemin PTT même
  lorsque le fournisseur renvoie du MP3 ou WebM - l'audio natif Ogg/Opus est envoyé en tant que `audio/ogg; codecs=opus` pour la compatibilité des notes vocales - l'audio non-Ogg, y compris la sortie TTS MP3/WebM de Microsoft Edge, est transcodé avec `ffmpeg` en Ogg/Opus mono 48 kHz avant la livraison PTT - `/tts latest` envoie la dernière réponse de l'assistant sous forme d'une seule note vocale
  et supprime les envois répétitifs pour la même réponse; `/tts chat on|off|default` contrôle le TTS automatique pour la discussion WhatsApp actuelle - la lecture des GIF animés est prise en charge via `gifPlayback: true` lors de l'envoi de vidéos - les légendes sont appliquées au premier élément multimédia lors de l'envoi de charges utiles de réponse multimédia, sauf que les notes vocales PTT
  envoient d'abord l'audio puis le texte visible séparément car les clients WhatsApp n'affichent pas les légendes des notes vocales de manière cohérente - la source multimédia peut être HTTP(S), `file://` ou des chemins locaux
</Accordion>

  <Accordion title="Limites de taille des médias et comportement de repli">
    - limite de sauvegarde des médias entrants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - limite d'envoi des médias sortants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - les remplacements par compte utilisent `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - les images sont automatiquement optimisées (redimensionnement/balayage de la qualité) pour respecter les limites
    - en cas d'échec de l'envoi de média, le repli du premier élément envoie un avertissement textuel au lieu d'abandonner silencieusement la réponse
  </Accordion>
</AccordionGroup>

## Citation lors de la réponse

WhatsApp prend en charge la citation native des réponses, où les réponses sortantes citent visuellement le message entrant. Contrôlez cela avec `channels.whatsapp.replyToMode`.

| Valeur      | Comportement                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `"off"`     | Ne jamais citer ; envoyer comme un message simple                                                    |
| `"first"`   | Citer uniquement le premier bloc de réponse sortant                                                  |
| `"all"`     | Citer chaque bloc de réponse sortant                                                                 |
| `"batched"` | Citer les réponses groupées en file d'attente tout en laissant les réponses immédiates sans citation |

La valeur par défaut est `"off"`. Les remplacements par compte utilisent `channels.whatsapp.accounts.<id>.replyToMode`.

```json5
{
  channels: {
    whatsapp: {
      replyToMode: "first",
    },
  },
}
```

## Niveau de réaction

`channels.whatsapp.reactionLevel` contrôle la mesure dans laquelle l'agent utilise les réactions par emoji sur WhatsApp :

| Niveau        | Réactions d'accusé de réception | Réactions initiées par l'agent | Description                                                                    |
| ------------- | ------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `"off"`       | Non                             | Non                            | Aucune réaction                                                                |
| `"ack"`       | Oui                             | Non                            | Réactions d'accusé de réception uniquement (accusé de réception avant réponse) |
| `"minimal"`   | Oui                             | Oui (conservateur)             | Accusé de réception + réactions de l'agent avec directives conservatrices      |
| `"extensive"` | Oui                             | Oui (encouragé)                | Accusé de réception + réactions de l'agent avec directives encourageantes      |

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

WhatsApp prend en charge les réactions d'accusé de réception immédiates sur la réception entrante via `channels.whatsapp.ackReaction`.
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

- envoyé immédiatement après acceptation du message entrant (avant réponse)
- les échecs sont consignés mais ne bloquent pas la livraison des réponses normales
- le mode de groupe `mentions` réagit aux tours déclenchés par des mentions ; l'activation de groupe `always` agit comme une dérogation pour cette vérification
- WhatsApp utilise `channels.whatsapp.ackReaction` (l'ancien `messages.ackReaction` n'est pas utilisé ici)

## Multi-comptes et identifiants

<AccordionGroup>
  <Accordion title="Sélection et valeurs par défaut du compte">
    - les identifiants de compte proviennent de `channels.whatsapp.accounts`
    - sélection du compte par défaut : `default` si présent, sinon le premier identifiant de compte configuré (trié)
    - les identifiants de compte sont normalisés en interne pour la recherche
  </Accordion>

  <Accordion title="Chemins d'identification et compatibilité avec l'ancienne version">
    - chemin d'authentification actuel : `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - fichier de sauvegarde : `creds.json.bak`
    - l'authentification par défaut de l'ancienne version dans `~/.openclaw/credentials/` est toujours reconnue/migrée pour les flux de compte par défaut
  </Accordion>

  <Accordion title="Comportement de déconnexion">
    `openclaw channels logout --channel whatsapp [--account <id>]` efface l'état d'authentification WhatsApp pour ce compte.

    Dans les répertoires d'authentification de l'ancienne version, `oauth.json` est conservé tandis que les fichiers d'authentification Baileys sont supprimés.

  </Accordion>
</AccordionGroup>

## Outils, actions et écritures de configuration

- La prise en charge des outils par l'agent inclut l'action de réaction WhatsApp (`react`).
- Portes d'action :
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Les écritures de configuration initiées par le canal sont activées par défaut (désactiver via `channels.whatsapp.configWrites=false`).

## Dépannage

<AccordionGroup>
  <Accordion title="Non lié (QR requis)">
    Symptôme : l'état du canal indique non lié.

    Correction :

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="Linked but disconnected / reconnect loop">
    Symptôme : compte lié avec des déconnexions répétées ou des tentatives de reconnexion.

    Les comptes inactifs peuvent rester connectés au-delà du délai d'expiration normal des messages ; le watchdog redémarre lorsque l'activité de transport WhatsApp Web s'arrête, que la socket se ferme ou que l'activité au niveau de l'application reste silencieuse au-delà de la fenêtre de sécurité étendue.

    Correctif :

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    Si nécessaire, reliez avec `channels login`.

  </Accordion>

  <Accordion title="QR login times out behind a proxy">
    Symptôme : `openclaw channels login --channel whatsapp` échoue avant d'afficher un code QR utilisable avec `status=408 Request Time-out` ou une déconnexion de socket TLS.

    La connexion WhatsApp Web utilise l'environnement proxy standard de l'hôte de la passerelle (`HTTPS_PROXY`, `HTTP_PROXY`, variantes en minuscules et `NO_PROXY`). Vérifiez que le processus de la passerelle hérite des variables d'environnement du proxy et que `NO_PROXY` ne correspond pas à `mmg.whatsapp.net`.

  </Accordion>

  <Accordion title="No active listener when sending">
    Les envois sortants échouent rapidement lorsqu'aucun écouteur de passerelle actif n'existe pour le compte cible.

    Assurez-vous que la passerelle est en cours d'exécution et que le compte est lié.

  </Accordion>

  <Accordion title="Group messages unexpectedly ignored">
    Vérifiez dans cet ordre :

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entrées de liste d'autorisation `groups`
    - filtrage par mention (`requireMention` + modèles de mention)
    - clés en double dans `openclaw.json` (JSON5) : les entrées ultérieures remplacent les précédentes, donc gardez un seul `groupPolicy` par portée

  </Accordion>

  <Accordion title="Bun runtime warning">
    Le runtime de la passerelle WhatsApp devrait utiliser Node. Bun est signalé comme incompatible pour un fonctionnement stable de la passerelle WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## System prompts

WhatsApp prend en charge les invites système de style Telegram pour les groupes et les discussions directes via les cartes `groups` et `direct`.

Hiérarchie de résolution pour les messages de groupe :

La carte `groups` effective est déterminée en premier : si le compte définit sa propre carte `groups`, elle remplace entièrement la carte racine `groups` (pas de fusion profonde). La recherche d'invite s'exécute ensuite sur la carte unique résultante :

1. **Invite système spécifique au groupe** (`groups["<groupId>"].systemPrompt`) : utilisée lorsque l'entrée de groupe spécifique existe dans la carte **et** que sa clé `systemPrompt` est définie. Si `systemPrompt` est une chaîne vide (`""`), le caractère générique est supprimé et aucune invite système n'est appliquée.
2. **Invite système générique de groupe** (`groups["*"].systemPrompt`) : utilisée lorsque l'entrée de groupe spécifique est totalement absente de la carte, ou lorsqu'elle existe mais ne définit aucune clé `systemPrompt`.

Hiérarchie de résolution pour les messages directs :

La carte `direct` effective est déterminée en premier : si le compte définit sa propre carte `direct`, elle remplace entièrement la carte racine `direct` (pas de fusion profonde). La recherche d'invite s'exécute ensuite sur la carte unique résultante :

1. **Invite système spécifique au direct** (`direct["<peerId>"].systemPrompt`) : utilisée lorsque l'entrée de pair spécifique existe dans la carte **et** que sa clé `systemPrompt` est définie. Si `systemPrompt` est une chaîne vide (`""`), le caractère générique est supprimé et aucune invite système n'est appliquée.
2. **Invite système générique de direct** (`direct["*"].systemPrompt`) : utilisée lorsque l'entrée de pair spécifique est totalement absente de la carte, ou lorsqu'elle existe mais ne définit aucune clé `systemPrompt`.

<Note>
`dms` reste le compartiment de remplacement léger de l'historique par DM (`dms.<id>.historyLimit`). Les remplacements de l'invite se trouvent sous `direct`.
</Note>

**Différence avec le comportement multi-compte de Telegram :** Dans Telegram, le `groups` racine est intentionnellement supprimé pour tous les comptes dans une configuration multi-compte — y compris les comptes qui ne définissent pas leur propre `groups` — pour empêcher un bot de recevoir des messages de groupe pour les groupes auxquels il n'appartient pas. Telegram n'applique pas cette garde : le `groups` racine et le `direct` racine sont toujours hérités par les comptes qui ne définissent pas de substitution au niveau du compte, quel que soit le nombre de comptes configurés. Dans une configuration Telegram multi-compte, si vous souhaitez des invites de groupe ou directes par compte, définissez la carte complète sous chaque compte explicitement plutôt que de vous fier aux valeurs par défaut au niveau racine.

Comportement important :

- `channels.whatsapp.groups` est à la fois une carte de configuration par groupe et la liste d'autorisation de groupe au niveau du chat. À la portée racine ou du compte, `groups["*"]` signifie « tous les groupes sont admis » pour cette portée.
- N'ajoutez un groupe générique `systemPrompt` que lorsque vous souhaitez déjà que cette portée admette tous les groupes. Si vous souhaitez toujours qu'un ensemble fixe d'ID de groupe soient éligibles, n'utilisez pas `groups["*"]` pour l'invite par défaut. Au lieu de cela, répétez l'invite sur chaque entrée de groupe explicitement autorisée.
- L'admission de groupe et l'autorisation de l'expéditeur sont des vérifications distinctes. `groups["*"]` élargit l'ensemble des groupes qui peuvent atteindre la gestion de groupe, mais il n'autorise pas par lui-même chaque expéditeur dans ces groupes. L'accès de l'expéditeur est toujours contrôlé séparément par `channels.whatsapp.groupPolicy` et `channels.whatsapp.groupAllowFrom`.
- `channels.whatsapp.direct` n'a pas le même effet secondaire pour les DMs. `direct["*"]` fournit uniquement une configuration de chat direct par défaut après qu'un DM a déjà été admis par `dmPolicy` plus `allowFrom` ou les règles de magasin d'appairage.

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

- [Référence de configuration - WhatsApp](/fr/gateway/config-channels#whatsapp)

Champs WhatsApp à signal fort :

- accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-compte : `accounts.<id>.enabled`, `accounts.<id>.authDir`, substitutions au niveau du compte
- opérations : `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- comportement de la session : `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- invites : `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## Connexes

- [Appariement](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Sécurité](/fr/gateway/security)
- [Routage de canal](/fr/channels/channel-routing)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)
