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
```

Notes :

- Utilise la méthode RPC de la passerelle `secrets.reload`.
- Si la résolution échoue, la passerelle conserve le dernier instantané fonctionnel connu et renvoie une erreur (pas d'activation partielle).
- La réponse JSON inclut `warningCount`.

## Audit

Scanner l'état OpenClaw pour :

- stockage de secrets en texte clair
- références non résolues
- dérive de priorité (les informations d'identification `auth-profiles.json` masquant les références `openclaw.json`)
- résidus `agents/*/agent/models.json` générés (valeurs `apiKey` du fournisseur et en-têtes sensibles du fournisseur)
- résidus hérités (entrées du magasin d'authentification hérité, rappels OAuth)

Note sur les résidus d'en-tête :

- La détection d'en-têtes sensibles du provider se base sur des heuristiques de noms (noms d'en-têtes d'authentification/d'identification courants et fragments tels que `authorization`, `x-api-key`, `token`, `secret`, `password` et `credential`).

```bash
openclaw secrets audit
openclaw secrets audit --check
openclaw secrets audit --json
openclaw secrets audit --allow-exec
```

Comportement de sortie :

- `--check` retourne un code non nul en cas de résultats.
- les références non résolues provoquent une sortie avec un code non nul de priorité plus élevée.

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

Construisez les modifications du provider et des SecretRef de manière interactive, exécutez une vérification préalable et appliquez-les optionnellement :

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
- Mappage des identifiants ensuite (sélectionnez les champs et assignez les références `{source, provider, id}`).
- Vérification préalable et application facultative en dernier.

Indicateurs :

- `--providers-only` : configure `secrets.providers` uniquement, ignore le mappage des identifiants.
- `--skip-provider-setup` : ignore la configuration du provider et mappe les identifiants aux providers existants.
- `--agent <id>` : limite la découverte de cibles `auth-profiles.json` et les écritures à un magasin d'agent unique.
- `--allow-exec` : autorise les vérifications de SecretRef exec pendant la vérification préalable/l'application (peut exécuter des commandes provider).

Notes :

- Nécessite un TTY interactif.
- Vous ne pouvez pas combiner `--providers-only` avec `--skip-provider-setup`.
- `configure` cible les champs contenant des secrets dans `openclaw.json` ainsi que `auth-profiles.json` pour la portée de l'agent sélectionné.
- `configure` prend en charge la création directe de nouveaux mappages `auth-profiles.json` dans le flux du sélecteur.
- Surface prise en charge canonique : [SecretRef Credential Surface](/fr/reference/secretref-credential-surface).
- Il effectue une résolution préliminaire avant l'application.
- Si la pré-vérification/l'application inclut des refs exec, gardez `--allow-exec` défini pour ces deux étapes.
- Les plans générés utilisent par défaut les options de nettoyage (`scrubEnv`, `scrubAuthProfilesForProviderTargets`, `scrubLegacyAuthJson` tous activés).
- Le chemin d'application est à sens unique pour les valeurs en texte clair nettoyées.
- Sans `--apply`, la CLI demande toujours `Apply this plan now?` après la pré-vérification.
- Avec `--apply` (et sans `--yes`), la CLI demande une confirmation irréversible supplémentaire.

Remarque de sécurité pour le provider d'exécution :

- Les installations Homebrew exposent souvent des binaires liés par lien symbolique sous `/opt/homebrew/bin/*`.
- Ne définissez `allowSymlinkCommand: true` que lorsque cela est nécessaire pour les chemins de gestionnaires de packages approuvés, et associez-le à `trustedDirs` (par exemple `["/opt/homebrew"]`).
- Sur Windows, si la vérification ACL est indisponible pour un chemin de provider, OpenClaw échoue en mode fermé. Pour les chemins approuvés uniquement, définissez `allowInsecurePath: true` sur ce provider pour contourner les vérifications de sécurité du chemin.

## Appliquer un plan enregistré

Appliquer ou effectuer une pré-vérification d'un plan généré précédemment :

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --json
```

Comportement d'exécution :

- `--dry-run` valide la pré-vérification sans écrire de fichiers.
- Les vérifications exec SecretRef sont ignorées par défaut en mode simulation (dry-run).
- Le mode d'écriture rejette les plans contenant des SecretRefs/providers exec, sauf si `--allow-exec` est défini.
- Utilisez `--allow-exec` pour activer les vérifications/exécutions de provider exec dans l'un ou l'autre mode.

Détails du contrat de plan (chemins cibles autorisés, règles de validation et sémantique d'échec) :

- [Secrets Apply Plan Contract](/fr/gateway/secrets-plan-contract)

Ce que `apply` peut mettre à jour :

- `openclaw.json` (cibles SecretRef + créations/mises à jour/suppressions de providers)
- `auth-profiles.json` (nettoyage des cibles de provider)
- résidus `auth.json` hérités
- `~/.openclaw/.env` clés secrètes connues dont les valeurs ont été migrées

## Pourquoi pas de sauvegardes de retour en arrière (rollback)

`secrets apply` n'écrit intentionnellement pas de sauvegardes de restauration contenant d'anciennes valeurs en texte brut.

La sécurité provient d'une vérification préalable stricte et d'une application quasi atomique, avec une restauration en mémoire de meilleure effort en cas d'échec.

## Exemple

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

Si `audit --check` signale encore des résultats en texte brut, mettez à jour les chemins cibles signalés restants et relancez l'audit.

import fr from "/components/footer/fr.mdx";

<fr />
