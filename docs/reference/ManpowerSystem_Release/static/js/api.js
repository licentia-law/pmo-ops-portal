// static/js/api.js
import { appState, DEFAULT_HOLIDAYS } from './state.js';
import { formatDate, calculateManMonths } from './utils.js';

export async function loadAllData() {
    try {
        const resH = await fetch('/api/holidays');
        const dataH = await resH.json();
        appState.holidays = dataH.length ? dataH : DEFAULT_HOLIDAYS;
        appState.holidaySet = new Set(appState.holidays.map(h=>h.date));

        const resP = await fetch('/api/personnel');
        appState.personnel = await resP.json();

        const resA = await fetch('/api/activities');
        const dataA = await resA.json();
        const today = formatDate(new Date());
        appState.activities = dataA.map(a => {
            a.manMonths = calculateManMonths(a.startDate, a.endDate);
            a.totalManMonth = Object.values(a.manMonths).reduce((s, v)=>s+v.mm, 0);
            return a;
        });

        const resUnconfirmed = await fetch('/api/unconfirmed_activities');
        if(resUnconfirmed.ok) appState.unconfirmedActivities = await resUnconfirmed.json();

        const resU = await fetch('/api/users');
        if(resU.ok) appState.users = await resU.json();

    } catch(e) { console.error("Data Load Fail", e); }
}

export async function saveUnconfirmedActivities() {
    await fetch('/api/unconfirmed_activities', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(appState.unconfirmedActivities) });
}

export async function confirmActivities(ids) {
    const res = await fetch('/api/confirm_activities', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ ids: ids })
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to confirm activities.');
    }
    return await res.json();
}

export async function savePersonnel() {
    await fetch('/api/personnel', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(appState.personnel) });
}
export async function saveActivities() {
    await fetch('/api/activities', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(appState.activities) });
}
export async function saveHolidays() {
    await fetch('/api/holidays', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(appState.holidays) });
}
