import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@lib/supabase/server';
import { SecuritySettings } from '@components/auth/security-settings';
import { Separator } from '@components/ui/separator';

export const metadata: Metadata = {
  title: 'Segurança | Configurações',
  description: 'Gerencie as configurações de segurança da sua conta',
};

export default async function SecuritySettingsPage() {
  const supabase = createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login?redirect=/settings/security');
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Segurança</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações de segurança e privacidade da sua conta
          </p>
        </div>

        <Separator />

        <SecuritySettings userId={user.id} />
      </div>
    </div>
  );
}
