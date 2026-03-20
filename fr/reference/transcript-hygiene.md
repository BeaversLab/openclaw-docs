---
summary: "Référence : règles de nettoyage et de réparation des transcriptions spécifiques aux providers"
read_when:
  - Vous déboguez des rejets de requêtes provider liés à la forme de la transcription
  - Vous modifiez la logique de nettoyage de la transcription ou de réparation des appels tool
  - Vous enquêtez sur des inadéquations d'ID d'appel tool entre les providers
title: "Hygiène de la transcription"
---

# Hygiène de la transcription (Corrections provider)

Ce document décrit les **corrections spécifiques aux providers** appliquées aux transcriptions avant une exécution
(construction du contexte model). Ce sont des ajustements **en mémoire** utilisés pour satisfaire les exigences
strictes des providers. Ces étapes d'hygiène ne **réécrivent pas** la transcription JSONL stockée
sur le disque ; cependant, une passe de réparation de fichier de session distincte peut réécrire des fichiers JSONL malformés
en supprimant les lignes invalides avant le chargement de la session. Lorsqu'une réparation se produit, le fichier
original est sauvegardé à côté du fichier de session.

La portée inclut :

- Nettoyage de l'ID d'appel tool
- Validation de l'entrée d'appel tool
- Réparation du jumelage des résultats tool
- Validation / ordonnancement des tours
- Nettoyage des signatures de pensée
- Nettoyage des charges utiles d'image
- Étiquetage de la provenance des saisies utilisateur (pour les invites routées inter-session)

Si vous avez besoin de détails sur le stockage des transcriptions, consultez :

- [/reference/session-management-compaction](/fr/reference/session-management-compaction)

---

## Où cela s'exécute

Toute l'hygiène des transcriptions est centralisée dans le runner intégré :

- Sélection de la stratégie : `src/agents/transcript-policy.ts`
- Application du nettoyage/réparation : `sanitizeSessionHistory` dans `src/agents/pi-embedded-runner/google.ts`

La stratégie utilise `provider`, `modelApi` et `modelId` pour décider quoi appliquer.

Indépendamment de l'hygiène de la transcription, les fichiers de session sont réparés (si nécessaire) avant le chargement :

- `repairSessionFileIfNeeded` dans `src/agents/session-file-repair.ts`
- Appelé depuis `run/attempt.ts` et `compact.ts` (runner intégré)

---

## Règle globale : nettoyage des images

Les charges utiles d'image sont toujours nettoyées pour éviter les rejets côté provider dus aux limites de taille
(réduire/recompresser les images base64 trop volumineuses).

Cela aide également à contrôler la pression de tokens induite par les images pour les modèles capables de vision.
Des dimensions maximales plus faibles réduisent généralement l'utilisation des tokens ; des dimensions plus élevées préservent les détails.

Mise en œuvre :

- `sanitizeSessionMessagesImages` dans `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` dans `src/agents/tool-images.ts`
- Le côté maximal de l'image est configurable via `agents.defaults.imageMaxDimensionPx` (par défaut : `1200`).

---

## Règle globale : appels d'outil incorrects

Les blocs d'appel d'outil de l'assistant qui n'ont ni `input` ni `arguments` sont supprimés
avant la construction du contexte du modèle. Cela empêche les rejets du provider dus à des appels d'outil
partiellement persistés (par exemple, après un échec de limite de taux).

Implémentation :

- `sanitizeToolCallInputs` dans `src/agents/session-transcript-repair.ts`
- Appliqué dans `sanitizeSessionHistory` dans `src/agents/pi-embedded-runner/google.ts`

---

## Règle globale : provenance des entrées inter-session

Lorsqu'un agent envoie une invite dans une autre session via `sessions_send` (y compris
les étapes de réponse/annonce agent-à-agent), OpenClaw persiste le tour utilisateur créé avec :

- `message.provenance.kind = "inter_session"`

Ces métadonnées sont écrites au moment de l'ajout à la transcription et ne modifient pas le rôle
(`role: "user"` reste pour la compatibilité du provider). Les lecteurs de transcription peuvent utiliser
ces données pour éviter de traiter les invites internes routées comme des instructions rédigées par l'utilisateur final.

Pendant la reconstruction du contexte, OpenClaw ajoute également un marqueur `[Inter-session message]`
court devant ces tours utilisateur en mémoire, afin que le modèle puisse les distinguer
des instructions externes de l'utilisateur final.

---

## Matrice des providers (comportement actuel)

**OpenAI / OpenAI Codex**

- Nettoyage des images uniquement.
- Supprimer les signatures de raisonnement orphelines (éléments de raisonnement autonomes sans bloc de contenu suivant) pour les transcriptions OpenAI Responses/Codex.
- Aucun nettoyage des ID d'appel d'outil.
- Aucune réparation des résultats d'appel d'outil.
- Aucune validation ou réorganisation des tours.
- Aucun résultat d'outil synthétique.
- Aucun retrait de signature de pensée.

**Google (Generative AI / Gemini CLI / Antigravity)**

- Nettoyage des ID d'appel d'outil : alphanumérique strict.
- Réparation des résultats d'appel d'outil et résultats d'outil synthétiques.
- Validation des tours (alternance des tours style Gemini).
- Correction de l'ordre des tours Google (ajouter un amorçage utilisateur minime si l'historique commence par l'assistant).
- Antigravity Claude : normaliser les signatures de pensée ; supprimer les blocs de pensée non signés.

**Anthropic / Minimax (Anthropic-compatible)**

- Réparation de l'appariement des résultats d'outils et résultats d'outils synthétiques.
- Validation des tours (fusionner les tours utilisateur consécutifs pour respecter une alternance stricte).

**Mistral (y compris la détection basée sur l'ID du modèle)**

- Nettoyage des ID d'appels d'outils : strict9 (alphanumérique de longueur 9).

**OpenRouter Gemini**

- Nettoyage des signatures de pensée : supprimer les valeurs `thought_signature` non base64 (garder le base64).

**Tout le reste**

- Nettoyage des images uniquement.

---

## Comportement historique (avant le 2026.1.22)

Avant la version 2026.1.22, OpenClaw appliquait plusieurs couches de nettoyage de transcript :

- Une **extension transcript-sanitize** s'exécutait à chaque construction de contexte et pouvait :
  - Réparer l'appariement utilisation/résultat d'outils.
  - Nettoyer les ID d'appels d'outils (y compris un mode non strict qui préservait `_`/`-`).
- Le runner effectuait également un nettoyage spécifique au fournisseur, ce qui doublait le travail.
- Des mutations supplémentaires se produisaient en dehors de la stratégie du fournisseur, notamment :
  - Suppression des balises `<final>` du texte de l'assistant avant la persistance.
  - Abandon des tours d'erreur d'assistant vides.
  - Coupe du contenu de l'assistant après les appels d'outils.

Cette complexité a provoqué des régressions inter-fournisseurs (notamment l'appariement `openai-responses`
`call_id|fc_id`). Le nettoyage de la version 2026.1.22 a supprimé l'extension, centralisé
la logique dans le runner et rendu OpenAI **no-touch** au-delà du nettoyage des images.

import fr from "/components/footer/fr.mdx";

<fr />
