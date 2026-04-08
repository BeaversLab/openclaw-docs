---
summary: "Gestion des secrets : contrat SecretRef, comportement de l'instantané d'exécution et nettoyage sécurisé à sens unique"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Gestion des secrets"
---

# Gestion des secrets

OpenClaw prend en charge les SecretRef additives, ce qui permet de ne pas stocker les identifiants pris en charge en texte clair dans la configuration.

Le texte brut fonctionne toujours. Les SecretRef sont facultatifs pour chaque identifiant.

## Objectifs et modèle d'exécution

Les secrets sont résolus dans un instantané d'exécution en mémoire.

- La résolution est effectuée avec empressement lors de l'activation, et non de manière différée sur les chemins de requête.
- Le démarrage échoue rapidement lorsqu'une SecretRef effectivement active ne peut pas être résolue.
- Le rechargement utilise un échange atomique : succès complet, ou conservation du dernier instantané valide connu.
- Les violations de politique SecretRef (par exemple, profils d'authentification en mode OAuth combinés avec une entrée SecretRef) échouent l'activation avant l'échange de l'exécution.
- Les requêtes d'exécution lisent uniquement à partir de l'instantané actif en mémoire.
- Après la première activation/chargement réussi de la configuration, les chemins de code d'exécution continuent de lire cet instantané actif en mémoire jusqu'à ce qu'un rechargement réussi l'échange.
- Les chemins de livraison sortants lisent également à partir de cet instantané actif (par exemple, la livraison de réponse/fil de discussion Discord et l'envoi d'action Telegram) ; ils ne résolvent pas les SecretRefs à chaque envoi.

Cela permet de garder les pannes des fournisseurs de secrets hors des chemins de requêtes à chaud.

## Filtrage de la surface active

Les SecretRefs sont validés uniquement sur les surfaces effectivement actives.

- Surfaces activées : les références non résolues bloquent le démarrage/rechargement.
- Surfaces inactives : les références non résolues ne bloquent pas le démarrage/rechargement.
- Les références inactives émettent des diagnostics non fatals avec le code `SECRETS_REF_IGNORED_INACTIVE_SURFACE`.

Exemples de surfaces inactives :

- Entrées de canal/compte désactivées.
- Identifiants de canal de niveau supérieur qu'aucun compte activé n'hérite.
- Surfaces d'outil/fonctionnalité désactivées.
- Clés spécifiques au fournisseur de recherche Web qui ne sont pas sélectionnées par `tools.web.search.provider`.
  En mode automatique (fournisseur non défini), les clés sont consultées par priorité pour la détection automatique du fournisseur jusqu'à ce que l'une soit résolue.
  Après sélection, les clés des fournisseurs non sélectionnés sont traitées comme inactives jusqu'à ce qu'elles soient sélectionnées.
- Le matériel d'authentification SSH du bac à sable (`agents.defaults.sandbox.ssh.identityData`,
  `certificateData`, `knownHostsData`, plus les remplacements par agent) n'est actif que
  lorsque le backend de bac à sable effectif est `ssh` pour l'agent par défaut ou un agent activé.
- Les SecretRefs `gateway.remote.token` / `gateway.remote.password` sont actifs si l'une de ces conditions est vraie :
  - `gateway.mode=remote`
  - `gateway.remote.url` est configuré
  - `gateway.tailscale.mode` est `serve` ou `funnel`
  - En mode local sans ces surfaces distantes :
    - `gateway.remote.token` est actif lorsque l'auth par jeton peut l'emporter et qu'aucun jeton d'env/auth n'est configuré.
    - `gateway.remote.password` est actif uniquement lorsque l'auth par mot de passe peut l'emporter et qu'aucun mot de passe d'env/auth n'est configuré.
- Le SecretRef `gateway.auth.token` est inactif pour la résolution de l'auth au démarrage lorsque `OPENCLAW_GATEWAY_TOKEN` est défini, car l'entrée de jeton d'env l'emporte pour cette exécution.

## Diagnostics de la surface d'auth Gateway

Lorsqu'un SecretRef est configuré sur `gateway.auth.token`, `gateway.auth.password`,
`gateway.remote.token` ou `gateway.remote.password`, le démarrage/le rechargement de la Gateway enregistre
explicitement l'état de la surface :

- `active` : le SecretRef fait partie de la surface d'auth effective et doit être résolu.
- `inactive` : le SecretRef est ignoré pour cette exécution car une autre surface d'auth l'emporte, ou
  car l'auth distante est désactivée/inactive.

Ces entrées sont enregistrées avec `SECRETS_GATEWAY_AUTH_SURFACE` et incluent la raison utilisée par la
stratégie de surface active, afin que vous puissiez voir pourquoi une information d'identification a été traitée comme active ou inactive.

## Prévol de référence d'onboarding

Lorsque l'onboarding s'exécute en mode interactif et que vous choisissez le stockage SecretRef, OpenClaw exécute une validation préalable avant l'enregistrement :

- Références d'env : valide le nom de la env var et confirme qu'une valeur non vide est visible lors de la configuration.
- Références de provider (`file` ou `exec`) : valide la sélection du provider, résout `id` et vérifie le type de la valeur résolue.
- Chemin de réutilisation du démarrage rapide : lorsque `gateway.auth.token` est déjà un SecretRef, l'onboarding le résout avant l'amorçage de la sonde/du tableau de bord (pour les références `env`, `file` et `exec`) en utilisant la même porte d'échec rapide.

Si la validation échoue, l'onboarding affiche l'erreur et vous permet de réessayer.

## Contrat SecretRef

Utilisez une forme d'objet partout :

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
- `id` ne doit pas contenir `.` ou `..` en tant que segments de chemin délimités par des barres obliques (par exemple `a/../b` est rejeté)

## Configuration du provider

Définissez les providers sous `secrets.providers` :

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

### Provider Env

- Liste d'autorisation (allowlist) optionnelle via `allowlist`.
- Les valeurs d'environnement manquantes ou vides entraînent l'échec de la résolution.

### Provider File

- Lit un fichier local à partir de `path`.
- `mode: "json"` attend une charge utile d'objet JSON et résout `id` comme pointeur.
- `mode: "singleValue"` attend l'ID de référence `"value"` et renvoie le contenu du fichier.
- Le chemin doit réussir les vérifications de propriétaire/d'autorisations.
- Remarque sur le mode échec sécurisé (fail-closed) Windows : si la vérification ACL est indisponible pour un chemin, la résolution échoue. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce provider pour contourner les vérifications de sécurité du chemin.

### Provider Exec

- Exécute le chemin binaire absolu configuré, sans shell.
- Par défaut, `command` doit pointer vers un fichier régulier (pas un lien symbolique).
- Définissez `allowSymlinkCommand: true` pour autoriser les chemins de commande symboliques (par exemple les shims Homebrew). OpenClaw valide le chemin cible résolu.
- Associez `allowSymlinkCommand` à `trustedDirs` pour les chemins du gestionnaire de paquets (par exemple `["/opt/homebrew"]`).
- Prend en charge le délai d'expiration (timeout), le délai d'absence de sortie, les limites d'octets de sortie, la liste d'autorisation env et les répertoires de confiance.
- Remarque sur l'échec fermé (fail-closed) Windows : si la vérification ACL n'est pas disponible pour le chemin de commande, la résolution échoue. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

Charge utile de la requête (stdin) :

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

Charge utile de la réponse (stdout) :

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

Erreurs optionnelles par ID :

```json
{
  "protocolVersion": 1,
  "values": {},
  "errors": { "providers/openai/apiKey": { "message": "not found" } }
}
```

## Exemples d'intégration Exec

### CLI 1Password

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

### CLI HashiCorp Vault

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

## Variables d'environnement du serveur MCP

Les variables d'environnement du serveur MCP configurées via `plugins.entries.acpx.config.mcpServers` prennent en charge SecretInput. Cela permet de garder les clés API et les jetons hors de la configuration en texte brut :

```json5
{
  plugins: {
    entries: {
      acpx: {
        enabled: true,
        config: {
          mcpServers: {
            github: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-github"],
              env: {
                GITHUB_PERSONAL_ACCESS_TOKEN: {
                  source: "env",
                  provider: "default",
                  id: "MCP_GITHUB_PAT",
                },
              },
            },
          },
        },
      },
    },
  },
}
```

Les valeurs de chaîne en texte brut fonctionnent toujours. Les références de modèle d'environnement telles que `${MCP_SERVER_API_KEY}` et les objets SecretRef sont résolues lors de l'activation de la passerelle avant que le processus du serveur MCP ne soit généré. Comme pour les autres surfaces SecretRef, les références non résolues ne bloquent l'activation que lorsque le plugin `acpx` est effectivement actif.

## Matériel d'authentification SSH Sandbox

Le backend de bac à sable `ssh` prend également en charge les SecretRefs pour le matériel d'authentification SSH :

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

- OpenClaw résout ces références lors de l'activation du bac à sable, et pas paresseusement lors de chaque appel SSH.
- Les valeurs résolues sont écrites dans des fichiers temporaires avec des autorisations restrictives et utilisées dans la configuration SSH générée.
- Si le backend de bac à sable effectif n'est pas `ssh`, ces références restent inactives et ne bloquent pas le démarrage.

## Surface des informations d'identification prises en charge

Les informations d'identification prises en charge et non prises en charge de manière canonique sont répertoriées dans :

- [Surface des informations d'identification SecretRef](/en/reference/secretref-credential-surface)

Les informations d'identification créées à l'exécution ou rotatives et le matériel d'actualisation OAuth sont intentionnellement exclus de la résolution SecretRef en lecture seule.

## Comportement requis et priorité

- Champ sans référence : inchangé.
- Champ avec une référence : requis sur les surfaces actives lors de l'activation.
- Si le texte brut et une référence sont tous deux présents, la référence prend la priorité sur les chemins de priorité pris en charge.
- La sentinelle de rédaction `__OPENCLAW_REDACTED__` est réservée pour la rédaction/restauration de la configuration interne et est rejetée en tant que donnée de configuration soumise littérale.

Avertissements et signaux d'audit :

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (avertissement d'exécution)
- `REF_SHADOWED` (résultat d'audit lorsque les informations d'identification `auth-profiles.json` prennent le pas sur les références `openclaw.json`)

Comportement de compatibilité Google Chat :

- `serviceAccountRef` prend le pas sur `serviceAccount` en texte brut.
- La valeur en texte brut est ignorée lorsque la référence sibling est définie.

## Déclencheurs d'activation

L'activation des secrets s'exécute sur :

- Démarrage (pré-vol plus activation finale)
- Chemin d'application à chaud du rechargement de la configuration
- Chemin de vérification de redémarrage du rechargement de la configuration
- Rechargement manuel via `secrets.reload`
- Pré-vol d'écriture de configuration Gateway RPC (`config.set` / `config.apply` / `config.patch`) pour la résolubilité SecretRef de la surface active dans la charge utile de configuration soumise avant la persistance des modifications

Contrat d'activation :

- Le succès permute l'instantané de manière atomique.
- L'échec du démarrage interrompt le démarrage de la passerelle.
- L'échec du rechargement en exécution conserve le dernier instantané valide connu.
- L'échec du pré-vol Write-RPC rejette la configuration soumise et conserve à la fois la configuration sur disque et l'instantané d'exécution actif inchangés.
- Fournir un jeton de canal explicite par appel à un appel d'outil/helper sortant ne déclenche pas l'activation de SecretRef ; les points d'activation restent le démarrage, le rechargement et `secrets.reload` explicite.

## Signaux dégradés et rétablis

Lorsque l'activation au moment du rechargement échoue après un état sain, OpenClaw passe à un état de secrets dégradés.

Codes d'événement système et de journal uniques :

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

Comportement :

- Dégradé : l'exécution conserve le dernier instantané valide connu.
- Rétabli : émis une fois après la prochaine activation réussie.
- Les échecs répétés alors que le système est déjà dégradé enregistrent des avertissements mais ne spamment pas les événements.
- L'échec rapide au démarrage n'émet pas d'événements dégradés car l'exécution n'est jamais devenue active.

## Résolution du chemin de commande

Les chemins de commande peuvent opter pour la résolution SecretRef prise en charge via RPC d'instantané de passerelle.

Il existe deux comportements généraux :

- Les chemins de commande stricts (par exemple `openclaw memory` chemins de mémoire distante et `openclaw qr --remote` lorsqu'il a besoin de références de secret partagé distant) lisent le snapshot actif et échouent rapidement lorsqu'une SecretRef requise est indisponible.
- Les chemins de commande en lecture seule (par exemple `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, `openclaw security audit`, et les flux de réparation de configuration/doctor en lecture seule) préfèrent également l'instantané actif, mais dégradent au lieu d'abandonner lorsqu'une SecretRef ciblée n'est pas disponible dans ce chemin de commande.

Comportement en lecture seule :

- Lorsque la passerelle est en cours d'exécution, ces commandes lisent d'abord l'instantané actif.
- Si la résolution de la passerelle est incomplète ou si la passerelle est indisponible, elles tentent un repli local ciblé pour la surface de commande spécifique.
- Si une SecretRef ciblée est toujours indisponible, la commande continue avec une sortie en lecture seule dégradée et des diagnostics explicites tels que « configuré mais indisponible dans ce chemin de commande ».
- Ce comportement dégradé est uniquement local à la commande. Il n'affaiblit pas le démarrage d'exécution, le rechargement, ou les chemins d'envoi/d'authentification.

Autres notes :

- L'actualisation de l'instantané après la rotation des secrets backend est gérée par `openclaw secrets reload`.
- Méthode Gateway RPC utilisée par ces chemins de commande : `secrets.resolve`.

## Workflow d'audit et de configuration

Flux d'opérateur par défaut :

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

Les résultats incluent :

- les valeurs en clair au repos (`openclaw.json`, `auth-profiles.json`, `.env`, et `agents/*/agent/models.json` généré)
- les résidus d'en-tête de fournisseur sensibles en clair dans les entrées `models.json` générées
- les références non résolues
- le masquage par priorité (`auth-profiles.json` prenant la priorité sur les références `openclaw.json`)
- les résidus hérités (`auth.json`, rappels OAuth)

Note sur l'exécution :

- Par défaut, l'audit ignore les vérifications de résolubilité des SecretRef exec pour éviter les effets secondaires de la commande.
- Utilisez `openclaw secrets audit --allow-exec` pour exécuter les fournisseurs exec lors de l'audit.

Note sur les résidus d'en-tête :

- La détection d'en-tête de fournisseur sensible est basée sur une heuristique de nom (noms et fragments d'en-tête d'authentification/d'informations d'identification courants tels que `authorization`, `x-api-key`, `token`, `secret`, `password` et `credential`).

### `secrets configure`

Assistant interactif qui :

- configure `secrets.providers` d'abord (`env`/`file`/`exec`, ajouter/modifier/supprimer)
- vous permet de sélectionner les champs contenant des secrets pris en charge dans `openclaw.json` plus `auth-profiles.json` pour une portée d'agent
- peut créer un nouveau mappage `auth-profiles.json` directement dans le sélecteur de cible
- capture les détails SecretRef (`source`, `provider`, `id`)
- exécute la résolution préliminaire
- peut appliquer immédiatement

Note d'exécution :

- La phase préliminaire ignore les vérifications des SecretRef exec, sauf si `--allow-exec` est défini.
- Si vous appliquez directement à partir de `configure --apply` et que le plan inclut des refs/providers exec, gardez `--allow-exec` défini pour l'étape d'application également.

Modes utiles :

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` applique les valeurs par défaut :

- nettoie les identifiants statiques correspondants de `auth-profiles.json` pour les fournisseurs ciblés
- nettoie les entrées statiques héritées `api_key` de `auth.json`
- nettoie les lignes secrètes connues correspondantes de `<config-dir>/.env`

### `secrets apply`

Appliquer un plan enregistré :

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

Note d'exécution :

- dry-run ignore les vérifications exec, sauf si `--allow-exec` est défini.
- le mode write rejette les plans contenant des SecretRefs/providers exec, sauf si `--allow-exec` est défini.

Pour plus de détails sur le contrat cible/chemin strict et les règles de rejet exactes, voir :

- [Secrets Apply Plan Contract](/en/gateway/secrets-plan-contract)

## Politique de sécurité à sens unique

OpenClaw n'écrit pas intentionnellement de sauvegardes de restauration contenant des valeurs de secret en texte brut historiques.

Modèle de sécurité :

- la phase préliminaire doit réussir avant le mode écriture
- l'activation du runtime est validée avant le commit
- apply met à jour les fichiers en utilisant un remplacement de fichier atomique et une restauration de meilleur effort en cas d'échec

## Notes de compatibilité de l'auth héritée

Pour les identifiants statiques, le runtime ne dépend plus du stockage d'auth hérité en texte brut.

- La source des identifiants d'exécution est l'instantané résolu en mémoire.
- Les entrées statiques héritées `api_key` sont supprimées lorsqu'elles sont détectées.
- Le comportement de compatibilité lié à OAuth reste séparé.

## Remarque concernant l'interface Web

Certaines unions SecretInput sont plus faciles à configurer en mode éditeur brut qu'en mode formulaire.

## Documentation connexe

- Commandes CLI : [secrets](/en/cli/secrets)
- Détails du contrat de plan : [Secrets Apply Plan Contract](/en/gateway/secrets-plan-contract)
- Surface des identifiants : [SecretRef Credential Surface](/en/reference/secretref-credential-surface)
- Configuration de l'authentification : [Authentication](/en/gateway/authentication)
- Posture de sécurité : [Security](/en/gateway/security)
- Priorité de l'environnement : [Environment Variables](/en/help/environment)
