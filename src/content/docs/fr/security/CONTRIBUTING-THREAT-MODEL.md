---
title: "Contribuer au modèle de menace"
summary: "Comment contribuer au modèle de menace OpenClaw"
read_when:
  - You want to contribute security findings or threat scenarios
  - Reviewing or updating the threat model
---

# Contribuer au modèle de menace OpenClaw

Merci de nous aider à rendre OpenClaw plus sécurisé. Ce modèle de menace est un document évolutif et nous acceptons les contributions de quiconque - vous n'avez pas besoin d'être un expert en sécurité.

## Moyens de contribuer

### Ajouter une menace

Vous avez repéré un vecteur d'attaque ou un risque que nous n'avons pas couvert ? Ouvrez un ticket sur [openclaw/trust](https://github.com/openclaw/trust/issues) et décrivez-le avec vos propres mots. Vous n'avez pas besoin de connaître des cadres spécifiques ou de remplir tous les champs - décrivez simplement le scénario.

**Utile à inclure (mais non obligatoire) :**

- Le scénario d'attaque et comment il pourrait être exploité
- Les parties de OpenClaw qui sont affectées (CLI, passerelle, canaux, ClawHub, serveurs MCP, etc.)
- La gravité estimée (faible / moyenne / élevée / critique)
- Tous les liens vers des recherches connexes, des CVE ou des exemples réels

Nous nous occuperons de la correspondance ATLAS, des identifiants de menace et de l'évaluation des risques lors de la révision. Si vous souhaitez inclure ces détails, c'est parfait - mais ce n'est pas attendu.

> **Ceci est pour ajouter au modèle de menace, pas pour signaler des vulnérabilités actives.** Si vous avez trouvé une vulnérabilité exploitable, consultez notre [page Trust](https://trust.openclaw.ai) pour les instructions de divulgation responsable.

### Suggérer une atténuation

Vous avez une idée pour traiter une menace existante ? Ouvrez un ticket ou une PR en référençant la menace. Les atténuations utiles sont spécifiques et actionnables - par exemple, "limitation du taux par expéditeur de 10 messages/minute à la passerelle" est préférable à "mettre en œuvre une limitation du taux".

### Proposer une chaîne d'attaque

Les chaînes d'attaque montrent comment plusieurs menaces se combinent en un scénario d'attaque réaliste. Si vous voyez une combinaison dangereuse, décrivez les étapes et comment un attaquant les enchaînerait. Une courte narration de la manière dont l'attaque se déroule en pratique a plus de valeur qu'un modèle formel.

### Corriger ou améliorer le contenu existant

Fautes de frappe, clarifications, informations obsolètes, meilleurs exemples - les PR sont les bienvenues, aucun ticket nécessaire.

## Ce que nous utilisons

### MITRE ATLAS

Ce modèle de menace est basé sur [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems), un cadre conçu spécifiquement pour les menaces IA/ML telles que l'injection de prompt, l'abus d'outils et l'exploitation d'agents. Vous n'avez pas besoin de connaître ATLAS pour contribuer - nous associons les soumissions au cadre lors de la révision.

### Identifiants de menace

Chaque menace reçoit un identifiant comme `T-EXEC-003`. Les catégories sont :

| Code    | Catégorie                                     |
| ------- | --------------------------------------------- |
| RECON   | Reconnaissance - collecte d'informations      |
| ACCESS  | Accès initial - gain d'entrée                 |
| EXEC    | Exécution - exécution d'actions malveillantes |
| PERSIST | Persistance - maintien de l'accès             |
| EVADE   | Évasion de défense - éviter la détection      |
| DISC    | Découverte - apprendre l'environnement        |
| EXFIL   | Exfiltration - vol de données                 |
| IMPACT  | Impact - dommages ou perturbations            |

Les identifiants sont attribués par les mainteneurs lors de la révision. Vous n'avez pas besoin d'en choisir un.

### Niveaux de risque

| Niveau       | Signification                                                            |
| ------------ | ------------------------------------------------------------------------ |
| **Critique** | Compromission totale du système, ou probabilité élevée + impact critique |
| **Élevé**    | Dommages importants probables, ou probabilité moyenne + impact critique  |
| **Moyen**    | Risque modéré, ou faible probabilité + impact élevé                      |
| **Faible**   | Peu probable et impact limité                                            |

Si vous n'êtes pas sûr du niveau de risque, décrivez simplement l'impact et nous l'évaluerons.

## Processus de révision

1. **Tri** - Nous examinons les nouvelles soumissions dans les 48 heures
2. **Évaluation** - Nous vérifions la faisabilité, attribuons la correspondance ATLAS et l'identifiant de menace, validons le niveau de risque
3. **Documentation** - Nous nous assurons que tout est formaté et complet
4. **Fusion** - Ajouté au modèle de menace et à la visualisation

## Ressources

- [Site Web ATLAS](https://atlas.mitre.org/)
- [Techniques ATLAS](https://atlas.mitre.org/techniques/)
- [Études de cas ATLAS](https://atlas.mitre.org/studies/)
- [Modèle de menace OpenClaw](/en/security/THREAT-MODEL-ATLAS)

## Contact

- **Vulnérabilités de sécurité :** Consultez notre [page de confiance](https://trust.openclaw.ai) pour les instructions de signalement
- **Questions sur le modèle de menace :** Ouvrez un ticket sur [openclaw/trust](https://github.com/openclaw/trust/issues)
- **Discussion générale :** Discord channel #security

## Reconnaissance

Les contributeurs au modèle de menace sont reconnus dans les remerciements du modèle de menace, les notes de version et le temple de la renommée de sécurité OpenClaw pour leurs contributions importantes.
