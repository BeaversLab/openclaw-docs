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
- La configuration `auth.profiles` / `auth.order` est **uniquement des métadonnées + routage** (pas de secrets).
- Fichier OAuth ancien, importation uniquement : `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` à la première utilisation).

Plus de détails : [/concepts/oauth](/en/concepts/oauth)

Types d'informations d'identification :

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` pour certains providers)

## ID de profil

Les connexions OAuth créent des profils distincts afin que plusieurs comptes puissent coexister.

- Par défaut : `provider:default` lorsqu'aucun e-mail n'est disponible.
- OAuth avec e-mail : `provider:<email>` (par exemple `google-antigravity:user@gmail.com`).

Les profils résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` sous `profiles`.

## Ordre de rotation

Lorsqu'un provider possède plusieurs profils, OpenClaw choisit un ordre comme suit :

1. **Configuration explicite** : `auth.order[provider]` (si défini).
2. **Profils configurés** : `auth.profiles` filtrés par provider.
3. **Profils stockés** : entrées dans `auth-profiles.json` pour le provider.

Si aucun ordre explicite n'est configuré, OpenClaw utilise un ordre round‑robin :

- **Clé primaire** : type de profil (\*\*OAuth avant les clés API).
- **Clé secondaire** : `usageStats.lastUsed` (plus ancien en premier, au sein de chaque type).
- Les **profils en période de refroidissement/désactivés** sont déplacés à la fin, triés par expiration la plus proche.

### Persistance de session (cache-friendly)

OpenClaw **épinglera le profil d'authentification choisi par session** pour garder les caches des providers chauds.
Il n'effectue **pas** une rotation à chaque requête. Le profil épinglé est réutilisé jusqu'à ce que :

- la session soit réinitialisée (`/new` / `/reset`)
- une compaction soit terminée (le compteur de compaction s'incrémente)
- le profil soit en période de refroidissement/désactivé

Une sélection manuelle via `/model …@<profileId>` définit une **redéfinition utilisateur** pour cette session
et n'est pas automatiquement tournée tant qu'une nouvelle session n'a pas commencé.

Les profils épinglés automatiquement (sélectionnés par le routeur de session) sont traités comme une **préférence** :
Ils sont essayés en premier, mais OpenClaw peut passer à un autre profil en cas de limites de taux/délais d'expiration.
Les profils épinglés par l'utilisateur restent verrouillés sur ce profil ; en cas d'échec et si des replis de modèle
sont configurés, OpenClaw passe au modèle suivant au lieu de changer de profil.

### Pourquoi OAuth peut sembler "perdu"

Si vous avez à la fois un profil OAuth et un profil de clé API pour le même provider, le round‑robin peut basculer entre eux d'un message à l'autre s'ils ne sont pas épinglés. Pour forcer un profil unique :

- Épinglez avec `auth.order[provider] = ["provider:profileId"]`, ou
- Utilisez une substitution par session via `/model …` avec une substitution de profil (lorsque cela est pris en charge par votre interface de chat).

## Périodes de refroidissement

Lorsqu'un profil échoue en raison d'erreurs d'authentification/de limitation de débit (ou d'un délai d'attente ressemblant à une limitation de débit), OpenClaw le marque en période de refroidissement et passe au profil suivant. Ce compartiment de limitation de débit est plus large qu'un simple `429` : il inclut également les messages du fournisseur tels que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted`, et les limites périodiques de fenêtre d'utilisation telles que `weekly/monthly limit reached`. Les erreurs de format/requête invalide (par exemple, les échecs de validation de l'ID d'appel d'outil Cloud Code Assist) sont traitées comme justifiant un basculement et utilisent les mêmes périodes de refroidissement. Les erreurs de raison d'arrêt compatibles avec OpenAI telles que `Unhandled stop reason: error`, `stop reason: error` et `reason: error` sont classées comme des signaux de délai d'attente/basculement. Le texte générique du serveur délimité au fournisseur peut également atterrir dans ce compartiment de délai d'attente lorsque la source correspond à un modèle transitoire connu. Par exemple, Anthropic nu `An unknown error occurred` et les payloads JSON `api_error` avec du texte de serveur transitoire tel que `internal server error`, `unknown error, 520`, `upstream error` ou `backend error` sont traités comme des délais d'attente justifiant un basculement. Le texte générique en amont spécifique à OpenRouter tel que le `Provider returned error` nu est également traité comme un délai d'attente uniquement lorsque le contexte du fournisseur est OpenRouter. Le texte de repli interne générique tel que `LLM request failed with an unknown error.` reste conservateur et ne déclenche pas de basculement par lui-même.

Les périodes de refroidissement pour limitation de débit peuvent également être délimitées au modèle :

- OpenClaw enregistre `cooldownModel` pour les échecs de limitation de débit lorsque l'identifiant du modèle défaillant est connu.
- Un modèle frère sur le même fournisseur peut toujours être essayé lorsque la période de refroidissement est délimitée à un modèle différent.
- Les fenêtres de facturation/désactivation bloquent toujours l'ensemble du profil pour tous les modèles.

Les périodes de refroidissement utilisent une temporisation exponentielle :

- 1 minute
- 5 minutes
- 25 minutes
- 1 heure (limite)

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

Les échecs de facturation/crédit (par exemple « crédits insuffisants » / « solde de crédit trop faible ») sont considérés comme justifiant un basculement, mais ils ne sont généralement pas transitoires. Au lieu d'un court temps de recharge, OpenClaw marque le profil comme **désactivé** (avec un temps d'attente plus long) et passe au profil/fournisseur suivant.

Toutes les responses de type facturation ne sont pas `402`, et chaque code HTTP `402` n'atterrit
pas ici. OpenClaw conserve le texte de facturation explicite dans la voie de facturation même lorsqu'un
fournisseur renvoie `401` ou `403` à la place, mais les correspondants spécifiques au fournisseur restent
limités au fournisseur qui les possède (par exemple OpenRouter `403 Key limit
exceeded`). Meanwhile temporary `402` usage-window et
les erreurs de limite de dépense d'organisation/espace de travail sont classées comme `rate_limit` lorsque
le message semble réessayable (par exemple `weekly usage limit exhausted`, `daily
limit reached, resets tomorrow`, or `organization spending limit exceeded`).
Celles-ci restent sur le chemin de temps de recharge court/basculement au lieu du chemin de désactivation de facturation long.

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

- Le temps d'attente de facturation commence à **5 heures**, double à chaque échec de facturation et plafonne à **24 heures**.
- Les compteurs de temps d'attente sont réinitialisés si le profil n'a pas échoué pendant **24 heures** (configurable).
- Les tentatives de réessai en cas de surcharge permettent **1 rotation de profil du même fournisseur** avant le basculement de modèle.
- Les tentatives de réessai en cas de surcharge utilisent un temps d'attente de **0 ms** par défaut.

## Basculement de modèle

Si tous les profils d'un fournisseur échouent, OpenClaw passe au modèle suivant dans
`agents.defaults.model.fallbacks`. Cela s'applique aux échecs d'authentification, aux limites de débit et
aux délais d'attente qui ont épuisé la rotation des profils (d'autres erreurs n'avancent pas le basculement).

Les erreurs de surcharge et de limitation de débit sont gérées plus agressivement que les temps de recharge de facturation. Par défaut, OpenClaw permet une nouvelle tentative de profil d'authentification du même fournisseur, puis passe au modèle de repli configuré suivant sans attendre. Les signaux de fournisseur occupé tels que `ModelNotReadyException` atterrissent dans ce compartiment de surcharge. Ajustez ceci avec `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` et `auth.cooldowns.rateLimitedProfileRotations`.

Lorsqu'une exécution commence avec une priorité de modèle (hooks ou CLI), les replis se terminent tout de même à `agents.defaults.model.primary` après avoir tenté tous les replis configurés.

### Règles de la chaîne de candidats

OpenClaw construit la liste des candidats à partir du `provider/model` actuellement demandé plus les replis configurés.

Règles :

- Le modèle demandé est toujours le premier.
- Les replis configurés explicitement sont dédupliqués mais non filtrés par la liste d'autorisation des modèles. Ils sont traités comme une intention explicite de l'opérateur.
- Si l'exécution actuelle utilise déjà un repli configuré dans la même famille de fournisseurs, OpenClaw continue d'utiliser la chaîne configurée complète.
- Si l'exécution actuelle est sur un fournisseur différent de la configuration et que ce modèle actuel ne fait pas déjà partie de la chaîne de repli configurée, OpenClaw n'ajoute pas les replis configurés non liés d'un autre fournisseur.
- Lorsque l'exécution a commencé par une priorité, le principal configuré est ajouté à la fin afin que la chaîne puisse revenir à la valeur par défaut normale une fois les candidats précédents épuisés.

### Quelles erreurs font avancer le repli

Le repli de modèle continue en cas de :

- échecs d'authentification
- limites de débit et épuisement des temps de recharge
- erreurs de surcharge/fournisseur occupé
- erreurs de repli de type timeout
- désactivations de facturation
- `LiveSessionModelSwitchError`, qui est normalisé dans un chemin de repli afin qu'un modèle persistant obsolète ne crée pas une boucle de nouvelle tentative externe
- autres erreurs non reconnues lorsqu'il reste encore des candidats

Le repli de modèle ne continue pas en cas de :

- abandons explicites qui ne sont pas de type timeout/repli
- erreurs de dépassement de contexte qui doivent rester dans la logique de compactage/réessai
  (par exemple `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `The input is too long for the model`, or `ollama error: context
length exceeded`)
- une erreur inconnue finale lorsqu'il ne reste plus de candidats

### Contournement du refroidissement vs comportement de sonde

Lorsque chaque profil d'authentification pour un fournisseur est déjà en refroidissement, OpenClaw ne
saute pas automatiquement ce fournisseur pour toujours. Il prend une décision par candidat :

- Les échecs d'authentification persistants sautent immédiatement l'ensemble du fournisseur.
- Les désactivations de facturation sautent généralement, mais le candidat principal peut toujours être sondé
  lors d'une limitation afin que la récupération soit possible sans redémarrage.
- Le candidat principal peut être sondé près de l'expiration du refroidissement, avec une limitation
  par fournisseur.
- Les frères et sœurs de repli du même fournisseur peuvent être tentés malgré le refroidissement lorsque
  l'échec semble transitoire (`rate_limit`, `overloaded`, ou inconnu). Ceci est
  particulièrement pertinent lorsqu'une limite de taux est délimitée au niveau du modèle et qu'un modèle frère peut
  toujours récupérer immédiatement.
- Les sondes de refroidissement transitoires sont limitées à une par fournisseur par exécution de repli afin qu'un
  seul fournisseur ne bloque pas le repli entre fournisseurs.

## Remplacements de session et changement de modèle en direct

Les changements de modèle de session sont un état partagé. Le runner actif, la commande `/model`,
les mises à jour de compactage/session et la réconciliation de session en direct lisent ou écrivent
tous des parties de la même entrée de session.

Cela signifie que les tentatives de repli doivent se coordonner avec le changement de modèle en direct :

- Seuls les changements de modèle explicitement pilotés par l'utilisateur marquent un changement en direct en attente. Cela
  inclut `/model`, `session_status(model=...)` et `sessions.patch`.
- Les changements de modèle pilotés par le système tels que la rotation de repli, les remplacements de heartbeat,
  ou le compactage ne marquent jamais seuls un changement en direct en attente.
- Avant qu'une tentative de repli ne commence, le runner de réponse persiste les champs
  de remplacement de repli sélectionnés dans l'entrée de session.
- La réconciliation de session en direct préfère les remplacements de session persistés aux champs de modèle
  d'exécution obsolètes.
- Si la tentative de repli échoue, le runner annule uniquement les champs de substitution qu'il a écrits, et uniquement s'ils correspondent toujours à ce candidat ayant échoué.

Cela empêche la situation de course classique :

1. Le primaire échoue.
2. Le candidat de repli est choisi en mémoire.
3. Le magasin de session indique toujours l'ancien primaire.
4. La réconciliation de session en direct lit l'état de session obsolète.
5. La nouvelle tentative est ramenée à l'ancien modèle avant le début de la tentative de repli.

La substitution de repli persistante ferme cette fenêtre, et l'annulation ciblée conserve les modifications manuelles ou d'exécution de session plus récentes intactes.

## Observabilité et résumés d'échec

`runWithModelFallback(...)` enregistre les détails de chaque tentative qui alimentent les journaux et les messages de refroidissement visibles par l'utilisateur :

- fournisseur/modèle tenté
- raison (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found`, et
  raisons de repli similaires)
- statut/code facultatif
- résumé d'erreur lisible par l'homme

Lorsque tous les candidats échouent, OpenClaw lance `FallbackSummaryError`. Le runner de réponse externe peut l'utiliser pour construire un message plus spécifique tel que "tous les modèles sont temporairement limités par le taux" et inclure la prochaine expiration du refroidissement lorsqu'une est connue.

Ce résumé de refroidissement est conscient du modèle :

- les limites de taux sans rapport et limitées au modèle sont ignorées pour la chaîne fournisseur/modèle tentée
- si le bloc restant est une limite de taux correspondante et limitée au modèle, OpenClaw signale la dernière expiration correspondante qui bloque encore ce modèle

## Configuration connexe

Voir la [configuration Gateway](/en/gateway/configuration) pour :

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- routage `agents.defaults.imageModel`

Voir [Modèles](/en/concepts/models) pour l'aperçu plus large de la sélection et du repli de modèles.
