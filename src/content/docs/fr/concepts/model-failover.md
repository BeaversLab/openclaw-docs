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
  <Step title="Construire la chaîne de candidats">Construire la chaîne de candidats de modèles à partir du modèle de session actuellement sélectionné, puis `agents.defaults.model.fallbacks` dans l'ordre, en terminant par le principal configuré lorsque l'exécution a commencé à partir d'une substitution.</Step>
  <Step title="Essayer le fournisseur actuel">Essayer le fournisseur actuel avec les règles de rotation/délai de repos (cooldown) des profils d'authentification.</Step>
  <Step title="Avancer en cas d'erreurs justifiant une bascule">Si ce fournisseur est épuisé avec une erreur justifiant une bascule, passer au candidat de modèle suivant.</Step>
  <Step title="Persister la substitution de bascule">Persister la substitution de bascule sélectionnée avant le début de la nouvelle tentative afin que les autres lecteurs de la session voient le même fournisseur/modèle que celui que le coureur va utiliser. La substitution de modèle persistée est marquée `modelOverrideSource: "auto"`.</Step>
  <Step title="Rétablir étroitement en cas d'échec">Si le candidat de bascule échoue, rétablir uniquement les champs de substitution de session possédés par la bascule lorsqu'ils correspondent toujours à ce candidat ayant échoué.</Step>
  <Step title="Lever FallbackSummaryError si épuisé">Si tous les candidats échouent, lever une `FallbackSummaryError` avec des détails par tentative et l'expiration du délai de repos la plus proche lorsqu'une est connue.</Step>
</Steps>

Ceci est volontairement plus restrictif que « sauvegarder et restaurer toute la session ». Le coureur de réponse ne persiste que les champs de sélection de modèle qu'il possède pour la bascule :

- `providerOverride`
- `modelOverride`
- `modelOverrideSource`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

Cela empêche une nouvelle tentative de secours échouée d'écraser des mutations de session plus récentes et non liées, telles que les modifications manuelles de `/model` ou les mises à jour de rotation de session qui se sont produites pendant que la tentative était en cours.

## Stockage d'authentification (clés + OAuth)

OpenClaw utilise des **profils d'authentification** pour les clés API ainsi que pour les jetons OAuth.

- Les secrets résident dans `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` (ancien : `~/.openclaw/agent/auth-profiles.json`).
- L'état d'exécution du routage d'authentification réside dans `~/.openclaw/agents/<agentId>/agent/auth-state.json`.
- La configuration `auth.profiles` / `auth.order` contient **uniquement des métadonnées et du routage** (aucun secret).
- Fichier OAuth d'importation hérité : `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` lors de la première utilisation).

Plus de détails : [OAuth](/fr/concepts/oauth)

Types d'identifiants :

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }` (+ `projectId`/`enterpriseUrl` pour certains fournisseurs)

## Identifiants de profil

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

- **Clé primaire :** type de profil (**OAuth avant les clés API**).
- **Clé secondaire :** `usageStats.lastUsed` (le plus ancien en premier, dans chaque type).
- **Profils en période de refroidissement (cooldown) / désactivés** sont déplacés à la fin, classés par expiration la plus proche.

### Adhérence de session (favorable au cache)

OpenClaw **fixe le profil d'authentification choisi par session** pour garder les caches du fournisseur chauds. Il fait **pas** pivoter à chaque requête. Le profil fixé est réutilisé jusqu'à ce que :

- la session est réinitialisée (`/new` / `/reset`)
- une compaction est terminée (le compteur de compactions s'incrémente)
- le profil est en refroidissement/désactivé

La sélection manuelle via `/model …@<profileId>` définit une **substitution utilisateur** pour cette session et n'est pas pivotée automatiquement jusqu'à ce qu'une nouvelle session commence.

<Note>
  Les profils fixés automatiquement (sélectionnés par le routeur de session) sont traités comme une **préférence** : ils sont essayés en premier, mais OpenClaw peut pivoter vers un autre profil en cas de limites de délai/d'attentes. Les profils fixés par l'utilisateur restent verrouillés sur ce profil ; s'il échoue et que des replis de modèle sont configurés, OpenClaw passe au modèle suivant au
  lieu de changer de profil.
</Note>

### Pourquoi OAuth peut sembler "perdu"

Si vous avez à la fois un profil OAuth et un profil de clé API pour le même fournisseur, la répartition (round‑robin) peut basculer entre eux d'un message à l'autre sauf s'ils sont fixés. Pour forcer un seul profil :

- Fixez avec `auth.order[provider] = ["provider:profileId"]`, ou
- Utilisez une substitution par session via `/model …` avec une substitution de profil (lorsque pris en charge par votre interface/chat).

## Refroidissements

Lorsqu'un profil échoue en raison d'erreurs d'authentification/de limite de débit (ou d'un délai d'attente ressemblant à une limitation de débit), OpenClaw le marque en refroidissement et passe au profil suivant.

<AccordionGroup>
  <Accordion title="Ce qui tombe dans le compartiment de limite de taux / dépassement de délai">
    Ce compartiment de limite de taux est plus large que le simple `429` : il inclut également les messages du fournisseur tels que `Too many concurrent requests`, `ThrottlingException`, `concurrency limit reached`, `workers_ai ... quota limit exceeded`, `throttled`, `resource exhausted`, ainsi que les limites périodiques de fenêtre d'utilisation telles que `weekly/monthly limit reached`.

    Les erreurs de format/requête invalide (par exemple, les échecs de validation de l'ID d'appel d'outil Cloud Code Assist) sont considérées comme justifiant un basculement et utilisent les mêmes périodes de refroidissement. Les erreurs de raison d'arrêt compatibles avec OpenAI telles que `Unhandled stop reason: error`, `stop reason: error` et `reason: error` sont classées comme des signaux de dépassement de délai/basculement.

    Le texte générique du serveur peut également atterrir dans ce compartiment de dépassement de délai lorsque la source correspond à un modèle transitoire connu. Par exemple, le message nu de l'enveloppe de flux pi-ai `An unknown error occurred` est considéré comme justifiant un basculement pour chaque fournisseur, car pi-ai l'émet lorsque les flux du fournisseur se terminent par `stopReason: "aborted"` ou `stopReason: "error"` sans détails spécifiques. Les charges utiles JSON `api_error` contenant du texte transitoire du serveur tel que `internal server error`, `unknown error, 520`, `upstream error` ou `backend error` sont également traitées comme des dépassements de délai justifiant un basculement.

    Le texte générique en amont spécifique à OpenRouter tel que le simple `Provider returned error` est traité comme un dépassement de délai uniquement lorsque le contexte du fournisseur est réellement OpenRouter. Le texte générique de repli interne tel que `LLM request failed with an unknown error.` reste conservateur et ne déclenche pas de basculement par lui-même.

  </Accordion>
  <Accordion title="SDK retry-after caps">
    Certains SDK de fournisseur pourraient sinon dormir pendant une longue fenêtre `Retry-After` avant de retourner le contrôle à OpenClaw. Pour les SDK basés sur Stainless tels que Anthropic et OpenAI, OpenClaw plafonne par défaut à 60 secondes les attentes `retry-after-ms` / `retry-after` internes au SDK et expose immédiatement les réponses réessayables plus longues afin que ce chemin de basculement puisse s'exécuter. Ajustez ou désactivez le plafond avec `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS` ; voir [Retry behavior](/fr/concepts/retry).
  </Accordion>
  <Accordion title="Model-scoped cooldowns">
    Les temps de recharge (cooldowns) de limitation de débit peuvent également être limités au modèle :

    - OpenClaw enregistre `cooldownModel` pour les échecs de limitation de débit lorsque l'id du modèle en échec est connu.
    - Un modèle frère sur le même fournisseur peut toujours être essayé lorsque la recharge est limitée à un modèle différent.
    - Les fenêtres de facturation/désactivation bloquent toujours tout le profil entre les modèles.

  </Accordion>
</AccordionGroup>

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

Les échecs de facturation/crédit (par exemple « crédits insuffisants » / « solde de crédits trop faible ») sont traités comme éligibles au basculement, mais ils ne sont généralement pas transitoires. Au lieu d'une courte recharge, OpenClaw marque le profil comme **désactivé** (avec une temporisation plus longue) et passe au profil/fournisseur suivant.

<Note>
Toute réponse de type facturation n'est pas `402`, et chaque erreur HTTP `402` n'aboutit pas ici. OpenClaw conserve le texte de facturation explicite dans la voie de facturation même lorsqu'un fournisseur renvoie `401` ou `403` à la place, mais les correspondants spécifiques au fournisseur restent limités au fournisseur qui les possède (par exemple OpenRouter `403 Key limit exceeded`).

Pendant ce temps, les erreurs temporaires de fenêtre d'utilisation `402` et de limite de dépenses de l'organisation/espace de travail sont classées comme `rate_limit` lorsque le message semble réessayable (par exemple `weekly usage limit exhausted`, `daily limit reached, resets tomorrow`, ou `organization spending limit exceeded`). Celles-ci restent sur le chemin de refroidissement courts/basculement au lieu du chemin de désactivation de facturation long.

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
- Les tentatives de réessai en cas de surcharge permettent **1 rotation de profil du même fournisseur** avant la bascule vers le model.
- Les tentatives de réessai en cas de surcharge utilisent **0 ms d'attente** par défaut.

## Basculement de model

Si tous les profils d'un fournisseur échouent, OpenClaw passe au model suivant dans `agents.defaults.model.fallbacks`. Cela s'applique aux échecs d'authentification, aux limites de taux et aux délais d'attente qui ont épuisé la rotation des profils (d'autres erreurs n'avancent pas la bascule). Les erreurs de fournisseur qui n'exposent pas assez de détails sont toujours étiquetées précisément dans l'état de bascule : `empty_response` signifie que le fournisseur n'a renvoyé aucun message ou statut utilisable, `no_error_details` signifie que le fournisseur a explicitement renvoyé `Unknown error (no error details in response)`, et `unclassified` signifie que OpenClaw a conservé l'aperçu brut mais qu'aucun classificateur ne l'a encore correspondu.

Les erreurs de surcharge et de limitation de débit sont gérées de manière plus agressive que les temps de refroidissement de facturation. Par défaut, OpenClaw autorise une nouvelle tentative avec le même profil d'authentification du fournisseur, puis passe au modèle de secours configuré suivant sans attendre. Les signaux de fournisseur occupé, tels que `ModelNotReadyException`, atterrissent dans ce compartiment de surcharge. Ajustez cela avec `auth.cooldowns.overloadedProfileRotations`, `auth.cooldowns.overloadedBackoffMs` et `auth.cooldowns.rateLimitedProfileRotations`.

Lorsqu'une exécution commence avec une priorité de modèle (hooks ou CLI), les mécanismes de secours finissent toujours par `agents.defaults.model.primary` après avoir essayé les secours configurés.

### Règles de la chaîne de candidats

OpenClaw construit la liste des candidats à partir de `provider/model` actuellement demandé plus les secours configurés.

<AccordionGroup>
  <Accordion title="Règles">
    - Le modèle demandé est toujours le premier. - Les secours configurés explicitement sont dédupliqués mais non filtrés par la liste d'autorisation des modèles. Ils sont traités comme une intention explicite de l'opérateur. - Si l'exécution actuelle est déjà sur un secours configuré dans la même famille de fournisseurs, OpenClaw continue d'utiliser la chaîne configurée complète. - Si l'exécution
    actuelle est sur un fournisseur différent de la configuration et que ce modèle actuel ne fait pas déjà partie de la chaîne de secours configurée, OpenClaw n'ajoute pas les secours configurés non liés d'un autre fournisseur. - Lorsque l'exécution a commencé à partir d'une priorité, le principal configuré est ajouté à la fin pour que la chaîne puisse revenir à la valeur par défaut normale une
    fois les candidats précédents épuisés.
  </Accordion>
</AccordionGroup>

### Quelles erreurs font avancer le secours

<Tabs>
  <Tab title="Continue sur">
    - échecs d'authentification - limites de débit et épuisement des temps de refroidissement - erreurs de surcharge/fournisseur occupé - erreurs de secours de type timeout - désactivations de facturation - `LiveSessionModelSwitchError`, qui est normalisé dans un chemin de secours pour qu'un modèle persistant obsolète ne crée pas une boucle de nouvelle tentative externe - autres erreurs non
    reconnues lorsqu'il reste des candidats
  </Tab>
  <Tab title="Ne continue pas en cas de">
    - abandons explicites qui ne sont pas liés à un délai ou à une bascule - erreurs de dépassement de contexte qui doivent rester dans la logique de compactage/réessai (par exemple `request_too_large`, `INVALID_ARGUMENT: input exceeds the maximum number of tokens`, `input token count exceeds the maximum number of input tokens`, `The input is too long for the model`, ou `ollama error: context
    length exceeded`) - une erreur inconnue finale lorsqu'il ne reste plus de candidats
  </Tab>
</Tabs>

### Comparaison du contournement de refroidissement et du comportement de sonde

Lorsque chaque profil d'authentification pour un provider est déjà en refroidissement, OpenClaw ne saute pas automatiquement ce provider pour toujours. Il prend une décision par candidat :

<AccordionGroup>
  <Accordion title="Décisions par candidat">
    - Les échecs d'authentification persistants sautent immédiatement tout le provider. - Les désactivations de facturation sautent généralement, mais le candidat principal peut toujours être sondé lors d'une limitation afin que la récupération soit possible sans redémarrage. - Le candidat principal peut être sondé près de l'expiration du refroidissement, avec une limitation par provider. - Les
    frères et sœurs de bascule du même provider peuvent être tentés malgré le refroidissement lorsque l'échec semble transitoire (`rate_limit`, `overloaded`, ou inconnu). Ceci est particulièrement pertinent lorsqu'une limite de taux est limitée au model et qu'un model frère peut toujours récupérer immédiatement. - Les sondes de refroidissement transitoires sont limitées à une par provider par
    exécution de bascule afin qu'un seul provider ne bloque pas la bascule inter-providers.
  </Accordion>
</AccordionGroup>

## Remplacements de session et changement de model en direct

Les changements de model de session sont un état partagé. Le runner actif, la commande `/model`, les mises à jour de compactage/session et la réconciliation de session en direct lisent ou écrivent tous des parties de la même entrée de session.

Cela signifie que les tentatives de bascule doivent se coordonner avec le changement de model en direct :

- Seuls les changements de model explicitement pilotés par l'utilisateur marquent une bascule en direct en attente. Cela inclut `/model`, `session_status(model=...)` et `sessions.patch`.
- Les changements de model pilotés par le système, tels que la rotation de bascule, les remplacements de battement de cœur ou le compactage, ne marquent jamais seuls une bascule en direct en attente.
- Avant qu'une tentative de bascule ne commence, le runner de réponse persiste les champs de remplacement de bascule sélectionnés dans l'entrée de session.
- Les remplacements de basculement automatique restent sélectionnés lors des tours suivants afin qu'OpenClaw ne sonde pas un principal défaillant connu à chaque message. `/new`, `/reset` et `sessions.reset` effacent les remplacements d'origine automatique et ramènent la session à la valeur par défaut configurée.
- `/status` affiche le modèle sélectionné et, lorsque l'état de basculement diffère, le modèle de basculement actif et la raison.
- La réconciliation de session en direct privilégie les remplacements de session persistants par rapport aux champs de modèle d'exécution obsolètes.
- Si une erreur de commutation en direct pointe vers un candidat ultérieur dans la chaîne de basculement active, OpenClaw saute directement vers ce modèle sélectionné au lieu de parcourir d'abord des candidats non liés.
- Si la tentative de basculement échoue, le réexécuteur annule uniquement les champs de remplacement qu'il a écrits, et uniquement s'ils correspondent toujours à ce candidat ayant échoué.

Cela empêche la situation de course classique :

<Steps>
  <Step title="Échec du principal">Le modèle principal sélectionné échoue.</Step>
  <Step title="Basculement choisi en mémoire">Le candidat de basculement est choisi en mémoire.</Step>
  <Step title="Le magasin de session indique toujours l'ancien principal">Le magasin de session reflète toujours l'ancien principal.</Step>
  <Step title="La réconciliation en direct lit un état obsolète">La réconciliation de session en direct lit l'état de session obsolète.</Step>
  <Step title="La nouvelle tentative est réinitialisée">La nouvelle tentative est réinitialisée à l'ancien modèle avant que la tentative de basculement ne commence.</Step>
</Steps>

Le remplacement de basculement persistant ferme cette fenêtre, et l'annulation ciblée conserve intactes les modifications de session manuelles ou d'exécution plus récentes.

## Observabilité et résumés d'échec

`runWithModelFallback(...)` enregistre les détails de chaque tentative qui alimentent les journaux et les messages de refroidissement destinés à l'utilisateur :

- provider/model tenté
- raison (`rate_limit`, `overloaded`, `billing`, `auth`, `model_not_found` et raisons de basculement similaires)
- status/code optionnel
- résumé d'erreur lisible par l'homme

Les journaux structurés `model_fallback_decision` incluent également des champs plats `fallbackStep*` lorsqu'un candidat échoue, est ignoré ou qu'un basculement ultérieur réussit. Ces champs rendent la transition tentée explicite (`fallbackStepFromModel`, `fallbackStepToModel`, `fallbackStepFromFailureReason`, `fallbackStepFromFailureDetail`, `fallbackStepFinalOutcome`) afin que les exportateurs de journaux et de diagnostics puissent reconstruire l'échec principal même lorsque le basculement terminal échoue également.

Lorsque chaque candidat échoue, OpenClaw lance `FallbackSummaryError`. Le processeur de réponse externe peut l'utiliser pour construire un message plus spécifique, tel que "tous les modèles sont temporairement limités par le taux", et inclure l'expiration de refroidissement la plus proche lorsqu'elle est connue.

Ce résumé de refroidissement est conscient du modèle :

- les limites de taux non liées et limitées au modèle sont ignorées pour la chaîne fournisseur/modèle tentée
- si le blocage restant est une limite de taux correspondante et limitée au modèle, OpenClaw signale la dernière expiration correspondante qui bloque encore ce modèle

## Configuration associée

Voir la [configuration Gateway](/fr/gateway/configuration) pour :

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- routage `agents.defaults.imageModel`

Voir [Modèles](/fr/concepts/models) pour l'aperçu général de la sélection et du basculement de modèles.
