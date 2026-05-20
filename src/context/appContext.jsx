import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import supabase, { isSupabaseConfigured } from "../supabaseClient";

const AppContext = createContext({});

// Constants
const MESSAGES_PER_PAGE = 49;
const LOCATION_API_URL = "https://api.db-ip.com/v2/free/self";
const SCROLL_THRESHOLD = 1; // pixels from bottom to consider "at bottom"

export const ROOMS = [
  { id: "general", name: "General" },
  { id: "tech", name: "Tech" },
  { id: "random", name: "Random" },
  { id: "gaming", name: "Gaming" },
];

const AppContextProvider = ({ children }) => {
  // Refs
  const myChannelRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const scrollRef = useRef();

  // User state
  const [username, setUsername] = useState("");
  const [session, setSession] = useState(null);
  const [countryCode, setCountryCode] = useState("");

  // Room state
  const [activeRoom, setActiveRoom] = useState("general");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Messages state
  const [messages, setMessages] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [newIncomingMessageTrigger, setNewIncomingMessageTrigger] = useState(null);

  // UI state
  const [isOnBottom, setIsOnBottom] = useState(false);
  const [unviewedMessageCount, setUnviewedMessageCount] = useState(0);
  const [routeHash, setRouteHash] = useState("");

  // Scroll utilities
  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  // Scroll to bottom when initial messages are loaded
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      scrollToBottom();
    }
  }, [messages, isInitialLoad, scrollToBottom]);

  // User utilities
  const randomUsername = useCallback(() => {
    return `@user${Date.now().toString().slice(-4)}`;
  }, []);

  const getLocation = useCallback(async () => {
    try {
      const res = await fetch(LOCATION_API_URL);
      const { countryCode, error } = await res.json();
      if (error) throw new Error(error);

      setCountryCode(countryCode);
      localStorage.setItem("countryCode", countryCode);
    } catch (error) {
      console.error("Error getting location:", error.message);
    }
  }, []);

  const initializeUser = useCallback((session) => {
    setSession(session);

    const username = session
      ? session.user.user_metadata.user_name
      : localStorage.getItem("username") || randomUsername();

    setUsername(username);
    localStorage.setItem("username", username);
  }, [randomUsername, setSession, setUsername]);

  // Message handlers
  const handleNewMessage = useCallback((payload) => {
    if (payload.new && payload.new.room === activeRoom) {
      setMessages((prevMessages) => {
        if (prevMessages.some((msg) => msg.id === payload.new.id)) {
          return prevMessages;
        }
        return [payload.new, ...prevMessages];
      });
      // Trigger effect to check if we should scroll or show notification
      setNewIncomingMessageTrigger(payload.new);
    }
  }, [activeRoom]);

  const getInitialMessages = useCallback(async (roomName) => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_KEY) {
      setError("Cảnh báo: Bạn chưa cài đặt biến môi trường Supabase! Hãy thêm VITE_SUPABASE_URL và VITE_SUPABASE_KEY vào thiết lập Vercel.");
      setLoadingInitial(false);
      return;
    }

    try {
      setLoadingInitial(true);
      const { data, error } = await supabase
        .from("messages")
        .select()
        .eq("room", roomName)
        .range(0, MESSAGES_PER_PAGE)
        .order("id", { ascending: false });

      setLoadingInitial(false);
      if (error) {
        setError(error.message);
        return;
      }

      setIsInitialLoad(true);
      setMessages(data);
    } catch (e) {
      setError("Lỗi kết nối Supabase: " + e.message);
      setLoadingInitial(false);
    }
  }, []);

  const createChannelSubscription = useCallback((roomName, currentUsername, currentCountry) => {
    if (myChannelRef.current) {
      supabase.removeChannel(myChannelRef.current);
      myChannelRef.current = null;
    }

    const channelName = `room:${roomName}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUsername,
        },
      },
    });

    myChannelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        handleNewMessage
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = [];
        const typing = [];

        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences.length > 0) {
            const latest = presences[presences.length - 1];
            users.push({
              username: key,
              country: latest.country || "Unknown",
              isTyping: latest.isTyping || false,
            });

            if (latest.isTyping && key !== currentUsername) {
              typing.push(key);
            }
          }
        });

        setOnlineUsers(users);
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            country: currentCountry || "Unknown",
            isTyping: false,
            online_at: new Date().toISOString(),
          });
        }
      });
  }, [handleNewMessage]);

  const updateTypingStatus = useCallback(async (isTyping) => {
    if (myChannelRef.current) {
      await myChannelRef.current.track({
        country: countryCode || "Unknown",
        isTyping: isTyping,
        online_at: new Date().toISOString(),
      });
    }
  }, [countryCode]);

  // Initialize app: auth and location
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    let authSubscription = null;

    if (isSupabaseConfigured && supabase && supabase.auth) {
      // Initialize user session
      supabase.auth.getSession().then(({ data: { session } }) => {
        initializeUser(session);
      });

      // Listen for auth state changes
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        console.log("onAuthStateChange", { _event, session });
        initializeUser(session);
      });
      if (data && data.subscription) {
        authSubscription = data.subscription;
      }
    } else {
      initializeUser(null);
    }

    // Load country code from localStorage or fetch from API
    const storedCountryCode = localStorage.getItem("countryCode");
    if (storedCountryCode && storedCountryCode !== "undefined") {
      setCountryCode(storedCountryCode);
    } else {
      getLocation();
    }

    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      hasInitializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Room Subscription effect: runs when activeRoom, username, or countryCode changes
  useEffect(() => {
    if (!username) return;

    setMessages([]);
    setError("");

    if (!isSupabaseConfigured) {
      setLoadingInitial(false);
      return;
    }

    getInitialMessages(activeRoom);
    createChannelSubscription(activeRoom, username, countryCode);

    return () => {
      if (myChannelRef.current && supabase && typeof supabase.removeChannel === "function") {
        supabase.removeChannel(myChannelRef.current);
        myChannelRef.current = null;
      }
    };
  }, [activeRoom, username, countryCode, getInitialMessages, createChannelSubscription]);

  // Handle new incoming messages: scroll if from current user, otherwise show notification
  useEffect(() => {
    if (!newIncomingMessageTrigger) return;

    if (newIncomingMessageTrigger.username === username) {
      scrollToBottom();
    } else {
      setUnviewedMessageCount((prevCount) => prevCount + 1);
    }
  }, [newIncomingMessageTrigger, username, scrollToBottom]);

  // Handle scroll events: detect bottom position and load more messages at top
  const onScroll = async ({ target }) => {
    const isAtBottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + SCROLL_THRESHOLD;

    if (isAtBottom) {
      setUnviewedMessageCount(0);
      setIsOnBottom(true);
    } else {
      setIsOnBottom(false);
    }

    // Load more messages when scrolling to top
    if (target.scrollTop === 0) {
      const { data, error } = await supabase
        .from("messages")
        .select()
        .eq("room", activeRoom)
        .range(messages.length, messages.length + MESSAGES_PER_PAGE)
        .order("id", { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }

      // Maintain scroll position after loading
      target.scrollTop = 1;
      setMessages((prevMessages) => [...prevMessages, ...data]);
    }
  };

  return (
    <AppContext.Provider
      value={{
        messages,
        loadingInitial,
        error,
        username,
        setUsername,
        randomUsername,
        routeHash,
        scrollRef,
        onScroll,
        scrollToBottom,
        isOnBottom,
        country: countryCode,
        unviewedMessageCount,
        session,
        activeRoom,
        setActiveRoom,
        onlineUsers,
        typingUsers,
        updateTypingStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

const useAppContext = () => useContext(AppContext);

export { AppContext as default, AppContextProvider, useAppContext };
