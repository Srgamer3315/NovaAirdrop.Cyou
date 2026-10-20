import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  initGoogleAuth,
  googleSignIn,
  googleLogout,
} from '@/lib/google-auth';
import {
  createParticipantSpreadsheet,
  appendParticipantToSpreadsheet,
  fetchSpreadsheetPreview,
  type SheetExportRow,
} from '@/lib/google-sheets';
import {
  FileSpreadsheet,
  PlusCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Table,
} from 'lucide-react';

interface GoogleSheetsCardProps {
  participantData?: {
    name: string;
    username: string;
    xUserId: string;
    eligibilityStatus: string;
    xVerified: boolean | null;
    xVerifiedType: string | null;
    firstAuthenticatedAt?: string;
    lastAuthenticatedAt?: string;
  } | null;
}

export function GoogleSheetsCard({ participantData }: GoogleSheetsCardProps) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Spreadsheet state
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('Nova Airdrop Registry');
  const [existingSheetInput, setExistingSheetInput] = useState('');
  const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null);
  const [lastSpreadsheetId, setLastSpreadsheetId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Confirmation dialog state (MANDATORY for Workspace data mutations)
  const [pendingAction, setPendingAction] = useState<{
    type: 'create' | 'append';
    title: string;
    description: string;
    details: string[];
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Preview state
  const [previewData, setPreviewData] = useState<{ title: string; rows: string[][] } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const unsubscribe = initGoogleAuth(
        (user) => {
          if (isMounted) {
            setGoogleUser(user);
            setIsInitializing(false);
          }
        },
        () => {
          if (isMounted) {
            setGoogleUser(null);
            setIsInitializing(false);
          }
        },
      );
      return () => {
        isMounted = false;
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    } catch (e) {
      console.warn('initGoogleAuth error:', e);
      setIsInitializing(false);
    }
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      setGoogleUser(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in could not be completed';
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setPreviewData(null);
      setLastCreatedUrl(null);
      setLastSpreadsheetId(null);
      setStatusMessage(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    return trimmed;
  };

  const prepareExportRow = (): SheetExportRow => {
    const now = new Date().toISOString();
    return {
      name: participantData?.name || 'Anonymous Participant',
      username: participantData?.username ? `@${participantData.username}` : '—',
      xUserId: participantData?.xUserId || '—',
      eligibilityStatus: participantData?.eligibilityStatus ? 'Eligible' : 'Pending',
      xVerified: participantData?.xVerified ? 'Verified' : 'Not verified',
      xVerifiedType: participantData?.xVerifiedType || 'None',
      firstAuthenticatedAt: participantData?.firstAuthenticatedAt || now,
      lastAuthenticatedAt: participantData?.lastAuthenticatedAt || now,
      exportedAt: now,
    };
  };

  const requestCreateSpreadsheet = () => {
    setStatusMessage(null);
    const titleToUse = spreadsheetTitle.trim() || 'Nova Airdrop Registry';
    const row = prepareExportRow();

    setPendingAction({
      type: 'create',
      title: 'Create new Google Sheet?',
      description: `The app will create a new spreadsheet in your Google Drive titled "${titleToUse}" and insert the participant record.`,
      details: [
        `File Name: ${titleToUse}`,
        `Participant: ${row.name} (${row.username})`,
        `Eligibility: ${row.eligibilityStatus}`,
        `Target: Google Drive`,
      ],
      onConfirm: async () => {
        setIsExporting(true);
        try {
          const res = await createParticipantSpreadsheet(titleToUse, row);
          setLastCreatedUrl(res.spreadsheetUrl);
          setLastSpreadsheetId(res.spreadsheetId);
          setStatusMessage({
            type: 'success',
            text: `Successfully created "${titleToUse}" in Google Sheets!`,
          });
          loadPreview(res.spreadsheetId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to create spreadsheet';
          setStatusMessage({ type: 'error', text: msg });
        } finally {
          setIsExporting(false);
          setPendingAction(null);
        }
      },
    });
  };

  const requestAppendToExisting = () => {
    setStatusMessage(null);
    const targetId = extractSpreadsheetId(existingSheetInput);
    if (!targetId) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Google Spreadsheet ID or URL.' });
      return;
    }

    const row = prepareExportRow();

    setPendingAction({
      type: 'append',
      title: 'Append row to Google Sheet?',
      description: `The app will add 1 new record row to the existing Google Spreadsheet (${targetId}).`,
      details: [
        `Spreadsheet ID: ${targetId}`,
        `Participant: ${row.name} (${row.username})`,
        `Status: ${row.eligibilityStatus}`,
      ],
      onConfirm: async () => {
        setIsExporting(true);
        try {
          await appendParticipantToSpreadsheet(targetId, row);
          setLastCreatedUrl(`https://docs.google.com/spreadsheets/d/${targetId}`);
          setLastSpreadsheetId(targetId);
          setStatusMessage({
            type: 'success',
            text: 'Successfully appended participant record to the spreadsheet!',
          });
          loadPreview(targetId);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to append to spreadsheet';
          setStatusMessage({ type: 'error', text: msg });
        } finally {
          setIsExporting(false);
          setPendingAction(null);
        }
      },
    });
  };

  const loadPreview = async (sheetId: string) => {
    setIsLoadingPreview(true);
    try {
      const data = await fetchSpreadsheetPreview(sheetId);
      setPreviewData(data);
    } catch (err) {
      console.warn('Could not load sheet preview:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_18px_55px_rgba(34,69,80,.07)]" data-testid="google-sheets-section">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[#0F9D58]" />
          <span className="nova-mono text-[10px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">
            Google Sheets Integration
          </span>
        </div>
        {googleUser ? (
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#0F9D58]">
            <CheckCircle2 size={12} strokeWidth={2.5} /> Connected
          </span>
        ) : (
          <span className="nova-mono text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
            Optional Export
          </span>
        )}
      </div>

      <div className="p-6 sm:p-7">
        {!googleUser ? (
          <div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F9D58]/10 text-[#0F9D58]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Sync & Export to Google Sheets</h3>
                <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                  Connect your Google account with permission to create and update spreadsheets. You can export participant eligibility records directly to your Google Drive.
                </p>
              </div>
            </div>

            {authError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-[hsl(var(--destructive)/.2)] bg-[hsl(var(--destructive)/.08)] p-3 text-xs text-[hsl(var(--destructive))]">
                <AlertCircle size={15} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Official GSI Material Button styling */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn || isInitializing}
                className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white px-4 text-xs font-semibold text-[#3c4043] shadow-sm transition hover:bg-[#f8f9fa] hover:border-[#d2e3fc] disabled:cursor-wait disabled:opacity-50"
                data-testid="button-connect-google-sheets"
              >
                <svg className="h-4 w-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                <span>{isSigningIn ? 'Connecting…' : 'Connect Google Sheets'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Connected User Header */}
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
              <div className="flex items-center gap-3">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt="" className="h-8 w-8 rounded-full border border-[hsl(var(--border))]" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F9D58] text-xs font-bold text-white">
                    {(googleUser.displayName || googleUser.email || 'G').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{googleUser.displayName || 'Google Account'}</div>
                  <div className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">{googleUser.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                title="Disconnect Google account"
              >
                <LogOut size={12} /> Disconnect
              </button>
            </div>

            {/* Export Actions */}
            <div className="mt-5 space-y-4">
              {/* Option A: Create New Sheet */}
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <PlusCircle size={14} className="text-[#0F9D58]" />
                  <span>Create New Registry Spreadsheet</span>
                </div>
                <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                  Creates a new formatted Google Sheet with columns for username, verification, and eligibility timestamp.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={spreadsheetTitle}
                    onChange={(e) => setSpreadsheetTitle(e.target.value)}
                    placeholder="Spreadsheet title"
                    className="h-9 flex-1 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[#0F9D58]"
                  />
                  <button
                    type="button"
                    onClick={requestCreateSpreadsheet}
                    disabled={isExporting}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0F9D58] px-4 text-xs font-semibold text-white shadow transition hover:bg-[#0c8249] disabled:opacity-50"
                    data-testid="button-create-sheet"
                  >
                    {isExporting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <FileSpreadsheet size={13} />}
                    Create Sheet
                  </button>
                </div>
              </div>

              {/* Option B: Append to Existing */}
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Table size={14} className="text-[hsl(var(--primary))]" />
                  <span>Append to Existing Sheet</span>
                </div>
                <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                  Paste the Google Sheet URL or ID to add this participant record as a new row.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={existingSheetInput}
                    onChange={(e) => setExistingSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/... or Sheet ID"
                    className="h-9 flex-1 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-[hsl(var(--primary))]"
                  />
                  <button
                    type="button"
                    onClick={requestAppendToExisting}
                    disabled={isExporting || !existingSheetInput.trim()}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-xs font-semibold text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--foreground))] disabled:opacity-50"
                    data-testid="button-append-sheet"
                  >
                    Append Row
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div
                  className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                    statusMessage.type === 'success'
                      ? 'border border-[#b9ded2] bg-[#f0f8f5] text-[#24664f]'
                      : 'border border-[hsl(var(--destructive)/.2)] bg-[hsl(var(--destructive)/.08)] text-[hsl(var(--destructive))]'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#0F9D58]" />
                  ) : (
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  )}
                  <span className="leading-relaxed">{statusMessage.text}</span>
                </div>
              )}

              {/* Direct Open Link */}
              {lastCreatedUrl && (
                <div className="flex items-center justify-between rounded-lg border border-[#0F9D58]/30 bg-[#0F9D58]/5 p-3.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0F9D58]">
                    <FileSpreadsheet size={16} />
                    <span>Spreadsheet Ready</span>
                  </div>
                  <a
                    href={lastCreatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F9D58] underline hover:opacity-80"
                    data-testid="link-open-spreadsheet"
                  >
                    Open in Google Sheets <ExternalLink size={13} />
                  </a>
                </div>
              )}

              {/* Preview Table */}
              {previewData && previewData.rows.length > 0 && (
                <div className="mt-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="nova-mono text-[9px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
                      Preview: {previewData.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => lastSpreadsheetId && loadPreview(lastSpreadsheetId)}
                      disabled={isLoadingPreview}
                      className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    >
                      <RefreshCw size={10} className={isLoadingPreview ? 'animate-spin' : ''} /> Refresh
                    </button>
                  </div>
                  <div className="max-h-48 overflow-x-auto overflow-y-auto rounded-lg border border-[hsl(var(--border))] text-[11px]">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-[hsl(var(--muted))]">
                        <tr>
                          {previewData.rows[0]?.map((header, i) => (
                            <th key={i} className="whitespace-nowrap px-3 py-1.5 font-semibold text-[hsl(var(--muted-foreground))]">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.rows.slice(1).map((row, rIdx) => (
                          <tr key={rIdx} className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.4)]">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="whitespace-nowrap px-3 py-1.5">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog (MANDATORY for Workspace data mutations) */}
      {pendingAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F9D58]/15 text-[#0F9D58]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-[hsl(var(--foreground))]">
                {pendingAction.title}
              </h4>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              {pendingAction.description}
            </p>

            {pendingAction.details && pendingAction.details.length > 0 ? (
              <div className="mt-3.5 space-y-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.5)] p-3 text-xs">
                {pendingAction.details.map((detail, idx) => (
                  <div key={idx} className="nova-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                    • {detail}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => pendingAction.onConfirm()}
                disabled={isExporting}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#0F9D58] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0c8249] disabled:opacity-50"
                data-testid="button-confirm-sheets-action"
              >
                {isExporting ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                Confirm & Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
