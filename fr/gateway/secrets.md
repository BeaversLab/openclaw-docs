---
summary: "Secrets management: SecretRef contract, runtime snapshot behavior, and safe one-way scrubbing"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Secrets Management"
---

# Secrets management

OpenClaw supports additive SecretRefs so supported credentials do not need to be stored as plaintext in configuration.

Plaintext still works. SecretRefs are opt-in per credential.

## Goals and runtime model

Secrets are resolved into an in-memory runtime snapshot.

- Resolution is eager during activation, not lazy on request paths.
- Startup fails fast when an effectively active SecretRef cannot be resolved.
- Reload uses atomic swap: full success, or keep the last-known-good snapshot.
- Runtime requests read from the active in-memory snapshot only.
- Outbound delivery paths also read from that active snapshot (for example Discord reply/thread delivery and Telegram action sends); they do not re-resolve SecretRefs on each send.

This keeps secret-provider outages off hot request paths.

## Active-surface filtering

SecretRefs are validated only on effectively active surfaces.

- Enabled surfaces: unresolved refs block startup/reload.
- Inactive surfaces: unresolved refs do not block startup/reload.
- Inactive refs emit non-fatal diagnostics with code `SECRETS_REF_IGNORED_INACTIVE_SURFACE`.

Examples of inactive surfaces:

- Disabled channel/account entries.
- Top-level channel credentials that no enabled account inherits.
- Disabled tool/feature surfaces.
- Web search provider-specific keys that are not selected by `tools.web.search.provider`.
  In auto mode (provider unset), keys are consulted by precedence for provider auto-detection until one resolves.
  After selection, non-selected provider keys are treated as inactive until selected.
- Sandbox SSH auth material (`agents.defaults.sandbox.ssh.identityData`,
  `certificateData`, `knownHostsData`, plus per-agent overrides) is active only
  when the effective sandbox backend is `ssh` for the default agent or an enabled agent.
- Les SecretRefs `gateway.remote.token` / `gateway.remote.password` sont actifs si l'une de ces conditions est vraie :
  - `gateway.mode=remote`
  - `gateway.remote.url` est configuré
  - `gateway.tailscale.mode` est `serve` ou `funnel`
  - En mode local sans ces surfaces distantes :
    - `gateway.remote.token` est actif lorsque l'auth par jeton peut l'emporter et qu'aucun jeton env/auth n'est configuré.
    - `gateway.remote.password` est actif uniquement lorsque l'auth par mot de passe peut l'emporter et qu'aucun mot de passe env/auth n'est configuré.
- Le SecretRef `gateway.auth.token` est inactif pour la résolution de l'auth au démarrage lorsque `OPENCLAW_GATEWAY_TOKEN` (ou `CLAWDBOT_GATEWAY_TOKEN`) est défini, car l'entrée de jeton env l'emporte pour cet environnement d'exécution.

## Diagnostics de la surface d'auth Gateway

Lorsqu'un SecretRef est configuré sur `gateway.auth.token`, `gateway.auth.password`,
`gateway.remote.token` ou `gateway.remote.password`, les journaux de démarrage/rechargement de la passerelle
indiquent explicitement l'état de la surface :

- `active` : le SecretRef fait partie de la surface d'auth effective et doit être résolu.
- `inactive` : le SecretRef est ignoré pour cet environnement d'exécution car une autre surface d'auth l'emporte, ou
  car l'auth distante est désactivée/inactive.

Ces entrées sont journalisées avec `SECRETS_GATEWAY_AUTH_SURFACE` et incluent la raison utilisée par la
politique de surface active, afin que vous puissiez voir pourquoi une information d'identification a été traitée comme active ou inactive.

## Préflight de référence d'onboarding

Lorsque l'onboarding s'exécute en mode interactif et que vous choisissez le stockage SecretRef, OpenClaw exécute une validation préalable avant l'enregistrement :

- Références Env : valide le nom de la variable d'environnement et confirme qu'une valeur non vide est visible lors de la configuration.
- Références de fournisseur (`file` ou `exec`) : valide la sélection du fournisseur, résout `id` et vérifie le type de valeur résolue.
- Chemin de réutilisation du démarrage rapide : lorsque `gateway.auth.token` est déjà un SecretRef, l'onboarding le résout avant l'amorçage de la sonde/tableau de bord (pour les références `env`, `file` et `exec`) en utilisant la même porte d'échec rapide.

Si la validation échoue, l'intégration affiche l'erreur et vous permet de réessayer.

## Contrat SecretRef

Utiliser une forme d'objet partout :

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

### `source: "env"`

```json5
{ source: "env", provider: "default", id: "OPENAI_API_KEY" }
```

Validation :

- `provider` doit correspondre à `^[a-z][a-z0-9_-]{0,63}$`
- `id` doit correspondre à `^[A-Z][A-Z0-9_]{0,127}$`

### `source: "file"`

```json5
{ source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
```

Validation :

- `provider` doit correspondre à `^[a-z][a-z0-9_-]{0,63}$`
- `id` doit être un pointeur JSON absolu (`/...`)
- Échappement RFC6901 dans les segments : `~` => `~0`, `/` => `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

Validation :

- `provider` doit correspondre à `^[a-z][a-z0-9_-]{0,63}$`
- `id` doit correspondre à `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `id` ne doit pas contenir `.` ou `..` comme segments de chemin délimités par des barres obliques (par exemple `a/../b` est rejeté)

## Configuration du fournisseur

Définissez les fournisseurs sous `secrets.providers` :

```json5
{
  secrets: {
    providers: {
      default: { source: "env" },
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json", // or "singleValue"
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        args: ["--profile", "prod"],
        passEnv: ["PATH", "VAULT_ADDR"],
        jsonOnly: true,
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
    resolution: {
      maxProviderConcurrency: 4,
      maxRefsPerProvider: 512,
      maxBatchBytes: 262144,
    },
  },
}
```

### Fournisseur Env

- Liste d'autorisation facultative via `allowlist`.
- Les valeurs d'environnement manquantes ou vides entraînent l'échec de la résolution.

### Fournisseur de fichiers

- Lit le fichier local depuis `path`.
- `mode: "json"` attend une charge utile d'objet JSON et résout `id` comme pointeur.
- `mode: "singleValue"` attend l'ID de référence `"value"` et renvoie le contenu du fichier.
- Le chemin doit réussir les vérifications de propriété et d'autorisation.
- Remarque sur l'échec sécurisé Windows : si la vérification ACL n'est pas disponible pour un chemin, la résolution échoue. Pour les chemins approuvés uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

### Fournisseur Exec

- Exécute le chemin binaire absolu configuré, sans shell.
- Par défaut, `command` doit pointer vers un fichier régulier (pas un lien symbolique).
- Définissez `allowSymlinkCommand: true` pour autoriser les chemins de commande de lien symbolique (par exemple, les shims Homebrew). OpenClaw valide le chemin cible résolu.
- Associez `allowSymlinkCommand` avec `trustedDirs` pour les chemins du gestionnaire de packages (par exemple `["/opt/homebrew"]`).
- Prend en charge le délai d'expiration, le délai d'expiration sans sortie, les limites d'octets de sortie, la liste d'autorisation des variables d'environnement et les répertoires approuvés.
- Remarque concernant l'échec sécurisé sur Windows : si la vérification ACL n'est pas disponible pour le chemin de commande, la résolution échoue. Pour les chemins approuvés uniquement, définissez `allowInsecurePath: true` sur ce provider pour contourner les vérifications de sécurité du chemin.

Charge utile de la requête (stdin) :

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

Charge utile de la réponse (stdout) :

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

Erreurs facultatives par ID :

```json
{
  "protocolVersion": 1,
  "values": {},
  "errors": { "providers/openai/apiKey": { "message": "not found" } }
}
```

## Exemples d'intégration Exec

### 1Password CLI

```json5
{
  secrets: {
    providers: {
      onepassword_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/op",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["read", "op://Personal/OpenClaw QA API Key/password"],
        passEnv: ["HOME"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "onepassword_openai", id: "value" },
      },
    },
  },
}
```

### HashiCorp Vault CLI

```json5
{
  secrets: {
    providers: {
      vault_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/vault",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["kv", "get", "-field=OPENAI_API_KEY", "secret/openclaw"],
        passEnv: ["VAULT_ADDR", "VAULT_TOKEN"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "vault_openai", id: "value" },
      },
    },
  },
}
```

### `sops`

```json5
{
  secrets: {
    providers: {
      sops_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/sops",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["-d", "--extract", '["providers"]["openai"]["apiKey"]', "/path/to/secrets.enc.json"],
        passEnv: ["SOPS_AGE_KEY_FILE"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "sops_openai", id: "value" },
      },
    },
  },
}
```

## Matériel d'authentification SSH Sandbox

Le backend Sandbox principal `ssh` prend également en charge les SecretRefs pour le matériel d'authentification SSH :

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        ssh: {
          target: "user@gateway-host:22",
          identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

Comportement à l'exécution :

- OpenClaw résout ces références lors de l'activation du bac à sable (sandbox), et pas paresseusement lors de chaque appel SSH.
- Les valeurs résolues sont écrites dans des fichiers temporaires avec des autorisations restrictives et utilisées dans la configuration SSH générée.
- Si le backend de bac à sable effectif n'est pas `ssh`, ces références restent inactives et ne bloquent pas le démarrage.

## Surface des informations d'identification prise en charge

Les informations d'identification canoniques prises en charge et non prises en charge sont répertoriées dans :

- [Surface des informations d'identification SecretRef](/fr/reference/secretref-credential-surface)

Les informations d'identification créées ou rotatives à l'exécution ainsi que le matériel d'actualisation OAuth sont intentionnellement exclus de la résolution SecretRef en lecture seule.

## Comportement requis et priorité

- Champ sans référence : inchangé.
- Champ avec une référence : requis sur les surfaces actives lors de l'activation.
- Si le texte en clair et la référence sont tous deux présents, la référence a priorité sur les chemins de priorité pris en charge.

Signaux d'avertissement et d'audit :

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (avertissement à l'exécution)
- `REF_SHADOWED` (constatation d'audit lorsque les informations d'identification `auth-profiles.json` ont priorité sur les références `openclaw.json`)

Comportement de compatibilité Google Chat :

- `serviceAccountRef` a priorité sur `serviceAccount` en texte clair.
- La valeur en texte clair est ignorée lorsque la référence sœur est définie.

## Déclencheurs d'activation

L'activation des secrets s'exécute sur :

- Démarrage (prévol plus activation finale)
- Chemin d'application à chaud (hot-apply) du rechargement de la configuration
- Chemin de vérification de redémarrage du rechargement de la configuration
- Rechargement manuel via `secrets.reload`

Contrat d'activation :

- En cas de succès, l'instantané est échangé de manière atomique.
- Un échec au démarrage interrompt le démarrage de la passerelle.
- Un échec du rechargement à l'exécution conserve le dernier instantané en état de marche.
- Fournir un jeton de canal explicite par appel à un appel d'assistant/outbound tool ne déclenche pas l'activation de SecretRef ; les points d'activation restent le démarrage, le rechargement et `secrets.reload` explicite.

## Signaux dégradés et récupérés

Lorsque l'activation au moment du rechargement échoue après un état sain, OpenClaw passe dans un état dégradé des secrets.

Codes d'événement système et de journal uniques :

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

Comportement :

- Dégradé : l'exécution conserve le dernier instantané en état de marche.
- Récupéré : émis une fois après la prochaine activation réussie.
- Les échecs répétés alors que le système est déjà dégradé génèrent des avertissements dans les journaux mais ne spamment pas les événements.
- L'échec rapide au démarrage n'émet pas d'événements dégradés car l'exécution n'est jamais devenue active.

## Résolution du chemin de commande

Les chemins de commande peuvent opter pour la résolution SecretRef prise en charge via le RPC d'instantané de la passerelle RPC.

Il existe deux comportements généraux :

- Les chemins de commande stricts (par exemple, les chemins de mémoire distante `openclaw memory` et `openclaw qr --remote`) lisent à partir de l'instantané actif et échouent rapidement lorsqu'un SecretRef requis n'est pas disponible.
- Les chemins de commande en lecture seule (par exemple, `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, `openclaw security audit`, et les flux de réparation de configuration/doctor en lecture seule) préfèrent également l'instantané actif, mais se dégradent au lieu d'interrompre lorsqu'un SecretRef ciblé n'est pas disponible dans ce chemin de commande.

Comportement en lecture seule :

- Lorsque la passerelle est en cours d'exécution, ces commandes lisent d'abord à partir de l'instantané actif.
- Si la résolution de la passerelle est incomplète ou si la passerelle n'est pas disponible, elles tentent un repli local ciblé pour la surface de commande spécifique.
- Si un SecretRef ciblé est toujours indisponible, la commande continue avec une sortie en lecture seule dégradée et des diagnostics explicites tels que « configuré mais indisponible dans ce chemin de commande ».
- Ce comportement dégradé est uniquement local à la commande. Il n'affaiblit pas le démarrage, le rechargement ou les chemins d'envoi/d'authentification de l'exécution.

Autres notes :

- L'actualisation de l'instantané après la rotation du secret principal est gérée par `openclaw secrets reload`.
- Méthode Gateway RPC utilisée par ces chemins de commande : `secrets.resolve`.

## Workflow d'audit et de configuration

Flux de l'opérateur par défaut :

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

Les résultats incluent :

- valeurs en clair au repos (`openclaw.json`, `auth-profiles.json`, `.env` et `agents/*/agent/models.json` générés)
- résidus d'en-têtes de fournisseur sensibles en clair dans les entrées `models.json` générées
- références non résolues
- masquage par priorité (`auth-profiles.json` prioritaire sur les références `openclaw.json`)
- résidus hérités (`auth.json`, rappels OAuth)

Note sur l'exécution :

- Par défaut, l'audit ignore les vérifications de résolubilité des SecretRef d'exécution pour éviter les effets secondaires des commandes.
- Utilisez `openclaw secrets audit --allow-exec` pour exécuter les fournisseurs d'exécution pendant l'audit.

Note sur les résidus d'en-tête :

- La détection d'en-têtes de fournisseur sensibles est basée sur une heuristique de nom (noms et fragments d'en-têtes d'authentification/d'identification courants tels que `authorization`, `x-api-key`, `token`, `secret`, `password` et `credential`).

### `secrets configure`

Assistant interactif qui :

- configure d'abord `secrets.providers` (`env`/`file`/`exec`, ajouter/modifier/supprimer)
- vous permet de sélectionner les champs porteurs de secrets pris en charge dans `openclaw.json` ainsi que `auth-profiles.json` pour une portée d'agent
- peut créer un nouveau mappage `auth-profiles.json` directement dans le sélecteur de cible
- capture les détails du SecretRef (`source`, `provider`, `id`)
- exécute la résolution préliminaire
- peut s'appliquer immédiatement

Note sur l'exécution :

- La vérification préliminaire ignore les vérifications de SecretRef d'exécution sauf si `--allow-exec` est défini.
- Si vous appliquez directement à partir de `configure --apply` et que le plan inclut des références/fournisseurs d'exécution, gardez `--allow-exec` défini pour l'étape d'application également.

Modes utiles :

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` appliquer les valeurs par défaut :

- nettoyer les identifiants statiques correspondants de `auth-profiles.json` pour les fournisseurs ciblés
- nettoyer les entrées `api_key` statiques héritées de `auth.json`
- nettoyer les lignes de secret connues correspondantes de `<config-dir>/.env`

### `secrets apply`

Appliquer un plan enregistré :

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

Note d'exécution :

- dry-run ignore les vérifications d'exécution à moins que `--allow-exec` ne soit défini.
- le mode d'écriture rejette les plans contenant des SecretRefs/fournisseurs d'exécution à moins que `--allow-exec` ne soit défini.

Pour les détails stricts du contrat cible/chemin et les règles de rejet exactes, voir :

- [Contrat de plan d'application des secrets](/fr/gateway/secrets-plan-contract)

## Politique de sécurité unidirectionnelle

OpenClaw n'écrit pas intentionnellement de sauvegardes de restauration contenant des valeurs de secret en texte brut historiques.

Modèle de sécurité :

- le prévol doit réussir avant le mode d'écriture
- l'activation de l'exécution est validée avant le commit
- apply met à jour les fichiers en utilisant un remplacement de fichier atomique et une restauration au mieux en cas d'échec

## Notes de compatibilité de l'authentification héritée

Pour les identifiants statiques, l'exécution ne dépend plus du stockage d'authentification hérité en texte brut.

- La source d'identifiants de l'exécution est l'instantané en mémoire résolu.
- Les entrées `api_key` statiques héritées sont nettoyées lorsqu'elles sont découvertes.
- Le comportement de compatibilité lié à OAuth reste séparé.

## Note sur l'interface Web

Certaines unions SecretInput sont plus faciles à configurer en mode éditeur brut qu'en mode formulaire.

## Documentation connexe

- Commandes CLI : [secrets](/fr/cli/secrets)
- Détails du contrat de plan : [Contrat de plan d'application des secrets](/fr/gateway/secrets-plan-contract)
- Surface des identifiants : [Surface des identifiants SecretRef](/fr/reference/secretref-credential-surface)
- Configuration de l'authentification : [Authentification](/fr/gateway/authentication)
- Posture de sécurité : [Sécurité](/fr/gateway/security)
- Priorité de l'environnement : [Variables d'environnement](/fr/help/environment)

import en from "/components/footer/en.mdx";

<en />
