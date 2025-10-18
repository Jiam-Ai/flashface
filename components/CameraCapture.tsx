/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraCaptureProps {
    onCapture: (imageDataUrl: string) => void;
    onClose: () => void;
}

const primaryButtonClasses = "font-permanent-marker text-lg sm:text-xl text-center text-cyan-300 bg-cyan-900/20 border-2 border-cyan-400 py-2 px-6 sm:py-3 sm:px-8 rounded-sm transform transition-all duration-300 hover:scale-105 hover:-rotate-2 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_20px_theme(colors.cyan.400)]";
const secondaryButtonClasses = "font-permanent-marker text-lg sm:text-xl text-center text-cyan-300 bg-transparent border-2 border-cyan-400/80 py-2 px-6 sm:py-3 sm:px-8 rounded-sm transform transition-all duration-300 hover:scale-105 hover:rotate-2 hover:bg-cyan-400 hover:text-black";

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            try {
                // FIX: Check for mediaDevices support before attempting to use it.
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    setError("Camera access is not supported by your browser.");
                    return;
                }

                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'user' } 
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                
                // FIX: Provide a more detailed and helpful error message when camera permission is denied by the user.
                let errorMessage = "Could not access the camera. Please check your browser permissions and ensure no other application is using it.";
                
                // `err` can be a DOMException or a generic Error.
                if (err instanceof Error) {
                    // Check for standard DOMException names for permission issues.
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        errorMessage = "Camera access was denied. To use this feature, please allow camera access in your browser's site settings.";
                    } 
                    // Check for the specific error message reported by the user.
                    else if (err.message.includes('Permission dismissed')) {
                        errorMessage = "Camera permission was dismissed. To use your camera, please grant permission in your browser's site settings and try again.";
                    } 
                    // Check for missing camera hardware.
                    else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                        errorMessage = "No camera was found on your device. Please ensure a camera is connected and enabled.";
                    }
                }
                
                setError(errorMessage);
            }
        };

        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const context = canvas.getContext('2d');
            if (context) {
                // Flip the image horizontally for a mirror effect, as users expect from a selfie camera
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageDataUrl = canvas.toDataURL('image/jpeg');
                onCapture(imageDataUrl);
            }
        }
    };

    return (
        <AnimatePresence>
            {/* @ts-ignore */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 p-4"
                aria-modal="true"
                role="dialog"
            >
                {/* @ts-ignore */}
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-lg mx-auto flex flex-col items-center gap-6"
                >
                    {error ? (
                        <div className="bg-red-900/30 border border-red-500/50 text-red-300 p-6 rounded-lg text-center shadow-lg">
                             <div className="flex justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-permanent-marker text-red-200 mb-2">Camera Error</h2>
                            <p className="text-base text-red-300">{error}</p>
                        </div>
                    ) : (
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl border-4 border-neutral-700">
                             <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover transform scaleX(-1)" // Mirror view for selfie
                             />
                        </div>
                    )}

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex items-center gap-4 mt-2">
                        <button onClick={onClose} className={secondaryButtonClasses}>
                            {error ? 'Close' : 'Cancel'}
                        </button>
                        {!error && (
                             <button onClick={handleCapture} className={primaryButtonClasses}>
                                Capture Photo
                             </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CameraCapture;