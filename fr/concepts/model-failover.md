---
summary: "Comment OpenClaw fait une rotation des profils d'authentification et revient sur les modèles"
read_when:
  - Diagnostic de la rotation des profils d'authentification, des temps de recharge ou du comportement de repli de modèle
  - Mise à jour des règles de basculement pour les profils d'authentification ou les modèles
title: "Basculement de modèle"
---

# Basculement de modèle

OpenClaw gère les échecs en deux étapes :

1. **Rotation du profil d'authentification** au sein du fournisseur actuel.
2. **Repli de modèle** vers le modèle suivant dans `agents.defaults.model.fallbacks`.

Ce document explique les règles d'exécution et les données qui les soutiennent.

## Stockage d'authentification (clés + OAuth)

OpenClaw utilise des **profils d'authentification** pour les clés API et les jetons OAuth.

- Les secrets résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (ancien : `~/.openclaw/agent/auth-profiles.json`).
- La configuration `auth.profiles` / `auth.order` est **métadonnées + routage uniquement** (pas de secrets).
- Fichier d'importation hérité OAuth uniquement : `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` lors de la première utilisation).

Plus de détails : [/concepts/oauth](/fr/concepts/oauth)

Types d'informations d'identification :

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` pour certains fournisseurs)

## ID de profil

Les connexions OAuth créent des profils distincts pour que plusieurs comptes puissent coexister.

- Par défaut : `provider:default` lorsqu'aucun e-mail n'est disponible.
- OAuth avec e-mail : `provider:<email>` (par exemple `google-antigravity:user@gmail.com`).

Les profils résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` sous `profiles`.

## Ordre de rotation

Lorsqu'un fournisseur a plusieurs profils, OpenClaw choisit un ordre comme ceci :

1. **Configuration explicite** : `auth.order[provider]` (si défini).
2. **Profils configurés** : `auth.profiles` filtrés par fournisseur.
3. **Profils stockés** : entrées dans `auth-profiles.json` pour le fournisseur.

Si aucun ordre explicite n'est configuré, OpenClaw utilise un ordre round‑robin :

- **Clé primaire :** type de profil (**OAuth avant les clés API**).
- **Clé secondaire :** `usageStats.lastUsed` (le plus ancien en premier, dans chaque type).
- Les **profils en temps de recharge/désactivés** sont déplacés à la fin, classés par expiration la plus proche.

### Persistance de session (respectueux du cache)

OpenClaw **épingle le profil d'authentification choisi par session** pour maintenir les caches des fournisseurs à chaud.
Il ne fait **pas** une rotation à chaque requête. Le profil épinglé est réutilisé jusqu'à ce que :

- la session soit réinitialisée (`/new` / `/reset`)
- un compactage soit terminé (le compteur de compactage s'incrémente)
- le profil est en temps de recharge/désactivé

La sélection manuelle via `/model …@<profileId>` définit un **remplacement par l'utilisateur** pour cette session
et n'est pas soumise à la rotation automatique tant qu'une nouvelle session n'a pas commencé.

Les profils épinglés automatiquement (sélectionnés par le routeur de session) sont traités comme une **préférence** :
ils sont essayés en premier, mais OpenClaw peut passer à un autre profil en cas de limites de délai/délais d'attente.
Les profils épinglés par l'utilisateur restent verrouillés sur ce profil ; s'il échoue et que les replis de modèle
sont configurés, OpenClaw passe au modèle suivant au lieu de changer de profil.

### Pourquoi OAuth peut sembler "perdu"

Si vous disposez à la fois d'un profil OAuth et d'un profil de clé API pour le même fournisseur, le round-robin peut basculer entre eux d'un message à l'autre sauf s'ils sont épinglés. Pour forcer un profil unique :

- Épinglez avec `auth.order[provider] = ["provider:profileId"]`, ou
- Utilisez un remplacement par session via `/model …` avec un remplacement de profil (lorsque cela est pris en charge par votre interface/discussion).

## Temps de recharge

Lorsqu'un profil échoue en raison d'erreurs d'authentification/de limite de débit (ou d'un délai d'attente ressemblant
à une limitation de débit), OpenClaw le marque en temps de recharge et passe au profil suivant.
Les erreurs de format/requête invalide (par exemple, échecs de validation de l'ID d'appel d'outil Cloud Code Assist)
sont considérées comme justifiant un repli et utilisent les mêmes temps de recharge.
Les erreurs de raison d'arrêt compatibles avec OpenAI telles que `Unhandled stop reason: error`,
`stop reason: error` et `reason: error` sont classées comme signaux de délai d'attente/repli.

Les temps de recharge utilisent un backoff exponentiel :

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

Les échecs de facturation/crédit (par exemple « crédits insuffisants » / « solde de crédit trop faible ») sont considérés comme justifiant un repli, mais ils ne sont généralement pas transitoires. Au lieu d'un court temps de recharge, OpenClaw marque le profil comme **désactivé** (avec un backoff plus long) et passe au profil/fournisseur suivant.

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

Paramètres par défaut :

- L'attente de facturation commence à **5 heures**, double à chaque échec de facturation et plafonne à **24 heures**.
- Les compteurs d'attente sont réinitialisés si le profil n'a pas échoué depuis **24 heures** (configurable).

## Basculement de modèle

Si tous les profils d'un fournisseur échouent, OpenClaw passe au modèle suivant dans
`agents.defaults.model.fallbacks`. Cela s'applique aux échecs d'authentification, aux limites de taux et
aux délais d'attente ayant épuisé la rotation des profils (les autres erreurs n'avancent pas le basculement).

Lorsqu'une exécution commence avec une substitution de modèle (hooks ou CLI), les basculements finissent toujours par
`agents.defaults.model.primary` après avoir essayé tous les basculements configurés.

## Configuration connexe

Voir [configuration du Gateway](/fr/gateway/configuration) pour :

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- Routage `agents.defaults.imageModel`

Voir [Modèles](/fr/concepts/models) pour l'aperçu général de la sélection et du basculement des modèles.

import en from "/components/footer/en.mdx";

<en />
