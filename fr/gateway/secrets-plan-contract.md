---
summary: "Contrat pour les plans `secrets apply` : validation de la cible, correspondance du chemin et portée cible `auth-profiles.json`"
read_when:
  - Génération ou révision des plans `openclaw secrets apply`
  - Débogage des erreurs `Invalid plan target path`
  - Comprendre le comportement du type de cible et de la validation de chemin
title: "Contrat de plan d'application de secrets"
---

# Contrat de plan d'application de secrets

Cette page définit le contrat strict appliqué par `openclaw secrets apply`.

Si une cible ne correspond pas à ces règles, l'application échoue avant de modifier la configuration.

## Format du fichier de plan

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

## Portée de la cible prise en charge

Les cibles de plan sont acceptées pour les chemins d'identification pris en charge dans :

- [Surface d'identification SecretRef](/fr/reference/secretref-credential-surface)

## Comportement du type de cible

Règle générale :

- `target.type` doit être reconnu et doit correspondre à la forme normalisée `target.path`.

Les alias de compatibilité restent acceptés pour les plans existants :

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## Règles de validation de chemin

Chaque cible est validée avec tous les éléments suivants :

- `type` doit être un type de cible reconnu.
- `path` doit être un chemin avec points non vide.
- `pathSegments` peut être omis. S'il est fourni, il doit être normalisé exactement au même chemin que `path`.
- Les segments interdits sont rejetés : `__proto__`, `prototype`, `constructor`.
- Le chemin normalisé doit correspondre à la forme de chemin enregistrée pour le type de cible.
- Si `providerId` ou `accountId` est défini, il doit correspondre à l'identifiant codé dans le chemin.
- Les cibles `auth-profiles.json` nécessitent `agentId`.
- Lors de la création d'un nouveau mappage `auth-profiles.json`, incluez `authProfileProvider`.

## Comportement en cas d'échec

Si une cible échoue à la validation, l'application se termine avec une erreur telle que :

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

Aucune écriture n'est validée pour un plan non valide.

## Comportement du consentement du fournisseur d'exécution

- `--dry-run` ignore les vérifications SecretRef d'exécution par défaut.
- Les plans contenant des fournisseurs ou des SecretRefs exec sont rejetés en mode écriture, sauf si `--allow-exec` est défini.
- Lors de la validation ou de l'application de plans contenant des éléments exec, passez `--allow-exec` dans les commandes de simulation d'exécution et d'écriture.

## Notes sur la portée d'exécution et d'audit

- Les entrées `auth-profiles.json` en lecture seule (`keyRef`/`tokenRef`) sont incluses dans la résolution d'exécution et la couverture d'audit.
- `secrets apply` écrit les cibles `openclaw.json` prises en charge, les cibles `auth-profiles.json` prises en charge, ainsi que les cibles de nettoyage facultatives.

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

Si l'application échoue avec un message de chemin de cible non valide, régénérez le plan avec `openclaw secrets configure` ou corrigez le chemin de la cible selon une forme prise en charge ci-dessus.

## Documentation connexe

- [Gestion des secrets](/fr/gateway/secrets)
- [CLI `secrets`](/fr/cli/secrets)
- [Surface des informations d'identification SecretRef](/fr/reference/secretref-credential-surface)
- [Référence de configuration](/fr/gateway/configuration-reference)

import en from "/components/footer/en.mdx";

<en />
