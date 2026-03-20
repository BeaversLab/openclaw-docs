---
title: "Contributing to the Threat Model"
summary: "How to contribute to the OpenClaw threat model"
read_when:
  - You want to contribute security findings or threat scenarios
  - Reviewing or updating the threat model
---

# Contributing to the OpenClaw Threat Model

Thanks for helping make OpenClaw more secure. This threat model is a living document and we welcome contributions from anyone - you don't need to be a security expert.

## Ways to Contribute

### Add a Threat

Spotted an attack vector or risk we haven't covered? Open an issue on [openclaw/trust](https://github.com/openclaw/trust/issues) and describe it in your own words. You don't need to know any frameworks or fill in every field - just describe the scenario.

**Helpful to include (but not required):**

- The attack scenario and how it could be exploited
- Which parts of OpenClaw are affected (CLI, gateway, channels, ClawHub, MCP servers, etc.)
- How severe you think it is (low / medium / high / critical)
- Any links to related research, CVEs, or real-world examples

We'll handle the ATLAS mapping, threat IDs, and risk assessment during review. If you want to include those details, great - but it's not expected.

> **This is for adding to the threat model, not reporting live vulnerabilities.** If you've found an exploitable vulnerability, see our [Trust page](https://trust.openclaw.ai) for responsible disclosure instructions.

### Suggest a Mitigation

Have an idea for how to address an existing threat? Open an issue or PR referencing the threat. Useful mitigations are specific and actionable - for example, "per-sender rate limiting of 10 messages/minute at the gateway" is better than "implement rate limiting."

### Propose an Attack Chain

Attack chains show how multiple threats combine into a realistic attack scenario. If you see a dangerous combination, describe the steps and how an attacker would chain them together. A short narrative of how the attack unfolds in practice is more valuable than a formal template.

### Fix or Improve Existing Content

Typos, clarifications, outdated info, better examples - PRs welcome, no issue needed.

## What We Use

### MITRE ATLAS

Ce modèle de menace est basé sur [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems), un cadre conçu spécifiquement pour les menaces IA/ML telles que l'injection de prompt, l'utilisation abusive d'outils et l'exploitation d'agents. Vous n'avez pas besoin de connaître ATLAS pour contribuer - nous mappons les soumissions au cadre lors de la révision.

### Identifiants de menace

Chaque menace reçoit un identifiant comme `T-EXEC-003`. Les catégories sont :

| Code    | Catégorie                                     |
| ------- | --------------------------------------------- |
| RECON   | Reconnaissance - collecte d'informations      |
| ACCESS  | Accès initial - obtenir un point d'entrée     |
| EXEC    | Exécution - exécution d'actions malveillantes |
| PERSIST | Persistance - maintien de l'accès             |
| EVADE   | Évasion de défense - éviter la détection      |
| DISC    | Découverte - apprendre l'environnement        |
| EXFIL   | Exfiltration - vol de données                 |
| IMPACT  | Impact - dommages ou perturbations            |

Les identifiants sont attribués par les mainteneurs lors de la révision. Vous n'avez pas besoin d'en choisir un.

### Niveaux de risque

| Niveau       | Signification                                                           |
| ------------ | ----------------------------------------------------------------------- |
| **Critique** | Compromission totale du système, ou forte probabilité + impact critique |
| **Élevé**    | Dommages importants probables, ou probabilité moyenne + impact critique |
| **Moyen**    | Risque modéré, ou faible probabilité + impact élevé                     |
| **Faible**   | Peu probable et impact limité                                           |

Si vous n'êtes pas sûr du niveau de risque, décrivez simplement l'impact et nous l'évaluerons.

## Processus de révision

1. **Tri** - Nous examinons les nouvelles soumissions dans les 48 heures
2. **Évaluation** - Nous vérifions la faisabilité, attribuons le mappage ATLAS et l'identifiant de menace, validons le niveau de risque
3. **Documentation** - Nous nous assurons que tout est formaté et complet
4. **Fusion** - Ajouté au modèle de menace et à la visualisation

## Ressources

- [Site Web ATLAS](https://atlas.mitre.org/)
- [Techniques ATLAS](https://atlas.mitre.org/techniques/)
- [Études de cas ATLAS](https://atlas.mitre.org/studies/)
- [Modèle de menace OpenClaw](/fr/security/THREAT-MODEL-ATLAS)

## Contact

- **Vulnérabilités de sécurité :** Consultez notre [page de confiance](https://trust.openclaw.ai) pour les instructions de signalement
- **Questions sur le modèle de menace :** Ouvrez une issue sur [openclaw/trust](https://github.com/openclaw/trust/issues)
- **Discussion générale :** Discord #security channel

## Reconnaissance

Les contributeurs au modèle de menace sont reconnus dans les remerciements du modèle de menace, les notes de version et le temple de la renommée de sécurité OpenClaw pour leurs contributions importantes.

import fr from "/components/footer/fr.mdx";

<fr />
