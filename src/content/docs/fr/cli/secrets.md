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
- `audit` : analyse en lecture seule des magasins de configuration/authentification/modèle généré et des résidus hérités pour le texte en clair, les références non résolues et la dérive de priorité (les références d'exécution sont ignorées sauf si `--allow-exec` est défini).
- `configure` : planificateur interactif pour la configuration du fournisseur, le mappage des cibles et les vérifications préalables (TTY requis).
- `apply` : exécute un plan enregistré (`--dry-run` pour la validation uniquement ; le dry-run ignore les vérifications d'exécution par défaut, et le mode d'écriture rejette les plans contenant des exécutions sauf si `--allow-exec` est défini), puis nettoie les résidus de texte en clair ciblés.

Boucle d'opérateur recommandée :

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

Si votre plan inclut des `exec` SecretRefs/fournisseurs, passez `--allow-exec` sur les commandes d'application dry-run et write.

Note sur le code de sortie pour CI/gates :

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
openclaw secrets reload --url ws://127.0.0.1:18789 --token <token>
```

Notes :

- Utilise la méthode RPC de la passerelle `secrets.reload`.
- Si la résolution échoue, la passerelle conserve le dernier instantané fonctionnel connu et renvoie une erreur (pas d'activation partielle).
- La réponse JSON inclut `warningCount`.

Options :

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--json`

## Audit

Scanner l'état OpenClaw pour :

- stockage de secrets en texte brut
- références non résolues
- dérive de priorité (informations d'identification `auth-profiles.json` masquant les références `openclaw.json`)
- résidus `agents/*/agent/models.json` générés (valeurs `apiKey` du fournisseur et en-têtes sensibles du fournisseur)
- résidus hérités (entrées du magasin d'authentification hérité, rappels OAuth)

Note sur les résidus d'en-tête :

- La détection d'en-têtes sensibles de fournisseur est basée sur une heuristique de noms (noms d'en-têtes et fragments d'authentification/informations d'identification courants tels que `authorization`, `x-api-key`, `token`, `secret`, `password` et `credential`).

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

Comportement de sortie :

- `--check` se termine avec un code non nul en cas de résultats.
- les références non résolues se terminent avec un code non nul de priorité plus élevée.

Points saillants de la forme du rapport :

- `status` : `clean | findings | unresolved`
- `resolution` : `refsChecked`, `skippedExecRefs`, `resolvabilityComplete`
- `summary` : `plaintextCount`, `unresolvedRefCount`, `shadowedRefCount`, `legacyResidueCount`
- codes de résultat :
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## Configurer (assistant interactif)

Créer des modifications de fournisseur et de SecretRef de manière interactive, exécuter les contrôles préalables et appliquer éventuellement :

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
- Mappage des informations d'identification ensuite (sélectionner les champs et assigner les références `{source, provider, id}`).
- Contrôles préalables et application facultative en dernier.

Drapeaux :

- `--providers-only` : configurer uniquement `secrets.providers` , ignorer le mappage des identifiants.
- `--skip-provider-setup` : ignorer la configuration du fournisseur et mapper les identifiants aux fournisseurs existants.
- `--agent <id>` : limiter la découverte des cibles `auth-profiles.json` et les écritures à un magasin d'agent.
- `--allow-exec` : autoriser les vérifications exec SecretRef pendant preflight/apply (peut exécuter des commandes fournisseur).

Notes :

- Nécessite un TTY interactif.
- Vous ne pouvez pas combiner `--providers-only` avec `--skip-provider-setup`.
- `configure` cible les champs contenant des secrets dans `openclaw.json` ainsi que `auth-profiles.json` pour la portée de l'agent sélectionné.
- `configure` prend en charge la création de nouveaux mappages `auth-profiles.json` directement dans le flux du sélecteur.
- Surface prise en charge canonique : [SecretRef Credential Surface](/fr/reference/secretref-credential-surface).
- Il effectue une résolution préliminaire avant l'application.
- Si preflight/apply inclut des références exec, gardez `--allow-exec` activé pour les deux étapes.
- Les plans générés utilisent par défaut les options de nettoyage (`scrubEnv`, `scrubAuthProfilesForProviderTargets`, `scrubLegacyAuthJson` tous activés).
- Le chemin d'application est à sens unique pour les valeurs en texte clair nettoyées.
- Sans `--apply`, la CLI demande toujours `Apply this plan now?` après la pré-vérification.
- Avec `--apply` (et sans `--yes`), la CLI demande une confirmation irréversible supplémentaire.
- `--json` affiche le plan + le rapport préliminaire, mais la commande nécessite toujours un TTY interactif.

Note de sécurité pour le fournisseur exec :

- Les installations Homebrew exposent souvent des binaires symbolisés sous `/opt/homebrew/bin/*`.
- Définissez `allowSymlinkCommand: true` uniquement lorsque nécessaire pour les chemins de gestionnaire de packages de confiance, et associez-le à `trustedDirs` (par exemple `["/opt/homebrew"]`).
- Sur Windows, si la vérification ACL n'est pas disponible pour un chemin fournisseur, OpenClaw échoue en mode fermé. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce fournisseur pour contourner les vérifications de sécurité du chemin.

## Appliquer un plan enregistré

Appliquer ou effectuer un prévol pour un plan généré précédemment :

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Comportement exec :

- `--dry-run` valide le prévol sans écrire de fichiers.
- Les vérifications exec SecretRef sont ignorées par défaut en mode dry-run.
- Le mode d'écriture rejette les plans contenant des SecretRefs/providers exec, sauf si `--allow-exec` est défini.
- Utilisez `--allow-exec` pour activer les vérifications/exécutions de provider exec dans l'un ou l'autre mode.

Détails du contrat de plan (chemins cibles autorisés, règles de validation et sémantique d'échec) :

- [Secrets Apply Plan Contract](/fr/gateway/secrets-plan-contract)

Ce que `apply` peut mettre à jour :

- `openclaw.json` (cibles SecretRef + créations/mises à jour/suppressions de provider)
- `auth-profiles.json` (nettoyage ciblé par provider)
- résidus `auth.json` hérités
- `~/.openclaw/.env` clés de secret connues dont les valeurs ont été migrées

## Pourquoi pas de sauvegardes de retour arrière (rollback)

`secrets apply` n'écrit pas intentionnellement de sauvegardes de retour arrière contenant d'anciennes valeurs en clair.

La sécurité provient d'un prévol strict + d'une application quasi atomique avec une restauration en mémoire de meilleur effort en cas d'échec.

## Exemple

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

Si `audit --check` signale encore des résultats en clair, mettez à jour les chemins cibles restants signalés et relancez l'audit.
