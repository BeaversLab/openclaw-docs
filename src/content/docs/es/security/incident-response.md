---
summary: "Cómo OpenClaw clasifica, responde y da seguimiento a los incidentes de seguridad"
title: "Respuesta a incidentes"
read_when:
  - Responding to a security report or suspected security incident
  - Preparing a coordinated disclosure or patched security release
  - Reviewing post-incident follow-up expectations
---

## 1. Detección y clasificación

Monitoreamos las señales de seguridad de:

- Advisories de Seguridad de GitHub (GHSA) e informes privados de vulnerabilidades.
- Incidencias/discusiones públicas en GitHub cuando los informes no son sensibles.
- Señales automatizadas (por ejemplo, Dependabot, CodeQL, advisories de npm y escaneo de secretos).

Clasificación inicial:

1. Confirmar el componente afectado, la versión y el impacto en el límite de confianza.
2. Clasificar como problema de seguridad versus fortalecimiento/sin acción utilizando las reglas de alcance `SECURITY.md` y fuera de alcance del repositorio.
3. Un propietario del incidente responde en consecuencia.

## 2. Evaluación

Guía de gravedad:

- **Crítica:** Compromiso del paquete/lanzamiento/repositorio, explotación activa o omisión del límite de confianza sin autenticación con exposición de datos o control de alto impacto.
- **Alta:** Omisión verificada del límite de confianza que requiere condiciones previas limitadas (por ejemplo, acción autenticada pero no autorizada de alto impacto), o exposición de credenciales sensibles propiedad de OpenClaw.
- **Media:** Debilidad de seguridad significativa con impacto práctico pero explotabilidad limitada o requisitos sustanciales.
- **Baja:** Hallazgos de defensa en profundidad, denegación de servicio de alcance limitado o brechas de fortalecimiento/paridad sin una omisión demostrada del límite de confianza.

## 3. Respuesta

1. Confirmar la recepción al informante (de forma privada cuando sea sensible).
2. Reproducir en los lanzamientos compatibles y en el último `main`, luego implementar y validar un parche con cobertura de regresión.
3. Para incidentes críticos/alto, preparar lanzamientos parcheados lo más rápido posible.
4. Para incidentes medios/bajos, parchear en el flujo de lanzamiento normal y documentar la guía de mitigación.

## 4. Comunicación

Nos comunicamos a través de:

- Advisories de Seguridad de GitHub en el repositorio afectado.
- Entradas en las notas de la versión/changelog para las versiones corregidas.
- Seguimiento directo con el informante sobre el estado y la resolución.

Política de divulgación:

- Los incidentes críticos/alto deben recibir una divulgación coordinada, con la emisión de CVE cuando corresponda.
- Los hallazgos de fortalecimiento de bajo riesgo pueden documentarse en las notas de la versión o avisos sin CVE, dependiendo del impacto y la exposición del usuario.

## 5. Recuperación y seguimiento

Después de implementar la solución:

1. Verifica las correcciones en CI y en los artefactos de lanzamiento.
2. Realiza una breve revisión posterior al incidente (cronología, causa raíz, brecha de detección, plan de prevención).
3. Añade tareas de seguimiento de endurecimiento/pruebas/documentación y haz su seguimiento hasta su finalización.
