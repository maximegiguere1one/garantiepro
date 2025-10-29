export const microInteractions = {
  button: {
    tap: 'active:scale-95',
    hover: 'hover:scale-105',
    press: 'active:scale-98',
  },
  card: {
    hover: 'hover:-translate-y-1 hover:shadow-lg',
    press: 'active:scale-[0.98]',
  },
  list: {
    item: 'hover:bg-slate-50 transition-colors duration-150',
    itemSelected: 'bg-slate-100 hover:bg-slate-200',
  },
};

export const pageTransitions = {
  fadeIn: 'animate-in fade-in duration-300',
  slideInFromRight: 'animate-in slide-in-from-right duration-300',
  slideInFromLeft: 'animate-in slide-in-from-left duration-300',
  slideInFromTop: 'animate-in slide-in-from-top-2 duration-200',
  slideInFromBottom: 'animate-in slide-in-from-bottom-2 duration-200',
  zoomIn: 'animate-in zoom-in-95 duration-200',
};

export const loadingAnimations = {
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  ping: 'animate-ping',
};

export const stateTransitions = {
  error: 'animate-in slide-in-from-top-1 duration-200',
  success: 'animate-in slide-in-from-bottom-1 duration-200',
  warning: 'animate-in fade-in duration-200',
};

export function useHoverEffect() {
  return 'transition-all duration-200 hover:scale-[1.02]';
}

export function useFocusEffect() {
  return 'focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2';
}

export function useDisabledEffect() {
  return 'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100';
}

export const animationClasses = {
  ...microInteractions,
  ...pageTransitions,
  ...loadingAnimations,
  ...stateTransitions,
};

export function combineAnimations(...classes: string[]): string {
  return classes.filter(Boolean).join(' ');
}
