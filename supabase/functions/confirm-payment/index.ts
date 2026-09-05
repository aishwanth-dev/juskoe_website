// ============================================
// Supabase Edge Function: confirm-payment
// Verifies a Razorpay payment and activates Pro. Handles the first-time bonus
// month, coupon offers (monthly + annual), and monthly→annual upgrade days.
//
// Entitlement is granted on PROOF OF PAYMENT (a captured/authorized payment),
// not on subscription status, which can lag by seconds right after a UPI charge.
//
// NOTE: canonical copy — keep website/supabase/functions/confirm-payment identical.
// ============================================

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!;
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;

const DAY_MS = 24 * 60 * 60 * 1000;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { subscriptionId, paymentId } = await req.json();
        if (!subscriptionId) {
            return jsonResponse(400, { success: false, error: 'Missing subscriptionId' });
        }

        const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

        // ---- 1. Read the subscription (source of user_id + plan notes) ----
        const rzpResponse = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
            headers: { 'Authorization': `Basic ${auth}` },
        });
        if (!rzpResponse.ok) {
            return jsonResponse(502, { success: false, error: 'Could not verify subscription' });
        }
        const subscription = await rzpResponse.json();
        console.log(`[confirm] Sub ${subscriptionId} status: ${subscription.status}`);

        // ---- 1b. PROOF OF PAYMENT ----
        // Verify the payment itself (captured/authorized) and that it belongs to
        // this subscription (via its invoice). This is immune to the few-second
        // lag where a paid subscription still reports 'created'/'pending'.
        let paymentVerified = false;
        if (paymentId) {
            const payRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Basic ${auth}` },
            });
            if (payRes.ok) {
                const payment = await payRes.json();
                const paid = payment.status === 'captured' || payment.status === 'authorized';
                let belongs = true;
                if (payment.invoice_id) {
                    const invRes = await fetch(`https://api.razorpay.com/v1/invoices/${payment.invoice_id}`, {
                        headers: { 'Authorization': `Basic ${auth}` },
                    });
                    if (invRes.ok) {
                        const invoice = await invRes.json();
                        belongs = invoice.subscription_id === subscriptionId;
                    }
                }
                paymentVerified = paid && belongs;
                console.log(`[confirm] Payment ${paymentId}: status=${payment.status} belongs=${belongs} -> verified=${paymentVerified}`);
            } else {
                console.warn(`[confirm] Could not fetch payment ${paymentId}: ${payRes.status}`);
            }
        }

        const subscriptionPaid = subscription.status === 'active' || subscription.status === 'authenticated';
        if (!paymentVerified && !subscriptionPaid) {
            console.warn(`[confirm] Refusing Pro for ${subscriptionId}: no captured payment and subscription is '${subscription.status}'.`);
            return jsonResponse(402, {
                success: false,
                error: 'Payment not completed yet. If you were charged, Pro will activate automatically in a moment.',
            });
        }

        // ---- 2. Extract info from notes ----
        const userId = subscription.notes?.user_id;
        if (!userId) {
            return jsonResponse(400, { success: false, error: 'No user_id in subscription' });
        }

        const planType = subscription.notes?.plan_type || 'pro_monthly';
        const bonusDays = parseInt(subscription.notes?.bonus_days || '0', 10);
        const bonusMonth = subscription.notes?.bonus_month === 'true';
        const couponOffer = subscription.notes?.coupon_offer === 'true';
        const couponCode = subscription.notes?.coupon_code || null;
        const notesAccessDays = parseInt(subscription.notes?.access_days || '0', 10);

        // ---- 3. Calculate access window ----
        const now = new Date();
        let periodEnd;
        if (couponOffer && notesAccessDays > 0) {
            // Coupon offer: upfront amount paid today buys `access_days`
            // (60 monthly / 396 annual). Razorpay's current_end is null until
            // the recurring cycle begins at start_at, so use the offer window.
            periodEnd = new Date(now.getTime() + notesAccessDays * DAY_MS);
        } else if (bonusMonth) {
            // First-time bonus month: ₹359 upfront buys 60 days.
            const accessDays = notesAccessDays || BONUS_MONTH_ACCESS_DAYS_DEFAULT();
            periodEnd = new Date(now.getTime() + accessDays * DAY_MS);
        } else if (subscription.current_end) {
            periodEnd = new Date(subscription.current_end * 1000 + bonusDays * DAY_MS);
        } else if (planType === 'pro_annual') {
            periodEnd = new Date(now.getTime() + (365 + bonusDays) * DAY_MS);
        } else {
            periodEnd = new Date(now.getTime() + 30 * DAY_MS);
        }

        // ---- 4. Update DB ----
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { error: subError } = await supabase.from('subscriptions').upsert({
            user_id: userId,
            plan: 'pro',
            status: 'active',
            razorpay_subscription_id: subscriptionId,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
        }, { onConflict: 'razorpay_subscription_id' });
        if (subError) console.error(`[confirm] subscription upsert failed: ${subError.message}`);

        // UPSERT the profile (not UPDATE) so a missing profile row still ends Pro.
        const { error: profError } = await supabase.from('profiles').upsert({
            id: userId,
            email: subscription.notes?.email || `${userId}@no-email.local`,
            plan: 'pro',
            subscription_status: 'active',
            updated_at: now.toISOString(),
        }, { onConflict: 'id' });
        if (profError) {
            console.error(`[confirm] profile upsert failed: ${profError.message}`);
            return jsonResponse(500, { success: false, error: 'Could not activate Pro. Please contact support.' });
        }

        // ---- Finalize the coupon reservation NOW that payment is proven ----
        // This is the only place a coupon_redemptions row is ever marked paid.
        // See validate-coupon for why the row is inserted as unpaid up front.
        if (couponOffer && couponCode) {
            const userEmail = (subscription.notes?.email || '').toLowerCase().trim();
            if (userEmail) {
                const { error: redeemErr } = await supabase
                    .from('coupon_redemptions')
                    .update({ paid: true, redeemed_at: now.toISOString() })
                    .eq('email', userEmail)
                    .eq('coupon_code', couponCode);
                if (redeemErr) console.error(`[confirm] coupon redemption finalize failed: ${redeemErr.message}`);
                else console.log(`[confirm] Coupon ${couponCode} finalized as paid for ${userEmail}`);
            }
        }

        console.log(`[confirm] User ${userId} → Pro (${planType}). Ends: ${periodEnd.toISOString()}. bonusMonth=${bonusMonth} coupon=${couponOffer} upgradeBonus=${bonusDays}d`);

        return jsonResponse(200, {
            success: true,
            plan: 'pro',
            userId,
            planType,
            bonusMonth,
            couponOffer,
            currentPeriodEnd: periodEnd.toISOString(),
        });

    } catch (error) {
        console.error('[confirm] Error:', error);
        return jsonResponse(500, { success: false, error: 'Internal error' });
    }
});

function BONUS_MONTH_ACCESS_DAYS_DEFAULT() { return 60; }

function jsonResponse(status, data) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
