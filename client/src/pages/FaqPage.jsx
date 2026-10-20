import React from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { HelpCircle, ArrowLeft, ExternalLink } from 'lucide-react';

export default function FaqPage({ onNavigate }) {
  const { t } = useLanguage();

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <button onClick={() => onNavigate('home')} className="btn btn-secondary" style={{ marginBottom: 20, padding: '6px 12px', fontSize: 13 }}>
        <ArrowLeft size={14} /> {t('home')} / Back
      </button>

      <div className="card payment-card" style={{ marginBottom: 30, borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <HelpCircle size={28} color="var(--primary-400)" />
          <h1 style={{ fontSize: 26, margin: 0 }}>ተደጋግመው የሚጠየቁ ጥያቄዎች (FAQ)</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          ስለ DV-2027 ፕሮግራም፣ ስለ ቅጽ አሞላል እና ስለ EthioDV አሰራር በተደጋጋሚ ለሚነሱ ጥያቄዎች የተሰጡ ይፋዊ ማብራሪያዎች።
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="sub-card">
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text-main)', fontWeight: 700 }}>1. EthioDV ምንድን ነው? ከአሜሪካ ኤምባሲ ጋር ግንኙነት አለው?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong>መልስ:</strong> በፍጹም! EthioDV ራሱን የቻለ የቴክኖሎጂና የማመልከቻ አጋዥ አገልግሎት እንጂ ከአሜሪካ መንግስት፣ ከስቴት ዲፓርትመንት ወይም ከኤምባሲ ጋር ምንም አይነት ግንኙነት የለውም። ይፋዊው የዲቪ ሎተሪ ማመልከቻ በ <strong>dvprogram.state.gov</strong> በነፃ የሚሞላ ሲሆን የእኛ ክፍያ ዶላር ካርድ ለሌላቸው ኢትዮጵያውያን ቅጻቸውን በአማርኛ እንዲሞሉ፣ ፎቶግራፋቸውን በባለሙያ እንዲያስተካክሉ እና በይፋዊው ድረ-ገጽ እንዲመዘገቡ የሚደረግ የአገልግሎት ክፍያ ነው።
            </p>
          </div>

          <div className="sub-card">
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text-main)', fontWeight: 700 }}>2. ለDV-2027 ለማመልከት ፓስፖርት ያስፈልገኛል?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong>መልስ:</strong> አይያስፈልግዎትም! እ.ኤ.አ በ2022 በአሜሪካ ፌደራል ፍርድ ቤት ውሳኔ መሰረት የፓስፖርት ህግ ተሰርዟል። ስለዚህ ለDV-2024, DV-2025 እና DV-2026 ምዝገባዎች ፓስፖርት አላስፈለገም። ለDV-2027 ምዝገባም ፓስፖርት ሳይኖርዎት በልደት መረጃዎ ብቻ ማመልከት ይችላሉ።
            </p>
          </div>

          <div className="sub-card">
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text-main)', fontWeight: 700 }}>3. የፎቶግራፍ መስፈርቶች ምንድን ናቸው?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong>መልስ:</strong> ፎቶው ባለ 600x600 ፒክሰል መጠን ያለው፣ ነጭ ጀርባ ያለው፣ መነፅር የሌለበት እና በቅርብ 6 ወራት ውስጥ የተነሳ መሆን አለበት። የእኛ ዌብሳይት ፎቶዎን በቀጥታ ቆርጦና አስተካክሎ ወደ ትክክለኛው የዲቪ መስፈርት ይቀይርልዎታል።
            </p>
          </div>

          <div className="sub-card">
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text-main)', fontWeight: 700 }}>4. ይፋዊው የማረጋገጫ ቁጥር (Confirmation Number) እንዴት ይደርሰኛል?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong>መልስ:</strong> ኦፕሬተሮቻችን ማመልከቻዎን በይፋዊው ድረ-ገጽ እንዳስገቡ ወዲያውኑ ባለ 16 ዲጂት ቁጥሩ በቴሌግራም ቦት፣ በኢሜል እንዲሁም በዚህ ድረ-ገጽ ላይ ባለው አካውንትዎ ውስጥ ይላክልዎታል። ቁጥሩ ሙሉ በሙሉ የእርስዎ የግል ንብረት ነው።
            </p>
          </div>

          <div className="sub-card">
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text-main)', fontWeight: 700 }}>5. ውጤት የሚታወቀው መቼ ነው?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong>መልስ:</strong> የDV-2027 ውጤት በሜይ ወር በ <strong>dvprogram.state.gov</strong> ላይ በይፋ ይፋ ይሆናል። የተሰጠዎትን የማረጋገጫ ቁጥር በመጠቀም በግልዎ ውጤትዎን ማየት ይችላሉ።
            </p>
          </div>

          <div className="sub-card" style={{ borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text-main)', fontWeight: 700 }}>6. የገንዘብ ተመላሽ ዋስትናው (90% Refund Guarantee) እንዴት ይሰራል?</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <strong>መልስ:</strong> ከእኛ በኩል በሚፈጠር ማንኛውም ቴክኒካል ወይም የአሰራር መስተጓጎል ማመልከቻዎ በጊዜ ገደቡ ማስገባት ካልቻልን፣ የከፈሉት ገንዘብ <strong>90% (900 ብር)</strong> ሙሉ በሙሉ ወዲያውኑ ወደ አካውንትዎ ተመላሽ ይደረጋል (10% የባንክና ቴሌኮም ሂደት ወጪ ብቻ ተቀንሶ)።
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
