import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Initialize only if keys are present
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export class SupabaseService {
    /**
     * Uploads an image buffer to Supabase Storage
     * @param fileBuffer The file buffer to upload
     * @param mimetype The MIME type of the file (e.g., 'image/jpeg')
     * @returns The public URL of the uploaded image, or null if Supabase is not configured
     */
    static async uploadImage(fileBuffer: Buffer, mimetype: string): Promise<string | null> {
        if (!supabase) {
            console.warn('Supabase is not configured. Skipping image upload.');
            return null; // Fallback or local storage could be implemented here
        }

        try {
            const ext = mimetype.split('/')[1] || 'img';
            const filename = `prescriptions/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;

            const { data, error } = await supabase.storage
                .from('mediscan-uploads') // Ensure this bucket is created in Supabase
                .upload(filename, fileBuffer, {
                    contentType: mimetype,
                    upsert: false
                });

            if (error) {
                console.error('Supabase upload error:', error.message);
                throw error;
            }

            const { data: publicUrlData } = supabase.storage
                .from('mediscan-uploads')
                .getPublicUrl(filename);

            return publicUrlData.publicUrl;
        } catch (err) {
            console.error('Error uploading to Supabase:', err);
            return null;
        }
    }
}
