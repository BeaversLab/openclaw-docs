---
summary: "Comment OpenClaw effectue la triade, répond et assure le suivi des incidents de sécurité"
title: "Réponse aux incidents"
read_when:
  - Responding to a security report or suspected security incident
  - Preparing a coordinated disclosure or patched security release
  - Reviewing post-incident follow-up expectations
---

## 1. Détection et triade

Nous surveillons les signaux de sécurité provenant de :

- GitHub Security Advisories (GHSA) et rapports de vulnérabilité privés.
- Issues/discussions publiques GitHub lorsque les rapports ne sont pas sensibles.
- Signaux automatisés (par exemple Dependabot, CodeQL, avis de sécurité npm et analyse des secrets).

Triade initiale :

1. Confirmer le composant affecté, la version et l'impact sur la limite de confiance.
2. Classifier comme problème de sécurité ou durcissement/pas d'action en utilisant les règles `SECURITY.md` du référentiel de portée et hors portée.
3. Un responsable d'incident répond en conséquence.

## 2. Évaluation

Guide de gravité :

- **Critique :** Compromission du paquet/de la version/du référentiel, exploitation active, ou contournement de la limite de confiance non authentifié avec une exposition de contrôle ou de données à fort impact.
- **Élevé :** Contournement vérifié de la limite de confiance nécessitant des conditions préalables limitées (par exemple action authentifiée mais non autorisée à fort impact), ou exposition d'informations d'identification sensibles appartenant à OpenClaw.
- **Moyen :** Faiblesse de sécurité significative avec un impact pratique mais une exploitabilité contrainte ou des prérequis substantiels.
- **Faible :** Constatations de défense en profondeur, déni de service à portée restreinte, ou lacunes de durcissage/parité sans contournement démontré de la limite de confiance.

## 3. Réponse

1. Accuser réception au rapporteur (de manière privée si sensible).
2. Reproduire sur les versions prises en charge et le dernier `main`, puis implémenter et valider un correctif avec une couverture de régression.
3. Pour les incidents critiques/élevés, préparer la/les version(s) corrigée(s) aussi rapidement que possible.
4. Pour les incidents moyens/faibles, corriger dans le flux de publication normal et documenter les directives d'atténuation.

## 4. Communication

Nous communiquons via :

- GitHub Security Advisories dans le référentiel affecté.
- Entrées des notes de version/journal des modifications pour les versions corrigées.
- Suivi direct du rapporteur sur le statut et la résolution.

Politique de divulgation :

- Les incidents critiques/majeurs doivent faire l'objet d'une divulgation coordonnée, avec l'émission d'un CVE le cas échéant.
- Les résultats de durcissement à faible risque peuvent être documentés dans les notes de version ou les avis de sécurité sans CVE, en fonction de l'impact et de l'exposition des utilisateurs.

## 5. Rétablissement et suivi

Après le déploiement de la correction :

1. Vérifiez les correctifs dans la CI et les artefacts de version.
2. Effectuez une brève analyse post-incident (chronologie, cause première, lacune de détection, plan de prévention).
3. Ajoutez des tâches de suivi pour le durcissement, les tests ou la documentation et assurez-vous qu'elles sont suivies jusqu'à leur achèvement.
