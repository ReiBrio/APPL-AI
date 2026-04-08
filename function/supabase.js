// ============================================
// ANCHOR SUPABASE CONFIG LOADER
// ============================================

const SUPABASE_URL = window.CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.CONFIG?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase config is missing. Make sure config.js is loaded.');
}

if (!window.supabase) {
    console.error('Supabase CDN was not loaded. Make sure the CDN script is included before supabase.js');
} else {
    const supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    window.supabaseClient = supabaseClient;
}