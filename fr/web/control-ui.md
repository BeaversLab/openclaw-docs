---
summary: "Interface utilisateur de contrôle basée sur le navigateur pour le Gateway (chat, nœuds, config)"
read_when:
  - Vous souhaitez utiliser le Gateway depuis un navigateur
  - Vous souhaitez un accès Tailnet sans tunnels SSH
title: "Interface utilisateur de contrôle"
---

# Interface utilisateur de contrôle (navigateur)

L'interface utilisateur de contrôle est une petite application monopage **Vite + Lit** servie par le Gateway :

- default: `http://<host>:18789/`
- optional prefix: set `gateway.controlUi.basePath` (e.g. `/openclaw`)

Elle communique **directement avec le WebSocket du Gateway** sur le même port.

## Ouverture rapide (local)

Si le Gateway est exécuté sur le même ordinateur, ouvrez :

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/) (ou [http://localhost:18789/](http://localhost:18789/))

Si la page échoue à charger, démarrez d'abord le Gateway : `openclaw gateway`.

L'authentification est fournie lors de la négociation WebSocket via :

- `connect.params.auth.token`
- `connect.params.auth.password`
  Le panneau des paramètres du tableau de bord conserve un jeton pour la session de l'onglet actuel du navigateur et l'URL de la passerelle sélectionnée ; les mots de passe ne sont pas persistants.
  L'intégration génère un jeton de passerelle par défaut, collez-le donc ici lors de la première connexion.

## Jumelage d'appareils (première connexion)

Lorsque vous vous connectez à l'interface utilisateur de contrôle depuis un nouveau navigateur ou appareil, le Gateway
nécessite une **approbation de jumelage unique** — même si vous êtes sur le même Tailnet
avec `gateway.auth.allowTailscale: true`. Il s'agit d'une mesure de sécurité pour empêcher
l'accès non autorisé.

**Ce que vous verrez :** "disconnected (1008): pairing required"

**Pour approuver l'appareil :**

```bash
# List pending requests
openclaw devices list

# Approve by request ID
openclaw devices approve <requestId>
```

Une fois approuvé, l'appareil est mémorisé et ne nécessitera pas de réapprobation à moins
que vous ne le révoquiez avec `openclaw devices revoke --device <id> --role <role>`. Voir
[Appareils CLI](/fr/cli/devices) pour la rotation et la révocation des jetons.

**Notes :**

- Les connexions locales (`127.0.0.1`) sont auto-approuvées.
- Les connexions distantes (LAN, Tailnet, etc.) nécessitent une approbation explicite.
- Chaque profil de navigateur génère un identifiant d'appareil unique, donc changer de navigateur ou
  effacer les données du navigateur nécessitera un nouveau jumelage.

## Support linguistique

L'interface utilisateur de contrôle peut se localiser automatiquement au premier chargement en fonction de la langue de votre navigateur, et vous pouvez la modifier ultérieurement via le sélecteur de langue dans la carte Accès.

- Paramètres régionaux pris en charge : `en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`
- Les traductions non anglaises sont chargées à la demande dans le navigateur.
- Les paramètres régionaux sélectionnés sont enregistrés dans le stockage du navigateur et réutilisés lors des prochaines visites.
- Les clés de traduction manquantes reviennent à l'anglais.

## Ce qu'il peut faire (à ce jour)

- Discuter avec le model via le WS du Gateway (`chat.history`, `chat.send`, `chat.abort`, `chat.inject`)
- Diffuser les appels d'outil + les cartes de sortie d'outil en direct dans le Chat (événements d'agent)
- Canaux : WhatsApp/Telegram/Discord/Slack + statut des canaux de plug-in (Mattermost, etc.) + connexion QR + configuration par canal (`channels.status`, `web.login.*`, `config.patch`)
- Instances : liste de présence + actualisation (`system-presence`)
- Sessions : liste + remplacements par session pour thinking/fast/verbose/reasoning (`sessions.list`, `sessions.patch`)
- Tâches cron : liste/ajout/modification/exécution/activation/désactivation + historique d'exécution (`cron.*`)
- Skills : statut, activation/désactivation, installation, mises à jour de clé API (`skills.*`)
- Nœuds : liste + caps (`node.list`)
- Approbations d'exécution : modifier les listes d'autorisation de la passerelle ou des nœuds + demander la stratégie pour `exec host=gateway/node` (`exec.approvals.*`)
- Configuration : afficher/modifier `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- Configuration : appliquer + redémarrer avec validation (`config.apply`) et réveiller la dernière session active
- Les écritures de configuration incluent une protection de base de hachage pour éviter d'écraser les modifications simultanées
- Schéma de configuration + rendu de formulaire (`config.schema`, y compris les schémas de plug-in + de canal) ; l'éditeur JSON brut reste disponible
- Débogage : instantanés status/health/models + journal des événements + appels RPC manuels (`status`, `health`, `models.list`)
- Journaux : suivi en direct des journaux de fichiers de la passerelle avec filtre/exportation (`logs.tail`)
- Update: exécuter une mise à jour de package/git + redémarrage (`update.run`) avec un rapport de redémarrage

Notes du panneau des tâches Cron :

- Pour les tâches isolées, la livraison est réglée par défaut sur annonce du résumé. Vous pouvez passer sur aucun si vous souhaitez des exécutions internes uniquement.
- Les champs de channel/cible apparaissent lorsque l'annonce est sélectionnée.
- Le mode Webhook utilise `delivery.mode = "webhook"` avec `delivery.to` défini sur une URL de webhook HTTP(S) valide.
- Pour les tâches de session principale, les modes de livraison webhook et aucun sont disponibles.
- Les contrôles d'édition avancés incluent la suppression après exécution, l'annulation de la substitution de l'agent, les options exactes/échelonnées du cron, les substitutions de model/réflexion de l'agent, et les bascules de livraison au meilleur effort.
- La validation du formulaire est en ligne avec des erreurs au niveau du champ ; les valeurs invalides désactivent le bouton de sauvegarde jusqu'à correction.
- Définissez `cron.webhookToken` pour envoyer un jeton bearer dédié ; s'il est omis, le webhook est envoyé sans en-tête d'authentification.
- Solution de repli obsolète : les tâches héritées stockées avec `notify: true` peuvent encore utiliser `cron.webhook` jusqu'à la migration.

## Comportement du chat

- `chat.send` est **non bloquant** : il acquitte immédiatement avec `{ runId, status: "started" }` et la réponse diffuse via des événements `chat`.
- Le renvoi avec le même `idempotencyKey` renvoie `{ status: "in_flight" }` pendant l'exécution, et `{ status: "ok" }` après l'achèvement.
- Les réponses `chat.history` sont limitées en taille pour la sécurité de l'interface. Lorsque les entrées de transcription sont trop grandes, le Gateway peut tronquer les longs champs de texte, omettre les blocs de métadonnées lourds, et remplacer les messages trop volumineux par un espace réservé (`[chat.history omitted: message too large]`).
- `chat.inject` ajoute une note d'assistant à la transcription de la session et diffuse un événement `chat` pour les mises à jour d'interface uniquement (pas d'exécution d'agent, pas de livraison sur le channel).
- Arrêt :
  - Cliquez sur **Stop** (appelle `chat.abort`)
  - Tapez `/stop` (ou des phrases d'abandon autonomes comme `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`) pour abandonner hors bande
  - `chat.abort` prend en charge `{ sessionKey }` (pas de `runId`) pour annuler toutes les exécutions actives de cette session
- Conservation partielle en cas d'abandon :
  - Lorsqu'une exécution est abandonnée, le texte partiel de l'assistant peut toujours être affiché dans l'interface utilisateur
  - Gateway conserve le texte partiel de l'assistant abandonné dans l'historique des transcriptions lorsqu'une sortie tamponnée existe
  - Les entrées conservées incluent des métadonnées d'abandon afin que les consommateurs de transcriptions puissent distinguer les partiels abandonnés de la sortie de complétion normale

## Accès Tailnet (recommandé)

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
`tailscale whois` et en la faisant correspondre à l'en-tête, et n'accepte ceux-ci que lorsque la
requête atteint la boucle locale avec les en-têtes `x-forwarded-*` de Tailscale. Définissez
`gateway.auth.allowTailscale: false` (ou forcez `gateway.auth.mode: "password"`)
si vous souhaitez exiger un jeton/mot de passe même pour le trafic Serve.
L'authentification Serve sans jeton suppose que l'hôte de la passerelle est approuvé. Si du code local non approuvé
peut s'exécuter sur cet hôte, exigez une authentification par jeton/mot de passe.

### Lier au tailnet + jeton

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

Puis ouvrez :

- `http://<tailscale-ip>:18789/` (ou votre `gateway.controlUi.basePath` configuré)

Collez le jeton dans les paramètres de l'interface utilisateur (envoyé en tant que `connect.params.auth.token`).

## HTTP non sécurisé

Si vous ouvrez le tableau de bord en HTTP simple (`http://<lan-ip>` ou `http://<tailscale-ip>`),
le navigateur fonctionne dans un **contexte non sécurisé** et bloque WebCrypto. Par défaut,
OpenClaw **bloque** les connexions Control UI sans identité d'appareil.

**Solution recommandée :** utilisez HTTPS (Tailscale Serve) ou ouvrez l'interface utilisateur localement :

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

`allowInsecureAuth` est uniquement un commutateur de compatibilité locale :

- Il permet aux sessions de l'interface de contrôle localhost de se poursuivre sans identité d'appareil dans des contextes HTTP non sécurisés.
- Il ne contourne pas les vérifications de couplage.
- Il ne relâche pas les exigences d'identité d'appareil distantes (non localhost).

**En cas d'urgence uniquement :**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` désactive les vérifications d'identité d'appareil de l'interface de contrôle et constitue une grave réduction de la sécurité. Rétablissez-la rapidement après une utilisation d'urgence.

Voir Tailscale (/en/gateway/tailscale) pour les conseils de configuration HTTPS.

## Construction de l'interface utilisateur

Le Gateway sert des fichiers statiques depuis `dist/control-ui`. Construisez-les avec :

```bash
pnpm ui:build # auto-installs UI deps on first run
```

Base absolue facultative (lorsque vous voulez des URL d'éléments fixes) :

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

Pour le développement local (serveur de dev séparé) :

```bash
pnpm ui:dev # auto-installs UI deps on first run
```

Pointez ensuite l'interface utilisateur vers l'URL WS de votre Gateway (p. ex. `ws://127.0.0.1:18789`).

## Débogage/tests : serveur de dev + Gateway distant

L'interface de contrôle est constituée de fichiers statiques ; la cible WebSocket est configurable et peut être différente de l'origine HTTP. C'est pratique lorsque vous voulez le serveur de dev Vite localement mais que le Gateway s'exécute ailleurs.

1. Démarrez le serveur de dev de l'interface : `pnpm ui:dev`
2. Ouvrez une URL comme :

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

Authentification unique facultative (si nécessaire) :

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

Remarques :

- `gatewayUrl` est stocké dans localStorage après le chargement et retiré de l'URL.
- `token` doit être transmis via le fragment d'URL (`#token=...`) autant que possible. Les fragments ne sont pas envoyés au serveur, ce qui évite les fuites de journaux de requête et d'en-têtes Referer. Les anciens paramètres de requête `?token=` sont toujours importés une fois pour compatibilité, mais uniquement en repli, et sont supprimés immédiatement après l'amorçage.
- `password` n'est conservé qu'en mémoire.
- Lorsque `gatewayUrl` est défini, l'interface ne revient pas aux identifiants de configuration ou d'environnement.
  Fournissez `token` (ou `password`) explicitement. L'absence d'identifiants explicites constitue une erreur.
- Utilisez `wss://` lorsque le Gateway est derrière TLS (Tailscale Serve, proxy HTTPS, etc.).
- `gatewayUrl` n'est accepté que dans une fenêtre de niveau supérieur (non intégrée) pour empêcher le détournement de clic.
- Les déploiements de l'interface de contrôle non en boucle locale doivent définir `gateway.controlUi.allowedOrigins`
  explicitement (origines complètes). Cela inclut les configurations de dev à distance.
- N'utilisez pas `gateway.controlUi.allowedOrigins: ["*"]` sauf pour des tests locaux
  étroitement contrôlés. Cela signifie autoriser n'importe quelle origine de navigateur,
  et non « faire correspondre l'hôte que j'utilise ».
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active
  le mode de repli d'origine via l'en-tête Host (Host-header origin fallback mode),
  mais il s'agit d'un mode de sécurité dangereux.

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

import en from "/components/footer/en.mdx";

<en />
