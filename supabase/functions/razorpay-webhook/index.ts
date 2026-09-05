// ============================================
// Supabase Edge Function: razorpay-webhook
// Handles Razorpay payment events (subscription activated/cancelled)
// Updates user profile plan to 'pro' or 'free'
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!;

// HMAC SHA256 using Web Crypto API (built-in, no external deps)
async function verifySignature(body: string, signature: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(RAZORPAY_WEBHOOK_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const hashArray = Array.from(new Uint8Array(sig));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === signature;
}

serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // ---- 1. Verify Razorpay signature ----
        const body = await req.text();
        const razorpaySignature = req.headers.get('x-razorpay-signature');

        if (!razorpaySignature) {
            console.error('[webhook] Missing Razorpay signature');
            return new Response('Missing signature', { status: 400 });
        }

        if (RAZORPAY_WEBHOOK_SECRET) {
            const valid = await verifySignature(body, razorpaySignature);
            if (!valid) {
                console.error('[webhook] Invalid signature');
                return new Response('Invalid signature', { status: 401 });
            }
        }

        // ---- 2. Parse webhook event ----
        const event = JSON.parse(body);
        const eventType = event.event;
        console.log(`[webhook] Event: ${eventType}`);

        // Use service role client for DB writes (no user context in webhooks)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // ---- 3. Handle events ----
        switch (eventType) {
            case 'subscription.authenticated':
            case 'subscription.activated':
            case 'subscription.charged': {
                const subscription = event.payload.subscription.entity;
                const subscriptionId = subscription.id;
                const userId = subscription.notes?.user_id;

                if (!userId) {
                    console.error('[webhook] No user_id in subscription notes');
                    return new Response('OK', { status: 200 });
                }

                console.log(`[webhook] Activating Pro for user ${userId} (event ${eventType})`);

                const DAY_MS = 24 * 60 * 60 * 1000;
                const now = new Date();

                // Period end priority:
                //  1. Coupon / bonus offers: the upfront amount buys `access_days`
                //     (60 monthly, 396 annual) BEFORE the recurring cycle starts,
                //     so Razorpay's current_end is null here — use the notes window.
                //  2. Otherwise use Razorpay's own current_start/current_end.
                //  3. Fall back to plan-length from now.
                const couponOffer = subscription.notes?.coupon_offer === 'true';
                const bonusMonth = subscription.notes?.bonus_month === 'true';
                const accessDays = parseInt(subscription.notes?.access_days || '0', 10);
                const bonusDays = parseInt(subscription.notes?.bonus_days || '0', 10);
                const planType = subscription.notes?.plan_type || 'pro_monthly';

                let periodStart = now;
                let periodEnd;
                if ((couponOffer || bonusMonth) && accessDays > 0) {
                    periodEnd = new Date(now.getTime() + accessDays * DAY_MS);
                } else if (subscription.current_end) {
                    if (subscription.current_start) periodStart = new Date(subscription.current_start * 1000);
                    periodEnd = new Date(subscription.current_end * 1000 + bonusDays * DAY_MS);
                } else if (planType === 'pro_annual') {
                    periodEnd = new Date(now.getTime() + (365 + bonusDays) * DAY_MS);
                } else {
                    periodEnd = new Date(now.getTime() + 30 * DAY_MS);
                }

                // Upsert so a coupon/bonus row that only exists as 'created' is
                // promoted, and a missing row is created rather than no-op updated.
                await supabase
                    .from('subscriptions')
                    .upsert({
                        user_id: userId,
                        plan: 'pro',
                        status: 'active',
                        razorpay_subscription_id: subscriptionId,
                        current_period_start: periodStart.toISOString(),
                        current_period_end: periodEnd.toISOString(),
                    }, { onConflict: 'razorpay_subscription_id' });

                await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        email: subscription.notes?.email || `${userId}@no-email.local`,
                        plan: 'pro',
                        subscription_status: 'active',
                        updated_at: now.toISOString(),
                    }, { onConflict: 'id' });

                // Finalize the coupon reservation as paid — same as confirm-payment.
                // The webhook can be the first confirmation of a real charge (e.g.
                // subscription.charged), so this must happen here too, not only in
                // the client-driven confirm-payment call.
                const couponCode = subscription.notes?.coupon_code || null;
                if (couponOffer && couponCode) {
                    const userEmail = (subscription.notes?.email || '').toLowerCase().trim();
                    if (userEmail) {
                        const { error: redeemErr } = await supabase
                            .from('coupon_redemptions')
                            .update({ paid: true, redeemed_at: now.toISOString() })
                            .eq('email', userEmail)
                            .eq('coupon_code', couponCode);
                        if (redeemErr) console.error(`[webhook] coupon redemption finalize failed: ${redeemErr.message}`);
                    }
                }

                console.log(`[webhook] User ${userId} → Pro. Ends ${periodEnd.toISOString()} (coupon=${couponOffer} bonusMonth=${bonusMonth})`);
                break;
            }

            case 'subscription.cancelled':
            case 'subscription.completed': {
                const subscription = event.payload.subscription.entity;
                const subscriptionId = subscription.id;
                const userId = subscription.notes?.user_id;

                if (!userId) {
                    console.error('[webhook] No user_id in subscription notes');
                    return new Response('OK', { status: 200 });
                }

                console.log(`[webhook] Cancelling Pro for user ${userId}`);

                // Update subscription status
                await supabase
                    .from('subscriptions')
                    .update({ status: 'cancelled' })
                    .eq('razorpay_subscription_id', subscriptionId);

                // Downgrade profile to free
                await supabase
                    .from('profiles')
                    .update({
                        plan: 'free',
                        subscription_status: 'cancelled',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', userId);

                console.log(`[webhook] User ${userId} downgraded to free`);
                break;
            }

            case 'payment.failed': {
                const payment = event.payload.payment.entity;
                console.error(`[webhook] Payment failed: ${payment.id} - ${payment.error_description}`);
                break;
            }

            default:
                console.log(`[webhook] Unhandled event: ${eventType}`);
        }

        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('[webhook] Error:', error);
        return new Response('OK', { status: 200 });
    }
});
