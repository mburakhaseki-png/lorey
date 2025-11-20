import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current subscription
    const { data: subscription, error: subError } = await supabase
      .rpc('get_user_subscription', { p_user_id: user.id });

    if (subError || !subscription || subscription.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No subscription found' },
        { status: 404 }
      );
    }

    const sub = subscription[0];
    
    // Decrement story usage (but don't go below 0)
    const newStoriesUsed = Math.max(0, (sub.stories_used || 0) - 1);

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ stories_used: newStoriesUsed })
      .eq('user_id', user.id)
      .eq('lemonsqueezy_subscription_id', sub.lemonsqueezy_subscription_id);

    if (updateError) {
      console.error('Error decrementing usage:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to decrement usage' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Usage decrement error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

