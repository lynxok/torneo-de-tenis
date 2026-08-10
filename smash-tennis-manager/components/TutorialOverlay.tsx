
import React, { useEffect, useState, useCallback } from 'react';
import { TutorialStep } from '../types';
import { X, ChevronRight, ChevronLeft, AlertCircle, MousePointer2 } from 'lucide-react';

interface TutorialOverlayProps {
    steps: TutorialStep[];
    isActive: boolean;
    onComplete: () => void;
    currentView: string;
    onNavigateRequest: (view: string) => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ steps, isActive, onComplete, currentView, onNavigateRequest }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
    const [isElementMissing, setIsElementMissing] = useState(false);
    
    // Window dimensions for SVG
    const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

    // Reset when starting new tutorial
    useEffect(() => {
        if (isActive) {
            setCurrentStepIndex(0);
            setIsElementMissing(false);
        }
    }, [isActive]);

    useEffect(() => {
        const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const currentStep = steps[currentStepIndex];

    // --- NAVIGATION & ELEMENT FINDING LOGIC ---
    useEffect(() => {
        if (!isActive || !currentStep) return;

        setIsElementMissing(false);
        // Don't clear targetRect immediately to allow smooth transition if possible
        // setTargetRect(null); 

        // 1. Navigation Check
        if (currentStep.view && currentStep.view !== currentView) {
            onNavigateRequest(currentStep.view);
            return;
        }

        // 2. Find Element Logic (Retry loop)
        let attempts = 0;
        const maxAttempts = 20; // 6 seconds approx (300ms * 20)

        const findElement = () => {
            const element = document.getElementById(currentStep.targetId);
            if (element) {
                // Determine bounds
                const rect = element.getBoundingClientRect();
                
                // Add some padding to the highlight
                const padding = 5;
                const highlightRect = {
                    left: rect.left - padding,
                    top: rect.top - padding,
                    width: rect.width + (padding * 2),
                    height: rect.height + (padding * 2),
                    right: rect.right + padding,
                    bottom: rect.bottom + padding,
                    x: rect.x - padding,
                    y: rect.y - padding,
                    toJSON: rect.toJSON
                } as DOMRect;

                setTargetRect(highlightRect);
                
                // Calculate Tooltip Position
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                
                let top = highlightRect.bottom + 20;
                let left = highlightRect.left;

                // Vertical flip
                if (top + 200 > viewportHeight) {
                    top = highlightRect.top - 220; 
                }
                
                // Horizontal clamping
                if (left + 320 > viewportWidth) {
                    left = viewportWidth - 340;
                }
                if (left < 10) left = 10;

                setTooltipPosition({ top, left });
                setIsElementMissing(false);
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(findElement, 300);
                } else {
                    // Element definitely missing
                    setIsElementMissing(true);
                    setTargetRect(null);
                    setTooltipPosition({ 
                        top: window.innerHeight / 2 - 100, 
                        left: window.innerWidth / 2 - 160 
                    });
                }
            }
        };

        // Small delay to allow DOM to settle after navigation
        const timeout = setTimeout(findElement, 300);
        return () => clearTimeout(timeout);

    }, [isActive, currentStepIndex, currentView, steps]);

    // --- INTERACTION HANDLERS ---

    const handleNext = useCallback(() => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onComplete();
        }
    }, [currentStepIndex, steps.length, onComplete]);

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    // Global Click Listener to detect user interaction with target
    useEffect(() => {
        if (!isActive || !currentStep || !targetRect) return;

        const handleGlobalClick = (e: MouseEvent) => {
            const element = document.getElementById(currentStep.targetId);
            
            // If the user clicked inside the target element
            if (element && element.contains(e.target as Node)) {
                // We assume the user performed the action.
                // We add a small delay to let the UI update (e.g. modal open) before moving the spotlight
                setTimeout(() => {
                    handleNext();
                }, 200); 
            }
        };

        // Use capture phase to ensure we see it before stopPropagation might be called, 
        // though standard bubble is usually fine for monitoring.
        window.addEventListener('click', handleGlobalClick, true);
        return () => window.removeEventListener('click', handleGlobalClick, true);
    }, [isActive, currentStep, targetRect, handleNext]);


    if (!isActive || !currentStep) return null;
    // Wait for rect unless missing
    if (!targetRect && !isElementMissing) return null;

    // SVG Path Generation for "Hole"
    // M 0 0 H width V height H 0 Z  -> Outer Box (Full Screen)
    // M x y h w v h h -w Z          -> Inner Box (The Hole) - drawn counter-clockwise or handled via evenodd rule
    const svgPath = targetRect 
        ? `M0,0 H${windowSize.w} V${windowSize.h} H0 Z M${targetRect.left},${targetRect.top} h${targetRect.width} v${targetRect.height} h-${targetRect.width} Z`
        : `M0,0 H${windowSize.w} V${windowSize.h} H0 Z`;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* 
                SVG OVERLAY
                Container needs pointer-events: none to let clicks through where SVG doesn't block.
                The SVG itself also needs pointer-events: none by default, so transparent areas pass through.
                The PATH needs pointer-events: auto to block clicks on the dimmed area.
            */}
            <svg 
                className="absolute inset-0 w-full h-full transition-all duration-300 ease-in-out" 
                style={{ pointerEvents: 'none' }}
            >
                <path 
                    d={svgPath} 
                    fill="rgba(0,0,0,0.7)" 
                    fillRule="evenodd"
                    className="transition-all duration-300 ease-in-out"
                    style={{ pointerEvents: 'auto' }}
                />
            </svg>

            {/* HIGHLIGHT BORDER (Visual only) */}
            {targetRect && (
                <div 
                    className="absolute border-2 border-primary rounded-lg transition-all duration-300 ease-in-out pointer-events-none shadow-[0_0_15px_rgba(56,189,248,0.5)] animate-pulse"
                    style={{
                        top: targetRect.top,
                        left: targetRect.left,
                        width: targetRect.width,
                        height: targetRect.height,
                    }}
                />
            )}

            {/* TOOLTIP CARD (Pointer events auto to allow button clicks) */}
            <div 
                className="absolute w-80 bg-card border border-white/20 rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-300 pointer-events-auto"
                style={{
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                }}
            >
                {isElementMissing && (
                    <div className="flex items-center gap-2 mb-2 text-yellow-400 text-xs font-bold bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
                        <AlertCircle size={14} /> Elemento no visible. Puedes avanzar manualmente.
                    </div>
                )}

                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-bold text-lg">{currentStep.title}</h4>
                    <button onClick={onComplete} className="text-muted hover:text-white"><X size={16}/></button>
                </div>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                    {currentStep.content}
                </p>
                
                {/* Visual hint that they can click the element */}
                {!isElementMissing && (
                    <div className="flex items-center gap-2 text-primary text-xs font-bold mb-4 bg-primary/10 p-2 rounded-lg">
                        <MousePointer2 size={14} /> Haz clic en el elemento destacado para continuar
                    </div>
                )}
                
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                    <span className="text-xs text-muted font-mono">
                        {currentStepIndex + 1} / {steps.length}
                    </span>
                    <div className="flex gap-2">
                        {currentStepIndex > 0 && (
                            <button 
                                onClick={handlePrev}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        <button 
                            onClick={handleNext}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                            {currentStepIndex === steps.length - 1 ? 'Finalizar' : 'Omitir / Siguiente'}
                            {currentStepIndex !== steps.length - 1 && <ChevronRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
