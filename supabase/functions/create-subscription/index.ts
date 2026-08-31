// ============================================
// Supabase Edge Function: create-subscription
// Creates a Razorpay subscription for an authenticated user.
// Handles: fresh subscribe, first-time bonus month (monthly), and
// monthly→annual upgrade (carries remaining monthly days as bonus).
//
// NOTE: This is the canonical copy. website/supabase/functions/create-subscription
// must be kept identical (same Supabase project backs both clients).
// ============================================

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!;
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;

const PLANS = {
    pro_monthly: { amount: 35900, period: 'monthly', interval: 1 },  // ₹359/mo
    pro_annual:  { amount: 360000, period: 'yearly', interval: 1 },  // ₹3,600/yr (₹300/mo × 12)
};

const DAY_MS = 24 * 60 * 60 * 1000;

// First-time bonus month (no coupon): pay one month today, get 2 months access.
// Mechanically: future start_at (day 61) + upfront addon = charge ₹359 today,
// 60 days access, first recurring ₹359 on day 61.
const BONUS_MONTH_ACCESS_DAYS = 60;
const BONUS_MONTH_LABEL = 'Pay 1 month and Get 1 month FREE';

// A monthly billing period never exceeds ~90 days; annual is 365+. Used to
// detect a monthly→annual upgrade.
const MONTHLY_PERIOD_MAX_DAYS = 90;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ---- 1. Auth ----
        const authHeader = req.headers.get('authorization');
        if (!authHeader) return jsonResponse(401, { success: false, error: 'Missing authorization' });

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return jsonResponse(401, { success: false, error: 'Invalid token' });

        // ---- 2. Parse plan type ----
        const { planType } = await req.json();
        if (!planType || !PLANS[planType]) {
            return jsonResponse(400, { success: false, error: 'Invalid plan type' });
        }

        const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
        const serviceClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // ---- 3. Check existing subscriptions ----
        const { data: existingSubs } = await serviceClient
            .from('subscriptions')
            .select('razorpay_subscription_id, status, current_period_start, current_period_end')
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing'])
            .order('created_at', { ascending: false });

        let isUpgradeFromMonthly = false;
        let bonusDays = 0;

        // ---- Bonus-month eligibility ----
        // First-time Pro (no prior subscription row of any status) on the monthly
        // plan gets the bonus month. Coupons are handled separately in
        // validate-coupon and are mutually exclusive with this path.
        const { count: priorSubCount } = await serviceClient
            .from('subscriptions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id);
        const bonusMonth = planType === 'pro_monthly' && (priorSubCount ?? 0) === 0;
        if (bonusMonth) {
            console.log(`[create-sub] First-time Pro — ${BONUS_MONTH_LABEL}: ₹359 now, ${BONUS_MONTH_ACCESS_DAYS} days access`);
        }

        if (existingSubs && existingSubs.length > 0) {
            for (const sub of existingSubs) {
                if (sub.current_period_start && sub.current_period_end) {
                    const periodMs = new Date(sub.current_period_end).getTime() - new Date(sub.current_period_start).getTime();
                    const periodDays = periodMs / DAY_MS;
                    if (periodDays < MONTHLY_PERIOD_MAX_DAYS && planType === 'pro_annual') {
                        isUpgradeFromMonthly = true;
                        const remainingMs = new Date(sub.current_period_end).getTime() - Date.now();
                        bonusDays = Math.max(0, Math.ceil(remainingMs / DAY_MS));
                        console.log(`[create-sub] Monthly→Annual upgrade. ${bonusDays} bonus days carried over.`);
                    }
                }

                if (sub.razorpay_subscription_id) {
                    try {
                        await fetch(`https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`, {
                            method: 'POST',
                            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ cancel_at_cycle_end: 0 }),
                        });
                    } catch (e) {
                        console.warn('[create-sub] Failed to cancel old sub:', e);
                    }
                }
                await serviceClient.from('subscriptions')
                    .update({ status: 'cancelled' })
                    .eq('razorpay_subscription_id', sub.razorpay_subscription_id);
            }
        }

        // ---- 4. Create Razorpay plan ----
        const planConfig = PLANS[planType];
        const planResponse = await fetch('https://api.razorpay.com/v1/plans', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                period: planConfig.period,
                interval: planConfig.interval,
                item: {
                    name: 'Juskoe',
                    amount: planConfig.amount,
                    currency: 'INR',
                    description: `Juskoe Pro ${planType === 'pro_monthly' ? 'Monthly' : 'Annual'} Subscription`,
                },
            }),
        });

        if (!planResponse.ok) {
            const errText = await planResponse.text();
            console.error('[create-sub] Plan creation error:', errText);
            return jsonResponse(502, { success: false, error: 'Failed to create plan.' });
        }

        const plan = await planResponse.json();

        // ---- 5. Create Razorpay subscription ----
        const subscriptionBody: Record<string, unknown> = {
            plan_id: plan.id,
            total_count: planType === 'pro_monthly' ? 120 : 10,
            quantity: 1,
            customer_notify: 1,
            notes: {
                user_id: user.id,
                email: user.email,
                plan_type: planType,
                bonus_days: String(bonusDays),
                is_upgrade: String(isUpgradeFromMonthly),
                bonus_month: String(bonusMonth),
                access_days: String(bonusMonth ? BONUS_MONTH_ACCESS_DAYS : 0),
            },
        };

        // Bonus month: charge the plan amount (₹359) today as the upfront addon
        // and defer the recurring cycle to day 61, so days 1–30 are paid and
        // days 31–60 are free.
        if (bonusMonth) {
            subscriptionBody.start_at = Math.floor((Date.now() + BONUS_MONTH_ACCESS_DAYS * DAY_MS) / 1000);
            subscriptionBody.addons = [{
                item: {
                    name: `Juskoe Pro — ${BONUS_MONTH_LABEL}`,
                    amount: planConfig.amount,   // ₹359, charged once, today
                    currency: 'INR',
                },
            }];
        }

        const rzpResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(subscriptionBody),
        });

        if (!rzpResponse.ok) {
            const errText = await rzpResponse.text();
            console.error('[create-sub] Razorpay error:', errText);
            return jsonResponse(502, { success: false, error: 'Payment service error.' });
        }

        const subscription = await rzpResponse.json();

        // ---- 6. Store in DB (as intent, not entitlement) ----
        const now = new Date();
        let periodEnd;
        if (planType === 'pro_monthly') {
            periodEnd = new Date(now.getTime() + (bonusMonth ? BONUS_MONTH_ACCESS_DAYS : 30) * DAY_MS);
        } else {
            periodEnd = new Date(now.getTime() + (365 + bonusDays) * DAY_MS);
        }

        // status 'created' — only razorpay-webhook / confirm-payment promote to
        // 'active' after real money moves. A 'created' row never entitles anyone.
        const { error: insertError } = await serviceClient.from('subscriptions').insert({
            user_id: user.id,
            plan: 'pro',
            status: 'created',
            razorpay_subscription_id: subscription.id,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
        });
        if (insertError) {
            console.error(`[create-sub] FAILED to record subscription ${subscription.id} for ${user.id}: ${insertError.message}`);
        }

        console.log(`[create-sub] Created ${planType} for ${user.id}. Bonus month: ${bonusMonth}. Upgrade bonus: ${bonusDays}d. Ends: ${periodEnd.toISOString()}`);

        return jsonResponse(200, {
            success: true,
            bonusMonth,
            bonusMonthLabel: bonusMonth ? BONUS_MONTH_LABEL : null,
            accessDays: bonusMonth ? BONUS_MONTH_ACCESS_DAYS : null,
            amountDueNow: planConfig.amount,   // paise charged at checkout (before coupon)
            subscriptionId: subscription.id,
            url: subscription.short_url,
            keyId: RAZORPAY_KEY_ID,
            isUpgrade: isUpgradeFromMonthly,
            bonusDays,
        });

    } catch (error) {
        console.error('[create-sub] Error:', error);
        return jsonResponse(500, { success: false, error: 'Internal error' });
    }
});

function jsonResponse(status, data) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
