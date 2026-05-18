---
summary: "Gestion des secrets : contrat SecretRef, comportement du instantané d'exécution et nettoyage unidirectionnel sécurisé"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Gestion des secrets"
sidebarTitle: "Gestion des secrets"
---

OpenClaw prend en charge les SecretRef additives, ce qui permet de ne pas stocker les identifiants pris en charge en texte clair dans la configuration.

<Note>Le texte brut fonctionne toujours. Les SecretRefs sont opt-in par identifiant.</Note>

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

<AccordionGroup>
  <Accordion title="Exemples de surfaces inactives">
    - Entrées de canal/compte désactivées.
    - Identifiants de canal de niveau supérieur qu'aucun compte activé n'hérite.
    - Surfaces d'outil/fonctionnalité désactivées.
    - Clés spécifiques au provider de recherche Web qui ne sont pas sélectionnées par `tools.web.search.provider`. En mode automatique (provider non défini), les clés sont consultées par priorité pour la détection automatique du provider jusqu'à ce que l'une soit résolue. Après sélection, les clés de provider non sélectionnées sont traitées comme inactives jusqu'à ce qu'elles soient sélectionnées.
    - Le matériel d'authentification SSH Sandbox (`agents.defaults.sandbox.ssh.identityData`, `certificateData`, `knownHostsData`, plus les remplacements par agent) n'est actif que lorsque le backend Sandbox effectif est `ssh` pour l'agent par défaut ou un agent activé.
    - Les SecretRefs `gateway.remote.token` / `gateway.remote.password` sont actifs si l'une de ces conditions est vraie :
      - `gateway.mode=remote`
      - `gateway.remote.url` est configuré
      - `gateway.tailscale.mode` est `serve` ou `funnel`
      - En mode local sans ces surfaces distantes :
        - `gateway.remote.token` est actif lorsque l'authentification par jeton peut l'emporter et qu'aucun jeton d'auth/env n'est configuré.
        - `gateway.remote.password` est actif uniquement lorsque l'authentification par mot de passe peut l'emporter et qu'aucun mot de passe d'auth/env n'est configuré.
    - Le SecretRef `gateway.auth.token` est inactif pour la résolution de l'authentification au démarrage lorsque `OPENCLAW_GATEWAY_TOKEN` est défini, car l'entrée du jeton d'environnement l'emporte pour cette exécution.

  </Accordion>
</AccordionGroup>

## Gateway auth surface diagnostics

Lorsqu'un SecretRef est configuré sur `gateway.auth.token`, `gateway.auth.password`, `gateway.remote.token` ou `gateway.remote.password`, les journaux de démarrage/rechargement de la passerelle enregistrent explicitement l'état de la surface :

- `active` : le SecretRef fait partie de la surface d'authentification effective et doit être résolu.
- `inactive` : le SecretRef est ignoré pour cette exécution car une autre surface d'authentification l'emporte, ou parce que l'authentification à distance est désactivée/inactive.

Ces entrées sont consignées avec `SECRETS_GATEWAY_AUTH_SURFACE` et incluent la raison utilisée par la stratégie de surface active, afin que vous puissiez voir pourquoi une information d'identification a été traitée comme active ou inactive.

## Prévol de référence d'intégration

Lorsque l'intégration s'exécute en mode interactif et que vous choisissez le stockage SecretRef, OpenClaw exécute une validation préalable avant l'enregistrement :

- Références d'environnement : valide le nom de la variable d'environnement et confirme qu'une valeur non nulle est visible lors de la configuration.
- Références de fournisseur (`file` ou `exec`) : valide la sélection du fournisseur, résout `id` et vérifie le type de la valeur résolue.
- Chemin de réutilisation de démarrage rapide : lorsque `gateway.auth.token` est déjà un SecretRef, l'intégration le résout avant l'amorçage de la sonde/tableau de bord (pour les références `env`, `file` et `exec`) en utilisant la même porte d'échec rapide.

Si la validation échoue, l'intégration affiche l'erreur et vous permet de réessayer.

## Contrat SecretRef

Utilisez une seule forme d'objet partout :

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

<Tabs>
  <Tab title="env">
    ```json5
    { source: "env", provider: "default", id: "OPENAI_API_KEY" }
    ```

    Les champs SecretInput pris en charge acceptent également des abréviations de chaîne exactes :

    ```json5
    "${OPENAI_API_KEY}"
    "$OPENAI_API_KEY"
    ```

    Validation :

    - `provider` doit correspondre à `^[a-z][a-z0-9_-]{0,63}$`
    - `id` doit correspondre à `^[A-Z][A-Z0-9_]{0,127}$`

  </Tab>
  <Tab title="file">
    ```json5
    { source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
    ```

    Validation :

    - `provider` doit correspondre à `^[a-z][a-z0-9_-]{0,63}$`
    - `id` doit être un pointeur JSON absolu (`/...`)
    - Échappement RFC6901 dans les segments : `~` => `~0`, `/` => `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey" }
    ```

    Validation :

    - `provider` doit correspondre à `^[a-z][a-z0-9_-]{0,63}$`
    - `id` doit correspondre à `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
    - `id` ne doit pas contenir `.` ou `..` comme segments de chemin délimités par des barres obliques (par exemple `a/../b` est rejeté)

  </Tab>
</Tabs>

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

<AccordionGroup>
  <Accordion title="Env provider">
    - Liste d'autorisation (allowlist) facultative via `allowlist`.
    - Les valeurs d'environnement manquantes ou vides entraînent l'échec de la résolution.

  </Accordion>
  <Accordion title="File provider">
    - Lit un fichier local depuis `path`.
    - `mode: "json"` attend un payload d'objet JSON et résout `id` comme pointeur.
    - `mode: "singleValue"` attend l'id de référence `"value"` et retourne le contenu du fichier.
    - Le chemin doit réussir les vérifications de propriétaire/permissions.
    - Note d'échec fermé Windows : si la vérification ACL n'est pas disponible pour un chemin, la résolution échoue. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

  </Accordion>
  <Accordion title="Fournisseur Exec">
    - Exécute le chemin binaire absolu configuré, sans shell.
    - Par défaut, `command` doit pointer vers un fichier régulier (pas un lien symbolique).
    - Définissez `allowSymlinkCommand: true`OpenClaw pour autoriser les chemins de commande symboliques (par exemple, les shims Homebrew). OpenClaw valide le chemin cible résolu.
    - Associez `allowSymlinkCommand` à `trustedDirs` pour les chemins de gestionnaires de packages (par exemple `["/opt/homebrew"]`Windows).
    - Prend en charge le délai d'attente, le délai d'attente sans sortie, les limites d'octets de sortie, la liste blanche d'environnement et les répertoires de confiance.
    - Note d'échec fermé sur Windows : si la vérification ACL est indisponible pour le chemin de commande, la résolution échoue. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

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

  </Accordion>
</AccordionGroup>

## Clés d'API basées sur des fichiers

Ne mettez pas de chaînes `file:...` dans le bloc de configuration `env`. Le bloc `env` est littéral et non prioritaire, donc `file:...` n'est pas résolu.

Utilisez plutôt un fichier SecretRef sur un champ d'identification pris en charge :

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

Pour `mode: "singleValue"`, le SecretRef `id` est `"value"`. Pour `mode: "json"`, utilisez un pointeur JSON absolu tel que `"/providers/xai/apiKey"`.

Voir [Surface d'identification SecretRef](/fr/reference/secretref-credential-surface) pour les champs de configuration qui acceptent les SecretRefs.

## Exemples d'intégration Exec

<AccordionGroup>
  <Accordion title="CLI1Password CLI">
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
  </Accordion>
  <Accordion title="CLIHashiCorp Vault CLI">
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
  </Accordion>
  <Accordion title="sops">
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
  </Accordion>
</AccordionGroup>

## Variables d'environnement du serveur MCP

Les env vars du serveur MCP configurés via `plugins.entries.acpx.config.mcpServers`API prennent en charge SecretInput. Cela permet de garder les clés API et les jetons hors de la configuration en texte brut :

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

Les valeurs de chaîne en texte brut fonctionnent toujours. Les références de modèle d'environnement comme `${MCP_SERVER_API_KEY}` et les objets SecretRef sont résolues lors de l'activation de la passerelle avant que le processus du serveur MCP ne soit lancé. Comme pour les autres surfaces SecretRef, les références non résolues ne bloquent l'activation que lorsque le plugin `acpx` est effectivement actif.

## Matériel d'authentification SSH du bac à sable

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
- Si le backend effectif du bac à sable n'est pas `ssh`, ces références restent inactives et ne bloquent pas le démarrage.

## Surface des identifiants pris en charge

Les identifiants canoniques pris en charge et non pris en charge sont répertoriés dans :

- [Surface des identifiants SecretRef](/fr/reference/secretref-credential-surface)

<Note>Les identifiants créés ou rotatifs à l'exécution et le matériel de rafraîchissement OAuth sont intentionnellement exclus de la résolution SecretRef en lecture seule.</Note>

## Comportement requis et priorité

- Champ sans référence : inchangé.
- Champ avec une référence : requis sur les surfaces actives lors de l'activation.
- Si du texte brut et une référence sont présents, la référence a la priorité sur les chemins de priorité pris en charge.
- La sentinelle de rédaction `__OPENCLAW_REDACTED__` est réservée pour la rédaction/restauration de la configuration interne et est rejetée en tant que donnée de configuration littérale soumise.

Avertissements et signaux d'audit :

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (avertissement à l'exécution)
- `REF_SHADOWED` (constatation d'audit lorsque les identifiants `auth-profiles.json` prennent le pas sur les références `openclaw.json`)

Comportement de compatibilité Google Chat :

- `serviceAccountRef` prend le pas sur le `serviceAccount` en texte brut.
- La valeur en texte brut est ignorée lorsqu'une référence sœur est définie.

## Déclencheurs d'activation

L'activation des secrets s'exécute sur :

- Démarrage (prévol et activation finale)
- Chemin d'application à chaud du rechargement de la configuration
- Chemin de vérification de redémarrage du rechargement de la configuration
- Rechargement manuel via `secrets.reload`
- Prévol d'écriture de configuration de Gateway via RPC (`config.set` / `config.apply` / `config.patch`) pour la résolubilité des SecretRefs de surface active dans la charge utile de configuration soumise avant de persister les modifications

Contrat d'activation :

- Le succès permute l'instantané de manière atomique.
- L'échec du démarrage interrompt le démarrage de la passerelle.
- L'échec du rechargement à l'exécution conserve le dernier instantané valide.
- L'échec du prévol Write-RPC rejette la configuration soumise et laisse la configuration sur disque et l'instantané d'exécution actif inchangés.
- Fournir un jeton de channel explicite par appel à un appel d'outil/helper sortant ne déclenche pas l'activation de SecretRef ; les points d'activation restent le démarrage, le rechargement et le `secrets.reload` explicite.

## Signaux dégradés et récupérés

Lorsque l'activation au rechargement échoue après un état sain, OpenClaw entre dans un état dégradé des secrets.

Codes d'événement système et de journal uniques :

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

Comportement :

- Dégradé : l'exécution conserve le dernier instantané valide.
- Récupéré : émis une seule fois après la prochaine activation réussie.
- Les échecs répétés alors que le système est déjà dégradé enregistrent des avertissements mais ne spamment pas d'événements.
- L'échec rapide au démarrage n'émet pas d'événements dégradés car l'exécution n'est jamais devenue active.

## Résolution du chemin de commande

Les chemins de commande peuvent opter pour la résolution prise en charge de SecretRef via RPC d'instantané de passerelle.

Il existe deux comportements généraux :

<Tabs>
  <Tab title="Chemins de commande stricts">
    Par exemple, les chemins mémoire distante `openclaw memory` et `openclaw qr --remote` lorsqu'il a besoin de références de secrets partagés distants. Ils lisent à partir de l'instantané actif et échouent rapidement lorsqu'un SecretRef requis n'est pas disponible.
  </Tab>
  <Tab title="Chemins de commande en lecture seule">
    Par exemple `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, `openclaw security audit`, et les flux de réparation de configuration/doctor en lecture seule. Ils privilégient également l'instantané actif, mais dégradent au lieu d'abandonner lorsqu'une SecretRef ciblée n'est pas disponible dans ce chemin de commande.

    Comportement en lecture seule :

    - Lorsque la passerelle est en cours d'exécution, ces commandes lisent d'abord à partir de l'instantané actif.
    - Si la résolution de la passerelle est incomplète ou si la passerelle est indisponible, elles tentent un repli local ciblé pour la surface de commande spécifique.
    - Si une SecretRef ciblée est toujours indisponible, la commande continue avec une sortie en lecture seule dégradée et des diagnostics explicites tels que "configuré mais indisponible dans ce chemin de commande".
    - Ce comportement dégradé est uniquement local à la commande. Il n'affaiblit pas le démarrage de l'exécution, le rechargement, ou les chemins d'envoi/d'authentification.

  </Tab>
</Tabs>

Autres notes :

- L'actualisation de l'instantané après la rotation des secrets backend est gérée par `openclaw secrets reload`.
- Méthode Gateway RPC utilisée par ces chemins de commande : `secrets.resolve`.

## Workflow d'audit et de configuration

Flux de l'opérateur par défaut :

<Steps>
  <Step title="Auditer l'état actuel">```bash openclaw secrets audit --check ```</Step>
  <Step title="Configurer les SecretRefs">```bash openclaw secrets configure ```</Step>
  <Step title="Ré-auditer">```bash openclaw secrets audit --check ```</Step>
</Steps>

<AccordionGroup>
  <Accordion title="secrets audit">
    Les résultats incluent :

    - valeurs en clair au repos (`openclaw.json`, `auth-profiles.json`, `.env`, et `agents/*/agent/models.json` générés)
    - résidus d'en-têtes de provider sensibles en clair dans les entrées `models.json` générées
    - références non résolues
    - masquage par priorité (`auth-profiles.json` prenant la priorité sur les références `openclaw.json`)
    - résidus hérités (`auth.json`, rappels OAuth)

    Note sur Exec :

    - Par défaut, l'audit ignore les vérifications de résolubilité des SecretRef exec pour éviter les effets secondaires des commandes.
    - Utilisez `openclaw secrets audit --allow-exec` pour exécuter les providers exec lors de l'audit.

    Note sur les résidus d'en-tête :

    - La détection d'en-têtes de provider sensibles est basée sur une heuristique de noms (noms d'en-têtes d'authentification/d'identification courants et fragments tels que `authorization`, `x-api-key`, `token`, `secret`, `password`, et `credential`).

  </Accordion>
  <Accordion title="secrets configure">
    Assistant interactif qui :

    - configure `secrets.providers` d'abord (`env`/`file`/`exec`, ajouter/modifier/supprimer)
    - vous permet de sélectionner les champs supportés portant des secrets dans `openclaw.json` plus `auth-profiles.json` pour une portée d'agent
    - peut créer un nouveau mappage `auth-profiles.json` directement dans le sélecteur de cible
    - capture les détails du SecretRef (`source`, `provider`, `id`)
    - exécute la résolution préalable
    - peut appliquer immédiatement

    Note Exec :

    - La préalable ignore les vérifications des SecretRefs exec sauf si `--allow-exec` est défini.
    - Si vous appliquez directement depuis `configure --apply` et que le plan inclut des refs/providers exec, gardez `--allow-exec` défini pour l'étape d'application également.

    Modes utiles :

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` appliquer les valeurs par défaut :

    - nettoie les identifiants statiques correspondants de `auth-profiles.json` pour les fournisseurs ciblés
    - nettoie les entrées statiques héritées `api_key` de `auth.json`
    - nettoie les lignes secrètes connues correspondantes de `<config-dir>/.env`

  </Accordion>
  <Accordion title="secrets apply">
    Appliquer un plan enregistré :

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    Note Exec :

    - dry-run ignore les vérifications exec sauf si `--allow-exec` est défini.
    - le mode d'écriture rejette les plans contenant des SecretRefs/providers exec sauf si `--allow-exec` est défini.

    Pour plus de détails stricts sur le contrat de cible/chemin et les règles de rejet exactes, consultez [Secrets Apply Plan Contract](/fr/gateway/secrets-plan-contract).

  </Accordion>
</AccordionGroup>

## Politique de sécurité unidirectionnelle

<Warning>OpenClaw n'écrit intentionnellement pas de sauvegardes de restauration contenant des valeurs secrètes en clair historiques.</Warning>

Modèle de sécurité :

- la préalable doit réussir avant le mode d'écriture
- l'activation à l'exécution est validée avant le commit
- les mises à jour appliquent les fichiers en utilisant un remplacement de fichier atomique et une restauration au mieux en cas d'échec

## Notes de compatibilité de l'authentification héritée

Pour les identifiants statiques, l'exécution ne dépend plus du stockage d'authentification héritée en texte brut.

- La source des identifiants à l'exécution est l'instantané en mémoire résolu.
- Les entrées statiques héritées `api_key` sont nettoyées lorsqu'elles sont découvertes.
- Le comportement de compatibilité lié à OAuth reste séparé.

## Note sur l'interface Web

Certaines unions SecretInput sont plus faciles à configurer en mode éditeur brut qu'en mode formulaire.

## Connexes

- [Authentification](/fr/gateway/authentication) — configuration de l'authentification
- [CLI : secrets](/fr/cli/secrets) — commandes CLI
- [Variables d'environnement](/fr/help/environment) — priorité de l'environnement
- [Surface d'identifiants SecretRef](/fr/reference/secretref-credential-surface) — surface d'identifiants
- [Contrat de plan d'application des secrets](/fr/gateway/secrets-plan-contract) — détails du contrat de plan
- [Sécurité](/fr/gateway/security) — posture de sécurité
