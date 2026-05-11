import { Alert } from "react-native";

export const confirmDestructive = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm }
  ]);
};
