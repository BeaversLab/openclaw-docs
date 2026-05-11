---
summary: "Sémantique canonique d'éligibilité et de résolution des identifiants pour les profils d'authentification"
title: "Sémantique des identifiants d'authentification"
read_when:
  - Working on auth profile resolution or credential routing
  - Debugging model auth failures or profile order
---

Ce document définit la sémantique canonique d'éligibilité et de résolution des identifiants utilisée dans :

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

L'objectif est de maintenir l'alignement entre le comportement au moment de la sélection et le comportement à l'exécution.

## Codes de raison de sonde stables

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

1. Un profil de jeton n'est pas éligible lorsque `token` et `tokenRef` sont absents.
2. `expires` est facultatif.
3. Si `expires` est présent, il doit être un nombre fini supérieur à `0`.
4. Si `expires` est invalide (`NaN`, `0`, négatif, non fini ou de type incorrect), le profil n'est pas éligible avec `invalid_expires`.
5. Si `expires` est dans le passé, le profil n'est pas éligible avec `expired`.
6. `tokenRef` ne contourne pas la validation de `expires`.

### Règles de résolution

1. La sémantique du résolveur correspond à la sémantique d'éligibilité pour `expires`.
2. Pour les profils éligibles, le matériel du jeton peut être résolu à partir de la valeur en ligne ou de `tokenRef`.
3. Les références non résolubles produisent `unresolved_ref` dans la sortie `models status --probe`.

## Filtrage explicite de l'ordre d'authentification

- Lorsque `auth.order.<provider>` ou la priorité de commande du magasin d'auth est définie pour un fournisseur, `models status --probe` sonde uniquement les ids de profil restant dans l'ordre d'auth résolu pour ce fournisseur.
- Un profil stocké pour ce fournisseur qui est omis de l'ordre explicite n'est pas essayé silencieusement plus tard. La sortie de la sonde le signale avec `reasonCode: excluded_by_auth_order` et le détail `Excluded by auth.order for this provider.`

## Résolution de la cible de la sonde

- Les cibles de sonde peuvent provenir de profils d'auth, d'informations d'identification d'environnement, ou de `models.json`.
- Si un fournisseur possède des informations d'identification mais que OpenClaw ne peut pas résoudre un candidat de modèle sondeable pour celui-ci, `models status --probe` signale `status: no_model` avec `reasonCode: no_model`.

## Garde de politique SecretRef OAuth

- L'entrée SecretRef est réservée aux informations d'identification statiques uniquement.
- Si une information d'identification de profil est `type: "oauth"`, les objets SecretRef ne sont pas pris en charge pour cette matière d'information d'identification de profil.
- Si `auth.profiles.<id>.mode` est `"oauth"`, l'entrée `keyRef`/`tokenRef` sauvegardée par SecretRef pour ce profil est rejetée.
- Les violations sont des échecs irrécupérables dans les chemins de résolution d'auth au démarrage/rechargement.

## Messagerie compatible avec l'héritage

Pour la compatibilité des scripts, les erreurs de sonde conservent cette première ligne inchangée :

`Auth profile credentials are missing or expired.`

Des détails conviviaux et des codes de raison stables peuvent être ajoutés sur les lignes suivantes.

## Connexes

- [Gestion des secrets](/fr/gateway/secrets)
- [Stockage d'auth](/fr/concepts/oauth)
