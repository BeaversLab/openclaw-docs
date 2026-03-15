# OpenClaw Modèle de Menace v1.0

## Cadre MITRE ATLAS

**Version :** 1.0-brouillon
**Dernière mise à jour :** 2026-02-04
**Méthodologie :** MITRE ATLAS + Diagrammes de flux de données
**Cadre :** [MITRE ATLAS](https://atlas.mitre.org/) (Paysage des menaces adverses pour les systèmes d'IA)

### Attribution du cadre

Ce modèle de menace est basé sur [MITRE ATLAS](https://atlas.mitre.org/), le cadre standard de l'industrie pour documenter les menaces adverses contre les systèmes d'IA/ML. ATLAS est maintenu par [MITRE](https://www.mitre.org/) en collaboration avec la communauté de sécurité de l'IA.

**Ressources clés ATLAS :**

- [Techniques ATLAS](https://atlas.mitre.org/techniques/)
- [Tactiques ATLAS](https://atlas.mitre.org/tactics/)
- [Études de cas ATLAS](https://atlas.mitre.org/studies/)
- [ATLAS GitHub](https://github.com/mitre-atlas/atlas-data)
- [Contribuer à ATLAS](https://atlas.mitre.org/resources/contribute)

### Contribuer à ce modèle de menace

Il s'agit d'un document vivant maintenu par la communauté OpenClaw. Consultez [CONTRIBUTING-THREAT-MODEL.md](/fr/security/CONTRIBUTING-THREAT-MODEL) pour les directives sur la contribution :

- Signalement de nouvelles menaces
- Mise à jour des menaces existantes
- Proposition de chaînes d'attaque
- Suggestions d'atténuations

---

## 1. Introduction

### 1.1 Objectif

Ce modèle de menace documente les menaces adverses pour la plateforme d'agent IA OpenClaw et la place de marché de compétences ClawHub, en utilisant le cadre MITRE ATLAS conçu spécifiquement pour les systèmes d'IA/ML.

### 1.2 Portée

| Composant                   | Inclus  | Notes                                                      |
| --------------------------- | ------- | ---------------------------------------------------------- |
| Runtime de l'agent OpenClaw | Oui     | Exécution principale de l'agent, appels d'outils, sessions |
| Gateway                     | Oui     | Authentification, routage, intégration de canaux           |
| Intégrations de canaux      | Oui     | WhatsApp, Telegram, Discord, Signal, Slack, etc.           |
| Place de marché ClawHub     | Oui     | Publication de compétences, modération, distribution       |
| Serveurs MCP                | Oui     | Fournisseurs d'outils externes                             |
| Appareils utilisateur       | Partiel | Applications mobiles, clients de bureau                    |

### 1.3 Hors portée

Rien n'est explicitement hors de portée pour ce modèle de menace.

---

## 2. Architecture du système

### 2.1 Limites de confiance

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

### 2.2 Flux de données

| Flux | Source  | Destination | Données              | Protection                |
| ---- | ------- | ----------- | -------------------- | ------------------------- |
| F1   | Canal   | Gateway     | Messages utilisateur | TLS, AllowFrom            |
| F2   | Gateway | Agent       | Messages acheminés   | Isolement de session      |
| F3   | Agent   | Outils      | Appels d'outils      | Application de stratégies |
| F4   | Agent   | Externe     | requêtes web_fetch   | Blocage SSRF              |
| F5   | ClawHub | Agent       | Code de compétence   | Modération, analyse       |
| F6   | Agent   | Channel     | Réponses             | Filtrage de sortie        |

---

## 3. Analyse des menaces par tactique ATLAS

### 3.1 Reconnaissance (AML.TA0002)

#### T-RECON-001 : Découverte de point de terminaison de l'agent

| Attribut                   | Valeur                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0006 - Analyse active                                                                                      |
| **Description**            | L'attaquant analyse les points de terminaison de passerelle OpenClaw exposés                                    |
| **Vecteur d'attaque**      | Analyse réseau, requêtes Shodan, énumération DNS                                                                |
| **Composants affectés**    | Gateway, points de terminaison API exposés                                                                      |
| **Atténuations actuelles** | Option d'authentification Tailscale, liaison à loopback par défaut                                              |
| **Risque résiduel**        | Moyen - Passerelles publiques détectables                                                                       |
| **Recommandations**        | Documenter le déploiement sécurisé, ajouter une limitation de débit sur les points de terminaison de découverte |

#### T-RECON-002 : Sonde d'intégration de canal

| Attribut                   | Valeur                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0006 - Analyse active                                                            |
| **Description**            | L'attaquant sonde les canaux de messagerie pour identifier les comptes gérés par l'IA |
| **Vecteur d'attaque**      | Envoi de messages de test, observation des modèles de réponse                         |
| **Composants affectés**    | Toutes les intégrations de canal                                                      |
| **Atténuations actuelles** | Aucune spécifique                                                                     |
| **Risque résiduel**        | Faible - Valeur limitée par la seule découverte                                       |
| **Recommandations**        | Envisager une randomisation du temps de réponse                                       |

---

### 3.2 Accès initial (AML.TA0004)

#### T-ACCESS-001 : Interception de code d'appariement

| Attribut                   | Valeur                                                                           |
| -------------------------- | -------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0040 - Accès à l'API d'inférence de modèle IA                               |
| **Description**            | L'attaquant intercepte le code d'appariement pendant la période de grâce de 30 s |
| **Vecteur d'attaque**      | Shoulder surfing, reniflage de réseau, ingénierie sociale                        |
| **Composants affectés**    | Système d'appareillage des appareils                                             |
| **Atténuations actuelles** | Expiration de 30 s, codes envoyés via le canal existant                          |
| **Risque résiduel**        | Moyen - Période de grâce exploitable                                             |
| **Recommandations**        | Réduire la période de grâce, ajouter une étape de confirmation                   |

#### T-ACCESS-002 : Usurpation AllowFrom

| Attribut                   | Valeur                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0040 - Accès à l'API d'inférence de modèle IA                                                       |
| **Description**            | L'attaquant usurpe l'identité de l'expéditeur autorisé dans le canal                                     |
| **Vecteur d'attaque**      | Dépend du channel - usurpation de numéro de téléphone, impersonnation de nom d'utilisateur               |
| **Composants affectés**    | Validation AllowFrom par channel                                                                         |
| **Atténuations actuelles** | Vérification d'identité spécifique au channel                                                            |
| **Risque résiduel**        | Moyen - Certains channels vulnérables à l'usurpation                                                     |
| **Recommandations**        | Documenter les risques spécifiques au channel, ajouter une vérification cryptographique lorsque possible |

#### T-ACCESS-003 : Vol de jeton

| Attribut                   | Valeur                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0040 - Accès à l'API d'inférence de modèle IA                                                       |
| **Description**            | L'attaquant vole des jetons d'authentification à partir des fichiers de configuration                    |
| **Vecteur d'attaque**      | Logiciels malveillants, accès non autorisé à l'appareil, exposition de la sauvegarde de la configuration |
| **Composants affectés**    | ~/.openclaw/credentials/, stockage de configuration                                                      |
| **Atténuations actuelles** | Autorisations de fichiers                                                                                |
| **Risque résiduel**        | Élevé - Jetons stockés en texte clair                                                                    |
| **Recommandations**        | Mettre en œuvre le chiffrement des jetons au repos, ajouter la rotation des jetons                       |

---

### 3.3 Exécution (AML.TA0005)

#### T-EXEC-001 : Injection directe de prompt

| Attribut                   | Valeur                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0051.000 - Injection de prompt LLM : Directe                                                                                |
| **Description**            | L'attaquant envoie des prompts conçus pour manipuler le comportement de l'agent                                                  |
| **Vecteur d'attaque**      | Messages du channel contenant des instructions contradictoires                                                                   |
| **Composants affectés**    | LLM de l'agent, toutes les surfaces d'entrée                                                                                     |
| **Atténuations actuelles** | Détection de motifs, encapsulation du contenu externe                                                                            |
| **Risque résiduel**        | Critique - Détection uniquement, pas de blocage ; les attaques sophistiquées contournent                                         |
| **Recommandations**        | Mettre en œuvre une défense multicouche, la validation de la sortie, la confirmation de l'utilisateur pour les actions sensibles |

#### T-EXEC-002 : Injection indirecte de prompt

| Attribut                   | Valeur                                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0051.001 - Injection de prompt LLM : Indirecte                         |
| **Description**            | L'attaquant intègre des instructions malveillantes dans le contenu récupéré |
| **Vecteur d'attaque**      | URL malveillantes, e-mails empoisonnés, webhooks compromis                  |
| **Composants affectés**    | web_fetch, ingestion d'e-mails, sources de données externes                 |
| **Atténuations actuelles** | Encapsulation du contenu avec des balises XML et un avis de sécurité        |
| **Risque résiduel**        | Élevé - Le LLM peut ignorer les instructions d'encapsulation                |
| **Recommandations**        | Implémenter la désinfection du contenu, des contextes d'exécution séparés   |

#### T-EXEC-003 : Injection d'arguments d'outil

| Attribut                   | Valeur                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------ |
| **ID ATLAS**               | AML.T0051.000 - LLM Prompt Injection : Direct                                        |
| **Description**            | L'attaquant manipule les arguments de l'outil par le biais d'une injection de prompt |
| **Vecteur d'attaque**      | Prompts conçus qui influencent les valeurs des paramètres de l'outil                 |
| **Composants affectés**    | Tous les appels d'outils                                                             |
| **Atténuations actuelles** | Approbations d'exécution pour les commandes dangereuses                              |
| **Risque résiduel**        | Élevé - Dépend du jugement de l'utilisateur                                          |
| **Recommandations**        | Implémenter la validation des arguments, les appels d'outils paramétrés              |

#### T-EXEC-004 : Contournement de l'approbation d'exécution

| Attribut                   | Valeur                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0043 - Créer des données adverses                                                  |
| **Description**            | L'attaquant conçoit des commandes qui contournent la liste d'autorisation d'approbation |
| **Vecteur d'attaque**      | Obscurcissement de commandes, exploitation d'alias, manipulation de chemin              |
| **Composants affectés**    | exec-approvals.ts, liste d'autorisation de commandes                                    |
| **Atténuations actuelles** | Liste d'autorisation + mode demander                                                    |
| **Risque résiduel**        | Élevé - Aucune désinfection des commandes                                               |
| **Recommandations**        | Implémenter la normalisation des commandes, étendre la liste de blocage                 |

---

### 3.4 Persistance (AML.TA0006)

#### T-PERSIST-001 : Installation de compétence malveillante

| Attribut                   | Valeur                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0010.001 - Compromission de la chaîne d'approvisionnement : Logiciel IA            |
| **Description**            | L'attaquant publie une compétence malveillante sur ClawHub                              |
| **Vecteur d'attaque**      | Créer un compte, publier une compétence avec du code malveillant caché                  |
| **Composants affectés**    | ClawHub, chargement des compétences, exécution de l'agent                               |
| **Atténuations actuelles** | Vérification de l'âge du compte GitHub, indicateurs de modération basés sur des modèles |
| **Risque résiduel**        | Critique - Aucune isolation, examen limité                                              |
| **Recommandations**        | Intégration VirusTotal (en cours), isolation des compétences, examen communautaire      |

#### T-PERSIST-002 : Empoisonnement de mise à jour de compétence

| Attribut                   | Valeur                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0010.001 - Compromission de la chaîne d'approvisionnement : Logiciel IA                            |
| **Description**            | L'attaquant compromet une compétence populaire et pousse une mise à jour malveillante                   |
| **Vecteur d'attaque**      | Compromission du compte, ingénierie sociale du propriétaire de la compétence                            |
| **Composants affectés**    | Versionnage ClawHub, flux de mise à jour automatique                                                    |
| **Atténuations actuelles** | Fingerprinting de version                                                                               |
| **Risque résiduel**        | Élevé - Les mises à jour automatiques peuvent récupérer des versions malveillantes                      |
| **Recommandations**        | Mettre en œuvre la signature des mises à jour, la capacité de retour en arrière, l'épinglage de version |

#### T-PERSIST-003 : Altération de la configuration de l'agent

| Attribut                   | Valeur                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0010.002 - Compromission de la chaîne d'approvisionnement : Données                                        |
| **Description**            | L'attaquant modifie la configuration de l'agent pour maintenir l'accès                                          |
| **Vecteur d'attaque**      | Modification du fichier de configuration, injection de paramètres                                               |
| **Composants affectés**    | Configuration de l'agent, stratégies d'outil                                                                    |
| **Atténuations actuelles** | Autorisations de fichiers                                                                                       |
| **Risque résiduel**        | Moyen - Nécessite un accès local                                                                                |
| **Recommandations**        | Vérification de l'intégrité de la configuration, journalisation d'audit pour les modifications de configuration |

---

### 3.5 Évasion des défenses (AML.TA0007)

#### T-EVADE-001 : Contournement des modèles de modération

| Attribut                   | Valeur                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0043 - Concevoir des données adverses                                               |
| **Description**            | L'attaquant fabrique du contenu de compétence pour éviter les modèles de modération      |
| **Vecteur d'attaque**      | Homoglyphes Unicode, astuces d'encodage, chargement dynamique                            |
| **Composants affectés**    | ClawHub moderation.ts                                                                    |
| **Atténuations actuelles** | FLAG_RULES basés sur des modèles                                                         |
| **Risque résiduel**        | Élevé - Les regex simples sont facilement contournables                                  |
| **Recommandations**        | Ajouter une analyse comportementale (VirusTotal Code Insight), détection basée sur l'AST |

#### T-EVADE-002 : Échappement du wrapper de contenu

| Attribut                   | Valeur                                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0043 - Concevoir des données adverses                                  |
| **Description**            | L'attaquant fabrique du contenu qui échappe au contexte du wrapper XML      |
| **Vecteur d'attaque**      | Manipulation de balises, confusion de contexte, remplacement d'instructions |
| **Composants affectés**    | Enveloppement de contenu externe                                            |
| **Atténuations actuelles** | Balises XML + avis de sécurité                                              |
| **Risque résiduel**        | Moyen - De nouvelles échappatoires sont découvertes régulièrement           |
| **Recommandations**        | Plusieurs couches de wrapper, validation côté sortie                        |

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
| **Risque résiduel**        | Faible - Outils généralement documentés                    |
| **Recommandations**        | Envisager des contrôles de visibilité des outils           |

#### T-DISC-002 : Extraction de données de session

| Attribut                   | Valeur                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0040 - Accès API d'inférence de modèle IA                      |
| **Description**            | L'attaquant extrait des données sensibles du contexte de la session |
| **Vecteur d'attaque**      | Requêtes « Qu'avons-nous discuté ? », sondage du contexte           |
| **Composants affectés**    | Transcriptions de session, fenêtre de contexte                      |
| **Atténuations actuelles** | Isolation de session par expéditeur                                 |
| **Risque résiduel**        | Moyen - Données intra-session accessibles                           |
| **Recommandations**        | Mettre en œuvre la rédaction de données sensibles dans le contexte  |

---

### 3.7 Collecte et exfiltration (AML.TA0009, AML.TA0010)

#### T-EXFIL-001 : Vol de données via web_fetch

| Attribut                   | Valeur                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0009 - Collecte                                                                                  |
| **Description**            | L'attaquant exfiltre des données en demandant à l'agent de les envoyer vers une URL externe           |
| **Vecteur d'attaque**      | Injection de prompt provoquant l'envoi de données par l'agent via POST vers le serveur de l'attaquant |
| **Composants affectés**    | Outil web_fetch                                                                                       |
| **Atténuations actuelles** | Blocage SSRF pour les réseaux internes                                                                |
| **Risque résiduel**        | Élevé - URL externes autorisées                                                                       |
| **Recommandations**        | Mettre en œuvre une liste d'autorisation d'URL, une sensibilité à la classification des données       |

#### T-EXFIL-002 : Envoi non autorisé de messages

| Attribut                   | Valeur                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------ |
| **ID ATLAS**               | AML.T0009 - Collecte                                                                 |
| **Description**            | L'attaquant provoque l'envoi de messages contenant des données sensibles par l'agent |
| **Vecteur d'attaque**      | Injection de prompt provoquant l'envoi d'un message par l'agent à l'attaquant        |
| **Composants affectés**    | Outil de message, intégrations de channel                                            |
| **Atténuations actuelles** | Filtrage des messages sortants                                                       |
| **Risque résiduel**        | Moyen - Le filtrage peut être contourné                                              |
| **Recommandations**        | Exiger une confirmation explicite pour les nouveaux destinataires                    |

#### T-EXFIL-003 : Récolte d'identifiants

| Attribut                   | Valeur                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0009 - Collecte                                                                      |
| **Description**            | Une compétence malveillante récolte des identifiants à partir du contexte de l'agent      |
| **Vecteur d'attaque**      | Le code de la compétence lit les variables d'environnement, les fichiers de configuration |
| **Composants affectés**    | Environnement d'exécution des compétences                                                 |
| **Atténuations actuelles** | Aucune spécifique aux Skills                                                              |
| **Risque résiduel**        | Critique - Les Skills s'exécutent avec des privilèges d'agent                             |
| **Recommandations**        | Bac à sable (sandboxing) des Skills, isolement des identifiants                           |

---

### 3.8 Impact (AML.TA0011)

#### T-IMPACT-001 : Exécution de commandes non autorisée

| Attribut                   | Valeur                                                                        |
| -------------------------- | ----------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0031 - Éroder l'intégrité du modèle d'IA                                 |
| **Description**            | L'attaquant exécute des commandes arbitraires sur le système de l'utilisateur |
| **Vecteur d'attaque**      | Injection de prompt combinée au contournement de l'approbation d'exécution    |
| **Composants affectés**    | Outil Bash, exécution de commandes                                            |
| **Atténuations actuelles** | Approbations d'exécution, option de bac à sable Docker                        |
| **Risque résiduel**        | Critique - Exécution sur l'hôte sans bac à sable                              |
| **Recommandations**        | Bac à sable par défaut, améliorer l'UX des approbations                       |

#### T-IMPACT-002 : Épuisement des ressources (DoS)

| Attribut                   | Valeur                                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0031 - Éroder l'intégrité du modèle d'IA                             |
| **Description**            | L'attaquant épuise les crédits API ou les ressources de calcul            |
| **Vecteur d'attaque**      | Inondation automatisée de messages, appels d'outils coûteux               |
| **Composants affectés**    | Gateway, sessions d'agent, provider API                                   |
| **Atténuations actuelles** | Aucune                                                                    |
| **Risque résiduel**        | Élevé - Aucune limitation de débit                                        |
| **Recommandations**        | Mettre en œuvre des limites de débit par expéditeur, des budgets de coûts |

#### T-IMPACT-003 : Dommages à la réputation

| Attribut                   | Valeur                                                            |
| -------------------------- | ----------------------------------------------------------------- |
| **ID ATLAS**               | AML.T0031 - Éroder l'intégrité du modèle d'IA                     |
| **Description**            | L'attaquant amène l'agent à envoyer du contenu nuisible/offensant |
| **Vecteur d'attaque**      | Injection de prompt provoquant des réponses inappropriées         |
| **Composants affectés**    | Génération de sortie, messagerie channel                          |
| **Atténuations actuelles** | Politiques de contenu du provider LLM                             |
| **Risque résiduel**        | Moyen - Les filtres du provider ne sont parfaits                  |
| **Recommandations**        | Couche de filtrage de sortie, contrôles utilisateur               |

---

## 4. Analyse de la chaîne d'approvisionnement ClawHub

### 4.1 Contrôles de sécurité actuels

| Contrôle                                  | Mise en œuvre                 | Efficacité                                                                     |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| Âge du compte GitHub                      | `requireGitHubAccountAge()`   | Moyen - Augmente la barrière pour les nouveaux attaquants                      |
| Nettoyage des chemins (Path Sanitization) | `sanitizePath()`              | Élevé - Empêche le traversée de répertoires                                    |
| Validation du type de fichier             | `isTextFile()`                | Moyen - Uniquement les fichiers texte, mais peuvent toujours être malveillants |
| Limites de taille                         | 50Mo au total pour le bundle  | Élevé - Empêche l'épuisement des ressources                                    |
| SKILL.md requis                           | Readme obligatoire            | Valeur de sécurité faible - Uniquement informatif                              |
| Modération des modèles                    | FLAG_RULES dans moderation.ts | Faible - Facilement contourné                                                  |
| Statut de modération                      | champ `moderationStatus`      | Moyen - Révision manuelle possible                                             |

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

- Vérifie uniquement slug, displayName, summary, frontmatter, metadata, chemins de fichiers
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

### 5.2 Chaînes d'attaque sur le chemin critique

**Chaîne d'attaque 1 : Vol de données basé sur les compétences**

```
T-PERSIST-001 → T-EVADE-001 → T-EXFIL-003
(Publish malicious skill) → (Evade moderation) → (Harvest credentials)
```

**Chaîne d'attaque 2 : Injection de prompt vers RCE**

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
| R-001 | Compléter l'intégration VirusTotal                          | T-PERSIST-001, T-EVADE-001 |
| R-002 | Implémenter le sandboxing des compétences                   | T-PERSIST-001, T-EXFIL-003 |
| R-003 | Ajouter une validation de sortie pour les actions sensibles | T-EXEC-001, T-EXEC-002     |

### 6.2 Court terme (P1)

| ID    | Recommandation                                               | Traite       |
| ----- | ------------------------------------------------------------ | ------------ |
| R-004 | Implémenter la limitation du débit                           | T-IMPACT-002 |
| R-005 | Ajouter le chiffrement des jetons au repos                   | T-ACCESS-003 |
| R-006 | Améliorer l'UX et la validation de l'approbation d'exécution | T-EXEC-004   |
| R-007 | Implémenter la liste d'autorisation des URL pour web_fetch   | T-EXFIL-001  |

### 6.3 Moyen terme (P2)

| ID    | Recommandation                                                             | Traite        |
| ----- | -------------------------------------------------------------------------- | ------------- |
| R-008 | Ajouter la vérification cryptographique du canal lorsque cela est possible | T-ACCESS-002  |
| R-009 | Implémenter la vérification de l'intégrité de la configuration             | T-PERSIST-003 |
| R-010 | Ajouter la signature des mises à jour et l'épinglage des versions          | T-PERSIST-002 |

---

## 7. Annexes

### 7.1 Correspondance des techniques ATLAS

| ID ATLAS      | Nom de la technique                      | OpenClaw Threats                                                 |
| ------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| AML.T0006     | Analyse active                           | T-RECON-001, T-RECON-002                                         |
| AML.T0009     | Collecte                                 | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | Chaîne d'approvisionnement : Logiciel IA | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | Chaîne d'approvisionnement : Données     | T-PERSIST-003                                                    |
| AML.T0031     | Détériorer l'intégrité du modèle d'IA    | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | AI Model Inference API Access            | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | Créer des données adverses               | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | LLM Prompt Injection : Direct            | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | LLM Prompt Injection : Indirect          | T-EXEC-002                                                       |

### 7.2 Fichiers de sécurité clés

| Chemin                              | Objectif                             | Niveau de risque |
| ----------------------------------- | ------------------------------------ | ---------------- |
| `src/infra/exec-approvals.ts`       | Logique d'approbation de commande    | **Critique**     |
| `src/gateway/auth.ts`               | Gateway authentication               | **Critique**     |
| `src/web/inbound/access-control.ts` | Contrôle d'accès au channel          | **Critique**     |
| `src/infra/net/ssrf.ts`             | Protection SSRF                      | **Critique**     |
| `src/security/external-content.ts`  | Atténuation de l'injection de prompt | **Critique**     |
| `src/agents/sandbox/tool-policy.ts` | Application de la stratégie d'outil  | **Critique**     |
| `convex/lib/moderation.ts`          | ClawHub moderation                   | **Élevé**        |
| `convex/lib/skillPublish.ts`        | Flux de publication de compétence    | **Élevé**        |
| `src/routing/resolve-route.ts`      | Isolement de session                 | **Moyen**        |

### 7.3 Glossaire

| Terme                | Définition                                                             |
| -------------------- | ---------------------------------------------------------------------- |
| **ATLAS**            | Paysage des menaces adverses de MITRE pour les systèmes d'IA           |
| **ClawHub**          | Marketplace de compétences de OpenClaw                                 |
| **Gateway**          | Couche de routage de messages et d'authentification de OpenClaw        |
| **MCP**              | Protocole de contexte de modèle - interface de fournisseur d'outils    |
| **Prompt Injection** | Attaque où des instructions malveillantes sont intégrées dans l'entrée |
| **Skill**            | Extension téléchargeable pour les agents OpenClaw                      |
| **SSRF**             | Server-Side Request Forgery                                            |

---

_Ce modèle de menace est un document vivant. Signalez les problèmes de sécurité à security@openclaw.ai_

import fr from '/components/footer/fr.mdx';

<fr />
