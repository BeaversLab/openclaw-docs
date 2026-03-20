---
summary: "Gmail Pub/Sub push connecté aux webhooks OpenClaw via gogcli"
read_when:
  - Connexion des déclencheurs de boîte de réception Gmail à OpenClaw
  - Configuration du push Pub/Sub pour le réveil de l'agent
title: "Gmail PubSub"
---

# Gmail Pub/Sub -> OpenClaw

Objectif : Gmail watch -> Pub/Sub push -> `gog gmail watch serve` -> Webhook OpenClaw.

## Prérequis

- `gcloud` installé et connecté ([guide d'installation](https://docs.cloud.google.com/sdk/docs/install-sdk)).
- `gog` (gogcli) installé et autorisé pour le compte Gmail ([gogcli.sh](https://gogcli.sh/)).
- Hooks OpenClaw activés (voir [Webhooks](/fr/automation/webhook)).
- `tailscale` connecté ([tailscale.com](https://tailscale.com/)). L'installation prise en charge utilise Tailscale Funnel pour le point de terminaison HTTPS public.
  D'autres services de tunnel peuvent fonctionner, mais sont en DIY/non pris en charge et nécessitent un câblage manuel.
  Pour l'instant, Tailscale est ce que nous supportons.

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

Pour livrer le résumé Gmail à une surface de chat, remplacez le préréglage par un mappage
qui définit `deliver` + `channel`/`to` en option :

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
utilise la dernière route de livraison (retourne à WhatsApp).

Pour forcer un modèle moins cher pour les exécutions Gmail, définissez `model` dans le mappage
(`provider/model` ou alias). Si vous appliquez `agents.defaults.models`, incluez-le là.

Pour définir un modèle et un niveau de réflexion par défaut spécifiquement pour les hooks Gmail, ajoutez
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

Remarques :

- `model`/`thinking` par hook dans le mappage remplace toujours ces valeurs par défaut.
- Ordre de repli : `hooks.gmail.model` → `agents.defaults.model.fallbacks` → primaire (auth/limitation de délai/délais d'attente).
- Si `agents.defaults.models` est défini, le modèle Gmail doit figurer dans la liste d'autorisation.
- Le contenu du hook Gmail est encapsulé avec des limites de sécurité pour contenu externe par défaut.
  Pour désactiver (dangereux), définissez `hooks.gmail.allowUnsafeExternalContent: true`.

Pour personnaliser davantage la gestion des charges utiles, ajoutez `hooks.mappings` ou un module de transformation JS/TS
sous `~/.openclaw/hooks/transforms` (voir [Webhooks](/fr/automation/webhook)).

## Assistant (recommandé)

Utilisez l'assistant OpenClaw pour tout connecter (installe les dépendances sur macOS via brew) :

```bash
openclaw webhooks gmail setup \
  --account openclaw@gmail.com
```

Valeurs par défaut :

- Utilise Tailscale Funnel pour le point de terminaison public.
- Écrit la configuration `hooks.gmail` pour `openclaw webhooks gmail run`.
- Active le préréglage Gmail hook (`hooks.presets: ["gmail"]`).

Remarque sur le chemin : lorsque `tailscale.mode` est activé, OpenClaw définit automatiquement
`hooks.gmail.serve.path` sur `/` et conserve le chemin public à
`hooks.gmail.tailscale.path` (par défaut `/gmail-pubsub`) car Tailscale
supprime le préfixe de chemin défini avant le proxying.
Si vous avez besoin que le backend reçoive le chemin préfixé, définissez
`hooks.gmail.tailscale.target` (ou `--tailscale-target`) sur une URL complète comme
`http://127.0.0.1:8788/gmail-pubsub` et faites correspondre `hooks.gmail.serve.path`.

Vous voulez un point de terminaison personnalisé ? Utilisez `--push-endpoint <url>` ou `--tailscale off`.

Remarque sur la plateforme : sur macOS l'assistant installe `gcloud`, `gogcli` et `tailscale`
via Homebrew ; sur Linux, installez-les d'abord manuellement.

Démarrage automatique de la Gateway (recommandé) :

- Lorsque `hooks.enabled=true` et `hooks.gmail.account` sont définis, la Gateway démarre
  `gog gmail watch serve` au démarrage et renouvelle automatiquement la surveillance.
- Définissez `OPENCLAW_SKIP_GMAIL_WATCHER=1` pour refuser (utile si vous exécutez le démon vous-même).
- N'exécutez pas le démon manuel en même temps, sinon vous rencontrerez
  `listen tcp 127.0.0.1:8788: bind: address already in use`.

Démon manuel (démarre `gog gmail watch serve` + renouvellement auto) :

```bash
openclaw webhooks gmail run
```

## Configuration unique

1. Sélectionnez le projet GCP **qui possède le client OAuth ** utilisé par `gog`.

```bash
gcloud auth login
gcloud config set project <project-id>
```

Remarque : Gmail watch nécessite que le sujet Pub/Sub réside dans le même projet que le client OAuth.

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

Enregistrez le `history_id` de la sortie (pour le débogage).

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

Notes :

- `--token` protège le point de terminaison de push (`x-gog-token` ou `?token=`).
- `--hook-url` pointe vers le `/hooks/gmail` OpenClaw (mappé ; exécution isolée + résumé vers le principal).
- `--include-body` et `--max-bytes` contrôlent l'extrait du corps envoyé à OpenClaw.

Recommandé : `openclaw webhooks gmail run` encapsule le même flux et renouvelle automatiquement la surveillance.

## Exposer le gestionnaire (avancé, non pris en charge)

Si vous avez besoin d'un tunnel non Tailscale, connectez-le manuellement et utilisez l'URL publique dans l'abonnement push (non pris en charge, sans garde-fous) :

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

Vérifiez l'état et l'historique de la surveillance :

```bash
gog gmail watch status --account openclaw@gmail.com
gog gmail history --account openclaw@gmail.com --since <historyId>
```

## Dépannage

- `Invalid topicName` : inadéquation de projet (le sujet n'est pas dans le projet client OAuth).
- `User not authorized` : `roles/pubsub.publisher` manquant sur le sujet.
- Messages vides : le push Gmail ne fournit que `historyId` ; récupérez via `gog gmail history`.

## Nettoyage

```bash
gog gmail watch stop --account openclaw@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```

import fr from "/components/footer/fr.mdx";

<fr />
