---
summary: "Référence CLI pour `openclaw secrets` (reload, audit, configure, apply)"
read_when:
  - Re-resolving secret refs at runtime
  - Auditing plaintext residues and unresolved refs
  - Configuring SecretRefs and applying one-way scrub changes
title: "secrets"
---

# `openclaw secrets`

Utilisez `openclaw secrets` pour gérer les SecretRefs et maintenir l'instantané d'exécution actif en bonne santé.

Rôles des commandes :

- `reload` : passerelle RPC (`secrets.reload`) qui résout à nouveau les références et échange l'instantané d'exécution uniquement en cas de succès total (pas d'écriture de configuration).
- `audit` : analyse en lecture seule des magasins de configuration/authentification/modèle généré et des résidus hérités pour le texte brut, les références non résolues et la dérive de priorité.
- `configure` : planificateur interactif pour la configuration du fournisseur, le mappage des cibles et les vérifications préalables (TTY requis).
- `apply` : exécuter un plan enregistré (`--dry-run` pour la validation uniquement), puis nettoyer les résidus de texte brut ciblés.

Boucle d'opérateur recommandée :

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

Remarque sur le code de sortie pour CI/portes :

- `audit --check` renvoie `1` en cas de résultats.
- les références non résolues renvoient `2`.

Connexes :

- Guide des secrets : [Gestion des secrets](/fr/gateway/secrets)
- Surface des informations d'identification : [Surface des informations d'identification SecretRef](/fr/reference/secretref-credential-surface)
- Guide de sécurité : [Sécurité](/fr/gateway/security)

## Recharger l'instantané d'exécution

Résoudre à nouveau les références de secrets et échanger atomiquement l'instantané d'exécution.

```bash
openclaw secrets reload
openclaw secrets reload --json
```

Notes :

- Utilise la méthode de passerelle RPC `secrets.reload`.
- Si la résolution échoue, la passerelle conserve le dernier instantané en bon état connu et renvoie une erreur (pas d'activation partielle).
- La réponse JSON inclut `warningCount`.

## Audit

Analyser l'état OpenClaw pour :

- stockage de secrets en texte brut
- références non résolues
- dérive de priorité (informations d'identification `auth-profiles.json` masquant les références `openclaw.json`)
- résidus `agents/*/agent/models.json` générés (valeurs `apiKey` du fournisseur et en-têtes sensibles du fournisseur)
- résidus hérités (entrées de stockage d'authentification héritées, rappels OAuth)

Note sur les résidus d'en-tête :

- La détection d'en-tête de fournisseur sensible est basée sur des heuristiques de noms (noms d'en-tête et fragments d'authentification/d'identification courants tels que `authorization`, `x-api-key`, `token`, `secret`, `password` et `credential`).

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
```

Comportement de sortie :

- `--check` se termine avec un code non nul en cas de résultats.
- les références non résolues provoquent une sortie avec un code non nul de priorité plus élevée.

Points saillants de la forme du rapport :

- `status` : `clean | findings | unresolved`
- `summary` : `plaintextCount`, `unresolvedRefCount`, `shadowedRefCount`, `legacyResidueCount`
- codes de résultat :
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## Configurer (assistant interactif)

Créer des modifications de fournisseur et de SecretRef de manière interactive, exécuter des pré-vols et appliquer facultativement :

```bash
openclaw secrets configure
openclaw secrets configure --plan-out /tmp/openclaw-secrets-plan.json
openclaw secrets configure --apply --yes
openclaw secrets configure --providers-only
openclaw secrets configure --skip-provider-setup
openclaw secrets configure --agent ops
openclaw secrets configure --json
```

Flux :

- Configuration du fournisseur d'abord (`add/edit/remove` pour les alias `secrets.providers`).
- Mappage des identifiants ensuite (sélectionner les champs et assigner les références `{source, provider, id}`).
- Pré-vol et application facultative en dernier.

Indicateurs :

- `--providers-only` : configurer `secrets.providers` uniquement, ignorer le mappage des identifiants.
- `--skip-provider-setup` : ignorer la configuration du fournisseur et mapper les identifiants aux fournisseurs existants.
- `--agent <id>` : limiter la découverte de cibles `auth-profiles.json` et les écritures à un magasin d'agent.

Notes :

- Nécessite un TTY interactif.
- Vous ne pouvez pas combiner `--providers-only` avec `--skip-provider-setup`.
- `configure` cible les champs contenant des secrets dans `openclaw.json` ainsi que `auth-profiles.json` pour la portée de l'agent sélectionné.
- `configure` prend en charge la création de nouveaux mappages `auth-profiles.json` directement dans le flux du sélecteur.
- Surface prise en charge canonique : [SecretRef Credential Surface](/fr/reference/secretref-credential-surface).
- Il effectue une résolution préliminaire avant l'application.
- Les plans générés utilisent par défaut les options de nettoyage (`scrubEnv`, `scrubAuthProfilesForProviderTargets`, `scrubLegacyAuthJson` tous activés).
- Le chemin d'application est à sens unique pour les valeurs en texte clair nettoyées.
- Sans `--apply`, la CLI demande quand même `Apply this plan now?` après la vérification préliminaire.
- Avec `--apply` (et pas de `--yes`), la CLI demande une confirmation irréversible supplémentaire.

Remarque de sécurité pour le fournisseur d'exécution :

- Les installations Homebrew exposent souvent des binaires liés symboliquement sous `/opt/homebrew/bin/*`.
- Définissez `allowSymlinkCommand: true` uniquement lorsque cela est nécessaire pour les chemins de gestionnaire de packages fiables, et associez-le à `trustedDirs` (par exemple `["/opt/homebrew"]`).
- Sur Windows, si la vérification ACL n'est pas disponible pour un chemin de fournisseur, OpenClaw échoue en mode fermé. Pour les chemins fiables uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

## Appliquer un plan enregistré

Appliquer ou effectuer une vérification préliminaire d'un plan généré précédemment :

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Détails du contrat de plan (chemins cibles autorisés, règles de validation et sémantique d'échec) :

- [Secrets Apply Plan Contract](/fr/gateway/secrets-plan-contract)

Ce que `apply` peut mettre à jour :

- `openclaw.json` (cibles SecretRef + insertions/suppressions de fournisseurs)
- `auth-profiles.json` (nettoyage ciblé par le fournisseur)
- résidus `auth.json` hérités
- `~/.openclaw/.env` clés secrètes connues dont les valeurs ont été migrées

## Pourquoi pas de sauvegardes de retour en arrière

`secrets apply` n'écrit pas intentionnellement de sauvegardes de retour en arrière contenant d'anciennes valeurs en texte clair.

La sécurité provient d'une vérification préliminaire stricte + d'une application quasi atomique avec une restauration en mémoire de meilleur effort en cas d'échec.

## Exemple

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

Si `audit --check` signale encore des résultats en texte brut, mettez à jour les chemins cible signalés restants et relancez l'audit.

import fr from "/components/footer/fr.mdx";

<fr />
