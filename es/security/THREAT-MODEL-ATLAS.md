---
title: "Modelo de amenazas (MITRE ATLAS)"
summary: "Modelo de amenazas de OpenClaw asignado al marco MITRE ATLAS"
read_when:
  - Revisando la postura de seguridad o escenarios de amenazas
  - Trabajando en características de seguridad o respuestas de auditoría
---

# Modelo de amenazas de OpenClaw v1.0

## Marco MITRE ATLAS

**Versión:** 1.0-draft
**Última actualización:** 2026-02-04
**Metodología:** MITRE ATLAS + Diagramas de flujo de datos
**Marco:** [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems)

### Atribución del marco

Este modelo de amenazas se basa en [MITRE ATLAS](https://atlas.mitre.org/), el marco estándar de la industria para documentar amenazas adversariales a los sistemas de IA/ML. ATLAS es mantenido por [MITRE](https://www.mitre.org/) en colaboración con la comunidad de seguridad de IA.

**Recursos clave de ATLAS:**

- [Técnicas de ATLAS](https://atlas.mitre.org/techniques/)
- [Tácticas de ATLAS](https://atlas.mitre.org/tactics/)
- [Casos de estudio de ATLAS](https://atlas.mitre.org/studies/)
- [GitHub de ATLAS](https://github.com/mitre-atlas/atlas-data)
- [Contribuir a ATLAS](https://atlas.mitre.org/resources/contribute)

### Contribuir a este modelo de amenazas

Este es un documento vivo mantenido por la comunidad de OpenClaw. Consulte [CONTRIBUTING-THREAT-MODEL.md](/es/security/CONTRIBUTING-THREAT-MODEL) para obtener pautas sobre cómo contribuir:

- Informar de nuevas amenazas
- Actualizar amenazas existentes
- Proponer cadenas de ataque
- Sugerir mitigaciones

---

## 1. Introducción

### 1.1 Propósito

Este modelo de amenazas documenta las amenazas adversariales para la plataforma de agentes de IA de OpenClaw y el mercado de habilidades ClawHub, utilizando el marco MITRE ATLAS diseñado específicamente para sistemas de IA/ML.

### 1.2 Alcance

| Componente               | Incluido | Notas                                                             |
| ------------------------ | -------- | ----------------------------------------------------------------- |
| OpenClaw Agent Runtime   | Sí       | Ejecución principal del agente, llamadas a herramientas, sesiones |
| Pasarela                 | Sí       | Autenticación, enrutamiento, integración de canales               |
| Integraciones de canales | Sí       | WhatsApp, Telegram, Discord, Signal, Slack, etc.                  |
| ClawHub Marketplace      | Sí       | Publicación de habilidades, moderación, distribución              |
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

| Flujo | Origen   | Destino      | Datos                        | Protección              |
| ----- | -------- | ------------ | ---------------------------- | ----------------------- |
| F1    | Canal    | Pasarela     | Mensajes de usuario          | TLS, AllowFrom          |
| F2    | Pasarela | Agente       | Mensajes enrutados           | Aislamiento de sesión   |
| F3    | Agente   | Herramientas | Invocaciones de herramientas | Aplicación de políticas |
| F4    | Agente   | Externo      | Solicitudes web_fetch        | Bloqueo SSRF            |
| F5    | ClawHub  | Agente       | Código de habilidades        | Moderación, análisis    |
| F6    | Agente   | Canal        | Respuestas                   | Filtrado de salida      |

---

## 3. Análisis de amenazas por táctica de ATLAS

### 3.1 Reconocimiento (AML.TA0002)

#### T-RECON-001: Descubrimiento de puntos de conexión del Agente

| Atributo                  | Valor                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0006 - Escaneo activo                                                                                  |
| **Descripción**           | El atacante escanea en busca de puntos de conexión de puerta de enlace de OpenClaw expuestos                |
| **Vector de ataque**      | Escaneo de red, consultas shodan, enumeración de DNS                                                        |
| **Componentes afectados** | Puerta de enlace, puntos de conexión de API expuestos                                                       |
| **Mitigaciones actuales** | Opción de autenticación Tailscale, vincular a loopback por defecto                                          |
| **Riesgo residual**       | Medio - Puertas de enlace públicas descubribles                                                             |
| **Recomendaciones**       | Documentar el despliegue seguro, añadir limitación de velocidad en los puntos de conexión de descubrimiento |

#### T-RECON-002: Sondeo de integración de canales

| Atributo                  | Valor                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0006 - Escaneo activo                                                               |
| **Descripción**           | El atacante sondea los canales de mensajería para identificar cuentas gestionadas por IA |
| **Vector de ataque**      | Envío de mensajes de prueba, observación de patrones de respuesta                        |
| **Componentes afectados** | Todas las integraciones de canales                                                       |
| **Mitigaciones actuales** | Ninguna específica                                                                       |
| **Riesgo residual**       | Bajo - Valor limitado del descubrimiento por sí solo                                     |
| **Recomendaciones**       | Considerar la aleatorización del tiempo de respuesta                                     |

---

### 3.2 Acceso inicial (AML.TA0004)

#### T-ACCESS-001: Interceptación de código de emparejamiento

| Atributo                  | Valor                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de inferencia de modelo de IA                              |
| **Descripción**           | El atacante intercepta el código de emparejamiento durante el periodo de gracia de 30s |
| **Vector de ataque**      | Mirar por encima del hombro, sniffing de red, ingeniería social                        |
| **Componentes afectados** | Sistema de emparejamiento de dispositivos                                              |
| **Mitigaciones actuales** | Caducidad de 30s, códigos enviados a través del canal existente                        |
| **Riesgo residual**       | Medio - Periodo de gracia explotable                                                   |
| **Recomendaciones**       | Reducir el periodo de gracia, añadir un paso de confirmación                           |

#### T-ACCESS-002: Suplantación de AllowFrom

| Atributo                  | Valor                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de inferencia de modelo de IA                                           |
| **Descripción**           | El atacante suplanta la identidad del remitente permitido en el canal                               |
| **Vector de ataque**      | Depende del canal - suplantación de número de teléfono, suplantación de nombre de usuario           |
| **Componentes afectados** | Validación de AllowFrom por canal                                                                   |
| **Mitigaciones actuales** | Verificación de identidad específica del canal                                                      |
| **Riesgo Residual**       | Medio - Algunos canales son vulnerables a la suplantación                                           |
| **Recomendaciones**       | Documentar los riesgos específicos del canal, agregar verificación criptográfica cuando sea posible |

#### T-ACCESS-003: Token Theft

| Atributo                  | Valor                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0040 - AI Model Inference API Access                                                        |
| **Descripción**           | El atacante roba tokens de autenticación de archivos de configuración                            |
| **Vector de Ataque**      | Malware, acceso no autorizado al dispositivo, exposición de copias de seguridad de configuración |
| **Componentes Afectados** | ~/.openclaw/credentials/, almacenamiento de configuración                                        |
| **Mitigaciones Actuales** | Permisos de archivos                                                                             |
| **Riesgo Residual**       | Alto - Tokens almacenados en texto plano                                                         |
| **Recomendaciones**       | Implementar el cifrado de tokens en reposo, agregar rotación de tokens                           |

---

### 3.3 Execution (AML.TA0005)

#### T-EXEC-001: Direct Prompt Injection

| Atributo                  | Valor                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0051.000 - LLM Prompt Injection: Direct                                                         |
| **Descripción**           | El atacante envía instrucciones (prompts) elaboradas para manipular el comportamiento del agente     |
| **Vector de Ataque**      | Mensajes del canal que contienen instrucciones adversarias                                           |
| **Componentes Afectados** | LLM del agente, todas las superficies de entrada                                                     |
| **Mitigaciones Actuales** | Detección de patrones, envoltura de contenido externo                                                |
| **Riesgo Residual**       | Crítico - Solo detección, sin bloqueo; los ataques sofisticados lo evaden                            |
| **Recomendaciones**       | Implementar defensa en capas, validación de salida, confirmación del usuario para acciones sensibles |

#### T-EXEC-002: Indirect Prompt Injection

| Atributo                  | Valor                                                                    |
| ------------------------- | ------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0051.001 - LLM Prompt Injection: Indirect                           |
| **Descripción**           | El atacante incrusta instrucciones maliciosas en el contenido recuperado |
| **Vector de Ataque**      | URL maliciosas, correos electrónicos envenenados, webhooks comprometidos |
| **Componentes Afectados** | web_fetch, ingesta de correo electrónico, fuentes de datos externas      |
| **Mitigaciones Actuales** | Envoltura de contenido con etiquetas XML y aviso de seguridad            |
| **Riesgo Residual**       | Alto - Es posible que el LLM ignore las instrucciones de envoltura       |
| **Recomendaciones**       | Implementar saneamiento de contenido, contextos de ejecución separados   |

#### T-EXEC-003: Tool Argument Injection

| Atributo                  | Valor                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0051.000 - LLM Prompt Injection: Direct                                                |
| **Descripción**           | El atacante manipula los argumentos de las herramientas a través de la inyección de prompts |
| **Vector de Ataque**      | Prompts elaborados que influyen en los valores de los parámetros de las herramientas        |
| **Componentes Afectados** | Todas las invocaciones de herramientas                                                      |
| **Mitigaciones Actuales** | Aprobaciones de ejecución para comandos peligrosos                                          |
| **Riesgo Residual**       | Alto: Depende del juicio del usuario                                                        |
| **Recomendaciones**       | Implementar validación de argumentos, llamadas a herramientas parametrizadas                |

#### T-EXEC-004: Omisión de Aprobación de Ejecución

| Atributo                  | Valor                                                                       |
| ------------------------- | --------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0043 - Crear Datos Adversarios                                         |
| **Descripción**           | El atacante crea comandos que omiten la lista de permitidos de aprobaciones |
| **Vector de Ataque**      | Ofuscación de comandos, explotación de alias, manipulación de rutas         |
| **Componentes Afectados** | exec-approvals.ts, lista de permitidos de comandos                          |
| **Mitigaciones Actuales** | Lista de permitidos + modo de solicitud                                     |
| **Riesgo Residual**       | Alto: Sin saneamiento de comandos                                           |
| **Recomendaciones**       | Implementar normalización de comandos, expandir lista de bloqueados         |

---

### 3.4 Persistencia (AML.TA0006)

#### T-PERSIST-001: Instalación de Skill Malicioso

| Atributo                  | Valor                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0010.001 - Compromiso de la Cadena de Suministro: Software de IA                            |
| **Descripción**           | El atacante publica un skill malicioso en ClawHub                                                |
| **Vector de Ataque**      | Crear cuenta, publicar skill con código malicioso oculto                                         |
| **Componentes Afectados** | ClawHub, carga de skills, ejecución del agente                                                   |
| **Mitigaciones Actuales** | Verificación de antigüedad de la cuenta de GitHub, indicadores de moderación basados en patrones |
| **Riesgo Residual**       | Crítico: Sin sandboxing, revisión limitada                                                       |
| **Recomendaciones**       | Integración con VirusTotal (en progreso), sandboxing de skills, revisión comunitaria             |

#### T-PERSIST-002: Envenenamiento de Actualización de Skill

| Atributo                  | Valor                                                                             |
| ------------------------- | --------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0010.001 - Compromiso de la Cadena de Suministro: Software de IA             |
| **Descripción**           | El atacante compromete un skill popular y envía una actualización maliciosa       |
| **Vector de Ataque**      | Compromiso de la cuenta, ingeniería social del propietario del skill              |
| **Componentes Afectados** | Versionado de ClawHub, flujos de actualización automática                         |
| **Mitigaciones Actuales** | Huellas digitales de versión                                                      |
| **Riesgo Residual**       | Alto: Las actualizaciones automáticas pueden extraer versiones maliciosas         |
| **Recomendaciones**       | Implementar firma de actualizaciones, capacidad de reversión, fijación de versión |

#### T-PERSIST-003: Manipulación de la Configuración del Agente

| Atributo                  | Valor                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0010.002 - Compromiso de la Cadena de Suministro: Datos                                        |
| **Descripción**           | El atacante modifica la configuración del agente para persistir el acceso                           |
| **Vector de Ataque**      | Modificación del archivo de configuración, inyección de configuraciones                             |
| **Componentes Afectados** | Configuración del agente, políticas de herramientas                                                 |
| **Mitigaciones Actuales** | Permisos de archivos                                                                                |
| **Riesgo Residual**       | Medio - Requiere acceso local                                                                       |
| **Recomendaciones**       | Verificación de integridad de la configuración, registro de auditoría para cambios de configuración |

---

### 3.5 Evasión de Defensas (AML.TA0007)

#### T-EVADE-001: Omisión de Patrones de Moderación

| Atributo                  | Valor                                                                            |
| ------------------------- | -------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0043 - Crear Datos Adversarios                                              |
| **Descripción**           | El atacante crea contenido de habilidades para evadir los patrones de moderación |
| **Vector de Ataque**      | Homoglifos Unicode, trucos de codificación, carga dinámica                       |
| **Componentes Afectados** | ClawHub moderation.ts                                                            |
| **Mitigaciones Actuales** | FLAG_RULES basadas en patrones                                                   |
| **Riesgo Residual**       | Alto - El regex simple se omite fácilmente                                       |
| **Recomendaciones**       | Agregar análisis conductual (VirusTotal Code Insight), detección basada en AST   |

#### T-EVADE-002: Escape de Contenedor de Contenido

| Atributo                  | Valor                                                                        |
| ------------------------- | ---------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0043 - Crear Datos Adversarios                                          |
| **Descripción**           | El atacante crea contenido que escapa del contexto del contenedor XML        |
| **Vector de Ataque**      | Manipulación de etiquetas, confusión de contexto, anulación de instrucciones |
| **Componentes Afectados** | Contenedor de contenido externo                                              |
| **Mitigaciones Actuales** | Etiquetas XML + aviso de seguridad                                           |
| **Riesgo Residual**       | Medio - Se descubren nuevos escapes regularmente                             |
| **Recomendaciones**       | Múltiples capas de contenedor, validación del lado de la salida              |

---

### 3.6 Descubrimiento (AML.TA0008)

#### T-DISC-001: Enumeración de Herramientas

| Atributo                  | Valor                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de Inferencia de Modelo de IA                             |
| **Descripción**           | El atacante enumera las herramientas disponibles a través de indicaciones (prompting) |
| **Vector de Ataque**      | Consultas de estilo "¿Qué herramientas tienes?"                                       |
| **Componentes Afectados** | Registro de herramientas del agente                                                   |
| **Mitigaciones Actuales** | Ninguna específica                                                                    |
| **Riesgo Residual**       | Bajo - Las herramientas generalmente están documentadas                               |
| **Recomendaciones**       | Considere controles de visibilidad de herramientas                                    |

#### T-DISC-002: Extracción de Datos de Sesión

| Atributo                  | Valor                                                        |
| ------------------------- | ------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de Inferencia de Modelo de IA    |
| **Descripción**           | El atacante extrae datos sensibles del contexto de la sesión |
| **Vector de Ataque**      | Consultas de estilo "¿Qué discutimos?", sondeo de contexto   |
| **Componentes Afectados** | Transcripciones de sesión, ventana de contexto               |
| **Mitigaciones Actuales** | Aislamiento de sesión por remitente                          |
| **Riesgo Residual**       | Medio - Los datos dentro de la sesión son accesibles         |
| **Recomendaciones**       | Implementar la redacción de datos sensibles en el contexto   |

---

### 3.7 Recolección y Exfiltración (AML.TA0009, AML.TA0010)

#### T-EXFIL-001: Robo de Datos a través de web_fetch

| Atributo                  | Valor                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0009 - Recolección                                                                       |
| **Descripción**           | El atacante exfiltra datos instruyendo al agente para que los envíe a una URL externa         |
| **Vector de Ataque**      | Inyección de prompt que provoca que el agente haga POST de datos al servidor del atacante     |
| **Componentes Afectados** | herramienta web_fetch                                                                         |
| **Mitigaciones Actuales** | Bloqueo de SSRF para redes internas                                                           |
| **Riesgo Residual**       | Alto - Se permiten URLs externas                                                              |
| **Recomendaciones**       | Implementar listas de permitidos (allowlisting) de URLs, conciencia de clasificación de datos |

#### T-EXFIL-002: Envío No Autorizado de Mensajes

| Atributo                  | Valor                                                                          |
| ------------------------- | ------------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0009 - Recolección                                                        |
| **Descripción**           | El atacante provoca que el agente envíe mensajes que contienen datos sensibles |
| **Vector de Ataque**      | Inyección de prompt que provoca que el agente envíe un mensaje al atacante     |
| **Componentes Afectados** | Herramienta de mensajería, integraciones de canales                            |
| **Mitigaciones Actuales** | Regulación de mensajería saliente                                              |
| **Riesgo Residual**       | Medio - La regulación puede ser evadida                                        |
| **Recomendaciones**       | Requerir confirmación explícita para nuevos destinatarios                      |

#### T-EXFIL-003: Recolección de Credenciales

| Atributo                  | Valor                                                                         |
| ------------------------- | ----------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0009 - Recolección                                                       |
| **Descripción**           | Habilidad maliciosa recolecta credenciales del contexto del agente            |
| **Vector de Ataque**      | El código de la habilidad lee variables de entorno, archivos de configuración |
| **Componentes Afectados** | Entorno de ejecución de habilidades                                           |
| **Mitigaciones Actuales** | Ninguna específica para habilidades                                           |
| **Riesgo Residual**       | Crítico - Las habilidades se ejecutan con privilegios de agente               |
| **Recomendaciones**       | Sandboxing de habilidades, aislamiento de credenciales                        |

---

### 3.8 Impacto (AML.TA0011)

#### T-IMPACT-001: Ejecución No Autorizada de Comandos

| Atributo                  | Valor                                                                   |
| ------------------------- | ----------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0031 - Erosionar la Integridad del Modelo de IA                    |
| **Descripción**           | El atacante ejecuta comandos arbitrarios en el sistema del usuario      |
| **Vector de Ataque**      | Inyección de prompt combinada con la omisión de aprobación de ejecución |
| **Componentes Afectados** | Herramienta Bash, ejecución de comandos                                 |
| **Mitigaciones Actuales** | Aprobaciones de ejecución, opción de sandbox Docker                     |
| **Riesgo Residual**       | Crítico - Ejecución en host sin sandbox                                 |
| **Recomendaciones**       | Usar sandbox por defecto, mejorar la UX de aprobación                   |

#### T-IMPACT-002: Agotamiento de Recursos (DoS)

| Atributo                  | Valor                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0031 - Erosionar la Integridad del Modelo de IA                  |
| **Descripción**           | El atacante agota créditos de API o recursos de cómputo               |
| **Vector de Ataque**      | Inundación automatizada de mensajes, llamadas a herramientas costosas |
| **Componentes Afectados** | Puerta de enlace, sesiones de agente, proveedor de API                |
| **Mitigaciones Actuales** | Ninguna                                                               |
| **Riesgo Residual**       | Alto: sin limitación de tasa                                          |
| **Recomendaciones**       | Implementar límites de tasa por remitente, presupuestos de costos     |

#### T-IMPACT-003: Daño a la Reputación

| Atributo                  | Valor                                                          |
| ------------------------- | -------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0031 - Erosionar la Integridad del Modelo de IA           |
| **Descripción**           | El atacante hace que el agente envíe contenido dañino/ofensivo |
| **Vector de Ataque**      | Inyección de prompt que causa respuestas inapropiadas          |
| **Componentes Afectados** | Generación de salida, mensajería del canal                     |
| **Mitigaciones Actuales** | Políticas de contenido del proveedor LLM                       |
| **Riesgo Residual**       | Medio: los filtros del proveedor no son perfectos              |
| **Recomendaciones**       | Capa de filtrado de salida, controles de usuario               |

---

## 4. Análisis de la Cadena de Suministro de ClawHub

### 4.1 Controles de Seguridad Actuales

| Control                           | Implementación              | Eficacia                                                      |
| --------------------------------- | --------------------------- | ------------------------------------------------------------- |
| Antigüedad de la Cuenta de GitHub | `requireGitHubAccountAge()` | Media: eleva el listón para nuevos atacantes                  |
| Saneamiento de Rutas              | `sanitizePath()`            | Alta: previene el path traversal                              |
| Validación de Tipo de Archivo     | `isTextFile()`              | Media: solo archivos de texto, pero aún pueden ser maliciosos |
| Límites de Tamaño                 | Paquete total de 50MB       | Alta: previene el agotamiento de recursos                     |
| SKILL.md Obligatorio              | Léame obligatorio           | Baixo valor de seguridad: solo informativo                    |
| Moderación de Patrones            | FLAG_RULES en moderation.ts | Baja: fácilmente eludible                                     |
| Estado de Moderación              | campo `moderationStatus`    | Media: revisión manual posible                                |

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

- Solo verifica slug, displayName, summary, frontmatter, metadata, rutas de archivo
- No analiza el contenido real del código de la habilidad
- Regex simple fácilmente eludible con ofuscación
- Sin análisis de comportamiento

### 4.3 Mejoras Planificadas

| Mejora                     | Estado                                   | Impacto                                                             |
| -------------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| Integración con VirusTotal | En Progreso                              | Alto: análisis de comportamiento de Code Insight                    |
| Reportes de la Comunidad   | Parcial (existe la tabla `skillReports`) | Medio                                                               |
| Registro de Auditoría      | Parcial (existe la tabla `auditLogs`)    | Media                                                               |
| Sistema de Insignias       | Implementado                             | Media: `highlighted`, `official`, `deprecated`, `redactionApproved` |

---

## 5. Matriz de Riesgos

### 5.1 Probabilidad vs Impacto

| ID de Amenaza | Probabilidad | Impacto | Nivel de Riesgo | Prioridad |
| ------------- | ------------ | ------- | --------------- | --------- |
| T-EXEC-001    | Alta         | Crítica | **Crítica**     | P0        |
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

**Cadena de ataque 2: Inyección de indicaciones a RCE**

```
T-EXEC-001 → T-EXEC-004 → T-IMPACT-001
(Inject prompt) → (Bypass exec approval) → (Execute commands)
```

**Cadena de ataque 3: Inyección indirecta a través del contenido recuperado**

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
| R-002 | Implementar el aislamiento de habilidades (sandboxing) | T-PERSIST-001, T-EXFIL-003 |
| R-003 | Añadir validación de salida para acciones sensibles    | T-EXEC-001, T-EXEC-002     |

### 6.2 Corto plazo (P1)

| ID    | Recomendación                                                         | Aborda       |
| ----- | --------------------------------------------------------------------- | ------------ |
| R-004 | Implementar limitación de velocidad (rate limiting)                   | T-IMPACT-002 |
| R-005 | Añadir cifrado de tokens en reposo                                    | T-ACCESS-003 |
| R-006 | Mejorar la UX y la validación de aprobación de ejecución              | T-EXEC-004   |
| R-007 | Implementar listas de permitidos (allowlisting) de URL para web_fetch | T-EXFIL-001  |

### 6.3 Mediano plazo (P2)

| ID    | Recomendación                                                  | Aborda        |
| ----- | -------------------------------------------------------------- | ------------- |
| R-008 | Añadir verificación criptográfica del canal cuando sea posible | T-ACCESS-002  |
| R-009 | Implementar verificación de integridad de configuración        | T-PERSIST-003 |
| R-010 | Añadir firma de actualizaciones y fijación de versiones        | T-PERSIST-002 |

---

## 7. Apéndices

### 7.1 Mapeo de técnicas ATLAS

| ID ATLAS      | Nombre de la técnica                           | Amenazas de OpenClaw                                             |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| AML.T0006     | Escaneo activo                                 | T-RECON-001, T-RECON-002                                         |
| AML.T0009     | Colección                                      | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | Cadena de suministro: Software de IA           | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | Cadena de suministro: Datos                    | T-PERSIST-003                                                    |
| AML.T0031     | Erosionar la integridad del modelo de IA       | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | Acceso a la API de inferencia del modelo de IA | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | Elaborar datos adversarios                     | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | Inyección de Prompt LLM: Directa               | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | Inyección de Prompt LLM: Indirecta             | T-EXEC-002                                                       |

### 7.2 Archivos de Seguridad Clave

| Ruta                                | Propósito                                 | Nivel de Riesgo |
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
| **ClawHub**             | Mercado de habilidades de OpenClaw                                   |
| **Gateway**             | Capa de enrutamiento de mensajes y autenticación de OpenClaw         |
| **MCP**                 | Model Context Protocol - interfaz de proveedor de herramientas       |
| **Inyección de Prompt** | Ataque en el que se incrustan instrucciones maliciosas en la entrada |
| **Skill**               | Extensión descargable para agentes OpenClaw                          |
| **SSRF**                | Server-Side Request Forgery                                          |

---

_Este modelo de amenazas es un documento vivo. Reporte problemas de seguridad a security@openclaw.ai_

import es from "/components/footer/es.mdx";

<es />
