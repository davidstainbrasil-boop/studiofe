/**
 * PPTX Upload Modal
 * Provides PPTX file upload functionality
 */

'use client';

import React, { useState, useCallback } from 'react';

interface PPTXUploadModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onUploadComplete?: (data: { projectId: string; slides: unknown[] }) => void;
  onSuccess?: (projectId: string) => void;
}

export function PPTXUploadModal({ isOpen, open, onClose, onOpenChange, onUploadComplete, onSuccess }: PPTXUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const visible = isOpen ?? open ?? false;
  const close = () => {
    onClose?.();
    onOpenChange?.(false);
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/pptx/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      onUploadComplete?.(data);
      if (data.projectId) onSuccess?.(data.projectId);
      close();
    } catch {
      // Error handled by caller
    } finally {
      setUploading(false);
    }
  }, [onClose, onUploadComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">Upload PPTX</h2>
        <input
          type="file"
          accept=".pptx"
          onChange={handleFileSelect}
          disabled={uploading}
          className="w-full"
        />
        {uploading && <p className="text-sm text-gray-500 mt-2">Processando...</p>}
        <div className="flex justify-end mt-4">
          <button onClick={close} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
