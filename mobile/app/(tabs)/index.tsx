import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getUserCompanies, getCompanyTickets, getCompanyChats, Company, Ticket } from '../../src/lib/supabase';
import { colors, spacing } from '../../src/theme';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const companiesData = await getUserCompanies();
      setCompanies(companiesData);

      if (companiesData.length > 0) {
        const ticketsData = await getCompanyTickets(companiesData[0].id);
        setRecentTickets(ticketsData.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  const openTickets = recentTickets.filter(t => t.status === 'OPEN').length;
  const pendingTickets = recentTickets.filter(t => t.status === 'PENDING').length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, {profile?.display_name || user?.email?.split('@')[0] || 'Usuário'}!</Text>
        <Text style={styles.subtitle}>Bem-vindo ao Kanux</Text>
      </View>

      {/* Company Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suas Empresas</Text>
        {companies.length > 0 ? (
          <TouchableOpacity
            style={styles.companyCard}
            onPress={() => router.push('/company/select')}
          >
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{companies[0].name}</Text>
              <Text style={styles.companySlug}>#{companies[0].company_number}</Text>
            </View>
            <Text style={styles.changeText}>Trocar</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma empresa encontrada</Text>
            <TouchableOpacity style={styles.createButton}>
              <Text style={styles.createButtonText}>Criar Empresa</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumo</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.statusOpen }]}>
            <Text style={styles.statNumber}>{openTickets}</Text>
            <Text style={styles.statLabel}>Abertos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.statusPending }]}>
            <Text style={styles.statNumber}>{pendingTickets}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.success }]}>
            <Text style={styles.statNumber}>{recentTickets.filter(t => t.status === 'RESOLVED').length}</Text>
            <Text style={styles.statLabel}>Resolvidos</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/tickets/create')}
          >
            <Text style={styles.actionIcon}>🎫</Text>
            <Text style={styles.actionText}>Novo Ticket</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/chats')}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>Ver Chats</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Tickets */}
      {recentTickets.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tickets Recentes</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/tickets')}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {recentTickets.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              style={styles.ticketItem}
              onPress={() => router.push(`/ticket/${ticket.id}`)}
            >
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketNumber}>{ticket.number}</Text>
                <Text style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
                <Text style={styles.statusText}>{ticket.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'OPEN': return colors.statusOpen;
    case 'PENDING': return colors.statusPending;
    case 'RESOLVED': return colors.success;
    case 'CLOSED': return colors.textMuted;
    default: return colors.textMuted;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  companyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  companySlug: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changeText: {
    color: colors.primary,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  createButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  seeAll: {
    color: colors.primary,
    fontSize: 14,
  },
  ticketItem: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketNumber: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ticketTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
});

