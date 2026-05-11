import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "../ui/AppButton";
import { StatusBadge } from "../ui/StatusBadge";
import { colors, spacing, typography } from "../../config/theme";
import { PermissionStatus } from "../../types/permissions";

const labelForStatus = (status: PermissionStatus, connectedLabel: string) => {
  switch (status) {
    case "checking":
    case "unknown":
      return "Checking...";
    case "granted":
      return connectedLabel;
    case "denied":
      return "Permission denied";
    case "restricted":
      return "Restricted";
    case "unsupported":
      return "Unsupported";
    case "not_determined":
    default:
      return "Not determined";
  }
};

const toneForStatus = (status: PermissionStatus) => {
  if (status === "granted") return "success";
  if (status === "denied" || status === "restricted") return "danger";
  if (status === "unsupported") return "neutral";
  return "warning";
};

type Props = {
  label?: string;
  status: PermissionStatus;
  connectedLabel?: string;
  helperText?: string;
  requestLabel?: string;
  onRequest?: () => void;
  onOpenSettings?: () => void;
  loading?: boolean;
};

export function PermissionStatusRow({
  label = "Permission",
  status,
  connectedLabel = "Granted",
  helperText,
  requestLabel = "Request Permission",
  onRequest,
  onOpenSettings,
  loading
}: Props) {
  const canRequest = status === "not_determined" && Boolean(onRequest);
  const canOpenSettings = (status === "denied" || status === "restricted") && Boolean(onOpenSettings);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.textWrap}>
          <Text style={styles.label}>{label}</Text>
          {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
        </View>
        <StatusBadge label={labelForStatus(status, connectedLabel)} tone={toneForStatus(status) as any} />
      </View>
      {canRequest ? <AppButton title={requestLabel} icon="shield-checkmark-outline" onPress={onRequest!} loading={loading} style={styles.button} /> : null}
      {canOpenSettings ? <AppButton title="Open Settings" icon="settings-outline" variant="secondary" onPress={onOpenSettings!} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  row: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  textWrap: { flex: 1 },
  label: { ...typography.body, color: colors.textPrimary, fontWeight: "700" },
  helper: { ...typography.caption, color: colors.textMuted, marginTop: 3, lineHeight: 18 },
  button: { width: "100%" }
});
