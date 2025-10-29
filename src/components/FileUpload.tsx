import { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { formatFileSize, getFileIcon } from '../lib/file-upload';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  accept = 'image/*,application/pdf,.doc,.docx',
  multiple = true,
  disabled = false,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - selectedFiles.length;
    const filesToAdd = fileArray.slice(0, remainingSlots);

    if (filesToAdd.length > 0) {
      const newFiles = [...selectedFiles, ...filesToAdd];
      setSelectedFiles(newFiles);
      onFilesSelected(newFiles);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const openFileDialog = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-slate-900 bg-slate-50'
            : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-700 font-medium">
          Cliquez pour télécharger ou glissez-déposez
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Images, PDF ou documents Word (max {maxFiles} fichiers)
        </p>
        {selectedFiles.length > 0 && (
          <p className="text-xs text-slate-500 mt-2">
            {selectedFiles.length} / {maxFiles} fichiers sélectionnés
          </p>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              <span className="text-2xl">{getFileIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
                disabled={disabled}
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface UploadedFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

interface UploadedFilesListProps {
  files: UploadedFile[];
  onDelete?: (index: number) => void;
  showDelete?: boolean;
}

export function UploadedFilesList({ files, onDelete, showDelete = true }: UploadedFilesListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-slate-700">Fichiers téléchargés</h4>
      {files.map((file, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200"
        >
          <span className="text-2xl">{getFileIcon(file.type || '')}</span>
          <div className="flex-1 min-w-0">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 truncate block"
            >
              {file.name}
            </a>
            {file.size && (
              <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
            )}
          </div>
          {showDelete && onDelete && (
            <button
              onClick={() => onDelete(index)}
              className="p-1 hover:bg-red-50 rounded transition-colors"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
