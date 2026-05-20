import { useState, useEffect, useCallback } from "react";
import supabase from "../supabaseClient";

export const useEventPhotos = (eventId) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPhotos = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("event_photos")
      .select("*")
      .eq("event_id", eventId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setError(error);
    } else {
      setPhotos(data);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchPhotos();

    if (!eventId) return;

    const channel = supabase
      .channel(`event_photos:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_photos",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.new.is_approved) {
            setPhotos((prev) => [payload.new, ...prev.slice(0, 49)]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "event_photos",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          setPhotos((prev) => {
            const index = prev.findIndex((p) => p.id === payload.new.id);
            if (index === -1) {
              if (payload.new.is_approved) {
                return [payload.new, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
              }
              return prev;
            }
            if (!payload.new.is_approved) {
              return prev.filter((p) => p.id !== payload.new.id);
            }
            const newPhotos = [...prev];
            newPhotos[index] = payload.new;
            return newPhotos;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchPhotos]);

  return { photos, loading, error, refetch: fetchPhotos };
};

export const useEvent = (eventId) => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) {
        setError(error);
      } else {
        setEvent(data);
      }
      setLoading(false);
    };

    fetchEvent();
  }, [eventId]);

  return { event, loading, error };
};
