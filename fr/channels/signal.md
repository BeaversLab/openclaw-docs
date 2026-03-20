---
summary: "Support Signal via signal-cli (JSON-RPC + SSE), chemins de configuration, et modèle de numéro"
read_when:
  - Configuration du support Signal
  - Débogage de l'envoi/réception Signal
title: "Signal"
---

# Signal (signal-cli)

État : intégration CLI externe. Le Gateway communique avec `signal-cli` via HTTP JSON-RPC + SSE.

## Prérequis

- OpenClaw installé sur votre serveur (le flux Linux ci-dessous a été testé sur Ubuntu 24).
- `signal-cli` disponible sur l'hôte où le Gateway s'exécute.
- Un numéro de téléphone pouvant recevoir un SMS de vérification (pour le chemin d'enregistrement par SMS).
- Accès navigateur pour le captcha Signal (`signalcaptchas.org`) lors de l'enregistrement.

## Configuration rapide (débutant)

1. Utilisez un **numéro Signal distinct** pour le bot (recommandé).
2. Installez `signal-cli` (Java requis si vous utilisez la version JVM).
3. Choisissez un chemin de configuration :
   - **Chemin A (liaison QR) :** `signal-cli link -n "OpenClaw"` et scannez avec Signal.
   - **Chemin B (enregistrement SMS) :** enregistrez un numéro dédié avec captcha + vérification SMS.
4. Configurez OpenClaw et redémarrez le Gateway.
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

| Champ       | Description                                       |
| ----------- | ------------------------------------------------- |
| `account`   | Numéro de téléphone du bot au format E.164 (`+15551234567`) |
| `cliPath`   | Chemin vers `signal-cli` (`signal-cli` si sur `PATH`)  |
| `dmPolicy`  | Politique d'accès DM (`pairing` recommandé)          |
| `allowFrom` | Numéros de téléphone ou valeurs `uuid:<id>` autorisés à envoyer un DM |

## Ce que c'est

- Canal Signal via `signal-cli` (pas de libsignal intégré).
- Routage déterministe : les réponses reviennent toujours à Signal.
- Les DMs partagent la session principale de l'agent ; les groupes sont isolés (`agent:<agentId>:signal:group:<groupId>`).

## Écritures de configuration

Par défaut, Signal est autorisé à écrire des mises à jour de configuration déclenchées par `/config set|unset` (nécessite `commands.config: true`).

Désactiver avec :

```json5
{
  channels: { signal: { configWrites: false } },
}
```

## Le modèle de numéro (important)

- Le Gateway se connecte à un **appareil Signal** (le compte `signal-cli`).
- Si vous exécutez le bot sur **votre compte personnel Signal**, il ignorera vos propres messages (protection contre les boucles).
- Pour "J'envoie un message au bot et il répond", utilisez un **numéro de bot séparé**.

## Chemin de configuration A : lier un compte Signal existant (QR)

1. Installez `signal-cli` (version JVM ou native).
2. Lier un compte de bot :
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

Support multi-compte : utilisez `channels.signal.accounts` avec une configuration par compte et `name` en option. Consultez [`gateway/configuration`](/fr/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) pour le modèle partagé.

## Chemin de configuration B : enregistrer un numéro de bot dédié (SMS, Linux)

Utilisez cette méthode si vous souhaitez un numéro de bot dédié au lieu de lier un compte d'application Signal existant.

1. Obtenez un numéro capable de recevoir des SMS (ou une vérification vocale pour les lignes fixes).
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
Gardez `signal-cli` à jour ; les responsables en amont notent que les anciennes versions peuvent cesser de fonctionner lorsque les API du serveur Signal changent.

3. Enregistrez et vérifiez le numéro :

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register
```

Si un captcha est requis :

1. Ouvrez `https://signalcaptchas.org/registration/generate.html`.
2. Complétez le captcha, copiez la cible du lien `signalcaptcha://...` depuis « Open Signal ».
3. Exécutez depuis la même adresse IP externe que la session du navigateur lorsque c'est possible.
4. Exécutez l'enregistrement à nouveau immédiatement (les jetons de captcha expirent rapidement) :

```bash
signal-cli -a +<BOT_PHONE_NUMBER> register --captcha '<SIGNALCAPTCHA_URL>'
signal-cli -a +<BOT_PHONE_NUMBER> verify <VERIFICATION_CODE>
```

4. Configurez OpenClaw, redémarrez la passerelle, vérifiez le canal :

```bash
# If you run the gateway as a user systemd service:
systemctl --user restart openclaw-gateway

# Then verify:
openclaw doctor
openclaw channels status --probe
```

5. Associez votre expéditeur DM :
   - Envoyez n'importe quel message au numéro du bot.
   - Approuvez le code sur le serveur : `openclaw pairing approve signal <PAIRING_CODE>`.
   - Enregistrez le numéro du bot comme un contact sur votre téléphone pour éviter « Contact inconnu ».

Important : l'enregistrement d'un compte de numéro de téléphone avec `signal-cli` peut déconnecter la session principale de l'application Signal pour ce numéro. Privilégiez un numéro de bot dédié, ou utilisez le mode de liaison par QR si vous devez conserver votre configuration d'application téléphonique existante.

Références en amont :

- README `signal-cli` : `https://github.com/AsamK/signal-cli`
- Flux Captcha : `https://github.com/AsamK/signal-cli/wiki/Registration-with-captcha`
- Flux de liaison : `https://github.com/AsamK/signal-cli/wiki/Linking-other-devices-(Provisioning)`

## Mode démon externe (httpUrl)

Si vous souhaitez gérer `signal-cli` vous-même (démarrages à froid JVM lents, initialisation du conteneur ou CPU partagés), exécutez le démon séparément et pointez OpenClaw vers celui-ci :

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

Cela évite le démarrage automatique et l'attente de démarrage dans OpenClaw. Pour les démarrages lents lors du démarrage automatique, définissez `channels.signal.startupTimeoutMs`.

## Contrôle d'accès (DMs + groupes)

DMs :

- Par défaut : `channels.signal.dmPolicy = "pairing"`.
- Les expéditeurs inconnus reçoivent un code d'appariement ; les messages sont ignorés jusqu'à approbation (les codes expirent après 1 heure).
- Approuver via :
  - `openclaw pairing list signal`
  - `openclaw pairing approve signal <CODE>`
- L'appariement est l'échange de jetons par défaut pour les DMs Signal. Détails : [Appariement](/fr/channels/pairing)
- Les expéditeurs UUID uniquement (à partir de `sourceUuid`) sont stockés sous la forme `uuid:<id>` dans `channels.signal.allowFrom`.

Groupes :

- `channels.signal.groupPolicy = open | allowlist | disabled`.
- `channels.signal.groupAllowFrom` contrôle qui peut déclencher dans les groupes lorsque `allowlist` est défini.
- `channels.signal.groups["<group-id>" | "*"]` peut remplacer le comportement du groupe avec `requireMention`, `tools` et `toolsBySender`.
- Utilisez `channels.signal.accounts.<id>.groups` pour les remplacements par compte dans les configurations multi-comptes.
- Note d'exécution : si `channels.signal` est complètement manquant, l'exécution revient à `groupPolicy="allowlist"` pour les vérifications de groupe (même si `channels.defaults.groupPolicy` est défini).

## Fonctionnement (comportement)

- `signal-cli` s'exécute en tant que démon ; la passerelle lit les événements via SSE.
- Les messages entrants sont normalisés dans l'enveloppe de canal partagée.
- Les réponses sont toujours acheminées vers le même numéro ou groupe.

## Médias + limites

- Le texte sortant est découpé en morceaux de `channels.signal.textChunkLimit` (par défaut 4000).
- Découpage en lignes facultatif : définissez `channels.signal.chunkMode="newline"` pour diviser sur les lignes vides (limites de paragraphes) avant le découpage par longueur.
- Pièces jointes prises en charge (base64 récupéré depuis `signal-cli`).
- Limite média par défaut : `channels.signal.mediaMaxMb` (par défaut 8).
- Utilisez `channels.signal.ignoreAttachments` pour ignorer le téléchargement des médias.
- Group history context uses `channels.signal.historyLimit` (or `channels.signal.accounts.*.historyLimit`), falling back to `messages.groupChat.historyLimit`. Set `0` to disable (default 50).

## Typing + read receipts

- **Typing indicators**: OpenClaw sends typing signals via `signal-cli sendTyping` and refreshes them while a reply is running.
- **Read receipts**: when `channels.signal.sendReadReceipts` is true, OpenClaw forwards read receipts for allowed DMs.
- Signal-cli does not expose read receipts for groups.

## Reactions (message tool)

- Use `message action=react` with `channel=signal`.
- Targets: sender E.164 or UUID (use `uuid:<id>` from pairing output; bare UUID works too).
- `messageId` is the Signal timestamp for the message you’re reacting to.
- Group reactions require `targetAuthor` or `targetAuthorUuid`.

Examples:

```
message action=react channel=signal target=uuid:123e4567-e89b-12d3-a456-426614174000 messageId=1737630212345 emoji=🔥
message action=react channel=signal target=+15551234567 messageId=1737630212345 emoji=🔥 remove=true
message action=react channel=signal target=signal:group:<groupId> targetAuthor=uuid:<sender-uuid> messageId=1737630212345 emoji=✅
```

Config:

- `channels.signal.actions.reactions`: enable/disable reaction actions (default true).
- `channels.signal.reactionLevel`: `off | ack | minimal | extensive`.
  - `off`/`ack` disables agent reactions (message tool `react` will error).
  - `minimal`/`extensive` enables agent reactions and sets the guidance level.
- Per-account overrides: `channels.signal.accounts.<id>.actions.reactions`, `channels.signal.accounts.<id>.reactionLevel`.

## Delivery targets (CLI/cron)

- DMs: `signal:+15551234567` (or plain E.164).
- UUID DMs: `uuid:<id>` (or bare UUID).
- Groups: `signal:group:<groupId>`.
- Usernames: `username:<name>` (if supported by your Signal account).

## Troubleshooting

Run this ladder first:

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

Then confirm DM pairing state if needed:

```bash
openclaw pairing list signal
```

Common failures:

- Daemon reachable but no replies: verify account/daemon settings (`httpUrl`, `account`) and receive mode.
- DMs ignored: sender is pending pairing approval.
- Group messages ignored: group sender/mention gating blocks delivery.
- Config validation errors after edits: run `openclaw doctor --fix`.
- Signal absent des diagnostics : confirmez `channels.signal.enabled: true`.

Vérifications supplémentaires :

```bash
openclaw pairing list signal
pgrep -af signal-cli
grep -i "signal" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" | tail -20
```

Pour le flux de triage : [/channels/troubleshooting](/fr/channels/troubleshooting).

## Notes de sécurité

- `signal-cli` stocke les clés de compte localement (typiquement `~/.local/share/signal-cli/data/`).
- Sauvegardez l'état du compte Signal avant la migration ou la reconstruction du serveur.
- Conservez `channels.signal.dmPolicy: "pairing"` sauf si vous souhaitez explicitement un accès DM plus large.
- La vérification par SMS n'est nécessaire que pour les flux d'inscription ou de récupération, mais la perte de contrôle du numéro/compte peut compliquer la réinscription.

## Référence de configuration (Signal)

Configuration complète : [Configuration](/fr/gateway/configuration)

Options du fournisseur :

- `channels.signal.enabled` : activer/désactiver le démarrage du canal.
- `channels.signal.account` : E.164 pour le compte bot.
- `channels.signal.cliPath` : chemin vers `signal-cli`.
- `channels.signal.httpUrl` : URL complète du démon (remplace hôte/port).
- `channels.signal.httpHost`, `channels.signal.httpPort` : liaison du démon (par défaut 127.0.0.1:8080).
- `channels.signal.autoStart` : lancement automatique du démon (vrai par défaut si `httpUrl` n'est pas défini).
- `channels.signal.startupTimeoutMs` : délai d'attente de démarrage en ms (plafond 120000).
- `channels.signal.receiveMode` : `on-start | manual`.
- `channels.signal.ignoreAttachments` : ignorer les téléchargements de pièces jointes.
- `channels.signal.ignoreStories` : ignorer les stories du démon.
- `channels.signal.sendReadReceipts` : transmettre les accusés de lecture.
- `channels.signal.dmPolicy` : `pairing | allowlist | open | disabled` (par défaut : appairage).
- `channels.signal.allowFrom` : liste d'autorisation DM (E.164 ou `uuid:<id>`). `open` nécessite `"*"`. Signal n'a pas de noms d'utilisateur ; utilisez les identifiants téléphone/UUID.
- `channels.signal.groupPolicy` : `open | allowlist | disabled` (par défaut : liste d'autorisation).
- `channels.signal.groupAllowFrom` : liste d'autorisation des expéditeurs de groupe.
- `channels.signal.groups` : substitutions par groupe indexées par l'ID de groupe Signal (ou `"*"`). Champs pris en charge : `requireMention`, `tools`, `toolsBySender`.
- `channels.signal.accounts.<id>.groups` : version par compte de `channels.signal.groups` pour les configurations multi-comptes.
- `channels.signal.historyLimit` : nombre maximum de messages de groupe à inclure en tant que contexte (0 désactive).
- `channels.signal.dmHistoryLimit` : limite de l'historique des DM en tours utilisateur. Substitutions par utilisateur : `channels.signal.dms["<phone_or_uuid>"].historyLimit`.
- `channels.signal.textChunkLimit` : taille des blocs sortants (caractères).
- `channels.signal.chunkMode` : `length` (par défaut) ou `newline` pour diviser sur les lignes vides (limites de paragraphes) avant le découpage par longueur.
- `channels.signal.mediaMaxMb` : limite de média entrant/sortant (Mo).

Options globales connexes :

- `agents.list[].groupChat.mentionPatterns` (Signal ne prend pas en charge les mentions natives).
- `messages.groupChat.mentionPatterns` (alternative globale).
- `messages.responsePrefix`.

import en from "/components/footer/en.mdx";

<en />
