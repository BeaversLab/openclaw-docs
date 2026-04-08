---
summary: "Interface de contrôle basée sur le navigateur pour le Gateway (chat, nœuds, configuration)"
read_when:
  - You want to operate the Gateway from a browser
  - You want Tailnet access without SSH tunnels
title: "Control UI"
---

# Control UI (navigateur)

Le Control UI est une petite application monopage **Vite + Lit** servie par le Gateway :

- par défaut : `http://<host>:18789/`
- préfixe optionnel : définir `gateway.controlUi.basePath` (par ex. `/openclaw`)

Il communique **directement avec le WebSocket du Gateway** sur le même port.

## Ouverture rapide (local)

Si le Gateway s'exécute sur le même ordinateur, ouvrez :

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (ou [http://localhost:18789/](http://localhost:18789/))

Si la page ne charge pas, démarrez d'abord le Gateway : `openclaw gateway`.

L'authentification est fournie lors de la poignée de main WebSocket via :

- `connect.params.auth.token`
- `connect.params.auth.password`
- en-têtes d'identité Tailscale Serve lorsque `gateway.auth.allowTailscale: true`
- en-têtes d'identité de trusted-proxy lorsque `gateway.auth.mode: "trusted-proxy"`

Le panneau de paramètres du tableau de bord conserve un jeton pour la session de l'onglet actuel du navigateur
et l'URL de la passerelle sélectionnée ; les mots de passe ne sont pas persistants. L'intégration génère généralement
un jeton de passerelle pour l'authentification par secret partagé lors de la première connexion, mais l'authentification
par mot de passe fonctionne également lorsque `gateway.auth.mode` est `"password"`.

## Appareillage des appareils (première connexion)

Lorsque vous vous connectez à l'interface de contrôle à partir d'un nouveau navigateur ou appareil, la Gateway
exige une **approbation d'appareillage ponctuelle** — même si vous êtes sur le même Tailnet
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

Si le navigateur réessaie l'appareillage avec des détails d'authentification modifiés (rôle/portées/clé
publique), la demande en attente précédente est remplacée et un nouveau `requestId` est
créé. Réexécutez `openclaw devices list` avant l'approbation.

Une fois approuvé, l'appareil est mémorisé et ne nécessitera pas de nouvelle approbation, à moins
que vous ne le révoquiez avec `openclaw devices revoke --device <id> --role <role>`. Consultez
[Appareils CLI](/en/cli/devices) pour la rotation et la révocation des jetons.

**Remarques :**

- Les connexions directes du navigateur en boucle locale (`127.0.0.1` / `localhost`) sont
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

- Discuter avec le modèle via le Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Flux d'appels d'outils + cartes de sortie d'outils en direct dans le Chat (événements d'agent)
- Canaux : intégrés plus le statut des canaux de plug-ins groupés/externes, connexion QR et configuration par canal (`channels.status`, `web.login.*`, `config.patch`)
- Instances : liste de présence + rafraîchissement (`system-presence`)
- Sessions : liste + substitutions de modèle/réflexion/rapide/verbeux/raisonnement par session (`sessions.list`, `sessions.patch`)
- Rêves : statut de rêve, bouton d'activation/désactivation et lecteur de journal de rêve (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Tâches Cron : liste/ajout/modification/exécution/activation/désactivation + historique d'exécution (`cron.*`)
- Skills : statut, activation/désactivation, installation, mises à jour de la clé API (`skills.*`)
- Nœuds : liste + caps (`node.list`)
- Approbations d'exécution : modifier les listes d'autorisation de passerelle ou de nœud + politique de demande pour `exec host=gateway/node` (`exec.approvals.*`)
- Configuration : afficher/modifier `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Configuration : appliquer + redémarrer avec validation (`config.apply`) et réveiller la dernière session active
- Les écritures de configuration incluent une protection de hachage de base pour empêcher l'écrasement des modifications simultanées
- Les écritures de configuration (`config.set`/`config.apply`/`config.patch`) effectuent également une vérification préalable de la résolution active SecretRef pour les références dans la charge utile de configuration soumise ; les références actives soumises non résolues sont rejetées avant l'écriture
- Schéma de configuration + rendu de formulaire (`config.schema` / `config.schema.lookup`,
  y compris le champ `title` / `description`, les indices d'interface utilisateur correspondants, les résumés des enfants immédiats,
  les métadonnées de documentation sur les nœuds d'objet/wildcard/tableau/composition imbriqués,
  ainsi que les schémas de plugin + channel lorsque disponibles) ; l'éditeur JSON brut n'est
  disponible que lorsque l'instantané possède un aller-retour brut sécurisé
- Si un instantané ne peut pas effectuer un aller-retour brut sécurisé, l'interface de contrôle force le mode Formulaire et désactive le mode Brut pour cet instantané
- Les valeurs d'objets SecretRef structurés sont affichées en lecture seule dans les champs de texte du formulaire pour éviter une corruption accidentelle d'objet vers chaîne
- Débogage : instantanés d'état/santé/modèles + journal des événements + appels RPC manuels (`status`, `health`, `models.list`)
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
- Définissez `cron.webhookToken` pour envoyer un jeton bearer dédié, si omis le webhook est envoyé sans en-tête d'authentification.
- Solution de repli dépréciée : les tâches héritées stockées avec `notify: true` peuvent toujours utiliser `cron.webhook` jusqu'à leur migration.

## Comportement du chat

- `chat.send` est **non bloquant** : il acquitte immédiatement avec `{ runId, status: "started" }` et la réponse transite via des événements `chat`.
- Le renvoi avec le même `idempotencyKey` renvoie `{ status: "in_flight" }` pendant l'exécution, et `{ status: "ok" }` après l'achèvement.
- Les réponses `chat.history` sont limitées en taille pour la sécurité de l'interface. Lorsque les entrées de la transcription sont trop volumineuses, le Gateway peut tronquer les champs de texte longs, omettre les blocs de métadonnées lourds et remplacer les messages trop volumineux par un espace réservé (`[chat.history omitted: message too large]`).
- `chat.history` supprime également les balises de directive en ligne d'affichage uniquement du texte visible de l'assistant (par exemple `[[reply_to_*]]` et `[[audio_as_voice]]`), les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et les blocs d'appel d'outil tronqués), et les jetons de contrôle de modèle ASCII/full-width fuités, et omet les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact `NO_REPLY` / `no_reply`.
- `chat.inject` ajoute une note d'assistant à la transcription de session et diffuse un événement `chat` pour les mises à jour de l'interface uniquement (pas d'exécution d'agent, pas de livraison de channel).
- Les sélecteurs de modèle et de réflexion de l'en-tête de chat corrigent immédiatement la session active via `sessions.patch` ; ce sont des remplacements persistants de la session, et non des options d'envoi à tour unique.
- Arrêt :
  - Cliquez sur **Stop** (appelle `chat.abort`)
  - Tapez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) pour abandonner hors bande
  - `chat.abort` prend en charge `{ sessionKey }` (pas de `runId`) pour abandonner toutes les exécutions actives pour cette session
- Conservation partielle en cas d'abandon :
  - Lorsqu'une exécution est abandonnée, le texte partiel de l'assistant peut toujours être affiché dans l'interface
  - Le Gateway persiste le texte partiel abandonné de l'assistant dans l'historique des transcriptions lorsque la sortie mise en tampon existe
  - Les entrées persistées incluent des métadonnées d'abandon afin que les consommateurs de transcriptions puissent distinguer les abandons partiels des sorties d'achèvement normales

## Accès au Tailnet (recommandé)

### Tailscale Serve intégré (préféré)

Garder le Gateway en boucle locale (loopback) et laisser Tailscale Serve le proxyer avec HTTPS :

```bash
openclaw gateway --tailscale serve
```

Ouvrir :

- `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

Par défaut, les requêtes Control UI/WebSocket Serve peuvent s'authentifier via les en-têtes d'identité Tailscale
(`tailscale-user-login`) lorsque `gateway.auth.allowTailscale` est `true`. OpenClaw
vérifie l'identité en résolvant l'adresse `x-forwarded-for` avec
`tailscale whois` et en la correspondant à l'en-tête, et n'accepte ceux-ci que lorsque la
requête atteint la boucle locale avec les en-têtes `x-forwarded-*` de Tailscale. Définissez
`gateway.auth.allowTailscale: false` si vous souhaitez exiger des informations d'identification partagées explicites
même pour le trafic Serve. Utilisez ensuite `gateway.auth.mode: "token"` ou
`"password"`.
Pour ce chemin d'identité Serve asynchrone, les tentatives d'authentification échouées pour la même adresse IP client
et le même périmètre d'authentification sont sérialisées avant les écritures de limite de taux. Les nouvelles tentatives simultanées incorrectes
du même navigateur peuvent donc afficher `retry later` sur la deuxième requête
au lieu de deux simples inadéquations en cours simultanément.
L'authentification Serve sans jeton suppose que l'hôte de la passerelle est fiable. Si du code local
non fiable peut s'exécuter sur cet hôte, exigez une authentification par jeton/mot de passe.

### Liaison au tailnet + jeton

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

Ensuite, ouvrez :

- `http://<tailscale-ip>:18789/` (ou votre `gateway.controlUi.basePath` configuré)

Collez le secret partagé correspondant dans les paramètres de l'interface utilisateur (envoyé en tant que
`connect.params.auth.token` ou `connect.params.auth.password`).

## HTTP non sécurisé

Si vous ouvrez le tableau de bord via HTTP simple (`http://<lan-ip>` ou `http://<tailscale-ip>`),
le navigateur s'exécute dans un **contexte non sécurisé** et bloque WebCrypto. Par défaut,
OpenClaw **bloque** les connexions Control UI sans identité d'appareil.

Exceptions documentées :

- compatibilité HTTP non sécurisé localhost uniquement avec `gateway.controlUi.allowInsecureAuth=true`
- authentification réussie de l'opérateur via l'interface de contrôle à travers `gateway.auth.mode: "trusted-proxy"`
- break-glass `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

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

- Il permet aux sessions de l'interface de contrôle localhost de procéder sans identité d'appareil dans des contextes HTTP non sécurisés.
- Il ne contourne pas les vérifications d'appairage.
- Il ne desserre pas les exigences d'identité d'appareil distantes (non localhost).

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

`dangerouslyDisableDeviceAuth` désactive les vérifications d'identité d'appareil de l'interface de contrôle et constitue une rétrogradation grave de la sécurité. Rétablissez rapidement après une utilisation d'urgence.

Note sur le proxy de confiance :

- une authentification réussie par proxy de confiance peut admettre des sessions d'interface de contrôle **d'opérateur** sans identité d'appareil
- cela ne s'étend **pas** aux sessions d'interface de contrôle de rôle de nœud
- les proxys inversés de bouclage sur le même hôte ne satisfont toujours pas l'authentification par proxy de confiance ; voir [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth)

Voir [Tailscale](/en/gateway/tailscale) pour les conseils de configuration HTTPS.

## Construction de l'interface

Le Gateway sert des fichiers statiques à partir de `dist/control-ui`. Construisez-les avec :

```bash
pnpm ui:build # auto-installs UI deps on first run
```

Base absolue facultative (lorsque vous souhaitez des URL d'actifs fixes) :

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Pour le développement local (serveur de développement distinct) :

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

Pointez ensuite l'interface vers l'URL WS de votre Gateway (par ex. `ws://127.0.0.1:18789`).

## Débogage/tests : serveur de développement + Gateway distant

L'interface de contrôle se compose de fichiers statiques ; la cible WebSocket est configurable et peut être différente de l'origine HTTP. C'est pratique lorsque vous souhaitez le serveur de développement Vite localement mais que le Gateway s'exécute ailleurs.

1. Démarrez le serveur de développement de l'interface : `pnpm ui:dev`
2. Ouvrez une URL comme :

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

Authentification unique facultative (si nécessaire) :

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

Notes :

- `gatewayUrl` est stocké dans localStorage après le chargement et supprimé de l'URL.
- `token` doit être transmis via le fragment d'URL (`#token=...`) autant que possible. Les fragments ne sont pas envoyés au serveur, ce qui évite les fuites dans les journaux de requêtes et le Referer. Les anciens paramètres de requête `?token=` sont toujours importés une fois pour compatibilité, mais seulement en guise de solution de repli, et sont supprimés immédiatement après l'amorçage.
- `password` est conservé uniquement en mémoire.
- Lorsque `gatewayUrl` est défini, l'UI ne revient pas aux identifiants de configuration ou d'environnement.
  Fournissez `token` (ou `password`) explicitement. L'absence d'identifiants explicites constitue une erreur.
- Utilisez `wss://` lorsque le Gateway est derrière TLS (Tailscale Serve, proxy HTTPS, etc.).
- `gatewayUrl` n'est accepté que dans une fenêtre de premier niveau (non intégrée) pour prévenir le détournement de clic.
- Les déploiements de l'UI de contrôle non-boucle doivent définir `gateway.controlUi.allowedOrigins`
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

Détails de la configuration de l'accès à distance : [Accès à distance](/en/gateway/remote).

## Connexes

- [Tableau de bord](/en/web/dashboard) — tableau de bord de la passerelle
- [WebChat](/en/web/webchat) — interface de chat basée sur le navigateur
- [TUI](/en/web/tui) — interface utilisateur en terminal
- [Contrôles de santé](/en/gateway/health) — surveillance de santé de la passerelle
