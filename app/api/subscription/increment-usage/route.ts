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

    // Increment story usage
    const { data: incremented, error } = await supabase
      .rpc('increment_story_usage', { p_user_id: user.id });

    if (error) {
      console.error('Error incrementing usage:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to increment usage' },
        { status: 500 }
      );
    }

    if (!incremented) {
      return NextResponse.json({
        success: false,
        error: 'Failed to increment usage - limit may have been reached',
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Usage increment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
