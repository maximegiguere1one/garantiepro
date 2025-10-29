export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const containerClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
} as const;

export const gridClasses = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  '6': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
} as const;

export const spacingClasses = {
  compact: 'p-2 sm:p-4 md:p-6',
  normal: 'p-4 sm:p-6 md:p-8',
  spacious: 'p-6 sm:p-8 md:p-12',
} as const;

export const textSizeClasses = {
  xs: 'text-xs sm:text-sm',
  sm: 'text-sm sm:text-base',
  base: 'text-base sm:text-lg',
  lg: 'text-lg sm:text-xl',
  xl: 'text-xl sm:text-2xl',
  '2xl': 'text-2xl sm:text-3xl',
  '3xl': 'text-3xl sm:text-4xl',
} as const;

export function getResponsiveClasses(config: {
  container?: keyof typeof containerClasses;
  grid?: keyof typeof gridClasses;
  spacing?: keyof typeof spacingClasses;
  textSize?: keyof typeof textSizeClasses;
}): string {
  const classes: string[] = [];

  if (config.container) {
    classes.push(containerClasses[config.container]);
  }

  if (config.grid) {
    classes.push('grid', gridClasses[config.grid]);
  }

  if (config.spacing) {
    classes.push(spacingClasses[config.spacing]);
  }

  if (config.textSize) {
    classes.push(textSizeClasses[config.textSize]);
  }

  return classes.join(' ');
}

export const hideOnMobile = 'hidden sm:block';
export const hideOnDesktop = 'block sm:hidden';
export const stackOnMobile = 'flex flex-col sm:flex-row';
export const fullWidthOnMobile = 'w-full sm:w-auto';
