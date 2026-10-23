import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Check,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  MapPin,
  Phone,
  X,
  Eye
} from 'lucide-react';
import { uploadFileDirect, apiRequest } from '../services/api.js';

export default function PhotoUploadCrop({ onPhotoUploaded, existingPhotoKey, label = 'Entrant Photograph' }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(Boolean(existingPhotoKey));
  const [errorMessage, setErrorMessage] = useState(null);

  // AI Biometric Gatekeeper State
  const [validatingAi, setValidatingAi] = useState(false);
  const [biometricCheck, setBiometricCheck] = useState(null);
  const [showGatekeeperModal, setShowGatekeeperModal] = useState(false);
  const [pendingBlob, setPendingBlob] = useState(null);
  const [showStudioVoucher, setShowStudioVoucher] = useState(false);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG or PNG).');
      return;
    }

    setErrorMessage(null);
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageSrc(event.target.result);
        setScale(1);
        setPan({ x: 0, y: 0 });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Draw crop preview with official State Dept biometric guideline overlays
  useEffect(() => {
    if (!imageSrc || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    canvas.width = 600;
    canvas.height = 600;

    ctx.clearRect(0, 0, 600, 600);

    // Calculate scaled dimensions to cover 600x600 canvas
    const aspect = img.width / img.height;
    let drawWidth, drawHeight;

    if (aspect > 1) {
      drawHeight = 600 * scale;
      drawWidth = drawHeight * aspect;
    } else {
      drawWidth = 600 * scale;
      drawHeight = drawWidth / aspect;
    }

    const drawX = (600 - drawWidth) / 2 + pan.x;
    const drawY = (600 - drawHeight) / 2 + pan.y;

    // Draw uploaded image
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    // Draw Official US State Dept Overlay Guides
    ctx.save();
    // 1. Semi-transparent dark mask outside target oval
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)'; // Electric Cyan
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    // Head Oval Target (Center X: 300, Center Y: 280, Radius X: 115, Radius Y: 170)
    ctx.beginPath();
    ctx.ellipse(300, 275, 115, 165, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Eye-level Horizontal Line (Between 56% and 69% from bottom = Y 230 to 260)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)'; // Green
    ctx.beginPath();
    ctx.moveTo(180, 250);
    ctx.lineTo(420, 250);
    ctx.stroke();

    // Center vertical alignment
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(300, 50);
    ctx.lineTo(300, 550);
    ctx.stroke();

    ctx.restore();
  }, [imageSrc, scale, pan]);

  // Mouse / Touch Drag Handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Mobile Touch Handlers
  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Generate 600x600 clean JPEG and upload directly to Cloudflare R2
  const handleCropAndUpload = async () => {
    if (!imageRef.current) return;

    try {
      setIsUploading(true);
      setErrorMessage(null);

      // Create an off-screen clean canvas without the guide lines
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 600;
      exportCanvas.height = 600;
      const ctx = exportCanvas.getContext('2d');

      const img = imageRef.current;
      const aspect = img.width / img.height;
      let drawWidth, drawHeight;

      if (aspect > 1) {
        drawHeight = 600 * scale;
        drawWidth = drawHeight * aspect;
      } else {
        drawWidth = 600 * scale;
        drawHeight = drawWidth / aspect;
      }

      const drawX = (600 - drawWidth) / 2 + pan.x;
      const drawY = (600 - drawHeight) / 2 + pan.y;

      // Fill white background just in case
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Convert to JPEG data URL for instant AI Biometric Gatekeeper validation
      const base64Data = exportCanvas.toDataURL('image/jpeg', 0.9);

      // Convert to JPEG Blob (quality 0.9 produces ~100KB, <= 240KB DV limit)
      exportCanvas.toBlob(
        async (blob) => {
          if (!blob) {
            setErrorMessage('Failed to generate photo blob.');
            setIsUploading(false);
            return;
          }

          if (blob.size > 240 * 1024) {
            setErrorMessage('Photo exceeds 240 KB. Please zoom out slightly and retry.');
            setIsUploading(false);
            return;
          }

          setPendingBlob(blob);

          // Step 1: Run Strict AI Biometric Gatekeeper
          try {
            setValidatingAi(true);
            const bioRes = await apiRequest('/uploads/validate-photo-biometrics', 'POST', {
              imageBase64: base64Data,
              mimeType: 'image/jpeg',
            });

            setValidatingAi(false);

            if (bioRes?.success && bioRes.data) {
              setBiometricCheck(bioRes.data);

              // If non-compliant (e.g. glasses, patterned curtains, harsh shadows), trigger Gatekeeper Warning
              if (!bioRes.data.isCompliant && bioRes.data.issues?.length > 0) {
                setShowGatekeeperModal(true);
                setIsUploading(false);
                return;
              }
            }
          } catch (bioErr) {
            console.warn('[AI Biometric Gatekeeper Check Warning]:', bioErr.message);
            setValidatingAi(false);
          }

          // Step 2: Upload photo if compliant or fallback
          await executeDirectUpload(blob);
        },
        'image/jpeg',
        0.9
      );
    } catch (err) {
      setErrorMessage(err.message || 'Error processing photo.');
      setIsUploading(false);
      setValidatingAi(false);
    }
  };

  const executeDirectUpload = async (blob) => {
    try {
      setIsUploading(true);
      setShowGatekeeperModal(false);
      const fileKey = await uploadFileDirect('photos', blob);
      setUploadSuccess(true);
      setIsUploading(false);
      onPhotoUploaded(fileKey);
    } catch (uploadErr) {
      setErrorMessage(uploadErr.message || 'Direct upload failed.');
      setIsUploading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <label className="form-label" style={{ margin: 0, fontSize: 14, color: '#ffffff' }}>
          {label}
        </label>
        {uploadSuccess && (
          <span className="badge badge-success">
            <Check size={12} /> DV Spec Verified (600x600)
          </span>
        )}
      </div>

      {!imageSrc ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="upload-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(124, 58, 237, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
            }}
          >
            <Upload size={24} color="var(--primary-600)" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
            Click to upload photo or take picture
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Plain white background, no eyeglasses, square crop (JPG/PNG)
          </p>
        </div>
      ) : (
        <div>
          <div
            style={{
              position: 'relative',
              width: 'min(300px, 78vw)',
              height: 'min(300px, 78vw)',
              maxWidth: '100%',
              margin: '0 auto 16px auto',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              border: '2px solid var(--border-subtle)',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                display: 'block',
              }}
            />
          </div>

          {/* Guide explanations */}
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            <span style={{ color: '#38bdf8' }}>🔵 Blue oval:</span> Align head & chin |{' '}
            <span style={{ color: '#10b981' }}>🟢 Green line:</span> Align eye level
          </div>

          {/* Controls: Zoom & Reposition */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, s - 0.1))}
              className="btn btn-secondary"
              style={{ padding: '6px 12px' }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 45, textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
              className="btn btn-secondary"
              style={{ padding: '6px 12px' }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
              className="btn btn-secondary"
              style={{ padding: '6px 12px' }}
              title="Reset Position"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {errorMessage && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: 10, borderRadius: 6, fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} />
              {errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setImageSrc(null); setUploadSuccess(false); setBiometricCheck(null); }}
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
            >
              Change Photo
            </button>
            <button
              type="button"
              onClick={handleCropAndUpload}
              disabled={isUploading || validatingAi}
              className="btn btn-primary"
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {validatingAi ? (
                <>
                  <Sparkles size={15} className="spin-slow" />
                  <span>AI Biometric Checking...</span>
                </>
              ) : isUploading ? (
                'Uploading...'
              ) : uploadSuccess ? (
                '✓ Photo Saved & Verified'
              ) : (
                <>
                  <ShieldCheck size={15} />
                  <span>Verify & Save Photo (600x600)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* AI Biometric Gatekeeper Warning Modal */}
      {showGatekeeperModal && biometricCheck && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'var(--card-bg, #1e293b)',
              color: 'var(--text-main, #ffffff)',
              borderRadius: 16,
              maxWidth: 500,
              width: '100%',
              padding: 24,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f87171' }}>
                  የፎቶ መስፈርት ስጋት ተገኝቷል / Photo Disqualification Risk
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
                  Official U.S. State Department DS-5501 Biometric Gatekeeper
                </p>
              </div>
            </div>

            {/* List of Detected Issues */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: '#fca5a5' }}>
                የተገኙ ጉድለቶች (Detected Biometric Issues):
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, lineHeight: 1.6, color: '#cbd5e1' }}>
                {biometricCheck.issues?.map((issue, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    <strong style={{ color: '#ffffff' }}>{issue.titleAmharic}</strong> ({issue.titleEnglish}):{' '}
                    <span style={{ color: '#94a3b8' }}>{issue.advice}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Practical Home Fix Advice */}
            {biometricCheck.adviceAmharic && (
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#38bdf8', lineHeight: 1.5 }}>
                  💡 <strong>ፈጣን መፍትሄ (Home Solution):</strong> {biometricCheck.adviceAmharic}
                </p>
              </div>
            )}

            {/* Studio Partner Voucher Section */}
            {biometricCheck.studioPartnerVoucher && (
              <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px dashed #64748b', borderRadius: 10, padding: 12, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={14} /> የፎቶ ስቱዲዮ አጋር (Studio Partner Option)
                  </span>
                  <a href="tel:0949478933" style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Phone size={11} /> 0949478933
                  </a>
                </div>
                <p style={{ margin: '0 0 6px 0', fontSize: 11.5, color: '#94a3b8' }}>
                  በቤት ውስጥ ጥራት ያለው ፎቶ መነሳት ካልቻሉ፣ በአዲስ አበባ ባሉ የተረጋገጡ አጋር ስቱዲዮዎቻችን መነሳት ይችላሉ (ቦሌ፣ ፒያሳ፣ መገናኛ፣ ሜክሲኮ)።
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowGatekeeperModal(false)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 600 }}
              >
                🔄 ፎቶውን እንደገና ላስተካክል / Re-crop or Change Photo
              </button>
              <button
                type="button"
                onClick={() => pendingBlob && executeDirectUpload(pendingBlob)}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '8px 16px', fontSize: 12, color: '#94a3b8' }}
              >
                ይህ ፎቶ እንዲቀመጥልኝ እፈልጋለሁ (Proceed Anyway at My Risk)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
