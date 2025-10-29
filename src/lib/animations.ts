export const animations = {
  fadeIn: 'animate-fadeIn',
  slideUp: 'animate-slideUp',
  slideDown: 'animate-slideDown',
  scaleIn: 'animate-scaleIn',
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
};

export const transitions = {
  all: 'transition-all duration-200 ease-in-out',
  colors: 'transition-colors duration-200',
  transform: 'transition-transform duration-200',
  opacity: 'transition-opacity duration-200',
  fast: 'transition-all duration-150',
  slow: 'transition-all duration-300',
};

export const buttonStates = {
  base: 'transform transition-all duration-200 active:scale-95',
  hover: 'hover:shadow-lg hover:-translate-y-0.5',
  disabled: 'opacity-50 cursor-not-allowed',
  loading: 'cursor-wait opacity-75',
};

export const cardStates = {
  base: 'transition-all duration-200',
  hover: 'hover:shadow-xl hover:-translate-y-1',
  active: 'ring-2 ring-primary-500',
};

export const loadingStates = {
  spinnerClass: 'inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]',
  dotsClass: 'flex gap-1',
  dotClass: 'h-2 w-2 rounded-full bg-current animate-bounce',
  pulseClass: 'h-5 w-5 rounded-full bg-current animate-pulse',
};

export const successAnimation = {
  checkmarkClass: 'animate-scaleIn',
  pathClass: 'animate-[dash_0.5s_ease-in-out]',
};
