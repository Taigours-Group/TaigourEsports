import React, { useState, useEffect } from 'react';
import { REQUEST_TYPES, REQUEST_STATUS, MEMBERSHIP_BENEFITS, ADMIN_WHATSAPP } from '../constants/balanceConstants';

const BRAND = {
  name: 'Taigours E-Sports',
  logoUrl: 'https://res.cloudinary.com/dbjjzyrr3/image/upload/v1768567786/tiger-logo_jcf2zj.png'
};

const AdminRequestsPanel = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expandedRequest, setExpandedRequest] = useState(null); 
  const [processingId, setProcessingId] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [billRequest, setBillRequest] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [filter]);

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
      const approvedReq = requests.find(r => r.id === requestId);
      if (approvedReq) setBillRequest({ ...approvedReq, status: REQUEST_STATUS.APPROVED, admin_notes: adminNotes || approvedReq.admin_notes || null });
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

  const openBillPrint = (request) => {
    if (!request) return;
    const createdAt = request.created_at ? new Date(request.created_at) : new Date();
    const billNo = `REQ-${request.id}`;

    const lines = [];
    if (request.type === REQUEST_TYPES.RECHARGE) {
      lines.push({ label: 'Package amount', value: `◈ ${request.package_amount || 0}` });
      lines.push({ label: 'Bonus', value: `◈ ${request.bonus_amount || 0}` });
      lines.push({ label: 'Total credited', value: `◈ ${request.amount || 0}` });
      if (request.cost) lines.push({ label: 'Paid (NPR)', value: `रु ${request.cost}` });
    } else {
      const tierName = MEMBERSHIP_BENEFITS[request.tier]?.name || request.tier || 'Membership';
      lines.push({ label: 'Plan', value: tierName });
      lines.push({ label: 'Duration', value: `${request.duration_days || 30} days` });
      lines.push({ label: 'Amount', value: `◈ ${request.amount || 0}` });
    }

    const rowsHtml = lines.map(l => `
      <tr>
        <td>${l.label}</td>
        <td style="text-align:right;font-weight:700">${l.value}</td>
      </tr>
    `).join('');

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${BRAND.name} • Bill ${billNo}</title>
    <!-- Loads html2pdf rendering engine -->
    <script src="https://cloudflare.com"></script>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0b0b0b; background-color: #f9f9f9; }
      .card { border: 1px solid #e6e6e6; border-radius: 12px; padding: 24px; max-width: 720px; margin: 0 auto; background: #ffffff; }
      .top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .brand { display: flex; align-items: center; gap: 12px; }
      .brand img { width: 44px; height: 44px; object-fit: contain; }
      h1 { margin: 0; font-size: 18px; }
      .muted { color: #666; font-size: 12px; }
      hr { border: 0; border-top: 1px solid #eee; margin: 14px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 8px 0; font-size: 13px; border-bottom: 1px dashed #eee; }
      .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .meta div { font-size: 12px; color: #333; }
      .meta b { color: #000; }
      .footer { margin-top: 14px; font-size: 11px; color: #666; }
    </style>
  </head>
  <body>
    <div id="bill-pdf-root" class="card">
      <div class="top">
        <div class="brand">
          <!-- crossorigin added to prevent canvas security block issues with your logo -->
          <img src="${BRAND.logoUrl}" alt="${BRAND.name}" crossorigin="anonymous" />
          <div>
            <h1>${BRAND.name} • Payment Bill</h1>
            <div class="muted">Bill No: <b>${billNo}</b></div>
          </div>
        </div>
        <div class="muted" style="text-align:right">
          Date<br/>
          <b>${createdAt.toLocaleString()}</b>
        </div>
      </div>

      <hr/>

      <div class="meta">
        <div>Customer: <b>${request.user_name || 'Player'}</b></div>
        <div>Email: <b>${request.user_email || '-'}</b></div>
        <div>User ID: <b>${request.players_id || '-'}</b></div>
        <div>Type: <b>${(request.type || '').toString().toUpperCase()}</b></div>
        <div>WhatsApp: <b>${request.whatsapp_number || '-'}</b></div>
        <div>Pay method: <b>${(request.payment_method || '-').toString().toUpperCase()}</b></div>
        <div>Acc no: <b>${request.payment_account_number || '-'}</b></div>
        <div>Acc owner: <b>${request.payment_account_owner || '-'}</b></div>
      </div>

      <hr/>

      <table>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      ${request.description ? `<div class="footer"><b>Note:</b> ${request.description}</div>` : ''}
      ${request.admin_notes ? `<div class="footer"><b>Admin notes:</b> ${request.admin_notes}</div>` : ''}
      <div class="footer">Generated by ${BRAND.name} Admin Panel.</div>
    </div>

    <script>
      window.onload = () => {
        // Targets your specific bill layout wrapper
        const element = document.getElementById('bill-pdf-root');
        
        const options = {
          margin:       10,
          filename:     'Bill-${billNo}.pdf',
          image:        { type: 'jpeg', quality: 1.0 },
          html2canvas:  { 
            scale: 2.5,          // Upscales layout container density for vector crispness
            useCORS: true,        // Allows external secure URLs to load properly
            letterRendering: true // Forces separate character tracking for crisp text selection
          },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Generates the selectable digital PDF and prompts download directly
        html2pdf().from(element).set(options).save().then(() => {
          // Closes the blank helper tab immediately after downloading completes
          setTimeout(() => { window.close(); }, 500);
        });
      };
    </script>
  </body>
</html>
    `.trim();

    const w = window.open('', '_blank');
    if (!w) return alert('Popup blocked. Please allow popups to print the bill.');
    w.document.open();
    w.document.write(html);
    w.document.close();
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
                      <div className="font-mono text-white">{request.players_id}</div>
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

                  {/* Payment Details */}
                  <div className="bg-white/5 border border-white/10 rounded p-3 space-y-2">
                    <div className="text-gray-500 uppercase tracking-widest text-xs mb-1">Payment Details</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">WhatsApp</div>
                        <div className="font-mono text-white break-all">{request.whatsapp_number || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">Method</div>
                        <div className="font-bold text-white">{(request.payment_method || '-').toString().toUpperCase()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">Account No.</div>
                        <div className="font-mono text-white break-all">{request.payment_account_number || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">Owner</div>
                        <div className="font-bold text-white break-words">{request.payment_account_owner || '-'}</div>
                      </div>
                    </div>
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

                  {/* Print bill shortcut */}
                  <button
                    onClick={() => openBillPrint(request)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 text-white rounded font-bold hover:bg-white/10 transition-all"
                  >
                    <i className="fa-solid fa-print mr-2"></i>Print Bill
                  </button>

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

      {/* Auto bill prompt after approve */}
      {billRequest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[2000] p-4">
          <div className="bg-bg-card border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-orbitron font-black">Print Bill</div>
              <button onClick={() => setBillRequest(null)} className="text-gray-400 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="text-sm text-gray-300">
              Approved request <span className="font-mono text-primary">#{billRequest.id}</span> for <b>{billRequest.user_name || 'Player'}</b>.
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { openBillPrint(billRequest); setBillRequest(null); }}
                className="flex-1 px-4 py-2 bg-primary text-dark rounded font-bold hover:bg-primary/80"
              >
                <i className="fa-solid fa-print mr-2"></i>Print Now
              </button>
              <button
                onClick={() => setBillRequest(null)}
                className="flex-1 px-4 py-2 bg-white/5 text-white rounded font-bold hover:bg-white/10"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRequestsPanel;
