export const springSnappy = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

export const springLift = {
  type: "spring" as const,
  stiffness: 380,
  damping: 28,
  mass: 0.7,
};

export const springPop = {
  type: "spring" as const,
  stiffness: 520,
  damping: 16,
  mass: 0.6,
};

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: springSnappy,
  },
};
