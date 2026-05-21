import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Heading, HStack, Input, Text } from "@chakra-ui/react";
import { useParams } from "react-router-dom";
import {
  DEFAULT_EVENT_ID,
  addReaction,
  fetchEventReactions,
  fetchLatestMedia,
  getMediaType,
  subscribeToEventMedia,
  subscribeToEventReactions,
  uploadEventMedia,
} from "../eventMediaApi";
import CameraComposer from "./event/CameraComposer";
import EventControls from "./event/EventControls";
import EventFeed from "./event/EventFeed";
import IdentitySheet from "./event/IdentitySheet";
import ShareSheet from "./event/ShareSheet";

const getJoinUrl = (eventId) => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin = configuredUrl || window.location.origin;
  return `${origin}/event/${eventId}`;
};

const ENABLE_REMOTE_REACTIONS = import.meta.env.VITE_ENABLE_REACTIONS === "true";

const getReactionCounts = (rows) =>
  rows.reduce((counts, reaction) => {
    counts[reaction.media_id] ||= {};
    counts[reaction.media_id][reaction.emoji] = (counts[reaction.media_id][reaction.emoji] || 0) + 1;
    return counts;
  }, {});

export default function EventMedia() {
  const { eventId: routeEventId } = useParams();
  const eventId = routeEventId || DEFAULT_EVENT_ID;
  const guestKey = `eventGuestName:${eventId}`;
  const tableKey = `eventTableId:${eventId}`;
  const [guestName, setGuestName] = useState(localStorage.getItem(guestKey) || localStorage.getItem("eventGuestName") || "");
  const [tableId, setTableId] = useState(localStorage.getItem(tableKey) || localStorage.getItem("eventTableId") || "");
  const [items, setItems] = useState([]);
  const reactionKey = `eventReactions:${eventId}`;
  const [reactions, setReactions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(reactionKey) || "{}");
    } catch {
      return {};
    }
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState("feed");
  const [newCount, setNewCount] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [showIdentity, setShowIdentity] = useState(!localStorage.getItem(guestKey) && !localStorage.getItem("eventGuestName"));
  const galleryInputRef = useRef(null);

  const joinUrl = useMemo(() => getJoinUrl(eventId), [eventId]);

  const persistIdentity = useCallback(() => {
    localStorage.setItem(guestKey, guestName);
    localStorage.setItem(tableKey, tableId);
    localStorage.setItem("eventGuestName", guestName);
    localStorage.setItem("eventTableId", tableId);
  }, [guestKey, guestName, tableId, tableKey]);

  const refreshMedia = useCallback(async ({ jumpToLatest = false } = {}) => {
    const latest = await fetchLatestMedia(eventId);
    setItems(latest);
    setActiveIndex((index) => (jumpToLatest ? 0 : Math.min(index, Math.max(latest.length - 1, 0))));
    if (jumpToLatest) setNewCount(0);
  }, [eventId]);

  const refreshReactions = useCallback(async () => {
    if (!ENABLE_REMOTE_REACTIONS) return;
    try {
      const rows = await fetchEventReactions(eventId);
      setReactions(getReactionCounts(rows));
    } catch {
      setReactions((current) => current);
    }
  }, [eventId]);

  useEffect(() => {
    let mounted = true;
    let mediaChannel = null;
    let reactionChannel = null;

    async function load() {
      try {
        setLoading(true);
        const [latest, reactionRows] = await Promise.all([
          fetchLatestMedia(eventId),
          ENABLE_REMOTE_REACTIONS ? fetchEventReactions(eventId).catch(() => []) : Promise.resolve([]),
        ]);
        if (mounted) {
          setItems(latest);
          if (ENABLE_REMOTE_REACTIONS) setReactions(getReactionCounts(reactionRows));
        }
        mediaChannel = subscribeToEventMedia(eventId, async () => {
          const refreshed = await fetchLatestMedia(eventId);
          if (!mounted) return;
          setItems(refreshed);
          setActiveIndex((index) => {
            if (index === 0) return 0;
            setNewCount((count) => count + 1);
            return Math.min(index + 1, Math.max(refreshed.length - 1, 0));
          });
        });
        if (ENABLE_REMOTE_REACTIONS) {
          reactionChannel = subscribeToEventReactions(eventId, () => {
            if (mounted) refreshReactions();
          });
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
      if (mediaChannel) mediaChannel.unsubscribe();
      if (reactionChannel) reactionChannel.unsubscribe();
    };
  }, [eventId, refreshReactions]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refreshMedia().catch((err) => setError(err.message));
        refreshReactions();
      }
    };
    const poll = setInterval(refreshWhenVisible, 12000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshMedia, refreshReactions]);

  const resetGalleryInput = () => {
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const uploadFiles = async (files, source = "gallery", captionText = "") => {
    const selected = Array.from(files || []).filter((file) => getMediaType(file));
    if (!selected.length || uploading) return;

    persistIdentity();
    setUploading(true);
    setError("");
    setStatus(source === "camera" ? "Đang gửi khoảnh khắc..." : "Đang gửi từ album...");

    try {
      for (const file of selected) {
        await uploadEventMedia({
          eventId,
          file,
          guestName: guestName.trim(),
          tableId: tableId.trim(),
          caption: captionText || null
        });
      }
      setStatus("Đã đăng lên live feed");
      await refreshMedia({ jumpToLatest: true });
      setView("feed");
      setTimeout(() => setStatus(""), 1400);
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setUploading(false);
      resetGalleryInput();
    }
  };

  const handleReact = async (mediaId, emoji) => {
    if (!mediaId) return;
    persistIdentity();
    setReactions((current) => {
      const next = {
        ...current,
        [mediaId]: {
          ...(current[mediaId] || {}),
          [emoji]: ((current[mediaId] || {})[emoji] || 0) + 1,
        },
      };
      localStorage.setItem(reactionKey, JSON.stringify(next));
      return next;
    });
    if (!ENABLE_REMOTE_REACTIONS) return;
    try {
      await addReaction({ eventId, mediaId, emoji, guestName: guestName.trim() });
    } catch (err) {
      setError(err.message);
      refreshReactions();
    }
  };

  const copyJoinUrl = async () => {
    await navigator.clipboard.writeText(joinUrl);
    setStatus("Đã copy link");
    setTimeout(() => setStatus(""), 1200);
  };

  const shareJoinUrl = async () => {
    if (navigator.share) {
      await navigator.share({ title: `Join ${eventId}`, url: joinUrl });
      return;
    }
    await copyJoinUrl();
  };

  return (
    <main className="locket-app">
      <h1 style={{position: "absolute", left: "-9999px"}}>Locket Widget</h1>
      <Input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        display="none"
        onChange={(event) => uploadFiles(event.target.files, "gallery")}
      />

      <Box className="locket-phone">
        <Box className="locket-topbar">
          <Box>
            <Text className="locket-kicker">Locket Widget</Text>
            <Heading className="locket-title">{eventId}</Heading>
          </Box>
          <HStack>
            <Button size="sm" variant="ghost" color="white" onClick={() => setShowIdentity(true)}>Tên</Button>
            <Button size="sm" variant="ghost" color="white" onClick={() => setShowShare((value) => !value)}>Mời</Button>
          </HStack>
        </Box>

        {view === "camera" ? (
          <CameraComposer
            uploading={uploading}
            onClose={() => setView("feed")}
            onFallbackAlbum={() => galleryInputRef.current?.click()}
            onSend={(file, caption) => uploadFiles([file], "camera", caption)}
          />
        ) : (
          <EventFeed
            items={items}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            loading={loading}
            onOpenCamera={() => setView("camera")}
            newCount={newCount}
            onShowLatest={() => refreshMedia({ jumpToLatest: true })}
            reactions={reactions}
            onReact={handleReact}
          />
        )}

        {showShare && <ShareSheet joinUrl={joinUrl} onCopy={copyJoinUrl} onShare={shareJoinUrl} />}
        {showIdentity && (
          <IdentitySheet
            guestName={guestName}
            tableId={tableId}
            onGuestNameChange={setGuestName}
            onTableIdChange={setTableId}
            onClose={() => {
              persistIdentity();
              setShowIdentity(false);
            }}
          />
        )}

        {(status || error) && <Box className={`locket-toast ${error ? "is-error" : ""}`}>{error || status}</Box>}

        {view === "feed" && (
          <EventControls
            onOpenAlbum={() => galleryInputRef.current?.click()}
            onOpenCamera={() => setView("camera")}
            onPrevious={() => setActiveIndex((index) => Math.max(index - 1, 0))}
            onNext={() => setActiveIndex((index) => (items.length ? Math.min(index + 1, items.length - 1) : 0))}
            disabled={uploading}
            hasItems={items.length > 0}
          />
        )}
      </Box>
    </main>
  );
}
