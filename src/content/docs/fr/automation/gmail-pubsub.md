---
summary: "Push Gmail Pub/Sub connecté aux webhooks OpenClaw via gogcli"
read_when:
  - Wiring Gmail inbox triggers to OpenClaw
  - Setting up Pub/Sub push for agent wake
title: "Gmail PubSub"
---

# Gmail Pub/Sub -> OpenClaw

Objectif : Gmail watch -> Pub/Sub push -> `gog gmail watch serve` -> Webhook OpenClaw.

## Prérequis

- `gcloud` installé et connecté ([guide d'installation](https://docs.cloud.google.com/sdk/docs/install-sdk)).
- `gog` (gogcli) installé et autorisé pour le compte Gmail ([gogcli.sh](https://gogcli.sh/)).
- Hooks OpenClaw activés (voir [Webhooks](/en/automation/webhook)).
- `tailscale` connecté ([tailscale.com](https://tailscale.com/)). L'installation prise en charge utilise Tailscale Funnel pour le point de terminaison HTTPS public.
  D'autres services de tunnel peuvent fonctionner, mais sont bricolés/non pris en charge et nécessitent un câblage manuel.
  Pour l'instant, Tailscale est ce que nous prenons en charge.

Exemple de configuration de hook (activer le mappage préréglé Gmail) :

```json5
{
  hooks: {
    enabled: true,
    token: "OPENCLAW_HOOK_TOKEN",
    path: "/hooks",
    presets: ["gmail"],
  },
}
```

Pour envoyer le résumé Gmail vers une interface de discussion, remplacez le préréglage par un mappage
qui définit `deliver` + optionnel `channel`/`to` :

```json5
{
  hooks: {
    enabled: true,
    token: "OPENCLAW_HOOK_TOKEN",
    presets: ["gmail"],
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "New email from {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}\n{{messages[0].body}}",
        model: "openai/gpt-5.2-mini",
        deliver: true,
        channel: "last",
        // to: "+15551234567"
      },
    ],
  },
}
```

Si vous souhaitez un canal fixe, définissez `channel` + `to`. Sinon, `channel: "last"`
utilise la dernière route de livraison (revient à WhatsApp).

Pour forcer un modèle moins coûteux pour les exécutions Gmail, définissez `model` dans le mappage
(`provider/model` ou alias). Si vous appliquez `agents.defaults.models`, incluez-le ici.

Pour définir un modèle par défaut et un niveau de réflexion spécifiquement pour les hooks Gmail, ajoutez
`hooks.gmail.model` / `hooks.gmail.thinking` dans votre configuration :

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

Notes :

- Le `model`/`thinking` par hook dans le mappage remplace toujours ces valeurs par défaut.
- Ordre de repli : `hooks.gmail.model` → `agents.defaults.model.fallbacks` → primaire (auth/limites de délai/délais d'attente).
- Si `agents.defaults.models` est défini, le modèle Gmail doit figurer dans la liste d'autorisation.
- Le contenu du hook Gmail est encapsulé dans des limites de sécurité de contenu externe par défaut.
  Pour désactiver (dangereux), définissez `hooks.gmail.allowUnsafeExternalContent: true`.

Pour personnaliser davantage la gestion des charges utiles, ajoutez `hooks.mappings` ou un module de transformation JS/TS
sous `~/.openclaw/hooks/transforms` (voir [Webhooks](/en/automation/webhook)).

## Assistant (recommandé)

Utilisez l'assistant OpenClaw pour connecter le tout (installe les dépendances sur macOS via brew) :

```bash
openclaw webhooks gmail setup \
  --account openclaw@gmail.com
```

Valeurs par défaut :

- Utilise Tailscale Funnel pour le point de terminaison public.
- Écrit la configuration `hooks.gmail` pour `openclaw webhooks gmail run`.
- Active le préréglage de hook Gmail (`hooks.presets: ["gmail"]`).

Remarque sur le chemin : lorsque `tailscale.mode` est activé, OpenClaw définit automatiquement
`hooks.gmail.serve.path` sur `/` et conserve le chemin public à
`hooks.gmail.tailscale.path` (par défaut `/gmail-pubsub`) car Tailscale
supprime le préfixe de chemin défini avant le proxy.
Si vous avez besoin que le backend reçoive le chemin préfixé, définissez
`hooks.gmail.tailscale.target` (ou `--tailscale-target`) sur une URL complète comme
`http://127.0.0.1:8788/gmail-pubsub` et faites correspondre `hooks.gmail.serve.path`.

Vous souhaitez un point de terminaison personnalisé ? Utilisez `--push-endpoint <url>` ou `--tailscale off`.

Remarque concernant la plateforme : sur macOS, l'assistant installe `gcloud`, `gogcli` et `tailscale`
via Homebrew ; sur Linux, installez-les d'abord manuellement.

Démarrage automatique de la Gateway (recommandé) :

- Lorsque `hooks.enabled=true` et `hooks.gmail.account` sont définis, la Gateway démarre
  `gog gmail watch serve` au démarrage et renouvelle automatiquement la surveillance.
- Définissez `OPENCLAW_SKIP_GMAIL_WATCHER=1` pour refuser (utile si vous exécutez le démon vous-même).
- N'exécutez pas le démon manuel en même temps, sinon vous rencontrerez
  `listen tcp 127.0.0.1:8788: bind: address already in use`.

Démon manuel (démarre `gog gmail watch serve` + renouvellement automatique) :

```bash
openclaw webhooks gmail run
```

## Configuration unique

1. Sélectionnez le projet GCP **qui possède le client OAuth ** utilisé par `gog`.

```bash
gcloud auth login
gcloud config set project <project-id>
```

Remarque : Gmail watch exige que le sujet Pub/Sub réside dans le même projet que le client OAuth.

2. Activer les API :

```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

3. Créer un sujet :

```bash
gcloud pubsub topics create gog-gmail-watch
```

4. Autoriser Gmail push à publier :

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

## Démarrer la surveillance

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

Enregistrez le `history_id` à partir de la sortie (pour le débogage).

## Exécuter le gestionnaire de push

Exemple local (auth par jeton partagé) :

```bash
gog gmail watch serve \
  --account openclaw@gmail.com \
  --bind 127.0.0.1 \
  --port 8788 \
  --path /gmail-pubsub \
  --token <shared> \
  --hook-url http://127.0.0.1:18789/hooks/gmail \
  --hook-token OPENCLAW_HOOK_TOKEN \
  --include-body \
  --max-bytes 20000
```

Remarques :

- `--token` protège le point de terminaison de push (`x-gog-token` ou `?token=`).
- `--hook-url` pointe vers le OpenClaw `/hooks/gmail` (mappé ; exécution isolée + résumé vers le principal).
- `--include-body` et `--max-bytes` contrôlent l'extrait du corps envoyé à OpenClaw.

Recommandé : `openclaw webhooks gmail run` encapsule le même flux et renouvelle automatiquement la surveillance.

## Exposer le gestionnaire (avancé, non pris en charge)

Si vous avez besoin d'un tunnel non Tailscale, connectez-le manuellement et utilisez l'URL publique dans l'abonnement
push (non pris en charge, sans garde-fous) :

```bash
cloudflared tunnel --url http://127.0.0.1:8788 --no-autoupdate
```

Utilisez l'URL générée comme point de terminaison de push :

```bash
gcloud pubsub subscriptions create gog-gmail-watch-push \
  --topic gog-gmail-watch \
  --push-endpoint "https://<public-url>/gmail-pubsub?token=<shared>"
```

Production : utilisez un point de terminaison HTTPS stable et configurez le JWT OIDC Pub/Sub, puis exécutez :

```bash
gog gmail watch serve --verify-oidc --oidc-email <svc@...>
```

## Test

Envoyez un message à la boîte de réception surveillée :

```bash
gog gmail send \
  --account openclaw@gmail.com \
  --to openclaw@gmail.com \
  --subject "watch test" \
  --body "ping"
```

Vérifier l'état et l'historique de la surveillance :

```bash
gog gmail watch status --account openclaw@gmail.com
gog gmail history --account openclaw@gmail.com --since <historyId>
```

## Dépannage

- `Invalid topicName` : inadéquation de projet (le sujet n'est pas dans le projet du client OAuth).
- `User not authorized` : `roles/pubsub.publisher` manquant sur le sujet.
- Messages vides : Gmail push ne fournit que `historyId` ; récupérez via `gog gmail history`.

## Nettoyage

```bash
gog gmail watch stop --account openclaw@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```
