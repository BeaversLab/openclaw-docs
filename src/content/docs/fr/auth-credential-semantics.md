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

## Portabilité de la copie de l'agent

L'héritage de l'authentification de l'agent est en lecture directe. Lorsqu'un agent n'a pas de profil local, il peut résoudre les profils à partir du magasin de l'agent par défaut/principal au moment de l'exécution sans copier de matériel secret dans son propre `auth-profiles.json`.

Les flux de copie explicite, tels que `openclaw agents add`, utilisent cette stratégie de portabilité :

- Les profils `api_key` sont portables sauf `copyToAgents: false`.
- Les profils `token` sont portables sauf `copyToAgents: false`.
- Les profils `oauth` ne sont pas portables par défaut car les jetons d'actualisation peuvent être à usage unique ou sensibles à la rotation.
- Les flux OAuth détenus par le fournisseur peuvent opter pour OAuth`copyToAgents: true` uniquement lorsque la copie du matériel d'actualisation entre les agents est connue comme sûre.

Les profils non portables restent disponibles via l'héritage en lecture directe, sauf si l'agent cible se connecte séparément et crée son propre profil local.

## Routes d'authentification configuration uniquement

Les entrées `auth.profiles` avec `mode: "aws-sdk"` sont des métadonnées de routage, et non des identifiants stockés. Elles sont valides lorsque le fournisseur cible utilise `models.providers.<id>.auth: "aws-sdk"`Amazon Bedrock ou la route par défaut du AWS SDK intégrée d'Amazon Bedrock. Ces identifiants de profil peuvent apparaître dans `auth.order` et les remplacements de session même si aucune entrée correspondante n'existe dans `auth-profiles.json`.

N'écrivez pas `type: "aws-sdk"` dans `auth-profiles.json`. Si une installation héritée possède un tel marqueur, `openclaw doctor --fix` le déplace vers `auth.profiles` et supprime le marqueur du magasin d'identifiants.

## Filtrage explicite de l'ordre d'authentification

- Lorsque `auth.order.<provider>` ou le remplacement de l'ordre du magasin d'authentification est défini pour un fournisseur, `models status --probe` sonde uniquement les identifiants de profil qui restent dans l'ordre d'authentification résolu pour ce fournisseur.
- Un profil stocké pour ce fournisseur qui est omis de l'ordre explicite n'est pas essayé silencieusement plus tard. La sortie de la sonde le signale avec `reasonCode: excluded_by_auth_order` et le détail `Excluded by auth.order for this provider.`

## Résolution de la cible de la sonde

- Les cibles de la sonde peuvent provenir de profils d'authentification, d'identifiants d'environnement ou de `models.json`.
- Si un fournisseur a des informations d'identification mais qu'OpenClaw ne peut pas résoudre de candidat de modèle sondeable pour celui-ci, OpenClaw`models status --probe` signale `status: no_model` avec `reasonCode: no_model`.

## Découverte d'informations d'identification CLI externe

- Les informations d'identification uniquement d'exécution détenues par des CLI externes ne sont découvertes que lorsque le fournisseur, le runtime ou le profil d'authentification est dans la portée de l'opération actuelle, ou lorsqu'un profil local stocké pour cette source externe existe déjà.
- Les appelants du magasin d'authentification doivent choisir un mode de découverte CLI externe explicite : CLI`none` pour l'authentification persistante/plugin uniquement, `existing`CLI pour actualiser les profils CLI externes déjà stockés, ou `scoped` pour un ensemble concret de fournisseur/profil.
- Les chemins en lecture seule/statut transmettent `allowKeychainPrompt: false`CLImacOS ; ils utilisent uniquement les informations d'identification CLI externes stockées dans des fichiers et ne lisent ni ne réutilisent les résultats du trousseau macOS.

## Garde de stratégie SecretRef OAuth

- L'entrée SecretRef est réservée uniquement aux informations d'identification statiques.
- Si une information d'identification de profil est `type: "oauth"`, les objets SecretRef ne sont pas pris en charge pour cette matière d'information d'identification de profil.
- Si `auth.profiles.<id>.mode` est `"oauth"`, l'entrée `keyRef`/`tokenRef` basée sur SecretRef pour ce profil est rejetée.
- Les violations entraînent des échecs bloquants dans les chemins de résolution d'authentification au démarrage/au rechargement.

## Messagerie compatible avec l'héritage

Pour la compatibilité des scripts, les erreurs de sonde gardent cette première ligne inchangée :

`Auth profile credentials are missing or expired.`

Des détails conviviaux et des codes de raison stables peuvent être ajoutés sur les lignes suivantes.

## Connexes

- [Gestion des secrets](/fr/gateway/secrets)
- [Stockage d'authentification](/fr/concepts/oauth)
