---
title: "Auth Credential Semantics"
summary: "Sémantiques canoniques d'éligibilité et de résolution des informations d'identification pour les profils d'auth"
read_when:
  - Travailler sur la résolution de profils d'auth ou le routage des informations d'identification
  - Débogage des échecs d'auth du modèle ou de l'ordre des profils
---

# Sémantiques des informations d'identification d'auth

Ce document définit les sémantiques canoniques d'éligibilité et de résolution des informations d'identification utilisées dans :

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

L'objectif est de garder le comportement au moment de la sélection et à l'exécution aligné.

## Codes de raison stables

- `ok`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`

## Informations d'identification de jeton

Les informations d'identification de jeton (`type: "token"`) prennent en charge `token` en ligne et/ou `tokenRef`.

### Règles d'éligibilité

1. Un profil de jeton n'est pas éligible lorsque `token` et `tokenRef` sont absents.
2. `expires` est facultatif.
3. Si `expires` est présent, il doit être un nombre fini supérieur à `0`.
4. Si `expires` n'est pas valide (`NaN`, `0`, négatif, non fini ou de type incorrect), le profil n'est pas éligible avec `invalid_expires`.
5. Si `expires` est dans le passé, le profil n'est pas éligible avec `expired`.
6. `tokenRef` ne contourne pas la validation de `expires`.

### Règles de résolution

1. Les sémantiques du résolveur correspondent aux sémantiques d'éligibilité pour `expires`.
2. Pour les profils éligibles, le matériel du jeton peut être résolu à partir de la valeur en ligne ou `tokenRef`.
3. Les références non résolues produisent `unresolved_ref` dans la sortie `models status --probe`.

## Messagerie compatible avec l'ancien système

Pour la compatibilité des scripts, les erreurs de sonde gardent cette première ligne inchangée :

`Auth profile credentials are missing or expired.`

Des détails conviviaux et des codes de raison stables peuvent être ajoutés sur les lignes suivantes.

import fr from "/components/footer/fr.mdx";

<fr />
