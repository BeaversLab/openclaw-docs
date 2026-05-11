---
summary: "Interface de contrôle basée sur le navigateur pour le Gateway (chat, nœuds, configuration)"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "Interface de contrôle"
sidebarTitle: "Interface de contrôle"
---

Le Control UI est une petite application monopage **Vite + Lit** servie par le Gateway :

- par défaut : `http://<host>:18789/`
- préfixe facultatif : définir `gateway.controlUi.basePath` (par ex. `/openclaw`)

Il communique **directement avec le WebSocket du Gateway** sur le même port.

## Ouverture rapide (local)

Si le Gateway s'exécute sur le même ordinateur, ouvrez :

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (ou [http://localhost:18789/](http://localhost:18789/))

Si la page échoue à charger, démarrez d'abord le Gateway : `openclaw gateway`.

L'authentification est fournie lors de la poignée de main WebSocket via :

- `connect.params.auth.token`
- `connect.params.auth.password`
- En-têtes d'identité Tailscale Serve lorsque `gateway.auth.allowTailscale: true`
- en-têtes d'identité trusted-proxy lorsque `gateway.auth.mode: "trusted-proxy"`

Le panneau des paramètres du tableau de bord conserve un jeton pour la session de l'onglet actuel du navigateur et l'URL de la passerelle sélectionnée ; les mots de passe ne sont pas persistants. L'onboarding génère généralement un jeton de passerelle pour l'authentification par secret partagé lors de la première connexion, mais l'authentification par mot de passe fonctionne également lorsque `gateway.auth.mode` est `"password"`.

## Appareillage des appareils (première connexion)

Lorsque vous vous connectez à l'interface de contrôle depuis un nouveau navigateur ou appareil, le Gateway nécessite généralement une **approbation d'appariement unique**. Il s'agit d'une mesure de sécurité pour empêcher tout accès non autorisé.

**Ce que vous verrez :** « déconnecté (1008) : appareillage requis »

<Steps>
  <Step title="Lister les demandes en attente">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step title="Approuver par ID de demande">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

Si le navigateur réessaie l'appariement avec des détails d'authentification modifiés (rôle/portées/clé publique), la demande en attente précédente est remplacée et un nouveau `requestId` est créé. Réexécutez `openclaw devices list` avant l'approbation.

Si le navigateur est déjà apparié et que vous le modifiez pour passer d'un accès en lecture à un accès en écriture/administrateur, cela est considéré comme une mise à niveau de l'approbation, et non comme une reconnexion silencieuse. OpenClaw conserve l'ancienne approbation active, bloque la reconnexion plus large et vous demande d'approuver explicitement le nouvel ensemble de portées.

Une fois approuvé, l'appareil est mémorisé et ne nécessitera pas de réapprobation, sauf si vous le révoquez avec `openclaw devices revoke --device <id> --role <role>`. Voir [Appareils CLI](/fr/cli/devices) pour la rotation et la révocation des jetons.

<Note>
  - Direct local loopback browser connections (`127.0.0.1` / `localhost`) are auto-approved. - Tailscale Serve can skip the pairing round trip for Control UI operator sessions when `gateway.auth.allowTailscale: true`, Tailscale identity verifies, and the browser presents its device identity. - Direct Tailnet binds, LAN browser connects, and browser profiles without device identity still require
  explicit approval. - Each browser profile generates a unique device ID, so switching browsers or clearing browser data will require re-pairing.
</Note>

## Personal identity (browser-local)

The Control UI supports a per-browser personal identity (display name and avatar) attached to outgoing messages for attribution in shared sessions. It lives in browser storage, is scoped to the current browser profile, and is not synced to other devices or persisted server-side beyond the normal transcript authorship metadata on messages you actually send. Clearing site data or switching browsers resets it to empty.

The same browser-local pattern applies to the assistant avatar override. Uploaded assistant avatars overlay the gateway-resolved identity on the local browser only and never round-trip through `config.patch`. The shared `ui.assistant.avatar` config field is still available for non-UI clients writing the field directly (such as scripted gateways or custom dashboards).

## Runtime config endpoint

The Control UI fetches its runtime settings from `/__openclaw/control-ui-config.json`. That endpoint is gated by the same gateway auth as the rest of the HTTP surface: unauthenticated browsers cannot fetch it, and a successful fetch requires either an already valid gateway token/password, Tailscale Serve identity, or a trusted-proxy identity.

## Language support

The Control UI can localize itself on first load based on your browser locale. To override it later, open **Overview -> Gateway Access -> Language**. The locale picker lives in the Gateway Access card, not under Appearance.

- Paramètres régionaux pris en charge : `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`, `th`
- Les traductions non anglophones sont chargées à la demande dans le navigateur.
- Le paramètre régional sélectionné est enregistré dans le stockage du navigateur et réutilisé lors des prochaines visites.
- Les clés de traduction manquantes reviennent à l'anglais par défaut.

## Thèmes d'apparence

Le panneau Apparence conserve les thèmes intégrés Claw, Knot et Dash, ainsi qu'un emplacement d'importation tweakcn local au navigateur. Pour importer un thème, ouvrez [tweakcn themes](https://tweakcn.com/themes), choisissez ou créez un thème, cliquez sur **Share**, et collez le lien du thème copié dans Apparence. L'importateur accepte également les URL de registre `https://tweakcn.com/r/themes/<id>`, les URL d'éditeur comme `https://tweakcn.com/editor/theme?theme=amethyst-haze`, les chemins relatifs `/themes/<id>`, les identifiants bruts de thèmes, et les noms de thèmes par défaut tels que `amethyst-haze`.

Les thèmes importés sont stockés uniquement dans le profil de navigateur actuel. Ils ne sont pas écrits dans la configuration de la passerelle et ne sont pas synchronisés entre les appareils. Le remplacement du thème importé met à jour l'emplacement local unique ; son effacement ramène le thème actif à Claw si le thème importé était sélectionné.

## Ce qu'il peut faire (aujourd'hui)

<AccordionGroup>
  <Accordion title="Chat et Talk">
    - Discutez avec le modèle via le WS du Gateway (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`). - Parlez via des sessions temps réel du navigateur. OpenAI utilise WebRTC direct, Google Live utilise un jeton de navigateur à usage unique contrainte via WebSocket, et les plugins vocaux temps réel backend-only utilisent le transport de relais du Gateway. Le relais conserve les
    informations d'identification du provider sur le Gateway tandis que le navigateur diffuse le microphone PCM via des RPC `talk.realtime.relay*` et renvoie les appels d'outil `openclaw_agent_consult` via `chat.send` pour le plus grand modèle OpenClaw configuré. - Diffusez les appels d'outil + les cartes de sortie d'outil en direct dans le Chat (événements de l'agent).
  </Accordion>
  <Accordion title="Canaux, instances, sessions, rêves">
    - Canaux (Channels) : état des canaux intégrés plus ceux des plugins groupés/externes, connexion QR et configuration par canal (`channels.status`, `web.login.*`, `config.patch`). - Instances : liste de présence + actualisation (`system-presence`). - Sessions : liste + remplacements par session model/thinking/fast/verbose/trace/reasoning (`sessions.list`, `sessions.patch`). - Rêves (Dreams) :
    état de rêve, bouton activer/désactiver, et lecteur de Dream Diary (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`).
  </Accordion>
  <Accordion title="Cron, Skills, nœuds, approbations d'exécution">
    - Tâches Cron : liste/ajouter/modifier/exécuter/activer/désactiver + historique d'exécution (`cron.*`). - Skills : état, activer/désactiver, installer, mises à jour de clé API (`skills.*`). - Nœuds (Nodes) : liste + capacités (`node.list`). - Approbations d'exécution : modifier les listes d'autorisation du gateway ou du nœud + demander la politique pour `exec host=gateway/node`
    (`exec.approvals.*`).
  </Accordion>
  <Accordion title="Config">
    - Afficher/modifier `~/.openclaw/openclaw.json` (`config.get`, `config.set`). - Appliquer + redémarrer avec validation (`config.apply`) et réveiller la dernière session active. - Les écritures incluent une protection par hachage de base pour éviter l'écrasement des modifications simultanées. - Les écritures (`config.set`/`config.apply`/`config.patch`) effectuent une pré-résolution active des
    SecretRef pour les références dans la payload de configuration soumise ; les références soumises actives non résolues sont rejetées avant l'écriture. - Rendu de schéma + de formulaire (`config.schema` / `config.schema.lookup`, y compris le champ `title` / `description`, indices d'interface utilisateur correspondants, résumés des enfants immédiats, métadonnées de documentation sur les nœuds
    d'objet imbriqués/carte générique/tableau/composition, ainsi que les schémas de plugin + channel lorsque disponibles) ; l'éditeur JSON brut n'est disponible que lorsque l'instantané a un aller-retour brut sécurisé. - Si un instantané ne peut pas effectuer un aller-retour brut sécurisé, Control UI force le mode Formulaire et désactive le mode Brut pour cet instantané. - La fonctionnalité «
    Rétablir à la version enregistrée » de l'éditeur JSON brut préserve la forme brute d'origine (mise en forme, commentaires, disposition `$include`) au lieu de restituer un instantané aplati, ce qui permet aux modifications externes de survivre à une réinitialisation lorsque l'instantané peut effectuer un aller-retour brut sécurisé. - Les valeurs d'objet SecretRef structurées sont affichées en
    lecture seule dans les champs de texte du formulaire pour éviter une corruption accidentelle d'objet en chaîne.
  </Accordion>
  <Accordion title="Debug, logs, update">
    - Débogage : instantanés de statut/santé/modèles + journal d'événements + appels RPC manuels (`status`, `health`, `models.list`). - Journaux : suivi en temps réel des journaux de fichiers de la passerelle avec filtre/export (`logs.tail`). - Mise à jour : exécuter une mise à jour de paquet/git + redémarrage (`update.run`) avec un rapport de redémarrage, puis interroger `update.status` après
    reconnexion pour vérifier la version de la passerelle en cours d'exécution.
  </Accordion>
  <Accordion title="Notes du panneau des tâches Cron">
    - Pour les tâches isolées, la remise par défaut est le résumé de l'annonce. Vous pouvez passer sur aucun si vous souhaitez des exécutions uniquement internes. - Les champs de canal/cible apparaissent lorsque l'annonce est sélectionnée. - Le mode Webhook utilise `delivery.mode = "webhook"` avec `delivery.to` défini sur une URL de webhook HTTP(S) valide. - Pour les tâches de session principale,
    les modes de remise par webhook et aucun sont disponibles. - Les contrôles d'édition avancés incluent la suppression après exécution, l'annulation du remplacement de l'agent, les options d'exactitude/décalage de Cron, les remplacements de modèle de réflexion de l'agent et les basculements de livraison au mieux. - La validation du formulaire est en ligne avec des erreurs au niveau du champ ;
    les valeurs invalides désactivent le bouton de sauvegarde jusqu'à correction. - Définissez `cron.webhookToken` pour envoyer un jeton porteur dédié, si omis le webhook est envoyé sans en-tête d'authentification. - Solution de repli obsolète : les tâches héritées stockées avec `notify: true` peuvent toujours utiliser `cron.webhook` jusqu'à ce qu'elles soient migrées.
  </Accordion>
</AccordionGroup>

## Comportement du chat

<AccordionGroup>
  <Accordion title="Send and history semantics">
    - `chat.send` est **non-bloquant** : il acquitte immédiatement avec `{ runId, status: "started" }` et la réponse est diffusée via des événements `chat`.
    - Les téléchargements de chat acceptent les images ainsi que les fichiers non vidéo. Les images conservent leur chemin natif ; les autres fichiers sont stockés en tant que média géré et affichés dans l'historique sous forme de liens de pièces jointes.
    - Le renvoi avec le même `idempotencyKey` renvoie `{ status: "in_flight" }` pendant l'exécution, et `{ status: "ok" }` après l'achèvement.
    - Les réponses `chat.history` sont limitées en taille pour la sécurité de l'interface. Lorsque les entrées de transcription sont trop volumineuses, le Gateway peut tronquer les longs champs de texte, omettre les blocs de métadonnées lourds et remplacer les messages trop volumineux par un espace réservé (`[chat.history omitted: message too large]`).
    - Les images générées par l'assistant sont conservées sous forme de références de média géré et renvoyées via des URL de média authentifiées du Gateway, de sorte que les rechargements ne dépendent pas du maintien des charges utiles d'images base64 brutes dans la réponse de l'historique du chat.
    - `chat.history` supprime également les balises de directive en ligne uniquement d'affichage du texte visible de l'assistant (par exemple `[[reply_to_*]]` et `[[audio_as_voice]]`), les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et les blocs d'appel d'outil tronqués), et les jetons de contrôle de modèle ASCII/full-width divulgués, et omet les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact `NO_REPLY` / `no_reply`.
    - Pendant un envoi actif et l'actualisation finale de l'historique, la vue de chat maintient visibles les messages utilisateur/assistant optimistes locaux si `chat.history` renvoie brièvement un instantané plus ancien ; la transcription canonique remplace ces messages locaux une fois que l'historique du Gateway a rattrapé son retard.
    - `chat.inject` ajoute une note d'assistant à la transcription de session et diffuse un événement `chat` pour les mises à jour uniquement d'interface (pas d'exécution d'agent, pas de livraison de canal).
    - Les sélecteurs de modèle et de réflexion de l'en-tête de chat corrigent la session active immédiatement via `sessions.patch` ; ce sont des substitutions de session persistantes, et non des options d'envi pour un seul tour.
    - Lorsque les rapports d'utilisation de session frais du Gateway indiquent une forte pression sur le contexte, la zone de composition du chat affiche une notice de contexte et, aux niveaux de compactage recommandés, un bouton de compactage qui exécute le chemin de compactage de session normal. Les instantanés de jetons obsolètes sont masqués jusqu'à ce que le Gateway signale à nouveau une utilisation fraîche.
  </Accordion>
  <Accordion title="Talk mode (browser realtime)">
    Le mode Talk utilise un fournisseur vocal en temps réel enregistré. Configurez OpenAI avec `talk.provider: "openai"` plus `talk.providers.openai.apiKey`, ou configurez Google avec `talk.provider: "google"` plus `talk.providers.google.apiKey` ; la configuration du fournisseur en temps réel Voice Call peut toujours être réutilisée en tant que secours. Le navigateur ne reçoit jamais de clé API de fournisseur standard. OpenAI reçoit un secret client éphémère Realtime pour WebRTC. Google Live reçoit un jeton d'authentification API Live à usage unique pour une session WebSocket de navigateur, avec des instructions et des déclarations d'Gateway verrouillées dans le jeton par le Gateway. Les fournisseurs qui n'exposent qu'un pont en temps réel backend passent par le transport de relais du Gateway, de sorte que les informations d'identification et les sockets fournisseurs restent côté serveur tandis que l'audio du navigateur passe par des RPC Gateway authentifiés. Le prompt de session Realtime est assemblé par le OpenAI ; `talk.realtime.session` n'accepte pas les substitutions d'instructions fournies par l'appelant.

    Dans le compositeur de Chat, le contrôle Talk est le bouton vagues à côté du bouton de dictée du microphone. Lorsque Talk démarre, la ligne d'état du compositeur affiche `Connecting Talk...`, puis `Talk live` pendant que l'audio est connecté, ou `Asking OpenClaw...` pendant qu'un appel d'Gateway en temps réel consulte le grand Gateway configuré via `chat.send`.

    Test de fumée en direct du mainteneur : `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` vérifie l'échange SDP WebRTC du navigateur Gateway, la configuration WebSocket du navigateur à jeton contraint Google Live et l'adaptateur de navigateur de relais du Gateway avec un faux média de microphone. La commande affiche uniquement l'état du fournisseur et ne journalise pas les secrets.

  </Accordion>
  <Accordion title="Arrêter et abandonner">
    - Cliquez sur **Stop** (appelle `chat.abort`).
    - Pendant qu'une exécution est active, les suites normales sont mises en file d'attente. Cliquez sur **Steer** sur un message en file d'attente pour injecter cette suite dans le tour en cours.
    - Tapez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) pour abandonner hors bande.
    - `chat.abort` prend en charge `{ sessionKey }` (sans `runId`) pour abandonner toutes les exécutions actives pour cette session.
  </Accordion>
  <Accordion title="Conservation des partiels lors de l'abandon">
    - Lorsqu'une exécution est abandonnée, le texte partiel de l'assistant peut toujours être affiché dans l'interface utilisateur.
    - Le Gateway conserve le texte partiel de l'assistant abandonné dans l'historique des transcriptions lorsqu'une sortie tamponnée existe.
    - Les entrées conservées incluent des métadonnées d'abandon afin que les consommateurs de transcriptions puissent distinguer les partiels d'abandon de la sortie de complétion normale.
  </Accordion>
</AccordionGroup>

## Installation PWA et Web Push

Le Control UI fournit un `manifest.webmanifest` et un service worker, afin que les navigateurs modernes puissent l'installer en tant que PWA autonome. Web Push permet au Gateway de réveiller la PWA installée avec des notifications même lorsque l'onglet ou la fenêtre du navigateur n'est pas ouvert.

| Surface                                                     | Ce qu'il fait                                                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `ui/public/manifest.webmanifest`                            | Manifeste PWA. Les navigateurs proposent « Installer l'application » une fois qu'il est accessible. |
| `ui/public/sw.js`                                           | Service worker qui gère les événements `push` et les clics sur les notifications.                   |
| `push/vapid-keys.json` (sous le répertoire d'état OpenClaw) | Paire de clés VAPID auto-générée utilisée pour signer les charges utiles Web Push.                  |
| `push/web-push-subscriptions.json`                          | Points de terminaison d'abonnement du navigateur persistés.                                         |

Remplacez la paire de clés VAPID via les env vars sur le processus Gateway lorsque vous souhaitez épingler des clés (pour les déploiements multi-hôtes, la rotation des secrets ou les tests) :

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT` (par défaut `mailto:openclaw@localhost`)

Le Control UI utilise ces méthodes Gateway limitées par la portée pour enregistrer et tester les abonnements du navigateur :

- `push.web.vapidPublicKey` — récupère la clé publique VAPID active.
- `push.web.subscribe` — enregistre un `endpoint` ainsi que `keys.p256dh`/`keys.auth`.
- `push.web.unsubscribe` — supprime un point de terminaison enregistré.
- `push.web.test` — envoie une notification de test à l'abonnement de l'appelant.

<Note>Web Push est indépendant du chemin de relais APNS iOS (voir [Configuration](/fr/gateway/configuration) pour les notifications basées sur le relais) et de la méthode `push.test` existante, qui ciblent le jumelage mobile natif.</Note>

## Intégrations hébergées

Les messages de l'assistant peuvent afficher du contenu Web hébergé en ligne avec le shortcode `[embed ...]`. La stratégie de bac à sable de l'iframe est contrôlée par `gateway.controlUi.embedSandbox` :

<Tabs>
  <Tab title="strict">Désactive l'exécution de scripts dans les intégrations hébergées.</Tab>
  <Tab title="scripts (default)">Autorise les intégrations interactives tout en maintenant l'isolement d'origine ; c'est le choix par défaut et est généralement suffisant pour les jeux/widgets de navigateur autonomes.</Tab>
  <Tab title="trusted">Ajoute `allow-same-origin` par-dessus `allow-scripts` pour les documents de même site qui nécessitent intentionnellement des privilèges plus élevés.</Tab>
</Tabs>

Exemple :

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

<Warning>Utilisez `trusted` uniquement lorsque le document intégré a véritablement besoin d'un comportement de même origine. Pour la plupart des jeux et canevas interactifs générés par des agents, `scripts` est le choix le plus sûr.</Warning>

Les URL d'intégration externes absolues `http(s)` restent bloquées par défaut. Si vous souhaitez intentionnellement que `[embed url="https://..."]` charge des pages tierces, définissez `gateway.controlUi.allowExternalEmbedUrls: true`.

## Accès Tailnet (recommandé)

<Tabs>
  <Tab title="Tailscale Serve intégré (recommandé)">
    Gardez le Gateway sur la boucle locale (loopback) et laissez Tailscale Serve le servir en proxy avec HTTPS :

    ```bash
    openclaw gateway --tailscale serve
    ```

    Ouvrez :

    - `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

    Par défaut, les requêtes Control UI/WebSocket Serve peuvent s'authentifier via les en-têtes d'identité Tailscale (`tailscale-user-login`) lorsque `gateway.auth.allowTailscale` est `true`. OpenClaw vérifie l'identité en résolvant l'adresse `x-forwarded-for` avec `tailscale whois` et en la faisant correspondre à l'en-tête, et n'accepte ces requêtes que lorsqu'elles atteignent la boucle locale avec les en-têtes `x-forwarded-*` de Tailscale. Pour les sessions d'opérateur de Control UI avec l'identité de l'appareil du navigateur, ce chemin Serve vérifié évite également l'aller-retour d'appairage d'appareil ; les navigateurs sans appareil et les connexions de rôle nœud suivent toujours les vérifications d'appareil normales. Définissez `gateway.auth.allowTailscale: false` si vous souhaitez exiger des identifiants de secret partagé explicites même pour le trafic Serve. Utilisez ensuite `gateway.auth.mode: "token"` ou `"password"`.

    Pour ce chemin d'identité Serve asynchrone, les tentatives d'authentification échouées pour la même adresse IP client et le même portée d'authentification sont sérialisées avant les écritures de limitation de débit. Les nouvelles tentatives incorrectes simultanées du même navigateur peuvent donc afficher `retry later` sur la deuxième requête au lieu de deux erreurs de correspondance simples en parallèle.

    <Warning>
    L'authentification Serve sans jeton suppose que l'hôte de la passerelle est fiable. Si du code local non fiable peut s'exécuter sur cet hôte, exigez une authentification par jeton/mot de passe.
    </Warning>

  </Tab>
  <Tab title="Lier au tailnet + jeton">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    Ensuite, ouvrez :

    - `http://<tailscale-ip>:18789/` (ou votre `gateway.controlUi.basePath` configuré)

    Collez le secret partagé correspondant dans les paramètres de l'interface utilisateur (envoyé en tant que `connect.params.auth.token` ou `connect.params.auth.password`).

  </Tab>
</Tabs>

## HTTP non sécurisé

Si vous ouvrez le tableau de bord via HTTP simple (`http://<lan-ip>` ou `http://<tailscale-ip>`), le navigateur fonctionne dans un **contexte non sécurisé** et bloque WebCrypto. Par défaut, OpenClaw **bloque** les connexions à l'interface de contrôle (Control UI) sans identité d'appareil.

Exceptions documentées :

- compatibilité HTTP non sécurisé uniquement pour localhost avec `gateway.controlUi.allowInsecureAuth=true`
- authentification réussie de l'opérateur de l'interface de contrôle via `gateway.auth.mode: "trusted-proxy"`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true` (brise-glace)

**Correction recommandée :** utilisez HTTPS (Tailscale Serve) ou ouvrez l'interface localement :

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (sur l'hôte de la passerelle)

<AccordionGroup>
  <Accordion title="Comportement du basculement d'authentification non sécurisée">
    ```json5
    {
      gateway: {
        controlUi: { allowInsecureAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    `allowInsecureAuth` est un basculement de compatibilité uniquement local :

    - Il permet aux sessions localhost de l'interface de contrôle de procéder sans identité d'appareil dans les contextes HTTP non sécurisés.
    - Il ne contourne pas les vérifications d'appariement.
    - Il ne relaxe pas les exigences d'identité d'appareil distant (non-localhost).

  </Accordion>
  <Accordion title="Brise-glace uniquement">
    ```json5
    {
      gateway: {
        controlUi: { dangerouslyDisableDeviceAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    <Warning>
    `dangerouslyDisableDeviceAuth` désactive les vérifications d'identité d'appareil de l'interface de contrôle et constitue une dégradation grave de la sécurité. Rétablissez-le rapidement après une utilisation d'urgence.
    </Warning>

  </Accordion>
  <Accordion title="Note sur le proxy de confiance">
    - Une authentification réussie via un proxy de confiance peut admettre desessions **opérateur** de l'interface de contrôle sans identité d'appareil.
    - Cela **ne** s'étend pas aux sessions de l'interface de contrôle avec un rôle de nœud.
    - Les proxys inverse de bouclage sur le même hôte ne satisfont toujours pas l'authentification par proxy de confiance ; voir [Trusted proxy auth](/fr/gateway/trusted-proxy-auth).
  </Accordion>
</AccordionGroup>

Voir [Tailscale](/fr/gateway/tailscale) pour des conseils sur la configuration HTTPS.

## Politique de sécurité du contenu

The Control UI ships with a tight `img-src` policy: only **same-origin** assets, `data:` URLs, and locally generated `blob:` URLs are allowed. Remote `http(s)` and protocol-relative image URLs are rejected by the browser and do not issue network fetches.

Ce que cela signifie en pratique :

- Avatars and images served under relative paths (for example `/avatars/<id>`) still render, including authenticated avatar routes that the UI fetches and converts into local `blob:` URLs.
- Inline `data:image/...` URLs still render (useful for in-protocol payloads).
- Local `blob:` URLs created by the Control UI still render.
- Remote avatar URLs emitted by channel metadata are stripped at the Control UI's avatar helpers and replaced with the built-in logo/badge, so a compromised or malicious channel cannot force arbitrary remote image fetches from an operator browser.

You do not need to change anything to get this behavior — it is always on and not configurable.

## Avatar route auth

When gateway auth is configured, the Control UI avatar endpoint requires the same gateway token as the rest of the API:

- `GET /avatar/<agentId>` returns the avatar image only to authenticated callers. `GET /avatar/<agentId>?meta=1` returns the avatar metadata under the same rule.
- Unauthenticated requests to either route are rejected (matching the sibling assistant-media route). This prevents the avatar route from leaking agent identity on hosts that are otherwise protected.
- The Control UI itself forwards the gateway token as a bearer header when fetching avatars, and uses authenticated blob URLs so the image still renders in dashboards.

If you disable gateway auth (not recommended on shared hosts), the avatar route also becomes unauthenticated, in line with the rest of the gateway.

## Building the UI

The Gateway serves static files from `dist/control-ui`. Build them with:

```bash
pnpm ui:build
```

Optional absolute base (when you want fixed asset URLs):

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

For local development (separate dev server):

```bash
pnpm ui:dev
```

Then point the UI at your Gateway WS URL (e.g. `ws://127.0.0.1:18789`).

## Debugging/testing: dev server + remote Gateway

L'interface de contrôle (Control UI) se compose de fichiers statiques ; la cible WebSocket est configurable et peut être différente de l'origine HTTP. C'est pratique lorsque vous souhaitez avoir le serveur de développement Vite localement mais que le Gateway s'exécute ailleurs.

<Steps>
  <Step title="Démarrer le serveur de dev de l'interface">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="Ouvrir avec gatewayUrl">
    ```text
    http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
    ```

    Authentification unique facultative (si nécessaire) :

    ```text
    http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notes">
    - `gatewayUrl` est stocké dans localStorage après le chargement et retiré de l'URL.
    - `token` doit être transmis via le fragment d'URL (`#token=...`) autant que possible. Les fragments ne sont pas envoyés au serveur, ce qui évite les fuites dans les journaux de requêtes et l'en-tête Referer. Les anciens paramètres de requête `?token=` sont toujours importés une fois pour compatibilité, mais uniquement en repli, et sont supprimés immédiatement après l'amorçage.
    - `password` est conservé uniquement en mémoire.
    - Lorsque `gatewayUrl` est défini, l'interface ne revient pas aux identifiants de configuration ou d'environnement. Fournissez `token` (ou `password`) explicitement. L'absence d'identifiants explicites est une erreur.
    - Utilisez `wss://` lorsque le Gateway est derrière TLS (Tailscale Serve, proxy HTTPS, etc.).
    - `gatewayUrl` n'est accepté que dans une fenêtre de niveau supérieur (pas intégrée) pour prévenir le détournement de clic (clickjacking).
    - Les déploiements de l'interface de contrôle hors boucle locale doivent définir `gateway.controlUi.allowedOrigins` explicitement (origines complètes). Cela inclut les configurations de développement à distance.
    - Le démarrage du Gateway peut amorcer des origines locales telles que `http://localhost:<port>` et `http://127.0.0.1:<port>` à partir de la liaison et du port d'exécution effectifs, mais les origines du navigateur distant nécessitent toujours des entrées explicites.
    - N'utilisez pas `gateway.controlUi.allowedOrigins: ["*"]` sauf pour des tests locaux strictement contrôlés. Cela signifie autoriser n'importe quelle origine de navigateur, et non « correspondre à l'hôte que j'utilise ».
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active le mode de repli d'origine basé sur l'en-tête Host, mais c'est un mode de sécurité dangereux.
  </Accordion>
</AccordionGroup>

Exemple :

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

Détails de la configuration de l'accès à distance : [Accès à distance](/fr/gateway/remote).

## Connexes

- [Tableau de bord](/fr/web/dashboard) — tableau de bord de la passerelle
- [Contrôles de santé](/fr/gateway/health) — surveillance de l'état de la passerelle
- [TUI](/fr/web/tui) — interface utilisateur en mode terminal
- [WebChat](/fr/web/webchat) — interface de discussion basée sur le navigateur
