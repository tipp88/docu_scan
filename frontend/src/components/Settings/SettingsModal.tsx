import { useState, useEffect } from 'react';
import type { EnhancementMode } from '../../types/document';

interface SettingsData {
  paperlessUrl: string;
  paperlessToken: string;
  paperlessDefaultTags: string;
  defaultEnhancement: EnhancementMode | 'auto';
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const STORAGE_KEY = 'docuscan_settings';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<SettingsData>({
    paperlessUrl: '',
    paperlessToken: '',
    paperlessDefaultTags: 'docu_scan',
    defaultEnhancement: 'auto',
  });

  const [isSaved, setIsSaved] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
      } catch (e) {
        console.error('Failed to parse stored settings:', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);

    // Close modal after brief delay
    setTimeout(() => onClose(), 500);
  };

  const handleReset = () => {
    setSettings({
      paperlessUrl: '',
      paperlessToken: '',
      paperlessDefaultTags: 'docu_scan',
      defaultEnhancement: 'auto',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-carbon-100">Settings</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            aria-label="Close settings"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* Paperless-ngx Section */}
          <div>
            <h3 className="font-display text-lg text-carbon-100 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Paperless-ngx
            </h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="paperlessUrl" className="block text-sm font-medium text-carbon-300 mb-1">
                  Paperless URL
                </label>
                <input
                  id="paperlessUrl"
                  type="url"
                  value={settings.paperlessUrl}
                  onChange={(e) => setSettings({ ...settings, paperlessUrl: e.target.value })}
                  placeholder="http://192.168.1.100:8000"
                  className="w-full px-4 py-2 bg-carbon-800 border border-carbon-700 rounded-xl text-carbon-100 placeholder-carbon-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
                <p className="text-xs text-carbon-500 mt-1">URL of your Paperless-ngx instance</p>
              </div>

              <div>
                <label htmlFor="paperlessToken" className="block text-sm font-medium text-carbon-300 mb-1">
                  API Token
                </label>
                <input
                  id="paperlessToken"
                  type="password"
                  value={settings.paperlessToken}
                  onChange={(e) => setSettings({ ...settings, paperlessToken: e.target.value })}
                  placeholder="Your API token"
                  className="w-full px-4 py-2 bg-carbon-800 border border-carbon-700 rounded-xl text-carbon-100 placeholder-carbon-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-carbon-500 mt-1">
                  Get from Paperless → Settings → API Tokens
                </p>
              </div>

              <div>
                <label htmlFor="paperlessTags" className="block text-sm font-medium text-carbon-300 mb-1">
                  Default Tags
                </label>
                <input
                  id="paperlessTags"
                  type="text"
                  value={settings.paperlessDefaultTags}
                  onChange={(e) => setSettings({ ...settings, paperlessDefaultTags: e.target.value })}
                  placeholder="docu_scan,mobile"
                  className="w-full px-4 py-2 bg-carbon-800 border border-carbon-700 rounded-xl text-carbon-100 placeholder-carbon-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
                <p className="text-xs text-carbon-500 mt-1">Comma-separated list of tags</p>
              </div>
            </div>
          </div>

          {/* Enhancement Section */}
          <div>
            <h3 className="font-display text-lg text-carbon-100 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Image Processing
            </h3>

            <div>
              <label htmlFor="defaultEnhancement" className="block text-sm font-medium text-carbon-300 mb-1">
                Default Enhancement Mode
              </label>
              <select
                id="defaultEnhancement"
                value={settings.defaultEnhancement}
                onChange={(e) => setSettings({ ...settings, defaultEnhancement: e.target.value as any })}
                className="w-full px-4 py-2 bg-carbon-800 border border-carbon-700 rounded-xl text-carbon-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent cursor-pointer"
              >
                <option value="auto">🤖 Auto-detect (Recommended)</option>
                <option value="color">📸 Color</option>
                <option value="grayscale">⬜ Grayscale</option>
                <option value="bw">⬛ Black & White</option>
                <option value="enhanced">✨ Enhanced</option>
              </select>
              <p className="text-xs text-carbon-500 mt-1">
                Auto-detect analyzes each page and chooses the best mode for readability
              </p>
            </div>
          </div>

          {/* Success Message */}
          {isSaved && (
            <div className="p-4 bg-sage-500/10 border border-sage-500/30 rounded-xl animate-fade-in">
              <p className="text-sage-400 text-sm font-medium flex items-center gap-2">
                <SaveIcon />
                Settings saved successfully
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleReset}
            className="btn btn-secondary flex-1"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary flex-1"
          >
            <SaveIcon />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook to get settings
export function useSettings(): SettingsData {
  const [settings, setSettings] = useState<SettingsData>({
    paperlessUrl: '',
    paperlessToken: '',
    paperlessDefaultTags: 'docu_scan',
    defaultEnhancement: 'auto',
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
      } catch (e) {
        console.error('Failed to parse stored settings:', e);
      }
    }
  }, []);

  return settings;
}
