---
summary: "iMessageRPCAPIOpenClawiMessagePrise en charge native d'iMessage via imsg (JSON-RPC sur stdio), avec des actions d'API privées pour les réponses, les tapbacks, les effets, les pièces jointes et la gestion de groupe. Préféré pour les nouvelles configurations iMessage OpenClaw lorsque les exigences de l'hôte sont adaptées."
read_when:
  - Setting up iMessage support
  - Debugging iMessage send/receive
title: "iMessageiMessage"
---

<Note>
Pour les déploiements iMessage OpenClaw, utilisez OpenClawiMessage`imsg`macOSGatewayLinuxWindows sur un hôte macOS Messages connecté. Si votre Gateway fonctionne sur Linux ou Windows, dirigez `channels.imessage.cliPath` vers un wrapper SSH qui exécute `imsg`Gateway sur le Mac.

**Le rattrapage lors de l'indisponibilité de la Gateway est facultatif.** Lorsqu'il est activé (`channels.imessage.catchup.enabled: true`), la gateway rejoue les messages entrants qui ont atterri dans `chat.db` pendant qu'elle était hors ligne (plantage, redémarrage, mise en veille du Mac) au prochain démarrage. Désactivé par défaut — voir [Rattrapage après l'indisponibilité de la passerelle](#catching-up-after-gateway-downtime). Corrige [openclaw#78649](https://github.com/openclaw/openclaw/issues/78649).

</Note>

<Warning>
  La prise en charge de BlueBubbles a été supprimée. Migrez les configurations BlueBubbles`channels.bluebubbles` vers `channels.imessage`OpenClawiMessage ; OpenClaw prend en charge iMessage uniquement via `imsg`BlueBubblesiMessage. Commencez par [Suppression de BlueBubbles et le chemin iMessage imsg](/fr/announcements/bluebubbles-imessageBlueBubbles) pour l'annonce courte, ou [En provenance de
  BlueBubbles](/fr/channels/imessage-from-bluebubbles) pour le tableau de migration complet.
</Warning>

État : intégration native externe de CLI. La Gateway génère CLIGateway`imsg rpc`RPC et communique via JSON-RPC sur stdio (pas de démon/port distinct). Les actions avancées nécessitent `imsg launch`API et une sonde réussie de l'API privée.

<CardGroup cols={3}>
  <Card title="APIActions de l'API privée" icon="wand-sparkles" href="#private-api-actions">
    Réponses, tapbacks, effets, pièces jointes et gestion de groupe.
  </Card>
  <Card title="Appairage" icon="link" href="/fr/channels/pairing" iMessage>
    Les DMs iMessage sont en mode appairage par défaut.
  </Card>
  <Card title="Mac distant" icon="terminal" href="#remote-mac-over-ssh" Gateway>
    Utilisez un wrapper SSH lorsque la Gateway ne fonctionne pas sur le Mac Messages.
  </Card>
  <Card title="Référence de configuration" icon="settings" href="/fr/gateway/config-channels#imessage" iMessage>
    Référence complète des champs iMessage.
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
imsg launch
openclaw channels status --probe
```

      </Step>

      <Step title="OpenClawConfigurer OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/user/Library/Messages/chat.db",
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
    `remoteHost` doit être `host` ou `user@host` (pas d'espaces ni d'options SSH).
    OpenClaw utilise une vérification stricte des clés d'hôte pour SCP, la clé de l'hôte de relais doit donc déjà exister dans `~/.ssh/known_hosts`.
    Les chemins des pièces jointes sont validés par rapport aux racines autorisées (`attachmentRoots` / `remoteAttachmentRoots`).

<Warning>
Tout wrapper ou proxy SSH `cliPath` que vous placez devant `imsg` DOIT se comporter comme un tuyau stdio transparent pour JSON-RPC longue durée. OpenClaw échange de petits messages JSON-RPC délimités par des nouvelles lignes via stdin/stdout du wrapper pendant toute la durée de vie du channel :

- Transférer chaque bloc/ligne stdin **dès que les octets sont disponibles** — n'attendez pas EOF.
- Transférer rapidement chaque bloc/ligne stdout dans la direction inverse.
- Préserver les nouvelles lignes.
- Éviter les lectures bloquantes de taille fixe (`read(4096)`, `cat | buffer`, shell par défaut `read`) qui peuvent affamer les petites trames.
- Garder stderr séparé du flux stdout JSON-RPC.

Un wrapper qui met en tampon stdin jusqu'à ce qu'un grand bloc soit rempli produira des symptômes ressemblant à une panne iMessage — `imsg rpc timeout (chats.list)` ou redémarrages répétés du channel — alors que `imsg rpc` lui-même est en bonne santé. `ssh -T host imsg "$@"` (ci-dessus) est sûr car il transfère les arguments `cliPath` de OpenClaw tels que `rpc` et `--db`. Les pipelines comme `ssh host imsg | grep -v '^DEBUG'` ne le sont PAS — les outils à tampon par ligne peuvent toujours retenir des trames ; utilisez `stdbuf -oL -eL` à chaque étape si vous devez filtrer.

</Warning>

  </Tab>
</Tabs>

## Configuration requise et permissions (macOS)

- Messages doit être connecté sur le Mac exécutant `imsg`.
- L'accès complet au disque est requis pour le contexte de processus exécutant OpenClaw/`imsg` (accès à la base de données Messages).
- L'autorisation d'automatisation est requise pour envoyer des messages via Messages.app.
- Pour les actions avancées (réagir / modifier / annuler l'envoi / réponse filée / effets / opérations de groupe), la protection de l'intégrité du système doit être désactivée — voir [Activation de l'API privée imsg](API#enabling-the-imsg-private-api) ci-dessous. L'envoi et la réception de textes et médias de base fonctionnent sans cela.

<Tip>
Les autorisations sont accordées par contexte de processus. Si la passerelle s'exécute sans interface (LaunchAgent/SSH), exécutez une commande interactive unique dans ce même contexte pour déclencher les invites :

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

<Accordion title="Les envois via le wrapper SSH échouent avec AppleEvents -1743">
  Une configuration SSH à distance peut lire les discussions, transmettre `channels status --probe` et traiter les messages entrants, alors que les envois sortants échouent toujours avec une erreur d'autorisation AppleEvents :

```text
Not authorized to send Apple events to Messages. (-1743)
```

Vérifiez la base de données TCC de l'utilisateur Mac connecté ou les Réglages système > Confidentialité et sécurité > Automatisation. Si l'entrée d'automatisation est enregistrée pour `/usr/libexec/sshd-keygen-wrapper` au lieu du `imsg` ou du processus du shell local, macOS peut ne pas exposer de bascule Messages utilisable pour ce client côté serveur SSH :

```text
kTCCServiceAppleEvents | /usr/libexec/sshd-keygen-wrapper | auth_value=0 | com.apple.MobileSMS
```

Dans cet état, répéter `tccutil reset AppleEvents` ou relancer `imsg send` via le même wrapper SSH peut continuer d'échouer car le contexte de processus qui a besoin de l'automatisation Messages est le wrapper SSH, et non une application que l'interface utilisateur peut autoriser.

Utilisez plutôt l'un des contextes de processus `imsg` pris en charge :

- Exécutez le Gateway, ou au moins le pont `imsg`, dans la session locale de l'utilisateur Messages connecté.
- Démarrez le Gateway avec un LaunchAgent pour cet utilisateur après avoir accordé l'accès complet au disque et l'automatisation depuis la même session.
- Si vous conservez la topologie SSH à deux utilisateurs, vérifiez qu'un envoi sortant réel `imsg send` réussit via le wrapper exact avant d'activer le channel. Si l'automatisation ne peut pas lui être accordée, reconfigurez en une configuration `imsg` à utilisateur unique au lieu de compter sur le wrapper SSH pour les envois.

</Accordion>

## Activation de l'API privée imsg

`imsg` est fourni avec deux modes de fonctionnement :

- **Mode basique** (par défaut, aucune modification SIP requise) : texte et média sortants via `send`, surveillance/historique entrants, liste de discussions. C'est ce que vous obtenez directement avec une nouvelle installation de `brew install steipete/tap/imsg`macOS plus les permissions macOS standard ci-dessus.
- **Mode API privée** : `imsg` injecte une dylib d'aide dans `Messages.app` pour appeler les fonctions internes de `IMCore`. C'est ce qui déverrouille `react`, `edit`, `unsend`, `reply` (filés), `sendWithEffect`, `renameGroup`, `setGroupIcon`, `addParticipant`, `removeParticipant`, `leaveGroup`, ainsi que les indicateurs de frappe et les accusés de lecture.

Pour accéder à la surface d'action avancée documentée sur cette page de canal, vous avez besoin du mode API privée. Le README de `imsg` est explicite concernant cette exigence :

> Les fonctionnalités avancées telles que `read`, `typing`, `launch`, l'envi enrichi basé sur un pont, la mutation de messages et la gestion des discussions sont facultatives. Elles nécessitent que SIP soit désactivé et qu'une dylib d'aide soit injectée dans `Messages.app`. `imsg launch` refuse d'injecter lorsque SIP est activé.

La technique d'injection d'aide utilise la propre dylib de `imsg` pour atteindre les privées de Messages. Il n'y a aucun serveur tiers ou runtime BlueBubbles dans le chemin OpenClaw de iMessage.

<Warning>
**Désactiver SIP implique un véritable compromis de sécurité.** SIP est l'une des protections centrales de macOS contre l'exécution de code système modifié ; le désactiver sur l'ensemble du système ouvre une surface d'attaque supplémentaire et des effets secondaires. Notamment, **désactiver SIP sur les Mac Apple Silicon désactive également la possibilité d'installer et d'exécuter des applications iOS sur votre Mac**.

Considérez cela comme un choix opérationnel délibéré, et non une option par défaut. Si votre modèle de menace ne tolère pas la désactivation de SIP, le iMessage fourni est limité au mode basique — envoi et réception de texte et de média uniquement, sans réactions / modification / annulation d'envoi / effets / opérations de groupe.

</Warning>

### Configuration

1. **Installez (ou mettez à niveau) `imsg`** sur le Mac qui exécute Messages.app :

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg status --json
   ```

   La sortie `imsg status --json` signale `bridge_version`, `rpc_methods` et `selectors` par méthode, afin que vous puissiez voir ce que la version actuelle prend en charge avant de commencer.

2. **Désactivez la protection de l'intégrité du système.** Cela dépend de la version de macOS car la condition sous-jacente d'Apple dépend du système d'exploitation et du matériel :
   - **macOS 10.13–10.15 (Sierra–Catalina) :** désactivez la validation de la bibliothèque via le Terminal, redémarrez en mode récupération, exécutez `csrutil disable`, redémarrez.
   - **macOS 11+ (Big Sur et versions ultérieures), Intel :** Mode récupération (ou récupération Internet), `csrutil disable`, redémarrez.
   - **macOS 11+, Apple Silicon :** séquence de démarrage via le bouton d'alimentation pour entrer en récupération ; sur les versions récentes de macOS, maintenez la touche **Maj gauche** lorsque vous cliquez sur Continuer, puis `csrutil disable`. Les configurations de machine virtuelle suivent un processus distinct — prenez d'abord un instantané de la VM.
   - **macOS 26 / Tahoe :** les stratégies de validation de bibliothèque et les vérifications d'entitlements privés `imagent` ont encore été renforcées ; `imsg` peut nécessiter une version mise à jour pour suivre le rythme. Si l'injection `imsg launch` ou des `selectors` spécifiques commencent à renvoyer false après une mise à niveau majeure de macOS, consultez les notes de version de `imsg` avant de supposer que l'étape SIP a réussi.

   Suivez le processus de mode récupération d'Apple pour votre Mac pour désactiver SIP avant d'exécuter `imsg launch`.

3. **Injecter l'assistant.** Avec SIP désactivé et Messages.app connecté :

   ```bash
   imsg launch
   ```

   `imsg launch` refuse d'injecter lorsque SIP est toujours activé, ce qui constitue également une confirmation que l'étape 2 a été effectuée.

4. **Vérifier le pont depuis OpenClaw :**

   ```bash
   openclaw channels status --probe
   ```

   L'entrée iMessage doit indiquer `works`, et `imsg status --json | jq '.selectors'` doit afficher `retractMessagePart: true` ainsi que les sélecteurs d'édition / de frappe / de lecture que votre version macOS expose. Le filtrage par méthode du plugin OpenClaw dans `actions.ts` n'annonce que les actions dont le sélecteur sous-jacent est `true` ; par conséquent, la surface d'action que vous voyez dans la liste d'outils de l'agent reflète ce que le pont peut réellement faire sur cet hôte.

Si `openclaw channels status --probe` signale le canal comme `works` mais que des actions spécifiques renvoient « iMessage `<action>`API nécessite le pont de l'API privée imsg » au moment de l'envoi, exécutez à nouveau `imsg launch` — l'assistant peut être désactivé (redémarrage de Messages.app, mise à jour du système d'exploitation, etc.) et le statut `available: true` mis en cache continuera d'annoncer des actions jusqu'à ce que la prochaine sonde actualise.

### Lorsque vous ne pouvez pas désactiver SIP

Si la désactivation de SIP n'est pas acceptable pour votre modèle de menace :

- `imsg` revient en mode basique — texte + média + réception uniquement.
- Le plugin OpenClaw annonce toujours l'envoi de texte/médias et la surveillance des messages entrants ; il masque simplement OpenClaw`react`, `edit`, `unsend`, `reply`, `sendWithEffect` et les opérations de groupe sur la surface des actions (conformément à la porte de capacité par méthode).
- Vous pouvez exécuter un Mac distinct non Apple Silicon (ou un Mac dédié aux bots) avec SIP désactivé pour la charge de travail iMessage, tout en gardant SIP activé sur vos appareils principaux. Voir [Utilisateur macOS de bot dédié (identité iMessage distincte)](iMessagemacOSiMessage#deployment-patterns) ci-dessous.

## Contrôle d'accès et routage

<Tabs>
  <Tab title="Stratégie de DM">
    `channels.imessage.dmPolicy` contrôle les messages directs :

    - `pairing` (par défaut)
    - `allowlist`
    - `open` (nécessite que `allowFrom` inclue `"*"`)
    - `disabled`

    Champ de liste d'autorisation : `channels.imessage.allowFrom`.

    Les entrées de la liste d'autorisation doivent identifier les expéditeurs : identifiants ou groupes d'accès d'expéditeur statiques (`accessGroup:<name>`). Utilisez `channels.imessage.groupAllowFrom` pour les cibles de chat telles que `chat_id:*`, `chat_guid:*` ou `chat_identifier:*` ; utilisez `channels.imessage.groups` pour les clés de registre numériques `chat_id`.

  </Tab>

  <Tab title="Stratégie de groupe + mentions">
    `channels.imessage.groupPolicy` contrôle la gestion des groupes :

    - `allowlist` (par défaut lors de la configuration)
    - `open`
    - `disabled`

    Liste d'autorisation des expéditeurs de groupe : `channels.imessage.groupAllowFrom`.

    Les entrées `groupAllowFrom` peuvent également faire référence à des groupes d'accès statiques pour les expéditeurs (`accessGroup:<name>`).

    Repli à l'exécution : si `groupAllowFrom`iMessage n'est pas défini, les vérifications d'expéditeur de groupe iMessage utilisent `allowFrom` ; définissez `groupAllowFrom` lorsque l'admission des DM et des groupes doit différer.
    Remarque à l'exécution : si `channels.imessage` est complètement manquant, l'exécution revient à `groupPolicy="allowlist"` et enregistre un avertissement (même si `channels.defaults.groupPolicy` est défini).

    <Warning>
    Le routage de groupe a **deux** portes de liste d'autorisation fonctionnant consécutivement, et les deux doivent être réussies :

    1. **Liste d'autorisation de l'expéditeur / de la cible de chat** (`channels.imessage.groupAllowFrom`) — identifiant, `chat_guid`, `chat_identifier`, ou `chat_id`.
    2. **Registre de groupe** (`channels.imessage.groups`) — avec `groupPolicy: "allowlist"`, cette porte nécessite soit une entrée générique `groups: { "*": { ... } }` (définit `allowAll = true`), soit une entrée explicite par `chat_id` sous `groups`.

    Si la porte 2 est vide, chaque message de groupe est abandonné. Le plugin émet deux signaux de niveau `warn` au niveau de journalisation par défaut :

    - une fois par compte au démarrage : `imessage: groupPolicy="allowlist" but channels.imessage.groups is empty for account "<id>"`
    - une fois par `chat_id` à l'exécution : `imessage: dropping group message from chat_id=<id> ...`

    Les DM continuent de fonctionner car ils empruntent un chemin de code différent.

    Configuration minimale pour garder les groupes actifs sous `groupPolicy: "allowlist"` :

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: { "*": { "requireMention": true } },
        },
      },
    }
    ```

    Si ces lignes `warn` apparaissent dans le journal de la passerelle, la porte 2 rejette les messages — ajoutez le bloc `groups`iMessage.
    </Warning>

    Filtrage des mentions pour les groupes :

    - iMessage n'a pas de métadonnées natives de mention
    - la détection des mentions utilise des modèles regex (`agents.list[].groupChat.mentionPatterns`, repli `messages.groupChat.mentionPatterns`)
    - sans modèles configurés, le filtrage des mentions ne peut pas être appliqué

    Les commandes de contrôle des expéditeurs autorisés peuvent contourner le filtrage des mentions dans les groupes.

    `systemPrompt` par groupe :

    Chaque entrée sous `channels.imessage.groups.*` accepte une chaîne `systemPrompt` facultative. La valeur est injectée dans le prompt système de l'agent à chaque tour gérant un message dans ce groupe. La résolution reflète la résolution du prompt par groupe utilisée par `channels.whatsapp.groups` :

    1. **Prompt système spécifique au groupe** (`groups["<chat_id>"].systemPrompt`) : utilisé lorsque l'entrée de groupe spécifique existe dans la carte **et** que sa clé `systemPrompt` est définie. Si `systemPrompt` est une chaîne vide (`""`), le caractère générique est supprimé et aucun prompt système n'est appliqué à ce groupe.
    2. **Prompt système générique de groupe** (`groups["*"].systemPrompt`) : utilisé lorsque l'entrée de groupe spécifique est totalement absente de la carte, ou lorsqu'elle existe mais ne définit aucune clé `systemPrompt`.

    ```json5
    {
      channels: {
        imessage: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15555550123"],
          groups: {
            "*": { systemPrompt: "Use British spelling." },
            "8421": {
              requireMention: true,
              systemPrompt: "This is the on-call rotation chat. Keep replies under 3 sentences.",
            },
            "9907": {
              // explicit suppression: the wildcard "Use British spelling." does not apply here
              systemPrompt: "",
            },
          },
        },
      },
    }
    ```

    Les prompts par groupe s'appliquent uniquement aux messages de groupe — les messages directs dans ce canal ne sont pas affectés.

  </Tab>

  <Tab title="Sessions et réponses déterministes">
    - Les DMs utilisent le routage direct ; les groupes utilisent le routage de groupe.
    - Avec `session.dmScope=main` par défaut, les iMessage DMs fusionnent dans la session principale de l'agent.
    - Les sessions de groupe sont isolées (`agent:<agentId>:imessage:group:<chat_id>`).
    - Les réponses sont renvoyées vers iMessage en utilisant les métadonnées de canal/cible d'origine.

    Comportement des fils de discussion de type groupe :

    Certains fils de discussion iMessage à plusieurs participants peuvent arriver avec `is_group=false`.
    Si ce `chat_id` est explicitement configuré sous `channels.imessage.groups`, OpenClaw le traite comme un trafic de groupe (filtrage de groupe + isolation de session de groupe).

  </Tab>
</Tabs>

## Liaisons de conversation ACP

Les discussions iMessage héritées peuvent également être liées à des sessions ACP.

Flux rapide pour l'opérateur :

- Exécutez `/acp spawn codex --bind here` dans le DM ou le groupe autorisé.
- Les futurs messages de cette même conversation iMessage sont acheminés vers la session ACP générée.
- `/new` et `/reset` réinitialisent la même session ACP liée sur place.
- `/acp close` ferme la session ACP et supprime la liaison.

Les liaisons persistantes configurées sont prises en charge via des entrées `bindings[]` de niveau supérieur avec `type: "acp"` et `match.channel: "imessage"`.

`match.peer.id` peut utiliser :

- un identifiant DM normalisé tel que `+15555550123` ou `user@example.com`
- `chat_id:<id>` (recommandé pour les liaisons de groupe stables)
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

Exemple :

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "imessage",
        accountId: "default",
        peer: { kind: "group", id: "chat_id:123" },
      },
      acp: { label: "codex-group" },
    },
  ],
}
```

Voir [ACP Agents](/fr/tools/acp-agents) pour le comportement de liaison ACP partagé.

## Modèles de déploiement

<AccordionGroup>
  <Accordion title="macOSiMessageUtilisateur macOS dédié au bot (identité iMessage distincte)"macOSmacOS>
    Utilisez un utilisateur macOS et un Apple ID dédiés afin que le trafic du bot soit isolé de votre profil personnel Messages.

    Flux type :

    1. Créez/connectez-vous avec un utilisateur macOS dédié.
    2. Connectez-vous à Messages avec l'Apple ID du bot dans cet utilisateur.
    3. Installez `imsg`OpenClaw dans cet utilisateur.
    4. Créez un wrapper SSH pour qu'OpenClaw puisse exécuter `imsg` dans le contexte de cet utilisateur.
    5. Pointez `channels.imessage.accounts.<id>.cliPath` et `.dbPath` vers ce profil utilisateur.

    Le premier lancement peut nécessiter des approbations GUI (Automatisation + Accès complet au disque) dans cette session utilisateur bot.

  </Accordion>

  <Accordion title="TailscaleMac distant via Tailscale (exemple)"LinuxiMessage>
    Topologie courante :

    - la passerelle s'exécute sur Linux/VM
    - iMessage + `imsg` s'exécute sur un Mac dans votre tailnet
    - le wrapper `cliPath` utilise SSH pour exécuter `imsg`
    - `remoteHost` active la récupération des pièces jointes via SCP

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

    Utilisez des clés SSH afin que SSH et SCP soient non-interactifs.
    Assurez-vous que la clé de l'hôte est approuvée au préalable (par exemple `ssh bot@mac-mini.tailnet-1234.ts.net`) afin que `known_hosts` soit renseigné.

  </Accordion>

  <Accordion title="Modèle multi-compte"iMessage>
    iMessage prend en charge la configuration par compte sous `channels.imessage.accounts`.

    Chaque compte peut remplacer des champs tels que `cliPath`, `dbPath`, `allowFrom`, `groupPolicy`, `mediaMaxMb`, les paramètres d'historique et les listes d'autorisation des racines de pièces jointes.

  </Accordion>

  <Accordion title="Historique des messages directs">
    Définissez `channels.imessage.dmHistoryLimit` pour amorcer les nouvelles sessions de messages directs avec l'historique récent décodé des `imsg` pour cette conversation. Utilisez `channels.imessage.dms["<sender>"].historyLimit` pour des remplacements par expéditeur, y compris `0`iMessage pour désactiver l'historique pour un expéditeur.

    L'historique des DM iMessage est récupéré à la demande depuis `imsg`. Laisser `dmHistoryLimit` non défini désactive l'amorçage global de l'historique des DM, mais une valeur positive `channels.imessage.dms["<sender>"].historyLimit` par expéditeur active toujours l'amorçage pour cet expéditeur.

  </Accordion>
</AccordionGroup>

## Médias, découpage et cibles de livraison

<AccordionGroup>
  <Accordion title="Pièces jointes et médias">
    - l'ingestion des pièces jointes entrantes est **désactivée par défaut** — définissez `channels.imessage.includeAttachments: true` pour transférer les photos, mémos vocaux, vidéos et autres pièces jointes à l'agent. Si elle est désactivée, les iMessages contenant uniquement des pièces jointes sont supprimés avant d'atteindre l'agent et peuvent ne produire aucune ligne de journal `Inbound message`.
    - les chemins distants des pièces jointes peuvent être récupérés via SCP lorsque `remoteHost` est défini
    - les chemins des pièces jointes doivent correspondre aux racines autorisées :
      - `channels.imessage.attachmentRoots` (local)
      - `channels.imessage.remoteAttachmentRoots` (mode SCP distant)
      - modèle de racine par défaut : `/Users/*/Library/Messages/Attachments`
    - SCP utilise une vérification stricte de la clé de l'hôte (`StrictHostKeyChecking=yes`)
    - la taille des médias sortants utilise `channels.imessage.mediaMaxMb` (par défaut 16 Mo)

  </Accordion>

  <Accordion title="Découpage sortant">
    - limite de découpage de texte : `channels.imessage.textChunkLimit` (par défaut 4000)
    - mode de découpage : `channels.imessage.chunkMode`
      - `length` (par défaut)
      - `newline` (découpage prioritaire aux paragraphes)

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

## Actions de l'API privée

Lorsque `imsg launch` est en cours d'exécution et que `openclaw channels status --probe` signale `privateApi.available: true`, l'outil de message peut utiliser des actions natives iMessage en plus des envois de texte normaux.

```json5
{
  channels: {
    imessage: {
      actions: {
        reactions: true,
        edit: true,
        unsend: true,
        reply: true,
        sendWithEffect: true,
        sendAttachment: true,
        renameGroup: true,
        setGroupIcon: true,
        addParticipant: true,
        removeParticipant: true,
        leaveGroup: true,
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Actions disponibles"iMessage>
    - **react** : Ajouter/supprimer des tapbacks iMessage (`messageId`, `emoji`, `remove`). Les tapbacks pris en charge correspondent à cœur, j'aime, je n'aime pas, rire, souligner et question.
    - **reply** : Envoyer une réponse en fil à un message existant (`messageId`, `text` ou `message`, plus `chatGuid`, `chatId`, `chatIdentifier`, ou `to`iMessage).
    - **sendWithEffect** : Envoyer du texte avec un effet iMessage (`text` ou `message`, `effect` ou `effectId`macOSAPI).
    - **edit** : Modifier un message envoyé sur les versions macOS/API privée prises en charge (`messageId`, `text` ou `newText`macOSAPI).
    - **unsend** : Retirer un message envoyé sur les versions macOS/API privée prises en charge (`messageId`).
    - **upload-file** : Envoyer des médias/fichiers (`buffer` en base64 ou un `media`/`path`/`filePath` hydraté, `filename`, `asVoice` en option). Alias hérité : `sendAttachment`.
    - **renameGroup**, **setGroupIcon**, **addParticipant**, **removeParticipant**, **leaveGroup** : Gérer les discussions de groupe lorsque la cible actuelle est une conversation de groupe.

  </Accordion>

  <Accordion title="ID de message"iMessage>
    Le contexte iMessage entrant inclut à la fois des valeurs `MessageSid` courtes et des GUID de message complets lorsque disponibles. Les ID courts sont limités au cache de réponse récent soutenu par SQLite et sont vérifiés par rapport à la discussion actuelle avant utilisation. Si un ID court a expiré ou appartient à une autre discussion, réessayez avec le `MessageSidFull` complet.

  </Accordion>

  <Accordion title="Détection des fonctionnalités">
    OpenClaw masque les actions de l'API privé uniquement lorsque l'état de la sonde en cache indique que le pont est indisponible. Si l'état est inconnu, les actions restent visibles et envoient des sondes de manière différée, afin que la première action puisse réussir après `imsg launch` sans actualisation manuelle séparée de l'état.

  </Accordion>

  <Accordion title="Accusés de lecture et saisie">
    Lorsque le pont de l'API privé est actif, les conversations entrantes acceptées sont marquées comme lues avant l'expédition et une bulle de saisie est affichée à l'expéditeur pendant que l'agent génère. Désactivez le marquage comme lu avec :

    ```json5
    {
      channels: {
        imessage: {
          sendReadReceipts: false,
        },
      },
    }
    ```

    Les versions plus anciennes de `imsg` antérieures à la liste des fonctionnalités par méthode bloqueront silencieusement la saisie/lecture ; OpenClaw enregistre un avertissement unique par redémarrage afin que l'accusé de réception manquant soit attribuable.

  </Accordion>

  <Accordion title="Tapbacks entrants">
    OpenClaw s'abonne aux tapbacks iMessage et achemine les réactions acceptées en tant qu'événements système au lieu de texte de message normal, afin qu'un tapback utilisateur ne déclenche pas une boucle de réponse ordinaire.

    Le mode de notification est contrôlé par `channels.imessage.reactionNotifications` :

    - `"own"` (par défaut) : notifier uniquement lorsque les utilisateurs réagissent aux messages rédigés par le bot.
    - `"all"` : notifier pour tous les tapbacks entrants des expéditeurs autorisés.
    - `"off"` : ignorer les tapbacks entrants.

    Les substitutions par compte utilisent `channels.imessage.accounts.<id>.reactionNotifications`.

  </Accordion>

  <Accordion title="Réactions d'approbation (👍 / 👎)">
    Lorsque `approvals.exec.enabled` ou `approvals.plugin.enabled` est vrai et que la requête est routée vers iMessage, la passerelle fournit une invite d'approbation en mode natif et accepte un tapback pour la résoudre :

    - `👍` (Tapback J'aime) → `allow-once`
    - `👎` (Tapback Je n'aime pas) → `deny`
    - `allow-always` reste une solution de repli manuelle : envoyez `/approve <id> allow-always` comme une réponse normale.

    La gestion des réactions exige que l'identifiant de l'utilisateur réagissant soit un approbateur explicite. La liste des approbateurs est lue depuis `channels.imessage.allowFrom` (ou `channels.imessage.accounts.<id>.allowFrom`) ; ajoutez le numéro de téléphone de l'utilisateur au format E.164 ou son e-mail d'identifiant Apple. L'entrée générique `"*"` est respectée mais permet à tout expéditeur d'approuver. Le raccourci de réaction contourne intentionnellement `reactionNotifications`, `dmPolicy` et `groupAllowFrom` car la liste d'autorisation des approbateurs explicites est la seule barrière qui compte pour la résolution de l'approbation.

    **Changement de comportement avec cette version :** Lorsque `channels.imessage.allowFrom` n'est pas vide, la commande texte `/approve <id> <decision>` est désormais autorisée par rapport à cette liste d'approbateurs (et non la liste d'autorisation DM plus large). Les expéditeurs autorisés sur la liste d'autorisation DM mais pas dans `allowFrom` recevront un refus explicite. Ajoutez chaque opérateur qui doit pouvoir approuver via `/approve` (et via les réactions) à `allowFrom` pour conserver le comportement précédent. Lorsque `allowFrom` est vide, le « repli même conversation » hérité reste en vigueur et `/approve` continue d'autoriser toute personne autorisée par la liste d'autorisation DM.

    Notes pour les opérateurs :
    - La liaison de réaction est stockée à la fois en mémoire (avec un TTL correspondant à l'expiration de l'approbation) et dans le magasin persistant à clé de la passerelle, de sorte qu'un tapback qui arrive peu après un redémarrage de la passerelle résout toujours l'approbation.
    - Les tapbacks `is_from_me=true` inter-appareils (la propre réaction de l'opérateur sur un appareil Apple associé) sont intentionnellement ignorés pour que le bot ne puisse pas s'auto-approuver.
    - Les tapbacks de style texte hérités (`Liked "…"` texte brut de très anciens clients Apple) ne peuvent pas résoudre les approbations car ils ne transportent aucun GUID de message ; la résolution des réactions nécessite les métadonnées de tapback structurées que les clients macOS / iOS actuels émettent.

  </Accordion>
</AccordionGroup>

## Écritures de configuration

iMessage autorise les écritures de configuration initiées par le channel par défaut (pour iMessage`/config set|unset` lorsque `commands.config: true`).

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

<a id="coalescing-split-send-dms-command--url-in-one-composition"></a>

## Fusion des DMs d'envoi fractionné (commande + URL en une seule composition)

Lorsqu'un utilisateur tape une commande et une URL ensemble — par ex. `Dump https://example.com/article` — l'application Messages d'Apple divise l'envoi en **deux lignes `chat.db` distinctes** :

1. Un message texte (`"Dump"`).
2. Un ballon d'aperçu d'URL (`"https://..."`) avec des images d'aperçu OG en pièces jointes.

Les deux lignes arrivent à OpenClaw à environ 0,8 à 2,0 s d'intervalle sur la plupart des configurations. Sans fusion, l'agent reçoit la commande seul au tour 1, répond (souvent « envoyez-moi l'URL »), et ne voit l'URL qu'au tour 2 — moment auquel le contexte de la commande est déjà perdu. C'est le pipeline d'envoi d'Apple, et non quelque chose introduit par OpenClaw ou OpenClawOpenClaw`imsg`.

`channels.imessage.coalesceSameSenderDms` permet à un DM de fusionner les lignes consécutives du même expéditeur en un seul tour d'agent. Les discussions de groupe continuent d'être distribuées par message afin de préserver la structure des tours multi-utilisateurs.

<Tabs>
  <Tab title="Quand activer">
    Activer lorsque :

    - Vous proposez des compétences qui s'attendent à `command + payload` en un seul message (dump, paste, save, queue, etc.).
    - Vos utilisateurs collent des URL, des images ou du contenu long aux côtés des commandes.
    - Vous pouvez accepter la latence ajoutée au tour de DM (voir ci-dessous).

    Laisser désactivé lorsque :

    - Vous avez besoin d'une latence de commande minimale pour les déclencheurs DM d'un seul mot.
    - Tous vos flux sont des commandes ponctuelles sans suite de charge utile.

  </Tab>
  <Tab title="Activation">
    ```json5
    {
      channels: {
        imessage: {
          coalesceSameSenderDms: true, // opt in (default: false)
        },
      },
    }
    ```

    Avec l'indicateur activé et aucun `messages.inbound.byChannel.imessage` explicite, la fenêtre de rebond s'élargit à **2500 ms** (la valeur par défaut héritée est de 0 ms — aucun rebond). La fenêtre plus large est nécessaire car la cadence d'envoi fractionné d'Apple de 0,8 à 2,0 s ne rentre pas dans une valeur par défaut plus serrée.

    Pour ajuster la fenêtre vous-même :

    ```json5
    {
      messages: {
        inbound: {
          byChannel: {
            // 2500 ms works for most setups; raise to 4000 ms if your Mac is
            // slow or under memory pressure (observed gap can stretch past 2 s
            // then).
            imessage: 2500,
          },
        },
      },
    }
    ```

  </Tab>
  <Tab title="Compromis">
    - **Latence ajoutée pour les messages DM.** Avec l'indicateur activé, chaque DM (y compris les commandes de contrôle autonomes et les suivis de texte unique) attend jusqu'à la fenêtre de debounce avant l'envoi, au cas où une ligne de payload arriverait. Les messages de chat de groupe gardent un envoi instantané.
    - **La sortie fusionnée est limitée.** Le texte fusionné est plafonné à 4000 caractères avec un marqueur explicite `…[truncated]` ; les pièces jointes sont plafonnées à 20 ; les entrées source sont plafonnées à 10 (le premier et le plus récent sont conservés au-delà). Chaque GUID source est suivi dans `coalescedMessageGuids` pour la télémétrie en aval.
    - **DM uniquement.** Les chats de groupe passent à un envoi par message afin que le bot reste réactif lorsque plusieurs personnes écrivent.
    - **Opt-in, par canal.** Les autres canaux (Telegram, WhatsApp, Slack, …) ne sont pas affectés. Les configurations BlueBubbles héritées qui définissent `channels.bluebubbles.coalesceSameSenderDms` doivent migrer cette valeur vers `channels.imessage.coalesceSameSenderDms`.

  </Tab>
</Tabs>

### Scénarios et ce que voit l'agent

| Utilisateur compose                                                                          | `chat.db` produit            | Indicateur désactivé (par défaut)                     | Indicateur activé + fenêtre de 2500 ms                                             |
| -------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Dump https://example.com` (un envoi)                                                        | 2 lignes à ~1 s d'intervalle | Deux tours d'agent : "Dump" seul, puis URL            | Un tour : texte fusionné `Dump https://example.com`                                |
| `Save this 📎image.jpg caption` (pièce jointe + texte)                                       | 2 lignes                     | Deux tours (pièce jointe supprimée lors de la fusion) | Un tour : texte + image préservés                                                  |
| `/status` (commande autonome)                                                                | 1 ligne                      | Envoi instantané                                      | **Attendre jusqu'à la fenêtre, puis envoyer**                                      |
| URL collée seule                                                                             | 1 ligne                      | Envoi instantané                                      | Envoi instantané (une seule entrée dans le bucket)                                 |
| Texte + URL envoyés comme deux messages distincts délibérés, à quelques minutes d'intervalle | 2 lignes hors fenêtre        | Deux tours                                            | Deux tours (la fenêtre expire entre eux)                                           |
| Inondation rapide (>10 petits DM dans la fenêtre)                                            | N lignes                     | N tours                                               | Un tour, sortie limitée (premier + dernier, limites texte/pièce jointe appliquées) |
| Deux personnes écrivant dans un chat de groupe                                               | N lignes de M expéditeurs    | M+ tours (un par bucket d'expéditeur)                 | M+ tours — les chats de groupe ne sont pas fusionnés                               |

## Rattrapage après l'arrêt de la passerelle

Lorsque la passerelle est hors ligne (plantage, redémarrage, mise en veille du Mac, machine éteinte), `imsg watch` reprend à partir de l'état actuel `chat.db` une fois la passerelle revenue en ligne — tout ce qui est arrivé pendant l'interruption est, par défaut, jamais vu. Le rattrapage rejoue ces messages au prochain démarrage pour que l'agent ne manque pas silencieusement le trafic entrant.

Le rattrapage est **désactivé par défaut**. Activez-le par channel :

```ts
channels: {
  imessage: {
    catchup: {
      enabled: true,             // master switch (default: false)
      maxAgeMinutes: 120,        // skip rows older than now - 2h (default: 120, clamp 1..720)
      perRunLimit: 50,           // max rows replayed per startup (default: 50, clamp 1..500)
      firstRunLookbackMinutes: 30, // first run with no cursor: look back 30 min (default: 30)
      maxFailureRetries: 10,     // give up on a wedged guid after 10 dispatch failures (default: 10)
    },
  },
}
```

### Fonctionnement

Une passe par démarrage de `monitorIMessageProvider`, séquencée comme `imsg launch` prêt → `watch.subscribe` → `performIMessageCatchup` → boucle de distribution en direct. Le rattrapage utilise lui-même `chats.list` + `messages.history` par chat sur le même client JSON-RPC utilisé par `imsg watch`. Tout ce qui arrive pendant la passe de rattrapage traverse la distribution en direct normalement ; le cache de déduplication entrant existant absorbe tout chevauchement avec les lignes rejouées.

Chaque ligne rejouée est acheminée via le chemin de distribution en direct (`evaluateIMessageInbound` + `dispatchInboundMessage`), donc les listes autorisées, la stratégie de groupe, le debouncer, le cache d'écho et les accusés de réception se comportent de manière identique sur les messages rejoués et les messages en direct.

### Sémantique du curseur et des nouvelles tentatives

Le rattrapage conserve un curseur par compte dans l'état du plugin SQLite :

```json
{
  "lastSeenMs": 1717900800000,
  "lastSeenRowid": 482910,
  "updatedAt": 1717900801234,
  "failureRetries": { "<guid>": 1 }
}
```

- Le curseur avance à chaque distribution réussie et est maintenu lorsque la distribution d'une ligne échoue — le prochain démarrage réessaie la même ligne à partir du curseur maintenu.
- Une fois la requête de rattrapage au démarrage réussie, les lignes ultérieures gérées en direct avancent également le même curseur pour qu'un redémarrage de la passerelle ne rejoue pas les messages qui ont déjà été gérés en direct. Les écritures du curseur en direct ne sautent pas par-dessus les échecs de rattrapage qui sont encore en dessous de `maxFailureRetries`.
- Après `maxFailureRetries` échecs consécutifs sur le même `guid`, le rattrapage enregistre un `warn` et force l'avancement du curseur après le message bloqué afin que les démarrages suivants puissent progresser.
- Les guids déjà abandonnés sont ignorés à la vue (aucune tentative de distribution) lors des exécutions ultérieures et comptabilisés sous `skippedGivenUp` dans le résumé de l'exécution.
- `openclaw doctor --fix` importe les fichiers de curseur `<openclawStateDir>/imessage/catchup/*.json` hérités dans l'état du plugin SQLite et archive les anciens fichiers.

### Signaux visibles par l'opérateur

```
imessage catchup: replayed=N skippedFromMe=… skippedGivenUp=… failed=… givenUp=… fetchedCount=…
imessage catchup: giving up on guid=<guid> after <N> failures; advancing cursor past it
imessage catchup: fetched <X> rows across chats, capped to perRunLimit=<Y>
```

Une ligne `WARN ... capped to perRunLimit` signifie qu'un seul démarrage n'a pas pu vider toute l'arriéré. Augmentez `perRunLimit` (max 500) si vos écarts dépassent régulièrement la passe par défaut de 50 lignes.

### Quand le laisser désactivé

- Le Gateway tourne en continu avec un redémarrage automatique par chien de garde et les écarts sont toujours < quelques secondes — la valeur par défaut désactivée convient.
- Le volume de DM est faible et les messages manqués ne changeraient pas le comportement de l'agent — la fenêtre initiale `firstRunLookbackMinutes` peut envoyer un ancien contexte surprenant lors de la première activation.

Lorsque vous activez le rattrapage, le premier démarrage sans curseur ne remonte que `firstRunLookbackMinutes` (30 min par défaut), et non toute la fenêtre `maxAgeMinutes` — cela évite de rejouer une longue histoire de messages pré-activation.

## Dépannage

<AccordionGroup>
  <Accordion title="imsg introuvable ou RPC non pris en charge">
    Validez le binaire et la prise en charge RPC :

    ```bash
    imsg rpc --help
    imsg status --json
    openclaw channels status --probe
    ```

    Si la sonde signale que RPC n'est pas pris en charge, mettez à jour `imsg`. Si les actions de l'API privée API ne sont pas disponibles, exécutez `imsg launch`macOS dans la session utilisateur macOS connecté et sondez à nouveau. Si le Gateway ne tourne pas sur macOS, utilisez la configuration du Mac distant via SSH ci-dessus au lieu du chemin local par défaut `imsg`.

  </Accordion>

  <Accordion title="Gateway ne tourne pas sur macOS">
    Le `cliPath: "imsg"` par défaut doit tourner sur le Mac connecté à Messages. Sur Linux ou Windows, définissez `channels.imessage.cliPath` sur un script wrapper qui SSH vers ce Mac et exécute `imsg "$@"`.

```bash
#!/usr/bin/env bash
exec ssh -T messages-mac imsg "$@"
```

    Ensuite, exécutez :

```bash
openclaw channels status --probe --channel imessage
```

  </Accordion>

  <Accordion title="DMs are ignored">
    Vérifiez :

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - approbations d'appariement (`openclaw pairing list imessage`)

  </Accordion>

  <Accordion title="Group messages are ignored">
    Vérifiez :

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - comportement de la liste blanche `channels.imessage.groups`
    - configuration du modèle de mention (`agents.list[].groupChat.mentionPatterns`)

  </Accordion>

  <Accordion title="Remote attachments fail">
    Vérifiez :

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - authentification par clé SSH/SCP depuis l'hôte de la passerelle
    - la clé d'hôte existe dans `~/.ssh/known_hosts` sur l'hôte de la passerelle
    - lisibilité du chemin distant sur le Mac exécutant Messages

  </Accordion>

  <Accordion title="macOS permission prompts were missed">
    Relancez dans un terminal GUI interactif dans le même contexte utilisateur/session et approuvez les invites :

    ```bash
    imsg chats --limit 1
    imsg send <handle> "test"
    ```

    Confirmez que l'accès complet au disque + l'automatisation sont accordés pour le contexte de processus qui exécute OpenClaw/`imsg`.

  </Accordion>
</AccordionGroup>

## Pointeurs vers la référence de configuration

- [Référence de configuration - iMessage](/fr/gateway/config-channels#imessage)
- [Configuration de la Gateway](/fr/gateway/configuration)
- [Appariement](/fr/channels/pairing)

## Connexes

- [Aperçu des canaux](/fr/channels) — tous les canaux pris en charge
- [Suppression de BlueBubblesiMessage et le chemin iMessage imsg](/fr/announcements/bluebubbles-imessage) — annonce et résumé de la migration
- [En provenance de BlueBubbles](/fr/channels/imessage-from-bluebubbles) — tableau de traduction de configuration et basculement étape par étape
- [Appariement](/fr/channels/pairing) — authentification DM et flux d'appariement
- [Groupes](/fr/channels/groups) — comportement des conversations de groupe et filtrage des mentions
- [Routage des canaux](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
