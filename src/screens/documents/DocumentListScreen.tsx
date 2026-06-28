import React, { useCallback, useState } from "react";
import { Alert, FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { DocumentRow } from "../../components/document/DocumentRow";
import { AppButton } from "../../components/ui/AppButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { documentRepository } from "../../repositories/documentRepository";
import { documentProcessor } from "../../services/rag/documentProcessor";
import { useSettingsStore } from "../../store/useSettingsStore";
import { DocumentRecord } from "../../types";
import { colors, spacing, typography } from "../../config/theme";
import { toUserMessage } from "../../utils/errors";

export function DocumentListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const chunkSize = useSettingsStore((state) => state.ragChunkSize);
  const load = useCallback(async () => setDocuments(await documentRepository.listDocuments()), []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const importDoc = useCallback(async () => {
    try {
      setLoading(true);
      const doc = await documentProcessor.pickAndImport(chunkSize);
      await load();
      if (doc) navigation.navigate("DocumentDetail", { documentId: doc.id });
    } catch (error) {
      Alert.alert("Import failed", toUserMessage(error));
    } finally {
      setLoading(false);
    }
  }, [chunkSize, load, navigation]);

  const renderDocument = useCallback(({ item }: { item: DocumentRecord }) => (
    <DocumentRow document={item} onPress={() => navigation.navigate("DocumentDetail", { documentId: item.id })} />
  ), [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>Local files for chunking and RAG tests</Text>
        </View>
        <AppButton title="Import" icon="add" loading={loading} onPress={importDoc} style={styles.importButton} />
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>TXT is fully supported. PDF/DOCX are imported with a clear placeholder until native text extraction is added.</Text>
      </View>
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={renderDocument}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        ListEmptyComponent={<EmptyState icon="document-text-outline" title="No documents yet" body="Import a TXT file to run local chunking, retrieval, and document Q&A experiments." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBackground },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  headerText: { flex: 1 },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.secondary, color: colors.textSecondary, marginTop: 3 },
  importButton: { minHeight: 42, paddingHorizontal: 14 },
  notice: { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", padding: spacing.md },
  noticeText: { ...typography.secondary, color: colors.textPrimary, lineHeight: 20 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 }
});
