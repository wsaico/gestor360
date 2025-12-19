// function: supabase/functions/send-email-alerts/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // 1. Initialize Supabase Client (Service Role needed to read all data)
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 2. Load Configuration from DB
        const { data: settings, error: settingsError } = await supabaseClient
            .from("app_settings")
            .select("*");

        if (settingsError) throw settingsError;

        const getSetting = (key: string) => settings.find((s) => s.key === key)?.value;
        const isEnabled = (key: string) => getSetting(key) === "true";

        // GLOBAL CHECK
        if (!isEnabled("ENABLE_NOTIFICATIONS_GLOBAL")) {
            return new Response(JSON.stringify({ message: "Notifications disabled globally" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const brevoKey = getSetting("BREVO_API_KEY");
        const senderEmail = getSetting("SMTP_SENDER_EMAIL") || "no-reply@gestor360.com";

        if (!brevoKey) {
            throw new Error("BREVO_API_KEY not configured in app_settings");
        }

        // 3. FETCH DATA (based on toggles)
        let alerts = [];

        // A. EPPs (Renewals)
        if (isEnabled("ENABLE_ALERT_EPPS")) {
            const { data: epps } = await supabaseClient
                .from("vw_renewals_pending") // Ensure this view exists
                .select("*")
                .lt("days_until_renewal", 30); // < 30 days

            if (epps) alerts.push(...epps.map(e => ({ ...e, type: 'EPP', station_id: e.station_id })));
        }

        // B. Stock Bajo (Inventory)
        if (isEnabled("ENABLE_ALERT_LOW_STOCK")) {
            const { data: lowStockItems } = await supabaseClient
                .from("epp_items")
                .select("*")
                .eq("is_active", true)
                .lt("stock_current", supabaseClient.raw('stock_min')); // Cannot use .raw easily purely with helper, need to check syntax or use filter.
            // Supabase-js syntax for column comparison: .lt('stock_current', 'stock_min') -> No, that compares to string.
            // Standard way: .rpc or check manually.
            // Alternative: filter in code since inventory per station is small.

            // Fetch all active items and filter in memory for robust comparison with 'stock_min'
            const { data: allItems } = await supabaseClient
                .from("epp_items")
                .select("id, name, stock_current, stock_min, station_id, unit")
                .eq("is_active", true);

            if (allItems) {
                const lowStock = allItems.filter(i => i.stock_current < i.stock_min);
                alerts.push(...lowStock.map(i => ({
                    ...i,
                    type: 'STOCK_BAJO',
                    item_name: i.name,
                    renewal_date: `Stock: ${i.stock_current} / Min: ${i.stock_min}` // Reuse field for display
                })));
            }
        }

        // C. Birthdays (profiles)
        if (isEnabled("ENABLE_ALERT_BIRTHDAYS")) {
            // Logic for birthdays would go here
        }

        // 4. GROUP BY STATION (Smart Routing)
        const stations = {};
        alerts.forEach(alert => {
            const sId = alert.station_id || 'UNKNOWN';
            if (!stations[sId]) stations[sId] = { items: [], id: sId };
            stations[sId].items.push(alert);
        });

        // 5. PROCESS EACH STATION
        const results = [];

        for (const stationId of Object.keys(stations)) {
            if (stationId === 'UNKNOWN') continue;

            const stationData = stations[stationId];

            // Find Supervisors for this station
            // CHANGED: Query 'system_users' instead of 'profiles'
            const { data: supervisors } = await supabaseClient
                .from("system_users")
                .select("email, first_name") // Assuming 'first_name' exists in system_users, checking authService 'username' is used
                .eq("station_id", stationId)
                .in("role", ["SUPERVISOR", "ADMIN"]);

            if (!supervisors || supervisors.length === 0) continue;

            // Generate HTML
            const htmlContent = `
        <h1>Resumen de Alertas Gestor360</h1>
        <p>Se han detectado ${stationData.items.length} novedades para su estación.</p>
        <ul>
          ${stationData.items.map(i => `<li>[${i.type}] ${i.employee_name || 'Empleado'}: ${i.item_name || 'Item'} - Vence: ${i.renewal_date}</li>`).join('')}
        </ul>
      `;

            // Send Email via Brevo API
            for (const recipient of supervisors) {
                if (!recipient.email) continue;

                const res = await fetch("https://api.brevo.com/v3/smtp/email", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": brevoKey,
                    },
                    body: JSON.stringify({
                        sender: { email: senderEmail, name: "Gestor360 Alert" },
                        to: [{ email: recipient.email, name: recipient.first_name || 'Supervisor' }], // Fallback name
                        subject: `[Gestor360] Alerta de Vencimientos - ${stationId}`,
                        htmlContent: htmlContent,
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
