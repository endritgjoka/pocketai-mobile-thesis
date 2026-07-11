import React, { memo, useCallback, useEffect, useState } from "react";
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, radii, shadows, spacing } from "../../config/theme";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  onStop?: () => void;
  placeholder?: string;
  bottomInset: number;
};

const INPUT_FONT_SIZE = 15;
const INPUT_LINE_HEIGHT = 20;
const INPUT_VERTICAL_PADDING = 20;
const ONE_LINE_HEIGHT = INPUT_LINE_HEIGHT + INPUT_VERTICAL_PADDING;
const TWO_LINE_HEIGHT = INPUT_LINE_HEIGHT * 2 + INPUT_VERTICAL_PADDING;
const THREE_LINE_HEIGHT = INPUT_LINE_HEIGHT * 3 + INPUT_VERTICAL_PADDING;
const MIN_INPUT_HEIGHT = ONE_LINE_HEIGHT;
const MAX_INPUT_HEIGHT = THREE_LINE_HEIGHT;
const MAX_VISIBLE_LINES = 3;
const WRAPPER_VERTICAL_PADDING = 12;
const APPROX_CHARACTER_WIDTH = INPUT_FONT_SIZE * 0.52;

const heightForLines = (lineCount: number) => {
  const visibleLines = Math.min(Math.max(lineCount, 1), MAX_VISIBLE_LINES);
  if (visibleLines === 1) return ONE_LINE_HEIGHT;
  if (visibleLines === 2) return TWO_LINE_HEIGHT;
  return THREE_LINE_HEIGHT;
};

const explicitLineCount = (text: string) => Math.max(1, text.split("\n").length);

const wrappedLineEstimate = (text: string, inputWidth: number) => {
  if (!inputWidth) return explicitLineCount(text);
  const charsPerLine = Math.max(8, Math.floor(inputWidth / APPROX_CHARACTER_WIDTH));
  return text.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
};

export const ChatComposer = memo(function ChatComposer({ value, onChangeText, onSend, disabled, isGenerating, onStop, placeholder = "Message PocketAI...", bottomInset }: Props) {
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [inputScrollable, setInputScrollable] = useState(false);
  const [inputWidth, setInputWidth] = useState(0);
  const canSend = Boolean(value.trim()) && !disabled && !isGenerating;
  const showStop = Boolean(isGenerating && onStop);
  const hasExpanded = inputHeight > MIN_INPUT_HEIGHT + 2;

  const applyLineCount = useCallback((lineCount: number) => {
    const nextHeight = heightForLines(lineCount);
    setInputHeight((current) => (Math.abs(current - nextHeight) > 1 ? nextHeight : current));
    setInputScrollable(lineCount > MAX_VISIBLE_LINES);
  }, []);

  useEffect(() => {
    if (value.length === 0) {
      setInputHeight(MIN_INPUT_HEIGHT);
      setInputScrollable(false);
      return;
    }

    applyLineCount(Math.max(explicitLineCount(value), wrappedLineEstimate(value, inputWidth)));
  }, [applyLineCount, inputWidth, value]);

  const handleInputLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Math.floor(event.nativeEvent.layout.width);
    setInputWidth((current) => (Math.abs(current - width) > 1 ? width : current));
  }, []);

  const handleTextChange = useCallback((nextValue: string) => {
    onChangeText(nextValue);
    if (nextValue.length === 0) {
      setInputHeight(MIN_INPUT_HEIGHT);
      setInputScrollable(false);
      return;
    }

    applyLineCount(Math.max(explicitLineCount(nextValue), wrappedLineEstimate(nextValue, inputWidth)));
  }, [applyLineCount, inputWidth, onChangeText]);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset, spacing.sm) }]}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={handleTextChange}
          onLayout={handleInputLayout}
          placeholder={disabled ? "Download or load a model first" : placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!disabled && !isGenerating}
          multiline
          scrollEnabled={inputScrollable}
          style={[styles.input, { height: inputHeight }]}
          returnKeyType="default"
          blurOnSubmit={false}
          keyboardAppearance="light"
          textAlignVertical={Platform.OS === "android" ? (hasExpanded ? "top" : "center") : undefined}
          underlineColorAndroid="transparent"
          disableFullscreenUI
        />
        <Pressable
          onPress={showStop ? onStop : onSend}
          disabled={!showStop && !canSend}
          style={({ pressed }) => [styles.sendButton, (!showStop && !canSend) && styles.sendDisabled, pressed && (showStop || canSend) && styles.pressed]}
        >
          <Ionicons name={showStop ? "square" : "arrow-up"} size={19} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    ...(Platform.OS === "ios" ? shadows.composer : {})
  },
  inputWrapper: {
    minHeight: MIN_INPUT_HEIGHT + WRAPPER_VERTICAL_PADDING,
    maxHeight: MAX_INPUT_HEIGHT + WRAPPER_VERTICAL_PADDING,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.appBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingLeft: 14,
    paddingRight: 6,
    paddingTop: WRAPPER_VERTICAL_PADDING / 2,
    paddingBottom: WRAPPER_VERTICAL_PADDING / 2
  },
  input: {
    flex: 1,
    minHeight: MIN_INPUT_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
    fontSize: INPUT_FONT_SIZE,
    lineHeight: INPUT_LINE_HEIGHT,
    color: colors.textPrimary,
    paddingTop: INPUT_VERTICAL_PADDING / 2,
    paddingBottom: INPUT_VERTICAL_PADDING / 2,
    paddingHorizontal: 0,
    margin: 0,
    includeFontPadding: false
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    marginLeft: 6,
    marginBottom: 2
  },
  sendDisabled: { backgroundColor: "#CBD5E1" },
  pressed: { opacity: 0.78 }
});
