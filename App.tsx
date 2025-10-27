/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateDecadeImage, generateAudioDescription, generateDecadeVideo, editDecadeImage } from './services/geminiService';
import PolaroidCard from './components/PolaroidCard';
import { createAlbumPage } from './lib/albumUtils';
import Footer from './components/Footer';
import CameraCapture from './components/CameraCapture';
import AuthPage from './components/AuthPage';
import { auth, db } from './firebase';
import firebase from 'firebase/compat/app';
import ProfilePage from './components/ProfilePage';
import { decode } from './lib/audioUtils';


const DECADES = ['1900s', '1910s', '1920s', '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s'];

const DECADE_DESCRIPTIONS: Record<string, string> = {
    '1900s': "The turn of the century, known as the Belle Époque. High collars, S-bend corsets for women, and formal three-piece suits for men. A time of artistic elegance before the great wars.",
    '1910s': "The decade of the Titanic and World War I. Fashion saw a move towards more practical clothing, with military influences, hobble skirts, and the rise of more relaxed silhouettes.",
    '1920s': "The Roaring Twenties. Flapper dresses, sharp suits, Art Deco elegance, and the dawn of jazz. A revolutionary era of social and artistic change.",
    '1930s': "The Golden Age of Hollywood. Glamorous gowns, tailored suits, and dramatic studio lighting. An era of escapism through silver screen elegance.",
    '1940s': "Dominated by World War II. Utilitarian fashion with sharp, padded shoulders and tailored suits for women. A sense of 'make do and mend' gave way to post-war optimism and pin-up glamour.",
    '1950s': "The era of rock 'n' roll, greaser jackets, and poodle skirts. Think classic Hollywood glamour and the birth of teenage rebellion.",
    '1960s': "A revolution in fashion, from polished Mod looks to the free-spirited hippie movement with bell-bottoms and psychedelic prints.",
    '1970s': "Defined by disco fever and bohemian flair. Earth tones, flare jeans, platform shoes, and feathered hair were all the rage.",
    '1980s': "Bigger was better! Big hair, bold colors, shoulder pads, and neon everything. The decade of pop icons and power dressing.",
    '1990s': "From grunge rock's flannel and ripped jeans to hip-hop's baggy sportswear. A decade of casual, minimalist, and alternative styles.",
    '2000s': "The new millennium brought low-rise jeans, velour tracksuits, and a heavy dose of denim, all with a touch of Y2K tech optimism.",
    '2010s': "The era of social media, indie pop, and hipster culture. Skinny jeans, plaid shirts, vintage-inspired filters, and the rise of the influencer aesthetic.",
};

const DECADE_STYLES: Record<string, string> = {
    '1900s': "Recreate the look of early portrait photography. The image should be in black-and-white or a heavily faded sepia tone, with a soft, almost ethereal focus. The lighting should be natural or simple studio light, mimicking the style of albumen or platinum prints. The image should feel formal and posed.",
    '1910s': "Emulate the look of photography from this decade. Images should be in black-and-white or sepia, with a sharper focus than the 1900s but still retaining a classic, slightly grainy feel. The tone can be somber or formal, reflecting the era's mood. Posing should be stiff and traditional, as was common.",
    '1920s': "recreate the soft-focus, romanticized look of black-and-white or sepia-toned portraits from the era. Use lighting that creates dramatic shadows (like Rembrandt lighting), typical of studio photography of the time. The image should have a subtle grain and a timeless, classic feel.",
    '1930s': "emulate the high-glamour, sharp, and glossy look of Hollywood studio portraits. The lighting should be dramatic and controlled, creating a soft glow on the subject while maintaining deep, rich blacks. The final image should feel polished and aspirational, like a silver screen movie star's photograph.",
    '1940s': "Capture the look of 40s photography. It could be either black-and-white or early, subtly saturated color (like early Kodachrome). The lighting should be purposeful, creating a mix of glamour and seriousness, reminiscent of film noir or wartime Hollywood portraits. The image should feel strong and defined.",
    '1950s': "emulate the classic, slightly desaturated look of early color photography from that time. The image should have a hint of film grain and a soft focus, reminiscent of Kodachrome or early Ektachrome film.",
    '1960s': "capture the shift from polished, sharp, high-contrast fashion photography to the vibrant, saturated, and sometimes dreamlike quality of the late 60s. A vintage lens flare or slight color bleeding effect would be appropriate.",
    '1970s': "the photo must have a warm, earthy color palette with a distinct yellow or orange cast. Use a soft focus, noticeable film grain, and a slightly faded look, as if it were a well-loved photo print from an old album.",
    '1980s': "go for a sharp, glossy look with vibrant, potentially neon, colors. The photo should have higher contrast and could feature studio lighting effects like soft glows or defined lens flare, typical of 8s portrait and pop photography.",
    '1990s': "recreate the look of 90s point-and-shoot 35mm film cameras. The image should have a straightforward, slightly muted color palette, visible film grain, and the direct, sometimes harsh, look of an on-camera flash.",
    '2000s': "mimic the aesthetic of early consumer digital cameras. The image should be sharp, but may have some subtle digital noise or artifacts, slightly oversaturated colors, and the harsh, direct lighting from a built-in flash.",
    '2010s': "emulate the look of a high-quality smartphone photo with a popular Instagram-like filter (e.g., Valencia or X-Pro II). The image should have high saturation, possibly with a slight vignette or tilt-shift effect, capturing the polished-yet-casual social media aesthetic of the time.",
};


// Pre-defined positions for a scattered look on desktop
const POSITIONS = [
    { top: '5%', left: '2%', rotate: -8 },    // 1900s
    { top: '35%', left: '5%', rotate: 10 },   // 1910s
    { top: '65%', left: '2%', rotate: -5 },   // 1920s
    { top: '2%', left: '25%', rotate: 5 },    // 1930s
    { top: '40%', left: '28%', rotate: -3 },  // 1940s
    { top: '70%', left: '25%', rotate: 12 },  // 1950s
    { top: '5%', left: '50%', rotate: -6 },   // 1960s
    { top: '38%', left: '53%', rotate: 4 },   // 1970s
    { top: '68%', left: '51%', rotate: -9 },  // 1980s
    { top: '2%', left: '75%', rotate: 8 },    // 1990s
    { top: '42%', left: '72%', rotate: -11 }, // 2000s
    { top: '72%', left: '75%', rotate: 6 },   // 2010s
];


const GHOST_POLAROIDS_CONFIG = [
  { initial: { x: "-150%", y: "-100%", rotate: -30 }, transition: { delay: 0.2 } },
  { initial: { x: "150%", y: "-80%", rotate: 25 }, transition: { delay: 0.4 } },
  { initial: { x: "-120%", y: "120%", rotate: 45 }, transition: { delay: 0.6 } },
  { initial: { x: "180%", y: "90%", rotate: -20 }, transition: { delay: 0.8 } },
  { initial: { x: "0%", y: "-200%", rotate: 0 }, transition: { delay: 0.5 } },
  { initial: { x: "100%", y: "150%", rotate: 10 }, transition: { delay: 0.3 } },
];


type ImageStatus = 'pending' | 'done' | 'error';
type FeatureStatus = 'idle' | 'pending' | 'done' | 'error';

interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
    videoUrl?: string;
    videoStatus?: FeatureStatus;
    audioStatus?: FeatureStatus;
}
interface UserProfile {
    displayName: string;
    avatar?: string;
}
interface Session {
    id: string;
    createdAt: firebase.firestore.Timestamp;
    uploadedImage: string;
    generatedImages: Record<string, GeneratedImage>;
    generatedDecades: string[];
}


const primaryButtonClasses = "font-permanent-marker text-base sm:text-xl text-center text-cyan-300 bg-cyan-900/20 border-2 border-cyan-400 py-2 px-5 sm:py-3 sm:px-8 rounded-sm transform transition-all duration-300 hover:scale-105 hover:-rotate-2 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_20px_theme(colors.cyan.400)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:rotate-0 disabled:hover:shadow-none";
const secondaryButtonClasses = "font-permanent-marker text-base sm:text-xl text-center text-cyan-400 bg-transparent border-2 border-cyan-400/50 py-2 px-5 sm:py-3 sm:px-8 rounded-sm transform transition-all duration-300 hover:scale-105 hover:rotate-2 hover:bg-cyan-400/10 hover:border-cyan-400";

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

// --- Helper Functions for Audio Playback ---
async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


// --- New UI Components ---

const UserDisplay = ({ profile, onEditProfile, onShowHistory }: { profile: UserProfile, onEditProfile: () => void, onShowHistory: () => void }) => (
    <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
        <button
            onClick={onShowHistory}
            className="flex items-center gap-2 group"
            aria-label="View your generation history"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-neutral-500 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-permanent-marker text-neutral-400 group-hover:text-cyan-400 transition-colors hidden md:inline">History</span>
        </button>
        <button
            onClick={onEditProfile}
            className="flex items-center gap-3 group"
            aria-label="Edit your profile"
        >
            <span className="truncate max-w-xs group-hover:text-cyan-400 transition-colors hidden sm:inline">{profile.displayName}</span>
            {profile.avatar ? (
                <img src={profile.avatar} alt="User avatar" className="w-8 h-8 rounded-full object-cover border-2 border-neutral-700 group-hover:border-cyan-400 transition-all duration-300" />
            ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center border-2 border-neutral-700 group-hover:border-cyan-400 transition-all duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
            )}
        </button>
    </div>
);


const HistoryPanel = ({ sessions, onLoadSession, onClose }: { sessions: Session[], onLoadSession: (session: Session) => void, onClose: () => void }) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
        <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-4xl h-[80vh] bg-black/30 rounded-lg border border-cyan-500/20 shadow-xl p-6 sm:p-8 flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-permanent-marker text-2xl sm:text-3xl text-neutral-200">Time Travel Log</h2>
                <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">&times;</button>
            </div>
            {sessions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8v10a2 2 0 002 2h12a2 2 0 002-2V8m-6 4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <p className="font-permanent-marker text-lg">No history yet.</p>
                    <p>Your generated albums will appear here.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pr-2">
                    {sessions.map(session => (
                        <motion.button
                            key={session.id}
                            onClick={() => onLoadSession(session)}
                            className="aspect-square bg-neutral-900 rounded-md overflow-hidden group relative border-2 border-transparent hover:border-cyan-400 focus:border-cyan-400 transition-all duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <img src={session.uploadedImage} alt="Uploaded" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                            <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-bold truncate">
                                {session.createdAt.toDate().toLocaleDateString()}
                            </p>
                        </motion.button>
                    ))}
                </div>
            )}
        </motion.div>
    </motion.div>
);

const VideoPlayerModal = ({ decade, videoUrl, onClose }: { decade: string, videoUrl: string, onClose: () => void }) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
        <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-2xl bg-black/50 rounded-lg border border-cyan-500/20 shadow-xl p-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
        >
            <h2 className="font-permanent-marker text-xl sm:text-2xl text-neutral-200 mb-4">{decade} - In Motion</h2>
            <video src={videoUrl} controls autoPlay loop className="w-full rounded-md" />
            <button onClick={onClose} className={`${secondaryButtonClasses} mt-4 !text-base`}>Close</button>
        </motion.div>
    </motion.div>
);

const ApiKeyPrompt = ({ onSelectKey, onClose }: { onSelectKey: () => void, onClose: () => void }) => (
     <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
    >
        <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-black/50 rounded-lg border border-cyan-500/20 shadow-xl p-6 flex flex-col items-center text-center"
        >
            <h2 className="font-permanent-marker text-xl sm:text-2xl text-neutral-200 mb-2">API Key Required</h2>
            <p className="text-neutral-400 mb-4">The video generation feature requires you to select your own Google AI API key. This is a free feature during the preview period.</p>
            <p className="text-xs text-neutral-500 mb-6">For more information on future billing, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">billing documentation</a>.</p>
            <div className="flex gap-4">
                <button onClick={onClose} className={secondaryButtonClasses}>Cancel</button>
                <button onClick={onSelectKey} className={primaryButtonClasses}>Select API Key</button>
            </div>
        </motion.div>
    </motion.div>
);

const VideoOptionsModal = ({ decade, onClose, onStartAnimation }: { decade: string | null; onClose: () => void; onStartAnimation: (decade: string, aspectRatio: '9:16' | '16:9') => void; }) => {
    if (!decade) return null;

    const handleSelect = (aspectRatio: '9:16' | '16:9') => {
        onStartAnimation(decade, aspectRatio);
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-black/50 rounded-lg border border-cyan-500/20 shadow-xl p-6 sm:p-8 flex flex-col items-center text-center"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="font-permanent-marker text-xl sm:text-2xl text-neutral-200 mb-2">Animate '{decade}'</h2>
                <p className="text-neutral-400 mb-6">Choose an aspect ratio for your video.</p>
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <button onClick={() => handleSelect('9:16')} className={`${primaryButtonClasses} w-full`}>Portrait (9:16)</button>
                    <button onClick={() => handleSelect('16:9')} className={`${primaryButtonClasses} w-full`}>Landscape (16:9)</button>
                </div>
                 <button onClick={onClose} className={`${secondaryButtonClasses} mt-6 !text-base`}>Cancel</button>
            </motion.div>
        </motion.div>
    );
};

const ImageEditModal = ({ editingImage, onClose, onApplyEdit }: { editingImage: { decade: string; url: string; } | null; onClose: () => void; onApplyEdit: (decade: string, prompt: string) => Promise<void>; }) => {
    const [prompt, setPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (editingImage) {
            setPrompt('');
            setIsEditing(false);
            setError(null);
        }
    }, [editingImage]);

    if (!editingImage) return null;

    const handleSubmit = async () => {
        if (!prompt.trim()) {
            setError("Please enter an edit instruction.");
            return;
        }
        setIsEditing(true);
        setError(null);
        try {
            await onApplyEdit(editingImage.decade, prompt);
        } catch (err) {
            setError(parseErrorMessage(err));
        } finally {
            setIsEditing(false);
        }
    };
    
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-black/50 rounded-lg border border-cyan-500/20 shadow-xl p-6 sm:p-8 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="font-permanent-marker text-xl sm:text-2xl text-neutral-200 mb-4">Edit '{editingImage.decade}'</h2>
                <img src={editingImage.url} alt={`Image for ${editingImage.decade}`} className="w-48 aspect-[3/4] object-cover rounded-sm mb-4 border-2 border-neutral-700" />
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., 'Add a retro film grain effect' or 'Make the background a 1920s jazz club...'"
                    className="w-full h-24 p-2 text-base text-neutral-200 bg-neutral-900/50 border-2 border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
                />
                {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}
                <div className="flex gap-4 mt-6">
                    <button onClick={onClose} className={secondaryButtonClasses} disabled={isEditing}>Cancel</button>
                    <button onClick={handleSubmit} className={primaryButtonClasses} disabled={isEditing}>
                        {isEditing ? 'Applying...' : 'Apply Edit'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};


// User-friendly error message parser
const parseErrorMessage = (error: unknown): string => {
    const message = error instanceof Error ? error.message : String(error);

    // Image Generation & Editing Errors
    if (message.includes("responded with text instead of an image")) {
        return "The AI couldn't create an image, possibly due to safety filters. Try a different photo or decade.";
    }
    if (message.includes("failed with both original and fallback prompts")) {
        return "The AI failed after multiple attempts. Please try again later or with a different photo.";
    }
    if (message.includes("failed to generate an image")) {
        return "An unexpected error occurred during image generation. Please check your connection and try again.";
    }
     if (message.includes("failed to edit the image")) {
        return "The AI failed to edit the image. This could be due to safety filters or a complex request. Try a different instruction.";
    }

    // Video Generation Errors
    if (message.includes("API key not valid") || message.includes("API_KEY_INVALID") || message.includes("Requested entity was not found.")) {
         return "API Key error. Please ensure your key is valid and has the 'Generative Language API' enabled, then re-select it and try again.";
    }
    if (message.includes("prompt was blocked")) {
        return "The video request was blocked due to safety filters. Please try a different photo or decade.";
    }
    if (message.includes("Video generation failed")) {
         return "The AI failed to create a video. This can happen with complex requests or a temporary service issue. Please try again.";
    }

    return "An unknown error occurred. Please try again.";
};


function App() {
    const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
    const [user, setUser] = useState<firebase.User | null>(null);
    const [profile, setProfile] = useState<UserProfile>({ displayName: '', avatar: undefined });
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [isSharing, setIsSharing] = useState<boolean>(false);
    const [appState, setAppState] = useState<'idle' | 'image-uploaded' | 'generating' | 'results-shown'>('idle');
    const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
    const [selectedDecades, setSelectedDecades] = useState<string[]>(DECADES);
    const [generatedDecades, setGeneratedDecades] = useState<string[]>([]);
    const [isShareSupported, setIsShareSupported] = useState(false);
    const [videoModal, setVideoModal] = useState<{ decade: string; url: string } | null>(null);
    const [isApiKeyPromptOpen, setIsApiKeyPromptOpen] = useState(false);
    const [isApiKeySelected, setIsApiKeySelected] = useState(false);
    const [decadeToAnimate, setDecadeToAnimate] = useState<string | null>(null);
    const [editingImage, setEditingImage] = useState<{ decade: string; url: string } | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const dragAreaRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Authentication Listener
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user: firebase.User | null) => {
            setUser(user);
            setAuthStatus(user ? 'authenticated' : 'unauthenticated');
            if (!user) { // Clear all state on logout
                setProfile({ displayName: '', avatar: undefined });
                setSessions([]);
                handleReset();
            }
        });
        return () => unsubscribe();
    }, []);

    // Firestore Profile & Session Listener
    useEffect(() => {
        if (user) {
            // Profile listener
            const profileUnsubscribe = db.collection('users').doc(user.uid).onSnapshot(doc => {
                if (doc.exists) {
                    setProfile(doc.data() as UserProfile);
                } else {
                    // Create a default profile if none exists
                    const defaultProfile = { displayName: user.isAnonymous ? 'Guest' : (user.email?.split('@')[0] || 'Time Traveler') };
                    db.collection('users').doc(user.uid).set(defaultProfile);
                    setProfile(defaultProfile);
                }
            });

            // Sessions listener
            const sessionsUnsubscribe = db.collection('users').doc(user.uid).collection('sessions')
                .orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    const userSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
                    setSessions(userSessions);
                });

            return () => {
                profileUnsubscribe();
                sessionsUnsubscribe();
            };
        }
    }, [user]);

     useEffect(() => {
        if (navigator.share) {
            setIsShareSupported(true);
        }
        // Initialize AudioContext on first user interaction (or effect)
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }, []);

    const loadSession = (session: Session) => {
        setCurrentSessionId(session.id);
        setUploadedImage(session.uploadedImage);
        setGeneratedImages(session.generatedImages || {});
        setGeneratedDecades(session.generatedDecades || []);
        setAppState('results-shown');
        setIsHistoryOpen(false);
    };

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setAppState('image-uploaded');
                setGeneratedImages({});
                setSelectedDecades(DECADES);
                setGeneratedDecades([]);
                setCurrentSessionId(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImageCapture = (imageDataUrl: string) => {
        setUploadedImage(imageDataUrl);
        setAppState('image-uploaded');
        setGeneratedImages({});
        setSelectedDecades(DECADES);
        setGeneratedDecades([]);
        setCurrentSessionId(null);
        setIsCameraOpen(false);
    };

    const handleDecadeSelection = (decade: string) => {
        setSelectedDecades(prev =>
            prev.includes(decade)
                ? prev.filter(d => d !== decade)
                : [...prev, decade]
        );
    };

    const handleGenerateClick = async () => {
        if (!uploadedImage || selectedDecades.length === 0 || !user) return;

        setGeneratedDecades(selectedDecades);
        setIsLoading(true);
        setAppState('generating');
        
        const initialImages: Record<string, GeneratedImage> = {};
        selectedDecades.forEach(decade => {
            initialImages[decade] = { status: 'pending' };
        });
        setGeneratedImages(initialImages);

        // Create new session in Firestore
        const newSessionRef = db.collection('users').doc(user.uid).collection('sessions').doc();
        setCurrentSessionId(newSessionRef.id);
        await newSessionRef.set({
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            uploadedImage,
            generatedDecades: selectedDecades,
            generatedImages: initialImages,
        });

        const concurrencyLimit = 2;
        const decadesQueue = [...selectedDecades];

        const processDecade = async (decade: string) => {
            try {
                const prompt = `You are an expert fashion historian and photographer. Your task is to reimagine the person in this photo as if they were living in the ${decade}. **Primary Goal**: Create a photorealistic image that is authentic to the ${decade}. The person's face and key features must be clearly recognizable. **Key Elements**: 1.  **Clothing & Hairstyle**: Must be strictly era-appropriate for the ${decade}. 2.  **Photographic Style**: The image must visually match the photography of the era. Follow these specific style guidelines: *${DECADE_STYLES[decade]}* 3.  **Output Format**: The output must be ONLY the image. Do not include any text, captions, or descriptions.`;
                const resultUrl = await generateDecadeImage(uploadedImage, prompt);
                setGeneratedImages(prev => ({ ...prev, [decade]: { status: 'done', url: resultUrl } }));
                await newSessionRef.update({ [`generatedImages.${decade}`]: { status: 'done', url: resultUrl } });
            } catch (err) {
                const userFriendlyError = parseErrorMessage(err);
                setGeneratedImages(prev => ({ ...prev, [decade]: { status: 'error', error: userFriendlyError } }));
                await newSessionRef.update({ [`generatedImages.${decade}`]: { status: 'error', error: userFriendlyError } });
                console.error(`Failed to generate image for ${decade}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (decadesQueue.length > 0) {
                const decade = decadesQueue.shift();
                if (decade) {
                    await processDecade(decade);
                }
            }
        });

        await Promise.all(workers);
        setIsLoading(false);
        setAppState('results-shown');
    };

    const handleRegenerateDecade = async (decade: string) => {
        if (!uploadedImage || !user || !currentSessionId) return;
        if (generatedImages[decade]?.status === 'pending') return;
        
        setGeneratedImages(prev => ({ ...prev, [decade]: { status: 'pending' } }));
        await db.collection('users').doc(user.uid).collection('sessions').doc(currentSessionId).update({ [`generatedImages.${decade}`]: { status: 'pending' } });
        
        try {
            const prompt = `You are an expert fashion historian and photographer. Your task is to reimagine the person in this photo as if they were living in the ${decade}. **Primary Goal**: Create a photorealistic image that is authentic to the ${decade}. The person's face and key features must be clearly recognizable. **Key Elements**: 1.  **Clothing & Hairstyle**: Must be strictly era-appropriate for the ${decade}. 2.  **Photographic Style**: The image must visually match the photography of the era. Follow these specific style guidelines: *${DECADE_STYLES[decade]}* 3.  **Output Format**: The output must be ONLY the image. Do not include any text, captions, or descriptions.`;
            const resultUrl = await generateDecadeImage(uploadedImage, prompt);
            const update = { status: 'done', url: resultUrl };
            setGeneratedImages(prev => ({ ...prev, [decade]: update }));
            await db.collection('users').doc(user.uid).collection('sessions').doc(currentSessionId).update({ [`generatedImages.${decade}`]: update });
        } catch (err) {
            const userFriendlyError = parseErrorMessage(err);
            const update = { status: 'error', error: userFriendlyError };
            setGeneratedImages(prev => ({ ...prev, [decade]: update }));
            await db.collection('users').doc(user.uid).collection('sessions').doc(currentSessionId).update({ [`generatedImages.${decade}`]: update });
            console.error(`Failed to regenerate image for ${decade}:`, err);
        }
    };

    const handlePlayAudio = async (decade: string) => {
        if (!user || !currentSessionId || generatedImages[decade]?.audioStatus === 'pending') return;

        setGeneratedImages(prev => ({ ...prev, [decade]: { ...prev[decade], audioStatus: 'pending' } }));
        await db.collection('users').doc(user.uid).collection('sessions').doc(currentSessionId).update({ [`generatedImages.${decade}.audioStatus`]: 'pending' });

        try {
            const audioData = await generateAudioDescription(decade);
            const audioBuffer = await decodeAudioData(decode(audioData), audioContextRef.current!, 24000, 1);
            const source = audioContextRef.current!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current!.destination);
            source.start();
             setGeneratedImages(prev => ({ ...prev, [decade]: { ...prev[decade], audioStatus: 'done' } }));
        } catch (err) {
            console.error(`Failed to play audio for ${decade}:`, err);
            setGeneratedImages(prev => ({ ...prev, [decade]: { ...prev[decade], audioStatus: 'error' } }));
        }
    };

    const handleAnimateDecade = (decade: string) => {
        const image = generatedImages[decade];
        if (!user || !currentSessionId || !image?.url || image.videoStatus === 'pending') return;
        setDecadeToAnimate(decade);
    };
    
    const handleStartAnimation = async (decade: string, aspectRatio: '9:16' | '16:9') => {
        setDecadeToAnimate(null); // Close the options modal
        const image = generatedImages[decade];
        if (!user || !currentSessionId || !image?.url) return;

        const keySelected = await window.aistudio.hasSelectedApiKey();
        if (!keySelected) {
            setIsApiKeyPromptOpen(true);
            return;
        }
        setIsApiKeySelected(true); // Assume success after check

        setGeneratedImages(prev => ({ ...prev, [decade]: { ...prev[decade], videoStatus: 'pending' } }));
        await db.collection('users').doc(user.uid).collection('sessions').doc(currentSessionId).update({ [`generatedImages.${decade}.videoStatus`]: 'pending' });

        try {
            const videoUrl = await generateDecadeVideo(image.url, decade, aspectRatio);
            const update = { ...generatedImages[decade], videoStatus: 'done', videoUrl: videoUrl };
            setGeneratedImages(prev => ({ ...prev, [decade]: update as GeneratedImage }));
            await db.collection('users').doc(user.uid).collection('sessions').doc(currentSessionId).update({ [`generatedImages.${decade}`]: update });
        } catch (err) {
            console.error(`Failed to animate decade ${decade}:`, err);
            const userFriendlyError = parseErrorMessage(err);
            const update = { ...generatedImages[decade], videoStatus: 'error', error: userFriendlyError };
            setGeneratedImages(prev => ({ ...prev, [decade]: update as GeneratedImage }));
            await db.collection('users').doc(user.uid).collection('sessions').doc(currentSessionId).update({ [`generatedImages.${decade}.videoStatus`]: 'error' });

            if (userFriendlyError.includes("API Key error")) {
                setIsApiKeySelected(false); // Reset key state on this specific error
            }
        }
    };
    
    const handleOpenEditModal = (decade: string) => {
        const image = generatedImages[decade];
        if (image?.status === 'done' && image.url) {
            setEditingImage({ decade, url: image.url });
        }
    };

    const handleApplyImageEdit = async (decade: string, prompt: string) => {
        if (!editingImage || !currentSessionId || !user) return;

        const originalImageState = { ...generatedImages[decade] };
        setGeneratedImages(prev => ({ ...prev, [decade]: { ...prev[decade], status: 'pending' } }));
        setEditingImage(null); // Close modal immediately for better UX

        try {
            const newImageUrl = await editDecadeImage(editingImage.url, prompt);
            const update: GeneratedImage = {
                status: 'done',
                url: newImageUrl,
                videoUrl: undefined,
                videoStatus: 'idle',
                audioStatus: 'idle',
            };
            setGeneratedImages(prev => ({ ...prev, [decade]: update }));
            await db.collection('users').doc(user.uid).collection('sessions').doc(currentSessionId).update({ [`generatedImages.${decade}`]: update });
        } catch (err) {
            console.error(`Failed to edit image for ${decade}:`, err);
            const userFriendlyError = parseErrorMessage(err);
            setGeneratedImages(prev => ({ ...prev, [decade]: { ...originalImageState, status: 'error', error: userFriendlyError } }));
            // Re-throw to be caught by the modal if it were still open, but we close it.
            // For now, the error shows on the card.
        }
    };
    
    const handleReset = () => {
        setUploadedImage(null);
        setGeneratedImages({});
        setAppState('idle');
        setSelectedDecades(DECADES);
        setGeneratedDecades([]);
        setCurrentSessionId(null);
    };

    const handleSignOut = async () => {
        try {
            await auth.signOut();
            // App state is cleared by the onAuthStateChanged listener
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const handleSaveProfile = async (newProfile: UserProfile) => {
        if (user) {
            try {
                await db.collection('users').doc(user.uid).set(newProfile, { merge: true });
                setIsProfileOpen(false);
            } catch (error) {
                console.error("Error saving profile to Firestore:", error);
                alert("Could not save your profile. Please check your connection.");
            }
        }
    };

    const handleDownloadIndividualImage = (decade: string) => {
        const image = generatedImages[decade];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `past-forward-${decade}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleShareIndividualImage = async (decade: string) => {
        const image = generatedImages[decade];
        if (navigator.share && image?.status === 'done' && image.url) {
            try {
                const response = await fetch(image.url);
                const blob = await response.blob();
                const file = new File([blob], `past-forward-${decade}.jpg`, { type: blob.type });

                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `My ${decade} look!`,
                        text: `Check out my photo from the ${decade}, created with Past Forward! #PastForwardAI`,
                        files: [file],
                    });
                } else {
                    console.warn("Sharing this file type is not supported.");
                }
            } catch (error) {
                console.error('Error sharing individual image:', error);
            }
        }
    };

    const handleDownloadAlbum = async () => {
        setIsDownloading(true);
        try {
            const imageData = (Object.entries(generatedImages) as [string, GeneratedImage][])
                .filter(([decade, image]) => generatedDecades.includes(decade) && image.status === 'done' && image.url)
                .reduce((acc, [decade, image]) => {
                    acc[decade] = image!.url!;
                    return acc;
                }, {} as Record<string, string>);

            if (Object.keys(imageData).length === 0) {
                alert("No images were successfully generated to create an album.");
                return;
            }
            if (Object.keys(imageData).length < generatedDecades.length) {
                const allDone = generatedDecades.every(d => generatedImages[d]?.status !== 'pending');
                if (!allDone) {
                    alert("Please wait for all selected images to finish generating before downloading the album.");
                    return;
                }
            }

            const albumDataUrl = await createAlbumPage(imageData);
            const link = document.createElement('a');
            link.href = albumDataUrl;
            link.download = 'past-forward-album.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Failed to create or download album:", error);
            alert("Sorry, there was an error creating your album. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShareAlbum = async () => {
        if (!isShareSupported) return;
        setIsSharing(true);
        try {
            const imageData = (Object.entries(generatedImages) as [string, GeneratedImage][])
                .filter(([decade, image]) => generatedDecades.includes(decade) && image.status === 'done' && image.url)
                .reduce((acc, [decade, image]) => {
                    acc[decade] = image!.url!;
                    return acc;
                }, {} as Record<string, string>);

            if (Object.keys(imageData).length === 0) {
                alert("No successfully generated images to share.");
                return;
            }

            const albumDataUrl = await createAlbumPage(imageData);
            const response = await fetch(albumDataUrl);
            const blob = await response.blob();
            const file = new File([blob], 'past-forward-album.jpg', { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'My Past Forward Album!',
                    text: 'Check out my journey through the decades! #PastForwardAI',
                    files: [file],
                });
            } else {
                console.warn("Sharing album file is not supported.");
            }
        } catch (error) {
            console.error("Error sharing album:", error);
        } finally {
            setIsSharing(false);
        }
    };

    const completedCount = (Object.values(generatedImages) as GeneratedImage[]).filter(img => img.status !== 'pending').length;
    const totalCount = generatedDecades.length;
    const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    
    return (
        <main className="bg-[#050a19] text-neutral-200 min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 pb-24 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-cyan-500/[0.05]"></div>
            
            <AnimatePresence mode="wait">
                {authStatus === 'loading' && (
                    <motion.div key="loader" className="z-10 flex items-center justify-center flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <svg className="animate-spin h-12 w-12 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </motion.div>
                )}
                {authStatus === 'unauthenticated' && (
                    <AuthPage key="auth" />
                )}
                {authStatus === 'authenticated' && (
                    <motion.div
                        key="app"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="z-10 flex flex-col items-center justify-center w-full h-full flex-1 min-h-0"
                    >
                        <UserDisplay profile={profile} onEditProfile={() => setIsProfileOpen(true)} onShowHistory={() => setIsHistoryOpen(true)} />
                        <div className="text-center mb-6 sm:mb-10">
                            <h1 className="text-5xl sm:text-7xl font-caveat font-bold text-neutral-100">Past Forward</h1>
                            <p className="font-permanent-marker text-cyan-400/80 mt-2 text-base sm:text-xl tracking-wide">Generate yourself through the decades.</p>
                        </div>

                        {appState === 'idle' && (
                            <div className="relative flex flex-col items-center justify-center w-full">
                                {GHOST_POLAROIDS_CONFIG.map((config, index) => (
                                    <motion.div
                                        key={index}
                                        className="absolute w-80 h-[26rem] rounded-md p-4 bg-cyan-500/5 blur-sm"
                                        initial={config.initial}
                                        animate={{ x: "0%", y: "0%", rotate: (Math.random() - 0.5) * 20, scale: 0, opacity: 0 }}
                                        transition={{ ...config.transition, ease: "circOut", duration: 2 }}
                                    />
                                ))}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 2, duration: 0.8, type: 'spring' }}
                                    className="flex flex-col items-center"
                                >
                                    <label htmlFor="file-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                                        <PolaroidCard caption="Click to begin" status="done" />
                                    </label>
                                    <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                                    <p className="mt-8 font-permanent-marker text-neutral-400 text-center max-w-xs text-base sm:text-lg">
                                        Click the polaroid to upload your photo and start your journey through time.
                                    </p>
                                    <button onClick={() => setIsCameraOpen(true)} className={`${secondaryButtonClasses} mt-6`}>
                                        Or use your camera
                                    </button>
                                </motion.div>
                            </div>
                        )}

                        {appState === 'image-uploaded' && uploadedImage && (
                            <motion.div 
                                className="flex flex-col items-center gap-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <PolaroidCard imageUrl={uploadedImage} caption="Your Photo" status="done" />
                                <div className="w-full max-w-2xl text-center mt-4">
                                    <h3 className="font-permanent-marker text-2xl text-neutral-100 mb-4">Choose Your Decades</h3>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        {DECADES.map(decade => (
                                            <button
                                                key={decade}
                                                onClick={() => handleDecadeSelection(decade)}
                                                className={`font-permanent-marker text-base sm:text-lg py-2 px-4 sm:px-5 rounded-sm transform transition-all duration-200 border-2 ${
                                                    selectedDecades.includes(decade)
                                                        ? 'bg-cyan-400 text-black border-cyan-400 scale-105'
                                                        : 'bg-transparent text-neutral-300 border-neutral-600 hover:bg-cyan-900/50'
                                                }`}
                                            >
                                                {decade}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex justify-center gap-4 mt-4">
                                        <button onClick={() => setSelectedDecades(DECADES)} className="text-neutral-400 hover:text-neutral-100 text-sm transition-colors">Select All</button>
                                        <button onClick={() => setSelectedDecades([])} className="text-neutral-400 hover:text-neutral-100 text-sm transition-colors">Deselect All</button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 mt-4">
                                    <button onClick={() => { setUploadedImage(null); setAppState('idle'); setSelectedDecades(DECADES); }} className={secondaryButtonClasses}>
                                        Different Photo
                                    </button>
                                    <button onClick={handleGenerateClick} className={primaryButtonClasses} disabled={selectedDecades.length === 0 || isLoading}>
                                        Generate
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {(appState === 'generating' || appState === 'results-shown') && (
                            <>
                                {isMobile ? (
                                    <div className="w-full max-w-md grid grid-cols-2 gap-6 flex-1 overflow-y-auto mt-4 p-4">
                                        {generatedDecades.map((decade) => (
                                            <PolaroidCard
                                                key={decade}
                                                caption={decade}
                                                description={DECADE_DESCRIPTIONS[decade]}
                                                status={generatedImages[decade]?.status || 'pending'}
                                                imageUrl={generatedImages[decade]?.url}
                                                error={generatedImages[decade]?.error}
                                                onShake={handleRegenerateDecade}
                                                onDownload={handleDownloadIndividualImage}
                                                onShare={handleShareIndividualImage}
                                                onAnimate={handleAnimateDecade}
                                                onEdit={handleOpenEditModal}
                                                onPlayAudio={handlePlayAudio}
                                                onViewVideo={(d) => setVideoModal({ decade: d, url: generatedImages[d]?.videoUrl! })}
                                                isAnimating={generatedImages[decade]?.videoStatus === 'pending'}
                                                isAudioLoading={generatedImages[decade]?.audioStatus === 'pending'}
                                                videoUrl={generatedImages[decade]?.videoUrl}
                                                isMobile={isMobile}
                                                progress={progressPercentage}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div ref={dragAreaRef} className="relative w-full max-w-5xl h-[50vh] sm:h-[600px] mt-4">
                                        {generatedDecades.map((decade, generatedIndex) => {
                                            const originalIndex = DECADES.indexOf(decade);
                                            if (originalIndex === -1) return null;
                                            const { top, left, rotate } = POSITIONS[originalIndex];
                                            return (
                                                <motion.div
                                                    key={decade}
                                                    className="absolute cursor-grab active:cursor-grabbing"
                                                    style={{ top, left }}
                                                    initial={{ opacity: 0, scale: 0.5, y: 100, rotate: 0 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0, rotate: `${rotate}deg` }}
                                                    transition={{ type: 'spring', stiffness: 100, damping: 20, delay: generatedIndex * 0.15 }}
                                                >
                                                    <PolaroidCard 
                                                        dragConstraintsRef={dragAreaRef}
                                                        caption={decade}
                                                        description={DECADE_DESCRIPTIONS[decade]}
                                                        status={generatedImages[decade]?.status || 'pending'}
                                                        imageUrl={generatedImages[decade]?.url}
                                                        error={generatedImages[decade]?.error}
                                                        onShake={handleRegenerateDecade}
                                                        onDownload={handleDownloadIndividualImage}
                                                        onShare={handleShareIndividualImage}
                                                        onAnimate={handleAnimateDecade}
                                                        onEdit={handleOpenEditModal}
                                                        onPlayAudio={handlePlayAudio}
                                                        onViewVideo={(d) => setVideoModal({ decade: d, url: generatedImages[d]?.videoUrl! })}
                                                        isAnimating={generatedImages[decade]?.videoStatus === 'pending'}
                                                        isAudioLoading={generatedImages[decade]?.audioStatus === 'pending'}
                                                        videoUrl={generatedImages[decade]?.videoUrl}
                                                        isMobile={isMobile}
                                                        progress={progressPercentage}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                                <div className="h-20 mt-4 flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        {appState === 'generating' && (
                                            <motion.div 
                                                key="progress"
                                                className="w-full max-w-md text-center"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <p className="font-permanent-marker text-lg text-neutral-300/80 mb-2">
                                                    {completedCount > 0
                                                        ? `Developing... ${completedCount} of ${totalCount} complete`
                                                        : 'Warming up the time machine...'}
                                                </p>
                                                <div className="w-full bg-neutral-800 rounded-full h-2.5">
                                                    <motion.div 
                                                        className="bg-cyan-400 h-2.5 rounded-full"
                                                        animate={{ width: `${progressPercentage}%` }}
                                                        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                        {appState === 'results-shown' && (
                                            <motion.div
                                                key="results-buttons" 
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="flex flex-col sm:flex-row items-center gap-4"
                                            >
                                                <button onClick={handleDownloadAlbum} disabled={isDownloading} className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                                    {isDownloading ? 'Creating Album...' : 'Download Album'}
                                                </button>
                                                {isShareSupported && (
                                                     <button onClick={handleShareAlbum} disabled={isSharing} className={`${secondaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                                        {isSharing ? 'Sharing...' : 'Share Album'}
                                                    </button>
                                                )}
                                                <button onClick={handleReset} className={secondaryButtonClasses}>
                                                    Start Over
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            <Footer />
            {authStatus === 'authenticated' && isCameraOpen && (
                <CameraCapture 
                    onCapture={handleImageCapture}
                    onClose={() => setIsCameraOpen(false)}
                />
            )}
            {authStatus === 'authenticated' && isProfileOpen && user && (
                <ProfilePage
                    user={user}
                    initialProfile={profile}
                    onSave={handleSaveProfile}
                    onClose={() => setIsProfileOpen(false)}
                    onSignOut={handleSignOut}
                />
            )}
             {authStatus === 'authenticated' && isHistoryOpen && (
                <HistoryPanel
                    sessions={sessions}
                    onLoadSession={loadSession}
                    onClose={() => setIsHistoryOpen(false)}
                />
            )}
            {videoModal && (
                <VideoPlayerModal 
                    decade={videoModal.decade}
                    videoUrl={videoModal.url}
                    onClose={() => setVideoModal(null)}
                />
            )}
            {decadeToAnimate && (
                <VideoOptionsModal
                    decade={decadeToAnimate}
                    onClose={() => setDecadeToAnimate(null)}
                    onStartAnimation={handleStartAnimation}
                />
            )}
            {editingImage && (
                <ImageEditModal
                    editingImage={editingImage}
                    onClose={() => setEditingImage(null)}
                    onApplyEdit={handleApplyImageEdit}
                />
            )}
            {isApiKeyPromptOpen && (
                 <ApiKeyPrompt
                    onClose={() => setIsApiKeyPromptOpen(false)}
                    onSelectKey={async () => {
                        setIsApiKeyPromptOpen(false);
                        await window.aistudio.openSelectKey();
                        // User needs to click the animate button again after this.
                    }}
                 />
            )}
        </main>
    );
}

export default App;