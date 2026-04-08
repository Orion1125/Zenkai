import './style.css';
import './game.css';
import { initScene }                       from './scene.js';
import { registerRoute, navigate, initRouter } from './router.js';
import { renderConnect }                   from './pages/connect.js';
import { renderCard }                      from './pages/card.js';
import { renderArena }                     from './pages/arena.js';
import { renderEquipment }                 from './pages/equipment.js';
import { renderProfile }                   from './pages/profile.js';
import { renderHome }                      from './pages/home.js';
import { renderLeaderboard }               from './pages/leaderboard.js';

initScene();

registerRoute('/',            () => navigate('/connect'));
registerRoute('/connect',     renderConnect);
registerRoute('/card',        renderCard);
registerRoute('/home',        renderHome);
registerRoute('/arena',       renderArena);
registerRoute('/equipment',   renderEquipment);
registerRoute('/profile',     renderProfile);
registerRoute('/leaderboard', renderLeaderboard);

initRouter();
