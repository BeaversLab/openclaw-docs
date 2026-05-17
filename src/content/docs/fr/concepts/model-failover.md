---
summary: "OpenClawComment OpenClaw fait la rotation des profils d'authentification et revient sur différents modèles"
read_when:
  - Diagnosing auth profile rotation, cooldowns, or model fallback behavior
  - Updating failover rules for auth profiles or models
  - Understanding how session model overrides interact with fallback retries
title: "Basculement de modèle"
sidebarTitle: "Basculement de modèle"
---

OpenClaw gère les échecs en deux étapes :

1. **Rotation des profils d'authentification** au sein du fournisseur actuel.
2. **Basculement de modèle** vers le modèle suivant dans `agents.defaults.model.fallbacks`.

Ce document explique les règles d'exécution et les données qui les prennent en charge.

## Flux d'exécution

Pour une exécution de texte normale, OpenClaw évalue les candidats dans cet ordre :

<Steps>
  <Step title="Résoudre l'état de la session">Résoudre le modèle de session actif et la préférence de profil d'authentification.</Step>
  <Step title="Construire la chaîne de candidats">
    Construire la chaîne de candidats de modèles à partir de la sélection de modèle actuelle et de la politique de basculement pour cette source de sélection. Les valeurs par défaut configurées, les tâches cron principales et les modèles de secours sélectionnés automatiquement peuvent utiliser les basculements configurés ; les sélections explicites de session utilisateur sont strictes.
  </Step>
  <Step title="Essayer le fournisseur actuel">Essayer le fournisseur actuel avec les règles de rotation/refroidissement des profils d'authentification.</Step>
  <Step title="Avancer en cas d'erreurs justifiant un basculement">Si ce fournisseur est épuisé avec une erreur justifiant un basculement, passer au candidat de modèle suivant.</Step>
  <Step title="Conserver la priorité de basculement">Conserver la priorité de basculement sélectionnée avant le début de la nouvelle tentative afin que les autres lecteurs de session voient le même fournisseur/modèle que le moteur va utiliser. La priorité de modèle conservée est marquée `modelOverrideSource: "auto"`.</Step>
  <Step title="Annuler étroitement en cas d'échec">Si le candidat de basculement échoue, annuler uniquement les champs de priorité de session détenus par le basculement lorsqu'ils correspondent toujours à ce candidat échoué.</Step>
  <Step title="Lever FallbackSummaryError si épuisé">Si tous les candidats échouent, lever une `FallbackSummaryError` avec des détails par tentative et l'expiration du refroidissement la plus proche lorsqu'elle est connue.</Step>
</Steps>

Ceci est volontairement plus restrictif que « sauvegarder et restaurer toute la session ». Le coureur de réponse ne persiste que les champs de sélection de modèle qu'il possède pour la bascule :

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Cela empêche une nouvelle tentative de secours échouée d'écraser des mutations de session plus récentes et non liées, telles que les modifications manuelles de `/model` ou les mises à jour de rotation de session qui se sont produites pendant que la tentative était en cours.

## Stratégie de source de sélection

OpenClaw sépare le fournisseur/modèle sélectionné de la raison de sa sélection. Cette source contrôle si la chaîne de basculement est autorisée :

- **Par défaut configuré** : `agents.defaults.model.primary` utilise `agents.defaults.model.fallbacks`.
- **Agent primary** : `agents.list[].model` est strict, sauf si cet objet model d'agent inclut son propre `fallbacks`. Utilisez `fallbacks: []` pour rendre le comportement strict explicite, ou fournissez une liste non vide pour permettre à cet agent d'utiliser le secours de model.
- **Auto fallback override** : un secours (fallback) à l'exécution écrit `providerOverride`, `modelOverride`, `modelOverrideSource: "auto"` et le model d'origine sélectionné avant de réessayer. Ce remplacement automatique peut continuer à parcourir la chaîne de secours configurée et est effacé par `/new`, `/reset` et `sessions.reset`. Les exécutions du heartbeat sans `heartbeat.model` explicite effacent également un remplacement automatique direct lorsque son origine ne correspond plus à la valeur par défaut configurée actuelle.
- **User session override** : `/model`, le sélecteur de model, `session_status(model=...)` et `sessions.patch` écrivent `modelOverrideSource: "user"`. Il s'agit d'une sélection exacte de session. Si le provider/model sélectionné échoue avant de produire une réponse, OpenClaw signale l'échec au lieu de répondre via un secours configuré sans rapport.
- **Legacy session override** : les entrées de session plus anciennes peuvent avoir `modelOverride` sans `modelOverrideSource`. OpenClaw les traite comme des remplacements d'utilisateur, afin qu'une ancienne sélection explicite ne soit pas silencieusement convertie en comportement de secours.
- **Cron payload model** : une tâche cron `payload.model` / `--model` est une tâche principale (job primary), et non un remplacement de session utilisateur. Elle utilise les secours configurés, sauf si la tâche fournit `payload.fallbacks` ; `payload.fallbacks: []` rend l'exécution de la cron stricte.

## Auth storage (keys + OAuth)

OpenClaw utilise des **profils d'auth** pour les clés API et les jetons OAuth.

- Les secrets résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (legacy : `~/.openclaw/agent/auth-profiles.json`).
- L'état d'auth-routing à l'exécution réside dans `~/.openclaw/agents/<agentId>/agent/auth-state.json`.
- La configuration `auth.profiles` / `auth.order` est **uniquement des métadonnées + du routage** (pas de secrets).
- Fichier d'importation exclusif (legacy) OAuth : `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` lors de la première utilisation).

Plus de détails : [OAuth](OAuth/en/concepts/oauth)

Types d'identifiants :

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` pour certains providers)

## ID de profil

Les connexions OAuth créent des profils distincts afin que plusieurs comptes puissent coexister.

- Par défaut : `provider:default` lorsqu'aucun e-mail n'est disponible.
- OAuth avec e-mail : OAuth`provider:<email>` (par exemple `google-antigravity:user@gmail.com`).

Les profils résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` sous `profiles`.

## Ordre de rotation

Lorsqu'un fournisseur possède plusieurs profils, OpenClaw choisit un ordre comme suit :

<Steps>
  <Step title="Configuration explicite">`auth.order[provider]` (si défini).</Step>
  <Step title="Profils configurés">`auth.profiles` filtrés par provider.</Step>
  <Step title="Profils stockés">Entrées dans `auth-profiles.json` pour le provider.</Step>
</Steps>

Si aucun ordre explicite n'est configuré, OpenClaw utilise un ordre tournant (round-robin) :

- **Clé primaire :** type de profil (\*\*OAuth avant les clés API).
- **Clé secondaire :** `usageStats.lastUsed` (le plus ancien en premier, dans chaque type).
- Les **profils en refroidissement/désactivés** sont déplacés à la fin, classés par expiration la plus proche.

### Persistance de session (respect du cache)

OpenClaw **fige le profil d'authentification choisi par session** pour maintenir les caches des fournisseurs à chaud. Il effectue **pas** de rotation à chaque requête. Le profil figé est réutilisé jusqu'à ce que :

- la session est réinitialisée (`/new` / `/reset`)
- un compactage soit terminé (incrémentation du compteur de compactage)
- le profil soit en refroidissement/désactivé

La sélection manuelle via `/model …@<profileId>` définit une **substitution utilisateur** pour cette session et n'est pas automatiquement pivotée jusqu'à ce qu'une nouvelle session commence.

<Note>
  Les profils épinglés automatiquement (sélectionnés par le routeur de session) sont traités comme une **préférence** : ils sont essayés en premier, mais OpenClaw peut pivoter vers un autre profil en cas de limites de délai/d'attente. Lorsque le profil original redevient disponible, les nouvelles exécutions peuvent le préférer à nouveau sans changer le modèle sélectionné ou le runtime. Les profils
  épinglés par l'utilisateur restent verrouillés sur ce profil ; s'il échoue et que les basculements de modèle sont configurés, OpenClaw passe au modèle suivant au lieu de changer de profil.
</Note>

### Abonnement OpenAI Codex plus sauvegarde par clé API

Pour les modèles d'agent OpenAI, l'authentification et l'exécution sont distinctes. `openai/gpt-*` reste sur
le harnais Codex tandis que l'authentification peut faire une rotation entre un profil d'abonnement Codex et
une sauvegarde de clé OpenAI API.

Utilisez `auth.order.openai` pour l'ordre orienté utilisateur :

```json5
{
  auth: {
    order: {
      openai: ["openai-codex:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

Les profils d'abonnement Codex existants peuvent toujours utiliser l'identifiant
`openai-codex:*` de profil hérité. La sauvegarde ordonnée de clé API peut être un profil
`openai:*` de clé API standard. Lorsque l'abonnement atteint une limite d'utilisation Codex,
OpenClaw enregistre l'heure exacte de réinitialisation lorsque Codex en fournit une, essaie le
profil d'authentification ordonné suivant, et maintient l'exécution dans le harnais Codex. Une fois l'heure de
réinitialisation passée, le profil d'abonnement est à nouveau éligible et la prochaine sélection automatique
peut y revenir.

Utilisez un profil épinglé par l'utilisateur uniquement lorsque vous souhaitez forcer un compte/clé pour cette
session. Les profils épinglés par l'utilisateur sont intentionnellement stricts et ne passent pas silencieusement
à un autre profil.

## Refroidissements

Lorsqu'un profil échoue en raison d'erreurs d'authentification/de limitation de débit (ou d'un délai d'attente ressemblant à une limitation de débit), OpenClaw le marque en refroidissement et passe au profil suivant.

<AccordionGroup>
  <Accordion title="Ce qui atterrit dans le compartiment de limite de taux / d'expiration du délai">
    Ce compartiment de limite de taux est plus large qu'un simple `429` : il inclut également les messages du fournisseur tels que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted`, et les limites périodiques de fenêtre d'utilisation telles que `weekly/monthly limit reached`.

    Les erreurs de format/requête invalide sont généralement terminales, car la réessai avec la même charge échouerait de la même manière, donc OpenClaw les affiche au lieu de faire pivoter les profils d'authentification. Les chemins de réparation par réessai connus peuvent opter explicitement : par exemple, les échecs de validation de l'ID d'appel d'outil de Cloud Code Assist sont nettoyés et réessayés une fois via la stratégie `allowFormatRetry`. Les erreurs de raison d'arrêt compatibles avec OpenAI telles que `Unhandled stop reason: error`, `stop reason: error` et `reason: error` sont classées comme signaux d'expiration/basculement.

    Le texte générique du serveur peut également atterrir dans ce compartiment d'expiration lorsque la source correspond à un modèle transitoire connu. Par exemple, le message nu de l'enveloppe de flux pi-ai `An unknown error occurred` est traité comme digne d'un basculement pour chaque fournisseur, car pi-ai l'émet lorsque les flux du fournisseur se terminent par `stopReason: "aborted"` ou `stopReason: "error"` sans détails spécifiques. Les charges utiles JSON `api_error` avec du texte serveur transitoire tel que `internal server error`, `unknown error, 520`, `upstream error` ou `backend error` sont également traitées comme des expirations dignes d'un basculement.

    Le texte générique en amont spécifique à OpenRouter, tel que le nu `Provider returned error`, est traité comme une expiration uniquement lorsque le contexte du fournisseur est réellement OpenRouter. Le texte générique interne de secours tel que `LLM request failed with an unknown error.` reste conservateur et ne déclenche pas de basculement par lui-même.

  </Accordion>
  <Accordion title="SDK retry-after caps">
    Certains SDK de fournisseur peuvent otherwise sleep pendant une longue `Retry-After`OpenClawAnthropicOpenAIOpenClaw fenêtre avant de retourner le contrôle à OpenClaw. Pour les SDK basés sur Stainless tels qu'Anthropic et OpenAI, OpenClaw limite les attentes `retry-after-ms` / `retry-after` internes du SDK à 60 secondes par défaut et expose immédiatement les réponses réessayables plus longues afin que ce chemin de basculement puisse s'exécuter. Ajustez ou désactivez la limite avec `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` ; voir [Comportement de nouvelle tentative](/fr/concepts/retry).
  </Accordion>
  <Accordion title="Model-scoped cooldowns"OpenClaw>
    Les temps de recharge de limite de débit peuvent également être limités au modèle :

    - OpenClaw enregistre `cooldownModel` pour les échecs de limite de débit lorsque l'ID du modèle défaillant est connu.
    - Un modèle frère sur le même fournisseur peut toujours être essayé lorsque la recharge est limitée à un modèle différent.
    - Les fenêtres de facturation/désactivation bloquent toujours tout le profil entre les modèles.

  </Accordion>
</AccordionGroup>

Les recharges utilisent un délai exponentiel :

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

Les échecs de facturation/crédit (par exemple « crédits insuffisants » / « solde de crédit trop faible ») sont traités comme éligibles au basculement, mais ils ne sont généralement pas transitoires. Au lieu d'une courte recharge, OpenClaw marque le profil comme **désactivé** (avec un délai plus long) et passe au profil/fournisseur suivant.

<Note>
Toutes les réponses de type facturation ne sont pas `402`, et chaque erreur HTTP `402`OpenClaw n'atterrit pas ici. OpenClaw conserve les textes de facturation explicites dans la voie de facturation même lorsqu'un fournisseur renvoie `401` ou `403`OpenRouter à la place, mais les correspondants spécifiques au fournisseur restent limités au fournisseur qui les possède (par exemple OpenRouter `403 Key limit exceeded`).

Pendant ce temps, les erreurs temporaires de fenêtre d'utilisation `402` et de limite de dépense de l'organisation/espace de travail sont classées comme `rate_limit` lorsque le message semble réessayable (par exemple `weekly usage limit exhausted`, `daily limit reached, resets tomorrow`, ou `organization spending limit exceeded`). Celles-ci restent sur le chemin de court refroidissement/basculement au lieu du chemin long de désactivation de facturation.

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

- L'attente de facturation commence à **5 heures**, double à chaque échec de facturation et est plafonnée à **24 heures**.
- Les compteurs d'attente sont réinitialisés si le profil n'a pas échoué pendant **24 heures** (configurable).
- Les nouvelles tentatives de surcharge permettent **1 rotation de profil du même fournisseur** avant le basculement de modèle.
- Les nouvelles tentatives de surcharge utilisent **0 ms d'attente** par défaut.

## Basculement de modèle

Si tous les profils d'un fournisseur échouent, OpenClaw passe au modèle suivant dans OpenClaw`agents.defaults.model.fallbacks`. Cela s'applique aux échecs d'authentification, aux limites de débit et aux délais d'expiration qui ont épuisé la rotation des profils (d'autres erreurs n'avancent pas le basculement). Les erreurs de fournisseur qui n'exposent pas assez de détails sont toujours étiquetées avec précision dans l'état de basculement : `empty_response` signifie que le fournisseur n'a renvoyé aucun message ou état utilisable, `no_error_details` signifie que le fournisseur a explicitement renvoyé `Unknown error (no error details in response)`, et `unclassified`OpenClaw signifie qu'OpenClaw a préservé l'aperçu brut mais qu'aucun classificateur ne l'a encore correspondu.

Les erreurs de surcharge et de limite de taux sont gérées plus agressivement que les temps d'attente de facturation. Par défaut, OpenClaw autorise une nouvelle tentative de profil d'authentification au sein du même fournisseur, puis passe au modèle de secours configuré suivant sans attendre. Les signaux d'occupation du fournisseur tels que OpenClaw`ModelNotReadyException` atterrissent dans ce compartiment de surcharge. Ajustez cela avec `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` et `auth.cooldowns.rateLimitedProfileRotations`.

Lorsqu'une exécution démarre à partir du principal par défaut configuré, d'une tâche cron principale, d'un agent principal avec des secours explicites, ou d'un remplacement de secours sélectionné automatiquement, OpenClaw peut parcourir la chaîne de secours configurée correspondante. Les agents principaux sans secours explicites et les sélections explicites de l'utilisateur (par exemple OpenClaw`/model ollama/qwen3.5:27b`, le sélecteur de modèle, `sessions.patch`CLIOpenClaw, ou des remplacements ponctuels de fournisseur/modèle via la CLI) sont stricts : si ce fournisseur/modèle est inaccessible ou échoue avant de produire une réponse, OpenClaw signale l'échec au lieu de répondre à l'aide d'un secours non lié.

### Règles de la chaîne de candidats

OpenClaw construit la liste des candidats à partir du OpenClaw`provider/model` actuellement demandé plus les secours configurés.

<AccordionGroup>
  <Accordion title="Règles"OpenClaw>
    - Le model demandé est toujours le premier.
    - Les solutions de repli (fallbacks) configurées explicitement sont dédupliquées mais non filtrées par la liste d'autorisation des models. Elles sont considérées comme une intention explicite de l'opérateur.
    - Si l'exécution actuelle utilise déjà une solution de repli configurée dans la même famille de provider, OpenClaw continue d'utiliser la chaîne configurée complète.
    - Lorsqu'aucune substitution de solution de repli explicite n'est fournie, les solutions de repli configurées sont tentées avant le model principal configuré, même si le model demandé utilise un provider différent.
    - Lorsqu'aucune substitution de solution de repli explicite n'est fournie au lanceur de solution de repli, le model principal configuré est ajouté à la fin afin que la chaîne puisse revenir à la valeur par défaut normale une fois les candidats précédents épuisés.
    - Lorsqu'un appelant fournit `fallbacksOverride`, le lanceur utilise exactement le model demandé plus cette liste de substitution. Une liste vide désactive la solution de repli du model et empêche le model principal configuré d'être ajouté comme cible de nouvelle tentative masquée.

  </Accordion>
</AccordionGroup>

### Quelles erreurs font avancer le repli

<Tabs>
  <Tab title="Continue sur">
    - échecs d'authentification
    - limites de taux et épuisement des temps de recharge (cooldowns)
    - erreurs de surcharge/provider occupé
    - erreurs de basculement de forme timeout
    - désactivations de facturation
    - `LiveSessionModelSwitchError`, qui est normalisé dans un chemin de basculement afin qu'un model persistant obsolète ne crée pas une boucle de nouvelle tentative externe
    - autres erreurs non reconnues lorsqu'il reste encore des candidats

  </Tab>
  <Tab title="Ne continue pas sur">
    - abandons explicites qui ne sont pas de forme timeout/basculement
    - erreurs de dépassement de contexte qui doivent rester à l'intérieur de la logique de compactage/nouvelle tentative (par exemple `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `The input is too long for the model`, ou `ollama error: context length exceeded`)
    - une erreur finale inconnue lorsqu'il ne reste plus de candidats

  </Tab>
</Tabs>

### Comportement d'ignorance de recharge vs sonde

Lorsque chaque profil d'authentification pour un provider est déjà en recharge, OpenClaw n'ignore pas automatiquement ce provider pour toujours. Il prend une décision par candidat :

<AccordionGroup>
  <Accordion title="Décisions par candidat">
    - Les échecs d'authentification persistants sautent immédiatement tout le fournisseur.
    - Les désactivations de facturation sautent généralement, mais le candidat principal peut toujours être sondé avec une limitation afin qu'une récupération soit possible sans redémarrage.
    - Le candidat principal peut être sondé près de l'expiration du délai de refroidissement, avec une limitation par fournisseur.
    - Les frères et sœurs de basculement du même fournisseur peuvent être tentés malgré le délai de refroidissement lorsque l'échec semble transitoire (`rate_limit`, `overloaded`, ou inconnu). C'est particulièrement pertinent lorsqu'une limitation de débit est limitée au model et qu'un model frère peut encore récupérer immédiatement.
    - Les sondes de délai de refroidissement transitoires sont limitées à une par fournisseur par exécution de basculement afin qu'un seul fournisseur ne bloque pas le basculement entre fournisseurs.

  </Accordion>
</AccordionGroup>

## Remplacements de session et changement de model en direct

Les changements de model de session sont un état partagé. Le runner actif, la commande `/model`, les mises à jour de compactage/session, et la réconciliation de session en direct lisent ou écrivent tous des parties de la même entrée de session.

Cela signifie que les tentatives de basculement doivent se coordonner avec le changement de model en direct :

- Seuls les changements de model explicites pilotés par l'utilisateur marquent un changement en direct en attente. Cela inclut `/model`, `session_status(model=...)`, et `sessions.patch`.
- Les changements de model pilotés par le système tels que la rotation de basculement, les remplacements de rythme cardiaque, ou le compactage ne marquent jamais un changement en direct en attente par eux-mêmes.
- Les remplacements de model pilotés par l'utilisateur sont traités comme des sélections exactes pour la politique de basculement, donc un fournisseur sélectionné inaccessible apparaît comme un échec au lieu d'être masqué par `agents.defaults.model.fallbacks`.
- Avant qu'une tentative de basculement ne commence, le runner de réponse persiste les champs de remplacement de basculement sélectionnés dans l'entrée de session.
- Les remplacements de basculement automatique restent sélectionnés lors des tours suivants afin qu'OpenClaw ne sonde pas un primaire connu comme défectueux à chaque message. `/new`, `/reset`, et `sessions.reset` effacent les remplacements d'origine automatique et ramènent la session à la valeur par défaut configurée.
- `/status` affiche le model sélectionné et, lorsque l'état de basculement diffère, le model de basculement actif et la raison.
- La réconciliation de session en direct privilégie les substitutions de session persistantes par rapport aux champs de model d'exécution obsolètes.
- Si une erreur de commutation en direct pointe vers un candidat ultérieur dans la chaîne de secours active, OpenClaw saute directement vers ce model sélectionné au lieu de parcourir d'abord les candidats non liés.
- Si la tentative de secours échoue, le moteur d'exécution annule uniquement les champs de substitution qu'il a écrits, et uniquement s'ils correspondent toujours à ce candidat ayant échoué.

Cela empêche la course classique :

<Steps>
  <Step title="Échec du primaire">Le model primaire sélectionné échoue.</Step>
  <Step title="Secours choisi en mémoire">Le candidat de secours est choisi en mémoire.</Step>
  <Step title="Le store de session indique toujours l'ancien primaire">Le store de session reflète toujours l'ancien primaire.</Step>
  <Step title="La réconciliation en direct lit un état obsolète">La réconciliation de session en direct lit l'état de session obsolète.</Step>
  <Step title="La nouvelle tentative est rétablie">La nouvelle tentative est ramenée à l'ancien model avant le début de la tentative de secours.</Step>
</Steps>

La substitution de secours persistante ferme cette fenêtre, et l'annulation ciblée maintient intactes les modifications de session manuelles ou d'exécution plus récentes.

## Observabilité et résumés des échecs

`runWithModelFallback(...)` enregistre les détails de chaque tentative qui alimentent les journaux et les messages de refroidissement orientés utilisateur :

- provider/model tenté
- raison (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found`, et raisons de basculement similaires)
- statut/code facultatif
- résumé de l'erreur lisible par l'homme

Les journaux structurés `model_fallback_decision` incluent également des champs plats `fallbackStep*` lorsqu'un candidat échoue, est ignoré ou qu'une nouvelle tentative de repli réussit. Ces champs rendent la transition tentée explicite (`fallbackStepFromModel`, `fallbackStepToModel`, `fallbackStepFromFailureReason`, `fallbackStepFromFailureDetail`, `fallbackStepFinalOutcome`) afin que les exportateurs de journaux et de diagnostics puissent reconstituer la défaillance principale même lorsque le repli final échoue également.

Lorsque tous les candidats échouent, OpenClaw lève `FallbackSummaryError`. Le gestionnaire de réponses externe peut l'utiliser pour construire un message plus spécifique, tel que "tous les modèles sont temporairement limités par le taux", et inclure l'expiration de refroidissement la plus proche lorsqu'elle est connue.

Ce résumé de refroidissement est conscient du modèle :

- les limites de taux indépendantes de la portée du modèle sont ignorées pour la chaîne fournisseur/modèle tentée
- si le blocage restant est une limite de taux correspondant à la portée du modèle, OpenClaw signale la dernière expiration correspondante qui bloque encore ce modèle

## Configuration associée

Voir [configuration Gateway](/fr/gateway/configuration) pour :

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- routage `agents.defaults.imageModel`

Voir [Modèles](/fr/concepts/models) pour un aperçu plus large de la sélection et du repli de modèles.
