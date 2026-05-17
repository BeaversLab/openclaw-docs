---
summary: "WhatsAppPrise en charge du channel WhatsApp, contrôles d'accès, comportement de livraison et opérations"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsAppWhatsApp"
---

Statut : prêt pour la production via WhatsApp Web (Baileys). Le Gateway possède les sessions liées.

## Installer (à la demande)

- Onboarding (`openclaw onboard`) et `openclaw channels add --channel whatsapp`WhatsApp
  invitent à installer le plugin WhatsApp la première fois que vous le sélectionnez.
- `openclaw channels login --channel whatsapp` offre également le flux d'installation lorsque
  le plugin n'est pas encore présent.
- Canal Dev + git checkout : par défaut, le chemin du plugin local.
- Stable/Beta : installe le plugin `@openclaw/whatsapp`ClawHubnpm officiel depuis ClawHub
  en premier, avec npm en secours.
- Le runtime WhatsApp est distribué en dehors du package npm principal d'OpenClaw afin que
  les dépendances d'exécution spécifiques à WhatsApp restent avec le plugin externe.

L'installation manuelle reste disponible :

```bash
openclaw plugins install clawhub:@openclaw/whatsapp
```

Utilisez le package npm brut (npm`@openclaw/whatsapp`) uniquement lorsque vous avez besoin du registre
en secours. Épinglez une version exacte uniquement lorsque vous avez besoin d'une installation reproductible.

<CardGroup cols={3}>
  <Card title="Appairage" icon="link" href="/fr/channels/pairing">
    La stratégie DM par défaut est l'appairage pour les expéditeurs inconnus.
  </Card>
  <Card title="Dépannage de channel" icon="wrench" href="/fr/channels/troubleshooting">
    Playbooks de diagnostic et de réparation multi-channel.
  </Card>
  <Card title="GatewayConfiguration de la Gateway" icon="settings" href="/fr/gateway/configuration">
    Modèles et exemples complets de configuration de channel.
  </Card>
</CardGroup>

## Configuration rapide

<Steps>
  <Step title="WhatsAppConfigurer la stratégie d'accès WhatsApp">

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

  <Step title="Approuver la première demande d'appairage (si vous utilisez le mode d'appairage)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    Les demandes d'appairage expirent après 1 heure. Les demandes en attente sont limitées à 3 par channel.

  </Step>
</Steps>

<Note>OpenClaw recommande d'exécuter WhatsApp sur un numéro séparé si possible. (Les métadonnées du channel et le flux de configuration sont optimisés pour cette configuration, mais les configurations avec numéro personnel sont également prises en charge.)</Note>

## Modèles de déploiement

<AccordionGroup>
  <Accordion title="Numéro dédié (recommandé)">
    C'est le mode opérationnel le plus propre :

    - identité WhatsApp séparée pour OpenClaw
    - listes d'autorisation DM et limites de routage plus claires
    - risque réduit de confusion avec l'auto-chat

    Modèle de politique minimale :

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
    L'intégration prend en charge le mode numéro personnel et écrit une base de référence adaptée à l'auto-chat :

    - `dmPolicy: "allowlist"`
    - `allowFrom` inclut votre numéro personnel
    - `selfChatMode: true`

    Lors de l'exécution, les protections contre l'auto-chat se basent sur le numéro auto lié et `allowFrom`.

  </Accordion>

  <Accordion title="Portée de channel WhatsApp Web uniquement">
    Le channel de la plateforme de messagerie est basé sur WhatsApp Web (`Baileys`) dans l'architecture actuelle des channels OpenClaw.

    Il n'y a pas de channel de messagerie Twilio WhatsApp séparé dans le registre des channels de chat intégrés.

  </Accordion>
</AccordionGroup>

## Modèle d'exécution

- Le Gateway possède le socket WhatsApp et la boucle de reconnexion.
- Le chien de garde de reconnexion utilise l'activité de transport WhatsApp Web, et pas seulement le volume de messages d'application entrants, donc une session de périphérique lié silencieuse n'est pas redémarrée uniquement parce que personne n'a envoyé de message récemment. Une limite de silence d'application plus longue force toujours une reconnexion si les trames de transport continuent d'arriver mais qu'aucun message d'application n'est géré pendant la fenêtre du chien de garde ; après une reconnexion transitoire pour une session récemment active, cette vérification de silence d'application utilise le délai d'expiration normal des messages pour la première fenêtre de récupération.
- Les timings de socket Baileys sont explicites sous `web.whatsapp.*` : `keepAliveIntervalMs` contrôle les pings d'application WhatsApp Web, `connectTimeoutMs` contrôle le délai d'expiration de la poignée de main d'ouverture, et `defaultQueryTimeoutMs` contrôle les délais d'expiration des requêtes Baileys.
- Les envois sortants nécessitent un écouteur WhatsApp actif pour le compte cible.
- Les envois de groupe attachent des métadonnées de mention natives pour les jetons `@+<digits>` et `@<digits>` dans le texte et les légendes de média lorsque le jeton correspond aux métadonnées actuelles du participant WhatsApp, y compris les groupes basés sur LID.
- Les discussions de statut et de diffusion sont ignorées (`@status`, `@broadcast`).
- Le chien de garde de reconnexion suit l'activité de transport WhatsApp Web, et pas seulement le volume de messages d'application entrants : les sessions de périphérique lié silencieuses restent actives tant que les trames de transport continuent, mais un arrêt du transport force une reconnexion bien avant le chemin de déconnexion distant ultérieur.
- Les discussions directes utilisent les règles de session DM (`session.dmScope` ; par défaut, `main` réduit les DMs à la session principale de l'agent).
- Les sessions de groupe sont isolées (`agent:<agentId>:whatsapp:group:<jid>`).
- Les chaînes/newsletters WhatsApp peuvent être des cibles sortantes explicites avec leur JID native `@newsletter`. Les envois de newsletter sortants utilisent les métadonnées de session de chaîne (`agent:<agentId>:whatsapp:channel:<jid>`) plutôt que la sémantique de session DM.
- Le transport WhatsApp Web respecte les variables d'environnement de proxy standard sur l'hôte de la passerelle (WhatsApp`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`WhatsApp / variantes en minuscules). Privilégiez la configuration proxy au niveau de l'hôte par rapport aux paramètres de proxy WhatsApp spécifiques au channel.
- Lorsque `messages.removeAckAfterReply`OpenClawWhatsApp est activé, OpenClaw efface la réaction d'accusé de réception WhatsApp après qu'une réponse visible a été livrée.

## Hooks de plugin et confidentialité

Les messages entrants WhatsApp peuvent contenir du contenu personnel de messages, des numéros de téléphone,
des identifiants de groupe, des noms d'expéditeurs et des champs de corrélation de session. Pour cette raison,
WhatsApp ne diffuse pas les payloads du hook entrant WhatsAppWhatsApp`message_received` aux plugins
à moins que vous ne vous explicitement activiez cette option :

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

Vous pouvez limiter l'activation à un seul compte :

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

N'activez ceci que pour les plugins auxquels vous faites confiance pour recevoir le contenu
et les identifiants des messages WhatsApp entrants.

## Contrôle d'accès et activation

<Tabs>
  <Tab title="Politique DM">
    `channels.whatsapp.dmPolicy` contrôle l'accès aux chats directs :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    `allowFrom` accepte les numéros au format E.164 (normalisés en interne).

    `allowFrom` est une liste de contrôle d'accès pour les expéditeurs de DM. Elle ne filtre pas les envois sortants explicites vers les JID de groupe WhatsApp ou les JID de canal `@newsletter`.

    Priorité multi-compte : `channels.whatsapp.accounts.<id>.dmPolicy` (et `allowFrom`) prévalent sur les paramètres par défaut au niveau du canal pour ce compte.

    Détails du comportement à l'exécution :

    - les appariements sont persistés dans le stockage d'autorisation du canal et fusionnés avec le `allowFrom` configuré
    - l'automatisation planifiée et le destinataire de secours pour le heartbeat utilisent des cibles de livraison explicites ou le `allowFrom` configuré ; les approbations d'appariement DM ne sont pas des destinataires implicites pour le cron ou le heartbeat
    - si aucune liste blanche n'est configurée, le numéro personnel lié est autorisé par défaut
    - OpenClaw n'apparie jamais automatiquement les DM sortants `fromMe` (les messages que vous vous envoyez depuis l'appareil lié)

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

    - si `groupAllowFrom` n'est pas défini, le runtime revient à `allowFrom` si disponible
    - les listes d'autorisation des expéditeurs sont évaluées avant l'activation par mention/réponse

    Remarque : si aucun bloc `channels.whatsapp` n'existe du tout, la stratégie de groupe par défaut du runtime est `allowlist` (avec un journal d'avertissement), même si `channels.defaults.groupPolicy` est défini.

  </Tab>

  <Tab title="Mentions + /activation">
    Les réponses de groupe nécessitent une mention par défaut.

    La détection de mention inclut :

    - les mentions explicites WhatsApp de l'identité du bot
    - les modèles de regex de mention configurés (`agents.list[].groupChat.mentionPatterns`, secours `messages.groupChat.mentionPatterns`)
    - les transcriptions de notes vocales entrantes pour les messages de groupe autorisés
    - la détection implicite de réponse au bot (l'expéditeur de la réponse correspond à l'identité du bot)

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

Lorsque le numéro auto lié est également présent dans `allowFrom`, les sauvegardes d'auto-chat WhatsApp s'activent :

- ignorer les accusés de réception pour les tours de conversation avec soi-même
- ignorer le comportement de déclenchement automatique par mention-JID qui vous ferait autrement vous envoyer une notification (ping) vous-même
- si `messages.responsePrefix` n'est pas défini, les réponses en conversation avec soi-même par défaut sont `[{identity.name}]` ou `[openclaw]`

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
    Lorsque la cible de la réponse citée est un média téléchargeable, OpenClaw le sauvegarde via
    le magasin de média entrant normal et l'expose sous la forme `MediaPath`/`MediaType` afin
    que l'agent puisse inspecter l'image référencée au lieu de voir uniquement
    `<media:image>`.

  </Accordion>

  <Accordion title="Espaces réservés pour les médias et extraction de lieu/contact">
    Les messages entrants composés uniquement de média sont normalisés avec des espaces réservés tels que :

    - `<media:image>`
    - `<media:video>`
    - `<media:audio>`
    - `<media:document>`
    - `<media:sticker>`

    Les notes vocales de groupe autorisées sont transcrites avant le filtrage par mention lorsque le
    corps est uniquement `<media:audio>`, ainsi prononcer la mention du bot dans la note vocale peut
    déclencher la réponse. Si la transcription ne mentionne toujours pas le bot, la
    transcription est conservée dans l'historique du groupe en attente au lieu de l'espace réservé brut.

    Les corps de lieu utilisent un texte de coordonnées concis. Les étiquettes/commentaires de lieu et les détails de contact/vCard sont rendus sous forme de métadonnées non fiables clôturées, et non comme texte d'invite en ligne.

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

  <Accordion title="Accusés de réception">
    Les accusés de réception sont activés par défaut pour les messages entrants WhatsApp acceptés.

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

    Les tours d'auto-discussion (self-chat) ignorent les accusés de réception même lorsqu'ils sont activés globalement.

  </Accordion>
</AccordionGroup>

## Livraison, découpage et média

<AccordionGroup>
  <Accordion title="Découpage de texte">
    - limite de découpage par défaut : `channels.whatsapp.textChunkLimit = 4000`
    - `channels.whatsapp.chunkMode = "length" | "newline"`
    - le mode `newline` préfère les limites de paragraphes (lignes vides), puis revient au découpage sécurisé en termes de longueur

  </Accordion>

  <Accordion title="Comportement des médias sortants">
    - prend en charge les charges utiles d'image, de vidéo, d'audio (note vocale PTT) et de document
    - les médias audio sont envoyés via la charge utile `audio` de Baileys avec `ptt: true`, de sorte que les clients WhatsApp l'affichent comme une note vocale push-to-talk
    - les charges utiles de réponse préservent `audioAsVoice` ; la sortie de note vocale TTS pour WhatsApp reste sur ce chemin PTT même lorsque le fournisseur renvoie du MP3 ou du WebM
    - l'audio Ogg/Opus natif est envoyé en tant que `audio/ogg; codecs=opus` pour la compatibilité des notes vocales
    - l'audio non-Ogg, y compris la sortie MP3/WebM TTS de Microsoft Edge, est transcodé avec `ffmpeg` en Ogg/Opus mono 48 kHz avant la livraison PTT
    - `/tts latest` envoie la dernière réponse de l'assistant comme une seule note vocale et supprime les envois répétés pour la même réponse ; `/tts chat on|off|default` contrôle le TTS automatique pour la discussion WhatsApp actuelle
    - la lecture des GIF animés est prise en charge via `gifPlayback: true` sur les envois vidéo
    - les légendes sont appliquées au premier élément multimédia lors de l'envoi de charges utiles de réponse multimédias, sauf que les notes vocales PTT envoient d'abord l'audio et le texte visible séparément car les clients WhatsApp n'affichent pas les légendes de notes vocales de manière cohérente
    - la source du média peut être HTTP(S), `file://` ou des chemins locaux

  </Accordion>

  <Accordion title="Limites de taille des médias et comportement de repli">
    - limite de sauvegarde des médias entrants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - limite d'envoi des médias sortants : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - les substitutions par compte utilisent `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - les images sont automatiquement optimisées (redimensionnement/balayage de la qualité) pour respecter les limites
    - en cas d'échec de l'envoi de média, le repli du premier élément envoie un avertissement texte au lieu de supprimer silencieusement la réponse

  </Accordion>
</AccordionGroup>

## Citation de réponse

WhatsApp prend en charge la citation de réponse native, où les réponses sortantes citent visuellement le message entrant. Contrôlez-la avec `channels.whatsapp.replyToMode`.

| Valeur      | Comportement                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| `"off"`     | Ne jamais citer ; envoyer comme un message simple                                                    |
| `"first"`   | Citer uniquement le premier bloc de réponse sortante                                                 |
| `"all"`     | Citer chaque bloc de réponse sortante                                                                |
| `"batched"` | Citer les réponses groupées en file d'attente tout en laissant les réponses immédiates sans citation |

La valeur par défaut est `"off"`. Les substitutions par compte utilisent `channels.whatsapp.accounts.<id>.replyToMode`.

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

| Niveau        | Réactions d'accusé de réception | Réactions initiées par l'agent | Description                                                                  |
| ------------- | ------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| `"off"`       | Non                             | Non                            | Aucune réaction                                                              |
| `"ack"`       | Oui                             | Non                            | Réactions d'accusé de réception uniquement (accusé de réception pré-réponse) |
| `"minimal"`   | Oui                             | Oui (conservateur)             | Accusé de réception + réactions de l'agent avec directives conservatrices    |
| `"extensive"` | Oui                             | Oui (encouragé)                | Accusé de réception + réactions de l'agent avec directives encourageantes    |

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

WhatsApp prend en charge les réactions d'accusé de réception immédiats sur la réception entrante via `channels.whatsapp.ackReaction`.
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
- les échecs sont enregistrés mais ne bloquent pas la livraison des réponses normales
- en mode groupe `mentions`, il réagit lors des tours déclenchés par des mentions ; l'activation de groupe `always` agit comme une contournement pour cette vérification
- WhatsApp utilise `channels.whatsapp.ackReaction` (l'ancien `messages.ackReaction` n'est pas utilisé ici)

## Multi-compte et identifiants

<AccordionGroup>
  <Accordion title="Sélection et valeurs par défaut du compte">
    - les identifiants de compte proviennent de `channels.whatsapp.accounts`
    - sélection du compte par défaut : `default` si présent, sinon le premier identifiant de compte configuré (trié)
    - les identifiants de compte sont normalisés en interne pour la recherche

  </Accordion>

  <Accordion title="Chemins d'identification et compatibilité avec l'ancienne version">
    - chemin d'auth actuel : `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - fichier de sauvegarde : `creds.json.bak`
    - l'auth par défaut de l'ancienne version dans `~/.openclaw/credentials/` est toujours reconnue/migrée pour les flux du compte par défaut

  </Accordion>

  <Accordion title="Comportement de déconnexion">
    `openclaw channels logout --channel whatsapp [--account <id>]` efface l'état d'auth WhatsApp pour ce compte.

    Lorsqu'un Gateway est accessible, la déconnexion arrête d'abord l'écouteur en direct WhatsApp pour le compte sélectionné afin que la session liée ne continue pas à recevoir des messages jusqu'au prochain redémarrage. `openclaw channels remove --channel whatsapp` arrête également l'écouteur en direct avant de désactiver ou de supprimer la configuration du compte.

    Dans les répertoires d'auth de l'ancienne version, `oauth.json` est conservé tandis que les fichiers d'auth Baileys sont supprimés.

  </Accordion>
</AccordionGroup>

## Outils, actions et écritures de configuration

- La prise en charge des outils de l'Agent inclut l'action de réaction WhatsApp (`react`).
- Portes d'action :
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Les écritures de configuration initiées par le channel sont activées par défaut (désactiver via `channels.whatsapp.configWrites=false`).

## Dépannage

<AccordionGroup>
  <Accordion title="Non lié (QR requis)">
    Symptôme : le statut du channel signale non lié.

    Correctif :

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="Lié mais déconnecté / boucle de reconnexion"WhatsApp>
    Symptôme : compte lié avec des déconnexions répétées ou des tentatives de reconnexion.

    Les comptes inactifs peuvent rester connectés au-delà du délai d'expiration normal des messages ; le chien de garde
    redémarre lorsque l'activité de transport WhatsApp Web s'arrête, que la socket se ferme, ou
    que l'activité au niveau de l'application reste silencieuse au-delà de la fenêtre de sécurité étendue.

    Si les journaux montrent des `status=408 Request Time-out Connection was lost`Baileys répétées, ajustez
    les délais de socket Baileys sous `web.whatsapp`. Commencez par raccourcir
    `keepAliveIntervalMs` en dessous du délai d'inactivité de votre réseau et en augmentant
    `connectTimeoutMs` sur les liaisons lentes ou sujettes aux pertes :

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
    `openclaw gateway status` et `openclaw channels status --probe`WhatsApp montrent que
    la passerelle et WhatsApp sont en bonne santé, exécutez `openclaw doctor`Linux. Sur Linux, doctor
    avertit concernant les entrées crontab obsolètes qui invoquent encore
    `~/.openclaw/bin/ensure-whatsapp.sh` ; supprimez ces entrées périmées avec
    `crontab -e` car cron peut manquer de l'environnement de bus utilisateur systemd et
    faire en sorte que cet ancien script signale incorrectement l'état de santé de la passerelle.

    Si nécessaire, reliez avec `channels login`.

  </Accordion>

  <Accordion title="La connexion QR expire derrière un proxy">
    Symptôme : `openclaw channels login --channel whatsapp` échoue avant d'afficher un code QR utilisable avec `status=408 Request Time-out`WhatsApp ou une déconnexion de socket TLS.

    La connexion WhatsApp Web utilise l'environnement proxy standard de l'hôte de la passerelle (`HTTPS_PROXY`, `HTTP_PROXY`, variantes en minuscules, et `NO_PROXY`). Vérifiez que le processus de la passerelle hérite de l'environnement proxy et que `NO_PROXY` ne correspond pas à `mmg.whatsapp.net`.

  </Accordion>

  <Accordion title="Pas d'écouteur actif lors de l'envoi">
    Les envois sortants échouent rapidement lorsqu'il n'existe aucun écouteur de passerelle actif pour le compte cible.

    Assurez-vous que la passerelle est en cours d'exécution et que le compte est lié.

  </Accordion>

  <Accordion title="La réponse apparaît dans la transcription mais pas sur WhatsApp">
    Les lignes de la transcription enregistrent ce que l'agent a généré. La livraison sur WhatsApp est vérifiée séparément : OpenClaw ne considère une réponse automatique comme envoyée qu'après que Baileys a renvoyé un identifiant de message sortant pour au moins un envoi de texte ou de média visible.

    Les réactions d'accusé de réception sont des reçus indépendants préalables à la réponse. Une réaction réussie ne prouve pas que la réponse textuelle ou média ultérieure a été acceptée par WhatsApp.

    Vérifiez les journaux de la passerelle pour `auto-reply delivery failed` ou `auto-reply was not accepted by WhatsApp provider`.

  </Accordion>

  <Accordion title="Messages de groupe ignorés de manière inattendue">
    Vérifiez dans cet ordre :

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entrées de liste blanche `groups`
    - filtrage par mention (`requireMention` + modèles de mention)
    - clés en double dans `openclaw.json` (JSON5) : les entrées ultérieures écrasent les précédentes, donc gardez un seul `groupPolicy` par portée

  </Accordion>

  <Accordion title="Avertissement d'exécution Bun">
    L'exécution de la passerelle WhatsApp doit utiliser Node. Bun est signalé comme incompatible pour une opération stable de la passerelle WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Invites système

WhatsApp prend en charge les invites système de style Telegram pour les groupes et les discussions directes via les cartes `groups` et `direct`.

Hiérarchie de résolution pour les messages de groupe :

La carte `groups` effective est déterminée d'abord : si le compte définit sa propre carte `groups`, elle remplace entièrement la carte racine `groups` (pas de fusion profonde). La recherche de prompt s'exécute ensuite sur la carte unique résultante :

1. **Prompt système spécifique au groupe** (`groups["<groupId>"].systemPrompt`) : utilisé lorsque l'entrée de groupe spécifique existe dans la carte **et** que sa clé `systemPrompt` est définie. Si `systemPrompt` est une chaîne vide (`""`), le caractère générique est supprimé et aucun prompt système n'est appliqué.
2. **Prompt système générique de groupe** (`groups["*"].systemPrompt`) : utilisé lorsque l'entrée de groupe spécifique est totalement absente de la carte, ou lorsqu'elle existe mais ne définit aucune clé `systemPrompt`.

Hiérarchie de résolution pour les messages directs :

La carte `direct` effective est déterminée d'abord : si le compte définit sa propre carte `direct`, elle remplace entièrement la carte racine `direct` (pas de fusion profonde). La recherche de prompt s'exécute ensuite sur la carte unique résultante :

1. **Prompt système spécifique aux messages directs** (`direct["<peerId>"].systemPrompt`) : utilisé lorsque l'entrée de pair spécifique existe dans la carte **et** que sa clé `systemPrompt` est définie. Si `systemPrompt` est une chaîne vide (`""`), le caractère générique est supprimé et aucun prompt système n'est appliqué.
2. **Prompt système générique pour les messages directs** (`direct["*"].systemPrompt`) : utilisé lorsque l'entrée de pair spécifique est totalement absente de la carte, ou lorsqu'elle existe mais ne définit aucune clé `systemPrompt`.

<Note>
`dms` reste le compartiment de remplacement léger de l'historique par message direct (`dms.<id>.historyLimit`). Les remplacements de prompts se trouvent sous `direct`.
</Note>

**Différence avec le comportement multi-compte Telegram :** Dans Telegram, TelegramTelegram`groups` root est intentionnellement supprimé pour tous les comptes dans une configuration multi-compte — même les comptes qui ne définissent pas leur propre `groups`WhatsApp — pour empêcher un bot de recevoir des messages de groupe pour les groupes auxquels il n'appartient pas. WhatsApp n'applique pas cette garde : `groups` root et `direct`WhatsApp root sont toujours hérités par les comptes qui ne définissent pas de remplacement au niveau du compte, indépendamment du nombre de comptes configurés. Dans une configuration multi-compte WhatsApp, si vous souhaitez des invites de groupe ou directes par compte, définissez la carte complète sous chaque compte explicitement plutôt que de vous fier aux valeurs par défaut au niveau racine.

Comportement important :

- `channels.whatsapp.groups` est à la fois une carte de configuration par groupe et la liste d'autorisation de groupe au niveau du chat. À la portée racine ou du compte, `groups["*"]` signifie « tous les groupes sont admis » pour cette portée.
- N'ajoutez un groupe générique `systemPrompt` que lorsque vous souhaitez déjà que cette portée admette tous les groupes. Si vous souhaitez toujours qu'un ensemble fixe d'ID de groupe soit éligible, n'utilisez pas `groups["*"]` pour l'invite par défaut. À la place, répétez l'invite sur chaque entrée de groupe explicitement autorisée.
- L'admission de groupe et l'autorisation de l'expéditeur sont des vérifications distinctes. `groups["*"]` élargit l'ensemble des groupes qui peuvent atteindre la gestion de groupe, mais n'autorise pas par lui-même chaque expéditeur dans ces groupes. L'accès de l'expéditeur est toujours contrôlé séparément par `channels.whatsapp.groupPolicy` et `channels.whatsapp.groupAllowFrom`.
- `channels.whatsapp.direct` n'a pas le même effet secondaire pour les DMs. `direct["*"]` fournit uniquement une configuration de chat direct par défaut après qu'un DM a déjà été admis par `dmPolicy` plus `allowFrom` ou les règles du magasin d'appariement.

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
- multi-compte : `accounts.<id>.enabled`, `accounts.<id>.authDir`, substitutions au niveau du compte
- opérations : `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`, `web.whatsapp.*`
- comportement de session : `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`
- invites : `groups.<id>.systemPrompt`, `groups["*"].systemPrompt`, `direct.<id>.systemPrompt`, `direct["*"].systemPrompt`

## Connexes

- [Appairage](/fr/channels/pairing)
- [Groupes](/fr/channels/groups)
- [Sécurité](/fr/gateway/security)
- [Routage de canal](/fr/channels/channel-routing)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)
