import { Badge, Box, Button, Grid, GridItem, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useAppContext, ROOMS } from "../context/appContext";
import Messages from "./Messages";
import { BsChevronDoubleDown, BsPeopleFill, BsChatSquareQuoteFill } from "react-icons/bs";

export default function Chat() {
  const [height, setHeight] = useState(window.innerHeight - 230);
  const {
    scrollRef,
    onScroll,
    scrollToBottom,
    isOnBottom,
    unviewedMessageCount,
    activeRoom,
    setActiveRoom,
    onlineUsers,
    typingUsers,
  } = useAppContext();

  useEffect(() => {
    const handleResize = () => {
      setHeight(window.innerHeight - 230);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getTypingText = () => {
    if (typingUsers.length === 0) return "";
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return "Several people are typing...";
  };

  return (
    <Box maxW="1200px" mx="auto" px="4" pb="20px">
      <Grid templateColumns={{ base: "1fr", md: "280px 1fr" }} gap="6" alignItems="start">
        {/* Sidebar */}
        <GridItem
          bg="white"
          p="5"
          borderRadius="12px"
          boxShadow="sm"
          border="1px solid"
          borderColor="gray.200"
        >
          <VStack align="stretch" spaceY="6">
            {/* Rooms Section */}
            <Box>
              <HStack mb="3">
                <BsChatSquareQuoteFill color="teal" />
                <Heading size="xs" textTransform="uppercase" letterSpacing="wider" color="gray.600">
                  Chat Rooms
                </Heading>
              </HStack>
              <VStack align="stretch" spaceY="1">
                {ROOMS.map((room) => {
                  const isActive = activeRoom === room.id;
                  return (
                    <Button
                      key={room.id}
                      onClick={() => setActiveRoom(room.id)}
                      justifyContent="flex-start"
                      variant={isActive ? "solid" : "ghost"}
                      bg={isActive ? "teal" : "transparent"}
                      color={isActive ? "white" : "gray.700"}
                      _hover={{ bg: isActive ? "teal.600" : "gray.100" }}
                      size="sm"
                      width="full"
                      borderRadius="8px"
                      fontWeight={isActive ? "bold" : "medium"}
                    >
                      # {room.name}
                    </Button>
                  );
                })}
              </VStack>
            </Box>

            {/* Online Users Section */}
            <Box>
              <HStack mb="3">
                <BsPeopleFill color="teal" />
                <Heading size="xs" textTransform="uppercase" letterSpacing="wider" color="gray.600">
                  Online Users ({onlineUsers.length})
                </Heading>
              </HStack>
              <VStack align="stretch" spaceY="2" maxH="250px" overflowY="auto" pr="1">
                {onlineUsers.map((user) => (
                  <HStack key={user.username} justify="space-between" py="1">
                    <HStack spaceX="2">
                      <Box w="8px" h="8px" borderRadius="full" bg="green.500" />
                      <Text fontSize="sm" fontWeight="medium" color="gray.800" isTruncated maxW="150px">
                        {user.username}
                      </Text>
                      {user.isTyping && (
                        <Text fontSize="xs" fontStyle="italic" color="teal.500">
                          (typing...)
                        </Text>
                      )}
                    </HStack>
                    <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                      {user.country}
                    </Badge>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </GridItem>

        {/* Chat Main View */}
        <GridItem
          bg="white"
          p="5"
          borderRadius="12px"
          boxShadow="sm"
          border="1px solid"
          borderColor="gray.200"
          position="relative"
        >
          <Box
            overflowY="auto"
            height={height}
            onScroll={onScroll}
            ref={scrollRef}
            pr="2"
            css={{
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-thumb": { backgroundColor: "#cbd5e1", borderRadius: "3px" },
            }}
          >
            <Messages />
            {!isOnBottom && (
              <div
                style={{
                  position: "sticky",
                  bottom: 8,
                  float: "right",
                  cursor: "pointer",
                  zIndex: 2,
                }}
                onClick={scrollToBottom}
              >
                {unviewedMessageCount > 0 ? (
                  <Badge
                    fontSize="0.8em"
                    colorScheme="green"
                    bg="green.500"
                    color="white"
                    display="flex"
                    borderRadius="7px"
                    padding="3px 8px"
                    alignItems="center"
                  >
                    {unviewedMessageCount} New
                    <BsChevronDoubleDown style={{ marginLeft: "4px" }} />
                  </Badge>
                ) : (
                  <Box
                    bg="teal"
                    color="white"
                    p="2"
                    borderRadius="full"
                    boxShadow="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <BsChevronDoubleDown />
                  </Box>
                )}
              </div>
            )}
          </Box>

          {/* Typing Indicator Bar */}
          <Box h="20px" mt="2" pl="2">
            {getTypingText() && (
              <Text fontSize="xs" color="gray.500" fontStyle="italic" animation="pulse 1.5s infinite">
                {getTypingText()}
              </Text>
            )}
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}
