---
summary: "Plugin Google Meet : rejoindre des URL Meet explicites via Chrome ou Twilio avec les paramètres par défaut de talk-back de l'agent"
read_when:
  - You want an OpenClaw agent to join a Google Meet call
  - You want an OpenClaw agent to create a new Google Meet call
  - You are configuring Chrome, Chrome node, or Twilio as a Google Meet transport
title: "Plugin Google Meet"
---

Prise en charge des participants Google Meet pour OpenClaw — le plug-in est explicite par conception :

- Il ne rejoint qu'une URL `https://meet.google.com/...` explicite.
- Il peut créer un nouvel espace Meet via l'API Google Meet, puis rejoindre l'URL renvoyée.
- `agent` est le mode talk-back par défaut : la transcription en temps réel écoute, l'agent OpenClawOpenClaw configuré répond, et le TTS OpenClaw standard parle dans Meet.
- `bidi` reste disponible comme mode de secours direct pour le modèle vocal en temps réel.
- Les agents choisissent le comportement de jointure avec `mode` : utilisez `agent` pour l'écoute/le talk-back en direct, `bidi` pour le secours vocal en temps réel direct, ou `transcribe` pour rejoindre/contrôler le navigateur sans le pont de talk-back.
- L'authentification commence par un OAuth Google personnel ou un profil Chrome déjà connecté.
- Il n'y a pas d'annonce de consentement automatique.
- Le backend audio Chrome par défaut est `BlackHole 2ch`.
- Chrome peut fonctionner localement ou sur un hôte de nœud appairé.
- Twilio accepte un numéro d'appel plus un code PIN ou une séquence DTMF facultatif ; il ne peut pas composer d'URL Meet directement.
- La commande CLI est `googlemeet` ; `meet` est réservée aux flux de travail de téléconférence d'agent plus larges.

## Quick start

Installez les dépendances audio locales et configurez un fournisseur de transcription en temps réel ainsi que le TTS OpenClaw standard. OpenAI est le fournisseur de transcription par défaut ; Google Gemini Live fonctionne également comme un secours vocal `bidi` distinct avec `realtime.voiceProvider: "google"` :

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# only needed when realtime.voiceProvider is "google" for bidi mode
export GEMINI_API_KEY=...
```

`blackhole-2ch` installe le périphérique audio virtuel `BlackHole 2ch`. Le programme d'installation de Homebrew nécessite un redémarrage avant que macOS n'expose le périphérique :

```bash
sudo reboot
```

Après redémarrage, vérifiez les deux éléments :

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

Activez le plugin :

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

Vérifiez la configuration :

```bash
openclaw googlemeet setup
```

La sortie de configuration est destinée à être lisible par l'agent et consciente du mode. Elle signale le profil Chrome, l'épinglage de nœud et, pour les jointures Chrome en temps réel, le pont audio BlackHole/SoX ainsi que les vérifications d'introduction en temps réel différées. Pour les jointures en observation seule, vérifiez le même transport avec `--mode transcribe` ; ce mode ignore les prérequis audio en temps réel car il n'écoute pas et ne parle pas via le pont :

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
```

Lorsque la délégation Twilio est configurée, la configuration signale également si le plug-in `voice-call`, les identifiants Twilio et l'exposition du webhook public sont prêts. Traitez toute vérification `ok: false` comme un bloquant pour le transport et le mode vérifiés avant de demander à un agent de rejoindre. Utilisez `openclaw googlemeet setup --json` pour les scripts ou la sortie lisible par machine. Utilisez `--transport chrome`, `--transport chrome-node` ou `--transport twilio` pour effectuer une pré-vérification d'un transport spécifique avant qu'un agent ne l'essaie.

Pour Twilio, effectuez toujours une pré-vérification explicite du transport lorsque le transport par défaut est Chrome :

```bash
openclaw googlemeet setup --transport twilio
```

Cela permet de détecter le câblage manquant de `voice-call`, les identifiants Twilio ou l'exposition du webhook inaccessible avant que l'agent n'essaie de composer la réunion.

Rejoindre une réunion :

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

Ou laissez un agent rejoindre via l'outil `google_meet` :

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

L'outil `google_meet` destiné à l'agent reste disponible sur les hôtes non macOS pour les flux d'artefacts, de calendrier, de configuration, de transcription, Twilio et `chrome-node`. Les actions locales de talk-back Chrome sont bloquées car le chemin audio Chrome groupé dépend actuellement de macOS `BlackHole 2ch`. Sur Linux, utilisez `mode: "transcribe"`, l'appel Twilio ou un hôte macOS `chrome-node` pour la participation talk-back Chrome.

Créer une nouvelle réunion et la rejoindre :

```bash
openclaw googlemeet create --transport chrome-node --mode agent
```

Pour les salles créées via API, utilisez `SpaceConfig.accessType` Google Meet lorsque vous souhaitez que la stratégie sans frappe de la salle soit explicite plutôt qu'héritée des paramètres par défaut du compte Google :

```bash
openclaw googlemeet create --access-type OPEN --transport chrome-node --mode agent
```

`OPEN` permet à toute personne disposant de l'URL Meet de rejoindre sans frapper. `TRUSTED` permet aux utilisateurs de confiance de l'organisation hôte, aux utilisateurs externes invités et aux utilisateurs composant le numéro de rejoindre sans frapper. `RESTRICTED` limite l'entrée sans frappe aux invités. Ces paramètres s'appliquent uniquement au chemin de création officiel de API Google Meet, donc les identifiants OAuth doivent être configurés.

Si vous avez authentifié Google Meet avant que cette option ne soit disponible, réexécutez
`openclaw googlemeet auth login --json` après avoir ajouté la portée
`meetings.space.settings` à votre écran de consentement Google OAuth.

Créer uniquement l'URL sans rejoindre :

```bash
openclaw googlemeet create --no-join
```

`googlemeet create` a deux chemins :

- Création API : utilisée lorsque les identifiants OAuth de Google Meet sont configurés. C'est
  le chemin le plus déterministe et ne dépend pas de l'état de l'interface utilisateur du navigateur.
- Alternative navigateur : utilisée lorsque les identifiants OAuth sont absents. OpenClaw utilise le
  nœud Chrome épinglé, ouvre `https://meet.google.com/new`, attend que Google
  redirige vers une véritable URL de code de réunion, puis renvoie cette URL. Ce chemin nécessite
  que le profil Chrome OpenClaw sur le nœud soit déjà connecté à Google.
  L'automatisation du navigateur gère la propre invite de microphone au premier lancement de Meet ; cette invite
  n'est pas considérée comme un échec de connexion Google.
  Les flux de création et de jointure tentent également de réutiliser un onglet Meet existant avant d'en
  ouvrir un nouveau. La correspondance ignore les chaînes de requête d'URL inoffensives telles que `authuser`, donc une
  nouvelle tentative de l'agent devrait se concentrer sur la réunion déjà ouverte au lieu de créer un second
  onglet Chrome.

La sortie de commande/outil comprend un champ `source` (`api` ou `browser`) afin que les agents
puissent expliquer quel chemin a été utilisé. `create` rejoint la nouvelle réunion par défaut et
renvoie `joined: true` ainsi que la session de jointure. Pour créer uniquement l'URL, utilisez
`create --no-join` sur la CLI ou passez `"join": false` à l'outil.

Ou dites à un agent : « Créez un Google Meet, rejoignez-le avec le mode talk-back de l'agent,
et envoyez-moi le lien. » L'agent doit appeler `google_meet` avec
`action: "create"` puis partager le `meetingUri` renvoyé.

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent"
}
```

Pour une jointure en mode observation uniquement/contrôle du navigateur, définissez `"mode": "transcribe"`OpenClaw. Cela ne démarre pas le pont audio temps réel duplex, ne nécessite pas BlackHole ou SoX, et ne répondra pas dans la réunion. Les jointures Chrome dans ce mode évitent également l'octroi d'autorisation de microphone/caméra d'OpenClaw et évitent le chemin **Utiliser le microphone** de Meet. Si Meet affiche une page interstitielle de choix audio, l'automatisation tente le chemin sans microphone et signale sinon une action manuelle au lieu d'ouvrir le microphone local. En mode transcription, les transports Chrome gérés installent également un observateur de sous-titres Meet de meilleure effort. `googlemeet status --json` et `googlemeet doctor` affichent `captioning`, `captionsEnabledAttempted`, `transcriptLines`, `lastCaptionAt`, `lastCaptionSpeaker`, `lastCaptionText` et une courte traîne `recentTranscript` afin que les opérateurs puissent déterminer si le navigateur a rejoint l'appel et si les sous-titres Meet produisent du texte.
Utilisez `openclaw googlemeet test-listen <meet-url> --transport chrome-node` lorsque vous avez besoin d'une sonde oui/non : il rejoint en mode transcription, attend un nouveau mouvement de sous-titre ou de transcription, et renvoie `listenVerified`, `listenTimedOut`, les champs d'action manuelle et la dernière santé des sous-titres.

Pendant les sessions en temps réel, l'état `google_meet` inclut la santé du navigateur et du pont audio, telle que `inCall`, `manualActionRequired`, `providerConnected`, `realtimeReady`, `audioInputActive`, `audioOutputActive`, les derniers horodatages d'entrée/sortie, les compteurs d'octets et l'état de fermeture du pont. Si une invite de page Meet sûre apparaît, l'automatisation du navigateur la gère si possible. Les invites de connexion, d'admission de l'hôte et d'autorisations navigateur/OS sont signalées en tant qu'action manuelle avec une raison et un message pour l'agent à relayer. Les sessions Chrome gérées n'émettent la phrase d'introduction ou de test qu'après que les rapports de santé du navigateur ont indiqué `inCall: true` ; sinon, l'état signale `speechReady: false` et la tentative de parole est bloquée au lieu de faire semblant que l'agent a parlé dans la réunion.

Le Chrome local rejoint via le profil de navigateur OpenClaw connecté. Le mode temps réel nécessite OpenClaw`BlackHole 2ch`OpenClaw pour le chemin du microphone/haut-parleur utilisé par OpenClaw. Pour un audio duplex propre, utilisez des périphériques virtuels distincts ou un graphe de type Loopback ; un seul périphérique BlackHole suffit pour un premier test de fumée mais peut créer des échos.

### Passerelle locale + Chrome Parallels

Vous n'avez **pas** besoin d'une passerelle OpenClaw complète ou d'une clé API de modèle dans une VM macOS juste pour que la VM possède Chrome. Exécutez la passerelle et l'agent localement, puis exécutez un hôte de nœud dans la VM. Activez le plugin inclus sur la VM une fois pour que le nœud annonce la commande Chrome :

Ce qui s'exécute où :

- Hôte de la passerelle : passerelle OpenClaw, espace de travail de l'agent, clés de modèle/API, fournisseur en temps réel, et la configuration du plugin Google Meet.
- VM macOS Parallels : hôte CLI/nœud OpenClaw, Google Chrome, SoX, BlackHole 2ch, et un profil Chrome connecté à Google.
- Non nécessaire dans la VM : service de passerelle, configuration de l'agent, clé OpenAI/GPT, ou configuration du fournisseur de modèle.

Installez les dépendances de la VM :

```bash
brew install blackhole-2ch sox
```

Redémarrez la VM après avoir installé BlackHole pour que macOS expose macOS`BlackHole 2ch` :

```bash
sudo reboot
```

Après le redémarrage, vérifiez que la VM peut voir le périphérique audio et les commandes SoX :

```bash
system_profiler SPAudioDataType | grep -i BlackHole
command -v sox
```

Installez ou mettez à jour OpenClaw dans la VM, puis activez le plugin inclus à cet endroit :

```bash
openclaw plugins enable google-meet
```

Démarrez l'hôte du nœud dans la VM :

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name parallels-macos
```

Si `<gateway-host>` est une IP LAN et que vous n'utilisez pas TLS, le nœud refuse le WebSocket en clair à moins que vous n'optiez pour ce réseau privé de confiance :

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

Utilisez la même variable d'environnement lors de l'installation du nœud en tant que LaunchAgent :

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install --host <gateway-lan-ip> --port 18789 --display-name parallels-macos --force
openclaw node restart
```

`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` est l'environnement du processus, pas un paramètre `openclaw.json`. `openclaw node install` le stocke dans l'environnement du LaunchAgent lorsqu'il est présent sur la commande d'installation.

Approuvez le nœud depuis l'hôte de la passerelle :

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Confirmez que le Gateway voit le nœud et qu'il annonce `googlemeet.chrome`
et la capacité du navigateur/`browser.proxy` :

```bash
openclaw nodes status
```

Acheminez Meet via ce nœud sur l'hôte du Gateway :

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["googlemeet.chrome", "browser.proxy"],
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          chrome: {
            guestName: "OpenClaw Agent",
            autoJoin: true,
            reuseExistingTab: true,
          },
          chromeNode: {
            node: "parallels-macos",
          },
        },
      },
    },
  },
}
```

Rejoignez maintenant normalement depuis l'hôte du Gateway :

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij
```

ou demandez à l'agent d'utiliser l'outil `google_meet` avec `transport: "chrome-node"`.

Pour un test de fumée en une seule commande qui crée ou réutilise une session, prononce une
phrase connue et imprime l'état de la session :

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij
```

Pendant la connexion en temps réel, l'automatisation du navigateur OpenClaw remplit le nom de l'invité, clique
sur Join/Ask to join, et accepte le choix « Use microphone » de première exécution de Meet lorsque cette
invite apparaît. Lors d'une connexion en observation seule ou de la création d'une réunion en navigateur uniquement,
elle poursuit au-delà de la même invite sans microphone lorsque ce choix est disponible.
Si le profil du navigateur n'est pas connecté, que Meet attend l'admission de l'hôte,
que Chrome a besoin d'une autorisation micro/caméra pour une connexion en temps réel, ou que Meet est bloqué
sur une invite que l'automatisation n'a pas pu résoudre, le résultat de la connexion/test de parole signale
`manualActionRequired: true` avec `manualActionReason` et
`manualActionMessage`. Les agents doivent cesser de réessayer la connexion, signaler ce message
exact ainsi que le `browserUrl`/`browserTitle` actuel, et ne réessayer qu'après
l'action manuelle du navigateur terminée.

Si `chromeNode.node` est omis, OpenClaw sélectionne automatiquement uniquement lorsqu'un seul
nœud connecté annonce `googlemeet.chrome` et le contrôle du navigateur. Si
plusieurs nœuds capables sont connectés, définissez `chromeNode.node` sur l'identifiant du nœud,
le nom d'affichage ou l'IP distante.

Vérifications courantes des échecs :

- `Configured Google Meet node ... is not usable: offline` : le nœud épinglé est
  connu du Gateway mais indisponible. Les agents doivent traiter ce nœud comme
  un état de diagnostic, et non comme un hôte Chrome utilisable, et signaler le bloqueur de
  configuration au lieu de revenir à un autre transport, sauf si l'utilisateur l'a demandé.
- `No connected Google Meet-capable node` : démarrez `openclaw node run` dans la machine virtuelle,
  approuvez le jumelage et assurez-vous que `openclaw plugins enable google-meet` et
  `openclaw plugins enable browser` ont été exécutés dans la machine virtuelle. Confirmez également que
  l'hôte du Gateway autorise les deux commandes de nœud avec
  `gateway.nodes.allowCommands: ["googlemeet.chrome", "browser.proxy"]`.
- `BlackHole 2ch audio device not found` : installez `blackhole-2ch` sur l'hôte
  vérifié et redémarrez avant d'utiliser l'audio Chrome local.
- `BlackHole 2ch audio device not found on the node` : installez `blackhole-2ch`
  dans la machine virtuelle et redémarrez celle-ci.
- Chrome s'ouvre mais ne peut pas rejoindre : connectez-vous au profil de navigateur dans la machine virtuelle, ou
  gardez `chrome.guestName` défini pour la rejoindre en tant qu'invité. La jonction automatique en tant qu'invité utilise l'automatisation de navigateur OpenClaw
  via le proxy de navigateur du nœud ; assurez-vous que la configuration du navigateur du nœud
  pointe vers le profil souhaité, par exemple
  `browser.defaultProfile: "user"` ou un profil de session existant nommé.
- Onglets Meet en double : laissez `chrome.reuseExistingTab: true` activé. OpenClaw
  active un onglet existant pour la même URL Meet avant d'en ouvrir un nouveau, et
  la création de réunion par navigateur réutilise un `https://meet.google.com/new` en cours
  ou un onglet d'invite de compte Google avant d'en ouvrir un autre.
- Pas d'audio : dans Meet, acheminez le micro/haut-parleur via le chemin du périphérique audio virtuel
  utilisé par OpenClaw ; utilisez des périphériques virtuels séparés ou un routage de type Loopback
  pour un audio duplex propre.

## Notes d'installation

La discussion vocale par défaut de Chrome utilise deux outils externes :

- `sox` : utilitaire audio en ligne de commande. Le plugin utilise des commandes explicites de périphérique CoreAudio
  pour le pont audio PCM16 par défaut à 24 kHz.
- `blackhole-2ch` : pilote audio virtuel macOS. Il crée le périphérique audio `BlackHole 2ch`
  via lequel Chrome/Meet peut acheminer.

OpenClaw n'inclut ni ne redistribue l'un ou l'autre de ces packages. La documentation demande aux utilisateurs
de les installer en tant que dépendances de l'hôte via Homebrew. SoX est sous licence
OpenClaw`LGPL-2.0-only AND GPL-2.0-only`OpenClaw ; BlackHole est sous GPL-3.0. Si vous créez un
installateur ou un appliance qui inclut BlackHole avec OpenClaw, veuillez consulter les conditions de licence
amont de BlackHole ou obtenir une licence distincte de Existential Audio.

## Transports

### Chrome

Le transport Chrome ouvre l'URL Meet via le contrôle du navigateur OpenClaw et rejoint
la réunion en tant que profil de navigateur OpenClaw connecté. Sur macOS, le plugin vérifie
OpenClawOpenClawmacOS`BlackHole 2ch` avant le lancement. Si configuré, il exécute également une commande de santé du pont audio
et une commande de démarrage avant d'ouvrir Chrome. Utilisez `chrome`Gateway lorsque
Chrome/audio fonctionnent sur l'hôte Gateway ; utilisez `chrome-node`macOS lorsque Chrome/audio fonctionnent
sur un nœud jumelé tel qu'une VM macOS Parallels. Pour un Chrome local, choisissez le
profil avec `browser.defaultProfile` ; `chrome.browserProfile` est transmis aux
hôtes `chrome-node`.

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome
openclaw googlemeet join https://meet.google.com/abc-defg-hij --transport chrome-node
```

Acheminez le son du microphone et des haut-parleurs Chrome via le pont audio
local OpenClaw. Si OpenClaw`BlackHole 2ch` n'est pas installé, la jointure échoue avec une erreur de configuration
au lieu de rejoindre silencieusement sans chemin audio.

### Twilio

Le transport Twilio est un plan de numérotation strict délégué au plugin Voice Call. Il
ne recherche pas les numéros de téléphone sur les pages Meet.

Utilisez ceci lorsque la participation via Chrome n'est pas disponible ou si vous souhaitez une solution de repli
par appel téléphonique. Google Meet doit exposer un numéro d'appel téléphonique et un code PIN pour la
réunion ; OpenClaw ne les découvre pas depuis la page Meet.

Activez le plugin Voice Call sur l'hôte Gateway, et non sur le nœud Chrome :

```json5
{
  plugins: {
    allow: ["google-meet", "voice-call", "google"],
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          defaultTransport: "chrome-node",
          // or set "twilio" if Twilio should be the default
        },
      },
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          inboundPolicy: "allowlist",
          realtime: {
            enabled: true,
            provider: "google",
            instructions: "Join this Google Meet as an OpenClaw agent. Be brief.",
            toolPolicy: "safe-read-only",
            providers: {
              google: {
                silenceDurationMs: 500,
                startSensitivity: "high",
              },
            },
          },
        },
      },
      google: {
        enabled: true,
      },
    },
  },
}
```

Fournissez les identifiants Twilio via les variables d'environnement ou la configuration. Les variables d'environnement gardent
les secrets hors de `openclaw.json` :

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
export GEMINI_API_KEY=...
```

Utilisez plutôt `realtime.provider: "openai"`OpenAI avec le plugin fournisseur OpenAI et
`OPENAI_API_KEY` si c'est votre fournisseur vocal en temps réel.

Redémarrez ou rechargez le Gateway après avoir activé Gateway`voice-call`Gateway ; les modifications de la configuration du plugin
n'apparaissent pas dans un processus Gateway déjà en cours d'exécution tant qu'il n'est pas rechargé.

Ensuite, vérifiez :

```bash
openclaw config validate
openclaw plugins list | grep -E 'google-meet|voice-call'
openclaw googlemeet setup
```

Lorsque la délégation Twilio est connectée, `googlemeet setup` inclut des vérifications réussies
`twilio-voice-call-plugin`, `twilio-voice-call-credentials` et
`twilio-voice-call-webhook`.

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

Utilisez `--dtmf-sequence` lorsque la réunion nécessite une séquence personnalisée :

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

## OAuth et préflight

OAuth est facultatif pour créer un lien Meet car OAuth`googlemeet create`OAuthAPIAPI peut revenir
à l'automatisation du navigateur. Configurez OAuth lorsque vous souhaitez une création officielle via l'API,
la résolution d'espace ou les vérifications préliminaires de l'API Meet Media.

L'accès à l'API Google Meet utilise l'OAuth utilisateur : créez un client OAuth Google Cloud,
demandez les étendues requises, autorisez un compte Google, puis stockez le
token de rafraîchissement résultant dans la configuration du plugin Google Meet ou fournissez les
variables d'environnement APIOAuthOAuth`OPENCLAW_GOOGLE_MEET_*`.

OAuth ne remplace pas le chemin de jointure Chrome. Les transports Chrome et Chrome-node
se joignent toujours via un profil Chrome connecté, BlackHole/SoX et un nœud
connecté lorsque vous utilisez la participation par navigateur. OAuth est uniquement pour le chemin de l'
API officielle Google Meet : créer des espaces de réunion, résoudre des espaces et exécuter les
vérifications préliminaires de l'API Meet Media.

### Créer des identifiants Google

Dans Google Cloud Console :

1. Créez ou sélectionnez un projet Google Cloud.
2. Activez l'**API Google Meet REST** pour ce projet.
3. Configurez l'écran de consentement OAuth.
   - **Interne** est le plus simple pour une organisation Google Workspace.
   - **Externe** fonctionne pour les configurations personnelles/tests ; tant que l'application est en phase de test,
     ajoutez chaque compte Google qui autorisera l'application en tant qu'utilisateur test.
4. Ajoutez les étendues demandées par OpenClaw :
   - `https://www.googleapis.com/auth/meetings.space.created`
   - `https://www.googleapis.com/auth/meetings.space.readonly`
   - `https://www.googleapis.com/auth/meetings.space.settings`
   - `https://www.googleapis.com/auth/meetings.conference.media.readonly`
5. Créez un ID client OAuth.
   - Type d'application : **Application web**.
   - URI de redirection autorisée :

     ```text
     http://localhost:8085/oauth2callback
     ```

6. Copiez l'ID client et le secret client.

`meetings.space.created` est requis par Google Meet `spaces.create`.
`meetings.space.readonly`OpenClaw permet à OpenClaw de résoudre les URL/codes Meet en espaces.
`meetings.space.settings`OpenClaw permet à OpenClaw de transmettre les paramètres `SpaceConfig` tels que
`accessType`API lors de la création de salle via l'API.
`meetings.conference.media.readonly`APIAPIOAuth est destiné au prévol et au travail média de l'API Meet Media ; Google peut exiger une inscription au Developer Preview pour l'utilisation réelle de l'API Media.
Si vous avez uniquement besoin de jointures Chrome basées sur le navigateur, ignorez totalement OAuth.

### Générer le jeton d'actualisation

Configurez `oauth.clientId` et facultativement `oauth.clientSecret`, ou passez-les en tant que
variables d'environnement, puis exécutez :

```bash
openclaw googlemeet auth login --json
```

La commande imprime un bloc de configuration `oauth` avec un jeton d'actualisation. Elle utilise PKCE,
un rappel localhost sur `http://localhost:8085/oauth2callback` et un flux de
copier/coller manuel avec `--manual`.

Exemples :

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json
```

Utilisez le mode manuel lorsque le navigateur ne peut pas atteindre le rappel local :

```bash
OPENCLAW_GOOGLE_MEET_CLIENT_ID="your-client-id" \
OPENCLAW_GOOGLE_MEET_CLIENT_SECRET="your-client-secret" \
openclaw googlemeet auth login --json --manual
```

La sortie JSON comprend :

```json
{
  "oauth": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "refreshToken": "refresh-token",
    "accessToken": "access-token",
    "expiresAt": 1770000000000
  },
  "scope": "..."
}
```

Stockez l'objet `oauth` sous la configuration du plugin Google Meet :

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {
          oauth: {
            clientId: "your-client-id",
            clientSecret: "your-client-secret",
            refreshToken: "refresh-token",
          },
        },
      },
    },
  },
}
```

Préférez les variables d'environnement lorsque vous ne souhaitez pas que le jeton d'actualisation soit dans la configuration.
Si les valeurs de configuration et d'environnement sont présentes, le plugin résout d'abord la configuration
puis le repli sur l'environnement.

Le consentement OAuth inclut la création d'espace Meet, l'accès en lecture aux espaces Meet et l'accès en lecture aux médias de conférence Meet. Si vous vous êtes authentifié avant que la prise en charge de la création de réunions n'existe, réexécutez OAuth`openclaw googlemeet auth login --json` afin que le jeton
d'actualisation dispose de la portée `meetings.space.created`.

### Vérifier OAuth avec doctor

Exécutez le doctor OAuth lorsque vous souhaitez une vérification de santé rapide et non secrète :

```bash
openclaw googlemeet doctor --oauth --json
```

Cela ne charge pas le runtime Chrome ni ne nécessite un nœud Chrome connecté. Il vérifie que la configuration OAuth existe et que le jeton d'actualisation peut générer un jeton d'accès. Le rapport JSON n'inclut que des champs de statut tels que `ok`, `configured`, `tokenSource`, `expiresAt`, et des messages de vérification ; il n'imprime pas le jeton d'accès, le jeton d'actualisation ni le secret client.

Résultats courants :

| Vérification         | Signification                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `oauth-config`       | `oauth.clientId` plus `oauth.refreshToken`, ou un jeton d'accès mis en cache, est présent.                        |
| `oauth-token`        | Le jeton d'accès mis en cache est toujours valide, ou le jeton d'actualisation a généré un nouveau jeton d'accès. |
| `meet-spaces-get`    | La vérification optionnelle `--meeting` a résolu un espace Meet existant.                                         |
| `meet-spaces-create` | La vérification optionnelle `--create-space` a créé un nouvel espace Meet.                                        |

Pour prouver l'activation de API Google Meet et la portée `spaces.create`, exécutez la vérification de création avec effets secondaires :

```bash
openclaw googlemeet doctor --oauth --create-space --json
openclaw googlemeet create --no-join --json
```

`--create-space` crée une URL Meet jetable. Utilisez-la lorsque vous devez confirmer que le projet Google Cloud a activé API Meet et que le compte autorisé dispose de la portée `meetings.space.created`.

Pour prouver l'accès en lecture pour un espace de réunion existant :

```bash
openclaw googlemeet doctor --oauth --meeting https://meet.google.com/abc-defg-hij --json
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

`doctor --oauth --meeting` et `resolve-space` prouvent l'accès en lecture à un espace existant auquel le compte Google autorisé peut accéder. Un `403` de ces vérifications signifie généralement que API REST Google Meet est désactivé, que le jeton d'actualisation consenti manque de la portée requise, ou que le compte Google ne peut pas accéder à cet espace Meet. Une erreur de jeton d'actualisation signifie relancer le bloc `openclaw googlemeet auth login
--` and store the new `oauth`.

Aucune information d'identification OAuth n'est nécessaire pour le repli du navigateur. Dans ce mode, l'authentification Google provient du profil Chrome connecté sur le nœud sélectionné, et non de la configuration OpenClaw.

Ces variables d'environnement sont acceptées comme solutions de repli :

- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` ou `GOOGLE_MEET_CLIENT_ID`
- `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET` ou `GOOGLE_MEET_CLIENT_SECRET`
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` ou `GOOGLE_MEET_REFRESH_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` ou `GOOGLE_MEET_ACCESS_TOKEN`
- `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` ou
  `GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT`
- `OPENCLAW_GOOGLE_MEET_DEFAULT_MEETING` ou `GOOGLE_MEET_DEFAULT_MEETING`
- `OPENCLAW_GOOGLE_MEET_PREVIEW_ACK` ou `GOOGLE_MEET_PREVIEW_ACK`

Résolvez une URL Meet, un code ou `spaces/{id}` via `spaces.get` :

```bash
openclaw googlemeet resolve-space --meeting https://meet.google.com/abc-defg-hij
```

Exécutez les vérifications préliminaires avant le travail multimédia :

```bash
openclaw googlemeet preflight --meeting https://meet.google.com/abc-defg-hij
```

Listez les artefacts de réunion et la présence une fois que Meet a créé les enregistrements de conférence :

```bash
openclaw googlemeet artifacts --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet attendance --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet export --meeting https://meet.google.com/abc-defg-hij --output ./meet-export
```

Avec `--meeting`, `artifacts` et `attendance`, l'enregistrement de conférence le plus récent est
utilisé par défaut. Passez `--all-conference-records` lorsque vous souhaitez chaque enregistrement conservé
pour cette réunion.

La recherche dans l'agenda peut résoudre l'URL de la réunion à partir de Google Agenda avant de lire
les artefacts Meet :

```bash
openclaw googlemeet latest --today
openclaw googlemeet calendar-events --today --json
openclaw googlemeet artifacts --event "Weekly sync"
openclaw googlemeet attendance --today --format csv --output attendance.csv
```

`--today` recherche dans l'agenda `primary` d'aujourd'hui un événement d'agenda avec un
lien Google Meet. Utilisez `--event <query>` pour rechercher du texte d'événement correspondant, et
`--calendar <id>` pour un agenda non principal. La recherche dans l'agenda nécessite une connexion OAuth fraîche
incluant la portée readonly des événements d'agenda.
`calendar-events` prévisualise les événements Meet correspondants et marque l'événement que
`latest`, `artifacts`, `attendance` ou `export` choisira.

Si vous connaissez déjà l'identifiant de l'enregistrement de conférence, adressez-vous-y directement :

```bash
openclaw googlemeet latest --meeting https://meet.google.com/abc-defg-hij
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 --json
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 --json
```

Terminez une conférence active pour un espace créé par API lorsque vous souhaitez fermer la
salle après l'appel :

```bash
openclaw googlemeet end-active-conference https://meet.google.com/abc-defg-hij
```

Cela appelle Google Meet `spaces.endActiveConference`OAuth et nécessite OAuth avec l'étendue
`meetings.space.created`OpenClaw pour un espace que le compte autorisé peut gérer.
OpenClaw accepte une URL Meet, un code de réunion ou une entrée `spaces/{id}`API et la résout
en ressource d'espace de l'API avant de terminer la conférence active.
C'est distinct de `googlemeet leave` : `leave`OpenClaw arrête la participation locale/session
d'OpenClaw, tandis que `end-active-conference` demande à Google Meet de terminer la
conférence active pour l'espace.

Rédiger un rapport lisible :

```bash
openclaw googlemeet artifacts --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-artifacts.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format markdown --output meet-attendance.md
openclaw googlemeet attendance --conference-record conferenceRecords/abc123 \
  --format csv --output meet-attendance.csv
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --zip --output meet-export
openclaw googlemeet export --conference-record conferenceRecords/abc123 \
  --include-doc-bodies --dry-run
```

`artifacts` renvoie les métadonnées de l'enregistrement de conférence ainsi que les métadonnées des ressources de participant, d'enregistrement,
de transcription, d'entrée de transcription structurée et de note intelligente lorsque
Google les expose pour la réunion. Utilisez `--no-transcript-entries` pour ignorer
la recherche d'entrées pour les grandes réunions. `attendance` développe les participants en
lignes de session de participant avec les heures de première/dernière vue, la durée totale de la session,
les indicateurs de départ tardif/précoce, et les ressources de participants en double fusionnées par l'utilisateur
connecté ou le nom d'affichage. Passez `--no-merge-duplicates` pour garder les ressources de participants brutes séparées, `--late-after-minutes` pour régler la détection de retard, et
`--early-before-minutes` pour régler la détection de départ précoce.

`export` écrit un dossier contenant `summary.md`, `attendance.csv`,
`transcript.md`, `artifacts.json`, `attendance.json` et `manifest.json`.
`manifest.json` enregistre l'entrée choisie, les options d'exportation, les enregistrements de conférence,
les fichiers de sortie, les comptages, la source du jeton, l'événement du calendrier lorsqu'il a été utilisé et tous les
avertissements de récupération partielle. Passez `--zip` pour également écrire une archive portable à côté
du dossier. Passez `--include-doc-bodies` pour exporter la transcription liée et
le texte des notes intelligentes Google Docs via Google Drive `files.export` ; cela nécessite une
nouvelle connexion OAuth incluant la portée Drive Meet en lecture seule. Sans
`--include-doc-bodies`, les exportations incluent uniquement les métadonnées Meet et les entrées de transcription
structurées. Si Google renvoie une échec partiel d'artefact, tel qu'une erreur de
liste de notes intelligentes, d'entrée de transcription, ou de corps de document Drive, le résumé et
le manifeste conservent l'avertissement au lieu de faire échouer toute l'exportation.
Utilisez `--dry-run` pour récupérer les mêmes données d'artefact/présence et imprimer le
manifeste JSON sans créer le dossier ni le ZIP. C'est utile avant d'écrire
une grande exportation ou lorsqu'un agent n'a besoin que des comptages, des enregistrements sélectionnés et des
avertissements.

Les agents peuvent également créer le même ensemble via l'outil `google_meet` :

```json
{
  "action": "export",
  "conferenceRecord": "conferenceRecords/abc123",
  "includeDocumentBodies": true,
  "outputDir": "meet-export",
  "zip": true
}
```

Définissez `"dryRun": true` pour renvoyer uniquement le manifeste d'exportation et ignorer les écritures de fichiers.

Ils peuvent également créer une salle basée sur une API avec une stratégie d'accès explicite :

```json
{
  "action": "create",
  "transport": "chrome-node",
  "mode": "agent",
  "accessType": "OPEN"
}
```

Et ils peuvent terminer la conférence active pour une salle connue :

```json
{
  "action": "end_active_conference",
  "meeting": "https://meet.google.com/abc-defg-hij"
}
```

Pour une validation d'écoute prioritaire, les agents doivent utiliser `test_listen` avant de déclarer que
la réunion est utile :

```json
{
  "action": "test_listen",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "timeoutMs": 30000
}
```

Exécutez le test de fumée en direct gardé contre une réunion réelle conservée :

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_GOOGLE_MEET_LIVE_MEETING=https://meet.google.com/abc-defg-hij \
pnpm test:live -- extensions/google-meet/google-meet.live.test.ts
```

Exécutez la sonde de navigateur en direct d'écoute prioritaire contre une réunion où quelqu'un
parlera avec les sous-titres Meet disponibles :

```bash
openclaw googlemeet setup --transport chrome-node --mode transcribe
openclaw googlemeet test-listen https://meet.google.com/abc-defg-hij --transport chrome-node --timeout-ms 30000
```

Environnement de test de fumée en direct :

- `OPENCLAW_LIVE_TEST=1` active les tests en direct gardés.
- `OPENCLAW_GOOGLE_MEET_LIVE_MEETING` pointe vers une URL Meet conservée, un code ou
  `spaces/{id}`.
- `OPENCLAW_GOOGLE_MEET_CLIENT_ID` ou `GOOGLE_MEET_CLIENT_ID`OAuth fournit l'identifiant client OAuth.
- `OPENCLAW_GOOGLE_MEET_REFRESH_TOKEN` ou `GOOGLE_MEET_REFRESH_TOKEN` fournit
  le jeton d'actualisation.
- Optionnel : `OPENCLAW_GOOGLE_MEET_CLIENT_SECRET`,
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN` et
  `OPENCLAW_GOOGLE_MEET_ACCESS_TOKEN_EXPIRES_AT` utilisent les mêmes noms de repli
  sans le préfixe `OPENCLAW_`.

Le test de fumée en direct de base pour l'artefact/la présence nécessite
`https://www.googleapis.com/auth/meetings.space.readonly` et
`https://www.googleapis.com/auth/meetings.conference.media.readonly`. La recherche
dans le calendrier nécessite `https://www.googleapis.com/auth/calendar.events.readonly`. L'exportation
du corps du document Drive nécessite
`https://www.googleapis.com/auth/drive.meet.readonly`.

Créer un nouvel espace Meet :

```bash
openclaw googlemeet create
```

La commande affiche le nouveau `meeting uri`, la source et la session de jointure. Avec les identifiants OAuthAPI, elle utilise l'API officielle Google Meet. Sans identifiants OAuth, elle utilise le profil de navigateur connecté du nœud Chrome épinglé en solution de repli. Les agents peuvent utiliser l'outil `google_meet` avec `action: "create"` pour créer et rejoindre en une seule étape. Pour une création d'URL uniquement, passez `"join": false`.

Exemple de sortie JSON de la solution de repli du navigateur :

```json
{
  "source": "browser",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

Si la solution de repli du navigateur rencontre la page de connexion Google ou un bloqueur d'autorisation Meet avant de pouvoir créer l'URL, la méthode Gateway renvoie une réponse échouée et l'outil `google_meet` renvoie des détails structurés au lieu d'une simple chaîne :

```json
{
  "source": "browser",
  "error": "google-login-required: Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "manualActionRequired": true,
  "manualActionReason": "google-login-required",
  "manualActionMessage": "Sign in to Google in the OpenClaw browser profile, then retry meeting creation.",
  "browser": {
    "nodeId": "ba0f4e4bc...",
    "targetId": "tab-1",
    "browserUrl": "https://accounts.google.com/signin",
    "browserTitle": "Sign in - Google Accounts"
  }
}
```

Lorsqu'un agent voit `manualActionRequired: true`, il doit signaler
le `manualActionMessage` ainsi que le contexte du nœud/onglet du navigateur et cesser d'ouvrir de nouveaux
onglets Meet jusqu'à ce que l'opérateur termine l'étape du navigateur.

Exemple de sortie JSON de la création via l'API :

```json
{
  "source": "api",
  "meetingUri": "https://meet.google.com/abc-defg-hij",
  "joined": true,
  "space": {
    "name": "spaces/abc-defg-hij",
    "meetingCode": "abc-defg-hij",
    "meetingUri": "https://meet.google.com/abc-defg-hij"
  },
  "join": {
    "session": {
      "id": "meet_...",
      "url": "https://meet.google.com/abc-defg-hij"
    }
  }
}
```

La création d'un Meet rejoint par défaut. Le transport Chrome ou Chrome-node a toujours
besoin d'un profil Google Chrome connecté pour rejoindre via le navigateur. Si le
profil est déconnecté, OpenClaw signale `manualActionRequired: true` ou une
erreur de repli du navigateur et demande à l'opérateur de terminer la connexion Google avant
de réessayer.

Définissez `preview.enrollmentAcknowledged: true` uniquement après avoir confirmé que votre projet Cloud, le principal OAuth et les participants à la réunion sont inscrits au programme Google Workspace Developer Preview pour les API multimédias Meet.

## Config

Le chemin commun de l'agent Chrome nécessite uniquement que le plugin soit activé, ainsi que BlackHole, SoX, une clé de fournisseur de transcription en temps réel et un fournisseur TTS OpenClaw configuré. OpenAI est le fournisseur de transcription par défaut ; définissez `realtime.voiceProvider` sur `"google"` et `realtime.model` pour utiliser Google Gemini Live pour le mode `bidi` sans modifier le fournisseur de transcription du mode agent par défaut :

```bash
brew install blackhole-2ch sox
export OPENAI_API_KEY=sk-...
# or
export GEMINI_API_KEY=...
```

Définissez la configuration du plugin sous `plugins.entries.google-meet.config` :

```json5
{
  plugins: {
    entries: {
      "google-meet": {
        enabled: true,
        config: {},
      },
    },
  },
}
```

Valeurs par défaut :

- `defaultTransport: "chrome"`
- `defaultMode: "agent"` (`"realtime"` n'est accepté que comme un alias de compatibilité hérité pour `"agent"` ; les nouveaux appels d'outil doivent indiquer `"agent"`)
- `chromeNode.node` : id/nom/IP de nœud facultatif pour `chrome-node`
- `chrome.audioBackend: "blackhole-2ch"`
- `chrome.guestName: "OpenClaw Agent"` : nom utilisé sur l'écran d'invité Meet déconnecté
- `chrome.autoJoin: true` : remplissage du nom d'invité de meilleur effort et clic sur Rejoindre maintenant via l'automatisation du navigateur OpenClaw sur `chrome-node`
- `chrome.reuseExistingTab: true` : activer un onglet Meet existant au lieu d'en ouvrir des doublons
- `chrome.waitForInCallMs: 20000` : attendre que l'onglet Meet signale qu'il est en appel avant que l'introduction talk-back ne soit déclenchée
- `chrome.audioFormat: "pcm16-24khz"` : format audio de paire de commandes. Utilisez `"g711-ulaw-8khz"` uniquement pour les paires de commandes héritées/personnalisées qui émettent encore de l'audio téléphonique.
- `chrome.audioBufferBytes: 4096` : tampon de traitement SoX pour les commandes audio de paire de commandes Chrome générées. Cela représente la moitié du tampon par défaut de 8192 octets de SoX, réduisant la latence du tuyau par défaut tout en laissant de la place pour l'augmenter sur les hôtes occupés. Les valeurs inférieures au minimum de SoX sont limitées à 17 octets.
- `chrome.audioInputCommand` : commande SoX lisant depuis CoreAudio `BlackHole 2ch`
  et écrivant de l'audio dans `chrome.audioFormat`
- `chrome.audioOutputCommand` : commande SoX lisant l'audio dans `chrome.audioFormat`
  et écrivant vers CoreAudio `BlackHole 2ch`
- `chrome.bargeInInputCommand` : commande de microphone local facultative qui écrit
  du PCM mono 16 bits signé little-endian pour la détection d'interruption humaine
  pendant la lecture de l'assistant. Cela s'applique actuellement au pont de paire de commandes `chrome` hébergé par Gateway.
- `chrome.bargeInRmsThreshold: 650` : niveau RMS qui compte comme une interruption
  humaine sur `chrome.bargeInInputCommand`
- `chrome.bargeInPeakThreshold: 2500` : niveau de crête qui compte comme une interruption
  humaine sur `chrome.bargeInInputCommand`
- `chrome.bargeInCooldownMs: 900` : délai minimum entre les effacements répétés d'interruption humaine
- `mode: "agent"` : mode de retour par défaut. La parole du participant est transcrite par le fournisseur de transcription en temps réel configuré, envoyée à l'agent OpenClaw configuré dans une session de sous-agent par réunion, et relue via le runtime TTS OpenClaw normal.
- `mode: "bidi"` : mode de repli direct en temps réel bidirectionnel. Le fournisseur de voix en temps réel répond directement à la parole du participant et peut appeler `openclaw_agent_consult` pour des réponses plus profondes/soutenues par des outils.
- `mode: "transcribe"` : mode observation uniquement sans le pont de retour vocal.
- `realtime.provider: "openai"` : repli de compatibilité utilisé lorsque les champs de fournisseur délimités ci-dessous ne sont pas définis.
- `realtime.transcriptionProvider: "openai"` : identifiant de fournisseur utilisé par le mode `agent`
  pour la transcription en temps réel.
- `realtime.voiceProvider` : identifiant de fournisseur utilisé par le mode `bidi` pour la voix directe en temps réel. Définissez ceci sur `"google"` pour utiliser Gemini Live tout en gardant la transcription du mode agent sur OpenAI.
- `realtime.toolPolicy: "safe-read-only"`
- `realtime.instructions` : réponses vocales brèves, avec
  `openclaw_agent_consult` pour des réponses plus approfondies
- `realtime.introMessage` : vérification orale brève de la disponibilité lorsque le pont temps réel se connecte ; définissez-le sur `""` pour rejoindre en silence
- `realtime.agentId` : identifiant facultatif de l'agent OpenClaw pour `openclaw_agent_consult` ; par défaut `main`

Remplacements facultatifs :

```json5
{
  defaults: {
    meeting: "https://meet.google.com/abc-defg-hij",
  },
  browser: {
    defaultProfile: "openclaw",
  },
  chrome: {
    guestName: "OpenClaw Agent",
    waitForInCallMs: 30000,
    bargeInInputCommand: ["sox", "-q", "-t", "coreaudio", "External Microphone", "-r", "24000", "-c", "1", "-b", "16", "-e", "signed-integer", "-t", "raw", "-"],
  },
  chromeNode: {
    node: "parallels-macos",
  },
  defaultMode: "agent",
  realtime: {
    provider: "openai",
    transcriptionProvider: "openai",
    voiceProvider: "google",
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    agentId: "jay",
    toolPolicy: "owner",
    introMessage: "Say exactly: I'm here.",
    providers: {
      google: {
        speakerVoice: "Kore",
      },
    },
  },
}
```

ElevenLabs pour l'écoute et la parole en mode agent :

```json5
{
  messages: {
    tts: {
      provider: "elevenlabs",
      providers: {
        elevenlabs: {
          modelId: "eleven_v3",
          speakerVoiceId: "pMsXgVXv3BLzUgSXRplE",
        },
      },
    },
  },
  plugins: {
    entries: {
      "google-meet": {
        config: {
          realtime: {
            transcriptionProvider: "elevenlabs",
            providers: {
              elevenlabs: {
                modelId: "scribe_v2_realtime",
                audioFormat: "ulaw_8000",
                sampleRate: 8000,
                commitStrategy: "vad",
              },
            },
          },
        },
      },
    },
  },
}
```

La voix Meet persistante provient de
`messages.tts.providers.elevenlabs.speakerVoiceId`. Les réponses de l'agent peuvent également utiliser
des directives `[[tts:speakerVoiceId=... model=eleven_v3]]` par réponse lorsque les
remplacements du modèle TTS sont activés, mais la configuration est la valeur par défaut déterministe pour les réunions.
Lors de la jonction, les journaux doivent afficher `transcriptionProvider=elevenlabs` et chaque
réponse parlée doit journaliser `provider=elevenlabs model=eleven_v3 speakerVoiceId=<voiceId>`.

Configuration Twilio uniquement :

```json5
{
  defaultTransport: "twilio",
  twilio: {
    defaultDialInNumber: "+15551234567",
    defaultPin: "123456",
  },
  voiceCall: {
    gatewayUrl: "ws://127.0.0.1:18789",
  },
}
```

`voiceCall.enabled` par défaut à `true` ; avec le transport Twilio, il délègue l'appel PSTN réel, le DTMF et le message d'introduction au plugin Voice Call. Voice Call lit la séquence DTMF avant d'ouvrir le flux média temps réel, puis utilise le texte d'introduction enregistré comme message d'accueil initial temps réel. Si `voice-call` n'est pas activé, Google Meet peut toujours valider et enregistrer le plan de numérotation, mais il ne peut pas passer l'appel Twilio.

## Outil

Les agents peuvent utiliser l'outil `google_meet` :

```json
{
  "action": "join",
  "url": "https://meet.google.com/abc-defg-hij",
  "transport": "chrome-node",
  "mode": "agent"
}
```

Utilisez `transport: "chrome"` lorsque Chrome s'exécute sur l'hôte du Gateway. Utilisez
`transport: "chrome-node"` lorsque Chrome s'exécute sur un nœud appairé tel qu'une machine
virtuelle Parallels. Dans les deux cas, les fournisseurs de modèles et `openclaw_agent_consult` s'exécutent sur
l'hôte du Gateway, donc les identifiants du modèle y restent. Avec le `mode: "agent"` par
défaut, le fournisseur de transcription en temps réel gère l'écoute, l'agent OpenClaw
configuré produit la réponse, et le TTS OpenClaw standard la prononce dans Meet. Utilisez
`mode: "bidi"` lorsque vous voulez que le modèle vocal en temps réel réponde directement.
Le `mode: "realtime"` brut reste accepté comme un alias de compatibilité hérité pour
`mode: "agent"`, mais il n'est plus annoncé dans le schéma de l'outil de l'agent.
Les journaux du mode agent incluent le fournisseur/modèle de transcription résolu au démarrage du pont
et le fournisseur TTS, le modèle, la voix, le format de sortie et le taux d'échantillonnage après
chaque réponse synthétisée.

Utilisez `action: "status"` pour lister les sessions actives ou inspecter un ID de session. Utilisez
`action: "speak"` avec `sessionId` et `message` pour faire parler l'agent en
temps réel immédiatement. Utilisez `action: "test_speech"` pour créer ou réutiliser la session,
déclencher une phrase connue et renvoyer l'état de santé `inCall` lorsque l'hôte Chrome peut
le rapporter. `test_speech` force toujours `mode: "agent"` et échoue s'il est demandé de
courir en `mode: "transcribe"` car les sessions en observation seule ne peuvent pas intentionnellement
émettre de discours. Son résultat `speechOutputVerified` est basé sur l'augmentation des octets de sortie audio
en temps réel pendant cet appel de test, donc une session réutilisée avec un ancien audio
ne compte pas comme une vérification de parole fraîche réussie. Utilisez `action: "leave"` pour marquer
une session comme terminée.

`status` inclut l'état de santé de Chrome lorsque disponible :

- `inCall` : Chrome semble être à l'intérieur de l'appel Meet
- `micMuted` : état du microphone Meet de meilleur effort
- `manualActionRequired` / `manualActionReason` / `manualActionMessage` : le
  profil du navigateur nécessite une connexion manuelle, l'admission de l'hôte Meet, des autorisations ou
  une réparation du contrôle du navigateur pour que la voix fonctionne.
- `speechReady` / `speechBlockedReason` / `speechBlockedMessage` : indique
  si la voix Chrome gérée est autorisée actuellement. `speechReady: false`OpenClaw signifie que OpenClaw n'a
  pas envoyé la phrase d'introduction/test dans le pont audio.
- `providerConnected` / `realtimeReady` : état du pont vocal en temps réel
- `lastInputAt` / `lastOutputAt` : dernier audio vu depuis ou envoyé vers le pont
- `audioOutputRouted` / `audioOutputDeviceLabel` : indique si la sortie média
  de l'onglet Meet était acheminée activement vers le périphérique BlackHole utilisé par le pont
- `lastSuppressedInputAt` / `suppressedInputBytes` : entrée de bouclage ignorée tant que
  la lecture de l'assistant est active

```json
{
  "action": "speak",
  "sessionId": "meet_...",
  "message": "Say exactly: I'm here and listening."
}
```

## Modes Agent et bidi

Le mode `agent`OpenClawOpenClaw de Chrome est optimisé pour le comportement "mon agent est dans la réunion". Le
fournisseur de transcription en temps réel entend l'audio de la réunion, les transcriptions finales des
participants sont acheminées via l'agent OpenClaw configuré, et la réponse est
prononcée via le runtime TTS OpenClaw normal. Définissez `mode: "bidi"` lorsque vous voulez
que le modèle vocal en temps réel réponde directement.
Les fragments de transcription finaux proches sont regroupés avant la consultation afin qu'un tour de parole
ne produise pas plusieurs réponses partielles périmées. L'entrée en temps réel est également
supprimée pendant que l'audio de l'assistant en file d'attente est toujours en cours de lecture,
et les échos de transcription récents de type assistant sont ignorés avant la consultation de l'agent
afin que le bouclage BlackHole ne fasse pas répondre l'agent à sa propre parole.

| Mode    | Qui décide de la réponse      | Chemin de sortie vocale                          | Utiliser quand                                                                |
| ------- | ----------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| `agent` | L'agent OpenClaw configuré    | Runtime TTS OpenClaw normal                      | Vous voulez un comportement "mon agent est dans la réunion"                   |
| `bidi`  | Le modèle vocal en temps réel | Réponse audio du fournisseur vocal en temps réel | Vous voulez la boucle vocale conversationnelle avec la latence la plus faible |

En mode `bidi`OpenClaw, lorsque le modèle en temps réel a besoin d'un raisonnement plus approfondi, d'informations actuelles ou des outils OpenClaw normaux, il peut appeler `openclaw_agent_consult`.

L'outil de consultation exécute l'agent OpenClaw standard en arrière-plan avec le contexte récent de la transcription de la réunion et renvoie une réponse orale concise. En mode OpenClaw`agent`OpenClaw, OpenClaw envoie cette réponse directement au runtime TTS ; en mode `bidi`, le modèle vocal en temps réel peut prononcer le résultat de la consultation dans la réunion. Il utilise le même mécanisme de consultation partagé que Voice Call.

Par défaut, les consultations s'exécutent sur l'agent `main`. Définissez `realtime.agentId`OpenClaw lorsqu'une voie Meet doit consulter un espace de travail d'agent OpenClaw dédié, les paramètres par défaut du modèle, la stratégie d'outils, la mémoire et l'historique de session.

Les consultations en mode agent utilisent une clé de session `agent:<id>:subagent:google-meet:<session>` par réunion, afin que les questions de suivi conservent le contexte de la réunion tout en héritant de la stratégie d'agent normale de l'agent configuré.

`realtime.toolPolicy` contrôle l'exécution de la consultation :

- `safe-read-only` : exposez l'outil de consultation et limitez l'agent standard à `read`, `web_search`, `web_fetch`, `x_search`, `memory_search` et `memory_get`.
- `owner` : exposez l'outil de consultation et laissez l'agent standard utiliser la stratégie d'outils d'agent normale.
- `none` : n'exposez pas l'outil de consultation au modèle vocal en temps réel.

La clé de session de consultation est délimitée par session Meet, afin que les appels de consultation de suivi puissent réutiliser le contexte de consultation précédent lors de la même réunion.

Pour forcer une vérification orale de l'état de préparation une fois que Chrome a entièrement rejoint l'appel :

```bash
openclaw googlemeet speak meet_... "Say exactly: I'm here and listening."
```

Pour le test de fumée complet de jointure et de parole :

```bash
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: I'm here and listening."
```

## Liste de contrôle du test en direct

Utilisez cette séquence avant de confier une réunion à un agent non surveillé :

```bash
openclaw googlemeet setup
openclaw nodes status
openclaw googlemeet test-speech https://meet.google.com/abc-defg-hij \
  --transport chrome-node \
  --message "Say exactly: Google Meet speech test complete."
```

État attendu du Chrome-node :

- `googlemeet setup` est entièrement vert.
- `googlemeet setup` inclut `chrome-node-connected` lorsque Chrome-node est le transport par défaut ou qu'un nœud est épinglé.
- `nodes status` montre le nœud sélectionné connecté.
- Le nœud sélectionné annonce à la fois `googlemeet.chrome` et `browser.proxy`.
- L'onglet Meet rejoint l'appel et `test-speech` renvoie l'état de santé de Chrome avec
  `inCall: true`.

Pour un hôte Chrome distant tel qu'une VM Parallels macOS, il s'agit du contrôle
sûr le plus court après la mise à jour du Gateway ou de la VM :

```bash
openclaw googlemeet setup
openclaw nodes status --connected
openclaw nodes invoke \
  --node parallels-macos \
  --command googlemeet.chrome \
  --params '{"action":"setup"}'
```

Cela prouve que le plugin Gateway est chargé, que le nœud VM est connecté avec le
jeton actuel, et que le pont audio Meet est disponible avant qu'un agent n'ouvre un
onglet de réunion réel.

Pour un test de fumée Twilio, utilisez une réunion qui expose les détails d'appel téléphonique :

```bash
openclaw googlemeet setup
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --pin 123456
```

État Twilio attendu :

- `googlemeet setup` inclut des contrôles `twilio-voice-call-plugin` verts,
  `twilio-voice-call-credentials` et `twilio-voice-call-webhook`.
- `voicecall` est disponible dans la CLI après le rechargement du Gateway.
- La session renvoyée possède `transport: "twilio"` et un `twilio.voiceCallId`.
- `openclaw logs --follow` montre le TwiML DTMF servi avant le TwiML en temps réel, puis un
  pont en temps réel avec le message d'accueil initial mis en file d'attente.
- `googlemeet leave <sessionId>` raccroche l'appel vocal délégué.

## Dépannage

### L'agent ne peut pas voir l'outil Google Meet

Confirmez que le plugin est activé dans la configuration du Gateway et rechargez le Gateway :

```bash
openclaw plugins list | grep google-meet
openclaw googlemeet setup
```

Si vous venez d'éditer `plugins.entries.google-meet`, redémarrez ou rechargez le Gateway.
L'agent en cours d'exécution ne voit que les outils de plugin enregistrés par le processus Gateway
courant.

Sur les hôtes Gateway non-macOS, l'outil macOSGateway`google_meet`macOS orienté agent reste visible,
mais les actions de retour audio de Chrome local sont bloquées avant d'atteindre le pont audio.
L'audio de retour de Chrome local dépend actuellement de macOS `BlackHole 2ch`Linux, donc
les agents Linux doivent utiliser `mode: "transcribe"`macOS, l'appel Twilio, ou un hôte
macOS `chrome-node` au lieu du chemin d'agent Chrome local par défaut.

### Aucun nœud compatible Google Meet connecté

Sur l'hôte du nœud, exécutez :

```bash
openclaw plugins enable google-meet
openclaw plugins enable browser
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node run --host <gateway-lan-ip> --port 18789 --display-name parallels-macos
```

Sur l'hôte Gateway, approuvez le nœud et vérifiez les commandes :

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

Le nœud doit être connecté et lister `googlemeet.chrome` ainsi que `browser.proxy`Gateway.
La configuration Gateway doit autoriser ces commandes de nœud :

```json5
{
  gateway: {
    nodes: {
      allowCommands: ["browser.proxy", "googlemeet.chrome"],
    },
  },
}
```

Si `googlemeet setup` échoue `chrome-node-connected`Gateway ou si le journal Gateway signale
`gateway token mismatch`GatewayGateway, réinstallez ou redémarrez le nœud avec le jeton Gateway actuel.
Pour une passerelle LAN, cela signifie généralement :

```bash
OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1 \
  openclaw node install \
  --host <gateway-lan-ip> \
  --port 18789 \
  --display-name parallels-macos \
  --force
```

Rechargez ensuite le service de nœud et relancez :

```bash
openclaw googlemeet setup
openclaw nodes status --connected
```

### Le navigateur s'ouvre mais l'agent ne peut pas rejoindre

Exécutez `googlemeet test-listen` pour les jointures en observation uniquement ou `googlemeet test-speech`
pour les jointures en temps réel, puis inspectez l'état de santé Chrome renvoyé. Si l'une ou l'autre sonde
signale `manualActionRequired: true`, affichez `manualActionMessage` à l'opérateur
et cessez de réessayer jusqu'à ce que l'action du navigateur soit terminée.

Actions manuelles courantes :

- Connectez-vous au profil Chrome.
- Admettez l'invité depuis le compte hôte Meet.
- Accordez les permissions de microphone/caméra à Chrome lorsque l'invite de permission
  native de Chrome apparaît.
- Fermez ou réparez une boîte de dialogue de permission Meet bloquée.

Ne signalez pas « non connecté » simplement parce que Meet affiche « Voulez-vous que les autres vous entendent dans la réunion ? ». C'est l'écran interstitielle de choix audio de Meet ; OpenClaw clique sur **Utiliser le microphone** via l'automatisation du navigateur lorsque cela est disponible et continue d'attendre l'état réel de la réunion. Pour le repli du navigateur en mode création uniquement, OpenClaw peut cliquer sur **Continuer sans microphone** car la création de l'URL n'a pas besoin du chemin audio en temps réel.

### Échec de la création de réunion

`googlemeet create` utilise d'abord le point de terminaison `spaces.create` de l'API Google Meet API lorsque les informations d'identification OAuth sont configurées. Sans les informations d'identification OAuth, il revient au navigateur du nœud Chrome épinglé. Confirmez :

- Pour la création API : `oauth.clientId` et `oauth.refreshToken` sont configurés, ou les variables d'environnement `OPENCLAW_GOOGLE_MEET_*` correspondantes sont présentes.
- Pour la création API : le jeton d'actualisation a été généré après l'ajout de la prise en charge de la création. Les anciens jetons peuvent manquer de l'étendue `meetings.space.created` ; relancez `openclaw googlemeet auth login --json` et mettez à jour la configuration du plugin.
- Pour le repli du navigateur : `defaultTransport: "chrome-node"` et `chromeNode.node` pointent vers un nœud connecté avec `browser.proxy` et `googlemeet.chrome`.
- Pour le repli du navigateur : le profil Chrome OpenClaw sur ce nœud est connecté à Google et peut ouvrir `https://meet.google.com/new`.
- Pour le repli du navigateur : les nouvelles tentatives réutilisent un onglet `https://meet.google.com/new` existant ou un onglet d'invite de compte Google avant d'en ouvrir un nouveau. Si un agent expire, réessayez l'appel d'outil plutôt que d'ouvrir manuellement un autre onglet Meet.
- Pour le repli du navigateur : si l'outil renvoie `manualActionRequired: true`, utilisez le `browser.nodeId`, `browser.targetId`, `browserUrl` et `manualActionMessage` renvoyés pour guider l'opérateur. Ne réessayez pas en boucle tant que cette action n'est pas terminée.
- Pour le repli du navigateur : si Meet affiche « Voulez-vous que les autres vous entendent dans la réunion ? », laissez l'onglet ouvert. OpenClaw devrait cliquer sur **Utiliser le microphone** ou, pour le repli création uniquement, sur **Continuer sans microphone** via l'automatisation du navigateur et continuer à attendre l'URL Meet générée. Si ce n'est pas possible, l'erreur devrait mentionner `meet-audio-choice-required`, et non `google-login-required`.

### L'agent rejoint mais ne parle pas

Vérifiez le chemin en temps réel :

```bash
openclaw googlemeet setup
openclaw googlemeet doctor
```

Utilisez `mode: "agent"` pour le chemin normal de réponse STT -> agent OpenClaw -> TTS, ou `mode: "bidi"` pour le repli vocal direct en temps réel. `mode: "transcribe"` ne lance pas intentionnellement le pont de réponse. Pour le débogage observationnel uniquement, exécutez `openclaw googlemeet status --json <session-id>` après que les participants ont parlé et vérifiez `captioning`, `transcriptLines` et `lastCaptionText`. Si `inCall` est vrai mais que `transcriptLines` reste à `0`, les sous-titres Meet peuvent être désactivés, personne n'a parlé depuis l'installation de l'observateur, l'interface Meet a changé, ou les sous-titres en direct ne sont pas disponibles pour la langue/le compte de la réunion.

`googlemeet test-speech` vérifie toujours le chemin en temps réel et indique si des octets de sortie du pont ont été observés pour cet appel. Si `speechOutputVerified` est faux et que `speechOutputTimedOut` est vrai, le fournisseur en temps réel a peut-être accepté l'énoncé mais OpenClaw n'a pas vu de nouveaux octets de sortie atteindre le pont audio Chrome.

Vérifiez également :

- Une clé de fournisseur en temps réel est disponible sur l'hôte Gateway, telle que `OPENAI_API_KEY` ou `GEMINI_API_KEY`.
- `BlackHole 2ch` est visible sur l'hôte Chrome.
- `sox` existe sur l'hôte Chrome.
- Le microphone et le haut-parleur Meet sont acheminés via le chemin audio virtuel utilisé par OpenClaw. `doctor` devrait afficher `meet output routed: yes` pour les jointures en temps réel Chrome locales.

`googlemeet doctor [session-id]` affiche la session, le nœud, l'état en appel,
la raison de l'action manuelle, la connexion au fournisseur en temps réel, `realtimeReady`, l'activité
d'entrée/sortie audio, les horodatages audio, les compteurs d'octets et l'URL du navigateur.
Utilisez `googlemeet status [session-id] --json` lorsque vous avez besoin du JSON brut. Utilisez
`googlemeet doctor --oauth` lorsque vous devez vérifier le OAuth de Google Meet
sans exposer les jetons ; ajoutez `--meeting` ou `--create-space` lorsque vous avez besoin d'une
preuve de l'API Google Meet également.

Si un agent a expiré et que vous voyez déjà un onglet Meet ouvert, inspectez cet onglet
sans en ouvrir un autre :

```bash
openclaw googlemeet recover-tab
openclaw googlemeet recover-tab https://meet.google.com/abc-defg-hij
```

L'action de Gateway équivalente est `recover_current_tab`. Elle focalise et inspecte un
onglet Meet existant pour le transport sélectionné. Avec `chrome`, elle utilise le contrôle local
du navigateur via le CLI ; avec `chrome-node`, elle utilise le nœud
Chrome configuré. Elle n'ouvre pas de nouvel onglet ni ne crée de nouvelle session ; elle signale le
blocage actuel, tel que l'état de connexion, d'admission, d'autorisations ou de choix audio.
La commande Gateway communique avec le Gateway configuré, le Gateway doit donc être en cours d'exécution ;
`chrome-node` nécessite également que le nœud Chrome soit connecté.

### Les vérifications de configuration Twilio échouent

`twilio-voice-call-plugin` échoue lorsque `voice-call` n'est pas autorisé ou activé.
Ajoutez-le à `plugins.allow`, activez `plugins.entries.voice-call` et rechargez le
Gateway.

`twilio-voice-call-credentials` échoue lorsque le backend Twilio n'a pas le SID de compte,
le jeton d'authentification ou le numéro d'appelant. Définissez-les sur l'hôte du Gateway :

```bash
export TWILIO_ACCOUNT_SID=AC...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM_NUMBER=+15550001234
```

`twilio-voice-call-webhook` échoue lorsque `voice-call` n'a aucune exposition webhook
publique, ou lorsque `publicUrl` pointe vers l'espace de boucle locale (loopback) ou un réseau privé.
Définissez `plugins.entries.voice-call.config.publicUrl` sur l'URL du fournisseur publique ou
configurez une exposition tunnel/Tailscale via `voice-call`.

Les URL de bouclage et privées ne sont pas valides pour les rappels de transporteur. N'utilisez pas
`localhost`, `127.0.0.1`, `0.0.0.0`, `10.x`, `172.16.x`-`172.31.x`,
`192.168.x`, `169.254.x`, `fc00::/7`, ou `fd00::/8` comme `publicUrl`.

Pour une URL publique stable :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          fromNumber: "+15550001234",
          publicUrl: "https://voice.example.com/voice/webhook",
        },
      },
    },
  },
}
```

Pour le développement local, utilisez un tunnel ou une exposition Tailscale au lieu d'une URL d'hôte privé :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tunnel: { provider: "ngrok" },
          // or
          tailscale: { mode: "funnel", path: "/voice/webhook" },
        },
      },
    },
  },
}
```

Redémarrez ensuite ou rechargez le Gateway et exécutez :

```bash
openclaw googlemeet setup --transport twilio
openclaw voicecall setup
openclaw voicecall smoke
```

`voicecall smoke` est par défaut uniquement une vérification de préparation. Pour faire un essai à blanc d'un nombre spécifique :

```bash
openclaw voicecall smoke --to "+15555550123"
```

N'ajoutez `--yes` que lorsque vous souhaitez intentionnellement passer un appel de notification sortant en direct :

```bash
openclaw voicecall smoke --to "+15555550123" --yes
```

### L'appel Twilio démarre mais n'entre jamais dans la réunion

Confirmez que l'événement Meet expose les détails de l'appel téléphonique. Transmettez le numéro d'appel exact et le code PIN ou une séquence DTMF personnalisée :

```bash
openclaw googlemeet join https://meet.google.com/abc-defg-hij \
  --transport twilio \
  --dial-in-number +15551234567 \
  --dtmf-sequence ww123456#
```

Utilisez des `w` ou des virgules au début de `--dtmf-sequence` si le provider a besoin d'une pause avant d'entrer le code PIN.

Si l'appel téléphonique est créé mais que la liste des participants Meet n'affiche jamais le participant par appel :

- Exécutez `openclaw googlemeet doctor <session-id>` pour confirmer l'ID d'appel Twilio délégué, si la séquence DTMF a été mise en file d'attente, et si le message d'introduction a été demandé.
- Exécutez `openclaw voicecall status --call-id <id>` et confirmez que l'appel est toujours actif.
- Exécutez `openclaw voicecall tail` et vérifiez que les webhooks Twilio arrivent bien au Gateway.
- Exécutez `openclaw logs --follow` et recherchez la séquence Twilio Meet : Google Meet délègue la jointure, Voice Call stocke et sert le TwiML DTMF pré-connexion, Voice Call sert le TwiML en temps réel pour l'appel Twilio, puis Google Meet demande la parole d'introduction avec `voicecall.speak`.
- Relancez `openclaw googlemeet setup --transport twilio` ; une vérification de configuration verte est requise mais ne prouve pas que la séquence du code PIN de la réunion est correcte.
- Confirmez que le numéro d'appel appartient à la même invitation et à la même région Meet que le code PIN.
- Augmentez `voiceCall.dtmfDelayMs` par rapport à la valeur par défaut de 12 secondes si Meet répond lentement ou si la transcription de l'appel affiche toujours l'invite demandant un code PIN après l'envoi de la DTMF de pré-connexion.
- Si le participant rejoint mais que vous n'entendez pas le message d'accueil, vérifiez `openclaw logs --follow` pour la requête `voicecall.speak` post-DTMF et la lecture TTS du flux média ou le repli `<Say>` de Twilio. Si la transcription de l'appel contient toujours « enter the meeting PIN », la branche téléphonique n'a pas encore rejoint la salle Meet, donc les participants de la réunion n'entendront pas la parole.

Si les webhooks n'arrivent pas, déboguez d'abord le plugin Voice Call : le provider doit atteindre `plugins.entries.voice-call.config.publicUrl` ou le tunnel configuré. Voir [Voice call troubleshooting](/fr/plugins/voice-call#troubleshooting).

## Notes

L'API média officielle de Google Meet est orientée réception, donc parler dans un appel Meet nécessite toujours un chemin participant. Ce plugin garde cette limite visible : Chrome gère la participation du navigateur et le routage audio local ; Twilio gère la participation par téléphone.

Les modes talk-back de Chrome ont besoin de `BlackHole 2ch` plus soit :

- `chrome.audioInputCommand` plus `chrome.audioOutputCommand`OpenClaw : OpenClaw possède le pont et achemine l'audio en `chrome.audioFormat` entre ces commandes et le provider sélectionné. Le mode Agent utilise la transcription en temps réel plus le TTS régulier ; le mode bidi utilise le provider vocal en temps réel. Le chemin Chrome par défaut est PCM16 à 24 kHz avec `chrome.audioBufferBytes: 4096` ; le G.711 mu-law à 8 kHz reste disponible pour les paires de commandes héritées.
- `chrome.audioBridgeCommand` : une commande de pont externe possède tout le chemin audio local et doit quitter après avoir démarré ou validé son démon. Ceci n'est valide que pour `bidi` car le mode `agent` nécessite un accès direct à la paire de commandes pour le TTS.

Lorsqu'un agent appelle l'outil `google_meet` en mode agent, la session de consultant de réunion bifurque la transcription actuelle de l'appelant avant de répondre à la parole du participant. La session Meet reste séparée (`agent:<agentId>:subagent:google-meet:<sessionId>`) afin que les suites de réunion ne modifient pas directement la transcription de l'appelant.

Pour un audio duplex propre, acheminez la sortie Meet et le microphone Meet via des
périphériques virtuels distincts ou un graphe de périphériques virtuels de type
Loopback. Un seul périphérique BlackHole partagé peut faire écho aux autres
participants dans l'appel.

Avec le pont Chrome à paire de commandes, `chrome.bargeInInputCommand` peut écouter un
microphone local distinct et effacer la lecture de l'assistant lorsque l'humain
commence à parler. Cela maintient la parole humaine avant la sortie de l'assistant
même lorsque l'entrée de bouclage BlackHole partagée est temporairement supprimée
pendant la lecture de l'assistant. Comme `chrome.audioInputCommand` et `chrome.audioOutputCommand`,
c'est une commande locale configurée par l'opérateur. Utilisez un chemin de
commande ou une liste d'arguments explicitement approuvés, et ne le pointez pas vers
des scripts provenant d'emplacements non fiables.

`googlemeet speak` déclenche le pont audio talk-back actif pour une session
Chrome. `googlemeet leave` arrête ce pont. Pour les sessions Twilio déléguées
via le plugin Voice Call, `leave` raccroche également l'appel vocal sous-jacent.
Utilisez `googlemeet end-active-conference` lorsque vous souhaitez également fermer la conférence
Google Meet active pour un espace géré par l'API.

## Connexes

- [Plugin d'appel vocal](/fr/plugins/voice-call)
- [Mode talk](/fr/nodes/talk)
- [Création de plugins](/fr/plugins/building-plugins)
