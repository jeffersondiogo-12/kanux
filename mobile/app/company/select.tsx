import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getUserCompanies, Company } from '../../src/lib/supabase';
import { colors, spacing } from '../../src/theme';

export default function SelectCompanyScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const data = await getUserCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecionar Empresa</Text>
      <Text style={styles.subtitle}>
        Escolha qual empresa você deseja acessar
      </Text>

      <FlatList
        data={companies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.companyItem}
            onPress={() => router.back()}
          >
            <View style={styles.companyIcon}>
              <Text style={styles.companyIconText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{item.name}</Text>
              <Text style={styles.companySlug}>#{item.company_number}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma empresa encontrada</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  companyItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyIconText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  companyInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  companySlug: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});

