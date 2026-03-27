---
summary: "Gestion des secrets : contrat SecretRef, comportement de l'instantané d'exécution et nettoyage unidirectionnel sécurisé"
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
- Les requêtes d'exécution lisent uniquement l'instantané en mémoire actif.
- Les chemins de livraison sortants lisent également cet instantané actif (par exemple, livraison de réponses/fils de discussion Discord et envois d'actions Telegram) ; ils ne résolvent pas à nouveau les SecretRef à chaque envoi.

Cela permet de garder les pannes du fournisseur de secrets en dehors des chemins de requête à fort trafic.

## Filtrage de la surface active

Les SecretRef ne sont validées que sur les surfaces effectivement actives.

- Surfaces activées : les références non résolues bloquent le démarrage/le rechargement.
- Surfaces inactives : les références non résolues ne bloquent pas le démarrage/le rechargement.
- Les références inactives émettent des diagnostics non fatals avec le code `SECRETS_REF_IGNORED_INACTIVE_SURFACE`.

Exemples de surfaces inactives :

- Entrées de canal/compte désactivées.
- Identifiants de canal de niveau supérieur qu'aucun compte activé n'hérite.
- Surfaces d'outil/fonctionnalité désactivées.
- Clés spécifiques au provider de recherche Web qui ne sont pas sélectionnées par `tools.web.search.provider`.
  En mode automatique (provider non défini), les clés sont consultées par ordre de priorité pour la détection automatique du provider jusqu'à ce que l'une soit résolue.
  Après sélection, les clés du provider non sélectionné sont traitées comme inactives jusqu'à ce qu'elles soient sélectionnées.
- Les éléments d'authentification SSH du Sandbox (`agents.defaults.sandbox.ssh.identityData`,
  `certificateData`, `knownHostsData`, plus les remplacements par agent) sont actifs uniquement
  lorsque le backend effectif du Sandbox est `ssh` pour l'agent par défaut ou un agent activé.
- Les SecretRefs `gateway.remote.token` / `gateway.remote.password` sont actifs si l'une de ces conditions est vraie :
  - `gateway.mode=remote`
  - `gateway.remote.url` est configuré
  - `gateway.tailscale.mode` est `serve` ou `funnel`
  - En mode local sans ces surfaces distantes :
    - `gateway.remote.token` est actif lorsque l'authentification par jeton peut l'emporter et qu'aucun jeton d'authentification d'environnement n'est configuré.
    - `gateway.remote.password` est actif uniquement lorsque l'authentification par mot de passe peut l'emporter et qu'aucun mot de passe d'authentification d'environnement n'est configuré.
- `gateway.auth.token` SecretRef est inactif pour la résolution de l'auth au démarrage lorsque `OPENCLAW_GATEWAY_TOKEN` est défini, car la saisie du jeton d'environnement l'emporte pour cette exécution.

## Diagnostics de la surface d'authentification du Gateway

Lorsqu'un SecretRef est configuré sur `gateway.auth.token`, `gateway.auth.password`,
`gateway.remote.token` ou `gateway.remote.password`, les journaux de démarrage/rechargement de la passerelle consignent
explicitement l'état de la surface :

- `active` : le SecretRef fait partie de la surface d'auth effective et doit être résolu.
- `inactive` : le SecretRef est ignoré pour cette exécution car une autre surface d'auth l'emporte, ou
  parce que l'auth distante est désactivée/inactive.

Ces entrées sont journalisées avec `SECRETS_GATEWAY_AUTH_SURFACE` et incluent la raison utilisée par la
stratégie de surface active, afin que vous puissiez voir pourquoi une information d'identification a été traitée comme active ou inactive.

## Préflight de référence d'onboarding

Lorsque l'onboarding s'exécute en mode interactif et que vous choisissez le stockage SecretRef, OpenClaw exécute une validation préalable avant l'enregistrement :

- Références Env : valide le nom de la env var et confirme qu'une valeur non vide est visible lors de la configuration.
- Références de fournisseur (`file` ou `exec`) : valide la sélection du fournisseur, résout `id` et vérifie le type de valeur résolue.
- Chemin de réutilisation du démarrage rapide : lorsque `gateway.auth.token` est déjà un SecretRef, l'intégration le résout avant l'amorçage de la sonde/tableau de bord (pour les références `env`, `file` et `exec`) en utilisant la même porte d'échec rapide.

Si la validation échoue, l'onboarding affiche l'erreur et vous permet de réessayer.

## Contrat SecretRef

Utilisez une seule forme d'objet partout :

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
- `id` ne doit pas contenir `.` ou `..` en tant que segments de chemin séparés par des slashs (par exemple `a/../b` est rejeté)

## Configuration du provider

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

### Provider Env

- Liste blanche optionnelle via `allowlist`.
- Les valeurs d'env manquantes ou vides entraînent l'échec de la résolution.

### Fournisseur de fichier

- Lit le fichier local depuis `path`.
- `mode: "json"` attend une charge utile d'objet JSON et résout `id` comme pointeur.
- `mode: "singleValue"` attend l'id de référence `"value"` et retourne le contenu du fichier.
- Le chemin doit réussir les vérifications de propriété/d'autorisation.
- Note d'échec fermé Windows : si la vérification ACL n'est pas disponible pour un chemin, la résolution échoue. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

### Fournisseur Exec

- Exécute le chemin binaire absolu configuré, sans shell.
- Par défaut, `command` doit pointer vers un fichier régulier (pas un lien symbolique).
- Définissez `allowSymlinkCommand: true` pour autoriser les chemins de commande symboliques (par exemple les shims Homebrew). OpenClaw valide le chemin cible résolu.
- Associez `allowSymlinkCommand` à `trustedDirs` pour les chemins de gestionnaire de paquets (par exemple `["/opt/homebrew"]`).
- Prend en charge le délai d'attente, le délai d'attente sans sortie, les limites d'octets de sortie, la liste d'autorisation d'env et les répertoires de confiance.
- Note d'échec fermé Windows : si la vérification ACL n'est pas disponible pour le chemin de commande, la résolution échoue. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

Charge utile de la requête (stdin) :

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

Charge utile de la réponse (stdout) :

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

Erreurs facultatives par id :

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

Le backend de sandbox `ssh` prend également en charge les SecretRefs pour le matériel d'auth SSH :

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

- OpenClaw résout ces références lors de l'activation du sandbox, et non paresseusement lors de chaque appel SSH.
- Les valeurs résolues sont écrites dans des fichiers temporaires avec des autorisations restrictives et utilisées dans la configuration SSH générée.
- Si le backend de sandbox effectif n'est pas `ssh`, ces références restent inactives et ne bloquent pas le démarrage.

## Surface d'identification prise en charge

Les identifiants pris en charge et non pris en charge de manière canonique sont répertoriés dans :

- [Surface d'identifiants SecretRef](/fr/reference/secretref-credential-surface)

Les informations d'identification créées à l'exécution ou rotatives et le matériel de rafraîchissement OAuth sont intentionnellement exclus de la résolution SecretRef en lecture seule.

## Comportement et priorité requis

- Champ sans référence : inchangé.
- Champ avec une référence : requis sur les surfaces actives lors de l'activation.
- Si le texte en clair et une référence sont tous deux présents, la référence prend la priorité sur les chemins de priorité pris en charge.

Signaux d'avertissement et d'audit :

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (avertissement d'exécution)
- `REF_SHADOWED` (constat d'audit lorsque les identifiants `auth-profiles.json` priment sur les références `openclaw.json`)

Comportement de compatibilité Google Chat :

- `serviceAccountRef` a priorité sur `serviceAccount` en texte clair.
- La valeur en texte clair est ignorée lorsqu'une référence de niveau frère est définie.

## Déclencheurs d'activation

L'activation des secrets s'exécute sur :

- Démarrage (pré-vol plus activation finale)
- Chemin d'application à chaud du rechargement de la configuration
- Chemin de vérification de redémarrage du rechargement de la configuration
- Rechargement manuel via `secrets.reload`

Contrat d'activation :

- Le succès échange l'instantané de manière atomique.
- L'échec du démarrage interrompt le démarrage de la passerelle.
- L'échec du rechargement à l'exécution conserve le dernier instantané valide connu (last-known-good).
- Fournir un jeton de canal par appel explicite à un appel d'assistant/out sortant ne déclenche pas l'activation de SecretRef ; les points d'activation restent le démarrage, le rechargement et `secrets.reload` explicite.

## Signaux dégradés et rétablis

Lorsque l'activation au moment du rechargement échoue après un état sain, OpenClaw passe dans un état de secrets dégradé.

Codes d'événement système et de journal ponctuels :

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

Comportement :

- Dégradé : l'exécution conserve le dernier instantané valide connu.
- Rétabli : émis une fois après la prochaine activation réussie.
- Les échecs répétés alors que le système est déjà dégradé enregistrent des avertissements mais ne spamment pas les événements.
- L'échec rapide (fail-fast) au démarrage n'émet pas d'événements dégradés car l'exécution n'est jamais devenue active.

## Résolution du chemin de commande

Les chemins de commande peuvent opter pour la résolution SecretRef prise en charge via le RPC d'instantané de passerelle.

Il existe deux comportements généraux :

- Les chemins de commande stricts (par exemple les chemins de mémoire distante `openclaw memory` et `openclaw qr --remote`) lisent le snapshot actif et échouent rapidement lorsqu'une SecretRef requise n'est pas disponible.
- Les chemins de commande en lecture seule (par exemple `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, `openclaw security audit`, et les flux de réparation de configuration/doctor en lecture seule) privilégient également le snapshot actif, mais se dégradent au lieu d'abandonner lorsqu'une SecretRef ciblée n'est pas disponible dans ce chemin de commande.

Comportement en lecture seule :

- Lorsque la passerelle est en cours d'exécution, ces commandes lisent d'abord l'instantané actif.
- Si la résolution de la passerelle est incomplète ou si la passerelle n'est pas disponible, elles tentent un repli local ciblé pour la surface de commande spécifique.
- Si une SecretRef ciblée est toujours indisponible, la commande continue avec une sortie en lecture seule dégradée et des diagnostics explicites tels que « configuré mais indisponible dans ce chemin de commande ».
- Ce comportement dégradé est uniquement local à la commande. Il n'affaiblit pas le démarrage de l'exécution, le rechargement ou les chemins d'envoi/d'authentification.

Autres notes :

- L'actualisation du snapshot après la rotation des secrets du backend est gérée par `openclaw secrets reload`.
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

- valeurs en clair au repos (`openclaw.json`, `auth-profiles.json`, `.env`, et `agents/*/agent/models.json` généré)
- résidus d'en-têtes de fournisseur sensibles en clair dans les entrées `models.json` générées
- les références non résolues
- masquage par priorité (`auth-profiles.json` prioritaire sur les références `openclaw.json`)
- résidus hérités (`auth.json`, rappels OAuth)

Remarque concernant Exec :

- Par défaut, l'audit ignore les vérifications de résolubilité des SecretRef Exec pour éviter les effets secondaires des commandes.
- Utilisez `openclaw secrets audit --allow-exec` pour exécuter les fournisseurs exec lors de l'audit.

Remarque concernant les résidus d'en-tête :

- La détection d'en-tête de fournisseur sensible est basée sur des heuristiques de nom (noms et fragments d'en-têtes d'authentification/d'identification courants tels que `authorization`, `x-api-key`, `token`, `secret`, `password`, et `credential`).

### `secrets configure`

Assistant interactif qui :

- configure `secrets.providers` en premier (`env`/`file`/`exec`, ajouter/modifier/supprimer)
- vous permet de sélectionner les champs de secret pris en charge dans `openclaw.json` ainsi que `auth-profiles.json` pour une portée d'agent
- peut créer un nouveau mappage `auth-profiles.json` directement dans le sélecteur de cible
- capture les détails du SecretRef (`source`, `provider`, `id`)
- exécute la résolution préliminaire
- peut appliquer immédiatement

Remarque concernant Exec :

- Preflight ignore les vérifications de SecretRef exec à moins que `--allow-exec` ne soit défini.
- Si vous appliquez directement depuis `configure --apply` et que le plan inclut des refs/providers exec, gardez `--allow-exec` défini pour l'étape d'application également.

Modes utiles :

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` valeurs par défaut d'application :

- nettoyer les identifiants statiques correspondants de `auth-profiles.json` pour les fournisseurs ciblés
- nettoyer les entrées statiques héritées `api_key` de `auth.json`
- nettoyer les lignes de secrètes connues correspondantes de `<config-dir>/.env`

### `secrets apply`

Appliquer un plan enregistré :

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

Remarque concernant Exec :

- dry-run ignore les vérifications exec à moins que `--allow-exec` ne soit défini.
- le mode d'écriture rejette les plans contenant des SecretRefs/providers exec à moins que `--allow-exec` ne soit défini.

Pour les détails stricts du contrat cible/chemin et les règles de rejet exactes, voir :

- [Contrat de plan d'application des secrets](/fr/gateway/secrets-plan-contract)

## Politique de sécurité à sens unique

OpenClaw n'écrit pas intentionnellement de sauvegardes de retour en arrière contenant des valeurs historiques de secrets en texte brut.

Modèle de sécurité :

- la pré-vérification doit réussir avant le mode écriture
- l'activation au runtime est validée avant le commit
- apply met à jour les fichiers en utilisant un remplacement atomique de fichiers et tente une restauration en cas d'échec

## Notes de compatibilité de l'authentification héritée

Pour les identifiants statiques, le runtime ne dépend plus du stockage d'authentification héritée en texte brut.

- La source d'identifiants du runtime est l'instantané résolu en mémoire.
- Les entrées statiques héritées `api_key` sont nettoyées lorsqu'elles sont découvertes.
- Le comportement de compatibilité lié à OAuth reste séparé.

## Note sur l'interface Web

Certaines unions SecretInput sont plus faciles à configurer en mode éditeur brut qu'en mode formulaire.

## Documentation connexe

- Commandes CLI : [secrets](/fr/cli/secrets)
- Détails du contrat de plan : [Contrat de plan d'application des secrets](/fr/gateway/secrets-plan-contract)
- Surface d'identification : [Surface d'identification SecretRef](/fr/reference/secretref-credential-surface)
- Configuration de l'authentification : [Authentification](/fr/gateway/authentication)
- Posture de sécurité : [Sécurité](/fr/gateway/security)
- Priorité de l'environnement : [Variables d'environnement](/fr/help/environment)

import fr from "/components/footer/fr.mdx";

<fr />
