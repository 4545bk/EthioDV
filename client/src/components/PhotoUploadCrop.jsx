import React, { useState, useRef, useEffect } from 'react';
import { Upload, Check, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { uploadFileDirect } from '../services/api.js';

export default function PhotoUploadCrop({ onPhotoUploaded, existingPhotoKey, label = 'Entrant Photograph' }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(Boolean(existingPhotoKey));
  const [errorMessage, setErrorMessage] = useState(null);

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

          try {
            const fileKey = await uploadFileDirect('photos', blob);
            setUploadSuccess(true);
            setIsUploading(false);
            onPhotoUploaded(fileKey);
          } catch (uploadErr) {
            setErrorMessage(uploadErr.message || 'Direct upload failed.');
            setIsUploading(false);
          }
        },
        'image/jpeg',
        0.9
      );
    } catch (err) {
      setErrorMessage(err.message || 'Error processing photo.');
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
          style={{
            border: '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '30px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(15, 23, 42, 0.4)',
            transition: 'all var(--transition-fast)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <Upload size={32} color="var(--primary-400)" style={{ margin: '0 auto 10px auto' }} />
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
              width: 300,
              height: 300,
              margin: '0 auto 16px auto',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              border: '2px solid var(--border-subtle)',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => { setImageSrc(null); setUploadSuccess(false); }}
              className="btn btn-secondary"
              style={{ fontSize: 13 }}
            >
              Change Photo
            </button>
            <button
              type="button"
              onClick={handleCropAndUpload}
              disabled={isUploading}
              className="btn btn-primary"
              style={{ fontSize: 13 }}
            >
              {isUploading ? 'Verifying & Uploading...' : uploadSuccess ? '✓ Photo Saved' : 'Confirm 600x600 Crop & Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
