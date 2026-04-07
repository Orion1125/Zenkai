import './style.css';
import './game.css';
import { initScene }                       from './scene.js';
import { registerRoute, navigate, initRouter } from './router.js';
import { renderConnect }                   from './pages/connect.js';
import { renderCard }                      from './pages/card.js';
import { renderArena }                     from './pages/arena.js';
import { renderProfile }                   from './pages/profile.js';

initScene();

registerRoute('/',        () => navigate('/connect'));
registerRoute('/connect', renderConnect);
registerRoute('/card',    renderCard);
registerRoute('/arena',   renderArena);
registerRoute('/profile', renderProfile);

initRouter();
