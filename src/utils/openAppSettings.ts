import { Linking } from "react-native";

export const openAppSettings = async () => {
  await Linking.openSettings();
};
