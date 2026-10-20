import React, { useState } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import PhotoUploadCrop from '../components/PhotoUploadCrop.jsx';
import { Camera, CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function PhotoGuidePage({ onNavigate }) {
  const { t } = useLanguage();
  const [testedPhotoKey, setTestedPhotoKey] = useState(null);

  return (
    <div className="container" style={{ maxWidth: 840 }}>
      <button
        onClick={() => onNavigate('home')}
        className="btn btn-secondary"
        style={{ marginBottom: 20, padding: '7px 14px', fontSize: 13, borderRadius: 9999 }}
      >
        <ArrowLeft size={14} /> {t('home')} / Back
      </button>

      {/* Main Header Card */}
      <div className="card" style={{ padding: '36px 30px', marginBottom: 24, borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--primary-600), #9333ea)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
            }}
          >
            <Camera size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, margin: 0 }}>የዲቪ ፎቶግራፍ መመሪያና መፈተሻ / DV Photo Tool</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0 0' }}>
              የአሜሪካ ስቴት ዲፓርትመንት ኦፊሴላዊ የDV-2027 ፎቶ መስፈርቶች
            </p>
          </div>
        </div>

        {/* Core Requirement Notice Card */}
        <div className="info-box" style={{ marginBottom: 24 }}>
          <strong style={{ display: 'block', fontSize: 14, marginBottom: 6 }}>
            📌 ይፋዊው የፎቶግራፍ መስፈርት (Official Photo Requirement):
          </strong>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
            It must be a photo with a white background, without glasses, taken within the last 6 months. Our system will automatically resize your photo to 600x600 pixels.
            <br />
            (ፎቶው ነጭ ጀርባ ያለው፣ መነፅር የሌለበት፣ በቅርብ 6 ወራት ውስጥ የተነሳ መሆን አለበት። የእኛ ቴክኖሎጂ ፎቶዎን በራስ-ሰር ወደ 600x600 ፒክሰል ያስተካክላል።)
          </p>
        </div>

        {/* 5 Golden Rules Grid */}
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>5ቱ ወርቃማ የዲቪ ፎቶ ህጎች (5 Golden Rules)</h3>
        <div className="grid-2" style={{ gap: 14, marginBottom: 28 }}>
          <div className="sub-card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>ነጭ ወይም ቀላል ጀርባ (Plain White Background)</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                ከጀርባዎ ጥላ ወይም የተለያየ ቀለም ያለው ነገር መኖር የለበትም።
              </div>
            </div>
          </div>

          <div className="sub-card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>ያለ መነፅር (No Eyeglasses)</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                የህክምናም ሆነ የፀሐይ መነፅር ማድረግ በጥብቅ የተከለከለ ነው።
              </div>
            </div>
          </div>

          <div className="sub-card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>በቅርብ 6 ወር የተነሳ (Taken in Last 6 Months)</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                የአሁኑን ገጽታዎን የሚያሳይ አዲስ ፎቶ መሆን አለበት።
              </div>
            </div>
          </div>

          <div className="sub-card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: 13, color: 'var(--text-main)' }}>ቀጥታ ወደ ካሜራ ማየት (Neutral Face & Looking Ahead)</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                ጭንቅላትዎን ሳያዘነብሉ ቀጥ ብለው ዓይንዎን ለካሜራው ማሳየት።
              </div>
            </div>
          </div>
        </div>

        {/* Live Photo Crop and Test Tool */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--primary-600)" />
            የፎቶ መፈተሻና ማስተካከያ (Interactive Photo Crop & Test Tool)
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            የእርስዎን ፎቶ እዚህ ይስቀሉ፤ ስርዓታችን ፎቶዎን በትክክለኛው 600x600 ፒክሰል አቆራርጦ ያዘጋጅልዎታል:
          </p>

          <PhotoUploadCrop
            label="የተፈታሽ ፎቶግራፍ / Photo Preview"
            existingPhotoKey={testedPhotoKey}
            onPhotoUploaded={(key) => setTestedPhotoKey(key)}
          />

          {testedPhotoKey && (
            <div style={{ marginTop: 16, background: 'var(--success-bg)', color: 'var(--success)', padding: 14, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <ShieldCheck size={20} />
              <div>
                <strong>✓ ፎቶዎ በተሳካ ሁኔታ ተፈትሾ ተቆርጧል!</strong>
                <div style={{ fontSize: 12 }}>ወደ ማመልከቻ ቅጹ ገብተው ይህን ፎቶ በቀላሉ መጠቀም ይችላሉ።</div>
              </div>
            </div>
          )}
        </div>

        {/* Start Application CTA */}
        <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 24 }}>
          <button
            onClick={() => onNavigate('wizard')}
            className="btn btn-primary"
            style={{ padding: '14px 32px', fontSize: 15, borderRadius: 9999 }}
          >
            አሁን ማመልከት ጀምር / Start Application <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
