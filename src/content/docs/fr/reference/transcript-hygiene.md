---
summary: "Référence : règles de nettoyage et de réparation des transcripts spécifiques aux providers"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Hygiène des transcriptions"
---

OpenClaw applique des **correctifs spécifiques au fournisseur** aux transcriptions avant une exécution (création du contexte du modèle). La plupart d'entre eux sont des ajustements **en mémoire** utilisés pour satisfaire les exigences strictes des fournisseurs. Une passe de réparation distincte du fichier de session peut également réécrire le JSONL stocké avant le chargement de la session, soit en supprimant les lignes JSONL malformées, soit en réparant les tours persistants qui sont syntaxiquement valides mais connus pour être rejetés par un fournisseur lors de la relecture. Lorsqu'une réparation se produit, le fichier d'origine est sauvegardé aux côtés du fichier de session.

La portée inclut :

- Le contexte de l'invite d'exécution uniquement reste en dehors des tours de transcription visibles par l'utilisateur
- Nettoyage des identifiants d'appel d'outil
- Validation des entrées d'appel d'outil
- Réparation du couplage des résultats d'outil
- Validation / ordonnancement des tours
- Nettoyage des signatures de pensée
- Nettoyage de la signature de réflexion
- Assainissement de la charge utile de l'image
- Balisage de la provenance des entrées utilisateur (pour les invites routées entre sessions)
- Réparation des tours d'erreur d'assistant vides pour la relecture Bedrock Converse

Si vous avez besoin de détails sur le stockage des transcriptions, consultez :

- [Approfondissement de la gestion de session](/fr/reference/session-management-compaction)

---

## Règle globale : le contexte d'exécution n'est pas la transcription de l'utilisateur

Le contexte d'exécution/système peut être ajouté à l'invite du modèle pour un tour, mais ce n'est pas du contenu créé par l'utilisateur final. OpenClaw conserve un corps d'invite distinct pour les réponses Gateway, les suivis mis en file d'attente, l'ACP, la CLI et les exécutions Pi intégrées. Les tours utilisateur visibles stockés utilisent ce corps de transcription au lieu de l'invite enrichie par l'exécution.

Pour les sessions héritées qui ont déjà persisté des wrappers d'exécution, les surfaces d'historique Gateway appliquent une projection d'affichage avant de renvoyer les messages aux clients WebChat, TUI, REST ou SSE.

---

## Où cela s'exécute

Toute l'hygiène des transcriptions est centralisée dans le lanceur intégré :

- Sélection de la stratégie : `src/agents/transcript-policy.ts`
- Application de l'assainissement/réparation : `sanitizeSessionHistory` dans `src/agents/pi-embedded-runner/replay-history.ts`

La stratégie utilise `provider`, `modelApi` et `modelId` pour décider quoi appliquer.

Indépendamment de l'hygiène des transcriptions, les fichiers de session sont réparés (si nécessaire) avant le chargement :

- `repairSessionFileIfNeeded` dans `src/agents/session-file-repair.ts`
- Appelé depuis `run/attempt.ts` et `compact.ts` (lanceur intégré)

---

## Règle globale : assainissement des images

Les payloads d'image sont toujours nettoyés pour éviter les rejets côté provider dus aux limites de taille (réduction de taille/recompression des images base64 trop volumineuses).

Cela aide également à contrôler la pression de tokens induite par les images pour les modèles dotés de capacités de vision. Des dimensions maximales plus faibles réduisent généralement l'utilisation de tokens ; des dimensions plus élevées préservent les détails.

Implémentation :

- `sanitizeSessionMessagesImages` dans `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` dans `src/agents/tool-images.ts`
- Le côté maximal de l'image est configurable via `agents.defaults.imageMaxDimensionPx` (par défaut : `1200`).

---

## Règle globale : appels d'outil malformés

Les blocs d'appel d'outil de l'assistant qui manquent à la fois de `input` et de `arguments` sont supprimés avant la construction du contexte du modèle. Cela empêche les rejets du provider dus à des appels d'outil partiellement persistés (par exemple, après un échec de limite de taux).

Implémentation :

- `sanitizeToolCallInputs` dans `src/agents/session-transcript-repair.ts`
- Appliqué dans `sanitizeSessionHistory` dans `src/agents/pi-embedded-runner/replay-history.ts`

---

## Règle globale : provenance des entrées inter-sessions

Lorsqu'un agent envoie une invite dans une autre session via `sessions_send` (y compris les étapes de réponse/annonce agent-à-agent), OpenClaw persiste le tour utilisateur créé avec :

- `message.provenance.kind = "inter_session"`

Ces métadonnées sont écrites au moment de l'ajout au transcript et ne modifient pas le rôle (`role: "user"` reste pour la compatibilité du provider). Les lecteurs de transcript peuvent les utiliser pour éviter de traiter les invites internes routées comme des instructions rédigées par l'utilisateur final.

Pendant la reconstruction du contexte, OpenClaw préfixe également un court marqueur `[Inter-session message]` à ces tours utilisateur en mémoire afin que le modèle puisse les distinguer des instructions externes de l'utilisateur final.

---

## Matrice des providers (comportement actuel)

**OpenAI / OpenAI Codex**

- Nettoyage des images uniquement.
- Supprime les signatures de raisonnement orphelines (éléments de raisonnement autonomes sans bloc de contenu suivant) pour les transcripts OpenAI Responses/Codex, et supprime le raisonnement rejouable OpenAI après un changement de route de modèle.
- Aucun nettoyage de l'ID d'appel d'outil.
- La réparation de l'appariement des résultats d'outils peut déplacer des sorties réelles correspondantes et synthétiser des sorties de style Codex `aborted` pour les appels d'outils manquants.
- Aucune validation ou réorganisation des tours.
- Les sorties d'outil de la famille OpenAI Responses manquantes sont synthétisées sous forme de `aborted` pour correspondre à la normalisation de relecture de Codex.
- Pas de suppression de signature de pensée.

**Gemma 4 compatible OpenAI**

- Les blocs de réflexion/raisonnement historiques de l'assistant sont supprimés avant la relecture afin que les serveurs locaux Gemma 4 compatibles OpenAI ne reçoivent pas le contenu de raisonnement des tours précédents.
- Les continuations d'appels d'outil du même tour gardent le bloc de raisonnement de l'assistant attaché à l'appel d'outil jusqu'à ce que le résultat de l'outil ait été relu.

**Google (Generative AI / Gemini CLI / Antigravity)**

- Nettoyage de l'ID d'appel d'outil : alphanumérique strict.
- Réparation du couplage des résultats d'outil et résultats d'outil synthétiques.
- Validation des tours (alternance des tours style Gemini).
- Correction de l'ordre des tours Google (ajouter un petit amorçage utilisateur si l'historique commence par l'assistant).
- Antigravity Claude : normaliser les signatures de pensée ; supprimer les blocs de pensée non signés.

**Anthropic / Minimax (compatible Anthropic)**

- Réparation du couplage des résultats d'outil et résultats d'outil synthétiques.
- Validation des tours (fusionner les tours utilisateur consécutifs pour respecter une alternance stricte).
- Les blocs de pensée dont les signatures de relecture sont manquantes, vides ou vierges sont supprimés avant la conversion par le fournisseur. Si cela vide un tour d'assistant, OpenClaw conserve la forme du tour avec un texte de raisonnement omis non vide.
- Les anciens tours d'assistant uniquement pensée qui doivent être supprimés sont remplacés par un texte de raisonnement omis non vide afin que les adaptateurs de fournisseur ne suppriment pas le tour de relecture.

**Amazon Bedrock (Converse API)**

- Les tours d'erreur de flux d'assistant vides sont réparés en un bloc de texte de repli non vide avant la relecture. Bedrock Converse rejette les messages d'assistant avec `content: []`, donc les tours d'assistant persistants avec `stopReason: "error"` et un contenu vide sont également réparés sur le disque avant le chargement.
- Les blocs de pensée Claude dont les signatures de relecture sont manquantes, vides ou vierges sont supprimés avant la relecture Converse. Si cela vide un tour d'assistant, OpenClaw conserve la forme du tour avec un texte de raisonnement omis non vide.
- Les anciens tours d'assistant uniquement pensée qui doivent être supprimés sont remplacés par un texte de raisonnement omis non vide afin que la relecture Converse conserve une forme de tour stricte.
- La relecture filtre les tours d'assistant injectés par la passerelle et le miroir de livraison OpenClaw.
- La nettoyage d'image s'applique via la règle globale.

**Mistral (y compris la détection basée sur l'id de model)**

- Nettoyage des ids des appels de tool : strict9 (longueur alphanumérique de 9).

**OpenRouter Gemini**

- Nettoyage des signatures de pensée : supprimer les valeurs `thought_signature` non base64 (garder le base64).

**Tout le reste**

- Nettoyage d'image uniquement.

---

## Comportement historique (avant le 22/01/2026)

Avant la version 2026.1.22, OpenClaw appliquait plusieurs couches d'hygiène de transcript :

- Une extension **transcript-sanitize** s'exécutait à chaque construction de contexte et pouvait :
  - Réparer les appairages utilisation/résultat de tool.
  - Nettoyer les ids des appels de tool (y compris un mode non strict qui préservait `_`/`-`).
- Le moteur effectuait également une nettoyage spécifique au provider, ce qui doublait le travail.
- Des mutations supplémentaires se produisaient en dehors de la stratégie du provider, y compris :
  - Suppression des balises `<final>` du texte de l'assistant avant la persistance.
  - Suppression des tours d'erreur d'assistant vides.
  - Découpage du contenu de l'assistant après les appels de tool.

Cette complexité a provoqué des régressions inter-providers (notamment l'appariement `openai-responses`
`call_id|fc_id`). Le nettoyage de la version 2026.1.22 a supprimé l'extension, centralisé la
logique dans le moteur, et rendu OpenAI **no-touch** au-delà du nettoyage d'image.

## Connexes

- [Gestion de session](/fr/concepts/session)
- [Élagage de session](/fr/concepts/session-pruning)
