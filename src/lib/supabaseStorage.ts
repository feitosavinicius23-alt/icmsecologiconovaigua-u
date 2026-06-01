import { createClient } from "@supabase/supabase-js";

type UploadInput = {
  path: string;
  contentType: string;
  buffer: Buffer;
};

type UploadResult = {
  storagePath: string;
  publicUrl: string | null;
  persisted: boolean;
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const evidenceBucket = process.env.SUPABASE_EVIDENCE_BUCKET || "documentos-evidencias";

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export async function uploadEvidenceFile(input: UploadInput): Promise<UploadResult> {
  if (!supabase) {
    return {
      storagePath: input.path,
      publicUrl: null,
      persisted: false,
    };
  }

  const { error } = await supabase.storage
    .from(evidenceBucket)
    .upload(input.path, input.buffer, {
      contentType: input.contentType,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(evidenceBucket).getPublicUrl(input.path);

  return {
    storagePath: input.path,
    publicUrl: data.publicUrl,
    persisted: true,
  };
}

