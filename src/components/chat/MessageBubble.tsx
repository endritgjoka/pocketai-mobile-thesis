import React, { memo, useEffect, useRef } from "react";
import { Alert, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "../../config/theme";
import { InferenceStats, Message } from "../../types";
import { formatShortDate } from "../../utils/dates";

type Props = { message?: Message; draft?: { id: string; role: "assistant"; content: string; createdAt: string; stats?: InferenceStats | null }; isStreaming?: boolean; onDelete?: () => void; onRegenerate?: () => void };

function StreamingCursor() {
  const opacity = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.25, duration: 420, useNativeDriver: true })
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.Text style={[styles.cursor, { opacity }]}> |</Animated.Text>;
}

function ThinkingDots() {
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const pulse = (value: Animated.Value, delay: number) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0.25, duration: 260, useNativeDriver: true }),
      Animated.delay(260)
    ]));
    const animations = [pulse(dot1, 0), pulse(dot2, 140), pulse(dot3, 280)];
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dot1, dot2, dot3]);
  return (
    <View style={styles.thinkingRow}>
      <Text style={styles.thinkingText}>Thinking</Text>
      <Animated.Text style={[styles.thinkingDot, { opacity: dot1 }]}>.</Animated.Text>
      <Animated.Text style={[styles.thinkingDot, { opacity: dot2 }]}>.</Animated.Text>
      <Animated.Text style={[styles.thinkingDot, { opacity: dot3 }]}>.</Animated.Text>
    </View>
  );
}

export const MessageBubble = memo(function MessageBubble({ message, draft, isStreaming, onDelete, onRegenerate }: Props) {
  const item = message ?? draft;
  if (!item) return null;
  const isUser = item.role === "user";
  const showStats = !isUser && item.stats && !isStreaming;
  const openActions = () => {
    if (!message) return;
    Alert.alert("Message", undefined, [
      ...(!isUser && onRegenerate ? [{ text: "Regenerate", onPress: onRegenerate }] : []),
      { text: "Delete", style: "destructive", onPress: onDelete },
      { text: "Cancel", style: "cancel" }
    ]);
  };
  const hasContent = Boolean(item.content.trim());
  return (
    <Pressable onLongPress={openActions} delayLongPress={280}>
      <View style={[styles.row, isUser && styles.userRow]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          {!isUser && isStreaming && !hasContent ? (
            <ThinkingDots />
          ) : (
            <Text style={[styles.content, isUser && styles.userText]}>{item.content}{isStreaming && !isUser ? <StreamingCursor /> : null}</Text>
          )}
        </View>
      </View>
      <View style={[styles.metaRow, isUser && styles.userMetaRow]}>
        <Text style={styles.meta}>{formatShortDate(item.createdAt)}</Text>
        {showStats ? <Text style={styles.meta}> · {item.stats?.tokensPerSecond?.toFixed(1) ?? "0"} tok/s · {((item.stats?.totalTimeMs ?? 0) / 1000).toFixed(1)}s · {item.stats?.contextSize} ctx</Text> : null}
      </View>
    </Pressable>
  );
}, (prev, next) => prev.message?.id === next.message?.id && prev.message?.content === next.message?.content && prev.message?.stats === next.message?.stats && prev.draft?.content === next.draft?.content && prev.isStreaming === next.isStreaming);

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "flex-start", marginTop: spacing.sm },
  userRow: { justifyContent: "flex-end" },
  bubble: { maxWidth: "92%", borderRadius: radii.bubble, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { maxWidth: "82%", backgroundColor: colors.userBubble, borderBottomRightRadius: 6 },
  assistantBubble: { backgroundColor: colors.assistantBubble, borderBottomLeftRadius: 6 },
  content: { ...typography.body, color: colors.textPrimary, lineHeight: 21 },
  userText: { color: colors.userBubbleText },
  cursor: { color: colors.primary, fontWeight: "700" },
  thinkingRow: { flexDirection: "row", alignItems: "center", minHeight: 21 },
  thinkingText: { ...typography.body, color: colors.textSecondary, lineHeight: 21 },
  thinkingDot: { ...typography.body, color: colors.primary, fontWeight: "700", lineHeight: 21 },
  metaRow: { flexDirection: "row", marginTop: 4, marginLeft: 4, marginBottom: 2 },
  userMetaRow: { justifyContent: "flex-end", marginRight: 4 },
  meta: { ...typography.caption, color: colors.textMuted }
});
