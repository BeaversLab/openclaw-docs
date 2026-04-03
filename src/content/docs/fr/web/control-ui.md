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
  Le panneau des paramètres du tableau de bord conserve un jeton pour l'onglet de navigateur actuel et l'URL de la passerelle sélectionnée ; les mots de passe ne sont pas persistants.
  L'onboarding génère par défaut un jeton de passerelle, collez-le donc ici lors de la première connexion.

## Appareillage des périphériques (première connexion)

Lorsque vous vous connectez au Control UI depuis un nouveau navigateur ou périphérique, le Gateway
requiert une **approbation d'appariement unique** — même si vous êtes sur le même Tailnet
avec `gateway.auth.allowTailscale: true`. Il s'agit d'une mesure de sécurité pour empêcher
l'accès non autorisé.

**Ce que vous verrez :** « déconnecté (1008) : appariement requis »

**Pour approuver le périphérique :**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

Si le navigateur tente de nouveau d'appairer avec des détails d'authentification modifiés (rôle/portées/clé
publique), la demande en attente précédente est remplacée et un nouveau `requestId` est
créé. Réexécutez `openclaw devices list` avant l'approbation.

Une fois approuvé, l'appareil est mémorisé et ne nécessitera pas de nouvelle approbation, sauf si vous le révoquez avec `openclaw devices revoke --device <id> --role <role>`. Voir [Appareils CLI](/en/cli/devices) pour la rotation et la révocation de jetons.

**Notes :**

- Les connexions locales (`127.0.0.1`) sont automatiquement approuvées.
- Les connexions à distance (LAN, Tailnet, etc.) nécessitent une approbation explicite.
- Chaque profil de navigateur génère un identifiant d'appareil unique, donc changer de navigateur ou
  effacer les données du navigateur nécessitera un nouvel appairage.

## Prise en charge des langues

L'interface de contrôle peut se localiser lors du premier chargement en fonction des paramètres régionaux de votre navigateur, et vous pouvez la modifier ultérieurement à partir du sélecteur de langue dans la carte Accès.

- Paramètres régionaux pris en charge : `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`
- Les traductions non anglaises sont chargées à la demande dans le navigateur.
- Les paramètres régionaux sélectionnés sont enregistrés dans le stockage du navigateur et réutilisés lors des prochaines visites.
- Les clés de traduction manquantes reviennent à l'anglais.

## Ce qu'il peut faire (à ce jour)

- Chatter avec le modèle via Gateway WS (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Flux d'appels d'outils + cartes de sortie d'outils en direct dans le Chat (événements d'agent)
- Canaux : WhatsApp/Telegram/Discord/Slack + statut des canaux de plugins (Mattermost, etc.) + connexion QR + configuration par canal (`channels.status`, `web.login.*`, `config.patch`)
- Instances : liste de présence + actualisation (`system-presence`)
- Sessions : liste + substitutions de réflexion/rapide/verbeux/raisonnement par session (`sessions.list`, `sessions.patch`)
- Tâches Cron : liste/ajout/modification/exécution/activation/désactivation + historique d'exécution (`cron.*`)
- Compétences : statut, activer/désactiver, installer, mises à jour de la clé API (`skills.*`)
- Nœuds : liste + capacités (`node.list`)
- Approbations d'exécution : modifier les listes d'autorisation de la passerelle ou des nœuds + demander la stratégie pour `exec host=gateway/node` (`exec.approvals.*`)
- Configuration : afficher/modifier `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Configuration : appliquer + redémarrer avec validation (`config.apply`) et réveiller la dernière session active
- Les écritures de configuration incluent une protection par hachage de base pour éviter d'écraser les modifications simultanées
- Les écritures de configuration (`config.set`/`config.apply`/`config.patch`) effectuent également une vérification préalable de la résolution active des SecretRef pour les références dans la charge utile de configuration soumise ; les références actives soumises non résolues sont rejetées avant l'écriture
- Schéma de configuration + rendu de formulaire (`config.schema`, y compris les schémas de plugin et de channel) ; L'éditeur JSON brut n'est disponible que lorsque l'instantané prend en charge un aller-retour brut sécurisé
- Si un instantané ne peut pas effectuer un aller-retour sécurisé du texte brut, l'interface de contrôle UI force le mode Formulaire et désactive le mode Brut pour cet instantané
- Les valeurs d'objets SecretRef structurés sont affichées en lecture seule dans les champs de saisie de texte du formulaire pour éviter une corruption accidentelle d'objet en chaîne
- Débogage : instantanés d'état/santé/modèles + journal d'événements + appels RPC manuels (`status`, `health`, `models.list`)
- Journaux : suivi en direct des journaux de fichiers de la passerelle avec filtre/exportation (`logs.tail`)
- Mise à jour : exécuter une mise à jour de paquet/git + redémarrage (`update.run`) avec un rapport de redémarrage

Notes du panneau des tâches Cron :

- Pour les tâches isolées, la remise par défaut consiste à annoncer un résumé. Vous pouvez passer à none si vous souhaitez des exécutions uniquement internes.
- Les champs channel/cible apparaissent lorsque announce est sélectionné.
- Le mode Webhook utilise `delivery.mode = "webhook"` avec `delivery.to` défini sur une URL de webhook HTTP(S) valide.
- Pour les tâches de session principale, les modes de remise webhook et none sont disponibles.
- Les contrôles d'édition avancés incluent la suppression après exécution, l'effacement du remplacement de l'agent, les options exactes/échelonnées de cron, les remplacements de modèle/réflexion de l'agent et les basculements de remise au mieux effort.
- La validation du formulaire est en ligne avec des erreurs au niveau du champ ; les valeurs invalides désactivent le bouton de sauvegarde jusqu'à ce qu'elles soient corrigées.
- Définissez `cron.webhookToken` pour envoyer un jeton porteur dédié ; s'il est omis, le webhook est envoyé sans en-tête d'authentification.
- Contingence obsolète : les tâches héritées stockées avec `notify: true` peuvent toujours utiliser `cron.webhook` jusqu'à leur migration.

## Comportement du chat

- `chat.send` est **non bloquant** : il acquitte immédiatement avec `{ runId, status: "started" }` et la réponse diffuse via des événements `chat`.
- Le renvoi avec le même `idempotencyKey` renvoie `{ status: "in_flight" }` pendant l'exécution, et `{ status: "ok" }` après l'achèvement.
- Les réponses `chat.history` sont limitées en taille pour la sécurité de l'interface utilisateur. Lorsque les entrées de transcription sont trop volumineuses, Gateway peut tronquer les champs de texte longs, omettre les blocs de métadonnées lourds et remplacer les messages trop volumineux par un espace réservé (`[chat.history omitted: message too large]`).
- `chat.inject` ajoute une note d'assistant à la transcription de session et diffuse un événement `chat` pour les mises à jour UI uniquement (pas d'exécution d'agent, pas de remise sur le channel).
- Arrêter :
  - Cliquez sur **Stop** (appelle `chat.abort`)
  - Tapez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) pour abandonner hors bande
  - `chat.abort` prend en charge `{ sessionKey }` (pas de `runId`) pour abandonner toutes les exécutions actives pour cette session
- Conservation partielle en cas d'abandon :
  - Lorsqu'une exécution est abandonnée, le texte partiel de l'assistant peut toujours être affiché dans l'interface utilisateur
  - Gateway conserve le texte partiel de l'assistant abandonné dans l'historique de la transcription lorsqu'une sortie tamponnée existe
  - Les entrées conservées incluent des métadonnées d'abonnement afin que les consommateurs de transcription puissent distinguer les partiels d'abandon de la sortie d'achèvement normal

## Accès Tailnet (recommandé)

### Tailscale Serve intégré (préféré)

Garder le Gateway en boucle locale et laisser Tailscale Serve le proxy avec HTTPS :

```bash
openclaw gateway --tailscale serve
```

Ouvrir :

- `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

Par défaut, les requêtes Control UI/WebSocket Serve peuvent s'authentifier via les en-têtes d'identité Tailscale
(`tailscale-user-login`) lorsque `gateway.auth.allowTailscale` est `true`. OpenClaw
vérifie l'identité en résolvant l'adresse `x-forwarded-for` avec
`tailscale whois` et en la correspondant à l'en-tête, et n'accepte ceux-ci que lorsque la
requête atteint le bouclage local avec les en-têtes `x-forwarded-*` de Tailscale. Définissez
`gateway.auth.allowTailscale: false` (ou forcez `gateway.auth.mode: "password"`)
si vous souhaitez exiger un jeton/mot de passe même pour le trafic Serve.
L'authentification Serve sans jeton suppose que l'hôte de la passerelle est fiable. Si du code local
non fiable peut s'exécuter sur cet hôte, exigez une authentification par jeton/mot de passe.

### Liaison au tailnet + jeton

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

Ensuite, ouvrez :

- `http://<tailscale-ip>:18789/` (ou votre `gateway.controlUi.basePath` configuré)

Collez le jeton dans les paramètres de l'interface utilisateur (envoyé en tant que `connect.params.auth.token`).

## HTTP non sécurisé

Si vous ouvrez le tableau de bord via HTTP simple (`http://<lan-ip>` ou `http://<tailscale-ip>`),
le navigateur s'exécute dans un **contexte non sécurisé** et bloque WebCrypto. Par défaut,
OpenClaw **bloque** les connexions Control UI sans identité d'appareil.

**Correction recommandée :** utilisez HTTPS (Tailscale Serve) ou ouvrez l'interface utilisateur localement :

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

`allowInsecureAuth` est un interrupteur de compatibilité locale uniquement :

- Il permet aux sessions Control UI localhost de procéder sans identité d'appareil dans
  des contextes HTTP non sécurisés.
- Il ne contourne pas les vérifications d'appairage.
- Il n'assouplit pas les exigences d'identité d'appareil distantes (non localhost).

**Uniquement en cas de cassure de glace :**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` désactive les vérifications d'identité d'appareil de Control UI et constitue une
rétrogradation sévère de la sécurité. Revenez rapidement après une utilisation d'urgence.

Voir [Tailscale](/en/gateway/tailscale) pour les conseils de configuration HTTPS.

## Construction de l'interface utilisateur

La Gateway sert des fichiers statiques depuis `dist/control-ui`. Construisez-les avec :

```bash
pnpm ui:build # auto-installs UI deps on first run
```

Base absolue facultative (lorsque vous souhaitez des URL d'actifs fixes) :

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Pour le développement local (serveur de dev distinct) :

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

Pointez ensuite l'interface utilisateur vers votre URL WS de la Gateway (par ex. `ws://127.0.0.1:18789`).

## Débogage/tests : serveur de développement + Gateway distant

L'interface de contrôle se compose de fichiers statiques ; la cible WebSocket est configurable et peut être différente de l'origine HTTP. C'est pratique lorsque vous souhaitez utiliser le serveur de développement Vite localement mais que le Gateway s'exécute ailleurs.

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

- `gatewayUrl` est stocké dans localStorage après le chargement et supprimé de l'URL.
- Le `token` doit être transmis via le fragment d'URL (`#token=...`) autant que possible. Les fragments ne sont pas envoyés au serveur, ce qui évite les fuites dans les journaux de requêtes et l'en-tête Referer. Les anciens paramètres de requête `?token=` sont toujours importés une fois pour compatibilité, mais uniquement en solution de repli, et sont supprimés immédiatement après l'amorçage.
- Le `password` est conservé uniquement en mémoire.
- Lorsque `gatewayUrl` est défini, l'interface ne revient pas aux identifiants de configuration ou d'environnement.
  Fournissez `token` (ou `password`) explicitement. L'absence d'identifiants explicites constitue une erreur.
- Utilisez `wss://` lorsque le Gateway est derrière TLS (Tailscale Serve, proxy HTTPS, etc.).
- Le `gatewayUrl` n'est accepté que dans une fenêtre de premier niveau (non intégrée) pour prévenir les attaques par clickjacking.
- Les déploiements de l'interface de contrôle non loopback doivent définir `gateway.controlUi.allowedOrigins`
  explicitement (origines complètes). Cela inclut les configurations de développement à distance.
- N'utilisez pas `gateway.controlUi.allowedOrigins: ["*"]` sauf pour des tests locaux
  étroitement contrôlés. Cela signifie autoriser n'importe quelle origine de navigateur, et non « correspondre à l'hôte que j'utilise ».
- Le `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active
  le mode de repli d'origine basé sur l'en-tête Host, mais il s'agit d'un mode de sécurité dangereux.

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

Détails de la configuration de l'accès à distance : [Accès distant](/en/gateway/remote).

## Connexes

- [Tableau de bord](/en/web/dashboard) — tableau de bord de la passerelle
- [WebChat](/en/web/webchat) — interface de chat basée sur le navigateur
- [TUI](/en/web/tui) — interface utilisateur en terminal
- [Vérifications de santé](/en/gateway/health) — surveillance de santé de la passerelle
