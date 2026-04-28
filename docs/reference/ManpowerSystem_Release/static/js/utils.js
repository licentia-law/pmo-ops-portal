// static/js/utils.js
import { appState } from './state.js';

export const formatDate = (date) => { 
    if(!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const toStandard = (s) => {
    if(!s) return "";
    s = s.split('T')[0];
    s = s.replace(/[\.\/]/g, '-');
    s = s.trim().replace(/-+$/, '');
    const parts = s.split('-').map(p => p.trim());
    if(parts.length === 3) {
        return `${parts[0]}-${String(parts[1]).padStart(2,'0')}-${String(parts[2]).padStart(2,'0')}`;
    }
    return s;
};

export const isWeekend = (d) => d.getDay()===0 || d.getDay()===6;
export const isHoliday = (d) => appState.holidaySet.has(formatDate(d));
export const isWorkingDay = (d) => !isWeekend(d) && !isHoliday(d);

export const getTotalWorkingDays = (y, m) => {
    let count=0, d=new Date(y,m,1);
    while(d.getMonth()===m) { if(isWorkingDay(d)) count++; d.setDate(d.getDate()+1); }
    return count;
};

export const calculateManMonths = (startStr, endStr) => {
    const parseLocal = (s) => {
        if(!s) return null;
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m-1, d);
    };
    const start = parseLocal(startStr); 
    const end = parseLocal(endStr);
    if(!start || !end) return {};

    const res = {};
    let curr = new Date(start.getFullYear(), start.getMonth(), 1);
    while(curr <= end) {
        const y = curr.getFullYear(), m = curr.getMonth();
        if(y > 3000) break;
        const total = getTotalWorkingDays(y, m);
        if(total === 0) {
             res[`${y}-${String(m+1).padStart(2,'0')}`] = { mm: 0 };
        } else {
            let work = 0, d = new Date(y, m, 1);
            while(d.getMonth() === m) {
                if(isWorkingDay(d) && d >= start && d <= end) work++;
                d.setDate(d.getDate()+1);
            }
            res[`${y}-${String(m+1).padStart(2,'0')}`] = { mm: work/total };
        }
        curr.setMonth(curr.getMonth()+1);
    }
    return res;
};

export const calculatePersonnelMM = (p, year, ignoreLeave = false) => {
    const res = { annualTotal: 0 };
    
    const joinStr = toStandard(p.joinDate);
    const leaveStr = toStandard(p.leaveDate);
    const leaveStartStr = toStandard(p.leaveStartDate);
    const leaveEndStr = toStandard(p.leaveEndDate);
    const transferStr = toStandard(p.transferDate);
    
    for(let m=0; m<12; m++) {
        let total = getTotalWorkingDays(year, m);

        if(total === 0) { 
            res[`${year}-${String(m+1).padStart(2,'0')}`] = 0; 
            continue; 
        }
        
        let avail = 0;
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        for(let d=1; d<=daysInMonth; d++) {
            const dateObj = new Date(year, m, d);
            if (!isWorkingDay(dateObj)) continue;

            const dateStr = formatDate(dateObj);
            
            let isOk = true;
            if (joinStr && dateStr < joinStr) isOk = false;
            if (leaveStr && dateStr > leaveStr) isOk = false;
            if (transferStr && dateStr > transferStr) isOk = false; 
            
            if (!ignoreLeave && leaveStartStr && leaveEndStr) {
                if (dateStr >= leaveStartStr && dateStr <= leaveEndStr) isOk = false;
            }
            
            if (p.employmentStatus === '퇴사' && !leaveStr) isOk = false; 

            if (isOk) avail++;
        }

        const val = avail / total;
        res[`${year}-${String(m+1).padStart(2,'0')}`] = val;
        res.annualTotal += val;
    }
    return res;
};

export const canView = (deptName) => {
    if (appState.currentUserRole === 'admin' || appState.currentUserRole === 'viewer') return true;
    if (!deptName) return false;
    return appState.currentUserDepts.includes(deptName);
};

export const canEdit = (deptName) => {
    if (appState.currentUserRole === 'admin') return true;
    if (appState.currentUserRole === 'viewer') return false;
    if (!deptName) return false;
    return appState.currentUserDepts.includes(deptName);
};

export const sortData = (list, key, direction) => {
    return list.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (key === 'rank') {
            const rankOrder = { '전문위원': 0, '이사': 1, '수석2': 2, '수석1': 3, '수석': 3.5, '책임2': 4, '책임1': 5, '책임': 5.5, '선임': 6 };
            const rA = rankOrder[valA] || 99;
            const rB = rankOrder[valB] || 99;
            if(rA !== rB) return direction === 'asc' ? rA - rB : rB - rA;
        }

        if (key === 'annualTotal') {
            valA = calculatePersonnelMM(a, appState.personnelSelectedYear).annualTotal;
            valB = calculatePersonnelMM(b, appState.personnelSelectedYear).annualTotal;
        }

        if (valA == null) valA = "";
        if (valB == null) valB = "";

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
};

export const downloadFile = (content, fileName) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
