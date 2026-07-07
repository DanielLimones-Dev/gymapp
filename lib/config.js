// Centralized config \u2014 import from here instead of hardcoding credentials
export const SUPABASE_URL = 'https://vlnmhwaadyejdnmgktjt.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsbm1od2FhZHllamRubWdrdGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIwNzcsImV4cCI6MjA4ODE1ODA3N30.xIOUyPbvPVoj9uKuUNKO2HpeE20RhEdD_VEzqNXh8AU'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZHJhHtk3REmxd3EblLt6NA_9YIsoiSb'

export const FN_URL_CLIENTE = `${SUPABASE_URL}/functions/v1/create-payment-intent`
export const FN_URL_COACH = FN_URL_CLIENTE
