import { useEffect } from 'react';
import { useTour } from '../hooks/useTour';

export function TourInitializer() {
  const { tourEngine } = useTour();

  useEffect(() => {
    // Tours are auto-initialized in useTour hook
    // This component just ensures the hook is called at the app level
  }, [tourEngine]);

  return null;
}
