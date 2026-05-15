---
summary: "Déploiement étape par étape sur Fly.io pour OpenClaw avec stockage persistant et HTTPS"
title: Fly.io
read_when:
  - Deploying OpenClaw on Fly.io
  - Setting up Fly volumes, secrets, and first-run config
---

**Objectif :** OpenClaw Gateway fonctionnant sur une machine [Fly.io](https://fly.io) avec stockage persistant, HTTPS automatique et accès Discord/canal.

## Ce dont vous avez besoin

- [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/) installé
- Compte Fly.io (le niveau gratuit fonctionne)
- Authentification du modèle : clé API pour votre fournisseur de modèle choisi
- Identifiants du canal : jeton de bot Discord, jeton Telegram, etc.

## Chemin rapide pour débutants

1. Cloner le dépôt → personnaliser `fly.toml`
2. Créer une application + un volume → définir les secrets
3. Déployer avec `fly deploy`
4. Se connecter via SSH pour créer la configuration ou utiliser l'interface de contrôle

<Steps>
  <Step title="Créer l'application Fly">
    ```bash
    # Clone the repo
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # Create a new Fly app (pick your own name)
    fly apps create my-openclaw

    # Create a persistent volume (1GB is usually enough)
    fly volumes create openclaw_data --size 1 --region iad
    ```

    **Astuce :** Choisissez une région proche de chez vous. Options courantes : `lhr` (Londres), `iad` (Virginie), `sjc` (San José).

  </Step>

  <Step title="Configurer fly.toml">
    Modifiez `fly.toml` pour qu'il corresponde au nom de votre application et à vos besoins.

    **Note de sécurité :** La configuration par défaut expose une URL publique. Pour un déploiement renforcé sans IP publique, consultez [Private Deployment](#private-deployment-hardened) ou utilisez `deploy/fly.private.toml`.

    ```toml
    app = "my-openclaw"  # Your app name
    primary_region = "iad"

    [build]
      dockerfile = "Dockerfile"

    [env]
      NODE_ENV = "production"
      OPENCLAW_PREFER_PNPM = "1"
      OPENCLAW_STATE_DIR = "/data"
      NODE_OPTIONS = "--max-old-space-size=1536"

    [processes]
      app = "node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan"

    [http_service]
      internal_port = 3000
      force_https = true
      auto_stop_machines = false
      auto_start_machines = true
      min_machines_running = 1
      processes = ["app"]

    [[vm]]
      size = "shared-cpu-2x"
      memory = "2048mb"

    [mounts]
      source = "openclaw_data"
      destination = "/data"
    ```OpenClawDocker

    L'image Docker OpenClaw utilise `tini`Docker comme point d'entrée. Les commandes de processus Fly remplacent la commande Docker `CMD` sans remplacer `ENTRYPOINT`, le processus s'exécute donc toujours sous `tini`.

    **Paramètres clés :**

    | Setting                        | Why                                                                         |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan`                   | Se lie à `0.0.0.0` pour que le proxy de Fly puisse atteindre la passerelle                     |
    | `--allow-unconfigured`         | Démarre sans fichier de configuration (vous en créerez un après)                      |
    | `internal_port = 3000`         | Doit correspondre à `--port 3000` (ou `OPENCLAW_GATEWAY_PORT`) pour les contrôles de santé de Fly |
    | `memory = "2048mb"`            | 512 Mo est trop petit ; 2 Go recommandés                                         |
    | `OPENCLAW_STATE_DIR = "/data"` | Conserve l'état sur le volume                                                |

  </Step>

  <Step title="Définir les secrets">
    ```bash
    # Required: Gateway token (for non-loopback binding)
    fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

    # Model provider API keys
    fly secrets set ANTHROPIC_API_KEY=sk-ant-...

    # Optional: Other providers
    fly secrets set OPENAI_API_KEY=sk-...
    fly secrets set GOOGLE_API_KEY=...

    # Channel tokens
    fly secrets set DISCORD_BOT_TOKEN=MTQ...
    ```

    **Notes :**

    - Les liaisons non-boucle (`--bind lan`) nécessitent un chemin d'authentification de passerelle valide. Cet exemple Fly.io utilise `OPENCLAW_GATEWAY_TOKEN`, mais `gateway.auth.password` ou un déploiement `trusted-proxy` non-boucle correctement configuré satisfont également la condition.
    - Traitez ces jetons comme des mots de passe.
    - **Privilégiez les env vars aux fichiers de configuration** pour toutes les clés et jetons API. Cela permet de garder les secrets en dehors de `openclaw.json` où ils pourraient être accidentellement exposés ou enregistrés.

  </Step>

  <Step title="Déployer">
    ```bash
    fly deploy
    ```

    Le premier déploiement construit l'image Docker (environ 2-3 minutes). Les déploiements suivants sont plus rapides.

    Après le déploiement, vérifiez :

    ```bash
    fly status
    fly logs
    ```

    Vous devriez voir :

    ```
    [gateway] listening on ws://0.0.0.0:3000 (PID xxx)
    [discord] logged in to discord as xxx
    ```

  </Step>

  <Step title="Créer le fichier de configuration">
    Connectez-vous via SSH à la machine pour créer une configuration appropriée :

    ```bash
    fly ssh console
    ```

    Créez le répertoire et le fichier de configuration :

    ```bash
    mkdir -p /data
    cat > /data/openclaw.json << 'EOF'
    {
      "agents": {
        "defaults": {
          "model": {
            "primary": "anthropic/claude-opus-4-6",
            "fallbacks": ["anthropic/claude-sonnet-4-6", "openai/gpt-5.4"]
          },
          "maxConcurrent": 4
        },
        "list": [
          {
            "id": "main",
            "default": true
          }
        ]
      },
      "auth": {
        "profiles": {
          "anthropic:default": { "mode": "token", "provider": "anthropic" },
          "openai:default": { "mode": "token", "provider": "openai" }
        }
      },
      "bindings": [
        {
          "agentId": "main",
          "match": { "channel": "discord" }
        }
      ],
      "channels": {
        "discord": {
          "enabled": true,
          "groupPolicy": "allowlist",
          "guilds": {
            "YOUR_GUILD_ID": {
              "channels": { "general": { "allow": true } },
              "requireMention": false
            }
          }
        }
      },
      "gateway": {
        "mode": "local",
        "bind": "auto",
        "controlUi": {
          "allowedOrigins": [
            "https://my-openclaw.fly.dev",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
          ]
        }
      },
      "meta": {}
    }
    EOF
    ```

    **Note :** Avec `OPENCLAW_STATE_DIR=/data`, le chemin de configuration est `/data/openclaw.json`.

    **Note :** Remplacez `https://my-openclaw.fly.dev`Gateway par votre véritable origine d'application Fly. Le Gateway initialise les origines de l'interface de contrôle locale à partir des valeurs d'exécution `--bind` et `--port` pour que le premier démarrage puisse avoir lieu avant l'existence de la configuration, mais l'accès via le navigateur via Fly nécessite toujours l'origine HTTPS exacte listée dans `gateway.controlUi.allowedOrigins`Discord.

    **Note :** Le jeton Discord peut provenir de :

    - Variable d'environnement : `DISCORD_BOT_TOKEN` (recommandé pour les secrets)
    - Fichier de configuration : `channels.discord.token`

    Si vous utilisez une env var, il n'est pas nécessaire d'ajouter le jeton à la configuration. Le gateway lit `DISCORD_BOT_TOKEN` automatiquement.

    Redémarrez pour appliquer :

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="GatewayAccéder à la Gateway">
    ### Interface de contrôle

    Ouvrir dans le navigateur :

    ```bash
    fly open
    ```

    Ou visiter `https://my-openclaw.fly.dev/`

    Authentifiez-vous avec le secret partagé configuré. Ce guide utilise le jeton de la gateway
    provenant de `OPENCLAW_GATEWAY_TOKEN` ; si vous avez basculé vers l'authentification par mot de passe, utilisez
    ce mot de passe à la place.

    ### Journaux

    ```bash
    fly logs              # Live logs
    fly logs --no-tail    # Recent logs
    ```

    ### Console SSH

    ```bash
    fly ssh console
    ```

  </Step>
</Steps>

## Dépannage

### "L'application n'écoute pas sur l'adresse attendue"

La gateway se lie à `127.0.0.1` au lieu de `0.0.0.0`.

**Solution :** Ajoutez `--bind lan` à votre commande de processus dans `fly.toml`.

### Échec des contrôles de santé / connexion refusée

Fly ne peut pas atteindre la gateway sur le port configuré.

**Correction :** Assurez-vous que `internal_port` correspond au port de la passerelle (définissez `--port 3000` ou `OPENCLAW_GATEWAY_PORT=3000`).

### OOM / Problèmes de mémoire

Le conteneur redémarre continuellement ou est arrêté. Signes : `SIGABRT`, `v8::internal::Runtime_AllocateInYoungGeneration`, ou redémarrages silencieux.

**Correction :** Augmentez la mémoire dans `fly.toml` :

```toml
[[vm]]
  memory = "2048mb"
```

Ou mettez à jour une machine existante :

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**Remarque :** 512 Mo est trop petit. 1 Go peut fonctionner mais peut provoquer une OOM sous charge ou avec une journalisation détaillée. **2 Go est recommandé.**

### Gateway problèmes de verrouillage

Gateway refuse de démarrer avec des erreurs « déjà en cours d'exécution ».

Cela se produit lorsque le conteneur redémarre mais que le fichier de verrouillage PID persiste sur le volume.

**Correction :** Supprimez le fichier de verrouillage :

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

Le fichier de verrouillage se trouve à `/data/gateway.*.lock` (pas dans un sous-répertoire).

### Config non lue

`--allow-unconfigured` contourne uniquement la garde de démarrage. Il ne crée pas ni ne répare `/data/openclaw.json`, alors assurez-vous que votre véritable configuration existe et inclut `gateway.mode="local"` lorsque vous voulez un démarrage normal de la passerelle locale.

Vérifiez que la configuration existe :

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### Écriture de la configuration via SSH

La commande `fly ssh console -C` ne prend pas en charge la redirection du shell. Pour écrire un fichier de configuration :

```bash
# Use echo + tee (pipe from local to remote)
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# Or use sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**Remarque :** `fly sftp` peut échouer si le fichier existe déjà. Supprimez-le d'abord :

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### L'état ne persiste pas

Si vous perdez les profils d'authentification, l'état du channel/provider ou les sessions après un redémarrage,
le répertoire d'état écrit sur le système de fichiers du conteneur.

**Correction :** Assurez-vous que `OPENCLAW_STATE_DIR=/data` est défini dans `fly.toml` et redéployez.

## Mises à jour

```bash
# Pull latest changes
git pull

# Redeploy
fly deploy

# Check health
fly status
fly logs
```

### Mise à jour de la commande machine

Si vous devez modifier la commande de démarrage sans redéploiement complet :

```bash
# Get machine ID
fly machines list

# Update command
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# Or with memory increase
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**Remarque :** Après `fly deploy`, la commande machine peut être réinitialisée à celle présente dans `fly.toml`. Si vous avez apporté des modifications manuelles, réappliquez-les après le déploiement.

## Déploiement privé (renforcé)

Par défaut, Fly alloue des adresses IP publiques, rendant votre passerelle accessible sur `https://your-app.fly.dev`. C'est pratique, mais cela signifie que votre déploiement peut être découvert par des scanners Internet (Shodan, Censys, etc.).

Pour un déploiement renforcé avec **aucune exposition publique**, utilisez le modèle privé.

### Quand utiliser le déploiement privé

- Vous effectuez uniquement des appels/messages **sortants** (pas de webhooks entrants)
- Vous utilisez des tunnels **ngrok ou Tailscale** pour tous les webhooks de rappel
- Vous accédez à la passerelle via **SSH, proxy ou WireGuard** au lieu du navigateur
- Vous souhaitez que le déploiement soit **caché des scanners Internet**

### Configuration

Utilisez `deploy/fly.private.toml` à la place de la configuration standard :

```bash
# Deploy with private config
fly deploy -c deploy/fly.private.toml
```

Ou convertir un déploiement existant :

```bash
# List current IPs
fly ips list -a my-openclaw

# Release public IPs
fly ips release <public-ipv4> -a my-openclaw
fly ips release <public-ipv6> -a my-openclaw

# Switch to private config so future deploys don't re-allocate public IPs
# (remove [http_service] or deploy with the private template)
fly deploy -c deploy/fly.private.toml

# Allocate private-only IPv6
fly ips allocate-v6 --private -a my-openclaw
```

Après cela, `fly ips list` ne devrait afficher qu'une adresse IP de type `private` :

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### Accéder à un déploiement privé

Comme il n'y a pas d'URL publique, utilisez l'une de ces méthodes :

**Option 1 : Proxy local (le plus simple)**

```bash
# Forward local port 3000 to the app
fly proxy 3000:3000 -a my-openclaw

# Then open http://localhost:3000 in browser
```

**Option 2 : VPN WireGuard**

```bash
# Create WireGuard config (one-time)
fly wireguard create

# Import to WireGuard client, then access via internal IPv6
# Example: http://[fdaa:x:x:x:x::x]:3000
```

**Option 3 : SSH uniquement**

```bash
fly ssh console -a my-openclaw
```

### Webhooks avec déploiement privé

Si vous avez besoin de rappels de webhooks (Twilio, Telnyx, etc.) sans exposition publique :

1. **Tunnel ngrok** - Exécuter ngrok à l'intérieur du conteneur ou en tant que sidecar
2. **Tailscale Funnel** - Exposer des chemins spécifiques via Tailscale
3. **Sortant uniquement** - Certains fournisseurs (Twilio) fonctionnent correctement pour les appels sortants sans webhooks

Exemple de configuration d'appel vocal avec ngrok :

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          tunnel: { provider: "ngrok" },
          webhookSecurity: {
            allowedHosts: ["example.ngrok.app"],
          },
        },
      },
    },
  },
}
```

Le tunnel ngrok s'exécute à l'intérieur du conteneur et fournit une URL publique de webhook sans exposer l'application Fly elle-même. Définissez `webhookSecurity.allowedHosts` sur le nom d'hôte public du tunnel afin que les en-têtes d'hôte transmis soient acceptés.

### Avantages de sécurité

| Aspect                          | Public      | Privé      |
| ------------------------------- | ----------- | ---------- |
| Scanners Internet               | Découvrable | Masqué     |
| Attaques directes               | Possibles   | Bloquées   |
| Accès à l'interface de contrôle | Navigateur  | Proxy/VPN  |
| Livraison des webhooks          | Directe     | Via tunnel |

## Remarques

- Fly.io utilise l'**architecture x86** (et non ARM)
- Le Dockerfile est compatible avec les deux architectures
- Pour l'onboarding WhatsApp/Telegram, utilisez `fly ssh console`
- Les données persistantes résident sur le volume à `/data`
- Signal nécessite Java + signal-cli ; utilisez une image personnalisée et maintenez la mémoire à 2 Go ou plus.

## Coût

Avec la configuration recommandée (`shared-cpu-2x`, 2 Go de RAM) :

- ~10-15 $/mois selon l'utilisation
- La offre gratuite inclut un certain quota

Voir les [tarifs Fly.io](https://fly.io/docs/about/pricing/) pour plus de détails.

## Étapes suivantes

- Configurer les canaux de messagerie : [Canaux](/fr/channels)
- Configurer le Gateway : [Configuration du Gateway](/fr/gateway/configuration)
- Garder OpenClaw à jour : [Mises à jour](/fr/install/updating)

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Hetzner](/fr/install/hetzner)
- [Docker](/fr/install/docker)
- [Hébergement VPS](/fr/vps)
