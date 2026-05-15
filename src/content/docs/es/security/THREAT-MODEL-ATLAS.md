---
summary: "Modelo de amenazas de OpenClaw asignado al marco MITRE ATLAS"
title: "Modelo de amenazas (MITRE ATLAS)"
read_when:
  - Reviewing security posture or threat scenarios
  - Working on security features or audit responses
---

## Marco MITRE ATLAS

**Versión:** 1.0-borrador
**Última actualización:** 2026-02-04
**Metodología:** MITRE ATLAS + Diagramas de flujo de datos
**Marco:** [MITRE ATLAS](https://atlas.mitre.org/) (Adversarial Threat Landscape for AI Systems)

### Atribución del marco

Este modelo de amenazas se basa en [MITRE ATLAS](https://atlas.mitre.org/), el marco estándar de la industria para documentar amenazas adversarias a los sistemas de IA/ML. ATLAS es mantenido por [MITRE](https://www.mitre.org/) en colaboración con la comunidad de seguridad de IA.

**Recursos clave de ATLAS:**

- [Técnicas de ATLAS](https://atlas.mitre.org/techniques/)
- [Tácticas de ATLAS](https://atlas.mitre.org/tactics/)
- [Casos de estudio de ATLAS](https://atlas.mitre.org/studies/)
- [GitHub de ATLAS](https://github.com/mitre-atlas/atlas-data)
- [Contribuir a ATLAS](https://atlas.mitre.org/resources/contribute)

### Contribuir a este modelo de amenazas

Este es un documento vivo mantenido por la comunidad OpenClaw. Consulte [CONTRIBUTING-THREAT-MODEL.md](/es/security/CONTRIBUTING-THREAT-MODEL) para obtener pautas sobre cómo contribuir:

- Reportar nuevas amenazas
- Actualizar amenazas existentes
- Proponer cadenas de ataque
- Sugerir mitigaciones

---

## 1. Introducción

### 1.1 Propósito

Este modelo de amenazas documenta las amenazas adversarias a la plataforma de agentes de IA de OpenClaw y al mercado de habilidades ClawHub, utilizando el marco MITRE ATLAS diseñado específicamente para sistemas de IA/ML.

### 1.2 Alcance

| Componente               | Incluido | Notas                                                           |
| ------------------------ | -------- | --------------------------------------------------------------- |
| OpenClaw Agent Runtime   | Sí       | Ejecución central del agente, llamadas a herramientas, sesiones |
| Gateway                  | Sí       | Autenticación, enrutamiento, integración de canales             |
| Integraciones de canales | Sí       | WhatsApp, Telegram, Discord, Signal, Slack, etc.                |
| Mercado ClawHub          | Sí       | Publicación de habilidades, moderación, distribución            |
| Servidores MCP           | Sí       | Proveedores de herramientas externas                            |
| Dispositivos de usuario  | Parcial  | Aplicaciones móviles, clientes de escritorio                    |

### 1.3 Fuera de alcance

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
│  │  • Device Pairing (1h DM / 5m node grace period)           │   │
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

| Flujo | Origen  | Destino      | Datos                        | Protección                |
| ----- | ------- | ------------ | ---------------------------- | ------------------------- |
| F1    | Canal   | Gateway      | Mensajes de usuario          | TLS, AllowFrom            |
| F2    | Gateway | Agente       | Mensajes enrutados           | Aislamiento de sesión     |
| F3    | Agente  | Herramientas | Invocaciones de herramientas | Cumplimiento de políticas |
| F4    | Agente  | Externo      | solicitudes web_fetch        | Bloqueo SSRF              |
| F5    | ClawHub | Agente       | Código de habilidad          | Moderación, escaneo       |
| F6    | Agente  | Canal        | Respuestas                   | Filtrado de salida        |

---

## 3. Análisis de amenazas por táctica de ATLAS

### 3.1 Reconocimiento (AML.TA0002)

#### T-RECON-001: Descubrimiento de endpoints del agente

| Atributo                  | Valor                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0006 - Escaneo activo                                                                         |
| **Descripción**           | El atacante escanea en busca de endpoints de puerta de enlace de OpenClaw expuestos                |
| **Vector de ataque**      | Escaneo de red, consultas en Shodan, enumeración de DNS                                            |
| **Componentes afectados** | Puerta de enlace, endpoints de API expuestos                                                       |
| **Mitigaciones actuales** | Opción de autenticación de Tailscale, enlazar a loopback por defecto                               |
| **Riesgo residual**       | Medio - Puertas de enlace públicas descubribles                                                    |
| **Recomendaciones**       | Documentar el despliegue seguro, añadir limitación de velocidad en los endpoints de descubrimiento |

#### T-RECON-002: Sondeo de integración de canales

| Atributo                  | Valor                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0006 - Escaneo activo                                                               |
| **Descripción**           | El atacante sondea los canales de mensajería para identificar cuentas gestionadas por IA |
| **Vector de ataque**      | Envío de mensajes de prueba, observación de patrones de respuesta                        |
| **Componentes afectados** | Todas las integraciones de canales                                                       |
| **Mitigaciones actuales** | Ninguna específica                                                                       |
| **Riesgo residual**       | Bajo - Valor limitado solo con el descubrimiento                                         |
| **Recomendaciones**       | Considerar la aleatorización del tiempo de respuesta                                     |

---

### 3.2 Acceso inicial (AML.TA0004)

#### T-ACCESS-001: Intercepción de código de emparejamiento

| Atributo                  | Valor                                                                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de inferencia del modelo de IA                                                                                                             |
| **Descripción**           | El atacante intercepta el código de emparejamiento durante el período de gracia de emparejamiento (1h para emparejamiento de canal DM, 5m para emparejamiento de nodo) |
| **Vector de ataque**      | Mirar por encima del hombro (shoulder surfing), olfateo de red, ingeniería social                                                                                      |
| **Componentes afectados** | Sistema de emparejamiento de dispositivos                                                                                                                              |
| **Mitigaciones actuales** | Caducidad de 1h (emparejamiento DM) / 5m (emparejamiento de nodo), códigos enviados a través del canal existente                                                       |
| **Riesgo residual**       | Medio - Período de gracia explotable                                                                                                                                   |
| **Recomendaciones**       | Reducir el período de gracia, añadir paso de confirmación                                                                                                              |

#### T-ACCESS-002: Suplantación de AllowFrom

| Atributo                  | Valor                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de inferencia del modelo de IA                                         |
| **Descripción**           | El atacante suplanta la identidad del remitente permitido en el canal                              |
| **Vector de ataque**      | Depende del canal - suplantación de número de teléfono, suplantación de nombre de usuario          |
| **Componentes afectados** | Validación de AllowFrom por canal                                                                  |
| **Mitigaciones actuales** | Verificación de identidad específica del canal                                                     |
| **Riesgo residual**       | Medio - Algunos canales son vulnerables a la suplantación                                          |
| **Recomendaciones**       | Documentar los riesgos específicos del canal, añadir verificación criptográfica cuando sea posible |

#### T-ACCESS-003: Token Theft

| Atributo                  | Valor                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0040 - AI Model Inference API Access                                                        |
| **Descripción**           | El atacante roba tokens de autenticación de archivos de configuración                            |
| **Vector de ataque**      | Malware, acceso no autorizado al dispositivo, exposición de copias de seguridad de configuración |
| **Componentes afectados** | ~/.openclaw/credentials/, almacenamiento de configuración                                        |
| **Mitigaciones actuales** | Permisos de archivos                                                                             |
| **Riesgo residual**       | Alto: Tokens almacenados en texto plano                                                          |
| **Recomendaciones**       | Implementar cifrado de tokens en reposo, añadir rotación de tokens                               |

---

### 3.3 Execution (AML.TA0005)

#### T-EXEC-001: Direct Prompt Injection

| Atributo                  | Valor                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0051.000 - LLM Prompt Injection: Direct                                                          |
| **Descripción**           | El atacante envía instrucciones manipuladas para alterar el comportamiento del agente                 |
| **Vector de ataque**      | Mensajes del canal que contienen instrucciones adversarias                                            |
| **Componentes afectados** | LLM del agente, todas las superficies de entrada                                                      |
| **Mitigaciones actuales** | Detección de patrones, encapsulamiento de contenido externo                                           |
| **Riesgo residual**       | Crítico: Solo detección, sin bloqueo; los ataques sofisticados lo eluden                              |
| **Recomendaciones**       | Implementar defensa multicapa, validación de salida, confirmación del usuario para acciones sensibles |

#### T-EXEC-002: Indirect Prompt Injection

| Atributo                  | Valor                                                                    |
| ------------------------- | ------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0051.001 - LLM Prompt Injection: Indirect                           |
| **Descripción**           | El atacante incrusta instrucciones maliciosas en el contenido recuperado |
| **Vector de ataque**      | URL maliciosas, correos electrónicos envenenados, webhooks comprometidos |
| **Componentes afectados** | web_fetch, ingesta de correo electrónico, fuentes de datos externas      |
| **Mitigaciones actuales** | Encapsulamiento de contenido con etiquetas XML y aviso de seguridad      |
| **Riesgo residual**       | Alto: El LLM puede ignorar las instrucciones del encapsulamiento         |
| **Recomendaciones**       | Implementar saneamiento de contenido, contextos de ejecución separados   |

#### T-EXEC-003: Tool Argument Injection

| Atributo                  | Valor                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0051.000 - LLM Prompt Injection: Direct                                                |
| **Descripción**           | El atacante manipula los argumentos de las herramientas mediante inyección de instrucciones |
| **Vector de ataque**      | Instrucciones manipuladas que influyen en los valores de los parámetros de las herramientas |
| **Componentes afectados** | Todas las invocaciones de herramientas                                                      |
| **Mitigaciones actuales** | Aprobaciones de ejecución para comandos peligrosos                                          |
| **Riesgo residual**       | Alto: Depende del criterio del usuario                                                      |
| **Recomendaciones**       | Implementar validación de argumentos, llamadas a herramientas parametrizadas                |

#### T-EXEC-004: Ejecución de Aprobación de Omisión

| Atributo                  | Valor                                                                     |
| ------------------------- | ------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0043 - Crear Datos Adversarios                                       |
| **Descripción**           | El atacante crea comandos que omiten la lista de permitidos de aprobación |
| **Vector de Ataque**      | Ofuscación de comandos, explotación de alias, manipulación de rutas       |
| **Componentes Afectados** | exec-approvals.ts, lista de permitidos de comandos                        |
| **Mitigaciones Actuales** | Lista de permitidos + modo de pregunta                                    |
| **Riesgo Residual**       | Alto: sin saneamiento de comandos                                         |
| **Recomendaciones**       | Implementar normalización de comandos, expandir lista de bloqueados       |

---

### 3.4 Persistencia (AML.TA0006)

#### T-PERSIST-001: Instalación de Habilidad Maliciosa

| Atributo                  | Valor                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0010.001 - Compromiso de la Cadena de Suministro: Software de IA                               |
| **Descripción**           | El atacante publica una habilidad maliciosa en ClawHub                                              |
| **Vector de Ataque**      | Crear cuenta, publicar habilidad con código malicioso oculto                                        |
| **Componentes Afectados** | ClawHub, carga de habilidades, ejecución del agente                                                 |
| **Mitigaciones Actuales** | Verificación de la antigüedad de la cuenta de GitHub, indicadores de moderación basados en patrones |
| **Riesgo Residual**       | Crítico: sin sandboxing, revisión limitada                                                          |
| **Recomendaciones**       | Integración con VirusTotal (en progreso), sandboxing de habilidades, revisión comunitaria           |

#### T-PERSIST-002: Envenenamiento de Actualización de Habilidad

| Atributo                  | Valor                                                                             |
| ------------------------- | --------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0010.001 - Compromiso de la Cadena de Suministro: Software de IA             |
| **Descripción**           | El atacante compromete una habilidad popular y envía una actualización maliciosa  |
| **Vector de Ataque**      | Compromiso de cuenta, ingeniería social del propietario de la habilidad           |
| **Componentes Afectados** | Versionamiento de ClawHub, flujos de actualización automática                     |
| **Mitigaciones Actuales** | Huella digital de versiones                                                       |
| **Riesgo Residual**       | Alto: las actualizaciones automáticas pueden extraer versiones maliciosas         |
| **Recomendaciones**       | Implementar firma de actualizaciones, capacidad de reversión, fijación de versión |

#### T-PERSIST-003: Manipulación de la Configuración del Agente

| Atributo                  | Valor                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0010.002 - Compromiso de la Cadena de Suministro: Datos                                     |
| **Descripción**           | El atacante modifica la configuración del agente para persistir el acceso                        |
| **Vector de Ataque**      | Modificación del archivo de configuración, inyección de configuraciones                          |
| **Componentes Afectados** | Configuración del agente, políticas de herramientas                                              |
| **Mitigaciones Actuales** | Permisos de archivos                                                                             |
| **Riesgo Residual**       | Medio: requiere acceso local                                                                     |
| **Recomendaciones**       | Verificación de integridad de configuración, registro de auditoría para cambios de configuración |

---

### 3.5 Evasión de defensas (AML.TA0007)

#### T-EVADE-001: Omisión de patrones de moderación

| Atributo                  | Valor                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0043 - Crear datos adversarios                                                   |
| **Descripción**           | El atacante crea contenido de habilidades para evadir los patrones de moderación      |
| **Vector de ataque**      | Homoglifos Unicode, trucos de codificación, carga dinámica                            |
| **Componentes afectados** | moderation.ts de ClawHub                                                              |
| **Mitigaciones actuales** | FLAG_RULES basados en patrones                                                        |
| **Riesgo residual**       | Alto: las expresiones regulares simples se omiten fácilmente                          |
| **Recomendaciones**       | Agregar análisis de comportamiento (VirusTotal Code Insight), detección basada en AST |

#### T-EVADE-002: Escape de contenedor de contenido

| Atributo                  | Valor                                                                        |
| ------------------------- | ---------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0043 - Crear datos adversarios                                          |
| **Descripción**           | El atacante crea contenido que escapa del contexto del contenedor XML        |
| **Vector de ataque**      | Manipulación de etiquetas, confusión de contexto, anulación de instrucciones |
| **Componentes afectados** | Contenedor de contenido externo                                              |
| **Mitigaciones actuales** | Etiquetas XML + aviso de seguridad                                           |
| **Riesgo residual**       | Medio: se descubren escapes nuevos regularmente                              |
| **Recomendaciones**       | Múltiples capas de contenedor, validación del lado de salida                 |

---

### 3.6 Descubrimiento (AML.TA0008)

#### T-DISC-001: Enumeración de herramientas

| Atributo                  | Valor                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de inferencia de modelo de IA                                     |
| **Descripción**           | El atacante enumera las herramientas disponibles a través del uso de indicaciones (prompting) |
| **Vector de ataque**      | Consultas de estilo "¿Qué herramientas tienes?"                                               |
| **Componentes afectados** | Registro de herramientas del agente                                                           |
| **Mitigaciones actuales** | Ninguna específica                                                                            |
| **Riesgo residual**       | Bajo: las herramientas generalmente están documentadas                                        |
| **Recomendaciones**       | Considerar controles de visibilidad de herramientas                                           |

#### T-DISC-002: Extracción de datos de sesión

| Atributo                  | Valor                                                             |
| ------------------------- | ----------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0040 - Acceso a la API de inferencia de modelo de IA         |
| **Descripción**           | El atacante extrae datos confidenciales del contexto de la sesión |
| **Vector de ataque**      | Consultas de estilo "¿Qué discutimos?", sondeo del contexto       |
| **Componentes afectados** | Transcripciones de sesión, ventana de contexto                    |
| **Mitigaciones actuales** | Aislamiento de sesión por remitente                               |
| **Riesgo residual**       | Medio: los datos dentro de la sesión son accesibles               |
| **Recomendaciones**       | Implementar la redacción de datos confidenciales en el contexto   |

---

### 3.7 Recopilación y exfiltración (AML.TA0009, AML.TA0010)

#### T-EXFIL-001: Robo de datos mediante web_fetch

| Atributo                  | Valor                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0009 - Recopilación                                                                         |
| **Descripción**           | El atacante exfiltra datos instruyendo al agente para que los envíe a una URL externa            |
| **Vector de ataque**      | Inyección de prompt que provoca que el agente envíe datos mediante POST al servidor del atacante |
| **Componentes afectados** | Herramienta web_fetch                                                                            |
| **Mitigaciones actuales** | Bloqueo de SSRF para redes internas                                                              |
| **Riesgo residual**       | Alto: se permiten URL externas                                                                   |
| **Recomendaciones**       | Implementar lista blanca de URL, conocimiento de la clasificación de datos                       |

#### T-EXFIL-002: Envío de mensajes no autorizado

| Atributo                  | Valor                                                                          |
| ------------------------- | ------------------------------------------------------------------------------ |
| **ID de ATLAS**           | AML.T0009 - Recopilación                                                       |
| **Descripción**           | El atacante provoca que el agente envíe mensajes que contienen datos sensibles |
| **Vector de ataque**      | Inyección de prompt que provoca que el agente envíe un mensaje al atacante     |
| **Componentes afectados** | Herramienta de mensajes, integraciones de canales                              |
| **Mitigaciones actuales** | Regulación de mensajería saliente                                              |
| **Riesgo residual**       | Medio: la regulación puede evitarse                                            |
| **Recomendaciones**       | Requerir confirmación explícita para nuevos destinatarios                      |

#### T-EXFIL-003: Recolección de credenciales

| Atributo                  | Valor                                                                         |
| ------------------------- | ----------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0009 - Recopilación                                                      |
| **Descripción**           | Habilidad maliciosa cosecha credenciales del contexto del agente              |
| **Vector de ataque**      | El código de la habilidad lee variables de entorno, archivos de configuración |
| **Componentes afectados** | Entorno de ejecución de habilidades                                           |
| **Mitigaciones actuales** | Ninguna específica para habilidades                                           |
| **Riesgo residual**       | Crítico: las habilidades se ejecutan con privilegios de agente                |
| **Recomendaciones**       | Sandbox de habilidades, aislamiento de credenciales                           |

---

### 3.8 Impacto (AML.TA0011)

#### T-IMPACT-001: Ejecución de comandos no autorizada

| Atributo                  | Valor                                                                   |
| ------------------------- | ----------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0031 - Erosionar la integridad del modelo de IA                    |
| **Descripción**           | El atacante ejecuta comandos arbitrarios en el sistema del usuario      |
| **Vector de ataque**      | Inyección de prompt combinada con la omisión de aprobación de ejecución |
| **Componentes afectados** | Herramienta Bash, ejecución de comandos                                 |
| **Mitigaciones actuales** | Aprobaciones de ejecución, opción de sandbox de Docker                  |
| **Riesgo residual**       | Crítico: ejecución en el host sin sandbox                               |
| **Recomendaciones**       | Sandbox por defecto, mejorar la experiencia de usuario de aprobaciones  |

#### T-IMPACT-002: Agotamiento de recursos (DoS)

| Atributo                  | Valor                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0031 - Erosionar la integridad del modelo de IA                   |
| **Descripción**           | El atacante agota créditos de API o recursos de cómputo                |
| **Vector de ataque**      | Inundación automatizada de mensajes, llamadas a herramientas costosas  |
| **Componentes afectados** | Pasarela, sesiones de agente, proveedor de API                         |
| **Mitigaciones actuales** | Ninguna                                                                |
| **Riesgo residual**       | Alto: sin limitación de velocidad                                      |
| **Recomendaciones**       | Implementar límites de velocidad por remitente, presupuestos de costos |

#### T-IMPACT-003: Daño a la reputación

| Atributo                  | Valor                                                                      |
| ------------------------- | -------------------------------------------------------------------------- |
| **ID de ATLAS**           | AML.T0031 - Erosión de la integridad del modelo de IA                      |
| **Descripción**           | El atacante hace que el agente envíe contenido dañino/ofensivo             |
| **Vector de ataque**      | Inyección de avisos (prompt injection) que provoca respuestas inapropiadas |
| **Componentes afectados** | Generación de salida, mensajería de canales                                |
| **Mitigaciones actuales** | Políticas de contenido del proveedor de LLM                                |
| **Riesgo residual**       | Medio: los filtros del proveedor son imperfectos                           |
| **Recomendaciones**       | Capa de filtrado de salida, controles de usuario                           |

---

## 4. Análisis de la cadena de suministro de ClawHub

### 4.1 Controles de seguridad actuales

| Control                           | Implementación              | Eficacia                                                      |
| --------------------------------- | --------------------------- | ------------------------------------------------------------- |
| Antigüedad de la cuenta de GitHub | `requireGitHubAccountAge()` | Medio: aumenta la barrera para nuevos atacantes               |
| Sanitización de rutas             | `sanitizePath()`            | Alto: evita el recorrido de rutas                             |
| Validación de tipo de archivo     | `isTextFile()`              | Medio: solo archivos de texto, pero aún pueden ser maliciosos |
| Límites de tamaño                 | Paquete total de 50 MB      | Alto: evita el agotamiento de recursos                        |
| SKILL.md obligatorio              | Léame obligatorio           | Bajo valor de seguridad: solo informativo                     |
| Moderación de patrones            | FLAG_RULES en moderation.ts | Bajo: se elude fácilmente                                     |
| Estado de moderación              | campo `moderationStatus`    | Medio: posible revisión manual                                |

### 4.2 Patrones de indicadores de moderación

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

- Solo comprueba slug, displayName, summary, frontmatter, metadata, rutas de archivo
- No analiza el contenido real del código de la habilidad
- Las expresiones regulares simples se eluden fácilmente con ofuscación
- Sin análisis de comportamiento

### 4.3 Mejoras planificadas

| Mejora                     | Estado                                   | Impacto                                                              |
| -------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Integración con VirusTotal | En progreso                              | Alto: análisis de comportamiento de Code Insight                     |
| Informes de la comunidad   | Parcial (existe la tabla `skillReports`) | Medio                                                                |
| Registro de auditoría      | Parcial (existe la tabla `auditLogs`)    | Medio                                                                |
| Sistema de insignias       | Implementado                             | Medio - `highlighted`, `official`, `deprecated`, `redactionApproved` |

---

## 5. Matriz de riesgos

### 5.1 Probabilidad vs. Impacto

| ID de amenaza | Probabilidad | Impacto | Nivel de riesgo | Prioridad |
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

| ID    | Recomendación                                        | Aborda                     |
| ----- | ---------------------------------------------------- | -------------------------- |
| R-001 | Completar la integración con VirusTotal              | T-PERSIST-001, T-EVADE-001 |
| R-002 | Implementar el sandboxing de habilidades             | T-PERSIST-001, T-EXFIL-003 |
| R-003 | Agregar validación de salida para acciones sensibles | T-EXEC-001, T-EXEC-002     |

### 6.2 Corto plazo (P1)

| ID    | Recomendación                                            | Aborda       |
| ----- | -------------------------------------------------------- | ------------ |
| R-004 | Implementar la limitación de velocidad                   | T-IMPACT-002 |
| R-005 | Agregar cifrado de tokens en reposo                      | T-ACCESS-003 |
| R-006 | Mejorar la UX y la validación de aprobación de ejecución | T-EXEC-004   |
| R-007 | Implementar la lista de permitidos de URL para web_fetch | T-EXFIL-001  |

### 6.3 Mediano plazo (P2)

| ID    | Recomendación                                                   | Aborda        |
| ----- | --------------------------------------------------------------- | ------------- |
| R-008 | Agregar verificación criptográfica del canal cuando sea posible | T-ACCESS-002  |
| R-009 | Implementar la verificación de integridad de la configuración   | T-PERSIST-003 |
| R-010 | Agregar firma de actualizaciones y fijación de versiones        | T-PERSIST-002 |

---

## 7. Apéndices

### 7.1 Mapeo de técnicas de ATLAS

| ID de ATLAS   | Nombre de la técnica                           | Amenazas de OpenClaw                                             |
| ------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| AML.T0006     | Escaneo activo                                 | T-RECON-001, T-RECON-002                                         |
| AML.T0009     | Recolección                                    | T-EXFIL-001, T-EXFIL-002, T-EXFIL-003                            |
| AML.T0010.001 | Cadena de suministro: software de IA           | T-PERSIST-001, T-PERSIST-002                                     |
| AML.T0010.002 | Cadena de suministro: datos                    | T-PERSIST-003                                                    |
| AML.T0031     | Erosionar la integridad del modelo de IA       | T-IMPACT-001, T-IMPACT-002, T-IMPACT-003                         |
| AML.T0040     | Acceso a la API de inferencia del modelo de IA | T-ACCESS-001, T-ACCESS-002, T-ACCESS-003, T-DISC-001, T-DISC-002 |
| AML.T0043     | Crear datos adversarios                        | T-EXEC-004, T-EVADE-001, T-EVADE-002                             |
| AML.T0051.000 | Inyección de indicaciones LLM: directa         | T-EXEC-001, T-EXEC-003                                           |
| AML.T0051.001 | Inyección de prompt de LLM: Indirecta          | T-EXEC-002                                                       |

### 7.2 Archivos de seguridad clave

| Ruta                                | Propósito                               | Nivel de riesgo |
| ----------------------------------- | --------------------------------------- | --------------- |
| `src/infra/exec-approvals.ts`       | Lógica de aprobación de comandos        | **Crítico**     |
| `src/gateway/auth.ts`               | Autenticación de puerta de enlace       | **Crítico**     |
| `src/infra/net/ssrf.ts`             | Protección SSRF                         | **Crítico**     |
| `src/security/external-content.ts`  | Mitigación de inyección de prompts      | **Crítico**     |
| `src/agents/sandbox/tool-policy.ts` | Aplicación de políticas de herramientas | **Crítico**     |
| `src/routing/resolve-route.ts`      | Aislamiento de sesión                   | **Medio**       |

### 7.3 Glosario

| Término              | Definición                                                       |
| -------------------- | ---------------------------------------------------------------- |
| **ATLAS**            | Adversarial Threat Landscape para Sistemas de IA de MITRE        |
| **ClawHub**          | Mercado de habilidades de OpenClaw                               |
| **Gateway**          | Capa de enrutamiento de mensajes y autenticación de OpenClaw     |
| **MCP**              | Model Context Protocol - interfaz de proveedor de herramientas   |
| **Prompt Injection** | Ataque donde se incrustan instrucciones maliciosas en la entrada |
| **Skill**            | Extensión descargable para agentes de OpenClaw                   |
| **SSRF**             | Server-Side Request Forgery                                      |

---

_Este modelo de amenazas es un documento vivo. Informe de problemas de seguridad a security@openclaw.ai_

## Relacionado

- [Verificación formal](/es/security/formal-verification)
- [Contribuir al modelo de amenazas](/es/security/CONTRIBUTING-THREAT-MODEL)
