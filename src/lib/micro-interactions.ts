export const microInteractions = {
  haptic: {
    light: () => {
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    },
    medium: () => {
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
    },
    heavy: () => {
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 10, 30]);
      }
    },
    success: () => {
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 100]);
      }
    },
    error: () => {
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
    },
  },

  sound: {
    click: () => {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGH0fDTgjMGHGS57OihUhYJEV67GK==');
      audio.volume = 0.1;
      audio.play().catch(() => {});
    },
    pop: () => {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fZKmurJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGH0fDTgjMGHGS57OihUhYJEV67GK==');
      audio.volume = 0.15;
      audio.play().catch(() => {});
    },
    success: () => {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1hdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGH0fDTgjMGHGS57OihUhYJEV67GK==');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    },
  },

  animations: {
    bounce: 'animate-[bounce_0.5s_ease-in-out]',
    pulse: 'animate-[pulse_1s_ease-in-out_infinite]',
    shake: 'animate-[shake_0.5s_ease-in-out]',
    fadeIn: 'animate-[fadeIn_0.3s_ease-in]',
    fadeOut: 'animate-[fadeOut_0.3s_ease-out]',
    slideInLeft: 'animate-[slideInLeft_0.3s_ease-out]',
    slideInRight: 'animate-[slideInRight_0.3s_ease-out]',
    slideInUp: 'animate-[slideInUp_0.3s_ease-out]',
    slideInDown: 'animate-[slideInDown_0.3s_ease-out]',
    scaleIn: 'animate-[scaleIn_0.2s_ease-out]',
    scaleOut: 'animate-[scaleOut_0.2s_ease-in]',
    rotate: 'animate-[rotate_0.5s_ease-in-out]',
    wiggle: 'animate-[wiggle_0.5s_ease-in-out]',
  },

  transitions: {
    fast: 'transition-all duration-150 ease-out',
    normal: 'transition-all duration-300 ease-in-out',
    slow: 'transition-all duration-500 ease-in-out',
    bounce: 'transition-all duration-300 cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'transition-all duration-400 cubic-bezier(0.4, 0, 0.2, 1)',
  },

  hover: {
    lift: 'hover:transform hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
    grow: 'hover:scale-105 transition-transform duration-200',
    shrink: 'hover:scale-95 transition-transform duration-200',
    glow: 'hover:shadow-2xl hover:shadow-red-500/50 transition-shadow duration-300',
    brighten: 'hover:brightness-110 transition-all duration-200',
    rotate: 'hover:rotate-3 transition-transform duration-200',
    tilt: 'hover:-rotate-2 hover:scale-105 transition-transform duration-200',
  },

  focus: {
    ring: 'focus:ring-4 focus:ring-red-500/20 focus:outline-none',
    glow: 'focus:shadow-lg focus:shadow-red-500/50 focus:outline-none',
    scale: 'focus:scale-105 focus:outline-none transition-transform duration-200',
  },

  loading: {
    spinner: 'animate-spin rounded-full border-2 border-gray-300 border-t-red-600',
    pulse: 'animate-pulse bg-gray-200 rounded',
    skeleton: 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]',
    dots: 'animate-[bounce_1s_ease-in-out_infinite]',
  },

  interactive: {
    ripple: (event: React.MouseEvent<HTMLElement>) => {
      const button = event.currentTarget;
      const ripple = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.className = 'absolute rounded-full bg-white opacity-60 pointer-events-none animate-[ripple_0.6s_ease-out]';

      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    },

    confetti: (count = 50) => {
      const colors = ['#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA'];
      const container = document.createElement('div');
      container.className = 'fixed inset-0 pointer-events-none z-50';
      document.body.appendChild(container);

      for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const animationDelay = Math.random() * 0.5;
        const rotation = Math.random() * 360;

        confetti.style.cssText = `
          position: absolute;
          left: ${left}%;
          top: -10px;
          width: 10px;
          height: 10px;
          background: ${color};
          transform: rotate(${rotation}deg);
          animation: confettiFall 3s ease-in forwards;
          animation-delay: ${animationDelay}s;
        `;

        container.appendChild(confetti);
      }

      setTimeout(() => container.remove(), 3500);
    },

    toast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
      };

      const toast = document.createElement('div');
      toast.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-[slideInRight_0.3s_ease-out]`;
      toast.textContent = message;

      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('animate-[fadeOut_0.3s_ease-out]');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },
  },

  celebrate: {
    success: () => {
      microInteractions.haptic.success();
      microInteractions.sound.success();
      microInteractions.interactive.confetti(30);
    },

    achievement: (badge: string) => {
      microInteractions.haptic.success();
      microInteractions.sound.pop();

      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-[slideInRight_0.5s_ease-out] max-w-sm';
      notification.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="text-4xl">🎉</div>
          <div>
            <p class="font-bold">Nouveau Badge Débloqué!</p>
            <p class="text-sm opacity-90">${badge}</p>
          </div>
        </div>
      `;

      document.body.appendChild(notification);
      microInteractions.interactive.confetti(50);

      setTimeout(() => {
        notification.classList.add('animate-[fadeOut_0.5s_ease-out]');
        setTimeout(() => notification.remove(), 500);
      }, 4000);
    },

    milestone: (title: string, description: string) => {
      microInteractions.haptic.heavy();
      microInteractions.sound.success();

      const notification = document.createElement('div');
      notification.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease-in]';
      notification.innerHTML = `
        <div class="bg-white rounded-2xl p-8 max-w-md shadow-2xl animate-[scaleIn_0.5s_ease-out]">
          <div class="text-center">
            <div class="text-6xl mb-4">🎯</div>
            <h3 class="text-2xl font-bold text-gray-900 mb-2">${title}</h3>
            <p class="text-gray-600 mb-6">${description}</p>
            <button class="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
              Continuer
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(notification);
      microInteractions.interactive.confetti(100);

      notification.querySelector('button')?.addEventListener('click', () => {
        notification.classList.add('animate-[fadeOut_0.3s_ease-out]');
        setTimeout(() => notification.remove(), 300);
      });
    },
  },

  feedback: {
    buttonPress: (element: HTMLElement) => {
      element.classList.add('scale-95');
      microInteractions.haptic.light();
      microInteractions.sound.click();
      setTimeout(() => element.classList.remove('scale-95'), 100);
    },

    formSuccess: (message: string) => {
      microInteractions.haptic.success();
      microInteractions.sound.success();
      microInteractions.interactive.toast(message, 'success');
    },

    formError: (message: string) => {
      microInteractions.haptic.error();
      microInteractions.interactive.toast(message, 'error');
    },

    progressUpdate: (percentage: number) => {
      if (percentage === 25 || percentage === 50 || percentage === 75) {
        microInteractions.haptic.light();
        microInteractions.sound.pop();
      } else if (percentage === 100) {
        microInteractions.celebrate.success();
      }
    },
  },
};

export const animations = {
  keyframes: `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }

    @keyframes confettiFall {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes slideInLeft {
      from {
        transform: translateX(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideInUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes slideInDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes scaleIn {
      from {
        transform: scale(0);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    @keyframes scaleOut {
      from {
        transform: scale(1);
        opacity: 1;
      }
      to {
        transform: scale(0);
        opacity: 0;
      }
    }

    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-5deg); }
      75% { transform: rotate(5deg); }
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
};

export const injectAnimations = () => {
  if (typeof document === 'undefined') return;

  const styleId = 'micro-interactions-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = animations.keyframes;
  document.head.appendChild(style);
};
