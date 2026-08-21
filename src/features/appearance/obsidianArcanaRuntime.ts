const root = document.documentElement;

type CryptVisualArea =
  | 'arcana'
  | 'auth'
  | 'calls'
  | 'connections'
  | 'direct-messages'
  | 'home'
  | 'notifications'
  | 'profile'
  | 'search'
  | 'server'
  | 'settings';

function areaFromPath(pathname: string): CryptVisualArea {
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/cadastro') ||
    pathname.startsWith('/recuperar') ||
    pathname.startsWith('/redefinir') ||
    pathname.startsWith('/auth/')
  ) {
    return 'auth';
  }

  if (pathname.includes('/chamadas/')) {
    return 'calls';
  }

  if (pathname.includes('/canais/')) {
    return 'server';
  }

  if (pathname.startsWith('/app/arcana')) {
    return 'arcana';
  }

  if (pathname.startsWith('/app/mensagens')) {
    return 'direct-messages';
  }

  if (pathname.startsWith('/app/busca')) {
    return 'search';
  }

  if (pathname.startsWith('/app/notificacoes')) {
    return 'notifications';
  }

  if (pathname.startsWith('/app/conexoes')) {
    return 'connections';
  }

  if (pathname.startsWith('/app/perfil') || pathname.startsWith('/app/pessoas/')) {
    return 'profile';
  }

  if (
    pathname.startsWith('/app/conta') ||
    pathname.includes('/configuracoes') ||
    pathname.includes('/gerenciar') ||
    pathname.includes('/moderacao') ||
    pathname.includes('/entrada')
  ) {
    return 'settings';
  }

  if (pathname.startsWith('/app/servidores')) {
    return 'server';
  }

  return 'home';
}

let currentPath = '';
let routeFrame = 0;
let routeTimer = 0;

function applyRouteIdentity() {
  routeFrame = 0;

  const nextPath = window.location.pathname;

  if (nextPath === currentPath) {
    return;
  }

  currentPath = nextPath;
  root.dataset.cryptArea = areaFromPath(nextPath);
  root.classList.remove('obsidian-route-enter');

  window.clearTimeout(routeTimer);
  window.requestAnimationFrame(() => {
    root.classList.add('obsidian-route-enter');
    routeTimer = window.setTimeout(() => {
      root.classList.remove('obsidian-route-enter');
    }, 360);
  });
}

function scheduleRouteIdentity() {
  if (routeFrame) {
    return;
  }

  routeFrame = window.requestAnimationFrame(applyRouteIdentity);
}

const routeObserver = new MutationObserver(scheduleRouteIdentity);

routeObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

window.addEventListener('popstate', scheduleRouteIdentity);
window.addEventListener('hashchange', scheduleRouteIdentity);
window.addEventListener('crypt:page-visibility', scheduleRouteIdentity);

let pointerFrame = 0;
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;

function applyPointerPosition() {
  pointerFrame = 0;
  root.style.setProperty('--obsidian-pointer-x', `${pointerX}px`);
  root.style.setProperty('--obsidian-pointer-y', `${pointerY}px`);
}

function handlePointerMove(event: PointerEvent) {
  pointerX = event.clientX;
  pointerY = event.clientY;

  if (!pointerFrame) {
    pointerFrame = window.requestAnimationFrame(applyPointerPosition);
  }
}

const finePointer = window.matchMedia('(pointer: fine)');

if (finePointer.matches) {
  window.addEventListener('pointermove', handlePointerMove, {
    passive: true,
  });
}

root.dataset.obsidianArcana = 'v2';
scheduleRouteIdentity();

window.addEventListener(
  'beforeunload',
  () => {
    routeObserver.disconnect();
    window.cancelAnimationFrame(routeFrame);
    window.cancelAnimationFrame(pointerFrame);
    window.clearTimeout(routeTimer);
    window.removeEventListener('pointermove', handlePointerMove);
  },
  { once: true },
);
