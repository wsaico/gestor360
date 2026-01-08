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

// --- HELPER: Professional HTML Template v3.0 (Premium Design) ---
const generateEmailTemplate = (
    title: string,
    contentHtml: string,
    settings: any,
    options: { showButton?: boolean } = { showButton: true }
) => {
    const companyName = settings.get("COMPANY_NAME") || "Gestor360";
    const logoUrl = settings.get("COMPANY_LOGO_URL") || "https://placehold.co/200x50?text=Gestor360";
    const companyAddress = settings.get("COMPANY_ADDRESS") || "Plataforma de Gestión Operativa";

    // Theme Detection
    const isBirthday = title.toLowerCase().includes("cumpleaños");
    const isUrgent = title.includes("⚠️") || title.includes("🚨");

    // Dynamic Colors Based on Context
    const primaryColor = isBirthday ? "#f59e0b" : (isUrgent ? "#dc2626" : "#2563eb");
    const headerGradient = isBirthday
        ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)"
        : (isUrgent
            ? "linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)"
            : "linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)");

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>${title}</title>
      <style>
        /* === BASE RESET === */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          margin: 0; 
          padding: 0; 
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          -webkit-font-smoothing: antialiased; 
          -moz-osx-font-smoothing: grayscale;
          line-height: 1.6;
        }
        table { border-spacing: 0; width: 100%; }
        td { padding: 0; }
        img { border: 0; display: block; }
        a { text-decoration: none; }
        
        /* === LAYOUT === */
        .email-wrapper { 
          width: 100%; 
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          padding: 50px 20px;
        }
        .email-container { 
          max-width: 640px; 
          margin: 0 auto; 
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04),
            0 0 0 1px rgba(0, 0, 0, 0.05);
        }
        
        /* === HEADER === */
        .email-header { 
          background: ${headerGradient};
          padding: 48px 32px;
          text-align: center;
          position: relative;
        }
        .email-header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
        }
        .logo-wrapper { 
          display: inline-block;
        }
        .logo { 
          max-height: 54px; 
          width: auto; 
          margin: 0 auto;
        }

        /* === CONTENT === */
        .email-body { 
          padding: 48px 40px;
          background: #ffffff;
        }
        .email-title { 
          font-size: 28px; 
          font-weight: 700; 
          color: #111827; 
          margin: 0 0 28px;
          line-height: 1.3;
          text-align: center;
          letter-spacing: -0.02em;
        }
        .email-text { 
          font-size: 16px; 
          line-height: 1.7;
          margin: 0 0 24px;
          color: #4b5563;
        }
        .email-text strong {
          color: #1f2937;
          font-weight: 600;
        }
        
        /* === ALERT CARDS === */
        .alert-card { 
          background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%);
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          transition: box-shadow 0.2s ease;
        }
        .alert-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .alert-header { 
          font-size: 13px;
          text-transform: uppercase;
          color: ${primaryColor};
          margin: 0 0 20px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding-bottom: 12px;
          border-bottom: 2px solid ${primaryColor};
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .alert-count {
          background: ${primaryColor};
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.05em;
        }
        
        /* === ALERT LIST === */
        .alert-list { 
          list-style: none; 
          padding: 0; 
          margin: 0;
        }
        .alert-item { 
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 12px;
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.15s ease;
        }
        .alert-item:hover {
          background-color: #fafbfc;
        }
        .alert-item:last-child { 
          border-bottom: none;
        }
        .alert-main { 
          font-weight: 600;
          color: #111827;
          font-size: 15px;
          flex: 1;
          padding-right: 16px;
        }
        .alert-badge { 
          font-size: 13px;
          color: #6b7280;
          background: #eff6ff;
          padding: 6px 14px;
          border-radius: 6px;
          font-weight: 600;
          white-space: nowrap;
          border: 1px solid #dbeafe;
        }
        .alert-badge.urgent { 
          color: #ffffff;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border: 1px solid #dc2626;
          box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
        }
        
        /* === BUTTON === */
        .btn-wrapper { 
          text-align: center;
          margin-top: 36px;
          padding-top: 28px;
          border-top: 1px solid #f3f4f6;
        }
        .btn { 
          display: inline-block;
          background: ${primaryColor};
          color: #ffffff !important;
          font-weight: 600;
          text-decoration: none;
          padding: 16px 40px;
          border-radius: 10px;
          font-size: 16px;
          box-shadow: 
            0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
          letter-spacing: 0.02em;
          border: 2px solid transparent;
        }
        .btn:hover { 
          transform: translateY(-2px);
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        /* === FOOTER === */
        .email-footer { 
          background: linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%);
          padding: 40px 40px 32px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-company {
          font-size: 16px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .footer-address {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 24px;
        }
        .footer-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #d1d5db, transparent);
          margin: 24px 0;
        }
        .footer-notice {
          font-size: 12px;
          color: #9ca3af;
          font-style: italic;
          margin-bottom: 20px;
        }
        
        /* === LEGAL === */
        .legal-section {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
          text-align: left;
        }
        .legal-title {
          font-size: 12px;
          font-weight: 700;
          color: #374151;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .legal-text {
          font-size: 11px;
          color: #6b7280;
          line-height: 1.6;
          margin: 0;
        }

        /* === RESPONSIVE === */
        @media only screen and (max-width: 600px) {
          .email-wrapper { padding: 20px 10px !important; }
          .email-body { padding: 32px 20px !important; }
          .email-header { padding: 36px 20px !important; }
          .email-footer { padding: 32px 20px 24px !important; }
          .email-title { font-size: 22px !important; margin-bottom: 20px !important; }
          
          .alert-card { padding: 16px !important; margin-bottom: 20px !important; }
          .alert-item { padding: 12px 4px !important; }
          .alert-main { 
            font-size: 13px !important; 
            line-height: 1.4 !important;
            padding-right: 8px !important;
          }
          .alert-badge { 
            font-size: 11px !important; 
            padding: 4px 10px !important;
            margin-top: 6px !important;
          }
          .btn { padding: 14px 28px !important; font-size: 15px !important; width: 100%; text-align: center; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          
          <!-- Header -->
          <div class="email-header">
            <div class="logo-wrapper">
              <img src="${logoUrl}" alt="${companyName}" class="logo" />
            </div>
          </div>

          <!-- Body -->
          <div class="email-body">
            <h1 class="email-title">${title}</h1>
            ${contentHtml}
            
            ${(options.showButton && !contentHtml.includes('class="btn"')) ? `
            <div class="btn-wrapper">
              <a href="https://app.gestor360.com" class="btn">Ir al Sistema</a>
            </div>` : ''}
          </div>

          <!-- Footer -->
          <div class="email-footer">
            <div class="footer-company">${companyName}</div>
            <div class="footer-address">${companyAddress}</div>
            
            <div class="footer-divider"></div>
            
            <div class="footer-notice">
              Este correo se generó automáticamente. Por favor no responder.
            </div>
            
            <div class="legal-section">
              <div class="legal-title">🔒 Protección de Datos Personales</div>
              <p class="legal-text">
                Este mensaje y sus adjuntos son confidenciales. Su uso está restringido al destinatario 
                para fines estrictamente laborales, conforme a la Ley N° 29733 (Ley de Protección de 
                Datos Personales del Perú) y su Reglamento. Si recibió este mensaje por error, 
                notifique al remitente y elimínelo de inmediato.
              </p>
            </div>
          </div>

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
        console.log("Starting send-email-alerts function v3.0 (Premium Design)");

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

        const settingsMap = new Map();
        settingsData?.forEach(s => settingsMap.set(s.key, s.value));
        const getSetting = (key: string) => settingsMap.get(key);
        const isEnabled = (key: string) => getSetting(key) === "true";
        console.log(`Settings loaded. Global Enabled: ${isEnabled("ENABLE_NOTIFICATIONS_GLOBAL")}`);

        if (!isEnabled("ENABLE_NOTIFICATIONS_GLOBAL")) {
            return new Response(JSON.stringify({ message: "Notifications disabled globally" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const brevoKey = getSetting("BREVO_API_KEY");
        const senderEmail = getSetting("SMTP_SENDER_EMAIL") || "no-reply@gestor360.com";

        if (!settingsData || settingsData.length === 0 || !brevoKey) {
            const visibleKeys = settingsData?.map(s => s.key).join(", ");
            throw new Error(`DEBUG: Configuration Error. Keys visible: [${visibleKeys}]`);
        }

        let body: any = {};
        try { body = await req.json(); } catch (e) { }

        // --- WEBHOOK MODE (Real-time Stock) ---
        if (body.record && body.type === 'UPDATE' && body.table === 'epp_items') {
            const item = body.record;
            if (isEnabled("ENABLE_ALERT_LOW_STOCK") && item.stock_current <= item.stock_min) {
                const { data: supervisors } = await supabaseClient
                    .from("system_users")
                    .select("email, first_name")
                    .eq("station_id", item.station_id)
                    .in("role", ["SUPERVISOR", "ADMIN"]);

                if (supervisors && supervisors.length > 0) {
                    const html = generateEmailTemplate(
                        "⚠️ Alerta de Stock Crítico",
                        `<p class="email-text">El siguiente ítem ha alcanzado el nivel mínimo de inventario y requiere atención inmediata.</p>
                         <div class="alert-card">
                            <div class="alert-header">
                                <span>Stock Crítico</span>
                                <span class="alert-count">1</span>
                            </div>
                            <ul class="alert-list">
                                <li class="alert-item">
                                    <span class="alert-main">${item.name}</span>
                                    <span class="alert-badge urgent">Stock: ${item.stock_current} / Min: ${item.stock_min}</span>
                                </li>
                            </ul>
                         </div>`,
                        settingsMap
                    );

                    for (const recipient of supervisors) {
                        if (!recipient.email) continue;
                        await fetch("https://api.brevo.com/v3/smtp/email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "api-key": brevoKey },
                            body: JSON.stringify({
                                sender: { email: senderEmail, name: "Gestor360 Stock" },
                                to: [{ email: recipient.email, name: recipient.first_name }],
                                subject: `[Gestor360] 🚨 Stock Crítico: ${item.name}`,
                                htmlContent: html,
                            }),
                        });
                    }
                }
            }
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // --- TEST/GENERIC SEND ---
        if (body.action === 'test_connection' || body.action === 'send_email') {
            const targetEmail = body.email || body.to;
            const subject = body.subject || "✅ Test de Conexión | Gestor360";
            const html = body.html || generateEmailTemplate("Test Connection", "<p>Success</p>", settingsMap);

            const res = await fetch("https://api.brevo.com/v3/smtp/email", {
                method: "POST",
                headers: { "Content-Type": "application/json", "api-key": brevoKey },
                body: JSON.stringify({
                    sender: { email: senderEmail, name: "Gestor360 System" },
                    to: [{ email: targetEmail }],
                    subject: subject,
                    htmlContent: html,
                }),
            });
            if (!res.ok) throw new Error(`Brevo Error: ${await res.text()}`);
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 3. COLLECT ALERTS (Scheduled or Direct run)
        const allAlerts: any[] = [];
        const nowPeru = new Date(new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Lima',
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
        }).format(new Date()));
        const currentHour = nowPeru.getHours();
        const today = new Date(nowPeru);
        today.setHours(0, 0, 0, 0);

        // --- A. EPP Renewals ---
        if (isEnabled("ENABLE_ALERT_EPPS")) {
            const { data: epps } = await supabaseClient.from("vw_renewals_pending").select("*").lt("days_until_renewal", 30);
            if (epps) {
                const allowedDays = [30, 15, 7, 3, 1, 0];
                epps.filter(e => allowedDays.includes(e.days_until_renewal)).forEach(e => {
                    allAlerts.push({
                        station_id: e.station_id,
                        type: 'RENOVACIÓN EPP',
                        text: `${e.full_name} - ${e.item_name}`,
                        meta: e.days_until_renewal === 0 ? '¡VENCE HOY!' : `Vence en ${e.days_until_renewal} días (${formatDate(e.renewal_date)})`,
                        urgent: e.days_until_renewal <= 7
                    });
                });
            }
        }

        // --- B. Low Stock ---
        if (isEnabled("ENABLE_ALERT_LOW_STOCK")) {
            const { data: allItems } = await supabaseClient.from("epp_items").select("*").eq("is_active", true);
            if (allItems) {
                allItems.filter(i => i.stock_current <= i.stock_min).forEach(i => {
                    allAlerts.push({
                        station_id: i.station_id,
                        type: 'STOCK CRÍTICO',
                        text: i.name,
                        meta: `Stock: ${i.stock_current} / Min: ${i.stock_min}`,
                        urgent: true
                    });
                });
            }
        }

        // --- C. Birthdays (Window: 6am-9am for Today, 6pm-21pm for Tomorrow, or Manual) ---
        if (isEnabled("ENABLE_ALERT_BIRTHDAYS")) {
            const isManual = !body.action || body.action === 'send_email';
            const isTodaySlot = currentHour >= 6 && currentHour <= 9;
            const isTomorrowSlot = currentHour >= 18 && currentHour <= 21;

            if (isTodaySlot || isTomorrowSlot || isManual) {
                const { data: employees } = await supabaseClient.from("employees").select("*").neq("status", "CESADO").not("birth_date", "is", null);
                if (employees) {
                    const bdaysByStation: Record<string, any[]> = {};
                    employees.forEach(emp => {
                        const dob = new Date(emp.birth_date);
                        const bMonth = dob.getMonth();
                        const bDay = dob.getDate();
                        const isToday = today.getMonth() === bMonth && today.getDate() === bDay;
                        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                        const isTomorrow = tomorrow.getMonth() === bMonth && tomorrow.getDate() === bDay;

                        let shouldNotify = false;
                        let label = "";
                        if (isToday && (isTodaySlot || isManual)) { shouldNotify = true; label = "¡Es HOY! 🎂"; }
                        else if (isTomorrow && (isTomorrowSlot || isManual)) { shouldNotify = true; label = "Mañana 🎈"; }

                        if (shouldNotify) {
                            const sId = emp.station_id || 'GENERAL';
                            if (!bdaysByStation[sId]) bdaysByStation[sId] = [];
                            bdaysByStation[sId].push({ name: emp.full_name, label: label, isToday: isToday });
                            allAlerts.push({ station_id: emp.station_id, type: 'CUMPLEAÑOS', text: emp.full_name, meta: label, urgent: isToday });
                        }
                    });

                    for (const [sId, sBdays] of Object.entries(bdaysByStation)) {
                        const { data: stationUsers } = await supabaseClient.from("system_users")
                            .select("*")
                            .eq("station_id", sId);

                        if (stationUsers && stationUsers.length > 0) {
                            const bdayHtml = generateEmailTemplate(
                                "Cumpleaños del Equipo 🎂",
                                `<p class="email-text">¡Celebremos juntos a nuestros compañeros de equipo!</p>
                                 <div class="alert-card">
                                    <div class="alert-header"><span>Próximos Cumpleaños</span><span class="alert-count">${sBdays.length}</span></div>
                                    <ul class="alert-list">
                                        ${sBdays.map(b => `<li class="alert-item"><span class="alert-main">${b.name}</span><span class="alert-badge${b.isToday ? ' urgent' : ''}">${b.label}</span></li>`).join('')}
                                    </ul>
                                 </div>`,
                                settingsMap, { showButton: false }
                            );
                            const mainBday = sBdays[0];
                            const subject = (isTomorrowSlot && !isTodaySlot)
                                ? `🎈 Mañana celebramos cumpleaños en el equipo`
                                : `🎂 Hoy celebramos el cumpleaños de ${mainBday.name}${sBdays.length > 1 ? ' y otros compañeros' : ''}`;

                            for (const user of stationUsers) {
                                if (user.email) {
                                    await fetch("https://api.brevo.com/v3/smtp/email", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json", "api-key": brevoKey },
                                        body: JSON.stringify({
                                            sender: { email: senderEmail, name: "Gestor360 Social" },
                                            to: [{ email: user.email }],
                                            subject: subject,
                                            htmlContent: bdayHtml,
                                        }),
                                    }).catch(() => { });
                                }
                            }
                        }
                    }
                }
            }
        }

        // --- D. Documents ---
        if (isEnabled("ENABLE_ALERT_EMO") || isEnabled("ENABLE_ALERT_PHOTOCHECK")) {
            const limitDate = new Date(today); limitDate.setDate(today.getDate() + 35);
            const { data: docs } = await supabaseClient.from("employee_docs").select("*, employee:employees(*)").in("doc_type", ["EMO", "PHOTOCHECK", "FOTOCHECK"]).gte("expiry_date", today.toISOString().split('T')[0]).lte("expiry_date", limitDate.toISOString().split('T')[0]);
            if (docs) {
                const allowedDays = [30, 15, 7, 3, 1, 0];
                for (const doc of docs) {
                    if (doc.employee?.status === 'CESADO') continue;
                    const exp = new Date(doc.expiry_date); exp.setHours(0, 0, 0, 0);
                    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (!allowedDays.includes(diff)) continue;

                    const typeLabel = (doc.doc_type === 'EMO') ? 'EXAMEN MÉDICO' : 'FOTOCHECK';
                    const isTypeEnabled = (doc.doc_type === 'EMO') ? isEnabled("ENABLE_ALERT_EMO") : isEnabled("ENABLE_ALERT_PHOTOCHECK");
                    if (isTypeEnabled) {
                        allAlerts.push({ station_id: doc.employee?.station_id, type: `VENCIMIENTO ${typeLabel}`, text: doc.employee?.full_name, meta: diff === 0 ? '¡VENCE HOY!' : `Vence en ${diff} días`, urgent: diff <= 7 });
                        if (doc.employee?.email) {
                            const userHtml = generateEmailTemplate(`⚠️ Vencimiento de ${typeLabel}`, `<p class="email-text">Hola <strong>${doc.employee.full_name}</strong>,</p><p class="email-text">Tu documento <strong>${typeLabel}</strong> vence en ${diff === 0 ? 'HOY' : `${diff} días`}.</p>`, settingsMap, { showButton: false });
                            await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "Content-Type": "application/json", "api-key": brevoKey }, body: JSON.stringify({ sender: { email: senderEmail, name: "Gestor360 Alertas" }, to: [{ email: doc.employee.email }], subject: `⚠️ Tu ${typeLabel} vence pronto`, htmlContent: userHtml }) }).catch(() => { });
                        }
                    }
                }
            }
        }

        // 4. GROUP AND SEND TO SUPERVISORS
        const stations: Record<string, any[]> = {};
        allAlerts.forEach(a => { const sId = a.station_id || 'GENERAL'; if (!stations[sId]) stations[sId] = []; stations[sId].push(a); });

        for (const [sId, sAlerts] of Object.entries(stations) as [string, any[]][]) {
            const { data: supervisors } = await supabaseClient.from("system_users").select("*").eq("station_id", sId).in("role", ["SUPERVISOR", "ADMIN"]);
            if (supervisors && supervisors.length > 0) {
                const alertsByType = {};
                sAlerts.forEach(a => { if (!alertsByType[a.type]) alertsByType[a.type] = []; alertsByType[a.type].push(a); });
                let bodyHtml = `<p class="email-text">Resumen de novedades operativas. Revise los siguientes puntos:</p>`;
                for (const [type, items] of Object.entries(alertsByType)) {
                    bodyHtml += `<div class="alert-card"><div class="alert-header"><span>${type}</span><span class="alert-count">${items.length}</span></div><ul class="alert-list">
                        ${items.map(item => `<li class="alert-item"><span class="alert-main">${item.text}</span><span class="alert-badge ${item.urgent ? 'urgent' : ''}">${item.meta}</span></li>`).join('')}
                        </ul></div>`;
                }
                const finalHtml = generateEmailTemplate(`Resumen Operativo`, bodyHtml, settingsMap);
                for (const sup of supervisors) {
                    if (sup.email) {
                        await fetch("https://api.brevo.com/v3/smtp/email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "api-key": brevoKey },
                            body: JSON.stringify({
                                sender: { email: senderEmail, name: "Gestor360 Alertas" },
                                to: [{ email: sup.email }],
                                subject: `🔔 Resumen: ${sAlerts.length} Novedades | ${formatDate(new Date().toISOString())}`,
                                htmlContent: finalHtml,
                            }),
                        }).catch(() => { });
                    }
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
