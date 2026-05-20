import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEvent } from "../../hooks/useEventData";

const EventJoin = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event, loading, error } = useEvent(eventId);
  const [guestName, setGuestName] = useState(localStorage.getItem("guestName") || "");
  const [tableId, setTableId] = useState(localStorage.getItem("tableId") || "");

  const handleJoin = () => {
    if (!guestName) return;
    localStorage.setItem("guestName", guestName);
    localStorage.setItem("tableId", tableId);
    navigate(`/event/${eventId}/gallery`);
  };

  // Mock for demo/testing if eventId is 0s
  const isMock = eventId === "00000000-0000-0000-0000-000000000000";

  if (loading && !isMock) return <Box p={10} textAlign="center">Loading event...</Box>;
  if ((error || !event) && !isMock) return <Box p={10} textAlign="center">Event not found</Box>;

  const displayEvent = isMock ? { name: "Mock Event", description: "Demo Description" } : event;

  return (
    <Container maxW="md" py={10}>
      <VStack gap={6} align="stretch">
        <Box textAlign="center">
          <Heading size="xl">{displayEvent.name}</Heading>
          <Text color="gray.600">{displayEvent.description}</Text>
        </Box>

        <Stack gap={4}>
          <Box>
            <Text mb={2} fontWeight="bold">Your Name</Text>
            <Input
              placeholder="Enter your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </Box>
          <Box>
            <Text mb={2} fontWeight="bold">Table Number (Optional)</Text>
            <Input
              placeholder="Enter table number"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
            />
          </Box>
          <Button colorPalette="blue" size="lg" onClick={handleJoin} disabled={!guestName}>
            Join Event
          </Button>
        </Stack>
      </VStack>
    </Container>
  );
};

export default EventJoin;
