import { CheckCircle2, FileText, ImageIcon, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { bookApi } from '../api/client';

interface FileUploadProps {
    label: string;
    type: 'cover' | 'pdf';
    value: string;
    onUpload: (url: string) => void;
    accept?: string;
}

const FileUpload = ({ label, type, value, onUpload, accept }: FileUploadProps) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const res = await bookApi.uploadFile(file, type);
            onUpload(res.data.url);
        } catch (error) {
            alert('Fayl yuklashda xatolik yuz berdi');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{label}</label>
            <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${value
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    accept={accept}
                />

                {uploading ? (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                        <p className="text-sm text-slate-500">Yuklanmoqda...</p>
                    </div>
                ) : value ? (
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 className="text-primary" size={24} />
                        </div>
                        <p className="text-sm font-bold text-primary">Fayl yuklandi</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-[200px] truncate">{value}</p>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpload('');
                            }}
                            className="mt-2 text-rose-500 hover:text-rose-600 text-xs font-bold flex items-center gap-1"
                        >
                            <X size={14} /> Tozalash
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                            {type === 'cover' ? <ImageIcon className="text-slate-400" /> : <FileText className="text-slate-400" />}
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Faylni tanlang</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {type === 'cover' ? 'JPG, PNG rasm' : 'PDF hujjat'} yuklang
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUpload;
