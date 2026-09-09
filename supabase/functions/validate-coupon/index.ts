// ============================================
// Supabase Edge Function: validate-coupon
// Applies a first-time discount coupon to a freshly created (but unpaid)
// subscription, for BOTH monthly and annual plans.
//
// Rules:
//   - One coupon per account (any code), one-time only.
//   - Max 100 redemptions per coupon code.
//   - First-time Pro only (enforced by the one-per-account check).
//   - Works on monthly AND annual (Option A).
//
// Offer mechanics (Razorpay "future start_at + upfront addon amount"):
//   MONTHLY: charge Rs 49 today, give 2 months (60 days) of access, then the
//            normal Rs 359/mo recurring cycle begins on day 61.
//   ANNUAL:  charge Rs 3,349 today (49 + 11*300), give 13 months (396 days) of
//            access, then the normal Rs 3,600/yr recurring cycle begins on day 397.
//
// The upfront addon + future start_at combination charges ONLY the upfront
// amount today (Razorpay "Authentication Amount" table: future start + upfront
// => upfront amount only), and defers the first recurring charge to start_at.
//
// FREE coupons (see FREE_COUPON_MONTHS below) use the SAME mechanism with the
// upfront addon simply omitted: future start_at + no addon => Razorpay collects
// only its autopay/mandate authentication amount at checkout (auto-refunded),
// nothing for the subscription itself. The recurring cycle then begins at
// start_at, i.e. after the free window.
// ============================================

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!;
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;

// ---- Hardcoded coupon codes ----
const VALID_COUPONS = ['AIS0320', 'VIS2008', 'GOV2007', 'SAI3132', 'AVGS0320'];
const COUPON_EXPIRY = new Date('2026-12-31T23:59:59+05:30');
const MAX_REDEMPTIONS_PER_COUPON = 100;

// ---- 100%-off coupons: code -> number of free months ----
// AVGS0320 gives 2 monthly cycles of Pro completely free. Nothing is charged
// for the subscription during the free window — only Razorpay's own autopay /
// mandate authentication amount is collected at checkout (and auto-refunded),
// because we create the subscription with a future start_at and NO upfront
// addon. After the free window the plan's normal recurring cycle begins.
// Every other coupon rule (expiry, one-per-account, 100-per-code, paid-only
// redemption tracking) applies unchanged.
const FREE_COUPON_MONTHS: Record<string, number> = { AVGS0320: 2 };
const FREE_MONTH_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// ---- Plan economics (paise) ----
// Base recurring amounts must match create-subscription's PLANS.
const MONTHLY_RECURRING = 35900;   // Rs 359/mo
const ANNUAL_RECURRING = 360000;   // Rs 3,600/yr

// Coupon upfront amounts charged today.
const MONTHLY_COUPON_UPFRONT = 4900;     // Rs 49
const ANNUAL_COUPON_UPFRONT = 334900;    // Rs 3,349  (49 + 11*300)

// Access windows the upfront amount buys before the first recurring charge.
const MONTHLY_ACCESS_DAYS = 60;    // 2 months
const ANNUAL_ACCESS_DAYS = 396;    // 13 months

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { code, subscription_id, email } = await req.json();
        const upperCode = (code || '').toUpperCase().trim();

        // ---- 1. Validate coupon code ----
        if (!upperCode) {
            return json(400, { success: false, error: 'Enter a coupon code' });
        }
        if (!VALID_COUPONS.includes(upperCode)) {
            return json(200, { success: false, error: 'Invalid coupon code' });
        }
        if (new Date() > COUPON_EXPIRY) {
            return json(200, { success: false, error: 'This coupon has expired' });
        }
        if (!subscription_id) {
            return json(400, { success: false, error: 'Missing subscription' });
        }
        if (!email) {
            return json(400, { success: false, error: 'Missing email' });
        }

        const userEmail = email.toLowerCase().trim();
        const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

        // ---- 2. Service client for DB operations ----
        const serviceClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // ---- 3. One coupon per account (any code) — PAID redemptions only ----
        // Table: coupon_redemptions (email TEXT PK, coupon_code TEXT, redeemed_at
        // TIMESTAMPTZ, paid BOOLEAN DEFAULT false). The row is inserted here as
        // paid=false (a reservation, not a redemption) and is only flipped to
        // paid=true by confirm-payment / the webhook once money actually moves.
        //
        // BUG THIS FIXES: this function used to insert the row immediately on
        // Apply, before Razorpay ever charged anything. Applying and then
        // abandoning checkout (or the payment simply failing) permanently burned
        // the code for that account and made every other coupon look "already
        // used" too — on fresh accounts that had never paid a rupee. The guard
        // below only blocks on a row that reached paid=true.
        const { data: existing, error: checkErr } = await serviceClient
            .from('coupon_redemptions')
            .select('coupon_code, paid')
            .eq('email', userEmail)
            .eq('paid', true)
            .maybeSingle();

        if (checkErr && !checkErr.message.includes('does not exist')) {
            console.warn('[validate-coupon] DB check error:', checkErr.message);
        }
        if (existing) {
            return json(200, {
                success: false,
                error: `You've already used a coupon (${existing.coupon_code}). Only one coupon per account.`,
            });
        }

        // ---- 4. Max redemptions per coupon code (100), PAID only ----
        const { count: usageCount, error: countErr } = await serviceClient
            .from('coupon_redemptions')
            .select('*', { count: 'exact', head: true })
            .eq('coupon_code', upperCode)
            .eq('paid', true);

        if (countErr && !countErr.message.includes('does not exist')) {
            console.warn('[validate-coupon] Count check error:', countErr.message);
        }
        if (usageCount !== null && usageCount >= MAX_REDEMPTIONS_PER_COUPON) {
            return json(200, {
                success: false,
                error: `This coupon code has reached its maximum usage limit (${MAX_REDEMPTIONS_PER_COUPON}).`,
            });
        }

        // Clear out any of THIS user's earlier unpaid reservations for any code
        // (abandoned checkouts) so re-applying doesn't collide on the email
        // primary key below.
        await serviceClient.from('coupon_redemptions').delete().eq('email', userEmail).eq('paid', false);

        // ---- 5. Read the current (unpaid) subscription + detect plan ----
        const subResponse = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription_id}`, {
            headers: { 'Authorization': `Basic ${auth}` },
        });
        if (!subResponse.ok) {
            return json(502, { success: false, error: 'Could not verify subscription' });
        }
        const existingSub = await subResponse.json();

        // Detect the plan period. Prefer the notes we set in create-subscription,
        // fall back to fetching the Razorpay plan.
        let planType = existingSub.notes?.plan_type || '';
        if (planType !== 'pro_monthly' && planType !== 'pro_annual' && existingSub.plan_id) {
            const planRes = await fetch(`https://api.razorpay.com/v1/plans/${existingSub.plan_id}`, {
                headers: { 'Authorization': `Basic ${auth}` },
            });
            if (planRes.ok) {
                const planData = await planRes.json();
                planType = planData.period === 'yearly' ? 'pro_annual' : 'pro_monthly';
            }
        }
        const isAnnual = planType === 'pro_annual';

        // ---- 6. Choose coupon economics for the detected plan ----
        // A 100%-off coupon (FREE_COUPON_MONTHS) overrides the upfront amount and
        // the access window: nothing is charged today and the free window is the
        // configured number of monthly cycles, on either plan.
        const freeMonths = FREE_COUPON_MONTHS[upperCode] ?? 0;
        const isFreeCoupon = freeMonths > 0;
        const recurringAmount = isAnnual ? ANNUAL_RECURRING : MONTHLY_RECURRING;
        const upfrontAmount = isFreeCoupon ? 0 : (isAnnual ? ANNUAL_COUPON_UPFRONT : MONTHLY_COUPON_UPFRONT);
        const accessDays = isFreeCoupon
            ? freeMonths * FREE_MONTH_DAYS
            : (isAnnual ? ANNUAL_ACCESS_DAYS : MONTHLY_ACCESS_DAYS);
        const period = isAnnual ? 'yearly' : 'monthly';
        const totalCount = isAnnual ? 10 : 120;

        // ---- 7. Cancel the existing (unpaid) subscription ----
        try {
            await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription_id}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancel_at_cycle_end: 0 }),
            });
            console.log(`[validate-coupon] Cancelled old sub: ${subscription_id}`);
        } catch (e) {
            console.warn('[validate-coupon] Could not cancel old sub:', e);
        }

        // ---- 8. Create the discounted plan (normal recurring amount) ----
        const planResponse = await fetch('https://api.razorpay.com/v1/plans', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                period,
                interval: 1,
                item: {
                    name: 'Juskoe',
                    amount: recurringAmount,
                    currency: 'INR',
                    description: `Juskoe Pro ${isAnnual ? 'Annual' : 'Monthly'} (coupon ${upperCode})`,
                },
            }),
        });
        if (!planResponse.ok) {
            const errText = await planResponse.text();
            console.error('[validate-coupon] Plan creation failed:', errText);
            return json(502, { success: false, error: 'Failed to create plan' });
        }
        const newPlan = await planResponse.json();

        // ---- 9. Create the discounted subscription ----
        // Future start_at + upfront addon => charge ONLY the upfront amount today,
        // then begin the recurring cycle at start_at (day 61 monthly / day 397 annual).
        const startAt = Math.floor((Date.now() + accessDays * DAY_MS) / 1000);
        const userId = existingSub.notes?.user_id || '';

        const newSubResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plan_id: newPlan.id,
                total_count: totalCount,
                quantity: 1,
                customer_notify: 1,
                start_at: startAt,
                // 100%-off coupon: omit the addon entirely. Future start_at with no
                // addon means Razorpay charges only the autopay/mandate
                // authentication amount at checkout (auto-refunded) — the free
                // window itself costs the user nothing.
                ...(isFreeCoupon ? {} : {
                    addons: [{
                        item: {
                            name: `Juskoe Pro — coupon ${upperCode}`,
                            amount: upfrontAmount,   // charged once, today
                            currency: 'INR',
                        },
                    }],
                }),
                notes: {
                    user_id: userId,
                    email: userEmail,
                    plan_type: planType,
                    coupon_code: upperCode,
                    coupon_offer: 'true',
                    access_days: String(accessDays),
                    upfront_amount: String(upfrontAmount),
                    free_months: String(freeMonths),
                    max_redemptions: String(MAX_REDEMPTIONS_PER_COUPON),
                },
            }),
        });
        if (!newSubResponse.ok) {
            const errText = await newSubResponse.text();
            console.error('[validate-coupon] New sub creation failed:', errText);
            return json(502, { success: false, error: 'Failed to apply coupon' });
        }
        const newSub = await newSubResponse.json();

        // ---- 10. Update DB: cancel old row, record new intent (NOT active) ----
        await serviceClient.from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('razorpay_subscription_id', subscription_id);

        // Record as 'created' — entitlement is granted only after payment is
        // verified (confirm-payment / webhook). The period columns reflect the
        // access window the upfront payment will buy.
        const periodEnd = new Date(Date.now() + accessDays * DAY_MS);
        await serviceClient.from('subscriptions').upsert({
            user_id: userId,
            razorpay_subscription_id: newSub.id,
            plan: 'pro',
            status: 'created',
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
        }, { onConflict: 'razorpay_subscription_id' });

        // ---- 11. Reserve the coupon as UNPAID ----
        // Only confirm-payment / the webhook, on proof of an actual charge,
        // flips this row to paid=true. If the user never completes checkout,
        // this row is harmless and gets cleared automatically on their next
        // Apply attempt (step 4 above) — the code is never permanently burned
        // by an abandoned or failed payment.
        await serviceClient.from('coupon_redemptions').insert({
            email: userEmail,
            coupon_code: upperCode,
            paid: false,
        });

        const rupeesToday = Math.round(upfrontAmount / 100);
        const monthsAccess = isFreeCoupon ? freeMonths : (isAnnual ? 13 : 2);
        const nextChargeDate = periodEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const recurringLabel = `₹${Math.round(recurringAmount / 100)}/${isAnnual ? 'yr' : 'mo'}`;
        console.log(`[validate-coupon] SUCCESS: ${userEmail} used ${upperCode} on ${planType}, new sub ${newSub.id}, Rs ${rupeesToday} today, ${monthsAccess} months, free=${isFreeCoupon}, next charge ${nextChargeDate}`);

        return json(200, {
            success: true,
            new_subscription_id: newSub.id,
            plan_type: planType,
            amount_due_now: upfrontAmount,   // paise charged today (0 for a free coupon)
            access_days: accessDays,
            months_access: monthsAccess,
            free_coupon: isFreeCoupon,
            free_months: freeMonths,
            next_charge_date: periodEnd.toISOString(),
            description: isFreeCoupon
                ? `${monthsAccess} months free, then ${recurringLabel} from ${nextChargeDate}`
                : `₹${rupeesToday} today for ${monthsAccess} months, then ${recurringLabel} from ${nextChargeDate}`,
        });

    } catch (error) {
        console.error('[validate-coupon] Error:', error);
        return json(500, { success: false, error: 'Server error. Try again.' });
    }
});

function json(status: number, body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
