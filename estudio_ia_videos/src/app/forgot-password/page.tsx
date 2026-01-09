'use client';

import { useState } from 'react';
import { Metadata } from 'next';

export default function ForgotPasswordPage() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
                <div className="w-full max-w-md space-y-6 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Email de recuperação enviado</h1>
                    <p className="text-muted-foreground">Verifique sua caixa de entrada</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Recuperar Senha</h1>
                    <p className="text-muted-foreground">Digite seu email para receber instruções</p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Enviar Email de Recuperação
                    </button>
                </form>
            </div>
        </div>
    );
}
