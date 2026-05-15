---
summary: "Comment OpenClaw fait une rotation des profils d'authentification et revient sur différents modèles"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "Bascule de modèle"
sidebarTitle: "Bascule de modèle"
---

OpenClaw gère les échecs en deux étapes :

1. **Rotation des profils d'authentification** au sein du fournisseur actuel.
2. **Bascule de modèle** vers le modèle suivant dans `agents.defaults.model.fallbacks`.

Ce document explique les règles d'exécution et les données qui les prennent en charge.

## Flux d'exécution

Pour une exécution de texte normale, OpenClaw évalue les candidats dans cet ordre :

<Steps>
  <Step title="Résoudre l'état de la session">Résoudre le modèle de session actif et la préférence de profil d'authentification.</Step>
  <Step title="Construire la chaîne de candidats">
    Construire la chaîne de candidats de modèles à partir de la sélection de modèle actuelle et de la stratégie de basculement pour cette source de sélection. Les valeurs par défaut configurées, les principaux des tâches cron et les modèles de secourage automatiquement sélectionnés peuvent utiliser des basculements configurés ; les sélections explicites de session utilisateur sont strictes.
  </Step>
  <Step title="Essayer le fournisseur actuel">Essayer le fournisseur actuel avec les règles de rotation/délai de repos (cooldown) des profils d'authentification.</Step>
  <Step title="Avancer en cas d'erreurs justifiant une bascule">Si ce fournisseur est épuisé avec une erreur justifiant une bascule, passer au candidat de modèle suivant.</Step>
  <Step title="Persister la substitution de basculement">Persister la substitution de basculement sélectionnée avant le début de la nouvelle tentative afin que les autres lecteurs de la session voient le même fournisseur/modèle que le processeur s'apprête à utiliser. La substitution de modèle persistante est marquée `modelOverrideSource: "auto"`.</Step>
  <Step title="Rétablir étroitement en cas d'échec">Si le candidat de bascule échoue, rétablir uniquement les champs de substitution de session possédés par la bascule lorsqu'ils correspondent toujours à ce candidat ayant échoué.</Step>
  <Step title="Lever FallbackSummaryError si épuisé">Si chaque candidat échoue, lever un `FallbackSummaryError` avec des détails par tentative et l'expiration de refroidissement la plus proche lorsqu'elle est connue.</Step>
</Steps>

Ceci est volontairement plus restrictif que « sauvegarder et restaurer toute la session ». Le coureur de réponse ne persiste que les champs de sélection de modèle qu'il possède pour la bascule :

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Cela empêche une nouvelle tentative de basculement échouée d'écraser des mutations de session plus récentes et non liées, telles que les modifications manuelles de `/model` ou les mises à jour de rotation de session qui se sont produites pendant que la tentative était en cours d'exécution.

## Stratégie de source de sélection

OpenClaw sépare le fournisseur/modèle sélectionné de la raison de sa sélection. Cette source contrôle si la chaîne de basculement est autorisée :

- **Par défaut configuré** : `agents.defaults.model.primary` utilise `agents.defaults.model.fallbacks`.
- **Principal de l'agent** : `agents.list[].model` est strict, sauf si cet objet de modèle d'agent inclut son propre `fallbacks`. Utilisez `fallbacks: []` pour rendre le comportement strict explicite, ou fournissez une liste non vide pour opter cet agent pour le basculement de modèle.
- **Auto fallback override** : une substitution de basculement automatique écrit `providerOverride`, `modelOverride` et `modelOverrideSource: "auto"` avant de réessayer. Cette substitution automatique peut continuer à parcourir la chaîne de basculement configurée et est effacée par `/new`, `/reset` et `sessions.reset`.
- **User session override** : `/model`, le sélecteur de modèle, `session_status(model=...)` et `sessions.patch` écrivent `modelOverrideSource: "user"`. Il s'agit d'une sélection exacte de session. Si le provider/modèle sélectionné échoue avant de produire une réponse, OpenClaw signale l'échec au lieu de répondre via un basculement configuré sans rapport.
- **Legacy session override** : les anciennes entrées de session peuvent avoir `modelOverride` sans `modelOverrideSource`. OpenClaw les traite comme des substitutions utilisateur afin qu'une ancienne sélection explicite ne soit pas silencieusement convertie en comportement de basculement.
- **Cron payload model** : une tâche cron `payload.model` / `--model` est une tâche principale, pas une substitution de session utilisateur. Elle utilise les basculements configurés à moins que la tâche ne fournisse `payload.fallbacks` ; `payload.fallbacks: []` rend l'exécution cron stricte.

## Auth storage (keys + OAuth)

OpenClaw utilise des **profils d'auth** pour les clés API et les jetons OAuth.

- Les secrets résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (ancien : `~/.openclaw/agent/auth-profiles.json`).
- L'état d'exécution du routage d'auth réside dans `~/.openclaw/agents/<agentId>/agent/auth-state.json`.
- La configuration `auth.profiles` / `auth.order` est **métadonnées + routage uniquement** (pas de secrets).
- Fichier d'importation uniquement OAuth hérité : `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` lors de la première utilisation).

Plus de détails : [OAuth](/fr/concepts/oauth)

Types d'identifiants :

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` pour certains fournisseurs)

## ID de profil

Les connexions OAuth créent des profils distincts afin que plusieurs comptes puissent coexister.

- Par défaut : `provider:default` lorsqu'aucun e-mail n'est disponible.
- OAuth avec e-mail : `provider:<email>` (par exemple `google-antigravity:user@gmail.com`).

Les profils résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` sous `profiles`.

## Ordre de rotation

Lorsqu'un fournisseur possède plusieurs profils, OpenClaw choisit un ordre comme suit :

<Steps>
  <Step title="Configuration explicite">`auth.order[provider]` (si défini).</Step>
  <Step title="Profils configurés">`auth.profiles` filtrés par fournisseur.</Step>
  <Step title="Profils stockés">Entrées dans `auth-profiles.json` pour le fournisseur.</Step>
</Steps>

Si aucun ordre explicite n'est configuré, OpenClaw utilise un ordre tournant (round-robin) :

- **Clé primaire :** type de profil (\*\*OAuth avant les clés API).
- **Clé secondaire :** `usageStats.lastUsed` (le plus ancien en premier, dans chaque type).
- Les **profils en refroidissement/désactivés** sont déplacés à la fin, classés par expiration la plus proche.

### Persistance de session (respect du cache)

OpenClaw **fige le profil d'authentification choisi par session** pour maintenir les caches des fournisseurs à chaud. Il effectue **pas** de rotation à chaque requête. Le profil figé est réutilisé jusqu'à ce que :

- la session soit réinitialisée (`/new` / `/reset`)
- un compactage soit terminé (incrémentation du compteur de compactage)
- le profil soit en refroidissement/désactivé

Une sélection manuelle via `/model …@<profileId>` définit une **substitution utilisateur** pour cette session et n'est pas soumise à la rotation automatique jusqu'à ce qu'une nouvelle session commence.

<Note>
  Les profils épinglés automatiquement (sélectionnés par le routeur de session) sont traités comme une **préférence** : ils sont essayés en premier, mais OpenClaw peut passer à un autre profil en cas de limites de délai/d'attentes. Les profils épinglés par l'utilisateur restent verrouillés sur ce profil ; s'il échoue et que les basculements de modèle sont configurés, OpenClaw passe au modèle
  suivant au lieu de changer de profil.
</Note>

### Pourquoi OAuth peut sembler "perdu"

Si vous disposez à la fois d'un profil OAuth et d'un profil de clé API pour le même fournisseur, le round-robin peut basculer entre eux d'un message à l'autre, sauf s'ils sont épinglés. Pour forcer l'utilisation d'un seul profil :

- Épinglez avec `auth.order[provider] = ["provider:profileId"]`, ou
- Utilisez une substitution par session via `/model …` avec une substitution de profil (lorsque votre interface utilisateur/interface de chat le prend en charge).

## Périodes de refroidissement

Lorsqu'un profil échoue en raison d'erreurs d'authentification/limitation de débit (ou d'un délai d'attente ressemblant à une limitation), OpenClaw le marque en période de refroidissement et passe au profil suivant.

<AccordionGroup>
  <Accordion title="Ce qui atterrit dans le bucket de limite de débit / délai d'attente">
    Ce bucket de limite de débit est plus large qu'un simple `429` : il inclut également les messages du provider tels que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted`, et les limites périodiques de fenêtre d'utilisation telles que `weekly/monthly limit reached`.

    Les erreurs de format ou de requête invalide sont généralement terminales car la réessai avec la même charge échouerait de la même manière, donc OpenClaw les affiche au lieu de faire une rotation des profils d'authentification. Les chemins de réparation par réessai connus peuvent opter explicitement : par exemple, les échecs de validation de l'ID d'appel d'outil de Cloud Code Assist sont nettoyés et réessayés une fois via la stratégie `allowFormatRetry`. Les erreurs de raison d'arrêt compatibles avec OpenAI telles que `Unhandled stop reason: error`, `stop reason: error` et `reason: error` sont classées comme des signaux de délai d'attente/basculement.

    Le texte générique du serveur peut également atterrir dans ce bucket de délai d'attente lorsque la source correspond à un modèle transitoire connu. Par exemple, le message nu du wrapper de flux pi-ai `An unknown error occurred` est traité comme digne d'un basculement pour chaque provider car pi-ai l'émet lorsque les flux du provider se terminent par `stopReason: "aborted"` ou `stopReason: "error"` sans détails spécifiques. Les charges utiles JSON `api_error` avec du texte serveur transitoire tel que `internal server error`, `unknown error, 520`, `upstream error` ou `backend error` sont également traitées comme des délais d'attente dignes d'un basculement.

    Le texte générique en amont spécifique à OpenRouter tel que le nu `Provider returned error` est traité comme un délai d'attente uniquement lorsque le contexte du provider est réellement OpenRouter. Le texte de repli interne générique tel que `LLM request failed with an unknown error.` reste conservateur et ne déclenche pas de basculement par lui-même.

  </Accordion>
  <Accordion title="SDK retry-after caps">
    Certains SDK de fournisseur peuvent otherwise dormir pendant une longue fenêtre `Retry-After` avant de retourner le contrôle à OpenClaw. Pour les SDK basés sur Stainless tels que Anthropic et OpenAI, OpenClaw limite par défaut à 60 secondes les attentes `retry-after-ms` / `retry-after` internes au SDK et expose immédiatement les réponses réessayables plus longues afin que ce chemin de basculement puisse s'exécuter. Ajustez ou désactivez la limite avec `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` ; voir [Retry behavior](/fr/concepts/retry).
  </Accordion>
  <Accordion title="Model-scoped cooldowns">
    Les temps de recharge de limite de débit peuvent également être limités au modèle :

    - OpenClaw enregistre `cooldownModel` pour les échecs de limite de débit lorsque l'id du modèle en échec est connu.
    - Un modèle frère sur le même fournisseur peut toujours être essayé lorsque la recharge est limitée à un modèle différent.
    - Les fenêtres de facturation/désactivation bloquent toujours tout le profil entre les modèles.

  </Accordion>
</AccordionGroup>

Les temps de recharge utilisent un backoff exponentiel :

- 1 minute
- 5 minutes
- 25 minutes
- 1 heure (limite)

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

Les échecs de facturation/crédit (par exemple "insufficient credits" / "credit balance too low") sont considérés comme éligibles au basculement, mais ils ne sont généralement pas transitoires. Au lieu d'une courte recharge, OpenClaw marque le profil comme **désactivé** (avec un backoff plus long) et passe au profil/fournisseur suivant.

<Note>
Toutes les réponses liées à la facturation ne sont pas `402`, et tous les codes HTTP `402`OpenClaw n'aboutissent pas ici. OpenClaw conserve le texte de facturation explicite dans la voie de facturation même lorsqu'un provider renvoie `401` ou `403`OpenRouter à la place, mais les moteurs de correspondance spécifiques au provider restent limités au provider qui les possède (par exemple OpenRouter `403 Key limit exceeded`).

Pendant ce temps, les erreurs temporaires `402` de fenêtre d'utilisation et de limite de dépense de l'organisation/espace de travail sont classées comme `rate_limit` lorsque le message semble réessayable (par exemple `weekly usage limit exhausted`, `daily limit reached, resets tomorrow` ou `organization spending limit exceeded`). Celles-ci restent sur le chemin de court délai de recharge/basculement au lieu du chemin long de désactivation de facturation.

</Note>

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
- Les tentatives de réessai en cas de surcharge autorisent **1 rotation de profil du même provider** avant le basculement de modèle.
- Les tentatives de réessai en cas de surcharge utilisent **0 ms d'attente** par défaut.

## Basculement de modèle

Si tous les profils d'un provider échouent, OpenClaw passe au modèle suivant dans OpenClaw`agents.defaults.model.fallbacks`. Cela s'applique aux échecs d'authentification, aux limites de débit et aux délais d'attente qui ont épuisé la rotation des profils (d'autres erreurs ne font pas avancer le basculement). Les erreurs de provider qui n'exposent pas suffisamment de détails sont toujours étiquetées précisément dans l'état de basculement : `empty_response` signifie que le provider n'a renvoyé aucun message ou statut utilisable, `no_error_details` signifie que le provider a explicitement renvoyé `Unknown error (no error details in response)`, et `unclassified`OpenClaw signifie qu'OpenClaw a préservé l'aperçu brut mais qu'aucun classificateur ne l'a encore reconnu.

Les erreurs de surcharge et de limitation de débit sont gérées plus agressivement que les temps de refroidissement de facturation. Par défaut, OpenClaw autorise une nouvelle tentative de profil d'authentification du même fournisseur, puis passe au modèle de secours configuré suivant sans attendre. Les signaux de fournisseur occupé tels que OpenClaw`ModelNotReadyException` atterrissent dans ce compartiment de surcharge. Ajustez ceci avec `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` et `auth.cooldowns.rateLimitedProfileRotations`.

Lorsqu'une exécution démarre à partir du principal par défaut configuré, d'un principal de tâche cron, d'un principal d'agent avec des secours explicites ou d'une substitution de secours sélectionnée automatiquement, OpenClaw peut parcourir la chaîne de secours configurée correspondante. Les principaux d'agent sans secours explicites et les sélections explicites de l'utilisateur (par exemple OpenClaw`/model ollama/qwen3.5:27b`, le sélecteur de modèle, `sessions.patch`CLIOpenClaw, ou des substitutions ponctuelles de fournisseur/modèle CLI) sont stricts : si ce fournisseur/modèle est inaccessible ou échoue avant de produire une réponse, OpenClaw signale l'échec au lieu de répondre à partir d'un secours non lié.

### Règles de la chaîne de candidats

OpenClaw construit la liste des candidats à partir de la OpenClaw`provider/model` actuellement demandée plus les secours configurés.

<AccordionGroup>
  <Accordion title="Règles">
    - Le modèle demandé est toujours le premier.
    - Les bascules (fallbacks) configurées explicitement sont dédupliquées mais non filtrées par la liste d'autorisation des modèles. Elles sont traitées comme une intention explicite de l'opérateur.
    - Si l'exécution actuelle est déjà sur une bascule configurée dans la même famille de fournisseurs, OpenClaw continue d'utiliser la chaîne configurée complète.
    - Si l'exécution actuelle est sur un fournisseur différent de la configuration et que ce modèle actuel ne fait pas déjà partie de la chaîne de bascule configurée, OpenClaw n'ajoute pas de bascules configurées non apparentées provenant d'un autre fournisseur.
    - Lorsqu'aucune substitution de bascule explicite n'est fournie au moteur de bascule, le principal configuré est ajouté à la fin afin que la chaîne puisse revenir à la valeur par défaut normale une fois les candidats précédents épuisés.
    - Lorsqu'un appelant fournit `fallbacksOverride`, le moteur utilise exactement le modèle demandé plus cette liste de substitution. Une liste vide désactive la bascule de modèle et empêche le principal configuré d'être ajouté comme cible de réessai cachée.

  </Accordion>
</AccordionGroup>

### Quelles erreurs déclenchent la bascule

<Tabs>
  <Tab title="Continue sur">
    - échecs d'authentification
    - limites de taux et épuisement des temps de recharge (cooldowns)
    - erreurs de surcharge/fournisseur occupé
    - erreurs de bascule de type délai d'attente
    - désactivations de facturation
    - `LiveSessionModelSwitchError`, qui est normalisé dans un chemin de bascule pour qu'un modèle persistant périmé ne crée pas une boucle de réessai externe
    - autres erreurs non reconnues lorsqu'il reste des candidats

  </Tab>
  <Tab title="Ne continue pas sur">
    - abandons explicites qui ne sont pas de type délai d'attente/bascule
    - erreurs de dépassement de contexte qui doivent rester dans la logique de compactage/réessai (par exemple `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `The input is too long for the model`, ou `ollama error: context length exceeded`)
    - une erreur inconnue finale lorsqu'il n'y a plus de candidats

  </Tab>
</Tabs>

### Comportement d'ignorance du temps de recharge vs sonde

Lorsque chaque profil d'authentification d'un fournisseur est déjà en temps de recharge (cooldown), OpenClaw ne saute pas automatiquement ce fournisseur pour toujours. Il prend une décision par candidat :

<AccordionGroup>
  <Accordion title="Décisions par candidat">
    - Les échecs d'authentification persistants ignorent immédiatement l'ensemble du provider.
    - Les désactivations de facturation sont généralement ignorées, mais le candidat principal peut toujours être sondé sur une base limitée (throttle) afin qu'une récupération soit possible sans redémarrage.
    - Le candidat principal peut être sondé près de l'expiration du délai de recharge (cooldown), avec une limitation par provider.
    - Les solutions de repli (fallback) au sein du même provider peuvent être tentées malgré le délai de recharge lorsque l'échec semble transitoire (`rate_limit`, `overloaded`, ou inconnu). C'est particulièrement pertinent lorsqu'une limite de taux est liée au modèle et qu'un modèle adjacent peut toujours récupérer immédiatement.
    - Les sondages transitoires du délai de recharge sont limités à un par provider par exécution de repli afin qu'un seul provider ne bloque pas le repli entre providers.

  </Accordion>
</AccordionGroup>

## Remplacements de session et changement dynamique de modèle

Les changements de modèle de session sont un état partagé. Le runner actif, la commande `/model`, les mises à jour de compactage/session et la réconciliation de session en direct lisent ou écrivent tous des parties de la même entrée de session.

Cela signifie que les tentatives de repli (fallback retries) doivent être coordonnées avec le changement dynamique de modèle :

- Seuls les changements de modèle explicitement pilotés par l'utilisateur marquent un changement dynamique en attente. Cela inclut `/model`, `session_status(model=...)` et `sessions.patch`.
- Les changements de modèle pilotés par le système, tels que la rotation de repli, les priorités de battement de cœur (heartbeat overrides) ou le compactage, ne marquent jamais à eux seuls un changement dynamique en attente.
- Les priorités de modèle pilotées par l'utilisateur sont traitées comme des sélections exactes pour la politique de repli, de sorte qu'un provider sélectionné injoignable apparaît comme un échec au lieu d'être masqué par `agents.defaults.model.fallbacks`.
- Avant qu'une tentative de repli ne commence, le runner de réponse persiste les champs de priorité de repli sélectionnés dans l'entrée de session.
- Les priorités de repli automatiques restent sélectionnées lors des tours suivants pour qu'OpenClaw ne sonde pas un principal défaillant connu à chaque message. `/new`, `/reset` et `sessions.reset` effacent les priorités d'origine automatique et ramènent la session à la valeur par défaut configurée.
- `/status` affiche le modèle sélectionné et, lorsque l'état de repli diffère, le modèle de repli actif et la raison.
- La réconciliation de session en direct privilégie les remplacements de session persistants par rapport aux champs de modèle d'exécution obsolètes.
- Si une erreur de commutation en direct pointe vers un candidat ultérieur dans la chaîne de basculement active, OpenClaw passe directement à ce modèle sélectionné au lieu de parcourir d'abord des candidats non liés.
- Si la tentative de basculement échoue, le moteur annule uniquement les champs de remplacement qu'il a écrits, et uniquement s'ils correspondent toujours à ce candidat ayant échoué.

Cela empêche la course classique :

<Steps>
  <Step title="Échec du primaire">Le modèle principal sélectionné échoue.</Step>
  <Step title="Basculement choisi en mémoire">Le candidat de basculement est choisi en mémoire.</Step>
  <Step title="Le magasin de session indique toujours l'ancien primaire">Le magasin de session reflète toujours l'ancien primaire.</Step>
  <Step title="La réconciliation en direct lit l'état obsolète">La réconciliation de session en direct lit l'état de session obsolète.</Step>
  <Step title="Nouvelle tentative réinitialisée">La nouvelle tentative est ramenée à l'ancien modèle avant le début de la tentative de basculement.</Step>
</Steps>

Le remplacement de basculement persistant ferme cette fenêtre, et l'annulation étroite préserve les modifications de session manuelles ou d'exécution plus récentes.

## Observabilité et résumés des échecs

`runWithModelFallback(...)` enregistre les détails de chaque tentative qui alimentent les journaux et les messages de refroidissement destinés à l'utilisateur :

- provider/model tenté
- raison (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found`, et raisons de basculement similaires)
- statut/code facultatif
- résumé d'erreur lisible par l'humain

Les journaux structurés `model_fallback_decision` incluent également des champs plats `fallbackStep*` lorsqu'un candidat échoue, est ignoré ou qu'un repli ultérieur réussit. Ces champs rendent la transition tentée explicite (`fallbackStepFromModel`, `fallbackStepToModel`, `fallbackStepFromFailureReason`, `fallbackStepFromFailureDetail`, `fallbackStepFinalOutcome`) afin que les exportateurs de journaux et de diagnostics puissent reconstituer la défaillance principale même lorsque le repli terminal échoue également.

Lorsque tous les candidats échouent, OpenClaw lance `FallbackSummaryError`. Le lanceur de réponse externe peut l'utiliser pour construire un message plus spécifique tel que "tous les modèles sont temporairement limités par le taux" et inclure l'expiration du refroidissement la plus proche lorsqu'elle est connue.

Ce résumé de refroidissement est conscient du modèle :

- les limites de taux non liées et limitées au modèle sont ignorées pour la chaîne provider/model tentée
- si le blocage restant est une limite de taux correspondante et limitée au modèle, OpenClaw signale la dernière expiration correspondante qui bloque encore ce modèle

## Configuration associée

Voir la [configuration de Gateway](/fr/gateway/configuration) pour :

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- Routage `agents.defaults.imageModel`

Voir [Modèles](/fr/concepts/models) pour l'aperçu général de la sélection et du repli de modèles.
