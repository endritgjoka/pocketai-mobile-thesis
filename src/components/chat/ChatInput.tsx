import React, { useState } from "react";
import { ChatComposer } from "./ChatComposer";

export function ChatInput({ disabled, loading, onSend }: { disabled?: boolean; loading?: boolean; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <ChatComposer
      value={text}
      onChangeText={setText}
      disabled={disabled}
      isGenerating={loading}
      bottomInset={0}
      onSend={() => {
        const value = text.trim();
        if (!value) return;
        setText("");
        onSend(value);
      }}
    />
  );
}
