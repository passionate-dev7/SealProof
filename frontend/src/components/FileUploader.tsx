'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import NextImage from 'next/image';
import { Upload, X, FileText, Image, Video, Music, File } from 'lucide-react';
import { formatFileSize } from '../lib/formatters';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  disabled?: boolean;
}

export default function FileUploader({
  onFileSelect,
  accept,
  maxSize = 100 * 1024 * 1024, // 100MB default
  disabled = false,
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileSelect(file);

        // Generate preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          setPreview(null);
        }
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled,
  });

  const removeFile = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-8 w-8" aria-label="Image file" />;
    if (file.type.startsWith('video/')) return <Video className="h-8 w-8" aria-label="Video file" />;
    if (file.type.startsWith('audio/')) return <Music className="h-8 w-8" aria-label="Audio file" />;
    if (file.type.includes('pdf') || file.type.includes('document')) return <FileText className="h-8 w-8" aria-label="Document file" />;
    return <File className="h-8 w-8" aria-label="File" />;
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
              : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-primary-100 dark:bg-primary-900 rounded-full">
              <Upload className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isDragActive ? 'Drop your file here' : 'Drag & drop a file here'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Maximum file size: {formatFileSize(maxSize)}
            </p>
          </div>
        </div>
      ) : (
        <div className="card animate-fade-in">
          <div className="flex items-start space-x-4">
            {preview ? (
              <NextImage
                src={preview}
                alt="File preview"
                width={80}
                height={80}
                className="w-20 h-20 object-cover rounded-lg"
                unoptimized
              />
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                {getFileIcon(selectedFile)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatFileSize(selectedFile.size)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {selectedFile.type || 'Unknown type'}
              </p>
            </div>
            <button
              onClick={removeFile}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              disabled={disabled}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {fileRejections.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-400">
            File rejected:
          </p>
          <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
            {fileRejections[0].errors.map((error) => (
              <li key={error.code}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
