---
summary: "Gestion des secrets : contrat SecretRef, comportement du snapshot d'exécution et nettoyage sécurisé unidirectionnel"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Gestion des secrets"
sidebarTitle: "Gestion des secrets"
---

OpenClaw prend en charge les SecretRef additives, ce qui permet de ne pas stocker les identifiants pris en charge en texte clair dans la configuration.

<Note>Le texte brut fonctionne toujours. Les SecretRefs sont opt-in par identifiant.</Note>

<Warning>
  Les identifiants en texte brut restent lisibles par l'agent s'ils sont stockés dans des fichiers que l'agent peut inspecter, notamment `openclaw.json`, `auth-profiles.json`, `.env`, ou les fichiers `agents/*/agent/models.json` générés. Les SecretRefs réduisent ce rayon d'explosion local uniquement après que chaque identifiant pris en charge a été migré et que `openclaw secrets audit --check` ne
  signale aucun résidu de secret en texte brut.
</Warning>

## Objectifs et modèle d'exécution

Les secrets sont résolus dans un snapshot d'exécution en mémoire.

- La résolution est eager lors de l'activation, et non lazy sur les chemins de requête.
- Le démarrage échoue rapidement lorsqu'une SecretRef effectivement active ne peut pas être résolue.
- Le rechargement utilise un échange atomique : succès total, ou conservation du dernier snapshot connu valide.
- Les violations de la stratégie SecretRef (par exemple, profils d'authentification en mode OAuth combinés avec une entrée SecretRef) entraînent l'échec de l'activation avant l'échange d'exécution.
- Les requêtes d'exécution lisent uniquement le snapshot en mémoire actif.
- Après la première activation/chargement réussie de la configuration, les chemins de code d'exécution continuent de lire ce snapshot en mémoire actif jusqu'à ce qu'un rechargement réussi l'échange.
- Les chemins de livraison sortants lisent également ce snapshot actif (par exemple, la livraison de réponses/fils Discord et l'envoi d'actions Telegram) ; ils ne résolvent pas à nouveau les SecretRefs à chaque envoi.

Cela permet d'éloigner les pannes du provider de secrets des chemins de requête à fort trafic.

## Limite d'accès de l'agent

Les SecretRefs protègent les identifiants contre la persistance dans la configuration prise en charge et
les surfaces de modèle générées, mais elles ne constituent pas une limite d'isolement des processus. Si un
identifiant en texte brut reste sur le disque dans un chemin que l'agent peut lire, l'agent peut
contourner la caviardation au niveau API en utilisant des outils de fichier ou de shell pour inspecter ce fichier.

Pour les déploiements de production où les fichiers accessibles à l'agent sont dans la portée, considérez
la migration des SecretRefs comme complète uniquement lorsque toutes ces conditions sont remplies :

- les identifiants pris en charge utilisent SecretRefs au lieu de valeurs en texte brut
- les résidus de texte brut hérités ont été éliminés de `openclaw.json`,
  `auth-profiles.json`, `.env` et des fichiers `models.json` générés
- `openclaw secrets audit --check` est propre après la migration
- tous les identifiants restants non pris en charge ou en rotation sont protégés par l'isolement
  du système d'exploitation, l'isolement du conteneur ou un proxy d'identifiants externe

C'est pourquoi le workflow audit/configure/apply est une porte de sécurité de la migration, et non
simplement une assistant pratique.

<Warning>
  Les SecretRefs ne rendent pas les fichiers lisibles arbitraires sûrs. Les sauvegardes, les configurations copiées, les anciens catalogues de modèles générés et les classes d'identifiants non prises en charge doivent être traités comme des secrets de production jusqu'à ce qu'ils soient supprimés, déplacés en dehors de la limite de confiance de l'agent ou protégés par une couche d'isolement
  séparée.
</Warning>

## Filtrage de la surface active

Les SecretRefs sont validés uniquement sur les surfaces effectivement actives.

- Surfaces activées : les références non résolues bloquent le démarrage/le rechargement.
- Surfaces inactives : les références non résolues ne bloquent pas le démarrage/le rechargement.
- Les références inactives émettent des diagnostics non fatals avec le code `SECRETS_REF_IGNORED_INACTIVE_SURFACE`.

<AccordionGroup>
  <Accordion title="Exemples de surfaces inactives">
    - Entrées de canal/compte désactivées.
    - Identifiants de canal de niveau supérieur qu'aucun compte activé n'hérite.
    - Surfaces d'outil/fonctionnalité désactivées.
    - Clés spécifiques au provider de recherche Web qui ne sont pas sélectionnées par `tools.web.search.provider`. En mode automatique (provider non défini), les clés sont consultées par ordre de priorité pour la détection automatique du provider jusqu'à ce que l'une soit résolue. Après sélection, les clés du provider non sélectionné sont traitées comme inactives jusqu'à ce qu'elles soient sélectionnées.
    - Le matériel d'authentification SSH du Sandbox (`agents.defaults.sandbox.ssh.identityData`, `certificateData`, `knownHostsData`, plus les substitutions par agent) n'est actif que lorsque le backend Sandbox effectif est `ssh` pour l'agent par défaut ou un agent activé.
    - Les SecretRefs `gateway.remote.token` / `gateway.remote.password` sont actifs si l'une de ces conditions est vraie :
      - `gateway.mode=remote`
      - `gateway.remote.url` est configuré
      - `gateway.tailscale.mode` est `serve` ou `funnel`
      - En mode local sans ces surfaces distantes :
        - `gateway.remote.token` est actif lorsque l'authentification par jeton peut l'emporter et qu'aucun jeton env/auth n'est configuré.
        - `gateway.remote.password` est actif uniquement lorsque l'authentification par mot de passe peut l'emporter et qu'aucun mot de passe env/auth n'est configuré.
    - Le SecretRef `gateway.auth.token` est inactif pour la résolution de l'authentification au démarrage lorsque `OPENCLAW_GATEWAY_TOKEN` est défini, car la saisie du jeton env l'emporte pour cet environnement d'exécution.

  </Accordion>
</AccordionGroup>

## Diagnostics de la surface d'authentification du Gateway

Lorsqu'un SecretRef est configuré sur `gateway.auth.token`, `gateway.auth.password`, `gateway.remote.token` ou `gateway.remote.password`, les journaux de démarrage/rechargement de la passerelle enregistrent explicitement l'état de la surface :

- `active` : le SecretRef fait partie de la surface d'authentification effective et doit être résolu.
- `inactive` : le SecretRef est ignoré pour cet environnement d'exécution car une autre surface d'authentification l'emporte, ou parce que l'authentification distante est désactivée/inactive.

Ces entrées sont consignées avec `SECRETS_GATEWAY_AUTH_SURFACE` et incluent la raison utilisée par la stratégie de surface active, afin que vous puissiez voir pourquoi une identifiant a été traité comme actif ou inactif.

## Préflight de référence lors de l'intégration

Lorsque l'onboarding s'exécute en mode interactif et que vous choisissez le stockage SecretRef, OpenClaw exécute une validation préliminaire avant l'enregistrement :

- Références d'env : valide le nom de la env var et confirme qu'une valeur non vide est visible lors de la configuration.
- Références de provider (`file` ou `exec`) : valide la sélection du provider, résout `id` et vérifie le type de la valeur résolue.
- Chemin de réutilisation du démarrage rapide : lorsque `gateway.auth.token` est déjà un SecretRef, l'onboarding le résout avant l'amorçage de la sonde/du tableau de bord (pour les références `env`, `file` et `exec`) en utilisant la même porte d'échec rapide.

Si la validation échoue, l'onboarding affiche l'erreur et vous permet de réessayer.

## Contrat SecretRef

Utilisez une forme d'objet partout :

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
    { source: "exec", provider: "vault", id: "providers/openai/apiKey#value" }
    ```

    Validation :

    - `provider` doit correspondre à `^[a-z][a-z0-9_-]{0,63}$`
    - `id` doit correspondre à `^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$` (prend en charge les sélecteurs tels que `secret#json_key`)
    - `id` ne doit pas contenir `.` ou `..` en tant que segments de chemin délimités par des slashs (par exemple `a/../b` est rejeté)

  </Tab>
</Tabs>

## Configuration du fournisseur

Définir les fournisseurs sous `secrets.providers` :

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
      "team-secrets": {
        source: "exec",
        pluginIntegration: {
          pluginId: "acme-secrets",
          integrationId: "secret-store",
        },
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
    - Liste d'autorisation optionnelle via `allowlist`.
    - Les valeurs d'environnement manquantes ou vides entraînent l'échec de la résolution.

  </Accordion>
  <Accordion title="File provider">
    - Lit le fichier local depuis `path`.
    - `mode: "json"` attend une charge utile d'objet JSON et résout `id` comme pointeur.
    - `mode: "singleValue"` attend l'identifiant de référence `"value"` et retourne le contenu du fichier.
    - Le chemin doit réussir les vérifications de propriétaire/d'autorisations.
    - Note d'échec fermé de Windows : si la vérification de l'ACL n'est pas disponible pour un chemin, la résolution échoue. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

  </Accordion>
  <Accordion title="Fournisseur Exec">
    - Exécute le chemin binaire absolu configuré, sans shell.
    - Par défaut, `command` doit pointer vers un fichier régulier (pas un lien symbolique).
    - Définissez `allowSymlinkCommand: true` pour autoriser les chemins de commande symboliques (par exemple, les shims Homebrew). OpenClaw valide le chemin cible résolu.
    - Associez `allowSymlinkCommand` à `trustedDirs` pour les chemins de gestionnaire de packages (par exemple `["/opt/homebrew"]`).
    - Prend en charge le délai d'expiration, le délai d'expiration sans sortie, les limites d'octets de sortie, la liste d'autorisation d'environnement et les répertoires de confiance.
    - Note d'échec fermé Windows : si la vérification ACL n'est pas disponible pour le chemin de commande, la résolution échoue. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce provider pour contourner les vérifications de sécurité du chemin.
    - Les fournisseurs exec gérés par plugin peuvent utiliser `pluginIntegration` au lieu de
      copié `command`/`args`. OpenClaw résout les détails de la commande actuelle
      à partir du manifeste du plugin installé lors du démarrage/du rechargement. Si le plugin est
      désactivé, supprimé, non fiable ou ne déclare plus l'intégration,
      les SecretRefs actifs utilisant ce provider échouent en mode fermé.

    Payload de requête (stdin) :

    ```json
    { "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
    ```

    Payload de réponse (stdout) :

    ```jsonc
    { "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
    ```

    Erreurs facultatives par identifiant :

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

Ne mettez pas de chaînes `file:...` dans le bloc de configuration `env`. Le bloc `env` est
littéral et non prioritaire, donc `file:...` n'est pas résolu.

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

Pour `mode: "singleValue"`, le SecretRef `id` est `"value"`. Pour
`mode: "json"`, utilisez un pointeur JSON absolu tel que
`"/providers/xai/apiKey"`.

Voir [Surface des identifiants SecretRef](/fr/reference/secretref-credential-surface) pour
les champs de configuration qui acceptent les SecretRefs.

## Exemples d'intégration Exec

<AccordionGroup>
  <Accordion title="1Password CLI">
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
  <Accordion title="Gestionnaire de secrets Bitwarden (`bws`)">
    Utilisez un wrapper de résolveur lorsque vous souhaitez que les identifiants SecretRef correspondent aux clés d'élément du Gestionnaire de secrets Bitwarden. Le référentiel inclut
    `scripts/secrets/openclaw-bws-resolver.mjs`GatewayCLI ; installez-le ou copiez-le vers un chemin
    de confiance absolu sur l'hôte qui exécute le Gateway.

    Conditions requises :

    - CLI du Gestionnaire de secrets Bitwarden (`bws`Gateway) installée sur l'hôte du Gateway.
    - `BWS_ACCESS_TOKEN`Gateway disponible pour le service Gateway.
    - `PATH` transmis au résolveur, ou `BWS_BIN` défini sur le chemin binaire absolu `bws`
      .

    ```json5
    {
      secrets: {
        providers: {
          bws: {
            source: "exec",
            command: "/usr/local/bin/openclaw-bws-resolver.mjs",
            passEnv: ["BWS_ACCESS_TOKEN", "PATH", "BWS_BIN"],
            jsonOnly: true,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "bws",
              id: "openclaw/providers/openai/apiKey",
            },
          },
        },
      },
    }
    ```

    Le résolveur regroupe les identifiants demandés, exécute `bws secret list` et renvoie
    des valeurs pour les champs de secret `key` correspondants. Utilisez des clés qui respectent le contrat d'identifiant SecretRef exec, telles que `openclaw/providers/openai/apiKey` ; les clés de style variable d'environnement avec des traits de soulignement sont rejetées avant l'exécution du résolveur. Si plus d'un secret Bitwarden visible possède la même clé demandée, le résolveur échoue pour cet identifiant en le considérant comme ambigu au lieu d'en choisir un. Après avoir mis à jour la configuration, vérifiez le chemin du résolveur :

    ```bash
    openclaw secrets audit --allow-exec
    ```

  </Accordion>
  <Accordion title="HashiCorp Vault CLI">
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
  <Accordion title="password-store (`pass`)">
    Utilisez un petit wrapper de résolveur lorsque vous souhaitez que les identifiants SecretRef correspondent directement aux entrées `pass`. Enregistrez ceci en tant qu'exécutable dans un chemin absolu qui réussit les vérifications de chemin de votre fournisseur d'exécution, par exemple `/usr/local/bin/openclaw-pass-resolver`. Le shebang `#!/usr/bin/env node` résout `node` à partir du processus de résolveur `PATH`, incluez donc `PATH` dans `passEnv`. Si `pass` n'est pas dans ce `PATH`, définissez `PASS_BIN` dans l'environnement parent et incluez-le également dans `passEnv` :

    ```js
    #!/usr/bin/env node
    const { spawnSync } = require("node:child_process");

    let stdin = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      stdin += chunk;
    });
    process.stdin.on("error", (err) => {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    });
    process.stdin.on("end", () => {
      let request;
      try {
        request = JSON.parse(stdin || "{}");
      } catch (err) {
        process.stderr.write(`Failed to parse request: ${err.message}\n`);
        process.exit(1);
      }

      const passBin = process.env.PASS_BIN || "pass";
      const values = {};
      const errors = {};

      for (const id of request.ids ?? []) {
        const result = spawnSync(passBin, ["show", id], { encoding: "utf8" });
        if (result.status === 0) {
          values[id] = result.stdout.split(/\r?\n/, 1)[0] ?? "";
        } else {
          errors[id] = { message: (result.stderr || `pass exited ${result.status}`).trim() };
        }
      }

      process.stdout.write(JSON.stringify({ protocolVersion: 1, values, errors }));
    });
    ```

    Configurez ensuite le fournisseur d'exécution et pointez `apiKey` vers le chemin d'entrée `pass` :

    ```json5
    {
      secrets: {
        providers: {
          pass_store: {
            source: "exec",
            command: "/usr/local/bin/openclaw-pass-resolver",
            passEnv: ["PATH", "HOME", "GNUPGHOME", "GPG_TTY", "PASSWORD_STORE_DIR", "PASS_BIN"],
            jsonOnly: true,
          },
        },
      },
      models: {
        providers: {
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: [{ id: "gpt-5", name: "gpt-5" }],
            apiKey: {
              source: "exec",
              provider: "pass_store",
              id: "openclaw/providers/openai/apiKey",
            },
          },
        },
      },
    }
    ```

    Conservez le secret sur la première ligne de l'entrée `pass`, ou personnalisez le wrapper si vous souhaitez renvoyer la sortie complète `pass show` à la place. Après avoir mis à jour la configuration, vérifiez à la fois l'audit statique et le chemin du résolveur d'exécution :

    ```bash
    openclaw secrets audit --check
    openclaw secrets audit --allow-exec
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

Les variables d'environnement du serveur MCP configurées via `plugins.entries.acpx.config.mcpServers`API prennent en charge SecretInput. Cela permet de garder les clés API et les jetons hors de la configuration en texte brut :

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

Les valeurs de chaîne en texte brut fonctionnent toujours. Les références de modèle d'environnement comme `${MCP_SERVER_API_KEY}` et les objets SecretRef sont résolues lors de l'activation de la passerelle avant le démarrage du processus du serveur MCP. Comme pour les autres surfaces SecretRef, les références non résolues ne bloquent l'activation que lorsque le plugin `acpx` est effectivement actif.

## Matériel d'authentification SSH du Sandbox

Le backend de sandbox principal `ssh` prend également en charge les SecretRefs pour le matériel d'authentification SSH :

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

- OpenClaw résout ces références lors de l'activation du sandbox, et pas paresseusement lors de chaque appel SSH.
- Les valeurs résolues sont écrites dans des fichiers temporaires avec des permissions restrictives et utilisées dans la configuration SSH générée.
- Si le backend de sandbox effectif n'est pas `ssh`, ces références restent inactives et ne bloquent pas le démarrage.

## Surface des identifiants prise en charge

Les identifiants canoniques pris en charge et non pris en charge sont listés dans :

- [Surface d'identification SecretRef](/fr/reference/secretref-credential-surface)

<Note>Les identifiants créés à l'exécution ou rotatifs et le matériel d'actualisation OAuth sont intentionnellement exclus de la résolution SecretRef en lecture seule.</Note>

## Comportement requis et priorité

- Champ sans référence : inchangé.
- Champ avec une référence : requis sur les surfaces actives lors de l'activation.
- Si le texte en clair et la référence sont tous deux présents, la référence a priorité sur les chemins de priorité pris en charge.
- La sentinelle de rédaction `__OPENCLAW_REDACTED__` est réservée pour la rédaction/restauration de la configuration interne et est rejetée en tant que donnée de configuration littérale soumise.

Signaux d'avertissement et d'audit :

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (avertissement d'exécution)
- `REF_SHADOWED` (constat d'audit lorsque les informations d'identification `auth-profiles.json` priment sur les références `openclaw.json`)

Comportement de compatibilité Google Chat :

- `serviceAccountRef` prend le pas sur le texte brut `serviceAccount`.
- La valeur en texte clair est ignorée lorsqu'une référence sœur est définie.

## Déclencheurs d'activation

L'activation des secrets s'exécute sur :

- Démarrage (pré-vol plus activation finale)
- Chemin d'application à chaud du rechargement de la configuration
- Chemin de vérification de redémarrage du rechargement de la configuration
- Rechargement manuel via `secrets.reload`
- Pré-vérification (preflight) de l'écriture de configuration Gateway via RPC (GatewayRPC`config.set` / `config.apply` / `config.patch`) pour la résolvabilité des SecretRefs de surface active dans la charge utile de configuration soumise avant la persistance des modifications

Contrat d'activation :

- Le succès permute l'instantané de manière atomique.
- L'échec du démarrage interrompt le démarrage de la passerelle.
- L'échec du rechargement à l'exécution conserve le dernier instantané valide.
- L'échec du pré-vol d'écriture RPC rejette la configuration soumise et conserve la configuration sur disque et l'instantané d'exécution actif inchangés.
- Fournir un jeton de canal (channel) explicite par appel à un appel d'outil/d'aide sortant ne déclenche pas l'activation de SecretRef ; les points d'activation restent le démarrage, le rechargement et le `secrets.reload` explicite.

## Signaux dégradés et récupérés

Lorsque l'activation au rechargement échoue après un état sain, OpenClaw entre dans un état de secrets dégradé.

Codes d'événement système et de journal ponctuels :

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

Comportement :

- Dégradé : l'exécution conserve le dernier instantané valide connu.
- Récupéré : émis une fois après la prochaine activation réussie.
- Les échecs répétés alors que le système est déjà dégradé enregistrent des avertissements mais ne spamment pas les événements.
- L'échec rapide au démarrage n'émet pas d'événements dégradés car l'exécution n'est jamais devenue active.

## Résolution du chemin de commande

Les chemins de commande peuvent opter pour la résolution SecretRef prise en charge via le RPC d'instantané de passerelle.

Il existe deux comportements généraux :

<Tabs>
  <Tab title="Chemins de commande stricts">
    Par exemple `openclaw memory` les chemins mémoire distants et `openclaw qr --remote` lorsqu'il a besoin de références à des secrets partagés distants. Ils lisent à partir de l'instantané actif et échouent rapidement lorsqu'une SecretRef requise n'est pas disponible.
  </Tab>
  <Tab title="Chemins de commande en lecture seule">
    Par exemple `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, `openclaw security audit` et les flux de réparation de configuration/doctor en lecture seule. Ils privilégient également l'instantané actif, mais dégradent au lieu d'abandonner lorsqu'une SecretRef ciblée n'est pas disponible dans ce chemin de commande.

    Comportement en lecture seule :

    - Lorsque la passerelle est en cours d'exécution, ces commandes lisent d'abord à partir de l'instantané actif.
    - Si la résolution de la passerelle est incomplète ou si la passerelle n'est pas disponible, elles tentent un repli local ciblé pour la surface de commande spécifique.
    - Si une SecretRef ciblée est toujours indisponible, la commande continue avec une sortie en lecture seule dégradée et des diagnostics explicites tels que "configuré mais indisponible dans ce chemin de commande".
    - Ce comportement dégradé est local à la commande uniquement. Il n'affaiblit pas le démarrage de l'exécution, le rechargement ou les chemins d'envoi/d'auth.

  </Tab>
</Tabs>

Autres notes :

- L'actualisation de l'instantané après la rotation des secrets du backend est gérée par `openclaw secrets reload`.
- Méthode Gateway RPC utilisée par ces chemins de commande : `secrets.resolve`.

## Workflow d'audit et de configuration

Flux de l'opérateur par défaut :

<Steps>
  <Step title="Auditer l'état actuel">```bash openclaw secrets audit --check ```</Step>
  <Step title="Configurer et appliquer les SecretRefs">```bash openclaw secrets configure --apply ```</Step>
  <Step title="Ré-audit">```bash openclaw secrets audit --check ```</Step>
</Steps>

Ne considérez pas la migration comme terminée tant que le ré-audit n'est pas propre. Si l'audit
signale encore des valeurs en clair au repos, le risque d'accès par l'agent est toujours présent,
même lorsque les API d'exécution renvoient des valeurs expurgées.

Si vous enregistrez un plan au lieu de l'appliquer pendant `configure`, appliquez ce plan enregistré
avec `openclaw secrets apply --from <plan-path>` avant le nouvel audit.

<AccordionGroup>
  <Accordion title="secrets audit">
    Les résultats incluent :

    - valeurs en clair au repos (`openclaw.json`, `auth-profiles.json`, `.env`, et fichiers `agents/*/agent/models.json` générés)
    - résidus d'en-têtes sensibles de fournisseur en clair dans les entrées `models.json` générées
    - références non résolues
    - masquage par priorité (`auth-profiles.json` prioritaire sur les références `openclaw.json`)
    - résidus hérités (`auth.json`OAuth, rappels OAuth)

    Note Exec :

    - Par défaut, l'audit ignore les vérifications de résolvabilité des SecretRef exec pour éviter les effets secondaires des commandes.
    - Utilisez `openclaw secrets audit --allow-exec` pour exécuter les fournisseurs exec lors de l'audit.

    Note sur les résidus d'en-tête :

    - La détection d'en-têtes sensibles de fournisseur est basée sur une heuristique de nom (noms d'en-têtes d'authentification/d'informations d'identification courants et fragments tels que `authorization`, `x-api-key`, `token`, `secret`, `password`, et `credential`).

  </Accordion>
  <Accordion title="secrets configure">
    Assistant interactif qui :

    - configure d'abord `secrets.providers` (`env`/`file`/`exec`, ajouter/modifier/supprimer)
    - vous permet de sélectionner les champs contenant des secrets pris en charge dans `openclaw.json` ainsi que `auth-profiles.json` pour une portée d'agent
    - peut créer un nouveau mappage `auth-profiles.json` directement dans le sélecteur de cible
    - capture les détails du SecretRef (`source`, `provider`, `id`)
    - exécute la résolution préalable
    - peut appliquer immédiatement

    Note sur Exec :

    - La vérification préalable ignore les vérifications de SecretRef exec sauf si `--allow-exec` est défini.
    - Si vous appliquez directement depuis `configure --apply` et que le plan inclut des refs/fournisseurs exec, gardez `--allow-exec` défini pour l'étape d'application également.

    Modes utiles :

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` application par défaut :

    - nettoie les informations d'identification statiques correspondantes de `auth-profiles.json` pour les fournisseurs ciblés
    - nettoie les entrées statiques `api_key` héritées de `auth.json`
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

    Note sur Exec :

    - dry-run ignore les vérifications exec sauf si `--allow-exec` est défini.
    - le mode d'écriture rejette les plans contenant des SecretRefs/fournisseurs exec sauf si `--allow-exec` est défini.

    Pour les détails stricts du contrat de cible/chemin et les règles de rejet exactes, consultez [Secrets Apply Plan Contract](/fr/gateway/secrets-plan-contract).

  </Accordion>
</AccordionGroup>

## Politique de sécurité unidirectionnelle

<Warning>OpenClaw n'écrit intentionnellement pas de sauvegardes de restauration contenant des valeurs historiques de secrets en texte clair.</Warning>

Modèle de sécurité :

- la pré-vérification doit réussir avant le mode d'écriture
- l'activation d'exécution est validée avant la validation
- applique les mises à jour des fichiers en utilisant un remplacement atomique des fichiers et une restauration au mieux en cas d'échec

## Notes de compatibilité de l'authentification héritée

Pour les identifiants statiques, l'exécution ne dépend plus du stockage de l'authentification héritée en texte brut.

- La source des identifiants à l'exécution est l'instantané en mémoire résolu.
- Les entrées statiques `api_key` héritées sont nettoyées lorsqu'elles sont découvertes.
- Le comportement de compatibilité lié à OAuth reste séparé.

## Remarque sur l'interface Web

Certaines unions SecretInput sont plus faciles à configurer en mode éditeur brut qu'en mode formulaire.

## Connexes

- [Authentication](/fr/gateway/authentication) — configuration de l'authentification
- [CLI : secrets](/fr/cli/secrets) — commandes CLI
- [Variables d'environnement](/fr/help/environment) — priorité de l'environnement
- [Surface d'identification SecretRef](/fr/reference/secretref-credential-surface) — surface d'identification
- [Contrat de plan d'application des secrets](/fr/gateway/secrets-plan-contract) — détails du contrat de plan
- [Sécurité](/fr/gateway/security) — posture de sécurité
