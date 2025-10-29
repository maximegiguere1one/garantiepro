export const lazyLoadImage = (img: HTMLImageElement) => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLImageElement;
          const src = target.dataset.src;
          if (src) {
            target.src = src;
            target.removeAttribute('data-src');
            observer.unobserve(target);
          }
        }
      });
    },
    {
      rootMargin: '50px',
    }
  );

  observer.observe(img);
  return observer;
};

export const preloadCriticalImages = (urls: string[]) => {
  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
};

export const optimizeImageLoading = () => {
  const images = document.querySelectorAll('img[data-src]');
  images.forEach((img) => lazyLoadImage(img as HTMLImageElement));
};

export const generateSrcSet = (baseUrl: string, sizes: number[]): string => {
  return sizes.map((size) => `${baseUrl}?w=${size} ${size}w`).join(', ');
};

export const getOptimalImageSize = (containerWidth: number): number => {
  const sizes = [320, 640, 768, 1024, 1280, 1920];
  return sizes.find((size) => size >= containerWidth) || sizes[sizes.length - 1];
};
