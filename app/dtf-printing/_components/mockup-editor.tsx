'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Rect } from 'react-konva';
import Konva from 'konva';
import { RotateCw, Trash2, Download, ZoomIn, ZoomOut, Move, Check, Loader2, Palette } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

interface DtfDesign {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
}

/* ── Product mockup data ──────────────────────────────── */
interface MockupVariant {
  color: string;
  colorHex: string;
  image: string;
}

interface ProductType {
  id: string;
  labelKey: string;
  variants: MockupVariant[];
  // Print area relative to the 896×1200 mockup (percentage-based)
  printArea: { x: number; y: number; width: number; height: number };
}

const products: ProductType[] = [
  {
    id: 'tshirt',
    labelKey: 'dtf.tshirt',
    variants: [
      { color: 'White', colorHex: '#FFFFFF', image: 'https://cdn.abacus.ai/images/e60ef570-307e-4f2a-87fb-bc38c788d091.png' },
      { color: 'Black', colorHex: '#1a1a1a', image: 'https://cdn.abacus.ai/images/68d9b9a4-0876-492c-923f-a2b348a33b9a.png' },
      { color: 'Gray', colorHex: '#808080', image: 'https://cdn.abacus.ai/images/a53e2224-6681-424d-b6d6-4a8dc5766361.png' },
    ],
    printArea: { x: 0.25, y: 0.22, width: 0.50, height: 0.42 },
  },
  {
    id: 'hoodie',
    labelKey: 'dtf.hoodie',
    variants: [
      { color: 'White', colorHex: '#FFFFFF', image: 'https://cdn.abacus.ai/images/d7841e4c-d009-4fa2-add0-bc22ab01968b.png' },
      { color: 'Black', colorHex: '#1a1a1a', image: 'https://cdn.abacus.ai/images/b4771f7f-9218-459d-8ceb-87e8661d5211.png' },
      { color: 'Navy', colorHex: '#1B2A4A', image: 'https://cdn.abacus.ai/images/852769e8-4428-4c46-8f15-620abd0e72b5.png' },
    ],
    printArea: { x: 0.22, y: 0.25, width: 0.56, height: 0.38 },
  },
];

/* ── Hook to load an HTMLImageElement from URL ────────── */
function useImage(url: string): [HTMLImageElement | null, boolean] {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) { setLoading(false); return; }
    setLoading(true);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { setImage(img); setLoading(false); };
    img.onerror = () => setLoading(false);
    img.src = url;
    return () => { img.onload = null; img.onerror = null; };
  }, [url]);

  return [image, loading];
}

/* ── Main Editor Component ────────────────────────────── */
export function MockupEditor() {
  const { t } = useLanguage();

  // Product & color state
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [selectedVariant, setSelectedVariant] = useState(products[0].variants[0]);

  // Design state
  const [designUrl, setDesignUrl] = useState<string | null>(null);
  const [designName, setDesignName] = useState('');

  // ELEV8 ready-made designs (fetched from admin-managed library)
  const [designs, setDesigns] = useState<DtfDesign[]>([]);
  const [designsLoading, setDesignsLoading] = useState(true);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);

  // Canvas sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 667 });

  // Konva refs
  const stageRef = useRef<Konva.Stage>(null);
  const designRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Design transform
  const [designAttrs, setDesignAttrs] = useState({ x: 0, y: 0, width: 150, height: 150, rotation: 0, scaleX: 1, scaleY: 1 });
  const [isSelected, setIsSelected] = useState(false);
  const [designScale, setDesignScale] = useState(1);

  // Load images
  const [mockupImg] = useImage(selectedVariant.image);
  const [designImg] = useImage(designUrl ?? '');

  /* ── Fetch ELEV8 ready-made designs ─────────────── */
  useEffect(() => {
    let mounted = true;
    fetch('/api/dtf-designs')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && Array.isArray(data)) setDesigns(data);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setDesignsLoading(false); });
    return () => { mounted = false; };
  }, []);

  /* ── Responsive canvas ─────────────────────────── */
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      const w = Math.min(containerRef.current.offsetWidth, 600);
      const h = w * (1200 / 896);
      setCanvasSize({ width: w, height: h });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  /* ── Attach transformer when selected ──────────── */
  useEffect(() => {
    if (isSelected && designRef.current && transformerRef.current) {
      transformerRef.current.nodes([designRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, designImg]);

  /* ── Center design when first uploaded ─────────── */
  useEffect(() => {
    if (designImg) {
      const pa = selectedProduct.printArea;
      const areaW = canvasSize.width * pa.width;
      const areaH = canvasSize.height * pa.height;
      const areaX = canvasSize.width * pa.x;
      const areaY = canvasSize.height * pa.y;

      // Fit design inside print area
      const ratio = Math.min(areaW / designImg.width, areaH / designImg.height) * 0.7;
      const dW = designImg.width * ratio;
      const dH = designImg.height * ratio;

      setDesignAttrs({
        x: areaX + (areaW - dW) / 2,
        y: areaY + (areaH - dH) / 2,
        width: dW,
        height: dH,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      });
      setDesignScale(1);
      setIsSelected(true);
    }
  }, [designImg, selectedProduct, canvasSize]);

  /* ── Select a ready-made ELEV8 design ──────────── */
  const selectDesign = (d: DtfDesign) => {
    setSelectedDesignId(d.id);
    setDesignName(d.name);
    setDesignUrl(d.imageUrl);
  };

  /* ── Product change handler ────────────────────── */
  const handleProductChange = (p: ProductType) => {
    setSelectedProduct(p);
    setSelectedVariant(p.variants[0]);
  };

  /* ── Scale controls ────────────────────────────── */
  const adjustScale = useCallback((delta: number) => {
    setDesignScale((prev) => {
      const next = Math.max(0.2, Math.min(3, prev + delta));
      if (designRef.current) {
        designRef.current.scaleX(next);
        designRef.current.scaleY(next);
        designRef.current.getLayer()?.batchDraw();
      }
      return next;
    });
  }, []);

  /* ── Rotate control ────────────────────────────── */
  const rotate90 = useCallback(() => {
    if (designRef.current) {
      const cur = designRef.current.rotation();
      designRef.current.rotation(cur + 90);
      designRef.current.getLayer()?.batchDraw();
    }
  }, []);

  /* ── Remove design ─────────────────────────────── */
  const removeDesign = () => {
    setDesignUrl(null);
    setDesignName('');
    setSelectedDesignId(null);
    setIsSelected(false);
  };

  /* ── Download mockup ───────────────────────────── */
  const downloadMockup = () => {
    if (!stageRef.current) return;
    setIsSelected(false);
    setTimeout(() => {
      const uri = stageRef.current?.toDataURL({ pixelRatio: 2 });
      if (uri) {
        const a = document.createElement('a');
        a.download = `ELEV8-DTF-${selectedProduct.id}-mockup.png`;
        a.href = uri;
        a.click();
      }
      setIsSelected(true);
    }, 100);
  };

  // Print area highlight (visual guide)
  const pa = selectedProduct.printArea;
  const printAreaRect = {
    x: canvasSize.width * pa.x,
    y: canvasSize.height * pa.y,
    width: canvasSize.width * pa.width,
    height: canvasSize.height * pa.height,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* ── Left Panel: Controls ─────────────────── */}
      <div className="lg:w-[340px] space-y-6 flex-shrink-0">

        {/* Product Type */}
        <div>
          <label className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3 block">{t('dtf.selectProduct')}</label>
          <div className="grid grid-cols-2 gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProductChange(p)}
                className={`px-4 py-3 text-[13px] font-medium transition-all duration-200 ${
                  selectedProduct.id === p.id
                    ? 'bg-[#32FF6A] text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {t(p.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3 block">{t('dtf.selectColor')}</label>
          <div className="flex gap-3">
            {selectedProduct.variants.map((v) => (
              <button
                key={v.color}
                onClick={() => setSelectedVariant(v)}
                className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                  selectedVariant.color === v.color ? 'border-[#32FF6A] scale-110' : 'border-white/20 hover:border-white/40'
                }`}
                style={{ backgroundColor: v.colorHex }}
                title={v.color}
              />
            ))}
          </div>
        </div>

        {/* Select ELEV8 Design */}
        <div>
          <label className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3 block">{t('dtf.selectDesign')}</label>
          {designsLoading ? (
            <div className="flex items-center gap-2 text-white/40 text-[13px] py-6 justify-center">
              <Loader2 size={16} className="animate-spin" /> {t('dtf.loadingDesigns')}
            </div>
          ) : designs.length === 0 ? (
            <div className="flex flex-col items-center justify-center border border-white/10 rounded-lg p-6 text-center">
              <Palette size={22} className="text-white/20 mb-2" />
              <span className="text-[13px] text-white/40">{t('dtf.noDesigns')}</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {designs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => selectDesign(d)}
                  title={d.name}
                  className={`relative aspect-square bg-white rounded-md overflow-hidden border-2 transition-all duration-200 ${
                    selectedDesignId === d.id ? 'border-[#32FF6A]' : 'border-transparent hover:border-white/30'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.imageUrl} alt={d.name} className="w-full h-full object-contain p-1.5" />
                  {selectedDesignId === d.id && (
                    <span className="absolute top-1 right-1 bg-[#32FF6A] text-black rounded-full p-0.5">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {designName && (
            <div className="mt-3 flex items-center justify-between bg-white/5 rounded px-3 py-2">
              <span className="text-[12px] text-white/60 truncate">{designName}</span>
              <button onClick={removeDesign} className="text-white/30 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Design Controls */}
        {designUrl && (
          <div>
            <label className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3 block">{t('dtf.adjustDesign')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => adjustScale(0.1)} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-[12px] transition-colors">
                <ZoomIn size={14} /> {t('dtf.zoomIn')}
              </button>
              <button onClick={() => adjustScale(-0.1)} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-[12px] transition-colors">
                <ZoomOut size={14} /> {t('dtf.zoomOut')}
              </button>
              <button onClick={rotate90} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-[12px] transition-colors">
                <RotateCw size={14} /> {t('dtf.rotate')}
              </button>
              <button onClick={removeDesign} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 text-[12px] transition-colors">
                <Trash2 size={14} /> {t('dtf.remove')}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Move size={12} className="text-white/30" />
              <span className="text-[11px] text-white/30">{t('dtf.dragHint')}</span>
            </div>
          </div>
        )}

        {/* Download */}
        {designUrl && (
          <button
            onClick={downloadMockup}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#32FF6A] text-black font-medium text-[13px] uppercase tracking-[0.1em] hover:bg-[#2ae85d] transition-colors"
          >
            <Download size={16} /> {t('dtf.downloadMockup')}
          </button>
        )}
      </div>

      {/* ── Right Panel: Canvas Preview ──────────── */}
      <div className="flex-1 min-w-0">
        <div ref={containerRef} className="relative bg-white rounded-lg overflow-hidden shadow-2xl shadow-black/40" style={{ maxWidth: 600, margin: '0 auto' }}>
          <Stage
            ref={stageRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onClick={(e) => {
              if (e.target === e.target.getStage()) setIsSelected(false);
            }}
          >
            <Layer>
              {/* Mockup background */}
              {mockupImg && (
                <KonvaImage
                  image={mockupImg}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  listening={false}
                />
              )}

              {/* Print area guide (dashed) */}
              {!designUrl && (
                <Rect
                  {...printAreaRect}
                  stroke="#32FF6A"
                  strokeWidth={1.5}
                  dash={[6, 4]}
                  opacity={0.4}
                  cornerRadius={4}
                  listening={false}
                />
              )}

              {/* Uploaded design */}
              {designImg && (
                <KonvaImage
                  ref={designRef}
                  image={designImg}
                  x={designAttrs.x}
                  y={designAttrs.y}
                  width={designAttrs.width}
                  height={designAttrs.height}
                  draggable
                  onClick={() => setIsSelected(true)}
                  onTap={() => setIsSelected(true)}
                  onDragEnd={(e) => {
                    setDesignAttrs((prev) => ({
                      ...prev,
                      x: e.target.x(),
                      y: e.target.y(),
                    }));
                  }}
                  onTransformEnd={() => {
                    const node = designRef.current;
                    if (!node) return;
                    setDesignAttrs({
                      x: node.x(),
                      y: node.y(),
                      width: node.width(),
                      height: node.height(),
                      rotation: node.rotation(),
                      scaleX: node.scaleX(),
                      scaleY: node.scaleY(),
                    });
                    setDesignScale(node.scaleX());
                  }}
                />
              )}

              {/* Transformer for resize / rotate handles */}
              {isSelected && designImg && (
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={true}
                  enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                  borderStroke="#32FF6A"
                  borderStrokeWidth={2}
                  anchorFill="#32FF6A"
                  anchorStroke="#000"
                  anchorSize={10}
                  anchorCornerRadius={2}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 20 || newBox.height < 20) return oldBox;
                    return newBox;
                  }}
                />
              )}
            </Layer>
          </Stage>

          {/* Upload prompt overlay */}
          {!designUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Palette size={32} className="text-[#32FF6A]/40 mx-auto mb-2" />
                <p className="text-[13px] text-gray-500 font-medium">{t('dtf.selectPrompt')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Scale indicator */}
        {designUrl && (
          <div className="text-center mt-3">
            <span className="text-[11px] text-white/30 uppercase tracking-wider">
              {t('dtf.scale')}: {Math.round(designScale * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
