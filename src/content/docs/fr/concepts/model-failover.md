---
summary: "Comment OpenClaw fait une rotation des profils d'authentification et revient sur différents modèles"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
title: "Bascule de modèle"
---

# Bascule de modèle

OpenClaw gère les échecs en deux étapes :

1. **Rotation des profils d'authentification** au sein du fournisseur actuel.
2. **Bascule de modèle** vers le modèle suivant dans `agents.defaults.model.fallbacks`.

Ce document explique les règles d'exécution et les données qui les prennent en charge.

## Stockage d'authentification (clés + OAuth)

OpenClaw utilise des **profils d'authentification** pour les clés API et les jetons OAuth.

- Les secrets sont stockés dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (ancien : `~/.openclaw/agent/auth-profiles.json`).
- La configuration `auth.profiles` / `auth.order` contient **uniquement des métadonnées et du routage** (pas de secrets).
- Fichier d'importation uniquement hérité OAuth : `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` lors de la première utilisation).

Plus de détails : [/concepts/oauth](/fr/concepts/oauth)

Types d'identifiants :

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` pour certains fournisseurs)

## ID de profil

Les connexions OAuth créent des profils distincts afin que plusieurs comptes puissent coexister.

- Par défaut : `provider:default` lorsqu'aucun e-mail n'est disponible.
- OAuth avec e-mail : `provider:<email>` (par exemple `google-antigravity:user@gmail.com`).

Les profils résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` sous `profiles`.

## Ordre de rotation

Lorsqu'un fournisseur possède plusieurs profils, OpenClaw choisit un ordre comme celui-ci :

1. **Configuration explicite** : `auth.order[provider]` (si défini).
2. **Profils configurés** : `auth.profiles` filtrés par fournisseur.
3. **Profils stockés** : entrées dans `auth-profiles.json` pour le fournisseur.

Si aucun ordre explicite n'est configuré, OpenClaw utilise un ordre tournant (round‑robin) :

- **Clé primaire :** type de profil (**OAuth avant les clés API**).
- **Clé secondaire :** `usageStats.lastUsed` (la plus ancienne en premier, dans chaque type).
- Les **profils en cooldown/désactivés** sont déplacés à la fin, classés par expiration la plus proche.

### Persistance de session (compatible avec le cache)

OpenClaw **épingle le profil d'authentification choisi par session** pour garder les caches des fournisseurs chauds.
Il **ne** fait pas de rotation à chaque requête. Le profil épinglé est réutilisé jusqu'à :

- la session est réinitialisée (`/new` / `/reset`)
- un compactage est terminé (le compteur de compactage incrémente)
- le profil est en cooldown/désactivé

La sélection manuelle via `/model …@<profileId>` définit une **substitution utilisateur** pour cette session
et n'est pas automatiquement pivotée jusqu'à ce qu'une nouvelle session commence.

Les profils épinglés automatiquement (sélectionnés par le routeur de session) sont traités comme une **préférence** :
ils sont essayés en premier, mais OpenClaw peut pivoter vers un autre profil en cas de limites de délai/d'attentes.
Les profils épinglés par l'utilisateur restent verrouillés sur ce profil ; s'il échoue et que les replis de modèle
sont configurés, OpenClaw passe au modèle suivant au lieu de changer de profil.

### Pourquoi OAuth peut sembler "perdu"

Si vous avez à la fois un profil OAuth et un profil de clé API pour le même fournisseur, le round-robin peut passer de l'un à l'autre entre les messages sauf si épinglé. Pour forcer un seul profil :

- Épinglez avec `auth.order[provider] = ["provider:profileId"]`, ou
- Utilisez une substitution par session via `/model …` avec une substitution de profil (lorsque pris en charge par votre interface/chat).

## Cooldowns

Lorsqu'un profil échoue en raison d'erreurs d'authentification/de limite de débit (ou d'un délai d'attente ressemblant
à une limite de débit), OpenClaw le marque en cooldown et passe au profil suivant.
Les erreurs de format/requête invalide (par exemple, échecs de validation de l'ID d'appel d'outil
Cloud Code Assist) sont considérées comme justifiant un repli et utilisent les mêmes cooldowns.
Les erreurs de raison d'arrêt compatibles OpenAI telles que `Unhandled stop reason: error`,
`stop reason: error` et `reason: error` sont classées comme signaux de délai d'attente/repli.

Les cooldowns utilisent une temporisation exponentielle :

- 1 minute
- 5 minutes
- 25 minutes
- 1 heure (plafond)

L'état est stocké dans `auth-profiles.json` sous `usageStats` :

```json
{
  "usageStats": {
    "provider:profile": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

## Désactivations de facturation

Les échecs de facturation/crédit (par exemple « crédits insuffisants » / « solde de crédit trop faible ») sont considérés comme justifiant un basculement, mais ils ne sont généralement pas transitoires. Au lieu d'un court temps de recharge, OpenClaw marque le profil comme **désactivé** (avec un délai plus long) et passe au profil/fournisseur suivant.

L'état est stocké dans `auth-profiles.json` :

```json
{
  "usageStats": {
    "provider:profile": {
      "disabledUntil": 1736178000000,
      "disabledReason": "billing"
    }
  }
}
```

Valeurs par défaut :

- Le délai de récupération de facturation commence à **5 heures**, double à chaque échec de facturation et plafonne à **24 heures**.
- Les compteurs de délai sont réinitialisés si le profil n'a pas échoué pendant **24 heures** (configurable).

## Basculer de model

Si tous les profils d'un fournisseur échouent, OpenClaw passe au model suivant dans
`agents.defaults.model.fallbacks`. Cela s'applique aux échecs d'authentification, aux limites de débit et aux
délais d'attente qui ont épuisé la rotation des profils (les autres erreurs n'avancent pas le basculement).

Lorsqu'une exécution commence avec une substitution de model (hooks ou CLI), les basculements se terminent toujours à
`agents.defaults.model.primary` après avoir essayé tous les basculements configurés.

## Configuration associée

Voir la [configuration Gateway](/fr/gateway/configuration) pour :

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- Routage `agents.defaults.imageModel`

Voir [Models](/fr/concepts/models) pour l'aperçu global de la sélection et du basculement de model.
