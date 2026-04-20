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

Une fois approuvé, l'appareil est mémorisé et ne nécessitera pas de réapprobation, à moins
que vous ne le révoquiez avec `openclaw devices revoke --device <id> --role <role>`. Consultez
[Appareils CLI](/fr/cli/devices) pour la rotation et la révocation des jetons.

**Remarques :**

- Les connexions de navigateur en boucle locale directe (`127.0.0.1` / `localhost`) sont
  approuvées automatiquement.
- Les connexions de navigateur Tailnet et LAN nécessitent toujours une approbation explicite, même lorsqu'elles
  proviennent de la même machine.
- Chaque profil de navigateur génère un ID d'appareil unique. Le changement de navigateur ou
  l'effacement des données du navigateur nécessitera donc un nouvel appareillage.

## Prise en charge des langues

L'interface de contrôle peut se localiser lors du premier chargement en fonction des paramètres régionaux de votre navigateur.
Pour la modifier ultérieurement, ouvrez **Vue d'ensemble -> Accès Gateway -> Langue**. Le
sélecteur de paramètres régionaux se trouve dans la carte Accès Gateway, et non sous Apparence.

- Langues prises en charge : `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`
- Les traductions non anglaises sont chargées à la demande dans le navigateur.
- La langue sélectionnée est enregistrée dans le stockage du navigateur et réutilisée lors des prochaines visites.
- Les clés de traduction manquantes reviennent à l'anglais par défaut.

## Ce qu'il peut faire (à ce jour)

- Chat avec le modèle via le WS du Gateway (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Flux d'appels d'outils + cartes de sortie d'outils en direct dans le Chat (événements d'agent)
- Canaux : canaux intégrés plus statut des canaux de plugins groupés/externes, connexion QR et configuration par canal (`channels.status`, `web.login.*`, `config.patch`)
- Instances : liste de présence + actualisation (`system-presence`)
- Sessions : liste + substitutions de session pour model/thinking/fast/verbose/trace/reasoning (`sessions.list`, `sessions.patch`)
- Rêves : statut de rêve, bouton activer/désactiver, et lecteur de journal de rêve (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Tâches Cron : liste/ajouter/modifier/exécuter/activer/désactiver + historique d'exécution (`cron.*`)
- Compétences : statut, activer/désactiver, installer, mises à jour de clé API (`skills.*`)
- Nœuds : liste + caps (`node.list`)
- Approbations d'exécution : modifier les listes d'autorisation de passerelle ou de nœud + politique de demande pour `exec host=gateway/node` (`exec.approvals.*`)
- Configuration : afficher/modifier `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Configuration : appliquer + redémarrer avec validation (`config.apply`) et réveiller la dernière session active
- Les écritures de configuration incluent une protection de hachage de base pour empêcher l'écrasement des modifications simultanées
- Les écritures de configuration (`config.set`/`config.apply`/`config.patch`) effectuent également une vérification préliminaire de la résolution active des SecretRef pour les références dans la charge utile de configuration soumise ; les références actives soumises non résolues sont rejetées avant l'écriture
- Schéma de configuration + rendu de formulaire (`config.schema` / `config.schema.lookup`,
  y compris le champ `title` / `description`, indications d'interface correspondantes, résumés
  des enfants immédiats, métadonnées de documentation sur les nœuds d'objet/wildcard/tableau/composition,
  plus les schémas de plugin + channel si disponibles); L'éditeur JSON brut est
  disponible uniquement lorsque l'instantané a un aller-retour brut sûr
- Si un instantané ne peut pas effectuer un aller-retour brut sécurisé, l'interface de contrôle force le mode Formulaire et désactive le mode Brut pour cet instantané
- Les valeurs d'objets SecretRef structurés sont affichées en lecture seule dans les champs de texte du formulaire pour éviter une corruption accidentelle d'objet vers chaîne
- Débogage : instantanés d'état/santé/modèles + journal d'événements + appels RPC manuels (`status`, `health`, `models.list`)
- Journaux : suivi en direct des journaux de fichiers de la passerelle avec filtre/exportation (`logs.tail`)
- Mise à jour : exécuter une mise à jour de paquet/git + redémarrage (`update.run`) avec un rapport de redémarrage

Notes du panneau des tâches cron :

- Pour les tâches isolées, la livraison est réglée par défaut sur le résumé de l'annonce. Vous pouvez passer à aucun si vous souhaitez des exécutions uniquement internes.
- Les champs de channel/cible apparaissent lorsque l'annonce est sélectionnée.
- Le mode Webhook utilise `delivery.mode = "webhook"` avec `delivery.to` défini sur une URL de webhook HTTP(S) valide.
- Pour les tâches de session principale, les modes de livraison webhook et aucun sont disponibles.
- Les contrôles d'édition avancés incluent la suppression après exécution, l'effacement de la substitution de l'agent, les options exactes/échelonnées de cron,
  les substitutions de model/de réflexion de l'agent, et les basculements de livraison au mieux effort.
- La validation du formulaire est en ligne avec des erreurs au niveau du champ ; les valeurs invalides désactivent le bouton de sauvegarde jusqu'à correction.
- Définissez `cron.webhookToken` pour envoyer un jeton porteur dédié, s'il est omis le webhook est envoyé sans en-tête d'authentification.
- Solution de repli dépréciée : les tâches héritées stockées avec `notify: true` peuvent toujours utiliser `cron.webhook` jusqu'à la migration.

## Comportement du chat

- `chat.send` est **non bloquant** : il accuse réception immédiatement avec `{ runId, status: "started" }` et la réponse diffuse via `chat` événements.
- Le renvoi avec le même `idempotencyKey` renvoie `{ status: "in_flight" }` pendant l'exécution, et `{ status: "ok" }` après l'achèvement.
- Les réponses `chat.history` sont limitées en taille pour la sécurité de l'interface. Lorsque les entrées de transcription sont trop volumineuses, Gateway peut tronquer les longs champs de texte, omettre les blocs de métadonnées lourds et remplacer les messages trop volumineux par un espace réservé (`[chat.history omitted: message too large]`).
- `chat.history` supprime également les balises de directive inline d'affichage du texte visible de l'assistant (par exemple `[[reply_to_*]]` et `[[audio_as_voice]]`), les payloads XML d'appels d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` et les blocs d'appels d'outil tronqués), et les jetons de contrôle de modèle ASCII/full-width fuités, et omet les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact `NO_REPLY` / `no_reply`.
- `chat.inject` ajoute une note de l'assistant à la transcription de session et diffuse un événement `chat` pour les mises à jour de l'interface utilisateur uniquement (pas d'exécution d'agent, pas de livraison de channel).
- Les sélecteurs de modèle et de réflexion de l'en-tête de chat corrigent la session active immédiatement via `sessions.patch` ; ce sont des substitutions persistantes de la session, et non des options d'envoi pour un seul tour.
- Arrêt :
  - Cliquez sur **Stop** (appelle `chat.abort`)
  - Tapez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) pour abandonner hors bande
  - `chat.abort` prend en charge `{ sessionKey }` (pas de `runId`) pour abandonner toutes les exécutions actives pour cette session
- Conservation partielle en cas d'abandon :
  - Lorsqu'une exécution est abandonnée, le texte partiel de l'assistant peut toujours être affiché dans l'interface
  - Le Gateway persiste le texte partiel abandonné de l'assistant dans l'historique des transcriptions lorsque la sortie mise en tampon existe
  - Les entrées persistées incluent des métadonnées d'abandon afin que les consommateurs de transcriptions puissent distinguer les abandons partiels des sorties d'achèvement normales

## Intégrations hébergées

Les messages de l'assistant peuvent afficher du contenu Web hébergé en ligne avec le shortcode `[embed ...]`.
La stratégie de bac à sable iframe est contrôlée par
`gateway.controlUi.embedSandbox` :

- `strict` : désactive l'exécution de scripts dans les intégrations hébergées
- `scripts` : autorise les intégrations interactives tout en conservant l'isolement d'origine ; c'est
  la valeur par défaut et c'est généralement suffisant pour les jeux/widgets de navigateur autonomes
- `trusted` : ajoute `allow-same-origin` en plus de `allow-scripts` pour les documents
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

Utilisez `trusted` uniquement lorsque le document incorporé a véritablement besoin d'un comportement de même origine. Pour la plupart des jeux et canevas interactifs générés par des agents, `scripts` est le choix le plus sûr.

Les URL d'intégration `http(s)` externes absolues restent bloquées par défaut. Si vous souhaitez intentionnellement que `[embed url="https://..."]` charge des pages tierces, définissez `gateway.controlUi.allowExternalEmbedUrls: true`.

## Accès au Tailnet (recommandé)

### Serve Tailscale intégré (préféré)

Gardez le Gateway en boucle locale (loopback) et laissez Tailscale Serve le proxyer avec HTTPS :

```bash
openclaw gateway --tailscale serve
```

Ouvrir :

- `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

Par défaut, les requêtes Control UI/WebSocket Serve peuvent s'authentifier via les en-têtes d'identité Tailscale (`tailscale-user-login`) lorsque `gateway.auth.allowTailscale` est `true`. OpenClaw vérifie l'identité en résolvant l'adresse `x-forwarded-for` avec `tailscale whois` et en la faisant correspondre à l'en-tête, et n'accepte ceux-ci que lorsque la requête atteint la boucle locale avec les en-têtes `x-forwarded-*` de Tailscale. Définissez `gateway.auth.allowTailscale: false` si vous souhaitez exiger des informations d'identification partagées explicites même pour le trafic Serve. Utilisez ensuite `gateway.auth.mode: "token"` ou `"password"`. Pour ce chemin d'identité Serve asynchrone, les tentatives d'authentification échouées pour la même adresse IP client et le même portée d'authentification sont sérialisées avant les écritures de limite de taux. Les nouvelles tentatives simultanées incorrectes du même navigateur peuvent donc afficher `retry later` lors de la deuxième requête au lieu de deux non-correspondances simples en parallèle. L'authentification Serve sans jeton suppose que l'hôte de la passerelle est fiable. Si du code local non fiable peut s'exécuter sur cet hôte, exigez une authentification par jeton/mot de passe.

### Liaison au tailnet + jeton

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

Ensuite, ouvrez :

- `http://<tailscale-ip>:18789/` (ou votre `gateway.controlUi.basePath` configuré)

Collez le secret partagé correspondant dans les paramètres de l'interface utilisateur (envoyé en tant que `connect.params.auth.token` ou `connect.params.auth.password`).

## HTTP non sécurisé

Si vous ouvrez le tableau de bord via HTTP non sécurisé (`http://<lan-ip>` ou `http://<tailscale-ip>`),
le navigateur s'exécute dans un **contexte non sécurisé** et bloque WebCrypto. Par défaut,
OpenClaw **bloque** les connexions à l'interface de contrôle sans identité d'appareil.

Exceptions documentées :

- compatibilité HTTP non sécurisé uniquement pour localhost avec `gateway.controlUi.allowInsecureAuth=true`
- authentification réussie de l'opérateur de l'interface de contrôle via `gateway.auth.mode: "trusted-proxy"`
- break-glass `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**Correction recommandée :** utilisez HTTPS (Tailscale Serve) ou ouvrez l'interface localement :

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (sur l'hôte de la passerelle)

**Comportement du commutateur d'authentification non sécurisée :**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` est un commutateur de compatibilité locale uniquement :

- Il permet aux sessions de l'interface de contrôle localhost de se poursuivre sans identité d'appareil dans
  les contextes HTTP non sécurisés.
- Il ne contourne pas les vérifications d'appariement.
- Il ne relaxe pas les exigences d'identité d'appareil distantes (non-localhost).

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

`dangerouslyDisableDeviceAuth` désactive les vérifications d'identité d'appareil de l'interface de contrôle et constitue une
régression de sécurité grave. Revenez rapidement à la normale après une utilisation d'urgence.

Note sur le proxy de confiance :

- une authentification réussie via un proxy de confiance peut admettre des sessions **d'opérateur** de l'interface de contrôle sans
  identité d'appareil
- cela ne s'étend **pas** aux sessions de l'interface de contrôle avec un rôle de nœud
- les proxys inversés de bouclage sur le même hôte ne satisfont toujours pas l'authentification par proxy de confiance ; voir
  [Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth)

Voir [Tailscale](/fr/gateway/tailscale) pour les instructions de configuration HTTPS.

## Construction de l'interface

Le Gateway sert des fichiers statiques à partir de `dist/control-ui`. Construisez-les avec :

```bash
pnpm ui:build # auto-installs UI deps on first run
```

Base absolue facultative (lorsque vous souhaitez des URL d'actifs fixes) :

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Pour le développement local (serveur de dev séparé) :

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

Pointez ensuite l'interface vers l'URL WS de votre Gateway (par ex. `ws://127.0.0.1:18789`).

## Débogage/tests : serveur de dev + Gateway distant

L'interface de contrôle se compose de fichiers statiques ; la cible WebSocket est configurable et peut être
différente de l'origine HTTP. C'est pratique lorsque vous souhaitez le serveur de dev Vite
localement mais que le Gateway s'exécute ailleurs.

1. Démarrez le serveur de dev de l'interface : `pnpm ui:dev`
2. Ouvrez une URL telle que :

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

Authentification unique facultative (si nécessaire) :

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

Notes :

- `gatewayUrl` est stocké dans localStorage après le chargement et supprimé de l'URL.
- `token` doit être transmis via le fragment d'URL (`#token=...`) autant que possible. Les fragments ne sont pas envoyés au serveur, ce qui évite les fuites dans les journaux de requêtes et l'en-tête Referer. Les paramètres de requête legacy `?token=` sont toujours importés une fois pour compatibilité, mais uniquement en repli, et sont supprimés immédiatement après l'amorçage.
- `password` est conservé uniquement en mémoire.
- Lorsque `gatewayUrl` est défini, l'interface utilisateur ne revient pas aux identifiants de configuration ou d'environnement.
  Fournissez `token` (ou `password`) explicitement. L'absence d'identifiants explicites constitue une erreur.
- Utilisez `wss://` lorsque le Gateway est derrière TLS (Tailscale Serve, proxy HTTPS, etc.).
- `gatewayUrl` n'est accepté que dans une fenêtre de premier niveau (pas intégrée) pour prévenir le détournement de clic (clickjacking).
- Les déploiements de l'interface utilisateur de contrôle non en boucle locale (non-loopback) doivent définir `gateway.controlUi.allowedOrigins`
  explicitement (origines complètes). Cela inclut les configurations de développement à distance.
- N'utilisez pas `gateway.controlUi.allowedOrigins: ["*"]` sauf pour des
  tests locaux étroitement contrôlés.
  Cela signifie autoriser n'importe quelle origine de navigateur, et non « correspondre à l'hôte que j'utilise ».
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
- [Contrôles de santé](/fr/gateway/health) — surveillance de santé de la passerelle
