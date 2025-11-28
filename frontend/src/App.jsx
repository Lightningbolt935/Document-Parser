import React, { useState } from 'react';
import { Upload, FileText, Hash, Heading, AlertCircle, CheckCircle } from 'lucide-react';

// Use environment variable if available, otherwise use Railway internal URL or localhost fallback
const API_URL = import.meta.env.VITE_API_URL || 'https://document-parser.railway.internal' || 'http://localhost:3001';

export default function DocumentUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      if (fileType === 'pdf' || fileType === 'docx') {
        setFile(selectedFile);
        setError(null);
        setResult(null);
      } else {
        setError('Please upload a PDF or DOCX file');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Error: ${err.message}. Backend URL: ${API_URL}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <FileText className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Document Parser
          </h1>
          <p className="text-gray-600">
            Upload PDF or DOCX files to extract metadata and headings
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Document
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition"
              >
                <div className="text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-600">
                    {file ? file.name : 'Click to upload PDF or DOCX'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {file && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                'Upload & Parse'
              )}
            </button>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}
        </div>

        {/* Results Card */}
        {result && (
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
            <div className="flex items-center mb-6">
              <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              <h2 className="text-2xl font-bold text-gray-800">
                Extraction Complete
              </h2>
            </div>

            <div className="space-y-6">
              {/* File Name */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-start">
                  <FileText className="w-5 h-5 text-indigo-600 mr-3 mt-1" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      File Name
                    </h3>
                    <p className="text-lg text-gray-800">{result.fileName}</p>
                  </div>
                </div>
              </div>

              {/* Total Pages */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-start">
                  <Hash className="w-5 h-5 text-indigo-600 mr-3 mt-1" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Total Pages
                    </h3>
                    <p className="text-lg text-gray-800">{result.totalPages}</p>
                  </div>
                </div>
              </div>

              {/* Headings */}
              <div>
                <div className="flex items-start mb-3">
                  <Heading className="w-5 h-5 text-indigo-600 mr-3 mt-1" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">
                      Extracted Headings ({result.headings.length})
                    </h3>
                  </div>
                </div>
                <div className="ml-8 space-y-2">
                  {result.headings.map((heading, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <span className="text-gray-700">{heading}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Demo Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}