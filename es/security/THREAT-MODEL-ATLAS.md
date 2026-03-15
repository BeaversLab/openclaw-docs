# OpenClaw Threat Model v1.0

## MITRE ATLAS Framework

**Version:** 1.0-draft
**Last Updated:** 2026-02-04
**Methodology:** MITRE ATLAS + Data Flow Diagrams
**Framework:** [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems)

### Framework Attribution

Este modelo de amenazas se basa en [MITRE ATLAS](https://atlas.mitre.org/), el marco estándar de la industria para documentar amenazas adversariales a los sistemas de IA/ML. ATLAS es mantenido por [MITRE](https://www.mitre.org/) en colaboración con la comunidad de seguridad de la IA.

**Recursos clave de ATLAS:**

- [Técnicas de ATLAS](https://atlas.mitre.org/techniques/)
- [Tácticas de ATLAS](https://atlas.mitre.org/tactics/)
- [Casos de estudio de ATLAS](https://atlas.mitre.org/studies/)
- [GitHub de ATLAS](https://github.com/mitre-atlas/atlas-data)
- [Contribuir a ATLAS](https://atlas.mitre.org/resources/contribute)

### Contribuir a este modelo de amenazas

Este es un documento vivo mantenido por la comunidad de OpenClaw. Consulte [CONTRIBUTING-THREAT-MODEL.md](/es/security/CONTRIBUTING-THREAT-MODEL) para obtener las pautas sobre cómo contribuir:

- Reportar nuevas amenazas
- Actualizar amenazas existentes
- Proponer cadenas de ataque
- Sugerir mitigaciones

---

## 1. Introducción

### 1.1 Propósito

Este modelo de amenazas documenta las amenazas adversariales para la plataforma de agentes de IA OpenClaw y el mercado de habilidades ClawHub, utilizando el marco MITRE ATLAS diseñado específicamente para sistemas de IA/ML.

### 1.2 Alcance

| Componente               | Incluido | Notas                                                             |
| ------------------------ | -------- | ----------------------------------------------------------------- |
| OpenClaw Agent Runtime   | Sí       | Ejecución principal del agente, llamadas a herramientas, sesiones |
| Gateway                  | Sí       | Autenticación, enrutamiento, integración de canales               |
| Integraciones de canales | Sí       | WhatsApp, Telegram, Discord, Signal, Slack, etc.                  |
| Mercado ClawHub          | Sí       | Publicación de habilidades, moderación, distribución              |
| Servidores MCP           | Sí       | Proveedores de herramientas externas                              |
| Dispositivos de usuario  | Parcial  | Aplicaciones móviles, clientes de escritorio                      |

### 1.3 Fuera del alcance

Nada está explícitamente fuera del alcance para este modelo de amenazas.

---

## 2. Arquitectura del sistema

### 2.1 Límites de confianza

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

### 2.2 Flujos de datos

| Flujo | Origen  | Destino      | Datos                        | Protección              |
| ----- | ------- | ------------ | ---------------------------- | ----------------------- |
| F1    | Canal   | Gateway      | Mensajes de usuario          | TLS, AllowFrom          |
| F2    | Gateway | Agente       | Mensajes enrutados           | Aislamiento de sesión   |
| F3    | Agente  | Herramientas | Invocaciones de herramientas | Aplicación de políticas |
| F4    | Agente  | Externo      | solicitudes web_fetch        | Bloqueo SSRF            |
| F5    | ClawHub | Agente       | Código de habilidad          | Moderación, análisis    |
| F6    | Agente  | Canal        | Respuestas                   | Filtrado de salida      |

---

## 3. Análisis de amenazas por táctica ATLAS

### 3.1 Reconocimiento (AML.TA0002)

#### T-RECON-001: Descubrimiento de endpoints del agente

| Atributo                  | Valor                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0006 - Análisis activo                                                                        |
| **Descripción**           | El atacante analiza en busca de endpoints de puerta de enlace expuestos de OpenClaw                |
| **Vector de ataque**      | Análisis de red, consultas shodan, enumeración DNS                                                 |
| **Componentes afectados** | Puerta de enlace, endpoints de API expuestos                                                       |
| **Mitigaciones actuales** | Opción de autenticación Tailscale, enlazar a loopback por defecto                                  |
| **Riesgo residual**       | Medio - Puertas de enlace públicas descubribles                                                    |
| **Recomendaciones**       | Documentar el despliegue seguro, añadir limitación de velocidad en los endpoints de descubrimiento |

#### T-RECON-002: Sondeo de integración de canales

| Atributo                  | Valor                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0006 - Análisis activo                                                              |
| **Descripción**           | El atacante sondea los canales de mensajería para identificar cuentas gestionadas por IA |
| **Vector de ataque**      | Envío de mensajes de prueba, observación de patrones de respuesta                        |
| **Componentes afectados** | Todas las integraciones de canales                                                       |
| **Mitigaciones actuales** | Ninguna específica                                                                       |
| **Riesgo residual**       | Bajo - Valor limitado del descubrimiento por sí solo                                     |
| **Recomendaciones**       | Considerar la aleatorización del tiempo de respuesta                                     |

---

### 3.2 Acceso inicial (AML.TA0004)

#### T-ACCESS-001: Interceptación del código de emparejamiento

| Atributo                  | Valor                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de inferencia de modelos de IA                              |
| **Descripción**           | El atacante intercepta el código de emparejamiento durante el periodo de gracia de 30 s |
| **Vector de ataque**      | Mirar por encima del hombro, olfateo de red, ingeniería social                          |
| **Componentes afectados** | Sistema de emparejamiento de dispositivos                                               |
| **Mitigaciones actuales** | Caducidad de 30 s, códigos enviados a través del canal existente                        |
| **Riesgo residual**       | Medio - Periodo de gracia explotable                                                    |
| **Recomendaciones**       | Reducir el periodo de gracia, añadir un paso de confirmación                            |

#### T-ACCESS-002: Suplantación de AllowFrom

| Atributo                  | Valor                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de inferencia de modelos de IA                               |
| **Descripción**           | El atacante suplanta la identidad del remitente permitido en el canal                    |
| **Vector de ataque**      | Depende del canal: suplantación de número de teléfono, suplantación de nombre de usuario |
| **Componentes afectados** | Validación AllowFrom por canal                                                           |
| **Mitigaciones actuales** | Verificación de identidad específica del canal                                           |
| **Riesgo residual**       | Medio - Algunos canales son vulnerables a la suplantación                                |
| **Recomendaciones**       | Document channel-specific risks, add cryptographic verification where possible           |

#### T-ACCESS-003: Token Theft

| Attribute               | Value                                                       |
| ----------------------- | ----------------------------------------------------------- |
| **ATLAS ID**            | AML.T0040 - AI Model Inference API Access                   |
| **Description**         | Attacker steals authentication tokens from config files     |
| **Attack Vector**       | Malware, unauthorized device access, config backup exposure |
| **Affected Components** | ~/.openclaw/credentials/, config storage                    |
| **Current Mitigations** | File permissions                                            |
| **Residual Risk**       | High - Tokens stored in plaintext                           |
| **Recommendations**     | Implement token encryption at rest, add token rotation      |

---

### 3.3 Execution (AML.TA0005)

#### T-EXEC-001: Direct Prompt Injection

| Attribute               | Value                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0051.000 - LLM Prompt Injection: Direct                                              |
| **Description**         | Attacker sends crafted prompts to manipulate agent behavior                               |
| **Attack Vector**       | Channel messages containing adversarial instructions                                      |
| **Affected Components** | Agent LLM, all input surfaces                                                             |
| **Current Mitigations** | Pattern detection, external content wrapping                                              |
| **Residual Risk**       | Critical - Detection only, no blocking; sophisticated attacks bypass                      |
| **Recommendations**     | Implement multi-layer defense, output validation, user confirmation for sensitive actions |

#### T-EXEC-002: Indirect Prompt Injection

| Attribute               | Value                                                       |
| ----------------------- | ----------------------------------------------------------- |
| **ATLAS ID**            | AML.T0051.001 - LLM Prompt Injection: Indirect              |
| **Description**         | Attacker embeds malicious instructions in fetched content   |
| **Attack Vector**       | Malicious URLs, poisoned emails, compromised webhooks       |
| **Affected Components** | web_fetch, email ingestion, external data sources           |
| **Current Mitigations** | Content wrapping with XML tags and security notice          |
| **Residual Risk**       | High - LLM may ignore wrapper instructions                  |
| **Recommendations**     | Implement content sanitization, separate execution contexts |

#### T-EXEC-003: Tool Argument Injection

| Attribute               | Value                                                                        |
| ----------------------- | ---------------------------------------------------------------------------- |
| **ATLAS ID**            | AML.T0051.000 - LLM Prompt Injection: Direct                                 |
| **Description**         | Attacker manipulates tool arguments through prompt injection                 |
| **Attack Vector**       | Crafted prompts that influence tool parameter values                         |
| **Affected Components** | All tool invocations                                                         |
| **Current Mitigations** | Exec approvals for dangerous commands                                        |
| **Residual Risk**       | High - Relies on user judgment                                               |
| **Recommendations**     | Implementar validación de argumentos, llamadas a herramientas parametrizadas |

#### T-EXEC-004: Exec Approval Bypass

| Atributo                  | Valor                                                                       |
| ------------------------- | --------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0043 - Craft Adversarial Data                                          |
| **Descripción**           | El atacante crea comandos que omiten la lista de permitidos de aprobaciones |
| **Vector de Ataque**      | Ofuscación de comandos, explotación de alias, manipulación de rutas         |
| **Componentes Afectados** | exec-approvals.ts, lista de permitidos de comandos                          |
| **Mitigaciones Actuales** | Lista de permitidos + modo de pregunta (ask mode)                           |
| **Riesgo Residual**       | Alto - Sin saneamiento de comandos                                          |
| **Recomendaciones**       | Implementar normalización de comandos, ampliar lista de bloqueados          |

---

### 3.4 Persistence (AML.TA0006)

#### T-PERSIST-001: Malicious Skill Installation

| Atributo                  | Valor                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0010.001 - Supply Chain Compromise: AI Software                                          |
| **Descripción**           | El atacante publica una habilidad maliciosa en ClawHub                                        |
| **Vector de Ataque**      | Crear cuenta, publicar habilidad con código malicioso oculto                                  |
| **Componentes Afectados** | ClawHub, carga de habilidades (skill loading), ejecución del agente                           |
| **Mitigaciones Actuales** | Verificación de antigüedad de cuenta de GitHub, indicadores de moderación basados en patrones |
| **Riesgo Residual**       | Crítico - Sin aislamiento (sandboxing), revisión limitada                                     |
| **Recomendaciones**       | Integración con VirusTotal (en progreso), aislamiento de habilidades, revisión comunitaria    |

#### T-PERSIST-002: Skill Update Poisoning

| Atributo                  | Valor                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0010.001 - Supply Chain Compromise: AI Software                                 |
| **Descripción**           | El atacante compromete una habilidad popular e introduce una actualización maliciosa |
| **Vector de Ataque**      | Compromiso de cuenta, ingeniería social del propietario de la habilidad              |
| **Componentes Afectados** | Versionado de ClawHub, flujos de actualización automática                            |
| **Mitigaciones Actuales** | Huella digital de versiones                                                          |
| **Riesgo Residual**       | Alto - Las actualizaciones automáticas pueden descargar versiones maliciosas         |
| **Recomendaciones**       | Implementar firma de actualizaciones, capacidad de reversión, fijación de versiones  |

#### T-PERSIST-003: Agent Configuration Tampering

| Atributo                  | Valor                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0010.002 - Supply Chain Compromise: Data                                                     |
| **Descripción**           | El atacante modifica la configuración del agente para persistir el acceso                         |
| **Vector de Ataque**      | Modificación de archivo de configuración, inyección de ajustes                                    |
| **Componentes Afectados** | Configuración del agente, políticas de herramientas                                               |
| **Mitigaciones Actuales** | Permisos de archivos                                                                              |
| **Riesgo Residual**       | Medio - Requiere acceso local                                                                     |
| **Recomendaciones**       | Verificación de integridad de la configuración, registro de auditoría de cambios de configuración |

---

### 3.5 Evasión de Defensas (AML.TA0007)

#### T-EVADE-001: Omisión de Patrones de Moderación

| Atributo                  | Valor                                                                            |
| ------------------------- | -------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0043 - Crear Datos Adversarios                                              |
| **Descripción**           | El atacante crea contenido de habilidades para evadir los patrones de moderación |
| **Vector de Ataque**      | Homoglifos Unicode, trucos de codificación, carga dinámica                       |
| **Componentes Afectados** | ClawHub moderation.ts                                                            |
| **Mitigaciones Actuales** | FLAG_RULES basados en patrones                                                   |
| **Riesgo Residual**       | Alto: Las regex simples se omiten fácilmente                                     |
| **Recomendaciones**       | Añadir análisis conductual (VirusTotal Code Insight), detección basada en AST    |

#### T-EVADE-002: Fuga del Contenedor de Contenido

| Atributo                  | Valor                                                                        |
| ------------------------- | ---------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0043 - Crear Datos Adversarios                                          |
| **Descripción**           | El atacante crea contenido que escapa del contexto del contenedor XML        |
| **Vector de Ataque**      | Manipulación de etiquetas, confusión de contexto, anulación de instrucciones |
| **Componentes Afectados** | Envoltura de contenido externo                                               |
| **Mitigaciones Actuales** | Etiquetas XML + aviso de seguridad                                           |
| **Riesgo Residual**       | Medio: Se descubren nuevas fugas regularmente                                |
| **Recomendaciones**       | Múltiples capas de contenedor, validación del lado de la salida              |

---

### 3.6 Descubrimiento (AML.TA0008)

#### T-DISC-001: Enumeración de Herramientas

| Atributo                  | Valor                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de Inferencia del Modelo de IA                            |
| **Descripción**           | El atacante enumera las herramientas disponibles a través de indicaciones (prompting) |
| **Vector de Ataque**      | Consultas de estilo "¿Qué herramientas tienes?"                                       |
| **Componentes Afectados** | Registro de herramientas del agente                                                   |
| **Mitigaciones Actuales** | Ninguna específica                                                                    |
| **Riesgo Residual**       | Bajo: Las herramientas generalmente están documentadas                                |
| **Recomendaciones**       | Considerar controles de visibilidad de herramientas                                   |

#### T-DISC-002: Extracción de Datos de Sesión

| Atributo                  | Valor                                                             |
| ------------------------- | ----------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de Inferencia del Modelo de IA        |
| **Descripción**           | El atacante extrae datos confidenciales del contexto de la sesión |
| **Vector de Ataque**      | Consultas de estilo "¿Qué discutimos?", sondeo del contexto       |
| **Componentes Afectados** | Transcripciones de sesión, ventana de contexto                    |
| **Mitigaciones Actuales** | Aislamiento de sesión por remitente                               |
| **Riesgo Residual**       | Medio: Los datos dentro de la sesión son accesibles               |
| **Recomendaciones**       | Implementar la redacción de datos confidenciales en el contexto   |

---

### 3.7 Recopilación y Exfiltración (AML.TA0009, AML.TA0010)

#### T-EXFIL-001: Robo de Datos vía web_fetch

| Atributo                  | Valor                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0009 - Colección                                                                               |
| **Descripción**           | El atacante exfiltra datos instruyendo al agente para que los envíe a una URL externa               |
| **Vector de Ataque**      | Inyección de prompt que provoca que el agente envíe datos mediante POST al servidor del atacante    |
| **Componentes Afectados** | herramienta web_fetch                                                                               |
| **Mitigaciones Actuales** | Bloqueo de SSRF para redes internas                                                                 |
| **Riesgo Residual**       | Alto: se permiten URLs externas                                                                     |
| **Recomendaciones**       | Implementar listas de permitidos (allowlisting) de URL, concienciación sobre clasificación de datos |

#### T-EXFIL-002: Envío No Autorizado de Mensajes

| Atributo                  | Valor                                                                          |
| ------------------------- | ------------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0009 - Recolección                                                        |
| **Descripción**           | El atacante provoca que el agente envíe mensajes que contienen datos sensibles |
| **Vector de Ataque**      | Inyección de prompt que provoca que el agente envíe un mensaje al atacante     |
| **Componentes Afectados** | Herramienta de mensajes, integraciones de canales                              |
| **Mitigaciones Actuales** | Regulación de mensajería saliente                                              |
| **Riesgo Residual**       | Medio - La regulación puede ser evadida                                        |
| **Recomendaciones**       | Requerir confirmación explícita para nuevos destinatarios                      |

#### T-EXFIL-003: Recolección de Credenciales

| Atributo                  | Valor                                                                         |
| ------------------------- | ----------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0009 - Recolección                                                       |
| **Descripción**           | Una habilidad maliciosa recolecta credenciales del contexto del agente        |
| **Vector de Ataque**      | El código de la habilidad lee variables de entorno, archivos de configuración |
| **Componentes Afectados** | Entorno de ejecución de habilidades                                           |
| **Mitigaciones Actuales** | Ninguna específica para habilidades                                           |
| **Riesgo Residual**       | Crítico - Las habilidades se ejecutan con privilegios de agente               |
| **Recomendaciones**       | Sandboxing de habilidades, aislamiento de credenciales                        |

---

### 3.8 Impacto (AML.TA0011)

#### T-IMPACT-001: Ejecución No Autorizada de Comandos

| Atributo                  | Valor                                                                            |
| ------------------------- | -------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0031 - Erosión de la Integridad del Modelo de IA                            |
| **Descripción**           | El atacante ejecuta comandos arbitrarios en el sistema del usuario               |
| **Vector de Ataque**      | Inyección de prompt combinada con la evasión de aprobación de ejecución          |
| **Componentes Afectados** | Herramienta Bash, ejecución de comandos                                          |
| **Mitigaciones Actuales** | Aprobaciones de ejecución, opción de sandbox Docker                              |
| **Riesgo Residual**       | Crítico - Ejecución en el host sin sandbox                                       |
| **Recomendaciones**       | Usar sandbox por defecto, mejorar la experiencia de usuario (UX) de aprobaciones |

#### T-IMPACT-002: Agotamiento de Recursos (DoS)

| Atributo                  | Valor                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0031 - Erosión de la Integridad del Modelo de IA                  |
| **Descripción**           | El atacante agota los créditos de la API o los recursos de cómputo     |
| **Vector de Ataque**      | Inundación automatizada de mensajes, llamadas costosas a herramientas  |
| **Componentes Afectados** | Pasarela, sesiones de agente, proveedor de API                         |
| **Mitigaciones Actuales** | Ninguna                                                                |
| **Riesgo Residual**       | Alto: Sin limitación de velocidad                                      |
| **Recomendaciones**       | Implementar límites de velocidad por remitente, presupuestos de costos |

#### T-IMPACT-003: Daño a la Reputación

| Atributo                  | Valor                                                             |
| ------------------------- | ----------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0031 - Erosionar la Integridad del Modelo de IA              |
| **Descripción**           | El atacante provoca que el agente envíe contenido dañino/ofensivo |
| **Vector de Ataque**      | Inyección de prompts que causa respuestas inapropiadas            |
| **Componentes Afectados** | Generación de salida, mensajería del canal                        |
| **Mitigaciones Actuales** | Políticas de contenido del proveedor de LLM                       |
| **Riesgo Residual**       | Medio - Los filtros del proveedor son imperfectos                 |
| **Recomendaciones**       | Capa de filtrado de salida, controles de usuario                  |

---

## 4. Análisis de la Cadena de Suministro de ClawHub

### 4.1 Controles de Seguridad Actuales

| Control                               | Implementación              | Efectividad                                                    |
| ------------------------------------- | --------------------------- | -------------------------------------------------------------- |
| Antigüedad de la Cuenta de GitHub     | `requireGitHubAccountAge()` | Medio - Eleva el estándar para nuevos atacantes                |
| Limpieza de Rutas (Path Sanitization) | `sanitizePath()`            | Alto - Previene el path traversal                              |
| Validación de Tipo de Archivo         | `isTextFile()`              | Medio - Solo archivos de texto, pero aún pueden ser maliciosos |
| Límites de Tamaño                     | Paquete total de 50MB       | Alto - Previene el agotamiento de recursos                     |
| SKILL.md Obligatorio                  | Readme obligatorio          | Bajo valor de seguridad: Solo informativo                      |
| Moderación de Patrones                | FLAG_RULES en moderation.ts | Bajo - Fácilmente evadido                                      |
| Estado de Moderación                  | Campo `moderationStatus`    | Medio - Revisión manual posible                                |

### 4.2 Patrones de Marcas de Moderación

Patrones actuales en `moderation.ts`:

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

**Limitaciones:**

- Solo verifica slug, displayName, summary, frontmatter, metadatos, rutas de archivo
- No analiza el contenido real del código de la habilidad
- Regex simple fácilmente evadido con ofuscación
- Sin análisis conductual

### 4.3 Mejoras Planificadas

| Mejora                              | Estado                                   | Impacto                                                              |
| ----------------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Integración con VirusTotal          | En Progreso                              | Alto - Análisis conductual de Code Insight                           |
| Reportes de la Comunidad            | Parcial (la tabla `skillReports` existe) | Medio                                                                |
| Registro de Auditoría               | Parcial (la tabla `auditLogs` existe)    | Medio                                                                |
| Sistema de Insignias (Badge System) | Implementado                             | Medio - `highlighted`, `official`, `deprecated`, `redactionApproved` |

---

## 5. Matriz de Riesgos

### 5.1 Probabilidad vs Impacto

| ID de Amenaza | Probabilidad | Impacto | Nivel de Riesgo | Prioridad |
| ------------- | ------------ | ------- | --------------- | --------- |
| T-EXEC-001    | Alto         | Crítico | **Crítico**     | P0        |
| T-PERSIST-001 | Alta         | Crítica | **Crítica**     | P0        |
| T-EXFIL-003   | Media        | Crítica | **Crítica**     | P0        |
| T-IMPACT-001  | Media        | Crítica | **Alta**        | P1        |
| T-EXEC-002    | Alta         | Alta    | **Alta**        | P1        |
| T-EXEC-004    | Media        | Alta    | **Alta**        | P1        |
| T-ACCESS-003  | Media        | Alta    | **Alta**        | P1        |
| T-EXFIL-001   | Media        | Alta    | **Alta**        | P1        |
| T-IMPACT-002  | Alta         | Media   | **Alta**        | P1        |
| T-EVADE-001   | Alta         | Media   | **Media**       | P2        |
| T-ACCESS-001  | Baja         | Alta    | **Media**       | P2        |
| T-ACCESS-002  | Baja         | Alta    | **Media**       | P2        |
| T-PERSIST-002 | Baja         | Alta    | **Media**       | P2        |

### 5.2 Cadenas de ataque de ruta crítica

**Cadena de ataque 1: Robo de datos basado en habilidades**

```
T-PERSIST-001 → T-EVADE-001 → T-EXFIL-003
(Publish malicious skill) → (Evade moderation) → (Harvest credentials)
```

**Cadena de ataque 2: Inyección de prompts a RCE**

```
T-EXEC-001 → T-EXEC-004 → T-IMPACT-001
(Inject prompt) → (Bypass exec approval) → (Execute commands)
```

**Cadena de ataque 3: Inyección indirecta a través de contenido obtenido**

```
T-EXEC-002 → T-EXFIL-001 → External exfiltration
(Poison URL content) → (Agent fetches & follows instructions) → (Data sent to attacker)
```

---

## 6. Resumen de recomendaciones

### 6.1 Inmediato (P0)

| ID    | Recomendación                                          | Aborda                     |
| ----- | ------------------------------------------------------ | -------------------------- |
| R-001 | Completar la integración con VirusTotal                | T-PERSIST-001, T-EVADE-001 |
| R-002 | Implementar el aislamiento (sandboxing) de habilidades | T-PERSIST-001, T-EXFIL-003 |
| R-003 | Añadir validación de salida para acciones sensibles    | T-EXEC-001, T-EXEC-002     |

### 6.2 Corto plazo (P1)

| ID    | Recomendación                                                         | Aborda       |
| ----- | --------------------------------------------------------------------- | ------------ |
| R-004 | Implementar limitación de velocidad                                   | T-IMPACT-002 |
| R-005 | Añadir cifrado de tokens en reposo                                    | T-ACCESS-003 |
| R-006 | Mejorar la UX y validación de aprobación de ejecución                 | T-EXEC-004   |
| R-007 | Implementar listas de permitidos (allowlisting) de URL para web_fetch | T-EXFIL-001  |

### 6.3 Mediano plazo (P2)

| ID    | Recomendación                                                 | Aborda        |
| ----- | ------------------------------------------------------------- | ------------- |
| R-008 | Añadir verificación de canal criptográfico cuando sea posible | T-ACCESS-002  |
| R-009 | Implementar verificación de integridad de configuración       | T-PERSIST-003 |
| R-010 | Añadir firma de actualizaciones y fijación de versiones       | T-PERSIST-002 |

---

## 7. Apéndices

### 7.1 Mapeo de técnicas ATLAS

| ID ATLAS      | Nombre de la técnica                           | Amenazas de OpenClaw                                             |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| AML.T0006     | Escaneo Activo                                 | T-RECON-001, T-RECON-002                                         |
| AML.T0009     | Recolección                                    | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | Cadena de Suministro: Software de IA           | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | Cadena de Suministro: Datos                    | T-PERSIST-003                                                    |
| AML.T0031     | Erosionar la Integridad del Modelo de IA       | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | Acceso a la API de Inferencia del Modelo de IA | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | Crear Datos Adversarios                        | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | Inyección de Prompts LLM: Directa              | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | Inyección de prompt LLM: Indirecta             | T-EXEC-002                                                       |

### 7.2 Archivos de seguridad clave

| Ruta                                | Propósito                                 | Nivel de riesgo |
| ----------------------------------- | ----------------------------------------- | --------------- |
| `src/infra/exec-approvals.ts`       | Lógica de aprobación de comandos          | **Crítico**     |
| `src/gateway/auth.ts`               | Autenticación de puerta de enlace         | **Crítico**     |
| `src/web/inbound/access-control.ts` | Control de acceso al canal                | **Crítico**     |
| `src/infra/net/ssrf.ts`             | Protección SSRF                           | **Crítico**     |
| `src/security/external-content.ts`  | Mitigación de inyección de prompts        | **Crítico**     |
| `src/agents/sandbox/tool-policy.ts` | Cumplimiento de políticas de herramientas | **Crítico**     |
| `convex/lib/moderation.ts`          | Moderación de ClawHub                     | **Alto**        |
| `convex/lib/skillPublish.ts`        | Flujo de publicación de habilidades       | **Alto**        |
| `src/routing/resolve-route.ts`      | Aislamiento de sesión                     | **Medio**       |

### 7.3 Glosario

| Término                 | Definición                                                           |
| ----------------------- | -------------------------------------------------------------------- |
| **ATLAS**               | Adversarial Threat Landscape for AI Systems de MITRE                 |
| **ClawHub**             | El mercado de habilidades de OpenClaw                                |
| **Puerta de enlace**    | Capa de enrutamiento de mensajes y autenticación de OpenClaw         |
| **MCP**                 | Model Context Protocol - interfaz del proveedor de herramientas      |
| **Inyección de Prompt** | Ataque en el que se incrustan instrucciones maliciosas en la entrada |
| **Habilidad**           | Extensión descargable para agentes OpenClaw                          |
| **SSRF**                | Server-Side Request Forgery                                          |

---

_Este modelo de amenazas es un documento vivo. Reporte problemas de seguridad a security@openclaw.ai_

import es from "/components/footer/es.mdx";

<es />
