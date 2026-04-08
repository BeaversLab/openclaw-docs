---
title: "Sémantique des informations d'identification d'authentification"
summary: "Sémantique canonique d'éligibilité et de résolution des informations d'identification pour les profils d'authentification"
read_when:
  - Working on auth profile resolution or credential routing
  - Debugging model auth failures or profile order
---

# Sémantique des informations d'identification d'authentification

Ce document définit la sémantique canonique d'éligibilité et de résolution des informations d'identification utilisée dans :

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

L'objectif est de garder le comportement au moment de la sélection et à l'exécution alignés.

## Codes de raison de sonde stable

- `ok`
- `excluded_by_auth_order`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`
- `no_model`

## Identifiants de jeton

Les identifiants de jeton (`type: "token"`) prennent en charge `token` en ligne et/ou `tokenRef`.

### Règles d'éligibilité

1. Un profil de jeton n'est pas éligible lorsque `token` et `tokenRef` sont tous deux absents.
2. `expires` est facultatif.
3. Si `expires` est présent, il doit être un nombre fini supérieur à `0`.
4. Si `expires` est invalide (`NaN`, `0`, négatif, non fini ou de type incorrect), le profil n'est pas éligible avec `invalid_expires`.
5. Si `expires` est dans le passé, le profil n'est pas éligible avec `expired`.
6. `tokenRef` ne contourne pas la validation de `expires`.

### Règles de résolution

1. La sémantique du résolveur correspond à la sémantique d'éligibilité pour `expires`.
2. Pour les profils éligibles, le matériau du jeton peut être résolu à partir de la valeur en ligne ou `tokenRef`.
3. Les références non résolues produisent `unresolved_ref` dans la sortie `models status --probe`.

## Filtrage explicite de l'ordre d'authentification

- Lorsque `auth.order.<provider>` ou la substitution de l'ordre du magasin d'authentification est définie pour un fournisseur, `models status --probe` sonde uniquement les identifiants de profil qui restent dans l'ordre d'authentification résolu pour ce fournisseur.
- Un profil stocké pour ce fournisseur qui est omis de l'ordre explicite n'est pas essayé silencieusement plus tard. La sortie de la sonde le signale avec `reasonCode: excluded_by_auth_order` et le détail `Excluded by auth.order for this provider.`

## Résolution de la cible de la sonde

- Les cibles de sonde peuvent provenir de profils d'authentification, d'identifiants d'environnement ou de `models.json`.
- Si un fournisseur dispose d'identifiants mais que OpenClaw ne peut pas résoudre un candidat de modèle sondeable pour celui-ci, `models status --probe` signale `status: no_model` avec `reasonCode: no_model`.

## OAuth SecretRef Policy Guard

- SecretRef input is for static credentials only.
- If a profile credential is `type: "oauth"`, SecretRef objects are not supported for that profile credential material.
- If `auth.profiles.<id>.mode` is `"oauth"`, SecretRef-backed `keyRef`/`tokenRef` input for that profile is rejected.
- Violations are hard failures in startup/reload auth resolution paths.

## Legacy-Compatible Messaging

For script compatibility, probe errors keep this first line unchanged:

`Auth profile credentials are missing or expired.`

Human-friendly detail and stable reason codes may be added on subsequent lines.
