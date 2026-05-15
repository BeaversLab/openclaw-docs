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
- Stable/Bêta : utilise le package npm `@openclaw/whatsapp` sur le tag de publication officiel actuel.

L'installation manuelle reste disponible :

```bash
openclaw plugins install @openclaw/whatsapp
```

Utilisez le package nu pour suivre le tag de publication officiel actuel. Épinglez une version exacte uniquement lorsque vous avez besoin d'une installation reproductible.

Sur Windows, le plugin WhatsApp a besoin de Git sur `PATH` pendant l'installation npm car
l'une de ses dépendances Baileys/libsignal est récupérée depuis une URL git. Installez
Git pour Windows, puis redémarrez le shell et relancez l'installation :

```powershell
winget install --id Git.Git -e
```

Git portable fonctionne également si son répertoire `bin` est dans `PATH`.

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/fr/channels/pairing">
    La stratégie de DM par défaut est l'appariement pour les expéditeurs inconnus.
  </Card>
  <Card title="Dépannage de canal" icon="wrench" href="/fr/channels/troubleshooting">
    Playbooks de diagnostic et de réparation multi-canaux.
  </Card>
  <Card title="Configuration du Gateway" icon="settings" href="/fr/gateway/configuration">
    Modèles et exemples de configuration complète de canal.
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

  <Step title="WhatsAppLier WhatsApp (QR)">

```bash
openclaw channels login --channel whatsapp
```

    Pour un compte spécifique :

````bash
openclaw channels login --channel whatsapp --account work
```WhatsApp

    Pour attacher un répertoire d'authentification WhatsApp Web existant/personnalisé avant la connexion :

```bash
openclaw channels add --channel whatsapp --account work --auth-dir /path/to/wa-auth
openclaw channels login --channel whatsapp --account work
````

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
  <Accordion title="Numéro dédié (recommandé)"WhatsAppOpenClaw>
    C'est le mode opérationnel le plus propre :

    - identité WhatsApp distincte pour OpenClaw
    - listes d'autorisation de DM et limites de routage plus claires
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
    L'intégration prend en charge le mode numéro personnel et écrit une ligne de base adaptée à l'auto-chat :

    - `dmPolicy: "allowlist"`
    - `allowFrom` inclut votre numéro personnel
    - `selfChatMode: true`

    En cours d'exécution, les protections contre l'auto-chat se basent sur le numéro auto lié et `allowFrom`.

  </Accordion>

  <Accordion title="WhatsAppPortée de canal WhatsApp Web uniquement"WhatsApp>
    Le canal de la plateforme de messagerie est basé sur WhatsApp Web (`Baileys`OpenClawWhatsApp) dans l'architecture actuelle des canaux OpenClaw.

    Il n'y a pas de canal de messagerie Twilio WhatsApp distinct dans le registre des canaux de chat intégré.

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

## Hooks de plugin et confidentialité

Les messages entrants WhatsApp peuvent contenir du contenu de message personnel, des numéros de téléphone, des identifiants de groupe, des noms d'expéditeurs et des champs de corrélation de session. Pour cette raison, WhatsApp ne diffuse pas les charges utiles du hook WhatsAppWhatsApp`message_received` entrant aux plugins, sauf si vous optez explicitement pour cela :

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
    `channels.whatsapp.dmPolicy` contrôle l'accès aux chats directs :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    `allowFrom` accepte les numéros au format E.164 (normalisés en interne).

    `allowFrom` est une liste de contrôle d'accès des expéditeurs de DM. Elle ne filtre pas les envois sortants explicites vers les JID de groupe WhatsApp ou les JID de canal `@newsletter`.

    Priorité multi-compte : `channels.whatsapp.accounts.<id>.dmPolicy` (et `allowFrom`) priment sur les paramètres par défaut au niveau du canal pour ce compte.

    Détails du comportement à l'exécution :

    - les appariements sont persistés dans le channel allow-store et fusionnés avec le `allowFrom` configuré
    - l'automatisation planifiée et le destinataire de secours du heartbeat utilisent des cibles de livraison explicites ou le `allowFrom` configuré ; les approbations d'appariement DM ne sont pas des destinataires implicites de cron ou de heartbeat
    - si aucune liste d'autorisation n'est configurée, le numéro auto-lié est autorisé par défaut
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

    Liste d'autorisation de l'expéditeur de secours :

    - si `groupAllowFrom` n'est pas défini, le runtime revient à `allowFrom` si disponible
    - les listes d'autorisation des expéditeurs sont évaluées avant l'activation par mention/réponse

    Remarque : si aucun bloc `channels.whatsapp` n'existe du tout, le repli de stratégie de groupe du runtime est `allowlist` (avec un journal d'avertissement), même si `channels.defaults.groupPolicy` est défini.

  </Tab>

  <Tab title="Mentions + /activation">
    Les réponses de groupe nécessitent une mention par défaut.

    La détection de mention inclut :

    - mentions explicites WhatsApp de l'identité du bot
    - modèles de regex de mention configurés (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - transcriptions de notes vocales entrantes pour les messages de groupe autorisés
    - détection implicite de réponse au bot (l'expéditeur de la réponse correspond à l'identité du bot)

    Note de sécurité :

    - la citation/réponse satisfait uniquement le filtrage par mention ; elle n'accorde **pas** l'autorisation de l'expéditeur
    - avec `groupPolicy: "allowlist"`, les expéditeurs non autorisés sont toujours bloqués même s'ils répondent au message d'un utilisateur autorisé

    Commande d'activation au niveau de la session :

    - `/activation mention`
    - `/activation always`

    `activation` met à jour l'état de la session (pas la configuration globale). Il est soumis à la restriction du propriétaire.

  </Tab>
</Tabs>

## Comportement du numéro personnel et de l'auto-chat

Lorsque le numéro personnel lié est également présent dans `allowFrom`, les sauvegardes d'auto-chat WhatsApp s'activent :

- ignorer les accusés de réception pour les tours de chat avec soi-même
- ignorer le comportement de déclenchement automatique par mention-JID qui vous ferait autrement vous pinguer vous-même
- si `messages.responsePrefix` n'est pas défini, les réponses du chat avec soi-même sont par défaut `[{identity.name}]` ou `[openclaw]`

## Normalisation des messages et contexte

<AccordionGroup>
  <Accordion title="Enveloppe entrante + contexte de réponse">
    Les messages entrants WhatsApp sont encapsulés dans l'enveloppe entrante partagée.

    Si une réponse citée existe, le contexte est ajouté sous cette forme :

    ```text
    [Replying to <sender> id:<stanzaId>]
    <quoted body or media placeholder>
    [/Replying]
    ```

    Les champs de métadonnées de réponse sont également renseignés lorsqu'ils sont disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, JID de l'expéditeur/E.164).
    Lorsque la cible de la réponse citée est un média téléchargeable, OpenClaw le sauvegarde via
    le magasin de médias entrant normal et l'expose sous forme de `MediaPath`/`MediaType` afin
    que l'agent puisse inspecter l'image référencée au lieu de voir uniquement
    `<media:image>`.

  </Accordion>

  <Accordion title="Espaces réservés pour les médias et extraction de position/contact">
    Les messages entrants composés uniquement de médias sont normalisés avec des espaces réservés tels que :

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Les notes vocales de groupe autorisées sont transcrites avant le filtrage par mention lorsque le
    corps est uniquement `<media:audio>`, ainsi le fait de prononcer la mention du bot dans la note vocale peut
    déclencher la réponse. Si la transcription ne mentionne toujours pas le bot,
    la transcription est conservée dans l'historique des groupes en attente au lieu de l'espace réservé brut.

    Les corps de localisation utilisent un texte de coordonnées succinct. Les étiquettes/commentaires de localisation et les détails de contact/vCard sont rendus sous forme de métadonnées non fiables délimitées, et non comme texte d'invite en ligne.

  </Accordion>

  <Accordion title="Injection de l'historique de groupe en attente">
    Pour les groupes, les messages non traités peuvent être mis en mémoire tampon et injectés en tant que contexte lorsque le bot est finalement déclenché.

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

    Les tours de conversation avec soi-même (self-chat) ignorent les accusés de lecture même s'ils sont activés globalement.

  </Accordion>
</AccordionGroup>

## Livraison, découpage et médias

<AccordionGroup>
  <Accordion title="Découpage de texte">
    - limite de découpage par défaut : `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - le mode `newline` préfère les limites de paragraphe (lignes vides), puis revient au découpage sécurisé en termes de longueur

  </Accordion>

  <Accordion title="Comportement des médias sortants"Baileys>
    - prend en charge les charges utiles d'image, de vidéo, d'audio (note vocale PTT) et de document
    - les médias audio sont envoyés via la charge utile `audio` de Baileys avec `ptt: true`WhatsApp, afin que les clients WhatsApp l'affichent comme une note vocale appuyer-pour-parler
    - les charges utiles de réponse préservent `audioAsVoice`WhatsApp ; la sortie de note vocale TTS pour WhatsApp reste sur ce chemin PTT même lorsque le fournisseur renvoie du MP3 ou WebM
    - l'audio Ogg/Opus natif est envoyé sous forme de `audio/ogg; codecs=opus` pour la compatibilité des notes vocales
    - l'audio non-Ogg, y compris la sortie MP3/WebM du TTS Microsoft Edge, est transcodé avec `ffmpeg` en Ogg/Opus mono 48 kHz avant la livraison PTT
    - `/tts latest` envoie la dernière réponse de l'assistant sous forme d'une seule note vocale et supprime les envois répétés pour la même réponse ; `/tts chat on|off|default`WhatsApp contrôle le TTS automatique pour la discussion WhatsApp actuelle
    - la lecture des GIF animés est prise en charge via `gifPlayback: true`WhatsApp lors de l'envoi de vidéos
    - les légendes sont appliquées au premier élément média lors de l'envoi de charges utiles de réponse multimédia, à l'exception des notes vocales PTT qui envoient d'abord l'audio et le texte visible séparément car les clients WhatsApp n'affichent pas les légendes de notes vocales de manière cohérente
    - la source du média peut être HTTP(S), `file://` ou des chemins locaux

  </Accordion>

  <Accordion title="Limites de taille des médias et comportement de repli">
    - limite de sauvegarde des médias entrants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - limite d'envoi des médias sortants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - les remplacements par compte utilisent `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - les images sont automatiquement optimisées (redimensionnement/ajustement de la qualité) pour respecter les limites
    - en cas d'échec de l'envoi de média, le repli du premier élément envoie un avertissement textuel au lieu d'abandonner silencieusement la réponse

  </Accordion>
</AccordionGroup>

## Citation de réponse

WhatsApp prend en charge la citation de réponse native, où les réponses sortantes citent visuellement le message entrant. Contrôlez-la avec WhatsApp`channels.whatsapp.replyToMode`.

| Valeur      | Comportement                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `"off"`     | Ne jamais citer ; envoyer en tant que message simple                                                 |
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

`channels.whatsapp.reactionLevel` contrôle l'étendue de l'utilisation des réactions emoji par l'agent sur WhatsApp :

| Niveau        | Réactions d'accusé de réception | Réactions initiées par l'agent | Description                                                               |
| ------------- | ------------------------------- | ------------------------------ | ------------------------------------------------------------------------- |
| `"off"`       | Non                             | Non                            | Aucune réaction                                                           |
| `"ack"`       | Oui                             | Non                            | Réactions d'accusé de réception uniquement (accusé pré-réponse)           |
| `"minimal"`   | Oui                             | Oui (conservateur)             | Accusé de réception + réactions de l'agent avec directives conservatrices |
| `"extensive"` | Oui                             | Oui (encouragé)                | Accusé de réception + réactions de l'agent avec directives encourageantes |

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

WhatsApp prend en charge les réactions d'accusé de réception immédiates lors de la réception entrante via `channels.whatsapp.ackReaction`.
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
- le mode groupe `mentions` réagit aux tours déclenchés par des mentions ; l'activation de groupe `always` agit comme une dérogation pour cette vérification
- WhatsApp utilise `channels.whatsapp.ackReaction` (l'ancien `messages.ackReaction` n'est pas utilisé ici)

## Multi-compte et identifiants

<AccordionGroup>
  <Accordion title="Sélection de compte et valeurs par défaut">
    - les identifiants de compte proviennent de `channels.whatsapp.accounts`
    - sélection de compte par défaut : `default` si présent, sinon le premier identifiant de compte configuré (trié)
    - les identifiants de compte sont normalisés en interne pour la recherche

  </Accordion>

  <Accordion title="Chemins d'accès aux identifiants et compatibilité héritée">
    - chemin d'auth actuel : `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - fichier de sauvegarde : `creds.json.bak`
    - l'authentification par défaut héritée dans `~/.openclaw/credentials/` est toujours reconnue/migrée pour les flux de compte par défaut

  </Accordion>

  <Accordion title="Comportement de déconnexion">
    `openclaw channels logout --channel whatsapp [--account <id>]` efface l'état d'authentification WhatsApp pour ce compte.

    Lorsqu'un Gateway est accessible, la déconnexion arrête d'abord l'écouteur en direct WhatsApp pour le compte sélectionné afin que la session liée ne continue pas à recevoir des messages jusqu'au prochain redémarrage. `openclaw channels remove --channel whatsapp` arrête également l'écouteur en direct avant de désactiver ou de supprimer la configuration du compte.

    Dans les répertoires d'authentification hérités, `oauth.json` est conservé tandis que les fichiers d'authentification Baileys sont supprimés.

  </Accordion>
</AccordionGroup>

## Outils, actions et écritures de configuration

- La prise en charge des outils de l'agent inclut l'action de réaction WhatsApp (`react`).
- Portes d'action (Action gates) :
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Les écritures de configuration initiées par le canal sont activées par défaut (désactiver via `channels.whatsapp.configWrites=false`).

## Dépannage

<AccordionGroup>
  <Accordion title="Non lié (QR requis)">
    Symptôme : l'état du canal signale non lié.

    Correction :

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="Lié mais déconnecté / boucle de reconnexion">
    Symptôme : compte lié avec des déconnexions répétées ou des tentatives de reconnexion.

    Les comptes inactifs peuvent rester connectés au-delà du délai d'expiration normal des messages ; le chien de garde
    redémarre lorsque l'activité de transport de WhatsApp Web s'arrête, que la socket se ferme ou
    que l'activité au niveau de l'application reste silencieuse au-delà de la fenêtre de sécurité prolongée.

    Si les journaux montrent des `status=408 Request Time-out Connection was lost` répétés, ajustez
    les minutages de socket de Baileys sous `web.whatsapp`. Commencez par raccourcir
    `keepAliveIntervalMs` en dessous du délai d'inactivité de votre réseau et en augmentant
    `connectTimeoutMs` sur les liens lents ou sujets aux pertes :

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
    openclaw doctor
    openclaw logs --follow
    ```

    Si `~/.openclaw/logs/whatsapp-health.log` indique `Gateway inactive` mais que
    `openclaw gateway status` et `openclaw channels status --probe` montrent que
    la passerelle et WhatsApp sont en bonne santé, exécutez `openclaw doctor`. Sur Linux, le docteur
    avertit concernant les entrées de crontab héritées qui invoquent encore
    `~/.openclaw/bin/ensure-whatsapp.sh` ; supprimez ces entrées obsolètes avec
    `crontab -e` car cron peut manquer de l'environnement de bus utilisateur systemd et
    faire en sorte que cet ancien script signale incorrectement l'état de santé de la passerelle.

    Si nécessaire, reliez avec `channels login`.

  </Accordion>

  <Accordion title="Le login QR expire derrière un proxy">
    Symptôme : `openclaw channels login --channel whatsapp` échoue avant d'afficher un code QR utilisable avec `status=408 Request Time-out` ou une déconnexion de socket TLS.

    La connexion WhatsApp Web utilise l'environnement proxy standard de l'hôte de la passerelle (`HTTPS_PROXY`, `HTTP_PROXY`, variantes en minuscules, et `NO_PROXY`). Vérifiez que le processus de la passerelle hérite de l'environnement proxy et que `NO_PROXY` ne correspond pas à `mmg.whatsapp.net`.

  </Accordion>

  <Accordion title="Aucun écouteur actif lors de l'envoi">
    Les envois sortants échouent rapidement lorsqu'aucun écouteur de passerelle actif n'existe pour le compte cible.

    Assurez-vous que la passerelle est en cours d'exécution et que le compte est lié.

  </Accordion>

  <Accordion title="WhatsAppLa réponse apparaît dans la transcription mais pas sur WhatsApp"WhatsAppOpenClawBaileysWhatsApp>
    Les lignes de la transcription enregistrent ce que l'agent a généré. La livraison WhatsApp est vérifiée séparément : OpenClaw ne considère une réponse automatique comme envoyée qu'après que Baileys a renvoyé un identifiant de message sortant pour au moins un envoi de texte ou de média visible.

    Les réactions d'accusé de réception sont des reçus indépendants préalables à la réponse. Une réaction réussie ne prouve pas que la réponse textuelle ou média ultérieure a été acceptée par WhatsApp.

    Vérifiez les journaux de la passerelle pour `auto-reply delivery failed` ou `auto-reply was not accepted by WhatsApp provider`.

  </Accordion>

  <Accordion title="Messages de groupe ignorés de manière inattendue">
    Vérifiez dans cet ordre :

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entrées de la liste blanche `groups`
    - filtrage par mention (`requireMention` + modèles de mention)
    - clés en double dans `openclaw.json` (JSON5) : les entrées ultérieures écrasent les précédentes, donc gardez un seul `groupPolicy` par portée

  </Accordion>

  <Accordion title="BunAvertissement d'exécution Bun"WhatsAppBunWhatsAppTelegram>
    Le runtime de la passerelle WhatsApp doit utiliser Node. Bun est signalé comme incompatible pour une opération stable de la passerelle WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Prompts système

WhatsApp prend en charge les prompts système de style Telegram pour les groupes et les chats directs via les cartes WhatsAppTelegram`groups` et `direct`.

Hiérarchie de résolution pour les messages de groupe :

La carte `groups` effective est d'abord déterminée : si le compte définit sa propre `groups`, elle remplace entièrement la carte `groups` racine (pas de fusion profonde). La recherche de prompt s'exécute ensuite sur la carte unique résultante :

1. **Prompt système spécifique au groupe** (`groups["<groupId>"].systemPrompt`) : utilisé lorsque l'entrée spécifique au groupe existe dans la carte **et** que sa clé `systemPrompt` est définie. Si `systemPrompt` est une chaîne vide (`""`), le caractère générique est supprimé et aucun prompt système n'est appliqué.
2. **Prompt système générique de groupe** (`groups["*"].systemPrompt`) : utilisé lorsque l'entrée spécifique au groupe est totalement absente de la carte, ou lorsqu'elle existe mais ne définit aucune clé `systemPrompt`.

Hiérarchie de résolution pour les messages directs :

La carte `direct` effective est d'abord déterminée : si le compte définit sa propre `direct`, elle remplace entièrement la carte `direct` racine (pas de fusion profonde). La recherche de prompt s'exécute ensuite sur la carte unique résultante :

1. **Prompt système spécifique aux directs** (`direct["<peerId>"].systemPrompt`) : utilisé lorsque l'entrée spécifique au pair existe dans la carte **et** que sa clé `systemPrompt` est définie. Si `systemPrompt` est une chaîne vide (`""`), le caractère générique est supprimé et aucun prompt système n'est appliqué.
2. **Prompt système générique pour les directs** (`direct["*"].systemPrompt`) : utilisé lorsque l'entrée spécifique au pair est totalement absente de la carte, ou lorsqu'elle existe mais ne définit aucune clé `systemPrompt`.

<Note>
`dms` reste le compartiment léger de remplacement de l'historique par DM (`dms.<id>.historyLimit`). Les remplacements de prompts se trouvent sous `direct`.
</Note>

**Différence par rapport au comportement multi-compte Telegram :** Dans Telegram, le TelegramTelegram`groups` racine est intentionnellement supprimé pour tous les comptes dans une configuration multi-compte — même les comptes qui ne définissent pas leur propre `groups`WhatsApp — pour empêcher un bot de recevoir des messages de groupe pour les groupes auxquels il n'appartient pas. WhatsApp n'applique pas cette protection : le `groups` racine et le `direct`WhatsApp racine sont toujours hérités par les comptes qui ne définissent pas de substitution au niveau du compte, quel que soit le nombre de comptes configurés. Dans une configuration WhatsApp multi-compte, si vous souhaitez des invites de groupe ou directes par compte, définissez la carte complète sous chaque compte explicitement plutôt que de vous fier aux valeurs par défaut au niveau racine.

Comportement important :

- `channels.whatsapp.groups` est à la fois une carte de configuration par groupe et la liste d'autorisation de groupe au niveau de la conversation. À la portée racine ou du compte, `groups["*"]` signifie « tous les groupes sont admis » pour cette portée.
- N'ajoutez un groupe générique `systemPrompt` que lorsque vous souhaitez déjà que cette portée admette tous les groupes. Si vous souhaitez toujours qu'un ensemble fixe d'ID de groupe soient éligibles, n'utilisez pas `groups["*"]` pour l'invite par défaut. À la place, répétez l'invite sur chaque entrée de groupe explicitement autorisée.
- L'admission de groupe et l'autorisation de l'expéditeur sont des contrôles distincts. `groups["*"]` élargit l'ensemble des groupes qui peuvent atteindre la gestion des groupes, mais n'autorise pas par lui-même chaque expéditeur dans ces groupes. L'accès de l'expéditeur est toujours contrôlé séparément par `channels.whatsapp.groupPolicy` et `channels.whatsapp.groupAllowFrom`.
- `channels.whatsapp.direct` n'a pas le même effet secondaire pour les DMs. `direct["*"]` fournit uniquement une configuration de conversation directe par défaut après qu'un DM a déjà été admis par `dmPolicy` ainsi que `allowFrom` ou les règles du magasin d'appariement.

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

- [Référence de configuration - WhatsApp](WhatsApp/en/gateway/config-channels#whatsapp)

Champs WhatsApp à signal fort :

- accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`, `reactionLevel`
- multi-compte : `accounts.<id>.enabled`, `accounts.<id>.authDir`, remplacements au niveau du compte
- opérations : `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- comportement de la session : `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- prompts : `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## Connexes

- [Appariement](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Sécurité](/fr/gateway/security)
- [Routage de canal](/fr/channels/channel-routing)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)
