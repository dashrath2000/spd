/**
 * googleDriveService.ts
 *
 * Handles Google Drive backup/restore for both Electron and Web.
 */

import { isElectron } from './localDB';
import toast from 'react-hot-toast';

const GOOGLE_CLIENT_ID = '356077113566-7r1r14jkqhbn3neiskpgrodppma8a78s.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const googleDriveService = {
  async exportToDrive(data: any): Promise<{ success: boolean; fileId?: string; message?: string }> {
    if (isElectron()) {
      return await (window as any).electronAPI.backup.exportToDrive(data);
    }

    // Web Implementation
    try {
      const accessToken = await this.getWebAccessToken();
      const fileName = `jewlpos_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      const result = await response.json();
      if (result.id) {
        return { success: true, fileId: result.id };
      }
      throw new Error(result.error?.message || 'Failed to upload to Google Drive');
    } catch (error: any) {
      console.error('Web Drive export failed:', error);
      return { success: false, message: error.message };
    }
  },

  async importFromDrive(): Promise<{ success: boolean; data?: any; fileName?: string; message?: string }> {
    if (isElectron()) {
      return await (window as any).electronAPI.backup.importFromDrive();
    }

    // Web Implementation
    try {
      const accessToken = await this.getWebAccessToken();
      
      // 1. List files
      const query = encodeURIComponent("name contains 'jewlpos_backup' and trashed = false");
      const listResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime+desc&fields=files(id,name,createdTime,size)`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const listData = await listResponse.json();
      const files = listData.files || [];

      if (files.length === 0) {
        return { success: false, message: 'No backups found on your Google Drive.' };
      }

      // 2. Simple selection (for now, just use the latest one or show a prompt)
      // In a real web app, we'd show a modal. For now, let's use the latest.
      const selectedFile = files[0];
      
      // 3. Download file
      const downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${selectedFile.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const content = await downloadResponse.json();

      return {
        success: true,
        data: content,
        fileName: selectedFile.name,
      };
    } catch (error: any) {
      console.error('Web Drive import failed:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Simple OAuth2 flow for the web
   */
  async getWebAccessToken(): Promise<string> {
    const storageKey = 'google_drive_access_token';
    const tokenData = localStorage.getItem(storageKey);
    
    if (tokenData) {
      const { token, expiry } = JSON.parse(tokenData);
      if (Date.now() < expiry) {
        return token;
      }
    }

    return new Promise((_resolve, reject) => {
      // Ensure redirect URI matches exactly what's in Google Console
      // For HashRouter apps, window.location.pathname is usually just '/'
      const redirectUri = window.location.origin + window.location.pathname;
      const cleanRedirectUri = redirectUri.replace(/\/$/, ""); 
      
      console.log('--- GOOGLE OAUTH DEBUG ---');
      console.log('Redirect URI being sent:', cleanRedirectUri);
      console.log('Make sure this EXACT URI is in your Google Cloud Console "Authorized redirect URIs"');
      console.log('---------------------------');

      toast(`Auth Redirect URI: ${cleanRedirectUri}`, { 
        icon: 'ℹ️',
        duration: 6000 
      });
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(cleanRedirectUri)}&response_type=token&scope=${encodeURIComponent(DRIVE_SCOPE)}`;
      
      // Store current state to handle the callback after redirect
      localStorage.setItem('google_auth_pending', 'true');
      
      // Redirect to Google
      window.location.href = authUrl;
      
      // Silence the rejection since we are navigating away
      setTimeout(() => reject(new Error('Auth redirect failed')), 5000);
    });
  },

  /**
   * Call this in your App.tsx or a global useEffect to catch the token from URL
   */
  handleAuthCallback() {
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const token = params.get('access_token');
      const expiresIn = params.get('expires_in');
      const error = params.get('error');

      if (token && expiresIn) {
        const expiry = Date.now() + parseInt(expiresIn) * 1000;
        localStorage.setItem('google_drive_access_token', JSON.stringify({ token, expiry }));
        localStorage.removeItem('google_auth_pending');
        toast.success('Google Drive connected!');
        // Clean URL
        window.history.replaceState(null, '', window.location.pathname);
      } else if (error) {
        console.error('Google Auth Error:', error);
        toast.error(`Google Auth failed: ${error}`);
        localStorage.removeItem('google_auth_pending');
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }
};
