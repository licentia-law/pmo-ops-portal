// static/js/ui.js
import { appState, DEPARTMENTS } from './state.js';
import { canView, canEdit, calculatePersonnelMM, toStandard, formatDate, getTotalWorkingDays, isWorkingDay, sortData } from './utils.js';

export const DOM = {};
let currentDetailId = null;

export const cacheDOM = () => {
    const ids = ['page-dashboard', 'page-weekly', 'page-available', 'page-status', 'page-closing', 'page-waiting', 'page-assignment', 'page-users',
        'menu-dashboard', 'menu-weekly', 'menu-available', 'menu-status', 'menu-closing', 'menu-waiting', 'menu-assignment', 'menu-users', 'dashboard-dept-selector', 'weekly-dept-selector',
        'dashboard-date-picker', 'personnel-date-picker', 'activity-date-picker', 'p-show-resigned', 'p-show-monthly', 'a-show-monthly', 'a-show-resigned', 'a-show-waiting',
        'personnel-dept-selector', 'activity-dept-selector', 'closing-dept-selector', 'waiting-dept-selector',
        'personnel-detail-modal', 'dashboard-summary-table-body', 'dashboard-summary-table-footer', 'kpi-filled-rate', 'kpi-operating-rate', 'btn-change-pw',
        'add-personnel-form', 'personnel-table-body', 'p-no-data', 'add-activity-form', 'activity-table-body', 'no-data',
        'assignment-table-body', 'no-assignment-data', 'btn-open-unconfirmed-activity-modal', 'btn-confirm-activities', 'assign-check-all',
        'waiting-date-picker', 'waiting-table-body', 'no-waiting-data', 'holiday-modal', 'holiday-list-container', 'form-add-holiday',
        'activity-status-filter-buttons', 'kpi-detail-modal', 'weekly-date-picker', 'weekly-table-body', 'weekly-range-label',
        'weekly-summary-tbody', 'weekly-summary-tfoot', 'p-check-all', 'dashboard-group-selector', 'dashboard-th-group', 'weekly-group-selector', 'weekly-th-group'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) DOM[id] = el;
    });
};

export function updateSortIcons(prefix, activeKey, direction) {
    document.querySelectorAll(`[id^="${prefix}"]`).forEach(el => el.textContent = '');
    const target = document.getElementById(`${prefix}${activeKey}`);
    if (target) {
        target.textContent = direction === 'asc' ? '▲' : '▼';
        target.className = 'ml-1 text-xs text-blue-600';
    }
}

export function renderPersonnelTable() {
    const tbody = DOM['personnel-table-body'];
    if (!tbody) return;
    tbody.innerHTML = '';

    document.querySelectorAll('.p-monthly-col').forEach(el => el.style.display = appState.showPersonnelMonthly ? '' : 'none');

    let list = appState.personnel.filter(p => canView(p.dept));

    if (appState.personnelDept !== 'All') {
        list = list.filter(p => (p.dept || '미배정') === appState.personnelDept);
    }

    const filters = appState.filters.personnel;
    Object.keys(filters).forEach(key => {
        const val = filters[key];
        if (val) {
            list = list.filter(p => String(p[key] || '').toLowerCase().includes(val));
        }
    });

    const checkDateStr = appState.personnelDate;
    let displayCount = 0;

    const sortedList = sortData([...list], appState.personnelSortConfig.key, appState.personnelSortConfig.direction);

    const rows = sortedList.filter(p => {
        let displayStatus = '재직';
        const joinStr = toStandard(p.joinDate), leaveStr = toStandard(p.leaveDate), leaveStartStr = toStandard(p.leaveStartDate), leaveEndStr = toStandard(p.leaveEndDate), transferStr = toStandard(p.transferDate);
        if (joinStr && checkDateStr < joinStr) displayStatus = '미입사';
        else if (leaveStr && checkDateStr > leaveStr) displayStatus = '퇴사';
        else if (transferStr && checkDateStr > transferStr) displayStatus = '전적';
        else if (p.employmentStatus === '퇴사' && !leaveStr) displayStatus = '퇴사';
        else {
            const isLeaveStatus = ['휴직', '출산휴가', '육아휴직'].includes(p.employmentStatus);
            const inLeavePeriod = (leaveStartStr && leaveEndStr && checkDateStr >= leaveStartStr && checkDateStr <= leaveEndStr);
            if (inLeavePeriod) displayStatus = isLeaveStatus ? p.employmentStatus : '휴직';
            else if (isLeaveStatus && (leaveStartStr || leaveEndStr)) displayStatus = '재직';
            else if (isLeaveStatus) displayStatus = p.employmentStatus;
        }
        return appState.showResigned || !['퇴사', '미입사', '전적'].includes(displayStatus);
    });

    if (!rows.length) {
        DOM['p-no-data'].classList.remove('hidden');
        tbody.innerHTML = '';
        return;
    }
    DOM['p-no-data'].classList.add('hidden');

    const fragment = document.createDocumentFragment();
    rows.forEach((p) => {
        displayCount++;
        const mm = calculatePersonnelMM(p, appState.personnelSelectedYear);
        const hasAuth = canEdit(p.dept);

        let displayStatus = '재직';
        const joinStr = toStandard(p.joinDate), leaveStr = toStandard(p.leaveDate), leaveStartStr = toStandard(p.leaveStartDate), leaveEndStr = toStandard(p.leaveEndDate), transferStr = toStandard(p.transferDate);
        if (joinStr && checkDateStr < joinStr) displayStatus = '미입사';
        else if (leaveStr && checkDateStr > leaveStr) displayStatus = '퇴사';
        else if (transferStr && checkDateStr > transferStr) displayStatus = '전적';
        else if (p.employmentStatus === '퇴사' && !leaveStr) displayStatus = '퇴사';
        else {
            const isLeaveStatus = ['휴직', '출산휴가', '육아휴직'].includes(p.employmentStatus);
            const inLeavePeriod = (leaveStartStr && leaveEndStr && checkDateStr >= leaveStartStr && checkDateStr <= leaveEndStr);
            if (inLeavePeriod) displayStatus = isLeaveStatus ? p.employmentStatus : '휴직';
            else if (isLeaveStatus && (leaveStartStr || leaveEndStr)) displayStatus = '재직';
            else if (isLeaveStatus) displayStatus = p.employmentStatus;
        }

        const badgeClass = displayStatus === '재직' ? 'bg-green-100 text-green-800' : (['휴직', '출산휴가', '육아휴직'].includes(displayStatus) ? 'bg-yellow-100 text-yellow-800' : (displayStatus === '미입사' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-800'));

        let monthsHtml = '';
        if (appState.showPersonnelMonthly) {
            for (let m = 1; m <= 12; m++) {
                const k = `${appState.personnelSelectedYear}-${String(m).padStart(2, '0')}`;
                const val = mm[k] || 0;
                monthsHtml += `<td class="px-2 py-2 text-right border border-gray-200 ${val > 0 ? 'text-blue-600 font-bold' : 'text-gray-300'}">${val > 0 ? val.toFixed(2) : '0'}</td>`;
            }
        }

        const nameCell = hasAuth ? `<td class="px-3 py-3 text-center whitespace-nowrap btn-show-detail text-blue-600 font-bold cursor-pointer hover:underline border border-gray-200">${p.name}</td>` : `<td class="px-3 py-3 text-center whitespace-nowrap text-gray-800 border border-gray-200">${p.name}</td>`;
        const deleteBtn = hasAuth ? `<button class="text-red-500 hover:text-red-700 text-xs btn-delete-p">삭제</button>` : `<span class="text-gray-300 text-xs">삭제불가</span>`;

        const tr = document.createElement('tr');
        if (p.employmentStatus === '퇴사') tr.classList.add('is-resigned');
        tr.dataset.id = p.id;
        tr.innerHTML = `
            <td class="px-3 py-3 text-center border border-gray-200">
                <input type="checkbox" value="${p.id}" class="p-check-item accent-blue-600" ${hasAuth ? '' : 'disabled'}>
            </td>
            <td class="px-3 py-3 text-center border border-gray-200">${displayCount}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${p.team}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${p.dept || ''}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${p.role || ''}</td>
            ${nameCell}
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${p.rank || ''}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200"><span class="px-2 py-1 rounded text-xs ${badgeClass}">${displayStatus}</span></td>
            <td class="px-3 py-3 text-center whitespace-nowrap text-xs text-gray-500 border border-gray-200">${p.joinDate || ''}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap text-xs text-gray-500 border border-gray-200">${p.leaveDate || ''}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap text-xs text-gray-500 border border-gray-200">${p.transferDate || ''}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap text-xs text-gray-500 border border-gray-200">${p.leaveStartDate || ''}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap text-xs text-gray-500 border border-gray-200">${p.leaveEndDate || ''}</td>
            <td class="px-3 py-3 text-right font-bold text-indigo-700 border border-gray-200">${mm.annualTotal.toFixed(2)}</td>
            ${monthsHtml}
            <td class="px-3 py-3 text-center border border-gray-200">${deleteBtn}</td>
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
    updateSortIcons('p-sort-', appState.personnelSortConfig.key, appState.personnelSortConfig.direction);

    // 전체 선택 체크박스 상태 업데이트
    const allCheckboxes = tbody.querySelectorAll('.p-check-item:not(:disabled)');
    const checkedCheckboxes = tbody.querySelectorAll('.p-check-item:checked:not(:disabled)');
    const masterCheckbox = document.getElementById('p-check-all');
    if (masterCheckbox && allCheckboxes.length > 0) {
        masterCheckbox.checked = checkedCheckboxes.length === allCheckboxes.length;
        masterCheckbox.indeterminate = checkedCheckboxes.length > 0 && checkedCheckboxes.length < allCheckboxes.length;
    }
}

export function renderActivityTable() {
    const tbody = DOM['activity-table-body'];
    if (!tbody) return;
    tbody.innerHTML = '';

    document.querySelectorAll('.a-monthly-col').forEach(el => el.style.display = appState.showActivityMonthly ? '' : 'none');

    let list = appState.activities.filter(a => canView(a.dept));

    if (appState.activityDept !== 'All') {
        list = list.filter(a => (a.dept || '미배정') === appState.activityDept);
    }

    const targetYear = appState.selectedYear;
    const authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
    const personAgg = {};

    list.forEach(a => {
        const p = authorizedPersonnel.find(p => p.name === a.name);
        if (!personAgg[a.name]) {
            const cap = p ? calculatePersonnelMM(p, targetYear, true).annualTotal : 0;
            personAgg[a.name] = { filled: 0, operating: 0, cap: cap, task: 0 };
        }
        const transferStr = p ? toStandard(p.transferDate) : "", leaveStr = p ? toStandard(p.leaveDate) : "";
        let currentYearMM = 0;
        for (let m = 1; m <= 12; m++) {
            const key = `${targetYear}-${String(m).padStart(2, '0')}`;
            let val = (a.manMonths[key]?.mm || 0);
            if (val > 0 && p) {
                const checkDate = `${targetYear}-${String(m).padStart(2, '0')}-01`;
                if (transferStr && checkDate > transferStr) val = 0;
                if (leaveStr && checkDate > leaveStr) val = 0;
            }
            currentYearMM += val;
        }
        if (a.projectType === '과제') personAgg[a.name].task += currentYearMM;
        if (a.projectType === '이행' || a.projectType === '제안') personAgg[a.name].operating += currentYearMM;
        if (a.projectType === '이행') personAgg[a.name].filled += currentYearMM;
    });

    list = list.map(a => {
        const agg = personAgg[a.name] || { filled: 0, operating: 0, cap: 0, task: 0 };
        const p = authorizedPersonnel.find(p => p.name === a.name);
        const transferStr = p ? toStandard(p.transferDate) : "", leaveStr = p ? toStandard(p.leaveDate) : "";
        let rowCurrentYearTotal = 0;
        for (let m = 1; m <= 12; m++) {
            const key = `${targetYear}-${String(m).padStart(2, '0')}`;
            let val = (a.manMonths[key]?.mm || 0);
            if (val > 0 && p) {
                const checkDate = `${targetYear}-${String(m).padStart(2, '0')}-01`;
                if (transferStr && checkDate > transferStr) val = 0;
                if (leaveStr && checkDate > leaveStr) val = 0;
            }
            rowCurrentYearTotal += val;
        }
        const netCap = Math.max(0, agg.cap - agg.task);
        return { ...a, totalManMonth: rowCurrentYearTotal, aggFilled: agg.filled, aggFilledRate: netCap > 0 ? (agg.filled / netCap) * 100 : 0, aggOperating: agg.operating, aggOperatingRate: netCap > 0 ? (agg.operating / netCap) * 100 : 0 };
    });

    list = list.filter(a => {
        const checkDate = appState.activityDate;
        if (!appState.showActivityWaiting && a.projectType === '대기' && checkDate >= a.startDate && checkDate <= a.endDate) {
            if (!a.projectName.includes('출산휴가') && !a.projectName.includes('육아휴직')) return false;
        }
        if (appState.showActivityResigned) return true;
        const p = authorizedPersonnel.find(p => p.name === a.name);
        if (!p) return true;
        if (p.transferDate && checkDate > p.transferDate) return false;
        if (p.leaveDate && checkDate > p.leaveDate) return false;
        return true;
    });

    if (appState.activityStatusFilter !== 'all') {
        list = list.filter(a => {
            let s = '예정';
            if (a.endDate < appState.activityDate) s = '완료';
            else if (a.startDate <= appState.activityDate && a.endDate >= appState.activityDate) s = '진행';
            return s === appState.activityStatusFilter;
        });
    }
    if (appState.dashboardNameFilter.length) list = list.filter(a => appState.dashboardNameFilter.includes(a.name));

    const colFilters = appState.filters.activity;
    Object.keys(colFilters).forEach(key => {
        const val = colFilters[key];
        if (val) {
            list = list.filter(a => String(a[key] || '').toLowerCase().includes(val));
        }
    });

    const sortedList = sortData([...list], appState.sortConfig.key, appState.sortConfig.direction);

    if (!sortedList.length) { DOM['no-data'].classList.remove('hidden'); return; }
    DOM['no-data'].classList.add('hidden');

    const checkDate = appState.activityDate;
    const fragment = document.createDocumentFragment();
    sortedList.forEach((a, i) => {
        const hasAuth = canEdit(a.dept);
        const tr = document.createElement('tr');
        tr.dataset.id = a.id;
        let calcStatus = '예정', badgeClass = 'bg-yellow-100 text-yellow-800';
        if (a.endDate < checkDate) { calcStatus = '완료'; badgeClass = 'bg-green-100 text-green-800'; }
        else if (a.startDate <= checkDate && a.endDate >= checkDate) { calcStatus = '진행'; badgeClass = 'bg-blue-100 text-blue-800'; }
        let monthsHtml = '';
        if (appState.showActivityMonthly) {
            for (let m = 1; m <= 12; m++) {
                const k = `${appState.selectedYear}-${String(m).padStart(2, '0')}`;
                const val = a.manMonths[k]?.mm || 0;
                monthsHtml += `<td class="px-2 py-2 text-right border border-gray-200 ${val > 0 ? 'text-blue-600 font-bold' : 'text-gray-300'}">${val > 0 ? val.toFixed(2) : '0'}</td>`;
            }
        }
        const nameCell = hasAuth ? `<td class="px-3 py-3 text-center whitespace-nowrap btn-load-for-edit text-blue-600 font-bold cursor-pointer hover:underline border border-gray-200">${a.name}</td>` : `<td class="px-3 py-3 text-center whitespace-nowrap text-gray-800 border border-gray-200">${a.name}</td>`;
        const deleteBtn = hasAuth ? `<button class="text-red-500 hover:text-red-700 text-xs btn-delete-a">삭제</button>` : `<span class="text-gray-300 text-xs">삭제불가</span>`;
        tr.innerHTML = `
            <td class="px-3 py-3 text-center border border-gray-200">${i + 1}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${a.team}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${a.dept || ''}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${a.role || ''}</td>
            ${nameCell}
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${a.rank || ''}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${a.projectType}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200"><span class="px-2 py-1 rounded text-xs ${badgeClass}">${calcStatus}</span></td>
            <td class="px-3 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px] border border-gray-200" title="${a.projectName}">${a.projectName}</td>
            <td class="px-3 py-3 text-center text-xs text-gray-500 whitespace-nowrap border border-gray-200">${a.startDate}</td>
            <td class="px-3 py-3 text-center text-xs text-gray-500 whitespace-nowrap border border-gray-200">${a.endDate}</td>
            <td class="px-3 py-3 text-right font-bold text-gray-900 border border-gray-200">${a.totalManMonth.toFixed(2)}</td>
            <td class="px-3 py-3 text-right font-bold text-blue-700 bg-blue-50 border border-gray-200">${a.aggFilled.toFixed(2)}</td>
            <td class="px-3 py-3 text-right font-bold text-blue-700 bg-blue-50 border border-gray-200">${a.aggFilledRate.toFixed(1)}%</td>
            <td class="px-3 py-3 text-right font-bold text-indigo-700 bg-indigo-50 border border-gray-200">${a.aggOperating.toFixed(2)}</td>
            <td class="px-3 py-3 text-right font-bold text-indigo-700 bg-indigo-50 border border-gray-200">${a.aggOperatingRate.toFixed(1)}%</td>
            ${monthsHtml}
            <td class="px-3 py-3 text-center border border-gray-200">${deleteBtn}</td>
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
    updateSortIcons('sort-', appState.sortConfig.key, appState.sortConfig.direction);
}

export function renderAssignmentTable() {
    const tbody = document.getElementById('assignment-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let list = [...appState.unconfirmedActivities];

    // Sorting
    const sortedList = sortData(list, appState.assignmentSortConfig.key, appState.assignmentSortConfig.direction);

    const noDataEl = document.getElementById('no-assignment-data');
    if (!sortedList.length) {
        if (noDataEl) noDataEl.classList.remove('hidden');
        tbody.innerHTML = '';
        return;
    }
    if (noDataEl) noDataEl.classList.add('hidden');

    const fragment = document.createDocumentFragment();
    sortedList.forEach((a) => {
        const hasConflict = appState.activities.some(existingActivity =>
            existingActivity.name === a.name &&
            a.startDate <= existingActivity.endDate &&
            a.endDate >= existingActivity.startDate
        );

        const tr = document.createElement('tr');
        tr.dataset.id = a.id;
        const deleteBtn = `<button class="text-red-500 hover:text-red-700 text-xs btn-delete-unconfirmed-a">삭제</button>`;

        let nameCellContent = a.name;
        if (hasConflict) {
            tr.classList.add('bg-red-50');
            tr.title = '기존 확정된 Activity와 일정이 중복됩니다.';
            nameCellContent = `<div class="flex items-center justify-center">
                <svg class="w-5 h-5 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span>${a.name}</span>
            </div>`;
        }

        tr.innerHTML = `
            <td class="px-3 py-3 text-center border border-gray-200">
                <input type="checkbox" value="${a.id}" class="assign-check-item accent-blue-600">
            </td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${a.projectType}</td>
            <td class="px-3 py-3 whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px] border border-gray-200" title="${a.projectName}">${a.projectName}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${a.dept || ''}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${a.role || ''}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200 btn-load-unconfirmed-for-edit cursor-pointer hover:underline text-blue-600 font-bold">${nameCellContent}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${a.rank || ''}</td>
            <td class="px-3 py-3 text-center text-xs text-gray-500 whitespace-nowrap border border-gray-200">${a.startDate}</td>
            <td class="px-3 py-3 text-center text-xs text-gray-500 whitespace-nowrap border border-gray-200">${a.endDate}</td>
            <td class="px-3 py-3 text-center border border-gray-200">${deleteBtn}</td>
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
    updateSortIcons('assign-sort-', appState.assignmentSortConfig.key, appState.assignmentSortConfig.direction);
}

export function renderDashboard(onChartClick) {
    const groupKey = DOM['dashboard-group-selector']?.value || 'dept';
    const groupNames = { dept: '부서', role: '직무', rank: '직급' };
    if (DOM['dashboard-th-group']) DOM['dashboard-th-group'].textContent = groupNames[groupKey];

    const date = new Date(appState.dashboardDate);
    const year = date.getFullYear();
    const summary = {};
    let authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
    const authorizedActivities = appState.activities.filter(a => canView(a.dept));
    if (appState.dashboardDept !== 'All') {
        authorizedPersonnel = authorizedPersonnel.filter(p => (p.dept || '미배정') === appState.dashboardDept);
    }

    const categories = new Set();
    authorizedPersonnel.forEach(p => {
        let val;
        if (groupKey === 'dept') val = p.dept || '미배정';
        else if (groupKey === 'role') val = p.role || '미정';
        else if (groupKey === 'rank') val = p.rank || '미정';
        categories.add(val);
    });

    Array.from(categories).forEach(c => summary[c] = { total: 0, prop: 0, exec: 0, supp: 0, wait: 0, task: 0, leave: 0 });
    let totalPossibleMM = 0, totalFilledMM = 0, totalOperatingMM = 0, totalTaskMM = 0;
    const checkDate = new Date(appState.dashboardDate);
    const targetMonthIdx = checkDate.getMonth();
    const targetDay = checkDate.getDate();
    authorizedPersonnel.forEach(p => {
        const mm = calculatePersonnelMM(p, year);
        for (let m = 0; m < targetMonthIdx; m++) {
            totalPossibleMM += (mm[`${year}-${String(m + 1).padStart(2, '0')}`] || 0);
        }
        const totalWorkingDays = getTotalWorkingDays(year, targetMonthIdx);
        if (totalWorkingDays > 0) {
            let avail = 0;
            const joinStr = toStandard(p.joinDate), leaveStr = toStandard(p.leaveDate), leaveStartStr = toStandard(p.leaveStartDate), leaveEndStr = toStandard(p.leaveEndDate), transferStr = toStandard(p.transferDate);
            for (let d = 1; d <= targetDay; d++) {
                const dateObj = new Date(year, targetMonthIdx, d);
                if (!isWorkingDay(dateObj)) continue;
                const dateStr = formatDate(dateObj);
                let isOk = true;
                if ((joinStr && dateStr < joinStr) || (leaveStr && dateStr > leaveStr) || (transferStr && dateStr > transferStr) || (p.employmentStatus === '퇴사' && !leaveStr)) isOk = false;
                if (leaveStartStr && leaveEndStr && dateStr >= leaveStartStr && dateStr <= leaveEndStr) isOk = false;
                if (isOk) avail++;
            }
            totalPossibleMM += (avail / totalWorkingDays);
        }
    });
    authorizedActivities.forEach(a => {
        const p = authorizedPersonnel.find(p => p.name === a.name);
        if (!p) return;
        const transferStr = p ? toStandard(p.transferDate) : "", leaveStr = p ? toStandard(p.leaveDate) : "";
        let currentYearMM = 0;
        for (let m = 0; m < targetMonthIdx; m++) {
            const k = `${year}-${String(m + 1).padStart(2, '0')}`;
            let val = (a.manMonths[k]?.mm || 0);
            const checkDateMonth = `${year}-${String(m + 1).padStart(2, '0')}-01`;
            if (val > 0 && p && ((transferStr && checkDateMonth > transferStr) || (leaveStr && checkDateMonth > leaveStr))) val = 0;
            currentYearMM += val;
        }
        const totalWorkingDays = getTotalWorkingDays(year, targetMonthIdx);
        if (totalWorkingDays > 0) {
            let work = 0;
            const actStart = toStandard(a.startDate), actEnd = toStandard(a.endDate);
            for (let d = 1; d <= targetDay; d++) {
                const dateObj = new Date(year, targetMonthIdx, d);
                if (!isWorkingDay(dateObj)) continue;
                const dateStr = formatDate(dateObj);
                if (dateStr >= actStart && dateStr <= actEnd) {
                    let isOk = true;
                    if (p && ((transferStr && dateStr > transferStr) || (leaveStr && dateStr > leaveStr))) isOk = false;
                    if (isOk) work++;
                }
            }
            currentYearMM += (work / totalWorkingDays);
        }
        if (a.projectType === '과제') totalTaskMM += currentYearMM;
        else if (a.projectType === '이행' || a.projectType === '제안') totalOperatingMM += currentYearMM;
        if (a.projectType === '이행') totalFilledMM += currentYearMM;
    });
    totalPossibleMM -= totalTaskMM;
    const filledRate = totalPossibleMM > 0 ? (totalFilledMM / totalPossibleMM) * 100 : 0;
    const operatingRate = totalPossibleMM > 0 ? (totalOperatingMM / totalPossibleMM) * 100 : 0;
    DOM['kpi-filled-rate'].innerHTML = `${filledRate.toFixed(2)}% <span class="text-sm font-normal text-teal-200 block mt-1">(${totalFilledMM.toFixed(1)} / ${totalPossibleMM.toFixed(1)} M/M)</span>`;
    DOM['kpi-operating-rate'].innerHTML = `${operatingRate.toFixed(2)}% <span class="text-sm font-normal text-indigo-200 block mt-1">(${totalOperatingMM.toFixed(1)} / ${totalPossibleMM.toFixed(1)} M/M)</span>`;
    const pMap = new Map();
    const checkDateStr = formatDate(date);
    authorizedPersonnel.forEach(p => {
        const dept = p.dept || '미배정';
        if (!summary[dept]) summary[dept] = { total: 0, prop: 0, exec: 0, supp: 0, wait: 0, task: 0, leave: 0 };
        const joinStr = toStandard(p.joinDate), leaveStr = toStandard(p.leaveDate), leaveStartStr = toStandard(p.leaveStartDate), leaveEndStr = toStandard(p.leaveEndDate), transferStr = toStandard(p.transferDate);
        let status = '재직';
        if (joinStr && checkDateStr < joinStr) status = '미입사';
        else if (leaveStr && checkDateStr > leaveStr) status = '퇴사';
        else if (transferStr && checkDateStr > transferStr) status = '전적';
        else if (p.employmentStatus === '퇴사') status = '퇴사';
        else {
            const isLeaveStatus = ['휴직', '출산휴가', '육아휴직'].includes(p.employmentStatus);
            const inLeavePeriod = (leaveStartStr && leaveEndStr && checkDateStr >= leaveStartStr && checkDateStr <= leaveEndStr);
            if (inLeavePeriod) status = '휴직';
            else if (isLeaveStatus && !leaveStartStr && !leaveEndStr) status = '휴직';
            else status = '재직';
        }

        let groupVal;
        if (groupKey === 'dept') groupVal = p.dept || '미배정';
        else if (groupKey === 'role') groupVal = p.role || '미정';
        else if (groupKey === 'rank') groupVal = p.rank || '미정';

        if (status === '재직' || status === '휴직') {
            summary[groupVal].total++;
            if (status === '휴직') summary[groupVal].leave++;
            pMap.set(p.name, { team: p.team, groupVal: groupVal, status: status, assigned: false });
        }
    });
    authorizedActivities.forEach(a => {
        const p = pMap.get(a.name);
        if (p && p.status === '재직' && summary[p.groupVal]) {
            const startStr = toStandard(a.startDate), endStr = toStandard(a.endDate);
            if (checkDateStr >= startStr && checkDateStr <= endStr) {
                p.assigned = true;
                if (a.projectType === '제안') summary[p.groupVal].prop++;
                else if (a.projectType === '이행') summary[p.groupVal].exec++;
                else if (a.projectType === '지원') summary[p.groupVal].supp++;
                else if (a.projectType === '과제') summary[p.groupVal].task++;
                else if (a.projectType === '대기') summary[p.groupVal].wait++;
            }
        }
    });
    pMap.forEach(p => {
        if (p.status === '재직' && !p.assigned && summary[p.groupVal]) summary[p.groupVal].wait++;
    });
    const tbody = DOM['dashboard-summary-table-body']; tbody.innerHTML = '';
    let totals = { total: 0, prop: 0, exec: 0, supp: 0, wait: 0, task: 0, leave: 0 };
    
    let sortedCategories = Array.from(categories);
    if (groupKey === 'dept') {
        const orderMap = {};
        DEPARTMENTS.forEach((d, i) => orderMap[d] = i);
        sortedCategories.sort((a, b) => {
            if (a === '미배정') return 1;
            if (b === '미배정') return -1;
            return (orderMap[a] ?? 999) - (orderMap[b] ?? 999);
        });
    } else if (groupKey === 'rank') {
        const rankOrder = ['이사', '수석2', '수석1', '책임2', '책임1', '선임'];
        const orderMap = {};
        rankOrder.forEach((r, i) => orderMap[r] = i);
        sortedCategories.sort((a, b) => {
            if (a === '미정') return 1;
            if (b === '미정') return -1;
            return (orderMap[a] ?? 999) - (orderMap[b] ?? 999);
        });
    } else {
        sortedCategories.sort();
    }

    sortedCategories.forEach(cat => {
        const d = summary[cat];
        if (d.total === 0) return;
        Object.keys(totals).forEach(k => totals[k] += d[k]);
        tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="py-3 font-bold cursor-pointer hover:text-blue-600 hover:underline" onclick="showKpiDetail('operating', null, null, '${groupKey}', '${cat}')" title="클릭 시 KPI 상세(가동율) 조회">${cat}</td><td class="py-3 cursor-pointer hover:bg-blue-100 font-bold text-blue-900" onclick="filterDash('${groupKey}', '${cat}','total')">${d.total}</td><td class="py-3 cursor-pointer hover:bg-blue-100" onclick="filterDash('${groupKey}', '${cat}','prop')">${d.prop}</td><td class="py-3 cursor-pointer hover:bg-blue-100" onclick="filterDash('${groupKey}', '${cat}','exec')">${d.exec}</td><td class="py-3 cursor-pointer hover:bg-blue-100" onclick="filterDash('${groupKey}', '${cat}','supp')">${d.supp}</td><td class="py-3 cursor-pointer hover:bg-blue-100" onclick="filterDash('${groupKey}', '${cat}','wait')">${d.wait}</td><td class="py-3 cursor-pointer hover:bg-blue-100" onclick="filterDash('${groupKey}', '${cat}','task')">${d.task}</td><td class="py-3 text-gray-500">${d.leave}</td></tr>`;
    });
    DOM['dashboard-summary-table-footer'].innerHTML = `<tr class="bg-gray-100 border-t-2 border-gray-300"><td class="py-3">합계</td><td class="py-3 text-blue-900 cursor-pointer hover:bg-blue-200" onclick="filterDash('${groupKey}', 'All', 'total')">${totals.total}</td><td class="py-3 cursor-pointer hover:bg-blue-200" onclick="filterDash('${groupKey}', 'All', 'prop')">${totals.prop}</td><td class="py-3 cursor-pointer hover:bg-blue-200" onclick="filterDash('${groupKey}', 'All', 'exec')">${totals.exec}</td><td class="py-3 cursor-pointer hover:bg-blue-200" onclick="filterDash('${groupKey}', 'All', 'supp')">${totals.supp}</td><td class="py-3 cursor-pointer hover:bg-blue-200" onclick="filterDash('${groupKey}', 'All', 'wait')">${totals.wait}</td><td class="py-3 cursor-pointer hover:bg-blue-200" onclick="filterDash('${groupKey}', 'All', 'task')">${totals.task}</td><td class="py-3 text-gray-500 cursor-pointer hover:bg-gray-200" onclick="filterDash('${groupKey}', 'All', 'leave')">${totals.leave}</td></tr>`;
    renderCharts(onChartClick);
}

export function showDashboardDetailModal(groupKey, type, list) {
    const titleMap = { 'total': '총원', 'prop': '제안', 'exec': '이행', 'supp': '지원', 'wait': '대기', 'task': '과제', 'leave': '휴직', 'prev': '전주', 'current': '현재', 'opTotal': '가동 계', 'nonOpTotal': '비가동 계', 'opRate': '가동율(가동인원)', 'fillRate': '가득율(이행인원)' };
    const typeName = titleMap[type] || type;
    const groupName = groupKey === 'All' ? '전체' : groupKey;
    document.getElementById('dashboard-detail-title').textContent = `${groupName} - ${typeName} 목록 (${list.length}명)`;
    const tbody = document.getElementById('dashboard-detail-list');
    tbody.innerHTML = '';
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-4 text-center text-gray-400">데이터가 없습니다.</td></tr>';
    } else {
        list.sort((a, b) => a.name.localeCompare(b.name));
        list.forEach((item, i) => {
            tbody.innerHTML += `<tr class="hover:bg-gray-50 border-b"><td class="px-4 py-2 text-center">${i + 1}</td><td class="px-4 py-2 text-center">${item.team}</td><td class="px-4 py-2 text-center font-bold text-gray-800">${item.name}</td><td class="px-4 py-2 text-center">${item.status}</td><td class="px-4 py-2 text-left text-xs text-gray-600">${item.projects}</td></tr>`;
        });
    }
    document.getElementById('dashboard-detail-modal').classList.remove('hidden');
}

export function renderCharts(onChartClick) {
    const groupKey = DOM['dashboard-group-selector']?.value || 'dept';
    const date = new Date(appState.dashboardDate);
    const year = date.getFullYear();
    let authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
    const authorizedActivities = appState.activities.filter(a => canView(a.dept));
    if (appState.dashboardDept !== 'All') {
        authorizedPersonnel = authorizedPersonnel.filter(p => (p.dept || '미배정') === appState.dashboardDept);
    }

    const categories = new Set();
    authorizedPersonnel.forEach(p => {
        let val;
        if (groupKey === 'dept') val = p.dept || '미배정';
        else if (groupKey === 'role') val = p.role || '미정';
        else if (groupKey === 'rank') val = p.rank || '미정';
        categories.add(val);
    });

    let sortedCategories = Array.from(categories);
    if (groupKey === 'dept') {
        const orderMap = {};
        DEPARTMENTS.forEach((d, i) => orderMap[d] = i);
        sortedCategories.sort((a, b) => {
            if (a === '미배정') return 1;
            if (b === '미배정') return -1;
            return (orderMap[a] ?? 999) - (orderMap[b] ?? 999);
        });
    } else if (groupKey === 'rank') {
        const rankOrder = ['이사', '수석2', '수석1', '책임2', '책임1', '선임'];
        const orderMap = {};
        rankOrder.forEach((r, i) => orderMap[r] = i);
        sortedCategories.sort((a, b) => {
            if (a === '미정') return 1;
            if (b === '미정') return -1;
            return (orderMap[a] ?? 999) - (orderMap[b] ?? 999);
        });
    } else {
        sortedCategories.sort();
    }

    const monthlyCapacity = {}, monthlyFilled = {}, monthlyOperating = {};
    sortedCategories.forEach(cat => {
        monthlyCapacity[cat] = Array(12).fill(0);
        monthlyFilled[cat] = Array(12).fill(0);
        monthlyOperating[cat] = Array(12).fill(0);
    });

    authorizedPersonnel.forEach(p => {
        let cat;
        if (groupKey === 'dept') cat = p.dept || '미배정';
        else if (groupKey === 'role') cat = p.role || '미정';
        else if (groupKey === 'rank') cat = p.rank || '미정';
        if (!monthlyCapacity[cat]) return;

        const mm = calculatePersonnelMM(p, year);
        for (let m = 0; m < 12; m++) {
            monthlyCapacity[cat][m] += (mm[`${year}-${String(m + 1).padStart(2, '0')}`] || 0);
        }
    });

    authorizedActivities.forEach(a => {
        const p = authorizedPersonnel.find(p => p.name === a.name);
        if (!p) return;
        let cat;
        if (groupKey === 'dept') cat = p.dept || '미배정';
        else if (groupKey === 'role') cat = p.role || '미정';
        else if (groupKey === 'rank') cat = p.rank || '미정';
        if (!monthlyCapacity[cat]) return;

        const transferStr = toStandard(p.transferDate), leaveStr = toStandard(p.leaveDate);
        for (let m = 0; m < 12; m++) {
            const key = `${year}-${String(m + 1).padStart(2, '0')}`;
            let val = (a.manMonths[key]?.mm || 0);
            const checkDate = `${year}-${String(m + 1).padStart(2, '0')}-01`;
            if (val > 0 && p && ((transferStr && checkDate > transferStr) || (leaveStr && checkDate > leaveStr))) val = 0;
            if (a.projectType === '과제') monthlyCapacity[cat][m] -= val;
            else if (a.projectType === '이행' || a.projectType === '제안') monthlyOperating[cat][m] += val;
            if (a.projectType === '이행') monthlyFilled[cat][m] += val;
        }
    });

    const filledDatasets = [];
    const operatingDatasets = [];
    const colors = [
        { bg: 'rgba(59, 130, 246, 0.5)', border: 'rgba(37, 99, 235, 1)' }, // blue
        { bg: 'rgba(16, 185, 129, 0.5)', border: 'rgba(5, 150, 105, 1)' }, // green
        { bg: 'rgba(245, 158, 11, 0.5)', border: 'rgba(217, 119, 6, 1)' }, // orange
        { bg: 'rgba(236, 72, 153, 0.5)', border: 'rgba(219, 39, 119, 1)' }, // pink
        { bg: 'rgba(139, 92, 246, 0.5)', border: 'rgba(109, 40, 217, 1)' }, // purple
        { bg: 'rgba(14, 165, 233, 0.5)', border: 'rgba(2, 132, 199, 1)' },  // sky
        { bg: 'rgba(20, 184, 166, 0.5)', border: 'rgba(15, 118, 110, 1)' }, // teal
        { bg: 'rgba(244, 63, 94, 0.5)',  border: 'rgba(225, 29, 72, 1)' }   // rose
    ];

    sortedCategories.forEach((cat, idx) => {
        const color = colors[idx % colors.length];
        const barDataFill = [], cumDataFill = [];
        const barDataOp = [], cumDataOp = [];
        let cumCap = 0, cumFill = 0, cumOp = 0;

        for (let i = 0; i < 12; i++) {
            let cap = monthlyCapacity[cat][i], fill = monthlyFilled[cat][i], op = monthlyOperating[cat][i];
            barDataFill.push(cap > 0 ? (fill / cap) * 100 : 0);
            barDataOp.push(cap > 0 ? (op / cap) * 100 : 0);
            cumCap += cap; cumFill += fill; cumOp += op;
            cumDataFill.push(cumCap > 0 ? (cumFill / cumCap) * 100 : 0);
            cumDataOp.push(cumCap > 0 ? (cumOp / cumCap) * 100 : 0);
        }

        filledDatasets.push({ label: `${cat} 누적`, data: cumDataFill, type: 'line', borderColor: color.border, backgroundColor: color.border, borderWidth: 2, tension: 0.1, order: 1 });
        filledDatasets.push({ label: `${cat} 월별`, data: barDataFill, type: 'bar', backgroundColor: color.bg, borderColor: color.border, borderWidth: 1, order: 2 });
        
        operatingDatasets.push({ label: `${cat} 누적`, data: cumDataOp, type: 'line', borderColor: color.border, backgroundColor: color.border, borderWidth: 2, tension: 0.1, order: 1 });
        operatingDatasets.push({ label: `${cat} 월별`, data: barDataOp, type: 'bar', backgroundColor: color.bg, borderColor: color.border, borderWidth: 1, order: 2 });
    });

    const labels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    drawMixedChart('filledRateChart', appState.filledChartInstance, labels, filledDatasets, (newChart) => appState.filledChartInstance = newChart, onChartClick('filled'));
    drawMixedChart('operatingRateChart', appState.operatingChartInstance, labels, operatingDatasets, (newChart) => appState.operatingChartInstance = newChart, onChartClick('operating'));
}

function drawMixedChart(canvasId, chartInstance, labels, datasets, setCallback, onClick) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;
    if (chartInstance) chartInstance.destroy();
    const newChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            onClick: onClick, 
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + '%' } } }, 
            plugins: { tooltip: { mode: 'index', intersect: false } } 
        }
    });
    setCallback(newChart);
}

export function renderWeekly() {
    const dateObj = new Date(appState.weeklyDate);
    const day = dateObj.getDay();
    const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(dateObj.setDate(diff));
    const weekDays = Array.from({ length: 5 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return formatDate(d); });
    DOM['weekly-range-label'].textContent = `${weekDays[0]} ~ ${weekDays[4]}`;
    const targetDateStr = appState.weeklyDate;
    const tDate = new Date(targetDateStr);
    tDate.setDate(tDate.getDate() - 7);
    const prevWeekStr = formatDate(tDate);

    const groupKey = DOM['weekly-group-selector']?.value || 'dept';
    const groupNames = { dept: '부서', role: '직무', rank: '직급' };
    if (DOM['weekly-th-group']) DOM['weekly-th-group'].textContent = groupNames[groupKey];

    const authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
    const authorizedActivities = appState.activities.filter(a => canView(a.dept));

    const categories = new Set();
    authorizedPersonnel.forEach(p => {
        const dept = p.dept || "미배정";
        if (appState.weeklyDept !== 'All' && dept !== appState.weeklyDept) return;
        if (appState.weeklyDept === 'All' && dept === 'ENTEC담당') return;
        
        let val;
        if (groupKey === 'dept') val = p.dept || '미배정';
        else if (groupKey === 'role') val = p.role || '미정';
        else if (groupKey === 'rank') val = p.rank || '미정';
        categories.add(val);
    });

    let sortedCategories = Array.from(categories);
    if (groupKey === 'dept') {
        const orderMap = {};
        DEPARTMENTS.forEach((d, i) => orderMap[d] = i);
        sortedCategories.sort((a, b) => {
            if (a === '미배정') return 1;
            if (b === '미배정') return -1;
            return (orderMap[a] ?? 999) - (orderMap[b] ?? 999);
        });
    } else if (groupKey === 'rank') {
        const rankOrder = ['이사', '수석2', '수석1', '책임2', '책임1', '선임'];
        const orderMap = {};
        rankOrder.forEach((r, i) => orderMap[r] = i);
        sortedCategories.sort((a, b) => {
            if (a === '미정') return 1;
            if (b === '미정') return -1;
            return (orderMap[a] ?? 999) - (orderMap[b] ?? 999);
        });
    } else {
        sortedCategories.sort();
    }

    const summary = {};
    sortedCategories.forEach(cat => summary[cat] = { prev: 0, current: 0, exec: 0, prop: 0, supp: 0, wait: 0, leave: 0, task: 0 });

    authorizedPersonnel.forEach(p => {
        const dept = p.dept || "미배정";
        if (appState.weeklyDept !== 'All' && dept !== appState.weeklyDept) return;
        if (appState.weeklyDept === 'All' && dept === 'ENTEC담당') return;
        
        let cat;
        if (groupKey === 'dept') cat = p.dept || '미배정';
        else if (groupKey === 'role') cat = p.role || '미정';
        else if (groupKey === 'rank') cat = p.rank || '미정';
        if (!summary[cat]) return;

        const joinStr = toStandard(p.joinDate), leaveStr = toStandard(p.leaveDate), transferStr = toStandard(p.transferDate), leaveStart = toStandard(p.leaveStartDate), leaveEnd = toStandard(p.leaveEndDate);
        if (!((joinStr && joinStr > prevWeekStr) || (leaveStr && leaveStr < prevWeekStr) || (transferStr && transferStr < prevWeekStr) || (p.employmentStatus === '퇴사' && !leaveStr))) {
            summary[cat].prev++;
        }
        let isEmployed = !((joinStr && joinStr > targetDateStr) || (leaveStr && leaveStr < targetDateStr) || (transferStr && transferStr < targetDateStr) || (p.employmentStatus === '퇴사' && !leaveStr));
        if (isEmployed) {
            const isLeaveStatus = ['휴직', '출산휴가', '육아휴직'].includes(p.employmentStatus);
            let isLeave = (leaveStart && leaveEnd && targetDateStr >= leaveStart && targetDateStr <= leaveEnd) || (isLeaveStatus && !leaveStart && !leaveEnd);
            if (isLeave) {
                summary[cat].leave++;
            } else {
                const act = authorizedActivities.find(a => a.name === p.name && targetDateStr >= toStandard(a.startDate) && targetDateStr <= toStandard(a.endDate));
                if (act) {
                    if (act.projectType === '이행') summary[cat].exec++;
                    else if (act.projectType === '제안') summary[cat].prop++;
                    else if (act.projectType === '지원') summary[cat].supp++;
                    else if (act.projectType === '과제') summary[cat].task++;
                    else summary[cat].wait++;
                } else {
                    summary[cat].wait++;
                }
            }
            summary[cat].current++;
        }
    });
    const summaryTbody = DOM['weekly-summary-tbody'], summaryTfoot = DOM['weekly-summary-tfoot'];
    summaryTbody.innerHTML = ''; summaryTfoot.innerHTML = '';
    let total = { prev: 0, current: 0, exec: 0, prop: 0, supp: 0, wait: 0, leave: 0, task: 0 };
    sortedCategories.forEach(cat => {
        const d = summary[cat];
        Object.keys(total).forEach(k => total[k] += d[k]);
        const change = d.current - d.prev, opTotal = d.exec + d.prop, nonOpTotal = d.wait + d.supp, actualOp = Math.max(0, d.current - d.leave - d.task);
        const opRate = actualOp > 0 ? (opTotal / actualOp * 100) : 0;
        const fillRate = actualOp > 0 ? (d.exec / actualOp * 100) : 0;
        summaryTbody.innerHTML += `<tr class="hover:bg-gray-50 border-b"><td class="py-2 px-2 font-medium">${cat}</td><td class="py-2 px-2 text-gray-600 cursor-pointer hover:bg-gray-200" onclick="filterWeekly('${groupKey}','${cat}','prev')">${d.prev}</td><td class="py-2 px-2 ${change > 0 ? 'text-red-500' : (change < 0 ? 'text-blue-500' : 'text-gray-400')}">${change > 0 ? '+' + change : change}</td><td class="py-2 px-2 font-bold cursor-pointer hover:bg-gray-200" onclick="filterWeekly('${groupKey}','${cat}','current')">${d.current}</td><td class="py-2 px-2 bg-blue-50 font-semibold text-blue-700 cursor-pointer hover:bg-blue-100" onclick="filterWeekly('${groupKey}','${cat}','opTotal')">${opTotal}</td><td class="py-2 px-2 bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100" onclick="filterWeekly('${groupKey}','${cat}','exec')">${d.exec}</td><td class="py-2 px-2 bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100" onclick="filterWeekly('${groupKey}','${cat}','prop')">${d.prop}</td><td class="py-2 px-2 bg-red-50 font-semibold text-red-700 cursor-pointer hover:bg-red-100" onclick="filterWeekly('${groupKey}','${cat}','nonOpTotal')">${nonOpTotal}</td><td class="py-2 px-2 bg-red-50 text-red-600 cursor-pointer hover:bg-red-100" onclick="filterWeekly('${groupKey}','${cat}','wait')">${d.wait}</td><td class="py-2 px-2 bg-red-50 text-red-600 cursor-pointer hover:bg-red-100" onclick="filterWeekly('${groupKey}','${cat}','supp')">${d.supp}</td><td class="py-2 px-2 text-gray-500 cursor-pointer hover:bg-gray-200" onclick="filterWeekly('${groupKey}','${cat}','task')">${d.task}</td><td class="py-2 px-2 text-gray-500 cursor-pointer hover:bg-gray-200" onclick="filterWeekly('${groupKey}','${cat}','leave')">${d.leave}</td><td class="py-2 px-2 font-bold cursor-pointer hover:bg-gray-200" onclick="filterWeekly('${groupKey}','${cat}','opRate')">${opRate.toFixed(1)}%</td><td class="py-2 px-2 font-bold cursor-pointer hover:bg-gray-200" onclick="filterWeekly('${groupKey}','${cat}','fillRate')">${fillRate.toFixed(1)}%</td></tr>`;
    });
    const totalChange = total.current - total.prev, totalOpTotal = total.exec + total.prop, totalNonOpTotal = total.wait + total.supp, totalActualOp = Math.max(0, total.current - total.leave - total.task);
    const totalOpRate = totalActualOp > 0 ? (totalOpTotal / totalActualOp * 100) : 0;
    const totalFillRate = totalActualOp > 0 ? (total.exec / totalActualOp * 100) : 0;
    summaryTfoot.innerHTML = `<tr><td class="py-2 px-2">합계</td><td class="py-2 px-2 text-gray-700 cursor-pointer hover:bg-gray-300" onclick="filterWeekly('${groupKey}','All','prev')">${total.prev}</td><td class="py-2 px-2 ${totalChange > 0 ? 'text-red-600' : (totalChange < 0 ? 'text-blue-600' : 'text-gray-500')}">${totalChange > 0 ? '+' + totalChange : totalChange}</td><td class="py-2 px-2 text-blue-900 cursor-pointer hover:bg-blue-200" onclick="filterWeekly('${groupKey}','All','current')">${total.current}</td><td class="py-2 px-2 bg-blue-100 text-blue-900 cursor-pointer hover:bg-blue-300" onclick="filterWeekly('${groupKey}','All','opTotal')">${totalOpTotal}</td><td class="py-2 px-2 bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-300" onclick="filterWeekly('${groupKey}','All','exec')">${total.exec}</td><td class="py-2 px-2 bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-300" onclick="filterWeekly('${groupKey}','All','prop')">${total.prop}</td><td class="py-2 px-2 bg-red-100 text-red-900 cursor-pointer hover:bg-red-300" onclick="filterWeekly('${groupKey}','All','nonOpTotal')">${totalNonOpTotal}</td><td class="py-2 px-2 bg-red-100 text-red-800 cursor-pointer hover:bg-red-300" onclick="filterWeekly('${groupKey}','All','wait')">${total.wait}</td><td class="py-2 px-2 bg-red-100 text-red-800 cursor-pointer hover:bg-red-300" onclick="filterWeekly('${groupKey}','All','supp')">${total.supp}</td><td class="py-2 px-2 text-gray-700 cursor-pointer hover:bg-gray-300" onclick="filterWeekly('${groupKey}','All','task')">${total.task}</td><td class="py-2 px-2 text-gray-700 cursor-pointer hover:bg-gray-300" onclick="filterWeekly('${groupKey}','All','leave')">${total.leave}</td><td class="py-2 px-2">${totalOpRate.toFixed(1)}%</td><td class="py-2 px-2">${totalFillRate.toFixed(1)}%</td></tr>`;
    const tbody = DOM['weekly-table-body']; tbody.innerHTML = '';
    const sortedPersonnel = sortData([...authorizedPersonnel], appState.weeklySortConfig.key, appState.weeklySortConfig.direction);
    let scheduleCount = 0;
    sortedPersonnel.forEach(p => {
        const dept = p.dept || "미배정";
        if (appState.weeklyDept !== 'All' && dept !== appState.weeklyDept) return;
        if (appState.weeklyDept === 'All' && dept === 'ENTEC담당') return;
        const joinStr = toStandard(p.joinDate), leaveStr = toStandard(p.leaveDate), transferStr = toStandard(p.transferDate);
        if ((joinStr && joinStr > weekDays[4]) || (leaveStr && leaveStr < weekDays[0]) || (transferStr && transferStr < weekDays[0]) || (p.employmentStatus === '퇴사' && !leaveStr)) return;
        scheduleCount++;
        let rowHtml = `<td class="py-3 border-b">${scheduleCount}</td><td class="py-3 border-b">${p.team}</td><td class="py-3 border-b">${p.dept || '-'}</td><td class="py-3 border-b font-bold text-gray-800">${p.name} <span class="text-xs text-gray-500 font-normal">${p.rank || ''}</span></td>`;
        let activeProject = '-';
        weekDays.forEach(dayStr => {
            let cellText = '대기', cellClass = 'text-gray-400';
            if (appState.holidaySet.has(dayStr)) {
                cellText = '휴'; cellClass = 'bg-red-50 text-red-500';
            } else {
                const leaveStart = toStandard(p.leaveStartDate), leaveEnd = toStandard(p.leaveEndDate);
                if (leaveStart && leaveEnd && dayStr >= leaveStart && dayStr <= leaveEnd) {
                    if (p.employmentStatus === '육아휴직') cellText = '육휴';
                    else if (p.employmentStatus === '출산휴가') cellText = '출휴';
                    else cellText = '휴직';
                    cellClass = 'bg-yellow-50 text-yellow-600';
                } else {
                    const act = authorizedActivities.find(a => a.name === p.name && dayStr >= toStandard(a.startDate) && dayStr <= toStandard(a.endDate));
                    if (act) {
                        if (act.projectType === '대기') { cellText = '대기'; cellClass = 'text-gray-400'; }
                        else { cellText = '투입'; cellClass = 'bg-blue-50 text-blue-600 font-bold'; activeProject = act.projectName; }
                    }
                }
            }
            rowHtml += `<td class="py-3 border-b ${cellClass}">${cellText}</td>`;
        });
        rowHtml += `<td class="py-3 border-b text-xs text-left px-2 truncate max-w-[150px]" title="${activeProject}">${activeProject}</td>`;
        tbody.innerHTML += `<tr>${rowHtml}</tr>`;
    });
    updateSortIcons('wk-sort-', appState.weeklySortConfig.key, appState.weeklySortConfig.direction);
}

export function renderWaiting() {
    const tbody = DOM['waiting-table-body'];
    tbody.innerHTML = '';
    const dateStr = appState.waitingDatePickerDate;
    let authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
    const authorizedActivities = appState.activities.filter(a => canView(a.dept));
    const activeNames = new Set(), activityLeaveMap = new Map();
    authorizedActivities.forEach(a => {
        if (dateStr >= a.startDate && dateStr <= a.endDate) {
            if (a.projectName.includes('출산휴가') || a.projectName.includes('육아휴직')) activityLeaveMap.set(a.name, a);
            else if (a.projectType !== '대기') activeNames.add(a.name);
        }
    });
    if (appState.waitingDept !== 'All') {
        authorizedPersonnel = authorizedPersonnel.filter(p => (p.dept || '미배정') === appState.waitingDept);
    }
    let waitingList = [];
    authorizedPersonnel.forEach(p => {
        if ((p.joinDate && p.joinDate > dateStr) || (p.leaveDate && dateStr > p.leaveDate) || (p.transferDate && dateStr > p.transferDate)) return;
        const isEmployed = p.employmentStatus === '재직';
        const isStatusLeave = ['휴직', '출산휴가', '육아휴직'].includes(p.employmentStatus);
        let isPeriodLeave = (p.leaveStartDate && p.leaveEndDate && dateStr >= p.leaveStartDate && dateStr <= p.leaveEndDate);
        if ((isEmployed || isStatusLeave) && !activeNames.has(p.name)) {
            const nextConfirmedP = authorizedActivities.filter(a => a.name === p.name && a.startDate > dateStr).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
            const nextUnconfirmedP = appState.unconfirmedActivities.filter(a => a.name === p.name && a.startDate > dateStr).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

            let nextP = null;
            let isNextUnconfirmed = false;

            if (nextConfirmedP && nextUnconfirmedP) {
                if (nextConfirmedP.startDate <= nextUnconfirmedP.startDate) {
                    nextP = nextConfirmedP;
                } else {
                    nextP = nextUnconfirmedP;
                    isNextUnconfirmed = true;
                }
            } else if (nextConfirmedP) {
                nextP = nextConfirmedP;
            } else if (nextUnconfirmedP) {
                nextP = nextUnconfirmedP;
                isNextUnconfirmed = true;
            }

            let statusText = '대기중', statusClass = 'text-green-600';
            let remark = '-';
            if (nextP) {
                remark = isNextUnconfirmed
                    ? `${nextP.startDate} (${nextP.projectName}) <span class="text-xs text-orange-500 font-semibold">[미확정]</span>`
                    : `${nextP.startDate} (${nextP.projectName})`;
            }

            const actLeave = activityLeaveMap.get(p.name);
            if (actLeave) {
                statusText = actLeave.projectName;
                statusClass = 'text-red-600';
                remark = `<span class="text-red-500 font-bold">${actLeave.projectName} (~${actLeave.endDate})</span>`;
            } else if (isPeriodLeave || (isStatusLeave && !p.leaveStartDate && !p.leaveEndDate)) {
                statusText = isPeriodLeave ? (isStatusLeave ? p.employmentStatus : '휴직') : p.employmentStatus;
                statusClass = 'text-red-600';
                remark = p.leaveEndDate ? `<span class="text-red-500 font-bold">${statusText} (~${p.leaveEndDate})</span>` : `<span class="text-red-500 font-bold">${statusText}</span>`;
            }
            waitingList.push({ id: p.id, team: p.team, dept: p.dept || '-', role: p.role || '-', name: p.name, rank: p.rank || '', statusText, statusClass, remark, remarkRaw: remark.replace(/<[^>]*>?/gm, '') });
        }
    });
    const sortedList = sortData(waitingList, appState.waitingSortConfig.key, appState.waitingSortConfig.direction);

    if (sortedList.length === 0) {
        DOM['no-waiting-data'].style.display = 'block';
        return;
    }
    DOM['no-waiting-data'].style.display = 'none';

    const fragment = document.createDocumentFragment();
    sortedList.forEach((item, i) => {
        const tr = document.createElement('tr');
        tr.dataset.id = item.id;
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = `
            <td class="px-3 py-3 text-center border border-gray-200">${i + 1}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${item.team}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${item.dept}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${item.role}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap font-bold text-blue-600 cursor-pointer hover:underline btn-show-detail border border-gray-200">${item.name}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap border border-gray-200">${item.rank}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap ${item.statusClass} border border-gray-200">${item.statusText}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap text-sm text-gray-500 border border-gray-200">${item.remark}</td>
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);

    updateSortIcons('w-sort-', appState.waitingSortConfig.key, appState.waitingSortConfig.direction);
}

export const getClosingTargets = (targetMonth) => {
    const [y, m] = targetMonth.split('-').map(Number);
    const monthStart = `${targetMonth}-01`;
    const monthEnd = `${targetMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    const targets = new Map();
    const authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
    const authorizedActivities = appState.activities.filter(a => canView(a.dept));
    authorizedPersonnel.forEach(p => {
        const joinStr = toStandard(p.joinDate), leaveStr = toStandard(p.leaveDate), transferStr = toStandard(p.transferDate);
        if ((joinStr && joinStr > monthEnd) || (leaveStr && leaveStr < monthStart) || (transferStr && transferStr < monthStart) || (p.employmentStatus === '퇴사' && !leaveStr)) return;
        targets.set(p.name, { team: p.team, dept: p.dept, projects: [], hasTargetActivity: false });
    });
    authorizedActivities.forEach(a => {
        if (a.endDate < monthStart || a.startDate > monthEnd) return;
        if (targets.has(a.name)) {
            const data = targets.get(a.name);
            data.projects.push(`[${a.projectType}] ${a.projectName}`);
            if (a.projectType === '제안' || a.projectType === '이행') data.hasTargetActivity = true;
        }
    });
    return targets;
};

export function renderClosing() {
    const tbody = document.getElementById('closing-table-body');
    tbody.innerHTML = '';
    const targetMonth = appState.closingMonth;
    const targets = getClosingTargets(targetMonth);
    const countEl = document.getElementById('closing-checked-count');

    if (targets.size === 0) {
        document.getElementById('no-closing-data').classList.remove('hidden');
        if (countEl) countEl.textContent = '(0/0)';
        return;
    }
    document.getElementById('no-closing-data').classList.add('hidden');

    let list = Array.from(targets.entries()).map(([name, data]) => ({
        name,
        ...data
    }));

    let visibleList = list.filter(item => {
        return appState.closingDept === 'All' || (item.dept || '미배정') === appState.closingDept;
    });

    const sortedList = sortData(visibleList, appState.closingSortConfig.key, appState.closingSortConfig.direction);

    const activeTargetsInView = sortedList.filter(item => item.hasTargetActivity);
    const totalCheckable = activeTargetsInView.length;
    const checkedCount = activeTargetsInView.filter(item => appState.closingData[`${targetMonth}_${item.name}`]).length;

    if (countEl) {
        countEl.textContent = `(${checkedCount}/${totalCheckable})`;
    }

    let count = 0;
    sortedList.forEach(item => {
        const checkKey = `${targetMonth}_${item.name}`;
        const isChecked = appState.closingData[checkKey] ? 'checked' : '';
        const isDisabled = !item.hasTargetActivity;
        tbody.innerHTML += `<tr class="hover:bg-gray-50 ${isDisabled ? 'bg-gray-50 text-gray-400' : ''}">
            <td class="py-3 border-b">${++count}</td>
            <td class="py-3 border-b">${item.team}</td>
            <td class="py-3 border-b">${item.dept || '-'}</td>
            <td class="py-3 border-b font-bold ${isDisabled ? 'text-gray-400' : 'text-gray-800'}">${item.name}</td>
            <td class="py-3 border-b text-left px-4 text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-600'}">${item.projects.join('<br>')}</td>
            <td class="py-3 border-b"><input type="checkbox" class="w-5 h-5 accent-blue-600 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}" ${isChecked} ${isDisabled ? 'disabled' : ''} onchange="toggleClosing('${checkKey}', this.checked)"></td>
        </tr>`;
    });

    updateSortIcons('c-sort-', appState.closingSortConfig.key, appState.closingSortConfig.direction);
}

export function renderUserTable() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = appState.users.map(u => `<tr><td class="px-4 py-3">${u.username}</td><td class="px-4 py-3"><span class="px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : (u.role === 'viewer' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}">${u.role}</span></td><td class="px-4 py-3 text-sm">${u.role === 'admin' ? '전체 (관리)' : (u.role === 'viewer' ? '전체 (조회)' : (u.managedDepts && u.managedDepts.length > 0 ? (Array.isArray(u.managedDepts) ? u.managedDepts.join(', ') : String(u.managedDepts).split(',').map(s => s.trim()).join(', ')) : '<span class="text-red-500 font-semibold">권한 없음</span>'))}</td><td class="px-4 py-3 text-center"><button class="text-blue-500 hover:text-blue-700 text-sm mr-2" onclick="openUserEditModal('${u.username}')">권한수정</button><button class="text-blue-500 hover:text-blue-700 text-sm mr-2" onclick="openPwModal('${u.username}')">비번변경</button>${u.username !== 'admin' ? `<button class="text-red-500 hover:text-red-700 text-sm" onclick="deleteUser('${u.username}')">삭제</button>` : '-'}</td></tr>`).join('');
}

export function renderHolidayList() {
    DOM['holiday-list-container'].innerHTML = appState.holidays.map(h => `<div class="flex justify-between p-1 border-b"><span class="text-sm">${h.date} ${h.name}</span><button class="text-red-500 text-xs" onclick="delHoliday('${h.date}')">x</button></div>`).join('');
}

export function loadPersonnelToForm(p) {
    for (let k in p) { try { document.getElementById(`p-form-${k}`).value = p[k]; } catch (err) { } }
    document.getElementById('personnel-form-mode-indicator').value = 'edit';
    document.getElementById('personnel-editing-id-indicator').value = p.id;
    document.getElementById('personnel-modal-title').textContent = '인력 수정';
    document.getElementById('personnel-modal').classList.remove('hidden');
}

export function openDetailModal(id) {
    const p = appState.personnel.find(p => p.id === id);
    if (!p) return;
    currentDetailId = id;
    DOM['personnel-detail-modal'].dataset.id = id;
    document.getElementById('detail-name').textContent = p.name;
    document.getElementById('detail-team').textContent = p.team;
    document.getElementById('detail-dept').textContent = p.dept || '-';
    document.getElementById('detail-rank').textContent = p.rank || '-';
    document.getElementById('detail-role').textContent = p.role || '-';
    document.getElementById('detail-status').textContent = p.employmentStatus;
    document.getElementById('detail-joinDate').textContent = p.joinDate || '-';
    document.getElementById('detail-leaveDate').textContent = p.leaveDate || '-';
    const tbody = document.getElementById('detail-project-list');
    tbody.innerHTML = '';
    const history = appState.activities.filter(a => a.name === p.name).sort((a, b) => b.startDate.localeCompare(a.startDate));
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-gray-400">투입 이력이 없습니다.</td></tr>';
    } else {
        const today = formatDate(new Date());
        history.forEach(a => {
            let displayStatus = '예정';
            if (a.endDate < today) displayStatus = '완료';
            else if (a.startDate <= today && a.endDate >= today) displayStatus = '진행';
            const statusColor = displayStatus === '진행' ? 'text-blue-600 font-bold' : (displayStatus === '예정' ? 'text-yellow-600' : (displayStatus === '완료' ? 'text-green-600' : 'text-gray-600'));
            tbody.innerHTML += `<tr class="hover:bg-gray-50"><td class="px-4 py-2 font-medium">${a.projectName}</td><td class="px-4 py-2">${a.projectType}</td><td class="px-4 py-2 text-xs">${a.startDate} ~ ${a.endDate}</td><td class="px-4 py-2 ${statusColor}">${displayStatus}</td></tr>`;
        });
    }
    DOM['personnel-detail-modal'].classList.remove('hidden');
}

export function updateDeptSelectors() {
    const selectors = ['dashboard-dept-selector', 'weekly-dept-selector', 'personnel-dept-selector', 'activity-dept-selector', 'closing-dept-selector', 'waiting-dept-selector'];
    const isDisabled = !(appState.currentUserRole === 'admin' || appState.currentUserRole === 'viewer');
    selectors.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = isDisabled;
    });
}

export function enableColumnResizing() {
    document.querySelectorAll('th').forEach(th => {
        if (th.querySelector('.resizer')) return;
        const resizer = document.createElement('div');
        resizer.classList.add('resizer');
        th.appendChild(resizer);
        const mouseDownHandler = (e) => {
            const x = e.clientX;
            const w = parseInt(window.getComputedStyle(th).width, 10);
            resizer.classList.add('resizing');
            const mouseMoveHandler = (e) => {
                const dx = e.clientX - x;
                th.style.width = `${w + dx}px`;
                th.style.minWidth = `${w + dx}px`;
            };
            const mouseUpHandler = () => {
                resizer.classList.remove('resizing');
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        };
        resizer.addEventListener('mousedown', mouseDownHandler);
    });
}
