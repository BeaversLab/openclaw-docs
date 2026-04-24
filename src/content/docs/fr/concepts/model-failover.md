---
summary: "Comment OpenClaw fait une rotation des profils d'authentification et revient sur différents modèles"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "Bascule de modèle"
---

# Bascule de modèle

OpenClaw gère les échecs en deux étapes :

1. **Rotation des profils d'authentification** au sein du fournisseur actuel.
2. **Bascule de modèle** vers le modèle suivant dans `agents.defaults.model.fallbacks`.

Ce document explique les règles d'exécution et les données qui les prennent en charge.

## Flux d'exécution

Pour une exécution de texte normale, OpenClaw évalue les candidats dans cet ordre :

1. Le modèle de session actuellement sélectionné.
2. `agents.defaults.model.fallbacks` configurés dans l'ordre.
3. Le modèle principal configuré à la fin lorsque l'exécution a commencé à partir d'une substitution.

À l'intérieur de chaque candidat, OpenClaw essaie le basculement de profil d'authentification avant de passer au
prochain candidat de modèle.

Séquence de haut niveau :

1. Résoudre le modèle de session actif et la préférence de profil d'authentification.
2. Construire la chaîne de candidats de modèle.
3. Essayer le fournisseur actuel avec les règles de rotation/refroidissement de profil d'authentification.
4. Si ce fournisseur est épuisé avec une erreur justifiant un basculement, passer au
   prochain candidat de modèle.
5. Persister la substitution de basculement sélectionnée avant le début de la nouvelle tentative afin que les autres
   lecteurs de session voient le même fournisseur/modèle que l'exécuteur est sur le point d'utiliser.
6. Si le candidat de basculement échoue, annuler uniquement les champs de substitution
   de session appartenant au basculement lorsqu'ils correspondent toujours à ce candidat ayant échoué.
7. Si tous les candidats échouent, lancer une `FallbackSummaryError` avec des détails
   par tentative et la prochaine expiration du refroidissement lorsqu'une est connue.

Ceci est intentionnellement plus restreint que « sauvegarder et restaurer toute la session ». L'exécuteur
de réponse ne persiste que les champs de sélection de modèle dont il a la propriété pour le basculement :

- `providerOverride`
- `modelOverride`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Cela empêche une nouvelle tentative de basculement ayant échoué d'écraser des mutations de session plus récentes et non liées,
telles que les modifications manuelles de `/model` ou les mises à jour de rotation de session survenues
pendant que la tentative était en cours.

## Stockage d'authentification (clés + OAuth)

OpenClaw utilise des **profils d'authentification** à la fois pour les clés API et les jetons OAuth.

- Les secrets résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (ancien : `~/.openclaw/agent/auth-profiles.json`).
- L'état du routage d'authentification au runtime réside dans `~/.openclaw/agents/<agentId>/agent/auth-state.json`.
- La configuration `auth.profiles` / `auth.order` est **uniquement des métadonnées + du routage** (pas de secrets).
- Fichier hérité d'importation uniquement OAuth : `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` lors de la première utilisation).

Plus de détails : [/concepts/oauth](/fr/concepts/oauth)

Types d'identifiants :

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` pour certains fournisseurs)

## ID de profil

Les connexions OAuth créent des profils distincts pour que plusieurs comptes puissent coexister.

- Par défaut : `provider:default` lorsqu aucun e-mail n'est disponible.
- OAuth avec e-mail : `provider:<email>` (par exemple `google-antigravity:user@gmail.com`).

Les profils résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` sous `profiles`.

## Ordre de rotation

Lorsqu'un fournisseur a plusieurs profils, OpenClaw choisit un ordre comme ceci :

1. **Configuration explicite** : `auth.order[provider]` (si défini).
2. **Profils configurés** : `auth.profiles` filtrés par fournisseur.
3. **Profils stockés** : entrées dans `auth-profiles.json` pour le fournisseur.

Si aucun ordre explicite n'est configuré, OpenClaw utilise un ordre tournant (round‑robin) :

- **Clé primaire** : type de profil (**OAuth avant les clés API**).
- **Clé secondaire** : `usageStats.lastUsed` (le plus ancien en premier, dans chaque type).
- Les **profils en période de refroidissement/désactivés** sont déplacés à la fin, classés par expiration la plus proche.

### Persistance de session (cache-friendly)

OpenClaw **épingle le profil d'authentification choisi par session** pour garder les caches du fournisseur à jour.
Il **ne** fait pas de rotation à chaque requête. Le profil épinglé est réutilisé jusqu'à ce que :

- la session soit réinitialisée (`/new` / `/reset`)
- un compactage soit terminé (le compteur de compactage incrémente)
- le profil soit en période de refroidissement/désactivé

Une sélection manuelle via `/model …@<profileId>` définit une **substitution utilisateur** pour cette session
et n'est pas automatiquement tournée tant qu'une nouvelle session n'a pas commencé.

Les profils épinglés automatiquement (sélectionnés par le routeur de session) sont traités comme une **préférence** :
ils sont essayés en premier, mais OpenClaw peut passer à un autre profil en cas de limites de délai/d'expiration.
Les profils épinglés par l'utilisateur restent verrouillés sur ce profil ; s'il échoue et que les modèles de secours sont configurés, OpenClaw passe au modèle suivant au lieu de changer de profil.

### Pourquoi OAuth peut sembler "perdu"

Si vous disposez à la fois d'un profil OAuth et d'un profil de clé API pour le même fournisseur, le round-robin peut basculer entre eux d'un message à l'autre, sauf s'ils sont épinglés. Pour forcer un seul profil :

- Épinglez avec `auth.order[provider] = ["provider:profileId"]`, ou
- Utilisez une substitution par session via `/model …` avec une substitution de profil (lorsque pris en charge par votre interface de discussion/interface utilisateur).

## Cooldowns

Lorsqu'un profil échoue en raison d'erreurs d'authentification/de limite de taux (ou d'un délai d'expiration ressemblant à une limitation de débit), OpenClaw le place en refroidissement et passe au profil suivant. Ce compartiment de limite de taux est plus large que le simple `429` : il inclut également les messages du fournisseur tels que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted`, et les limites périodiques de fenêtre d'utilisation telles que `weekly/monthly limit reached`. Les erreurs de format/de demande invalide (par exemple, les échecs de validation de l'ID d'appel d'outil Cloud Code Assist) sont considérées comme justifiant un basculement et utilisent les mêmes temps de refroidissement. Les erreurs de raison d'arrêt compatibles OpenAI telles que `Unhandled stop reason: error`, `stop reason: error` et `reason: error` sont classées comme signaux de délai d'expiration/basculement. Le texte générique du serveur délimité au fournisseur peut également atterrir dans ce compartiment de délai d'expiration lorsque la source correspond à un modèle transitoire connu. Par exemple, Anthropic nu `An unknown error occurred` et les charges utiles JSON `api_error` avec du texte serveur transitoire tel que `internal server error`, `unknown error, 520`, `upstream error` ou `backend error` sont traitées comme des délais d'expiration justifiant un basculement. Le texte générique en amont spécifique à OpenRouter tel que `Provider returned error` nu est également traité comme un délai d'expiration uniquement lorsque le contexte du fournisseur est OpenRouter. Le texte de repli interne générique tel que `LLM request failed with an unknown error.` reste conservateur et ne déclenche pas de basculement par lui-même.

Certains SDK de fournisseur pourraient autrement dormir pendant une longue fenêtre `Retry-After` avant de retourner le contrôle à OpenClaw. Pour les SDK basés sur Stainless tels que Anthropic et OpenAI, OpenClaw plafonne les attentes `retry-after-ms` / `retry-after` internes du SDK à 60 secondes par défaut et expose immédiatement les réponses plus longues réessayables afin que ce chemin de basculement puisse s'exécuter. Ajustez ou désactivez le plafond avec `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` ; voir [/concepts/retry](/fr/concepts/retry).

Les temps de recharge de limitation de débit peuvent également être limités au modèle :

- OpenClaw enregistre `cooldownModel` pour les échecs de limitation de débit lorsque l'identifiant du modèle défaillant est connu.
- Un modèle frère sur le même fournisseur peut toujours être essayé lorsque le temps de recharge est limité à un modèle différent.
- Les fenêtres de facturation/désactivation bloquent toujours l'ensemble du profil entre les modèles.

Les temps de recharge utilisent une temporisation exponentielle :

- 1 minute
- 5 minutes
- 25 minutes
- 1 heure (plafond)

L'état est stocké dans `auth-state.json` sous `usageStats` :

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

Les échecs de facturation/crédit (par exemple « crédits insuffisants » / « solde de crédit trop bas ») sont considérés comme éligibles au basculement, mais ils ne sont généralement pas transitoires. Au lieu d'un court temps de recharge, OpenClaw marque le profil comme **désactivé** (avec une temporisation plus longue) et passe au profil/fournisseur suivant.

Toutes les responses de type facturation ne sont pas `402`, et chaque HTTP `402` n'atterrit pas ici. OpenClaw conserve le texte de facturation explicite dans la voie de facturation même lorsqu'un fournisseur renvoie `401` ou `403` à la place, mais les correspondants spécifiques au fournisseur restent limités au fournisseur qui les possède (par exemple OpenRouter `403 Key limit exceeded`). Meanwhile temporary `402` usage-window et les erreurs de limite de dépense d'organisation/espace de travail sont classées comme `rate_limit` lorsque le message semble réessayer (par exemple `weekly usage limit exhausted`, `daily limit reached, resets tomorrow`, or `organization spending limit exceeded`). Ceux-ci restent sur le chemin de court temps de recharge/basculement au lieu du chemin de désactivation de facturation longue.

L'état est stocké dans `auth-state.json` :

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

- L'attente pour la facturation commence à **5 heures**, double à chaque échec de facturation et est plafonnée à **24 heures**.
- Les compteurs d'attente sont réinitialisés si le profil n'a pas échoué pendant **24 heures** (configurable).
- Les tentatives de surcharge permettent **1 rotation de profil pour le même fournisseur** avant le repli de model.
- Les tentatives de surcharge utilisent **0 ms d'attente** par défaut.

## Repli de model

Si tous les profils d'un fournisseur échouent, OpenClaw passe au model suivant dans
`agents.defaults.model.fallbacks`. Cela s'applique aux échecs d'authentification, aux limites de taux et
taux d'expiration qui ont épuisé la rotation des profils (d'autres erreurs n'avancent pas le repli).

Les erreurs de surcharge et de limite de taux sont gérées plus agressivement que
les temps d'attente de facturation. Par défaut, OpenClaw permet une nouvelle tentative de profil d'authentification pour le même fournisseur,
puis passe au model de repli configuré suivant sans attendre.
Les signaux de fournisseur occupé tels que `ModelNotReadyException` atterrissent dans ce compartiment de surcharge.
Ajustez cela avec `auth.cooldowns.overloadedProfileRotations`,
`auth.cooldowns.overloadedBackoffMs` et
`auth.cooldowns.rateLimitedProfileRotations`.

Lorsqu'une exécution commence avec un remplacement de model (hooks ou CLI), les replis se terminent tout de même à
`agents.defaults.model.primary` après avoir essayé tous les replis configurés.

### Règles de la chaîne de candidats

OpenClaw construit la liste des candidats à partir du `provider/model` actuellement demandé
plus les replis configurés.

Règles :

- Le model demandé est toujours le premier.
- Les replis configurés explicitement sont dédupliqués mais non filtrés par la liste d'autorisation de model.
  Ils sont traités comme une intention explicite de l'opérateur.
- Si l'exécution actuelle est déjà sur un repli configuré dans la même famille de
  fournisseur, OpenClaw continue d'utiliser la chaîne configurée complète.
- Si l'exécution actuelle est sur un fournisseur différent de la configuration et que ce model
  actuel ne fait pas déjà partie de la chaîne de repli configurée, OpenClaw n'ajoute
  pas les replis configurés non liés d'un autre fournisseur.
- Lorsque l'exécution a commencé à partir d'un remplacement, le principal configuré est ajouté à la
  fin afin que la chaîne puisse revenir à la valeur par défaut normale une fois les candidats
  précédents épuisés.

### Quelles erreurs avancent le repli

Le repli de model continue sur :

- échecs d'authentification
- limites de taux et épuisement des temps d'attente
- erreurs de surcharge/fournisseur occupé
- erreurs de repli de type délai d'expiration
- désactivations de facturation
- `LiveSessionModelSwitchError`, qui est normalisé dans un chemin de basculement (failover) afin qu'un modèle persistant obsolète ne crée pas une boucle de réessai externe
- d'autres erreurs non reconnues lorsqu'il reste encore des candidats

Le basculement du modèle (model fallback) ne se poursuit pas en cas de :

- avorts explicites qui ne sont pas de forme timeout/failover
- erreurs de dépassement de contexte qui doivent rester à l'intérieur de la logique de compactage/réessai
  (par exemple `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `The input is too long for the model`, or `ollama error: context
length exceeded`)
- une erreur finale inconnue lorsqu'il ne reste plus de candidats

### Comportement de l'ignorance du refroidissement (cooldown skip) versus sonde (probe)

Lorsque chaque profil d'authentification pour un fournisseur est déjà en refroidissement, OpenClaw ne
saute pas automatiquement ce fournisseur pour toujours. Il prend une décision par candidat :

- Les échecs d'authentification persistants sautent immédiatement l'ensemble du fournisseur.
- Les désactivations de facturation (Billing disables) sautent généralement, mais le candidat principal peut toujours être sondé
  lors d'une limitation (throttle) afin que la récupération soit possible sans redémarrage.
- Le candidat principal peut être sondé près de l'expiration du refroidissement, avec une limitation par fournisseur.
- Les alternatifs de basculement (fallback siblings) du même fournisseur peuvent être tentés malgré le refroidissement lorsque
  l'échec semble transitoire (`rate_limit`, `overloaded`, ou inconnu). Cela est
  particulièrement pertinent lorsqu'une limitation de débit est scoped au modèle et qu'un modèle alternatif peut
  toujours récupérer immédiatement.
- Les sondes de refroidissement transitoire sont limitées à une par fournisseur par exécution de basculement afin
  qu'un seul fournisseur ne bloque pas le basculement inter-fournisseurs.

## Remplacements de session et changement de modèle en direct

Les changements de modèle de session sont un état partagé. Le runner actif, la commande `/model`,
les mises à jour de compactage/session, et la réconciliation de session en direct lisent ou écrivent
tous des parties de la même entrée de session.

Cela signifie que les tentatives de basculement doivent se coordonner avec le changement de modèle en direct :

- Seuls les changements de modèle explicitement pilotés par l'utilisateur marquent un changement en direct en attente. Cela
  inclut `/model`, `session_status(model=...)`, et `sessions.patch`.
- Les changements de modèle pilotés par le système, tels que la rotation de secours, les substitutions de battement de cœur ou la compactification, ne marquent jamais à eux seuls une bascule en direct en attente.
- Avant qu'une nouvelle tentative de secours ne commence, le gestionnaire de réponses persiste les champs de substitution de secours sélectionnés dans l'entrée de session.
- La réconciliation de session en direct privilégie les substitutions de session persistantes par rapport aux champs de modèle d'exécution obsolètes.
- Si la tentative de secours échoue, le gestionnaire annule uniquement les champs de substitution qu'il a écrits, et uniquement s'ils correspondent toujours à ce candidat échoué.

Cela empêche la condition de course classique :

1. Le principal échoue.
2. Le candidat de secours est choisi en mémoire.
3. Le magasin de sessions indique toujours l'ancien principal.
4. La réconciliation de session en direct lit l'état de session obsolète.
5. La nouvelle tentative est ramenée à l'ancien modèle avant le début de la tentative de secours.

La substitution de secours persistante ferme cette fenêtre, et l'annulation ciblée maintient intacts les changements de session manuels ou d'exécution plus récents.

## Observabilité et résumés des échecs

`runWithModelFallback(...)` enregistre les détails de chaque tentative qui alimentent les journaux et les messages de refroidissement destinés à l'utilisateur :

- provider/model tenté
- raison (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found`, et
  raisons de basculement similaires)
- statut/code optionnel
- résumé de l'erreur lisible par l'homme

Lorsque tous les candidats échouent, OpenClaw lance `FallbackSummaryError`. Le gestionnaire de réponses externe peut l'utiliser pour construire un message plus spécifique tel que "tous les modèles sont temporairement limités par le taux" et inclure l'expiration de refroidissement la plus proche lorsqu'elle est connue.

Ce résumé de refroidissement est conscient du modèle :

- les limites de taux indépendantes de la portée du modèle sont ignorées pour la chaîne provider/model tentée
- si le blocage restant est une limite de taux correspondant à la portée du modèle, OpenClaw
  signale la dernière expiration correspondante qui bloque toujours ce modèle

## Configuration associée

Voir [configuration Gateway](/fr/gateway/configuration) pour :

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` routage

Voir [Modèles](/fr/concepts/models) pour la vue d'ensemble de la sélection et du basculement des modèles.
