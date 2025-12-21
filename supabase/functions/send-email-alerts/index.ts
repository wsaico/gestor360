// function: supabase/functions/send-email-alerts/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- HELPER: Date Formatting ---
const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

// --- HELPER: Professional HTML Template ---
const generateEmailTemplate = (title: string, contentHtml: string, settings: any) => {
    const companyName = settings.get("COMPANY_NAME") || "Gestor360";
    const logoUrl = settings.get("COMPANY_LOGO_URL") || "https://placehold.co/200x50?text=Gestor360";
    const primaryColor = "#1e40af"; // Default Blue-800
    const companyAddress = settings.get("COMPANY_ADDRESS") || "Plataforma de Gestión Operativa";

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background-color: ${primaryColor}; padding: 30px 20px; text-align: center; }
        .header img { max-height: 60px; object-fit: contain; background: white; padding: 5px; border-radius: 4px; }
        .content { padding: 40px 30px; color: #374151; line-height: 1.6; }
        .content h1 { color: #111827; font-size: 24px; margin-bottom: 20px; font-weight: 700; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        .alert-group { margin-bottom: 25px; }
        .alert-group h3 { color: ${primaryColor}; font-size: 16px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: flex; align-items: center; }
        .alert-list { list-style: none; padding: 0; margin: 0; }
        .alert-item { background-color: #f9fafb; border-left: 4px solid ${primaryColor}; padding: 12px 16px; margin-bottom: 8px; border-radius: 0 4px 4px 0; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
        .alert-item .main-text { font-weight: 500; color: #1f2937; }
        .alert-item .meta-text { color: #6b7280; font-size: 12px; }
        .alert-item .urgent { color: #dc2626; font-weight: bold; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
        .btn { display: inline-block; background-color: ${primaryColor}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName}" />
        </div>
        <div class="content">
          <h1>${title}</h1>
          ${contentHtml}
        </div>
        <div class="footer">
          <p>${companyName}<br>${companyAddress}</p>
          <p style="margin-top: 10px;">Enviado automáticamente por el sistema Gestor360</p>
        </div>
      </div>
    </body>
    </html>
    `;
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 2. Load Configuration
        const { data: settingsData, error: settingsError } = await supabaseClient
            .from("app_settings")
            .select("*");

        if (settingsError) throw settingsError;

        // Map settings for easy access
        const settingsMap = new Map();
        settingsData?.forEach(s => settingsMap.set(s.key, s.value));
        const getSetting = (key: string) => settingsMap.get(key);
        const isEnabled = (key: string) => getSetting(key) === "true";

        // GLOBAL CHECK
        if (!isEnabled("ENABLE_NOTIFICATIONS_GLOBAL")) {
            return new Response(JSON.stringify({ message: "Notifications disabled globally" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const brevoKey = getSetting("BREVO_API_KEY");
        const senderEmail = getSetting("SMTP_SENDER_EMAIL") || "no-reply@gestor360.com";

        // Debug Checks
        if (!settingsData || settingsData.length === 0 || !brevoKey) {
            const visibleKeys = settingsData?.map(s => s.key).join(", ");
            throw new Error(`DEBUG: Configuration Error. Keys visible: [${visibleKeys}]`);
        }

        // Test Mode
        let body = {};
        try { body = await req.json(); } catch (e) { }

        if (body.action === 'test_connection') {
            const targetEmail = body.email;
            const testHtml = generateEmailTemplate(
                "Prueba de Conexión Exitosa",
                `<p>El sistema de notificaciones está correctamente configurado y conectado con Brevo.</p>
                 <div class="alert-group">
                    <h3>Configuración Actual</h3>
                    <ul class="alert-list">
                        <li class="alert-item">
                            <span class="main-text">Remitente</span>
                            <span class="meta-text">${senderEmail}</span>
                        </li>
                         <li class="alert-item">
                            <span class="main-text">Empresa</span>
                            <span class="meta-text">${getSetting("COMPANY_NAME")}</span>
                        </li>
                    </ul>
                 </div>
                 <p style="text-align: center;"><a href="#" class="btn">Ir al Dashboard</a></p>`,
                settingsMap
            );

            const res = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: { "Content-Type": "application/json", "api-key": brevoKey },
                body: JSON.stringify({
                    sender: { email: senderEmail, name: "Gestor360 System" },
                    to: [{ email: targetEmail }],
                    subject: "[Gestor360] Prueba de Conexión SMTP",
                    htmlContent: testHtml,
                }),
            });

            if (!res.ok) throw new Error(`Brevo Error: ${await res.text()}`);
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 3. COLLECT ALERTS
        let allAlerts = [];

        // --- A. EPP Renewals ---
        if (isEnabled("ENABLE_ALERT_EPPS")) {
            const { data: epps } = await supabaseClient
                .from("vw_renewals_pending")
                .select("*")
                .lt("days_until_renewal", 30);

            if (epps) {
                allAlerts.push(...epps.map(e => ({
                    station_id: e.station_id,
                    type: 'RENOVACIÓN EPP',
                    text: `${e.employee_name} - ${e.item_name}`,
                    meta: `Vence: ${formatDate(e.next_renewal_date)}`,
                    urgent: e.days_until_renewal < 7
                })));
            }
        }

        // --- B. Low Stock ---
        if (isEnabled("ENABLE_ALERT_LOW_STOCK")) {
            const { data: allItems } = await supabaseClient
                .from("epp_items")
                .select("id, name, stock_current, stock_min, station_id")
                .eq("is_active", true);

            if (allItems) {
                const lowStock = allItems.filter(i => i.stock_current < i.stock_min);
                allAlerts.push(...lowStock.map(i => ({
                    station_id: i.station_id,
                    type: 'STOCK CRÍTICO',
                    text: i.name,
                    meta: `Stock: ${i.stock_current} (Min: ${i.stock_min})`,
                    urgent: true
                })));
            }
        }

        // --- C. Birthdays ---
        if (isEnabled("ENABLE_ALERT_BIRTHDAYS")) {
            const { data: employees } = await supabaseClient
                .from("employees")
                .select("id, full_name, birth_date, station_id")
                .neq("status", "CESADO")
                .not("birth_date", "is", null);

            if (employees) {
                const today = new Date();
                const nextWeek = new Date();
                nextWeek.setDate(today.getDate() + 7);

                employees.forEach(emp => {
                    const dob = new Date(emp.birth_date);
                    // Set current year
                    dob.setFullYear(today.getFullYear());
                    // Handle year wrap for December
                    if (dob < today && (today.getMonth() !== dob.getMonth() || today.getDate() !== dob.getDate())) {
                        dob.setFullYear(today.getFullYear() + 1);
                    }

                    const diffDays = Math.ceil((dob.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    if (diffDays >= 0 && diffDays <= 7) {
                        allAlerts.push({
                            station_id: emp.station_id,
                            type: 'CUMPLEAÑOS',
                            text: emp.full_name,
                            meta: diffDays === 0 ? '¡Es HOY!' : `En ${diffDays} días (${formatDate(emp.birth_date)})`,
                            urgent: diffDays === 0
                        });
                    }
                });
            }
        }

        // --- D. Documents (EMO & Photocheck) ---
        if (isEnabled("ENABLE_ALERT_EMO") || isEnabled("ENABLE_ALERT_PHOTOCHECK")) {
            // Fetch all docs expiring in next 30 days
            const today = new Date();
            const thirtyDays = new Date();
            thirtyDays.setDate(today.getDate() + 30);

            const { data: docs } = await supabaseClient
                .from("employee_docs")
                .select("*, employee:employees(full_name, station_id, status)")
                .in("document_type", ["EMO", "PHOTOCHECK"])
                .gte("expiry_date", today.toISOString().split('T')[0]) // Not already expired (optional, maybe we want expired too)
                .lte("expiry_date", thirtyDays.toISOString().split('T')[0]);

            if (docs) {
                docs.forEach(doc => {
                    // Filter inactive employees logic if needed (assumed checked by status)
                    if (doc.employee?.status === 'CESADO') return;

                    const typeLabel = doc.document_type === 'EMO' ? 'EXAMEN MÉDICO' : 'FOTOCHECK';
                    const isEnabledType = doc.document_type === 'EMO' ? isEnabled("ENABLE_ALERT_EMO") : isEnabled("ENABLE_ALERT_PHOTOCHECK");

                    if (isEnabledType) {
                        allAlerts.push({
                            station_id: doc.employee?.station_id,
                            type: `VENCIMIENTO ${typeLabel}`,
                            text: doc.employee?.full_name,
                            meta: `Vence: ${formatDate(doc.expiry_date)}`,
                            urgent: false // Could calculate urgency based on date
                        });
                    }
                });
            }
        }

        // 4. GROUP AND SEND
        const stations = {};
        allAlerts.forEach(alert => {
            const sId = alert.station_id || 'UNKNOWN';
            if (!stations[sId]) stations[sId] = [];
            stations[sId].push(alert);
        });

        const results = [];

        for (const stationId of Object.keys(stations)) {
            if (stationId === 'UNKNOWN') continue; // Or send to Super Admin

            const stationAlerts = stations[stationId];
            if (stationAlerts.length === 0) continue;

            // Find Supervisors
            const { data: supervisors } = await supabaseClient
                .from("system_users")
                .select("email, first_name")
                .eq("station_id", stationId)
                .in("role", ["SUPERVISOR", "ADMIN"]);

            if (!supervisors || supervisors.length === 0) continue;

            // Build HTML Body
            // Group by Type for cleaner UI
            const alertsByType = {};
            stationAlerts.forEach(a => {
                if (!alertsByType[a.type]) alertsByType[a.type] = [];
                alertsByType[a.type].push(a);
            });

            let bodyHtml = `<p>Resumen de novedades operativas para su estación.</p>`;

            for (const [type, items] of Object.entries(alertsByType)) {
                bodyHtml += `
                 <div class="alert-group">
                    <h3>${type} (${items.length})</h3>
                    <ul class="alert-list">
                        ${items.map(item => `
                            <li class="alert-item">
                                <span class="main-text">${item.text}</span>
                                <span class="meta-text ${item.urgent ? 'urgent' : ''}">${item.meta}</span>
                            </li>
                        `).join('')}
                    </ul>
                 </div>`;
            }

            bodyHtml += `<p style="text-align: center;"><a href="#" class="btn">Gestionar Alertas</a></p>`;

            const finalHtml = generateEmailTemplate(
                `Novedades Estación`,
                bodyHtml,
                settingsMap
            );

            // Send
            for (const recipient of supervisors) {
                if (!recipient.email) continue;
                const res = await fetch("https://api.brevo.com/v3/smtp/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "api-key": brevoKey },
                    body: JSON.stringify({
                        sender: { email: senderEmail, name: "Gestor360 Alerts" },
                        to: [{ email: recipient.email, name: recipient.first_name }],
                        subject: `[Gestor360] 🔔 ${stationAlerts.length} Alertas - ${formatDate(new Date().toISOString())}`,
                        htmlContent: finalHtml,
                    }),
                });
                results.push({ email: recipient.email, status: res.status });
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
