import supabase, { isSupabaseConfigured } from "./supabaseClient";

export const MEDIA_BUCKET = import.meta.env.VITE_MEDIA_BUCKET || "event-media";
export const DEFAULT_EVENT_ID = import.meta.env.VITE_EVENT_ID || "wedding-demo";
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
export const LATEST_MEDIA_LIMIT = 50;

const safeFileName = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-96);

export const getMediaType = (file) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
};

export async function ensureGuestSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

export async function fetchLatestMedia(eventId) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("event_photos")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(LATEST_MEDIA_LIMIT);

  if (error) throw error;
  return data || [];
}

export function subscribeToEventMedia(eventId, onChange) {
  if (!isSupabaseConfigured) return { unsubscribe: () => {} };

  const channelName = `event-media:${eventId}`;
  supabase.getChannels().forEach((channel) => {
    if (channel.topic === `realtime:${channelName}`) {
      supabase.removeChannel(channel);
    }
  });

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "event_photos",
        filter: `event_id=eq.${eventId}`,
      },
      onChange
    )
    .subscribe();

  return {
    unsubscribe: () => supabase.removeChannel(channel),
  };
}

export async function fetchEventReactions(eventId) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("event_media_reactions")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return data || [];
}

export function subscribeToEventReactions(eventId, onChange) {
  if (!isSupabaseConfigured) return { unsubscribe: () => {} };

  const channelName = `event-reactions:${eventId}`;
  supabase.getChannels().forEach((channel) => {
    if (channel.topic === `realtime:${channelName}`) {
      supabase.removeChannel(channel);
    }
  });

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "event_media_reactions",
        filter: `event_id=eq.${eventId}`,
      },
      onChange
    )
    .subscribe();

  return {
    unsubscribe: () => supabase.removeChannel(channel),
  };
}

export async function addReaction({ eventId, mediaId, emoji, guestName }) {
  if (!isSupabaseConfigured) {
    throw new Error("Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_KEY.");
  }

  const session = await ensureGuestSession();
  const userId = session.user.id;
  const { data, error } = await supabase
    .from("event_media_reactions")
    .insert({
      event_id: eventId,
      media_id: mediaId,
      user_id: userId,
      guest_name: guestName || "Khách mời",
      emoji,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadEventMedia({ eventId, file, guestName, tableId, caption }) {
  if (!isSupabaseConfigured) {
    throw new Error("Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_KEY.");
  }

  const mediaType = getMediaType(file);
  if (!mediaType) throw new Error("Chỉ hỗ trợ ảnh hoặc video.");
  if (file.size > MAX_MEDIA_BYTES) throw new Error("File phải nhỏ hơn 20MB.");

  const session = await ensureGuestSession();
  const userId = session.user.id;
  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Date.now();
  const storagePath = `${eventId}/${userId}/${uniqueId}-${safeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from("event_photos")
    .insert({
      event_id: eventId,
      uploaded_by: userId,
      guest_name: guestName || "Khách mời",
      media_type: mediaType,
      original_url: publicData.publicUrl,
      storage_path: storagePath,
      thumbnail_url: null,
      table_id: tableId || null,
      caption: caption || null,
      likes: 0,
      is_approved: true,
      ai_tags: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
