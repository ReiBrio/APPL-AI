const SUPABASE_URL = 'https://vybxzeinuzdbvpxkdrrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5Ynh6ZWludXpkYnZweGtkcnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDAxOTgsImV4cCI6MjA4NzY3NjE5OH0.65mXTBoH8PwLlPBr1x1ROTZpy3rDIZaIREf7-_Mo4Rc';

if (!window.supabase) {
    console.error('Supabase CDN was not loaded. Make sure the CDN script is included before supabase.js');
} else {
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabaseClient;
}