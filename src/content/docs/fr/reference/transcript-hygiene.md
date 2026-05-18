---
summary: "Référence : règles de nettoyage et de réparation des transcripts spécifiques aux providers"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Hygiène des transcriptions"
---

OpenClaw applique des correctifs spécifiques au fournisseur aux transcriptions avant une exécution (création du contexte du modèle). La plupart de ces ajustements se font en mémoire pour satisfaire les exigences strictes du fournisseur. Une passe de réparation distincte du fichier de session peut également réécrire le JSONL stocké avant le chargement de la session, mais uniquement pour les lignes malformées ou les tours persistés qui sont des enregistrements durables invalides. Les réponses de l'assistant livrées sont conservées sur disque ; le nettoyage spécifique au fournisseur des préremplissages de l'assistant ne se produit que lors de la construction des charges utiles sortantes. Lorsqu'une réparation se produit, le fichier d'origine est écrit dans un fichier `*.bak-<pid>-<ts>` temporaire avant le remplacement atomique et supprimé une fois le remplacement réussi ; la sauvegarde n'est conservée que si le nettoyage lui-même échoue (auquel cas le chemin est signalé).

La portée inclut :

- Le contexte de l'invite d'exécution uniquement reste en dehors des tours de transcription visibles par l'utilisateur
- Nettoyage des identifiants d'appel d'outil
- Validation des entrées d'appel d'outil
- Réparation du couplage des résultats d'outil
- Validation / ordonnancement des tours
- Nettoyage des signatures de pensée
- Nettoyage de la signature de réflexion
- Assainissement de la charge utile de l'image
- Nettoyage des blocs de texte vides avant la réexécution par le fournisseur
- Étiquetage de la provenance des entrées utilisateur (pour les invites routées inter-session)
- Réparation des tours d'erreur d'assistant vides pour la réexécution Bedrock Converse

Si vous avez besoin de détails sur le stockage des transcripts, consultez :

- [Examen approfondi de la gestion de session](/fr/reference/session-management-compaction)

---

## Règle globale : le contexte d'exécution n'est pas le transcript utilisateur

Le contexte d'exécution/système peut être ajouté à l'invite du modèle pour un tour, mais ce n'est
pas du contenu créé par l'utilisateur final. OpenClaw conserve un corps d'invite
séparé orienté transcript pour les réponses Gateway, les suites mises en file d'attente, l'ACP, le CLI et les exécutions
Pi intégrées. Les tours utilisateur visibles stockés utilisent ce corps de transcript plutôt que l'invite
enrichie par l'exécution.

Pour les sessions héritées qui ont déjà persisté les wrappers d'exécution, les surfaces d'historique Gateway
appliquent une projection d'affichage avant de renvoyer les messages aux clients WebChat,
TUI, REST ou SSE.

---

## Où cela s'exécute

Toute l'hygiène des transcripts est centralisée dans le runner intégré :

- Sélection de la stratégie : `src/agents/transcript-policy.ts`
- Application de la nettoyage/réparation : `sanitizeSessionHistory` dans `src/agents/pi-embedded-runner/replay-history.ts`

La stratégie utilise `provider`, `modelApi` et `modelId` pour décider quoi appliquer.

Indépendamment de l'hygiène des transcripts, les fichiers de session sont réparés (si nécessaire) avant le chargement :

- `repairSessionFileIfNeeded` dans `src/agents/session-file-repair.ts`
- Appelé depuis `run/attempt.ts` et `compact.ts` (runner intégré)

---

## Règle globale : assainissement des images

Les charges utiles d'images sont toujours assainies pour éviter les rejets du côté du provider dus aux limites de taille (réduction de la taille/recompression des images base64 trop volumineuses).

Cela aide également à contrôler la pression de tokens liée aux images pour les modèles capables de vision. Des dimensions maximales plus faibles réduisent généralement l'utilisation de tokens ; des dimensions plus élevées préservent les détails.

Mise en œuvre :

- `sanitizeSessionMessagesImages` dans `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` dans `src/agents/tool-images.ts`
- Le côté maximal de l'image est configurable via `agents.defaults.imageMaxDimensionPx` (par défaut : `1200`).
- Les blocs de texte vides sont supprimés pendant que cette passe parcourt le contenu de relecture. Les tours d'assistant qui deviennent vides sont supprimés de la copie de relecture ; les tours d'utilisateur et de résultats d'outil qui deviennent vides reçoivent un espace réservé non vide pour le contenu omis.

---

## Règle globale : appels d'outil malformés

Les blocs d'appels d'outil de l'assistant qui manquent à la fois `input` et `arguments` sont supprimés
avant la construction du contexte du modèle. Cela empêche les rejets du fournisseur dus à des appels d'outil
partiellement persistés (par exemple, après un échec de limite de taux).

Mise en œuvre :

- `sanitizeToolCallInputs` dans `src/agents/session-transcript-repair.ts`
- Appliqué dans `sanitizeSessionHistory` dans `src/agents/pi-embedded-runner/replay-history.ts`

---

## Règle globale : provenance des entrées inter-sessions

Lorsqu'un agent envoie une invite dans une autre session via `sessions_send` (y compris
les étapes de réponse/annonce agent-à-agent), OpenClaw persiste le tour utilisateur créé avec :

- `message.provenance.kind = "inter_session"`

OpenClaw précède également le texte d'invite routé d'une marqueur de même tour OpenClaw`[Inter-session message ... isUser=false]` afin que l'appel de modèle actif puisse distinguer la sortie de session étrangère des instructions externes de l'utilisateur final. Ce marqueur inclut la session source, le canal et l'outil lorsqu'ils sont disponibles. La transcription utilise toujours `role: "user"` pour la compatibilité du fournisseur, mais le texte visible et les métadonnées de provenance marquent tous deux le tour comme donnée intersession.

Pendant la reconstruction du contexte, OpenClaw applique le même marqueur aux anciens tours d'utilisateur inter-sessions persistés qui ne possèdent que des métadonnées de provenance.

---

## Matrice des providers (comportement actuel)

**OpenAI / OpenAI Codex**

- Nettoyage des images uniquement.
- Supprimer les signatures de raisonnement orphelines (éléments de raisonnement autonomes sans bloc de contenu suivant) pour les transcriptions OpenAI Responses/Codex, et supprimer le raisonnement rejetable OpenAI après un changement de route de model.
- Préserver les charges utiles des éléments de raisonnement des réponses OpenAI rejetables, y compris les éléments de résumé vide chiffrés, afin que la relecture manuelle/WebSocket maintienne l'état OpenAI`rs_*` requis associé aux éléments de sortie de l'assistant.
- Les réponses natives Codex ChatGPT suivent la parité de liaison Codex en relayant les charges utiles de raisonnement/message/fonction de réponses antérieures sans identifiants d'élément antérieurs tout en préservant la session `prompt_cache_key`.
- Aucun nettoyage des id de tool.
- La réparation de l'appariement des résultats d'outils peut déplacer les sorties correspondantes réelles et synthétiser des sorties `aborted` de style Codex pour les appels d'outils manquants.
- Aucune validation ou réorganisation des tours.
- Les sorties d'outil de la famille de réponses OpenAI manquantes sont synthétisées sous forme de OpenAI`aborted` pour correspondre à la normalisation de relecture Codex.
- Aucun retrait de signature de pensée.

**Chat Completions compatibles avec OpenAI**

- Les blocs de pensée/raisonnement historiques de l'assistant sont supprimés avant la relecture afin que les serveurs compatibles OpenAI de style local et proxy ne reçoivent pas les champs de raisonnement de tour antérieur tels que `reasoning` ou `reasoning_content`.
- Les continuations d'appels de tool du même tour gardent le bloc de raisonnement de l'assistant
  attaché à l'appel de tool jusqu'à ce que le résultat du tool ait été relu.
- Les exceptions détenues par le fournisseur peuvent choisir de s'exclure lorsque leur protocole de transmission exige des métadonnées de raisonnement relues.

**Google (Generative AI / Gemini CLI / Antigravity)**

- Assainissement de l'ID d'appel d'outil : alphanumérique strict.
- Réparation du couplage des résultats d'outil et résultats d'outil synthétiques.
- Validation des tours (alternance des tours style Gemini).
- Correction de l'ordre des tours Google (ajouter un petit amorçage utilisateur au début si l'historique commence par l'assistant).
- Antigravity Claude : normaliser les signatures de réflexion ; supprimer les blocs de réflexion non signés.

**Anthropic / Minimax (compatible avec Anthropic)**

- Réparation de l'appariement des résultats d'outil et résultats d'outils synthétiques.
- Validation des tours (fusionner les tours utilisateur consécutifs pour respecter l'alternance stricte).
- Les tours de préremplissage de l'assistant en fin de chaîne sont supprimés des charges utiles Messages Anthropic sortantes lorsque la réflexion est activée, y compris sur les routes Cloudflare AI Gateway.
- Les blocs de réflexion dont les signatures de relecture sont manquantes, vides ou vierges sont supprimés avant la conversion du fournisseur. Si cela vide un tour d'assistant, OpenClaw conserve la forme du tour avec un texte non vide indiquant un raisonnement omis.
- Les anciens tours d'assistant de réflexion seule qui doivent être supprimés sont remplacés par un texte non vide indiquant un raisonnement omis, pour que les adaptateurs de fournisseur ne suppriment pas le tour de relecture.

**Amazon BedrockAPI (API Converse)**

- Les tours d'erreur de flux d'assistant vides sont réparés en un bloc de texte de repli non vide avant la relecture. Bedrock Converse rejette les messages d'assistant avec `content: []`, donc les tours d'assistant persistés avec `stopReason: "error"` et un contenu vide sont également réparés sur le disque avant le chargement.
- Les tours d'erreur de flux de l'assistant qui ne contiennent que des blocs de texte vierges sont supprimés de la copie de relecture en mémoire, au lieu de relire un bloc vierge invalide.
- Les blocs de réflexion de Claude dont les signatures de relecture sont manquantes, vides ou ne contiennent que des espaces sont supprimés avant la relecture Converse. Si cela vide un tour d'assistant, OpenClaw conserve la forme du tour avec un texte omitted-reasoning non vide.
- Les anciens tours d'assistant de réflexion uniquement qui doivent être supprimés sont remplacés par un texte omitted-reasoning non vide afin que la relecture Converse conserve une forme de tour stricte.
- La relecture filtre les tours d'assistant injectés par le miroir de livraison OpenClaw et par la passerelle.
- La nettoyage des images s'applique via la règle globale.

**Mistral (y compris la détection basée sur l'ID de modèle)**

- Nettoyage des ID d'appel d'outil : strict9 (longueur alphanumérique de 9).

**OpenRouter Gemini**

- Nettoyage de la signature de pensée : supprimer les valeurs `thought_signature` non base64 (conserver le base64).

**OpenRouter Anthropic**

- Les tours de préremplissage d'assistant à la fin sont supprimés des payloads de modèle OpenRouter compatibles OpenAI vérifiés Anthropic lorsque le raisonnement est activé, correspondant au comportement de relecture directe de Anthropic et de Cloudflare Anthropic.

**Tout le reste**

- Nettoyage des images uniquement.

---

## Comportement historique (avant le 2026.1.22)

Avant la version 2026.1.22, OpenClaw appliquait plusieurs couches d'hygiène de transcript :

- Une **extension transcript-sanitize** s'exécutait à chaque construction de contexte et pouvait :
  - Réparer le pairage utilisation/résultat d'outil.
  - Nettoyer les identifiants des appels d'outils (y compris un mode non strict qui préservait `_`/`-`).
- Le lanceur effectuait également une nettoyage spécifique au fournisseur, ce qui doublait le travail.
- Des mutations supplémentaires se produisaient en dehors de la stratégie du fournisseur, notamment :
  - Suppression des balises `<final>` du texte de l'assistant avant la persistance.
  - Abandon des tours d'erreur d'assistant vides.
  - Rogner le contenu de l'assistant après les appels d'outils.

Cette complexité a provoqué des régressions multi-fournisseurs (notamment l'association `openai-responses`
`call_id|fc_id`). Le nettoyage du 22 janvier 2026 a supprimé l'extension, centralisé
la logique dans le lanceur et rendu OpenAI **no-touch** au-delà de la nettoyage des images.

## Connexes

- [Gestion de session](/fr/concepts/session)
- [Élagage de session](/fr/concepts/session-pruning)
