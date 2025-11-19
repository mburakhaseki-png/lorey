import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PlanName, SUBSCRIPTION_PLANS } from '@/utils/subscription';

const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Map Lemon Squeezy variant ID to plan name
 * TODO: Update these with actual variant IDs from Lemon Squeezy dashboard
 */
function getplanNameFromVariantId(variantId: string): PlanName | null {
  const variantMap: Record<string, PlanName> = {
    [process.env.LEMONSQUEEZY_SLACKER_VARIANT_ID || 'SLACKER_VARIANT_ID']: 'slacker',
    [process.env.LEMONSQUEEZY_STUDENT_VARIANT_ID || 'STUDENT_VARIANT_ID']: 'student',
    [process.env.LEMONSQUEEZY_NERD_VARIANT_ID || 'NERD_VARIANT_ID']: 'nerd',
  };

  return variantMap[variantId] || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📨 Received Lemon Squeezy webhook:', body.meta?.event_name);

    // Verify webhook signature (if secret is set)
    if (LEMONSQUEEZY_WEBHOOK_SECRET) {
      const signature = request.headers.get('x-signature');
      // TODO: Implement signature verification
      // https://docs.lemonsqueezy.com/help/webhooks#signing-requests
    }

    const eventName = body.meta?.event_name;
    const data = body.data;

    // Handle different webhook events
    switch (eventName) {
      case 'order_created':
        await handleOrderCreated(data);
        break;

      case 'subscription_created':
        await handleSubscriptionCreated(data);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(data);
        break;

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(data);
        break;

      case 'subscription_expired':
        await handleSubscriptionExpired(data);
        break;

      case 'subscription_payment_success':
        await handleSubscriptionPaymentSuccess(data);
        break;

      default:
        console.log(`⚠️ Unhandled webhook event: ${eventName}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleOrderCreated(data: any) {
  console.log('📦 Processing order_created');

  const userId = data.attributes.custom_data?.user_id;
  const variantId = data.attributes.first_order_item?.variant_id;

  if (!userId || !variantId) {
    console.error('❌ Missing user_id or variant_id in order_created');
    return;
  }

  const planName = getplanNameFromVariantId(variantId.toString());

  if (!planName) {
    console.error('❌ Unknown variant ID:', variantId);
    return;
  }

  const plan = SUBSCRIPTION_PLANS[planName];
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  // Create subscription record
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: userId,
      lemonsqueezy_order_id: data.id,
      lemonsqueezy_customer_id: data.attributes.customer_id?.toString(),
      lemonsqueezy_product_id: data.attributes.first_order_item?.product_id?.toString(),
      lemonsqueezy_variant_id: variantId.toString(),
      plan_name: planName,
      status: 'active',
      story_limit: plan.storyLimit,
      stories_used: 0,
      subscription_start_date: now.toISOString(),
      subscription_end_date: endDate.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: endDate.toISOString(),
    });

  if (error) {
    console.error('❌ Error creating subscription:', error);
  } else {
    console.log('✅ Subscription created for user:', userId, 'Plan:', planName);
  }
}

async function handleSubscriptionCreated(data: any) {
  console.log('📨 Processing subscription_created');

  const userId = data.attributes.custom_data?.user_id;
  const subscriptionId = data.id;
  const variantId = data.attributes.variant_id;

  if (!userId || !variantId) {
    console.error('❌ Missing user_id or variant_id in subscription_created');
    return;
  }

  const planName = getplanNameFromVariantId(variantId.toString());

  if (!planName) {
    console.error('❌ Unknown variant ID:', variantId);
    return;
  }

  const plan = SUBSCRIPTION_PLANS[planName];
  const now = new Date();
  const endDate = new Date(data.attributes.renews_at || now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Upsert subscription record
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      lemonsqueezy_subscription_id: subscriptionId,
      lemonsqueezy_customer_id: data.attributes.customer_id?.toString(),
      lemonsqueezy_product_id: data.attributes.product_id?.toString(),
      lemonsqueezy_variant_id: variantId.toString(),
      plan_name: planName,
      status: data.attributes.status === 'active' ? 'active' : 'past_due',
      story_limit: plan.storyLimit,
      stories_used: 0,
      subscription_start_date: data.attributes.created_at,
      subscription_end_date: endDate.toISOString(),
      current_period_start: data.attributes.renews_at ? new Date(data.attributes.renews_at).toISOString() : now.toISOString(),
      current_period_end: endDate.toISOString(),
    }, {
      onConflict: 'lemonsqueezy_subscription_id'
    });

  if (error) {
    console.error('❌ Error upserting subscription:', error);
  } else {
    console.log('✅ Subscription upserted for user:', userId, 'Plan:', planName);
  }
}

async function handleSubscriptionUpdated(data: any) {
  console.log('🔄 Processing subscription_updated');

  const subscriptionId = data.id;
  const status = data.attributes.status;

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: status === 'active' ? 'active' : status === 'cancelled' ? 'cancelled' : 'past_due',
      current_period_end: data.attributes.renews_at ? new Date(data.attributes.renews_at).toISOString() : undefined,
    })
    .eq('lemonsqueezy_subscription_id', subscriptionId);

  if (error) {
    console.error('❌ Error updating subscription:', error);
  } else {
    console.log('✅ Subscription updated:', subscriptionId);
  }
}

async function handleSubscriptionCancelled(data: any) {
  console.log('❌ Processing subscription_cancelled');

  const subscriptionId = data.id;

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
    })
    .eq('lemonsqueezy_subscription_id', subscriptionId);

  if (error) {
    console.error('❌ Error cancelling subscription:', error);
  } else {
    console.log('✅ Subscription cancelled:', subscriptionId);
  }
}

async function handleSubscriptionExpired(data: any) {
  console.log('⏰ Processing subscription_expired');

  const subscriptionId = data.id;

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'expired',
    })
    .eq('lemonsqueezy_subscription_id', subscriptionId);

  if (error) {
    console.error('❌ Error expiring subscription:', error);
  } else {
    console.log('✅ Subscription expired:', subscriptionId);
  }
}

async function handleSubscriptionPaymentSuccess(data: any) {
  console.log('💰 Processing subscription_payment_success');

  const subscriptionId = data.attributes.subscription_id;

  // Reset story usage for new period
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      stories_used: 0,
      current_period_start: new Date().toISOString(),
      current_period_end: data.attributes.renews_at ? new Date(data.attributes.renews_at).toISOString() : undefined,
      status: 'active',
    })
    .eq('lemonsqueezy_subscription_id', subscriptionId);

  if (error) {
    console.error('❌ Error resetting subscription usage:', error);
  } else {
    console.log('✅ Subscription renewed, usage reset:', subscriptionId);
  }
}
