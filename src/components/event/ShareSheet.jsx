import { Box, Button, Text } from "@chakra-ui/react";

export default function ShareSheet({ joinUrl, onCopy, onShare }) {
  return (
    <Box className="locket-share-card">
      <Text fontWeight="bold">Gửi link này cho khách</Text>
      <Text fontSize="xs" color="gray.600" wordBreak="break-all">{joinUrl}</Text>
      <Button size="sm" colorPalette="orange" onClick={onShare || onCopy} width="100%">
        Gửi link
      </Button>
      <Button size="xs" variant="ghost" onClick={onCopy}>Copy</Button>
    </Box>
  );
}
