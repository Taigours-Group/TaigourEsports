const VISITOR_KEY = 'stream_visitor_id';
const CHAT_POLL_MS = 4000;
const VIEWER_HEARTBEAT_MS = 30000;

export function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function getAdminKey() {
  return import.meta.env.VITE_ADMIN_PASSWORD || '';
}

class StreamService {
  async getEngagement(streamId, visitorId) {
    const params = new URLSearchParams({ visitorId });
    const res = await fetch(`/api/streams/${encodeURIComponent(streamId)}/engagement?${params}`);
    if (!res.ok) throw new Error('Failed to fetch engagement');
    return res.json();
  }

  async likeStream(streamId, visitorId, userId = null) {
    const res = await fetch(`/api/streams/${encodeURIComponent(streamId)}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, userId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to like stream');
    }
    return res.json();
  }

  async recordShare(streamId, visitorId, method = 'link') {
    const res = await fetch(`/api/streams/${encodeURIComponent(streamId)}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, method })
    });
    if (!res.ok) throw new Error('Failed to record share');
    return res.json();
  }

  async sendHeartbeat(streamId, visitorId) {
    const res = await fetch(`/api/streams/${encodeURIComponent(streamId)}/viewers/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId })
    });
    if (!res.ok) return null;
    return res.json();
  }

  async getChatMessages(streamId, { since = null, limit = 50 } = {}) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (since) params.set('since', since);
    const res = await fetch(`/api/streams/${encodeURIComponent(streamId)}/chat?${params}`);
    if (!res.ok) throw new Error('Failed to fetch chat');
    return res.json();
  }

  async sendChatMessage(streamId, { visitorId, username, text, userId = null }) {
    const res = await fetch(`/api/streams/${encodeURIComponent(streamId)}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, username, text, userId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send message');
    }
    return res.json();
  }

  async addReaction(streamId, messageId, { visitorId, emoji }) {
    const res = await fetch(
      `/api/streams/${encodeURIComponent(streamId)}/chat/${encodeURIComponent(messageId)}/reactions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, emoji })
      }
    );
    if (!res.ok) throw new Error('Failed to add reaction');
    return res.json();
  }

  async deleteChatMessage(streamId, messageId) {
    const res = await fetch(
      `/api/streams/${encodeURIComponent(streamId)}/chat/${encodeURIComponent(messageId)}`,
      {
        method: 'DELETE',
        headers: { 'X-Admin-Key': getAdminKey() }
      }
    );
    if (!res.ok) throw new Error('Failed to delete message');
    return res.json();
  }

  async clearChat(streamId) {
    const res = await fetch(`/api/streams/${encodeURIComponent(streamId)}/chat`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': getAdminKey() }
    });
    if (!res.ok) throw new Error('Failed to clear chat');
    return res.json();
  }

  async shareStream(activeStream) {
    const url = `${window.location.origin}/streams?stream=${encodeURIComponent(activeStream.id)}`;
    const title = activeStream.title || 'Taigours E-Sports Live Stream';
    const text = `Watch ${title} on Taigours E-Sports`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return 'native';
      } catch (e) {
        if (e?.name === 'AbortError') return null;
      }
    }

    await navigator.clipboard.writeText(url);
    return 'clipboard';
  }
}

export const streamService = new StreamService();
export { CHAT_POLL_MS, VIEWER_HEARTBEAT_MS };
