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
  console.log('📦 Order data:', JSON.stringify(data, null, 2));

  // Try multiple paths for custom_data (LemonSqueezy can send it in different places)
  const userId = 
    data.attributes?.custom_data?.user_id ||
    data.attributes?.meta?.custom_data?.user_id ||
    data.attributes?.first_order_item?.custom_data?.user_id ||
    data.attributes?.first_order_item?.meta?.custom_data?.user_id;
  
  const variantId = data.attributes?.first_order_item?.variant_id;

  console.log('🔍 Extracted userId:', userId, 'variantId:', variantId);

  if (!userId || !variantId) {
    console.error('❌ Missing user_id or variant_id in order_created');
    console.error('❌ Available paths:', {
      'data.attributes.custom_data': data.attributes?.custom_data,
      'data.attributes.meta.custom_data': data.attributes?.meta?.custom_data,
      'data.attributes.first_order_item.custom_data': data.attributes?.first_order_item?.custom_data,
      'data.attributes.first_order_item': data.attributes?.first_order_item,
    });
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
  const subscriptionData = {
    user_id: userId,
    lemonsqueezy_order_id: data.id,
    lemonsqueezy_customer_id: data.attributes?.customer_id?.toString(),
    lemonsqueezy_product_id: data.attributes?.first_order_item?.product_id?.toString(),
    lemonsqueezy_variant_id: variantId.toString(),
    plan_name: planName,
    status: 'active',
    story_limit: plan.storyLimit,
    stories_used: 0,
    subscription_start_date: now.toISOString(),
    subscription_end_date: endDate.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: endDate.toISOString(),
  };

  console.log('💾 Inserting subscription with data:', JSON.stringify(subscriptionData, null, 2));

  const { data: insertedData, error } = await supabaseAdmin
    .from('subscriptions')
    .insert(subscriptionData)
    .select();

  if (error) {
    console.error('❌ Error creating subscription:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Subscription created for user:', userId, 'Plan:', planName);
    console.log('✅ Inserted data:', JSON.stringify(insertedData, null, 2));
  }
}

async function handleSubscriptionCreated(data: any) {
  console.log('📨 Processing subscription_created');
  console.log('📨 Subscription data:', JSON.stringify(data, null, 2));

  // Try multiple paths for custom_data (LemonSqueezy can send it in different places)
  const userId = 
    data.attributes?.custom_data?.user_id ||
    data.attributes?.meta?.custom_data?.user_id ||
    data.attributes?.meta?.custom?.user_id;
  
  const subscriptionId = data.id;
  const variantId = data.attributes?.variant_id;

  console.log('🔍 Extracted userId:', userId, 'subscriptionId:', subscriptionId, 'variantId:', variantId);

  if (!userId || !variantId) {
    console.error('❌ Missing user_id or variant_id in subscription_created');
    console.error('❌ Available paths:', {
      'data.attributes.custom_data': data.attributes?.custom_data,
      'data.attributes.meta.custom_data': data.attributes?.meta?.custom_data,
      'data.attributes.meta.custom': data.attributes?.meta?.custom,
      'data.attributes': Object.keys(data.attributes || {}),
    });
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
  const subscriptionData = {
    user_id: userId,
    lemonsqueezy_subscription_id: subscriptionId,
    lemonsqueezy_customer_id: data.attributes?.customer_id?.toString(),
    lemonsqueezy_product_id: data.attributes?.product_id?.toString(),
    lemonsqueezy_variant_id: variantId.toString(),
    plan_name: planName,
    status: data.attributes?.status === 'active' ? 'active' : 'past_due',
    story_limit: plan.storyLimit,
    stories_used: 0,
    subscription_start_date: data.attributes?.created_at || now.toISOString(),
    subscription_end_date: endDate.toISOString(),
    current_period_start: data.attributes?.renews_at ? new Date(data.attributes.renews_at).toISOString() : now.toISOString(),
    current_period_end: endDate.toISOString(),
  };

  console.log('💾 Upserting subscription with data:', JSON.stringify(subscriptionData, null, 2));

  const { data: upsertedData, error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'lemonsqueezy_subscription_id'
    })
    .select();

  if (error) {
    console.error('❌ Error upserting subscription:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Subscription upserted for user:', userId, 'Plan:', planName);
    console.log('✅ Upserted data:', JSON.stringify(upsertedData, null, 2));
  }
}

async function handleSubscriptionUpdated(data: any) {
  console.log('🔄 Processing subscription_updated');
  console.log('🔄 Subscription update data:', JSON.stringify(data, null, 2));

  const subscriptionId = data.id;
  const status = data.attributes?.status;

  if (!subscriptionId) {
    console.error('❌ Missing subscription_id in subscription_updated');
    return;
  }

  const updateData: any = {
    status: status === 'active' ? 'active' : status === 'cancelled' ? 'cancelled' : 'past_due',
  };

  if (data.attributes?.renews_at) {
    updateData.current_period_end = new Date(data.attributes.renews_at).toISOString();
  }

  console.log('💾 Updating subscription:', subscriptionId, 'with data:', JSON.stringify(updateData, null, 2));

  const { data: updatedData, error } = await supabaseAdmin
    .from('subscriptions')
    .update(updateData)
    .eq('lemonsqueezy_subscription_id', subscriptionId)
    .select();

  if (error) {
    console.error('❌ Error updating subscription:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Subscription updated:', subscriptionId);
    console.log('✅ Updated data:', JSON.stringify(updatedData, null, 2));
    if (!updatedData || updatedData.length === 0) {
      console.warn('⚠️ No subscription found with ID:', subscriptionId);
    }
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

  // Try multiple paths for subscription_id
  const subscriptionId = 
    data.attributes?.subscription_id ||
    data.id ||
    data.relationships?.subscription?.data?.id;

  if (!subscriptionId) {
    console.error('❌ Missing subscription_id in subscription_payment_success');
    console.error('❌ Available paths:', {
      'data.attributes.subscription_id': data.attributes?.subscription_id,
      'data.id': data.id,
      'data.relationships': data.relationships,
    });
    return;
  }

  const updateData: any = {
    stories_used: 0,
    current_period_start: new Date().toISOString(),
    status: 'active',
  };

  if (data.attributes?.renews_at) {
    updateData.current_period_end = new Date(data.attributes.renews_at).toISOString();
  }

  console.log('💾 Resetting subscription usage for:', subscriptionId, 'with data:', JSON.stringify(updateData, null, 2));

  // Reset story usage for new period
  const { data: updatedData, error } = await supabaseAdmin
    .from('subscriptions')
    .update(updateData)
    .eq('lemonsqueezy_subscription_id', subscriptionId)
    .select();

  if (error) {
    console.error('❌ Error resetting subscription usage:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Subscription renewed, usage reset:', subscriptionId);
    console.log('✅ Updated data:', JSON.stringify(updatedData, null, 2));
    if (!updatedData || updatedData.length === 0) {
      console.warn('⚠️ No subscription found with ID:', subscriptionId);
    }
  }
}
