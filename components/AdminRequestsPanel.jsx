import React, { useState, useEffect } from 'react';
import { REQUEST_TYPES, REQUEST_STATUS, MEMBERSHIP_BENEFITS, ADMIN_WHATSAPP } from '../constants/balanceConstants';

const AdminRequestsPanel = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/purchase-requests?status=' + filter);
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/purchase-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes })
      });

      if (!response.ok) throw new Error('Failed to approve request');

      alert('✓ Request approved and balance/membership updated!');
      setAdminNotes('');
      setExpandedRequest(null);
      await fetchRequests();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/purchase-requests/${requestId}/decline`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes })
      });

      if (!response.ok) throw new Error('Failed to decline request');

      alert('✓ Request declined and player notified.');
      setAdminNotes('');
      setExpandedRequest(null);
      await fetchRequests();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to decline request');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case REQUEST_STATUS.PENDING:
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case REQUEST_STATUS.APPROVED:
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case REQUEST_STATUS.DECLINED:
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      case REQUEST_STATUS.COMPLETED:
        return 'text-primary bg-primary/10 border-primary/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getTypeLabel = (type) => {
    return type === REQUEST_TYPES.RECHARGE ? '💰 Recharge' : '👑 Membership';
  };

  // Calculate stats
  const pendingCount = requests.filter(r => r.status === REQUEST_STATUS.PENDING).length;
  const totalamount = requests.reduce((sum, r) => sum + (r.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <i className="fa-solid fa-spinner fa-spin text-primary text-2xl mr-3"></i>
        <span className="text-gray-400">Loading requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="border-b border-white/10 pb-4">
        <h3 className="font-orbitron font-bold text-xl text-white uppercase tracking-tight mb-3">
          💳 Purchase Requests
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">Pending</div>
            <div className="text-2xl font-orbitron font-black text-yellow-400">{pendingCount}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">Total Requests</div>
            <div className="text-2xl font-orbitron font-black text-primary">{requests.length}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">Total amount</div>
            <div className="text-2xl font-orbitron font-black text-pink">◈ {totalamount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {['pending', 'approved', 'declined', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilter(status);
              setExpandedRequest(null);
            }}
            className={`px-4 py-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
              filter === status
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-lg">
            <i className="fa-solid fa-inbox text-4xl text-gray-500 mb-3 block"></i>
            <p className="text-gray-400">No {filter} requests</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
              >
                {/* Left: Type & User */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg">
                    {request.type === REQUEST_TYPES.RECHARGE ? '💰' : '👑'}
                  </div>
                  <div>
                    <div className="font-bold text-white">{request.user_name}</div>
                    <div className="text-xs text-gray-500">{request.user_email}</div>
                  </div>
                </div>

                {/* Center: amount & Type */}
                <div className="text-right mr-4">
                  <div className="font-orbitron font-black text-lg text-primary">◈ {request.amount}</div>
                  <div className="text-xs text-gray-400">{getTypeLabel(request.type)}</div>
                </div>

                {/* Right: Status & Date */}
                <div className="text-right w-40">
                  <div className={`inline-block px-3 py-1 rounded border text-xs font-bold mb-1 ${getStatusColor(request.status)}`}>
                    {request.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500 block mt-1">
                    {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="text-gray-400 ml-4">
                  <i className={`fa-solid fa-chevron-down transition-transform ${expandedRequest === request.id ? 'rotate-180' : ''}`}></i>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedRequest === request.id && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 uppercase tracking-widest text-xs mb-1">Player ID</div>
                      <div className="font-mono text-white">{request.user_id}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 uppercase tracking-widest text-xs mb-1">Request ID</div>
                      <div className="font-mono text-white">#{request.id}</div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="bg-white/5 border border-white/10 rounded p-3 space-y-2">
                    {request.type === REQUEST_TYPES.RECHARGE ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Package amount:</span>
                          <span className="font-bold">◈ {request.package_amount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Bonus amount:</span>
                          <span className="font-bold text-primary">+◈ {request.bonus_amount}</span>
                        </div>
                        <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold">
                          <span>Total to Add:</span>
                          <span className="text-yellow-400">◈ {request.amount}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Membership Tier:</span>
                          <span className="font-bold">{MEMBERSHIP_BENEFITS[request.tier]?.name || request.tier}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Price:</span>
                          <span className="font-bold text-primary">◈ {request.amount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Duration:</span>
                          <span className="font-bold">{request.duration_days} days</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <div className="text-gray-500 uppercase tracking-widest text-xs mb-1">Request Details</div>
                    <div className="text-sm text-white bg-white/5 border border-white/10 rounded p-2">
                      {request.description}
                    </div>
                  </div>

                  {/* Admin Notes Section */}
                  {request.status === REQUEST_STATUS.PENDING && (
                    <>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add admin notes (optional)..."
                        className="w-full bg-white/5 border border-white/10 rounded p-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-primary"
                        rows="3"
                      />

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(request.id)}
                          disabled={processingId === request.id}
                          className="flex-1 px-4 py-2 bg-green-500 text-white rounded font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {processingId === request.id ? (
                            <>
                              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                              Processing...
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-check mr-2"></i>
                              Approve & Update
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request.id)}
                          disabled={processingId === request.id}
                          className="flex-1 px-4 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {processingId === request.id ? (
                            <>
                              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                              Processing...
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-times mr-2"></i>
                              Decline
                            </>
                          )}
                        </button>
                      </div>

                      {/* WhatsApp Reminder */}
                      <div className="bg-green-400/10 border border-green-400/30 rounded p-2 text-xs text-green-300">
                        <i className="fa-brands fa-whatsapp mr-1"></i>
                        Remember to send WhatsApp confirmation to player after approval
                      </div>
                    </>
                  )}

                  {/* Display existing admin notes if not pending */}
                  {request.status !== REQUEST_STATUS.PENDING && request.admin_notes && (
                    <div>
                      <div className="text-gray-500 uppercase tracking-widest text-xs mb-1">Admin Notes</div>
                      <div className="text-sm text-white bg-white/5 border border-white/10 rounded p-2">
                        {request.admin_notes}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Admin Info Box */}
      <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-4">
        <div className="flex gap-2 items-start">
          <i className="fa-solid fa-info-circle text-blue-400 text-lg mt-1"></i>
          <div className="text-sm text-gray-300">
            <p className="font-bold mb-2">Admin Workflow:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Player submits recharge/membership request</li>
              <li>Request appears in Pending tab</li>
              <li>Review request details and contact player via WhatsApp if needed</li>
              <li>Click <strong>Approve & Update</strong> to add balance or activate membership</li>
              <li>System automatically sends balance/membership to player database</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminRequestsPanel;
