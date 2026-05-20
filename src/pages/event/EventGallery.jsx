import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Image,
  Text,
  VStack,
  IconButton,
  Flex,
  Spinner,
  Button,
} from "@chakra-ui/react";
import { LuCamera } from "react-icons/lu";
import { useEventPhotos, useEvent } from "../../hooks/useEventData";

const EventGallery = () => {
  const { eventId } = useParams();
  const { event } = useEvent(eventId);
  const { photos, loading } = useEventPhotos(eventId);

  return (
    <Box minH="100vh" bg="gray.50">
      <Container maxW="container.md" py={6}>
        <VStack gap={6} align="stretch">
          <Flex justify="space-between" align="center">
            <Box>
              <Heading size="lg">{event?.name || "Event Gallery"}</Heading>
              <Text fontSize="sm" color="gray.500">Live feed of event photos</Text>
            </Box>
            <Link to={`/event/${eventId}/slideshow`}>
              <Button variant="ghost" size="sm">Slideshow</Button>
            </Link>
          </Flex>

          {loading && photos.length === 0 ? (
            <Flex justify="center" py={10}>
              <Spinner size="xl" />
            </Flex>
          ) : (
            <SimpleGrid columns={[2, 3]} gap={2}>
              {photos.map((photo) => (
                <Box key={photo.id} borderRadius="md" overflow="hidden" bg="black" aspectRatio="1" position="relative">
                  {photo.media_type === "image" ? (
                    <Image
                      src={photo.original_url}
                      alt={`Uploaded by ${photo.guest_name}`}
                      objectFit="cover"
                      w="100%"
                      h="100%"
                    />
                  ) : (
                    <Box as="video" src={photo.original_url} w="100%" h="100%" objectFit="cover" />
                  )}
                  <Box
                    position="absolute"
                    bottom={0}
                    left={0}
                    right={0}
                    p={2}
                    bgGradient="to-t"
                    gradientFrom="blackAlpha.800"
                    gradientTo="transparent"
                  >
                    <Text fontSize="xs" color="white" fontWeight="bold">
                      {photo.guest_name} {photo.table_id ? `• Table ${photo.table_id}` : ""}
                    </Text>
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          )}

          {photos.length === 0 && !loading && (
            <Box textAlign="center" py={20}>
              <Text color="gray.500">No photos yet. Be the first to upload!</Text>
            </Box>
          )}
        </VStack>
      </Container>

      <Box position="fixed" bottom={10} right={6}>
        <Link to={`/event/${eventId}/upload`}>
          <IconButton
            aria-label="Upload photo"
            size="2xl"
            borderRadius="full"
            colorPalette="blue"
            boxShadow="xl"
          >
            <LuCamera />
          </IconButton>
        </Link>
      </Box>
    </Box>
  );
};

export default EventGallery;
