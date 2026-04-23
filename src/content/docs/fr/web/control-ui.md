---
summary: "Interface de contrôle basée sur le navigateur pour le Gateway (chat, nœuds, configuration)"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "Control UI"
---

# Control UI (navigateur)

Le Control UI est une petite application monopage **Vite + Lit** servie par le Gateway :

- défaut : `http://<host>:18789/`
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
- en-têtes d'identité de proxy de confiance lorsque `gateway.auth.mode: "trusted-proxy"`

Le panneau des paramètres du tableau de bord conserve un jeton pour la session de l'onglet actuel du navigateur
et l'URL de la passerelle sélectionnée ; les mots de passe ne sont pas persistants. L'intégration génère généralement
un jeton de passerelle pour l'authentification par secret partagé lors de la première connexion, mais l'authentification
par mot de passe fonctionne également lorsque `gateway.auth.mode` est `"password"`.

## Appareillage des appareils (première connexion)

Lorsque vous vous connectez à l'interface de contrôle à partir d'un nouveau navigateur ou appareil, le Gateway
exige une **approbation d'appariement ponctuelle** — même si vous êtes sur le même Tailnet
avec `gateway.auth.allowTailscale: true`. Il s'agit d'une mesure de sécurité pour empêcher
l'accès non autorisé.

**Ce que vous verrez :** « déconnecté (1008) : appareillage requis »

**Pour approuver l'appareil :**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

Si le navigateur réessaie l'appariement avec des détails d'authentification modifiés (rôle/portées/clé
publique), la demande en attente précédente est remplacée et un nouveau `requestId` est
créé. Réexécutez `openclaw devices list` avant l'approbation.

Si le navigateur est déjà associé et que vous le modifiez de l'accès en lecture
à l'accès en écriture/administration, cela est considéré comme une mise à niveau de l'approbation, et non comme une reconnexion
silencieuse. OpenClaw conserve l'ancienne approbation active, bloque la reconnexion plus large,
et vous demande d'approuver explicitement le nouvel ensemble de portées.

Une fois approuvé, l'appareil est mémorisé et ne nécessitera pas de ré-approbation, sauf si
vous le révoquez avec `openclaw devices revoke --device <id> --role <role>`. Voir
[Appareils CLI](/fr/cli/devices) pour la rotation et la révocation des jetons.

**Notes :**

- Les connexions de navigateur en boucle locale directe (`127.0.0.1` / `localhost`) sont
  approuvées automatiquement.
- Les connexions de navigateur via Tailnet et LAN nécessitent toujours une approbation explicite, même lorsqu'elles
  proviennent de la même machine.
- Chaque profil de navigateur génère un ID d'appareil unique, donc le changement de navigateur ou
  le nettoyage des données du navigateur nécessitera un nouvel appairage.

## Support linguistique

L'interface de contrôle peut se localiser lors du premier chargement en fonction de la langue de votre navigateur.
Pour la modifier ultérieurement, ouvrez **Overview -> Gateway Access -> Language**. Le
sélecteur de langue se trouve dans la carte Gateway Access, et non sous Apparence.

- Langues prises en charge : `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`
- Les traductions non anglaises sont chargées à la demande dans le navigateur.
- La langue sélectionnée est enregistrée dans le stockage du navigateur et réutilisée lors des prochaines visites.
- Les clés de traduction manquantes reviennent à l'anglais.

## Ce qu'il peut faire (à ce jour)

- Chatter avec le modèle via Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Diffuser les appels d'outils + les cartes de sortie d'outils en direct dans le Chat (événements d'agent)
- Chaînes : état des chaînes intégrées ainsi que des plug-ins groupés/externes, connexion QR et configuration par chaîne (`channels.status`, `web.login.*`, `config.patch`)
- Instances : liste de présence + actualisation (`system-presence`)
- Sessions : liste + remplacements par session model/thinking/fast/verbose/trace/reasoning (`sessions.list`, `sessions.patch`)
- Dreams : statut de rêve, bouton activer/désactiver et lecteur de Dream Diary (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Cron jobs : liste/ajout/modification/exécution/activation/désactivation + historique d'exécution (`cron.*`)
- Skills : statut, activer/désactiver, installer, mises à jour de clé API (`skills.*`)
- Nœuds : liste + capacités (`node.list`)
- Approbations d'exécution : modifier les listes d'autorisation de la passerelle ou des nœuds + demander la politique pour `exec host=gateway/node` (`exec.approvals.*`)
- Config : afficher/modifier `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Config : appliquer + redémarrer avec validation (`config.apply`) et réveiller la dernière session active
- Les écritures de configuration incluent une protection base-hash pour empêcher l'écrasement des modifications simultanées
- Les écritures de configuration (`config.set`/`config.apply`/`config.patch`) effectuent également une vérification préalable de la résolution des SecretRef actifs pour les références dans la charge utile de configuration soumise ; les références actives soumises non résolues sont rejetées avant l'écriture
- Schéma de configuration + rendu de formulaire (`config.schema` / `config.schema.lookup`,
  y compris le champ `title` / `description`, les indices d'interface utilisateur correspondants, les résumés des enfants immédiats,
  les métadonnées de documentation sur les nœuds d'objet/caractère générique/tableau/composition imbriqués,
  ainsi que les schémas de plugin + channel si disponibles) ; L'éditeur JSON brut n'est
  disponible que lorsque l'instantané a un aller-retour brut sécurisé
- Si un instantané ne peut pas effectuer correctement un aller-retour de texte brut, l'interface de contrôle Force le mode Formulaire et désactive le mode Brut pour cet instantané
- Les valeurs d'objet SecretRef structurées sont affichées en lecture seule dans les champs de saisie texte du formulaire pour empêcher une corruption accidentelle d'objet en chaîne
- Debug : instantanés status/health/models + journal des événements + appels RPC manuels (`status`, `health`, `models.list`)
- Logs : suivi en direct des fichiers journaux de la passerelle avec filtre/exportation (`logs.tail`)
- Mise à jour : exécuter une mise à jour de package/git + redémarrage (`update.run`) avec un rapport de redémarrage

Notes du panneau des tâches planifiées (Cron jobs) :

- Pour les tâches isolées, la livraison par défaut est une annonce du résumé. Vous pouvez passer à aucun si vous souhaitez des exécutions uniquement internes.
- Les champs de canal/cible apparaissent lorsque l'annonce est sélectionnée.
- Le mode Webhook utilise `delivery.mode = "webhook"` avec `delivery.to` défini sur une URL de webhook HTTP(S) valide.
- Pour les tâches de session principale, les modes de livraison webhook et aucun sont disponibles.
- Les contrôles d'édition avancés incluent la suppression après exécution, l'effacement de la priorité de l'agent, les options exactes/échelonnées de cron,
  les priorités de modèle/réflexion de l'agent, et les basculements de livraison au mieux.
- La validation du formulaire est en ligne avec des erreurs au niveau du champ ; les valeurs invalides désactivent le bouton de sauvegarde jusqu'à correction.
- Définissez `cron.webhookToken` pour envoyer un jeton porteur dédié, si omis le webhook est envoyé sans en-tête d'authentification.
- Solution de repli obsolète : les tâches héritées stockées avec `notify: true` peuvent toujours utiliser `cron.webhook` jusqu'à la migration.

## Comportement du chat

- `chat.send` est **non bloquant** : il accuse réception immédiatement avec `{ runId, status: "started" }` et la réponse diffuse via des événements `chat`.
- Le renvoi avec le même `idempotencyKey` renvoie `{ status: "in_flight" }` pendant l'exécution, et `{ status: "ok" }` après l'achèvement.
- Les réponses `chat.history` sont limitées en taille pour la sécurité de l'interface. Lorsque les entrées de transcription sont trop volumineuses, Gateway peut tronquer les champs de texte longs, omettre les blocs de métadonnées lourds, et remplacer les messages trop volumineux par un espace réservé (`[chat.history omitted: message too large]`).
- `chat.history` supprime également les balises de directive en ligne affichage uniquement du texte visible de l'assistant (par exemple `[[reply_to_*]]` et `[[audio_as_voice]]`), les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et les blocs d'appel d'outil tronqués), et les jetons de contrôle de modèle ASCII/full-width fuités, et omet les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact `NO_REPLY` / `no_reply`.
- `chat.inject` ajoute une note de l'assistant à la transcription de session et diffuse un événement `chat` pour les mises à jour de l'interface utilisateur uniquement (pas d'exécution d'agent, pas de livraison de channel).
- Les sélecteurs de model et de réflexion de l'en-tête de chat corrigent immédiatement la session active via `sessions.patch` ; il s'agit de substitutions persistantes de session, et non d'options d'envoi pour un seul tour.
- Arrêter :
  - Cliquez sur **Stop** (appelle `chat.abort`)
  - Tapez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) pour abandonner hors bande
  - `chat.abort` prend en charge `{ sessionKey }` (pas de `runId`) pour abandonner toutes les exécutions actives pour cette session
- Conservation partielle en cas d'abandon :
  - Lorsqu'une exécution est abandonnée, le texte partiel de l'assistant peut toujours être affiché dans l'interface utilisateur
  - Gateway persiste le texte partiel de l'assistant abandonné dans l'historique des transcriptions lorsqu'une sortie tamponnée existe
  - Les entrées persistantes incluent des métadonnées d'abandon afin que les consommateurs de transcriptions puissent distinguer les partiels d'abandon de la sortie de fin normale

## Intégrations hébergées

Les messages de l'assistant peuvent afficher du contenu Web hébergé en ligne avec le code court `[embed ...]`.
La stratégie de bac à sable iframe est contrôlée par
`gateway.controlUi.embedSandbox` :

- `strict` : désactive l'exécution de scripts dans les intégrations hébergées
- `scripts` : permet des intégrations interactives tout en maintenant l'isolement de l'origine ; c'est
  la valeur par défaut et elle suffit généralement pour les jeux/widgets de navigateur autonomes
- `trusted` : ajoute `allow-same-origin` par-dessus `allow-scripts` pour les documents
  de même site qui ont intentionnellement besoin de privilèges plus élevés

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

Utilisez `trusted` uniquement lorsque le document intégré a réellement besoin d'un comportement de même origine.
Pour la plupart des jeux et toiles interactifs générés par les agents, `scripts` est
le choix le plus sûr.

Les URL d'intégration `http(s)` externes absolues restent bloquées par défaut. Si vous
voulez intentionnellement que `[embed url="https://..."]` charge des pages tierces, définissez
`gateway.controlUi.allowExternalEmbedUrls: true`.

## Accès Tailnet (recommandé)

### Serve Tailscale intégré (préféré)

Gardez le Gateway en boucle locale (loopback) et laissez le Tailscale Serve le proxyer avec HTTPS :

```bash
openclaw gateway --tailscale serve
```

Ouvrez :

- `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

Par défaut, les requêtes Control UI/WebSocket Serve peuvent s'authentifier via les en-têtes d'identité
Tailscale (`tailscale-user-login`) lorsque `gateway.auth.allowTailscale` est `true`. OpenClaw
vérifie l'identité en résolvant l'adresse `x-forwarded-for` avec
`tailscale whois` et en la faisant correspondre à l'en-tête, et n'accepte ceux-ci que lorsque la
requête atteint la boucle locale avec les en-têtes `x-forwarded-*` de Tailscale. Définissez
`gateway.auth.allowTailscale: false` si vous souhaitez exiger des informations d'identification de secret partagé explicites
même pour le trafic Serve. Utilisez ensuite `gateway.auth.mode: "token"` ou
`"password"`.
Pour ce chemin d'identité Serve asynchrone, les tentatives d'authentification échouées pour la même adresse IP client
et le même périmètre d'authentification sont sérialisées avant les écritures de limitation de débit. Les mauvaises tentatives simultanées
du même navigateur peuvent donc afficher `retry later` sur la deuxième requête
au lieu de deux discordances simples en parallèle.
L'authentification Serve sans jeton suppose que l'hôte de la passerelle est de confiance. Si du code local
non fiable peut s'exécuter sur cet hôte, exigez une authentification par jeton/mot de passe.

### Liaison au tailnet + jeton

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

Ensuite ouvrez :

- `http://<tailscale-ip>:18789/` (ou votre `gateway.controlUi.basePath` configuré)

Collez le secret partagé correspondant dans les paramètres de l'interface utilisateur (envoyé en tant que
`connect.params.auth.token` ou `connect.params.auth.password`).

## HTTP non sécurisé

Si vous ouvrez le tableau de bord via HTTP brut (`http://<lan-ip>` ou `http://<tailscale-ip>`),
le navigateur s'exécute dans un **contexte non sécurisé** et bloque WebCrypto. Par défaut,
OpenClaw **bloque** les connexions au Control UI sans identité d'appareil.

Exceptions documentées :

- compatibilité HTTP non sécurisé localhost uniquement avec `gateway.controlUi.allowInsecureAuth=true`
- authentification Control UI d'opérateur réussie via `gateway.auth.mode: "trusted-proxy"`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true` break-glass

**Correction recommandée :** utilisez HTTPS (Tailscale Serve) ou ouvrez l'interface localement :

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (sur l'hôte de la passerelle)

**Comportement de l'interrupteur d'authentification non sécurisée :**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` est uniquement un interrupteur de compatibilité locale :

- Il permet aux sessions Control UI localhost de procéder sans identité d'appareil dans
  des contextes HTTP non sécurisés.
- Il ne contourne pas les vérifications d'appariement.
- Il n'assouplit pas les exigences d'identité d'appareil distantes (non localhost).

**Break-glass uniquement :**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` désactive les vérifications d'identité d'appareil du Control UI et constitue une
grave réduction de la sécurité. Rétablissez rapidement après une utilisation d'urgence.

Note sur le proxy de confiance :

- une authentification trusted-proxy réussie peut admettre des sessions Control UI **d'opérateur** sans
  identité d'appareil
- cela ne s'étend **pas** aux sessions Control UI node-role
- les proxies inversés en boucle locale same-host ne satisfont toujours pas l'authentification trusted-proxy ; voir
  [Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth)

Voir [Tailscale](/fr/gateway/tailscale) pour les instructions de configuration HTTPS.

## Construction de l'interface utilisateur

Le Gateway sert des fichiers statiques depuis `dist/control-ui`. Construisez-les avec :

```bash
pnpm ui:build
```

Base absolue facultative (lorsque vous souhaitez des URL d'actifs fixes) :

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Pour le développement local (serveur de développement séparé) :

```bash
pnpm ui:dev
```

Pointez ensuite l'interface vers votre URL WS de Gateway (par ex. `ws://127.0.0.1:18789`).

## Débogage/tests : serveur de développement + Gateway distant

L'interface de contrôle (Control UI) se compose de fichiers statiques ; la cible WebSocket est configurable et peut être différente de l'origine HTTP. C'est pratique lorsque vous souhaitez le serveur de développement Vite localement mais que le Gateway s'exécute ailleurs.

1. Démarrez le serveur de développement de l'interface : `pnpm ui:dev`
2. Ouvrez une URL telle que :

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

Authentification unique facultative (si nécessaire) :

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

Remarques :

- `gatewayUrl` est stocké dans localStorage après le chargement et retiré de l'URL.
- Le `token` doit être transmis via le fragment d'URL (`#token=...`) autant que possible. Les fragments ne sont pas envoyés au serveur, ce qui évite les fuites dans les journaux de requêtes et l'en-tête Referer. Les anciens paramètres de requête `?token=` sont toujours importés une fois pour compatibilité, mais seulement en solution de repli, et sont supprimés immédiatement après l'amorçage.
- `password` est conservé uniquement en mémoire.
- Lorsque `gatewayUrl` est défini, l'interface ne revient pas aux identifiants de configuration ou d'environnement.
  Fournissez `token` (ou `password`) explicitement. L'absence d'identifiants explicites constitue une erreur.
- Utilisez `wss://` lorsque le Gateway est derrière TLS (Tailscale Serve, proxy HTTPS, etc.).
- `gatewayUrl` n'est accepté que dans une fenêtre de niveau supérieur (non intégrée) pour prévenir le détournement de clic (clickjacking).
- Les déploiements de l'interface de contrôle (Control UI) non sur boucle locale doivent définir `gateway.controlUi.allowedOrigins`
  explicitement (origines complètes). Cela inclut les configurations de développement à distance.
- N'utilisez pas `gateway.controlUi.allowedOrigins: ["*"]` sauf pour des tests locaux
  étroitement contrôlés. Cela signifie autoriser n'importe quelle origine de navigateur, et non « correspondre à l'hôte que j'utilise ».
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active
  le mode de repli d'origine basé sur l'en-tête Host, mais c'est un mode de sécurité dangereux.

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
- [WebChat](/fr/web/webchat) — interface de chat basée sur le navigateur
- [TUI](/fr/web/tui) — interface utilisateur en terminal
- [Contrôles de santé](/fr/gateway/health) — surveillance de la santé de la passerelle
