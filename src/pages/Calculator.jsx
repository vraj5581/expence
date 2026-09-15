import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import { apiService } from '../services/api';

const Calculator = () => {
  // Mode: 'dimensions' (L, W, H) or 'direct' (Decal & Cutting directly)
  const [inputMode, setInputMode] = useState('dimensions');

  // Dimension inputs (in inches)
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  // Direct inputs (in inches)
  const [directDecal, setDirectDecal] = useState('');
  const [directCutting, setDirectCutting] = useState('');

  // Extra inches allowance (added to Decal and Cutting)
  const [extraDecal, setExtraDecal] = useState('');
  const [extraCutting, setExtraCutting] = useState('');

  // GSM & Fluting inputs
  const [gsm1, setGsm1] = useState(''); // Decal top liner (auto blank)
  const [gsm2, setGsm2] = useState(''); // Decal fluting paper (auto blank)
  const [gsm3, setGsm3] = useState('230'); // Cutting / inner paper (default 230)
  const [fluting, setFluting] = useState('40'); // Fluting factor / percentage (default 40)

  // Formula method:
  // 'takeup' -> Standard Box Flute Take-up Ratio: GSM 1 + (GSM 2 * (1 + fluting/100))
  // 'literal' -> Literal as typed: (GSM 1 * GSM 2 + fluting)
  // 'additive' -> Sum + fluting: (GSM 1 + GSM 2 + fluting)
  const [formulaMode, setFormulaMode] = useState('takeup');

  // Collapsible drawers for secondary tools to keep mobile super clean
  const [showBatchTools, setShowBatchTools] = useState(false);
  const [showFormulaSteps, setShowFormulaSteps] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Batch production fields
  const [batchQuantity, setBatchQuantity] = useState('1000');
  const [ratePerKg, setRatePerKg] = useState('');
  const [boxName, setBoxName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [lastSavedId, setLastSavedId] = useState(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [printMode, setPrintMode] = useState('all'); // 'all' | 'saved' | 'current'

  // Calculation History in localStorage
  const [savedHistory, setSavedHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('shukan_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Search, filter, and sort states for Saved Box Calculations
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('all'); // 'all' | 'today' | '7days' | 'month'
  const [historySort, setHistorySort] = useState('newest'); // 'newest' | 'oldest' | 'name' | 'weight_desc' | 'weight_asc'

  // Filtered & sorted history items for display and filter-wise print
  const filteredHistory = useMemo(() => {
    let result = [...savedHistory];

    // Text search (Box name, Decal, Cutting, GSM)
    if (historySearch.trim()) {
      const q = historySearch.trim().toLowerCase();
      result = result.filter((item) => {
        const title = (item.title || '').toLowerCase();
        const decal = String(item.decalSize || '');
        const cutting = String(item.cuttingSize || '');
        const gsm = `${item.gsm1 || ''}/${item.gsm2 || ''}/${item.gsm3 || ''}`.toLowerCase();
        const weight = String(item.totalWeightGrams || '');
        return (
          title.includes(q) ||
          decal.includes(q) ||
          cutting.includes(q) ||
          gsm.includes(q) ||
          weight.includes(q)
        );
      });
    }

    // Date range filter
    if (historyDateFilter !== 'all') {
      const now = new Date();
      result = result.filter((item) => {
        if (!item.date) return false;
        const itemDate = new Date(item.date);
        if (historyDateFilter === 'today') {
          return itemDate.toDateString() === now.toDateString();
        }
        if (historyDateFilter === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return itemDate >= sevenDaysAgo;
        }
        if (historyDateFilter === 'month') {
          return (
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear()
          );
        }
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (historySort === 'oldest') {
        return new Date(a.date || 0) - new Date(b.date || 0);
      }
      if (historySort === 'name') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (historySort === 'weight_desc') {
        return (parseFloat(b.totalWeightGrams) || 0) - (parseFloat(a.totalWeightGrams) || 0);
      }
      if (historySort === 'weight_asc') {
        return (parseFloat(a.totalWeightGrams) || 0) - (parseFloat(b.totalWeightGrams) || 0);
      }
      // default: newest first
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    return result;
  }, [savedHistory, historySearch, historyDateFilter, historySort]);

  // Numeric parsers
  const parsedLength = parseFloat(length) || 0;
  const parsedWidth = parseFloat(width) || 0;
  const parsedHeight = parseFloat(height) || 0;
  const parsedDirectDecal = parseFloat(directDecal) || 0;
  const parsedDirectCutting = parseFloat(directCutting) || 0;
  const parsedExtraDecal = parseFloat(extraDecal) || 0;
  const parsedExtraCutting = parseFloat(extraCutting) || 0;
  const parsedGsm1 = parseFloat(gsm1) || 0;
  const parsedGsm2 = parseFloat(gsm2) || 0;
  const parsedGsm3 = parseFloat(gsm3) || 0;
  const parsedFluting = parseFloat(fluting) || 0;
  const parsedQty = parseInt(batchQuantity, 10) || 1;
  const parsedRate = parseFloat(ratePerKg) || 0;

  // Rule 1: width + height + extra = decal size
  const decalSize = useMemo(() => {
    if (inputMode === 'direct') return parsedDirectDecal;
    const base = (parsedWidth > 0 || parsedHeight > 0) ? (parsedWidth + parsedHeight) : 0;
    return base > 0 ? parseFloat((base + parsedExtraDecal).toFixed(2)) : 0;
  }, [inputMode, parsedDirectDecal, parsedWidth, parsedHeight, parsedExtraDecal]);

  // Rule 2: length + width + extra = cutting size
  const cuttingSize = useMemo(() => {
    if (inputMode === 'direct') return parsedDirectCutting;
    const base = (parsedLength > 0 || parsedWidth > 0) ? (parsedLength + parsedWidth) : 0;
    return base > 0 ? parseFloat((base + parsedExtraCutting).toFixed(2)) : 0;
  }, [inputMode, parsedDirectCutting, parsedLength, parsedWidth, parsedExtraCutting]);

  // Effective Liner GSM calculation based on selected formula mode
  const { linerEffectiveGsm, formulaGsmLabel } = useMemo(() => {
    if (formulaMode === 'takeup') {
      const fluteMultiplier = 1 + (parsedFluting / 100);
      const effective = parsedGsm1 + (parsedGsm2 * fluteMultiplier);
      return {
        linerEffectiveGsm: effective,
        formulaGsmLabel: `${parsedGsm1} + (${parsedGsm2} × 1.${parsedFluting < 10 ? '0' + parsedFluting : parsedFluting})`
      };
    } else if (formulaMode === 'literal') {
      const effective = (parsedGsm1 * parsedGsm2) + parsedFluting;
      return {
        linerEffectiveGsm: effective,
        formulaGsmLabel: `(${parsedGsm1} × ${parsedGsm2} + ${parsedFluting})`
      };
    } else {
      const effective = parsedGsm1 + parsedGsm2 + parsedFluting;
      return {
        linerEffectiveGsm: effective,
        formulaGsmLabel: `${parsedGsm1} + ${parsedGsm2} + ${parsedFluting}`
      };
    }
  }, [formulaMode, parsedGsm1, parsedGsm2, parsedFluting]);

  // Rule 3: liner weight = {decal * cutting * ([gsm factor])} / 1550
  const linerWeightGrams = useMemo(() => {
    if (!decalSize || !cuttingSize || !linerEffectiveGsm) return 0;
    return (decalSize * cuttingSize * linerEffectiveGsm) / 1550;
  }, [decalSize, cuttingSize, linerEffectiveGsm]);

  // Rule 4: paper weight = {decal * cutting * ([gsm 3])} / 1550
  const paperWeightGrams = useMemo(() => {
    if (!decalSize || !cuttingSize || !parsedGsm3) return 0;
    return (decalSize * cuttingSize * parsedGsm3) / 1550;
  }, [decalSize, cuttingSize, parsedGsm3]);

  // Rule 5: total weight = liner weight + paper weight
  const totalWeightGrams = useMemo(() => {
    return linerWeightGrams + paperWeightGrams;
  }, [linerWeightGrams, paperWeightGrams]);

  const linerWeightKg = linerWeightGrams / 1000;
  const paperWeightKg = paperWeightGrams / 1000;
  const totalWeightKg = totalWeightGrams / 1000;

  // Batch calculations
  const totalBatchWeightKg = totalWeightKg * parsedQty;
  const batchPaperCost = parsedRate > 0 ? totalBatchWeightKg * parsedRate : 0;

  const handleSwitchMode = (mode) => {
    setInputMode(mode);
    if (mode === 'direct') {
      if (decalSize > 0 && !directDecal) setDirectDecal(decalSize.toString());
      if (cuttingSize > 0 && !directCutting) setDirectCutting(cuttingSize.toString());
    }
  };

  const handleReset = () => {
    setLength('');
    setWidth('');
    setHeight('');
    setDirectDecal('');
    setDirectCutting('');
    setExtraDecal('');
    setExtraCutting('');
    setGsm1('');
    setGsm2('');
    setGsm3('230');
    setFluting('40');
    setBoxName('');
    setRatePerKg('');
    toast.info('Calculator reset', { autoClose: 900, theme: 'light' });
  };

  // Fetch saved calculations from MySQL database
  const fetchFromDb = async () => {
    setIsLoadingDb(true);
    try {
      const res = await apiService.getCalculations();
      if (res && res.success && Array.isArray(res.calculations)) {
        const formatted = res.calculations.map(c => ({
          id: c.id,
          date: c.created_at,
          title: c.boxName || `Box ${c.decalSize}" × ${c.cuttingSize}"`,
          mode: c.inputMode,
          length: parseFloat(c.length) || 0,
          width: parseFloat(c.width) || 0,
          height: parseFloat(c.height) || 0,
          decalSize: parseFloat(c.decalSize) || 0,
          cuttingSize: parseFloat(c.cuttingSize) || 0,
          gsm1: parseFloat(c.gsm1) || '',
          gsm2: parseFloat(c.gsm2) || '',
          gsm3: parseFloat(c.gsm3) || '230',
          fluting: parseFloat(c.fluting) || 40,
          formulaMode: c.formulaMode || 'takeup',
          linerWeightGrams: parseFloat(c.linerWeight || 0).toFixed(2),
          paperWeightGrams: parseFloat(c.paperWeight || 0).toFixed(2),
          totalWeightGrams: parseFloat(c.totalWeight || 0).toFixed(2),
          totalWeightKg: (parseFloat(c.totalWeight || 0) / 1000).toFixed(4),
          qty: parseInt(c.batchQuantity) || 1,
          batchWeightKg: parseFloat(c.batchWeight || 0).toFixed(2),
          rate: parseFloat(c.paperRate || 0),
          cost: parseFloat(c.totalCost || 0) > 0 ? parseFloat(c.totalCost).toFixed(2) : null
        }));
        setSavedHistory(formatted);
        localStorage.setItem('shukan_calc_history', JSON.stringify(formatted));
      }
    } catch (err) {
      console.warn('Could not fetch calculations from database:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchFromDb();
  }, []);

  const handleSaveToDatabase = async () => {
    if (totalWeightGrams <= 0) {
      toast.warning('Please enter valid dimensions and calculate first', { theme: 'light' });
      return;
    }

    const calcId = 'CALC-' + Date.now();
    const entryTitle = boxName.trim() || `Box ${decalSize}" × ${cuttingSize}"`;

    const payload = {
      id: calcId,
      boxName: entryTitle,
      inputMode,
      length: parsedLength,
      width: parsedWidth,
      height: parsedHeight,
      extraDecal: parsedExtraDecal,
      extraCutting: parsedExtraCutting,
      decalSize,
      cuttingSize,
      gsm1: parsedGsm1,
      gsm2: parsedGsm2,
      gsm3: parsedGsm3,
      fluting: parsedFluting,
      formulaMode,
      linerWeight: linerWeightGrams,
      paperWeight: paperWeightGrams,
      totalWeight: totalWeightGrams,
      batchQuantity: parsedQty,
      batchWeight: totalBatchWeightKg,
      paperRate: parsedRate,
      totalCost: batchPaperCost
    };

    const newHistoryItem = {
      id: calcId,
      date: new Date().toISOString(),
      title: entryTitle,
      mode: inputMode,
      length: parsedLength,
      width: parsedWidth,
      height: parsedHeight,
      extraDecal: parsedExtraDecal,
      extraCutting: parsedExtraCutting,
      decalSize,
      cuttingSize,
      gsm1: parsedGsm1,
      gsm2: parsedGsm2,
      gsm3: parsedGsm3,
      fluting: parsedFluting,
      formulaMode,
      linerWeightGrams: linerWeightGrams.toFixed(2),
      paperWeightGrams: paperWeightGrams.toFixed(2),
      totalWeightGrams: totalWeightGrams.toFixed(2),
      totalWeightKg: totalWeightKg.toFixed(4),
      qty: parsedQty,
      batchWeightKg: totalBatchWeightKg.toFixed(2),
      rate: parsedRate,
      cost: batchPaperCost > 0 ? batchPaperCost.toFixed(2) : null
    };

    // ⚡ Instant Optimistic Update: Reflect immediately in UI on click
    const updated = [newHistoryItem, ...savedHistory.filter(h => h.id !== calcId).slice(0, 49)];
    setSavedHistory(updated);
    setJustSaved(true);
    setLastSavedId(calcId);
    setTimeout(() => setJustSaved(false), 2000);
    try {
      localStorage.setItem('shukan_calc_history', JSON.stringify(updated));
    } catch (e) {}

    // Background HTTP Persistence
    setIsSaving(true);
    (async () => {
      try {
        const res = await apiService.saveCalculation(payload);
        if (res && res.success) {
          toast.success('Calculation saved successfully!', { theme: 'light', autoClose: 1000 });
        } else {
          toast.warning(res?.message || 'Saved locally (DB sync pending)', { theme: 'light', autoClose: 1200 });
        }
      } catch (e) {
        toast.info('Saved locally', { theme: 'light', autoClose: 1000 });
      } finally {
        setIsSaving(false);
      }
    })();
  };

  const handleDeleteHistory = async (id) => {
    const updated = savedHistory.filter((item) => item.id !== id);
    setSavedHistory(updated);
    localStorage.setItem('shukan_calc_history', JSON.stringify(updated));
    try {
      await apiService.deleteCalculation(id);
      toast.info('Deleted from saved list', { autoClose: 900, theme: 'light' });
    } catch (e) {}
  };

  const handleLoadHistory = (item) => {
    if (item.mode === 'dimensions' && item.length && item.width && item.height) {
      setInputMode('dimensions');
      setLength(item.length.toString());
      setWidth(item.width.toString());
      setHeight(item.height.toString());
      setExtraDecal(item.extraDecal ? item.extraDecal.toString() : '');
      setExtraCutting(item.extraCutting ? item.extraCutting.toString() : '');
    } else {
      setInputMode('direct');
      setDirectDecal(item.decalSize.toString());
      setDirectCutting(item.cuttingSize.toString());
      setExtraDecal('');
      setExtraCutting('');
    }

    setGsm1(item.gsm1 ? item.gsm1.toString() : '');
    setGsm2(item.gsm2 ? item.gsm2.toString() : '');
    setGsm3(item.gsm3 ? item.gsm3.toString() : '230');
    setFluting((item.fluting || 40).toString());
    if (item.formulaMode) setFormulaMode(item.formulaMode);
    if (item.title) setBoxName(item.title);
    if (item.qty) setBatchQuantity(item.qty.toString());
    if (item.rate) setRatePerKg(item.rate.toString());

    setShowHistory(false);
    toast.success('Loaded', { autoClose: 900, theme: 'light' });
  };

  const copyTextToClipboard = async (text) => {
    // 1. Modern navigator.clipboard API (requires HTTPS or localhost)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('navigator.clipboard write failed, using fallback:', err);
      }
    }

    // 2. Cross-browser fallback using hidden textarea + document.execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    } catch (err) {
      console.error('Copy fallback failed:', err);
      return false;
    }
  };

  const handleCopySummary = async () => {
    if (totalWeightGrams <= 0) {
      toast.warning('Please enter dimensions first to calculate and copy', { theme: 'light' });
      return;
    }

    const titleLine = boxName.trim() ? `📦 *${boxName.trim()}*\n` : '📦 *BOX WEIGHT CALCULATION*\n';
    const dimLine = inputMode === 'dimensions'
      ? `• Dimensions: ${parsedLength}" × ${parsedWidth}" × ${parsedHeight}"\n`
      : '';
    const decalExtraDetail = (inputMode === 'dimensions' && parsedExtraDecal > 0) ? ` (${parsedWidth}" + ${parsedHeight}" + ${parsedExtraDecal}" extra)` : '';
    const cuttingExtraDetail = (inputMode === 'dimensions' && parsedExtraCutting > 0) ? ` (${parsedLength}" + ${parsedWidth}" + ${parsedExtraCutting}" extra)` : '';

    const summary = 
`${titleLine}━━━━━━━━━━━━━━━━━
${dimLine}• Decal (W+H): *${decalSize}"*${decalExtraDetail}
• Cutting (L+W): *${cuttingSize}"*${cuttingExtraDetail}
• GSM: ${parsedGsm1} / ${parsedGsm2} / ${parsedGsm3} | Fluting: ${parsedFluting}%
━━━━━━━━━━━━━━━━━
⚖️ *WEIGHT RESULT:*
• Liner Weight: *${linerWeightGrams.toFixed(2)} g* (${linerWeightKg.toFixed(4)} kg)
• Paper Weight: *${paperWeightGrams.toFixed(2)} g* (${paperWeightKg.toFixed(4)} kg)
⭐ *TOTAL LINER + DECAL WEIGHT: ${totalWeightGrams.toFixed(2)} g (${totalWeightKg.toFixed(4)} kg)*
━━━━━━━━━━━━━━━━━
_Shukan Packaging_`;

    const copied = await copyTextToClipboard(summary);
    if (copied) {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2200);
      toast.success('Calculation summary copied to clipboard!', { theme: 'light', autoClose: 2000 });
    } else {
      toast.error('Could not copy automatically. Please copy manually.', { theme: 'light' });
    }
  };

  const handlePrint = (mode = 'all') => {
    setPrintMode(mode);
    const originalTitle = document.title;
    if (mode === 'saved') {
      const searchSuffix = historySearch.trim() ? `_${historySearch.trim().replace(/\s+/g, '_')}` : '';
      document.title = `Saved_Calculations${searchSuffix}_Report`;
    } else {
      document.title = (boxName.trim() ? boxName.trim().replace(/\s+/g, '_') : 'Box_Weight') + '_Report';
    }
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
        setPrintMode('all');
      }, 1000);
    }, 250);
  };

  return (
    <div>
      {/* Screen Interactive View (Hidden during Print) */}
      <div className="print:hidden max-w-6xl mx-auto space-y-4 sm:space-y-5 pb-24 lg:pb-12">
      {/* 1. Header Bar: Compact & Clean on Mobile */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200/80 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#002B49] text-[#c69255] flex items-center justify-center shrink-0 shadow-xs">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-[#002B49] tracking-tight truncate leading-tight">
              Box Weight Calculator
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-xs transition cursor-pointer whitespace-nowrap focus:outline-none"
            title="Reset form"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className={`inline-flex items-center justify-center px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap focus:outline-none active:scale-95 shadow-md ${
              justCopied
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white'
            }`}
            title="Copy calculation summary"
          >
            {justCopied ? (
              <>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Mode Selector: 3 Tabs (Box Size | Sheet Size | Saved Calculations) */}
      <div className="bg-slate-200/70 p-1 sm:p-1.5 rounded-2xl border border-slate-300/60 backdrop-blur-xs grid grid-cols-3 gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold">
        <button
          type="button"
          onClick={() => handleSwitchMode('dimensions')}
          className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 focus:outline-none select-none ${
            inputMode === 'dimensions'
              ? 'bg-white text-[#002B49] shadow-md font-black border border-slate-200/80'
              : 'text-slate-600 hover:text-[#002B49] hover:bg-white/50'
          }`}
        >
          <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${inputMode === 'dimensions' ? 'text-[#c69255]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="truncate">Box Size</span>
          <span className="hidden sm:inline text-[10px] font-medium text-slate-400">(L×W×H)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('direct')}
          className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 focus:outline-none select-none ${
            inputMode === 'direct'
              ? 'bg-white text-[#002B49] shadow-md font-black border border-slate-200/80'
              : 'text-slate-600 hover:text-[#002B49] hover:bg-white/50'
          }`}
        >
          <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${inputMode === 'direct' ? 'text-[#c69255]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate">Sheet Size</span>
          <span className="hidden sm:inline text-[10px] font-medium text-slate-400">(Decal & Cutting)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('saved')}
          className={`py-2 sm:py-2.5 px-1.5 sm:px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 focus:outline-none select-none ${
            inputMode === 'saved'
              ? 'bg-white text-[#002B49] shadow-md font-black border border-slate-200/80'
              : 'text-slate-600 hover:text-[#002B49] hover:bg-white/50'
          }`}
        >
          <svg className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${inputMode === 'saved' ? 'text-[#c69255]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
          <span className="truncate">Saved</span>
          <span className="hidden sm:inline">Calculations</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black transition-colors ${
            inputMode === 'saved' ? 'bg-[#c69255] text-white shadow-2xs' : 'bg-slate-300 text-slate-700'
          }`}>
            {savedHistory.length}
          </span>
        </button>
      </div>

      {/* 3. Conditional Content: Dedicated Saved Data Table OR 2-Column Calculator */}
      {inputMode === 'saved' ? (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-xs sm:text-base font-black text-[#002B49] uppercase tracking-wide truncate">
                  Saved Calculations
                </h2>
                <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md bg-[#002B49] text-white text-[10px] sm:text-xs font-black shrink-0">
                  {filteredHistory.length}{filteredHistory.length !== savedHistory.length ? ` / ${savedHistory.length}` : ''}
                </span>
              </div>
            </div>

            {/* Action Buttons: Just '+' and 'Print' */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSwitchMode('dimensions')}
                className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white shadow-xs transition cursor-pointer focus:outline-none active:scale-95 shrink-0"
                title="New Calculation (+)"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => handlePrint('saved')}
                className="inline-flex items-center px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#002B49] hover:bg-[#001D33] text-white font-bold text-[11px] sm:text-xs shadow-xs transition gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap focus:outline-none active:scale-95 shrink-0"
                title="Print Filtered Calculations Table"
              >
                <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print{filteredHistory.length !== savedHistory.length ? ` (${filteredHistory.length})` : ''}</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar (Mobile Optimized) */}
          <div className="bg-slate-50/90 p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 space-y-2 sm:space-y-2.5">
            {/* Search Input Box (Full Width) */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search by box name, size, or GSM..."
                className="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#002B49] placeholder-slate-400 focus:outline-none focus:border-[#002B49] transition shadow-2xs"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch('')}
                  className="absolute inset-y-0 right-0 pr-2 sm:pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
                  title="Clear search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter and Sort Controls (Clean Flow, Never Clips) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Filter Dropdown */}
              <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <select
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="month">This Month</option>
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <select
                  value={historySort}
                  onChange={(e) => setHistorySort(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-1"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="weight_desc">Weight ↓</option>
                  <option value="weight_asc">Weight ↑</option>
                </select>
              </div>

              {/* Reset Filter Button */}
              {(historySearch || historyDateFilter !== 'all' || historySort !== 'newest') && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryDateFilter('all');
                    setHistorySort('newest');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition cursor-pointer border border-rose-200/80 shadow-2xs focus:outline-none active:scale-95 whitespace-nowrap ml-auto"
                  title="Reset all filters"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {savedHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-xs font-bold text-slate-600">No saved calculations yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Calculate a box weight and click "Save" to view it here.</p>
              <button
                type="button"
                onClick={() => handleSwitchMode('dimensions')}
                className="mt-3 inline-flex items-center px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003860] text-white text-xs font-bold transition cursor-pointer shadow-xs focus:outline-none"
              >
                Go to Calculator
              </button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/60 rounded-2xl border border-slate-200/60 text-slate-400">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-400 shadow-2xs">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <p className="text-xs font-bold text-slate-700">No matching calculations found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No saved box matches "<span className="font-semibold text-slate-600">{historySearch}</span>". Try another term or date.
              </p>
              <button
                type="button"
                onClick={() => {
                  setHistorySearch('');
                  setHistoryDateFilter('all');
                  setHistorySort('newest');
                }}
                className="mt-3 inline-flex items-center px-3 py-1.5 rounded-xl bg-[#002B49] hover:bg-[#003860] text-white text-xs font-bold transition cursor-pointer shadow-2xs focus:outline-none"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            <div>
              {/* Mobile View: Clean Modern Cards (sm:hidden) */}
              <div className="sm:hidden space-y-3">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-2xs space-y-2.5"
                  >
                    {/* Card Header: Box Name, Date, and Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-black text-[#002B49] truncate">
                          {item.title}
                        </h3>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {item.date ? new Date(item.date).toLocaleDateString('en-GB') : ''}
                        </div>
                      </div>

                      {/* Edit and Delete Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadHistory(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#002B49] hover:bg-[#003860] text-white font-bold text-[11px] transition cursor-pointer shadow-xs active:scale-95 focus:outline-none"
                          title="Edit calculation"
                        >
                          <svg className="w-3 h-3 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteHistory(item.id)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200/80 transition-colors cursor-pointer active:scale-95 shadow-2xs focus:outline-none"
                          title="Delete calculation"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Decal, Cutting & GSM Pills */}
                    <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-bold border border-sky-200/60">
                        Decal: {item.decalSize}"
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200/60">
                        Cutting: {item.cuttingSize}"
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold border border-indigo-200/60" title="Top Liner / Fluting Paper / Bottom Paper GSM">
                        GSM: {item.gsm1 || '-'}/{item.gsm2 || '-'}/{item.gsm3 || '-'} {item.fluting ? `(${item.fluting}%)` : ''}
                      </span>
                    </div>

                    {/* 3-Column Weight Breakdown */}
                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-200/70 text-center">
                      <div className="bg-white rounded-xl p-2 border border-slate-200/60">
                        <div className="text-[9.5px] font-bold text-slate-400 uppercase">Liner Weight</div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">{item.linerWeightGrams} g</div>
                      </div>
                      <div className="bg-white rounded-xl p-2 border border-slate-200/60">
                        <div className="text-[9.5px] font-bold text-slate-400 uppercase">Paper Weight</div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">{item.paperWeightGrams} g</div>
                      </div>
                      <div className="bg-[#002B49]/5 rounded-xl p-2 border border-[#002B49]/15">
                        <div className="text-[9.5px] font-bold text-[#002B49] uppercase">Total Weight</div>
                        <div className="text-xs font-black text-[#002B49] mt-0.5">{item.totalWeightGrams} g</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Clean Table (hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px] uppercase font-black tracking-wider">
                      <th className="px-3.5 py-3">Box Name</th>
                      <th className="px-3 py-3 text-center">Decal</th>
                      <th className="px-3 py-3 text-center">Cutting</th>
                      <th className="px-3 py-3 text-center">GSM (L/F/P)</th>
                      <th className="px-3 py-3 text-right">Liner Weight</th>
                      <th className="px-3 py-3 text-right">Paper Weight</th>
                      <th className="px-3.5 py-3 text-right font-black text-[#002B49]">Total Weight</th>
                      <th className="px-3.5 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                        <td className="px-3.5 py-3 font-bold text-[#002B49] max-w-[180px] truncate">
                          <div className="truncate text-xs">{item.title}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {item.date ? new Date(item.date).toLocaleDateString('en-GB') : ''}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-700">{item.decalSize}"</td>
                        <td className="px-3 py-3 text-center font-bold text-slate-700">{item.cuttingSize}"</td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200/80 text-indigo-900 font-bold text-[11px]">
                            {item.gsm1 || '-'}/{item.gsm2 || '-'}/{item.gsm3 || '-'}
                          </span>
                          {item.fluting ? (
                            <div className="text-[9.5px] text-slate-400 font-medium mt-0.5">{item.fluting}% flute</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-right text-slate-700 font-semibold">{item.linerWeightGrams} g</td>
                        <td className="px-3 py-3 text-right text-slate-700 font-semibold">{item.paperWeightGrams} g</td>
                        <td className="px-3.5 py-3 text-right font-black text-[#002B49] whitespace-nowrap text-xs">
                          {item.totalWeightGrams} g
                        </td>
                        <td className="px-3.5 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleLoadHistory(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#002B49] text-white hover:bg-[#003860] font-bold text-[11px] transition cursor-pointer shadow-xs active:scale-95 focus:outline-none"
                              title="Edit calculation"
                            >
                              <svg className="w-3 h-3 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHistory(item.id)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200/80 transition-colors cursor-pointer active:scale-95 shadow-2xs focus:outline-none"
                              title="Delete calculation"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 3. Main Workspace: Focused Calculator (Box Size / Sheet Size) */
        <div className="max-w-xl mx-auto space-y-2.5 sm:space-y-3">
          {/* Main Dimensions Input Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-[11px] sm:text-xs font-black text-[#002B49] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c69255]"></span>
                {inputMode === 'dimensions' ? 'Step 1: Box Dimensions' : 'Step 1: Sheet Size'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Unit: Inches (")</span>
            </div>

            {/* Box / Order Name */}
            <div>
              <input
                type="text"
                value={boxName}
                onChange={(e) => setBoxName(e.target.value)}
                placeholder={inputMode === 'dimensions' ? "Box / Job Name (e.g. Master Carton 5-Ply)" : "Sheet / Job Name (e.g. Sheet 22×28)"}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-[#002B49] placeholder-slate-400 focus:bg-white focus:border-[#002B49] focus:outline-none transition"
              />
            </div>

            {/* Input fields based on mode */}
            {inputMode === 'dimensions' ? (
              <div className="space-y-2.5">
                {/* 3 Main Dimension Inputs */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="bg-slate-50/90 focus-within:bg-white focus-within:border-[#002B49] p-1.5 sm:p-2 rounded-lg border border-slate-200 transition text-center">
                    <span className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-tight">Length (L)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="0"
                      className="w-full text-center py-0.5 bg-transparent text-base sm:text-lg font-black text-[#002B49] placeholder-slate-300 focus:outline-none"
                    />
                    <span className="block text-[8.5px] text-slate-400">inch</span>
                  </div>

                  <div className="bg-slate-50/90 focus-within:bg-white focus-within:border-[#002B49] p-1.5 sm:p-2 rounded-lg border border-slate-200 transition text-center">
                    <span className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-tight">Width (W)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="0"
                      className="w-full text-center py-0.5 bg-transparent text-base sm:text-lg font-black text-[#002B49] placeholder-slate-300 focus:outline-none"
                    />
                    <span className="block text-[8.5px] text-slate-400">inch</span>
                  </div>

                  <div className="bg-slate-50/90 focus-within:bg-white focus-within:border-[#002B49] p-1.5 sm:p-2 rounded-lg border border-slate-200 transition text-center">
                    <span className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-tight">Height (H)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="0"
                      className="w-full text-center py-0.5 bg-transparent text-base sm:text-lg font-black text-[#002B49] placeholder-slate-300 focus:outline-none"
                    />
                    <span className="block text-[8.5px] text-slate-400">inch</span>
                  </div>
                </div>

                {/* Derived Sheet Size: Decal & Cutting with compact inline extra inches */}
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {/* Decal */}
                  <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-200/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black text-sky-900 uppercase">Decal</span>
                        <span className="text-[9px] text-sky-700 ml-1">(W+H)</span>
                      </div>
                      <span className="text-sm sm:text-base font-black text-sky-950">{decalSize}"</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-sky-200/60 text-[9.5px]">
                      <span className="font-bold text-sky-800 shrink-0">+Extra:</span>
                      <div className="flex items-center gap-1 justify-end flex-wrap">
                        {['0.5', '1'].map((val) => {
                          const isActive = extraDecal === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setExtraDecal(isActive ? '' : val)}
                              className={`px-1.5 py-0.2 rounded font-bold transition cursor-pointer ${
                                isActive
                                  ? 'bg-sky-700 text-white'
                                  : 'bg-white text-sky-800 border border-sky-200 hover:bg-sky-100'
                              }`}
                            >
                              +{val}"
                            </button>
                          );
                        })}
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          placeholder='+"'
                          value={extraDecal}
                          onChange={(e) => setExtraDecal(e.target.value)}
                          className="w-10 text-center py-0.2 px-0.5 font-bold rounded bg-white border border-sky-300 text-sky-950 placeholder-sky-300 focus:outline-none text-[10px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cutting */}
                  <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black text-amber-900 uppercase">Cutting</span>
                        <span className="text-[9px] text-amber-700 ml-1">(L+W)</span>
                      </div>
                      <span className="text-sm sm:text-base font-black text-amber-950">{cuttingSize}"</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-amber-200/60 text-[9.5px]">
                      <span className="font-bold text-amber-800 shrink-0">+Extra:</span>
                      <div className="flex items-center gap-1 justify-end flex-wrap">
                        {['0.5', '1'].map((val) => {
                          const isActive = extraCutting === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setExtraCutting(isActive ? '' : val)}
                              className={`px-1.5 py-0.2 rounded font-bold transition cursor-pointer ${
                                isActive
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              +{val}"
                            </button>
                          );
                        })}
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          placeholder='+"'
                          value={extraCutting}
                          onChange={(e) => setExtraCutting(e.target.value)}
                          className="w-10 text-center py-0.2 px-0.5 font-bold rounded bg-white border border-amber-300 text-amber-950 placeholder-amber-300 focus:outline-none text-[10px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Sheet Size Mode (Direct Decal & Cutting) */
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <div className="bg-slate-50/90 focus-within:bg-white focus-within:border-[#002B49] p-2 rounded-lg border border-slate-200 transition text-center">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-black text-[#002B49] uppercase">Decal Size</span>
                    <span className="text-[9px] text-slate-400">Roll Width</span>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={directDecal}
                    onChange={(e) => setDirectDecal(e.target.value)}
                    placeholder="0"
                    className="w-full text-center py-0.5 bg-transparent text-base sm:text-lg font-black text-[#002B49] placeholder-slate-300 focus:outline-none"
                  />
                  <div className="text-center text-[8.5px] text-slate-400">inches (")</div>
                </div>

                <div className="bg-slate-50/90 focus-within:bg-white focus-within:border-[#002B49] p-2 rounded-lg border border-slate-200 transition text-center">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-black text-[#002B49] uppercase">Cutting Size</span>
                    <span className="text-[9px] text-slate-400">Chop Length</span>
                  </div>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={directCutting}
                    onChange={(e) => setDirectCutting(e.target.value)}
                    placeholder="0"
                    className="w-full text-center py-0.5 bg-transparent text-base sm:text-lg font-black text-[#002B49] placeholder-slate-300 focus:outline-none"
                  />
                  <div className="text-center text-[8.5px] text-slate-400">inches (")</div>
                </div>
              </div>
            )}
          </div>

          {/* 4. GSM & Fluting Specifications Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-1.5 pb-1.5 border-b border-slate-100">
              <span className="text-[11px] sm:text-xs font-black text-[#002B49] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c69255]"></span>
                Step 2: GSM & Fluting
              </span>
              {/* Quick GSM Presets */}
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { label: '120/120/230', g1: '120', g2: '120', g3: '230' },
                  { label: '150/150/230', g1: '150', g2: '150', g3: '230' },
                  { label: '180/150/230', g1: '180', g2: '150', g3: '230' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setGsm1(preset.g1);
                      setGsm2(preset.g2);
                      setGsm3(preset.g3);
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-[#002B49] hover:text-white text-slate-700 text-[9px] font-bold transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Inputs in 1 Row */}
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              {/* GSM 1 */}
              <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-200 focus-within:border-[#002B49] focus-within:bg-white transition text-center">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight truncate">GSM 1</div>
                <input
                  type="number"
                  inputMode="numeric"
                  step="any"
                  min="0"
                  value={gsm1}
                  onChange={(e) => setGsm1(e.target.value)}
                  placeholder="0"
                  className="w-full text-center py-0.5 bg-transparent text-sm sm:text-base font-black text-[#002B49] placeholder-slate-300 focus:outline-none"
                />
                <div className="text-[8.5px] text-slate-400 truncate">Top Liner</div>
              </div>

              {/* GSM 2 */}
              <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-200 focus-within:border-[#002B49] focus-within:bg-white transition text-center">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight truncate">GSM 2</div>
                <input
                  type="number"
                  inputMode="numeric"
                  step="any"
                  min="0"
                  value={gsm2}
                  onChange={(e) => setGsm2(e.target.value)}
                  placeholder="0"
                  className="w-full text-center py-0.5 bg-transparent text-sm sm:text-base font-black text-[#002B49] placeholder-slate-300 focus:outline-none"
                />
                <div className="text-[8.5px] text-slate-400 truncate">Flute Paper</div>
              </div>

              {/* GSM 3 */}
              <div className="p-1.5 sm:p-2 rounded-lg bg-slate-50 border border-slate-200 focus-within:border-[#002B49] focus-within:bg-white transition text-center">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tight truncate">GSM 3</div>
                <input
                  type="number"
                  inputMode="numeric"
                  step="any"
                  min="0"
                  value={gsm3}
                  onChange={(e) => setGsm3(e.target.value)}
                  placeholder="230"
                  className="w-full text-center py-0.5 bg-transparent text-sm sm:text-base font-black text-[#002B49] placeholder-slate-300 focus:outline-none"
                />
                <div className="text-[8.5px] text-slate-400 truncate">Inner Paper</div>
              </div>

              {/* Fluting */}
              <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 focus-within:border-amber-500 focus-within:bg-white transition text-center">
                <div className="text-[9px] font-bold text-amber-900 uppercase tracking-tight truncate">Fluting</div>
                <input
                  type="number"
                  inputMode="numeric"
                  step="any"
                  min="0"
                  value={fluting}
                  onChange={(e) => setFluting(e.target.value)}
                  placeholder="40"
                  className="w-full text-center py-0.5 bg-transparent text-sm sm:text-base font-black text-[#002B49] placeholder-slate-300 focus:outline-none"
                />
                <div className="text-[8.5px] text-amber-800 font-semibold truncate">40%</div>
              </div>
            </div>
          </div>

          {/* 5. Clean Hero Result Card */}
          <div className="bg-gradient-to-br from-[#002B49] via-[#003459] to-[#001D33] text-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md border border-white/10 relative overflow-hidden space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-[#c69255] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c69255] animate-pulse"></span>
                Total Weight
              </span>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                {decalSize > 0 && cuttingSize > 0 ? `${decalSize}" × ${cuttingSize}"` : '0" × 0"'}
              </span>
            </div>

            {/* Main Result */}
            <div className="flex items-baseline justify-between flex-wrap gap-1">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {totalWeightGrams > 0 ? totalWeightGrams.toFixed(2) : '0.00'}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-[#c69255]">grams</span>
              </div>
              <div className="text-right">
                <span className="text-xs sm:text-sm font-black text-slate-200">
                  {totalWeightKg > 0 ? totalWeightKg.toFixed(4) : '0.0000'} kg
                </span>
                <span className="text-[9px] text-slate-400 block">per sheet / box</span>
              </div>
            </div>

            {/* Split Sub-Weights (Liner & Paper) */}
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-2 border-t border-white/15">
              <div className="bg-white/10 rounded-lg p-1.5 sm:p-2">
                <div className="text-[9px] font-bold text-slate-300 uppercase">3. Liner Weight</div>
                <div className="text-xs sm:text-sm font-black text-white mt-0.5">
                  {linerWeightGrams > 0 ? linerWeightGrams.toFixed(2) : '0.00'} <span className="text-[10px] font-normal text-slate-300">g</span>
                </div>
                <div className="text-[9px] text-[#c69255] font-semibold">
                  {linerWeightKg > 0 ? linerWeightKg.toFixed(4) : '0.0000'} kg
                </div>
              </div>

              <div className="bg-white/10 rounded-lg p-1.5 sm:p-2">
                <div className="text-[9px] font-bold text-slate-300 uppercase">4. Paper Weight</div>
                <div className="text-xs sm:text-sm font-black text-white mt-0.5">
                  {paperWeightGrams > 0 ? paperWeightGrams.toFixed(2) : '0.00'} <span className="text-[10px] font-normal text-slate-300">g</span>
                </div>
                <div className="text-[9px] text-emerald-400 font-semibold">
                  {paperWeightKg > 0 ? paperWeightKg.toFixed(4) : '0.0000'} kg
                </div>
              </div>
            </div>

            {/* Action Bar Inside Result Card: Copy and Save */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleCopySummary}
                className={`py-1.5 sm:py-2 px-2.5 rounded-lg font-bold text-xs shadow-xs transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 focus:outline-none ${
                  justCopied
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-[#c69255] to-[#b88548] hover:from-[#d4a359] hover:to-[#a67437] text-white'
                }`}
                title="Copy calculation summary"
              >
                {justCopied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy Summary</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveToDatabase}
                disabled={isSaving}
                className={`py-1.5 sm:py-2 px-2.5 rounded-lg font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-70 focus:outline-none ${
                  justSaved ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white'
                }`}
                title="Save to database"
              >
                {isSaving ? (
                  <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                ) : justSaved ? (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
                <span>{isSaving ? 'Saving...' : justSaved ? 'Saved!' : 'Save'}</span>
              </button>
            </div>
          </div>

          {/* 6. Clean Collapsible Section for Formula Explainer */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFormulaSteps(!showFormulaSteps)}
              className="w-full p-2.5 text-left flex items-center justify-between text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center space-x-1.5">
                <svg className="w-3.5 h-3.5 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Calculation Math Explainer</span>
              </div>
              <span className="text-slate-400 font-bold text-xs">{showFormulaSteps ? '−' : '+'}</span>
            </button>

            {showFormulaSteps && (
              <div className="p-2.5 pt-0 border-t border-slate-100 space-y-2">
                <div className="space-y-1 text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                  <p>1. Decal = {decalSize}" {parsedExtraDecal > 0 ? `(${parsedWidth}" + ${parsedHeight}" + ${parsedExtraDecal}" extra)` : ''}</p>
                  <p>2. Cutting = {cuttingSize}" {parsedExtraCutting > 0 ? `(${parsedLength}" + ${parsedWidth}" + ${parsedExtraCutting}" extra)` : ''}</p>
                  <p>3. Liner = ({decalSize} × {cuttingSize} × [{formulaGsmLabel}]) / 1550 = {linerWeightGrams.toFixed(2)} g</p>
                  <p>4. Paper = ({decalSize} × {cuttingSize} × {parsedGsm3}) / 1550 = {paperWeightGrams.toFixed(2)} g</p>
                  <p className="font-bold text-[#002B49]">5. Total Liner + Decal = {totalWeightGrams.toFixed(2)} g ({totalWeightKg.toFixed(4)} kg)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
      {/* End of print:hidden screen view */}

      {/* 7. Dedicated Black & White Print View (Table Form) */}
      <div className="hidden print:block print-ledger-report text-black bg-white p-0 font-sans">
        {/* Company Header */}
        <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-black">
              SHUKAN PACKAGING
            </h1>
            <p className="text-xs text-black font-semibold mt-0.5">
              Corrugated Box Weight & Specification Sheet
              {historySearch.trim() ? ` (Filtered: "${historySearch.trim()}")` : ''}
            </p>
          </div>
          <div className="text-right text-xs text-black space-y-0.5">
            <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
            <p><strong>Time:</strong> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            {printMode === 'saved' && (
              <p><strong>Total Records:</strong> {filteredHistory.length}</p>
            )}
          </div>
        </div>

        {/* Black & White Table */}
        <table className="print-table calculator-print-table w-full border-collapse border-2 border-black text-xs text-black">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black">
              <th style={{ width: '28%' }} className="border border-black px-3 py-2 text-left font-black uppercase">Box Name</th>
              <th style={{ width: '11%' }} className="border border-black px-3 py-2 text-center font-black uppercase">Decal</th>
              <th style={{ width: '11%' }} className="border border-black px-3 py-2 text-center font-black uppercase">Cutting</th>
              <th style={{ width: '16%' }} className="border border-black px-3 py-2 text-center font-black uppercase">GSM (L/F/P)</th>
              <th style={{ width: '11%' }} className="border border-black px-3 py-2 text-right font-black uppercase">Liner Weight</th>
              <th style={{ width: '11%' }} className="border border-black px-3 py-2 text-right font-black uppercase">Paper Weight</th>
              <th style={{ width: '12%' }} className="border border-black px-3 py-2 text-right font-black uppercase">Total Weight</th>
            </tr>
          </thead>
          <tbody>
            {/* Active calculation row: ONLY render if NOT 'saved' mode, calculation has weight > 0, and not duplicate in savedHistory */}
            {printMode !== 'saved' && totalWeightGrams > 0 && (!lastSavedId || !savedHistory.some(item => item.id === lastSavedId)) && (
              <tr className="border-b border-black">
                <td className="border border-black px-3 py-2.5 font-bold text-left">
                  {boxName.trim() || `Box ${decalSize}" × ${cuttingSize}"`}
                </td>
                <td className="border border-black px-3 py-2.5 text-center font-bold">{decalSize ? `${decalSize}"` : '-'}</td>
                <td className="border border-black px-3 py-2.5 text-center font-bold">{cuttingSize ? `${cuttingSize}"` : '-'}</td>
                <td className="border border-black px-3 py-2.5 text-center font-bold">
                  {parsedGsm1 || '-'}/{parsedGsm2 || '-'}/{parsedGsm3 || '-'}
                  {parsedFluting ? <span className="block text-[10px] font-normal">({parsedFluting}%)</span> : null}
                </td>
                <td className="border border-black px-3 py-2.5 text-right font-bold">
                  {linerWeightGrams.toFixed(2)} g
                </td>
                <td className="border border-black px-3 py-2.5 text-right font-bold">
                  {paperWeightGrams.toFixed(2)} g
                </td>
                <td className="border border-black px-3 py-2.5 text-right font-black">
                  {totalWeightGrams.toFixed(2)} g
                </td>
              </tr>
            )}

            {/* Saved items list: render when in 'saved' or 'all' mode (filtered according to active search/filters) */}
            {printMode !== 'current' && filteredHistory.map((item) => (
              <tr key={item.id} className="border-b border-black">
                <td className="border border-black px-3 py-2 text-left font-bold">
                  {item.title}
                </td>
                <td className="border border-black px-3 py-2 text-center font-semibold">{item.decalSize}"</td>
                <td className="border border-black px-3 py-2 text-center font-semibold">{item.cuttingSize}"</td>
                <td className="border border-black px-3 py-2 text-center font-medium">
                  {item.gsm1 || '-'}/{item.gsm2 || '-'}/{item.gsm3 || '-'}
                  {item.fluting ? <span className="block text-[10px] font-normal">({item.fluting}%)</span> : null}
                </td>
                <td className="border border-black px-3 py-2 text-right">
                  {item.linerWeightGrams} g
                </td>
                <td className="border border-black px-3 py-2 text-right">
                  {item.paperWeightGrams} g
                </td>
                <td className="border border-black px-3 py-2 text-right font-bold">
                  {item.totalWeightGrams} g
                </td>
              </tr>
            ))}

            {/* Fallback if no records to print */}
            {((printMode === 'current' && totalWeightGrams <= 0) ||
              (printMode === 'saved' && filteredHistory.length === 0) ||
              (printMode === 'all' && totalWeightGrams <= 0 && filteredHistory.length === 0)) && (
              <tr>
                <td colSpan="7" className="border border-black px-3 py-4 text-center text-gray-500 italic">
                  {savedHistory.length > 0 && filteredHistory.length === 0
                    ? 'No calculation records match the current filter'
                    : 'No calculation records to print'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer info in print */}
        <div className="mt-8 flex justify-end items-end text-xs text-black border-t border-black pt-3">
          <div className="text-right">
            <p className="border-t border-black pt-1 px-8 font-bold text-xs">Authorized Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
