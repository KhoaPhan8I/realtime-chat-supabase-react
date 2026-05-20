import { Button, HStack } from "@chakra-ui/react";

export default function EventControls({ onOpenAlbum, onOpenCamera, onPrevious, onNext, disabled, hasItems }) {
  return (
    <HStack className="locket-bottom" justify="space-between">
      <Button variant="ghost" color="white" onClick={onOpenAlbum} disabled={disabled}>
        Album
      </Button>
      <button className="locket-shutter" onClick={onOpenCamera} disabled={disabled} aria-label="Mở camera">
        <span>{disabled ? "..." : ""}</span>
      </button>
      <Button variant="ghost" color="white" onClick={hasItems ? onNext : onPrevious} disabled={!hasItems}>
        Tiếp
      </Button>
    </HStack>
  );
}
