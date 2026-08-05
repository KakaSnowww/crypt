import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { applyExperiencePreferences, readExperiencePreferences } from './experiencePreferences';

type ExtendedNavigator = Navigator & {
  connection?: {
    addEventListener?: (type: 'change', listener: EventListener) => void;
    effectiveType?: string;
    removeEventListener?: (type: 'change', listener: EventListener) => void;
    saveData?: boolean;
  };
  deviceMemory?: number;
};

function isVisible(element: HTMLElement) {
  return element.offsetParent !== null || element.getClientRects().length > 0;
}

function firstVisibleElement(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isVisible);
}

function prepareLandmarks() {
  const previousMain = document.getElementById('crypt-main-content');
  const main = firstVisibleElement('.app-shell__content, main');

  if (previousMain && previousMain !== main) {
    previousMain.removeAttribute('id');
  }

  if (main) {
    main.id = 'crypt-main-content';

    if (!main.hasAttribute('tabindex')) {
      main.tabIndex = -1;
    }
  }

  const previousNavigation = document.getElementById('crypt-primary-navigation');
  const navigation = firstVisibleElement(
    '.app-shell__sidebar nav, nav[aria-label="Navegação principal"]',
  );

  if (previousNavigation && previousNavigation !== navigation) {
    previousNavigation.removeAttribute('id');
  }

  if (navigation) {
    navigation.id = 'crypt-primary-navigation';

    if (!navigation.hasAttribute('tabindex')) {
      navigation.tabIndex = -1;
    }
  }
}

function focusLandmark(selector: string) {
  prepareLandmarks();
  const target = document.querySelector<HTMLElement>(selector);

  if (!target) return;

  target.focus({
    preventScroll: true,
  });
  target.scrollIntoView({
    behavior: document.documentElement.dataset.arcaneEffects === 'reduced' ? 'auto' : 'smooth',
    block: 'start',
  });
}

function routeLabel() {
  const heading = firstVisibleElement(
    '#crypt-main-content h1, #crypt-main-content h2, main h1, main h2',
  );
  const text = heading?.textContent?.replace(/\s+/gu, ' ').trim();

  return text ? `Página carregada: ${text}` : 'Nova página carregada';
}

function configurePerformanceTier() {
  const navigatorDetails = navigator as ExtendedNavigator;
  const connection = navigatorDetails.connection;
  const slowConnection =
    connection?.saveData === true ||
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g';
  const limitedMemory =
    typeof navigatorDetails.deviceMemory === 'number' && navigatorDetails.deviceMemory <= 4;
  const limitedCpu =
    typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
  const android = document.documentElement.dataset.runtime === 'android';

  const constrainedHardware = limitedMemory && limitedCpu;

  document.documentElement.dataset.cryptPerformance =
    slowConnection || constrainedHardware || android ? 'limited' : 'standard';
}

function updateVisualViewport() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  const height = viewport?.height ?? window.innerHeight;
  const width = viewport?.width ?? window.innerWidth;
  const top = viewport?.offsetTop ?? 0;
  const keyboardDifference = window.innerHeight - height;
  const keyboardOpen = keyboardDifference > Math.max(120, window.innerHeight * 0.15);

  root.style.setProperty('--crypt-visual-viewport-height', `${Math.round(height)}px`);
  root.style.setProperty('--crypt-visual-viewport-width', `${Math.round(width)}px`);
  root.style.setProperty('--crypt-visual-viewport-top', `${Math.round(top)}px`);
  root.style.setProperty(
    '--crypt-keyboard-height',
    `${Math.max(0, Math.round(keyboardDifference))}px`,
  );
  root.dataset.keyboardOpen = keyboardOpen ? 'true' : 'false';

  if (keyboardOpen && root.dataset.runtime === 'android') {
    const active = document.activeElement;

    if (active instanceof HTMLElement) {
      const bounds = active.getBoundingClientRect();
      const visibleBottom = top + height - 12;

      if (bounds.bottom > visibleBottom) {
        window.setTimeout(() => {
          active.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 40);
      }
    }
  }
}

export function AppExperienceCoordinator() {
  const [announcement, setAnnouncement] = useState('');
  const currentUrl = useRef('');

  useEffect(() => {
    applyExperiencePreferences(readExperiencePreferences(), false);
    configurePerformanceTier();
    updateVisualViewport();
    prepareLandmarks();

    const handleVisibility = () => {
      document.documentElement.dataset.pageVisibility = document.visibilityState;
      window.dispatchEvent(
        new CustomEvent('crypt:page-visibility', {
          detail: {
            visible: document.visibilityState === 'visible',
          },
        }),
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        document.documentElement.dataset.inputMethod = 'keyboard';
      }

      if (event.altKey && event.key === '1') {
        event.preventDefault();
        focusLandmark('#crypt-main-content');
      }

      if (event.altKey && event.key === '2') {
        event.preventDefault();
        focusLandmark('#crypt-primary-navigation');
      }
    };

    const handlePointer = () => {
      document.documentElement.dataset.inputMethod = 'pointer';
    };

    const announceIfRouteChanged = () => {
      if (!document.getElementById('crypt-main-content')) {
        prepareLandmarks();
      }

      if (currentUrl.current === window.location.href) {
        return;
      }

      currentUrl.current = window.location.href;

      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          prepareLandmarks();
          setAnnouncement(routeLabel());
        }, 90);
      });
    };

    const observer = new MutationObserver(announceIfRouteChanged);
    const root = document.getElementById('root');

    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
      });
    }

    const viewport = window.visualViewport;
    const connection = (navigator as ExtendedNavigator).connection;

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('pointerdown', handlePointer, true);
    window.addEventListener('resize', updateVisualViewport);
    window.addEventListener('popstate', announceIfRouteChanged);
    viewport?.addEventListener('resize', updateVisualViewport);
    viewport?.addEventListener('scroll', updateVisualViewport);
    connection?.addEventListener?.('change', configurePerformanceTier);

    handleVisibility();
    announceIfRouteChanged();

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('pointerdown', handlePointer, true);
      window.removeEventListener('resize', updateVisualViewport);
      window.removeEventListener('popstate', announceIfRouteChanged);
      viewport?.removeEventListener('resize', updateVisualViewport);
      viewport?.removeEventListener('scroll', updateVisualViewport);
      connection?.removeEventListener?.('change', configurePerformanceTier);
    };
  }, []);

  function handleSkip(event: MouseEvent<HTMLAnchorElement>, selector: string) {
    event.preventDefault();
    focusLandmark(selector);
  }

  return (
    <>
      <nav aria-label="Atalhos de acessibilidade" className="crypt-skip-links">
        <a href="#crypt-main-content" onClick={(event) => handleSkip(event, '#crypt-main-content')}>
          Pular para o conteúdo
        </a>
        <a
          href="#crypt-primary-navigation"
          onClick={(event) => handleSkip(event, '#crypt-primary-navigation')}
        >
          Pular para a navegação
        </a>
      </nav>

      <div aria-atomic="true" aria-live="polite" className="crypt-sr-only" role="status">
        {announcement}
      </div>
    </>
  );
}
