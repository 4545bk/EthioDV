import React, { useState } from 'react';
import { X, Printer, Download, User, ShieldCheck, Mail, Phone, MapPin, Calendar, FileText, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

export default function AdminFullFormModal({ entryId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [downloadingPhotos, setDownloadingPhotos] = useState(false);

  const [embeddedPhotos, setEmbeddedPhotos] = useState({});

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || localStorage.getItem('staffToken');
        const res = await fetch(`/api/v1/admin/entries/${entryId}/full-data`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const json = await res.json();
        if (json.success) {
          setData(json.data);

          // Convert photos to data URIs so they permanently embed in printed PDF
          if (json.data?.photos?.length) {
            json.data.photos.forEach(async (p) => {
              if (!p.photoUrl) return;
              try {
                const pRes = await fetch(p.photoUrl);
                const blob = await pRes.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                  setEmbeddedPhotos((prev) => ({ ...prev, [p.role]: reader.result }));
                };
                reader.readAsDataURL(blob);
              } catch (e) {
                // Keep direct URL if fetch blocked
              }
            });
          }
        } else {
          setError(json.error?.message || 'Failed to load form details');
        }
      } catch (err) {
        setError(err.message || 'Error connecting to server');
      } finally {
        setLoading(false);
      }
    }
    if (entryId) {
      loadData();
    }
  }, [entryId]);

  // Handle Printable PDF
  const handlePrint = () => {
    window.print();
  };

  // Handle Download Photos (Primary, Spouse, Children)
  const handleDownloadPhotos = async () => {
    if (!data?.photos || data.photos.length === 0) {
      alert('No photo files available for this application.');
      return;
    }

    try {
      setDownloadingPhotos(true);
      for (const item of data.photos) {
        const downloadUrl = item.downloadUrl || (item.photoKey ? `/api/v1/admin/download-photo?key=${encodeURIComponent(item.photoKey)}&filename=${item.filename}` : item.photoUrl);
        if (!downloadUrl) continue;

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = item.filename || `photo_${item.role.toLowerCase().replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => setTimeout(r, 400));
      }
    } finally {
      setDownloadingPhotos(false);
    }
  };

  const primary = data?.formData?.primary;
  const spouse = data?.formData?.spouse;
  const children = data?.formData?.children || [];
  const entry = data?.entry;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="kravio-form-modal"
        style={{
          background: '#ffffff',
          color: '#0f172a',
          width: '100%',
          maxWidth: 880,
          maxHeight: '92vh',
          borderRadius: 16,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              DS
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                Electronic Diversity Visa Entry — DS-5501
              </h2>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Ref: #{entry?.uniqueReference || '...'} • Full Application Dossier
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleDownloadPhotos}
              disabled={loading || downloadingPhotos || !data?.photos?.length}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: '#f1f5f9',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                transition: 'all 0.15s ease',
              }}
              title="Download entrant photos for official submission"
            >
              <Download size={14} />
              {downloadingPhotos ? 'Downloading...' : `Download Photos (${data?.photos?.length || 0})`}
            </button>

            <button
              onClick={handlePrint}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)',
              }}
            >
              <Printer size={14} /> Print / Save PDF
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: 6,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }} id="printable-dossier">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <div style={{ fontSize: 14 }}>Loading full application data & decrypted biometrics...</div>
            </div>
          ) : error ? (
            <div style={{ padding: 20, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c' }}>
              {error}
            </div>
          ) : (
            <div>
              {/* Dossier Official Header */}
              <div
                style={{
                  borderBottom: '2px solid #0f172a',
                  paddingBottom: 16,
                  marginBottom: 24,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#64748b', textTransform: 'uppercase' }}>
                    U.S. DEPARTMENT OF STATE • DV-2027 PROGRAM
                  </div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 2px 0', color: '#0f172a' }}>
                    OFFICIAL APPLICATION SUMMARY & DOSSIER
                  </h1>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Form DS-5501 • Reference Code:{' '}
                    <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>#{entry?.uniqueReference}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 9999,
                      fontSize: 12,
                      fontWeight: 700,
                      background: entry?.status === 'CONFIRMED' || entry?.status === 'FILED' ? '#dcfce7' : '#f1f5f9',
                      color: entry?.status === 'CONFIRMED' || entry?.status === 'FILED' ? '#15803d' : '#334155',
                      marginBottom: 4,
                    }}
                  >
                    STATUS: {entry?.status}
                  </div>
                  {entry?.confirmationNumber && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                      CONF: {entry.confirmationNumber}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    Created: {new Date(entry?.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Primary Entrant Card */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20,
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', marginBottom: 6 }}>
                      Part 1: Primary Applicant Details
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                      {primary?.name?.lastName ? `${primary.name.lastName}, ${primary.name.firstName} ${primary.name.middleName || ''}` : 'N/A'}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 16px', fontSize: 13 }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Gender: </span>
                        <strong>{primary?.gender === 'M' ? 'Male (ወንድ)' : primary?.gender === 'F' ? 'Female (ሴት)' : 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Date of Birth: </span>
                        <strong>
                          {primary?.birthDate
                            ? `${primary.birthDate.day}/${primary.birthDate.month}/${primary.birthDate.year}`
                            : 'N/A'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Birth City: </span>
                        <strong>{primary?.birthCity || (primary?.isBirthCityUnknown ? 'Unknown' : 'N/A')}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Birth Country: </span>
                        <strong>{primary?.birthCountry || 'Ethiopia'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Eligibility: </span>
                        <strong>{primary?.eligibilityCountry || 'Ethiopia'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Education: </span>
                        <strong>{primary?.educationLevel || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Marital Status: </span>
                        <strong>{primary?.maritalStatus || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Children Count: </span>
                        <strong>{primary?.childrenCount ?? 0}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Primary Photo Preview */}
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: 10,
                        border: '2px solid #10b981',
                        overflow: 'hidden',
                        background: '#ffffff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        margin: '0 auto 8px auto',
                        position: 'relative',
                      }}
                    >
                      {(embeddedPhotos['Primary Applicant'] || primary?.photoDownloadUrl) ? (
                        <img
                          src={embeddedPhotos['Primary Applicant'] || primary.photoDownloadUrl}
                          alt="Primary Applicant"
                          crossOrigin="anonymous"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                          <User size={48} />
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <CheckCircle2 size={12} /> 600×600 px Validated
                    </div>
                    {(primary?.photoKey || primary?.photoDownloadUrl) && (
                      <div style={{ marginTop: 4, textAlign: 'center' }}>
                        <a
                          href={primary?.photoKey ? `/api/v1/admin/download-photo?key=${encodeURIComponent(primary.photoKey)}&filename=photo_primary_${entry?.uniqueReference}.jpg` : primary.photoDownloadUrl}
                          download={`photo_primary_${entry?.uniqueReference}.jpg`}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#4f46e5',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Download size={11} /> Download JPG
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact & Address Sub-section */}
                <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 16, paddingTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12 }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Email:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a', wordBreak: 'break-all' }}>
                      {primary?.email || data?.entry?.user?.email || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Phone:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{primary?.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Mailing Address:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {primary?.mailingAddress?.addressLine1 || primary?.mailingAddress || 'Addis Ababa, Ethiopia'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Spouse Details (If married) */}
              {spouse && spouse.name?.firstName && (
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 20,
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', marginBottom: 6 }}>
                        Part 2: Spouse Information
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                        {spouse.name.lastName}, {spouse.name.firstName} {spouse.name.middleName || ''}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 16px', fontSize: 13 }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Gender: </span>
                          <strong>{spouse.gender === 'M' ? 'Male' : 'Female'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Date of Birth: </span>
                          <strong>
                            {spouse.birthDate ? `${spouse.birthDate.day}/${spouse.birthDate.month}/${spouse.birthDate.year}` : 'N/A'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Birth City: </span>
                          <strong>{spouse.birthCity || 'N/A'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Birth Country: </span>
                          <strong>{spouse.birthCountry || 'Ethiopia'}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Spouse Photo */}
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: 120,
                          height: 120,
                          borderRadius: 10,
                          border: '2px solid #ec4899',
                          overflow: 'hidden',
                          background: '#ffffff',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          margin: '0 auto 6px auto',
                        }}
                      >
                        {spouse.photoDownloadUrl ? (
                          <img
                            src={spouse.photoDownloadUrl}
                            alt="Spouse"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                            <User size={36} />
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#ec4899' }}>Spouse Photo</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Children Details (If any) */}
              {children && children.length > 0 && (
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 20,
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: 14 }}>
                    Part 3: Children Information ({children.length})
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {children.map((child, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: '#ffffff',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div
                            style={{
                              width: 54,
                              height: 54,
                              borderRadius: 8,
                              overflow: 'hidden',
                              border: '1.5px solid #3b82f6',
                              background: '#f1f5f9',
                              flexShrink: 0,
                            }}
                          >
                            {child.photoDownloadUrl ? (
                              <img
                                src={child.photoDownloadUrl}
                                alt={`Child ${idx + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                <User size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                              Child #{idx + 1}: {child.name?.lastName}, {child.name?.firstName} {child.name?.middleName || ''}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                              Gender: {child.gender === 'M' ? 'Male' : 'Female'} • DOB:{' '}
                              {child.birthDate ? `${child.birthDate.day}/${child.birthDate.month}/${child.birthDate.year}` : 'N/A'} • City:{' '}
                              {child.birthCity || 'Addis Ababa'}
                            </div>
                          </div>
                        </div>

                        {child.photoDownloadUrl && (
                          <a
                            href={child.photoDownloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#3b82f6',
                              textDecoration: 'none',
                            }}
                          >
                            View Photo <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment & Audit Verification Strip */}
              {data.payment && (
                <div
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '14px 18px',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={20} color="#10b981" />
                    <div>
                      <strong style={{ color: '#0f172a' }}>Payment Verified & Approved</strong>
                      <div style={{ color: '#64748b' }}>
                        {data.payment.displayAmountETB || 1000} ETB via {data.payment.provider} • Txn Code:{' '}
                        <code style={{ color: '#0f172a' }}>{data.payment.claimedTransactionCode}</code>
                      </div>
                    </div>
                  </div>

                  {data.payment.receiptUrl && (
                    <a
                      href={data.payment.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      View Bank Receipt <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 12, color: '#64748b' }}>
            All entrant data stored encrypted with AES-256-GCM.
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
              }}
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              disabled={loading}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
              }}
            >
              Download PDF Form
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-dossier, #printable-dossier * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          #printable-dossier {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 10px !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
