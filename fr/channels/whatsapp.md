---
summary: "Prise en charge du canal WhatsApp, contrôles d'accès, comportement de livraison et opérations"
read_when:
  - Working on WhatsApp/web channel behavior or inbox routing
title: "WhatsApp"
---

# WhatsApp (channel Web)

Statut : prêt pour la production via WhatsApp Web (Baileys). Le Gateway possède les sessions liées.

## Installer (à la demande)

- L'intégration (`openclaw onboard`) et `openclaw channels add --channel whatsapp`
  invitent à installer le plugin WhatsApp la première fois que vous le sélectionnez.
- `openclaw channels login --channel whatsapp` offre également le flux d'installation lorsque
  le plugin n'est pas encore présent.
- Canal Dev + git checkout : valeur par défaut du chemin local du plugin.
- Stable/Bêta : par défaut le package npm `@openclaw/whatsapp`.

L'installation manuelle reste disponible :

```bash
openclaw plugins install @openclaw/whatsapp
```

<CardGroup cols={3}>
  <Card title="Appariement" icon="link" href="/fr/channels/pairing">
    La stratégie DM par défaut est l'appariement pour les expéditeurs inconnus.
  </Card>
  <Card title="Dépannage du canal" icon="wrench" href="/fr/channels/troubleshooting">
    Guides de diagnostic et de réparation multi-canaux.
  </Card>
  <Card title="Configuration de la passerelle" icon="settings" href="/fr/gateway/configuration">
    Modèles et exemples complets de configuration de canal.
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

  <Step title="Approuver la première demande d'appariement (si vous utilisez le mode appariement)">

```bash
openclaw pairing list whatsapp
openclaw pairing approve whatsapp <CODE>
```

    Les demandes d'appariement expirent après 1 heure. Les demandes en attente sont limitées à 3 par canal.

  </Step>
</Steps>

<Note>
  OpenClaw recommande d'exécuter WhatsApp sur un numéro séparé si possible. (Les métadonnées du
  canal et le flux de configuration sont optimisés pour cette configuration, mais les configurations
  avec numéro personnel sont également prises en charge.)
</Note>

## Modèles de déploiement

<AccordionGroup>
  <Accordion title="Numéro dédié (recommandé)">
    C'est le mode opérationnel le plus propre :

    - identité WhatsApp séparée pour OpenClaw
    - listes d'autorisation DM et limites de routage plus claires
    - risque moindre de confusion avec l'auto-chat

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

  <Accordion title="Recours au numéro personnel">
    L'intégration prend en charge le mode numéro personnel et écrit une base conviviale pour l'auto-chat :

    - `dmPolicy: "allowlist"`
    - `allowFrom` inclut votre numéro personnel
    - `selfChatMode: true`

    En exécution, les protections d'auto-chat reposent sur le numéro auto lié et `allowFrom`.

  </Accordion>

  <Accordion title="Portée de canal WhatsApp Web uniquement">
    Le canal de la plateforme de messagerie est basé sur WhatsApp Web (`Baileys`) dans l'architecture actuelle du canal OpenClaw.

    Il n'y a pas de canal de messagerie Twilio WhatsApp séparé dans le registre des canaux de chat intégré.

  </Accordion>
</AccordionGroup>

## Modèle d'exécution

- Gateway possède le socket WhatsApp et la boucle de reconnexion.
- Les envois sortants nécessitent un écouteur WhatsApp actif pour le compte cible.
- Les chats de statut et de diffusion sont ignorés (`@status`, `@broadcast`).
- Les chats directs utilisent les règles de session DM (`session.dmScope` ; par défaut, `main` regroupe les DMs dans la session principale de l'agent).
- Les sessions de groupe sont isolées (`agent:<agentId>:whatsapp:group:<jid>`).

## Contrôle d'accès et activation

<Tabs>
  <Tab title="DM policy">
    `channels.whatsapp.dmPolicy` contrôle l'accès au chat direct :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (requiert que `allowFrom` inclue `"*"`)
    - `disabled`

    `allowFrom` accepte les numéros au format E.164 (normalisés en interne).

    Remplacement multi-compte : `channels.whatsapp.accounts.<id>.dmPolicy` (et `allowFrom`) priment sur les paramètres par défaut au niveau du channel pour ce compte.

    Détails du comportement à l'exécution :

    - les appairages sont conservés dans le allow-store du channel et fusionnés avec les `allowFrom` configurés
    - si aucune liste d'autorisation n'est configurée, le numéro auto lié est autorisé par défaut
    - les DM `fromMe` sortants ne sont jamais appariés automatiquement

  </Tab>

  <Tab title="Group policy + allowlists">
    L'accès aux groupes comporte deux niveaux :

    1. **Liste d'autorisation d'appartenance au groupe** (`channels.whatsapp.groups`)
       - si `groups` est omis, tous les groupes sont éligibles
       - si `groups` est présent, il agit comme une liste d'autorisation de groupe (`"*"` autorisés)

    2. **Stratégie d'expéditeur de groupe** (`channels.whatsapp.groupPolicy` + `groupAllowFrom`)
       - `open` : liste d'autorisation de l'expéditeur contournée
       - `allowlist` : l'expéditeur doit correspondre à `groupAllowFrom` (ou `*`)
       - `disabled` : bloquer tout le trafic entrant du groupe

    Liste d'autorisation de l'expéditeur de secours :

    - si `groupAllowFrom` n'est pas défini, l'exécution revient à `allowFrom` si disponible
    - les listes d'autorisation de l'expéditeur sont évaluées avant l'activation par mention/réponse

    Remarque : si aucun bloc `channels.whatsapp` n'existe du tout, la stratégie de groupe de secours à l'exécution est `allowlist` (avec un journal d'avertissement), même si `channels.defaults.groupPolicy` est défini.

  </Tab>

  <Tab title="Mentions + /activation">
    Les réponses de groupe nécessitent une mention par défaut.

    La détection des mentions inclut :

    - des mentions explicites WhatsApp de l'identité du bot
    - des motifs regex de mention configurés (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - une détection implicite de réponse au bot (l'expéditeur de la réponse correspond à l'identité du bot)

    Note de sécurité :

    - la citation/réponse satisfait uniquement le filtrage par mention ; elle **ne** confère **pas** l'autorisation à l'expéditeur
    - avec `groupPolicy: "allowlist"`, les expéditeurs non autorisés sont toujours bloqués même s'ils répondent au message d'un utilisateur autorisé

    Commande d'activation au niveau de la session :

    - `/activation mention`
    - `/activation always`

    `activation` met à jour l'état de la session (pas la configuration globale). Elle est restreinte au propriétaire.

  </Tab>
</Tabs>

## Comportement du numéro personnel et de l'auto-discussion

Lorsque le numéro personnel lié est également présent dans `allowFrom`, les sauvegardes d'auto-discussion WhatsApp s'activent :

- ignorer les accusés de réception pour les tours d'auto-discussion
- ignorer le comportement de déclenchement automatique par mention-JID qui vous ferait autrement vous mentionner vous-même
- si `messages.responsePrefix` n'est pas défini, les réponses en auto-discussion sont par défaut `[{identity.name}]` ou `[openclaw]`

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

    Les champs de métadonnées de réponse sont également remplis lorsque disponibles (`ReplyToId`, `ReplyToBody`, `ReplyToSender`, expéditeur JID/E.164).

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
    Pour les groupes, les messages non traités peuvent être mis en mémoire tampon et injectés en tant que contexte lorsque le bot est finalement déclenché.

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

    Substitution par compte :

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

    Les tours d'auto-discussion ignorent les accusés de réception même s'ils sont activés globalement.

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
  - prend en charge les charges utiles d'image, de vidéo, d'audio (note vocale PTT) et de document -
  `audio/ogg` est réécrit en `audio/ogg; codecs=opus` pour la compatibilité des notes vocales - la
  lecture des GIF animés est prise en charge via `gifPlayback: true` sur l'envoi de vidéos - les
  légendes sont appliquées au premier élément multimédia lors de l'envoi de charges utiles de
  réponse multimédia - la source du média peut être HTTP(S), `file://` ou des chemins locaux
</Accordion>

  <Accordion title="Limites de taille des médias et comportement de repli">
    - plafond d'enregistrement de média entrant : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - plafond d'envoi de média sortant : `channels.whatsapp.mediaMaxMb` (par défaut `50`)
    - les remplacements par compte utilisent `channels.whatsapp.accounts.<accountId>.mediaMaxMb`
    - les images sont automatiquement optimisées (redimensionnement/balayage de la qualité) pour respecter les limites
    - en cas d'échec de l'envoi de média, le repli du premier élément envoie un avertissement textuel au lieu de supprimer la réponse en silence
  </Accordion>
</AccordionGroup>

## Réactions d'accusé de réception

WhatsApp prend en charge les réactions d'accusé de réception immédiates lors de la réception entrante via `channels.whatsapp.ackReaction`.

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

- envoyé immédiatement après acceptation du message entrant (pré-réponse)
- les échecs sont consignés mais ne bloquent pas la livraison de la réponse normale
- le mode de groupe `mentions` réagit sur les tours déclenchés par des mentions ; l'activation de groupe `always` agit comme un contournement pour cette vérification
- WhatsApp utilise `channels.whatsapp.ackReaction` (l'ancien `messages.ackReaction` n'est pas utilisé ici)

## Multi-compte et identifiants

<AccordionGroup>
  <Accordion title="Sélection de compte et valeurs par défaut">
    - les identifiants de compte proviennent de `channels.whatsapp.accounts`
    - sélection du compte par défaut : `default` si présent, sinon le premier identifiant de compte configuré (trié)
    - les identifiants de compte sont normalisés en interne pour la recherche
  </Accordion>

  <Accordion title="Chemins d'identification et compatibilité avec l'ancien système">
    - chemin d'authentification actuel : `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
    - fichier de sauvegarde : `creds.json.bak`
    - l'authentification par défaut de l'ancien système dans `~/.openclaw/credentials/` est toujours reconnue/migrée pour les flux de compte par défaut
  </Accordion>

  <Accordion title="Comportement de déconnexion">
    `openclaw channels logout --channel whatsapp [--account <id>]` efface l'état d'authentification WhatsApp pour ce compte.

    Dans les répertoires d'authentification de l'ancien système, `oauth.json` est conservé tandis que les fichiers d'authentification Baileys sont supprimés.

  </Accordion>
</AccordionGroup>

## Outils, actions et écritures de configuration

- La prise en charge des outils de l'agent inclut l'action de réaction WhatsApp (`react`).
- Portes d'action :
  - `channels.whatsapp.actions.reactions`
  - `channels.whatsapp.actions.polls`
- Les écritures de configuration initiées par le channel sont activées par défaut (désactivez via `channels.whatsapp.configWrites=false`).

## Dépannage

<AccordionGroup>
  <Accordion title="Non lié (QR requis)">
    Symptôme : le statut du channel indique non lié.

    Correctif :

    ```bash
    openclaw channels login --channel whatsapp
    openclaw channels status
    ```

  </Accordion>

  <Accordion title="Lié mais déconnecté / boucle de reconnexion">
    Symptôme : compte lié avec des déconnexions répétées ou des tentatives de reconnexion.

    Correctif :

    ```bash
    openclaw doctor
    openclaw logs --follow
    ```

    Si nécessaire, reliez avec `channels login`.

  </Accordion>

  <Accordion title="Aucun écouteur actif lors de l'envoi">
    Les envois sortants échouent rapidement lorsqu'aucun écouteur de passerelle actif n'existe pour le compte cible.

    Assurez-vous que la passerelle fonctionne et que le compte est lié.

  </Accordion>

  <Accordion title="Messages de groupe ignorés de manière inattendue">
    Vérifiez dans cet ordre :

    - `groupPolicy`
    - `groupAllowFrom` / `allowFrom`
    - entrées de liste blanche `groups`
    - filtrage des mentions (`requireMention` + motifs de mention)
    - clés en double dans `openclaw.json` (JSON5) : les entrées ultérieures remplacent les précédentes, donc gardez un seul `groupPolicy` par portée

  </Accordion>

  <Accordion title="Avertissement concernant le runtime Bun">
    Le runtime de la passerelle WhatsApp doit utiliser Node. Bun est signalé comme incompatible pour le fonctionnement stable de la passerelle WhatsApp/Telegram.
  </Accordion>
</AccordionGroup>

## Pointeurs vers la référence de configuration

Référence principale :

- [Référence de configuration - WhatsApp](/fr/gateway/configuration-reference#whatsapp)

Champs WhatsApp à fort signal :

- accès : `dmPolicy`, `allowFrom`, `groupPolicy`, `groupAllowFrom`, `groups`
- livraison : `textChunkLimit`, `chunkMode`, `mediaMaxMb`, `sendReadReceipts`, `ackReaction`
- multi-comptes : `accounts.<id>.enabled`, `accounts.<id>.authDir`, remplacements au niveau du compte
- opérations : `configWrites`, `debounceMs`, `web.enabled`, `web.heartbeatSeconds`, `web.reconnect.*`
- comportement de session : `session.dmScope`, `historyLimit`, `dmHistoryLimit`, `dms.<id>.historyLimit`

## Connexes

- [Appairage](/fr/channels/pairing)
- [Routage de canal](/fr/channels/channel-routing)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Dépannage](/fr/channels/troubleshooting)

import fr from "/components/footer/fr.mdx";

<fr />
