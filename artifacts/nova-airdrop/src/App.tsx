import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  getGetAuthSessionQueryKey,
  useGetAuthSession,
  useLogoutParticipant,
} from '@workspace/api-client-react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  LogOut,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Coins,
  Users,
  Layers,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { GoogleSheetsCard } from '@/components/google-sheets-card';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

const queryClient = new QueryClient();

function Home() {
  const session = useGetAuthSession();
  const logout = useLogoutParticipant();
  const queryClient = useQueryClient();
  const user = session.data?.user;
  const authError = new URLSearchParams(window.location.search).get('auth_error');
  const authErrorMessages: Record<string, string> = {
    authorization_denied: 'X authorization was cancelled. You can try again.',
    authorization_incomplete: 'X sign-in could not be completed. Please try again.',
    invalid_state: 'This sign-in attempt expired. Start again to continue.',
    not_configured: 'X sign-in is not configured yet.',
    service_unavailable: 'Sign-in is temporarily unavailable. Please try again shortly.',
    verification_failed: 'X could not return the account details needed. Please try again.',
  };
  const authErrorMessage = authError ? authErrorMessages[authError] : undefined;

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  const signOut = () => {
    logout.mutate(undefined, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetAuthSessionQueryKey() });
        await queryClient.refetchQueries({ queryKey: getGetAuthSessionQueryKey() });
      },
    });
  };

  const XMark = ({ className = '' }: { className?: string }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.35L5.62 22H2.5l7.25-8.29L1.8 2h6.4l4.43 6.77L18.9 2Zm-1.1 17.86h1.73L7.27 4.03H5.41L17.8 19.86Z" />
    </svg>
  );

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="nova-shell min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Top Banner */}
      <aside aria-label="Announcement" className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-center text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-[#43a98c] animate-pulse" />
          <span className="font-medium text-[hsl(var(--foreground))]">
            Nova Network Airdrop Season 1 is Live.
          </span>
          <span className="hidden text-[hsl(var(--muted-foreground))] sm:inline">
            Verify your participant record and export your data to Google Sheets.
          </span>
        </div>
      </aside>

      {/* Website Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))/0.85] backdrop-blur-md">
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 sm:px-9 lg:px-[7.1vw]">
          <a href="/" className="flex items-center gap-3 text-inherit no-underline" data-testid="link-home">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]">
              <span className="absolute h-4 w-4 rounded-full border border-current opacity-70" />
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
            </span>
            <span className="font-extrabold tracking-[-.07em] text-[22px]">nova</span>
            <span className="hidden h-5 w-px bg-[hsl(var(--border))] sm:block" />
            <span className="hidden nova-mono text-[10px] uppercase tracking-[.17em] text-[hsl(var(--muted-foreground))] sm:block">
              Network Portal
            </span>
          </a>

          {/* Nav links */}
          <nav className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => scrollToSection('eligibility')}
              className="text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            >
              Eligibility
            </button>
            <button
              onClick={() => scrollToSection('tokenomics')}
              className="text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            >
              Allocation
            </button>
            <button
              onClick={() => scrollToSection('roadmap')}
              className="text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            >
              Phases
            </button>
            <button
              onClick={() => scrollToSection('sheets-sync')}
              className="text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            >
              Google Sheets
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:text-[hsl(var(--foreground))]"
            >
              FAQ
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 sm:flex">
              <span className="h-2 w-2 rounded-full bg-[#43a98c] shadow-[0_0_0_4px_rgba(67,169,140,.12)]" />
              <span className="nova-mono text-[10px] uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">
                Mainnet Live
              </span>
            </div>
            <button
              onClick={() => scrollToSection('eligibility')}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-[hsl(var(--foreground))] px-4 text-xs font-semibold text-[hsl(var(--background))] transition hover:opacity-90"
            >
              Check Status
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Checker Section */}
      <section id="eligibility" className="relative border-b border-[hsl(var(--border))]">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-16 sm:px-9 lg:grid-cols-[1.1fr_420px] lg:gap-14 lg:px-[7.1vw] lg:py-24">
          {/* Left Column: Hero Copy */}
          <div className="nova-enter">
            <div className="mb-7 flex items-center gap-3">
              <span className="nova-mono text-[11px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">
                01 <span className="mx-1 text-[hsl(var(--muted-foreground))]">/</span> Nova Network
              </span>
              <span className="h-px w-10 bg-[hsl(var(--border))]" />
              <span className="nova-mono text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                Official Airdrop Portal
              </span>
            </div>
            <h1 className="max-w-[700px] text-[clamp(2.8rem,6.8vw,5.5rem)] font-extrabold leading-[1.02] tracking-[-.065em]">
              Your place<br />in <span className="text-[hsl(var(--primary))]">Nova Network.</span>
            </h1>
            <p className="mt-7 max-w-[480px] text-[16px] leading-[1.8] text-[hsl(var(--muted-foreground))]">
              The official portal for the Nova community. Verify your participant status through cryptographic identity verification and sync your eligibility records to Google Sheets.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={() => scrollToSection('tokenomics')}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 text-xs font-semibold text-[hsl(var(--foreground))] transition hover:border-[hsl(var(--foreground))]"
              >
                View Tokenomics <ChevronRight size={14} />
              </button>
              <button
                onClick={() => scrollToSection('roadmap')}
                className="inline-flex h-11 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                Roadmap & Phases
              </button>
            </div>

            <div className="mt-14 flex flex-wrap items-center gap-3 border-t border-[hsl(var(--border))] pt-6 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="nova-mono text-[10px] uppercase tracking-[.14em]">Identity layer</span>
              <span className="text-[hsl(var(--border))]">—</span>
              <div className="flex items-center gap-1.5 font-semibold text-[hsl(var(--foreground))]">
                <XMark className="h-3.5 w-3.5" />
                <span>X account verification</span>
              </div>
              <span className="text-[hsl(var(--border))]">·</span>
              <div className="flex items-center gap-1.5 font-semibold text-[#0F9D58]">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Google Sheets export</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Portal Cards */}
          <div className="nova-enter-late">
            {session.isLoading ? (
              <div
                className="overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[0_18px_55px_rgba(34,69,80,.07)]"
                aria-label="Loading participant status"
                data-testid="status-loading"
              >
                <div className="h-3 w-24 animate-pulse rounded bg-[hsl(var(--muted))]" />
                <div className="mt-8 h-14 w-14 animate-pulse rounded-full bg-[hsl(var(--muted))]" />
                <div className="mt-5 h-5 w-44 animate-pulse rounded bg-[hsl(var(--muted))]" />
                <div className="mt-9 h-24 animate-pulse rounded-xl bg-[hsl(var(--muted))]" />
              </div>
            ) : session.isError ? (
              <div
                className="rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-[0_18px_55px_rgba(34,69,80,.07)]"
                role="alert"
                data-testid="status-session-error"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--accent)/.12)] text-[hsl(var(--accent))]">
                  <CircleHelp size={21} />
                </div>
                <h2 className="text-xl font-semibold tracking-[-.04em]">Status unavailable</h2>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  We couldn’t load your participant session. Try again in a moment.
                </p>
                <button
                  onClick={() => session.refetch()}
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-[hsl(var(--foreground))] px-4 text-sm font-semibold text-[hsl(var(--background))] transition hover:opacity-85"
                  data-testid="button-retry-session"
                >
                  <RefreshCw size={15} /> Retry
                </button>
              </div>
            ) : user ? (
              <div
                className="overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_18px_55px_rgba(34,69,80,.07)]"
                data-testid="status-participant"
              >
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
                  <span className="nova-mono text-[10px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">
                    Participant record
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#32866d]">
                    <Check size={12} strokeWidth={3} /> Connected
                  </span>
                </div>
                <div className="p-6 sm:p-7">
                  <div className="flex items-center gap-4">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt=""
                        className="h-[58px] w-[58px] rounded-full border border-[hsl(var(--border))] object-cover"
                        data-testid="img-participant-avatar"
                      />
                    ) : (
                      <div
                        className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-lg font-bold text-[hsl(var(--primary))]"
                        data-testid="img-participant-avatar"
                      >
                        {(user.name || user.username || 'N').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-[17px] font-bold tracking-[-.04em]" data-testid="text-participant-name">
                        {user.name}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-[hsl(var(--muted-foreground))]" data-testid="text-participant-username">
                        @{user.username}
                      </div>
                    </div>
                    <XMark className="ml-auto h-[17px] w-[17px] shrink-0 text-[hsl(var(--muted-foreground))]" />
                  </div>

                  <div className="mt-7 rounded-xl border border-[#b9ded2] bg-[#f0f8f5] p-4" data-testid="status-eligibility">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="nova-mono text-[9px] uppercase tracking-[.16em] text-[#397e69]">Airdrop eligibility</div>
                        <div className="mt-2 text-[22px] font-bold leading-none tracking-[-.05em] text-[#24664f]">Eligible</div>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d8eee5] text-[#32866d]">
                        <CheckCircle2 size={20} strokeWidth={1.8} />
                      </span>
                    </div>
                    <p className="mt-3 text-[11px] leading-[1.6] text-[#527468]">
                      Successful X sign-in is the current eligibility requirement. X verification is recorded separately; no follow, like, or repost actions are required.
                    </p>
                  </div>

                  <div className="mt-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4" data-testid="status-x-verification">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={15} className="text-[hsl(var(--primary))]" />
                      <span className="text-xs font-semibold">X verification</span>
                      {user.xVerified === true ? (
                        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#e5f2fb] px-2.5 py-1 text-[10px] font-bold text-[#2673a8]" data-testid="status-x-verified">
                          <Check size={11} strokeWidth={3} /> Verified{user.xVerifiedType ? ` · ${user.xVerifiedType}` : ''}
                        </span>
                      ) : user.xVerified === false ? (
                        <span className="ml-auto rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]" data-testid="status-x-not-verified">
                          Not verified
                        </span>
                      ) : (
                        <span className="ml-auto rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]" data-testid="status-x-unknown">
                          Not available
                        </span>
                      )}
                    </div>
                    <p className="mt-2 pl-[23px] text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">
                      X’s blue-check status is separate from airdrop eligibility.
                    </p>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-[hsl(var(--border))] pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                        <Clock3 size={13} /> First authenticated
                      </span>
                      <span className="nova-mono text-right text-[9px] text-[hsl(var(--foreground))]" data-testid="text-first-authenticated">
                        {formatDate(user.firstAuthenticatedAt)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                        <RefreshCw size={12} /> Last authenticated
                      </span>
                      <span className="nova-mono text-right text-[9px] text-[hsl(var(--foreground))]" data-testid="text-last-authenticated">
                        {formatDate(user.lastAuthenticatedAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={signOut}
                    disabled={logout.isPending}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] transition hover:border-[hsl(var(--foreground))] hover:text-[hsl(var(--foreground))] disabled:cursor-wait disabled:opacity-50"
                    data-testid="button-sign-out"
                  >
                    <LogOut size={14} /> {logout.isPending ? 'Signing out…' : 'Sign out'}
                  </button>
                  {logout.isError && (
                    <p className="mt-3 text-center text-xs text-[hsl(var(--destructive))]" role="alert" data-testid="status-logout-error">
                      Could not sign out. Please try again.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="overflow-hidden rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_18px_55px_rgba(34,69,80,.07)]"
                data-testid="status-signed-out"
              >
                <div className="relative flex h-[156px] items-center justify-center overflow-hidden bg-[#e8f3f5]">
                  <div className="absolute h-[260px] w-[260px] rounded-full border border-[#bed8dc]" />
                  <div className="absolute h-[190px] w-[190px] rounded-full border border-[#b3d1d6]" />
                  <div className="absolute h-[120px] w-[120px] rounded-full border border-[#a9cbd1]" />
                  <div className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-white shadow-[0_8px_22px_rgba(27,58,68,.18)]">
                    <XMark className="h-[19px] w-[19px]" />
                  </div>
                  <span className="absolute right-6 top-5 nova-mono text-[9px] uppercase tracking-[.15em] text-[#61838a]">
                    Identity check
                  </span>
                  <span className="absolute bottom-5 left-6 nova-mono text-[9px] uppercase tracking-[.12em] text-[#61838a]">
                    One account · one record
                  </span>
                </div>
                <div className="p-6 sm:p-7">
                  <div className="nova-mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--primary))]">Start here</div>
                  <h2 className="mt-2 text-[25px] font-bold tracking-[-.055em]">Check your status.</h2>
                  <p className="mt-2 text-[13px] leading-[1.7] text-[hsl(var(--muted-foreground))]">
                    Sign in with X to confirm your account and view your Nova airdrop eligibility.
                  </p>
                  {authErrorMessage && (
                    <p
                      className="mt-4 rounded-lg border border-[hsl(var(--destructive)/.24)] bg-[hsl(var(--destructive)/.08)] px-3 py-2 text-xs leading-5 text-[hsl(var(--destructive))]"
                      role="alert"
                      data-testid="status-x-auth-error"
                    >
                      {authErrorMessage}
                    </p>
                  )}
                  <a
                    href="/api/auth/x/start"
                    className="mt-6 flex h-[50px] w-full items-center justify-center gap-3 rounded-lg bg-[hsl(var(--foreground))] text-sm font-semibold text-[hsl(var(--background))] no-underline transition hover:-translate-y-0.5 hover:bg-[#263e52]"
                    data-testid="link-sign-in-x"
                  >
                    <XMark className="h-4 w-4" /> Continue with X <ArrowUpRight size={15} className="ml-1 opacity-70" />
                  </a>
                  <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                    <ShieldCheck size={13} /> Secure authentication via X
                  </div>
                </div>
              </div>
            )}

            {/* Google Sheets Card with Scoped Error Boundary */}
            <div className="mt-6">
              <ErrorBoundary
                FallbackComponent={({ error, resetError }) => (
                  <div className="rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--destructive))]">
                      <AlertCircle size={15} />
                      <span>Google Sheets temporarily unavailable</span>
                    </div>
                    <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                      {error?.message || 'Could not initialize Google Sheets component.'}
                    </p>
                    <button
                      onClick={resetError}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-medium hover:border-[hsl(var(--foreground))]"
                    >
                      <RefreshCw size={12} /> Retry
                    </button>
                  </div>
                )}
              >
                <GoogleSheetsCard participantData={user} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <section className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] py-8">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-6 px-5 sm:px-9 lg:grid-cols-4 lg:px-[7.1vw]">
          <div className="space-y-1">
            <div className="nova-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
              Total Airdrop Pool
            </div>
            <div className="text-2xl font-extrabold tracking-tight sm:text-3xl">100,000,000</div>
            <div className="text-xs text-[hsl(var(--primary))] font-semibold">$NOVA Genesis Supply (10%)</div>
          </div>
          <div className="space-y-1">
            <div className="nova-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
              Active Phase
            </div>
            <div className="text-2xl font-extrabold tracking-tight sm:text-3xl">Phase 1</div>
            <div className="text-xs text-[#32866d] font-semibold">Live Identity Snapshot</div>
          </div>
          <div className="space-y-1">
            <div className="nova-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
              Eligibility Criterion
            </div>
            <div className="text-2xl font-extrabold tracking-tight sm:text-3xl">X Verified</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">No mandatory follows/reposts</div>
          </div>
          <div className="space-y-1">
            <div className="nova-mono text-[10px] uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">
              Registry Backup
            </div>
            <div className="text-2xl font-extrabold tracking-tight sm:text-3xl">Google Sheets</div>
            <div className="text-xs text-[#0F9D58] font-semibold">1-Click Direct Drive Sync</div>
          </div>
        </div>
      </section>

      {/* Section 2: Tokenomics & Allocation Breakdown */}
      <section id="tokenomics" className="border-b border-[hsl(var(--border))] py-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-9 lg:px-[7.1vw]">
          <div className="mb-12 max-w-xl">
            <div className="nova-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">
              Distribution Architecture
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Airdrop Allocation Breakdown
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              The Nova Airdrop allocates 10% of total network genesis tokens to genuine participants, community contributors, and infrastructure pioneers.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
                <Users size={20} />
              </div>
              <div className="mt-5 text-2xl font-bold">40%</div>
              <h3 className="mt-1 text-sm font-semibold">Community Participants</h3>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                Allocated to early supporters who authenticate their active X account and register on the Nova portal.
              </p>
              <div className="mt-4 nova-mono text-[10px] text-[hsl(var(--primary))]">40,000,000 $NOVA</div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#32866d]/15 text-[#32866d]">
                <Layers size={20} />
              </div>
              <div className="mt-5 text-2xl font-bold">25%</div>
              <h3 className="mt-1 text-sm font-semibold">Node Operators & Validators</h3>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                Rewards for running testnet RPC endpoints, consensus nodes, and decentralized validation services.
              </p>
              <div className="mt-4 nova-mono text-[10px] text-[#32866d]">25,000,000 $NOVA</div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent)/.15)] text-[hsl(var(--accent))]">
                <Coins size={20} />
              </div>
              <div className="mt-5 text-2xl font-bold">20%</div>
              <h3 className="mt-1 text-sm font-semibold">Ecosystem Builders</h3>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                Granted to developers building dApps, smart contracts, tooling, and developer integrations on Nova.
              </p>
              <div className="mt-4 nova-mono text-[10px] text-[hsl(var(--accent))]">20,000,000 $NOVA</div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <Sparkles size={20} />
              </div>
              <div className="mt-5 text-2xl font-bold">15%</div>
              <h3 className="mt-1 text-sm font-semibold">Liquidity Pioneers</h3>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                Reserved for early bridge testers, liquidity providers, and decentralized exchange participants.
              </p>
              <div className="mt-4 nova-mono text-[10px] text-purple-600">15,000,000 $NOVA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Roadmap & Phases */}
      <section id="roadmap" className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] py-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-9 lg:px-[7.1vw]">
          <div className="mb-12 max-w-xl">
            <div className="nova-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">
              Execution Roadmap
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Campaign Phases
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              Follow the official schedule for verification, snapshot finalization, and token claims.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="relative rounded-2xl border-2 border-[#32866d] bg-[hsl(var(--background))] p-6 shadow-md">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d8eee5] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#24664f]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#32866d] animate-ping" />
                Phase 1 · Current
              </span>
              <h3 className="mt-4 text-lg font-bold">Identity & Eligibility Verification</h3>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                Sign in with X to create your initial participant record. Your authenticated timestamp and verification status are safely stored and eligible for Google Sheets export.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#24664f]">
                <Check size={14} /> Open to all community members
              </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-sm opacity-90">
              <span className="inline-flex items-center rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Phase 2 · Upcoming
              </span>
              <h3 className="mt-4 text-lg font-bold">Snapshot & Allocation Calculation</h3>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                Automated multi-account deduplication and Sybil screening will finalize the participant pool. Individual token allocations will be calculated transparently.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <Clock3 size={14} /> Scheduled for Q4 2026
              </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-sm opacity-90">
              <span className="inline-flex items-center rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Phase 3 · Upcoming
              </span>
              <h3 className="mt-4 text-lg font-bold">TGE & Claim Smart Contracts</h3>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                Token Generation Event. Eligible participants can connect their Web3 wallet to claim $NOVA tokens with zero lockup or vesting on the community tier.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <Clock3 size={14} /> Smart contract audit in progress
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Google Sheets & Transparency */}
      <section id="sheets-sync" className="border-b border-[hsl(var(--border))] py-20">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-9 lg:px-[7.1vw]">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="nova-mono text-[10px] uppercase tracking-[.18em] text-[#0F9D58]">
                Decentralized Data Backup
              </div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Google Sheets Integration
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                Unlike traditional closed airdrop websites, Nova empowers users and community leaders to sync their eligibility data directly to their personal Google Drive as formatted spreadsheets.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0F9D58]/15 text-[#0F9D58]">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Direct Google Drive Export</h4>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      Create a formatted registry spreadsheet with participant usernames, IDs, and timestamps.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0F9D58]/15 text-[#0F9D58]">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Append to Existing Spreadsheets</h4>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      Paste your existing team or tracking sheet URL to append new verification rows.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0F9D58]/15 text-[#0F9D58]">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Privacy & Security First</h4>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      Tokens are held only in browser memory and explicit user confirmation is requested before any document mutation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-md">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <FileSpreadsheet className="h-4 w-4 text-[#0F9D58]" />
                  <span>Nova Airdrop Registry · Spreadsheet View</span>
                </div>
                <span className="nova-mono text-[10px] text-[#0F9D58]">Live Format</span>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border border-[hsl(var(--border))] text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Participant</th>
                      <th className="px-3 py-2 font-semibold">X Username</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">X Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    <tr>
                      <td className="px-3 py-2 font-medium">Srgamer</td>
                      <td className="px-3 py-2 text-[hsl(var(--muted-foreground))]">@srgamer3315</td>
                      <td className="px-3 py-2 text-[#24664f] font-semibold">Eligible</td>
                      <td className="px-3 py-2 text-[#2673a8]">Verified</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium">Nova Explorer</td>
                      <td className="px-3 py-2 text-[hsl(var(--muted-foreground))]">@nova_eco</td>
                      <td className="px-3 py-2 text-[#24664f] font-semibold">Eligible</td>
                      <td className="px-3 py-2 text-[hsl(var(--muted-foreground))]">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={() => scrollToSection('eligibility')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F9D58] hover:underline"
                >
                  Connect your Google account in the portal above <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: FAQ Section */}
      <section id="faq" className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] py-20">
        <div className="mx-auto max-w-[900px] px-5 sm:px-9">
          <div className="mb-12 text-center">
            <div className="nova-mono text-[10px] uppercase tracking-[.18em] text-[hsl(var(--primary))]">
              Answers & Verification
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              Everything you need to know about the Nova Airdrop portal and verification rules.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="item-1" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                What is the Nova Airdrop?
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                The Nova Airdrop is the initial token distribution event for early participants and ecosystem contributors of the Nova Network. 100,000,000 $NOVA tokens (10% of total genesis supply) are allocated to verified community members.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                How is eligibility verified?
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                Successful X (Twitter) authentication is the only current eligibility requirement. Connecting your X account creates your participant record. Blue-check verification status is recorded for display purposes but is not required to be eligible.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                Do I need to follow, like, or repost anything?
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                No. Nova respects your privacy and authentic engagement. No social media tasks, follows, likes, or reposts are required to achieve eligibility.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                How does the Google Sheets integration work?
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                You can optionally sign in with your Google account to create a new spreadsheet in your Google Drive or append participant records to an existing sheet. You retain full control over your spreadsheet and the website requests explicit confirmation before writing any data.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                When can I claim my $NOVA tokens?
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                Token claiming will open during Phase 3 alongside the Token Generation Event (TGE). You will be able to connect your Web3 wallet to claim your allocated tokens directly through non-custodial smart contracts.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Website Footer */}
      <footer className="bg-[hsl(var(--background))] py-12 text-xs">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-9 lg:px-[7.1vw]">
          <div className="flex flex-col items-center justify-between gap-6 border-b border-[hsl(var(--border))] pb-8 md:flex-row">
            <div className="flex items-center gap-3">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))]">
                <span className="absolute h-3.5 w-3.5 rounded-full border border-current opacity-70" />
                <span className="h-1 w-1 rounded-full bg-[hsl(var(--accent))]" />
              </span>
              <span className="font-extrabold tracking-[-.07em] text-[18px]">nova network</span>
              <span className="nova-mono text-[9px] uppercase tracking-[.15em] text-[hsl(var(--muted-foreground))]">
                Official Portal Website
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-[hsl(var(--muted-foreground))]">
              <button onClick={() => scrollToSection('eligibility')} className="hover:text-[hsl(var(--foreground))]">
                Eligibility Checker
              </button>
              <button onClick={() => scrollToSection('tokenomics')} className="hover:text-[hsl(var(--foreground))]">
                Allocation
              </button>
              <button onClick={() => scrollToSection('roadmap')} className="hover:text-[hsl(var(--foreground))]">
                Roadmap
              </button>
              <button onClick={() => scrollToSection('sheets-sync')} className="hover:text-[hsl(var(--foreground))]">
                Google Sheets
              </button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-[hsl(var(--foreground))]">
                FAQ
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              © 2026 Nova Network Foundation. All rights reserved. Nova is a decentralized protocol.
            </p>
            <div className="nova-mono text-[10px] text-[hsl(var(--muted-foreground))]">
              Security Audited · Non-Custodial Protocol
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
