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
- Clés spécifiques au fournisseur de recherche Web qui ne sont pas sélectionnées par `tools.web.search.provider`.
  En mode automatique (fournisseur non défini), les clés sont consultées par priorité pour la détection automatique du fournisseur jusqu'à ce que l'une soit résolue.
  Après la sélection, les clés des fournisseurs non sélectionnés sont traitées comme inactives jusqu'à ce qu'elles soient sélectionnées.
- Les SecretRef `gateway.remote.token` / `gateway.remote.password` sont actifs si l'une des conditions suivantes est vraie :
  - `gateway.mode=remote`
  - `gateway.remote.url` est configuré
  - `gateway.tailscale.mode` est `serve` ou `funnel`
  - En mode local sans ces surfaces distantes :
    - `gateway.remote.token` est actif lorsque l'auth par jeton peut l'emporter et qu'aucun jeton env/auth n'est configuré.
    - `gateway.remote.password` est actif uniquement lorsque l'auth par mot de passe peut l'emporter et qu'aucun mot de passe env/auth n'est configuré.
- Le SecretRef `gateway.auth.token` est inactif pour la résolution de l'auth au démarrage lorsque `OPENCLAW_GATEWAY_TOKEN` (ou `CLAWDBOT_GATEWAY_TOKEN`) est défini, car l'entrée de jeton env l'emporte pour cet environnement d'exécution.

## Diagnostics de la surface d'auth Gateway

Lorsqu'un SecretRef est configuré sur `gateway.auth.token`, `gateway.auth.password`,
`gateway.remote.token` ou `gateway.remote.password`, les journaux de démarrage/rechargement de la passerelle enregistrent
explicitement l'état de la surface :

- `active` : le SecretRef fait partie de la surface d'auth effective et doit être résolu.
- `inactive` : le SecretRef est ignoré pour cet environnement d'exécution car une autre surface d'auth l'emporte, ou
  car l'auth distante est désactivée/inactive.

Ces entrées sont journalisées avec `SECRETS_GATEWAY_AUTH_SURFACE` et incluent la raison utilisée par la
stratégie de surface active, afin que vous puissiez voir pourquoi une information d'identification a été traitée comme active ou inactive.

## Prévol de référence d'onboarding

Lorsque l'onboarding s'exécute en mode interactif et que vous choisissez le stockage SecretRef, OpenClaw exécute une validation prévol avant l'enregistrement :

- Références Env : valide le nom de la variable d'environnement et confirme qu'une valeur non vide est visible lors de l'onboarding.
- Références de fournisseur (`file` ou `exec`) : valide la sélection du fournisseur, résout `id` et vérifie le type de valeur résolue.
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
- `id` ne doit pas contenir `.` ou `..` comme segments de chemin délimités par des slashs (par exemple `a/../b` est rejeté)

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

- Liste blanche facultative via `allowlist`.
- Les valeurs d'environnement manquantes ou vides entraînent l'échec de la résolution.

### Fournisseur File

- Lit un fichier local à partir de `path`.
- `mode: "json"` attend une charge utile d'objet JSON et résout `id` comme pointeur.
- `mode: "singleValue"` attend l'ID de référence `"value"` et retourne le contenu du fichier.
- Le chemin doit réussir les vérifications de propriété/d'autorisation.
- Remarque sur le mode échec-fermé (fail-closed) de Windows : si la vérification de l'ACL n'est pas disponible pour un chemin, la résolution échoue. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

### Fournisseur Exec

- Exécute le chemin binaire absolu configuré, sans shell.
- Par défaut, `command` doit pointer vers un fichier régulier (pas un lien symbolique).
- Définissez `allowSymlinkCommand: true` pour autoriser les chemins de commande symboliques (par exemple, les shims Homebrew). OpenClaw valide le chemin cible résolu.
- Associez `allowSymlinkCommand` avec `trustedDirs` pour les chemins des gestionnaires de packages (par exemple `["/opt/homebrew"]`).
- Prend en charge le délai d'expiration, le délai d'expiration sans sortie, les limites d'octets de sortie, la liste d'autorisation des variables d'environnement et les répertoires approuvés.
- Remarque sur le comportement échec-fermé Windows : si la vérification ACL est indisponible pour le chemin de commande, la résolution échoue. Pour les chemins approuvés uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

Charge utile de la demande (stdin) :

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

## Surface d'identification prise en charge

Les identifiants pris en charge et non pris en charge de manière canonique sont répertoriés dans :

- [Surface d'identification SecretRef](/fr/reference/secretref-credential-surface)

Les identifiants créés ou dynamiques à l'exécution et le matériel d'actualisation OAuth sont intentionnellement exclus de la résolution SecretRef en lecture seule.

## Comportement et priorité requis

- Champ sans référence : inchangé.
- Champ avec une référence : requis sur les surfaces actives lors de l'activation.
- Si le texte brut et la référence sont tous deux présents, la référence a priorité sur les chemins de priorité pris en charge.

Signaux d'avertissement et d'audit :

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (avertissement d'exécution)
- `REF_SHADOWED` (constatation d'audit lorsque les identifiants `auth-profiles.json` priment sur les références `openclaw.json`)

Comportement de compatibilité Google Chat :

- `serviceAccountRef` est prioritaire sur le `serviceAccount` en texte brut.
- La valeur en texte brut est ignorée lorsqu'une référence sœur est définie.

## Déclencheurs d'activation

L'activation des secrets s'exécute sur :

- Démarrage (prévol plus activation finale)
- Chemin d'application à chaud du rechargement de la configuration
- Chemin de vérification de redémarrage du rechargement de la configuration
- Rechargement manuel via `secrets.reload`

Contrat d'activation :

- Le succès échange l'instantané de manière atomique.
- L'échec du démarrage interrompt le démarrage de la passerelle.
- L'échec du rechargement à l'exécution conserve le dernier instantané valide connu.
- Fournir un jeton de canal explicite par appel à un appel d'assistant/outbound tool ne déclenche pas l'activation de SecretRef ; les points d'activation restent le démarrage, le rechargement et `secrets.reload` explicite.

## Signaux dégradés et récupérés

Lorsque l'activation lors du rechargement échoue après un état sain, OpenClaw entre dans un état de secrets dégradé.

Codes d'événement système et de journal uniques :

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

Comportement :

- Dégradé : l'exécution conserve le dernier instantané valide connu.
- Récupéré : émis une fois après la prochaine activation réussie.
- Les échecs répétés alors que le système est déjà dégradé enregistrent des avertissements mais ne spamment pas les événements.
- L'échec rapide au démarrage n'émet pas d'événements dégradés car l'exécution n'est jamais devenue active.

## Résolution du chemin de commande

Les chemins de commande peuvent opter pour la résolution SecretRef prise en charge via le RPC d'instantané de passerelle RPC.

Il existe deux comportements généraux :

- Les chemins de commande stricts (par exemple `openclaw memory` chemins de mémoire distante et `openclaw qr --remote`) lisent à partir de l'instantané actif et échouent rapidement lorsqu'un SecretRef requis n'est pas disponible.
- Les chemins de commande en lecture seule (par exemple `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve` et les flux de réparation doctor/config en lecture seule) préfèrent également l'instantané actif, mais se dégradent au lieu d'abandonner lorsqu'un SecretRef ciblé n'est pas disponible dans ce chemin de commande.

Comportement en lecture seule :

- Lorsque la passerelle est en cours d'exécution, ces commandes lisent d'abord à partir de l'instantané actif.
- Si la résolution de la passerelle est incomplète ou si la passerelle n'est pas disponible, elles tentent un retour local ciblé pour la surface de commande spécifique.
- Si un SecretRef ciblé est toujours indisponible, la commande continue avec une sortie en lecture seule dégradée et des diagnostics explicites tels que "configuré mais indisponible dans ce chemin de commande".
- Ce comportement dégradé est uniquement local à la commande. Il n'affaiblit pas le démarrage de l'exécution (runtime), le rechargement, ou les chemins d'envoi/d'authentification.

Autres notes :

- L'actualisation de l'instantané après la rotation du secret backend est gérée par `openclaw secrets reload`.
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

- des valeurs en clair au repos (`openclaw.json`, `auth-profiles.json`, `.env`, et `agents/*/agent/models.json` généré)
- des résidus d'en-têtes de fournisseur sensibles en clair dans les entrées `models.json` générées
- des références non résolues
- un masquage par priorité (`auth-profiles.json` prenant la priorité sur les références `openclaw.json`)
- des résidus hérités (`auth.json`, rappels OAuth)

Note sur les résidus d'en-tête :

- La détection d'en-têtes de fournisseur sensibles est basée sur une heuristique de nom (noms d'en-têtes d'authentification/d'identification communs et fragments tels que `authorization`, `x-api-key`, `token`, `secret`, `password` et `credential`).

### `secrets configure`

Assistant interactif qui :

- configure `secrets.providers` en premier (`env`/`file`/`exec`, ajouter/modifier/supprimer)
- vous permet de sélectionner les champs porteurs de secrets pris en charge dans `openclaw.json` ainsi que `auth-profiles.json` pour une portée d'agent
- peut créer une nouvelle mappage `auth-profiles.json` directement dans le sélecteur de cible
- capture les détails SecretRef (`source`, `provider`, `id`)
- exécute la résolution préalable (preflight)
- peut appliquer immédiatement

Modes utiles :

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` appliquer les valeurs par défaut :

- supprimer les informations d'identification statiques correspondantes de `auth-profiles.json` pour les fournisseurs ciblés
- supprimer les entrées statiques héritées `api_key` de `auth.json`
- supprimer les lignes secrètes connues correspondantes de `<config-dir>/.env`

### `secrets apply`

Appliquer un plan enregistré :

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
```

Pour plus de détails sur le contrat cible/chemin strict et les règles de rejet exactes, consultez :

- [Contrat de plan d'application des secrets](/fr/gateway/secrets-plan-contract)

## Politique de sécurité unidirectionnelle

OpenClaw n'écrit pas intentionnellement de sauvegardes de retour en arrière contenant des valeurs de secrets en texte brut historiques.

Modèle de sécurité :

- la pré-volition doit réussir avant le mode d'écriture
- l'activation d'exécution est validée avant la validation
- l'application met à jour les fichiers en utilisant un remplacement atomique de fichiers et une restauration sur le meilleur effort en cas d'échec

## Notes de compatibilité de l'authentification héritée

Pour les informations d'identification statiques, l'exécution ne dépend plus du stockage d'authentification hérité en texte brut.

- La source d'informations d'identification d'exécution est l'instantané résolu en mémoire.
- Les entrées statiques héritées `api_key` sont supprimées lorsqu'elles sont découvertes.
- Le comportement de compatibilité lié à OAuth reste séparé.

## Remarque sur l'interface utilisateur Web

Certaines unions SecretInput sont plus faciles à configurer en mode éditeur brut qu'en mode formulaire.

## Documentation connexe

- Commandes CLI : [secrets](/fr/cli/secrets)
- Détails du contrat de plan : [Contrat de plan d'application des secrets](/fr/gateway/secrets-plan-contract)
- Surface d'identification : [Surface d'identification SecretRef](/fr/reference/secretref-credential-surface)
- Configuration de l'auth : [Authentification](/fr/gateway/authentication)
- Posture de sécurité : [Sécurité](/fr/gateway/security)
- Priorité de l'environnement : [Variables d'environnement](/fr/help/environment)

import fr from "/components/footer/fr.mdx";

<fr />
