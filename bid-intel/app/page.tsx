'use client';

import { useState } from 'react';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bid Intelligence
          </h1>
          <p className="text-gray-600 mb-8">
            Upload your bid and tender documents for analysis
          </p>

          <FileUpload onFilesSelected={handleFilesSelected} />
          <FileList files={files} onRemove={handleRemoveFile} />
        </div>
      </div>
    </div>
  );
}
