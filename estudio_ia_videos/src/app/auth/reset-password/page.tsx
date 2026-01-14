import { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@components/auth/reset-password-form';
import { Video, Loader2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Redefinir Senha | Estúdio IA de Vídeos',
  description: 'Defina uma nova senha para sua conta',
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container relative min-h-screen flex-col items-center justify-center flex px-4">
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
          {/* Logo */}
          <div className="flex flex-col space-y-2 text-center">
            <div className="flex items-center justify-center mb-2">
              <Video className="h-8 w-8 text-primary" />
            </div>
          </div>

          <Suspense fallback={<LoadingFallback />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
