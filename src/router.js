// ══════════════════════════════════════════════
// ZENKAI — Simple Hash Router with transitions
// ══════════════════════════════════════════════

const routes = {};
let appContainer;
let navigating = false;

export function registerRoute(path, renderFn) {
    routes[path] = renderFn;
}

export function navigate(path) {
    if (navigating) return;
    const app = document.getElementById('app');
    const current = app.firstElementChild;

    if (current) {
        navigating = true;
        current.classList.add('page-exit');
        current.addEventListener('animationend', () => {
            window.location.hash = path;
            navigating = false;
        }, { once: true });
        // Fallback if animation doesn't fire
        setTimeout(() => {
            if (navigating) {
                window.location.hash = path;
                navigating = false;
            }
        }, 400);
    } else {
        window.location.hash = path;
    }
}

export function initRouter() {
    appContainer = document.getElementById('app');

    function render() {
        const raw = window.location.hash.slice(1) || '/';
        const hash = raw.split('?')[0] || '/';
        const routeFn = routes[hash];

        if (routeFn) {
            appContainer.innerHTML = '';
            routeFn(appContainer);
            // Trigger entrance animation on new content
            const child = appContainer.firstElementChild;
            if (child) child.classList.add('page-enter');
        }
    }

    window.addEventListener('hashchange', render);
    render();
}
