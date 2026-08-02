'use client';

/**
 * MESSENGER WIDGET
 * ─────────────────────────────────────────────────────────────
 * A floating, role-based chat widget fixed to the bottom-right.
 *
 * Closed state  → 56×56px circular button with unread badge
 * Opened state  → 380×520px chat panel with contacts + thread view
 *
 * Access control (mirrored from backend):
 *   Student  → can only contact Nurse, Doctor, Dentist
 *   Staff    → can contact all other staff + reply to students who messaged them
 *
 * Silent refresh: polling calls fetchThread(id, true) which skips the
 * loading spinner so the UI never flickers during background updates.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getToken } from '@/lib/auth';
import { api } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────

interface Contact {
  id: string;
  email: string;
  display_name: string;
  role: string;
  staff_type: string | null;
  role_label: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
}

interface ContactsResponse {
  success: boolean;
  contacts: Contact[];
}

interface ThreadResponse {
  success: boolean;
  messages: Message[];
  target: Contact;
}

interface SendResponse {
  success: boolean;
  message: Message;
}

interface UnreadCountResponse {
  success: boolean;
  count: number;
}

// ── Helpers ───────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function roleColor(roleLabel: string): string {
  switch (roleLabel) {
    case 'Nurse':   return '#0d9488'; // teal
    case 'Doctor':  return '#2563eb'; // blue
    case 'Dentist': return '#7c3aed'; // violet
    default:        return '#64748b'; // slate (student)
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now  = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffM  = Math.floor(diffMs / 60000);

  if (diffM < 1)  return 'just now';
  if (diffM < 60) return `${diffM}m ago`;

  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────

/** Avatar circle with initials and role colour */
function Avatar({
  name,
  roleLabel,
  size = 36,
}: {
  name: string;
  roleLabel: string;
  size?: number;
}) {
  const bg = roleColor(roleLabel);
  return (
    <div
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: size * 0.38,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '-0.02em',
      }}
    >
      {getInitials(name)}
    </div>
  );
}

/** Role pill badge */
function RoleBadge({ label }: { label: string }) {
  const color = roleColor(label);
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color,
        background: `${color}18`,
        borderRadius: 99,
        padding: '1px 7px',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        border: `1px solid ${color}33`,
      }}
    >
      {label}
    </span>
  );
}

/** Contact list view */
function ContactListView({
  contacts,
  loading,
  onSelect,
}: {
  contacts: Contact[];
  loading: boolean;
  onSelect: (contact: Contact) => void;
}) {
  if (loading) {
    return (
      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '0 16px' }}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton" style={{ height: 12, borderRadius: 6, width: '60%' }} />
              <div className="skeleton" style={{ height: 10, borderRadius: 6, width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        gap: 8,
        color: '#94a3b8',
        textAlign: 'center',
      }}>
        <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>No contacts yet</p>
        <p style={{ fontSize: 12 }}>Messages from students will appear here.</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
      {contacts.map((contact) => (
        <button
          key={contact.id}
          onClick={() => onSelect(contact)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <div style={{ position: 'relative' }}>
            <Avatar name={contact.display_name} roleLabel={contact.role_label} size={40} />
            {contact.unread_count > 0 && (
              <span style={{
                position: 'absolute',
                top: -3,
                right: -3,
                background: '#ef4444',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                borderRadius: 99,
                minWidth: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '2px solid #fff',
              }}>
                {contact.unread_count > 9 ? '9+' : contact.unread_count}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {contact.display_name}
              </span>
              <RoleBadge label={contact.role_label} />
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {contact.email}
            </p>
          </div>
          {contact.unread_count > 0 && (
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#2563eb',
              flexShrink: 0,
            }} />
          )}
        </button>
      ))}
    </div>
  );
}

/** Individual message bubble */
function MessageBubble({ msg }: { msg: Message }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: msg.is_mine ? 'flex-end' : 'flex-start',
      marginBottom: 4,
    }}>
      <div style={{
        maxWidth: '78%',
        padding: '8px 12px',
        borderRadius: msg.is_mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: msg.is_mine
          ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
          : '#f1f5f9',
        color: msg.is_mine ? '#fff' : '#334155',
        fontSize: 13,
        lineHeight: '1.45',
        wordBreak: 'break-word',
        boxShadow: msg.is_mine
          ? '0 2px 8px rgba(37,99,235,0.25)'
          : '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {msg.body}
      </div>
      <span style={{
        fontSize: 10,
        color: '#94a3b8',
        marginTop: 3,
        marginLeft: msg.is_mine ? 0 : 4,
        marginRight: msg.is_mine ? 4 : 0,
      }}>
        {formatTime(msg.created_at)}
        {msg.is_mine && (
          <span style={{ marginLeft: 4, opacity: 0.7 }}>
            {msg.is_read ? '✓✓' : '✓'}
          </span>
        )}
      </span>
    </div>
  );
}

/** Thread (conversation) view */
function ThreadView({
  contact,
  messages,
  loading,
  sending,
  onSend,
  onBack,
}: {
  contact: Contact;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  onSend: (body: string) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when thread opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setDraft('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Thread header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid #e2e8f0',
        background: '#fff',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 8,
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          aria-label="Back to contacts"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Avatar name={contact.display_name} roleLabel={contact.role_label} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.display_name}
          </p>
          <RoleBadge label={contact.role_label} />
        </div>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        background: '#f8fafc',
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', fontSize: 13 }}>
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 6, color: '#94a3b8', textAlign: 'center' }}>
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>No messages yet</p>
            <p style={{ fontSize: 11 }}>Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #e2e8f0',
        background: '#fff',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
      }}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type a message… (Enter to send)"
          style={{
            flex: 1,
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '8px 12px',
            fontSize: 13,
            color: '#334155',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.45',
            background: '#f8fafc',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            maxHeight: 80,
            overflowY: 'auto',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#2563eb';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.15)';
            e.currentTarget.style.background = '#fff';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.background = '#f8fafc';
          }}
        />
        <button
          onClick={submit}
          disabled={!draft.trim() || sending}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: draft.trim() && !sending
              ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
              : '#e2e8f0',
            color: draft.trim() && !sending ? '#fff' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            transition: 'background 0.15s, transform 0.1s',
            boxShadow: draft.trim() && !sending ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
          }}
          aria-label="Send message"
          onMouseDown={(e) => {
            if (draft.trim() && !sending) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)';
            }
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main Widget ───────────────────────────────────────────────

export default function MessengerWidget() {
  const [isOpen,   setIsOpen]   = useState(false);
  const [view,     setView]     = useState<'contacts' | 'thread'>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingThread,   setLoadingThread]   = useState(false);
  const [sending,   setSending]   = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOpenRef  = useRef(isOpen);
  const activeRef  = useRef(activeContact);

  isOpenRef.current  = isOpen;
  activeRef.current  = activeContact;

  const token = getToken();

  // ── Fetch contacts ─────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setLoadingContacts(true);
    setError(null);
    try {
      const data = await api.get<ContactsResponse>('/messages/contacts', token);
      setContacts(data.contacts ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load contacts.';
      setError(msg);
    } finally {
      setLoadingContacts(false);
    }
  }, [token]);

  // ── Fetch unread count (polling even when closed) ──────────

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get<UnreadCountResponse>('/messages/unread-count', token);
      setUnreadTotal(data.count ?? 0);
    } catch {
      // Silent — badge update is non-critical
    }
  }, [token]);

  // ── Fetch thread ───────────────────────────────────────────
  //
  // `silent = true` skips the loading-state update so background
  // polls never cause a spinner/flicker when messages already exist.

  const fetchThread = useCallback(async (contactId: string, silent = false) => {
    if (!token) return;
    // Only show loading state on the very first load (no messages yet)
    if (!silent) setLoadingThread(true);
    try {
      const data = await api.get<ThreadResponse>(`/messages/thread/${contactId}`, token);
      const incoming = data.messages ?? [];

      setMessages((prev) => {
        // On silent refresh: only update if something actually changed
        // (avoids unnecessary re-renders and scroll jumps)
        if (silent && prev.length === incoming.length &&
          prev[prev.length - 1]?.id === incoming[incoming.length - 1]?.id) {
          // Check if any read-status changed (e.g. our sent message got read)
          const changed = prev.some((m, i) => m.is_read !== incoming[i]?.is_read);
          if (!changed) return prev;
        }
        return incoming;
      });

      // Update contact's unread count to 0 after reading
      setContacts((prev) =>
        prev.map((c) => (c.id === contactId ? { ...c, unread_count: 0 } : c))
      );
      // Reset global unread total only on explicit open (not silent polls)
      if (!silent) {
        setUnreadTotal((prev) => Math.max(0, prev - (activeRef.current?.unread_count ?? 0)));
      }
    } catch {
      if (!silent) setMessages([]);
    } finally {
      if (!silent) setLoadingThread(false);
    }
  }, [token]);

  // ── Send message ───────────────────────────────────────────

  const handleSend = useCallback(async (body: string) => {
    if (!token || !activeContact || sending) return;
    setSending(true);
    try {
      const data = await api.post<SendResponse>('/messages', {
        recipient_id: activeContact.id,
        body,
      }, token);
      setMessages((prev) => [...prev, data.message]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message.';
      setError(msg);
    } finally {
      setSending(false);
    }
  }, [token, activeContact, sending]);

  // ── Select a contact → open thread ────────────────────────

  const handleSelectContact = useCallback(async (contact: Contact) => {
    setActiveContact(contact);
    setView('thread');
    setMessages([]);
    await fetchThread(contact.id);
  }, [fetchThread]);

  // ── Back to contacts ───────────────────────────────────────

  const handleBack = useCallback(() => {
    setView('contacts');
    setActiveContact(null);
    setMessages([]);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  // ── Toggle open/close ──────────────────────────────────────

  const handleToggle = useCallback(async () => {
    const opening = !isOpen;
    setIsOpen(opening);
    setError(null);

    if (opening) {
      await fetchContacts();
    } else {
      // Clear polling when closing
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [isOpen, fetchContacts]);

  // ── Polling when thread is open ────────────────────────────

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    if (isOpen && view === 'thread' && activeContact) {
      pollRef.current = setInterval(() => {
        if (isOpenRef.current && activeRef.current) {
          // Silent = true: no spinner, no flicker — just merge new data in background
          void fetchThread(activeRef.current.id, true);
        }
      }, 5000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, view, activeContact, fetchThread]);

  // ── Unread count polling (always active when logged in) ────

  useEffect(() => {
    if (!token) return;
    void fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token, fetchUnreadCount]);

  // ── Don't render for unauthenticated or admin users ────────

  if (!token) return null;

  // ── Render ──────────────────────────────────────────────────

  return (
    <>
      {/* Chat panel */}
      <div
        role="dialog"
        aria-label="Messenger"
        aria-hidden={!isOpen}
        style={{
          position: 'fixed',
          bottom: 88,
          right: 24,
          width: 380,
          maxWidth: 'calc(100vw - 32px)',
          height: 520,
          maxHeight: 'calc(100vh - 120px)',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(15,23,42,0.18), 0 6px 20px rgba(15,23,42,0.10)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 9999,
          // Animate open/close
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(16px)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.22s cubic-bezier(0.34,1.56,0.64,1), transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          transformOrigin: 'bottom right',
        }}
      >
        {/* Panel Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #0d9488 100%)',
          padding: '14px 16px 12px',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative blobs */}
          <div style={{
            position: 'absolute', top: -20, right: -20, width: 80, height: 80,
            borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
          }} />
          <div style={{
            position: 'absolute', bottom: -15, left: 20, width: 50, height: 50,
            borderRadius: '50%', background: 'rgba(255,255,255,0.06)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                </svg>
              </div>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                  Clinic Messenger
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                  Secure in-app messaging
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: 10,
                padding: '6px 8px',
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              aria-label="Close messenger"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            padding: '8px 16px',
            fontSize: 12,
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}>
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
            <button
              onClick={() => setError(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
            >✕</button>
          </div>
        )}

        {/* Contacts view header */}
        {view === 'contacts' && (
          <div style={{
            padding: '10px 16px 8px',
            borderBottom: '1px solid #f1f5f9',
            flexShrink: 0,
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Messages
            </p>
          </div>
        )}

        {/* Panel body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {view === 'contacts' ? (
            <ContactListView
              contacts={contacts}
              loading={loadingContacts}
              onSelect={handleSelectContact}
            />
          ) : activeContact ? (
            <ThreadView
              contact={activeContact}
              messages={messages}
              loading={loadingThread && messages.length === 0}
              sending={sending}
              onSend={handleSend}
              onBack={handleBack}
            />
          ) : null}
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        id="messenger-widget-trigger"
        onClick={handleToggle}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          background: isOpen
            ? '#fff'
            : 'linear-gradient(135deg, #1e40af 0%, #2563eb 45%, #0d9488 100%)',
          color: isOpen ? '#2563eb' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10000,
          boxShadow: isOpen
            ? '0 4px 16px rgba(37,99,235,0.2), 0 0 0 2px #2563eb33'
            : '0 6px 24px rgba(37,99,235,0.4), 0 2px 8px rgba(0,0,0,0.12)',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, background 0.2s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.94)';
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
        }}
        aria-label={isOpen ? 'Close messenger' : 'Open messenger'}
        title="Clinic Messenger"
      >
        {/* Toggle icon: chat ↔ chevron-down */}
        <div style={{
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s',
          transform: isOpen ? 'rotate(180deg) scale(0.8)' : 'rotate(0deg) scale(1)',
          opacity: isOpen ? 0.7 : 1,
        }}>
          {isOpen ? (
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
            </svg>
          )}
        </div>

        {/* Unread count badge */}
        {!isOpen && unreadTotal > 0 && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            background: '#ef4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 99,
            minWidth: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid #fff',
            boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
          }}>
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>
    </>
  );
}
