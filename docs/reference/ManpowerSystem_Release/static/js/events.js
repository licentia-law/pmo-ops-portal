// static/js/events.js
import { appState, DEPARTMENTS, DEFAULT_HOLIDAYS } from './state.js';
import { DOM, renderPersonnelTable, renderActivityTable, renderHolidayList, renderUserTable, updateDeptSelectors, loadPersonnelToForm, openDetailModal, showDashboardDetailModal, renderClosing, renderWeekly, renderWaiting, getClosingTargets, renderDashboard, renderAssignmentTable } from './ui.js';
import { loadAllData, savePersonnel, saveActivities, saveHolidays, saveUnconfirmedActivities, confirmActivities } from './api.js';
import { toStandard, downloadFile, canEdit, canView, formatDate, calculateManMonths, calculatePersonnelMM } from './utils.js';

async function loginSuccess(username, userData) {
    try {
        appState.currentUser = username;
        const userObj = (userData && userData.user) ? userData.user : userData;
        const role = (typeof userObj === 'object') ? (userObj.role || 'user') : userObj;
        appState.currentUserRole = role;

        document.getElementById('current-user-display').textContent = username;
        const badge = document.getElementById('current-user-role-badge');
        badge.textContent = role;
        badge.className = 'text-[10px] px-1.5 py-0.5 rounded border';
        if (role === 'admin') badge.classList.add('bg-purple-900', 'text-purple-100', 'border-purple-700');
        else if (role === 'viewer') badge.classList.add('bg-green-900', 'text-green-100', 'border-green-700');
        else badge.classList.add('bg-gray-700', 'text-gray-300', 'border-gray-600');

        await loadAllData();

        if (appState.users.length === 0 && username === 'admin') {
            appState.users.push({ username: 'admin', role: 'admin', managedDepts: [] });
        }

        const parseDepts = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(s => s);
            return [val];
        };

        let depts = [];
        if (typeof userObj === 'object' && userObj.managedDepts) depts = parseDepts(userObj.managedDepts);
        else {
            const me = appState.users.find(u => u.username === username);
            if (me) depts = parseDepts(me.managedDepts);
        }
        appState.currentUserDepts = depts;

        updateDeptSelectors();

        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('app-view').classList.remove('hidden');

        if (role === 'admin') {
            document.getElementById('menu-item-users').classList.remove('hidden');
            document.getElementById('btn-init-db').classList.remove('hidden');
        }

        DOM['dashboard-date-picker'].value = appState.dashboardDate;
        DOM['waiting-date-picker'].value = appState.waitingDatePickerDate;
        DOM['weekly-date-picker'].value = appState.weeklyDate;
        DOM['personnel-date-picker'].value = appState.personnelDate;
        DOM['activity-date-picker'].value = appState.activityDate;
        document.getElementById('closing-month-picker').value = appState.closingMonth;
        renderHolidayList();
        renderUserTable();
        showPage('dashboard');
    } catch (e) {
        console.error("Login Success Error:", e);
        alert("로그인 처리 중 오류가 발생했습니다: " + e.message);
    }
}

const onChartClick = (filterType) => (e, elements) => {
    if (!elements || !elements.length) return;
    const idx = elements[0].index;
    const m = idx + 1;
    const y = new Date(appState.dashboardDate).getFullYear();
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const names = new Set();

    const authorizedActivities = appState.activities.filter(a => canView(a.dept));
    authorizedActivities.forEach(a => {
        if ((a.manMonths[key]?.mm || 0) > 0) {
            if (filterType === 'filled' && a.projectType === '이행') names.add(a.name);
            else if (filterType === 'operating' && (a.projectType === '이행' || a.projectType === '제안')) names.add(a.name);
        }
    });

    if (names.size === 0) return alert("해당 월에 투입된 인원이 없습니다.");
    appState.dashboardNameFilter = Array.from(names);
    appState.activityStatusFilter = 'all';
    appState.activityDate = `${y}-${String(m).padStart(2, '0')}-01`;
    appState.selectedYear = y;
    DOM['activity-date-picker'].value = appState.activityDate;
    const buttons = Array.from(DOM['activity-status-filter-buttons'].children);
    buttons.forEach((b, i) => { b.classList.toggle('bg-blue-600', i === 0); b.classList.toggle('text-white', i === 0); b.classList.toggle('bg-white', i !== 0); b.classList.toggle('border', i !== 0); });

    appState.filters.activity = {};
    document.querySelectorAll('#table-head input').forEach(input => input.value = '');
    showPage('status');
};

function showPage(id) {
    ['dashboard', 'weekly', 'available', 'status', 'closing', 'waiting', 'assignment', 'users'].forEach(p => {
        if (DOM[`page-${p}`]) DOM[`page-${p}`].classList.add('hidden');
        if (DOM[`menu-${p}`]) DOM[`menu-${p}`].classList.remove('menu-link-active');
    });
    if (DOM[`page-${id}`]) DOM[`page-${id}`].classList.remove('hidden');
    if (DOM[`menu-${id}`]) DOM[`menu-${id}`].classList.add('menu-link-active');

    if (id === 'dashboard') renderDashboard(onChartClick);
    if (id === 'weekly') renderWeekly();
    if (id === 'available') renderPersonnelTable();
    if (id === 'status') renderActivityTable();
    if (id === 'closing') renderClosing();
    if (id === 'assignment') renderAssignmentTable();
    if (id === 'waiting') renderWaiting();
    if (id === 'users') renderUserTable();
}

export function setupEvents() {
    // --- Global Handlers (for HTML onclick) ---
    window.handleSortPersonnel = (key) => {
        const conf = appState.personnelSortConfig;
        conf.direction = conf.key === key ? (conf.direction === 'asc' ? 'desc' : 'asc') : 'asc';
        conf.key = key;
        renderPersonnelTable();
    };

    window.handleSortActivity = (key) => {
        const conf = appState.sortConfig;
        conf.direction = conf.key === key ? (conf.direction === 'asc' ? 'desc' : 'asc') : 'asc';
        conf.key = key;
        renderActivityTable();
    };

    window.handleSortWeekly = (key) => {
        const conf = appState.weeklySortConfig;
        conf.direction = conf.key === key ? (conf.direction === 'asc' ? 'desc' : 'asc') : 'asc';
        conf.key = key;
        renderWeekly();
    };

    window.handleSortWaiting = (key) => {
        const conf = appState.waitingSortConfig;
        conf.direction = conf.key === key ? (conf.direction === 'asc' ? 'desc' : 'asc') : 'asc';
        conf.key = key;
        renderWaiting();
    };

    window.handleSortClosing = (key) => {
        const conf = appState.closingSortConfig;
        conf.direction = conf.key === key ? (conf.direction === 'asc' ? 'desc' : 'asc') : 'asc';
        conf.key = key;
        renderClosing();
    };

    window.handleSortAssignment = (key) => {
        const conf = appState.assignmentSortConfig;
        conf.direction = conf.key === key ? (conf.direction === 'asc' ? 'desc' : 'asc') : 'asc';
        conf.key = key;
        renderAssignmentTable();
    };

    window.handleFilter = (type, key, value) => {
        appState.filters[type][key] = value.toLowerCase();
        if (type === 'personnel') renderPersonnelTable();
        if (type === 'activity') renderActivityTable();
    };

    window.delHoliday = async (date) => {
        appState.holidays = appState.holidays.filter(h => h.date !== date);
        await saveHolidays();
        renderHolidayList();
    };

    window.deleteUser = async (username) => {
        if (!confirm(`'${username}' 사용자를 삭제하시겠습니까?`)) return;
        const res = await fetch(`/api/users?username=${username}`, { method: 'DELETE' });
        if (res.ok) {
            appState.users = appState.users.filter(u => u.username !== username);
            renderUserTable();
        } else {
            alert(await res.text());
        }
    };

    window.openPwModal = (username) => {
        appState.targetUserForPw = username || appState.currentUser;
        document.getElementById('pw-change-target').textContent = `'${appState.targetUserForPw}' 계정의 비밀번호를 변경합니다.`;
        document.getElementById('input-new-pw').value = '';
        document.getElementById('pw-change-modal').classList.remove('hidden');
    };

    window.openUserEditModal = (username) => {
        const u = appState.users.find(user => user.username === username);
        if (!u) return;

        document.getElementById('edit-user-username').value = u.username;
        document.getElementById('edit-user-display-name').value = u.username;
        document.getElementById('edit-user-role').value = u.role;

        const container = document.getElementById('edit-user-dept-checkboxes');
        let currentDepts = [];
        if (u.managedDepts) {
            if (Array.isArray(u.managedDepts)) currentDepts = u.managedDepts;
            else if (typeof u.managedDepts === 'string') currentDepts = u.managedDepts.split(',').map(s => s.trim());
        }

        container.innerHTML = DEPARTMENTS.map(dept => {
            const isChecked = currentDepts.includes(dept);
            return `<label class="flex items-center gap-1 text-sm w-full"><input type="checkbox" name="editManagedDepts" value="${dept}" class="accent-blue-600" ${isChecked ? 'checked' : ''}> ${dept}</label>`;
        }).join('');

        const toggleDepts = () => {
            const isUser = document.getElementById('edit-user-role').value === 'user';
            container.style.opacity = isUser ? '1' : '0.5';
            container.style.pointerEvents = isUser ? 'auto' : 'none';
            if (!isUser) container.querySelectorAll('input').forEach(el => el.checked = false);
        };
        document.getElementById('edit-user-role').onchange = toggleDepts;
        toggleDepts();

        document.getElementById('user-edit-modal').classList.remove('hidden');
    };

    window.toggleClosing = (key, checked) => {
        appState.closingData[key] = checked;
        localStorage.setItem('closingData', JSON.stringify(appState.closingData));
        renderClosing();
    };

    window.filterDash = (groupKey, cat, type) => {
        if (arguments.length === 2) {
            // backward compatibility or default call for old style
            type = cat;
            cat = groupKey;
            groupKey = 'dept';
        }
        const date = new Date(appState.dashboardDate);
        const checkDateStr = formatDate(date);
        const resultList = [];

        const authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
        const authorizedActivities = appState.activities.filter(a => canView(a.dept));

        const pMap = new Map();
        authorizedPersonnel.forEach(p => {
            let groupVal;
            if (groupKey === 'dept') groupVal = p.dept || '미배정';
            else if (groupKey === 'role') groupVal = p.role || '미정';
            else if (groupKey === 'rank') groupVal = p.rank || '미정';

            if (cat !== 'All' && groupVal !== cat) return;

            const joinStr = toStandard(p.joinDate), leaveStr = toStandard(p.leaveDate), leaveStartStr = toStandard(p.leaveStartDate), leaveEndStr = toStandard(p.leaveEndDate), transferStr = toStandard(p.transferDate);

            let status = '재직';
            if (joinStr && checkDateStr < joinStr) status = '미입사';
            else if (leaveStr && checkDateStr > leaveStr) status = '퇴사';
            else if (transferStr && checkDateStr > transferStr) status = '전적';
            else if (p.employmentStatus === '퇴사' && !leaveStr) status = '퇴사';
            else {
                const isLeaveStatus = ['휴직', '출산휴가', '육아휴직'].includes(p.employmentStatus);
                const inLeavePeriod = (leaveStartStr && leaveEndStr && checkDateStr >= leaveStartStr && checkDateStr <= leaveEndStr);
                if (inLeavePeriod) status = '휴직';
                else if (isLeaveStatus && !leaveStartStr && !leaveEndStr) status = '휴직';
                else status = '재직';
            }

            if (status === '재직' || status === '휴직') {
                pMap.set(p.name, { p, status, hasActivity: false, matched: false, projects: [] });
                if (type === 'total') pMap.get(p.name).matched = true;
                if (type === 'leave' && status === '휴직') pMap.get(p.name).matched = true;
            }
        });

        authorizedActivities.forEach(a => {
            const p = pMap.get(a.name);
            if (p && p.status === '재직' && checkDateStr >= toStandard(a.startDate) && checkDateStr <= toStandard(a.endDate)) {
                p.hasActivity = true;
                p.projects.push(`[${a.projectType}] ${a.projectName}`);
                if (type === 'prop' && a.projectType === '제안') p.matched = true;
                if (type === 'exec' && a.projectType === '이행') p.matched = true;
                if (type === 'supp' && a.projectType === '지원') p.matched = true;
                if (type === 'task' && a.projectType === '과제') p.matched = true;
                if (type === 'wait' && a.projectType === '대기') p.matched = true;
            }
        });

        if (type === 'wait') {
            pMap.forEach((val) => {
                if (val.status === '재직' && !val.hasActivity) val.matched = true;
            });
        }

        pMap.forEach((val, name) => {
            if (val.matched) resultList.push({ team: val.p.team, name, status: val.status, projects: val.projects.length > 0 ? val.projects.join('<br>') : '-' });
        });

        showDashboardDetailModal(cat, type, resultList);
    };

    window.filterWeekly = (groupKey, cat, type) => {
        if (arguments.length === 2) {
            type = cat;
            cat = groupKey;
            groupKey = 'dept';
        }
        const targetDateStr = appState.weeklyDate;
        const tDate = new Date(targetDateStr);
        tDate.setDate(tDate.getDate() - 7);
        const prevWeekStr = formatDate(tDate);
        const list = [];

        const authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
        const authorizedActivities = appState.activities.filter(a => canView(a.dept));

        const personnelMap = new Map();
        authorizedPersonnel.forEach(p => {
            const currentWeeklyDept = document.getElementById('weekly-dept-selector')?.value || 'All';
            const pDept = p.dept || "미배정";
            if (currentWeeklyDept !== 'All' && pDept !== currentWeeklyDept) return;
            if (currentWeeklyDept === 'All' && pDept === 'ENTEC담당') return;

            let groupVal;
            if (groupKey === 'dept') groupVal = p.dept || '미배정';
            else if (groupKey === 'role') groupVal = p.role || '미정';
            else if (groupKey === 'rank') groupVal = p.rank || '미정';

            if (cat !== 'All' && groupVal !== cat) return;

            const joinStr = toStandard(p.joinDate), leaveStr = toStandard(p.leaveDate), transferStr = toStandard(p.transferDate), leaveStart = toStandard(p.leaveStartDate), leaveEndStr = toStandard(p.leaveEndDate);

            let isPrevActive = !((joinStr && joinStr > prevWeekStr) || (leaveStr && leaveStr < prevWeekStr) || (transferStr && transferStr < prevWeekStr) || (p.employmentStatus === '퇴사' && !leaveStr));
            let isEmployed = !((joinStr && joinStr > targetDateStr) || (leaveStr && leaveStr < targetDateStr) || (transferStr && transferStr < targetDateStr) || (p.employmentStatus === '퇴사' && !leaveStr));

            let status = '재직';
            if (joinStr && targetDateStr < joinStr) status = '미입사';
            else if (leaveStr && targetDateStr > leaveStr) status = '퇴사';
            else if (transferStr && targetDateStr > transferStr) status = '전적';
            else if (p.employmentStatus === '퇴사' && !leaveStr) status = '퇴사';
            else {
                const isLeaveStatus = ['휴직', '출산휴가', '육아휴직'].includes(p.employmentStatus);
                const isLeave = (leaveStart && leaveEndStr && targetDateStr >= leaveStart && targetDateStr <= leaveEndStr);
                if (isLeave) status = '휴직';
                else if (isLeaveStatus && !leaveStart && !leaveEndStr) status = '휴직';
                else status = '재직';
            }

            if (status === '재직' || status === '휴직') {
                personnelMap.set(p.name, { p, status, isEmployed, isLeave: status === '휴직', hasActivity: false, matched: false, projectInfo: '-', pType: '대기' });
            }
        });

        authorizedActivities.forEach(a => {
            const person = personnelMap.get(a.name);
            if (person && person.status === '재직' && targetDateStr >= toStandard(a.startDate) && targetDateStr <= toStandard(a.endDate)) {
                person.hasActivity = true;
                person.pType = a.projectType;
                person.projectInfo = `[${a.projectType}] ${a.projectName}`;
            }
        });

        // 대기인력 - 예정 프로젝트 찾기
        personnelMap.forEach((person, name) => {
            if (person.status === '재직' && !person.hasActivity) {
                const upcomingActivity = authorizedActivities.find(a =>
                    a.name === name &&
                    toStandard(a.startDate) > targetDateStr &&
                    person.p.employmentStatus !== '퇴사'
                );
                if (upcomingActivity) {
                    person.projectInfo = `[예정] ${upcomingActivity.projectName}`;
                }
            }
        });

        personnelMap.forEach((person, name) => {
            let matched = false;

            if (type === 'prev' && person.isEmployed) matched = true;
            else if (type === 'current' && person.isEmployed) matched = true;
            else if (type === 'leave' && person.isLeave) matched = true;
            else if ((type === 'opTotal' || type === 'opRate') && (person.pType === '이행' || person.pType === '제안')) matched = true;
            else if ((type === 'exec' || type === 'fillRate') && person.pType === '이행') matched = true;
            else if (type === 'prop' && person.pType === '제안') matched = true;
            else if (type === 'nonOpTotal' && (person.pType === '대기' || person.pType === '지원')) matched = true;
            else if (type === 'supp' && person.pType === '지원') matched = true;
            else if (type === 'task' && person.pType === '과제') matched = true;
            else if (type === 'wait' && person.pType === '대기') matched = true;

            if (matched && person.status !== '휴직') {
                list.push({ team: person.p.team, name: name, status: person.status, projects: person.projectInfo });
            }
        });
        showDashboardDetailModal(cat, type, list);
    };

    window.showKpiDetail = (type, filterDept = null, customDate = null, groupKey = 'dept', cat = null) => {
        const targetDept = filterDept || appState.dashboardDept;
        const date = customDate ? new Date(customDate) : new Date(appState.dashboardDate);
        const year = date.getFullYear();
        const targetMonthIdx = date.getMonth();
        const targetDay = date.getDate();

        const authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
        const authorizedActivities = appState.activities.filter(a => canView(a.dept));

        const stats = {};
        authorizedPersonnel.forEach(p => {
            if (cat && cat !== 'All') {
                let groupVal;
                if (groupKey === 'dept') groupVal = p.dept || '미배정';
                else if (groupKey === 'role') groupVal = p.role || '미정';
                else if (groupKey === 'rank') groupVal = p.rank || '미정';
                if (groupVal !== cat) return;
            } else if (targetDept && (!cat || cat === 'All')) {
                const pDept = p.dept || "미배정";
                if (targetDept !== 'All' && pDept !== targetDept) return;
                if (targetDept === 'All' && pDept === 'ENTEC담당') return;
            }

            stats[p.name] = { team: p.team, cap: 0, task: 0, filled: 0, operating: 0 };
            const mm = calculatePersonnelMM(p, year);
            for (let m = 0; m < targetMonthIdx; m++) {
                stats[p.name].cap += (mm[`${year}-${String(m + 1).padStart(2, '0')}`] || 0);
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
                    if ((joinStr && dateStr < joinStr) || (leaveStr && dateStr > leaveStr) || (transferStr && dateStr > transferStr) || (leaveStartStr && leaveEndStr && dateStr >= leaveStartStr && dateStr <= leaveEndStr) || (p.employmentStatus === '퇴사' && !leaveStr)) isOk = false;
                    if (isOk) avail++;
                }
                stats[p.name].cap += (avail / totalWorkingDays);
            }
        });

        authorizedActivities.forEach(a => {
            if (!stats[a.name]) return;
            const p = authorizedPersonnel.find(p => p.name === a.name);
            const transferStr = p ? toStandard(p.transferDate) : "", leaveStr = p ? toStandard(p.leaveDate) : "";
            let currentYearMM = 0;
            for (let m = 0; m < targetMonthIdx; m++) {
                let val = (a.manMonths[`${year}-${String(m + 1).padStart(2, '0')}`]?.mm || 0);
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
            if (a.projectType === '과제') stats[a.name].task += currentYearMM;
            else if (a.projectType === '이행' || a.projectType === '제안') stats[a.name].operating += currentYearMM;
            if (a.projectType === '이행') stats[a.name].filled += currentYearMM;
        });

        const tbody = document.getElementById('kpi-detail-tbody');
        tbody.innerHTML = '';
        let title = type === 'filled' ? '누적 가득율 상세 (이행)' : '누적 가동율 상세 (이행+제안)';
        
        let targetGroupStr;
        if (cat) targetGroupStr = cat === 'All' ? '전체' : cat;
        else targetGroupStr = targetDept === 'All' ? '전체' : targetDept;
        
        if (targetGroupStr) title += ` [${targetGroupStr}]`;
        document.getElementById('kpi-detail-title').textContent = title;
        document.getElementById('kpi-detail-col-target').textContent = type === 'filled' ? '이행MM' : '가동MM';

        const list = Object.entries(stats).map(([name, s]) => {
            const netCap = Math.max(0, s.cap - s.task);
            const targetMM = type === 'filled' ? s.filled : s.operating;
            const rate = netCap > 0 ? (targetMM / netCap) * 100 : 0;
            return { name, ...s, netCap, targetMM, rate };
        }).filter(item => item.netCap > 0 || item.targetMM > 0);

        list.sort((a, b) => b.rate - a.rate || b.targetMM - a.targetMM);

        list.forEach((item, i) => {
            tbody.innerHTML += `<tr class="hover:bg-gray-50 border-b"><td class="py-2 px-2">${i + 1}</td><td class="py-2 px-2">${item.team}</td><td class="py-2 px-2 font-bold text-gray-800">${item.name}</td><td class="py-2 px-2 text-gray-500">${item.cap.toFixed(2)}</td><td class="py-2 px-2 text-red-400">${item.task > 0 ? '-' + item.task.toFixed(2) : ''}</td><td class="py-2 px-2 font-semibold bg-gray-50">${item.netCap.toFixed(2)}</td><td class="py-2 px-2 font-bold text-blue-700">${item.targetMM.toFixed(2)}</td><td class="py-2 px-2 text-sm">${item.rate.toFixed(1)}%</td></tr>`;
        });

        DOM['kpi-detail-modal'].classList.remove('hidden');
    };

    // --- DOM Event Listeners ---

    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const errorMsg = document.getElementById('login-error');
        errorMsg.classList.add('hidden');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                loginSuccess(data.username, await res.json());
            } else {
                const serverMessage = await res.text();
                errorMsg.textContent = serverMessage || "아이디 또는 비밀번호가 올바르지 않습니다.";
                errorMsg.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Login request failed:", err);
            errorMsg.textContent = "로그인 요청에 실패했습니다. 서버가 실행 중인지 확인해주세요.";
            errorMsg.classList.remove('hidden');
        }
    };

    if (DOM['dashboard-group-selector']) {
        DOM['dashboard-group-selector'].onchange = () => renderDashboard(onChartClick);
    }
    if (DOM['weekly-group-selector']) {
        DOM['weekly-group-selector'].onchange = renderWeekly;
    }

    ['dashboard', 'weekly', 'available', 'status', 'closing', 'waiting', 'assignment', 'users'].forEach(id => {
        DOM[`menu-${id}`].onclick = (e) => {
            e.preventDefault();
            if (id === 'status') {
                appState.dashboardNameFilter = [];
                appState.filters.activity = {};
                document.querySelectorAll('#table-head input').forEach(input => input.value = '');
            }
            showPage(id);
        };
    });

    document.getElementById('sidebar-title').onclick = () => showPage('dashboard');
    document.getElementById('btn-toggle-sidebar').onclick = () => {
        const sb = document.getElementById('sidebar');
        const isCollapsed = sb.classList.contains('w-64');
        if (isCollapsed) {
            sb.classList.replace('w-64', 'w-20');
            document.getElementById('icon-collapse').classList.add('hidden');
            document.getElementById('icon-expand').classList.remove('hidden');
            document.querySelectorAll('.sidebar-text').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.menu-link').forEach(l => l.classList.add('justify-center'));
            document.querySelectorAll('.submenu-link').forEach(l => l.classList.remove('pl-12'));
            document.getElementById('sidebar-title').textContent = 'HR';
        } else {
            sb.classList.replace('w-20', 'w-64');
            document.getElementById('icon-collapse').classList.remove('hidden');
            document.getElementById('icon-expand').classList.add('hidden');
            document.querySelectorAll('.sidebar-text').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.menu-link').forEach(l => l.classList.remove('justify-center'));
            document.querySelectorAll('.submenu-link').forEach(l => l.classList.add('pl-12'));
            document.getElementById('sidebar-title').textContent = '이행인력관리';
        }
    };

    document.getElementById('btn-logout').onclick = async () => {
        try { await fetch('/api/logout', { method: 'POST' }); } catch (e) { }
        location.reload();
    };
    document.getElementById('btn-init-db').onclick = async () => {
        if (confirm("경고: 모든 인력 및 Activity 데이터가 영구적으로 삭제됩니다.\n정말로 초기화하시겠습니까?")) {
            if (confirm("다시 한 번 확인합니다. 이 작업은 되돌릴 수 없습니다.")) {
                appState.personnel = [];
                appState.activities = [];
                await Promise.all([savePersonnel(), saveActivities()]);
                alert("시스템이 초기화되었습니다.");
                location.reload();
            }
        }
    };
    DOM['btn-change-pw'].onclick = () => window.openPwModal(appState.currentUser);

    document.getElementById('btn-open-personnel-modal').onclick = () => {
        document.getElementById('add-personnel-form').reset();
        document.getElementById('personnel-form-mode-indicator').value = 'add';
        document.getElementById('personnel-editing-id-indicator').value = '';
        document.getElementById('personnel-modal-title').textContent = '인력 등록';
        document.getElementById('personnel-modal').classList.remove('hidden');
    };
    document.getElementById('btn-close-personnel-modal').onclick = () => document.getElementById('personnel-modal').classList.add('hidden');
    document.getElementById('p-btn-reset-form').onclick = () => {
        document.getElementById('add-personnel-form').reset();
        document.getElementById('personnel-form-mode-indicator').value = 'add';
        document.getElementById('personnel-editing-id-indicator').value = '';
    };
    const autoUpdateLeaveStatus = () => {
        const s = document.getElementById('p-form-leaveStartDate').value;
        const e = document.getElementById('p-form-leaveEndDate').value;
        const statusEl = document.getElementById('p-form-employmentStatus');
        if (s && e && statusEl.value === '재직') {
            statusEl.value = '휴직';
        }
    };
    document.getElementById('p-form-leaveStartDate').onchange = autoUpdateLeaveStatus;
    document.getElementById('p-form-leaveEndDate').onchange = autoUpdateLeaveStatus;
    document.getElementById('add-personnel-form').onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const obj = Object.fromEntries(f.entries());

        if (!obj.dept) return alert("부서를 선택해주세요.");
        if (!canEdit(obj.dept)) return alert("해당 부서에 대한 관리 권한이 없습니다.");

        const mode = document.getElementById('personnel-form-mode-indicator').value;
        let oldName = obj.name;
        let targetId = null;
        if (mode === 'edit') {
            targetId = parseInt(document.getElementById('personnel-editing-id-indicator').value);
            const oldP = appState.personnel.find(p => p.id === targetId);
            if (oldP) oldName = oldP.name;
        }

        let actUpdated = false;
        const hasRelatedActivity = appState.activities.some(a => a.name === oldName);

        if (mode === 'edit' && obj.name !== oldName && hasRelatedActivity) {
            if (confirm(`'${oldName}' 님의 이름을 '${obj.name}'으로 변경합니다.\n기존에 등록된 모든 Activity의 이름도 함께 변경하시겠습니까?`)) {
                appState.activities.forEach(a => {
                    if (a.name === oldName) {
                        a.name = obj.name;
                        actUpdated = true;
                    }
                });
            }
        }

        if (mode === 'add') {
            obj.id = Date.now(); appState.personnel.push(obj);
        } else {
            appState.personnel = appState.personnel.map(p => p.id === targetId ? { ...p, ...obj } : p);
        }

        await savePersonnel();
        if (actUpdated) { await saveActivities(); renderActivityTable(); }
        renderPersonnelTable();
        e.target.reset();
        document.getElementById('personnel-modal').classList.add('hidden');
        document.getElementById('personnel-editing-id-indicator').value = '';
    };

    document.getElementById('p-btn-delete-selected').onclick = async () => {
        const checkboxes = document.querySelectorAll('.p-check-item:checked');
        if (checkboxes.length === 0) return alert("삭제할 인원을 선택해주세요.");

        const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
        const personnelToDelete = appState.personnel.filter(p => selectedIds.includes(p.id));

        if (personnelToDelete.length === 0) return;

        const names = personnelToDelete.map(p => p.name).join(', ');
        if (!confirm(`다음 인원을 삭제하시겠습니까?\n${names}\n\n연관된 모든 Activity 도 함께 삭제됩니다.`)) return;

        personnelToDelete.forEach(p => {
            appState.personnel = appState.personnel.filter(item => item.id !== p.id);
            appState.activities = appState.activities.filter(a => a.name !== p.name);
        });

        await Promise.all([savePersonnel(), saveActivities()]);
        renderPersonnelTable();
        alert(`${checkboxes.length}명이 삭제되었습니다.`);
    };

    const masterCheckbox = document.getElementById('p-check-all');
    if (masterCheckbox) {
        masterCheckbox.onchange = (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('.p-check-item:not(:disabled)').forEach(cb => cb.checked = checked);
        };
    }

    DOM['personnel-table-body'].onclick = async (e) => {
        const tr = e.target.closest('tr'); if (!tr) return;
        const id = parseInt(tr.dataset.id);
        if (e.target.classList.contains('btn-delete-p')) {
            const p = appState.personnel.find(p => p.id === id);
            if (!canEdit(p.dept)) return alert("삭제 권한이 없습니다.");
            if (confirm(`'${p.name}' 님을 삭제하시겠습니까? 연관된 모든 Activity도 함께 삭제됩니다.`)) {
                appState.personnel = appState.personnel.filter(p => p.id !== id);
                appState.activities = appState.activities.filter(a => a.name !== p.name);
                await Promise.all([savePersonnel(), saveActivities()]);
                renderPersonnelTable();
                renderActivityTable();
            }
        } else if (e.target.classList.contains('btn-show-detail')) {
            openDetailModal(id);
        }
    };
    DOM['waiting-table-body'].onclick = (e) => {
        const tr = e.target.closest('tr'); if (!tr) return;
        const id = parseInt(tr.dataset.id);
        if (e.target.classList.contains('btn-show-detail')) {
            openDetailModal(id);
        }
    };

    const closeDetailModal = () => DOM['personnel-detail-modal'].classList.add('hidden');
    document.getElementById('btn-close-detail-modal').onclick = closeDetailModal;
    document.getElementById('btn-close-detail-modal-bottom').onclick = closeDetailModal;
    document.getElementById('btn-edit-from-detail').onclick = () => {
        const p = appState.personnel.find(p => p.id === parseInt(DOM['personnel-detail-modal'].dataset.id));
        if (!p) return;
        if (!canEdit(p.dept)) return alert("수정 권한이 없습니다.");
        closeDetailModal();
        loadPersonnelToForm(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    document.getElementById('btn-open-activity-modal').onclick = () => {
        document.getElementById('add-activity-form').reset();
        document.getElementById('form-mode-indicator').value = 'add';
        document.getElementById('editing-id-indicator').value = '';
        document.getElementById('activity-modal-title').textContent = 'Activity 등록';
        document.getElementById('activity-modal').classList.remove('hidden');
    };
    document.getElementById('btn-close-activity-modal').onclick = () => document.getElementById('activity-modal').classList.add('hidden');
    document.getElementById('btn-reset-form').onclick = () => {
        document.getElementById('add-activity-form').reset();
        document.getElementById('form-mode-indicator').value = 'add';
        document.getElementById('editing-id-indicator').value = '';
    };
    document.getElementById('form-name').addEventListener('change', (e) => {
        const name = e.target.value.trim();
        if (!name) return;
        const p = appState.personnel.find(p => p.name === name);
        if (p) {
            if (p.team) document.getElementById('form-team').value = p.team;
            if (p.dept) document.getElementById('form-dept').value = p.dept;
            if (p.role) document.getElementById('form-role').value = p.role;
            if (p.rank) document.getElementById('form-rank').value = p.rank;
        }
    });
    document.getElementById('add-activity-form').onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const obj = Object.fromEntries(f.entries());
        const mode = document.getElementById('form-mode-indicator').value;

        if (mode.includes('unconfirmed')) {
            let targetId;
            if (mode === 'add-unconfirmed') {
                obj.id = Date.now();
                appState.unconfirmedActivities.push(obj);
            } else { // 'edit-unconfirmed'
                targetId = parseInt(document.getElementById('editing-id-indicator').value);
                appState.unconfirmedActivities = appState.unconfirmedActivities.map(a => a.id === targetId ? { ...a, ...obj, id: targetId } : a);
            }
            await saveUnconfirmedActivities();
            renderAssignmentTable();
        } else {
            if (!obj.dept) return alert("부서를 선택해주세요.");
            if (!canEdit(obj.dept)) return alert("해당 부서에 대한 관리 권한이 없습니다.");

            let targetId;
            if (mode === 'add') {
                targetId = Date.now();
                obj.id = targetId;
                appState.activities.push(obj);
            } else {
                targetId = parseInt(document.getElementById('editing-id-indicator').value);
                appState.activities = appState.activities.map(a => a.id === targetId ? { ...a, ...obj } : a);
            }

            const p = appState.personnel.find(p => p.name === obj.name);
            if (p && (p.team !== obj.team || p.dept !== obj.dept || p.role !== obj.role || p.rank !== obj.rank)) {
                if (confirm(`입력하신 정보로 '${obj.name}' 님의 원본 인력 정보 및 다른 Activity들도 일괄 업데이트하시겠습니까?`)) {
                    appState.personnel = appState.personnel.map(p => {
                        if (p.name === obj.name) return { ...p, team: obj.team, dept: obj.dept, role: obj.role, rank: obj.rank };
                        return p;
                    });
                    appState.activities = appState.activities.map(a => {
                        if (a.name === obj.name) return { ...a, team: obj.team, dept: obj.dept, role: obj.role, rank: obj.rank };
                        return a;
                    });
                    await savePersonnel();
                }
            }

            const idx = appState.activities.findIndex(a => a.id === targetId);
            if (idx >= 0) {
                appState.activities[idx].manMonths = calculateManMonths(obj.startDate, obj.endDate);
                appState.activities[idx].totalManMonth = Object.values(appState.activities[idx].manMonths).reduce((s, v) => s + v.mm, 0);
            }
            await saveActivities();
            renderActivityTable();
            renderPersonnelTable();
        }

        e.target.reset();
        document.getElementById('activity-modal').classList.add('hidden');
        document.getElementById('form-mode-indicator').value = 'add';
        document.getElementById('editing-id-indicator').value = '';
    };

    DOM['activity-table-body'].onclick = async (e) => {
        const tr = e.target.closest('tr'); if (!tr) return;
        const id = parseInt(tr.dataset.id);
        if (e.target.classList.contains('btn-delete-a')) {
            const a = appState.activities.find(a => a.id === id);
            if (!canEdit(a.dept)) return alert("삭제 권한이 없습니다.");
            if (confirm('삭제합니까?')) { appState.activities = appState.activities.filter(a => a.id !== id); await saveActivities(); renderActivityTable(); }
        } else if (e.target.classList.contains('btn-load-for-edit')) {
            const a = appState.activities.find(a => a.id === id);
            if (!canEdit(a.dept)) return alert("수정 권한이 없습니다.");
            for (let k in a) { try { document.getElementById(`form-${k}`).value = a[k]; } catch (err) { } }
            document.getElementById('form-mode-indicator').value = 'edit';
            document.getElementById('editing-id-indicator').value = id;
            document.getElementById('activity-modal-title').textContent = 'Activity 수정';
            document.getElementById('activity-modal').classList.remove('hidden');
        }
    };

    document.getElementById('btn-open-unconfirmed-activity-modal').onclick = () => {
        document.getElementById('add-activity-form').reset();
        document.getElementById('form-mode-indicator').value = 'add-unconfirmed';
        document.getElementById('editing-id-indicator').value = '';
        document.getElementById('activity-modal-title').textContent = '미확정 Activity 등록';
        document.getElementById('activity-modal').classList.remove('hidden');
    };

    document.getElementById('btn-confirm-activities').onclick = async () => {
        const checkedItems = document.querySelectorAll('.assign-check-item:checked');
        if (checkedItems.length === 0) {
            return alert('확정할 항목을 선택해주세요.');
        }

        const itemsToConfirm = [];
        const conflictingItems = [];

        // 1. 충돌 검사: 선택된 각 미확정 Activity에 대해 기존 Activity와 기간이 겹치는지 확인
        Array.from(checkedItems).forEach(checkbox => {
            const id = parseInt(checkbox.value);
            const unconfirmedItem = appState.unconfirmedActivities.find(a => a.id === id);
            if (!unconfirmedItem) return;

            // 동일 인원의 기존 Activity 중 기간이 겹치는(overlap) 것이 있는지 확인
            // (new.startDate <= old.endDate) and (new.endDate >= old.startDate)
            const hasConflict = appState.activities.some(existingActivity =>
                existingActivity.name === unconfirmedItem.name &&
                unconfirmedItem.startDate <= existingActivity.endDate &&
                unconfirmedItem.endDate >= existingActivity.startDate
            );

            if (hasConflict) {
                conflictingItems.push(unconfirmedItem);
            } else {
                itemsToConfirm.push(unconfirmedItem);
            }
        });

        // 2. 사용자에게 확인 및 처리
        let wasConfirmed = false;
        if (itemsToConfirm.length > 0) {
            const confirmMessage = conflictingItems.length > 0
                ? `${itemsToConfirm.length}개의 항목은 즉시 확정 가능합니다.\n${conflictingItems.length}개의 항목은 기존 일정과 충돌하여 확정할 수 없습니다.\n\n충돌하지 않는 항목만 확정하시겠습니까?`
                : `${itemsToConfirm.length}개의 항목을 확정하여 인력운영현황에 등록하시겠습니까?`;

            if (confirm(confirmMessage)) {
                const idsToConfirm = itemsToConfirm.map(item => item.id);
                try {
                    await confirmActivities(idsToConfirm);
                    wasConfirmed = true;
                } catch (error) {
                    console.error('Confirmation failed:', error);
                    alert(`확정 처리 중 오류가 발생했습니다: ${error.message}`);
                    return;
                }
            }
        }

        // 3. 최종 결과 알림 및 UI 갱신
        let alertMessage = wasConfirmed ? `${itemsToConfirm.length}개의 항목이 성공적으로 확정되었습니다.` : '';
        if (conflictingItems.length > 0) {
            const conflictDetails = conflictingItems.map(item => ` - ${item.name}: ${item.projectName} (${item.startDate} ~ ${item.endDate})`).join('\n');
            alertMessage += `\n\n아래 ${conflictingItems.length}개 항목은 기존 인력운영현황의 일정과 중복되어 확정되지 않았습니다. 일정을 조정한 후 다시 시도해주세요.\n${conflictDetails}`;
        }
        if (alertMessage.trim()) alert(alertMessage.trim());

        if (wasConfirmed) {
            await loadAllData();
            renderAssignmentTable();
            renderActivityTable();
        }
    };

    document.getElementById('assign-check-all').onchange = (e) => {
        document.querySelectorAll('.assign-check-item').forEach(cb => {
            cb.checked = e.target.checked;
        });
    };

    document.getElementById('assignment-table-body').onclick = async (e) => {
        const tr = e.target.closest('tr'); if (!tr) return;
        const id = parseInt(tr.dataset.id);
        const a = appState.unconfirmedActivities.find(a => a.id === id);
        if (!a) return;

        if (e.target.closest('.btn-delete-unconfirmed-a')) {
            if (confirm(`'${a.name}'의 미확정 프로젝트 '${a.projectName}'를 삭제하시겠습니까?`)) {
                appState.unconfirmedActivities = appState.unconfirmedActivities.filter(act => act.id !== id);
                await saveUnconfirmedActivities();
                renderAssignmentTable();
            }
        } else if (e.target.closest('.btn-load-unconfirmed-for-edit')) {
            for (let k in a) { try { document.getElementById(`form-${k}`).value = a[k]; } catch (err) { } }
            document.getElementById('form-mode-indicator').value = 'edit-unconfirmed';
            document.getElementById('editing-id-indicator').value = id;
            document.getElementById('activity-modal-title').textContent = '미확정 Activity 수정';
            document.getElementById('activity-modal').classList.remove('hidden');
        }
    };

    DOM['dashboard-date-picker'].onchange = (e) => { appState.dashboardDate = e.target.value; showPage('dashboard'); };
    DOM['dashboard-dept-selector'].onchange = (e) => { appState.dashboardDept = e.target.value; showPage('dashboard'); };
    DOM['waiting-date-picker'].onchange = (e) => { appState.waitingDatePickerDate = e.target.value; renderWaiting(); };
    DOM['waiting-dept-selector'].onchange = (e) => { appState.waitingDept = e.target.value; renderWaiting(); };
    DOM['weekly-dept-selector'].onchange = (e) => { appState.weeklyDept = e.target.value; renderWeekly(); };
    DOM['weekly-date-picker'].onchange = (e) => { appState.weeklyDate = e.target.value; renderWeekly(); };
    DOM['personnel-dept-selector'].onchange = (e) => { appState.personnelDept = e.target.value; renderPersonnelTable(); };
    DOM['activity-dept-selector'].onchange = (e) => { appState.activityDept = e.target.value; renderActivityTable(); };
    document.getElementById('closing-month-picker').onchange = (e) => { appState.closingMonth = e.target.value; renderClosing(); };
    document.getElementById('closing-dept-selector').onchange = (e) => { appState.closingDept = e.target.value; renderClosing(); };
    DOM['personnel-date-picker'].onchange = (e) => {
        appState.personnelDate = e.target.value;
        appState.personnelSelectedYear = parseInt(e.target.value.substring(0, 4));
        renderPersonnelTable();
    };
    DOM['p-show-resigned'].onchange = (e) => { appState.showResigned = e.target.checked; renderPersonnelTable(); };
    DOM['p-show-monthly'].onchange = (e) => { appState.showPersonnelMonthly = e.target.checked; renderPersonnelTable(); };
    DOM['a-show-resigned'].onchange = (e) => { appState.showActivityResigned = e.target.checked; renderActivityTable(); };
    DOM['a-show-monthly'].onchange = (e) => { appState.showActivityMonthly = e.target.checked; renderActivityTable(); };
    if (DOM['a-show-waiting']) {
        DOM['a-show-waiting'].onchange = (e) => { appState.showActivityWaiting = e.target.checked; renderActivityTable(); };
    }
    DOM['activity-date-picker'].onchange = (e) => {
        appState.activityDate = e.target.value;
        appState.selectedYear = parseInt(e.target.value.substring(0, 4));
        renderActivityTable();
    };
    DOM['activity-status-filter-buttons'].onclick = (e) => {
        if (e.target.tagName === 'BUTTON') {
            appState.activityStatusFilter = e.target.dataset.status;
            Array.from(DOM['activity-status-filter-buttons'].children).forEach(b => {
                b.classList.toggle('bg-blue-600', b === e.target);
                b.classList.toggle('text-white', b === e.target);
                b.classList.toggle('bg-white', b !== e.target);
                b.classList.toggle('border', b !== e.target);
            });
            renderActivityTable();
        }
    };

    document.getElementById('btn-manage-holidays').onclick = () => DOM['holiday-modal'].classList.remove('hidden');
    document.getElementById('btn-close-holiday-modal').onclick = () => DOM['holiday-modal'].classList.add('hidden');
    document.getElementById('form-add-holiday').onsubmit = async (e) => {
        e.preventDefault();
        const d = document.getElementById('input-holiday-date').value;
        const n = document.getElementById('input-holiday-name').value;
        appState.holidays.push({ date: d, name: n });
        await saveHolidays();
        renderHolidayList(); e.target.reset();
    };
    document.getElementById('btn-reset-holidays').onclick = async () => {
        if (!confirm('공휴일 데이터를 기본값으로 초기화하시겠습니까?')) return;
        appState.holidays = [...DEFAULT_HOLIDAYS];
        appState.holidaySet = new Set(appState.holidays.map(h => h.date));
        await saveHolidays();
        renderHolidayList();
        alert("초기화되었습니다. 페이지를 새로고침합니다.");
        location.reload();
    };

    const deptContainer = document.getElementById('user-dept-checkboxes');
    if (deptContainer) {
        deptContainer.innerHTML = DEPARTMENTS.map(dept => `<label class="flex items-center gap-1 text-sm"><input type="checkbox" name="managedDepts" value="${dept}" class="accent-blue-600"> ${dept}</label>`).join('');
    }
    document.getElementById('form-add-user').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const checkboxes = e.target.querySelectorAll('input[name="managedDepts"]:checked');
        data.managedDepts = Array.from(checkboxes).map(cb => cb.value);

        const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) {
            alert('사용자가 추가되었습니다.');
            e.target.reset();
            const resU = await fetch('/api/users');
            appState.users = await resU.json();
            renderUserTable();
        } else {
            alert(await res.text());
        }
    };
    const formAddUser = document.getElementById('form-add-user');
    if (formAddUser) {
        const roleSelect = formAddUser.querySelector('select[name="role"]');
        const deptContainer = document.getElementById('user-dept-checkboxes');
        const toggleAddDepts = () => {
            const isUser = roleSelect.value === 'user';
            deptContainer.style.opacity = isUser ? '1' : '0.5';
            deptContainer.style.pointerEvents = isUser ? 'auto' : 'none';
            if (!isUser) deptContainer.querySelectorAll('input').forEach(el => el.checked = false);
        };
        roleSelect.onchange = toggleAddDepts;
    }

    document.getElementById('btn-close-pw-modal').onclick = () => document.getElementById('pw-change-modal').classList.add('hidden');
    document.getElementById('btn-submit-pw-change').onclick = async () => {
        const newPw = document.getElementById('input-new-pw').value;
        if (!newPw) return alert("새 비밀번호를 입력하세요.");

        const res = await fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: appState.targetUserForPw, password: newPw })
        });
        if (res.ok) { alert("비밀번호가 변경되었습니다."); document.getElementById('pw-change-modal').classList.add('hidden'); }
        else { alert(await res.text()); }
    };

    document.getElementById('btn-close-user-edit').onclick = () => document.getElementById('user-edit-modal').classList.add('hidden');
    document.getElementById('btn-save-user-edit').onclick = async () => {
        const username = document.getElementById('edit-user-username').value;
        const role = document.getElementById('edit-user-role').value;

        if (!username) return alert("사용자 정보를 찾을 수 없습니다.");

        let managedDepts = [];
        if (role === 'user') {
            const checkboxes = document.querySelectorAll('#edit-user-dept-checkboxes input:checked');
            managedDepts = Array.from(checkboxes).map(cb => cb.value);
        }

        const res = await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, role, managedDepts }) });
        if (res.ok) {
            alert('사용자 정보가 수정되었습니다.');
            document.getElementById('user-edit-modal').classList.add('hidden');
            const resU = await fetch('/api/users');
            appState.users = await resU.json();
            renderUserTable();
        } else {
            alert(await res.text());
        }
    };

    document.getElementById('btn-close-kpi-detail').onclick = () => DOM['kpi-detail-modal'].classList.add('hidden');
    const closeDashDetail = () => document.getElementById('dashboard-detail-modal').classList.add('hidden');
    document.getElementById('btn-close-dashboard-detail').onclick = closeDashDetail;
    document.getElementById('btn-close-dashboard-detail-bottom').onclick = closeDashDetail;

    document.getElementById('p-btn-download-csv').onclick = () => {
        const list = appState.personnel.filter(p => canView(p.dept));
        if (!list.length) return alert("다운로드할 데이터가 없습니다.");

        const year = appState.personnelSelectedYear;
        let csvContent = "\uFEFF";
        let header = ["No", "법인", "부서", "직무", "성명", "직급", "상태", "입사일", "퇴사일", "전적일", "휴직시작일", "휴직종료일", "연간합계", ...Array.from({ length: 12 }, (_, i) => `${i + 1}월`)];
        csvContent += header.join(",") + "\n";

        list.forEach((p, i) => {
            const mm = calculatePersonnelMM(p, year);
            let displayStatus = p.employmentStatus;
            const today = formatDate(new Date());
            if (displayStatus === '재직' && p.leaveStartDate && p.leaveEndDate && today >= p.leaveStartDate && today <= p.leaveEndDate) {
                displayStatus = '휴직';
            }
            let row = [i + 1, p.team, p.dept || "", p.role || "", p.name, p.rank || "", displayStatus, p.joinDate || "", p.leaveDate || "", p.transferDate || "", p.leaveStartDate || "", p.leaveEndDate || "", mm.annualTotal.toFixed(2)];
            for (let m = 1; m <= 12; m++) {
                row.push((mm[`${year}-${String(m).padStart(2, '0')}`] || 0).toFixed(2));
            }
            row = row.map(v => `"${String(v).replace(/"/g, '""')}"`);
            csvContent += row.join(",") + "\n";
        });
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        downloadFile(csvContent, `가동대상인력_${dateStr}.csv`);
    };

    document.getElementById('btn-download-csv').onclick = () => {
        const authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
        const authorizedActivities = appState.activities.filter(a => canView(a.dept));
        if (!authorizedActivities.length) return alert("다운로드할 데이터가 없습니다.");

        const year = appState.selectedYear;
        const checkDate = appState.activityDate;

        const personAgg = {};
        authorizedActivities.forEach(a => {
            if (!personAgg[a.name]) {
                const p = authorizedPersonnel.find(p => p.name === a.name);
                const cap = p ? calculatePersonnelMM(p, year, true).annualTotal : 0;
                personAgg[a.name] = { filled: 0, operating: 0, cap: cap, task: 0 };
            }
            let currentYearMM = 0;
            for (let m = 1; m <= 12; m++) currentYearMM += (a.manMonths[`${year}-${String(m).padStart(2, '0')}`]?.mm || 0);

            if (a.projectType === '과제') personAgg[a.name].task += currentYearMM;
            if (a.projectType === '이행' || a.projectType === '제안') personAgg[a.name].operating += currentYearMM;
            if (a.projectType === '이행') personAgg[a.name].filled += currentYearMM;
        });

        let csvContent = "\uFEFF";
        let header = ["No", "법인", "부서", "직무", "성명", "직급", "구분", "상태", "프로젝트명", "시작일", "종료일", "총M/M", "가득MM", "가득율(%)", "가동MM", "가동율(%)", ...Array.from({ length: 12 }, (_, i) => `${i + 1}월`)];
        csvContent += header.join(",") + "\n";

        let list = [...authorizedActivities];
        if (appState.activityStatusFilter !== 'all') {
            list = list.filter(a => {
                let s = '예정';
                if (a.endDate < checkDate) s = '완료';
                else if (a.startDate <= checkDate && a.endDate >= checkDate) s = '진행';
                return s === appState.activityStatusFilter;
            });
        }
        if (appState.dashboardNameFilter.length) list = list.filter(a => appState.dashboardNameFilter.includes(a.name));

        list.forEach((a, i) => {
            let status = '예정';
            if (a.endDate < checkDate) status = '완료';
            else if (a.startDate <= checkDate && a.endDate >= checkDate) status = '진행';

            let rowTotal = 0;
            for (let m = 1; m <= 12; m++) rowTotal += (a.manMonths[`${year}-${String(m).padStart(2, '0')}`]?.mm || 0);

            const agg = personAgg[a.name] || { filled: 0, operating: 0, cap: 0, task: 0 };
            const netCap = Math.max(0, agg.cap - agg.task);
            const fillRate = netCap > 0 ? (agg.filled / netCap) * 100 : 0;
            const operRate = netCap > 0 ? (agg.operating / netCap) * 100 : 0;

            let row = [i + 1, a.team, a.dept || "", a.role || "", a.name, a.rank || "", a.projectType, status, a.projectName, a.startDate, a.endDate, rowTotal.toFixed(2), agg.filled.toFixed(2), fillRate.toFixed(1), agg.operating.toFixed(2), operRate.toFixed(1)];
            for (let m = 1; m <= 12; m++) {
                row.push((a.manMonths[`${year}-${String(m).padStart(2, '0')}`]?.mm || 0).toFixed(2));
            }
            row = row.map(v => `"${String(v).replace(/"/g, '""')}"`);
            csvContent += row.join(",") + "\n";
        });
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        downloadFile(csvContent, `인력운영현황_${dateStr}.csv`);
    };

    document.getElementById('btn-closing-download').onclick = () => {
        const targetMonth = appState.closingMonth;
        const targets = getClosingTargets(targetMonth);
        const sortedNames = Array.from(targets.keys()).sort();
        const checkedNames = sortedNames.filter(name => appState.closingData[`${targetMonth}_${name}`]);
        if (checkedNames.length === 0) return alert("선택된 인원이 없습니다.");

        let csvContent = "\uFEFFNo,법인,부서,성명,대상 프로젝트\n";
        checkedNames.forEach((name, i) => {
            const data = targets.get(name);
            const projects = data.projects.join(' / ');
            let row = [i + 1, data.team, data.dept || "", name, projects];
            row = row.map(v => `"${String(v).replace(/"/g, '""')}"`);
            csvContent += row.join(",") + "\n";
        });
        downloadFile(csvContent, `Activity_월마감_${targetMonth}.csv`);
    };

    document.getElementById('btn-waiting-download').onclick = () => {
        const dateStr = appState.waitingDatePickerDate;
        let authorizedPersonnel = appState.personnel.filter(p => canView(p.dept));
        const authorizedActivities = appState.activities.filter(a => canView(a.dept));
        const activeNames = new Set();
        const activityLeaveMap = new Map();

        authorizedActivities.forEach(a => {
            if (dateStr >= a.startDate && dateStr <= a.endDate) {
                if (a.projectName.includes('출산휴가') || a.projectName.includes('육아휴직')) activityLeaveMap.set(a.name, a);
                else if (a.projectType !== '대기') activeNames.add(a.name);
            }
        });

        if (appState.waitingDept !== 'All') {
            authorizedPersonnel = authorizedPersonnel.filter(p => (p.dept || '미배정') === appState.waitingDept);
        }

        const list = [];
        authorizedPersonnel.forEach(p => {
            if ((p.joinDate && p.joinDate > dateStr) || (p.leaveDate && dateStr > p.leaveDate) || (p.transferDate && dateStr > p.transferDate)) return;

            const isEmployed = p.employmentStatus === '재직';
            const isStatusLeave = ['휴직', '출산휴가', '육아휴직'].includes(p.employmentStatus);
            let isPeriodLeave = (p.leaveStartDate && p.leaveEndDate && dateStr >= p.leaveStartDate && dateStr <= p.leaveEndDate);

            if ((isEmployed || isStatusLeave) && !activeNames.has(p.name)) {
                let nextP = authorizedActivities.filter(a => a.name === p.name && a.startDate > dateStr).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
                let statusText = '대기중';
                let remark = nextP ? `${nextP.startDate} (${nextP.projectName})` : '-';
                const actLeave = activityLeaveMap.get(p.name);
                if (actLeave) {
                    statusText = actLeave.projectName;
                    remark = `${actLeave.projectName} (~${actLeave.endDate})`;
                } else if (isPeriodLeave || (isStatusLeave && !p.leaveStartDate && !p.leaveEndDate)) {
                    statusText = isPeriodLeave ? (isStatusLeave ? p.employmentStatus : '휴직') : p.employmentStatus;
                    remark = p.leaveEndDate ? `${statusText} (~${p.leaveEndDate})` : statusText;
                }
                list.push([p.team, p.dept || '-', p.role || '-', p.name, p.rank || '', statusText, remark]);
            }
        });

        if (!list.length) return alert("다운로드할 데이터가 없습니다.");
        let csv = "\uFEFFNo,법인,부서,직무,성명,직급,상태,비고(차기 프로젝트)\n";
        list.forEach((row, i) => csv += `"${i + 1}","${row.join('","')}"\n`);
        downloadFile(csv, `대기인력현황_${dateStr}.csv`);
    };

    document.getElementById('p-btn-upload-csv').onclick = () => document.getElementById('p-csv-upload-input').click();
    document.getElementById('p-csv-upload-input').onchange = (e) => handleCsvUpload(e, 'personnel');

    document.getElementById('btn-upload-csv-activity').onclick = () => document.getElementById('activity-csv-upload-input').click();
    document.getElementById('activity-csv-upload-input').onchange = (e) => handleCsvUpload(e, 'activity');

    const handleCsvUpload = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            let text = event.target.result;
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

            const rows = text.split('\n').map(r => r.trim()).filter(r => r);
            if (rows.length < 2) return alert("데이터가 없습니다.");

            if (type === 'personnel') {
                const newPersonnel = rows.slice(1).map((row, i) => {
                    const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());
                    if (cols.length < 5 || !cols[4]) return null;
                    return { id: Date.now() + i, team: cols[1] || "", dept: cols[2] || "", role: cols[3] || "", name: cols[4] || "", rank: cols[5] || "", employmentStatus: cols[6] || "재직", joinDate: toStandard(cols[7]), leaveDate: toStandard(cols[8]), transferDate: toStandard(cols[9]), leaveStartDate: toStandard(cols[10]), leaveEndDate: toStandard(cols[11]) };
                }).filter(Boolean);

                if (newPersonnel.length > 0 && confirm(`${newPersonnel.length}건의 데이터를 추가하시겠습니까?`)) {
                    appState.personnel = [...appState.personnel, ...newPersonnel];
                    await savePersonnel();
                    renderPersonnelTable();
                    alert("업로드 완료.");
                }
            } else if (type === 'activity') {
                const headers = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());
                const findIdx = (keys, def) => { const idx = headers.findIndex(h => keys.some(k => h.includes(k) || h.toLowerCase() === k.toLowerCase())); return idx > -1 ? idx : def; };
                const idxs = { team: findIdx(['법인'], 1), dept: findIdx(['부서'], 2), role: findIdx(['직무'], 3), name: findIdx(['성명'], 4), rank: findIdx(['직급'], 5), type: findIdx(['구분'], 6), pName: findIdx(['프로젝트명'], 8), start: findIdx(['시작일'], 9), end: findIdx(['종료일'], 10) };

                const newActivities = rows.slice(1).map((row, i) => {
                    const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());
                    if (!cols[idxs.name] || !cols[idxs.pName] || !cols[idxs.start] || !cols[idxs.end]) return null;
                    const a = { id: Date.now() + i, team: cols[idxs.team] || "", dept: cols[idxs.dept] || "", role: cols[idxs.role] || "", name: cols[idxs.name] || "", rank: cols[idxs.rank] || "", projectType: cols[idxs.type] || "이행", projectName: cols[idxs.pName] || "", startDate: toStandard(cols[idxs.start]), endDate: toStandard(cols[idxs.end]) };
                    a.manMonths = calculateManMonths(a.startDate, a.endDate);
                    a.totalManMonth = Object.values(a.manMonths).reduce((s, v) => s + v.mm, 0);
                    return a;
                }).filter(Boolean);

                if (newActivities.length > 0 && confirm(`${newActivities.length}건의 Activity를 추가하시겠습니까?`)) {
                    appState.activities = [...appState.activities, ...newActivities];
                    await saveActivities();
                    renderActivityTable();
                    alert("업로드 완료.");
                }
            }
            e.target.value = '';
        };
        reader.readAsText(file, 'UTF-8');
    };
}
