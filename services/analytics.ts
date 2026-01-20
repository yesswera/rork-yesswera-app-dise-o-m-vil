import { API_BASE } from '@/constants/api';
import { Survey, SurveyResponse, UserBehaviorEvent, AnalyticsInsight, UserType } from '@/constants/types';

const API_ENDPOINTS = {
  trackEvent: `${API_BASE}/analytics/event`,
  surveyResponse: `${API_BASE}/analytics/survey-response`,
  getActiveSurveys: (userType: UserType) => `${API_BASE}/analytics/surveys/active?userType=${userType}`,
  getInsights: (userId: string) => `${API_BASE}/analytics/insights/${userId}`,
};

export async function trackEvent(event: Omit<UserBehaviorEvent, 'id'>): Promise<void> {
  try {
    await fetch(API_ENDPOINTS.trackEvent, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

export async function submitSurveyResponse(response: Omit<SurveyResponse, 'id'>): Promise<void> {
  try {
    await fetch(API_ENDPOINTS.surveyResponse, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    });
  } catch (error) {
    console.error('Error submitting survey response:', error);
  }
}

export async function getActiveSurveys(userType: UserType): Promise<Survey[]> {
  try {
    const response = await fetch(API_ENDPOINTS.getActiveSurveys(userType));
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error fetching surveys:', error);
    return [];
  }
}

export async function getInsights(userId: string): Promise<AnalyticsInsight[]> {
  try {
    const response = await fetch(API_ENDPOINTS.getInsights(userId));
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error fetching insights:', error);
    return [];
  }
}
