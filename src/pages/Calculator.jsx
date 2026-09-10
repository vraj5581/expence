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
  const [lastSavedId, setLastSavedId] = useState(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Calculation History in localStorage
  const [savedHistory, setSavedHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('shukan_calc_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Numeric parsers
  const parsedLength = parseFloat(length) || 0;
  const parsedWidth = parseFloat(width) || 0;
  const parsedHeight = parseFloat(height) || 0;
  const parsedDirectDecal = parseFloat(directDecal) || 0;
  const parsedDirectCutting = parseFloat(directCutting) || 0;
  const parsedGsm1 = parseFloat(gsm1) || 0;
  const parsedGsm2 = parseFloat(gsm2) || 0;
  const parsedGsm3 = parseFloat(gsm3) || 0;
  const parsedFluting = parseFloat(fluting) || 0;
  const parsedQty = parseInt(batchQuantity, 10) || 1;
  const parsedRate = parseFloat(ratePerKg) || 0;

  // Rule 1: width + height = decal size
  const decalSize = useMemo(() => {
    if (inputMode === 'direct') return parsedDirectDecal;
    return (parsedWidth > 0 || parsedHeight > 0) ? (parsedWidth + parsedHeight) : 0;
  }, [inputMode, parsedDirectDecal, parsedWidth, parsedHeight]);

  // Rule 2: length + width = cutting size
  const cuttingSize = useMemo(() => {
    if (inputMode === 'direct') return parsedDirectCutting;
    return (parsedLength > 0 || parsedWidth > 0) ? (parsedLength + parsedWidth) : 0;
  }, [inputMode, parsedDirectCutting, parsedLength, parsedWidth]);

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

    setIsSaving(true);
    try {
      const res = await apiService.saveCalculation(payload);
      if (res && res.success) {
        toast.success('Calculation saved in database successfully!', { theme: 'light' });
      } else {
        toast.warning(res?.message || 'Saved locally (DB sync pending)', { theme: 'light' });
      }
    } catch (e) {
      toast.info('Saved locally', { theme: 'light' });
    } finally {
      setIsSaving(false);
      setJustSaved(true);
      setLastSavedId(calcId);
      setTimeout(() => setJustSaved(false), 2500);
      const updated = [newHistoryItem, ...savedHistory.filter(h => h.id !== calcId).slice(0, 49)];
      setSavedHistory(updated);
      localStorage.setItem('shukan_calc_history', JSON.stringify(updated));
    }
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
    } else {
      setInputMode('direct');
      setDirectDecal(item.decalSize.toString());
      setDirectCutting(item.cuttingSize.toString());
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

  const handleCopySummary = () => {
    if (totalWeightGrams <= 0) {
      toast.warning('Enter dimensions to copy result', { theme: 'light' });
      return;
    }

    const titleLine = boxName.trim() ? `📦 *${boxName.trim()}*\n` : '📦 *BOX WEIGHT CALCULATION*\n';
    const dimLine = inputMode === 'dimensions'
      ? `• Dimensions: ${parsedLength}" × ${parsedWidth}" × ${parsedHeight}"\n`
      : '';
    const summary = 
`${titleLine}━━━━━━━━━━━━━━━━━
${dimLine}• Decal (W+H): *${decalSize}"*
• Cutting (L+W): *${cuttingSize}"*
• GSM: ${parsedGsm1} / ${parsedGsm2} / ${parsedGsm3} | Fluting: ${parsedFluting}%
━━━━━━━━━━━━━━━━━
⚖️ *WEIGHT RESULT:*
• Liner Weight: *${linerWeightGrams.toFixed(2)} g* (${linerWeightKg.toFixed(4)} kg)
• Paper Weight: *${paperWeightGrams.toFixed(2)} g* (${paperWeightKg.toFixed(4)} kg)
⭐ *TOTAL LINER + DECAL WEIGHT: ${totalWeightGrams.toFixed(2)} g (${totalWeightKg.toFixed(4)} kg)*
━━━━━━━━━━━━━━━━━
${parsedQty > 1 ? `• Batch (${parsedQty.toLocaleString()} pcs): *${totalBatchWeightKg.toFixed(2)} kg*\n` : ''}${parsedRate > 0 ? `• Paper Cost: ₹${batchPaperCost.toFixed(2)} (@ ₹${parsedRate}/kg)\n` : ''}_Shukan Packaging_`;

    navigator.clipboard.writeText(summary);
    toast.success('Copied to clipboard!', { theme: 'light' });
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = (boxName.trim() ? boxName.trim().replace(/\s+/g, '_') : 'Box_Weight') + '_Report';
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 150);
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
            <p className="text-[11px] text-slate-500 font-medium truncate">
              Corrugated Packaging Liner & Paper Weight
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
            title="Reset form"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#002B49] hover:bg-[#003860] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Copy summary"
          >
            <svg className="w-4 h-4 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>Copy</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
            title="Print Black & White Table"
          >
            <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 2. Mode Selector: 3 Tabs (Box Size | Direct | Saved Data) */}
      <div className="bg-slate-200/70 p-1 rounded-2xl grid grid-cols-3 gap-1 text-[11px] sm:text-xs font-bold">
        <button
          type="button"
          onClick={() => handleSwitchMode('dimensions')}
          className={`py-2 sm:py-2.5 px-2 rounded-xl transition text-center flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
            inputMode === 'dimensions'
              ? 'bg-white text-[#002B49] shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>📦 Box Size</span>
          <span className="hidden sm:inline">(L×W×H)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('direct')}
          className={`py-2 sm:py-2.5 px-2 rounded-xl transition text-center flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
            inputMode === 'direct'
              ? 'bg-white text-[#002B49] shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>✏️ Direct</span>
          <span className="hidden sm:inline">(Decal & Cutting)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchMode('saved')}
          className={`py-2 sm:py-2.5 px-2 rounded-xl transition text-center flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
            inputMode === 'saved'
              ? 'bg-white text-[#002B49] shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>💾 Saved Data</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-black ${
            inputMode === 'saved' ? 'bg-[#002B49] text-white' : 'bg-slate-300 text-slate-700'
          }`}>
            {savedHistory.length}
          </span>
        </button>
      </div>

      {/* 3. Conditional Content: Dedicated Saved Data Table OR 2-Column Calculator */}
      {inputMode === 'saved' ? (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#002B49] uppercase tracking-wide">
                Saved Box Calculations ({savedHistory.length})
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Data saved in MySQL database
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSwitchMode('dimensions')}
                className="px-3 py-1.5 rounded-xl bg-[#002B49] hover:bg-[#003860] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>+ New Calculation</span>
              </button>

              <button
                type="button"
                onClick={fetchFromDb}
                disabled={isLoadingDb}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1 cursor-pointer border border-slate-200"
                title="Refresh from database"
              >
                <svg className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin text-[#c69255]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
                title="Print Black & White Table"
              >
                <svg className="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Table</span>
              </button>
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
                className="mt-3 px-3 py-1.5 rounded-xl bg-[#002B49] text-white text-xs font-bold transition cursor-pointer"
              >
                Go to Calculator
              </button>
            </div>
          ) : (
            <div>
              {/* Mobile View: Clean Modern Cards (sm:hidden) */}
              <div className="sm:hidden space-y-3">
                {savedHistory.map((item) => (
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
                          className="px-2.5 py-1 rounded-lg bg-[#002B49] hover:bg-[#003860] text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/70 transition cursor-pointer active:scale-95"
                          title="Delete from database"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Decal & Cutting Pills */}
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-bold border border-sky-200/60">
                        Decal: {item.decalSize}"
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200/60">
                        Cutting: {item.cuttingSize}"
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
                      <th className="px-3 py-3 text-right">Liner Weight</th>
                      <th className="px-3 py-3 text-right">Paper Weight</th>
                      <th className="px-3.5 py-3 text-right font-black text-[#002B49]">Total Weight</th>
                      <th className="px-3.5 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {savedHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                        <td className="px-3.5 py-3 font-bold text-[#002B49] max-w-[180px] truncate">
                          <div className="truncate text-xs">{item.title}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {item.date ? new Date(item.date).toLocaleDateString('en-GB') : ''}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-700">{item.decalSize}"</td>
                        <td className="px-3 py-3 text-center font-bold text-slate-700">{item.cuttingSize}"</td>
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
                              className="px-2.5 py-1.5 rounded-lg bg-[#002B49] text-white hover:bg-[#003860] font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
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
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer active:scale-95"
                              title="Delete from database"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
        /* 3. Main Workspace: 2-Column Responsive Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Calculator (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Dimensions Input Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#002B49] uppercase tracking-wider">
            {inputMode === 'dimensions' ? 'Step 1: Enter Dimensions' : 'Step 1: Enter Decal & Cutting'}
          </span>
          <span className="text-[11px] font-semibold text-slate-400">Inches (")</span>
        </div>

        {/* Box Name / Order Reference */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Box Name <span className="text-[10px] text-slate-400 font-normal">(Printed on table & report)</span>
          </label>
          <input
            type="text"
            value={boxName}
            onChange={(e) => setBoxName(e.target.value)}
            placeholder="e.g. Master Carton 5-Ply / Box A"
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-[#002B49] focus:bg-white focus:border-[#002B49] focus:outline-none transition"
          />
        </div>

        {/* If Box Dimensions Mode */}
        {inputMode === 'dimensions' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Length (L)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="0"
                  className="w-full text-center px-2 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-lg font-black text-[#002B49] focus:bg-white focus:border-[#002B49] focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Width (W)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="0"
                  className="w-full text-center px-2 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-lg font-black text-[#002B49] focus:bg-white focus:border-[#002B49] focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Height (H)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="0"
                  className="w-full text-center px-2 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-lg font-black text-[#002B49] focus:bg-white focus:border-[#002B49] focus:outline-none transition"
                />
              </div>
            </div>

            {/* Clean Result Pills for Decal & Cutting */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-sky-700 uppercase tracking-tight block">Decal (W + H)</span>
                  <span className="text-[10px] text-sky-600 font-medium">{parsedWidth || 0}" + {parsedHeight || 0}"</span>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-sky-950">{decalSize}"</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tight block">Cutting (L + W)</span>
                  <span className="text-[10px] text-amber-600 font-medium">{parsedLength || 0}" + {parsedWidth || 0}"</span>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-amber-950">{cuttingSize}"</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Direct Mode */
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Decal Size (inches)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={directDecal}
                onChange={(e) => setDirectDecal(e.target.value)}
                placeholder="e.g. 22"
                className="w-full text-center px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-lg font-black text-[#002B49] focus:bg-white focus:border-[#002B49] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Cutting Size (inches)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={directCutting}
                onChange={(e) => setDirectCutting(e.target.value)}
                placeholder="e.g. 28"
                className="w-full text-center px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-lg font-black text-[#002B49] focus:bg-white focus:border-[#002B49] focus:outline-none transition"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. GSM & Fluting Specifications Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-[#002B49] uppercase tracking-wider">
            Step 2: Paper GSM & Fluting
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">Divisor: 1550</span>
        </div>

        {/* 4 Inputs in 2x2 Grid on Mobile, 4 columns on Desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* GSM 1 */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
              GSM 1 (Decal)
            </div>
            <input
              type="number"
              inputMode="numeric"
              step="any"
              min="0"
              value={gsm1}
              onChange={(e) => setGsm1(e.target.value)}
              placeholder="0"
              className="w-full mt-1 text-center py-1.5 bg-white rounded-lg border border-slate-200 text-base font-black text-[#002B49] focus:outline-none focus:border-[#002B49] transition"
            />
            <div className="text-[9.5px] text-slate-400 text-center mt-1">Top Liner</div>
          </div>

          {/* GSM 2 */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
              GSM 2 (Decal)
            </div>
            <input
              type="number"
              inputMode="numeric"
              step="any"
              min="0"
              value={gsm2}
              onChange={(e) => setGsm2(e.target.value)}
              placeholder="0"
              className="w-full mt-1 text-center py-1.5 bg-white rounded-lg border border-slate-200 text-base font-black text-[#002B49] focus:outline-none focus:border-[#002B49] transition"
            />
            <div className="text-[9.5px] text-slate-400 text-center mt-1">Flute Paper</div>
          </div>

          {/* GSM 3 */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
              GSM 3 (Cutting)
            </div>
            <input
              type="number"
              inputMode="numeric"
              step="any"
              min="0"
              value={gsm3}
              onChange={(e) => setGsm3(e.target.value)}
              placeholder="230"
              className="w-full mt-1 text-center py-1.5 bg-white rounded-lg border border-slate-200 text-base font-black text-[#002B49] focus:outline-none focus:border-[#002B49] transition"
            />
            <div className="text-[9.5px] text-slate-400 text-center mt-1">Inner Paper</div>
          </div>

          {/* Fluting */}
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-tight">Fluting</span>
              <span className="text-[9px] font-bold text-amber-700 bg-amber-200/60 px-1 rounded">%</span>
            </div>
            <input
              type="number"
              inputMode="numeric"
              step="any"
              min="0"
              value={fluting}
              onChange={(e) => setFluting(e.target.value)}
              placeholder="40"
              className="w-full mt-1 text-center py-1.5 bg-white rounded-lg border border-amber-300 text-base font-black text-[#002B49] focus:outline-none focus:border-[#002B49] transition"
            />
            <div className="text-[9.5px] text-amber-800 text-center mt-1 font-semibold">Auto 40%</div>
          </div>
        </div>
      </div>

      {/* 5. Clean Hero Result Card */}
      <div className="bg-gradient-to-br from-[#002B49] via-[#003459] to-[#001D33] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md border border-white/10 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-extrabold text-[#c69255] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#c69255] animate-pulse"></span>
            Total Liner + Decal Weight
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
            {decalSize > 0 && cuttingSize > 0 ? `${decalSize}" × ${cuttingSize}"` : '0" × 0"'}
          </span>
        </div>

        {/* Large Main Result */}
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {totalWeightGrams > 0 ? totalWeightGrams.toFixed(2) : '0.00'}
            </span>
            <span className="text-base sm:text-xl font-extrabold text-[#c69255]">grams</span>
          </div>
          <div className="text-right">
            <div className="text-base sm:text-lg font-black text-slate-200">
              {totalWeightKg > 0 ? totalWeightKg.toFixed(4) : '0.0000'} <span className="text-xs font-normal text-slate-400">kg</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">per sheet / box</span>
          </div>
        </div>

        {/* Split Sub-Weights (Liner & Paper) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4 pt-3.5 border-t border-white/15">
          <div className="bg-white/10 rounded-xl p-2.5 sm:p-3">
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">
              3. Liner Weight
            </div>
            <div className="text-base sm:text-lg font-black text-white mt-0.5">
              {linerWeightGrams > 0 ? linerWeightGrams.toFixed(2) : '0.00'} <span className="text-xs font-normal text-slate-300">g</span>
            </div>
            <div className="text-[10px] text-[#c69255] font-semibold">
              {linerWeightKg > 0 ? linerWeightKg.toFixed(4) : '0.0000'} kg
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-2.5 sm:p-3">
            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">
              4. Paper Weight
            </div>
            <div className="text-base sm:text-lg font-black text-white mt-0.5">
              {paperWeightGrams > 0 ? paperWeightGrams.toFixed(2) : '0.00'} <span className="text-xs font-normal text-slate-300">g</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold">
              {paperWeightKg > 0 ? paperWeightKg.toFixed(4) : '0.0000'} kg
            </div>
          </div>
        </div>

        {/* Action Bar Inside Result Card: Copy and Save */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-white/10">
          <button
            type="button"
            onClick={handleCopySummary}
            className="py-2.5 px-3 rounded-xl bg-[#c69255] hover:bg-[#b58145] text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            <span>Copy</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            className={`py-2.5 px-3 rounded-xl font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-70 ${
              justSaved ? 'bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Save to database"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            ) : justSaved ? (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            <span>{isSaving ? 'Saving...' : justSaved ? 'Saved!' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* 6. Clean Collapsible Sections for Advanced Features */}
      <div className="space-y-2.5">
        
        {/* Accordion 1: Batch Quantity & Cost Estimator */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBatchTools(!showBatchTools)}
            className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between text-xs font-black text-[#002B49] hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Batch Quantity & Paper Cost (Optional)</span>
            </div>
            <span className="text-slate-400 font-bold text-sm">{showBatchTools ? '−' : '+'}</span>
          </button>

          {showBatchTools && (
            <div className="p-3.5 sm:p-4 pt-0 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Order Quantity (pcs)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={batchQuantity}
                    onChange={(e) => setBatchQuantity(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#002B49] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Paper Rate (₹/kg)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={ratePerKg}
                    onChange={(e) => setRatePerKg(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-[#002B49] focus:outline-none"
                  />
                </div>
              </div>

              {/* Batch Summary */}
              {totalWeightKg > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <span className="font-bold text-slate-600">Total Batch ({parsedQty.toLocaleString()} pcs):</span>
                  <span className="font-black text-[#002B49]">{totalBatchWeightKg.toFixed(2)} kg</span>
                  {parsedRate > 0 && (
                    <span className="font-black text-[#c69255]">₹{batchPaperCost.toFixed(2)}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion 2: Formula & Calculation Math */}
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFormulaSteps(!showFormulaSteps)}
            className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between text-xs font-black text-[#002B49] hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-[#c69255]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Calculation Math & Formula Explainer</span>
            </div>
            <span className="text-slate-400 font-bold text-sm">{showFormulaSteps ? '−' : '+'}</span>
          </button>

          {showFormulaSteps && (
            <div className="p-3.5 sm:p-4 pt-0 border-t border-slate-100 space-y-3">
              {/* Formula Mode Toggle */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">
                  Liner Effective GSM Method
                </label>
                <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFormulaMode('takeup')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer ${
                      formulaMode === 'takeup'
                        ? 'bg-[#002B49] text-white border-[#002B49]'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Take-up (1.40x)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormulaMode('literal')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer ${
                      formulaMode === 'literal'
                        ? 'bg-[#002B49] text-white border-[#002B49]'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    G1 × G2 + 40
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormulaMode('additive')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer ${
                      formulaMode === 'additive'
                        ? 'bg-[#002B49] text-white border-[#002B49]'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    GSM1 + GSM2
                  </button>
                </div>
              </div>

              {/* Step math details */}
              <div className="space-y-1.5 text-[11px] font-mono text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <p>1. Decal = {decalSize}"</p>
                <p>2. Cutting = {cuttingSize}"</p>
                <p>3. Liner = ({decalSize} × {cuttingSize} × [{formulaGsmLabel}]) / 1550 = {linerWeightGrams.toFixed(2)} g</p>
                <p>4. Paper = ({decalSize} × {cuttingSize} × {parsedGsm3}) / 1550 = {paperWeightGrams.toFixed(2)} g</p>
                <p className="font-bold text-[#002B49]">5. Total Liner + Decal = {totalWeightGrams.toFixed(2)} g ({totalWeightKg.toFixed(4)} kg)</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      
      {/* Right Column: Dedicated "Saved Data" Column (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  💾
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-black text-[#002B49] uppercase tracking-wider">
                      Saved Data
                    </h2>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      {savedHistory.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Saved in MySQL database
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={fetchFromDb}
                  disabled={isLoadingDb}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                  title="Refresh from database"
                >
                  <svg className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin text-[#c69255]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer border border-slate-200"
                  title="Print Saved Table"
                >
                  <svg className="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* List of Saved Calculations */}
            {savedHistory.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-600">No saved data yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Calculate and click <strong className="text-emerald-700">Save</strong> to display records here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {savedHistory.map((item) => {
                  const isRecentlySaved = item.id === lastSavedId;
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition relative ${
                        isRecentlySaved
                          ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/60 shadow-sm'
                          : 'border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-[#002B49] truncate">
                              {item.title}
                            </span>
                            {isRecentlySaved && (
                              <span className="px-1.5 py-0.2 rounded-md bg-emerald-600 text-white text-[9px] font-black animate-pulse">
                                Just Saved
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                            Decal: <span className="font-bold text-slate-700">{item.decalSize}"</span> | Cutting: <span className="font-bold text-slate-700">{item.cuttingSize}"</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadHistory(item)}
                            className="px-2.5 py-1 rounded-lg bg-[#002B49] hover:bg-[#003860] text-white font-bold text-[10.5px] transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
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
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete from database"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* 3-Column Weight Breakdown */}
                      <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-slate-200/60 text-center">
                        <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Liner</div>
                          <div className="text-[11px] font-bold text-slate-700">{item.linerWeightGrams} g</div>
                        </div>
                        <div className="bg-white rounded-lg p-1.5 border border-slate-100">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Paper</div>
                          <div className="text-[11px] font-bold text-slate-700">{item.paperWeightGrams} g</div>
                        </div>
                        <div className="bg-[#002B49]/5 rounded-lg p-1.5 border border-[#002B49]/10">
                          <div className="text-[9px] font-bold text-[#002B49] uppercase">Total</div>
                          <div className="text-[11px] font-black text-[#002B49]">{item.totalWeightGrams} g</div>
                        </div>
                      </div>

                      {item.date && (
                        <div className="text-[9.5px] text-slate-400 mt-1.5 text-right font-medium">
                          {new Date(item.date).toLocaleDateString('en-GB')} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
      </div>
      {/* End of print:hidden screen view */}

      {/* 7. Dedicated Black & White Print View (Table Form) */}
      <div className="hidden print:block text-black bg-white p-4 sm:p-6 font-sans">
        {/* Company Header */}
        <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-black">
              SHUKAN PACKAGING
            </h1>
            <p className="text-xs text-black font-semibold mt-0.5">
              Corrugated Box Weight & Specification Sheet
            </p>
          </div>
          <div className="text-right text-xs text-black space-y-0.5">
            <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
            <p><strong>Time:</strong> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        {/* Black & White Table */}
        <table className="w-full border-collapse border-2 border-black text-xs text-black">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black">
              <th className="border border-black px-3 py-2 text-left font-black uppercase">Box Name</th>
              <th className="border border-black px-3 py-2 text-center font-black uppercase">Decal</th>
              <th className="border border-black px-3 py-2 text-center font-black uppercase">Cutting</th>
              <th className="border border-black px-3 py-2 text-right font-black uppercase">Liner Weight</th>
              <th className="border border-black px-3 py-2 text-right font-black uppercase">Paper Weight</th>
              <th className="border border-black px-3 py-2 text-right font-black uppercase">Total Weight</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              <td className="border border-black px-3 py-2.5 font-bold text-left">
                {boxName.trim() || 'Standard Box'}
              </td>
              <td className="border border-black px-3 py-2.5 text-center font-bold">{decalSize ? `${decalSize}"` : '-'}</td>
              <td className="border border-black px-3 py-2.5 text-center font-bold">{cuttingSize ? `${cuttingSize}"` : '-'}</td>
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

            {/* If any additional saved items exist in history, list them in the table */}
            {savedHistory.map((item) => (
              <tr key={item.id} className="border-b border-black">
                <td className="border border-black px-3 py-2 text-left font-bold">
                  {item.title}
                </td>
                <td className="border border-black px-3 py-2 text-center font-semibold">{item.decalSize}"</td>
                <td className="border border-black px-3 py-2 text-center font-semibold">{item.cuttingSize}"</td>
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
