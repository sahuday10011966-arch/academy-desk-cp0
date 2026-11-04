"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { ReadinessStats } from "@/lib/domain";
import type { UserRole } from "@/lib/permissions";

type User = { id: string; name: string; email: string; role: UserRole };
type Player = ReadinessStats & { id: string; name: string; age: number; sport: string; email?: string };
type Attendance = { playerId: string; status: "present" | "absent" };
type Session = { id: string; date: string; sport: string; status: "open" | "closed"; closedAt: string | null; attendance: Attendance[] };
type Match = {
  id: string;
  sessionId: string;
  date: string;
  sport: string;
  opponent: string;
  eligiblePlayerIds: string[];
  scores: Array<{ playerId: string; score: number }>;
};
type CoachDashboard = { role: "coach"; players: Player[]; sessions: Session[]; matches: Match[]; summary: { playerCount: number; readyCount: number; openSessions: number; sessionsHeld: number } };
type PlayerDashboard = {
  role: "player";
  profile: Player;
  sessions: Array<{ id: string; date: string; sport: string; status: "closed"; attendance: "present" | "absent" }>;
  matches: Array<{ id: string; date: string; sport: string; opponent: string; score: number | null }>;
};
type ScoutDashboard = { role: "scout"; players: Player[] };
type Dashboard = CoachDashboard | PlayerDashboard | ScoutDashboard;
class ApiFailure extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiFailure(result.error || "Request failed. Please try again.", response.status);
  return result as T;
}

function localToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function longToday(): string {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date());
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const shared = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></>,
    users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="4"/><path d="M18 8a4 4 0 0 1 0 7.7M22 20v-1.5a4 4 0 0 0-3-3.9"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></>,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/></>,
    chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M16 6h4v4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    ball: <><circle cx="12" cy="12" r="9"/><path d="m12 3 2.8 5.2 5.8 1.2-3.9 4.4.7 5.9-5.4-2.4-5.4 2.4.7-5.9-3.9-4.4 5.8-1.2L12 3Z"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    spark: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>
  };
  return <svg {...shared} aria-hidden="true" focusable="false">{paths[name] ?? paths.spark}</svg>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "brand-compact" : ""}`}>
    <span className="brand-mark"><Icon name="ball" size={22}/></span>
    {!compact && <span className="brand-name">academy<span>desk</span></span>}
  </div>;
}

function LoadingScreen() {
  return <main className="loading-screen"><Brand/><span className="loading-spinner"/><p>Getting your academy ready…</p></main>;
}

function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try { await onLogin(email, password); }
    catch (value) { setError(value instanceof Error ? value.message : "Unable to sign in."); }
    finally { setBusy(false); }
  };
  return <main className="login-page">
    <section className="login-story">
      <Brand/>
      <div className="story-content">
        <span className="eyebrow light-eyebrow"><span className="eyebrow-dot"/> DUMKA, JHARKHAND</span>
        <h1>Every session<br/>moves <em>you forward.</em></h1>
        <p>One calm place to track practice, celebrate progress, and help the right players get noticed.</p>
        <div className="story-orbit" aria-hidden="true"><span className="orbit-line orbit-line-one"/><span className="orbit-line orbit-line-two"/><span className="orbit-ball"><Icon name="ball" size={34}/></span><span className="orbit-dot orbit-dot-one"/><span className="orbit-dot orbit-dot-two"/></div>
        <div className="story-foot"><span>01</span><span className="story-rule"/><span>Built for the work behind every win.</span></div>
      </div>
      <div className="story-footer"><span>ACADEMY DESK</span><span>THE GAME STARTS HERE</span></div>
    </section>
    <section className="login-panel">
      <div className="login-mobile-brand"><Brand compact/><span>Academy Desk</span></div>
      <div className="login-card">
        <div className="login-heading"><span className="eyebrow">YOUR ACADEMY, IN SYNC</span><h2>Welcome back</h2><p>Sign in to pick up where your team left off.</p></div>
        <form className="form-stack" onSubmit={submit}>
          <label className="field-label" htmlFor="login-email">Email address</label>
          <input id="login-email" autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@academy.com" required maxLength={254}/>
          <div className="password-label"><label className="field-label" htmlFor="login-password">Password</label><span>Keep it private</span></div>
          <input id="login-password" autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required maxLength={72}/>
          {error && <div className="inline-error" role="alert">{error}</div>}
          <button className="button button-primary login-submit" type="submit" disabled={busy}>{busy ? <><span className="button-spinner"/> Signing in…</> : <>Sign in <Icon name="arrow" size={18}/></>}</button>
        </form>
        <div className="login-support"><span className="support-shield"><Icon name="lock" size={16}/></span><p>Your coach will share your sign-in details. Need help? <span>Ask your academy coach.</span></p></div>
      </div>
      <div className="login-bottom"><span>© {new Date().getFullYear()} Academy Desk</span><span>Made for the next practice.</span></div>
    </section>
  </main>;
}

function MetricCard({ label, value, detail, icon, accent = false }: { label: string; value: string | number; detail: string; icon: string; accent?: boolean }) {
  return <article className={`metric-card ${accent ? "metric-accent" : ""}`}>
    <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon name={icon} size={19}/></span></div>
    <div className="metric-value">{value}</div>
    <div className="metric-detail">{detail}</div>
  </article>;
}

function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span className={`avatar ${large ? "avatar-large" : ""}`} aria-hidden="true">{initials(name)}</span>;
}

function ReadinessBadge({ ready }: { ready: boolean }) {
  return <span className={`readiness-badge ${ready ? "ready" : "not-ready"}`}><span/>{ready ? "Ready" : "Building"}</span>;
}

function EmptyState({ icon, title, detail, action }: { icon: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={22}/></span><h3>{title}</h3><p>{detail}</p>{action}</div>;
}

function SectionTitle({ kicker, title, description, action }: { kicker?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="section-title-row"><div>{kicker && <span className="eyebrow">{kicker}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

function AddPlayerDialog({ onClose, onCreate, busy }: { onClose: () => void; onCreate: (form: HTMLFormElement) => Promise<boolean>; busy: boolean }) {
  const [error, setError] = useState("");
  const [sport, setSport] = useState("Football");
  const [password, setPassword] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const ok = await onCreate(form);
    if (!ok) setError("We couldn’t add this player. Check the details and try again.");
  };
  return <div className="modal-shade" role="presentation">
    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-player-title">
      <div className="modal-heading"><div><span className="eyebrow">GROW YOUR ROSTER</span><h2 id="add-player-title">Add a player</h2><p>Create their profile and sign-in account.</p></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div>
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid two-col">
          <label className="form-field">Full name<input name="name" placeholder="e.g. Aarav Mehta" required minLength={2} maxLength={80}/></label>
          <label className="form-field">Age<input name="age" type="number" inputMode="numeric" min={5} max={80} placeholder="16" required/></label>
          <label className="form-field">Sport<input name="sport" list="sport-options" value={sport} onChange={(event) => setSport(event.target.value)} required maxLength={32}/><datalist id="sport-options"><option value="Football"/><option value="Cricket"/><option value="Hockey"/><option value="Badminton"/><option value="Basketball"/></datalist></label>
          <label className="form-field">Player email<input name="email" type="email" autoComplete="off" placeholder="player@example.com" required maxLength={254}/></label>
        </div>
        <label className="form-field">Initial password<input name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" required minLength={12} maxLength={72}/><span className="field-help">Share this with the player securely outside Academy Desk.</span></label>
        {error && <div className="inline-error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? "Adding player…" : <><Icon name="plus" size={17}/> Add player</>}</button></div>
      </form>
    </section>
  </div>;
}

function CoachOverview({ data, onNavigate }: { data: CoachDashboard; onNavigate: (view: string) => void }) {
  const active = data.sessions.find((session) => session.status === "open");
  const upcomingPlayers = [...data.players].sort((a, b) => Number(b.isReady) - Number(a.isReady) || b.attendancePercent - a.attendancePercent).slice(0, 4);
  const recentMatches = data.matches.slice(0, 3);
  return <>
    <div className="metrics-grid">
      <MetricCard label="Players on roster" value={data.summary.playerCount} detail="Across your academy" icon="users"/>
      <MetricCard label="Sessions held" value={data.summary.sessionsHeld} detail="Attendance locked in" icon="calendar"/>
      <MetricCard label="Ready to be seen" value={data.summary.readyCount} detail="75% attendance · 2+ matches" icon="spark" accent/>
      <MetricCard label="Open practice" value={data.summary.openSessions} detail={active ? `${active.sport} · ${formatDate(active.date)}` : "No session in progress"} icon="chart"/>
    </div>
    {active && <button type="button" className="active-session-banner" onClick={() => onNavigate("practice")}>
      <span className="active-live"><i/> IN PROGRESS</span><span className="active-copy"><strong>{active.sport} practice</strong><span>{formatDate(active.date)} · {active.attendance.filter((entry) => entry.status === "present").length} present so far</span></span><span className="banner-arrow"><Icon name="arrow"/></span>
    </button>}
    <div className="overview-grid">
      <section className="surface-card overview-roster">
        <div className="card-heading"><div><span className="eyebrow">YOUR PEOPLE</span><h2>Roster snapshot</h2></div><button type="button" className="text-button" onClick={() => onNavigate("players")}>View roster <Icon name="arrow" size={16}/></button></div>
        {upcomingPlayers.length ? <div className="mini-roster">{upcomingPlayers.map((player) => <div className="mini-player" key={player.id}><Avatar name={player.name}/><div className="mini-player-name"><strong>{player.name}</strong><span>{player.sport} · age {player.age}</span></div><div className="mini-player-progress"><strong>{player.attendancePercent}%</strong><span>attendance</span></div><ReadinessBadge ready={player.isReady}/></div>)}</div> : <EmptyState icon="users" title="Your roster starts here" detail="Add your first player to get practice and readiness tracking underway." action={<button type="button" className="button button-primary" onClick={() => onNavigate("players")}><Icon name="plus" size={17}/> Add a player</button>}/>}</section>
      <section className="surface-card overview-next">
        <div className="card-heading"><div><span className="eyebrow">KEEP THE MOMENTUM</span><h2>Next up</h2></div><span className="soft-icon"><Icon name="spark"/></span></div>
        <div className="next-step"><span className="step-index">01</span><div><strong>Take attendance</strong><span>Open a practice session and check in your players.</span></div><button type="button" className="round-arrow" aria-label="Go to practice" onClick={() => onNavigate("practice")}><Icon name="arrow" size={17}/></button></div>
        <div className="next-step"><span className="step-index">02</span><div><strong>Record a match</strong><span>Scores count toward a player’s readiness.</span></div><button type="button" className="round-arrow" aria-label="Go to matches" onClick={() => onNavigate("matches")}><Icon name="arrow" size={17}/></button></div>
        {recentMatches.length > 0 && <div className="recent-result"><span className="recent-result-mark"><Icon name="trophy" size={17}/></span><div><span>RECENT MATCH</span><strong>vs {recentMatches[0].opponent}</strong></div><span className="recent-result-date">{formatDate(recentMatches[0].date)}</span></div>}
      </section>
    </div>
  </>;
}

function PlayerTable({ players, onAdd }: { players: Player[]; onAdd: () => void }) {
  return <section className="surface-card roster-card">
    <div className="card-heading"><div><span className="eyebrow">THE TEAM</span><h2>Player roster <span className="count-pill">{players.length}</span></h2></div><button type="button" className="button button-primary" onClick={onAdd}><Icon name="plus" size={17}/> Add player</button></div>
    {players.length ? <div className="table-scroll"><table><thead><tr><th>PLAYER</th><th>SPORT</th><th>ATTENDANCE</th><th>MATCHES</th><th>STATUS</th></tr></thead><tbody>
      {players.map((player) => <tr key={player.id}><td><div className="table-player"><Avatar name={player.name}/><span><strong>{player.name}</strong><small>Age {player.age} · {player.email}</small></span></div></td><td><span className="sport-pill">{player.sport}</span></td><td><div className="attendance-cell"><span>{player.attendancePercent}%</span><div className="progress-track"><i style={{ width: `${Math.min(player.attendancePercent, 100)}%` }}/></div></div></td><td>{player.matchesPlayed}</td><td><ReadinessBadge ready={player.isReady}/></td></tr>)}
    </tbody></table></div> : <EmptyState icon="users" title="A roster with room to grow" detail="Add players to set up profiles, create sign-in access, and start tracking progress." action={<button type="button" className="button button-primary" onClick={onAdd}><Icon name="plus" size={17}/> Add your first player</button>}/>}</section>;
}

function PlayerForm({ onCreate, busy }: { onCreate: (form: HTMLFormElement) => Promise<boolean>; busy: boolean }) {
  const [sport, setSport] = useState("Football");
  const [problem, setProblem] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setProblem("");
    if (await onCreate(form)) form.reset();
    else setProblem("We couldn’t add this player. Check the details and try again.");
  };
  return <section className="surface-card roster-card"><SectionTitle kicker="THE TEAM" title="Add a player" description="Create their profile and sign-in account."/>
    <form className="wide-form" onSubmit={submit}>
      <div className="form-grid two-col"><label className="form-field">Full name<input name="name" placeholder="e.g. Aarav Mehta" required minLength={2} maxLength={80}/></label><label className="form-field">Age<input name="age" type="number" inputMode="numeric" min={5} max={80} placeholder="16" required/></label><label className="form-field">Sport<input name="sport" list="roster-sport-options" value={sport} onChange={(event) => setSport(event.target.value)} required maxLength={32}/><datalist id="roster-sport-options"><option value="Football"/><option value="Cricket"/><option value="Hockey"/><option value="Badminton"/><option value="Basketball"/></datalist></label><label className="form-field">Player email<input name="email" type="email" autoComplete="off" placeholder="player@example.com" required maxLength={254}/></label><label className="form-field form-span-two">Initial password<input name="password" type="password" autoComplete="new-password" placeholder="At least 12 characters" required minLength={12} maxLength={72}/><span className="field-help">Share this with the player securely outside Academy Desk.</span></label></div>
      {problem && <div className="inline-error" role="alert">{problem}</div>}<div className="form-actions"><button type="submit" className="button button-primary" disabled={busy}>{busy ? "Adding player…" : <><Icon name="plus" size={17}/> Add player</>}</button></div>
    </form>
  </section>;
}

function PracticeView({ data, onMutate, busyKey }: { data: CoachDashboard; onMutate: Mutate; busyKey: string }) {
  const [sport, setSport] = useState("Football");
  const [date, setDate] = useState(localToday());
  const [closing, setClosing] = useState<string | null>(null);
  const sports = useMemo(() => [...new Set([...data.players.map((player) => player.sport), "Football", "Cricket", "Hockey", "Badminton", "Basketball"])], [data.players]);
  const openSessions = data.sessions.filter((session) => session.status === "open");
  const closedSessions = data.sessions.filter((session) => session.status === "closed");
  const createSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    if (await onMutate("create-session", "/api/sessions", body, "Practice session opened. Attendance starts as Absent.")) form.reset();
  };
  const setAttendance = (session: Session, playerId: string, status: "present" | "absent") => onMutate(`attendance-${playerId}`, `/api/sessions/${session.id}`, { action: "attendance", playerId, status }, status === "present" ? "Marked Present." : "Marked Absent.", "PATCH");
  const closeSession = async (session: Session) => {
    if (closing !== session.id) { setClosing(session.id); return; }
    const ok = await onMutate(`close-${session.id}`, `/api/sessions/${session.id}`, { action: "close" }, "Session closed. Attendance is now locked.", "PATCH");
    setClosing(null);
    if (ok) setClosing(null);
  };
  return <div className="practice-layout">
    <section className="surface-card open-session-card"><SectionTitle kicker="SHOW UP, GET COUNTED" title="Open a practice session" description="Choose a date and sport. Every player starts as Absent."/>
      <form className="create-session-form" onSubmit={createSession}><label className="form-field">Practice date<input name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required/></label><label className="form-field">Sport<select name="sport" value={sport} onChange={(event) => setSport(event.target.value)}>{sports.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><button type="submit" className="button button-primary" disabled={!data.players.some((player) => player.sport === sport) || busyKey === "create-session"}><Icon name="plus" size={17}/> {busyKey === "create-session" ? "Opening…" : "Open session"}</button></form>
      {!data.players.length && <p className="form-note">Add a player first, then open a practice session.</p>}
      {data.players.length > 0 && !data.players.some((player) => player.sport === sport) && <p className="form-note">No {sport} players are on your roster yet. Choose a sport with players or add a player.</p>}
    </section>
    {openSessions.length > 0 && <section className="session-section"><SectionTitle kicker="IN PROGRESS" title="Open sessions" description="Attendance can change until you close the session."/>
      {openSessions.map((session) => <article className="surface-card session-card" key={session.id}><div className="session-card-head"><div className="session-title"><span className="session-sport-icon"><Icon name="ball" size={19}/></span><div><h3>{session.sport} practice</h3><span>{formatDate(session.date)} · {session.attendance.length} players</span></div></div><span className="status-chip status-open"><i/> Attendance open</span></div>
        <div className="attendance-list">{session.attendance.map((entry) => {
          const player = data.players.find((candidate) => candidate.id === entry.playerId);
          if (!player) return null;
          return <div className="attendance-row" key={entry.playerId}><div className="table-player"><Avatar name={player.name}/><span><strong>{player.name}</strong><small>{player.sport}</small></span></div><fieldset className="attendance-toggle"><legend className="sr-only">{player.name} attendance</legend><button type="button" className={entry.status === "present" ? "selected-present" : ""} aria-pressed={entry.status === "present"} aria-label={`Mark ${player.name} Present`} onClick={() => void setAttendance(session, player.id, "present")} disabled={busyKey === `attendance-${player.id}`}>Present</button><button type="button" className={entry.status === "absent" ? "selected-absent" : ""} aria-pressed={entry.status === "absent"} aria-label={`Mark ${player.name} Absent`} onClick={() => void setAttendance(session, player.id, "absent")} disabled={busyKey === `attendance-${player.id}`}>Absent</button></fieldset></div>;
        })}</div>
        <div className="session-footer"><span><Icon name="lock" size={15}/> Closing locks all attendance for this session.</span><button type="button" className={`button ${closing === session.id ? "button-danger" : "button-dark"}`} onClick={() => void closeSession(session)} disabled={busyKey === `close-${session.id}`}>{busyKey === `close-${session.id}` ? "Closing…" : closing === session.id ? "Confirm close" : "Close session"}</button>{closing === session.id && <button type="button" className="text-button cancel-close" onClick={() => setClosing(null)}>Cancel</button>}</div>
      </article>)}
    </section>}
    <section className="session-section"><SectionTitle kicker="YOUR TRAINING HISTORY" title="Closed sessions" description="Locked records count toward player attendance."/>
      {closedSessions.length ? <div className="closed-session-list">{closedSessions.map((session) => <article className="surface-card closed-session-row" key={session.id}><span className="session-sport-icon"><Icon name="calendar" size={18}/></span><div className="closed-session-main"><strong>{session.sport} practice</strong><span>{formatDate(session.date)}</span></div><span className="closed-attendance-count"><strong>{session.attendance.filter((entry) => entry.status === "present").length}</strong> / {session.attendance.length} present</span><span className="status-chip status-closed"><Icon name="lock" size={13}/> Closed</span></article>)}</div> : <EmptyState icon="calendar" title="No closed sessions yet" detail="Open a practice, mark attendance, and close it to lock in the record."/>}
    </section>
  </div>;
}

function MatchesView({ data, onMutate, busyKey }: { data: CoachDashboard; onMutate: Mutate; busyKey: string }) {
  const closedSessions = data.sessions.filter((session) => session.status === "closed");
  const [sessionId, setSessionId] = useState("");
  const selected = closedSessions.find((session) => session.id === sessionId) ?? closedSessions[0];
  const createMatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    if (selected) body.sessionId = selected.id;
    if (await onMutate("create-match", "/api/matches", body, "Match recorded. Only Present players are on this sheet.")) form.reset();
  };
  return <div className="matches-layout">
    <section className="surface-card match-create-card"><SectionTitle kicker="PLAY THE GAME" title="Record a match" description="A closed practice session sets the eligible player sheet."/>
      {closedSessions.length ? <form className="match-create-form" onSubmit={createMatch}><label className="form-field">Practice session<select value={selected?.id ?? ""} onChange={(event) => setSessionId(event.target.value)} name="sessionId" required>{closedSessions.map((session) => <option key={session.id} value={session.id}>{session.sport} · {formatDate(session.date)}</option>)}</select></label><div className="match-detail-pair"><div><span>DATE</span><strong>{selected ? formatDate(selected.date) : "—"}</strong></div><div><span>SPORT</span><strong>{selected?.sport ?? "—"}</strong></div></div><input type="hidden" name="date" value={selected?.date ?? ""}/><input type="hidden" name="sport" value={selected?.sport ?? ""}/><label className="form-field">Opponent<input name="opponent" placeholder="e.g. Dumka United" required maxLength={80}/></label><button type="submit" className="button button-primary" disabled={!selected || busyKey === "create-match"}><Icon name="plus" size={17}/>{busyKey === "create-match" ? "Saving match…" : "Save match"}</button><p className="form-note">Only players marked Present in the selected session can receive a score.</p></form> : <EmptyState icon="calendar" title="Close a practice first" detail="A match uses a closed practice session on the same date and sport to determine who played."/>}
    </section>
    <section className="match-history-section"><SectionTitle kicker="RESULTS & PLAYER SCORES" title="Match sheets" description="Scores are saved per eligible player. Scale: 0 to 100."/>
      {data.matches.length ? <div className="match-sheet-list">{data.matches.map((match) => <MatchSheet key={match.id} match={match} players={data.players} onMutate={onMutate} busyKey={busyKey}/>)}</div> : <EmptyState icon="trophy" title="No matches on the board" detail="Record your first match after closing the practice session that day."/>}
    </section>
  </div>;
}

function MatchSheet({ match, players, onMutate, busyKey }: { match: Match; players: Player[]; onMutate: Mutate; busyKey: string }) {
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(match.scores.map((entry) => [entry.playerId, String(entry.score)])));
  const roster = match.eligiblePlayerIds.map((id) => players.find((player) => player.id === id)).filter((player): player is Player => Boolean(player));
  const saveScore = async (playerId: string) => {
    await onMutate(`score-${playerId}`, `/api/matches/${match.id}/scores`, { playerId, score: scores[playerId] }, "Player score saved.");
  };
  return <article className="surface-card match-sheet"><div className="match-sheet-header"><div><span className="eyebrow">{match.sport.toUpperCase()} · {formatDate(match.date)}</span><h3>vs {match.opponent}</h3></div><span className="eligible-count"><Icon name="users" size={15}/>{roster.length} eligible</span></div>
    {roster.length ? <div className="match-player-list">{roster.map((player) => {
      const current = match.scores.find((entry) => entry.playerId === player.id);
      return <div className="match-player-row" key={player.id}><div className="table-player"><Avatar name={player.name}/><span><strong>{player.name}</strong><small>{player.sport}</small></span></div><div className="score-entry"><label className="sr-only" htmlFor={`score-${match.id}-${player.id}`}>{player.name} score from 0 to 100</label><input id={`score-${match.id}-${player.id}`} type="number" inputMode="decimal" min={0} max={100} step="0.1" placeholder="—" value={scores[player.id] ?? ""} onChange={(event) => setScores((prev) => ({ ...prev, [player.id]: event.target.value }))}/><button type="button" className="score-save" onClick={() => void saveScore(player.id)} disabled={busyKey === `score-${player.id}` || scores[player.id] === undefined || scores[player.id] === ""}>{busyKey === `score-${player.id}` ? "Saving…" : current ? "Update" : "Save score"}</button></div></div>;
    })}</div> : <div className="no-eligible"><Icon name="eye" size={18}/><span>No players were marked Present for this session, so this match has no scoreable players.</span></div>}
  </article>;
}

function PlayerWorkspace({ data }: { data: PlayerDashboard }) {
  const { profile } = data;
  return <>
    <div className="player-welcome surface-card"><div className="player-welcome-main"><Avatar name={profile.name} large/><div><span className="eyebrow">YOUR PLAYER CARD</span><h2>{profile.name}</h2><p>{profile.sport} · age {profile.age}</p></div></div><ReadinessBadge ready={profile.isReady}/></div>
    <div className="metrics-grid player-metrics"><MetricCard label="Attendance" value={`${profile.attendancePercent}%`} detail={profile.sessionsHeld ? `${profile.sessionsPresent} of ${profile.sessionsHeld} sessions` : "No sessions recorded yet"} icon="calendar" accent/><MetricCard label="Matches played" value={profile.matchesPlayed} detail="Scores on your player card" icon="trophy"/><article className="readiness-explainer"><span className="readiness-symbol"><Icon name="spark" size={20}/></span><div><strong>Ready to be seen</strong><span>75% attendance and at least 2 matches unlock Ready status.</span></div></article></div>
    <div className="player-record-grid"><section className="surface-card record-card"><div className="card-heading"><div><span className="eyebrow">SHOWING UP</span><h2>Attendance history</h2></div><span className="count-pill">{data.sessions.length}</span></div>{data.sessions.length ? <div className="record-list">{data.sessions.map((session) => <div className="record-row" key={session.id}><span className={`record-mark ${session.attendance}`}><Icon name={session.attendance === "present" ? "check" : "close"} size={15}/></span><div><strong>{session.sport} practice</strong><span>{formatDate(session.date)}</span></div><span className={`record-status ${session.attendance}`}>{session.attendance === "present" ? "Present" : "Absent"}</span></div>)}</div> : <EmptyState icon="calendar" title="Your story starts at practice" detail="Once your coach closes a session, your attendance appears here."/>}</section>
      <section className="surface-card record-card"><div className="card-heading"><div><span className="eyebrow">ON THE SCOREBOARD</span><h2>Match history</h2></div><span className="count-pill">{data.matches.length}</span></div>{data.matches.length ? <div className="record-list">{data.matches.map((match) => <div className="record-row match-record-row" key={match.id}><span className="record-mark score-mark"><Icon name="trophy" size={16}/></span><div><strong>vs {match.opponent}</strong><span>{match.sport} · {formatDate(match.date)}</span></div><span className="score-value">{match.score ?? "—"}<small> / 100</small></span></div>)}</div> : <EmptyState icon="trophy" title="Your first match is ahead" detail="Your coach will add match scores to your player card."/>}</section></div>
  </>;
}

function ScoutWorkspace({ data }: { data: ScoutDashboard }) {
  return <><div className="scout-intro"><div><span className="eyebrow">PLAYER DISCOVERY</span><h2>Ready for the next step.</h2><p>Only athletes meeting both academy benchmarks appear here.</p></div><span className="scout-compass"><Icon name="spark" size={26}/></span></div><div className="scout-rule"><span className="rule-check"><Icon name="check" size={17}/></span><span><strong>Readiness criteria</strong><small>At least 75% attendance <i/> 2 or more match scores</small></span><strong className="rule-count">{data.players.length} ready</strong></div>
    {data.players.length ? <div className="scout-grid">{data.players.map((player) => <article className="surface-card scout-player" key={player.id}><div className="scout-player-top"><Avatar name={player.name} large/><ReadinessBadge ready/></div><h3>{player.name}</h3><p>{player.sport} · age {player.age}</p><div className="scout-stats"><div><strong>{player.attendancePercent}%</strong><span>attendance</span></div><div><strong>{player.matchesPlayed}</strong><span>matches played</span></div><div><strong>{player.sessionsPresent}/{player.sessionsHeld}</strong><span>sessions present</span></div></div><div className="scout-ready-footer"><span><Icon name="check" size={15}/> Meets both benchmarks</span><Icon name="arrow" size={17}/></div></article>)}</div> : <div className="surface-card scout-empty"><span className="scout-empty-icon"><Icon name="eye" size={27}/></span><h3>The next standout is in the making.</h3><p>Players appear here when their attendance reaches 75% and they have at least two match scores. Keep checking in after each practice and match.</p><div className="empty-benchmarks"><span><Icon name="calendar" size={17}/> 75%+ attendance</span><span><Icon name="trophy" size={17}/> 2+ matches</span></div></div>}
  </>;
}

type Mutate = (key: string, path: string, body: unknown, success: string, method?: "POST" | "PATCH") => Promise<boolean>;

function Navigation({ role, active, onChange }: { role: UserRole; active: string; onChange: (view: string) => void }) {
  const items = role === "coach" ? [
    { id: "overview", label: "Overview", icon: "grid" }, { id: "players", label: "Players", icon: "users" }, { id: "practice", label: "Practice", icon: "calendar" }, { id: "matches", label: "Matches", icon: "trophy" }
  ] : role === "player" ? [{ id: "progress", label: "My progress", icon: "chart" }] : [{ id: "ready", label: "Ready board", icon: "eye" }];
  return <nav className="side-nav" aria-label="Main navigation">{items.map((item) => <button type="button" className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => onChange(item.id)} key={item.id} aria-current={active === item.id ? "page" : undefined}><Icon name={item.icon} size={19}/><span>{item.label}</span>{item.id === "practice" && role === "coach" && <span className="nav-indicator"/>}</button>)}</nav>;
}

function viewTitle(role: UserRole, view: string): { eyebrow: string; title: string; description: string } {
  if (role === "player") return { eyebrow: "PLAYER SPACE", title: "Your progress", description: "Every practice and match is part of your story." };
  if (role === "scout") return { eyebrow: "SCOUT SPACE", title: "Ready board", description: "A clear view of players who meet the academy benchmarks." };
  if (view === "players") return { eyebrow: "ACADEMY ROSTER", title: "Your players", description: "Keep profiles and progress together in one place." };
  if (view === "practice") return { eyebrow: "TRAINING & ATTENDANCE", title: "Practice", description: "Start a session, take attendance, and lock it when you’re done." };
  if (view === "matches") return { eyebrow: "COMPETITION & SCORES", title: "Matches", description: "Build a player sheet from who showed up that day." };
  return { eyebrow: "COACH SPACE", title: "Your academy, in sync.", description: "A steady view of who’s showing up and who’s ready for more." };
}

function Workspace({ user, dashboard, onLogout, onRefresh }: { user: User; dashboard: Dashboard; onLogout: () => void; onRefresh: () => Promise<void> }) {
  const defaultView = user.role === "coach" ? "overview" : user.role === "player" ? "progress" : "ready";
  const [view, setView] = useState(defaultView);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const heading = viewTitle(user.role, view);
  const name = user.name.trim().split(/\s+/)[0];

  const mutate: Mutate = async (key, path, body, success, method = "POST") => {
    setBusyKey(key);
    setNotice("");
    setFailure("");
    try {
      await api(path, { method, body: JSON.stringify(body) });
      await onRefresh();
      setNotice(success);
      return true;
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "We couldn’t save that change.");
      return false;
    } finally {
      setBusyKey("");
    }
  };

  const createPlayer = async (form: HTMLFormElement) => {
    const ok = await mutate("create-player", "/api/players", Object.fromEntries(new FormData(form).entries()), "Player added. Share their sign-in details securely.");
    if (ok) {
      form.reset();
      setDialogOpen(false);
    }
    return ok;
  };

  const logout = async () => {
    setLogoutBusy(true);
    try { await api("/api/auth/logout", { method: "POST" }); onLogout(); }
    catch (error) { setFailure(error instanceof Error ? error.message : "Could not sign out."); }
    finally { setLogoutBusy(false); }
  };

  return <div className="app-shell">
    <aside className="sidebar"><div className="sidebar-top"><Brand/><span className="academy-label">ACADEMY WORKSPACE</span><Navigation role={user.role} active={view} onChange={setView}/></div><div className="sidebar-bottom"><div className="academy-switcher"><span className="academy-seal"><Icon name="ball" size={17}/></span><div><strong>Dumka Academy</strong><span>Jharkhand, India</span></div><span className="academy-live"/></div><button className="profile-button" type="button" onClick={() => void logout()} disabled={logoutBusy}><Avatar name={user.name}/><span className="profile-copy"><strong>{user.name}</strong><small>{user.role}</small></span><span className="logout-icon"><Icon name="logout" size={18}/></span></button></div></aside>
    <div className="workspace-main"><header className="topbar"><div className="mobile-brand"><Brand compact/></div><div className="topbar-date"><span className="date-mark"><Icon name="calendar" size={16}/></span>{longToday()}</div><div className="topbar-right"><span className="topbar-location"><span className="location-pip"/> Dumka, Jharkhand</span><button type="button" className="topbar-avatar" aria-label={`Sign out ${user.name}`} onClick={() => void logout()} disabled={logoutBusy}><Avatar name={user.name}/></button></div></header>
      <main className="workspace-content"><div className="page-intro"><div><span className="eyebrow">{heading.eyebrow}</span><h1>{heading.title}</h1><p>{user.role === "coach" && view === "overview" ? `Good to see you, ${name}. Here’s what’s happening at your academy.` : heading.description}</p></div>{user.role === "coach" && view !== "practice" && view !== "matches" && <button type="button" className="button button-primary page-action" onClick={() => view === "players" ? setDialogOpen(true) : setView("practice")}><Icon name="plus" size={17}/>{view === "players" ? "Add player" : "Open practice"}</button>}</div>
        {(notice || failure) && <div className={`toast-message ${failure ? "toast-error" : "toast-success"}`} role={failure ? "alert" : "status"}><span>{failure ? <Icon name="close" size={17}/> : <Icon name="check" size={17}/>}</span>{failure || notice}<button type="button" aria-label="Dismiss message" onClick={() => { setNotice(""); setFailure(""); }}><Icon name="close" size={15}/></button></div>}
        {dashboard.role === "coach" && <>
          {view === "overview" && <CoachOverview data={dashboard} onNavigate={setView}/>}
          {view === "players" && <PlayerTable players={dashboard.players} onAdd={() => setDialogOpen(true)}/>}
          {view === "players-add" && <PlayerForm onCreate={createPlayer} busy={busyKey === "create-player"}/>}
          {view === "practice" && <PracticeView data={dashboard} onMutate={mutate} busyKey={busyKey}/>}
          {view === "matches" && <MatchesView data={dashboard} onMutate={mutate} busyKey={busyKey}/>}
        </>}
        {dashboard.role === "player" && <PlayerWorkspace data={dashboard}/>}
        {dashboard.role === "scout" && <ScoutWorkspace data={dashboard}/>}
        <footer className="workspace-footer"><span>ACADEMY DESK <i/> BUILT FOR THE LONG GAME</span><span>Player records stay within your academy.</span></footer>
      </main>
    </div>
    {dialogOpen && dashboard.role === "coach" && <AddPlayerDialog onClose={() => setDialogOpen(false)} onCreate={createPlayer} busy={busyKey === "create-player"}/>}
    <div className="mobile-bottom-nav"><Navigation role={user.role} active={view} onChange={setView}/></div>
  </div>;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState("");

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const response = await api<{ user: User }>("/api/auth/me");
        if (!mounted) return;
        setUser(response.user);
        const nextDashboard = await api<Dashboard>("/api/dashboard");
        if (mounted) setDashboard(nextDashboard);
      } catch (error) {
        if (!mounted) return;
        if (!(error instanceof ApiFailure && error.status === 401)) setBootError(error instanceof Error ? error.message : "Unable to load the academy.");
        setUser(null);
      } finally { if (mounted) setLoading(false); }
    };
    void start();
    return () => { mounted = false; };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setUser(response.user);
    const nextDashboard = await api<Dashboard>("/api/dashboard");
    setDashboard(nextDashboard);
    setBootError("");
  };

  if (loading) return <LoadingScreen/>;
  if (user && dashboard) return <Workspace user={user} dashboard={dashboard} onLogout={() => { setUser(null); setDashboard(null); }} onRefresh={async () => { const next = await api<Dashboard>("/api/dashboard"); setDashboard(next); }}/>;
  return <><LoginScreen onLogin={login}/>{bootError && <div className="bootstrap-notice" role="status">Workspace needs attention: {bootError}</div>}</>;
}
