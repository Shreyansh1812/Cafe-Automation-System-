import { DateTime } from 'luxon';

export const formatDateIST = (date: string | Date | null): string => {
    if (!date) return 'N/A';
    
    let dt: DateTime;
    if (typeof date === 'string') {
        dt = DateTime.fromISO(date, { zone: 'utc' });
        if (!dt.isValid) {
            dt = DateTime.fromSQL(date, { zone: 'utc' });
        }
        if (!dt.isValid) {
            dt = DateTime.fromJSDate(new Date(date));
        }
    } else {
        dt = DateTime.fromJSDate(date);
    }
    
    if (!dt.isValid) return 'N/A';
    
    return dt
        .setZone('Asia/Kolkata')
        .toFormat('dd MMM yyyy, hh:mm a');
};

export const formatDateShortIST = (date: string | Date | null): string => {
    if (!date) return 'N/A';
    
    let dt: DateTime;
    if (typeof date === 'string') {
        dt = DateTime.fromISO(date, { zone: 'utc' });
        if (!dt.isValid) {
            dt = DateTime.fromSQL(date, { zone: 'utc' });
        }
        if (!dt.isValid) {
            dt = DateTime.fromJSDate(new Date(date));
        }
    } else {
        dt = DateTime.fromJSDate(date);
    }
    
    if (!dt.isValid) return 'N/A';
    
    return dt
        .setZone('Asia/Kolkata')
        .toFormat('dd MMM yyyy');
};

export const formatCurrencyINR = (amount: number | string | null): string => {
    if (amount === null || amount === undefined) return '₹ 0';
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₹ 0';
    
    return `₹ ${num.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
};
