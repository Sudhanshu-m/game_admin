import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Create a single Supabase client instance to avoid multiple instances warning
export const supabase = createClient(supabaseUrl, publicAnonKey);
