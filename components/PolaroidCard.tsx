/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { DraggableCardContainer, DraggableCardBody, DraggableCardRef } from './ui/draggable-card';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ImageStatus = 'pending' | 'done' | 'error';

interface PolaroidCardProps {
    imageUrl?: string;
    caption: string;
    description?: string;
    status: ImageStatus;
    error?: string;
    dragConstraintsRef?: React.RefObject<HTMLElement>;
    onShake?: (caption: string) => void;
    onDownload?: (caption: string) => void;
    onShare?: (caption: string) => void;
    onAnimate?: (caption: string) => void;
    onEdit?: (caption: string) => void;
    onPlayAudio?: (caption: string) => void;
    onViewVideo?: (caption: string) => void;
    videoUrl?: string;
    isAnimating?: boolean;
    isAudioLoading?: boolean;
    isMobile?: boolean;
    progress?: number;
}


// FIX: Refactored ActionButton to be a typed React.FC to resolve incorrect "missing children" errors.
interface ActionButtonProps {
    onClick: (e: React.MouseEvent) => void;
    'aria-label': string;
    isLoading?: boolean;
    children: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, 'aria-label': ariaLabel, children, isLoading }) => {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick(e);
            }}
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={ariaLabel}
            disabled={isLoading}
        >
            {isLoading ? (
                <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : children}
        </button>
    );
};


const DevelopingIndicator = ({ progress }: { progress?: number }) => (
    <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden text-neutral-500">
        <div className="absolute inset-0 bg-radial-gradient-pulse" />
        <svg className="h-12 w-12 mb-4 text-neutral-600 animate-spin-slow" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 4C16.536 4 4 16.536 4 32C4 47.464 16.536 60 32 60C47.464 60 60 47.464 60 32" stroke="currentColor" strokeWidth="2"/>
            <path d="M32 4C23.7143 4 16.536 16.536 16.536 32C16.536 39.9556 20.0444 46.9333 25.5111 51.5556" stroke="currentColor" strokeWidth="2"/>
            <path d="M32 60C40.2857 60 47.464 47.464 47.464 32C47.464 24.0444 43.9556 17.0667 38.4889 12.4444" stroke="currentColor" strokeWidth="2"/>
            <path d="M4 32C4 23.7143 16.536 16.536 32 16.536C39.9556 16.536 46.9333 20.0444 51.5556 25.5111" stroke="currentColor" strokeWidth="2"/>
            <path d="M60 32C60 40.2857 47.464 47.464 32 47.464C24.0444 47.464 17.0667 43.9556 12.4444 38.4889" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <p className="font-permanent-marker text-base sm:text-lg text-neutral-500 animate-breathe z-10">
            {`Developing... ${Math.round(progress ?? 0)}%`}
        </p>
        <div className="absolute bottom-4 left-4 right-4 h-1 bg-neutral-800/50 rounded-full overflow-hidden">
            <motion.div
                className="h-full bg-neutral-400"
                initial={{ width: '0%' }}
                animate={{ width: `${progress ?? 0}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            />
        </div>
    </div>
);


const ErrorDisplay = ({ onRetry, isMobile, errorMessage }: { onRetry?: () => void; isMobile?: boolean, errorMessage?: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 text-neutral-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="font-permanent-marker text-base sm:text-lg text-neutral-300">Generation Failed</p>
        {errorMessage && (
             <p className="text-xs text-neutral-500 mt-2 max-w-[90%]">{errorMessage}</p>
        )}
        {onRetry && (
            isMobile ? (
                <button
                    onClick={onRetry}
                    className="mt-4 font-permanent-marker text-sm text-center text-cyan-300 bg-cyan-900/40 border border-cyan-400/50 py-1.5 px-4 rounded-sm transform transition-all duration-300 hover:scale-105 hover:bg-cyan-400/20"
                >
                    Try Again
                </button>
            ) : (
                <p className="text-sm text-neutral-500 mt-2">Shake to try again</p>
            )
        )}
    </div>
);

const Placeholder = () => (
    <div className="flex flex-col items-center justify-center h-full text-neutral-500 group-hover:text-neutral-300 transition-colors duration-300">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="font-permanent-marker text-base sm:text-xl">Upload Photo</span>
    </div>
);


const PolaroidCard: React.FC<PolaroidCardProps> = (props) => {
    const { imageUrl, caption, description, status, error, dragConstraintsRef, onShake, onDownload, onShare, onAnimate, onEdit, onPlayAudio, onViewVideo, videoUrl, isAnimating, isAudioLoading, isMobile, progress } = props;
    const [isDeveloped, setIsDeveloped] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isShareSupported, setIsShareSupported] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const cardBodyRef = useRef<DraggableCardRef>(null);
    const lastShakeTime = useRef(0);
    const lastVelocity = useRef({ x: 0, y: 0 });
    
    useEffect(() => {
        if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([], "test.jpg", {type: "image/jpeg"})] })) {
            setIsShareSupported(true);
        }
    }, []);

    useEffect(() => {
        if (status === 'pending') {
            setIsDeveloped(false);
            setIsImageLoaded(false);
        }
        if (status === 'done' && imageUrl) {
            setIsDeveloped(false);
            setIsImageLoaded(false);
        }
    }, [imageUrl, status]);

    useEffect(() => {
        if (isImageLoaded) {
            const timer = setTimeout(() => {
                setIsDeveloped(true);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isImageLoaded]);

    useEffect(() => {
        if (isShaking) {
            const animateAndRegenerate = async () => {
                if (cardBodyRef.current && onShake) {
                    await cardBodyRef.current.shake();
                    onShake(caption);
                    setIsShaking(false);
                } else {
                    setIsShaking(false);
                }
            };
            animateAndRegenerate();
        }
    }, [isShaking, onShake, caption]);


    const handleDragStart = () => {
        lastVelocity.current = { x: 0, y: 0 };
    };

    const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: any) => {
        if (!onShake || isMobile) return;
        const velocityThreshold = 1200;
        const shakeCooldown = 2000;
        const { x, y } = info.velocity;
        const { x: prevX, y: prevY } = lastVelocity.current;
        const now = Date.now();
        const magnitude = Math.sqrt(x * x + y * y);
        const dotProduct = (x * prevX) + (y * prevY);

        if (magnitude > velocityThreshold && dotProduct < 0 && (now - lastShakeTime.current > shakeCooldown) && !isShaking) {
            lastShakeTime.current = now;
            setIsShaking(true);
        }
        lastVelocity.current = { x, y };
    };

    const handleDownloadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onDownload) return;

        setIsDownloading(true);
        onDownload(caption);
        
        // Reset the loading state after a short delay to provide visual feedback
        setTimeout(() => {
            setIsDownloading(false);
        }, 1000);
    };

    const cardInnerContent = (
        <>
            <div className="w-full bg-neutral-900 shadow-inner flex-grow relative overflow-hidden group" onClick={() => videoUrl && onViewVideo && onViewVideo(caption)}>
                {status === 'pending' && <DevelopingIndicator progress={progress} />}
                {status === 'error' && <ErrorDisplay onRetry={onShake ? () => onShake(caption) : undefined} isMobile={isMobile} errorMessage={error} />}
                {status === 'done' && imageUrl && (
                    <>
                        {videoUrl && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                </div>
                            </div>
                        )}
                        <div className={cn(
                            "absolute top-2 right-2 z-30 flex flex-col gap-2 transition-opacity duration-300",
                            !isMobile && "opacity-0 group-hover:opacity-100",
                        )}>
                            {onPlayAudio && (
                                <ActionButton onClick={() => onPlayAudio(caption)} aria-label={`Play audio for ${caption}`} isLoading={isAudioLoading}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" /></svg>
                                </ActionButton>
                            )}
                            {onEdit && (
                                <ActionButton onClick={() => onEdit(caption)} aria-label={`Edit image for ${caption}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v1.069l4.98 2.49a1 1 0 01.684 1.246l-1.388 4.162a1 1 0 01-1.246.684l-4.162-1.388a1 1 0 01-.684-1.246L12.182 4.02 9.98 6.222a1 1 0 01-1.414 0l-2.829-2.828a1 1 0 010-1.414l2.222-2.222L5.97 1.393a1 1 0 01-1.246-.684L3.062 4.98A1 1 0 011.816 4.3L.428 2.912a1 1 0 01.684-1.246L5.09.278a1 1 0 011.246.684l.393.982 2.222-2.222a1 1 0 011.349.024zm2.385 8.225l1.388-4.162-4.98-2.49V2a1 1 0 01-.293-.707L8.476 5.524l2.828 2.828 2.381-.794zM2 12a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm3 3a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm3-6a1 1 0 011-1h1a1 1 0 110 2H9a1 1 0 01-1-1zm-3 3a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm11.5-3.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-3.5 6.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clipRule="evenodd" /></svg>
                                </ActionButton>
                            )}
                            {onAnimate && !videoUrl && (
                                <ActionButton onClick={() => onAnimate(caption)} aria-label={`Animate image for ${caption}`} isLoading={isAnimating}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" /><path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H8a2 2 0 01-2-2v-2z" /></svg>
                                </ActionButton>
                            )}
                            {onShare && isShareSupported && (
                                <ActionButton onClick={() => onShare(caption)} aria-label={`Share image for ${caption}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                                </ActionButton>
                            )}
                            {onDownload && (
                                <ActionButton onClick={handleDownloadClick} aria-label={`Download image for ${caption}`} isLoading={isDownloading}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </ActionButton>
                            )}
                             {isMobile && onShake && (
                                <ActionButton onClick={() => onShake(caption)} aria-label={`Regenerate image for ${caption}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.42.71a5.002 5.002 0 00-8.479-1.554H10a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm12 14a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.42-.71a5.002 5.002 0 008.479 1.554H10a1 1 0 110 2h6a1 1 0 011 1v6a1 1 0 01-1 1z" clipRule="evenodd" /></svg>
                                </ActionButton>
                            )}
                        </div>
                        <div className={`absolute inset-0 z-10 bg-[#3a322c] transition-opacity duration-[3500ms] ease-out ${isDeveloped ? 'opacity-0' : 'opacity-100'}`} aria-hidden="true" />
                        <img
                            key={imageUrl}
                            src={imageUrl}
                            alt={caption}
                            onLoad={() => setIsImageLoaded(true)}
                            className={`w-full h-full object-cover transition-all duration-[4000ms] ease-in-out ${ isDeveloped ? 'opacity-100 filter-none' : 'opacity-80 filter sepia(1) contrast(0.8) brightness(0.8)' }`}
                            style={{ opacity: isImageLoaded ? undefined : 0 }}
                        />
                    </>
                )}
                {status === 'done' && !imageUrl && <Placeholder />}
            </div>
            <div className="absolute bottom-3 left-2 right-2 text-center px-1">
                <p className={cn(
                    "font-permanent-marker truncate",
                    isMobile ? 'text-sm' : 'text-base sm:text-lg',
                    status === 'done' && imageUrl ? 'text-black' : 'text-neutral-800'
                )}>
                    {caption}
                </p>
            </div>
        </>
    );

    if (isMobile) {
        return (
            <div className="flex flex-col items-center">
                <div className="bg-neutral-100 dark:bg-neutral-100 !p-3 !pb-12 flex flex-col items-center justify-start aspect-[3/4] w-full rounded-md shadow-lg relative">
                    {cardInnerContent}
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <AnimatePresence>
                {isHovered && description && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 sm:w-80 max-w-[90vw] p-3 bg-neutral-900/90 backdrop-blur-sm text-neutral-200 text-sm leading-relaxed rounded-md shadow-lg z-50 pointer-events-none border border-neutral-700"
                        style={{ transformOrigin: 'bottom center' }}
                    >
                        <p className="text-center">{description}</p>
                    </motion.div>
                )}
            </AnimatePresence>
            <DraggableCardContainer>
                <DraggableCardBody 
                    ref={cardBodyRef}
                    className="bg-neutral-100 dark:bg-neutral-100 !p-4 !pb-16 flex flex-col items-center justify-start aspect-[3/4] w-72 sm:w-80 max-w-full"
                    dragConstraintsRef={dragConstraintsRef}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                >
                    {cardInnerContent}
                </DraggableCardBody>
            </DraggableCardContainer>
        </div>
    );
};

export default PolaroidCard;