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

Une fois approuvé, l'appareil est mémorisé et ne nécessitera pas de nouvelle approbation, à moins que
vous ne le révoquiez avec `openclaw devices revoke --device <id> --role <role>`. Voir
[Appareils CLI](/fr/cli/devices) pour la rotation et la révocation des jetons.

**Notes :**

- Les connexions de navigateur en boucle locale directe (`127.0.0.1` / `localhost`) sont
  approuvées automatiquement.
- Les connexions de navigateur via Tailnet et LAN nécessitent toujours une approbation explicite, même lorsqu'elles
  proviennent de la même machine.
- Chaque profil de navigateur génère un ID d'appareil unique, donc le changement de navigateur ou
  le nettoyage des données du navigateur nécessitera un nouvel appairage.

## Identité personnelle (locale au navigateur)

L'interface de contrôle prend en charge une identité personnelle par navigateur — un nom d'affichage et
un avatar qui sont attachés aux messages sortants pour l'attribution dans les sessions
partagées. Cette identité réside dans le stockage du navigateur, est limitée au profil du
navigateur actuel et ne quitte pas l'hôte de la passerelle, sauf si vous l'envoyez
explicitement avec une requête.

- L'identité est **uniquement locale au navigateur**. Elle n'est pas synchronisée avec d'autres appareils et ne fait
  pas partie du fichier de configuration de la passerelle.
- L'effacement des données du site ou le changement de navigateur réinitialise l'identité à vide ;
  l'interface de contrôle n'essaie pas d'en reconstruire une à partir de l'état du serveur.
- Rien concernant l'identité personnelle n'est persisté côté serveur au-delà des
  métadonnées normales d'auteur de transcription sur les messages que vous envoyez réellement.

## Point de terminaison de la configuration d'exécution

L'interface de contrôle récupère ses paramètres d'exécution à partir de
`/__openclaw/control-ui-config.json`. Ce point de terminaison est protégé par la même
authentification de passerelle que le reste de la surface HTTP : les navigateurs non authentifiés ne peuvent
pas le récupérer, et une récupération réussie nécessite soit un jeton/mot de passe de passerelle
déjà valide, une identité Tailscale Serve, ou une identité de proxy de confiance. Cela
empêche les indicateurs de fonctionnalités et les métadonnées de point de terminaison de l'interface de contrôle de fuiter vers des
scanneurs non authentifiés sur des hôtes partagés.

## Prise en charge des langues

L'interface de contrôle peut se localiser lors du premier chargement en fonction des paramètres régionaux de votre navigateur.
Pour le modifier ultérieurement, ouvrez **Overview -> Gateway Access -> Language**. Le
sélecteur de paramètres régionaux se trouve dans la carte Gateway Access, et non sous Apparence.

- Paramètres régionaux pris en charge : `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`, `th`
- Les traductions non anglaises sont chargées à la demande dans le navigateur.
- Les paramètres régionaux sélectionnés sont enregistrés dans le stockage du navigateur et réutilisés lors des prochaines visites.
- Les clés de traduction manquantes reviennent à l'anglais.

## Ce qu'il peut faire (à ce jour)

- Chatter avec le modèle via Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Diffuser les appels d'outils + les cartes de sortie d'outils en direct dans le Chat (événements de l'agent)
- Canaux : état des canaux intégrés ainsi que des plugins groupés/externes, connexion QR et configuration par canal (`channels.status`, `web.login.*`, `config.patch`)
- Instances : liste de présence + rafraîchissement (`system-presence`)
- Sessions : liste + substitutions par session de model/thinking/fast/verbose/trace/reasoning (`sessions.list`, `sessions.patch`)
- Dreams : statut de rêve, interrupteur activer/désactiver et lecteur de Dream Diary (`doctor.memory.status`, `doctor.memory.dreamDiary`, `config.patch`)
- Tâches Cron : liste/ajout/modification/exécution/activation/désactivation + historique d'exécution (`cron.*`)
- Skills : statut, activer/désactiver, installer, mises à jour des clés API (`skills.*`)
- Nœuds : liste + caps (`node.list`)
- Approbations d'exécution : modifier les listes d'autorisation de la passerelle ou des nœuds + demander la stratégie pour `exec host=gateway/node` (`exec.approvals.*`)
- Config : afficher/modifier `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Config : appliquer + redémarrer avec validation (`config.apply`) et réveiller la dernière session active
- Les écritures de configuration incluent une protection de base de hachage pour éviter d'écraser les modifications simultanées
- Les écritures de configuration (`config.set`/`config.apply`/`config.patch`) effectuent également une vérification préliminaire de la résolution active des SecretRef pour les références dans la charge utile de configuration soumise ; les références actives soumises non résolues sont rejetées avant l'écriture
- Schéma de configuration + rendu de formulaire (`config.schema` / `config.schema.lookup`,
  y compris les champs `title` / `description`, les indices d'interface utilisateur correspondants, les résumés des enfants immédiats,
  les métadonnées de documentation sur les nœuds d'objet/wildcard/tableau/composition imbriqués,
  ainsi que les schémas de plugin + channel lorsque disponibles) ; L'éditeur JSON brut n'est
  disponible que lorsque l'instantané prend en charge un aller-retour brut sécurisé
- Si un instantané ne peut pas effectuer un aller-retour de texte brut en toute sécurité, l'interface de contrôle force le mode Formulaire et désactive le mode Brut pour cet instantané
- L'éditeur JSON brut "Réinitialiser à la version enregistrée" préserve la forme brute originale (mise en forme, commentaires, mise en page `$include`) au lieu de restituer un instantané aplati, ainsi les modifications externes survivent à une réinitialisation lorsque l'instantané peut effectuer un aller-retour brut en toute sécurité
- Les valeurs d'objet SecretRef structurées sont affichées en lecture seule dans les champs de texte du formulaire pour éviter une corruption accidentelle d'objet en chaîne
- Débogage : instantanés status/health/models + journal d'événements + appels RPC manuels (`status`, `health`, `models.list`)
- Journaux : suivi en temps réel des journaux de fichiers de la passerelle avec filtrage/exportation (`logs.tail`)
- Mise à jour : exécuter une mise à jour de paquet/git + redémarrage (`update.run`) avec un rapport de redémarrage

Remarques sur le panneau des tâches planifiées (Cron) :

- Pour les tâches isolées, la remise par défaut consiste à annoncer un résumé. Vous pouvez passer à aucun si vous souhaitez des exécutions uniquement internes.
- Les champs channel/cible apparaissent lorsque l'annonce est sélectionnée.
- Le mode Webhook utilise `delivery.mode = "webhook"` avec `delivery.to` défini sur une URL de webhook HTTP(S) valide.
- Pour les tâches de session principale, les modes de remise webhook et aucun sont disponibles.
- Les contrôles d'édition avancés incluent la suppression après exécution, l'annulation de la priorité de l'agent, les options exactes/échelonnées du cron,
  les priorités de modèle/réflexion de l'agent, et les bascules de remise au mieux effort.
- La validation du formulaire est en ligne avec des erreurs au niveau du champ ; les valeurs invalides désactivent le bouton de sauvegarde jusqu'à ce qu'elles soient corrigées.
- Définissez `cron.webhookToken` pour envoyer un jeton de porteur dédié, si omis le webhook est envoyé sans en-tête d'authentification.
- Solution de repli obsolète : les tâches héritées stockées avec `notify: true` peuvent toujours utiliser `cron.webhook` jusqu'à leur migration.

## Comportement du chat

- `chat.send` est **non bloquant** : il accuse immédiatement réception avec `{ runId, status: "started" }` et la réponse diffuse via des événements `chat`.
- Le renvoi avec le même `idempotencyKey` renvoie `{ status: "in_flight" }` pendant l'exécution, et `{ status: "ok" }` après achèvement.
- Les réponses `chat.history` sont limitées en taille pour la sécurité de l'interface. Lorsque les entrées de transcription sont trop volumineuses, Gateway peut tronquer les champs de texte longs, omettre les blocs de métadonnées lourds et remplacer les messages trop volumineux par un espace réservé (`[chat.history omitted: message too large]`).
- `chat.history` supprime également les balises de directive en ligne affichage uniquement du texte visible de l'assistant (par exemple `[[reply_to_*]]` et `[[audio_as_voice]]`), les payloads XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` et les blocs d'appel d'outil tronqués), et les jetons de contrôle de model ASCII/full-width fuités, et omet les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact `NO_REPLY` / `no_reply`.
- `chat.inject` ajoute une note d'assistant à la transcription de session et diffuse un événement `chat` pour les mises à jour uniquement de l'interface (pas d'exécution d'agent, pas de livraison channel).
- Les sélecteurs de model et de réflexion de l'en-tête de chat corrigent la session active immédiatement via `sessions.patch` ; ce sont des remplacements persistants de session, et non des options d'envoi pour un seul tour.
- Arrêter :
  - Cliquez sur **Stop** (appelle `chat.abort`)
  - Tapez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) pour abandonner hors bande
  - `chat.abort` prend en charge `{ sessionKey }` (sans `runId`) pour abandonner toutes les exécutions actives pour cette session
- Conservation partielle lors de l'abandon :
  - Lorsqu'une exécution est abandonnée, le texte partiel de l'assistant peut toujours être affiché dans l'interface
  - Le Gateway persiste le texte partiel avorté de l'assistant dans l'historique des transcriptions lorsqu'une sortie tamponnée existe
  - Les entrées persistées incluent des métadonnées d'avortement afin que les consommateurs de transcriptions puissent distinguer les partiels avortés des sorties de complétion normales

## Intégrations hébergées

Les messages de l'assistant peuvent afficher du contenu Web hébergé en ligne avec le code court `[embed ...]`.
La stratégie de bac à sable iframe est contrôlée par
`gateway.controlUi.embedSandbox` :

- `strict` : désactive l'exécution de scripts à l'intérieur des intégrations hébergées
- `scripts` : permet des intégrations interactives tout en maintenant l'isolement d'origine ; c'est
  la valeur par défaut et c'est généralement suffisant pour les jeux/widgets de navigateur autonomes
- `trusted` : ajoute `allow-same-origin` par dessus `allow-scripts` pour les documents
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
Pour la plupart des jeux et toiles interactifs générés par des agents, `scripts` est
le choix le plus sûr.

Les URL d'intégration externes absolues `http(s)` restent bloquées par défaut. Si vous
souhaitez intentionnellement que `[embed url="https://..."]` charge des pages tiers, définissez
`gateway.controlUi.allowExternalEmbedUrls: true`.

## Accès Tailnet (recommandé)

### Tailscale Serve intégré (préféré)

Gardez le Gateway sur le bouclage local (loopback) et laissez Tailscale Serve le proxyfier avec HTTPS :

```bash
openclaw gateway --tailscale serve
```

Ouvrir :

- `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

Par défaut, les requêtes Control UI/WebSocket Serve peuvent s'authentifier via les en-têtes d'identité Tailscale
(`tailscale-user-login`) lorsque `gateway.auth.allowTailscale` est `true`. OpenClaw
vérifie l'identité en résolvant l'adresse `x-forwarded-for` avec
`tailscale whois` et en la faisant correspondre à l'en-tête, et n'accepte ceux-ci que lorsque la
requête atteint le bouclage local (loopback) avec les en-têtes `x-forwarded-*` de Tailscale. Définissez
`gateway.auth.allowTailscale: false` si vous souhaitez exiger des identifiants de secret partagé explicites
même pour le trafic Serve. Utilisez ensuite `gateway.auth.mode: "token"` ou
`"password"`.
Pour ce chemin d'identité Serve asynchrone, les tentatives d'authentification échouées pour la même adresse IP client
et le même portée d'authentification sont sérialisées avant les écritures de limitation de taux. Les mauvaises tentatives simultanées
du même navigateur peuvent donc afficher `retry later` sur la deuxième requête
au lieu de deux simples inadéquations en parallèle.
L'authentification Serve sans jeton suppose que l'hôte de la passerelle est de confiance. Si du code local
non fiable peut s'exécuter sur cet hôte, exigez une authentification par jeton/mot de passe.

### Lier au tailnet + jeton

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
- authentification réussie de l'opérateur Control UI via `gateway.auth.mode: "trusted-proxy"`
- `gateway.controlUi.dangerouslyDisableDeviceAuth=true` break-glass

**Solution recommandée :** utilisez HTTPS (Tailscale Serve) ou ouvrez l'interface utilisateur localement :

- `https://<magicdns>/` (Serve)
- `http://127.0.0.1:18789/` (sur l'hôte de la passerelle)

**Comportement du basculement d'authentification non sécurisée :**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` est un basculement de compatibilité local uniquement :

- Elle permet aux sessions localhost de l'interface de contrôle de procéder sans identité d'appareil dans
  des contextes HTTP non sécurisés.
- Elle ne contourne pas les vérifications d'appariement.
- Elle ne desserre pas les exigences d'identité d'appareil distantes (non-localhost).

**Uniquement en cas de rupture de verre :**

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
régression de sécurité grave. Rétablissez rapidement après une utilisation d'urgence.

Remarque sur le proxy de confiance :

- une authentification proxy de confiance réussie peut admettre des sessions de l'interface de contrôle **d'opérateur** sans
  identité d'appareil
- cela ne s'étend **pas** aux sessions de l'interface de contrôle avec un rôle de nœud
- les proxies inversés de bouclage sur le même hôte ne satisfont toujours pas l'authentification proxy de confiance ; voir
  [Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth)

Consultez [Tailscale](/fr/gateway/tailscale) pour obtenir des conseils sur la configuration HTTPS.

## Politique de sécurité de contenu

L'interface de contrôle est fournie avec une politique `img-src` stricte : seuls les ressources **de même origine** et les URLs `data:` sont autorisées. Les `http(s)` distantes et les URLs d'images relatives au protocole sont rejetées par le navigateur et n'émettent pas de requêtes réseau.

Ce que cela signifie en pratique :

- Les avatars et les images servis sous des chemins relatifs (par exemple `/avatars/<id>`) s'affichent toujours.
- Les URLs `data:image/...` en ligne s'affichent toujours (utile pour les charges utiles intra-protocole).
- Les URL d'avatars distants émises par les métadonnées du channel sont supprimées au niveau des assistants d'avatar de l'interface de contrôle et remplacées par le logo/insigne intégré, de sorte qu'un channel compromis ou malveillant ne peut pas forcer des récupérations d'images distantes arbitraires à partir du navigateur d'un opérateur.

Vous n'avez rien à modifier pour obtenir ce comportement — il est toujours activé et non configurable.

## Authentification de la route avatar

Lorsque l'authentification de la passerelle est configurée, le point de terminaison avatar de l'interface de contrôle nécessite le même jeton de passerelle que le reste de l'API :

- `GET /avatar/<agentId>` renvoie l'image de l'avatar uniquement aux appelants authentifiés. `GET /avatar/<agentId>?meta=1` renvoie les métadonnées de l'avatar sous la même règle.
- Les requêtes non authentifiées vers l'une ou l'autre de ces routes sont rejetées (correspondant à la route sœur assistant-media). Cela empêche la route avatar de divulguer l'identité de l'agent sur les hôtes qui sont autrement protégés.
- L'interface de contrôle transmet elle-même le jeton du passerelle (gateway token) en tant qu'en-tête Bearer lors de la récupération des avatars, et utilise des URL d'objets authentifiées afin que l'image s'affiche toujours dans les tableaux de bord.

Si vous désactivez l'authentification de la passerelle (non recommandé sur les hôtes partagés), la route des avatars devient également non authentifiée, conformément au reste de la passerelle.

## Construction de l'interface utilisateur

La Gateway sert des fichiers statiques à partir de `dist/control-ui`. Pour les construire, utilisez :

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

Ensuite, pointez l'interface utilisateur vers votre URL WS de Gateway (par ex. `ws://127.0.0.1:18789`).

## Débogage/tests : serveur de développement + Gateway distant

L'interface de contrôle se compose de fichiers statiques ; la cible WebSocket est configurable et peut être différente de l'origine HTTP. C'est pratique lorsque vous souhaitez le serveur de développement Vite localement mais que la Gateway s'exécute ailleurs.

1. Démarrez le serveur de développement de l'interface utilisateur : `pnpm ui:dev`
2. Ouvrez une URL telle que :

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

Authentification unique facultative (si nécessaire) :

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

Notes :

- `gatewayUrl` est stocké dans le localStorage après le chargement et retiré de l'URL.
- `token` doit être transmis via le fragment d'URL (`#token=...`) autant que possible. Les fragments ne sont pas envoyés au serveur, ce qui évite les fuites dans les journaux de requêtes et l'en-tête Referer. Les anciens paramètres de requête `?token=` sont toujours importés une fois pour compatibilité, mais uniquement en solution de repli, et sont supprimés immédiatement après l'amorçage.
- `password` est conservé uniquement en mémoire.
- Lorsque `gatewayUrl` est défini, l'interface utilisateur ne revient pas aux identifiants de configuration ou d'environnement.
  Fournissez `token` (ou `password`) explicitement. L'absence d'identifiants explicites constitue une erreur.
- Utilisez `wss://` lorsque la Gateway est derrière TLS (Tailscale Serve, proxy HTTPS, etc.).
- `gatewayUrl` n'est accepté que dans une fenêtre de niveau supérieur (non intégrée) pour empêcher le détournement de clic (clickjacking).
- Les déploiements de l'interface de contrôle non en boucle locale doivent définir `gateway.controlUi.allowedOrigins`
  explicitement (origines complètes). Cela inclut les configurations de développement distant.
- N'utilisez pas `gateway.controlUi.allowedOrigins: ["*"]` sauf pour des tests locaux
  strictement contrôlés. Cela signifie autoriser n'importe quelle origine de navigateur, et non « correspondre à l'hôte que j'utilise ».
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active
  le mode de repli d'origine de l'en-tête Host, mais il s'agit d'un mode de sécurité dangereux.

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

Détails de la configuration de l'accès distant : [Accès distant](/fr/gateway/remote).

## Connexes

- [Tableau de bord](/fr/web/dashboard) — tableau de bord de la passerelle
- [WebChat](/fr/web/webchat) — interface de chat basée sur le navigateur
- [TUI](/fr/web/tui) — interface utilisateur en ligne de commande
- [Contrôles de santé](/fr/gateway/health) — surveillance de la santé de la passerelle
