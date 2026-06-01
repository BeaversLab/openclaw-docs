---
summary: "Prise en charge du canal WhatsApp, contrôles d'accès, comportement de livraison et opérations"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

Statut : prêt pour la production via WhatsApp Web (Baileys). Le Gateway possède les sessions liées.

## Installer (à la demande)

- L'intégration (`openclaw onboard`) et `openclaw channels add --channel whatsapp`
  vous invitent à installer le plugin WhatsApp la première fois que vous le sélectionnez.
- `openclaw channels login --channel whatsapp` propose également le flux d'installation lorsque
  le plugin n'est pas encore présent.
- Canal Dev + git checkout : par défaut, le chemin du plugin local.
- Stable/Bêta : installe le plugin officiel `@openclaw/whatsapp` depuis ClawHub
  en premier, avec npm comme solution de repli.
- Le runtime WhatsApp est distribué en dehors du package npm principal d'OpenClaw afin que
  les dépendances d'exécution spécifiques à WhatsApp restent avec le plugin externe.

L'installation manuelle reste disponible :

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
```

Utilisez le package nu npm (`@openclaw/whatsapp`) uniquement lorsque vous avez besoin du registre
de repli. Épinglez une version exacte uniquement lorsque vous avez besoin d'une installation reproductible.

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/fr/channels/pairing">
    La stratégie de DM par défaut est l'appariement pour les expéditeurs inconnus.
  </Card>
  <Card title="Dépannage de canal" icon="wrench" href="/fr/channels/troubleshooting">
    Playbooks de diagnostic et de réparation multi-canaux.
  </Card>
  <Card title="Configuration du Gateway" icon="settings" href="/fr/gateway/configuration">
    Modèles et exemples complets de configuration de canal.
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

    La connexion actuelle est basée sur QR. Dans les environnements distants ou sans interface graphique, assurez-vous
    d'avoir un chemin fiable pour transmettre le code QR en direct au téléphone qui va le scanner
    avant de démarrer la connexion.

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

    Les demandes d'appariement expirent après 1 heure. Les demandes en attente sont limitées à 3 par channel.

  </Step>
</Steps>

<Note>OpenClaw recommande d'exécuter WhatsApp sur un numéro séparé si possible. (Les métadonnées du channel et le flux de configuration sont optimisés pour cette configuration, mais les configurations avec numéro personnel sont également prises en charge.)</Note>

<Warning>
  Le flux de configuration actuel de WhatsApp se fait uniquement par QR code. Les QR codes rendus dans le terminal, les captures d'écran, les PDF ou les pièces jointes de chat peuvent expirer ou devenir illisibles lors de leur transmission depuis une machine distante. Pour les hôtes distants/sans interface graphique, privilégiez un chemin de transfert direct d'image QR plutôt qu'une capture
  manuelle via le terminal.
</Warning>

## Modèles de déploiement

<AccordionGroup>
  <Accordion title="Numéro dédié (recommandé)">
    C'est le mode opérationnel le plus propre :

    - identité WhatsApp séparée pour OpenClaw
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

  <Accordion title="Mode de repli avec numéro personnel">
    Onboarding prend en charge le mode numéro personnel et écrit une ligne de base adaptée aux auto-discussions :

    - `dmPolicy: "allowlist"`
    - `allowFrom` inclut votre numéro personnel
    - `selfChatMode: true`

    Au runtime, les protections de l'auto-discussion se basent sur le numéro auto lié et `allowFrom`.

  </Accordion>

  <Accordion title="Périmètre du channel WhatsApp Web uniquement">
    Le channel de la plateforme de messagerie est basé sur WhatsApp Web (`Baileys`) dans l'architecture actuelle des channels OpenClaw.

    Il n'y a pas de channel de messagerie WhatsApp Twilio séparé dans le registre des channels de chat intégrés.

  </Accordion>
</AccordionGroup>

## Modèle d'exécution

- Le Gateway possède le socket WhatsApp et la boucle de reconnexion.
- Le chien de garde de reconnexion utilise l'activité de transport WhatsApp Web, et pas seulement le volume des messages entrants de l'application ; ainsi, une session d'appareil lié silencieuse n'est pas redémarrée uniquement parce que personne n'a envoyé de message récemment. Un plafond de silence d'application plus long force toujours une reconnexion si les trames de transport continuent d'arriver mais qu'aucun message d'application n'est géré pendant la fenêtre du chien de garde ; après une reconnexion transitoire pour une session récemment active, cette vérification de silence d'application utilise le délai d'expiration normal des messages pour la première fenêtre de récupération.
- Les timings du socket Baileys sont explicites sous `web.whatsapp.*` : `keepAliveIntervalMs` contrôle les pings d'application WhatsApp Web, `connectTimeoutMs` contrôle le délai d'expiration de la poignée de main d'ouverture, et `defaultQueryTimeoutMs` contrôle les délais d'expiration des requêtes Baileys.
- Les envois sortants nécessitent un écouteur WhatsApp actif pour le compte cible.
- Les envois de groupe attachent des métadonnées de mention natives pour les jetons `@+<digits>` et `@<digits>` dans le texte et les légendes des médias lorsque le jeton correspond aux métadonnées du participant WhatsApp actuel, y compris les groupes pris en charge par LID.
- Les discussions de statut et de diffusion sont ignorées (`@status`, `@broadcast`).
- Le chien de garde de reconnexion suit l'activité de transport WhatsApp Web, et pas seulement le volume des messages entrants de l'application : les sessions d'appareil lié silencieuses restent actives tant que les trames de transport continuent, mais un arrêt du transport force une reconnexion bien avant le chemin de déconnexion distant ultérieur.
- Les discussions directes utilisent les règles de session DM (`session.dmScope` ; par défaut, `main` réduit les DMs à la session principale de l'agent).
- Les sessions de groupe sont isolées (`agent:<agentId>:whatsapp:group:<jid>`).
- Les chaînes/lettres d'information WhatsApp peuvent être des cibles sortantes explicites avec leur JID natif `@newsletter`. Les envois de lettres d'information sortants utilisent les métadonnées de session de chaîne (`agent:<agentId>:whatsapp:channel:<jid>`) plutôt que la sémantique de session DM.
- Le transport WhatsApp Web respecte les variables d'environnement de proxy standard sur l'hôte de la passerelle (WhatsApp`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`WhatsApp / variantes en minuscules). Préférez la configuration proxy au niveau de l'hôte aux paramètres de proxy WhatsApp spécifiques au canal.
- Lorsque `messages.removeAckAfterReply`OpenClawWhatsApp est activé, OpenClaw efface la réaction d'accusé de réception (ack) WhatsApp une fois qu'une réponse visible est délivrée.

## Prompts d'approbation

WhatsApp peut afficher les prompts d'approbation d'exécution et de plugin avec des réactions `👍` / `👎`. La livraison est
contrôlée par la configuration de transfert d'approbation de premier niveau :

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session",
    },
    plugin: {
      enabled: true,
      mode: "targets",
      targets: [{ channel: "whatsapp", to: "+15551234567" }],
    },
  },
}
```

`approvals.exec` et `approvals.plugin` sont indépendants. L'activation de WhatsApp en tant que channel ne fait que lier
le transport ; elle n'envoie pas de invites d'approbation, sauf si la famille d'approbation correspondante est activée
et routée vers WhatsApp. Le mode session délivre des approbations par emoji natives uniquement pour les approbations
qui proviennent de WhatsApp. Le mode cible utilise le pipeline de transfert partagé pour les cibles WhatsApp
explicites et ne crée pas de ventilateur de DM d'approbateur séparé.

Les réactions d'approbation WhatsApp nécessitent des approbateurs WhatsApp explicites provenant de `allowFrom` ou `"*"`.
`defaultTo` contrôle les cibles de message par défaut ordinaires ; ce n'est pas un approbateur d'approbation. Les commandes manuelles
`/approve` passent toujours par le chemin d'autorisation d'envoi WhatsApp normal avant
la résolution de l'approbation.

## Crochets de plugin et confidentialité

Les messages entrants WhatsApp peuvent contenir du contenu de message personnel, des numéros de téléphone,
des identifiants de groupe, des noms d'expéditeur et des champs de corrélation de session. Pour cette raison,
WhatsApp ne diffuse pas les charges utiles de hook `message_received` entrantes aux plugins
sauf si vous optez explicitement pour :

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

Vous pouvez limiter l'opt-in à un seul compte :

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

N'activez cela que pour les plugins auxquels vous faites confiance pour recevoir le contenu et les identifiants des messages WhatsApp entrants.

## Contrôle d'accès et activation

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` contrôle l'accès aux discussions directes :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    `allowFrom` accepte les numéros au format E.164 (normalisés en interne).

    `allowFrom` est une liste de contrôle d'accès des expéditeurs de DM. Elle ne bloque pas les envois sortants explicites vers les JID de groupe WhatsApp ou les JID de channel `@newsletter`.

    Substitution multi-compte : `channels.whatsapp.accounts.<id>.dmPolicy` (et `allowFrom`) priment sur les paramètres par défaut au niveau du channel pour ce compte.

    Détails du comportement à l'exécution :

    - les appariements sont conservés dans le magasin d'autorisation de channel et fusionnés avec `allowFrom` configuré
    - l'automatisation planifiée et le destinataire de secours du heartbeat utilisent des cibles de livraison explicites ou `allowFrom` configuré ; les approbations d'appariement DM ne sont pas des destinataires implicites pour le cron ou le heartbeat
    - si aucune liste d'autorisation n'est configurée, le numéro personnel lié est autorisé par défaut
    - OpenClaw n'apparie jamais automatiquement les DM sortants `fromMe` (messages que vous vous envoyez depuis l'appareil lié)

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

    Repli de la liste d'autorisation de l'expéditeur :

    - si `groupAllowFrom` n'est pas défini, le moteur d'exécution (runtime) revient à `allowFrom` si disponible
    - les listes d'autorisation des expéditeurs sont évaluées avant l'activation par mention/réponse

    Remarque : si aucun bloc `channels.whatsapp` n'existe du tout, le repli de la stratégie de groupe du runtime est `allowlist` (avec un journal d'avertissement), même si `channels.defaults.groupPolicy` est défini.

  </Tab>

  <Tab title="Mentions + /activation"WhatsApp>
    Les réponses de groupe nécessitent une mention par défaut.

    La détection de mention comprend :

    - les mentions explicites WhatsApp de l'identité du bot
    - les motifs regex de mention configurés (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - les transcriptions de notes vocales entrantes pour les messages de groupe autorisés
    - la détection implicite de réponse au bot (l'expéditeur de la réponse correspond à l'identité du bot)

    Note de sécurité :

    - la citation/réponse satisfait uniquement le filtrage par mention ; elle n'accorde **pas** l'autorisation de l'expéditeur
    - avec `groupPolicy: "allowlist"`, les expéditeurs non autorisés sont toujours bloqués même s'ils répondent à un message d'un utilisateur autorisé

    Commande d'activation au niveau de la session :

    - `/activation mention`
    - `/activation always`

    `activation` met à jour l'état de la session (pas la configuration globale). Il est restreint au propriétaire.

  </Tab>
</Tabs>

## Comportement du numéro personnel et de l'auto-discussion

Lorsque le numéro personnel lié est également présent dans `allowFrom`WhatsApp, les sauvegardes d'auto-discussion WhatsApp s'activent :

- ignorer les accusés de lecture pour les tours de chat avec soi-même
- ignorer le comportement de déclenchement automatique de mention-JID qui vous ferait autrement vous pinguer vous-même
- si `messages.responsePrefix` n'est pas défini, les réponses de chat avec soi-même correspondent par défaut à `[{identity.name}]` ou `[openclaw]`

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

    Les champs de métadonnées de réponse sont également renseignés lorsque disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, JID de l'expéditeur/E.164).
    Lorsque la cible de la réponse citée est un média téléchargeable, OpenClaw l'enregistre via
    le magasin de médias entrant normal et l'expose en tant que `MediaPath`/`MediaType` afin
    que l'agent puisse inspecter l'image référencée au lieu de ne voir que
    `<media:image>`.

  </Accordion>

  <Accordion title="Espaces réservés pour les médias et extraction de localisation/contact">
    Les messages entrants contenant uniquement des médias sont normalisés avec des espaces réservés tels que :

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Les notes vocales autorisées des groupes sont transcrites avant le filtrage par mention lorsque le
    corps est uniquement `<media:audio>`, de sorte que prononcer la mention du bot dans la note vocale peut
    déclencher la réponse. Si la transcription ne mentionne toujours pas le bot, la
    transcription est conservée dans l'historique des groupes en attente au lieu de l'espace réservé brut.

    Les corps de localisation utilisent un texte de coordonnées concis. Les étiquettes/commentaires de localisation et les détails de contact/vCard sont rendus en tant que métadonnées non fiables clôturées, et non en tant que texte d'invite en ligne.

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

  <Accordion title="Accusés de réception"WhatsApp>
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

    Les tours de dialogue avec soi-même ignorent les accusés de réception même s'ils sont activés globalement.

  </Accordion>
</AccordionGroup>

## Livraison, découpage et médias

<AccordionGroup>
  <Accordion title="Découpage du texte">
    - limite de découpage par défaut : `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - le mode `newline` préfère les limites de paragraphe (lignes vides), puis revient au découpage sécurisé en termes de longueur

  </Accordion>

  <Accordion title="Comportement des médias sortants">
    - prend en charge les charges utiles d'image, vidéo, audio (note vocale PTT) et de document
    - les médias audio sont envoyés via la charge utile `audio` de Baileys avec `ptt: true`, de sorte que les clients WhatsApp l'affichent comme une note vocale appuyer-parler (push-to-talk)
    - les charges utiles de réponse préservent `audioAsVoice`; la sortie de note vocale TTS pour WhatsApp reste sur ce chemin PTT même lorsque le provider renvoie du MP3 ou WebM
    - l'audio Ogg/Opus natif est envoyé sous forme de `audio/ogg; codecs=opus` pour la compatibilité des notes vocales
    - l'audio non-Ogg, y compris la sortie MP3/WebM du TTS Microsoft Edge, est transcodé avec `ffmpeg` en Ogg/Opus mono 48 kHz avant la livraison PTT
    - `/tts latest` envoie la dernière réponse de l'assistant en une seule note vocale et supprime les envois répétés pour la même réponse; `/tts chat on|off|default` contrôle le TTS automatique pour la discussion WhatsApp actuelle
    - la lecture des GIF animés est prise en charge via `gifPlayback: true` lors de l'envoi de vidéos
    - `forceDocument` / `asDocument` envoie les images, GIF et vidéos sortants via la charge utile de document Baileys pour éviter la compression des médias WhatsApp tout en préservant le nom de fichier résolu et le type MIME
    - les légendes sont appliquées au premier élément multimédia lors de l'envoi de charges utiles de réponse multimédia, sauf que les notes vocales PTT envoient d'abord l'audio puis le texte visible séparément, car les clients WhatsApp n'affichent pas les légendes de notes vocales de manière cohérente
    - la source multimédia peut être HTTP(S), `file://`, ou des chemins locaux

  </Accordion>

  <Accordion title="Limites de taille des médias et comportement de repli">
    - limite d'enregistrement des médias entrants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - limite d'envoi des médias sortants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - les remplacements par compte utilisent `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - les images sont automatiquement optimisées (redimensionnement/ajustement de la qualité) pour respecter les limites, sauf si `forceDocument` / `asDocument` demande une livraison de document
    - en cas d'échec de l'envoi d'un média, le repli du premier élément envoie un avertissement texte au lieu d'abandonner silencieusement la réponse

  </Accordion>
</AccordionGroup>

## Citation de réponse

WhatsApp prend en charge la citation de réponse native, où les réponses sortantes citent visuellement le message entrant. Contrôlez cela avec `channels.whatsapp.replyToMode`.

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

`channels.whatsapp.reactionLevel` contrôle la manière dont l'agent utilise les réactions emoji sur WhatsApp :

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

WhatsApp prend en charge les réactions d'accusé de réception immédiats sur la réception entrante via WhatsApp`channels.whatsapp.ackReaction`.
Les réactions d'accusé de réception sont contrôlées par `reactionLevel` — elles sont supprimées lorsque `reactionLevel` est `"off"`.

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

- envoyé immédiatement après acceptation de l'entrant (pré-réponse)
- si `ackReaction` est présent sans `emoji`, WhatsApp utilise l'émoji d'identité de l'agent acheminé, par défaut « 👀 » ; omettez `ackReaction` ou définissez `emoji: ""` pour n'envoyer aucune réaction d'accusé de réception
- les échecs sont enregistrés mais ne bloquent pas la livraison des réponses normales
- le mode de groupe `mentions` réagit aux tours déclenchés par des mentions ; l'activation de groupe `always` agit comme une dérogation pour cette vérification
- WhatsApp utilise `channels.whatsapp.ackReaction` (l'ancien `messages.ackReaction` n'est pas utilisé ici)

## Réactions de statut du cycle de vie

Définissez `messages.statusReactions.enabled: true` pour permettre à WhatsApp de remplacer la réaction d'accusé de réception pendant un tour au lieu de laisser un émoji de reçu statique. Lorsqu'elle est activée, OpenClaw utilise le même emplacement de réaction aux messages entrants pour les états du cycle de vie tels que mis en file d'attente, réflexion, activité de l'outil, compactage, terminé et erreur.

```json5
{
  messages: {
    statusReactions: {
      enabled: true,
      emojis: {
        deploy: "🛫",
        build: "🏗️",
        concierge: "💁",
      },
    },
  },
}
```

Notes sur le comportement :

- `channels.whatsapp.ackReaction` contrôle toujours si les réactions de statut sont éligibles pour les messages directs et les groupes.
- La réaction de statut mis en file d'attente utilise le même émoji d'accusé de réception effectif que les réactions d'accusé de réception simples.
- WhatsApp dispose d'un seul emplacement de réaction de bot par message, les mises à jour du cycle de vie remplacent donc la réaction actuelle sur place.
- `messages.removeAckAfterReply: true` efface la réaction de statut finale après la pause configurée pour terminé/erreur.
- Les catégories d'émojis d'outils incluent `tool`, `coding`, `web`, `deploy`, `build` et `concierge`.

## Multi-compte et identifiants

<AccordionGroup>
  <Accordion title="Sélection de compte et valeurs par défaut">
    - les identifiants de compte proviennent de `channels.whatsapp.accounts`
    - sélection du compte par défaut : `default` si présent, sinon le premier identifiant de compte configuré (trié)
    - les identifiants de compte sont normalisés en interne pour la recherche

  </Accordion>

  <Accordion title="Chemins d'accès aux identifiants et compatibilité avec l'ancien système">
    - chemin d'authentification actuel : `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - fichier de sauvegarde : `creds.json.bak`
    - l'authentification par défaut héritée dans `~/.openclaw/credentials/` est toujours reconnue/migrée pour les flux de comptes par défaut

  </Accordion>

  <Accordion title="Comportement de déconnexion">
    `openclaw channels logout --channel whatsapp [--account <id>]`WhatsAppGatewayWhatsApp efface l'état d'authentification WhatsApp pour ce compte.

    Lorsqu'un Gateway est accessible, la déconnexion arrête d'abord l'écouteur WhatsApp en direct pour le compte sélectionné afin que la session liée ne continue pas à recevoir des messages jusqu'au prochain redémarrage. `openclaw channels remove --channel whatsapp` arrête également l'écouteur en direct avant de désactiver ou de supprimer la configuration du compte.

    Dans les répertoires d'authentification hérités, `oauth.json`Baileys est conservé tandis que les fichiers d'authentification Baileys sont supprimés.

  </Accordion>
</AccordionGroup>

## Outils, actions et écritures de configuration

- La prise en charge des outils de l'agent inclut l'action de réaction WhatsApp (WhatsApp`react`).
- Portes d'action (Action gates) :
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

  <Accordion title="Linked but disconnected / reconnect loop"WhatsApp>
    Symptôme : compte lié avec des déconnexions répétées ou des tentatives de reconnexion.

    Les comptes inactifs peuvent rester connectés au-delà du délai d'expiration normal des messages ; le watchdog redémarre lorsque l'activité de transport de WhatsApp Web s'arrête, que la socket se ferme ou que l'activité au niveau de l'application reste silencieuse au-delà de la fenêtre de sécurité étendue.

    Si les journaux montrent des `status=408 Request Time-out Connection was lost`Baileys répétés, ajustez les timings de socket de Baileys sous `web.whatsapp`. Commencez par raccourcir `keepAliveIntervalMs` en dessous du délai d'inactivité de votre réseau et en augmentant `connectTimeoutMs` sur les liaisons lentes ou perturbées :

    ```json5
    {
      web: {
        whatsapp: {
          keepAliveIntervalMs: 15000,
          connectTimeoutMs: 60000,
          defaultQueryTimeoutMs: 60000,
        },
      },
    }
    ```

    Correction :

    ```bash
    openclaw channels status --probe
    openclaw doctor
    openclaw logs --follow
    openclaw gateway status
    ```

    Si la boucle persiste après la correction de la connectivité de l'hôte et des timings, sauvegardez le répertoire d'authentification du compte et reliez ce compte :

    ```bash
    cp -a ~/.openclaw/credentials/whatsapp/<accountId> \
      ~/.openclaw/credentials/whatsapp/<accountId>.bak
    openclaw channels logout --channel whatsapp --account <accountId>
    openclaw channels login --channel whatsapp --account <accountId>
    ```

    Si `~/.openclaw/logs/whatsapp-health.log` indique `Gateway inactive` mais que `openclaw gateway status` et `openclaw channels status --probe`WhatsApp montrent que la passerelle et WhatsApp sont en bonne santé, exécutez `openclaw doctor`Linux. Sur Linux, le docteur avertit concernant les entrées crontab héritées qui appellent encore `~/.openclaw/bin/ensure-whatsapp.sh` ; supprimez ces entrées obsolètes avec `crontab -e` car cron peut manquer de l'environnement utilisateur de systemd et faire rapporter de manière incorrecte l'état de la passerelle par cet ancien script.

    Si nécessaire, reliez avec `channels login`.

  </Accordion>

  <Accordion title="QR login times out behind a proxy">
    Symptôme : `openclaw channels login --channel whatsapp` échoue avant d'afficher un code QR utilisable avec `status=408 Request Time-out`WhatsApp ou une déconnexion de socket TLS.

    La connexion WhatsApp Web utilise l'environnement proxy standard de l'hôte de la passerelle (`HTTPS_PROXY`, `HTTP_PROXY`, variantes en minuscules et `NO_PROXY`). Vérifiez que le processus de la passerelle hérite de l'environnement proxy et que `NO_PROXY` ne correspond pas à `mmg.whatsapp.net`.

  </Accordion>

  <Accordion title="No active listener when sending">
    Les envois sortants échouent rapidement lorsqu'aucun écouteur de passerelle actif n'existe pour le compte cible.

    Assurez-vous que la passerelle est en cours d'exécution et que le compte est lié.

  </Accordion>

  <Accordion title="WhatsAppReply appears in transcript but not in WhatsApp"WhatsAppOpenClawBaileysWhatsApp>
    Les lignes de la transcription enregistrent ce que l'agent a généré. La livraison WhatsApp est vérifiée séparément : OpenClaw ne considère une réponse automatique comme envoyée qu'après que Baileys a renvoyé un ID de message sortant pour au moins un envoi de texte ou de média visible.

    Les réactions d'accusé de réception sont des reçus indépendants précédant la réponse. Une réaction réussie ne prouve pas que la réponse textuelle ou média ultérieure a été acceptée par WhatsApp.

    Vérifiez les journaux de la passerelle pour `auto-reply delivery failed` ou `auto-reply was not accepted by WhatsApp provider`.

  </Accordion>

  <Accordion title="Group messages unexpectedly ignored">
    Vérifiez dans cet ordre :

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entrées de la liste d'autorisation `groups`
    - filtrage par mentions (`requireMention` + modèles de mentions)
    - clés en double dans `openclaw.json` (JSON5) : les entrées ultérieures écrasent les précédentes, gardez donc un seul `groupPolicy` par portée

    Si `channels.whatsapp.groups`WhatsAppOpenClaw est présent, WhatsApp peut toujours observer les messages d'autres groupes, mais OpenClaw les ignore avant le routage de session. Ajoutez le JID du groupe à `channels.whatsapp.groups` ou ajoutez `groups["*"]` pour admettre tous les groupes tout en maintenant l'autorisation de l'expéditeur sous `groupPolicy` et `groupAllowFrom`.

  </Accordion>

  <Accordion title="BunBun runtime warning"WhatsAppBunWhatsAppTelegram>
    L'exécution de la passerelle WhatsApp doit utiliser Node. Bun est signalé comme incompatible pour le fonctionnement stable des passerelles WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Invites du système

WhatsApp prend en charge les invites du système de style Telegram pour les groupes et les discussions directes via les cartes `groups` et `direct`.

Hiérarchie de résolution pour les messages de groupe :

La carte `groups` effective est déterminée en premier : si le compte définit sa propre `groups`, elle remplace entièrement la carte `groups` racine (pas de fusion profonde). La recherche d'invite s'exécute ensuite sur la carte unique résultante :

1. **Invite du système spécifique au groupe** (`groups["<groupId>"].systemPrompt`) : utilisée lorsque l'entrée spécifique au groupe existe dans la carte **et** que sa clé `systemPrompt` est définie. Si `systemPrompt` est une chaîne vide (`""`), le caractère générique est supprimé et aucune invite du système n'est appliquée.
2. **Invite du système générique pour les groupes** (`groups["*"].systemPrompt`) : utilisée lorsque l'entrée spécifique au groupe est totalement absente de la carte, ou lorsqu'elle existe mais ne définit aucune clé `systemPrompt`.

Hiérarchie de résolution pour les messages directs :

La carte `direct` effective est déterminée en premier : si le compte définit sa propre `direct`, elle remplace entièrement la carte `direct` racine (pas de fusion profonde). La recherche d'invite s'exécute ensuite sur la carte unique résultante :

1. **Invite du système spécifique au direct** (`direct["<peerId>"].systemPrompt`) : utilisée lorsque l'entrée spécifique au pair existe dans la carte **et** que sa clé `systemPrompt` est définie. Si `systemPrompt` est une chaîne vide (`""`), le caractère générique est supprimé et aucune invite du système n'est appliquée.
2. **Invite du système générique pour les directs** (`direct["*"].systemPrompt`) : utilisée lorsque l'entrée spécifique au pair est totalement absente de la carte, ou lorsqu'elle existe mais ne définit aucune clé `systemPrompt`.

<Note>
`dms` reste le compartiment de remplacement léger de l'historique par DM (`dms.<id>.historyLimit`). Les remplacements d'invites se trouvent sous `direct`.
</Note>

**Différence avec le comportement multi-compte Telegram :** Sur Telegram, le TelegramTelegram`groups` racine est intentionnellement supprimé pour tous les comptes dans une configuration multi-compte — même les comptes qui ne définissent pas leur propre `groups`WhatsApp — pour empêcher un bot de recevoir des messages de groupe pour les groupes auxquels il n'appartient pas. WhatsApp n'applique pas cette garde : le `groups` racine et le `direct`WhatsApp racine sont toujours hérités par les comptes qui ne définissent pas de substitution au niveau du compte, quel que soit le nombre de comptes configurés. Dans une configuration WhatsApp multi-compte, si vous souhaitez des invites de groupe ou directes par compte, définissez la carte complète sous chaque compte explicitement plutôt que de vous fier aux valeurs par défaut au niveau racine.

Comportement important :

- `channels.whatsapp.groups` est à la fois une carte de configuration par groupe et la liste d'autorisation de groupe au niveau du chat. Soit au niveau racine soit au niveau du compte, `groups["*"]` signifie « tous les groupes sont admis » pour cette portée.
- N'ajoutez un groupe générique `systemPrompt` que lorsque vous souhaitez déjà que cette portée admette tous les groupes. Si vous souhaitez toujours qu'un ensemble fixe d'ID de groupe soient éligibles, n'utilisez pas `groups["*"]` pour l'invite par défaut. À la place, répétez l'invite sur chaque entrée de groupe explicitement autorisée.
- L'admission de groupe et l'autorisation de l'expéditeur sont des contrôles distincts. `groups["*"]` élargit l'ensemble des groupes qui peuvent atteindre la gestion de groupe, mais il n'autorise pas par lui-même chaque expéditeur dans ces groupes. L'accès de l'expéditeur est toujours contrôlé séparément par `channels.whatsapp.groupPolicy` et `channels.whatsapp.groupAllowFrom`.
- `channels.whatsapp.direct` n'a pas le même effet secondaire pour les DMs. `direct["*"]` fournit uniquement une configuration de chat direct par défaut après qu'un DM a déjà été admis par `dmPolicy` plus `allowFrom` ou les règles du magasin d'appairage.

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

## Pointeurs vers la référence de configuration

Référence principale :

- [Référence de configuration - WhatsApp](/fr/gateway/config-channels#whatsapp)

Champs WhatsApp à fort signal :

- accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-compte : `accounts.<id>.enabled`, `accounts.<id>.authDir`, substitutions au niveau du compte
- opérations : `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- comportement de la session : `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- invites : `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## Connexes

- [Appairage](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Sécurité](/fr/gateway/security)
- [Routage de canal](/fr/channels/channel-routing)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)
