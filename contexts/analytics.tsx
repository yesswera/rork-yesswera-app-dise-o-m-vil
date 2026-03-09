import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from './auth';
import { Survey, SurveyResponse, UserBehaviorEvent } from '@/constants/types';
import { supabase } from '@/constants/supabase';

// ============================================================================
// ANALYTICS SERVICE — Persists events to Supabase with batching
// ============================================================================

const EVENT_BATCH_SIZE = 10;
const EVENT_FLUSH_INTERVAL = 30000; // 30 seconds

let eventQueue: any[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushEvents() {
  if (eventQueue.length === 0) return;

  const batch = [...eventQueue];
  eventQueue = [];

  try {
    const rows = batch.map(e => ({
      user_id: e.userId,
      user_type: e.userType,
      event_type: e.eventType,
      event_data: e.eventData || {},
      session_id: e.sessionId,
      location: e.location
        ? `SRID=4326;POINT(${e.location.longitude} ${e.location.latitude})`
        : null,
      created_at: e.timestamp,
    }));

    const { error } = await supabase.from('analytics_events').insert(rows);
    if (error) {
      console.warn('Analytics flush error:', error.message);
      // Put events back in queue on failure (max 100 to avoid memory leak)
      if (eventQueue.length < 100) {
        eventQueue.unshift(...batch);
      }
    }
  } catch (err) {
    console.warn('Analytics flush exception:', err);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushEvents();
  }, EVENT_FLUSH_INTERVAL);
}

const analyticsService = {
  trackEvent: (event: any) => {
    eventQueue.push(event);
    if (eventQueue.length >= EVENT_BATCH_SIZE) {
      flushEvents();
    } else {
      scheduleFlush();
    }
  },
  getActiveSurveys: async (_userType: string): Promise<Survey[]> => [],
  submitSurveyResponse: async (_response: any) => {},
  flush: flushEvents,
};

interface AnalyticsContextValue {
  trackEvent: (
    eventType: UserBehaviorEvent['eventType'],
    eventData?: Record<string, any>
  ) => void;
  trackPageView: (pageName: string, metadata?: Record<string, any>) => void;
  showSurvey: (survey: Survey) => void;
  submitSurvey: (surveyId: string, responses: SurveyResponse['responses']) => void;
  currentSurvey: Survey | null;
  closeSurvey: () => void;
  sessionId: string;
}

const [AnalyticsProvider, useAnalytics] = createContextHook(() => {
  const { user } = useAuth();
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36)}`);
  const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null);
  const [lastEventTime, setLastEventTime] = useState(Date.now());
  const [completedSurveys, setCompletedSurveys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      trackEvent('app_open');
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        trackEvent('app_close');
        analyticsService.flush(); // Persist pending events before background
      } else if (nextAppState === 'active') {
        trackEvent('app_open');
      }
    });

    return () => {
      subscription.remove();
      trackEvent('app_close');
      analyticsService.flush();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastEvent = now - lastEventTime;

      if (timeSinceLastEvent > 3 * 60 * 1000) {
        checkAndShowTimedSurveys();
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user, lastEventTime]);

  const getLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | undefined> => {
    if (Platform.OS === 'web') return undefined;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return undefined;

      // Use last known position for analytics (instant, non-blocking)
      // getCurrentPositionAsync can hang 10-30s waiting for GPS lock
      const location = await Location.getLastKnownPositionAsync({});
      if (!location) return undefined;

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.log('Error getting location:', error);
      return undefined;
    }
  }, []);

  const trackEvent = useCallback(
    async (
      eventType: UserBehaviorEvent['eventType'],
      eventData: Record<string, any> = {}
    ) => {
      if (!user) return;

      setLastEventTime(Date.now());
      const location = await getLocation();

      const event: Omit<UserBehaviorEvent, 'id'> = {
        userId: user.id,
        userType: user.userType,
        eventType,
        eventData,
        sessionId,
        timestamp: new Date().toISOString(),
        location,
      };

      console.log('📊 Analytics Event:', eventType, eventData);
      analyticsService.trackEvent(event);
    },
    [user, sessionId, getLocation]
  );

  const trackPageView = useCallback(
    (pageName: string, metadata: Record<string, any> = {}) => {
      trackEvent('page_view', { pageName, ...metadata });
    },
    [trackEvent]
  );

  const checkAndShowTimedSurveys = useCallback(async () => {
    if (!user) return;

    const surveys = await analyticsService.getActiveSurveys(user.userType);
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    for (const survey of surveys) {
      if (completedSurveys.has(survey.id)) continue;

      if (survey.triggerEvent === 'timed' || survey.triggerEvent === 'idle_time') {
        const condition = survey.triggerCondition;

        if (condition?.oncePerUser && completedSurveys.has(survey.id)) continue;

        if (condition?.timeOfDay) {
          const [startHour] = condition.timeOfDay.start.split(':').map(Number);
          const [endHour] = condition.timeOfDay.end.split(':').map(Number);
          if (currentHour < startHour || currentHour > endHour) continue;
        }

        if (condition?.daysOfWeek && !condition.daysOfWeek.includes(currentDay)) {
          continue;
        }

        setCurrentSurvey(survey);
        break;
      }
    }
  }, [user, completedSurveys]);

  const showSurvey = useCallback((survey: Survey) => {
    setCurrentSurvey(survey);
  }, []);

  const closeSurvey = useCallback(() => {
    setCurrentSurvey(null);
  }, []);

  const submitSurvey = useCallback(
    async (surveyId: string, responses: SurveyResponse['responses']) => {
      if (!user) return;

      const location = await getLocation();
      const now = new Date();

      const surveyResponse: Omit<SurveyResponse, 'id'> = {
        surveyId,
        userId: user.id,
        userType: user.userType,
        orderId: undefined,
        responses,
        context: {
          timestamp: now.toISOString(),
          dayOfWeek: now.getDay(),
          hour: now.getHours(),
          location,
          deviceInfo: `${Platform.OS} ${Platform.Version}`,
        },
        completedAt: now.toISOString(),
      };

      console.log('📝 Survey Response:', surveyResponse);
      await analyticsService.submitSurveyResponse(surveyResponse);

      setCompletedSurveys((prev) => new Set([...prev, surveyId]));
      setCurrentSurvey(null);
    },
    [user, getLocation]
  );

  return {
    trackEvent,
    trackPageView,
    showSurvey,
    submitSurvey,
    currentSurvey,
    closeSurvey,
    sessionId,
  };
});

export { AnalyticsProvider, useAnalytics };
