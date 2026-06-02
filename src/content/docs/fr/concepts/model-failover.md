---
summary: "Comment OpenClaw fait pivoter les profils d'authentification et bascule entre les modèles"
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
    Construire la chaîne de candidats de modèles à partir de la sélection de modèle actuelle et de la politique de basculement pour cette source de sélection. Les valeurs par défaut configurées, les principaux des tâches cron et les modèles de secourse sélectionnés automatiquement peuvent utiliser les basculements configurés ; les sélections explicites de session utilisateur sont strictes.
  </Step>
  <Step title="Essayer le fournisseur actuel">Essayer le fournisseur actuel avec les règles de rotation/refroidissement des profils d'authentification.</Step>
  <Step title="Avancer sur les erreurs de basculement">Si ce fournisseur est épuisé avec une erreur justifiant un basculement, passer au candidat de modèle suivant.</Step>
  <Step title="Persister la priorité de basculement">Persister la priorité de basculement sélectionnée avant le début de la nouvelle tentative afin que les autres lecteurs de session voient le même fournisseur/modèle que le processeur va utiliser. La priorité de modèle persistante est marquée `modelOverrideSource: "auto"`.</Step>
  <Step title="Annuler précisément en cas d'échec">Si le candidat de basculement échoue, annuler uniquement les champs de priorité de session détenus par le basculement lorsqu'ils correspondent toujours à ce candidat échoué.</Step>
  <Step title="Lever FallbackSummaryError si épuisé">Si tous les candidats échouent, lever un `FallbackSummaryError` avec des détails par tentative et l'expiration du refroidissement la plus proche lorsqu'elle est connue.</Step>
</Steps>

Ceci est volontairement plus restrictif que « sauvegarder et restaurer toute la session ». Le coureur de réponse ne persiste que les champs de sélection de modèle qu'il possède pour la bascule :

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Cela empêche une nouvelle tentative de repli échouée d'écraser des mutations de session plus récentes et non liées, telles que les modifications manuelles de `/model` ou les mises à jour de la rotation de session qui se sont produites pendant que la tentative était en cours.

## Stratégie de source de sélection

OpenClaw sépare le fournisseur/modèle sélectionné de la raison de sa sélection. Cette source contrôle si la chaîne de basculement est autorisée :

- **Par défaut configuré** : `agents.defaults.model.primary` utilise `agents.defaults.model.fallbacks`.
- **Primaire de l'agent** : `agents.list[].model` est strict, sauf si cet objet de modèle d'agent inclut son propre `fallbacks`. Utilisez `fallbacks: []` pour rendre le comportement strict explicite, ou fournissez une liste non vide pour permettre à cet agent d'utiliser le repli de modèle.
- **Remplacement automatique par repli** : un repli à l'exécution écrit `providerOverride`, `modelOverride`, `modelOverrideSource: "auto"` et le modèle d'origine sélectionné avant de réessayer. Ce remplacement automatique peut continuer à parcourir la chaîne de repli configurée sans sonder le primaire à chaque message, mais OpenClaw sonde périodiquement à nouveau l'origine configurée et efface le remplacement automatique lors de la récupération. `/new`, `/reset` et `sessions.reset` effacent également les remplacements issus de sources automatiques. Le heartbeat s'exécute sans effacement explicite de `heartbeat.model` et efface les remplacements automatiques directs lorsque leur origine ne correspond plus à la valeur par défaut configurée actuelle.
- **Remplacement de session utilisateur** : `/model`, le sélecteur de modèle, `session_status(model=...)` et `sessions.patch` écrivent `modelOverrideSource: "user"`. Il s'agit d'une sélection exacte de session. Si le fournisseur/modèle sélectionné échoue avant de produire une réponse, OpenClaw signale l'échec au lieu de répondre à partir d'un repli configuré sans rapport.
- **Remplacement de session hérité** : les entrées de session plus anciennes peuvent avoir `modelOverride` sans `modelOverrideSource`. OpenClaw les traite comme des remplacements utilisateur afin qu'une ancienne sélection explicite ne soit pas silencieusement convertie en comportement de repli.
- **Modèle de payload Cron** : une tâche cron `payload.model` / `--model` est une priorité de tâche, et non une substitution de session utilisateur. Elle utilise les basculements configurés, sauf si la tâche fournit `payload.fallbacks` ; `payload.fallbacks: []` rend l'exécution cron stricte.

L'intervalle de sonde automatique de basculement primaire est de cinq minutes et n'est pas configurable. OpenClaw mémorise les sondes récentes par session et par model principal afin qu'un principal défaillant ne soit pas réessayé à chaque tour. OpenClaw envoie un avis visible lorsqu'une session passe sur un basculement et un autre avis lorsqu'elle revient au principal sélectionné ; il ne répète pas l'avis à chaque tour de basculement persistant.

## Avis de basculement visibles par l'utilisateur

Lorsqu'une session passe sur un basculement sélectionné automatiquement, OpenClaw envoie un avis d'état dans la même surface de réponse :

```text
↪️ Model Fallback: <fallback> (selected <primary>; <reason>)
```

Lorsqu'une sonde ultérieure réussit et que la session revient au principal sélectionné, OpenClaw envoie :

```text
↪️ Model Fallback cleared: <primary> (was <fallback>)
```

Ces avis sont des messages opérationnels, et non du contenu d'assistant. Ils sont délivrés une fois par changement d'état, y compris lors des tours à effets secondaires uniquement lorsque cela est possible, mais les tours de basculement persistant ne les répètent pas. La livraison contourne la suppression normale des réponses sources, l'avis ne consomme pas le premier emplacement de réponse de l'assistant pour les cannels filés, et il est exclu de la synthèse vocale et de l'extraction d'engagement.

## Stockage d'auth (clés + OAuth)

OpenClaw utilise des **profils d'auth** à la fois pour les clés API et les jetons OAuth.

- Les secrets résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (obsolète : `~/.openclaw/agent/auth-profiles.json`).
- L'état d'exécution du routage d'auth réside dans `~/.openclaw/agents/<agentId>/agent/auth-state.json`.
- La config `auth.profiles` / `auth.order` est **métadonnées + routage uniquement** (pas de secrets).
- Fichier obsolète d'importation uniquement OAuth : `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` à la première utilisation).

Plus de détails : [OAuth](OAuth/en/concepts/oauth)

Types d'identifiants :

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` pour certains providers)

## ID de profil

Les connexions OAuth créent des profils distincts afin que plusieurs comptes puissent coexister.

- Par défaut : `provider:default` lorsqu'aucun e-mail n'est disponible.
- OAuth avec e-mail : `provider:<email>` (par exemple `google-antigravity:user@gmail.com`).

Les profils résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` sous `profiles`.

## Ordre de rotation

Lorsqu'un provider dispose de plusieurs profils, OpenClaw choisit un ordre comme suit :

<Steps>
  <Step title="Configuration explicite">`auth.order[provider]` (si défini).</Step>
  <Step title="Profils configurés">`auth.profiles` filtrés par provider.</Step>
  <Step title="Profils stockés">Entrées dans `auth-profiles.json` pour le provider.</Step>
</Steps>

Si aucun ordre explicite n'est configuré, OpenClaw utilise un ordre round-robin :

- **Clé primaire :** type de profil (**OAuth avant les clés API**).
- **Clé secondaire :** `usageStats.lastUsed` (le plus ancien en premier, dans chaque type).
- **Profils en refroidissement/désactivés** sont déplacés à la fin, triés par expiration la plus proche.

### Adhérence de session (respect du cache)

OpenClaw **épingle le profil d'authentification choisi par session** pour garder les caches des providers à chaud. Il effectue **pas** de rotation à chaque requête. Le profil épinglé est réutilisé jusqu'à ce que :

- la session soit réinitialisée (`/new` / `/reset`)
- une compaction soit terminée (incrémentation du compteur de compaction)
- le profil est en refroidissement/désactivé

La sélection manuelle via `/model …@<profileId>` définit une **redéfinition utilisateur** pour cette session et n'est pas automatiquement pivotée jusqu'à ce qu'une nouvelle session commence.

<Note>
  Les profils épinglés automatiquement (sélectionnés par le routeur de session) sont traités comme une **préférence** : ils sont essayés en premier, mais OpenClaw peut passer à un autre profil en cas de limites de délai/d'attentes. Lorsque le profil d'origine redevient disponible, les nouvelles exécutions peuvent lui préférer à nouveau sans changer le model sélectionné ou l'exécution. Les profils
  épinglés par l'utilisateur restent verrouillés sur ce profil ; s'il échoue et que les replis de model sont configurés, OpenClaw passe au model suivant au lieu de changer de profil.
</Note>

### Abonnement OpenAI Codex plus sauvegarde de clé API

Pour les models d'agent OpenAI, l'authentification et l'exécution sont séparées. `openai/gpt-*` reste sur
le harnais Codex tandis que l'authentification peut basculer entre un profil d'abonnement Codex et
une sauvegarde de clé OpenAI API.

Utilisez `auth.order.openai` pour l'ordre orienté utilisateur :

```json5
{
  auth: {
    order: {
      openai: ["openai:user@example.com", "openai:api-key-backup"],
    },
  },
}
```

Utilisez `openai:*`OAuthOpenAIAPIOpenClaw pour les profils OAuth ChatGPT/Codex ainsi que pour les profils de clé API OpenAI. Lorsque l'abonnement atteint une limite d'utilisation Codex, OpenClaw enregistre l'heure exacte de réinitialisation si Codex en fournit une, essaie le prochain profil d'authentification ordonné et maintient l'exécution dans le harnais Codex. Une fois l'heure de réinitialisation passée, le profil d'abonnement est à nouveau éligible et la prochaine sélection automatique peut y revenir.

Utilisez un profil épinglé par l'utilisateur uniquement lorsque vous souhaitez forcer un compte/clé pour cette
session. Les profils épinglés par l'utilisateur sont intentionnellement stricts et ne passent pas
silencieusement à un autre profil.

## Délais de récupération (Cooldowns)

Lorsqu'un profil échoue en raison d'erreurs d'authentification/de limite de débit (ou d'un délai d'attente ressemblant à une limitation de débit), OpenClaw le marque en délai de récupération et passe au profil suivant.

<AccordionGroup>
  <Accordion title="What lands in the rate-limit / timeout bucket">
    Ce compartiment de limitation de débit est plus large que simple `429` : il inclut également les messages du fournisseur tels que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted`, et les limites périodiques de fenêtre d'utilisation telles que `weekly/monthly limit reached`.

    Les erreurs de format ou de requête invalide sont généralement terminales, car la réessai avec la même charge échouerait de la même manière. Par conséquent, OpenClaw les affiche au lieu de faire pivoter les profils d'authentification. Les chemins de réparation par réessai connus peuvent explicitement opter pour cela : par exemple, les échecs de validation de l'ID d'appel d'outil de Cloud Code Assist sont nettoyés et réessayés une fois via la stratégie `allowFormatRetry`. Les erreurs de raison d'arrêt compatibles avec OpenAI telles que `Unhandled stop reason: error`, `stop reason: error` et `reason: error` sont classées comme des signaux d'expiration/basculement.

    Le texte générique du serveur peut également atterrir dans ce compartiment d'expiration lorsque la source correspond à un modèle transitoire connu. Par exemple, le message nu du wrapper de flux du runtime du modèle `An unknown error occurred` est traité comme digne d'un basculement pour chaque fournisseur, car le runtime partagé du modèle l'émet lorsque les flux du fournisseur se terminent par `stopReason: "aborted"` ou `stopReason: "error"` sans détails spécifiques. Les charges utiles JSON `api_error` avec du texte serveur transitoire tel que `internal server error`, `unknown error, 520`, `upstream error` ou `backend error` sont également traitées comme des expirations dignes d'un basculement.

    Le texte générique en amont spécifique à OpenRouter tel que `Provider returned error` nu n'est traité comme une expiration que lorsque le contexte du fournisseur est réellement OpenRouter. Le texte générique interne de repli tel que `LLM request failed with an unknown error.` reste conservateur et ne déclenche pas de basculement par lui-même.

  </Accordion>
  <Accordion title="Limites de réessai après délai du SDK">
    Certains SDK de fournisseur peuvent otherwise dormir pendant une longue fenêtre `Retry-After`OpenClawAnthropicOpenAIOpenClaw avant de rendre le contrôle à OpenClaw. Pour les SDK basés sur Stainless tels qu'Anthropic et OpenAI, OpenClaw limite par défaut les attentes `retry-after-ms` / `retry-after` internes du SDK à 60 secondes et expose immédiatement les réponses réessayables plus longues afin que ce chemin de basculement puisse s'exécuter. Ajustez ou désactivez la limite avec `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` ; voir [Comportement de nouvelle tentative](/fr/concepts/retry).
  </Accordion>
  <Accordion title="Périodes de refroidissement limitées au modèle"OpenClaw>
    Les périodes de refroidissement pour limites de débit peuvent également être limitées au modèle :

    - OpenClaw enregistre `cooldownModel` pour les échecs de limite de débit lorsque l'identifiant du modèle en échec est connu.
    - Un modèle frère sur le même fournisseur peut toujours être essayé lorsque la période de refroidissement est limitée à un modèle différent.
    - Les fenêtres de facturation/désactivation bloquent toujours l'ensemble du profil entre les modèles.

  </Accordion>
</AccordionGroup>

Les périodes de refroidissement utilisent un backoff exponentiel :

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

Les échecs de facturation/crédit (par exemple "crédits insuffisants" / "solde de crédit trop faible") sont considérés comme éligibles au basculement, mais ils ne sont généralement pas transitoires. Au lieu d'une courte période de refroidissement, OpenClaw marque le profil comme **désactivé** (avec un backoff plus long) et passe au profil/fournisseur suivant.

<Note>
Toutes les responses de forme facturation ne sont pas `402`, et chaque HTTP `402`OpenClaw n'atterrit pas ici. OpenClaw conserve le texte de facturation explicite dans la voie de facturation même lorsqu'un fournisseur renvoie `401` ou `403`OpenRouter à la place, mais les correspondants spécifiques au fournisseur restent limités au fournisseur qui les possède (par exemple OpenRouter `403 Key limit exceeded`).

Pendant ce temps, les erreurs temporaires de fenêtre d'utilisation `402` et de limite de dépenses d'organisation/espace de travail sont classées comme `rate_limit` lorsque le message semble réessayer (par exemple `weekly usage limit exhausted`, `daily limit reached, resets tomorrow` ou `organization spending limit exceeded`). Celles-ci restent sur le chemin de période de refroidissement/basculement court plutôt que sur le chemin de désactivation de facturation long.

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

Par défaut :

- L'attente de facturation (billing backoff) commence à **5 heures**, double à chaque échec de facturation et plafonne à **24 heures**.
- Les compteurs d'attente sont réinitialisés si le profil n'a pas échoué pendant **24 heures** (configurable).
- Les nouvelles tentatives de surcharge permettent **1 rotation de profil du même provider** avant le basculement de model.
- Les nouvelles tentatives de surcharge utilisent **0 ms d'attente** par défaut.

## Basculement de model

Si tous les profils d'un fournisseur échouent, OpenClaw passe au model suivant dans OpenClaw`agents.defaults.model.fallbacks`. Cela s'applique aux échecs d'authentification, aux limites de taux et aux expirations qui ont épuisé la rotation des profils (d'autres erreurs n'avancent pas le secours). Les erreurs de fournisseur qui n'exposent pas suffisamment de détails sont toujours étiquetées avec précision dans l'état de secours : `empty_response` signifie que le fournisseur n'a renvoyé aucun message ou état utilisable, `no_error_details` signifie que le fournisseur a explicitement renvoyé `Unknown error (no error details in response)`, et `unclassified`OpenClaw signifie qu'OpenClaw a préservé l'aperçu brut mais qu'aucun classificateur ne l'a encore correspondu.

Les erreurs de surcharge et de limite de taux sont gérées plus agressivement que les temps de refroidissement de facturation. Par défaut, OpenClaw permet une nouvelle tentative de profil d'authentification du même fournisseur, puis passe au model de secours configuré suivant sans attendre. Les signaux de fournisseur occupé tels que OpenClaw`ModelNotReadyException` atterrissent dans ce compartiment de surcharge. Ajustez cela avec `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` et `auth.cooldowns.rateLimitedProfileRotations`.

Lorsqu'une exécution commence à partir du principal par défaut configuré, d'un principal de tâche cron, d'un principal d'agent avec secours explicites, ou d'une substitution de secours auto-sélectionnée, OpenClaw peut parcourir la chaîne de secours configurée correspondante. Les principaux d'agent sans secours explicites et les sélections explicites de l'utilisateur (par exemple OpenClaw`/model ollama/qwen3.5:27b`, le sélecteur de model, `sessions.patch`CLIOpenClaw, ou des substitutions uniques de fournisseur/model CLI) sont stricts : si ce fournisseur/model est inaccessible ou échoue avant de produire une réponse, OpenClaw signale l'échec au lieu de répondre à partir d'un secours non lié.

### Règles de la chaîne de candidats

OpenClaw construit la liste de candidats à partir du OpenClaw`provider/model` actuellement demandé plus les secours configurés.

<AccordionGroup>
  <Accordion title="Règles"OpenClaw>
    - Le modèle demandé est toujours le premier.
    - Les replis (fallbacks) configurés explicitement sont dédupliqués mais non filtrés par la liste d'autorisation des modèles. Ils sont considérés comme une intention explicite de l'opérateur.
    - Si l'exécution actuelle utilise déjà un repli configuré dans la même famille de provider, OpenClaw continue d'utiliser la chaîne configurée complète.
    - Lorsqu'aucune substitution de repli explicite n'est fournie, les replis configurés sont essayés avant le principal configuré, même si le modèle demandé utilise un provider différent.
    - Lorsqu'aucune substitution de repli explicite n'est fournie au lanceur de repli, le principal configuré est ajouté à la fin afin que la chaîne puisse revenir à la valeur par défaut normale une fois les candidats précédents épuisés.
    - Lorsqu'un appelant fournit `fallbacksOverride`, le lanceur utilise exactement le modèle demandé plus cette liste de substitution. Une liste vide désactive le repli de modèle et empêche le principal configuré d'être ajouté comme cible de retry masquée.

  </Accordion>
</AccordionGroup>

### Quelles erreurs font avancer la bascule

<Tabs>
  <Tab title="Continue sur">
    - les échecs d'authentification
    - les limites de débit et l'épuisement des temps de recharge (cooldowns)
    - les erreurs de surcharge/professionnel occupé (provider-busy)
    - les erreurs de repli de type expiration (timeout-shaped)
    - les désactivations de facturation
    - `LiveSessionModelSwitchError`, qui est normalisé dans un chemin de repli pour qu'un modèle persistant obsolète ne crée pas une boucle de retry externe
    - d'autres erreurs non reconnues lorsqu'il reste des candidats

  </Tab>
  <Tab title="Ne continue pas sur">
    - les abandons explicites qui ne sont pas de type expiration/repli (timeout/failover-shaped)
    - les erreurs de dépassement de contexte qui doivent rester dans la logique de compression/retry (par exemple `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `The input is too long for the model`, ou `ollama error: context length exceeded`)
    - une erreur inconnue finale lorsqu'il ne reste plus de candidats

  </Tab>
</Tabs>

### Comportement de l'ignore de refroidissement vs sonde

Lorsque chaque profil d'authentification d'un fournisseur est déjà en refroidissement (cooldown), OpenClaw n'ignore pas automatiquement ce fournisseur pour toujours. Il prend une décision par candidat :

<AccordionGroup>
  <Accordion title="Décisions par candidat">
    - Les échecs d'authentification persistants sautent immédiatement tout le fournisseur.
    - Les désactivations de facturation sautent généralement, mais le candidat principal peut toujours être sondé sur une limite de débit afin que la récupération soit possible sans redémarrage.
    - Le candidat principal peut être sondé près de l'expiration du temps de refroidissement, avec une limite de débit par fournisseur.
    - Les frères et sœurs de repli du même fournisseur peuvent être tentés malgré le temps de refroidissement lorsque l'échec semble transitoire (`rate_limit`, `overloaded` ou inconnu). C'est particulièrement pertinent lorsqu'une limite de débit est limitée au modèle et qu'un modèle frère peut toujours récupérer immédiatement.
    - Les sondes de temps de refroidissement transitoires sont limitées à une par fournisseur par exécution de repli afin qu'un seul fournisseur ne bloque pas le repli inter-fournisseurs.

  </Accordion>
</AccordionGroup>

## Remplacements de session et commutation dynamique de model

Les modifications de modèle de session sont un état partagé. Le runner actif, la commande `/model`, les mises à jour de compactage/session et la réconciliation de session en direct lisent ou écrivent tous des parties de la même entrée de session.

Cela signifie que les tentatives de repli doivent se coordonner avec la commutation dynamique de model :

- Seuls les changements de modèle explicites initiés par l'utilisateur marquent un basculement en direct en attente. Cela inclut `/model`, `session_status(model=...)` et `sessions.patch`.
- Les changements de model pilotés par le système, tels que la rotation de repli, les remplacements de heartbeat ou le compactage, ne marquent jamais seuls une commutation dynamique en attente.
- Les substitutions de modèle initiées par l'utilisateur sont traitées comme des sélections exactes pour la stratégie de repli, de sorte qu'un fournisseur sélectionné injoignable apparaît comme un échec au lieu d'être masqué par `agents.defaults.model.fallbacks`.
- Avant qu'une tentative de repli ne commence, le runner de réponse persiste les champs de remplacement de repli sélectionnés dans l'entrée de session.
- Les substitutions de repli automatique restent sélectionnées lors des tours suivants afin que OpenClaw ne sonde pas un principal défaillant connu à chaque message. OpenClaw sonde périodiquement l'origine configurée à nouveau et efface la substitution automatique lorsqu'elle récupère ; `/new`, `/reset` et `sessions.reset` effacent immédiatement les substitutions d'origine automatique.
- Les réponses de l'utilisateur annoncent les transitions de basculement et la récupération après annulation du basculement une fois par changement d'état. Les tours de basculement persistants ne répètent pas l'avis.
- `/status` affiche le modèle sélectionné et, lorsque l'état de repli diffère, le modèle de repli actif et la raison.
- La réconciliation de session en direct privilégie les substitutions de session persistantes par rapport aux champs de model d'exécution obsolètes.
- Si une erreur de basculement en direct pointe vers un candidat ultérieur dans la chaîne de basculement active, OpenClaw passe directement à ce model sélectionné au lieu de parcourir d'abord les candidats sans rapport.
- Si la tentative de basculement échoue, le runner annule uniquement les champs de substitution qu'il a écrits, et uniquement s'ils correspondent toujours à ce candidat ayant échoué.

Cela empêche la course classique :

<Steps>
  <Step title="Échec du primaire">Le model primaire sélectionné échoue.</Step>
  <Step title="Basculement choisi en mémoire">Le candidat de basculement est choisi en mémoire.</Step>
  <Step title="Le magasin de session indique toujours l'ancien primaire">Le magasin de session reflète toujours l'ancien primaire.</Step>
  <Step title="La réconciliation en direct lit un état obsolète">La réconciliation de session en direct lit l'état de session obsolète.</Step>
  <Step title="Nouvelle tentative réinitialisée">La nouvelle tentative est ramenée à l'ancien model avant le début de la tentative de basculement.</Step>
</Steps>

La substitution de basculement persistante ferme cette fenêtre, et l'annulation ciblée conserve intactes les modifications manuelles ou d'exécution de session plus récentes.

## Observabilité et résumés des échecs

`runWithModelFallback(...)` enregistre les détails de chaque tentative qui alimentent les journaux et les messages de temps de refroidissement visibles par l'utilisateur :

- provider/model tenté
- raison (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found` et raisons de basculement similaires)
- statut/code optionnel
- résumé d'erreur lisible par l'homme

Les journaux structurés `model_fallback_decision` incluent également des champs plats `fallbackStep*` lorsqu'un candidat échoue, est ignoré ou qu'un basculement ultérieur réussit. Ces champs rendent la transition tentée explicite (`fallbackStepFromModel`, `fallbackStepToModel`, `fallbackStepFromFailureReason`, `fallbackStepFromFailureDetail`, `fallbackStepFinalOutcome`) afin que les exportateurs de journaux et de diagnostics puissent reconstituer la défaillance principale, même lorsque le basculement terminal échoue également.

Lorsque tous les candidats échouent, OpenClaw génère `FallbackSummaryError`. Le gestionnaire de réponses externe peut l'utiliser pour construire un message plus spécifique, tel que « tous les models sont temporairement limités par le taux », et inclure l'expiration du refroidissement la plus proche lorsqu'elle est connue.

Ce résumé de refroidissement est conscient du modèle :

- les limites de taux non liées et limitées au modèle sont ignorées pour la chaîne provider/model tentée
- si le blocage restant est une limite de taux correspondante et limitée au modèle, OpenClaw signale la dernière expiration correspondante qui bloque toujours ce modèle

## Configuration connexe

Voir la [configuration du Gateway](/fr/gateway/configuration) pour :

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- routage `agents.defaults.imageModel`

Voir [Modèles](/fr/concepts/models) pour l'aperçu global de la sélection et du basculement de models.
