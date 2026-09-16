import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Send, Loader2, CheckCircle, XCircle } from "lucide-react";

const TesteEmail = () => {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("Teste de Email - i-Ganhei CRM");
  const [html, setHtml] = useState(`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #1e40af;">Teste de Email</h1>
  <p>Este é um email de teste enviado via <strong>AWS SES</strong>.</p>
  <p>Se você recebeu este email, a configuração está funcionando corretamente!</p>
  <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">i-Ganhei CRM - Sistema de Gestão de Licitações</p>
</div>`);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendEmail = async () => {
    if (!to) {
      toast.error("Informe o email de destino");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-email-ses", {
        body: { to, subject, html },
      });

      if (error) throw error;

      if (data?.success) {
        setResult({ success: true, message: "Email enviado com sucesso!" });
        toast.success("Email enviado com sucesso!");
      } else {
        throw new Error(data?.error || "Erro ao enviar email");
      }
    } catch (error: any) {
      console.error("Erro ao enviar email:", error);
      const errorMessage = error.message || "Erro ao enviar email";
      setResult({ success: false, message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title="Teste de Email" subtitle="Teste o envio de emails via AWS SES">
      <div className="space-y-6">

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configuração do Email
              </CardTitle>
              <CardDescription>
                Preencha os campos para enviar um email de teste
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="to">Email de Destino *</Label>
                <Input
                  id="to"
                  type="email"
                  placeholder="destinatario@email.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  placeholder="Assunto do email"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="html">Conteúdo HTML</Label>
                <Textarea
                  id="html"
                  placeholder="<h1>Título</h1><p>Conteúdo...</p>"
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <Button 
                onClick={handleSendEmail} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Email de Teste
                  </>
                )}
              </Button>

              {result && (
                <div className={`p-4 rounded-lg flex items-start gap-3 ${
                  result.success 
                    ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400" 
                    : "bg-destructive/10 border border-destructive/20 text-destructive"
                }`}>
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">{result.success ? "Sucesso!" : "Erro"}</p>
                    <p className="text-sm opacity-80">{result.message}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview do Email</CardTitle>
              <CardDescription>
                Visualização do conteúdo HTML
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="border rounded-lg p-4 bg-white min-h-[300px]"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default TesteEmail;
