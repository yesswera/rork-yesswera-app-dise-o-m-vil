import { Survey, UserBehaviorEvent, AnalyticsInsight, UserType } from '@/constants/types';

// Analytics is not yet connected to Supabase.
// Functions are no-ops that log locally only.
// TODO: Create analytics table in Supabase when ready for production analytics.

export async function trackEvent(event: Omit<UserBehaviorEvent, 'id'>): Promise<void> {
  // No-op: just local console log (handled by contexts/analytics.tsx)
}

export async function submitSurveyResponse(response: any): Promise<void> {
  console.log('Survey response (local only):', response);
}

export async function getActiveSurveys(userType: UserType): Promise<Survey[]> {
  return [];
}

export async function getInsights(userId: string): Promise<AnalyticsInsight[]> {
  return [];
}
