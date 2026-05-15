---
summary: "Google ChatÉtat du support, capacités et configuration de l'application Google Chat"
read_when:
  - Working on Google Chat channel features
title: "Google ChatGoogle Chat"
---

État : plugin téléchargeable pour les DMs et les espaces via les webhooks de l'API Google Chat (HTTP uniquement).

## Installer

Installez Google Chat avant de configurer le channel :

```bash
openclaw plugins install @openclaw/googlechat
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./path/to/local/googlechat-plugin
```

## Configuration rapide (débutant)

1. Créez un projet Google Cloud et activez l'**API Google Chat**.
   - Accédez à : [Identifiants de l'API Google Chat](Google ChatAPIhttps://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - Activez l'API si elle ne l'est pas déjà.
2. Créez un **compte de service** :
   - Appuyez sur **Créer des identifiants** > **Compte de service**.
   - Nommez-le comme vous le souhaitez (par exemple, `openclaw-chat`).
   - Laissez les autorisations vides (appuyez sur **Continuer**).
   - Laissez les principaux ayant accès vides (appuyez sur **Terminé**).
3. Créez et téléchargez la **clé JSON** :
   - Dans la liste des comptes de service, cliquez sur celui que vous venez de créer.
   - Allez dans l'onglet **Clés**.
   - Cliquez sur **Ajouter une clé** > **Créer une nouvelle clé**.
   - Sélectionnez **JSON** et appuyez sur **Créer**.
4. Stockez le fichier JSON téléchargé sur votre hôte de passerelle (par exemple, `~/.openclaw/googlechat-service-account.json`).
5. Créez une application Google Chat dans la [Configuration de Chat de la Google Cloud Console](Google Chathttps://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) :
   - Remplissez les **Informations sur l'application** :
     - **Nom de l'application** : (par exemple `OpenClaw`)
     - **URL de l'avatar** : (par exemple `https://openclaw.ai/logo.png`)
     - **Description** : (par exemple `Personal AI Assistant`)
   - Activez les **Fonctionnalités interactives**.
   - Sous **Fonctionnalité**, cochez **Rejoindre les espaces et les conversations de groupe**.
   - Sous **Paramètres de connexion**, sélectionnez **URL du point de terminaison HTTP**.
   - Sous **Déclencheurs**, sélectionnez **Utiliser une URL de point de terminaison HTTP commune pour tous les déclencheurs** et définissez-la sur l'URL publique de votre passerelle suivie de `/googlechat`.
     - _Astuce : Exécutez `openclaw status` pour trouver l'URL publique de votre passerelle._
   - Sous **Visibilité**, cochez **Rendre cette application Chat disponible pour des personnes et des groupes spécifiques dans `<Your Domain>`**.
   - Entrez votre adresse e-mail (par ex. `user@example.com`) dans la zone de texte.
   - Cliquez sur **Save** (Enregistrer) en bas.
6. **Activer le statut de l'application** :
   - Après avoir enregistré, **actualisez la page**.
   - Recherchez la section **App status** (Statut de l'application) (généralement en haut ou en bas après l'enregistrement).
   - Changez le statut pour **Live - available to users** (En ligne - disponible pour les utilisateurs).
   - Cliquez à nouveau sur **Save** (Enregistrer).
7. Configurez OpenClaw avec le chemin du compte de service + l'audience du webhook :
   - Env : `GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - Ou config : `channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`.
8. Définissez le type + la valeur de l'audience du webhook (doit correspondre à la configuration de votre application Chat).
9. Démarrez la passerelle. Google Chat enverra une requête POST au chemin de votre webhook.

## Ajouter à Google Chat

Une fois la passerelle démarrée et votre e-mail ajouté à la liste de visibilité :

1. Allez sur [Google Chat](https://chat.google.com/).
2. Cliquez sur l'icône **+** (plus) à côté de **Direct Messages** (Messages directs).
3. Dans la barre de recherche (où vous ajoutez habituellement des personnes), tapez le **nom de l'application** que vous avez configuré dans la Google Cloud Console.
   - **Note** : Le bot n'apparaîtra _pas_ dans la liste de navigation du « Marketplace » car il s'agit d'une application privée. Vous devez le rechercher par son nom.
4. Sélectionnez votre bot dans les résultats.
5. Cliquez sur **Add** (Ajouter) ou **Chat** (Discuter) pour commencer une conversation 1:1.
6. Envoyez « Bonjour » pour activer l'assistant !

## URL publique (Webhook uniquement)

Les webhooks Google Chat nécessitent un point de terminaison HTTPS public. Pour la sécurité, **n'exposez que le chemin `/googlechat`** à Internet. Gardez le tableau de bord OpenClaw et les autres points de terminaison sensibles sur votre réseau privé.

### Option A : Funnel Tailscale (Recommandé)

Utilisez Tailscale Serve pour le tableau de bord privé et Funnel pour le chemin du webhook public. Cela permet de garder `/` privé tout en n'exposant que `/googlechat`.

1. **Vérifiez à quelle adresse votre passerelle est liée :**

   ```bash
   ss -tlnp | grep 18789
   ```

   Notez l'adresse IP (par ex., `127.0.0.1`, `0.0.0.0`, ou votre IP Tailscale comme `100.x.x.x`).

2. **Exposer le tableau de bord uniquement au tailnet (port 8443) :**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **N'exposer publiquement que le chemin du webhook :**

   ```bash
   # If bound to localhost (127.0.0.1 or 0.0.0.0):
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # If bound to Tailscale IP only (e.g., 100.106.161.80):
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **Autoriser le nœud pour l'accès Funnel :**
   Si vous y êtes invité, visitez l'URL d'autorisation affichée dans la sortie pour activer Funnel pour ce nœud dans votre stratégie tailnet.

5. **Vérifier la configuration :**

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

Votre URL publique de webhook sera :
`https://<node-name>.<tailnet>.ts.net/googlechat`

Votre tableau de bord privé reste exclusif au tailnet :
`https://<node-name>.<tailnet>.ts.net:8443/`

Utilisez l'URL publique (sans `:8443`) dans la configuration de l'application Google Chat.

> Remarque : Cette configuration persiste après les redémarrages. Pour la supprimer plus tard, exécutez `tailscale funnel reset` et `tailscale serve reset`.

### Option B : Proxy inverse (Caddy)

Si vous utilisez un proxy inverse comme Caddy, ne proxifiez que le chemin spécifique :

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

Avec cette configuration, toute requête vers `your-domain.com/` sera ignorée ou renverra 404, tandis que `your-domain.com/googlechat` est acheminée en toute sécurité vers OpenClaw.

### Option C : Cloudflare Tunnel

Configurez les règles d'ingress de votre tunnel pour router uniquement le chemin du webhook :

- **Chemin** : `/googlechat` -> `http://localhost:18789/googlechat`
- **Règle par défaut** : HTTP 404 (Non trouvé)

## Fonctionnement

1. Google Chat envoie des POST de webhook vers la passerelle. Chaque requête inclut un en-tête `Authorization: Bearer <token>`.
   - OpenClaw vérifie l'authentification par porteur avant de lire/analyser les corps complets des webhooks lorsque l'en-tête est présent.
   - Les requêtes Google Workspace Add-on qui contiennent `authorizationEventObject.systemIdToken` dans le corps sont prises en charge via un budget de corps de pré-authentification plus strict.
2. OpenClaw vérifie le jeton par rapport au `audienceType` configuré + `audience` :
   - `audienceType: "app-url"` → l'audience est votre URL de webhook HTTPS.
   - `audienceType: "project-number"` → l'audience est le numéro de projet Cloud.
3. Les messages sont routés par espace :
   - Les DMs utilisent la clé de session `agent:<agentId>:googlechat:direct:<spaceId>`.
   - Les espaces utilisent la clé de session `agent:<agentId>:googlechat:group:<spaceId>`.
4. L'accès DM est par appariement par défaut. Les expéditeurs inconnus reçoivent un code d'appariement ; approuvez avec :
   - `openclaw pairing approve googlechat <code>`
5. Les espaces de groupe nécessitent une @-mention par défaut. Utilisez `botUser` si la détection de mention a besoin du nom d'utilisateur de l'application.

## Cibles

Utilisez ces identifiants pour la livraison et les listes autorisées :

- Messages directs : `users/<userId>` (recommandé).
- L'e-mail brut `name@example.com` est modifiable et utilisé uniquement pour la correspondance directe de la liste blanche lorsque `channels.googlechat.dangerouslyAllowNameMatching: true`.
- Déconseillé : `users/<email>` est traité comme un identifiant utilisateur, et non comme une liste blanche d'e-mails.
- Espaces : `spaces/<spaceId>`.

## Points forts de la configuration

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      // or serviceAccountRef: { source: "file", provider: "filemain", id: "/channels/googlechat/serviceAccount" }
      audienceType: "app-url",
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // optional; helps mention detection
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          enabled: true,
          requireMention: true,
          users: ["users/1234567890"],
          systemPrompt: "Short answers only.",
        },
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

Notes :

- Les identifiants du compte de service peuvent également être transmis en ligne avec `serviceAccount` (chaîne JSON).
- `serviceAccountRef` est également pris en charge (SecretRef env/fichier), y compris les références par compte sous `channels.googlechat.accounts.<id>.serviceAccountRef`.
- Le chemin du webhook par défaut est `/googlechat` si `webhookPath` n'est pas défini.
- `dangerouslyAllowNameMatching` réactive la correspondance de principal d'e-mail modifiable pour les listes blanches (mode de compatibilité de secours).
- Les réactions sont disponibles via l'outil `reactions` et `channels action` lorsque `actions.reactions` est activé.
- Les actions de message exposent `send` pour le texte et `upload-file` pour l'envoi explicite de pièces jointes. `upload-file` accepte `media` / `filePath` / `path` ainsi que `message`, `filename` optionnels, et le ciblage de fils de discussion.
- `typingIndicator` prend en charge `none`, `message` (par défaut), et `reaction` (la réaction nécessite un OAuth utilisateur).
- Les pièces jointes sont téléchargées via le Chat API et stockées dans le pipeline multimédia (taille limitée par `mediaMaxMb`).

Détails de référence des secrets : [Gestion des secrets](/fr/gateway/secrets).

## Dépannage

### 405 Method Not Allowed

Si Google Cloud Logs Explorer affiche des erreurs telles que :

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

Cela signifie que le gestionnaire de webhook n'est pas enregistré. Causes courantes :

1. **Canal non configuré** : La section `channels.googlechat` est manquante dans votre configuration. Vérifiez avec :

   ```bash
   openclaw config get channels.googlechat
   ```

   S'il renvoie "Config path not found", ajoutez la configuration (voir [Points forts de la configuration](#config-highlights)).

2. **Plugin not enabled** : Vérifiez l'état du plugin :

   ```bash
   openclaw plugins list | grep googlechat
   ```

   S'il indique "disabled", ajoutez `plugins.entries.googlechat.enabled: true` à votre configuration.

3. **Gateway not restarted** : Après avoir ajouté la configuration, redémarrez la passerelle :

   ```bash
   openclaw gateway restart
   ```

Vérifiez que le canal est en cours d'exécution :

```bash
openclaw channels status
# Should show: Google Chat default: enabled, configured, ...
```

### Autres problèmes

- Consultez `openclaw channels status --probe` pour détecter des erreurs d'authentification ou une configuration d'audience manquante.
- Si aucun message n'arrive, confirmez l'URL du webhook de l'application Chat + les abonnements aux événements.
- Si le blocage par mention empêche les réponses, définissez `botUser` sur le nom de ressource utilisateur de l'application et vérifiez `requireMention`.
- Utilisez `openclaw logs --follow` lors de l'envoi d'un message de test pour voir si les requêtes atteignent la passerelle.

Documentation connexe :

- [Configuration de la passerelle](Gateway/en/gateway/configuration)
- [Sécurité](/fr/gateway/security)
- [Réactions](/fr/tools/reactions)

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) — tous les canaux pris en charge
- [Appariement](/fr/channels/pairing) — authentification DM et flux d'appariement
- [Groupes](/fr/channels/groups) — comportement de chat de groupe et blocage par mention
- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
