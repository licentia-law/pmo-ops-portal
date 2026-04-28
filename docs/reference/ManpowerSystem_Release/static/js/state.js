// static/js/state.js

const formatDate = (date) => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const DEFAULT_HOLIDAYS = [
    { date: '2024-01-01', name: '신정' }, { date: '2024-02-09', name: '설날 연휴' }, { date: '2024-02-10', name: '설날' }, { date: '2024-02-11', name: '설날 연휴' }, { date: '2024-02-12', name: '대체공휴일' },
    { date: '2024-03-01', name: '삼일절' }, { date: '2024-04-10', name: '국회의원 선거' }, { date: '2024-05-01', name: '근로자의 날' }, { date: '2024-05-05', name: '어린이날' }, { date: '2024-05-06', name: '대체공휴일' }, { date: '2024-05-15', name: '부처님오신날' },
    { date: '2024-06-06', name: '현충일' }, { date: '2024-08-15', name: '광복절' }, { date: '2024-09-16', name: '추석 연휴' }, { date: '2024-09-17', name: '추석' }, { date: '2024-09-18', name: '추석 연휴' },
    { date: '2024-10-03', name: '개천절' }, { date: '2024-10-09', name: '한글날' }, { date: '2024-12-25', name: '크리스마스' },
    { date: '2025-01-01', name: '신정' }, { date: '2025-01-28', name: '설날 연휴' }, { date: '2025-01-29', name: '설날' }, { date: '2025-01-30', name: '설날 연휴' },
    { date: '2025-03-01', name: '삼일절' }, { date: '2025-03-03', name: '대체공휴일' }, { date: '2025-05-01', name: '근로자의 날' }, { date: '2025-05-05', name: '어린이날' }, { date: '2025-05-06', name: '부처님오신날/대체공휴일' },
    { date: '2025-06-06', name: '현충일' }, { date: '2025-08-15', name: '광복절' }, { date: '2025-10-03', name: '개천절' }, { date: '2025-10-05', name: '추석 연휴' }, { date: '2025-10-06', name: '추석' }, { date: '2025-10-07', name: '추석 연휴' }, { date: '2025-10-08', name: '대체공휴일' },
    { date: '2025-10-09', name: '한글날' }, { date: '2025-12-25', name: '크리스마스' },
    { date: '2026-01-01', name: '신정' }, { date: '2026-02-16', name: '설날 연휴' }, { date: '2026-02-17', name: '설날' }, { date: '2026-02-18', name: '설날 연휴' },
    { date: '2026-03-01', name: '삼일절' }, { date: '2026-03-02', name: '대체공휴일' }, { date: '2026-05-01', name: '근로자의 날' }, { date: '2026-05-05', name: '어린이날' }, { date: '2026-05-24', name: '부처님오신날' }, { date: '2026-05-25', name: '대체공휴일' },
    { date: '2026-06-06', name: '현충일' }, { date: '2026-08-15', name: '광복절' }, { date: '2026-09-24', name: '추석 연휴' }, { date: '2026-09-25', name: '추석' }, { date: '2026-09-26', name: '추석 연휴' }, { date: '2026-09-27', name: '대체공휴일' },
    { date: '2026-10-03', name: '개천절' }, { date: '2026-10-09', name: '한글날' }, { date: '2026-12-25', name: '크리스마스' }
];

export const DEPARTMENTS = ['ENTEC담당', '이행1그룹', '이행2그룹', '아키텍트그룹'];

export let appState = {
    currentView: 'dashboard',
    dashboardDate: formatDate(new Date()),
    dashboardDept: 'All',
    weeklyDate: formatDate(new Date()),
    weeklyDept: 'All',
    personnelDept: 'All',
    activityDept: 'All',
    closingDept: 'All',
    waitingDept: 'All',
    dashboardNameFilter: [],
    waitingDatePickerDate: formatDate(new Date()),
    closingMonth: new Date().toISOString().slice(0, 7),
    personnelDate: formatDate(new Date()),
    activityDate: formatDate(new Date()),
    showResigned: false,
    showActivityResigned: false,
    showActivityWaiting: false,
    showPersonnelMonthly: true,
    showActivityMonthly: true,
    selectedYear: new Date().getFullYear(),
    personnelSelectedYear: new Date().getFullYear(),
    personnel: [],
    activities: [],
    unconfirmedActivities: [],
    holidays: [],
    users: [],
    closingData: JSON.parse(localStorage.getItem('closingData') || '{}'),
    currentUser: null,
    currentUserRole: null,
    currentUserDepts: [],
    holidaySet: new Set(),
    activityStatusFilter: 'all',
    sortConfig: { key: null, direction: 'asc' }, 
    personnelSortConfig: { key: null, direction: 'asc' },
    waitingSortConfig: { key: null, direction: 'asc' },
    weeklySortConfig: { key: null, direction: 'asc' },
    closingSortConfig: { key: 'name', direction: 'asc' },
    assignmentSortConfig: { key: null, direction: 'asc' },
    filters: {
        personnel: {},
        activity: {},
        assignment: {}
    },
    filledChartInstance: null,
    operatingChartInstance: null,
    targetUserForPw: null,
};
