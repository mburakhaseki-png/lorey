import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { canCreate: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user can create story using Supabase function
    const { data: canCreate, error } = await supabase
      .rpc('can_user_create_story', { p_user_id: user.id });

    if (error) {
      console.error('Error checking subscription:', error);
      return NextResponse.json(
        { canCreate: false, error: 'Failed to check subscription' },
        { status: 500 }
      );
    }

    if (!canCreate) {
      // Get subscription details for better error message
      const { data: subscription } = await supabase
        .rpc('get_user_subscription', { p_user_id: user.id });

      if (!subscription || subscription.length === 0) {
        return NextResponse.json({
          canCreate: false,
          error: 'No active subscription. Please subscribe to create stories.',
        });
      }

      const sub = subscription[0];
      if (sub.stories_remaining <= 0) {
        return NextResponse.json({
          canCreate: false,
          error: `Story limit reached (${sub.stories_used}/${sub.story_limit}). Upgrade your plan or wait for renewal.`,
        });
      }
    }

    return NextResponse.json({ canCreate: true });

  } catch (error) {
    console.error('Subscription check error:', error);
    return NextResponse.json(
      { canCreate: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
