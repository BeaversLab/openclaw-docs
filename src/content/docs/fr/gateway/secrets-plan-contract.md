---
summary: "Contrat pour les plans `secrets apply` : validation des cibles, correspondance des chemins et portée cible `auth-profiles.json`"
read_when:
  - Generating or reviewing `openclaw secrets apply` plans
  - Debugging `Invalid plan target path` errors
  - Understanding target type and path validation behavior
title: "Contrat du plan d'application des secrets"
---

Cette page définit le contrat strict appliqué par `openclaw secrets apply`.

Si une cible ne correspond pas à ces règles, l'application échoue avant la mutation de la configuration.

## Structure du fichier de plan

`openclaw secrets apply --from <plan.json>` attend un tableau `targets` de cibles de plan :

```json5
{
  version: 1,
  protocolVersion: 1,
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.openai.apiKey",
      pathSegments: ["models", "providers", "openai", "apiKey"],
      providerId: "openai",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
    {
      type: "auth-profiles.api_key.key",
      path: "profiles.openai:default.key",
      pathSegments: ["profiles", "openai:default", "key"],
      agentId: "main",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
  ],
}
```

## Mises à jour et suppressions de providers

Les plans peuvent également inclure deux champs facultatifs de niveau supérieur qui modifient la carte `secrets.providers` en plus des écritures par cible :

- `providerUpserts` — un objet indexé par l'alias du provider. Chaque valeur est une définition de provider (la même forme acceptée sous `secrets.providers.<alias>` dans `openclaw.json`, par exemple un provider `exec` ou `file`).
- `providerDeletes` — un tableau d'alias de providers à supprimer.

`providerUpserts` s'exécute avant `targets`, donc un `target.ref.provider` peut faire référence à un alias de provider que le même plan introduit dans `providerUpserts`. Sans cela, les plans qui font référence à un alias non encore configuré dans `openclaw.json` échouent avec `provider "<alias>" is not configured`.

```json5
{
  version: 1,
  protocolVersion: 1,
  providerUpserts: {
    onepassword_anthropic: {
      source: "exec",
      command: "/usr/bin/op",
      args: ["read", "op://Vault/Anthropic/credential"],
    },
  },
  providerDeletes: ["legacy_unused_alias"],
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.anthropic.apiKey",
      pathSegments: ["models", "providers", "anthropic", "apiKey"],
      providerId: "anthropic",
      ref: { source: "exec", provider: "onepassword_anthropic", id: "credential" },
    },
  ],
}
```

Les providers d'exécution introduits via `providerUpserts` sont toujours soumis aux règles de consentement d'exécution dans [Comportement du consentement du provider d'exécution](#exec-provider-consent-behavior) : les plans contenant des providers d'exécution nécessitent `--allow-exec` en mode écriture.

## Portée cible prise en charge

Les cibles de plan sont acceptées pour les chemins d'identification pris en charge dans :

- [Surface d'identification SecretRef](/fr/reference/secretref-credential-surface)

## Comportement du type de cible

Règle générale :

- `target.type` doit être reconnu et doit correspondre à la forme normalisée `target.path`.

Les alias de compatibilité restent acceptés pour les plans existants :

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## Règles de validation du chemin

Chaque cible est validée avec tout ce qui suit :

- `type` doit être un type de cible reconnu.
- `path` doit être un chemin à points non vide.
- `pathSegments` peut être omis. S'il est fourni, il doit être normalisé vers exactement le même chemin que `path`.
- Les segments interdits sont rejetés : `__proto__`, `prototype`, `constructor`.
- Le chemin normalisé doit correspondre à la forme de chemin enregistrée pour le type de cible.
- Si `providerId` ou `accountId` est défini, il doit correspondre à l'identifiant encodé dans le chemin.
- Les cibles `auth-profiles.json` nécessitent `agentId`.
- Lors de la création d'un nouveau mappage `auth-profiles.json`, incluez `authProfileProvider`.

## Comportement en cas d'échec

Si une cible échoue à la validation, l'application se termine avec une erreur telle que :

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

Aucune écriture n'est validée pour un plan invalide.

## Comportement du consentement du fournisseur Exec

- `--dry-run` ignore les vérifications exec SecretRef par défaut.
- Les plans contenant des SecretRefs/fournisseurs exec sont rejetés en mode écriture, sauf si `--allow-exec` est défini.
- Lors de la validation ou de l'application de plans contenant exec, passez `--allow-exec` à la fois dans les commandes de simulation et d'écriture.

## Notes sur la portée d'exécution et d'audit

- Les entrées `auth-profiles.json` Réf uniquement (`keyRef`/`tokenRef`) sont incluses dans la résolution à l'exécution et la couverture d'audit.
- `secrets apply` écrit les cibles `openclaw.json` prises en charge, les cibles `auth-profiles.json` prises en charge et les cibles de nettoyage facultatives.

## Vérifications de l'opérateur

```bash
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# For exec-containing plans, opt in explicitly in both modes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

Si l'application échoue avec un message de chemin de cible invalide, régénérez le plan avec `openclaw secrets configure` ou corrigez le chemin de la cible vers une forme prise en charge ci-dessus.

## Documentation connexe

- [Gestion des secrets](/fr/gateway/secrets)
- [CLI `secrets`](/fr/cli/secrets)
- [Surface des informations d'identification SecretRef](/fr/reference/secretref-credential-surface)
- [Référence de configuration](/fr/gateway/configuration-reference)
