import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || 'YOUR_STORE_ID';

// TODO: Lemon Squeezy dashboard'dan alınacak variant ID'ler
const PRODUCT_VARIANTS: Record<string, string> = {
  slacker: process.env.LEMONSQUEEZY_SLACKER_VARIANT_ID || 'SLACKER_VARIANT_ID',
  student: process.env.LEMONSQUEEZY_STUDENT_VARIANT_ID || 'STUDENT_VARIANT_ID',
  nerd: process.env.LEMONSQUEEZY_NERD_VARIANT_ID || 'NERD_VARIANT_ID',
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planName } = body;

    if (!planName || !['slacker', 'student', 'nerd'].includes(planName)) {
      return NextResponse.json(
        { error: 'Invalid plan name' },
        { status: 400 }
      );
    }

    const variantId = PRODUCT_VARIANTS[planName];

    console.log('🔍 Checkout Request:', {
      planName,
      variantId,
      storeId: LEMONSQUEEZY_STORE_ID,
      allVariants: PRODUCT_VARIANTS
    });

    if (!LEMONSQUEEZY_API_KEY) {
      return NextResponse.json(
        { error: 'Lemon Squeezy API key not configured' },
        { status: 500 }
      );
    }

    // Get the origin URL (production or localhost)
    const origin = request.headers.get('origin') || 
                   process.env.NEXT_PUBLIC_SITE_URL || 
                   'https://loreyai.com';
    const redirectUrl = `${origin}/?subscription=success`;

    console.log('🔗 Redirect URL:', redirectUrl);

    // Create checkout session with Lemon Squeezy
    // Note: redirect_url is set in checkout_data, not checkout_options
    const checkoutPayload = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: user.email,
            custom: {
              user_id: user.id,
            },
            redirect_url: redirectUrl,
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: LEMONSQUEEZY_STORE_ID,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId,
            },
          },
        },
      },
    };

    console.log('📤 Checkout payload:', JSON.stringify(checkoutPayload, null, 2));

    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify(checkoutPayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Lemon Squeezy API error:', errorData);
      console.error('❌ Response status:', response.status);
      console.error('❌ Response statusText:', response.statusText);
      
      // Try to parse error as JSON
      let errorMessage = 'Failed to create checkout session';
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.errors?.[0]?.detail || errorMessage;
      } catch (e) {
        // If not JSON, use the raw error
        errorMessage = errorData;
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: response.status || 500 }
      );
    }

    const data = await response.json();
    const checkoutUrl = data.data.attributes.url;

    return NextResponse.json({ checkoutUrl });

  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
