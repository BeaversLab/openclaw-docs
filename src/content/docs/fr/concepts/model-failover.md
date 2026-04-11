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

Plus de détails : [/concepts/oauth](/en/concepts/oauth)

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

Les temps de refroidissement pour limites de taux peuvent également être limités au modèle :

- OpenClaw enregistre `cooldownModel` pour les échecs de limite de taux lorsque l'identifiant du modèle défaillant est connu.
- Un modèle frère sur le même fournisseur peut toujours être essayé lorsque le refroidissement est limité à un modèle différent.
- Les fenêtres de facturation/désactivation bloquent toujours l'ensemble du profil pour tous les modèles.

Les temps de refroidissement utilisent un backoff exponentiel :

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

Les échecs de facturation/crédit (par exemple « crédits insuffisants » / « solde de crédit trop faible ») sont considérés comme justifiant un basculement (failover), mais ils ne sont généralement pas transitoires. Au lieu d'un court refroidissement (cooldown), OpenClaw marque le profil comme **désactivé** (avec un délai d'attente plus long) et passe au profil/fournisseur suivant.

Toutes les responses de type facturation ne sont pas `402`, et chaque code HTTP `402` n'atterrit
pas ici. OpenClaw conserve les textes de facturation explicites dans la voie de facturation même lorsqu'un
fournisseur renvoie `401` ou `403` à la place, mais les correspondants (matchers) spécifiques au fournisseur restent
limités au fournisseur qui les possède (par exemple OpenRouter `403 Key limit
exceeded`). Meanwhile temporary `402` usage-window et
les erreurs de limite de dépense d'organisation/espace de travail sont classées comme `rate_limit` lorsque
le message semble réessayer (par exemple `weekly usage limit exhausted`, `daily
limit reached, resets tomorrow`, or `organization spending limit exceeded`).
Ceux-ci restent sur le chemin de basculement à court refroidissement au lieu du chemin de désactivation de facturation à long terme.

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

- L'attente de facturation commence à **5 heures**, double à chaque échec de facturation et plafonne à **24 heures**.
- Les compteurs d'attente sont réinitialisés si le profil n'a pas échoué pendant **24 heures** (configurable).
- Les tentatives de réessai en cas de surcharge permettent **1 rotation de profil du même fournisseur** avant le repli de modèle.
- Les tentatives de réessai en cas de surcharge utilisent **0 ms d'attente** par défaut.

## Repli de modèle

Si tous les profils d'un fournisseur échouent, OpenClaw passe au modèle suivant dans
`agents.defaults.model.fallbacks`. Cela s'applique aux échecs d'authentification, aux limites de taux et
aux délais d'attente qui ont épuisé la rotation des profils (d'autres erreurs n'avancent pas le repli).

Les erreurs de surcharge et de limite de taux sont gérées plus agressivement que les
refroidissements de facturation. Par défaut, OpenClaw permet une nouvelle tentative de profil d'authentification du même fournisseur,
puis passe au repli de modèle configuré suivant sans attendre.
Les signaux de fournisseur occupé tels que `ModelNotReadyException` atterrissent dans ce seau
de surcharge. Ajustez cela avec `auth.cooldowns.overloadedProfileRotations`,
`auth.cooldowns.overloadedBackoffMs` et
`auth.cooldowns.rateLimitedProfileRotations`.

Lorsqu'une exécution commence avec une substitution de modèle (hooks ou CLI), les replis aboutissent toujours à `agents.defaults.model.primary` après avoir essayé les replis configurés.

### Règles de la chaîne de candidats

OpenClaw construit la liste des candidats à partir du `provider/model` actuellement demandé ainsi que des replis configurés.

Règles :

- Le modèle demandé est toujours le premier.
- Les replis configurés explicitement sont dédupliqués mais non filtrés par la liste d'autorisation de modèles. Ils sont considérés comme une intention explicite de l'opérateur.
- Si l'exécution actuelle est déjà sur un repli configuré dans la même famille de fournisseurs, OpenClaw continue d'utiliser la chaîne configurée complète.
- Si l'exécution actuelle est sur un fournisseur différent de celui de la configuration et que ce modèle actuel ne fait pas déjà partie de la chaîne de repli configurée, OpenClaw n'ajoute pas de replis configurés non liés provenant d'un autre fournisseur.
- Lorsque l'exécution a commencé à partir d'une substitution, le principal configuré est ajouté à la fin afin que la chaîne puisse revenir à la valeur par défaut normale une fois les candidats précédents épuisés.

### Quelles erreurs font avancer le repli

Le repli de modèle continue en cas de :

- échecs d'authentification
- limites de débit et épuisement des temps de recharge
- erreurs de surcharge/fournisseur occupé
- erreurs de repli de type timeout
- désactivations de facturation
- `LiveSessionModelSwitchError`, qui est normalisé dans un chemin de repli pour qu'un modèle persistant obsolète ne crée pas une boucle de réessai externe
- autres erreurs non reconnues lorsqu'il reste des candidats

Le repli de modèle ne continue pas en cas de :

- abords explicites qui ne sont pas de type timeout/repli
- erreurs de dépassement de contexte qui doivent rester dans la logique de compactage/réessai (par exemple `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `The input is too long for the model`, or `ollama error: context
length exceeded`)
- une erreur inconnue finale lorsqu'il n'y a plus de candidats

### Comportement d'ignorance vs sonde de temps de recharge

Lorsque chaque profil d'authentification pour un fournisseur est déjà en temps de recharge, OpenClaw ne ignore pas automatiquement ce fournisseur pour toujours. Il prend une décision par candidat :

- Les échecs d'authentification persistants ignorent immédiatement l'ensemble du fournisseur.
- Les désactivations de facturation sont généralement ignorées, mais le candidat principal peut toujours être testé lors d'une limitation de débit, ce qui permet une récupération sans redémarrage.
- Le candidat principal peut être testé près de l'expiration du délai de récupération, avec une limitation de débit par fournisseur.
- Les alternatives de secours du même fournisseur peuvent être tentées malgré le délai de récupération lorsque la défaillance semble transitoire (`rate_limit`, `overloaded`, ou inconnue). C'est particulièrement pertinent lorsqu'une limite de débit est spécifique au modèle et qu'un modèle alternatif peut toujours récupérer immédiatement.
- Les tests de délai de récupération transitoires sont limités à un par fournisseur par exécution de secours, afin qu'un seul fournisseur ne bloque pas le secours inter-fournisseurs.

## Remplacements de session et changement de modèle en direct

Les modifications de modèle de session sont un état partagé. Le runner actif, la commande `/model`, les mises à jour de compactage/session et la réconciliation de session en direct lisent ou écrivent tous des parties de la même entrée de session.

Cela signifie que les tentatives de secours doivent être coordonnées avec le changement de modèle en direct :

- Seuls les changements de modèle explicitement initiés par l'utilisateur marquent un basculement en direct en attente. Cela inclut `/model`, `session_status(model=...)` et `sessions.patch`.
- Les changements de modèle pilotés par le système, tels que la rotation de secours, les remplacements de heartbeat ou le compactage, ne marquent jamais à eux seuls un basculement en direct en attente.
- Avant qu'une tentative de secours ne commence, le runner de réponse persiste les champs de remplacement de secours sélectionnés dans l'entrée de session.
- La réconciliation de session en direct privilégie les remplacements de session persistants par rapport aux champs de modèle d'exécution obsolètes.
- Si la tentative de secours échoue, le runner annule uniquement les champs de remplacement qu'il a écrits, et seulement s'ils correspondent toujours à ce candidat échoué.

Cela empêche la situation de classique de compétition :

1. Échec du principal.
2. Le candidat de secours est choisi en mémoire.
3. Le magasin de session indique toujours l'ancien principal.
4. La réconciliation de session en direct lit l'état de session obsolète.
5. La nouvelle tentative est ramenée à l'ancien modèle avant le début de la tentative de secours.

Le remplacement de secours persistant ferme cette fenêtre, et l'annulation ciblée garde intactes les modifications manuelles ou d'exécution de session plus récentes.

## Observabilité et résumés des échecs

`runWithModelFallback(...)` enregistre les détails de chaque tentative qui alimentent les journaux et les messages de délai de récupération destinés à l'utilisateur :

- fournisseur/modèle tenté
- raison (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found`, et
  motifs de basculement similaires)
- statut/code facultatif
- résumé de l'erreur lisible par l'homme

Lorsque chaque candidat échoue, OpenClaw lance `FallbackSummaryError`. Le lanceur de réponse externe peut l'utiliser pour construire un message plus spécifique tel que "tous les modèles
sont temporairement limités par le taux" et inclure l'expiration du refroidissement la plus proche lorsqu'une
est connue.

Ce résumé de refroidissement est conscient du modèle :

- les limites de taux sans rapport avec la portée du modèle sont ignorées pour la chaîne
  provider/model tentée
- si le bloc restant est une limite de taux correspondant à la portée du modèle, OpenClaw
  signale la dernière expiration correspondante qui bloque encore ce modèle

## Config associée

Voir [Configuration du Gateway](/en/gateway/configuration) pour :

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- routage `agents.defaults.imageModel`

Voir [Models](/en/concepts/models) pour la vue d'ensemble de la sélection et du basculement des modèles.
