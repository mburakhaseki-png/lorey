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

    // Get origin URL for redirect after payment
    const origin = request.headers.get('origin') || request.headers.get('referer') || 'https://loreyai.com';
    const baseUrl = origin.replace(/\/$/, ''); // Remove trailing slash
    const redirectUrl = `${baseUrl}/`;

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
      allVariants: PRODUCT_VARIANTS,
      envVars: {
        slacker: process.env.LEMONSQUEEZY_SLACKER_VARIANT_ID,
        student: process.env.LEMONSQUEEZY_STUDENT_VARIANT_ID,
        nerd: process.env.LEMONSQUEEZY_NERD_VARIANT_ID,
      }
    });

    if (!variantId || variantId.includes('VARIANT_ID')) {
      console.error('❌ Variant ID not configured properly for plan:', planName);
      return NextResponse.json(
        { error: `Variant ID not configured for plan: ${planName}` },
        { status: 500 }
      );
    }

    if (!LEMONSQUEEZY_API_KEY) {
      return NextResponse.json(
        { error: 'Lemon Squeezy API key not configured' },
        { status: 500 }
      );
    }

    // Create checkout session with Lemon Squeezy
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              custom: {
                user_id: user.id,
              },
            },
            product_options: {
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
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Lemon Squeezy error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const checkoutUrl = data.data.attributes.url;

    console.log('✅ Checkout created with redirect URL:', redirectUrl);

    return NextResponse.json({ checkoutUrl });

  } catch (error) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
