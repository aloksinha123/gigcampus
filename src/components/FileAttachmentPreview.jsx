import React, { useState } from 'react';

/**
 * Format bytes to readable size
 */
export const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Get File Icon & Category
 */
export const getFileDetails = (mimeType = '', fileName = '') => {
    const ext = fileName.split('.').pop().toLowerCase();
    const type = mimeType.toLowerCase();

    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
        return { isImage: true, icon: '🖼️', label: 'Image', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    }
    if (type.includes('pdf') || ext === 'pdf') {
        return { isImage: false, icon: '📄', label: 'PDF Document', color: 'bg-rose-50 text-rose-600 border-rose-200' };
    }
    if (type.includes('word') || ['doc', 'docx'].includes(ext)) {
        return { isImage: false, icon: '📝', label: 'Word Document', color: 'bg-blue-50 text-blue-600 border-blue-200' };
    }
    if (type.includes('spreadsheet') || type.includes('excel') || ['xls', 'xlsx'].includes(ext)) {
        return { isImage: false, icon: '📊', label: 'Spreadsheet', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (type.includes('presentation') || ['ppt', 'pptx'].includes(ext)) {
        return { isImage: false, icon: '📊', label: 'Presentation', color: 'bg-amber-50 text-amber-600 border-amber-200' };
    }
    if (type.includes('zip') || type.includes('compressed') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        return { isImage: false, icon: '📦', label: 'Archive Zip', color: 'bg-gc-soft text-gc-blue border-gc-light' };
    }
    return { isImage: false, icon: '📎', label: 'File Attachment', color: 'bg-gray-50 text-gray-600 border-gray-200' };
};

/**
 * Programmatically force direct file download to user's device
 */
export const downloadFile = async (url, fileName = 'download') => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
        console.error('Download failed:', err);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        link.target = '_blank';
        link.click();
    }
};

/**
 * FileAttachmentPreview Component
 */
const FileAttachmentPreview = ({ attachment }) => {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [downloading, setDownloading] = useState(false);

    if (!attachment || !attachment.url) return null;

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5003';
    const fullUrl = attachment.url.startsWith('http') ? attachment.url : `${baseUrl}${attachment.url}`;

    const { isImage, icon, label, color } = getFileDetails(attachment.mimeType, attachment.name);

    const handleDownload = async (e) => {
        e.stopPropagation();
        setDownloading(true);
        await downloadFile(fullUrl, attachment.name);
        setDownloading(false);
    };

    if (isImage) {
        return (
            <>
                <div className="mt-2 mb-1 group relative max-w-sm rounded-2xl overflow-hidden border border-gray-200/80 shadow-sm bg-black/5 cursor-pointer">
                    <div onClick={() => setIsLightboxOpen(true)} className="block">
                        <img
                            src={fullUrl}
                            alt={attachment.name || 'Attachment'}
                            className="w-full max-h-64 object-cover group-hover:scale-105 transition-transform duration-300 rounded-2xl"
                            loading="lazy"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white text-xs flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="truncate font-semibold max-w-[200px]">{attachment.name}</span>
                            <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                🔍 Preview
                            </span>
                        </div>
                    </div>
                </div>

                {/* Inline Image Lightbox Modal */}
                {isLightboxOpen && (
                    <div
                        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setIsLightboxOpen(false)}
                    >
                        <div
                            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-4 bg-slate-800/80 border-b border-white/10 flex items-center justify-between text-white">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xl">🖼️</span>
                                    <span className="font-bold text-sm truncate max-w-md">{attachment.name || 'Image Preview'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        disabled={downloading}
                                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                                    >
                                        {downloading ? '⏳ Downloading...' : '📥 Download'}
                                    </button>
                                    <button
                                        onClick={() => setIsLightboxOpen(false)}
                                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition text-lg font-bold cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Image Container */}
                            <div className="p-4 flex items-center justify-center overflow-auto bg-black/40 max-h-[80vh]">
                                <img
                                    src={fullUrl}
                                    alt={attachment.name || 'Full Preview'}
                                    className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className={`mt-2 mb-1 p-3.5 rounded-2xl border ${color} flex items-center justify-between gap-3 max-w-md shadow-sm transition-all hover:shadow-md`}>
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/80 border border-gray-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-gray-900 truncate" title={attachment.name}>
                        {attachment.name || 'Attachment File'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold text-gray-500 uppercase">{label}</span>
                        {attachment.size && (
                            <>
                                <span className="text-[10px] text-gray-300">•</span>
                                <span className="text-[10px] font-bold text-gray-500">{formatFileSize(attachment.size)}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 flex-shrink-0 transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Download Attachment"
            >
                {downloading ? '⏳ Downloading...' : '📥 Download'}
            </button>
        </div>
    );
};

export default FileAttachmentPreview;
