import { Box, Button, HStack, Input, Text } from "@chakra-ui/react";

export default function IdentitySheet({ guestName, tableId, onGuestNameChange, onTableIdChange, onClose }) {
  return (
    <Box className="locket-sheet">
      <Text fontWeight="bold">Bạn là ai?</Text>
      <Text fontSize="sm" color="gray.500">Tên này sẽ hiện dưới ảnh bạn đăng.</Text>
      <Input value={guestName} onChange={(event) => onGuestNameChange(event.target.value)} placeholder="Tên bạn" maxLength={64} />
      <Input value={tableId} onChange={(event) => onTableIdChange(event.target.value)} placeholder="Bàn / nhóm" maxLength={64} />
      <HStack>
        <Button colorPalette="orange" borderRadius="full" onClick={onClose} flex="1">Tiếp tục</Button>
        <Button variant="ghost" onClick={onClose}>Bỏ qua</Button>
      </HStack>
    </Box>
  );
}
