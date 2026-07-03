export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
export const hasGoogleConfig = !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "your_google_client_id_here";
