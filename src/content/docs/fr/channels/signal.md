---
summary: "SignalPrise en charge de Signal via signal-cli (démon natif ou conteneur bbernhard), chemins de configuration et modèle de numéro"
read_when:
  - Setting up Signal support
  - Debugging Signal send/receive
title: "SignalSignal"
---

État : intégration CLI externe. La Gateway communique avec CLIGateway`signal-cli`RPC via HTTP — soit le démon natif (JSON-RPC + SSE), soit le conteneur bbernhard/signal-cli-rest-api (REST + WebSocket).

## Prérequis

- OpenClaw installé sur votre serveur (le flux Linux ci-dessous a été testé sur Ubuntu 24).
- L'un des éléments suivants :
  - `signal-cli` disponible sur l'hôte (mode natif), **ou**
  - Conteneur `bbernhard/signal-cli-rest-api`Docker Docker (mode conteneur).
- Un numéro de téléphone qui peut recevoir un SMS de vérification (pour le chemin d'inscription par SMS).
- Accès navigateur pour le captcha Signal (Signal`signalcaptchas.org`) lors de l'inscription.

## Configuration rapide (débutant)

1. Utilisez un **numéro Signal distinct** pour le bot (recommandé).
2. Installez `signal-cli` (Java requis si vous utilisez la version JVM).
3. Choisissez un chemin de configuration :
   - **Chemin A (lien QR) :** `signal-cli link -n "OpenClaw"`Signal et scannez avec Signal.
   - **Chemin B (inscription SMS) :** enregistrez un numéro dédié avec captcha + vérification SMS.
4. Configurez OpenClaw et redémarrez la passerelle.
5. Envoyez un premier DM et approuvez le jumelage (`openclaw pairing approve signal <CODE>`).

Configuration minimale :

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"],
    },
  },
}
```

Référence des champs :

| Champ        | Description                                                            |
| ------------ | ---------------------------------------------------------------------- |
| `account`    | Numéro de téléphone du bot au format E.164 (`+15551234567`)            |
| `cliPath`    | Chemin vers `signal-cli` (`signal-cli` si sur `PATH`)                  |
| `configPath` | répertoire de configuration signal-cli passé en tant que `--config`    |
| `dmPolicy`   | Stratégie d'accès DM (`pairing` recommandé)                            |
| `allowFrom`  | Numéros de téléphone ou valeurs `uuid:<id>` autorisés à envoyer des DM |

## Ce que c'est

- Canal Signal via `signal-cli` (pas de libsignal intégrée).
- Routage déterministe : les réponses vont toujours vers Signal.
- Les DM partagent la session principale de l'agent ; les groupes sont isolés (`agent:<agentId>:signal:group:<groupId>`).

## Écritures de configuration

Par défaut, Signal est autorisé à écrire des mises à jour de configuration déclenchées par `/config set|unset` (requiert `commands.config: true`).

Désactiver avec :

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## Le modèle de numéro (important)

- La passerelle se connecte à un **appareil Signal** (le compte `signal-cli`).
- Si vous exécutez le bot sur **votre compte personnel Signal**, il ignorera vos propres messages (protection contre les boucles).
- Pour « J'envoie un message au bot et il répond », utilisez un **numéro de bot distinct**.

## Chemin de configuration A : lier un compte Signal existant (QR)

1. Installez `signal-cli` (version JVM ou native).
2. Liez un compte de bot :
   - `signal-cli link -n "OpenClaw"` puis scannez le QR dans Signal.
3. Configurez Signal et démarrez la passerelle.

Exemple :

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      cliPath: "signal-cli",
      dmPolicy: "pairing",
      allowFrom: ["+15557654321"],
    },
  },
}
```

Prise en charge multi-compte : utilisez `channels.signal.accounts` avec une configuration par compte et `name` en option. Voir [`gateway/configuration`](/fr/gateway/config-channels#multi-account-all-channels) pour le modèle partagé.

## Chemin d'installation B : enregistrer un numéro de bot dédié (SMS, Linux)

Utilisez cette méthode lorsque vous souhaitez un numéro de bot dédié au lieu de lier un compte d'application Signal existant.

1. Obtenez un numéro qui peut recevoir des SMS (ou une vérification vocale pour les lignes fixes).
   - Utilisez un numéro de bot dédié pour éviter les conflits de compte/session.
2. Installez `signal-cli` sur l'hôte de la passerelle :

```bash
VERSION=$(curl -Ls -o /dev/null -w %{url_effective} https://github.com/AsamK/signal-cli/releases/latest | sed -e 's/^.*\/v//')
curl -L -O "https://github.com/AsamK/signal-cli/releases/download/v${VERSION}/signal-cli-${VERSION}-Linux-native.tar.gz"
sudo tar xf "signal-cli-${VERSION}-Linux-native.tar.gz" -C /opt
sudo ln -sf /opt/signal-cli /usr/local/bin/
signal-cli --version
```

Si vous utilisez la version JVM (`signal-cli-${VERSION}.tar.gz`), installez d'abord JRE 25+.
Gardez `signal-cli` à jour ; les mainteneurs notent que les anciennes versions peuvent cesser de fonctionner lorsque les API du serveur Signal changent.

3. Enregistrez et vérifiez le numéro :

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

Si un captcha est requis :

1. Ouvrez `https://signalcaptchas.org/registration/generate.html`.
2. Complétez le captcha, copiez la cible du lien `signalcaptcha://...` depuis "Ouvrir Signal".
3. Exécutez depuis la même adresse IP externe que la session du navigateur lorsque c'est possible.
4. Relancez l'enregistrement immédiatement (les jetons captcha expirent rapidement) :

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. Configurez OpenClaw, redémarrez la passerelle, vérifiez le canal :

```bash
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway.service

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. Associez votre expéditeur DM :
   - Envoyez n'importe quel message au numéro du bot.
   - Approuvez le code sur le serveur : `openclaw pairing approve signal <PAIRING_CODE>`.
   - Enregistrez le numéro du bot comme un contact sur votre téléphone pour éviter "Contact inconnu".

<Warning>L'enregistrement d'un compte de numéro de téléphone avec `signal-cli` peut déconnecter la session principale de l'application Signal pour ce numéro. Privilégiez un numéro de bot dédié, ou utilisez le mode de liaison par QR si vous devez conserver votre configuration d'application téléphonique existante.</Warning>

Références en amont :

- README de `signal-cli` : `https://github.com/AsamK/signal-cli`
- Flux Captcha : `https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- Flux de liaison : `https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## Mode démon externe (httpUrl)

Si vous souhaitez gérer `signal-cli` vous-même (démarrages à froid JVM lents, initialisation de conteneur ou CPU partagés), exécutez le démon séparément et pointez OpenClaw vers celui-ci :

```json5
{
  channels: {
    signal: {
      httpUrl: "http://127.0.0.1:8080",
      autoStart: false,
    },
  },
}
```

Cela évite le lancement automatique et l'attente de démarrage à l'intérieur de OpenClaw. Pour les démarrages lents lors du lancement automatique, définissez `channels.signal.startupTimeoutMs`.

## Mode conteneur (bbernhard/signal-cli-rest-api)

Au lieu d'exécuter `signal-cli` en mode natif, vous pouvez utiliser le conteneur Docker [bbernhard/signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api). Cela encapsule `signal-cli` derrière une interface REST API et WebSocket.

Conditions requises :

- Le conteneur **doit** s'exécuter avec `MODE=json-rpc` pour la réception de messages en temps réel.
- Enregistrez ou liez votre compte Signal dans le conteneur avant de connecter OpenClaw.

Exemple de service `docker-compose.yml` :

```yaml
signal-cli:
  image: bbernhard/signal-cli-rest-api:latest
  environment:
    MODE: json-rpc
  ports:
    - "8080:8080"
  volumes:
    - signal-cli-data:/home/.local/share/signal-cli
```

Configuration OpenClaw :

```json5
{
  channels: {
    signal: {
      enabled: true,
      account: "+15551234567",
      httpUrl: "http://signal-cli:8080",
      autoStart: false,
      apiMode: "container", // or "auto" to detect automatically
    },
  },
}
```

Le champ `apiMode` contrôle le protocole utilisé par OpenClaw :

| Valeur        | Comportement                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `"auto"`      | (Par défaut) Sonde les deux transports ; le streaming valide la réception WebSocket du conteneur |
| `"native"`    | Force signal-cli natif (JSON-RPC sur `/api/v1/rpc`, SSE sur `/api/v1/events`)                    |
| `"container"` | Force le conteneur bbernhard (REST sur `/v2/send`, WebSocket sur `/v1/receive/{account}`)        |

Lorsque `apiMode` est `"auto"`OpenClaw, OpenClaw met en cache le mode détecté pendant 30 secondes pour éviter des sondages répétés. La réception par conteneur n'est sélectionnée pour le streaming qu'après que `/v1/receive/{account}` a effectué une mise à niveau vers WebSocket, ce qui nécessite `MODE=json-rpc`.

Le mode conteneur prend en charge les mêmes opérations de canal Signal que le mode natif lorsque le conteneur expose des API correspondantes : envois, réceptions, pièces jointes, indicateurs de frappe, accusés de réception/lecture, réactions, groupes et texte stylé. OpenClaw traduit ses appels RPC Signal natifs en charges utiles REST du conteneur, y compris les SignalOpenClawSignalRPC`group.{base64(internal_id)}` d'ID de groupe et `text_mode: "styled"` pour le texte formaté.

Notes opérationnelles :

- Utilisez `autoStart: false`OpenClaw avec le mode conteneur. OpenClaw ne doit pas lancer un démon natif lorsque `apiMode: "container"` est sélectionné.
- Utilisez `MODE=json-rpc` pour la réception. `MODE=normal` peut faire paraître `/v1/about` sain, mais `/v1/receive/{account}`OpenClaw n'effectue pas de mise à niveau WebSocket, donc OpenClaw ne sélectionnera pas le flux de réception du conteneur en mode `auto`.
- Définissez `apiMode: "container"` lorsque vous savez que `httpUrl`API pointe vers l'API REST de bbernhard. Définissez `apiMode: "native"` lorsque vous savez qu'il pointe vers le JSON-RPC/SSE natif de `signal-cli`RPC. Utilisez `"auto"` lorsque le déploiement peut varier.
- Les téléchargements de pièces jointes du conteneur respectent les mêmes limites d'octets de média que le mode natif. Les réponses trop volumineuses sont rejetées avant d'être entièrement tamponnées lorsque le serveur envoie `Content-Length`, et lors du streaming sinon.

## Contrôle d'accès (DMs + groupes)

DMs :

- Par défaut : `channels.signal.dmPolicy = "pairing"`.
- Les expéditeurs inconnus reçoivent un code d'appariement ; les messages sont ignorés jusqu'à approbation (les codes expirent après 1 heure).
- Approuver via :
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- L'appairage est l'échange de jetons par défaut pour les DMs Signal. Détails : [Appairage](/fr/channels/pairing)
- Les expéditeurs UUID uniquement (de `sourceUuid`) sont stockés sous forme de `uuid:<id>` dans `channels.signal.allowFrom`.

Groupes :

- `channels.signal.groupPolicy = open | allowlist | disabled`.
- `channels.signal.groupAllowFrom` contrôle quels groupes ou expéditeurs peuvent déclencher des réponses de groupe lorsque `allowlist`Signal est défini ; les entrées peuvent être des ID de groupe Signal (bruts, `group:<id>` ou `signal:group:<id>`), des numéros de téléphone d'expéditeur, des valeurs `uuid:<id>` ou `*`.
- `channels.signal.groups["<group-id>" | "*"]` peut remplacer le comportement du groupe avec `requireMention`, `tools` et `toolsBySender`.
- Utilisez `channels.signal.accounts.<id>.groups` pour des remplacements par compte dans les configurations multi-comptes.
- Ajouter un groupe Signal à la liste blanche via Signal`groupAllowFrom` ne désactive pas par lui-même le filtrage par mention. Une entrée `channels.signal.groups["<group-id>"]` spécifiquement configurée traite chaque message de groupe, sauf si `requireMention=true` est défini.
- Note d'exécution : si `channels.signal` est totalement manquant, l'exécution revient à `groupPolicy="allowlist"` pour les vérifications de groupe (même si `channels.defaults.groupPolicy` est défini).

## Fonctionnement (comportement)

- Mode natif : `signal-cli` s'exécute en tant que démon ; la passerelle lit les événements via SSE.
- Mode conteneur : la passerelle envoie via l'API REST et reçoit via WebSocket.
- Les messages entrants sont normalisés dans l'enveloppe de canal partagée.
- Les réponses sont toujours acheminées vers le même numéro ou groupe.

## Médias + limites

- Le texte sortant est découpé par morceaux à `channels.signal.textChunkLimit` (par défaut 4000).
- Découpage par nouvelle ligne optionnel : définissez `channels.signal.chunkMode="newline"` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- Pièces jointes prises en charge (base64 récupéré depuis `signal-cli`).
- Les pièces jointes de notes vocales utilisent le nom de fichier `signal-cli` comme solution de repli MIME lorsque `contentType` est manquant, afin que la transcription audio puisse toujours classer les mémos vocaux AAC.
- Limite média par défaut : `channels.signal.mediaMaxMb` (par défaut 8).
- Utilisez `channels.signal.ignoreAttachments` pour ignorer le téléchargement des médias.
- Le contexte de l'historique du groupe utilise `channels.signal.historyLimit` (ou `channels.signal.accounts.*.historyLimit`), en revenant à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver (par défaut 50).

## Indicateurs de frappe + accusés de lecture

- **Indicateurs de frappe** : OpenClaw envoie des signaux de frappe via OpenClaw`signal-cli sendTyping` et les actualise pendant qu'une réponse est en cours.
- **Accusés de réception** : lorsque `channels.signal.sendReadReceipts`OpenClaw est true, OpenClaw transfère les accusés de réception pour les DMs autorisés.
- Signal-cli n'expose pas d'accusés de réception pour les groupes.

## Réactions (message tool)

- Utilisez `message action=react` avec `channel=signal`.
- Cibles : E.164 ou UUID de l'expéditeur (utilisez `uuid:<id>` depuis la sortie de l'appairage ; l'UUID seul fonctionne aussi).
- `messageId`Signal est l'horodatage Signal du message auquel vous réagissez.
- Les réactions de groupe nécessitent `targetAuthor` ou `targetAuthorUuid`.

Exemples :

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

Configuration :

- `channels.signal.actions.reactions` : activer/désactiver les actions de réaction (vrai par défaut).
- `channels.signal.reactionLevel` : `off | ack | minimal | extensive`.
  - `off`/`ack` désactive les réactions de l'agent (l'outil de message `react` générera une erreur).
  - `minimal`/`extensive` active les réactions de l'agent et définit le niveau de guidage.
- Remplacements par compte : `channels.signal.accounts.<id>.actions.reactions`, `channels.signal.accounts.<id>.reactionLevel`.

## Réactions d'approbation

Les invites d'approbation pour l'exécution et les plugins Signal utilisent les blocs de routage de premier niveau `approvals.exec` et `approvals.plugin`. Signal n'a pas de bloc `channels.signal.execApprovals`.

- `👍` approuve une seule fois.
- `👎` refuse.
- Utilisez `/approve <id> allow-always` lorsqu'une demande offre une approbation persistante.

La résolution des réactions d'approbation nécessite des approbateurs Signal explicites provenant de `channels.signal.allowFrom`, `channels.signal.defaultTo` ou des champs correspondants au niveau du compte.
Les invites d'approbation d'exécution directe dans le même chat peuvent toujours supprimer le repli local `/approve` en double
sans approbateurs explicites ; les approbations de groupe sans approbateur gardent le repli local visible.

## Cibles de livraison (CLI/cron)

- DMs : `signal:+15551234567` (ou E.164 brut).
- DMs UUID : `uuid:<id>` (ou UUID nu).
- Groupes : `signal:group:<groupId>`.
- Noms d'utilisateur : `username:<name>` (si pris en charge par votre compte Signal).

## Dépannage

Exécutez d'abord cette échelle :

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Confirmez ensuite l'état de l'appairage DM si nécessaire :

```bash
openclaw pairing list signal
```

Pannes courantes :

- Démon accessible mais pas de réponses : vérifiez les paramètres du compte/démon (`httpUrl`, `account`) et le mode de réception.
- DMs ignorés : l'expéditeur est en attente d'approbation d'appairage.
- Messages de groupe ignorés : le blocage de l'expéditeur/mention du groupe empêche la livraison.
- Erreurs de validation de configuration après modifications : exécutez `openclaw doctor --fix`.
- Signal manquant dans les diagnostics : confirmez `channels.signal.enabled: true`.

Vérifications supplémentaires :

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

Pour le flux de triage : [/channels/troubleshooting](/fr/channels/troubleshooting).

## Notes de sécurité

- `signal-cli` stocke les clés de compte localement (généralement `~/.local/share/signal-cli/data/`).
- Sauvegardez l'état du compte Signal avant la migration ou la reconstruction du serveur.
- Conservez `channels.signal.dmPolicy: "pairing"` sauf si vous souhaitez explicitement un accès DM plus large.
- La vérification par SMS n'est nécessaire que pour les flux d'enregistrement ou de récupération, mais la perte de contrôle du numéro/compte peut compliquer la réinscription.

## Référence de configuration (Signal)

Configuration complète : [Configuration](/fr/gateway/configuration)

Options du fournisseur :

- `channels.signal.enabled` : activer/désactiver le démarrage du channel.
- `channels.signal.apiMode` : `auto | native | container` (par défaut : auto). Voir [Container mode](#container-mode-bbernhardsignal-cli-rest-api).
- `channels.signal.account` : E.164 pour le compte bot.
- `channels.signal.cliPath` : chemin vers `signal-cli`.
- `channels.signal.configPath` : répertoire `signal-cli --config` facultatif.
- `channels.signal.httpUrl` : URL complète du démon (remplace l'hôte/port).
- `channels.signal.httpHost`, `channels.signal.httpPort` : liaison du démon (par défaut 127.0.0.1:8080).
- `channels.signal.autoStart` : lancement automatique du démon (par défaut vrai si `httpUrl` non défini).
- `channels.signal.startupTimeoutMs` : délai d'attente de démarrage en ms (max 120000).
- `channels.signal.receiveMode` : `on-start | manual`.
- `channels.signal.ignoreAttachments` : ignorer les téléchargements de pièces jointes.
- `channels.signal.ignoreStories` : ignorer les stories du démon.
- `channels.signal.sendReadReceipts` : transférer les accusés de lecture.
- `channels.signal.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appairage).
- `channels.signal.allowFrom` : liste blanche de DM (E.164 ou `uuid:<id>`). `open` nécessite `"*"`Signal. Signal n'a pas de noms d'utilisateur ; utilisez les identifiants téléphone/UUID.
- `channels.signal.groupPolicy` : `open | allowlist | disabled` (par défaut : allowlist).
- `channels.signal.groupAllowFrom`Signal : liste blanche de groupe ; accepte les ID de groupe Signal (bruts, `group:<id>`, ou `signal:group:<id>`), les numéros E.164 de l'expéditeur, ou les valeurs `uuid:<id>`.
- `channels.signal.groups`Signal : remplacements par groupe indexés par l'ID de groupe Signal (ou `"*"`). Champs pris en charge : `requireMention`, `tools`, `toolsBySender`.
- `channels.signal.accounts.<id>.groups` : version par compte de `channels.signal.groups` pour les configurations multi-comptes.
- `channels.signal.historyLimit` : nombre maximum de messages de groupe à inclure comme contexte (0 désactive).
- `channels.signal.dmHistoryLimit` : limite d'historique DM en tours utilisateur. Remplacements par utilisateur : `channels.signal.dms["<phone_or_uuid>"].historyLimit`.
- `channels.signal.textChunkLimit` : taille des blocs sortants (caractères).
- `channels.signal.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphe) avant le découpage par longueur.
- `channels.signal.mediaMaxMb` : limite de média entrant/sortant (Mo).

Options globales connexes :

- `agents.list[].groupChat.mentionPatterns`Signal (Signal ne prend pas en charge les mentions natives).
- `messages.groupChat.mentionPatterns` (repli global).
- `messages.responsePrefix`.

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) — tous les canaux pris en charge
- [Appairage](/fr/channels/pairing) — authentification DM et flux d'appairage
- [Groupes](/fr/channels/groups) — comportement du chat de groupe et filtrage des mentions
- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
