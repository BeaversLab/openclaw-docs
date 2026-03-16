# Sémantique des informations d'authentification

Ce document définit la sémantique canonique d'éligibilité et de résolution des informations d'authentification utilisée dans :

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

L'objectif est de garder le comportement au moment de la sélection et au moment de l'exécution alignés.

## Codes de raison stables

- `ok`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`

## Informations d'identification du jeton

Les informations d'identification du jeton (`type: "token"`) prennent en charge les `token` en ligne et/ou les `tokenRef`.

### Règles d'éligibilité

1. Un profil de jeton n'est pas éligible lorsque les `token` et les `tokenRef` sont absents.
2. `expires` est facultatif.
3. Si `expires` est présent, il doit être un nombre fini supérieur à `0`.
4. Si `expires` est invalide (`NaN`, `0`, négatif, non fini ou de type incorrect), le profil n'est pas éligible avec `invalid_expires`.
5. Si `expires` est dans le passé, le profil n'est pas éligible avec `expired`.
6. `tokenRef` ne contourne pas la validation de `expires`.

### Règles de résolution

1. La sémantique du résolveur correspond à la sémantique d'éligibilité pour `expires`.
2. Pour les profils éligibles, le matériau du jeton peut être résolu à partir de la valeur en ligne ou de `tokenRef`.
3. Les références non résolues produisent `unresolved_ref` dans la sortie `models status --probe`.

## Messagerie compatible avec les versions héritées

Pour la compatibilité des scripts, les erreurs de probe gardent cette première ligne inchangée :

`Auth profile credentials are missing or expired.`

Des détails conviviaux et des codes de raison stables peuvent être ajoutés sur les lignes suivantes.

import fr from "/components/footer/fr.mdx";

<fr />
