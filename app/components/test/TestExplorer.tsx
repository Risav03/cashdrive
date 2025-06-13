"use client";
import { useState } from 'react';
import {
  createFolder,
  getBreadcrumbPath,
  getItem,
  getItemsByParentId,
  getUserRootFolder,
  uploadItem
} from '../../lib/frontend/explorerFunctions';

export default function TestExplorer() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Dummy data for testing
  const dummyFolderId = '684b386278d53bd9eb133081';
  const dummyItemId = 'file1';
  const dummyCreateFolder = { name: 'Test Folder', parentId: '684b26daeff55790537a3eeb' };
  const dummyUploadFile = {
    type: 'file' as 'file',
    name: 'test.txt',
    parentId: '684b26daeff55790537a3eeb',
    file: new File(['hello'], 'test.txt', { type: 'text/plain' })
  };
  const dummyUploadUrl = {
    type: 'url' as 'url',
    name: 'test-link',
    parentId: '684b26daeff55790537a3eeb',
    url: 'https://example.com/file.txt'
  };


  const handleTest = async (fn: () => Promise<any>, label: string, req?: any) => {
    setLoading(label);
    setResult({ request: req || null, response: null });
    try {
      const response = await fn();
      setResult({ request: req || null, response });
    } catch (error) {
      setResult({ request: req || null, response: error?.toString() });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontWeight: 'bold', fontSize: 24, marginBottom: 16 }}>Explorer API Test</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={() => handleTest(getUserRootFolder, 'getUserRootFolder')}>Test getUserRootFolder</button>
        <button onClick={() => handleTest(() => getItemsByParentId(dummyFolderId), 'getItemsByParentId', { parentId: dummyFolderId })}>Test getItemsByParentId</button>
        <button onClick={() => handleTest(() => getItem(dummyItemId), 'getItem', { id: dummyItemId })}>Test getItem</button>
        <button onClick={() => handleTest(() => getBreadcrumbPath(dummyFolderId), 'getBreadcrumbPath', { folderId: dummyFolderId })}>Test getBreadcrumbPath</button>
        <button onClick={() => handleTest(() => uploadItem(dummyUploadFile), 'uploadItem (file)', dummyUploadFile)}>Test uploadItem (file)</button>
        <button onClick={() => handleTest(() => uploadItem(dummyUploadUrl), 'uploadItem (url)', dummyUploadUrl)}>Test uploadItem (url)</button>
        <button onClick={() => handleTest(() => createFolder(dummyCreateFolder), 'createFolder', dummyCreateFolder)}>Test createFolder</button>
      </div>
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontWeight: 'bold', fontSize: 18 }}>Request & Response</h2>
        <pre style={{ background: '#f4f4f4', color: 'black', padding: 16, borderRadius: 8, marginTop: 8 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
        {loading && <div style={{ marginTop: 8 }}>Loading {loading}...</div>}
      </div>
    </div>
  );
} 