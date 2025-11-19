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
 */
function getplanNameFromVariantId(variantId: string | number): PlanName | null {
  // Normalize variant ID to string
  const normalizedVariantId = String(variantId);
  
  const slackerVariantId = process.env.LEMONSQUEEZY_SLACKER_VARIANT_ID;
  const studentVariantId = process.env.LEMONSQUEEZY_STUDENT_VARIANT_ID;
  const nerdVariantId = process.env.LEMONSQUEEZY_NERD_VARIANT_ID;

  // Normalize all variant IDs to strings for comparison
  const variantMap: Record<string, PlanName> = {
    [String(slackerVariantId || '')]: 'slacker',
    [String(studentVariantId || '')]: 'student',
    [String(nerdVariantId || '')]: 'nerd',
  };

  const mappedPlan = variantMap[normalizedVariantId] || null;

  console.log('🔍 Variant ID Mapping:', {
    receivedVariantId: variantId,
    normalizedVariantId,
    slackerVariantId,
    studentVariantId,
    nerdVariantId,
    slackerVariantIdType: typeof slackerVariantId,
    studentVariantIdType: typeof studentVariantId,
    nerdVariantIdType: typeof nerdVariantId,
    variantMap,
    mappedPlan,
    matchCheck: {
      matchesSlacker: normalizedVariantId === String(slackerVariantId),
      matchesStudent: normalizedVariantId === String(studentVariantId),
      matchesNerd: normalizedVariantId === String(nerdVariantId),
    },
    directComparison: {
      vsSlacker: `${normalizedVariantId} === ${String(slackerVariantId)} = ${normalizedVariantId === String(slackerVariantId)}`,
      vsStudent: `${normalizedVariantId} === ${String(studentVariantId)} = ${normalizedVariantId === String(studentVariantId)}`,
      vsNerd: `${normalizedVariantId} === ${String(nerdVariantId)} = ${normalizedVariantId === String(nerdVariantId)}`,
    }
  });

  return mappedPlan;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📨 Received Lemon Squeezy webhook:', body.meta?.event_name);
    console.log('📦 Full webhook payload:', JSON.stringify(body, null, 2));

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
        // Skip order_created - subscription_created will handle everything
        console.log('⏭️ Skipping order_created - subscription_created will handle it');
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
  console.log('📦 Order data:', JSON.stringify(data, null, 2));

  // Try to get user_id from custom_data (can be in different places)
  const userId = data.attributes.custom_data?.user_id 
    || data.attributes.custom_data?.custom?.user_id
    || data.attributes.checkout_data?.custom?.user_id;
  const variantId = data.attributes.first_order_item?.variant_id;

  console.log('🔍 Extracted userId:', userId, 'variantId:', variantId);

  if (!userId || !variantId) {
    console.error('❌ Missing user_id or variant_id in order_created');
    console.error('❌ Order attributes:', JSON.stringify(data.attributes, null, 2));
    return;
  }

  const planName = getplanNameFromVariantId(variantId.toString());

  if (!planName) {
    console.error('❌ Unknown variant ID:', variantId);
    console.error('❌ Available variant IDs:', {
      slacker: process.env.LEMONSQUEEZY_SLACKER_VARIANT_ID,
      student: process.env.LEMONSQUEEZY_STUDENT_VARIANT_ID,
      nerd: process.env.LEMONSQUEEZY_NERD_VARIANT_ID,
    });
    return;
  }

  console.log('✅ Mapped variant ID to plan:', { variantId, planName, storyLimit: SUBSCRIPTION_PLANS[planName].storyLimit });

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

/**
 * Get user_id from customer email by looking up in Supabase auth
 */
async function getUserIdFromEmail(email: string): Promise<string | null> {
  try {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      console.error('❌ Error fetching users:', error);
      return null;
    }
    const user = users.users.find(u => u.email === email);
    return user?.id || null;
  } catch (error) {
    console.error('❌ Error in getUserIdFromEmail:', error);
    return null;
  }
}

async function handleSubscriptionCreated(data: any) {
  console.log('📨 Processing subscription_created');
  console.log('📨 Subscription data:', JSON.stringify(data, null, 2));

  // Try multiple ways to get user_id
  let userId = data.attributes.custom_data?.user_id 
    || data.attributes.custom_data?.custom?.user_id
    || data.attributes.checkout_data?.custom?.user_id;
  
  const subscriptionId = data.id;
  const variantId = data.attributes.variant_id;
  const customerEmail = data.attributes.user_email || data.attributes.customer_email;

  // If user_id not found in custom_data, try to get it from email
  if (!userId && customerEmail) {
    console.log('🔍 User ID not found in custom_data, trying to find by email:', customerEmail);
    userId = await getUserIdFromEmail(customerEmail);
    if (userId) {
      console.log('✅ Found user_id from email:', userId);
    }
  }

  console.log('🔍 Extracted userId:', userId, 'variantId:', variantId, 'email:', customerEmail);

  if (!userId || !variantId) {
    console.error('❌ Missing user_id or variant_id in subscription_created');
    console.error('❌ Subscription attributes:', JSON.stringify(data.attributes, null, 2));
    return;
  }

  const planName = getplanNameFromVariantId(variantId.toString());

  if (!planName) {
    console.error('❌ Unknown variant ID:', variantId);
    console.error('❌ Available variant IDs:', {
      slacker: process.env.LEMONSQUEEZY_SLACKER_VARIANT_ID,
      student: process.env.LEMONSQUEEZY_STUDENT_VARIANT_ID,
      nerd: process.env.LEMONSQUEEZY_NERD_VARIANT_ID,
    });
    return;
  }

  console.log('✅ Mapped variant ID to plan:', { variantId, planName, storyLimit: SUBSCRIPTION_PLANS[planName].storyLimit });

  const plan = SUBSCRIPTION_PLANS[planName];
  const now = new Date();
  const endDate = new Date(data.attributes.renews_at || now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // First, try to find existing subscription by subscription_id
  const { data: existingBySubId } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('lemonsqueezy_subscription_id', subscriptionId)
    .single();

  // If not found, try to find by user_id and variant_id (from order_created)
  let existingSubscription = existingBySubId;
  if (!existingSubscription) {
    const { data: existingByUserVariant } = await supabaseAdmin
      .from('subscriptions')
      .select('id, lemonsqueezy_subscription_id')
      .eq('user_id', userId)
      .eq('lemonsqueezy_variant_id', variantId.toString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    existingSubscription = existingByUserVariant;
  }

  // Upsert subscription record - update if exists, insert if not
  const subscriptionData = {
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
  };

  let error;
  if (existingSubscription) {
    // Update existing subscription
    console.log('🔄 Updating existing subscription:', existingSubscription.id);
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existingSubscription.id);
    error = updateError;
  } else {
    // Insert new subscription
    console.log('➕ Inserting new subscription');
    const { error: insertError } = await supabaseAdmin
      .from('subscriptions')
      .insert(subscriptionData);
    error = insertError;
  }

  if (error) {
    console.error('❌ Error upserting subscription:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Subscription upserted for user:', userId, 'Plan:', planName);
  }
}

async function handleSubscriptionUpdated(data: any) {
  console.log('🔄 Processing subscription_updated');
  console.log('🔄 Subscription update data:', JSON.stringify(data, null, 2));

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
  console.log('💰 Payment success data:', JSON.stringify(data, null, 2));

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
