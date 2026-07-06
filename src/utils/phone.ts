/**
 * Normalize phone number for API calls
 * Matches the backend normalization logic
 */
export const normalizePhone = (phone: string): string => {
    if (!phone) return '';

    // Remove all non-numeric characters except '+'
    let normalized = phone.replace(/[^0-9+]/g, '');

    // If the number starts with '0', remove the leading zero
    if (normalized.startsWith('0')) {
        normalized = normalized.substring(1);
    }

    // If it has a '+' and country code, keep it
    if (normalized.startsWith('+')) {
        return normalized;
    }

    // If the number is 10 digits, assume India, add country code
    if (normalized.length === 10) {
        return `+91${normalized}`;
    }

    // If the number is 12 digits and starts with '91', add '+'
    if (normalized.length === 12 && normalized.startsWith('91')) {
        return `+${normalized}`;
    }

    // Default: return as is with '+' prefix if missing
    return normalized.startsWith('+') ? normalized : `+${normalized}`;
};

/**
 * Format phone number for display (user-friendly)
 */
export const formatPhoneDisplay = (phone: string): string => {
    const normalized = normalizePhone(phone);
    // Example: +919878900000 → +91 98789 00000
    if (normalized.startsWith('+91') && normalized.length === 13) {
        return `+91 ${normalized.substring(3, 8)} ${normalized.substring(8)}`;
    }
    return normalized;
};
