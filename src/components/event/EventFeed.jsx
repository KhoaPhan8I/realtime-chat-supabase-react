import { Badge, Box, Button, Heading, HStack, Image, Text, VStack } from "@chakra-ui/react";
import ReactionTray from "./ReactionTray";

function MediaView({ item }) {
  if (!item) return null;
  if (item.media_type === "video") {
    return <video src={item.original_url} muted loop playsInline autoPlay controls={false} />;
  }
  return <Image src={item.thumbnail_url || item.original_url} alt={item.guest_name} />;
}

export default function EventFeed({
  items,
  activeIndex,
  setActiveIndex,
  loading,
  onOpenCamera,
  newCount,
  onShowLatest,
  reactions,
  onReact,
}) {
  const activeItem = items[activeIndex] || items[0];
  const goNext = () => setActiveIndex((index) => (items.length ? Math.min(index + 1, items.length - 1) : 0));
  const goPrevious = () => setActiveIndex((index) => Math.max(index - 1, 0));

  return (
    <Box className="locket-feed">
      {loading ? (
        <VStack color="white" textAlign="center">
          <Box className="locket-loading-dot" />
          <Text>Đang tải live feed...</Text>
        </VStack>
      ) : activeItem ? (
        <>
          <MediaView item={activeItem} />
          <button className="locket-tap-zone-left" onClick={goPrevious} aria-label="Ảnh trước" />
          <button className="locket-tap-zone-right" onClick={goNext} aria-label="Ảnh tiếp" />

          <Box className="locket-caption">
            <HStack gap="2" mb="2">
              <Badge colorPalette="orange">{activeIndex + 1}/{items.length}</Badge>
              {newCount > 0 && (
                <Button size="xs" className="locket-new-pill" onClick={onShowLatest}>
                  {newCount} mới
                </Button>
              )}
            </HStack>
            <Text fontWeight="bold">{activeItem.guest_name}</Text>
            {activeItem.caption && <Text fontSize="sm" color="orange.300" fontStyle="italic" mb="1">{activeItem.caption}</Text>}
            <Text fontSize="sm" opacity="0.75">{activeItem.table_id || "vừa đăng"}</Text>
            <ReactionTray
              mediaId={activeItem.id}
              counts={reactions[activeItem.id] || {}}
              onReact={(emoji) => onReact(activeItem.id, emoji)}
            />
          </Box>
        </>
      ) : (
        <VStack color="white" textAlign="center" px="8">
          <Heading size="2xl">Chưa có ảnh</Heading>
          <Text opacity="0.75">Bấm nút tròn để đăng khoảnh khắc đầu tiên.</Text>
          <Button colorPalette="orange" borderRadius="full" onClick={onOpenCamera}>Mở camera</Button>
        </VStack>
      )}
    </Box>
  );
}
