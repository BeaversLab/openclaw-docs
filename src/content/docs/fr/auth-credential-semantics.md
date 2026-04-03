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

## Codes de raison stables

- `ok`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`

## Informations d'identification de jeton

Les informations d'identification de jeton (`type: "token"`) prennent en charge `token` en ligne et/ou `tokenRef`.

### Règles d'éligibilité

1. Un profil de jeton n'est pas éligible lorsque `token` et `tokenRef` sont tous deux absents.
2. `expires` est facultatif.
3. Si `expires` est présent, il doit être un nombre fini supérieur à `0`.
4. Si `expires` est invalide (`NaN`, `0`, négatif, non fini ou de type incorrect), le profil n'est pas éligible avec `invalid_expires`.
5. Si `expires` est dans le passé, le profil n'est pas éligible avec `expired`.
6. `tokenRef` ne contourne pas la validation de `expires`.

### Règles de résolution

1. La sémantique du résolveur correspond à la sémantique d'éligibilité pour `expires`.
2. Pour les profils éligibles, le matériel du jeton peut être résolu à partir de la valeur en ligne ou `tokenRef`.
3. Les références non résolues produisent `unresolved_ref` dans la sortie `models status --probe`.

## OAuth SecretRef Policy Guard

- L'entrée SecretRef est destinée uniquement aux informations d'identification statiques.
- Si une information d'identification de profil est `type: "oauth"`, les objets SecretRef ne sont pas pris en charge pour ce matériel d'information d'identification de profil.
- Si `auth.profiles.<id>.mode` est `"oauth"`, l'entrée `keyRef`/`tokenRef` basée sur SecretRef pour ce profil est rejetée.
- Les violations sont des échecs critiques dans les chemins de résolution d'authentification au démarrage/rechargement.

## Messagerie compatible avec l'héritage

Pour la compatibilité des scripts, les erreurs de sondage conservent cette première ligne inchangée :

`Auth profile credentials are missing or expired.`

Des détails conviviaux et des codes de raison stables peuvent être ajoutés sur les lignes suivantes.
