/**
 * 📤 File Upload Components
 * Drag & Drop file upload with preview support
 */

'use client'

import * as React from 'react'
import { useDropzone, FileRejection, Accept } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  X, 
  File, 
  Image, 
  Video, 
  Music, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'

// File with preview
interface FileWithPreview extends File {
  preview?: string
}

// Upload status
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface UploadedFile {
  file: FileWithPreview
  status: UploadStatus
  progress: number
  error?: string
}

// Get file icon based on type
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image
  if (type.startsWith('video/')) return Video
  if (type.startsWith('audio/')) return Music
  if (type.includes('pdf') || type.includes('document')) return FileText
  return File
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// File Preview Component
interface FilePreviewProps {
  file: UploadedFile
  onRemove: () => void
  showPreview?: boolean
}

function FilePreview({ file, onRemove, showPreview = true }: FilePreviewProps) {
  const Icon = getFileIcon(file.file.type)
  const isImage = file.file.type.startsWith('image/')

  return (
    <div className="relative flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
      {/* Preview or Icon */}
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded bg-background border overflow-hidden">
        {showPreview && isImage && file.file.preview ? (
          <img
            src={file.file.preview}
            alt={file.file.name}
            className="w-full h-full object-cover"
            onLoad={() => {
              if (file.file.preview) {
                URL.revokeObjectURL(file.file.preview)
              }
            }}
          />
        ) : (
          <Icon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.file.size)}
        </p>
        
        {/* Progress */}
        {file.status === 'uploading' && (
          <Progress value={file.progress} className="h-1 mt-2" />
        )}
        
        {/* Error */}
        {file.status === 'error' && file.error && (
          <p className="text-xs text-destructive mt-1">{file.error}</p>
        )}
      </div>

      {/* Status Icon */}
      <div className="flex-shrink-0">
        {file.status === 'uploading' && (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        {file.status === 'success' && (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        )}
        {file.status === 'error' && (
          <AlertCircle className="h-5 w-5 text-destructive" />
        )}
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 absolute -top-2 -right-2 rounded-full bg-background border shadow-sm"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Main Dropzone Component
interface FileDropzoneProps {
  accept?: Accept
  maxSize?: number
  maxFiles?: number
  multiple?: boolean
  disabled?: boolean
  className?: string
  onFilesSelected?: (files: File[]) => void
  onUpload?: (files: File[]) => Promise<void>
  showPreviews?: boolean
  helperText?: string
}

export function FileDropzone({
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'video/*': ['.mp4', '.webm', '.mov'],
    'audio/*': ['.mp3', '.wav', '.ogg'],
  },
  maxSize = 100 * 1024 * 1024, // 100MB
  maxFiles = 10,
  multiple = true,
  disabled = false,
  className,
  onFilesSelected,
  onUpload,
  showPreviews = true,
  helperText,
}: FileDropzoneProps) {
  const [files, setFiles] = React.useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = React.useState(false)

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Add preview URLs for images
      const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
        file: Object.assign(file, {
          preview: file.type.startsWith('image/') 
            ? URL.createObjectURL(file) 
            : undefined,
        }),
        status: 'idle' as UploadStatus,
        progress: 0,
      }))

      // Add rejected files with errors
      const rejectedFilesWithErrors: UploadedFile[] = rejectedFiles.map(
        ({ file, errors }) => ({
          file: file as FileWithPreview,
          status: 'error' as UploadStatus,
          progress: 0,
          error: errors.map(e => e.message).join(', '),
        })
      )

      setFiles(prev => [...prev, ...newFiles, ...rejectedFilesWithErrors])
      
      if (onFilesSelected) {
        onFilesSelected(acceptedFiles)
      }
    },
    [onFilesSelected]
  )

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: multiple ? maxFiles : 1,
    multiple,
    disabled: disabled || isUploading,
  })

  // Remove file
  const handleRemove = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      const removed = newFiles.splice(index, 1)[0]
      if (removed.file.preview) {
        URL.revokeObjectURL(removed.file.preview)
      }
      return newFiles
    })
  }

  // Clear all files
  const handleClearAll = () => {
    files.forEach(f => {
      if (f.file.preview) {
        URL.revokeObjectURL(f.file.preview)
      }
    })
    setFiles([])
  }

  // Upload files
  const handleUpload = async () => {
    if (!onUpload) return

    const pendingFiles = files.filter(f => f.status === 'idle')
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    // Update status to uploading
    setFiles(prev =>
      prev.map(f =>
        f.status === 'idle' ? { ...f, status: 'uploading' as UploadStatus } : f
      )
    )

    try {
      await onUpload(pendingFiles.map(f => f.file))
      
      // Update status to success
      setFiles(prev =>
        prev.map(f =>
          f.status === 'uploading'
            ? { ...f, status: 'success' as UploadStatus, progress: 100 }
            : f
        )
      )
    } catch (error) {
      // Update status to error
      setFiles(prev =>
        prev.map(f =>
          f.status === 'uploading'
            ? {
                ...f,
                status: 'error' as UploadStatus,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      )
    } finally {
      setIsUploading(false)
    }
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.file.preview) {
          URL.revokeObjectURL(f.file.preview)
        }
      })
    }
  }, [])

  const pendingCount = files.filter(f => f.status === 'idle').length
  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          'hover:border-primary hover:bg-primary/5',
          isDragActive && 'border-primary bg-primary/10',
          isDragAccept && 'border-green-500 bg-green-500/10',
          isDragReject && 'border-destructive bg-destructive/10',
          (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        
        <Upload className={cn(
          'h-10 w-10 mb-4 text-muted-foreground',
          isDragAccept && 'text-green-500',
          isDragReject && 'text-destructive'
        )} />
        
        {isDragActive ? (
          <p className="text-sm text-center">
            {isDragAccept && 'Solte os arquivos aqui...'}
            {isDragReject && 'Alguns arquivos não são permitidos'}
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-center">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {helperText || `Máximo ${formatFileSize(maxSize)} por arquivo`}
            </p>
          </>
        )}
      </div>

      {/* File List */}
      {showPreviews && files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} arquivo{files.length !== 1 && 's'}
              {successCount > 0 && ` (${successCount} enviado${successCount !== 1 && 's'})`}
              {errorCount > 0 && ` (${errorCount} erro${errorCount !== 1 && 's'})`}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={isUploading}
            >
              Limpar tudo
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file, index) => (
              <FilePreview
                key={`${file.file.name}-${index}`}
                file={file}
                onRemove={() => handleRemove(index)}
                showPreview={showPreviews}
              />
            ))}
          </div>

          {/* Upload Button */}
          {onUpload && pendingCount > 0 && (
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar {pendingCount} arquivo{pendingCount !== 1 && 's'}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Preset configurations
export const ACCEPT_IMAGES: Accept = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
}

export const ACCEPT_VIDEOS: Accept = {
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
}

export const ACCEPT_AUDIO: Accept = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
}

export const ACCEPT_DOCUMENTS: Accept = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
}

export const ACCEPT_PPTX: Accept = {
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
}
