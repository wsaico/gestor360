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
        console.log("Starting send-email-alerts function");

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
        console.log(`Settings loaded. Global Enabled: ${isEnabled("ENABLE_NOTIFICATIONS_GLOBAL")}`);


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
        let body: any = {};
        try { body = await req.json(); } catch (e) { }

        // --- WEBHOOK MODE (Real-time Stock) ---
        if (body.record && body.type === 'UPDATE' && body.table === 'epp_items') {
            console.log("--> Webhook Triggered: Stock Update");

            if (!isEnabled("ENABLE_ALERT_LOW_STOCK")) {
                console.log("Low Stock Alerts disabled in settings. Skipping.");
                return new Response(JSON.stringify({ message: "Disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            const item = body.record;
            // Double check condition (redundant but safe)
            if (item.stock_current <= item.stock_min) {
                console.log(`Processing Critical Stock Alert for item: ${item.name}`);

                // Find Supervisors for this station
                const { data: supervisors } = await supabaseClient
                    .from("system_users")
                    .select("email, first_name")
                    .eq("station_id", item.station_id)
                    .in("role", ["SUPERVISOR", "ADMIN"]);

                if (supervisors && supervisors.length > 0) {
                    const html = generateEmailTemplate(
                        "⚠️ Alerta de Stock Crítico",
                        `<p>El siguiente ítem ha alcanzado el nivel mínimo de inventario.</p>
                         <div class="alert-group">
                            <h3>STOCK CRÍTICO</h3>
                            <ul class="alert-list">
                                <li class="alert-item">
                                    <span class="main-text">${item.name}</span>
                                    <span class="meta-text urgent">Stock: ${item.stock_current} (Min: ${item.stock_min})</span>
                                </li>
                            </ul>
                         </div>
                         <p>Por favor, gestiorne la reposición lo antes posible.</p>`,
                        settingsMap
                    );

                    for (const recipient of supervisors) {
                        if (!recipient.email) continue;
                        await fetch("https://api.brevo.com/v3/smtp/email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "api-key": brevoKey },
                            body: JSON.stringify({
                                sender: { email: senderEmail, name: "Gestor360 Alertas" },
                                to: [{ email: recipient.email, name: recipient.first_name }],
                                subject: `[Gestor360] ⚠️ Stock Crítico: ${item.name}`,
                                htmlContent: html,
                            }),
                        });
                    }
                    console.log(`Alert sent to ${supervisors.length} supervisors.`);
                } else {
                    console.log("No supervisors found for this station.");
                }
            } else {
                console.log("Stock is above minimum. No alert needed.");
            }

            return new Response(JSON.stringify({ success: true, mode: 'webhook' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // --- EXISTING ACTIONS ---


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

        // --- NEW: Generic Send Email Action ---
        if (body.action === 'send_email') {
            const { to, subject, html } = body;

            if (!to || !subject || !html) {
                throw new Error("Missing parameters for send_email action");
            }

            const res = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: { "Content-Type": "application/json", "api-key": brevoKey },
                body: JSON.stringify({
                    sender: { email: senderEmail, name: "Gestor360 System" },
                    to: [{ email: to }],
                    subject: subject,
                    htmlContent: html,
                }),
            });

            if (!res.ok) throw new Error(`Brevo Error: ${await res.text()}`);
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 3. COLLECT ALERTS AND SEND INDITIVUAL NOTIFICATIONS

        // --- A. EPP Renewals (Supervisor Only) ---
        if (isEnabled("ENABLE_ALERT_EPPS")) {
            const { data: epps } = await supabaseClient
                .from("vw_renewals_pending")
                .select("*")
                .lt("days_until_renewal", 30);

            if (epps) {
                // EPP alerts go to Supervisor Summary (collected in allAlerts below)
                allAlerts.push(...epps.map(e => ({
                    station_id: e.station_id,
                    type: 'RENOVACIÓN EPP',
                    text: `${e.employee_name} - ${e.item_name}`,
                    meta: `Vence: ${formatDate(e.next_renewal_date)}`,
                    urgent: e.days_until_renewal < 7
                })));
            }
        }

        // --- B. Low Stock (Supervisor Only) ---
        if (isEnabled("ENABLE_ALERT_LOW_STOCK")) {
            const { data: allItems } = await supabaseClient
                .from("epp_items")
                .select("id, name, stock_current, stock_min, station_id")
                .eq("is_active", true);

            if (allItems) {
                const lowStock = allItems.filter(i => i.stock_current <= i.stock_min);
                allAlerts.push(...lowStock.map(i => ({
                    station_id: i.station_id,
                    type: 'STOCK CRÍTICO',
                    text: i.name,
                    meta: `Stock: ${i.stock_current} (Min: ${i.stock_min})`,
                    urgent: true
                })));
            }
        }

        // --- C. Birthdays (BROADCAST TO ALL USERS) ---
        if (isEnabled("ENABLE_ALERT_BIRTHDAYS")) {
            const { data: employees } = await supabaseClient
                .from("employees")
                .select("id, full_name, birth_date, station_id, email")
                .neq("status", "CESADO")
                .not("birth_date", "is", null);

            if (employees) {
                const today = new Date();
                const upcomingBirthdays = [];

                employees.forEach(emp => {
                    const dob = new Date(emp.birth_date);
                    dob.setFullYear(today.getFullYear());
                    if (dob < today && (today.getMonth() !== dob.getMonth() || today.getDate() !== dob.getDate())) {
                        dob.setFullYear(today.getFullYear() + 1);
                    }
                    const diffDays = Math.ceil((dob.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    if (diffDays >= 0 && diffDays <= 7) {
                        upcomingBirthdays.push({
                            name: emp.full_name,
                            date: formatDate(emp.birth_date),
                            isToday: diffDays === 0
                        });

                        // Add to Supervisor Summary
                        allAlerts.push({
                            station_id: emp.station_id,
                            type: 'CUMPLEAÑOS',
                            text: emp.full_name,
                            meta: diffDays === 0 ? '¡Es HOY!' : `En ${diffDays} días (${formatDate(emp.birth_date)})`,
                            urgent: diffDays === 0
                        });
                    }
                });

                // BROADCAST: Send to ALL system users
                if (upcomingBirthdays.length > 0) {
                    const { data: allUsers } = await supabaseClient.from("system_users").select("email, first_name");

                    if (allUsers && allUsers.length > 0) {
                        const bdayHtml = generateEmailTemplate(
                            "🎉 Cumpleaños de la Semana",
                            `<p>¡Celebremos a nuestros compañeros!</p>
                             <div class="alert-group">
                                <ul class="alert-list">
                                    ${upcomingBirthdays.map(b => `
                                        <li class="alert-item" style="border-left-color: #f59e0b;">
                                            <span class="main-text">${b.name}</span>
                                            <span class="meta-text" style="color: #d97706; font-weight:bold;">${b.isToday ? '¡HOY!' : b.date}</span>
                                        </li>
                                    `).join('')}
                                </ul>
                             </div>`,
                            settingsMap
                        );

                        // Batch or Loop send (Loop for simplicity/reliability with Brevo API)
                        // Note: In high volume, use Brevo template + recipient list
                        console.log(`Broadcasting Birthday Alert to ${allUsers.length} users.`);
                        for (const user of allUsers) {
                            if (!user.email) continue;
                            // Fire and forget fetch to speed up? No, Deno runtime might kill it if we don't await. 
                            await fetch("https://api.brevo.com/v3/smtp/email", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "api-key": brevoKey },
                                body: JSON.stringify({
                                    sender: { email: senderEmail, name: "Gestor360 Social" },
                                    to: [{ email: user.email, name: user.first_name }],
                                    subject: `[Gestor360] 🎉 Cumpleaños: ${upcomingBirthdays[0].name} ${upcomingBirthdays.length > 1 ? `y ${upcomingBirthdays.length - 1} más` : ''}`,
                                    htmlContent: bdayHtml,
                                }),
                            }).catch(err => console.error("Error sending broadcast:", err));
                        }
                    }
                }
            }
        }

        // --- D. Documents (INDIVIDUAL EMAIL + SUPERVISOR SUMMARY) ---
        if (isEnabled("ENABLE_ALERT_EMO") || isEnabled("ENABLE_ALERT_PHOTOCHECK")) {
            const today = new Date();
            const thirtyDays = new Date();
            thirtyDays.setDate(today.getDate() + 30);

            const { data: docs } = await supabaseClient
                .from("employee_docs")
                .select("*, employee:employees(full_name, station_id, status, email)")
                .in("document_type", ["EMO", "PHOTOCHECK", "FOTOCHECK"]) // Added FOTOCHECK
                .gte("expiry_date", today.toISOString().split('T')[0])
                .lte("expiry_date", thirtyDays.toISOString().split('T')[0]);

            if (docs) {
                for (const doc of docs) { // Using for..of to await properly if needed
                    if (doc.employee?.status === 'CESADO') continue;

                    const typeLabel = (doc.document_type === 'EMO') ? 'EXAMEN MÉDICO' : 'FOTOCHECK';
                    const isEnabledType = (doc.document_type === 'EMO') ? isEnabled("ENABLE_ALERT_EMO") : isEnabled("ENABLE_ALERT_PHOTOCHECK");

                    if (isEnabledType) {
                        // 1. Add to Supervisor Key Summary
                        allAlerts.push({
                            station_id: doc.employee?.station_id,
                            type: `VENCIMIENTO ${typeLabel}`,
                            text: doc.employee?.full_name,
                            meta: `Vence: ${formatDate(doc.expiry_date)}`,
                            urgent: false
                        });

                        // 2. Send INDIVIDUAL Email
                        if (doc.employee?.email) {
                            const userHtml = generateEmailTemplate(
                                `⚠️ Vencimiento de ${typeLabel}`,
                                `<p>Hola <strong>${doc.employee.full_name}</strong>,</p>
                                 <p>Tu documento <strong>${typeLabel}</strong> está próximo a vencer.</p>
                                 <div class="alert-group">
                                    <ul class="alert-list">
                                        <li class="alert-item">
                                            <span class="main-text">Fecha de Vencimiento</span>
                                            <span class="meta-text urgent">${formatDate(doc.expiry_date)}</span>
                                        </li>
                                    </ul>
                                 </div>
                                 <p>Por favor, gestiona la renovación lo antes posible con RRHH.</p>`,
                                settingsMap
                            );

                            await fetch("https://api.brevo.com/v3/smtp/email", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "api-key": brevoKey },
                                body: JSON.stringify({
                                    sender: { email: senderEmail, name: "Gestor360 Alertas" },
                                    to: [{ email: doc.employee.email, name: doc.employee.full_name }],
                                    subject: `[Gestor360] ⚠️ Tu ${typeLabel} vence pronto`,
                                    htmlContent: userHtml,
                                }),
                            }).catch(e => console.error("Error sending individual doc alert:", e));
                        }
                    }
                }
            }
        }

        // 4. GROUP AND SEND
        const stations = {};
        allAlerts.forEach(alert => {
            const sId = alert.station_id || 'UNKNOWN';
            if (!stations[sId]) stations[sId] = [];
            stations[sId].push(alert);
        });
        console.log(`Processing ${allAlerts.length} total alerts across ${Object.keys(stations).length} stations.`);


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
