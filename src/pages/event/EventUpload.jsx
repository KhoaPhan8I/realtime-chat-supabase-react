import { useState, useRef } from "react";
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
} from "@chakra-ui/react";
import { LuX, LuUpload } from "react-icons/lu";
import supabase from "../../supabaseClient";

const EventUpload = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef();

  const guestName = localStorage.getItem("guestName") || "Anonymous";
  const tableId = localStorage.getItem("tableId") || "";

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
      // 1. Upload to Storage
      const { error: uploadError, data } = await supabase.storage
        .from("event-media")
        .upload(filePath, file, {
            onUploadProgress: (evt) => {
                setProgress(Math.round((evt.loaded / evt.total) * 90));
            }
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("event-media")
        .getPublicUrl(filePath);

      // 2. Save Metadata
      const { error: dbError } = await supabase.from("event_photos").insert({
        event_id: eventId,
        guest_name: guestName,
        table_id: tableId,
        media_type: file.type.startsWith("image") ? "image" : "video",
        original_url: publicUrl,
        is_approved: true, // Auto-approve for MVP
      });

      if (dbError) throw dbError;

      setProgress(100);
      setTimeout(() => {
        navigate(`/event/${eventId}/gallery`);
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading file: " + error.message);
      setUploading(false);
    }
  };

  return (
    <Container maxW="md" py={10}>
      <VStack gap={6} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="lg">Upload Photo</Heading>
          <IconButton
            variant="ghost"
            onClick={() => navigate(`/event/${eventId}/gallery`)}
            aria-label="Close"
          >
            <LuX />
          </IconButton>
        </Box>

        {!preview ? (
          <Box
            border="2px dashed"
            borderColor="gray.300"
            borderRadius="xl"
            p={10}
            textAlign="center"
            onClick={() => fileInputRef.current.click()}
            cursor="pointer"
            _hover={{ borderColor: "blue.500" }}
          >
            <LuUpload size={48} style={{ margin: "0 auto", color: "#CBD5E0" }} />
            <Text mt={4} fontWeight="bold">Tap to take photo or pick from gallery</Text>
            <Text fontSize="sm" color="gray.500">Images or videos up to 20MB</Text>
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </Box>
        ) : (
          <Box position="relative" borderRadius="xl" overflow="hidden">
            {file.type.startsWith("image") ? (
              <Image src={preview} w="100%" />
            ) : (
              <Box as="video" src={preview} w="100%" controls />
            )}
            {uploading && (
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                bg="blackAlpha.600"
                display="flex"
                alignItems="center"
                justifyContent="center"
                p={4}
              >
                <VStack w="100%">
                  <Text color="white" fontWeight="bold">Uploading... {progress}%</Text>
                </VStack>
              </Box>
            )}
            {!uploading && (
                <IconButton
                    position="absolute"
                    top={2}
                    right={2}
                    colorPalette="red"
                    size="sm"
                    onClick={() => { setFile(null); setPreview(null); }}
                    aria-label="Remove preview"
                >
                    <LuX />
                </IconButton>
            )}
          </Box>
        )}

        <Button
          colorPalette="blue"
          size="lg"
          onClick={handleUpload}
          disabled={!file || uploading}
          loading={uploading}
        >
          {uploading ? "Uploading..." : "Share with everyone"}
        </Button>
      </VStack>
    </Container>
  );
};

export default EventUpload;
