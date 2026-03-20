---
summary: "Référence de la CLI pour `openclaw secrets` (reload, audit, configure, apply)"
read_when:
  - Re-resolving secret refs at runtime
  - Auditing plaintext residues and unresolved refs
  - Configuring SecretRefs and applying one-way scrub changes
title: "secrets"
---

# `openclaw secrets`

Use `openclaw secrets` to manage SecretRefs and keep the active runtime snapshot healthy.

Command roles:

- `reload`: gateway RPC (`secrets.reload`) that re-resolves refs and swaps runtime snapshot only on full success (no config writes).
- `audit`: read-only scan of configuration/auth/generated-model stores and legacy residues for plaintext, unresolved refs, and precedence drift (exec refs are skipped unless `--allow-exec` is set).
- `configure`: interactive planner for provider setup, target mapping, and preflight (TTY required).
- `apply`: execute a saved plan (`--dry-run` for validation only; dry-run skips exec checks by default, and write mode rejects exec-containing plans unless `--allow-exec` is set), then scrub targeted plaintext residues.

Recommended operator loop:

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets audit --check
openclaw secrets reload
```

If your plan includes `exec` SecretRefs/providers, pass `--allow-exec` on both dry-run and write apply commands.

Exit code note for CI/gates:

- `audit --check` returns `1` on findings.
- unresolved refs return `2`.

Related:

- Secrets guide: [Secrets Management](/fr/gateway/secrets)
- Credential surface: [SecretRef Credential Surface](/fr/reference/secretref-credential-surface)
- Security guide: [Security](/fr/gateway/security)

## Reload runtime snapshot

Re-resolve secret refs and atomically swap runtime snapshot.

```bash
openclaw secrets reload
openclaw secrets reload --json
```

Notes:

- Uses gateway RPC method `secrets.reload`.
- If resolution fails, gateway keeps last-known-good snapshot and returns an error (no partial activation).
- JSON response includes `warningCount`.

## Audit

Scan OpenClaw state for:

- plaintext secret storage
- unresolved refs
- dérive de priorité (informations d'identification `auth-profiles.json` masquant les références `openclaw.json`)
- résidus `agents/*/agent/models.json` générés (valeurs de `apiKey` du provider et en-têtes sensibles du provider)
- résidus hérités (entrées de stockage d'auth héritées, rappels OAuth)

Note sur les résidus d'en-tête :

- La détection d'en-tête sensible du provider est basée sur une heuristique de nom (noms d'en-tête et fragments d'authentification/d'identification courants tels que `authorization`, `x-api-key`, `token`, `secret`, `password` et `credential`).

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

Comportement de sortie :

- `--check` se termine avec un code non nul en cas de résultats.
- les références non résolues se terminent avec un code non nulé de priorité supérieure.

Points saillants de la forme du rapport :

- `status` : `clean | findings | unresolved`
- `resolution` : `refsChecked`, `skippedExecRefs`, `resolvabilityComplete`
- `summary` : `plaintextCount`, `unresolvedRefCount`, `shadowedRefCount`, `legacyResidueCount`
- codes de résultats :
  - `PLAINTEXT_FOUND`
  - `REF_UNRESOLVED`
  - `REF_SHADOWED`
  - `LEGACY_RESIDUE`

## Configurer (assistant interactif)

Créez des modifications de provider et SecretRef de manière interactive, exécutez une vérification préliminaire et appliquez-les éventuellement :

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

- Configuration du provider en premier (`add/edit/remove` pour les alias `secrets.providers`).
- Mappage des informations d'identification ensuite (sélectionnez les champs et assignez les références `{source, provider, id}`).
- Vérification préliminaire et application facultative en dernier.

Indicateurs :

- `--providers-only` : configurer uniquement `secrets.providers`, ignorer le mappage des informations d'identification.
- `--skip-provider-setup` : ignorer la configuration du provider et mapper les informations d'identification aux providers existants.
- `--agent <id>` : limiter la découverte de cible `auth-profiles.json` et les écritures à un magasin d'agent.
- `--allow-exec` : autoriser les vérifications SecretRef exec lors de la vérification préliminaire/application (peut exécuter des commandes de provider).

Notes :

- Nécessite un TTY interactif.
- Vous ne pouvez pas combiner `--providers-only` avec `--skip-provider-setup`.
- `configure` cible les champs contenant des secrets dans `openclaw.json` ainsi que `auth-profiles.json` pour la portée de l'agent sélectionné.
- `configure` prend en charge la création de nouveaux mappages `auth-profiles.json` directement dans le flux du sélecteur.
- Surface prise en charge canonique : [SecretRef Credential Surface](/fr/reference/secretref-credential-surface).
- Il effectue une résolution préalable avant l'application.
- Si la phase préalable/l'application inclut des références exec, gardez `--allow-exec` défini pour ces deux étapes.
- Les plans générés sont définis par défaut sur les options de nettoyage (`scrubEnv`, `scrubAuthProfilesForProviderTargets`, `scrubLegacyAuthJson` tous activés).
- Le chemin d'application est à sens unique pour les valeurs de texte brut nettoyées.
- Sans `--apply`, le CLI demande toujours `Apply this plan now?` après la phase préalable.
- Avec `--apply` (et pas de `--yes`), le CLI demande une confirmation irréversible supplémentaire.

Note de sécurité pour le provider exec :

- Les installations Homebrew exposent souvent des binaires liés par lien symbolique sous `/opt/homebrew/bin/*`.
- Définissez `allowSymlinkCommand: true` uniquement lorsque cela est nécessaire pour les chemins de gestionnaires de packages de confiance, et associez-le à `trustedDirs` (par exemple `["/opt/homebrew"]`).
- Sur Windows, si la vérification ACL est indisponible pour un chemin de provider, OpenClaw échoue en mode fermé. Pour les chemins de confiance uniquement, définissez `allowInsecurePath: true` sur ce provider pour contourner les vérifications de sécurité du chemin.

## Appliquer un plan enregistré

Appliquer ou effectuer une phase préalable sur un plan généré précédemment :

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Comportement exec :

- `--dry-run` valide la phase préalable sans écrire de fichiers.
- Les checks exec SecretRef sont ignorés par défaut en mode simulation.
- Le mode écriture rejette les plans contenant des SecretRefs/providers exec sauf si `--allow-exec` est défini.
- Utilisez `--allow-exec` pour accepter les checks/exécutions de provider exec dans l'un ou l'autre mode.

Détails du contrat de plan (chemins cibles autorisés, règles de validation et sémantique d'échec) :

- [Secrets Apply Plan Contract](/fr/gateway/secrets-plan-contract)

Ce que `apply` peut mettre à jour :

- `openclaw.json` (cibles SecretRef + insertions/suppressions de provider)
- `auth-profiles.json` (nettoyage de la cible du provider)
- résidus `auth.json` hérités
- `~/.openclaw/.env` clés secrètes connues dont les valeurs ont été migrées

## Pourquoi pas de sauvegardes de retour en arrière

`secrets apply` n'écrit intentionnellement pas de sauvegardes de retour en arrière contenant d'anciennes valeurs en clair.

La sécurité provient d'une vérification préalable stricte + d'une application quasi atomique avec une restauration en mémoire de meilleur effort en cas d'échec.

## Exemple

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

Si `audit --check` signale toujours des résultats en clair, mettez à jour les chemins cible signalés restants et relancez l'audit.

import en from "/components/footer/en.mdx";

<en />
