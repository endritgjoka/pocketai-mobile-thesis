import { StyleSheet } from "react-native";

export const colors = {
  primary: "#2563EB",
  primaryPressed: "#1D4ED8",
  primaryDark: "#1D4ED8",
  background: "#FFFFFF",
  appBackground: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  border: "#E2E8F0",
  assistantBubble: "#F1F5F9",
  userBubble: "#2563EB",
  userBubbleText: "#FFFFFF",
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
  danger: "#DC2626",
  darkBackground: "#0B0F19",
  darkSurface: "#111827",
  darkSurfaceMuted: "#1F2937",
  darkBorder: "#334155",
  darkText: "#F8FAFC",
  darkTextSecondary: "#CBD5E1"
};

export const typography = {
  screenTitle: { fontSize: 28, fontWeight: "700" as const },
  headerTitle: { fontSize: 22, fontWeight: "700" as const },
  title: { fontSize: 28, fontWeight: "700" as const },
  heading: { fontSize: 22, fontWeight: "700" as const },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const },
  cardTitle: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  secondary: { fontSize: 14, fontWeight: "400" as const },
  button: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "400" as const }
};

export const radii = {
  card: 18,
  button: 16,
  input: 22,
  bubble: 20,
  sheet: 24,
  pill: 999
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

export const shadows = StyleSheet.create({
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  composer: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8
  }
});

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };
