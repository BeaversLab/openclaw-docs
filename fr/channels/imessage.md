---
summary: "Prise en charge héritée d'iMessage via imsg (JSON-RPC sur stdio). Les nouvelles configurations devraient utiliser BlueBubbles."
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessage"
---

# iMessage (hérité : imsg)

<Warning>
Pour les nouveaux déploiements iMessage, utilisez <a href="/fr/channels/bluebubbles">BlueBubbles</a>.

L'intégration `imsg` est héritée et pourrait être supprimée dans une future version.

</Warning>

Statut : intégration externe CLI héritée. Gateway lance `imsg rpc` et communique via JSON-RPC sur stdio (pas de démon/porte séparé).

<CardGroup cols={3}>
  <Card title="BlueBubbles (recommandé)" icon="message-circle" href="/fr/channels/bluebubbles">
    Chemin iMessage préféré pour les nouvelles configurations.
  </Card>
  <Card title="Appairage" icon="link" href="/fr/channels/pairing">
    Les DMs iMessage sont en mode appairage par défaut.
  </Card>
  <Card
    title="Référence de configuration"
    icon="settings"
    href="/fr/gateway/configuration-reference#imessage"
  >
    Full iMessage field reference.
  </Card>
</CardGroup>

## Configuration rapide

<Tabs>
  <Tab title="Mac local (chemin rapide)">
    <Steps>
      <Step title="Installer et vérifier imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
```

      </Step>

      <Step title="Configurer OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<you>/Library/Messages/chat.db",
    },
  },
}
```

      </Step>

      <Step title="Démarrer la passerelle">

```bash
openclaw gateway
```

      </Step>

      <Step title="Approuver le premier appairage DM (dmPolicy par défaut)">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        Les demandes d'appairage expirent après 1 heure.
      </Step>
    </Steps>

  </Tab>

  <Tab title="Remote Mac over SSH">
    OpenClaw nécessite uniquement un `cliPath` compatible stdio, vous pouvez donc pointer `cliPath` vers un script wrapper qui se connecte via SSH à un Mac distant et exécute `imsg`.

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    Configuration recommandée lorsque les pièces jointes sont activées :

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@gateway-host", // used for SCP attachment fetches
      includeAttachments: true,
      // Optional: override allowed attachment roots.
      // Defaults include /Users/*/Library/Messages/Attachments
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    Si `remoteHost` n'est pas défini, OpenClaw tente de le détecter automatiquement en analysant le script wrapper SSH.
    `remoteHost` doit être `host` ou `user@host` (pas d'espaces ou d'options SSH).
    OpenClaw utilise une vérification stricte des clés hôtes pour SCP, la clé de l'hôte de relais doit donc déjà exister dans `~/.ssh/known_hosts`.
    Les chemins des pièces jointes sont validés par rapport aux racines autorisées (`attachmentRoots` / `remoteAttachmentRoots`).

  </Tab>
</Tabs>

## Prérequis et autorisations (macOS)

- Messages doit être connecté sur le Mac exécutant `imsg`.
- L'accès complet au disque est requis pour le contexte de processus exécutant OpenClaw/`imsg` (accès à la base de données Messages).
- L'autorisation d'automatisation est requise pour envoyer des messages via Messages.app.

<Tip>
Les autorisations sont accordées par contexte de processus. Si la passerelle s'exécute en mode sans tête (LaunchAgent/SSH), exécutez une commande interactive unique dans ce même contexte pour déclencher les invites :

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## Contrôle d'accès et routage

<Tabs>
  <Tab title="Stratégie de DM">
    `channels.imessage.dmPolicy` contrôle les messages directs :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    Champ de la liste d'autorisation : `channels.imessage.allowFrom`.

    Les entrées de la liste d'autorisation peuvent être des identifiants ou des cibles de chat (`chat_id:*`, `chat_guid:*`, `chat_identifier:*`).

  </Tab>

  <Tab title="Stratégie de groupe + mentions">
    `channels.imessage.groupPolicy` contrôle la gestion des groupes :

    - `allowlist` (par défaut lors de la configuration)
    - `open`
    - `disabled`

    Liste d'autorisation des expéditeurs de groupe : `channels.imessage.groupAllowFrom`.

    Alternative d'exécution : si `groupAllowFrom` n'est pas défini, les vérifications de l'expéditeur de groupe iMessage reviennent à `allowFrom` si disponible.
    Note d'exécution : si `channels.imessage` est complètement manquant, l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    Filtrage des mentions pour les groupes :

    - iMessage n'a pas de métadonnées de mention natives
    - la détection des mentions utilise des modèles regex (`agents.list[].groupChat.mentionPatterns`, alternative `messages.groupChat.mentionPatterns`)
    - sans modèles configurés, le filtrage des mentions ne peut pas être appliqué

    Les commandes de contrôle des expéditeurs autorisés peuvent contourner le filtrage des mentions dans les groupes.

  </Tab>

  <Tab title="Sessions et réponses déterministes">
    - Les DMs utilisent le routage direct ; les groupes utilisent le routage de groupe.
    - Avec `session.dmScope=main` par défaut, les DMs iMessage sont regroupés dans la session principale de l'agent.
    - Les sessions de groupe sont isolées (`agent:<agentId>:imessage:group:<chat_id>`).
    - Les réponses sont renvoyées vers iMessage en utilisant les métadonnées du canal/cible d'origine.

    Comportement des fils de discussion de type groupe :

    Certains fils de discussion iMessage à plusieurs participants peuvent arriver avec `is_group=false`.
    Si ce `chat_id` est explicitement configuré sous `channels.imessage.groups`, OpenClaw le traite comme un trafic de groupe (group gating + isolement de session de groupe).

  </Tab>
</Tabs>

## Modèles de déploiement

<AccordionGroup>
  <Accordion title="Utilisateur macOS de bot dédié (identité macOS distincte)">
    Utilisez un Apple ID et un utilisateur iMessage dédiés afin que le trafic du bot soit isolé de votre profil personnel Messages.

    Flux type :

    1. Créez/connectez-vous avec un utilisateur macOS dédié.
    2. Connectez-vous à Messages avec l'ID Apple du bot dans cet utilisateur.
    3. Installez `imsg` dans cet utilisateur.
    4. Créez un wrapper SSH afin que macOS puisse exécuter `imsg` dans le contexte de cet utilisateur.
    5. Pointez `channels.imessage.accounts.<id>.cliPath` et `.dbPath` vers ce profil utilisateur.

    Le premier lancement peut nécessiter des approbations de l'interface graphique (Automatisation + Accès complet au disque) dans la session de cet utilisateur bot.

  </Accordion>

  <Accordion title="Mac distant via Tailscale (exemple)">
    Topologie courante :

    - la passerelle s'exécute sur Tailscale/VM
    - Linux + `imsg` s'exécutent sur un Mac dans votre tailnet
    - le wrapper `cliPath` utilise SSH pour exécuter `imsg`
    - `remoteHost` permet la récupération des pièces jointes via SCP

    Exemple :

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
      includeAttachments: true,
      dbPath: "/Users/bot/Library/Messages/chat.db",
    },
  },
}
```

```bash
#!/usr/bin/env bash
exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
```

    Utilisez des clés SSH afin que SSH et SCP soient non interactifs.
    Assurez-vous que la clé de l'hôte est approuvée au préalable (par exemple `ssh bot@mac-mini.tailnet-1234.ts.net`) afin que `known_hosts` soit renseigné.

  </Accordion>

  <Accordion title="Modèle multi-compte">
    iMessage prend en charge la configuration par compte sous `channels.imessage.accounts`.

    Chaque compte peut remplacer des champs tels que `cliPath`, `dbPath`, `allowFrom`, `groupPolicy`, `mediaMaxMb`, les paramètres d'historique et les listes d'autorisation des racines des pièces jointes.

  </Accordion>
</AccordionGroup>

## Médias, découpage et cibles de livraison

<AccordionGroup>
  <Accordion title="Pièces jointes et médias">
    - l'ingestion des pièces jointes entrantes est facultative : `channels.imessage.includeAttachments`
    - les chemins distants des pièces jointes peuvent être récupérés via SCP lorsque `remoteHost` est défini
    - les chemins des pièces jointes doivent correspondre aux racines autorisées :
      - `channels.imessage.attachmentRoots` (local)
      - `channels.imessage.remoteAttachmentRoots` (mode SCP distant)
      - modèle de racine par défaut : `/Users/*/Library/Messages/Attachments`
    - SCP utilise une vérification stricte de la clé de l'hôte (`StrictHostKeyChecking=yes`)
    - la taille des médias sortants utilise `channels.imessage.mediaMaxMb` (par défaut 16 Mo)
  </Accordion>

<Accordion title="Découpage sortant">
  - limite de chunk de texte : `channels.imessage.textChunkLimit` (défaut 4000) - mode de chunk :
  `channels.imessage.chunkMode` - `length` (défaut) - `newline` (découpage prioritaire au
  paragraphe)
</Accordion>

  <Accordion title="Formats d'adressage">
    Cibles explicites préférées :

    - `chat_id:123` (recommandé pour un routage stable)
    - `chat_guid:...`
    - `chat_identifier:...`

    Les cibles de type identifiant (handle) sont également prises en charge :

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

```bash
imsg chats --limit 20
```

  </Accordion>
</AccordionGroup>

## Écritures de configuration

iMessage autorise par défaut les écritures de configuration initiées par le channel (pour `/config set|unset` lorsque `commands.config: true`).

Désactiver :

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

## Dépannage

<AccordionGroup>
  <Accordion title="imsg introuvable ou RPC non pris en charge">
    Validez le binaire et la prise en charge du RPC :

```bash
imsg rpc --help
openclaw channels status --probe
```

    Si la sonde indique que le RPC n'est pas pris en charge, mettez à jour `imsg`.

  </Accordion>

  <Accordion title="Les DMs sont ignorés">
    Vérifiez :

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - les approbations de jumelage (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="Les messages de groupe sont ignorés">
    Vérifiez :

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - le comportement de la liste blanche `channels.imessage.groups`
    - la configuration du modèle de mention (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="Échec des pièces jointes distantes">
    Vérifiez :

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - authentification par clé SSH/SCP depuis l'hôte de la passerelle
    - la clé de l'hôte existe dans `~/.ssh/known_hosts` sur l'hôte de la passerelle
    - la lisibilité du chemin distant sur le Mac exécutant Messages

  </Accordion>

  <Accordion title="Les invites d'autorisation macOS ont été manquées">
    Réexécutez dans un terminal GUI interactif dans le même contexte d'utilisateur/session et approuvez les invites :

```bash
imsg chats --limit 1
imsg send <handle> "test"
```

    Confirmez que l'accès complet au disque + l'automatisation sont accordés pour le contexte de processus qui exécute OpenClaw/`imsg`.

  </Accordion>
</AccordionGroup>

## Pointeurs de référence de configuration

- [Référence de configuration - iMessage](/fr/gateway/configuration-reference#imessage)
- [Configuration de la Gateway](/fr/gateway/configuration)
- [Appariement](/fr/channels/pairing)
- [BlueBubbles](/fr/channels/bluebubbles)

import fr from "/components/footer/fr.mdx";

<fr />
