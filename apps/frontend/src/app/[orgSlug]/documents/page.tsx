'use client';

import { useState } from 'react';
import {
  Folder as FolderIcon, FileText, Image as ImageIcon, Video, UploadCloud,
  Search, Plus, MoreVertical, File, Download, Trash2, Share2, X, CheckCircle2
} from 'lucide-react';

const INITIAL_FOLDERS = [
  { id: '1', name: 'Marketing Assets', items: 12, size: '45 MB', updatedAt: '2 days ago' },
  { id: '2', name: 'Q3 Financials', items: 5, size: '2.1 MB', updatedAt: '5 hours ago' },
  { id: '3', name: 'Project Apollo', items: 42, size: '1.2 GB', updatedAt: '10 mins ago' },
];

const INITIAL_FILES = [
  { id: '101', name: 'Q3_Revenue_Report.pdf', type: 'pdf', size: '2.4 MB', owner: 'John Doe', updatedAt: '2 hours ago' },
  { id: '102', name: 'Logo_Final_v2.png', type: 'image', size: '4.1 MB', owner: 'Jane Smith', updatedAt: '1 day ago' },
  { id: '103', name: 'Product_Demo.mp4', type: 'video', size: '124 MB', owner: 'Alex Johnson', updatedAt: '3 days ago' },
  { id: '104', name: 'Client_Contract_Acme.docx', type: 'word', size: '1.1 MB', owner: 'Sarah Connor', updatedAt: '1 week ago' },
];

const fileIcons: any = {
  pdf: <FileText className="text-red-500" size={24} />,
  image: <ImageIcon className="text-blue-500" size={24} />,
  video: <Video className="text-purple-500" size={24} />,
  word: <File className="text-blue-600" size={24} />,
  default: <File className="text-gray-500" size={24} />,
};

import { useAuthStore } from '@/store/auth.store';
import { isAdminRole } from '@/lib/permissions';

export default function DocumentsPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = isAdminRole(user?.role);
  const [folders, setFolders] = useState(INITIAL_FOLDERS);
  const [files, setFiles] = useState(INITIAL_FILES);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileType, setUploadedFileType] = useState('pdf');

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      items: 0,
      size: '0 KB',
      updatedAt: 'Just now',
    };

    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setIsFolderModalOpen(false);
  };

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFileName.trim()) return;

    const newFile = {
      id: Date.now().toString(),
      name: uploadedFileName.includes('.') ? uploadedFileName : `${uploadedFileName}.${uploadedFileType}`,
      type: uploadedFileType,
      size: '1.5 MB',
      owner: 'Current User',
      updatedAt: 'Just now',
    };

    setFiles([newFile, ...files]);
    setUploadedFileName('');
    setIsUploadModalOpen(false);
  };

  const handleDeleteFile = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleDownloadFile = (fileName: string) => {
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(`Dummy content for ${fileName}`);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Documents Library</h2>
          <div className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            <span className="hover:text-primary cursor-pointer transition-colors">My Organization</span>
            <span>/</span>
            <span className="font-medium text-gray-900 dark:text-white cursor-pointer">All Files</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <UploadCloud size={16} /> Upload File
          </button>
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Plus size={16} /> New Folder
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shrink-0">
        <div className="relative w-full sm:w-96 pl-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files, folders, or tags..."
            className="w-full pl-9 pr-4 py-1.5 bg-transparent border-none text-sm focus:outline-none focus:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 pr-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50/50 dark:bg-zinc-950/50 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 space-y-8">
        {/* Folders Section */}
        {filteredFolders.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">Folders</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredFolders.map((folder) => (
                <div key={folder.id} className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FolderIcon className="text-gray-400 dark:text-zinc-500 shrink-0 group-hover:text-primary transition-colors" size={24} fill="currentColor" fillOpacity={0.2} />
                    <div className="truncate">
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{folder.name}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">{folder.items} items</div>
                    </div>
                  </div>
                  <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-900 dark:hover:text-white rounded">
                    <MoreVertical size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">Files</h3>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {filteredFiles.map((file) => (
                <div key={file.id} className="group flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all">
                  <div className="h-28 bg-gray-50 dark:bg-zinc-950 flex items-center justify-center border-b border-gray-100 dark:border-zinc-800 relative">
                    {fileIcons[file.type] || fileIcons['default']}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-black/80 backdrop-blur-sm p-1 rounded-md">
                      <button onClick={() => handleDownloadFile(file.name)} className="p-1 text-gray-600 hover:text-primary" title="Download">
                        <Download size={14} />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDeleteFile(file.id)} className="p-1 text-gray-600 hover:text-rose-500" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate block">{file.name}</span>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-zinc-400">
                      <span>{file.size}</span>
                      <span>{file.updatedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Last Modified</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {fileIcons[file.type] || fileIcons['default']}
                          <span className="font-medium text-gray-900 dark:text-white">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{file.owner}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{file.updatedAt}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-zinc-400">{file.size}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDownloadFile(file.name)} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-200" title="Download">
                            <Download size={16} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleDeleteFile(file.id)} className="p-1.5 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Create New Folder</h3>
              <button onClick={() => setIsFolderModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Folder Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Financials"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Upload Document</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadFile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">File Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Annual_Strategy_2026.pdf"
                  value={uploadedFileName}
                  onChange={(e) => setUploadedFileName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Document Type</label>
                <select
                  value={uploadedFileType}
                  onChange={(e) => setUploadedFileType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                >
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="word">Word Document (.docx)</option>
                  <option value="image">Image File (.png/.jpg)</option>
                  <option value="video">Video Recording (.mp4)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  Upload File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
