// static/js/main.js
import { cacheDOM, enableColumnResizing } from './ui.js';
import { setupEvents } from './events.js';

document.addEventListener('DOMContentLoaded', () => {
    cacheDOM();
    setupEvents();
    enableColumnResizing();
});