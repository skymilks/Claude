'use client';

import { FileText, File, Sheet, X } from 'lucide-react';

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

function getFileIcon(file: File) {
  if (file.type === 'application/pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return <File className="w-5 h-5 text-blue-500" />;
  }
  if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return <Sheet className="w-5 h-5 text-green-500" />;
  }
  return <FileText className="w-5 h-5 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">
        Uploaded Files ({files.length})
      </h3>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${file.size}-${index}`}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <button
              onClick={() => onRemove(index)}
              className="ml-4 p-1 hover:bg-red-50 rounded-md transition-colors"
              aria-label="Remove file"
            >
              <X className="w-5 h-5 text-red-500 hover:text-red-700" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
