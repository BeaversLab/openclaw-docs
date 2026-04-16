---
summary: "Alojar OpenClaw en Hostinger"
read_when:
  - Setting up OpenClaw on Hostinger
  - Looking for a managed VPS for OpenClaw
  - Using Hostinger 1-Click OpenClaw
title: "Hostinger"
---

# Hostinger

Ejecuta una pasarela OpenClaw persistente en [Hostinger](https://www.hostinger.com/openclaw) mediante un despliegue gestionado con **1 clic** o una instalación en **VPS**.

## Requisitos previos

- Una cuenta de Hostinger ([registro](https://www.hostinger.com/openclaw))
- Aproximadamente 5-10 minutos

## Opción A: OpenClaw con 1 clic

La forma más rápida de comenzar. Hostinger se encarga de la infraestructura, Docker y las actualizaciones automáticas.

<Steps>
  <Step title="Comprar e iniciar">
    1. Desde la [página de OpenClaw en Hostinger](https://www.hostinger.com/openclaw), elige un plan de OpenClaw gestionado y completa la compra.

    <Note>
    Durante la compra puedes seleccionar créditos de **Ready-to-Use AI** que se compran por adelantado y se integran al instante en OpenClaw — no se necesitan cuentas externas ni claves API de otros proveedores. Puedes empezar a chatear de inmediato. Alternativamente, proporciona tu propia clave de Anthropic, OpenAI, Google Gemini o xAI durante la configuración.
    </Note>

  </Step>

  <Step title="Seleccionar un canal de mensajería">
    Elige uno o más canales para conectar:

    - **WhatsApp** —— escanea el código QR que aparece en el asistente de configuración.
    - **Telegram** —— pega el token del bot obtenido de [BotFather](https://t.me/BotFather).

  </Step>

<Step title="Completar la instalación">Haz clic en **Finish** para desplegar la instancia. Una vez listo, accede al panel de OpenClaw desde **OpenClaw Overview** en hPanel.</Step>

</Steps>

## Opción B: OpenClaw en VPS

Mayor control sobre tu servidor. Hostinger despliega OpenClaw mediante Docker en tu VPS y lo gestionas a través del **Docker Manager** en hPanel.

<Steps>
  <Step title="Comprar un VPS">
    1. Desde la [página de OpenClaw en Hostinger](https://www.hostinger.com/openclaw), elige un plan de OpenClaw en VPS y completa la compra.

    <Note>
    Puedes seleccionar créditos de **Ready-to-Use AI** durante la compra — estos se compran por adelantado y se integran al instante en OpenClaw, por lo que puedes empezar a chatear sin cuentas externas ni claves API de otros proveedores.
    </Note>

  </Step>

  <Step title="Configurar OpenClaw">
    Una vez aprovisionado el VPS, completa los campos de configuración:

    - **Gateway token** —— se genera automáticamente; guárdalo para uso posterior.
    - **Número de WhatsApp** —— tu número con código de país (opcional).
    - **Token del bot de Telegram** —— desde [BotFather](https://t.me/BotFather) (opcional).
    - **Claves API** —— solo necesarias si no seleccionaste créditos Ready-to-Use AI durante la compra.

  </Step>

<Step title="Iniciar OpenClaw">Haz clic en **Deploy**. Una vez en ejecución, abre el panel de OpenClaw desde hPanel haciendo clic en **Open**.</Step>

</Steps>

Los registros, reinicios y actualizaciones se gestionan directamente desde la interfaz de Docker Manager en hPanel. Para actualizar, pulsa **Update** en Docker Manager y se descargará la última imagen.

## Verificar tu configuración

Envía «Hola» a tu asistente en el canal que conectaste. OpenClaw responderá y te guiará en las preferencias iniciales.

## Solución de problemas

**El panel no carga** —— Espera unos minutos a que el contenedor termine de aprovisionarse. Revisa los registros de Docker Manager en hPanel.

**El contenedor de Docker se reinicia continuamente** —— Abre los registros de Docker Manager y busca errores de configuración (tokens faltantes, claves API no válidas).

**El bot de Telegram no responde** —— Envía tu mensaje con el código de vinculación desde Telegram directamente como un mensaje en tu chat de OpenClaw para completar la conexión.

## Próximos pasos

- [Canales](/en/channels) —— conectar Telegram, WhatsApp, Discord y más
- [Configuración de la pasarela](/en/gateway/configuration) —— todas las opciones de configuración
