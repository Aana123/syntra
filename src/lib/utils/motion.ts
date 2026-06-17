export const MOTION = {
  ease: {
    out: [0.0, 0.0, 0.2, 1.0],
    spring: { type: "spring", stiffness: 300, damping: 30 },
    overshoot: [0.34, 1.56, 0.64, 1],
  },

  duration: {
    instant: 0.15,
    fast: 0.25,
    normal: 0.35,
    slow: 0.6,
    ceremony: 2.4,
  },

  stagger: {
    section: 0.08,
    card: 0.06,
    row: 0.04,
  },

  scoreCounter: {
    duration: 0.6,
    ease: [0.0, 0.0, 0.2, 1.0],
  },
} as const;

export const sectionVariant = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: MOTION.duration.fast, ease: MOTION.ease.out } },
};

export const staggerContainer = (staggerChildren = MOTION.stagger.section) => ({
  hidden: {},
  visible: { transition: { staggerChildren } },
});
