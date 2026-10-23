import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/index.jsx';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  GraduationCap, 
  Briefcase, 
  Globe2, 
  ShieldCheck, 
  PhoneCall,
  Send
} from 'lucide-react';
import './EligibilityQuiz.css';

const TRANSLATIONS = {
  en: {
    badge: 'FREE 30-SECOND CHECK',
    title: 'Check Your DV-2027 Eligibility Instantly',
    subtitle: 'Find out if you meet the official U.S. Department of State requirements before starting your application.',
    stepOf: 'Question',
    of: 'of',
    
    // Step 1: Birth Country
    q1Title: '1. Were you born in Ethiopia (or another DV-eligible country)?',
    q1Desc: 'Even if you were born in a non-eligible country, you may still qualify if your spouse or parents were born in Ethiopia.',
    q1Yes: 'Yes, I was born in Ethiopia (or an eligible country)',
    q1Spouse: 'No, but my Husband/Wife was born in an eligible country',
    q1No: 'No, neither I nor my family were born in an eligible country',

    // Step 2: Education
    q2Title: '2. What is your highest completed level of education?',
    q2Desc: 'The U.S. government requires at least a 12th-grade high school diploma OR qualifying work experience.',
    q2HighSchool: 'Completed Grade 12 (Preparatory) / University Degree / Master’s / PhD',
    q2TvetOrLower: 'Grade 10 / TVET Diploma / Currently in High School / Below Grade 12',

    // Step 3: Work Experience (Fallback if < Grade 12)
    q3Title: '3. Do you have 2+ years of work experience in the last 5 years?',
    q3Desc: 'If you have not completed Grade 12, you can qualify through 2 years of experience in a skilled occupation (O*NET Job Zone 4 or 5) or through a qualified spouse.',
    q3Skilled: 'Yes, 2+ years as a Business Manager, Professional, Technician, or High-Skill Trade',
    q3SpouseQualifies: 'No, but my Spouse (Husband/Wife) completed Grade 12 or has a Degree',
    q3Unskilled: 'No, I have less than 2 years or work in general entry-level labor',

    // Results: Eligible via Education or Work
    resEligibleTitle: 'Congratulations! You Qualify for DV-2027',
    resEligibleDesc: 'You meet the core U.S. Department of State eligibility rules. Our operators can verify your 600x600px biometric photo and file your official application without server crashes.',
    resSpouseTipTitle: 'Pro Tip for Married Applicants:',
    resSpouseTipDesc: 'If you are married, both you and your spouse can submit separate applications and include each other—legally doubling your family’s chance of winning!',
    
    // Results: Eligible via Spouse
    resSpouseEligibleTitle: 'Great News! Your Family Still Qualifies via Your Spouse!',
    resSpouseEligibleDesc: 'Your spouse can apply as the Primary Applicant and include you and all unmarried children under 21 on their application—giving the entire family Green Cards if selected!',

    // Results: Not Eligible / Needs Consultation
    resIneligibleTitle: 'Wait — Let Our Team Double-Check Your Case',
    resIneligibleDesc: 'Standard rules require a Grade 12 diploma or qualifying skilled work experience. However, many applicants qualify through alternate chargeability or specific job classifications.',
    
    // CTAs
    ctaStart: 'Start My DV-2027 Application Now',
    ctaSpouseStart: 'Start Application (Spouse as Primary)',
    ctaCallSupport: 'Call Free Support: 0949478933',
    ctaTelegram: 'Ask on Telegram (@DV2027EthioDv_Bot)',
    ctaReset: 'Check Again',
    trustNote: '1,000 ETB via Telebirr / CBE • 100% Money-Back Filing Guarantee • Official 16-Digit Confirmation'
  },
  am: {
    badge: 'ነፃ የ30 ሰከንድ ማረጋገጫ',
    title: 'ለDV-2027 ብቁ መሆንዎን አሁኑኑ ያረጋግጡ',
    subtitle: 'ማመልከቻዎን ከመጀመርዎ በፊት የአሜሪካ መንግስት የሚጠይቃቸውን መስፈርቶች ማሟላትዎን በ30 ሰከንድ ውስጥ ይወቁ።',
    stepOf: 'ጥያቄ',
    of: 'ከ',

    // Step 1: Birth Country
    q1Title: '1. የተወለዱት በኢትዮጵያ (ወይም በሌላ ለDV ብቁ በሆነች ሀገር) ነው?',
    q1Desc: 'ብቁ ባልሆነች ሀገር ተወልደው ቢሆንም፣ የትዳር አጋርዎ ወይም ወላጆችዎ በኢትዮጵያ ከተወለዱ ማመልከት ይችላሉ።',
    q1Yes: 'አዎ፣ በኢትዮጵያ (ወይም ብቁ በሆነች ሀገር) ነው የተወለድኩት',
    q1Spouse: 'አይደለም፣ ግን ባለቤቴ የተወለደው/ችው በኢትዮጵያ ነው',
    q1No: 'አይደለም፣ እኔም ሆነ ቤተሰቦቼ ብቁ በሆነች ሀገር አልተወለድንም',

    // Step 2: Education
    q2Title: '2. ያጠናቀቁት ከፍተኛው የትምህርት ደረጃ ምንድን ነው?',
    q2Desc: 'የአሜሪካ መንግስት ቢያንስ የ12ኛ ክፍል ማጠናቀቂያ ወይም የ2 ዓመት የስራ ልምድ ይጠይቃል።',
    q2HighSchool: '12ኛ ክፍል ያጠናቀቀ / የዩኒቨርሲቲ ዲግሪ / ማስተርስ / ዶክትሬት',
    q2TvetOrLower: '10ኛ ክፍል / ኮሌጅ ዲፕሎማ (TVET) / አሁን ተማሪ ነኝ / ከ12ኛ ክፍል በታች',

    // Step 3: Work Experience
    q3Title: '3. ባለፉት 5 ዓመታት ውስጥ የ2 ዓመት የሙያ የስራ ልምድ አለዎት?',
    q3Desc: '12ኛ ክፍል ካላጠናቀቁ፣ ከፍተኛ ክህሎት በሚጠይቅ ስራ የ2 ዓመት ልምድ ካለዎት ወይም በባለቤትዎ በኩል ማመልከት ይችላሉ።',
    q3Skilled: 'አዎ፣ በማኔጅመንት፣ በከፍተኛ ሙያ ወይም በቴክኒክ ዘርፍ የ2+ ዓመት ልምድ አለኝ',
    q3SpouseQualifies: 'የለኝም፣ ግን ባለቤቴ 12ኛ ክፍል አጠናቋል/ቃለች ወይም ዲግሪ አላት/ው',
    q3Unskilled: 'የለኝም፣ የስራ ልምዴ ከ2 ዓመት በታች ነው ወይም መደበኛ ስራ ነው',

    // Results: Eligible
    resEligibleTitle: 'እንኳን ደስ አለዎት! ለDV-2027 ማመልከት ይችላሉ!',
    resEligibleDesc: 'የአሜሪካ መንግስት የሚጠይቀውን መስፈርት ያሟላሉ። ፎቶዎን በትክክለኛው 600x600px መጠን አስተካክለን፣ ያለ ምንም የኔትወርክ መቋረጥ ሞልተን ባለ 16 አሃዝ ማረጋገጫዎን በቴሌግራም እና በኢሜይል እንልክልዎታለን።',
    resSpouseTipTitle: 'ልዩ ምክር ለባለትዳሮች፦',
    resSpouseTipDesc: 'ባለትዳር ከሆኑ እርስዎም ሆኑ ባለቤትዎ ለየብቻ በማመልከት የቤተሰብዎን የማሸነፍ እድል በህጋዊ መንገድ እጥፍ (2X) ማድረግ ይችላሉ!',

    // Results: Eligible via Spouse
    resSpouseEligibleTitle: 'መልካም ዜና! በባለቤትዎ ስም ማመልከት ይችላሉ!',
    resSpouseEligibleDesc: 'ባለቤትዎ እንደ ዋና አመልካች ሆነው እርስዎን እና ከ21 ዓመት በታች የሆኑ ልጆችዎን በማካተት ማመልከት ይችላሉ። ዕጣው ሲወጣ ለሙሉ ቤተሰቡ ግሪን ካርድ ይሰጣል!',

    // Results: Ineligible / Needs Consultation
    resIneligibleTitle: 'ቆይ — ጉዳይዎን ከባለሙያዎቻችን ጋር ያማክሩ',
    resIneligibleDesc: 'መደበኛው ህግ የ12ኛ ክፍል ወይም የ2 ዓመት የሙያ ልምድ ቢጠይቅም፣ የትምህርት ወይም የስራ ዘርፍዎ ብቁ ሊያደርግዎት ስለሚችል በነፃ የድጋፍ ስልካችን ይደውሉልን።',

    // CTAs
    ctaStart: 'የDV-2027 ማመልከቻዬን አሁን ልጀምር',
    ctaSpouseStart: 'በባለቤቴ ስም ማመልከቻ ልጀምር',
    ctaCallSupport: 'ነፃ የምክር አገልግሎት፦ 0949478933',
    ctaTelegram: 'በቴሌግራም ይጠይቁን (@DV2027EthioDv_Bot)',
    ctaReset: 'እንደገና ለማረጋገጥ',
    trustNote: 'ክፍያ 1,000 ብር በቴሌብር / በንግድ ባንክ • 100% የገንዘብ ተመላሽ ዋስትና • ኦፊሴላዊ ባለ 16 አሃዝ ማረጋገጫ'
  }
};

export default function EligibilityQuiz({ language, onNavigate }) {
  // Use app-wide language context if available, otherwise fallback gracefully
  let contextLang = 'am';
  let setContextLang = null;
  try {
    const langContext = useLanguage();
    contextLang = langContext.language;
    setContextLang = langContext.setLanguage;
  } catch {
    // Independent render fallback
  }

  const [lang, setLang] = useState(language || contextLang || 'am');
  const [step, setStep] = useState(1); // 1: Country, 2: Education, 3: Work Exp
  const [result, setResult] = useState(null); // 'ELIGIBLE' | 'SPOUSE_ELIGIBLE' | 'CONSULT'

  useEffect(() => {
    if (language) setLang(language);
    else if (contextLang) setLang(contextLang);
  }, [language, contextLang]);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const handleCountryAnswer = (choice) => {
    if (choice === 'NO') {
      setResult('CONSULT');
    } else {
      setStep(2);
    }
  };

  const handleEducationAnswer = (choice) => {
    if (choice === 'HIGH_SCHOOL') {
      setResult('ELIGIBLE');
    } else {
      setStep(3);
    }
  };

  const handleWorkAnswer = (choice) => {
    if (choice === 'SKILLED') {
      setResult('ELIGIBLE');
    } else if (choice === 'SPOUSE') {
      setResult('SPOUSE_ELIGIBLE');
    } else {
      setResult('CONSULT');
    }
  };

  const resetQuiz = () => {
    setStep(1);
    setResult(null);
  };

  const handleStartApply = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('wizard');
    } else {
      window.location.href = '/apply';
    }
  };

  const switchLanguage = (newLang) => {
    setLang(newLang);
    if (setContextLang) {
      setContextLang(newLang);
    }
  };

  return (
    <section className="eq-section" aria-label="DV-2027 Eligibility Checker">
      <div className="eq-container">
        {/* Header Bar */}
        <div className="eq-header">
          <div className="eq-badge-row">
            <span className="eq-badge">
              <Sparkles size={15} />
              {t.badge}
            </span>

            {/* Inline Language Switcher */}
            <div className="eq-lang-toggle">
              <button
                type="button"
                className={`eq-lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => switchLanguage('en')}
              >
                English
              </button>
              <button
                type="button"
                className={`eq-lang-btn ${lang === 'am' ? 'active' : ''}`}
                onClick={() => switchLanguage('am')}
              >
                አማርኛ
              </button>
            </div>
          </div>

          <h2 className="eq-title">{t.title}</h2>
          <p className="eq-subtitle">{t.subtitle}</p>
        </div>

        {/* Main Quiz Card */}
        <div className="eq-card">
          {!result ? (
            <>
              {/* Progress Indicator */}
              <div className="eq-progress-wrapper">
                <div className="eq-progress-meta">
                  <span>
                    {t.stepOf} {step} {t.of} {step === 3 ? 3 : 2}
                  </span>
                  <span>{step === 1 ? '50%' : step === 2 ? '85%' : '95%'}</span>
                </div>
                <div className="eq-progress-bar">
                  <div
                    className="eq-progress-fill"
                    style={{ width: step === 1 ? '50%' : step === 2 ? '85%' : '95%' }}
                  />
                </div>
              </div>

              {/* STEP 1: Country of Birth */}
              {step === 1 && (
                <div className="eq-step-content">
                  <div className="eq-question-header">
                    <div className="eq-icon-box">
                      <Globe2 size={24} />
                    </div>
                    <div>
                      <h3 className="eq-question-title">{t.q1Title}</h3>
                      <p className="eq-question-desc">{t.q1Desc}</p>
                    </div>
                  </div>

                  <div className="eq-options-grid">
                    <button
                      type="button"
                      className="eq-option-btn"
                      onClick={() => handleCountryAnswer('YES')}
                    >
                      <span className="eq-option-text">{t.q1Yes}</span>
                      <ArrowRight size={18} className="eq-option-arrow" />
                    </button>

                    <button
                      type="button"
                      className="eq-option-btn"
                      onClick={() => handleCountryAnswer('SPOUSE')}
                    >
                      <span className="eq-option-text">{t.q1Spouse}</span>
                      <ArrowRight size={18} className="eq-option-arrow" />
                    </button>

                    <button
                      type="button"
                      className="eq-option-btn eq-option-muted"
                      onClick={() => handleCountryAnswer('NO')}
                    >
                      <span className="eq-option-text">{t.q1No}</span>
                      <ArrowRight size={18} className="eq-option-arrow" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Education Level */}
              {step === 2 && (
                <div className="eq-step-content">
                  <div className="eq-question-header">
                    <div className="eq-icon-box">
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <h3 className="eq-question-title">{t.q2Title}</h3>
                      <p className="eq-question-desc">{t.q2Desc}</p>
                    </div>
                  </div>

                  <div className="eq-options-grid">
                    <button
                      type="button"
                      className="eq-option-btn"
                      onClick={() => handleEducationAnswer('HIGH_SCHOOL')}
                    >
                      <span className="eq-option-text">{t.q2HighSchool}</span>
                      <ArrowRight size={18} className="eq-option-arrow" />
                    </button>

                    <button
                      type="button"
                      className="eq-option-btn"
                      onClick={() => handleEducationAnswer('LOWER')}
                    >
                      <span className="eq-option-text">{t.q2TvetOrLower}</span>
                      <ArrowRight size={18} className="eq-option-arrow" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Work Experience Fallback */}
              {step === 3 && (
                <div className="eq-step-content">
                  <div className="eq-question-header">
                    <div className="eq-icon-box">
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <h3 className="eq-question-title">{t.q3Title}</h3>
                      <p className="eq-question-desc">{t.q3Desc}</p>
                    </div>
                  </div>

                  <div className="eq-options-grid">
                    <button
                      type="button"
                      className="eq-option-btn"
                      onClick={() => handleWorkAnswer('SKILLED')}
                    >
                      <span className="eq-option-text">{t.q3Skilled}</span>
                      <ArrowRight size={18} className="eq-option-arrow" />
                    </button>

                    <button
                      type="button"
                      className="eq-option-btn"
                      onClick={() => handleWorkAnswer('SPOUSE')}
                    >
                      <span className="eq-option-text">{t.q3SpouseQualifies}</span>
                      <ArrowRight size={18} className="eq-option-arrow" />
                    </button>

                    <button
                      type="button"
                      className="eq-option-btn eq-option-muted"
                      onClick={() => handleWorkAnswer('UNSKILLED')}
                    >
                      <span className="eq-option-text">{t.q3Unskilled}</span>
                      <ArrowRight size={18} className="eq-option-arrow" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* RESULTS VIEW */
            <div className="eq-result-box">
              {result === 'ELIGIBLE' && (
                <>
                  <div className="eq-result-icon eq-icon-success">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="eq-result-title">{t.resEligibleTitle}</h3>
                  <p className="eq-result-desc">{t.resEligibleDesc}</p>

                  <div className="eq-spouse-tip">
                    <strong>{t.resSpouseTipTitle}</strong> {t.resSpouseTipDesc}
                  </div>

                  <div className="eq-cta-group">
                    <button
                      type="button"
                      className="eq-btn-primary"
                      onClick={handleStartApply}
                    >
                      <span>{t.ctaStart}</span>
                      <ArrowRight size={18} />
                    </button>
                    <button type="button" className="eq-btn-ghost" onClick={resetQuiz}>
                      <RotateCcw size={16} />
                      <span>{t.ctaReset}</span>
                    </button>
                  </div>
                </>
              )}

              {result === 'SPOUSE_ELIGIBLE' && (
                <>
                  <div className="eq-result-icon eq-icon-success">
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 className="eq-result-title">{t.resSpouseEligibleTitle}</h3>
                  <p className="eq-result-desc">{t.resSpouseEligibleDesc}</p>

                  <div className="eq-cta-group">
                    <button
                      type="button"
                      className="eq-btn-primary"
                      onClick={handleStartApply}
                    >
                      <span>{t.ctaSpouseStart}</span>
                      <ArrowRight size={18} />
                    </button>
                    <button type="button" className="eq-btn-ghost" onClick={resetQuiz}>
                      <RotateCcw size={16} />
                      <span>{t.ctaReset}</span>
                    </button>
                  </div>
                </>
              )}

              {result === 'CONSULT' && (
                <>
                  <div className="eq-result-icon eq-icon-warn">
                    <AlertTriangle size={36} />
                  </div>
                  <h3 className="eq-result-title">{t.resIneligibleTitle}</h3>
                  <p className="eq-result-desc">{t.resIneligibleDesc}</p>

                  <div className="eq-cta-group">
                    <a href="tel:0949478933" className="eq-btn-primary eq-btn-call">
                      <PhoneCall size={18} />
                      <span>{t.ctaCallSupport}</span>
                    </a>
                    <a
                      href="https://t.me/DV2027EthioDv_Bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="eq-btn-secondary"
                    >
                      <Send size={17} />
                      <span>{t.ctaTelegram}</span>
                    </a>
                    <button type="button" className="eq-btn-ghost" onClick={resetQuiz}>
                      <RotateCcw size={16} />
                      <span>{t.ctaReset}</span>
                    </button>
                  </div>
                </>
              )}

              <div className="eq-trust-footer">
                <ShieldCheck size={16} />
                <span>{t.trustNote}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
