'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, ChevronRight, X, Edit3 } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

// Size data with EU mapping and body measurements
const sizeChart = {
  'T-Shirts': {
    sizes: [
      { label: 'S',   eu: 46, bust: '92-96',   waist: '78-82',  height: '170-175', length: '69',  shoulder: '43' },
      { label: 'M',   eu: 48, bust: '96-100',  waist: '82-86',  height: '175-180', length: '71',  shoulder: '46' },
      { label: 'L',   eu: 50, bust: '100-105', waist: '86-91',  height: '180-185', length: '74',  shoulder: '48' },
      { label: 'XL',  eu: 52, bust: '105-110', waist: '91-96',  height: '185-190', length: '76',  shoulder: '51' },
      { label: 'XXL', eu: 54, bust: '110-115', waist: '96-102', height: '185-190', length: '79',  shoulder: '53' },
    ],
    garmentHeaders: ['length', 'shoulder'],
    bodyParts: ['bust', 'waist', 'height'],
  },
  'Hoodies': {
    sizes: [
      { label: 'S',   eu: 46, bust: '97-102',  waist: '78-82',  height: '170-175', length: '66', sleeve: '84',  shoulder: '45' },
      { label: 'M',   eu: 48, bust: '102-107', waist: '82-86',  height: '175-180', length: '69', sleeve: '86',  shoulder: '47' },
      { label: 'L',   eu: 50, bust: '107-112', waist: '86-91',  height: '180-185', length: '71', sleeve: '89',  shoulder: '49' },
      { label: 'XL',  eu: 52, bust: '112-117', waist: '91-96',  height: '185-190', length: '74', sleeve: '91',  shoulder: '51' },
      { label: 'XXL', eu: 54, bust: '117-122', waist: '96-102', height: '185-190', length: '76', sleeve: '94',  shoulder: '53' },
    ],
    garmentHeaders: ['length', 'sleeve', 'shoulder'],
    bodyParts: ['bust', 'waist', 'height'],
  },
  'Leggings': {
    sizes: [
      { label: 'S',   eu: 46, waist: '66-71',  hip: '89-94',  height: '165-170', inseam: '71' },
      { label: 'M',   eu: 48, waist: '71-76',  hip: '94-99',  height: '170-175', inseam: '74' },
      { label: 'L',   eu: 50, waist: '76-81',  hip: '99-104', height: '175-180', inseam: '74' },
      { label: 'XL',  eu: 52, waist: '81-86',  hip: '104-109',height: '180-185', inseam: '76' },
    ],
    garmentHeaders: ['inseam'],
    bodyParts: ['waist', 'hip', 'height'],
  },
  'Pants': {
    sizes: [
      { label: 'S',   eu: 46, waist: '76-81',  hip: '94-99',   height: '170-175', inseam: '79' },
      { label: 'M',   eu: 48, waist: '81-86',  hip: '99-104',  height: '175-180', inseam: '79' },
      { label: 'L',   eu: 50, waist: '86-91',  hip: '104-109', height: '180-185', inseam: '81' },
      { label: 'XL',  eu: 52, waist: '91-97',  hip: '109-114', height: '185-190', inseam: '81' },
      { label: 'XXL', eu: 54, waist: '97-102', hip: '114-119', height: '185-190', inseam: '84' },
    ],
    garmentHeaders: ['inseam'],
    bodyParts: ['waist', 'hip', 'height'],
  },
};

type Category = keyof typeof sizeChart;

function parseRange(val: string): [number, number] {
  const parts = val.split('-').map(Number);
  return parts.length === 2 ? [parts[0], parts[1]] : [parts[0], parts[0]];
}

function recommendSize(category: Category, bust: number, waist: number): string | null {
  const sizes = sizeChart[category].sizes;
  for (const s of sizes) {
    const sizeData = s as Record<string, string | number>;
    // Check bust if available
    if (sizeData.bust && bust > 0) {
      const [min, max] = parseRange(String(sizeData.bust));
      if (bust >= min && bust <= max) return s.label;
    }
    // Check waist
    if (sizeData.waist && waist > 0) {
      const [min, max] = parseRange(String(sizeData.waist));
      if (waist >= min && waist <= max) return s.label;
    }
  }
  // If no exact match, find closest
  if (bust > 0 || waist > 0) {
    let bestSize = sizes[0].label;
    let bestDist = Infinity;
    for (const s of sizes) {
      const sizeData = s as Record<string, string | number>;
      let dist = 0;
      if (sizeData.bust && bust > 0) {
        const [min, max] = parseRange(String(sizeData.bust));
        const mid = (min + max) / 2;
        dist += Math.abs(bust - mid);
      }
      if (sizeData.waist && waist > 0) {
        const [min, max] = parseRange(String(sizeData.waist));
        const mid = (min + max) / 2;
        dist += Math.abs(waist - mid);
      }
      if (dist < bestDist) {
        bestDist = dist;
        bestSize = s.label;
      }
    }
    return bestSize;
  }
  return null;
}

export default function SizeGuidePage() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<Category>('T-Shirts');
  const [selectedSize, setSelectedSize] = useState('L');
  const [activeTab, setActiveTab] = useState<'guide' | 'recommend'>('guide');
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [bustInput, setBustInput] = useState('');
  const [waistInput, setWaistInput] = useState('');
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [userMeasurements, setUserMeasurements] = useState<{ bust: number; waist: number } | null>(null);

  const categories = Object.keys(sizeChart) as Category[];
  const currentChart = sizeChart[activeCategory];
  const currentSize = currentChart.sizes.find(s => s.label === selectedSize) || currentChart.sizes[2] || currentChart.sizes[0];
  const isUpperBody = activeCategory === 'T-Shirts' || activeCategory === 'Hoodies';

  const handleRecommend = () => {
    const bust = parseFloat(bustInput) || 0;
    const waist = parseFloat(waistInput) || 0;
    if (bust === 0 && waist === 0) return;
    const rec = recommendSize(activeCategory, bust, waist);
    setRecommendation(rec);
    setUserMeasurements({ bust, waist });
    setShowRecommendModal(false);
    setActiveTab('recommend');
    if (rec) setSelectedSize(rec);
  };

  const sizeRecord = currentSize as Record<string, string | number>;

  return (
    <div className="min-h-screen bg-black pt-24 pb-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#32FF6A]/10 rounded-full mb-6">
            <Ruler className="w-8 h-8 text-[#32FF6A]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold uppercase tracking-tight">
            {t('sizeGuide.title1')} <span className="text-[#32FF6A]">{t('sizeGuide.title2')}</span>
          </h1>
        </motion.div>

        {/* Tab Switcher: Size Guide / Size Recommendation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/5 p-1 gap-1">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'guide' ? 'bg-[#32FF6A] text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              {t('sizeGuide.sizeGuideTab')}
            </button>
            <button
              onClick={() => { setActiveTab('recommend'); if (!userMeasurements) setShowRecommendModal(true); }}
              className={`px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'recommend' ? 'bg-[#32FF6A] text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              {t('sizeGuide.sizeRecommendTab')}
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                const sizes = sizeChart[cat].sizes;
                if (!sizes.find(s => s.label === selectedSize)) {
                  setSelectedSize(sizes[Math.min(2, sizes.length - 1)].label);
                }
              }}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors border ${
                activeCategory === cat
                  ? 'border-[#32FF6A] text-[#32FF6A] bg-[#32FF6A]/5'
                  : 'border-white/10 text-white/50 hover:border-white/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'guide' ? (
            <motion.div key="guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Size Selector Pills */}
              <div className="flex justify-center gap-3 mb-10">
                {currentChart.sizes.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setSelectedSize(s.label)}
                    className={`w-14 h-14 flex items-center justify-center text-sm font-bold transition-all border-2 ${
                      selectedSize === s.label
                        ? 'border-[#32FF6A] text-[#32FF6A] bg-[#32FF6A]/10 scale-110'
                        : 'border-white/20 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Visual Diagram + Measurements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* Body Diagram */}
                <div className="flex justify-center">
                  <div className="relative w-[320px]">
                    {/* SVG Body Silhouette */}
                    <svg viewBox="0 0 300 520" style={{ color: '#32FF6A' }} className="size-diagram w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Head */}
                      <ellipse cx="150" cy="45" rx="28" ry="32" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                      {/* Neck */}
                      <line x1="150" y1="77" x2="150" y2="95" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                      {/* Shoulders */}
                      <path d="M 100 105 Q 115 95 150 95 Q 185 95 200 105" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
                      {/* Torso */}
                      <path d="M 100 105 L 95 200 L 108 280 L 118 280 L 125 200 Q 150 205 175 200 L 182 280 L 192 280 L 205 200 L 200 105" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" />
                      {/* Arms */}
                      <path d="M 100 105 L 68 190 L 60 260" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                      <path d="M 200 105 L 232 190 L 240 260" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                      {/* Legs */}
                      <path d="M 118 280 L 112 380 L 110 480" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                      <path d="M 182 280 L 188 380 L 190 480" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

                      {isUpperBody ? (
                        <>
                          {/* Bust line */}
                          <line x1="70" y1="145" x2="230" y2="145" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                          <rect x="5" y="133" width="80" height="24" rx="12" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                          <text x="45" y="150" textAnchor="middle" fill="#32FF6A" fontSize="12" fontWeight="bold">{sizeRecord.bust}</text>

                          {/* Waist line */}
                          <line x1="80" y1="200" x2="220" y2="200" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                          <rect x="5" y="188" width="80" height="24" rx="12" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                          <text x="45" y="205" textAnchor="middle" fill="#32FF6A" fontSize="12" fontWeight="bold">{sizeRecord.waist}</text>

                          {/* Height line */}
                          <line x1="255" y1="15" x2="255" y2="480" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                          <rect x="220" y="240" width="80" height="24" rx="12" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                          <text x="260" y="257" textAnchor="middle" fill="#32FF6A" fontSize="12" fontWeight="bold">{sizeRecord.height}</text>
                        </>
                      ) : (
                        <>
                          {/* Waist line */}
                          <line x1="80" y1="200" x2="220" y2="200" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                          <rect x="5" y="188" width="80" height="24" rx="12" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                          <text x="45" y="205" textAnchor="middle" fill="#32FF6A" fontSize="12" fontWeight="bold">{sizeRecord.waist}</text>

                          {/* Hip line */}
                          <line x1="75" y1="260" x2="225" y2="260" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                          <rect x="5" y="248" width="80" height="24" rx="12" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                          <text x="45" y="265" textAnchor="middle" fill="#32FF6A" fontSize="12" fontWeight="bold">{sizeRecord.hip}</text>

                          {/* Height line */}
                          <line x1="255" y1="15" x2="255" y2="480" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                          <rect x="220" y="240" width="80" height="24" rx="12" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                          <text x="260" y="257" textAnchor="middle" fill="#32FF6A" fontSize="12" fontWeight="bold">{sizeRecord.height}</text>
                        </>
                      )}
                    </svg>

                    {/* Size label */}
                    <div className="absolute top-4 left-4 bg-[#32FF6A] text-black px-3 py-1 font-bold text-lg">
                      {selectedSize}
                    </div>
                  </div>
                </div>

                {/* Garment Diagram */}
                <div className="flex justify-center">
                  <div className="relative w-[320px]">
                    {isUpperBody ? (
                      <svg viewBox="0 0 300 350" style={{ color: '#32FF6A' }} className="size-diagram w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* T-shirt/Hoodie shape */}
                        <path d="M 80 30 L 45 70 L 30 140 L 65 150 L 80 90 L 80 310 L 220 310 L 220 90 L 235 150 L 270 140 L 255 70 L 220 30 Q 190 10 150 10 Q 110 10 80 30Z" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="rgba(255,255,255,0.02)" />
                        {/* Collar */}
                        <ellipse cx="150" cy="22" rx="30" ry="12" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" />

                        {/* Shoulder width */}
                        <line x1="80" y1="30" x2="220" y2="30" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                        <rect x="110" y="3" width="80" height="22" rx="11" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                        <text x="150" y="19" textAnchor="middle" fill="#32FF6A" fontSize="11" fontWeight="bold">{sizeRecord.shoulder}</text>

                        {/* Length */}
                        <line x1="260" y1="30" x2="260" y2="310" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                        <rect x="234" y="160" width="68" height="22" rx="11" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                        <text x="268" y="176" textAnchor="middle" fill="#32FF6A" fontSize="11" fontWeight="bold">{sizeRecord.length}</text>

                        {/* Sleeve if hoodie */}
                        {sizeRecord.sleeve && (
                          <>
                            <line x1="30" y1="140" x2="80" y2="30" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                            <rect x="14" y="75" width="68" height="22" rx="11" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                            <text x="48" y="91" textAnchor="middle" fill="#32FF6A" fontSize="11" fontWeight="bold">{sizeRecord.sleeve}</text>
                          </>
                        )}

                        {/* Bust width */}
                        <line x1="80" y1="120" x2="220" y2="120" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                        <rect x="110" y="127" width="80" height="22" rx="11" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                        <text x="150" y="143" textAnchor="middle" fill="#32FF6A" fontSize="11" fontWeight="bold">{sizeRecord.bust}</text>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 300 400" style={{ color: '#32FF6A' }} className="size-diagram w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Pants shape */}
                        <path d="M 90 20 L 85 160 L 60 380 L 120 380 L 145 180 L 155 180 L 180 380 L 240 380 L 215 160 L 210 20 Z" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="rgba(255,255,255,0.02)" />

                        {/* Waist */}
                        <line x1="90" y1="20" x2="210" y2="20" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                        <rect x="110" y="0" width="80" height="22" rx="11" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                        <text x="150" y="16" textAnchor="middle" fill="#32FF6A" fontSize="11" fontWeight="bold">{sizeRecord.waist}</text>

                        {/* Inseam */}
                        <line x1="150" y1="170" x2="150" y2="380" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                        <rect x="150" y="265" width="70" height="22" rx="11" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                        <text x="185" y="281" textAnchor="middle" fill="#32FF6A" fontSize="11" fontWeight="bold">{sizeRecord.inseam}</text>

                        {/* Hip */}
                        <line x1="85" y1="80" x2="215" y2="80" stroke="#32FF6A" strokeWidth="1" strokeDasharray="4 4" />
                        <rect x="110" y="85" width="80" height="22" rx="11" fill="#0a0a0a" stroke="#32FF6A" strokeWidth="1.5" />
                        <text x="150" y="101" textAnchor="middle" fill="#32FF6A" fontSize="11" fontWeight="bold">{sizeRecord.hip}</text>
                      </svg>
                    )}

                    <p className="text-white/30 text-xs text-center mt-4">{t('sizeGuide.allMeasurementsCm')}</p>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-white/30 text-xs text-center mb-8">
                ℹ️ {t('sizeGuide.manualDisclaimer')}
              </p>
            </motion.div>
          ) : (
            <motion.div key="recommend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Size Recommendation Tab */}
              {recommendation && userMeasurements ? (
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-8">
                    <p className="text-white/60 mb-2">{t('sizeGuide.recommendedSize')}</p>
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-[#32FF6A] text-black text-3xl font-black">
                      {recommendation}
                    </div>
                  </div>

                  <div className="border border-white/10 p-5 mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/40 text-sm">{t('sizeGuide.yourMeasurements')}</span>
                      <button onClick={() => setShowRecommendModal(true)} className="flex items-center gap-1 text-[#32FF6A] text-sm hover:underline">
                        <Edit3 size={14} /> {t('sizeGuide.edit')}
                      </button>
                    </div>
                    <p className="text-white">
                      {userMeasurements.bust > 0 && <>{t('sizeGuide.bust')}: {userMeasurements.bust} cm</>}
                      {userMeasurements.bust > 0 && userMeasurements.waist > 0 && ', '}
                      {userMeasurements.waist > 0 && <>{t('sizeGuide.waist')}: {userMeasurements.waist} cm</>}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-white/40 mb-4">{t('sizeGuide.enterMeasurements')}</p>
                  <button
                    onClick={() => setShowRecommendModal(true)}
                    className="px-8 py-3 bg-[#32FF6A] text-black font-bold uppercase tracking-wider text-sm hover:bg-[#2de05f] transition-colors"
                  >
                    {t('sizeGuide.inputMeasurements')}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body Measurements Table - always visible */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h3 className="text-lg font-bold uppercase tracking-wider text-center mb-6">
            {t('sizeGuide.bodyMeasurements')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full max-w-3xl mx-auto">
              <thead>
                <tr className="border-b-2 border-[#32FF6A]/30">
                  <th className="py-4 px-4 text-left text-sm font-semibold uppercase tracking-wider text-white/80">{t('sizeGuide.labelSize')}</th>
                  <th className="py-4 px-4 text-center text-sm font-semibold uppercase tracking-wider text-white/80">EU</th>
                  {currentChart.bodyParts.map(part => (
                    <th key={part} className="py-4 px-4 text-center text-sm font-semibold uppercase tracking-wider text-white/80">
                      {t(`sizeGuide.${part}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentChart.sizes.map((s, i) => {
                  const row = s as Record<string, string | number>;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-white/5 transition-colors cursor-pointer ${
                        selectedSize === s.label ? 'bg-[#32FF6A]/10' : 'hover:bg-white/5'
                      }`}
                      onClick={() => { setSelectedSize(s.label); setActiveTab('guide'); }}
                    >
                      <td className={`py-4 px-4 font-bold text-sm ${
                        selectedSize === s.label ? 'text-[#32FF6A]' : 'text-white'
                      }`}>{s.label}</td>
                      <td className="py-4 px-4 text-center text-sm text-white/70">{s.eu}</td>
                      {currentChart.bodyParts.map(part => (
                        <td key={part} className="py-4 px-4 text-center text-sm text-white/70">{row[part] ?? '—'}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* How to Measure */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-12 p-6 bg-white/5">
          <h2 className="text-xl font-bold uppercase tracking-wider mb-4">
            {t('sizeGuide.howToMeasure')} <span className="text-[#32FF6A]">{t('sizeGuide.howToMeasure2')}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-white/70">
            <div>
              <h3 className="font-semibold text-white mb-2">{t('sizeGuide.chest')}</h3>
              <p>{t('sizeGuide.chestDesc')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">{t('sizeGuide.waist')}</h3>
              <p>{t('sizeGuide.waistDesc')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">{t('sizeGuide.hip')}</h3>
              <p>{t('sizeGuide.hipDesc')}</p>
            </div>
          </div>
        </motion.div>

        {/* Tips */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-8 p-6 border border-[#32FF6A]/30">
          <h2 className="text-lg font-bold uppercase tracking-wider mb-4">
            {t('sizeGuide.fitTips')} <span className="text-[#32FF6A]">{t('sizeGuide.fitTips2')}</span>
          </h2>
          <ul className="space-y-2 text-sm text-white/70">
            {[t('sizeGuide.tip1'), t('sizeGuide.tip2'), t('sizeGuide.tip3'), t('sizeGuide.tip4')].map((tip, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="text-[#32FF6A]">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Measurement Input Modal */}
      <AnimatePresence>
        {showRecommendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRecommendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111] border border-white/10 p-6 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">{t('sizeGuide.enterBodyInfo')}</h3>
                <button onClick={() => setShowRecommendModal(false)} className="text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {isUpperBody && (
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">
                      {t('sizeGuide.bust')} (cm)
                    </label>
                    <input
                      type="number"
                      value={bustInput}
                      onChange={(e) => setBustInput(e.target.value)}
                      placeholder="100"
                      className="w-full px-4 py-3 bg-transparent border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-[#32FF6A]/50 transition-colors"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.3em] text-white/50 mb-2">
                    {t('sizeGuide.waist')} (cm)
                  </label>
                  <input
                    type="number"
                    value={waistInput}
                    onChange={(e) => setWaistInput(e.target.value)}
                    placeholder="86"
                    className="w-full px-4 py-3 bg-transparent border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-[#32FF6A]/50 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleRecommend}
                disabled={!bustInput && !waistInput}
                className="w-full mt-6 py-4 bg-[#32FF6A] text-black font-bold uppercase tracking-wider hover:bg-[#2de05f] transition-colors disabled:opacity-30"
              >
                {t('sizeGuide.getRecommendation')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}