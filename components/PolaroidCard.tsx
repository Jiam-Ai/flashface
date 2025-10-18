/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { DraggableCardContainer, DraggableCardBody, DraggableCardRef } from './ui/draggable-card';
import { cn } from '../lib/utils';
// FIX: The `PanInfo` type is reported as not being exported. Remove it and use `any` for the info object to resolve the error.
import { motion } from 'framer-motion';

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
    isMobile?: boolean;
    progress?: number;
}

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
        {/* Progress Bar */}
        <div className="absolute bottom-4 left-4 right-4 h-1 bg-neutral-800/50 rounded-full overflow-hidden">
            {/* @ts-ignore */}
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


const PolaroidCard: React.FC<PolaroidCardProps> = ({ imageUrl, caption, description, status, error, dragConstraintsRef, onShake, onDownload, onShare, isMobile, progress }) => {
    const [isDeveloped, setIsDeveloped] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isShareSupported, setIsShareSupported] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const cardBodyRef = useRef<DraggableCardRef>(null);
    const lastShakeTime = useRef(0);
    const lastVelocity = useRef({ x: 0, y: 0 });
    
    useEffect(() => {
        // Check if the Web Share API is supported by the browser for file sharing.
        if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([], "test.jpg", {type: "image/jpeg"})] })) {
            setIsShareSupported(true);
        }
    }, []);

    // Reset states when the image URL changes or status goes to pending.
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

    // When the image is loaded, start the developing animation.
    useEffect(() => {
        if (isImageLoaded) {
            const timer = setTimeout(() => {
                setIsDeveloped(true);
            }, 200); // Short delay before animation starts
            return () => clearTimeout(timer);
        }
    }, [isImageLoaded]);

    // This effect runs when a shake is detected to sequence the animation and regeneration.
    useEffect(() => {
        if (isShaking) {
            const animateAndRegenerate = async () => {
                if (cardBodyRef.current && onShake) {
                    await cardBodyRef.current.shake();
                    onShake(caption);
                    setIsShaking(false); // Reset for next time
                } else {
                    setIsShaking(false); // Ensure reset even if conditions fail
                }
            };
            animateAndRegenerate();
        }
    }, [isShaking, onShake, caption]);


    const handleDragStart = () => {
        // Reset velocity on new drag to prevent false triggers from old data
        lastVelocity.current = { x: 0, y: 0 };
    };

    // FIX: Replace `PanInfo` with `any` for the `info` parameter to resolve the type error.
    const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: any) => {
        if (!onShake || isMobile) return;

        const velocityThreshold = 1200; // Lowered for better feel with visual feedback
        const shakeCooldown = 2000; // 2 seconds cooldown to prevent spamming.

        const { x, y } = info.velocity;
        const { x: prevX, y: prevY } = lastVelocity.current;
        const now = Date.now();

        // A true "shake" is a rapid movement AND a sharp change in direction.
        // We detect this by checking if the velocity is high and if its direction
        // has reversed from the last frame (i.e., the dot product is negative).
        const magnitude = Math.sqrt(x * x + y * y);
        const dotProduct = (x * prevX) + (y * prevY);

        if (magnitude > velocityThreshold && dotProduct < 0 && (now - lastShakeTime.current > shakeCooldown) && !isShaking) {
            lastShakeTime.current = now;
            setIsShaking(true); // This will trigger the useEffect
        }

        lastVelocity.current = { x, y };
    };

    const cardInnerContent = (
        <>
            <div className="w-full bg-neutral-900 shadow-inner flex-grow relative overflow-hidden group">
                {status === 'pending' && <DevelopingIndicator progress={progress} />}
                {status === 'error' && <ErrorDisplay onRetry={onShake ? () => onShake(caption) : undefined} isMobile={isMobile} errorMessage={error} />}
                {status === 'done' && imageUrl && (
                    <>
                        <div className={cn(
                            "absolute top-2 right-2 z-20 flex flex-col gap-2 transition-opacity duration-300",
                            !isMobile && "opacity-0 group-hover:opacity-100",
                        )}>
                            {onShare && isShareSupported && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShare(caption);
                                    }}
                                    className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Share image for ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                                    </svg>
                                </button>
                            )}
                            {onDownload && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent drag from starting on click
                                        onDownload(caption);
                                    }}
                                    className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Download image for ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            )}
                             {isMobile && onShake && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onShake(caption);
                                    }}
                                    className="p-2 bg-black/50 rounded-full text-white hover:bg-black/75 focus:outline-none focus:ring-2 focus:ring-white"
                                    aria-label={`Regenerate image for ${caption}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.899 2.186l-1.42.71a5.002 5.002 0 00-8.479-1.554H10a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm12 14a1 1 0 01-1-1v-2.101a7.002 7.002 0 01-11.899-2.186l1.42-.71a5.002 5.002 0 008.479 1.554H10a1 1 0 110 2h6a1 1 0 011 1v6a1 1 0 01-1 1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>


                        {/* The developing chemical overlay - fades out */}
                        <div
                            className={`absolute inset-0 z-10 bg-[#3a322c] transition-opacity duration-[3500ms] ease-out ${
                                isDeveloped ? 'opacity-0' : 'opacity-100'
                            }`}
                            aria-hidden="true"
                        />
                        
                        {/* The Image - fades in and color corrects */}
                        <img
                            key={imageUrl}
                            src={imageUrl}
                            alt={caption}
                            onLoad={() => setIsImageLoaded(true)}
                            className={`w-full h-full object-cover transition-all duration-[4000ms] ease-in-out ${
                                isDeveloped 
                                ? 'opacity-100 filter-none' 
                                : 'opacity-80 filter sepia(1) contrast(0.8) brightness(0.8)'
                            }`}
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
                {/* Description removed for a cleaner grid view on mobile */}
            </div>
        );
    }

    return (
        <DraggableCardContainer>
            <DraggableCardBody 
                ref={cardBodyRef}
                className="bg-neutral-100 dark:bg-neutral-100 !p-4 !pb-16 flex flex-col items-center justify-start aspect-[3/4] w-72 sm:w-80 max-w-full"
                dragConstraintsRef={dragConstraintsRef}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
            >
                {cardInnerContent}
                {description && (
                    <div className="absolute top-full left-0 right-0 mt-3 flex justify-center pointer-events-none">
                        <p className="text-neutral-300 text-xs text-center w-72 sm:w-80">
                            {description}
                        </p>
                    </div>
                )}
            </DraggableCardBody>
        </DraggableCardContainer>
    );
};

export default PolaroidCard;