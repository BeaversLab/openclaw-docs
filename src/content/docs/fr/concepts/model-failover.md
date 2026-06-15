---
summary: "OpenClawComment OpenClaw fait la rotation des profils d'authentification et le basculement entre les modèles"
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
    Construire la chaîne de candidats de modèles à partir de la sélection de modèle actuelle et de la stratégie de basculement pour cette source de sélection. Les valeurs par défaut configurées, les principales tâches cron et les modèles de secours sélectionnés automatiquement peuvent utiliser des basculements configurés ; les sélections explicites de session utilisateur sont strictes.
  </Step>
  <Step title="Essayer le fournisseur actuel">Essayer le fournisseur actuel avec les règles de rotation/refroidissement du profil d'authentification.</Step>
  <Step title="Avancer en cas d'erreurs de basculement">Si ce fournisseur est épuisé avec une erreur justifiant un basculement, passer au candidat de modèle suivant.</Step>
  <Step title="Conserver la priorité de basculement">Conserver la priorité de basculement sélectionnée avant le début de la nouvelle tentative afin que les autres lecteurs de session voient le même fournisseur/modèle que le processeur s'apprête à utiliser. La priorité de modèle conservée est marquée `modelOverrideSource: "auto"`.</Step>
  <Step title="Annuler étroitement en cas d'échec">Si le candidat de secours échoue, annuler uniquement les champs de priorité de session appartenant au basculement lorsqu'ils correspondent toujours à ce candidat ayant échoué.</Step>
  <Step title="Lever FallbackSummaryError si épuisé">Si tous les candidats échouent, lever une `FallbackSummaryError` avec des détails par tentative et l'expiration du refroidissement la plus proche lorsqu'elle est connue.</Step>
</Steps>

Ceci est volontairement plus restrictif que « sauvegarder et restaurer toute la session ». Le coureur de réponse ne persiste que les champs de sélection de modèle qu'il possède pour la bascule :

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Cela empêche une nouvelle tentative de basculement (fallback) échouée d'écraser des mutations de session plus récentes et sans rapport, telles que les modifications manuelles de `/model` ou les mises à jour de rotation de session survenues pendant l'exécution de la tentative.

## Stratégie de source de sélection

OpenClaw sépare le fournisseur/modèle sélectionné de la raison de sa sélection. Cette source contrôle si la chaîne de basculement est autorisée :

- **Par défaut configuré** : `agents.defaults.model.primary` utilise `agents.defaults.model.fallbacks`.
- **Agent primaire** : `agents.list[].model` est strict sauf si cet objet d'agent de modèle inclut son propre `fallbacks`. Utilisez `fallbacks: []` pour rendre le comportement strict explicite, ou fournissez une liste non vide pour permettre cet agent dans le basculement de modèle.
- **Remplacement de basculement automatique** : un basculement (fallback) à l'exécution écrit `providerOverride`, `modelOverride`, `modelOverrideSource: "auto"`, et le modèle d'origine sélectionné avant de réessayer. Ce remplacement automatique peut continuer à parcourir la chaîne de basculement configurée sans sonder le primaire à chaque message, mais OpenClaw sonde périodiquement à nouveau l'origine configurée et efface le remplacement automatique lorsqu'elle récupère. `/new`, `/reset`, et `sessions.reset` effacent également les remplacements d'origine automatique. Le battement de cœur (heartbeat) s'exécute sans effacement explicite de `heartbeat.model` et efface les remplacements automatiques directs lorsque leur origine ne correspond plus à la valeur par défaut configurée actuelle.
- **Remplacement de session utilisateur** : `/model`, le sélecteur de modèle, `session_status(model=...)`, et `sessions.patch` écrivent `modelOverrideSource: "user"`. Il s'agit d'une sélection de session exacte. Si le provider/modèle sélectionné échoue avant de produire une réponse, OpenClaw signale l'échec au lieu de répondre à partir d'un basculement configuré sans rapport.
- **Remplacement de session hérité** : les entrées de session plus anciennes peuvent avoir `modelOverride` sans `modelOverrideSource`. OpenClaw les traite comme des remplacements utilisateur afin qu'une sélection ancienne explicite ne soit pas silencieusement convertie en comportement de basculement.
- **Cron payload model** : une tâche cron `payload.model` / `--model` est une priorité de la tâche, et non une priorité de session utilisateur. Elle utilise les configurations de secours configurées, sauf si la tâche fournit `payload.fallbacks` ; `payload.fallbacks: []` rend l'exécution de la cron stricte.

L'intervalle de sonde automatique de basculement primaire est de cinq minutes et n'est pas configurable. OpenClaw mémorise les sondes récentes par session et par model principal afin qu'un principal défaillant ne soit pas réessayé à chaque tour. OpenClaw envoie un avis visible lorsqu'une session passe sur un basculement et un autre avis lorsqu'elle revient au principal sélectionné ; il ne répète pas l'avis à chaque tour de basculement persistant.

## Ignorer le cache en cas d'échec d'authentification

Par défaut, chaque nouveau tour conserve le comportement de tentative de secours existant : OpenClaw
essayera à nouveau chaque candidat de secours configuré, y compris les candidats non principaux
ayant récemment échoué avec `auth` ou `auth_permanent`.

Les opérateurs qui préfèrent supprimer ces échecs d'authentification répétés peuvent activer cette option avec :

```bash
OPENCLAW_FALLBACK_SKIP_TTL_MS=60000
```

Lorsqu'elle est activée, OpenClaw enregistre un marqueur d'ignorée en mémoire, limité à la session, pour un
candidat de secours non principal après un échec de classe d'authentification. Le marqueur est indexé
par l'id de session, le fournisseur et le modèle. Les candidats principaux ne sont jamais ignorés, donc une
sélection explicite de modèle par l'utilisateur affiche toujours la vraie erreur d'authentification. Le cache est
local au processus et est effacé au redémarrage de la Gateway.

La valeur est un TTL en millisecondes. `0` ou une valeur non définie désactive le cache.
Les valeurs positives sont limitées entre 1 seconde et 10 minutes.

## Notifications de secours visibles par l'utilisateur

Lorsqu'une session passe à un secours sélectionné automatiquement, OpenClaw envoie une notification d'état dans la même surface de réponse :

```text
↪️ Model Fallback: <fallback> (selected <primary>; <reason>)
```

Lorsqu'une sonde ultérieure réussit et que la session retourne au principal sélectionné, OpenClaw envoie :

```text
↪️ Model Fallback cleared: <primary> (was <fallback>)
```

Ces notifications sont des messages opérationnels, et non du contenu de l'assistant. Elles sont délivrées une fois par changement d'état, y compris pour les tours à effets de bord uniquement lorsque cela est possible, mais les tours de secours persistants ne les répètent pas. La livraison contourne la suppression normale de la réponse source, la notification ne consomme pas le premier emplacement de réponse de l'assistant pour les canaux threadés, et elle est exclue de la synthèse vocale et de l'extraction des engagements.

## Stockage d'authentification (clés + OAuth)

OpenClaw utilise des **profils d'authentification** pour les clés API et les jetons OAuth.

- Les secrets résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (obsolète : `~/.openclaw/agent/auth-profiles.json`).
- L'état d'exécution du routage d'authentification réside dans `~/.openclaw/agents/<agentId>/agent/auth-state.json`.
- Config `auth.profiles` / `auth.order` sont **métadonnées + routage uniquement** (pas de secrets).
- Fichier d'importation hérité uniquement OAuth : `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` à la première utilisation).

Plus de détails : [OAuth](/fr/concepts/oauth)

Types d'identifiants :

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` pour certains providers)

## IDs de profil

Les connexions OAuth créent des profils distincts afin que plusieurs comptes puissent coexister.

- Par défaut : `provider:default` lorsqu'aucun e-mail n'est disponible.
- OAuth avec e-mail : `provider:<email>` (par exemple `google-antigravity:user@gmail.com`).

Les profils résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` sous `profiles`.

## Ordre de rotation

Lorsqu'un provider a plusieurs profils, OpenClaw choisit un ordre comme ceci :

<Steps>
  <Step title="Configuration explicite">`auth.order[provider]` (si défini).</Step>
  <Step title="Profils configurés">`auth.profiles` filtrés par provider.</Step>
  <Step title="Profils stockés">Entrées dans `auth-profiles.json` pour le provider.</Step>
</Steps>

Si aucun ordre explicite n'est configuré, OpenClaw utilise un ordre round-robin :

- **Clé primaire :** type de profil (**OAuth avant les clés API**).
- **Clé secondaire :** `usageStats.lastUsed` (le plus ancien en premier, dans chaque type).
- Les **profils en période de refroidissement/désactivés** sont déplacés à la fin, ordonnés par expiration la plus proche.

### Adhérence de session (cache-friendly)

OpenClaw **fige le profil d'authentification choisi par session** pour garder les caches des providers chauds. Il **ne fait pas** de rotation à chaque requête. Le profil épinglé est réutilisé jusqu'à ce que :

- la session est réinitialisée (`/new` / `/reset`)
- une compaction est terminée (le compteur de compaction s'incrémente)
- le profil est en refroidissement/désactivé

Une sélection manuelle via `/model …@<profileId>` définit une **substitution utilisateur** pour cette session et n'est pas automatiquement pivotée tant qu'une nouvelle session n'a pas commencé.

<Note>
  Les profils épinglés automatiquement (sélectionnés par le routeur de session) sont traités comme une **préférence** : ils sont essayés en premier, mais OpenClaw peut basculer vers un autre profil en cas de limites de délai/d'attentes. Lorsque le profil original redevient disponible, les nouvelles exécutions peuvent lui préférer à nouveau sans changer le modèle sélectionné ou le runtime. Les
  profils épinglés par l'utilisateur restent verrouillés sur ce profil ; s'il échoue et que les basculements de modèle sont configurés, OpenClaw passe au modèle suivant au lieu de changer de profil.
</Note>

### Abonnement OpenAI Codex plus sauvegarde de clé API

Pour les modèles d'agent OpenAI, l'authentification et le runtime sont distincts. `openai/gpt-*` reste sur
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

Utilisez `openai:*`OAuth pour les profils OAuth ChatGPT/Codex ainsi que pour les profils de clé OpenAI API.
Lorsque l'abonnement atteint une limite d'utilisation Codex,
OpenClaw enregistre l'heure exacte de réinitialisation lorsque Codex en fournit une, essaie le prochain
profil d'authentification ordonné, et maintient l'exécution dans le harnais Codex. Une fois l'heure de
réinitialisation passée, le profil d'abonnement est à nouveau éligible et la prochaine sélection
automatique peut y retourner.

Utilisez un profil épinglé par l'utilisateur uniquement lorsque vous souhaitez forcer un compte/clé pour cette
session. Les profils épinglés par l'utilisateur sont intentionnellement stricts et ne sautent pas
silencieusement vers un autre profil.

## Refroidissements

Lorsqu'un profil échoue en raison d'erreurs d'authentification/limite de débit (ou d'un délai d'attente ressemblant à une limitation de débit), OpenClaw le marque en refroidissement et passe au profil suivant.

<AccordionGroup>
  <Accordion title="Ce qui atterrit dans le compartiment de limite de délai / d'expiration">
    Ce compartiment de limite de débit est plus large qu'un simple `429` : il inclut également les messages du fournisseur tels que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted`, et les limites périodiques de fenêtre d'utilisation telles que `weekly/monthly limit reached`.

    Les erreurs de format ou de requête invalide sont généralement terminales, car la nouvelle tentative de la même charge utile échouerait de la même manière ; par conséquent, OpenClaw les affiche au lieu de faire tourner les profils d'authentification. Les chemins de réparation de nouvelle tentative connus peuvent opter explicitement : par exemple, les échecs de validation de l'ID d'appel d'outil de Cloud Code Assist sont nettoyés et réessayés une fois via la stratégie `allowFormatRetry`. Les erreurs de motif d'arrêt compatibles avec OpenAI telles que `Unhandled stop reason: error`, `stop reason: error` et `reason: error` sont classées comme signaux d'expiration/basculement.

    Le texte générique du serveur peut également atterrir dans ce compartiment d'expiration lorsque la source correspond à un modèle transitoire connu. Par exemple, le message nu du wrapper de flux d'exécution de modèle `An unknown error occurred` est considéré comme digne d'un basculement pour chaque fournisseur, car l'exécution de modèle partagée l'émet lorsque les flux du fournisseur se terminent par `stopReason: "aborted"` ou `stopReason: "error"` sans détails spécifiques. Les charges utiles JSON `api_error` avec du texte transitoire du serveur tel que `internal server error`, `unknown error, 520`, `upstream error` ou `backend error` sont également traitées comme des expirations dignes d'un basculement.

    Le texte générique en amont spécifique à OpenRouter tel que le `Provider returned error` nu est traité comme une expiration uniquement lorsque le contexte du fournisseur est réellement OpenRouter. Le texte générique interne de secours tel que `LLM request failed with an unknown error.` reste conservateur et ne déclenche pas de basculement par lui-même.

  </Accordion>
  <Accordion title="SDK retry-after caps">
    Certains SDK de fournisseur peuvent sinon dormir pendant une longue fenêtre `Retry-After`OpenClawAnthropicOpenAIOpenClaw avant de rendre le contrôle à OpenClaw. Pour les SDK basés sur Stainless tels qu'Anthropic et OpenAI, OpenClaw plafonne par défaut les attentes `retry-after-ms` / `retry-after` internes du SDK à 60 secondes et expose immédiatement les réponses réessayables plus longues afin que ce chemin de basculement puisse s'exécuter. Ajustez ou désactivez la limite avec `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` ; voir [Retry behavior](/fr/concepts/retry).
  </Accordion>
  <Accordion title="Model-scoped cooldowns"OpenClaw>
    Les temps de recharge de limite de débit peuvent également être limités au modèle :

    - OpenClaw enregistre `cooldownModel` pour les échecs de limite de débit lorsque l'identifiant du modèle en échec est connu.
    - Un modèle frère sur le même fournisseur peut toujours être essayé lorsque le temps de recharge est limité à un modèle différent.
    - Les fenêtres de facturation/désactivation bloquent toujours tout le profil sur les modèles.

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

Les échecs de facturation/crédit (par exemple "crédits insuffisants" / "solde de crédit trop faible") sont considérés comme éligibles au basculement, mais ils ne sont généralement pas transitoires. Au lieu d'un court temps de recharge, OpenClaw marque le profil comme **désactivé** (avec un backoff plus long) et passe au profil/fournisseur suivant.

<Note>
Toutes les réponses liées à la facturation ne sont pas `402`, et chaque HTTP `402` n'aboutit pas ici. OpenClaw conserve le texte de facturation explicite dans la voie de facturation, même lorsqu'un fournisseur renvoie `401` ou `403` à la place, mais les correspondants spécifiques au fournisseur restent limités au fournisseur qui les possède (par exemple OpenRouter `403 Key limit exceeded`).

Parallèlement, les erreurs temporaires de `402` liées à la fenêtre d'utilisation et aux limites de dépenses de l'organisation/de l'espace de travail sont classées comme `rate_limit` lorsque le message semble réessayer (par exemple `weekly usage limit exhausted`, `daily limit reached, resets tomorrow` ou `organization spending limit exceeded`). Celles-ci restent sur le chemin de temporisation courte/basculement, plutôt que sur le chemin de désactivation longue de la facturation.

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
- Les nouvelles tentatives de surcharge autorisent **1 rotation de profil au sein du même fournisseur** avant le basculement de modèle.
- Les nouvelles tentatives de surcharge utilisent **0 ms d'attente** par défaut.

## Basculement de modèle

Si tous les profils d'un fournisseur échouent, OpenClaw passe au modèle suivant dans `agents.defaults.model.fallbacks`. Cela s'applique aux échecs d'authentification, aux limites de débit et aux expirations ayant épuisé la rotation des profils (les autres erreurs n'avancent pas le basculement). Les erreurs du fournisseur qui n'exposent pas suffisamment de détails sont toujours étiquetées précisément dans l'état de basculement : `empty_response` signifie que le fournisseur n'a renvoyé aucun message ou état utilisable, `no_error_details` signifie que le fournisseur a explicitement renvoyé `Unknown error (no error details in response)`, et `unclassified` signifie que OpenClaw a conservé l'aperçu brut mais qu'aucun classificateur ne l'a encore correspondu.

Les erreurs de surcharge et de limite de débit sont gérées plus agressivement que les temps de recharge de facturation. Par défaut, OpenClaw autorise une nouvelle tentative de profil d'authentification au sein du même fournisseur, puis passe au model de repli configuré suivant sans attendre. Les signaux de fournisseur occupé tels que `ModelNotReadyException` tombent dans ce bucket de surcharge. Ajustez cela avec `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` et `auth.cooldowns.rateLimitedProfileRotations`.

Lorsqu'une exécution démarre à partir du principal par défaut configuré, d'un principal de tâche cron, d'un principal d'agent avec des replis explicites, ou d'un remplacement de repli sélectionné automatiquement, OpenClaw peut parcourir la chaîne de repli configurée correspondante. Les principaux d'agent sans replis explicites et les sélections explicites de l'utilisateur (par exemple `/model ollama/qwen3.5:27b`, le sélecteur de model, `sessions.patch`, ou des remplacements ponctuels de provider/model CLI) sont stricts : si ce provider/model est inaccessible ou échoue avant de produire une réponse, OpenClaw signale l'échec au lieu de répondre à partir d'un repli sans rapport.

### Règles de chaîne de candidats

OpenClaw construit la liste des candidats à partir du `provider/model` actuellement demandé plus les replis configurés.

<AccordionGroup>
  <Accordion title="Règles"OpenClaw>
    - Le model demandé est toujours le premier.
    - Les basculements (fallbacks) configurés explicitement sont dédupliqués mais non filtrés par la liste d'autorisation des models. Ils sont considérés comme une intention explicite de l'opérateur.
    - Si l'exécution en cours utilise déjà un basculement configuré dans la même famille de provider, OpenClaw continue à utiliser la chaîne configurée complète.
    - Lorsqu'aucune substitution de basculement explicite n'est fournie, les basculements configurés sont essayés avant le principal configuré, même si le model demandé utilise un provider différent.
    - Lorsqu'aucune substitution de basculement explicite n'est fournie au lanceur de basculement, le principal configuré est ajouté à la fin afin que la chaîne puisse revenir à la valeur par défaut normale une fois les candidats précédents épuisés.
    - Lorsqu'un appelant fournit `fallbacksOverride`, le lanceur utilise exactement le model demandé plus cette liste de substitution. Une liste vide désactive le basculement de model et empêche le principal configuré d'être ajouté comme cible de réessai cachée.

  </Accordion>
</AccordionGroup>

### Quelles erreurs font avancer le basculement

<Tabs>
  <Tab title="Continue sur">
    - échecs d'authentification
    - limites de débit et épuisement du refroidissement (cooldown)
    - erreurs de surcharge/provider occupé
    - erreurs de basculement de type timeout
    - désactivations de facturation
    - `LiveSessionModelSwitchError`, qui est normalisé dans un chemin de basculement pour qu'un model persistant obsolète ne crée pas une boucle de réessai externe
    - autres erreurs non reconnues lorsqu'il reste des candidats

  </Tab>
  <Tab title="Ne continue pas sur">
    - abandons explicites qui ne sont pas de type timeout/basculement
    - erreurs de dépassement de contexte qui doivent rester dans la logique de compactage/réessai (par exemple `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `The input is too long for the model`, ou `ollama error: context length exceeded`)
    - une erreur inconnue finale lorsqu'il n'y a plus de candidats

  </Tab>
</Tabs>

### Comportement d'ignorer le refroidissement (cooldown skip) vs sonde

Lorsque chaque profil d'authentification pour un provider est déjà en refroidissement, OpenClaw n'ignore pas automatiquement ce provider pour toujours. Il prend une décision par candidat :

<AccordionGroup>
  <Accordion title="Décisions par candidat">
    - Les échecs d'authentification persistants sautent immédiatement tout le provider.
    - Les désactivations de facturation sautent généralement, mais le candidat principal peut toujours être sondé avec une limite de débit afin que la récupération soit possible sans redémarrage.
    - Le candidat principal peut être sondé près de l'expiration du temps de recharge, avec une limite de débit par provider.
    - Les alternatives de secours du même provider peuvent être tentées malgré le temps de recharge lorsque l'échec semble transitoire (`rate_limit`, `overloaded`, ou inconnu). C'est particulièrement pertinent lorsque une limite de débit est limitée au modèle et qu'un modèle alternatif peut toujours récupérer immédiatement.
    - Les sondes de recharge transitoire sont limitées à une par provider par exécution de secours afin qu'un seul provider ne bloque pas le secours inter-providers.

  </Accordion>
</AccordionGroup>

## Remplacements de session et changement de modèle en direct

Les modifications de modèle de session sont un état partagé. Le runner actif, la commande `/model`, les mises à jour de compactage/session et la réconciliation de session en direct lisent ou écrivent tous des parties de la même entrée de session.

Cela signifie que les tentatives de secours doivent se coordonner avec le changement de modèle en direct :

- Seuls les changements de modèle explicitement pilotés par l'utilisateur marquent un changement en direct en attente. Cela inclut `/model`, `session_status(model=...)` et `sessions.patch`.
- Les changements de modèle pilotés par le système, tels que la rotation de secours, les remplacements de battement de cœur ou la compaction, ne marquent jamais par eux-mêmes un changement en direct en attente.
- Les remplacements de modèle pilotés par l'utilisateur sont traités comme des sélections exactes pour la politique de secours, de sorte qu'un provider sélectionné injoignable apparaît comme un échec au lieu d'être masqué par `agents.defaults.model.fallbacks`.
- Avant qu'une tentative de secours ne commence, le runner de réponse persiste les champs de remplacement de secours sélectionnés dans l'entrée de session.
- Les remplacements de secours automatiques restent sélectionnés lors des tours suivants afin que OpenClaw ne sonde pas un primaire connu comme défaillant à chaque message. OpenClaw sonde périodiquement l'origine configurée à nouveau et efface le remplacement automatique lorsqu'elle récupère ; `/new`, `/reset` et `sessions.reset` effacent immédiatement les remplacements d'origine automatique.
- Les réponses de l'utilisateur annoncent les transitions de basculement et la récupération après effacement du basculement une fois par changement d'état. Les tours de basculement persistants ne répètent pas l'avis.
- `/status` affiche le modèle sélectionné et, lorsque l'état de basculement est différent, le modèle de basculement actif et la raison.
- La réconciliation de session en direct privilégie les remplacements de session persistants par rapport aux champs de modèle d'exécution obsolètes.
- Si une erreur de commutation en direct pointe vers un candidat ultérieur dans la chaîne de basculement active, OpenClaw passe directement à ce modèle sélectionné au lieu de parcourir d'abord des candidats non liés.
- Si la tentative de basculement échoue, le moteur annule uniquement les champs de remplacement qu'il a écrits, et uniquement s'ils correspondent toujours à ce candidat ayant échoué.

Cela empêche la course classique :

<Steps>
  <Step title="Échec du primaire">Le modèle primaire sélectionné échoue.</Step>
  <Step title="Basculement choisi en mémoire">Le candidat de basculement est choisi en mémoire.</Step>
  <Step title="Le magasin de session indique toujours l'ancien primaire">Le magasin de session reflète toujours l'ancien primaire.</Step>
  <Step title="La réconciliation en direct lit un état obsolète">La réconciliation de session en direct lit l'état de session obsolète.</Step>
  <Step title="La nouvelle tentative est réinitialisée">La nouvelle tentative est réinitialisée à l'ancien modèle avant le début de la tentative de basculement.</Step>
</Steps>

Le remplacement de basculement persistant ferme cette fenêtre, et l'annulation étroite conserve intactes les modifications manuelles ou d'exécution de session plus récentes.

## Observabilité et résumés des échecs

`runWithModelFallback(...)` enregistre les détails de chaque tentative qui alimentent les journaux et les messages de refroidissement visibles par l'utilisateur :

- provider/model tenté
- raison (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found` et autres raisons de basculement similaires)
- statut/code facultatif
- résumé de l'erreur lisible par l'homme

Les journaux structurés `model_fallback_decision` incluent également des champs plats `fallbackStep*` lorsqu'un candidat échoue, est ignoré, ou qu'une bascule ultérieure réussit. Ces champs rendent la transition tentée explicite (`fallbackStepFromModel`, `fallbackStepToModel`, `fallbackStepFromFailureReason`, `fallbackStepFromFailureDetail`, `fallbackStepFinalOutcome`) afin que les exportateurs de journaux et de diagnostics puissent reconstruire la défaillance principale même lorsque la bascule terminale échoue également.

Lorsque tous les candidats échouent, OpenClaw génère `FallbackSummaryError`. Le lanceur de réponse externe peut l'utiliser pour construire un message plus spécifique, tel que « tous les models sont temporairement limités par le taux », et inclure l'expiration de refroidissement la plus proche lorsqu'elle est connue.

Ce résumé de refroidissement est conscient du model :

- les limites de taux non liées et limitées au model sont ignorées pour la chaîne provider/model tentée
- si le blocage restant est une limite de taux correspondante limitée au model, OpenClaw signale la dernière expiration correspondante qui bloque encore ce model

## Configuration connexe

Voir [configuration du Gateway](/fr/gateway/configuration) pour :

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- routage `agents.defaults.imageModel`

Voir [Models](/fr/concepts/models) pour la vue d'ensemble plus large de la sélection et de la bascule de models.
