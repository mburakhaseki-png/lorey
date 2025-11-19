import { createClient } from '@/utils/supabase/client';

export type PlanName = 'slacker' | 'student' | 'nerd';

export interface SubscriptionPlan {
  name: PlanName;
  displayName: string;
  price: number;
  storyLimit: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<PlanName, SubscriptionPlan> = {
  slacker: {
    name: 'slacker',
    displayName: 'Slacker',
    price: 15,
    storyLimit: 10,
    features: [
      '10 stories per month',
      'All universes',
      'Interactive quizzes',
      'HD image generation'
    ]
  },
  student: {
    name: 'student',
    displayName: 'Student',
    price: 25,
    storyLimit: 30,
    features: [
      '30 stories per month',
      'All universes',
      'Interactive quizzes',
      'HD image generation',
      'Priority support'
    ]
  },
  nerd: {
    name: 'nerd',
    displayName: 'Nerd',
    price: 45,
    storyLimit: 50,
    features: [
      '50 stories per month',
      'All universes',
      'Interactive quizzes',
      'HD image generation',
      'Priority support',
      'Early access to features'
    ]
  }
};

export interface UserSubscription {
  plan_name: PlanName;
  story_limit: number;
  stories_used: number;
  stories_remaining: number;
  subscription_end_date: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
}

/**
 * Get user's current subscription from Supabase
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('get_user_subscription', { p_user_id: userId });

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

/**
 * Check if user can create a story
 */
export async function canUserCreateStory(userId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('can_user_create_story', { p_user_id: userId });

  if (error) {
    console.error('Error checking story permission:', error);
    return false;
  }

  return data === true;
}

/**
 * Increment user's story usage count
 */
export async function incrementStoryUsage(userId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc('increment_story_usage', { p_user_id: userId });

  if (error) {
    console.error('Error incrementing story usage:', error);
    return false;
  }

  return data === true;
}

/**
 * Get subscription status message for UI
 */
export function getSubscriptionStatusMessage(subscription: UserSubscription | null): string {
  if (!subscription) {
    return 'No active subscription';
  }

  if (subscription.stories_remaining <= 0) {
    return 'Story limit reached';
  }

  return `${subscription.stories_remaining} stories remaining`;
}

/**
 * Get plan details by name
 */
export function getPlanByName(planName: PlanName): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[planName];
}
