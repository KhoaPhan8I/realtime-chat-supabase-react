import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Heading,
  Image,
  Text,
  IconButton,
  Flex,
  VStack,
} from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import { useEventPhotos, useEvent } from "../../hooks/useEventData";

const EventSlideshow = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event } = useEvent(eventId);
  const { photos } = useEventPhotos(eventId);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (photos.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 5000); // Change photo every 5 seconds

    return () => clearInterval(interval);
  }, [photos]);

  if (photos.length === 0) {
    return (
      <Box h="100vh" bg="black" display="flex" alignItems="center" justifyContent="center">
        <Text color="white">No approved photos to display</Text>
        <IconButton
            position="fixed"
            top={4}
            right={4}
            onClick={() => navigate(`/event/${eventId}/gallery`)}
            aria-label="Close"
        >
            <LuX />
        </IconButton>
      </Box>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <Box h="100vh" bg="black" position="relative" overflow="hidden">
      <IconButton
        position="fixed"
        top={4}
        right={4}
        zIndex={10}
        color="white"
        variant="ghost"
        onClick={() => navigate(`/event/${eventId}/gallery`)}
        aria-label="Exit Slideshow"
      >
        <LuX />
      </IconButton>

      <Flex
        h="100%"
        w="100%"
        align="center"
        justify="center"
        transition="all 1s ease-in-out"
      >
        {currentPhoto.media_type === "image" ? (
          <Image
            src={currentPhoto.original_url}
            maxH="100%"
            maxW="100%"
            objectFit="contain"
          />
        ) : (
          <Box
            as="video"
            src={currentPhoto.original_url}
            autoPlay
            muted
            loop
            maxH="100%"
            maxW="100%"
          />
        )}
      </Flex>

      <Box
        position="fixed"
        bottom={10}
        left={10}
        p={6}
        bg="blackAlpha.700"
        borderRadius="xl"
        backdropFilter="blur(10px)"
        border="1px solid"
        borderColor="whiteAlpha.300"
      >
        <VStack align="start" gap={1}>
          <Heading color="white" size="lg">
            {currentPhoto.guest_name}
          </Heading>
          {currentPhoto.table_id && (
            <Text color="whiteAlpha.800" fontSize="xl">
              Table {currentPhoto.table_id}
            </Text>
          )}
          <Text color="whiteAlpha.600" fontSize="sm">
            {event?.name}
          </Text>
        </VStack>
      </Box>

      {/* Progress indicators */}
      <Flex position="fixed" top={0} left={0} right={0} p={4} gap={1}>
        {photos.slice(0, 20).map((_, i) => (
          <Box
            key={i}
            h="2px"
            flex={1}
            bg={i === currentIndex ? "white" : "whiteAlpha.400"}
            borderRadius="full"
          />
        ))}
      </Flex>
    </Box>
  );
};

export default EventSlideshow;
