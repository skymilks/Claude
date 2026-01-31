'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
}

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

export default function FileUpload({ onFilesSelected }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const filterValidFiles = (files: FileList | null): File[] => {
    if (!files) return [];
    return Array.from(files).filter(file => ALLOWED_TYPES.includes(file.type));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const validFiles = filterValidFiles(e.dataTransfer.files);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const validFiles = filterValidFiles(e.target.files);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleChange}
        accept=".pdf,.docx,.xlsx"
        className="hidden"
      />

      <div className="flex flex-col items-center gap-3">
        <Upload className={`w-8 h-8 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
        <div>
          <p className="text-lg font-medium text-gray-700">
            Drag and drop your files here
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or click to select files
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Supported formats: PDF, Word (.docx), Excel (.xlsx)
          </p>
        </div>
      </div>
    </div>
  );
}
