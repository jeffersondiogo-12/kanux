import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors, spacing } from '../../src/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (!isSignUp && !companySlug) {
      Alert.alert('Erro', 'Informe o número da empresa');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        Alert.alert('Sucesso', 'Conta criada! Verifique seu email para confirmar.');
      } else {
        // Usar API para verificar empresa (bypass RLS)
        try {
          const response = await fetch('https://jeffersondiogo-12s-projects-kanux.vercel.app/api/verify-company', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ company_number: companySlug.trim() }),
          });
          
          const text = await response.text();
          let result;
          try {
            result = JSON.parse(text);
          } catch {
            Alert.alert('Erro', `Erro do servidor: ${text.substring(0, 100)}`);
            setLoading(false);
            return;
          }
          
          if (!response.ok || result.error) {
            Alert.alert('Erro', result.error || 'Empresa não encontrada');
            setLoading(false);
            return;
          }
          
          // Empresa encontrada, fazer login
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          
          router.replace('/(tabs)');
        } catch (apiError: any) {
          Alert.alert('Erro', apiError.message || 'Erro ao verificar empresa');
          setLoading(false);
          return;
        }
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro ao autenticar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Kanux</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Crie sua conta' : 'Bem-vindo de volta'}
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        {!isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="número da empresa"
            placeholderTextColor={colors.textMuted}
            value={companySlug}
            onChangeText={setCompanySlug}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? 'Criar Conta' : 'Entrar'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.linkText}>
            {isSignUp
              ? 'Já tem uma conta? Entre'
              : 'Não tem uma conta? Cadastre-se'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 17,
  },
});

