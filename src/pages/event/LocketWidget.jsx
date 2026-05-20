import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  Image,
  Input,
  IconButton,
  Flex,
  Spinner,
  SimpleGrid,
  Stack,
} from "@chakra-ui/react";
import { LuX, LuUpload, LuCamera } from "react-icons/lu";
import { useEventPhotos, useEvent } from "../../hooks/useEventData";
import supabase from "../../supabaseClient";

const LocketWidget = () => {
  const { eventId } = useParams();
  const { event, loading: eventLoading } = useEvent(eventId);
  const { photos, loading: photosLoading } = useEventPhotos(eventId);

  const [view, setView] = useState("gallery"); // 'gallery', 'upload', 'slideshow', 'join'
  const [guestName, setGuestName] = useState(localStorage.getItem("guestName") || "");
  const [tableId, setTableId] = useState(localStorage.getItem("tableId") || "");

  // Upload state
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef();

  // Slideshow state
  const [currentIndex, setCurrentIndex] = useState(0);

  // Initial redirect to join if no guest name
  useEffect(() => {
    if (!guestName && view !== "join") {
      setView("join");
    }
  }, [guestName, view]);

  // Slideshow timer
  useEffect(() => {
    if (view === "slideshow" && photos.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [view, photos.length]);

  const handleJoin = () => {
    if (guestName) {
      localStorage.setItem("guestName", guestName);
      localStorage.setItem("tableId", tableId);
      setView("gallery");
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 20 * 1024 * 1024) {
        alert("File size exceeds 20MB limit.");
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(10);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${eventId}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("event-media")
        .upload(filePath, file, {
          onUploadProgress: (evt) => setProgress(Math.round((evt.loaded / evt.total) * 90)),
        });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("event-media").getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("event_photos").insert({
        event_id: eventId,
        guest_name: guestName,
        table_id: tableId,
        media_type: file.type.startsWith("image") ? "image" : "video",
        original_url: publicUrl,
        is_approved: true,
      });
      if (dbError) throw dbError;

      setUploading(false);
      setFile(null);
      setPreview(null);
      setView("gallery");
    } catch (error) {
      alert("Error: " + error.message);
      setUploading(false);
    }
  };

  if (eventLoading) return <Flex h="100vh" align="center" justify="center"><Spinner size="xl" /></Flex>;
  if (!event && eventId !== "00000000-0000-0000-0000-000000000000")
    return <Box p={10} textAlign="center">Event not found</Box>;

  const activeEvent = event || { name: "Mock Event", description: "Demo Event" };

  return (
    <Box minH="100vh" bg="gray.50" position="relative">
      {/* Join View */}
      {view === "join" && (
        <Container maxW="md" py={20}>
          <VStack gap={6} align="stretch" bg="white" p={8} borderRadius="2xl" shadow="xl">
            <Box textAlign="center">
              <Heading size="xl">{activeEvent.name}</Heading>
              <Text color="gray.500" mt={2}>{activeEvent.description}</Text>
            </Box>
            <Stack gap={4}>
              <Box>
                <Text mb={2} fontWeight="bold">Your Name</Text>
                <Input placeholder="Enter your name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              </Box>
              <Box>
                <Text mb={2} fontWeight="bold">Table (Optional)</Text>
                <Input placeholder="Table #" value={tableId} onChange={(e) => setTableId(e.target.value)} />
              </Box>
              <Button colorPalette="blue" size="lg" onClick={handleJoin} disabled={!guestName}>Join Event</Button>
            </Stack>
          </VStack>
        </Container>
      )}

      {/* Gallery View */}
      {view === "gallery" && (
        <Container maxW="container.md" py={6}>
          <Flex justify="space-between" align="center" mb={6}>
            <Box>
              <Heading size="lg">{activeEvent.name}</Heading>
              <Text fontSize="sm" color="gray.500">Live feed</Text>
            </Box>
            <Button variant="outline" size="sm" onClick={() => setView("slideshow")}>Slideshow</Button>
          </Flex>

          {photosLoading && photos.length === 0 ? (
            <Flex justify="center" py={10}><Spinner size="xl" /></Flex>
          ) : (
            <SimpleGrid columns={[2, 3]} gap={2}>
              {photos.map((photo) => (
                <Box key={photo.id} borderRadius="xl" overflow="hidden" bg="black" aspectRatio="1" position="relative">
                  {photo.media_type === "image" ? (
                    <Image src={photo.original_url} objectFit="cover" w="100%" h="100%" />
                  ) : (
                    <Box as="video" src={photo.original_url} w="100%" h="100%" objectFit="cover" />
                  )}
                  <Box position="absolute" bottom={0} left={0} right={0} p={2} bgGradient="to-t" gradientFrom="blackAlpha.800" gradientTo="transparent">
                    <Text fontSize="xs" color="white" fontWeight="bold">{photo.guest_name}</Text>
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          )}

          {photos.length === 0 && !photosLoading && (
            <Box textAlign="center" py={20}><Text color="gray.500">No photos yet.</Text></Box>
          )}

          <Box position="fixed" bottom={10} right={6}>
            <IconButton aria-label="Upload" size="2xl" borderRadius="full" colorPalette="blue" shadow="2xl" onClick={() => setView("upload")}>
              <LuCamera />
            </IconButton>
          </Box>
        </Container>
      )}

      {/* Upload View (Overlay) */}
      {view === "upload" && (
        <Box position="fixed" inset={0} bg="white" zIndex={20} p={6}>
          <VStack gap={6} align="stretch" maxW="md" mx="auto">
            <Flex justify="space-between" align="center">
              <Heading size="lg">Share a Moment</Heading>
              <IconButton variant="ghost" onClick={() => setView("gallery")} aria-label="Close"><LuX /></IconButton>
            </Flex>

            {!preview ? (
              <Box border="2px dashed" borderColor="gray.300" borderRadius="2xl" p={12} textAlign="center" onClick={() => fileInputRef.current.click()} cursor="pointer">
                <LuUpload size={48} style={{ margin: "0 auto", color: "#CBD5E0" }} />
                <Text mt={4} fontWeight="bold">Tap to capture</Text>
                <input type="file" accept="image/*,video/*" hidden ref={fileInputRef} onChange={handleFileChange} />
              </Box>
            ) : (
              <Box position="relative" borderRadius="2xl" overflow="hidden">
                {file.type.startsWith("image") ? <Image src={preview} w="100%" /> : <Box as="video" src={preview} w="100%" controls />}
                {uploading && (
                  <Box position="absolute" inset={0} bg="blackAlpha.600" display="flex" alignItems="center" justifyContent="center">
                    <Text color="white" fontWeight="bold">Uploading {progress}%</Text>
                  </Box>
                )}
                {!uploading && <IconButton position="absolute" top={2} right={2} colorPalette="red" size="sm" onClick={() => {setFile(null); setPreview(null);}} aria-label="Cancel"><LuX /></IconButton>}
              </Box>
            )}
            <Button colorPalette="blue" size="lg" onClick={handleUpload} disabled={!file || uploading} loading={uploading}>Post to Feed</Button>
          </VStack>
        </Box>
      )}

      {/* Slideshow View (Fullscreen) */}
      {view === "slideshow" && (
        <Box position="fixed" inset={0} bg="black" zIndex={30} display="flex" align="center" justify="center">
          <IconButton position="absolute" top={4} right={4} color="white" variant="ghost" onClick={() => setView("gallery")} aria-label="Exit"><LuX /></IconButton>

          {photos.length > 0 ? (
            <>
              <Flex h="100%" w="100%" align="center" justify="center">
                {photos[currentIndex].media_type === "image" ? (
                  <Image src={photos[currentIndex].original_url} maxH="100%" maxW="100%" objectFit="contain" />
                ) : (
                  <Box as="video" src={photos[currentIndex].original_url} autoPlay muted loop maxH="100%" maxW="100%" />
                )}
              </Flex>
              <Box position="absolute" bottom={10} left={10} p={6} bg="blackAlpha.700" borderRadius="2xl" backdropFilter="blur(10px)">
                <Heading color="white" size="lg">{photos[currentIndex].guest_name}</Heading>
                <Text color="whiteAlpha.800">Table {photos[currentIndex].table_id || "N/A"}</Text>
              </Box>
              <Flex position="absolute" top={0} left={0} right={0} p={2} gap={1}>
                {photos.slice(0, 20).map((_, i) => (
                  <Box key={i} h="2px" flex={1} bg={i === currentIndex ? "white" : "whiteAlpha.400"} borderRadius="full" />
                ))}
              </Flex>
            </>
          ) : (
            <Text color="white">No photos yet</Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export default LocketWidget;
