# Guía de Configuración: Brevo API Key

Para activar el envío de correos en Gestor360, necesitas una **API Key v3** de Brevo (antes Sendinblue). Sigue estos pasos:

## 1. Crear Cuenta / Iniciar Sesión
Ingresa a [Brevo.com](https://www.brevo.com/) e inicia sesión con tu cuenta.

## 2. Ir a la Sección SMTP & API
1. Haz clic en tu nombre o el nombre de tu empresa en la esquina superior derecha.
2. En el menú desplegable, selecciona **"SMTP y API"**.
   - O ve directo a este enlace: [https://app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api)

## 3. Generar la Clave (API Key)
1. Asegúrate de estar en la pestaña **"Claves API"** (API Keys). **NO** uses la pestaña SMTP.
2. Haz clic en el botón **"Generar una nueva clave API"** (+ Generate a new API key).
3. Dale un nombre a tu clave (ej: `Gestor360-Production`).
4. Haz clic en **Generar**.

## 4. Copiar y Guardar
1. **¡IMPORTANTE!** Copia la clave que aparece.
   - Debe comenzar con **`xkeysib-`**.
   - Si comienza con `xsmtpsib-`, es una clave SMTP y **NO funcionará**.
2. Brevo **no te la volverá a mostrar** completa, así que asegúrate de copiarla bien.

## 5. Configurar en Gestor360
1. Vuelve a tu sistema Gestor360.
2. Ve al menú **Admin > Configuración > Notificaciones**.
3. Pega la clave en el campo **"Brevo API Key (v3)"**.
4. En "Correo Remitente", usa el mismo correo con el que te registraste en Brevo (o uno validado en la sección "Remitentes e IP").
5. Guarda los cambios.

¡Listo! El sistema ahora podrá enviar alertas automáticas.
