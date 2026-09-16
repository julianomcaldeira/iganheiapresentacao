import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import iganheiLogo from '@/assets/iganhei-logo.png';
import authBackground from '@/assets/auth-background.jpg';

// Validation schemas
const emailSchema = z.string().email('E-mail inválido').max(255, 'E-mail muito longo');
const passwordSchema = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(72, 'Senha muito longa');

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export default function Auth() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      loginSchema.parse(loginForm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setIsLoading(false);

    if (error) {
      const msg = error.message || '';
      if (msg.includes('Invalid login credentials')) {
        toast.error('E-mail ou senha incorretos');
      } else if (msg.includes('Email not confirmed')) {
        toast.error('Por favor, confirme seu e-mail antes de fazer login');
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        toast.error('Sem conexão com o servidor. Tente novamente em instantes.');
      } else if (msg.includes('Database error') || msg.includes('unexpected_failure') || msg.includes('503')) {
        toast.error('O servidor está temporariamente indisponível. Aguarde alguns instantes e tente novamente.');
      } else if (msg.includes('Too many requests') || msg.includes('rate limit')) {
        toast.error('Muitas tentativas. Aguarde um minuto e tente novamente.');
      } else {
        toast.error(`Erro ao fazer login: ${msg || 'tente novamente.'}`);
      }
      console.error('[Auth] login error:', error);
      return;
    }


    toast.success('Login realizado com sucesso!');
    navigate('/');
  };

  if (user) {
    return null;
  }

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 bg-white"
      style={{
        backgroundImage: `url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Soft white overlay */}
      <div className="absolute inset-0 bg-white/30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo acima do card */}
        <div className="flex flex-col items-center justify-center mb-6">
          <img src={iganheiLogo} alt="i-Ganhei" className="h-20 w-auto object-contain" />
          <p className="text-sm text-muted-foreground mt-2">Gestão de Licitações</p>
        </div>

        <Card className="border-border/50 shadow-2xl backdrop-blur-md bg-card/95">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Acesso ao Sistema</CardTitle>
            <CardDescription>
              Entre com suas credenciais para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Não possui acesso? Entre em contato com o administrador do sistema.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
