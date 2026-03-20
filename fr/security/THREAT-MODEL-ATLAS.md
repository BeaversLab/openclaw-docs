---
title: "Threat Model (MITRE ATLAS)"
summary: "OpenClaw threat model mapped to the MITRE ATLAS framework"
read_when:
  - Reviewing security posture or threat scenarios
  - Working on security features or audit responses
---

# OpenClaw Threat Model v1.0

## MITRE ATLAS Framework

**Version:** 1.0-draft
**Last Updated:** 2026-02-04
**Methodology:** MITRE ATLAS + Data Flow Diagrams
**Framework:** [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems)

### Framework Attribution

This threat model is built on [MITRE ATLAS](https://atlas.mitre.org/), the industry-standard framework for documenting adversarial threats to AI/ML systems. ATLAS is maintained by [MITRE](https://www.mitre.org/) in collaboration with the AI security community.

**Key ATLAS Resources:**

- [ATLAS Techniques](https://atlas.mitre.org/techniques/)
- [ATLAS Tactics](https://atlas.mitre.org/tactics/)
- [ATLAS Case Studies](https://atlas.mitre.org/studies/)
- [ATLAS GitHub](https://github.com/mitre-atlas/atlas-data)
- [Contributing to ATLAS](https://atlas.mitre.org/resources/contribute)

### Contributing to This Threat Model

This is a living document maintained by the OpenClaw community. See [CONTRIBUTING-THREAT-MODEL.md](/fr/security/CONTRIBUTING-THREAT-MODEL) for guidelines on contributing:

- Reporting new threats
- Updating existing threats
- Proposing attack chains
- Suggesting mitigations

---

## 1. Introduction

### 1.1 Purpose

This threat model documents adversarial threats to the OpenClaw AI agent platform and ClawHub skill marketplace, using the MITRE ATLAS framework designed specifically for AI/ML systems.

### 1.2 Scope

| Component              | Included | Notes                                            |
| ---------------------- | -------- | ------------------------------------------------ |
| OpenClaw Agent Runtime | Oui      | Core agent execution, tool calls, sessions       |
| Gateway                | Oui      | Authentication, routing, channel integration     |
| Channel Integrations   | Oui      | WhatsApp, Telegram, Discord, Signal, Slack, etc. |
| ClawHub Marketplace    | Oui      | Skill publishing, moderation, distribution       |
| MCP Servers            | Yes      | External tool providers                          |
| User Devices           | Partial  | Mobile apps, desktop clients                     |

### 1.3 Out of Scope

Nothing is explicitly out of scope for this threat model.

---

## 2. System Architecture

### 2.1 Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNTRUSTED ZONE                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  WhatsApp   │  │  Telegram   │  │   Discord   │  ...         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
└─────────┼────────────────┼────────────────┼──────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 1: Channel Access                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      GATEWAY                              │   │
│  │  • Device Pairing (30s grace period)                      │   │
│  │  • AllowFrom / AllowList validation                       │   │
│  │  • Token/Password/Tailscale auth                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 2: Session Isolation              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   AGENT SESSIONS                          │   │
│  │  • Session key = agent:channel:peer                       │   │
│  │  • Tool policies per agent                                │   │
│  │  • Transcript logging                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 3: Tool Execution                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  EXECUTION SANDBOX                        │   │
│  │  • Docker sandbox OR Host (exec-approvals)                │   │
│  │  • Node remote execution                                  │   │
│  │  • SSRF protection (DNS pinning + IP blocking)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 4: External Content               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FETCHED URLs / EMAILS / WEBHOOKS             │   │
│  │  • External content wrapping (XML tags)                   │   │
│  │  • Security notice injection                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRUST BOUNDARY 5: Supply Chain                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      CLAWHUB                              │   │
│  │  • Skill publishing (semver, SKILL.md required)           │   │
│  │  • Pattern-based moderation flags                         │   │
│  │  • VirusTotal scanning (coming soon)                      │   │
│  │  • GitHub account age verification                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flows

| Flow | Source  | Destination | Data               | Protection                 |
| ---- | ------- | ----------- | ------------------ | -------------------------- |
| F1   | Channel | Gateway     | User messages      | TLS, AllowFrom             |
| F2   | Gateway | Agent       | Routed messages    | Isolement de session       |
| F3   | Agent   | Outils      | Appels d'outils    | Application des stratégies |
| F4   | Agent   | Externe     | requêtes web_fetch | Blocage SSRF               |
| F5   | ClawHub | Agent       | Code de compétence | Modération, analyse        |
| F6   | Agent   | Channel     | Réponses           | Filtrage de sortie         |

---

## 3. Analyse des menaces par tactique ATLAS

### 3.1 Reconnaissance (AML.TA0002)

#### T-RECON-001 : Découverte des points de terminaison de l'Agent

| Attribut                   | Valeur                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0006 - Analyse active                                                                                      |
| **Description**            | L'attaquant analyse les points de terminaison de passerelle OpenClaw exposés                                    |
| **Vecteur d'attaque**      | Analyse réseau, requêtes Shodan, énumération DNS                                                                |
| **Composants affectés**    | Gateway, points de terminaison API exposés                                                                      |
| **Atténuations actuelles** | Option d'authentification Tailscale, liaison à loopback par défaut                                              |
| **Risque résiduel**        | Moyen - Passerelles publiques détectables                                                                       |
| **Recommandations**        | Documenter le déploiement sécurisé, ajouter une limitation de débit sur les points de terminaison de découverte |

#### T-RECON-002 : Sonde d'intégration de channel

| Attribut                   | Valeur                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0006 - Analyse active                                                              |
| **Description**            | L'attaquant sonde les channels de messagerie pour identifier les comptes gérés par l'IA |
| **Vecteur d'attaque**      | Envoi de messages de test, observation des modèles de réponse                           |
| **Composants affectés**    | Toutes les intégrations de channels                                                     |
| **Atténuations actuelles** | Aucune spécifique                                                                       |
| **Risque résiduel**        | Faible - Valeur limitée par la seule découverte                                         |
| **Recommandations**        | Envisager une randomisation du temps de réponse                                         |

---

### 3.2 Accès initial (AML.TA0004)

#### T-ACCESS-001 : Interception du code d'appariement

| Attribut                   | Valeur                                                                           |
| -------------------------- | -------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0040 - Accès à l'API d'inférence de modèle IA                               |
| **Description**            | L'attaquant intercepte le code d'appariement pendant la période de grâce de 30 s |
| **Vecteur d'attaque**      | Shoulder surfing, sniffing réseau, ingénierie sociale                            |
| **Composants affectés**    | Système d'appariement d'appareils                                                |
| **Atténuations actuelles** | Expiration de 30 s, codes envoyés via le channel existant                        |
| **Risque résiduel**        | Moyen - Période de grâce exploitable                                             |
| **Recommandations**        | Réduire la période de grâce, ajouter une étape de confirmation                   |

#### T-ACCESS-002 : Usurpation AllowFrom

| Attribut                   | Valeur                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0040 - Accès à l'API d'inférence de modèle IA                                                       |
| **Description**            | L'attaquant usurpe l'identité de l'expéditeur autorisé dans le channel                                   |
| **Vecteur d'attaque**      | Dépend du channel - usurpation de numéro de téléphone, impersonation de nom d'utilisateur                |
| **Composants affectés**    | Validation AllowFrom par channel                                                                         |
| **Atténuations actuelles** | Vérification d'identité spécifique au channel                                                            |
| **Risque résiduel**        | Moyen - Certains channels vulnérables à l'usurpation                                                     |
| **Recommandations**        | Documenter les risques spécifiques au channel, ajouter une vérification cryptographique lorsque possible |

#### T-ACCESS-003: Vol de jeton

| Attribut                   | Valeur                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0040 - Accès API d'inférence de modèle IA                                                       |
| **Description**            | L'attaquant vole des jetons d'authentification à partir de fichiers de configuration                 |
| **Vecteur d'attaque**      | Logiciels malveillants, accès non autorisé à l'appareil, exposition des sauvegardes de configuration |
| **Composants affectés**    | ~/.openclaw/credentials/, stockage de configuration                                                  |
| **Atténuations actuelles** | Autorisations de fichiers                                                                            |
| **Risque résiduel**        | Élevé - Jetons stockés en texte brut                                                                 |
| **Recommandations**        | Implémenter le chiffrement des jetons au repos, ajouter la rotation des jetons                       |

---

### 3.3 Exécution (AML.TA0005)

#### T-EXEC-001: Injection directe de prompt

| Attribut                   | Valeur                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0051.000 - Injection de prompt LLM : Directe                                                                         |
| **Description**            | L'attaquant envoie des prompts conçus pour manipuler le comportement de l'agent                                           |
| **Vecteur d'attaque**      | Messages du channel contenant des instructions adverses                                                                   |
| **Composants affectés**    | LLM de l'agent, toutes les surfaces d'entrée                                                                              |
| **Atténuations actuelles** | Détection de modèles, enveloppement du contenu externe                                                                    |
| **Risque résiduel**        | Critique - Détection uniquement, aucun blocage ; les attaques sophistiquées contournent                                   |
| **Recommandations**        | Implémenter une défense multicouche, la validation de sortie, la confirmation de l'utilisateur pour les actions sensibles |

#### T-EXEC-002: Injection indirecte de prompt

| Attribut                   | Valeur                                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0051.001 - Injection de prompt LLM : Indirecte                         |
| **Description**            | L'attaquant intègre des instructions malveillantes dans le contenu récupéré |
| **Vecteur d'attaque**      | URL malveillantes, e-mails empoisonnés, webhooks compromis                  |
| **Composants affectés**    | web_fetch, ingestion d'e-mails, sources de données externes                 |
| **Atténuations actuelles** | Enveloppement du contenu avec des balises XML et un avis de sécurité        |
| **Risque résiduel**        | Élevé - Le LLM peut ignorer les instructions de l'enveloppeur               |
| **Recommandations**        | Implémenter la désinfection du contenu, séparer les contextes d'exécution   |

#### T-EXEC-003: Injection d'argument de tool

| Attribut                   | Valeur                                                               |
| -------------------------- | -------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0051.000 - Injection de prompt LLM : Directe                    |
| **Description**            | L'attaquant manipule les arguments du tool via l'injection de prompt |
| **Vecteur d'attaque**      | Prompts conçus qui influencent les valeurs des paramètres du tool    |
| **Composants affectés**    | Toutes les invocations de tool                                       |
| **Atténuations actuelles** | Exec approvals for dangerous commands                                |
| **Residual Risk**          | High - Relies on user judgment                                       |
| **Recommendations**        | Implement argument validation, parameterized tool calls              |

#### T-EXEC-004: Exec Approval Bypass

| Attribute               | Value                                                      |
| ----------------------- | ---------------------------------------------------------- |
| **ATLAS ID**            | AML.T0043 - Craft Adversarial Data                         |
| **Description**         | Attacker crafts commands that bypass approval allowlist    |
| **Attack Vector**       | Command obfuscation, alias exploitation, path manipulation |
| **Affected Components** | exec-approvals.ts, command allowlist                       |
| **Current Mitigations** | Allowlist + ask mode                                       |
| **Residual Risk**       | High - No command sanitization                             |
| **Recommendations**     | Implement command normalization, expand blocklist          |

---

### 3.4 Persistence (AML.TA0006)

#### T-PERSIST-001: Malicious Skill Installation

| Attribute               | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| **ATLAS ID**            | AML.T0010.001 - Supply Chain Compromise: AI Software                     |
| **Description**         | Attacker publishes malicious skill to ClawHub                            |
| **Attack Vector**       | Create account, publish skill with hidden malicious code                 |
| **Affected Components** | ClawHub, skill loading, agent execution                                  |
| **Current Mitigations** | GitHub account age verification, pattern-based moderation flags          |
| **Residual Risk**       | Critical - No sandboxing, limited review                                 |
| **Recommendations**     | VirusTotal integration (in progress), skill sandboxing, community review |

#### T-PERSIST-002: Skill Update Poisoning

| Attribute               | Value                                                          |
| ----------------------- | -------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0010.001 - Supply Chain Compromise: AI Software           |
| **Description**         | Attacker compromises popular skill and pushes malicious update |
| **Attack Vector**       | Account compromise, social engineering of skill owner          |
| **Affected Components** | ClawHub versioning, auto-update flows                          |
| **Current Mitigations** | Version fingerprinting                                         |
| **Residual Risk**       | High - Auto-updates may pull malicious versions                |
| **Recommendations**     | Implement update signing, rollback capability, version pinning |

#### T-PERSIST-003: Agent Configuration Tampering

| Attribute               | Value                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0010.002 - Supply Chain Compromise: Data                                                                   |
| **Description**         | Attacker modifies agent configuration to persist access                                                         |
| **Attack Vector**       | Config file modification, settings injection                                                                    |
| **Affected Components** | Agent config, tool policies                                                                                     |
| **Current Mitigations** | File permissions                                                                                                |
| **Residual Risk**       | Moyen - Nécessite un accès local                                                                                |
| **Recommandations**     | Vérification de l'intégrité de la configuration, journalisation d'audit pour les modifications de configuration |

---

### 3.5 Évasion des défenses (AML.TA0007)

#### T-EVADE-001 : Contournement des modèles de modération

| Attribut                   | Valeur                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0043 - Créer des données adverses                                                    |
| **Description**            | L'attaquant conçoit le contenu de la compétence pour contourner les modèles de modération |
| **Vecteur d'attaque**      | Homoglyphes Unicode, astuces d'encodage, chargement dynamique                             |
| **Composants affectés**    | ClawHub moderation.ts                                                                     |
| **Atténuations actuelles** | Règles FLAG basées sur des modèles                                                        |
| **Risque résiduel**        | Élevé - Les expressions régulières simples sont facilement contournables                  |
| **Recommandations**        | Ajouter une analyse comportementale (VirusTotal Code Insight), détection basée sur l'AST  |

#### T-EVADE-002 : Échappement de l'enveloppe de contenu

| Attribut                   | Valeur                                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0043 - Créer des données adverses                                      |
| **Description**            | L'attaquant conçoit du contenu qui échappe au contexte de l'enveloppe XML   |
| **Vecteur d'attaque**      | Manipulation de balises, confusion de contexte, remplacement d'instructions |
| **Composants affectés**    | Enveloppement de contenu externe                                            |
| **Atténuations actuelles** | Balises XML + avis de sécurité                                              |
| **Risque résiduel**        | Moyen - De nouvelles méthodes d'échappement sont découvertes régulièrement  |
| **Recommandations**        | Plusieurs couches d'enveloppe, validation côté sortie                       |

---

### 3.6 Découverte (AML.TA0008)

#### T-DISC-001 : Énumération des outils

| Attribut                   | Valeur                                                     |
| -------------------------- | ---------------------------------------------------------- |
| **ID ATLAS**               | AML.T0040 - Accès à l'API d'inférence de modèle IA         |
| **Description**            | L'attaquant énumère les outils disponibles via des invites |
| **Vecteur d'attaque**      | Requêtes de style « Quels outils avez-vous ? »             |
| **Composants affectés**    | Registre des outils de l'agent                             |
| **Atténuations actuelles** | Aucune spécifique                                          |
| **Risque résiduel**        | Faible - Les outils sont généralement documentés           |
| **Recommandations**        | Envisager des contrôles de visibilité des outils           |

#### T-DISC-002 : Extraction de données de session

| Attribut                   | Valeur                                                                  |
| -------------------------- | ----------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0040 - Accès à l'API d'inférence de modèle IA                      |
| **Description**            | L'attaquant extrait des données sensibles du contexte de session        |
| **Vecteur d'attaque**      | Requêtes de style « De quoi avons-nous discuté ? », sondage du contexte |
| **Composants affectés**    | Transcriptions de session, fenêtre contextuelle                         |
| **Atténuations actuelles** | Isolation de session par expéditeur                                     |
| **Risque résiduel**        | Moyen - Les données intra-session sont accessibles                      |
| **Recommandations**        | Implémenter la rédaction de données sensibles dans le contexte          |

---

### 3.7 Collecte et exfiltration (AML.TA0009, AML.TA0010)

#### T-EXFIL-001 : Vol de données via web_fetch

| Attribut                | Value                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0009 - Collection                                                 |
| **Description**         | Attacker exfiltrates data by instructing agent to send to external URL |
| **Attack Vector**       | Prompt injection causing agent to POST data to attacker server         |
| **Affected Components** | web_fetch tool                                                         |
| **Current Mitigations** | SSRF blocking for internal networks                                    |
| **Residual Risk**       | High - External URLs permitted                                         |
| **Recommendations**     | Implement URL allowlisting, data classification awareness              |

#### T-EXFIL-002: Unauthorized Message Sending

| Attribute               | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0009 - Collection                                           |
| **Description**         | Attacker causes agent to send messages containing sensitive data |
| **Attack Vector**       | Prompt injection causing agent to message attacker               |
| **Affected Components** | Message tool, channel integrations                               |
| **Current Mitigations** | Outbound messaging gating                                        |
| **Residual Risk**       | Medium - Gating may be bypassed                                  |
| **Recommendations**     | Require explicit confirmation for new recipients                 |

#### T-EXFIL-003: Credential Harvesting

| Attribute               | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| **ATLAS ID**            | AML.T0009 - Collection                                  |
| **Description**         | Malicious skill harvests credentials from agent context |
| **Attack Vector**       | Skill code reads environment variables, config files    |
| **Affected Components** | Skill execution environment                             |
| **Current Mitigations** | None specific to skills                                 |
| **Residual Risk**       | Critical - Skills run with agent privileges             |
| **Recommendations**     | Skill sandboxing, credential isolation                  |

---

### 3.8 Impact (AML.TA0011)

#### T-IMPACT-001: Unauthorized Command Execution

| Attribute               | Value                                               |
| ----------------------- | --------------------------------------------------- |
| **ATLAS ID**            | AML.T0031 - Erode AI Model Integrity                |
| **Description**         | Attacker executes arbitrary commands on user system |
| **Attack Vector**       | Prompt injection combined with exec approval bypass |
| **Affected Components** | Bash tool, command execution                        |
| **Current Mitigations** | Exec approvals, Docker sandbox option               |
| **Residual Risk**       | Critical - Host execution without sandbox           |
| **Recommendations**     | Default to sandbox, improve approval UX             |

#### T-IMPACT-002: Resource Exhaustion (DoS)

| Attribute                           | Value                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------- |
| **ATLAS ID**                        | AML.T0031 - Erode AI Model Integrity                                      |
| **Description**                     | Attacker exhausts API credits or compute resources                        |
| **Attack Vector**                   | Automated message flooding, expensive tool calls                          |
| **Affected Components**             | Gateway, sessions d'agent, fournisseur API                                |
| **Mesures d'atténuation actuelles** | Aucune                                                                    |
| **Risque résiduel**                 | Élevé - Aucune limitation de débit                                        |
| **Recommandations**                 | Mettre en œuvre des limites de débit par expéditeur, des budgets de coûts |

#### T-IMPACT-003 : Atteinte à la réputation

| Attribut                            | Valeur                                                            |
| ----------------------------------- | ----------------------------------------------------------------- |
| **ID ATLAS**                        | AML.T0031 - Éroder l'intégrité du modèle d'IA                     |
| **Description**                     | L'attaquant amène l'agent à envoyer du contenu nuisible/offensant |
| **Vecteur d'attaque**               | Injection de prompt provoquant des réponses inappropriées         |
| **Composants affectés**             | Génération de sortie, messagerie du channel                       |
| **Mesures d'atténuation actuelles** | Politiques de contenu du fournisseur LLM                          |
| **Risque résiduel**                 | Moyen - Filtres du fournisseur imparfaits                         |
| **Recommandations**                 | Couche de filtrage de sortie, contrôles utilisateur               |

---

## 4. Analyse de la chaîne d'approvisionnement ClawHub

### 4.1 Contrôles de sécurité actuels

| Contrôle                                  | Mise en œuvre                 | Efficacité                                                                     |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| Ancienneté du compte GitHub               | `requireGitHubAccountAge()`   | Moyen - Augmente la barrière pour les nouveaux attaquants                      |
| Nettoyage des chemins (Path Sanitization) | `sanitizePath()`              | Élevé - Empêche le parcours de chemins (path traversal)                        |
| Validation du type de fichier             | `isTextFile()`                | Moyen - Uniquement des fichiers texte, mais peuvent toujours être malveillants |
| Limites de taille                         | 50 Mo pour l'ensemble total   | Élevé - Empêche l'épuisement des ressources                                    |
| SKILL.md obligatoire                      | Readme obligatoire            | Valeur de sécurité faible - Informationnel uniquement                          |
| Modération des modèles                    | FLAG_RULES dans moderation.ts | Faible - Facilement contourné                                                  |
| Statut de modération                      | champ `moderationStatus`      | Moyen - Revue manuelle possible                                                |

### 4.2 Modèles de signalement de modération

Modèles actuels dans `moderation.ts` :

```javascript
// Known-bad identifiers
/(keepcold131\/ClawdAuthenticatorTool|ClawdAuthenticatorTool)/i

// Suspicious keywords
/(malware|stealer|phish|phishing|keylogger)/i
/(api[-_ ]?key|token|password|private key|secret)/i
/(wallet|seed phrase|mnemonic|crypto)/i
/(discord\.gg|webhook|hooks\.slack)/i
/(curl[^\n]+\|\s*(sh|bash))/i
/(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd)/i
```

**Limitations :**

- Vérifie uniquement le slug, displayName, summary, frontmatter, metadata, chemins de fichiers
- N'analyse pas le contenu réel du code de la compétence
- Regex simple facilement contournable par obfuscation
- Aucune analyse comportementale

### 4.3 Améliorations prévues

| Amélioration              | Statut                                   | Impact                                                               |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Intégration VirusTotal    | En cours                                 | Élevé - Analyse comportementale Code Insight                         |
| Signalement communautaire | Partiel (la table `skillReports` existe) | Moyen                                                                |
| Journalisation d'audit    | Partiel (la table `auditLogs` existe)    | Moyen                                                                |
| Système de badges         | Implémenté                               | Moyen - `highlighted`, `official`, `deprecated`, `redactionApproved` |

---

## 5. Matrix des risques

### 5.1 Probabilité vs Impact

| ID de menace  | Probabilité | Impact   | Niveau de risque | Priorité |
| ------------- | ----------- | -------- | ---------------- | -------- |
| T-EXEC-001    | Élevé       | Critique | **Critique**     | P0       |
| T-PERSIST-001 | Élevé       | Critique | **Critique**     | P0       |
| T-EXFIL-003   | Moyen       | Critique | **Critique**     | P0       |
| T-IMPACT-001  | Moyen       | Critique | **Élevé**        | P1       |
| T-EXEC-002    | Élevé       | Élevé    | **Élevé**        | P1       |
| T-EXEC-004    | Moyen       | Élevé    | **Élevé**        | P1       |
| T-ACCESS-003  | Moyen       | Élevé    | **Élevé**        | P1       |
| T-EXFIL-001   | Moyen       | Élevé    | **Élevé**        | P1       |
| T-IMPACT-002  | Élevé       | Moyen    | **Élevé**        | P1       |
| T-EVADE-001   | Élevé       | Moyen    | **Moyen**        | P2       |
| T-ACCESS-001  | Faible      | Élevé    | **Moyen**        | P2       |
| T-ACCESS-002  | Faible      | Élevé    | **Moyen**        | P2       |
| T-PERSIST-002 | Faible      | Élevé    | **Moyen**        | P2       |

### 5.2 Chaînes d'attaque de chemin critique

**Chaîne d'attaque 1 : Vol de données basé sur les compétences**

```
T-PERSIST-001 → T-EVADE-001 → T-EXFIL-003
(Publish malicious skill) → (Evade moderation) → (Harvest credentials)
```

**Chaîne d'attaque 2 : Injection par prompt vers RCE**

```
T-EXEC-001 → T-EXEC-004 → T-IMPACT-001
(Inject prompt) → (Bypass exec approval) → (Execute commands)
```

**Chaîne d'attaque 3 : Injection indirecte via le contenu récupéré**

```
T-EXEC-002 → T-EXFIL-001 → External exfiltration
(Poison URL content) → (Agent fetches & follows instructions) → (Data sent to attacker)
```

---

## 6. Résumé des recommandations

### 6.1 Immédiat (P0)

| ID    | Recommandation                                              | Traite                     |
| ----- | ----------------------------------------------------------- | -------------------------- |
| R-001 | Finaliser l'intégration de VirusTotal                       | T-PERSIST-001, T-EVADE-001 |
| R-002 | Implémenter le sandboxing des compétences                   | T-PERSIST-001, T-EXFIL-003 |
| R-003 | Ajouter une validation de sortie pour les actions sensibles | T-EXEC-001, T-EXEC-002     |

### 6.2 Court terme (P1)

| ID    | Recommandation                                     | Traite       |
| ----- | -------------------------------------------------- | ------------ |
| R-004 | Implémenter la limitation de débit                 | T-IMPACT-002 |
| R-005 | Ajouter le chiffrement des jetons au repos         | T-ACCESS-003 |
| R-006 | Améliorer l'UX et la validation d'approbation exec | T-EXEC-004   |
| R-007 | Implémenter la liste blanche d'URL pour web_fetch  | T-EXFIL-001  |

### 6.3 Moyen terme (P2)

| ID    | Recommandation                                                              | Traite        |
| ----- | --------------------------------------------------------------------------- | ------------- |
| R-008 | Ajouter une vérification cryptographique du canal lorsque cela est possible | T-ACCESS-002  |
| R-009 | Implémenter la vérification de l'intégrité de la configuration              | T-PERSIST-003 |
| R-010 | Ajouter la signature des mises à jour et l'épinglage des versions           | T-PERSIST-002 |

---

## 7. Annexes

### 7.1 Correspondance des techniques ATLAS

| ID ATLAS      | Nom de la technique             | OpenClaw Threats                                                 |
| ------------- | ------------------------------- | ---------------------------------------------------------------- |
| AML.T0006     | Active Scanning                 | T-RECON-001, T-RECON-002                                         |
| AML.T0009     | Collection                      | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | Supply Chain: AI Software       | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | Supply Chain: Data              | T-PERSIST-003                                                    |
| AML.T0031     | Erode AI Model Integrity        | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | AI Model Inference API Access   | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | Craft Adversarial Data          | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | LLM Prompt Injection : Direct   | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | LLM Prompt Injection : Indirect | T-EXEC-002                                                       |

### 7.2 Fichiers de sécurité clés

| Chemin                              | Objectif                             | Niveau de risque |
| ----------------------------------- | ------------------------------------ | ---------------- |
| `src/infra/exec-approvals.ts`       | Logique d'approbation des commandes  | **Critique**     |
| `src/gateway/auth.ts`               | Authentification Gateway             | **Critique**     |
| `src/web/inbound/access-control.ts` | Contrôle d'accès au canal            | **Critique**     |
| `src/infra/net/ssrf.ts`             | Protection SSRF                      | **Critique**     |
| `src/security/external-content.ts`  | Atténuation de l'injection de prompt | **Critique**     |
| `src/agents/sandbox/tool-policy.ts` | Application de la politique d'outil  | **Critique**     |
| `convex/lib/moderation.ts`          | Modération ClawHub                   | **Élevé**        |
| `convex/lib/skillPublish.ts`        | Flux de publication de compétences   | **Élevé**        |
| `src/routing/resolve-route.ts`      | Isolement de session                 | **Moyen**        |

### 7.3 Glossaire

| Terme                | Définition                                                             |
| -------------------- | ---------------------------------------------------------------------- |
| **ATLAS**            | Paysage de menaces adverses de MITRE pour les systèmes d'IA            |
| **ClawHub**          | Place de marché des compétences de OpenClaw                            |
| **Gateway**          | Couche de routage de messages et d'authentification de OpenClaw        |
| **MCP**              | Model Context Protocol - interface du fournisseur d'outils             |
| **Prompt Injection** | Attaque où des instructions malveillantes sont intégrées dans l'entrée |
| **Skill**            | Extension téléchargeable pour les agents OpenClaw                      |
| **SSRF**             | Server-Side Request Forgery                                            |

---

_Ce modèle de menace est un document vivant. Signalez les problèmes de sécurité à security@openclaw.ai_

import fr from "/components/footer/fr.mdx";

<fr />
