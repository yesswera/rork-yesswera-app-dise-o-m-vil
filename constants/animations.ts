export const AnimationDurations = {
  instant: 0,
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

export const SpringConfigs = {
  gentle: {
    tension: 40,
    friction: 7,
  },
  medium: {
    tension: 50,
    friction: 8,
  },
  bouncy: {
    tension: 80,
    friction: 6,
  },
  stiff: {
    tension: 100,
    friction: 10,
  },
};

export const EasingFunctions = {
  easeInOut: 'easeInOut' as const,
  easeIn: 'easeIn' as const,
  easeOut: 'easeOut' as const,
  linear: 'linear' as const,
};

export const FadeAnimations = {
  fadeIn: {
    from: 0,
    to: 1,
    duration: AnimationDurations.normal,
  },
  fadeOut: {
    from: 1,
    to: 0,
    duration: AnimationDurations.normal,
  },
};

export const SlideAnimations = {
  slideUp: {
    from: 30,
    to: 0,
    duration: AnimationDurations.normal,
  },
  slideDown: {
    from: -30,
    to: 0,
    duration: AnimationDurations.normal,
  },
  slideLeft: {
    from: 30,
    to: 0,
    duration: AnimationDurations.normal,
  },
  slideRight: {
    from: -30,
    to: 0,
    duration: AnimationDurations.normal,
  },
};
