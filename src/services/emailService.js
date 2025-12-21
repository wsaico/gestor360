/**
 * Servicio de envío de correos (Email Service)
 * Diseñado para integrarse con proveedores como Resend, SendGrid o Supabase Functions.
 * 
 * NOTA: Usa la Edge Function 'send-email-alerts' para enviar vía Brevo de forma segura.
 */
import supabase from './supabase'

class EmailService {

    /**
     * Envía el correo de bienvenida con credenciales
     * @param {Object} user - Datos del usuario (nombre, email)
     * @param {string} password - Contraseña generada o asignada
     */
    async sendWelcomeEmail(user, password) {
        try {
            console.log(`[EmailService] Preparando envío a: ${user.email}`)

            const htmlContent = this.getWelcomeTemplate(user, password)

            // AQUI: Integración real.
            // Opción 1: Llamar a una Edge Function de Supabase (Recomendado)
            // await supabase.functions.invoke('send-email', { body: { to: user.email, subject: 'Bienvenido', html: htmlContent } })

            // Opción 2: Llamada directa a API externa (Si se decide usar API Keys en frontend, que no es ideal)
            // await fetch('https://api.resend.com/emails', ...)

            // POR AHORA: Simulamos el éxito y logueamos el contenido para debug
            console.log('--- EMAIL SIMULADO ---')
            console.log('Para:', user.email)
            console.log('Asunto: Bienvenido a Gestor360 - Tus Credenciales')
            // console.log(htmlContent) 
            console.log('----------------------')

            return { success: true, message: 'Correo enviado (Simulado)' }
        } catch (error) {
            console.error('[EmailService] Error enviando correo:', error)
            return { success: false, error }
        }
    }

    /**
     * Genera el HTML del correo de bienvenida
     */
    getWelcomeTemplate(user, password) {
        // Estilos inline para compatibilidad con clientes de correo
        const styles = {
            container: "font-family: 'Helvetica Neue', Arial, sans-serif; max-w-2xl; margin: 0 auto; background-color: #f9fafb; padding: 20px;",
            card: "background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;",
            header: "background-color: #2563EB; padding: 30px; text-align: center;",
            headerText: "color: #ffffff; font-size: 24px; font-weight: bold; margin: 0;",
            body: "padding: 40px; color: #374151;",
            h2: "color: #111827; font-size: 20px; font-weight: 600; margin-bottom: 20px;",
            p: "margin-bottom: 16px; line-height: 1.6;",
            credentialsBox: "background-color: #F3F4F6; border-left: 4px solid #2563EB; padding: 20px; margin: 24px 0; border-radius: 4px;",
            label: "display: block; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 4px;",
            value: "display: block; font-size: 16px; font-weight: 500; color: #111827; font-family: monospace; margin-bottom: 12px;",
            buttonContainer: "text-align: center; margin-top: 32px;",
            button: "background-color: #2563EB; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;",
            footer: "margin-top: 32px; text-align: center; font-size: 12px; color: #9CA3AF;"
        }

        return `
      <div style="${styles.container}">
        <div style="${styles.card}">
          <!-- Header -->
          <div style="${styles.header}">
            <h1 style="${styles.headerText}">Bienvenido a Gestor360</h1>
          </div>
          
          <!-- Body -->
          <div style="${styles.body}">
            <h2 style="${styles.h2}">Hola, ${user.username}</h2>
            <p style="${styles.p}">
              Nos complace darte la bienvenida al equipo. Se ha creado una cuenta para que puedas acceder al sistema <b>Gestor360</b>.
            </p>
            <p style="${styles.p}">
              A continuación encontrarás tus credenciales de acceso provisorias. Te recomendamos cambiar tu contraseña al iniciar sesión por primera vez.
            </p>

            <!-- Credenciales -->
            <div style="${styles.credentialsBox}">
              <span style="${styles.label}">Usuario / Email</span>
              <span style="${styles.value}">${user.email}</span>
              
              <span style="${styles.label}" style="margin-top: 12px;">Contraseña Temporal</span>
              <span style="${styles.value}">${password}</span>
            </div>

            <div style="${styles.buttonContainer}">
              <a href="${window.location.origin}/login" style="${styles.button}">
                Iniciar Sesión
              </a>
            </div>
            
            <p style="${styles.p}" style="margin-top: 32px; font-size: 14px;">
              Si tienes problemas para acceder, por favor contacta al administrador del sistema o al departamento de TI.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
             <p style="${styles.footer}">
               &copy; ${new Date().getFullYear()} Gestor360 System. Todos los derechos reservados.<br>
               Este es un correo automático, por favor no respondas a esta dirección.
             </p>
          </div>
        </div>
      </div>
    `
    }
}

export default new EmailService()
